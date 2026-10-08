// D63: time real Escape input against captured compositor pixels, not uniforms.
// Screen capture still cannot measure the panel or downstream LED processor.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  deadline,
} from "./browser-runtime.mjs";

const args = options({
  trials: { type: "string", default: "20" },
  screen: { type: "string", default: "0" },
});
const trials = Number(args.trials);
const screenIndex = Number(args.screen);
if (!Number.isInteger(trials) || trials < 1 || trials > 1000)
  throw new Error("--trials must be an integer from 1 to 1000");
if (!Number.isInteger(screenIndex) || screenIndex < 0)
  throw new Error("--screen must be a zero-based non-negative integer");
const flags = [
  `--auto-select-desktop-capture-source=Screen ${screenIndex + 1}`,
  "--use-fake-ui-for-media-stream",
  "--allow-http-screen-capture",
  "--window-size=1200,800",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
];
const blackThreshold = 1 / 255;
const brightThreshold = 3 / 255;
const permissionHelp =
  "On macOS open System Settings > Privacy & Security > Screen & System Audio Recording (Screen Recording on older versions), enable Google Chrome, then fully quit and relaunch Chrome and rerun. Chrome flags cannot bypass this OS permission. If Chrome is absent, open Chrome and share a screen once to trigger the OS request.";
