import test from "node:test";
import assert from "node:assert/strict";
import scenes, { GATED } from "../scenes.mjs";
import { Engine } from "../engine.mjs";
import { StageAudio } from "../stage-audio.mjs";
import { presetSnapshot } from "../session.mjs";
import { bloomAmount } from "../compositor.mjs";

function performer(scene, { level = 0.5, snapshot = presetSnapshot(scene) } = {}) {
  const engine = Object.create(Engine.prototype);
  const slot = {
    scene, snapshot, baseLevel: 0.5, params: new Float32Array(8),
  };
  Object.assign(engine, {
    slots: [slot], level, levelDuration: 0, uniformFrame: 0,
    features: {
      energy: 1, low: 1, mid: 1, high: 1, onset: 1, flux: 1,
      hit: false, hitId: 0, active: true, locked: true,
    },
    options: {}, beatFx: {}, counters: { nonFinite: 0 },
    speed: 1, beat: 0.5, lastKickBeat: null, flashHeld: false,
    gesture: [0.5, 0.5, 0],
  });
  return { engine, slot };
}
function parameters(engine, slot) {
  engine.uniformFrame++;
  engine.updateUniforms(slot);
  return Array.from(slot.params);
}
function settle(engine, seconds = 1) {
  for (let frame = 0; frame < Math.round(seconds * 60); frame++)
    engine.updatePerformance(1 / 60, false);
}

for (const scene of scenes.filter((s) => GATED.has(s.id))) {
  test(`D61 ${scene.id} applies three smoothed audio heroes over energy within schema ranges`, () => {
    for (const level of [0.05, 0.5, 0.95]) {
      const { engine, slot } = performer(scene, { level });
      const original = structuredClone(slot.snapshot);
      const base = parameters(engine, slot);
      engine.updatePerformance(1 / 60, false);
      const attack = parameters(engine, slot);
      settle(engine);
      const peak = parameters(engine, slot);
      assert.equal(scene.audio.length, 3);
      for (let i = 0; i < scene.schema.length; i++) {
        const def = scene.schema[i];
        const mapping = scene.audio.find((m) => m.param === def.key);
        // The upload array is float32, so decimal schema endpoints round.
        assert.ok(peak[i] >= def.min - 1e-6 && peak[i] <= def.max + 1e-6,
          `${def.key} range`);
        if (!mapping) assert.equal(peak[i], base[i], `${def.key} untouched`);
        else {
          const cap = Math.abs(mapping.amount) * (def.max - def.min);
          const rounding = def.step === 1 ? 0.5 : 0;
          assert.ok(Math.abs(peak[i] - base[i]) <= cap + rounding + 1e-6,
            `${def.key} capped over energy`);
          assert.ok(Math.abs(attack[i] - base[i]) <= Math.abs(peak[i] - base[i]) + 1e-6,
            `${def.key} attack is smooth`);
        }
      }
      assert.deepEqual(slot.snapshot, original, "audio never edits the saved clip");
    }
  });

  test(`D61 ${scene.id} fades to clock-only after lock loss, source off or silence`, () => {
    for (const condition of ["lock", "off", "silence"]) {
      const { engine, slot } = performer(scene);
      const baseline = parameters(engine, slot);
      settle(engine);
      const peak = parameters(engine, slot);
      assert.ok(peak.some((value, i) => Math.abs(value - baseline[i]) > 0.005));
      if (condition === "lock") engine.features.locked = false;
      else {
        engine.features.active = false;
        if (condition === "off") engine.features.locked = false;
        for (const key of ["energy", "low", "mid", "high", "onset", "flux"])
          engine.features[key] = 0;
      }
      engine.updatePerformance(1 / 60, false);
      const first = parameters(engine, slot);
      for (let i = 0; i < first.length; i++)
        assert.ok(Math.abs(first[i] - peak[i]) < 0.005, "dropout does not snap");
      settle(engine, 1);
      assert.ok(engine.audioWeight > 0.4 && engine.audioWeight < 0.6);
      settle(engine, 1.5);
      const faded = parameters(engine, slot);
      assert.equal(engine.audioWeight, 0);
      for (let i = 0; i < faded.length; i++)
        assert.ok(Math.abs(faded[i] - baseline[i]) < 0.001, `${scene.schema[i]?.key} released`);
      assert.ok(Math.abs(engine.kick - Math.exp(-3.5)) < 1e-12, "clock kick restored");
    }
  });
}

