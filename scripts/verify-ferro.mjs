// Native GPU evidence for Liquid Chrome: every development/energy pair at
// late times, three palettes, portrait framing and a 4K still. No UI changes.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options();
const out = await outputDirectory("films/ferro-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const paletteId of ["glacier", "ember", "phosphor"])
    for (const development of [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2])
      for (const energy of [0.1, 0.9]) {
        const snapshot = await lab.page.evaluate(
          ({ development, colors }) => {
            const { scenes, presetSnapshot } = window.__phosphorLab;
            const snapshot = presetSnapshot(
              scenes.find((s) => s.id === "ferro"),
              0,
            );
            snapshot.params.development = development;
            snapshot.palette = colors;
            return snapshot;
          },
          {
            development,
            colors: PALETTES.find((p) => p.id === paletteId).colors,
          },
        );
        const initial = await lab.page.evaluate(renderLook, {
          sceneId: "ferro",
          snapshot,
          level: energy,
          width: 480,
          height: 270,
          frames: 2,
          capture: false,
          pollHealth: false,
        });
        assert.equal(initial.glError, 0);
        assert.equal(initial.nonFinite, 0);
        for (const time of [3600, 43200]) {
          const row = await lab.page.evaluate(
            async ({ time }) => {
              const { engine } = window.__phosphorLab;
              engine.slots.at(-1).time = time;
              engine.uniformFrame++;
              engine.advance(0, true);
              await engine.ready("ferro");
              engine.advance(1 / 60, false);
              engine.present();
              const gl = engine.gl;
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              const bytes = new Uint8Array(engine.width * engine.height * 4);
              gl.readPixels(
                0,
                0,
                engine.width,
                engine.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                bytes,
              );
              let lit = 0,
                peak = 0,
                sum = 0;
              for (let i = 0; i < bytes.length; i += 4) {
                const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
                peak = Math.max(peak, p);
                lit += Number(p > 12);
                sum += p;
              }
              return {
                time,
                peak,
                litFraction: lit / (bytes.length / 4),
                meanPeak: sum / (bytes.length / 4),
                lateError: engine.programs.get("ferro").late?.error ?? null,
                lateReady:
                  !!engine.programs.get("ferro").late?.visual?.uniforms,
                glError: gl.getError(),
                nonFinite:
                  engine.counters.nonFinite + window.__harness.nonFiniteUploads,
              };
            },
            { time },
          );
          assert.equal(row.glError, 0);
          assert.equal(row.nonFinite, 0);
          assert.equal(row.lateError, null);
          assert.equal(
            row.lateReady,
            true,
            "late shader actually compiled and drew",
          );
          assert.ok(
            row.peak > 80 && row.litFraction > 0.01,
            JSON.stringify(row),
          );
          rows.push({ paletteId, development, energy, ...row });
        }
      }
  for (const [name, index, width, height] of [
    ["pool-portrait", 0, 540, 960],
    ["crown-portrait", 1, 540, 960],
    ["sculpture-portrait", 2, 540, 960],
    ["sculpture-4k", 2, 3840, 2160],
  ]) {
    await lab.page.evaluate(renderLook, {
      sceneId: "ferro",
      index,
      width,
      height,
      frames: 120,
      capture: false,
      pollHealth: false,
    });
    const shot = await lab.page.evaluate(() => {
      const { engine } = window.__phosphorLab;
      engine.present();
      const canvas = document.createElement("canvas");
      canvas.width = engine.width;
      canvas.height = engine.height;
      canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
      return {
        png: canvas.toDataURL("image/png").split(",")[1],
        glError: engine.gl.getError(),
        nonFinite: engine.counters.nonFinite,
      };
    });
    assert.equal(shot.glError, 0);
    assert.equal(shot.nonFinite, 0);
    await writeFile(
      resolve(out, `${name}.png`),
      Buffer.from(shot.png, "base64"),
    );
  }
  assert.deepEqual(lab.errors, []);
  await writeFile(
    resolve(out, "gpu-checks.json"),
    JSON.stringify(rows, null, 2) + "\n",
  );
  console.log(
    `PASS: ${rows.length} late-time frames; portrait states and 4K still in ${out}`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
