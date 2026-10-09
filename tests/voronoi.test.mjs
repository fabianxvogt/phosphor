import test from "node:test";
import assert from "node:assert/strict";
import voronoi, {
  mLen,
  nearest,
  lloydStep,
  torusDelta,
  WORLD,
} from "../scene-voronoi.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const randomSites = (n, seed) => {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: n }, () => [rnd(), rnd()]);
};

// Neighbours of every cell, from 4-adjacency on a sampling grid.
function neighbours(sites, p = 2, gw = 320, gh = 180) {
  const owner = new Int32Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++)
      owner[y * gw + x] = nearest([(x + 0.5) / gw, (y + 0.5) / gh], sites, p);
  const sets = sites.map(() => new Set());
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const a = owner[y * gw + x];
      for (const b of [
        owner[y * gw + ((x + 1) % gw)],
        owner[((y + 1) % gh) * gw + x],
      ])
        if (a !== b) (sets[a].add(b), sets[b].add(a));
    }
  return sets.map((s) => s.size);
}

// Coefficient of variation of nearest-neighbour distances.
function spread(sites) {
  const d = sites.map((s, i) =>
    Math.min(
      ...sites
        .filter((_, j) => j !== i)
        .map((t) => Math.hypot(...torusDelta(s, t))),
    ),
  );
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  return (
    Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length) / mean
  );
}

// Quantisation energy: mean squared distance to the nearest site.
function energy(sites, p = 2) {
  let e = 0,
    n = 0;
  for (let y = 0; y < 60; y++)
    for (let x = 0; x < 107; x++) {
      const q = [(x + 0.5) / 107, (y + 0.5) / 60];
      e += mLen(torusDelta(q, sites[nearest(q, sites, p)]), p) ** 2;
      n++;
    }
  return e / n;
}

test("Minkowski lengths: taxicab, Euclid, near-Chebyshev and p < 1", () => {
  assert.equal(mLen([1, 1], 1), 2);
  assert.equal(mLen([3, 4], 2), 5);
  assert.ok(Math.abs(mLen([1, 1], 16) - 2 ** (1 / 16)) < 1e-12);
  assert.ok(mLen([1, 1], 0.5) > 2); // the unit ball is a concave astroid
});

test("Lloyd's algorithm relaxes random cells into a honeycomb", () => {
  let sites = randomSites(48, 7);
  const e0 = energy(sites);
  const hex0 = neighbours(sites).filter((k) => k === 6).length / sites.length;
  for (let i = 0; i < 60; i++) sites = lloydStep(sites, { relax: 1 });
  const e1 = energy(sites);
  const counts = neighbours(sites);
  const hex1 = counts.filter((k) => k === 6).length / sites.length;
  assert.ok(e1 < e0 * 0.85, `energy ${e0} → ${e1}`);
  assert.ok(hex1 >= 0.7 && hex1 > hex0 + 0.25, `hexagons ${hex0} → ${hex1}`);
  // Spacing becomes uniform: nearest-neighbour distances stop scattering.
  assert.ok(spread(sites) < spread(randomSites(48, 7)) * 0.4);
  // Euler on the torus: the mean is exactly six.
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  assert.ok(Math.abs(mean - 6) < 0.3, `${mean}`);
});

test("the metric shapes the cells: taxicab and Euclid disagree", () => {
  const sites = [
    [0.3, 0.5],
    [0.62, 0.62],
  ];
  // A point the Euclidean metric gives to site 1 but taxicab to site 0.
  let found = false;
  for (let x = 0.3; x < 0.7 && !found; x += 0.01)
    for (let y = 0.3; y < 0.8 && !found; y += 0.01)
      if (nearest([x, y], sites, 2) !== nearest([x, y], sites, 1)) found = true;
  assert.ok(found);
  assert.deepEqual(WORLD, [16 / 9, 1]);
});

test("every look validates and all four variants are covered", () => {
  assert.ok(voronoi.presets.length >= 8);
  for (const value of voronoi.type.values)
    assert.ok(
      voronoi.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < voronoi.presets.length; i++) {
    const snapshot = presetSnapshot(voronoi, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [voronoi]),
      snapshot,
    );
  }
});
