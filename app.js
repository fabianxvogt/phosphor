import scenes from "./scenes.mjs";
import { Engine } from "./engine.mjs";
import { AudioEngine, MidiInput } from "./audio.mjs";
import {
  initialSession,
  validateSession,
  presetSnapshot,
  migrateLegacy,
  importReport,
} from "./session.mjs";
import { createLineage, selectNode, undoGeneration } from "./evolution.mjs";
import { Transport } from "./transport.mjs";
import { History, Persistence } from "./persistence.mjs";
import { route } from "./midi-routing.mjs";
import { shortcutFor } from "./keyboard.mjs";
import { Governor } from "./governor.mjs";
import { Telemetry } from "./telemetry.mjs";
import { createCapture } from "./ui-capture.mjs";
import {
  manualOverrideUI,
  selectedDevice,
  numberValue,
  pruneLocks,
  breedSiblings,
  updateWaiting,
  OutputWindow,
} from "./ui-state.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const button = (text, action) => {
  const node = el("button", text);
  node.type = "button";
  node.onclick = () => guard(action);
  return node;
};
let toastTimer, toastKind;
function toast(message, kind = "info") {
  toastKind = kind;
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 4500);
}
function clearError() {
  if (toastKind === "error") {
    $("toast").hidden = true;
    clearTimeout(toastTimer);
  }
}
async function guard(action) {
  try {
    const result = await action();
    clearError();
    return result;
  } catch (error) {
    toast(error.message || String(error), "error");
  }
}
let session = initialSession(scenes),
  engine;
