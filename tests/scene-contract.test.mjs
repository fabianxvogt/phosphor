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
  assert.match(app, /mechanism: 'Gray–Scott reaction diffusion'/, 'honest mechanism labels');
  assert.match(app, /Start · \$\{item\.presets\[0\]\[0\]\}/, 'authored starting looks');
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
  assert.match(app, /coupledRegimeFieldStep\(b\.values/);
  assert.match(app, /b\.compareNext\[index\] = coupledRegimeFieldStep/);
  assert.doesNotMatch(app, /phaseModelNames/);
  assert.match(app, /const phaseModel = \{ id: 'coupled-regime-field-v1'/);
  assert.match(app, /const phaseArcs = \[/);
  assert.match(app, /function phaseArcAt\(/);
  assert.match(app, /function startPhaseArc\(/);
  assert.match(app, /function rehearsePhaseArcs\(/);
  assert.match(app, /phaseEvents: state\.phaseEvents/);
  assert.match(app, /phaseMeasurementArchive: state\.phaseMeasurementArchive/);
  assert.match(app, /phaseMeasurement: scene\(\)\.kind === 'phase' \? phaseMeasurement\(\) : null/);
  assert.match(app, /function sanitizePhaseMeasurementArchive\(/);
  assert.match(app, /function frameManifest\(/);
  assert.match(app, /id="capturePhaseMeasurementButton"/);
  assert.match(app, /Saved capture \(archived\)/);
  assert.match(app, /Live current/);
  assert.match(app, /id="playPhaseArcButton"/);
  assert.match(app, /id="rehearsePhaseArcsButton"/);
  assert.match(app, /resolutionAwareInterferenceFilter\(field, neighbors, canvas\.width, canvas\.height, p\.filter\)/);
  assert.match(app, /transitionGap/);
  assert.match(app, /function mutateEvolution\(\)/);
  assert.match(app, /lockedParameters/);
  assert.match(app, /const lockKeys = \['mutation', 'generation', 'lineage', 'focus'\]/);
  assert.match(app, /for \(const key of lockedParameters\) childParams\[key\] = parent\.params\[key\]/);
  assert.match(app, /paramsSnapshot: structuredClone\(node\.params\)/);
  assert.match(app, /evolution: state\.evolution/);
  assert.match(app, /function migrateSession\(data\)/);
  assert.match(app, /const safe = validateSession\(data\); const nextPresetIndex/);
  assert.match(app, /candidate\.presetIndex = \[\.\.\.candidate\.presetIndex, \.\.\.Array\(sceneDefs\.length - 3\)\.fill\(0\)\]/);
  assert.match(app, /state\.gesture = \{ x: \.5, y: \.5, active: false, scene: index \}/);
  assert.match(app, /function applyMagneticGesture\(/);
  assert.match(app, /function replayGestureSequence\(/);
  assert.match(app, /gestureHistory: state\.gestureHistory/);
  assert.match(app, /fieldA: \.92/);
  assert.match(app, /const presetConfig = sceneDefs\[index\]\.presets\[nextPreset\]\[3\]/);
  assert.match(app, /switchScene\(cue\.scene, cue\.preset, cue\)/);
  assert.match(app, /nodeId: node\.id, paramsSnapshot: structuredClone\(node\.params\)/);
  assert.match(app, /contextlost/);
  assert.match(app, /contextrestored/);
  assert.match(app, /const visibleSchema = state\.workflow === 'perform'/, 'progressive control modes');
  assert.match(app, /function toggleFocusMode\(/, 'canvas focus mode');
  assert.match(app, /resolutionAwareInterferenceFilter\(field, neighbors, canvas\.width, canvas\.height, p\.filter\)/);
  assert.match(app, /mutation: \.18, lock: 0, lockField: 0, generation: 1/);
  assert.match(app, /resetRenderer\(\); renderScenes\(\); renderControls\(\); announce\(\); renderCues\(\);/);
  assert.doesNotMatch(app, /savedAt:/);
});
