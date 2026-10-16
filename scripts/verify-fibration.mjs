// Native visual/limiter breadth checks, with no changes to live safety policy.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-fibration.mjs --rig --port 48880
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
if (!args.rig) throw new Error("--rig required");
const out = await outputDirectory("look-review/fibration-checks", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true });
const rows = [];
try {
  const { page, errors } = await openLab(runtime.browser, server.url);
  for (const palette of PALETTES.filter((p) =>
    ["phosphor", "ember", "glacier"].includes(p.id),
  )) {
    const result = await page.evaluate(async (palette) => {
      const { engine, scenes, presetSnapshot } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === "fibration");
      const sheet = document.createElement("canvas");
      sheet.width = 960;
      sheet.height = 600;
      const ctx = sheet.getContext("2d");
      const rows = [];
      const frame = () => new Promise((done) => requestAnimationFrame(done));
      engine.options.flashLimit = true;
      let beat = 0;
      for (const [di, development] of [0, 1, 2].entries()) {
        for (const [ei, energy] of [0.1, 0.5, 0.9].entries()) {
          engine.resize(640, 360);
          const snapshot = presetSnapshot(scene, di);
          snapshot.palette = palette.colors;
          engine.setLevel(energy, 0);
          engine.load(snapshot, 0, { energy: 0.5 });
          if (!(await engine.ready(scene.id))) throw new Error("compile");
          while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
          for (let i = 0; i < 36; i++) {
            engine.beat = beat += 2.1 / 60;
            engine.advance(1 / 60, false);
            await frame();
          }
          engine.present();
          ctx.drawImage(engine.canvas, ei * 320, di * 200, 320, 180);
          ctx.fillStyle = "#101018";
          ctx.fillRect(ei * 320, di * 200 + 180, 320, 20);
          ctx.fillStyle = "white";
          ctx.fillText(
            `${palette.id} d=${development} E=${energy}`,
            ei * 320 + 8,
            di * 200 + 194,
          );
          const image = ctx.getImageData(ei * 320, di * 200, 320, 180).data;
          let lit = 0,
            peak = 0;
          for (let j = 0; j < image.length; j += 4) {
            const v = Math.max(image[j], image[j + 1], image[j + 2]);
            if (v > 35) lit++;
            peak = Math.max(peak, v);
          }
          rows.push({
            palette: palette.id,
            development,
            energy,
            litFraction: lit / (320 * 180),
            peak,
          });
        }
      }
      return { png: sheet.toDataURL("image/png").split(",")[1], rows };
    }, palette);
    await writeFile(
      join(out, `${palette.id}-ladder.png`),
      Buffer.from(result.png, "base64"),
    );
    rows.push(...result.rows);
  }
  // Isolate the actual restrained signature loop (other family tracks muted)
  // to verify travel, not just an overall colour pop in a dense rhythm strip.
  const signature = await page.evaluate(async () => {
    const { defaultPattern } = await import("/rhythm.mjs");
    const { engine, scenes, presetSnapshot } = window.__phosphorLab;
    const scene = scenes.find((s) => s.id === "fibration");
    const pattern = defaultPattern(scene.rhythm, "restrained");
    for (const track of pattern.tracks)
      track.muted = track.effect !== "fibre-current";
    const frame = (beat) => ({
      beat,
      origin: 0,
      enabled: true,
      settings: { families: { fibration: pattern } },
    });
    engine.setRhythmFrame(frame(0.9));
    engine.resize(640, 360);
    engine.setLevel(0.85, 0);
    engine.load(presetSnapshot(scene, 2), 0, { energy: 0.5 });
    await engine.ready(scene.id);
    while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
    const sheet = document.createElement("canvas");
    sheet.width = 1280;
    sheet.height = 400;
    const ctx = sheet.getContext("2d"),
      ages = [];
    const slot = engine.slots.at(-1),
      gl = engine.gl;
    for (let i = 0; i < 38; i++) {
      engine.setRhythmFrame(frame(1.001 + i * 0.035));
      engine.advance(1 / 60, false);
      await new Promise((done) => requestAnimationFrame(done));
      if (i % 5 !== 0) continue;
      const pixel = new Uint8Array(4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, slot.sim[slot.si].fbo);
      gl.readPixels(4, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const age = (pixel[0] * 65536 + pixel[1] * 256 + pixel[2]) / 16777216;
      ages.push(age);
      engine.present();
      const x = ((ages.length - 1) % 4) * 320,
        y = Math.floor((ages.length - 1) / 4) * 200;
      ctx.drawImage(engine.canvas, x, y, 320, 180);
      ctx.fillStyle = "white";
      ctx.fillText(`current age ${age.toFixed(3)}`, x + 8, y + 194);
    }
    engine.setRhythmFrame(null);
    return { ages, png: sheet.toDataURL("image/png").split(",")[1] };
  });
  await writeFile(
    join(out, "signature-travel.png"),
    Buffer.from(signature.png, "base64"),
  );
  assert.ok(signature.ages[0] < 0.03, "one hit resets the GPU travel clock");
  for (let i = 1; i < signature.ages.length; i++)
    assert.ok(
      signature.ages[i] > signature.ages[i - 1] + 0.1,
      "the envelope must not repeatedly reset the hit clock",
    );
  const extra = await page.evaluate(async () => {
    const { engine, scenes, presetSnapshot } = window.__phosphorLab;
    const scene = scenes.find((s) => s.id === "fibration");
    const snapshot = presetSnapshot(scene, 4); // Glass Nest, extra look
    engine.resize(540, 720);
    engine.load(snapshot, 0, { energy: 0.5 });
    await engine.ready(scene.id);
    while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
    const slot = engine.slots.at(-1),
      mesh = slot.mesh;
    slot.time = 43200;
    engine.time = 43200;
    const frame = () => new Promise((done) => requestAnimationFrame(done));
    for (const dev of [
      ...Array.from({ length: 21 }, (_, i) => i / 10),
      ...Array.from({ length: 21 }, (_, i) => 2 - i / 10),
    ]) {
      const next = structuredClone(snapshot);
      next.params.development = dev;
      engine.setSnapshot(next);
      engine.beat = (engine.beat ?? 0) + 0.035;
      engine.advance(1 / 60, false);
      await frame();
      if (slot.mesh !== mesh)
        throw new Error("development rebuilt seed geometry");
    }
    const portrait = engine.canvas.toDataURL("image/png").split(",")[1];
    engine.resize(640, 640);
    engine.advance(1 / 60, false);
    await frame();
    engine.present();
    const gl = engine.gl;
    return {
      portrait,
      square: engine.canvas.toDataURL("image/png").split(",")[1],
      glError: gl.getError(),
      nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
      gpuErrors: engine.counters.gpuErrors,
      flashLimit: engine.options.flashLimit,
      limiter: {
        limitedFrames: engine.counters.flashLimited,
        gain: engine.pipeline.gain,
      },
      lateTime: slot.time,
      meshPreserved: slot.mesh === mesh,
    };
  });
  await writeFile(
    join(out, "late-portrait.png"),
    Buffer.from(extra.portrait, "base64"),
  );
  await writeFile(
    join(out, "late-square.png"),
    Buffer.from(extra.square, "base64"),
  );
  delete extra.portrait;
  delete extra.square;
  await writeFile(
    join(out, "checks.json"),
    JSON.stringify(
      { rows, signatureAges: signature.ages, extra, errors },
      null,
      2,
    ),
  );
  assert.equal(extra.glError, 0);
  assert.equal(extra.nonFinite, 0);
  assert.equal(extra.gpuErrors, 0);
  assert.equal(extra.flashLimit, true);
  assert.equal(extra.meshPreserved, true);
  assert.deepEqual(errors, []);
  for (const row of rows)
    assert.ok(row.peak > 60 && row.litFraction > 0.035, JSON.stringify(row));
  console.log(
    JSON.stringify({
      cases: rows.length,
      minimumLitFraction: Math.min(...rows.map((r) => r.litFraction)),
      ...extra,
      errors,
    }),
  );
} finally {
  await runtime.stop();
  await server.close();
}
