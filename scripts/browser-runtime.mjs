import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { parseArgs } from "node:util";
import { chromium, firefox, webkit } from "playwright-core";
import { installProbes, attachFallback } from "../tests/browser/client.mjs";

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
export async function newInstrument(
  browser,
  url,
  { viewport = { width: 1440, height: 900 }, capability = false } = {},
) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  await context.addInitScript(installProbes);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(
    () => {
      const app = window.__phosphor;
      return (
        (app &&
          (app.ready === true ||
            (app.ready === undefined && app.engine && app.getSession))) ||
        !document.getElementById("fatal").hidden
      );
    },
    null,
    { timeout: 60000 },
  );
  if (await page.locator("#fatal").isVisible()) {
    const message = await page.locator("#fatal").textContent();
    if (capability && /WebGL2.*required|WebGL2.*support/i.test(message))
      return { context, page, errors, capabilityMessage: message };
    throw new Error(message);
  }
  const source = await page.evaluate(attachFallback);
  return { context, page, errors, source };
}
export async function pauseForCapture(page) {
  await page.locator("#autoQualityInput").uncheck();
  await page.locator("#autoRecoveryInput").uncheck();
  if (/Pause visuals/.test(await page.locator("#pauseButton").textContent()))
    await page.locator("#pauseButton").click();
  await page.waitForFunction(() =>
    /Resume/.test(document.getElementById("pauseButton").textContent),
  );
  await page.evaluate(() => window.__phosphor.engine.resize(640, 360));
}
export async function presets(page) {
  return page.evaluate(() =>
    window.__phosphor.scenes.flatMap((scene) =>
      scene.presets.map((preset, index) => ({
        sceneId: scene.id,
        sceneName: scene.name,
        index,
        name: preset.name,
      })),
    ),
  );
}
