import { tr } from "./i18n/index.mjs";
// Rhythm patterns use the music clock, never the scene's movement speed.
// These functions are pure: stored tracks and scene defaults are not edited.
const STYLES = ["restrained", "driving", "accented"];
const DIVISIONS = [1, 2, 4];
const MAX_TRACKS = 32; // includes dormant tracks from another release
const MAX_FAMILIES = 128;
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/;
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const mod = (value, length) => ((value % length) + length) % length;
const number = (value, min, max, name) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(
      tr("{value1} must be {value2}–{value3}", {
        value1: name,
        value2: min,
        value3: max,
      }),
    );
  return value;
};
const styleOf = (value) => {
  if (!STYLES.includes(value)) throw new Error(tr("Unknown rhythm style"));
  return value;
};
const globalEffect = (id, slot, label, description, defaults) =>
  Object.freeze({
    id,
    slot,
    label,
    description,
    kind: "accent",
    defaults: Object.freeze({
      ...defaults,
      steps: Object.freeze(defaults.steps),
    }),
  });

export const GLOBAL_EFFECTS = Object.freeze([
  globalEffect(
    "brightness",
    0,
    tr("Brightness pulse"),
    tr("A brief light accent across the mixed picture."),
    {
      division: 1,
      length: 4,
      steps: [0.55, 0.22, 0.32, 0.22],
      strength: 0.22,
      duration: 0.45,
      muted: false,
    },
  ),
  globalEffect(
    "zoom",
    1,
    tr("Zoom punch"),
    tr("A small camera emphasis on the first beat."),
    {
      division: 1,
      length: 8,
      steps: [1, 0, 0, 0, 0.6, 0, 0, 0],
      strength: 0.2,
      duration: 0.7,
      muted: false,
    },
  ),
  globalEffect(
    "echo",
    2,
    tr("Echo impulse"),
    tr("A short impression of the previous mixed picture."),
    {
      division: 1,
      length: 16,
      steps: [0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0],
      strength: 0.22,
      duration: 0.75,
      muted: false,
    },
  ),
  globalEffect(
    "colour",
    3,
    tr("Colour accent"),
    tr("A gentle shift through the current palette."),
    {
      division: 1,
      length: 8,
      steps: [0, 0, 0, 0, 0.75, 0, 0, 0],
      strength: 0.16,
      duration: 1.5,
      muted: false,
    },
  ),
]);

export function effectDefinitions(scene) {
  return Array.isArray(scene?.rhythm) ? scene.rhythm : EMPTY;
}

function validateTrack(value) {
  if (
    !record(value) ||
    typeof value.effect !== "string" ||
    !ID.test(value.effect)
  )
    throw new Error(tr("Invalid rhythm effect id"));
  if (!DIVISIONS.includes(value.division))
    throw new Error(tr("Rhythm division must be 1, 2 or 4"));
  if (
    !Number.isInteger(value.length) ||
    value.length < 1 ||
    value.length > 256 ||
    value.length / value.division > 64
  )
    throw new Error(
      tr("Rhythm loop must have 1–256 steps and at most 64 beats"),
    );
  if (!Array.isArray(value.steps) || value.steps.length !== value.length)
    throw new Error(tr("Rhythm steps must match the loop length"));
  if (typeof value.muted !== "boolean")
    throw new Error(tr("Rhythm mute must be boolean"));
  return {
    effect: value.effect,
    division: value.division,
    length: value.length,
    steps: value.steps.map((step) => number(step, 0, 1, tr("Rhythm step"))),
    strength: number(value.strength, 0, 1, tr("Rhythm strength")),
    duration: number(value.duration, 0.0625, 8, tr("Rhythm duration")),
    muted: value.muted,
  };
}

// Retain well-formed unknown effects as dormant tracks. Importing a set from
// a newer release must not silently discard the owner's work. They receive
// no slot and cannot trigger until their descriptor is available again.
export function validatePattern(value, definitions = []) {
  if (!record(value) || !["auto", "locked"].includes(value.mode))
    throw new Error(tr("Rhythm pattern mode must be auto or locked"));
  const style = styleOf(value.style);
  if (!Array.isArray(value.tracks) || value.tracks.length > MAX_TRACKS)
    throw new Error(
      tr("Rhythm pattern has at most {value1} tracks", { value1: MAX_TRACKS }),
    );
  const seen = new Set();
  const tracks = value.tracks.map((track) => {
    const result = validateTrack(track);
    if (seen.has(result.effect)) throw new Error(tr("Duplicate rhythm effect"));
    seen.add(result.effect);
    return result;
  });
  // Automatic patterns follow the authored presets of the current release:
  // a set saved before the family re-authored its loops plays the new ones.
  // Edited (locked) patterns stay exactly as the performer left them;
  // unknown effects remain as dormant tracks.
  if (value.mode === "auto" && definitions.length) {
    const known = new Set(definitions.map((definition) => definition.id));
    return {
      mode: "auto",
      style,
      tracks: [
        ...definitions.map((definition) => styledTrack(definition, style)),
        ...tracks.filter((track) => !known.has(track.effect)),
      ].slice(0, MAX_TRACKS),
    };
  }
  // A newly added effect is available on older sets with its authored
  // default. Muting an effect is explicit; leaving out a track is not mute.
  for (const definition of definitions) {
    if (seen.has(definition.id)) continue;
    if (tracks.length >= MAX_TRACKS)
      throw new Error(tr("Too many rhythm tracks"));
    tracks.push(styledTrack(definition, style));
    seen.add(definition.id);
  }
  return { mode: value.mode, style, tracks };
}

