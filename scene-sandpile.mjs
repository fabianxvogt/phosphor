// Abelian Sandpile (#67): the Bak–Tang–Wiesenfeld model. A cell holding four
// or more grains topples, giving one grain to each of its four neighbours;
// grains that fall off the board are lost. The final stable picture does not
// depend on the toppling order (the "abelian" property), so the GPU topples
// every unstable cell at once, many times per frame, and multi-topples tall
// cells (floor(h/4) grains to each neighbour).
//
// Signature details, in front: the four-colour fractal mandala of a growing
// pile (one colour per grain count 0–3), avalanches of every size flashing
// across a critical board (self-organised criticality), and the identity
// element of the sandpile group forming out of a board full of sixes.
//
// Variants (drop): 0 centre pile, 1 critical rain, 2 wandering sources,
// 3 identity element. All are endless: piles grow until they fill the
// board, blow away and regrow in the next source layout; rain stays
// critical forever; identities form, hold, blow away and form again in the
// next board shape.

const GW = 384; // largest board, 16:9
const GH = 216;
export const BOARDS = [
  [128, 72],
  [192, 108],
  [256, 144],
  [384, 216],
];
export const LAYOUTS = 5; // 1, 2, 3, 4 or 6 sources
export const SHAPES = 4; // identity boards: full, square, 4:3, 2:1
export const PASSES = 8; // toppling passes per 60 Hz tick
const DISSOLVE_PASSES = 1800; // ≈ 3.75 s at 480 passes/s
const HOLD_PASSES = 4800; // ≈ 10 s

// ---------------------------------------------------------------- CPU --
// Reference model for tests: synchronous multi-topple with sink boundary.
// `mask(x, y)` says whether a cell belongs to the board (others are sinks).
export function toppleStep(h, w, hgt, mask = () => true) {
  const next = new Int32Array(h.length);
  let unstable = false;
  for (let y = 0; y < hgt; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask(x, y)) continue;
      const fire = (v) => v >> 2;
      let v = h[i] & 3;
      if (h[i] >= 4) unstable = true;
      if (x > 0 && mask(x - 1, y)) v += fire(h[i - 1]);
      if (x < w - 1 && mask(x + 1, y)) v += fire(h[i + 1]);
      if (y > 0 && mask(x, y - 1)) v += fire(h[i - w]);
      if (y < hgt - 1 && mask(x, y + 1)) v += fire(h[i + w]);
      next[i] = v;
    }
  return { next, unstable };
}

export function stabilize(h, w, hgt, mask, limit = 1e7) {
  let grid = Int32Array.from(h);
  for (let n = 0; n < limit; n++) {
    const { next, unstable } = toppleStep(grid, w, hgt, mask);
    if (!unstable) return grid;
    grid = next;
  }
  throw new Error("did not stabilise");
}

// Sequential single topples (one cell at a time, scanning): the classical
// definition, for the abelian check against the parallel GPU rule.
export function stabilizeSequential(h, w, hgt) {
  const grid = Int32Array.from(h);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < grid.length; i++)
      while (grid[i] >= 4) {
        changed = true;
        grid[i] -= 4;
        const x = i % w,
          y = (i / w) | 0;
        if (x > 0) grid[i - 1]++;
        if (x < w - 1) grid[i + 1]++;
        if (y > 0) grid[i - w]++;
        if (y < hgt - 1) grid[i + w]++;
      }
  }
  return grid;
}

// The identity of the sandpile group: (2m − (2m)°)° with m the maximal
// stable configuration (all threes).
export function identity(w, hgt, mask = () => true) {
  const six = new Int32Array(w * hgt).map((_, i) =>
    mask(i % w, (i / w) | 0) ? 6 : 0,
  );
  const s = stabilize(six, w, hgt, mask);
  const diff = six.map((v, i) => v - s[i]);
  return stabilize(diff, w, hgt, mask);
}

