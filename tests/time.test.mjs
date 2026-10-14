// Long-show time (docs/families/TIME.md): no hourly seams, precise phases.
import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import {
  HOUR,
  CLOCK_COUNT,
  advanceClocks,
  shaderSources,
  shaderVariant,
  usesLateVariant,
} from "../scene-time.mjs";
import { MORPH_PERIOD, MORPH_WAVES } from "../scene-attractor.mjs";

// What runs after the first hour: the PHOSPHOR_LATE variant where a scene
// has one, else its only sources.
const lateSources = (scene) =>
  shaderSources(scene)
    .map((source) => shaderVariant(source, usesLateVariant(scene)))
    .join("\n");

// A wrap of scene time is only seamless if every use of it is periodic.
// These are the audited exceptions; the long-show forms use raw u_time,
// use-specific periods or integrated clocks.
const PERIODIC_WRAPS = {
  // Morph waves have whole periods (13 and 19) in MORPH_PERIOD.
  attractor: [/mod\(u_time, 2400\.0\)/],
  // A 24 s gather/launch/return arc of simulation gains (integrated state).
  phase: [/mod\(u_time, 24\.0\)/],
  // Dust phase enters only sin(… ± phase).
  descent: [/mod\(u_time \* 0\.21, TAU\)/],
};

test("no long-show shader wraps u_time unless every use is periodic", () => {
  for (const scene of scenes) {
    const wraps = lateSources(scene).match(/mod\(\s*u_time[^;]*/g) ?? [];
    for (const wrap of wraps) {
      const allowed = (PERIODIC_WRAPS[scene.id] ?? []).some((pattern) =>
        pattern.test(wrap),
      );
      assert.ok(allowed, `${scene.id}: unaudited time wrap ${wrap}`);
    }
  }
});

test("the first-hour variant is the authored source without clocks", () => {
  for (const scene of scenes.filter(usesLateVariant))
    for (const source of shaderSources(scene)) {
      const early = shaderVariant(source, false);
      assert.doesNotMatch(early, /PHOSPHOR_LATE|u_clock/, scene.id);
      // Branches are balanced: both variants keep every other directive.
      const late = shaderVariant(source, true);
      for (const variant of [early, late])
        assert.equal(
          (variant.match(/^\s*#if/gm) ?? []).length,
          (variant.match(/^\s*#endif/gm) ?? []).length,
          scene.id,
        );
    }
});

test("shaderVariant keeps one branch and passes other directives", () => {
  const source = [
    "a;",
    "#ifdef PHOSPHOR_LATE",
    "late;",
    "#ifdef PRECOMPUTED",
    "cache;",
    "#endif",
    "#else",
    "early;",
    "#endif",
    "b;",
  ].join("\n");
  assert.equal(
    shaderVariant(source, true),
    "a;\nlate;\n#ifdef PRECOMPUTED\ncache;\n#endif\nb;",
  );
  assert.equal(shaderVariant(source, false), "a;\nearly;\nb;");
});

test("attractor morph waves complete whole periods in MORPH_PERIOD", () => {
  for (const waves of MORPH_WAVES) assert.ok(Number.isInteger(waves));
  assert.ok(Number.isInteger(MORPH_PERIOD));
});

test("scene clocks are declared, bounded and used by index", () => {
  for (const scene of scenes) {
    const used = [
      ...lateSources(scene).matchAll(/(?<!float )u_clock\[(\d+)\]/g),
    ].map((match) => Number(match[1]));
    const clocks = scene.clocks ?? [];
    assert.ok(clocks.length <= CLOCK_COUNT, `${scene.id}: too many clocks`);
    if (clocks.length) assert.ok(usesLateVariant(scene), scene.id);
    for (const [i, clock] of clocks.entries()) {
      assert.equal(typeof clock.rate, "function", `${scene.id} clock ${i}`);
      assert.ok(used.includes(i), `${scene.id}: clock ${i} unused`);
      if (clock.period !== undefined)
        assert.ok(clock.period > 0 && Number.isFinite(clock.period));
      // Rates are finite across the parameter ranges and energy.
      for (const p of [
        scene.schema.map((def) => def.max),
        scene.schema.map((def) => def.min),
      ])
        for (const level of [0, 1])
          assert.ok(Number.isFinite(clock.rate(p, level)), `${scene.id} ${i}`);
    }
    for (const i of used) assert.ok(i < clocks.length, `${scene.id} ${i}`);
  }
});

test("clocks continue the first-hour product without a seam", () => {
  const clocks = [
    { rate: (p) => p[0] },
    { rate: (p) => 0.05 + 0.6 * p[0], offset: 0.4, period: 2 * Math.PI },
    { rate: (p) => p[0] * 1.5, period: 1 },
  ];
  const state = {};
  const params = [0.73];
  const product = (i, time) => {
    const { rate, offset = 0, period } = clocks[i];
    const value = time * rate(params) + offset;
    return period ? value - period * Math.floor(value / period) : value;
  };
  // Ticks of 1/60 across the hour: values equal the product (mod period).
  let time = HOUR - 3;
  for (let tick = 0; tick < 360; tick++, time += 1 / 60) {
    const values = advanceClocks(state, clocks, time, params, 0.5);
    for (let i = 0; i < clocks.length; i++) {
      const expected = product(i, time);
      const period = clocks[i].period;
      let error = Math.abs(values[i] - expected);
      if (period) error = Math.min(error, period - error);
      assert.ok(error < 1e-9, `clock ${i} at ${time}: ${values[i]}`);
    }
  }
});

test("clocks integrate rate changes after the hour instead of jumping", () => {
  const clocks = [{ rate: (p) => p[0] }];
  const state = {};
  let time = HOUR + 10;
  advanceClocks(state, clocks, time, [1], 0.5);
  const before = state.values[0];
  // An energy glide doubles the rate: the phase moves by rate · dt only.
  time += 1 / 60;
  advanceClocks(state, clocks, time, [2], 0.5);
  assert.ok(Math.abs(state.values[0] - before - 2 / 60) < 1e-9);
  // A seek (time jump) re-anchors to the authored product.
  advanceClocks(state, clocks, 12 * HOUR, [2], 0.5);
  assert.equal(state.values[0], 12 * HOUR * 2);
  // Non-finite rates never reach the GPU.
  advanceClocks(state, [{ rate: () => NaN }], 12 * HOUR + 1 / 60, [], 0.5);
  assert.ok(Number.isFinite(state.values[0]));
});

test("periodic clocks stay small and exact for twelve hours", () => {
  const period = 40 * Math.PI;
  const clocks = [{ rate: () => 2.15, period }];
  const state = {};
  let time = HOUR - 1;
  for (; time < 12 * HOUR; time += 1 / 30)
    advanceClocks(state, clocks, time, [], 0);
  const value = state.values[0];
  assert.ok(value >= 0 && value < period);
  // Exact reference in double precision (12 h of 1/30 s steps).
  const expected = (state.time * 2.15) % period;
  const error = Math.min(
    Math.abs(value - expected),
    period - Math.abs(value - expected),
  );
  assert.ok(error < 1e-6, `${value} vs ${expected}`);
  // The float32 upload keeps sub-microradian resolution.
  assert.ok(Math.abs(Math.fround(value) - value) < 1e-5);
});

// The GPU seam check (scripts/check-time-wrap.mjs) needs the native GPU:
// PHOSPHOR_HEADLESS_RIG=1 PHOSPHOR_TIME_GPU=1 node --test tests/browser/time-wrap.test.mjs
