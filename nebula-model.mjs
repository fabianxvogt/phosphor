// CPU reference for the Spiral Nebula world (scene-nebula.mjs). The GLSL in
// the scene mirrors these functions; tests use them for exact maths and for
// continuity of one persistent particle population across development.
//
// Three authored forms of one population:
//   Dust   — a Zel'dovich cosmic-web cloud: x = q + D·S(q), S = −∇Φ for a
//            sum of plane-wave potential modes; caustics gather filaments.
//   Spiral — a density-wave galaxy: every star moves on an ellipse whose
//            orientation turns with radius (Kalnajs/Lin–Shu kinematic arms),
//            so arms are a crowding pattern the stars stream through.
//   Nova   — the core collapses and ignites; the same stars ride out on a
//            Rayleigh–Taylor fingered shell; Sedov–Taylor shock fronts
//            (R ∝ t^(2/5)) run through it.
// The only per-particle state is ψ, an extra azimuth integrated by the
// simulation: collapse spins the cloud up (dψ/dt = p·Δω) and dispersal lets ψ
// relax back so the cosmic web reassembles exactly.

export const CLOCK_PERIOD = 1440; // seconds; every global cycle divides it
export const TWO32 = 4294967296;
export const RMAX = 1.6; // galaxy radius (world units)
// One point per state texel (texel 0 is the clock). The last 24 rows retain
// their legacy dust identities/state, but no longer draw a screen overlay.
// Extinction is evaluated on each emitter→eye segment instead.
export const SIZE = [512, 256];
export const ABSORBERS = SIZE[0] * (SIZE[1] - 24);
export const CLOUD = 1.9; // dust cloud radius
export const MODES = 16; // Zel'dovich potential modes
export const N = {
  cloud: 4, // rigid cloud turn: 360 s per revolution
  pattern: 9, // spiral pattern speed: 160 s per revolution
  breathe: 36, // web mode amplitudes breathe: 40 s (+3 cycles per mode)
  shock: 120, // shock fronts every 12 s at speed 1
  yaw: 10, // camera orbit 144 s
  lift: 9, // camera height swing 160 s
  dolly: 6, // camera distance 240 s
  jet: 240, // pulsar jet flow 6 s
  crane: 24, // camera crane 60 s
  frame: 15, // off-centre framing drift 96 s
  flow: 288, // web streaming: one flow-noise cycle per 5 s
  stream: 144, // tracer streaming along a filament into its node: 10 s
  ejecta: 360, // ejecta pulses stream out along the fingers: 4 s
};
// Camera framing per state (Dust, Spiral, Nova), blended by the smoothed
// camera development. crane: elevation swing; offset: look-at drift.
export const CAMERA = {
  distance: [2.85, 2.15, 3.65],
  elevation: [0.32, 0.9, 0.44],
  crane: [0.1, 0.3, 0.12],
  offset: [0.56, 0.58, 0.62],
  craneDolly: 0.22,
  heightGain: 1.1,
  lift: 0.03,
  focal: 1.85,
};
// Camera development follows the show's development through a critically
// damped spring: a one-bar drop never lurches the camera.
export const FOLLOW = { omega: 1.2, vmax: 0.25 };
// Zel'dovich web data box (cloud frame) and its sampling grid.
export const WEB_BOX = [2.2, 1.1, 2.2];
export const WEB_GRID = [96, 48, 96];
export const OCTA = 512; // legacy constant name; now the Cartesian fine-shear map side
export const DISK_MAP = 512; // disk map texels per side over ±DISK_EXTENT
export const DISK_EXTENT = 1.8;
export const MODULATION = 0.3; // web mode amplitude breathing depth
// Analytic filament web: seeded nodes (node 0 = nucleus at the origin); every
// node links to its nearest heavier node (a tree draining into the nucleus)
// and to its nearest other node (closing loops). Cloud frame.
export const NODES = 36;
export const EDGES = 2 * (NODES - 1);
export const WEB_R = 2.6;
export const ORBIT_V = 0.22; // flat rotation curve speed
export const ORBIT_CORE = 0.26; // solid-body core radius
export const RELAX = 0.55; // ψ relaxation rate (1/s) when dispersing

