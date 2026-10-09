// Langton's Ant (#73): an ant on a grid of coloured cells turns right or
// left by the colour under it, advances the cell's colour by one and steps
// forward. With two colours (rule RL) it makes ~10 000 steps of chaos and
// then, out of nowhere, builds a "highway": a 104-step cycle that moves it
// two cells diagonally for ever. Longer rules (one letter per colour) grow
// symmetric blooms (LLRR), fill squares (LRRRRRLLR), build triangles
// (RRLLLRLLLRRR) or wander chaotically (RLR).
//
// The grid is a 320×180 torus, so highways wrap around and crash into old
// debris, which makes new chaos and new highways: it never settles. Up to
// 12 ants share the grid. Row 180 of the state holds the ants; every
// simulation pass moves each ant one step (48 passes per frame at full
// speed). Recently flipped cells glow, so the ant's path reads at once.

export const RULES = [
  "RL",
  "LLRR",
  "LRRRRRLLR",
  "RRLLLRLLLRRR",
  "RLR",
  "LLRRRLRLRLLR",
];
export const GRID = [320, 180];
export const MAX_ANTS = 12;
const PASSES = 48;
const [GW, GH] = GRID;
const DIRS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
]; // up, right, down, left: turning right is dir + 1

export const ruleMask = (rule) =>
  [...rule].reduce((m, c, i) => m | ((c === "R" ? 1 : 0) << i), 0);

// CPU reference: run one ant on a w×h torus for `steps` steps.
export function runAnt(rule, steps, { w = GW, h = GH, track = null } = {}) {
  const n = rule.length,
    mask = ruleMask(rule);
  const grid = new Uint8Array(w * h);
  let x = w >> 1,
    y = h >> 1,
    dir = 0;
  for (let s = 0; s < steps; s++) {
    const i = y * w + x;
    const c = grid[i];
    dir = (mask >> c) & 1 ? (dir + 1) & 3 : (dir + 3) & 3;
    grid[i] = (c + 1) % n;
    x = (x + DIRS[dir][0] + w) % w;
    y = (y + DIRS[dir][1] + h) % h;
    track?.(s + 1, x, y, dir);
  }
  return { grid, x, y, dir };
}

const ruleTable = RULES.map((r) => `${ruleMask(r)}`).join(", ");
const ruleLengths = RULES.map((r) => `${r.length}`).join(", ");

const header = `
const int GW = ${GW}, GH = ${GH}, MAX_ANTS = ${MAX_ANTS};
const int RULE_MASK[${RULES.length}] = int[](${ruleTable});
const int RULE_N[${RULES.length}] = int[](${ruleLengths});
// Ant k lives at texel (k, GH): r x low byte, g x high byte, b y, a dir + 1
// (0 = no ant).
ivec3 tAnt(int k) {
  vec4 a = texelFetch(u_state, ivec2(k, GH), 0) * 255.0 + 0.5;
  return ivec3(int(a.r) + 256 * int(a.g), int(a.b), int(a.a) - 1);
}
ivec2 tDir(int d) { return d == 0 ? ivec2(0, 1) : d == 1 ? ivec2(1, 0) : d == 2 ? ivec2(0, -1) : ivec2(-1, 0); }
`;

