// Strange Attractors (#65): five chaotic flows and one chaotic map traced by
// 65,535 GPU particles. Every particle is integrated exactly in the
// simulation pass (fixed-step RK4 for flows, one iteration per hop for the
// map); the vertex pass projects it through a slowly orbiting perspective
// camera with depth-cued size and brightness.
//
// State layout (RGBA8, 256 × 512, two texels per particle i = row·256 + col):
//   rows   0–255  x, y  as two 16-bit fractions of the system's box
//   rows 256–511  z, age (16-bit each)
// Both texels of a particle run the same integration from the same inputs
// and keep only their own half, so x, y and z stay consistent. A 16-bit
// fraction of the box resolves ~1/1000 of the attractor's size per axis;
// positions use unbiased stochastic rounding.
// Particle 0 holds global state: a 24-bit camera orbit phase (row 0) and a
// 24-bit step accumulator (row 256). The accumulator turns integration speed
// into a whole number of fixed RK4 steps per tick, so the simulated map is
// the same at every speed (its chaos is verified in tests) and speed changes
// never jump; the vertex pass draws the leftover fraction of a step.
// The engine draws one point per texel: vertices 0–65535 are particles,
// 65536–131071 draw a soft halo for each young cluster's leader only.
//
// Sensitive dependence is the signature: particles live in clusters of 512
// that respawn together as one tight ball (≈2 px) around a random particle
// already on the attractor. The ball rides along as a bright comet, is
// squeezed onto the unstable direction, stretches into a filament and finally
// smears around the whole attractor; its palette colour fades into the
// speed-coloured dust as it goes. Density stays constant because particles
// only ever teleport onto the attractor.

export const SIDE = 256;
export const COUNT = SIDE * SIDE;
export const CLUSTER = 512;
export const MAX_STEPS = 10; // RK4 steps per tick at most
// Morph waves have whole periods in MORPH_PERIOD seconds, so mod() keeps
// u_time small for hours without a seam.
export const MORPH_PERIOD = 2400;
export const MORPH_WAVES = [13, 19];
export const ORBIT_RATE = 1 / 90; // camera turns per second at orbit 1
export const AGE_SECONDS = 80; // age 1.0 = 80 s at speed 1
export const MAP_HOPS = 7; // map iterations per second at speed 1
export const KICK_SURGE = 2.2; // integration speed multiplier added by u_kick

// System tables. h is the fixed RK4 step; rate is system time per second at
// speed 1. Boxes hold the attractor for every reachable morph value with
// margin (tests check it); center/scale/frame map system coordinates to a
// canonical view frame (Y up, radius ≈ 1). camera = [pitch, pitch wobble,
// sway] (sway 0 = full orbit); close = [yaw, pitch] the close-up blends to
// (yaw only for swaying systems) while it dives to focus.
const R2 = Math.SQRT1_2,
  R3 = 1 / Math.sqrt(3),
  R6 = 1 / Math.sqrt(6);
