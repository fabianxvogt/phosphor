// Native-GPU checks with the shared flash limiter left enabled.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-mycelium.mjs --rig --port 48460
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
assert.ok(args.rig && process.env.PHOSPHOR_HEADLESS_RIG === "1");
const out = await outputDirectory("mycelium-verify", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  const cases = [];
  for (let state = 0; state < 3; state++)
    for (const level of [0.1, 0.5, 0.9])
      cases.push({
        name: `state-${state}-energy-${level}`,
        index: state,
        level,
      });
  for (let index = 3; index < 8; index++)
    cases.push({ name: `look-${index}`, index, level: 0.5 });
  for (let index = 0; index < 3; index++) {
    cases.push({
      name: `portrait-${index}`,
      index,
      level: 0.5,
      portrait: true,
    });
    cases.push({ name: `late-${index}`, index, level: 0.9, time: 43200 });
  }
  cases.push({ name: "reverse-start", index: 2, level: 0.85 });
  for (const dev of [1.5, 1, 0.5, 0])
    cases.push({ name: `reverse-${dev}`, dev, level: 0.85, keep: true });

  for (const spec of cases) {
    const shot = await lab.page.evaluate(async (spec) => {
      const { engine, scenes, presetSnapshot, errors } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === "mycelium");
      const frame = () => new Promise((done) => requestAnimationFrame(done));
      if (!spec.keep) {
        engine.resize(spec.portrait ? 540 : 960, spec.portrait ? 960 : 540);
        engine.speed = 1;
        engine.setLevel(spec.level, 0);
        engine.load(presetSnapshot(scene, spec.index), 0, { energy: 0.5 });
        if (!(await engine.ready(scene.id))) throw new Error("shader compile");
        while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
      }
      const slot = engine.slots.at(-1);
      const identity = slot.mesh;
      if (spec.dev !== undefined) {
        const snapshot = structuredClone(engine.active);
        snapshot.params.development = spec.dev;
        engine.setSnapshot(snapshot);
      }
      if (spec.time) slot.time = spec.time;
      engine.setLevel(spec.level, 0);
      // Do not disable, replace or exempt the limiter, even for screenshots.
      if (!engine.options.flashLimit) throw new Error("limiter disabled");
      for (let i = 0; i < (spec.keep ? 30 : 60); i++) {
        engine.beat = (engine.beat ?? 0) + 126 / 3600;
        engine.advance(1 / 60, false);
        if (i % 8 === 0) await frame();
      }
      for (let i = 0; i < 4; i++) {
        await frame();
        engine.present();
      }
      if (slot.mesh !== identity) throw new Error("development rebuilt mesh");
      const gl = engine.gl;
      const target = slot.visual[slot.vi];
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      const pixels = new Float32Array(target.w * target.h * 4);
      gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, pixels);
      let nonFinitePixels = 0,
        lit = 0,
        peak = 0,
        sum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
        nonFinitePixels += rgb.filter((x) => !Number.isFinite(x)).length;
        const max = Math.max(...rgb);
        peak = Math.max(peak, max);
        lit += max > 0.04;
        sum += (rgb[0] + rgb[1] + rgb[2]) / 3;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      engine.present();
      const canvas = document.createElement("canvas");
      canvas.width = engine.width;
      canvas.height = engine.height;
      canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
      return {
        name: spec.name,
        development: slot.snapshot.params.development,
        level: spec.level,
        time: slot.time,
        width: engine.width,
        height: engine.height,
        limiter: engine.options.flashLimit,
        glError: gl.getError(),
        gpuErrors: engine.counters.gpuErrors,
        nonFinite:
          engine.counters.nonFinite + window.__harness.nonFiniteUploads,
        nonFinitePixels,
        litFraction: lit / (target.w * target.h),
        mean: sum / (target.w * target.h),
        peak,
        errors: [...errors],
        png: canvas.toDataURL("image/png").split(",")[1],
      };
    }, spec);
    const { png, ...row } = shot;
    rows.push(row);
    await writeFile(join(out, `${row.name}.png`), Buffer.from(png, "base64"));
    console.log(JSON.stringify(row));
    assert.equal(
      row.glError + row.gpuErrors + row.nonFinite + row.nonFinitePixels,
      0,
    );
    assert.ok(row.peak > 0.1 && row.litFraction > 0.02, row.name);
    assert.deepEqual(row.errors, []);
  }
  assert.deepEqual(lab.errors, []);
} finally {
  await writeFile(
    join(out, "verification.json"),
    JSON.stringify(rows, null, 2) + "\n",
  );
  await runtime.stop();
  await server.close();
}
