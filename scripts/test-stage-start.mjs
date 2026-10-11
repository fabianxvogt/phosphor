// Browser integrations may leave optional fullscreen/keyboard/wake requests pending.
// A start click must still dismiss the gate and start the visual output.
import assert from "node:assert/strict";
import { serve, launch, options } from "./browser-runtime.mjs";

const args = options({ "native-gpu": { type: "boolean", default: false } });
const server = await serve(".", 48127);
let runtime;
try {
  runtime = await launch({ rig: args["native-gpu"], headless: true });
  for (const mode of [
    "fullscreen",
    "keyboard",
    "wake",
    "rejected",
    "unavailable",
    "Enter",
    "Space",
    "icon",
  ]) {
    const context = await runtime.browser.newContext({
      viewport: { width: 640, height: 360 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      const pending = () => new Promise(() => {});
      const denied = () => Promise.reject(new Error("Fullscreen unavailable"));
      window.fullscreenRequests = 0;
      Element.prototype.requestFullscreen =
        mode === "unavailable"
          ? undefined
          : mode === "fullscreen"
            ? pending
            : mode === "rejected"
              ? denied
              : async () => {
                  window.fullscreenRequests++;
                };
      Object.defineProperty(navigator, "keyboard", {
        configurable: true,
        value: { lock: mode === "keyboard" ? pending : async () => {} },
      });
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: {
          request: mode === "wake" ? pending : async () => ({ release() {} }),
        },
      });
      window.getScreenDetails = undefined;
    }, mode);
    await page.goto(server.url + "stage.html");
    await page.waitForFunction(() => !!window.__phosphorStage);
    if (mode === "Enter" || mode === "Space") {
      await page.locator("#start").focus();
      await page.keyboard.press(mode);
    } else if (mode === "icon") await page.locator("#start svg").click();
    else await page.locator("#start").click();
    await page.waitForFunction(
      () => document.getElementById("overlay").hidden,
      null,
      { timeout: 2000 },
    );
    assert.deepEqual(errors, [], mode);
    if (["Enter", "Space", "icon"].includes(mode))
      assert.equal(await page.evaluate(() => window.fullscreenRequests), 1);
    console.log(`PASS Stage starts with ${mode} browser request`);
    await context.close();
  }
} finally {
  await runtime?.stop();
  await server.close();
}
