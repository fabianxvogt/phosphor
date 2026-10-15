import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { defaultWorlds, continuousDevelopment } from "../worlds.mjs";
import {
  STRIPS,
  ALONG,
  ACROSS,
  LENGTH,
  STROUHAL,
  STRIDE,
  ATTRIBUTES,
  TAU,
  frequency,
  flutter,
  helix,
  point,
  camera,
  identity,
  createGeometry,
} from "../silk-model.mjs";
const scene = scenes.find((s) => s.id === "silk");
const close = (x, y, eps = 1e-9) =>
  assert.ok(Math.abs(x - y) < eps, `${x} != ${y}`);
const distance = (a, b) => Math.hypot(...a.map((x, k) => x - b[k]));

test("silk: registered world, eight valid looks and identical state parameters", () => {
  assert.equal(scene.number, 111);
  assert.equal(scene.development, "development");
  assert.deepEqual(scene.type, { key: "development", values: [0, 1, 2] });
  assert.equal(scene.presets.length, 8);
  const worlds = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  );
  const world = worlds.at(-1);
  assert.equal(world.id, "silk-storm");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Veil", "Banners", "Tornado"],
  );
  assert.deepEqual(
    continuousDevelopment(
      [0, 1, 2].map((i) => ({ snapshot: presetSnapshot(scene, i) })),
      scene,
    ).positions,
    [0, 1, 2],
  );
  for (const p of scene.presets)
    for (const f of scene.schema) {
      assert.ok(Number.isFinite(p.params[f.key]));
      assert.ok(
        p.params[f.key] >= f.min && p.params[f.key] <= f.max,
        `${p.name}.${f.key}`,
      );
    }
  assert.deepEqual(
    scene.rhythm.map((r) => r.defaults.length),
    [4, 8, 16],
  );
  assert.equal(scene.stage.length, 3);
});

test("Strouhal frequency: measured positive zero crossings agree with St U/L", () => {
  close(STROUHAL, 0.2);
  for (const wind of [2, 5, 7.5, 12]) {
    const f = frequency(wind),
      period = 1 / f;
    close(frequency(wind * 2), 2 * f);
    close(frequency(wind, LENGTH * 2), f / 2);
    close(scene.clocks[0].rate([0, wind]) / TAU, f);
    // Measure the actual integrated wave position, not just the frequency helper.
    const dt = period / 1000,
      crossings = [];
    let prev = flutter(3, 0)[1];
    for (let t = dt; t <= period * 9; t += dt) {
      const z = flutter(3, TAU * f * t)[1];
      if (prev < 0 && z >= 0) crossings.push(t);
      prev = z;
    }
    assert.ok(crossings.length >= 8);
    for (let i = 1; i < crossings.length; i++)
      close(crossings[i] - crossings[i - 1], period, dt * 1.1);
  }
});

test("inextensible tangent integral and bounded rendered veil strain", () => {
  let integralError = 0,
    renderedError = 0,
    transverseError = 0,
    principalError = 0;
  const ds = 1e-5;
  for (const a of [0.192, 0.48, 0.72])
    for (let phase = 0; phase < TAU; phase += 0.31)
      for (let s = 0; s <= LENGTH; s += 0.17) {
        const p = flutter(s, phase, a),
          q = flutter(s + ds, phase, a);
        integralError = Math.max(
          integralError,
          Math.abs(distance(p, q) / ds - 1),
        );
      }
  assert.ok(integralError < 0.0002, `base tangent strain ${integralError}`);
  for (const amplitude of [0.4, 1, 1.5])
    for (let id = 0; id < STRIPS; id++)
      for (let i = 0; i <= 80; i++) {
        const u = i / 80,
          v = 0.37,
          rnd = identity(1811, id),
          state = { amplitude, phase: i * 0.13 };
        const p = point(u, v, id, rnd, state);
        const du = point(u + ds, v, id, rnd, state).map(
          (x, k) => (x - p[k]) / (ds * LENGTH),
        );
        const dv = point(u, v + ds, id, rnd, state).map(
          (x, k) => (x - p[k]) / ((ds * 8.4) / STRIPS),
        );
        const dot = (a, b) => a.reduce((sum, x, k) => sum + x * b[k], 0);
        const E = dot(du, du),
          F = dot(du, dv),
          G = dot(dv, dv);
        const disc = Math.sqrt((E - G) ** 2 + 4 * F * F);
        for (const lambda of [(E + G + disc) / 2, (E + G - disc) / 2])
          principalError = Math.max(
            principalError,
            Math.abs(Math.sqrt(lambda) - 1),
          );
        renderedError = Math.max(
          renderedError,
          Math.abs(
            distance(p, point(u + ds, v, id, rnd, state)) / (ds * LENGTH) - 1,
          ),
        );
        transverseError = Math.max(
          transverseError,
          Math.abs(
            distance(p, point(u, v + ds, id, rnd, state)) /
              ((ds * 8.4) / STRIPS) -
              1,
          ),
        );
      }
  assert.ok(
    renderedError < 0.031,
    `longitudinal strain with fine folds ${renderedError}`,
  );
  assert.ok(transverseError < 0.012, `transverse strain ${transverseError}`);
  assert.ok(
    principalError < 0.034,
    `principal stretch including shear ${principalError}`,
  );
});

