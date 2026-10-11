import test from "node:test";
import assert from "node:assert/strict";
import turmite, { RULES, ruleMask, runAnt, antFrame } from "../scene-turmite.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

test("rule masks: one bit per colour, set for a right turn", () => {
  assert.equal(ruleMask("RL"), 1);
  assert.equal(ruleMask("LLRR"), 12);
  assert.equal(ruleMask("RLR"), 5);
});

test("Langton's ant: chaos for about 10 000 steps, then the 104-step highway", () => {
  const pos = [];
  runAnt("RL", 12000, {
    w: 400,
    h: 400,
    track: (s, x, y) => (pos[s] = [x, y]),
  });
  const shift = (s) => [
    pos[s + 104][0] - pos[s][0],
    pos[s + 104][1] - pos[s][1],
  ];
  // On the highway: every 104 steps the ant moves two cells diagonally.
  for (let s = 10200; s < 11800; s += 37) {
    const [dx, dy] = shift(s);
    assert.ok(
      Math.abs(dx) === 2 && Math.abs(dy) === 2,
      `step ${s}: ${dx},${dy}`,
    );
  }
  // Before it, in the chaotic phase, it does not.
  let periodic = 0;
  for (let s = 2000; s < 9000; s += 37) {
    const [dx, dy] = shift(s);
    if (Math.abs(dx) === 2 && Math.abs(dy) === 2) periodic++;
  }
  assert.ok(periodic < 20, `${periodic}`);
});

test("LLRR grows a bloom that is mirror-symmetric whenever the ant comes home", () => {
  const w = 200,
    h = 200;
  const homes = [];
  runAnt("LLRR", 16000, {
    w,
    h,
    track: (s, x, y) => x === 100 && y === 100 && homes.push(s),
  });
  assert.ok(homes.length > 100, "the ant keeps returning to its start");
  const { grid } = runAnt("LLRR", homes.at(-1), { w, h });
  // Mirror about the line between rows 99 and 100.
  let cells = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (grid[y * w + x]) cells++;
      assert.equal(grid[y * w + x], grid[(199 - y) * w + x], `${x},${y}`);
    }
  assert.ok(cells > 200, `${cells} cells coloured`);
});

test("early ant structures fill a useful view without changing their rule state", () => {
  const ant = runAnt("RL", 3000);
  const before = Uint8Array.from(ant.grid);
  const frame = antFrame(ant.grid, [ant]);
  assert.ok(frame.span < 0.45, `early view span=${frame.span}`);
  assert.deepEqual(ant.grid, before);
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) {
    if (!ant.grid[y * 320 + x] && (x !== ant.x || y !== ant.y)) continue;
    assert.ok(x / 320 >= frame.center[0] - frame.span * 0.5);
    assert.ok((x + 1) / 320 <= frame.center[0] + frame.span * 0.5);
    assert.ok(y / 180 >= frame.center[1] - frame.span * 0.5);
    assert.ok((y + 1) / 180 <= frame.center[1] + frame.span * 0.5);
  }
});

test("framing includes zero-colour hot trails and every ant across torus boundaries", () => {
  const grid = new Uint8Array(320 * 180), heat = new Uint8Array(grid.length);
  heat[4 * 320 + 3] = 255;
  const ants = [{ x: 319, y: 179 }, { x: 120, y: 70 }];
  const frame = antFrame(grid, ants, { heat });
  for (const [x, y] of [[3, 4], ...ants.map((ant) => [ant.x, ant.y])]) {
    assert.ok(x / 320 >= frame.center[0] - frame.span * 0.5);
    assert.ok((x + 1) / 320 <= frame.center[0] + frame.span * 0.5);
    assert.ok(y / 180 >= frame.center[1] - frame.span * 0.5);
    assert.ok((y + 1) / 180 <= frame.center[1] + frame.span * 0.5);
  }
  assert.ok(frame.span > 1, "spanning activity fits the whole field with margin");
});

test("composition follows continuously rather than jumping with each ant step", () => {
  const grid = new Uint8Array(320 * 180), ants = [{ x: 270, y: 150 }];
  const previous = { center: [0.5, 0.5], span: 1 };
  const target = antFrame(grid, ants);
  const next = antFrame(grid, ants, { previous });
  assert.ok(next.center[0] > previous.center[0] && next.center[0] < target.center[0]);
  assert.ok(next.span < previous.span && next.span > target.span);
  let frame = previous;
  for (let tick = 0; tick < 120; tick++) frame = antFrame(grid, ants, { previous: frame });
  assert.ok(Math.abs(frame.center[0] - target.center[0]) < 0.01);
  assert.ok(Math.abs(frame.span - target.span) < 0.01);
});

test("every look validates and every rule is covered", () => {
  assert.ok(turmite.presets.length >= 8);
  for (const value of turmite.type.values)
    assert.ok(
      turmite.presets.some((p) => p.params.rule === value),
      RULES[value],
    );
  for (let i = 0; i < turmite.presets.length; i++) {
    const snapshot = presetSnapshot(turmite, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [turmite]),
      snapshot,
    );
  }
});
