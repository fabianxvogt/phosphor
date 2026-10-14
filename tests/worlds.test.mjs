import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { Show } from "../show.mjs";
import { presetSnapshot } from "../session.mjs";
import { canCarryTraces, defaultWorlds } from "../worlds.mjs";
import { carryTraces } from "../engine-memory.mjs";
// Authored worlds grow over time; count them instead of fixing a number.
const AUTHORED_WORLDS = defaultWorlds(
  scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
).length;

function make() {
  const set = initialShowSet(scenes);
  set.clock.mode = "manual";
  set.autopilot.enabled = false;
  const show = new Show({
    set,
    scenes,
    safeSnapshot: presetSnapshot(scenes[0]),
    now: 0,
  });
  show.command({ type: "look", id: "acid:Signal Understory" }, 0);
  return show;
}
const prepare = (show, id = "garden", extra = {}, t = 0.2) =>
  show.command({ type: "world-prepare", id, ...extra }, t);
const start = (show, t = 0.2) => show.command({ type: "world-start" }, t);

test("world definitions roundtrip and old sets gain the curated worlds", () => {
  const set = initialShowSet(scenes);
  assert.ok(AUTHORED_WORLDS >= 3);
  assert.equal(set.worlds.length, AUTHORED_WORLDS);
  assert.deepEqual(
    validateShowSet(JSON.parse(JSON.stringify(set)), scenes).worlds,
    set.worlds,
  );
  delete set.worlds;
  assert.equal(validateShowSet(set, scenes).worlds.length, AUTHORED_WORLDS);
  assert.deepEqual(defaultWorlds([]), []);
});
test("reject malformed, duplicate and unknown world definitions", () => {
  for (const mutate of [
    (s) => s.worlds.push(s.worlds[0]),
    (s) => (s.worlds[0].states[0].look = "missing"),
    (s) => s.worlds[0].states.push(s.worlds[0].states[0]),
    (s) => (s.worlds[0].name = "<".repeat(81)),
  ]) {
    const set = initialShowSet(scenes);
    mutate(set);
    assert.throws(() => validateShowSet(set, scenes));
  }
});
test("preparation is silent; explicit start always waits for the next bar", () => {
  const show = make();
  const before = show.live.clip.id;
  assert.deepEqual(prepare(show), []);
  assert.equal(show.live.clip.id, before);
  assert.equal(show.pending, null);
  assert.equal(show.status(0.2).worlds.prepared.compatible, true);
  assert.deepEqual(start(show, 0), []); // even directly on a downbeat
  assert.equal(show.pending.at, 4);
  assert.equal(show.tick(1.9).filter((a) => a.type === "load").length, 0);
  const load = show.tick(2).find((a) => a.type === "load");
  assert.equal(load.snapshot.scene, "evolution");
  assert.equal(load.carryTraces, true);
  assert.deepEqual(load.beatTransition, { start: 4, end: 20 });
  assert.equal(show.status(2).worlds.active.id, "garden");
  assert.equal(show.status(2).worlds.prepared, null);
});
test("8 bars, carry off and shared palette survive the transition", () => {
  const show = make();
  show.set.palette = {
    primary: "#123456",
    secondary: "#abcdef",
    accent: "#fedcba",
  };
  show.updateSet(show.set, 0.1);
  prepare(show, "garden", { bars: 8, carry: false, state: 1 });
  start(show);
  const a = show.tick(2).find((a) => a.type === "load");
  assert.equal(a.clipId, "evolution:Pearl Nursery");
  assert.deepEqual(a.snapshot.palette, show.set.palette);
  assert.ok(Math.abs(a.beatTransition.start - 4) < 1e-9);
  assert.equal(a.beatTransition.end, 36);
  assert.equal(a.carryTraces, false);
});
test("pause holds queued start and the exact transition progress", () => {
  const show = make();
  prepare(show);
  start(show);
  show.command({ type: "pause", on: true }, 1);
  assert.deepEqual(show.tick(99), []);
  assert.ok(Math.abs(show.status(99).pending.beats - 2) < 1e-9);
  show.command({ type: "pause", on: false }, 101);
  assert.ok(show.tick(102).some((a) => a.type === "load"));
  show.tick(104);
  show.command({ type: "pause", on: true }, 104);
  const p = show.status(104).worlds.transition.progress;
  assert.equal(show.status(200).worlds.transition.progress, p);
  show.command({ type: "pause", on: false }, 204);
  assert.equal(show.status(204).worlds.transition.progress, p);
});
test("autopilot, Next and repeated starts cannot overwrite a queued/active transition", () => {
  const show = make();
  prepare(show);
  start(show);
  const pending = show.pending;
  show.command({ type: "autopilot", on: true }, 0.3);
  show.command({ type: "next" }, 0.3);
  start(show, 0.4);
  prepare(show, "mycelium", {}, 0.5);
  assert.equal(show.pending, pending);
  show.tick(2);
  show.command({ type: "next" }, 3);
  assert.equal(show.pending, null);
  assert.equal(show.live.clip.id, "evolution:Quiet Herbarium");
  show.tick(10);
  for (let t = 12; t < 350; t += 2) {
    show.tick(t, { event: t % 32 === 0 ? "drop" : null });
    assert.equal(show.live.clip.snapshot.scene, "evolution");
    assert.equal(show.status(t).worlds.active.id, "garden");
  }
});
test("ratings/favorites fallback stays inside world, even when no looks qualify", () => {
  const show = make();
  prepare(show);
  start(show);
  show.tick(2);
  show.tick(10);
  show.set.autopilot.favoritesOnly = true;
  show.set.favorites = ["acid:Mycelial City"];
  show.command({ type: "next" }, 11);
  show.tick(12);
  assert.equal(show.live.clip.snapshot.scene, "evolution");
  show.set.worlds[1].states.forEach((s) => {
    show.set.ratings[s.look] = 0;
  });
  show.tick(20);
  show.command({ type: "next" }, 21);
  assert.equal(show.pending, null);
});
test("manual catalog, free play and safe leave the world without surprise return", () => {
  for (const action of [
    { type: "look", id: "acid:Mycelial City" },
    { type: "world-leave" },
    { type: "safe" },
  ]) {
    const show = make();
    prepare(show);
    start(show);
    show.tick(2);
    show.command(action, 3);
    assert.equal(show.status(3).worlds.active, null);
    assert.equal(show.status(3).worlds.transition, null);
  }
});
test("cancel prevents pending change and saved paused queue restores at the same beat", () => {
  const show = make();
  prepare(show);
  start(show);
  show.command({ type: "pause", on: true }, 1);
  const saved = show.snapshot(100);
  const other = make();
  other.restore(saved, 200);
  assert.ok(Math.abs(other.status(200).pending.beats - 2) < 1e-9);
  assert.equal(other.clock.paused, true);
  other.command({ type: "pause", on: false }, 210);
  other.tick(211);
  assert.equal(other.status(211).worlds.active.id, "garden");
  prepare(show, "mycelium");
  show.command({ type: "world-cancel" }, 100);
  assert.equal(show.pending, null);
  assert.equal(show.preparedWorld, null);
});
test("recovery retains active world and preparation; removed definitions leave free play", () => {
  const show = make();
  prepare(show);
  start(show);
  show.tick(2);
  show.tick(10);
  prepare(show, "mycelium", {}, 11);
  const other = make();
  other.restore(show.snapshot(11), 100);
  assert.equal(other.world, "garden");
  assert.equal(other.preparedWorld.id, "mycelium");
  other.updateSet({ ...other.set, worlds: [] }, 100);
  assert.equal(other.world, null);
  assert.equal(other.preparedWorld, null);
});
test("memory transfer uses nearest sampling of both ping-pong fields and skips reset/warm/frozen slots", () => {
  const acid = scenes.find((s) => s.id === "acid");
  const garden = scenes.find((s) => s.id === "evolution");
  assert.equal(canCarryTraces(acid, garden), true);
  assert.equal(
    canCarryTraces(
      acid,
      scenes.find((s) => s.id === "melt"),
    ),
    false,
  );
  const calls = [];
  const gl = {
    READ_FRAMEBUFFER: 1,
    DRAW_FRAMEBUFFER: 2,
    FRAMEBUFFER: 3,
    COLOR_BUFFER_BIT: 4,
    NEAREST: 5,
    bindFramebuffer: (...a) => calls.push(["bind", ...a]),
    blitFramebuffer: (...a) => calls.push(["blit", ...a]),
  };
  const source = {
    scene: acid,
    sim: [{ fbo: "old", w: 320, h: 192 }],
    si: 0,
    time: 12,
    tick: 720,
    lookId: "old-look",
    reset: false,
    warmTicks: 0,
  };
  const target = {
    scene: garden,
    sim: [
      { fbo: "new-a", w: 384, h: 384 },
      { fbo: "new-b", w: 384, h: 384 },
    ],
    reset: true,
  };
  assert.equal(carryTraces(gl, source, target), true);
  assert.equal(calls.filter((c) => c[0] === "blit").length, 2);
  assert.deepEqual(
    calls.find((c) => c[0] === "blit"),
    ["blit", 0, 0, 320, 192, 0, 0, 384, 384, 4, 5],
  );
  assert.equal(target.reset, false);
  assert.equal(target.time, 12);
  assert.equal(target.carriedFrom, "old-look");
  for (const patch of [{ reset: true }, { warmTicks: 6 }, { frozen: true }])
    assert.equal(carryTraces(gl, { ...source, ...patch }, target), false);
});

