import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import nebula from "../scene-nebula.mjs";
import {
  ABSORBERS,
  CAMERA,
  CLOCK_PERIOD,
  N,
  SHELL,
  SIZE,
  TWO32,
  clockStep,
  cycle,
  cameraFraming,
  dustColumn,
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
  DISK_MAP,
  EDGES,
  NODES,
  edgePoint,
  tracerEdge,
  webEdge,
  webMorph,
  FOLLOW,
  MODES,
  OCTA,
  WEB_GRID,
  followStep,
  shellRadius,
  streamLight,
  streamPhase,
  webDensity,
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
      // 0.005 development never moves a star more than 0.1 world units.
      assert.ok(dist(prev, next) < 0.1, `star ${id.id} jumps at ${k / 200}`);
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
        const sa = streamPhase(id, clock),
          sb = streamPhase(id, (clock + step) >>> 0);
        if (dev < 1 && id.kind !== 2 && sb < sa) {
          // A streaming dust tracer restarts its run only while dark.
          assert.ok(streamLight(sa) < 0.01 && streamLight(sb) < 0.01);
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

test("dust extinction integrates only the finite emitter-to-eye column", () => {
  assert.equal(nebula.particles.blend, undefined, "no screen-space absorber overlay");
  assert.match(nebula.particles.vertex, /nbTransmission\(pos, cam.eye, twist, pattern\)/);
  assert.match(nebula.particles.vertex, /id >= 118784u/);
  assert.match(nebula.particles.vertex, /\.60138029 \/ h \* \(1\. - t \* t\)/);
  assert.match(nebula.fragment, /nbColumn\(xa, xb, h\)/, "the volume integrates the same exact column");
  assert.equal(dustColumn([0, .7, 0], [0, 3, 0]), 0, "foreground star is untouched");
  assert.ok(dustColumn([0, -.7, 0], [0, 3, 0]) > .999, "background star sees the slab");
  for (const [start, eye] of [
    [[0, -.1, 0], [2, 1, 1]],
    [[0, .01, 0], [1, 2, 0]],
    [[0, -.03, 0], [3, .2, 1]],
    [[0, .02, 0], [1, .02, 2]],
  ]) {
    const len = dist(start, eye), steps = 20000;
    let integral = 0;
    for (let i = 0; i < steps; i++) {
      const y = start[1] + (eye[1] - start[1]) * (i + .5) / steps;
      integral += 1.20276058 / .07 / Math.cosh(1.20276058 * y / .035) ** 2 * len / steps;
    }
    assert.ok(Math.abs(dustColumn(start, eye) - integral) < 1e-5);
    assert.ok(Math.exp(-2.4 * dustColumn(start, eye)) >= 0);
  }
  // Reversal of the ray preserves its integrated column.
  assert.equal(dustColumn([0, -.1, 0], [1, .3, 0]), dustColumn([1, .3, 0], [0, -.1, 0]));
});

test("the web's densest node is the seeded nucleus and the pulsar, at every clock", () => {
  // Every potential mode crests at the origin (phase π): no displacement
  // there, and the linear overdensity Σ amp·(−cos) is maximal, for any
  // breathing of the amplitudes. The bulge and the pulsar sit at the same point.
  for (const clock of [0, 123456789, 3e9, TWO32 - 1]) {
    for (const v of zeldovich(world, [0, 0, 0], clock)) assert.ok(Math.abs(v) < 1e-12);
    assert.equal(webDensity(world, [0, 0, 0], clock).node, 1);
    for (let i = 0; i < 300; i++) {
      const x = [Math.sin(i * 1.7) * 1.6, Math.cos(i * 2.3) * 0.7, Math.sin(i * 0.9 + 1) * 1.6];
      const d = webDensity(world, x, clock);
      assert.ok(d.node < 1 && Number.isFinite(d.rho) && d.rho >= 0);
    }
  }
  assert.match(nebula.particles.vertex, /float kk = max\(dot\(k, k\), 1e-3\), arg = dot\(k, q\) \+ NB_PI;/);
  assert.match(nebula.fragment, /exp\(-impact \* impact \/ \.012\)/, "nucleus at the origin");
  assert.match(nebula.fragment, /exp\(-coreR2 \/ \.0016\)/, "hot core and pulsar at the origin");
  // The analytic filament web drains into the same node: every node's
  // chain of heavier parents ends at node 0 (the nucleus at the origin).
  const g = world.graph;
  assert.deepEqual(g.pos[0], [0, 0, 0]);
  for (let i = 1; i < NODES; i++) {
    let j = i, hops = 0;
    while (j !== 0 && hops++ < NODES) {
      assert.ok(g.mass[g.parent[j]] > g.mass[j], "parents are heavier");
      j = g.parent[j];
    }
    assert.equal(j, 0, `node ${i} drains into the nucleus`);
    const nb = g.neighbour[i];
    if (nb >= 0) assert.ok(nb !== g.parent[i] && g.parent[nb] !== i, "loop links never duplicate tree links");
  }
  // The mode table the simulation writes mirrors worldOf().
  assert.match(nebula.simulation.fragment, /z \* \.85, r \* sin\(az\)\)\) \* \(5\. \+ 5\. \* nbRnd\(key, m, 902u\)\)/);
  assert.equal(world.modes.length, MODES);
  for (const m of world.modes) assert.ok(m.kLen >= 5 && m.kLen <= 10 && m.phase === Math.PI);
});

