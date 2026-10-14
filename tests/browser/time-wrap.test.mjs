import test from "node:test";
import assert from "node:assert/strict";
import { checkTimeWrap } from "../../scripts/check-time-wrap.mjs";
import scenes from "../../scenes.mjs";
import { usesLateVariant } from "../../scene-time.mjs";

// Native GPU: PHOSPHOR_HEADLESS_RIG=1 PHOSPHOR_TIME_GPU=1 node --test tests/browser/time-wrap.test.mjs
test(
  "no family jumps across the old hourly wrap, 4096 s or twelve hours",
  { skip: process.env.PHOSPHOR_TIME_GPU !== "1", timeout: 1800000 },
  async () => {
    const results = await checkTimeWrap({ port: 48403 });
    assert.ok(results.length > 40);
    for (const result of results) {
      assert.equal(result.glError, 0, result.sceneId);
      assert.equal(result.nonFinite, 0, result.sceneId);
      const scene = scenes.find((s) => s.id === result.sceneId);
      assert.equal(result.late, usesLateVariant(scene), result.sceneId);
      assert.deepEqual(
        result.seams,
        [],
        `${result.sceneId}: ${JSON.stringify(result.verdicts)}`,
      );
    }
  },
);
