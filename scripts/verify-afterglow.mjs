// Family-owned GPU evidence; preserves the production flash limiter.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-afterglow.mjs --rig --port 48480
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
const args = options();
const out = await outputDirectory("garden-r3-verify", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  const run = async (spec) => {
    const result = await lab.page.evaluate(async (spec) => {
      const { engine, scenes, presetSnapshot } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === "afterglow");
      const frame = () => new Promise(requestAnimationFrame);
      engine.options.flashLimit = true;
      const snapshot = presetSnapshot(scene, spec.index ?? 0);
      engine.resize(spec.portrait ? 360 : 640, spec.portrait ? 640 : 360);
      engine.setLevel(spec.level ?? 0.5, 0);
      engine.load(snapshot, 0, { energy: 0.5 });
      if (!(await engine.ready(scene.id))) throw Error("compile failed");
      while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
      const slot = engine.slots.at(-1),
        sim = slot.sim,
        geometry = slot.geometry;
      if (spec.late) slot.time = 43200;
      for (let i = 0; i < 120; i++) {
        if (spec.reverse) {
          snapshot.params.development = 2 * (1 - i / 119);
          engine.setSnapshot(snapshot);
          if (
            engine.slots.at(-1) !== slot ||
            slot.sim !== sim ||
            slot.geometry !== geometry
          )
            throw Error("development rebuilt identity");
        }
        engine.beat = (i * 126) / 3600;
        engine.advance(1 / 60, false);
        await frame();
      }
      for (let i = 0; i < 4; i++) {
        engine.present();
        await frame();
      }
      const gl = engine.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
      let sum = 0,
        lit = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const y =
          (0.2126 * pixels[i] +
            0.7152 * pixels[i + 1] +
            0.0722 * pixels[i + 2]) /
          255;
        sum += y;
        if (y > 0.025) lit++;
      }
      const canvas = document.createElement("canvas");
      canvas.width = engine.width;
      canvas.height = engine.height;
      canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
      return {
        glError: gl.getError(),
        nonFinite:
          engine.counters.nonFinite + window.__harness.nonFiniteUploads,
        gpuErrors: engine.counters.gpuErrors,
        mean: sum / (pixels.length / 4),
        lit: lit / (pixels.length / 4),
        flashLimiterEnabled: engine.options.flashLimit,
        png: canvas.toDataURL().split(",")[1],
      };
    }, spec);
    const { png, ...health } = result;
    assert.equal(health.glError + health.nonFinite + health.gpuErrors, 0);
    assert.equal(health.flashLimiterEnabled, true);
    assert.ok(health.mean > 0.005 && health.lit > 0.1, JSON.stringify(health));
    const name = spec.name ?? `look-${spec.index}-energy-${spec.level}`;
    await writeFile(join(out, `${name}.png`), Buffer.from(png, "base64"));
    rows.push({ ...spec, ...health });
  };
  for (let index = 0; index < 8; index++)
    for (const level of [0.1, 0.5, 0.9]) await run({ index, level });
  await run({ name: "portrait", index: 2, level: 0.85, portrait: true });
  await run({ name: "reversal", reverse: true, level: 0.85 });
  await run({ name: "late-12h", index: 2, late: true, level: 0.85 });
  assert.deepEqual(lab.errors, []);
  // Fresh context compiles the production no-float-data path.
  const fallback = await openLab(runtime.browser, server.url);
  await fallback.page.evaluate(() => {
    window.__phosphorLab.engine.floatPicture = false;
  });
  // Compile with precompute unsupported, rather than changing shader bodies.
  const fallbackHealth = await fallback.page.evaluate(async () => {
    const { engine, scenes, presetSnapshot } = window.__phosphorLab;
    const scene = scenes.find((s) => s.id === "afterglow");
    engine.resize(360, 640);
    engine.load(presetSnapshot(scene, 2), 0);
    if (!(await engine.ready(scene.id)))
      throw Error(
        `fallback compile failed: ${engine.programs.get(scene.id).error}`,
      );
    while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
    for (let i = 0; i < 60; i++) {
      engine.advance(1 / 60);
      await new Promise(requestAnimationFrame);
    }
    if (engine.slots.at(-1).precompute)
      throw Error("fallback unexpectedly uses a cache");
    return {
      glError: engine.gl.getError(),
      nonFinite: engine.counters.nonFinite,
      flashLimiterEnabled: engine.options.flashLimit,
    };
  });
  assert.equal(fallbackHealth.glError + fallbackHealth.nonFinite, 0);
  assert.deepEqual(fallback.errors, []);
  await writeFile(
    join(out, "health.json"),
    JSON.stringify({ rows, fallbackHealth, errors: lab.errors }, null, 2) +
      "\n",
  );
  console.log(
    `${rows.length} captures: zero GL/non-finite errors; all frames populated; reversal identity preserved; limiter enabled.`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
