import { familyEffect } from "./family-rhythm.mjs";
import { hourClockGlsl } from "./scene-time.mjs";

// Wallpaper Groups (#76): all 17 plane symmetry groups, made with Frank
// Farris' wave-function method. A lattice-periodic complex function
// f(X, Y) = Σ a_j·exp(2πi(n_j X + m_j Y)) (X, Y in lattice coordinates)
// is averaged over the group's operations (X → A·X + t, from the
// International Tables), F = Σ_k f(A_k X + t_k). The result has exactly
// that symmetry: mirrors, glides, 2-, 3-, 4- and 6-fold centres.
//
// Rework 2026-10-14 (look audit #2): Re(F·e^{-iθ}) is an embossed relief seen by a
// slowly tilting, gliding camera. Only the crests catch the key and rim
// light; the ground stays near black. Mirror axes (solid), glide axes
// (dashed, dash = glide length) and rotation centres (the Tables' 2-, 3-,
// 4- and 6-gon symbols) are drawn as thin accent marks on the relief. Every
// rotation centre is a critical point of F, so it sits on a peak, in a pit
// or on a saddle. One unit cell of F and its gradient is precomputed per
// frame (the field is lattice-periodic) and the relief is ray-marched from it.
//
// The coefficients turn slowly and re-roll every 16 beats with a smooth
// crossfade, so the pattern keeps changing while the symmetry never
// breaks.


// Fractional-coordinate operations [a11, a12, a21, a22, t1, t2].
const I = [1, 0, 0, 1, 0, 0];
const op = (a11, a12, a21, a22, t1 = 0, t2 = 0) => [a11, a12, a21, a22, t1, t2];
const H = 0.5;
const P3 = [I, op(0, -1, 1, -1), op(-1, 1, -1, 0)];
const P4 = [I, op(-1, 0, 0, -1), op(0, -1, 1, 0), op(0, 1, -1, 0)];
const PMM = [I, op(-1, 0, 0, -1), op(-1, 0, 0, 1), op(1, 0, 0, -1)];
const centred = (ops) => [
  ...ops,
  ...ops.map(([a, b, c, d, t1, t2]) => [a, b, c, d, t1 + H, t2 + H]),
];
const P6 = [...P3, op(-1, 0, 0, -1), op(0, 1, -1, 1), op(1, -1, 1, 0)];

// lattice: 0 oblique, 1 rectangular, 2 centred rectangular, 3 square, 4 hexagonal
export const GROUPS = [
  { name: "p1", lattice: 0, ops: [I] },
  { name: "p2", lattice: 0, ops: [I, op(-1, 0, 0, -1)] },
  { name: "pm", lattice: 1, ops: [I, op(-1, 0, 0, 1)] },
  { name: "pg", lattice: 1, ops: [I, op(-1, 0, 0, 1, 0, H)] },
  { name: "cm", lattice: 2, ops: centred([I, op(-1, 0, 0, 1)]) },
  { name: "pmm", lattice: 1, ops: PMM },
  {
    name: "pmg",
    lattice: 1,
    ops: [I, op(-1, 0, 0, -1), op(-1, 0, 0, 1, H, 0), op(1, 0, 0, -1, H, 0)],
  },
  {
    name: "pgg",
    lattice: 1,
    ops: [I, op(-1, 0, 0, -1), op(-1, 0, 0, 1, H, H), op(1, 0, 0, -1, H, H)],
  },
  { name: "cmm", lattice: 2, ops: centred(PMM) },
  { name: "p4", lattice: 3, ops: P4 },
  {
    name: "p4m",
    lattice: 3,
    ops: [
      ...P4,
      op(-1, 0, 0, 1),
      op(1, 0, 0, -1),
      op(0, 1, 1, 0),
      op(0, -1, -1, 0),
    ],
  },
  {
    name: "p4g",
    lattice: 3,
    ops: [
      ...P4,
      op(-1, 0, 0, 1, H, H),
      op(1, 0, 0, -1, H, H),
      op(0, 1, 1, 0, H, H),
      op(0, -1, -1, 0, H, H),
    ],
  },
  { name: "p3", lattice: 4, ops: P3 },
  {
    name: "p3m1",
    lattice: 4,
    ops: [...P3, op(0, -1, -1, 0), op(-1, 1, 0, 1), op(1, 0, 1, -1)],
  },
  {
    name: "p31m",
    lattice: 4,
    ops: [...P3, op(0, 1, 1, 0), op(1, -1, 0, -1), op(-1, 0, -1, 1)],
  },
  { name: "p6", lattice: 4, ops: P6 },
  {
    name: "p6m",
    lattice: 4,
    ops: [
      ...P6,
      op(0, -1, -1, 0),
      op(-1, 1, 0, 1),
      op(1, 0, 1, -1),
      op(0, 1, 1, 0),
      op(1, -1, 0, -1),
      op(-1, 0, -1, 1),
    ],
  },
];

