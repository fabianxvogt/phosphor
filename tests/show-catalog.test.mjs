// Show with the look catalog as autopilot's source: ratings, favourites, own
// looks and Next (D65, D66, D68).
import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { catalogLooks } from "../catalog.mjs";
import { Show } from "../show.mjs";

const safeSnapshot = presetSnapshot(
  scenes.find((s) => s.id === "interference"),
);
function makeShow(mutate) {
  const set = initialShowSet(scenes);
  set.clock.mode = "manual";
  set.clock.manualBpm = 120; // 0.5 s per beat, 2 s per bar
  mutate?.(set);
  return new Show({
    set: validateShowSet(set, scenes),
    safeSnapshot,
    scenes,
    now: 0,
  });
}
const loads = (actions) => actions.filter((a) => a.type === "load");
const looks = catalogLooks(scenes);
const lookIds = new Set(looks.map((look) => look.id));
const KINDS = ["crossfade", "dissolve", "melt"];

test("autopilot plays catalog looks with the show palette and energy", () => {
  const show = makeShow();
  const [first] = loads(show.begin(0));
  assert.ok(lookIds.has(first.clipId));
  const palette = show.status(0).palette;
  show.energy = 0.8; // as if autopilot had built up
  const fired = [];
  let drifted = 0;
  for (let t = 0; t < 120; t += 1 / 30) {
    const actions = show.tick(t);
    if (actions.some((a) => a.type === "params")) drifted++;
    for (const load of loads(actions)) {
      fired.push({ t, load });
      assert.deepEqual(load.snapshot.palette, show.paletteColors);
    }
  }
  assert.ok(fired.length >= 4, `${fired.length} changes`);
  for (const { load } of fired) {
    assert.ok(lookIds.has(load.clipId));
    assert.equal(load.energy, 0.8, "show energy carries over (D54)");
    assert.equal(load.fadeSeconds, 6);
    assert.ok(KINDS.includes(load.transition));
  }
  // The live catalog clip is autopilot's current clip: it plays its random
  // duration (no immediate re-trigger) and its parameters drift.
  for (let i = 1; i < fired.length; i++)
    assert.ok(
      [16, 24, 32].some(
        (s) => Math.abs(fired[i].t - fired[i - 1].t - s) < 0.05,
      ),
      `${fired[i].t - fired[i - 1].t} s`,
    );
  assert.ok(drifted > 100, "catalog clips drift");
  assert.equal(
    show.status(120).palette,
    palette,
    "triggers keep the show palette",
  );
  const live = show.status(120).live;
  const look = looks.find((l) => l.id === live.look);
  assert.equal(live.name, look.name);
  assert.equal(live.scene, look.sceneId);
  assert.equal(new Set(fired.map((f) => f.load.clipId)).size, fired.length);
});

test("catalog picks follow ratings: 0 never plays, higher ratings play more", () => {
  const [ten, one, unrated] = [
    "pulse:Square Tunnel",
    "flight:Corkscrew",
    "beams:Crossfire",
  ];
  const show = makeShow((set) => {
    set.ratings = Object.fromEntries(looks.map((look) => [look.id, 0]));
    set.ratings[ten] = 10;
    set.ratings[one] = 1;
    delete set.ratings[unrated];
  });
  const counts = {};
  const count = (load) =>
    (counts[load.clipId] = (counts[load.clipId] ?? 0) + 1);
  loads(show.begin(0)).forEach(count);
  for (let t = 0; t < 4000; t += 0.25) loads(show.tick(t)).forEach(count);
  assert.deepEqual(Object.keys(counts).sort(), [one, unrated, ten].sort());
  assert.ok(
    counts[ten] > counts[unrated] && counts[unrated] > counts[one],
    JSON.stringify(counts),
  );
});

test("favourites only: autopilot plays favourites, all looks when none can play (D68)", () => {
  const favorites = ["pulse:Square Tunnel", "julia:Cubic Lace"];
  const show = makeShow((set) => {
    set.favorites = favorites;
    set.autopilot.favoritesOnly = true;
  });
  const played = new Set(loads(show.begin(0)).map((load) => load.clipId));
  for (let t = 0; t < 600; t += 0.25)
    for (const load of loads(show.tick(t))) played.add(load.clipId);
  assert.deepEqual([...played].sort(), [...favorites].sort());
  const none = makeShow((set) => {
    set.favorites = ["pulse:Square Tunnel"];
    set.ratings["pulse:Square Tunnel"] = 0; // a favourite rated "never"
    set.autopilot.favoritesOnly = true;
  });
  const [load] = loads(none.begin(0));
  assert.ok(load && load.clipId !== "pulse:Square Tunnel");
});

