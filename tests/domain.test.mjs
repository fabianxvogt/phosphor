import test from "node:test";
import assert from "node:assert/strict";
import domain, {
  zeta,
  zetaLogDerivative,
  iterate,
  terrainHeight,
  ZETA_ZEROS,
} from "../scene-domain.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

test("Borwein's series gives ζ(2) = π²/6, ζ(−1) = −1/12 and the trivial zero at −2", () => {
  assert.ok(Math.abs(zeta([2, 0])[0] - Math.PI ** 2 / 6) < 1e-9);
  assert.ok(Math.abs(zeta([-1, 0])[0] + 1 / 12) < 1e-9);
  assert.ok(Math.hypot(...zeta([-2, 0])) < 1e-9);
});

test("the nontrivial zeros in view lie on the critical line", () => {
  for (const t of ZETA_ZEROS) {
    assert.ok(Math.hypot(...zeta([0.5, t])) < 1e-4, `ρ = ½ + ${t}i`);
    // Off the line, at the same height, ζ is clearly not zero.
    assert.ok(Math.hypot(...zeta([0.8, t])) > 0.05);
  }
});

test("phase and log-modulus lines cross at right angles (Cauchy–Riemann)", () => {
  const h = 1e-5;
  for (const s of [
    [0.3, 18.2],
    [1.7, 9.4],
    [-0.6, 27.1],
  ]) {
    const f = (p) => {
      const [x, y] = zeta(p);
      return [Math.log(Math.hypot(x, y)), Math.atan2(y, x)];
    };
    const [l0, a0] = f(s),
      [l1, a1] = f([s[0] + h, s[1]]),
      [l2, a2] = f([s[0], s[1] + h]);
    const gl = [(l1 - l0) / h, (l2 - l0) / h],
      ga = [(a1 - a0) / h, (a2 - a0) / h];
    const n = Math.hypot(...gl) * Math.hypot(...ga);
    assert.ok(Math.abs(gl[0] * ga[0] + gl[1] * ga[1]) / n < 1e-3, "orthogonal");
    assert.ok(
      Math.abs(Math.hypot(...gl) - Math.hypot(...ga)) / Math.hypot(...gl) <
        1e-3,
      "square cells",
    );
  }
});

test("argument principle: the phase winds +1 around a zero and −1 around the pole", () => {
  const winding = (centre, r) => {
    let total = 0,
      prev = null;
    for (let i = 0; i <= 400; i++) {
      const a = (i / 400) * 2 * Math.PI;
      const [x, y] = zeta([
        centre[0] + r * Math.cos(a),
        centre[1] + r * Math.sin(a),
      ]);
      const ph = Math.atan2(y, x);
      if (prev !== null) {
        let d = ph - prev;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        total += d;
      }
      prev = ph;
    }
    return Math.round(total / (2 * Math.PI));
  };
  assert.equal(winding([0.5, ZETA_ZEROS[0]], 0.3), 1);
  assert.equal(winding([1, 0], 0.3), -1);
});

test("every look validates and all four functions are covered", () => {
  for (const value of domain.type.values)
    assert.ok(
      domain.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < domain.presets.length; i++) {
    const snapshot = presetSnapshot(domain, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [domain]),
      snapshot,
    );
  }
});

const cdiv = ([a, b], [c, d]) => {
  const q = c * c + d * d;
  return [(a * c + b * d) / q, (b * c - a * d) / q];
};
const logAbs = (v) => Math.log(Math.hypot(...v));

test("the terrain's normals use the exact log-derivative ζ'/ζ", () => {
  const h = 1e-5;
  for (const s of [
    [0.3, 18.2],
    [1.7, 9.4],
    [-0.6, 27.1],
    [0.5, 40.3],
  ]) {
    const z0 = zeta(s),
      zp = zeta([s[0] + h, s[1]]),
      zm = zeta([s[0] - h, s[1]]);
    const numeric = cdiv(
      [(zp[0] - zm[0]) / (2 * h), (zp[1] - zm[1]) / (2 * h)],
      z0,
    );
    const exact = zetaLogDerivative(s);
    const err = Math.hypot(numeric[0] - exact[0], numeric[1] - exact[1]);
    assert.ok(err < 1e-4, `${s}`);
    // ∂x log|ζ| = Re(ζ'/ζ), ∂y log|ζ| = −Im(ζ'/ζ).
    const up = logAbs(zeta([s[0], s[1] + h])),
      down = logAbs(zeta([s[0], s[1] - h]));
    assert.ok(Math.abs((up - down) / (2 * h) + exact[1]) < 1e-4);
  }
});