const transport = new Transport();
const history = new History();
const governor = new Governor();
const telemetry = new Telemetry();
const persistence = new Persistence(
  {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  scenes,
  (state, error) => {
    $("saveReadout").textContent = {
      saved: "Saved locally · " + new Date().toLocaleTimeString(),
      saving: "Saving…",
      blocked: "Recovery required · original save retained",
      stale: "Another window saved · autosave paused",
      error: "Not saved · export your set",
    }[state];
    if (state === "error") toast("Set not saved: " + error.message, "error");
    if (state === "stale")
      toast(
        "Another Phosphor window saved a newer set. Autosave is paused here; export this window or reload.",
        "error",
      );
  },
);
const audio = new AudioEngine((message) => {
  $("audioStatus").textContent = message;
});
const midi = new MidiInput(handleMidi, handleClock, (message) => {
  $("midiStatus").textContent = message;
});
const output = new OutputWindow((...args) => window.open(...args));
const capture = createCapture({
  $,
  audio,
  getSession: () => session,
  toast,
  download,
  flush: () => guard(() => persistence.flush(session)),
});
const midiEdges = new Map(),
  locked = new Set();
let midiLearn = null,
  selectedLineage = 0,
  wakeLock = null;
let uiTimer = null,
  sceneDirty = false,
  cuesDirty = false;
function deferUI(scene = false) {
  sceneDirty ||= scene;
  cuesDirty = true;
  if (uiTimer !== null) return;
  uiTimer = setTimeout(() => {
    uiTimer = null;
    if (sceneDirty) renderScene();
    if (cuesDirty) updateCueState();
    sceneDirty = cuesDirty = false;
  }, 0);
}
function manualOverride() {
  manualOverrideUI(transport, () => deferUI());
}
function checkpoint() {
  history.checkpoint(session);
}
function changed() {
  engine.options = session.options;
  engine.mappings = session.mappings;
  persistence.changed(() => session);
}
function currentScene() {
  return scenes.find((scene) => scene.id === session.active.scene);
}
function effectiveTempo(now = performance.now()) {
  return transport.tempo(now, session.tempo, $("clockInput").checked);
}
function togglePause() {
  transport.pause(performance.now());
  $("pauseButton").textContent = transport.paused
    ? "Resume visuals"
    : "Pause visuals";
}
function loadSnapshot(snapshot, seconds = 0, opts) {
  manualOverride();
  session.active = structuredClone(snapshot);
  engine.load(session.active, seconds, opts);
  renderScene();
  changed();
}
function updateActive() {
  manualOverride();
  engine.setSnapshot(session.active);
  changed();
}
function undoEdit(reverse = false) {
  const ids = transport.identities(session.cues);
  const previous = session;
  const next = history.restore(session, reverse);
  if (!next) return;
  session = validateSession(next, scenes);
  transport.restore(session.cues, ids);
  engine.options = session.options;
  engine.mappings = session.mappings;
  if (previous.options.quality !== session.options.quality) {
    resizeQuality();
    governor.setCeiling(session.options.quality);
  }
  // Editing history is not transport history. Never reset a playing seed.
  if (
    !transport.playing &&
    JSON.stringify(previous.active) !== JSON.stringify(session.active)
  ) {
    if (
      previous.active.scene === session.active.scene &&
      previous.active.seed === session.active.seed
    )
      engine.setSnapshot(session.active);
    else engine.load(session.active, 0);
  }
  renderAll();
  changed();
}
function bindGesture(node) {
  node.onpointerdown = checkpoint;
  node.onkeydown = (event) => {
    if (!event.repeat && event.key.startsWith("Arrow")) checkpoint();
  };
  node.onchange = () => history.commit(session);
}
function renderScene() {
  const scene = currentScene();
  $("sceneName").textContent = `${scene.number} / ${scene.name}`;
  $("controlHeading").textContent = scene.name;
  $("sceneDescription").textContent = scene.description;
  $("sceneList").replaceChildren(
    ...scenes.map((definition) => {
      const node = button(`${definition.number} · ${definition.name}`, () => {
        checkpoint();
        loadSnapshot(presetSnapshot(definition), 2);
      });
      node.setAttribute("aria-pressed", String(definition.id === scene.id));
      return node;
    }),
  );
  $("presetStrip").replaceChildren(
    ...scene.presets.map((preset, index) => {
      const node = button(preset.name, () => {
        checkpoint();
        loadSnapshot(presetSnapshot(scene, index), 1.5);
      });
      node.setAttribute(
        "aria-pressed",
        String(preset.name === session.active.preset),
      );
      return node;
    }),
  );
  $("sceneControls").replaceChildren(
    ...scene.schema.map((field) => {
      const box = el("div", undefined, "control"),
        label = el("label", field.label);
      const number = el("input"),
        range = el("input");
      number.type = "number";
      range.type = "range";
      number.min = range.min = field.min;
      number.max = range.max = field.max;
      number.step = range.step = field.step;
      number.value = range.value = session.active.params[field.key];
      number.id = `number-${field.key}`;
      range.id = `control-${field.key}`;
      label.htmlFor = range.id;
      number.setAttribute("aria-label", field.label + " value");
      label.append(number);
      const update = (event) => {
        let value = numberValue(event.target.value);
        if (!Number.isFinite(value)) {
          event.target.value = session.active.params[field.key];
          return;
        }
        value = Math.min(field.max, Math.max(field.min, value));
        if (field.step === 1) value = Math.round(value);
        if (session.active.params[field.key] === value) return;
        if (event.target === number) checkpoint();
        session.active.params[field.key] = value;
        session.active.preset = "Custom look";
        number.value = range.value = value;
        updateActive();
      };
      bindGesture(range);
      range.oninput = update;
      number.onchange = update;
      box.append(label, range);
      return box;
    }),
  );
  $("seedInput").value = session.active.seed;
  for (const key of ["primary", "secondary", "accent"])
    $(key + "Color").value = session.active.palette[key];
  $("mappingTarget").replaceChildren(
    ...scene.schema.map((field) => {
      const node = el("option", field.label);
      node.value = field.key;
      return node;
    }),
  );
  $("midiTarget").replaceChildren(
    ...["go", "blackout", "brightness", "crossfade", "tempo"].map((key) => {
      const node = el("option", key);
      node.value = key;
      return node;
    }),
    ...scene.schema.map((field) => {
      const node = el("option", scene.name + " / " + field.label);
      node.value = scene.id + "." + field.key;
      return node;
    }),
  );
}
function renderOptions() {
  for (const [id, key] of optionValues) $(id).value = session.options[key];
  for (const [id, key] of optionChecks) $(id).checked = session.options[key];
  $("tempoInput").value = session.tempo;
  $("setNameInput").value = session.name;
  $("playSetButton").textContent = transport.playing
    ? "Pause score"
    : "Play score";
}
const optionValues = [
  ["brightnessInput", "brightness"],
  ["bloomInput", "bloom"],
  ["kaleidoInput", "kaleido"],
  ["echoInput", "echo"],
  ["chromaInput", "chroma"],
  ["qualityInput", "quality"],
];
const optionChecks = [
  ["reducedMotionInput", "reducedMotion"],
  ["autoQualityInput", "autoQuality"],
  ["autoRecoveryInput", "autoRecovery"],
  ["flashLimitInput", "flashLimit"],
];
function updateCueState() {
  $("playSetButton").textContent = transport.playing
    ? "Pause score"
    : "Play score";
  const pending = transport.pendingCue;
  $("pendingCue").textContent = pending
    ? `NEXT ${pending.index + 1} · ${Math.max(0, pending.beat - transport.beat).toFixed(1)} beats`
    : "";
  $("cueList")
    .querySelectorAll(".cue-row")
    .forEach((row, index) => {
      row.classList.toggle("current", index === transport.currentCue);
      row.classList.toggle("selected", index === transport.selectedCue);
      row.setAttribute(
        "aria-current",
        index === transport.currentCue ? "true" : "false",
      );
      row.querySelector(".next-cue").textContent =
        index === pending?.index ? "NEXT" : "";
    });
}
function renderCues() {
  const total = session.cues.reduce(
    (sum, cue) => sum + (cue.bars * 4 * 60) / session.tempo,
    0,
  );
  $("setDuration").textContent =
    `${session.cues.length} cues · ${(total / 60).toFixed(1)} min / loop`;
  $("cueList").replaceChildren(
    ...session.cues.map((cue, index) => {
      const row = el("div", undefined, "cue-row"),
        name = el("input");
      name.value = cue.name;
      name.maxLength = 80;
      name.className = "cue-name";
      name.setAttribute("aria-label", `Cue ${index + 1} name`);
      name.onchange = () => {
        if (!name.value.trim()) {
          name.value = cue.name;
          return;
        }
        checkpoint();
        cue.name = name.value;
        changed();
      };
      const select = button(String(index + 1).padStart(2, "0"), () => {
        transport.selectedCue = index;
        renderCues();
      });
      select.setAttribute("aria-label", `Select cue ${index + 1}`);
      const numeric = (label, key, min, max, step, integer = false) => {
        const input = el("input");
        input.type = "number";
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = cue[key] ?? 0.5;
        input.setAttribute("aria-label", `Cue ${index + 1} ${label}`);
        input.onchange = () => {
          const value = numberValue(input.value);
          if (
            !Number.isFinite(value) ||
            value < min ||
            value > max ||
            (integer && !Number.isInteger(value))
          ) {
            input.value = cue[key] ?? 0.5;
            return;
          }
          checkpoint();
          const ids = transport.identities(session.cues);
          cue[key] = value;
          if (key === "bars") {
            cue.keyframes = cue.keyframes.filter(
              (frame) => frame.beat <= value * 4,
            );
            transport.restore(session.cues, ids);
          }
          changed();
        };
        const field = el("label", label);
        field.append(input);
        return field;
      };
      const move = (delta) => {
        const destination = Math.max(
          0,
          Math.min(session.cues.length - 1, index + delta),
        );
        if (destination === index) return;
        checkpoint();
        const ids = transport.identities(session.cues);
        [session.cues[index], session.cues[destination]] = [
          session.cues[destination],
          session.cues[index],
        ];
        ids.selected = cue.id;
        transport.restore(session.cues, ids);
        changed();
        renderCues();
      };
      row.append(
        select,
        name,
        el("small", cue.snapshot.scene),
        el("strong", "", "next-cue"),
        numeric("bars", "bars", 1, 256, 1, true),
        numeric("transition beats", "transition", 0, 32, 0.5),
        numeric("director energy", "energy", 0, 1, 0.05),
        button("GO", () => queueCue(index)),
        button("Capture", () => {
          checkpoint();
          cue.snapshot = structuredClone(session.active);
          cue.keyframes = [];
          transport.restore(session.cues, transport.identities(session.cues));
          changed();
          renderCues();
        }),
        button("↑", () => move(-1)),
        button("↓", () => move(1)),
        button("Copy", () => {
          if (session.cues.length >= 256) throw new Error("Cue limit reached");
          checkpoint();
          const ids = transport.identities(session.cues),
            copy = structuredClone(cue);
          copy.id = crypto.randomUUID();
          session.cues.splice(index + 1, 0, copy);
          transport.restore(session.cues, ids);
          changed();
          renderCues();
        }),
        button("Remove", () => {
          if (session.cues.length === 1)
            throw new Error("Keep at least one cue");
          checkpoint();
          const ids = transport.identities(session.cues);
          session.cues.splice(index, 1);
          transport.restore(session.cues, ids);
          changed();
          renderCues();
        }),
      );
      return row;
    }),
  );
  transport.selectedCue = Math.max(
    0,
    Math.min(transport.selectedCue, session.cues.length - 1),
  );
  const cue = session.cues[transport.selectedCue];
  $("keyframeList").replaceChildren(
    ...cue.keyframes.map((frame, index) => {
      const row = el("div", undefined, "route");
      row.append(
        el("span", `Beat ${frame.beat} · ${frame.snapshot.preset}`),
        button("Remove", () => {
          checkpoint();
          cue.keyframes.splice(index, 1);
          transport.restore(session.cues, transport.identities(session.cues));
          changed();
          renderCues();
        }),
      );
      return row;
    }),
  );
  updateCueState();
}
function realizeCue(index, requestedAt) {
  if (index === null) return;
  const cue = session.cues[index];
  telemetry.cueRequested(requestedAt);
  session.active = structuredClone(cue.snapshot);
  history.rebase(session, [["active"]]);
  engine.load(session.active, (cue.transition * 60) / effectiveTempo());
  deferUI(true); // Cue entry never rebuilds cue rows or autosaves in rAF.
}
function enterCue(index) {
  const requestedAt = performance.now();
  realizeCue(transport.enter(session.cues, index), requestedAt);
}
function queueCue(index) {
  const requestedAt = performance.now();
  realizeCue(
    transport.queue(session.cues, index, $("quantizeInput").checked),
    requestedAt,
  );
  updateCueState();
  if (transport.pendingCue) toast(`Cue ${index + 1} armed for next bar`);
}
function nextCue(direction = 1) {
  queueCue(
    transport.next(
      session.cues,
      direction,
      $("autopilotInput").checked,
      audio.features.energy,
    ),
  );
}
function toggleScore() {
  const requestedAt = performance.now();
  realizeCue(transport.score(session.cues), requestedAt);
  updateCueState();
}
function addCue() {
  if (session.cues.length >= 256) throw new Error("Cue limit reached");
  checkpoint();
  session.cues.push({
    id: crypto.randomUUID(),
    name: session.active.preset,
    snapshot: structuredClone(session.active),
    bars: 32,
    transition: 4,
    keyframes: [],
    energy: 0.5,
  });
  transport.selectedCue = session.cues.length - 1;
  renderCues();
  changed();
  toast("Complete look captured as cue");
}
function renderRoutes() {
  $("mappingList").replaceChildren(
    ...session.mappings.map((mapping, index) => {
      const row = el("div", undefined, "route");
      row.append(
        el(
          "span",
          `${mapping.source} → ${mapping.scene}.${mapping.target} · ${(mapping.depth * 100).toFixed(0)}%`,
        ),
        button("Remove", () => {
          checkpoint();
          session.mappings.splice(index, 1);
          changed();
          renderRoutes();
        }),
      );
      return row;
    }),
  );
  $("midiList").replaceChildren(
    ...session.midi.map((mapping, index) => {
      const row = el("div", undefined, "route");
      row.append(
        el(
          "span",
          `${mapping.type} ${mapping.number} / ch ${mapping.channel + 1} → ${mapping.target}`,
        ),
        button("Forget", () => {
          checkpoint();
          session.midi.splice(index, 1);
          changed();
          renderRoutes();
        }),
      );
      return row;
    }),
  );
}
function renderGarden() {
  selectedLineage = Math.min(
    selectedLineage,
    Math.max(0, session.lineages.length - 1),
  );
  $("lineageInput").replaceChildren(
    ...session.lineages.map((lineage, index) => {
      const node = el(
        "option",
        lineage.nodes[0]?.name || `Lineage ${index + 1}`,
      );
      node.value = index;
      return node;
    }),
  );
  $("lineageInput").value = selectedLineage;
  const lineage = session.lineages[selectedLineage];
  if (!lineage) {
    locked.clear();
    $("lockList").replaceChildren();
    $("lineageList").replaceChildren(
      el("p", "Start a lineage from any look to breed bounded variations."),
    );
    return;
  }
  const selected = lineage.nodes.find((node) => node.id === lineage.selectedId);
  const scene = scenes.find((definition) => definition.id === selected.scene);
  pruneLocks(locked, scene);
  $("lockList").replaceChildren(
    ...scene.schema.map((field) => {
      const label = el("label", "Lock " + field.label),
        input = el("input");
      input.type = "checkbox";
      input.checked = locked.has(field.key);
      input.onchange = () =>
        input.checked ? locked.add(field.key) : locked.delete(field.key);
      label.prepend(input);
      return label;
    }),
  );
  $("lineageList").replaceChildren(
    ...lineage.nodes.map((node) => {
      const box = el(
          "div",
          undefined,
          "node" + (node.id === lineage.selectedId ? " selected" : ""),
        ),
        name = el("input");
      name.value = node.name;
      name.maxLength = 80;
      name.setAttribute("aria-label", "Discovery name");
      name.onchange = () => {
        if (!name.value.trim()) {
          name.value = node.name;
          return;
        }
        checkpoint();
        node.name = name.value;
        changed();
      };
      box.append(
        name,
        el(
          "small",
          node.parentId === null
            ? "Root"
            : `Child of ${lineage.nodes.find((parent) => parent.id === node.parentId)?.name || "root"}`,
        ),
        button("Audition", () => {
          checkpoint();
          session.lineages[selectedLineage] = selectNode(lineage, node.id);
          loadSnapshot(nodeSnapshot(node), 1);
          renderGarden();
        }),
      );
      return box;
    }),
  );
}
function nodeSnapshot(node) {
  return {
    scene: node.scene,
    preset: node.name,
    seed: node.seed,
    params: node.params,
    palette: session.active.palette,
  };
}
function startLineage() {
  if (session.lineages.length >= 20) throw new Error("Lineage limit reached");
  checkpoint();
  session.lineages.push(
    createLineage(currentScene(), {
      name: session.active.preset,
      seed: session.active.seed,
      params: session.active.params,
    }),
  );
  selectedLineage = session.lineages.length - 1;
  locked.clear();
  renderGarden();
  changed();
  switchTab("garden");
}
function breed() {
  const lineage = session.lineages[selectedLineage];
  if (!lineage) throw new Error("Start a lineage first");
  if (lineage.nodes.length > 125)
    throw new Error(
      "Lineage is full (128 nodes). Export discoveries before starting another.",
    );
  const parent = lineage.nodes.find((node) => node.id === lineage.selectedId);
  const scene = scenes.find((definition) => definition.id === parent.scene);
  pruneLocks(locked, scene);
  checkpoint();
  session.lineages[selectedLineage] = breedSiblings(
    lineage,
    scene,
    [randomSeed(), randomSeed(), randomSeed()],
    { strength: numberValue($("mutationInput").value), locked: [...locked] },
  );
  renderGarden();
  changed();
}
function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0] & 2147483647;
}
function renderAll() {
  renderScene();
  renderOptions();
  renderCues();
  renderRoutes();
  renderGarden();
}
function switchTab(name) {
  document
    .querySelectorAll("[data-tab]")
    .forEach((node) =>
      node.setAttribute("aria-pressed", String(node.dataset.tab === name)),
    );
  for (const tab of ["scenes", "set", "audio", "garden"])
    $("tab-" + tab).hidden = tab !== name;
}
function blackout(value = !engine.blackoutTarget) {
  if (value && !engine.blackoutTarget) telemetry.blackoutRequested();
  if (!value) telemetry.blackoutCancelled();
  engine.blackoutTarget = value ? 1 : 0;
  $("blackoutButton").textContent = value ? "Recover [B]" : "Blackout [B]";
}
function safeLook() {
  checkpoint();
  transport.manual();
  transport.paused = false;
  blackout(false);
  session.options.brightness = 0.65;
  session.options.bloom = 0;
  session.options.reducedMotion = true;
  loadSnapshot(
    presetSnapshot(scenes.find((scene) => scene.id === "interference")),
    0.4,
    { flashExempt: true },
  );
  renderOptions();
  $("pauseButton").textContent = "Pause visuals";
  updateCueState();
  if ($("helpDialog").open) $("helpDialog").close();
  toast("Safe look restored · low motion, no strobe");
}
function handleClock(event) {
  if (!$("clockInput").checked) return;
  const requestedAt = performance.now();
  realizeCue(transport.clock(event, requestedAt, session.cues), requestedAt);
  $("pauseButton").textContent = transport.paused
    ? "Resume visuals"
    : "Pause visuals";
  deferUI();
}
function handleMidi(message) {
  for (const action of route(message, session.midi, midiEdges, midiLearn)) {
    if (action.type === "edge") midiEdges.set(action.key, action.active);
    else if (action.type === "error") toast(action.message, "error");
    else if (action.type === "learn") {
      checkpoint();
      session.midi = action.maps;
      midiLearn = null;
      $("midiLearnButton").textContent = "Learn next control";
      changed();
      renderRoutes();
    } else if (action.type === "go") nextCue();
    else if (action.type === "blackout") blackout();
    else if (action.type === "value") {
      const value = action.value;
      if (action.target === "crossfade") {
        setMix(value);
        continue;
      }
      if (action.target === "brightness") {
        session.options.brightness = value;
        $("brightnessInput").value = value;
        history.rebase(session, [["options", "brightness"]]);
        changed();
      } else if (action.target === "tempo") {
        session.tempo = 40 + value * 160;
        $("tempoInput").value = session.tempo;
        history.rebase(session, [["tempo"]]);
        changed();
      } else {
        const [scene, key] = action.target.split(".");
        if (scene !== session.active.scene) continue;
        const field = currentScene().schema.find(
          (definition) => definition.key === key,
        );
        if (!field) continue;
        let next = field.min + value * (field.max - field.min);
        if (field.step === 1) next = Math.round(next);
        session.active.params[key] = next;
        session.active.preset = "Custom look";
        history.rebase(session, [["active"]]);
        updateActive();
        // Preserve focused controls; update their values rather than rebuilding.
        if ($("control-" + key)) $("control-" + key).value = next;
        if ($("number-" + key)) $("number-" + key).value = next;
      }
    }
  }
}
function setMix(value) {
  if (engine.transition) {
    engine.transition.manual = true;
    engine.transition.elapsed = value * engine.transition.duration;
    if (value >= 1) {
      engine.destroySlot(engine.slots.shift());
      engine.transition = null;
    }
  }
  $("crossfadeInput").value = value;
  engine.present();
}
async function refreshDevices() {
  const previous = $("deviceInput").value,
    devices = await audio.devices();
  const defaultOption = el("option", "Default input");
  defaultOption.value = "";
  $("deviceInput").replaceChildren(
    defaultOption,
    ...devices.map((device) => {
      const node = el("option", device.name);
      node.value = device.id;
      return node;
    }),
  );
  $("deviceInput").value = selectedDevice(previous, devices);
}
async function requestWake() {
  if (!navigator.wakeLock || document.visibilityState !== "visible") return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {}
}
function resizeQuality() {
  engine.resize(
    ...{ high: [1920, 1080], balanced: [1280, 720], low: [960, 540] }[
      session.options.quality
    ],
  );
  engine.present();
}
function download(blob, name) {
  const node = el("a");
  node.href = URL.createObjectURL(blob);
  node.download = name;
  node.click();
  setTimeout(() => URL.revokeObjectURL(node.href), 2000);
}
function showImportReport(report) {
  $("importReport").replaceChildren(
    ...report.map((message) => el("p", message)),
  );
  $("importReport").hidden = !report.length;
}
function applySession(value, edit = true) {
  const next = validateSession(value, scenes);
  if (edit) checkpoint();
  transport.manual();
  transport.selectedCue = 0;
  session = next;
  engine.options = session.options;
  engine.mappings = session.mappings;
  engine.load(session.active, 0);
  resizeQuality();
  governor.setCeiling(session.options.quality);
  renderAll();
  changed();
}
async function importSet(file) {
  if (!file || file.size > 32 * 1024 * 1024)
    throw new Error("Import a JSON set up to 32 MB");
  const raw = await file.text(),
    parsed = JSON.parse(raw);
  const next =
    parsed?.format === "phosphor-set-v1"
      ? migrateLegacy(parsed, scenes)
      : validateSession(parsed, scenes);
  if (parsed?.format === "phosphor-set-v1") {
    persistence.backup(raw);
    $("recoveryButton").hidden = false;
  }
  applySession(next);
  showImportReport(importReport(parsed));
  toast("Portable set imported · reattach local audio if needed");
}
function wire() {
  document.querySelectorAll("[data-tab]").forEach((node) => {
    node.onclick = () => switchTab(node.dataset.tab);
  });
  $("helpButton").onclick = () => $("helpDialog").showModal();
  $("pauseButton").onclick = togglePause;
  $("blackoutButton").onclick = () => blackout();
  $("safeButton").onclick = safeLook;
  $("resetButton").onclick = () => {
    engine.load(session.active, 0);
    toast("Seed reset");
  };
  $("undoButton").onclick = () => guard(() => undoEdit());
  $("redoButton").onclick = () => guard(() => undoEdit(true));
  $("seedInput").onchange = () => {
    const value = numberValue($("seedInput").value);
    if (!Number.isInteger(value) || value < 0 || value > 2147483647) {
      $("seedInput").value = session.active.seed;
      return;
    }
    checkpoint();
    manualOverride();
    session.active.seed = value;
    engine.load(session.active, 0);
    changed();
  };
  $("newSeedButton").onclick = () => {
    checkpoint();
    manualOverride();
    session.active.seed = randomSeed();
    engine.load(session.active, 0);
    renderScene();
    changed();
  };
  $("addCueButton").onclick = () => guard(addCue);
  $("playSetButton").onclick = toggleScore;
  $("goButton").onclick = () => nextCue();
  $("previousCueButton").onclick = () => nextCue(-1);
  $("auditionCueButton").onclick = () => enterCue(transport.selectedCue);
  $("crossfadeInput").oninput = (event) => setMix(Number(event.target.value));
  $("setNameInput").onchange = (event) => {
    if (!event.target.value.trim()) {
      event.target.value = session.name;
      return;
    }
    checkpoint();
    session.name = event.target.value;
    changed();
  };
  $("keyframeButton").onclick = () =>
    guard(() => {
      const cue = session.cues[transport.selectedCue],
        beat = numberValue($("keyframeBeatInput").value);
      if (session.active.scene !== cue.snapshot.scene)
        throw new Error("Keyframe must match selected cue family");
      if (!Number.isFinite(beat) || beat < 0 || beat > cue.bars * 4)
        throw new Error("Beat offset outside cue duration");
      if (cue.keyframes.length >= 32) throw new Error("Keyframe limit reached");
      checkpoint();
      cue.keyframes = cue.keyframes.filter((frame) => frame.beat !== beat);
      cue.keyframes.push({ beat, snapshot: structuredClone(session.active) });
      cue.keyframes.sort((a, b) => a.beat - b.beat);
      transport.restore(session.cues, transport.identities(session.cues));
      changed();
      renderCues();
    });
  $("tempoInput").onchange = (event) => {
    const value = numberValue(event.target.value);
    if (!Number.isFinite(value) || value < 40 || value > 200) {
      event.target.value = session.tempo;
      return;
    }
    checkpoint();
    session.tempo = value;
    audio.tempo = value;
    changed();
    renderCues();
  };
  let taps = [];
  $("tapButton").onclick = () => {
    const now = performance.now();
    if (taps.length && now - taps.at(-1) > 2000) taps = [];
    taps.push(now);
    if (taps.length > 6) taps.shift();
    if (taps.length < 2) return;
    checkpoint();
    session.tempo = Math.min(
      200,
      Math.max(
        40,
        Math.round(60000 / ((taps.at(-1) - taps[0]) / (taps.length - 1))),
      ),
    );
    audio.tempo = session.tempo;
    $("tempoInput").value = session.tempo;
    changed();
    renderCues();
  };
  for (const [id, key] of optionValues.filter(
    ([id]) => id !== "qualityInput",
  )) {
    bindGesture($(id));
    $(id).oninput = (event) => {
      if (!history.pending) checkpoint();
      session.options[key] = Number(event.target.value);
      engine.options = session.options;
      engine.present();
      changed();
    };
  }
  for (const key of ["primary", "secondary", "accent"]) {
    bindGesture($(key + "Color"));
    $(key + "Color").oninput = (event) => {
      if (!history.pending) checkpoint();
      session.active.palette[key] = event.target.value;
      updateActive();
    };
  }
  $("qualityInput").onchange = (event) => {
    if (capture.recording) {
      event.target.value = session.options.quality;
      toast("Stop recording before changing output dimensions");
      return;
    }
    checkpoint();
    session.options.quality = event.target.value;
    governor.setCeiling(session.options.quality);
    resizeQuality();
    changed();
  };
  for (const [id, key] of optionChecks)
    $(id).onchange = (event) => {
      checkpoint();
      session.options[key] = event.target.checked;
      changed();
    };
  $("demoAudioButton").onclick = () =>
    guard(() => audio.demo($("demoPattern").value));
  $("audioFileInput").onchange = (event) =>
    guard(async () => {
      if (event.target.files[0]) await audio.file(event.target.files[0]);
      event.target.value = "";
    });
  $("micButton").onclick = () =>
    guard(async () => {
      await audio.input($("deviceInput").value);
      await refreshDevices();
    });
  $("tabAudioButton").onclick = () => guard(() => audio.tab());
  navigator.mediaDevices?.addEventListener("devicechange", () =>
    guard(refreshDevices),
  );
  $("stopAudioButton").onclick = () => audio.stop();
  $("muteButton").onclick = () => {
    audio.mute(!audio.muted);
    $("muteButton").textContent = audio.muted
      ? "Unmute monitoring"
      : "Mute monitoring";
  };
  $("addMappingButton").onclick = () =>
    guard(() => {
      if (session.mappings.length >= 64)
        throw new Error("Mapping limit reached");
      const depth = numberValue($("mappingDepth").value);
      if (!Number.isFinite(depth) || depth < -1 || depth > 1)
        throw new Error("Depth must be -1 to 1");
      checkpoint();
      session.mappings.push({
        scene: session.active.scene,
        source: $("mappingSource").value,
        target: $("mappingTarget").value,
        depth,
      });
      changed();
      renderRoutes();
    });
  $("midiButton").onclick = () => guard(() => midi.connect());
  $("midiLearnButton").onclick = () => {
    midiLearn = midiLearn ? null : $("midiTarget").value;
    $("midiLearnButton").textContent = midiLearn
      ? "Cancel learn (move a control)"
      : "Learn next control";
  };
  $("breedButton").onclick = () => guard(startLineage);
  $("newLineageButton").onclick = () => guard(startLineage);
  $("generationButton").onclick = () => guard(breed);
  $("lineageInput").onchange = (event) => {
    selectedLineage = Number(event.target.value);
    locked.clear();
    renderGarden();
  };
  $("undoGenerationButton").onclick = () =>
    guard(() => {
      const lineage = session.lineages[selectedLineage];
      if (!lineage) throw new Error("No lineage");
      checkpoint();
      const next = undoGeneration(lineage);
      session.lineages[selectedLineage] = next;
      loadSnapshot(
        nodeSnapshot(next.nodes.find((node) => node.id === next.selectedId)),
        1,
      );
      renderGarden();
    });
  $("promoteButton").onclick = () =>
    guard(() => {
      const lineage = session.lineages[selectedLineage],
        node = lineage?.nodes.find(
          (candidate) => candidate.id === lineage.selectedId,
        );
      if (!node) throw new Error("Select a discovery");
      checkpoint();
      loadSnapshot(nodeSnapshot(node), 0);
      addCue();
      switchTab("set");
    });
  $("saveButton").onclick = () =>
    guard(() => {
      if (
        persistence.blocked &&
        persistence.recoveryRaw &&
        !persistence.recoveryDownloaded
      )
        throw new Error(
          "Download the recovery backup before saving a new set.",
        );
      persistence.blocked = false;
      $("saveButton").textContent = "Save now";
      persistence.save(session);
    });
  $("recoveryButton").onclick = () =>
    guard(() => {
      if (!persistence.recoveryRaw) return;
      download(
        new Blob([persistence.recoveryRaw], { type: "application/json" }),
        "phosphor-recovery-original.json",
      );
      persistence.recoveryDownloaded = true;
      toast(
        "Original backup download requested. Keep it safe before replacing local data.",
      );
    });
  $("exportButton").onclick = () =>
    guard(() => {
      const valid = validateSession(session, scenes);
      download(
        new Blob([JSON.stringify(valid, null, 2)], {
          type: "application/json",
        }),
        "phosphor-set-v2.json",
      );
      toast("Exported phosphor-set-v2.json");
    });
  $("importInput").onchange = (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    guard(() => importSet(file));
  };
  $("captureButton").onclick = () => guard(capture.capture);
  $("recordButton").onclick = () => guard(capture.toggleRecord);
  $("framesButton").onclick = () => guard(capture.renderFrames);
  $("cancelExportButton").onclick = capture.cancel;
  $("fullscreenButton").onclick = () =>
    guard(async () => {
      await $("stage").parentElement.requestFullscreen();
      await requestWake();
    });
  $("outputButton").onclick = () =>
    guard(() => {
      output.show();
      requestWake();
    });
  const gesture = (event) => {
    const rect = $("stage").getBoundingClientRect();
    engine.gesture = [
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      1,
    ];
  };
  $("stage").onpointerdown = (event) => {
    $("stage").focus();
    $("stage").setPointerCapture(event.pointerId);
    gesture(event);
  };
  $("stage").onpointermove = (event) => {
    if (event.buttons & 1) gesture(event);
  };
  $("stage").style.touchAction = "none";
  window.onkeydown = (event) => {
    const action = shortcutFor({
      key: event.key,
      code: event.code,
      target: event.target,
      repeat: event.repeat,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      helpOpen: $("helpDialog").open,
    });
    if (!action) return;
    event.preventDefault();
    if (action === "blackout") blackout();
    else if (action === "safe") safeLook();
    else if (action === "pause") togglePause();
    else if (action === "reset") $("resetButton").click();
    else if (action === "undo" || action === "redo")
      guard(() => undoEdit(action === "redo"));
    else if (action === "go") nextCue();
    else if (action === "gesture") {
      if (engine.blackoutTarget) blackout(false);
      else engine.gesture = [0.5, 0.5, 1];
    } else {
      const index = scenes.indexOf(currentScene());
      checkpoint();
      loadSnapshot(
        presetSnapshot(
          scenes[
            (index + (action === "scene-next" ? 1 : scenes.length - 1)) %
              scenes.length
          ],
        ),
        2,
      );
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") requestWake();
  });
  window.addEventListener("storage", (event) =>
    persistence.externalChange(event),
  );
  window.addEventListener("beforeunload", (event) => {
    if (capture.recording || capture.exporting || persistence.dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("pagehide", () => {
    guard(() => persistence.flush(session));
    capture.pagehide();
    audio.dispose();
    midi.dispose();
    wakeLock?.release();
  });
}
let last = performance.now(),
  lastHud = 0,
  lastGovernor = 0,
  lastWatchdog = 0,
  blankCount = 0;
function frame(now, schedule = true) {
  if (schedule) requestAnimationFrame(frame);
  try {
    const delta = Math.max(0, (now - last) / 1000);
    last = Math.max(last, now);
    const clockWasLive = transport.midiAt !== null;
    const requestedAt = performance.now();
    realizeCue(
      transport.tick(
        delta,
        now,
        session.cues,
        session.tempo,
        $("clockInput").checked,
        $("autopilotInput").checked,
        audio.features.energy,
      ),
      requestedAt,
    );
    if (
      $("clockInput").checked &&
      clockWasLive &&
      now - transport.midiAt >= 1500
    ) {
      transport.midiAt = null;
      toast("MIDI clock lost. Continuing at manual tempo.");
    }
    if (!transport.paused && transport.playing) {
      const snapshot = transport.snapshot();
      if (snapshot) engine.setSnapshot(snapshot);
    }
    engine.beat = transport.beat;
    audio.tempo = effectiveTempo(now);
    engine.features = audio.sample(Math.min(0.1, delta));
    const interval = governor.frame(now, session.options.quality);
    if (interval > 0) {
      engine.advance(interval / 1000, transport.paused);
      telemetry.presented(performance.now(), interval, engine);
    }
    if (now - lastHud > 250) {
      const stats = engine.stats();
      $("status").textContent = transport.paused
        ? "Paused · clock held"
        : transport.playing
          ? "Score live"
          : transport.currentCue >= 0
            ? "Score paused"
            : "Manual performance";
      $("renderStatus").textContent =
        `${engine.width}×${engine.height} · ${stats.median ? Math.round(1000 / stats.median) : "—"} fps · ${engine.transition ? "transition" : "live"}`;
      $("beatReadout").textContent =
        `${Math.floor(transport.beat / 4) + 1} · ${Math.floor(transport.beat % 4) + 1}${$("clockInput").checked ? ` · ${Math.round(effectiveTempo(now))} BPM` : ""}`;
      $("cueProgress").textContent =
        transport.currentCue < 0
          ? "No cue active"
          : `Cue ${transport.currentCue + 1} · ${(Math.max(0, transport.playing ? transport.cueEnd - transport.beat : transport.remainingBeats) / 4).toFixed(1)} bars left`;
      $("crossfadeInput").value = engine.transition
        ? engine.transition.elapsed / engine.transition.duration
        : 1;
      for (const [key, value] of Object.entries(audio.features))
        if ($("meter-" + key)) $("meter-" + key).value = value;
      updateCueState();
      lastHud = now;
    }
    if (now - lastGovernor > 10000) {
      lastGovernor = now;
      const stats = engine.stats();
      const next = governor.assess(
        stats.p95,
        session.options.quality,
        session.options.autoQuality &&
          !capture.recording &&
          !capture.exporting &&
          !engine.transition &&
          stats.frames > 120,
      );
      if (next) {
        session.options.quality = next;
        history.rebase(session, [["options", "quality"]]);
        resizeQuality();
        renderOptions();
        changed();
        toast("Adaptive renderer changed quality to " + next);
      }
    }
    if (
      now - lastWatchdog > 5000 &&
      !transport.paused &&
      !engine.blackoutTarget &&
      !engine.lost &&
      !capture.exporting &&
      session.options.autoRecovery
    ) {
      lastWatchdog = now;
      const health = engine.health();
      if (health) {
        const unusable =
          health.mean < 0.025 || (health.mean > 250 && health.variance < 1);
        blankCount =
          unusable && session.options.brightness > 0.1 ? blankCount + 1 : 0;
        if (blankCount >= 6) {
          engine.load(session.active, 0);
          toast("Dark output watchdog restarted current seed");
          blankCount = 0;
        }
      }
    }
  } catch (error) {
    transport.playing = false;
    transport.paused = true;
    toast(
      "Performance paused after an error: " +
        error.message +
        ". Use Safe look to recover.",
      "error",
    );
  }
}
async function boot() {
  try {
    const loaded = persistence.load();
    session = loaded.session;
    if (loaded.error)
      toast(
        "Saved set rejected: " +
          loaded.error.message +
          " · original retained; download recovery backup",
        "error",
      );
    if (loaded.migrated) {
      toast(
        "v1 set migrated to GPU models. Original local data retained; visuals are intentionally corrected.",
      );
      showImportReport(importReport(JSON.parse(persistence.recoveryRaw)));
    }
    $("recoveryButton").hidden = !persistence.recoveryRaw;
    if (persistence.blocked) $("saveButton").textContent = "Save new set";
    session.options.reducedMotion ||= matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    governor.setCeiling(session.options.quality);
    engine = new Engine($("stage"), scenes, (message) =>
      toast(message, "error"),
    );
    engine.options = session.options;
    engine.mappings = session.mappings;
    engine.load(session.active, 0);
    resizeQuality();
    $("audioMeters").replaceChildren(
      ...Object.keys(audio.features).map((key) => {
        const label = el("label", key, "meter"),
          meter = el("meter");
        meter.id = "meter-" + key;
        meter.min = 0;
        meter.max = 1;
        meter.value = 0;
        label.append(meter);
        return label;
      }),
    );
    renderAll();
    wire();
    guard(refreshDevices);
    window.__phosphor = {
      scenes,
      engine,
      audio,
      getSession: () => structuredClone(session),
      applySession,
      outputStream: () => $("stage").captureStream(60),
      outputFrame: (now) => frame(now, false),
      stats: () => engine.stats(),
      telemetry: () =>
        telemetry.drain(
          performance.now(),
          session,
          transport,
          governor,
          engine,
          performance.memory?.usedJSHeapSize ?? null,
        ),
      ready: true,
    };
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => {
          let notified = false;
          const notify = () => {
            if (
              !notified &&
              updateWaiting(registration, navigator.serviceWorker.controller)
            ) {
              notified = true;
              toast(
                "New release cached. Finish recording, close all Phosphor windows, then reopen to update.",
              );
            }
          };
          notify();
          registration.addEventListener("updatefound", () =>
            registration.installing?.addEventListener("statechange", notify),
          );
        })
        .catch(() =>
          toast("Offline cache unavailable; keep this page open during a show"),
        );
    requestAnimationFrame(frame);
  } catch (error) {
    $("fatal").hidden = false;
    $("fatal").textContent = "Renderer could not start: " + error.message;
    $("status").textContent = "Renderer unavailable";
    console.error(error);
  }
}
boot();
