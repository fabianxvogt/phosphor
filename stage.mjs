// Stage window (decision D8): renders at the screen's native size within the
// pixel budget and owns the show — controller, clock, autopilot, audio and
// beat tracking. The control window is a remote; if it crashes or reloads
// the picture keeps going.
import scenes from "./scenes.mjs";
import { Engine } from "./engine.mjs";
import { Show } from "./show.mjs";
import { validateShowSet, PIXEL_BUDGETS } from "./show-set.mjs";
import { presetSnapshot } from "./session.mjs";
import { StageAudio } from "./stage-audio.mjs";
import { EnergyEvents } from "./energy-events.mjs";
import { loadSet, saveRuntime, loadRuntime } from "./show-storage.mjs";
import { actionFor } from "./keymap.mjs";
import { drawPattern } from "./stage-pattern.mjs";
import { Pacer } from "./pacer.mjs";
import { Telemetry } from "./telemetry.mjs";
import { Governor } from "./governor.mjs";

const $ = (id) => document.getElementById(id);
const channel = new BroadcastChannel("phosphor-show");
const post = (message) => channel.postMessage(message);
const now = () => performance.now() / 1000;
const canvas = $("canvas");

const errors = [];
const engine = new Engine(canvas, scenes, (message, sceneId) => {
  errors.push(message);
  if (errors.length > 20) errors.shift();
  post({ type: "error", message });
  // Shader failures can surface during construction, before `show` exists.
  if (sceneId) queueMicrotask(() => isolate(sceneId));
});
const { set } = loadSet(localStorage, scenes);
const safeSnapshot = presetSnapshot(
  scenes.find((s) => s.id === "interference"),
);
const show = new Show({
  set,
  safeSnapshot,
  now: now(),
  seed: Date.now() >>> 0,
});
const audio = new StageAudio((text) => post({ type: "audio-status", text }));
const events = new EnergyEvents();
const telemetry = new Telemetry();
const pacer = new Pacer();
let frozen = false;
const governor = new Governor(PIXEL_BUDGETS, set.options.pixelBudget);
let started = false;

function applyOptions(options) {
  Object.assign(engine.options, {
    bloom: options.bloom,
    echo: options.echo,
    chroma: options.chroma,
    reducedMotion: options.reducedMotion,
    flashLimit: true, // locked on during a show (D29)
  });
}

// A family whose shaders failed never stops the show: the controller stops
// scheduling it and, if it is on screen, cuts to a playable clip.
function isolate(id) {
  const onScreen = engine.slots.some((s) => s.scene.id === id);
  apply(show.disable(id, now(), onScreen));
}

function apply(actions) {
  for (const a of actions)
    switch (a.type) {
      case "load":
        telemetry.clipRequested(performance.now());
        // Energy crossfades with the picture: the outgoing clip moves toward
        // the new energy while the incoming one starts from the old.
        engine.setLevel(a.energy, a.fadeSeconds);
        engine.rayStepBudget = governor.steps(a.snapshot.scene);
        if (
          engine.load(a.snapshot, a.fadeSeconds, { energy: a.energy }) === false
        )
          isolate(a.snapshot.scene);
        break;
      case "safe":
        engine.setLevel(a.energy, 0);
        engine.rayStepBudget = governor.steps(a.snapshot.scene);
        if (
          engine.load(a.snapshot, 0.4, {
            flashExempt: true,
            energy: a.energy,
          }) === false
        )
          isolate(a.snapshot.scene);
        break;
      case "energy":
        engine.setLevel(a.value, a.seconds);
        break;
      case "speed":
        engine.speed = a.value;
        break;
      case "shared":
        engine.options.brightness = a.shared.master;
        engine.options.kaleido = a.shared.mirror;
        engine.view.hue = a.shared.hue;
        engine.view.zoom = a.shared.zoom;
        break;
      case "blackout":
        if (a.on && !engine.blackoutTarget) telemetry.blackoutRequested();
        engine.blackoutTarget = a.on ? 1 : 0;
        break;
      case "freeze":
        frozen = a.on;
        break;
      case "flash":
        engine.flashHeld = a.on;
        break;
      case "params":
        engine.setSnapshot(a.snapshot);
        break;
    }
}

