import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import nebula from "../scene-nebula.mjs";
import {
  CLOCK_PERIOD,
  N,
  TWO32,
  clockStep,
  cycle,
  ellipsePolar,
  identity,
  jetLight,
  jetPhase,
  orbitOmega,
  cloudOmega,
  position,
  potential,
  progress,
  psiRate,
  sedovTaylor,
  shockFront,
  worldOf,
  zeldovich,
} from "../nebula-model.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";

const world = worldOf(3141);
const sample = (count, stride = 97) =>
  Array.from({ length: count }, (_, i) => identity(world, 1 + i * stride));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("presets: three world states share seed and parameters; extra looks validate", () => {
  assert.ok(nebula.number >= 87 && nebula.number <= 89);
  assert.ok(nebula.presets.length >= 6);
  const field = nebula.schema.find((f) => f.key === nebula.development);
  assert.deepEqual([field.min, field.max, field.step], [0, 2, 0.01]);
  assert.deepEqual(nebula.type, { key: "development", values: [0, 1, 2] });
  nebula.presets.forEach((_, i) =>
    validateSnapshot(presetSnapshot(nebula, i), scenes),
  );
  const states = nebula.presets.slice(0, 3);
  for (const s of states) {
    assert.equal(s.seed, states[0].seed);
    for (const f of nebula.schema)
      if (f.key !== "development")
        assert.equal(s.params[f.key], states[0].params[f.key]);
  }
  assert.deepEqual(
    states.map((s) => s.params.development),
    [0, 1, 2],
  );
  const ids = scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`));
  const authored = defaultWorlds(ids).find((w) => w.id === "nebula");
  assert.deepEqual(
    authored.states.map((s) => s.name),
    ["Dust", "Spiral", "Nova"],
  );
  const clips = [0, 1, 2].map((i) => ({ snapshot: presetSnapshot(nebula, i) }));
  assert.deepEqual(continuousDevelopment(clips, nebula), {
    key: "development",
    min: 0,
    max: 2,
    positions: [0, 1, 2],
  });
});

test("identity is seed-derived only; position is continuous in development", () => {
  const a = identity(world, 4242),
    b = identity(worldOf(3141), 4242);
  assert.deepEqual(a, b);
  assert.notDeepEqual(identity(worldOf(1618), 4242), a);
  const clock = 987654321;
  for (const id of sample(400)) {
    if (id.kind === 2) {
      // Distant stars never move with development.
      assert.deepEqual(
        position(world, id, { clock, dev: 0 }),
        position(world, id, { clock, dev: 2 }),
      );
      continue;
    }
    let prev = position(world, id, { clock, dev: 0, psi: 0.3 });
    for (let k = 1; k <= 400; k++) {
      const next = position(world, id, { clock, dev: k / 200, psi: 0.3 });
      for (const v of next) assert.ok(Number.isFinite(v));
      // 0.005 development never moves a star more than 0.06 world units.
      assert.ok(dist(prev, next) < 0.06, `star ${id.id} jumps at ${k / 200}`);
      prev = next;
    }
  }
});

test("position is continuous in time at every development, including clock wrap", () => {
  const ids = sample(300, 211);
  for (const dev of [0, 0.35, 1, 1.5, 2]) {
    for (const clock of [5000, TWO32 - 3 * 2982617]) {
      const step = clockStep(1 / 60, 1);
      for (const id of ids) {
        const a = position(world, id, { clock, dev, psi: 1 });
        const b = position(world, id, {
          clock: (clock + step) >>> 0,
          dev,
          psi: 1,
        });
        const ta = jetPhase(id, clock),
          tb = jetPhase(id, (clock + step) >>> 0);
        if (ta >= 0 && tb < ta) {
          // A pulsar-jet star re-enters at the core only while unlit.
          assert.ok(jetLight(ta) < 0.01 && jetLight(tb) < 0.01);
          continue;
        }
        // One frame of motion stays small (shock fronts included).
        assert.ok(dist(a, b) < 0.03, `dev ${dev} star ${id.id}`);
      }
    }
  }
});

test("exact clock: integer cycles per period wrap with uint arithmetic", () => {
  for (const n of Object.values(N)) assert.ok(Number.isInteger(n) && n > 0);
  let clock = 0;
  const step = clockStep(1 / 60, 1);
  for (let i = 0; i < CLOCK_PERIOD * 60; i++) clock = (clock + step) >>> 0;
  // After one period the integer clock is back at the start, up to the
  // rounding of one 32-bit unit per tick: under 10 ms of show time.
  const drift = Math.min(clock, TWO32 - clock) / TWO32;
  assert.ok(drift * CLOCK_PERIOD < 0.01, `clock drift ${drift}`);
  // Every global phase is an exact function of the integer clock: cycles
  // wrap with the uint product, so no float error accumulates over a night.
  for (const n of Object.values(N)) {
    const c = cycle(clock, n);
    assert.equal(c, (Math.imul(clock, n) >>> 0) / TWO32);
    assert.ok(Math.min(c, 1 - c) <= n * drift + 1e-12, `cycle ${n}`);
  }
  // Late in a night the phase resolution is unchanged.
  const late = (Math.imul(step, 8 * 3600 * 60) >>> 0) >>> 0;
  const d = cycle((late + step) >>> 0, N.yaw) - cycle(late, N.yaw);
  assert.ok(Math.abs(d - N.yaw / CLOCK_PERIOD / 60) < 1e-7);
});

test("Zel'dovich displacement is minus the potential gradient", () => {
  const h = 1e-5;
  for (const q of [
    [0.3, -0.2, 0.9],
    [-1.1, 0.4, 0.2],
    [0.05, 0.6, -1.4],
  ]) {
    const S = zeldovich(world, q, 1234567);
    for (let i = 0; i < 3; i++) {
      const up = q.slice(),
        down = q.slice();
      up[i] += h;
      down[i] -= h;
      const grad =
        (potential(world, up, 1234567) - potential(world, down, 1234567)) /
        (2 * h);
      assert.ok(Math.abs(S[i] + grad) < 1e-8);
    }
  }
});

test("ellipse polar offset is wrap-free and exact", () => {
  const a = 1.2,
    b = 0.8;
  for (let k = -400; k <= 400; k++) {
    const u = (k / 400) * 3 * Math.PI;
    const { eps, rho } = ellipsePolar(a, b, u);
    const x = a * Math.cos(u),
      y = b * Math.sin(u);
    const exact = Math.atan2(y, x) - u;
    const wrapped = exact - 2 * Math.PI * Math.round(exact / (2 * Math.PI));
    assert.ok(Math.abs(eps - wrapped) < 1e-12);
    assert.ok(Math.abs(rho - Math.hypot(x, y)) < 1e-12);
  }
});

test("density-wave orbits make a trailing two-armed spiral", () => {
  // Every star sits on its own ellipse; nothing places stars on arms. The m=2
  // pattern must emerge from crowding and its phase must wind with radius.
  const stars = Array.from({ length: 60000 }, (_, i) =>
    identity(world, i + 1),
  ).filter((s) => s.kind === 0);
  const clock = 3e9;
  const rings = [
    [0.45, 0.6],
    [0.7, 0.85],
    [0.95, 1.1],
  ].map(() => ({ c: 0, s: 0, n: 0 }));
  const bounds = [0.45, 0.6, 0.7, 0.85, 0.95, 1.1];
  for (const id of stars) {
    const p = position(world, id, { clock, dev: 1, psi: 0 });
    const r = Math.hypot(p[0], p[2]),
      th = Math.atan2(p[2], p[0]);
    for (let k = 0; k < 3; k++)
      if (r >= bounds[2 * k] && r < bounds[2 * k + 1]) {
        rings[k].c += Math.cos(2 * th);
        rings[k].s += Math.sin(2 * th);
        rings[k].n++;
      }
  }
  const phase = rings.map((g) => Math.atan2(g.s, g.c) / 2);
  for (const g of rings) assert.ok(Math.hypot(g.c, g.s) / g.n > 0.12, "arms");
  // Phase advances with radius (mod π): arms wind, they are not a bar.
  const wind = (a, b) => {
    const d = b - a;
    return d - Math.PI * Math.round(d / Math.PI);
  };
  const d1 = wind(phase[0], phase[1]),
    d2 = wind(phase[1], phase[2]);
  assert.ok(Math.abs(d1) > 0.2 && Math.abs(d2) > 0.2);
  assert.equal(Math.sign(d1), Math.sign(d2));
});

test("collapse spins the cloud up; dispersal reassembles the cosmic web", () => {
  const ids = sample(500, 131).filter((s) => s.kind !== 2);
  const psi = new Float64Array(ids.length);
  let clock = 0;
  const dt = 1 / 60,
    step = clockStep(dt, 1);
  const run = (seconds, devAt) => {
    const ticks = Math.round(seconds * 60);
    for (let t = 0; t < ticks; t++) {
      const dev = devAt(t / ticks);
      for (let i = 0; i < ids.length; i++)
        psi[i] += psiRate(world, ids[i], dev, psi[i]) * dt;
      clock = (clock + step) >>> 0;
    }
  };
  // Hold the galaxy: inner stars turn faster than outer ones (spin-up).
  run(10, () => 1);
  const inner = ids.findIndex((s) => s.kind === 0 && s.a < 0.25);
  const outer = ids.findIndex((s) => s.kind === 0 && s.a > 1.1);
  assert.ok(
    psiRate(world, ids[inner], 1, 0) > 2 * psiRate(world, ids[outer], 1, 0),
  );
  assert.ok(
    Math.abs(
      psiRate(world, ids[outer], 1, 0) -
        (orbitOmega(ids[outer].a) - cloudOmega()),
    ) < 1e-12,
  );
  // 16 bars to Nova and back (126 BPM), then two minutes of breakdown.
  run(30, (u) => 1 + u);
  run(30, (u) => 2 - 2 * u);
  run(120, () => 0);
  let worst = 0;
  for (let i = 0; i < ids.length; i++) {
    const back = position(world, ids[i], { clock, dev: 0, psi: psi[i] });
    const fresh = position(world, ids[i], { clock, dev: 0, psi: 0 });
    worst = Math.max(worst, dist(back, fresh));
  }
  assert.ok(worst < 0.01, `web reassembles (worst ${worst})`);
});

test("Nova freezes the record and Sedov–Taylor fronts expand as t^(2/5)", () => {
  for (const id of sample(50).filter((s) => s.kind !== 2))
    assert.equal(psiRate(world, id, 2, 0.4), 0);
  assert.deepEqual(progress(2, 0.9), { p: 1, n: 1 });
  assert.deepEqual(progress(0, 0), { p: 0, n: 0 });
  for (const t of [0.05, 0.1, 0.2, 0.4])
    assert.ok(
      Math.abs(sedovTaylor(2 * t) / sedovTaylor(t) - Math.pow(2, 0.4)) < 1e-12,
    );
  // The lit band moves outward through a cycle.
  const peak = (frac) => {
    const clock = Math.round(((frac / N.shock) * TWO32) >>> 0);
    let best = 0,
      at = 0;
    for (let R = 0; R < 2.4; R += 0.005) {
      const f = shockFront(R, clock);
      if (f > best) [best, at] = [f, R];
    }
    return at;
  };
  const radii = [0.1, 0.3, 0.6].map(peak);
  assert.ok(radii[0] < radii[1] && radii[1] < radii[2]);
  // Jet light vanishes where the flow wraps; elsewhere jets move smoothly.
  assert.equal(jetLight(0), 0);
  assert.ok(jetLight(0.999) < 1e-4 && jetLight(0.3) > 0.2);
  const jets = Array.from({ length: 4000 }, (_, i) => identity(world, i + 1))
    .filter((s) => jetPhase(s, 0) >= 0)
    .slice(0, 40);
  assert.ok(jets.length === 40);
  const step = clockStep(1 / 60, 1);
  for (const id of jets)
    for (let k = 0; k < 400; k++) {
      const clock = (k * 9 * step) >>> 0,
        next = (clock + step) >>> 0;
      const ta = jetPhase(id, clock),
        tb = jetPhase(id, next);
      const jump = dist(
        position(world, id, { clock, dev: 2 }),
        position(world, id, { clock: next, dev: 2 }),
      );
      if (tb < ta) assert.ok(jetLight(ta) < 0.01 && jetLight(tb) < 0.01);
      else assert.ok(jump < 0.03, `jet ${id.id}`);
    }
});

test("shader constants follow the CPU model", () => {
  const sources = [
    nebula.particles.vertex,
    nebula.simulation.fragment,
    nebula.fragment,
  ].join("\n");
  assert.ok(sources.includes(`NB_P = ${CLOCK_PERIOD}.`));
  for (const n of [N.cloud, N.pattern, N.shock, N.yaw, N.wobble, N.jet])
    assert.ok(sources.includes(`${n}u`));
  assert.ok(!/\$\{/.test(sources), "no unexpanded template");
});
