// Newton Basins (#68): Newton's method z ← z − a·p(z)/p'(z) run on every
// pixel of the complex plane. Each pixel is coloured by the root it ends up
// at, shaded by how long it took. Between the basins lies a fractal border
// with the Wada property: at every point of it, all basins meet, so the
// colours braid into ever smaller beads around each other.
//
// With the roots r_k known, p'/p = Σ 1/(z − r_k), so a Newton step is
// z − a / Σ 1/(z − r_k), and Halley's step is z − 2·S1/(S1² + S2) with
// S2 = Σ 1/(z − r_k)². Moving the roots moves the whole fractal smoothly.
//
// Variants (method): 0 z³ − 1 turning, 1 five wandering roots, 2 Halley's
// method on four wandering roots, 3 Nova (c = pixel, the Mandelbrot of
// Newton), 4 roots of unity zⁿ − 1 whose degree morphs 3 → 8.

export const MAX_ROOTS = 8;
const ITER_CAP = 96;

// CPU reference (tests): roots for a method at time t, and the basin of z.
export function roots(method, t, drift = 0.3, seed = 0) {
  const turn = t * drift * 0.05;
  const ring = (n, r, phase) =>
    Array.from({ length: n }, (_, k) => {
      const a = (2 * Math.PI * k) / n + phase;
      return [r * Math.cos(a), r * Math.sin(a)];
    });
  if (method === 0) return ring(3, 1, turn * 2 * Math.PI);
  if (method === 4) {
    const tri = 1 - Math.abs(((t * drift * 0.01) % 1) * 2 - 1);
    const d = 3 + 4.98 * tri;
    const n = Math.floor(d);
    const x = d - n;
    const g = x * x * (3 - 2 * x);
    return Array.from({ length: n + 1 }, (_, k) => {
      const a = (2 * Math.PI * k) / n + turn;
      const b = (2 * Math.PI * k) / (n + 1) + turn;
      const m = a + (b - a) * g;
      return [Math.cos(m), Math.sin(m)];
    });
  }
  const n = method === 2 ? 4 : 5;
  return Array.from({ length: n }, (_, k) => {
    const a =
      2 *
      Math.PI *
      (k / n + 0.13 * Math.sin(turn * (1.3 + k * 0.37) + seed + k));
    const r = 0.75 + 0.3 * Math.sin(turn * (0.9 + 0.21 * k) + k * 1.7 + seed);
    return [r * Math.cos(a), r * Math.sin(a)];
  });
}

const cdiv = ([a, b], [c, d]) => {
  const den = c * c + d * d;
  return [(a * c + b * d) / den, (b * c - a * d) / den];
};

export function newtonStep(z, rs, relax = 1, halley = false) {
  let s1 = [0, 0],
    s2 = [0, 0];
  for (const r of rs) {
    const inv = cdiv([1, 0], [z[0] - r[0], z[1] - r[1]]);
    s1 = [s1[0] + inv[0], s1[1] + inv[1]];
    s2 = [
      s2[0] + inv[0] * inv[0] - inv[1] * inv[1],
      s2[1] + 2 * inv[0] * inv[1],
    ];
  }
  if (halley) {
    const s1sq = [s1[0] * s1[0] - s1[1] * s1[1], 2 * s1[0] * s1[1]];
    const step = cdiv(
      [2 * s1[0], 2 * s1[1]],
      [s1sq[0] + s2[0], s1sq[1] + s2[1]],
    );
    return [z[0] - relax * step[0], z[1] - relax * step[1]];
  }
  const step = cdiv([1, 0], s1);
  return [z[0] - relax * step[0], z[1] - relax * step[1]];
}

// Index of the root z converges to, or -1.
export function basin(z, rs, { relax = 1, halley = false, max = 96 } = {}) {
  for (let n = 0; n < max; n++) {
    for (let k = 0; k < rs.length; k++)
      if (Math.hypot(z[0] - rs[k][0], z[1] - rs[k][1]) < 1e-4) return k;
    z = newtonStep(z, rs, relax, halley);
    if (!Number.isFinite(z[0]) || !Number.isFinite(z[1])) return -1;
  }
  return -1;
}