// Size the drawing buffer to the screen within the pixel budget (D7).
function fit() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, innerWidth * dpr),
    h = Math.max(1, innerHeight * dpr);
  const scale = Math.min(1, Math.sqrt((governor.budget * 1e6) / (w * h)));
  const width = Math.round(w * scale),
    height = Math.round(h * scale);
  if (width !== engine.width || height !== engine.height)
    engine.resize(width, height);
  if (document.body.classList.contains("pattern"))
    drawPattern($("pattern"), engine);
}

// --- boot: restore the last runtime state or start on the first clip -----
applyOptions(set.options);
apply([{ type: "shared", shared: { ...show.shared } }]);
fit();
const saved = loadRuntime(localStorage);
if (saved) apply(show.restore(saved, now()));
if (!engine.slots.length) {
  const first = set.pages[show.page].slots.find(Boolean);
  apply([
    first
      ? {
          type: "load",
          snapshot: first.snapshot,
          fadeSeconds: 0,
          energy: first.energy,
        }
      : { type: "safe", snapshot: safeSnapshot, energy: 0.15 },
  ]);
}

// --- frame loop ------------------------------------------------------------
// Render at about 60 Hz whatever the display's refresh rate (pacer.mjs).
const intervals = new Float32Array(600);
let intervalCount = 0,
  lastAssess = 0,
  lastStatus = 0,
  lastSave = 0;
function frame(ms) {
  requestAnimationFrame(frame);
  const interval = pacer.frame(ms);
  if (!interval) return;
  const t = ms / 1000;
  const dt = Math.min(0.1, interval / 1000);
  intervals[intervalCount++ % intervals.length] = interval;
  try {
    const tracker = audio.trackerNow();
    const clock = show.clock.at(t);
    const event =
      audio.source === "off"
        ? null
        : events.update(
            Math.floor(clock.beat),
            tracker,
            audio.engine.features.high,
          );
    apply(show.tick(t, { tracker, event }));
    engine.beat = show.clock.at(t).beat;
    engine.features = audio.features(dt);
    engine.advance(dt, frozen);
    telemetry.presented(ms, interval, engine);
  } catch (error) {
    // Never freeze the show on one bad frame: fall back to the safe look.
    post({
      type: "error",
      message: `Frame error: ${error.message}. Safe look loaded.`,
    });
    try {
      apply(show.command({ type: "safe" }, t));
    } catch {}
  }
  telemetry.summarize(
    ms,
    context(),
    engine,
    performance.memory?.usedJSHeapSize ?? null,
  );
  if (ms - lastAssess > 5000) assess(ms);
  if (ms - lastStatus > 100) sendStatus(t, ms);
  if (ms - lastSave > 1000) {
    lastSave = ms;
    saveRuntime(localStorage, show.snapshot(t));
  }
}
function context() {
  const status = audio.status();
  return {
    budget: governor.budget,
    downgrades: governor.downgrades,
    stepReductions: governor.stepReductions,
    scene: engine.slots.at(-1)?.scene.id ?? null,
    level: Math.round(engine.level * 100) / 100,
    audio: status.source,
    locked: status.locked,
    bpm: status.bpm && Math.round(status.bpm * 10) / 10,
    width: engine.width,
    height: engine.height,
  };
}

// Every 5 s outside transitions (governor.mjs).
function assess(ms) {
  lastAssess = ms;
  const n = Math.min(intervalCount, intervals.length);
  if (n < 120 || engine.transition) return;
  const sorted = Array.from(intervals.subarray(0, n)).sort((a, b) => a - b);
  const scene = engine.slots.at(-1)?.scene.id ?? null;
  const rayMarched =
    engine.programs.get(scene)?.visual?.uniforms?.u_raySteps != null;
  const change = governor.assess(
    sorted[Math.floor(n * 0.95)],
    scene,
    rayMarched,
  );
  if (change?.steps) {
    engine.rayStepBudget = change.steps;
    post({
      type: "error",
      message: `Frames were slow; ${scene} ray steps lowered to ${change.steps}.`,
    });
  } else if (change?.budget) {
    fit();
    post({
      type: "error",
      message: `Frames were slow; pixel budget lowered to ${change.budget} MP.`,
    });
  }
  intervalCount = 0;
}