const ZUP = [
  [1, 0, 0],
  [0, 0, 1],
  [0, -1, 0],
];
const DIAGONAL_UP = [
  [R2, -R2, 0],
  [R3, R3, R3],
  [-R6, -R6, 2 * R6],
];
export const SYSTEMS = [
  {
    id: "lorenz",
    // σ, ρ, β: ρ ∈ [27.5, 34], β ∈ [2.34, 2.94]. The Hopf point
    // ρ_H = σ(σ+β+3)/(σ−β−1) stays below 26.3, so C± never turn stable.
    morph: { base: [10, 28, 8 / 3, 0], shift: [0, 2.75, -0.03, 0], w1: [0, 3.25, 0, 0], w2: [0, 0, 0.3, 0] },
    h: 0.005,
    rate: 0.32,
    lo: [-30, -40, -6],
    hi: [30, 40, 66],
    center: [0, 0, 27],
    scale: 1 / 24,
    frame: ZUP,
    vref: 100,
    camera: [0.12, 0.14, 0.85],
    // Looking down the normal of C+'s spiral plane, (−0.84, 0.44, 0.33).
    close: [1.09, 0.34],
    focus: [8.5, 8.5, 27],
    // Near the z-axis (the origin's stable manifold): far from the slowly
    // unwinding foci C±, which would hold particles for minutes.
    init: { center: [1, 1, 15], radius: 4, h: 0.01, steps: 96 },
  },
  {
    id: "rossler",
    // a, b, c: c ∈ [6.07, 6.57], the widest window-free band near the
    // classic 5.7 (windows at 5.98–6.0 and 6.65–6.8; a small coexisting
    // periodic orbit near 5.67 at this step).
    morph: { base: [0.2, 0.2, 6.32, 0], shift: [0, 0, 0, 0], w1: [0, 0, 0.25, 0], w2: [0, 0, 0, 0] },
    h: 0.03,
    rate: 2.2,
    lo: [-14, -15, -2],
    hi: [16, 11, 34],
    center: [1.2, -1.5, 4],
    scale: 1 / 14,
    // z (the fold's height) is drawn at 0.55: the brief, tall excursions
    // would otherwise push the band out of frame.
    frame: [
      [1, 0, 0],
      [0, 0, 0.55],
      [0, -1, 0],
    ],
    vref: 9,
    camera: [0.5, 0.2, 0],
    close: [0, 0.3],
    focus: [9, -3, 8],
    init: { center: [0, 0, 0.2], radius: 8, h: 0.06, steps: 96 },
  },
  {
    id: "aizawa",
    // a ∈ [0.979, 0.993]; b..f fixed at 0.7, 0.6, 3.5, 0.25, 0.1
    morph: { base: [0.986, 0, 0, 0], shift: [0, 0, 0, 0], w1: [0.007, 0, 0, 0], w2: [0, 0, 0, 0] },
    h: 0.015,
    rate: 1,
    lo: [-2.2, -2.2, -1.3],
    hi: [2.2, 2.2, 2.6],
    center: [0, 0, 0.7],
    scale: 1 / 1.45,
    frame: ZUP,
    vref: 2.6,
    camera: [0.25, 0.3, 0],
    close: [0, 0.05],
    focus: [0, 0, 1.2],
    init: { center: [0, 0, 0.5], radius: 0.8, h: 0.03, steps: 96 },
  },
  {
    id: "thomas",
    // b fixed at 0.1914: periodic windows are dense around it (0.1895,
    // 0.19235, 0.1928, 0.1945 at this step), so Thomas does not morph.
    morph: { base: [0.1914, 0, 0, 0], shift: [0, 0, 0, 0], w1: [0, 0, 0, 0], w2: [0, 0, 0, 0] },
    h: 0.08,
    rate: 4,
    lo: [-5.5, -5.5, -5.5],
    hi: [5.5, 5.5, 5.5],
    center: [0, 0, 0],
    scale: 1 / 4.3,
    // Y is the three-fold axis (1,1,1): looking down it shows the rosette.
    frame: DIAGONAL_UP,
    vref: 0.8,
    camera: [1.3, 0.22, 0],
    close: [0, 0.9],
    focus: [0, 0, 0],
    init: { center: [0, 0, 0], radius: 4, h: 0.16, steps: 96 },
  },
  {
    id: "halvorsen",
    // a ∈ [1.380, 1.416] (window at 1.375; periodic above 1.6; escapes < 1.3)
    morph: { base: [1.398, 0, 0, 0], shift: [0, 0, 0, 0], w1: [0.018, 0, 0, 0], w2: [0, 0, 0, 0] },
    h: 0.006,
    rate: 0.38,
    lo: [-16, -16, -16],
    hi: [9, 9, 9],
    center: [-3.5, -3.5, -3.5],
    scale: 1 / 11,
    frame: DIAGONAL_UP,
    vref: 40,
    camera: [1.1, 0.25, 0],
    close: [0, 0.5],
    focus: [-9, 3, -3.5],
    init: { center: [-3.5, -3.5, -3.5], radius: 3, h: 0.01, steps: 96 },
  },
  {
    id: "clifford",
    // a, b, c, d per seed species: see CLIFFORD_SPECIES
    morph: { base: [0, 0, 0, 0], shift: [0, 0, 0, 0], w1: [0, 0, 0, 0], w2: [0, 0, 0, 0] },
    h: 1,
    rate: 1,
    lo: [-3.2, -3.2, -3.2],
    hi: [3.2, 3.2, 3.2],
    center: [0, 0, 0],
    scale: 1 / 2.3,
    // x, y face a camera looking down; z keeps the pre-image x (a delay
    // coordinate), lifted a little so overlapping folds part when tilted.
    frame: [
      [1, 0, 0],
      [0, 0, 0.3],
      [0, -1, 0],
    ],
    vref: 1.6,
    camera: [1.32, 0.14, 0],
    close: [0, 1.4],
    focus: [0, 0, 0],
    init: { center: [0, 0, 0], radius: 1, h: 1, steps: 24 },
  },
];

