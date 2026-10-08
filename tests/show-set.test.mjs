import test from "node:test";
import assert from "node:assert/strict";
import scenes, { GATED } from "../scenes.mjs";
import { initialSession } from "../session.mjs";
import { PALETTES, paletteById } from "../palettes.mjs";
import {
  initialShowSet,
  validateShowSet,
  migrateV2,
  migrateV3,
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
  assert.equal(set.pages[0].mood, null);
  const paletteIds = set.pages[0].slots.filter(Boolean).map((c) => c.palette);
  assert.ok(new Set(paletteIds).size >= 12, "page 1 is visibly varied");
  for (const family of GATED) {
    const clips = set.pages[0].slots.filter(
      (c) => c?.snapshot.scene === family,
    );
    assert.equal(new Set(clips.map((c) => c.palette)).size, clips.length);
  }
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

test("v4 round-trips through JSON unchanged", () => {
  const set = validateShowSet(initialShowSet(scenes), scenes);
  assert.deepEqual(
    validateShowSet(JSON.parse(JSON.stringify(set)), scenes),
    set,
  );
});

test("v4 clip transitions default to auto and round-trip every authored choice", () => {
  const old = initialShowSet(scenes);
  for (const page of old.pages)
    for (const clip of page.slots) if (clip) delete clip.transition;
  const original = structuredClone(old);
  const defaulted = parseShowSet(JSON.parse(JSON.stringify(old)), scenes).set;
  for (const page of defaulted.pages)
    for (const clip of page.slots)
      if (clip) assert.equal(clip.transition, "auto");
  assert.deepEqual(old, original, "defaulting does not mutate the source");
  for (const transition of ["auto", "crossfade", "cut", "dissolve", "melt"]) {
    const set = initialShowSet(scenes);
    set.pages[0].slots[0].transition = transition;
    assert.deepEqual(
      parseShowSet(JSON.parse(JSON.stringify(set)), scenes).set,
      set,
    );
  }
});

test("unknown or non-string clip transitions are rejected", () => {
  for (const transition of ["wipe", "", null, 0, false, {}]) {
    const set = initialShowSet(scenes);
    set.pages[0].slots[0].transition = transition;
    assert.throws(() => validateShowSet(set, scenes), /Clip transition/);
  }
});

test("older v4 sets default grain/vignette without changing any existing field", () => {
  const old = initialShowSet(scenes);
  delete old.options.grain;
  delete old.options.vignette;
  old.options.bloom = 0.73;
  old.options.echo = 0.41;
  old.options.chroma = 0.19;
  const original = structuredClone(old);
  const { set, report } = parseShowSet(JSON.parse(JSON.stringify(old)), scenes);
  assert.deepEqual(report, []);
  assert.equal(set.options.grain, 0.12);
  assert.equal(set.options.vignette, 0.15);
  const withoutDefaults = structuredClone(set);
  delete withoutDefaults.options.grain;
  delete withoutDefaults.options.vignette;
  assert.deepEqual(withoutDefaults, original);
  assert.deepEqual(old, original, "defaulting does not mutate the source");
});

test("post ceilings round-trip, including explicit zero, and reject invalid values", () => {
  for (const value of [0, 0.37, 1]) {
    const set = initialShowSet(scenes);
    set.options.grain = value;
    set.options.vignette = 1 - value;
    assert.deepEqual(
      parseShowSet(JSON.parse(JSON.stringify(set)), scenes).set,
      set,
    );
  }
  for (const key of ["grain", "vignette"]) {
    for (const value of [-0.01, 1.01, NaN, Infinity, "0.2", null]) {
      const set = initialShowSet(scenes);
      set.options[key] = value;
      assert.throws(() => validateShowSet(set, scenes), new RegExp(key, "i"));
    }
  }
});

test("v3 migration preserves every clip and set field, including hand-set colours", () => {
  const v3 = initialShowSet(scenes);
  v3.format = "phosphor-set-v3";
  v3.version = 3;
  v3.name = "Owner's eight-page show";
  for (const [p, page] of v3.pages.entries()) {
    delete page.mood;
    for (const [s, clip] of page.slots.entries()) {
      if (!clip) continue;
      delete clip.palette;
      delete clip.transition;
      clip.name = `Authored ${p}:${s}`;
      clip.snapshot.seed = 1000 + p * SLOTS + s;
      clip.snapshot.palette = {
        primary: "#aB1234",
        secondary: "#456789",
        accent: "#fedCbA",
      };
      clip.energy = s / SLOTS;
      clip.fade = s;
      clip.quantize = ["now", "beat", "bar"][s % 3];
      clip.autopilot = s % 2 === 0;
    }
  }
  v3.pages[3].slots[17] = structuredClone(v3.pages[0].slots[1]);
  v3.pages[3].slots[17].id = "second-page";
  v3.shared = { master: 0.7, hue: -0.2, zoom: 1.2, mirror: 3 };
  v3.clock = { mode: "manual", manualBpm: 137, latencyMs: -40 };
  v3.autopilot = {
    enabled: false,
    random: false,
    everyBars: 64,
    handBackBars: 48,
  };
  v3.options = { ...v3.options, bloom: 0.7, echo: 0.4, chroma: 0.2 };
  v3.midi = [{ type: "note", channel: 2, number: 40, target: "slot.17" }];
  const snapshot = v3.pages[0].slots[0].snapshot;
  v3.lineages = [
    {
      selectedId: "owner-root",
      nodes: [
        {
          id: "owner-root",
          parentId: null,
          name: snapshot.preset,
          scene: snapshot.scene,
          seed: snapshot.seed,
          params: { ...snapshot.params },
        },
      ],
    },
  ];
  const original = structuredClone(v3);
  const { set, report } = migrateV3(v3, scenes);
  assert.deepEqual(report, [], "v3 has no dropped fields");
  assert.equal(set.version, 4);
  assert.ok(set.pages.every((page) => page.mood === null));
  const roundTrip = parseShowSet(JSON.parse(JSON.stringify(set)), scenes).set;
  roundTrip.format = original.format;
  roundTrip.version = 3;
  for (const page of roundTrip.pages) {
    delete page.mood;
    for (const clip of page.slots) {
      if (!clip) continue;
      assert.equal(clip.palette, "custom");
      delete clip.palette;
      assert.equal(clip.transition, "auto");
      delete clip.transition;
    }
  }
  assert.deepEqual(roundTrip, original);
  assert.deepEqual(v3, original, "migration does not mutate the source");
  assert.deepEqual(parseShowSet(v3, scenes).set, set);
});

test("library IDs normalise colours; custom palettes retain their authored colours", () => {
  const set = initialShowSet(scenes);
  const clip = set.pages[0].slots[0];
  clip.palette = "ember";
  clip.snapshot.palette = {
    primary: "#123456",
    secondary: "#654321",
    accent: "#abcdef",
  };
  const custom = set.pages[0].slots[1];
  custom.palette = "custom";
  custom.snapshot.palette = { ...clip.snapshot.palette };
  const validated = validateShowSet(set, scenes);
  assert.deepEqual(
    validated.pages[0].slots[0].snapshot.palette,
    paletteById("ember").colors,
  );
  assert.deepEqual(
    validated.pages[0].slots[1].snapshot.palette,
    custom.snapshot.palette,
  );
  assert.notDeepEqual(
    clip.snapshot.palette,
    paletteById("ember").colors,
    "validation is non-mutating",
  );
  assert.equal(PALETTES.length, 24);
});

test("invalid values are rejected before anything is applied", () => {
  const base = initialShowSet(scenes);
  const bad = [
    (s) => (s.pages = s.pages.slice(1)),
    (s) => (s.pages[0].slots[0].energy = 2),
    (s) => (s.pages[0].slots[0].quantize = "phrase"),
    (s) => (s.pages[0].slots[1].id = s.pages[0].slots[0].id),
    (s) => (s.pages[0].slots[0].palette = "unknown"),
    (s) => (s.pages[0].mood = "unknown"),
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

test("parseShowSet routes v4 and v2 files to v4", () => {
  const v4 = validateShowSet(initialShowSet(scenes), scenes);
  assert.deepEqual(
    parseShowSet(JSON.parse(JSON.stringify(v4)), scenes).set,
    v4,
  );
  const v2 = JSON.parse(JSON.stringify(initialSession(scenes)));
  const migrated = parseShowSet(v2, scenes).set;
  assert.equal(migrated.format, "phosphor-set-v4");
  assert.ok(migrated.pages.every((page) => page.mood === null));
  assert.ok(
    migrated.pages
      .flatMap((page) => page.slots)
      .filter(Boolean)
      .every((clip) => clip.palette === "custom"),
  );
});
