// Control window (decisions D8, D13–D19): a remote for the stage. It owns
// the set and its editing (Prep mode), sends performer actions to the stage,
// and shows the stage's state. If it reloads, the stage keeps playing.
import scenes from "./scenes.mjs";
import { Engine } from "./engine.mjs";
import { presetSnapshot, DEFAULT_PALETTE } from "./session.mjs";
import {
  validateShowSet,
  parseShowSet,
  clipFrom,
  SLOTS,
  QUANTIZE,
  AUTOPILOT_BARS,
  PIXEL_BUDGETS,
} from "./show-set.mjs";
import { loadSet, saveSet } from "./show-storage.mjs";
import { actionFor, keyLabels, GRID_CODES } from "./keymap.mjs";
import { mutatePreset } from "./evolution.mjs";
import { MidiInput } from "./audio.mjs";
import { routeMidi } from "./midi-map.mjs";
import { MIDI_TARGETS } from "./show-set.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};
const channel = new BroadcastChannel("phosphor-show");
const send = (message) => channel.postMessage(message);
const act = (action) => send({ type: "action", action });
const sceneById = (id) => scenes.find((s) => s.id === id);
const stageParams = (scene) =>
  scene.stage ??
  scene.schema
    .filter((d) => d.step < 1)
    .slice(0, 3)
    .map((d) => d.key);

let { set, report } = loadSet(localStorage, scenes);
let status = null; // last stage status
let lastStatusAt = 0;
let labels = {};
let selected = { page: 0, slot: 0 }; // Prep selection
let draft = null; // clip being edited
let showMode = false;
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
function changed() {
  set = validateShowSet(set, scenes);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      saveSet(localStorage, set);
    } catch (error) {
      toast(`Could not save locally (${error.message}). Export the set.`);
    }
  }, 300);
  send({ type: "set", set });
  render();
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
const stageAlive = () => performance.now() - lastStatusAt < 2000;
window.__phosphorControl = {
  attachPreview(stream) {
    const video = $("preview");
    video.srcObject = stream;
    video.play().catch(() => {});
    $("previewEmpty").hidden = true;
  },
};

channel.onmessage = ({ data }) => {
  switch (data?.type) {
    case "status":
      status = data;
      lastStatusAt = performance.now();
      // The stage may change shared controls and autopilot from its own keys
      // and autopilot; keep the set in step so a later edit doesn't undo them.
      set.shared = { ...data.status.shared };
      set.autopilot.enabled = data.status.autopilot.enabled;
      renderStatus();
      break;
    case "stage-ready":
      log("Stage opened.");
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
    const action = actionFor(event);
    if (!action) return;
    event.preventDefault();
    if (action.type === "page") {
      set.pages[action.index] && (selected.page = action.index);
    }
    act(action);
  });

