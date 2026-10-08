// Portable show set, format v3 (decisions D11–D19): pages of a 4×8 clip
// grid, shared mixer controls, autopilot and clock settings. Replaces the
// v2 linear cue score; v1/v2 files migrate through session.mjs to v2 first.
import {
  presetSnapshot,
  validateSnapshot,
  validateLineages,
  migrateLegacy,
  validateSession,
} from "./session.mjs";

export const FORMAT = "phosphor-set-v3";
export const PAGES = 8;
export const SLOTS = 32; // 4 rows × 8 columns
export const QUANTIZE = ["beat", "bar", "now"];
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

export function clipFrom(snapshot, { id, name, energy = 0.5 } = {}) {
  return {
    id,
    name: name ?? snapshot.preset,
    snapshot: structuredClone(snapshot),
    energy,
    fade: 4,
    quantize: "beat",
    autopilot: true,
  };
}

export function initialShowSet(scenes) {
  const slots = Array(SLOTS).fill(null);
  let n = 0;
  // Page 1: every family's authored looks, one family per column pair.
  for (const scene of scenes)
    scene.presets.slice(0, 3).forEach((_, index) => {
      if (n < SLOTS)
        slots[n] = clipFrom(presetSnapshot(scene, index), {
          id: `clip-${n}`,
          energy: 0.5,
        });
      n++;
    });
  return {
    format: FORMAT,
    version: 3,
    name: "New show",
    pages: [
      { name: "Page 1", slots },
      ...Array.from({ length: PAGES - 1 }, (_, i) => ({
        name: `Page ${i + 2}`,
        slots: Array(SLOTS).fill(null),
      })),
    ],
    shared: { ...DEFAULT_SHARED },
    autopilot: { enabled: true, everyBars: 32, handBackBars: 32 },
    clock: { mode: "auto", manualBpm: 124, latencyMs: 0 },
    options: {
      pixelBudget: 2.1,
      bloom: 0.15,
      echo: 0,
      chroma: 0,
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
  return {
    id,
    name: text(value.name, "Clip name"),
    snapshot: validateSnapshot(value.snapshot, scenes),
    energy: finite(value.energy, 0, 1, "Clip energy"),
    fade: finite(value.fade, 0, 32, "Clip fade beats"),
    quantize: oneOf(value.quantize, QUANTIZE, "Clip quantize"),
    autopilot: value.autopilot !== false,
  };
}

export function validateShowSet(value, scenes) {
  if (!record(value) || value.format !== FORMAT || value.version !== 3)
    throw new Error("Expected a Phosphor v3 set");
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
    version: 3,
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
  return { set: validateShowSet(set, scenes), report };
}

// Any supported file → { set, report }. v1 (including v6 14-family sets)
// goes through the existing v1 → v2 migration first.
export function parseShowSet(parsed, scenes) {
  if (parsed?.format === FORMAT)
    return { set: validateShowSet(parsed, scenes), report: [] };
  const v2 =
    parsed?.format === "phosphor-set-v1"
      ? migrateLegacy(parsed, scenes)
      : validateSession(parsed, scenes);
  return migrateV2(v2, scenes);
}

export function clipAt(set, page, slot) {
  return set.pages[page]?.slots[slot] ?? null;
}
