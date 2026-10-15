import test from "node:test";
import assert from "node:assert/strict";
import sandpile, {
  toppleStep,
  stabilize,
  stabilizeSequential,
  identity,
  sources,
  BOARDS,
  pileExtent,
  pileFrame,
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

test("display framing measures real occupied cells, including distant sources, without changing grains", () => {
  const height = grid(128, 72, (x, y) =>
    x >= 58 && x < 69 && y >= 31 && y < 42 ? 3 : 0,
  );
  const before = Int32Array.from(height);
  assert.deepEqual(pileExtent(height, 128, 72), {
    min: [58, 31],
    max: [69, 42],
  });
  const initial = pileFrame(pileExtent(height, 128, 72), 128, 72);
  assert.ok(initial.span < 0.4, "a young pile is displayed at a useful scale");
  height[10 * 128 + 20] = 1;
  const extent = pileExtent(height, 128, 72);
  assert.deepEqual(extent, { min: [20, 10], max: [69, 42] });
  pileFrame(extent, 128, 72);
  before[10 * 128 + 20] = 1;
  assert.deepEqual(
    height,
    before,
    "display measurements cannot modify the physical board",
  );
  assert.equal(pileExtent(new Int32Array(128 * 72), 128, 72), null);
});

test("framing keeps every occupied cell in view with margin on every board size", () => {
  for (const [width, rows] of BOARDS) {
    for (let sample = 0; sample < 30; sample++) {
      const lo = [
        Math.floor((width * sample) / 60),
        Math.floor((rows * sample) / 90),
      ];
      const hi = [
        width - Math.floor((width * sample) / 90),
        rows - Math.floor((rows * sample) / 60),
      ];
      const frame = pileFrame({ min: lo, max: hi }, width, rows);
      for (let axis = 0; axis < 2; axis++) {
        const dimension = [width, rows][axis];
        assert.ok(
          lo[axis] / dimension >= frame.center[axis] - frame.span * 0.5,
        );
        assert.ok(
          hi[axis] / dimension <= frame.center[axis] + frame.span * 0.5,
        );
      }
    }
    const rain = pileFrame({ min: [0, 0], max: [width, rows] }, width, rows, {
      full: true,
    });
    assert.deepEqual(rain, { center: [0.5, 0.5], span: 1 });
  }
});

test("camera movement eases toward growth and holds while the pile dissolves", () => {
  const extent = { min: [60, 25], max: [100, 68] };
  const previous = { center: [0.5, 0.5], span: 0.4 };
  const target = pileFrame(extent, 128, 72);
  const first = pileFrame(extent, 128, 72, { previous });
  assert.ok(first.span > previous.span && first.span < target.span);
  assert.ok(
    first.center[0] > previous.center[0] && first.center[0] < target.center[0],
  );
  let frame = previous;
  for (let tick = 0; tick < 120; tick++)
    frame = pileFrame(extent, 128, 72, { previous: frame });
  assert.ok(Math.abs(frame.span - target.span) < 0.01);
  assert.deepEqual(
    pileFrame(null, 128, 72, { previous: frame, hold: true }),
    frame,
  );
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
