import test from "node:test";
import assert from "node:assert/strict";
import attractor, {
  SYSTEMS,
  CLIFFORD_SPECIES,
  CLUSTER,
  COUNT,
  KICK_SURGE,
  MAX_STEPS,
  MAP_HOPS,
  MORPH_PERIOD,
  MORPH_WAVES,
  systemParams,
  flow,
  cliffordMap,
  rk4,
  step,
  stepsPerTick,
  ageStep,
  clusterLife,
  rand,
  encode24,
  decode24,
} from "../scene-attractor.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { Engine } from "../engine.mjs";

const close = (actual, expected, eps = 1e-12, label = "") =>
  actual.forEach((v, i) =>
    assert.ok(Math.abs(v - expected[i]) <= eps, `${label}[${i}] ${v} ≠ ${expected[i]}`),
  );
const schemaOf = (key) => attractor.schema.find((d) => d.key === key);

// Deterministic generator for initial conditions (tests only).
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// A start point as the reset pass draws it: a ball in the basin, pre-rolled.
function start(system, k, rnd) {
  const { init } = SYSTEMS[system];
  let p;
  do p = [0, 1, 2].map(() => rnd() * 2 - 1);
  while (Math.hypot(...p) > 1);
  p = p.map((v, i) => init.center[i] + init.radius * v);
  if (system === 1) {
    const r = Math.hypot(p[0] + 1e-3, p[1] + 1e-3) / (3 + 4 * rnd());
    p = [(p[0] + 1e-3) / r, (p[1] + 1e-3) / r, 0.05 + 0.3 * rnd()];
  }
  for (let i = 0; i < init.steps; i++)
    p = system === 5 ? cliffordMap(p, k) : rk4(system, p, k, init.h);
  return p;
}
const inBox = (system, p, margin = 0.002) => {
  const { lo, hi } = SYSTEMS[system];
  return p.every((v, i) => {
    const n = (v - lo[i]) / (hi[i] - lo[i]);
    return Number.isFinite(n) && n > margin && n < 1 - margin;
  });
};
// Largest Lyapunov exponent (Benettin, per unit system time or per map
// iteration) of the simulated fixed-step dynamics; also checks the box.
function lyapunov(system, k, { steps, rnd }) {
  let p = start(system, k, rnd);
  let q = p.map((v, i) => v + (i === 0 ? 1e-8 : 0));
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    p = step(system, p, k);
    q = step(system, q, k);
    assert.ok(inBox(system, p), `${SYSTEMS[system].id} left its box at ${p}`);
    const d = Math.hypot(q[0] - p[0], q[1] - p[1], system === 5 ? 0 : q[2] - p[2]);
    sum += Math.log(d / 1e-8);
    q = p.map((v, j) => v + ((q[j] - v) * 1e-8) / d);
    if (system === 5) q[2] = p[2];
  }
  return sum / (steps * SYSTEMS[system].h);
}
// Steps for a stable estimate: ≥ 70 Lyapunov times.
const STEPS = [30000, 25000, 40000, 25000, 25000, 3000];
// Lyapunov floors (per system time unit; per iteration for the map), about
// half of each system's measured value; a periodic window reads ≈ 0.
const FLOOR = [0.45, 0.025, 0.025, 0.015, 0.15, 0.05];

test("attractor declares six systems, each covered by authored looks", () => {
  assert.deepEqual(attractor.type, { key: "system", values: [0, 1, 2, 3, 4, 5] });
  assert.equal(schemaOf("system").step, 1);
  assert.equal(schemaOf("system").max, SYSTEMS.length - 1);
  assert.ok(attractor.presets.length >= 8);
  assert.equal(new Set(attractor.presets.map((p) => p.name)).size, attractor.presets.length);
  for (const value of attractor.type.values)
    assert.ok(attractor.presets.some((p) => p.params.system === value), `system ${value}`);
  for (let i = 0; i < attractor.presets.length; i++) {
    const snapshot = presetSnapshot(attractor, i);
    assert.deepEqual(validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [attractor]), snapshot);
    for (const def of attractor.schema) {
      const v = snapshot.params[def.key];
      assert.ok(Number.isFinite(v) && v >= def.min && v <= def.max, `${snapshot.preset}/${def.key}`);
    }
  }
  assert.deepEqual(attractor.simulation.size, [256, 512]);
  assert.equal(COUNT, 65536);
  assert.equal(COUNT % CLUSTER, 0);
});

