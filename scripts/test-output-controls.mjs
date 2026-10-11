// User tempo and resolution controls, with and without a separate Stage.
import assert from "node:assert/strict";
import { serve, launch, openShow, options } from "./browser-runtime.mjs";
const args = options({ "native-gpu": { type: "boolean", default: false } });
const server = await serve(".", 48132);
let runtime;
try {
  runtime = await launch({ rig: args["native-gpu"], headless: true });
  const { context, control, stage, errors } = await openShow(
    runtime.browser,
    server.url,
    { stageViewport: { width: 640, height: 360 } },
  );
  async function stageTempo(bpm) {
    await stage.waitForFunction((bpm) => {
      const { show, audio } = window.__phosphorStage;
      return (
        show.clock.at(performance.now() / 1000).bpm === bpm &&
        audio.engine.tempo === bpm &&
        audio.status().bpm === bpm
      );
    }, bpm);
    await control.waitForFunction(
      (bpm) => Number(document.getElementById("bpm").textContent) === bpm,
      bpm,
    );
  }
  await control.locator('[data-setup-open="audio"]').click();
  await control.locator("#manualBpm").fill("145");
  await control.locator("#manualBpm").press("Tab");
  await stageTempo(145);
  await control.locator("#closeSetup").click();
  await control.locator("#previewTempo").click();
  await control.locator("#quickBpm").fill("132.5");
  await control.locator("#quickBpm").press("Tab");
  await stageTempo(132.5);
  await control.locator("#tempoFaster").click();
  await stageTempo(133.5);
  await control.evaluate(() => {
    document.getElementById("tempoFaster").click();
    document.getElementById("tempoFaster").click();
  });
  await stageTempo(135.5);
  assert.equal(await control.locator("#manualBpm").inputValue(), "135.5");
  await control.locator('[aria-label="Close tempo settings"]').click();
  console.log(
    "PASS: full and compact BPM controls update visual, demo audio and both readouts",
  );

  await stage.setViewportSize({ width: 1280, height: 720 });
  await stage.waitForFunction(
    () => window.__phosphorStage.engine.width === 1280,
  );
  await control.locator("#previewResolution").click();
  assert.equal(
    await control.locator("#outputResolution").inputValue(),
    "native",
  );
  await control.locator("#outputResolution").selectOption("960");
  await stage.waitForFunction(
    () =>
      window.__phosphorStage.engine.width === 960 &&
      window.__phosphorStage.engine.height === 540,
  );
  await control.waitForFunction(() =>
    document
      .getElementById("previewResolution")
      .textContent.includes("960 × 540"),
  );
  await control.locator("#outputResolution").selectOption("native");
  await stage.waitForFunction(
    () => window.__phosphorStage.engine.width === 1280,
  );
  await control.locator('[aria-label="Close resolution settings"]').click();
  console.log(
    "PASS: Stage resolution is selectable, with native as default and live readout",
  );

  await stage.close();
  await control.waitForFunction(
    () => !document.getElementById("localPreview").hidden,
  );
  await control.locator("#previewTempo").click();
  await control.locator("#quickBpm").fill("154");
  await control.locator("#quickBpm").press("Tab");
  await control.waitForFunction(() => {
    const audio = window.__phosphorControl.demoAudio;
    return (
      audio.kind === "demo" &&
      audio.tempo === 154 &&
      audio.demoClock().bpm === 154 &&
      document.getElementById("audioPill").textContent.includes("154.0")
    );
  });
  await control.locator('[aria-label="Close tempo settings"]').click();
  await control.locator("#previewResolution").click();
  await control.locator("#outputResolution").selectOption("960");
  await control.waitForFunction(
    () =>
      document.getElementById("localPreview").width === 960 &&
      document.getElementById("localPreview").height === 600,
  );
  await control.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("phosphor-set-v5"))?.options
        .outputResolution === "960",
  );
  await control.reload();
  await control.waitForFunction(
    () =>
      document.getElementById("localPreview").width === 960 &&
      Number(document.getElementById("bpm").textContent) === 154,
  );
  await control.locator("#previewResolution").click();
  assert.equal(await control.locator("#outputResolution").inputValue(), "960");
  await control.locator("#outputResolution").selectOption("native");
  await control.waitForFunction(
    () => document.getElementById("localPreview").width === 1440,
  );
  console.log(
    "PASS: local demo/visual tempo, resolution and saved preferences agree after reload",
  );
  assert.deepEqual(errors, []);
  await context.close();
} finally {
  await runtime?.stop();
  await server.close();
}
