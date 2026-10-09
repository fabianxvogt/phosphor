import test from "node:test";
import assert from "node:assert/strict";
import wallpaper, {
  GROUPS,
  LATTICES,
  wallpaper as F,
} from "../scene-wallpaper.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const terms = [
  { n: 1, m: 0, re: 0.7, im: 0.2 },
  { n: -2, m: 1, re: 0.3, im: -0.5 },
  { n: 1, m: 3, re: -0.4, im: 0.1 },
  { n: 0, m: 2, re: 0.2, im: 0.6 },
];

// Cartesian image of point p under fractional op (A, t) of a lattice.
function apply(p, [a11, a12, a21, a22, t1, t2], [b1, b2]) {
  const det = b1[0] * b2[1] - b2[0] * b1[1];
  const X = (p[0] * b2[1] - b2[0] * p[1]) / det,
    Y = (b1[0] * p[1] - p[0] * b1[1]) / det;
  const x = a11 * X + a12 * Y + t1,
    y = a21 * X + a22 * Y + t2;
  return [x * b1[0] + y * b2[0], x * b1[1] + y * b2[1]];
}

test("there are 17 groups and every operation is an isometry of its lattice", () => {
  assert.equal(GROUPS.length, 17);
  assert.equal(new Set(GROUPS.map((g) => g.name)).size, 17);
  for (const g of GROUPS) {
    const lattice = LATTICES[g.lattice];
    for (const op of g.ops) {
      const o = apply([0, 0], op, lattice);
      for (const [p, q] of [
        [
          [0.3, 0.1],
          [-0.7, 0.45],
        ],
        [
          [1.2, -0.4],
          [0.05, 0.9],
        ],
      ]) {
        const gp = apply(p, op, lattice),
          gq = apply(q, op, lattice);
        const d0 = Math.hypot(p[0] - q[0], p[1] - q[1]),
          d1 = Math.hypot(gp[0] - gq[0], gp[1] - gq[1]);
        assert.ok(Math.abs(d0 - d1) < 1e-9, `${g.name}: ${d0} vs ${d1}`);
      }
      assert.ok(Number.isFinite(o[0]));
    }
  }
});

test("the averaged wave function has exactly the group's symmetry", () => {
  for (const g of GROUPS) {
    const lattice = LATTICES[g.lattice];
    for (const p of [
      [0.31, 0.17],
      [-1.4, 0.62],
      [2.2, -0.9],
    ]) {
      const v = F(p, g, terms);
      for (const op of g.ops) {
        const w = F(apply(p, op, lattice), g, terms);
        assert.ok(Math.hypot(v[0] - w[0], v[1] - w[1]) < 1e-9, `${g.name}`);
      }
      // Lattice translations too.
      const w = F([p[0] + lattice[0][0], p[1] + lattice[0][1]], g, terms);
      assert.ok(Math.hypot(v[0] - w[0], v[1] - w[1]) < 1e-9);
    }
  }
});

test("p6m is six-fold, p4 four-fold, and p1 has no rotation", () => {
  const byName = (n) => GROUPS.find((g) => g.name === n);
  const rot = ([x, y], a) => [
    x * Math.cos(a) - y * Math.sin(a),
    x * Math.sin(a) + y * Math.cos(a),
  ];
  const p = [0.37, 0.21];
  const close = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9;
  assert.ok(
    close(
      F(p, byName("p6m"), terms),
      F(rot(p, Math.PI / 3), byName("p6m"), terms),
    ),
  );
  assert.ok(
    close(
      F(p, byName("p4"), terms),
      F(rot(p, Math.PI / 2), byName("p4"), terms),
    ),
  );
  assert.ok(
    !close(F(p, byName("p1"), terms), F(rot(p, Math.PI), byName("p1"), terms)),
  );
});

test("every group has a look, and every look validates", () => {
  for (const value of wallpaper.type.values)
    assert.ok(
      wallpaper.presets.some((p) => p.params.group === value),
      GROUPS[value].name,
    );
  for (let i = 0; i < wallpaper.presets.length; i++) {
    const snapshot = presetSnapshot(wallpaper, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [wallpaper]),
      snapshot,
    );
  }
});
