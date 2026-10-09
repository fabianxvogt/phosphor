import test from "node:test";
import assert from "node:assert/strict";
import hilbert, {
  hilbertD2xy,
  hilbertXy2d,
  mooreD2xy,
  mooreXy2d,
  peanoD2xy,
  peanoXy2d,
} from "../scene-hilbert.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const curves = [
  {
    name: "Hilbert",
    side: (o) => 2 ** o,
    d2xy: (o, d) => hilbertD2xy(2 ** o, d),
    xy2d: (o, p) => hilbertXy2d(2 ** o, p),
    base: 4,
    orders: [1, 2, 3, 5, 7],
  },
  {
    name: "Moore",
    side: (o) => 2 ** o,
    d2xy: (o, d) => mooreD2xy(2 ** o, d),
    xy2d: (o, p) => mooreXy2d(2 ** o, p),
    base: 4,
    orders: [2, 3, 5, 6],
  },
  {
    name: "Peano",
    side: (o) => 3 ** o,
    d2xy: peanoD2xy,
    xy2d: peanoXy2d,
    base: 9,
    orders: [1, 2, 3, 4],
  },
];

test("each curve visits every cell exactly once, in unit steps (one unbroken line)", () => {
  for (const c of curves)
    for (const o of c.orders) {
      const n = c.side(o);
      const seen = new Set();
      let prev = null;
      for (let d = 0; d < n * n; d++) {
        const p = c.d2xy(o, d);
        assert.ok(
          p[0] >= 0 && p[0] < n && p[1] >= 0 && p[1] < n,
          `${c.name} ${o}`,
        );
        seen.add(p[0] * n + p[1]);
        assert.equal(c.xy2d(o, p), d, `${c.name} order ${o}: inverse at ${d}`);
        if (prev)
          assert.equal(
            Math.abs(p[0] - prev[0]) + Math.abs(p[1] - prev[1]),
            1,
            `${c.name} ${o} step ${d}`,
          );
        prev = p;
      }
      assert.equal(seen.size, n * n);
    }
});

test("refinement: every cell lies in its parent cell of the previous order", () => {
  for (const c of curves)
    for (const o of c.orders.filter((o) => o > (c.name === "Moore" ? 2 : 1))) {
      const n = c.side(o),
        k = c.base === 4 ? 2 : 3;
      for (let d = 0; d < n * n; d++) {
        const [x, y] = c.d2xy(o, d);
        const [px, py] = c.d2xy(o - 1, Math.floor(d / c.base));
        assert.deepEqual(
          [Math.floor(x / k), Math.floor(y / k)],
          [px, py],
          `${c.name} ${o} ${d}`,
        );
      }
    }
});

test("Hilbert runs corner to corner, Moore closes into a loop", () => {
  const n = 32;
  assert.deepEqual(hilbertD2xy(n, 0), [0, 0]);
  assert.deepEqual(hilbertD2xy(n, n * n - 1), [n - 1, 0]);
  const a = mooreD2xy(n, n * n - 1),
    b = mooreD2xy(n, 0);
  assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1);
  assert.deepEqual(peanoD2xy(3, 26 * 27 + 26), [26, 26]);
});

test("every look validates and all four variants are covered", () => {
  for (const value of hilbert.type.values)
    assert.ok(
      hilbert.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < hilbert.presets.length; i++) {
    const snapshot = presetSnapshot(hilbert, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [hilbert]),
      snapshot,
    );
  }
});
