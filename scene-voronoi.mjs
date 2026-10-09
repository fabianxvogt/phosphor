// Voronoi Cells (#71): every pixel belongs to its nearest site. The sites
// live in a small simulation texture and run Lloyd's algorithm: each step
// a site moves toward the centroid of its own cell (estimated with a
// Vogel-spiral of samples), so random cells relax into a centroidal
// Voronoi tessellation, a near-perfect honeycomb. Beats jolt single sites
// and every 16 beats a shockwave scatters a region, which then heals.
//
// Variants: the metric itself (Minkowski p: taxicab diamonds, Euclidean
// hexagons, near-Chebyshev squares, concave stars for p < 1), a metric
// morph that glides p and makes the relaxed lattice change shape, the
// power (Laguerre) diagram with breathing weights whose borders are the
// radical axes of the drawn circles, and the Delaunay dual (Gabriel edges).

export const MAX_SITES = 96;
export const WORLD = [16 / 9, 1]; // torus in world units
const VOGEL = 40; // centroid samples per site and step

// Minkowski length (p < 1 is not a metric but still partitions the plane).
export function mLen([x, y], p) {
  x = Math.abs(x);
  y = Math.abs(y);
  const m = Math.max(x, y, 1e-12);
  if (Math.abs(p - 2) < 0.02) return Math.hypot(x, y);
  return m * ((x / m) ** p + (y / m) ** p) ** (1 / p);
}

export const spacing = (n) => Math.sqrt((WORLD[0] * WORLD[1]) / n);

// Shortest world-space vector from b to a on the torus (positions in [0,1)²).
export function torusDelta(a, b) {
  const w = (v) => v - Math.floor(v + 0.5);
  return [w(a[0] - b[0]) * WORLD[0], w(a[1] - b[1]) * WORLD[1]];
}

export function nearest(q, sites, p = 2) {
  let best = Infinity,
    index = -1;
  sites.forEach((s, i) => {
    const d = mLen(torusDelta(q, s), p);
    if (d < best) [best, index] = [d, i];
  });
  return index;
}

// One Lloyd step exactly as the shader does it.
export function lloydStep(sites, { p = 2, relax = 1 } = {}) {
  const R = 1.7 * spacing(sites.length);
  return sites.map((s, i) => {
    let ax = 0,
      ay = 0,
      n = 0;
    for (let k = 0; k < VOGEL; k++) {
      const r = R * Math.sqrt((k + 0.5) / VOGEL),
        a = k * 2.39996323;
      const o = [r * Math.cos(a), r * Math.sin(a)];
      const q = [s[0] + o[0] / WORLD[0], s[1] + o[1] / WORLD[1]];
      if (nearest(q, sites, p) === i) {
        ax += o[0];
        ay += o[1];
        n++;
      }
    }
    if (!n) return s;
    const f = (v) => v - Math.floor(v);
    return [
      f(s[0] + (relax * ax) / n / WORLD[0]),
      f(s[1] + (relax * ay) / n / WORLD[1]),
    ];
  });
}

