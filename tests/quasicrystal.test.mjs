import test from "node:test";
import assert from "node:assert/strict";
import quasicrystal, {
  TILINGS,
  directions,
  offsets,
  rhombi,
  locate,
} from "../scene-quasicrystal.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

// Deterministic points spread over a large patch of tiling space.
function* points(n, size, seed = 1) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++)
    yield [(rnd() - 0.5) * size, (rnd() - 0.5) * size];
}

test("Penrose directions are the fifth roots of unity and Σγ = 0", () => {
  const e = directions(5);
  e.forEach(([x, y], j) => {
    assert.ok(Math.abs(x - Math.cos((2 * Math.PI * j) / 5)) < 1e-12);
    assert.ok(Math.abs(y - Math.sin((2 * Math.PI * j) / 5)) < 1e-12);
  });
  for (const phase of [0, 1.3, 77]) {
    const g = offsets(5, phase);
    assert.ok(Math.abs(g.reduce((a, b) => a + b, 0)) < 1e-12);
  }
});

test("the inverted multigrid covers the plane exactly once, for every tiling", () => {
  for (const D of TILINGS)
    for (const phase of [0.4, 2.9]) {
      const g = offsets(D, phase);
      for (const x of points(1500, 60, D * 7 + 1)) {
        const hits = rhombi(x, D, g);
        assert.equal(hits.length, 1, `D=${D} at ${x}`);
      }
    }
});

test("rhombus vertices are lattice points Σ K_j e_j and tiles share edges", () => {
  const D = 5;
  const g = offsets(D, 1.1);
  const e = directions(D);
  const hit = locate([3.3, -2.7], D, g);
  // Walk a hair across each edge of the tile; the neighbour shares that edge.
  const corner = (a, b) => [
    hit.v0[0] + a * e[hit.r][0] + b * e[hit.s][0],
    hit.v0[1] + a * e[hit.r][1] + b * e[hit.s][1],
  ];
  const outward = [
    [0.5, -0.001],
    [0.5, 1.001],
    [-0.001, 0.5],
    [1.001, 0.5],
  ];
  for (const [a, b] of outward) {
    const n = locate(corner(a, b), D, g);
    assert.ok(n, "neighbour exists");
    assert.ok(n.r === hit.r || n.s === hit.r || n.r === hit.s || n.s === hit.s);
  }
});

test("Penrose: thick and thin rhombi appear in the golden ratio", () => {
  const D = 5;
  const g = offsets(D, 0.7);
  let thick = 0;
  let n = 0;
  for (const x of points(20000, 400, 99)) {
    const hit = locate(x, D, g);
    const gap = hit.s - hit.r;
    if (Math.min(gap, D - gap) === 1) thick++;
    n++;
  }
  // Tile counts thick:thin = φ, so area fraction = φ sin72 / (φ sin72 + sin36).
  const phi = (1 + Math.sqrt(5)) / 2;
  const s72 = Math.sin((2 * Math.PI) / 5);
  const s36 = Math.sin(Math.PI / 5);
  const expected = (phi * s72) / (phi * s72 + s36);
  assert.ok(
    Math.abs(thick / n - expected) < 0.015,
    `${thick / n} vs ${expected}`,
  );
});

test("every look validates and all four tilings are covered", () => {
  assert.ok(quasicrystal.presets.length >= 8);
  for (const value of quasicrystal.type.values)
    assert.ok(
      quasicrystal.presets.some((p) => p.params.tiling === value),
      value,
    );
  for (let i = 0; i < quasicrystal.presets.length; i++) {
    const snapshot = presetSnapshot(quasicrystal, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [quasicrystal]),
      snapshot,
    );
  }
});
