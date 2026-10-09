// Wallpaper Groups (#76): all 17 plane symmetry groups, made with Frank
// Farris' wave-function method. A lattice-periodic complex function
// f(X, Y) = Σ a_j·exp(2πi(n_j X + m_j Y)) (X, Y in lattice coordinates)
// is averaged over the group's operations (X → A·X + t, from the
// International Tables), F = Σ_k f(A_k X + t_k). The result has exactly
// that symmetry: mirrors, glides, 2-, 3-, 4- and 6-fold centres. F is
// shown by domain colouring: hue by its phase, light by its modulus, with
// contour rings. Zeros of F (all hues meeting in a point) sit pinned on
// the rotation centres the group forces.
//
// The coefficients turn slowly and re-roll every 16 beats with a smooth
// crossfade, so the pattern keeps changing while the symmetry never
// breaks.

// Fractional-coordinate operations [a11, a12, a21, a22, t1, t2].
const I = [1, 0, 0, 1, 0, 0];
const op = (a11, a12, a21, a22, t1 = 0, t2 = 0) => [a11, a12, a21, a22, t1, t2];
const H = 0.5;
const P3 = [I, op(0, -1, 1, -1), op(-1, 1, -1, 0)];
const P4 = [I, op(-1, 0, 0, -1), op(0, -1, 1, 0), op(0, 1, -1, 0)];
const PMM = [I, op(-1, 0, 0, -1), op(-1, 0, 0, 1), op(1, 0, 0, -1)];
const centred = (ops) => [
  ...ops,
  ...ops.map(([a, b, c, d, t1, t2]) => [a, b, c, d, t1 + H, t2 + H]),
];
const P6 = [...P3, op(-1, 0, 0, -1), op(0, 1, -1, 1), op(1, -1, 1, 0)];

// lattice: 0 oblique, 1 rectangular, 2 centred rectangular, 3 square, 4 hexagonal
export const GROUPS = [
  { name: "p1", lattice: 0, ops: [I] },
  { name: "p2", lattice: 0, ops: [I, op(-1, 0, 0, -1)] },
  { name: "pm", lattice: 1, ops: [I, op(-1, 0, 0, 1)] },
  { name: "pg", lattice: 1, ops: [I, op(-1, 0, 0, 1, 0, H)] },
  { name: "cm", lattice: 2, ops: centred([I, op(-1, 0, 0, 1)]) },
  { name: "pmm", lattice: 1, ops: PMM },
  {
    name: "pmg",
    lattice: 1,
    ops: [I, op(-1, 0, 0, -1), op(-1, 0, 0, 1, H, 0), op(1, 0, 0, -1, H, 0)],
  },
  {
    name: "pgg",
    lattice: 1,
    ops: [I, op(-1, 0, 0, -1), op(-1, 0, 0, 1, H, H), op(1, 0, 0, -1, H, H)],
  },
  { name: "cmm", lattice: 2, ops: centred(PMM) },
  { name: "p4", lattice: 3, ops: P4 },
  {
    name: "p4m",
    lattice: 3,
    ops: [
      ...P4,
      op(-1, 0, 0, 1),
      op(1, 0, 0, -1),
      op(0, 1, 1, 0),
      op(0, -1, -1, 0),
    ],
  },
  {
    name: "p4g",
    lattice: 3,
    ops: [
      ...P4,
      op(-1, 0, 0, 1, H, H),
      op(1, 0, 0, -1, H, H),
      op(0, 1, 1, 0, H, H),
      op(0, -1, -1, 0, H, H),
    ],
  },
  { name: "p3", lattice: 4, ops: P3 },
  {
    name: "p3m1",
    lattice: 4,
    ops: [...P3, op(0, -1, -1, 0), op(-1, 1, 0, 1), op(1, 0, 1, -1)],
  },
  {
    name: "p31m",
    lattice: 4,
    ops: [...P3, op(0, 1, 1, 0), op(1, -1, 0, -1), op(-1, 0, -1, 1)],
  },
  { name: "p6", lattice: 4, ops: P6 },
  {
    name: "p6m",
    lattice: 4,
    ops: [
      ...P6,
      op(0, -1, -1, 0),
      op(-1, 1, 0, 1),
      op(1, 0, 1, -1),
      op(0, 1, 1, 0),
      op(1, -1, 0, -1),
      op(-1, 0, -1, 1),
    ],
  },
];

