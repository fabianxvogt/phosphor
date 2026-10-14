// Hopf Bloom geometry and CPU references. The mesh is built once per seed:
// one closed tube per Hopf fibre, every fibre carrying its own base-point
// longitude and layer. Development only chooses which latitudes exist, how
// far each layer has bloomed out of its parent latitude, and how far each
// fibre has grown around its circle; the vertex shader mirrors the functions
// below exactly.
export const SEGMENTS = 96; // around each fibre circle
export const SIDES = 8; // around each tube
export const PER_FIBRE = SEGMENTS * SIDES * 6;
export const GROW = 0.3; // development span over which one fibre closes
// Minimum S³ angle between any visible fibre and the projection pole. It
// bounds every projected point by cot(MARGIN / 2) (≈ 4.7 scene units).
export const MARGIN = 0.42;
const HALF_PI = Math.PI / 2;

// Latitudes θ on the base sphere (polar angle). Layer 0 is the Clifford torus;
// odd layers nest inwards towards the core circle, even layers outwards.
// `from` is the parent layer a new torus blooms out of; [a, b] is its
// development window; `count` is the number of fibres over that latitude.
export const LAYERS = [
  { theta: HALF_PI, from: 0, a: -1, b: -0.4, count: 20 },
  { theta: 1.22, from: 0, a: 0.08, b: 0.62, count: 20 },
  { theta: 1.84, from: 0, a: 0.08, b: 0.62, count: 14 },
  { theta: 0.9, from: 1, a: 0.42, b: 0.95, count: 20 },
  { theta: 2.0, from: 2, a: 0.42, b: 0.95, count: 12 },
  { theta: 0.58, from: 3, a: 1.08, b: 1.62, count: 20 },
  { theta: 2.1, from: 4, a: 1.08, b: 1.62, count: 10 },
  { theta: 0.3, from: 5, a: 1.42, b: 1.95, count: 18 },
  // The core: every fibre over the north pole is the same unit circle.
  { theta: 0, from: 7, a: 1.42, b: 1.95, count: 1 },
];
export const FIBRES = LAYERS.reduce((n, l) => n + l.count, 0);
export const OUTER = [0, 2, 4, 6]; // the layers that bound the picture

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Base-sphere latitude of a layer at a development value: it blooms out of
// its parent's final latitude across its window.
export const layerTheta = (layer, development) =>
  LAYERS[LAYERS[layer].from].theta +
  (LAYERS[layer].theta - LAYERS[LAYERS[layer].from].theta) *
    smoothstep(LAYERS[layer].a, LAYERS[layer].b, development);
// Growth of one fibre (0 hidden … 1 closed circle).
export const growth = (start, development) =>
  clamp01((development - start) / GROW);
// The widest visible latitude; 4D tumble is limited so that fibres keep
// MARGIN from the projection pole (south-pole fibre at θ = π).
export const outerTheta = (development) =>
  Math.max(...OUTER.map((l) => layerTheta(l, development)));
export const safeTumble = (development) =>
  Math.max(0, (Math.PI - outerTheta(development)) / 2 - MARGIN);

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Where a fibre starts growing around its circle; derived from its identity
// so the shader needs no extra attribute.
export const arcStart = (phi, layer) =>
  Math.PI * 2 * (((phi * 5.137 + layer * 0.31) % 1) + 1) % (Math.PI * 2);
// Seed identity: longitude twist per layer, the sweep direction of growth and
// a small longitude jitter.
export function fibres(seed) {
  const rand = random(seed >>> 0 || 1),
    list = [];
  LAYERS.forEach((layer, index) => {
    const twist = rand() * Math.PI * 2,
      reverse = rand() < 0.5,
      n = layer.count;
    for (let j = 0; j < n; j++) {
      const rank = reverse ? n - 1 - j : j;
      list.push({
        layer: index,
        phi: twist + ((j + 0.18 * (rand() - 0.5)) / n) * Math.PI * 2,
        start:
          n === 1
            ? layer.a
            : layer.a + ((layer.b - layer.a - GROW) * rank) / (n - 1),
      });
      list.at(-1).arc = arcStart(list.at(-1).phi, index);
    }
  });
  return list;
}

