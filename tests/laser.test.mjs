import test from "node:test";
import assert from "node:assert/strict";
import laser from "../scene-laser.mjs";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { catalogLooks } from "../catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { advanceClocks } from "../scene-time.mjs";

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const add = (a, b) => a.map((x, i) => x + b[i]);
const mul = (a, s) => a.map((x) => x * s);
const sub = (a, b) => add(a, mul(b, -1));
const norm = (a) => mul(a, 1 / Math.hypot(...a));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// Exact CPU mirror of lgErf / lgBeam. The numeric oracle below does NOT
// complete the square: it samples the original 3D density and transmittance.
function erf(x) {
  const a = Math.abs(x),
    t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-a * a);
  return Math.sign(x) * y;
}
function interval(ro, rd, a, b, limit) {
  const length = Math.hypot(...sub(b, a)),
    d = norm(sub(b, a));
  const c = dot(rd, d),
    axial = dot(sub(ro, a), d);
  let lo = 0,
    hi = limit;
  if (Math.abs(c) < 1e-5) {
    if (axial < 0 || axial > length) return null;
  } else {
    const t0 = -axial / c,
      t1 = (length - axial) / c;
    lo = Math.max(lo, Math.min(t0, t1));
    hi = Math.min(hi, Math.max(t0, t1));
  }
  return hi > lo ? { lo, hi, d, c, length } : null;
}
function beam(ro, rd, a, b, width, limit, sigma, reject = true) {
  const span = interval(ro, rd, a, b, limit);
  if (!span) return 0;
  const { lo, hi, d, c, length } = span;
  const p = sub(ro, mul(add(a, b), 0.5)),
    z = dot(p, d),
    ell = length * 0.38;
  const q = sub(p, mul(d, z)),
    v = sub(rd, mul(d, c));
  const iw = 1 / (width * width),
    il = 1 / (ell * ell);
  const A = 0.5 * (dot(v, v) * iw + c * c * il),
    B = dot(q, v) * iw + z * c * il;
  const tc = -B / (2 * A),
    nearT = clamp(tc, lo, hi),
    nearQ = add(q, mul(v, nearT)),
    nearZ = z + c * nearT;
  if (reject && 0.5 * (dot(nearQ, nearQ) * iw + nearZ * nearZ * il) > 18)
    return 0;
  const qc = add(q, mul(v, tc)),
    zc = z + c * tc;
  const C = 0.5 * (dot(qc, qc) * iw + zc * zc * il),
    root = Math.sqrt(A),
    shift = tc - sigma / (2 * A);
  const exponent = -C - sigma * tc + (sigma * sigma) / (4 * A);
  return (
    ((Math.exp(exponent) * 0.886226925) / root) *
    (erf(root * (hi - shift)) - erf(root * (lo - shift)))
  );
}
function numeric(ro, rd, a, b, width, limit, sigma) {
  const span = interval(ro, rd, a, b, limit);
  if (!span) return 0;
  const { lo, hi, d, length } = span,
    center = mul(add(a, b), 0.5),
    ell = length * 0.38;
  const sample = (t) => {
    const p = sub(add(ro, mul(rd, t)), center),
      z = dot(p, d),
      q = sub(p, mul(d, z));
    return Math.exp(
      -0.5 * (dot(q, q) / (width * width) + (z * z) / (ell * ell)) - sigma * t,
    );
  };
  // Composite Simpson, enough samples for even the narrowest perpendicular tube.
  const n = 24000,
    h = (hi - lo) / n;
  let sum = sample(lo) + sample(hi);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * sample(lo + h * i);
  return (sum * h) / 3;
}

