import { tr } from "./i18n/index.mjs";
// Portable show set, format v5 (D68): the look catalog is the whole
// library — ratings, favourites and the owner's own looks — plus the looks
// on the 32 grid keys, shared mixer controls, autopilot, clock and options.
// There are no pages any more. Older sets migrate v1/v2 → v3 → v4 → v5;
// v4 page clips that differ from their authored look become own looks.
import {
  presetSnapshot,
  validateSnapshot,
  validateLineages,
  migrateLegacy,
  validateSession,
} from "./session.mjs";
import { MOODS, PALETTES, paletteById } from "./palettes.mjs";
import {
  initialRhythm,
  validateRhythm,
  validatePattern,
  effectDefinitions,
} from "./rhythm.mjs";
import {
  validRating,
  catalogLooks,
  sortCatalog,
  lookId,
  OWN_PREFIX,
} from "./catalog.mjs";

import { OUTPUT_RESOLUTIONS } from "./display-resolution.mjs";

export const FORMAT = "phosphor-set-v5";
const V4 = "phosphor-set-v4";
const PAGES = 8; // v4 and older
export const SLOTS = 32; // grid keys: 4 rows × 8 columns
export const KEYS = SLOTS;
export const MAX_LOOKS = 2048; // own looks
export const MAX_FAVORITES = 4096;
export const QUANTIZE = ["beat", "bar", "now"];
export const TRANSITIONS = ["auto", "crossfade", "cut", "dissolve", "melt"];
export const SPEEDS = [0.5, 1, 2];
export const AUTOPILOT_BARS = [8, 12, 16, 32, 64]; // in-order mode (D66)
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
    throw new Error(
      tr("{value1} must be {value2}–{value3}", {
        value1: label,
        value2: min,
        value3: max,
      }),
    );
  return x;
};
const text = (x, label, max = 80) => {
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw new Error(
      tr("{value1} must be 1–{value2} characters", {
        value1: label,
        value2: max,
      }),
    );
  return x;
};
const oneOf = (x, list, label) => {
  if (!list.includes(x))
    throw new Error(
      tr("{value1} must be one of {value2}", {
        value1: label,
        value2: list.join(", "),
      }),
    );
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
  {
    id,
    name,
    energy = 0.5,
    palette = "custom",
    transition = "auto",
    rhythm,
  } = {},
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
    ...(rhythm === undefined
      ? {}
      : { rhythm: rhythm === null ? null : structuredClone(rhythm) }),
  };
}

// A fresh set (D68): nothing rated, no favourites, no own looks; the grid
// keys hold the first 32 looks of the catalog's default order (the control
// replaces them with the first 32 cards of its current view).
export function initialShowSet(scenes) {
  return {
    format: FORMAT,
    version: 5,
    name: tr("New show"),
    looks: [],
    ratings: {},
    favorites: [],
    keys: defaultKeys(scenes),
    mood: null,
    palette: null,
    shared: { ...DEFAULT_SHARED },
    autopilot: {
      enabled: true,
      random: true,
      everyBars: 16,
      handBackBars: 32,
      favoritesOnly: false,
      minRating: 0,
    },
    clock: { mode: "auto", manualBpm: 120, latencyMs: 0 },
    options: defaultOptions(),
    midi: [],
    lineages: [],
    rhythm: initialRhythm(scenes),
  };
}

export function defaultKeys(scenes, set = null) {
  const looks = catalogLooks(scenes, set?.looks ?? []);
  const keys = sortCatalog(looks, set?.ratings ?? {}, set?.favorites ?? [])
    .slice(0, KEYS)
    .map((look) => look.id);
  while (keys.length < KEYS) keys.push(null);
  return keys;
}

function defaultOptions() {
  return {
    pixelBudget: NATIVE_BUDGET,
    outputResolution: "native",
    bloom: 0.15,
    echo: 0,
    chroma: 0,
    grain: 0.12,
    vignette: 0.15,
    autoRecovery: true,
    reducedMotion: false,
  };
}

