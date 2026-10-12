// Local native-GPU throughput probe. Synchronous GPU completion measures the
// whole frame, not display cadence; use family-timing.mjs for venue acceptance.
import { execFileSync } from "node:child_process";
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
const args = options({
  families: { type: "string" },
  reference: { type: "string" },
  presets: { type: "boolean", default: false },
  frames: { type: "string", default: "12" },
  width: { type: "string", default: "1920" },
  height: { type: "string", default: "1080" },
  budget: { type: "string", default: "16.67" },
  types: { type: "boolean", default: false },
});
const width = Number(args.width),
  height = Number(args.height),
  frames = Number(args.frames);
for (const [name, value] of Object.entries({ width, height, frames }))
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`${name} must be a positive integer`);
if (!Number.isFinite(Number(args.budget)) || Number(args.budget) <= 0)
  throw new Error("budget must be positive");
if (args.types && args.presets) throw new Error("Choose --types or --presets");
const out = await outputDirectory("performance", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const rows = [];
try {
  let reference = null,
    browser = runtime.browser;
  if (args.reference) {
    reference = execFileSync(
      "git",
      ["rev-parse", "--verify", `${args.reference}^{commit}`],
      { encoding: "utf8" },
    ).trim();
    const sources = new Map();
    // Route just scene modules; the same harness and engine measure both sides.
    browser = {
      newContext: async (options) => {
        const context = await runtime.browser.newContext(options);
        await context.route("**/scene-*.mjs", (route) => {
          const file = new URL(route.request().url()).pathname.slice(1);
          if (!sources.has(file))
            sources.set(
              file,
              execFileSync("git", ["show", `${reference}:${file}`], {
                encoding: "utf8",
              }),
            );
          return route.fulfill({
            contentType: "text/javascript",
            body: sources.get(file),
          });
        });
        return context;
      },
    };
  }
  const { page, errors } = await openLab(browser, server.url);
  await page.evaluate(async () => {
    const { engine, scenes } = window.__phosphorLab;
    for (const scene of scenes)
      if (!(await engine.ready(scene.id)))
        throw new Error(`Cannot compile ${scene.id}`);
  });
  const renderer = await page.evaluate(() => {
    const gl = window.__phosphorLab.engine.gl;
    return gl.getParameter(
      gl.getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ??
        gl.RENDERER,
    );
  });
  if (/swiftshader|llvmpipe|software/i.test(renderer))
    throw new Error(`Native GPU required: ${renderer}`);
  console.log(renderer);
  const looks = await page.evaluate(
    ({ families, types, presets }) =>
      window.__phosphorLab.scenes
        .filter((s) => !families || families.split(",").includes(s.id))
        .flatMap((s) =>
          (presets
            ? s.presets.map((_, i) => i)
            : types
              ? (s.type?.values ?? [null])
              : [null]
          ).map((value) => {
            const type = presets
              ? (s.presets[value].params[s.type?.key] ?? null)
              : value;
            const index = presets
              ? value
              : type === null
                ? 0
                : Math.max(
                    0,
                    s.presets.findIndex((p) => p.params[s.type.key] === type),
                  );
            return {
              sceneId: s.id,
              index,
              type,
              snapshot: (() => {
                const snapshot = window.__phosphorLab.presetSnapshot(s, index);
                if (type !== null) snapshot.params[s.type.key] = type;
                return snapshot;
              })(),
            };
          }),
        ),
    args,
  );
  if (!looks.length) throw new Error("No matching families");
  for (const look of looks) {
    const health = await page.evaluate(renderLook, {
      ...look,
      width,
      height,
      frames: 4,
      level: 0.95,
      capture: false,
    });
    if (health.glError || health.nonFinite || health.peak <= 0)
      throw new Error(`Invalid render: ${look.sceneId}:${look.index}`);
    const row = await page.evaluate(
      ({ frames }) => {
        const { engine, errors } = window.__phosphorLab;
        const gl = engine.gl;
        // Synchronous throughput excludes the asynchronous limiter approval.
        // Its presentation cadence is covered by the real Stage runner.
        engine.options.flashLimit = false;
        const samples = [],
          cpu = [];
        const pixel = new Uint8Array(4);
        const complete = () => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        };
        complete();
        for (let i = 0; i < frames + 3; i++) {
          const start = performance.now();
          engine.beat = (i + 0.5) / 30;
          engine.advance(1 / 60, false);
          const submitted = performance.now();
          complete();
          if (i >= 3) {
            samples.push(performance.now() - start);
            cpu.push(submitted - start);
          }
        }
        samples.sort((a, b) => a - b);
        cpu.sort((a, b) => a - b);
        return {
          p50: samples[Math.floor(samples.length * 0.5)],
          p95: samples[
            Math.min(samples.length - 1, Math.floor(samples.length * 0.95))
          ],
          cpuP50: cpu[Math.floor(cpu.length * 0.5)],
          glError: gl.getError(),
          gpuErrors: engine.counters.gpuErrors,
          nonFinite:
            engine.counters.nonFinite +
            (window.__harness?.nonFiniteUploads ?? 0),
          width: engine.width,
          height: engine.height,
          errors: [...errors],
        };
      },
      { frames },
    );
    rows.push({
      sceneId: look.sceneId,
      index: look.index,
      type: look.type,
      ...row,
    });
    console.log(JSON.stringify(rows.at(-1)));
  }
  const report = {
    reference,
    renderer,
    chrome: runtime.version,
    width,
    height,
    frames,
    kind: "native headless synchronous frame throughput including post; excludes asynchronous flash approval; not venue cadence",
    rows,
    errors,
  };
  await writeFile(
    resolve(out, "profile.json"),
    JSON.stringify(report, null, 2),
  );
  if (
    errors.length ||
    rows.some(
      (r) =>
        r.glError ||
        r.gpuErrors ||
        r.nonFinite ||
        r.errors.length ||
        r.p50 > Number(args.budget),
    )
  )
    process.exitCode = 1;
} finally {
  await runtime.stop();
  await server.close();
}
