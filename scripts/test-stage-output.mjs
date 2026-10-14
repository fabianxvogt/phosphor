// Actual popup lifecycle, Retina output, visual buffers and rendered preview.
import assert from "node:assert/strict";
import { serve, launch, options, ACTION_TIMEOUT } from "./browser-runtime.mjs";
import scenes from "../scenes.mjs";
import { initialShowSet } from "../show-set.mjs";
const fixture = initialShowSet(scenes);
const args = options({ "native-gpu": { type: "boolean", default: false } });
fixture.favorites = ["interference:0"];
fixture.autopilot.enabled = false;
fixture.options.pixelBudget = 0.5;
const server = await serve(".", 48117);
let runtime;
try {
  runtime = await launch({ rig: args["native-gpu"], headless: true });
  const context = await runtime.browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  context.setDefaultTimeout(ACTION_TIMEOUT);
  await context.addInitScript((set) => {
    localStorage.setItem("phosphor-preview-resolution", "480x270");
    localStorage.setItem("phosphor-set-v5", JSON.stringify(set));
    const display = Object.assign(new EventTarget(), {
      width: 1280,
      height: 800,
      devicePixelRatio: 2,
    });
    const details = Object.assign(new EventTarget(), {
      currentScreen: display,
      screens: [display],
    });
    window.__displayDetails = details;
    window.getScreenDetails = async () => details;
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (descriptor) =>
      descriptor.name === "window-management"
        ? Promise.resolve(
            Object.assign(new EventTarget(), { state: "granted" }),
          )
        : query(descriptor);
  }, fixture);
  const control = await context.newPage();
  const errors = [];
  control.on("pageerror", (e) => errors.push(e.message));
  // The "load" event also waits for every baked catalog image; the app is
  // ready once its module has run, which the next wait checks.
  await control.goto(server.url + "dist/", { waitUntil: "domcontentloaded" });
  await control.waitForFunction(
    () => document.getElementById("localPreview").width === 2560,
  );
  await control.locator('[data-setup-open="audio"]').click();
  await control.locator("#audioOff").click();
  await control.locator("#audioMute").check();
  await control.locator("#closeSetup").click();
  const [stage] = await Promise.all([
    context.waitForEvent("page"),
    control.locator("#openStage").click(),
  ]);
  stage.on("pageerror", (e) => errors.push(e.message));
  await stage.setViewportSize({ width: 800, height: 450 });
  await stage.waitForFunction(
    () => !!window.__phosphorStage?.engine.slots.length,
  );
  await stage.waitForFunction(() => window.__phosphorStage.audio.engine.muted);
  assert.equal(
    await stage.evaluate(() => window.__phosphorStage.audio.source),
    "off",
    "opening the stage preserves the local Off and Mute choices",
  );
  await stage.evaluate(() => {
    const { show } = window.__phosphorStage;
    show.autopilot.enabled = false;
    const set = structuredClone(show.set);
    set.options.pixelBudget = 0.5;
    const channel = new BroadcastChannel("phosphor-show");
    channel.postMessage({ type: "set", set });
    channel.close();
  });
  await stage.evaluate(() => dispatchEvent(new Event("resize")));
  assert.deepEqual(
    await stage.evaluate(() => {
      const { engine } = window.__phosphorStage;
      return [engine.width, engine.height];
    }),
    [1600, 900],
    "Stage uses every Retina pixel despite legacy budget",
  );
  // Lifecycle correctness does not require software shading at Retina size.
  await stage.setViewportSize({ width: 640, height: 360 });
  await stage.click("#start", { timeout: 60000 });
  await stage.setViewportSize({ width: 160, height: 90 });
  const before = await stage.evaluate(
    () => window.__phosphorStage.show.live?.clip.id,
  );
  await stage.keyboard.press("Escape");
  await stage.keyboard.press("Shift+Escape");
  assert.deepEqual(
    await stage.evaluate(() => ({
      blackout: window.__phosphorStage.engine.blackoutTarget,
      clip: window.__phosphorStage.show.live?.clip.id,
    })),
    { blackout: 0, clip: before },
  );
  assert.equal(stage.isClosed(), false);
  await control.keyboard.press("Escape");
  await control.waitForFunction(
    () => document.getElementById("blackout").ariaPressed === "false",
  );
  await stage.close();
  await control.waitForFunction(
    () =>
      document.getElementById("stagePill").textContent === "Stage closed" &&
      !document.getElementById("localPreview").hidden,
  );
  const capture = () => {
    const preview = document.getElementById("localPreview");
    const sample = document.createElement("canvas");
    sample.width = 32;
    sample.height = 18;
    const context = sample.getContext("2d");
    context.drawImage(preview, 0, 0, 32, 18);
    return Array.from(context.getImageData(0, 0, 32, 18).data);
  };
  let first = await control.evaluate(capture);
  assert.ok(
    first.some((value, i) => i % 4 !== 3 && value > 8),
    "native preview is nonblack",
  );
  await control.keyboard.press("Escape");
  await control.keyboard.press("Shift+Escape");
  await control.waitForFunction((first) => {
    const sample = document.createElement("canvas");
    sample.width = 32;
    sample.height = 18;
    const context = sample.getContext("2d");
    context.drawImage(document.getElementById("localPreview"), 0, 0, 32, 18);
    return context
      .getImageData(0, 0, 32, 18)
      .data.some((v, i) => i % 4 !== 3 && v !== first[i]);
  }, first);
  assert.deepEqual(
    await control.evaluate(() => {
      const canvas = document.getElementById("editorCanvas");
      const preview = document.getElementById("localPreview");
      return [canvas.width, canvas.height, preview.width, preview.height];
    }),
    [2560, 1600, 2560, 1600],
    "Preview restores native Retina dimensions, ignoring an old low-quality preference",
  );
  // Page zoom must not change physical monitor resolution when screen metadata is available.
  await control.evaluate(() => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 0.67,
    });
    dispatchEvent(new Event("resize"));
  });
  assert.equal(
    await control.evaluate(() => document.getElementById("localPreview").width),
    2560,
  );
  // A monitor change uses the new screen's own scale, independently of page zoom.
  await control.evaluate(() => {
    window.__displayDetails.currentScreen = {
      width: 1920,
      height: 1080,
      devicePixelRatio: 1,
    };
    window.__displayDetails.dispatchEvent(new Event("currentscreenchange"));
  });
  assert.deepEqual(
    await control.evaluate(() => {
      const canvas = document.getElementById("localPreview");
      return [canvas.width, canvas.height];
    }),
    [1920, 1080],
    "Preview follows the new monitor's native size",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS Retina/native Stage, Escape inert in both windows, close resumes nonblack animated preview, native preview buffers and display changes",
  );
  await context.close();
} finally {
  await runtime?.stop();
  await server.close();
}
