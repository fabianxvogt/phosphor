import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialSession } from "../session.mjs";
import { PALETTES, paletteById } from "../palettes.mjs";
import { catalogLooks, lookId } from "../catalog.mjs";
import {
  initialShowSet,
  validateShowSet,
  migrateV2,
  migrateV3,
  parseShowSet,
  freeClipId,
  PAGES,
  SLOTS,
  PIXEL_BUDGETS,
  AUTOPILOT_BARS,
  MIDI_TARGETS,
} from "../show-set.mjs";

const familiesOn = (page) =>
  new Set(page.slots.filter(Boolean).map((c) => c.snapshot.scene));
const looks = catalogLooks(scenes);

test("initial set: every authored look fills the pages types-first, all autopilot (D65)", () => {
  const set = validateShowSet(initialShowSet(scenes), scenes);
  assert.equal(set.pages.length, PAGES);
  assert.ok(set.pages.every((p) => p.slots.length === SLOTS));
  assert.deepEqual(
    set.pages.map((p) => p.name),
    Array.from({ length: PAGES }, (_, p) => `Page ${p + 1}`),
    "no Lab page",
  );
  const clips = set.pages.flatMap((p) => p.slots).filter(Boolean);
  assert.equal(clips.length, Math.min(looks.length, PAGES * SLOTS));
  assert.ok(clips.every((c) => c.autopilot));
  assert.equal(new Set(clips.map((c) => c.id)).size, clips.length);
  // Each authored look exactly once, filling slots in order (no gaps).
  assert.equal(
    new Set(clips.map((c) => lookId(c.snapshot))).size,
    clips.length,
  );
  const flat = set.pages.flatMap((p) => p.slots);
  assert.ok(flat.slice(0, clips.length).every(Boolean));
  // Page 1 starts with one look of every family, of their first type.
  assert.deepEqual(familiesOn(set.pages[0]), new Set(scenes.map((s) => s.id)));
  // Every family's types come before its repeats.
  for (const scene of scenes.filter((s) => s.type)) {
    const order = clips
      .filter((c) => c.snapshot.scene === scene.id)
      .map((c) => c.snapshot.params[scene.type.key]);
    const types = scene.type.values.filter((v) =>
      scene.presets.some((p) => p.params[scene.type.key] === v),
    );
    assert.deepEqual(
      new Set(order.slice(0, types.length)),
      new Set(types),
      scene.id,
    );
  }
  // Every page with clips mixes families.
  for (const page of set.pages.filter((p) => p.slots.some(Boolean)))
    assert.ok(familiesOn(page).size >= Math.min(4, scenes.length));
  assert.ok(set.autopilot.enabled && set.autopilot.random);
  assert.equal(set.autopilot.source, "catalog");
  assert.equal(set.options.pixelBudget, 8.3);
  assert.deepEqual(set.ratings, {});
  assert.equal(set.clock.manualBpm, 120);
  assert.equal(set.pages[0].mood, null);
  const paletteIds = set.pages[0].slots.filter(Boolean).map((c) => c.palette);
  assert.ok(new Set(paletteIds).size >= 12, "page 1 is visibly varied");
  for (const scene of scenes) {
    const own = clips.filter((c) => c.snapshot.scene === scene.id);
    assert.equal(
      new Set(own.map((c) => c.palette)).size,
      Math.min(own.length, PALETTES.length),
      `${scene.id} looks differ in colour`,
    );
  }
});

test("initial set takes the first 256 looks of a larger catalog; the rest stay in the catalog", () => {
  // Synthetic: 40 families × 8 looks = 320 looks.
  const many = Array.from({ length: 40 }, (_, f) => ({
    ...scenes[f % scenes.length],
    id: `family${f}`,
    name: `Family ${f}`,
    presets: Array.from({ length: 8 }, (_, i) => ({
      ...scenes[f % scenes.length].presets[
        i % scenes[f % scenes.length].presets.length
      ],
      name: `Look ${i}`,
    })),
  }));
  const set = initialShowSet(many);
  const clips = set.pages.flatMap((p) => p.slots);
  assert.equal(clips.length, PAGES * SLOTS);
  assert.ok(clips.every(Boolean));
  assert.ok(set.pages.every((p) => familiesOn(p).size >= 8));
  // Round-robin: every family has at least six looks on the pages.
  for (let f = 0; f < 40; f++)
    assert.ok(
      clips.filter((c) => c.snapshot.scene === `family${f}`).length >= 6,
    );
});

test("ratings round-trip; malformed entries are dropped without failing the set", () => {
  const set = initialShowSet(scenes);
  set.ratings = {
    "pulse:Square Tunnel": 9.5,
    "flight:Corkscrew": 0,
    "acid:Mycelial City": 10,
    "gone:Retired look": 4, // unknown looks are kept
    "pulse:Slow Gate": 3.3, // not a half step
    "pulse:Ring Dive": 11,
    "pulse:Shard Crown": -0.5,
    "pulse:Horizon Grid": "7",
    "pulse:Scanner Bars": null,
    nocolon: 5,
    ":leading": 5,
    [`x:${"y".repeat(250)}`]: 5,
  };
  const validated = validateShowSet(set, scenes);
  assert.deepEqual(validated.ratings, {
    "pulse:Square Tunnel": 9.5,
    "flight:Corkscrew": 0,
    "acid:Mycelial City": 10,
    "gone:Retired look": 4,
  });
  assert.deepEqual(
    parseShowSet(JSON.parse(JSON.stringify(validated)), scenes).set,
    validated,
  );
  for (const bad of [null, [], "x", 5]) {
    const copy = structuredClone(set);
    copy.ratings = bad;
    assert.deepEqual(validateShowSet(copy, scenes).ratings, {});
  }
});

