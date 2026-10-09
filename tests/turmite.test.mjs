import test from "node:test";
import assert from "node:assert/strict";
import turmite, { RULES, ruleMask, runAnt } from "../scene-turmite.mjs";
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