// Conventional cell bases (Cartesian columns b1, b2).
export const LATTICES = [
  [
    [1, 0],
    [0.35, 0.85],
  ],
  [
    [1, 0],
    [0, 0.65],
  ],
  [
    [1, 0],
    [0, 0.75],
  ],
  [
    [1, 0],
    [0, 1],
  ],
  // Hexagonal: 120° between b1 and b2, as the International Tables use.
  [
    [1, 0],
    [-0.5, Math.sqrt(3) / 2],
  ],
];

// CPU reference: F at Cartesian point p for wave terms [{n, m, re, im}].
export function wallpaper(p, group, terms) {
  const [b1, b2] = LATTICES[group.lattice];
  const det = b1[0] * b2[1] - b2[0] * b1[1];
  const X = (p[0] * b2[1] - b2[0] * p[1]) / det,
    Y = (b1[0] * p[1] - p[0] * b1[1]) / det;
  let re = 0,
    im = 0;
  for (const [a11, a12, a21, a22, t1, t2] of group.ops) {
    const x = a11 * X + a12 * Y + t1,
      y = a21 * X + a22 * Y + t2;
    for (const w of terms) {
      const ph = 2 * Math.PI * (w.n * x + w.m * y);
      re += w.re * Math.cos(ph) - w.im * Math.sin(ph);
      im += w.re * Math.sin(ph) + w.im * Math.cos(ph);
    }
  }
  return [re, im];
}

const OPS = GROUPS.flatMap((g) => g.ops);
const starts = [];
GROUPS.reduce((n, g) => (starts.push(n), n + g.ops.length), 0);
const glslOpsA = OPS.map(
  ([a, b, c, d]) => `mat2(${a}.0, ${c}.0, ${b}.0, ${d}.0)`,
).join(", ");
const glslOpsT = OPS.map(
  ([, , , , t1, t2]) => `vec2(${t1.toFixed(1)}, ${t2.toFixed(1)})`,
).join(", ");
const glslLattice = LATTICES.map(
  ([b1, b2]) => `mat2(${b1[0]}, ${b1[1]}, ${b2[0]}, ${b2[1].toFixed(7)})`,
).join(", ");
const MAX_TERMS = 8;

