import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { Show } from "../show.mjs";
import { ShowClock } from "../show-clock.mjs";
import { initialShowSet, validateShowSet, parseShowSet } from "../show-set.mjs";
import {
  GLOBAL_EFFECTS,
  effectDefinitions,
  defaultPattern,
  samplePattern,
} from "../rhythm.mjs";
import { presetSnapshot } from "../session.mjs";
import { catalogLooks } from "../catalog.mjs";
import {
  loadSet,
  saveSet,
  saveRuntime,
  loadRuntime,
} from "../show-storage.mjs";

// Small actual scene definitions with deliberately independent loop lengths.
const definitions = [
  {
    id: "light",
    slot: 0,
    defaults: {
      division: 4,
      length: 4,
      steps: [1, 0, 0, 0],
      strength: 0.6,
      duration: 0.5,
      muted: false,
    },
  },
  {
    id: "growth",
    slot: 2,
    variants: [0],
    defaults: {
      division: 1,
      length: 3,
      steps: [1, 0, 0],
      strength: 0.4,
      duration: 1,
      muted: false,
    },
  },
];
const family = scenes
  .slice(0, 2)
  .map((scene) => ({ ...scene, rhythm: structuredClone(definitions) }));
const safeSnapshot = presetSnapshot(
  scenes.find((scene) => scene.id === "interference"),
);
function make(set = initialShowSet(family)) {
  set.clock.mode = "manual";
  set.clock.manualBpm = 120;
  set.autopilot.enabled = false;
  return new Show({
    set: validateShowSet(set, family),
    safeSnapshot,
    scenes: family,
    now: 0,
  });
}
const edited = (pattern, edit) => {
  const p = structuredClone(pattern);
  p.mode = "locked";
  edit?.(p);
  return p;
};
const action = (familyId, pattern, quantize = "step") => ({
  type: "rhythm",
  scope: "family",
  family: familyId,
  pattern,
  quantize,
});
const frameAt = (show, time, previousPosition) => {
  const frame = show.rhythmFrame(time),
    pattern = frame.settings.families[family[0].id];
  return samplePattern(
    pattern,
    definitions,
    frame.beat - frame.origin,
    previousPosition,
    {
      style: frame.style,
      variant: 0,
      activation: frame.activations.families[family[0].id],
    },
  );
};

test("step edits wait for their subdivision and make no edit-time injection", () => {
  const show = make(),
    id = family[0].id;
  const pattern = edited(
    show.set.rhythm.families[id],
    (p) => (p.tracks[0].steps[1] = 0.8),
  );
  show.command(action(id, pattern), 0.06); // music position .12
  assert.equal(show.status(0.06).rhythm.pending[0].at, 0.25);
  assert.equal(
    show.set.rhythm.families[id].tracks[0].steps[1],
    0.8,
    "saved desired edit exists before playback",
  );
  assert.equal(
    show.rhythmFrame(0.1).settings.families[id].tracks[0].steps[1],
    0,
  );
  assert.equal(frameAt(show, 0.1, 0.12).hits[0], 0);
  assert.equal(frameAt(show, 0.125, 0.2).hits[0], 0.48);
  assert.deepEqual(show.status(0.125).rhythm.pending, []);
});

test("different subdivisions apply at their own next grid point", () => {
  const show = make(),
    id = family[0].id;
  const pattern = edited(show.set.rhythm.families[id], (p) => {
    p.tracks[0].steps[1] = 1;
    p.tracks[1].steps[1] = 1;
  });
  show.command(action(id, pattern), 0.06);
  const early = show.rhythmFrame(0.125).settings.families[id];
  assert.equal(early.tracks[0].steps[1], 1);
  assert.equal(early.tracks[1].steps[1], 0);
  assert.equal(show.status(0.125).rhythm.pending[0].at, 1);
  assert.equal(
    show.rhythmFrame(0.5).settings.families[id].tracks[1].steps[1],
    1,
  );
});

