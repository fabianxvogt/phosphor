// Portable show set, format v4 (D57–D59): pages of a 4×8 clip grid,
// library palettes, transitions, shared mixer controls, autopilot and clock settings.
// Older linear scores migrate through v2 and v3 before entering this format.
import {
  presetSnapshot,
  validateSnapshot,
  validateLineages,
  migrateLegacy,
  validateSession,
} from "./session.mjs";
import { GATED } from "./scenes.mjs";
import { MOODS, PALETTES, paletteById } from "./palettes.mjs";

export const FORMAT = "phosphor-set-v4";
export const PAGES = 8;
export const SLOTS = 32; // 4 rows × 8 columns
export const QUANTIZE = ["beat", "bar", "now"];
export const TRANSITIONS = ["auto", "crossfade", "cut", "dissolve", "melt"];
export const SPEEDS = [0.5, 1, 2];
export const AUTOPILOT_BARS = [16, 32, 64];
export const PIXEL_BUDGETS = [0.5, 1, 2.1]; // megapixels
export const MIDI_TARGETS = [
  "blackout",
  "safe",
  "master",
  "energy",
  "hue",
  "zoom",
  "mirror",
  "flash",
  "tap",
  "downbeat",
  "autopilot",
  "freeze",
  "family.0",
  "family.1",
  "family.2",
  ...Array.from({ length: SLOTS }, (_, i) => `slot.${i}`),
];

const record = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const finite = (x, min, max, label) => {
  if (typeof x !== "number" || !Number.isFinite(x) || x < min || x > max)
    throw new Error(`${label} must be ${min}–${max}`);
  return x;
};
const text = (x, label, max = 80) => {
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw new Error(`${label} must be 1–${max} characters`);
  return x;
};
const oneOf = (x, list, label) => {
  if (!list.includes(x))
    throw new Error(`${label} must be one of ${list.join(", ")}`);
  return x;
};

export const DEFAULT_SHARED = Object.freeze({
  master: 0.92,
  hue: 0, // turns, −0.5…0.5
  zoom: 1,
  mirror: 1, // kaleidoscope sectors
});

export function clipFrom(
  snapshot,
  { id, name, energy = 0.5, palette = "custom", transition = "auto" } = {},
) {
  return {
    id,
    name: name ?? snapshot.preset,
    snapshot: {
      ...structuredClone(snapshot),
      palette: { ...(paletteById(palette)?.colors ?? snapshot.palette) },
    },
    palette,
    energy,
    fade: 4,
    transition,
    quantize: "beat",
    autopilot: true,
  };
}

export const LAB_PAGE = PAGES - 1;

// Preset indices with one look of every structural type first, then the
// remaining looks in authored order.
function typesFirst(scene) {
  const all = scene.presets.map((_, i) => i);
  if (!scene.type) return all;
  const first = scene.type.values
    .map((v) => all.find((i) => scene.presets[i].params[scene.type.key] === v))
    .filter((i) => i !== undefined);
  return [...first, ...all.filter((i) => !first.includes(i))];
}

// Authored looks, round-robin across families (each family's first look,
// then each second look, …), every type before repeats, up to `rounds` per
// family and `SLOTS` clips.
function roundRobin(scenes, rounds, { autopilot, idFrom }) {
  const orders = scenes.map(typesFirst);
  const clips = [];
  for (let round = 0; round < rounds; round++)
    scenes.forEach((scene, s) => {
      if (round < orders[s].length && clips.length < SLOTS) {
        const palette = PALETTES[(clips.length + round) % PALETTES.length];
        clips.push({
          ...clipFrom(presetSnapshot(scene, orders[s][round]), {
            id: `clip-${idFrom + clips.length}`,
            palette: palette.id,
          }),
          autopilot,
        });
      }
    });
  return clips;
}

export function initialShowSet(scenes, gated = GATED) {
  // Page 1 holds every type of the gated families, so random autopilot
  // shows them all. Drafts start on the lab page with autopilot off (D55).
  const show = roundRobin(
    scenes.filter((s) => gated.has(s.id)),
    5,
    { autopilot: true, idFrom: 0 },
  );
  const lab = roundRobin(
    scenes.filter((s) => !gated.has(s.id)),
    3,
    { autopilot: false, idFrom: show.length },
  );
  const pages = Array.from({ length: PAGES }, (_, p) => ({
    name: p === LAB_PAGE ? "Lab" : `Page ${p + 1}`,
    mood: null,
    slots: Array.from(
      { length: SLOTS },
      (_, s) => (p === 0 ? show[s] : p === LAB_PAGE ? lab[s] : null) ?? null,
    ),
  }));
  return {
    format: FORMAT,
    version: 4,
    name: "New show",
    pages,
    shared: { ...DEFAULT_SHARED },
    autopilot: { enabled: true, random: true, everyBars: 32, handBackBars: 32 },
    clock: { mode: "auto", manualBpm: 120, latencyMs: 0 },
    options: {
      pixelBudget: 2.1,
      bloom: 0.15,
      echo: 0,
      chroma: 0,
      grain: 0.12,
      vignette: 0.15,
      autoRecovery: true,
      reducedMotion: false,
    },
    midi: [],
    lineages: [],
  };
}

