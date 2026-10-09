import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialSession, presetSnapshot } from "../session.mjs";
import { PALETTES, paletteById } from "../palettes.mjs";
import { catalogLooks, sortCatalog } from "../catalog.mjs";
import {
  initialShowSet,
  validateShowSet,
  migrateV2,
  migrateV3,
  migrateV4,
  parseShowSet,
  freeLookId,
  clipFrom,
  defaultKeys,
  KEYS,
  PIXEL_BUDGETS,
  AUTOPILOT_BARS,
  MIDI_TARGETS,
} from "../show-set.mjs";

const looks = catalogLooks(scenes);
const json = (value) => JSON.parse(JSON.stringify(value));
const ownLook = (id = "own-1", from = looks[0]) => ({
  id,
  name: `${from.name} (mine)`,
  base: from.id,
  snapshot: structuredClone(from.snapshot),
  palette: null,
  transition: "auto",
});

// A v4 set as release D65–D67 saved it: eight pages of clips.
function v4Set(mutate) {
  let n = 0;
  const pages = Array.from({ length: 8 }, (_, p) => ({
    name: `Page ${p + 1}`,
    mood: null,
    slots: Array.from({ length: 32 }, () => {
      const look = looks[n % looks.length];
      return n++ < looks.length
        ? clipFrom(look.snapshot, {
            id: `clip-${n}`,
            name: look.name,
            palette: PALETTES[n % PALETTES.length].id,
          })
        : null;
    }),
  }));
  const set = {
    format: "phosphor-set-v4",
    version: 4,
    name: "Old show",
    pages,
    shared: { master: 0.8, hue: 0.1, zoom: 1, mirror: 2 },
    autopilot: {
      enabled: true,
      random: true,
      source: "page",
      everyBars: 32,
      handBackBars: 32,
    },
    clock: { mode: "manual", manualBpm: 126, latencyMs: 12 },
    options: {
      pixelBudget: 2.1,
      bloom: 0.2,
      echo: 0.1,
      chroma: 0,
      grain: 0.12,
      vignette: 0.15,
      autoRecovery: true,
      reducedMotion: false,
    },
    midi: [{ type: "note", channel: 0, number: 36, target: "slot.3" }],
    lineages: [],
    ratings: { "pulse:Square Tunnel": 8.5 },
  };
  mutate?.(set);
  return set;
}

test("a new set has no pages: an empty library and the catalog's first 32 looks on the keys (D68)", () => {
  const set = initialShowSet(scenes);
  assert.equal(set.format, "phosphor-set-v5");
  assert.equal(set.version, 5);
  assert.equal(set.pages, undefined);
  assert.deepEqual(set.looks, []);
  assert.deepEqual(set.ratings, {});
  assert.deepEqual(set.favorites, []);
  assert.equal(set.mood, null);
  assert.equal(set.keys.length, KEYS);
  assert.deepEqual(
    set.keys,
    sortCatalog(looks, {})
      .slice(0, KEYS)
      .map((look) => look.id),
  );
  assert.deepEqual(set.autopilot, {
    enabled: true,
    random: true,
    everyBars: 16,
    handBackBars: 32,
    favoritesOnly: false,
    minRating: 0,
  });
  assert.equal(set.options.pixelBudget, 8.3);
  assert.deepEqual(validateShowSet(json(set), scenes), set);
});

test("keys follow favourites and ratings when derived; short catalogs pad with null", () => {
  const set = initialShowSet(scenes);
  set.favorites = ["julia:Cubic Lace"];
  set.ratings = { "pulse:Square Tunnel": 9 };
  const keys = defaultKeys(scenes, set);
  assert.deepEqual(keys.slice(0, 2), [
    "julia:Cubic Lace",
    "pulse:Square Tunnel",
  ]);
  const one = [scenes.find((s) => s.id === "julia")];
  const few = defaultKeys(one);
  assert.equal(few.length, KEYS);
  assert.equal(few.filter(Boolean).length, one[0].presets.length);
  assert.ok(few.slice(one[0].presets.length).every((k) => k === null));
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
  assert.deepEqual(parseShowSet(json(validated), scenes).set, validated);
  for (const bad of [null, [], "x", 5]) {
    const copy = structuredClone(set);
    copy.ratings = bad;
    assert.deepEqual(validateShowSet(copy, scenes).ratings, {});
  }
});

