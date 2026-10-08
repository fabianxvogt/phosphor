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

import { structureSignature, structureDistance } from "./metrics.mjs";

function image(width, height, fn) {
  const rgba = new Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = Math.round(255 * fn(x / width, y / height));
      rgba.splice((y * width + x) * 4, 4, v, v, v, 255);
    }
  return rgba;
}

test("structure distance ignores colour and separates different compositions", () => {
  const w = 64,
    h = 36;
  const stripes = image(w, h, (x) => (Math.floor(x * 8) % 2 ? 0.8 : 0.1));
  const stripesShift = image(w, h, (x) =>
    Math.floor(x * 8 + 0.2) % 2 ? 0.8 : 0.1,
  );
  const rings = image(w, h, (x, y) =>
    Math.floor(Math.hypot(x - 0.5, y - 0.5) * 12) % 2 ? 0.8 : 0.1,
  );
  // Same luminance, different hue: magenta-ish pixels of equal Rec.709 luma.
  const coloured = [];
  for (let i = 0; i < stripes.length; i += 4) {
    const y = stripes[i];
    const r = Math.min(255, Math.round(y * 1.6)),
      b = Math.min(255, Math.round(y * 1.6));
    const g = Math.max(0, Math.round((y - 0.2126 * r - 0.0722 * b) / 0.7152));
    coloured.push(r, g, b, 255);
  }
  const s = structureSignature(stripes, w, h);
  assert.ok(structureDistance(s, structureSignature(coloured, w, h)) < 0.03);
  const near = structureDistance(s, structureSignature(stripesShift, w, h));
  const far = structureDistance(s, structureSignature(rings, w, h));
  assert.ok(near < far, `${near} < ${far}`);
  assert.ok(far > 0.5);
});
