// Interleaved baseline/final throughput to reduce fleet-contention bias.
// Standard profile-families probes are still required before/after a rework.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/profile-rework-pair.mjs --families magma --reference deaaae1 --port 48525
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { options, outputDirectory, serve, launch, openLab } from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";
const args = options({
  families: { type: "string" }, reference: { type: "string", default: "deaaae1" },
  width: { type: "string", default: "1920" }, height: { type: "string", default: "1080" },
});
if (!args.families) throw new Error("--families required");
const reference = execFileSync("git", ["rev-parse", `${args.reference}^{commit}`], { encoding: "utf8" }).trim();
const out = await outputDirectory("rework-pair", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const rows = [];
const sources = new Map();
const baselineBrowser = {
  newContext: async options => {
    const context = await runtime.browser.newContext(options);
    await context.route(/\/(scene-[^/]+|kinetic-model)\.mjs$/, route => {
      const file = new URL(route.request().url()).pathname.slice(1);
      if (!sources.has(file)) sources.set(file, execFileSync("git", ["show", `${reference}:${file}`], { encoding: "utf8" }));
      return route.fulfill({ contentType: "text/javascript", body: sources.get(file) });
    });
    return context;
  },
};
try {
  const labs = [await openLab(baselineBrowser, server.url), await openLab(runtime.browser, server.url)];
  const renderer = await labs[1].page.evaluate(() => {
    const gl = window.__phosphorLab.engine.gl;
    return gl.getParameter(gl.getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
  });
  if (/swiftshader|software|llvmpipe/i.test(renderer)) throw new Error(renderer);
  const looks = await labs[1].page.evaluate(families => window.__phosphorLab.scenes
    .filter(s => families.split(",").includes(s.id)).flatMap(s => s.type.values.map(type => ({
      sceneId: s.id, type, index: s.presets.findIndex(p => p.params[s.type.key] === type),
    }))), args.families);
  for (const look of looks) {
    const samples = [[], []];
    for (const lab of labs) {
      const health = await lab.page.evaluate(renderLook, {
        ...look, level: 0.95, width: Number(args.width), height: Number(args.height),
        frames: 8, capture: false, pollHealth: false,
      });
      if (health.glError || health.nonFinite || health.peak <= 0) throw new Error(JSON.stringify(health));
    }
    // ABBA blocks: both candidates see the same changing load, neither is
    // favoured by always running first. 64 measured frames per candidate.
    for (const candidate of [0, 1, 1, 0, 1, 0, 0, 1]) {
      const block = await labs[candidate].page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        engine.options.flashLimit = false;
        const gl = engine.gl, pixel = new Uint8Array(4), samples = [];
        const complete = () => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        };
        for (let i = 0; i < 19; i++) {
          const start = performance.now();
          engine.beat = (engine.renderTick + 0.5) / 30;
          engine.advance(1 / 60, false); complete();
          if (i >= 3) samples.push(performance.now() - start);
        }
        if (gl.getError() || engine.counters.gpuErrors || engine.counters.nonFinite || window.__harness.nonFiniteUploads)
          throw new Error("GPU health error");
        return samples;
      });
      samples[candidate].push(...block);
    }
    const stats = values => {
      const a = [...values].sort((x, y) => x - y);
      return { p50: a[Math.floor(a.length * 0.5)], p95: a[Math.floor(a.length * 0.95)] };
    };
    const baseline = stats(samples[0]), final = stats(samples[1]);
    const row = { ...look, baseline, final, ratio: final.p50 / baseline.p50, samples };
    rows.push(row);
    console.log(JSON.stringify({ ...row, samples: undefined }));
  }
  const errors = labs.flatMap(lab => lab.errors);
  await writeFile(resolve(out, "profile.json"), JSON.stringify({
    reference, renderer, width: Number(args.width), height: Number(args.height),
    kind: "interleaved ABBA native synchronous throughput including post; 64 frames/candidate; not venue cadence",
    rows, errors,
  }, null, 2) + "\n");
  if (errors.length || rows.some(r => r.ratio > 1.05)) process.exitCode = 1;
} finally {
  await runtime.stop(); await server.close();
}
