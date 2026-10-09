// Hopf Fibration (#80): the 3-sphere S³ ⊂ C² is a bundle of great
// circles, one over every point of the 2-sphere. The Hopf map
// (z1, z2) → (2·z1·z̄2, |z1|² − |z2|²) sends each circle to one point.
// Stereographic projection from S³ to space turns the circles into round
// circles (one through infinity, a straight line) and makes the famous
// picture: fibres over a circle of latitude fill a torus as Villarceau
// circles, and any two fibres are linked exactly once.
//
// 65 536 particles: 256 fibres × 256 points. Each fibre takes the colour
// of its base point on S² (hue by longitude), so the picture shows the
// map as well as the bundle. A slow rotation of S³ in 4D carries circles
// through the point at infinity and back.

const FIBRES = 256;
const POINTS = 256;

// CPU references. The fibre over the base point (θ, φ) of S², point t.
export function fibrePoint(theta, phi, t) {
  const eta = theta / 2;
  return [
    Math.cos(eta) * Math.cos(t + phi),
    Math.cos(eta) * Math.sin(t + phi),
    Math.sin(eta) * Math.cos(t),
    Math.sin(eta) * Math.sin(t),
  ];
}
// Hopf map of (x1, y1, x2, y2), z1 = x1 + i·y1, z2 = x2 + i·y2.
export function hopf([x1, y1, x2, y2]) {
  // z1·conj(z2) = (x1x2 + y1y2) + i(y1x2 − x1y2)
  return [
    2 * (x1 * x2 + y1 * y2),
    2 * (y1 * x2 - x1 * y2),
    x1 * x1 + y1 * y1 - x2 * x2 - y2 * y2,
  ];
}
// Stereographic projection from the pole y2 = 1.
export const stereo = ([x1, y1, x2, y2]) => [
  x1 / (1 - y2),
  y1 / (1 - y2),
  x2 / (1 - y2),
];

const simulation = `
void main() { outColor = vec4(0.0); }
`;

const fragment = `
void main() {
  vec3 previous = u_reset ? vec3(0.0) : texture(u_previous, v_uv).rgb;
  emit(vec4(previous * pow(clamp(u_params[7], 0.0, 0.95), u_dt * 60.0), 1.0));
}
`;

const particles = {
  vertex: `
const float TAU_H = 6.283185307179586;
const float GOLDEN = 2.399963229728653;
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 1.0;
  v_color = vec3(0.0);
  int variant = int(floor(u_params[0] + 0.5));
  float latitude = u_params[1];
  float fibresK = u_params[2];
  float tumble = u_params[3];
  float spin = u_params[4];
  float zoom = u_params[5];
  float glow = u_params[6];
  float persistence = clamp(u_params[7], 0.0, 0.95);
  float t = mod(u_time, 3600.0);
  float beatPulse = u_beat > 0.0 ? exp(-4.0 * fract(u_beat)) : 0.0;

  int f = gl_VertexID / ${POINTS};
  int k = gl_VertexID % ${POINTS};
  int nF = variant == 3 ? int(12.0 + 52.0 * fibresK) : int(32.0 + 224.0 * fibresK);
  if (f >= nF) return;
  float u = (float(f) + 0.5) / float(nF);

  // Base point (θ polar, φ longitude) on S² for each fibre.
  float theta, phi;
  float breathe = 0.12 * sin(t * 0.21) + 0.08 * beatPulse * u_level;
  if (variant == 0) {
    // One circle of latitude: a torus of Villarceau circles.
    theta = clamp(latitude * PI_H + breathe, 0.05, 3.09);
    phi = TAU_H * u;
  } else if (variant == 1) {
    // Several latitudes: nested tori.
    float rings = 5.0;
    float ring = floor(u * rings);
    theta = clamp((0.2 + 0.6 * (ring + 0.5) / rings) * 3.14159 * (0.6 + 0.8 * latitude) + breathe, 0.05, 3.09);
    phi = TAU_H * fract(u * rings) + ring * 0.4;
  } else if (variant == 2) {
    // A loxodrome from pole to pole: fibres sweep from axis to circle.
    theta = mix(0.08, 3.06, u);
    phi = u * TAU_H * (2.0 + 6.0 * latitude) + t * 0.1;
  } else {
    // Scattered base points (a drifting Fibonacci sphere): linked rings.
    float z = 1.0 - 2.0 * u;
    theta = acos(clamp(z, -1.0, 1.0)) + 0.3 * sin(t * 0.17 + float(f));
    phi = float(f) * GOLDEN + t * 0.05 * (1.0 + latitude);
  }
  float s = TAU_H * float(k) / ${POINTS}.0;
  float eta = 0.5 * theta;
  vec4 q = vec4(cos(eta) * cos(s + phi), cos(eta) * sin(s + phi), sin(eta) * cos(s), sin(eta) * sin(s));

  // A slow 4D tumble carries circles through infinity and back.
  float a = tumble * 0.7 * sin(t * 0.07), b = tumble * 0.5 * sin(t * 0.05 + 1.0);
  q.xw = mat2(cos(a), -sin(a), sin(a), cos(a)) * q.xw;
  q.yz = mat2(cos(b), -sin(b), sin(b), cos(b)) * q.yz;
  float den = 1.0 - q.w;
  if (den < 0.04) return;
  vec3 p = q.xyz / den;
  if (length(p) > 8.0) return;

  // Camera.
  float yaw = t * spin * 0.2, pitch = 0.45 + 0.25 * sin(t * 0.09);
  p.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * p.xz;
  p.yz = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch)) * p.yz;
  float depth = 5.5 / zoom + p.z;
  if (depth < 0.3) return;
  vec2 screen = p.xy * 2.2 / depth;
  float minSide = min(u_resolution.x, u_resolution.y);
  gl_Position = vec4(screen * minSide / u_resolution, 0.0, 1.0);
  float size = 2.0 * minSide / 1080.0 * clamp(5.0 / depth, 0.6, 2.0);
  gl_PointSize = max(size, 1.5);
  // Colour by the base point on S²: hue by longitude, light by latitude.
  float hue = fract(phi / TAU_H + 0.05);
  float fog = clamp(1.4 - 0.12 * depth, 0.35, 1.3);
  float light = glow * 0.6 * (1.0 - 0.85 * persistence) * fog * (0.55 + 0.45 * u_level);
  if (variant == 3) light *= 2.2;
  v_color = palette(hue) * light * (0.6 + 0.4 * sin(theta)) * (1.0 + 0.6 * beatPulse);
}
`.replace(/PI_H/g, "3.141592653589793"),
};

