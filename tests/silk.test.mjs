import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { defaultWorlds, continuousDevelopment } from "../worlds.mjs";
import {
  STRIPS,
  ALONG,
  ACROSS,
  MOTES,
  ADDITIVE_FROM,
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
  const world = worlds.find((w) => w.id === "silk-storm");
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

test("unit-speed carrier is exact; amplified artistic billows remain nonsingular", () => {
  let integralError = 0,
    minStretch = Infinity,
    maxStretch = 0;
  const ds = 1e-5;
  for (const a of [0.288, 0.72, 1.08])
    for (let phase = 0; phase < TAU; phase += 0.31)
      for (let s = 0; s <= LENGTH; s += 0.17) {
        const p = flutter(s, phase, a),
          q = flutter(s + ds, phase, a);
        integralError = Math.max(
          integralError,
          Math.abs(distance(p, q) / ds - 1),
        );
      }
  assert.ok(integralError < 0.0015, `base tangent strain ${integralError}`);
  for (const amplitude of [0.4, 1, 1.5])
    for (let id = 0; id < STRIPS; id++)
      for (let i = 0; i <= 80; i++) {
        const u = i / 80,
          v = 0.37,
          rnd = identity(1811, id),
          state = { amplitude, phase: i * 0.13 };
        const p = point(u, v, id, rnd, state);
        const du = point(u + ds, v, id, rnd, state).map(
          (x, k) => (x - p[k]) / (ds * LENGTH * 1.35),
        );
        const dv = point(u, v + ds, id, rnd, state).map(
          (x, k) => (x - p[k]) / ((ds * 8.4 * 1.35) / STRIPS),
        );
        const dot = (a, b) => a.reduce((sum, x, k) => sum + x * b[k], 0);
        const E = dot(du, du),
          F = dot(du, dv),
          G = dot(dv, dv);
        const disc = Math.sqrt((E - G) ** 2 + 4 * F * F);
        for (const lambda of [(E + G + disc) / 2, (E + G - disc) / 2]) {
          minStretch = Math.min(minStretch, Math.sqrt(lambda));
          maxStretch = Math.max(maxStretch, Math.sqrt(lambda));
        }
      }
  // The rendered billows deliberately amplify depth; unlike flutter() they
  // are NOT an inextensibility certificate. Bound the complete Jacobian to
  // catch collapsing/folding parameter charts, relative to 16.2 x 11.34.
  assert.ok(minStretch > 0.85, `minimum principal scale ${minStretch}`);
  assert.ok(maxStretch < 2.35, `maximum principal scale ${maxStretch}`);
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
  assert.equal(ADDITIVE_FROM, STRIPS * ALONG * ACROSS * 6);
  assert.equal(a.length, (ADDITIVE_FROM + MOTES * 6) * STRIDE);
  assert.equal(scene.geometry.additiveFrom, ADDITIVE_FROM);
  for (let id = 0; id < MOTES; id++) {
    const start = (ADDITIVE_FROM + id * 6) * STRIDE;
    assert.equal(a[start + 2], -1 - id);
    assert.deepEqual(Array.from(a.slice(start + 3, start + 6)),
      identity(1811, STRIPS + id).map(Math.fround));
  }
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

test("raking-light folds have real depth and banners span 3D directions", () => {
  for (const phase of [0, 0.7, 2.1, 4.5]) {
    const veil = [],
      banners = [],
      directions = [];
    for (let id = 0; id < STRIPS; id++) {
      const rnd = identity(1811, id);
      for (let i = 0; i <= 40; i++) {
        veil.push(point(i / 40, 0.5, id, rnd, { phase }));
        banners.push(point(i / 40, 0.5, id, rnd, { phase, development: 1 }));
      }
      const a = point(0, 0.5, id, rnd, { phase, development: 1 });
      const b = point(1, 0.5, id, rnd, { phase, development: 1 });
      directions.push(Math.atan2(b[1] - a[1], b[0] - a[0]));
    }
    const span = (points, k) =>
      Math.max(...points.map((p) => p[k])) -
      Math.min(...points.map((p) => p[k]));
    assert.ok(span(veil, 0) > 13, "enormous veil spans beyond the frame");
    assert.ok(span(veil, 1) > 10, "no small rectangular flag");
    assert.ok(span(veil, 2) > 2, "billows have real camera-facing depth");
    assert.ok(
      span(banners, 2) > 7,
      "near/far ribbon layers have physical depth",
    );
    assert.ok(
      Math.max(...directions) - Math.min(...directions) > 2.5,
      "banners are not a bank of horizontal strips",
    );
  }
  assert.match(scene.geometry.fragment, /mix\(u_secondary,u_primary/);
  assert.match(scene.geometry.fragment, /brightRibbon\*b/);
  assert.match(scene.geometry.fragment, /dissolve/);
  assert.match(scene.geometry.vertex, /v_shadow/);
  assert.doesNotMatch(scene.geometry.fragment, /cos\(g\*SS_TAU/);
});

test("banners have curved centre lines, distinct widths and foreground depth", () => {
  const widths = [];
  let bent = 0;
  for (let id = 0; id < STRIPS; id++) {
    const rnd = identity(1811, id), state = {development: 1, phase: 1.1};
    const a = point(0, .5, id, rnd, state), b = point(1, .5, id, rnd, state);
    const chord = b.map((x, k) => x - a[k]), length = Math.hypot(...chord);
    let bend = 0;
    for (let i = 1; i < 20; i++) {
      const p = point(i / 20, .5, id, rnd, state).map((x, k) => x - a[k]);
      const along = p.reduce((sum, x, k) => sum + x * chord[k], 0) / length;
      bend = Math.max(bend, Math.sqrt(Math.max(0, p.reduce((s,x)=>s+x*x,0) - along * along)));
    }
    if (bend > 1.5) bent++;
    widths.push(distance(point(.5, 0, id, rnd, state), point(.5, 1, id, rnd, state)));
  }
  assert.ok(bent >= 24, `${bent} genuinely curved ribbons`);
  assert.ok(Math.max(...widths) / Math.min(...widths) > 4, "not identical strips");
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
