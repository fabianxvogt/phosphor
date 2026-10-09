// Chladni Figures (#81): a vibrating plate throws sand off its moving
// parts; grains come to rest only where the plate stands still, so 65 536
// grains draw the nodal lines of the current mode. Every few beats the
// plate jumps to a new mode and the sand visibly migrates, the moment
// Chladni showed audiences in 1787.
//
// Each grain random-walks with a step proportional to the local amplitude
// |u| (vibration) plus a small descent on u² (settling). Its stationary
// density grows like 1/u², so it piles up on the nodes.
//
// Variants: a square plate with the classic cos-combination modes
// cos(nπx)cos(mπy) ± cos(mπx)cos(nπy); a continuous mode morph where the
// sand never settles; a circular plate with Bessel modes J_n(k r)·cos(nθ)
// (rings and diameters, slowly turning, since such modes are degenerate);
// and Faraday hexagons, three standing waves at 60°.

export const SQUARE_MODES = [
  [1, 2, 1],
  [1, 3, -1],
  [2, 3, 1],
  [1, 4, -1],
  [2, 5, 1],
  [3, 4, -1],
  [3, 5, 1],
  [1, 5, -1],
  [4, 5, 1],
  [2, 7, -1],
  [3, 7, 1],
  [5, 6, -1],
];
// Zeros j_{n,s} of the Bessel function J_n (n = 0 … 5, s = 1 … 4).
export const BESSEL_ZEROS = [
  [2.4048, 5.5201, 8.6537, 11.7915],
  [3.8317, 7.0156, 10.1735, 13.3237],
  [5.1356, 8.4172, 11.6198, 14.796],
  [6.3802, 9.761, 13.0152, 16.2235],
  [7.5883, 11.0647, 14.3725, 17.616],
  [8.7715, 12.3386, 15.7002, 18.9801],
];
const SIDE = 256;

// CPU references.
export function squareMode([x, y], [n, m, sign]) {
  const X = (x + 1) / 2,
    Y = (y + 1) / 2;
  return (
    0.5 *
    (Math.cos(n * Math.PI * X) * Math.cos(m * Math.PI * Y) +
      sign * Math.cos(m * Math.PI * X) * Math.cos(n * Math.PI * Y))
  );
}
export function besselJ(n, x, steps = 24) {
  let s = 0;
  for (let i = 0; i < steps; i++) {
    const tau = ((i + 0.5) / steps) * Math.PI;
    s += Math.cos(n * tau - x * Math.sin(tau));
  }
  return s / steps;
}

const squareTable = SQUARE_MODES.map(
  ([n, m, s]) => `vec3(${n}.0, ${m}.0, ${s}.0)`,
).join(", ");
const besselTable = BESSEL_ZEROS.flat()
  .map((z) => z.toFixed(4))
  .join(", ");

