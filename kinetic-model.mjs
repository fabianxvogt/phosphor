// Kinetic Rain: the exact mathematics of the sphere grid, shared by the
// shader (constants are interpolated into the GLSL) and the CPU tests.
//
// One N×N lattice of spheres. Sphere (i, j) keeps its index in every state:
//   Ceiling   – all spheres hang level at HANG with a faint travelling ripple
//   Waves     – interfering travelling-wave choreographies (heightfield)
//   Sculpture – the index lattice becomes the (u, v) parameter grid of one
//               parametric surface morphing sphere → torus → Möbius → saddle
// Development is a pure function input: reversal retraces the forward path.

export const N = 96; // 9216 spheres
export const SPACING = 0.25; // ceiling lattice spacing (world units ≈ m)
export const HANG = 2.8; // level hang height above the floor
export const CEILING = 6.4; // motor ceiling
export const CENTER = [0, 1.95, 0]; // sculpture centre, near the mirror floor
export const SURFACE_COLS = 192;
export const SURFACE_ROWS = (N * N) / SURFACE_COLS;
export function sculptureUV(i, j) {
  const index = j * N + i;
  return [((index % SURFACE_COLS) + 0.5) / SURFACE_COLS, (Math.floor(index / SURFACE_COLS) + 0.5) / SURFACE_ROWS];
}
export const RADIUS = 0.038; // sphere radius on the ceiling lattice
export const HALF = ((N - 1) / 2) * SPACING; // lattice half extent
export const RMAX = HALF * Math.SQRT2; // farthest sphere from the axis
export const STAGGER = 0.85; // centre-first gathering into the sculpture
export const FOCAL = 1.4; // short-side focal length (half FOV ≈ 35.5°)
export const FOCAL_RISE = 0.22;
export const FRAME_GAIN = [0.08, 0.03, 0.065, 0];
export const MORPH_FIT = 0.18;
export const SADDLE_FIT = 1.1;
export const HERO_DISTANCE = 4.9;
export const HERO_PARALLAX = 0.45;
export function focalLength(dev, kick = 0, M = 0, seed = 0) {
  const w = chorus(M + (Number(seed) % 8192) % 4);
  const fit = w.reduce((s, x, i) => s + x * FRAME_GAIN[i], 0) +
    MORPH_FIT * (1 - w.reduce((s, x) => s + x * x, 0)) +
    SADDLE_FIT * w[3] * (1 - w[3]);
  return (FOCAL + (FOCAL_RISE + fit) * smoothstep(1, 2, dev)) * (1 + 0.02 * clamp(kick, 0, 1));
}
export const RING = { reach: 13, width: 1.8, amp: 0.16, wave: 1.9, grow: 8 };
export const FORM = {
  sphere: 1.8,
  torusR: 1.5,
  torusr: 0.66,
  mobiusR: 1.6,
  mobiusW: 0.62,
  saddleR: 2.22,
  saddleK: 0.1,
  saddleWave: 0.07,
};
// Motor envelope (world units per second) the tests hold every state to.
export const VMAX = 3.0;
// Hold fraction of each choreography / form before it morphs into the next.
export const HOLD = 0.55;
// Tilt of the sculpture's axis (radians).
export const TILT = 0.68;

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fract = (x) => x - Math.floor(x);

// Seed-derived identity: choreography direction and camera start.
export function seedAngles(seed) {
  const s = Number(seed) % 8192;
  return { wave: TAU * fract(s * 0.6180339887), camera: TAU * fract(s * 0.7548776662) };
}

// Partition of unity over the four choreographies / forms at phase M ∈ [0, 4):
// hold, then a smooth crossfade into the next; continuous across integers.
export function chorus(M) {
  const c = Math.floor(M),
    s = smoothstep(HOLD, 1, M - c);
  const w = [0, 0, 0, 0];
  w[((c % 4) + 4) % 4] += 1 - s;
  w[(((c + 1) % 4) + 4) % 4] += s;
  return w;
}

// Faint slow ripple of the level ceiling (|h| ≤ 0.075).
export function rippleHeight(x, z, W) {
  return (
    0.045 * Math.sin(0.42 * x + 0.27 * z - W) +
    0.03 * Math.sin(0.31 * z - 0.38 * x - W + 1.3)
  );
}
export const RIPPLE_BOUND = 0.075;