// Clifford map x' = sin(a y) + c cos(a x), y' = sin(b x) + d cos(b y).
// The look's seed (mod 3) picks a species; morph moves along a line in
// (a,b,c,d) searched to stay chaotic over its whole length: λ > 0.12 from
// five initial conditions every 0.002, amp at 85 % of the safe length
// (periodic windows are dense in this map; tests sample the lines again).
export const CLIFFORD_SPECIES = [
  { k: [-1.4, 1.6, 1.0, 0.7], dir: [0.245, 0.575, -0.188, -0.758], amp: 0.1 },
  { k: [1.5, -1.8, 1.6, 0.9], dir: [-0.638, -0.347, -0.342, 0.596], amp: 0.15 },
  { k: [-1.7, 1.8, -1.9, -0.4], dir: [0.033, 0.615, 0.167, 0.77], amp: 0.066 },
];

// ---- CPU reference (tests) ----------------------------------------------

// Morph waves w ∈ [-1,1]² and depth m ∈ [0,1] → the system's parameters.
export function systemParams(system, m, w, species = 0) {
  const [w1, w2] = w;
  if (system === 5) {
    const s = CLIFFORD_SPECIES[species % CLIFFORD_SPECIES.length];
    return s.k.map((v, i) => v + s.amp * m * w1 * s.dir[i]);
  }
  const { base, shift, w1: a, w2: b } = SYSTEMS[system].morph;
  return base.map((v, i) => v + m * (shift[i] + a[i] * w1 + b[i] * w2));
}

export function flow(system, [x, y, z], k) {
  switch (system) {
    case 0: // Lorenz
      return [k[0] * (y - x), x * (k[1] - z) - y, x * y - k[2] * z];
    case 1: // Rössler
      return [-y - z, x + k[0] * y, k[1] + z * (x - k[2])];
    case 2: {
      // Aizawa: a = k0, b 0.7, c 0.6, d 3.5, e 0.25, f 0.1
      const zb = z - 0.7;
      return [
        zb * x - 3.5 * y,
        3.5 * x + zb * y,
        0.6 + k[0] * z - (z * z * z) / 3 - (x * x + y * y) * (1 + 0.25 * z) +
          0.1 * z * x * x * x,
      ];
    }
    case 3: // Thomas
      return [
        Math.sin(y) - k[0] * x,
        Math.sin(z) - k[0] * y,
        Math.sin(x) - k[0] * z,
      ];
    case 4: {
      // Halvorsen
      const a = k[0];
      return [
        -a * x - 4 * y - 4 * z - y * y,
        -a * y - 4 * z - 4 * x - z * z,
        -a * z - 4 * x - 4 * y - x * x,
      ];
    }
    default:
      throw new RangeError("system 5 is a map");
  }
}

// One Clifford iteration; z keeps the pre-image x (delay coordinate).
export function cliffordMap([x, y], k) {
  return [
    Math.sin(k[0] * y) + k[2] * Math.cos(k[0] * x),
    Math.sin(k[1] * x) + k[3] * Math.cos(k[1] * y),
    x,
  ];
}

export function rk4(system, p, k, h) {
  const add = (a, b, s) => a.map((v, i) => v + s * b[i]);
  const a = flow(system, p, k);
  const b = flow(system, add(p, a, h / 2), k);
  const c = flow(system, add(p, b, h / 2), k);
  const d = flow(system, add(p, c, h), k);
  return p.map((v, i) => v + (h / 6) * (a[i] + 2 * b[i] + 2 * c[i] + d[i]));
}

// The simulated dynamics: one fixed RK4 step (flows) or one iteration (map).
export function step(system, p, k) {
  return system === 5 ? cliffordMap(p, k) : rk4(system, p, k, SYSTEMS[system].h);
}

// RK4 steps per 60 Hz tick (before the accumulator floors it); a kick
// surges the speed, scaled by show energy.
export function stepsPerTick(system, speed, kick = 0, level = 1) {
  const S = SYSTEMS[system];
  const surge = KICK_SURGE * kick * (0.25 + 0.75 * level);
  return (S.rate * Math.max(0, speed) * (1 + surge)) / S.h / 60;
}

