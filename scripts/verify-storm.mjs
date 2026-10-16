// Thunderhead native evidence: late times, energies, palettes, the lattice
// against the storm bounds, exact CPU/GPU event graphs, aspect stills.
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-storm.mjs --rig --port 48308
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { options, outputDirectory, serve, launch, openLab } from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";
import { PALETTES } from "../palettes.mjs";
import { leaderSegment, worldPoint, stormBox } from "../storm-model.mjs";

const args = options();
const out = await outputDirectory("films/storm-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const report = { late: [], bounds: [], graph: [], stills: [] };
const load = (page, development, extra = {}) =>
  page.evaluate(
    ({ development, extra }) => {
      const { scenes, presetSnapshot } = window.__phosphorLab;
      const s = presetSnapshot(scenes.find((s) => s.id === "storm"), extra.index ?? 0);
      if (development !== null) s.params.development = development;
      if (extra.height) s.params.height = extra.height;
      if (extra.palette) s.palette = extra.palette;
      return s;
    },
    { development, extra },
  );
// Advance to a scene time and beat, render, read the canvas statistics.
const frame = (page, time, beat, still = false) =>
  page.evaluate(
    async ({ time, beat, still }) => {
      const { engine } = window.__phosphorLab,
        gl = engine.gl,
        slot = engine.slots.at(-1);
      slot.time = time;
      engine.beat = beat;
      engine.uniformFrame++;
      engine.advance(0, true);
      await engine.ready("storm");
      engine.advance(1 / 60, false);
      engine.present();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const bytes = new Uint8Array(engine.width * engine.height * 4);
      gl.readPixels(0, 0, engine.width, engine.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      let lit = 0,
        peak = 0;
      for (let i = 0; i < bytes.length; i += 4) {
        const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
        peak = Math.max(peak, p);
        lit += Number(p > 12);
      }
      let png = null;
      if (still) {
        const c = document.createElement("canvas");
        c.width = engine.width;
        c.height = engine.height;
        c.getContext("2d").drawImage(engine.canvas, 0, 0);
        png = c.toDataURL("image/png").split(",")[1];
      }
      return {
        peak,
        lit: lit / (bytes.length / 4),
        late: !!engine.programs.get("storm").late?.visual?.uniforms,
        lateError: engine.programs.get("storm").late?.error ?? null,
        glError: gl.getError(),
        nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
        png,
      };
    },
    { time, beat, still },
  );
try {
  const lab = await openLab(runtime.browser, server.url);
  // 1. Late show times at both energy ends, three palettes, five states.
  for (const paletteId of ["glacier", "ember", "phosphor"])
    for (const development of [0, 0.5, 1, 1.5, 2])
      for (const level of [0.1, 0.9]) {
        const palette = PALETTES.find((p) => p.id === paletteId).colors;
        const snapshot = await load(lab.page, development, { palette });
        await lab.page.evaluate(renderLook, {
          sceneId: "storm", snapshot, level, width: 480, height: 270,
          frames: 2, capture: false, pollHealth: false,
        });
        for (const time of [3600, 43200]) {
          const row = await frame(lab.page, time, time * 2.1, false);
          delete row.png;
          assert.equal(row.glError, 0);
          assert.equal(row.nonFinite, 0);
          assert.equal(row.lateError, null);
          assert.ok(row.late);
          assert.ok(row.lit > 0.06, JSON.stringify({ paletteId, development, level, ...row }));
          report.late.push({ paletteId, development, level, time, ...row });
        }
      }
  // 2. Every positive lattice node and its trilinear halo lie inside the
  // storm bounds the visual march uses; 3. GPU event graphs equal the CPU
  // leader graph mapped through the GPU's own event frame.
  for (const development of [0, 0.25, 0.75, 1, 1.25, 1.5, 1.75, 2])
    for (const height of [0.7, 1, 1.2]) {
      const snapshot = await load(lab.page, development, { height });
      await lab.page.evaluate(renderLook, {
        sceneId: "storm", snapshot, level: 0.9, width: 320, height: 180,
        frames: 1, capture: false, pollHealth: false,
      });
      for (const [time, beat] of [[7, 16.1], [31, 24.12], [55, 48.08]]) {
        await frame(lab.page, time, beat);
        const data = await lab.page.evaluate(() => {
          const { engine } = window.__phosphorLab,
            gl = engine.gl,
            slot = engine.slots.at(-1);
          gl.bindFramebuffer(gl.FRAMEBUFFER, slot.precompute.fbo);
          const volume = new Float32Array(1024 * 640 * 4);
          gl.readPixels(0, 35, 1024, 640, gl.RGBA, gl.FLOAT, volume);
          const rows = new Float32Array(1024 * 3 * 4);
          gl.readPixels(0, 0, 1024, 3, gl.RGBA, gl.FLOAT, rows);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          return { volume: Array.from(volume), rows: Array.from(rows), seed: slot.snapshot.seed };
        });
        const { lo, hi } = stormBox(snapshot.seed, development, height);
        const origin = [-26, 0.3, -7], size = [52, 16.8, 30], grid = [128, 80, 64];
        let overflow = -1e9, occupied = 0, nonFinite = 0;
        for (let z = 0; z < 64; z++)
          for (let y = 0; y < 80; y++)
            for (let x = 0; x < 128; x++) {
              const at = ((((z / 8) | 0) * 80 + y) * 1024 + (z % 8) * 128 + x) * 4;
              for (let c = 0; c < 4; c++) nonFinite += Number(!Number.isFinite(data.volume[at + c]));
              if (!(data.volume[at] > 0)) continue;
              occupied++;
              const q = [x, y, z];
              // The node centre must lie inside the bounds the march clips to
              // (bounds already include the erosion and AA margins).
              for (let axis = 0; axis < 3; axis++) {
                const centre = origin[axis] + ((q[axis] + 0.5) / grid[axis]) * size[axis];
                overflow = Math.max(overflow, lo[axis] - centre, centre - hi[axis]);
              }
            }
        assert.equal(nonFinite, 0);
        report.bounds.push({ development, height, time, occupied, overflow });
        assert.ok(occupied > 0);
        assert.ok(overflow <= 0, JSON.stringify({ development, height, time, overflow }));
        // Event graphs: 4 slots x 30 edges, world endpoints in rows 1 and 2.
        let graphError = 0;
        const texel = (x, row) => data.rows.slice((row * 1024 + x) * 4, (row * 1024 + x) * 4 + 4);
        for (let slot = 0; slot < 4; slot++) {
          const state = texel(120 + slot, 0);
          const event = {
            top: texel(120 + slot, 1).slice(0, 3),
            bottom: texel(120 + slot, 2).slice(0, 3),
            side: texel(124 + slot, 0).slice(0, 3),
            depth: texel(124 + slot, 1).slice(0, 3),
          };
          for (let local = 0; local < 30; local++) {
            const s = leaderSegment(data.seed, state[3], local);
            const a = worldPoint(s.a, event, height), b = worldPoint(s.b, event, height);
            const ga = texel(slot * 30 + local, 1), gb = texel(slot * 30 + local, 2);
            for (let k = 0; k < 3; k++)
              graphError = Math.max(graphError, Math.abs(a[k] - ga[k]), Math.abs(b[k] - gb[k]));
            const weight = s.active ? (local < 18 ? 1 : 0.52) : 0;
            assert.ok(Math.abs(ga[3] - weight) < 1e-6);
          }
        }
        assert.ok(graphError < 2e-4, `CPU/GPU graph error ${graphError}`);
        report.graph.push({ development, height, time, graphError });
      }
    }
  // 4. Aspect and resolution stills of each state at a late time.
  for (const [name, index, width, height] of [
    ["haze-portrait", 0, 540, 960],
    ["towers-square", 1, 720, 720],
    ["supercell-portrait", 2, 540, 960],
    ["supercell-4k", 2, 3840, 2160],
  ]) {
    const snapshot = await load(lab.page, null, { index });
    await lab.page.evaluate(renderLook, {
      sceneId: "storm", snapshot, level: 0.5, width, height,
      frames: 1, capture: false, pollHealth: false,
    });
    const row = await frame(lab.page, 43200, 16.1 + 16 * 30, true);
    assert.equal(row.glError, 0);
    assert.equal(row.nonFinite, 0);
    await writeFile(resolve(out, `${name}.png`), Buffer.from(row.png, "base64"));
    delete row.png;
    report.stills.push({ name, ...row });
  }
  assert.deepEqual(lab.errors, []);
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    late: report.late.length,
    minLit: Math.min(...report.late.map((r) => r.lit)),
    bounds: report.bounds.length,
    maxOverflow: Math.max(...report.bounds.map((r) => r.overflow)),
    graphs: report.graph.length,
    maxGraphError: Math.max(...report.graph.map((r) => r.graphError)),
    stills: report.stills.map((s) => s.name),
  }));
} finally {
  await runtime.stop();
  await server.close();
}
