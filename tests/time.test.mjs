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
  clocksPure,
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

test("authored variants have no clocks; both variants are balanced", () => {
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
          for (const fn of [clock.rate, clock.perBeat ?? (() => 0)])
            assert.ok(Number.isFinite(fn(p, level)), `${scene.id} ${i}`);
    }
    for (const i of used) assert.ok(i < clocks.length, `${scene.id} ${i}`);
  }
});

const f32 = Math.fround;
const circular = (a, b, period) => {
  const d = Math.abs(a - b) % period;
  return Math.min(d, period - d);
};

test("constant-rate clocks are the authored product and stay pure", () => {
  const clocks = [
    { rate: (p) => p[0] },
    { rate: (p) => p[0], offset: 0.4, period: 2 * Math.PI },
    { rate: (p) => p[0] * 1.5, period: 1 },
  ];
  const state = {};
  const params = [f32(0.73)];
  let time = 0;
  for (let tick = 0; tick <= 12 * HOUR * 60; tick += 997, time = tick / 60) {
    const values = advanceClocks(state, clocks, time, params, 0.5);
    for (const [i, clock] of clocks.entries()) {
      const exact = time * clock.rate(params) + (clock.offset ?? 0);
      const error = clock.period
        ? circular(values[i], exact, clock.period)
        : Math.abs(values[i] - exact) / Math.max(1, exact);
      assert.ok(
        error < 1e-6,
        `clock ${i} at ${time}: ${values[i]} vs ${exact}`,
      );
    }
  }
  // Ticks of 997/60 s exceed the seek limit, so each re-anchored; step now.
  for (let i = 0; i < 120; i++)
    advanceClocks(state, clocks, (time += 1 / 60), params, 0.5);
  assert.equal(clocksPure(state), true);
  advanceClocks(state, clocks, (time += 1 / 60), [f32(0.74)], 0.5);
  assert.equal(clocksPure(state), false);
  advanceClocks(state, clocks, 100, [f32(0.74)], 0.5);
  assert.equal(clocksPure(state), true, "a seek re-anchors");
});

test("a rate step changes the clock's speed, never its phase", () => {
  for (const at of [100, 2 * HOUR, 12 * HOUR]) {
    const clocks = [{ rate: (p) => p[0] }];
    const state = {};
    let time = at - 1;
    advanceClocks(state, clocks, time, [0.2], 0.5);
    for (let tick = 0; tick < 60; tick++)
      advanceClocks(state, clocks, (time += 1 / 60), [0.2], 0.5);
    const before = state.upload[0];
    // Energy 0.1 → 0.9 in one tick: the rate jumps from .2 to 1.8. The
    // phase is continuous at the change and then advances at the new rate.
    advanceClocks(state, clocks, (time += 1 / 60), [1.8], 0.5);
    const atChange = state.upload[0];
    advanceClocks(state, clocks, (time += 1 / 60), [1.8], 0.5);
    const steps = [atChange - before, state.upload[0] - atChange];
    assert.ok(Math.abs(steps[0] - 0.2 / 60) < 2e-3, `at ${at} s: ${steps}`);
    assert.ok(Math.abs(steps[1] - 1.8 / 60) < 2e-3, `at ${at} s: ${steps}`);
    // The authored product would have jumped by t · Δrate.
    assert.ok(time * 1.6 > 100);
  }
});

test("seeks re-anchor, beat jumps hold, beats integrate", () => {
  const clocks = [{ rate: (p) => p[0] * 0.5, perBeat: (p) => p[1] * 0.25 }];
  const state = {};
  advanceClocks(state, clocks, 10, [1, 1], 0.5, 20);
  assert.equal(state.upload[0], f32(10 * 0.5 + 20 * 0.25));
  advanceClocks(state, clocks, 10 + 1 / 60, [1, 1], 0.5, 20.05);
  const held = state.upload[0];
  assert.ok(Math.abs(held - (5 + 5 + 0.5 / 60 + 0.0125)) < 1e-4);
  // A beat resync (the clock jumps back) keeps the phase continuous.
  advanceClocks(state, clocks, 10 + 2 / 60, [1, 1], 0.5, 3);
  assert.ok(Math.abs(state.upload[0] - held - 0.5 / 60) < 1e-4);
  // A time seek re-anchors to the authored product.
  advanceClocks(state, clocks, 12 * HOUR, [2, 0], 0.5, 3);
  assert.equal(state.upload[0], f32(12 * HOUR * 1));
  // Non-finite rates never reach the GPU.
  advanceClocks(state, [{ rate: () => NaN }], 12 * HOUR + 1 / 60, [], 0.5);
  assert.ok(Number.isFinite(state.upload[0]));
});

test("periodic clocks stay small and exact for twelve hours", () => {
  const period = 40 * Math.PI;
  const clocks = [{ rate: (p) => p[0], period }];
  const state = {};
  let time = 0,
    exact = 0,
    previous = 0;
  // Speed changes every minute, as an energy curve would.
  for (let tick = 0; time < 12 * HOUR; tick++, time += 1 / 30) {
    const rate = 1 + 0.5 * Math.sin(Math.floor(tick / 1800));
    if (tick) exact += previous * (1 / 30);
    previous = rate;
    advanceClocks(state, clocks, time, [rate], 0);
  }
  const value = state.upload[0];
  assert.ok(value >= 0 && value < period);
  assert.ok(
    circular(value, exact, period) < 1e-3,
    `${value} vs ${exact % period}`,
  );
});

// The GPU seam check (scripts/check-time-wrap.mjs) needs the native GPU:
// PHOSPHOR_HEADLESS_RIG=1 PHOSPHOR_TIME_GPU=1 node --test tests/browser/time-wrap.test.mjs