test("Freeze holds world fade while beat clock keeps running, then resumes from the same mix", () => {
  const show = make();
  prepare(show);
  start(show);
  show.tick(2);
  show.tick(4);
  show.command({ type: "freeze", on: true }, 4);
  const p = show.status(4).worlds.transition.progress;
  show.tick(40);
  assert.equal(show.status(40).worlds.transition.progress, p);
  assert.deepEqual(show.command({ type: "next" }, 40), []);
  const timing = show
    .command({ type: "freeze", on: false }, 40)
    .find((a) => a.type === "world-timing");
  assert.ok(timing);
  assert.equal(show.status(40).worlds.transition.progress, p);
  show.tick(46);
  assert.equal(show.status(46).worlds.transition, null);
});
test("a world queued under Freeze waits for the first bar after release", () => {
  const show = make();
  show.command({ type: "freeze", on: true }, 0.1);
  prepare(show);
  start(show);
  show.tick(30);
  assert.equal(show.world, null);
  show.command({ type: "freeze", on: false }, 30.2);
  assert.ok(show.pending.at > show.clock.at(30.2).beat);
  show.tick(32);
  assert.equal(show.world, "garden");
});
test("changed world definitions cancel queued/prepared old states, even if world id stays", () => {
  const show = make();
  prepare(show);
  start(show);
  const set = structuredClone(show.set);
  set.worlds[1].states = structuredClone(set.worlds[0].states);
  show.updateSet(set, 0.5);
  show.tick(2);
  assert.equal(show.pending, null);
  assert.equal(show.preparedWorld, null);
  assert.equal(show.world, null);
  assert.equal(show.live.clip.id, "acid:Signal Understory");
});
test("development chemistry is curated, validated and restored as part of the world", () => {
  const show = make();
  prepare(show);
  start(show);
  const load = show.tick(2).find((a) => a.type === "load");
  assert.equal(load.snapshot.params.feed, 0.029);
  assert.equal(load.snapshot.params.prune, 0.057);
  const other = make();
  other.restore(show.snapshot(3), 100);
  assert.equal(other.live.clip.snapshot.params.feed, 0.029);
  const invalid = structuredClone(show.set);
  invalid.worlds[0].states[0].params.feed = 999;
  assert.throws(() => validateShowSet(invalid, scenes));
});
test("removing a referenced own look keeps portable world definitions valid", async () => {
  const { withoutWorldLook } = await import("../worlds.mjs");
  const set = initialShowSet(scenes);
  const snapshot = presetSnapshot(scenes.find((s) => s.id === "acid"));
  set.looks = [
    {
      id: "own-world",
      name: "My roots",
      snapshot,
      base: "acid:Mycelial City",
      palette: "custom",
      transition: "crossfade",
    },
  ];
  set.worlds[0].states[0].look = "own-world";
  validateShowSet(set, scenes);
  set.looks = [];
  set.worlds = withoutWorldLook(set.worlds, "own-world");
  assert.equal(validateShowSet(set, scenes).worlds[0].states.length, 2);
  set.worlds = withoutWorldLook(set.worlds, set.worlds[0].states[0].look);
  assert.equal(validateShowSet(set, scenes).worlds.length, AUTHORED_WORLDS - 1);
});

