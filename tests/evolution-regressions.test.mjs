import test from "node:test";
import assert from "node:assert/strict";
import { mutatePreset } from "../evolution.mjs";
test("F7 integer-step mutations stay integral at floating point radius bounds", () => {
  const scene = {
    id: "grid",
    name: "Grid",
    schema: [{ key: "yaw", min: -180, max: 180, step: 1, default: -177 }],
  };
  for (let seed = 0; seed < 200000; seed++) {
    const child = mutatePreset(
      scene,
      { seed: 1, params: { yaw: -177 } },
      { seed, strength: 0.35 },
    );
    assert.equal(
      Number.isInteger(child.params.yaw),
      true,
      `seed=${seed}, yaw=${child.params.yaw}`,
    );
  }
});