test("along the critical line the zeta terrain has its pits exactly at the zeros", () => {
  const height = (t) => terrainHeight(logAbs(zeta([0.5, t])));
  const minima = [];
  for (let t = 12; t < 39; t += 0.005)
    if (height(t) < height(t - 0.005) && height(t) < height(t + 0.005))
      minima.push(t);
  assert.equal(minima.length, ZETA_ZEROS.length);
  minima.forEach((t, i) => assert.ok(Math.abs(t - ZETA_ZEROS[i]) < 0.01, `${t}`));
  for (const t of ZETA_ZEROS) assert.ok(height(t) < -0.99);
  // The pole at s = 1 is a spire.
  assert.ok(terrainHeight(logAbs(zeta([1.001, 0]))) > 0.99);
});

test("the series stays accurate over the whole zeta flight (Im s ≤ 50)", () => {
  for (const t of [30, 40, 46, 50])
    for (const s of [-0.9, 0.5, 2.5]) {
      const a = zeta([s, t]),
        b = zeta([s, t], 80);
      const err = Math.hypot(a[0] - b[0], a[1] - b[1]);
      assert.ok(err < 0.02 * Math.max(1, Math.hypot(...b)), `${s} + ${t}i`);
    }
});

test("rational terrain: pits at zeros, spires at poles, normals from Σ1/(z − a) − Σ1/(z − b)", () => {
  const zeros = [
    [0.4, 0.1],
    [-0.5, 0.3],
    [0.1, -0.6],
  ];
  const poles = [
    [-0.2, -0.1],
    [0.6, -0.4],
    [-0.7, -0.5],
  ];
  const sum = (pts, [x, y]) =>
    pts.reduce((s, [a, b]) => s + Math.log(Math.hypot(x - a, y - b)), 0);
  const lm = (z) => sum(zeros, z) - sum(poles, z);
  for (const z of zeros)
    assert.ok(terrainHeight(lm([z[0] + 1e-4, z[1]])) < -0.999);
  for (const p of poles)
    assert.ok(terrainHeight(lm([p[0] + 1e-4, p[1]])) > 0.999);
  const h = 1e-6;
  for (const z of [
    [0.13, 0.27],
    [-0.9, 0.8],
  ]) {
    let g = [0, 0];
    for (const [pts, sign] of [
      [zeros, 1],
      [poles, -1],
    ])
      for (const a of pts) {
        const [u, v] = cdiv([1, 0], [z[0] - a[0], z[1] - a[1]]);
        g = [g[0] + sign * u, g[1] + sign * v];
      }
    const dx = (lm([z[0] + h, z[1]]) - lm([z[0] - h, z[1]])) / (2 * h);
    const dy = (lm([z[0], z[1] + h]) - lm([z[0], z[1] - h])) / (2 * h);
    assert.ok(Math.abs(dx - g[0]) < 1e-6 && Math.abs(dy + g[1]) < 1e-6);
  }
});

test("the n-th iterate of z² + c sinks 2ⁿ pits and carries its exact derivative", () => {
  const c = [-0.75, 0.12];
  for (let n = 1; n <= 6; n++) {
    let total = 0,
      prev = null;
    for (let i = 0; i <= 4000; i++) {
      const a = (i / 4000) * 2 * Math.PI;
      const [[x, y]] = iterate([3 * Math.cos(a), 3 * Math.sin(a)], c, n);
      const ph = Math.atan2(y, x);
      if (prev !== null) {
        let d = ph - prev;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        total += d;
      }
      prev = ph;
    }
    assert.equal(Math.round(total / (2 * Math.PI)), 2 ** n);
    const z = [0.21, -0.37],
      h = 1e-6;
    const [, d] = iterate(z, c, n);
    const [fp] = iterate([z[0] + h, z[1]], c, n),
      [fm] = iterate([z[0] - h, z[1]], c, n);
    const numeric = [(fp[0] - fm[0]) / (2 * h), (fp[1] - fm[1]) / (2 * h)];
    const err = Math.hypot(numeric[0] - d[0], numeric[1] - d[1]);
    assert.ok(err < 1e-5 * Math.max(1, Math.hypot(...d)));
  }
});

test("energy moves camera, flow and framing, not glow; ζ is cached for the march", () => {
  assert.deepEqual(Object.keys(domain.energy).sort(), [
    "flow",
    "motion",
    "zoom",
  ]);
  assert.equal(domain.precompute.size.length, 2);
  assert.ok(terrainHeight(-50) >= -1 && terrainHeight(50) <= 1);
});