// A v4-shaped set with empty pages: the target of the v2 → v3 migration.
function emptyV4() {
  return {
    format: V4,
    version: 4,
    name: tr("New show"),
    pages: Array.from({ length: PAGES }, (_, p) => ({
      name: tr("Page {value1}", { value1: p + 1 }),
      mood: null,
      slots: Array(SLOTS).fill(null),
    })),
    shared: { ...DEFAULT_SHARED },
    autopilot: { enabled: true, random: true, everyBars: 16, handBackBars: 32 },
    clock: { mode: "auto", manualBpm: 120, latencyMs: 0 },
    options: defaultOptions(),
    midi: [],
    lineages: [],
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
  if (!record(value)) throw new Error(tr("Invalid clip"));
  const id = text(value.id, tr("Clip id"));
  if (ids.has(id)) throw new Error(tr("Duplicate clip id"));
  ids.add(id);
  const palette = value.palette;
  if (palette !== "custom" && !paletteById(palette))
    throw new Error(tr("Unknown clip palette"));
  const snapshot = validateSnapshot(
    palette === "custom"
      ? value.snapshot
      : { ...value.snapshot, palette: paletteById(palette).colors },
    scenes,
  );
  return {
    id,
    name: text(value.name, tr("Clip name")),
    snapshot,
    palette,
    energy: finite(value.energy, 0, 1, tr("Clip energy")),
    fade: finite(value.fade, 0, 32, tr("Clip fade beats")),
    transition: oneOf(
      value.transition === undefined ? "auto" : value.transition,
      TRANSITIONS,
      tr("Clip transition"),
    ),
    quantize: oneOf(value.quantize, QUANTIZE, tr("Clip quantize")),
    autopilot: value.autopilot !== false,
  };
}

function validateCommon(value, scenes) {
  const shared = record(value.shared) ? value.shared : {};
  const autopilot = record(value.autopilot) ? value.autopilot : {};
  const clock = record(value.clock) ? value.clock : {};
  const options = record(value.options) ? value.options : {};
  if (!Array.isArray(value.midi) || value.midi.length > 64)
    throw new Error(tr("Invalid MIDI mappings"));
  return {
    name: text(value.name, tr("Set name")),
    shared: {
      master: finite(shared.master, 0, 1, tr("Master")),
      hue: finite(shared.hue, -0.5, 0.5, tr("Hue")),
      zoom: finite(shared.zoom, 0.5, 2, tr("Zoom")),
      mirror: finite(shared.mirror, 1, 12, tr("Mirror")),
    },
    autopilot: {
      enabled: autopilot.enabled !== false,
      random: autopilot.random !== false,
      everyBars: oneOf(
        autopilot.everyBars,
        AUTOPILOT_BARS,
        tr("Autopilot bars"),
      ),
      handBackBars: finite(
        autopilot.handBackBars,
        4,
        256,
        tr("Hand-back bars"),
      ),
    },
    clock: {
      mode: oneOf(clock.mode, ["auto", "manual"], tr("Clock mode")),
      manualBpm: finite(clock.manualBpm, 40, 200, tr("Manual tempo")),
      latencyMs: finite(clock.latencyMs, -250, 250, tr("Latency offset")),
    },
    options: {
      pixelBudget: oneOf(
        options.pixelBudget,
        PIXEL_BUDGETS,
        tr("Pixel budget"),
      ),
      outputResolution: oneOf(
        options.outputResolution ?? "native",
        OUTPUT_RESOLUTIONS,
        tr("Output resolution"),
      ),
      bloom: finite(options.bloom, 0, 1, tr("Bloom")),
      echo: finite(options.echo, 0, 1, tr("Echo")),
      chroma: finite(options.chroma, 0, 1, tr("Chroma")),
      grain: finite(
        options.grain === undefined ? 0.12 : options.grain,
        0,
        1,
        tr("Grain"),
      ),
      vignette: finite(
        options.vignette === undefined ? 0.15 : options.vignette,
        0,
        1,
        tr("Vignette"),
      ),
      autoRecovery: options.autoRecovery !== false,
      reducedMotion: options.reducedMotion === true,
    },
    midi: value.midi.map((m) => {
      if (!record(m) || !["cc", "note"].includes(m.type))
        throw new Error(tr("Invalid MIDI mapping"));
      if (!Number.isInteger(m.channel) || !Number.isInteger(m.number))
        throw new Error(tr("MIDI channel and number must be integers"));
      return {
        type: m.type,
        channel: finite(m.channel, 0, 15, tr("MIDI channel")),
        number: finite(m.number, 0, 127, tr("MIDI number")),
        target: oneOf(m.target, MIDI_TARGETS, tr("MIDI target")),
      };
    }),
    lineages: validateLineages(value.lineages, scenes),
  };
}

// A v4 set (pages of clips), only on the way to v5.
function validateV4(value, scenes) {
  if (!record(value) || value.format !== V4 || value.version !== 4)
    throw new Error(tr("Expected a Phosphor v4 set"));
  if (!Array.isArray(value.pages) || value.pages.length !== PAGES)
    throw new Error(
      tr("A v4 set has exactly {value1} pages", { value1: PAGES }),
    );
  const ids = new Set();
  const pages = value.pages.map((page, p) => {
    if (
      !record(page) ||
      !Array.isArray(page.slots) ||
      page.slots.length !== SLOTS
    )
      throw new Error(
        tr("Page {value1} must have {value2} slots", {
          value1: p + 1,
          value2: SLOTS,
        }),
      );
    return {
      name: text(page.name, tr("Page name"), 40),
      mood:
        page.mood === null ? null : oneOf(page.mood, MOODS, tr("Page mood")),
      slots: page.slots.map((clip) => validateClip(clip, scenes, ids)),
    };
  });
  return {
    format: V4,
    version: 4,
    ...validateCommon(value, scenes),
    pages,
    ratings: validateRatings(value.ratings),
  };
}

const LOOK_ID = /^own-[A-Za-z0-9_-]{1,48}$/;
const KNOWN_ID = (id) =>
  typeof id === "string" && id.length <= 200 && id.indexOf(":") > 0;

// An own look (D68): a saved edit or variation of a family.
function validateLook(value, scenes, ids) {
  if (!record(value)) throw new Error(tr("Invalid look"));
  if (typeof value.id !== "string" || !LOOK_ID.test(value.id))
    throw new Error(tr("Own look ids are own-<letters, digits, - or _>"));
  if (ids.has(value.id)) throw new Error(tr("Duplicate look id"));
  ids.add(value.id);
  const palette = value.palette ?? null;
  if (palette !== null && palette !== "custom" && !paletteById(palette))
    throw new Error(tr("Unknown look palette"));
  const snapshot = validateSnapshot(value.snapshot, scenes);
  const rhythm =
    value.rhythm === undefined
      ? {}
      : {
          rhythm:
            value.rhythm === null
              ? null
              : validatePattern(
                  value.rhythm,
                  effectDefinitions(
                    scenes.find((scene) => scene.id === snapshot.scene),
                  ),
                ),
        };
  return {
    id: value.id,
    name: text(value.name, tr("Look name")),
    base: KNOWN_ID(value.base) ? value.base : null,
    snapshot,
    palette,
    transition: oneOf(
      value.transition === undefined ? "auto" : value.transition,
      TRANSITIONS,
      tr("Look transition"),
    ),
    ...rhythm,
  };
}

function validateIds(value, max, own) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  for (const id of value) {
    if (seen.size >= max) break;
    if (KNOWN_ID(id) || (LOOK_ID.test(id ?? "") && own.has(id))) seen.add(id);
  }
  return [...seen];
}

