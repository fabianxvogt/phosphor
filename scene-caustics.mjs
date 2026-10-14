import { familyEffect } from "./family-rhythm.mjs";
import { hourClockGlsl } from "./scene-time.mjs";

// A finite-difference heightfield refracts parallel incident rays through a
// single air/liquid interface onto a flat receiver. Additive photon splats
// approximate irradiance concentration; finite footprints regularise folds.
// This is geometric optics, not a procedural bright-noise approximation.
export const SURFACE_SIDE = 256;
export const COURANT_SQUARED = 0.2; // <= 1/2 for the 2D four-neighbour stencil
const normalize = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};

export function refractDirection(incoming, normal, ratio = 1 / 1.333) {
  const i = normalize(incoming),
    n = normalize(normal);
  const dot = i.reduce((sum, value, k) => sum + value * n[k], 0);
  const discriminant = 1 - ratio * ratio * (1 - dot * dot);
  if (discriminant < 0) return null;
  const along = ratio * dot + Math.sqrt(discriminant);
  return i.map((value, k) => ratio * value - along * n[k]);
}

export function receiverHit(
  point,
  normal,
  { incoming = [0, 0, -1], index = 1.333, depth = 2 } = {},
) {
  const direction = refractDirection(incoming, normal, 1 / index);
  if (!direction || direction[2] >= -1e-8) return null;
  const distance = (-depth - point[2]) / direction[2];
  if (distance < 0) return null;
  return [
    point[0] + direction[0] * distance,
    point[1] + direction[1] * distance,
  ];
}

export function waveStep(
  height,
  previous,
  width,
  rows,
  { damping = 0.012, force = null } = {},
) {
  const next = new Float64Array(height.length);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < width; x++) {
      const at = y * width + x;
      const laplacian =
        height[y * width + ((x + 1) % width)] +
        height[y * width + ((x + width - 1) % width)] +
        height[((y + 1) % rows) * width + x] +
        height[((y + rows - 1) % rows) * width + x] -
        4 * height[at];
      next[at] =
        (2 - damping) * height[at] -
        (1 - damping) * previous[at] +
        COURANT_SQUARED * laplacian +
        (force?.[at] ?? 0);
    }
  return next;
}

const simulation = `${hourClockGlsl}
float cHeight(ivec2 cell) {
  ivec2 size = textureSize(u_state, 0);
  return (unpack16(texelFetch(u_state, (cell + size) % size, 0).rg) - 0.5) * 2.0;
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  float wavelength = u_params[1];
  if (u_reset) {
    float phase = float(u_seedBits % 997u) * 0.013;
    float h = 0.065 * (sin(float(cell.x) * TAU / wavelength + phase) + sin(float(cell.y) * TAU / (wavelength * 1.13) - phase));
    outColor = pack16(vec2(h) * 0.5 + 0.5);
    return;
  }
  vec4 old = texelFetch(u_state, cell, 0);
  float h = (unpack16(old.rg) - 0.5) * 2.0;
  float previous = (unpack16(old.ba) - 0.5) * 2.0;
  float laplacian = cHeight(cell + ivec2(1, 0)) + cHeight(cell - ivec2(1, 0))
    + cHeight(cell + ivec2(0, 1)) + cHeight(cell - ivec2(0, 1)) - 4.0 * h;
  float damping = u_params[3];
  float next = (2.0 - damping) * h - (1.0 - damping) * previous + 0.20 * laplacian;
  float t = u_time;
  // Drive phase: integrated in double precision after the first hour
  // (clock 0), so the 9 Hz drive stays exact for a whole night.
  float phase = hourClock(t * TAU * 54.0 / wavelength, 0);
  int surface = int(floor(u_params[0] + 0.5));
  float force = 0.0;
  if (surface == 1) {
    // Two coherent banks make crossing wavefronts, not a shaded sine image.
    force = exp(-sq((float(cell.x) - 12.0) / 1.6)) * sin(phase)
      + exp(-sq((float(cell.y) - 19.0) / 1.6)) * sin(phase * 1.07 + 0.6);
    force *= 0.006;
  } else {
    for (int k = 0; k < 3; k++) {
      float a = float(k) * TAU / 3.0 + t * 0.017;
      vec2 source = vec2(128.0) + 58.0 * vec2(cos(a), sin(a));
      vec2 d = vec2(cell) - source;
      force += exp(-dot(d, d) / 6.0) * sin(phase + float(k) * 1.7) * (surface == 2 ? 0.0008 : 0.025);
    }
  }
  next += force;
  // One local displacement packet; consumption is once per simulation write.
  float a = u_rhythmCount.z * 2.399963 + float(u_seedBits % 101u) * 0.07;
  vec2 source = vec2(128.0) + 65.0 * vec2(cos(a), sin(a));
  vec2 d = vec2(cell) - source;
  float impulse = exp(-dot(d, d) / 48.0) * u_rhythmHit.z * 0.16;
  next += impulse;
  h += impulse;
  outColor = pack16(clamp(vec2(next, h) * 0.5 + 0.5, 0.01, 0.99));
}
`;

