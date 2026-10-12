import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { Show } from "../show.mjs";
import { presetSnapshot } from "../session.mjs";
import { performanceState, restorePerformance } from "../control-preview.mjs";
import { organism, createGeometry } from "../metamorphosis-geometry.mjs";
const eps = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function setup() {
  const set = initialShowSet(scenes);
  set.clock.mode = "manual";
  set.autopilot.enabled = false;
  const show = new Show({
    set,
    scenes,
    safeSnapshot: presetSnapshot(scenes[0]),
    now: 0,
  });
  show.command({ type: "world-prepare", id: "unfolding" }, 0);
  show.command({ type: "world-start" }, 0);
  assert.equal(
    show.tick(2).find((a) => a.type === "load").snapshot.scene,
    "metamorphosis",
  );
  show.tick(10);
  return show;
}
const value = (show) => show.currentSnapshot().params.development;
test("continuous states change parameters in one live identity, exactly over 4/8/16 bars", () => {
  for (const bars of [4, 8, 16]) {
    const s = setup(),
      seed = s.currentSnapshot().seed;
    s.command({ type: "world-duration", bars }, 10);
    s.command({ type: "world-develop", state: 2 }, 10);
    assert.equal(s.pending.fade, bars * 4);
    assert.deepEqual(
      s.tick(12).map((a) => a.type),
      ["params"],
    );
    eps(value(s), 0);
    assert.equal(s.currentSnapshot().seed, seed);
    const mid = s.tick(12 + bars);
    assert.ok(mid.some((a) => a.type === "params"));
    assert.ok(!mid.some((a) => a.type === "load"));
    eps(value(s), 1);
    s.tick(12 + bars * 2);
    eps(value(s), 2);
    assert.equal(s.status(12 + bars * 2).worlds.transition, null);
  }
});
test("tempo and speed are separate; the morph follows beats and pause holds fractional position", () => {
  const s = setup();
  s.command({ type: "world-develop", state: 2 }, 10);
  s.tick(12);
  s.tick(14.25);
  const held = value(s),
    phase = s.status(14.25).worlds.transition.progress;
  s.command({ type: "pause", on: true }, 14.25);
  s.tick(900);
  eps(value(s), held);
  eps(s.status(900).worlds.transition.progress, phase);
  s.command({ type: "pause", on: false }, 1000);
  s.tick(1000);
  eps(value(s), held);
  s.command({ type: "speed", value: 0.5 }, 1000);
  s.clock.setManualBpm(1000, 60);
  s.tick(1011.5);
  eps(value(s), 2);
});
test("manual seek cancels queued/active development and can reverse without resetting the seed", () => {
  const s = setup();
  s.command({ type: "world-develop", state: 2 }, 10);
  s.tick(14);
  const seed = s.currentSnapshot().seed;
  assert.deepEqual(s.command({ type: "world-seek", value: 0.37 }, 14), [
    { type: "params" },
  ]);
  eps(value(s), 0.37);
  assert.equal(s.pending, null);
  assert.equal(s.worldTransition, null);
  s.tick(15);
  eps(value(s), 0.37);
  assert.equal(s.currentSnapshot().seed, seed);
  s.command({ type: "world-develop", state: 0 }, 15);
  s.tick(16);
  s.tick(20);
  eps(value(s), 0.185);
  s.tick(24);
  eps(value(s), 0);
  s.command({ type: "world-seek", value: 99 }, 24);
  eps(value(s), 2);
  s.command({ type: "world-seek", value: NaN }, 24);
  eps(value(s), 2);
});
test("freeze holds development and slides its musical end time on release", () => {
  const s = setup();
  s.command({ type: "world-develop", state: 2 }, 10);
  s.tick(14);
  s.command({ type: "freeze", on: true }, 14);
  const held = value(s);
  s.tick(30);
  eps(value(s), held);
  s.command({ type: "freeze", on: false }, 30);
  s.tick(30);
  eps(value(s), held);
  s.tick(36);
  eps(value(s), 2);
});
test("runtime and Stage handoff retain an in-between value, paused transport and remaining development", () => {
  const s = setup();
  s.command({ type: "world-develop", state: 2 }, 10);
  s.tick(14);
  s.command({ type: "pause", on: true }, 14);
  const state = performanceState(s, 14),
    other = new Show({
      set: structuredClone(s.set),
      scenes,
      safeSnapshot: presetSnapshot(scenes[0]),
      now: 200,
    });
  const actions = restorePerformance(other, state, 200);
  eps(value(other), value(s));
  eps(
    actions.find((a) => a.type === "load").snapshot.params.development,
    value(s),
  );
  assert.equal(other.world, "unfolding");
  assert.equal(other.clock.paused, true);
  other.tick(500);
  eps(value(other), value(s));
  eps(
    other.status(500).worlds.transition.progress,
    s.status(14).worlds.transition.progress,
  );
  other.command({ type: "pause", on: false }, 500);
  s.command({ type: "pause", on: false }, 500);
  for (const t of [500.5, 501, 502, 504]) {
    other.tick(t);
    s.tick(t);
    eps(value(other), value(s));
    eps(
      other.status(t).worlds.transition.progress,
      s.status(t).worlds.transition.progress,
    );
  }
  other.tick(506);
  eps(value(other), 2);
});
test("a new world still loads normally, and unrelated worlds never expose a development slider", () => {
  const s = setup();
  s.command({ type: "world-prepare", id: "garden" }, 10);
  s.command({ type: "world-start" }, 10);
  assert.equal(
    s.tick(12).find((a) => a.type === "load").snapshot.scene,
    "evolution",
  );
  assert.equal(s.status(12).worlds.active.development, null);
  const before = structuredClone(s.currentSnapshot());
  s.command({ type: "world-seek", value: 1 }, 12);
  assert.deepEqual(s.currentSnapshot(), before);
});
test("library upgrade retains edited worlds and duration travels with exported sets", () => {
  const s = initialShowSet(scenes);
  s.worlds = s.worlds.slice(0, 2);
  s.worldBars = 16;
  assert.equal(validateShowSet(s, scenes).worlds.length, 3);
  assert.equal(validateShowSet(s, scenes).worldBars, 16);
  s.worlds[0].name = "My personal world";
  assert.equal(validateShowSet(s, scenes).worlds.length, 2);
  s.worlds = [];
  assert.deepEqual(validateShowSet(s, scenes).worlds, []);
});
test("geometry has deterministic finite connected ancestry and bounded mesh size", () => {
  assert.deepEqual(organism(112), organism(112));
  assert.notDeepEqual(organism(112), organism(113));
  const data = createGeometry(112);
  assert.ok(data.every(Number.isFinite));
  assert.ok(data.length < 2500000);
  assert.equal(data.length % 24, 0);
  assert.equal(organism(112).length, 8);
});
