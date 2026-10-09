import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { paletteById } from "../palettes.mjs";
import {
  catalogLooks,
  sortCatalog,
  ratingOf,
  pickWeighted,
  weightedChoice,
  variantLabel,
  lookId,
  lookPalette,
  catalogClip,
  validRating,
  UNRATED_WEIGHT,
} from "../catalog.mjs";

const looks = catalogLooks(scenes);

test("the catalog holds every authored look of every family, data-driven from scenes", () => {
  const total = scenes.reduce((n, scene) => n + scene.presets.length, 0);
  assert.equal(looks.length, total);
  assert.equal(new Set(looks.map((look) => look.id)).size, total);
  scenes.forEach((scene, s) =>
    scene.presets.forEach((preset, index) => {
      const look = looks.find((l) => l.id === `${scene.id}:${preset.name}`);
      assert.ok(look, `${scene.id}:${preset.name}`);
      assert.equal(look.sceneId, scene.id);
      assert.equal(look.family, scene.name);
      assert.equal(look.number, scene.number ?? s + 1);
      assert.equal(look.index, index);
      assert.equal(look.name, preset.name);
      assert.deepEqual(look.snapshot, presetSnapshot(scene, index));
    }),
  );
  assert.equal(
    lookId(presetSnapshot(scenes[2], 3)),
    looks.find((l) => l.sceneId === scenes[2].id && l.index === 3).id,
  );
});

test("variants come from the type parameter's label, else its head and value", () => {
  const pulse = {
    key: "form",
    label: "Form · bars / tunnel / grid / shards",
    min: 0,
    max: 3,
  };
  const scene = (field, values) => ({
    schema: [field],
    type: { key: field.key, values },
  });
  assert.equal(variantLabel(scene(pulse, [0, 1, 2, 3]), { form: 1 }), "tunnel");
  assert.equal(
    variantLabel(
      scene(
        {
          key: "g",
          label: "Geometry: halo / portal / weave / procession",
          min: 0,
          max: 3,
          step: 0.01,
        },
        [0, 1, 2, 3],
      ),
      { g: 3 },
    ),
    "procession",
  );
  // A dot-separated list without slashes (Magnetic).
  assert.equal(
    variantLabel(
      scene(
        { key: "flow", label: "Torus · Vortices · Silk", min: 0, max: 2 },
        [0, 1, 2],
      ),
      { flow: 2 },
    ),
    "Silk",
  );
  // The list covers the whole range; values index from the minimum (Phase).
  assert.equal(
    variantLabel(
      scene(
        {
          key: "arc",
          label: "Arc: manual / gather / launch / return",
          min: 0,
          max: 3,
        },
        [1, 2, 3],
      ),
      { arc: 1 },
    ),
    "gather",
  );
  // No list in the label: the label head and the value.
  assert.equal(
    variantLabel(
      scene(
        { key: "composition", label: "Composition · 0–2", min: 0, max: 2 },
        [0, 1, 2],
      ),
      { composition: 2 },
    ),
    "Composition 2",
  );
  assert.equal(
    variantLabel(
      scene(
        { key: "planting", label: "Planting density", min: 3, max: 12 },
        [3, 6, 9, 12],
      ),
      { planting: 9 },
    ),
    "Planting density 9",
  );
  assert.equal(variantLabel({ schema: [] }, {}), null);
  // Every real look has a non-empty variant.
  for (const look of looks)
    assert.ok(look.variant === null || look.variant.length > 0, look.id);
  assert.equal(
    looks.find((l) => l.id === "pulse:Square Tunnel").variant,
    "tunnel",
  );
});

test("ratings sort first by rating, then unrated, then never (0); ties by family number and preset index", () => {
  const sample = [
    { id: "b:1", number: 2, index: 1 },
    { id: "a:0", number: 1, index: 0 },
    { id: "a:1", number: 1, index: 1 },
    { id: "b:0", number: 2, index: 0 },
    { id: "c:0", number: 3, index: 0 },
    { id: "c:1", number: 3, index: 1 },
  ];
  const ratings = { "b:1": 7.5, "c:1": 7.5, "a:1": 0, "c:0": 10 };
  assert.deepEqual(
    sortCatalog(sample, ratings).map((l) => l.id),
    ["c:0", "b:1", "c:1", "a:0", "b:0", "a:1"],
  );
  assert.deepEqual(
    sample.map((l) => l.id)[0],
    "b:1",
    "sorting does not mutate",
  );
  assert.deepEqual(
    sortCatalog(looks, {}).map((l) => l.id),
    [...looks]
      .sort((x, y) => x.number - y.number || x.index - y.index)
      .map((l) => l.id),
  );
});

