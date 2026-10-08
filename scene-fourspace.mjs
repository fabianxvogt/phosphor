// Fourth Dimension (v6 port, D32/D33): regular four-dimensional shapes
// rotating through the fourth dimension, drawn as glowing wireframes. Edges
// are projected 4D → 3D → 2D each frame; colour follows depth in w. Four
// types: tesseract, 16-cell, 24-cell and a 6×6 duoprism.

const schema = [
  { key: "shape", label: "Shape · tesseract / 16-cell / 24-cell / duoprism", min: 0, max: 3, step: 1, default: 0 },
  { key: "spin", label: "4D rotation", min: 0, max: 2, step: 0.01, default: 0.35 },
  { key: "tumble", label: "3D tumble", min: 0, max: 1.5, step: 0.01, default: 0.15 },
  { key: "fold", label: "4D perspective", min: 1.6, max: 4, step: 0.01, default: 2.6 },
  { key: "size", label: "Size", min: 0.4, max: 1.6, step: 0.01, default: 1 },
  { key: "weight", label: "Line weight", min: 0.002, max: 0.02, step: 0.0005, default: 0.006 },
  { key: "glow", label: "Glow", min: 0, max: 1.5, step: 0.01, default: 0.7 },
  { key: "depthTint", label: "Depth tint", min: 0, max: 1, step: 0.01, default: 0.6 },
];

const presets = [
  { name: "Turning Tesseract", seed: 9201, params: { shape: 0, spin: 0.35, tumble: 0.12, fold: 2.6, size: 1, weight: 0.006, glow: 0.7, depthTint: 0.6 } },
  { name: "Sixteen Cell", seed: 9202, params: { shape: 1, spin: 0.45, tumble: 0.2, fold: 2.3, size: 1.1, weight: 0.005, glow: 0.9, depthTint: 0.7 } },
  { name: "Twenty-four Cell", seed: 9203, params: { shape: 2, spin: 0.25, tumble: 0.1, fold: 3, size: 0.9, weight: 0.004, glow: 0.8, depthTint: 0.5 } },
  { name: "Duoprism Torus", seed: 9204, params: { shape: 3, spin: 0.3, tumble: 0.18, fold: 2.8, size: 1, weight: 0.005, glow: 0.75, depthTint: 0.8 } },
  { name: "Hypercube Close-up", seed: 9205, params: { shape: 0, spin: 0.15, tumble: 0.05, fold: 1.8, size: 1.5, weight: 0.009, glow: 1.1, depthTint: 0.4 } },
  { name: "Spinning Lattice", seed: 9206, params: { shape: 2, spin: 1.1, tumble: 0.6, fold: 2.4, size: 1.2, weight: 0.003, glow: 0.6, depthTint: 0.9 } },
];

