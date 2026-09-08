import test from 'node:test';
import assert from 'node:assert/strict';

class FakeContext {
  constructor(canvas) { this.canvas = canvas; this.fillRectCalls = 0; this.drawOps = 0; this.drawImageFilters = []; this.resize(); }
  resize() { const width = this.canvas.width ?? this.canvas._width; const height = this.canvas.height ?? this.canvas._height; this.pixelData = new Uint8ClampedArray(width * height * 4); }
  color() { if (typeof this.fillStyle === 'string' && /^#[0-9a-f]{6}$/i.test(this.fillStyle)) return [parseInt(this.fillStyle.slice(1, 3), 16), parseInt(this.fillStyle.slice(3, 5), 16), parseInt(this.fillStyle.slice(5, 7), 16)]; return [255, 255, 255]; }
  createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; }
  getImageData(x, y, width, height) { const image = this.createImageData(width, height); for (let row = 0; row < height; row += 1) for (let col = 0; col < width; col += 1) { const source = ((y + row) * this.canvas.width + x + col) * 4; const target = (row * width + col) * 4; image.data.set(this.pixelData.slice(source, source + 4), target); } return image; }
  createRadialGradient() { return { addColorStop() {} }; }
  save() {}
  restore() {}
  beginPath() {}
  closePath() {}
  clip() {}
  moveTo() {}
  lineTo() {}
  stroke() { this.drawOps += 1; this.pixelData[0] = 255; this.pixelData[1] = 255; this.pixelData[2] = 255; }
  fill() { this.drawOps += 1; this.pixelData[0] = 255; this.pixelData[1] = 255; this.pixelData[2] = 255; }
  fillRect(x = 0, y = 0, width = this.canvas.width, height = this.canvas.height) { this.fillRectCalls += 1; this.drawOps += 1; const [red, green, blue] = this.color(); for (let row = Math.max(0, y); row < Math.min(this.canvas.height, y + height); row += 1) for (let col = Math.max(0, x); col < Math.min(this.canvas.width, x + width); col += 1) { const index = (row * this.canvas.width + col) * 4; this.pixelData[index] = red; this.pixelData[index + 1] = green; this.pixelData[index + 2] = blue; this.pixelData[index + 3] = 255; } }
  clearRect(x = 0, y = 0, width = this.canvas.width, height = this.canvas.height) { this.drawOps += 1; for (let row = Math.max(0, y); row < Math.min(this.canvas.height, y + height); row += 1) for (let col = Math.max(0, x); col < Math.min(this.canvas.width, x + width); col += 1) this.pixelData[(row * this.canvas.width + col) * 4 + 3] = 0; }
  arc() {}
  ellipse() {}
  rect() {}
  translate() {}
  rotate() {}
  scale() {}
  setTransform() {}
  drawImage(source) { this.drawOps += 1; this.drawImageFilters.push(this.filter || 'none'); const sourceContext = source?.context; if (!sourceContext?.pixelData) return; const sourceWidth = source.width; const sourceHeight = source.height; for (let row = 0; row < this.canvas.height; row += 1) for (let col = 0; col < this.canvas.width; col += 1) { const sourceRow = Math.min(sourceHeight - 1, Math.floor(row * sourceHeight / this.canvas.height)); const sourceCol = Math.min(sourceWidth - 1, Math.floor(col * sourceWidth / this.canvas.width)); const from = (sourceRow * sourceWidth + sourceCol) * 4; const to = (row * this.canvas.width + col) * 4; this.pixelData[to] = sourceContext.pixelData[from]; this.pixelData[to + 1] = sourceContext.pixelData[from + 1]; this.pixelData[to + 2] = sourceContext.pixelData[from + 2]; this.pixelData[to + 3] = sourceContext.pixelData[from + 3]; } }
  putImageData(image, x = 0, y = 0) { this.drawOps += 1; const width = Math.min(this.canvas.width - x, Math.floor(image.data.length / 4)); for (let row = 0; row < this.canvas.height - y && row * width * 4 < image.data.length; row += 1) for (let col = 0; col < width; col += 1) { const from = (row * width + col) * 4; const to = ((y + row) * this.canvas.width + x + col) * 4; this.pixelData[to] = image.data[from]; this.pixelData[to + 1] = image.data[from + 1]; this.pixelData[to + 2] = image.data[from + 2]; this.pixelData[to + 3] = image.data[from + 3]; } }
}

class FakeElement {
  constructor(id, document) { this.id = id; this.document = document; this.listeners = new Map(); this.children = []; this.style = {}; this.classList = { add() {}, remove() {}, toggle() {} }; this.dataset = {}; this.value = ''; this.checked = false; this.hidden = false; this.files = []; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  setAttribute(name, value) { this[name] = value; }
  click() { if (this.disabled) return; this.listeners.get('click')?.({ target: this }); }
  querySelectorAll(selector) { if (selector === '[data-scene]') return this.children.filter((child) => child.dataset.scene !== undefined); if (selector === '[data-preset]') return this.children.filter((child) => child.dataset.preset !== undefined); if (selector === '[data-remove-cue]') return this.children.filter((child) => child.dataset.removeCue !== undefined); return []; }
  dispatchEvent(event) { if (this.disabled && ['input', 'change', 'click'].includes(event.type)) return; this.listeners.get(event.type)?.({ ...event, target: this }); }
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
  constructor(id, document) { super(id, document); this._width = 960; this._height = 600; this.context = new FakeContext(this); Object.defineProperty(this, 'width', { get: () => this._width, set: (value) => { this._width = Number(value); this.context.resize(); } }); Object.defineProperty(this, 'height', { get: () => this._height, set: (value) => { this._height = Number(value); this.context.resize(); } }); this.context.resize(); this.toBlobCalls = 0; }
  getContext() { return this.context; }
  toBlob(callback) { this.toBlobCalls += 1; callback(new Blob(['fake'], { type: 'image/png' })); }
}

class FakeDocument {
  constructor() { this.elements = new Map(); this.documentElement = { style: { setProperty() {} } }; this.body = { classList: { toggle() {} } }; }
  ensure(id) { if (!this.elements.has(id)) this.elements.set(id, id === 'stage' ? new FakeCanvas(id, this) : new FakeElement(id, this)); return this.elements.get(id); }
  getElementById(id) { return this.ensure(id); }
  createElement(tag) { return tag === 'canvas' ? new FakeCanvas('', this) : new FakeElement('', this); }
}

test('session repair validates transactionally, migrates legacy saves, and preserves cue/lineage snapshots', async () => {
  const document = new FakeDocument();
  for (const id of ['stage', 'sceneList', 'sceneControls', 'cueList', 'toast', 'presetStrip', 'qualityBadge', 'sceneKicker', 'scenePresetName', 'sceneDescription', 'controlHeading', 'tempoReadout', 'tempoOutput', 'dirtyState', 'saveReadout', 'cueCount', 'reducedMotionInput', 'brightnessInput', 'qualityInput', 'primaryColor', 'secondaryColor', 'accentColor', 'blackoutLabel', 'recordButton', 'demoAudioButton', 'playSetButton', 'transportState', 'modulationReadout', 'fpsReadout', 'startAudioButton', 'pauseButton', 'muteButton', 'micButton', 'importInput', 'audioFileInput', 'helpDialog', 'helpButton', 'themeButton', 'randomButton', 'resetButton', 'addCueButton', 'captureButton', 'frameExportButton', 'frameImportInput', 'frameCountInput', 'frameRenderButton', 'frameCancelButton', 'frameProgress', 'saveButton', 'exportButton']) document.ensure(id);
  const windowListeners = new Map();
  const fireWindow = (type, event) => { for (const callback of windowListeners.get(type) || []) callback(event); };
  globalThis.document = document; globalThis.window = globalThis; globalThis.addEventListener = (type, callback) => { if (!windowListeners.has(type)) windowListeners.set(type, []); windowListeners.get(type).push(callback); }; globalThis.location = { search: '' }; globalThis.performance = { now: () => 0 }; globalThis.requestAnimationFrame = () => 0; globalThis.localStorage = { data: new Map(), getItem(key) { return this.data.get(key) ?? null; }, setItem(key, value) { this.data.set(key, value); }, removeItem(key) { this.data.delete(key); } }; globalThis.FileReader = class {}; globalThis.URL.createObjectURL ??= () => 'blob:fake'; globalThis.URL.revokeObjectURL ??= () => {};
  await import(new URL('../app.js?session-contract', import.meta.url));
  const api = window.__phosphorTest;
  const baseline = structuredClone(api.sessionData());
  const scoreInput = { ...structuredClone(baseline), activeScene: 7, tempo: 96, cues: structuredClone(api.performanceScoreCues), options: { ...baseline.options, quality: '720', workflow: 'perform' } }; const score = api.validateSession(scoreInput); assert.equal(score.cues.length, 9); assert.equal(score.cues.reduce((sum, cue) => sum + cue.duration, 0), 576); assert.ok(score.cues.every((cue) => cue.sceneParamsSnapshot && cue.paletteSnapshot && cue.effectsSnapshot)); api.applySession(scoreInput); assert.deepEqual(api.sessionData().cues[0].sceneParamsSnapshot, score.cues[0].sceneParamsSnapshot); assert.deepEqual(api.sessionData().cues[0].paletteSnapshot, score.cues[0].paletteSnapshot); assert.deepEqual(api.sessionData().cues[0].effectsSnapshot, score.cues[0].effectsSnapshot); document.getElementById('playSetButton').click(); assert.equal(api.sessionData().activeScene, 0); assert.equal(api.sessionData().params.acid.growth, score.cues[0].sceneParamsSnapshot.growth); assert.equal(api.sessionData().palette.primary, score.cues[0].paletteSnapshot.primary); document.getElementById('playSetButton').click(); api.applySession(baseline); const priorSet = structuredClone(api.sessionData()); document.getElementById('loadScoreButton').click(); assert.equal(api.sessionData().cues.length, 9); document.getElementById('restoreScoreButton').click(); assert.deepEqual(api.sessionData().cues, priorSet.cues); assert.equal(document.getElementById('restoreScoreButton').hidden, true);
  document.getElementById('performModeButton').click(); assert.equal(api.sessionData().options.workflow, 'perform'); assert.equal(document.getElementById('workflowHint').textContent, 'Essential controls'); document.getElementById('exploreModeButton').click(); assert.equal(api.sessionData().options.workflow, 'explore');
  const olderFull = structuredClone(baseline); delete olderFull.params.cathedrals.lighting; delete olderFull.params.cathedrals.material; delete olderFull.params.cathedrals.fog; delete olderFull.params.cathedrals.emission; api.applySession(olderFull); assert.equal(api.sessionData().params.cathedrals.lighting, baseline.params.cathedrals.lighting); assert.equal(api.sessionData().params.cathedrals.material, baseline.params.cathedrals.material);
  const quality = document.getElementById('qualityInput'); quality.value = '720'; quality.dispatchEvent({ type: 'change' }); assert.deepEqual([document.getElementById('stage').width, document.getElementById('stage').height], [480, 300]); assert.deepEqual([api.frameManifest().width, api.frameManifest().height, api.frameManifest().targetCadence], [480, 300, 30]); quality.value = '1080'; quality.dispatchEvent({ type: 'change' }); assert.deepEqual([document.getElementById('stage').width, document.getElementById('stage').height], [960, 600]); const stage = document.getElementById('stage'); const brightness = document.getElementById('brightnessInput'); brightness.value = '70'; brightness.dispatchEvent({ type: 'input' }); const captured = api.compositeOutputFrame(); assert.deepEqual([captured.width, captured.height], [960, 600]); assert.equal(captured.context.drawImageFilters.at(-1), 'brightness(0.7)'); brightness.value = '100'; brightness.dispatchEvent({ type: 'input' }); api.compositeOutputFrame(); assert.equal(captured.context.drawImageFilters.at(-1), 'none'); brightness.value = '70'; brightness.dispatchEvent({ type: 'input' }); document.getElementById('pauseButton').click(); stage.context.fillRectCalls = 0; api.renderFrame(1); api.renderFrame(2); assert.equal(stage.context.fillRectCalls, 0); assert.equal(stage.style.filter, 'brightness(0.7)'); api.compositeOutputFrame(); assert.equal(captured.context.drawImageFilters.at(-1), 'brightness(0.7)'); document.getElementById('pauseButton').click();
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
  assert.equal(migrated.presetIndex.length, api.sceneDefs.length); assert.equal(migrated.params.acid.growth, baseline.params.acid.growth); assert.equal(migrated.params.tapestry.rule, baseline.params.tapestry.rule); assert.equal(migrated.cues[0].scene, legacy.cues[0].scene);

  api.switchScene(1, 2); assert.equal(api.sessionData().params.tapestry.rule, 30);
  api.switchScene(2, 2); assert.equal(api.sessionData().params.feedback.decay, .86);

  api.switchScene(9, 0); const rootId = api.sessionData().evolution.currentId; document.getElementById('mutateButton').click(); const mutated = api.sessionData(); const parentAfterMutation = mutated.evolution.nodes.find((node) => node.id === rootId); assert.equal(parentAfterMutation.children.length, 5); assert.equal(mutated.evolution.currentId, rootId); document.getElementById('chooseButton').click(); const selected = api.sessionData().evolution.nodes.find((node) => node.id === api.sessionData().evolution.selectedId); assert.ok(selected?.parent === rootId); assert.notEqual(selected.id, rootId); const liveSiblingGenome = api.evolutionRenderState().siblings; assert.ok(liveSiblingGenome.some((value) => value !== 0)); document.getElementById('promoteButton').click(); document.getElementById('saveButton').click(); const stored = JSON.parse(localStorage.getItem('phosphor-set-v1')); const promoted = stored.cues.find((cue) => cue.nodeId === selected.id); assert.ok(promoted?.paramsSnapshot); api.applySession(stored); assert.equal(api.sessionData().evolution.currentId, selected.id); assert.deepEqual(api.sessionData().params.evolution, promoted.paramsSnapshot); assert.deepEqual(api.evolutionRenderState().siblings, liveSiblingGenome); api.switchScene(0, 0); api.switchScene(9, promoted.preset, promoted); assert.deepEqual(api.evolutionRenderState().siblings, liveSiblingGenome);

  const lockedSetup = api.sessionData(); lockedSetup.params.evolution.lock = 1; lockedSetup.params.evolution.lockField = 0; api.applySession(lockedSetup); const parent = api.sessionData().evolution.nodes.find((node) => node.id === api.sessionData().evolution.currentId); api.mutateEvolution(); const child = api.sessionData().evolution.nodes.at(-1); assert.deepEqual(child.params.mutation, parent.params.mutation); assert.deepEqual(child.lockedParameters, ['mutation']);
  const fast = structuredClone(baseline); fast.tempo = 180; api.applySession(fast); api.switchScene(8, 1); const phaseSelect = document.getElementById('phaseArcSelect'); assert.ok(phaseSelect); phaseSelect.value = '1'; phaseSelect.dispatchEvent({ type: 'change' }); document.getElementById('playPhaseArcButton').click(); const firstArcPhases = new Set(); for (let frame = 0; frame < 700; frame += 1) { api.stepPhase(.05); firstArcPhases.add(api.phaseMeasurement().phase); } assert.ok(firstArcPhases.has('build')); assert.ok(firstArcPhases.has('transition')); assert.ok(firstArcPhases.has('release')); document.getElementById('stopPhaseArcButton').click();
  const phaseCues = api.sessionData().cues.filter((cue) => cue.scene === 8); assert.equal(phaseCues.length, 3); assert.deepEqual(phaseCues.map((cue) => cue.arc), [0, 1, 2]); api.switchScene(8, phaseCues[1].preset, phaseCues[1]); assert.equal(api.phaseMeasurement().arcId, 'glass-front'); assert.equal(api.phaseMeasurement().playing, true);
  document.getElementById('rehearsePhaseArcsButton').click(); for (let frame = 0; frame < 2200; frame += 1) api.stepPhase(.05); const phaseMeasurement = api.phaseMeasurement(); assert.equal(phaseMeasurement.arcId, 'night-return'); assert.equal(phaseMeasurement.progress, 1); assert.equal(phaseMeasurement.phase, 'release'); assert.equal(phaseMeasurement.playing, false); assert.ok(phaseMeasurement.traceSamples > 0); assert.deepEqual(api.sessionData().phaseMeasurement, phaseMeasurement); assert.ok(api.sessionData().phaseEvents.some((event) => event.type === 'complete' && event.arc === 2));
  document.getElementById('capturePhaseMeasurementButton').click(); const savedMeasurementSession = api.sessionData(); const archivedMeasurement = savedMeasurementSession.phaseMeasurementArchive; assert.equal(archivedMeasurement.format, 'phosphor-phase-measurement-v1'); assert.equal(archivedMeasurement.version, 1); assert.equal(archivedMeasurement.savedMeasurement, true); assert.equal(typeof archivedMeasurement.eventPosition, 'number'); assert.deepEqual(archivedMeasurement.measurement, phaseMeasurement); assert.deepEqual(api.frameManifest().phaseMeasurementArchive, archivedMeasurement); const capturedText = document.getElementById('phaseArchiveReadout').textContent; assert.match(capturedText, /Saved capture \(archived\)/); assert.match(capturedText, /Night Return/); assert.match(capturedText, /release/); assert.match(capturedText, /progress 1\.00/); assert.match(capturedText, /180 BPM/); assert.match(capturedText, /control/); assert.match(capturedText, /transition gap/); assert.match(capturedText, /model Driven Regime Field/); assert.match(capturedText, /event \d+/);
  api.switchScene(0, 0); api.applySession(savedMeasurementSession); assert.deepEqual(api.sessionData().phaseMeasurementArchive, archivedMeasurement); assert.equal(api.phaseMeasurement().phase, 'idle'); assert.deepEqual(api.frameManifest().phaseMeasurementArchive, archivedMeasurement); const reopenedLiveText = document.getElementById('phaseActionReadout').textContent; const reopenedArchiveText = document.getElementById('phaseArchiveReadout').textContent; assert.match(reopenedLiveText, /Live current/); assert.match(reopenedLiveText, /idle/); assert.match(reopenedArchiveText, /Saved capture \(archived\)/); assert.match(reopenedArchiveText, /Night Return/); assert.match(reopenedArchiveText, /release/); assert.match(reopenedArchiveText, /progress 1\.00/); assert.notEqual(api.phaseMeasurement().phase, archivedMeasurement.measurement.phase); assert.notEqual(reopenedLiveText, reopenedArchiveText);
  api.switchScene(3, 0); const magneticStart = api.magneticRenderState().particles; assert.ok(magneticStart.some((value) => value !== 0)); for (let frame = 0; frame < 180; frame += 1) api.stepMagnetic(.016); const magneticAfter = api.magneticRenderState().particles; assert.ok(magneticAfter.every(Number.isFinite)); assert.ok(magneticAfter.some((value, index) => Math.abs(value - magneticStart[index]) > 0.00001)); const orbitRadii = []; const magneticState = api.magneticRenderState(); for (let i = 0; i < 449; i += 1) { const index = i * 4; const attractor = i % 2 ? 2 : 0; orbitRadii.push(Math.hypot(magneticState.particles[index] - magneticState.attractors[attractor], magneticState.particles[index + 1] - magneticState.attractors[attractor + 1])); } const meanOrbitRadius = orbitRadii.reduce((sum, value) => sum + value, 0) / orbitRadii.length; assert.ok(meanOrbitRadius > .05 && meanOrbitRadius < .3, `mean orbit radius ${meanOrbitRadius}`); api.setTestElapsed(0); api.inject(.2, .3, .8); api.setTestElapsed(.5); api.inject(.8, .7, .6); const timed = api.sessionData().gestureHistory.filter((event) => event.scene === 3); assert.equal(timed.length, 2); assert.equal(timed[0].timing, 'beat'); assert.ok(timed[1].beat > timed[0].beat); api.replayGestureSequence(); assert.deepEqual(api.magneticReplayState(), { index: 0, total: 2, playing: true }); document.getElementById('pauseButton').click(); api.setTestElapsed(2); api.stepMagnetic(.016); assert.equal(api.magneticReplayState().index, 0); document.getElementById('pauseButton').click(); api.stepMagnetic(.016); assert.ok(api.magneticReplayState().index >= 1); api.setTestElapsed(3); api.stepMagnetic(.016); assert.equal(api.magneticReplayState().playing, false); api.switchScene(0, 0);
  api.applySession(baseline);
  document.getElementById('frameCountInput').value = '2';
  const offlineBase = structuredClone(api.sessionData());
  const frameRecords = [];
  let writesInFlight = 0;
  let maxWritesInFlight = 0;
  for (let sceneIndex = 0; sceneIndex < api.sceneDefs.length; sceneIndex += 1) {
    const candidate = structuredClone(offlineBase);
    candidate.activeScene = sceneIndex;
    candidate.options.quality = sceneIndex % 2 === 0 ? '1080' : '720';
    api.applySession(candidate);
    assert.equal(api.sessionData().activeScene, sceneIndex);
    if (sceneIndex === 9) assert.ok(api.sessionData().evolution);
    const manifest = api.frameManifest();
    const beforeRuntime = api.renderRuntimeState();
    const beforeOps = document.getElementById('stage').context.drawOps;
    const start = frameRecords.length;
    const result = await api.renderOfflineFrames(JSON.parse(JSON.stringify(manifest)), { writer: { async writeFrame(name, blob, metadata) {
      assert.equal(blob.type, 'image/png');
      assert.ok(blob.size > 0);
      writesInFlight += 1;
      maxWritesInFlight = Math.max(maxWritesInFlight, writesInFlight);
      await Promise.resolve();
      frameRecords.push({ name, ...metadata });
      writesInFlight -= 1;
    } } });
    assert.equal(result.status, 'complete');
    assert.equal(result.written, 2);
    const records = frameRecords.slice(start);
    assert.deepEqual(records.map(({ name }) => name), [`phosphor-${manifest.scene}-001.png`, `phosphor-${manifest.scene}-002.png`]);
    assert.deepEqual(records.map(({ width, height }) => [width, height]), [[manifest.width, manifest.height], [manifest.width, manifest.height]]);
    assert.deepEqual(records.map(({ time }) => time), [0, manifest.stepSeconds]);
    assert.deepEqual(records.map(({ frameClock }) => frameClock), [manifest.frameClock, manifest.frameClock]);
    assert.ok(records.every(({ scene, params }) => scene === manifest.scene && JSON.stringify(params) === JSON.stringify(manifest.params)));
    assert.ok(document.getElementById('stage').context.drawOps > beforeOps);
    if (manifest.scene === 'acid' || manifest.scene === 'phase') assert.ok(api.stagePixelStats().visiblePixels > 0, `${manifest.scene} restored preview has visible pixels`);
    const restoredRuntime = api.renderRuntimeState();
    assert.equal(restoredRuntime.elapsed, 0);
    assert.equal(restoredRuntime.cadenceAccumulator, 0);
    assert.equal(restoredRuntime.paused, true);
    assert.equal(restoredRuntime.topologyPhase, beforeRuntime.topologyPhase);
    assert.equal(restoredRuntime.topologyIntersections, beforeRuntime.topologyIntersections);
    assert.equal(document.getElementById('pauseButton').textContent, 'Resume');
    assert.equal(api.sessionData().activeScene, sceneIndex);
  }
  assert.equal(frameRecords.length, api.sceneDefs.length * 2);
  assert.equal(maxWritesInFlight, 1);

  const phasePlanSession = structuredClone(api.sessionData());
  api.switchScene(8, 0);
  api.applySession(api.sessionData());
  const phasePlan = api.frameManifest();
  const phaseBeforeOffline = api.renderRuntimeState();
  const runPhase = async () => { let renderedPhase = null; const result = await api.renderOfflineFrames(phasePlan, { writer: { async writeFrame() { renderedPhase = api.interferenceRenderState().phase; } } }); assert.equal(result.status, 'complete'); return renderedPhase; };
  const phaseFirst = await runPhase();
  const phaseSecond = await runPhase();
  assert.equal(phaseSecond, phaseFirst);
  const phaseAfterOffline = api.renderRuntimeState();
  assert.deepEqual(phaseAfterOffline.phaseValues, phaseBeforeOffline.phaseValues);
  assert.deepEqual(phaseAfterOffline.phaseCompare, phaseBeforeOffline.phaseCompare);
  assert.equal(phaseAfterOffline.phaseSeed, phaseBeforeOffline.phaseSeed);
  assert.equal(phaseAfterOffline.elapsed, 0);
  assert.equal(phaseAfterOffline.cadenceAccumulator, 0);
  assert.ok(api.stagePixelStats().visiblePixels > 0);
  api.applySession(phasePlanSession);

  assert.throws(() => api.validateFrameManifest({ format: 'phosphor-frame-sequence-v1', version: 1 }), /Legacy frame recipe v1/);
  const planRoundTrip = api.frameManifest();
  assert.deepEqual(api.validateFrameManifest(JSON.parse(JSON.stringify(planRoundTrip))), planRoundTrip);

  api.switchScene(6, 0);
  api.applySession(api.sessionData());
  const interferencePlan = api.frameManifest();
  api.setTestAudioLevel(.9);
  let staleAudioPhase = null;
  await api.renderOfflineFrames(interferencePlan, { writer: { async writeFrame() { staleAudioPhase = api.interferenceRenderState().phase; } } });
  api.setTestAudioLevel(0);
  let cleanAudioPhase = null;
  await api.renderOfflineFrames(interferencePlan, { writer: { async writeFrame() { cleanAudioPhase = api.interferenceRenderState().phase; } } });
  assert.equal(staleAudioPhase, cleanAudioPhase);

  api.applySession(baseline);
  const racePlan = api.frameManifest();
  let releaseWriter;
  const writerGate = new Promise((resolve) => { releaseWriter = resolve; });
  let writerEntered = false;
  const racePromise = api.renderOfflineFrames(racePlan, { writer: { async writeFrame() { writerEntered = true; await writerGate; } } });
  for (let attempt = 0; attempt < 4 && !writerEntered; attempt += 1) await Promise.resolve();
  assert.equal(writerEntered, true);
  const raceBefore = structuredClone(api.sessionData());
  document.getElementById('qualityInput').value = '720';
  document.getElementById('qualityInput').dispatchEvent({ type: 'change' });
  document.getElementById('saveButton').click();
  document.getElementById('sceneList').children[1]?.click();
  assert.deepEqual(api.sessionData(), raceBefore);
  assert.equal(api.cancelOfflineRender(), true);
  releaseWriter();
  const raceResult = await racePromise;
  assert.equal(raceResult.status, 'canceled');
  assert.deepEqual(api.sessionData(), raceBefore);

  const pendingPickerPlan = api.frameManifest();
  let releasePicker;
  const pickerGate = new Promise((resolve) => { releasePicker = resolve; });
  globalThis.showDirectoryPicker = async () => { await pickerGate; const error = new DOMException('User canceled', 'AbortError'); throw error; };
  const pickerPromise = api.renderOfflineFrames(pendingPickerPlan);
  await Promise.resolve();
  await assert.rejects(api.renderOfflineFrames(pendingPickerPlan), /already running/);
  const pickerBefore = structuredClone(api.sessionData());
  releasePicker();
  const pickerResult = await pickerPromise;
  assert.equal(pickerResult.status, 'canceled');
  assert.deepEqual(api.sessionData(), pickerBefore);
  delete globalThis.showDirectoryPicker;

  const adapterState = { parentWrites: new Map(), folders: new Map() };
  const adapterDirectory = {
    async getDirectoryHandle(name, options) {
      if (!options.create) { if (adapterState.folders.has(name)) return adapterState.folders.get(name); throw Object.assign(new Error('missing'), { name: 'NotFoundError' }); }
      const folder = { files: new Map(), async getFileHandle(fileName) { const file = { bytes: null, async createWritable() { return { async write(blob) { file.bytes = await blob.arrayBuffer(); }, async close() {}, async abort() {} }; } }; folder.files.set(fileName, file); return file; } };
      adapterState.folders.set(name, folder); return folder;
    },
    async getFileHandle(name) { return { async createWritable() { return { async write(blob) { adapterState.parentWrites.set(name, await blob.arrayBuffer()); }, async close() {} }; } }; }
  };
  const oldBytes = new Uint8Array([1, 2, 3]); adapterState.parentWrites.set('phosphor-acid-001.png', oldBytes.buffer);
  const writer = api.frameDirectoryWriter(adapterDirectory);
  await writer.writeFrame('phosphor-acid-001.png', new Blob(['new'], { type: 'image/png' }));
  assert.deepEqual(Array.from(new Uint8Array(adapterState.parentWrites.get('phosphor-acid-001.png'))), [1, 2, 3]);
  assert.equal(adapterState.folders.size, 1);
  const folder = [...adapterState.folders.values()][0];
  assert.deepEqual(Array.from(new Uint8Array(folder.files.get('phosphor-acid-001.png').bytes)), Array.from(new Uint8Array(await new Blob(['new']).arrayBuffer())));

  api.applySession(offlineBase);
  api.switchScene(9, 0);
  document.getElementById('mutateButton').click();
  document.getElementById('chooseButton').click();
  api.applySession(api.sessionData());
  const evolutionManifest = api.frameManifest();
  const selectedEvolutionId = evolutionManifest.initialState.evolution.selectedId;
  assert.ok(selectedEvolutionId !== evolutionManifest.initialState.evolution.nodes[0].id);
  const importedEvolution = api.importFrameManifest(JSON.parse(JSON.stringify(evolutionManifest)));
  assert.equal(importedEvolution.initialState.evolution.selectedId, selectedEvolutionId);

  const deterministicPlan = { ...evolutionManifest, frames: 2 };
  const collectRun = async () => { const records = []; const result = await api.renderOfflineFrames(deterministicPlan, { writer: { async writeFrame(name, blob, metadata) { records.push({ name, time: metadata.time, scene: metadata.scene, params: metadata.params }); } } }); assert.equal(result.status, 'complete'); return records; };
  const firstRun = await collectRun();
  const secondRun = await collectRun();
  assert.deepEqual(secondRun, firstRun);
  assert.equal(api.sessionData().activeScene, 9);

  const invalidBefore = structuredClone(api.sessionData());
  const invalidPlan = { ...deterministicPlan, frames: 241 };
  await assert.rejects(api.renderOfflineFrames(invalidPlan, { writer: { async writeFrame() { throw new Error('must not write'); } } }), /1–240/);
  assert.deepEqual(api.sessionData(), invalidBefore);
  const missingStep = { ...deterministicPlan }; delete missingStep.stepSeconds;
  await assert.rejects(api.renderOfflineFrames(missingStep, { writer: { async writeFrame() { throw new Error('must not write'); } } }), /size, cadence, and step/);
  assert.deepEqual(api.sessionData(), invalidBefore);

  const cancelRecords = [];
  const cancelSessionBefore = structuredClone(api.sessionData());
  const canceled = await api.renderOfflineFrames(deterministicPlan, { writer: { async writeFrame(name) { cancelRecords.push(name); if (cancelRecords.length === 1) api.cancelOfflineRender(); } } });
  assert.equal(canceled.status, 'canceled');
  assert.equal(canceled.written, 1);
  assert.equal(cancelRecords.length, 1);
  assert.equal(document.getElementById('frameCancelButton').hidden, true);
  assert.deepEqual(api.sessionData(), cancelSessionBefore);
  assert.ok(api.stagePixelStats().visiblePixels > 0);
  assert.equal(api.renderRuntimeState().elapsed, 0);

  let failedWrites = 0;
  const failureSessionBefore = structuredClone(api.sessionData());
  const failed = await api.renderOfflineFrames(deterministicPlan, { writer: { async writeFrame() { failedWrites += 1; if (failedWrites === 2) throw new Error('disk full'); } } });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.written, 1);
  assert.match(failed.error, /disk full/);
  assert.deepEqual(api.sessionData(), failureSessionBefore);
  assert.ok(api.stagePixelStats().visiblePixels > 0);
  assert.equal(api.renderRuntimeState().elapsed, 0);

  api.setTestRenderFlags({ blackout: true, renderingLost: false });
  const blackoutSession = structuredClone(api.sessionData());
  const blackoutResult = await api.renderOfflineFrames(deterministicPlan, { writer: { async writeFrame() {} } });
  assert.equal(blackoutResult.status, 'complete');
  assert.deepEqual(api.sessionData(), blackoutSession);
  assert.equal(api.renderRuntimeState().blackout, true);
  assert.equal(api.stagePixelStats().visiblePixels, 0);
  api.setTestRenderFlags({ blackout: false, renderingLost: false });

  api.restoreOfflineSnapshot({ session: structuredClone(api.sessionData()), paused: true, blackout: false, renderingLost: true, audioLevel: 0, gesture: { x: .5, y: .5, active: false, scene: 9 } });
  assert.equal(api.renderRuntimeState().renderingLost, true);
  assert.equal(api.stagePixelStats().visiblePixels, 0);
  api.setTestRenderFlags({ renderingLost: false });
  const unsupported = await api.renderOfflineFrames(deterministicPlan);
  assert.equal(unsupported.status, 'unsupported');
  assert.match(document.getElementById('frameProgress').textContent, /Batch folder output unavailable/);

  {
  // New-family migration retains old looks, and malformed transport imports remain transactional.
  const ten = structuredClone(baseline); ten.presetIndex = ten.presetIndex.slice(0, 10);
  delete ten.params.julia; delete ten.params.fourspace; delete ten.params.hyperbolic;
  assert.equal(api.validateSession(ten).presetIndex.length, 14);
  const thirteen = structuredClone(baseline); thirteen.presetIndex = thirteen.presetIndex.slice(0, 13); delete thirteen.params.fractal; const migratedThirteen = api.validateSession(thirteen); assert.equal(migratedThirteen.presetIndex.length, 14); assert.deepEqual(migratedThirteen.params.hyperbolic, baseline.params.hyperbolic);
  for (const change of [{ activeScene: 2.5 }, { tempo: 'bad' }, { presetIndex: [NaN, ...baseline.presetIndex.slice(1)] }]) {
    const before = structuredClone(api.sessionData()); assert.throws(() => api.applySession({ ...baseline, ...change })); assert.deepEqual(api.sessionData(), before);
  }
  api.applySession({ ...structuredClone(baseline), activeScene: 9, evolution: null });
  api.mutateEvolution(); const firstChildren = [...api.sessionData().evolution.nodes[0].children];
  api.mutateEvolution(); const secondChildren = [...api.sessionData().evolution.nodes[0].children];
  assert.equal(secondChildren.length, 5); assert.ok(secondChildren.every(id => !firstChildren.includes(id)));
  api.chooseEvolutionChild(4); assert.equal(api.sessionData().evolution.selectedId, secondChildren[4]);
  api.chooseEvolutionChild(1); assert.equal(api.sessionData().evolution.selectedId, secondChildren[1]);
  assert.doesNotThrow(() => api.validateFrameManifest(api.frameManifest()));
  // Artist controls are not destructively overwritten by audio modulation.
  const paramsBeforeAudio = structuredClone(api.sessionData().params); api.setTestAudioLevel(.8); api.stepAndDraw(1/60);
  assert.deepEqual(api.sessionData().params, paramsBeforeAudio); api.setTestAudioLevel(0);
  // Scene palette changes are remembered when switching and survive round trips.
  const color = document.getElementById('primaryColor'); color.value = '#aa1177'; color.dispatchEvent({ type: 'input' });
  api.switchScene(11, 0); assert.equal(api.sessionData().palette.primary, '#d5ff5f');
  api.switchScene(9, 0); assert.equal(api.sessionData().palette.primary, '#aa1177');
  api.applySession(structuredClone(api.sessionData())); assert.equal(api.sessionData().palette.primary, '#aa1177');
  // Effects are present in both portable sessions and executable frame plans.
  document.getElementById('tripStackButton').click(); const stack = structuredClone(api.sessionData().options.effects);
  assert.ok(stack.symmetry > 0 && stack.echo > 0 && stack.chroma > 0 && stack.glow > 0);
  document.getElementById('frameCountInput').value = '2'; const layered = api.frameManifest();
  assert.deepEqual(api.validateFrameManifest(layered).settings.effects, stack);
  assert.equal((await api.renderOfflineFrames(layered, { writer: { async writeFrame() {} } })).status, 'complete');
  assert.deepEqual(api.sessionData().options.effects, stack);
  api.switchScene(8, 0); document.getElementById('frameCountInput').value = '1';
  const phasePlan = api.frameManifest(); assert.equal(phasePlan.phaseModel, 'driven-regime-field-v2');
  assert.equal(api.validateFrameManifest(phasePlan).phaseModel, phasePlan.phaseModel);
  const oldPhasePlan = structuredClone(phasePlan); delete oldPhasePlan.phaseModel; assert.throws(() => api.validateFrameManifest(oldPhasePlan), /Phase model changed/);
  assert.equal((await api.renderOfflineFrames(phasePlan, { writer: { async writeFrame() {} } })).status, 'complete');
  // An external set invalidates a previously imported plan, only after validation succeeds.
  api.importFrameManifest(phasePlan); assert.ok(api.pendingFramePlan());
  assert.throws(() => api.applySession({ ...baseline, tempo: 'invalid' })); assert.ok(api.pendingFramePlan());
  api.applySession(baseline); assert.equal(api.pendingFramePlan(), null);
  // Seed 2560 triggers automatic Acid injection on the first 30 Hz step.
  api.applySession({ ...structuredClone(baseline), activeScene: 0, options: { ...baseline.options, quality: '720' } });
  api.resetAcid(2560); api.setTestElapsed(0); api.stepAcid(1/30); const liveAcid = api.acidRenderState();
  const acidPlan = { ...api.frameManifest(), seed: 2560, frames: 1 }; let offlineAcid;
  assert.equal((await api.renderOfflineFrames(acidPlan, { writer: { async writeFrame() { offlineAcid = api.acidRenderState(); } } })).status, 'complete');
  assert.deepEqual(offlineAcid, liveAcid, 'offline simulation retains automatic growth injections');
  // Blend real translucent backgrounds in the mock to detect repeated paused repaint accumulation.
  const rawFill = stage.context.fillRect;
  stage.context.fillRect = function(...args) {
    const rgba = /^rgba\((\d+),(\d+),(\d+),([.\d]+)\)$/.exec(this.fillStyle);
    const previous = rgba ? this.pixelData.slice() : null;
    rawFill.apply(this, args);
    if (rgba) for (let i = 0; i < this.pixelData.length; i += 4) for (let channel = 0; channel < 3; channel++) this.pixelData[i + channel] = Number(rgba[4]) * Number(rgba[channel + 1]) + (1 - Number(rgba[4])) * previous[i + channel];
  };
  for (const activeScene of [3, 5]) {
    api.applySession({ ...structuredClone(baseline), activeScene, options: { ...baseline.options, quality: '720' } });
    api.drawPreview(); const once = stage.context.pixelData.slice(); api.drawPreview();
    assert.deepEqual(stage.context.pixelData, once, 'paused trail scene redraw is idempotent');
  }
  stage.context.fillRect = rawFill;
  // Recording cannot restart until the old stop callback completes; stale callbacks are inert.
  const streams = [], recorders = [];
  FakeCanvas.prototype.captureStream = function() { const track = { stopped: false, stop() { this.stopped = true; } }; const stream = { track, getTracks: () => [track], addTrack() {} }; streams.push(stream); return stream; };
  globalThis.MediaRecorder = class {
    static isTypeSupported() { return true; }
    constructor(stream) { this.stream = stream; this.state = 'inactive'; recorders.push(this); }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; }
  };
  api.toggleRecord(); const oldRecorder = recorders[0]; const oldData = oldRecorder.ondataavailable; const oldStop = oldRecorder.onstop;
  api.toggleRecord(); api.toggleRecord(); assert.equal(recorders.length, 1, 'restart waits for finalization');
  oldData({ data: new Blob(['first']) }); oldStop(); assert.equal(streams[0].track.stopped, true);
  api.toggleRecord(); assert.equal(recorders.length, 2);
  oldData({ data: new Blob(['stale']) }); oldStop(); assert.equal(api.recordingState().chunks, 0); assert.equal(streams[1].track.stopped, false); assert.equal(api.recordingState().recorder, recorders[1]);
  api.finishRecording(false); delete FakeCanvas.prototype.captureStream; delete globalThis.MediaRecorder;
  api.applySession(baseline);
  }
  api.applySession(baseline);
  // Camera positions survive portable sessions and cue snapshots without resuming held movement.
  const flightSet = structuredClone(baseline); flightSet.activeScene = 13;
  flightSet.flight.pose = { position: [0, 0, .25], yaw: .7, pitch: -.2 };
  api.applySession(flightSet); assert.deepEqual(api.sessionData().flight, flightSet.flight);
  document.getElementById('addCueButton').click();
  assert.deepEqual(api.sessionData().cues.at(-1).flightPose, flightSet.flight.pose);
  const capturedFlight = structuredClone(api.sessionData()); api.applySession(capturedFlight);
  assert.deepEqual(api.sessionData().cues.at(-1).flightPose, flightSet.flight.pose);
  assert.equal(api.flightState().cruise, false); assert.deepEqual(api.flightState().keys, []);
  const poseOnlyCue = { label: 'Pose-only flight cue', scene: 13, preset: 0, duration: 1, flightPose: { position: [0, 0, .25], yaw: .7, pitch: -.2 } };
  const poseOnlySet = { ...structuredClone(capturedFlight), activeScene: 0, cues: [poseOnlyCue] };
  api.applySession(poseOnlySet); document.getElementById('playSetButton').click();
  assert.deepEqual(api.flightState().pose, poseOnlyCue.flightPose, 'cue pose restores without optional scene snapshot');
  document.getElementById('playSetButton').click(); api.applySession(capturedFlight);
  const badFlight = structuredClone(capturedFlight); badFlight.flight.pose.position[0] = 'broken';
  assert.throws(() => api.applySession(badFlight), /Flight pose/);
  assert.deepEqual(api.sessionData().flight, capturedFlight.flight);
  const legacyFlight = structuredClone(flightSet); delete legacyFlight.flight;
  assert.doesNotThrow(() => api.validateSession(legacyFlight));
  document.getElementById('frameCountInput').value = '2';
  const flightPlan = api.frameManifest(); assert.equal(flightPlan.fractalWorld, 'recursive-passages-v1');
  assert.deepEqual(flightPlan.initialState.pose, capturedFlight.flight.pose);
  const keyEvent = (code, target = document.getElementById('stage')) => ({ code, key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code, target, preventDefault() {}, stopImmediatePropagation() {} });
  api.setTestRenderFlags({ blackout: false, renderingLost: false });
  if (api.renderRuntimeState().paused) document.getElementById('pauseButton').click();
  const beforeMove = api.flightState().pose;
  fireWindow('keydown', keyEvent('KeyW')); api.stepFlight(.05);
  assert.notDeepEqual(api.flightState().pose.position, beforeMove.position);
  fireWindow('keyup', keyEvent('KeyW')); const released = api.flightState().pose;
  api.stepFlight(.05); assert.deepEqual(api.flightState().pose, released);
  fireWindow('keydown', keyEvent('KeyD')); fireWindow('blur', {}); api.stepFlight(.05);
  assert.deepEqual(api.flightState().pose, released, 'window blur clears held travel');
  document.getElementById('pauseButton').click(); fireWindow('keydown', keyEvent('KeyW')); api.stepFlight(.05);
  assert.deepEqual(api.flightState().pose, released, 'paused key presses do not queue travel');
  document.getElementById('pauseButton').click();
  fireWindow('keydown', keyEvent('KeyW', { matches: () => true })); api.stepFlight(.05);
  assert.deepEqual(api.flightState().pose, released, 'typing does not move the camera');
  const focusedButton = { matches: selector => selector === 'button' };
  fireWindow('keydown', keyEvent('KeyW', focusedButton));
  fireWindow('keydown', keyEvent('KeyP', focusedButton));
  assert.equal(api.renderRuntimeState().paused, true, 'P remains a panic pause while a flight button has focus');
  assert.deepEqual(api.flightState().keys, []);
  document.getElementById('pauseButton').click();
  fireWindow('keydown', keyEvent('KeyB', focusedButton)); assert.equal(api.renderRuntimeState().blackout, true);
  const editableInput = { matches: selector => selector.includes('input') };
  fireWindow('keydown', keyEvent('Space', editableInput)); assert.equal(api.renderRuntimeState().blackout, true, 'editable input retains Space while blackout is active');
  fireWindow('keydown', keyEvent('Space', focusedButton)); assert.equal(api.renderRuntimeState().blackout, false, 'Space recovers blackout even when a flight button has focus');
  const collisionSet = structuredClone(capturedFlight); collisionSet.flight.pose = { position: [0, .82, .82], yaw: 0, pitch: .6 };
  api.applySession(collisionSet); fireWindow('keydown', keyEvent('KeyW')); for (let frame = 0; frame < 12; frame += 1) api.stepFlight(.05); fireWindow('keyup', keyEvent('KeyW'));
  assert.equal(api.flightState().blocked, true, 'flight reports the collision boundary');
  document.getElementById('resetButton').click(); assert.equal(api.flightState().blocked, false, 'Reset clears stale collision state');
  api.applySession(collisionSet); assert.equal(api.flightState().blocked, false, 'Import clears stale collision state');
  const surfaceSave = structuredClone(capturedFlight); surfaceSave.flight.pose.position = [1.5, 1.5, 1.5];
  assert.throws(() => api.validateSession(surfaceSave), /inside a surface/);
  const oldFlightPlan = structuredClone(flightPlan); delete oldFlightPlan.fractalWorld;
  assert.throws(() => api.validateFrameManifest(oldFlightPlan), /Flight world changed/);
  const movingPlan = structuredClone(flightPlan); movingPlan.initialState.cruise = true;
  const routeFrames = [];
  const frameRun = await api.renderOfflineFrames(movingPlan, { writer: { async writeFrame() { routeFrames.push(api.flightState().pose); fireWindow('blur', {}); } } });
  assert.equal(frameRun.status, 'complete'); assert.equal(routeFrames.length, 2);
  assert.notDeepEqual(routeFrames[0].position, routeFrames[1].position, 'window blur cannot alter a saved offline route');
  assert.equal(api.flightState().cruise, false);
  const missingPosePlan = structuredClone(flightPlan); missingPosePlan.initialState = null;
  assert.throws(() => api.validateFrameManifest(missingPosePlan), /Flight frame start/);
  api.switchScene(0, 0); assert.equal(api.flightState().blocked, false, 'Scene switch clears stale collision state');
  api.applySession(baseline);
  const repeatedLoadPrior = structuredClone(api.sessionData()); document.getElementById('loadScoreButton').click(); document.getElementById('loadScoreButton').click(); document.getElementById('restoreScoreButton').click(); assert.deepEqual(api.sessionData().cues, repeatedLoadPrior.cues); assert.equal(document.getElementById('restoreScoreButton').hidden, true);
});