test("energy raises speed, particle count, trail, orbit and morph depth for every look", () => {
  const engine = Object.create(Engine.prototype);
  Object.assign(engine, { counters: { nonFinite: 0 }, uniformFrame: 0 });
  const keys = ["speed", "density", "trail", "orbit", "morph"];
  const index = Object.fromEntries(attractor.schema.map((d, i) => [d.key, i]));
  for (let i = 0; i < attractor.presets.length; i++) {
    const slot = {
      scene: attractor,
      snapshot: presetSnapshot(attractor, i),
      baseLevel: 0.5,
      params: new Float32Array(8),
    };
    const ladder = [0.1, 0.5, 0.9].map((level) => {
      engine.level = level;
      engine.uniformFrame++;
      engine.updateUniforms(slot);
      return Array.from(slot.params);
    });
    for (const key of keys) {
      const [lo, mid, hi] = ladder.map((p) => p[index[key]]);
      assert.ok(lo <= mid && mid <= hi && lo < hi, `${attractor.presets[i].name}/${key}`);
    }
    for (const p of ladder) assert.equal(p[0], slot.snapshot.params.system);
  }
});

test("derivatives match the textbook systems", () => {
  close(flow(0, [1, 1, 1], [10, 28, 8 / 3]), [0, 26, 1 - 8 / 3], 1e-12, "Lorenz");
  close(flow(1, [1, 2, 3], [0.2, 0.2, 5.7]), [-5, 1.4, 0.2 + 3 * (1 - 5.7)], 1e-12, "Rössler");
  const [x, y, z] = [0.1, 0.2, 0.3];
  close(
    flow(2, [x, y, z], [0.95]),
    [
      (z - 0.7) * x - 3.5 * y,
      3.5 * x + (z - 0.7) * y,
      0.6 + 0.95 * z - z ** 3 / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x ** 3,
    ],
    1e-12,
    "Aizawa",
  );
  close(
    flow(3, [1, 2, 3], [0.19]),
    [Math.sin(2) - 0.19, Math.sin(3) - 0.38, Math.sin(1) - 0.57],
    1e-12,
    "Thomas",
  );
  close(flow(4, [1, 2, 3], [1.4]), [-25.4, -27.8, -17.2], 1e-12, "Halvorsen");
  close(
    cliffordMap([0.5, -0.3], [-1.4, 1.6, 1, 0.7]),
    [Math.sin(0.42) + Math.cos(0.7), Math.sin(0.8) + 0.7 * Math.cos(0.48), 0.5],
    1e-12,
    "Clifford",
  );
  // Lorenz C± stay unstable (ρ above the Hopf point) for every morph value.
  for (const w1 of [-1, 0, 1])
    for (const w2 of [-1, 0, 1]) {
      const [s, r, b] = systemParams(0, 1, [w1, w2]);
      assert.ok(r > (s * (s + b + 3)) / (s - b - 1) + 1, `ρ=${r} β=${b}`);
    }
  // Equilibria: Lorenz C±, Thomas and Halvorsen origin.
  const [s, r, b] = systemParams(0, 0, [0, 0]);
  const c = Math.sqrt(b * (r - 1));
  close(flow(0, [c, c, r - 1], [s, r, b]), [0, 0, 0], 1e-9, "C+");
  close(flow(0, [-c, -c, r - 1], [s, r, b]), [0, 0, 0], 1e-9, "C−");
  close(flow(3, [0, 0, 0], [0.19]), [0, 0, 0]);
  close(flow(4, [0, 0, 0], [1.38]), [0, 0, 0]);
  // Symmetries: Lorenz (x, y, z) → (−x, −y, z); Thomas, Halvorsen cyclic.
  const p = [1.3, -2.1, 17];
  const f = flow(0, p, [10, 28, 8 / 3]);
  close(flow(0, [-p[0], -p[1], p[2]], [10, 28, 8 / 3]), [-f[0], -f[1], f[2]]);
  for (const system of [3, 4]) {
    const k = systemParams(system, 0, [0, 0]);
    const v = flow(system, p, k);
    close(flow(system, [p[1], p[2], p[0]], k), [v[1], v[2], v[0]], 1e-9);
  }
  // Classic parameters at zero morph depth.
  assert.deepEqual(systemParams(0, 0, [1, 1]).slice(0, 3), [10, 28, 8 / 3]);
  assert.deepEqual(systemParams(1, 0, [1, 1]).slice(0, 2), [0.2, 0.2]);
});

