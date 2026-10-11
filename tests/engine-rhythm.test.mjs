import test from "node:test";
import assert from "node:assert/strict";
import { sampleSceneRhythm, consumeRhythmImpulse } from "../engine-rhythm.mjs";
import { defaultPattern } from "../rhythm.mjs";

const definition = {
  id: "spawn",
  slot: 2,
  variants: [0],
  defaults: {
    division: 1,
    length: 3,
    steps: [1, 0, 0],
    strength: 1,
    duration: 0.5,
    muted: false,
  },
};
function setup() {
  const slot = {
    scene: {
      id: "test",
      rhythm: [definition],
      type: { key: "type" },
      beat: { inject: 1 },
    },
    snapshot: { params: { type: 0 } },
    lookId: "own-one",
  };
  const pattern = defaultPattern([definition]);
  pattern.mode = "locked";
  const frame = {
    beat: 0.5,
    origin: 0,
    settings: { families: { test: pattern } },
    enabled: true,
  };
  const sample = (beat) => {
    frame.beat = beat;
    return sampleSceneRhythm(slot, frame, beat, 0.5);
  };
  return { slot, pattern, frame, sample };
}

test("simulation hit survives render-only frames and is consumed once", () => {
  const { slot, sample } = setup();
  sample(0.5);
  sample(3.02);
  const pending = slot.rhythmPending[2];
  assert.ok(pending > 0);
  sample(3.04);
  assert.equal(slot.rhythmPending[2], pending);
  consumeRhythmImpulse(slot);
  sample(3.06);
  assert.equal(slot.rhythmPending[2], 0);
  assert.equal(slot.rhythmGesture[2], 0);
});

test("muting cancels queued simulation work and re-enabling waits for next event", () => {
  const { slot, pattern, sample } = setup();
  sample(0.5);
  sample(3.01);
  const count = slot.rhythm.counts[2];
  pattern.tracks[0].muted = true;
  sample(3.02);
  assert.equal(slot.rhythmPending[2], 0);
  assert.equal(slot.rhythmGesture[2], 0);
  sample(6.1);
  assert.equal(slot.rhythm.counts[2], count);
  pattern.tracks[0].muted = false;
  sample(6.2);
  assert.equal(slot.rhythm.counts[2], count);
  assert.equal(slot.rhythmPending[2], 0);
  sample(9.01);
  assert.ok(slot.rhythm.counts[2] > count);
  assert.ok(slot.rhythmPending[2] > 0);
});

test("variant changes cancel an incompatible pending intervention", () => {
  const { slot, sample } = setup();
  sample(0.5);
  sample(3.01);
  slot.snapshot.params.type = 1;
  sample(3.02);
  assert.equal(slot.rhythmPending[2], 0);
  assert.equal(slot.rhythmGesture[2], 0);
});

test("two fading looks sample their own override and family patterns", () => {
  const { slot, frame, sample } = setup();
  const other = {
    ...slot,
    lookId: "other",
    rhythm: undefined,
    rhythmPending: undefined,
    rhythmGesture: undefined,
    rhythmPosition: undefined,
  };
  const override = defaultPattern([definition]);
  override.mode = "locked";
  override.tracks[0].steps = [0, 1, 0];
  frame.overrides = { "own-one": override };
  sample(0.5);
  sampleSceneRhythm(other, frame, 0.5, 0.5);
  sample(1.01);
  sampleSceneRhythm(other, frame, 1.01, 0.5);
  assert.ok(slot.rhythmPending[2] > 0);
  assert.equal(other.rhythmPending[2], 0);
});

test("family edits cannot gate an independent own pattern, but inheritance observes its handover", () => {
  const { slot, frame, sample } = setup();
  const override = structuredClone(frame.settings.families.test);
  override.tracks[0].duration = 1;
  frame.overrides = { "own-one": override };
  frame.activations = { families: { test: { spawn: 3.25 } } };
  sample(3.3);
  assert.ok(
    slot.rhythm.values[2] > 0,
    "family edit leaves own envelope intact",
  );
  delete frame.overrides["own-one"];
  frame.activations.overrides = { "own-one": { spawn: 3.25 } };
  sample(3.35);
  assert.equal(
    slot.rhythm.values[2],
    0,
    "inheritance waits for a new family event",
  );
});
