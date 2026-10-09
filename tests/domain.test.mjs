import test from "node:test";
import assert from "node:assert/strict";
import domain, { zeta, ZETA_ZEROS } from "../scene-domain.mjs";
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
