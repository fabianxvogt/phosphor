import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedFeedbackValue, clamp, finiteArray, filteredInterference, interferenceField, lifecycleStressCheck, PHOSPHOR_FAMILY_CATALOG, rayMarchCorridor, reactionDiffusionStep, seededRandom, stepElementary } from '../core.mjs';

test('elementary automaton fixture for rule 90 is exact', () => {
  const row = Uint8Array.from([0, 0, 0, 1, 0, 0, 0]);
  assert.deepEqual([...stepElementary(row, 90)], [0, 0, 1, 0, 1, 0, 0]);
});

test('seeded random replay is repeatable for Acid automatic injections', () => {
  const first = seededRandom(211); const second = seededRandom(211);
  assert.deepEqual(Array.from({ length: 32 }, () => first()), Array.from({ length: 32 }, () => second()));
});

test('reaction diffusion stays finite and bounded', () => {
  const u = new Float32Array(25).fill(1); const v = new Float32Array(25); v[12] = 1;
  const next = reactionDiffusionStep(u, v, 5, 5, .03, .055, 1);
  assert.equal(finiteArray(next.u), true); assert.equal(finiteArray(next.v), true);
  assert.equal(next.u.every((value) => value >= 0 && value <= 1), true);
  assert.equal(next.v.every((value) => value >= 0 && value <= 1), true);
});

test('clamp repairs non-finite input to the safe minimum', () => {
  assert.equal(clamp(Number.NaN, 0, 1), 0); assert.equal(clamp(2, 0, 1), 1); assert.equal(clamp(-1, 0, 1), 0);
});

test('the shared catalog keeps all ten Phosphor families in one repository', () => {
  assert.equal(PHOSPHOR_FAMILY_CATALOG.length, 10);
  assert.deepEqual(PHOSPHOR_FAMILY_CATALOG.map(([number]) => number), ['47', '48', '49', '50', '51', '52', '53', '54', '55', '56']);
});

test('feedback gain remains finite and clipped under an extreme stress run', () => {
  let energy = 0;
  for (let i = 0; i < 5000; i += 1) energy = boundedFeedbackValue(energy, 99, 99);
  assert.equal(Number.isFinite(energy), true);
  assert.ok(energy >= 0 && energy <= 1);
});

test('interference fields and resolution filter stay finite and bounded', () => {
  const values = Array.from({ length: 64 }, (_, index) => interferenceField((index % 8) / 8 - .5, Math.floor(index / 8) / 8 - .5, .37, 4, 2, .9, 1));
  assert.equal(finiteArray(values), true); assert.ok(values.every((value) => value >= -1 && value <= 1));
  const filtered = values.map((value) => filteredInterference(value, 1));
  assert.ok(filtered.every((value) => value >= 0 && value <= 1));
});

test('ray-marched cathedral families stay finite with capped steps', () => {
  for (let family = 0; family < 4; family += 1) for (let recursion = 1; recursion <= 6; recursion += 1) {
    const result = rayMarchCorridor([0, 0, -2], [.2, -.1, 1], family, recursion, 64);
    assert.equal(Number.isFinite(result.distance), true); assert.equal(Number.isInteger(result.steps), true); assert.ok(result.steps <= 64);
  }
});

test('ten-switch lifecycle fixture retains fixed renderer resources', () => {
  const result = lifecycleStressCheck(3, 10);
  assert.equal(result.switches, 10); assert.equal(result.retainedBuffers, 2); assert.equal(result.retainedRows, 120); assert.equal(result.retainedAcidCells, 9000);
});
