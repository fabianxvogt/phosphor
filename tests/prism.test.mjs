import test from "node:test";
import assert from "node:assert/strict";
import prism from "../scene-prism.mjs";
import {
  CAUCHY_A,
  CAUCHY_B,
  PRISM_COUNT,
  LENS_COUNT,
  SPECTRAL_SAMPLES,
  STRIDE,
  ADDITIVE_FROM,
  PLANES,
  refractiveIndex,
  minimumDeviation,
  criticalAngle,
  refract,
  intersectPrism,
  tracePrism,
  traceLens,
  identity,
  prismPose,
  createGeometry,
} from "../prism-model.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { catalogLooks } from "../catalog.mjs";
import scenes from "../scenes.mjs";
import { advanceClocks } from "../scene-time.mjs";
const near = (a, b, e = 1e-10) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
const length = (v) => Math.hypot(...v);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

test("Cauchy dispersion is normal, monotone, finite and uses micrometres", () => {
  assert.equal(CAUCHY_A, 1.48);
  assert.equal(CAUCHY_B, 0.012);
  near(refractiveIndex(0.5), 1.528);
  for (let lambda = 0.38; lambda < 0.78; lambda += 0.005) {
    assert.ok(refractiveIndex(lambda) > refractiveIndex(lambda + 0.005));
    assert.ok(refractiveIndex(lambda) > 1.49 && refractiveIndex(lambda) < 1.57);
  }
  assert.match(
    prism.geometry.vertex,
    /1\.48\+0\.012\*u_params\[2\]\/\(lambda\*lambda\)/,
  );
  assert.match(prism.geometry.vertex, /lambda=mix\(\.38,\.78,a_info.z\)/);
});

test("minimum deviation equals an independent two-interface Snell solution and is the true minimum", () => {
  const apex = Math.PI / 3;
  for (const lambda of [0.38, 0.44, 0.55, 0.65, 0.78]) {
    const n = refractiveIndex(lambda),
      optimum = Math.asin(n * Math.sin(apex / 2));
    // Independent scalar Snell construction through each face.
    const deviation = (i) => {
      const r1 = Math.asin(Math.sin(i) / n),
        r2 = apex - r1;
      return i + Math.asin(n * Math.sin(r2)) - apex;
    };
    const expected = minimumDeviation(apex, n);
    near(deviation(optimum), expected);
    near(
      (deviation(optimum + 1e-5) - deviation(optimum - 1e-5)) / 2e-5,
      0,
      1e-8,
    );
    for (const delta of [-0.05, -0.02, 0.02, 0.05])
      assert.ok(deviation(optimum + delta) > expected);
    const ray = tracePrism(lambda, 1, optimum - Math.PI / 6);
    near(
      Math.acos(
        dot(
          [Math.cos(optimum - Math.PI / 6), Math.sin(optimum - Math.PI / 6), 0],
          ray.direction,
        ),
      ),
      expected,
    );
    assert.equal(ray.reflections, 0);
  }
});

test("vector Snell law preserves the tangential momentum and detects total internal reflection", () => {
  for (let a = 0; a < 1.4; a += 0.05) {
    const I = [Math.sin(a), -Math.cos(a), 0],
      N = [0, 1, 0];
    const transmitted = refract(I, N, 1 / 1.53);
    near(length(transmitted), 1);
    near(1.53 * transmitted[0], I[0]);
  }
  const critical = criticalAngle(1.53);
  for (const delta of [-0.0001, 0.0001]) {
    const a = critical + delta,
      ray = refract([Math.sin(a), -Math.cos(a), 0], [0, 1, 0], 1.53);
    assert.equal(ray === null, delta > 0);
  }
  // A real prism ray, not just a generic interface, takes a reflected path.
  const reflected = tracePrism(0.38, 1, 0.04);
  assert.ok(reflected.reflections > 0);
  near(length(reflected.direction), 1);
  assert.match(prism.geometry.vertex, /if\(dot\(outgoing,outgoing\)<1e-8\)/);
  assert.match(prism.geometry.vertex, /d=reflect\(d,ex\)/);
});

test("convex intersections stay on the five physical faces and the dispersed fan is ordered", () => {
  let previous = -Infinity;
  for (let i = 0; i < SPECTRAL_SAMPLES; i++) {
    const lambda = 0.38 + (0.4 * i) / (SPECTRAL_SAMPLES - 1),
      ray = tracePrism(lambda);
    assert.equal(ray.reflections, 0);
    assert.ok(ray.direction[1] < 0);
    const angle = Math.atan2(ray.direction[1], ray.direction[0]);
    assert.ok(angle > previous);
    previous = angle;
    near(length(ray.direction), 1);
    for (const p of ray.points.slice(1)) {
      const distances = PLANES.map(
        (n, face) => (face < 3 ? 0.5 : 0.65) - dot(n, p),
      );
      assert.ok(Math.min(...distances) > -1e-9);
      near(Math.min(...distances), 0);
    }
  }
  assert.equal(intersectPrism([5, 5, 5], [1, 0, 0]), null);
  const central = intersectPrism([0, 0, 3], [0, 0, -1]);
  near(central.near, 2.35);
  near(central.far, 3.65);
});

