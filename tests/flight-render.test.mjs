import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import flight from "../scene-flight.mjs";
import {
  imageMetrics,
  structureSignature,
  structureDistance,
} from "./browser/metrics.mjs";

// The slow software-GPU gate is opt-in: node tests/flight-render.test.mjs --port 48126.
// npm test retains the inexpensive authored-look contract check.
test("flight has a bounded authored look for every camera path", () => {
  for (const path of flight.type.values) {
    assert.ok(flight.presets.some((p) => p.params.path === path));
  }
  for (const preset of flight.presets) {
    for (const def of flight.schema) {
      assert.ok(
        Number.isFinite(preset.params[def.key]),
        `${preset.name}/${def.key}`,
      );
      assert.ok(
        preset.params[def.key] >= def.min && preset.params[def.key] <= def.max,
      );
    }
  }
});

if (process.argv.includes("--port")) {
  test(
    process.argv.includes("--matrix")
      ? "flight grayscale distance report"
      : process.argv.includes("--beat-only")
        ? "flight isolated shared kick"
        : "flight software-GPU family probe",
    { timeout: 1200000 },
    async () => {
      const { options, outputDirectory, serve, launch, openLab } =
        await import("../scripts/browser-runtime.mjs");
      const { renderLook } = await import("./browser/client.mjs");
      const { shaderHeader } = await import("../scene-contract.mjs");
      const clearanceSource =
        shaderHeader +
        flight.fragment.slice(0, flight.fragment.indexOf("void main()")) +
        `
void main() {
  vec3 ro, fw;
  float extraRoll, trap;
  ffCamera(u_params[0], v_uv.x * 6.0, ro, fw, extraRoll);
  outColor = vec4(ffMap(ro, trap) > 0.05 ? 1.0 : 0.0, 0.0, 0.0, 1.0);
}`;
      const args = options({
        matrix: { type: "string" },
        "beat-only": { type: "boolean", default: false },
      });
      assert.equal(args.rig, false, "flight probe is headless only");
      const out = await outputDirectory(
        args.matrix
          ? "contact/flight-distances"
          : args["beat-only"]
            ? "contact/flight-beat"
            : "contact/flight-probe",
        args.out,
      );
      const server = await serve(".", args.port);
      const runtime = await launch();
      try {
        if (args.matrix) {
          const page = await runtime.browser.newPage();
          await page.route("**/flight-matrix.html", (route) =>
            route.fulfill({
              contentType: "text/html",
              body: "<!doctype html><title>Flight matrix</title>",
            }),
          );
          await page.goto(server.url + "flight-matrix.html");
          const sheet = await (
            await fetch(server.url + args.matrix + "/metrics.json")
          ).json();
          const signatures = [];
          for (const row of sheet.rows) {
            const pixels = await page.evaluate(
              async ({ url, width, height }) => {
                const image = new Image();
                image.src = url;
                await image.decode();
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext("2d");
                context.drawImage(image, 0, 0);
                return Array.from(
                  context.getImageData(0, 0, width, height).data,
                );
              },
              {
                url: server.url + args.matrix + "/" + row.cells[0].file,
                width: sheet.width,
                height: sheet.height,
              },
            );
            signatures.push(
              structureSignature(pixels, sheet.width, sheet.height),
            );
          }
          const pairs = [];
          for (let i = 0; i < sheet.rows.length; i++)
            for (let j = i + 1; j < sheet.rows.length; j++) {
              const a = sheet.rows[i],
                b = sheet.rows[j];
              if (a.sceneId === "flight" || b.sceneId === "flight")
                pairs.push({
                  a: `${a.sceneId}/${a.name}`,
                  b: `${b.sceneId}/${b.name}`,
                  sameFamily: a.sceneId === b.sceneId,
                  distance: structureDistance(signatures[i], signatures[j]),
                });
            }
          pairs.sort((a, b) => a.distance - b.distance);
          await writeFile(
            resolve(out, "distances.json"),
            JSON.stringify(pairs, null, 2),
          );
          console.log(
            JSON.stringify(
              pairs.filter((p) => p.sameFamily || p.distance < 0.25),
              null,
              2,
            ),
          );
          return;
        }
        const lab = await openLab(runtime.browser, server.url);
        const rows = [];
        for (const path of flight.type.values) {
          const preset = flight.presets.find((p) => p.params.path === path);
          for (const level of args["beat-only"] ? [0.9] : [0.1, 0.5, 0.9]) {
            await lab.page.evaluate(renderLook, {
              sceneId: "flight",
              index: flight.presets.indexOf(preset),
              level,
              frames: 0,
              width: 320,
              height: 180,
              capture: false,
            });
            const frames = await lab.page.evaluate(
              ({ clearanceSource, beatOnly }) => {
                const { engine } = window.__phosphorLab;
                const slot = engine.slots.at(-1);
                // Exercise the actual shader over a complete bounded path at the
                // narrowest opening, rather than copying its geometry into JS.
                const savedOpening = slot.snapshot.params.opening;
                slot.snapshot.params.opening = 0.75;
                engine.uniformFrame++;
                const probe = engine.program(clearanceSource);
                const target = slot.visual[slot.vi];
                engine.bind(probe, target);
                engine.uniforms(probe, slot, target, 0, false);
                engine.gl.drawArrays(engine.gl.TRIANGLES, 0, 6);
                const floating = target.floating;
                const clearance = floating
                  ? new Float32Array(target.w * target.h * 4)
                  : new Uint8Array(target.w * target.h * 4);
                engine.gl.readPixels(
                  0,
                  0,
                  target.w,
                  target.h,
                  engine.gl.RGBA,
                  floating ? engine.gl.FLOAT : engine.gl.UNSIGNED_BYTE,
                  clearance,
                );
                let free = true;
                for (let i = 0; i < clearance.length; i += 4)
                  free &&= clearance[i] === (floating ? 1 : 255);
                engine.gl.deleteProgram(probe.p);
                slot.snapshot.params.opening = savedOpening;
                engine.uniformFrame++;
                const capture = () => {
                  engine.drawSlot(slot, 0);
                  engine.present();
                  const canvas = document.createElement("canvas");
                  canvas.width = engine.canvas.width;
                  canvas.height = engine.canvas.height;
                  const context = canvas.getContext("2d");
                  context.drawImage(engine.canvas, 0, 0);
                  return {
                    png: canvas.toDataURL("image/png").split(",")[1],
                    rgba: Array.from(
                      context.getImageData(0, 0, canvas.width, canvas.height)
                        .data,
                    ),
                    width: canvas.width,
                    height: canvas.height,
                    glError: engine.gl.getError(),
                    nonFinite:
                      engine.counters.nonFinite +
                      window.__harness.nonFiniteUploads,
                  };
                };
                const result = [];
                let tick = 0;
                for (const time of beatOnly ? [0] : [0, 60, 300]) {
                  for (; tick < time * 60; tick++)
                    engine.tickSlot(slot, 1 / 60);
                  for (const steps of beatOnly ? [64] : [96, 64]) {
                    engine.rayStepBudget = steps;
                    result.push({ time, steps, ...capture() });
                  }
                }
                engine.rayStepBudget = 64;
                const before = capture();
                const params = slot.snapshot.params;
                const saved = { ...params };
                // Even at minute five a tiny glide cannot re-evaluate accumulated travel/roll.
                params.speed = Math.min(2, params.speed + 0.001);
                params.roll = Math.min(1, params.roll + 0.001);
                engine.uniformFrame++;
                const after = capture();
                slot.snapshot.params = saved;
                engine.uniformFrame++;
                let drift = 0;
                for (let i = 0; i < before.rgba.length; i++)
                  drift = Math.max(
                    drift,
                    Math.abs(before.rgba[i] - after.rgba[i]),
                  );
                engine.setLevel(0.9, 0);
                engine.updatePerformance(0, false);
                engine.beat = 0.5;
                engine.updatePerformance(0, false);
                engine.beatFx.flash = 0; // Prove punch/pulse without the automatic flash.
                const quiet = capture();
                engine.beat = 1;
                engine.updatePerformance(0, false);
                engine.beatFx.flash = 0;
                const kick = capture();
                return {
                  frames: result,
                  free,
                  drift,
                  quiet,
                  kick,
                  beatFx: { ...engine.beatFx },
                };
              },
              { clearanceSource, beatOnly: args["beat-only"] },
            );
            assert.ok(
              frames.drift <= 1,
              `path ${path} energy ${level}: speed/roll glide teleports (${frames.drift} byte delta)`,
            );
            assert.ok(
              frames.free,
              `path ${path}: camera clearance falls below 0.05 at minimum opening`,
            );
            for (const frame of frames.frames) {
              assert.equal(frame.glError, 0);
              assert.equal(frame.nonFinite, 0);
              const metrics = imageMetrics(
                frame.rgba,
                frame.width,
                frame.height,
              );
              assert.ok(
                metrics.meanLuminance > 0.002,
                `path ${path} at ${frame.time}s/${frame.steps} steps is blank`,
              );
              const file = `flight-${path}-${Math.round(level * 100)}-${frame.time}s-${frame.steps}.png`;
              await writeFile(
                resolve(out, file),
                Buffer.from(frame.png, "base64"),
              );
              rows.push({
                path,
                level,
                time: frame.time,
                steps: frame.steps,
                file,
                metrics,
              });
            }
            const kickDistance = structureDistance(
              structureSignature(frames.quiet.rgba, 320, 180),
              structureSignature(frames.kick.rgba, 320, 180),
            );
            assert.ok(
              kickDistance > 0.01,
              `path ${path}: kick is invisible (${kickDistance})`,
            );
            assert.ok(frames.beatFx.punch > 0 && frames.beatFx.pulse > 0);
            rows.at(-1).beat = { distance: kickDistance, ...frames.beatFx };
            if (args["beat-only"]) {
              await writeFile(
                resolve(out, `flight-${path}-quiet.png`),
                Buffer.from(frames.quiet.png, "base64"),
              );
              await writeFile(
                resolve(out, `flight-${path}-kick.png`),
                Buffer.from(frames.kick.png, "base64"),
              );
            }
            console.log(
              `PASS path ${path} energy ${level}: ${args["beat-only"] ? "isolated punch/pulse at 64 steps" : "0/60/300s at 96/64 steps"}; glide delta ${frames.drift}; kick distance ${kickDistance.toFixed(3)}`,
            );
          }
        }
        assert.deepEqual(lab.errors, []);
        await writeFile(
          resolve(out, "metrics.json"),
          JSON.stringify(rows, null, 2),
        );
      } finally {
        await runtime.stop();
        await server.close();
      }
    },
  );
}
