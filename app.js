import acid from "./scene-acid.mjs";
import magnetic from "./scene-magnetic.mjs";
import cathedral from "./scene-cathedral.mjs";
import aquarium from "./scene-aquarium.mjs";
import tapestry from "./scene-tapestry.mjs";
import feedback from "./scene-feedback.mjs";
import interference from "./scene-interference.mjs";
import melt from "./scene-melt.mjs";
import phase from "./scene-phase.mjs";
import evolution from "./scene-evolution.mjs";
import { Engine } from "./engine.mjs";
import { AudioEngine, MidiInput } from "./audio.mjs";
import {
  initialSession,
  validateSession,
  presetSnapshot,
  interpolateSnapshot,
  migrateLegacy,
  readSetFile,
} from "./session.mjs";
import {
  createLineage,
  breedLineage,
  selectNode,
  undoGeneration,
} from "./evolution.mjs";
const scenes = [
  acid,
  magnetic,
  cathedral,
  aquarium,
  tapestry,
  feedback,
  interference,
  melt,
  phase,
  evolution,
];
const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const button = (text, action) => {
  const b = el("button", text);
  b.type = "button";
  b.onclick = () => guard(action);
  return b;
};
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4500);
}
async function guard(action) {
  try {
    return await action();
  } catch (e) {
    toast(e.message || String(e));
  }
}
let session = initialSession(scenes),
  engine;
const audio = new AudioEngine(
  (message) => ($("audioStatus").textContent = message),
);
let beat = 0,
  paused = false,
  playing = false,
  currentCue = -1,
  selectedCue = 0,
  cueStart = 0,
  cueEnd = 0,
  remainingBeats = 0,
  pendingCue = null,
  undo = [],
  redo = [],
  saveTimer,
  selectedLineage = 0,
  locked = new Set(),
  midiLearn = null,
  midiClockAt = 0,
  midiBeat = 0,
  midiTempo = 92,
  midiOffset = 0,
  midiPausedAt = null,
  wakeLock = null,
  recording = null,
  exportCancelled = false,
  exporting = false;
const midiEdges = new Map();
const recentCues = [];
let recoveryRaw = null,
  autosaveBlocked = false,
  recoveryDownloaded = false,
  unsavedSet = false;