// Normalised sech² dust slab: rho(y) = k/(2h) sech²(ky/h).
// Exact line integral on a finite segment. A foreground star does not
// include the dust behind it; a grazing ray has a finite parallel limit.
export function dustColumn(start, eye, h = 0.035) {
  const k = 1.20276058;
  const dy = eye[1] - start[1];
  const len = Math.hypot(...eye.map((v, i) => v - start[i]));
  if (Math.abs(dy) < 0.0001) {
    const a = Math.tanh((k * start[1]) / h);
    return ((len * k) / (2 * h)) * (1 - a * a);
  }
  return (
    ((0.5 * len) / Math.abs(dy)) *
    Math.abs(Math.tanh((k * eye[1]) / h) - Math.tanh((k * start[1]) / h))
  );
}

export function hash32(x) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}
export const seedKey = (seed) => hash32((seed >>> 0) + 0x51ed270b);
// Uniform [0,1) per (particle, stream), 24-bit like the shader.
export const rnd = (key, id, k) =>
  (hash32((Math.imul(id >>> 0, 0x9e3779b9) ^ hash32(k + key)) >>> 0) >>> 8) /
  16777216;

// A global phase on the quantised clock: integer cycles per CLOCK_PERIOD wrap
// exactly with uint arithmetic, so phases stay exact for a whole night.
export const cycle = (clock, n) => (Math.imul(clock >>> 0, n) >>> 0) / TWO32;
export const clockStep = (dt, rate) =>
  Math.round((dt * rate * TWO32) / CLOCK_PERIOD);
export const quantisedRate = (omega) =>
  Math.max(1, Math.round((omega * CLOCK_PERIOD) / (2 * Math.PI)));

export const orbitOmega = (a) =>
  ORBIT_V / Math.sqrt(a * a + ORBIT_CORE * ORBIT_CORE);
export const cloudOmega = () => (2 * Math.PI * N.cloud) / CLOCK_PERIOD;

// Sedov–Taylor blast wave: R(t) = ξ (E t² / ρ)^(1/5), normalised to R(1) = 1.
export const sedovTaylor = (c) => Math.pow(Math.max(c, 0), 0.4);

