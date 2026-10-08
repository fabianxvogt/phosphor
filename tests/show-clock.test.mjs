import test from "node:test";
import assert from "node:assert/strict";
import { ShowClock } from "../show-clock.mjs";

function sample(clock, from, to, step = 0.005, each) {
  let previous = -Infinity;
  for (let t = from; t <= to; t += step) {
    const state = clock.at(t);
    assert.ok(state.beat >= previous, `beat ran backwards at ${t.toFixed(3)}`);
    assert.ok(Number.isFinite(state.beat));
    previous = state.beat;
    each?.(t, state);
  }
  return previous;
}

test("manual tempo runs at the set BPM", () => {
  const clock = new ShowClock({ bpm: 120, mode: "manual" });
  assert.ok(Math.abs(clock.at(10).beat - 20) < 1e-9);
  assert.equal(clock.at(10).bar, 5);
});

test("tap tempo sets tempo and puts the beat on the tap", () => {
  const clock = new ShowClock({ bpm: 100, mode: "auto" });
  const period = 60 / 128;
  for (let i = 0; i < 8; i++) clock.tap(1 + i * period);
  assert.equal(clock.mode, "manual");
  assert.ok(Math.abs(clock.at(5).bpm - 128) < 0.01);
  // After settling, beats land on the tap grid.
  const t = 1 + 20 * period;
  assert.ok(
    Math.abs(clock.at(t).phase - 0) < 0.02 ||
      Math.abs(clock.at(t).phase - 1) < 0.02,
  );
  sample(clock, 0, 20);
});

test("auto mode converges to the tracker's beats without running backwards", () => {
  const clock = new ShowClock({ bpm: 120, mode: "auto" });
  const bpm = 126,
    P = 60 / bpm,
    offset = 0.13;
  const truthPhase = (t) => ((((t - offset) / P) % 1) + 1) % 1;
  let worst = 0;
  sample(clock, 0, 30, 0.003, (t, state) => {
    const nextBeatTime = offset + Math.ceil((t - offset) / P) * P;
    clock.track(t, { bpm, nextBeatTime, locked: true, coasting: false });
    if (t > 8) {
      const d = Math.abs(state.phase - truthPhase(t));
      worst = Math.max(worst, Math.min(d, 1 - d) * P);
    }
  });
  assert.ok(worst < 0.01, `phase error ${(worst * 1000).toFixed(1)} ms`);
  assert.ok(Math.abs(clock.at(30).bpm - bpm) < 1e-6);
  assert.equal(clock.source, "auto");
});

test("a tracker tempo jump re-aligns forward only", () => {
  const clock = new ShowClock({ bpm: 124, mode: "auto" });
  let bpm = 124,
    offset = 0;
  sample(clock, 0, 20, 0.003, (t) => {
    if (t > 10 && bpm === 124) {
      bpm = 132;
      offset = 10.2;
    }
    const P = 60 / bpm;
    clock.track(t, {
      bpm,
      nextBeatTime: offset + Math.ceil((t - offset) / P) * P,
      locked: true,
      coasting: false,
    });
  });
  assert.ok(Math.abs(clock.at(20).bpm - 132) < 1e-6);
});

test("losing the tracker coasts at the last tempo", () => {
  const clock = new ShowClock({ bpm: 120, mode: "auto" });
  clock.track(0, {
    bpm: 130,
    nextBeatTime: 0.2,
    locked: true,
    coasting: false,
  });
  const before = clock.at(1).beat;
  clock.track(1, { bpm: null, nextBeatTime: null, locked: false });
  assert.equal(clock.source, "coast");
  const after = clock.at(3).beat;
  assert.ok(Math.abs(after - before - (2 * 130) / 60) < 0.3);
});

test("downbeat makes the nearest beat bar beat one", () => {
  const clock = new ShowClock({ bpm: 120, mode: "manual" });
  clock.downbeat(3.05); // beat 6.1 → beat 6 starts a bar
  const s = clock.at(3.05 + 0.5 * 4);
  assert.ok(Math.abs(s.beatInBar - 0.1) < 1e-6);
});

test("nudge shifts latency in auto mode and phase in manual mode", () => {
  const auto = new ShowClock({ mode: "auto" });
  auto.nudge(0, 1);
  auto.nudge(0, 1);
  auto.nudge(0, -1);
  assert.equal(auto.latencyMs, 10);
  const manual = new ShowClock({ bpm: 120, mode: "manual" });
  const before = manual.at(1).beat;
  manual.nudge(1, 1);
  assert.ok(manual.at(1).beat > before);
  manual.nudge(1.1, -1);
  sample(manual, 1.1, 5);
});