// Interfering travelling waves: four choreographies, weighted by chorus(M).
// W: wave phase (clock 0), Phi: sculpture turn (clock 2); the plane-wave
// directions drift at half of it.
export function waveHeight(x, z, W, w, Phi, detail, base) {
  const a = base + 0.5 * Phi,
    b = a + 2.2;
  const d1x = Math.cos(a),
    d1z = Math.sin(a),
    d2x = Math.cos(b),
    d2z = Math.sin(b);
  const rho = Math.hypot(x, z),
    th = Math.atan2(z, x + 1e-7);
  const h0 =
    0.17 * Math.sin(1.25 * (d1x * x + d1z * z) - 2 * W) +
    0.17 * Math.sin(1.05 * (d2x * x + d2z * z) - 2 * W);
  const h1 = 0.27 * Math.sin(1.15 * rho - 2 * W);
  const h2 = 0.25 * Math.sin(0.95 * rho + 3 * th - 2 * W) * smoothstep(0.4, 2.6, rho);
  const h3 =
    0.32 *
    Math.sin(0.85 * (d1x * x + d1z * z)) *
    Math.sin(0.85 * (-d1z * x + d1x * z)) *
    Math.cos(2 * W);
  const fine = 0.06 * detail * Math.sin(2.9 * (d2x * x + d2z * z) + 1.7 * rho - 3 * W);
  return w[0] * h0 + w[1] * h1 + w[2] * h2 + w[3] * h3 + fine;
}

// Kick ring: a wave packet launched from the centre as the kick envelope
// decays. The envelope's launch value is the gesture strength times the
// engine's energy gain (engine-rhythm.mjs rhythmResponse), both known to the
// shader, so the normalised envelope runs 1 → 0 and moves the front from the
// axis to RING.reach. The amplitude grows in over RING.grow units of travel
// and vanishes with the envelope: at the authored strength a launch moves no
// motor at all, at other strengths only a bounded kick response.
export const KICK_STRENGTH = 0.8;
export const rhythmGain = (level) => 0.12 + 0.88 * smoothstep(0, 1, level);
export function ringProfile(rho, kick, level) {
  const kn = clamp(kick / (KICK_STRENGTH * rhythmGain(level)), 0, 1);
  const front = RING.reach * (1 - kn),
    x = (rho - front) / RING.width;
  return smoothstep(0, RING.grow, front) * Math.exp(-x * x) * Math.cos(RING.wave * x);
}
export const ringHeight = (rho, kick, level) =>
  RING.amp * kick * ringProfile(rho, kick, level);
// Emissive front uses normalised envelope rather than motor amplitude:
// equally legible at low energy, still zero at launch and at rest.
export const ringLight = (rho, kick, level) =>
  Math.max(ringProfile(rho, kick, level), 0) *
  smoothstep(0, 0.06, kick / (KICK_STRENGTH * rhythmGain(level)));

// Parametric forms on (u, v) ∈ [0, 1]², local to CENTER.
export function formSphere(u, v) {
  const th = TAU * u,
    ph = Math.PI * v,
    R = FORM.sphere;
  return [R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)];
}
export function formTorus(u, v) {
  const th = TAU * u,
    ps = Math.PI * 0.5 - TAU * v;
  const R = FORM.torusR + FORM.torusr * Math.cos(ps);
  return [R * Math.cos(th), FORM.torusr * Math.sin(ps), R * Math.sin(th)];
}
export function formMobius(u, v) {
  const th = TAU * u,
    w = FORM.mobiusW * (1 - 2 * v);
  const R = FORM.mobiusR + w * Math.cos(th * 0.5);
  return [R * Math.cos(th), w * Math.sin(th * 0.5), R * Math.sin(th)];
}
export function formSaddle(u, v, W) {
  const th = TAU * u,
    r = FORM.saddleR * Math.sqrt(0.02 + 0.98 * v);
  const y =
    FORM.saddleK * r * r * Math.cos(2 * th) +
    FORM.saddleWave * r * Math.sin(2.6 * r - 2 * W);
  return [r * Math.cos(th), y, r * Math.sin(th)];
}

// A travelling breathing wave over the sculpture (radial scale factor);
// detail grows with energy.
export const shimmerAt = (u, v, W, detail) =>
  1 + (0.01 + 0.02 * detail) * Math.sin(TAU * (5 * u + 3 * v) - 2 * W);

