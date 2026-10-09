// Fractal Flames (#69): the chaos game. 65,536 GPU particles each pick one
// of a few transforms at random every tick (weighted), apply it and land
// somewhere on the attractor of the iterated function system; drawn
// additively over fading trails, the visit density becomes the picture.
// Scott Draves' flame algorithm adds non-linear "variations" (swirl,
// spherical, sinusoidal, julia, disc, …) after each affine map and colours
// each point by averaging the colours of the transforms that made it, so
// the colour shows which map built which part.
//
// Variants (species): 0 swirl, 1 sinusoidal weave, 2 spherical bloom,
// 3 julia flame, 4 Barnsley's fern, 5 Heighway's dragon. The last two are
// the classic linear chaos games, recognisable at a glance. The affine maps
// morph slowly on closed loops; an optional rotational symmetry adds n-fold
// copies (kaleidoscopic flames, a fern snowflake).
//
// State: one texel per particle, RGBA8 = x (12 bits), y (12 bits), colour
// coordinate (8 bits) inside the species' box. Contractive maps forgive the
// quantisation; escaped or stale particles respawn onto another particle.

export const SIDE = 256;
export const SPECIES = 6;
// Boxes [x0, y0, x1, y1] holding each species' attractor (tests check them).
export const BOXES = [
  [-3.5, -3.5, 3.5, 3.5],
  [-2.2, -2.2, 2.2, 2.2],
  [-3.5, -3.5, 3.5, 3.5],
  [-2.4, -2.4, 2.4, 2.4],
  [-3.2, -0.5, 4.8, 11],
  [-0.75, -0.85, 1.35, 1.25],
];
// Rotation centres for the symmetry copies (and the camera).
// Flames feed their n-fold copies back into the iteration (Draves' symmetry
// transforms). The linear classics copy only when drawn: ferns turn about
// their stem's foot (a snowflake of fronds) and dragons about their end
// point, where four Heighway dragons tile the plane around it.

// ---------------------------------------------------------------- CPU --
export function encode(x, y, c, box) {
  const [x0, y0, x1, y1] = box;
  const qx = Math.max(
    0,
    Math.min(4095, Math.round(((x - x0) / (x1 - x0)) * 4095)),
  );
  const qy = Math.max(
    0,
    Math.min(4095, Math.round(((y - y0) / (y1 - y0)) * 4095)),
  );
  const qc = Math.max(0, Math.min(255, Math.round(c * 255)));
  return [qx & 255, (qx >> 8) | ((qy & 15) << 4), qy >> 4, qc];
}
export function decode([r, g, b, a], box) {
  const [x0, y0, x1, y1] = box;
  const qx = r | ((g & 15) << 8);
  const qy = (g >> 4) | (b << 4);
  return [x0 + (qx / 4095) * (x1 - x0), y0 + (qy / 4095) * (y1 - y0), a / 255];
}

// Morphing affine map k of a species at morph phase m (radians):
// [a, b, c, d, e, f] for (a x + b y + e, c x + d y + f), its weight and its
// colour. Non-linear species use rotation × scale × shear.
export function transform(species, k, m) {
  if (species === 4) {
    // Barnsley's fern; the leaflet maps sway gently.
    const sway = 0.04 * Math.sin(m);
    const fern = [
      [[0, 0, 0, 0.16, 0, 0], 0.01, 0.0],
      [[0.85, 0.04 + sway, -0.04 - sway, 0.85, 0, 1.6], 0.85, 0.35],
      [[0.2, -0.26, 0.23, 0.22, 0, 1.6], 0.07, 0.7],
      [[-0.15, 0.28, 0.26, 0.24, 0, 0.44], 0.07, 1.0],
    ];
    return fern[k];
  }
  if (species === 5) {
    // Heighway's dragon: z ↦ (1+i)z/2 and z ↦ 1 − (1−i)z/2, slightly twisted.
    const t = 0.06 * Math.sin(m);
    const c = Math.cos(Math.PI / 4 + t) / Math.SQRT2,
      s = Math.sin(Math.PI / 4 + t) / Math.SQRT2;
    return k === 0
      ? [[c, -s, s, c, 0, 0], 0.5, 0.15]
      : [[-c, -s, s, -c, 1, 0], 0.5, 0.85];
  }
  const rot = [0.6, -1.9, 2.7][k] + 0.55 * Math.sin(m + k * 2.1);
  const scale = [0.62, 0.55, 0.7][k] + 0.08 * Math.sin(m * 0.7 + k);
  const shear = 0.25 * Math.sin(m * 0.5 + k * 1.3);
  const cr = Math.cos(rot) * scale,
    sr = Math.sin(rot) * scale;
  const ex = [0.55, -0.5, 0.05][k] + 0.25 * Math.cos(m * 0.8 + k),
    fy = [0.25, -0.35, 0.55][k] + 0.25 * Math.sin(m * 0.6 + k * 2);
  return [
    [cr, cr * shear - sr, sr, sr * shear + cr, ex, fy],
    [0.45, 0.35, 0.2][k],
    [0.05, 0.5, 0.95][k],
  ];
}

