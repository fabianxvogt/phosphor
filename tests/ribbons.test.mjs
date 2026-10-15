import test from "node:test";
import assert from "node:assert/strict";
import scene, { createRibbons, ribbonRanks } from "../scene-ribbons.mjs";
import {
  FLOWS,
  RIBBONS,
  PER_RIBBON,
  HISTORY,
  ROWS,
  SUBSTEPS,
  NEAR_FADE,
  blend,
  shown,
  presence,
  canonical,
  quantize,
  inside,
  sample,
  camera,
  glsl,
} from "../ribbons-geometry.mjs";
import { flow, rk4 } from "../scene-attractor.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { defaultWorlds, continuousDevelopment } from "../worlds.mjs";

let s = 97;
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
// The simulation's spawn: a point in the flow's init ball, run onto the attractor.
function spawn(f) {
  let p = f.init.center.map((c) => c + f.init.radius * 0.577 * (2 * rnd() - 1));
  for (let i = 0; i < 96; i++) p = rk4(f.system, p, f.k, f.init.h);
  return quantize(f, p);
}

test("the three flows are the Lorenz, Aizawa and Thomas systems with the shader's constants", () => {
  assert.deepEqual(
    FLOWS.map((f) => f.id),
    ["lorenz", "aizawa", "thomas"],
  );
  // Lorenz σ = 10, ρ = 28, β = 8/3 at a hand-checked point.
  assert.deepEqual(flow(0, [1, 2, 3], FLOWS[0].k), [10, 23, 2 - 8]);
  // Thomas: ẋ = sin y − b x, cyclically.
  const t = flow(3, [0.5, 1, 1.5], FLOWS[2].k);
  assert.ok(Math.abs(t[0] - (Math.sin(1) - 0.09 * 0.5)) < 1e-12);
  for (const f of FLOWS) {
    assert.ok(glsl.includes(String(+f.h.toPrecision(9))));
    assert.ok(glsl.includes(String(+f.k[0].toPrecision(9))));
  }
  assert.equal(SUBSTEPS, 2);
  assert.equal(scene.simulation.size[0], HISTORY);
  assert.equal(scene.simulation.size[1], ROWS);
});

test("quantized trajectories stay inside their boxes, near radius 1, with smooth sample spacing", () => {
  for (const f of FLOWS) {
    let maxR = 0,
      maxStep = 0;
    for (let r = 0; r < 6; r++) {
      let p = spawn(f),
        c = canonical(f, p);
      for (let i = 0; i < 4000; i++) {
        p = sample(f, p);
        assert.ok(inside(f, p), `${f.id} escaped at ${i}`);
        const n = canonical(f, p);
        maxStep = Math.max(maxStep, Math.hypot(...n.map((v, k) => v - c[k])));
        maxR = Math.max(maxR, Math.hypot(...n));
        c = n;
      }
    }
    assert.ok(maxR < 1.45, `${f.id} radius ${maxR}`);
    assert.ok(maxStep < 0.2, `${f.id} step ${maxStep}`);
  }
});

test("every flow is chaotic at its setting (positive finite-time Lyapunov exponent)", () => {
  for (const f of FLOWS) {
    const exponents = [];
    for (let r = 0; r < 3; r++) {
      let p = spawn(f);
      for (let i = 0; i < 2000; i++) p = sample(f, p);
      let q = p.map((v, i) => v + (i === 0 ? 1e-8 : 0)),
        sum = 0;
      const blocks = 300,
        per = 20;
      for (let b = 0; b < blocks; b++) {
        for (let i = 0; i < per * SUBSTEPS; i++) {
          p = rk4(f.system, p, f.k, f.h);
          q = rk4(f.system, q, f.k, f.h);
        }
        const d = Math.hypot(...p.map((v, i) => v - q[i]));
        sum += Math.log(d / 1e-8);
        q = p.map((v, i) => v + ((q[i] - v) * 1e-8) / d);
      }
      exponents.push(sum / (blocks * per * SUBSTEPS * f.h));
    }
    const mean = exponents.reduce((a, b) => a + b) / exponents.length;
    assert.ok(mean > 0.03, `${f.id}: λ ≈ ${mean}`);
  }
});