export function nodePos(key, i) {
  if (i === 0) return [0, 0, 0];
  const u = rnd(key, i, 920),
    az = 2 * Math.PI * rnd(key, i, 921),
    z = 2 * rnd(key, i, 922) - 1;
  const sr = Math.sqrt(1 - z * z),
    r = WEB_R * (0.25 + 0.75 * Math.pow(u, 0.7));
  return [r * sr * Math.cos(az), r * 0.6 * z, r * sr * Math.sin(az)];
}
export const nodeMass = (key, i) => (i === 0 ? 2 : rnd(key, i, 923));
const d2 = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
// Graph of one seed: parent (nearest heavier node) and neighbour (nearest
// other node that is neither its parent nor its child; −1 when none).
export function webGraph(key) {
  const pos = Array.from({ length: NODES }, (_, i) => nodePos(key, i));
  const mass = pos.map((_, i) => nodeMass(key, i));
  const parent = pos.map((P, i) => {
    if (i === 0) return -1;
    let best = -1,
      bd = Infinity;
    for (let j = 0; j < NODES; j++)
      if (j !== i && mass[j] > mass[i] && d2(P, pos[j]) < bd)
        [best, bd] = [j, d2(P, pos[j])];
    return best;
  });
  const neighbour = pos.map((P, i) => {
    if (i === 0) return -1;
    let best = -1,
      bd = Infinity;
    for (let j = 1; j < NODES; j++)
      if (j !== i && j !== parent[i] && parent[j] !== i && d2(P, pos[j]) < bd)
        [best, bd] = [j, d2(P, pos[j])];
    return best;
  });
  return { pos, mass, parent, neighbour };
}
// Development morph of a cloud-frame point: inner gas winds up faster than
// outer gas while the web contracts and flattens into the disk.
export function webMorph(P, p) {
  const r = Math.hypot(P[0], P[2]);
  // Wound in the arms' sense (θ grows outward): the inner web turns most.
  const a = -p * (6 * Math.exp(-0.8 * r) + 0.3),
    sc = 1 - 0.38 * p;
  const c = Math.cos(a),
    s = Math.sin(a);
  return [
    (c * P[0] - s * P[2]) * sc,
    P[1] * (1 - 0.92 * p),
    (s * P[0] + c * P[2]) * sc,
  ];
}
// Edge e (child → node it drains into): endpoints and a seeded bend, with
// the child end retracting toward the node as development rises.
export function webEdge(key, graph, e, p = 0) {
  const i = 1 + (e >> 1),
    j = e & 1 ? graph.neighbour[i] : graph.parent[i];
  if (j < 0) return null;
  const A = graph.pos[i],
    B = graph.pos[j];
  const u = B.map((v, k) => v - A[k]);
  const len = Math.hypot(...u);
  const ax = [
    rnd(key, e, 931) - 0.5,
    rnd(key, e, 932) - 0.5,
    rnd(key, e, 933) - 0.5,
  ];
  let perp = [
    u[1] * ax[2] - u[2] * ax[1],
    u[2] * ax[0] - u[0] * ax[2],
    u[0] * ax[1] - u[1] * ax[0],
  ];
  const pl = Math.max(Math.hypot(...perp), 1e-6);
  perp = perp.map((v) => v / pl);
  // Two seeded control points make a smooth (often S-curved) filament.
  const b1 = 0.8 * len * (rnd(key, e, 930) - 0.5),
    b2 = 0.8 * len * (rnd(key, e, 934) - 0.5);
  const M1 = A.map((v, k) => v + (B[k] - v) / 3 + perp[k] * b1);
  const M2 = A.map((v, k) => v + ((B[k] - v) * 2) / 3 + perp[k] * b2);
  const lerp = (X, Y, t) => X.map((v, k) => v + (Y[k] - v) * t);
  return {
    pts: [
      webMorph(lerp(A, B, 0.55 * p), p),
      webMorph(lerp(M1, B, 0.4 * p), p),
      webMorph(lerp(M2, B, 0.2 * p), p),
      webMorph(B, p),
    ],
    tree: !(e & 1),
  };
}
// A point at s ∈ [0, 1] along the edge: a cubic Bézier A, C1, C2, B.
export function edgePoint(E, s) {
  const [P0, P1, P2, P3] = E.pts,
    r = 1 - s;
  return P0.map(
    (v, c) =>
      r * r * r * v +
      3 * r * r * s * P1[c] +
      3 * r * s * s * P2[c] +
      s * s * s * P3[c],
  );
}
// A dust tracer's filament: a seeded edge (tree edge when its loop edge is absent).
export function tracerEdge(world, ident) {
  let e = Math.min(
    EDGES - 1,
    Math.floor(rnd(world.key, ident.id, 940) * EDGES),
  );
  if (e & 1 && world.graph.neighbour[1 + (e >> 1)] < 0) e -= 1;
  return e;
}

// Polar angle offset ε and radius of the ellipse point with parameter u
// (axes a, b): wrap-free, |ε| < π/2.
export function ellipsePolar(a, b, u) {
  const c = Math.cos(u),
    s = Math.sin(u);
  return {
    eps: Math.atan(((b - a) * s * c) / (a * c * c + b * s * s)),
    rho: Math.sqrt(a * a * c * c + b * b * s * s),
  };
}

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const gaussian = (u1, u2) =>
  Math.sqrt(-2 * Math.log(Math.max(u1, 1e-7))) * Math.cos(2 * Math.PI * u2);

// Seed-derived world: potential modes and the spiral's character.
export function worldOf(seed) {
  const key = seedKey(seed);
  const modes = [];
  for (let m = 0; m < MODES; m++) {
    const z = rnd(key, m, 900) * 2 - 1,
      az = rnd(key, m, 901) * 2 * Math.PI,
      r = Math.sqrt(1 - z * z);
    const dir = [r * Math.cos(az), z * 0.85, r * Math.sin(az)];
    const len = Math.hypot(...dir);
    const k = 5 + 5 * rnd(key, m, 902);
    modes.push({
      k: dir.map((v) => (v / len) * k),
      kLen: k,
      amp: 0.22 + 0.2 * rnd(key, m, 903),
      // Every mode crests at the origin (phase π in the potential): the
      // seed's densest web node is the future nucleus and pulsar.
      phase: Math.PI,
      breathe: 2 * Math.PI * rnd(key, m, 904),
      drift: N.breathe + 3 * m,
    });
  }
  return {
    key,
    graph: webGraph(key),
    modes,
    twist: 1.35 * (2.2 + 0.9 * rnd(key, 0, 905)), // orientation radians per unit radius
    scale: 0.72 + 0.12 * rnd(key, 0, 906), // exponential disk length
    yaw0: rnd(key, 0, 907),
  };
}

