// Control window: owns set editing and local performance until a stage connects.
// The stage owns live playback once open; control reloads never stop the show.
import scenes from "./scenes.mjs";
import { Engine } from "./engine.mjs";
import { ControlPreview } from "./control-preview.mjs";
import { presetSnapshot, DEFAULT_PALETTE } from "./session.mjs";
import { MOODS, PALETTES, paletteById } from "./palettes.mjs";
import {
  validateShowSet,
  parseShowSet,
  clipFrom,
  freeLookId,
  KEYS,
  TRANSITIONS,
  AUTOPILOT_BARS,
  PIXEL_BUDGETS,
  NATIVE_BUDGET,
  MIDI_TARGETS,
} from "./show-set.mjs";
import { loadSet, saveSet } from "./show-storage.mjs";
import { actionFor, keyLabels, GRID_CODES } from "./keymap.mjs";
import { mutatePreset } from "./evolution.mjs";
import { AudioEngine, MidiInput } from "./audio.mjs";
import { routeMidi } from "./midi-map.mjs";
import {
  catalogLooks,
  lookPalette,
  MAX_RATING,
  OWN_PREFIX,
} from "./catalog.mjs";
import { Thumbnails } from "./catalog-thumbs.mjs";
import { CatalogPanel } from "./control-catalog.mjs";

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
let status = null; // last stage status
let lastStatusAt = -Infinity; // no stage heard yet (0 would read as alive for 2 s)
let labels = {};
// The look in the editor (D68): { id, own, base, name, snapshot, palette,
// transition }. Edits stay a draft until saved as an own look.
let draft = null;
let settingsLocked = false;
let localPerformance = null;
let handoffPending = false;
let stageWindow = null;
let saveTimer = null;

// --- messages --------------------------------------------------------------
function log(message) {
  const item = el("li", {
    textContent: `${new Date().toLocaleTimeString()} · ${message}`,
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
      toast(`Could not save locally (${error.message}). Export the set.`);
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
    toast("The stage is already running.");
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
      "The browser blocked the stage window. Allow pop-ups for this site, then click Open stage again.",
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
      log("Only one screen found: drag the stage window to the projector.");
      return;
    }
    stageWindow.moveTo(external.availLeft, external.availTop);
    stageWindow.resizeTo(external.availWidth, external.availHeight);
    log(`Stage placed on ${external.label || "the external screen"}.`);
  } catch {
    log("Drag the stage window to the projector screen.");
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
  if (status.performance) localPerformance?.restore(status.performance, now());
  status = null;
  $("preview").srcObject = null;
  return true;
}
function performanceStatus() {
  resumeLocalPerformance();
  return stageAlive() ? status?.status : localPerformance?.status(now());
}
function act(action) {
  resumeLocalPerformance();
  if (stageAlive()) send({ type: "action", action });
  else localPerformance?.command(action, now());
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
  resumeLocalPerformance();
  if (stageAlive()) send({ type: "clock", mode, bpm });
  else if (mode === "auto") localPerformance?.show.clock.resumeAuto(now());
  else if (Number.isFinite(bpm))
    localPerformance?.show.clock.setManualBpm(now(), bpm);
  renderStatus();
}

// Audition the demo locally until the stage takes ownership of audio.
const demoAudio = new AudioEngine(() => renderLocalAudio());
let demoRequested = true;
let demoStarting = false;
function renderLocalAudio() {
  if (stageAlive()) return;
  const playing =
    demoAudio.kind === "demo" && demoAudio.context?.state === "running";
  $("audioPill").textContent = playing
    ? demoAudio.muted
      ? "Demo · muted"
      : "Demo · 120 BPM"
    : demoRequested
      ? "Demo · click to hear"
      : "Audio off";
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
  if (demoAudio.kind === "demo") {
    demoAudio.context
      .resume()
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
      toast(`Demo audio: ${error.message}`);
    })
    .finally(() => {
      demoStarting = false;
      renderLocalAudio();
    });
}
// Do not ask for microphone access or create an audio context on page load.
for (const kind of ["click", "keydown"]) addEventListener(kind, syncLocalDemo);
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
      set.autopilot.enabled = data.status.autopilot.enabled;
      set.autopilot.random = data.status.autopilot.random;
      renderStatus();
      break;
    case "stage-ready":
      log("Stage opened.");
      if (handoffPending && localPerformance) {
        send({ type: "preview-state", state: localPerformance.state(now()) });
        handoffPending = false;
      }
      stopLocalDemo();
      send({ type: "set", set });
      break;
    case "stage-started":
      log("Stage started (audio + fullscreen).");
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
      log(`Audio: ${data.text}`);
      break;
  }
};