test("RK4 is fourth order on every flow", () => {
  for (let system = 0; system < 5; system++) {
    const k = systemParams(system, 0.5, [0.3, -0.4]);
    const p = start(system, k, random(system + 1));
    const h = SYSTEMS[system].h;
    const fine = (n) => {
      let q = p;
      for (let i = 0; i < n; i++) q = rk4(system, q, k, h / n);
      return q;
    };
    const reference = fine(64);
    const e1 = Math.hypot(...step(system, p, k).map((v, i) => v - reference[i]));
    const e2 = Math.hypot(...fine(2).map((v, i) => v - reference[i]));
    // Halving h shrinks the error ~16× (allow slack for round-off).
    assert.ok(e2 < e1 / 8 || e1 < 1e-11, `${SYSTEMS[system].id}: ${e1} → ${e2}`);
  }
});

test("the step accumulator never truncates the fastest reachable speed", () => {
  // Speed is clamped to its schema max (energy and audio included); a kick
  // multiplies it by 1 + KICK_SURGE.
  const fastest = schemaOf("speed").max;
  for (let system = 0; system < 5; system++) {
    const n = stepsPerTick(system, fastest, 1);
    assert.ok(n <= MAX_STEPS, `${SYSTEMS[system].id}: ${n} steps per tick`);
    // A step moves a particle by a small fraction of the attractor (the
    // vertex pass interpolates within it).
    const S = SYSTEMS[system];
    const k = systemParams(system, 1, [1, 1]);
    let p = start(system, k, random(5 + system));
    for (let i = 0; i < 2000; i++) {
      const q = step(system, p, k);
      const moved = Math.hypot(...q.map((v, j) => v - p[j])) * S.scale;
      assert.ok(moved < 0.2, `${S.id} jumps ${moved}`);
      p = q;
    }
  }
  // Map hops: at most one per cluster and tick.
  assert.ok((fastest * (1 + KICK_SURGE) * MAP_HOPS) / 60 <= 1);
});

test("every look's system stays chaotic and inside its box at its morph extremes", () => {
  for (const preset of attractor.presets) {
    const system = preset.params.system;
    const rnd = random(preset.seed);
    const species = preset.seed % CLIFFORD_SPECIES.length;
    for (const m of [0, 1])
      for (const w of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        const k = systemParams(system, m, w, species);
        const lambda = lyapunov(system, k, { steps: STEPS[system], rnd });
        assert.ok(lambda > FLOOR[system], `${preset.name} m=${m} w=${w}: λ=${lambda}`);
      }
  }
});