const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)];
};
const stats = (values) => ({
  median: quantile(values, 0.5),
  p95: quantile(values, 0.95),
  max: Math.max(...values),
});
let server, runtime, capture, summary;
const pageErrors = [];
const out = await outputDirectory("blackout", args.out);
try {
  try {
    server = await serve(args.dist, args.port);
  } catch (error) {
    throw new Error(
      `Cannot serve ${args.dist}: ${error.message}. Run npm run build first, or select a built app with --dist <directory>.`,
    );
  }
  // Even the non-rig smoke needs a real desktop: headless capture is not output.
  runtime = await launch({ rig: args.rig, headless: false, args: flags });
  // The app worker must not intercept the harness-only capture document.
  const context = await runtime.browser.newContext({
    viewport: null,
    serviceWorkers: "block",
  });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(30000);
  const control = await context.newPage();
  control.on("pageerror", (error) =>
    pageErrors.push(`control: ${error.message}`),
  );
  // Playwright's permission aliases do not include Chrome window-management.
  const controlCdp = await context.newCDPSession(control);
  const { targetInfo } = await controlCdp.send("Target.getTargetInfo");
  for (const name of ["window-management", "keyboard-lock"])
    await controlCdp.send("Browser.setPermission", {
      permission: { name },
      setting: "granted",
      origin: server.url,
      browserContextId: targetInfo.browserContextId,
    });
  await control.goto(server.url);
  await control.bringToFront();
  try {
    await control.waitForFunction(
      () =>
        !!window.__phosphorControl &&
        typeof document.getElementById("openStage")?.onclick === "function",
      null,
      { polling: 100, timeout: 60000 },
    );
  } catch (error) {
    throw new Error(
      `Built control page did not initialize: ${error.message}. ${pageErrors.join("; ")} Rebuild with npm run build and check that Chrome can create WebGL2 contexts.`,
    );
  }
  const screens = await control.evaluate(async () => {
    const details = await window.getScreenDetails();
    return details.screens.map((s) => ({
      label: s.label,
      left: s.left,
      top: s.top,
      width: s.width,
      height: s.height,
      isInternal: s.isInternal,
    }));
  });
  console.log("Screens (zero-based):", JSON.stringify(screens));
  const screen = screens[screenIndex];
  if (!screen)
    throw new Error(
      `--screen ${screenIndex} does not exist; choose 0–${screens.length - 1}.`,
    );
  if (args.rig && screen.isInternal)
    throw new Error(
      "--rig requires an external output. Select its index with --screen <index>; omit --rig for the built-in-display smoke.",
    );
  let stage;
  try {
    [stage] = await Promise.all([
      context.waitForEvent("page"),
      control.click("#openStage", { noWaitAfter: true, force: true }),
    ]);
  } catch (error) {
    throw new Error(
      `Control could not open the stage popup: ${error.message}. ${pageErrors.join("; ")} Allow popups for ${server.url} and retry with no other Chrome render harness running.`,
    );
  }
  stage.on("pageerror", (error) => pageErrors.push(`stage: ${error.message}`));
  await stage.waitForFunction(() => !!window.__phosphorStage, null, {
    polling: 100,
    timeout: 60000,
  });
  const cdp = await context.newCDPSession(stage);
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: { windowState: "normal" },
  });
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: {
      left: screen.left,
      top: screen.top,
      width: screen.width,
      height: screen.height,
    },
  });
  console.log(
    `Starting fullscreen stage on screen ${screenIndex} (${screen.label})`,
  );
  try {
    await stage.bringToFront();
    await stage.click("#start", { noWaitAfter: true, force: true });
    await stage.waitForFunction(() => !!document.fullscreenElement, null, {
      polling: 100,
    });
    await stage.waitForFunction(
      async (index) => {
        const details = await window.getScreenDetails();
        return details.currentScreen === details.screens[index];
      },
      screenIndex,
      { polling: 100 },
    );
  } catch (error) {
    throw new Error(
      `Stage could not enter fullscreen on --screen ${screenIndex}: ${error.message}. Allow Chrome window-management/fullscreen permissions and ensure the chosen display is connected, unlocked and available to this desktop session.`,
    );
  }
  const renderer = await stage.evaluate(() => {
    const gl = window.__phosphorStage.engine.gl;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
  });
  if (args.rig && /swiftshader|llvmpipe|software/i.test(renderer))
    throw new Error(`--rig requires the real GPU, got ${renderer}`);
  if (await stage.evaluate(() => window.__phosphorStage.show.autopilot.enabled))
    await stage.keyboard.press("KeyP");
  await stage.evaluate(() => {
    window.__blackoutKeys = [];
    addEventListener(
      "keydown",
      (event) => {
        if (event.code === "Escape" && !event.repeat)
          window.__blackoutKeys.push(
            performance.timeOrigin + performance.now(),
          );
      },
      { capture: true },
    );
    const square = document.createElement("div");
    square.id = "captureCalibration";
    square.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:white;pointer-events:none";
    document.documentElement.append(square);
  });

  capture = await context.newPage();
  console.log(
    "Requesting entire-screen capture (macOS recording permission required)",
  );
  // Serve a separate secure-origin capture document, never a second app engine.
  const captureUrl = server.url + "__blackout-capture.html";
  await capture.route(captureUrl, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><title>Output capture</title><button id="capture">Capture output screen</button>',
    }),
  );
  await capture.goto(captureUrl);
  await capture.evaluate(() => {
    window.__captureFrames = [];
    document.getElementById("capture").onclick = () => {
      window.__captureReady = (async () => {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            frameRate: { ideal: 120, max: 120 },
          },
          audio: false,
        });
        window.__captureStream = stream;
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        if (settings.displaySurface !== "monitor")
          throw new Error(
            `Selected ${settings.displaySurface}, not a screen. Select the entire stage screen; window/tab capture is not compositor-output evidence.`,
          );
        const canvas = new OffscreenCanvas(160, 90);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const sample = (image, sourceTimestamp, receivedAt) => {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const pixels = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          let sum = 0;
          for (let i = 0; i < pixels.length; i += 4)
            sum +=
              0.2126 * pixels[i] +
              0.7152 * pixels[i + 1] +
              0.0722 * pixels[i + 2];
          window.__captureFrames.push({
            at: receivedAt,
            sourceTimestamp,
            luminance: sum / ((pixels.length / 4) * 255),
          });
          if (window.__captureFrames.length > 5000)
            window.__captureFrames.shift();
        };
        track.onended = () => {
          window.__captureError =
            "Screen capture ended; do not stop sharing during the measurement.";
        };
        let method;
        if (typeof MediaStreamTrackProcessor !== "undefined") {
          method = "MediaStreamTrackProcessor";
          const reader = new MediaStreamTrackProcessor({
            track,
          }).readable.getReader();
          window.__captureReader = reader;
          (async () => {
            while (true) {
              const { value: frame, done } = await reader.read();
              if (done) break;
              const receivedAt = performance.timeOrigin + performance.now();
              try {
                sample(frame, frame.timestamp / 1000, receivedAt);
              } finally {
                frame.close();
              }
            }
          })().catch((error) => {
            window.__captureError = error.message;
          });
        } else {
          method = "requestVideoFrameCallback";
          const video = document.createElement("video");
          video.muted = true;
          video.srcObject = stream;
          document.body.append(video);
          await video.play();
          const frame = (_, metadata) => {
            try {
              sample(
                video,
                metadata.mediaTime * 1000,
                performance.timeOrigin + performance.now(),
              );
              video.requestVideoFrameCallback(frame);
            } catch (error) {
              window.__captureError = error.message;
            }
          };
          video.requestVideoFrameCallback(frame);
        }
        return { method, settings, label: track.label };
      })();
      // Rejection is read over Playwright below, not an unhandled page error.
      window.__captureReady.catch(() => {});
    };
  });
  await capture.bringToFront();
  await capture.click("#capture");
  let captureInfo;
  try {
    captureInfo = await deadline(
      capture.evaluate(() => window.__captureReady),
      30000,
      "Screen capture permission/picker",
    );
  } catch (error) {
    throw new Error(
      `Screen capture could not start: ${error.message}. ${permissionHelp} If the Chrome screen picker remains open, select the entire screen showing the stage (screen index ${screenIndex}); no fake video source is used.`,
    );
  }
  await stage.bringToFront();
  // A capture of another screen must not produce a plausible latency result.
  const waitFrame = async (after, low, timeout = 5000) => {
    const handle = await capture.waitForFunction(
      ({ after, low, black, bright }) => {
        if (window.__captureError) throw new Error(window.__captureError);
        return window.__captureFrames.find(
          (f) =>
            f.at >= after &&
            (low ? f.luminance <= black : f.luminance >= bright),
        );
      },
      { after, low, black: blackThreshold, bright: brightThreshold },
      { polling: 10, timeout },
    );
    const frame = await handle.jsonValue();
    await handle.dispose();
    return frame;
  };
  const toggleSquare = (white) =>
    stage.evaluate((white) => {
      document.getElementById("captureCalibration").style.background = white
        ? "white"
        : "black";
      return performance.timeOrigin + performance.now();
    }, white);
  const calibration = [];
  try {
    for (let i = 0; i < 10; i++) {
      const whiteAt = await toggleSquare(true);
      const white = await waitFrame(whiteAt, false);
      if (white.luminance < 0.95)
        throw new Error(
          `White screen calibration was only ${white.luminance.toFixed(4)}; the stage does not cover the captured screen.`,
        );
      const at = await toggleSquare(false);
      const frame = await waitFrame(at, true);
      calibration.push({
        trial: i + 1,
        mutationAt: at,
        capturedAt: frame.at,
        latencyMs: frame.at - at,
      });
    }
  } catch (error) {
    throw new Error(
      `Capture calibration failed: ${error.message}. Ensure --screen ${screenIndex} is the stage screen and no other window covers it. ${permissionHelp}`,
    );
  }
  const displayIntervals = await deadline(
    stage.evaluate(
      () =>
        new Promise((done) => {
          const intervals = [];
          let previous;
          function frame(at) {
            if (previous !== undefined) intervals.push(at - previous);
            previous = at;
            if (intervals.length === 120) done(intervals);
            else requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }),
    ),
    10000,
    "Display refresh sampling; keep the fullscreen stage visible and the display awake",
  );
  const displayIntervalMs = quantile(displayIntervals, 0.5);
  const calibrationStats = stats(calibration.map((t) => t.latencyMs));
  // Calibrated maximum includes DOM/compositor scheduling and capture delivery.
  // It is deliberately explicit and is NEVER silently subtracted from trials.
  const allowanceMs = calibrationStats.max;
  const limitMs = 2 * displayIntervalMs + allowanceMs;
  await stage.evaluate(() =>
    document.getElementById("captureCalibration").remove(),
  );
  const results = [];
  const escape = async () => {
    const count = await stage.evaluate(() => window.__blackoutKeys.length);
    await stage.keyboard.press("Escape");
    const at = await stage.evaluate(
      (count) => window.__blackoutKeys[count],
      count,
    );
    if (!Number.isFinite(at))
      throw new Error(
        "Escape did not reach the stage keydown handler; focus the fullscreen stage and enable keyboard-lock permission.",
      );
    if (!(await stage.evaluate(() => !!document.fullscreenElement)))
      throw new Error(
        "Escape exited fullscreen: allow Chrome's keyboard-lock permission for this localhost origin, then rerun. Windowed results cannot pass the output gate.",
      );
    return at;
  };
  for (let i = 0; i < trials; i++) {
    const baselineAt = await stage.evaluate(
      () => performance.timeOrigin + performance.now(),
    );
    await waitFrame(baselineAt, false);
    // Reject a naturally black look before testing, rather than counting it as blackout.
    await capture.waitForTimeout(250);
    const baseline = await capture.evaluate(
      (after) => window.__captureFrames.filter((f) => f.at >= after),
      baselineAt,
    );
    if (
      baseline.length < 3 ||
      baseline.some((f) => f.luminance <= blackThreshold)
    )
      throw new Error(
        "The live look or capture is already black/intermittently black; no valid blackout edge. Check capture permission/selected screen and use a continuously lit look before rerunning.",
      );
    const keypressAt = await escape();
    const black = await waitFrame(keypressAt, true);
    const latencyMs = black.at - keypressAt;
    const trial = {
      trial: i + 1,
      keypressAt,
      capturedAt: black.at,
      sourceTimestamp: black.sourceTimestamp,
      luminance: black.luminance,
      latencyMs,
      displayFrames: latencyMs / displayIntervalMs,
      pass: latencyMs <= limitMs,
    };
    results.push(trial);
    console.log(
      `Trial ${trial.trial}: ${latencyMs.toFixed(2)} ms / ${trial.displayFrames.toFixed(2)} display frames ${trial.pass ? "PASS" : "FAIL"}`,
    );
    await escape();
    await waitFrame(
      await stage.evaluate(() => performance.timeOrigin + performance.now()),
      false,
    );
  }
  const frames = await capture.evaluate(() => window.__captureFrames);
  const captureIntervals = frames
    .slice(1)
    .map((f, i) => f.sourceTimestamp - frames[i].sourceTimestamp)
    .filter((ms) => ms > 0);
  const latency = stats(results.map((t) => t.latencyMs));
  summary = {
    verdict: latency.max <= limitMs ? "PASS" : "FAIL",
    method:
      "Escape stage keydown to first delivered captured screen frame below mean encoded Rec.709 luminance threshold; common performance.timeOrigin + performance.now clock, no latency subtraction",
    scope:
      "Compositor output only; excludes physical panel/LED processing. A phone slow-motion cross-check is still required by D63.",
    rig: args.rig,
    browser: runtime.version,
    renderer,
    flags,
    screenIndex,
    screen,
    capture: captureInfo,
    threshold: blackThreshold,
    displayIntervalMs,
    displayIntervals: stats(displayIntervals),
    captureIntervals: stats(captureIntervals),
    calibration: {
      method:
        "Fullscreen opaque DOM white-to-black mutation to captured black-frame delivery",
      trials: calibration,
      latencyMs: calibrationStats,
      allowanceMs,
    },
    limit: { displayFrames: 2, allowanceMs, totalMs: limitMs },
    latencyMs: latency,
    displayFrames: stats(results.map((t) => t.displayFrames)),
    trials: results,
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log(
    `${summary.verdict}: max ${latency.max.toFixed(2)} ms; limit 2 × ${displayIntervalMs.toFixed(2)} ms + explicit capture allowance ${allowanceMs.toFixed(2)} ms = ${limitMs.toFixed(2)} ms. Compositor only, not panel/LED processing.`,
  );
  if (summary.verdict !== "PASS") process.exitCode = 1;
} catch (error) {
  summary = {
    verdict: "BLOCKED",
    error: error.message,
    pageErrors,
    flags,
    rig: args.rig,
    screenIndex,
  };
  console.error(
    `BLOCKED: ${error.message}${pageErrors.length ? "\nPage errors: " + pageErrors.join("; ") : ""}`,
  );
  process.exitCode = 1;
} finally {
  await writeFile(
    resolve(out, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  if (capture && !capture.isClosed())
    await capture
      .evaluate(() => {
        window.__captureReader?.cancel().catch(() => {});
        window.__captureStream?.getTracks().forEach((track) => track.stop());
      })
      .catch(() => {});
  if (runtime) await runtime.stop();
  if (server) await server.close();
}