test("filaments: Bézier edges from child to node, wound into the arms' sense, tracers stream into the node", () => {
  for (let e = 0; e < EDGES; e++) {
    const E = webEdge(world.key, world.graph, e, 0);
    if (!E) continue;
    const i = 1 + (e >> 1), j = e & 1 ? world.graph.neighbour[i] : world.graph.parent[i];
    assert.deepEqual(edgePoint(E, 0), world.graph.pos[i]);
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(edgePoint(E, 1)[k] - world.graph.pos[j][k]) < 1e-12);
    // Smooth curve: consecutive samples never jump.
    for (let k = 1; k <= 50; k++) assert.ok(dist(edgePoint(E, k / 50), edgePoint(E, (k - 1) / 50)) < 0.25);
  }
  // Winding: the inner web turns further than the outer web, in the sense
  // in which the arms' phase grows outward (θ = r·twist + c).
  const turn = (r) => { const P = webMorph([r, 0, 0], 0.5); return Math.atan2(P[2], P[0]); };
  assert.ok(turn(0.4) < turn(1.2) && turn(1.2) < turn(2.4));
  assert.deepEqual(webMorph([1, 0.5, 0], 0), [1, 0.5, 0]);
  // Tracer streaming moves toward the node end of its filament.
  const id = sample(400).find((s) => s.kind === 0);
  const E = webEdge(world.key, world.graph, tracerEdge(world, id), 0);
  const end = E.pts[3];
  const clock = Math.round((0.2 / N.stream) * TWO32) - streamPhase(id, 0) * 0;
  const s0 = streamPhase(id, clock), s1 = streamPhase(id, (clock + clockStep(1, 1)) >>> 0);
  if (s1 > s0) assert.ok(dist(edgePoint(E, s1), end) < dist(edgePoint(E, s0), end) + 1e-9);
  assert.match(nebula.fragment, /if \(!nbEdgeAt\(e, p, E\)\) continue;/);
  assert.match(nebula.fragment, /Static interleaved-gradient jitter/);
  assert.doesNotMatch(nebula.fragment, /u_tick/);
});

test("mode table and camera spring use spare state texels only", () => {
  const W = SIZE[0];
  for (let m = 0; m < MODES; m++)
    for (let c = 1; c <= 4; c++) {
      const id = (SIZE[1] - 1) * W + 8 * m + c;
      assert.ok(id >= ABSORBERS, "beyond the tracer population");
      assert.notEqual((id - ABSORBERS) & 7, 0, "never a near-field mote");
    }
  for (const id of [1, 2]) assert.notEqual(id & 3, 0, "never a ψ tracer");
  assert.match(nebula.simulation.fragment, /cell\.y == 255 && cell\.x < 128/);
  // Filament graph links: x = 129 + 8i on the last row, clear of the mode table.
  for (let i = 0; i < NODES; i++) assert.ok(129 + 8 * i >= 128 && 129 + 8 * i < SIZE[0]);
  assert.match(nebula.simulation.fragment, /cell\.x >= 129 && cell\.x < 417/);
});

test("remnant breaks out of the disk as bipolar lobes and rounds into a sphere", () => {
  let previous = shellRadius(1, 0);
  for (let i = 0; i <= 200; i++) {
    const dev = 1 + i / 200;
    const eq = shellRadius(dev, 0),
      pole = shellRadius(dev, 1);
    assert.ok(eq >= previous - 1e-12, "the shell only grows with development");
    assert.ok(Math.abs(eq - previous) < 0.02, "continuous");
    assert.ok(pole >= eq);
    previous = eq;
  }
  assert.ok(shellRadius(1.4, 1) > 1.25 * shellRadius(1.4, 0), "bipolar breakout");
  const top = shellRadius(2, 1) / shellRadius(2, 0);
  assert.ok(top > 1.15 && top < 1.3, "a mildly bipolar remnant at the top state");
  assert.ok(Math.abs(shellRadius(1, 0) - 0.1 * SHELL) < 1e-12);
  // No development-locked flash: ignition is a steady structural state.
  assert.doesNotMatch(nebula.fragment + nebula.particles.vertex, /ignite/);
});