function manualOverride() {
  playing = false;
  currentCue = -1;
  pendingCue = null;
  remainingBeats = 0;
  renderCues();
}
function cueIdentities() {
  return {
    current: session.cues[currentCue]?.id,
    selected: session.cues[selectedCue]?.id,
    pending: pendingCue ? session.cues[pendingCue.index]?.id : null,
  };
}
function restoreCueIdentities(ids) {
  currentCue = session.cues.findIndex((c) => c.id === ids.current);
  selectedCue = Math.max(
    0,
    session.cues.findIndex((c) => c.id === ids.selected),
  );
  if (pendingCue) {
    pendingCue.index = session.cues.findIndex((c) => c.id === ids.pending);
    if (pendingCue.index < 0) pendingCue = null;
  }
  if (currentCue < 0) playing = false;
}
function togglePause() {
  paused = !paused;
  if (paused) midiPausedAt = midiBeat;
  else if (midiPausedAt !== null) {
    midiOffset -= midiBeat - midiPausedAt;
    midiPausedAt = null;
  }
  $("pauseButton").textContent = paused ? "Resume visuals" : "Pause visuals";
}
const midi = new MidiInput(
  handleMidi,
  handleClock,
  (message) => ($("midiStatus").textContent = message),
);
function currentScene() {
  return scenes.find((s) => s.id === session.active.scene);
}
function effectiveTempo(now = performance.now()) {
  return $("clockInput").checked && midiClockAt && now - midiClockAt < 1500
    ? midiTempo
    : session.tempo;
}
function checkpoint() {
  undo.push(structuredClone(session));
  if (undo.length > 50) undo.shift();
  redo = [];
}
function save() {
  unsavedSet = true;
  if (autosaveBlocked) {
    $("saveReadout").textContent = "Recovery required · original save retained";
    return;
  }
  try {
    localStorage.setItem("phosphor-set-v2", JSON.stringify(session));
    unsavedSet = false;
    $("saveReadout").textContent =
      "Saved locally · " + new Date().toLocaleTimeString();
  } catch {
    $("saveReadout").textContent = "Storage unavailable · export your set";
    toast("Local storage unavailable. Export set to preserve your work.");
  }
}
function changed() {
  unsavedSet = true;
  clearTimeout(saveTimer);
  $("saveReadout").textContent = "Saving…";
  saveTimer = setTimeout(save, 400);
  engine.options = session.options;
  engine.mappings = session.mappings;
}
function loadSnapshot(snapshot, seconds = 0, fromScore = false) {
  if (!fromScore) manualOverride();
  session.active = structuredClone(snapshot);
  engine.load(session.active, seconds);
  renderScene();
  changed();
}
function updateActive() {
  manualOverride();
  engine.setSnapshot(session.active);
  changed();
}
function undoEdit(reverse = false) {
  const source = reverse ? redo : undo,
    target = reverse ? undo : redo;
  if (!source.length) return;
  target.push(structuredClone(session));
  session = source.pop();
  playing = false;
  pendingCue = null;
  currentCue = -1;
  selectedCue = Math.min(selectedCue, session.cues.length - 1);
  engine.options = session.options;
  engine.mappings = session.mappings;
  engine.load(session.active, 0);
  renderAll();
  changed();
}
function renderScene() {
  const scene = currentScene();
  $("sceneName").textContent = `${scene.number} / ${scene.name}`;
  $("controlHeading").textContent = scene.name;
  $("sceneDescription").textContent = scene.description;
  $("sceneList").replaceChildren(
    ...scenes.map((s) => {
      const b = button(`${s.number} · ${s.name}`, () => {
        checkpoint();
        manualOverride();
        loadSnapshot(presetSnapshot(s), 2);
        renderCues();
      });
      b.setAttribute("aria-pressed", String(s.id === scene.id));
      return b;
    }),
  );
  $("presetStrip").replaceChildren(
    ...scene.presets.map((p, i) => {
      const b = button(p.name, () => {
        checkpoint();
        manualOverride();
        loadSnapshot(presetSnapshot(scene, i), 1.5);
      });
      b.setAttribute("aria-pressed", String(p.name === session.active.preset));
      return b;
    }),
  );
  $("sceneControls").replaceChildren(
    ...scene.schema.map((def) => {
      const box = el("div", undefined, "control"),
        label = el("label", def.label),
        number = el("input"),
        range = el("input");
      number.type = "number";
      range.type = "range";
      number.min = range.min = def.min;
      number.max = range.max = def.max;
      number.step = range.step = def.step;
      number.value = range.value = session.active.params[def.key];
      number.id = `number-${def.key}`;
      range.id = `control-${def.key}`;
      label.htmlFor = range.id;
      number.setAttribute("aria-label", def.label + " value");
      label.append(number);
      const update = (e) => {
        let v = Number(e.target.value);
        if (!Number.isFinite(v)) {
          e.target.value = session.active.params[def.key];
          return;
        }
        v = Math.min(def.max, Math.max(def.min, v));
        if (def.step === 1) v = Math.round(v);
        session.active.params[def.key] = v;
        session.active.preset = "Custom look";
        number.value = range.value = v;
        updateActive();
      };
      range.onpointerdown = checkpoint;
      range.onkeydown = (e) => {
        if (e.key.startsWith("Arrow")) checkpoint();
      };
      number.onfocus = checkpoint;
      range.oninput = update;
      number.onchange = update;
      box.append(label, range);
      return box;
    }),
  );
  $("seedInput").value = session.active.seed;
  for (const key of ["primary", "secondary", "accent"])
    $(key + "Color").value = session.active.palette[key];
  const targets = scene.schema.map((d) => {
    const o = el("option", d.label);
    o.value = d.key;
    return o;
  });
  $("mappingTarget").replaceChildren(...targets);
  $("midiTarget").replaceChildren(
    ...["go", "blackout", "brightness", "crossfade", "tempo"].map((k) => {
      const o = el("option", k);
      o.value = k;
      return o;
    }),
    ...scene.schema.map((d) => {
      const o = el("option", scene.name + " / " + d.label);
      o.value = scene.id + "." + d.key;
      return o;
    }),
  );
}
function renderOptions() {
  for (const [id, key] of [
    ["brightnessInput", "brightness"],
    ["bloomInput", "bloom"],
    ["kaleidoInput", "kaleido"],
    ["qualityInput", "quality"],
  ])
    $(id).value = session.options[key];
  $("reducedMotionInput").checked = session.options.reducedMotion;
  $("autoQualityInput").checked = session.options.autoQuality;
  $("autoRecoveryInput").checked = session.options.autoRecovery;
  $("tempoInput").value = session.tempo;
  $("setNameInput").value = session.name;
  $("playSetButton").textContent = playing ? "Pause score" : "Play score";
}
function renderCues() {
  const total = session.cues.reduce(
    (n, c) => n + (c.bars * 4 * 60) / session.tempo,
    0,
  );
  $("setDuration").textContent =
    `${session.cues.length} cues · ${(total / 60).toFixed(1)} min / loop`;
  $("playSetButton").textContent = playing ? "Pause score" : "Play score";
  $("cueList").replaceChildren(
    ...session.cues.map((cue, i) => {
      const row = el(
        "div",
        undefined,
        "cue-row" +
          (i === currentCue ? " current" : "") +
          (i === selectedCue ? " selected" : ""),
      );
      const name = el("input");
      name.value = cue.name;
      name.maxLength = 80;
      name.className = "cue-name";
      name.setAttribute("aria-label", `Cue ${i + 1} name`);
      name.onchange = () => {
        if (!name.value.trim()) {
          name.value = cue.name;
          return;
        }
        checkpoint();
        cue.name = name.value;
        changed();
      };
      const select = button(String(i + 1).padStart(2, "0"), () => {
        selectedCue = i;
        renderCues();
      });
      select.setAttribute("aria-label", `Select cue ${i + 1}`);
      const bars = el("input");
      bars.type = "number";
      bars.min = 1;
      bars.max = 256;
      bars.value = cue.bars;
      bars.setAttribute("aria-label", `Cue ${i + 1} bars`);
      bars.onchange = () => {
        const v = Number(bars.value);
        if (!Number.isInteger(v) || v < 1 || v > 256) {
          bars.value = cue.bars;
          return;
        }
        checkpoint();
        const elapsed =
          i === currentCue
            ? Math.max(
                0,
                playing ? beat - cueStart : cue.bars * 4 - remainingBeats,
              )
            : 0;
        cue.bars = v;
        cue.keyframes = cue.keyframes.filter((k) => k.beat <= v * 4);
        if (i === currentCue) {
          remainingBeats = Math.max(0, v * 4 - elapsed);
          if (playing) cueEnd = beat + remainingBeats;
        }
        changed();
        renderCues();
      };
      const energyInput = el("input");
      energyInput.type = "number";
      energyInput.min = 0;
      energyInput.max = 1;
      energyInput.step = 0.05;
      energyInput.value = cue.energy ?? 0.5;
      energyInput.setAttribute("aria-label", `Cue ${i + 1} director energy`);
      energyInput.onchange = () => {
        const value = Number(energyInput.value);
        if (!Number.isFinite(value) || value < 0 || value > 1) {
          energyInput.value = cue.energy ?? 0.5;
          return;
        }
        checkpoint();
        cue.energy = value;
        changed();
      };
      const fade = el("input");
      fade.type = "number";
      fade.min = 0;
      fade.max = 32;
      fade.step = 0.5;
      fade.value = cue.transition;
      fade.setAttribute("aria-label", `Cue ${i + 1} transition beats`);
      fade.onchange = () => {
        const v = Number(fade.value);
        if (!Number.isFinite(v) || v < 0 || v > 32) {
          fade.value = cue.transition;
          return;
        }
        checkpoint();
        cue.transition = v;
        changed();
      };
      const move = (delta) => {
        checkpoint();
        const ids = cueIdentities();
        const j = Math.max(0, Math.min(session.cues.length - 1, i + delta));
        [session.cues[i], session.cues[j]] = [session.cues[j], session.cues[i]];
        ids.selected = cue.id;
        restoreCueIdentities(ids);
        changed();
        renderCues();
      };
      const field = (text, input) => {
        const label = el("label", text);
        label.append(input);
        return label;
      };
      row.append(
        select,
        name,
        el("small", cue.snapshot.scene),
        field("Bars", bars),
        field("Fade beats", fade),
        field("Energy", energyInput),
        button("GO", () => queueCue(i)),
        button("Capture", () => {
          checkpoint();
          cue.snapshot = structuredClone(session.active);
          cue.keyframes = [];
          changed();
          renderCues();
        }),
        button("↑", () => move(-1)),
        button("↓", () => move(1)),
        button("Copy", () => {
          if (session.cues.length >= 256) throw new Error("Cue limit reached");
          checkpoint();
          const ids = cueIdentities();
          const clone = structuredClone(cue);
          clone.id = crypto.randomUUID();
          session.cues.splice(i + 1, 0, clone);
          restoreCueIdentities(ids);
          changed();
          renderCues();
        }),
        button("Remove", () => {
          if (session.cues.length === 1)
            throw new Error("Keep at least one cue");
          checkpoint();
          if (currentCue === i) {
            playing = false;
            currentCue = -1;
          } else if (currentCue > i) currentCue--;
          session.cues.splice(i, 1);
          selectedCue = Math.min(selectedCue, session.cues.length - 1);
          pendingCue = null;
          changed();
          renderCues();
        }),
      );
      return row;
    }),
  );
  const cue = session.cues[selectedCue];
  $("keyframeList").replaceChildren(
    ...cue.keyframes.map((k, i) => {
      const row = el("div", undefined, "route");
      row.append(
        el("span", `Beat ${k.beat} · ${k.snapshot.preset}`),
        button("Remove", () => {
          checkpoint();
          cue.keyframes.splice(i, 1);
          changed();
          renderCues();
        }),
      );
      return row;
    }),
  );
}
function enterCue(index, startBeat = beat) {
  currentCue = index;
  selectedCue = index;
  const cue = session.cues[index];
  recentCues.push(cue.id);
  if (recentCues.length > 4) recentCues.shift();
  cueStart = startBeat;
  cueEnd = cueStart + cue.bars * 4;
  remainingBeats = Math.max(0, cueEnd - beat);
  loadSnapshot(cue.snapshot, (cue.transition * 60) / effectiveTempo(), true);
  renderCues();
  pendingCue = null;
}
function queueCue(index) {
  pendingCue = {
    index,
    beat: $("quantizeInput").checked ? Math.ceil((beat + 0.001) / 4) * 4 : beat,
  };
  if (pendingCue.beat <= beat) enterCue(index);
  else toast(`Cue ${index + 1} armed for next bar`);
}
function directorIndex() {
  if (session.cues.length <= 1) return 0;
  const energy = audio.features.energy;
  const candidates = session.cues
    .map((cue, index) => ({
      index,
      score:
        Math.abs((cue.energy ?? 0.5) - energy) +
        (recentCues.includes(cue.id) ? 0.35 : 0) +
        Math.abs(Math.sin(beat * 0.13 + index * 2.7)) * 0.12,
    }))
    .filter((c) => c.index !== currentCue);
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0].index;
}
function nextCue(direction = 1) {
  const index =
    $("autopilotInput").checked && direction > 0
      ? directorIndex()
      : currentCue < 0
        ? direction > 0
          ? 0
          : session.cues.length - 1
        : (currentCue + direction + session.cues.length) % session.cues.length;
  queueCue(index);
}
function toggleScore() {
  if (playing) {
    remainingBeats = Math.max(0, cueEnd - beat);
    playing = false;
  } else {
    playing = true;
    if (currentCue < 0) enterCue(0);
    else {
      cueEnd = beat + remainingBeats;
      cueStart = cueEnd - session.cues[currentCue].bars * 4;
    }
  }
  renderCues();
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
  selectedCue = session.cues.length - 1;
  renderCues();
  changed();
  toast("Complete look captured as cue");
}
function renderRoutes() {
  $("mappingList").replaceChildren(
    ...session.mappings.map((m, i) => {
      const row = el("div", undefined, "route");
      row.append(
        el(
          "span",
          `${m.source} → ${m.scene}.${m.target} · ${(m.depth * 100).toFixed(0)}%`,
        ),
        button("Remove", () => {
          checkpoint();
          session.mappings.splice(i, 1);
          changed();
          renderRoutes();
        }),
      );
      return row;
    }),
  );
  $("midiList").replaceChildren(
    ...session.midi.map((m, i) => {
      const row = el("div", undefined, "route");
      row.append(
        el("span", `${m.type} ${m.number} / ch ${m.channel + 1} → ${m.target}`),
        button("Forget", () => {
          checkpoint();
          session.midi.splice(i, 1);
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
    ...session.lineages.map((l, i) => {
      const o = el("option", l.nodes[0]?.name || `Lineage ${i + 1}`);
      o.value = i;
      return o;
    }),
  );
  $("lineageInput").value = selectedLineage;
  const lineage = session.lineages[selectedLineage];
  if (!lineage) {
    $("lockList").replaceChildren();
    $("lineageList").replaceChildren(
      el("p", "Start a lineage from any look to breed bounded variations."),
    );
    return;
  }
  const selected = lineage.nodes.find((n) => n.id === lineage.selectedId),
    scene = scenes.find((s) => s.id === selected.scene);
  $("lockList").replaceChildren(
    ...scene.schema.map((d) => {
      const label = el("label", "Lock " + d.label),
        input = el("input");
      input.type = "checkbox";
      input.checked = locked.has(d.key);
      input.onchange = () =>
        input.checked ? locked.add(d.key) : locked.delete(d.key);
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
            : `Child of ${lineage.nodes.find((n) => n.id === node.parentId)?.name || "root"}`,
        ),
        button("Audition", () => {
          checkpoint();
          session.lineages[selectedLineage] = selectNode(lineage, node.id);
          loadSnapshot(
            {
              scene: node.scene,
              preset: node.name,
              seed: node.seed,
              params: node.params,
              palette: session.active.palette,
            },
            1,
          );
          renderGarden();
        }),
      );
      return box;
    }),
  );
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
  checkpoint();
  const parentId = lineage.selectedId,
    scene = scenes.find(
      (s) => s.id === lineage.nodes.find((n) => n.id === parentId).scene,
    );
  let next = lineage;
  for (let i = 0; i < 3; i++) {
    next = selectNode(next, parentId);
    next = breedLineage(next, scene, {
      seed: randomSeed(),
      strength: Number($("mutationInput").value),
      locked: [...locked],
    });
  }
  session.lineages[selectedLineage] = next;
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
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.tab === name)),
    );
  for (const tab of ["scenes", "set", "audio", "garden"])
    $("tab-" + tab).hidden = tab !== name;
}
function blackout(value = !engine.blackoutTarget) {
  engine.blackoutTarget = value ? 1 : 0;
  $("blackoutButton").textContent = value ? "Recover [B]" : "Blackout [B]";
}
function safeLook() {
  playing = false;
  pendingCue = null;
  paused = false;
  blackout(false);
  checkpoint();
  session.options.brightness = 0.65;
  session.options.bloom = 0;
  session.options.reducedMotion = true;
  loadSnapshot(presetSnapshot(interference, 0), 0.4);
  renderOptions();
  $("pauseButton").textContent = "Pause visuals";
  renderCues();
  toast("Safe look restored · low motion, no strobe");
}
function handleClock(event) {
  if (!$("clockInput").checked) return;
  if (event.stop) {
    if (playing) remainingBeats = Math.max(0, cueEnd - beat);
    playing = false;
    renderCues();
    return;
  }
  if (event.start) {
    beat = 0;
    midiBeat = 0;
    midiOffset = 0;
    midiClockAt = performance.now();
    paused = false;
    midiPausedAt = null;
    $("pauseButton").textContent = "Pause visuals";
    playing = true;
    enterCue(0);
  }
  if (event.resume) {
    midiOffset = beat - event.beat;
    if (!playing) toggleScore();
  }
  if (event.tempo) {
    midiTempo = Math.max(40, Math.min(200, event.tempo));
    if (!midiClockAt) midiOffset = beat - event.beat;
    midiBeat = event.beat;
    midiClockAt = performance.now();
  }
}
function handleMidi(message) {
  const v = message.value;
  const key = `${message.type}:${message.channel}:${message.number}`;
  const wasActive = midiEdges.get(key) || false;
  midiEdges.set(key, v > 0.5);
  const trigger = message.type === "note" || (v > 0.5 && !wasActive);
  if (midiLearn) {
    const maps = session.midi.filter(
      (m) =>
        !(
          m.type === message.type &&
          m.channel === message.channel &&
          m.number === message.number
        ),
    );
    if (maps.length >= 64) {
      toast(
        "MIDI mapping limit reached. Forget a control before learning another.",
      );
      return;
    }
    checkpoint();
    maps.push({
      type: message.type,
      channel: message.channel,
      number: message.number,
      target: midiLearn,
    });
    session.midi = maps;
    midiLearn = null;
    $("midiLearnButton").textContent = "Learn next control";
    changed();
    renderRoutes();
    return;
  }
  for (const map of session.midi) {
    if (
      map.type !== message.type ||
      map.channel !== message.channel ||
      map.number !== message.number
    )
      continue;
    if (map.target === "go") {
      if (trigger) nextCue();
    } else if (map.target === "blackout") {
      if (trigger) blackout();
    } else if (map.target === "brightness") {
      session.options.brightness = v;
      engine.options = session.options;
      $("brightnessInput").value = v;
      changed();
    } else if (map.target === "crossfade") setMix(v);
    else if (map.target === "tempo") {
      session.tempo = 40 + v * 160;
      $("tempoInput").value = session.tempo;
      changed();
    } else {
      const [scene, key] = map.target.split(".");
      if (scene !== session.active.scene) continue;
      const def = currentScene().schema.find((d) => d.key === key);
      if (def) {
        let value = def.min + v * (def.max - def.min);
        if (def.step === 1) value = Math.round(value);
        session.active.params[key] = value;
        updateActive();
        renderScene();
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
  const devices = await audio.devices();
  $("deviceInput").replaceChildren(
    el("option", "Default input"),
    ...devices.map((d) => {
      const o = el("option", d.name);
      o.value = d.id;
      return o;
    }),
  );
  $("deviceInput").firstChild.value = "";
}
async function requestWake() {
  if (!navigator.wakeLock || document.visibilityState !== "visible") return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {}
}
function resizeQuality() {
  const dimensions = {
    high: [1920, 1080],
    balanced: [1280, 720],
    low: [960, 540],
  }[session.options.quality];
  engine.resize(...dimensions);
  engine.present();
}
function download(blob, name) {
  const a = el("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const png = (canvas) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG capture failed"))),
      "image/png",
    ),
  );