const header = `
const int MAX_N = ${MAX_SITES};
const vec2 W = vec2(${WORLD[0].toFixed(7)}, 1.0);
vec2 vSite(int i) { return unpack16(texelFetch(u_state, ivec2(i, 0), 0)); }
float vSpacing(int n) { return sqrt(W.x * W.y / float(n)); }
float vRand(uint a, uint b, uint c) { return float(cellHash(uvec3(a, b, c)) >> 8u) / 16777216.0; }
float mLen(vec2 d, float p) {
  d = abs(d);
  if (abs(p - 2.0) < 0.02) return length(d);
  float m = max(max(d.x, d.y), 1e-6);
  d /= m;
  return m * pow(pow(d.x, p) + pow(d.y, p), 1.0 / p);
}
// Minkowski p: fixed, or gliding 0.7 → metric → 0.7 (variant 1).
float vMetric(int variant, float metric, float t) {
  if (variant == 3) return 2.0;
  if (variant != 1) return metric;
  float s = 0.5 - 0.5 * cos(t * 0.11);
  return exp2(mix(log2(0.7), log2(max(metric, 0.7)), s));
}
// Power-diagram weight w = r²; r breathes per site.
float vRadius(int i, float t, float sp) {
  float h = float(seedHash(uint(i) * 2654435761u + 17u) >> 8u) / 16777216.0;
  return sp * (0.12 + 0.5 * (0.5 + 0.5 * sin(t * (0.25 + 0.5 * h) + h * TAU)));
}
float vScore(vec2 d, int i, int variant, float p, float t, float sp) {
  float l = mLen(d, p);
  if (variant != 2) return l;
  float r = vRadius(i, t, sp);
  return l * l - r * r;
}
vec2 vBurstCentre(float beat) {
  uint b = uint(beat);
  return vec2(vRand(b, 911u, 5u), vRand(b, 912u, 5u));
}
// Beat events for site i at s: world displacement (xy) and heat (z).
vec3 vEvent(int i, vec2 s, float beat, float jolt, float burst, float sp) {
  vec3 ev = vec3(0.0);
  uint b = uint(beat);
  if (vRand(uint(i), b, 1u) < jolt * (0.12 + 0.3 * u_level)) {
    float a = TAU * vRand(uint(i), b, 2u);
    float m = sp * (0.35 + 0.5 * vRand(uint(i), b, 3u));
    ev = vec3(m * cos(a), m * sin(a), 1.0);
  }
  if (burst > 0.01 && mod(beat, 16.0) < 0.5) {
    vec2 d = torusDelta(s, vBurstCentre(beat)) * W;
    float L = length(d);
    if (L < 0.5 && L > 1e-5) {
      float f = sq(1.0 - L / 0.5);
      ev.xy += d / L * burst * sp * 2.2 * f;
      ev.z = max(ev.z, f);
    }
  }
  return ev;
}
`;

const simulation = `${header}
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  int variant = int(floor(u_params[0] + 0.5));
  int N = clamp(int(floor(u_params[1] + 0.5)), 8, MAX_N);
  float relax = clamp(u_params[2], 0.0, 1.0);
  float jolt = u_params[3];
  float burst = u_params[4];
  float t = mod(u_time, 3600.0);
  float p = vMetric(variant, u_params[5], t);
  float sp = vSpacing(N);

  // Row 1: texel i holds the heat of site i in r; texel 0 also keeps the
  // last beat (g) and an initialised flag (a).
  vec4 meta = texelFetch(u_state, ivec2(0, 1), 0);
  bool fresh = u_reset || meta.a < 0.5;
  int lastBeat = int(meta.g * 255.0 + 0.5);
  float beatF = floor(max(u_beat, 0.0));
  int beat = int(beatF) & 255;
  bool event = !fresh && beat != lastBeat;
  int i = px.x;

  if (px.y == 1) {
    float heat = fresh ? 0.0 : max(texelFetch(u_state, px, 0).r - 3.0 / 255.0, 0.0);
    if (event && i < N) heat = max(heat, vEvent(i, vSite(i), beatF, jolt, burst, sp).z);
    outColor = vec4(heat, i == 0 ? float(beat) / 255.0 : 0.0, 0.0, i == 0 ? 1.0 : 0.0);
    return;
  }
  if (fresh) {
    outColor = pack16(vec2(vRand(uint(i), 77u, 9u), vRand(uint(i), 78u, 9u)));
    return;
  }
  vec2 s = vSite(i);
  if (i >= N) { outColor = texelFetch(u_state, px, 0); return; }

  // Lloyd: move toward the centroid of the own cell, sampled on a Vogel
  // spiral around the site.
  float R = 1.7 * sp;
  vec2 acc = vec2(0.0);
  float count = 0.0;
  for (int k = 0; k < ${VOGEL}; k++) {
    float rr = R * sqrt((float(k) + 0.5) / ${VOGEL}.0);
    float a = float(k) * 2.39996323;
    vec2 o = rr * vec2(cos(a), sin(a));
    vec2 q = s + o / W;
    float best = 1e9;
    int bi = -1;
    for (int j = 0; j < MAX_N; j++) {
      if (j >= N) break;
      float sc = vScore(torusDelta(q, vSite(j)) * W, j, variant, p, t, sp);
      if (sc < best) { best = sc; bi = j; }
    }
    if (bi == i) { acc += o; count += 1.0; }
  }
  vec2 move = count > 0.0 ? relax * acc / count : vec2(0.0);
  if (event) move += vEvent(i, s, beatF, jolt, burst, sp).xy;
  outColor = pack16(fract(s + move / W));
}
`;