const shared = `
const vec3 SQ_MODES[${SQUARE_MODES.length}] = vec3[](${squareTable});
const float J_ZEROS[24] = float[](${besselTable});
const float PI_C = 3.141592653589793;
float chJ(int n, float x) {
  float s = 0.0;
  for (int i = 0; i < 24; i++) {
    float tau = (float(i) + 0.5) / 24.0 * PI_C;
    s += cos(float(n) * tau - x * sin(tau));
  }
  return s / 24.0;
}
float chHash(float a) { return fract(sin(a * 12.9898 + float(u_seedBits % 977u) * 0.37) * 43758.5453); }
// Mode number k of a variant at plate point p (in [−1, 1]²).
float chMode(int variant, float k, vec2 p, float t) {
  if (variant <= 1) {
    vec3 m = SQ_MODES[int(mod(k + floor(chHash(1.0) * 12.0), ${SQUARE_MODES.length}.0))];
    vec2 q = (p + 1.0) * 0.5;
    return 0.5 * (cos(m.x * PI_C * q.x) * cos(m.y * PI_C * q.y) + m.z * cos(m.y * PI_C * q.x) * cos(m.x * PI_C * q.y));
  }
  if (variant == 2) {
    float h = chHash(k + 3.0);
    int n = int(h * 6.0);
    int s = 1 + int(chHash(k + 7.0) * 3.0);
    float r = length(p);
    float th = atan(p.y, p.x) + t * 0.05 * (h - 0.5);
    return chJ(n, J_ZEROS[n * 4 + s] * r) * cos(float(n) * th) * 1.6;
  }
  // Faraday hexagons: three standing waves at 60°.
  float kk = 6.0 + 8.0 * chHash(k + 11.0);
  float a = chHash(k + 13.0) * PI_C;
  float u = 0.0;
  for (int j = 0; j < 3; j++) {
    float aj = a + float(j) * PI_C / 3.0;
    u += cos(kk * dot(p, vec2(cos(aj), sin(aj))));
  }
  return u / 3.0;
}
// The plate's amplitude now: hold a mode for 'hold' beats, crossfade
// into the next over 1.5 beats (the morph variant glides all the time).
float chField(vec2 p, int variant, float beats, float hold, float t) {
  float k = floor(beats / hold);
  float into = beats - k * hold;
  float s = variant == 1 ? smoothstep(0.0, 1.0, into / hold) : smoothstep(0.0, 1.5, into);
  return mix(chMode(variant, k - 1.0, p, t), chMode(variant, k, p, t), s);
}
float chHold(float idx) { return idx < 0.5 ? 8.0 : idx < 1.5 ? 16.0 : idx < 2.5 ? 32.0 : 64.0; }
`;

const simulation = `${shared}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  int variant = int(floor(u_params[0] + 0.5));
  float hold = chHold(u_params[1]);
  float vibration = u_params[2];
  float settle = u_params[3];
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;
  vec2 p;
  if (u_reset) {
    p = vec2(tickHash(cell, 1u), tickHash(cell, 2u)) * 2.0 - 1.0;
    if (variant == 2) p *= 0.7071;
    outColor = pack16(p * 0.5 + 0.5);
    return;
  }
  p = unpack16(texelFetch(u_state, cell, 0)) * 2.0 - 1.0;
  float e = 0.004;
  float a = chField(p, variant, beats, hold, t);
  vec2 grad = vec2(chField(p + vec2(e, 0.0), variant, beats, hold, t) - a,
                   chField(p + vec2(0.0, e), variant, beats, hold, t) - a) / e;
  // Vibration: a random hop proportional to |u|; settling: descend on u².
  float ang = TAU * tickHash(cell, 3u);
  float len = tickHash(cell, 4u);
  p += vec2(cos(ang), sin(ang)) * len * abs(a) * vibration * 0.08;
  p -= a * grad * settle * 0.004;
  // Stay on the plate.
  if (variant == 2) { float r = length(p); if (r > 0.995) p *= 0.995 / r; }
  else p = clamp(p, -0.998, 0.998);
  outColor = pack16(p * 0.5 + 0.5);
}
`;