// --- keys --------------------------------------------------------------------
for (const kind of ["keydown", "keyup"])
  window.addEventListener(kind, (event) => {
    if (!$("confirm").hidden) return;
    // Space belongs to a focused native checkbox, not the tap-tempo shortcut.
    if (
      event.code === "Space" &&
      event.target?.matches?.('input[type="checkbox"], input[type="radio"]')
    )
      return;
    const action = actionFor(event);
    if (!action) return;
    event.preventDefault();
    act(action);
  });

// --- rendering: readouts -------------------------------------------------------
const SHARED = [
  { key: "master", label: "Master", min: 0, max: 1, step: 0.01 },
  { key: "energy", label: "Energy", min: 0, max: 1, step: 0.01 },
  { key: "hue", label: "Hue", min: -0.5, max: 0.5, step: 0.01 },
  { key: "zoom", label: "Zoom", min: 0.5, max: 2, step: 0.01 },
  { key: "mirror", label: "Mirror", min: 1, max: 12, step: 1 },
];
function fader({ key, label, min, max, step }, value, oninput) {
  const id = `fader-${key}`;
  const input = el("input", { id, type: "range", min, max, step, value });
  const output = el("output", {
    htmlFor: id,
    value: Number(value).toFixed(step < 1 ? 2 : 0),
  });
  input.oninput = () => {
    output.value = Number(input.value).toFixed(step < 1 ? 2 : 0);
    oninput(Number(input.value));
  };
  return el(
    "div",
    { className: "fader" },
    el("label", { htmlFor: id, textContent: label }),
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
  if (!$("shared").children.length)
    $("shared").replaceChildren(
      ...SHARED.map((def) =>
        fader(def, value(def.key), (v) =>
          def.key === "energy"
            ? act({ type: "energy", value: v })
            : act({ type: "shared", [def.key]: v }),
        ),
      ),
    );
  for (const def of SHARED) {
    const input = $(`fader-${def.key}`);
    if (input === document.activeElement) continue;
    input.value = value(def.key);
    input.nextElementSibling.value = Number(input.value).toFixed(
      def.step < 1 ? 2 : 0,
    );
  }
}
let familyKey = null;
function renderFamily() {
  const live = performanceStatus()?.live;
  const clip = liveClip();
  const scene = clip && sceneById(clip.snapshot.scene);
  const key = scene ? `${scene.id}:${live?.look}` : null;
  if (key === familyKey) return;
  familyKey = key;
  $("familyTitle").textContent = scene ? scene.name : "Family";
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
            textContent: "Controls for the playing family appear here.",
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

function renderStatus() {
  const s = performanceStatus();
  const alive = stageAlive();
  // The stage never shows UI on the venue screen after it started (D53):
  // a lost fullscreen is reported here instead.
  const windowed = alive && status.stage.started && !status.stage.fullscreen;
  $("stagePill").textContent = alive
    ? status.stage.started
      ? windowed
        ? "Stage not fullscreen · click the stage"
        : "Stage live"
      : "Stage open · click it to start"
    : "Stage not open";
  $("stagePill").className =
    `pill ${alive ? (status.stage.started && !windowed ? "ok" : "warn") : "bad"}`;
  $("openStage").disabled = alive;
  updateSettingsLock();
  updatePreview();
  if (!alive) renderLocalAudio();
  if (!s) return;
  const clock = s.clock;
  $("bpm").textContent = clock.bpm.toFixed(1);
  const source = clock.mode === "manual" ? "manual" : clock.source;
  $("tempoSource").replaceChildren(
    el("span", { className: `light ${source}` }),
    { auto: "following audio", coast: "holding tempo", manual: "manual tap" }[
      source
    ] ?? source,
  );
  [...$("beats").children].forEach((cell, i) =>
    cell.classList.toggle("on", i === Math.floor(clock.beatInBar)),
  );
  $("bar").textContent =
    `${clock.bar + 1} · ${Math.floor(clock.beatInBar) + 1}`;
  const ap = s.autopilot;
  // Random mode shows the bars left of the current clip's random duration.
  $("autopilotReadout").textContent = !ap.enabled
    ? "off"
    : ap.active
      ? ap.random
        ? `random · ${ap.nextChangeIn ?? "—"}/${ap.duration ?? "—"} bars`
        : `in order · next in ${ap.nextChangeIn ?? "—"}`
      : `paused · back in ${ap.handBackIn} bars`;
  const live = s.live;
  const liveScene = live && sceneById(live.scene);
  $("nowReadout").textContent = live ? live.name : s.blackout ? "black" : "—";
  $("nowReadout").title = live
    ? `${live.name} · ${liveScene?.name ?? live.scene}${lookById(live.look) ? "" : " · unsaved draft"}`
    : "";
  catalog?.setStatus(live?.look ?? null, s.pending?.look ?? null);
  $("favoritesOnly").ariaPressed = String(set.autopilot.favoritesOnly);
  if (document.activeElement !== $("minRating"))
    $("minRating").value = String(set.autopilot.minRating);
  $("energyReadout").textContent = s.energy.toFixed(2);
  $("paletteReadout").textContent =
    paletteById(s.palette)?.name ?? (s.palette ? "Custom" : "—");
  $("speedReadout").textContent = `${s.speed}×`;
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
      ? `${st.width}×${st.height} · ${st.fps ? Math.round(st.fps) : "—"} fps`
      : "—";
  $("renderReadout").title = alive ? "Stage output" : "Local preview";
  $("latency").textContent =
    clock.mode === "auto" ? `latency ${clock.latencyMs} ms` : "";
  $("autoClock").ariaPressed = String(clock.mode === "auto");
  if (document.activeElement !== $("manualBpm"))
    $("manualBpm").value = clock.bpm.toFixed(1);
  $("blackout").ariaPressed = String(s.blackout);
  $("freeze").ariaPressed = String(s.freeze);
  $("flash").ariaPressed = String(s.flash);
  $("autopilot").ariaPressed = String(ap.enabled);
  $("random").ariaPressed = String(ap.random);
  $("half").ariaPressed = String(s.speed === 0.5);
  $("double").ariaPressed = String(s.speed === 2);
  if (alive) {
    const a = status.audio;
    $("audioPill").textContent =
      a.source === "off"
        ? "Audio off"
        : `${a.source} · ${a.locked ? (a.coasting ? "holding" : `${a.bpm?.toFixed(1)} BPM`) : "listening"}`;
    $("audioPill").className =
      `pill ${a.source === "off" ? "" : a.locked ? "ok" : "warn"}`;
  }
  renderShared();
  if (!activeIsFader()) renderFamily();
  renderChecks();
}

// --- clip editor ------------------------------------------------------------
let editorEngine = null;
try {
  editorEngine = new Engine($("editorCanvas"), scenes, (m) =>
    log(`Editor: ${m}`),
  );
  editorEngine.resize(480, 270);
} catch (error) {
  log(`Editor preview unavailable: ${error.message}`);
}
if (editorEngine)
  localPerformance = new ControlPreview(editorEngine, set, scenes, now());
const localPreviewContext = $("localPreview").getContext("2d");

// Preview resolution (D67): chosen per viewer, applied to the local renderer.
// While the stage is live the monitor shows the stage's own stream, so the
// choice is disabled and the editor renders small to leave the GPU to it.
const PREVIEW_KEY = "phosphor-preview-resolution";
const PREVIEW_SIZES = ["480x270", "960x540", "1280x720", "1920x1080"];
let previewSize = "960x540";
try {
  const stored = localStorage.getItem(PREVIEW_KEY);
  if (PREVIEW_SIZES.includes(stored)) previewSize = stored;
} catch {}
let localFps = null;
function applyPreviewSize() {
  const alive = stageAlive();
  const [w, h] = (alive ? "480x270" : previewSize).split("x").map(Number);
  if (editorEngine && (editorEngine.width !== w || editorEngine.height !== h)) {
    editorEngine.resize(w, h);
    localFps = null;
  }
  if ($("localPreview").width !== w) $("localPreview").width = w;
  if ($("localPreview").height !== h) $("localPreview").height = h;
  $("previewResolution").disabled = alive || !editorEngine;
  if (document.activeElement !== $("previewResolution"))
    $("previewResolution").value = previewSize;
  $("previewNote").hidden = !alive;
}
$("previewResolution").onchange = () => {
  previewSize = $("previewResolution").value;
  try {
    localStorage.setItem(PREVIEW_KEY, previewSize);
  } catch {}
  applyPreviewSize();
  renderStatus();
};
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
const thumbnails = new Thumbnails({
  createEngine: () =>
    new Engine(document.createElement("canvas"), scenes, (message) => {
      if (thumbnailErrors++ < 3) log(`Catalog thumbnails: ${message}`);
    }),
  // Never take time from a transition on the stage or the local preview.
  busy: () =>
    document.hidden ||
    !!editorEngine?.transition ||
    (stageAlive() && !!status?.stage?.transition),
  onReady: (id) => catalog?.showThumbnail(id),
  onError: (message) => log(message),
});
const catalog = new CatalogPanel({
  looks,
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
// Harness hooks (tests/browser): the catalog and its thumbnail renderer.
Object.assign(window.__phosphorControl, { catalog, thumbnails });

// --- look editor (D68) ---------------------------------------------------------
// The draft as a playable clip; its id is the look's, so live edits of the
// look on screen update it in place.
function draftClip() {
  return clipFrom(draft.snapshot, {
    id: draft.id,
    name: draft.name,
    palette: draft.palette,
    transition: draft.transition,
  });
}
function previewDraft(manual = true) {
  if (!editorEngine || !draft) return;
  resumeLocalPerformance();
  if (stageAlive()) {
    editorEngine.setLevel(0.5, 0);
    editorEngine.load(draftClip().snapshot, 0, { energy: 0.5 });
  } else localPerformance.select(draftClip(), now(), manual);
}
function editDraft() {
  if (!editorEngine || !draft) return;
  resumeLocalPerformance();
  if (stageAlive()) editorEngine.setSnapshot(draftClip().snapshot);
  else localPerformance.edit(draftClip(), now());
}
// preview: show the look in the main preview; manual: that counts as a
// performer takeover (opening the window or importing a set does not).
function selectLook(id, preview = true, manual = true) {
  const look = lookById(id);
  if (!look) return;
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
  };
  if (preview) previewDraft(manual);
  renderEditor();
  catalog.setSelected(look.id);
  updateSettingsLock();
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
    $("editorTitle").textContent = "Look";
    $("editor").replaceChildren(
      el("p", {
        className: "note",
        textContent: "Pick a look in the catalog.",
      }),
    );
    return;
  }
  const look = lookById(draft.id);
  $("editorTitle").textContent = draft.own
    ? `Own look · ${look?.name ?? draft.name}`
    : `Look · ${draft.name}`;
  $("saveLook").hidden = !draft.own;
  $("deleteLook").hidden = !draft.own;
  const scene = sceneById(draft.snapshot.scene);
  const name = el("input", {
    value: draft.name,
    maxLength: 80,
    oninput: () => (draft.name = name.value.trim() || "Untitled"),
  });
  const family = el(
    "select",
    {
      onchange: () => {
        const next = sceneById(family.value);
        draft.snapshot = {
          ...presetSnapshot(next),
          palette: draft.snapshot.palette,
        };
        draft.name = next.presets[0].name;
        draft.base = `${next.id}:${next.presets[0].name}`;
        previewDraft();
        renderEditor();
      },
    },
    ...scenes.map((s) =>
      el("option", {
        value: s.id,
        textContent: s.name,
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
        draft.snapshot = {
          ...presetSnapshot(scene, index),
          palette: draft.snapshot.palette,
        };
        draft.name = scene.presets[index].name;
        draft.base = `${scene.id}:${scene.presets[index].name}`;
        previewDraft();
        renderEditor();
      },
    },
    el("option", { value: -1, textContent: "Start from an authored look…" }),
    ...scene.presets.map((p, i) =>
      el("option", { value: i, textContent: p.name }),
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
  const customColors = el(
    "div",
    { className: "palette" },
    ...Object.keys(DEFAULT_PALETTE).map((key) =>
      el("input", {
        type: "color",
        value: draft.snapshot.palette[key],
        ariaLabel: `${key} colour`,
        oninput: (event) => {
          draft.snapshot.palette[key] = event.target.value;
          editDraft();
        },
      }),
    ),
  );
  const palette = el(
    "select",
    {
      id: "lookPalette",
      ariaLabel: "Look palette",
      onchange: () => {
        draft.palette = palette.value;
        if (draft.palette !== "custom")
          draft.snapshot.palette = { ...paletteById(draft.palette).colors };
        editDraft();
        renderEditor();
        updateSettingsLock();
      },
    },
    ...PALETTES.map((entry) =>
      el("option", {
        value: entry.id,
        textContent: `${entry.name} · ${entry.moods.join(" / ")}`,
        selected: entry.id === draft.palette,
      }),
    ),
    el("option", {
      value: "custom",
      textContent: "Custom",
      selected: draft.palette === "custom",
    }),
  );
  const transition = el(
    "select",
    { onchange: () => (draft.transition = transition.value) },
    ...TRANSITIONS.map((kind) =>
      el("option", {
        value: kind,
        textContent: {
          auto: "Auto",
          crossfade: "Crossfade",
          cut: "Cut (downbeat, manual only)",
          dissolve: "Noise dissolve",
          melt: "Feedback melt",
        }[kind],
        selected: kind === (draft.transition ?? "auto"),
      }),
    ),
  );
  $("editor").replaceChildren(
    field("Name", name),
    field("Family", family),
    field("Look", preset),
    ...params,
    field("Seed", seed),
    field("Palette", palette),
    ...(draft.palette === "custom"
      ? [field("Custom colours", customColors)]
      : []),
    field("Transition", transition),
  );
}
function ownLookFromDraft(id) {
  return {
    id,
    name: draft.name.trim() || "Untitled",
    base: draft.base ?? null,
    snapshot: structuredClone(draft.snapshot),
    palette: draft.palette,
    transition: draft.transition ?? "auto",
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
    toast(`Saved “${draft.name}”.`);
    return;
  }
  const look = ownLookFromDraft(freeLookId(set));
  set.looks = [...set.looks, look];
  changed();
  reindexLooks();
  selectLook(look.id, false);
  catalog.reveal(look.id);
  toast(`“${look.name}” is now an own look in the catalog.`);
}
function deleteLook() {
  if (!draft?.own || settingsLocked) return;
  const { id, base, name } = draft;
  confirm(`Delete the own look “${name}”? Authored looks stay.`, () => {
    if (settingsLocked) return;
    set.looks = set.looks.filter((look) => look.id !== id);
    delete set.ratings[id];
    set.favorites = set.favorites.filter((f) => f !== id);
    set.keys = set.keys.map((k) => (k === id ? null : k));
    changed();
    reindexLooks();
    selectLook(lookById(base) ? base : looks[0].id, false);
  });
}
async function breed() {
  if (!draft || settingsLocked) return;
  const scene = sceneById(draft.snapshot.scene);
  const parent = { seed: draft.snapshot.seed, params: draft.snapshot.params };
  const children = Array.from({ length: 6 }, () =>
    mutatePreset(scene, parent, {
      seed: (Math.random() * 0x7fffffff) >>> 0,
      strength: 0.2,
    }),
  );
  $("variations").replaceChildren(
    ...children.map((child) => {
      const thumb = el("canvas", {
        width: 160,
        height: 90,
        style: "width:100%;border-radius:4px;background:#000",
      });
      const button = el(
        "button",
        {
          className: "cell",
          ariaLabel: `Variation ${child.name}`,
          onclick: () => {
            draft.snapshot = {
              ...draft.snapshot,
              seed: child.seed,
              params: { ...child.params },
            };
            previewDraft();
            renderEditor();
          },
        },
        thumb,
        el("span", { className: "family", textContent: child.name }),
      );
      button.thumb = thumb;
      button.child = child;
      return button;
    }),
  );
  // Render thumbnails one at a time through the editor engine.
  for (const button of $("variations").children) {
    if (!editorEngine) break;
    const snapshot = {
      ...draft.snapshot,
      seed: button.child.seed,
      params: button.child.params,
    };
    editorEngine.load(snapshot, 0, { energy: 0.5 });
    await editorEngine.ready(snapshot.scene);
    for (let i = 0; i < 30; i++) editorEngine.advance(1 / 60, false);
    button.thumb.getContext("2d").drawImage($("editorCanvas"), 0, 0, 160, 90);
  }
  previewDraft();
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
  if (stageAlive()) {
    editorEngine.beat = status.status.clock.beat;
    editorEngine.advance(dt, false);
  } else localPerformance?.tick(ms / 1000, dt);
  if (!$("localPreview").hidden)
    localPreviewContext.drawImage($("editorCanvas"), 0, 0);
  if (!stageAlive() && ms - lastLocalStatus >= 200) {
    lastLocalStatus = ms;
    renderStatus();
  }
}

// --- set, audio, checks ------------------------------------------------------
function renderSetFields() {
  const name = el("input", {
    value: set.name,
    maxLength: 80,
    onchange: () => {
      set.name = name.value || "Untitled show";
      changed();
    },
  });
  const mood = el(
    "select",
    {
      id: "setMood",
      ariaLabel: "Palette mood",
      title: "Autopilot steps palettes within this mood (D57)",
      onchange: () => {
        set.mood = mood.value || null;
        changed();
      },
    },
    el("option", {
      value: "",
      textContent: "Any palette",
      selected: set.mood === null,
    }),
    ...MOODS.map((value) =>
      el("option", {
        value,
        textContent: value,
        selected: set.mood === value,
      }),
    ),
  );
  const every = el(
    "select",
    {
      title:
        "In-order autopilot changes clip every N bars; Random plays each clip 8, 12 or 16 bars",
      onchange: () => {
        set.autopilot.everyBars = Number(every.value);
        changed();
      },
    },
    ...AUTOPILOT_BARS.map((b) =>
      el("option", {
        value: b,
        textContent: `${b} bars`,
        selected: b === set.autopilot.everyBars,
      }),
    ),
  );
  const budget = el(
    "select",
    {
      title:
        "Stage render budget; the stage steps down only if frames stay slow",
      onchange: () => {
        set.options.pixelBudget = Number(budget.value);
        changed();
      },
    },
    ...PIXEL_BUDGETS.map((b) =>
      el("option", {
        value: b,
        textContent: b === NATIVE_BUDGET ? "Native (up to 4K)" : `${b} MP`,
        selected: b === set.options.pixelBudget,
      }),
    ),
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
    type: "checkbox",
    checked: set.options.reducedMotion,
    onchange: () => {
      set.options.reducedMotion = reduced.checked;
      changed();
    },
  });
  $("setFields").replaceChildren(
    field("Show name", name),
    field("Palette mood", mood),
    field("In order every", every),
    field("Stage resolution", budget),
    option("bloom", "Bloom ceiling"),
    option("echo", "Echo ceiling"),
    option("chroma", "Chroma ceiling"),
    option("grain", "Grain ceiling"),
    option("vignette", "Vignette ceiling"),
    field("Reduced motion", reduced),
  );
}
function renderDevices(devices) {
  const current = $("audioDevice").value;
  $("audioDevice").replaceChildren(
    el("option", { value: "", textContent: "Default input" }),
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
  "Laptop on mains power",
  "Do Not Disturb on, notifications off",
  "Sleep and screen saver off",
  "Chrome: “Warn before quitting (⌘Q)” on",
  "Projector / LED wall resolution confirmed with the framing pattern",
];
const ticked = new Set();
// Automatic preflight checks (D10), from the stage's status.
function preflight() {
  const st = stageAlive() ? status?.stage : null,
    a = status?.audio;
  return [
    ["Stage open and started", !!st?.started],
    [
      "Stage fullscreen on the external screen",
      !!st?.fullscreen && st.external === true,
    ],
    ["Screen wake lock held", !!st?.wakeLock],
    ["Framing pattern shown on the stage", !!st?.patternShown],
    [
      "Microphone permission granted for this site",
      micPermission === "granted",
    ],
    [
      "Live audio input has signal (not the demo or a file)",
      !!a && a.source === "input" && a.level > 0.02,
    ],
    [
      "Beat tracker locked (or manual tempo set)",
      !!(a?.locked || status?.status.clock.mode === "manual"),
    ],
    ["No GPU errors", st?.counters.gpuErrors === 0],
  ];
}
function renderChecks() {
  const auto = preflight();
  $("checks").replaceChildren(
    ...auto.map(([label, ok]) =>
      el(
        "div",
        { className: "check" },
        el("span", { className: `light ${ok ? "auto" : "coast"}` }),
        label,
        el("span", { className: "state", textContent: ok ? "ok" : "check" }),
      ),
    ),
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
      settingsLocked &&
      !["exportSet", "auditionLook", "breedLook"].includes(input.id);
  // Rating, favourites, search, Play and Edit stay available; saving or
  // deleting own looks is a configuration change.
  for (const id of ["saveLook", "saveAsLook", "deleteLook"])
    $(id).disabled = settingsLocked;
  // A MIDI learn started before locking must not alter the mappings later.
  if (settingsLocked) {
    midiLearn = null;
    $("midiLearn").textContent = "Learn next control";
  }
}
$("settingsLock").onchange = () => {
  settingsLocked = stageAlive() && $("settingsLock").checked;
  updateSettingsLock();
};

// --- wiring ---------------------------------------------------------------------------
$("openStage").onclick = openStage;
$("tap").onclick = () => act({ type: "tap" });
$("downbeat").onclick = () => act({ type: "downbeat" });
$("nudgeBack").onclick = () => act({ type: "nudge", direction: -1 });
$("nudgeForward").onclick = () => act({ type: "nudge", direction: 1 });
$("autoClock").onclick = () => setClock("auto");
$("manualBpm").onchange = () =>
  setClock("manual", Number($("manualBpm").value));
$("blackout").onclick = () => act({ type: "blackout" });
$("safe").onclick = () => act({ type: "safe" });
$("freeze").onclick = () => act({ type: "freeze" });
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
      textContent: r ? `≥ ${r} ★` : "any rating",
    }),
  ),
);
$("minRating").onchange = () => {
  set.autopilot.minRating = Number($("minRating").value);
  changed();
};
$("half").onclick = () => act({ type: "speed", value: 0.5 });
$("double").onclick = () => act({ type: "speed", value: 2 });
$("flash").onpointerdown = () => act({ type: "flash", on: true });
for (const end of ["pointerup", "pointerleave", "pointercancel"])
  $("flash").addEventListener(end, () => act({ type: "flash", on: false }));
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
      toast(`Learnt ${message.type} ${message.number} → ${midiLearn}`);
      midiLearn = null;
      $("midiLearn").textContent = "Learn next control";
      changed();
      renderMidi();
    }
    for (const action of result.actions) act(action);
  },
  (text) => log(`MIDI: ${text}`),
);
function renderMidi() {
  if (!$("midiTarget").children.length)
    $("midiTarget").replaceChildren(
      ...MIDI_TARGETS.map((t) => el("option", { value: t, textContent: t })),
    );
  $("midiMaps").replaceChildren(
    ...set.midi.map((m, i) =>
      el(
        "li",
        {},
        `${m.type} ${m.channel + 1}/${m.number} → ${m.target} `,
        el("button", {
          textContent: "Forget",
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
  midi.connect().catch((error) => toast(error.message));
$("midiLearn").onclick = () => {
  midiLearn = midiLearn ? null : $("midiTarget").value;
  $("midiLearn").textContent = midiLearn
    ? `Move a control for ${midiLearn}…`
    : "Learn next control";
};
$("importSet").onchange = async () => {
  const file = $("importSet").files[0];
  $("importSet").value = "";
  if (!file) return;
  try {
    if (file.size > 32 * 1024 * 1024)
      throw new Error("Sets are limited to 32 MB");
    const result = parseShowSet(JSON.parse(await file.text()), scenes);
    set = result.set;
    $("importReport").replaceChildren(
      ...result.report.map((line) => el("li", { textContent: line })),
    );
    changed();
    reindexLooks(); // the imported set brings its own looks and ratings
    catalog.refresh();
    selectLook(catalog.first() ?? looks[0].id, true, false);
    toast(`Imported “${set.name}”.`);
  } catch (error) {
    toast(`Import failed: ${error.message}`);
  }
};
$("useInput").onclick = async () => {
  demoRequested = false;
  stopLocalDemo();
  renderLocalAudio();
  try {
    // Ask in the controls so the stage never shows a permission prompt (D10).
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch (error) {
    toast(`Microphone permission: ${error.message}`);
    return;
  }
  send({ type: "audio", source: "input", deviceId: $("audioDevice").value });
  send({ type: "devices" });
};
$("audioFile").onchange = () => {
  const file = $("audioFile").files[0];
  if (file) {
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
  demoRequested = true;
  syncLocalDemo();
  send({ type: "audio", source: "demo", muted: $("audioMute").checked });
};
$("audioOff").onclick = () => {
  demoRequested = false;
  stopLocalDemo();
  renderLocalAudio();
  send({ type: "audio", source: "off" });
};
$("audioMute").onchange = () => {
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

// Releases remain pinned mid-show; the explicit updater checks for any other
// Phosphor window before activating a complete cached generation.
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .then((registration) => {
      const notify = () => {
        if (registration.waiting && navigator.serviceWorker.controller)
          log(
            "New release cached. Close the stage and other Phosphor tabs/windows, then open Update app in this tab; saved sets are retained.",
          );
      };
      notify();
      registration.addEventListener("updatefound", () =>
        registration.installing?.addEventListener("statechange", notify),
      );
    })
    .catch(() =>
      log("Offline cache unavailable here (needs HTTPS or localhost)."),
    );

labels = await keyLabels();
catalog.refreshKeys();
selectLook(catalog.first() ?? looks[0].id, true, false);
render();
send({ type: "hello" });
send({ type: "devices" });
requestAnimationFrame(animateEditor);
