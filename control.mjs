import {
  tr,
  errorText,
  translateDocument,
  lookName,
  locale,
  formatNumber,
} from "./i18n/index.mjs";
translateDocument();
import { withoutWorldLook, FEATURED_WORLD } from "./worlds.mjs";
import { WorldPanel } from "./control-worlds.mjs";
// Control window: owns set editing and local performance until a stage connects.
// The stage owns live playback once open; control reloads never stop the show.
import scenes from "./scenes.mjs";
import { Engine } from "./engine.mjs";
import {
  nativeDisplayResolution,
  outputResolution,
  OUTPUT_RESOLUTIONS,
  resolutionLimits,
} from "./display-resolution.mjs";
import { ControlPreview, performanceBeat } from "./control-preview.mjs";
import { presetSnapshot } from "./session.mjs";
import { PalettePicker } from "./color-picker.mjs";
import { PALETTES, paletteById } from "./palettes.mjs";
import {
  validateShowSet,
  parseShowSet,
  clipFrom,
  freeLookId,
  KEYS,
  TRANSITIONS,
  AUTOPILOT_BARS,
  MIDI_TARGETS,
} from "./show-set.mjs";
import { loadSet, saveSet } from "./show-storage.mjs";
import {
  actionFor,
  isPauseShortcut,
  keyLabels,
  GRID_CODES,
} from "./keymap.mjs";
import { mutatePreset } from "./evolution.mjs";
import { AudioEngine, MidiInput } from "./audio.mjs";
import { routeMidi } from "./midi-map.mjs";
import {
  catalogLooks,
  lookPalette,
  MAX_RATING,
  OWN_PREFIX,
} from "./catalog.mjs";
import { PREVIEWS } from "./catalog-previews.mjs";
import { Thumbnails } from "./catalog-thumbs.mjs";
import { CatalogPanel } from "./control-catalog.mjs";
import { setupControlUI, syncControlPalette } from "./control-ui.mjs";
import { RhythmPanel } from "./control-rhythm.mjs";
import { effectDefinitions, validatePattern } from "./rhythm.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};
const channel = new BroadcastChannel("phosphor-show");
const send = (message) => channel.postMessage(message);
const sceneById = (id) => scenes.find((s) => s.id === id);
const stageParams = (scene) =>
  scene.stage ??
  scene.schema
    .filter((d) => d.step < 1)
    .slice(0, 3)
    .map((d) => d.key);

let { set, report } = loadSet(localStorage, scenes);
// A fresh control session starts with catalog Autopilot. An already-running
// Stage remains authoritative and restores its state through the hello/status
// handshake below; importing a set later still honors its saved settings.
set.autopilot.enabled = true;
set.palette ??= "symbiosis";
const showColors = () => paletteById(set.palette)?.colors ?? set.palette;
let status = null; // last stage status
let lastStatusAt = -Infinity; // no stage heard yet (0 would read as alive for 2 s)
let labels = {};
// The look in the editor (D68): { id, own, base, name, snapshot, palette,
// transition }. Edits stay a draft until saved as an own look.
let draft = null;
let editorLiveLook = null;
let editorFollowsLive = false;
let settingsLocked = false;
let requestedTempo = null;
let audioRequest = 0;
let localPerformance = null;
let handoffPending = false;
let stageWindow = null;
let saveTimer = null;
let rhythmPanel = null;
let worldPanel = null;
let rhythmPreviewActive = false;
// Optimistic desired patterns protect edits from an older in-flight status.
const rhythmEdits = new Map();

// --- messages --------------------------------------------------------------
function log(message) {
  const item = el("li", {
    textContent: `${new Date().toLocaleTimeString(locale)} · ${message}`,
  });
  $("log").prepend(item);
  while ($("log").children.length > 50) $("log").lastChild.remove();
}
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4000);
}
for (const line of report) log(line);

// --- set persistence: save on edits only (D9) -------------------------------
let ratingSendTimer;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      saveSet(localStorage, set);
    } catch (error) {
      toast(
        tr("Could not save locally ({value1}). Export the set.", {
          value1: errorText(error),
        }),
      );
    }
  }, 300);
}
function changed() {
  set = validateShowSet(set, scenes);
  localPerformance?.updateSet(set);
  saveSoon();
  clearTimeout(ratingSendTimer);
  send({ type: "set", set });
  scheduleRender();
}
// Ratings (D65) are set data but change in bursts: the card repaints at once,
// the save and the stage update are coalesced. Allowed under Lock settings.
function rate(id, rating) {
  if (rating === null) delete set.ratings[id];
  else set.ratings[id] = rating;
  localPerformance?.updateSet(set);
  saveSoon();
  clearTimeout(ratingSendTimer);
  ratingSendTimer = setTimeout(() => send({ type: "set", set }), 400);
}
// Favourites (D68) behave like ratings: library data, allowed under Lock.
function favorite(id, on) {
  const list = set.favorites.filter((f) => f !== id);
  if (on) list.push(id);
  set.favorites = list;
  localPerformance?.updateSet(set);
  saveSoon();
  clearTimeout(ratingSendTimer);
  ratingSendTimer = setTimeout(() => send({ type: "set", set }), 400);
}
// The grid keys play the first 32 cards of the catalog's current view (D68).
let keysTimer;
function setKeys(ids) {
  const keys = Array.from({ length: KEYS }, (_, i) => ids[i] ?? null);
  if (keys.every((id, i) => id === set.keys[i])) return;
  set.keys = keys;
  localPerformance?.updateSet(set);
  saveSoon();
  clearTimeout(keysTimer);
  keysTimer = setTimeout(() => send({ type: "set", set }), 150);
}
// Coalesce re-renders to the next frame: rendering synchronously from a
// change/blur handler would replace the element that is firing the event.
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

// --- stage window --------------------------------------------------------------
async function openStage() {
  if (stageAlive()) {
    toast(tr("The stage is already running."));
    return;
  }
  // Open first, while the click's user activation is still valid; then move
  // the window onto the external screen (Window Management API). A pending
  // permission prompt must never cost the popup.
  stageWindow = window.open(
    "stage.html",
    "phosphor-stage",
    "popup,width=1280,height=720",
  );
  if (!stageWindow) {
    toast(
      tr(
        "The browser blocked the stage window. Allow pop-ups for this site, then click Open stage again.",
      ),
    );
    return;
  }
  handoffPending = true;
  stopLocalDemo();
  try {
    if (!("getScreenDetails" in window)) return;
    const details = await window.getScreenDetails();
    const external = details.screens.find((s) => s !== details.currentScreen);
    if (!external) {
      log(tr("Only one screen found: drag the stage window to the projector."));
      return;
    }
    stageWindow.moveTo(external.availLeft, external.availTop);
    stageWindow.resizeTo(external.availWidth, external.availHeight);
    log(
      tr("Stage placed on {value1}.", {
        value1: external.label || tr("the external screen"),
      }),
    );
  } catch {
    log(tr("Drag the stage window to the projector screen."));
  }
}
// Status cadence is not window liveness: a slow frame must never hand venue
// controls back to the local preview. Reconnected previews recover this proxy.
const stageAlive = () =>
  !!status &&
  (stageWindow ? !stageWindow.closed : performance.now() - lastStatusAt < 2000);
const now = () => performance.now() / 1000;
function resumeLocalPerformance() {
  if (stageAlive() || !status) return false;
  const state = status.performance;
  status = null;
  handoffPending = false;
  $("preview").srcObject = null;
  applyPreviewSize();
  if (state) localPerformance?.restore(state, now());
  // Present the restored look before revealing the local canvas.
  editorEngine?.advance(0, true);
  if (editorEngine) localPreviewContext.drawImage($("editorCanvas"), 0, 0);
  updatePreview();
  return true;
}
function performanceStatus() {
  resumeLocalPerformance();
  return stageAlive() ? status?.status : localPerformance?.status(now());
}
function act(action) {
  if (action.type === "world-duration" && [4, 8, 16].includes(action.bars)) {
    set.worldBars = action.bars;
    saveSoon();
  }
  if (action.type === "world-tour") {
    set.worldTour = action.on ?? set.worldTour === false;
    action = { ...action, on: set.worldTour };
    saveSoon();
  }
  if (action.type === "tap") requestedTempo = null;
  resumeLocalPerformance();
  if (stageAlive()) send({ type: "action", action });
  else localPerformance?.command(action, now());
  if (action.type === "pause" && !stageAlive()) {
    demoAudio
      .setPaused(!!localPerformance?.show.clock.paused)
      .then(renderLocalAudio)
      .catch(() => {});
    if (!localPerformance?.show.clock.paused) syncLocalDemo();
  }
  // A grid key or a catalog Play also opens that look in the editor.
  const id =
    action.type === "slot"
      ? set.keys[action.index]
      : action.type === "look"
        ? action.id
        : null;
  if (id && lookById(id)) selectLook(id, false);
  renderStatus();
}
function setClock(mode, bpm) {
  if (mode !== "auto" && !Number.isFinite(bpm)) return;
  if (mode !== "auto") bpm = Math.max(40, Math.min(200, bpm));
  set.clock.mode = mode;
  if (mode !== "auto") set.clock.manualBpm = bpm;
  saveSoon();
  resumeLocalPerformance();
  requestedTempo =
    stageAlive() && mode === "manual" ? { bpm, until: now() + 2 } : null;
  if (stageAlive()) send({ type: "clock", mode, bpm });
  else if (mode === "auto") localPerformance?.show.clock.resumeAuto(now());
  else if (Number.isFinite(bpm))
    localPerformance?.show.clock.setManualBpm(now(), bpm);
  if (!stageAlive()) demoAudio.pumpDemo?.();
  renderStatus();
}