const simulation = `${header}
float tRand(uint a, uint b) { return float(cellHash(uvec3(a, b, 57u)) >> 8u) / 16777216.0; }
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  int rule = clamp(int(floor(u_params[0] + 0.5)), 0, ${RULES.length - 1});
  int ants = clamp(int(floor(u_params[1] + 0.5)), 1, MAX_ANTS);
  float speed = u_params[2];
  int renew = int(floor(u_params[3] + 0.5));
  float spread = u_params[6];
  float rush = u_params[7];
  int n = RULE_N[rule], mask = RULE_MASK[rule];

  // Meta texel (GW − 1, GH): r last beat, g rule + 1, b generation, a init.
  vec4 meta = texelFetch(u_state, ivec2(GW - 1, GH), 0);
  int lastBeat = int(meta.r * 255.0 + 0.5);
  int generation = int(meta.b * 255.0 + 0.5);
  float beatF = floor(max(u_beat, 0.0));
  int beat = int(beatF) & 255;
  int period = renew == 1 ? 32 : renew == 2 ? 64 : renew == 3 ? 128 : 0;
  bool renewNow = period > 0 && meta.a > 0.5 && beat != lastBeat && int(beatF) % period == 0;
  bool fresh = u_reset || meta.a < 0.5 || renewNow || int(meta.g * 255.0 + 0.5) != rule + 1;
  if (fresh) generation = (generation + 1) & 255;

  // Does every ant step in this pass? The beat rushes them.
  float boost = 1.0 + rush * 2.5 * (u_beat > 0.0 ? exp(-5.0 * fract(u_beat)) : 0.0);
  float sp = clamp(speed * boost, 0.0, 1.0);
  float tk = float(u_tick % 1048576u);
  bool move = !fresh && floor((tk + 1.0) * sp) > floor(tk * sp);

  if (px.y == GH) {
    if (px.x == GW - 1) {
      outColor = vec4(float(beat), float(rule + 1), float(generation), 255.0) / 255.0;
      return;
    }
    int k = px.x;
    if (k >= MAX_ANTS) { outColor = vec4(0.0); return; }
    ivec3 a = tAnt(k);
    bool spawn = k < ants && (fresh || a.z < 0);
    if (k >= ants) { outColor = vec4(0.0); return; }
    if (spawn) {
      // The first ant starts in the centre; the others around it.
      uint g = uint(generation) * 131u + uint(k);
      vec2 off = k == 0 ? vec2(0.0) : (vec2(tRand(g, 1u), tRand(g, 2u)) - 0.5) * vec2(GW, GH) * mix(0.12, 1.0, spread);
      ivec2 p = ivec2(mod(vec2(GW / 2, GH / 2) + floor(off), vec2(GW, GH)));
      int d = k == 0 ? 0 : int(tRand(g, 3u) * 4.0) & 3;
      a = ivec3(p, d);
    } else if (move) {
      int c = int(texelFetch(u_state, a.xy, 0).r * 255.0 + 0.5);
      a.z = ((mask >> c) & 1) == 1 ? (a.z + 1) & 3 : (a.z + 3) & 3;
      ivec2 p = a.xy + tDir(a.z);
      a.xy = ivec2((p.x + GW) % GW, (p.y + GH) % GH);
    }
    outColor = vec4(float(a.x & 255), float(a.x >> 8), float(a.y), float(a.z + 1)) / 255.0;
    return;
  }

  // A cell: its colour index (r) and the glow of its last flip (g).
  if (fresh) { outColor = vec4(0.0); return; }
  vec4 cell = texelFetch(u_state, px, 0);
  int c = int(cell.r * 255.0 + 0.5);
  float heat = cell.g;
  if (u_tick % 8u == 0u) heat = max(heat - 1.0 / 255.0, 0.0);
  if (move)
    for (int k = 0; k < MAX_ANTS; k++) {
      if (k >= ants) break;
      ivec3 a = tAnt(k);
      if (a.z >= 0 && a.xy == px) { c = (c + 1) % n; heat = 1.0; }
    }
  outColor = vec4(float(c) / 255.0, heat, 0.0, 1.0);
}
`;