const fragment = `
void main() {
  vec2 p = aspectUV();
  float receiver = 0.006 + 0.008 * exp(-dot(p, p) * 4.0);
  outColor = vec4(u_secondary * receiver, 1.0);
}
`;

const particles = {
  vertex: `
float cWave(ivec2 cell) {
  ivec2 size = textureSize(u_state, 0);
  return (unpack16(texelFetch(u_state, (cell + size) % size, 0).rg) - 0.5) * 2.0;
}
float cLens(vec2 p) {
  float time = u_time;
  vec2 q = p + 0.13 * vec2(sin(time * 0.09), cos(time * 0.07));
  vec2 cell = mod(q + 0.36, 0.72) - 0.36;
  float width = 0.19 + 0.025 * sin(time * 0.11);
  return exp(-dot(cell, cell) / (2.0 * width * width)) * 0.075;
}
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 1.0;
  v_color = vec3(0.0);
  ivec2 size = textureSize(u_state, 0);
  ivec2 cell = ivec2(gl_VertexID % size.x, gl_VertexID / size.x);
  vec2 uv = (vec2(cell) + 0.5) / vec2(size);
  vec2 p = uv * 2.0 - 1.0;
  vec2 stepSize = 2.0 / vec2(size);
  float scale = u_params[2] * 0.04;
  float h = cWave(cell) * scale;
  vec2 slope = vec2(cWave(cell + ivec2(1, 0)) - cWave(cell - ivec2(1, 0)),
    cWave(cell + ivec2(0, 1)) - cWave(cell - ivec2(0, 1))) * scale / (2.0 * stepSize);
  if (u_params[0] > 1.5) {
    // Smooth convex lens sheet plus the simulated wave perturbation.
    h += cLens(p) * u_params[2];
    slope += vec2(cLens(p + vec2(stepSize.x, 0.0)) - cLens(p - vec2(stepSize.x, 0.0)),
      cLens(p + vec2(0.0, stepSize.y)) - cLens(p - vec2(0.0, stepSize.y))) * u_params[2] / (2.0 * stepSize);
  }
  vec3 normal = normalize(vec3(-slope, 1.0));
  float steer = u_rhythm.y * 0.12;
  float heading = u_rhythmCount.y * 2.399963;
  vec3 incoming = normalize(vec3(u_params[6] + steer * cos(heading), steer * sin(heading), -1.0));
  vec3 direction = refract(incoming, normal, 1.0 / u_params[5]);
  if (direction.z >= -0.05) return;
  float distance = (-u_params[4] - h) / direction.z;
  if (distance <= 0.0) return;
  vec2 receiver = p + direction.xy * distance;
  float minSide = min(u_resolution.x, u_resolution.y);
  // Camera fits the central receiver region; square optics are cover-cropped.
  gl_Position = vec4(receiver * 0.88 * minSide / u_resolution, 0.0, 1.0);
  float footprint = minSide / 256.0;
  float drawn = max(1.5, footprint * 0.9 / u_params[7]);
  gl_PointSize = drawn;
  float flux = min(2.5, footprint * footprint / (drawn * drawn));
  float bundle = mod(floor(uv.x * 12.0) - u_rhythmCount.x, 12.0) < 1.0 ? 1.0 : 0.0;
  float hue = 0.15 + uv.y * 0.45 + 0.15 * sin(uv.x * 6.283185307179586);
  // Finite photon footprints preserve flux as resolution changes. Exposure
  // lifts their accumulated light into the display range before tone mapping.
  v_color = mix(palette(hue), u_accent, 0.16) * flux * 0.65 * (1.0 + bundle * u_rhythm.x * 2.5);
}
`,
};