// Audition the demo locally until the stage takes ownership of audio.
const demoAudio = new AudioEngine(() => renderLocalAudio());
demoAudio.setDemoClock(() => {
  const clock = localPerformance?.show.clock;
  const t = now();
  return clock && { ...clock.at(t), time: t, period: clock.period };
});
let demoRequested = true;
let demoStarting = false;
function renderLocalAudio() {
  if (stageAlive()) return;
  const playing =
    demoAudio.kind === "demo" && demoAudio.context?.state === "running";
  $("audioPill").textContent = demoAudio.paused
    ? tr("Paused")
    : playing
      ? demoAudio.muted
        ? tr("Demo · muted")
        : tr("Demo · {value1} BPM", {
            value1: formatNumber(demoAudio.tempo, 1, 1),
          })
      : demoRequested
        ? tr("Demo · click to hear")
        : tr("Audio off");
  $("audioPill").className = `pill ${playing && !demoAudio.muted ? "ok" : ""}`;
}
function stopLocalDemo() {
  if (demoStarting || demoAudio.kind !== "silent") demoAudio.stop();
}
function syncLocalDemo() {
  if (!demoRequested || stageAlive() || (stageWindow && !stageWindow.closed)) {
    stopLocalDemo();
    return;
  }
  if (!navigator.userActivation?.hasBeenActive || demoStarting) return;
  demoAudio.paused = !!localPerformance?.show.clock.paused;
  if (demoAudio.kind === "demo") {
    demoAudio
      .setPaused(demoAudio.paused)
      .then(renderLocalAudio)
      .catch(() => {});
    return;
  }
  demoStarting = true;
  demoAudio.mute($("audioMute").checked);
  demoAudio
    .demo()
    .catch((error) => {
      demoRequested = false;
      toast(tr("Demo audio: {value1}", { value1: errorText(error) }));
    })
    .finally(() => {
      demoStarting = false;
      renderLocalAudio();
    });
}
// Do not ask for microphone access or create an audio context on page load.
for (const kind of ["click", "keydown"])
  addEventListener(kind, (event) => {
    if (event.code !== "Escape") syncLocalDemo();
  });
addEventListener("pagehide", () => demoAudio.dispose());
renderLocalAudio();
function updatePreview() {
  const live =
    stageAlive() &&
    $("preview")
      .srcObject?.getVideoTracks()
      .some((t) => t.readyState === "live");
  $("preview").hidden = !live;
  $("localPreview").hidden = !!live;
  $("previewEmpty").hidden = !!live || !!editorEngine;
}
window.__phosphorControl = {
  demoAudio,
  attachPreview(stream, stage) {
    stageWindow = stage;
    const video = $("preview");
    video.srcObject = stream;
    video.play().catch(() => {});
    stream
      .getVideoTracks()
      .forEach((track) =>
        track.addEventListener("ended", updatePreview, { once: true }),
      );
    updatePreview();
  },
};

channel.onmessage = ({ data }) => {
  switch (data?.type) {
    case "status":
      status = data;
      lastStatusAt = performance.now();
      stopLocalDemo();
      // The stage may change shared controls and autopilot from its own keys
      // and autopilot; keep the set in step so a later edit doesn't undo them.
      set.shared = { ...data.status.shared };
      if (data.status.worlds?.bars) set.worldBars = data.status.worlds.bars;
      set.autopilot.enabled = data.status.autopilot.enabled;
      set.autopilot.random = data.status.autopilot.random;
      syncRhythmStatus(data.status.rhythm);
      renderStatus();
      break;
    case "stage-ready":
      log(tr("Stage opened."));
      if (handoffPending) {
        if (localPerformance)
          send({ type: "preview-state", state: localPerformance.state(now()) });
        send({
          type: "audio",
          source: demoRequested ? "demo" : "off",
          muted: $("audioMute").checked,
        });
        handoffPending = false;
      }
      stopLocalDemo();
      send({ type: "set", set });
      break;
    case "stage-started":
      log(tr("Stage started."));
      break;
    case "devices":
      renderDevices(data.devices);
      break;
    case "error":
      log(data.message);
      toast(data.message);
      break;
    case "log":
      download(
        `phosphor-rehearsal-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`,
        JSON.stringify(
          { exported: new Date().toISOString(), rows: data.rows },
          null,
          1,
        ),
      );
      break;
    case "audio-status":
      log(tr("Audio: {value1}", { value1: data.text }));
      break;
  }
};