export function validateShowSet(value, scenes) {
  if (!record(value) || value.format !== FORMAT || value.version !== 5)
    throw new Error(tr("Expected a Phosphor v5 set"));
  if (
    !Array.isArray(value.looks ?? []) ||
    (value.looks ?? []).length > MAX_LOOKS
  )
    throw new Error(tr("At most {value1} own looks", { value1: MAX_LOOKS }));
  const ids = new Set();
  const looks = (value.looks ?? []).map((look) =>
    validateLook(look, scenes, ids),
  );
  const common = validateCommon(value, scenes);
  const autopilot = record(value.autopilot) ? value.autopilot : {};
  const minRating = autopilot.minRating ?? 0;
  const keys = Array.isArray(value.keys) ? value.keys : [];
  return {
    format: FORMAT,
    version: 5,
    name: common.name,
    looks,
    ratings: validateRatings(value.ratings),
    favorites: validateIds(value.favorites, MAX_FAVORITES, ids),
    keys: Array.from({ length: KEYS }, (_, i) =>
      KNOWN_ID(keys[i]) || ids.has(keys[i]) ? keys[i] : null,
    ),
    mood:
      value.mood === null || value.mood === undefined
        ? null
        : oneOf(value.mood, MOODS, tr("Mood")),
    // Optional for older sets. The control enables a shared show palette;
    // legacy playback can still use the authored palettes when absent.
    palette: validateShowPalette(value.palette),
    shared: common.shared,
    autopilot: {
      ...common.autopilot,
      favoritesOnly: autopilot.favoritesOnly === true,
      minRating: validRating(minRating) ? minRating : 0,
    },
    clock: common.clock,
    options: common.options,
    midi: common.midi,
    lineages: common.lineages,
    rhythm: validateRhythm(value.rhythm, scenes),
  };
}

