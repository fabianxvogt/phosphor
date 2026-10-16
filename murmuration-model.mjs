// CPU reference for the Murmuration world (scene-murmuration.mjs). The GLSL
// simulation mirrors birdStep(); tests run small flocks with it.
//
// One flock of birds on a fixed topological lattice: every bird keeps the
// same eight lattice neighbours for ever (starlings track about seven
// topological neighbours, Ballerini et al. 2008). Development blends forces,
// never positions:
//   Loose     — weak neighbour coupling, each bird wanders on its own;
//   Surge     — alignment + cohesion to neighbours, a folded Lagrangian
//               sheet with a dense centre and sparse skirts, a falcon that dives
//               through it, and startle waves: an excitable medium on the
//               lattice (fire → refractory) that rolls birds as it passes;
//   Formation — the same coupling plus springs to persistent formation
//               slots: a rolling vortex scroll, a trefoil ribbon and a twister.
// State per bird (four RGBA8 texels, 16-bit fixed point): position,
// velocity, startle timer T and bank angle.

export const CLOCK_PERIOD = 1440;
export const TWO32 = 4294967296;
export const LATTICE = [256, 128]; // birds; bird 0 is the clock
export const POS_RANGE = 24; // positions in [−24, 24]
export const VEL_RANGE = 8; // velocities in [−8, 8]
export const BANK_RANGE = 1.6;
export const N = {
  anchorX: 8, // flock path 180 s
  anchorY: 5,
  flow: 20, // ABC flow drift 72 s
  falcon: 160, // falcon pass every 9 s
  yaw: 12, // camera orbit 120 s
  dive: 30, // camera dive cycle 48 s
  circ: 120, // vortex circulation 12 s
  roll: 45, // poloidal roll 32 s
  cycle: 6, // formation cycle 240 s
  flap: 2880, // wing beat 2 Hz base
  swirl: 144, // circulation inside the surging cloud 10 s
  breath: 40, // cloud stretch 36 s
  pulse: 320, // automatic startle every 4.5 s
  drift: 60, // off-centre framing drift 24 s
  highDrift: 11, // high cloud wisps drift 131 s
  lowDrift: 4, // low cloud banks drift 360 s
};
export const TAU_STARTLE = 1; // seconds of startle + refractory
export const TILT = 0.43589; // sin of the formation tilt (cos = 0.9)

export function hash32(x) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}
export const seedKey = (seed) => hash32((seed >>> 0) + 0x2545f491);
export const rnd = (key, id, k) =>
  (hash32((Math.imul(id >>> 0, 0x9e3779b9) ^ hash32(k + key)) >>> 0) >>> 8) /
  16777216;
export const cycle = (clock, n) => (Math.imul(clock >>> 0, n) >>> 0) / TWO32;
export const clockStep = (dt, rate) =>
  Math.round((dt * rate * TWO32) / CLOCK_PERIOD);
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const TAU = 2 * Math.PI;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.sqrt(dot(a, a));
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => mul(a, 1 / Math.max(len(a), 1e-6));

// Lattice neighbours on a torus (topology fixed per bird). Bird 0 holds
// the clock and is never a neighbour.
export const OFFSETS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];
export function neighbours(id, [w, h] = LATTICE) {
  const x = id % w,
    y = Math.floor(id / w);
  return OFFSETS.map(
    ([dx, dy]) => ((y + dy + h) % h) * w + ((x + dx + w) % w),
  ).filter((n) => n !== 0);
}

// Development weights: flocking rises to Surge and stays; the folded sheet
// and falcon belong to Surge; slot springs to Formation.
export function weights(dev) {
  const d = Math.min(2, Math.max(0, dev));
  const flock = 0.06 + 0.94 * smooth(0, 1, d);
  const form = smooth(1, 2, d);
  const surge = smooth(0, 1, d) * (1 - form);
  return { flock, surge, form, loose: 1 - smooth(0, 1, d) };
}

// The flock's moving home (camera target).
export function anchor(clock) {
  return [
    3.2 * Math.sin(TAU * cycle(clock, N.anchorX)),
    2.8 + 0.6 * Math.sin(TAU * cycle(clock, N.anchorY)),
    2.4 * Math.sin(TAU * cycle(clock, N.anchorX * 2) + 1),
  ];
}
// The falcon: a periodic pass through the flock (far outside otherwise).
export function falcon(clock) {
  const s = (cycle(clock, N.falcon) - 0.5) * 2;
  const a = anchor(clock);
  const side = TAU * cycle(clock, N.falcon / 16);
  return [
    a[0] + Math.cos(side) * s * 9,
    a[1] + 2.5 - 2.5 * (1 - s * s) + 0.5,
    a[2] + Math.sin(side) * s * 9,
  ];
}
export const yaw = (key, clock) =>
  TAU * (cycle(clock, N.yaw) + rnd(key, 0, 907));