// The shader's integer hash and per-cluster lifetime (fraction of the 16-bit
// age range, AGE_SECONDS at speed 1): comets 0 → 56 s, comets 1 → 10 s, ±25 %.
export const LIFE = [0.7, 0.125];
const hash32 = (v) => {
  v = (v ^ (v >>> 16)) >>> 0;
  v = Math.imul(v, 2246822519) >>> 0;
  v = (v ^ (v >>> 13)) >>> 0;
  v = Math.imul(v, 3266489917) >>> 0;
  return (v ^ (v >>> 16)) >>> 0;
};
export const rand = (a, b, seedBits) =>
  (hash32((a ^ hash32((b ^ seedBits) >>> 0)) >>> 0) >>> 8) / 16777216;
export function clusterLife(c, comets, seedBits) {
  const t = Math.min(1, Math.max(0, comets));
  return (LIFE[0] + (LIFE[1] - LIFE[0]) * t) * (0.75 + 0.5 * rand(c, 21, seedBits));
}
// Age gained by one RK4 step (one hop for the map).
export const ageStep = (system) =>
  system === 5
    ? 1 / (MAP_HOPS * AGE_SECONDS)
    : SYSTEMS[system].h / (SYSTEMS[system].rate * AGE_SECONDS);

// 24-bit fraction in three bytes (camera phase, step accumulator).
export function encode24(phase) {
  const n = Math.floor((((phase % 1) + 1) % 1) * 16777216);
  return [Math.floor(n / 65536), Math.floor(n / 256) % 256, n % 256];
}
export const decode24 = ([a, b, c]) => (a * 65536 + b * 256 + c) / 16777216;

// ---- GLSL ---------------------------------------------------------------

const g = (x) => {
  const s = String(+x.toPrecision(9));
  return /[.e]/.test(s) ? s : `${s}.0`;
};
const v2 = (a) => `vec2(${a.map(g).join(",")})`;
const v3 = (a) => `vec3(${a.map(g).join(",")})`;
const v4 = (a) => `vec4(${a.map(g).join(",")})`;
const table = (type, name, values) =>
  `const ${type} ${name}[${values.length}] = ${type}[${values.length}](${values.join(",")});`;
// GLSL matrices are column-major: transpose the row table.
const mat = (rows) =>
  `mat3(${[0, 1, 2].flatMap((c) => rows.map((r) => g(r[c]))).join(",")})`;
const each = (type, name, pick) => table(type, name, SYSTEMS.map(pick));