test("source pins the exact Gaussian/Beer integral, with no volume march", () => {
  for (const source of [
    "float A = 0.5 * (dot(v, v) * iw + c * c * il);",
    "float B = dot(q, v) * iw + z * c * il;",
    "float tc = -B / (2.0 * A);",
    "float root = sqrt(A), shift = tc - sigma / (2.0 * A);",
    "float exponent = -C - sigma * tc + sigma * sigma / (4.0 * A);",
    "return exp(exponent) * 0.886226925 / root * coverage;",
    "float coverage = sheath ? lgSheathErf(x1) - lgSheathErf(x0) : lgErf(x1) - lgErf(x0);",
    "float ell = len * 0.38;",
    "float c = dot(rd, d), axial = z + len * 0.5;",
    "return vec4(p - z * d, z);", 
    "if (0.5 * (dot(nearQ, nearQ) * iw + nearZ * nearZ * il) > 18.0) return 0.0;",
  ])
    assert.ok(laser.fragment.includes(source), source);
  assert.doesNotMatch(
    laser.fragment,
    /u_raySteps|texture\(|raymarch|for\s*\([^;]*step/,
  );
});

test("erf approximation is odd, monotone and agrees with its numeric definition", () => {
  const numericErf = (x) => {
    const n = 4000,
      h = x / n;
    let sum = 1 + Math.exp(-x * x);
    for (let i = 1; i < n; i++)
      sum += (i % 2 ? 4 : 2) * Math.exp(-((i * h) ** 2));
    return ((2 / Math.sqrt(Math.PI)) * h * sum) / 3;
  };
  for (let x = 0; x <= 6; x += 0.05) {
    assert.ok(Math.abs(erf(x) - numericErf(x)) < 1.5e-7, `x=${x}`);
    assert.ok(erf(x) >= erf(x - 0.001));
    assert.ok(Math.abs(erf(-x) + erf(x)) < 1e-15);
  }
});

test("closed form agrees with independent numeric single scattering, including parallel rays", () => {
  const a = [0, 2, 45],
    b = [0, 2, -15],
    ro = [0, 2, -8];
  for (const angle of [
    0,
    1e-7,
    1e-5,
    0.002,
    0.05,
    0.5,
    1.3,
    Math.PI / 2,
    Math.PI,
  ])
    for (const width of [0.022, 0.1, 0.4])
      for (const sigma of [0, 0.021]) {
        const rd = norm([Math.sin(angle), 0, Math.cos(angle)]);
        const expected = numeric(ro, rd, a, b, width, 120, sigma),
          actual = beam(ro, rd, a, b, width, 120, sigma);
        assert.ok(Number.isFinite(actual) && actual >= -1e-10);
        assert.ok(
          Math.abs(actual - expected) < 1e-5 + 3e-6 * expected,
          `${angle}, ${width}, ${sigma}: ${actual} vs ${expected}`,
        );
      }
  for (const limit of [0, 1, 7, 23, 80, 120]) {
    const ro = [-2, 2.1, -9],
      rd = norm([0.05, 0.002, 1]);
    assert.ok(
      Math.abs(
        beam(ro, rd, a, b, 0.4, limit, 0.021) -
          numeric(ro, rd, a, b, 0.4, limit, 0.021),
      ) < 1e-5,
    );
  }
});

test("integral is continuous at parallel alignment, endpoint planes and conservative rejection", () => {
  const a = [0, 0, -10],
    b = [0, 0, 50];
  const evaluate = (x, z, angle) =>
    beam(
      [x, 0, z],
      norm([Math.sin(angle), 0, Math.cos(angle)]),
      a,
      b,
      0.2,
      120,
      0.021,
    );
  for (const z of [-10.00001, -10, -9.99999, 20, 49.99999, 50, 50.00001])
    for (const angle of [-1e-5, -1e-7, 0, 1e-7, 1e-5]) {
      const v = evaluate(0.03, z, angle);
      assert.ok(Number.isFinite(v));
      assert.ok(Math.abs(v - evaluate(0.03, z, angle + 1e-8)) < 0.001);
    }
  // Rejection only discards < 6 sigma tails, bounded by limit * exp(-18).
  for (const x of [1.19, 1.2, 1.21, 2]) {
    const ro = [x, 0, -8],
      rd = [0, 0, 1];
    assert.ok(
      Math.abs(
        beam(ro, rd, a, b, 0.2, 120, 0.021) -
          beam(ro, rd, a, b, 0.2, 120, 0.021, false),
      ) <
        120 * Math.exp(-18),
    );
  }
});

// Mirror the exact material hinges and tower transform, varying only a
// fixed seed-derived identity value h. Neither identity nor the bay changes.
function tower(i, identity, dev, height = 1.3) {
  const rise = smooth(0, 1, dev),
    fold = smooth(1, 2, dev),
    theta = (fold * Math.PI) / 2;
  const side = i % 2 ? 1 : -1,
    bay = Math.floor(i / 2),
    u = 2.4 + 5 * (bay % 2);
  const tx = [side * Math.cos(theta), Math.sin(theta), 0],
    ty = [-side * Math.sin(theta), Math.cos(theta), 0];
  const h = (4.5 + 8.5 * identity) * height * rise * mix(1, 0.16, fold);
  const base = [side * 9, 0, 5 + bay * 5.3];
  return { id: [side, bay, identity], base: add(base, mul(tx, u)), tx, ty, h };
}
function materialPoint(side, u, dev) {
  const fold = smooth(1, 2, dev),
    theta = (fold * Math.PI) / 2;
  if (u <= 11)
    return [side * (9 + u * Math.cos(theta)), u * Math.sin(theta), 0];
  const angle = fold * (Math.PI - 0.42);
  return [
    side * (9 + 11 * Math.cos(theta) + (u - 11) * Math.cos(angle)),
    11 * Math.sin(theta) + (u - 11) * Math.sin(angle),
    0,
  ];
}
test("hinges are joined, isometric, reversible and retain material/tower identity", () => {
  assert.match(
    laser.fragment,
    /lgStrip\(roofBase, vec3\(side \* cos\(roofAngle\),sin\(roofAngle\),0\), 9\.85665208/,
  );
  assert.match(
    laser.fragment,
    /float h = \(4\.5 \+ 8\.5 \* lgHash\(fi \+ 7\.0\)\)/,
  );
  const identity = Array.from({ length: 32 }, (_, i) => (i * 0.173) % 1);
  for (let dev = 0; dev <= 2; dev += 0.005) {
    for (const side of [-1, 1]) {
      const before = materialPoint(side, 11 - 1e-6, dev),
        after = materialPoint(side, 11 + 1e-6, dev);
      assert.ok(Math.hypot(...sub(before, after)) < 2.1e-6);
      assert.ok(
        Math.abs(
          Math.hypot(
            ...sub(materialPoint(side, 3, dev), materialPoint(side, 7, dev)),
          ) - 4,
        ) < 1e-10,
      );
    }
    for (const [i, h] of identity.entries()) {
      const a = tower(i, h, dev),
        b = tower(i, h, dev + 1e-5);
      assert.deepEqual(a.id, tower(i, h, 2 - dev).id);
      assert.ok(Math.hypot(...sub(a.base, b.base)) < 0.001);
      assert.ok(Math.abs(a.h - b.h) < 0.001);
    }
  }
  assert.ok(
    Math.abs(materialPoint(1, 20.85665208, 2)[0]) < 1e-6,
    "roof closes without a crack",
  );
});

test("camera remains inside the vault but outside every tower, at all development values", () => {
  for (let dev = 0; dev <= 2; dev += 0.01)
    for (let i = 0; i < 32; i++)
      for (const identity of [0, 0.5, 1]) {
        const t = tower(i, identity, dev);
        // Even at maximum footprint, every box is ahead of the entire
        // closed camera path. Height and folding never change its z.
        assert.ok(t.base[2] - 2 > -9 + 1.8 + 1);
        assert.ok(Number.isFinite(t.h));
      }
  assert.match(laser.fragment, /1\.5 \* \(1\.0 \+ 0\.02 \* u_kick\)/);
  assert.doesNotMatch(laser.fragment, /rot2\(/, "no camera roll");
});

test("presets declare a continuous world, eight bounded looks and three gestures", () => {
  assert.equal(laser.number, 105);
  assert.equal(laser.development, "development");
  assert.deepEqual(laser.type.values, [0, 1, 2]);
  assert.equal(laser.presets.length, 8);
  for (const p of laser.presets)
    for (const d of laser.schema)
      assert.ok(
        Number.isFinite(p.params[d.key]) &&
          p.params[d.key] >= d.min &&
          p.params[d.key] <= d.max,
        `${p.name}.${d.key}`,
      );
  const world = defaultWorlds(catalogLooks(scenes).map((l) => l.id)).find(
    (w) => w.id === "laser-grid",
  );
  assert.ok(world);
  const clips = world.states.map((s) => ({
    snapshot: presetSnapshot(
      laser,
      laser.presets.findIndex((p) => `laser:${p.name}` === s.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, laser)?.positions, [0, 1, 2]);
  assert.deepEqual(
    laser.rhythm.map((r) => [r.slot, r.defaults.length]),
    [
      [0, 4],
      [1, 8],
      [2, 16],
    ],
  );
  assert.ok(laser.energy.sweep.mul[1] / laser.energy.sweep.mul[0] <= 2);
  assert.match(
    laser.fragment,
    /fine \* 0\.22 \* smoothstep\(0\.25, 0\.9, level\)/,
  );
});

test("sheath erf removes two exponentials with a bounded sub-0.05% error", () => {
  function cheapErf(x) {
    const a = Math.abs(x), a2 = a * a;
    const r = 1 / (1 + 0.278393 * a + 0.230389 * a2 + 0.000972 * a2 * a + 0.078108 * a2 * a2);
    return Math.sign(x) * (1 - r ** 4);
  }
  for (let x = -12; x <= 12; x += 0.001) {
    assert.ok(Math.abs(cheapErf(x) - erf(x)) < 4.7e-4);
    assert.ok(cheapErf(x) <= cheapErf(x + 0.001) + 1e-14);
  }
  assert.match(laser.fragment, /sheath \? lgSheathErf/);
});

test("prepared beam coordinates preserve axial clipping and closest-point quadratic", () => {
  for (let i = 0; i < 100; i++) {
    const ro = [Math.sin(i) * 3, 2, -9], a = [-7, 1, 49], b = [6, 8, 2];
    const d = norm(sub(b, a)), len = Math.hypot(...sub(b, a));
    const p = sub(ro, mul(add(a, b), 0.5)), z = dot(p, d), q = sub(p, mul(d, z));
    assert.ok(Math.abs(dot(sub(ro, a), d) - (z + len / 2)) < 1e-13);
    for (const t of [0, 3, 17, 60]) {
      const rd = norm([Math.sin(i * 0.1), Math.cos(i * 0.3), 1]);
      const v = sub(rd, mul(d, dot(rd, d)));
      const original = add(p, mul(rd, t)), axial = dot(original, d);
      const transverse = sub(original, mul(d, axial));
      assert.ok(Math.hypot(...sub(transverse, add(q, mul(v, t)))) < 1e-13);
    }
  }
});

test("perspective tube bounds conservatively include every six-sigma candidate", () => {
  // In camera coordinates a convex segment has extrema at its endpoints.
  // Bound the projection's Lipschitz constant over its radius-2.4 capsule.
  const project = (v) => [v[0] / v[2], v[1] / v[2]];
  const distance = (p, a, b) => {
    const v = sub(b, a), h = clamp(dot(sub(p, a), v) / dot(v, v), 0, 1);
    return Math.hypot(...sub(sub(p, a), mul(v, h)));
  };
  for (let i = 0; i < 50; i++) {
    const a = [-8 + Math.sin(i) * 3, 4, 55], b = [8 * Math.cos(i), -3, 9 + i % 7];
    const pa = project(a), pb = project(b), z = Math.min(a[2], b[2]);
    const radius = 2.4 * (1 + Math.max(Math.hypot(...pa), Math.hypot(...pb))) / (z - 2.4);
    for (let j = 0; j < 100; j++) {
      const p = add(add(mul(a, j / 99), mul(b, 1 - j / 99)), mul(norm([Math.sin(j), Math.cos(j * 2), Math.sin(j * 3)]), 2.4));
      assert.ok(distance(project(p), pa, pb) <= radius + 1e-12);
    }
  }
  assert.match(laser.fragment, /6\.0 \* 0\.4 \* \(1\.0 \+ projectedSlope\)/);
  assert.deepEqual(laser.precompute.size, [32, 41]);
  assert.match(laser.precompute.fragment, /vec4\(bits\)/);
  assert.match(laser.fragment, /return lgDatum\(i, row\)/, "non-float fallback uses identical geometry");
  // Two 16-bit halves are exactly representable in RGBA32F.
  for (let i = 0; i <= 65535; i++) assert.equal(Math.fround(i), i);
});

test("rate-dependent phases stay continuous at 3600 s and 12 h without touching development", () => {
  for (const time of [3600, 43200]) {
    const state = {},
      p = laser.schema.map((s) => s.default);
    const start = [...advanceClocks(state, laser.clocks, time, p, 0.1)];
    p[0] = 2;
    const reversed = [...advanceClocks(state, laser.clocks, time, p, 0.9)];
    assert.deepEqual(start, reversed, "development never re-anchors phase");
    p[1] = 1.5;
    const at = [...advanceClocks(state, laser.clocks, time + 1 / 60, p, 0.9)];
    for (let i = 0; i < 2; i++) assert.ok(Math.abs(at[i] - start[i]) < 0.01);
  }
});
