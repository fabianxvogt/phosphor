// Native energy/palette/aspect/reversal/late-time review. Keeps the shared
// flash limiter enabled; source/GPU profiles use the repository's own probes.
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
const args = options();
assert.ok(args.rig, "Pass --rig on the native GPU");
const out = await outputDirectory("murmuration-r3-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const rows = [];
try {
  const { page, errors } = await openLab(runtime.browser, server.url);
  const cases = [];
  for (const palette of ["ember", "glacier", "phosphor"])
    for (const energy of [0.1, 0.5, 0.9])
      for (const development of [0, 1, 2])
        cases.push({ palette, energy, development, width: 640, height: 360 });
  for (const index of [0, 2, 4, 5, 6])
    cases.push({
      palette: "ember",
      energy: 0.85,
      development: null,
      index,
      width: 480,
      height: 720,
    });
  cases.push({
    palette: "glacier",
    energy: 0.5,
    development: 2,
    width: 640,
    height: 360,
    late: true,
    reverse: true,
  });
  for (const [i, spec] of cases.entries()) {
    const colors = PALETTES.find((p) => p.id === spec.palette).colors;
    const row = await page.evaluate(
      async ({ spec, colors }) => {
        const { engine, scenes, presetSnapshot } = window.__phosphorLab;
        const scene = scenes.find((s) => s.id === "murmuration");
        const snapshot = presetSnapshot(scene, spec.index ?? 0);
        if (spec.development !== null)
          snapshot.params.development = spec.development;
        snapshot.palette = colors;
        engine.resize(spec.width, spec.height);
        engine.setLevel(spec.energy, 0);
        engine.load(snapshot, 0, { energy: 0.5 });
        if (!(await engine.ready(scene.id))) throw Error("compile failed");
        const slot = engine.slots.at(-1);
        while (slot.warmTicks > 0) engine.advance(0, true);
        if (spec.late) {
          slot.time = 43207;
          // Exact persistent GPU clock phases at 12 h + 7 s (speed=1,
          // formation-cycle=.5); both ping-pong targets receive the phase.
          const word = (x) => [
            x >>> 24,
            (x >>> 16) & 255,
            (x >>> 8) & 255,
            x & 255,
          ];
          const bytes = new Uint8Array([
            ...word(Math.round((7 / 1440) * 2 ** 32) >>> 0),
            ...word(Math.round(((7 * 0.5) / 240) * 2 ** 32) >>> 0),
          ]);
          const gl = engine.gl;
          for (const target of slot.sim) {
            gl.bindTexture(gl.TEXTURE_2D, target.texture);
            gl.texSubImage2D(
              gl.TEXTURE_2D,
              0,
              0,
              0,
              2,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              bytes,
            );
          }
        }
        const frames = spec.reverse ? 360 : 120;
        for (let t = 0; t < frames; t++) {
          if (spec.reverse) {
            const next = structuredClone(engine.active);
            next.params.development =
              1 + Math.cos((t / (frames - 1)) * Math.PI * 2);
            engine.setSnapshot(next);
          }
          engine.beat = 16 + (t * 126) / 3600;
          engine.advance(1 / 60, false);
          if (t % 12 === 0) await new Promise((done) => setTimeout(done, 0));
        }
        for (let n = 0; n < 3; n++) {
          engine.present();
          await new Promise(requestAnimationFrame);
        }
        const gl = engine.gl;
        const pixels = new Uint8Array(engine.width * engine.height * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.readPixels(
          0,
          0,
          engine.width,
          engine.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels,
        );
        let lit = 0,
          peak = 0;
        for (let k = 0; k < pixels.length; k += 4) {
          const p = Math.max(pixels[k], pixels[k + 1], pixels[k + 2]);
          if (p > 8) lit++;
          peak = Math.max(peak, p);
        }
        const canvas = document.createElement("canvas");
        canvas.width = engine.width;
        canvas.height = engine.height;
        canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
        return {
          ...spec,
          peak,
          lit: lit / (pixels.length / 4),
          glError: gl.getError(),
          nonFinite:
            engine.counters.nonFinite + window.__harness.nonFiniteUploads,
          flashLimit: engine.options.flashLimit,
          png: canvas.toDataURL("image/png").split(",")[1],
        };
      },
      { spec, colors },
    );
    assert.equal(row.glError, 0);
    assert.equal(row.nonFinite, 0);
    assert.notEqual(row.flashLimit, false);
    assert.ok(row.peak > 20 && row.lit > 0.1, `empty ${JSON.stringify(spec)}`);
    const file = `${String(i).padStart(2, "0")}-${spec.palette}-e${spec.energy}-d${spec.development ?? spec.index}${spec.late ? "-late-reverse" : ""}.png`;
    await writeFile(join(out, file), Buffer.from(row.png, "base64"));
    delete row.png;
    rows.push({ ...row, file });
    console.log(file, row.lit.toFixed(3));
  }
  assert.deepEqual(errors, []);
  await writeFile(
    join(out, "verification.json"),
    JSON.stringify({ rows, errors }, null, 2) + "\n",
  );
} finally {
  await runtime.stop();
  await server.close();
}
