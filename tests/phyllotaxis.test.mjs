import test from "node:test";
import assert from "node:assert/strict";
import phyllotaxis, {
  GOLDEN_ANGLE,
  vogel,
  fibonacciSphere,
} from "../scene-phyllotaxis.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

test("the golden angle is 360°·(2 − φ) ≈ 137.508°", () => {
  assert.ok(Math.abs((GOLDEN_ANGLE * 180) / Math.PI - 137.5078) < 1e-3);
});

test("nearest neighbours sit a Fibonacci number of seeds apart", () => {
  const N = 1500;
  const pts = Array.from({ length: N }, (_, n) => vogel(n, GOLDEN_ANGLE));
  for (let n = 900; n < 1100; n += 7) {
    let best = Infinity,
      gap = 0;
    for (let m = 0; m < N; m++) {
      if (m === n) continue;
      const d = Math.hypot(pts[m][0] - pts[n][0], pts[m][1] - pts[n][1]);
      if (d < best) [best, gap] = [d, Math.abs(m - n)];
    }
    assert.ok(FIB.includes(gap), `seed ${n}: neighbour ${gap} apart`);
  }
});

test("a rational turn p/q puts the seeds on q straight spokes", () => {
  const alpha = (2 * Math.PI * 2) / 7;
  const angles = new Set();
  for (let n = 1; n < 500; n++) {
    const [x, y] = vogel(n, alpha);
    // Spoke number k: angle = 2πk/7, exactly.
    const k =
      (((Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI)) * 7) / (2 * Math.PI);
    assert.ok(Math.abs(k - Math.round(k)) < 1e-9);
    angles.add(
      Math.round(
        (((Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI)) * 7) /
          (2 * Math.PI),
      ) % 7,
    );
  }
  assert.equal(angles.size, 7);
});

test("the Fibonacci sphere spreads points evenly", () => {
  const N = 800;
  const pts = Array.from({ length: N }, (_, i) => fibonacciSphere(i, N));
  const nn = pts.map((p, i) =>
    Math.min(
      ...pts
        .filter((_, j) => j !== i)
        .map((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])),
    ),
  );
  const mean = nn.reduce((a, b) => a + b, 0) / N;
  assert.ok(Math.min(...nn) > 0.6 * mean, `${Math.min(...nn)} vs ${mean}`);
  for (const p of pts) assert.ok(Math.abs(Math.hypot(...p) - 1) < 1e-12);
});

test("every look validates and all four models are covered", () => {
  for (const value of phyllotaxis.type.values)
    assert.ok(
      phyllotaxis.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < phyllotaxis.presets.length; i++) {
    const snapshot = presetSnapshot(phyllotaxis, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [phyllotaxis]),
      snapshot,
    );
  }
});