test("the biconvex lenses really focus Snell-traced aperture rays with chromatic focal shift", () => {
  let previous = 0;
  for (const lambda of [0.38, 0.5, 0.65, 0.78]) {
    const ray = traceLens(lambda);
    near(ray.exit[2], 0.22 - 0.19 * (ray.exit[0] ** 2 + ray.exit[1] ** 2));
    near(length(ray.direction), 1);
    near(ray.focus[0], 0);
    near(ray.focus[1], 0);
    assert.ok(ray.focus[2] > previous);
    previous = ray.focus[2];
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5,
        other = traceLens(lambda, [
          0.65 * Math.cos(angle),
          0.65 * Math.sin(angle),
        ]);
      near(length(other.focus.slice(0, 2)), 0);
      near(other.focus[2], ray.focus[2]);
    }
  }
  assert.match(prism.geometry.vertex, /float path=-2\.\*qc\/\(qb\+sqrt/);
});

test("the maximal topology and seed identity survive development and reversal", () => {
  const geometry = createGeometry(10801);
  assert.equal(
    geometry.length / STRIDE,
    ADDITIVE_FROM + (PRISM_COUNT + LENS_COUNT * 5) * SPECTRAL_SAMPLES * 4 * 6,
  );
  assert.ok([...geometry].every(Number.isFinite));
  assert.deepEqual(geometry, createGeometry(10801));
  assert.deepEqual(
    geometry,
    createGeometry(10802),
    "seed changes poses, never the index topology",
  );
  for (let id = 0; id < PRISM_COUNT + LENS_COUNT; id++) {
    const immutable = identity(10801, id),
      forward = [];
    for (let i = 0; i <= 200; i++) {
      const pose = prismPose(10801, id, i / 100, 0.7);
      assert.deepEqual(pose.identity, immutable);
      assert.ok(
        [...pose.center, pose.scale, pose.angle, pose.yaw].every(
          Number.isFinite,
        ),
      );
      if (i)
        for (let j = 0; j < 3; j++)
          assert.ok(Math.abs(pose.center[j] - forward[i - 1].center[j]) < 0.09);
      forward.push(pose);
    }
    for (let i = 200; i >= 0; i--)
      assert.deepEqual(prismPose(10801, id, i / 100, 0.7), forward[i]);
    for (const boundary of [0, 1, 2]) {
      const a = prismPose(10801, id, boundary - 1e-6, 0.7),
        b = prismPose(10801, id, boundary + 1e-6, 0.7);
      for (let j = 0; j < 3; j++) near(a.center[j], b.center[j], 1e-8);
      near(a.scale, b.scale, 1e-8);
    }
  }
  assert.equal(prism.geometry.create, createGeometry);
  assert.match(prism.geometry.fragment, /environment\(source,v_Q\*outgoing\)/);
  assert.match(prism.geometry.fragment, /fwidth\(m2\)/);
  assert.match(prism.geometry.vertex, /p\.y=-p\.y/);
});

test("all eight presets validate, and the appended world has identical non-development state parameters", () => {
  assert.equal(prism.number, 108);
  assert.equal(prism.development, "development");
  assert.equal(prism.presets.length, 8);
  for (const p of prism.presets)
    for (const f of prism.schema)
      assert.ok(
        Number.isFinite(p.params[f.key]) &&
          p.params[f.key] >= f.min &&
          p.params[f.key] <= f.max,
        `${p.name}.${f.key}`,
      );
  const states = prism.presets.slice(0, 3),
    withoutDev = (p) =>
      Object.fromEntries(
        Object.entries(p.params).filter(([k]) => k !== "development"),
      );
  assert.equal(new Set(states.map((p) => p.seed)).size, 1);
  for (const p of states)
    assert.deepEqual(withoutDev(p), withoutDev(states[0]));
  assert.deepEqual(
    continuousDevelopment(
      states.map((_, i) => ({ snapshot: presetSnapshot(prism, i) })),
      prism,
    ).positions,
    [0, 1, 2],
  );
  const world = defaultWorlds(catalogLooks(scenes).map((l) => l.id)).at(-1);
  assert.equal(world.id, "prism-engine");
  assert.deepEqual(
    world.states.map((s) => s.look),
    ["prism:Shard", "prism:Array", "prism:Kaleidoscope"],
  );
});

test("bounded signature gestures use 4/8/16 beats; rate changes cannot retime the optics after 12h", () => {
  assert.deepEqual(
    prism.rhythm.map((r) => r.defaults.length),
    [4, 8, 16],
  );
  for (const channel of ["x", "y", "z"])
    assert.ok(
      prism.geometry.vertex.includes(`u_rhythm.${channel}`) ||
        prism.geometry.fragment.includes(`u_rhythm.${channel}`),
    );
  const params = prism.schema.map((s) => s.default);
  for (const t of [3600, 43200]) {
    const state = {};
    advanceClocks(state, prism.clocks, t - 1 / 60, params, 0.1);
    const before = advanceClocks(state, prism.clocks, t, params, 0.1).slice();
    const changed = params.map((x, i) => (i === 1 || i === 5 ? x * 1.3 : x));
    const after = advanceClocks(state, prism.clocks, t + 1 / 60, changed, 0.9);
    for (let i = 0; i < 2; i++)
      assert.ok((after[i] - before[i] + 2 * Math.PI) % (2 * Math.PI) < 0.01);
  }
});
