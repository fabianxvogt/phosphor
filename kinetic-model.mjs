// Kinetic Rain r4: one injective suspended lattice, never a closed skin.
export const N = 96;
export const SPACING = 0.25;
export const HANG = 2.8;
export const CEILING = 9.4;
export const RADIUS = 0.046;
export const HALF = ((N - 1) / 2) * SPACING;
export const VMAX = 3;
export const HOLD = 0.55;
export const FOCAL = 1.4;
export const KICK_STRENGTH = 0.8;
export const RING = { reach: 13, width: 1.8, amp: 0.16, wave: 1.9, grow: 8 };
const TAU = 2 * Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fract = (x) => x - Math.floor(x);
export function seedAngles(seed) {
  const s = Number(seed) % 8192;
  return {
    wave: TAU * fract(s * 0.6180339887),
    camera: TAU * fract(s * 0.7548776662),
  };
}
export function chorus(M) {
  const c = Math.floor(M),
    s = smoothstep(HOLD, 1, M - c);
  const w = [0, 0, 0, 0];
  w[((c % 4) + 4) % 4] += 1 - s;
  w[(((c + 1) % 4) + 4) % 4] += s;
  return w;
}
export const RIPPLE_BOUND = 0.46;
export function rippleHeight(x, z, W) {
  return (
    0.14 * Math.sin(0.42 * x + 0.27 * z - W) +
    0.1 * Math.sin(0.31 * z - 0.38 * x - W + 1.3) +
    0.22 * Math.exp(-(((Math.hypot(x, z) - 5) / 3) ** 2))
  );
}
export function waveHeight(x, z, W, w, Phi, detail, base) {
  const a = base + 0.5 * Phi,
    b = a + 2.2;
  const q = Math.cos(a) * x + Math.sin(a) * z,
    t = -Math.sin(a) * x + Math.cos(a) * z;
  const q2 = Math.cos(b) * x + Math.sin(b) * z,
    rho = Math.hypot(x, z),
    th = Math.atan2(z, x + 1e-7);
  return (
    w[0] *
      (0.17 * Math.sin(1.25 * q - 2 * W) + 0.17 * Math.sin(1.05 * q2 - 2 * W)) +
    w[1] * 0.27 * Math.sin(1.15 * rho - 2 * W) +
    w[2] *
      0.25 *
      Math.sin(0.95 * rho + 3 * th - 2 * W) *
      smoothstep(0.4, 2.6, rho) +
    w[3] * 0.32 * Math.sin(0.85 * q) * Math.sin(0.85 * t) * Math.cos(2 * W) +
    0.06 * detail * Math.sin(2.9 * q2 + 1.7 * rho - 3 * W)
  );
}
// Broad separated folds on the SAME rectangular motor addresses. Their
// convex choreography blend cannot create crossing wings or collapsed poles.
export function foldHeight(x, z, W, w, Phi) {
  const a = Phi * 0.5,
    q = Math.cos(a) * x + Math.sin(a) * z,
    t = -Math.sin(a) * x + Math.cos(a) * z;
  const r = Math.hypot(x, z),
    th = Math.atan2(z, x + 1e-7);
  const h0 = 1.35 * Math.sin(0.42 * q - W) + 0.38 * Math.cos(0.32 * t + W);
  const h1 = 1.55 * Math.cos(0.43 * r - W) + 0.25 * Math.sin(0.3 * q + W);
  const h2 =
    1.35 * Math.sin(0.38 * r + 2 * th - W) * smoothstep(0, 3, r) +
    0.3 * Math.cos(0.3 * t - W);
  const h3 =
    1.35 * Math.sin(0.34 * q - W) * Math.cos(0.28 * t) +
    0.35 * Math.sin(0.3 * t + W);
  return w[0] * h0 + w[1] * h1 + w[2] * h2 + w[3] * h3;
}
export const rhythmGain = (level) => 0.12 + 0.88 * smoothstep(0, 1, level);
export function ringProfile(rho, kick, level) {
  const kn = clamp(kick / (KICK_STRENGTH * rhythmGain(level)), 0, 1),
    front = RING.reach * (1 - kn),
    x = (rho - front) / RING.width;
  return (
    smoothstep(0, RING.grow, front) * Math.exp(-x * x) * Math.cos(RING.wave * x)
  );
}
export const ringHeight = (rho, kick, level) =>
  RING.amp * kick * ringProfile(rho, kick, level);
export const ringLight = (rho, kick, level) =>
  Math.max(ringProfile(rho, kick, level), 0) *
  smoothstep(0, 0.06, kick / (KICK_STRENGTH * rhythmGain(level)));