function validateClip(value, scenes, ids) {
  if (value === null) return null;
  if (!record(value)) throw new Error("Invalid clip");
  const id = text(value.id, "Clip id");
  if (ids.has(id)) throw new Error("Duplicate clip id");
  ids.add(id);
  const palette = value.palette;
  if (palette !== "custom" && !paletteById(palette))
    throw new Error("Unknown clip palette");
  const snapshot = validateSnapshot(
    palette === "custom"
      ? value.snapshot
      : { ...value.snapshot, palette: paletteById(palette).colors },
    scenes,
  );
  return {
    id,
    name: text(value.name, "Clip name"),
    snapshot,
    palette,
    energy: finite(value.energy, 0, 1, "Clip energy"),
    fade: finite(value.fade, 0, 32, "Clip fade beats"),
    transition: oneOf(
      value.transition === undefined ? "auto" : value.transition,
      TRANSITIONS,
      "Clip transition",
    ),
    quantize: oneOf(value.quantize, QUANTIZE, "Clip quantize"),
    autopilot: value.autopilot !== false,
  };
}

export function validateShowSet(value, scenes) {
  if (!record(value) || value.format !== FORMAT || value.version !== 4)
    throw new Error("Expected a Phosphor v4 set");
  if (!Array.isArray(value.pages) || value.pages.length !== PAGES)
    throw new Error(`A set has exactly ${PAGES} pages`);
  const ids = new Set();
  const pages = value.pages.map((page, p) => {
    if (
      !record(page) ||
      !Array.isArray(page.slots) ||
      page.slots.length !== SLOTS
    )
      throw new Error(`Page ${p + 1} must have ${SLOTS} slots`);
    return {
      name: text(page.name, "Page name", 40),
      mood: page.mood === null ? null : oneOf(page.mood, MOODS, "Page mood"),
      slots: page.slots.map((clip) => validateClip(clip, scenes, ids)),
    };
  });
  const shared = record(value.shared) ? value.shared : {};
  const autopilot = record(value.autopilot) ? value.autopilot : {};
  const clock = record(value.clock) ? value.clock : {};
  const options = record(value.options) ? value.options : {};
  if (!Array.isArray(value.midi) || value.midi.length > 64)
    throw new Error("Invalid MIDI mappings");
  return {
    format: FORMAT,
    version: 4,
    name: text(value.name, "Set name"),
    pages,
    shared: {
      master: finite(shared.master, 0, 1, "Master"),
      hue: finite(shared.hue, -0.5, 0.5, "Hue"),
      zoom: finite(shared.zoom, 0.5, 2, "Zoom"),
      mirror: finite(shared.mirror, 1, 12, "Mirror"),
    },
    autopilot: {
      enabled: autopilot.enabled !== false,
      random: autopilot.random !== false,
      everyBars: oneOf(autopilot.everyBars, AUTOPILOT_BARS, "Autopilot bars"),
      handBackBars: finite(autopilot.handBackBars, 4, 256, "Hand-back bars"),
    },
    clock: {
      mode: oneOf(clock.mode, ["auto", "manual"], "Clock mode"),
      manualBpm: finite(clock.manualBpm, 40, 200, "Manual tempo"),
      latencyMs: finite(clock.latencyMs, -250, 250, "Latency offset"),
    },
    options: {
      pixelBudget: oneOf(options.pixelBudget, PIXEL_BUDGETS, "Pixel budget"),
      bloom: finite(options.bloom, 0, 1, "Bloom"),
      echo: finite(options.echo, 0, 1, "Echo"),
      chroma: finite(options.chroma, 0, 1, "Chroma"),
      grain: finite(
        options.grain === undefined ? 0.12 : options.grain,
        0,
        1,
        "Grain",
      ),
      vignette: finite(
        options.vignette === undefined ? 0.15 : options.vignette,
        0,
        1,
        "Vignette",
      ),
      autoRecovery: options.autoRecovery !== false,
      reducedMotion: options.reducedMotion === true,
    },
    midi: value.midi.map((m) => {
      if (!record(m) || !["cc", "note"].includes(m.type))
        throw new Error("Invalid MIDI mapping");
      if (!Number.isInteger(m.channel) || !Number.isInteger(m.number))
        throw new Error("MIDI channel and number must be integers");
      return {
        type: m.type,
        channel: finite(m.channel, 0, 15, "MIDI channel"),
        number: finite(m.number, 0, 127, "MIDI number"),
        target: oneOf(m.target, MIDI_TARGETS, "MIDI target"),
      };
    }),
    lineages: validateLineages(value.lineages, scenes),
  };
}

