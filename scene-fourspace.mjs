import { familyEffect } from "./family-rhythm.mjs";

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

// Topology never changes during rotation. Build the exact original pair order
// once when the module loads, instead of testing every pair at every pixel.
export function fourspaceVertices(shape) {
  const count = [16, 8, 24, 36][shape];
  return Array.from({ length: count }, (_, i) => {
    if (shape === 0) return [1, 2, 4, 8].map(bit => i & bit ? 1 : -1);
    if (shape === 1) return [0, 1, 2, 3].map(axis => axis === (i >> 1) ? (i & 1 ? 1.4 : -1.4) : 0);
    if (shape === 2) {
      const [a, b] = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]][i >> 2];
      return [0, 1, 2, 3].map(axis => axis === a ? (i & 1 ? 1 : -1) : axis === b ? (i & 2 ? 1 : -1) : 0);
    }
    const u = Math.floor(i / 6) * 1.0471976, w = (i % 6) * 1.0471976;
    return [Math.cos(u), Math.sin(u), Math.cos(w), Math.sin(w)].map(v => v * 1.2);
  });
}
export const FOURSPACE_EDGES = [0, 1, 2, 3].map(shape => {
  const vertices = fourspaceVertices(shape), edges = [];
  const length = [2, 1.98, 1.4143, 1.2][shape];
  for (let i = 0; i < vertices.length; i++)
    for (let j = i + 1; j < vertices.length; j++)
      if (Math.abs(Math.hypot(...vertices[i].map((v, axis) => v - vertices[j][axis])) - length) <= 0.05)
        edges.push([i, j]);
  return edges;
});