// Per-vertex data: (φ, 4·layer + growth start + 1), growth start ∈ [−1, 2].
// The shader derives segment, tube side and triangle corner from gl_VertexID.
export const packLayer = (layer, start) => layer * 4 + start + 1;
export function mesh(list) {
  const data = new Float32Array(list.length * PER_FIBRE * 2);
  let o = 0;
  for (const f of list) {
    const packed = packLayer(f.layer, f.start);
    for (let v = 0; v < PER_FIBRE; v++) {
      data[o++] = f.phi;
      data[o++] = packed;
    }
  }
  return data;
}
export const createGeometry = (seed) => mesh(fibres(seed));

// S³ point of the fibre over (θ, φ) at fibre parameter s, and the Hopf map.
export function fibrePoint(theta, phi, s) {
  const eta = theta / 2;
  return [
    Math.cos(eta) * Math.cos(s + phi),
    Math.cos(eta) * Math.sin(s + phi),
    Math.sin(eta) * Math.cos(s),
    Math.sin(eta) * Math.sin(s),
  ];
}
export function hopf([x1, y1, x2, y2]) {
  return [
    2 * (x1 * x2 + y1 * y2),
    2 * (y1 * x2 - x1 * y2),
    x1 * x1 + y1 * y1 - x2 * x2 - y2 * y2,
  ];
}
// 4D tumble: a rotation by `a` in the (x1, y2) plane moves the projection
// pole off the south-pole fibre (a conformal Dupin-cyclide swing); a rotation
// by `b` in the (y1, x2) plane fixes the pole (a rigid turn of space).
export function tumble([x1, y1, x2, y2], a, b) {
  const ca = Math.cos(a),
    sa = Math.sin(a),
    cb = Math.cos(b),
    sb = Math.sin(b);
  return [ca * x1 - sa * y2, cb * y1 - sb * x2, sb * y1 + cb * x2, sa * x1 + ca * y2];
}
export const untumble = (q, a, b) => {
  const [x1, y1, x2, y2] = q,
    ca = Math.cos(a),
    sa = Math.sin(a),
    cb = Math.cos(b),
    sb = Math.sin(b);
  return [ca * x1 + sa * y2, cb * y1 + sb * x2, -sb * y1 + cb * x2, -sa * x1 + ca * y2];
};
// Stereographic projection from the pole y2 = 1.
export const stereo = ([x1, y1, x2, y2]) => [
  x1 / (1 - y2),
  y1 / (1 - y2),
  x2 / (1 - y2),
];
// Projected centre-line point of one fibre, as the shader computes it.
export function fibreCurve(f, development, s, a = 0, b = 0) {
  return stereo(
    tumble(fibrePoint(layerTheta(f.layer, development), f.phi, s), a, b),
  );
}

// Shader constants generated from the same table.
export const layerGLSL = () => `
const int LAYER_COUNT = ${LAYERS.length};
const float LAYER_THETA[${LAYERS.length}] = float[](${LAYERS.map((l) => l.theta.toFixed(6)).join(",")});
const int LAYER_FROM[${LAYERS.length}] = int[](${LAYERS.map((l) => l.from).join(",")});
const float LAYER_A[${LAYERS.length}] = float[](${LAYERS.map((l) => l.a.toFixed(4)).join(",")});
const float LAYER_B[${LAYERS.length}] = float[](${LAYERS.map((l) => l.b.toFixed(4)).join(",")});
const int SEGMENTS = ${SEGMENTS}, SIDES = ${SIDES}, PER_FIBRE = ${PER_FIBRE};
const float GROW = ${GROW.toFixed(4)}, MARGIN = ${MARGIN.toFixed(4)};
float layerTheta(int k, float dev) {
  int p = LAYER_FROM[k];
  return mix(LAYER_THETA[p], LAYER_THETA[k], smoothstep(LAYER_A[k], LAYER_B[k], dev));
}
float outerTheta(float dev) {
  return max(max(layerTheta(0, dev), layerTheta(2, dev)), max(layerTheta(4, dev), layerTheta(6, dev)));
}
float safeTumble(float dev) { return max(0., (3.14159265 - outerTheta(dev)) * .5 - MARGIN); }
`;