// Identity of one particle: everything here depends on seed and id only.
export function identity(world, id) {
  const { key } = world;
  const kindRoll = rnd(key, id, 0);
  // 0 disk, 1 bulge, 2 sky, 3 absorbing dust (moves like the disk).
  const kind =
    id >= ABSORBERS ? 3 : kindRoll < 0.045 ? 2 : kindRoll < 0.165 ? 1 : 0;
  const rank = rnd(key, id, 1);
  const ang0 = 2 * Math.PI * rnd(key, id, 2);
  const v = gaussian(rnd(key, id, 3), rnd(key, id, 4));
  const w = gaussian(rnd(key, id, 5), rnd(key, id, 6));
  let a, height;
  if (kind === 1) {
    a = 0.03 + 0.34 * Math.pow(rank, 1.7);
    height = 0;
  } else {
    // Truncated exponential disk, rank-preserving from the cloud radius.
    const L = world.scale;
    a = 0.06 - L * Math.log(1 - rank * (1 - Math.exp(-RMAX / L)));
    height = v * (0.012 + 0.05 * Math.exp(-a / 0.5));
  }
  // Dust lattice coordinate q: cloud radius grows with the same rank.
  const rq = CLOUD * Math.sqrt(kind === 1 ? 0.45 * rank : rank);
  const q = [
    rq * Math.cos(ang0),
    0.42 * CLOUD * w * (1 - 0.55 * rank) * 0.6,
    rq * Math.sin(ang0),
  ];
  // Shell direction bias and roles.
  const sz = rnd(key, id, 7) * 2 - 1,
    saz = 2 * Math.PI * rnd(key, id, 8),
    sr = Math.sqrt(1 - sz * sz);
  return {
    id,
    kind,
    rank,
    ang0,
    a,
    height,
    q,
    cz: kind === 1 ? Math.max(-0.96, Math.min(0.96, v * 0.45)) : 0,
    shellDir: [sr * Math.cos(saz), sz, sr * Math.sin(saz)],
    layer: rnd(key, id, 9), // shell depth / ejecta role
    density: rnd(key, id, 10), // visibility threshold for energy density
    tone: rnd(key, id, 11),
  };
}

// Development progress of one particle: inner cloud condenses first; the
// shock reaches inner stars first.
export function progress(dev, rank) {
  const d = Math.min(2, Math.max(0, dev));
  const lo1 = 0.5 * rank;
  const lo2 = 0.5 * rank;
  return {
    p: smooth(lo1, lo1 + 0.5, d),
    n: smooth(lo2, lo2 + 0.5, d - 1),
  };
}

// dψ/dt: collapse spins the particle up to its orbital rate; nova freezes
// the record; dispersal relaxes ψ to the nearest whole turn.
export function psiRate(world, ident, dev, psi) {
  if (ident.kind === 2) return 0;
  const { p, n } = progress(dev, ident.rank);
  const wrapped = psi - 2 * Math.PI * Math.round(psi / (2 * Math.PI));
  const spin = Math.max(0, orbitOmega(ident.a) - cloudOmega());
  return p * (1 - n) * spin - (1 - p) * RELAX * wrapped;
}

// Breathing mode amplitude: the phases stay fixed, so the node stays put.
export const modeAmp = (m, clock) =>
  m.amp *
  (1 + MODULATION * Math.sin(2 * Math.PI * cycle(clock, m.drift) + m.breathe));

// Zel'dovich displacement S(q) = −∇Φ, Φ = Σ amp/|k|² cos(k·q + φ).
export function zeldovich(world, q, clock) {
  const s = [0, 0, 0];
  for (const m of world.modes) {
    const arg = m.k[0] * q[0] + m.k[1] * q[1] + m.k[2] * q[2] + m.phase;
    const f = (modeAmp(m, clock) / (m.kLen * m.kLen)) * Math.sin(arg);
    s[0] += f * m.k[0];
    s[1] += f * m.k[1];
    s[2] += f * m.k[2];
  }
  return s;
}
export function potential(world, q, clock) {
  let phi = 0;
  for (const m of world.modes) {
    phi +=
      (modeAmp(m, clock) / (m.kLen * m.kLen)) *
      Math.cos(m.k[0] * q[0] + m.k[1] * q[1] + m.k[2] * q[2] + m.phase);
  }
  return phi;
}

