import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import {
  GLOBAL_EFFECTS,
  effectDefinitions,
  defaultPattern,
  initialRhythm,
  validatePattern,
  validateRhythm,
  samplePattern,
} from "../rhythm.mjs";

const definition = (
  id,
  slot,
  { division = 1, length = 3, steps = [1, 0, 0], variants } = {},
) => ({
  id,
  slot,
  label: id,
  kind: "accent",
  ...(variants ? { variants } : {}),
  defaults: {
    division,
    length,
    steps,
    strength: 0.8,
    duration: 0.5,
    muted: false,
  },
});
const definitions = [
  definition("triplet", 0),
  definition("downbeat", 1, { length: 4, steps: [1, 0, 0, 0] }),
];
const locked = (defs = definitions) => ({
  ...defaultPattern(defs),
  mode: "locked",
});

test("an edit cannot revive the envelope of a preactivation event", () => {
  const defs = [
    definition("edited", 0, { division: 4, length: 4, steps: [0, 0, 1, 0] }),
  ];
  const pattern = locked(defs);
  pattern.tracks[0].duration = 1;
  const frame = samplePattern(pattern, defs, 0.8, 0.1, {
    activation: { edited: 0.75 },
  });
  assert.equal(frame.hits[0], 0);
  assert.equal(frame.values[0], 0);
  assert.ok(
    samplePattern(pattern, defs, 1.5, 0.8, { activation: { edited: 0.75 } })
      .hits[0] > 0,
  );
});

test("independent three-beat and four-beat tracks meet again after twelve beats", () => {
  const pattern = locked();
  const observed = [[], []];
  for (let beat = 0; beat <= 12; beat++) {
    const frame = samplePattern(pattern, definitions, beat, beat - 0.1);
    frame.hits.slice(0, 2).forEach((hit, slot) => {
      if (hit > 0) observed[slot].push(beat);
    });
  }
  assert.deepEqual(observed, [
    [0, 3, 6, 9, 12],
    [0, 4, 8, 12],
  ]);
  const at = samplePattern(pattern, definitions, 12, 11.9);
  assert.deepEqual(at.counts, [5, 4, 0, 0]);
  assert.deepEqual(at.steps, { triplet: 0, downbeat: 0 });
});

test("sixteenth and eighth patterns follow music subdivisions and preserve accents", () => {
  const defs = [
    definition("sixteenth", 0, {
      division: 4,
      length: 5,
      steps: [1, 0.25, 0, 0.5, 0],
    }),
    definition("eighth", 2, { division: 2, length: 3, steps: [0, 1, 0.5] }),
  ];
  const pattern = locked(defs);
  assert.equal(samplePattern(pattern, defs, 0.25, 0.24).hits[0], 0.2);
  assert.equal(samplePattern(pattern, defs, 0.5, 0.49).hits[2], 0.8);
  assert.equal(samplePattern(pattern, defs, 1, 0.99).hits[2], 0.4);
  assert.equal(samplePattern(pattern, defs, 1.25, 1.24).hits[0], 0.8);
});

test("envelopes are bounded, duration uses beats, and newly crossed hits fire once", () => {
  const pattern = locked();
  assert.equal(samplePattern(pattern, definitions, 3, 2.99).values[0], 0.8);
  assert.equal(samplePattern(pattern, definitions, 3.25, 3).values[0], 0.4);
  assert.equal(samplePattern(pattern, definitions, 3.5, 3.25).values[0], 0);
  assert.equal(samplePattern(pattern, definitions, 3.1, 3).hits[0], 0);
  assert.equal(samplePattern(pattern, definitions, 3, 3).hits[0], 0);
  assert.equal(
    samplePattern(pattern, definitions, 3).hits[0],
    0,
    "loading a family never replays its history",
  );
});

test("lost frames deliver only the newest accent per track even after many loops", () => {
  const defs = [
    definition("dense", 1, { division: 4, length: 3, steps: [0.1, 0.5, 1] }),
  ];
  const frame = samplePattern(locked(defs), defs, 10000, 0);
  assert.deepEqual(frame.hits, [0, 0.4, 0, 0]);
  assert.equal(frame.counts[1], 40001);
  assert.equal(
    samplePattern(locked(defs), defs, 1, 2).hits[1],
    0,
    "phase correction backwards emits no replay",
  );
});