// Folded Lagrangian sheet: linear+cubic transverse sampling concentrates
// birds in a graded ribbon with broader skirts and persistent lattice IDs.
export function cloud(key, u, v, h, clock, fold = 1) {
  const t = TAU * (u + cycle(clock, N.swirl));
  const flow = TAU * cycle(clock, N.flow),
    br = TAU * cycle(clock, N.breath);
  const s = 2 * v - 1,
    width =
      1.65 * (0.7 * s ** 3 + 0.3 * s) * (0.65 + 0.35 * Math.cos(t + br) ** 2),
    wave = 2 * t + flow;
  const q = [
    4.2 * Math.cos(t) + 0.35 * width * Math.sin(t),
    1.65 * Math.sin(wave) +
      0.5 * Math.min(2, Math.max(0, fold)) * Math.sin(3 * t - flow) +
      width * (0.8 + 0.3 * Math.sin(br + t)),
    1.6 * Math.sin(t) + (h - 0.5) * 0.95 + width * Math.cos(wave),
  ];
  const yw = yaw(key, clock),
    cy = Math.cos(yw),
    sy = Math.sin(yw);
  return [cy * q[0] + sy * q[2], q[1] + 1.2, -sy * q[0] + cy * q[2]];
}

// Formation slots, from the bird's lattice coordinate (u, v) only.
const knot = (t) => [
  1.25 * (Math.sin(t) + 2 * Math.sin(2 * t)),
  1.25 * -Math.sin(3 * t),
  1.25 * (Math.cos(t) - 2 * Math.cos(2 * t)),
];
export function slot(key, u, v, h, clock, formation) {
  const circ = TAU * cycle(clock, N.circ),
    roll = TAU * cycle(clock, N.roll);
  // Vortex scroll: a rolling, folded ribbon, with travelling compression.
  let th = TAU * u + circ;
  th += 0.55 * Math.sin(th - roll) + 0.19 * Math.sin(3 * th + roll);
  const sheet = 2 * v - 1,
    width =
      1.85 *
      (0.7 * sheet ** 3 + 0.3 * sheet) *
      (0.65 + 0.35 * Math.sin(th + roll) ** 2),
    curl = 2 * th + roll;
  const torus = [
    3.8 * Math.cos(th) + 0.2 * width * Math.cos(th),
    2.05 * Math.sin(curl) +
      0.35 * Math.sin(3 * th - roll) +
      width * Math.cos(th + roll),
    1.4 * Math.sin(th) + width * Math.sin(th + roll) + (h - 0.5) * 0.55,
  ];
  // Trefoil ribbon: birds flow along a twisted, knotted band.
  const s = TAU * (u + cycle(clock, N.circ / 2));
  const k0 = knot(s),
    tan = norm(sub(knot(s + 0.01), k0));
  const nrm = norm(cross(tan, [0, 1, 0]));
  const bin = cross(tan, nrm);
  const tw = 2 * s + roll,
    w = (v - 0.5) * 1.3,
    d = (h - 0.5) * 0.5;
  const ribbon = add(
    k0,
    add(
      mul(add(mul(nrm, Math.cos(tw)), mul(bin, Math.sin(tw))), w),
      mul(add(mul(bin, Math.cos(tw)), mul(nrm, -Math.sin(tw))), d),
    ),
  );
  // Twister: two strands winding up a funnel.
  const strand = v < 0.5 ? 0 : Math.PI;
  // Open strand ends fray into a seeded tail instead of a cut row.
  const tail = smooth(0.75, 1, Math.abs(2 * u - 1));
  const y = (u - 0.5) * 6.4 + Math.sign(u - 0.5) * tail * tail * 1.3 * h,
    sv = 4 * (v % 0.5) - 1,
    fr =
      (0.7 + 0.32 * (y + 3.2) + 0.6 * h * h + 0.3 * sv * sv) * (1 - 0.3 * tail);
  // Each strand is dense at its centre and frays at its angular edges.
  const ta = TAU * 2.2 * u + circ + strand + 1.1 * (0.6 * sv ** 3 + 0.4 * sv);
  const twister = [fr * Math.cos(ta), y, fr * Math.sin(ta)];
  const shapes = [torus, ribbon, twister];
  const fm = ((formation % 3) + 3) % 3;
  const i = Math.floor(fm),
    t = smooth(0, 1, fm - i);
  const a = shapes[i],
    b = shapes[(i + 1) % 3];
  let q = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t);
  // Tilt toward the orbiting camera so rings read as rings from below.
  const yw = yaw(key, clock),
    cy = Math.cos(yw),
    sy = Math.sin(yw);
  q = [q[0], 0.9 * q[1] + TILT * q[2], -TILT * q[1] + 0.9 * q[2]];
  return [cy * q[0] + sy * q[2], q[1] + 1.2, -sy * q[0] + cy * q[2]];
}
// Persistent per-bird home offset. Rows near the sheet's edges spread into a
// ragged fringe and a seeded share of birds strays outside the sheet, so
// density falls off instead of ending at a cut edge.
export function jitter(key, id, v) {
  const e = smooth(0.55, 1, Math.abs(2 * v - 1));
  let j = [8, 9, 10].map(
    (k) => (rnd(key, id, k) - 0.5) * (0.3 * (1 + 3 * e * e)),
  );
  if (rnd(key, id, 11) < 0.05 + 0.3 * e * e) {
    const d = [12, 13, 14].map((k) => rnd(key, id, k) - 0.5);
    j = add(j, mul(d, (0.5 + 1.2 * rnd(key, id, 15)) / Math.max(len(d), 1e-3)));
  }
  return j;
}
export const formationAt = (clock, formation, cycleRate, phase = null) =>
  formation +
  3 * (phase === null ? cycleRate * cycle(clock, N.cycle) : cycle(phase, 1));

