import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { defaultPattern } from "../rhythm.mjs";
import {
  continuousDevelopment,
  defaultWorlds,
  validateWorlds,
} from "../worlds.mjs";
import {
  ADDITIVE_FROM,
  ATTRIBUTES,
  CEILING,
  FOCAL,
  HALF,
  HANG,
  HOLD,
  KICK_STRENGTH,
  KIND,
  N,
  RADIUS,
  RING,
  RIPPLE_BOUND,
  SPACING,
  STRIDE,
  VMAX,
  ball,
  camera,
  cascadeLight,
  chorus,
  columnSpan,
  createGeometry,
  focalLength,
  foldHeight,
  hazeLayer,
  installationHeight,
  rhythmGain,
  ringHeight,
  ringLight,
  rippleHeight,
  seedAngles,
  waveHeight,
} from "../kinetic-model.mjs";
const scene = scenes.find((s) => s.id === "kinetic");
const TAU = 2 * Math.PI;
const close = (a, b, eps, label = "") =>
  assert.ok(Math.abs(a - b) <= eps, `${label}: ${a} != ${b}`);
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const base = {
  dev: 0,
  W: 0.7,
  M: 0.2,
  Phi: 0.3,
  kick: 0,
  detail: 0,
  amp: 1,
  size: 1,
  seed: 1216,
};
test("kinetic preserves three continuous states, eight look identities and finite presets", () => {
  assert.equal(scene.number, 102);
  assert.equal(scene.development, "development");
  const world = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  ).find((w) => w.id === "kinetic-rain");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Ceiling", "Waves", "Sculpture"],
  );
  const clips = world.states.map((state) => ({
    snapshot: presetSnapshot(
      scene,
      scene.presets.findIndex((p) => `kinetic:${p.name}` === state.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, scene)?.positions, [0, 1, 2]);
  const known = scenes.flatMap((s) =>
    s.presets.map((p) => `${s.id}:${p.name}`),
  );
  const saved = {
    ...structuredClone(world),
    description:
      "Thousands of glowing spheres on threads hang level under the ceiling, break into interfering wave choreographies and gather into one floating surface that morphs from sphere to torus, Möbius band and saddle. The same spheres throughout.",
  };
  assert.deepEqual(
    validateWorlds([saved], known, scenes),
    [world],
    "r3 authored save upgrades through HISTORY",
  );
  saved.description = "My own suspended installation";
  assert.equal(
    validateWorlds([saved], known, scenes)[0].description,
    saved.description,
    "custom copy is preserved",
  );
  assert.equal(scene.presets.length, 8);
  for (const preset of scene.presets)
    for (const field of scene.schema) {
      const v = preset.params[field.key];
      assert.ok(
        Number.isFinite(v) && v >= field.min && v <= field.max,
        `${preset.name}.${field.key}`,
      );
    }
  assert.equal(
    ATTRIBUTES.reduce((a, b) => a + b),
    STRIDE,
  );
  assert.ok(N * N >= 4096);
});
test("four authored gestures retain slot 3, independent placements, recovery and full grids", () => {
  assert.equal(scene.rhythm.length, 4);
  const signature = scene.rhythm.find((fx) => fx.slot === 3);
  assert.equal(signature.id, "drop-cascade");
  for (const [style, min] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const loop = signature.styles[style],
      hits = loop.steps.flatMap((v, i) => (v > 0 ? [i] : []));
    assert.ok(hits.length >= 2);
    for (let i = 0; i < hits.length; i++) {
      const gap =
        (hits[(i + 1) % hits.length] +
          (i === hits.length - 1 ? loop.length : 0) -
          hits[i]) /
        loop.division;
      assert.ok(loop.duration < gap, `${style} settles`);
    }
    const p = defaultPattern(scene.rhythm, style);
    const density = p.tracks.reduce(
      (s, t) =>
        s + (t.steps.filter(Boolean).length * t.division * 4) / t.length,
      0,
    );
    assert.ok(density >= min, `${style}: ${density}`);
  }
  assert.ok(
    scene.rhythm[1].styles.accented.length % 16 !== 0,
    "non-square accent loop retained",
  );
  for (const uniform of ["u_rhythm.w", "u_rhythmHit.w", "u_rhythmCount.w"])
    assert.ok(scene.geometry.vertex.includes(uniform));
  assert.match(scene.geometry.vertex, /mirrored\?\.14:0\./);
  assert.match(scene.geometry.vertex, /mod\(a_cell.x,8\.\)<\.5&&mod/);
  assert.doesNotMatch(
    scene.geometry.fragment,
    /u_rhythm/,
    "cables cannot be rhythm wireframe",
  );
});
test("geometry is deterministic, development-free and keeps lamp/mirror/cable identities", () => {
  const a = createGeometry(1216);
  assert.deepEqual(a, createGeometry(1216));
  assert.notDeepEqual(a, createGeometry(1217));
  assert.ok(a.every(Number.isFinite));
  assert.equal(a.length, N * N * 3 * 6 * STRIDE);
  assert.equal(ADDITIVE_FROM, 2 * N * N * 6);
  assert.equal(createGeometry.length, 1);
  for (const [k, kind] of [KIND.sphere, KIND.reflection, KIND.thread].entries())
    for (let s = 0; s < N * N; s += 97) {
      const o = (k * N * N + s) * 6 * STRIDE;
      assert.equal(a[o], s % N);
      assert.equal(a[o + 1], Math.floor(s / N));
      assert.equal(a[o + 4], kind);
      assert.equal(a[o + 5], a[s * 6 * STRIDE + 5]);
    }
});
test("shader shares model constants and a single injective heightfield law", () => {
  for (const token of [
    `N=${N}.`,
    `SP=${SPACING}`,
    `HANG=${HANG}`,
    `CEIL=${CEILING}`,
    `R0=${RADIUS}`,
    `FOCAL=${FOCAL}`,
    `HOLD=${HOLD}`,
  ])
    assert.ok(scene.geometry.vertex.includes(token), token);
  assert.match(scene.geometry.vertex, /P=vec3\(g.x,y\+ring,g.y\)/);
  assert.doesNotMatch(
    scene.geometry.vertex,
    /sculpt\(|sculptDerivatives|a_cell.y\*N\+a_cell.x/,
  );
  for (const source of [
    scene.geometry.vertex,
    scene.geometry.fragment,
    scene.fragment,
  ])
    assert.doesNotMatch(source, /mod\(\s*u_time/);
  assert.deepEqual(
    scene.clocks.map((c) => c.period),
    [TAU, 4, 2 * TAU, TAU],
  );
});
test("choreography is a periodic smooth partition with held forms", () => {
  for (let M = 0; M < 8; M += 0.013) {
    const w = chorus(M);
    close(
      w.reduce((a, b) => a + b),
      1,
      1e-12,
    );
    assert.ok(w.every((x) => x >= 0));
    if (M - Math.floor(M) < HOLD) assert.equal(w[Math.floor(M) % 4], 1);
    for (let i = 0; i < 4; i++) close(w[i], chorus(M + 4)[i], 1e-12);
  }
  for (let k = 1; k < 8; k++)
    for (let i = 0; i < 4; i++)
      close(chorus(k - 1e-9)[i], chorus(k + 1e-9)[i], 1e-8);
});
test("open folded peak preserves air, floor clearance and motor addresses at all developments", () => {
  let min = Infinity,
    max = -Infinity,
    spread = 0;
  for (let M = 0; M < 4; M += 0.37)
    for (const W of [0, 1.3, 3.7, 5.6])
      for (const dev of [0, 0.5, 1, 1.25, 1.5, 1.75, 2]) {
        let lo = Infinity,
          hi = -Infinity;
        for (let j = 0; j < N; j += 5)
          for (let i = 0; i < N; i += 5) {
            const b = ball(i, j, {
              ...base,
              M,
              W,
              dev,
              amp: 1.6,
              detail: 1,
              size: 1.5,
              kick: 0.8,
              level: 0.9,
            });
            close(b.p[0], (i - (N - 1) / 2) * SPACING, 1e-12);
            close(b.p[2], (j - (N - 1) / 2) * SPACING, 1e-12);
            assert.ok(
              b.r * 2 < SPACING * 0.7,
              "air between horizontal lamp neighbours",
            );
            assert.ok(b.p.every(Number.isFinite) && b.n.every(Number.isFinite));
            close(Math.hypot(...b.n), 1, 1e-12);
            min = Math.min(min, b.p[1] - b.r);
            max = Math.max(max, b.p[1] + b.r);
            lo = Math.min(lo, b.p[1]);
            hi = Math.max(hi, b.p[1]);
          }
        if (dev === 2) spread = Math.max(spread, hi - lo);
      }
  assert.ok(min > 0.35, `floor ${min}`);
  assert.ok(max < CEILING - 1, `motor clearance ${max}`);
  assert.ok(spread > 3, "peak has actual height staggering");
});
test("quiet canopy has a gentle sculptural crest, waves and folds are bounded", () => {
  const seed = seedAngles(1216).wave;
  for (let k = 0; k < 300; k++) {
    const x = -HALF + (((k * 37) % 101) / 100) * 2 * HALF,
      z = -HALF + (((k * 53) % 97) / 96) * 2 * HALF,
      W = k * 0.173;
    assert.ok(Math.abs(rippleHeight(x, z, W)) <= RIPPLE_BOUND + 1e-12);
    for (let form = 0; form < 4; form++) {
      const w = [0, 0, 0, 0];
      w[form] = 1;
      assert.ok(Math.abs(waveHeight(x, z, W, w, 0.2, 1, seed)) <= 0.4 + 1e-12);
      assert.ok(Math.abs(foldHeight(x, z, W, w, 0.2)) <= 1.8 + 1e-12);
    }
    const state = { ...base, dev: 1, W, amp: 1.3 };
    const b = ball(k % N, Math.floor(k / N), state);
    close(b.p[1], installationHeight(b.p[0], b.p[2], state), 1e-12);
  }
});
test("development is bounded and reversal retraces exactly, no gather-knot interpolation", () => {
  const step = 0.002;
  let worst = 0;
  for (let s = 0; s < N * N; s += 103) {
    const i = s % N,
      j = Math.floor(s / N);
    let prev = ball(i, j, { ...base, amp: 1.6, detail: 1 }).p;
    for (let dev = step; dev <= 2 + 1e-9; dev += step) {
      const p = ball(i, j, { ...base, dev, amp: 1.6, detail: 1 }).p;
      worst = Math.max(worst, dist(p, prev) / step);
      prev = p;
    }
  }
  assert.ok(worst < 6, `development slope ${worst}`);
  const before = ball(13, 61, { ...base, dev: 1.37 });
  ball(13, 61, { ...base, dev: 1.9 });
  assert.deepEqual(ball(13, 61, { ...base, dev: 1.37 }), before);
});
test("positions, camera and lens wrap seamlessly at every integrated clock period", () => {
  for (const dev of [0, 0.7, 1, 1.5, 2])
    for (let s = 0; s < N * N; s += 211) {
      const i = s % N,
        j = Math.floor(s / N),
        b = ball(i, j, { ...base, dev, detail: 1 });
      for (const shift of [
        { W: base.W + TAU },
        { M: base.M + 4 },
        { Phi: base.Phi + 2 * TAU },
      ])
        assert.ok(
          dist(b.p, ball(i, j, { ...base, dev, detail: 1, ...shift }).p) < 1e-9,
        );
      close(focalLength(dev, 1) / focalLength(dev, 0), 1.02, 1e-12);
      assert.ok(dist(camera(dev, 0.4).eye, camera(dev, 0.4 + TAU).eye) < 1e-12);
    }
});
const envelope = (beats, duration, strength, level) => {
  const d = Math.max(0, 1 - beats / duration);
  return strength * d * d * (3 - 2 * d) * rhythmGain(level);
};
test("motor speeds stay bounded even at maximum clocks, detail and amplitude", () => {
  const dt = 1 / 240,
    bps = 140 / 60,
    p = scene.schema.map((f) => f.max),
    rates = scene.clocks.map((c) => c.rate(p, 1));
  let worst = 0;
  for (const level of [0.3, 1])
    for (const dev of [0, 0.5, 1, 1.25, 1.5, 1.75, 2])
      for (const t0 of [0.31, 0.62, 1.05, 1.7, 2.6, 5.3, 9.9, 12.4])
        for (let s = 0; s < N * N; s += 67) {
          const at = (t) =>
            ball(s % N, Math.floor(s / N), {
              ...base,
              dev,
              W: t * rates[0],
              M: t * rates[1],
              Phi: t * rates[2],
              kick: envelope((t * bps) % 4, 3.5, KICK_STRENGTH, level),
              level,
              detail: 1,
              amp: 1.6,
            }).p;
          worst = Math.max(worst, dist(at(t0 + dt), at(t0)) / dt);
        }
  assert.ok(worst < VMAX, `motor speed ${worst}`);
  assert.ok(worst > 0.3);
});
test("camera dollies out before rising and remains clear of the installation", () => {
  let nearest = Infinity,
    step = 0;
  for (let dev = 0; dev <= 2.0001; dev += 0.05)
    for (let a = 0; a < TAU; a += 0.45) {
      const eye = camera(dev, a).eye;
      step = Math.max(step, dist(eye, camera(dev + 0.001, a).eye));
      for (let s = 0; s < N * N; s += 31) {
        const b = ball(s % N, Math.floor(s / N), {
          ...base,
          dev,
          amp: 1.6,
          detail: 1,
          W: a * 3,
          M: a * 0.6,
          kick: 0.5,
        });
        nearest = Math.min(nearest, dist(b.p, eye) - b.r * 1.5);
      }
    }
  assert.ok(nearest > 0.45, `clearance ${nearest}`);
  assert.ok(step < 0.045, `camera slope ${step}`);
  for (const a of [0, 1, 2, 4])
    assert.ok(
      Math.hypot(camera(1.6, a).eye[0], camera(1.6, a).eye[2]) > 19,
      "outside footprint before crane",
    );
});
test("kick front starts continuously, stays local and remains readable at low energy", () => {
  for (const level of [0.1, 0.6, 1])
    for (let rho = 0; rho < 18; rho += 0.05) {
      close(ringHeight(rho, 0, level), 0, 0);
      close(
        ringHeight(rho, KICK_STRENGTH * rhythmGain(level), level),
        0,
        1e-15,
      );
    }
  let peak = 0;
  for (let kn = 0; kn <= 1; kn += 0.025)
    for (let rho = 0; rho < 18; rho += 0.2) {
      const low = ringLight(rho, kn * KICK_STRENGTH * rhythmGain(0.1), 0.1),
        high = ringLight(rho, kn * KICK_STRENGTH * rhythmGain(0.9), 0.9);
      close(low, high, 1e-12);
      assert.ok(low >= 0 && low <= 1);
      peak = Math.max(peak, low);
      assert.ok(Math.abs(ringHeight(rho, kn, 1)) <= RING.amp * kn + 1e-12);
    }
  assert.ok(peak > 0.9);
});
test("signature is a narrow descending physical-height front with a delayed mirror and exact silence", () => {
  let previous = Infinity;
  for (const progress of [0.15, 0.3, 0.5, 0.7, 0.85]) {
    const env = 0.96 * rhythmGain(0.85) * (1 - progress),
      front = 5.65 - 5.5 * progress;
    assert.ok(front < previous);
    previous = front;
    assert.ok(cascadeLight(front, env, 0.85) > 0.99);
    assert.ok(
      cascadeLight(front + 0.5, env, 0.85) < 0.001,
      "half a metre away stays dark",
    );
    const echo = 5.65 - 5.5 * (progress - 0.14);
    assert.ok(
      cascadeLight(echo, env, 0.85, 0.14) > (progress > 0.22 ? 0.99 : 0),
      "delayed echo is still higher, with a soft delayed launch",
    );
  }
  for (let y = -1; y < 10; y += 0.05)
    for (const level of [0, 0.1, 0.5, 0.9, 1])
      for (const lag of [0, 0.14]) {
        assert.equal(
          cascadeLight(y, 0, level, lag),
          0,
          "muted track leaves no residual mirror band",
        );
        for (const d of [0, 0.1, 0.5, 0.9, 1]) {
          const v = cascadeLight(y, d * 0.96 * rhythmGain(level), level, lag);
          assert.ok(Number.isFinite(v) && v >= 0 && v <= 1);
        }
      }
});
test("analytic haze and footprint span agree with numerical integration and ray samples", () => {
  const simpson = (f, a, b, n = 10000) => {
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
  };
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let n = 0; n < 40; n++) {
    const o = random() * 6,
      d = (random() * 2 - 1) * (n % 7 === 0 ? 1e-9 : 1),
      t0 = random() * 4,
      t1 = t0 + random() * 30;
    const exact = hazeLayer(o, d, t0, t1, HANG, 0.7, 1.4, 18);
    const numeric = simpson(
      (t) => {
        const g = o + d * t - HANG;
        return Math.exp((g > 0 ? -g / 0.7 : g / 1.4) - t / 18);
      },
      t0,
      t1,
    );
    close(exact, numeric, 2e-6 + 2e-5 * numeric);
    const ox = random() * 30 - 15,
      oz = random() * 30 - 15,
      a = random() * TAU,
      dx = Math.cos(a),
      dz = Math.sin(a),
      [u, v] = columnSpan(ox, oz, dx, dz, 10, 40);
    for (let t = 0; t <= 40; t += 0.05)
      if (Math.abs(t - u) > 0.06 && Math.abs(t - v) > 0.06)
        assert.equal(
          t >= u && t <= v && v > u,
          Math.abs(ox + dx * t) <= 10 && Math.abs(oz + dz * t) <= 10,
        );
  }
});