test("camera spring never lurches and settles without overshoot", () => {
  for (const [from, to] of [[1, 2], [0, 2], [2, 0], [2, 1], [0, 1], [1, 0]]) {
    let state = { d: from, v: 0 },
      peak = 0;
    for (let k = 0; k < 60 * 14; k++) {
      state = followStep(state, to);
      peak = Math.max(peak, Math.abs(state.v));
      assert.ok(state.d >= Math.min(from, to) - 1e-9 && state.d <= Math.max(from, to) + 1e-9, "no overshoot");
    }
    assert.ok(peak <= FOLLOW.vmax + 1e-12);
    assert.ok(Math.abs(state.d - to) < 0.01, `settles ${from}→${to}`);
  }
  // A one-bar drop: the view turns slower than a quarter of the short side
  // per second, including orbit and crane at 1.5× motion speed.
  const step = clockStep(1 / 60, 1.5);
  const dir = (c) => {
    const v = c.target.map((t, i) => t - c.eye[i]);
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };
  for (const clock0 of [0, 1e9, 3e9])
  for (const [from, to] of [[0, 1], [1, 2], [2, 0]]) {
    let state = { d: from, v: 0 },
      clock = clock0;
    let prev = cameraFraming(state.d, clock);
    for (let k = 0; k < 60 * 10; k++) {
      state = followStep(state, to);
      clock = (clock + step) >>> 0;
      const next = cameraFraming(state.d, clock);
      const a = dir(prev),
        b = dir(next);
      const turn = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * 60;
      assert.ok(turn < (0.25 * 2) / CAMERA.focal, `view turns ${turn.toFixed(3)} rad/s`);
      // Size changes by under half per second: at ~80% of the short side its
      // silhouette moves under a fifth of the short side per second.
      assert.ok((Math.abs(next.distance - prev.distance) * 60) / next.distance < 0.4, "dolly rate");
      prev = next;
    }
  }
  assert.match(nebula.simulation.fragment, /vel = clamp\(vel \+ acc \* u_dt, -0\.25, 0\.25\)/);
});

test("camera stays outside the forms for every fader position", () => {
  for (const clock of [0, 7e8, 2e9, 4e9])
    for (const distance of [0.7, 1, 1.4])
      for (const height of [0, 0.08, 0.35, 0.66, 1])
        for (const dev of [0, 0.5, 1, 1.5, 2]) {
          const c = cameraFraming(dev, clock, { distance, height });
          const r = Math.hypot(...c.eye),
            rxz = Math.hypot(c.eye[0], c.eye[2]);
          if (dev === 0) assert.ok(r > 1.95, "outside the web's dense core");
          if (dev >= 0.5 && dev <= 1.5)
            assert.ok(rxz > 1.78 || Math.abs(c.eye[1]) > 0.12, "never inside the disk");
          if (dev >= 1.5) assert.ok(r > shellRadius(dev, c.eye[1] / r) * 1.12, "outside the remnant");
        }
});

test("fixed particle budget; data atlas holds scalar fields, never a colour image", () => {
  assert.deepEqual(SIZE, [512, 256]);
  assert.deepEqual(nebula.simulation.size, SIZE);
  assert.equal(nebula.precompute.format, "rgba16f");
  assert.equal(nebula.precompute.filter, "linear");
  assert.deepEqual(nebula.precompute.size, [
    8 * (WEB_GRID[0] + 2) + DISK_MAP,
    Math.max((WEB_GRID[1] / 8) * (WEB_GRID[2] + 2), DISK_MAP, OCTA),
  ]);
  // Direct fallbacks evaluate the same fields when no float target exists.
  assert.match(nebula.fragment, /#else\s+return nbWebField\(x, clock, u_params\[2\]\);/);
  assert.match(nebula.fragment, /#else\s+return nbShellData\(dn, clamp\(u_level, 0\., 1\.\), nbClock\(\)\);/);
  assert.match(nebula.fragment, /#else\s+return nbDiskData\(/);
  assert.match(nebula.particles.vertex, /s.kind != 2 && \(id & 3u\) != 0u/);
  assert.match(nebula.simulation.fragment, /id >= 118784u \|\| \(id & 3u\) != 0u/);
  assert.match(nebula.particles.vertex, /if \(\(m & 7u\) != 0u\) return;/, "an eighth of the dormant rows are near-field motes");
  const skies = sample(1000, 101).filter((s) => s.kind === 2);
  const depths = skies.map((s) => Math.hypot(...position(world, s, { clock: 0, dev: 0 })));
  assert.ok(Math.min(...depths) >= 7 && Math.max(...depths) < 16);
  assert.ok(Math.max(...depths) - Math.min(...depths) > 5, "real star-field depth");
  assert.equal(ABSORBERS, 118784);
});

test("shader constants follow the CPU model", () => {
  const sources = [
    nebula.particles.vertex,
    nebula.simulation.fragment,
    nebula.fragment,
  ].join("\n");
  assert.ok(sources.includes(`NB_P = ${CLOCK_PERIOD}.`));
  for (const n of [N.cloud, N.pattern, N.shock, N.yaw, N.stream, N.jet])
    assert.ok(sources.includes(`${n}u`));
  assert.ok(!/\$\{/.test(sources), "no unexpanded template");
});