// Blended, rotated sculpture (local to CENTER).
export function sculpture(u, v, w, W, Phi, detail) {
  const p = [0, 0, 0];
  const forms = [
    () => formSphere(u, v),
    () => formTorus(u, v),
    () => formMobius(u, v),
    () => formSaddle(u, v, W),
  ];
  for (let k = 0; k < 4; k++) {
    if (!(w[k] > 0)) continue;
    const f = forms[k]();
    p[0] += w[k] * f[0];
    p[1] += w[k] * f[1];
    p[2] += w[k] * f[2];
  }
  const shimmer = shimmerAt(u, v, W, detail);
  // Tilt about x, then turn about the vertical: the form wobbles like a
  // spinning coin, so the camera sees every side of it.
  const ct = Math.cos(TILT),
    st = Math.sin(TILT);
  const y = ct * p[1] - st * p[2],
    z = st * p[1] + ct * p[2];
  const c = Math.cos(Phi),
    s = Math.sin(Phi);
  return [(c * p[0] - s * z) * shimmer, y * shimmer, (s * p[0] + c * z) * shimmer];
}

// Analytic differential, in the same lattice-step units as the old
// centred differences. Position/identity is untouched; normals and local
// pearl spacing no longer need four additional complete surface samples.
export function sculptureDerivatives(u, v, w, W, Phi, detail, p = sculpture(u, v, w, W, Phi, detail)) {
  const th = TAU * u, c = Math.cos(th), s = Math.sin(th);
  const du = [0, 0, 0], dv = [0, 0, 0];
  const add = (a, b, k) => { for (let i = 0; i < 3; i++) a[i] += b[i] * k; };
  if (w[0] > 0) {
    const sp = Math.sin(Math.PI * v), cp = Math.cos(Math.PI * v);
    add(du, [-s, 0, c], w[0] * TAU * FORM.sphere * sp);
    add(dv, [cp * c, -sp, cp * s], w[0] * Math.PI * FORM.sphere);
  }
  if (w[1] > 0) {
    const ps = Math.PI / 2 - TAU * v, sp = Math.sin(ps), cp = Math.cos(ps);
    add(du, [-s, 0, c], w[1] * TAU * (FORM.torusR + FORM.torusr * cp));
    add(dv, [sp * c, -cp, sp * s], w[1] * TAU * FORM.torusr);
  }
  if (w[2] > 0) {
    const m = FORM.mobiusW * (1 - 2 * v), ch = Math.cos(th / 2), sh = Math.sin(th / 2);
    const r = FORM.mobiusR + m * ch, dr = -0.5 * TAU * m * sh;
    add(du, [dr * c - TAU * r * s, 0.5 * TAU * m * ch, dr * s + TAU * r * c], w[2]);
    add(dv, [ch * c, sh, ch * s], w[2] * -2 * FORM.mobiusW);
  }
  if (w[3] > 0) {
    const r = FORM.saddleR * Math.sqrt(0.02 + 0.98 * v), a = 2.6 * r - 2 * W;
    const dr = 0.49 * FORM.saddleR ** 2 / r;
    add(du, [-r * s, -2 * FORM.saddleK * r * r * Math.sin(2 * th), r * c], w[3] * TAU);
    add(dv, [c, 2 * FORM.saddleK * r * Math.cos(2 * th) + FORM.saddleWave * (Math.sin(a) + 2.6 * r * Math.cos(a)), s], w[3] * dr);
  }
  const ct = Math.cos(TILT), st = Math.sin(TILT), cp = Math.cos(Phi), sp = Math.sin(Phi);
  const phase = TAU * (5 * u + 3 * v) - 2 * W, a = 0.01 + 0.02 * detail;
  const sh = 1 + a * Math.sin(phase), ds = a * Math.cos(phase) * TAU;
  return [du, dv].map((d, axis) => {
    const y = ct * d[1] - st * d[2], z = st * d[1] + ct * d[2];
    const rot = [cp * d[0] - sp * z, y, sp * d[0] + cp * z];
    return rot.map((x, i) => (x * sh + p[i] * ds * (axis === 0 ? 5 : 3) / sh) / (axis === 0 ? SURFACE_COLS : SURFACE_ROWS));
  });
}

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const normalize = (a) => {
  const l = len(a);
  return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0];
};