test("D61 runtime caps excessive signed amounts and feature values, and ignores a fourth hero", () => {
  const scene = {
    ...scenes.find((s) => s.id === "interference"),
    audio: [
      { param: "phase", feature: "low", amount: 4 },
      { param: "ratio", feature: "mid", amount: -4 },
      { param: "palette", feature: "high", amount: 0.1 },
      { param: "motion", feature: "onset", amount: 4 },
    ],
  };
  const { engine, slot } = performer(scene);
  const base = parameters(engine, slot);
  engine.features.low = engine.features.mid = engine.features.high = 9;
  settle(engine);
  const values = parameters(engine, slot);
  assert.ok(Math.abs(values[3] - base[3] - 0.18) < 1e-6);
  assert.ok(Math.abs(values[2] - base[2] + 0.27) < 1e-6);
  assert.equal(values[6], base[6]);
  for (const def of scene.schema) slot.snapshot.params[def.key] = def.max;
  assert.ok(parameters(engine, slot).every((v, i) => v <= scene.schema[i]?.max || i >= scene.schema.length));
  for (const def of scene.schema) slot.snapshot.params[def.key] = def.min;
  assert.ok(parameters(engine, slot).every((v, i) => v >= scene.schema[i]?.min || i >= scene.schema.length));
});

test("D61 unlocked input never maps and hit events inject only once", () => {
  const scene = scenes.find((s) => s.id === "feedback");
  const { engine, slot } = performer(scene);
  engine.features.locked = false;
  const base = parameters(engine, slot);
  settle(engine);
  assert.deepEqual(parameters(engine, slot), base);
  engine.features.locked = true;
  settle(engine);
  engine.features.hit = true;
  engine.features.hitId = 1;
  engine.updatePerformance(1 / 60, false);
  assert.ok(engine.gesture[2] > 0);
  assert.equal(engine.audioFeatures.hit, 1);
  engine.gesture[2] = 0;
  engine.updatePerformance(1 / 60, false);
  assert.equal(engine.audioFeatures.hit, 0);
  assert.equal(engine.gesture[2], 0);
});

test("D61 stage delivers tracker availability, and off rejects stale lock", () => {
  const audio = new StageAudio();
  audio.source = "file";
  audio.tracker = { locked: true };
  assert.equal(audio.features(1 / 60).locked, true);
  audio.tracker.locked = false;
  assert.equal(audio.features(1 / 60).locked, false);
  audio.tracker.locked = true;
  audio.source = "off";
  assert.equal(audio.features(1 / 60).locked, false);
});

test("D61 bloom follows low slightly without exceeding the set ceiling", () => {
  assert.equal(bloomAmount(0, 1, 1), 0);
  assert.equal(bloomAmount(0.5, 0.1, 1), 0);
  assert.ok(bloomAmount(0.5, 0.5, 1) > bloomAmount(0.5, 0.5, 0));
  for (const ceiling of [0.15, 0.5, 1])
    for (const energy of [0, 0.1, 0.5, 0.9, 1]) {
      const rest = bloomAmount(ceiling, energy, 0);
      const low = bloomAmount(ceiling, energy, 1);
      assert.ok(low >= rest && low <= ceiling);
      assert.ok(low - rest <= 0.06);
      assert.equal(bloomAmount(ceiling, energy, 99), low);
    }
});