export function validateShowPalette(value) {
  if (value == null) return null;
  if (typeof value === "string" && paletteById(value)) return value;
  if (
    record(value) &&
    ["primary", "secondary", "accent"].every((key) =>
      /^#[0-9a-f]{6}$/i.test(value[key] ?? ""),
    )
  )
    return Object.fromEntries(
      ["primary", "secondary", "accent"].map((key) => [
        key,
        value[key].toLowerCase(),
      ]),
    );
  throw new Error(
    tr("Show palette must name a palette or contain three hex colours"),
  );
}

const sameParams = (a, b) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every((key) => Math.abs(a[key] - b[key]) < 1e-9);

// v4 → v5 (D68). Pages go away; every clip whose family, look, seed and
// parameters match an authored look is that catalog look; any other clip
// becomes an own look (name, snapshot, palette and transition kept). Ratings
// carry over; the first page's mood becomes the set mood; the stage budget
// moves from the old 2.1 MP default to native (D67).
export function migrateV4(v4, scenes) {
  const old = validateV4(v4, scenes);
  const report = [];
  const authored = new Map(catalogLooks(scenes).map((look) => [look.id, look]));
  const looks = [];
  const ownIds = new Set();
  let kept = 0;
  for (const page of old.pages)
    for (const clip of page.slots) {
      if (!clip) continue;
      const look = authored.get(lookId(clip.snapshot));
      if (
        look &&
        look.snapshot.seed === clip.snapshot.seed &&
        sameParams(look.snapshot.params, clip.snapshot.params)
      ) {
        kept++;
        continue;
      }
      let id = `${OWN_PREFIX}${clip.id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40) || "look"}`;
      for (let n = 2; ownIds.has(id); n++)
        id = `${OWN_PREFIX}${clip.id.slice(0, 30)}-${n}`.replace(
          /[^A-Za-z0-9_-]/g,
          "_",
        );
      ownIds.add(id);
      looks.push({
        id,
        name: clip.name,
        base: look ? look.id : null,
        snapshot: structuredClone(clip.snapshot),
        palette: clip.palette,
        transition: clip.transition,
      });
    }
  if (looks.length)
    report.push(
      tr(
        "{value1} edited clip(s) from the pages are now own looks in the catalog.",
        { value1: looks.length },
      ),
    );
  if (kept)
    report.push(
      tr(
        "{value1} page clip(s) were authored looks; they are in the catalog as before.",
        { value1: kept },
      ),
    );
  report.push(tr("Pages are gone: the catalog holds every look (D68)."));
  const options = { ...old.options };
  if (options.pixelBudget === OLD_DEFAULT_BUDGET) {
    options.pixelBudget = NATIVE_BUDGET;
    report.push(
      tr("Stage resolution raised from 2.1 MP to native (up to 4K)."),
    );
  }
  const next = {
    format: FORMAT,
    version: 5,
    name: old.name,
    looks,
    ratings: old.ratings,
    favorites: [],
    keys: [],
    mood: old.pages[0].mood,
    shared: old.shared,
    autopilot: { ...old.autopilot, favoritesOnly: false, minRating: 0 },
    clock: old.clock,
    options,
    midi: old.midi,
    lineages: old.lineages,
  };
  next.keys = defaultKeys(scenes, next);
  return { set: validateShowSet(next, scenes), report };
}

