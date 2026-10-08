import test from "node:test";
import assert from "node:assert/strict";
import scenes, { GATED } from "../scenes.mjs";
import { AUDIO_FEATURES, AUDIO_MAPPING_CAP } from "../scene-contract.mjs";

// Contract v3 metadata must reference real parameters with sane values.
for (const scene of scenes)
  test(`${scene.id} declares valid performance metadata`, () => {
    const keys = new Map(scene.schema.map((d) => [d.key, d]));
    assert.ok(scene.energy && Object.keys(scene.energy).length, "energy curve");
    for (const [key, curve] of Object.entries(scene.energy)) {
      assert.ok(keys.has(key), `energy.${key} is not a parameter`);
      const pair = Array.isArray(curve) ? curve : curve.mul;
      assert.ok(
        pair?.length === 2 && pair.every(Number.isFinite),
        `energy.${key}`,
      );
      if (!Array.isArray(curve))
        assert.ok(
          pair.every((v) => v > 0),
          `energy.${key} mul must be positive`,
        );
    }
    for (const [name, weight] of Object.entries(scene.beat))
      assert.ok(
        ["punch", "pulse", "inject"].includes(name) &&
          weight >= 0 &&
          weight <= 2,
        `beat.${name}`,
      );
    if (GATED.has(scene.id))
      assert.ok(scene.audio?.length > 0, "gated family has real-audio mappings");
    const mappings = scene.audio ?? [];
    assert.ok(mappings.length <= 3, "at most three audio hero parameters");
    const mapped = new Set();
    for (const { param, feature, amount } of mappings) {
      assert.ok(keys.has(param), `audio.${param} is not a parameter`);
      assert.notEqual(param, scene.type.key, "audio does not change family type");
      assert.ok(!mapped.has(param), `duplicate audio hero ${param}`);
      mapped.add(param);
      assert.ok(AUDIO_FEATURES.includes(feature), `audio feature ${feature}`);
      assert.ok(Number.isFinite(amount) && Math.abs(amount) <= AUDIO_MAPPING_CAP,
        `audio.${param} amount cap`);
    }
    assert.equal(scene.stage.length, 3);
    for (const key of scene.stage) assert.ok(keys.has(key), `stage ${key}`);
    const type = keys.get(scene.type.key);
    assert.ok(type, `type ${scene.type.key}`);
    assert.ok(scene.type.values.length >= 3, "at least three types (D30)");
    for (const v of scene.type.values)
      assert.ok(v >= type.min && v <= type.max, `type value ${v}`);
  });
