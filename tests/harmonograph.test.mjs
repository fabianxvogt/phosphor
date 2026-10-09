import test from "node:test";
import assert from "node:assert/strict";
import harmonograph, {
  RATIOS,
  lissajous,
  hypotrochoid,
  knotFrequencies,
  lissajousKnot,
} from "../scene-harmonograph.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const TAU = 2 * Math.PI;

test("a rational ratio closes the Lissajous figure after one period", () => {
  for (const [a, b] of RATIOS) {
    const p0 = lissajous(0, a, b, 0.4),
      p1 = lissajous(TAU, a, b, 0.4);
    assert.ok(Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) < 1e-9, `${a}:${b}`);
  }
});

test("a spirograph with R:r coprime has exactly R petals", () => {
  for (const [r, R] of RATIOS.filter(([a, b]) => b > a)) {
    let maxima = 0;
    const n = 20000,
      d = r * 0.8;
    const radius = (i) =>
      Math.hypot(...hypotrochoid((i / n) * TAU * r, R, r, d));
    for (let i = 0; i < n; i++)
      if (
        radius(i) > radius((i + n - 1) % n) &&
        radius(i) >= radius((i + 1) % n)
      )
        maxima++;
    assert.equal(maxima, R, `${R}:${r}`);
  }
});

test("Lissajous knots never touch themselves", () => {
  for (const [a, b] of [
    [2, 3],
    [3, 4],
    [5, 8],
  ]) {
    const f = knotFrequencies(a, b);
    const n = 1500;
    const pts = Array.from({ length: n }, (_, i) =>
      lissajousKnot((i / n) * TAU, f),
    );
    let closest = Infinity;
    for (let i = 0; i < n; i++)
      for (let j = i + 30; j < n; j++) {
        if (n - (j - i) < 30) continue;
        const [x, y, z] = pts[i],
          [u, v, w] = pts[j];
        closest = Math.min(closest, Math.hypot(x - u, y - v, z - w));
      }
    assert.ok(closest > 0.01, `${f}: ${closest}`);
  }
  assert.deepEqual(knotFrequencies(2, 3), [2, 3, 5]);
});

test("every look validates and all four curves are covered", () => {
  assert.ok(harmonograph.presets.length >= 8);
  for (const value of harmonograph.type.values)
    assert.ok(
      harmonograph.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < harmonograph.presets.length; i++) {
    const snapshot = presetSnapshot(harmonograph, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [harmonograph]),
      snapshot,
    );
  }
});