export function count(species) {
  return species === 4 ? 4 : species === 5 ? 2 : 3;
}

// Variation blend per species and transform: [name, weight] pairs.
export const VARIATIONS = [
  [
    [
      ["linear", 0.6],
      ["swirl", 0.4],
    ],
    [
      ["spherical", 0.8],
      ["linear", 0.2],
    ],
    [["sinusoidal", 1]],
  ],
  [
    [["sinusoidal", 1]],
    [
      ["sinusoidal", 0.7],
      ["linear", 0.3],
    ],
    [["linear", 1]],
  ],
  [[["spherical", 1]], [["julia", 1]], [["linear", 1]]],
  [
    [["julia", 1]],
    [
      ["julia", 0.6],
      ["swirl", 0.4],
    ],
    [["disc", 1]],
  ],
];

export function variation(name, x, y, flip = 0) {
  const r2 = x * x + y * y + 1e-9,
    r = Math.sqrt(r2),
    th = Math.atan2(y, x);
  switch (name) {
    case "linear":
      return [x, y];
    case "sinusoidal":
      return [Math.sin(x), Math.sin(y)];
    case "spherical":
      return [x / r2, y / r2];
    case "swirl":
      return [
        x * Math.sin(r2) - y * Math.cos(r2),
        x * Math.cos(r2) + y * Math.sin(r2),
      ];
    case "disc":
      return [
        (th / Math.PI) * Math.sin(Math.PI * r),
        (th / Math.PI) * Math.cos(Math.PI * r),
      ];
    case "julia": {
      const sr = Math.sqrt(r),
        a = th / 2 + (flip ? Math.PI : 0);
      return [sr * Math.cos(a), sr * Math.sin(a)];
    }
  }
  throw new Error(name);
}

// One chaos-game step on the CPU (tests): returns [x, y, c].
export function step(species, m, [x, y, c], random, symmetry = 1) {
  const n = count(species);
  let pick = random(),
    k = 0;
  let total = 0;
  for (let i = 0; i < n; i++) total += transform(species, i, m)[1];
  pick *= total;
  for (; k < n - 1; k++) {
    const w = transform(species, k, m)[1];
    if (pick < w) break;
    pick -= w;
  }
  const [[a, b, cc, d, e, f], , colour] = transform(species, k, m);
  let px = a * x + b * y + e,
    py = cc * x + d * y + f;
  if (species < 4) {
    let vx = 0,
      vy = 0;
    for (const [name, w] of VARIATIONS[species][k]) {
      const [ux, uy] = variation(name, px, py, random() < 0.5);
      vx += w * ux;
      vy += w * uy;
    }
    px = vx;
    py = vy;
  }
  if (species < 4 && symmetry > 1 && random() < 0.5) {
    const turn = (2 * Math.PI * Math.floor(random() * symmetry)) / symmetry;
    [px, py] = [
      px * Math.cos(turn) - py * Math.sin(turn),
      px * Math.sin(turn) + py * Math.cos(turn),
    ];
  }
  return [px, py, (c + colour) / 2];
}

// ---------------------------------------------------------------- GPU --
const common = `
const float BOXES[${SPECIES * 4}] = float[${SPECIES * 4}](${BOXES.flat()
  .map((v) => v.toFixed(3))
  .join(", ")});
vec4 flBox(int s) { return vec4(BOXES[s * 4], BOXES[s * 4 + 1], BOXES[s * 4 + 2], BOXES[s * 4 + 3]); }
int flByte(float v) { return int(v * 255.0 + 0.5); }
mat2 flRot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 flDecode(vec4 t, vec4 box) {
  int r = flByte(t.r), g = flByte(t.g), b = flByte(t.b);
  float qx = float(r | ((g & 15) << 8)), qy = float((g >> 4) | (b << 4));
  return vec3(mix(box.x, box.z, qx / 4095.0), mix(box.y, box.w, qy / 4095.0), t.a);
}
`;