test("a delayed frame never injects a newly added event from before its application point", () => {
  const show = make(),
    id = family[0].id;
  const pattern = edited(
    show.set.rhythm.families[id],
    (p) => (p.tracks[0].steps[2] = 1),
  );
  show.command(action(id, pattern), 0.3); // edit at .6, apply on .75
  const frame = show.rhythmFrame(0.4); // dropped frame, now at .8
  assert.equal(frame.activations.families[id].light, 0.75);
  assert.equal(
    frameAt(show, 0.4, 0.1).hits[0],
    0,
    "the new .5 event predates activation",
  );
  assert.equal(
    frameAt(show, 0.5, 0.8).hits[0],
    0.6,
    "the next actual event still fires",
  );
});

test("locking an automatic quiet phrase preserves its visible loops and step quantization", () => {
  const show = make(),
    id = family[0].id;
  show.command({ type: "autopilot", on: true }, 0);
  show.rhythmFrame(0);
  assert.equal(show.rhythmFrame(16).style, "restrained");
  const quiet = edited(
    defaultPattern(definitions, "restrained"),
    (p) => (p.tracks[0].steps[1] = 1),
  );
  show.command(action(id, quiet), 16.05);
  const pending = show.status(16.05).rhythm.pending[0];
  assert.equal(pending.quantize, "step");
  assert.equal(pending.at, 32.25);
  assert.equal(
    show.rhythmFrame(16.05).settings.families[id].tracks[0].length,
    8,
  );
  assert.equal(frameAt(show, 16.125, 32.1).hits[0], quiet.tracks[0].strength);
});

test("whole patterns and loop lengths wait for the next corrected downbeat", () => {
  const show = make(),
    id = family[0].id;
  show.command({ type: "downbeat" }, 0.5); // beat 1 becomes the 1
  const pattern = edited(show.set.rhythm.families[id], (p) => {
    p.tracks[1].length = 5;
    p.tracks[1].steps = [1, 0, 0, 0, 0];
  });
  show.command(action(id, pattern, "step"), 0.6);
  assert.equal(show.status(0.6).rhythm.pending[0].quantize, "bar");
  assert.equal(show.status(0.6).rhythm.pending[0].at, 5);
  assert.equal(show.rhythmFrame(2.4).settings.families[id].tracks[1].length, 3);
  const frame = show.rhythmFrame(2.5);
  assert.equal(frame.origin, 1);
  assert.equal(frame.settings.families[id].tracks[1].length, 5);
});

test("strength and mute act immediately without bringing pending loop changes forward", () => {
  const show = make(),
    id = family[0].id;
  const pattern = edited(show.set.rhythm.families[id], (p) => {
    p.tracks[1].length = 5;
    p.tracks[1].steps = [1, 0, 0, 0, 0];
  });
  show.command(action(id, pattern, "bar"), 0.1);
  const strong = edited(pattern, (p) => {
    p.tracks[0].strength = 0.2;
    p.tracks[1].muted = true;
  });
  show.command(action(id, strong, "now"), 0.15);
  const applied = show.rhythmFrame(0.15).settings.families[id];
  assert.equal(applied.tracks[0].strength, 0.2);
  assert.equal(applied.tracks[1].muted, true);
  assert.equal(applied.tracks[1].length, 3);
  assert.equal(show.status(0.15).rhythm.pending[0].at, 4);
  assert.equal(frameAt(show, 0.15, 0.2).hits[0], 0);
  assert.deepEqual(show.rhythmFrame(2).settings.families[id], strong);
});

test("repeated edits coalesce per target without cancelling another family/global edit", () => {
  const show = make(),
    a = family[0].id,
    b = family[1].id;
  const a1 = edited(
    show.set.rhythm.families[a],
    (p) => (p.tracks[0].steps[1] = 0.3),
  );
  const a2 = edited(a1, (p) => (p.tracks[0].steps[1] = 1));
  show.command(action(a, a1), 0.05);
  show.command(
    action(
      b,
      edited(show.set.rhythm.families[b], (p) => (p.tracks[1].steps[1] = 1)),
    ),
    0.07,
  );
  show.command(
    {
      type: "rhythm",
      scope: "global",
      pattern: edited(
        show.set.rhythm.global,
        (p) => (p.tracks[0].steps[1] = 1),
      ),
      quantize: "bar",
    },
    0.08,
  );
  show.command(action(a, a2), 0.1);
  assert.equal(show.status(0.1).rhythm.pending.length, 3);
  assert.equal(
    show.rhythmFrame(0.125).settings.families[a].tracks[0].steps[1],
    1,
  );
  assert.equal(show.status(0.125).rhythm.pending.length, 2);
  assert.equal(
    show.rhythmFrame(0.5).settings.families[b].tracks[1].steps[1],
    1,
  );
  assert.equal(show.rhythmFrame(2).settings.global.tracks[0].steps[1], 1);
});