test("full-depth morph sweeps stay chaotic in every window of the sweep", () => {
  // Morph depth is clamped to [0, 1], so m = 1 bounds every reachable value.
  // Flows: replay one full period of the slow wave as the GPU runs it, at
  // the fastest speed (most system time per parameter change, so the most
  // chance to settle into a narrow periodic window), and measure the
  // finite-time Lyapunov exponent over consecutive windows.
  for (let system = 0; system < 5; system++) {
    const S = SYSTEMS[system];
    // ≈ 8 Lyapunov times per window (FLOOR is about half the typical λ).
    const windowSteps = Math.round(8 / (2 * FLOOR[system]) / S.h);
    for (const seed of [1, 2]) {
      const rnd = random(1000 * system + seed);
      let k = systemParams(system, 1, [0, 0]);
      let p = start(system, k, rnd);
      let q = p.map((v, i) => v + (i === 0 ? 1e-8 : 0));
      let accumulator = 0,
        sum = 0,
        count = 0;
      const ticks = Math.round((60 * MORPH_PERIOD) / MORPH_WAVES[0]);
      for (let t = 0; t < ticks; t++) {
        const time = t / 60;
        const w = MORPH_WAVES.map((n) => Math.sin((2 * Math.PI * n * time) / MORPH_PERIOD));
        k = systemParams(system, 1, w);
        accumulator += stepsPerTick(system, schemaOf("speed").max);
        const n = Math.min(Math.floor(accumulator), MAX_STEPS);
        accumulator -= Math.floor(accumulator);
        for (let i = 0; i < n; i++) {
          p = step(system, p, k);
          q = step(system, q, k);
          const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
          sum += Math.log(d / 1e-8);
          q = p.map((v, j) => v + ((q[j] - v) * 1e-8) / d);
          if (++count === windowSteps) {
            const lambda = sum / (count * S.h);
            assert.ok(lambda > FLOOR[system] / 2, `${S.id} at ${time.toFixed(0)} s: λ=${lambda}`);
            sum = count = 0;
          }
        }
        assert.ok(inBox(system, p), `${S.id} left its box at ${time.toFixed(1)} s`);
      }
    }
  }
  // Clifford: each species line, sampled at 101 points.
  for (let species = 0; species < CLIFFORD_SPECIES.length; species++)
    for (let i = 0; i <= 100; i++) {
      const w = [-1 + i / 50, 0];
      const k = systemParams(5, 1, w, species);
      const rnd = random(77 + i);
      const lambda = lyapunov(5, k, { steps: 2500, rnd });
      assert.ok(lambda > FLOOR[5], `Clifford species ${species} w=${w[0]}: λ=${lambda}`);
      // Dust, not a few points: the orbit covers many cells of a 128² grid.
      let p = start(5, k, rnd);
      const cells = new Set();
      for (let n = 0; n < 4000; n++) {
        p = cliffordMap(p, k);
        cells.add(Math.floor((p[0] + 3.2) * 20) * 1000 + Math.floor((p[1] + 3.2) * 20));
      }
      assert.ok(cells.size > 600, `Clifford species ${species} w=${w[0]}: ${cells.size} cells`);
    }
});

test("16-bit storage, morph and kicks keep a long run bounded and spread out", () => {
  // Mirrors the GPU tick: whole steps from the accumulator, float math,
  // 16-bit box fractions with stochastic rounding; morph waves sped up 50×
  // to sweep their range, a kick every half second.
  for (let system = 0; system < 6; system++) {
    const S = SYSTEMS[system];
    const rnd = random(4242 + system);
    const span = S.hi.map((h, i) => h - S.lo[i]);
    const quantize = (p) =>
      p.map((v, i) => {
        const n = Math.floor(((v - S.lo[i]) / span[i]) * 65535 + rnd());
        return S.lo[i] + (Math.min(65535, Math.max(0, n)) / 65535) * span[i];
      });
    let k = systemParams(system, 1, [0, 0]);
    let p = start(system, k, rnd);
    let accumulator = 0;
    const visited = new Set();
    for (let t = 0; t < 12000; t++) {
      const time = (t / 60) * 50;
      const w = MORPH_WAVES.map((n) => Math.sin((2 * Math.PI * n * time) / MORPH_PERIOD));
      k = systemParams(system, 1, w, t % 3);
      const kick = t % 30 < 6 ? 1 - (t % 30) / 6 : 0;
      if (system === 5) {
        if (rnd() < (2.5 * (1 + KICK_SURGE * kick) * MAP_HOPS) / 60) p = cliffordMap(p, k);
      } else {
        accumulator += stepsPerTick(system, 2.5, kick);
        const n = Math.min(Math.floor(accumulator), MAX_STEPS);
        accumulator -= Math.floor(accumulator);
        for (let i = 0; i < n; i++) p = step(system, p, k);
      }
      p = quantize(p);
      assert.ok(inBox(system, p), `${S.id} escaped at tick ${t}: ${p}`);
      visited.add(p.map((v, i) => Math.floor(((v - S.lo[i]) / span[i]) * 8)).join());
    }
    // The orbit wanders over the attractor instead of settling on a point.
    assert.ok(visited.size >= 12, `${S.id} visited ${visited.size} cells`);
  }
});