const simulation = `${common}
vec4 flEncode(vec3 p, vec4 box, float jitter) {
  int qx = int(clamp(floor((p.x - box.x) / (box.z - box.x) * 4095.0 + jitter), 0.0, 4095.0));
  int qy = int(clamp(floor((p.y - box.y) / (box.w - box.y) * 4095.0 + jitter), 0.0, 4095.0));
  return vec4(float(qx & 255), float((qx >> 8) | ((qy & 15) << 4)), float(qy >> 4), 0.0) / 255.0
    + vec4(0.0, 0.0, 0.0, clamp(p.z, 0.0, 1.0));
}
// Affine map k (matching the CPU table): mat2 (column-major) + offset.
void flAffine(int s, int k, float m, out mat2 A, out vec2 o, out float w, out float col) {
  if (s == 4) {
    float sway = 0.04 * sin(m);
    if (k == 0) { A = mat2(0.0, 0.0, 0.0, 0.16); o = vec2(0.0); w = 0.01; col = 0.0; }
    else if (k == 1) { A = mat2(0.85, -0.04 - sway, 0.04 + sway, 0.85); o = vec2(0.0, 1.6); w = 0.85; col = 0.35; }
    else if (k == 2) { A = mat2(0.2, 0.23, -0.26, 0.22); o = vec2(0.0, 1.6); w = 0.07; col = 0.7; }
    else { A = mat2(-0.15, 0.26, 0.28, 0.24); o = vec2(0.0, 0.44); w = 0.07; col = 1.0; }
    return;
  }
  if (s == 5) {
    float t = 0.06 * sin(m);
    float c = cos(PI * 0.25 + t) * 0.70710678, sn = sin(PI * 0.25 + t) * 0.70710678;
    if (k == 0) { A = mat2(c, sn, -sn, c); o = vec2(0.0); w = 0.5; col = 0.15; }
    else { A = mat2(-c, sn, -sn, -c); o = vec2(1.0, 0.0); w = 0.5; col = 0.85; }
    return;
  }
  float fk = float(k);
  float rot = (k == 0 ? 0.6 : k == 1 ? -1.9 : 2.7) + 0.55 * sin(m + fk * 2.1);
  float scale = (k == 0 ? 0.62 : k == 1 ? 0.55 : 0.7) + 0.08 * sin(m * 0.7 + fk);
  float shear = 0.25 * sin(m * 0.5 + fk * 1.3);
  float cr = cos(rot) * scale, sr = sin(rot) * scale;
  // Rows (a b; c d) = (cr, cr·shear − sr; sr, sr·shear + cr).
  A = mat2(cr, sr, cr * shear - sr, sr * shear + cr);
  o = vec2((k == 0 ? 0.55 : k == 1 ? -0.5 : 0.05) + 0.25 * cos(m * 0.8 + fk),
           (k == 0 ? 0.25 : k == 1 ? -0.35 : 0.55) + 0.25 * sin(m * 0.6 + fk * 2.0));
  w = k == 0 ? 0.45 : k == 1 ? 0.35 : 0.2;
  col = k == 0 ? 0.05 : k == 1 ? 0.5 : 0.95;
}
vec2 flVariation(int v, vec2 p, bool flip) {
  float r2 = dot(p, p) + 1e-9, r = sqrt(r2), th = atan(p.y, p.x);
  if (v == 0) return p;
  if (v == 1) return sin(p);
  if (v == 2) return p / r2;
  if (v == 3) return vec2(p.x * sin(r2) - p.y * cos(r2), p.x * cos(r2) + p.y * sin(r2));
  if (v == 4) return th / PI * vec2(sin(PI * r), cos(PI * r));
  float a = th * 0.5 + (flip ? PI : 0.0);
  return sqrt(r) * vec2(cos(a), sin(a)); // julia
}
// Variation blend per species/transform (0 linear, 1 sinusoidal,
// 2 spherical, 3 swirl, 4 disc, 5 julia), matching the CPU table.
vec2 flVary(int s, int k, vec2 p, bool flip) {
  if (s == 0) {
    if (k == 0) return 0.6 * p + 0.4 * flVariation(3, p, flip);
    if (k == 1) return 0.8 * flVariation(2, p, flip) + 0.2 * p;
    return flVariation(1, p, flip);
  }
  if (s == 1) {
    if (k == 0) return flVariation(1, p, flip);
    if (k == 1) return 0.7 * flVariation(1, p, flip) + 0.3 * p;
    return p;
  }
  if (s == 2) {
    if (k == 0) return flVariation(2, p, flip);
    if (k == 1) return flVariation(5, p, flip);
    return p;
  }
  if (k == 0) return flVariation(5, p, flip);
  if (k == 1) return 0.6 * flVariation(5, p, flip) + 0.4 * flVariation(3, p, flip);
  return flVariation(4, p, flip);
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  int s = int(floor(u_params[0] + 0.5));
  int symmetry = int(floor(u_params[1] + 0.5));
  float m = mod(u_time, 3600.0) * u_params[2] * 0.12 + float(u_seedBits % 628u) * 0.01;
  vec4 box = flBox(s);
  vec3 p;
  bool respawn = u_reset;
  if (!respawn) {
    p = flDecode(texelFetch(u_state, cell, 0), box);
    respawn = tickHash(cell, 9u) < 0.002;
  }
  if (respawn) {
    if (u_reset) p = vec3(mix(box.xy, box.zw, vec2(tickHash(cell, 1u), tickHash(cell, 2u))), tickHash(cell, 3u));
    else {
      // Teleport onto another particle: it already lies on the attractor.
      ivec2 other = ivec2(vec2(tickHash(cell, 4u), tickHash(cell, 5u)) * ${SIDE}.0);
      p = flDecode(texelFetch(u_state, other, 0), box);
    }
  }
  int n = s == 4 ? 4 : s == 5 ? 2 : 3;
  // Reset frames iterate a few times so the first picture is converged.
  int hops = u_reset ? 24 : 1;
  for (int h = 0; h < 24; h++) {
    if (h >= hops) break;
    float pick = tickHash(cell, 20u + uint(h));
    mat2 A; vec2 o; float w, col;
    float total = 0.0;
    for (int i = 0; i < 4; i++) {
      if (i >= n) break;
      flAffine(s, i, m, A, o, w, col);
      total += w;
    }
    pick *= total;
    int k = n - 1;
    for (int i = 0; i < 4; i++) {
      if (i >= n - 1) break;
      flAffine(s, i, m, A, o, w, col);
      if (pick < w) { k = i; break; }
      pick -= w;
    }
    flAffine(s, k, m, A, o, w, col);
    vec2 q = A * p.xy + o;
    if (s < 4) q = flVary(s, k, q, tickHash(cell, 40u + uint(h)) < 0.5);
    if (s < 4 && symmetry > 1 && tickHash(cell, 60u + uint(h)) < 0.5) {
      float turn = TAU * floor(tickHash(cell, 80u + uint(h)) * float(symmetry)) / float(symmetry);
      q = rot2(-turn) * q;
    }
    p = vec3(q, (p.z + col) * 0.5);
  }
  bool lost = any(isnan(p.xy)) || any(isinf(p.xy)) || p.x < box.x || p.x > box.z || p.y < box.y || p.y > box.w;
  if (lost) {
    ivec2 other = ivec2(vec2(tickHash(cell, 6u), tickHash(cell, 7u)) * ${SIDE}.0);
    p = flDecode(texelFetch(u_state, other, 0), box);
  }
  outColor = flEncode(p, box, tickHash(cell, 8u));
}
`;

