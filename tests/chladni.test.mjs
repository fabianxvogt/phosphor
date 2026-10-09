import test from "node:test";
import assert from "node:assert/strict";
import chladni, {
  SQUARE_MODES,
  BESSEL_ZEROS,
  squareMode,
  besselJ,
} from "../scene-chladni.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

test("the Bessel quadrature vanishes at the tabulated zeros", () => {
  for (let n = 0; n < BESSEL_ZEROS.length; n++)
    for (const z of BESSEL_ZEROS[n])
      assert.ok(
        Math.abs(besselJ(n, z)) < 2e-4,
        `J${n}(${z}) = ${besselJ(n, z)}`,
      );
  assert.ok(Math.abs(besselJ(0, 0) - 1) < 1e-12);
});

test("antisymmetric square modes have a nodal diagonal", () => {
  for (const mode of SQUARE_MODES.filter((m) => m[2] < 0))
    for (let s = -0.9; s <= 0.9; s += 0.15)
      assert.ok(Math.abs(squareMode([s, s], mode)) < 1e-12);
});

test("vibrated sand gathers on the nodal lines", () => {
  // The shader's grain update with a fixed mode, on the CPU.
  const mode = [2, 3, 1];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grains = Array.from({ length: 3000 }, () => [
    rnd() * 2 - 1,
    rnd() * 2 - 1,
  ]);
  const nearNode = () =>
    grains.filter((p) => Math.abs(squareMode(p, mode)) < 0.08).length /
    grains.length;
  const before = nearNode();
  const e = 0.004;
  for (let step = 0; step < 600; step++)
    for (const p of grains) {
      const a = squareMode(p, mode);
      const gx = (squareMode([p[0] + e, p[1]], mode) - a) / e,
        gy = (squareMode([p[0], p[1] + e], mode) - a) / e;
      const ang = 2 * Math.PI * rnd(),
        len = rnd();
      p[0] +=
        Math.cos(ang) * len * Math.abs(a) * 0.6 * 0.08 - a * gx * 0.5 * 0.004;
      p[1] +=
        Math.sin(ang) * len * Math.abs(a) * 0.6 * 0.08 - a * gy * 0.5 * 0.004;
      p[0] = Math.max(-0.998, Math.min(0.998, p[0]));
      p[1] = Math.max(-0.998, Math.min(0.998, p[1]));
    }
  const after = nearNode();
  assert.ok(after > 2.5 * before && after > 0.5, `${before} → ${after}`);
});

test("every look validates and all four plates are covered", () => {
  for (const value of chladni.type.values)
    assert.ok(
      chladni.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < chladni.presets.length; i++) {
    const snapshot = presetSnapshot(chladni, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [chladni]),
      snapshot,
    );
  }
});
