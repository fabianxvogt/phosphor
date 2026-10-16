// Attractor Ribbons: CPU references and shared GLSL tables. Each ribbon is
// the recent history of one trajectory, integrated on the GPU at the same
// time in three flows (Lorenz, Aizawa, Thomas). Development blends the
// positions of the same ribbon between two of its three trajectories; the
// integration itself never depends on development, so the morph is
// continuous and reversible. The flows, step sizes, boxes and view frames
// come from the Strange Attractors family (scene-attractor.mjs) and its
// tested CPU reference.
import { SYSTEMS, flow, rk4 } from "./scene-attractor.mjs";

export const RIBBONS = 192; // trajectories per flow
export const HISTORY = 224; // samples kept per trajectory (state columns)
export const SEGMENTS = 224; // smooth Hermite-resampled strips; exact history retained
export const PER_RIBBON = SEGMENTS * 6;
export const SUBSTEPS = 2; // RK4 steps per history sample
export const ROWS = RIBBONS * 6 + 1; // 2 texels × 3 flows per ribbon + globals
export const SAMPLES_PER_SECOND = 30; // history samples per second at flow 1
// Lorenz, Aizawa, Thomas: [index in SYSTEMS, RK4 step h]. One history
// sample advances system time by SUBSTEPS · h.
export const FLOWS = [
  { system: 0, h: 0.005, k: [10, 28, 8 / 3, 0] },
  { system: 2, h: 0.015, k: [0.986, 0, 0, 0] },
  // Thomas at b = 0.09, inside its chaotic labyrinth regime (λ ≈ 0.09;
  // b = 0.1914, the Strange Attractors setting, is a compact knot), so it
  // needs its own box and scale.
  {
    system: 3,
    h: 0.08,
    k: [0.09, 0, 0, 0],
    lo: [-11, -11, -11],
    hi: [11, 11, 11],
    scale: 1 / 7,
    vref: 1.6,
    init: { center: [0, 0, 0], radius: 5, h: 0.4, steps: 96 },
  },
].map((f) => ({ ...SYSTEMS[f.system], ...f }));

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Development → (first flow, weight of the next): 0 Lorenz, 1 Aizawa, 2 Thomas.
export function blend(development) {
  const d = Math.min(2, Math.max(0, development));
  const a = Math.min(1, Math.floor(d));
  return { a, w: smoothstep(0, 1, d - a) };
}
// Development reveals more of the same ranked trajectories; low energy
// leaves breathing room between the broad hero bands.
export const shown = (development, level = 1) =>
  (0.42 +
    0.26 * smoothstep(0.1, 1, development) +
    0.2 * smoothstep(1.1, 2, development)) *
  (0.65 + 0.35 * level);
// A ribbon of rank ρ ∈ [0, 1) appears over a band of 0.06 as `shown` passes it.
export const presence = (rank, development, level = 1) =>
  smoothstep(
    rank,
    rank + 0.06,
    shown(development, level) + 0.06 * (1 - rank) - 0.0001,
  );

// System coordinates → the canonical view frame (Y up, radius ≈ 1).
export function canonical(f, p) {
  const d = p.map((v, i) => v - f.center[i]);
  return f.frame.map(
    (row) => f.scale * (row[0] * d[0] + row[1] * d[1] + row[2] * d[2]),
  );
}
// 16-bit fraction of the system's box, as the state texture stores it.
export function quantize(f, p) {
  return p.map((v, i) => {
    const n = Math.round(
      Math.min(1, Math.max(0, (v - f.lo[i]) / (f.hi[i] - f.lo[i]))) * 65535,
    );
    return f.lo[i] + (n / 65535) * (f.hi[i] - f.lo[i]);
  });
}
export const inside = (f, p) => p.every((v, i) => v > f.lo[i] && v < f.hi[i]);
// One history sample, exactly as the simulation pass computes it.
export function sample(f, p) {
  for (let i = 0; i < SUBSTEPS; i++) p = rk4(f.system, p, f.k, f.h);
  return quantize(f, p);
}
export { flow };

