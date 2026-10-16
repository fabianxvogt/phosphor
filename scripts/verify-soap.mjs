// Native SOAP-only ladder, reverse/late health, and limiter-enabled smoke.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-soap.mjs --rig --port 48861
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
import { renderLook } from "../tests/browser/client.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options();
assert.ok(args.rig && process.env.PHOSPHOR_HEADLESS_RIG === "1");
const out = await outputDirectory("soap-r3-checks", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (let index = 0; index < 8; index++) {
    for (const energy of [0.1, 0.5, 0.9]) {
      const row = await lab.page.evaluate(
        async ({ source, index, energy }) => {
          const render = (0, eval)(`(${source})`);
          const { png, rgba, ...result } = await render({
            sceneId: "soap",
            index,
            level: energy,
            frames: 12,
            width: 480,
            height: 270,
          });
          let lit = 0;
          for (let i = 0; i < rgba.length; i += 4)
            if (Math.max(...rgba.slice(i, i + 3)) > 24) lit++;
          return { ...result, png, litFraction: lit / (rgba.length / 4) };
        },
        { source: renderLook.toString(), index, energy },
      );
      assert.equal(row.glError, 0);
      assert.equal(row.nonFinite, 0);
      assert.ok(
        row.peak > 40 && row.litFraction > 0.025,
        `empty ${index}/${energy}`,
      );
      const file = `look-${index}-energy-${energy}.png`;
      await writeFile(join(out, file), Buffer.from(row.png, "base64"));
      const { png, ...health } = row;
      rows.push({ file, index, energy, ...health });
    }
  }
  // All three states in two additional palettes, plus a portrait peak.
  for (const paletteId of ["ember", "glacier"]) {
    for (const index of [0, 1, 2]) {
      const palette = PALETTES.find((p) => p.id === paletteId).colors;
      const row = await lab.page.evaluate(
        async ({ source, index, palette }) => {
          const { scenes, presetSnapshot } = window.__phosphorLab;
          const snapshot = presetSnapshot(
            scenes.find((s) => s.id === "soap"),
            index,
          );
          snapshot.palette = { ...palette };
          const { png, rgba, ...result } = await (0, eval)(`(${source})`)({
            sceneId: "soap",
            snapshot,
            level: 0.85,
            frames: 24,
            width: 480,
            height: 270,
          });
          return { png, ...result };
        },
        { source: renderLook.toString(), index, palette },
      );
      assert.equal(row.glError + row.nonFinite, 0);
      const file = `${paletteId}-state-${index}.png`;
      await writeFile(join(out, file), Buffer.from(row.png, "base64"));
      const { png, ...health } = row;
      rows.push({ file, ...health });
    }
  }
  const portrait = await lab.page.evaluate(renderLook, {
    sceneId: "soap",
    index: 2,
    frames: 30,
    width: 360,
    height: 640,
    level: 0.85,
  });
  await writeFile(
    join(out, "portrait.png"),
    Buffer.from(portrait.png, "base64"),
  );
  assert.equal(portrait.glError + portrait.nonFinite, 0);
  const continuous = await lab.page.evaluate(async () => {
    const { engine } = window.__phosphorLab;
    engine.resize(480, 270);
    let frames = 0;
    for (const energy of [0.1, 0.5, 0.9]) {
      engine.setLevel(energy, 0);
      for (let i = 0; i <= 80; i++) {
        const snapshot = structuredClone(engine.active);
        snapshot.params.development = i <= 40 ? i / 20 : (80 - i) / 20;
        engine.setSnapshot(snapshot);
        engine.beat += 0.035;
        engine.advance(1 / 60, false);
        frames++;
      }
    }
    const late = [];
    for (const time of [3600, 4096, 43200]) {
      engine.slots.at(-1).time = time;
      engine.advance(1 / 60, false);
      engine.present();
      late.push(time);
    }
    // Standard offline renderLook setup above is now over. Exercise the
    // unmodified asynchronous live limiter for two seconds of native RAF.
    engine.options.flashLimit = true;
    for (let i = 0; i < 120; i++) {
      const snapshot = structuredClone(engine.active);
      snapshot.params.development = 2;
      engine.setSnapshot(snapshot);
      engine.beat += 0.035;
      engine.advance(1 / 60, false);
      engine.present();
      await new Promise((done) => requestAnimationFrame(done));
    }
    return {
      frames,
      late,
      limiterEnabled: engine.options.flashLimit,
      glError: engine.gl.getError(),
      gpuErrors: engine.counters.gpuErrors,
      nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
    };
  });
  assert.equal(
    continuous.glError + continuous.gpuErrors + continuous.nonFinite,
    0,
  );
  assert.equal(continuous.limiterEnabled, true);
  assert.deepEqual(lab.errors, []);
  await writeFile(
    join(out, "health.json"),
    JSON.stringify({ rows, continuous, errors: lab.errors }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ captures: rows.length + 1, continuous, out }));
} finally {
  await runtime.stop();
  await server.close();
}