test("resending desired sets preserves pending application and imports queue new patterns", () => {
  const show = make(),
    id = family[0].id;
  const pattern = edited(
    show.set.rhythm.families[id],
    (p) => (p.tracks[0].steps[1] = 1),
  );
  show.command(action(id, pattern), 0.05);
  show.updateSet(validateShowSet(structuredClone(show.set), family), 0.08);
  assert.equal(show.status(0.08).rhythm.pending[0].at, 0.25);
  assert.equal(
    show.rhythmFrame(0.125).settings.families[id].tracks[0].steps[1],
    1,
  );
  const imported = structuredClone(show.set);
  imported.rhythm.global = edited(
    imported.rhythm.global,
    (p) => (p.tracks[0].steps[2] = 1),
  );
  show.updateSet(validateShowSet(imported, family), 0.2);
  assert.equal(
    show.rhythmFrame(0.2).settings.global.tracks[0].steps[2],
    GLOBAL_EFFECTS[0].defaults.steps[2],
  );
  assert.equal(show.status(0.2).rhythm.pending[0].at, 4);
});

test("global queued edits coalesce across playing-family changes", () => {
  const show = make(),
    looks = catalogLooks(family);
  show.command(
    {
      type: "look",
      id: looks.find((look) => look.sceneId === family[0].id).id,
    },
    0,
  );
  const first = edited(
    show.set.rhythm.global,
    (p) => (p.tracks[0].steps[1] = 0.8),
  );
  show.command(
    { type: "rhythm", scope: "global", pattern: first, quantize: "bar" },
    0.1,
  );
  show.command(
    {
      type: "look",
      id: looks.find((look) => look.sceneId === family[1].id).id,
    },
    0.15,
  );
  const second = edited(first, (p) => (p.tracks[0].steps[1] = 1));
  show.command(
    { type: "rhythm", scope: "global", pattern: second, quantize: "bar" },
    0.2,
  );
  assert.equal(
    show.status(0.2).rhythm.pending.filter((entry) => entry.scope === "global")
      .length,
    1,
  );
  assert.deepEqual(show.rhythmFrame(2).settings.global, second);
});

test("family changes and crossfades retain all family patterns and music position", () => {
  const show = make();
  const looks = catalogLooks(family);
  const first = looks.find((look) => look.sceneId === family[0].id);
  const second = looks.find((look) => look.sceneId === family[1].id);
  show.command({ type: "look", id: first.id }, 0);
  const before = show.rhythmFrame(1.25);
  const [load] = show.command({ type: "look", id: second.id }, 1.25);
  const after = show.rhythmFrame(1.25);
  assert.equal(load.clipId, second.id);
  assert.ok(load.fadeSeconds > 0);
  assert.equal(before.beat, after.beat);
  assert.deepEqual(
    Object.keys(after.settings.families),
    family.map((scene) => scene.id),
  );
  assert.equal(
    show.status(1.25).rhythm.live.family,
    family[1].id,
    "grid targets incoming family at transition start",
  );
  show.command({ type: "speed", value: 0.5 }, 1.3);
  assert.equal(show.rhythmFrame(1.5).beat, 3);
  assert.equal(frameAt(show, 1.5, 2.99).hits[2], 0.4);
  show.command({ type: "speed", value: 2 }, 1.6);
  assert.equal(show.rhythmFrame(3).beat, 6);
  assert.equal(frameAt(show, 3, 5.99).hits[2], 0.4);
});