// Conventional cell bases (Cartesian columns b1, b2).
export const LATTICES = [
  [
    [1, 0],
    [0.35, 0.85],
  ],
  [
    [1, 0],
    [0, 0.65],
  ],
  [
    [1, 0],
    [0, 0.75],
  ],
  [
    [1, 0],
    [0, 1],
  ],
  // Hexagonal: 120° between b1 and b2, as the International Tables use.
  [
    [1, 0],
    [-0.5, Math.sqrt(3) / 2],
  ],
];

// CPU reference: F at Cartesian point p for wave terms [{n, m, re, im}].
export function wallpaper(p, group, terms) {
  const [b1, b2] = LATTICES[group.lattice];
  const det = b1[0] * b2[1] - b2[0] * b1[1];
  const X = (p[0] * b2[1] - b2[0] * p[1]) / det,
    Y = (b1[0] * p[1] - p[0] * b1[1]) / det;
  let re = 0,
    im = 0;
  for (const [a11, a12, a21, a22, t1, t2] of group.ops) {
    const x = a11 * X + a12 * Y + t1,
      y = a21 * X + a22 * Y + t2;
    for (const w of terms) {
      const ph = 2 * Math.PI * (w.n * x + w.m * y);
      re += w.re * Math.cos(ph) - w.im * Math.sin(ph);
      im += w.re * Math.sin(ph) + w.im * Math.cos(ph);
    }
  }
  return [re, im];
}


// Symmetry elements of a group in its conventional cell, from its
// operations: reflection lines (mirror when some coset member fixes the line
// pointwise, otherwise glide, with the glide length modulo the lattice) as
// families {n, c, d} of parallel lines p·n = c + k·d, and rotation centres
// {X (lattice coordinates in [0, 1)²), order}.
export function symmetryElements(group) {
  const EPS = 1e-7;
  const [b1, b2] = LATTICES[group.lattice];
  const B = [b1[0], b2[0], b1[1], b2[1]];
  const det = B[0] * B[3] - B[1] * B[2];
  const Bi = [B[3] / det, -B[1] / det, -B[2] / det, B[0] / det];
  const mul = (P, Q) => [
    P[0] * Q[0] + P[1] * Q[2],
    P[0] * Q[1] + P[1] * Q[3],
    P[2] * Q[0] + P[3] * Q[2],
    P[2] * Q[1] + P[3] * Q[3],
  ];
  const app = (M, v) => [M[0] * v[0] + M[1] * v[1], M[2] * v[0] + M[3] * v[1]];
  const lattice = [];
  for (let x = -6; x <= 6; x++)
    for (let y = -6; y <= 6; y++) if (x || y) lattice.push(app(B, [x, y]));
  const lines = new Map(),
    centres = new Map();
  for (const [a11, a12, a21, a22, t1, t2] of group.ops) {
    const R = mul(mul(B, [a11, a12, a21, a22]), Bi);
    const reflection = a11 * a22 - a12 * a21 < 0;
    const identity =
      !reflection && Math.abs(R[0] - 1) < 1e-9 && Math.abs(R[2]) < 1e-9;
    if (identity) continue;
    for (let i = -3; i <= 3; i++)
      for (let j = -3; j <= 3; j++) {
        const tau = app(B, [t1 + i, t2 + j]);
        if (reflection) {
          let u = [R[0] + 1, R[2]];
          if (Math.hypot(...u) < 1e-6) u = [R[1], R[3] + 1];
          let n = [-u[1], u[0]].map((v) => v / Math.hypot(...u));
          if (n[0] < -EPS || (Math.abs(n[0]) < EPS && n[1] < 0))
            n = [-n[0], -n[1]];
          u = [n[1], -n[0]];
          let d = Infinity,
            period = Infinity;
          for (const L of lattice) {
            const s = L[0] * n[0] + L[1] * n[1];
            if (s > EPS) d = Math.min(d, s);
            if (Math.abs(s) < EPS)
              period = Math.min(period, Math.abs(L[0] * u[0] + L[1] * u[1]));
          }
          const tn = tau[0] * n[0] + tau[1] * n[1];
          let c = (((tn / 2) % d) + d) % d;
          if (d - c < 1e-6) c = 0;
          let glide = (((tau[0] * u[0] + tau[1] * u[1]) % period) + period) % period;
          glide = Math.min(glide, period - glide);
          if (glide < 1e-6) glide = 0;
          const key = [...n, c].map((v) => v.toFixed(5)).join();
          const prev = lines.get(key);
          if (!prev || glide < prev.glide)
            lines.set(key, { n, u, c, d, glide, period });
        } else {
          // Fixed point of p → R·p + τ.
          const M = [1 - R[0], -R[1], -R[2], 1 - R[3]];
          const dm = M[0] * M[3] - M[1] * M[2];
          const p = [
            (M[3] * tau[0] - M[1] * tau[1]) / dm,
            (-M[2] * tau[0] + M[0] * tau[1]) / dm,
          ];
          const X = app(Bi, p).map((v) => {
            const f = ((v % 1) + 1) % 1;
            return f > 1 - 1e-6 || f < 1e-9 ? 0 : f;
          });
          const order = Math.round(
            (2 * Math.PI) / Math.abs(Math.atan2(R[2], R[0])),
          );
          const key = X.map((v) => v.toFixed(5)).join();
          const prev = centres.get(key)?.order ?? 0;
          centres.set(key, { X, order: Math.max(order, prev) });
        }
      }
  }
  return { lines: [...lines.values()], centres: [...centres.values()] };
}
export const SYMMETRY = GROUPS.map(symmetryElements);