test("a minimum rating keeps lower-rated looks out; unrated count as 5", () => {
  const show = makeShow((set) => {
    set.autopilot.minRating = 6;
    for (const look of looks) set.ratings[look.id] = 3;
    set.ratings["flight:Corkscrew"] = 8;
    set.ratings["beams:Crossfire"] = 6;
  });
  const played = new Set(loads(show.begin(0)).map((load) => load.clipId));
  for (let t = 0; t < 600; t += 0.25)
    for (const load of loads(show.tick(t))) played.add(load.clipId);
  assert.deepEqual([...played].sort(), ["beams:Crossfire", "flight:Corkscrew"]);
  const unrated = makeShow((set) => (set.autopilot.minRating = 5));
  assert.equal(loads(unrated.begin(0)).length, 1, "unrated looks pass a 5");
});

test("own looks play from keys, the catalog and autopilot (D68)", () => {
  const base = looks.find((look) => look.sceneId === "melt");
  const show = makeShow((set) => {
    set.looks.push({
      id: "own-1",
      name: "My knot",
      base: base.id,
      snapshot: structuredClone(base.snapshot),
      palette: "ember",
      transition: "dissolve",
    });
    set.keys[7] = "own-1";
    set.favorites = ["own-1"];
    set.autopilot.favoritesOnly = true;
    set.autopilot.enabled = false;
  });
  show.command({ type: "slot", index: 7 }, 0.3);
  const [key] = loads(show.tick(0.5));
  assert.equal(key.clipId, "own-1");
  assert.equal(key.transition, "dissolve");
  assert.equal(show.status(0.5).palette, "ember");
  assert.equal(show.status(0.5).live.name, "My knot");
  show.command({ type: "next" }, 1.2);
  const [next] = loads(show.tick(1.5));
  assert.equal(next, undefined, "the only favourite is already live");
  const updated = structuredClone(show.set);
  updated.looks[0].name = "Renamed";
  show.updateSet(updated);
  assert.equal(show.catalogClips.get("own-1").name, "Renamed");
});

test("Next plays autopilot's pick on the next beat, smoothly, without taking over (D66)", () => {
  const show = makeShow();
  show.begin(0);
  show.tick(0);
  const first = show.live.clip.id;
  assert.deepEqual(show.command({ type: "next" }, 0.3), []);
  assert.ok(lookIds.has(show.status(0.3).pending.look));
  const [load] = loads(show.tick(0.5));
  assert.ok(load, "fires on the next beat");
  assert.notEqual(load.clipId, first);
  assert.equal(load.fadeSeconds, 6);
  assert.ok(KINDS.includes(load.transition));
  const status = show.status(0.5).autopilot;
  assert.equal(status.active, true, "not a performer takeover");
  assert.equal(status.handBackIn, 0);
  assert.equal(status.nextChangeIn, status.duration, "duration re-armed");
  // Works with autopilot off and leaves it off; never repeats recent looks.
  show.command({ type: "autopilot", on: false }, 1);
  const ids = [first, load.clipId];
  for (let i = 0; i < 30; i++) {
    const t = 2 + i;
    show.command({ type: "next" }, t + 0.2);
    const [next] = loads(show.tick(t + 0.5));
    assert.ok(next);
    assert.ok(!ids.slice(-24).includes(next.clipId), next.clipId);
    ids.push(next.clipId);
  }
  assert.equal(show.autopilot.enabled, false);
  const empty = makeShow((set) => {
    for (const look of looks) set.ratings[look.id] = 0;
  });
  assert.deepEqual(empty.command({ type: "next" }, 0), []);
});

test("drops and breakdowns pick catalog looks", () => {
  const show = makeShow();
  show.begin(0);
  show.tick(0);
  const [drop] = loads(show.tick(2, { event: "drop" }));
  assert.ok(lookIds.has(drop.clipId));
  assert.equal(drop.transition, "melt");
  assert.equal(drop.fadeSeconds, 2); // four beats
  show.tick(4, { event: "breakdown" });
  const calmer = [];
  for (let t = 4; t < 21; t += 0.25) calmer.push(...loads(show.tick(t)));
  assert.equal(calmer.length, 1);
  assert.ok(lookIds.has(calmer[0].clipId));
  assert.ok(["melt", "dissolve"].includes(calmer[0].transition));
});

test("a catalog look comes back after a stage reload by its id", () => {
  const show = makeShow();
  show.begin(0);
  const id = show.live.clip.id;
  const saved = JSON.parse(JSON.stringify(show.snapshot(1)));
  const again = makeShow();
  const [load] = again.restore(saved, 0);
  assert.equal(load.type, "load");
  assert.equal(load.clipId, id);
  assert.equal(again.live.clip.snapshot.scene, id.split(":")[0]);
  assert.equal(again.status(0).live.look, id);
});

test("a failed family on screen gives way to another catalog look", () => {
  const show = makeShow();
  show.begin(0);
  const scene = show.live.clip.snapshot.scene;
  const [cut] = loads(show.disable(scene, 1, true));
  assert.ok(lookIds.has(cut.clipId));
  assert.notEqual(cut.snapshot.scene, scene);
  for (let t = 1; t < 300; t += 0.25)
    for (const load of loads(show.tick(t)))
      assert.notEqual(load.snapshot.scene, scene);
});