const fragment = `
const mat2 OPS_A[${OPS.length}] = mat2[](${glslOpsA});
const vec2 OPS_T[${OPS.length}] = vec2[](${glslOpsT});
const int GROUP_START[${GROUPS.length}] = int[](${starts.join(", ")});
const int GROUP_COUNT[${GROUPS.length}] = int[](${GROUPS.map((g) => g.ops.length).join(", ")});
const int GROUP_LATTICE[${GROUPS.length}] = int[](${GROUPS.map((g) => g.lattice).join(", ")});
const mat2 LATTICE[${LATTICES.length}] = mat2[](${glslLattice});
float wRand(uint a, uint b) { return float(cellHash(uvec3(a, b, 71u)) >> 8u) / 16777216.0; }
// Wave term j of generation g: integer frequencies and a complex weight.
void wTerm(int j, uint g, out vec2 nm, out vec2 w) {
  nm = floor(vec2(wRand(g, uint(j) * 4u), wRand(g, uint(j) * 4u + 1u)) * 5.0) - 2.0;
  if (nm == vec2(0.0)) nm = vec2(1.0, 0.0);
  float r = 1.0 / (0.6 + length(nm));
  float a = TAU * wRand(g, uint(j) * 4u + 2u);
  w = r * vec2(cos(a), sin(a));
}
void main() {
  int group = clamp(int(floor(u_params[0] + 0.5)), 0, ${GROUPS.length - 1});
  float scale = u_params[1];
  float flow = u_params[2];
  int terms = clamp(int(floor(u_params[3] + 0.5)), 2, ${MAX_TERMS});
  float morph = u_params[4];
  float rings = u_params[5];
  float cell = u_params[6];
  float spin = u_params[7];
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;
  float beatPulse = u_beat > 0.0 ? exp(-5.0 * fract(u_beat)) : 0.0;

  // Screen → plane → lattice coordinates.
  vec2 p = rot2(t * spin * 0.03) * aspectUV() * scale + vec2(t * 0.02, t * 0.013);
  mat2 B = LATTICE[GROUP_LATTICE[group]];
  vec2 X = inverse(B) * p;

  // Two generations of coefficients crossfade every 16 beats (morph).
  float era = beats / 16.0 * (0.25 + 0.75 * morph);
  uint g0 = uint(floor(era)), g1 = g0 + 1u;
  float mixG = smoothstep(0.0, 1.0, fract(era));
  vec2 F = vec2(0.0);
  int start = GROUP_START[group], count = GROUP_COUNT[group];
  for (int j = 0; j < ${MAX_TERMS}; j++) {
    if (j >= terms) break;
    vec2 nm0, w0, nm1, w1;
    wTerm(j, g0, nm0, w0);
    wTerm(j, g1, nm1, w1);
    // Each term's phase turns with its own speed.
    float spinJ = t * flow * (0.4 + 0.25 * float(j)) * (mod(float(j), 2.0) < 0.5 ? 1.0 : -1.0);
    w0 = rot2(spinJ) * w0 * (1.0 - mixG);
    w1 = rot2(spinJ) * w1 * mixG;
    for (int k = 0; k < 12; k++) {
      if (k >= count) break;
      vec2 Y = OPS_A[start + k] * X + OPS_T[start + k];
      float a0 = TAU * dot(nm0, Y), a1 = TAU * dot(nm1, Y);
      F += vec2(w0.x * cos(a0) - w0.y * sin(a0), w0.x * sin(a0) + w0.y * cos(a0));
      F += vec2(w1.x * cos(a1) - w1.y * sin(a1), w1.x * sin(a1) + w1.y * cos(a1));
    }
  }
  F /= sqrt(float(count * terms));

  // Domain colouring: hue by phase, light by modulus, log-modulus rings.
  float m = length(F);
  float phase = atan(F.y, F.x) / TAU;
  float light = pow(m / (m + 0.35), 1.3);
  float band = 0.5 + 0.5 * cos(TAU * (log2(max(m, 1e-4)) * 1.2 - beats * 0.25));
  vec3 colour = palette(fract(phase + 0.5 + 0.1 * beatPulse)) * light * (1.0 - rings * 0.35 * (1.0 - band));
  colour += mix(u_accent, vec3(1.0), 0.5) * rings * 0.45 * smoothstep(0.88, 1.0, band) * light;
  // The unit cell, faint.
  vec2 fx = abs(fract(X + 0.5) - 0.5) / max(fwidth(X), vec2(1e-5));
  float grid = 1.0 - smoothstep(0.5, 1.6, min(fx.x, fx.y));
  colour = mix(colour, mix(u_primary, vec3(1.0), 0.5), grid * cell * (0.5 + 0.3 * u_level));
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "group",
    label:
      "Group · p1 p2 pm pg cm pmm pmg pgg cmm p4 p4m p4g p3 p3m1 p31m p6 p6m",
    min: 0,
    max: GROUPS.length - 1,
    step: 1,
    default: 16,
  },
  {
    key: "scale",
    label: "Cells across",
    min: 1.2,
    max: 10,
    step: 0.05,
    default: 3.5,
  },
  {
    key: "flow",
    label: "Phase flow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
  {
    key: "terms",
    label: "Wave terms",
    min: 2,
    max: MAX_TERMS,
    step: 1,
    default: 5,
  },
  {
    key: "morph",
    label: "Re-roll speed (per 16 beats)",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "rings",
    label: "Contour rings",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "cell",
    label: "Unit cell",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.15,
  },
  { key: "spin", label: "Turn", min: -1, max: 1, step: 0.01, default: 0.1 },
];

const look = (
  name,
  seed,
  group,
  scale,
  flow,
  terms,
  morph,
  rings,
  cell,
  spin,
) => ({
  name,
  seed,
  params: { group, scale, flow, terms, morph, rings, cell, spin },
});

const presets = [
  look("p6m Snowflake", 7601, 16, 2.08, 0.3, 5, 0.5, 0.5, 0.1, 0.1),
  look("p4m Tiles", 7602, 10, 2.27, 0.3, 5, 0.5, 0.6, 0.15, 0),
  look("p4g Pinwheels", 7603, 11, 1.95, 0.35, 6, 0.5, 0.4, 0.1, 0.15),
  look("p3 Triskelion", 7604, 12, 2.27, 0.4, 5, 0.6, 0.45, 0.15, -0.1),
  look("p31m Lace", 7605, 14, 2.6, 0.3, 6, 0.5, 0.55, 0.1, 0.05),
  look("p3m1 Kaleidoscope", 7606, 13, 1.69, 0.3, 4, 0.4, 0.5, 0, 0.2),
  look("p6 Spirals", 7607, 15, 1.95, 0.45, 6, 0.6, 0.4, 0.1, -0.15),
  look("p4 Turnstiles", 7608, 9, 2.27, 0.4, 5, 0.5, 0.5, 0.2, 0.1),
  look("cmm Diamonds", 7609, 8, 2.27, 0.3, 5, 0.5, 0.55, 0.15, 0),
  look("pgg Weave", 7610, 7, 2.27, 0.35, 6, 0.5, 0.45, 0.2, 0.05),
  look("pmg Ribbons", 7611, 6, 2.6, 0.3, 5, 0.5, 0.5, 0.15, 0),
  look("pmm Panels", 7612, 5, 2.6, 0.25, 4, 0.4, 0.6, 0.25, 0),
  look("cm Feathers", 7613, 4, 2.27, 0.35, 6, 0.5, 0.4, 0.1, 0.1),
  look("pg Footprints", 7614, 3, 2.6, 0.4, 5, 0.5, 0.45, 0.2, -0.05),
  look("pm Mirrors", 7615, 2, 2.6, 0.3, 5, 0.5, 0.5, 0.2, 0),
  look("p2 Pinwheel Field", 7616, 1, 2.27, 0.4, 6, 0.6, 0.45, 0.15, 0.1),
  look("p1 Drift", 7617, 0, 1.95, 0.4, 7, 0.7, 0.4, 0.2, 0.05),
];

export default {
  id: "wallpaper",
  number: 76,
  name: "Wallpaper Groups",
  description:
    "All 17 plane symmetry groups, made with Farris' wave-function method: a lattice-periodic complex function averaged over the group's mirrors, glides and rotations, so the pattern has exactly that symmetry. Domain colouring shows its phase as hue and its modulus as light, with contour rings; the zeros, where all hues meet, sit pinned on the rotation centres. The waves turn and re-roll every 16 beats while the symmetry never breaks.",
  maxRenderWidth: 1600,
  energy: { flow: { mul: [0.5, 2] }, morph: [-0.2, 0.3], rings: [-0.1, 0.2] },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "flow", feature: "low", amount: 0.06 },
    { param: "rings", feature: "high", amount: 0.1 },
    { param: "spin", feature: "onset", amount: 0.05 },
  ],
  stage: ["flow", "morph", "rings"],
  type: { key: "group", values: GROUPS.map((_, i) => i) },
  schema,
  presets,
  fragment,
};