// --- rendering: grid, pages, readouts -----------------------------------------
function renderPages() {
  const livePage = status?.status.page ?? 0;
  $("pages").replaceChildren(
    ...set.pages.map((page, i) =>
      el("button", {
        textContent: `${i + 1} · ${page.name}`,
        role: "tab",
        ariaSelected: String(i === (showMode ? livePage : selected.page)),
        ariaPressed: String(i === livePage),
        onclick: () => {
          selected.page = i;
          act({ type: "page", index: i });
          render();
        },
      }),
    ),
  );
}
function renderGrid() {
  const page = showMode ? (status?.status.page ?? 0) : selected.page;
  const live = status?.status.live;
  const pending = status?.status.pending;
  $("grid").replaceChildren(
    ...set.pages[page].slots.map((clip, slot) => {
      const scene = clip && sceneById(clip.snapshot.scene);
      const cell = el(
        "button",
        {
          className: "cell",
          ariaLabel: clip
            ? `Slot ${labels[GRID_CODES[slot]]}: ${clip.name}`
            : `Slot ${labels[GRID_CODES[slot]]}: empty`,
          onclick: () => {
            if (showMode) {
              if (clip) {
                if ((status?.status.page ?? 0) !== page)
                  act({ type: "page", index: page });
                act({ type: "slot", index: slot });
              }
            } else selectSlot(page, slot);
          },
        },
        el("span", {
          className: "key",
          textContent: labels[GRID_CODES[slot]] ?? "",
        }),
        el("span", { className: "name", textContent: clip ? clip.name : "—" }),
        el("span", {
          className: "family",
          textContent: scene ? scene.name : "",
        }),
      );
      if (clip)
        cell.append(
          el("span", {
            className: "energy",
            style: `width:${Math.round(clip.energy * 100)}%`,
          }),
        );
      cell.classList.toggle("empty", !clip);
      cell.classList.toggle("noauto", !!clip && !clip.autopilot);
      cell.classList.toggle(
        "live",
        !!live && live.page === page && live.slot === slot,
      );
      cell.classList.toggle(
        "pending",
        !!pending && pending.page === page && pending.slot === slot,
      );
      cell.classList.toggle(
        "selected",
        !showMode && selected.page === page && selected.slot === slot,
      );
      return cell;
    }),
  );
}

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
function renderShared() {
  const s = status?.status;
  $("shared").replaceChildren(
    ...SHARED.map((def) =>
      fader(
        def,
        def.key === "energy"
          ? (s?.energy ?? 0.5)
          : (s?.shared[def.key] ?? set.shared[def.key]),
        (value) =>
          def.key === "energy"
            ? act({ type: "energy", value })
            : act({ type: "shared", [def.key]: value }),
      ),
    ),
  );
}
let familyKey = null;
function renderFamily() {
  const live = status?.status.live;
  const clip = live && set.pages[live.page]?.slots[live.slot];
  const scene = clip && sceneById(clip.snapshot.scene);
  const key = scene ? `${scene.id}:${live.page}:${live.slot}` : null;
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
// Re-render faders only when the user isn't dragging one.
const activeIsFader = () => document.activeElement?.type === "range";

function renderStatus() {
  const s = status?.status;
  const alive = stageAlive();
  $("stagePill").textContent = alive
    ? status.stage.started
      ? "Stage live"
      : "Stage open · click it to start"
    : "Stage not open";
  $("stagePill").className =
    `pill ${alive ? (status.stage.started ? "ok" : "warn") : "bad"}`;
  $("openStage").disabled = alive;
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
  $("autopilotReadout").textContent = !ap.enabled
    ? "off"
    : ap.active
      ? `on · next in ${ap.nextChangeIn ?? "—"} bars`
      : `paused · back in ${ap.handBackIn} bars`;
  $("energyReadout").textContent = s.energy.toFixed(2);
  $("speedReadout").textContent = `${s.speed}×`;
  const st = status.stage;
  $("renderReadout").textContent =
    `${st.width}×${st.height} · ${st.fps ? Math.round(st.fps) : "—"} fps`;
  $("latency").textContent =
    clock.mode === "auto" ? `latency ${clock.latencyMs} ms` : "";
  $("autoClock").ariaPressed = String(clock.mode === "auto");
  if (document.activeElement !== $("manualBpm"))
    $("manualBpm").value = clock.bpm.toFixed(1);
  $("blackout").ariaPressed = String(s.blackout);
  $("freeze").ariaPressed = String(s.freeze);
  $("flash").ariaPressed = String(s.flash);
  $("autopilot").ariaPressed = String(ap.enabled);
  $("half").ariaPressed = String(s.speed === 0.5);
  $("double").ariaPressed = String(s.speed === 2);
  const a = status.audio;
  $("audioPill").textContent =
    a.source === "off"
      ? "Audio off"
      : `${a.source} · ${a.locked ? (a.coasting ? "holding" : `${a.bpm?.toFixed(1)} BPM`) : "listening"}`;
  $("audioPill").className =
    `pill ${a.source === "off" ? "" : a.locked ? "ok" : "warn"}`;
  if (!activeIsFader()) {
    renderShared();
    renderFamily();
  }
  renderGrid();
  if (showMode) renderPages();
  renderChecks();
}

// --- Prep: clip editor ---------------------------------------------------------
let editorEngine = null;
try {
  editorEngine = new Engine($("editorCanvas"), scenes, (m) =>
    log(`Editor: ${m}`),
  );
  editorEngine.resize(480, 270);
} catch (error) {
  log(`Editor preview unavailable: ${error.message}`);
}
function previewDraft() {
  if (!editorEngine || !draft) return;
  editorEngine.setLevel(draft.energy, 0);
  editorEngine.load(draft.snapshot, 0, { energy: draft.energy });
}
function selectSlot(page, slot) {
  selected = { page, slot };
  const clip = set.pages[page].slots[slot];
  draft = clip
    ? structuredClone(clip)
    : clipFrom(presetSnapshot(scenes[0]), {
        id: `clip-${Date.now().toString(36)}`,
      });
  draft.isNew = !clip;
  previewDraft();
  renderEditor();
  renderGrid();
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
  $("editorTitle").textContent =
    `Clip · page ${selected.page + 1} · slot ${labels[GRID_CODES[selected.slot]] ?? selected.slot + 1}${draft?.isNew ? " (new)" : ""}`;
  if (!draft) {
    $("editor").replaceChildren(
      el("p", { className: "note", textContent: "Select a slot." }),
    );
    return;
  }
  const scene = sceneById(draft.snapshot.scene);
  const name = el("input", {
    value: draft.name,
    maxLength: 80,
    oninput: () => (draft.name = name.value || "Untitled"),
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
        previewDraft();
        renderEditor();
      },
    },
    el("option", { value: -1, textContent: "Load an authored look…" }),
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
        editorEngine?.setSnapshot(draft.snapshot);
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
  const palette = el(
    "div",
    { className: "palette" },
    ...Object.keys(DEFAULT_PALETTE).map((key) =>
      el("input", {
        type: "color",
        value: draft.snapshot.palette[key],
        ariaLabel: `${key} colour`,
        oninput: (event) => {
          draft.snapshot.palette[key] = event.target.value;
          editorEngine?.setSnapshot(draft.snapshot);
        },
      }),
    ),
  );
  const energy = fader(
    { key: "clip-energy", label: "Energy", min: 0, max: 1, step: 0.01 },
    draft.energy,
    (value) => {
      draft.energy = value;
      editorEngine?.setLevel(value, 0);
    },
  );
  const fade = el("input", {
    type: "number",
    min: 0,
    max: 32,
    step: 1,
    value: draft.fade,
    onchange: () =>
      (draft.fade = Math.max(0, Math.min(32, Number(fade.value) || 0))),
  });
  const quantize = el(
    "select",
    { onchange: () => (draft.quantize = quantize.value) },
    ...QUANTIZE.map((q) =>
      el("option", {
        value: q,
        textContent: { beat: "next beat", bar: "next bar", now: "immediately" }[
          q
        ],
        selected: q === draft.quantize,
      }),
    ),
  );
  const autopilot = el("input", {
    type: "checkbox",
    checked: draft.autopilot,
    onchange: () => (draft.autopilot = autopilot.checked),
  });
  $("editor").replaceChildren(
    field("Name", name),
    field("Family", family),
    field("Look", preset),
    ...params,
    field("Seed", seed),
    field("Palette", palette),
    energy,
    field("Fade (beats)", fade),
    field("Starts on", quantize),
    field("Autopilot may play", autopilot),
  );
}
function saveDraft() {
  if (!draft) return;
  const { isNew, ...clip } = draft;
  set.pages[selected.page].slots[selected.slot] = structuredClone(clip);
  draft.isNew = false;
  changed();
  toast("Clip saved.");
}
async function breed() {
  if (!draft) return;
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
    editorEngine.load(snapshot, 0, { energy: draft.energy });
    await editorEngine.ready(snapshot.scene);
    for (let i = 0; i < 30; i++) editorEngine.advance(1 / 60, false);
    button.thumb.getContext("2d").drawImage($("editorCanvas"), 0, 0, 160, 90);
  }
  previewDraft();
}
let editorLoop = 0;
function animateEditor(ms) {
  requestAnimationFrame(animateEditor);
  if (
    showMode ||
    !editorEngine ||
    document.hidden ||
    ms - editorLoop < 1000 / 30
  )
    return;
  const dt = Math.min(0.1, (ms - editorLoop) / 1000);
  editorLoop = ms;
  editorEngine.beat = status?.status.clock.beat ?? ms / 500;
  editorEngine.advance(dt, false);
}

