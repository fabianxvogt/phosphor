// Native headless, palette/portrait/late-time smoke for the wave-4 reworks.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-wave4-reworks.mjs --families laser --port 48525
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { options, outputDirectory, serve, launch, openLab } from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options({ families: { type: "string", default: "ferro,laser,magma,kinetic" } });
const out = await outputDirectory("wave4-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const sceneId of args.families.split(",")) {
    for (const paletteId of ["glacier", "ember", "phosphor"])
      for (const development of [0, 0.5, 1, 1.5, 2])
        for (const energy of [0.1, 0.9]) {
          const snapshot = await lab.page.evaluate(({ sceneId, development, colors }) => {
            const { scenes, presetSnapshot } = window.__phosphorLab;
            const snapshot = presetSnapshot(scenes.find(s => s.id === sceneId), 0);
            snapshot.params.development = development;
            snapshot.palette = colors;
            return snapshot;
          }, { sceneId, development, colors: PALETTES.find(p => p.id === paletteId).colors });
          await lab.page.evaluate(renderLook, {
            sceneId, snapshot, level: energy, width: 480, height: 270,
            frames: 2, capture: false, pollHealth: false,
          });
          for (const time of [19, 43200]) {
            const shot = await lab.page.evaluate(async ({ sceneId, time }) => {
              const { engine } = window.__phosphorLab;
              engine.slots.at(-1).time = time;
              engine.uniformFrame++;
              engine.advance(0, true);
              await engine.ready(sceneId);
              engine.advance(1 / 60, false);
              engine.present();
              const gl = engine.gl;
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              const bytes = new Uint8Array(engine.width * engine.height * 4);
              gl.readPixels(0, 0, engine.width, engine.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
              let lit = 0, peak = 0;
              for (let i = 0; i < bytes.length; i += 4) {
                const value = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
                peak = Math.max(peak, value);
                lit += Number(value > 12);
              }
              const canvas = document.createElement("canvas");
              canvas.width = engine.width; canvas.height = engine.height;
              canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
              return { png: canvas.toDataURL("image/png").split(",")[1], peak,
                litFraction: lit / (bytes.length / 4), glError: gl.getError(),
                nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads };
            }, { sceneId, time });
            assert.equal(shot.glError, 0);
            assert.equal(shot.nonFinite, 0);
            assert.ok(shot.peak > 50 && shot.litFraction > 0.005, JSON.stringify({ sceneId, development, energy, time, ...shot, png: undefined }));
            const { png, ...health } = shot;
            rows.push({ sceneId, paletteId, development, energy, time, ...health });
            if (time === 19 && energy === 0.1 && Number.isInteger(development))
              await writeFile(resolve(out, `${sceneId}-${paletteId}-${development}.png`), Buffer.from(png, "base64"));
          }
        }
    for (const [index, width, height] of [[0, 540, 960], [1, 540, 960], [2, 540, 960], [2, 3840, 2160]]) {
      const health = await lab.page.evaluate(renderLook, {
        sceneId, index, width, height, frames: 120, level: 0.5, capture: false, pollHealth: false,
      });
      assert.equal(health.glError, 0); assert.equal(health.nonFinite, 0);
      const png = await lab.page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        engine.present();
        const canvas = document.createElement("canvas");
        canvas.width = engine.width; canvas.height = engine.height;
        canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await writeFile(resolve(out, `${sceneId}-${index}-${width}x${height}.png`), Buffer.from(png, "base64"));
    }
  }
  assert.deepEqual(lab.errors, []);
  await writeFile(resolve(out, "gpu-checks.json"), JSON.stringify(rows, null, 2) + "\n");
  console.log(`PASS: ${rows.length} palette/development/energy/time cases; portrait states and 4K still`);
} finally {
  await runtime.stop();
  await server.close();
}