// Source positions (in cells) for a layout at a time `turn` (fraction).
export function sources(layout, bw, bh, turn = 0) {
  const n = [1, 2, 3, 4, 6][layout % LAYOUTS];
  const cx = bw / 2,
    cy = bh / 2;
  if (n === 1) return [[Math.floor(cx), Math.floor(cy)]];
  const r = 0.27 * bh;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n + turn) * 2 * Math.PI + (n === 2 ? 0 : -Math.PI / 2);
    return [Math.floor(cx + r * Math.cos(a)), Math.floor(cy + r * Math.sin(a))];
  });
}

// ---------------------------------------------------------------- GPU --
const common = `
const int GW = ${GW};
const int GH = ${GH};
ivec2 sBoard(int board) {
  return board == 0 ? ivec2(128, 72) : board == 1 ? ivec2(192, 108)
    : board == 2 ? ivec2(256, 144) : ivec2(384, 216);
}
int sByte(float v) { return int(v * 255.0 + 0.5); }
int sHeight(ivec2 cell) {
  vec4 t = texelFetch(u_state, cell + ivec2(0, 2), 0);
  return sByte(t.r) + 256 * sByte(t.g);
}
int sGlow(ivec2 cell) { return sByte(texelFetch(u_state, cell + ivec2(0, 2), 0).b); }
int sU16(ivec2 texel) {
  vec4 t = texelFetch(u_state, texel, 0);
  return sByte(t.r) + 256 * sByte(t.g);
}
vec4 sMeta(int x) { return texelFetch(u_state, ivec2(x, 0), 0); }
// Identity boards: full 16:9, square, 4:3 and 2:1, centred; others sink.
bool sInShape(ivec2 c, ivec2 b, int drop, int shape) {
  if (any(lessThan(c, ivec2(0))) || any(greaterThanEqual(c, b))) return false;
  if (drop != 3 || shape == 0) return true;
  ivec2 size = shape == 1 ? ivec2(b.y, b.y)
    : shape == 2 ? ivec2(b.y * 4 / 3, b.y) : ivec2(b.x, b.x / 2);
  size = min(size, b);
  ivec2 lo = (b - size) / 2;
  return all(greaterThanEqual(c, lo)) && all(lessThan(c, lo + size));
}
`;

