import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  newInstrument,
  pauseForCapture,
  presets,
} from "./browser-runtime.mjs";
import { renderPreset, readTelemetry } from "../tests/browser/client.mjs";

const args = options();
if (args.rig)
  throw new Error("test:browser is always headless correctness-only");
const out = await outputDirectory("browser", args.out);
const server = await serve(args.dist, args.port);
let runtime;
const passes = [];
const pass = (name) => {
  passes.push(name);
  console.log(`PASS ${name}`);
};
try {
  runtime = await launch();
  const { context, page, errors, consoleDiagnostics, source } =
    await newInstrument(runtime.browser, server.url);
  console.log(
    `Chrome ${runtime.version}; software GPU; ${source}; no timing gates`,
  );
  pass("boot readiness");
  await pauseForCapture(page);
  const looks = await presets(page);
  for (const look of looks) {
    const result = await page.evaluate(renderPreset, {
      ...look,
      seed: 48113,
      frames: 60,
      capture: false,
    });
    assert.ok(result.mean > 0.00001, `${look.sceneId}/${look.name} is blank`);
    assert.equal(result.glError, 0, `${look.name}: WebGL error`);
    assert.equal(result.nonFinite, 0, `${look.name}: non-finite upload`);
    assert.equal(result.stats.slots, 1);
    assert.equal(
      result.stats.liveTextures,
      result.stats.textures,
      `${look.name}: unaccounted GPU textures`,
    );
  }
  pass(`all ${looks.length} presets nonblank / WebGL 0 / nonFinite 0`);
  // Engine lifecycle is contract 4's seam; advance by frames, not wall-clock sleeps.
  for (let i = 0; i < 10; i++) {
    const stats = await page.evaluate(async (index) => {
      const app = window.__phosphor;
      const { presetSnapshot } = await import("/session.mjs");
      const engine = app.engine;
      engine.load(presetSnapshot(app.scenes[index % app.scenes.length]), 0.1);
      for (let frame = 0; frame < 300 && engine.transition; frame++)
        engine.advance(1 / 60, false);
      return {
        ...engine.stats(),
        transition: !!engine.transition,
        error: engine.gl.getError(),
      };
    }, i);
    assert.equal(stats.transition, false);
    assert.equal(stats.slots, 1);
    assert.equal(stats.liveTextures, stats.textures);
    assert.equal(stats.error, 0);
  }
  pass("every completed family fade returns to 1 slot with no leaked textures");
  await page.evaluate(() => {
    const app = window.__phosphor;
    const set = app.getSession();
    set.options.autoQuality = false;
    set.options.autoRecovery = false;
    set.tempo = 200;
    set.cues.forEach((cue) => {
      cue.bars = 256;
      cue.transition = 0.1;
    });
    app.applySession(set);
  });
  await page.locator("#pauseButton").click();
  await page.locator("#stage").focus();
  await page.keyboard.press("b");
  await page.waitForFunction(
    () => window.__phosphor.engine.health().mean < 0.0001,
  );
  assert.equal(
    await page.evaluate(() => window.__phosphor.engine.blackoutTarget),
    1,
  );
  await page.keyboard.press("b");
  await page.waitForFunction(
    () => window.__phosphor.engine.health().mean > 0.001,
  );
  pass("blackout reaches black and B recovers (latency not CI-gated)");
  await page.keyboard.press("p");
  await page.waitForFunction(() =>
    /Resume/.test(document.getElementById("pauseButton").textContent),
  );
  await page.keyboard.press("p");
  await page.waitForFunction(() =>
    /Pause/.test(document.getElementById("pauseButton").textContent),
  );
  const seed = await page.evaluate(
    () => window.__phosphor.getSession().active.seed,
  );
  await page.evaluate(() => {
    window.__harness.resetObserved = false;
    const engine = window.__phosphor.engine;
    const load = engine.load;
    engine.load = function (...args) {
      window.__harness.resetObserved = true;
      return load.apply(this, args);
    };
    window.__harness.restoreLoad = () => (engine.load = load);
  });
  await page.keyboard.press("r");
  assert.equal(
    await page.evaluate(() => window.__phosphor.getSession().active.seed),
    seed,
  );
  assert.equal(
    await page.evaluate(() => window.__harness.resetObserved),
    true,
    "R must actually reload the seeded renderer",
  );
  await page.evaluate(() => window.__harness.restoreLoad());
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      window.__phosphor.getSession().options.reducedMotion &&
      window.__phosphor.engine.blackoutTarget === 0,
  );
  pass("panic keys B / P / R / Escape from stage focus");
  await page.locator('[data-tab="set"]').click();
  await page.locator("#playSetButton").click();
  await page.locator("#pauseButton").click();
  await page.locator("#quantizeInput").check();
  const beforeCue = await page
    .locator(".cue-row.current .cue-name")
    .inputValue();
  await page.locator("#stage").focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator(".cue-row.current .cue-name").inputValue(),
    beforeCue,
  );
  await page.locator("#pauseButton").click();
  await page.waitForFunction(
    (previous) =>
      document.querySelector(".cue-row.current .cue-name")?.value !== previous,
    beforeCue,
  );
  await page.locator("#playSetButton").click();
  pass("quantized GO stays armed while clock held, enters at next bar");
  await page.locator("#saveButton").click();
  const downloaded = page.waitForEvent("download");
  await page.locator("#exportButton").click();
  const download = await downloaded;
  const exportPath = resolve(out, "phosphor-set-v2.json");
  await download.saveAs(exportPath);
  const exported = JSON.parse(await readFile(exportPath, "utf8"));
  await page.evaluate(() => {
    const app = window.__phosphor;
    const set = app.getSession();
    set.name = "Import witness";
    app.applySession(set);
  });
  await page.locator("#importInput").setInputFiles(exportPath);
  await page.waitForFunction(
    (name) => window.__phosphor.getSession().name === name,
    exported.name,
  );
  assert.deepEqual(
    await page.evaluate(() => window.__phosphor.getSession()),
    exported,
  );
  await page.locator("#saveButton").click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__phosphor?.getSession);
  assert.deepEqual(
    await page.evaluate(() => window.__phosphor.getSession()),
    exported,
  );
  pass("export -> import -> persisted reload deep-equal");
  const popupPromise = page.waitForEvent("popup");
  await page.locator("#outputButton").click();
  const popup = await popupPromise;
  await popup.waitForFunction(() => {
    const video = document.getElementById("output");
    return (
      video &&
      !video.paused &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.getVideoPlaybackQuality().totalVideoFrames > 0
    );
  });
  const video = await popup.evaluate(() => {
    const video = document.getElementById("output");
    return {
      frames: video.getVideoPlaybackQuality().totalVideoFrames,
      tracks: video.srcObject.getVideoTracks().map((track) => track.readyState),
    };
  });
  assert.ok(video.frames > 0);
  assert.deepEqual(video.tracks, ["live"]);
  await popup.close();
  pass("clean output receives decoded live video");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tab of ["scenes", "set", "audio", "garden"]) {
    await page.locator(`[data-tab="${tab}"]`).click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${tab} horizontal overflow`,
    );
  }
  pass("390px: every tab has no horizontal overflow");
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller)))
    await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      !!window.__phosphor?.getSession && !!navigator.serviceWorker.controller,
  );
  await context.setOffline(true);
  const response = await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(response.fromServiceWorker(), true);
  await page.waitForFunction(() => !!window.__phosphor?.getSession);
  assert.deepEqual(
    await page.evaluate(() => window.__phosphor.getSession()),
    exported,
  );
  await page.waitForFunction(
    () => window.__phosphor.engine.health().mean > 0.001,
  );
  pass("service-worker offline reload boots, renders and retains set");
  const telemetry = await page.evaluate(readTelemetry);
  assert.equal(telemetry.gpuErrors, 0);
  assert.equal(telemetry.nonFinite, 0);
  assert.deepEqual(errors, []);
  pass("no unhandled page exceptions");
  await writeFile(
    resolve(out, "summary.json"),
    JSON.stringify(
      {
        passed: true,
        browser: runtime.version,
        source,
        timingGates: false,
        passes,
        consoleDiagnostics,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await writeFile(
    resolve(out, "summary.json"),
    JSON.stringify({ passed: false, passes, error: error.message }, null, 2),
  );
  throw error;
} finally {
  await runtime?.stop();
  await server.close();
}
