// Native GPU energy/aspect/late-time and paused reversal checks.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-crystal.mjs --rig --port 48664
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
import { PALETTES } from "../palettes.mjs";
const args = options();
const out = await outputDirectory("look-review/cavern-r3-checks", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true });
try {
  const lab = await openLab(runtime.browser, server.url);
  const palettes = ["ember", "glacier"].map((id) => {
    const p = PALETTES.find((p) => p.id === id);
    assert.ok(p, id);
    return { id, colors: p.colors };
  });
  const results = await lab.page.evaluate(async (palettes) => {
    const { engine, scenes, presetSnapshot } = window.__phosphorLab;
    const scene = scenes.find((s) => s.id === "crystal");
    const gl = engine.gl;
    engine.resize(640, 640);
    // Keep the shared limiter enabled. Allow asynchronous approval to settle.
    if (!engine.options.flashLimit)
      throw new Error("limiter must remain enabled");
    const wait = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const read = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const data = new Uint8Array(engine.width * engine.height * 4);
      gl.readPixels(
        0,
        0,
        engine.width,
        engine.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data,
      );
      return data;
    };
    const rows = [],
      sheets = [];
    for (const palette of [{ id: "authored", colors: null }, ...palettes]) {
      const sheet = document.createElement("canvas");
      sheet.width = 960;
      sheet.height = 960;
      const context = sheet.getContext("2d");
      for (const energy of [0.1, 0.5, 0.9]) {
        for (const development of [0, 1, 2]) {
          const snapshot = presetSnapshot(scene, 0);
          snapshot.params.development = development;
          if (palette.colors) snapshot.palette = { ...palette.colors };
          engine.setLevel(energy, 0);
          engine.load(snapshot, 0, { energy: 0.5 });
          if (!(await engine.ready("crystal"))) throw new Error("compile");
          while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
          for (let i = 0; i < 36; i++) {
            engine.beat = (i * 2.1) / 60;
            engine.advance(1 / 60, false);
            if (i % 6 === 0) await wait();
          }
          for (let i = 0; i < 6; i++) {
            engine.advance(0, true);
            await wait();
          }
          const data = read();
          context.drawImage(
            engine.canvas,
            development * 320,
            [0.1, 0.5, 0.9].indexOf(energy) * 320,
            320,
            320,
          );
          let peak = 0,
            sum = 0,
            lit = 0;
          for (let i = 0; i < data.length; i += 4) {
            const value = Math.max(data[i], data[i + 1], data[i + 2]);
            peak = Math.max(peak, value);
            sum += value;
            if (value > 10) lit++;
          }
          const pixels = data.length / 4;
          rows.push({
            palette: palette.id,
            energy,
            development,
            peak,
            meanMax: sum / pixels,
            litFraction: lit / pixels,
            glError: gl.getError(),
          });
        }
      }
      sheets.push({
        id: palette.id,
        png: sheet.toDataURL("image/png").split(",")[1],
      });
    }
    // Geometry is a pure function of development. With no time advancement,
    // restore the same snapshot after a reversal and compare shader pixels.
    const slot = engine.slots.at(-1);
    slot.time = 43200;
    const base = structuredClone(engine.active);
    const snapshotAt = (d) => {
      const s = structuredClone(base);
      s.params.development = d;
      engine.setSnapshot(s);
      engine.advance(0, true);
    };
    snapshotAt(0.5);
    for (let i = 0; i < 8; i++) {
      engine.advance(0, true);
      await wait();
    }
    const a = read();
    snapshotAt(1.7);
    snapshotAt(0.5);
    for (let i = 0; i < 8; i++) {
      engine.advance(0, true);
      await wait();
    }
    const b = read();
    let maxDifference = 0;
    for (let i = 0; i < a.length; i++)
      maxDifference = Math.max(maxDifference, Math.abs(a[i] - b[i]));
    return {
      rows,
      sheets,
      reversalMaxDifference: maxDifference,
      lateTime: slot.time,
      gpuErrors: engine.counters.gpuErrors,
      nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
      limiterEnabled: engine.options.flashLimit,
      png: engine.canvas.toDataURL("image/png").split(",")[1],
    };
  }, palettes);
  const { png, sheets, ...metrics } = results;
  for (const sheet of sheets)
    await writeFile(
      `${out}/square-${sheet.id}-ladder.png`,
      Buffer.from(sheet.png, "base64"),
    );
  await writeFile(`${out}/square-late.png`, Buffer.from(png, "base64"));
  await writeFile(
    `${out}/health.json`,
    JSON.stringify({ ...metrics, errors: lab.errors }, null, 2) + "\n",
  );
  assert.equal(lab.errors.length, 0);
  assert.equal(metrics.gpuErrors + metrics.nonFinite, 0);
  // Display-space comparison includes adaptive post and the active limiter;
  // allow up to four 8-bit levels. CPU growth/identity tests remain exact.
  assert.ok(metrics.reversalMaxDifference <= 4);
  for (const row of metrics.rows) {
    assert.equal(row.glError, 0);
    assert.ok(row.peak > 80 && row.litFraction > 0.08, JSON.stringify(row));
  }
  console.log(JSON.stringify(metrics, null, 2));
} finally {
  await runtime.stop();
  await server.close();
}
