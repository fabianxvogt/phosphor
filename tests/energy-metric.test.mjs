import test from "node:test";
import assert from "node:assert/strict";
import { energyDelta } from "../scripts/energy-metric.mjs";

const width = 64;
const height = 36;
function image(pixel) {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const value = pixel(x, y);
      rgba.set([value, value, value, 255], i);
    }
  return rgba;
}

// Two luminance levels make the affine exposure change exact even after
// quantization; the moving boundary exercises normalization between frames.
test("energy ignores global brightness, contrast and uniform colour tint", () => {
  const low = Array.from({ length: 8 }, (_, frame) =>
    image((x) => ((x + frame) % 32 < 16 ? 40 : 100)),
  );
  const high = low.map((rgba) =>
    Uint8Array.from(rgba, (value, i) => {
      if (i % 4 === 3) return 255;
      return value * [1, 1.5, 2][i % 4] + 20;
    }),
  );
  const result = energyDelta(low, high, width, height);
  assert.ok(result.structuralDelta < 1e-6);
  assert.ok(result.motionDelta < 1e-6);
  assert.ok(result.score < 1e-6);
});

test("added fine detail and density score high without increased brightness", () => {
  const sparse = image((x) => (x < width / 2 ? 40 : 100));
  const detailed = image((x, y) => ((x + y) % 2 ? 40 : 100));
  const result = energyDelta(
    [sparse, sparse, sparse],
    [detailed, detailed, detailed],
    width,
    height,
  );
  assert.ok(result.structuralDelta > 0.25);
  assert.equal(result.motionDelta, 0);
  assert.ok(result.score > 0.25);
});

test("faster motion scores high at unchanged density and contrast", () => {
  const moving = (speed) =>
    Array.from({ length: 16 }, (_, frame) =>
      image((x) => ((x + frame * speed) % 32 < 16 ? 40 : 100)),
    );
  const result = energyDelta(moving(1), moving(8), width, height);
  assert.ok(result.highMotion > result.lowMotion);
  assert.ok(result.motionDelta > 0.12);
  assert.ok(result.score > 0.12);
});

test("flat frames remain structureless even when their brightness animates", () => {
  const low = [image(() => 0), image(() => 255)];
  const high = [image(() => 80), image(() => 100)];
  assert.equal(energyDelta(low, high, width, height).score, 0);
});

test("near-flat quantization noise does not become detail or motion", () => {
  const flat = Array.from({ length: 8 }, () => image(() => 1));
  const noisy = Array.from({ length: 8 }, (_, frame) =>
    image((x, y) => ((x + y + frame) % 2 ? 0 : 2)),
  );
  const result = energyDelta(flat, noisy, width, height);
  assert.equal(result.structuralDelta, 0);
  assert.equal(result.motionDelta, 0);
  assert.equal(result.highMotion, 0);
  assert.equal(result.score, 0);
});

test("energy comparison rejects mismatched frame sequences and dimensions", () => {
  const frame = image(() => 80);
  assert.throws(() => energyDelta([frame], [frame], width, height));
  assert.throws(() => energyDelta([frame, frame], [frame], width, height));
  assert.throws(() =>
    energyDelta([frame, frame], [frame, frame], width + 1, height),
  );
});