// v2 → v3 (decision D12): cues become clips on consecutive pages in score
// order; cue energy becomes clip energy and transition beats the fade.
// Keyframes, bar lengths, manual audio routing, the crossfade/tempo/go MIDI
// targets and MIDI clock have no v3 equivalent and are reported as dropped.
export function migrateV2(v2, scenes) {
  const set = initialShowSet(scenes);
  set.format = "phosphor-set-v3";
  set.version = 3;
  for (const page of set.pages) delete page.mood;
  const report = [];
  set.name = v2.name;
  for (const page of set.pages) page.slots.fill(null);
  if (v2.cues.length > PAGES * SLOTS)
    report.push(`Only the first ${PAGES * SLOTS} cues fit the grid.`);
  v2.cues.slice(0, PAGES * SLOTS).forEach((cue, i) => {
    set.pages[Math.floor(i / SLOTS)].slots[i % SLOTS] = {
      id: `clip-${i}`,
      name: cue.name,
      snapshot: structuredClone(cue.snapshot),
      energy: cue.energy ?? 0.5,
      fade: Math.min(32, cue.transition),
      quantize: "bar",
      autopilot: true,
    };
  });
  const keyframed = v2.cues.filter((c) => c.keyframes.length).length;
  if (keyframed)
    report.push(
      `Keyframes dropped from ${keyframed} cue(s); the linear score is retired.`,
    );
  if (v2.mappings.length)
    report.push(
      `${v2.mappings.length} audio routing(s) dropped; families now define their own energy response.`,
    );
  set.clock.manualBpm = Math.max(40, Math.min(200, v2.tempo));
  set.shared.master = v2.options.brightness;
  set.shared.mirror = v2.options.kaleido;
  set.options.bloom = v2.options.bloom;
  set.options.echo = v2.options.echo;
  set.options.chroma = v2.options.chroma;
  set.options.reducedMotion = v2.options.reducedMotion;
  set.options.autoRecovery = v2.options.autoRecovery;
  set.options.pixelBudget =
    { high: 2.1, balanced: 1, low: 0.5 }[v2.options.quality] ?? 1;
  const targets = { brightness: "master", blackout: "blackout" };
  for (const m of v2.midi) {
    if (targets[m.target]) set.midi.push({ ...m, target: targets[m.target] });
    else report.push(`MIDI mapping to "${m.target}" dropped.`);
  }
  set.lineages = structuredClone(v2.lineages);
  const migrated = migrateV3(set, scenes);
  return { set: migrated.set, report: [...report, ...migrated.report] };
}

// v3 → v4 is lossless: a library ID must never reinterpret authored colours.
export function migrateV3(v3, scenes) {
  if (!record(v3) || v3.format !== "phosphor-set-v3" || v3.version !== 3)
    throw new Error("Expected a Phosphor v3 set");
  const next = structuredClone(v3);
  next.format = FORMAT;
  next.version = 4;
  if (Array.isArray(next.pages))
    for (const page of next.pages) {
      if (!record(page)) continue;
      page.mood = null;
      if (Array.isArray(page.slots))
        page.slots = page.slots.map((clip) =>
          record(clip) ? { ...clip, palette: "custom" } : clip,
        );
    }
  return { set: validateShowSet(next, scenes), report: [] };
}

// Any supported file → { set, report }. v1 (including v6 14-family sets)
// goes through the existing v1 → v2 migration first.
export function parseShowSet(parsed, scenes) {
  if (parsed?.format === FORMAT)
    return { set: validateShowSet(parsed, scenes), report: [] };
  if (parsed?.format === "phosphor-set-v3") return migrateV3(parsed, scenes);
  const v2 =
    parsed?.format === "phosphor-set-v1"
      ? migrateLegacy(parsed, scenes)
      : validateSession(parsed, scenes);
  return migrateV2(v2, scenes);
}

export function clipAt(set, page, slot) {
  return set.pages[page]?.slots[slot] ?? null;
}

// Families with no clip anywhere in the set (sets saved before a family
// existed never gain it on their own).
export function missingFamilies(set, scenes) {
  const present = new Set();
  for (const page of set.pages)
    for (const clip of page.slots) if (clip) present.add(clip.snapshot.scene);
  return scenes.filter((s) => !present.has(s.id));
}

// Puts each missing family's first look into an empty slot of the lab page
// (D53); existing clips are never moved or replaced. Gated families may be
// played by autopilot there, drafts not.
export function addMissingFamilies(set, scenes, gated = GATED) {
  const next = structuredClone(set);
  const ids = new Set();
  for (const page of next.pages)
    for (const clip of page.slots) if (clip) ids.add(clip.id);
  const lab = next.pages[LAB_PAGE];
  const added = [],
    skipped = [];
  let n = 0;
  for (const scene of missingFamilies(set, scenes)) {
    const slot = lab.slots.indexOf(null);
    if (slot < 0) {
      skipped.push(scene.name);
      continue;
    }
    while (ids.has(`clip-added-${n}`)) n++;
    const id = `clip-added-${n}`;
    ids.add(id);
    lab.slots[slot] = {
      ...clipFrom(presetSnapshot(scene, 0), { id }),
      autopilot: gated.has(scene.id),
    };
    added.push(scene.name);
  }
  return { set: validateShowSet(next, scenes), added, skipped };
}