const schema = [
  {
    key: "surface",
    label: "Surface · point waves / crossing banks / lens sheet",
    min: 0,
    max: 2,
    step: 1,
    default: 0,
  },
  {
    key: "wavelength",
    label: "Wave wavelength",
    min: 6,
    max: 40,
    step: 0.1,
    default: 18,
  },
  {
    key: "height",
    label: "Surface curvature",
    min: 0.2,
    max: 1.8,
    step: 0.01,
    default: 1,
  },
  {
    key: "damping",
    label: "Wave damping",
    min: 0.003,
    max: 0.05,
    step: 0.001,
    default: 0.012,
  },
  {
    key: "depth",
    label: "Receiver depth",
    min: 0.4,
    max: 3.5,
    step: 0.01,
    default: 2,
  },
  {
    key: "index",
    label: "Refractive index",
    min: 1.1,
    max: 1.6,
    step: 0.001,
    default: 1.333,
  },
  {
    key: "tilt",
    label: "Incident light angle",
    min: -0.5,
    max: 0.5,
    step: 0.01,
    default: 0.08,
  },
  {
    key: "focus",
    label: "Finite focus",
    min: 0.5,
    max: 1.8,
    step: 0.01,
    default: 1,
  },
];
const look = (
  name,
  seed,
  surface,
  wavelength,
  height,
  damping,
  depth,
  index,
  tilt,
  focus,
) => ({
  name,
  seed,
  params: { surface, wavelength, height, damping, depth, index, tilt, focus },
});
const presets = [
  look("Pool of Light", 8401, 0, 24, 1.0, 0.009, 2.4, 1.333, 0.06, 1.2),
  look("Fine Water Folds", 8402, 0, 10, 1.3, 0.007, 3.0, 1.4, -0.12, 1.35),
  look("Slow Cusp Garden", 8403, 0, 36, 1.65, 0.012, 3.3, 1.5, 0.16, 1.1),
  look("Crossing Wave Banks", 8404, 1, 22, 1.2, 0.008, 2.2, 1.333, -0.06, 1.3),
  look("Liquid Lattice", 8405, 1, 12, 0.75, 0.014, 1.8, 1.45, 0.22, 1.4),
  look("Long Glass Ribbons", 8406, 1, 34, 1.6, 0.006, 3.1, 1.55, -0.28, 0.9),
  look("Breathing Lens Sheet", 8407, 2, 28, 1.3, 0.022, 2.6, 1.5, 0.12, 1.15),
  look(
    "Prismatic Focal Pearls",
    8408,
    2,
    16,
    1.7,
    0.018,
    3.3,
    1.55,
    -0.18,
    1.5,
  ),
];

export default {
  id: "caustics",
  number: 84,
  name: "Geometric Caustics",
  description:
    "65,536 light rays refract through a real moving heightfield onto a flat receiver. Finite-difference waves or a slowly moving convex lens sheet bend rays through Snell's law; additive, finite photon footprints reveal where rays actually concentrate into folds and focal pearls. Single-interface geometric study, with no shadows, dispersion or photorealistic water claim.",
  study: true,
  aspect: 1,
  rhythm: [
    familyEffect(
      "ray-bundle",
      0,
      "Ray-bundle light",
      "Illuminate a selected incident strip; the same refracted rays carry it into the caustic folds.",
      { strength: 0.7 },
    ),
    familyEffect(
      "light-steering",
      1,
      "Incident-light steering",
      "Boundedly steer the incident light before Snell refraction onto the receiver.",
      { period: 4, strength: 0.6, duration: 1, kind: "motion" },
    ),
    familyEffect(
      "surface-impulse",
      2,
      "Surface impulse",
      "Displace a bounded local water packet and let its wavefront form new refractive folds.",
      { period: 8, strength: 0.65, duration: 0.25, kind: "simulation" },
    ),
  ],
  energy: {
    height: { mul: [0.65, 1.2] },
    depth: [-0.25, 0.35],
    focus: [-0.1, 0.2],
  },
  beat: { punch: 0, pulse: 0 },
  stage: ["height", "depth", "tilt"],
  type: { key: "surface", values: [0, 1, 2] },
  // sin(phase · 1.07) keeps the drive periodic in 200π (scene-time.mjs).
  clocks: [{ rate: (p) => (2 * Math.PI * 54) / p[1], period: 200 * Math.PI }],
  simulation: {
    size: [SURFACE_SIDE, SURFACE_SIDE],
    steps: 2,
    fragment: simulation,
  },
  particles,
  schema,
  presets,
  fragment,
};
