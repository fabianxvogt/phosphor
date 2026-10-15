// Thunderhead native evidence: late times, all energies, palette/portrait
// framing, exact CPU/GPU leader graph and cached/uncached differential.
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
import { renderLook } from "../tests/browser/client.mjs";
import { PALETTES } from "../palettes.mjs";
import { lightningGraph } from "../storm-model.mjs";

const args = options();
const out = await outputDirectory("films/storm-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const rows = [],
  comparisons = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const paletteId of ["glacier", "ember", "phosphor"])
    for (const development of [0, 0.5, 1, 1.5, 2])
      for (const energy of [0.1, 0.9]) {
        const snapshot = await lab.page.evaluate(
          ({ development, colors }) => {
            const { scenes, presetSnapshot } = window.__phosphorLab;
            const s = presetSnapshot(
              scenes.find((s) => s.id === "storm"),
              0,
            );
            s.params.development = development;
            s.palette = colors;
            return s;
          },
          {
            development,
            colors: PALETTES.find((p) => p.id === paletteId).colors,
          },
        );
        const initial = await lab.page.evaluate(renderLook, {
          sceneId: "storm",
          snapshot,
          level: energy,
          width: 480,
          height: 270,
          frames: 2,
          capture: false,
          pollHealth: false,
        });
        assert.equal(initial.glError, 0);
        assert.equal(initial.nonFinite, 0);
        for (const time of [3600, 43200]) {
          const row = await lab.page.evaluate(
            async ({ time, still }) => {
              const { engine } = window.__phosphorLab;
              engine.slots.at(-1).time = time;
              engine.uniformFrame++;
              engine.advance(0, true);
              await engine.ready("storm");
              engine.advance(1 / 60, false);
              engine.present();
              const gl = engine.gl;
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              const bytes = new Uint8Array(engine.width * engine.height * 4);
              gl.readPixels(
                0,
                0,
                engine.width,
                engine.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                bytes,
              );
              let lit = 0,
                peak = 0,
                sum = 0;
              for (let i = 0; i < bytes.length; i += 4) {
                const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
                peak = Math.max(peak, p);
                lit += Number(p > 12);
                sum += p;
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
                time,
                peak,
                litFraction: lit / (bytes.length / 4),
                mean: sum / (bytes.length / 4),
                lateReady:
                  !!engine.programs.get("storm").late?.visual?.uniforms,
                lateError: engine.programs.get("storm").late?.error ?? null,
                glError: gl.getError(),
                nonFinite:
                  engine.counters.nonFinite + window.__harness.nonFiniteUploads,
                png,
              };
            },
            {
              time,
              still:
                energy === 0.1 &&
                Number.isInteger(development) &&
                time === 43200,
            },
          );
          assert.equal(row.glError, 0);
          assert.equal(row.nonFinite, 0);
          assert.equal(row.lateError, null);
          assert.equal(row.lateReady, true);
          assert.ok(
            row.peak > 60 && row.litFraction > 0.015,
            JSON.stringify({
              paletteId,
              development,
              energy,
              ...row,
              png: null,
            }),
          );
          if (row.png)
            await writeFile(
              resolve(out, `${paletteId}-${development}-low-late.png`),
              Buffer.from(row.png, "base64"),
            );
          delete row.png;
          rows.push({ paletteId, development, energy, ...row });
        }
      }
  for (const development of [0, 0.5, 1, 1.5, 2]) {
    const snapshot = await lab.page.evaluate(
      ({ development }) => {
        const { scenes, presetSnapshot } = window.__phosphorLab;
        const s = presetSnapshot(
          scenes.find((s) => s.id === "storm"),
          0,
        );
        s.params.development = development;
        return s;
      },
      { development },
    );
    await lab.page.evaluate(renderLook, {
      sceneId: "storm",
      snapshot,
      width: 480,
      height: 270,
      frames: 1,
      capture: false,
      pollHealth: false,
    });
    const data = await lab.page.evaluate(() => {
      const { engine } = window.__phosphorLab,
        gl = engine.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, engine.slots.at(-1).precompute.fbo);
      const values = new Float32Array(128 * 3 * 4);
      gl.readPixels(0, 0, 128, 3, gl.RGBA, gl.FLOAT, values);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return Array.from(values);
    });
    const graph = lightningGraph(
      snapshot.seed,
      development,
      snapshot.params.height,
    );
    let error = 0;
    for (let i = 0; i < 120; i++) {
      for (let axis = 0; axis < 3; axis++) {
        error = Math.max(
          error,
          Math.abs(data[(128 + i) * 4 + axis] - graph[i].a[axis]),
          Math.abs(data[(256 + i) * 4 + axis] - graph[i].b[axis]),
        );
      }
      const weight = graph[i].active ? (i % 30 < 18 ? 1 : 0.52) : 0;
      assert.ok(Math.abs(data[(128 + i) * 4 + 3] - weight) < 1e-6);
    }
    assert.ok(error < 0.00001, `CPU/GPU graph error ${error}`);
    const diff = await lab.page.evaluate(async () => {
      const { engine, scenes } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === "storm"),
        slot = engine.slots.at(-1),
        gl = engine.gl;
      // Freeze a well-lit beat/time, preserving all the scene's own phases.
      slot.time = 25;
      engine.beat = 52.5;
      engine.uniformFrame++;
      engine.drawSlot(slot, 0);
      engine.present();
      const bytes = () => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const b = new Uint8Array(engine.width * engine.height * 4);
        gl.readPixels(
          0,
          0,
          engine.width,
          engine.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          b,
        );
        return b;
      };
      const cached = bytes(),
        selected = engine.programsFor(slot),
        saved = selected.visual;
      const { shaderVariant } = await import("/scene-time.mjs");
      const fallback = engine.program(
        engine.pictureHeader +
          shaderVariant(
            scene.fragment,
            !!selected.late || selected === engine.programs.get("storm").late,
          ),
      );
      selected.visual = fallback;
      engine.uniformFrame++;
      engine.drawSlot(slot, 0);
      engine.present();
      const direct = bytes();
      selected.visual = saved;
      gl.deleteProgram(fallback.p);
      let max = 0,
        sum = 0,
        differing = 0,
        outliers = 0;
      for (let i = 0; i < direct.length; i++) {
        const d = Math.abs(direct[i] - cached[i]);
        max = Math.max(max, d);
        sum += d;
        differing += Number(d > 0);
        outliers += Number(d > 2);
      }
      return {
        max,
        mean: sum / direct.length,
        differing,
        outlierFraction: outliers / direct.length,
        glError: gl.getError(),
      };
    });
    assert.equal(diff.glError, 0);
    // Float texture hardware has subtexel precision limits. Compare against
    // the manual, uncached interpolation with a sparse-contour error budget.
    assert.ok(
      diff.max <= 2 && diff.mean < 0.01 && diff.outlierFraction === 0,
      JSON.stringify(diff),
    );
    comparisons.push({ development, graphMaxError: error, fallback: diff });
  }
  for (const [name, index, width, height] of [
    ["haze-portrait", 0, 540, 960],
    ["towers-portrait", 1, 540, 960],
    ["supercell-portrait", 2, 540, 960],
    ["supercell-4k", 2, 3840, 2160],
  ]) {
    const shot = await lab.page.evaluate(renderLook, {
      sceneId: "storm",
      index,
      width,
      height,
      frames: 120,
      capture: false,
      pollHealth: false,
    });
    assert.equal(shot.glError, 0);
    assert.equal(shot.nonFinite, 0);
    const png = await lab.page.evaluate(() => {
      const { engine } = window.__phosphorLab;
      const c = document.createElement("canvas");
      c.width = engine.width;
      c.height = engine.height;
      c.getContext("2d").drawImage(engine.canvas, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    });
    await writeFile(resolve(out, `${name}.png`), Buffer.from(png, "base64"));
  }
  assert.deepEqual(lab.errors, []);
  await writeFile(
    resolve(out, "gpu-checks.json"),
    JSON.stringify({ rows, comparisons }, null, 2) + "\n",
  );
  console.log(
    `PASS: ${rows.length} late frames, 600 GPU/CPU segments, five cache differentials; stills in ${out}`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
