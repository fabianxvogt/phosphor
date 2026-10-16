// Family-owned native visual matrix; deterministic stills use the repository
// renderLook capture helper. The final live smoke explicitly keeps the shared
// asynchronous flash approval enabled. No production limiter code is changed.
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
assert.ok(args.rig && Number(args.port) >= 48740 && Number(args.port) <= 48749);
const out = await outputDirectory("silk-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true });
const rows = [];
try {
  const { page, errors } = await openLab(runtime.browser, server.url);
  const renderer = await page.evaluate(() => {
    const gl = window.__phosphorLab.engine.gl;
    return gl.getParameter(
      gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL,
    );
  });
  assert.doesNotMatch(renderer, /swiftshader|software/i);
  for (const palette of [null, "ember", "glacier"])
    for (const energy of [0.1, 0.5, 0.9]) {
      const snapshot = await page.evaluate(
        (colors) => {
          const { scenes, presetSnapshot } = window.__phosphorLab;
          const result = presetSnapshot(
            scenes.find((s) => s.id === "silk"),
            0,
          );
          if (colors) result.palette = colors;
          return result;
        },
        palette ? PALETTES.find((p) => p.id === palette).colors : null,
      );
      await page.evaluate(renderLook, {
        sceneId: "silk",
        snapshot,
        level: energy,
        frames: 2,
        width: 480,
        height: 270,
        capture: false,
        pollHealth: false,
      });
      const result = await page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        const slot = engine.slots.at(-1),
          mesh = slot.mesh.buffer,
          gl = engine.gl;
        const shot = (development, time) => {
          const snapshot = structuredClone(engine.active);
          snapshot.params.development = development;
          engine.setSnapshot(snapshot);
          slot.time = time;
          engine.uniformFrame++;
          engine.drawSlot(slot, 0);
          engine.present();
          const pixels = new Uint8Array(engine.width * engine.height * 4);
          gl.readPixels(
            0,
            0,
            engine.width,
            engine.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
          return pixels;
        };
        const samples = [];
        for (const time of [12, 43200])
          for (const d of [0, 0.35, 0.7, 1, 1.35, 1.7, 2]) {
            const pixels = shot(d, time);
            let lit = 0,
              peak = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const v = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
              lit += v > 12 ? 1 : 0;
              peak = Math.max(peak, v);
            }
            samples.push({
              time,
              development: d,
              lit: lit / (pixels.length / 4),
              peak,
            });
          }
        const before = shot(0.65, 43200);
        shot(1.92, 43200);
        const after = shot(0.65, 43200);
        return {
          samples,
          reversible: before.every((x, i) => x === after[i]),
          sameMesh: slot.mesh.buffer === mesh,
          glError: gl.getError(),
          nonFinite:
            engine.counters.nonFinite + window.__harness.nonFiniteUploads,
        };
      });
      assert.equal(result.glError, 0);
      assert.equal(result.nonFinite, 0);
      assert.ok(result.reversible && result.sameMesh);
      for (const row of result.samples)
        assert.ok(
          row.lit > 0.08 && row.peak > 40,
          JSON.stringify({ palette, energy, ...row }),
        );
      rows.push({ palette: palette ?? "own", energy, ...result });
    }
  // All extra looks, portrait and square, at both extremes.
  for (let index = 0; index < 8; index++)
    for (const level of [0.1, 0.9]) {
      const [width, height] = index % 2 ? [360, 640] : [480, 480];
      const shot = await page.evaluate(renderLook, {
        sceneId: "silk",
        index,
        level,
        width,
        height,
        frames: 3,
        pollHealth: false,
      });
      assert.equal(shot.glError, 0);
      assert.equal(shot.nonFinite, 0);
      assert.ok(shot.peak > 40);
      await writeFile(
        resolve(out, `look-${index}-e${level}.png`),
        Buffer.from(shot.png, "base64"),
      );
    }
  await page.evaluate(renderLook, {
    sceneId: "silk",
    index: 2,
    level: 0.85,
    width: 640,
    height: 360,
    frames: 2,
    capture: false,
    pollHealth: false,
  });
  const signature = await page.evaluate(() => {
    const { engine } = window.__phosphorLab,
      slot = engine.slots.at(-1),
      gl = engine.gl;
    const images = [];
    slot.time = 21;
    for (const phase of [0, 0.9, 0.55, 0.2]) {
      slot.rhythm = {
        values: [0, 0, 0, phase],
        hits: [0, 0, 0, 0],
        counts: [0, 0, 0, 3],
      };
      engine.uniformFrame++;
      engine.drawSlot(slot, 0);
      engine.present();
      const pixels = new Uint8Array(engine.width * engine.height * 4);
      gl.readPixels(
        0,
        0,
        engine.width,
        engine.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels,
      );
      images.push({
        phase,
        pixels: Array.from(pixels),
        png: engine.canvas.toDataURL("image/png").split(",")[1],
      });
    }
    return images;
  });
  const base = signature[0].pixels;
  const differences = [];
  for (const image of signature) {
    let changed = 0;
    for (let i = 0; i < base.length; i += 4)
      if (
        Math.max(
          ...[0, 1, 2].map((k) => Math.abs(base[i + k] - image.pixels[i + k])),
        ) > 8
      )
        changed++;
    differences.push({
      phase: image.phase,
      changed: changed / (base.length / 4),
    });
    await writeFile(
      resolve(out, `signature-${image.phase}.png`),
      Buffer.from(image.png, "base64"),
    );
  }
  assert.ok(differences.slice(1).some((r) => r.changed > 0.001));
  // A real-time limiter-enabled smoke; this does not assert venue safety.
  const live = await page.evaluate(async () => {
    const { engine } = window.__phosphorLab;
    engine.options.flashLimit = true;
    for (let i = 0; i < 150; i++) {
      await new Promise(requestAnimationFrame);
      engine.beat = ((i / 60) * 126) / 60;
      engine.advance(1 / 60, false);
    }
    return {
      enabled: engine.options.flashLimit,
      canvasValid: engine.pipeline.canvasValid,
      glError: engine.gl.getError(),
      nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
      limited: engine.counters.flashLimited,
    };
  });
  assert.ok(live.enabled && live.canvasValid);
  assert.equal(live.glError, 0);
  assert.equal(live.nonFinite, 0);
  assert.deepEqual(errors, []);
  const report = { renderer, rows, differences, live, errors };
  await writeFile(
    resolve(out, "verification.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      renderer,
      samples: rows.length * 14,
      differences,
      live,
      errors,
    }),
  );
} finally {
  await runtime.stop();
  await server.close();
}