const fragment = `
void main() {
  vec3 previous = u_reset ? vec3(0.0) : texture(u_previous, v_uv).rgb;
  emit(vec4(previous * pow(clamp(u_params[5], 0.0, 0.985), u_dt * 60.0), 1.0));
}
`;

const particles = {
  vertex: `${common}
void main() {
  int s = int(floor(u_params[0] + 0.5));
  vec4 box = flBox(s);
  vec3 p = flDecode(particle(), box);
  // Camera: fit the species' box, then zoom and turn slowly.
  bool star = u_params[1] > 1.5;
  vec2 centre = s == 4 ? (star ? vec2(0.0) : vec2(0.0, 5.0))
    : s == 5 ? (star ? vec2(0.0) : vec2(0.3, 0.2)) : vec2(0.0);
  float fit = s == 4 ? (star ? 0.092 : 0.19) : s == 5 ? (star ? 0.75 : 1.15)
    : s == 3 ? 0.85 : 0.42;
  float t = mod(u_time, 3600.0);
  vec2 xy = p.xy;
  int copies = int(floor(u_params[1] + 0.5));
  if (s >= 4 && copies > 1) xy = flRot(6.28318531 * float(gl_VertexID % copies) / float(copies)) * xy;
  vec2 q = flRot(t * u_params[4] * 0.05) * (xy - centre) * fit * u_params[3];
  float aspect = u_resolution.x / u_resolution.y;
  gl_Position = vec4(q.x / aspect, q.y, 0.0, 1.0);
  gl_PointSize = max(1.0, u_resolution.y / 720.0);
  // Colour coordinate → palette; brightness per point stays tiny so the
  // visit density, not single points, makes the image.
  // Each drawn copy of a linear classic gets its own colour, so the four
  // dragons that tile the plane (or the fronds of a snowflake) read apart.
  float copyHue = s >= 4 && copies > 1 ? float(gl_VertexID % copies) / float(copies) : 0.0;
  float hue = fract(p.z * 0.85 + u_params[7] + t * 0.003 + copyHue * 0.6);
  v_color = palette(hue) * u_params[6] * 0.07 * (0.75 + 0.5 * u_level);
}
`,
};

