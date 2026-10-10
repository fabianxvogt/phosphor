// Domain Colouring (#82): a complex function f shown on the plane, hue by
// arg f, light by log |f|. Lines of constant phase and constant log
// modulus form a conformal grid: they cross at right angles everywhere
// except at zeros, poles and critical points. Log-modulus bands flow, so
// zeros send rings outward and poles swallow them; around a zero the
// colours turn one way, around a pole the other (the argument principle).
//
// Variants:
//   0 Rational: three zeros and three poles orbit, and every 8 beats they
//     trade places (the colour wheels reverse).
//   1 Riemann zeta along the critical line, by Borwein's accelerated
//     Dirichlet eta series (40 terms): the nontrivial zeros line up on
//     Re s = ½ as the view travels up and down the line; the pole at s = 1
//     and the trivial zeros −2, −4 appear near the start.
//   2 Möbius net: g = (z − p)/(z − q) gives the Steiner circles (bipolar
//     coordinates); a twist turns them into loxodromes, and the bands flow
//     from one fixed point to the other.
//   3 Iterated z² + c: the n-th iterate, a polynomial of degree 2ⁿ, whose
//     zeros crowd toward the Julia set; n climbs on the beat.

const ZETA_TERMS = 40;
// Borwein's coefficients e_k = (d_k − d_n)/d_n (Algorithm 2).
export function borweinCoefficients(n = ZETA_TERMS) {
  const d = [1];
  let T = 1;
  for (let i = 1; i <= n; i++) {
    T *= (4 * (n + i - 1) * (n - i + 1)) / (2 * i * (2 * i - 1));
    d.push(d[i - 1] + T);
  }
  return d.slice(0, n).map((dk) => (dk - d[n]) / d[n]);
}
// ζ(s) for s = [σ, t] (CPU reference of the shader).
export function zeta([s, t], n = ZETA_TERMS) {
  const e = borweinCoefficients(n);
  let re = 0,
    im = 0;
  for (let k = 0; k < n; k++) {
    const l = Math.log(k + 1),
      mag = Math.exp(-s * l),
      sign = k % 2 ? 1 : -1;
    re += sign * e[k] * mag * Math.cos(t * l);
    im -= sign * e[k] * mag * Math.sin(t * l);
  }
  const l2 = Math.log(2),
    m2 = Math.exp((1 - s) * l2);
  const dr = 1 - m2 * Math.cos(t * l2),
    di = m2 * Math.sin(t * l2);
  const q = dr * dr + di * di;
  return [(re * dr + im * di) / q, (im * dr - re * di) / q];
}
export const ZETA_ZEROS = [
  14.134725, 21.02204, 25.010858, 30.424876, 32.935062, 37.586178,
];

const coefficients = borweinCoefficients()
  .map((c) => c.toExponential(8))
  .join(", ");