const fragment = `
const int VERTEX_CAP = 36;

vec4 fdVertex(int shape, int i) {
  if (shape == 0) {
    // Tesseract: all sign combinations of (±1, ±1, ±1, ±1).
    return vec4((i & 1) == 0 ? -1.0 : 1.0, (i & 2) == 0 ? -1.0 : 1.0,
                (i & 4) == 0 ? -1.0 : 1.0, (i & 8) == 0 ? -1.0 : 1.0);
  }
  if (shape == 1) {
    // 16-cell: ±1 on each axis.
    vec4 v = vec4(0.0);
    float s = (i & 1) == 0 ? -1.4 : 1.4;
    int axis = i >> 1;
    if (axis == 0) v.x = s; else if (axis == 1) v.y = s; else if (axis == 2) v.z = s; else v.w = s;
    return v;
  }
  if (shape == 2) {
    // 24-cell: permutations of (±1, ±1, 0, 0).
    int pair = i >> 2;
    float a = (i & 1) == 0 ? -1.0 : 1.0, b = (i & 2) == 0 ? -1.0 : 1.0;
    if (pair == 0) return vec4(a, b, 0.0, 0.0);
    if (pair == 1) return vec4(a, 0.0, b, 0.0);
    if (pair == 2) return vec4(a, 0.0, 0.0, b);
    if (pair == 3) return vec4(0.0, a, b, 0.0);
    if (pair == 4) return vec4(0.0, a, 0.0, b);
    return vec4(0.0, 0.0, a, b);
  }
  // 6×6 duoprism: the product of two hexagons (a flat torus in 4D).
  float u = float(i / 6) * 1.0471976, w = float(i - (i / 6) * 6) * 1.0471976;
  return vec4(cos(u), sin(u), cos(w), sin(w)) * 1.2;
}

float fdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  int shape = int(floor(u_params[0] + 0.5));
  float spin = u_params[1], tumble = u_params[2], fold = u_params[3];
  float size = u_params[4], weight = u_params[5], glow = u_params[6], tint = u_params[7];
  int count = shape == 0 ? 16 : shape == 1 ? 8 : shape == 2 ? 24 : 36;
  float edgeLength = shape == 0 ? 2.0 : shape == 1 ? 1.98 : shape == 2 ? 1.4143 : 1.2;
  float t = u_time;
  float phase = fract(u_seed * 0.0093) * 6.2831853;
  mat2 xw = rot2(t * spin * 0.5 + phase), yz = rot2(t * spin * 0.31), zw = rot2(t * spin * 0.23 + 1.0);
  mat2 xz = rot2(t * tumble * 0.4 + 0.6), xy = rot2(t * tumble * 0.27);

  vec3 P[VERTEX_CAP];
  vec4 V[VERTEX_CAP];
  for (int i = 0; i < VERTEX_CAP; ++i) {
    if (i >= count) break;
    vec4 v = fdVertex(shape, i);
    V[i] = v;
    v.xw = xw * v.xw; v.yz = yz * v.yz; v.zw = zw * v.zw;
    // 4D → 3D perspective, then a gentle 3D tumble and 3D → 2D perspective.
    vec3 q = v.xyz / (fold - v.w);
    q.xz = xz * q.xz; q.xy = xy * q.xy;
    float z = 3.2 - q.z;
    P[i] = vec3(q.xy / z * 2.2 * size, v.w);
  }
  vec2 p = aspectUV();
  float aa = fwidth(p.x) * 1.5;
  vec3 col = vec3(0.0);
  float best = 1e9;
  for (int i = 0; i < VERTEX_CAP; ++i) {
    if (i >= count) break;
    for (int j = 0; j < VERTEX_CAP; ++j) {
      if (j <= i) continue;
      if (j >= count) break;
      vec4 d4 = V[i] - V[j];
      // Edges join vertex pairs at the shape's edge length.
      if (abs(sqrt(dot(d4, d4)) - edgeLength) > 0.05) continue;
      float d = fdSegment(p, P[i].xy, P[j].xy);
      float depth = 0.5 + 0.25 * (P[i].z + P[j].z);
      float core = 1.0 - smoothstep(weight - aa, weight + aa, d);
      float halo = glow * 0.004 / (d * d * 40.0 + 0.004);
      vec3 ink = palette(fract(mix(0.35, depth * 0.8, tint)));
      col = max(col, ink * (core + halo * 0.12) * (0.55 + 0.45 * depth));
      best = min(best, d);
    }
  }
  // Vertices glint brightest on the kick.
  float kick = exp(-fract(u_beat) * 6.0);
  for (int i = 0; i < VERTEX_CAP; ++i) {
    if (i >= count) break;
    float d = length(p - P[i].xy);
    col += u_accent * (1.0 - smoothstep(weight * 1.6, weight * 2.6 + aa, d)) * (0.4 + 0.6 * kick * u_level);
  }
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "fourspace",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { spin: [0.1, 1.5], tumble: [0.04, 0.8], glow: [0.5, 1.2] },
  beat: { punch: 1.2, pulse: 1 },
  stage: ["spin", "tumble", "fold"],
  type: { key: "shape", values: [0, 1, 2, 3] },
  number: 61,
  maxRenderWidth: 1280,
  name: "Fourth Dimension",
  description:
    "Regular four-dimensional shapes — tesseract, 16-cell, 24-cell and a 6×6 duoprism — rotating through the fourth dimension as glowing wireframes. Vertices are rotated in four planes and projected 4D → 3D → 2D each frame; colour follows depth in w and vertices glint on the kick. A port of the v6 idea, not its Canvas2D code.",
  schema,
  presets,
  fragment,
};