test("development blends continuously and reveals more ribbons, about 90 % at the peak", () => {
  assert.deepEqual(blend(0), { a: 0, w: 0 });
  assert.deepEqual(blend(1), { a: 1, w: 0 });
  assert.deepEqual(blend(2), { a: 1, w: 1 });
  // The blended weight of each flow is continuous across [0, 2].
  const weights = (d) => {
    const { a, w } = blend(d);
    const out = [0, 0, 0];
    out[a] += 1 - w;
    out[a + 1] += w;
    return out;
  };
  for (let d = 0; d < 2; d += 0.001) {
    const x = weights(d),
      y = weights(d + 0.001);
    assert.ok(Math.max(...x.map((v, i) => Math.abs(v - y[i]))) < 0.01, `${d}`);
    assert.ok(shown(d + 0.001) >= shown(d));
  }
  assert.ok(Math.abs(shown(0) - 0.42) < 1e-9);
  // The labyrinth shows about 90 % of the ribbons (all of them read as noise).
  assert.ok(shown(2) > 0.85 && shown(2) < 0.95);
  const ranks = ribbonRanks(9701);
  const full = ranks.filter((r) => presence(r, 2) === 1).length;
  const any = ranks.filter((r) => presence(r, 2) > 0).length;
  assert.ok(full > 0.8 * RIBBONS && any < 0.95 * RIBBONS, `${full} ${any}`);
  assert.ok(full > ranks.filter((r) => presence(r, 1) > 0).length);
  const sparse = ranks.filter((r) => presence(r, 0) > 0).length;
  assert.ok(sparse > 60 && sparse < 100, `${sparse}`);
});

test("the camera stays outside the attractors; ribbons near the eye are not drawn", () => {
  let closest = Infinity;
  for (let d = 0; d <= 2.0001; d += 0.1)
    for (const distance of [0.85, 1.3])
      for (const elevation of [0, 1])
        for (let a = 0; a < 1; a += 0.05)
          for (let b = 0; b < 1; b += 0.05) {
            const c = camera(d, { distance, elevation }, a, b);
            closest = Math.min(closest, Math.hypot(...c.eye));
            assert.ok(c.pitch <= 1.3 && c.pitch >= -0.4);
            assert.ok(c.focal >= 1.5 && c.focal <= 2.1);
          }
  // Beyond the 95th-percentile radius of every flow (≈ 1.05), so the eye is
  // never inside the bulk; rare excursions closer than NEAR_FADE vanish.
  assert.ok(closest > 1.4, `${closest}`);
  assert.ok(NEAR_FADE[0] > 0.1 && NEAR_FADE[1] > NEAR_FADE[0]);
});

test("identity is fixed per seed and independent of development", () => {
  const a = createRibbons(9701),
    b = createRibbons(9701),
    c = createRibbons(9702);
  assert.equal(a.length, RIBBONS * PER_RIBBON);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  const ranks = ribbonRanks(9701);
  assert.equal(
    new Set(ranks.map((r) => Math.floor(r * RIBBONS))).size,
    RIBBONS,
  );
  for (let r = 0; r < RIBBONS; r += 17)
    assert.ok(Math.abs(a[r * PER_RIBBON + 5] - ranks[r]) < 1e-6);
});

test("looks validate; the three world states differ only in development", () => {
  assert.ok(scene.presets.length >= 6);
  for (let i = 0; i < scene.presets.length; i++) {
    const snapshot = presetSnapshot(scene, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [scene]),
      snapshot,
    );
  }
  assert.ok(!("development" in scene.energy));
  const world = defaultWorlds(
    scene.presets.map((p) => `${scene.id}:${p.name}`),
  ).find((w) => w.id === "attractor-ribbons");
  assert.ok(world);
  const clips = world.states.map((st) => ({
    snapshot: presetSnapshot(
      scene,
      scene.presets.findIndex((p) => `${scene.id}:${p.name}` === st.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, scene)?.positions, [0, 1, 2]);
});
