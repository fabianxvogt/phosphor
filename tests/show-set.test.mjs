import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialSession } from "../session.mjs";
import {
  initialShowSet,
  validateShowSet,
  migrateV2,
  parseShowSet,
  PAGES,
  SLOTS,
} from "../show-set.mjs";

test("initial v3 set validates and fills page 1 with authored looks", () => {
  const set = validateShowSet(initialShowSet(scenes), scenes);
  assert.equal(set.pages.length, PAGES);
  assert.ok(set.pages.every((p) => p.slots.length === SLOTS));
  const filled = set.pages[0].slots.filter(Boolean);
  assert.ok(filled.length >= 20);
  assert.equal(new Set(filled.map((c) => c.id)).size, filled.length);
  assert.ok(set.pages.slice(1).every((p) => p.slots.every((c) => c === null)));
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
