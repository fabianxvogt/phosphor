import test from "node:test";
import assert from "node:assert/strict";
import sandpile, {
  toppleStep,
  stabilize,
  stabilizeSequential,
  identity,
  sources,
  BOARDS,
} from "../scene-sandpile.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const grid = (w, h, f) =>
  Int32Array.from({ length: w * h }, (_, i) => f(i % w, (i / w) | 0));

test("a cell of four topples one grain to each neighbour; edges lose grains", () => {
  const h = grid(3, 3, (x, y) => (x === 1 && y === 1 ? 4 : 0));
  const { next, unstable } = toppleStep(h, 3, 3);
  assert.equal(unstable, true);
  assert.deepEqual([...next], [0, 1, 0, 1, 0, 1, 0, 1, 0]);
  const corner = grid(2, 2, (x, y) => (x === 0 && y === 0 ? 4 : 0));
  assert.deepEqual([...toppleStep(corner, 2, 2).next], [0, 1, 1, 0]);
});

test("the parallel multi-topple reaches the same stable board as sequential toppling (abelian)", () => {
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
  for (let trial = 0; trial < 20; trial++) {
    const w = 5 + (trial % 7),
      h = 4 + (trial % 5);
    const start = grid(w, h, () => Math.floor(rand() * 12));
    assert.deepEqual(
      [...stabilize(start, w, h)],
      [...stabilizeSequential(start, w, h)],
    );
  }
});

test("a central pile is stable, D4-symmetric and uses only 0–3 grains", () => {
  const w = 41,
    h = 41;
  const pile = grid(w, h, (x, y) => (x === 20 && y === 20 ? 1500 : 0));
  const s = stabilize(pile, w, h);
  assert.ok(s.every((v) => v >= 0 && v <= 3));
  const at = (x, y) => s[y * w + x];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      assert.equal(at(x, y), at(w - 1 - x, y));
      assert.equal(at(x, y), at(y, x));
    }
  // Grains are conserved while nothing reaches the edge.
  assert.equal(
    s.reduce((a, b) => a + b, 0),
    1500,
  );
});

test("the identity of the 3×3 sandpile group is 2 1 2 / 1 0 1 / 2 1 2", () => {
  assert.deepEqual([...identity(3, 3)], [2, 1, 2, 1, 0, 1, 2, 1, 2]);
});

test("the identity is idempotent: e + e stabilises to e", () => {
  for (const [w, h] of [
    [6, 4],
    [9, 9],
    [16, 9],
  ]) {
    const e = identity(w, h);
    const twice = stabilize(
      e.map((v) => v * 2),
      w,
      h,
    );
    assert.deepEqual([...twice], [...e], `${w}×${h}`);
  }
});

test("source layouts place 1, 2, 3, 4 and 6 sources inside the board", () => {
  for (const [bw, bh] of BOARDS)
    for (let layout = 0; layout < 5; layout++)
      for (const turn of [0, 0.3, 0.77]) {
        const s = sources(layout, bw, bh, turn);
        assert.equal(s.length, [1, 2, 3, 4, 6][layout]);
        for (const [x, y] of s)
          assert.ok(x >= 0 && x < bw && y >= 0 && y < bh, `${x},${y}`);
      }
});

test("every look validates and the four variants are covered", () => {
  const scenes = [sandpile];
  assert.ok(sandpile.presets.length >= 8);
  for (const value of sandpile.type.values)
    assert.ok(
      sandpile.presets.some((p) => p.params.drop === value),
      value,
    );
  for (let i = 0; i < sandpile.presets.length; i++) {
    const snapshot = presetSnapshot(sandpile, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), scenes),
      snapshot,
    );
  }
  assert.equal(
    new Set(sandpile.presets.map((p) => p.name)).size,
    sandpile.presets.length,
  );
});