test("own-look overrides are explicit, inherited by null, and drafts remain ephemeral", () => {
  const set = initialShowSet(family),
    base = catalogLooks(family)[0];
  set.looks.push({
    id: "own-one",
    name: "Own one",
    base: base.id,
    snapshot: structuredClone(base.snapshot),
    palette: null,
    transition: "auto",
  });
  const show = make(set);
  const override = edited(
    show.set.rhythm.families[base.sceneId],
    (p) => (p.tracks[0].strength = 0.15),
  );
  show.command(
    {
      type: "rhythm",
      scope: "look",
      look: "own-one",
      pattern: override,
      quantize: "bar",
    },
    0.1,
  );
  assert.equal(
    show.rhythmFrame(0.1).overrides["own-one"].tracks[0].strength,
    0.15,
  );
  assert.deepEqual(show.set.looks[0].rhythm, override);
  show.command({ type: "look", id: "own-one" }, 0.2);
  assert.equal(show.status(0.2).rhythm.live.own, true);
  show.command(
    {
      type: "rhythm",
      scope: "look",
      look: "own-one",
      pattern: null,
      quantize: "bar",
    },
    0.3,
  );
  assert.ok(show.rhythmFrame(0.3).overrides["own-one"]);
  assert.equal(show.set.looks[0].rhythm, null);
  assert.equal(show.rhythmFrame(2).overrides["own-one"], undefined);
  const draft = {
    ...show.clipFor(base.id),
    id: "draft-rhythm",
    rhythm: override,
  };
  show.command({ type: "audition", clip: draft }, 2.1);
  assert.deepEqual(show.rhythmFrame(2.1).overrides[draft.id], override);
  assert.equal(show.status(2.1).rhythm.overrides[draft.id], undefined);
  assert.deepEqual(show.status(2.1).rhythm.drafts[draft.id], override);
  assert.equal(
    show.set.looks.some((look) => look.id === draft.id),
    false,
  );
  assert.equal(show.status(2.1).rhythm.live.own, false);
  show.command({ type: "look", id: base.id }, 2.2);
  assert.ok(
    show.rhythmFrame(2.2).overrides[draft.id],
    "outgoing draft retains its override through a fade",
  );
  show.command({ type: "safe" }, 2.3);
  assert.equal(show.rhythmFrame(2.3).enabled, false);
});

test("hot draft rhythm edits refresh the playing preview without changing saved patterns", () => {
  const show = make(),
    base = catalogLooks(family)[0];
  const draft = {
    ...show.clipFor(base.id),
    id: "draft-hot",
    rhythm: edited(show.set.rhythm.families[base.sceneId]),
  };
  show.command({ type: "audition", clip: draft }, 0);
  const saved = structuredClone(show.set);
  const changed = {
    ...draft,
    rhythm: edited(draft.rhythm, (p) => (p.tracks[0].steps[1] = 1)),
  };
  assert.equal(show.refreshDraftRhythm(changed, 0.2), true);
  assert.deepEqual(show.rhythmFrame(0.2).overrides[draft.id], changed.rhythm);
  assert.deepEqual(show.set, saved);
  assert.equal(show.status(0.2).rhythm.overrides[draft.id], undefined);
  const frame = show.rhythmFrame(0.21);
  const sampled = samplePattern(
    frame.overrides[draft.id],
    definitions,
    frame.beat - frame.origin,
    0.1,
    { activation: frame.activations.overrides[draft.id] },
  );
  assert.equal(
    sampled.hits[0],
    0,
    "a past preview event is not injected during hot editing",
  );
  assert.equal(
    show.refreshDraftRhythm({ ...changed, id: "other-draft" }, 0.2),
    false,
  );
  assert.equal(
    show.refreshDraftRhythm({ ...changed, rhythm: null }, 0.3),
    true,
  );
  assert.equal(show.rhythmFrame(0.3).overrides[draft.id], undefined);
});

test("phrase variation changes auto responses while protected event placement survives", () => {
  const show = make(),
    id = family[0].id;
  show.command({ type: "autopilot", on: true }, 0);
  const protectedPattern = edited(show.set.rhythm.families[id]);
  show.command(action(id, protectedPattern, "now"), 0);
  const saved = structuredClone(show.set.rhythm);
  show.rhythmFrame(0);
  const quiet = show.rhythmFrame(16); // 8 bars, first restrained phrase
  assert.equal(quiet.style, "restrained");
  assert.equal(
    samplePattern(quiet.settings.families[id], definitions, 33, 32.9, {
      style: quiet.style,
    }).hits[2],
    0.4,
  );
  assert.equal(
    samplePattern(
      quiet.settings.families[family[1].id],
      definitions,
      33,
      32.9,
      { style: quiet.style },
    ).hits[2],
    0,
  );
  assert.equal(show.rhythmFrame(48).style, "driving"); // after 16 quiet bars
  assert.equal(show.rhythmFrame(64).style, "accented");
  assert.deepEqual(
    show.set.rhythm,
    saved,
    "automation never mutates saved patterns",
  );
});