test("ratingOf reads valid ratings and treats everything else as unrated", () => {
  assert.equal(ratingOf({ x: 4.5 }, "x"), 4.5);
  assert.equal(ratingOf({ x: 0 }, "x"), 0);
  assert.equal(ratingOf({}, "x"), null);
  assert.equal(ratingOf(undefined, "x"), null);
  assert.equal(ratingOf({ x: 3.3 }, "x"), null);
  assert.equal(ratingOf({ x: "5" }, "x"), null);
  assert.equal(ratingOf(Object.create({ x: 5 }), "x"), null, "own keys only");
  for (const value of [0, 0.5, 5, 9.5, 10])
    assert.equal(validRating(value), true);
  for (const value of [-0.5, 10.5, 0.25, NaN, Infinity, null, "1"])
    assert.equal(validRating(value), false);
});

test("weighted picks follow ratings, count unrated as 5 and never pick a zero", () => {
  const sample = [
    { id: "ten" },
    { id: "unrated" },
    { id: "one" },
    { id: "never" },
  ];
  const ratings = { ten: 10, one: 1, never: 0 };
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const counts = { ten: 0, unrated: 0, one: 0, never: 0 };
  for (let i = 0; i < 16000; i++)
    counts[pickWeighted(sample, ratings, random).id]++;
  assert.equal(counts.never, 0);
  assert.ok(
    Math.abs(counts.ten / 16000 - 10 / 16) < 0.02,
    JSON.stringify(counts),
  );
  assert.ok(Math.abs(counts.unrated / 16000 - UNRATED_WEIGHT / 16) < 0.02);
  assert.ok(Math.abs(counts.one / 16000 - 1 / 16) < 0.01);
  // Exclusions are honoured while something else can play…
  for (let i = 0; i < 200; i++)
    assert.notEqual(
      pickWeighted(sample, ratings, random, new Set(["ten", "unrated"])).id,
      "ten",
    );
  // …and ignored rather than failing when everything playable is excluded.
  assert.ok(
    ["ten", "unrated", "one"].includes(
      pickWeighted(sample, ratings, random, new Set(["ten", "unrated", "one"]))
        .id,
    ),
  );
  assert.equal(pickWeighted([{ id: "never" }], ratings, random), null);
  assert.equal(pickWeighted([], ratings, random), null);
  assert.equal(
    weightedChoice([], () => 1, random),
    null,
  );
  assert.equal(
    weightedChoice([{ w: 0 }], (x) => x.w, random),
    null,
  );
  // A random value of exactly 1 − ε stays inside the list.
  assert.equal(
    weightedChoice(
      [{ w: 1 }, { w: 1 }],
      (x) => x.w,
      () => 0.9999999,
    ).w,
    1,
  );
});

test("catalog clips carry the look id, its name and a stable library palette", () => {
  const look = looks.find((l) => l.id === "flight:Corkscrew");
  const clip = catalogClip(look);
  assert.equal(clip.id, look.id);
  assert.equal(clip.name, "Corkscrew");
  assert.equal(clip.palette, lookPalette(look));
  assert.ok(paletteById(clip.palette));
  assert.deepEqual(clip.snapshot.palette, paletteById(clip.palette).colors);
  assert.deepEqual(clip.snapshot.params, look.snapshot.params);
  assert.equal(clip.autopilot, true);
  assert.equal(clip.transition, "auto");
  assert.equal(
    lookPalette(look),
    lookPalette({ ...look, number: 99 }),
    "palette depends on the id only",
  );
  assert.ok(
    new Set(looks.map(lookPalette)).size >= 20,
    "thumbnails are varied",
  );
});
