import test from "node:test";
import assert from "node:assert/strict";
import { BeatTracker } from "../beat-tracker.mjs";
import { synth, run, lockedFrom, folded } from "./beat-synth.mjs";

// Targets from decision D24: lock within 8 beats of a tempo change, phase
// error < 20 ms, hold through a 32-bar breakdown. Synthetic audio only;
// real mixes are evaluated locally and never enter the repo.
const MS = 20;

function track(segments, options = {}) {
  const audio = synth({ segments, ...options });
  const tracker = new BeatTracker({ sampleRate: audio.sampleRate });
  return { results: run(tracker, audio), tracker };
}

function assertHeld(results, from, to = results.length) {
  for (let i = from; i < to; i++) {
    const r = results[i];
    assert.ok(r.state.locked, `beat ${i}: lost lock`);
    assert.ok(
      Math.abs(r.error) * 1000 < MS,
      `beat ${i}: phase error ${(r.error * 1000).toFixed(1)} ms`,
    );
    const bpm = folded(60 / r.truth.period, r.state.bpm);
    assert.ok(
      Math.abs(r.state.bpm - bpm) < 0.5,
      `beat ${i}: ${r.state.bpm.toFixed(2)} BPM, expected ${bpm.toFixed(2)}`,
    );
  }
}

test("steady four-on-the-floor locks within 16 beats and stays within 20 ms", () => {
  const { results } = track([{ beats: 96, bpm: 128 }]);
  const lock = lockedFrom(results);
  assert.ok(lock !== null && lock <= 16, `locked at beat ${lock}`);
  assertHeld(results, lock);
});

test("off-beat bass does not pull the grid off the kick", () => {
  const { results } = track([{ beats: 96, bpm: 124, bass: true }], {
    noise: 0.03,
  });
  const lock = lockedFrom(results);
  assert.ok(lock !== null && lock <= 16, `locked at beat ${lock}`);
  assertHeld(results, lock);
});

for (const [from, to] of [
  [124, 132],
  [135, 122],
]) {
  test(`tempo change ${from} → ${to} BPM relocks within 8 beats`, () => {
    const { results } = track([
      { beats: 48, bpm: from },
      { beats: 48, bpm: to },
    ]);
    const lock = lockedFrom(results, { from: 48 });
    assert.ok(lock !== null && lock - 48 <= 8, `relocked at beat ${lock}`);
    assertHeld(results, lock);
  });
}

test("a 32-bar breakdown without kicks coasts and lands on the beat", () => {
  const { results } = track([
    { beats: 32, bpm: 126 },
    { beats: 128, bpm: 126, kick: false, hats: false, pad: true },
    { beats: 32, bpm: 126 },
  ]);
  const lock = lockedFrom(results);
  assert.ok(lock !== null && lock <= 16, `locked at beat ${lock}`);
  // Locked and phase-correct through the breakdown and after re-entry.
  assertHeld(results, lock);
  assert.ok(
    results.slice(40, 150).every((r) => r.state.coasting),
    "breakdown should report coasting",
  );
  assert.ok(!results.at(-1).state.coasting);
});

test("half-time material folds into the 100–150 BPM range", () => {
  const { results } = track([{ beats: 64, bpm: 70 }]);
  const lock = lockedFrom(results);
  assert.ok(lock !== null && lock <= 16, `locked at beat ${lock}`);
  assert.ok(Math.abs(results.at(-1).state.bpm - 140) < 0.5);
  assertHeld(results, lock);
});

for (const bpm of [100, 149]) {
  test(`range edge ${bpm} BPM`, () => {
    const { results } = track([{ beats: 64, bpm }]);
    const lock = lockedFrom(results);
    assert.ok(lock !== null && lock <= 20, `locked at beat ${lock}`);
    assertHeld(results, lock);
  });
}

test("44.1 kHz input tracks as well as 48 kHz", () => {
  const { results } = track([{ beats: 64, bpm: 131 }], { sampleRate: 44100 });
  const lock = lockedFrom(results);
  assert.ok(lock !== null && lock <= 16, `locked at beat ${lock}`);
  assertHeld(results, lock);
});

test("silence and steady noise never lock", () => {
  for (const noise of [0, 0.05, 0.3]) {
    const { tracker } = track(
      [{ beats: 40, bpm: 120, kick: false, hats: false }],
      { noise, seed: 11 },
    );
    const state = tracker.state();
    assert.equal(state.locked, false, `noise ${noise}`);
    assert.equal(state.bpm, null, `noise ${noise}`);
  }
});

test("non-finite samples are ignored and state stays finite", () => {
  const audio = synth({ segments: [{ beats: 48, bpm: 128 }] });
  for (let i = 0; i < audio.samples.length; i += 997) audio.samples[i] = NaN;
  const tracker = new BeatTracker();
  tracker.process(audio.samples);
  const state = tracker.state();
  assert.ok(state.locked);
  for (const key of ["bpm", "phase", "nextBeatTime", "confidence"])
    assert.ok(Number.isFinite(state[key]), key);
});

test("tempo range must be at most one octave", () => {
  assert.throws(() => new BeatTracker({ minBpm: 60, maxBpm: 180 }));
});