test("portable v5 round trips retain all patterns, explicit inheritance and old-set defaults", () => {
  const set = initialShowSet(family),
    base = catalogLooks(family)[0];
  set.rhythm.families[base.sceneId] = edited(
    set.rhythm.families[base.sceneId],
    (p) => (p.tracks[1].steps[2] = 0.5),
  );
  set.looks.push({
    id: "own-rhythm",
    name: "Rhythm",
    base: base.id,
    snapshot: structuredClone(base.snapshot),
    palette: null,
    transition: "auto",
    rhythm: edited(defaultPattern(definitions)),
  });
  set.looks.push({ ...set.looks[0], id: "own-inherit", rhythm: null });
  const original = structuredClone(set);
  assert.deepEqual(
    parseShowSet(JSON.parse(JSON.stringify(set)), family).set,
    set,
  );
  const values = new Map(),
    storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
  saveSet(storage, set);
  assert.deepEqual(loadSet(storage, family).set, set);
  const old = structuredClone(set);
  delete old.rhythm;
  assert.deepEqual(
    validateShowSet(old, family).rhythm,
    initialShowSet(family).rhythm,
  );
  assert.deepEqual(set, original);
});

test("runtime recovery preserves fractional beat, corrected origin, applied and queued patterns", () => {
  const show = make(),
    id = family[0].id;
  show.command({ type: "downbeat" }, 0.5);
  const pattern = edited(show.set.rhythm.families[id], (p) => {
    p.tracks[1].length = 5;
    p.tracks[1].steps = [0, 0, 1, 0, 0];
  });
  show.command(action(id, pattern, "bar"), 0.7);
  const state = show.snapshot(1.2);
  const values = new Map(),
    storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
  saveRuntime(storage, state, 1000);
  const restored = make(structuredClone(show.set));
  restored.restore(loadRuntime(storage, 1100), 10);
  const frame = restored.rhythmFrame(10);
  assert.equal(frame.beat, 2.4);
  assert.equal(frame.origin, 1);
  assert.equal(frame.settings.families[id].tracks[1].length, 3);
  assert.equal(restored.status(10).rhythm.pending[0].at, 5);
  assert.deepEqual(restored.set.rhythm.families[id], pattern);
  assert.equal(
    restored.rhythmFrame(11.3).settings.families[id].tracks[1].length,
    5,
  );
  assert.ok(Math.abs(restored.rhythmFrame(11.3).beat - 5) < 1e-12);
});

test("stale runtime never overwrites a more recently saved protected pattern", () => {
  const show = make(),
    id = family[0].id;
  const saved = show.snapshot(0.5);
  const newer = edited(
    show.set.rhythm.families[id],
    (p) => (p.tracks[1].steps[1] = 0.8),
  );
  const set = structuredClone(show.set);
  set.rhythm.families[id] = newer;
  const restored = make(set);
  restored.restore(saved, 10);
  assert.deepEqual(restored.set.rhythm.families[id], newer);
  assert.deepEqual(restored.status(10).rhythm.settings.families[id], newer);
  assert.equal(restored.status(10).rhythm.pending[0].at, 4);
  assert.deepEqual(restored.rhythmFrame(11.5).settings.families[id], newer);
});

test("clock restore translates a fractional music position to a new performance timeline", () => {
  const clock = new ShowClock({ mode: "manual", bpm: 128, now: 10 });
  clock.downbeat(11);
  const saved = clock.snapshot(14.123);
  const fresh = new ShowClock();
  fresh.restore(saved, 100);
  assert.equal(fresh.at(100).beat, saved.beat);
  assert.equal(fresh.at(100).origin, saved.barOffset);
  assert.ok(Math.abs(fresh.at(101).beat - saved.beat - 128 / 60) < 1e-12);
});
