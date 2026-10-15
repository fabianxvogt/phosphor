import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import {
  ADDITIVE_FROM,
  ATTRIBUTES,
  CENTER,
  FORM,
  HALF,
  HANG,
  HOLD,
  KIND,
  N,
  RING,
  RIPPLE_BOUND,
  SPACING,
  STRIDE,
  TILT,
  VMAX,
  ball,
  camera,
  chorus,
  columnSpan,
  createGeometry,
  hazeLayer,
  KICK_STRENGTH,
  rhythmGain,
  ringHeight,
  rippleHeight,
  seedAngles,
  shimmerAt,
  waveHeight,
} from "../kinetic-model.mjs";

const scene = scenes.find((s) => s.id === "kinetic");
const TAU = Math.PI * 2;
const close = (a, b, eps, label = "") =>
  assert.ok(Math.abs(a - b) <= eps, `${label} ${a} != ${b} (±${eps})`);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const base = { dev: 0, W: 0.7, M: 0.2, Phi: 0.3, kick: 0, detail: 0, amp: 1, size: 1, seed: 1216 };

test("kinetic is a registered continuous world with three authored states", () => {
  assert.ok(scene);
  assert.equal(scene.number, 102);
  assert.equal(scene.development, "development");
  const world = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  ).find((w) => w.id === "kinetic-rain");
  assert.ok(world, "world kinetic-rain is playable");
  assert.equal(world.name, "Kinetic Rain");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Ceiling", "Waves", "Sculpture"],
  );
  const clips = world.states.map((state) => {
    const index = scene.presets.findIndex((p) => `kinetic:${p.name}` === state.look);
    return { snapshot: presetSnapshot(scene, index) };
  });
  assert.deepEqual(continuousDevelopment(clips, scene)?.positions, [0, 1, 2]);
  assert.ok(scene.presets.length >= 6);
  assert.equal(scene.rhythm.length, 3);
  for (const preset of scene.presets)
    for (const field of scene.schema) {
      const value = preset.params[field.key];
      assert.ok(Number.isFinite(value), `${preset.name}.${field.key}`);
      assert.ok(value >= field.min && value <= field.max, `${preset.name}.${field.key}`);
    }
  assert.equal(ATTRIBUTES.reduce((a, b) => a + b), STRIDE);
  assert.ok(N * N >= 4096, "thousands of spheres");
});

