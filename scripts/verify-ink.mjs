// Native ink regression/capture: energy, palettes, aspect, reversal and late time.
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

const args = options({ quick: { type: "boolean", default: false } });
if (!args.rig) throw new Error("Pass --rig for native ink verification");
const out = await outputDirectory("ink-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  const cases = args.quick
    ? [0, 1, 2].flatMap((index) =>
        [0.1, 0.5, 0.9].map((energy) => ({ index, energy })),
      )
    : [0, 1, 2, 3, 4, 5, 6, 7].flatMap((index) =>
        [0.1, 0.5, 0.9].map((energy) => ({ index, energy })),
      );
  if (!args.quick) {
    for (const palette of ["ember", "glacier", "acid-yellow"])
      for (const index of [0, 1, 2])
        cases.push({ index, energy: 0.85, palette });
    for (const index of [0, 1, 2])
      cases.push({ index, energy: 0.85, width: 540, height: 960 });
    for (const time of [3599.99, 3600.01, 4095.99, 4096.01, 43200])
      cases.push({ index: 2, energy: 0.85, time });
    for (const development of [2, 1.75, 1.5, 1, 0.5, 0.25, 0])
      cases.push({ index: 0, energy: 0.85, development });
  }
  for (const [i, spec] of cases.entries()) {
    const result = await lab.page.evaluate(async (spec) => {
      const { engine, scenes, presetSnapshot } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === "ink");
      const snapshot = presetSnapshot(scene, spec.index);
      if (spec.development !== undefined)
        snapshot.params.development = spec.development;
      if (spec.palette) {
        const { PALETTES } = await import("/palettes.mjs");
        snapshot.palette = { ...PALETTES.find((p) => p.id === spec.palette).colors };
      }
      engine.resize(spec.width ?? 640, spec.height ?? 360);
      engine.setLevel(spec.energy, 0);
      engine.load(snapshot, 0, { energy: spec.energy });
      if (!(await engine.ready("ink"))) throw new Error("Ink compile failed");
      engine.options.flashLimit = true;
      for (let j = 0; j < 8; j++) {
        engine.beat = 17.5 + j / 30;
        engine.advance(1 / 60, false);
        await new Promise((done) => requestAnimationFrame(done));
      }
      const slot = engine.slots.at(-1);
      slot.time = spec.time ?? 19;
      // Match the shader's integrated periodic clocks at arbitrary show times.
      slot.clocks = { time: NaN, beat: NaN };
      for (let j = 0; j < 8; j++) {
        engine.advance(1 / 60, false);
        await new Promise((done) => requestAnimationFrame(done));
      }
      engine.present();
      const gl = engine.gl;
      const pixels = new Uint8Array(engine.width * engine.height * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, engine.width, engine.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let lit = 0;
      for (let k = 0; k < pixels.length; k += 4)
        lit += Number(Math.max(pixels[k], pixels[k + 1], pixels[k + 2]) > 12);
      const canvas = document.createElement("canvas");
      canvas.width = engine.width;
      canvas.height = engine.height;
      canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
      return {
        png: canvas.toDataURL("image/png").split(",")[1],
        lit: lit / (engine.width * engine.height),
        glError: gl.getError(),
        nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
      };
    }, spec);
    const { png, ...health } = result;
    assert.equal(health.glError, 0);
    assert.equal(health.nonFinite, 0);
    assert.ok(health.lit > 0.04, `Mostly empty ${JSON.stringify(spec)}: ${health.lit}`);
    const file = `${String(i).padStart(2, "0")}-ink.png`;
    await writeFile(resolve(out, file), Buffer.from(png, "base64"));
    rows.push({ ...spec, ...health, file });
  }
  assert.deepEqual(lab.errors, []);
  await writeFile(resolve(out, "verification.json"), JSON.stringify(rows, null, 2) + "\n");
  console.log(`${rows.length} native frames: no GL/non-finite errors, lit coverage >4%`);
} finally {
  await runtime.stop();
  await server.close();
}