const schema = [
  {
    key: "species",
    label: "Species · swirl / sinusoidal / spherical / julia / fern / dragon",
    min: 0,
    max: 5,
    step: 1,
    default: 0,
  },
  {
    key: "symmetry",
    label: "Rotational symmetry · 1–6",
    min: 1,
    max: 6,
    step: 1,
    default: 1,
  },
  {
    key: "morph",
    label: "Morph speed",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.3,
  },
  { key: "zoom", label: "Zoom", min: 0.5, max: 3, step: 0.01, default: 1 },
  { key: "spin", label: "Spin", min: -1, max: 1, step: 0.01, default: 0.1 },
  {
    key: "trail",
    label: "Density memory",
    min: 0.5,
    max: 0.98,
    step: 0.01,
    default: 0.9,
  },
  {
    key: "brightness",
    label: "Brightness",
    min: 0.2,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "hue",
    label: "Colour offset",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
  },
];

const look = (
  name,
  seed,
  species,
  symmetry,
  morph,
  zoom,
  spin,
  trail,
  brightness,
  hue,
) => ({
  name,
  seed,
  params: { species, symmetry, morph, zoom, spin, trail, brightness, hue },
});

const presets = [
  look("Swirl Flame", 6901, 0, 1, 0.3, 1, 0.08, 0.92, 1, 0),
  look("Sinusoid Weave", 6902, 1, 2, 0.25, 1.1, -0.06, 0.93, 0.9, 0.3),
  look("Spherical Bloom", 6903, 2, 1, 0.35, 0.9, 0.12, 0.9, 1.1, 0.6),
  look("Julia Flame", 6904, 3, 1, 0.3, 1, 0.05, 0.94, 1, 0.15),
  look("Kaleido Flame", 6905, 0, 5, 0.4, 1.05, 0.15, 0.9, 1.1, 0.45),
  look("Julia Mandala", 6906, 3, 6, 0.25, 1.1, -0.1, 0.92, 1.05, 0.8),
  look("Barnsley Fern", 6907, 4, 1, 0.6, 1, 0, 0.95, 1.2, 0.25),
  look("Fern Snowflake", 6908, 4, 6, 0.5, 0.75, 0.08, 0.93, 1.1, 0.55),
  look("Heighway Dragon", 6909, 5, 1, 0.4, 1, 0.04, 0.95, 1.2, 0.05),
  look("Dragon Rose", 6910, 5, 4, 0.35, 0.8, -0.06, 0.93, 1.1, 0.7),
];

export default {
  id: "flame",
  number: 69,
  name: "Fractal Flames",
  description:
    "The chaos game: 65,536 particles each apply a randomly chosen transform every tick and land on the attractor of an iterated function system; their visit density is the picture. Draves' flame algorithm adds non-linear variations (swirl, spherical, sinusoidal, julia, disc) and colours each point by the transforms that made it. Barnsley's fern and Heighway's dragon are the classic linear chaos games. Maps morph on closed loops; optional n-fold symmetry.",
  // Particle space is fitted to the frame's short side; any aspect works.
  energy: {
    morph: { mul: [0.4, 2.2] },
    spin: { mul: [0.5, 2] },
    brightness: [-0.15, 0.25],
  },
  beat: { punch: 0.9, pulse: 1 },
  audio: [
    { param: "morph", feature: "low", amount: 0.08 },
    { param: "brightness", feature: "high", amount: 0.08 },
  ],
  stage: ["morph", "zoom", "spin"],
  type: { key: "species", values: [0, 1, 2, 3, 4, 5] },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [SIDE, SIDE], steps: 1 },
  particles,
};