const fragment = `${header}
void main() {
  int rule = clamp(int(floor(u_params[0] + 0.5)), 0, ${RULES.length - 1});
  int ants = clamp(int(floor(u_params[1] + 0.5)), 1, MAX_ANTS);
  float trail = u_params[4];
  float fill = u_params[5];
  int n = RULE_N[rule];

  vec2 cellF = v_uv * vec2(GW, GH);
  ivec2 ci = clamp(ivec2(floor(cellF)), ivec2(0), ivec2(GW - 1, GH - 1));
  vec2 f = fract(cellF);
  float px = max(fwidth(cellF.x), 1e-3);
  vec4 cell = texelFetch(u_state, ci, 0);
  int c = int(cell.r * 255.0 + 0.5);
  float heat = cell.g;

  // Cells: colour index through the palette, with a fine grid gap when
  // cells are big enough to show it.
  float gapW = px < 0.25 ? 0.07 : 0.0;
  float inside = smoothstep(gapW, gapW + px, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  vec3 colour = u_secondary * 0.025;
  if (c > 0) {
    float k = float(c) / float(max(n - 1, 1));
    colour = palette(fract(0.1 + 0.85 * k)) * fill * (0.35 + 0.65 * k) * mix(1.0, inside, 0.6);
  }
  // Fresh flips glow: the ant's path.
  colour += mix(u_accent, vec3(1.0), 0.35) * pow(heat, 3.0) * trail * (0.6 + 0.4 * u_level);

  // The ants: bright heads with a nose pointing where they go.
  for (int k = 0; k < MAX_ANTS; k++) {
    if (k >= ants) break;
    ivec3 a = tAnt(k);
    if (a.z < 0) continue;
    vec2 head = vec2(a.xy) + 0.5;
    vec2 d = cellF - head;
    d -= vec2(GW, GH) * floor(d / vec2(GW, GH) + 0.5);
    float r = length(d);
    float nose = length(d - vec2(tDir(a.z)) * 0.55);
    float glow = exp(-r * r / 1.6) + 0.8 * exp(-nose * nose / 0.12);
    colour += mix(u_primary, vec3(1.0), 0.6) * glow * (0.8 + 0.4 * u_level);
  }
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "rule",
    label: "Rule · RL / LLRR / LRRRRRLLR / RRLLLRLLLRRR / RLR / LLRRRLRLRLLR",
    min: 0,
    max: RULES.length - 1,
    step: 1,
    default: 0,
  },
  { key: "ants", label: "Ants", min: 1, max: MAX_ANTS, step: 1, default: 1 },
  {
    key: "speed",
    label: "Steps per pass",
    min: 0.05,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "renew",
    label: "Fresh start · never / 32 / 64 / 128 beats",
    min: 0,
    max: 3,
    step: 1,
    default: 2,
  },
  {
    key: "trail",
    label: "Path glow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.7,
  },
  {
    key: "fill",
    label: "Cell colour",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.7,
  },
  {
    key: "spread",
    label: "Ant spread",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
  { key: "rush", label: "Beat rush", min: 0, max: 1, step: 0.01, default: 0.4 },
];

const look = (
  name,
  seed,
  rule,
  ants,
  speed,
  renew,
  trail,
  fill,
  spread,
  rush,
) => ({
  name,
  seed,
  params: { rule, ants, speed, renew, trail, fill, spread, rush },
});

const presets = [
  look("Langton's Highway", 7301, 0, 1, 0.5, 2, 0.8, 0.6, 0, 0.3),
  look("Highway Crash", 7302, 0, 1, 1, 0, 0.6, 0.7, 0, 0.2),
  look("Ant Colony", 7303, 0, 8, 0.6, 3, 0.7, 0.6, 0.8, 0.4),
  look("Symmetric Bloom", 7304, 1, 1, 0.7, 2, 0.6, 0.75, 0, 0.3),
  look("Twin Blooms", 7305, 1, 2, 0.6, 2, 0.6, 0.75, 0.15, 0.4),
  look("Square Filler", 7306, 2, 1, 0.8, 2, 0.5, 0.8, 0, 0.3),
  look("Triangle Builder", 7307, 3, 1, 0.9, 3, 0.5, 0.8, 0, 0.3),
  look("Chaotic Growth", 7308, 4, 1, 0.6, 2, 0.7, 0.7, 0, 0.5),
  look("Convoluted Highway", 7309, 5, 1, 1, 3, 0.5, 0.75, 0, 0.3),
  look("Swarm of Twelve", 7310, 0, 12, 0.5, 2, 0.8, 0.55, 0.35, 0.8),
];

export default {
  id: "turmite",
  number: 73,
  name: "Langton's Ant",
  description:
    "An ant turns by the colour under it, advances that colour and steps on. With two colours it makes about 10 000 steps of chaos, then suddenly builds a highway, a 104-step cycle that carries it diagonally for ever. Longer rules grow symmetric blooms, fill squares or build triangles. The grid is a torus: highways wrap, crash into old debris and start new chaos, so it never settles. Fresh flips glow along the ant's path; up to twelve ants share the grid and the beat rushes them.",
  energy: {
    speed: { mul: [0.5, 1.6] },
    trail: [-0.1, 0.25],
    rush: [-0.2, 0.3],
  },
  beat: { punch: 0.6, pulse: 0.8 },
  audio: [
    { param: "speed", feature: "low", amount: 0.06 },
    { param: "rush", feature: "onset", amount: 0.15 },
    { param: "trail", feature: "high", amount: 0.08 },
  ],
  stage: ["speed", "rush", "trail"],
  type: { key: "rule", values: RULES.map((_, i) => i) },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [GW, GH + 1], steps: PASSES },
};
