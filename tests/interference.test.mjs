import test from 'node:test';
import assert from 'node:assert/strict';
import interference from '../scene-interference.mjs';
import { presetSnapshot, validateSnapshot } from '../session.mjs';
import { Engine } from '../engine.mjs';

const scenes = [interference];

test('interference exposes three compositions, each covered by authored looks', () => {
  assert.deepEqual(interference.type, { key: 'composition', values: [0, 1, 2] });
  const selector = interference.schema.find(({ key }) => key === 'composition');
  assert.equal(selector.max, 2);
  for (const value of interference.type.values)
    assert.ok(interference.presets.some(({ params }) => params.composition === value));
  for (let i = 0; i < interference.presets.length; i++) {
    const snapshot = presetSnapshot(interference, i);
    assert.ok(interference.type.values.includes(snapshot.params.composition));
    assert.deepEqual(validateSnapshot(JSON.parse(JSON.stringify(snapshot)), scenes), snapshot);
  }
});

test('every authored interference look retains its type and palette across the energy ladder', () => {
  const engine = Object.create(Engine.prototype);
  Object.assign(engine, { counters: { nonFinite: 0 }, uniformFrame: 0 });
  for (let i = 0; i < interference.presets.length; i++) {
    const slot = {
      scene: interference, snapshot: presetSnapshot(interference, i), baseLevel: 0.5,
      params: new Float32Array(interference.schema.length),
    };
    const ladder = [0.1, 0.5, 0.9].map(level => {
      engine.level = level;
      engine.uniformFrame++;
      engine.updateUniforms(slot);
      return Array.from(slot.params);
    });
    assert.ok(ladder[0][6] < ladder[1][6] && ladder[1][6] < ladder[2][6], interference.presets[i].name);
    for (const params of ladder) {
      assert.equal(params[0], slot.snapshot.params.composition);
      assert.equal(params[5], ladder[1][5]);
      assert.ok(params.every(Number.isFinite));
    }
  }
  assert.equal(engine.counters.nonFinite, 0);
});

test('interference kick weights drive the shared layer in energy order', () => {
  const engine = Object.create(Engine.prototype);
  Object.assign(engine, {
    slots: [{ scene: interference }], options: {}, beatFx: {}, counters: { nonFinite: 0 },
    speed: 1, beat: 8, levelDuration: 0, lastKickBeat: null, flashHeld: false,
  });
  const responses = [0.1, 0.5, 0.9].map(level => {
    engine.level = level;
    engine.updatePerformance(1 / 60, false);
    return { ...engine.beatFx };
  });
  assert.equal(responses[0].punch, 0);
  assert.equal(responses[0].pulse, 0);
  assert.ok(responses[1].punch < responses[2].punch);
  assert.ok(responses[1].pulse < responses[2].pulse);
  assert.ok(responses[2].punch > 0.05);
  assert.ok(responses[2].pulse > 0.4);
  engine.beat = 8.5;
  engine.updatePerformance(1 / 60, false);
  assert.ok(engine.beatFx.punch < responses[2].punch / 20);
  assert.ok(engine.beatFx.pulse < responses[2].pulse / 20);
  assert.equal(engine.counters.nonFinite, 0);
});