// Camera, mirrored by the vertex shader. Phases are fractions of a turn.
// Returns the eye, the look-at target and the focal length.
export function camera(development, params, yawPhase, driftPhase) {
  const mid = smoothstep(0, 1, development),
    peak = smoothstep(1, 2, development);
  // The camera sways around the butterfly's broadest view (yaw ≈ 0.7: both
  // wings open, never edge-on); the sway widens with development.
  const yaw = 0.7 + (0.6 + 0.9 * mid) * Math.sin(2 * Math.PI * yawPhase),
    drift = 2 * Math.PI * driftPhase;
  const dist =
    params.distance *
    (3.0 + (2.9 - 3.0) * mid + (2.65 - 2.9) * peak) *
    (1 + 0.1 * peak * Math.sin(2 * yaw + drift));
  const pitch = Math.min(
    1.3,
    Math.max(
      -0.4,
      0.12 +
        0.2 * mid +
        1.0 * (params.elevation - 0.35) +
        (0.1 + 0.12 * peak) * Math.sin(drift),
    ),
  );
  const eye = [
    dist * Math.cos(pitch) * Math.cos(yaw),
    dist * Math.sin(pitch),
    dist * Math.cos(pitch) * Math.sin(yaw),
  ];
  const target = [
    0.15 * peak * Math.sin(1.3 * yaw + 0.5),
    -0.14 * (1 - mid) - 0.12 * peak + 0.08 * peak * Math.sin(drift),
    0.15 * peak * Math.cos(1.3 * yaw + 0.5),
  ];
  const focal = 2.46 + (2.42 - 2.46) * mid + (2.02 - 2.42) * peak;
  return { eye, target, focal, dist, pitch };
}
// Ribbons thin to nothing near the eye, so a fly-through never fills the lens.
export const NEAR_FADE = [0.15, 0.45];

// CPU reference of the local relay front/wake in scene-ribbons.mjs.
// Age is fixed-tick elapsed time / 0.75 s, not a decaying beat envelope.
export function relayPacket(s, rank, age, strength, count) {
  const selected =
    rank < 0.04 && Math.floor(rank * 192) % 3 === count % 3 ? 1 : 0;
  const d = s - (1.08 - 1.4 * age);
  const hot = Math.exp(-((d / 0.06) ** 2));
  const wake = Math.exp(-Math.max(0, d) * 16) * smoothstep(0, 0.035, d);
  const gain =
    selected *
    strength *
    smoothstep(0, 0.09, age) *
    (1 - smoothstep(0.8, 0.99, age));
  return [hot * gain, wake * gain];
}

// ---- GLSL ---------------------------------------------------------------
const g = (x) => {
  const s = String(+x.toPrecision(9));
  return /[.e]/.test(s) ? s : `${s}.0`;
};
const v3 = (a) => `vec3(${a.map(g).join(",")})`;
const mat = (rows) =>
  `mat3(${[0, 1, 2].flatMap((c) => rows.map((r) => g(r[c]))).join(",")})`;
const table = (type, name, values) =>
  `const ${type} ${name}[3] = ${type}[3](${values.join(",")});`;

export const glsl = `
const int RIBBONS = ${RIBBONS}, HISTORY = ${HISTORY}, SEGMENTS = ${SEGMENTS}, PER_RIBBON = ${PER_RIBBON};
const int GLOBAL_ROW = ${RIBBONS * 6};
${table(
  "vec3",
  "RB_LO",
  FLOWS.map((f) => v3(f.lo)),
)}
${table(
  "vec3",
  "RB_HI",
  FLOWS.map((f) => v3(f.hi)),
)}
${table(
  "vec3",
  "RB_CENTER",
  FLOWS.map((f) => v3(f.center)),
)}
${table(
  "float",
  "RB_SCALE",
  FLOWS.map((f) => g(f.scale)),
)}
${table(
  "mat3",
  "RB_FRAME",
  FLOWS.map((f) => mat(f.frame)),
)}
${table(
  "float",
  "RB_H",
  FLOWS.map((f) => g(f.h)),
)}
${table(
  "float",
  "RB_K",
  FLOWS.map((f) => g(f.k[0])),
)}
${table(
  "float",
  "RB_VREF",
  FLOWS.map((f) => g(f.vref * f.scale * SUBSTEPS * f.h)),
)}
${table(
  "vec3",
  "RB_INIT_CENTER",
  FLOWS.map((f) => v3(f.init.center)),
)}
${table(
  "float",
  "RB_INIT_RADIUS",
  FLOWS.map((f) => g(f.init.radius)),
)}
${table(
  "float",
  "RB_INIT_H",
  FLOWS.map((f) => g(f.init.h)),
)}
float rbUnpack16(vec2 b) { return dot(floor(b * 255. + .5), vec2(256., 1.)) / 65535.; }
float rbUnpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
`;