test("favourites and keys are advisory: duplicates and malformed ids drop out", () => {
  const set = initialShowSet(scenes);
  set.looks = [ownLook("own-1")];
  set.favorites = [
    "julia:Cubic Lace",
    "julia:Cubic Lace",
    "own-1",
    "own-404", // an own look that does not exist
    42,
    "nocolon",
  ];
  set.keys = ["own-1", "own-404", null, 7, "julia:Cubic Lace"];
  const v = validateShowSet(set, scenes);
  assert.deepEqual(v.favorites, ["julia:Cubic Lace", "own-1"]);
  assert.equal(v.keys.length, KEYS);
  assert.deepEqual(v.keys.slice(0, 5), [
    "own-1",
    null,
    null,
    null,
    "julia:Cubic Lace",
  ]);
  for (const bad of [null, "x", {}]) {
    const copy = structuredClone(set);
    copy.favorites = bad;
    copy.keys = bad;
    const out = validateShowSet(copy, scenes);
    assert.deepEqual(out.favorites, []);
    assert.deepEqual(out.keys, Array(KEYS).fill(null));
  }
});

test("own looks validate their id, palette, transition and parameters", () => {
  const ok = initialShowSet(scenes);
  ok.looks = [
    ownLook("own-1"),
    { ...ownLook("own-a_b-2"), palette: "ember", transition: "melt" },
    {
      ...ownLook("own-3"),
      palette: "custom",
      snapshot: {
        ...ownLook().snapshot,
        palette: {
          primary: "#123456",
          secondary: "#654321",
          accent: "#abcdef",
        },
      },
    },
  ];
  const v = validateShowSet(ok, scenes);
  assert.deepEqual(v.looks, ok.looks);
  assert.equal(
    validateShowSet(
      { ...ok, looks: [{ ...ownLook(), transition: undefined }] },
      scenes,
    ).looks[0].transition,
    "auto",
  );
  const bad = [
    (s) => (s.looks[0].id = "julia:Cubic Lace"),
    (s) => (s.looks[0].id = "own-has space"),
    (s) => s.looks.push(ownLook("own-1")),
    (s) => (s.looks[0].palette = "unknown"),
    (s) => (s.looks[0].transition = "wipe"),
    (s) => (s.looks[0].name = ""),
    (s) => (s.looks[0].snapshot.scene = "gone"),
    (s) =>
      (s.looks[0].snapshot.params[Object.keys(s.looks[0].snapshot.params)[0]] =
        1e9),
    (s) => (s.looks = "x"),
  ];
  for (const mutate of bad) {
    const copy = structuredClone(ok);
    mutate(copy);
    assert.throws(() => validateShowSet(copy, scenes), mutate.toString());
  }
});

test("free own-look ids never collide", () => {
  const set = initialShowSet(scenes);
  assert.equal(freeLookId(set), "own-1");
  set.looks = [ownLook("own-1"), ownLook("own-3")];
  const id = freeLookId(set);
  assert.ok(!["own-1", "own-3"].includes(id));
  assert.match(id, /^own-\d+$/);
});

test("autopilot bars, minimum ratings, pixel budgets and MIDI targets (D66–D68)", () => {
  assert.deepEqual(AUTOPILOT_BARS, [8, 12, 16, 32, 64]);
  assert.deepEqual(PIXEL_BUDGETS, [0.5, 1, 2.1, 8.3]);
  assert.ok(MIDI_TARGETS.includes("next"));
  assert.ok(MIDI_TARGETS.includes("slot.31"));
  for (const everyBars of AUTOPILOT_BARS)
    for (const pixelBudget of PIXEL_BUDGETS) {
      const set = initialShowSet(scenes);
      Object.assign(set.autopilot, {
        everyBars,
        favoritesOnly: true,
        minRating: 6.5,
      });
      set.options.pixelBudget = pixelBudget;
      set.midi = [{ type: "note", channel: 0, number: 60, target: "next" }];
      assert.deepEqual(validateShowSet(set, scenes), set);
    }
  const odd = initialShowSet(scenes);
  odd.autopilot.minRating = 3.3;
  odd.autopilot.favoritesOnly = "yes";
  const v = validateShowSet(odd, scenes);
  assert.equal(v.autopilot.minRating, 0);
  assert.equal(v.autopilot.favoritesOnly, false);
});