const LOOK = Math.round((0.05 * TWO32) / CLOCK_PERIOD); // 50 ms ahead
// Spring force toward a moving target and its velocity.
function follow(p, v, at, k, c) {
  const [t0, t1] = at;
  return add(mul(sub(t0, p), k), mul(sub(mul(sub(t1, t0), 1 / 0.05), v), c));
}

// One bird, one step (mirrors the GLSL simulation). bird: {p, v, T, bank};
// nb: neighbour birds; env: {dev, dt (scaled by speed), rate, clock, key,
// id, level, falcon, fold, formation, cycle, startle}.
export function birdStep(bird, nb, env, [w, h] = LATTICE) {
  const { dev, dt, clock, key, id, level = 0.5, startle = 0 } = env;
  const W = weights(dev);
  const A = anchor(clock);
  let { p, v, T, bank } = bird;
  let a = [0, 0, 0],
    vm = [0, 0, 0],
    fired = startle > 0;
  // Lattice springs with a rest length: a crumpled sheet that fills space;
  // closer than 0.09, neighbours repel.
  const rest = 0.42 + (0.13 - 0.42) * W.flock,
    spring = 2.2 * W.flock * (1 - 0.8 * W.form);
  for (const n of nb) {
    vm = add(vm, n.v);
    const d = sub(p, n.p),
      dl = len(d);
    if (dl < 0.09) a = add(a, mul(d, (12 * (0.09 - dl)) / Math.max(dl, 1e-3)));
    else if (dl > rest) a = sub(a, mul(d, (spring * (dl - rest)) / dl));
    if (n.T > 0.999) fired = true;
  }
  if (nb.length) a = add(a, mul(sub(mul(vm, 1 / nb.length), v), 2.6 * W.flock));
  const rel = sub(p, A);
  const x = id % w,
    y = Math.floor(id / w),
    u = x / w,
    vv = y / h,
    hh = rnd(key, id, 6);
  // A fixed per-bird offset hides the lattice's rows and frays the edges.
  const jit = jitter(key, id, vv);
  if (W.loose > 0) {
    const home = add(add(A, jit), cloud(key, u, vv, hh, clock, env.fold ?? 1));
    a = add(a, mul(sub(mul(sub(home, p), 0.8), mul(v, 0.35)), W.loose));
  }
  const strike = Math.min(2, Math.max(0, env.falcon ?? 1));
  const c1 = (clock + LOOK) >>> 0;
  if (W.surge > 0) {
    const at = [
      add(add(A, jit), cloud(key, u, vv, hh, clock, env.fold ?? 1)),
      add(add(anchor(c1), jit), cloud(key, u, vv, hh, c1, env.fold ?? 1)),
    ];
    a = add(a, follow(p, v, at, 2.4 * W.surge, 1.8 * W.surge));
    const f = sub(p, falcon(clock)),
      fl = len(f);
    a = add(
      a,
      mul(
        f,
        (W.surge * strike * 14 * Math.exp(-fl * fl * 1.6)) / Math.max(fl, 0.05),
      ),
    );
    if (fl < 0.75 * W.surge * strike) fired = true;
  }
  if (W.form > 0) {
    const form = formationAt(
      clock,
      env.formation ?? 0,
      env.cycle ?? 0.5,
      env.formationClock ?? null,
    );
    const at = [
      add(add(A, jit), slot(key, u, vv, hh, clock, form)),
      add(add(anchor(c1), jit), slot(key, u, vv, hh, c1, form)),
    ];
    a = add(a, follow(p, v, at, 5.2 * W.form, 3.0 * W.form));
  }
  // Automatic startles in Surge and Formation from a seeded lattice point.
  const back = (clock - clockStep(1 / 60, env.rate ?? 1)) >>> 0;
  if (W.surge + W.form > 0.3 && cycle(clock, N.pulse) < cycle(back, N.pulse)) {
    const n = Math.floor(clock / Math.round(TWO32 / N.pulse));
    const ox = Math.floor(rnd(key, n, 30) * w),
      oy = Math.floor(rnd(key, n, 31) * h);
    if (Math.abs(x - ox) + Math.abs(y - oy) < 3) fired = true;
  }
  const rl = len(rel),
    roam = 7 - 3.5 * W.flock;
  if (rl > roam) a = add(a, mul(rel, (-1.2 * (rl - roam)) / rl));
  const sp = len(v),
    cruise = 1.1 + 0.9 * W.flock + 0.4 * level;
  a = add(a, mul(v, (1.5 * (cruise - sp)) / Math.max(sp, 1e-3)));
  a[1] += -0.6 * v[1] + 6 * Math.max(0, 0.8 - p[1]);
  v = add(v, mul(a, dt));
  const vl = len(v);
  if (vl > VEL_RANGE * 0.9) v = mul(v, (VEL_RANGE * 0.9) / vl);
  p = add(p, mul(v, dt)).map((c) =>
    Math.max(-POS_RANGE * 0.98, Math.min(POS_RANGE * 0.98, c)),
  );
  // Startle: an excitable lattice. A resting bird fires when a neighbour
  // fired on the previous step; then it stays refractory for TAU_STARTLE.
  if (T < 0.002 && fired) T = 1;
  else T = Math.max(0, T - dt / TAU_STARTLE);
  const side = norm(cross(norm(add(v, [0, 0, 1e-4])), [0, 1, 0]));
  const roll = T > 0.55 ? 1.25 * Math.sin((Math.PI * (1 - T)) / 0.45) : 0;
  const target = Math.max(-1, Math.min(1, dot(a, side) * 0.12)) + roll;
  bank +=
    (Math.max(-BANK_RANGE, Math.min(BANK_RANGE, target)) - bank) *
    Math.min(1, 8 * dt);
  return { p, v, T, bank };
}