// Mirror delay is a light phase, not delayed/moved geometry. Silence must
// be exactly silent even though the echo uses a delayed progress address.
export function cascadeLight(y, envelope, level, lag = 0) {
  const d = clamp(envelope / (0.96 * rhythmGain(level)), 0, 1);
  const progress = clamp(1 - d - lag, 0, 1),
    front = 5.65 - 5.5 * progress;
  return (
    Math.exp(-(((y - front) / 0.14) ** 2)) *
    smoothstep(0, 0.08, progress) *
    (1 - smoothstep(0.94, 1, progress)) *
    smoothstep(0, 0.035, d)
  );
}
export function installationHeight(x, z, state) {
  const { dev, W, M, Phi, detail = 0, amp = 1, seed = 0 } = state;
  const d = clamp(dev, 0, 2),
    s = smoothstep(0, 1, d),
    f = smoothstep(1, 2, d);
  const w = chorus(M + ((Number(seed) % 8192) % 4));
  const ripple = rippleHeight(x, z, W);
  const wave = waveHeight(x, z, W, w, Phi, detail, seedAngles(seed).wave) * amp;
  const fold = foldHeight(x, z, W, w, Phi) * (0.68 + 0.22 * amp);
  const tiers =
    0.09 * Math.sin((TAU * x) / (SPACING * 5)) +
    0.06 * Math.cos((TAU * z) / (SPACING * 7));
  return (
    HANG +
    ripple +
    (wave - ripple) * s +
    (fold - wave) * f +
    tiers * (0.2 + 0.8 * f)
  );
}
export function ball(i, j, state) {
  const x = (i - (N - 1) / 2) * SPACING,
    z = (j - (N - 1) / 2) * SPACING;
  const y = installationHeight(x, z, state),
    e = SPACING * 0.5;
  const dx =
    (installationHeight(x + e, z, state) -
      installationHeight(x - e, z, state)) /
    (2 * e);
  const dz =
    (installationHeight(x, z + e, state) -
      installationHeight(x, z - e, state)) /
    (2 * e);
  const n = [-dx, 1, -dz],
    l = Math.hypot(...n);
  const ring =
    ringHeight(Math.hypot(x, z), state.kick ?? 0, state.level ?? 0.5) *
    (state.amp ?? 1);
  return {
    p: [x, y + ring, z],
    n: n.map((v) => v / l),
    r: RADIUS * (state.size ?? 1) * (1 + 0.2 * smoothstep(1, 2, state.dev)),
    hue: clamp(0.5 + (y - HANG) * 0.25, 0, 1),
    sig: smoothstep(1, 2, state.dev),
  };
}
export function focalLength(dev, kick = 0) {
  return (
    (FOCAL + 0.38 * smoothstep(1, 2, dev)) * (1 + 0.02 * clamp(kick, 0, 1))
  );
}
// Dolly outside the footprint before rising; never crane through the lamps.
export function camera(dev, alpha) {
  const d = clamp(dev, 0, 2),
    f = smoothstep(1, 1.65, d),
    rise = smoothstep(1.6, 2, d);
  const radius = 6 + 0.4 * Math.sin(2 * alpha) + 14 * f;
  const height = 0.75 + 0.1 * Math.sin(3 * alpha) + 4.75 * rise;
  const side = 0.9 + 1.0 * smoothstep(1, 2, d);
  return {
    eye: [radius * Math.cos(alpha), height, radius * Math.sin(alpha)],
    target: [
      -Math.sin(alpha) * side,
      2.5 - 2.3 * smoothstep(1, 2, d),
      Math.cos(alpha) * side,
    ],
  };
}
export function hazeLayer(o, d, t0, t1, h, sA, sB, F) {
  const y0 = o - h;
  const seg = (c, a, u0, u1) =>
    !(u1 > u0)
      ? 0
      : Math.abs(a) < 1e-6
        ? (u1 - u0) * Math.exp(c + a * 0.5 * (u0 + u1))
        : (Math.exp(c + a * u1) - Math.exp(c + a * u0)) / a;
  const above = (a, b) => seg(-y0 / sA, -d / sA - 1 / F, a, b),
    below = (a, b) => seg(y0 / sB, d / sB - 1 / F, a, b);
  if (!(t1 > t0)) return 0;
  const first = y0 + d * t0 >= 0,
    tc = -y0 / d;
  if (!(tc > t0 && tc < t1)) return first ? above(t0, t1) : below(t0, t1);
  return first ? above(t0, tc) + below(tc, t1) : below(t0, tc) + above(tc, t1);
}
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
function hash(seed, i) {
  let h =
    (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
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