// The single position law of sphere (i, j). state: { dev, W, M, Phi, kick,
// level, detail, amp, size, seed }. Returns position, surface normal, radius,
// palette coordinate and the sphere's sculpture weight.
export function ball(i, j, state) {
  const { dev, W, M, Phi, kick = 0, level = 0.5, detail = 0, amp = 1, size = 1, seed = 0 } = state;
  const base = seedAngles(seed).wave;
  const d = clamp(dev, 0, 2);
  const gx = (i - (N - 1) / 2) * SPACING,
    gz = (j - (N - 1) / 2) * SPACING;
  const rho = Math.hypot(gx, gz);
  const s01 = smoothstep(0, 1, d),
    s12 = clamp(d - 1, 0, 1);
  const sig = smoothstep(0, 1, s12 * (1 + STAGGER) - (STAGGER * rho) / RMAX);
  // The seed picks the first form / choreography (whole steps: a hold).
  const w = chorus(M + (Number(seed) % 8192) % 4);
  const ring = ringHeight(rho, kick, level) * amp;
  let pg = [0, 0, 0],
    ng = [0, 1, 0],
    hg = 0.5;
  if (sig < 1) {
    const h = (x, z) =>
      rippleHeight(x, z, W) +
      s01 * (waveHeight(x, z, W, w, Phi, detail, base) * amp - rippleHeight(x, z, W));
    const y = h(gx, gz),
      y0 = rippleHeight(gx, gz, W),
      e = SPACING * 0.5;
    const dx = (h(gx + e, gz) - h(gx - e, gz)) / (2 * e),
      dz = (h(gx, gz + e) - h(gx, gz - e)) / (2 * e);
    pg = [gx, HANG + y + ring, gz];
    ng = normalize([-dx, 1, -dz]);
    hg = clamp(0.5 + (y + ring) * 1.15 + 0.22 * (1 - s01) * (y0 / 0.075), 0, 1);
  }
  let ps = [0, 0, 0],
    ns = [0, 1, 0],
    rs = RADIUS,
    hs = 0.5;
  if (sig > 0) {
    const [u, v] = sculptureUV(i, j);
    const p = sculpture(u, v, w, W, Phi, detail);
    const [du, dv] = sculptureDerivatives(u, v, w, W, Phi, detail, p);
    // The parametric orientation is continuous in time for every sphere;
    // the ring moves along it. Shading uses the upward-facing side.
    const no = normalize(cross(dv, du));
    const ringS = ring * 0.6;
    ps = [
      CENTER[0] + p[0] + no[0] * ringS,
      CENTER[1] + p[1] + no[1] * ringS,
      CENTER[2] + p[2] + no[2] * ringS,
    ];
    ns = no[1] < 0 ? [-no[0], -no[1], -no[2]] : no;
    // Local lattice spacing on the surface sets the sphere size, so dense
    // regions (poles, the disc centre) read as one surface, not a clump.
    rs = clamp(0.55 * Math.sqrt(len(du) * len(dv)), 0.014, 0.055);
    hs = clamp(0.5 + 0.34 * p[1], 0, 1);
  }
  const p = [
    pg[0] + (ps[0] - pg[0]) * sig,
    pg[1] + (ps[1] - pg[1]) * sig,
    pg[2] + (ps[2] - pg[2]) * sig,
  ];
  return {
    p,
    n: normalize([
      ng[0] + (ns[0] - ng[0]) * sig,
      ng[1] + (ns[1] - ng[1]) * sig + 1e-4,
      ng[2] + (ns[2] - ng[2]) * sig,
    ]),
    r: size * (RADIUS + (rs - RADIUS) * sig),
    hue: hg + (hs - hg) * sig,
    sig,
  };
}

