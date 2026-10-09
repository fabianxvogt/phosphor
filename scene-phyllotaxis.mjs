// Phyllotaxis (#79): Vogel's model of a sunflower head. Seed n sits at
// radius c·√n and angle n·α. With α the golden angle 360°·(2 − φ) ≈
// 137.508°, the most irrational turn there is, the seeds pack evenly and
// the eye sees spiral arms (parastichies) in consecutive Fibonacci
// numbers. Colouring seed n by n mod F lights exactly F arms; F steps up
// the Fibonacci sequence on the beat (8, 13, 21, 34, 55, 89).
//
// Variants: the sunflower; an angle sweep through the golden angle,
// where rational angles p/q collapse the seeds onto q straight spokes;
// the Fibonacci sphere (the same rule on a sphere, turned in 3D); and
// growth, seeds born at the centre and pushed outward like a living
// flower head. Seeds are particles (stateless, up to 32 768).

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // radians
export const FIBONACCI = [8, 13, 21, 34, 55, 89];
const SIDE = 128; // 128 × 256 = 32 768 seeds

// Vogel's seed n (radius scale c, angle alpha) in the plane.
export const vogel = (n, alpha, c = 1) => [
  c * Math.sqrt(n) * Math.cos(n * alpha),
  c * Math.sqrt(n) * Math.sin(n * alpha),
];
// The Fibonacci sphere: N points, point i.
export function fibonacciSphere(i, N, alpha = GOLDEN_ANGLE) {
  const z = 1 - (2 * i + 1) / N,
    r = Math.sqrt(1 - z * z);
  return [r * Math.cos(i * alpha), r * Math.sin(i * alpha), z];
}

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
const float GOLDEN = ${GOLDEN_ANGLE.toFixed(10)};
const float FIB[6] = float[](${FIBONACCI.map((f) => `${f}.0`).join(", ")});
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 1.0;
  v_color = vec3(0.0);
  int variant = int(floor(u_params[0] + 0.5));
  float N = floor(500.0 * exp2(6.0 * clamp(u_params[1], 0.0, 1.0)));
  float angle = u_params[2];
  float speed = u_params[3];
  float sizeK = u_params[4];
  float arms = u_params[5];
  float glow = u_params[6];
  float persistence = clamp(u_params[7], 0.0, 0.95);
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;
  float beatPulse = u_beat > 0.0 ? exp(-4.0 * fract(u_beat)) : 0.0;
  float i = float(gl_VertexID);
  if (i >= N) return;

  float minSide = min(u_resolution.x, u_resolution.y);
  float R = 0.47;                       // head radius, in screen heights
  float c = R / sqrt(N);                // Vogel's spacing
  float alpha = GOLDEN + radians(angle * 2.0);
  float id = i;                         // the seed's identity (for colour)
  float n = i;                          // its place on the spiral
  float depthLight = 1.0;
  vec2 p;
  float sizeScale = 1.0;
  if (variant == 1) {
    // Sweep through the golden angle; rational angles make spokes.
    alpha = GOLDEN + radians(angle * 6.0) * sin(t * speed * 0.15);
  }
  if (variant == 2) {
    // Fibonacci sphere, turned in 3D.
    float z = 1.0 - (2.0 * i + 1.0) / N;
    float r = sqrt(max(1.0 - z * z, 0.0));
    vec3 q = vec3(r * cos(i * alpha), r * sin(i * alpha), z);
    float yaw = t * speed * 0.3, pitch = 0.6 + 0.3 * sin(t * 0.11);
    q.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * q.xz;
    q.yz = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch)) * q.yz;
    float depth = 3.0 + q.z;
    p = q.xy * 1.25 / depth;
    sizeScale = 3.0 / depth * 0.75;
    depthLight = mix(0.25, 1.0, smoothstep(1.0, -0.6, q.z));
    c = 2.0 * 0.42 / sqrt(N);
  } else {
    if (variant == 3) {
      // Growth: every seed moves out along the spiral; new ones are born
      // at the centre. Identity stays with the seed across the relabel.
      float phi = t * speed * N * 0.004;
      n = i + fract(phi);
      id = i - floor(phi);
    }
    float rr = c * sqrt(n);
    p = rr * vec2(cos(n * alpha), sin(n * alpha));
  }
  p = mat2(cos(t * 0.02), -sin(t * 0.02), sin(t * 0.02), cos(t * 0.02)) * p;
  gl_Position = vec4(p * 2.0 * minSide / u_resolution, 0.0, 1.0);
  float size = max(c * minSide * 2.0 * (0.5 + 0.9 * sizeK) * sizeScale, 1.5);
  gl_PointSize = size;

  // Colour: seed n mod F lights F parastichies; F climbs every 8 beats.
  int fi = int(mod(floor(beats / 8.0), 6.0));
  float F = FIB[fi];
  float armIdx = mod(id, F);
  float radial = sqrt(clamp(n / N, 0.0, 1.0));
  float hue = mix(radial * 0.8, armIdx / F, arms);
  // Alternate arms bright and dim, so exactly F spirals stand out.
  float alt = mix(1.0, mod(armIdx, 2.0) < 0.5 ? 1.25 : 0.3, arms);
  // A ring of light runs out from the centre on every beat.
  float ring = exp(-pow((radial - fract(beats)) * 14.0, 2.0)) * (0.4 + beatPulse);
  float light = glow * 1.5 * (1.0 - 0.85 * persistence) * (0.55 + 0.45 * u_level) * depthLight * alt;
  if (variant == 2) light *= 0.35;
  v_color = palette(fract(0.08 + 0.85 * hue)) * light * (0.8 + 1.4 * ring);
}
`,
};

const schema = [
  {
    key: "variant",
    label: "Model · sunflower / angle sweep / Fibonacci sphere / growth",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "seeds",
    label: "Seeds (500 → 32 000)",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "angle",
    label: "Angle offset (½° steps) · sweep width",
    min: -1,
    max: 1,
    step: 0.001,
    default: 0,
  },
  {
    key: "speed",
    label: "Sweep · turn · growth speed",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
  {
    key: "size",
    label: "Seed size",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.55,
  },
  {
    key: "arms",
    label: "Parastichy colour",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.8,
  },
  { key: "glow", label: "Light", min: 0, max: 1, step: 0.01, default: 0.7 },
  {
    key: "persistence",
    label: "Trails",
    min: 0,
    max: 0.95,
    step: 0.01,
    default: 0.3,
  },
];

const look = (
  name,
  seed,
  variant,
  seeds,
  angle,
  speed,
  size,
  arms,
  glow,
  persistence,
) => ({
  name,
  seed,
  params: { variant, seeds, angle, speed, size, arms, glow, persistence },
});

const presets = [
  look("Sunflower", 7901, 0, 0.35, 0, 0.3, 0.6, 0.9, 0.75, 0.2),
  look("Fibonacci Arms", 7902, 0, 0.55, 0, 0.3, 0.5, 1, 0.7, 0.3),
  look("Dense Head", 7903, 0, 0.85, 0, 0.3, 0.45, 0.7, 0.65, 0.2),
  look("Golden Sweep", 7904, 1, 0.5, 0.35, 0.4, 0.5, 0.6, 0.7, 0.75),
  look("Spokes and Spirals", 7905, 1, 0.65, 1, 0.25, 0.45, 0.3, 0.7, 0.85),
  look("Fibonacci Sphere", 7906, 2, 0.55, 0, 0.4, 0.55, 0.8, 0.75, 0.3),
  look("Golden Globe", 7907, 2, 0.8, 0, 0.25, 0.45, 0.5, 0.7, 0.5),
  look("Growing Head", 7908, 3, 0.45, 0, 0.35, 0.55, 0.9, 0.75, 0.4),
  look("Seed Fountain", 7909, 3, 0.7, 0, 0.8, 0.45, 0.6, 0.7, 0.7),
];

export default {
  id: "phyllotaxis",
  number: 79,
  name: "Phyllotaxis",
  description:
    "Vogel's sunflower: seed n at radius √n and angle n times the golden angle, 137.508°. The seeds pack evenly and form spiral arms in consecutive Fibonacci numbers; colouring seed n by n mod F lights exactly F arms, and F climbs 8, 13, 21, 34, 55, 89 on the beat. Variants sweep the angle (rational angles collapse into straight spokes), wrap the rule around a sphere, or let the head grow, seeds born at the centre and pushed outward.",
  energy: {
    speed: { mul: [0.5, 2] },
    glow: [-0.1, 0.2],
    persistence: [0.05, -0.1],
  },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "speed", feature: "low", amount: 0.06 },
    { param: "glow", feature: "onset", amount: 0.12 },
    { param: "size", feature: "high", amount: 0.06 },
  ],
  stage: ["speed", "arms", "size"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [SIDE, SIDE * 2], steps: 1 },
  particles,
};