function styledTrack(definition, style) {
  // A family may author each phrase style as its own loop (a rhythm preset);
  // otherwise the style is derived from the default loop.
  const authored = definition.styles?.[style];
  if (authored)
    return validateTrack({
      ...definition.defaults,
      ...authored,
      effect: definition.id,
    });
  const base = validateTrack({ ...definition.defaults, effect: definition.id });
  if (style === "restrained") {
    base.strength *= 0.68;
    // A quiet phrase leaves a whole extra loop for the structure to settle.
    if (base.length * 2 <= 256 && (base.length * 2) / base.division <= 64) {
      base.steps.push(...Array(base.length).fill(0));
      base.length *= 2;
    }
  } else if (style === "accented") {
    base.strength = Math.min(1, base.strength * 1.12);
    let event = 0;
    base.steps = base.steps.map((step) =>
      step === 0 ? 0 : Math.min(1, step * (event++ % 4 === 0 ? 1.25 : 0.8)),
    );
  }
  return base;
}

export function defaultPattern(definitions, style = "driving") {
  styleOf(style);
  return {
    mode: "auto",
    style,
    tracks: definitions.map((definition) => styledTrack(definition, style)),
  };
}

export function initialRhythm(scenes) {
  return {
    global: defaultPattern(GLOBAL_EFFECTS),
    families: Object.fromEntries(
      scenes.map((scene) => [
        scene.id,
        defaultPattern(effectDefinitions(scene)),
      ]),
    ),
  };
}

export function validateRhythm(value, scenes) {
  if (value === undefined) return initialRhythm(scenes);
  if (!record(value) || !record(value.families))
    throw new Error(tr("Invalid show rhythm"));
  const entries = Object.entries(value.families);
  if (entries.length > MAX_FAMILIES)
    throw new Error(
      tr("At most {value1} rhythm families", { value1: MAX_FAMILIES }),
    );
  const byId = new Map(scenes.map((scene) => [scene.id, scene]));
  const families = {};
  for (const [id, pattern] of entries) {
    if (!ID.test(id)) throw new Error(tr("Invalid rhythm family id"));
    Object.defineProperty(families, id, {
      value: validatePattern(pattern, effectDefinitions(byId.get(id))),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  for (const scene of scenes)
    if (!Object.hasOwn(families, scene.id))
      families[scene.id] = defaultPattern(effectDefinitions(scene));
  return { global: validatePattern(value.global, GLOBAL_EFFECTS), families };
}

const authored = new WeakMap();
function authoredPattern(definitions, style) {
  let cache = authored.get(definitions);
  if (!cache) authored.set(definitions, (cache = new Map()));
  if (!cache.has(style)) cache.set(style, defaultPattern(definitions, style));
  return cache.get(style);
}
const EMPTY = Object.freeze([]);

// Events are counted from the common downbeat origin, rather than from the
// moment a look loads. A lost frame can deliver only the newest event per
// track; an initial sample can show its envelope but never inject history.
// Optional activation is an effect-id → earliest active music position map.
// It prevents a queued edit from replaying newly added steps that preceded
// its application point, while preserving an event exactly on that point.
export function samplePattern(
  pattern,
  definitions = EMPTY,
  position,
  previousPosition,
  { style, variant, activation } = {},
) {
  const values = [0, 0, 0, 0],
    counts = [0, 0, 0, 0],
    hits = [0, 0, 0, 0],
    steps = {};
  if (
    !Number.isFinite(position) ||
    Math.abs(position) > Number.MAX_SAFE_INTEGER / 4
  )
    return { values, counts, hits, steps };
  const active =
    pattern?.mode === "auto" && style && style !== pattern.style
      ? authoredPattern(definitions, styleOf(style))
      : pattern;
  if (!active || !Array.isArray(active.tracks))
    return { values, counts, hits, steps };
  const byId = new Map(active.tracks.map((track) => [track.effect, track]));
  for (const definition of definitions) {
    const track = byId.get(definition.id),
      slot = definition.slot;
    if (!track || !Number.isInteger(slot) || slot < 0 || slot > 3) continue;
    const at = Math.floor(position * track.division + 1e-8);
    steps[definition.id] = mod(at, track.length);
    if (
      position < 0 ||
      track.muted ||
      !(track.strength > 0) ||
      (variant !== undefined &&
        variant !== null &&
        definition.variants &&
        !definition.variants.includes(variant))
    )
      continue;
    let newest = -1;
    let perLoop = 0,
      inLoop = 0;
    for (let i = 0; i < track.length; i++) {
      if (!(track.steps[i] > 0)) continue;
      perLoop++;
      if (i <= steps[definition.id]) inLoop++;
      const candidate = at - mod(at - i, track.length);
      if (candidate >= 0 && candidate > newest) newest = candidate;
    }
    counts[slot] = Math.floor(at / track.length) * perLoop + inLoop;
    if (newest < 0) continue;
    const eventBeat = newest / track.division;
    const activeFrom = activation?.[definition.id];
    if (Number.isFinite(activeFrom) && eventBeat + 1e-8 < activeFrom) continue;
    const amplitude = track.steps[mod(newest, track.length)] * track.strength;
    const decay = Math.max(0, 1 - (position - eventBeat) / track.duration);
    values[slot] = amplitude * decay * decay * (3 - 2 * decay);
    if (
      Number.isFinite(previousPosition) &&
      previousPosition <= position &&
      eventBeat > previousPosition + 1e-8 &&
      (!Number.isFinite(activeFrom) || eventBeat + 1e-8 >= activeFrom)
    )
      hits[slot] = amplitude;
  }
  return { values, counts, hits, steps };
}
