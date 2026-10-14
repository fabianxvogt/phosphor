import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

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

// Texel (0, 0) integrates the camera yaw as a 24-bit fraction of a turn, so
// energy and the spin fader change turning speed without jumping the view.
const simulation = `
float unpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
vec4 pack24(float x) {
  float n = floor(fract(x) * 16777216.);
  float b0 = floor(n / 65536.); n -= b0 * 65536.;
  float b1 = floor(n / 256.); n -= b1 * 256.;
  return vec4(b0, b1, n, 255.) / 255.;
}
void main() {
  if (ivec2(gl_FragCoord.xy) != ivec2(0)) { outColor = vec4(0.0); return; }
  float yaw = unpack24(texelFetch(u_state, ivec2(0), 0));
  outColor = pack24(u_reset ? 0.0 : yaw + u_dt * u_params[4] * 0.2 / 6.283185307179586);
}
`;

const fragment = `
void main() {
  vec3 previous = u_reset ? vec3(0.0) : texture(u_previous, v_uv).rgb;
  emit(vec4(previous * pow(clamp(u_params[7], 0.0, 0.95), u_dt * 60.0), 1.0));
}
`;

const particles = {
  vertex: `${lateClockGlsl}
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
#ifdef PHOSPHOR_LATE
  float t = u_time;
#else
  float t = mod(u_time, 3600.0);
#endif
  float beatPulse = u_rhythmEnabled ? u_rhythm.x : u_beat > 0.0 ? exp(-4.0 * fract(u_beat)) : 0.0;

  int f = gl_VertexID / ${POINTS};
  int k = gl_VertexID % ${POINTS};
  int nF = variant == 3 ? int(12.0 + 52.0 * fibresK) : int(32.0 + 224.0 * fibresK);
  if (f >= nF) return;
  float u = (float(f) + 0.5) / float(nF);

  // Base point (θ polar, φ longitude) on S² for each fibre.
  float theta, phi;
  float breathe = 0.12 * sin(t * 0.21) + 0.12 * u_rhythm.y * sin(float(f) * 0.13 + u_rhythmCount.y);
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
#ifdef PHOSPHOR_LATE
    // Latitude follows audio, so this drift integrates (clock 0, modulo 2π).
    phi = float(f) * GOLDEN + u_clock[0];
#else
    phi = float(f) * GOLDEN + t * 0.05 * (1.0 + latitude);
#endif
  }
  float s = TAU_H * float(k) / ${POINTS}.0;
  float eta = 0.5 * theta;
  vec4 q = vec4(cos(eta) * cos(s + phi), cos(eta) * sin(s + phi), sin(eta) * cos(s), sin(eta) * sin(s));

  // Exact tangent of the fibre: q'(s) = (−q.y, q.x, −q.w, q.z).
  vec4 dq = vec4(-q.y, q.x, -q.w, q.z);
  // A slow 4D tumble carries circles through infinity and back.
  float a = tumble * 0.7 * sin(t * 0.07), b = tumble * 0.5 * sin(t * 0.05 + 1.0);
  mat2 ra = mat2(cos(a), -sin(a), sin(a), cos(a)), rb = mat2(cos(b), -sin(b), sin(b), cos(b));
  q.xw = ra * q.xw; q.yz = rb * q.yz;
  dq.xw = ra * dq.xw; dq.yz = rb * dq.yz;
  float den = 1.0 - q.w;
  if (den < 0.04) return;
  vec3 p = q.xyz / den;
  vec3 dp = dq.xyz / den + q.xyz * dq.w / (den * den);
  if (length(p) > 8.0) return;

  // Camera.
  vec3 yawBytes = floor(texelFetch(u_state, ivec2(0), 0).rgb * 255.0 + 0.5);
  float yaw = TAU_H * dot(yawBytes, vec3(65536.0, 256.0, 1.0)) / 16777216.0, pitch = 0.45 + 0.25 * sin(t * 0.09);
  mat2 ryaw = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)), rpitch = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch));
  p.xz = ryaw * p.xz; p.yz = rpitch * p.yz;
  dp.xz = ryaw * dp.xz; dp.yz = rpitch * dp.yz;
  // Illuminated lines: a fibre is lit by its tangent against a key light, so
  // every circle reads as a lit 3D wire (diffuse and a specular glint).
  vec3 T = normalize(dp + 1e-6);
  vec3 L = normalize(vec3(-0.5, 0.7, -0.5)), H = normalize(L + vec3(0.0, 0.0, -1.0));
  float lt = dot(L, T), ht = dot(H, T);
  float diffuse = sqrt(max(0.0, 1.0 - lt * lt));
  float glint = pow(sqrt(max(0.0, 1.0 - ht * ht)), 48.0);
  float depth = 5.5 / zoom + p.z;
  if (depth < 0.3) return;
  vec2 screen = p.xy * 2.2 / depth;
  float minSide = min(u_resolution.x, u_resolution.y);
  gl_Position = vec4(screen * minSide / u_resolution, 0.0, 1.0);
  float size = 2.0 * minSide / 1080.0 * clamp(5.0 / depth, 0.6, 2.0);
  gl_PointSize = max(size, 1.5);
  // Colour by the base point on S²: palette by longitude (seamless, accent
  // kept for glints), light by latitude. Distance fades into the dark.
  float hue = 0.06 + 0.56 * (0.5 - 0.5 * cos(phi));
  float fog = clamp(1.65 - 0.2 * depth, 0.2, 1.35);
  float light = glow * 0.6 * (1.0 - 0.85 * persistence) * fog * 0.8;
  if (variant == 3) light *= 2.2;
  float cohort = mod(float(f) - u_rhythmCount.x, 8.0) < 1.0 ? 1.0 : 0.0;
  // An entire linked fibre grows legible, preserving its exact curve.
  gl_PointSize *= 1.0 + cohort * beatPulse * 0.7;
  float latitudeWave = exp(-pow((theta / PI_H - fract(u_rhythmCount.y * 0.173)) / 0.16, 2.0));
  v_color = palette(hue) * light * (0.6 + 0.4 * sin(theta)) * (0.3 + 0.95 * diffuse) * (1.0 + cohort * beatPulse * 2.4);
  v_color += mix(vec3(1.0), u_accent, 0.35) * light * glint * 0.9;
  v_color += mix(palette(hue), u_accent, 0.5) * light * latitudeWave * u_rhythm.y * 0.8;
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
  rhythm: [
    familyEffect("linked-fibres", 0, "Linked-fibre chase", "Light one interleaved group of complete Hopf circles."),
    familyEffect("latitude-sweep", 1, "Latitude sweep", "Illuminate and gently move a base-sphere latitude cohort; fibres remain linked.", { period: 4, duration: 1.5, strength: 0.55, kind: "motion" }),
  ],
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
  clocks: [{ rate: (p) => 0.05 * (1 + p[1]), period: 2 * Math.PI }],
};
