// Actual popup lifecycle, Retina output, visual buffers and rendered preview.
import assert from "node:assert/strict";
import { serve, launch } from "./browser-runtime.mjs";
import scenes from "../scenes.mjs";
import { initialShowSet } from "../show-set.mjs";
const fixture = initialShowSet(scenes);
fixture.favorites = ["interference:0"];
fixture.autopilot.enabled = false;
fixture.options.pixelBudget = 0.5;
const server = await serve(".", 48117);
let runtime;
try {
  runtime = await launch();
  const context = await runtime.browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  await context.addInitScript((set) => {
    localStorage.setItem("phosphor-preview-resolution", "480x270");
    localStorage.setItem("phosphor-set-v5", JSON.stringify(set));
  }, fixture);
  const control = await context.newPage();
  const errors = [];
  control.on("pageerror", (e) => errors.push(e.message));
  await control.goto(server.url + "dist/");
  await control.waitForFunction(() =>
    document.getElementById("renderReadout").textContent.includes("480"),
  );
  const [stage] = await Promise.all([
    context.waitForEvent("page"),
    control.locator("#openStage").click(),
  ]);
  stage.on("pageerror", (e) => errors.push(e.message));
  await stage.setViewportSize({ width: 800, height: 450 });
  await stage.waitForFunction(
    () => !!window.__phosphorStage?.engine.slots.length,
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
  await stage.setViewportSize({ width: 160, height: 90 });
  await stage.click("#start", { timeout: 60000 });
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
      document.getElementById("stagePill").textContent === "Stage not open" &&
      !document.getElementById("localPreview").hidden,
  );
  await control.waitForFunction(() => {
    const canvas = document.getElementById("localPreview");
    const pixels = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, i) => i % 4 !== 3 && value > 8);
  });
  const capture = () => {
    const canvas = document.getElementById("localPreview");
    return Array.from(
      canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
        .data,
    );
  };
  const first = await control.evaluate(capture);
  await control.keyboard.press("Escape");
  await control.keyboard.press("Shift+Escape");
  await control.waitForFunction((first) => {
    const canvas = document.getElementById("localPreview");
    const pixels = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((v, i) => i % 4 !== 3 && v !== first[i]);
  }, first);
  // Assert full-sized buffers without an expensive software rendering loop.
  await control.selectOption("#previewResolution", "1920x1080");
  assert.deepEqual(
    await control.evaluate(() => {
      const canvas = document.getElementById("editorCanvas");
      const preview = document.getElementById("localPreview");
      return [canvas.width, canvas.height, preview.width, preview.height];
    }),
    [1920, 1080, 1920, 1080],
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS Retina/native Stage, Escape inert in both windows, close resumes nonblack animated preview, Full HD preview buffers",
  );
  await context.close();
} finally {
  await runtime?.stop();
  await server.close();
}
