// Headless correctness checks (no timing gates): every look renders, fades
// leave no leaked textures, energy curves stay finite, and the control/stage
// show behaves — keys, panic under slider focus, safe look, autopilot,
// control reload, stage reload recovery, set edits and the framing pattern.
// Requires `npm run build` first (the app is served from dist/).
import assert from "node:assert/strict";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
  openShow,
  lookList,
  deadline,
} from "./browser-runtime.mjs";
import { renderLook, readStage } from "../tests/browser/client.mjs";

const args = options({
  frames: { type: "string", default: "20" },
  only: { type: "string" }, // "lab" or "show" while iterating
});
if (args.rig)
  throw new Error("test:browser is always headless correctness-only");
await outputDirectory("browser", args.out);
const server = await serve(".", args.port);
const frames = Number(args.frames);
let runtime;
const pass = (name) => console.log(`PASS ${name}`);
const waitFor = async (page, fn, arg, label, timeout = 60000) => {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 100 });
  } catch (error) {
    throw new Error(`${label}: ${error.message.split("\n")[0]}`);
  }
};
try {
  runtime = await launch();
  console.log(`Chrome ${runtime.version}; software GPU; no timing gates`);

  if (args.only !== "show") {
    // --- render lab ---------------------------------------------------------
    const lab = await openLab(runtime.browser, server.url);
    const looks = await lookList(lab.page);
    for (const look of looks) {
      const r = await deadline(
        lab.page.evaluate(renderLook, { ...look, frames, capture: false }),
        180000,
        look.name,
      );
      assert.ok(
        r.peak > 8,
        `${look.sceneId}/${look.name} is blank (peak ${r.peak})`,
      );
      assert.equal(r.glError, 0, `${look.name}: WebGL error`);
      assert.equal(r.nonFinite, 0, `${look.name}: non-finite input`);
      assert.equal(
        r.stats.liveTextures,
        r.stats.textures,
        `${look.name}: unaccounted textures`,
      );
    }
    pass(
      `all ${looks.length} looks render · WebGL 0 · non-finite 0 · textures accounted`,
    );

    const families = [...new Set(looks.map((l) => l.sceneId))];
    for (const sceneId of families)
      for (const level of [0.05, 0.95]) {
        const r = await lab.page.evaluate(renderLook, {
          sceneId,
          level,
          frames,
          capture: false,
        });
        assert.equal(
          r.nonFinite,
          0,
          `${sceneId} at energy ${level}: non-finite`,
        );
        assert.equal(
          r.glError,
          0,
          `${sceneId} at energy ${level}: WebGL error`,
        );
      }
    pass("every family stays finite at the energy extremes");

    for (const sceneId of families)
      for (const [width, height] of [
        [640, 180], // 32:9 LED strip
        [240, 240], // square wall
        [180, 320], // portrait
      ]) {
        const r = await lab.page.evaluate(renderLook, {
          sceneId,
          frames,
          width,
          height,
          capture: false,
        });
        assert.ok(
          r.peak > 8,
          `${sceneId} ${width}×${height} is blank (peak ${r.peak})`,
        );
        assert.equal(
          r.glError,
          0,
          `${sceneId} ${width}×${height}: WebGL error`,
        );
        assert.equal(r.stats.liveTextures, r.stats.textures);
      }
    pass("every family renders on 32:9, square and portrait screens");

    for (const sceneId of families) {
      const stats = await lab.page.evaluate(async (id) => {
        const { engine, scenes, presetSnapshot } = window.__phosphorLab;
        engine.load(presetSnapshot(scenes.find((s) => s.id === id)), 0.1);
        await engine.ready(id);
        for (let i = 0; i < 400 && engine.transition; i++)
          engine.advance(1 / 60, false);
        return {
          ...engine.stats(),
          transition: !!engine.transition,
          error: engine.gl.getError(),
        };
      }, sceneId);
      assert.equal(stats.transition, false, `${sceneId}: fade never finished`);
      assert.equal(stats.slots, 1);
      assert.equal(
        stats.liveTextures,
        stats.textures,
        `${sceneId}: leaked textures after fade`,
      );
      assert.equal(stats.error, 0);
    }
    pass("every family fade returns to one slot with no leaked textures");
    assert.deepEqual(lab.errors, []);
    await lab.context.close();
  }
  if (args.only === "lab") process.exit(0);

  // --- show: control + stage ------------------------------------------------
  const show = await openShow(runtime.browser, server.url);
  const { control, stage } = show;
  await waitFor(
    control,
    () => /Stage live/.test(document.getElementById("stagePill").textContent),
    null,
    "control sees the stage",
  );
  pass("control opens the stage, the stage starts and reports back");

  await control.keyboard.press("KeyW"); // slot 9 (QWERTY/QWERTZ W)
  await waitFor(
    stage,
    () => window.__phosphorStage.show.live?.slot === 9,
    null,
    "grid key triggers slot 9",
  );
  pass("grid key triggers its clip on the stage");

  // Panic under slider focus: the old instrument ignored B/Esc here.
  await control.locator("#fader-master").focus();
  await control.keyboard.press("Escape");
  await waitFor(
    stage,
    () => window.__phosphorStage.engine.blackoutTarget === 1,
    null,
    "Esc with a slider focused",
  );
  const latency = await stage.evaluate(
    () => window.__phosphorStage.telemetry().blackoutLatencyFrames,
  );
  await waitFor(
    stage,
    () => window.__phosphorStage.engine.blackout === 1,
    null,
    "blackout reaches black",
  );
  assert.ok(
    latency.every((f) => f <= 2),
    `blackout latency ${latency}`,
  );
  await control.keyboard.press("Escape");
  await waitFor(
    stage,
    () => window.__phosphorStage.engine.blackoutTarget === 0,
    null,
    "Esc again recovers",
  );
  pass(
    "Esc blacks out within two frames even with a slider focused, and recovers",
  );

  await control.keyboard.press("Shift+Escape");
  await waitFor(
    stage,
    () =>
      window.__phosphorStage.show.live === null &&
      window.__phosphorStage.engine.slots.at(-1).scene.id === "interference",
    null,
    "safe look",
  );
  pass("Shift+Esc loads the safe look");

  const autopilot = await stage.evaluate(
    () => window.__phosphorStage.show.autopilot.enabled,
  );
  await control.locator("body").press("KeyP");
  await waitFor(
    stage,
    (was) => window.__phosphorStage.show.autopilot.enabled !== was,
    autopilot,
    "P toggles autopilot",
  );
  pass("P toggles autopilot");

  // Set edits remain available while the stage is connected.
  const name = `Harness ${Date.now()}`;
  await control.locator("#setFields input").first().fill(name);
  await control.locator("#setFields input").first().dispatchEvent("change");
  await waitFor(
    stage,
    (n) => window.__phosphorStage.show.set.name === n,
    name,
    "set edit reaches the stage",
  );
  pass("configuration edits reach the stage");

  // Control reload: the stage keeps rendering and the control reconnects.
  // Leave the text field: typing there must not trigger clips.
  await control.evaluate(() => document.activeElement?.blur());
  await control.keyboard.press("KeyE"); // slot 10
  await waitFor(
    stage,
    () => window.__phosphorStage.show.live?.slot === 10,
    null,
    "slot 10",
  );
  const before = await stage.evaluate(readStage);
  await control.reload();
  await waitFor(
    control,
    () => /Stage live/.test(document.getElementById("stagePill").textContent),
    null,
    "control reconnects",
  );
  const after = await stage.evaluate(readStage);
  assert.ok(
    after.frames > before.frames,
    "stage kept rendering through the control reload",
  );
  assert.equal(after.status.live.slot, 10);
  await waitFor(
    control,
    () => document.getElementById("previewEmpty").hidden,
    null,
    "preview reattached",
  );
  pass("control reload: stage keeps playing, control and preview reconnect");
  // A slow GPU can miss status reports without closing the stage. Exercise
  // the real key/channel path beyond the old 2 s lease, after control reload
  // has also discarded the original window.open() return value.
  await control.evaluate(() => {
    const channel = new BroadcastChannel("phosphor-show");
    const probe = { last: performance.now(), channel };
    channel.onmessage = ({ data }) => {
      if (data?.type === "status") probe.last = performance.now();
    };
    window.__stageStatusProbe = probe;
  });
  await stage.evaluate(() => {
    const original = BroadcastChannel.prototype.postMessage;
    window.__resumeStageStatus = () => {
      BroadcastChannel.prototype.postMessage = original;
    };
    BroadcastChannel.prototype.postMessage = function (data) {
      if (data?.type !== "status") return original.call(this, data);
    };
  });
  try {
    await waitFor(
      control,
      () => performance.now() - window.__stageStatusProbe.last > 2500,
      null,
      "stage status reports are paused",
    );
    const state = await stage.evaluate(() => ({
      blackout: window.__phosphorStage.engine.blackoutTarget,
      autopilot: window.__phosphorStage.show.autopilot.enabled,
    }));
    await control.locator("#fader-master").focus();
    await control.keyboard.press("Escape");
    await waitFor(
      stage,
      (was) => window.__phosphorStage.engine.blackoutTarget !== was,
      state.blackout,
      "Esc reaches the open stage without status reports",
    );
    await control.keyboard.press("Escape");
    await waitFor(
      stage,
      (was) => window.__phosphorStage.engine.blackoutTarget === was,
      state.blackout,
      "Esc recovers the open stage without status reports",
    );
    await control.locator("body").press("KeyP");
    await waitFor(
      stage,
      (was) => window.__phosphorStage.show.autopilot.enabled !== was,
      state.autopilot,
      "P reaches the open stage without status reports",
    );
    await control.locator("body").press("KeyP");
    await waitFor(
      stage,
      (was) => window.__phosphorStage.show.autopilot.enabled === was,
      state.autopilot,
      "P recovers the open stage without status reports",
    );
    pass(
      "Esc and P keep reaching the open stage through missed status reports",
    );
  } finally {
    await stage.evaluate(() => {
      window.__resumeStageStatus();
      delete window.__resumeStageStatus;
    });
    await control.evaluate(() => {
      window.__stageStatusProbe.channel.close();
      delete window.__stageStatusProbe;
    });
  }

  // Stage reload: runtime state restores the clip, energy and shared controls.
  await control.evaluate(() => {
    const channel = new BroadcastChannel("phosphor-show");
    channel.postMessage({
      type: "action",
      action: { type: "energy", value: 0.8 },
    });
    channel.postMessage({
      type: "action",
      action: { type: "shared", zoom: 1.4 },
    });
  });
  await waitFor(
    stage,
    () =>
      window.__phosphorStage.show.energy === 0.8 &&
      window.__phosphorStage.show.shared.zoom === 1.4,
    null,
    "energy/zoom",
  );
  await stage.waitForTimeout(1500); // runtime state is saved every second
  await stage.reload();
  await waitFor(stage, () => !!window.__phosphorStage, null, "stage reloads");
  const restored = await stage.evaluate(readStage);
  assert.equal(restored.status.live.slot, 10);
  assert.equal(restored.status.energy, 0.8);
  assert.equal(restored.status.shared.zoom, 1.4);
  pass("stage reload restores clip, energy and shared controls");

  await control.locator("#pattern").click();
  await waitFor(
    stage,
    () => document.body.classList.contains("pattern"),
    null,
    "framing pattern",
  );
  pass("framing pattern toggles on the stage");

  const counters = await stage.evaluate(
    () => window.__phosphorStage.engine.counters,
  );
  assert.equal(counters.gpuErrors, 0);
  assert.equal(counters.nonFinite, 0);
  pass("no GPU errors, non-finite inputs or page errors");

  // Presence-based ownership must still release the preview on real closure,
  // including the window proxy recovered after control and stage reloads.
  await control.locator("#settingsLock").check();
  await stage.close();
  await waitFor(
    control,
    () =>
      document.getElementById("stagePill").textContent === "Stage not open" &&
      document.getElementById("settingsLock").disabled &&
      !document.getElementById("settingsLock").checked,
    null,
    "stage closure resumes local performance and unlocks settings",
  );
  await control.keyboard.press("Escape");
  await waitFor(
    control,
    () => document.getElementById("blackout").ariaPressed === "true",
    null,
    "Esc controls the local preview after stage closure",
  );
  await control.keyboard.press("Escape");
  await waitFor(
    control,
    () => document.getElementById("blackout").ariaPressed === "false",
    null,
    "Esc recovers the local preview after stage closure",
  );
  assert.deepEqual(show.errors, []);
  pass("closing the stage resumes local keys and unlocks settings");
} finally {
  await runtime?.stop();
  await server.close();
}
