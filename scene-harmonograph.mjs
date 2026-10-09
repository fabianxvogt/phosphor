// Harmonograph (#75): curves drawn by oscillators, like an XY oscilloscope
// on a phosphor screen. 65 536 points sample the whole curve every frame
// (stateless, computed in the particle vertex shader); the visual pass
// only fades the previous frame, so the curve leaves phosphor trails.
//
// Signature details: the frequency ratio is the shape. A rational ratio
// a:b closes into a Lissajous figure; a tiny detuning makes it precess as
// if turning in 3D. Damped pendulums (the harmonograph proper) spiral
// inward and are re-pushed every 16 beats with new phases, so the drawing
// grows from the pen like on paper. A spirograph (hypotrochoid) with
// R:r = a:b has exactly a petals. Three frequencies make a Lissajous knot,
// a closed curve in space that never touches itself, turned in 3D.

export const RATIOS = [
  [1, 2],
  [2, 3],
  [3, 4],
  [3, 5],
  [4, 5],
  [5, 6],
  [5, 8],
  [7, 9],
  [2, 5],
  [3, 7],
];
const SIDE = 256; // 65 536 points

// CPU references for the tests.
export const lissajous = (t, a, b, delta) => [
  Math.sin(a * t + delta),
  Math.sin(b * t),
];
export function hypotrochoid(t, R, r, d) {
  const k = (R - r) / r;
  return [
    (R - r) * Math.cos(t) + d * Math.cos(k * t),
    (R - r) * Math.sin(t) - d * Math.sin(k * t),
  ];
}
// Lissajous knot frequencies for ratio a:b: (a, b, a + b) made coprime.
export function knotFrequencies(a, b) {
  const gcd = (x, y) => (y ? gcd(y, x % y) : x);
  let c = a + b;
  while (gcd(c, a) !== 1 || gcd(c, b) !== 1) c++;
  return [a, b, c];
}
export const lissajousKnot = (t, [a, b, c]) => [
  Math.cos(a * t + 0.7),
  Math.cos(b * t + 1.3),
  Math.cos(c * t),
];

const ratioTable = RATIOS.map(([a, b]) => `vec2(${a}.0, ${b}.0)`).join(", ");
const knotTable = RATIOS.map(([a, b]) => `${knotFrequencies(a, b)[2]}.0`).join(
  ", ",
);

const simulation = `
void main() { outColor = vec4(0.0); }
`;

// Visual pass: frame-rate independent phosphor fade.
const fragment = `
void main() {
  vec3 previous = u_reset ? vec3(0.0) : texture(u_previous, v_uv).rgb;
  emit(vec4(previous * pow(clamp(u_params[6], 0.0, 0.97), u_dt * 60.0), 1.0));
}
`;

const particles = {
  vertex: `
const vec2 RATIOS[${RATIOS.length}] = vec2[](${ratioTable});
const float KNOT_C[${RATIOS.length}] = float[](${knotTable});
const float TAU_H = 6.283185307179586;
float hRand(float n, float k) { return particleHash(n * 17.0 + k * 3.1); }
void main() {
  int variant = int(floor(u_params[0] + 0.5));
  int ri = clamp(int(floor(u_params[1] + 0.5)), 0, ${RATIOS.length - 1});
  float detune = u_params[2];
  float shape = u_params[3];
  float trace = u_params[4];
  float glow = u_params[5];
  float persistence = clamp(u_params[6], 0.0, 0.97);
  float spin = u_params[7];
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;
  float beatPulse = u_beat > 0.0 ? exp(-5.0 * fract(u_beat)) : 0.0;
  vec2 ab = RATIOS[ri];
  float s = (float(gl_VertexID) + 0.5) / ${SIDE * SIDE}.0;

  vec2 p = vec2(0.0);
  float bright = 1.0;
  float hue = s;
  float len = 1.0; // rough curve length for the light budget
  if (variant == 0) {
    // Lissajous: x = sin(a·u + δ), y = sin(b·u); δ precesses.
    float u = s * TAU_H;
    float delta = t * (0.05 + 0.6 * detune) + 0.4;
    p = vec2(sin(ab.x * u + delta), sin(ab.y * u));
    len = (ab.x + ab.y) * 1.6;
  } else if (variant == 1) {
    // Harmonograph: two damped pendulums per axis, pushed every 16 beats.
    float push = floor(beats / 16.0);
    float since = mod(beats, 16.0) / 16.0;
    float T = 70.0;
    float u = s * T;
    float pen = since * T * (0.35 + 0.65 * trace) * 1.6;
    if (u > pen) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; v_color = vec3(0.0); return; }
    float d = 0.006 + 0.03 * shape;
    float e = exp(-d * u);
    float eps = 0.004 + 0.03 * detune;
    vec4 ph = vec4(hRand(push, 1.0), hRand(push, 2.0), hRand(push, 3.0), hRand(push, 4.0)) * TAU_H;
    p = e * vec2(sin(ab.x * u * 0.5 + ph.x) + 0.6 * sin((ab.x + eps) * u * 0.5 + ph.y),
                 sin(ab.y * u * 0.5 + ph.z) + 0.6 * sin((ab.y - eps) * u * 0.5 + ph.w)) / 1.6;
    // The pen head is brightest; ink fades along the drawing.
    float age = (pen - u) / T;
    bright = 0.35 + 0.65 * exp(-age * 6.0) + 2.0 * exp(-(pen - u) * 2.0);
    hue = fract(u / T * 0.8 + push * 0.31);
    len = 25.0;
  } else if (variant == 2) {
    // Spirograph: hypotrochoid with R:r = b:a has b petals.
    float R = ab.y, r = ab.x;
    float u = s * TAU_H * r;
    float dpen = r * (0.3 + 1.2 * shape) * (1.0 + 0.15 * sin(t * (0.1 + 0.5 * detune)));
    float k = (R - r) / r;
    p = vec2((R - r) * cos(u) + dpen * cos(k * u), (R - r) * sin(u) - dpen * sin(k * u)) / (R - r + dpen);
    len = (R + dpen) * 2.5;
  } else {
    // Lissajous knot (a, b, c) turned in 3D, in perspective.
    float u = s * TAU_H;
    vec3 q = vec3(cos(ab.x * u + 0.7), cos(ab.y * u + 1.3), cos(KNOT_C[ri] * u));
    float yaw = t * (0.1 + 0.5 * spin), pitch = 0.5 * sin(t * 0.13) + 0.3;
    q.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * q.xz;
    q.yz = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch)) * q.yz;
    float depth = 3.2 + q.z;
    p = q.xy * 2.6 / depth;
    bright = pow(3.2 / depth, 2.0);
    hue = fract(s * 2.0 + 0.5 * q.z);
    len = (ab.x + ab.y + KNOT_C[ri]) * 1.8;
  }
  // Slow turn for the flat curves.
  if (variant != 3) {
    float a = t * spin * 0.05;
    p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  }
  // A comet runs along the curve on the beat.
  float head = fract(beats * 0.125);
  float dh = abs(fract(s - head + 0.5) - 0.5);
  bright *= 1.0 + 1.5 * exp(-dh * 60.0) * (0.4 + beatPulse) * trace;

  float minSide = min(u_resolution.x, u_resolution.y);
  gl_Position = vec4(p * 0.86 * minSide / u_resolution, 0.0, 1.0);
  float size = 2.2 * minSide / 1080.0;
  gl_PointSize = max(size, 1.5);
  // Light per point follows the curve length and the phosphor persistence.
  float gain = glow * 0.5 * (1.0 - persistence * 0.9) * clamp(len / 12.0, 0.25, 4.0);
  v_color = palette(fract(0.08 + 0.85 * hue)) * bright * gain * (0.7 + 0.5 * u_level);
}
`,
};