test("reset starts stay in each system's basin", () => {
  for (let system = 0; system < 6; system++) {
    const rnd = random(99 + system);
    for (const m of [0, 1])
      for (let i = 0; i < 40; i++) {
        const w = [rnd() * 2 - 1, rnd() * 2 - 1];
        const k = systemParams(system, m, w, i % 3);
        let p = start(system, k, rnd);
        for (let t = 0; t < 1500; t++) p = step(system, p, k);
        assert.ok(inBox(system, p), `${SYSTEMS[system].id}: ${p}`);
      }
  }
});

test("camera phase, step accumulator and cluster ages fit their packed formats", () => {
  for (const phase of [0, 0.25, 0.5, 0.999999, 1 - 2 ** -24, 0.123456789])
    assert.ok(Math.abs(decode24(encode24(phase)) - phase) < 2 ** -23);
  assert.equal(decode24(encode24(1.25)), 0.25); // wraps
  // The slowest non-zero orbit still advances the 24-bit phase every tick.
  const slowest = (0.01 * 0.45 * (1 / 90)) / 60;
  assert.ok(slowest * 2 ** 24 > 10);
  // Cluster lifetimes (fractions of the 16-bit age range) stay below 1, and
  // one step of age is many 16-bit quanta, so deterministic rounding keeps
  // every member of a cluster in step and never stalls.
  for (const comets of [0, 0.5, 1])
    for (let c = 0; c < COUNT / CLUSTER; c++) {
      const life = clusterLife(c, comets, 6501);
      assert.ok(life > 0.05 && life < 0.95, `${life}`);
    }
  for (let system = 0; system < 6; system++)
    assert.ok(ageStep(system) * 65535 > 4, `${SYSTEMS[system].id}`);
});

test("description and metadata name the family", () => {
  assert.equal(attractor.id, "attractor");
  assert.equal(attractor.number, 65);
  assert.equal(attractor.name, "Strange Attractors");
  assert.equal(attractor.stage.length, 3);
  assert.ok(attractor.simulation.steps <= 8);
});

