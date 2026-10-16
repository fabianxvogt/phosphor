// Native-GPU checks with the shared flash limiter left enabled.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-mycelium.mjs --rig --port 48460
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { renderLook } from "../tests/browser/client.mjs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";

const args = options({ pair: { type: "boolean", default: false } });
assert.ok(args.rig && process.env.PHOSPHOR_HEADLESS_RIG === "1");
const out = await outputDirectory("mycelium-verify", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true });
const rows = [];
try {
  if (args.pair) {
    // The shared probe does not route *-geometry.mjs. Route BOTH owned
    // sources so main's 60-cap mesh isn't accidentally measured with r4's
    // 100-cap topology and modified clearance/cord radius.
    const reference = execFileSync("git", ["rev-parse", "main"], {
      encoding: "utf8",
    }).trim();
    const baseline = {
      newContext: async (options) => {
        const context = await runtime.browser.newContext(options);
        await context.route(
          /\/(scene-mycelium|mycelium-geometry)\.mjs$/,
          (route) => {
            const file = new URL(route.request().url()).pathname.slice(1);
            return route.fulfill({
              contentType: "text/javascript",
              body: execFileSync("git", ["show", `${reference}:${file}`], {
                encoding: "utf8",
              }),
            });
          },
        );
        return context;
      },
    };
    const labs = [
      await openLab(baseline, server.url),
      await openLab(runtime.browser, server.url),
    ];
    for (const [width, height] of [
      [1920, 1080],
      [3840, 2160],
    ]) {
      for (let index = 0; index < 3; index++) {
        for (const lab of labs) {
          const health = await lab.page.evaluate(renderLook, {
            sceneId: "mycelium",
            index,
            level: 0.95,
            width,
            height,
            frames: 8,
            capture: false,
            pollHealth: false,
          });
          assert.equal(health.glError + health.nonFinite, 0);
          assert.ok(health.peak > 0);
        }
        const samples = [[], []];
        for (const candidate of [0, 1, 1, 0, 1, 0, 0, 1]) {
          samples[candidate].push(
            ...(await labs[candidate].page.evaluate(() => {
              const { engine } = window.__phosphorLab,
                gl = engine.gl;
              const pixel = new Uint8Array(4),
                samples = [];
              for (let i = 0; i < 19; i++) {
                const start = performance.now();
                engine.beat = (engine.renderTick + 0.5) / 30;
                engine.advance(1 / 60, false);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                if (i >= 3) samples.push(performance.now() - start);
              }
              if (
                gl.getError() ||
                engine.counters.gpuErrors ||
                engine.counters.nonFinite ||
                window.__harness.nonFiniteUploads
              )
                throw new Error("GPU health");
              return samples;
            })),
          );
        }
        const stats = (values) => {
          const sorted = [...values].sort((a, b) => a - b);
          return { p50: sorted[32], p95: sorted[60] };
        };
        const [before, after] = samples.map(stats);
        const row = {
          reference,
          width,
          height,
          index,
          before,
          after,
          ratio: after.p50 / before.p50,
        };
        rows.push(row);
        console.log(JSON.stringify(row));
      }
    }
    for (const lab of labs) assert.deepEqual(lab.errors, []);
  } else {
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
          if (!(await engine.ready(scene.id)))
            throw new Error("shader compile");
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
  }
} finally {
  await writeFile(
    join(out, "verification.json"),
    JSON.stringify(rows, null, 2) + "\n",
  );
  await runtime.stop();
  await server.close();
}