test("conical helix is unit-speed and grows into a tower", () => {
  const ds = 1e-5;
  for (let s = 0; s < LENGTH; s += 0.07)
    close(distance(helix(s), helix(s + ds)) / ds, 1, 1e-5);
  const lo = helix(0),
    hi = helix(LENGTH);
  close(Math.hypot(lo[0], lo[2]), 0.45);
  close(Math.hypot(hi[0], hi[2]), 3.27);
  assert.ok(hi[1] - lo[1] > 7.8);
});

test("material mesh: seed-only creation, persistent ids and joined veil seams", () => {
  const a = createGeometry(1811);
  assert.deepEqual(a, createGeometry(1811));
  assert.notDeepEqual(a, createGeometry(1812));
  assert.equal(createGeometry.length, 1);
  assert.equal(
    ATTRIBUTES.reduce((x, y) => x + y),
    STRIDE,
  );
  assert.equal(a.length, STRIPS * ALONG * ACROSS * 6 * STRIDE);
  assert.ok(a.every(Number.isFinite));
  for (let id = 0; id < STRIPS; id++) {
    const start = id * ALONG * ACROSS * 6 * STRIDE;
    assert.equal(a[start + 2], id);
    assert.deepEqual(
      Array.from(a.slice(start + 3, start + 6)),
      identity(1811, id).map(Math.fround),
    );
    if (id === STRIPS - 1) continue;
    for (const phase of [0, 1, 4])
      for (const u of [0, 0.17, 0.5, 1]) {
        const p = point(u, 1, id, identity(1811, id), { phase });
        const q = point(u, 0, id + 1, identity(1811, id + 1), { phase });
        assert.ok(
          distance(p, q) < 1e-12,
          "adjacent material strips form exactly one veil",
        );
      }
  }
});

test("development remains continuous, reversible and clock-periodic", () => {
  for (let id = 0; id < STRIPS; id += 3)
    for (const u of [0, 0.21, 0.61, 1]) {
      const rnd = identity(1811, id),
        state = { phase: 0.71, turn: 0.8 };
      let prev = point(u, 0.4, id, rnd, state);
      for (let d = 0.002; d <= 2.0001; d += 0.002) {
        const p = point(u, 0.4, id, rnd, { ...state, development: d });
        assert.ok(
          distance(p, prev) < 0.16,
          `bounded development derivative at ${d}`,
        );
        prev = p;
      }
      for (const development of [0, 0.6, 1, 1.39, 1.7, 2]) {
        const at = (extra) =>
          point(u, 0.4, id, rnd, { ...state, development, ...extra });
        assert.deepEqual(at({}), at({}));
        assert.ok(distance(at({}), at({ phase: state.phase + TAU })) < 1e-10);
        assert.ok(distance(at({}), at({ turn: state.turn + TAU })) < 1e-10);
      }
    }
  for (const c of scene.clocks) assert.equal(c.period, TAU);
  for (const source of [
    scene.fragment,
    scene.geometry.vertex,
    scene.geometry.fragment,
  ])
    assert.doesNotMatch(source, /u_time/);
});

test("camera cranes below the formed vortex, then rises into its hollow axis", () => {
  let nearest = Infinity;
  for (const d of [0, 0.5, 1, 1.25, 1.5, 1.65, 1.75, 1.8, 1.85, 1.9, 2])
    for (let a = 0; a < TAU; a += 0.6) {
      const { eye, target, up } = camera(d, a);
      const forward = target.map((x, k) => x - eye[k]);
      const cross = [
        forward[1] * up[2] - forward[2] * up[1],
        forward[2] * up[0] - forward[0] * up[2],
        forward[0] * up[1] - forward[1] * up[0],
      ];
      assert.ok(
        Math.hypot(...cross) / Math.hypot(...forward) > 0.3,
        "camera frame stays nonsingular when looking up",
      );
      for (let id = 0; id < STRIPS; id++)
        for (let u = 0; u <= 1; u += 0.04)
          for (const v of [0, 0.5, 1]) {
            const p = point(u, v, id, identity(1811, id), {
              development: d,
              phase: a * 3,
              turn: a,
            });
            nearest = Math.min(nearest, distance(p, eye));
          }
      assert.ok(distance(camera(d, a).eye, camera(d, a + TAU).eye) < 1e-10);
    }
  assert.ok(nearest > 0.16, `camera clearance ${nearest}`);
  assert.ok(camera(2).eye[1] < -3);
  let previous = camera(0).eye;
  for (let d = 0.001; d <= 2; d += 0.001) {
    const eye = camera(d).eye;
    assert.ok(distance(previous, eye) < 0.08);
    previous = eye;
  }
});