const simulation = `${common}
vec4 sPack16(int v) {
  v = clamp(v, 0, 65535);
  return vec4(float(v & 255), float(v >> 8), 0.0, 0.0) / 255.0;
}
float sRand(uint a, uint b) {
  return float(seedHash(u_seedBits ^ seedHash(a * 7919u + b)) >> 8) / 16777216.0;
}
// Source i of n at a turn (fraction of a revolution), in cells.
ivec2 sSource(int i, int n, ivec2 b, float turn) {
  vec2 c = vec2(b) * 0.5;
  if (n == 1) return ivec2(floor(c));
  float a = (float(i) / float(n) + turn) * TAU + (n == 2 ? 0.0 : -PI * 0.5);
  return ivec2(floor(c + 0.27 * float(b.y) * vec2(cos(a), sin(a))));
}
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  int drop = int(floor(u_params[0] + 0.5));
  int board = int(floor(u_params[1] + 0.5));
  float rate = clamp(u_params[2], 0.0, 1.0);
  int layoutBase = int(floor(u_params[3] + 0.5));
  float kick = clamp(u_params[4], 0.0, 1.0);
  ivec2 b = sBoard(board);

  // Metadata (row 0): M0 rg phase timer, b phase, a cycle; M1 grains added
  // (rg low, ba high); M2 r stable, g last beat, a configuration.
  vec4 m0 = sMeta(0), m1 = sMeta(1), m2 = sMeta(2);
  int config = drop * 8 + board;
  bool reset = u_reset || sByte(m2.a) != config + 1;
  int timer = reset ? 0 : sU16(ivec2(0, 0));
  int phase = reset ? 0 : sByte(m0.b);
  int cycle = reset ? 0 : sByte(m0.a);
  float grains = reset ? 0.0 : float(sU16(ivec2(1, 0))) + 65536.0 * (float(sByte(m1.b)) + 256.0 * float(sByte(m1.a)));
  bool stable = sByte(m2.r) == 1;
  int lastBeat = sByte(m2.g);
  int beat = int(floor(max(u_beat, 0.0))) & 255;
  bool kicked = !reset && beat != lastBeat && kick > 0.0;

  int lay = (layoutBase + cycle) % ${LAYOUTS};
  int n = lay == 4 ? 6 : lay + 1;
  int shape = (layoutBase + cycle) % ${SHAPES};
  float turn = drop == 2 ? fract(u_time * 0.011 + float(cycle) * 0.37) : 0.0;
  // Grains per pass: 150 → 2500 grains per second over 480 passes.
  float perPass = mix(150.0, 2500.0, rate * rate) / 480.0;
  float full = 2.1 * PI * pow(0.46 * float(b.y), 2.0) * (n > 1 ? 1.7 : 1.0);

  // Phase machine (identical in every fragment; the metadata texels store
  // the next state). 0 grow / rain / fill, 1 stabilise sixes, 2 subtract,
  // 3 stabilise to the identity, 4 hold, 5 blow away.
  int nextPhase = phase, nextTimer = timer + 1, nextCycle = cycle;
  float nextGrains = grains;
  if (drop == 3) {
    if (phase == 0) { nextPhase = 1; nextTimer = 0; }
    else if ((phase == 1 || phase == 3) && timer > 6 && stable) { nextPhase = phase + 1; nextTimer = 0; }
    else if (phase == 2) { nextPhase = 3; nextTimer = 0; }
    else if (phase == 4 && timer > ${HOLD_PASSES}) { nextPhase = 5; nextTimer = 0; }
  } else if (drop != 1) {
    if (phase == 0) {
      nextGrains = grains + perPass;
      if (nextGrains > full) { nextPhase = 5; nextTimer = 0; }
    }
  }
  if (phase == 5 && timer > ${DISSOLVE_PASSES}) {
    nextPhase = 0; nextTimer = 0; nextCycle = (cycle + 1) & 255; nextGrains = 0.0;
  }

  if (px.y == 0) {
    if (px.x == 0)
      outColor = vec4(sPack16(min(nextTimer, 65535)).rg, float(nextPhase) / 255.0, float(nextCycle) / 255.0);
    else if (px.x == 1) {
      int g = int(nextGrains);
      outColor = vec4(float(g & 255), float((g >> 8) & 255), float((g >> 16) & 255), float((g >> 24) & 255)) / 255.0;
    } else if (px.x == 2) {
      // Stable when no column flagged an unstable cell last pass.
      bool seen = false;
      for (int x = 0; x < GW; x++) {
        if (x >= b.x) break;
        if (texelFetch(u_state, ivec2(x, 1), 0).r > 0.5) { seen = true; break; }
      }
      outColor = vec4(seen ? 0.0 : 1.0 / 255.0, float(beat) / 255.0, 0.0, float(config + 1) / 255.0);
    } else outColor = vec4(0.0);
    return;
  }
  if (px.y == 1) {
    // Per-column unstable flag of the current grid (two-pass reduction).
    float flag = 0.0;
    if (px.x < b.x)
      for (int y = 0; y < GH; y++) {
        if (y >= b.y) break;
        if (sHeight(ivec2(px.x, y)) >= 4) { flag = 1.0; break; }
      }
    outColor = vec4(flag, 0.0, 0.0, 0.0);
    return;
  }

  ivec2 c = px - ivec2(0, 2);
  if (!sInShape(c, b, drop, shape)) { outColor = vec4(0.0); return; }
  uint tick = u_tick;
  int h, glow;
  if (reset) {
    // Rain starts from a random stable board; the others from nothing.
    // Rain starts below criticality (mean ≈ 1.8 grains): avalanches grow
    // from single cells to board-spanning ones within seconds, then stay
    // critical.
    float r0 = sRand(uint(c.x) * 977u + uint(c.y), 11u);
    h = drop == 1 ? (r0 < 0.1 ? 0 : r0 < 0.35 ? 1 : r0 < 0.75 ? 2 : 3) : 0;
    glow = 0;
  } else {
    int self = sHeight(c);
    glow = max(sGlow(c) - 1, 0);
    if (self >= 4) glow = 255;
    // Synchronous multi-topple: keep h mod 4, receive floor(h/4) from each
    // neighbour on the board; grains leaving the board are lost.
    h = self & 3;
    ivec2 offsets[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
    for (int k = 0; k < 4; k++) {
      ivec2 q = c + offsets[k];
      if (sInShape(q, b, drop, shape)) h += sHeight(q) >> 2;
    }
    if (drop == 3) {
      if (phase == 0) h = 6;
      else if (phase == 2) h = 6 - self;
    }
    if (phase == 5 && h > 0 && sRand(tick, uint(c.x) * 4099u + uint(c.y)) < 0.0025) h -= 1;
    // Grain drops: sources while growing, random cells for rain.
    if (phase == 0 && drop != 3) {
      if (drop == 1) {
        int count = int(perPass) + (sRand(tick, 3u) < fract(perPass) ? 1 : 0);
        for (int k = 0; k < 8; k++) {
          if (k >= count) break;
          ivec2 t = ivec2(floor(vec2(sRand(tick, 100u + uint(k)), sRand(tick, 200u + uint(k))) * vec2(b)));
          if (t == c) h += 1;
        }
      } else {
        for (int i = 0; i < 6; i++) {
          if (i >= n) break;
          if (sSource(i, n, b, turn) != c) continue;
          float share = perPass / float(n);
          h += int(share) + (sRand(tick, 300u + uint(i)) < fract(share) ? 1 : 0);
        }
      }
    }
    // A kick drops a heap: on a random cell (rain) or a random source.
    if (kicked && phase != 5 && drop != 3) {
      int size = int(kick * mix(24.0, 640.0, u_level));
      ivec2 t = drop == 1
        ? ivec2(floor(vec2(sRand(tick, 400u), sRand(tick, 401u)) * vec2(b)))
        : sSource(int(sRand(tick, 402u) * float(n)) % n, n, b, turn);
      if (t == c) h += size;
    }
  }
  vec4 o = sPack16(h);
  o.b = float(glow) / 255.0;
  outColor = o;
}
`;

