import test from 'node:test';
import assert from 'node:assert/strict';
import { aquariumFoodStep, boundedFeedbackValue, cathedralShading, clamp, countPolylineIntersections, coupledRegimeFieldStep, coupledRegimeStep, evolutionContour, finiteArray, filteredInterference, interferenceField, lifecycleStressCheck, PHOSPHOR_FAMILY_CATALOG, qualityProfile, rayMarchCorridor, reactionDiffusionStep, resolutionAwareInterferenceFilter, seededRandom, stepElementary, topologyClosureError, topologyLoopPoint } from '../core.mjs';

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

test('quality profiles apply truthful output dimensions, cadence, and bounded work budgets', () => {
  const full = qualityProfile('1080'); const low = qualityProfile('720');
  assert.deepEqual([full.width, full.height, full.cadence], [960, 600, 60]);
  assert.deepEqual([low.width, low.height, low.cadence], [480, 300, 30]);
  assert.ok(low.cathedralWidth < full.cathedralWidth && low.interferenceWidth < full.interferenceWidth);
  assert.ok(low.magneticCap < full.magneticCap && low.aquariumCap < full.aquariumCap);
  assert.match(low.label, /target/); assert.doesNotMatch(low.label, /measured/i);
});

test('cathedral authored shading changes surface treatment beyond palette choice', () => {
  const matte = cathedralShading(1.4, 20, [.4, .2, .8], .2, .05, .9, .04);
  const charged = cathedralShading(1.4, 20, [.4, .2, .8], .9, .9, .1, .85);
  assert.ok(Number.isFinite(matte.value) && Number.isFinite(charged.value));
  assert.notEqual(matte.value, charged.value); assert.notEqual(matte.specular, charged.specular);
  assert.ok([matte, charged].every((value) => value.value >= 0 && value.value <= 1 && value.fogFactor >= 0 && value.fogFactor <= 1));
});

test('aquarium food is local, consumable, and cannot feed a starved inactive organism', () => {
  const fed = aquariumFoodStep(.4, .8, .02, .1, .8, 1 / 60);
  const far = aquariumFoodStep(.4, .8, .4, .1, .8, 1 / 60);
  const starved = aquariumFoodStep(.01, .8, .02, .1, .8, 1 / 60);
  assert.ok(fed.consumed > 0 && fed.energy > .4 && fed.patchAmount < .8);
  assert.equal(far.consumed, 0); assert.equal(starved.consumed, 0); assert.equal(starved.energy, .01);
});

test('evolution contours are deterministic and genotype-shaped', () => {
  const first = evolutionContour(.17, .22, .34, 1.2, .4, 40);
  const second = evolutionContour(.17, .22, .34, 1.2, .4, 40);
  const sibling = evolutionContour(1.17, .82, .9, 1.2, .4, 40);
  assert.deepEqual(first, second); assert.notDeepEqual(first, sibling);
  assert.equal(first.length, 41); assert.ok(first.flat().every((value) => Number.isFinite(value)));
});

test('resolution-aware interference filter increases footprint at lower output resolution', () => {
  const highResolution = resolutionAwareInterferenceFilter(1, -1, 960, 600, .2);
  const lowResolution = resolutionAwareInterferenceFilter(1, -1, 120, 75, .2);
  assert.ok(lowResolution < highResolution); assert.ok(highResolution >= -1 && highResolution <= 1); assert.ok(lowResolution >= -1 && lowResolution <= 1);
  assert.equal(resolutionAwareInterferenceFilter(.4, .4, 960, 600, .2), .4);
});

test('ray-marched cathedral families stay finite with capped steps', () => {
  for (let family = 0; family < 4; family += 1) for (let recursion = 1; recursion <= 6; recursion += 1) {
    const result = rayMarchCorridor([0, 0, -2], [.2, -.1, 1], family, recursion, 64);
    assert.equal(Number.isFinite(result.distance), true); assert.equal(Number.isInteger(result.steps), true); assert.ok(result.steps <= 64);
  }
});

test('topological loop families close position and tangent with bounded intersection detection', () => {
  for (let family = 0; family < 4; family += 1) {
    const closure = topologyClosureError(family, .73, .41, .2);
    assert.ok(closure.position < 1e-9); assert.ok(closure.tangent < 1e-5);
    const points = Array.from({ length: 65 }, (_, i) => topologyLoopPoint(family, i / 64, .73, .41, .2));
    assert.ok(Number.isInteger(countPolylineIntersections(points))); assert.ok(countPolylineIntersections(points) >= 0);
  }
});

test('coupled phase regimes stay finite and bounded through forward and return steps', () => {
  for (let model = 0; model < 3; model += 1) for (let regime = 0; regime < 6; regime += 1) {
    let value = .5; let returnPath = .45; let measuredGap = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      value = coupledRegimeStep(value, returnPath, .75, .9, .8, .2, 1 / 60, regime, model);
      returnPath = coupledRegimeStep(returnPath, value, .35, .7, .4, .8, 1 / 60, Math.max(0, regime - 1), model);
      measuredGap += Math.abs(value - returnPath);
    }
    assert.ok(Number.isFinite(value) && Number.isFinite(returnPath)); assert.ok(value >= 0 && value <= 1 && returnPath >= 0 && returnPath <= 1);
    assert.ok(measuredGap > 0);
  }
});

test('fixed Coupled Regime Field wrapper has deterministic return-path separation', () => {
  let main = .42;
  let returned = .31;
  for (let frame = 0; frame < 180; frame += 1) {
    main = coupledRegimeFieldStep(main, returned, .82, .86, .58, .24, 1 / 60, frame % 6);
    returned = coupledRegimeFieldStep(returned, main, .34, .72, .28, .82, 1 / 60, Math.max(0, frame % 6 - 1));
  }
  assert.ok(Number.isFinite(main) && Number.isFinite(returned));
  assert.ok(main >= 0 && main <= 1 && returned >= 0 && returned <= 1);
  assert.ok(Math.abs(main - returned) > .001);
});

test('ten-switch lifecycle fixture retains fixed renderer resources', () => {
  const result = lifecycleStressCheck(3, 10);
  assert.equal(result.switches, 10); assert.equal(result.retainedBuffers, 2); assert.equal(result.retainedRows, 120); assert.equal(result.retainedAcidCells, 9000);
});