const OPS = GROUPS.flatMap((g) => g.ops);
const starts = [];
GROUPS.reduce((n, g) => (starts.push(n), n + g.ops.length), 0);
const glslOpsA = OPS.map(
  ([a, b, c, d]) => `mat2(${a}.0, ${c}.0, ${b}.0, ${d}.0)`,
).join(", ");
const glslOpsT = OPS.map(
  ([, , , , t1, t2]) => `vec2(${t1.toFixed(1)}, ${t2.toFixed(1)})`,
).join(", ");
const glslLattice = LATTICES.map(
  ([b1, b2]) => `mat2(${b1[0]}, ${b1[1]}, ${b2[0]}, ${b2[1].toFixed(7)})`,
).join(", ");
const f7 = (v) => v.toFixed(7);
const LINES = SYMMETRY.flatMap((s) => s.lines);
const CENTRES = SYMMETRY.flatMap((s) => s.centres);
const offsets = (key) => {
  const out = [];
  SYMMETRY.reduce((n, s) => (out.push(n), n + s[key].length), 0);
  return out;
};
const MAX_TERMS = 8;
// One unit cell of F and the gradient of |F|²/2, per frame.
const CELL = 512;

const shared = `${hourClockGlsl}
const mat2 OPS_A[${OPS.length}] = mat2[](${glslOpsA});
const vec2 OPS_T[${OPS.length}] = vec2[](${glslOpsT});
const int GROUP_START[${GROUPS.length}] = int[](${starts.join(", ")});
const int GROUP_COUNT[${GROUPS.length}] = int[](${GROUPS.map((g) => g.ops.length).join(", ")});
const int GROUP_LATTICE[${GROUPS.length}] = int[](${GROUPS.map((g) => g.lattice).join(", ")});
const mat2 LATTICE[${LATTICES.length}] = mat2[](${glslLattice});
float wRand(uint a, uint b) { return float(cellHash(uvec3(a, b, 71u)) >> 8u) / 16777216.; }
// Wave term j of generation g: integer frequencies and a complex weight.
// On a centred lattice the (½, ½) translation cancels every term with n + m
// odd, so those are moved to the nearest even sum.
void wTerm(int j, uint g, bool centred, out vec2 nm, out vec2 w) {
  nm = floor(vec2(wRand(g, uint(j) * 4u), wRand(g, uint(j) * 4u + 1u)) * 5.) - 2.;
  if (centred && mod(nm.x + nm.y, 2.) > .5) nm.y += nm.y < 1.5 ? 1. : -1.;
  if (nm == vec2(0.)) nm = centred ? vec2(1., 1.) : vec2(1., 0.);
  float r = 1. / (.6 + length(nm));
  float a = TAU * wRand(g, uint(j) * 4u + 2u);
  w = r * vec2(cos(a), sin(a));
}
struct Wall { int group; int terms; uint g0; uint g1; float mixG; float t; float ft; float beats; float tilt; };
Wall wallSetup() {
  Wall s;
  s.group = clamp(int(floor(u_params[0] + .5)), 0, ${GROUPS.length - 1});
  s.terms = clamp(int(floor(u_params[3] + .5)), 2, ${MAX_TERMS});
  s.t = u_time;
  // Term phases turn with t · flow: clock 0, modulo 40π (every term speed
  // .4 + .25j is a multiple of .05).
  s.ft = hourClock(s.t * u_params[2], 0);
  s.beats = u_beat > 0. ? u_beat : s.t * 2.;
  // Two generations of coefficients crossfade every 16 beats (morph).
  float era = u_rhythmEnabled ? u_rhythmCount.z : s.beats / 16. * (.25 + .75 * u_params[4]);
  s.g0 = uint(max(floor(era) - (u_rhythmEnabled ? 1. : 0.), 0.));
  s.g1 = uint(floor(era)) + (u_rhythmEnabled ? 0u : 1u);
  s.mixG = u_rhythmEnabled ? smoothstep(0., 1., 1. - min(u_rhythm.z * 1.5, 1.)) : smoothstep(0., 1., fract(era));
  // The relief is Re(F·e^{-iθ}); θ turns once in 90 s, so crests and
  // valleys slowly trade places (any such θ keeps the symmetry).
  s.tilt = TAU * fract(s.t / 90.);
  return s;
}
// Weighted wave term j of both generations at time t.
void wTerms(int j, Wall s, out vec2 nm0, out vec2 w0, out vec2 nm1, out vec2 w1) {
  bool centred = GROUP_LATTICE[s.group] == 2;
  wTerm(j, s.g0, centred, nm0, w0);
  wTerm(j, s.g1, centred, nm1, w1);
  // Each term's phase turns with its own speed.
  float spinJ = s.ft * (.4 + .25 * float(j)) * (mod(float(j), 2.) < .5 ? 1. : -1.);
  w0 = rot2(spinJ) * w0 * (1. - s.mixG);
  w1 = rot2(spinJ) * w1 * s.mixG;
}
// At lattice point X: (R, I, ∂R/∂X, ∂R/∂Y) with R + iI = F·e^{-iθ}.
vec4 wallField(vec2 X, Wall s) {
  vec2 F = vec2(0.), Fx = vec2(0.), Fy = vec2(0.);
  int start = GROUP_START[s.group], count = GROUP_COUNT[s.group];
  for (int j = 0; j < ${MAX_TERMS}; j++) {
    if (j >= s.terms) break;
    vec2 nm0, w0, nm1, w1;
    wTerms(j, s, nm0, w0, nm1, w1);
    for (int k = 0; k < 12; k++) {
      if (k >= count) break;
      mat2 A = OPS_A[start + k];
      vec2 Y = A * X + OPS_T[start + k];
      float a0 = TAU * dot(nm0, Y), a1 = TAU * dot(nm1, Y);
      vec2 e0 = vec2(w0.x * cos(a0) - w0.y * sin(a0), w0.x * sin(a0) + w0.y * cos(a0));
      vec2 e1 = vec2(w1.x * cos(a1) - w1.y * sin(a1), w1.x * sin(a1) + w1.y * cos(a1));
      // d/dX exp(2πi nm·(A X + t)) = 2πi (Aᵀ nm) exp(…).
      vec2 k0 = TAU * (nm0 * A), k1 = TAU * (nm1 * A);
      F += e0 + e1;
      Fx += k0.x * vec2(-e0.y, e0.x) + k1.x * vec2(-e1.y, e1.x);
      Fy += k0.y * vec2(-e0.y, e0.x) + k1.y * vec2(-e1.y, e1.x);
    }
  }
  float norm = inversesqrt(float(count * s.terms));
  mat2 turn = rot2(-s.tilt);
  return vec4(turn * F, (turn * Fx).x, (turn * Fy).x) * norm;
}
// Cell means of |F|² and F², exactly (Parseval): F = Σ_κ c_κ e^{2πiκ·X}
// with κ = Aᵀ·nm over all terms and operations, so mean |F|² = Σ|c_κ|² and
// mean F² = Σ c_κ·c_{−κ}. Then mean (Re F·e^{-iθ})² = (|F|² + Re(F² e^{-2iθ}))/2.
vec4 wallEnergy(Wall s) {
  // κ = Aᵀ·nm has integer components in [−4, 4]: one bucket per frequency.
  vec2 acc[81];
  for (int i = 0; i < 81; i++) acc[i] = vec2(0.);
  int start = GROUP_START[s.group], count = GROUP_COUNT[s.group];
  for (int j = 0; j < ${MAX_TERMS}; j++) {
    if (j >= s.terms) break;
    vec2 nm0, w0, nm1, w1;
    wTerms(j, s, nm0, w0, nm1, w1);
    for (int k = 0; k < 12; k++) {
      if (k >= count) break;
      mat2 A = OPS_A[start + k];
      vec2 T = OPS_T[start + k];
      ivec2 b0 = ivec2(nm0 * A + 4.5), b1 = ivec2(nm1 * A + 4.5);
      acc[b0.x + 9 * b0.y] += rot2(TAU * dot(nm0, T)) * w0;
      acc[b1.x + 9 * b1.y] += rot2(TAU * dot(nm1, T)) * w1;
    }
  }
  // Bucket 80 − i holds −κ.
  float e = 0.;
  vec2 sq2 = vec2(0.);
  for (int i = 0; i < 81; i++) {
    vec2 c = acc[i], cm = acc[80 - i];
    e += dot(c, c);
    sq2 += vec2(c.x * cm.x - c.y * cm.y, c.x * cm.y + c.y * cm.x);
  }
  return vec4(e, sq2, 0.) / float(count * s.terms);
}
`;

