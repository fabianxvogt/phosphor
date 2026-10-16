import test from "node:test";
import assert from "node:assert/strict";
import laser from "../scene-laser.mjs";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { catalogLooks } from "../catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { advanceClocks } from "../scene-time.mjs";
import { laserData } from "../scene-laser-data.mjs";
import { defaultPattern } from "../rhythm.mjs";

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

test("vector hierarchy and directional opaque-face lighting remain palette-only and bounded", () => {
  assert.match(laser.fragment, /float faceKey = edgeDistance\.z < edgeDistance\.x \? 0\.45 : 1\.0;/);
  assert.match(laser.fragment, /0\.35 \+ 0\.65 \* smoothstep\(-towerSize\.y, towerSize\.y, towerP\.y\)/);
  assert.match(laser.fragment, /float fog = exp\(-depth \* 0\.032\);/);
  assert.match(laser.fragment, /major \* fog \* mix\(0\.35, 0\.85, gFold\)/);
  assert.match(laser.fragment, /core \* 0\.58 \+ volume \* haze \* phase \* 0\.36/);
  // Shading is bounded independently of energy and retains black at depth.
  for (let h = -1; h <= 1; h += 0.01) {
    const gradient = 0.35 + 0.65 * smooth(-1, 1, h);
    for (const face of [0.45, 1]) {
      const wash = 0.085 * face * gradient;
      assert.ok(wash >= 0 && wash <= 0.085);
      assert.ok(wash * Math.exp(-120 * 0.025) < 0.005);
    }
  }
  assert.equal(laser.precompute.size[0], 32);
  assert.equal(laser.precompute.size[1], 41, "no extra geometry/data work for the relight");
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

test("presets declare a continuous world, eight bounded looks and four gestures", () => {
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
      [3, 16],
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
    const a = Math.abs(x),
      a2 = a * a;
    const r =
      1 /
      (1 +
        0.278393 * a +
        0.230389 * a2 +
        0.000972 * a2 * a +
        0.078108 * a2 * a2);
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
    const ro = [Math.sin(i) * 3, 2, -9],
      a = [-7, 1, 49],
      b = [6, 8, 2];
    const d = norm(sub(b, a)),
      len = Math.hypot(...sub(b, a));
    const p = sub(ro, mul(add(a, b), 0.5)),
      z = dot(p, d),
      q = sub(p, mul(d, z));
    assert.ok(Math.abs(dot(sub(ro, a), d) - (z + len / 2)) < 1e-13);
    for (const t of [0, 3, 17, 60]) {
      const rd = norm([Math.sin(i * 0.1), Math.cos(i * 0.3), 1]);
      const v = sub(rd, mul(d, dot(rd, d)));
      const original = add(p, mul(rd, t)),
        axial = dot(original, d);
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
    const v = sub(b, a),
      h = clamp(dot(sub(p, a), v) / dot(v, v), 0, 1);
    return Math.hypot(...sub(sub(p, a), mul(v, h)));
  };
  function insideTaper(p, a, b, radii) {
    const v = sub(b, a),
      q = sub(p, a),
      dr = radii[1] - radii[0];
    const A = dot(v, v) - dr * dr,
      B = -dot(q, v) - radii[0] * dr;
    const t = A > 1e-8 ? clamp(-B / A, 0, 1) : 0;
    const off = sub(q, mul(v, t));
    return (
      Math.min(
        dot(off, off) - (radii[0] + dr * t) ** 2,
        dot(q, q) - radii[0] ** 2,
        dot(sub(q, v), sub(q, v)) - radii[1] ** 2,
      ) <= 1e-12
    );
  }
  for (let i = 0; i < 50; i++) {
    const a = [-8 + Math.sin(i) * 3, 4, 55],
      b = [8 * Math.cos(i), -3, 9 + (i % 7)];
    const pa = project(a),
      pb = project(b),
      z = Math.min(a[2], b[2]);
    const radius =
      (2.4 * (1 + Math.max(Math.hypot(...pa), Math.hypot(...pb)))) / (z - 2.4);
    const factor =
      (2.4 * (1 + Math.max(Math.hypot(...pa), Math.hypot(...pb)))) /
      (1 - 2.4 / z);
    const radii = [factor / a[2], factor / b[2]];
    for (let j = 0; j < 100; j++) {
      const p = add(
        add(mul(a, j / 99), mul(b, 1 - j / 99)),
        mul(norm([Math.sin(j), Math.cos(j * 2), Math.sin(j * 3)]), 2.4),
      );
      assert.ok(distance(project(p), pa, pb) <= radius + 1e-12);
      assert.ok(
        insideTaper(project(p), pa, pb, radii),
        "taper contains every projected six-sigma point",
      );
    }
  }
  assert.match(laser.fragment, /6\.0 \* 0\.4 \* \(1\.0 \+ projectedSlope\)/);
  assert.deepEqual(laser.precompute.size, [32, 41]);
  assert.match(laser.precompute.fragment, /vec4\(bits\)/);
  assert.match(
    laser.fragment,
    /return lgDatum\(i, row\)/,
    "non-float fallback uses identical geometry",
  );
  // Two 16-bit halves are exactly representable in RGBA32F.
  for (let i = 0; i <= 65535; i++) assert.equal(Math.fround(i), i);
});

test("surface-end clipping stops rays at the same hinged material, in either direction", () => {
  function clip(a, b, dev) {
    const v = sub(b, a),
      fold = smooth(1, 2, dev),
      theta = (fold * Math.PI) / 2;
    let nearest = 1;
    const strip = (base, tangent, span) => {
      const n = [-tangent[1], tangent[0], 0],
        den = dot(v, n);
      if (Math.abs(den) < 1e-6) return;
      const t = dot(sub(base, a), n) / den,
        u = dot(sub(add(a, mul(v, t)), base), tangent);
      if (t > 0.001 && t < nearest && u >= 0 && u <= span) nearest = t;
    };
    strip([-9, 0, 0], [1, 0, 0], 18);
    for (const side of [-1, 1]) {
      strip([side * 9, 0, 0], [side * Math.cos(theta), Math.sin(theta), 0], 11);
      const angle = fold * (Math.PI - 0.42);
      strip(
        [side * (9 + 11 * Math.cos(theta)), 11 * Math.sin(theta), 0],
        [side * Math.cos(angle), Math.sin(angle), 0],
        9.85665208,
      );
    }
    return add(a, mul(v, nearest));
  }
  for (let d = 0; d <= 2; d += 0.01) {
    assert.ok(
      Math.hypot(
        ...sub(clip([0, 5, 55], [0, -10, 2], d), [0, 0, 55 - 53 / 3]),
      ) < 1e-13,
    );
    for (const side of [-1, 1]) {
      const result = clip([0, 5, 55], [side * 50, 5, 2], d);
      assert.ok(Math.abs(result[0]) <= 50 && result[1] === 5);
      assert.deepEqual(
        result,
        clip([0, 5, 55], [side * 50, 5, 2], d),
        "no state or direction history",
      );
    }
  }
  assert.match(laser.fragment, /b = lgSurfaceEnd\(a, b\)/);
  assert.match(laser.fragment, /i < 21/);
  assert.match(laser.fragment, /0\.65 \* u_kick \* gFold/);
  assert.match(
    laser.fragment,
    /core \* 0\.58/,
    "HDR core power is not a master-gain envelope",
  );
});

test("finite cone fill uses the first positive exit and matches numeric Beer transport", () => {
  const eye = [0.7, 2.8, -8],
    apex = [0, 5.7, 55],
    slope = 0.19,
    sigma = 0.018;
  for (const x of [-0.8, -0.23, -0.17, -0.05, 0, 0.05, 0.17, 0.23, 0.8])
    for (const y of [-0.2, 0, 0.2]) {
      const r = norm([x, y, 1]),
        v = sub(eye, apex);
      const A = r[0] ** 2 + r[1] ** 2 - (slope * r[2]) ** 2;
      const B = v[0] * r[0] + v[1] * r[1] - slope ** 2 * v[2] * r[2];
      const C = v[0] ** 2 + v[1] ** 2 - (slope * v[2]) ** 2;
      const root = Math.sqrt(B * B - A * C),
        t0 = (-B - root) / A,
        t1 = (-B + root) / A;
      const exit = Math.min(t0 > 0 ? t0 : 1e6, t1 > 0 ? t1 : 1e6);
      const near = Math.max(0, (2 - eye[2]) / r[2]),
        far = Math.min(120, exit, (53 - eye[2]) / r[2]);
      const analytic = Math.max(
        0,
        Math.exp(-sigma * near) - Math.exp(-sigma * far),
      );
      let numeric = 0;
      const n = 24000,
        dt = 120 / n;
      for (let j = 0; j < n; j++) {
        const t = (j + 0.5) * dt,
          p = add(eye, mul(r, t)),
          q = sub(p, apex);
        if (
          p[2] >= 2 &&
          p[2] <= 53 &&
          q[0] ** 2 + q[1] ** 2 <= (slope * q[2]) ** 2
        )
          numeric += sigma * Math.exp(-sigma * t) * dt;
      }
      assert.ok(
        Math.abs(analytic - numeric) < 0.00015,
        `${x},${y}: ${analytic} vs ${numeric}`,
      );
    }
  assert.match(
    laser.fragment,
    /float exitT = min\(t0 > 0\.0 \? t0 : 1e6, t1 > 0\.0 \? t1 : 1e6\)/,
  );
});

test("camera stays inside the filled cone for every declared eye height and phase", () => {
  for (let camera = 0; camera < 2 * Math.PI; camera += 0.02)
    for (const eye of [1.5, 2.8, 5]) {
      const z = -9 + 1.8 * Math.cos(camera),
        y = eye + 0.25 * Math.sin(camera * 2);
      const transverse2 = 1.1 ** 2 + (y - 5.7) ** 2;
      assert.ok(
        transverse2 < (0.165 * (z - 55)) ** 2,
        "valid inside-cone interval branch",
      );
    }
  assert.match(laser.fragment, /float coneAA = max\(fwidth\(discr\)/);
  assert.match(
    laser.fragment,
    /exp\(-nearT \* 0\.018\) - exp\(-farT \* 0\.018\)/,
  );
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


test("slot-3 signature: tunnel chase is authored for all three phrase styles", () => {
  const chase = laser.rhythm.find((effect) => effect.slot === 3);
  assert.ok(chase, "signature gesture in slot 3");
  assert.equal(chase.id, "tunnel-chase");
  for (const style of ["restrained", "driving", "accented"]) {
    const loop = chase.styles[style];
    assert.ok(loop, style);
    const hits = loop.steps.filter((v) => v > 0).length;
    assert.ok(hits >= 2, `${style}: at least two hits`);
    assert.ok(loop.strength > 0 && loop.strength <= 1, `${style}: bounded`);
    assert.equal(loop.division, 4, `${style}: a sixteenth chase`);
  }
  assert.deepEqual(defaultPattern(laser.rhythm).tracks.at(-1).steps, chase.styles.driving.steps);
  // Shader reads all signature channels; selection lives in the shared data
  // code, so the data pass and the picture always agree on the fired spoke.
  assert.match(laserData, /u_rhythmCount\.w/);
  assert.match(laserData, /float lgChase\(int i\)/);
  assert.match(laserData, /weight = max\(weight, lgChase\(i\)\)/);
  assert.match(laser.fragment, /u_rhythm\.w/);
  assert.match(laser.fragment, /float chase = lgChase\(i\), address = lgAddress\(i\);/);
});

// CPU mirror of lgChase: the newest hit fires the next spoke, its two
// predecessors glow less; the chase rotates through all eight spokes.
const chaseOf = (count, spoke, env = 1) => {
  const mod = (a, b) => a - b * Math.floor(a / b);
  const back = mod(mod(count + 7, 8) - spoke + 8, 8);
  return env * (back < 0.5 ? 1 : back < 1.5 ? 0.55 : back < 2.5 ? 0.22 : 0);
};
test("tunnel chase rotates through every spoke with a bounded two-step tail", () => {
  const fired = new Set();
  for (let count = 1; count <= 16; count++) {
    const levels = Array.from({ length: 8 }, (_, spoke) => chaseOf(count, spoke));
    assert.equal(levels.filter((v) => v === 1).length, 1, "one hot spoke");
    assert.equal(levels.filter((v) => v > 0).length, 3, "two-step tail");
    const hot = levels.indexOf(1);
    assert.equal(chaseOf(count + 1, (hot + 1) % 8), 1, "next hit fires the neighbour");
    assert.equal(chaseOf(count + 1, hot), 0.55, "previous spoke becomes the tail");
    fired.add(hot);
  }
  assert.equal(fired.size, 8);
});

test("horizon fan folds continuously into the tunnel cone (spoke identity)", () => {
  // Mirror of the spoke endpoints in lgEndpoints, before surface clipping.
  const spokeEnds = (spoke, dev, phase = 0.7, aperture = 0.85) => {
    const fold = smooth(1, 2, dev),
      slope = 0.19 + 0.025 * Math.sin(phase * 2),
      angle = (spoke * 2 * Math.PI) / 8 + phase,
      apex = [0, 5.7, 55];
    const cone = add(apex, [Math.cos(angle) * slope * 53, Math.sin(angle) * slope * 53, -53]);
    const k = (spoke - 3.5) / 3.5,
      lift = 0.5 + 0.5 * Math.sin(phase * 2 + 1.3);
    const fan = [k * 18 * aperture + 3 * Math.sin(phase + 0.4 * spoke), mix(-1.5, 9.5, lift) + 1.5 * k * k, 0.5];
    const lerp = (p, q) => p.map((x, i) => mix(x, q[i], fold));
    return { a: lerp([0, 3.4, 65], apex), b: lerp(fan, cone) };
  };
  for (let spoke = 0; spoke < 8; spoke++)
    for (let dev = 0; dev < 2; dev += 0.01) {
      const p = spokeEnds(spoke, dev),
        q = spokeEnds(spoke, dev + 0.01);
      assert.ok(Math.hypot(...sub(p.b, q.b)) < 0.6, "no jump between development steps");
      // Endpoints stay in front of the whole camera path (z >= -7.2 + 7).
      assert.ok(p.b[2] >= 0.5 - 1e-9 && p.a[2] >= 55);
    }
  assert.match(laserData, /a = mix\(vec3\(0, 3\.4, 65\), apex, gFold\);/);
  assert.match(laserData, /b = mix\(fanEnd, coneEnd, gFold\);/);
});

test("liquid sky stays above the eye; scan rings travel continuously", () => {
  for (const preset of laser.presets) {
    const eye = preset.params.eye;
    for (let dev = 0; dev <= 2; dev += 0.05) {
      const fold = smooth(1, 2, dev),
        height = mix(eye + 1.7, Math.max(7.2, eye + 1.7), fold);
      // Normal z in [0, 0.05] only raises the sheet towards the viewer.
      assert.ok(height > eye + 0.25 + 1.4, `${preset.name} sheet above eye`);
    }
  }
  assert.match(laser.fragment, /float sheetHeight = mix\(u_params\[7\] \+ 1\.7, max\(7\.2, u_params\[7\] \+ 1\.7\), gFold\);/);
  // Ring age uses an integer harmonic of the wrapped phase: continuous at 2π.
  const age = (k, phase) => (((k / 3 + (phase * 12) / (2 * Math.PI)) % 1) + 1) % 1;
  for (let k = 0; k < 3; k++) {
    const before = age(k, 2 * Math.PI - 1e-9),
      after = age(k, 0);
    assert.ok(Math.min(Math.abs(before - after), 1 - Math.abs(before - after)) < 1e-6);
  }
  assert.match(laser.fragment, /fract\(float\(k\) \/ 3\.0 \+ gPhase \* 12\.0 \/ TAU\)/);
});
