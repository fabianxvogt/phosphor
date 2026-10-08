import test from "node:test";
import assert from "node:assert/strict";
import { Governor } from "../governor.mjs";

const SLOW = 40,
  FAST = 16.7;

test("a ray-marched family loses steps 96 → 64 → 40 before the pixel budget drops", () => {
  const g = new Governor([0.5, 1, 2.1], 2.1);
  assert.equal(g.assess(SLOW, "cathedral", true), null); // one slow window is not enough
  assert.deepEqual(g.assess(SLOW, "cathedral", true), { steps: 64 });
  g.assess(SLOW, "cathedral", true);
  assert.deepEqual(g.assess(SLOW, "cathedral", true), { steps: 40 });
  g.assess(SLOW, "cathedral", true);
  assert.deepEqual(g.assess(SLOW, "cathedral", true), { budget: 1 });
  assert.equal(g.stepReductions, 2);
  assert.equal(g.downgrades, 1);
});

test("a fast window resets the slow count; nothing ever comes back up", () => {
  const g = new Governor([0.5, 1, 2.1], 2.1);
  g.assess(SLOW, "cathedral", true);
  g.assess(FAST, "cathedral", true);
  assert.equal(g.assess(SLOW, "cathedral", true), null);
  g.assess(SLOW, "cathedral", true);
  for (let i = 0; i < 20; i++)
    assert.equal(g.assess(FAST, "cathedral", true), null);
  assert.equal(g.steps("cathedral"), 64);
});

test("step budgets are per family; other families go straight to the pixel budget", () => {
  const g = new Governor([0.5, 1, 2.1], 2.1);
  g.assess(SLOW, "cathedral", true);
  g.assess(SLOW, "cathedral", true);
  assert.equal(g.steps("cathedral"), 64);
  assert.equal(g.steps("flight"), 96);
  g.assess(SLOW, "acid", false);
  assert.deepEqual(g.assess(SLOW, "acid", false), { budget: 1 });
  assert.equal(g.steps("acid"), 96);
});

test("at the lowest budget a slow window changes nothing", () => {
  const g = new Governor([0.5, 1, 2.1], 0.5);
  g.assess(SLOW, "acid", false);
  assert.equal(g.assess(SLOW, "acid", false), null);
  assert.equal(g.budget, 0.5);
  assert.equal(g.downgrades, 0);
});