const precompute = `${shared}
void main() {
  Wall s = wallSetup();
  // Rows 0…N−1 hold one unit cell; row N holds the cell's mean |F|².
  outColor = gl_FragCoord.y > ${CELL}. ? wallEnergy(s) : wallField(floor(gl_FragCoord.xy) / ${CELL}., s);
}
`;

const fragment = `${shared}
const vec4 AXES[${LINES.length}] = vec4[](${LINES.map((l) => `vec4(${f7(l.n[0])}, ${f7(l.n[1])}, ${f7(l.c)}, ${f7(l.d)})`).join(", ")});
const float AXIS_GLIDE[${LINES.length}] = float[](${LINES.map((l) => f7(l.glide)).join(", ")});
const int AXIS_START[${GROUPS.length}] = int[](${offsets("lines").join(", ")});
const int AXIS_COUNT[${GROUPS.length}] = int[](${SYMMETRY.map((s) => s.lines.length).join(", ")});
const vec3 CENTRES[${CENTRES.length}] = vec3[](${CENTRES.map((c) => `vec3(${f7(c.X[0])}, ${f7(c.X[1])}, ${c.order}.)`).join(", ")});
const int CENTRE_START[${GROUPS.length}] = int[](${offsets("centres").join(", ")});
const int CENTRE_COUNT[${GROUPS.length}] = int[](${SYMMETRY.map((s) => s.centres.length).join(", ")});
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
// Periodic bilinear lookup in the precomputed unit cell (texel i at X = i/N).
vec4 cellField(vec2 X, Wall s) {
  vec2 g = fract(X) * ${CELL}.;
  ivec2 i0 = ivec2(floor(g)) % ${CELL}, i1 = (i0 + 1) % ${CELL};
  vec2 f = fract(g);
  return mix(mix(texelFetch(u_precomputed, i0, 0), texelFetch(u_precomputed, ivec2(i1.x, i0.y), 0), f.x),
             mix(texelFetch(u_precomputed, ivec2(i0.x, i1.y), 0), texelFetch(u_precomputed, i1, 0), f.x), f.y);
}
// Mean of R² = (Re F·e^{-iθ})² from the statistics row.
float cellEnergy(Wall s) {
  vec4 m = texelFetch(u_precomputed, ivec2(0, ${CELL}), 0);
  return .5 * (m.x + dot(m.yz, vec2(cos(2. * s.tilt), sin(2. * s.tilt))));
}
#else
vec4 cellField(vec2 X, Wall s) { return wallField(X, s); }
// Without the data pass: Σ|w|² per term, ignoring coinciding frequencies.
float cellEnergy(Wall s) {
  float e = 0.;
  for (int j = 0; j < ${MAX_TERMS}; j++) {
    if (j >= s.terms) break;
    vec2 nm0, w0, nm1, w1;
    wTerms(j, s, nm0, w0, nm1, w1);
    e += dot(w0 + w1, w0 + w1);
  }
  return .5 * e / float(s.terms);
}
#endif
// Height: Re(F·e^{-iθ}) in units of its RMS, softly limited to (0, 1).
float RELIEF_K;
float reliefHeight(vec4 f) { return .5 + .5 * tanh(f.x * RELIEF_K); }

void main() {
  Wall s = wallSetup();
  float scale = u_params[1];
  float rings = u_params[5];
  float cell = u_params[6];
  float spin = u_params[7];
  float t = s.t, beats = s.beats;
  float lvl = clamp(u_level, 0., 1.);
  float beatPulse = u_rhythmEnabled ? 0. : u_beat > 0. ? exp(-5. * fract(u_beat)) : 0.;
  mat2 B = LATTICE[GROUP_LATTICE[s.group]];
  mat2 Bi = inverse(B);
  vec2 uv = aspectUV();
  float px = u_resolution.y / 1080.;

  // Camera: a slow glide across the periodic plane (lattice-periodic, so the
  // wrap is invisible), a turn, and a tilt that breathes over 2 minutes and
  // leans further with energy.
  vec2 focus = B * fract(vec2(t * .02, t * .0125));
  // Camera turn t · spin: clock 1, modulo 2π / .03.
  float yaw = hourClock(t * spin, 1) * .03 + .3 * sin(TAU * fract(t / 180.));
  float pitch = .44 + .16 * lvl + .09 * sin(TAU * fract(t / 120.));
  vec2 heading = vec2(sin(yaw), cos(yaw));
  vec3 forward = vec3(heading * sin(pitch), -cos(pitch));
  vec3 right = vec3(heading.y, -heading.x, 0.);
  vec3 up = cross(right, forward);
  float lens = 1.6 * (1. + .02 * clamp(u_kick, 0., 1.));
  float dist = scale * lens * .78;
  vec3 ro = vec3(focus, 0.) - forward * dist;
  vec3 rd = normalize(uv.x * right + uv.y * up + lens * forward);

  // Relief: height Re(F·e^{-iθ}), up to a fraction of the cell. Energy
  // raises it (deeper pits, taller crests).
  float amp = mix(.13, .24, lvl);
  // R in units of its RMS (one RMS reaches tanh(0.6) ≈ 0.54).
  RELIEF_K = .6 / sqrt(max(cellEnergy(s), 1e-6));
  float tTop = (amp - ro.z) / rd.z, tGround = -ro.z / rd.z;
  vec3 hit;
#ifdef PRECOMPUTED
  float tm = tTop, dt = (tGround - tTop) / 10.;
  hit = ro + rd * tGround;
  float prev = tTop;
  for (int i = 0; i < 11; i++) {
    vec3 q = ro + rd * tm;
    if (q.z <= amp * reliefHeight(cellField(Bi * q.xy, s))) {
      float a = prev, b = tm;
      for (int k = 0; k < 4; k++) {
        float m = .5 * (a + b);
        vec3 r = ro + rd * m;
        if (r.z <= amp * reliefHeight(cellField(Bi * r.xy, s))) b = m; else a = m;
      }
      hit = ro + rd * b;
      break;
    }
    prev = tm;
    tm += dt;
  }
#else
  hit = ro + rd * mix(tTop, tGround, .5);
#endif
  vec2 P = hit.xy;
  vec2 X = Bi * P;
  vec4 f = cellField(X, s);
  float q = dot(f.xy, f.xy);
  float th = tanh(f.x * RELIEF_K);
  float h = .5 + .5 * th;
  vec2 gradP = transpose(Bi) * (f.zw * .5 * RELIEF_K * (1. - th * th));
  vec3 normal = normalize(vec3(-amp * gradP, 1.));
  vec3 view = -rd;

  // Light: key from the upper left, a specular sheen, a rim on the crests.
  vec3 key = normalize(vec3(-.7 * right.xy - .25 * heading, .62));
  float diffuse = max(0., dot(normal, key));
  float spec = pow(max(0., dot(normal, normalize(key + view))), 28.);
  float rim = pow(1. - max(0., dot(normal, view)), 3.);
  float crest = smoothstep(.42, .9, h);
  float ao = .2 + .8 * smoothstep(.05, .7, h);
  vec3 albedo = mix(u_secondary, u_primary, smoothstep(.68, .98, h));
  vec3 colour = albedo * (.03 + .97 * diffuse * diffuse) * crest * ao;
  colour += mix(u_primary, vec3(1.), .45) * spec * crest * .9;
  colour += mix(mix(u_secondary, u_primary, .5), u_accent, .3) * rim * crest * (.42 + .25 * beatPulse);
  colour += u_secondary * .012 * ao;
  // A steeper, denser relief catches more rim and sheen; hold the exposure
  // so energy reads as structure, not brightness (measured on the ladder).
  colour /= .9 + .16 * lvl;

  // Terraces: level lines of the relief that climb the crests on the beat.
  float level = h * (4. + 3. * lvl) - beats * .125;
  float lw = max(fwidth(level), 1e-4);
  float terrace = 1. - smoothstep(.4, 1.3, abs(fract(level) - .5) / lw);
  colour += mix(u_primary, vec3(1.), .3) * terrace * rings * crest * .22;

  // Rhythm: equal-phase orbits and one relief band light up.
  float phase = atan(f.y, f.x) / TAU;
  float orbitCohort = pow(max(0., cos(phase * TAU - u_rhythmCount.x * 1.04719755)), 10.);
  colour += albedo * orbitCohort * crest * u_rhythm.x * .7;
  float band = exp(-sq((fract(.5 * log2(max(q, 1e-8) * RELIEF_K * RELIEF_K)) - mod(u_rhythmCount.y, 4.) * .25) / .06));
  colour += u_accent * band * crest * u_rhythm.y * .45;

  // Symmetry elements in thin accent. Mirror axes (solid) and glide axes
  // (dashed, dash = glide length) run straight across the floor between the
  // crests; rotation centres carry the Tables' lens, triangle, square and
  // hexagon on the relief itself. They light up for ~10 of every 32 beats.
  vec2 G = (ro + rd * tGround).xy;
  float pxFloor = .5 * (length(dFdx(G)) + length(dFdy(G)));
  float pxPlane = .5 * (length(dFdx(P)) + length(dFdy(P)));
  float halfWidth = .75 * px;
  float far = 1. - smoothstep(.012, .03, pxFloor * px);
  float phrase = fract(beats / 32.);
  float breathe = .25 + .75 * smoothstep(0., .08, phrase) * (1. - smoothstep(.25, .45, phrase));
  float show = clamp(cell * 4., 0., 1.) * breathe * far;
  float valley = 1. - smoothstep(.3, .55, h);
  float marks = 0.;
  if (show > .001) {
    int a0 = AXIS_START[s.group], an = AXIS_COUNT[s.group];
    for (int i = 0; i < 12; i++) {
      if (i >= an) break;
      vec4 ax = AXES[a0 + i];
      float sd = dot(G, ax.xy) - ax.z;
      float dl = abs(fract(sd / ax.w + .5) - .5) * ax.w / max(pxFloor, 1e-6);
      float m = clamp(halfWidth + .5 - dl, 0., 1.) * valley * .7;
      float glide = AXIS_GLIDE[a0 + i];
      if (glide > 0.) {
        float along = dot(G, vec2(ax.y, -ax.x)) / (2. * glide);
        float e = pxFloor / (2. * glide) + 1e-4;
        m *= smoothstep(.25 - e, .25 + e, abs(fract(along) - .5));
      }
      marks = max(marks, m);
    }
    int c0 = CENTRE_START[s.group], cn = CENTRE_COUNT[s.group];
    for (int i = 0; i < 8; i++) {
      if (i >= cn) break;
      vec3 c = CENTRES[c0 + i];
      vec2 v = B * (fract(X - c.xy + .5) - .5) / max(pxPlane, 1e-6);
      float n = c.z;
      float r = (2.6 + .45 * n) * px;
      float d;
      if (n < 2.5) d = (length(v / vec2(r, .45 * r)) - 1.) * .45 * r;
      else {
        float sector = TAU / n;
        float a = atan(v.y, v.x) + PI / 2.;
        d = cos(floor(.5 + a / sector) * sector - a) * length(v) - r * cos(PI / n);
      }
      marks = max(marks, clamp(.5 - d, 0., 1.));
    }
  }
  colour = mix(colour, mix(u_accent, vec3(1.), .2) * .95, marks * show);

  // Atmosphere: the far plane sinks into the palette's dark.
  float travel = length(hit - ro);
  float fog = smoothstep(dist * 1.05, dist * 2.5, travel);
  colour = mix(colour, u_secondary * .006, fog * .94);
  outColor = vec4(max(colour, 0.), 1.);
}
`;

