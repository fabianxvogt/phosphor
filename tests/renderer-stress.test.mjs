import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedFeedbackValue, clamp, finiteArray, reactionDiffusionStep, seededRandom, stepElementary } from '../core.mjs';

function runBoundedRendererStress(seed, frames = 900) {
  const rand = seededRandom(seed);
  let acidU = new Float32Array(24 * 16).fill(1);
  let acidV = new Float32Array(24 * 16);
  acidV[Math.floor(acidV.length / 2)] = .9;
  let tapestry = Uint8Array.from({ length: 220 }, () => rand() > .84 ? 1 : 0);
  let feedback = 0;
  const particles = new Float32Array(480 * 4);
  const organisms = new Float32Array(64 * 6);
  let phaseField = new Float32Array(64 * 40);
  let phaseNext = new Float32Array(64 * 40);
  for (let i = 0; i < 480; i += 1) { particles[i * 4] = rand(); particles[i * 4 + 1] = rand(); particles[i * 4 + 2] = (rand() - .5) * .01; particles[i * 4 + 3] = (rand() - .5) * .01; }
  for (let i = 0; i < organisms.length; i += 6) { organisms[i] = rand(); organisms[i + 1] = rand(); organisms[i + 2] = (rand() - .5) * .01; organisms[i + 3] = (rand() - .5) * .01; organisms[i + 4] = .01 + rand() * .02; organisms[i + 5] = .45 + rand() * .55; }
  phaseField.fill(.5);
  let cathedrals = 0; let interference = 0; let topology = 0; let evolution = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    ({ u: acidU, v: acidV } = reactionDiffusionStep(acidU, acidV, 24, 16, .018 + (frame % 80) / 4000, .045, 1));
    tapestry = stepElementary(tapestry, 30 + (frame % 4) * 20);
    feedback = boundedFeedbackValue(feedback, (frame % 31) / 30, .72 + (frame % 20) / 100);
    for (let i = 0; i < 480; i += 1) { const index = i * 4; particles[index] = (particles[index] + particles[index + 2] + 1) % 1; particles[index + 1] = (particles[index + 1] + particles[index + 3] + 1) % 1; particles[index + 2] = clamp(particles[index + 2] + Math.sin(frame * .01 + i) * .0002, -.03, .03); particles[index + 3] = clamp(particles[index + 3] + Math.cos(frame * .013 + i) * .0002, -.03, .03); }
    for (let i = 0; i < 64; i += 1) { const index = i * 6; organisms[index] = (organisms[index] + organisms[index + 2] + 1) % 1; organisms[index + 1] = (organisms[index + 1] + organisms[index + 3] + 1) % 1; organisms[index + 2] = clamp(organisms[index + 2] + Math.sin(frame * .02 + i) * .0001, -.02, .02); organisms[index + 3] = clamp(organisms[index + 3] + Math.cos(frame * .017 + i) * .0001, -.02, .02); organisms[index + 5] = clamp(organisms[index + 5] + (.0007 - (frame % 97 === 0 ? .0012 : 0)), 0, 1); }
    for (let y = 0; y < 40; y += 1) for (let x = 0; x < 64; x += 1) { const index = y * 64 + x; const neighbor = (phaseField[y * 64 + (x + 63) % 64] + phaseField[y * 64 + (x + 1) % 64] + phaseField[((y + 39) % 40) * 64 + x] + phaseField[((y + 1) % 40) * 64 + x]) * .25; phaseNext[index] = clamp(phaseField[index] + (neighbor - phaseField[index]) * .12 + Math.sin(frame * .02 + x * .1 + y * .07) * .002, 0, 1); }
    [phaseField, phaseNext] = [phaseNext, phaseField];
    cathedrals = (cathedrals + .01) % (Math.PI * 2); interference = (interference + .013) % (Math.PI * 2); topology = (topology + .017) % (Math.PI * 2); evolution = (evolution + .009) % (Math.PI * 2);
    assert.equal(finiteArray(acidU) && finiteArray(acidV) && finiteArray(particles) && finiteArray(organisms) && finiteArray(phaseField), true);
    assert.ok([...acidU, ...acidV, ...particles, ...organisms, ...phaseField].every((value) => Number.isFinite(value)));
    assert.ok([...acidU, ...acidV, ...phaseField].every((value) => value >= 0 && value <= 1));
    assert.ok(Number.isFinite(feedback) && feedback >= 0 && feedback <= 1);
  }
  return [acidU[0], acidV[acidV.length - 1], tapestry[17], feedback, particles[3], organisms[19], phaseField[63], cathedrals, interference, topology, evolution].map((value) => Number(value.toFixed(8)));
}

test('ten-family bounded renderer stress is deterministic for 900 frames', () => {
  const first = runBoundedRendererStress(20260906);
  const second = runBoundedRendererStress(20260906);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, runBoundedRendererStress(20260907));
});