async function importSet(file) {
  const next = await readSetFile(file, scenes);
  checkpoint();
  session = next;
  playing = false;
  currentCue = -1;
  selectedCue = 0;
  pendingCue = null;
  engine.options = session.options;
  engine.mappings = session.mappings;
  engine.load(session.active, 0);
  resizeQuality();
  renderAll();
  changed();
  toast("Portable set imported · reattach local audio if needed");
}
async function toggleRecord() {
  if (recording) {
    if (recording.recorder?.state === "recording") {
      $("recordButton").disabled = true;
      $("recordButton").textContent = "Finalizing recording…";
      recording.recorder.stop();
    }
    return;
  }
  if (!window.MediaRecorder || !$("stage").captureStream)
    throw new Error("Recording unsupported. Capture PNG or render frames.");
  const mime = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error("No supported WebM encoder");
  const owner = {
    recorder: null,
    stream: null,
    writable: null,
    chunks: [],
    bytes: 0,
    pendingBytes: 0,
    chain: Promise.resolve(),
    failed: false,
  };
  recording = owner;
  $("recordButton").disabled = true;
  try {
    if (window.showSaveFilePicker) {
      const handle = await showSaveFilePicker({
        suggestedName: "phosphor-performance.webm",
        types: [
          { description: "WebM video", accept: { "video/webm": [".webm"] } },
        ],
      });
      owner.writable = await handle.createWritable();
    }
    await audio.start();
    owner.stream = $("stage").captureStream(
      session.options.quality === "low" ? 30 : 60,
    );
    for (const track of audio.recordDestination.stream.getAudioTracks())
      owner.stream.addTrack(track.clone());
    const recorder = new MediaRecorder(owner.stream, {
      mimeType: mime,
      videoBitsPerSecond: 6000000,
    });
    owner.recorder = recorder;
    recorder.ondataavailable = (event) => {
      const blob = event.data;
      if (!blob.size || owner.failed) return;
      owner.bytes += blob.size;
      if (owner.writable) {
        owner.pendingBytes += blob.size;
        owner.chain = owner.chain
          .then(() => owner.writable.write(blob))
          .catch((error) => {
            owner.failed = true;
            toast("Recording disk error: " + error.message);
            if (recorder.state === "recording") recorder.stop();
          })
          .finally(() => {
            owner.pendingBytes -= blob.size;
          });
        if (
          owner.pendingBytes > 16 * 1024 * 1024 &&
          recorder.state === "recording"
        ) {
          recorder.stop();
          toast(
            "Disk cannot keep up. Recording stopped; buffered data is being finalized.",
          );
        }
      } else if (owner.bytes <= 64 * 1024 * 1024) owner.chunks.push(blob);
      else if (recorder.state === "recording") {
        recorder.stop();
        toast(
          "64 MB clip limit reached. Use disk recording or OBS for long shows.",
        );
      }
    };
    recorder.onerror = () => {
      owner.failed = true;
      toast("Encoder error. Recording stopped.");
      if (recorder.state === "recording") recorder.stop();
    };
    recorder.onstop = async () => {
      $("recordButton").disabled = true;
      $("recordButton").textContent = "Finalizing recording…";
      try {
        await owner.chain;
        if (owner.writable) {
          if (owner.failed) await owner.writable.abort();
          else await owner.writable.close();
        } else if (!owner.failed && owner.chunks.length) {
          download(
            new Blob(owner.chunks, { type: mime }),
            "phosphor-performance.webm",
          );
        }
        if (!owner.failed) toast("Recording finalized. Safe to close the app.");
      } catch (error) {
        toast(error.message);
      } finally {
        owner.stream.getTracks().forEach((track) => track.stop());
        owner.chunks = [];
        if (recording === owner) recording = null;
        $("recordButton").disabled = false;
        $("recordButton").textContent = "Record WebM";
      }
    };
    recorder.start(1000);
    $("recordButton").disabled = false;
    $("recordButton").textContent = "Stop recording";
    toast(
      owner.writable
        ? "Recording streamed to disk"
        : "Recording short clip · 64 MB memory cap",
    );
  } catch (error) {
    owner.stream?.getTracks().forEach((track) => track.stop());
    if (owner.writable) await owner.writable.abort();
    if (recording === owner) recording = null;
    $("recordButton").disabled = false;
    $("recordButton").textContent = "Record WebM";
    throw error;
  }
}
async function renderFrames() {
  if (exporting) throw new Error("Frame export already running");
  if (!window.showDirectoryPicker)
    throw new Error(
      "Frame export needs desktop Chromium directory access (HTTPS or localhost)",
    );
  exporting = true;
  exportCancelled = false;
  const exportState = structuredClone({
    snapshot: session.active,
    options: session.options,
    tempo: session.tempo,
  });
  const canvas = document.createElement("canvas");
  let renderer;
  let completedFrames = 0;
  try {
    const parentDir = await showDirectoryPicker({ mode: "readwrite" });
    const dir = await parentDir.getDirectoryHandle(
      `phosphor-frames-${Date.now()}-${crypto.randomUUID()}`,
      { create: true },
    );
    $("cancelExportButton").hidden = false;
    renderer = new Engine(canvas, scenes);
    renderer.resize(1280, 720);
    renderer.options = exportState.options;
    renderer.mappings = [];
    renderer.load(exportState.snapshot, 0);
    renderer.beat = 0;
    while (renderer.slots.at(-1).warmTicks > 0 && !exportCancelled) {
      $("saveReadout").textContent = "Preparing scene for frame export";
      renderer.advance(0, true);
      await new Promise((r) => setTimeout(r, 0));
    }
    for (let i = 0; i < 120; i++) {
      if (exportCancelled) break;
      renderer.beat = ((i / 30) * exportState.tempo) / 60;
      renderer.advance(1 / 30);
      const file = await dir.getFileHandle(
        `frame-${String(i).padStart(4, "0")}.png`,
        { create: true },
      );
      const stream = await file.createWritable();
      await stream.write(await png(canvas));
      await stream.close();
      completedFrames++;
      $("saveReadout").textContent = `Rendering frame ${i + 1} / 120`;
      await new Promise((r) => setTimeout(r, 0));
    }
    const file = await dir.getFileHandle("phosphor-sequence.json", {
        create: true,
      }),
      stream = await file.createWritable();
    await stream.write(
      JSON.stringify(
        {
          format: "phosphor-rendered-sequence-v1",
          width: 1280,
          height: 720,
          fps: 30,
          snapshot: exportState.snapshot,
          options: exportState.options,
          tempo: exportState.tempo,
          frames: completedFrames,
          cancelled: exportCancelled,
          note: "No audio or live modulation; deterministic reset trajectory on this GPU.",
        },
        null,
        2,
      ),
    );
    await stream.close();
    toast(
      exportCancelled
        ? "Export cancelled; completed frames retained"
        : "120 PNG frames rendered to selected directory",
    );
  } finally {
    renderer?.dispose();
    exporting = false;
    $("cancelExportButton").hidden = true;
    save();
  }
}
function wire() {
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
  $("helpButton").onclick = () => $("helpDialog").showModal();
  $("pauseButton").onclick = togglePause;
  $("blackoutButton").onclick = () => blackout();
  $("safeButton").onclick = safeLook;
  $("resetButton").onclick = () => {
    engine.load(session.active, 0);
    toast("Seed reset");
  };
  $("undoButton").onclick = () => undoEdit();
  $("redoButton").onclick = () => undoEdit(true);
  $("seedInput").onchange = () => {
    const v = Number($("seedInput").value);
    if (!Number.isInteger(v) || v < 0 || v > 2147483647) {
      $("seedInput").value = session.active.seed;
      return;
    }
    checkpoint();
    manualOverride();
    session.active.seed = v;
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
  $("auditionCueButton").onclick = () => enterCue(selectedCue);
  $("crossfadeInput").oninput = (e) => setMix(Number(e.target.value));
  $("setNameInput").onchange = (e) => {
    if (!e.target.value.trim()) {
      e.target.value = session.name;
      return;
    }
    checkpoint();
    session.name = e.target.value;
    changed();
  };
  $("keyframeButton").onclick = () =>
    guard(() => {
      const cue = session.cues[selectedCue],
        offset = Number($("keyframeBeatInput").value);
      if (session.active.scene !== cue.snapshot.scene)
        throw new Error("Keyframe must match selected cue family");
      if (!Number.isFinite(offset) || offset < 0 || offset > cue.bars * 4)
        throw new Error("Beat offset outside cue duration");
      if (cue.keyframes.length >= 32) throw new Error("Keyframe limit reached");
      checkpoint();
      cue.keyframes = cue.keyframes.filter((k) => k.beat !== offset);
      cue.keyframes.push({
        beat: offset,
        snapshot: structuredClone(session.active),
      });
      cue.keyframes.sort((a, b) => a.beat - b.beat);
      changed();
      renderCues();
    });
  $("tempoInput").onchange = (e) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v) || v < 40 || v > 200) {
      e.target.value = session.tempo;
      return;
    }
    checkpoint();
    session.tempo = v;
    audio.tempo = v;
    changed();
    renderCues();
  };
  let taps = [];
  $("tapButton").onclick = () => {
    const now = performance.now();
    if (taps.length && now - taps.at(-1) > 2000) taps = [];
    taps.push(now);
    if (taps.length > 6) taps.shift();
    if (taps.length >= 2) {
      const bpm = 60000 / ((taps.at(-1) - taps[0]) / (taps.length - 1));
      session.tempo = Math.min(200, Math.max(40, Math.round(bpm)));
      audio.tempo = session.tempo;
      $("tempoInput").value = session.tempo;
      changed();
      renderCues();
    }
  };
  for (const [id, key] of [
    ["brightnessInput", "brightness"],
    ["bloomInput", "bloom"],
    ["kaleidoInput", "kaleido"],
  ]) {
    $(id).onpointerdown = checkpoint;
    $(id).oninput = (e) => {
      session.options[key] = Number(e.target.value);
      engine.options = session.options;
      engine.present();
      changed();
    };
  }
  for (const key of ["primary", "secondary", "accent"]) {
    $(key + "Color").onfocus = checkpoint;
    $(key + "Color").oninput = (e) => {
      session.active.palette[key] = e.target.value;
      updateActive();
    };
  }
  $("qualityInput").onchange = (e) => {
    if (recording) {
      e.target.value = session.options.quality;
      toast("Stop recording before changing output dimensions");
      return;
    }
    checkpoint();
    session.options.quality = e.target.value;
    resizeQuality();
    changed();
  };
  $("reducedMotionInput").onchange = (e) => {
    checkpoint();
    session.options.reducedMotion = e.target.checked;
    changed();
  };
  $("autoQualityInput").onchange = (e) => {
    session.options.autoQuality = e.target.checked;
    changed();
  };
  $("autoRecoveryInput").onchange = (event) => {
    session.options.autoRecovery = event.target.checked;
    changed();
  };
  $("demoAudioButton").onclick = () => guard(() => audio.demo());
  $("audioFileInput").onchange = (e) =>
    guard(async () => {
      if (e.target.files[0]) await audio.file(e.target.files[0]);
      e.target.value = "";
    });
  $("micButton").onclick = () =>
    guard(async () => {
      await audio.input($("deviceInput").value);
      await refreshDevices();
    });
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
      const depth = Number($("mappingDepth").value);
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
  $("lineageInput").onchange = (e) => {
    selectedLineage = Number(e.target.value);
    locked.clear();
    renderGarden();
  };
  $("undoGenerationButton").onclick = () =>
    guard(() => {
      const l = session.lineages[selectedLineage];
      if (!l) throw new Error("No lineage");
      checkpoint();
      const next = undoGeneration(l);
      session.lineages[selectedLineage] = next;
      const n = next.nodes.find((n) => n.id === next.selectedId);
      loadSnapshot(
        {
          scene: n.scene,
          preset: n.name,
          seed: n.seed,
          params: n.params,
          palette: session.active.palette,
        },
        1,
      );
      renderGarden();
    });
  $("promoteButton").onclick = () =>
    guard(() => {
      const l = session.lineages[selectedLineage],
        n = l?.nodes.find((n) => n.id === l.selectedId);
      if (!n) throw new Error("Select a discovery");
      loadSnapshot(
        {
          scene: n.scene,
          preset: n.name,
          seed: n.seed,
          params: n.params,
          palette: session.active.palette,
        },
        0,
      );
      addCue();
      switchTab("set");
    });
  $("saveButton").onclick = () => {
    if (autosaveBlocked && !recoveryDownloaded) {
      toast("Download the recovery backup before saving a new set.");
      return;
    }
    autosaveBlocked = false;
    $("saveButton").textContent = "Save now";
    save();
  };
  $("recoveryButton").onclick = () =>
    guard(() => {
      if (!recoveryRaw) return;
      download(
        new Blob([recoveryRaw], { type: "application/json" }),
        "phosphor-rejected-save.json",
      );
      recoveryDownloaded = true;
      toast(
        autosaveBlocked
          ? "Backup requested. Save new set explicitly when your download is safe."
          : "Original rejected save downloaded for repair.",
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
    });
  $("importInput").onchange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    guard(() => importSet(file));
  };
  $("captureButton").onclick = () =>
    guard(async () =>
      download(
        await png($("stage")),
        "phosphor-" + session.active.scene + ".png",
      ),
    );
  $("recordButton").onclick = () => guard(toggleRecord);
  $("framesButton").onclick = () => guard(renderFrames);
  $("cancelExportButton").onclick = () => (exportCancelled = true);
  $("fullscreenButton").onclick = () =>
    guard(async () => {
      await $("stage").parentElement.requestFullscreen();
      await requestWake();
    });
  $("outputButton").onclick = () =>
    guard(() => {
      const w = window.open(
        "output.html",
        "phosphor-output",
        "popup,width=1280,height=720",
      );
      if (!w) throw new Error("Allow pop-ups to open the clean output");
      requestWake();
    });
  const gesture = (e) => {
    const rect = $("stage").getBoundingClientRect();
    engine.gesture = [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      1 - Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
      1,
    ];
  };
  $("stage").onpointerdown = (e) => {
    $("stage").focus();
    $("stage").setPointerCapture(e.pointerId);
    gesture(e);
  };
  $("stage").onpointermove = (e) => {
    if (e.buttons & 1) gesture(e);
  };
  $("stage").style.touchAction = "none";
  window.onkeydown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (
        e.key.toLowerCase() === "z" &&
        !e.target.matches("input,textarea,[contenteditable]")
      ) {
        e.preventDefault();
        undoEdit(e.shiftKey);
      }
      return;
    }
    if (
      e.repeat ||
      e.target.closest("input,select,textarea,[contenteditable]") ||
      $("helpDialog").open
    )
      return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      blackout();
    } else if (k === "p") {
      e.preventDefault();
      $("pauseButton").click();
    } else if (k === "r") {
      e.preventDefault();
      $("resetButton").click();
    } else if (k === "escape") safeLook();
    else if (e.code === "Space" && !e.target.closest("button")) {
      e.preventDefault();
      if (engine.blackoutTarget) blackout(false);
      else engine.gesture = [0.5, 0.5, 1];
    } else if (e.key === "Enter" && !e.target.closest("button")) {
      e.preventDefault();
      nextCue();
    } else if (e.shiftKey && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const i = scenes.indexOf(currentScene());
      checkpoint();
      manualOverride();
      loadSnapshot(
        presetSnapshot(
          scenes[
            (i + (e.key === "ArrowRight" ? 1 : scenes.length - 1)) %
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
  window.addEventListener("beforeunload", (event) => {
    if (recording || exporting || unsavedSet) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("pagehide", () => {
    save();
    if (recording?.recorder?.state === "recording") recording.recorder.stop();
    audio.dispose();
    midi.dispose();
    wakeLock?.release();
  });
}
let last = performance.now(),
  lastRender = 0,
  lastHud = 0,
  lastGovernor = 0,
  lastWatchdog = 0,
  blankCount = 0,
  slowWindows = 0;
function frame(now, schedule = true) {
  if (schedule) requestAnimationFrame(frame);
  try {
    const clockDelta = Math.max(0, (now - last) / 1000);
    const dt = Math.min(0.1, clockDelta);
    last = now;
    if (!paused) {
      if ($("clockInput").checked && midiClockAt && now - midiClockAt < 1500)
        beat =
          midiBeat +
          midiOffset +
          (((now - midiClockAt) / 1000) * midiTempo) / 60;
      else {
        beat += (clockDelta * session.tempo) / 60;
        if (
          $("clockInput").checked &&
          midiClockAt &&
          now - midiClockAt >= 1500
        ) {
          midiClockAt = 0;
          toast("MIDI clock lost. Continuing at manual tempo.");
        }
      }
      if (pendingCue && beat >= pendingCue.beat)
        enterCue(pendingCue.index, pendingCue.beat);
      if (playing && beat >= cueEnd) {
        if ($("autopilotInput").checked) enterCue(directorIndex());
        else {
          const cycle = session.cues.reduce((sum, c) => sum + c.bars * 4, 0);
          let start = cueEnd + Math.floor((beat - cueEnd) / cycle) * cycle;
          let index = (currentCue + 1) % session.cues.length;
          for (
            let n = 0;
            n < session.cues.length &&
            beat >= start + session.cues[index].bars * 4;
            n++
          ) {
            start += session.cues[index].bars * 4;
            index = (index + 1) % session.cues.length;
          }
          enterCue(index, start);
        }
      }
      if (playing && currentCue >= 0) {
        const cue = session.cues[currentCue],
          offset = beat - cueStart;
        if (cue.keyframes.length) {
          const points = [
            { beat: 0, snapshot: cue.snapshot },
            ...cue.keyframes,
          ];
          let a = points[0],
            b = null;
          for (const p of points) {
            if (p.beat <= offset) a = p;
            else {
              b = p;
              break;
            }
          }
          engine.setSnapshot(
            b
              ? interpolateSnapshot(
                  a.snapshot,
                  b.snapshot,
                  (offset - a.beat) / (b.beat - a.beat),
                )
              : a.snapshot,
          );
        }
      }
    }
    engine.beat = beat;
    audio.tempo = effectiveTempo(now);
    engine.features = audio.sample(dt);
    if (now - lastRender >= (session.options.quality === "low" ? 32 : 16)) {
      engine.advance((now - lastRender) / 1000 || dt, paused);
      lastRender = now;
    }
    if (now - lastHud > 250) {
      const stats = engine.stats();
      $("status").textContent = paused
        ? "Paused · clock held"
        : playing
          ? "Score live"
          : currentCue >= 0
            ? "Score paused"
            : "Manual performance";
      $("renderStatus").textContent =
        `${engine.width}×${engine.height} · ${stats.median ? Math.round(1000 / stats.median) : "—"} fps · ${engine.transition ? "transition" : "live"}`;
      $("beatReadout").textContent =
        `${Math.floor(beat / 4) + 1} · ${Math.floor(beat % 4) + 1}${$("clockInput").checked ? ` · ${Math.round(effectiveTempo(now))} BPM` : ""}`;
      $("cueProgress").textContent =
        currentCue < 0
          ? "No cue active"
          : `Cue ${currentCue + 1} · ${(Math.max(0, playing ? cueEnd - beat : remainingBeats) / 4).toFixed(1)} bars left`;
      $("crossfadeInput").value = engine.transition
        ? engine.transition.elapsed / engine.transition.duration
        : 1;
      for (const [key, value] of Object.entries(audio.features)) {
        const meter = $("meter-" + key);
        if (meter) meter.value = value;
      }
      lastHud = now;
    }
    if (now - lastGovernor > 10000) {
      lastGovernor = now;
      const stats = engine.stats();
      if (
        session.options.autoQuality &&
        !recording &&
        !exporting &&
        !engine.transition &&
        stats.frames > 120
      ) {
        slowWindows =
          stats.p95 > (session.options.quality === "low" ? 45 : 24)
            ? slowWindows + 1
            : 0;
        if (slowWindows >= 2 && session.options.quality !== "low") {
          session.options.quality =
            session.options.quality === "high" ? "balanced" : "low";
          resizeQuality();
          renderOptions();
          changed();
          toast("Adaptive renderer lowered quality to preserve motion");
          slowWindows = 0;
        }
      }
    }
    if (
      now - lastWatchdog > 5000 &&
      !paused &&
      !engine.blackoutTarget &&
      !engine.lost &&
      !exporting &&
      session.options.autoRecovery
    ) {
      lastWatchdog = now;
      const health = engine.health();
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
  } catch (error) {
    playing = false;
    paused = true;
    toast(
      "Performance paused after an error: " +
        error.message +
        ". Use Safe look to recover.",
    );
  }
}
async function boot() {
  try {
    let stored = null;
    try {
      stored = localStorage.getItem("phosphor-set-v2");
      if (stored) session = validateSession(JSON.parse(stored), scenes);
      else {
        const legacy = localStorage.getItem("phosphor-set-v1");
        if (legacy) {
          stored = legacy;
          session = migrateLegacy(JSON.parse(legacy), scenes);
          toast(
            "v1 set migrated to GPU models. Original local data retained; visuals are intentionally corrected.",
          );
        }
      }
    } catch (e) {
      if (stored) {
        recoveryRaw = stored;
        try {
          localStorage.setItem("phosphor-recovery-v2", stored);
        } catch {
          autosaveBlocked = true;
        }
      }
      toast(
        "Saved set rejected: " +
          e.message +
          " · original retained; download recovery backup",
      );
    }
    try {
      recoveryRaw ||= localStorage.getItem("phosphor-recovery-v2");
    } catch {}
    $("recoveryButton").hidden = !recoveryRaw;
    if (autosaveBlocked) {
      $("saveButton").textContent = "Save new set";
      $("saveReadout").textContent =
        "Recovery required · original save retained";
    }
    session.options.reducedMotion ||= matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    engine = new Engine($("stage"), scenes, toast);
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
      applySession: (value) => {
        const next = validateSession(value, scenes);
        manualOverride();
        session = next;
        selectedCue = 0;
        engine.options = session.options;
        engine.mappings = session.mappings;
        engine.load(session.active, 0);
        resizeQuality();
        renderAll();
        changed();
      },
      outputStream: () => $("stage").captureStream(60),
      outputFrame: (now) => frame(now, false),
      stats: () => engine.stats(),
    };
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            registration.installing?.addEventListener("statechange", () => {
              if (registration.waiting)
                toast(
                  "New release cached. Finish recording, close all Phosphor windows, then reopen to update.",
                );
            });
          });
        })
        .catch(() =>
          toast("Offline cache unavailable; keep this page open during a show"),
        );
    requestAnimationFrame(frame);
  } catch (e) {
    $("fatal").hidden = false;
    $("fatal").textContent = "Renderer could not start: " + e.message;
    $("status").textContent = "Renderer unavailable";
    console.error(e);
  }
}
boot();