// v2 → v3 (decision D12): cues become clips on consecutive pages in score
// order; cue energy becomes clip energy and transition beats the fade.
// Keyframes, bar lengths, manual audio routing, the crossfade/tempo/go MIDI
// targets and MIDI clock have no v3 equivalent and are reported as dropped.
export function migrateV2(v2, scenes) {
  const set = emptyV4();
  set.format = "phosphor-set-v3";
  set.version = 3;
  for (const page of set.pages) delete page.mood;
  const report = [];
  set.name = v2.name;
  if (v2.cues.length > PAGES * SLOTS)
    report.push(
      tr("Only the first {value1} cues fit the grid.", {
        value1: PAGES * SLOTS,
      }),
    );
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
      tr(
        "Keyframes dropped from {value1} cue(s); the linear score is retired.",
        { value1: keyframed },
      ),
    );
  if (v2.mappings.length)
    report.push(
      tr(
        "{value1} audio routing(s) dropped; families now define their own energy response.",
        { value1: v2.mappings.length },
      ),
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
    else
      report.push(
        tr('MIDI mapping to "{value1}" dropped.', { value1: m.target }),
      );
  }
  set.lineages = structuredClone(v2.lineages);
  const migrated = migrateV3(set, scenes);
  return { set: migrated.set, report: [...report, ...migrated.report] };
}

// v3 → v4 is lossless: a library ID must never reinterpret authored colours.
// The result continues to v5.
export function migrateV3(v3, scenes) {
  if (!record(v3) || v3.format !== "phosphor-set-v3" || v3.version !== 3)
    throw new Error(tr("Expected a Phosphor v3 set"));
  const next = structuredClone(v3);
  next.format = V4;
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
  return migrateV4(next, scenes);
}

// Any supported file → { set, report }. v1 (including v6 14-family sets)
// goes through the existing v1 → v2 migration first.
export function parseShowSet(parsed, scenes) {
  if (parsed?.format === FORMAT)
    return { set: validateShowSet(parsed, scenes), report: [] };
  if (parsed?.format === V4) return migrateV4(parsed, scenes);
  if (parsed?.format === "phosphor-set-v3") return migrateV3(parsed, scenes);
  const v2 =
    parsed?.format === "phosphor-set-v1"
      ? migrateLegacy(parsed, scenes)
      : validateSession(parsed, scenes);
  return migrateV2(v2, scenes);
}

// An own-look id not used in the set.
export function freeLookId(set) {
  const ids = new Set(set.looks.map((look) => look.id));
  let n = set.looks.length + 1;
  while (ids.has(`${OWN_PREFIX}${n}`)) n++;
  return `${OWN_PREFIX}${n}`;
}