// Shared by the simulation and the particle vertex shader.
const common = `
#define AT_K ${CLUSTER}
const float AT_TAU = 6.283185307179586;
${each("vec3", "AT_LO", (s) => v3(s.lo))}
${each("vec3", "AT_HI", (s) => v3(s.hi))}
${each("vec3", "AT_CENTER", (s) => v3(s.center))}
${each("float", "AT_SCALE", (s) => g(s.scale))}
${each("mat3", "AT_FRAME", (s) => mat(s.frame))}
${each("float", "AT_RATE", (s) => g(s.rate))}
${each("float", "AT_H", (s) => g(s.h))}
${each("float", "AT_VREF", (s) => g(s.vref))}
${each("vec3", "AT_CAMERA", (s) => v3(s.camera))}
${each("vec2", "AT_CLOSE", (s) => v2(s.close))}
${each("vec3", "AT_FOCUS", (s) => v3(s.focus))}
${each("vec4", "AT_MBASE", (s) => v4(s.morph.base))}
${each("vec4", "AT_MSHIFT", (s) => v4(s.morph.shift))}
${each("vec4", "AT_MW1", (s) => v4(s.morph.w1))}
${each("vec4", "AT_MW2", (s) => v4(s.morph.w2))}
${table("vec4", "AT_SPECIES_K", CLIFFORD_SPECIES.map((s) => v4(s.k)))}
${table("vec4", "AT_SPECIES_DIR", CLIFFORD_SPECIES.map((s) => v4(s.dir.map((d) => d * s.amp))))}
uint atHash(uint v) {
  v ^= v >> 16u; v *= 2246822519u; v ^= v >> 13u; v *= 3266489917u;
  return v ^ (v >> 16u);
}
float atRand(uint a, uint b) {
  return float(atHash(a ^ atHash(b ^ u_seedBits)) >> 8u) / 16777216.0;
}
vec3 atBall(uint a, uint b) {
  vec3 d = vec3(atRand(a, b), atRand(a, b + 1u), atRand(a, b + 2u)) * 2.0 - 1.0;
  return d * inversesqrt(max(dot(d, d), 1e-4)) * pow(atRand(a, b + 3u), 1.0 / 3.0);
}
int atSystem() { return int(clamp(floor(u_params[0] + 0.5), 0.0, 5.0)); }
float atDecode24(vec3 bytes) {
  vec3 b = floor(bytes * 255.0 + 0.5);
  return (b.x * 65536.0 + b.y * 256.0 + b.z) / 16777216.0;
}
// Morph waves: whole periods inside ${MORPH_PERIOD} s, phase-offset by seed.
vec2 atWaves() {
  float t = mod(u_time, ${g(MORPH_PERIOD)}) / ${g(MORPH_PERIOD)};
  return sin(AT_TAU * (vec2(${g(MORPH_WAVES[0])}, ${g(MORPH_WAVES[1])}) * t
                       + vec2(atRand(11u, 0u), atRand(12u, 0u))));
}
vec4 atParams(int s, float m) {
  vec2 w = atWaves();
  m = clamp(m, 0.0, 1.0);
  if (s == 5) {
    int species = int(u_seedBits % ${CLIFFORD_SPECIES.length}u);
    return AT_SPECIES_K[species] + m * w.x * AT_SPECIES_DIR[species];
  }
  return AT_MBASE[s] + m * (AT_MSHIFT[s] + AT_MW1[s] * w.x + AT_MW2[s] * w.y);
}
vec3 atFlow(int s, vec3 p, vec4 k) {
  if (s == 0) return vec3(k.x * (p.y - p.x), p.x * (k.y - p.z) - p.y, p.x * p.y - k.z * p.z);
  if (s == 1) return vec3(-p.y - p.z, p.x + k.x * p.y, k.y + p.z * (p.x - k.z));
  if (s == 2) {
    float zb = p.z - 0.7;
    return vec3(zb * p.x - 3.5 * p.y, 3.5 * p.x + zb * p.y,
                0.6 + k.x * p.z - p.z * p.z * p.z / 3.0
                - dot(p.xy, p.xy) * (1.0 + 0.25 * p.z) + 0.1 * p.z * p.x * p.x * p.x);
  }
  if (s == 3) return sin(p.yzx) - k.x * p;
  return -k.x * p - 4.0 * p.yzx - 4.0 * p.zxy - p.yzx * p.yzx;
}
vec3 atMap(vec3 p, vec4 k) {
  return vec3(sin(k.x * p.y) + k.z * cos(k.x * p.x),
              sin(k.y * p.x) + k.w * cos(k.y * p.y), p.x);
}
vec3 atRk4(int s, vec3 p, vec4 k, float h) {
  vec3 a = atFlow(s, p, k);
  vec3 b = atFlow(s, p + 0.5 * h * a, k);
  vec3 c = atFlow(s, p + 0.5 * h * b, k);
  vec3 d = atFlow(s, p + h * c, k);
  return p + h / 6.0 * (a + 2.0 * (b + c) + d);
}
vec4 atTexel(int i, int layer) {
  return texelFetch(u_state, ivec2(i & 255, (i >> 8) + layer * 256), 0);
}
vec3 atPosition(int s, int i) {
  vec3 n = vec3(unpack16(atTexel(i, 0)), unpack16(atTexel(i, 1).rg));
  return AT_LO[s] + n * (AT_HI[s] - AT_LO[s]);
}
// Cluster lifetime as a fraction of the age range (see clusterLife).
float atLife(int c, float comets) {
  return mix(${g(LIFE[0])}, ${g(LIFE[1])}, clamp(comets, 0.0, 1.0)) * (0.75 + 0.5 * atRand(uint(c), 21u));
}
`;