const schema = [
  {
    key: "variant",
    label: "Curve · Lissajous / harmonograph / spirograph / Lissajous knot",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "ratio",
    label: "Ratio · 1:2 2:3 3:4 3:5 4:5 5:6 5:8 7:9 2:5 3:7",
    min: 0,
    max: RATIOS.length - 1,
    step: 1,
    default: 1,
  },
  {
    key: "detune",
    label: "Detune (precession)",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.2,
  },
  {
    key: "shape",
    label: "Damping · pen offset",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "trace",
    label: "Pen speed · comet",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "glow",
    label: "Beam brightness",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "persistence",
    label: "Phosphor persistence",
    min: 0,
    max: 0.97,
    step: 0.01,
    default: 0.8,
  },
  { key: "spin", label: "Turn", min: -1, max: 1, step: 0.01, default: 0.2 },
];

const look = (
  name,
  seed,
  variant,
  ratio,
  detune,
  shape,
  trace,
  glow,
  persistence,
  spin,
) => ({
  name,
  seed,
  params: { variant, ratio, detune, shape, trace, glow, persistence, spin },
});

const presets = [
  look("Scope 3:2", 7501, 0, 1, 0.15, 0.4, 0.6, 0.6, 0.8, 0.1),
  look("Precessing 5:8", 7502, 0, 6, 0.4, 0.4, 0.7, 0.55, 0.88, 0),
  look("Octave Ribbon", 7503, 0, 0, 0.6, 0.4, 0.5, 0.7, 0.92, 0.3),
  look("Pendulum Drawing", 7504, 1, 1, 0.25, 0.4, 0.6, 0.6, 0.6, 0.05),
  look("Harmonograph 3:4", 7505, 1, 2, 0.4, 0.25, 0.8, 0.6, 0.5, -0.1),
  look("Slow Spiral", 7506, 1, 4, 0.15, 0.7, 0.4, 0.65, 0.7, 0.2),
  look("Spirograph Rose", 7507, 2, 6, 0.2, 0.6, 0.6, 0.6, 0.8, 0.3),
  look("Seven Petals", 7508, 2, 9, 0.3, 0.9, 0.5, 0.6, 0.85, -0.2),
  look("Lissajous Knot", 7509, 3, 1, 0.2, 0.4, 0.6, 0.65, 0.75, 0.4),
  look("Knot 5:8:13", 7510, 3, 6, 0.2, 0.4, 0.5, 0.6, 0.85, 0.25),
];

export default {
  id: "harmonograph",
  number: 75,
  name: "Harmonograph",
  description:
    "Curves drawn by oscillators on a phosphor screen. A frequency ratio a:b closes into a Lissajous figure and a tiny detuning makes it precess as if turning in space; damped pendulums spiral inward and are pushed again every 16 beats, so the drawing grows from the pen; a spirograph with R:r = a:b has exactly a petals; three frequencies make a Lissajous knot, turned in 3D. A comet runs along the curve on the beat.",
  energy: {
    glow: [-0.1, 0.25],
    detune: { mul: [0.6, 1.8] },
    persistence: [0.05, -0.1],
  },
  beat: { punch: 0.5, pulse: 0.8 },
  audio: [
    { param: "glow", feature: "onset", amount: 0.12 },
    { param: "detune", feature: "low", amount: 0.05 },
    { param: "spin", feature: "high", amount: 0.06 },
  ],
  stage: ["detune", "trace", "persistence"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [SIDE, SIDE], steps: 1 },
  particles,
};