// Visual pass: the plate, faintly showing where it moves.
const fragment = `${shared}
void main() {
  int variant = int(floor(u_params[0] + 0.5));
  float hold = chHold(u_params[1]);
  float field = u_params[7];
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;
  vec2 p = aspectUV() / 0.46;
  float px = length(fwidth(p));
  bool onPlate = variant == 2 ? length(p) < 1.0 : max(abs(p.x), abs(p.y)) < 1.0;
  vec3 colour = u_secondary * 0.015;
  if (onPlate) {
    float a = chField(p, variant, beats, hold, t);
    float shimmer = 0.6 + 0.4 * sin(t * 40.0);
    colour = u_secondary * 0.06 + palette(0.35 + 0.4 * a) * abs(a) * field * 0.35 * shimmer;
  }
  float edge = variant == 2 ? abs(length(p) - 1.0) : abs(max(abs(p.x), abs(p.y)) - 1.0);
  colour += mix(u_primary, vec3(1.0), 0.3) * (1.0 - smoothstep(0.0, 2.5 * px, edge)) * 0.5;
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const particles = {
  vertex: `${shared}
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 1.0;
  v_color = vec3(0.0);
  int variant = int(floor(u_params[0] + 0.5));
  float hold = chHold(u_params[1]);
  float grains = u_params[4];
  float size = u_params[5];
  float glow = u_params[6];
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;
  if (float(gl_VertexID) >= grains * ${SIDE * SIDE}.0) return;
  vec2 p = unpack16(particle()) * 2.0 - 1.0;
  float a = abs(chField(p, variant, beats, hold, t));
  float minSide = min(u_resolution.x, u_resolution.y);
  gl_Position = vec4(p * 0.92 * minSide / u_resolution, 0.0, 1.0);
  gl_PointSize = max((1.2 + 2.0 * size) * minSide / 1080.0, 1.2);
  // Grains at rest on a node shine; flying grains are dim.
  float rest = exp(-a * 9.0);
  v_color = mix(palette(0.85), vec3(1.0), 0.4) * glow * (0.1 + 0.6 * rest) * (0.6 + 0.4 * u_level);
}
`,
};

const schema = [
  {
    key: "variant",
    label: "Plate · square / mode morph / circular (Bessel) / Faraday hexagons",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "hold",
    label: "Beats per mode · 8 / 16 / 32 / 64",
    min: 0,
    max: 3,
    step: 1,
    default: 1,
  },
  {
    key: "vibration",
    label: "Vibration",
    min: 0.1,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "settle",
    label: "Settling",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  { key: "grains", label: "Sand", min: 0.1, max: 1, step: 0.01, default: 0.8 },
  {
    key: "size",
    label: "Grain size",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "glow",
    label: "Sand light",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.7,
  },
  {
    key: "field",
    label: "Plate shimmer",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
];

const look = (
  name,
  seed,
  variant,
  hold,
  vibration,
  settle,
  grains,
  size,
  glow,
  field,
) => ({
  name,
  seed,
  params: { variant, hold, vibration, settle, grains, size, glow, field },
});

const presets = [
  look("Chladni Plate", 8101, 0, 1, 0.6, 0.5, 0.8, 0.4, 0.7, 0.3),
  look("Fast Modes", 8102, 0, 0, 0.8, 0.7, 0.9, 0.35, 0.7, 0.2),
  look("Fine Sand", 8103, 0, 2, 0.5, 0.4, 1, 0.15, 0.75, 0.15),
  look("Mode Morph", 8104, 1, 1, 0.7, 0.4, 0.8, 0.4, 0.7, 0.4),
  look("Drumhead", 8105, 2, 1, 0.6, 0.5, 0.85, 0.4, 0.7, 0.3),
  look("Bessel Rings", 8106, 2, 2, 0.5, 0.6, 1, 0.3, 0.75, 0.5),
  look("Faraday Hexagons", 8107, 3, 1, 0.6, 0.5, 0.85, 0.35, 0.7, 0.35),
  look("Honeycomb Sand", 8108, 3, 0, 0.75, 0.7, 1, 0.25, 0.75, 0.2),
];

export default {
  id: "chladni",
  number: 81,
  name: "Chladni Figures",
  description:
    "A vibrating plate throws sand off its moving parts, so 65,536 grains come to rest on the nodal lines of the current mode. Every few beats the plate jumps to a new mode and the sand visibly migrates into the next figure. Square plates use the classic cos-combination modes; the morph variant never lets the sand settle; the circular plate shows Bessel rings and slowly turning diameters; Faraday hexagons come from three standing waves at 60°.",
  energy: {
    vibration: { mul: [0.6, 1.6] },
    glow: [-0.1, 0.2],
    field: [-0.1, 0.25],
  },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "vibration", feature: "low", amount: 0.08 },
    { param: "field", feature: "onset", amount: 0.15 },
    { param: "glow", feature: "high", amount: 0.06 },
  ],
  stage: ["vibration", "settle", "field"],
  maxRenderWidth: 1280,
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [SIDE, SIDE], steps: 2 },
  particles,
};