const simulation = `${common}
vec4 atEncode24(float phase) {
  float n = floor(fract(phase) * 16777216.0);
  return vec4(floor(n / 65536.0), mod(floor(n / 256.0), 256.0), mod(n, 256.0), 0.0) / 255.0;
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  int layer = cell.y >> 8;
  int i = (cell.y & 255) * 256 + cell.x;
  int s = atSystem();
  // Whole RK4 steps this tick from the shared accumulator (particle 0).
  // A kick is a velocity surge along the flow (never off the attractor),
  // stronger with show energy.
  float surge = ${g(KICK_SURGE)} * clamp(u_kick, 0.0, 1.0) * (0.25 + 0.75 * clamp(u_level, 0.0, 1.0));
  float speed = max(u_params[1], 0.0) * (1.0 + surge);
  float total = (u_reset ? 0.0 : atDecode24(atTexel(0, 1).rgb))
              + AT_RATE[s] * speed / AT_H[s] * u_dt;
  int steps = int(min(floor(total), ${g(MAX_STEPS)}));
  if (i == 0) {
    // Row 0: camera orbit phase, integrated so orbit-speed changes never
    // jump and the phase wraps without precision loss. Row 256: the
    // accumulator's leftover fraction of a step.
    float phase = u_reset ? atRand(7u, 0u) : atDecode24(atTexel(0, 0).rgb);
    phase += max(u_params[3], 0.0) * ${g(ORBIT_RATE)} * u_dt;
    outColor = atEncode24(layer == 0 ? phase : total);
    return;
  }
  int c = i / AT_K;
  vec4 k = atParams(s, u_params[6]);
  vec3 lo = AT_LO[s], span = AT_HI[s] - AT_LO[s];
  float r0 = 0.006 / AT_SCALE[s];
  vec3 p = atPosition(s, i);
  float age = unpack16(atTexel(i, 1).ba);
  float life = atLife(c, u_params[7]);
  if (u_reset) {
    // Independent particles in the basin, pre-rolled onto the attractor;
    // clusters form as they first respawn, staggered by their start age.
    vec3 ic[6] = vec3[6](${SYSTEMS.map((S) => v3(S.init.center)).join(", ")});
    float ir[6] = float[6](${SYSTEMS.map((S) => g(S.init.radius)).join(", ")});
    float ih[6] = float[6](${SYSTEMS.map((S) => g(S.init.h)).join(", ")});
    int is[6] = int[6](${SYSTEMS.map((S) => S.init.steps).join(", ")});
    p = ic[s] + ir[s] * atBall(uint(i), 40u);
    if (s == 1) {
      // Rössler: on the band (radius 3–7), clear of the slow central focus.
      p.xy = normalize(p.xy + 1e-3) * mix(3.0, 7.0, atRand(uint(i), 44u));
      p.z = 0.05 + 0.3 * atRand(uint(i), 45u);
    }
    int n = is[s] / 2 + int(float(is[s]) * atRand(uint(i), 46u));
    for (int j = 0; j < 192; j++) {
      if (j >= n) break;
      p = s == 5 ? atMap(p, k) : atRk4(s, p, k, ih[s]);
    }
    // Start as dust (past the colour memory); first rebirths spread over
    // the rest of a lifetime.
    age = life * mix(0.45, 1.0, atRand(uint(c), 47u));
  } else {
    if (s == 5) {
      // Map: the whole cluster hops together (one coin per cluster and
      // tick) at speed·${MAP_HOPS} iterations per second.
      float coin = atRand(uint(c) ^ (u_tick * 2654435761u), 50u);
      if (coin < speed * ${g(MAP_HOPS)} * u_dt) {
        p = atMap(p, k);
        age += ${g(1 / (MAP_HOPS * AGE_SECONDS))};
      }
    } else {
      for (int j = 0; j < ${MAX_STEPS}; j++) {
        if (j >= steps) break;
        p = atRk4(s, p, k, AT_H[s]);
      }
      age += float(steps) * AT_H[s] / (AT_RATE[s] * ${g(AGE_SECONDS)});
    }
    if (age >= life) {
      // Respawn the whole cluster as one tight ball around a random particle
      // that is already on the attractor: a fresh set of nearby initial
      // conditions whose divergence the viewer then watches.
      uint gen = u_tick * 747796405u;
      int j = 1 + int(atHash(uint(c) ^ gen) % ${COUNT - 1}u);
      p = atPosition(s, j) + r0 * atBall(uint(i), gen);
      age = 0.0;
    }
  }
  // Escape / non-finite guard: rejoin the attractor next to another particle.
  vec3 n = (p - lo) / span;
  if (any(isnan(p)) || any(isinf(p)) || any(lessThan(n, vec3(0.002))) || any(greaterThan(n, vec3(0.998)))) {
    uint gen = u_tick * 2891336453u + uint(i);
    p = atPosition(s, 1 + int(atHash(gen) % ${COUNT - 1}u)) + r0 * atBall(uint(i), gen);
    n = clamp((p - lo) / span, 0.0, 1.0);
  }
  // Positions use unbiased stochastic rounding to 16 bits; age is rounded
  // deterministically so every member of a cluster keeps the same age.
  vec3 dither = (vec3(tickHash(cell, 1u), tickHash(cell, 2u), tickHash(cell, 3u)) - 0.5) / 65535.0;
  n = clamp(n + dither, 0.0, 1.0);
  outColor = layer == 0 ? vec4(pack16(n.x), pack16(n.y)) : vec4(pack16(n.z), pack16(age));
}
`;