test("the shaders are built from the model's constants", () => {
  const vertex = scene.geometry.vertex;
  for (const snippet of [
    `N=${N}.`,
    `SP=${SPACING}`,
    `HANG=${HANG}`,
    `HOLD=${HOLD}`,
    `FSPH=${FORM.sphere}`,
    `FTR=${FORM.torusR}`,
    `FMW=${FORM.mobiusW}`,
    `FSK=${FORM.saddleK}`,
    `RREACH=${RING.reach}`,
    `TC=${Math.cos(TILT).toFixed(7)}`,
  ])
    assert.ok(vertex.includes(snippet), snippet);
  assert.equal(scene.geometry.additiveFrom, ADDITIVE_FROM);
  // Clock periods match every use: wave phase ×1/×2/×3 (2π), four forms (4),
  // turn ×1 and drift ×½ (4π), camera angle (2π).
  assert.deepEqual(
    scene.clocks.map((c) => c.period),
    [TAU, 4, 2 * TAU, TAU],
  );
  for (const source of [scene.fragment, vertex, scene.geometry.fragment])
    assert.doesNotMatch(source, /mod\(\s*u_time/);
});

test("geometry: deterministic, finite, seed-dependent; identity is the grid index", () => {
  const a = createGeometry(1216),
    again = createGeometry(1216),
    b = createGeometry(1217);
  assert.deepEqual(a, again);
  assert.notDeepEqual(a, b);
  assert.ok(a.every(Number.isFinite));
  assert.equal(a.length, N * N * 3 * 6 * STRIDE);
  assert.equal(ADDITIVE_FROM, 2 * N * N * 6);
  // Development is not an input of the generator: each block (sphere,
  // mirror, thread) lists every (i, j) exactly once in the same order, so a
  // sphere, its reflection and its thread share one identity in all states.
  assert.equal(createGeometry.length, 1);
  for (const [k, kind] of [KIND.sphere, KIND.reflection, KIND.thread].entries())
    for (let s = 0; s < N * N; s += 97) {
      const o = (k * N * N + s) * 6 * STRIDE;
      assert.equal(a[o], s % N);
      assert.equal(a[o + 1], Math.floor(s / N));
      assert.equal(a[o + 4], kind);
      assert.equal(a[o + 5], a[s * 6 * STRIDE + 5], "same random identity");
    }
});

test("choreography weights are a smooth partition of unity with holds", () => {
  for (let M = 0; M < 8; M += 0.013) {
    const w = chorus(M);
    close(w.reduce((x, y) => x + y), 1, 1e-12);
    assert.ok(w.every((x) => x >= 0));
    const f = M - Math.floor(M);
    if (f < HOLD) assert.equal(w[Math.floor(M) % 4], 1, `hold at ${M}`);
  }
  // Continuous across every integer (the next form is fully in place).
  for (let k = 1; k <= 8; k++) {
    const before = chorus(k - 1e-9),
      after = chorus(k + 1e-9);
    for (let i = 0; i < 4; i++) close(before[i], after[i], 1e-6, `M=${k}`);
  }
});

test("height functions: travelling waves, faint ripple and a ring that never pops", () => {
  const seed = seedAngles(1216).wave;
  for (let n = 0; n < 400; n++) {
    const x = -HALF + ((n * 37) % 101) / 100 * 2 * HALF,
      z = -HALF + ((n * 53) % 97) / 96 * 2 * HALF,
      W = n * 0.173;
    assert.ok(Math.abs(rippleHeight(x, z, W)) <= RIPPLE_BOUND + 1e-12);
    const rho = Math.hypot(x, z),
      th = Math.atan2(z, x);
    const at = (r, t, W2, w) =>
      waveHeight(r * Math.cos(t), r * Math.sin(t), W2, w, 0.2, 0, seed);
    // Radial choreography: crests move outwards at 2/1.15 units per radian.
    close(at(rho + 2 * 0.37 / 1.15, th, W + 0.37, [0, 1, 0, 0]), at(rho, th, W, [0, 1, 0, 0]), 1e-9);
    // Spiral: the three arms rotate rigidly by 2/3 rad per radian of phase
    // (away from the centre, where the arms fade in).
    if (rho > 2.7)
      close(
        at(rho, th + (2 * 0.21) / 3, W + 0.21, [0, 0, 1, 0]),
        at(rho, th, W, [0, 0, 1, 0]),
        1e-6,
      );
    // Standing interference: nodes stay put; the height is separable in time.
    const s0 = at(rho, th, 0, [0, 0, 0, 1]);
    close(at(rho, th, W, [0, 0, 0, 1]), s0 * Math.cos(2 * W), 1e-9);
    // Every choreography is bounded by its amplitude sum.
    for (let c = 0; c < 4; c++) {
      const w = [0, 0, 0, 0];
      w[c] = 1;
      assert.ok(Math.abs(at(rho, th, W, w)) <= 0.34 + 1e-12);
    }
  }
  for (const level of [0, 0.1, 0.5, 0.9, 1]) {
    const launch = KICK_STRENGTH * rhythmGain(level);
    for (let rho = 0; rho < 18; rho += 0.1) {
      close(ringHeight(rho, 0, level), 0, 0);
      close(ringHeight(rho, launch, level), 0, 1e-15, "launch at the authored strength");
      for (let k = 0; k <= launch; k += 0.05)
        assert.ok(Math.abs(ringHeight(rho, k, level)) <= RING.amp * k + 1e-12);
    }
  }
});

test("states: level ceiling, wave heightfield, exact parametric surfaces", () => {
  const seed = seedAngles(1216).wave;
  for (let j = 0; j < N; j += 7)
    for (let i = 0; i < N; i += 5) {
      const x = (i - (N - 1) / 2) * SPACING,
        z = (j - (N - 1) / 2) * SPACING;
      // Ceiling: on the lattice, level within the faint ripple.
      const c = ball(i, j, { ...base, dev: 0 });
      close(c.p[0], x, 1e-12);
      close(c.p[2], z, 1e-12);
      assert.ok(Math.abs(c.p[1] - HANG) <= RIPPLE_BOUND + 1e-12);
      // Waves: a pure heightfield over the same lattice point.
      const amp = 1.3;
      const w = ball(i, j, { ...base, dev: 1, amp, M: 2.2 });
      close(w.p[0], x, 1e-12);
      close(w.p[2], z, 1e-12);
      close(w.p[1], HANG + waveHeight(x, z, base.W, chorus(2.2), base.Phi, 0, seed) * amp, 1e-12);
      assert.equal(w.sig, 0);
    }
  // Sculpture: during a hold every sphere lies on the form's implicit surface.
  const unrotate = (p, Phi) => {
    const q = [p[0] - CENTER[0], p[1] - CENTER[1], p[2] - CENTER[2]];
    const c = Math.cos(-Phi),
      s = Math.sin(-Phi);
    const x = c * q[0] - s * q[2],
      z0 = s * q[0] + c * q[2];
    const ct = Math.cos(-TILT),
      st = Math.sin(-TILT);
    return [x, ct * q[1] - st * z0, st * q[1] + ct * z0];
  };
  let checked = 0;
  for (let j = 0; j < N; j += 3)
    for (let i = 0; i < N; i += 3) {
      // Undo the turn, the tilt and the breathing scale of this sphere.
      const k = shimmerAt((i + 0.5) / N, (j + 0.5) / N, base.W, base.detail);
      const at = (M) => {
        const b = ball(i, j, { ...base, dev: 2, M });
        assert.equal(b.sig, 1);
        return unrotate(b.p, base.Phi).map((x) => x / k);
      };
      const [sx, sy, sz] = at(0.3);
      close(Math.hypot(sx, sy, sz), FORM.sphere, 1e-9, "sphere");
      const [tx, ty, tz] = at(1.3);
      close((Math.hypot(tx, tz) - FORM.torusR) ** 2 + ty * ty, FORM.torusr ** 2, 1e-9, "torus");
      // Möbius band: the offset from the centre circle lies along the
      // half-angle direction (cos θ/2, sin θ/2) and within the half width.
      const [mx, my, mz] = at(2.3);
      const th = Math.atan2(mz, mx),
        dr = Math.hypot(mx, mz) - FORM.mobiusR;
      close(dr * Math.sin(th / 2) - my * Math.cos(th / 2), 0, 1e-9, "möbius ruling");
      assert.ok(Math.hypot(dr, my) <= FORM.mobiusW + 1e-9);
      // Wave saddle: y = k r² cos 2θ + a r sin(2.6 r − 2W).
      const [px, py, pz] = at(3.3);
      const r = Math.hypot(px, pz),
        a = Math.atan2(pz, px);
      close(
        py,
        FORM.saddleK * r * r * Math.cos(2 * a) + FORM.saddleWave * r * Math.sin(2.6 * r - 2 * base.W),
        1e-9,
        "saddle",
      );
      checked++;
    }
  assert.ok(checked > 600);
  // The seed shifts the cycle by whole forms only (holds stay holds): the
  // Möbius Drift seed opens on the band.
  const drift = scene.presets.find((p) => p.name === "Möbius Drift");
  for (let s = 0; s < N * N; s += 101) {
    const i = s % N,
      j = Math.floor(s / N);
    const k = shimmerAt((i + 0.5) / N, (j + 0.5) / N, base.W, 0);
    const [mx, my, mz] = unrotate(
      ball(i, j, { ...base, dev: 2, M: 0.3, seed: drift.seed }).p,
      base.Phi,
    ).map((x) => x / k);
    const th = Math.atan2(mz, mx),
      dr = Math.hypot(mx, mz) - FORM.mobiusR;
    close(dr * Math.sin(th / 2) - my * Math.cos(th / 2), 0, 1e-9, "möbius drift");
  }
});

test("clock phases wrap exactly: every position is periodic in its clock's period", () => {
  for (const dev of [0.3, 1, 1.6, 2])
    for (let s = 0; s < N * N; s += 211) {
      const i = s % N,
        j = Math.floor(s / N);
      const p = ball(i, j, { ...base, dev, detail: 0.7 }).p;
      for (const shift of [{ W: base.W + TAU }, { M: base.M + 4 }, { Phi: base.Phi + 2 * TAU }]) {
        const q = ball(i, j, { ...base, dev, detail: 0.7, ...shift }).p;
        assert.ok(dist(p, q) < 1e-9, `${dev} ${JSON.stringify(shift)}`);
      }
    }
  const a = camera(1.2, 0.4),
    b = camera(1.2, 0.4 + TAU);
  assert.ok(dist(a.eye, b.eye) < 1e-12 && dist(a.target, b.target) < 1e-12);
});

test("development is continuous (Lipschitz) and identity persists", () => {
  // A bounded step in development moves every sphere a bounded distance:
  // no jumps anywhere in 0 … 2, forward or back.
  const step = 0.002;
  let worst = 0;
  for (let s = 0; s < N * N; s += 37) {
    const i = s % N,
      j = Math.floor(s / N);
    let prev = ball(i, j, { ...base, detail: 0.5, amp: 1.6, dev: 0 }).p;
    for (let dev = step; dev <= 2 + 1e-9; dev += step) {
      const p = ball(i, j, { ...base, detail: 0.5, amp: 1.6, dev }).p;
      worst = Math.max(worst, dist(p, prev) / step);
      prev = p;
    }
  }
  assert.ok(worst < 60, `Lipschitz ${worst}`);
  // Reversal retraces the same path (pure function of development).
  const fwd = ball(13, 61, { ...base, dev: 1.37 }).p;
  ball(13, 61, { ...base, dev: 1.9 });
  assert.deepEqual(ball(13, 61, { ...base, dev: 1.37 }).p, fwd);
});

// Kick envelope as rhythm.mjs shapes it, times the engine's energy gain:
// strength · d²(3 − 2d) · gain(level), d the remaining fraction of the
// gesture's duration (in beats).
const envelope = (beats, duration, strength, level) => {
  const d = Math.max(0, 1 - beats / duration);
  return strength * d * d * (3 - 2 * d) * rhythmGain(level);
};

test("motors stay within their speed envelope at every development", () => {
  const kickFx = scene.rhythm.find((r) => r.slot === 0).defaults;
  assert.equal(kickFx.strength, KICK_STRENGTH);
  const bps = 140 / 60;
  const maxRate = (k) => scene.clocks[k].rate(scene.schema.map((f) => f.max), 1);
  const rates = { W: maxRate(0), M: maxRate(1), Phi: maxRate(2) };
  const dt = 1 / 240;
  let worst = 0;
  for (const level of [0.3, 1])
    for (const dev of [0, 0.5, 1, 1.25, 1.5, 1.75, 2])
      for (const t0 of [0.31, 0.62, 1.05, 1.7, 2.6, 5.3, 9.9, 12.4])
        for (let s = 0; s < N * N; s += 17) {
          const i = s % N,
            j = Math.floor(s / N);
          const at = (t) =>
            ball(i, j, {
              dev,
              W: t * rates.W,
              M: t * rates.M,
              Phi: t * rates.Phi,
              kick: envelope((t * bps) % kickFx.length, kickFx.duration, kickFx.strength, level),
              level,
              detail: 1,
              amp: 1.6,
              size: 1,
              seed: 1216,
            }).p;
          // Includes the launch instants: at the authored strength the
          // ring starts on the axis with zero amplitude.
          const v = dist(at(t0 + dt), at(t0)) / dt;
          worst = Math.max(worst, v);
        }
  assert.ok(worst <= VMAX, `fastest sphere ${worst.toFixed(3)} > ${VMAX}`);
  assert.ok(worst > 0.3, "the waves actually move");
  // Launches across a bar line are continuous at the authored strength.
  for (const level of [0.1, 0.6, 1]) {
    const before = envelope(kickFx.length - 1e-9, kickFx.duration, KICK_STRENGTH, level),
      after = envelope(0, kickFx.duration, KICK_STRENGTH, level);
    for (let rho = 0; rho < 18; rho += 0.05)
      close(ringHeight(rho, before, level), ringHeight(rho, after, level), 1e-9);
  }
  // Any other strength gives a bounded kick response, never a pop across
  // the lattice.
  for (const strength of [0.2, 0.5, 1])
    for (const level of [0.1, 0.6, 1]) {
      let step = 0;
      const k = strength * rhythmGain(level);
      for (let rho = 0; rho < 18; rho += 0.02)
        step = Math.max(step, Math.abs(ringHeight(rho, k, level)) * 1.6);
      assert.ok(step <= 0.16, `${strength}/${level}: ${step}`);
    }
});

test("the camera stays clear of every sphere and never jumps", () => {
  let nearest = Infinity;
  for (const dev of [0, 0.5, 1, 1.3, 1.6, 2])
    for (let a = 0; a < TAU; a += TAU / 24) {
      const { eye } = camera(dev, a);
      for (const kick of [0, 0.5])
        for (let s = 0; s < N * N; s += 7) {
          const b = ball(s % N, Math.floor(s / N), {
            ...base,
            dev,
            kick,
            amp: 1.6,
            detail: 1,
            M: a * 0.6,
            W: a * 3,
          });
          nearest = Math.min(nearest, dist(b.p, eye) - b.r * 1.5);
        }
    }
  assert.ok(nearest > 0.45, `camera clearance ${nearest}`);
  let prev = camera(0, 0).eye;
  for (let dev = 0.001; dev <= 2; dev += 0.001) {
    const { eye } = camera(dev, 0);
    assert.ok(dist(eye, prev) < 0.01);
    prev = eye;
  }
});

test("haze glow: the closed form equals numeric integration", () => {
  const simpson = (f, a, b, n = 20000) => {
    if (!(b > a)) return 0;
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let k = 1; k < n; k++) s += f(a + k * h) * (k % 2 ? 4 : 2);
    return (s * h) / 3;
  };
  let rnd = 7;
  const random = () => ((rnd = (rnd * 16807) % 2147483647) - 1) / 2147483646;
  for (let n = 0; n < 60; n++) {
    const o = random() * 6,
      d = (random() * 2 - 1) * (n % 7 === 0 ? 1e-9 : 1),
      t0 = random() * 4,
      t1 = t0 + random() * 30,
      h = HANG,
      sA = 0.4,
      sB = 0.8,
      F = 9;
    const f = (t) => {
      const g = o + d * t - h;
      return Math.exp((g > 0 ? -g / sA : g / sB) - t / F);
    };
    const exact = hazeLayer(o, d, t0, t1, h, sA, sB, F);
    const numeric = simpson(f, t0, t1);
    assert.ok(Number.isFinite(exact));
    close(exact, numeric, 2e-6 + 2e-5 * numeric, `ray ${n}`);
  }
  // The footprint span equals a brute-force scan of the column.
  for (let n = 0; n < 40; n++) {
    const ox = random() * 30 - 15,
      oz = random() * 30 - 15,
      a = random() * TAU;
    const dx = Math.cos(a),
      dz = Math.sin(a),
      e = 10,
      T = 40;
    const [t0, t1] = columnSpan(ox, oz, dx, dz, e, T);
    for (let t = 0; t <= T; t += 0.05) {
      const inside = Math.abs(ox + dx * t) <= e && Math.abs(oz + dz * t) <= e;
      const claimed = t >= t0 && t <= t1 && t1 > t0;
      if (Math.abs(t - t0) > 0.06 && Math.abs(t - t1) > 0.06)
        assert.equal(claimed, inside, `ray ${n} t=${t}`);
    }
  }
});