// --- keys --------------------------------------------------------------------
for (const kind of ["keydown", "keyup"])
  window.addEventListener(
    kind,
    (event) => {
      if (!isPauseShortcut(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (kind === "keydown" && !event.repeat) act({ type: "pause" });
    },
    { capture: true },
  );
let heldFlash = false;
function holdFlash(on) {
  heldFlash = on;
  act({ type: "flash", on });
}
window.addEventListener("blur", () => {
  if (heldFlash) holdFlash(false);
});
for (const kind of ["keydown", "keyup"])
  window.addEventListener(kind, (event) => {
    if (!$("confirm").hidden && !(kind === "keyup" && event.code === "KeyL"))
      return;
    const action = actionFor(event);
    if (!action) return;
    event.preventDefault();
    if (action.type === "flash") heldFlash = action.on;
    act(action);
  });

// --- rendering: readouts -------------------------------------------------------
const SHARED = [
  { key: "master", label: tr("Master"), min: 0, max: 1, step: 0.01 },
  { key: "energy", label: tr("Energy"), min: 0, max: 1, step: 0.01 },
  { key: "hue", label: tr("Hue"), min: -0.5, max: 0.5, step: 0.01 },
  { key: "zoom", label: tr("Zoom"), min: 0.5, max: 2, step: 0.01 },
  { key: "mirror", label: tr("Mirror"), min: 1, max: 12, step: 1 },
];
function faderValue(input) {
  const value = Number(input.value);
  if (["fader-master", "fader-energy", "fader-zoom"].includes(input.id))
    return `${Math.round(value * 100)}%`;
  if (input.id === "fader-hue") return `${Math.round(value * 360)}°`;
  if (input.id === "fader-mirror") return value === 1 ? tr("Off") : `${value}×`;
  const digits = Number(input.step) < 1 ? 2 : 0;
  return formatNumber(value, digits, digits);
}
function paintFader(input) {
  const min = Number(input.min),
    max = Number(input.max);
  const fraction = Math.max(
    0,
    Math.min(1, (Number(input.value) - min) / (max - min || 1)),
  );
  // Native range thumbs travel width minus thumb width. Hide the fill's end
  // inside the opaque bulb at every value, including both endpoints.
  input.style.setProperty(
    "--fill-center",
    `calc(${fraction * 100}% + ${29 - 42 * fraction}px)`,
  );
  input.style.setProperty(
    "--fill",
    `${(100 * (Number(input.value) - min)) / (max - min || 1)}%`,
  );
}
function fader({ key, label, min, max, step }, value, oninput) {
  const id = `fader-${key}`;
  const input = el("input", { id, type: "range", min, max, step, value });
  const output = el("output", {
    htmlFor: id,
    value: faderValue(input),
  });
  paintFader(input);
  input.oninput = () => {
    paintFader(input);
    output.value = faderValue(input);
    oninput(Number(input.value));
  };
  return el(
    "div",
    { className: "fader" },
    el("label", { htmlFor: id, textContent: tr(label), title: tr(label) }),
    input,
    output,
  );
}
// Built once; status updates move the values in place so a fader never
// disappears under the pointer. A focused fader belongs to the performer.
function renderShared() {
  const s = performanceStatus();
  const value = (key) =>
    key === "energy" ? (s?.energy ?? 0.5) : (s?.shared[key] ?? set.shared[key]);
  if (!$("shared").children.length) {
    for (const key of ["energy", "master", "hue", "zoom", "mirror"]) {
      const def = SHARED.find((item) => item.key === key);
      const target = ["energy", "master"].includes(key)
        ? "shared"
        : "sharedMore";
      $(target).append(
        fader(def, value(def.key), (v) =>
          def.key === "energy"
            ? act({ type: "energy", value: v })
            : act({ type: "shared", [def.key]: v }),
        ),
      );
    }
  }
  for (const def of SHARED) {
    const input = $(`fader-${def.key}`);
    if (input === document.activeElement) continue;
    input.value = value(def.key);
    paintFader(input);
    input.nextElementSibling.value = faderValue(input);
  }
}
let familyKey = null;
function renderFamily() {
  const live = performanceStatus()?.live;
  const clip = liveClip();
  const scene = clip && sceneById(clip.snapshot.scene);
  const key = scene ? `${scene.id}:${live?.look}` : null;
  if (key === familyKey) {
    for (const k of scene ? stageParams(scene) : []) {
      const input = $(`fader-family-${k}`);
      if (!input || input === document.activeElement) continue;
      input.value = clip.snapshot.params[k];
      paintFader(input);
      input.nextElementSibling.value = faderValue(input);
    }
    return;
  }
  familyKey = key;
  $("familyTitle").textContent = scene ? tr(scene.name) : tr("Family");
  $("family").replaceChildren(
    ...(scene
      ? stageParams(scene).map((k) => {
          const def = scene.schema.find((d) => d.key === k);
          return fader(
            { ...def, key: `family-${k}` },
            clip.snapshot.params[k],
            (value) => act({ type: "param", key: k, value }),
          );
        })
      : [
          el("p", {
            className: "note",
            textContent: tr("Controls for the playing family appear here."),
          }),
        ]),
  );
}
// The clip on screen: the stage's own copy (with live tweaks) or the local one.
function liveClip() {
  return stageAlive()
    ? status?.performance?.clip
    : localPerformance?.show.live?.clip;
}
// Re-render faders only when the user isn't dragging one.
const activeIsFader = () => document.activeElement?.type === "range";

function liveLookName(live) {
  const original = lookById(live.look);
  return lookName({
    ...live,
    nameEdited: !original || original.name !== live.name,
  });
}

function renderStatus() {
  const s = performanceStatus();
  const alive = stageAlive();
  // The stage never shows UI on the venue screen after it started (D53):
  // a lost fullscreen is reported here instead.
  const windowed = alive && status.stage.started && !status.stage.fullscreen;
  $("stagePill").textContent = alive
    ? status.stage.started
      ? windowed
        ? tr("Stage not fullscreen · click the stage")
        : tr("Stage live")
      : tr("Stage open · click it to start")
    : tr("Stage not open");
  $("stagePill").className =
    `pill ${alive ? (status.stage.started && !windowed ? "ok" : "warn") : ""}`;
  $("openStage").disabled = alive;
  updateSettingsLock();
  updatePreview();
  if (!alive) renderLocalAudio();
  if (!s) return;
  syncControlPalette(showColors());
  const clock = s.clock;
  if (
    requestedTempo &&
    (!alive ||
      Math.abs(clock.bpm - requestedTempo.bpm) < 0.001 ||
      now() > requestedTempo.until)
  )
    requestedTempo = null;
  const displayedBpm = requestedTempo?.bpm ?? clock.bpm;
  $("bpm").textContent = formatNumber(displayedBpm, 1, 1);
  const source = clock.mode === "manual" ? "manual" : clock.source;
  $("tempoSource").replaceChildren(
    el("span", { className: `light ${source}` }),
    {
      auto: tr("following audio"),
      coast: tr("holding tempo"),
      manual: tr("manual tap"),
    }[source] ?? source,
  );
  [...$("beats").children].forEach((cell, i) =>
    cell.classList.toggle("on", i === Math.floor(clock.beatInBar)),
  );
  $("bar").textContent =
    `${clock.bar + 1} · ${Math.floor(clock.beatInBar) + 1}`;
  const ap = s.autopilot;
  // Random mode shows the bars left of the current clip's random duration.
  $("autopilotReadout").textContent = !ap.enabled
    ? tr("off")
    : ap.active
      ? ap.random
        ? tr("random · {value1}/{value2} bars", {
            value1: ap.nextChangeIn ?? "—",
            value2: ap.duration ?? "—",
          })
        : tr("in order · next in {value1}", { value1: ap.nextChangeIn ?? "—" })
      : tr("paused · back in {value1} bars", { value1: ap.handBackIn });
  const live = s.live;
  const liveScene = live && sceneById(live.scene);
  $("nowReadout").textContent = live
    ? liveLookName(live)
    : s.blackout
      ? tr("black")
      : "—";
  $("nowReadout").title = live
    ? `${liveLookName(live)} · ${tr(liveScene?.name ?? live.scene)}${lookById(live.look) ? "" : tr(" · unsaved draft")}`
    : "";
  catalog?.setStatus(live?.look ?? null, s.pending?.look ?? null);
  syncPlayingLook(live);
  worldPanel?.update(s);
  $("favoritesOnly").ariaPressed = String(set.autopilot.favoritesOnly);
  if (document.activeElement !== $("minRating"))
    $("minRating").value = String(set.autopilot.minRating);
  $("energyReadout").textContent = formatNumber(s.energy, 2, 2);
  $("paletteReadout").textContent =
    tr(paletteById(s.palette)?.name) || (s.palette ? tr("Custom") : "—");
  $("speedReadout").textContent = `${formatNumber(s.speed)}×`;
  applyPreviewSize();
  const st = alive
    ? status.stage
    : {
        width: editorEngine?.width ?? 0,
        height: editorEngine?.height ?? 0,
        fps: localFps,
      };
  $("renderReadout").textContent =
    editorEngine || alive
      ? tr("{value1}×{value2} · {value3} fps", {
          value1: st.width,
          value2: st.height,
          value3: st.fps ? Math.round(st.fps) : "—",
        })
      : "—";
  $("renderReadout").title = alive ? tr("Stage output") : tr("Local preview");
  $("latency").textContent =
    clock.mode === "auto"
      ? tr("latency {value1} ms", { value1: clock.latencyMs })
      : "";
  $("autoClock").ariaPressed = String(clock.mode === "auto");
  for (const id of ["manualBpm", "quickBpm"])
    if (document.activeElement !== $(id)) $(id).value = displayedBpm.toFixed(1);
  $("blackout").ariaPressed = String(s.blackout);
  $("freeze").ariaPressed = String(s.freeze);
  $("previewPause").textContent = s.paused ? tr("Play") : tr("Pause");
  $("previewPause").ariaPressed = String(!!s.paused);
  $("previewPause").ariaLabel = s.paused
    ? tr("Resume playback (Space)")
    : tr("Pause playback (Space)");
  $("flash").ariaPressed = String(s.flash);
  $("autopilot").ariaPressed = String(ap.enabled);
  $("random").ariaPressed = String(ap.random);
  $("half").ariaPressed = String(s.speed === 0.5);
  $("double").ariaPressed = String(s.speed === 2);
  $("normalSpeed").ariaPressed = String(s.speed === 1);
  if (alive) {
    const a = status.audio;
    $("audioMute").checked = !!a.muted;
    $("audioPill").textContent = s.paused
      ? tr("Paused")
      : a.source === "off"
        ? tr("Audio off")
        : `${tr("audio.source." + a.source)} · ${a.muted && a.source !== "input" ? tr("muted · ") : ""}${a.locked ? (a.coasting ? tr("holding") : tr("{value1} BPM", { value1: a.bpm == null ? "—" : formatNumber(a.bpm, 1, 1) })) : tr("listening")}`;
    $("audioPill").className =
      `pill ${a.source === "off" ? "" : a.locked ? "ok" : "warn"}`;
  }
  renderShared();
  rhythmPanel?.update(s);
  if (!activeIsFader()) renderFamily();
  renderChecks();
}

// --- clip editor ------------------------------------------------------------
let editorEngine = null;
try {
  editorEngine = new Engine($("editorCanvas"), scenes, (m) =>
    log(tr("Editor: {value1}", { value1: m })),
  );
  editorEngine.resize(480, 270);
} catch (error) {
  log(tr("Editor preview unavailable: {value1}", { value1: errorText(error) }));
}
if (editorEngine)
  localPerformance = new ControlPreview(editorEngine, set, scenes, now());
const localPreviewContext = $("localPreview").getContext("2d");

// The main preview defaults to native pixels, with optional lower output sizes.
// A live stage supplies its full-resolution stream; only the small Look editor
// renders separately at reduced size while the stage owns the main picture.
const previewLimits = editorEngine ? resolutionLimits(editorEngine.gl) : {};
let localFps = null;
let nativeScreen = null;
function applyPreviewSize() {
  const alive = stageAlive();
  const [w, h] = alive
    ? [480, 270]
    : outputResolution(
        nativeDisplayResolution(
          nativeScreen ?? screen,
          window.devicePixelRatio || 1,
          previewLimits,
        ),
        set.options.outputResolution,
      );
  if (editorEngine && (editorEngine.width !== w || editorEngine.height !== h)) {
    editorEngine.resize(w, h);
    localFps = null;
  }
  if ($("localPreview").width !== w) $("localPreview").width = w;
  if ($("localPreview").height !== h) $("localPreview").height = h;
  const shown = alive ? [status.stage.width, status.stage.height] : [w, h];
  const choice = set.options.outputResolution ?? "native";
  $("previewResolution").textContent =
    `${choice === "native" ? tr("Native · ") : ""}${shown[0]} × ${shown[1]} ⌄`;
  for (const id of ["outputResolution", "setOutputResolution"])
    if ($(id)) $(id).value = choice;
  $("previewNote").hidden = !alive;
}
// Reuse an existing screen-management grant; never interrupt startup with a
// new permission prompt. Open Stage already offers the normal placement flow.
async function watchNativeScreen() {
  if (!window.getScreenDetails || !navigator.permissions) return;
  try {
    const permission = await navigator.permissions.query({
      name: "window-management",
    });
    let details = null;
    const update = async () => {
      if (permission.state !== "granted") {
        nativeScreen = null;
        return;
      }
      if (!details) {
        details = await window.getScreenDetails();
        const refresh = () => {
          nativeScreen = details.currentScreen;
          applyPreviewSize();
        };
        details.addEventListener("currentscreenchange", refresh);
        details.addEventListener("screenschange", refresh);
        for (const display of details.screens)
          display.addEventListener("change", refresh);
      }
      nativeScreen = details.currentScreen;
      applyPreviewSize();
    };
    permission.addEventListener("change", () => {
      update().catch(() => {});
    });
    await update();
  } catch {
    /* Screen dimensions remain available without a grant. */
  }
}
watchNativeScreen();
addEventListener("resize", applyPreviewSize);

applyPreviewSize();
updatePreview();

// --- catalog (D65, D68) ---------------------------------------------------------
let looks = catalogLooks(scenes, set.looks);
let lookIndex = new Map(looks.map((look) => [look.id, look]));
const lookById = (id) => lookIndex.get(id) ?? null;
function reindexLooks() {
  looks = catalogLooks(scenes, set.looks);
  lookIndex = new Map(looks.map((look) => [look.id, look]));
  catalog?.setLooks(looks);
}
let thumbnailErrors = 0;
let variationGeneration = 0;
const variationCards = new Map();
const thumbnails = new Thumbnails({
  paletteIndependent: true,
  previews: PREVIEWS,
  createEngine: () =>
    new Engine(document.createElement("canvas"), scenes, (message) => {
      if (thumbnailErrors++ < 3)
        log(tr("Catalog thumbnails: {value1}", { value1: message }));
    }),
  // Never take time from a transition on the stage or the local preview.
  busy: () =>
    document.hidden ||
    !!editorEngine?.transition ||
    (stageAlive() && !!status?.stage?.transition),
  onReady: (id) => {
    const card = variationCards.get(id);
    if (card) {
      const result = thumbnails.get(id);
      if (result?.url) card.src = result.url;
    } else catalog?.showThumbnail(id);
  },
  onError: (message) => log(message),
});
const catalog = new CatalogPanel({
  looks,
  palette: showColors(),
  families: scenes.map((scene) => ({ id: scene.id, name: scene.name })),
  list: $("catalogList"),
  search: $("catalogSearch"),
  family: $("catalogFamily"),
  show: $("catalogShow"),
  sortButton: $("catalogSort"),
  title: $("catalogTitle"),
  count: $("catalogCount"),
  getRatings: () => set.ratings,
  getFavorites: () => set.favorites,
  keyLabel: (i) => labels[GRID_CODES[i]] ?? "",
  onRate: rate,
  onFavorite: favorite,
  onPlay: (look) => act({ type: "look", id: look.id }),
  onEdit: (look) => selectLook(look.id, true),
  onOrder: setKeys,
  thumbnails,
});
worldPanel = new WorldPanel({
  getSet: () => set,
  act,
  preview: (id) => PREVIEWS[id]?.url,
});
// Harness hooks (tests/browser): the catalog and its thumbnail renderer.
Object.assign(window.__phosphorControl, {
  catalog,
  thumbnails,
  localShow: () => localPerformance?.show,
});

function rhythmEditKey(action) {
  return action.scope === "global"
    ? "global"
    : action.scope === "look"
      ? `look:${action.look}`
      : `family:${action.family}`;
}
function commitRhythm(action) {
  const key = rhythmEditKey(action);
  rhythmEdits.set(key, {
    pattern: structuredClone(action.pattern),
    until: performance.now() + 3000,
  });
  if (action.scope === "global")
    set.rhythm.global = structuredClone(action.pattern);
  else if (action.scope === "family")
    set.rhythm.families[action.family] = structuredClone(action.pattern);
  else {
    const look = set.looks.find((item) => item.id === action.look);
    if (look)
      look.rhythm =
        action.pattern === null ? null : structuredClone(action.pattern);
    if (draft?.id === action.look && !draft.rhythmEdited)
      draft.rhythm = action.pattern && structuredClone(action.pattern);
  }
  // Show.command owns application timing. Sending a full set here would
  // bypass the queued downbeat and interrupt another rhythm target's edits.
  saveSoon();
  act(action);
}
function syncRhythmStatus(rhythm) {
  if (!rhythm?.settings) return;
  const desired = structuredClone(rhythm.settings);
  const overrides = { ...rhythm.overrides };
  for (const [key, edit] of rhythmEdits) {
    const actual =
      key === "global"
        ? desired.global
        : key.startsWith("look:")
          ? (overrides[key.slice(5)] ?? null)
          : desired.families[key.slice(7)];
    if (
      JSON.stringify(actual) === JSON.stringify(edit.pattern) ||
      performance.now() > edit.until
    )
      rhythmEdits.delete(key);
    else if (key === "global") desired.global = structuredClone(edit.pattern);
    else if (key.startsWith("look:"))
      overrides[key.slice(5)] = structuredClone(edit.pattern);
    else desired.families[key.slice(7)] = structuredClone(edit.pattern);
  }
  let changedRhythm = JSON.stringify(set.rhythm) !== JSON.stringify(desired);
  set.rhythm = desired;
  for (const look of set.looks) {
    const pattern = overrides[look.id] ?? null;
    if (JSON.stringify(look.rhythm ?? null) !== JSON.stringify(pattern)) {
      look.rhythm = structuredClone(pattern);
      changedRhythm = true;
    }
  }
  if (changedRhythm) saveSoon();
}
function previewDraftRhythm(pattern) {
  if (!draft || !editorEngine) return;
  if (pattern) {
    const alreadyPreviewing = rhythmPreviewActive;
    rhythmPreviewActive = true;
    draft.rhythm = structuredClone(pattern);
    if (alreadyPreviewing) draft.rhythmEdited = true;
    if (alreadyPreviewing) editDraft();
    else previewDraft();
  } else if (stageAlive()) {
    const frame = status?.status?.rhythm;
    if (frame)
      editorEngine.setRhythmFrame?.({
        ...frame,
        settings: frame.applied,
        overrides: frame.appliedOverrides,
      });
  } else if (rhythmPreviewActive) {
    const clip = draftClip();
    delete clip.rhythm;
    localPerformance?.select(clip, now(), false);
  }
  if (!pattern) rhythmPreviewActive = false;
}
function saveRhythmOverride(target, pattern) {
  if (settingsLocked || !target?.own) return;
  const look = set.looks.find((item) => item.id === target.look);
  if (!look) return;
  if (target.preview && look.snapshot.scene !== target.scene.id) {
    toast(
      tr(
        "Save this draft's new family as an own look before saving its rhythm.",
      ),
    );
    return;
  }
  commitRhythm({
    type: "rhythm",
    scope: "look",
    look: look.id,
    family: look.snapshot.scene,
    pattern,
    quantize: "bar",
  });
  if (draft?.id === look.id) draft.rhythm = pattern && structuredClone(pattern);
  if (draft?.id === look.id) draft.rhythmEdited = false;
  reindexLooks();
  toast(
    pattern
      ? tr("Saved the rhythm for “{value1}”.", { value1: look.name })
      : tr("“{value1}” now uses its family pattern.", { value1: look.name }),
  );
  if (target.preview) previewDraft();
}
rhythmPanel = new RhythmPanel({
  root: $("rhythmControls"),
  scenes,
  getSet: () => set,
  getStatus: performanceStatus,
  getDraft: () => draft,
  onCommand: commitRhythm,
  onDraftPreview: previewDraftRhythm,
  onSaveOverride: saveRhythmOverride,
  isLocked: () => settingsLocked,
});
Object.assign(window.__phosphorControl, { rhythmPanel });

let paletteThumbnailTimer;
const palettePicker = new PalettePicker({
  root: $("paletteControl"),
  palettes: PALETTES,
  value: set.palette,
  isLocked: () => settingsLocked,
  onChange: (value) => {
    set.palette = value;
    localPerformance?.updateSet(set);
    act({ type: "palette", value, beats: 0 });
    if (stageAlive() && draft) editDraft();
    syncControlPalette(showColors());
    catalog.setPalette(showColors());
    saveSoon();
    clearTimeout(paletteThumbnailTimer);
    paletteThumbnailTimer = setTimeout(() => {
      send({ type: "set", set });
    }, 180);
  },
});
syncControlPalette(showColors());

// --- look editor (D68) ---------------------------------------------------------
// Observe playback without auditioning or sending commands back to the show.
// Only a new playing look replaces the editor; ongoing status updates leave
// a manually selected/edited draft alone.
function syncPlayingLook(live) {
  const clip = liveClip();
  if (!live || !clip || clip.id !== live.look) return;
  const changedLook = editorLiveLook !== live.look;
  editorLiveLook = live.look;
  if (changedLook) {
    const look = lookById(live.look);
    clearVariations();
    draft = {
      id: clip.id,
      own: look?.own ?? false,
      base: look?.own ? look.base : (look?.id ?? null),
      name: clip.name,
      snapshot: structuredClone(clip.snapshot),
      palette: clip.palette,
      transition: clip.transition ?? "auto",
      rhythm: clip.rhythm && structuredClone(clip.rhythm),
      rhythmEdited: false,
    };
    rhythmPreviewActive = false;
    editorFollowsLive = true;
    renderEditor();
    catalog.setSelected(look?.id ?? null);
    updateSettingsLock();
  } else if (editorFollowsLive && draft?.id === clip.id) {
    draft.snapshot = structuredClone(clip.snapshot);
    for (const [key, value] of Object.entries(draft.snapshot.params)) {
      const input = $(`fader-param-${key}`);
      if (!input || input === document.activeElement) continue;
      input.value = value;
      paintFader(input);
      input.nextElementSibling.value = faderValue(input);
    }
  } else return;
  if (stageAlive() && editorEngine) {
    const snapshot = { ...draft.snapshot, palette: { ...showColors() } };
    if (changedLook) {
      editorEngine.setLevel(0.5, 0);
      editorEngine.load(snapshot, 0, { energy: 0.5, lookId: clip.id });
    } else editorEngine.setSnapshot(snapshot);
  }
}

// The draft as a playable clip; its id is the look's, so live edits of the
// look on screen update it in place.
function draftClip() {
  const clip = clipFrom(draft.snapshot, {
    id: draft.id,
    name: draft.name,
    palette: draft.palette,
    transition: draft.transition,
  });
  const rhythm = rhythmPanel?.preview
    ? rhythmPanel.previewPattern()
    : draft.rhythmEdited
      ? draft.rhythm
      : null;
  clip.snapshot.palette = { ...showColors() };
  if (rhythm) clip.rhythm = structuredClone(rhythm);
  return clip;
}
function previewDraft(manual = true) {
  if (!editorEngine || !draft) return;
  editorFollowsLive = false;
  resumeLocalPerformance();
  if (stageAlive()) {
    editorEngine.setLevel(0.5, 0);
    editorEngine.load(draftClip().snapshot, 0, {
      energy: 0.5,
      lookId: draft.id,
    });
  } else {
    localPerformance.select(draftClip(), now(), manual);
    // This audition is already reflected in the editor. The next periodic
    // status must not replace edits typed since the selection.
    editorLiveLook = localPerformance.show.live?.clip.id ?? editorLiveLook;
  }
}
function editDraft() {
  if (!editorEngine || !draft) return;
  editorFollowsLive = false;
  resumeLocalPerformance();
  if (stageAlive()) editorEngine.setSnapshot(draftClip().snapshot);
  else {
    localPerformance.edit(draftClip(), now());
    editorLiveLook = localPerformance.show.live?.clip.id ?? editorLiveLook;
  }
}
// preview: show the look in the main preview; manual: that counts as a
// performer takeover (opening the window or importing a set does not).
function selectLook(id, preview = true, manual = true) {
  const look = lookById(id);
  if (!look) return;
  editorFollowsLive = false;
  clearVariations();
  const palette = look.palette ?? lookPalette(look);
  const snapshot = structuredClone(look.snapshot);
  if (palette !== "custom")
    snapshot.palette = {
      ...(paletteById(palette)?.colors ?? snapshot.palette),
    };
  draft = {
    id: look.id,
    own: look.own,
    base: look.own ? look.base : look.id,
    name: look.name,
    snapshot,
    palette,
    transition: look.transition ?? "auto",
    rhythm: look.rhythm && structuredClone(look.rhythm),
    rhythmEdited: false,
  };
  rhythmPreviewActive = false;
  if (rhythmPanel?.preview) previewDraftRhythm(rhythmPanel.previewPattern());
  else if (preview) previewDraft(manual);
  renderEditor();
  catalog.setSelected(look.id);
  updateSettingsLock();
  rhythmPanel?.update();
}
function field(label, input) {
  return el(
    "label",
    { className: "field" },
    el("span", { textContent: label }),
    input,
  );
}
function renderEditor() {
  if (!draft) {
    $("editorTitle").textContent = tr("Look");
    $("editor").replaceChildren(
      el("p", {
        className: "note",
        textContent: tr("Pick a look in the catalog."),
      }),
    );
    return;
  }
  const look = lookById(draft.id);
  $("editorTitle").textContent = draft.own
    ? (look?.name ?? draft.name)
    : lookName(draft);
  $("editorFamily").textContent = tr(sceneById(draft.snapshot.scene)?.name);
  $("saveLook").hidden = !draft.own;
  $("deleteLook").hidden = !draft.own;
  const scene = sceneById(draft.snapshot.scene);
  const name = el("input", {
    value: lookName(draft),
    maxLength: 80,
    oninput: () => {
      editorFollowsLive = false;
      draft.name = name.value.trim() || tr("Untitled");
      draft.nameEdited = true;
    },
  });
  const family = el(
    "select",
    {
      onchange: () => {
        clearVariations();
        const next = sceneById(family.value);
        draft.snapshot = {
          ...presetSnapshot(next),
          palette: draft.snapshot.palette,
        };
        draft.name = next.presets[0].name;
        draft.nameEdited = false;
        draft.base = `${next.id}:0`;
        draft.rhythm = null;
        previewDraft();
        renderEditor();
      },
    },
    ...scenes.map((s) =>
      el("option", {
        value: s.id,
        textContent: tr(s.name),
        selected: s.id === scene.id,
      }),
    ),
  );
  const preset = el(
    "select",
    {
      onchange: () => {
        const index = Number(preset.value);
        if (index < 0) return;
        clearVariations();
        draft.snapshot = {
          ...presetSnapshot(scene, index),
          palette: draft.snapshot.palette,
        };
        draft.name = scene.presets[index].name;
        draft.nameEdited = false;
        draft.base = `${scene.id}:${index}`;
        previewDraft();
        renderEditor();
      },
    },
    el("option", {
      value: -1,
      textContent: tr("Start from an authored look…"),
    }),
    ...scene.presets.map((p, i) =>
      el("option", { value: i, textContent: tr(p.name) }),
    ),
  );
  const params = scene.schema.map((def) =>
    fader(
      { ...def, key: `param-${def.key}` },
      draft.snapshot.params[def.key],
      (value) => {
        draft.snapshot.params[def.key] = value;
        editDraft();
      },
    ),
  );
  const seed = el("input", {
    type: "number",
    min: 0,
    max: 2147483647,
    step: 1,
    value: draft.snapshot.seed,
    onchange: () => {
      draft.snapshot.seed = Math.max(
        0,
        Math.min(2147483647, Math.round(Number(seed.value)) || 0),
      );
      previewDraft();
    },
  });
  const transition = el(
    "select",
    {
      onchange: () => {
        editorFollowsLive = false;
        draft.transition = transition.value;
      },
    },
    ...TRANSITIONS.map((kind) =>
      el("option", {
        value: kind,
        textContent: {
          auto: tr("Auto"),
          crossfade: tr("Crossfade"),
          cut: tr("Cut (downbeat, manual only)"),
          dissolve: tr("Noise dissolve"),
          melt: tr("Feedback melt"),
        }[kind],
        selected: kind === (draft.transition ?? "auto"),
      }),
    ),
  );
  family.ariaLabel = tr("Look family");
  $("editorFamily").replaceChildren(family);
  const heroKeys = stageParams(scene);
  $("editor").replaceChildren(
    ...params.filter((_, index) => heroKeys.includes(scene.schema[index].key)),
  );
  $("editorMore").replaceChildren(
    field(tr("Name"), name),
    field(tr("Look"), preset),
    field(tr("Transition"), transition),
    ...params.filter((_, index) => !heroKeys.includes(scene.schema[index].key)),
    field(tr("Seed"), seed),
  );
}
function ownLookFromDraft(id) {
  const rhythm = draft.rhythmEdited
    ? draft.rhythm
    : set.looks.find((look) => look.id === draft.id)?.rhythm;
  return {
    id,
    name: lookName(draft).trim() || tr("Untitled"),
    base: draft.base ?? null,
    snapshot: structuredClone(draft.snapshot),
    palette: draft.palette,
    transition: draft.transition ?? "auto",
    // Saving ordinary picture changes preserves an existing override.
    rhythm: rhythm
      ? validatePattern(
          rhythm,
          effectDefinitions(sceneById(draft.snapshot.scene)),
        )
      : null,
  };
}
// Saving never touches an authored look: it creates or updates an own look.
function saveLook(asNew) {
  if (!draft || settingsLocked) return;
  if (!asNew && draft.own) {
    set.looks = set.looks.map((look) =>
      look.id === draft.id ? ownLookFromDraft(draft.id) : look,
    );
    changed();
    reindexLooks();
    toast(tr("Saved “{value1}”.", { value1: draft.name }));
    return;
  }
  const look = ownLookFromDraft(freeLookId(set));
  set.looks = [...set.looks, look];
  changed();
  reindexLooks();
  selectLook(look.id, false);
  catalog.reveal(look.id);
  toast(
    tr("“{value1}” is now an own look in the catalog.", { value1: look.name }),
  );
}
function deleteLook() {
  if (!draft?.own || settingsLocked) return;
  const { id, base, name } = draft;
  const used = set.worlds?.some((w) => w.states.some((s) => s.look === id));
  confirm(
    tr("Delete the own look “{value1}”? Authored looks stay.", {
      value1: name,
    }) +
      (used
        ? " " +
          tr(
            "Its world developments will also be removed; worlds need at least two developments.",
          )
        : ""),
    () => {
      if (settingsLocked) return;
      set.looks = set.looks.filter((look) => look.id !== id);
      set.worlds = withoutWorldLook(set.worlds, id);
      delete set.ratings[id];
      set.favorites = set.favorites.filter((f) => f !== id);
      set.keys = set.keys.map((k) => (k === id ? null : k));
      changed();
      reindexLooks();
      selectLook(lookById(base) ? base : looks[0].id, false);
    },
  );
}
function clearVariations() {
  for (const id of variationCards.keys()) thumbnails.invalidate(id);
  variationCards.clear();
  $("variations").hidePopover();
  $("variations").replaceChildren();
}
function breed() {
  if (!draft || settingsLocked) return;
  clearVariations();
  const generation = ++variationGeneration;
  const parentDraft = draft;
  const scene = sceneById(draft.snapshot.scene);
  const parent = { seed: draft.snapshot.seed, params: draft.snapshot.params };
  const children = Array.from({ length: 6 }, () =>
    mutatePreset(scene, parent, {
      seed: (Math.random() * 0x7fffffff) >>> 0,
      strength: 0.2,
    }),
  );
  $("variations").replaceChildren(
    ...children.map((child, index) => {
      const id = `variation:${generation}:${index}`;
      const thumb = el("img", {
        alt: "",
        width: 160,
        height: 90,
        style: "width:100%;height:auto;border-radius:4px;background:#000",
      });
      variationCards.set(id, thumb);
      thumbnails.want(id, {
        ...structuredClone(draft.snapshot),
        palette: { ...showColors() },
        seed: child.seed,
        params: { ...child.params },
      });
      return el(
        "button",
        {
          className: "cell",
          ariaLabel: tr("Variation {value1}", { value1: index + 1 }),
          onclick: () => {
            if (draft !== parentDraft || settingsLocked) return;
            draft.snapshot = {
              ...draft.snapshot,
              seed: child.seed,
              params: { ...child.params },
            };
            $("variations").hidePopover();
            previewDraft();
            renderEditor();
          },
        },
        thumb,
        el("span", {
          className: "family",
          textContent: tr("Variation {value1}", { value1: index + 1 }),
        }),
      );
    }),
  );
  $("variations").showPopover();
}
let editorLoop = 0;
let lastLocalStatus = 0;
let fpsFrames = 0,
  fpsSince = 0;
function animateEditor(ms) {
  requestAnimationFrame(animateEditor);
  if (!editorEngine || document.hidden || ms - editorLoop < 1000 / 30) return;
  const dt = Math.min(0.1, (ms - editorLoop) / 1000);
  editorLoop = ms;
  fpsFrames++;
  if (ms - fpsSince >= 1000) {
    localFps = fpsSince ? (fpsFrames * 1000) / (ms - fpsSince) : null;
    fpsFrames = 0;
    fpsSince = ms;
  }
  resumeLocalPerformance();
  let presented = false;
  if (stageAlive()) {
    editorEngine.beat = performanceBeat(status, lastStatusAt / 1000, ms / 1000);
    const frame = status.status.rhythm;
    if (frame)
      editorEngine.setRhythmFrame?.({
        beat: editorEngine.beat,
        origin: frame.origin,
        settings: frame.applied,
        activations: frame.activations,
        overrides: {
          ...frame.appliedOverrides,
          ...(rhythmPanel?.preview && draft
            ? { [draft.id]: rhythmPanel.previewPattern() }
            : {}),
        },
        style: frame.style,
        enabled: true,
      });
    if (!status.status.paused) editorEngine.advance(dt, false);
  } else presented = !!localPerformance?.tick(ms / 1000, dt);
  if (!$("localPreview").hidden && presented)
    localPreviewContext.drawImage($("editorCanvas"), 0, 0);
  if (!stageAlive() && ms - lastLocalStatus >= 200) {
    lastLocalStatus = ms;
    renderStatus();
  }
}

// --- set, audio, checks ------------------------------------------------------
function setOutputResolution(choice) {
  if (settingsLocked || !OUTPUT_RESOLUTIONS.includes(choice)) return;
  set.options.outputResolution = choice;
  changed();
  applyPreviewSize();
}
function resolutionOptions() {
  return OUTPUT_RESOLUTIONS.map((choice) =>
    el("option", {
      value: choice,
      textContent:
        choice === "native"
          ? tr("Native · full display")
          : tr("Up to {value1} px · longest side", { value1: choice }),
      selected: choice === (set.options.outputResolution ?? "native"),
    }),
  );
}
function renderSetFields() {
  if ($("setFields").children.length) {
    for (const [id, value] of [
      ["showName", set.name],
      ["setOutputResolution", set.options.outputResolution ?? "native"],
      ["autopilotEvery", set.autopilot.everyBars],
      ...["bloom", "echo", "chroma", "grain", "vignette"].map((key) => [
        `fader-opt-${key}`,
        set.options[key],
      ]),
    ]) {
      const input = $(id);
      if (input === document.activeElement) continue;
      input.value = value;
      if (input.type === "range") {
        paintFader(input);
        input.nextElementSibling.value = faderValue(input);
      }
    }
    $("reducedMotion").checked = set.options.reducedMotion;
    return;
  }
  const name = el("input", {
    id: "showName",
    value: set.name,
    maxLength: 80,
    onchange: () => {
      set.name = name.value || tr("Untitled show");
      changed();
    },
  });
  const every = el(
    "select",
    {
      id: "autopilotEvery",
      title: tr(
        "In-order autopilot changes clip every N bars; Random plays each clip 8, 12 or 16 bars",
      ),
      onchange: () => {
        set.autopilot.everyBars = Number(every.value);
        changed();
      },
    },
    ...AUTOPILOT_BARS.map((b) =>
      el("option", {
        value: b,
        textContent: tr("{value1} bars", { value1: b }),
        selected: b === set.autopilot.everyBars,
      }),
    ),
  );
  const budget = el(
    "select",
    {
      id: "setOutputResolution",
      onchange: (event) => setOutputResolution(event.target.value),
    },
    ...resolutionOptions(),
  );
  const option = (key, label) =>
    fader(
      { key: `opt-${key}`, label, min: 0, max: 1, step: 0.01 },
      set.options[key],
      (value) => {
        set.options[key] = value;
        changed();
      },
    );
  const reduced = el("input", {
    id: "reducedMotion",
    type: "checkbox",
    checked: set.options.reducedMotion,
    onchange: () => {
      set.options.reducedMotion = reduced.checked;
      changed();
    },
  });
  $("setFields").replaceChildren(
    field(tr("Show name"), name),
    field(tr("In order every"), every),
    field(tr("Stage resolution"), budget),
    option("bloom", tr("Bloom ceiling")),
    option("echo", tr("Echo ceiling")),
    option("chroma", tr("Chroma ceiling")),
    option("grain", tr("Grain ceiling")),
    option("vignette", tr("Vignette ceiling")),
    field(tr("Reduced motion"), reduced),
  );
}
function renderDevices(devices) {
  const current = $("audioDevice").value;
  $("audioDevice").replaceChildren(
    el("option", { value: "", textContent: tr("Default input") }),
    ...devices.map((d) =>
      el("option", {
        value: d.id,
        textContent: d.name,
        selected: d.id === current,
      }),
    ),
  );
}
let micPermission = "unknown";
navigator.permissions
  ?.query({ name: "microphone" })
  .then((p) => {
    micPermission = p.state;
    p.onchange = () => (micPermission = p.state);
  })
  .catch(() => {});
const manualChecks = [
  tr("Laptop on mains power"),
  tr("Do Not Disturb on, notifications off"),
  tr("Sleep and screen saver off"),
  tr("Chrome: “Warn before quitting (⌘Q)” on"),
  tr("Projector / LED wall resolution confirmed with the framing pattern"),
];
const ticked = new Set();
// Automatic preflight checks (D10), from the stage's status.
function preflight() {
  const st = stageAlive() ? status?.stage : null,
    a = status?.audio;
  return [
    [tr("Stage open and started"), !!st?.started],
    [
      tr("Stage fullscreen on the external screen"),
      !!st?.fullscreen && st.external === true,
    ],
    [tr("Screen wake lock held"), !!st?.wakeLock],
    [tr("Framing pattern shown on the stage"), !!st?.patternShown],
    [
      tr("Microphone permission granted for this site"),
      micPermission === "granted",
    ],
    [
      tr("Live audio input has signal (not the demo or a file)"),
      !!a && a.source === "input" && a.level > 0.02,
    ],
    [
      tr("Beat tracker locked (or manual tempo set)"),
      !!(a?.locked || status?.status.clock.mode === "manual"),
    ],
    [tr("No GPU errors"), st?.counters.gpuErrors === 0],
  ];
}
const checkRows = [];
function renderChecks() {
  const auto = preflight();
  if (!checkRows.length)
    $("checks").replaceChildren(
      ...auto.map(([label]) => {
        const light = el("span");
        const state = el("span", { className: "state" });
        checkRows.push({ light, state });
        return el("div", { className: "check" }, light, label, state);
      }),
      ...manualChecks.map((label) => {
        const box = el("input", {
          type: "checkbox",
          checked: ticked.has(label),
          onchange: () =>
            box.checked ? ticked.add(label) : ticked.delete(label),
        });
        return el("label", { className: "check" }, box, label);
      }),
    );
  auto.forEach(([, ok], index) => {
    checkRows[index].light.className = `light ${ok ? "auto" : "coast"}`;
    checkRows[index].state.textContent = ok ? tr("ok") : tr("check");
  });
}

// --- optional settings lock --------------------------------------------------
function confirm(text, yes) {
  $("confirmText").textContent = text;
  $("confirm").hidden = false;
  $("confirmYes").onclick = () => {
    $("confirm").hidden = true;
    yes();
  };
  $("confirmNo").onclick = () => ($("confirm").hidden = true);
  $("confirmYes").focus();
}
function updateSettingsLock() {
  const alive = stageAlive();
  if (!alive) settingsLocked = false;
  $("settingsLock").disabled = !alive;
  $("settingsLock").checked = settingsLocked;
  for (const input of document.querySelectorAll(
    ".settings-controls input, .settings-controls select, .settings-controls button",
  ))
    input.disabled =
      settingsLocked && !["exportSet", "auditionLook"].includes(input.id);
  // Rating, favourites, search, Play and Edit stay available; saving or
  // deleting own looks is a configuration change.
  for (const id of ["saveLook", "saveAsLook", "deleteLook"])
    $(id).disabled = settingsLocked;
  for (const id of ["useInput", "audioDevice", "audioFile"])
    $(id).disabled = settingsLocked || !alive;
  $("audioStageNote").hidden = alive;
  for (const id of ["pattern", "exportLog"]) $(id).disabled = !alive;
  if (rhythmPanel?.preview && settingsLocked) rhythmPanel.setPreview(false);
  // A MIDI learn started before locking must not alter the mappings later.
  if (settingsLocked) {
    midiLearn = null;
    $("midiLearn").textContent = tr("Learn next control");
  }
}
$("settingsLock").onchange = () => {
  settingsLocked = stageAlive() && $("settingsLock").checked;
  if (settingsLocked) audioRequest++;
  updateSettingsLock();
};

// --- wiring ---------------------------------------------------------------------------
$("openStage").onclick = openStage;
$("tap").onclick = () => act({ type: "tap" });
$("downbeat").onclick = () => act({ type: "downbeat" });
$("nudgeBack").onclick = () => act({ type: "nudge", direction: -1 });
$("nudgeForward").onclick = () => act({ type: "nudge", direction: 1 });
$("autoClock").onclick = () => setClock("auto");
for (const id of ["manualBpm", "quickBpm"])
  $(id).onchange = () => {
    setClock("manual", $(id).valueAsNumber);
    $(id).value = set.clock.manualBpm.toFixed(1);
  };
$("quickTap").onclick = () => act({ type: "tap" });
for (const [id, delta] of [
  ["tempoSlower", -1],
  ["tempoFaster", 1],
])
  $(id).onclick = () => setClock("manual", Number($("quickBpm").value) + delta);
$("outputResolution").replaceChildren(...resolutionOptions());
$("outputResolution").onchange = (event) =>
  setOutputResolution(event.target.value);
$("blackout").onclick = () => act({ type: "blackout" });
$("safe").onclick = () => act({ type: "safe" });
$("freeze").onclick = () => act({ type: "freeze" });
$("previewPause").onclick = () => act({ type: "pause" });
$("autopilot").onclick = () => act({ type: "autopilot" });
$("random").onclick = () => act({ type: "random" });
$("next").onclick = () => act({ type: "next" });
$("favoritesOnly").onclick = () => {
  set.autopilot.favoritesOnly = !set.autopilot.favoritesOnly;
  changed();
};
$("minRating").replaceChildren(
  ...Array.from({ length: MAX_RATING + 1 }, (_, r) =>
    el("option", {
      value: r,
      textContent: r ? `≥ ${r} ★` : tr("any rating"),
    }),
  ),
);
$("minRating").onchange = () => {
  set.autopilot.minRating = Number($("minRating").value);
  changed();
};
$("normalSpeed").onclick = () => act({ type: "speed", value: 1 });
$("half").onclick = () => act({ type: "speed", value: 0.5 });
$("double").onclick = () => act({ type: "speed", value: 2 });
$("flash").addEventListener("keydown", (event) => {
  if (
    event.shiftKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    ![" ", "Enter"].includes(event.key)
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  if (!event.repeat) holdFlash(true);
});
$("flash").addEventListener("keyup", (event) => {
  if (![" ", "Enter"].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  holdFlash(false);
});
$("flash").addEventListener("blur", () => {
  if (heldFlash) holdFlash(false);
});
$("flash").onpointerdown = (event) => {
  if (event.button === 0) holdFlash(true);
};
for (const end of ["pointerup", "pointerleave", "pointercancel"])
  $("flash").addEventListener(end, () => {
    if (heldFlash) holdFlash(false);
  });
$("saveLook").onclick = () => saveLook(false);
$("saveAsLook").onclick = () => saveLook(true);
$("deleteLook").onclick = deleteLook;
$("auditionLook").onclick = () =>
  draft && act({ type: "audition", clip: draftClip() });
$("breedLook").onclick = breed;
function download(name, text) {
  const blob = new Blob([text], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$("exportSet").onclick = () =>
  download(
    `${set.name.replace(/[^\w-]+/g, "_") || "phosphor"}.phosphor.json`,
    JSON.stringify(set, null, 2),
  );
$("exportLog").onclick = () => send({ type: "log" });

// --- MIDI learn (D5) ---------------------------------------------------------------
const midiEdges = new Map();
let midiLearn = null;
const midi = new MidiInput(
  (message) => {
    const clip = liveClip();
    const scene = clip && sceneById(clip.snapshot.scene);
    const familyParam = (i, v) => {
      const key = scene && stageParams(scene)[i];
      const def = key && scene.schema.find((d) => d.key === key);
      if (!def) return null;
      const value = def.min + v * (def.max - def.min);
      return { key, value: def.step === 1 ? Math.round(value) : value };
    };
    const result = routeMidi(
      message,
      set.midi,
      midiEdges,
      midiLearn,
      familyParam,
    );
    if (result.error) toast(result.error);
    if (result.maps) {
      set.midi = result.maps;
      toast(
        tr("Learnt {value1} {value2} → {value3}", {
          value1: message.type,
          value2: message.number,
          value3: midiTargetName(midiLearn),
        }),
      );
      midiLearn = null;
      $("midiLearn").textContent = tr("Learn next control");
      changed();
      renderMidi();
    }
    for (const action of result.actions) act(action);
  },
  (text) => log(tr("MIDI: {value1}", { value1: text })),
);
function midiTargetName(target) {
  if (target?.startsWith("slot."))
    return tr("Catalog key {value1}", { value1: Number(target.slice(5)) + 1 });
  return tr("midi." + target);
}
function renderMidi() {
  if (!$("midiTarget").children.length)
    $("midiTarget").replaceChildren(
      ...MIDI_TARGETS.map((target) =>
        el("option", { value: target, textContent: midiTargetName(target) }),
      ),
    );
  $("midiMaps").replaceChildren(
    ...set.midi.map((m, i) =>
      el(
        "li",
        {},
        `${m.type} ${m.channel + 1}/${m.number} → ${midiTargetName(m.target)} `,
        el("button", {
          textContent: tr("Forget"),
          onclick: () => {
            set.midi.splice(i, 1);
            changed();
            renderMidi();
          },
        }),
      ),
    ),
  );
}
$("midiConnect").onclick = () =>
  midi.connect().catch((error) => toast(errorText(error)));
$("midiLearn").onclick = () => {
  midiLearn = midiLearn ? null : $("midiTarget").value;
  $("midiLearn").textContent = midiLearn
    ? tr("Move a control for {value1}…", { value1: midiTargetName(midiLearn) })
    : tr("Learn next control");
};
$("importSet").onchange = async () => {
  const file = $("importSet").files[0];
  $("importSet").value = "";
  if (!file) return;
  try {
    if (file.size > 32 * 1024 * 1024)
      throw new Error(tr("Sets are limited to 32 MB"));
    const result = parseShowSet(JSON.parse(await file.text()), scenes);
    if (settingsLocked) {
      toast(tr("Unlock settings before importing a set."));
      return;
    }
    set = result.set;
    set.palette ??= "symbiosis";
    palettePicker.setValue(set.palette);
    catalog.setPalette(showColors());
    rhythmEdits.clear();
    rhythmPanel?.setPreview(false);
    $("importReport").replaceChildren(
      ...result.report.map((line) => el("li", { textContent: line })),
    );
    changed();
    reindexLooks(); // the imported set brings its own looks and ratings
    catalog.refresh();
    selectLook(catalog.first() ?? looks[0].id, true, false);
    toast(tr("Imported “{value1}”.", { value1: set.name }));
  } catch (error) {
    toast(tr("Import failed: {value1}", { value1: errorText(error) }));
  }
};
$("useInput").onclick = async () => {
  if (settingsLocked || !stageAlive()) return;
  const request = ++audioRequest;
  const requestedStage = stageWindow;
  demoRequested = false;
  stopLocalDemo();
  renderLocalAudio();
  try {
    // Ask in the controls so the stage never shows a permission prompt (D10).
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch (error) {
    if (request === audioRequest)
      toast(
        tr("Microphone permission: {value1}", { value1: errorText(error) }),
      );
    return;
  }
  if (
    request !== audioRequest ||
    settingsLocked ||
    !stageAlive() ||
    stageWindow !== requestedStage
  )
    return;
  send({
    type: "audio",
    source: "input",
    deviceId: $("audioDevice").value,
    muted: $("audioMute").checked,
  });
  send({ type: "devices" });
};
$("audioFile").onchange = () => {
  const file = $("audioFile").files[0];
  $("audioFile").value = "";
  if (settingsLocked || !stageAlive()) return;
  if (file) {
    audioRequest++;
    demoRequested = false;
    stopLocalDemo();
    renderLocalAudio();
    send({
      type: "audio",
      source: "file",
      file,
      muted: $("audioMute").checked,
    });
  }
};
$("useDemo").onclick = () => {
  audioRequest++;
  demoRequested = true;
  syncLocalDemo();
  send({ type: "audio", source: "demo", muted: $("audioMute").checked });
};
$("audioOff").onclick = () => {
  audioRequest++;
  demoRequested = false;
  stopLocalDemo();
  renderLocalAudio();
  send({ type: "audio", source: "off", muted: $("audioMute").checked });
};
$("audioMute").onchange = () => {
  send({ type: "audio-mute", muted: $("audioMute").checked });
  demoAudio.mute($("audioMute").checked);
  renderLocalAudio();
};
$("pattern").onclick = () => {
  const on = $("pattern").ariaPressed !== "true";
  $("pattern").ariaPressed = String(on);
  send({ type: "pattern", on });
};
function render() {
  $("setName").textContent = set.name;
  renderShared();
  renderEditor();
  renderSetFields();
  renderChecks();
  renderMidi();
  renderStatus();
  updateSettingsLock();
}
window.addEventListener("beforeunload", () => {
  clearTimeout(saveTimer);
  try {
    saveSet(localStorage, set);
  } catch {}
});
setInterval(() => {
  if (resumeLocalPerformance()) renderStatus();
  syncLocalDemo();
}, 1000);

// A freshly opened window starts on the newest complete release. Once the
// performer has interacted, or while the stage or any other Phosphor window
// is open, the running generation stays pinned and the top bar offers the
// explicit updater instead.
if ("serviceWorker" in navigator) {
  const opened = performance.now();
  let touched = false;
  for (const type of ["pointerdown", "keydown"])
    addEventListener(type, () => (touched = true), {
      capture: true,
      once: true,
    });
  const activate = (worker) =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve({}), 5000);
      channel.port1.onmessage = ({ data }) => {
        clearTimeout(timer);
        resolve(data ?? {});
      };
      worker.postMessage({ type: "activate-release" }, [channel.port2]);
    });
  navigator.serviceWorker
    .register("./sw.js", { updateViaCache: "none" })
    .then((registration) => {
      let pending = false;
      const notify = async () => {
        // A first install has nothing older to replace.
        const worker = registration.waiting;
        if (!worker || !registration.active || pending) return;
        pending = true;
        if (!touched && performance.now() - opened < 20000) {
          const reload = () => location.reload();
          navigator.serviceWorker.addEventListener("controllerchange", reload);
          if ((await activate(worker)).ready) return;
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            reload,
          );
        }
        $("updateReady").hidden = false;
        log(
          tr(
            "New release cached. Close the stage and other Phosphor tabs/windows, then open Update app in this tab; saved sets are retained.",
          ),
        );
      };
      notify();
      registration.addEventListener("updatefound", () =>
        registration.installing?.addEventListener("statechange", notify),
      );
      registration.update().catch(() => {});
    })
    .catch(() =>
      log(tr("Offline cache unavailable here (needs HTTPS or localhost).")),
    );
}

setupControlUI();
addEventListener("phosphor-theme-change", () =>
  translateDocument($("themeToggle")),
);
translateDocument($("themeToggle"));
labels = await keyLabels();
catalog.refreshKeys();
// A fresh window opens on the featured world and tours the library from it
// (owner direction 2026-10-15); a running Stage replaces this through hello.
const opening = (set.worlds ?? []).find((w) => w.id === FEATURED_WORLD);
selectLook(
  opening?.states[0].look ?? catalog.first() ?? looks[0].id,
  !opening,
  false,
);
if (opening) {
  worldPanel.setView(true);
  act({ type: "world-play", id: opening.id, manual: false });
}
render();
send({ type: "hello" });
send({ type: "devices" });
requestAnimationFrame(animateEditor);
