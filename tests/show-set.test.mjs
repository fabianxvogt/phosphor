import test from "node:test";
import assert from "node:assert/strict";
import scenes, { GATED } from "../scenes.mjs";
import { initialSession } from "../session.mjs";
import {
  initialShowSet,
  validateShowSet,
  migrateV2,
  parseShowSet,
  addMissingFamilies,
  missingFamilies,
  LAB_PAGE,
  PAGES,
  SLOTS,
} from "../show-set.mjs";

const familiesOn = (page) =>
  new Set(page.slots.filter(Boolean).map((c) => c.snapshot.scene));

test("initial set: page 1 plays only gated families; drafts wait on the lab page (D55)", () => {
  const set = validateShowSet(initialShowSet(scenes), scenes);
  assert.equal(set.pages.length, PAGES);
  assert.ok(set.pages.every((p) => p.slots.length === SLOTS));
  assert.deepEqual(familiesOn(set.pages[0]), GATED);
  assert.ok(set.pages[0].slots.filter(Boolean).every((c) => c.autopilot));
  for (const scene of scenes.filter((s) => GATED.has(s.id) && s.type))
    for (const value of scene.type.values)
      assert.ok(
        set.pages[0].slots.some(
          (c) =>
            c?.snapshot.scene === scene.id &&
            c.snapshot.params[scene.type.key] === value,
        ),
        `${scene.id} ${scene.type.key} ${value} on page 1`,
      );
  const lab = set.pages[LAB_PAGE];
  assert.equal(lab.name, "Lab");
  assert.deepEqual(
    familiesOn(lab),
    new Set(scenes.filter((s) => !GATED.has(s.id)).map((s) => s.id)),
  );
  assert.ok(lab.slots.filter(Boolean).every((c) => !c.autopilot));
  const all = set.pages.flatMap((p) => p.slots).filter(Boolean);
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.deepEqual(missingFamilies(set, scenes), []);
  assert.ok(set.autopilot.enabled && set.autopilot.random);
  assert.equal(set.clock.manualBpm, 120);
});

test("add missing families fills empty lab slots and never touches existing clips", () => {
  const set = validateShowSet(initialShowSet(scenes), scenes);
  // An old set: only Acid and Pulse, with a clip already on the lab page.
  for (const page of set.pages)
    page.slots = page.slots.map((c) =>
      c && ["acid", "pulse"].includes(c.snapshot.scene) ? c : null,
    );
  const keep = set.pages[0].slots.find((c) => c?.snapshot.scene === "pulse");
  set.pages[LAB_PAGE].slots[0] = { ...keep, id: "lab-own" };
  const before = JSON.parse(JSON.stringify(set));
  const { set: next, added, skipped } = addMissingFamilies(set, scenes);
  assert.deepEqual(set, before, "input is not mutated");
  assert.equal(added.length, scenes.length - 2);
  assert.deepEqual(skipped, []);
  assert.deepEqual(missingFamilies(next, scenes), []);
  next.pages.forEach((page, p) =>
    page.slots.forEach((clip, s) => {
      const old = before.pages[p].slots[s];
      if (old) assert.deepEqual(clip, old);
      else if (clip) {
        assert.equal(p, LAB_PAGE);
        assert.equal(clip.autopilot, GATED.has(clip.snapshot.scene));
      }
    }),
  );
});

test("add missing families reports what does not fit a full lab page", () => {
  const set = validateShowSet(initialShowSet(scenes), scenes);
  const filler = set.pages[0].slots[0];
  set.pages[LAB_PAGE].slots = set.pages[LAB_PAGE].slots.map((_, i) => ({
    ...filler,
    id: `full-${i}`,
  }));
  const { added, skipped } = addMissingFamilies(set, scenes);
  assert.deepEqual(added, []);
  assert.equal(skipped.length, scenes.length - GATED.size);
});

test("v3 round-trips through JSON unchanged", () => {
  const set = validateShowSet(initialShowSet(scenes), scenes);
  assert.deepEqual(
    validateShowSet(JSON.parse(JSON.stringify(set)), scenes),
    set,
  );
});

test("invalid values are rejected before anything is applied", () => {
  const base = initialShowSet(scenes);
  const bad = [
    (s) => (s.pages = s.pages.slice(1)),
    (s) => (s.pages[0].slots[0].energy = 2),
    (s) => (s.pages[0].slots[0].quantize = "phrase"),
    (s) => (s.pages[0].slots[1].id = s.pages[0].slots[0].id),
    (s) => (s.shared.zoom = 9),
    (s) => (s.autopilot.everyBars = 12),
    (s) => (s.clock.mode = "midi"),
    (s) => (s.options.pixelBudget = 8),
    (s) => s.midi.push({ type: "cc", channel: 0, number: 1, target: "go" }),
  ];
  for (const mutate of bad) {
    const copy = structuredClone(base);
    mutate(copy);
    assert.throws(() => validateShowSet(copy, scenes), mutate.toString());
  }
});

test("v2 score migrates cues to clips in order and reports what is dropped", () => {
  const v2 = initialSession(scenes);
  v2.cues[0].keyframes.push({ beat: 8, snapshot: v2.cues[0].snapshot });
  v2.midi.push(
    { type: "cc", channel: 0, number: 7, target: "brightness" },
    { type: "note", channel: 0, number: 36, target: "go" },
  );
  const { set, report } = migrateV2(v2, scenes);
  const clips = set.pages[0].slots.filter(Boolean);
  assert.equal(clips.length, v2.cues.length);
  clips.forEach((clip, i) => {
    assert.deepEqual(clip.snapshot, v2.cues[i].snapshot);
    assert.equal(clip.energy, v2.cues[i].energy);
    assert.equal(clip.fade, v2.cues[i].transition);
  });
  assert.deepEqual(set.midi, [
    { type: "cc", channel: 0, number: 7, target: "master" },
  ]);
  assert.ok(report.some((line) => /Keyframes dropped/.test(line)));
  assert.ok(report.some((line) => /audio routing/.test(line)));
  assert.ok(report.some((line) => /"go" dropped/.test(line)));
});

test("parseShowSet accepts v3 and v2 files", () => {
  const v3 = validateShowSet(initialShowSet(scenes), scenes);
  assert.deepEqual(
    parseShowSet(JSON.parse(JSON.stringify(v3)), scenes).set,
    v3,
  );
  const v2 = JSON.parse(JSON.stringify(initialSession(scenes)));
  assert.equal(parseShowSet(v2, scenes).set.format, "phosphor-set-v3");
});