const schema = [
  {
    key: "group",
    label:
      "Group · p1 p2 pm pg cm pmm pmg pgg cmm p4 p4m p4g p3 p3m1 p31m p6 p6m",
    min: 0,
    max: GROUPS.length - 1,
    step: 1,
    default: 16,
  },
  {
    key: "scale",
    label: "Cells across",
    min: 1.2,
    max: 10,
    step: 0.05,
    default: 3.5,
  },
  {
    key: "flow",
    label: "Phase flow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
  {
    key: "terms",
    label: "Wave terms",
    min: 2,
    max: MAX_TERMS,
    step: 1,
    default: 5,
  },
  {
    key: "morph",
    label: "Re-roll speed (per 16 beats)",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "rings",
    label: "Relief terraces",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "cell",
    label: "Symmetry axes and centres",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.15,
  },
  { key: "spin", label: "Turn", min: -1, max: 1, step: 0.01, default: 0.1 },
];

const look = (
  name,
  seed,
  group,
  scale,
  flow,
  terms,
  morph,
  rings,
  cell,
  spin,
) => ({
  name,
  seed,
  params: { group, scale, flow, terms, morph, rings, cell, spin },
});

const presets = [
  look("p6m Snowflake", 7601, 16, 2.08, 0.3, 5, 0.5, 0.5, 0.1, 0.1),
  look("p4m Tiles", 7602, 10, 2.27, 0.3, 5, 0.5, 0.6, 0.15, 0),
  look("p4g Pinwheels", 7603, 11, 1.95, 0.35, 6, 0.5, 0.4, 0.1, 0.15),
  look("p3 Triskelion", 7604, 12, 2.27, 0.4, 5, 0.6, 0.45, 0.15, -0.1),
  look("p31m Lace", 7605, 14, 2.6, 0.3, 6, 0.5, 0.55, 0.1, 0.05),
  look("p3m1 Kaleidoscope", 7606, 13, 1.69, 0.3, 4, 0.4, 0.5, 0, 0.2),
  look("p6 Spirals", 7607, 15, 1.95, 0.45, 6, 0.6, 0.4, 0.1, -0.15),
  look("p4 Turnstiles", 7608, 9, 2.27, 0.4, 5, 0.5, 0.5, 0.2, 0.1),
  look("cmm Diamonds", 7609, 8, 2.27, 0.3, 5, 0.5, 0.55, 0.15, 0),
  look("pgg Weave", 7610, 7, 2.27, 0.35, 6, 0.5, 0.45, 0.2, 0.05),
  look("pmg Ribbons", 7611, 6, 2.6, 0.3, 5, 0.5, 0.5, 0.15, 0),
  look("pmm Panels", 7612, 5, 2.6, 0.25, 4, 0.4, 0.6, 0.25, 0),
  look("cm Feathers", 7613, 4, 2.27, 0.35, 6, 0.5, 0.4, 0.1, 0.1),
  look("pg Footprints", 7614, 3, 2.6, 0.4, 5, 0.5, 0.45, 0.2, -0.05),
  look("pm Mirrors", 7615, 2, 2.6, 0.3, 5, 0.5, 0.5, 0.2, 0),
  look("p2 Pinwheel Field", 7616, 1, 2.27, 0.4, 6, 0.6, 0.45, 0.15, 0.1),
  look("p1 Drift", 7617, 0, 1.95, 0.4, 7, 0.7, 0.4, 0.2, 0.05),
];

export default {
  rhythm: [
    familyEffect("symmetry-orbit", 0, "Symmetry-orbit light", "Select equal phase values of the group-symmetrised Fourier field."),
    familyEffect("modulus-ring", 1, "Modulus-ring light", "Independently accent a logarithmic modulus band of the same symmetric field.", { period: 3, strength: 0.5 }),
    familyEffect("coefficient-generation", 2, "Symmetric coefficient change", "Crossfade coefficient generations with the chosen wallpaper group operations intact.", { period: 16, strength: 0.65, duration: 2, kind: "motion" }),
  ],
  id: "wallpaper",
  number: 76,
  name: "Wallpaper Groups",
  description:
    "All 17 plane symmetry groups, made with Farris' wave-function method: a lattice-periodic complex function averaged over the group's mirrors, glides and rotations, so the pattern has exactly that symmetry. Its real part, slowly turning in phase, is an embossed relief under a slowly tilting camera: only the crests catch the light, the ground stays dark. Thin accent marks show the mirror axes (solid), glide axes (dashed) and rotation centres (lens, triangle, square, hexagon), each a peak, pit or saddle of F. The waves turn continuously; scheduled coefficient changes preserve the exact symmetry, with separate phase-orbit and modulus-band light tracks.",
  energy: {
    flow: { mul: [0.5, 2] },
    morph: [-0.2, 0.3],
    rings: [-0.1, 0.2],
    scale: { mul: [0.85, 1.2] },
  },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "flow", feature: "low", amount: 0.06 },
    { param: "rings", feature: "high", amount: 0.1 },
    { param: "spin", feature: "onset", amount: 0.05 },
  ],
  stage: ["flow", "morph", "rings"],
  type: { key: "group", values: GROUPS.map((_, i) => i) },
  schema,
  presets,
  fragment,
  precompute: { fragment: precompute, size: [CELL, CELL + 1] },
  clocks: [
    { rate: (p) => p[2], period: 40 * Math.PI },
    { rate: (p) => p[7], period: (2 * Math.PI) / 0.03 },
  ],
};
