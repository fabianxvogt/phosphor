import test from 'node:test';
import assert from 'node:assert/strict';

class FakeContext {
  constructor(canvas) { this.canvas = canvas; this.fillRectCalls = 0; }
  createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; }
  getImageData(width, height) { return this.createImageData(width, height); }
  createRadialGradient() { return { addColorStop() {} }; }
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  fill() {}
  fillRect() { this.fillRectCalls += 1; }
  clearRect() {}
  arc() {}
  ellipse() {}
  rect() {}
  translate() {}
  rotate() {}
  scale() {}
  setTransform() {}
  drawImage() {}
  putImageData() {}
}

class FakeElement {
  constructor(id, document) { this.id = id; this.document = document; this.listeners = new Map(); this.children = []; this.style = {}; this.classList = { add() {}, remove() {}, toggle() {} }; this.dataset = {}; this.value = ''; this.checked = false; this.hidden = false; this.files = []; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  setAttribute(name, value) { this[name] = value; }
  click() { this.listeners.get('click')?.({ target: this }); }
  querySelectorAll(selector) { if (selector === '[data-scene]') return this.children.filter((child) => child.dataset.scene !== undefined); if (selector === '[data-preset]') return this.children.filter((child) => child.dataset.preset !== undefined); if (selector === '[data-remove-cue]') return this.children.filter((child) => child.dataset.removeCue !== undefined); return []; }
  dispatchEvent(event) { this.listeners.get(event.type)?.({ ...event, target: this }); }
  set innerHTML(html) { this._html = html; this.children = []; this._parse(html); }
  get innerHTML() { return this._html || ''; }
  insertAdjacentHTML(_position, html) { this._parse(html); }
  _parse(html) { const re = /<(button|input|select)\b([^>]*)>/g; let match; while ((match = re.exec(html))) { const [, tag, attributes] = match; const id = /id="([^"]+)"/.exec(attributes)?.[1]; const element = this.document.ensure(id || `${this.id || 'container'}-${tag}-${this.children.length}`); const scene = /data-scene="([^"]+)"/.exec(attributes); const preset = /data-preset="([^"]+)"/.exec(attributes); if (scene) element.dataset.scene = scene[1]; if (preset) element.dataset.preset = preset[1]; const value = /value="([^"]*)"/.exec(attributes); if (value) element.value = value[1]; this.children.push(element); } }
  remove() { this.document.elements.delete(this.id); }
  showModal() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 600 }; }
  setPointerCapture() {}
  matches() { return false; }
}

class FakeCanvas extends FakeElement {
  constructor(id, document) { super(id, document); this.width = 960; this.height = 600; this.context = new FakeContext(this); }
  getContext() { return this.context; }
  toBlob(callback) { callback(new Blob(['fake'])); }
}

class FakeDocument {
  constructor() { this.elements = new Map(); this.documentElement = { style: { setProperty() {} } }; this.body = { classList: { toggle() {} } }; }
  ensure(id) { if (!this.elements.has(id)) this.elements.set(id, id === 'stage' ? new FakeCanvas(id, this) : new FakeElement(id, this)); return this.elements.get(id); }
  getElementById(id) { return this.ensure(id); }
  createElement(tag) { return tag === 'canvas' ? new FakeCanvas('', this) : new FakeElement('', this); }
}

