// Indra's Pearls (#74): limit sets of groups of Möbius maps, drawn per pixel
// by walking each point back into a fundamental domain. Every step applies
// one generator (a circle inversion composed with a reflection); the number
// of steps is the word length, which colours the nested pearls; points
// that never get out lie on the limit set and glow. Edges are measured in
// screen pixels by carrying the derivative of every map along.
//
// Variants:
//   0 Apollonian gasket: the strip packing (unit circles between two lines,
//     folded by translation, reflection and inversion in the unit circle),
//     sent into the disc by the Cayley map. Translating the strip is a
//     symmetry, so the whole gasket flows into itself around a tangency.
//   1 Schottky pearls: four circles paired by two generators. Apart, the
//     limit set is Cantor dust; as the circles kiss, the pearls close into
//     a necklace.
//   2 Loxodromic tunnel: a generator z → k·z (|k| > 1, complex) pairs two
//     circles around the origin; one more pairing fills the annulus. Zooming
//     by k is a symmetry, so the spiral dive loops seamlessly.
//   3 Steiner porism: a ring of n circles between two non-concentric ones.
//     The chain turns and always closes (Steiner's porism); every circle
//     holds the whole configuration again.

export const MAX_DEPTH = 48;

// Möbius helpers for the CPU tests (complex numbers as [re, im]).
export const cmul = ([a, b], [c, d]) => [a * c - b * d, a * d + b * c];
export const cdiv = ([a, b], [c, d]) => {
  const n = c * c + d * d;
  return [(a * c + b * d) / n, (b * c - a * d) / n];
};
// Inversion in the circle (centre c, radius r).
export function invert([x, y], [cx, cy], r) {
  const dx = x - cx,
    dy = y - cy,
    q = dx * dx + dy * dy;
  return [cx + (r * r * dx) / q, cy + (r * r * dy) / q];
}

// Apollonian strip walk: returns { depth, circle } for a strip point.
export function apollonianStrip([x, y], maxDepth = MAX_DEPTH) {
  if (y > 1) return { depth: 0, circle: "top" };
  for (let depth = 0; depth < maxDepth; depth++) {
    x -= Math.floor(x);
    if (y > 0.5) y = 1 - y;
    if (Math.hypot(x, y - 0.5) < 0.5 || Math.hypot(x - 1, y - 0.5) < 0.5)
      return { depth, circle: "strip" };
    const q = x * x + y * y;
    x /= q;
    y /= q;
  }
  return { depth: maxDepth, circle: null };
}

// Cayley map from the disc to the upper half plane, w = i(1 + z)/(1 − z).
export const cayley = (z) =>
  cmul([0, 1], cdiv([1 + z[0], z[1]], [1 - z[0], -z[1]]));
export const cayleyInverse = (w) => cdiv([w[0], w[1] - 1], [w[0], w[1] + 1]);

// Schottky generator a: inversion in the circle at (c, 0) after the
// reflection x → −x, so it maps the circle at (−c, 0) onto that one.
export const schottkyA = (z, c, r) => invert([-z[0], z[1]], [c, 0], r);

// Steiner chain between radius rho and 1 (concentric frame).
export function steinerRho(n) {
  const s = Math.sin(Math.PI / n);
  return (1 - s) / (1 + s);
}