test("older v5 sets default grain/vignette without changing any existing field", () => {
  const old = initialShowSet(scenes);
  delete old.options.grain;
  delete old.options.vignette;
  old.options.bloom = 0.73;
  const original = structuredClone(old);
  const { set, report } = parseShowSet(json(old), scenes);
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
    assert.deepEqual(parseShowSet(json(set), scenes).set, set);
  }
  for (const key of ["grain", "vignette"]) {
    for (const value of [-0.01, 1.01, NaN, Infinity, "0.2", null]) {
      const set = initialShowSet(scenes);
      set.options[key] = value;
      assert.throws(() => validateShowSet(set, scenes), new RegExp(key, "i"));
    }
  }
});

test("invalid values are rejected before anything is applied", () => {
  const base = initialShowSet(scenes);
  const bad = [
    (s) => (s.version = 4),
    (s) => (s.format = "phosphor-set-v4"),
    (s) => (s.mood = "unknown"),
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

test("v4 → v5: pages go; authored clips are catalog looks, edited ones become own looks (D68)", () => {
  const old = v4Set((set) => {
    // An edited clip: different params, a custom palette and a transition.
    const edited = set.pages[0].slots[2];
    const scene = scenes.find((s) => s.id === edited.snapshot.scene);
    const key = scene.schema.find((f) => f.step < 1).key;
    const field = scene.schema.find((f) => f.key === key);
    edited.snapshot.params[key] =
      edited.snapshot.params[key] === field.max ? field.min : field.max;
    edited.name = "My tweak";
    edited.palette = "custom";
    edited.transition = "melt";
    // A reseeded duplicate, and a clip of a look that no longer exists.
    set.pages[3].slots[31] = {
      ...structuredClone(set.pages[0].slots[0]),
      id: "page4/dup",
    };
    set.pages[3].slots[31].snapshot.seed += 1;
    set.pages[3].slots[30] = {
      ...structuredClone(set.pages[0].slots[1]),
      id: "renamed",
    };
    set.pages[3].slots[30].snapshot.preset = "Retired look";
    set.pages[0].mood = "cold";
  });
  const original = structuredClone(old);
  const { set, report } = migrateV4(old, scenes);
  assert.deepEqual(old, original, "migration does not mutate the source");
  assert.equal(set.format, "phosphor-set-v5");
  assert.equal(set.pages, undefined);
  assert.deepEqual(
    set.looks.map((look) => [look.id, look.name, look.base]),
    [
      [
        "own-clip-3",
        "My tweak",
        old.pages[0].slots[2].snapshot.scene +
          ":" +
          old.pages[0].slots[2].snapshot.preset,
      ],
      ["own-renamed", old.pages[0].slots[1].name, null],
      ["own-page4_dup", old.pages[0].slots[0].name, looks[0].id],
    ],
  );
  const tweak = set.looks[0];
  assert.equal(tweak.palette, "custom");
  assert.equal(tweak.transition, "melt");
  assert.deepEqual(tweak.snapshot, old.pages[0].slots[2].snapshot);
  assert.deepEqual(set.ratings, old.ratings);
  assert.equal(set.mood, "cold");
  assert.equal(set.options.pixelBudget, 8.3, "old default 2.1 MP → native");
  assert.deepEqual(set.shared, old.shared);
  assert.deepEqual(set.clock, old.clock);
  assert.deepEqual(set.midi, old.midi);
  assert.equal(set.autopilot.everyBars, 32);
  assert.equal(set.autopilot.source, undefined);
  assert.equal(set.keys.length, KEYS);
  assert.ok(report.some((line) => /3 edited clip/.test(line)));
  assert.ok(report.some((line) => /Pages are gone/.test(line)));
  assert.ok(report.some((line) => /native/.test(line)));
  assert.deepEqual(parseShowSet(json(original), scenes).set, set);
  assert.deepEqual(parseShowSet(json(set), scenes).set, set, "v5 round-trips");
});

test("v4 → v5 keeps a chosen budget and labels unsafe clip ids", () => {
  const { set } = migrateV4(
    v4Set((s) => {
      s.options.pixelBudget = 1;
      s.pages[1].slots[0] = {
        ...structuredClone(s.pages[0].slots[0]),
        id: "ünïcode id!",
        name: "Odd",
      };
      s.pages[1].slots[0].snapshot.seed = 99;
    }),
    scenes,
  );
  assert.equal(set.options.pixelBudget, 1);
  assert.match(set.looks[0].id, /^own-[A-Za-z0-9_-]+$/);
});

test("v3 migrates through v4 to v5, keeping hand-set colours as own looks", () => {
  const v3 = v4Set();
  v3.format = "phosphor-set-v3";
  v3.version = 3;
  delete v3.ratings;
  delete v3.autopilot.source;
  for (const page of v3.pages) {
    delete page.mood;
    for (const clip of page.slots) {
      if (!clip) continue;
      delete clip.palette;
      delete clip.transition;
    }
  }
  const hand = v3.pages[0].slots[4];
  hand.snapshot.seed = 4242;
  hand.snapshot.palette = {
    primary: "#aB1234",
    secondary: "#456789",
    accent: "#fedCbA",
  };
  const original = structuredClone(v3);
  const { set } = migrateV3(v3, scenes);
  assert.deepEqual(v3, original, "migration does not mutate the source");
  assert.equal(set.version, 5);
  assert.equal(set.looks.length, 1);
  assert.equal(set.looks[0].palette, "custom");
  assert.deepEqual(set.looks[0].snapshot.palette, hand.snapshot.palette);
  assert.deepEqual(parseShowSet(v3, scenes).set, set);
});

test("library palettes never reinterpret a custom own look's colours", () => {
  const set = initialShowSet(scenes);
  const colors = {
    primary: "#123456",
    secondary: "#654321",
    accent: "#abcdef",
  };
  set.looks = [
    {
      ...ownLook("own-1"),
      palette: "custom",
      snapshot: { ...ownLook().snapshot, palette: colors },
    },
  ];
  assert.deepEqual(
    validateShowSet(set, scenes).looks[0].snapshot.palette,
    colors,
  );
  assert.equal(PALETTES.length, 24);
  assert.ok(paletteById("ember"));
});

test("v2 score migrates cues to own looks or catalog looks and reports what is dropped", () => {
  const v2 = initialSession(scenes);
  v2.cues[0].keyframes.push({ beat: 8, snapshot: v2.cues[0].snapshot });
  v2.midi.push(
    { type: "cc", channel: 0, number: 7, target: "brightness" },
    { type: "note", channel: 0, number: 36, target: "go" },
  );
  const { set, report } = migrateV2(v2, scenes);
  assert.equal(set.version, 5);
  // Every cue is either an authored look in the catalog or an own look.
  const authored = new Set(looks.map((look) => look.id));
  for (const cue of v2.cues) {
    const id = `${cue.snapshot.scene}:${cue.snapshot.preset}`;
    const own = set.looks.find(
      (look) =>
        look.snapshot.scene === cue.snapshot.scene &&
        look.snapshot.seed === cue.snapshot.seed &&
        look.name === cue.name,
    );
    assert.ok(authored.has(id) || own, cue.name);
  }
  assert.deepEqual(set.midi, [
    { type: "cc", channel: 0, number: 7, target: "master" },
  ]);
  assert.ok(report.some((line) => /Keyframes dropped/.test(line)));
  assert.ok(report.some((line) => /audio routing/.test(line)));
  assert.ok(report.some((line) => /"go" dropped/.test(line)));
});

test("parseShowSet routes v5, v4, v3 and v2 files to v5", () => {
  const v5 = validateShowSet(initialShowSet(scenes), scenes);
  assert.deepEqual(parseShowSet(json(v5), scenes).set, v5);
  assert.equal(parseShowSet(json(v4Set()), scenes).set.version, 5);
  const v2 = json(initialSession(scenes));
  assert.equal(parseShowSet(v2, scenes).set.format, "phosphor-set-v5");
  assert.throws(() => parseShowSet({ format: "nope" }, scenes));
  assert.ok(presetSnapshot);
});