// --- Prep: set, audio, checks --------------------------------------------------------
function renderSetFields() {
  const name = el("input", {
    value: set.name,
    maxLength: 80,
    onchange: () => {
      set.name = name.value || "Untitled show";
      changed();
    },
  });
  const pageName = el("input", {
    value: set.pages[selected.page].name,
    maxLength: 40,
    onchange: () => {
      set.pages[selected.page].name =
        pageName.value || `Page ${selected.page + 1}`;
      changed();
    },
  });
  const every = el(
    "select",
    {
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
      onchange: () => {
        set.options.pixelBudget = Number(budget.value);
        changed();
      },
    },
    ...PIXEL_BUDGETS.map((b) =>
      el("option", {
        value: b,
        textContent: `${b} MP`,
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
    field(`Page ${selected.page + 1} name`, pageName),
    field("Autopilot every", every),
    field("Pixel budget", budget),
    option("bloom", "Bloom"),
    option("echo", "Echo"),
    option("chroma", "Chroma"),
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
function renderChecks() {
  if (showMode) return;
  const st = status?.stage,
    a = status?.audio;
  const auto = [
    ["Stage open and started", stageAlive() && st?.started],
    [
      "Stage on its own screen at native size",
      stageAlive() && st && st.width * st.height > 0,
    ],
    [
      "Microphone permission granted for this site",
      micPermission === "granted",
    ],
    ["Audio input has signal", a && a.source !== "off" && a.level > 0.02],
    [
      "Beat tracker locked (or manual tempo set)",
      a?.locked || status?.status.clock.mode === "manual",
    ],
    ["No GPU errors", st && st.counters.gpuErrors === 0],
  ];
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

// --- mode switch (deliberate, D16) ---------------------------------------------------
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
function setMode(show) {
  showMode = show;
  document.body.classList.toggle("show-mode", show);
  $("modeButton").textContent = show ? "Back to Prep" : "Enter Show mode";
  render();
}
$("modeButton").onclick = () =>
  showMode
    ? confirm("Leave Show mode? Editors will be visible again.", () =>
        setMode(false),
      )
    : confirm(
        "Enter Show mode? Editors are hidden; the grid and performance controls stay.",
        () => setMode(true),
      );

// --- wiring ---------------------------------------------------------------------------
$("openStage").onclick = openStage;
$("tap").onclick = () => act({ type: "tap" });
$("downbeat").onclick = () => act({ type: "downbeat" });
$("nudgeBack").onclick = () => act({ type: "nudge", direction: -1 });
$("nudgeForward").onclick = () => act({ type: "nudge", direction: 1 });
$("autoClock").onclick = () => send({ type: "clock", mode: "auto" });
$("manualBpm").onchange = () =>
  send({ type: "clock", mode: "manual", bpm: Number($("manualBpm").value) });
$("blackout").onclick = () => act({ type: "blackout" });
$("safe").onclick = () => act({ type: "safe" });
$("freeze").onclick = () => act({ type: "freeze" });
$("autopilot").onclick = () => act({ type: "autopilot" });
$("half").onclick = () => act({ type: "speed", value: 0.5 });
$("double").onclick = () => act({ type: "speed", value: 2 });
$("flash").onpointerdown = () => act({ type: "flash", on: true });
for (const end of ["pointerup", "pointerleave", "pointercancel"])
  $("flash").addEventListener(end, () => act({ type: "flash", on: false }));
$("saveClip").onclick = saveDraft;
$("auditionClip").onclick = () =>
  draft && act({ type: "audition", clip: (({ isNew, ...c }) => c)(draft) });
$("breedClip").onclick = breed;
$("clearClip").onclick = () =>
  confirm("Clear this slot?", () => {
    set.pages[selected.page].slots[selected.slot] = null;
    changed();
    selectSlot(selected.page, selected.slot);
  });
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
    const live = status?.status.live;
    const clip = live && set.pages[live.page]?.slots[live.slot];
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
    selectSlot(0, 0);
    toast(`Imported “${set.name}”.`);
  } catch (error) {
    toast(`Import failed: ${error.message}`);
  }
};
$("useInput").onclick = async () => {
  try {
    // Ask here (Prep) so the stage never shows a permission prompt (D10).
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
  if (file)
    send({
      type: "audio",
      source: "file",
      file,
      muted: $("audioMute").checked,
    });
};
$("useDemo").onclick = () =>
  send({ type: "audio", source: "demo", muted: $("audioMute").checked });
$("audioOff").onclick = () => send({ type: "audio", source: "off" });
$("pattern").onclick = () => {
  const on = $("pattern").ariaPressed !== "true";
  $("pattern").ariaPressed = String(on);
  send({ type: "pattern", on });
};

function render() {
  $("setName").textContent = set.name;
  renderPages();
  renderGrid();
  renderShared();
  if (!showMode) {
    renderEditor();
    renderSetFields();
    renderChecks();
    renderMidi();
  }
}
window.addEventListener("beforeunload", () => {
  clearTimeout(saveTimer);
  try {
    saveSet(localStorage, set);
  } catch {}
});
setInterval(() => {
  if (!stageAlive() && status) {
    status = null;
    renderStatus();
  }
}, 1000);

// Offline cache: a new release waits until every Phosphor window is closed;
// never update mid-show.
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .then((registration) => {
      const notify = () => {
        if (registration.waiting && navigator.serviceWorker.controller)
          log(
            "New release cached. Close all Phosphor windows after the show to update.",
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
selectSlot(0, 0);
render();
send({ type: "hello" });
send({ type: "devices" });
requestAnimationFrame(animateEditor);