test("variant incompatibility and mute silence tracks while retaining exact configuration", () => {
  const defs = [definition("spawn", 2, { variants: [0, 2] })];
  const pattern = locked(defs),
    original = structuredClone(pattern);
  const unavailable = samplePattern(pattern, defs, 3, 2.9, { variant: 1 });
  assert.deepEqual(unavailable.values, [0, 0, 0, 0]);
  assert.deepEqual(unavailable.hits, [0, 0, 0, 0]);
  assert.equal(unavailable.steps.spawn, 0);
  assert.equal(
    samplePattern(pattern, defs, 3, 2.9, { variant: 2 }).hits[2],
    0.8,
  );
  assert.deepEqual(pattern, original);
  pattern.tracks[0].muted = true;
  assert.equal(samplePattern(pattern, defs, 3, 2.9).values[2], 0);
  pattern.tracks[0].muted = false;
  pattern.tracks[0].strength = 0;
  assert.deepEqual(samplePattern(pattern, defs, 3, 2.9).counts, [0, 0, 0, 0]);
});

test("authored phrase styles only vary auto patterns and never mutate stored steps", () => {
  const pattern = defaultPattern(definitions),
    original = structuredClone(pattern);
  const quiet = samplePattern(pattern, definitions, 3, 2.9, {
    style: "restrained",
  });
  assert.equal(
    quiet.hits[0],
    0,
    "restrained phrases leave one extra loop quiet",
  );
  assert.ok(
    samplePattern(pattern, definitions, 6, 5.9, { style: "restrained" })
      .hits[0] > 0,
  );
  assert.equal(
    samplePattern({ ...pattern, mode: "locked" }, definitions, 3, 2.9, {
      style: "restrained",
    }).hits[0],
    0.8,
  );
  assert.deepEqual(pattern, original);
  const a = defaultPattern(definitions);
  a.tracks[0].steps[0] = 0;
  assert.equal(defaultPattern(definitions).tracks[0].steps[0], 1);
});

test("all family and global authored patterns validate without editing scene metadata", () => {
  const original = scenes.map((scene) =>
    structuredClone(effectDefinitions(scene)),
  );
  for (const style of ["restrained", "driving", "accented"])
    for (const defs of [GLOBAL_EFFECTS, ...scenes.map(effectDefinitions)]) {
      const pattern = defaultPattern(defs, style);
      assert.deepEqual(validatePattern(pattern, defs), pattern);
      for (const beat of [0, 0.2, 3, 4.5, 8, 64.75]) {
        const frame = samplePattern(pattern, defs, beat, beat - 0.1);
        assert.ok(frame.values.every((value) => value >= 0 && value <= 1));
        assert.ok(frame.hits.every((value) => value >= 0 && value <= 1));
        assert.ok(frame.counts.every(Number.isFinite));
      }
    }
  assert.deepEqual(scenes.map(effectDefinitions), original);
  assert.deepEqual(
    validateRhythm(initialRhythm(scenes), scenes),
    initialRhythm(scenes),
  );
});

test("validation rejects unsafe patterns and preserves dormant newer effects/families", () => {
  const pattern = locked();
  const bad = [
    (p) => (p.mode = "random"),
    (p) => (p.style = "strange"),
    (p) => (p.tracks[0].division = 3),
    (p) => (p.tracks[0].length = 1.5),
    (p) => (p.tracks[0].length = 65),
    (p) => (p.tracks[0].steps = [1]),
    (p) => (p.tracks[0].steps[0] = NaN),
    (p) => (p.tracks[0].strength = Infinity),
    (p) => (p.tracks[0].duration = 0),
    (p) => (p.tracks[0].muted = "false"),
    (p) => p.tracks.push(p.tracks[0]),
    (p) => (p.tracks[0].effect = "<script>"),
  ];
  for (const mutate of bad) {
    const value = structuredClone(pattern);
    mutate(value);
    assert.throws(() => validatePattern(value, definitions), mutate.toString());
  }
  const rhythm = initialRhythm([]);
  rhythm.families.future = locked([definition("future-effect", 3)]);
  assert.deepEqual(validateRhythm(rhythm, []), rhythm);
  const dormant = validatePattern(rhythm.families.future, definitions);
  assert.equal(dormant.tracks[0].effect, "future-effect");
  assert.equal(samplePattern(dormant, definitions, 0, -0.1).hits[3], 0);
  assert.deepEqual(
    samplePattern(pattern, definitions, NaN, 0).values,
    [0, 0, 0, 0],
  );
  assert.deepEqual(
    samplePattern(pattern, definitions, 1e300, 0).counts,
    [0, 0, 0, 0],
  );
});
