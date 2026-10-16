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
  relayPacket,
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
import { defaultPattern } from "../rhythm.mjs";

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
            assert.ok(c.focal >= 1.77 && c.focal <= 2.46);
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
  assert.equal(a.length, RIBBONS * PER_RIBBON * 2);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  const ranks = ribbonRanks(9701);
  assert.equal(
    new Set(ranks.map((r) => Math.floor(r * RIBBONS))).size,
    RIBBONS,
  );
  let previous = -1;
  const seen = new Set();
  for (let order = 0; order < RIBBONS; order++) {
    const at = order * PER_RIBBON * 2;
    const rank = a[at],
      r = a[at + 1];
    assert.ok(
      Math.abs(rank - ranks[r]) < 1e-6,
      "trajectory keeps original rank",
    );
    assert.ok(rank > previous, "opaque bands precede additive thin strands");
    assert.equal(a[at + (PER_RIBBON - 1) * 2 + 1], r);
    seen.add(r);
    previous = rank;
  }
  assert.equal(seen.size, RIBBONS);
  assert.equal(scene.geometry.additiveFrom, 24 * PER_RIBBON);
  assert.deepEqual(scene.geometry.attributes, [1, 1]);
});

test("twisting ribbon frames stay orthonormal with one unsigned side vector", () => {
  // In the tangent's normal plane W and B rotate without changing width.
  for (let twist = -0.65; twist <= 0.65; twist += 0.01) {
    const W = [Math.cos(twist), Math.sin(twist)];
    const N = [-Math.sin(twist), Math.cos(twist)];
    assert.ok(Math.abs(Math.hypot(...W) - 1) < 1e-12);
    assert.ok(Math.abs(W[0] * N[0] + W[1] * N[1]) < 1e-12);
  }
  assert.match(
    scene.geometry.vertex,
    /bandNormal = cos\(twist\) \* B - sin\(twist\) \* W/,
  );
  assert.match(scene.geometry.fragment, /normalize\(v_normal\)/);
  assert.match(
    scene.geometry.vertex,
    /v_side = vec3\(dot\(W, right\), dot\(W, up\), -dot\(W, fwd\)\);/,
  );
  assert.equal(PER_RIBBON * RIBBONS, 258048, "bounded smooth strip mesh");
  assert.match(scene.geometry.vertex, /prev = rbPoint/);
  assert.match(scene.geometry.vertex, /HISTORY - 6/);
  assert.match(scene.geometry.vertex, /min\(order, 24\)/);
  assert.match(scene.geometry.fragment, /v_additive > \.5 \? vec3\(0\.\)/);
  assert.deepEqual(
    scene.presets.map((p) => p.seed),
    [9701, 9701, 9701, 9702, 9703, 9704, 9705, 9706],
  );
});

test("energy reveals more fixed-rank ribbons without changing trajectory identity", () => {
  for (let development = 0; development <= 2; development += 0.05) {
    assert.ok(shown(development, 0.9) > shown(development, 0.1));
    assert.ok(shown(development, 0.1) > 0.28, "low energy is not empty");
    const before = camera(
      development,
      { distance: 1, elevation: 0.35 },
      0.3,
      0.6,
    );
    const after = camera(
      development + 0.0001,
      { distance: 1, elevation: 0.35 },
      0.3,
      0.6,
    );
    assert.ok(Math.abs(after.focal - before.focal) < 0.001);
    assert.ok(
      Math.hypot(...after.target.map((v, i) => v - before.target[i])) < 0.001,
    );
  }
});

test("slot-3 relay is a bounded monotone tail-to-head event with a finite wake", () => {
  assert.match(scene.simulation.fragment, /u_rhythmHit\.w > 0/);
  assert.match(scene.simulation.fragment, /max\(u_rhythm\.w, u_rhythmHit\.w\)/);
  assert.match(scene.simulation.fragment, /mod\(u_rhythmCount\.w, 3\.\)/);
  assert.match(scene.simulation.fragment, /old \+ 1\. \/ 45\./);
  let last = 1;
  for (const age of [0.1, 0.25, 0.4, 0.55, 0.7]) {
    let best = -1,
      location = 0;
    for (let s = 0; s <= 1; s += 0.001) {
      const [front, wake] = relayPacket(s, 0.001, age, 0.94, 0);
      assert.ok(front >= 0 && front <= 1 && wake >= 0 && wake <= 1);
      if (front > best) {
        best = front;
        location = s;
      }
    }
    assert.ok(location < last);
    last = location;
    assert.deepEqual(relayPacket(location, 0.001, age, 1, 1), [0, 0]);
    assert.deepEqual(relayPacket(location, 0.001, 1, 1, 0), [0, 0]);
    assert.deepEqual(relayPacket(location, 0.001, age, 0, 0), [0, 0]);
    assert.deepEqual(
      relayPacket(location, 0.2, age, 1, 0),
      [0, 0],
      "secondary cohorts stay quiet",
    );
    const head = 1.08 - 1.4 * age;
    assert.ok(
      relayPacket(head + 0.07, 0.001, age, 1, 0)[1] > 0,
      "wake trails toward the tail",
    );
    assert.ok(
      relayPacket(head - 0.07, 0.001, age, 1, 0)[1] === 0,
      "no wake ahead of front",
    );
  }
});

test("four gestures include three authored signature loops and meet density targets", () => {
  assert.deepEqual(
    scene.rhythm.map((r) => r.slot),
    [0, 1, 2, 3],
  );
  assert.equal(scene.rhythm[3].id, "ribbon-relay");
  const signatures = [];
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const pattern = defaultPattern(scene.rhythm, style);
    const relay = pattern.tracks.find((t) => t.effect === "ribbon-relay");
    assert.ok(relay.steps.filter(Boolean).length >= 2);
    signatures.push(JSON.stringify(relay.steps));
    const density = pattern.tracks.reduce(
      (n, t) =>
        n + (t.steps.filter(Boolean).length * t.division * 4) / t.length,
      0,
    );
    assert.ok(density >= minimum, `${style}: ${density}`);
  }
  assert.equal(new Set(signatures).size, 3);
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