// Crane from beneath the grid to the sculpture's tilted normal. Following
// its normal prevents edge-on Möbius/saddle holds; a small tangent orbit
// retains parallax. All phases are independently periodic, with no angle lerp.
export function camera(dev, alpha, Phi = 0, M = 0) {
  const s2 = smoothstep(1, 2, clamp(dev, 0, 2));
  const radius = 6.0 + 0.4 * Math.sin(2 * alpha);
  const height = 0.75 + 0.1 * Math.sin(3 * alpha);
  const c = Math.cos(Phi), s = Math.sin(Phi), ca = Math.cos(alpha), sa = Math.sin(alpha);
  const ct = Math.cos(TILT), st = Math.sin(TILT), d = HERO_DISTANCE, q = HERO_PARALLAX;
  const hero = [-d * st * s + q * (c * ca - ct * s * sa),
    CENTER[1] + d * ct - q * st * sa, d * st * c + q * (s * ca + ct * c * sa)];
  const start = [radius * ca, height, radius * sa];
  // Wait for the outer lattice to clear the crane's path; rise before
  // dollying inward. A direct lerp crossed the gathering spheres.
  const crane = smoothstep(1.75, 1.97, dev), dolly = smoothstep(1.85, 2, dev);
  const eye = start.map((x, i) => x + (hero[i] - x) * (i === 1 ? crane : dolly));
  const side = 0.9 * (1 - s2);
  const s01 = smoothstep(0, 1, clamp(dev, 0, 1));
  const aim = 0.25 * s2 * chorus(M)[2];
  const target = [-Math.sin(alpha) * side + aim * c, 2.2 - 0.3 * s01 + 0.05 * s2, Math.cos(alpha) * side + aim * s];
  return { eye, target };
}

// Haze glow of a horizontal light layer at height h, seen along a ray with
// fog length F over [t0, t1] (the part of the ray inside the installation's
// footprint). Light falls off with scale sA above the layer and sB below:
//   I = ∫_t0^t1 exp(-g(t)/sA [g > 0] + g(t)/sB [g < 0] - t/F) dt,
//   g(t) = o + d t - h. Piecewise exponential, so the closed form is exact.
export function hazeLayer(o, d, t0, t1, h, sA, sB, F) {
  const y0 = o - h;
  const seg = (c, a, u0, u1) => {
    if (!(u1 > u0)) return 0;
    if (Math.abs(a) < 1e-6) return (u1 - u0) * Math.exp(c + a * 0.5 * (u0 + u1));
    return (Math.exp(c + a * u1) - Math.exp(c + a * u0)) / a;
  };
  const above = (u0, u1) => seg(-y0 / sA, -d / sA - 1 / F, u0, u1);
  const below = (u0, u1) => seg(y0 / sB, d / sB - 1 / F, u0, u1);
  if (!(t1 > t0)) return 0;
  const first = y0 + d * t0 >= 0;
  const tc = -y0 / d;
  // No crossing inside [t0, t1]: one side of the layer only.
  if (!(tc > t0 && tc < t1)) return first ? above(t0, t1) : below(t0, t1);
  return first ? above(t0, tc) + below(tc, t1) : below(t0, tc) + above(tc, t1);
}

// Entry and exit of a ray (origin o, direction d; xz components) through
// the square column |x|, |z| ≤ e, clipped to [0, T].
export function columnSpan(ox, oz, dx, dz, e, T) {
  let t0 = 0,
    t1 = T;
  for (const [o, d] of [
    [ox, dx],
    [oz, dz],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(o) > e) return [0, 0];
      continue;
    }
    const a = (-e - o) / d,
      b = (e - o) / d;
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
  }
  return t1 > t0 ? [t0, t1] : [0, 0];
}

// Deterministic per-sphere randomness (twinkle phase); development-free.
function hash(seed, i) {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// Vertex buffer: [i, j, corner x, corner y, kind, rnd] per vertex.
// kind 0: sphere impostor and 1: its floor mirror (opaque), 2: thread (additive).
export const ATTRIBUTES = [2, 2, 1, 1];
export const STRIDE = 6;
export const KIND = { sphere: 0, reflection: 1, thread: 2 };
export const ADDITIVE_FROM = 2 * N * N * 6;
const CORNERS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
export function createGeometry(seed) {
  const data = new Float32Array(N * N * 3 * 6 * STRIDE);
  let o = 0;
  for (const kind of [KIND.sphere, KIND.reflection, KIND.thread])
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const rnd = hash(seed, j * N + i);
        for (const [cx, cy] of CORNERS) {
          data[o++] = i;
          data[o++] = j;
          data[o++] = cx;
          data[o++] = cy;
          data[o++] = kind;
          data[o++] = rnd;
        }
      }
  return data;
}
