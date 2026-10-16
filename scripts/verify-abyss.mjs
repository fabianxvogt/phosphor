// Native evidence with the live presentation limiter left enabled.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
import { PALETTES } from "../palettes.mjs";
const args = options({});
const out = await outputDirectory("abyss-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
try {
  const lab = await openLab(runtime.browser, server.url);
  const palettes = ["glacier", "ember", "acid-yellow"].map((id) => {
    const p = PALETTES.find((p) => p.id === id);
    assert.ok(p, id);
    return { id, colors: p.colors };
  });
  const cases = [];
  for (const development of [0, 1, 2])
    for (const level of [0.1, 0.5, 0.9])
      cases.push({
        development,
        level,
        palette: palettes[0],
        width: 640,
        height: 360,
      });
  for (const palette of palettes.slice(1))
    for (const development of [0, 1, 2])
      cases.push({
        development,
        level: 0.85,
        palette,
        width: 640,
        height: 360,
      });
  for (const development of [0, 1, 2])
    cases.push({
      development,
      level: 0.5,
      palette: palettes[0],
      width: 360,
      height: 640,
    });
  cases.push({
    development: 2,
    level: 0.9,
    palette: palettes[0],
    width: 640,
    height: 360,
    time: 43200,
  });
  const rows = [];
  for (const [index, spec] of cases.entries()) {
    const result = await lab.page.evaluate(async (spec) => {
      const { engine, scenes, presetSnapshot } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === "abyss");
      const snap = presetSnapshot(scene, spec.development);
      snap.palette = { ...spec.palette.colors };
      engine.options.flashLimit = true;
      engine.resize(spec.width, spec.height);
      engine.blackout = engine.blackoutTarget = 0;
      engine.setLevel(spec.level, 0);
      engine.load(snap, 0, { energy: 0.5 });
      if (!(await engine.ready("abyss")))
        throw new Error("abyss did not compile");
      while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
      if (spec.time) engine.slots.at(-1).time = spec.time;
      for (let i = 0; i < 48; i++) {
        engine.beat = 0.5 + (i * 2.1) / 60;
        engine.advance(1 / 60, false);
        if (i % 6 === 0) await new Promise(requestAnimationFrame);
      }
      await new Promise(requestAnimationFrame);
      engine.present();
      const canvas = document.createElement("canvas");
      canvas.width = spec.width;
      canvas.height = spec.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(engine.canvas, 0, 0);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0,
        lit = 0,
        peak = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        const v = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]);
        sum += v;
        if (v > 8) lit++;
        peak = Math.max(peak, v);
      }
      return {
        mean: sum / (rgba.length / 4),
        litFraction: lit / (rgba.length / 4),
        peak,
        limiterEnabled: engine.options.flashLimit,
        glError: engine.gl.getError(),
        nonFinite:
          engine.counters.nonFinite + (window.__harness?.nonFiniteUploads ?? 0),
        png: canvas.toDataURL("image/png").split(",")[1],
      };
    }, spec);
    const name = `${String(index).padStart(2, "0")}-d${spec.development}-e${spec.level}-${spec.palette.id}-${spec.width}x${spec.height}${spec.time ? "-12h" : ""}.png`;
    await writeFile(join(out, name), Buffer.from(result.png, "base64"));
    const { png, ...health } = result;
    rows.push({ ...spec, palette: spec.palette.id, capture: name, ...health });
    assert.equal(health.glError, 0, name);
    assert.equal(health.nonFinite, 0, name);
    assert.equal(health.limiterEnabled, true);
    assert.ok(
      health.peak > 30 && health.litFraction > 0.01,
      `${name}: ${JSON.stringify(health)}`,
    );
  }
  // Freeze simulation and time; only development changes. Read the actual
  // scene FBO for equality, independently of presentation limiter history.
  const reversal = await lab.page.evaluate(() => {
    const { engine } = window.__phosphorLab;
    const slot = engine.slots.at(-1),
      gl = engine.gl;
    const shot = (development) => {
      const snap = structuredClone(engine.active);
      snap.params.development = development;
      engine.setSnapshot(snap);
      engine.drawSlot(slot, 0);
      const target = slot.visual[slot.vi];
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.fbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, engine.healthTarget.fbo);
      gl.blitFramebuffer(
        0,
        0,
        target.w,
        target.h,
        0,
        0,
        64,
        36,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, engine.healthTarget.fbo);
      const bytes = new Uint8Array(64 * 36 * 4);
      gl.readPixels(0, 0, 64, 36, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return bytes;
    };
    const a = shot(0.5),
      b = shot(1.7),
      c = shot(0.5);
    return {
      differing: a.filter((v, i) => v !== c[i]).length,
      changed: a.filter((v, i) => v !== b[i]).length,
      glError: gl.getError(),
    };
  });
  await writeFile(
    join(out, "verification.json"),
    JSON.stringify({ rows, reversal, errors: lab.errors }, null, 2) + "\n",
  );
  assert.equal(reversal.glError, 0);
  assert.equal(reversal.differing, 0);
  assert.ok(reversal.changed > 100);
  assert.deepEqual(lab.errors, []);
  console.log(
    JSON.stringify({ cases: rows.length, reversal, errors: lab.errors }),
  );
} finally {
  await runtime.stop();
  await server.close();
}
