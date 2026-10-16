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
  formationAt,
  neighbours,
  rnd,
  seedKey,
  simulate,
  slot,
  weights,
} from "../murmuration-model.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { defaultPattern } from "../rhythm.mjs";

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

test("Surge holds a folded sheet and Formation converges to its slots", () => {
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
  // A spatially extended folded sheet, not a collapse to the anchor.
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

test("formation slots: folded scroll stays bounded; the tilt is a rotation", () => {
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
    // Scroll center ±3.8 / ±2.4 / ±1.4, cross-sheet width <= .95.
    assert.ok(r < 6 && Number.isFinite(r), `r ${r}`);
  }
  // The surging sheet remains finitely bounded around home.
  for (let k = 0; k < 100; k++) {
    const c = cloud(key, k / 100, ((k * 7) % 100) / 100, (k % 9) / 9, clock);
    assert.ok(Math.hypot(...c) < 9);
  }
});

test("distant bird LOD has stable image-plane area and smooth energy reveal", () => {
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (const resolution of [540, 1080, 2160])
    for (const px1080 of [0.01, 0.5, 1, 3, 4, 7, 20]) {
      const px = (px1080 * resolution) / 1080;
      const lod = 1 - smooth(3, 7, (px * 1080) / resolution);
      assert.ok(lod >= 0 && lod <= 1);
      assert.equal(lod, 1 - smooth(3, 7, px1080));
      const grow = Math.max(1, (4 * resolution) / 1080 / px);
      const fat = Math.max(
        1,
        Math.min(2.5, (7.5 * resolution) / 1080 / (px * grow)),
      );
      assert.ok(Number.isFinite(1 / (grow * fat)));
      // In the far LOD, orientation is in the image plane, so a wing
      // cannot vanish merely because a physical normal turned edge-on.
      if (px1080 <= 3) assert.equal(lod, 1);
    }
  for (const keep of [0.55, 0.8, 1]) {
    const scale = (r) => Math.sqrt(1 - smooth(keep - 0.05, keep, r));
    assert.equal(scale(keep), 0);
    assert.ok(scale(keep - 1e-7) < 1e-5);
  }
  assert.match(
    murmuration.geometry.vertex,
    /cam.right \* plane.x \+ cam.up \* plane.y/,
  );
  assert.match(murmuration.geometry.vertex, /sqrt\(reveal\)/);
  assert.match(murmuration.geometry.fragment, /vec3 col=u_secondary\*\(\.004/);
  assert.match(
    murmuration.geometry.vertex,
    /wingArea=\.15\+\.85\*abs\(cos\(bank\)\)/,
  );
});

test("bounded formation dolly, polynomial skyline and identifiers stay continuous", () => {
  for (let dive = 0; dive <= 1; dive += 0.01) {
    const distance = 8 * (1 - 0.18 * dive);
    assert.ok(distance >= 6.55 && distance <= 8);
    const focal = 1.65 + (1.45 - 1.65) * dive;
    assert.ok(focal >= 1.45 && focal <= 1.65);
  }
  for (const [aspect, expected] of [
    [16 / 9, 1],
    [1, 1],
    [9 / 16, 0.759375],
    [0.4, 0.72],
  ]) {
    const fit = Math.min(1, Math.max(0.72, 1.35 * aspect));
    assert.ok(Math.abs(fit - expected) < 1e-12);
  }
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  for (let a = -Math.PI; a <= Math.PI; a += 0.013) {
    const h = [Math.cos(a), Math.sin(a)],
      h2 = mul(h, h),
      h3 = mul(h2, h),
      h4 = mul(h2, h2),
      h7 = mul(h3, h4);
    for (const [n, h] of [
      [3, h3],
      [4, h4],
      [7, h7],
    ])
      assert.ok(
        Math.hypot(h[0] - Math.cos(n * a), h[1] - Math.sin(n * a)) < 1e-14,
      );
  }
  assert.deepEqual(
    murmuration.presets.map((p) => [p.name, p.seed]),
    [
      ["Evening Roost", 1207],
      ["Surging Cloud", 1207],
      ["Vortex Mill", 1207],
      ["Falcon Hour", 3301],
      ["Knotted Ribbon", 2207],
      ["Twister", 4409],
      ["High Cloud", 5113],
    ],
  );
  assert.match(
    murmuration.geometry.vertex,
    /mix\(dist, \.82 \* dist, m.dive\)/,
  );
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

test("ribbons have a broad graded core, periodic slots and persistent rate phase", () => {
  const key = seedKey(1207),
    c = 1234567;
  for (const u of [0.12, 0.31, 0.59, 0.87]) {
    const center = cloud(key, u, 0.5, 0.5, c);
    const edge = dist(center, cloud(key, u, 1, 0.5, c));
    const core = dist(center, cloud(key, u, 0.75, 0.5, c));
    assert.ok(
      Math.abs(core / edge - 0.2375) < 1e-12,
      "linear+cubic sampling broadens the flock without losing its dense core",
    );
  }
  // The closed scroll and knot agree at the lattice seam, including twist.
  // The twister is deliberately an open vertical strand, not a closed loop.
  for (const form of [0, 1])
    for (const v of [0.1, 0.5, 0.9])
      assert.ok(
        dist(slot(key, 0, v, 0.4, c, form), slot(key, 1, v, 0.4, c, form)) <
          1e-10,
      );
  // Fractional cycle rates accumulate in their own uint state, rather than
  // multiplying an already wrapped 240 s phase. Editing speed holds phase.
  let phase = 0;
  for (let i = 0; i < 43200 * 60; i++) {
    const rate = i < 14400 * 60 ? 0.15 : 0.5;
    const before = formationAt(0, 0, rate, phase);
    const next = (phase + Math.round((rate * TWO32) / 240 / 60)) >>> 0;
    const after = formationAt(0, 0, rate, next);
    const delta = (after - before + 3) % 3;
    assert.ok(delta < 0.00011);
    phase = next;
  }
  assert.match(murmuration.simulation.fragment, /ivec2\(1,0\)/);
  assert.ok(
    !murmuration.simulation.fragment.includes("1.7 * ph"),
    "no nonperiodic loose wander phase",
  );
});

test("cloud data uses a seam-free diamond chart, never a colour cache", () => {
  for (let a = -Math.PI; a < Math.PI; a += 0.007) {
    const x = Math.cos(a),
      z = Math.sin(a),
      hx = x / (Math.abs(x) + Math.abs(z));
    const az = z >= 0 ? 1 - hx : 3 + hx;
    const h =
      az < 1
        ? [1 - az, az]
        : az < 2
          ? [1 - az, 2 - az]
          : az < 3
            ? [az - 3, 2 - az]
            : [az - 3, az - 4];
    const l = Math.hypot(...h);
    assert.ok(Math.hypot(h[0] / l - x, h[1] / l - z) < 1e-14);
  }
  assert.deepEqual(murmuration.precompute.size, [512, 129]);
  assert.equal(murmuration.precompute.filter, "linear");
  assert.equal(murmuration.precompute.nearestFallback, true);
  assert.match(murmuration.precompute.fragment, /vec4\(muCloudExact/);
  assert.match(murmuration.fragment, /#ifdef PRECOMPUTED_LINEAR/);
  assert.match(murmuration.fragment, /horizonAA=max\(fwidth\(e\)/);
});

test("four authored gestures fill the grid; the wing-front is local and hit-seeded", () => {
  assert.deepEqual(
    murmuration.rhythm.map((g) => g.slot),
    [0, 1, 2, 3],
  );
  assert.equal(murmuration.rhythm[3].id, "wing-front");
  assert.deepEqual(Object.values(murmuration.rhythmStyles), [
    "Dusk wings",
    "Turning flock",
    "Falcon shadow",
  ]);
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const pattern = defaultPattern(murmuration.rhythm, style);
    const density = pattern.tracks.reduce(
      (n, t) =>
        n + (t.steps.filter((v) => v > 0).length * 4 * t.division) / t.length,
      0,
    );
    assert.ok(density >= minimum, `${style}: ${density} hits/bar`);
    const front = murmuration.rhythm[3].styles[style];
    const hits = front.steps.flatMap((v, i) => (v > 0 ? [i] : []));
    assert.ok(hits.length >= 2);
    const gap = Math.min(
      ...hits.map(
        (hit, i) =>
          (hits[(i + 1) % hits.length] +
            (i === hits.length - 1 ? front.length : 0) -
            hit) /
          front.division,
      ),
    );
    assert.ok(
      front.duration < gap,
      `${style}: wing-front settles before next fill`,
    );
  }
  assert.match(murmuration.simulation.fragment, /u_rhythmHit\.w > 0\./);
  assert.match(murmuration.geometry.vertex, /u_rhythmCount\.w/);
  assert.match(murmuration.geometry.vertex, /u_rhythm\.w/);
  assert.match(murmuration.geometry.vertex, /v_glint = u_rhythm\.x/);
  assert.match(murmuration.geometry.fragment, /v_front\*feather/);
  // pow(negative, integer-looking float) is undefined in GLSL: the third
  // film caught this collapsing the cloud. Square trig values by multiply.
  for (const source of [
    murmuration.simulation.fragment,
    murmuration.geometry.vertex,
  ])
    assert.doesNotMatch(source, /pow\((?:sin|cos)\(/);
  assert.match(murmuration.geometry.vertex, /swell\*swell/);
});
