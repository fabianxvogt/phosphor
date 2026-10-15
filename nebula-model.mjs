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
export const MODES = 8; // Zel'dovich potential modes
export const N = {
  cloud: 4, // rigid cloud turn: 360 s per revolution
  pattern: 9, // spiral pattern speed: 160 s per revolution
  drift: 2, // potential phase drift
  shock: 120, // shock fronts every 12 s at speed 1
  yaw: 5, // gentle camera orbit 288 s
  lift: 9, // camera height swing 160 s
  dolly: 6, // camera distance 240 s
  wobble: 80, // dust turbulence 18 s
  jet: 240, // pulsar jet flow 6 s
};
export const CAMERA = {
  distance: [3.95, 2.9, 3.7],
  elevation: [.18, 1.18],
  lift: .07,
  focal: 1.85,
};
export const ORBIT_V = 0.22; // flat rotation curve speed
export const ORBIT_CORE = 0.26; // solid-body core radius
export const RELAX = 0.55; // ψ relaxation rate (1/s) when dispersing

// Normalised sech² dust slab: rho(y) = k/(2h) sech²(ky/h).
// Exact line integral on a finite segment. A foreground star does not
// include the dust behind it; a grazing ray has a finite parallel limit.
export function dustColumn(start, eye) {
  const h = .035, k = 1.20276058;
  const dy = eye[1] - start[1];
  const len = Math.hypot(...eye.map((v, i) => v - start[i]));
  if (Math.abs(dy) < .0001) {
    const a = Math.tanh(k * start[1] / h);
    return len * k / (2 * h) * (1 - a * a);
  }
  return .5 * len / Math.abs(dy) * Math.abs(Math.tanh(k * eye[1] / h) - Math.tanh(k * start[1] / h));
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
    const dir = [r * Math.cos(az), z * 0.55, r * Math.sin(az)];
    const len = Math.hypot(...dir);
    const k = 2.4 + 2.4 * rnd(key, m, 902);
    modes.push({
      k: dir.map((v) => (v / len) * k),
      kLen: k,
      amp: 0.22 + 0.2 * rnd(key, m, 903),
      phase: 2 * Math.PI * rnd(key, m, 904),
      drift: 1 + (m % N.drift),
    });
  }
  return {
    key,
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

// Zel'dovich displacement S(q) = −∇Φ, Φ = Σ amp/|k|² cos(k·q + φ).
export function zeldovich(world, q, clock) {
  const s = [0, 0, 0];
  for (const m of world.modes) {
    const ph = m.phase + 2 * Math.PI * cycle(clock, m.drift);
    const arg = m.k[0] * q[0] + m.k[1] * q[1] + m.k[2] * q[2] + ph;
    const f = (m.amp / (m.kLen * m.kLen)) * Math.sin(arg);
    s[0] += f * m.k[0];
    s[1] += f * m.k[1];
    s[2] += f * m.k[2];
  }
  return s;
}
export function potential(world, q, clock) {
  let phi = 0;
  for (const m of world.modes) {
    const ph = m.phase + 2 * Math.PI * cycle(clock, m.drift);
    phi +=
      (m.amp / (m.kLen * m.kLen)) *
      Math.cos(m.k[0] * q[0] + m.k[1] * q[1] + m.k[2] * q[2] + ph);
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
  if (ident.kind === 2) return ident.shellDir.map((v) => v * (7 + 9 * ident.layer));
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
  const rhoQ = Math.hypot(ident.q[0], ident.q[2]);
  const rho = rhoQ + (rhoG - rhoQ) * p;
  const y = ident.q[1] + (yG - ident.q[1]) * p;
  const th = lambda + p * epsG;
  let pos = [rho * Math.cos(th), y, rho * Math.sin(th)];
  if (p < 1) {
    const S = zeldovich(world, ident.q, clock);
    const wob =
      2 * Math.PI * cycle(clock, N.wobble) + 2 * Math.PI * ident.tone;
    const j = 0.03 * (0.4 + 0.9 * level);
    const jitter = [
      j * Math.sin(wob + ident.q[1] * 3),
      j * Math.sin(wob + 1.7 + ident.q[0] * 2),
      j * Math.cos(wob + ident.q[2] * 2),
    ];
    const disp = rotY(
      S.map((v, i) => v * growth + jitter[i]),
      cloud + psi,
    );
    pos = pos.map((v, i) => v + disp[i] * (1 - p));
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
export const SHELL = 1.45;

// CPU reference for the unresolved radiance carrier (not a sampled volume).
// The closest point in an ellipsoidal metric continuously flattens the
// diffuse cloud into a thin emitting disk. The shell is a finite radial
// carrier with spherical support and turbulent emitting thickness, bounded
// before noise is read. No angular lobes or polygonal silhouette.
export function radianceCloudPoint(eye, ray, dev) {
  const p = smooth(0, 1, dev), thickness = .65 + (.035 - .65) * p;
  const metric = [1, 1 / thickness, 1];
  const er = ray.map((v, i) => v * metric[i]);
  const eo = eye.map((v, i) => v * metric[i]);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const t = Math.max(0, -dot(er, eo) / dot(er, er));
  return { point: eye.map((v, i) => v + ray[i] * t), t, thickness };
}
export function radianceShellRadius(dev) {
  return SHELL * (.25 + .75 * smooth(1, 2, dev));
}
export function radianceShellEnvelope(dev, impact, noise0 = .5, noise1 = .5) {
  const R = radianceShellRadius(dev);
  return {
    cover: 1 - smooth(R * .94, R * 1.16, impact),
    limb: Math.exp(-(((impact - R * (.87 + .07 * (noise0 - .5))) /
      (R * (.085 + .07 * noise1) + .001)) ** 2)),
  };
}
export function cameraFraming(dev, clock, { distance = 1, height = .66 } = {}) {
  const p = smooth(0, 1, dev), n = smooth(1, 2, dev);
  return {
    distance: distance * (CAMERA.distance[0] + (CAMERA.distance[1] - CAMERA.distance[0]) * p +
      (CAMERA.distance[2] - CAMERA.distance[1]) * n) *
      (1 + .04 * Math.sin(2 * Math.PI * cycle(clock, N.dolly))),
    elevation: CAMERA.elevation[0] + (CAMERA.elevation[1] - CAMERA.elevation[0]) *
      Math.min(1, Math.max(0, height)) + CAMERA.lift * Math.sin(2 * Math.PI * cycle(clock, N.lift)),
    focal: CAMERA.focal,
  };
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
        v * sign * (0.05 + 1.6 * t * t) + (n0[i] - along * v) * 0.035 * t,
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
// Position along a pulsar jet in [0, 1) for jet stars (bulge, layer > 0.72),
// −1 otherwise. The flow wraps where jetLight is zero, so no star pops.
export function jetPhase(ident, clock) {
  if (ident.kind !== 1 || ident.layer <= 0.72) return -1;
  const t = (ident.layer - 0.72) / 0.28 + cycle(clock, N.jet);
  return t - Math.floor(t);
}
export const jetLight = (t) =>
  0.7 * Math.pow(1 - t, 1.5) * smooth(0, 0.06, t);

// Normalised Σ amp·cos(k·q + φ) in about [−1, 1].
export function fingerField(world, q, clock) {
  let f = 0,
    total = 0;
  for (const m of world.modes) {
    const ph = m.phase + 2 * Math.PI * cycle(clock, m.drift);
    f += m.amp * Math.cos(m.k[0] * q[0] + m.k[1] * q[1] + m.k[2] * q[2] + ph);
    total += m.amp;
  }
  return (2 * f) / total;
}