test("older v4 sets without ratings or a source load losslessly with defaults", () => {
  const old = validateShowSet(initialShowSet(scenes), scenes);
  delete old.ratings;
  delete old.autopilot.source;
  old.options.pixelBudget = 1;
  const original = structuredClone(old);
  const { set, report } = parseShowSet(JSON.parse(JSON.stringify(old)), scenes);
  assert.deepEqual(report, []);
  assert.deepEqual(set.ratings, {});
  assert.equal(set.autopilot.source, "catalog");
  const rest = structuredClone(set);
  delete rest.ratings;
  delete rest.autopilot.source;
  assert.deepEqual(rest, original);
  assert.deepEqual(old, original, "defaulting does not mutate the source");
});

test("an older set's Lab page becomes Page 8 with autopilot on; its 2.1 MP default becomes native", () => {
  const old = validateShowSet(initialShowSet(scenes), scenes);
  delete old.ratings;
  const lab = old.pages[PAGES - 1];
  lab.name = "Lab";
  lab.slots = lab.slots.map((_, i) =>
    i < 3
      ? { ...old.pages[0].slots[i], id: `lab-${i}`, autopilot: false }
      : null,
  );
  old.pages[0].slots[5].autopilot = false; // other pages keep their flags
  old.options.pixelBudget = 2.1;
  const { set, report } = parseShowSet(JSON.parse(JSON.stringify(old)), scenes);
  assert.equal(set.pages[PAGES - 1].name, "Page 8");
  assert.deepEqual(
    set.pages[PAGES - 1].slots.slice(0, 3).map((c) => [c.id, c.autopilot]),
    [
      ["lab-0", true],
      ["lab-1", true],
      ["lab-2", true],
    ],
  );
  assert.equal(set.pages[0].slots[5].autopilot, false);
  assert.equal(set.options.pixelBudget, 8.3);
  assert.equal(report.length, 2);
  // Once saved with ratings, a deliberate "Lab" name and 2.1 MP are kept.
  const chosen = structuredClone(set);
  chosen.pages[PAGES - 1].name = "Lab";
  chosen.pages[PAGES - 1].slots[0].autopilot = false;
  chosen.options.pixelBudget = 2.1;
  const again = parseShowSet(JSON.parse(JSON.stringify(chosen)), scenes);
  assert.deepEqual(again.set, validateShowSet(chosen, scenes));
  assert.deepEqual(again.report, []);
  // A v3 file is pre-catalog too.
  const v3 = structuredClone(old);
  v3.format = "phosphor-set-v3";
  v3.version = 3;
  for (const page of v3.pages) {
    delete page.mood;
    for (const clip of page.slots) if (clip) delete clip.palette;
  }
  delete v3.autopilot.source;
  const migrated = parseShowSet(v3, scenes).set;
  assert.equal(migrated.pages[PAGES - 1].name, "Page 8");
  assert.equal(migrated.options.pixelBudget, 8.3);
});

test("autopilot bars, sources, pixel budgets and MIDI targets (D66, D67)", () => {
  assert.deepEqual(AUTOPILOT_BARS, [8, 12, 16, 32, 64]);
  assert.deepEqual(PIXEL_BUDGETS, [0.5, 1, 2.1, 8.3]);
  assert.ok(MIDI_TARGETS.includes("next"));
  for (const everyBars of AUTOPILOT_BARS)
    for (const source of ["catalog", "page"])
      for (const pixelBudget of PIXEL_BUDGETS) {
        const set = initialShowSet(scenes);
        Object.assign(set.autopilot, { everyBars, source });
        set.options.pixelBudget = pixelBudget;
        set.midi = [{ type: "note", channel: 0, number: 60, target: "next" }];
        assert.deepEqual(validateShowSet(set, scenes), set);
      }
  const bad = initialShowSet(scenes);
  bad.autopilot.source = "lab";
  assert.throws(() => validateShowSet(bad, scenes), /Autopilot source/);
});

test("free clip ids never collide with the set's clips", () => {
  const set = initialShowSet(scenes);
  const id = freeClipId(set);
  const ids = set.pages
    .flatMap((p) => p.slots)
    .filter(Boolean)
    .map((c) => c.id);
  assert.ok(!ids.includes(id));
  set.pages[7].slots[31] = { ...set.pages[0].slots[0], id };
  assert.notEqual(freeClipId(set), id);
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
  v3.options = {
    ...v3.options,
    pixelBudget: 1,
    bloom: 0.7,
    echo: 0.4,
    chroma: 0.2,
  };
  delete v3.ratings; // v3 predates the catalog
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
  assert.deepEqual(roundTrip.ratings, {});
  delete roundTrip.ratings;
  assert.equal(roundTrip.autopilot.source, "catalog");
  delete roundTrip.autopilot.source;
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
    (s) => (s.autopilot.everyBars = 24),
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