const rotY = (p, ang) => {
  const c = Math.cos(ang),
    s = Math.sin(ang);
  return [c * p[0] - s * p[2], p[1], s * p[0] + c * p[2]];
};

// World position of one particle. env: clock (uint32), psi (rad), dev,
// growth (Zel'dovich D), arms (twist multiplier), level (energy), shock.
export function position(world, ident, env) {
  const {
    clock,
    psi = 0,
    dev = 0,
    growth = 1.8,
    arms = 1,
    level = 0.5,
    shock = 1,
  } = env;
  if (ident.kind === 2)
    return ident.shellDir.map((v) => v * (7 + 9 * ident.layer));
  const { p, n } = progress(dev, ident.rank);
  const cloud = 2 * Math.PI * cycle(clock, N.cloud);
  const lambda = ident.ang0 + cloud + psi;
  // Galaxy point.
  let rhoG, epsG, yG;
  if (ident.kind === 1) {
    rhoG = ident.a * Math.sqrt(1 - ident.cz * ident.cz);
    epsG = 0;
    yG = ident.a * ident.cz * 0.72;
  } else {
    const ell = 1 - 0.32 * smooth(0.08, 0.55, ident.a);
    const beta =
      ident.a * world.twist * arms +
      2 * Math.PI * cycle(clock, N.pattern) +
      1.1 * (ident.tone - 0.5) * ident.layer;
    const e = ellipsePolar(ident.a, ident.a * ell, lambda - beta);
    rhoG = e.rho;
    epsG = e.eps;
    yG = ident.height;
  }
  const th = lambda + p * epsG;
  const galaxy = [rhoG * Math.cos(th), yG, rhoG * Math.sin(th)];
  let pos = galaxy;
  if (p < 1) {
    // Dust: the tracer streams along its filament into the node it drains
    // into, spread across the filament's soft cross-section.
    const E = webEdge(world.key, world.graph, tracerEdge(world, ident), p);
    const g = edgePoint(E, streamPhase(ident, clock));
    const spread = 0.03 + 0.03 * ident.layer;
    const jitter = [ident.q[0], ident.q[1], ident.q[2]].map(
      (v, k) => spread * Math.sin(7.3 * v + 2.1 * k + 2 * Math.PI * ident.tone),
    );
    const dust = rotY(
      g.map((v, k) => v + jitter[k] * (1 - p)),
      cloud + psi,
    );
    pos = dust.map((v, k) => v + (galaxy[k] - v) * p);
  }
  if (n <= 0) return pos;
  // Nova: collapse, then the same star rides out on the shell.
  const shell = shellPoint(world, ident, pos, clock, growth, shock);
  const s1 = smooth(0, 0.3, n),
    s2 = smooth(0.18, 1, n);
  const pull = 1 - 0.62 * s1;
  return pos.map((v, i) => v * pull + (shell[i] - v * pull) * s2);
}

// The shell keeps the star's direction from its galaxy position (arms leave
// their imprint) mixed with its own random direction; the same potential
// modes, sampled on the sphere, gather the shell into filaments (tangential
// Zel'dovich caustics) and Rayleigh–Taylor fingers (radial). Sedov–Taylor
// fronts F = 2.35·c^(2/5) run through it every cycle c.
export const SHELL = 1.55;

// Radiance shell: the bubble breaks out of the disk first (bipolar lobes
// along ±y), then rounds into a sphere. Smooth in development; no flash.
export function shellRadius(dev, dirY = 0) {
  const n = smooth(1, 2, dev);
  const lobe = 0.22 + 0.38 * (1 - smooth(0.3, 1, n));
  return SHELL * (0.1 + 0.9 * n) * (1 + lobe * dirY * dirY);
}