test('session repair validates transactionally, migrates legacy saves, and preserves cue/lineage snapshots', async () => {
  const document = new FakeDocument();
  for (const id of ['stage', 'sceneList', 'sceneControls', 'cueList', 'toast', 'presetStrip', 'qualityBadge', 'sceneKicker', 'scenePresetName', 'sceneDescription', 'controlHeading', 'tempoReadout', 'tempoOutput', 'dirtyState', 'saveReadout', 'cueCount', 'reducedMotionInput', 'brightnessInput', 'qualityInput', 'primaryColor', 'secondaryColor', 'accentColor', 'blackoutLabel', 'recordButton', 'demoAudioButton', 'playSetButton', 'transportState', 'modulationReadout', 'fpsReadout', 'startAudioButton', 'pauseButton', 'muteButton', 'micButton', 'importInput', 'audioFileInput', 'helpDialog', 'helpButton', 'themeButton', 'randomButton', 'resetButton', 'addCueButton', 'captureButton', 'frameExportButton', 'saveButton', 'exportButton']) document.ensure(id);
  globalThis.document = document; globalThis.window = globalThis; globalThis.addEventListener = () => {}; globalThis.location = { search: '' }; globalThis.performance = { now: () => 0 }; globalThis.requestAnimationFrame = () => 0; globalThis.localStorage = { data: new Map(), getItem(key) { return this.data.get(key) ?? null; }, setItem(key, value) { this.data.set(key, value); }, removeItem(key) { this.data.delete(key); } }; globalThis.FileReader = class {}; globalThis.URL.createObjectURL ??= () => 'blob:fake'; globalThis.URL.revokeObjectURL ??= () => {};
  await import(new URL('../app.js?session-contract', import.meta.url));
  const api = window.__phosphorTest;
  const baseline = structuredClone(api.sessionData());
  document.getElementById('performModeButton').click(); assert.equal(api.sessionData().options.workflow, 'perform'); assert.equal(document.getElementById('workflowHint').textContent, 'Essential controls'); document.getElementById('exploreModeButton').click(); assert.equal(api.sessionData().options.workflow, 'explore');
  const olderFull = structuredClone(baseline); delete olderFull.params.cathedrals.lighting; delete olderFull.params.cathedrals.material; delete olderFull.params.cathedrals.fog; delete olderFull.params.cathedrals.emission; api.applySession(olderFull); assert.equal(api.sessionData().params.cathedrals.lighting, baseline.params.cathedrals.lighting); assert.equal(api.sessionData().params.cathedrals.material, baseline.params.cathedrals.material);
  const quality = document.getElementById('qualityInput'); quality.value = '720'; quality.dispatchEvent({ type: 'change' }); assert.deepEqual([document.getElementById('stage').width, document.getElementById('stage').height], [480, 300]); assert.deepEqual([api.frameManifest().width, api.frameManifest().height, api.frameManifest().targetCadence], [480, 300, 30]); quality.value = '1080'; quality.dispatchEvent({ type: 'change' }); assert.deepEqual([document.getElementById('stage').width, document.getElementById('stage').height], [960, 600]); const stage = document.getElementById('stage'); const brightness = document.getElementById('brightnessInput'); brightness.value = '70'; brightness.dispatchEvent({ type: 'input' }); document.getElementById('pauseButton').click(); stage.context.fillRectCalls = 0; api.renderFrame(1); api.renderFrame(2); assert.equal(stage.context.fillRectCalls, 0); assert.equal(stage.style.filter, 'brightness(0.7)'); document.getElementById('pauseButton').click();
  api.switchScene(9, 0); assert.match(document.getElementById('stageActionHint').textContent, /CHOOSE SIBLING/); assert.match(document.getElementById('stage')['aria-label'], /choose sibling/); document.getElementById('mobilePauseButton').click(); assert.equal(document.getElementById('transportState').textContent, 'PAUSED'); document.getElementById('mobilePauseButton').click(); assert.equal(document.getElementById('transportState').textContent, 'RUNNING'); api.switchScene(3, 0); assert.match(document.getElementById('stageActionHint').textContent, /SHAPE FLOW/); assert.ok(api.sessionData().params.magnetic.density > .8); api.switchScene(5, 0); assert.match(document.getElementById('stageActionHint').textContent, /STEER FEEDERS TOWARD FOOD/); assert.ok(api.sessionData().params.aquarium.population > .2 && api.sessionData().params.aquarium.food > .7); document.getElementById('playSetButton').click(); assert.equal(document.getElementById('mobilePlayButton').textContent, document.getElementById('playSetButton').textContent); document.getElementById('playSetButton').click(); assert.equal(document.getElementById('mobilePlayButton').textContent, document.getElementById('playSetButton').textContent); api.applySession(baseline);

  const hostile = structuredClone(baseline); hostile.params.acid.growth = .63; hostile.evolution = { nodes: [null] };
  assert.throws(() => api.applySession(hostile), /Evolution lineage/);
  assert.deepEqual(api.sessionData(), baseline);

  const hostilePhase = structuredClone(baseline); hostilePhase.phaseEvents = [{ type: 'start', arc: 9, progress: 0, time: 0, tempo: 92 }];
  assert.throws(() => api.applySession(hostilePhase), /Phase event history/);
  assert.deepEqual(api.sessionData(), baseline);
  const hostileArchive = structuredClone(baseline); hostileArchive.phaseMeasurementArchive = { format: 'phosphor-phase-measurement-v0', version: 0, savedMeasurement: true, measurement: {} };
  assert.throws(() => api.applySession(hostileArchive), /Archived phase measurement/);
  assert.deepEqual(api.sessionData(), baseline);
  const hostileFrameMetadata = structuredClone(baseline); hostileFrameMetadata.phaseMeasurement = { model: 'invented', arcId: 'night-return' };
  assert.throws(() => api.applySession(hostileFrameMetadata), /Phase measurement metadata/);
  assert.deepEqual(api.sessionData(), baseline);

  const legacy = { ...structuredClone(baseline), presetIndex: baseline.presetIndex.slice(0, 3), params: { acid: baseline.params.acid, tapestry: baseline.params.tapestry, feedback: baseline.params.feedback }, cues: baseline.cues.filter((cue) => cue.scene < 3).slice(0, 1) };
  api.applySession(legacy);
  const migrated = api.sessionData();
  assert.equal(migrated.presetIndex.length, 10); assert.equal(migrated.params.acid.growth, baseline.params.acid.growth); assert.equal(migrated.params.tapestry.rule, baseline.params.tapestry.rule); assert.equal(migrated.cues[0].scene, legacy.cues[0].scene);

  api.switchScene(1, 2); assert.equal(api.sessionData().params.tapestry.rule, 30);
  api.switchScene(2, 2); assert.equal(api.sessionData().params.feedback.decay, .86);

  api.switchScene(9, 0); const rootId = api.sessionData().evolution.currentId; document.getElementById('mutateButton').click(); const mutated = api.sessionData(); const parentAfterMutation = mutated.evolution.nodes.find((node) => node.id === rootId); assert.equal(parentAfterMutation.children.length, 5); assert.equal(mutated.evolution.currentId, rootId); document.getElementById('chooseButton').click(); const selected = api.sessionData().evolution.nodes.find((node) => node.id === api.sessionData().evolution.selectedId); assert.ok(selected?.parent === rootId); assert.notEqual(selected.id, rootId); const liveSiblingGenome = api.evolutionRenderState().siblings; assert.ok(liveSiblingGenome.some((value) => value !== 0)); document.getElementById('promoteButton').click(); document.getElementById('saveButton').click(); const stored = JSON.parse(localStorage.getItem('phosphor-set-v1')); const promoted = stored.cues.find((cue) => cue.nodeId === selected.id); assert.ok(promoted?.paramsSnapshot); api.applySession(stored); assert.equal(api.sessionData().evolution.currentId, selected.id); assert.deepEqual(api.sessionData().params.evolution, promoted.paramsSnapshot); assert.deepEqual(api.evolutionRenderState().siblings, liveSiblingGenome); api.switchScene(0, 0); api.switchScene(9, promoted.preset, promoted); assert.deepEqual(api.evolutionRenderState().siblings, liveSiblingGenome);

  const lockedSetup = api.sessionData(); lockedSetup.params.evolution.lock = 1; lockedSetup.params.evolution.lockField = 0; api.applySession(lockedSetup); const parent = api.sessionData().evolution.nodes.find((node) => node.id === api.sessionData().evolution.currentId); api.mutateEvolution(); const child = api.sessionData().evolution.nodes.at(-1); assert.deepEqual(child.params.mutation, parent.params.mutation); assert.deepEqual(child.lockedParameters, ['mutation']);
  const fast = structuredClone(baseline); fast.tempo = 180; api.applySession(fast); api.switchScene(8, 1); const phaseSelect = document.getElementById('phaseArcSelect'); assert.ok(phaseSelect); phaseSelect.value = '1'; phaseSelect.dispatchEvent({ type: 'change' }); document.getElementById('playPhaseArcButton').click(); const firstArcPhases = new Set(); for (let frame = 0; frame < 700; frame += 1) { api.stepPhase(.05); firstArcPhases.add(api.phaseMeasurement().phase); } assert.ok(firstArcPhases.has('build')); assert.ok(firstArcPhases.has('transition')); assert.ok(firstArcPhases.has('release')); document.getElementById('stopPhaseArcButton').click();
  const phaseCues = api.sessionData().cues.filter((cue) => cue.scene === 8); assert.equal(phaseCues.length, 3); assert.deepEqual(phaseCues.map((cue) => cue.arc), [0, 1, 2]); api.switchScene(8, phaseCues[1].preset, phaseCues[1]); assert.equal(api.phaseMeasurement().arcId, 'glass-front'); assert.equal(api.phaseMeasurement().playing, true);
  document.getElementById('rehearsePhaseArcsButton').click(); for (let frame = 0; frame < 2200; frame += 1) api.stepPhase(.05); const phaseMeasurement = api.phaseMeasurement(); assert.equal(phaseMeasurement.arcId, 'night-return'); assert.equal(phaseMeasurement.progress, 1); assert.equal(phaseMeasurement.phase, 'release'); assert.equal(phaseMeasurement.playing, false); assert.ok(phaseMeasurement.traceSamples > 0); assert.deepEqual(api.sessionData().phaseMeasurement, phaseMeasurement); assert.ok(api.sessionData().phaseEvents.some((event) => event.type === 'complete' && event.arc === 2));
  document.getElementById('capturePhaseMeasurementButton').click(); const savedMeasurementSession = api.sessionData(); const archivedMeasurement = savedMeasurementSession.phaseMeasurementArchive; assert.equal(archivedMeasurement.format, 'phosphor-phase-measurement-v1'); assert.equal(archivedMeasurement.version, 1); assert.equal(archivedMeasurement.savedMeasurement, true); assert.equal(typeof archivedMeasurement.eventPosition, 'number'); assert.deepEqual(archivedMeasurement.measurement, phaseMeasurement); assert.deepEqual(api.frameManifest().phaseMeasurementArchive, archivedMeasurement); const capturedText = document.getElementById('phaseArchiveReadout').textContent; assert.match(capturedText, /Saved capture \(archived\)/); assert.match(capturedText, /Night Return/); assert.match(capturedText, /release/); assert.match(capturedText, /progress 1\.00/); assert.match(capturedText, /180 BPM/); assert.match(capturedText, /control/); assert.match(capturedText, /transition gap/); assert.match(capturedText, /model Coupled Regime Field/); assert.match(capturedText, /event \d+/);
  api.switchScene(0, 0); api.applySession(savedMeasurementSession); assert.deepEqual(api.sessionData().phaseMeasurementArchive, archivedMeasurement); assert.equal(api.phaseMeasurement().phase, 'idle'); assert.deepEqual(api.frameManifest().phaseMeasurementArchive, archivedMeasurement); const reopenedLiveText = document.getElementById('phaseActionReadout').textContent; const reopenedArchiveText = document.getElementById('phaseArchiveReadout').textContent; assert.match(reopenedLiveText, /Live current/); assert.match(reopenedLiveText, /idle/); assert.match(reopenedArchiveText, /Saved capture \(archived\)/); assert.match(reopenedArchiveText, /Night Return/); assert.match(reopenedArchiveText, /release/); assert.match(reopenedArchiveText, /progress 1\.00/); assert.notEqual(api.phaseMeasurement().phase, archivedMeasurement.measurement.phase); assert.notEqual(reopenedLiveText, reopenedArchiveText);
  api.switchScene(3, 0); const magneticStart = api.magneticRenderState().particles; assert.ok(magneticStart.some((value) => value !== 0)); for (let frame = 0; frame < 180; frame += 1) api.stepMagnetic(.016); const magneticAfter = api.magneticRenderState().particles; assert.ok(magneticAfter.every(Number.isFinite)); assert.ok(magneticAfter.some((value, index) => Math.abs(value - magneticStart[index]) > 0.00001)); const orbitRadii = []; const magneticState = api.magneticRenderState(); for (let i = 0; i < 449; i += 1) { const index = i * 4; const attractor = i % 2 ? 2 : 0; orbitRadii.push(Math.hypot(magneticState.particles[index] - magneticState.attractors[attractor], magneticState.particles[index + 1] - magneticState.attractors[attractor + 1])); } const meanOrbitRadius = orbitRadii.reduce((sum, value) => sum + value, 0) / orbitRadii.length; assert.ok(meanOrbitRadius > .05 && meanOrbitRadius < .3, `mean orbit radius ${meanOrbitRadius}`); api.setTestElapsed(0); api.inject(.2, .3, .8); api.setTestElapsed(.5); api.inject(.8, .7, .6); const timed = api.sessionData().gestureHistory.filter((event) => event.scene === 3); assert.equal(timed.length, 2); assert.equal(timed[0].timing, 'beat'); assert.ok(timed[1].beat > timed[0].beat); api.replayGestureSequence(); assert.deepEqual(api.magneticReplayState(), { index: 0, total: 2, playing: true }); document.getElementById('pauseButton').click(); api.setTestElapsed(2); api.stepMagnetic(.016); assert.equal(api.magneticReplayState().index, 0); document.getElementById('pauseButton').click(); api.stepMagnetic(.016); assert.ok(api.magneticReplayState().index >= 1); api.setTestElapsed(3); api.stepMagnetic(.016); assert.equal(api.magneticReplayState().playing, false); api.switchScene(0, 0);
  api.applySession(baseline);
});
