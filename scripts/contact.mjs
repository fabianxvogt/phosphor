import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  stat,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";
import {
  options,
  outputDirectory,
  serve,
  launch,
  newInstrument,
  pauseForCapture,
  presets,
  root,
} from "./browser-runtime.mjs";
import { renderPreset } from "../tests/browser/client.mjs";
import { imageMetrics } from "../tests/browser/metrics.mjs";

const args = options({
  before: { type: "string" },
  after: { type: "string" },
  seed: { type: "string", default: "48113" },
  frames: { type: "string", default: "120" },
});
if (!!args.before !== !!args.after)
  throw new Error(
    "Use both --before and --after (git refs or dist directories)",
  );
const seed = Number(args.seed),
  frames = Number(args.frames);
if (
  !Number.isInteger(seed) ||
  seed < 0 ||
  seed > 2147483647 ||
  !Number.isInteger(frames) ||
  frames < 1
)
  throw new Error("Seed and frames must be positive bounded integers");
const out = await outputDirectory("contact", args.out);
const temporary = [];
const escape = (text) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function sourceDirectory(source) {
  try {
    if ((await stat(resolve(root, source))).isDirectory())
      return resolve(root, source);
  } catch {}
  const commit = execFileSync(
    "git",
    ["rev-parse", "--verify", `${source}^{commit}`],
    { cwd: root, encoding: "utf8" },
  ).trim();
  const directory = await mkdtemp(resolve(tmpdir(), "phosphor-contact-"));
  temporary.push(directory);
  const paths = execFileSync("git", ["ls-tree", "-r", "--name-only", commit], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(
      (path) =>
        /^[^/]+\.(html|css|js|mjs)$/.test(path) ||
        ["scripts/build.mjs", ".openai/hosting.json", ".vercelignore"].includes(
          path,
        ),
    );
  for (const path of paths) {
    await mkdir(dirname(resolve(directory, path)), { recursive: true });
    await writeFile(
      resolve(directory, path),
      execFileSync("git", ["show", `${commit}:${path}`], { cwd: root }),
    );
  }
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    cwd: directory,
    stdio: "inherit",
  });
  return resolve(directory, "dist");
}
async function sheet(browser, directory, name, rows) {
  const images = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      data: (await readFile(resolve(directory, row.file))).toString("base64"),
    })),
  );
  const style =
    "body{margin:0;background:#000;color:#fff;font:16px sans-serif}.grid{display:grid;grid-template-columns:repeat(4,640px)}figure{margin:0;width:640px}img{display:block;width:640px;height:360px}figcaption{height:24px;padding:4px 8px;box-sizing:border-box;white-space:nowrap;overflow:hidden}";
  const markup = (inline) =>
    `<!doctype html><meta charset="utf-8"><title>${escape(name)}</title><style>${style}</style><div class="grid">${images.map((row) => `<figure><img src="${inline ? "data:image/png;base64," + row.data : row.file}"><figcaption>${escape(row.sceneName + " / " + row.name)}</figcaption></figure>`).join("")}</div>`;
  await writeFile(resolve(directory, `${name}.html`), markup(false));
  const page = await browser.newPage({
    viewport: { width: 2560, height: 900 },
    deviceScaleFactor: 1,
  });
  try {
    await page.setContent(markup(true));
    await page.evaluate(() =>
      Promise.all([...document.images].map((image) => image.decode())),
    );
    await page.screenshot({
      path: resolve(directory, `${name}.png`),
      fullPage: true,
    });
  } finally {
    await page.close();
  }
}
async function capture(dist, directory, source) {
  await mkdir(directory, { recursive: true });
  const server = await serve(dist, args.port);
  let runtime;
  try {
    runtime = await launch();
    const { page, errors } = await newInstrument(runtime.browser, server.url);
    await pauseForCapture(page);
    const looks = await presets(page),
      rows = [];
    for (const look of looks) {
      const result = await page.evaluate(renderPreset, {
        ...look,
        seed,
        frames,
      });
      assert.equal(result.glError, 0, `${look.name}: WebGL error`);
      assert.equal(result.nonFinite, 0, `${look.name}: non-finite input`);
      const file = `${look.sceneId}-${String(look.index + 1).padStart(2, "0")}.png`;
      await writeFile(
        resolve(directory, file),
        Buffer.from(result.png, "base64"),
      );
      const row = {
        ...look,
        file,
        seed,
        framesAfterPreparation: frames,
        timeAfterPreparationSeconds: frames / 60,
        width: result.width,
        height: result.height,
        ...imageMetrics(result.rgba, result.width, result.height),
      };
      rows.push(row);
    }
    assert.deepEqual(errors, []);
    await sheet(runtime.browser, directory, "all-presets", rows);
    for (const family of new Set(rows.map((row) => row.sceneId)))
      await sheet(
        runtime.browser,
        directory,
        family,
        rows.filter((row) => row.sceneId === family),
      );
    const metrics = {
      source,
      browser: runtime.version,
      gpu: "software ANGLE SwiftShader",
      classification:
        "EMPIRICAL art-bible proxies; not owner aesthetic approval",
      definitions: {
        luminance: "linear-light Rec.709, 0..1",
        saturation: "HSV, 0..1",
        edgeDensity:
          "fraction of horizontal/vertical luminance differences > .08",
        lowSaturationMidGreyPercent:
          "HSV saturation < .15, linear luminance .05.. .6",
        time: "120 warm-up simulation ticks where applicable, then explicit 1/60s advances; app clock held",
      },
      presets: rows,
    };
    await writeFile(
      resolve(directory, "metrics.json"),
      JSON.stringify(metrics, null, 2),
    );
    console.log(
      `PASS ${rows.length} contacts: ${resolve(directory, "all-presets.png")}`,
    );
    console.log(`Metrics sample: ${JSON.stringify(rows[0])}`);
    return rows;
  } finally {
    await runtime?.stop();
    await server.close();
  }
}
try {
  if (args.before) {
    const before = await capture(
      await sourceDirectory(args.before),
      resolve(out, "before"),
      args.before,
    );
    const after = await capture(
      await sourceDirectory(args.after),
      resolve(out, "after"),
      args.after,
    );
    const keys = [
      "blackFloorP2Luminance",
      "meanLuminance",
      "meanSaturation",
      "edgeDensity",
      "lowSaturationMidGreyPercent",
    ];
    const comparisons = after.map((row) => {
      const previous = before.find(
        (candidate) =>
          candidate.sceneId === row.sceneId && candidate.name === row.name,
      );
      return {
        sceneId: row.sceneId,
        name: row.name,
        status: previous ? "matched" : "added",
        deltaAfterMinusBefore: previous
          ? Object.fromEntries(
              keys.map((key) => [key, row[key] - previous[key]]),
            )
          : null,
      };
    });
    for (const row of before)
      if (
        !after.some(
          (candidate) =>
            candidate.sceneId === row.sceneId && candidate.name === row.name,
        )
      )
        comparisons.push({
          sceneId: row.sceneId,
          name: row.name,
          status: "removed",
          deltaAfterMinusBefore: null,
        });
    await writeFile(
      resolve(out, "comparison.json"),
      JSON.stringify(
        { before: args.before, after: args.after, seed, frames, comparisons },
        null,
        2,
      ),
    );
    await writeFile(
      resolve(out, "comparison.html"),
      `<!doctype html><meta charset="utf-8"><title>Before / after</title><style>body{background:#000;color:white}iframe{width:49%;height:90vh;border:0}</style><h1>Before / after (same seed and simulation time)</h1><iframe src="before/all-presets.html"></iframe><iframe src="after/all-presets.html"></iframe>`,
    );
  } else await capture(args.dist, out, args.dist);
} finally {
  for (const directory of temporary)
    await rm(directory, { recursive: true, force: true });
}