// The data pass and float-target fallback share the original projection math.
const projection = `  int shape = int(floor(u_params[0] + 0.5));
  float spin = u_params[1], tumble = u_params[2], fold = u_params[3];
  float size = u_params[4], weight = u_params[5], glow = u_params[6], tint = u_params[7];
  int count = shape == 0 ? 16 : shape == 1 ? 8 : shape == 2 ? 24 : 36;
  // Integrated rotation angles (see simulation): energy changes speed only.
  vec2 turn = fdTurn();
  float phase = fract(u_seed * 0.0093) * 6.2831853;
  mat2 xw = rot2(turn.x * 0.5 + phase + u_rhythm.y * 0.24), yz = rot2(turn.x * 0.31), zw = rot2(turn.x * 0.23 + 1.0);
  mat2 xz = rot2(turn.y * 0.4 + 0.6), xy = rot2(turn.y * 0.27);

  vec4 P[VERTEX_CAP];
  for (int i = 0; i < VERTEX_CAP; ++i) {
    if (i >= count) break;
    vec4 v = fdVertex(shape, i);
    v.xw = xw * v.xw; v.yz = yz * v.yz; v.zw = zw * v.zw;
    // 4D → 3D perspective, then a gentle 3D tumble and 3D → 2D perspective.
    vec3 q = v.xyz / (fold - v.w);
    q.xz = xz * q.xz; q.xy = xy * q.xy;
    float z = 3.2 - q.z;
    // .w: 3D nearness (1 near, 0 far) for line weight and atmosphere.
    P[i] = vec4(q.xy / z * 2.2 * size, v.w, clamp(1.0 - (z - 2.0) / 2.6, 0.0, 1.0));
  }
`;
// Rotation angles ∫spin dt and ∫tumble dt, stored as 24-bit fractions of
// 200π: every multiplier below (0.5, 0.31, 0.23, 0.4, 0.27) times 100 is an
// integer, so wrapping the stored angle never jumps any rotation.
const TURN_PERIOD = "628.3185307179586";
const simulation = `
float unpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
vec4 pack24(float x) {
  float n = floor(fract(x) * 16777216.);
  float b0 = floor(n / 65536.); n -= b0 * 65536.;
  float b1 = floor(n / 256.); n -= b1 * 256.;
  return vec4(b0, b1, n, 255.) / 255.;
}
void main() {
  int i = int(gl_FragCoord.x);
  float turn = unpack24(texelFetch(u_state, ivec2(i, 0), 0));
  float rate = i == 0 ? u_params[1] : u_params[2];
  outColor = pack24(u_reset ? 0. : turn + u_dt * rate / ${TURN_PERIOD});
}
`;
const geometry = `
const int VERTEX_CAP = 36;
vec2 fdTurn() {
  vec3 a = floor(texelFetch(u_state, ivec2(0, 0), 0).rgb * 255. + .5);
  vec3 b = floor(texelFetch(u_state, ivec2(1, 0), 0).rgb * 255. + .5);
  vec3 w = vec3(65536., 256., 1.) / 16777216. * ${TURN_PERIOD};
  return vec2(dot(a, w), dot(b, w));
}

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

`;
// Row 0: projected vertices (xy, w, nearness); row 1: edge palette/depth;
// row 2: endpoints; row 3: endpoint nearness.
// Every edge retains its original order, infinite halo and distance arithmetic.
const precompute = geometry + `
void main() {
${projection}
  ivec2 cell = ivec2(gl_FragCoord.xy);
  if (cell.y == 0) { outColor = cell.x < count ? P[cell.x] : vec4(0.0); return; }
  vec4 a, b;
  ${FOURSPACE_EDGES.map((edges, shape) => `
  ${shape ? 'else ' : ''}if (shape == ${shape}) {
    ${edges.map(([i,j], k) => `${k?'else ':''}if (cell.x == ${k}) { a=P[${i}]; b=P[${j}]; }`).join('\n    ')}
    else { outColor = vec4(0.0); return; }
  }`).join('\n')}
  float depth = 0.5 + 0.25 * (a.z + b.z);
  vec3 ink = palette(fract(mix(0.35, depth * 0.8, tint)));
  outColor = cell.y == 1 ? vec4(ink, depth) : cell.y == 2 ? vec4(a.xy, b.xy) : vec4(a.w, b.w, 0.0, 0.0);
}
`;
const fragment = geometry + `
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
float fdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

vec3 fdEdge(vec2 p, vec3 a, vec3 b, vec2 nearness, float weight, float glow, float tint, float aa, int edge) {
  vec2 pa = p - a.xy, ba = b.xy - a.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  float d = length(pa - ba * h);
  // Depth: near edges are thicker and brighter, far edges thin into the dark.
  float near = mix(nearness.x, nearness.y, h);
  float w = weight * mix(0.6, 1.45, near);
#ifdef PRECOMPUTED
  vec4 style = texelFetch(u_precomputed, ivec2(edge, 1), 0);
  float depth = style.a;
#else
  float depth = 0.5 + 0.25 * (a.z + b.z);
#endif
  // Lit tube profile: round body plus a specular streak along the edge.
  float x = clamp(d / max(w, 1e-5), 0.0, 1.0), tube = sqrt(1.0 - x * x);
  float core = (1.0 - smoothstep(w - aa, w + aa, d)) * (0.45 + 0.55 * tube + 0.6 * pow(tube, 12.0));
  float halo = glow * 0.004 / (d * d * 40.0 + 0.004) * (0.4 + 0.6 * near);
#ifdef PRECOMPUTED
  vec3 ink = style.rgb;
#else
  vec3 ink = palette(fract(mix(0.35, depth * 0.8, tint)));
#endif
  return ink * (core + halo * 0.12) * (0.55 + 0.45 * depth) * mix(0.3, 1.15, near);
}

void main() {
#ifndef PRECOMPUTED
${projection}
#else
  int shape = int(floor(u_params[0] + 0.5));
  int count = shape == 0 ? 16 : shape == 1 ? 8 : shape == 2 ? 24 : 36;
  float weight = u_params[5], glow = u_params[6], tint = u_params[7];
#endif
  vec2 p = aspectUV();
  float aa = fwidth(p.x) * 1.5;
  vec3 col = vec3(0.0);
#ifdef PRECOMPUTED
  int edges = ${FOURSPACE_EDGES.map((edges, shape) => shape < 3 ? `shape == ${shape} ? ${edges.length} : ` : edges.length).join('')};
  for (int edge = 0; edge < 96; ++edge) {
    if (edge >= edges) break;
    vec4 points = texelFetch(u_precomputed, ivec2(edge, 2), 0);
    col = max(col, fdEdge(p, vec3(points.xy, 0.0), vec3(points.zw, 0.0), texelFetch(u_precomputed, ivec2(edge, 3), 0).xy, weight, glow, tint, aa, edge));
  }
#else
  ${FOURSPACE_EDGES.map((edges, shape) => `
  ${shape ? "else " : ""}if (shape == ${shape}) {
    ${edges.map(([i, j], edge) => `col = max(col, fdEdge(p, P[${i}].xyz, P[${j}].xyz, vec2(P[${i}].w, P[${j}].w), weight, glow, tint, aa, ${edge}));`).join("\n    ")}
  }`).join("\n")}
#endif
  // Vertices glint brightest on the kick.
  float kick = u_rhythmEnabled ? u_rhythm.x : exp(-fract(u_beat) * 6.0);
  for (int i = 0; i < VERTEX_CAP; ++i) {
    if (i >= count) break;
#ifdef PRECOMPUTED
    vec4 vtx = texelFetch(u_precomputed, ivec2(i, 0), 0);
#else
    vec4 vtx = P[i];
#endif
    // Vertices are small lit spheres, larger when near.
    float r = weight * mix(1.5, 2.7, vtx.w);
    vec2 o = (p - vtx.xy) / r;
    float o2 = dot(o, o);
    float mask = 1.0 - smoothstep(1.0 - aa / r, 1.0 + aa / r, sqrt(o2));
    // Clamp first: far from the vertex o is huge and pow() would overflow to inf.
    vec2 oc = o / max(1.0, sqrt(o2));
    vec3 n = vec3(oc, sqrt(max(0.0, 1.0 - dot(oc, oc))));
    float lit = 0.3 + 0.8 * max(0.0, dot(n, normalize(vec3(-0.45, 0.55, 0.7)))) + 0.8 * pow(max(0.0, dot(n, normalize(vec3(-0.25, 0.3, 1.0)))), 30.0);
    col += u_accent * mask * lit * mix(0.45, 1.0, vtx.w) * (0.55 + (mod(float(i) - u_rhythmCount.x, 4.0) < 1.0 ? 1.5 : 0.0) * kick * u_level);
  }
  // A faint ground glow keeps the frame from reading as flat black.
  col = max(col, u_secondary * 0.035 * exp(-dot(p, p) * 2.0));
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default {
  rhythm: [
    familyEffect("vertex-orbit", 0, "Vertex-orbit chase", "Select a cohort of true polytope vertices after 4D projection."),
    familyEffect("rotation-plane", 1, "4D plane impulse", "Rotate the shape in its x–w plane before perspective projection.", { period: 4, strength: 0.6, duration: 1, kind: "motion" }),
  ],
  id: "fourspace",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { spin: [0.1, 1.5], tumble: [0.04, 0.8], glow: [0.5, 1.2] },
  beat: { punch: 1.2, pulse: 1 },
  stage: ["spin", "tumble", "fold"],
  type: { key: "shape", values: [0, 1, 2, 3] },
  number: 61,
  name: "Fourth Dimension",
  description:
    "Regular four-dimensional shapes — tesseract, 16-cell, 24-cell and a 6×6 duoprism — rotating through the fourth dimension as glowing wireframes. Vertices are rotated in four planes and projected 4D → 3D → 2D each frame; colour follows depth in w and vertices glint on the kick. A port of the v6 idea, not its Canvas2D code.",
  schema,
  presets,
  fragment,
  precompute: { fragment: precompute, size: [96, 4] },
  simulation: { fragment: simulation, size: [2, 1], steps: 1 },
};