// CPU mirror of the shader's Zel'dovich web data (cloud frame): one
// fixed-point inversion q = x − D·S(x) of the map x = q + D·S(q), the
// caustic density 1/|det(I + D·∂S/∂q)| and the linear-overdensity node term.
export function webDensity(world, x, clock, growth = 1.8) {
  const S = zeldovich(world, x, clock);
  const q = x.map((v, i) => v - growth * S[i]);
  const H = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  let f = 0,
    total = 0;
  for (const m of world.modes) {
    const a = modeAmp(m, clock);
    const arg = m.k[0] * q[0] + m.k[1] * q[1] + m.k[2] * q[2] + m.phase;
    const w = (a / (m.kLen * m.kLen)) * Math.cos(arg) * growth;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) H[i][j] += w * m.k[i] * m.k[j];
    f += a * Math.cos(arg);
    total += a;
  }
  const det = Math.abs(
    H[0][0] * (H[1][1] * H[2][2] - H[1][2] * H[2][1]) -
      H[0][1] * (H[1][0] * H[2][2] - H[1][2] * H[2][0]) +
      H[0][2] * (H[1][0] * H[2][1] - H[1][1] * H[2][0]),
  );
  const caustic = Math.min(1 / Math.max(det, 0.07), 9);
  const node = Math.max(0, -f / total); // 1 exactly where all modes crest
  const env =
    Math.exp(-((Math.hypot(x[0], x[2]) / 1.8) ** 4)) *
    Math.exp(-((x[1] / 0.8) ** 2));
  return {
    caustic,
    node,
    env,
    rho:
      (Math.max(caustic - 0.8, 0) * 0.9 + 0.14 * caustic + 3 * node ** 6) * env,
  };
}

// One fixed 1/60 s step of the camera-development spring (semi-implicit).
export function followStep({ d, v }, target, dt = 1 / 60) {
  const w = FOLLOW.omega;
  const a = w * w * (target - d) - 2 * w * v;
  const nv = Math.max(-FOLLOW.vmax, Math.min(FOLLOW.vmax, v + a * dt));
  return { d: Math.max(0, Math.min(2, d + nv * dt)), v: nv };
}

const norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
// Camera of the GLSL nbCamera(): per-state framing blended by the smoothed
// camera development, a slow orbit, a crane over the disk edge in Spiral
// and an off-centre look-at drift on phrase scale.
export function cameraFraming(
  camDev,
  clock,
  { distance = 1, height = 0.66, seed = 3141 } = {},
) {
  const key = seedKey(seed);
  const p = smooth(0, 1, camDev),
    n = smooth(1, 2, camDev);
  const w = [1 - p, p * (1 - n), n];
  const mix3 = (v) => v[0] * w[0] + v[1] * w[1] + v[2] * w[2];
  const h = Math.min(1, Math.max(0, height));
  const crane = Math.sin(
    2 * Math.PI * (cycle(clock, N.crane) + rnd(key, 0, 908)),
  );
  const craneAmp = mix3(CAMERA.crane) * smooth(0, 0.5, h);
  const elevation = Math.min(
    1.35,
    Math.max(
      -0.05,
      mix3(CAMERA.elevation) +
        CAMERA.heightGain * (h - 0.66) +
        craneAmp * crane +
        CAMERA.lift * Math.sin(2 * Math.PI * cycle(clock, N.lift)),
    ),
  );
  const yaw = 2 * Math.PI * (cycle(clock, N.yaw) + rnd(key, 0, 907));
  // Never closer than 2.0: outside the disk and the web's dense core.
  const dist = Math.max(
    2,
    distance *
      mix3(CAMERA.distance) *
      (1 + CAMERA.craneDolly * w[1] * crane * smooth(0, 0.5, h)) *
      (1 + 0.03 * Math.sin(2 * Math.PI * cycle(clock, N.dolly))),
  );
  const eye = [
    dist * Math.cos(elevation) * Math.sin(yaw),
    dist * Math.sin(elevation),
    dist * Math.cos(elevation) * Math.cos(yaw),
  ];
  const f0 = norm(eye.map((v) => -v));
  const r0 = norm(cross(f0, [0, 1, 0]));
  const fr = 2 * Math.PI * (cycle(clock, N.frame) + rnd(key, 0, 909));
  const off = mix3(CAMERA.offset);
  const target = [0, 1, 2].map(
    (i) =>
      off * (r0[i] * Math.sin(fr) + (i === 1 ? 0.3 * Math.cos(fr) : 0)) -
      (i === 1 ? 0.04 : 0),
  );
  return { eye, target, distance: dist, elevation, focal: CAMERA.focal };
}

