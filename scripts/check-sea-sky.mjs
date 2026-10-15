// Adjacent baseline/final GPU probes for the wave-5 sea/sky reworks.
// Alternating blocks reduce (but cannot remove) fleet GPU contention.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { options, outputDirectory, serve, launch, openLab } from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";
const args = options({
  reference: { type: "string", default: "deaaae1" },
  families: { type: "string", default: "abyss,tide,murmuration" },
});
const out = await outputDirectory("sea-sky-verification", args.out);
const reference = execFileSync("git", ["rev-parse", args.reference], { encoding: "utf8" }).trim();
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig, headless: true });
const sources = new Map();
const referenceBrowser = { newContext: async (options) => {
  const context = await runtime.browser.newContext(options);
  await context.route(/\/scene-(abyss|tide|murmuration)\.mjs$/, (route) => {
    const file = new URL(route.request().url()).pathname.slice(1);
    if (!sources.has(file)) sources.set(file, execFileSync("git", ["show", `${reference}:${file}`], { encoding: "utf8" }));
    return route.fulfill({ contentType: "text/javascript", body: sources.get(file) });
  });
  return context;
} };
try {
  const labs = { baseline: await openLab(referenceBrowser, server.url), final: await openLab(runtime.browser, server.url) };
  const renderer = await labs.final.page.evaluate(() => {
    const gl = window.__phosphorLab.engine.gl;
    return gl.getParameter(gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL);
  });
  assert.ok(!/swiftshader|software/i.test(renderer), renderer);
  const rows = [];
  for (const [width, height] of [[1920, 1080], [3840, 2160]])
    for (const sceneId of args.families.split(","))
      for (const index of [0, 1, 2]) {
        const samples = { baseline: [], final: [] };
        for (let block = 0; block < 4; block++)
          for (const label of block % 2 ? ["final", "baseline"] : ["baseline", "final"]) {
            const page = labs[label].page;
            const health = await page.evaluate(renderLook, { sceneId, index, width, height, frames: 4, level: .95, capture: false, pollHealth: false });
            assert.equal(health.glError, 0); assert.equal(health.nonFinite, 0);
            const timing = await page.evaluate(() => {
              const { engine } = window.__phosphorLab, gl = engine.gl;
              engine.options.flashLimit = false;
              const pixel = new Uint8Array(4), samples = [];
              for (let i = 0; i < 35; i++) {
                const start = performance.now();
                engine.beat = (i + .5) / 30;
                engine.advance(1 / 60, false);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                if (i >= 5) samples.push(performance.now() - start);
              }
              samples.sort((a, b) => a - b);
              return samples[15];
            });
            samples[label].push(timing);
          }
        const median = (a) => [...a].sort((x, y) => x - y).slice(1, 3).reduce((x, y) => x + y) / 2;
        const baseline = median(samples.baseline), final = median(samples.final);
        const row = { sceneId, index, width, height, baseline, final, ratio: final / baseline, samples };
        rows.push(row); console.log(JSON.stringify(row));
      }
  // Frozen-state subpixel camera dolly: this isolates raster/lighting
  // instability from real flock motion. Also retain ordinary moving scores.
  const flicker = [];
  for (const label of ["baseline", "final"])
    for (const index of [0, 1, 2, 6]) {
      const page = labs[label].page;
      await page.evaluate(renderLook, { sceneId: "murmuration", index, width: 1920, height: 1080, frames: 120, level: .5, capture: false, pollHealth: false });
      const metrics = await page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        const gl = engine.gl, slot = engine.slots.at(-1), snapshot = structuredClone(engine.active);
        const base = snapshot.params.distance;
        const scores = [];
        for (const moving of [false, true]) {
          const frames = [];
          for (let i = 0; i < 12; i++) {
            if (moving) engine.advance(1 / 60, false);
            else {
              const next = structuredClone(snapshot); next.params.distance = base + i * .0003;
              engine.setSnapshot(next); engine.drawSlot(slot, 0); engine.present();
            }
            const bytes = new Uint8Array(engine.width * engine.height * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.readPixels(0, 0, engine.width, engine.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            frames.push(bytes);
          }
          let second = 0, mean = 0, n = 0;
          const luma = (a, i) => .2126 * a[i] + .7152 * a[i + 1] + .0722 * a[i + 2];
          for (let f = 2; f < frames.length; f++)
            for (let i = 0; i < frames[f].length; i += 4) {
              const c = luma(frames[f], i), b = luma(frames[f - 1], i), a = luma(frames[f - 2], i);
              second += Math.abs(c - 2 * b + a); mean += c; n++;
            }
          scores.push({ moving, mean: mean / n, secondDifference: second / n });
        }
        return { scores, glError: gl.getError(), nonFinite: engine.counters.nonFinite };
      });
      assert.equal(metrics.glError, 0); assert.equal(metrics.nonFinite, 0);
      flicker.push({ label, index, ...metrics });
    }
  for (const lab of Object.values(labs)) assert.deepEqual(lab.errors, []);
  await writeFile(resolve(out, "comparison.json"), JSON.stringify({ reference, renderer, rows, flicker }, null, 2));
  console.log(JSON.stringify({ flicker }));
} finally {
  await runtime.stop(); await server.close();
}
