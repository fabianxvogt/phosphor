import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import murmuration from "../scene-murmuration.mjs";
import { BIRDS, TEMPLATE, createGeometry } from "../murmuration-geometry.mjs";
import {
  CLOCK_PERIOD,
  LATTICE,
  N,
  TILT,
  TWO32,
  VEL_RANGE,
  anchor,
  cloud,
  cycle,
  neighbours,
  rnd,
  seedKey,
  simulate,
  slot,
  weights,
} from "../murmuration-model.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("presets: three world states share seed and parameters; the world is authored", () => {
  assert.equal(murmuration.number, 88);
  assert.ok(murmuration.presets.length >= 6);
  murmuration.presets.forEach((_, i) =>
    validateSnapshot(presetSnapshot(murmuration, i), scenes),
  );
  const states = murmuration.presets.slice(0, 3);
  for (const s of states) {
    assert.equal(s.seed, states[0].seed);
    for (const f of murmuration.schema)
      if (f.key !== "development")
        assert.equal(s.params[f.key], states[0].params[f.key]);
  }
  const clips = [0, 1, 2].map((i) => ({
    snapshot: presetSnapshot(murmuration, i),
  }));
  assert.deepEqual(
    continuousDevelopment(clips, murmuration).positions,
    [0, 1, 2],
  );
  const ids = scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`));
  const world = defaultWorlds(ids).find((w) => w.id === "murmuration");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Loose", "Surge", "Formation"],
  );
});

test("topological neighbours are fixed, symmetric and never the clock", () => {
  const size = LATTICE;
  for (const id of [1, 2, 255, 256, 257, 1000, BIRDS - 1]) {
    const nb = neighbours(id, size);
    assert.ok(nb.length >= 7 && nb.length <= 8);
    assert.equal(new Set(nb).size, nb.length);
    assert.ok(!nb.includes(0) && !nb.includes(id));
    for (const n of nb) assert.ok(neighbours(n, size).includes(id));
  }
  // The mesh draws one bird per lattice site; site 0 draws the falcon.
  const data = createGeometry();
  assert.equal(data.length, BIRDS * TEMPLATE.length * 5);
  assert.equal(data[0], -1);
  assert.equal(data[TEMPLATE.length * 5], 1);
});

test("development blends forces, never positions", () => {
  // Jump development 0 → 2 → 0 in single steps: every bird still moves at
  // most its (bounded) speed per step, so the flock never teleports.
  let previous = null,
    worst = 0;
  simulate(5, 360, (step, birds) => {
    if (previous)
      for (let i = 1; i < birds.length; i++)
        worst = Math.max(worst, dist(birds[i].p, previous[i].p));
    previous = birds.map((b) => ({ p: b.p.slice() }));
    return { dev: step % 120 < 40 ? 0 : step % 120 < 80 ? 2 : 1 };
  });
  assert.ok(worst <= VEL_RANGE * 0.9 * (1 / 60) + 1e-9, `worst ${worst}`);
  const w = weights(0.5);
  assert.ok(w.flock > 0 && w.surge > 0 && w.form === 0 && w.loose > 0);
  assert.deepEqual(weights(2), { flock: 1, surge: 0, form: 1, loose: 0 });
});

test("startle waves cross the lattice one neighbour per step, then rest", () => {
  const size = [24, 12];
  const origin = 5 * 24 + 12;
  const firedAt = new Map();
  simulate(
    9,
    50,
    (step, birds) => {
      birds.forEach((b, id) => {
        if (b.T === 1 && !firedAt.has(id)) firedAt.set(id, step);
      });
      return { dev: 0, startle: (id) => step === 0 && id === origin };
    },
    size,
  );
  // Fire time equals the lattice (Chebyshev, torus) distance from the origin.
  for (const [id, step] of firedAt) {
    const dx = Math.abs((id % 24) - 12),
      dy = Math.abs(Math.floor(id / 24) - 5);
    const d = Math.max(Math.min(dx, 24 - dx), Math.min(dy, 12 - dy));
    assert.equal(step, d + 1, `bird ${id}`);
  }
  assert.equal(firedAt.size, 24 * 12 - 1);
});

test("Surge holds a folded cloud and Formation converges to its slots", () => {
  const size = [32, 16];
  const plan = (dev) => () => ({ dev, formation: 0, cycle: 0 });
  const surge = simulate(11, 60 * 25, plan(1), size);
  const A = anchor(surge.clock);
  let spread = 0;
  for (const b of surge.birds.slice(1)) {
    assert.ok(b.p.every(Number.isFinite) && b.v.every(Number.isFinite));
    spread += dist(b.p, A);
  }
  spread /= surge.birds.length - 1;
  // A volume, not a collapsed strand.
  assert.ok(spread > 1.2 && spread < 6, `spread ${spread}`);
  const form = simulate(11, 60 * 25, plan(2), size, surge.birds);
  // Every bird flies close to its own persistent slot (the spring target).
  const key = seedKey(11);
  const home = anchor(form.clock);
  let miss = 0;
  form.birds.slice(1).forEach((b, i) => {
    const id = i + 1;
    const s = slot(
      key,
      (id % 32) / 32,
      Math.floor(id / 32) / 16,
      rnd(key, id, 6),
      form.clock,
      0,
    );
    const j = [8, 9, 10].map((k) => (rnd(key, id, k) - 0.5) * 0.16);
    miss += dist(b.p, [
      home[0] + j[0] + s[0],
      home[1] + j[1] + s[1],
      home[2] + j[2] + s[2],
    ]);
  });
  miss /= form.birds.length - 1;
  assert.ok(miss < 0.5, `mean slot error ${miss}`);
});

test("formation slots: the vortex is a torus; the tilt is a rotation", () => {
  assert.ok(Math.abs(0.9 * 0.9 + TILT * TILT - 1) < 1e-5);
  const key = seedKey(1207);
  const clock = 123456789;
  const A = [0, 1.2, 0];
  for (let k = 0; k < 200; k++) {
    const u = ((k * 37) % 256) / 256,
      v = ((k * 13) % 128) / 128,
      h = (k % 10) / 10;
    const p = slot(key, u, v, h, clock, 0);
    const r = dist(p, A);
    // On the torus: distance to the centre lies in [3.1 − 1.15, 3.1 + 1.15].
    assert.ok(r > 3.1 - 1.16 && r < 3.1 + 1.16, `r ${r}`);
  }
  // The surge cloud is a finite blob around home.
  for (let k = 0; k < 100; k++) {
    const c = cloud(key, k / 100, ((k * 7) % 100) / 100, (k % 9) / 9, clock);
    assert.ok(Math.hypot(...c) < 9);
  }
});

test("distant bird LOD has stable image-plane area and smooth energy reveal", () => {
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (const resolution of [540, 1080, 2160])
    for (const px1080 of [.01, .5, 1, 3, 4, 7, 20]) {
      const px = px1080 * resolution / 1080;
      const lod = 1 - smooth(3, 7, px * 1080 / resolution);
      assert.ok(lod >= 0 && lod <= 1);
      assert.equal(lod, 1 - smooth(3, 7, px1080));
      const grow = Math.max(1, 3 * resolution / 1080 / px);
      const fat = Math.max(1, Math.min(3, 9 * resolution / 1080 / (px * grow)));
      assert.ok(Number.isFinite(1 / (grow * fat)));
      // In the far LOD, orientation is in the image plane, so a wing
      // cannot vanish merely because a physical normal turned edge-on.
      if (px1080 <= 3) assert.equal(lod, 1);
    }
  for (const keep of [.55, .8, 1]) {
    const scale = (r) => Math.sqrt(1 - smooth(keep - .05, keep, r));
    assert.equal(scale(keep), 0);
    assert.ok(scale(keep - 1e-7) < 1e-5);
  }
  assert.match(murmuration.geometry.vertex, /cam.right \* plane.x \+ cam.up \* plane.y/);
  assert.match(murmuration.geometry.vertex, /sqrt\(reveal\)/);
  assert.match(murmuration.geometry.fragment, /key = mix\(\.28,/);
});

test("bounded formation dolly, polynomial skyline and identifiers stay continuous", () => {
  for (let dive = 0; dive <= 1; dive += .01) {
    const distance = 8 * (1 - .18 * dive);
    assert.ok(distance >= 6.55 && distance <= 8);
    const focal = 1.65 + (1.45 - 1.65) * dive;
    assert.ok(focal >= 1.45 && focal <= 1.65);
  }
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  for (let a = -Math.PI; a <= Math.PI; a += .013) {
    const h = [Math.cos(a), Math.sin(a)], h2 = mul(h, h), h3 = mul(h2, h), h4 = mul(h2, h2), h7 = mul(h3, h4);
    for (const [n, h] of [[3, h3], [4, h4], [7, h7]])
      assert.ok(Math.hypot(h[0] - Math.cos(n * a), h[1] - Math.sin(n * a)) < 1e-14);
  }
  assert.deepEqual(murmuration.presets.map((p) => [p.name, p.seed]), [
    ["Evening Roost", 1207], ["Surging Cloud", 1207], ["Vortex Mill", 1207],
    ["Falcon Hour", 3301], ["Knotted Ribbon", 2207], ["Twister", 4409], ["High Cloud", 5113],
  ]);
  assert.match(murmuration.geometry.vertex, /mix\(dist, \.82 \* dist, m.dive\)/);
});

test("exact clock: integer cycles, and shader constants follow the model", () => {
  for (const n of Object.values(N)) assert.ok(Number.isInteger(n) && n > 0);
  const c = 3e9;
  assert.equal(cycle(c, N.circ), (Math.imul(c, N.circ) >>> 0) / TWO32);
  const sources = [
    murmuration.simulation.fragment,
    murmuration.geometry.vertex,
    murmuration.geometry.fragment,
    murmuration.fragment,
  ].join("\n");
  assert.ok(sources.includes(`MU_P = ${CLOCK_PERIOD}.`));
  for (const n of [N.circ, N.roll, N.swirl, N.breath, N.pulse, N.falcon])
    assert.ok(sources.includes(`${n}u`), `N ${n}`);
  assert.ok(!/\$\{/.test(sources));
  assert.deepEqual(murmuration.simulation.size, [4 * LATTICE[0], LATTICE[1]]);
});