test("untouched early world definitions gain stable chemistry without replacing customized worlds", () => {
  const set = initialShowSet(scenes);
  for (const world of set.worlds)
    for (const state of world.states) delete state.params;
  set.worlds[1].name = "My garden";
  const migrated = validateShowSet(set, scenes);
  assert.equal(migrated.worlds[0].states[0].params.feed, 0.029);
  assert.equal(migrated.worlds[1].name, "My garden");
  assert.equal(migrated.worlds[1].states[0].params, undefined);
});

test("restoring free play into a frozen world clears its identity and held beat", () => {
  const free = make().snapshot(0);
  const show = make();
  prepare(show);
  start(show);
  show.tick(2);
  show.command({ type: "freeze", on: true }, 3);
  assert.notEqual(show.worldFreezeBeat, null);
  show.restore(free, 10);
  assert.equal(show.world, null);
  assert.equal(show.worldFreezeBeat, null);
});

test("in-place control edits invalidate a deleted queued development and its cached look", async () => {
  const { withoutWorldLook } = await import("../worlds.mjs");
  const show = make();
  const set = show.set;
  set.looks.push({
    id: "own-world",
    name: "My roots",
    snapshot: presetSnapshot(scenes.find((s) => s.id === "acid")),
    base: "acid:Mycelial City",
    palette: "custom",
    transition: "crossfade",
  });
  set.worlds[0].states[0].look = "own-world";
  show.updateSet(set, 0);
  prepare(show, "mycelium");
  start(show);
  set.looks = [];
  set.worlds = withoutWorldLook(set.worlds, "own-world");
  show.updateSet(validateShowSet(set, scenes), 0.5);
  show.tick(2);
  assert.equal(show.pending, null);
  assert.equal(show.preparedWorld, null);
  assert.equal(show.world, null);
  assert.equal(show.clipFor("own-world"), null);
});

test("world presentation translates authored copy and preserves user edits", async () => {
  const { worldPresentation } = await import("../worlds.mjs");
  const world = initialShowSet(scenes).worlds[0];
  const german = worldPresentation(world, "de");
  assert.equal(german.name, "Lebendes Myzel");
  assert.equal(german.states[0].name, "Unterholz");
  world.states[0].name = "My private roots";
  assert.equal(
    worldPresentation(world, "de").states[0].name,
    "My private roots",
  );
  world.name = "My world";
  assert.deepEqual(worldPresentation(world, "de"), world);
});

test("an untouched authored prefix gains newer authored worlds; custom libraries stay exact", () => {
  const set = initialShowSet(scenes);
  const all = set.worlds.map((w) => w.id);
  set.worlds = set.worlds.slice(0, 1);
  assert.deepEqual(
    validateShowSet(set, scenes).worlds.map((w) => w.id),
    all,
  );
  set.worlds = initialShowSet(scenes).worlds.slice(0, 1);
  set.worlds[0].name = "My mycelium";
  assert.deepEqual(
    validateShowSet(set, scenes).worlds.map((w) => w.name),
    ["My mycelium"],
  );
});
