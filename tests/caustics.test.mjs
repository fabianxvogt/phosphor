import test from "node:test";
import assert from "node:assert/strict";
import caustics, {
  COURANT_SQUARED,
  refractDirection,
  receiverHit,
  waveStep,
} from "../scene-caustics.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { defaultPattern, validatePattern } from "../rhythm.mjs";

test("flat normal incidence hits directly below the surface", () => {
  assert.deepEqual(refractDirection([0, 0, -1], [0, 0, 1]), [0, 0, -1]);
  assert.deepEqual(receiverHit([0.4, -0.2, 0.03], [0, 0, 1]), [0.4, -0.2]);
});

test("oblique transmission obeys Snell's law and receiver geometry", () => {
  const angle = 0.45,
    index = 1.333,
    depth = 2.4;
  const incoming = [Math.sin(angle), 0, -Math.cos(angle)];
  const transmitted = refractDirection(incoming, [0, 0, 1], 1 / index);
  assert.ok(Math.abs(Math.hypot(...transmitted) - 1) < 1e-12);
  assert.ok(Math.abs(transmitted[0] - Math.sin(angle) / index) < 1e-12);
  const hit = receiverHit([0, 0, 0], [0, 0, 1], { incoming, index, depth });
  const refractedAngle = Math.asin(Math.sin(angle) / index);
  assert.ok(Math.abs(hit[0] - depth * Math.tan(refractedAngle)) < 1e-12);
  assert.equal(hit[1], 0);
});

test("a convex Gaussian surface actually bends rays toward its focal axis", () => {
  const x = 0.2,
    width = 0.35,
    amplitude = 0.12;
  const height = amplitude * Math.exp((-x * x) / (2 * width * width));
  const slope = (-x / (width * width)) * height;
  const hit = receiverHit([x, 0, height], [-slope, 0, 1], {
    depth: 2.5,
    index: 1.5,
  });
  assert.ok(hit[0] < x && hit[0] > -x, `receiver x=${hit[0]}`);
  assert.equal(hit[1], 0);
});

test("total internal reflection is rejected rather than producing non-finite rays", () => {
  assert.equal(
    refractDirection([0.9, 0, -Math.sqrt(1 - 0.9 * 0.9)], [0, 0, 1], 1.5),
    null,
  );
});

test("stable finite-difference waves propagate, stay finite and dissipate", () => {
  const width = 32,
    rows = 32;
  let height = new Float64Array(width * rows),
    previous = new Float64Array(height.length);
  height[16 * width + 16] = 0.1;
  assert.ok(COURANT_SQUARED > 0 && COURANT_SQUARED <= 0.5);
  const first = waveStep(height, previous, width, rows);
  assert.ok(first[16 * width + 17] > 0);
  for (let i = 0; i < 1200; i++) {
    const next = waveStep(height, previous, width, rows, { damping: 0.03 });
    previous = height;
    height = next;
    assert.ok(height.every(Number.isFinite));
  }
  // The periodic constant mode can retain its mean; varying wave energy decays.
  const mean = height.reduce((sum, value) => sum + value, 0) / height.length;
  assert.ok(
    Math.max(...height.map((value) => Math.abs(value - mean))) < 0.0005,
  );
});

test("Caustics study has eight valid looks and real refracted photon splats", () => {
  assert.equal(caustics.presets.length, 8);
  for (const variant of caustics.type.values)
    assert.ok(caustics.presets.some((look) => look.params.surface === variant));
  for (let i = 0; i < caustics.presets.length; i++) {
    const snapshot = presetSnapshot(caustics, i);
    assert.deepEqual(validateSnapshot(snapshot, [caustics]), snapshot);
  }
  assert.deepEqual(
    validatePattern(defaultPattern(caustics.rhythm), caustics.rhythm),
    defaultPattern(caustics.rhythm),
  );
  assert.match(
    caustics.particles.vertex,
    /refract\(incoming, normal, 1\.0 \/ u_params\[5\]\)/,
  );
  assert.match(caustics.simulation.fragment, /u_rhythmHit\.z/);
  assert.ok(!caustics.field);
});
