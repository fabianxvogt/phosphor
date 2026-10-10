// Aperiodic Tilings (#70): de Bruijn's multigrid method. D families of
// parallel grid lines (directions e_j, offsets γ_j) cut the plane; every
// intersection of two lines becomes a rhombus spanned by e_r and e_s,
// placed at Σ K_j e_j, where K_j counts the lines of family j crossed so
// far. D = 5 gives Penrose's rhombus tiling, D = 4 (eight-fold) the
// Ammann–Beenker tiling, D = 7 a heptagonal and D = 6 a dodecagonal one.
// None of them ever repeats.
//
// Per pixel, the shader inverts the duality: x in tiling space sits near
// grid point P ≈ 2x/D, so it tries the intersections of nearby lines of
// every pair of families and keeps the rhombus that contains x.
//
// Signature details: thick and thin rhombi in their own colours; the
// ribbons (chains of rhombi sharing an edge direction), which are the
// grid lines themselves, light up family by family on the beat; and
// phason flips, where the offsets γ_j drift so tiles flip in place while
// the tiling stays perfectly aperiodic.

export const TILINGS = [5, 4, 7, 6]; // grid families D
const MAX_D = 7;

// Directions: odd D use 2πj/D, even D use πj/D (no repeated lines).
export function directions(D) {
  const step = (D % 2 ? 2 : 1) * (Math.PI / D);
  return Array.from({ length: D }, (_, j) => [
    Math.cos(j * step),
    Math.sin(j * step),
  ]);
}

// Offsets γ_j with Σγ = 0 (for D = 5 that is a Penrose tiling).
export function offsets(D, phase, depth = 0.25) {
  const g = Array.from(
    { length: D },
    (_, j) => 0.2 + depth * Math.sin(phase + j * 2.39996),
  );
  const mean = g.reduce((a, b) => a + b, 0) / D;
  return g.map((v) => v - mean + (D === 5 ? 0 : 0.1 / D));
}

// Every candidate rhombus containing tiling-space point x, as
// { r, s, a, b, v0 }. A correct tiling yields exactly one.
export function rhombi(x, D, gamma) {
  const found = [];
  const e = directions(D);
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
  const P = [(2 * x[0]) / D, (2 * x[1]) / D];
  for (let r = 0; r < D; r++)
    for (let s = r + 1; s < D; s++) {
      const tr = dot(P, e[r]) - gamma[r],
        ts = dot(P, e[s]) - gamma[s];
      for (let dr = -1; dr <= 1; dr++)
        for (let ds = -1; ds <= 1; ds++) {
          const kr = Math.floor(tr) + dr,
            ks = Math.floor(ts) + ds;
          // Grid intersection Q: Q·e_r = kr + γ_r, Q·e_s = ks + γ_s.
          const det = e[r][0] * e[s][1] - e[r][1] * e[s][0];
          const br = kr + gamma[r],
            bs = ks + gamma[s];
          const Q = [
            (br * e[s][1] - bs * e[r][1]) / det,
            (bs * e[r][0] - br * e[s][0]) / det,
          ];
          let v0 = [0, 0];
          for (let j = 0; j < D; j++) {
            const K =
              j === r ? kr : j === s ? ks : Math.ceil(dot(Q, e[j]) - gamma[j]);
            v0 = [v0[0] + K * e[j][0], v0[1] + K * e[j][1]];
          }
          const dx = [x[0] - v0[0], x[1] - v0[1]];
          const a = (dx[0] * e[s][1] - dx[1] * e[s][0]) / det,
            b = (e[r][0] * dx[1] - e[r][1] * dx[0]) / det;
          if (a >= 0 && a <= 1 && b >= 0 && b <= 1)
            found.push({ r, s, a, b, v0 });
        }
    }
  return found;
}

// The rhombus containing x (the shader keeps the first hit), or null.
export function locate(x, D, gamma) {
  return rhombi(x, D, gamma)[0] ?? null;
}