const fragment = `
const float ZETA_E[${ZETA_TERMS}] = float[](${coefficients});
vec2 cMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cDiv(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / max(dot(b, b), 1e-30); }
vec2 dZeta(vec2 s) {
  vec2 eta = vec2(0.0);
  for (int k = 0; k < ${ZETA_TERMS}; k++) {
    float l = log(float(k + 1));
    float mag = exp(-s.x * l);
    float sgn = (k & 1) == 1 ? 1.0 : -1.0;
    eta += sgn * ZETA_E[k] * mag * vec2(cos(s.y * l), -sin(s.y * l));
  }
  float l2 = log(2.0), m2 = exp((1.0 - s.x) * l2);
  return cDiv(eta, vec2(1.0 - m2 * cos(s.y * l2), m2 * sin(s.y * l2)));
}
// A cyclic colour wheel from the three palette colours (no seam at ±π).
vec3 colourWheel(float ph) {
  vec3 w = pow(0.5 + 0.5 * cos(TAU * (ph - vec3(0.0, 1.0, 2.0) / 3.0)), vec3(1.5));
  return (u_secondary * w.x + u_primary * w.y + u_accent * w.z) / max(w.x + w.y + w.z, 1e-3) * 1.15;
}
float dHash(float a) { return fract(sin(a * 12.9898 + float(u_seedBits % 991u) * 0.71) * 43758.5453); }
vec2 dOrbit(float k, float t, float motion) {
  float a = TAU * dHash(k) + t * motion * (0.15 + 0.2 * dHash(k + 9.0)) * (dHash(k + 4.0) < 0.5 ? 1.0 : -1.0);
  float r = 0.35 + 0.6 * dHash(k + 2.0);
  return r * vec2(cos(a), sin(a) * 0.8);
}
void main() {
  int variant = int(floor(u_params[0] + 0.5));
  float zoom = u_params[1];
  float motion = u_params[2];
  float grid = u_params[3];
  float bands = u_params[4];
  float flow = u_params[5];
  float sectors = floor(u_params[6] + 0.5);
  float glow = u_params[7];
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;
  float beatPulse = u_beat > 0.0 ? exp(-5.0 * fract(u_beat)) : 0.0;
  vec2 uv = aspectUV();

  vec2 F;
  vec2 gridUV = vec2(0.0); // phase, log-modulus (or the Möbius net)
  bool usePoles = true;
  float trust = 1.0;
  if (variant == 0) {
    vec2 z = uv * 3.2 / zoom;
    // Zeros and poles trade places every 8 beats (over one beat).
    float swap = smoothstep(0.0, 1.0, clamp(mod(beats, 8.0), 0.0, 1.0));
    bool odd = mod(floor(beats / 8.0), 2.0) > 0.5;
    float w = odd ? 1.0 - swap : swap;
    F = vec2(1.0, 0.0);
    for (int k = 0; k < 3; k++) {
      vec2 a = dOrbit(float(k), t, motion), b = dOrbit(float(k) + 20.0, t, motion);
      vec2 zero = mix(a, b, w), pole = mix(b, a, w);
      F = cMul(F, cDiv(z - zero, z - pole));
    }
  } else if (variant == 1) {
    // Critical line horizontal; travel up and down it.
    float centre = 4.0 + 36.0 * (0.5 - 0.5 * cos(t * motion * 0.03));
    float span = 6.0 / zoom;
    vec2 s = vec2(0.9 - uv.y * span, centre + uv.x * span);
    F = dZeta(s);
    // Float precision limits the series far left of the strip: fade there.
    trust = smoothstep(-1.5, -0.9, s.x);
  } else if (variant == 2) {
    vec2 z = uv * 3.0 / zoom;
    vec2 p = vec2(-0.7, 0.0) + 0.25 * vec2(cos(t * 0.1), sin(t * 0.13));
    vec2 q = vec2(0.7, 0.0) + 0.25 * vec2(cos(t * 0.11 + 2.0), sin(t * 0.09 + 1.0));
    vec2 g = cDiv(z - p, z - q);
    // Loxodromic twist: phase picks up log-modulus.
    float twist = 0.6 * sin(t * motion * 0.05);
    float lg = log(length(g));
    float ang = atan(g.y, g.x) + twist * lg;
    F = exp(lg) * vec2(cos(ang), sin(ang));
  } else {
    vec2 z = uv * 3.2 / zoom;
    vec2 c = vec2(-0.75, 0.12) + 0.08 * vec2(cos(t * motion * 0.11), sin(t * motion * 0.17));
    int n = 1 + int(mod(floor(beats / 8.0), 6.0));
    F = z;
    for (int i = 0; i < 6; i++) {
      if (i >= n) break;
      F = cMul(F, F) + c;
      if (dot(F, F) > 1e12) break;
    }
    usePoles = false;
  }

  float m = max(length(F), 1e-20);
  float lm = log(m);
  float ph = atan(F.y, F.x) / TAU;
  // Hue by phase; brightness bands by log2 |f|, flowing outward.
  float band = fract(lm / log(2.0) - t * flow * 0.6);
  float shade = mix(1.0, 0.5 + 0.5 * band, bands);
  float light = variant == 3 ? clamp(1.6 - 0.07 * lm, 0.25, 1.0) : 1.0;
  vec3 colour = colourWheel(ph + 0.05 * beatPulse) * shade * light * 0.85;

  // The conformal grid: phase lines and log-modulus lines, square cells.
  float a1 = ph * sectors, a2 = fract(ph * sectors + 0.5);
  float w1 = min(fwidth(a1), fwidth(a2));
  float d1 = abs(fract(a1 + 0.5) - 0.5) / max(w1, 1e-5);
  float q = lm * sectors / TAU - t * flow * 0.1;
  float d2 = abs(fract(q + 0.5) - 0.5) / max(fwidth(q), 1e-5);
  float lines = 1.0 - smoothstep(0.4, 1.4, min(d1, d2));
  colour = mix(colour, mix(u_primary, vec3(1.0), 0.6), lines * grid * (0.55 + 0.45 * u_level));

  // Zeros (|f| → 0) and poles (|f| → ∞) glow.
  float zeroGlow = exp(-m * 6.0);
  float poleGlow = usePoles ? exp(-6.0 / m) : 0.0;
  colour += mix(u_accent, vec3(1.0), 0.5) * (zeroGlow + poleGlow) * glow * (0.7 + 0.6 * beatPulse);
  outColor = vec4(clamp(colour * trust, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "variant",
    label: "Function · rational / Riemann zeta / Möbius net / iterated z² + c",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  { key: "zoom", label: "Zoom", min: 0.4, max: 4, step: 0.01, default: 1 },
  { key: "motion", label: "Motion", min: 0, max: 1, step: 0.01, default: 0.4 },
  {
    key: "grid",
    label: "Conformal grid",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "bands",
    label: "Modulus bands",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  { key: "flow", label: "Band flow", min: 0, max: 1, step: 0.01, default: 0.4 },
  {
    key: "sectors",
    label: "Phase lines",
    min: 4,
    max: 24,
    step: 1,
    default: 12,
  },
  {
    key: "glow",
    label: "Zero and pole glow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
];

const look = (
  name,
  seed,
  variant,
  zoom,
  motion,
  grid,
  bands,
  flow,
  sectors,
  glow,
) => ({
  name,
  seed,
  params: { variant, zoom, motion, grid, bands, flow, sectors, glow },
});

const presets = [
  look("Zeros and Poles", 8201, 0, 1, 0.4, 0.5, 0.6, 0.4, 12, 0.5),
  look("Pole Dance", 8202, 0, 0.8, 0.8, 0.35, 0.8, 0.7, 8, 0.6),
  look("Conformal Grid", 8203, 0, 1.2, 0.3, 1, 0.3, 0.3, 16, 0.4),
  look("Critical Line", 8204, 1, 1, 0.5, 0.5, 0.6, 0.4, 12, 0.5),
  look("Zeta Bands", 8205, 1, 0.7, 0.35, 0.3, 0.9, 0.6, 8, 0.6),
  look("Steiner Net", 8206, 2, 1, 0.4, 0.9, 0.4, 0.4, 16, 0.4),
  look("Loxodrome Flow", 8207, 2, 0.8, 0.9, 0.6, 0.8, 0.8, 12, 0.5),
  look("Julia Polynomial", 8208, 3, 1, 0.4, 0.4, 0.7, 0.5, 12, 0.5),
  look("Degree Doubling", 8209, 3, 1.4, 0.6, 0.6, 0.5, 0.4, 8, 0.5),
];

export default {
  id: "domain",
  number: 82,
  name: "Domain Colouring",
  description:
    "Complex functions on the plane: hue by phase, light by log modulus, and a conformal grid of phase and modulus lines that cross at right angles everywhere but at zeros and poles. Bands flow, so zeros send rings out and poles swallow them. Three zeros and three poles orbit and trade places; the Riemann zeta function travels along its critical line with its zeros lined up on Re s = ½; a Möbius map draws Steiner circles and loxodromes; iterating z² + c doubles the degree on the beat.",
  energy: {
    motion: { mul: [0.5, 2] },
    flow: { mul: [0.5, 2] },
    glow: [-0.1, 0.25],
  },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "flow", feature: "low", amount: 0.06 },
    { param: "glow", feature: "onset", amount: 0.12 },
    { param: "grid", feature: "high", amount: 0.08 },
  ],
  stage: ["motion", "flow", "grid"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
};
