import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";

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
    assert.equal(scene.stage.length, 3);
    for (const key of scene.stage) assert.ok(keys.has(key), `stage ${key}`);
    const type = keys.get(scene.type.key);
    assert.ok(type, `type ${scene.type.key}`);
    assert.ok(scene.type.values.length >= 3, "at least three types (D30)");
    for (const v of scene.type.values)
      assert.ok(v >= type.min && v <= type.max, `type value ${v}`);
  });