const fragment = `${header}
void main() {
  int variant = int(floor(u_params[0] + 0.5));
  int N = clamp(int(floor(u_params[1] + 0.5)), 8, MAX_N);
  float burst = u_params[4];
  float glow = u_params[6];
  float fill = u_params[7];
  float t = mod(u_time, 3600.0);
  float p = vMetric(variant, u_params[5], t);
  float sp = vSpacing(N);

  // Screen height spans the torus height; a slow pan shows it is seamless.
  vec2 xw = aspectUV() + vec2(t * 0.004, t * 0.0023);
  vec2 q = xw / W;
  float pxw = max(length(fwidth(xw)) * 0.7, 1e-5);

  float b1 = 1e9, b2 = 1e9, ring = 1e9;
  int i1 = 0;
  vec2 d1 = vec2(0.0), s1 = vec2(0.0);
  for (int i = 0; i < MAX_N; i++) {
    if (i >= N) break;
    vec2 si = vSite(i);
    vec2 d = torusDelta(q, si) * W;
    float sc = vScore(d, i, variant, p, t, sp);
    if (sc < b1) { b2 = b1; b1 = sc; i1 = i; d1 = d; s1 = si; }
    else if (sc < b2) b2 = sc;
    if (variant == 2) ring = min(ring, abs(length(d) - vRadius(i, t, sp)));
  }

  // Cell: own colour, brighter toward its site, flashing with heat.
  float h = float(seedHash(uint(i1) * 7919u + u_seedBits) >> 8u) / 16777216.0;
  float heat = texelFetch(u_state, ivec2(i1, 1), 0).r;
  float core = exp(-mLen(d1, p) / sp * 2.2);
  vec3 colour = palette(fract(0.1 + h * 0.8)) * fill * (0.1 + 0.55 * core) * (1.0 + 1.6 * heat);
  colour += mix(u_accent, vec3(1.0), 0.3) * heat * 0.25 * (0.3 + 0.7 * core);

  // Borders: the gap between nearest and second-nearest score.
  float gap = b2 - b1;
  float line = 1.0 - smoothstep(0.0, 0.8 + 2.5 * glow, gap / max(fwidth(gap), 1e-7));
  vec3 neon = mix(u_primary, vec3(1.0), 0.35);
  colour = mix(colour, neon, line * (variant == 3 ? 0.3 : 1.0) * (0.55 + 0.45 * u_level));

  // Power diagram: the weight circles; borders are their radical axes.
  if (variant == 2)
    colour += mix(u_accent, vec3(1.0), 0.2) * (1.0 - smoothstep(0.0, 1.2 + glow, ring / pxw)) * 0.55;

  // Delaunay dual: Gabriel edges (the circle on each edge is empty).
  if (variant == 3) {
    float dl = 1e9;
    for (int j = 0; j < MAX_N; j++) {
      if (j >= N) break;
      if (j == i1) continue;
      vec2 dj = torusDelta(vSite(j), s1) * W;
      if (dot(dj, dj) > sq(3.0 * sp)) continue;
      float tt = clamp(dot(d1, dj) / dot(dj, dj), 0.0, 1.0);
      float ds = length(d1 - dj * tt);
      if (ds > pxw * (3.0 + 3.0 * glow)) continue;
      vec2 m = dj * 0.5;
      float r2 = dot(m, m) * 0.999;
      bool empty = true;
      for (int k = 0; k < MAX_N; k++) {
        if (k >= N) break;
        if (k == i1 || k == j) continue;
        vec2 dk = torusDelta(vSite(k), s1) * W - m;
        if (dot(dk, dk) < r2) { empty = false; break; }
      }
      if (empty) dl = min(dl, ds);
    }
    colour += mix(u_accent, vec3(1.0), 0.4) * (1.0 - smoothstep(0.0, 1.0 + 2.0 * glow, dl / pxw)) * (0.6 + 0.4 * u_level);
  }

  // Sites as small stars.
  colour += mix(u_accent, vec3(1.0), 0.6) * exp(-dot(d1, d1) / sq(pxw) / (4.0 + 10.0 * glow));

  // The shockwave of the last 16-beat burst.
  if (burst > 0.01) {
    float bt = max(u_beat, 0.0);
    float b0 = floor(bt / 16.0) * 16.0;
    float age = bt - b0;
    float dist = length(torusDelta(q, vBurstCentre(b0)) * W);
    float wave = exp(-sq((dist - age * 0.16) / (pxw * 4.0 + 0.004))) * exp(-age * 0.45);
    colour += u_accent * wave * burst * 0.6;
  }
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "variant",
    label: "Variant · relax / metric morph / power / Delaunay dual",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "sites",
    label: "Sites",
    min: 12,
    max: MAX_SITES,
    step: 1,
    default: 60,
  },
  {
    key: "relax",
    label: "Lloyd relaxation",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "jolt",
    label: "Beat jolts",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.35,
  },
  {
    key: "burst",
    label: "16-beat shockwave",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "metric",
    label: "Metric p · 1 taxicab, 2 Euclid, 16 ≈ Chebyshev",
    min: 0.5,
    max: 16,
    step: 0.05,
    default: 2,
  },
  { key: "glow", label: "Line glow", min: 0, max: 1, step: 0.01, default: 0.4 },
  { key: "fill", label: "Cell fill", min: 0, max: 1, step: 0.01, default: 0.7 },
];

const look = (
  name,
  seed,
  variant,
  sites,
  relax,
  jolt,
  burst,
  metric,
  glow,
  fill,
) => ({
  name,
  seed,
  params: { variant, sites, relax, jolt, burst, metric, glow, fill },
});

const presets = [
  look("Honeycomb Relax", 7101, 0, 64, 0.6, 0.3, 0.6, 2, 0.4, 0.7),
  look("Lloyd Storm", 7102, 0, 96, 0.35, 0.9, 1, 2, 0.3, 0.6),
  look("Big Cells", 7103, 0, 20, 0.5, 0.4, 0.7, 2, 0.6, 0.8),
  look("Taxicab Diamonds", 7104, 0, 56, 0.5, 0.3, 0.6, 1, 0.4, 0.7),
  look("Chebyshev Blocks", 7105, 0, 48, 0.5, 0.3, 0.6, 16, 0.4, 0.7),
  look("Concave Stars", 7106, 0, 44, 0.4, 0.35, 0.5, 0.65, 0.35, 0.75),
  look("Metric Morph", 7107, 1, 60, 0.5, 0.25, 0.5, 16, 0.4, 0.7),
  look("Power Bubbles", 7108, 2, 40, 0.4, 0.3, 0.6, 2, 0.5, 0.6),
  look("Laguerre Froth", 7109, 2, 80, 0.3, 0.5, 0.8, 2, 0.3, 0.5),
  look("Delaunay Net", 7110, 3, 50, 0.5, 0.35, 0.6, 2, 0.4, 0.35),
  look("Gabriel Lace", 7111, 3, 90, 0.4, 0.6, 0.8, 2, 0.25, 0.2),
];

export default {
  id: "voronoi",
  number: 71,
  name: "Voronoi Cells",
  description:
    "Every pixel belongs to its nearest site, and the sites run Lloyd's algorithm: each moves toward the centroid of its own cell, so random cells relax into a honeycomb. Beats jolt single sites, every 16 beats a shockwave scatters a region and the cells heal. Variants change the metric (taxicab diamonds, Euclidean hexagons, Chebyshev squares, concave stars), morph it live, draw the power diagram whose borders are the radical axes of breathing circles, or overlay the Delaunay dual.",
  maxRenderWidth: 1280,
  energy: {
    jolt: { mul: [0.4, 2] },
    relax: { mul: [0.7, 1.4] },
    glow: [-0.1, 0.25],
    burst: [-0.2, 0.3],
  },
  beat: { punch: 0.7, pulse: 1 },
  audio: [
    { param: "jolt", feature: "onset", amount: 0.15 },
    { param: "glow", feature: "high", amount: 0.08 },
    { param: "relax", feature: "low", amount: 0.06 },
  ],
  stage: ["jolt", "relax", "glow"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [MAX_SITES, 2], steps: 1 },
};