const fragment = `
vec2 kMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 kDiv(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / dot(b, b); }
vec2 kExp(vec2 z) { return exp(z.x) * vec2(cos(z.y), sin(z.y)); }
// Inversion in circle (c, r); der collects |d/dz|.
vec2 kInv(vec2 z, vec2 c, float r, inout float der) {
  vec2 d = z - c;
  float q = max(dot(d, d), 1e-12);
  der *= r * r / q;
  return c + r * r * d / q;
}

void main() {
  int variant = int(floor(u_params[0] + 0.5));
  float zoom = u_params[1];
  float flow = u_params[2];
  float shape = u_params[3];
  int count = int(floor(u_params[4] + 0.5));
  int maxDepth = int(floor(u_params[5] + 0.5));
  float rim = u_params[6];
  float fill = u_params[7];
  float t = mod(u_time, 3600.0);
  float beatPulse = u_beat > 0.0 ? exp(-5.0 * fract(u_beat)) : 0.0;

  vec2 zs = aspectUV() * 2.3 / zoom;
  float px = max(length(fwidth(zs)) * 0.7, 1e-6);
  vec2 z = zs;
  float der = 1.0;
  float depth = 0.0, last = 0.0;
  float dLocal = 1e3;   // distance to the nearest rim, in local units
  float inner = 0.0;    // 0..1 how deep inside a pearl (for shading)
  bool limit = false;
  bool outside = false;

  if (variant == 0) {
    // Apollonian gasket: disc → upper half plane (Cayley) → strip.
    z = kMul(z, kExp(vec2(0.0, t * 0.01)));
    if (length(z) > 1.0) { outside = true; dLocal = length(z) - 1.0; }
    else {
      vec2 a = vec2(-0.75 * shape, 0.0);
      vec2 den = vec2(1.0, 0.0) - kMul(vec2(a.x, -a.y), z);
      der *= (1.0 - dot(a, a)) / dot(den, den);
      z = kDiv(z - a, den);
      vec2 om = vec2(1.0, 0.0) - z;
      der *= 2.0 / max(dot(om, om), 1e-9);
      vec2 p = kMul(vec2(0.0, 1.0), kDiv(vec2(1.0, 0.0) + z, om));
      p.x += fract(t * flow * 0.08);
      if (p.y > 1.0) { dLocal = p.y - 1.0; inner = clamp(dLocal * 0.5, 0.0, 1.0); }
      else {
        limit = true;
        for (int i = 0; i < ${MAX_DEPTH}; i++) {
          if (i >= maxDepth || px * der > 1.5) break;
          p.x -= floor(p.x);
          if (p.y > 0.5) p.y = 1.0 - p.y;
          float d0 = length(p - vec2(0.0, 0.5)), d1 = length(p - vec2(1.0, 0.5));
          if (min(d0, d1) < 0.5) {
            dLocal = 0.5 - min(d0, d1);
            inner = dLocal * 2.0;
            limit = false;
            break;
          }
          float q = dot(p, p);
          p /= q;
          der /= q;
          depth += 1.0;
        }
      }
      // Size of the pearl on screen colours it (small pearls drift hue).
      last = clamp(-log(max(0.5 / der, 1e-6)) * 0.18, 0.0, 2.0);
    }
  } else if (variant == 1) {
    // Schottky group: a pairs the circles at (±c, 0), b those at (0, ±c).
    z = kMul(z, kExp(vec2(0.0, t * flow * 0.05)));
    float c = 1.0;
    float kiss = clamp(shape + 0.04 * beatPulse * u_level, 0.0, 0.995);
    float r = c * 0.70710678 * mix(0.55, 1.0, kiss);
    limit = true;
    for (int i = 0; i < ${MAX_DEPTH}; i++) {
      if (i >= maxDepth || px * der > 1.5) break;
      if (length(z - vec2(c, 0.0)) < r) { z = kInv(z, vec2(c, 0.0), r, der); z.x = -z.x; last = 0.0; }
      else if (length(z + vec2(c, 0.0)) < r) { z.x = -z.x; z = kInv(z, vec2(c, 0.0), r, der); last = 1.0; }
      else if (length(z - vec2(0.0, c)) < r) { z = kInv(z, vec2(0.0, c), r, der); z.y = -z.y; last = 2.0; }
      else if (length(z + vec2(0.0, c)) < r) { z.y = -z.y; z = kInv(z, vec2(0.0, c), r, der); last = 3.0; }
      else { limit = false; break; }
      depth += 1.0;
    }
    dLocal = min(min(length(z - vec2(c, 0.0)), length(z + vec2(c, 0.0))),
                 min(length(z - vec2(0.0, c)), length(z + vec2(0.0, c)))) - r;
    inner = clamp(dLocal / r, 0.0, 1.0);
  } else if (variant == 2) {
    // Loxodromic tunnel: a(z) = k·z, b pairs two circles in the annulus.
    // The dive multiplies by k⁻² per loop (two levels), and the level
    // parity tints the rings, so the loop is seamless.
    float L = log(2.2);
    vec2 lk = vec2(L, shape * PI);
    float tau = 2.0 * fract(t * flow * 0.02);
    z = kMul(z * 1.4, kExp(-lk * tau));
    der *= 1.4 * exp(-L * tau);
    float m = exp(0.5 * L);
    float r = m * (0.12 + 0.025 * float(count));
    limit = true;
    for (int i = 0; i < ${MAX_DEPTH}; i++) {
      if (i >= maxDepth || px * der > 1.5) break;
      float n = floor(log(max(length(z), 1e-9)) / L);
      if (i == 0) last = mod(n, 2.0) * 0.5;
      z = kMul(z, kExp(-n * lk));
      der *= exp(-n * L);
      if (length(z - vec2(m, 0.0)) < r) { z = kInv(z, vec2(m, 0.0), r, der); z.x = -z.x; last += 0.25; }
      else if (length(z + vec2(m, 0.0)) < r) { z.x = -z.x; z = kInv(z, vec2(m, 0.0), r, der); last += 0.6; }
      else { limit = false; break; }
      depth += 1.0;
    }
    float lz = length(z);
    dLocal = min(min(length(z - vec2(m, 0.0)), length(z + vec2(m, 0.0))) - r, min(lz - 1.0, 2.2 - lz));
    inner = clamp(min(length(z - vec2(m, 0.0)), length(z + vec2(m, 0.0))) / m - r / m, 0.0, 1.0);
  } else {
    // Steiner porism: n circles between two non-concentric circles.
    float n = float(3 + count);
    float sA = sin(PI / n);
    float rho = (1.0 - sA) / (1.0 + sA);
    float R = 0.5 * (1.0 + rho), s = 0.5 * (1.0 - rho);
    vec2 a = vec2(0.6 * shape, 0.0);
    if (length(z) > 1.0) { outside = true; dLocal = length(z) - 1.0; }
    else {
      // Word length / 8 nested levels keep each chain readable.
      int levels = max(2, maxDepth / 8);
      for (int i = 0; i < ${MAX_DEPTH}; i++) {
        if (px * der > 1.5) { limit = true; break; }
        if (i >= levels) {
          dLocal = 1.0 - length(z);
          inner = clamp(dLocal, 0.0, 1.0);
          break;
        }
        // Into the concentric frame, then turn the chain.
        vec2 den = vec2(1.0, 0.0) + kMul(vec2(a.x, -a.y), z);
        der *= (1.0 - dot(a, a)) / dot(den, den);
        vec2 w = kDiv(z + a, den);
        float dir = mod(depth, 2.0) < 0.5 ? 1.0 : -1.0;
        w = kMul(w, kExp(vec2(0.0, -dir * t * flow * 0.3)));
        float rw = length(w);
        if (rw < rho) { z = w / rho; der /= rho; depth += 1.0; last = n; continue; }
        float sector = TAU / n;
        float k = floor(atan(w.y, w.x) / sector + 0.5);
        vec2 ck = R * vec2(cos(k * sector), sin(k * sector));
        if (length(w - ck) < s) { z = (w - ck) / s; der /= s; depth += 1.0; last = mod(k, n); continue; }
        vec2 cn = R * vec2(cos((k + 1.0) * sector), sin((k + 1.0) * sector));
        vec2 cp = R * vec2(cos((k - 1.0) * sector), sin((k - 1.0) * sector));
        dLocal = min(min(rw - rho, 1.0 - rw), min(length(w - ck), min(length(w - cn), length(w - cp))) - s);
        inner = clamp(dLocal / s, 0.0, 1.0);
        break;
      }
    }
  }

  // Shading: pearls by word length, glowing rims, a bright limit set.
  float edge = dLocal / max(der, 1e-9) / px;
  float rimBoost = 1.0 + 0.8 * beatPulse * u_level;
  float line = exp(-edge * edge / (1.0 + 8.0 * rim));
  vec3 neon = mix(u_primary, vec3(1.0), 0.35);
  float hue = fract(0.17 * depth + 0.29 * last + 0.05);
  vec3 pearl = palette(hue) * fill * (0.25 + 0.75 * exp(-0.05 * depth)) * (0.45 + 0.55 * sqrt(inner));
  vec3 colour = outside ? u_secondary * 0.03 : pearl;
  colour += neon * line * (0.5 + 0.5 * rim) * rimBoost * (outside ? 0.6 : 1.0);
  // The limit set: where the pearls shrink below a pixel.
  if (limit) colour = mix(pearl, mix(neon, vec3(1.0), 0.2), 0.6) * (0.65 + 0.35 * u_level);
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "variant",
    label: "Group · Apollonian / Schottky / loxodromic tunnel / Steiner porism",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  { key: "zoom", label: "Zoom", min: 0.5, max: 4, step: 0.01, default: 1 },
  {
    key: "flow",
    label: "Flow (gasket flow · spin · dive · chain turn)",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
  {
    key: "shape",
    label: "Shape (lens · kiss · twist · offset)",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "count",
    label: "Chain circles − 3 · tunnel pearl size",
    min: 0,
    max: 6,
    step: 1,
    default: 3,
  },
  {
    key: "depth",
    label: "Word length (Steiner: levels × 8)",
    min: 8,
    max: MAX_DEPTH,
    step: 1,
    default: 36,
  },
  { key: "rim", label: "Rim glow", min: 0, max: 1, step: 0.01, default: 0.5 },
  {
    key: "fill",
    label: "Pearl fill",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.7,
  },
];

const look = (
  name,
  seed,
  variant,
  zoom,
  flow,
  shape,
  count,
  depth,
  rim,
  fill,
) => ({
  name,
  seed,
  params: { variant, zoom, flow, shape, count, depth, rim, fill },
});

const presets = [
  look("Apollonian Flow", 7401, 0, 1.25, 0.35, 0, 3, 40, 0.5, 0.7),
  look("Integer Gasket", 7402, 0, 1.1, 0.12, 0.35, 3, 48, 0.4, 0.8),
  look("Gasket Lens", 7403, 0, 1.6, 0.4, 0.75, 3, 40, 0.6, 0.6),
  look("Indra's Pearls", 7404, 1, 1.15, 0.2, 0.85, 3, 36, 0.5, 0.7),
  look("Cantor Dust", 7405, 1, 1, 0.3, 0.45, 3, 30, 0.7, 0.45),
  look("Kissing Necklace", 7406, 1, 1.1, 0.15, 0.985, 3, 44, 0.4, 0.75),
  look("Loxodromic Dive", 7407, 2, 1, 0.5, 0.35, 3, 36, 0.5, 0.6),
  look("Hyperbolic Dive", 7408, 2, 1, 0.4, 0, 5, 36, 0.55, 0.65),
  look("Steiner Porism", 7409, 3, 1, 0.4, 0.45, 3, 24, 0.5, 0.7),
  look("Steiner Triplets", 7410, 3, 1, 0.5, 0.3, 0, 24, 0.55, 0.65),
  look("Nine-ring Chain", 7411, 3, 1, 0.3, 0.55, 6, 20, 0.45, 0.75),
];

export default {
  id: "kleinian",
  number: 74,
  name: "Indra's Pearls",
  description:
    "Limit sets of Möbius groups, drawn by walking every point back through circle inversions. The Apollonian gasket flows into itself around a tangency point; Schottky pearls nest by word length and close into a necklace as their circles kiss; a loxodromic generator turns the plane into an endless spiral dive; a Steiner chain turns and always closes, with the whole configuration repeated inside every circle. Pearls are coloured by word length, rims glow, and the limit set shines.",
  maxRenderWidth: 1600,
  energy: { flow: { mul: [0.5, 2] }, rim: [-0.1, 0.25], fill: [0.1, -0.1] },
  beat: { punch: 0.7, pulse: 1 },
  audio: [
    { param: "flow", feature: "low", amount: 0.06 },
    { param: "rim", feature: "high", amount: 0.1 },
    { param: "shape", feature: "onset", amount: 0.04 },
  ],
  stage: ["flow", "shape", "rim"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
};
