import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "../scripts/browser-runtime.mjs";
import { renderLook } from "./browser/client.mjs";
import { imageMetrics, structureDistance } from "./browser/metrics.mjs";
import { energyDelta } from "../scripts/energy-metric.mjs";

// Opt-in browser regression: node tests/tapestry-gate.test.mjs --port 48124.
// npm test leaves browser ownership to the main headless lab runner.
const browserRequested = process.argv.includes("--port");
test(
  "tapestry looms have ordered energy and an isolated shared kick response",
  {
    skip: !browserRequested,
    timeout: 600000,
  },
  async () => {
    const args = options({ matrix: { type: "string" } });
    assert.equal(args.rig, false, "this test is headless only");
    const out = await outputDirectory("contact/tapestry-probes", args.out);
    const server = await serve(".", args.port);
    let runtime;
    try {
      runtime = await launch();
      const lab = await openLab(runtime.browser, server.url);
      const looks = await lab.page.evaluate(() => {
        const { scenes, presetSnapshot } = window.__phosphorLab;
        const scene = scenes.find((s) => s.id === "tapestry");
        return scene.type.values.map((value) => {
          const snapshot = presetSnapshot(scene, 0);
          snapshot.params[scene.type.key] = value;
          return { sceneId: scene.id, snapshot, value };
        });
      });
      const results = [];
      for (const look of looks) {
        const sequences = [];
        for (const level of [0.1, 0.9]) {
          await lab.page.evaluate(renderLook, {
            ...look,
            level,
            base: 0.5,
            seed: 17,
            frames: 60,
            width: 160,
            height: 90,
          });
          sequences.push(
            await lab.page.evaluate(() => {
              const { engine } = window.__phosphorLab;
              const canvas = document.createElement("canvas");
              canvas.width = engine.width;
              canvas.height = engine.height;
              const context = canvas.getContext("2d");
              const sequence = [];
              for (let sample = 0; sample < 12; sample++) {
                if (sample) {
                  for (let step = 0; step < 2; step++) {
                    const tick = 60 + (sample - 1) * 2 + step + 1;
                    engine.beat = 0.5 + Math.floor(tick / 30);
                    engine.advance(1 / 60, false);
                  }
                }
                engine.present();
                context.drawImage(engine.canvas, 0, 0);
                sequence.push(
                  Array.from(
                    context.getImageData(0, 0, canvas.width, canvas.height)
                      .data,
                  ),
                );
              }
              return sequence;
            }),
          );
        }
        const delta = energyDelta(sequences[0], sequences[1], 160, 90);
        assert.ok(
          delta.score >= 0.15,
          `type ${look.value}: structural energy ${delta.score}`,
        );
        const ladder = [];
        for (const level of [0.1, 0.5, 0.9]) {
          const frame = await lab.page.evaluate(renderLook, {
            ...look,
            level,
            base: 0.5,
            frames: 120,
            width: 480,
            height: 270,
          });
          assert.equal(frame.glError, 0);
          assert.equal(frame.nonFinite, 0);
          assert.equal(frame.stats.liveTextures, frame.stats.textures);
          const kick = await lab.page.evaluate(() => {
            const { engine } = window.__phosphorLab;
            const capture = () => {
              const canvas = document.createElement("canvas");
              canvas.width = engine.width;
              canvas.height = engine.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(engine.canvas, 0, 0);
              return {
                rgba: Array.from(
                  ctx.getImageData(0, 0, canvas.width, canvas.height).data,
                ),
                png: canvas.toDataURL("image/png").split(",")[1],
              };
            };
            // No simulation step between captures. Suppress the automatic flash
            // so only the family's declared shared punch/pulse can change pixels.
            engine.beat = 4.5;
            engine.updatePerformance(0, false);
            engine.beatFx.flash = 0;
            engine.present();
            const off = capture();
            engine.beat = 4;
            engine.updatePerformance(0, false);
            engine.beatFx.flash = 0;
            engine.present();
            const on = capture();
            let difference = 0;
            for (let i = 0; i < on.rgba.length; i++)
              if (i % 4 !== 3) difference += Math.abs(on.rgba[i] - off.rgba[i]);
            return {
              difference: difference / (engine.width * engine.height * 3),
              fx: { ...engine.beatFx },
              scroll: engine.slots.at(-1).params[3],
              weave: engine.slots.at(-1).params[4],
              png: on.png,
              glError: engine.gl.getError(),
            };
          });
          assert.equal(kick.glError, 0);
          await writeFile(
            resolve(out, `tapestry-${look.value}-${level}-off.png`),
            Buffer.from(frame.png, "base64"),
          );
          await writeFile(
            resolve(out, `tapestry-${look.value}-${level}-kick.png`),
            Buffer.from(kick.png, "base64"),
          );
          const { png, ...response } = kick;
          ladder.push({
            level,
            ...response,
            metrics: imageMetrics(frame.rgba, frame.width, frame.height),
          });
        }
        results.push({ type: look.value, energyDelta: delta, ladder });
        for (const key of ["scroll", "weave", "difference"])
          assert.ok(
            ladder[0][key] < ladder[1][key] && ladder[1][key] < ladder[2][key],
            `type ${look.value}: ordered ${key}`,
          );
        assert.ok(
          ladder[0].metrics.edgeDensity < ladder[1].metrics.edgeDensity &&
            ladder[1].metrics.edgeDensity < ladder[2].metrics.edgeDensity,
          `type ${look.value}: ordered rendered detail/contrast`,
        );
        assert.equal(ladder[0].fx.punch, 0);
        assert.equal(ladder[0].fx.pulse, 0);
        assert.ok(
          ladder[2].difference > 1,
          `type ${look.value}: visible high-energy kick`,
        );
      }
      const matrix = [];
      if (args.matrix) {
        // The contact runner publishes near pairs only. Decode its actual PNGs
        // for the complete within-family distances and nearest other family.
        const directory = resolve(args.matrix);
        const { rows } = JSON.parse(
          await readFile(resolve(directory, "metrics.json"), "utf8"),
        );
        const signatures = [];
        for (const row of rows) {
          const png = await readFile(resolve(directory, row.cells[0].file));
          const signature = await lab.page.evaluate(async (base64) => {
            const { structureSignature } = await import("./metrics.mjs");
            const image = new Image();
            image.src = `data:image/png;base64,${base64}`;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);
            return structureSignature(
              ctx.getImageData(0, 0, image.width, image.height).data,
              image.width,
              image.height,
            );
          }, png.toString("base64"));
          signatures.push({ sceneId: row.sceneId, type: row.name, signature });
        }
        for (const a of signatures.filter((s) => s.sceneId === "tapestry")) {
          const distances = signatures
            .filter((b) => b !== a)
            .map((b) => ({
              family: b.sceneId,
              type: b.type,
              distance: structureDistance(a.signature, b.signature),
            }))
            .sort((a, b) => a.distance - b.distance);
          const within = distances.filter((b) => b.family === "tapestry");
          matrix.push({
            type: a.type,
            within,
            nearestOther:
              distances.find((b) => b.family !== "tapestry") ?? null,
          });
          assert.ok(
            within.every((b) => b.distance >= 0.25),
            `${a.type}: within-family distinctness`,
          );
        }
      }
      assert.deepEqual(lab.errors, []);
      await writeFile(
        resolve(out, "metrics.json"),
        JSON.stringify({ results, matrix }, null, 2),
      );
      console.log(JSON.stringify({ results, matrix }));
    } finally {
      await runtime?.stop();
      await server.close();
    }
  },
);
