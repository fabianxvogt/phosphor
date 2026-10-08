import test from "node:test";
import assert from "node:assert/strict";
import { imageMetrics, percentile, heapEvidence } from "./metrics.mjs";

test("black floor, saturated edges and grey-field proxies use known pixels", () => {
  const metrics = imageMetrics([0, 0, 0, 255, 255, 0, 0, 255], 2, 1);
  assert.equal(metrics.blackFloorP2Luminance, 0);
  assert.equal(metrics.meanLuminance, 0.1063);
  assert.equal(metrics.meanSaturation, 0.5);
  assert.equal(metrics.edgeDensity, 1);
  assert.equal(metrics.lowSaturationMidGreyPercent, 0);
  assert.equal(
    imageMetrics([128, 128, 128, 255], 1, 1).lowSaturationMidGreyPercent,
    100,
  );
  assert.throws(() => imageMetrics([], 1, 1), /dimensions/);
});

test("nearest-rank gates retain outliers and distinguish missing samples", () => {
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile([10, 10, 40], 0.99), 40);
  assert.deepEqual(heapEvidence([100, 200, 300]), {
    growthMB: 0.0002,
    upwardTrend: true,
    windowMeansBytes: [100, 200, 300],
  });
  assert.equal(heapEvidence([100, 300, 100]).upwardTrend, false);
  assert.equal(heapEvidence([]), null);
});
