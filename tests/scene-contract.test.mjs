import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const families = [
  ['47', 'acid', 'reaction'], ['51', 'tapestry', 'automaton'], ['52', 'feedback', 'feedback'],
  ['48', 'magnetic', 'particles'], ['49', 'cathedrals', 'geometry'], ['50', 'aquarium', 'aquarium'],
  ['53', 'interference', 'interference'], ['54', 'topology', 'topology'], ['55', 'phase', 'phase'], ['56', 'evolution', 'evolution'],
];

test('all ten families register one shared scene contract', () => {
  for (const [number, id, kind] of families) {
    assert.match(app, new RegExp(`id: '${id}'.*number: '${number}'.*kind: '${kind}'`, 's'), `${number} scene registration`);
    assert.match(app, new RegExp(`id: '${id}'.*presets: \\[([\\s\\S]*?)\\], schema:`, 's'), `${number} authored presets`);
  }
  assert.match(app, /function stepAndDraw\(dt\)[\s\S]*kind === 'evolution'/, 'renderer dispatch');
  assert.match(app, /function resetRenderer\(\)[\s\S]*kind === 'evolution'/, 'reset dispatch');
});

test('new family renderers keep fixed bounded resources in source', () => {
  assert.match(app, /magnetic: \{ count: 480, particles: new Float32Array\(480 \* 4\)/);
  assert.match(app, /aquarium: \{ count: 64, organisms: new Float32Array\(64 \* 6\)/);
  assert.match(app, /phase: \{ width: 64, height: 40, values: new Float32Array\(64 \* 40\)/);
  assert.match(app, /Math\.min\(b\.count, Math\.floor\(96 \+ p\.density \* 384\)\)/);
  assert.match(app, /Math\.min\(b\.count, Math\.floor\(4 \+ p\.population \* 60\)\)/);
  assert.match(app, /topologyLoopPoint\(p\.family/);
  assert.match(app, /countPolylineIntersections\(sampled\)/);
  assert.match(app, /keyframes: new Float32Array\(2 \* 5\)/);
  assert.match(app, /coupledRegimeStep\(b\.values/);
  assert.match(app, /b\.compareNext\[index\] = coupledRegimeStep/);
  assert.match(app, /p\.regime, p\.model/);
  assert.match(app, /function mutateEvolution\(\)/);
  assert.match(app, /lockedParameters/);
  assert.match(app, /evolution: state\.evolution/);
  assert.match(app, /resetRenderer\(\); renderScenes\(\); renderControls\(\); announce\(\); renderCues\(\);/);
  assert.doesNotMatch(app, /savedAt:/);
});