// CPU reference of the bounded slot-3 crest. Envelope decay moves the
// crest, but does not extinguish it before it reaches the outer gas.
export function starfront(x, envelope, count, hit = 0) {
  const env = Math.max(0, Math.min(1, envelope));
  if (env <= 0 && hit <= 0) return 0;
  const travel = 1 - env,
    radius = 0.12 + 2.25 * travel;
  const angle = 2.39996323 * (count % 144);
  const len = Math.max(Math.hypot(x[0], x[2]), 1e-4);
  const facing =
    0.5 + (0.5 * (x[0] * Math.cos(angle) + x[2] * Math.sin(angle))) / len;
  const sector = Math.max(0, (facing - 0.72) / 0.28) ** 2;
  const dr = Math.hypot(...x) - radius;
  const crest = Math.exp(-((dr / 0.09) ** 2));
  const wake = 0.2 * Math.exp(-(((dr + 0.22) / 0.2) ** 2));
  const gate =
    Math.min(1, env * 12) *
    Math.min(1, travel * 10 + Math.max(0, Math.min(1, hit)));
  return gate * sector * (crest + wake);
}

export function shockFront(R, clock, shock = 1) {
  const c = cycle(clock, N.shock);
  const F = 2.35 * sedovTaylor(c);
  const amp = shock * smooth(0, 0.05, c) * (1 - c);
  return amp * Math.exp(-((R - F) * (R - F)) / 0.006);
}
export function shellPoint(world, ident, from, clock, growth = 1.8, shock = 1) {
  const len = Math.max(Math.hypot(...from), 1e-4);
  const dir = ident.shellDir.map(
    (v, i) => v + ((0.8 * from[i]) / len) * (i === 1 ? 0.3 : 1),
  );
  const dl = Math.hypot(...dir);
  const n0 = dir.map((v) => v / dl);
  if (ident.kind === 1) {
    const t = jetPhase(ident, clock);
    if (t < 0)
      return n0.map((v) => v * (0.015 + 0.05 * ident.layer * ident.layer));
    // Pulsar jets: bulge stars stream out along a precessing axis.
    const ph = 2 * Math.PI * cycle(clock, N.lift);
    const ax = [0.45 * Math.sin(ph), 1, 0.45 * Math.cos(ph)];
    const al = Math.hypot(...ax);
    const axis = ax.map((v) => v / al);
    const along = n0[0] * axis[0] + n0[1] * axis[1] + n0[2] * axis[2];
    const sign = ident.tone < 0.5 ? -1 : 1;
    return axis.map(
      (v, i) =>
        v * sign * (0.04 + 0.35 * t * t) + (n0[i] - along * v) * 0.06 * t,
    );
  }
  const q = n0.map((v) => v * 2);
  const S = zeldovich(world, q, clock);
  const along = S[0] * n0[0] + S[1] * n0[1] + S[2] * n0[2];
  const t = n0.map((v, i) => v + 0.35 * growth * (S[i] - along * v));
  const tl = Math.hypot(...t);
  const nd = t.map((v) => v / tl);
  const fingers = fingerField(world, q, clock);
  const depth =
    ident.layer < 0.6
      ? 0.92 + 0.08 * Math.sqrt(ident.layer / 0.6)
      : 0.3 + (0.75 * (ident.layer - 0.6)) / 0.4;
  const breath = 1 + 0.03 * Math.sin(2 * Math.PI * cycle(clock, N.dolly));
  const R = SHELL * breath * (1 + 0.16 * fingers) * depth;
  const front = shockFront(R, clock, shock);
  return nd.map((v) => v * (R + 0.08 * front));
}
// Streaming phase of a dust tracer in [0, 1) and its light (zero at wrap).
export function streamPhase(ident, clock) {
  const t = cycle(clock, N.stream) + ident.tone;
  return t - Math.floor(t);
}
export const streamLight = (t) => Math.sin(Math.PI * t);
// Position along a pulsar jet in [0, 1) for jet stars (bulge, layer > 0.72),
// −1 otherwise. The flow wraps where jetLight is zero, so no star pops.
export function jetPhase(ident, clock) {
  if (ident.kind !== 1 || ident.layer <= 0.72) return -1;
  const t = (ident.layer - 0.72) / 0.28 + cycle(clock, N.jet);
  return t - Math.floor(t);
}
export const jetLight = (t) => 0.7 * Math.pow(1 - t, 1.5) * smooth(0, 0.06, t);

// Normalised Σ amp·cos(k·q + φ) in about [−1, 1].
export function fingerField(world, q, clock) {
  let f = 0,
    total = 0;
  for (const m of world.modes) {
    const a = modeAmp(m, clock);
    f += a * Math.cos(m.k[0] * q[0] + m.k[1] * q[1] + m.k[2] * q[2] + m.phase);
    total += a;
  }
  return (2 * f) / total;
}