const schema = [
  {
    key: "variant",
    label:
      "Fibres over · a latitude / nested latitudes / a loxodrome / scattered points",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "latitude",
    label: "Latitude · spread",
    min: 0.05,
    max: 0.95,
    step: 0.01,
    default: 0.5,
  },
  { key: "fibres", label: "Fibres", min: 0, max: 1, step: 0.01, default: 0.6 },
  {
    key: "tumble",
    label: "4D tumble",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "spin",
    label: "Camera turn",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
  { key: "zoom", label: "Zoom", min: 0.5, max: 2.5, step: 0.01, default: 1 },
  { key: "glow", label: "Light", min: 0, max: 1, step: 0.01, default: 0.7 },
  {
    key: "persistence",
    label: "Trails",
    min: 0,
    max: 0.95,
    step: 0.01,
    default: 0.5,
  },
];

const look = (
  name,
  seed,
  variant,
  latitude,
  fibres,
  tumble,
  spin,
  zoom,
  glow,
  persistence,
) => ({
  name,
  seed,
  params: { variant, latitude, fibres, tumble, spin, zoom, glow, persistence },
});

const presets = [
  look("Clifford Torus", 8001, 0, 0.5, 0.6, 0.4, 0.3, 1, 0.7, 0.5),
  look("Thin Torus", 8002, 0, 0.2, 0.8, 0.6, -0.25, 1.1, 0.7, 0.6),
  look("Nested Tori", 8003, 1, 0.5, 0.9, 0.5, 0.25, 0.9, 0.65, 0.5),
  look("Loxodrome Fibres", 8004, 2, 0.5, 0.8, 0.6, 0.3, 0.9, 0.7, 0.6),
  look("Linked Rings", 8005, 3, 0.5, 0.5, 0.7, 0.2, 1, 0.75, 0.4),
  look("Ring Storm", 8006, 3, 0.9, 1, 1, -0.4, 0.8, 0.7, 0.7),
  look("Through Infinity", 8007, 0, 0.7, 0.7, 1, 0.15, 1.3, 0.7, 0.75),
  look("Fibre Bloom", 8008, 2, 0.15, 1, 0.3, 0.4, 1.2, 0.65, 0.8),
];

export default {
  id: "hopf",
  number: 80,
  name: "Hopf Fibration",
  description:
    "The 3-sphere is a bundle of great circles, one over every point of the 2-sphere. Projected into space, the circles over a circle of latitude fill a torus as Villarceau circles, and any two circles are linked exactly once. Each fibre takes the colour of its base point, so the picture shows the map and the bundle at once; a slow rotation in four dimensions carries circles through infinity and back. Fibres over a latitude, nested latitudes, a loxodrome, or scattered points.",
  energy: {
    tumble: { mul: [0.6, 1.6] },
    glow: [-0.1, 0.2],
    spin: { mul: [0.6, 1.8] },
  },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "tumble", feature: "low", amount: 0.05 },
    { param: "glow", feature: "onset", amount: 0.12 },
    { param: "latitude", feature: "high", amount: 0.04 },
  ],
  stage: ["tumble", "latitude", "spin"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [FIBRES, POINTS], steps: 1 },
  particles,
};