// Visual pass: frame-rate independent fade of the previous frame (trails).
const fragment = `
void main() {
  vec3 previous = u_reset ? vec3(0.0) : texture(u_previous, v_uv).rgb;
  emit(vec4(previous * pow(clamp(u_params[4], 0.0, 0.985), u_dt * 60.0), 1.0));
}
`;

const particles = {
  vertex: `${common}
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // clipped unless set below
  gl_PointSize = 1.0;
  v_color = vec3(0.0);
  bool halo = gl_VertexID >= ${COUNT};
  int i = gl_VertexID & ${COUNT - 1};
  int c = i / AT_K;
  if (i == 0 || (halo && i % AT_K != 0)) return;
  if (!halo && fract(float(i) * 0.6180339887) >= u_params[5]) return;
  int s = atSystem();
  vec4 k = atParams(s, u_params[6]);
  vec3 p = atPosition(s, i);
  float age = unpack16(atTexel(i, 1).ba);
  float life = atLife(c, u_params[7]);
  float youth = 1.0 - smoothstep(0.0, 0.45 * life, age);
  if (halo && youth < 0.02) return;
  // Flow velocity (or map jump): colour, and the leftover fraction of the
  // current RK4 step so motion stays smooth at any speed.
  vec3 v = s == 5 ? atMap(p, k) - p : atFlow(s, p, k);
  if (s != 5) p += atDecode24(atTexel(0, 1).rgb) * AT_H[s] * v;

  // Camera: orbit (or sway) phase from the global texel, slow pitch wobble;
  // close-ups dive to the system's focus and turn toward its close view.
  float phase = atDecode24(atTexel(0, 0).rgb);
  float zoom = max(u_params[2], 0.1);
  float dive = smoothstep(1.4, 2.2, zoom);
  vec3 cam = AT_CAMERA[s];
  vec2 close = AT_CLOSE[s];
  float yaw = cam.z > 0.0
    ? dive * close.x + mix(cam.z, 0.45, dive) * sin(AT_TAU * phase)
    : AT_TAU * phase;
  float pitch = mix(cam.x, close.y, dive) + cam.y * sin(AT_TAU * 2.0 * phase + 0.7);
  vec3 target = dive * AT_FRAME[s] * (AT_FOCUS[s] - AT_CENTER[s]) * AT_SCALE[s];
  // Kick: a small camera dolly (parallax), on top of the shared 2D punch.
  float dist = 2.4 / zoom * (1.0 - 0.05 * clamp(u_kick, 0.0, 1.0) * u_level);
  vec3 fwd = vec3(sin(yaw) * cos(pitch), -sin(pitch), cos(yaw) * cos(pitch));
  vec3 right = vec3(cos(yaw), 0.0, -sin(yaw));
  vec3 up = cross(fwd, right);
  vec3 q = AT_FRAME[s] * (p - AT_CENTER[s]) * AT_SCALE[s];
  vec3 rel = q - (target - fwd * dist);
  float depth = dot(rel, fwd);
  if (depth < 0.06) return;
  vec2 screen = vec2(dot(rel, right), dot(rel, up)) * 1.92 / depth;
  float minSide = min(u_resolution.x, u_resolution.y);
  gl_Position = vec4(screen * minSide / u_resolution, 0.0, 1.0);

  // Size and light per point are resolution independent: a point smaller
  // than 1.5 px is drawn at 1.5 px with its area's share of light.
  float near = clamp(dist / depth, 0.45, 2.6);
  float size = (halo ? 16.0 : 1.5) * minSide / 540.0 * near;
  float drawn = max(size, 1.5);
  float light = size * size / (drawn * drawn);
  gl_PointSize = drawn;
  float fog = clamp(1.25 - 0.55 * (depth - dist), 0.3, 1.4);

  // Colour: dust by flow speed, young clusters by identity.
  float speed = length(v);
  float tone = pow(speed / (speed + AT_VREF[s]), 1.6);
  vec3 dust = palette(0.04 + 0.92 * tone);
  vec3 tag = palette(fract(float(c) * 0.618034 + atRand(13u, 0u)));
  float trail = clamp(u_params[4], 0.0, 0.985);
  // Light per particle follows the spread of the picture: thinner when
  // fewer particles show, longer trails accumulate or the camera pulls back.
  float gain = 0.42 * pow(1.0 - trail, 0.85) * pow(max(u_params[5], 0.05), -0.75) * pow(zoom, 0.8);
  if (halo) v_color = tag * (0.95 * pow(1.0 - trail, 0.85) * youth * youth * fog * light);
  else v_color = mix(dust, tag * 1.4, youth) * gain * fog * light;
}
`,
};

