// Paired native-GPU A/B throughput: one browser opens a reference page (the
// family's scene module from a Git revision) and a working-tree page; they
// alternate short timed bursts so shared-GPU load drift affects both alike.
// Whole frames include simulation and post-processing; not venue cadence.
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
  family: { type: "string", default: "cathedral" },
  reference: { type: "string", default: "HEAD" },
  width: { type: "string", default: "3840" },
  height: { type: "string", default: "2160" },
  bursts: { type: "string", default: "16" },
  burst: { type: "string", default: "4" },
  level: { type: "string", default: "0.95" },
});
const [width, height, bursts, burst] = [
  "width",
  "height",
  "bursts",
  "burst",
].map((key) => {
  const value = Number(args[key]);
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`${key} must be a positive integer`);
  return value;
});
const reference = execFileSync(
  "git",
  ["rev-parse", "--verify", `${args.reference}^{commit}`],
  { encoding: "utf8" },
).trim();
const file = `/scene-${args.family}.mjs`;
const referenceSource = execFileSync(
  "git",
  ["show", `${reference}:${file.slice(1)}`],
  { encoding: "utf8" },
);
const selected = `import s from '${file}'; export default [s];`;
const out = await outputDirectory("performance", args.out);
const server = await serve(".", args.port);
const runtime = await launch({
  rig: true,
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
  ],
});
const open = (useReference) =>
  openLab(
    {
      newContext: async (contextOptions) => {
        const context = await runtime.browser.newContext(contextOptions);
        await context.route("**/*.mjs", (route) => {
          const path = new URL(route.request().url()).pathname;
          if (path === "/scenes.mjs")
            return route.fulfill({
              contentType: "text/javascript",
              body: selected,
            });
          if (useReference && path === file)
            return route.fulfill({
              contentType: "text/javascript",
              body: referenceSource,
            });
          return route.continue();
        });
        return context;
      },
    },
    server.url,
  );
const rows = [];
try {
  const pages = {
    reference: await open(true),
    current: await open(false),
  };
  const types = await pages.current.page.evaluate(
    () => window.__phosphorLab.scenes[0].type?.values ?? [null],
  );
  for (const type of types) {
    for (const { page } of Object.values(pages)) {
      await page.bringToFront();
      const look = await page.evaluate((type) => {
        const { scenes, presetSnapshot } = window.__phosphorLab,
          scene = scenes[0];
        const index =
          type === null
            ? 0
            : Math.max(
                0,
                scene.presets.findIndex(
                  (p) => p.params[scene.type.key] === type,
                ),
              );
        const snapshot = presetSnapshot(scene, index);
        if (type !== null) snapshot.params[scene.type.key] = type;
        return { sceneId: scene.id, index, snapshot };
      }, type);
      await page.evaluate(renderLook, {
        ...look,
        width,
        height,
        frames: 4,
        level: Number(args.level),
        capture: false,
        pollHealth: false,
      });
    }
    const samples = { reference: [], current: [] };
    for (let b = 0; b < bursts; b++)
      for (const key of b % 2
        ? ["current", "reference"]
        : ["reference", "current"]) {
        const { page } = pages[key];
        await page.bringToFront();
        samples[key].push(
          ...(await page.evaluate((count) => {
            const { engine } = window.__phosphorLab,
              gl = engine.gl,
              pixel = new Uint8Array(4);
            engine.options.flashLimit = false;
            const complete = () => {
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            };
            complete();
            const times = [];
            for (let i = 0; i < count; i++) {
              const start = performance.now();
              engine.beat = (i + 0.5) / 30;
              engine.advance(1 / 60, false);
              complete();
              times.push(performance.now() - start);
            }
            return times;
          }, burst)),
        );
      }
    const stats = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      return { p50: sorted[Math.floor(sorted.length / 2)], min: sorted[0] };
    };
    const row = {
      type,
      reference: stats(samples.reference),
      current: stats(samples.current),
    };
    row.change = row.current.p50 / row.reference.p50 - 1;
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  for (const { errors } of Object.values(pages))
    if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(
    resolve(out, `alternate-${args.family}-${width}x${height}.json`),
    JSON.stringify(
      { reference, family: args.family, width, height, bursts, burst, rows },
      null,
      2,
    ),
  );
} finally {
  await runtime.stop();
  await server.close();
}
