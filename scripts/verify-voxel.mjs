// Native palette/energy/aspect audit plus limiter-enabled scheduled playback.
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

const args = options();
const out = await outputDirectory("voxel-r3-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
try {
  const lab = await openLab(runtime.browser, server.url);
  const result = await lab.page.evaluate(async () => {
    const { engine, scenes, presetSnapshot } = window.__phosphorLab;
    const { renderLook } = await import("/tests/browser/client.mjs");
    const { PALETTES } = await import("/palettes.mjs");
    const scene = scenes.find((s) => s.id === "voxel");
    const rows = [],
      sheets = [];
    for (const palette of ["glacier", "ember", "silver"]) {
      const colors = PALETTES.find((p) => p.id === palette).colors;
      const canvas = document.createElement("canvas");
      canvas.width = 480 * 3;
      canvas.height = 270 * 8;
      const ctx = canvas.getContext("2d");
      for (let index = 0; index < 8; index++) {
        for (const [column, level] of [0.1, 0.5, 0.9].entries()) {
          const snapshot = presetSnapshot(scene, index);
          snapshot.palette = { ...colors };
          const health = await renderLook({
            sceneId: "voxel",
            snapshot,
            level,
            width: 480,
            height: 270,
            frames: 12,
            capture: false,
            pollHealth: false,
          });
          const gl = engine.gl,
            pixels = new Uint8Array(480 * 270 * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.readPixels(0, 0, 480, 270, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let lit = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 12) lit++;
          const row = {
            palette,
            index,
            level,
            peak: health.peak,
            litFraction: lit / (480 * 270),
            glError: health.glError,
            nonFinite: health.nonFinite,
          };
          if (
            row.glError ||
            row.nonFinite ||
            row.peak < 30 ||
            row.litFraction < 0.025
          )
            throw Error(JSON.stringify(row));
          rows.push(row);
          ctx.drawImage(engine.canvas, column * 480, index * 270);
          ctx.fillStyle = "white";
          ctx.font = "14px sans-serif";
          ctx.fillText(
            `${scene.presets[index].name} / ${level}`,
            column * 480 + 8,
            index * 270 + 18,
          );
        }
      }
      sheets.push({
        name: `${palette}-ladder`,
        png: canvas.toDataURL("image/png").split(",")[1],
      });
    }
    const snapshot = presetSnapshot(scene, 2);
    await renderLook({
      sceneId: "voxel",
      snapshot,
      level: 0.85,
      width: 540,
      height: 960,
      frames: 30,
      capture: false,
      pollHealth: false,
    });
    const portrait = document.createElement("canvas");
    portrait.width = 540;
    portrait.height = 960;
    portrait.getContext("2d").drawImage(engine.canvas, 0, 0);
    sheets.push({
      name: "portrait",
      png: portrait.toDataURL("image/png").split(",")[1],
    });
    // renderLook disables asynchronous approval for stills. Re-enable the
    // unmodified live limiter and yield between frames for its GPU readbacks.
    engine.resize(960, 540);
    engine.options.flashLimit = true;
    for (let i = 0; i < 180; i++) {
      engine.beat = (i * 2.1) / 60;
      engine.advance(1 / 60, false);
      engine.present();
      await new Promise((done) => requestAnimationFrame(done));
    }
    if (
      !engine.options.flashLimit ||
      engine.gl.getError() ||
      engine.counters.nonFinite
    )
      throw Error("limiter-enabled native playback failed");
    return {
      rows,
      sheets,
      limiterEnabledFrames: 180,
      errors: window.__phosphorLab.errors,
    };
  });
  assert.deepEqual(lab.errors, []);
  assert.deepEqual(result.errors, []);
  for (const sheet of result.sheets)
    await writeFile(
      resolve(out, `${sheet.name}.png`),
      Buffer.from(sheet.png, "base64"),
    );
  const { sheets: _sheets, ...summary } = result;
  await writeFile(
    resolve(out, "verification.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  console.log(
    `${summary.rows.length} palette/energy/look checks; 180 limiter-enabled frames; no GL/nonfinite/browser errors`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