const fragment = `
const int ITER_CAP = ${ITER_CAP};
const int MAX_ROOTS = ${MAX_ROOTS};
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cinv(vec2 a) { return vec2(a.x, -a.y) / max(dot(a, a), 1e-30); }
vec2 cdiv(vec2 a, vec2 b) { return cmul(a, cinv(b)); }

void main() {
  int method = int(floor(u_params[0] + 0.5));
  float relax = u_params[1];
  float zoom = u_params[2];
  float drift = u_params[3];
  float spin = u_params[4];
  float glowAmount = u_params[5];
  float rings = u_params[6];
  int detail = int(u_params[7]);
  // Long periods wrapped by mod keep float time exact over a night.
  float t = mod(u_time, 3600.0);
  float turn = t * drift * 0.05;
  float seed = float(u_seedBits % 997u) * 0.01;

  vec2 r[MAX_ROOTS];
  int n;
  if (method == 0) {
    n = 3;
    for (int k = 0; k < 3; k++) {
      float a = TAU * float(k) / 3.0 + turn * TAU;
      r[k] = vec2(cos(a), sin(a));
    }
  } else if (method == 4) {
    // The degree glides 3 → 8 → 3. Between degrees the extra root grows out
    // of root 0 while the others spread to the (n+1)-gon, so the n-fold star
    // never jumps.
    float d = 3.0 + 4.98 * (1.0 - abs(fract(t * drift * 0.01) * 2.0 - 1.0));
    n = int(floor(d));
    float grow = smoothstep(0.0, 1.0, fract(d));
    for (int k = 0; k < MAX_ROOTS; k++) {
      if (k > n) break;
      float a = TAU * float(k) / float(n) + turn;
      float b = TAU * float(k) / float(n + 1) + turn;
      r[k] = vec2(cos(mix(a, b, grow)), sin(mix(a, b, grow)));
    }
    n += 1;
  } else {
    n = method == 2 ? 4 : 5;
    for (int k = 0; k < 5; k++) {
      if (k >= n) break;
      float fk = float(k);
      float a = TAU * (fk / float(n) + 0.13 * sin(turn * (1.3 + fk * 0.37) + seed + fk));
      float rad = 0.75 + 0.3 * sin(turn * (0.9 + 0.21 * fk) + fk * 1.7 + seed);
      r[k] = rad * vec2(cos(a), sin(a));
    }
  }

  // Camera: slow spin and a breathing zoom toward the basin borders, where
  // the beads keep shrinking.
  float breathe = 1.0 + 0.35 * sin(t * 0.07 + seed);
  vec2 centre = 0.18 * vec2(sin(t * 0.031 + seed), cos(t * 0.023));
  vec2 z = rot2(t * spin * 0.1) * aspectUV() * (2.4 / (zoom * breathe)) + centre;
  vec2 c = z;
  if (method == 3) z = vec2(1.0, 0.0); // Nova: start at the critical point

  int hit = -1;
  float steps = 0.0;
  float closeness = 0.0;
  int limit = min(detail, ITER_CAP);
  for (int i = 0; i < ITER_CAP; i++) {
    if (i >= limit) break;
    vec2 s1 = vec2(0.0), s2 = vec2(0.0);
    if (method == 3) {
      // Nova: p = z³ − 1, p/p' = (z³ − 1)/(3z²).
      vec2 z2 = cmul(z, z);
      vec2 step = cdiv(cmul(z2, z) - vec2(1.0, 0.0), 3.0 * z2);
      vec2 next = z - relax * step + c;
      float moved = length(next - z);
      z = next;
      if (moved < 1e-4) { hit = 0; steps = float(i); closeness = moved; break; }
      continue;
    }
    for (int k = 0; k < MAX_ROOTS; k++) {
      if (k >= n) break;
      vec2 d = z - r[k];
      float dd = dot(d, d);
      if (dd < 1e-6) { hit = k; steps = float(i) + 1.0 - clamp(log2(1e-3 / sqrt(dd)) / 6.0, 0.0, 1.0); break; }
      vec2 inv = vec2(d.x, -d.y) / dd;
      s1 += inv;
      s2 += cmul(inv, inv);
    }
    if (hit >= 0) break;
    vec2 step = method == 2 ? cdiv(2.0 * s1, cmul(s1, s1) + s2) : cinv(s1);
    z -= relax * step;
  }

  vec3 colour = u_secondary * 0.03;
  if (hit >= 0) {
    // Each root its own colour; slow convergence (the borders) glows and
    // fast convergence (deep inside a basin) stays dark and calm.
    float k = method == 3 ? fract(atan(z.y, z.x) / TAU + 0.5) * 3.0 : float(hit);
    float rootHue = fract(k / float(max(n, 3)) + turn * 0.05);
    // Deep inside a basin Newton lands in ~4 steps; near the borders it
    // wanders for 20+. Light follows that wandering.
    // Higher degrees and Nova need more steps everywhere; scale to that.
    float slow = method == 3 ? 2.6 : max(1.0, float(n) / 3.0);
    float shade = clamp((steps - 3.0 * slow) / (22.0 * slow), 0.0, 1.0);
    float band = 0.5 + 0.5 * cos(steps * PI * mix(0.0, 1.0, rings));
    vec3 base = palette(rootHue);
    // Dark, calm basins; light rises steeply towards the borders.
    float light = mix(0.05, 1.0, pow(shade, 1.3));
    light *= mix(1.0, 0.45 + 0.55 * band, rings);
    colour = base * light;
    colour += mix(u_accent, vec3(1.0), 0.4) * glowAmount * pow(shade, 3.0) * 0.5;
  } else if (method == 3) {
    colour = u_primary * 0.05; // Nova's non-converging "Mandelbrot" body
  }
  // Roots as small bright stars: the attractors themselves.
  for (int k = 0; k < MAX_ROOTS; k++) {
    if (k >= n || method == 3) break;
    vec2 p = rot2(-t * spin * 0.1) * ((r[k] - centre) * zoom * breathe / 2.4);
    float d = length(aspectUV() - p);
    colour += u_accent * 0.0009 / (d * d + 0.0004) * (0.4 + 0.6 * u_level);
  }
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "method",
    label: "Method · z³−1 / wandering roots / Halley / Nova / zⁿ−1",
    min: 0,
    max: 4,
    step: 1,
    default: 0,
  },
  {
    key: "relax",
    label: "Relaxation a",
    min: 0.6,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  { key: "zoom", label: "Zoom", min: 0.5, max: 6, step: 0.01, default: 1 },
  {
    key: "drift",
    label: "Root drift",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.3,
  },
  { key: "spin", label: "Spin", min: -1, max: 1, step: 0.01, default: 0.1 },
  {
    key: "glow",
    label: "Border glow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "rings",
    label: "Iteration rings",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
  {
    key: "detail",
    label: "Iterations",
    min: 16,
    max: 96,
    step: 1,
    default: 48,
  },
];

const look = (
  name,
  seed,
  method,
  relax,
  zoom,
  drift,
  spin,
  glow,
  rings,
  detail,
) => ({
  name,
  seed,
  params: { method, relax, zoom, drift, spin, glow, rings, detail },
});

const presets = [
  look("Three Roots", 6801, 0, 1, 1, 0.25, 0.08, 0.5, 0.2, 48),
  look("Wada Beads", 6802, 0, 1, 3.2, 0.12, -0.05, 0.75, 0.05, 64),
  look("Wandering Five", 6803, 1, 1, 1.1, 0.45, 0.06, 0.55, 0.35, 48),
  look("Relaxed Spirals", 6804, 1, 1.38, 1.3, 0.3, 0.12, 0.6, 0.6, 64),
  look("Halley's Flowers", 6805, 2, 1, 1.2, 0.35, -0.1, 0.5, 0.25, 40),
  look("Nova", 6806, 3, 1, 0.9, 0.1, 0.05, 0.65, 0.5, 64),
  look("Nova Tendrils", 6807, 3, 1.2, 2.2, 0.2, -0.08, 0.8, 0.8, 80),
  look("Unity Star", 6808, 4, 1, 1, 0.5, 0.15, 0.5, 0.4, 48),
  look("Under-relaxed Lace", 6809, 4, 0.72, 1.6, 0.3, -0.12, 0.7, 0.9, 72),
];

export default {
  id: "newton",
  number: 68,
  name: "Newton Basins",
  description:
    "Newton's root-finding method run on every pixel: each pixel takes the colour of the root it converges to, shaded by how long it took. The basin borders are fractal and have the Wada property (all basins meet at every border point). Variants: z³ − 1, five wandering roots, Halley's method, the Nova fractal and roots of unity whose degree grows from 3 to 8. Roots shine as small stars.",
  energy: {
    drift: { mul: [0.4, 2.2] },
    spin: { mul: [0.4, 2.4] },
    glow: [-0.2, 0.3],
    rings: [0, 0.3],
  },
  beat: { punch: 1, pulse: 1 },
  audio: [
    { param: "relax", feature: "low", amount: 0.06 },
    { param: "glow", feature: "high", amount: 0.12 },
  ],
  stage: ["drift", "zoom", "relax"],
  type: { key: "method", values: [0, 1, 2, 3, 4] },
  schema,
  presets,
  fragment,
};