const schema = [
  { key: "system", label: "System · Lorenz / Rössler / Aizawa / Thomas / Halvorsen / Clifford", min: 0, max: 5, step: 1, default: 0 },
  { key: "speed", label: "Integration speed", min: 0.1, max: 2.5, step: 0.01, default: 1 },
  { key: "zoom", label: "Camera zoom (close-ups dive to the focus)", min: 0.6, max: 3.2, step: 0.01, default: 1 },
  { key: "orbit", label: "Camera orbit", min: 0, max: 2, step: 0.01, default: 0.6 },
  { key: "trail", label: "Trails", min: 0, max: 0.97, step: 0.01, default: 0.85 },
  { key: "density", label: "Visible particles", min: 0.15, max: 1, step: 0.01, default: 0.8 },
  { key: "morph", label: "Parameter morph depth", min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: "comets", label: "Comets (cluster respawn rate)", min: 0, max: 1, step: 0.01, default: 0.5 },
];

const presets = [
  { name: "Butterfly", seed: 6501, params: { system: 0, speed: 1, zoom: 1, orbit: 0.6, trail: 0.85, density: 0.85, morph: 0.4, comets: 0.45 } },
  { name: "Inside the Lobe", seed: 6502, params: { system: 0, speed: 0.8, zoom: 2.4, orbit: 0.35, trail: 0.95, density: 1, morph: 0.3, comets: 0.35 } },
  { name: "Rössler Ribbon", seed: 6503, params: { system: 1, speed: 1, zoom: 1.1, orbit: 0.6, trail: 0.9, density: 0.8, morph: 0.5, comets: 0.4 } },
  { name: "Aizawa Bloom", seed: 6504, params: { system: 2, speed: 1, zoom: 1.15, orbit: 0.7, trail: 0.85, density: 0.9, morph: 0.5, comets: 0.6 } },
  { name: "Thomas Weave", seed: 6505, params: { system: 3, speed: 1, zoom: 1.1, orbit: 0.5, trail: 0.92, density: 0.9, morph: 0.5, comets: 0.4 } },
  { name: "Halvorsen Propeller", seed: 6506, params: { system: 4, speed: 1, zoom: 1, orbit: 0.7, trail: 0.85, density: 0.85, morph: 0.5, comets: 0.5 } },
  { name: "Clifford Dust", seed: 6507, params: { system: 5, speed: 1, zoom: 1.4, orbit: 0.3, trail: 0.9, density: 1, morph: 0.6, comets: 0.3 } },
  { name: "Comet Rain", seed: 6508, params: { system: 0, speed: 1.4, zoom: 1.2, orbit: 0.8, trail: 0.7, density: 0.6, morph: 0.5, comets: 0.9 } },
];

export default {
  id: "attractor",
  number: 65,
  name: "Strange Attractors",
  description:
    "Chaotic flows and a chaotic map traced by 65,535 GPU particles: the Lorenz butterfly, Rössler's folded band, Aizawa's sphere and axial tube, Thomas' three-fold weave, Halvorsen's propeller and Clifford dust. Each particle is integrated exactly (fixed-step RK4) and projected by a slowly orbiting perspective camera. Clusters of 512 neighbouring initial conditions respawn as tight colour-coded comets and visibly stretch and smear around the attractor: sensitive dependence on initial conditions, made visible. Parameters morph slowly inside verified chaotic ranges.",
  energy: {
    speed: { mul: [0.55, 1.6] },
    density: [0.45, 1],
    trail: [0.8, 0.95],
    orbit: { mul: [0.45, 1.8] },
    morph: [0.15, 0.9],
  },
  beat: { punch: 0.5, pulse: 0.5 },
  audio: [
    { param: "speed", feature: "low", amount: 0.1 },
    { param: "orbit", feature: "flux", amount: 0.06 },
  ],
  stage: ["speed", "zoom", "trail"],
  type: { key: "system", values: [0, 1, 2, 3, 4, 5] },
  simulation: { size: [SIDE, SIDE * 2], steps: 1, fragment: simulation },
  particles,
  schema,
  presets,
  fragment,
};