const fragment = `
const int MAX_D = ${MAX_D};
void main() {
  int tiling = int(floor(u_params[0] + 0.5));
  int D = tiling == 0 ? 5 : tiling == 1 ? 4 : tiling == 2 ? 7 : 6;
  float scale = u_params[1];
  float phason = u_params[2];
  float drift = u_params[3];
  float spin = u_params[4];
  float edgeWidth = u_params[5];
  float ribbons = u_params[6];
  float fill = u_params[7];
  float t = mod(u_time, 3600.0);
  float seed = float(u_seedBits % 997u) * 0.37;

  // Directions and offsets (Σγ = 0 keeps D = 5 a true Penrose tiling).
  vec2 e[MAX_D];
  float g[MAX_D];
  float stepAngle = (D % 2 == 1 ? 2.0 : 1.0) * PI / float(D);
  float mean = 0.0;
  float flip = t * phason * 0.06 + seed;
  for (int j = 0; j < MAX_D; j++) {
    if (j >= D) break;
    e[j] = vec2(cos(float(j) * stepAngle), sin(float(j) * stepAngle));
    g[j] = 0.2 + 0.25 * sin(flip + float(j) * 2.39996);
    mean += g[j];
  }
  mean /= float(D);
  for (int j = 0; j < MAX_D; j++) {
    if (j >= D) break;
    g[j] += -mean + (D == 5 ? 0.0 : 0.1 / float(D));
  }

  // Camera in tiling space: tiles across the short side, slow pan and turn.
  vec2 pan = vec2(t * drift * 0.31, t * drift * 0.17) + vec2(seed * 3.1, seed * 1.7);
  vec2 x = rot2(t * spin * 0.02) * aspectUV() * scale + pan;
  vec2 P = 2.0 * x / float(D);

  bool found = false;
  int fr = 0, fs = 0;
  float fa = 0.0, fb = 0.0, fdet = 1.0, fkr = 0.0, fks = 0.0;
  vec2 fv = vec2(0.0);
  for (int r = 0; r < MAX_D; r++) {
    if (r >= D || found) break;
    for (int s = 0; s < MAX_D; s++) {
      if (s >= D || found) break;
      if (s <= r) continue;
      float det = e[r].x * e[s].y - e[r].y * e[s].x;
      float tr = dot(P, e[r]) - g[r], ts = dot(P, e[s]) - g[s];
      for (int dr = -1; dr <= 1; dr++) {
        if (found) break;
        for (int ds = -1; ds <= 1; ds++) {
          float kr = floor(tr) + float(dr), ks = floor(ts) + float(ds);
          float br = kr + g[r], bs = ks + g[s];
          vec2 Q = vec2(br * e[s].y - bs * e[r].y, bs * e[r].x - br * e[s].x) / det;
          vec2 v0 = vec2(0.0);
          for (int j = 0; j < MAX_D; j++) {
            if (j >= D) break;
            float K = j == r ? kr : j == s ? ks : ceil(dot(Q, e[j]) - g[j]);
            v0 += K * e[j];
          }
          vec2 d = x - v0;
          float a = (d.x * e[s].y - d.y * e[s].x) / det;
          float b = (e[r].x * d.y - e[r].y * d.x) / det;
          if (a >= 0.0 && a <= 1.0 && b >= 0.0 && b <= 1.0) {
            found = true; fr = r; fs = s; fa = a; fb = b;
            fdet = abs(det); fkr = kr; fks = ks; fv = v0;
            break;
          }
        }
      }
    }
  }

  vec3 colour = u_secondary * 0.02;
  if (found) {
    // World-space pixel size keeps lines and dots crisp at any zoom.
    float px = max(length(fwidth(x)) * 0.7, 1e-4);
    // Rhombus class: the angle between its two edges (thick / thin for
    // Penrose; square / 45° for Ammann–Beenker, …).
    int gap = fs - fr;
    int cls = min(gap, D - gap);
    float k = float(cls) / max(float(D / 2), 1.0);
    vec3 tile = palette(fract(0.08 + k * 0.78));
    // Glass: dark at the rim, glowing toward the middle of each rhombus.
    float inset = min(min(fa, 1.0 - fa), min(fb, 1.0 - fb)) * fdet;
    float glass = 0.12 + 0.6 * smoothstep(0.0, 0.42, inset);
    colour = tile * fill * glass;

    // Ribbons (Conway worms): the rhombi dual to one grid line of family j
    // form a chain sharing edges parallel to e_j. On every beat the next
    // family lights every third ribbon, with a pulse running along it.
    int lit = int(floor(max(u_beat, 0.0))) % D;
    float beatPhase = fract(max(u_beat, 0.0));
    float kLit = fr == lit ? fkr : fks;
    bool onRibbon = (fr == lit || fs == lit) &&
      mod(kLit + floor(max(u_beat, 0.0) / float(D)), 3.0) < 0.5;
    if (onRibbon) {
      vec2 along = vec2(-e[lit].y, e[lit].x);
      float pulse = 0.55 + 0.45 * sin(dot(x, along) * 0.7 - t * 2.4);
      float hit = 0.35 + 0.65 * (1.0 - beatPhase) * (1.0 - beatPhase);
      colour += mix(u_accent, vec3(1.0), 0.25) * ribbons * hit * pulse * 0.75;
    }

    // Luminous edges, constant in pixels.
    float edge = inset / px;
    float line = 1.0 - smoothstep(0.0, 0.8 + 2.4 * edgeWidth, edge);
    vec3 neon = mix(u_primary, vec3(1.0), 0.35);
    colour = mix(colour, neon, line * (0.6 + 0.4 * u_level));

    // Vertices: every vertex is a lattice point Σ K_j e_j; small stars.
    vec2 c0 = x - fv;
    float dv = min(min(length(c0), length(c0 - e[fr])),
                   min(length(c0 - e[fs]), length(c0 - e[fr] - e[fs]))) / px;
    float star = exp(-dv * dv / (6.0 + 18.0 * edgeWidth));
    colour += mix(u_accent, vec3(1.0), 0.6) * star * (0.5 + 0.5 * u_level);
  }
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "tiling",
    label: "Tiling · Penrose / Ammann–Beenker / heptagonal / dodecagonal",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "scale",
    label: "Tiles across",
    min: 3,
    max: 30,
    step: 0.1,
    default: 9,
  },
  {
    key: "phason",
    label: "Phason flips",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.3,
  },
  { key: "drift", label: "Drift", min: 0, max: 1, step: 0.01, default: 0.2 },
  { key: "spin", label: "Spin", min: -1, max: 1, step: 0.01, default: 0.1 },
  {
    key: "edge",
    label: "Edge width",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "ribbons",
    label: "Ribbon light",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  { key: "fill", label: "Tile fill", min: 0, max: 1, step: 0.01, default: 0.6 },
];

const look = (
  name,
  seed,
  tiling,
  scale,
  phason,
  drift,
  spin,
  edge,
  ribbons,
  fill,
) => ({
  name,
  seed,
  params: { tiling, scale, phason, drift, spin, edge, ribbons, fill },
});

const presets = [
  look("Penrose Rhombs", 7001, 0, 9, 0.25, 0.15, 0.06, 0.4, 0.6, 0.65),
  look("Phason Storm", 7002, 0, 14, 1.2, 0.1, -0.05, 0.3, 0.4, 0.5),
  look("Penrose Ribbons", 7003, 0, 18, 0.15, 0.3, 0.1, 0.2, 1, 0.25),
  look("Ammann–Beenker", 7004, 1, 10, 0.3, 0.2, -0.08, 0.45, 0.6, 0.6),
  look("Octagonal Glass", 7005, 1, 5, 0.5, 0.1, 0.15, 0.8, 0.3, 0.85),
  look("Heptagonal Lace", 7006, 2, 12, 0.35, 0.15, 0.05, 0.3, 0.7, 0.45),
  look("Dodecagonal Star", 7007, 3, 11, 0.3, 0.12, -0.1, 0.35, 0.6, 0.55),
  look("Close Rhombs", 7008, 0, 4, 0.6, 0.05, 0.2, 0.9, 0.5, 0.9),
];

export default {
  id: "quasicrystal",
  number: 70,
  name: "Aperiodic Tilings",
  description:
    "De Bruijn's multigrid: families of parallel lines whose crossings become rhombi. Five families give Penrose's never-repeating rhombus tiling, four the eight-fold Ammann–Beenker tiling, seven and six heptagonal and dodecagonal ones. Thick and thin rhombi glow in their own colours; on the beat the ribbons of one grid family light up (they are the grid lines); drifting offsets make phason flips, tiles flipping in place while the tiling stays aperiodic.",
  energy: {
    phason: { mul: [0.4, 2.2] },
    drift: { mul: [0.5, 2] },
    ribbons: [0, 0.4],
    edge: [-0.1, 0.2],
  },
  beat: { punch: 0.8, pulse: 1 },
  audio: [
    { param: "phason", feature: "low", amount: 0.08 },
    { param: "ribbons", feature: "onset", amount: 0.15 },
    { param: "edge", feature: "high", amount: 0.08 },
  ],
  stage: ["phason", "scale", "ribbons"],
  type: { key: "tiling", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
};
