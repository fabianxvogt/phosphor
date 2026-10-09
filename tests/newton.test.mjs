import test from "node:test";
import assert from "node:assert/strict";
import newton, {
  roots,
  newtonStep,
  basin,
  MAX_ROOTS,
} from "../scene-newton.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

test("Newton on z³ − 1 sends each root's neighbourhood to that root", () => {
  const rs = roots(0, 0);
  rs.forEach((r, k) => {
    assert.equal(basin([r[0] * 1.2, r[1] * 1.2], rs), k);
    assert.equal(basin([r[0] * 0.8 + 0.01, r[1] * 0.8], rs), k);
  });
});

test("the roots-sum Newton step equals z − p/p' for z³ − 1", () => {
  const rs = roots(0, 0); // cube roots of unity
  for (const z of [
    [0.3, 0.7],
    [-1.2, 0.4],
    [2, -1],
  ]) {
    const [x, y] = z;
    // p = z³ − 1, p' = 3z²
    const z2 = [x * x - y * y, 2 * x * y];
    const z3 = [z2[0] * x - z2[1] * y, z2[0] * y + z2[1] * x];
    const p = [z3[0] - 1, z3[1]];
    const dp = [3 * z2[0], 3 * z2[1]];
    const den = dp[0] * dp[0] + dp[1] * dp[1];
    const q = [
      (p[0] * dp[0] + p[1] * dp[1]) / den,
      (p[1] * dp[0] - p[0] * dp[1]) / den,
    ];
    const expected = [x - q[0], y - q[1]];
    const got = newtonStep(z, rs);
    assert.ok(
      Math.abs(got[0] - expected[0]) < 1e-9 &&
        Math.abs(got[1] - expected[1]) < 1e-9,
    );
  }
});

test("the basin border is Wada-like: near a border point all three basins appear", () => {
  const rs = roots(0, 0);
  // Walk along the negative real axis (a border of z³ − 1) and sample a
  // small disc around a border crossing.
  let found = false;
  for (let x = -0.2; x > -2 && !found; x -= 0.002) {
    const seen = new Set();
    for (let a = 0; a < 64; a++) {
      const r = 0.004;
      seen.add(basin([x + r * Math.cos(a), r * Math.sin(a)], rs));
    }
    if ([0, 1, 2].every((k) => seen.has(k))) found = true;
  }
  assert.ok(found, "a point where all three basins meet");
});

test("Halley converges too, and roots stay finite and inside the frame for hours", () => {
  for (const method of [0, 1, 2, 4])
    for (const t of [0, 13.7, 600, 3599]) {
      const rs = roots(method, t, 1.5, 0.3);
      assert.ok(
        rs.length >= 3 && rs.length <= MAX_ROOTS,
        `${method} ${rs.length}`,
      );
      for (const [x, y] of rs) assert.ok(Math.hypot(x, y) < 1.2);
    }
  const rs = roots(2, 5);
  assert.equal(
    basin([rs[0][0] * 1.1, rs[0][1] * 1.1], rs, { halley: true }),
    0,
  );
});

test("every look validates and all five methods are covered", () => {
  assert.ok(newton.presets.length >= 8);
  for (const value of newton.type.values)
    assert.ok(
      newton.presets.some((p) => p.params.method === value),
      value,
    );
  for (let i = 0; i < newton.presets.length; i++) {
    const snapshot = presetSnapshot(newton, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [newton]),
      snapshot,
    );
  }
});
