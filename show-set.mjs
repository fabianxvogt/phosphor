// Portable show set, format v4 (D57–D59): pages of a 4×8 clip grid,
// library palettes, transitions, shared mixer controls, autopilot and clock
// settings, and look ratings for the catalog (D65, optional, defaulted).
// Older linear scores migrate through v2 and v3 before entering this format.
import {
  presetSnapshot,
  validateSnapshot,
  validateLineages,
  migrateLegacy,
  validateSession,
} from "./session.mjs";
import { MOODS, PALETTES, paletteById } from "./palettes.mjs";
import { validRating } from "./catalog.mjs";

export const FORMAT = "phosphor-set-v4";
export const PAGES = 8;
export const SLOTS = 32; // 4 rows × 8 columns
export const QUANTIZE = ["beat", "bar", "now"];
export const TRANSITIONS = ["auto", "crossfade", "cut", "dissolve", "melt"];
export const SPEEDS = [0.5, 1, 2];
export const AUTOPILOT_BARS = [8, 12, 16, 32, 64]; // in-order mode (D66)
export const AUTOPILOT_SOURCES = ["catalog", "page"];
// Megapixels, ascending (the governor steps down this ladder). 8.3 MP is
// native up to 4K (3840 × 2160), the default stage budget (D67).
export const PIXEL_BUDGETS = [0.5, 1, 2.1, 8.3];
export const NATIVE_BUDGET = 8.3;
const OLD_DEFAULT_BUDGET = 2.1;
export const MAX_RATINGS = 4096;
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
  "next",
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

// Every authored look, round-robin across families (each family's first
// look, then each second look, …), every type before repeats, up to `limit`
// clips. Palettes vary within a round (one page) and within a family.
function roundRobin(scenes, limit) {
  const orders = scenes.map(typesFirst);
  const rounds = Math.max(0, ...orders.map((order) => order.length));
  const clips = [];
  for (let round = 0; round < rounds; round++)
    scenes.forEach((scene, s) => {
      if (round < orders[s].length && clips.length < limit) {
        const palette = PALETTES[(s * 7 + round * 5) % PALETTES.length];
        clips.push(
          clipFrom(presetSnapshot(scene, orders[s][round]), {
            id: `clip-${clips.length}`,
            palette: palette.id,
          }),
        );
      }
    });
  return clips;
}

// The pages hold every authored look in that order, so each page mixes
// families and autopilot may play all of them (D65). Looks beyond the 256
// slots are reachable through the catalog.
export function initialShowSet(scenes) {
  const clips = roundRobin(scenes, PAGES * SLOTS);
  const pages = Array.from({ length: PAGES }, (_, p) => ({
    name: `Page ${p + 1}`,
    mood: null,
    slots: Array.from(
      { length: SLOTS },
      (_, s) => clips[p * SLOTS + s] ?? null,
    ),
  }));
  return {
    format: FORMAT,
    version: 4,
    name: "New show",
    pages,
    shared: { ...DEFAULT_SHARED },
    autopilot: {
      enabled: true,
      random: true,
      source: "catalog",
      everyBars: 16,
      handBackBars: 32,
    },
    clock: { mode: "auto", manualBpm: 120, latencyMs: 0 },
    options: {
      pixelBudget: NATIVE_BUDGET,
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
    ratings: {},
  };
}

// Ratings are advisory: malformed entries are dropped, never fatal. Ratings
// of looks this release does not know are kept (a reworked or newer family
// may bring the look back).
function validateRatings(value) {
  const ratings = {};
  if (!record(value)) return ratings;
  let count = 0;
  for (const [id, rating] of Object.entries(value)) {
    if (count >= MAX_RATINGS) break;
    if (id.length > 200 || id.indexOf(":") < 1 || !validRating(rating))
      continue;
    ratings[id] = rating;
    count++;
  }
  return ratings;
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
      source: oneOf(
        autopilot.source === undefined ? "catalog" : autopilot.source,
        AUTOPILOT_SOURCES,
        "Autopilot source",
      ),
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
    ratings: validateRatings(value.ratings),
  };
}

// Sets saved before the catalog (no `ratings` field, D65–D67): the old Lab
// page becomes an ordinary page autopilot may play, and the old default
// stage budget (2.1 MP) becomes native. Applied on load and import only, so
// a later deliberate "Lab" name or 2.1 MP choice is kept.
function normaliseLegacy(parsed, result) {
  if (!record(parsed) || parsed.ratings !== undefined) return result;
  const set = structuredClone(result.set);
  const report = [...result.report];
  const last = set.pages[PAGES - 1];
  if (last.name === "Lab") {
    last.name = `Page ${PAGES}`;
    last.slots = last.slots.map((clip) => clip && { ...clip, autopilot: true });
    report.push(
      `The Lab page is now “Page ${PAGES}”; autopilot may play its clips (the catalog replaces it).`,
    );
  }
  if (set.options.pixelBudget === OLD_DEFAULT_BUDGET) {
    set.options.pixelBudget = NATIVE_BUDGET;
    report.push("Stage resolution raised from 2.1 MP to native (up to 4K).");
  }
  return { set, report };
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
    return normaliseLegacy(parsed, {
      set: validateShowSet(parsed, scenes),
      report: [],
    });
  if (parsed?.format === "phosphor-set-v3")
    return normaliseLegacy(parsed, migrateV3(parsed, scenes));
  const v2 =
    parsed?.format === "phosphor-set-v1"
      ? migrateLegacy(parsed, scenes)
      : validateSession(parsed, scenes);
  return normaliseLegacy(parsed, migrateV2(v2, scenes));
}

export function clipAt(set, page, slot) {
  return set.pages[page]?.slots[slot] ?? null;
}

// A clip id not used anywhere in the set (for clips stored from the catalog).
export function freeClipId(set, prefix = "clip") {
  const ids = new Set();
  for (const page of set.pages)
    for (const clip of page.slots) if (clip) ids.add(clip.id);
  let n = 0;
  while (ids.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}