// Initial state already belongs to the folded flock, never a dust sphere.
export function initialBird(key, id, clock = 0, size = LATTICE) {
  const A = anchor(clock);
  return {
    p: add(
      add(A, jitter(key, id, Math.floor(id / size[0]) / size[1])),
      cloud(
        key,
        (id % size[0]) / size[0],
        Math.floor(id / size[0]) / size[1],
        rnd(key, id, 6),
        clock,
      ),
    ),
    v: [1.2, 0, 0],
    T: 0,
    bank: 0,
  };
}

// Run a small flock. plan(step) → env overrides (dev, speed, …).
export function simulate(seed, steps, plan, size = [32, 16], start = null) {
  const key = seedKey(seed);
  const count = size[0] * size[1];
  const nbs = Array.from({ length: count }, (_, id) => neighbours(id, size));
  let birds =
    start ??
    Array.from({ length: count }, (_, id) => initialBird(key, id, 0, size));
  let clock = 0,
    formationClock = 0;
  for (let s = 0; s < steps; s++) {
    const env = plan(s, birds);
    const rate = env.speed ?? 1;
    const step = { ...env, rate, dt: (1 / 60) * rate, key };
    clock = (clock + clockStep(1 / 60, rate)) >>> 0;
    formationClock =
      (formationClock +
        Math.round(((1 / 60) * rate * (env.cycle ?? 0.5) * TWO32) / 240)) >>>
      0;
    const prev = birds;
    birds = prev.map((b, id) =>
      id === 0
        ? b
        : birdStep(
            b,
            nbs[id].map((n) => prev[n]),
            {
              ...step,
              clock,
              formationClock,
              id,
              startle: env.startle?.(id) ? 1 : 0,
            },
            size,
          ),
    );
  }
  return { birds, clock, formationClock, key };
}
