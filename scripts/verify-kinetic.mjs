// Native energy/palette/late-time evidence, with the limiter intact.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-kinetic.mjs --rig --port 48643
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
const out = await outputDirectory("kinetic-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
try {
  const lab = await openLab(runtime.browser, server.url);
  const rows = [];
  for (const palette of ["ember", "glacier", "silver"])
    for (const level of [0.1, 0.5, 0.9])
      for (const dev of [0, 0.7, 1, 1.65, 2]) {
        const row = await lab.page.evaluate(
          async ({ palette, level, dev }) => {
            const { engine, scenes, presetSnapshot } = window.__phosphorLab;
            const { PALETTES } = await import("/palettes.mjs");
            const scene = scenes.find((s) => s.id === "kinetic");
            const snapshot = presetSnapshot(scene, 0);
            snapshot.palette = {
              ...PALETTES.find((p) => p.id === palette).colors,
            };
            snapshot.params.development = dev;
            engine.resize(540, 720);
            engine.beat = 1.5;
            engine.setLevel(level, 0);
            engine.load(snapshot, 0, { energy: 0.5 });
            if (!(await engine.ready("kinetic")))
              throw Error("GLSL compilation failed");
            engine.slots.at(-1).time = 43200;
            for (let frame = 0; frame < 12; frame++) {
              engine.beat += 0.035;
              engine.advance(1 / 60, false);
              await new Promise((resolve) => requestAnimationFrame(resolve));
            }
            const canvas = document.createElement("canvas");
            canvas.width = 540;
            canvas.height = 720;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(engine.canvas, 0, 0);
            const pixels = ctx.getImageData(0, 0, 540, 720).data;
            let sum = 0,
              peak = 0,
              lit = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const value = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
              sum += value;
              peak = Math.max(peak, value);
              if (value > 15) lit++;
            }
            return {
              palette,
              level,
              dev,
              mean: sum / (540 * 720),
              peak,
              lit: lit / (540 * 720),
              glError: engine.gl.getError(),
              nonFinite:
                engine.counters.nonFinite + window.__harness.nonFiniteUploads,
              limiter: engine.options.flashLimit,
              png: canvas.toDataURL("image/png").split(",")[1],
            };
          },
          { palette, level, dev },
        );
        assert.equal(row.glError, 0);
        assert.equal(row.nonFinite, 0);
        assert.notEqual(row.limiter, false, "limiter remains enabled");
        assert.ok(
          row.peak > 40 && row.lit > 0.02,
          JSON.stringify({ ...row, png: undefined }),
        );
        const name = `${palette}-e${level}-d${dev}.png`;
        await writeFile(join(out, name), Buffer.from(row.png, "base64"));
        delete row.png;
        rows.push(row);
      }
  assert.deepEqual(lab.errors, []);
  await writeFile(
    join(out, "verification.json"),
    JSON.stringify({ rows, errors: lab.errors }, null, 2) + "\n",
  );
  console.log(
    `${rows.length} native portrait/late-time energy/palette cases pass; limiter intact`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
