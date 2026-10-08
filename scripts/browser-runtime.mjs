import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { parseArgs } from "node:util";
import { chromium, firefox, webkit } from "playwright-core";
import { installProbes } from "../tests/browser/client.mjs";

export const root = resolve(new URL("..", import.meta.url).pathname);
export const artifactRoot = resolve(root, "artifacts");
export function options(extra = {}) {
  return parseArgs({
    options: {
      dist: { type: "string", default: "dist" },
      port: { type: "string", default: "48113" },
      out: { type: "string" },
      rig: { type: "boolean", default: false },
      ...extra,
    },
  }).values;
}
export async function outputDirectory(kind, requested) {
  const directory = resolve(requested ?? resolve(artifactRoot, kind));
  if (!directory.startsWith(artifactRoot + sep))
    throw new Error("Harness outputs must be under artifacts/");
  await mkdir(directory, { recursive: true });
  return directory;
}
export async function serve(dist, port) {
  const directory = resolve(root, dist);
  await stat(resolve(directory, "index.html"));
  if (Number(port) !== 48113) throw new Error("This lane owns port 48113 only");
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
  };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const path = resolve(directory, "." + decodeURIComponent(url.pathname));
      if (path !== directory && !path.startsWith(directory + sep)) {
        response.writeHead(403).end();
        return;
      }
      const file = (await stat(path)).isDirectory()
        ? resolve(path, "index.html")
        : path;
      response.writeHead(200, {
        "Content-Type": types[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(Number(port), "127.0.0.1", done);
  });
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () =>
      new Promise((done) => {
        server.close(done);
        server.closeAllConnections();
      }),
  };
}
export async function launch({ rig = false, browserName = "chromium" } = {}) {
  const type = { chromium, firefox, webkit }[browserName];
  const launchOptions = { headless: !rig };
  if (browserName === "chromium") {
    launchOptions.channel =
      rig || (!process.env.CI && process.platform === "darwin")
        ? "chrome"
        : "chromium";
    launchOptions.args = [
      "--autoplay-policy=no-user-gesture-required",
      "--enable-precise-memory-info",
    ];
    if (!rig)
      launchOptions.args.push(
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      );
  }
  // Optional override for machines whose Chromium build differs from
  // playwright-core's pinned revision (for example a preinstalled browser).
  if (process.env.PHOSPHOR_CHROME) {
    launchOptions.executablePath = process.env.PHOSPHOR_CHROME;
    delete launchOptions.channel;
  }
  const server = await type.launchServer(launchOptions);
  const browser = await type.connect(server.wsEndpoint());
  return {
    browser,
    version: browser.version(),
    stop: async () => {
      try {
        await deadline(server.close(), 3000, "browser shutdown");
      } catch {
        server.process().kill("SIGKILL");
      }
    },
  };
}
export function deadline(promise, milliseconds, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error(`${label} watchdog expired (${milliseconds}ms)`)),
        milliseconds,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}
// The repository root is served: the built app at /dist/ and the render
// lab at /tests/browser/lab.html.
export const APP = "dist/";
export const LAB = "tests/browser/lab.html";

function watch(page, name, errors) {
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  page.on("console", (message) => {
    // Browsers request /favicon.ico on their own; that 404 is not ours.
    if (
      message.type() === "error" &&
      !/favicon/.test(message.location()?.url ?? "")
    )
      errors.push(
        `${name} console: ${message.text()} ${message.location()?.url ?? ""}`,
      );
  });
}

// The render lab: one Engine on a canvas, no UI (tests/browser/lab.mjs).
export async function openLab(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(installProbes);
  const page = await context.newPage();
  const errors = [];
  watch(page, "lab", errors);
  await page.goto(url + LAB, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => !!window.__phosphorLab, null, {
    timeout: 60000,
  });
  return { context, page, errors };
}

// The show: control window plus the stage popup, started with one click.
export async function openShow(
  browser,
  url,
  {
    viewport = { width: 1440, height: 900 },
    stageViewport = { width: 320, height: 180 },
  } = {},
) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  await context.addInitScript(installProbes);
  const control = await context.newPage();
  const errors = [];
  watch(control, "control", errors);
  await control.goto(url + APP, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await control.waitForFunction(() => !!window.__phosphorControl, null, {
    timeout: 60000,
  });
  const [stage] = await Promise.all([
    context.waitForEvent("page", { timeout: 60000 }),
    control.click("#openStage", { noWaitAfter: true }),
  ]);
  watch(stage, "stage", errors);
  await stage.setViewportSize(stageViewport);
  await stage.waitForFunction(() => !!window.__phosphorStage, null, {
    timeout: 60000,
  });
  await stage.click("#start", { noWaitAfter: true, timeout: 60000 });
  await stage.waitForFunction(
    () => document.getElementById("overlay").hidden,
    null,
    { timeout: 60000 },
  );
  return { context, control, stage, errors };
}

export async function lookList(page) {
  return page.evaluate(() =>
    window.__phosphorLab.scenes.flatMap((scene) =>
      scene.presets.map((preset, index) => ({
        sceneId: scene.id,
        sceneName: scene.name,
        index,
        name: preset.name,
      })),
    ),
  );
}