function sendStatus(t, ms) {
  lastStatus = ms;
  const n = Math.min(intervalCount, intervals.length);
  const sorted = Array.from(intervals.subarray(0, n)).sort((a, b) => a - b);
  post({
    type: "status",
    status: show.status(t),
    stage: {
      started,
      width: engine.width,
      height: engine.height,
      budget: governor.budget,
      fps: n ? 1000 / sorted[Math.floor(n / 2)] : null,
      p95: n ? sorted[Math.floor(n * 0.95)] : null,
      level: engine.level,
      scene: engine.slots.at(-1)?.scene.id ?? null,
      counters: { ...engine.counters },
      frozen,
      // Preflight (D10).
      fullscreen: !!document.fullscreenElement,
      external,
      wakeLock: !!wake && !wake.released,
      patternShown,
    },
    audio: audio.status(),
  });
}

// --- control window messages ------------------------------------------------
let previewTracks = [];
function attachPreview() {
  const api =
    window.opener && !window.opener.closed && window.opener.__phosphorControl;
  if (!api?.attachPreview) return;
  for (const track of previewTracks) track.stop();
  const stream = canvas.captureStream(20);
  previewTracks = stream.getTracks();
  api.attachPreview(stream);
}

channel.onmessage = async ({ data }) => {
  const t = now();
  try {
    switch (data?.type) {
      case "hello":
        attachPreview();
        sendStatus(t, performance.now());
        break;
      case "action":
        apply(show.command(data.action, t));
        break;
      case "set": {
        const next = validateShowSet(data.set, scenes);
        show.set = next;
        show.autopilot.everyBars = next.autopilot.everyBars;
        show.autopilot.handBackBars = next.autopilot.handBackBars;
        if (show.page >= next.pages.length) show.page = 0;
        applyOptions(next.options);
        if (next.options.pixelBudget !== governor.budget) {
          governor.budget = next.options.pixelBudget;
          fit();
        }
        break;
      }
      case "clock":
        if (data.mode === "auto") show.clock.resumeAuto(t);
        else if (Number.isFinite(data.bpm))
          show.clock.setManualBpm(t, data.bpm);
        break;
      case "audio":
        await audio.use(data);
        break;
      case "devices":
        post({ type: "devices", devices: await audio.devices() });
        break;
      case "log":
        post({ type: "log", rows: telemetry.log });
        break;
      case "pattern":
        document.body.classList.toggle("pattern", !!data.on);
        if (data.on) drawPattern($("pattern"), engine);
        patternShown ||= !!data.on;
        break;
    }
  } catch (error) {
    post({ type: "error", message: error.message });
  }
};

// --- keys work on the stage too (focus follows the last click) -------------
for (const kind of ["keydown", "keyup"])
  window.addEventListener(kind, (event) => {
    const action = actionFor(event);
    if (!action) return;
    event.preventDefault();
    apply(show.command(action, now()));
  });

// --- start: one click on the stage starts audio and goes fullscreen -------
let wake = null,
  external = null, // stage on a non-built-in screen; null when unknown
  patternShown = false;
async function awake() {
  try {
    wake = await navigator.wakeLock?.request("screen");
  } catch {}
}
async function watchScreen() {
  try {
    const details = await window.getScreenDetails?.();
    if (!details) return;
    const update = () => (external = !details.currentScreen.isInternal);
    update();
    details.addEventListener("currentscreenchange", update);
  } catch {}
}
$("start").onclick = async () => {
  try {
    await document.documentElement.requestFullscreen?.();
  } catch {}
  await awake();
  watchScreen();
  try {
    await audio.ensure();
    started = true;
  } catch (error) {
    post({ type: "error", message: `Audio: ${error.message}` });
  }
  $("overlay").hidden = true;
  post({ type: "stage-started" });
};
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") awake();
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && started) $("overlay").hidden = false;
});
addEventListener("resize", fit);
addEventListener("pagehide", () => {
  saveRuntime(localStorage, show.snapshot(now()));
  for (const track of previewTracks) track.stop();
  wake?.release();
  audio.dispose();
});
// Harness and soak-runner hooks (tests/browser, scripts/soak.mjs).
window.__phosphorStage = {
  engine,
  show,
  governor,
  audio,
  scenes,
  attachPreview,
  telemetry: () =>
    telemetry.drain(
      performance.now(),
      context(),
      engine,
      performance.memory?.usedJSHeapSize ?? null,
    ),
  log: () => telemetry.log,
};
post({ type: "stage-ready" });
attachPreview();
requestAnimationFrame(frame);