// One GPU tick replayed on the CPU from the GPU's own state: the shader's
// flows, map, morph, step accumulator and hop coins must match the reference.
function replayTick({ system, before, after, params, time, tick, kick, level, seed }) {
  const S = SYSTEMS[system];
  const span = S.hi.map((h, i) => h - S.lo[i]);
  const u16 = (bytes, at) => (bytes[at] * 256 + bytes[at + 1]) / 65535;
  const read = (bytes, i) => {
    const a = ((i >> 8) * 256 + (i & 255)) * 4;
    const b = a + 256 * 256 * 4;
    const n = [u16(bytes, a), u16(bytes, a + 2), u16(bytes, b)];
    return { p: n.map((v, j) => S.lo[j] + v * span[j]), age: u16(bytes, b + 2) };
  };
  const t = (Math.fround(time) % MORPH_PERIOD) / MORPH_PERIOD;
  const w = MORPH_WAVES.map((n, j) => Math.sin(2 * Math.PI * (n * t + rand(11 + j, 0, seed))));
  const k = systemParams(system, Math.min(1, Math.max(0, params[6])), w, seed % CLIFFORD_SPECIES.length);
  const speed = Math.max(0, params[1]) * (1 + KICK_SURGE * kick * (0.25 + 0.75 * level));
  const accumulator = decode24([0, 1, 2].map((j) => before[256 * 256 * 4 + j]));
  const total = accumulator + (S.rate * speed) / S.h / 60;
  const steps = Math.min(Math.floor(total), MAX_STEPS);
  let compared = 0,
    mismatched = 0,
    worst = 0;
  // Tolerance: 2.5 storage quanta; the map also allows for software-GPU
  // sin/cos error (~1e-4), which a flow step scales down by h.
  const tolerance = span.map((s) => Math.max((2.5 * s) / 65535, system === 5 ? 2e-3 : 0));
  for (let i = 1; i < COUNT; i++) {
    const old = read(before, i),
      next = read(after, i);
    if (next.age < old.age) continue; // the cluster respawned
    let p = old.p;
    if (system === 5) {
      const coin = rand((((i / CLUSTER) | 0) ^ Math.imul(tick, 2654435761)) >>> 0, 50, seed);
      if (coin < (speed * MAP_HOPS) / 60) p = cliffordMap(p, k);
    } else for (let j = 0; j < steps; j++) p = step(system, p, k);
    if (!inBox(system, p)) continue; // the escape guard moved it
    compared++;
    const errors = p.map((v, j) => Math.abs(v - next.p[j]) / tolerance[j]);
    worst = Math.max(worst, ...errors);
    if (errors.some((e) => e > 1)) mismatched++;
  }
  return { compared, mismatched, steps, worst };
}

if (process.argv.includes("--port")) {
  test("software GPU: every system renders and its simulation matches the CPU reference", { timeout: 3600000 }, async () => {
    const { options, serve, launch, openLab } = await import("../scripts/browser-runtime.mjs");
    const { renderLook } = await import("./browser/client.mjs");
    const args = options();
    const server = await serve(".", args.port);
    const runtime = await launch();
    try {
      const lab = await openLab(runtime.browser, server.url);
      // ATTRACTOR_PROBE=0,5 limits the probe to some systems.
      const only = process.env.ATTRACTOR_PROBE?.split(",").map(Number);
      for (const system of attractor.type.values) {
        if (only && !only.includes(system)) continue;
        const index = attractor.presets.findIndex((p) => p.params.system === system);
        const look = await lab.page.evaluate(renderLook, {
          sceneId: "attractor",
          index,
          frames: 60,
          capture: false,
        });
        assert.equal(look.glError, 0);
        assert.equal(look.nonFinite, 0);
        assert.ok(look.peak > 40, `${attractor.presets[index].name}: peak ${look.peak}`);
        const state = await lab.page.evaluate(() => {
          const { engine } = window.__phosphorLab;
          const gl = engine.gl;
          const read = () => {
            const s = engine.slots.at(-1);
            const bytes = new Uint8Array(256 * 512 * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, s.sim[s.si].fbo);
            gl.readPixels(0, 0, 256, 512, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return bytes;
          };
          const before = read();
          const s = engine.slots.at(-1);
          const time = s.time; // the next tick adds 1/60 before it runs
          engine.advance(1 / 60, false);
          return {
            before: Array.from(before),
            after: Array.from(read()),
            params: Array.from(s.params),
            time: time + 1 / 60,
            tick: s.tick,
            kick: engine.kick,
            level: engine.level,
            seed: s.snapshot.seed,
          };
        });
        const result = replayTick({ system, ...state });
        console.log(JSON.stringify({ system: SYSTEMS[system].id, peak: look.peak, ...result }));
        assert.ok(result.compared > 60000, `${SYSTEMS[system].id}: compared ${result.compared}`);
        assert.ok(result.mismatched <= result.compared * 0.002, `${SYSTEMS[system].id}: ${JSON.stringify(result)}`);
      }
      assert.deepEqual(lab.errors, []);
    } finally {
      await runtime.stop();
      await server.close();
    }
  });
}