const fragment = `${common}
void main() {
  int drop = int(floor(u_params[0] + 0.5));
  int board = int(floor(u_params[1] + 0.5));
  int layoutBase = int(floor(u_params[3] + 0.5));
  float glowAmount = clamp(u_params[5], 0.0, 1.0);
  float gap = clamp(u_params[6], 0.0, 1.0);
  float hue = u_params[7];
  ivec2 b = sBoard(board);
  int phase = sByte(sMeta(0).b);
  int shape = (layoutBase + sByte(sMeta(0).a)) % ${SHAPES};
  vec2 g = v_uv * vec2(b);
  ivec2 c = ivec2(floor(g));
  vec3 ground = u_secondary * 0.04 + vec3(0.004, 0.005, 0.01);
  if (!sInShape(c, b, drop, shape)) {
    outColor = vec4(ground * 0.6, 1.0);
    return;
  }
  int h = sHeight(c);
  float glow = float(sGlow(c)) / 255.0;
  // One colour per grain count: the classic four-colour sandpile.
  float drift = hue + u_time * 0.004;
  vec3 colour = h == 0 ? ground
    : h == 1 ? palette(fract(drift + 0.18)) * 0.42
    : h == 2 ? palette(fract(drift + 0.5)) * 0.72
    : h == 3 ? palette(fract(drift + 0.86))
    : mix(u_accent, vec3(1.0), 0.55) * 1.15; // toppling right now
  // Avalanches: recently toppled cells and their neighbours glow.
  float near = glow;
  near = max(near, 0.6 * float(sGlow(c + ivec2(1, 0))) / 255.0);
  near = max(near, 0.6 * float(sGlow(c - ivec2(1, 0))) / 255.0);
  near = max(near, 0.6 * float(sGlow(c + ivec2(0, 1))) / 255.0);
  near = max(near, 0.6 * float(sGlow(c - ivec2(0, 1))) / 255.0);
  float flash = glowAmount * near * near * (0.6 + 0.6 * u_level);
  // On a critical board the grains are a quiet carpet and the avalanches
  // (self-organised criticality: every size, from one cell to the board)
  // are the picture.
  if (drop == 1) {
    colour *= 0.32;
    flash = glowAmount * near * (0.7 + 0.5 * u_level);
  }
  colour += mix(u_accent, u_primary, 0.3) * flash * 0.7;
  // Crisp cells: a gutter once a cell is big enough to show one.
  float cellPx = u_resolution.y / float(b.y);
  vec2 f = fract(g);
  float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * cellPx;
  float gutter = smoothstep(0.0, 1.0, edge / max(0.6, gap * 0.12 * cellPx));
  colour *= mix(1.0, gutter, smoothstep(3.0, 6.0, cellPx) * gap);
  if (phase == 4) colour *= 1.0 + 0.08 * sin(u_time * 1.3); // the identity breathes
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "drop",
    label: "Drop · centre pile / critical rain / wandering sources / identity",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "board",
    label: "Board · 128 / 192 / 256 / 384 cells across",
    min: 0,
    max: 3,
    step: 1,
    default: 2,
  },
  {
    key: "rate",
    label: "Grain rate",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "layout",
    label: "First layout · 1 / 2 / 3 / 4 / 6 sources (identity: board shape)",
    min: 0,
    max: 4,
    step: 1,
    default: 0,
  },
  {
    key: "kick",
    label: "Kick heap",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
  {
    key: "glow",
    label: "Avalanche glow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "gap",
    label: "Cell gutter",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
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

const look = (name, seed, drop, board, rate, layout, kick, glow, gap, hue) => ({
  name,
  seed,
  params: { drop, board, rate, layout, kick, glow, gap, hue },
});

const presets = [
  look("Mandala Bloom", 6701, 0, 2, 0.45, 0, 0.25, 0.55, 0.5, 0),
  look("Grain by Grain", 6702, 0, 0, 0.2, 0, 0.1, 0.4, 0.9, 0.3),
  look("Four Crowns", 6703, 0, 3, 0.7, 3, 0.35, 0.6, 0.3, 0.55),
  look("Critical Rain", 6704, 1, 2, 0.35, 0, 0.2, 0.85, 0.5, 0.1),
  look("Avalanche Field", 6705, 1, 3, 0.6, 0, 0.75, 1, 0.25, 0.7),
  look("Kick Sand", 6706, 1, 1, 0.25, 0, 1, 0.9, 0.7, 0.4),
  look("Twin Fountains", 6707, 2, 2, 0.55, 1, 0.3, 0.6, 0.5, 0.85),
  look("Hexagram Drift", 6708, 2, 3, 0.8, 4, 0.4, 0.7, 0.3, 0.2),
  look("Identity", 6709, 3, 1, 0.5, 0, 0, 0.7, 0.6, 0),
  look("Identity Shapes", 6710, 3, 2, 0.5, 1, 0, 0.8, 0.4, 0.6),
];

export default {
  id: "sandpile",
  number: 67,
  name: "Abelian Sandpile",
  description:
    "The Bak–Tang–Wiesenfeld sandpile: four grains topple to the four neighbours, grains falling off the edge are lost, and the stable result does not depend on the order. Four colours show 0–3 grains: growing piles draw the fractal mandala, rain keeps a board critical with avalanches of every size, wandering sources interfere, and the identity of the sandpile group forms out of a board of sixes. Kicks drop heaps; everything blows away and regrows in the next layout.",
  // Simulation grid authored for a 16:9 frame; other screens cover-crop it (D7).
  aspect: 16 / 9,
  energy: { rate: [0.1, 0.85], kick: [0, 0.5], glow: [-0.15, 0.25] },
  beat: { punch: 0.6, pulse: 0.9 },
  audio: [
    { param: "rate", feature: "low", amount: 0.12 },
    { param: "glow", feature: "high", amount: 0.1 },
    { param: "kick", feature: "onset", amount: 0.15 },
  ],
  stage: ["rate", "kick", "glow"],
  type: { key: "drop", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [GW, GH + 2], steps: PASSES },
};
