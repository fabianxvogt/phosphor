import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { Show, TOUR } from "../show.mjs";
import { presetSnapshot } from "../session.mjs";
import { performanceState, restorePerformance } from "../control-preview.mjs";
import { FEATURED_WORLD } from "../worlds.mjs";

// 120 BPM manual clock: one bar = 2 s.
function tour({ on = true, id = FEATURED_WORLD } = {}) {
  const set = initialShowSet(scenes);
  set.clock.mode = "manual";
  set.autopilot.enabled = true;
  set.worldTour = on;
  const show = new Show({
    set,
    scenes,
    safeSnapshot: presetSnapshot(scenes[0]),
    now: 0,
  });
  const actions = show.command({ type: "world-play", id, manual: false }, 0);
  return { show, actions };
}
const where = (show) => {
  const key = show.scenes.get(show.live.clip.snapshot.scene).development;
  return {
    world: show.world,
    value: key ? show.live.clip.snapshot.params[key] : null,
  };
};

test("sets tour by default and keep an explicit opt-out", () => {
  assert.equal(initialShowSet(scenes).worldTour, true);
  const set = initialShowSet(scenes);
  assert.equal(validateShowSet(set, scenes).worldTour, true);
  set.worldTour = false;
  assert.equal(validateShowSet(set, scenes).worldTour, false);
  delete set.worldTour;
  assert.equal(validateShowSet(set, scenes).worldTour, true);
});

test("the featured world opens at once on its first development", () => {
  const { show, actions } = tour();
  const load = actions.find((a) => a.type === "load");
  assert.ok(load, "loads immediately");
  assert.equal(load.fadeSeconds, 0);
  assert.equal(show.world, FEATURED_WORLD);
  assert.equal(where(show).value, 0);
  assert.equal(show.autopilot.active(0), true, "not a performer takeover");
  assert.equal(show.energy, TOUR.energy[0]);
});

test("the tour plays every development forward, holds the peak, then the next world", () => {
  const { show } = tour();
  const library = show.set.worlds.map((w) => w.id);
  const next = library[(library.indexOf(FEATURED_WORLD) + 1) % library.length];
  let firstMove = null,
    topAt = null,
    leftAt = null,
    previous = 0;
  for (let t = 0.25; t < 400 && leftAt === null; t += 0.25) {
    show.tick(t);
    const { world, value } = where(show);
    if (world !== FEATURED_WORLD) {
      leftAt = t;
      assert.equal(world, next);
      break;
    }
    assert.ok(value >= previous - 1e-9, `never reverses: ${value}`);
    previous = value;
    if (firstMove === null && value > 0) firstMove = t;
    if (topAt === null && value >= 2 - 1e-9) topAt = t;
  }
  // Hold 8 bars on the first state (16 s), grow over 16 bars per state.
  assert.ok(firstMove >= TOUR.hold * 2 && firstMove <= TOUR.hold * 2 + 4);
  assert.ok(topAt >= firstMove + 2 * TOUR.morph * 2 + TOUR.hold * 2 - 4);
  assert.ok(leftAt >= topAt + TOUR.peak * 2 - 2, `${leftAt} ${topAt}`);
  // The next world starts on its first development with the energy low.
  assert.equal(show.energy, TOUR.energy[0]);
  const state = show.status(leftAt).worlds;
  assert.equal(state.active.id, next);
  assert.equal(state.active.state, 0);
  assert.equal(state.tour.on, true);
});

test("energy rises with the arc and Next takes the next tour step at once", () => {
  const { show } = tour();
  show.tick(1);
  show.command({ type: "next" }, 1);
  assert.equal(show.pending?.morph, true);
  show.tick(2.1);
  assert.ok(show.worldMorph);
  assert.ok(show.energy > TOUR.energy[0] && show.energy < TOUR.energy[1]);
  // Next during a running morph does nothing (no overwrite).
  assert.deepEqual(show.command({ type: "next" }, 3), []);
});

test("with the tour off, autopilot stays inside the world", () => {
  const { show } = tour({ on: false });
  for (let t = 0.25; t < 600; t += 0.5) {
    show.tick(t);
    assert.equal(show.world, FEATURED_WORLD);
  }
  assert.equal(show.status(600).worlds.tour.on, false);
});

test("manual input pauses the tour until hand-back; toggling persists in the set", () => {
  const { show } = tour();
  show.command({ type: "energy", value: 0.9 }, 1);
  assert.equal(show.status(1).worlds.tour.active, false);
  for (let t = 1; t < 60; t += 0.5) show.tick(t);
  assert.equal(where(show).value, 0, "no tour step during hand-back");
  show.command({ type: "world-tour", on: false }, 60);
  assert.equal(show.set.worldTour, false);
  show.command({ type: "world-tour" }, 60);
  assert.equal(show.set.worldTour, true);
});

test("a breakdown holds the tour; leaving the world stops it", () => {
  const { show } = tour();
  for (let t = 0.25; t < 10; t += 0.25) show.tick(t);
  show.tick(10, { event: "breakdown" });
  for (let t = 10.25; t < 40; t += 0.25) show.tick(t);
  assert.equal(where(show).value, 0);
  show.command({ type: "world-leave" }, 40);
  assert.equal(show.tourNext, null);
  assert.equal(show.status(40).worlds.tour.active, false);
});

test("Stage handoff keeps the tour countdown", () => {
  const { show } = tour();
  for (let t = 0.25; t < 6; t += 0.25) show.tick(t);
  const before = show.status(6).worlds.tour.nextIn;
  const other = new Show({
    set: structuredClone(show.set),
    scenes,
    safeSnapshot: presetSnapshot(scenes[0]),
    now: 100,
  });
  restorePerformance(other, performanceState(show, 6), 100);
  assert.equal(other.world, FEATURED_WORLD);
  assert.equal(other.status(100).worlds.tour.nextIn, before);
});
