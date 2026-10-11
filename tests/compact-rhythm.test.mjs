import test from "node:test";
import assert from "node:assert/strict";
import { editCompactStep, rhythmPreviewSteps } from "../control-rhythm.mjs";

test("clicking a subdivision preserves hits and loop duration while refining the grid", () => {
  const track = { division: 1, length: 3, steps: [1, 0, 0.55] };
  const next = editCompactStep(track, 0, 1);
  assert.equal(next.division, 4);
  assert.equal(next.length, 12);
  assert.deepEqual(next.steps, [1, 0.55, 0, 0, 0, 0, 0, 0, 0.55, 0, 0, 0]);
  assert.deepEqual(track.steps, [1, 0, 0.55]);
});
test("editing later bars maps to the displayed cell of independent loops", () => {
  const track = { division: 2, length: 12, steps: Array(12).fill(0) };
  const next = editCompactStep(track, 1, 4, true);
  assert.equal(next.division, 2);
  assert.equal(next.steps[10], 1);
  assert.equal(rhythmPreviewSteps(next, 4)[4], 1);
  const wrapped = editCompactStep(next, 1, 12, true);
  assert.equal(wrapped.steps[2], 1);
});
