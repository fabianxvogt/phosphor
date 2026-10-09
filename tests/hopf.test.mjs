import test from "node:test";
import assert from "node:assert/strict";
import hopfScene, { fibrePoint, hopf, stereo } from "../scene-hopf.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const TAU = 2 * Math.PI;
const fibre = (theta, phi, n = 400) =>
  Array.from({ length: n }, (_, k) =>
    stereo(fibrePoint(theta, phi, (TAU * k) / n)),
  );

test("every point of a fibre maps to its base point on S²", () => {
  for (const [theta, phi] of [
    [0.4, 0.3],
    [1.57, 2.0],
    [2.8, -1.1],
  ]) {
    const base = [
      Math.sin(theta) * Math.cos(phi),
      Math.sin(theta) * Math.sin(phi),
      Math.cos(theta),
    ];
    for (let k = 0; k < 16; k++) {
      const h = hopf(fibrePoint(theta, phi, (TAU * k) / 16));
      assert.ok(
        Math.hypot(h[0] - base[0], h[1] - base[1], h[2] - base[2]) < 1e-12,
      );
    }
  }
});

test("projected fibres are round circles", () => {
  const pts = fibre(1.1, 0.7, 64);
  // Centre from three points, then all points at the same distance and in one plane.
  const [a, b, c] = [pts[0], pts[21], pts[42]];
  const sub = (p, q) => p.map((v, i) => v - q[i]);
  const cross = (p, q) => [
    p[1] * q[2] - p[2] * q[1],
    p[2] * q[0] - p[0] * q[2],
    p[0] * q[1] - p[1] * q[0],
  ];
  const dot = (p, q) => p.reduce((s, v, i) => s + v * q[i], 0);
  const n = cross(sub(b, a), sub(c, a));
  for (const p of pts) assert.ok(Math.abs(dot(sub(p, a), n)) < 1e-9, "planar");
  // Circumcentre of a, b, c.
  const ab = sub(b, a),
    ac = sub(c, a),
    w = cross(ab, ac);
  const w2 = dot(w, w);
  const t1 = cross(w, ab).map((v) => (v * dot(ac, ac)) / (2 * w2));
  const t2 = cross(ac, w).map((v) => (v * dot(ab, ab)) / (2 * w2));
  const centre = a.map((v, i) => v + t1[i] + t2[i]);
  const r = pts.map((p) => Math.hypot(...sub(p, centre)));
  assert.ok(Math.max(...r) - Math.min(...r) < 1e-6, "round");
});

test("any two fibres are linked exactly once (Gauss linking integral)", () => {
  const link = (A, B) => {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
      const da = A[(i + 1) % A.length].map((v, k) => v - A[i][k]);
      for (let j = 0; j < B.length; j++) {
        const db = B[(j + 1) % B.length].map((v, k) => v - B[j][k]);
        const r = A[i].map((v, k) => v - B[j][k]);
        const d = Math.hypot(...r);
        const cr = [
          da[1] * db[2] - da[2] * db[1],
          da[2] * db[0] - da[0] * db[2],
          da[0] * db[1] - da[1] * db[0],
        ];
        sum += (r[0] * cr[0] + r[1] * cr[1] + r[2] * cr[2]) / (d * d * d);
      }
    }
    return sum / (4 * Math.PI);
  };
  for (const [p, q] of [
    [
      [1.0, 0.2],
      [1.6, 2.4],
    ],
    [
      [0.5, 1.0],
      [2.5, -0.7],
    ],
  ]) {
    const L = link(fibre(...p, 300), fibre(...q, 300));
    assert.ok(Math.abs(Math.abs(L) - 1) < 0.02, `${L}`);
  }
});

test("every look validates and all four configurations are covered", () => {
  for (const value of hopfScene.type.values)
    assert.ok(
      hopfScene.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < hopfScene.presets.length; i++) {
    const snapshot = presetSnapshot(hopfScene, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [hopfScene]),
      snapshot,
    );
  }
});
