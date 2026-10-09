// Game of Life family: exact 2D cellular automata on a torus.
// CPU reference first (tests and pattern data), then the GPU shaders.
//
// State texture (RGBA8, nearest): 320 × 182.
//   row 0      metadata texels (generation clock, counters, event ring)
//   row 1      per-column activity counts (an exact reduction, every pass)
//   rows 2…    the board, w × h cells from BOARDS; texels beyond it stay 0
// Board texel: r = state | previous state << 4, g = age (generations alive,
// or age at death), b = generations since death (ghost), a = 128 when the
// cell differs from two generations ago (the period-2 activity flag).

export const TEXTURE = [320, 182];
export const META_ROWS = 2;
// One pass per 60 Hz tick: the rate tops out at 60 generations per second,
// so a generation never needs more than one pass.
export const STEPS = 1;
// Generations run one per pass after a reset (within the 120-tick warm-up).
export const PREROLL = 110;
const VERSION = 5;

// Board sizes (cells) per `board` selector; all exactly 16:9.
export const BOARDS = [
  [96, 54],
  [160, 90],
  [240, 135],
  [320, 180],
];

// Outer-totalistic masks: bit n set = birth/survival with n live neighbours.
const mask = (...counts) => counts.reduce((m, n) => m | (1 << n), 0);
export const LIFE_LIKE = [
  { name: "Conway B3/S23", birth: mask(3), survive: mask(2, 3) },
  { name: "HighLife B36/S23", birth: mask(3, 6), survive: mask(2, 3) },
  {
    name: "Day & Night B3678/S34678",
    birth: mask(3, 6, 7, 8),
    survive: mask(3, 4, 6, 7, 8),
  },
];

// Griffeath cyclic CA flavours (rule 4), chosen by `comp`: range, threshold,
// states, Moore (true) or von Neumann (false). All four keep turning from
// random soup on a 160×90 torus for thousands of generations (R1/T3/C4,
// "perfect spirals", freezes there and is not used).
export const CYCLIC = [
  { name: "313", range: 1, threshold: 3, states: 3, moore: true },
  { name: "R1/T2/C5", range: 1, threshold: 2, states: 5, moore: true },
  { name: "Griffeath CCA", range: 1, threshold: 1, states: 14, moore: false },
  { name: "Cyclic spirals", range: 3, threshold: 5, states: 8, moore: true },
];

// Bosco's rule (Larger than Life): R5 Moore, centre excluded, B34–45, S33–57.
export const BOSCO = {
  range: 5,
  birthMin: 34,
  birthMax: 45,
  surviveMin: 33,
  surviveMax: 57,
};

export function lifeStep(cells, w, h, birth, survive) {
  const next = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (dx || dy)
            n += cells[((y + dy + h) % h) * w + ((x + dx + w) % w)] & 1;
      const alive = cells[y * w + x] & 1;
      next[y * w + x] = ((alive ? survive : birth) >> n) & 1;
    }
  return next;
}

// Brian's Brain: 0 off, 1 firing, 2 refractory. Off fires with exactly two
// firing Moore neighbours; firing always becomes refractory, refractory off.
export function brainStep(cells, w, h) {
  const next = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = cells[y * w + x];
      if (s === 1) next[y * w + x] = 2;
      else if (s === 2) next[y * w + x] = 0;
      else {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (
              (dx || dy) &&
              cells[((y + dy + h) % h) * w + ((x + dx + w) % w)] === 1
            )
              n++;
        next[y * w + x] = n === 2 ? 1 : 0;
      }
    }
  return next;
}

// Griffeath's cyclic CA: a cell in state k advances to k+1 (mod N) when at
// least `threshold` cells of its neighbourhood are already in state k+1.
export function cyclicStep(cells, w, h, { range, threshold, states, moore }) {
  const next = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = cells[y * w + x];
      const succ = (s + 1) % states;
      let n = 0;
      for (let dy = -range; dy <= range; dy++)
        for (let dx = -range; dx <= range; dx++) {
          if (!dx && !dy) continue;
          if (!moore && Math.abs(dx) + Math.abs(dy) > range) continue;
          if (cells[((y + dy + h) % h) * w + ((x + dx + w) % w)] === succ) n++;
        }
      next[y * w + x] = n >= threshold ? succ : s;
    }
  return next;
}

// Larger than Life with a (2r+1)² Moore box, centre excluded from the count.
export function ltlStep(cells, w, h, rule = BOSCO) {
  const { range, birthMin, birthMax, surviveMin, surviveMax } = rule;
  const next = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = -range; dy <= range; dy++)
        for (let dx = -range; dx <= range; dx++)
          if (dx || dy)
            n += cells[((y + dy + h) % h) * w + ((x + dx + w) % w)] & 1;
      const alive = cells[y * w + x] & 1;
      next[y * w + x] = alive
        ? +(n >= surviveMin && n <= surviveMax)
        : +(n >= birthMin && n <= birthMax);
    }
  return next;
}

// One generation of variant `rule` (0..5); `comp` picks the cyclic flavour.
export function stepRule(rule, comp, cells, w, h) {
  if (rule <= 2)
    return lifeStep(
      cells,
      w,
      h,
      LIFE_LIKE[rule].birth,
      LIFE_LIKE[rule].survive,
    );
  if (rule === 3) return brainStep(cells, w, h);
  if (rule === 4) return cyclicStep(cells, w, h, CYCLIC[comp & 3]);
  return ltlStep(cells, w, h, BOSCO);
}

// Pattern library (rows top to bottom, O = live). Encoded as data for the
// GPU stamp; tests decode the shader's words and compare them with these.
export const PATTERNS = {
  glider: [".O.", "..O", "OOO"],
  lwss: [".O..O", "O....", "O...O", "OOOO."],
  mwss: ["...O..", ".O...O", "O.....", "O....O", "OOOOO."],
  hwss: ["...OO..", ".O....O", "O......", "O.....O", "OOOOOO."],
  gosper: [
    "........................O...........",
    "......................O.O...........",
    "............OO......OO............OO",
    "...........O...O....OO............OO",
    "OO........O.....O...OO..............",
    "OO........O...O.OO....O.O...........",
    "..........O.....O.......O...........",
    "...........O...O....................",
    "............OO......................",
  ],
  rpentomino: [".OO", "OO.", ".O."],
  acorn: [".O.....", "...O...", "OO..OOO"],
  diehard: ["......O.", "OO......", ".O...OOO"],
  bheptomino: ["O.OO", "OOO.", ".O.."],
  pulsar: [
    "..OOO...OOO..",
    ".............",
    "O....O.O....O",
    "O....O.O....O",
    "O....O.O....O",
    "..OOO...OOO..",
    ".............",
    "..OOO...OOO..",
    "O....O.O....O",
    "O....O.O....O",
    "O....O.O....O",
    ".............",
    "..OOO...OOO..",
  ],
  pentadecathlon: ["..O....O..", "OO.OOOO.OO", "..O....O.."],
  copperhead: [
    ".OO..OO.",
    "...OO...",
    "...OO...",
    "O.O..O.O",
    "O......O",
    "........",
    "O......O",
    ".OO..OO.",
    "..OOOO..",
    "........",
    "...OO...",
    "...OO...",
  ],
  eater: ["OO..", "O.O.", "..O.", "..OO"],
  replicator: ["..OOO", ".O..O", "O...O", "O..O.", "OOO.."],
  domino: ["OO"],
  // Bosco's-rule bug: period 6, moves (0, −5) per period (found from soup).
  bug: [
    "..OOOOOO..",
    "..OOOOOO..",
    ".OOOOOOOO.",
    ".OOOOOOOO.",
    "OOOOOOOOOO",
    "OOO....OOO",
    "OOO....OOO",
    ".OO....OO.",
    ".OO....OO.",
    "..OOOOOO..",
    "....OO....",
  ],
};

// GPU pattern ids, in table order; dir = travel per period in pattern coords.
export const PATTERN_ORDER = [
  ["glider", [1, 1]],
  ["lwss", [-1, 0]],
  ["mwss", [-1, 0]],
  ["hwss", [-1, 0]],
  ["gosper", [1, 1]], // the direction of its glider stream
  ["rpentomino", [0, 0]],
  ["acorn", [0, 0]],
  ["diehard", [0, 0]],
  ["bheptomino", [0, 0]],
  ["pulsar", [0, 0]],
  ["pentadecathlon", [0, 0]],
  ["copperhead", [0, -1]],
  ["eater", [0, 0]],
  ["replicator", [0, 0]],
  ["domino", [0, 0]],
  ["bug", [0, -1]],
];
// A Gosper gun whose stream ends in an eater 1: period 30, no debris. The
// GPU stamps it as the gun plus an eater companion inside a 56×42 box.
export const GUN_EATER = { at: [52, 38], size: [56, 42] };

export function parsePattern(rows) {
  const h = rows.length,
    w = Math.max(...rows.map((r) => r.length));
  const bits = new Uint8Array(w * h);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++)
      bits[y * w + x] = row[x] === "O" ? 1 : 0;
  });
  return { w, h, bits };
}

// Overlays patterns into one rectangle of rows: [[rows, x, y], …].
export function composeRows(width, height, parts) {
  const grid = Array.from({ length: height }, () => Array(width).fill("."));
  for (const [rows, x, y] of parts)
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++)
        if (row[dx] === "O") grid[y + dy][x + dx] = "O";
    });
  return grid.map((row) => row.join(""));
}
export const gunEaterRows = () =>
  composeRows(GUN_EATER.size[0], GUN_EATER.size[1], [
    [PATTERNS.gosper, 0, 0],
    [PATTERNS.eater, ...GUN_EATER.at],
  ]);

// All patterns as one dense row-major bitstream: pattern i occupies bits
// [offset, offset + w·h). Direction code = (dx + 1) + 3 (dy + 1).
export function packPatterns() {
  const words = [],
    info = [];
  let bit = 0;
  for (const [name, [dx, dy]] of PATTERN_ORDER) {
    const { w, h, bits } = parsePattern(PATTERNS[name]);
    info.push({ name, w, h, offset: bit, dir: dx + 1 + 3 * (dy + 1) });
    for (let i = 0; i < w * h; i++, bit++) {
      words[bit >> 5] ??= 0;
      if (bits[i]) words[bit >> 5] = (words[bit >> 5] | (1 << (bit & 31))) >>> 0;
    }
  }
  return { words, info };
}

// Software GL (SwiftShader) materialises dynamically indexed const arrays on
// every access, so the tables are select chains instead.
function patternTable() {
  const { words, info } = packPatterns();
  const ids = PATTERN_ORDER.map(
    ([name], i) => `const int P_${name.toUpperCase()} = ${i};`,
  ).join("\n");
  const eater = info.find((p) => p.name === "eater");
  return `${ids}
const int P_GUNEATER = ${PATTERN_ORDER.length};
const ivec4 EATER_INFO = ivec4(${eater.w},${eater.h},${eater.offset},${eater.dir});
// (w, h, bit offset, direction code)
ivec4 patInfo(int id) {
  ivec4 r = ivec4(0);
${info.map((p, i) => `  if (id == ${i}) r = ivec4(${p.w},${p.h},${p.offset},${p.dir});`).join("\n")}
  return r;
}
uint patWord(int k) {
  uint w = 0u;
${words.map((w, i) => `  if (k == ${i}) w = ${w}u;`).join("\n")}
  return w;
}
`;
}

// D4 orientation o: bit0 mirrors x, bit1 mirrors y, bit2 transposes.
// Maps a world offset inside the oriented box back to pattern coordinates.
export function orientedSize(w, h, o) {
  return o & 4 ? [h, w] : [w, h];
}
export function patternCoord(dx, dy, w, h, o) {
  let a = dx,
    b = dy;
  if (o & 4) [a, b] = [b, a];
  return [o & 1 ? w - 1 - a : a, o & 2 ? h - 1 - b : b];
}
export function orientedDirection([x, y], o) {
  const a = o & 1 ? -x : x,
    b = o & 2 ? -y : y;
  return o & 4 ? [b, a] : [a, b];
}

// Writes `pattern` (from parsePattern) with its oriented box's corner at
// (x, y) on a w×h torus; cells in the box are overwritten (dead where 0).
export function stamp(cells, w, h, pattern, x, y, o = 0, value = 1) {
  const [ow, oh] = orientedSize(pattern.w, pattern.h, o);
  for (let dy = 0; dy < oh; dy++)
    for (let dx = 0; dx < ow; dx++) {
      const [u, v] = patternCoord(dx, dy, pattern.w, pattern.h, o);
      cells[((y + dy) % h) * w + ((x + dx) % w)] = pattern.bits[
        v * pattern.w + u
      ]
        ? value
        : 0;
    }
  return cells;
}

const common = `
const int META = ${META_ROWS};
const int TEXW = ${TEXTURE[0]};
const int VERSION = ${VERSION};
const float PASSES = ${60 * STEPS}.;
ivec2 boardSize(int b) {
  return ${BOARDS.slice(0, -1)
    .map(([w, h], i) => `b == ${i} ? ivec2(${w},${h}) : `)
    .join("")}ivec2(${BOARDS.at(-1).join(",")});
}
// (range, threshold, states, Moore)
ivec4 cyclicRule(int c) {
  return ${CYCLIC.slice(0, -1)
    .map(
      (r, i) =>
        `c == ${i} ? ivec4(${r.range},${r.threshold},${r.states},${+r.moore}) : `,
    )
    .join("")}ivec4(${[
    CYCLIC.at(-1).range,
    CYCLIC.at(-1).threshold,
    CYCLIC.at(-1).states,
    +CYCLIC.at(-1).moore,
  ].join(",")});
}
int iparam(int i, int lo, int hi) { return clamp(int(floor(u_params[i] + .5)), lo, hi); }
ivec4 bytesAt(ivec2 p) { return ivec4(texelFetch(u_state, p, 0) * 255. + .5); }
int lo16(ivec4 b) { return b.x + 256 * b.y; }
int hi16(ivec4 b) { return b.z + 256 * b.w; }
// GLSL leaves % of negative operands undefined: lift by 16 boards first.
ivec2 wrapB(ivec2 v, ivec2 B) { return (v + B * 16) % B; }
`;

const simulationFragment = `${common}
${patternTable()}
vec4 bytes(ivec4 b) { return vec4(clamp(b, 0, 255)) / 255.; }
vec4 pack2(int a, int b) {
  return bytes(ivec4(a & 255, (a >> 8) & 255, b & 255, (b >> 8) & 255));
}
int stateAt(ivec2 c, ivec2 B) {
  return int(texelFetch(u_state, wrapB(c, B) + ivec2(0, META), 0).r * 255. + .5) & 15;
}
ivec2 orientSize(ivec2 s, int o) { return (o & 4) != 0 ? s.yx : s; }
ivec2 patCoord(ivec2 d, ivec2 s, int o) {
  ivec2 ab = (o & 4) != 0 ? d.yx : d;
  return ivec2((o & 1) != 0 ? s.x - 1 - ab.x : ab.x, (o & 2) != 0 ? s.y - 1 - ab.y : ab.y);
}

// Event salts: every fragment derives the same event from the same inputs.
uint evSalt(uint a, uint b) { return seedHash(u_seedBits ^ seedHash(a * 2654435769u + b)); }
uint evHash(uint salt, uint k) { return seedHash(salt ^ seedHash(k + 1663821227u)); }
float cellRand(ivec2 c, uint salt) { return float(seedHash(salt ^ seedHash(uint(c.x) + 4096u * uint(c.y))) >> 8) / 16777216.; }

// kind: 0 none, 1 pattern (copies along stepv), 2 random patch,
// 3 cyclic winding core (a phase singularity), 4 inversion disc.
// Software GL pays for code size, not for the branch taken (it runs every
// branch masked), so all events go through one builder and one stamp.
// pa/pb: (w, h, bit offset, dir) of the pattern and of an optional companion
// at pbAt inside the size box (the gun's eater).
struct Ev { int kind; ivec4 pa; ivec4 pb; ivec2 pbAt; ivec2 size; ivec2 o; int orient; int copies; ivec2 stepv; int radius; float density; uint salt; };

// A fleet: copies side by side, perpendicular to travel, either centred on
// 'at' or entering from the board edge behind them (the torus seam).
Ev makeEvent(int kind, int pat, int copies, bool edge, bool aim, ivec2 at, int radius, float density, uint salt, uint bits, ivec2 B) {
  bool gunEater = pat == P_GUNEATER;
  ivec4 pa = patInfo(gunEater ? P_GOSPER : pat);
  ivec4 pb = gunEater ? EATER_INFO : ivec4(0);
  ivec2 size = gunEater ? ivec2(${GUN_EATER.size.join(",")}) : pa.xy;
  // The 56×42 gun-and-eater box only fits the 54-row close-up board upright.
  int o = int(bits & (gunEater ? 3u : 7u));
  ivec2 v = ivec2(pa.w % 3 - 1, pa.w / 3 - 1);
  // Aimed diagonal movers (guns' streams, gliders) head for the board centre.
  ivec2 toward = ivec2(lessThan(B / 2 - at, ivec2(0)));
  if (aim && v == ivec2(1)) o = (o & 4) | ((o & 4) != 0 ? toward.y + 2 * toward.x : toward.x + 2 * toward.y);
  ivec2 sz = orientSize(size, o);
  ivec2 ab = ivec2((o & 1) != 0 ? -v.x : v.x, (o & 2) != 0 ? -v.y : v.y);
  ivec2 dir = (o & 4) != 0 ? ab.yx : ab;
  ivec2 perp = dir == ivec2(0) ? ivec2(1, 0) : ivec2(-dir.y, dir.x);
  int span = perp.x != 0 && perp.y != 0 ? (max(sz.x, sz.y) + 5) / 2 + 1
    : (perp.x != 0 ? sz.x : sz.y) + 4;
  ivec2 stepv = perp * span;
  ivec2 origin = at - sz / 2 - stepv * (copies - 1) / 2;
  if (edge && dir != ivec2(0)) {
    if (dir.x != 0 && (dir.y == 0 || (bits & 8u) != 0u))
      origin.x = dir.x > 0 ? 1 : B.x - sz.x - 1;
    else origin.y = dir.y > 0 ? 1 : B.y - sz.y - 1;
  }
  if (kind != 1) { origin = at; copies = 1; stepv = ivec2(0); }
  return Ev(kind, pa, pb, ivec2(${GUN_EATER.at.join(",")}), size, origin, o, copies, stepv, radius, density, salt);
}

ivec2 slotCenter(int i, int K, ivec2 B, uint bits) {
  int gx = K <= 1 ? 1 : K <= 4 ? 2 : K <= 6 ? 3 : 4;
  int gy = (K + gx - 1) / gx;
  vec2 size = vec2(B) / vec2(gx, gy);
  vec2 jitter = (vec2(bits & 255u, (bits >> 8) & 255u) / 255. - .5) * .35;
  return ivec2((vec2(i % gx, i / gx) + .5 + jitter) * size);
}

// Placed material per source: 0 = reset slot i of K, 1 = injection (rain or
// stale rescue), 2 = kick gesture. Recognisable patterns wherever the rule
// has them; random patches only where the rule's own objects come from soup.
Ev chooseEvent(int source, int i, int K, int rule, int comp, int board, ivec2 B, uint salt, bool rescue, float fill) {
  // Three hashes, sliced: a = choices, b = position, c = variate.
  uint a = evHash(salt, 1u), b = evHash(salt, 2u);
  float r = float(evHash(salt, 3u) >> 8) / 16777216.;
  int few = 1 + int((a >> 4) % 3u);
  int many = int((a >> 6) % 4u);
  int radius = 3 + int(float(B.y) * (.05 + .06 * float((a >> 8) & 255u) / 255.));
  ivec2 at = ivec2(int((b & 65535u) % uint(B.x)), int((b >> 16) % uint(B.y)));
  if (source == 0) at = slotCenter(i, K, B, b);
  if (source == 2) at = ivec2(clamp(u_gesture.xy, 0., 1.) * vec2(B));
  int m = int((a >> 16) % 7u);
  int meth = m < 3 ? P_RPENTOMINO : m < 5 ? P_ACORN : m < 6 ? P_BHEPTOMINO : P_DIEHARD;
  int v = int((a >> 20) % 10u);
  int ship = v < 4 ? P_GLIDER : v < 6 ? P_LWSS : v < 8 ? P_MWSS : v < 9 ? P_HWSS : P_COPPERHEAD;
  int kind = 1, pat = P_GLIDER, copies = 1;
  bool edge = false, aim = false;
  float density = fill;
  if (source == 2) {
    if (rule == 0) pat = r < .75 ? P_GLIDER : P_LWSS;
    else if (rule == 1) pat = r < .8 ? P_GLIDER : P_REPLICATOR;
    else if (rule == 2) { kind = 2; radius = 3 + B.y / 30; density = .55; }
    else if (rule == 3) { pat = P_DOMINO; copies = 1 + (many & 1); }
    else if (rule == 4) { kind = 3; radius = 4 + B.y / 30; }
    else pat = P_BUG;
  } else if (source == 0) {
    if (rule == 0) {
      if (comp == 0) { pat = board == 0 ? P_GUNEATER : P_GOSPER; aim = true; }
      else if (comp == 1) pat = meth;
      else if (i % 3 == 0) pat = i % 2 == 0 ? P_PULSAR : P_PENTADECATHLON;
      else { pat = ship; copies = few; }
    } else if (rule == 1) pat = P_REPLICATOR;
    else if (rule == 2) { kind = 2; radius += 2; density = max(fill, .55); }
    else if (rule == 3) {
      if (comp == 2) { kind = 2; at = B / 2; radius = B.y / 4; }
      else { pat = P_DOMINO; copies = 1 + few; }
    } else if (rule == 4) { kind = 3; radius += 2; }
    else if (comp == 2) { kind = 2; radius += 4; density = .5; }
    else { pat = P_BUG; copies = 1 + (many & 1); }
  } else {
    edge = true;
    if (rule == 0) {
      if (comp == 0) {
        if (board == 0) {
          if (rescue) { pat = P_GUNEATER; edge = false; }
          else pat = r < .6 ? P_GLIDER : P_LWSS;
        } else if (rescue || r < .3) { pat = P_GOSPER; edge = false; }
        else { pat = ship; copies = few; }
      } else if (comp == 1) {
        if (r < .65) { pat = meth; edge = false; } else copies = few + 1;
      } else if (comp == 2) {
        if (r < .45) kind = 2;
        else if (r < .75) { pat = meth; edge = false; }
        else copies = few + 1;
      } else if (r < .75) { pat = ship; copies = few; }
      else { pat = r < .87 ? P_PULSAR : P_PENTADECATHLON; edge = false; }
    } else if (rule == 1) {
      bool soup = comp == 1 || comp == 3;
      if (soup && r < .5) kind = 2;
      else if (soup || r < .75) { pat = P_REPLICATOR; edge = false; }
      else copies = few;
    } else if (rule == 2) {
      kind = comp == 3 || (comp == 1 && r < .5) ? 4 : 2;
      if (comp == 2) { radius += 2; density = max(fill, .55); }
    } else if (rule == 3) {
      if (comp == 1 || comp == 3) { pat = P_DOMINO; copies = 2 + many; edge = false; }
      else { kind = 2; radius = radius / 2 + 2; }
    } else if (rule == 4) { kind = r < .6 ? 3 : 2; radius += kind == 2 ? 3 : 0; }
    else {
      bool bugs = comp == 0 || comp == 3;
      if (r < (bugs ? .6 : .3)) { pat = P_BUG; copies = bugs ? few : 1; edge = bugs; }
      else { kind = 2; radius += 4; density = .5; }
    }
  }
  // The gun-and-eater fills the close-up board: centre it, never on the seam.
  if (pat == P_GUNEATER) at = B / 2;
  return makeEvent(kind, pat, copies, edge, aim, at, radius, density, salt, a, B);
}

// Reset seeding: an optional soup plus up to eight placed events.
int initialCount(int rule, int comp, int board) {
  int g = board + 1;
  if (rule == 0) return comp == 0 ? (board == 0 ? 1 : board == 1 ? 2 : 4) : comp == 1 ? g + 1 + board : comp == 2 ? 0 : min(g + 4, 8);
  if (rule == 1) return comp == 0 ? 1 : comp == 1 ? 2 : comp == 2 ? g + 1 : 0;
  if (rule == 2) return comp == 2 ? g + 3 : 0;
  if (rule == 3) return comp == 1 || comp == 3 ? 2 * g : comp == 2 ? 1 : 0;
  if (rule == 4) return g;
  return comp == 0 || comp == 3 ? g + 3 : comp == 2 ? g + 2 : 0;
}
bool initialSoup(int rule, int comp) {
  if (rule == 0 || rule == 1) return comp == 2 || (rule == 1 && comp >= 1);
  if (rule == 2) return comp != 2;
  if (rule == 3) return comp == 0 || comp == 3;
  if (rule == 4) return true;
  return comp == 1;
}

// Torus-periodic value noise on a 16×9 lattice for Day & Night islands.
float islandNoise(ivec2 c, ivec2 B) {
  vec2 p = (vec2(c) + .5) * vec2(16., 9.) / vec2(B);
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p);
  f = f * f * (3. - 2. * f);
  vec4 h;
  for (int k = 0; k < 4; k++) {
    ivec2 q = (i + ivec2(k & 1, k >> 1)) % ivec2(16, 9);
    h[k] = float(seedHash(u_seedBits ^ (uint(q.x) * 73856093u) ^ (uint(q.y) * 19349663u)) >> 8) / 16777216.;
  }
  return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
}

ivec4 seedCell(ivec2 c, int rule, int states, bool soup, bool islands, ivec2 B, float fill) {
  int state = 0;
  float r = cellRand(c, evSalt(1u, 5u));
  if (soup) {
    if (rule == 4) state = int(r * float(states));
    else if (islands) state = islandNoise(c, B) + .08 * (r - .5) > 1. - fill ? 1 : 0;
    else state = r < (rule == 5 ? .5 : fill) ? 1 : 0;
  }
  return ivec4(state | (state << 4), rule == 4 ? 255 : 0, rule == 4 || state == 0 ? 255 : 0, 0);
}

// Exact rule step, one neighbourhood loop for every variant: life-like and
// Brian's Brain count firing Moore neighbours, the cyclic CA counts its
// successor state (range 1–3, Moore or von Neumann), Bosco a radius-5 box.
// r keeps the previous state, so the flag compares g+1 with g-1 per cell.
ivec4 stepCell(ivec2 c, ivec4 s, int rule, ivec4 cf, ivec2 B) {
  int cur = s.r & 15, prev = s.r >> 4;
  int reach = rule == 5 ? ${BOSCO.range} : rule == 4 ? cf.x : 1;
  int side = 2 * reach + 1;
  int target = rule == 4 ? (cur + 1) % cf.z : 1;
  bool diamond = rule == 4 && cf.w == 0;
  int n = 0;
  for (int i = 0; i < ${(2 * BOSCO.range + 1) ** 2}; i++) {
    if (i >= side * side) break;
    ivec2 d = ivec2(i % side, i / side) - reach;
    if (d == ivec2(0) || (diamond && abs(d.x) + abs(d.y) > reach)) continue;
    if (stateAt(c + d, B) == target) n++;
  }
  int next;
  if (rule <= 2) {
    int birth = rule == 0 ? ${LIFE_LIKE[0].birth} : rule == 1 ? ${LIFE_LIKE[1].birth} : ${LIFE_LIKE[2].birth};
    int survive = rule == 2 ? ${LIFE_LIKE[2].survive} : ${LIFE_LIKE[0].survive};
    next = ((cur == 1 ? survive : birth) >> n) & 1;
  } else if (rule == 3) next = cur == 1 ? 2 : cur == 2 ? 0 : n == 2 ? 1 : 0;
  else if (rule == 4) next = n >= cf.y ? target : cur;
  else next = cur == 1 ? int(n >= ${BOSCO.surviveMin} && n <= ${BOSCO.surviveMax})
    : int(n >= ${BOSCO.birthMin} && n <= ${BOSCO.birthMax});
  int age = s.g, ghost = s.b;
  if (rule == 4) { age = next != cur ? 0 : min(age + 1, 255); ghost = 255; }
  else if (next == 1) { age = cur == 1 ? min(age + 1, 255) : 0; ghost = 0; }
  else if (next == 2) { age = 1; ghost = 0; }
  else ghost = cur != 0 ? 0 : min(ghost + 1, 255);
  return ivec4(next | (cur << 4), age, ghost, next != prev ? 128 : 0);
}

// Overwrites the event's footprint (pattern box plus a one-cell margin, or a
// disc). Stamped cells count as changed so activity sees them at once.
ivec4 applyEvent(Ev e, ivec2 c, ivec4 s, int rule, int states, ivec2 B) {
  int cur = s.r & 15;
  int val = -1;
  if (e.kind == 1) {
    bool inside = false;
    int bit = -1;
    ivec2 sz = orientSize(e.size, e.orient);
    for (int k = 0; k < 6; k++) {
      if (k >= e.copies) break;
      ivec2 d = wrapB(c - e.o - e.stepv * k + 1, B) - 1;
      if (d.x <= sz.x && d.y <= sz.y) {
        inside = true;
        if (all(greaterThanEqual(d, ivec2(0))) && all(lessThan(d, sz))) {
          ivec2 uv = patCoord(d, e.size, e.orient);
          ivec2 uv2 = uv - e.pbAt;
          if (all(lessThan(uv, e.pa.xy))) bit = e.pa.z + uv.y * e.pa.x + uv.x;
          if (e.pb.x > 0 && all(greaterThanEqual(uv2, ivec2(0))) && all(lessThan(uv2, e.pb.xy)))
            bit = e.pb.z + uv2.y * e.pb.x + uv2.x;
        }
      }
    }
    if (inside) val = bit >= 0 && ((patWord(bit >> 5) >> uint(bit & 31)) & 1u) == 1u ? 1 : 0;
  } else {
    ivec2 d = wrapB(c - e.o + B / 2, B) - B / 2;
    if (d.x * d.x + d.y * d.y <= e.radius * e.radius) {
      float r = cellRand(c, e.salt);
      vec2 q = vec2(d) + .5;
      float turn = atan(q.y, q.x) / TAU + .5;
      if ((e.salt & 1u) == 1u) turn = 1. - turn;
      if (e.kind == 2) val = rule == 4 ? int(r * float(states)) : r < e.density ? 1 : 0;
      else if (e.kind == 3) val = rule == 4 ? int(floor(turn * float(states))) % states : r < .5 ? 1 : 0;
      else val = rule == 4 ? cur : cur == 0 ? 1 : 0;
    }
  }
  if (val < 0) return s;
  int age = s.g, ghost = s.b;
  if (rule == 4) { age = val != cur ? 0 : age; ghost = 255; }
  else if (val != 0) { age = 0; ghost = 0; }
  else if (cur != 0) ghost = 0;
  return ivec4(val | (cur << 4), age, ghost, val != cur ? 128 : (s.a & 128));
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  int rule = iparam(0, 0, 5);
  int board = iparam(1, 0, 3);
  int comp = iparam(2, 0, 3);
  ivec2 B = boardSize(board);
  ivec4 cf = cyclicRule(comp);
  float rate = clamp(u_params[3], 0., 60.);
  float fill = clamp(u_params[4], .02, .95);
  float inject = clamp(u_params[5], 0., 1.);

  ivec4 m0 = bytesAt(ivec2(0, 0));  // clock16, gesture latch, event count
  ivec4 m1 = bytesAt(ivec2(1, 0));  // generation16, passes since injection
  ivec4 cfg = bytesAt(ivec2(2, 0)); // rule, board, comp, version
  ivec4 m3 = bytesAt(ivec2(3, 0));  // period-2 changes, live cells
  ivec4 m4 = bytesAt(ivec2(4, 0));  // passes spent stale
  bool reset = u_reset || cfg != ivec4(rule, board, comp, VERSION);

  // Generation clock: rate gens/s accumulated per pass, at most one per pass.
  // Pre-roll: the first generations after a reset run one per pass, inside
  // the engine's warm-up, so a clip opens on developed material (streams in
  // flight, spirals formed) rather than on its bare seed.
  float clock = reset ? 0. : float(lo16(m0)) / 65535.;
  clock += rate * u_dt / ${STEPS}.;
  bool tick = clock >= 1.;
  if (tick) clock -= 1.;
  bool gen = !reset && (tick || lo16(m1) < ${PREROLL});
  int clock16 = int(clamp(clock, 0., 1.) * 65535. + .5);
  // Saturates instead of wrapping, so the pre-roll never comes back.
  int generation = reset ? 0 : min(lo16(m1) + (gen ? 1 : 0), 65535);
  int since = reset ? 0 : min(hi16(m1) + 1, 65535);
  int count = reset ? 0 : m0.a;
  int tick16 = int(u_tick & 65535u);

  // Activity from the previous pass's exact column reduction.
  int changes = lo16(m3), live = hi16(m3);
  float area = float(B.x * B.y);
  float staleFrac = rule <= 1 ? .003 : rule == 2 ? .02 : rule == 3 ? .03 : rule == 4 ? .05 : .01;
  int staleTicks = reset ? 0 : float(changes) < staleFrac * area ? min(lo16(m4) + 1, 65535) : 0;
  bool crowded = rule != 2 && rule != 4 && float(live) > (rule == 3 ? .22 : .3) * area;

  // Events: a kick gesture now, else a rescue (stale) or rain (inject) drop
  // on a generation boundary. One live event per pass keeps stamping bounded.
  bool gestureOn = u_gesture.z > 0.;
  float spawnChance = clamp(u_gesture.z, 0., 1.) * (.3 + .7 * inject);
  bool spawn = !reset && gestureOn && (m0.b & 1) == 0
    && float(seedHash(u_tick * 747796405u + 2891336453u) >> 8) / 16777216. < spawnChance;
  bool rescue = staleTicks >= int(.75 * PASSES);
  // Rain every 31.5 s at inject 0 … 1.5 s at inject 1.
  bool rain = inject > .02 && !crowded && since >= int(PASSES * (30. * sq(1. - inject) + 1.5));
  bool due = gen && ((rescue && since >= int(PASSES * mix(1.5, .6, inject))) || rain);
  bool happened = spawn || due;
  if (due && !spawn) since = 0;
  int K = initialCount(rule, comp, board);
  int events = reset ? K : happened ? 1 : 0;
  int source = reset ? 0 : spawn ? 2 : 1;
  uint salt = evSalt(uint(count) + 1u, uint(generation) * 65536u + uint(tick16));

  ivec2 c = p - ivec2(0, META);
  ivec4 s = reset ? seedCell(c, rule, cf.z, initialSoup(rule, comp), rule == 2 && comp == 1, B, fill)
    : bytesAt(p);
  if (gen && p.y >= META) s = stepCell(c, s, rule, cf, B);
  Ev e = Ev(0, ivec4(0), ivec4(0), ivec2(0), ivec2(1), ivec2(0), 0, 1, ivec2(0), 0, 0., 0u);
  for (int i = 0; i < 8; i++) {
    if (i >= events) break;
    e = chooseEvent(source, i, K, rule, comp, board, B,
      reset ? evSalt(uint(i) + 7u, 99u) : salt, rescue, fill);
    s = applyEvent(e, c, s, rule, cf.z, B);
  }

  if (p.y == 0) {
    int sumChanges = 0, sumLive = 0;
    for (int x = 0; x < TEXW; x++) {
      if (x >= (p.x == 3 && !reset ? B.x : 0)) break;
      ivec4 col = bytesAt(ivec2(x, 1));
      sumChanges += col.r;
      sumLive += col.g;
    }
    // Event box for the visual's corner brackets, in half cells.
    ivec2 lo = e.o, hi = e.o;
    if (e.kind == 1) {
      ivec2 run = e.stepv * (e.copies - 1);
      lo += min(run, ivec2(0));
      hi += max(run, ivec2(0)) + orientSize(e.size, e.orient);
    } else { lo -= e.radius; hi += e.radius + 1; }
    ivec2 center = wrapB(lo + hi, B * 2);
    int slot = (p.x - 8) / 2;
    vec4 meta = vec4(0.);
    if (p.x == 0) meta = bytes(ivec4(clock16 & 255, clock16 >> 8, gestureOn ? 1 : 0,
      reset ? 0 : (count + (happened ? 1 : 0)) & 255));
    else if (p.x == 1) meta = pack2(generation, since);
    else if (p.x == 2) meta = bytes(ivec4(rule, board, comp, VERSION));
    else if (p.x == 3) meta = pack2(sumChanges, sumLive);
    else if (p.x == 4) meta = pack2(staleTicks, 0);
    else if (p.x >= 8 && p.x < 16 && !reset) {
      meta = texelFetch(u_state, p, 0);
      if (happened && slot == count % 4) meta = (p.x & 1) == 0 ? pack2(center.x, center.y)
        : bytes(ivec4(clamp(hi - lo, ivec2(1), ivec2(255)), tick16 & 255, tick16 >> 8));
    }
    outColor = meta;
    return;
  }
  if (p.y == 1) {
    // Exact per-column reduction: changes vs two generations ago, live cells.
    int changed = 0, alive = 0;
    for (int y = 0; y < ${TEXTURE[1] - META_ROWS}; y++) {
      if (y >= (reset || p.x >= B.x ? 0 : B.y)) break;
      ivec4 cell = bytesAt(ivec2(p.x, y + META));
      changed += cell.a >> 7;
      alive += (cell.r & 15) == 1 ? 1 : 0;
    }
    outColor = bytes(ivec4(changed, alive, 0, 255));
    return;
  }
  if (c.x >= B.x || c.y >= B.y) s = ivec4(0);
  if (reset) s.a = 0;
  outColor = bytes(s);
}
`;

const fragment = `${common}
// Cell light: newborn cells flash bright, living cells walk the palette with
// age, the dead leave a ghost that fades over 'trail' generations.
vec3 cellLight(ivec4 s, int rule, float states, float frac, float trail, float span) {
  int state = s.r & 15;
  float age = float(s.g), ghost = float(s.b);
  if (rule == 4) {
    // Bright crest at the last state before the wrap; a cell that has held
    // its state for a while dims, so wave fronts lead and frozen debris recedes.
    float k = float(state) / max(states - 1., 1.);
    float front = exp(-(age + frac) / 3.);
    return palette(.12 + .88 * k) * (.08 + .92 * pow(k, 2.2)) * (.45 + .55 * front);
  }
  if (rule == 3 && state == 1) return mix(palette(1.), vec3(1.), .35 * (1. - frac) + .1);
  if (rule == 3 && state == 2) return palette(.62) * .55;
  float t = rule == 3 ? .3 : pow(clamp(age / max(span, 1.), 0., 1.), .6);
  vec3 ink = palette(1. - .82 * t);
  if (state == 1) {
    float flash = age < .5 ? .55 * (1. - frac) : age < 1.5 ? .15 * (1. - frac) : 0.;
    // Day & Night interiors cool to a dark crust so its moving shores glow.
    return mix(ink * mix(1., rule == 2 ? .16 : .62, t), vec3(1.), flash);
  }
  if (s.b >= 255) return vec3(0.);
  // Short ghost shows each cell's direction of travel; a faint long residue
  // turns glider lanes and gun streams into luminous tracks.
  float shortGhost = trail > .05 ? .42 * exp(-(ghost + frac) / trail) : 0.;
  return ink * (shortGhost + .05 * exp(-ghost / 40.));
}

void main() {
  int rule = iparam(0, 0, 5);
  int board = iparam(1, 0, 3);
  int comp = iparam(2, 0, 3);
  ivec2 B = boardSize(board);
  float states = float(cyclicRule(comp).z);
  float trail = clamp(u_params[6], 0., 16.);
  float span = clamp(u_params[7], 1., 255.);
  ivec4 m0 = bytesAt(ivec2(0, 0));
  float frac = float(lo16(m0)) / 65535.;

  vec2 g = v_uv * vec2(B);
  ivec2 c = clamp(ivec2(floor(g)), ivec2(0), B - 1);
  vec2 f = fract(g) - .5;
  float px = u_resolution.x / float(B.x);
  float aa = 1. / max(px, 1.);

  // Crisp rounded cells with a gutter once cells are a few pixels wide.
  float gap = px > 3. ? clamp(.7 / px + .02, .035, .1) : 0.;
  float halfSize = .5 - gap;
  float radius = min(.2, halfSize * .4) * smoothstep(3., 8., px);
  float sd = length(max(abs(f) - (halfSize - radius), 0.)) - radius;
  float body = 1. - smoothstep(-.5 * aa, .5 * aa, sd);

  vec3 own = vec3(0.), halo = vec3(0.);
  for (int i = 0; i < 9; i++) {
    ivec2 o = ivec2(i % 3, i / 3) - 1;
    vec3 light = cellLight(bytesAt(wrapB(c + o, B) + ivec2(0, META)), rule, states, frac, trail, span);
    if (i == 4) own = light;
    vec2 d = f - vec2(o);
    halo += light * exp(-dot(d, d) * 3.2);
  }

  vec3 ground = u_secondary * .03 + vec3(.004, .005, .008);
  float edge = .5 - max(abs(f.x), abs(f.y));
  float grid = (1. - smoothstep(0., 1.2 * aa, edge)) * smoothstep(9., 14., px);
  vec3 color = ground + u_secondary * .045 * grid;
  color += own * body + halo * (rule == 4 ? .12 : .22);

  // Injection events: corner brackets around the new material, fading.
  int tick16 = int(u_tick & 65535u);
  for (int k = 0; k < 4; k++) {
    ivec4 a = bytesAt(ivec2(8 + 2 * k, 0));
    ivec4 b = bytesAt(ivec2(9 + 2 * k, 0));
    float age = float((tick16 - hi16(b) + 65536) % 65536) / PASSES;
    float life = b.x == 0 ? 0. : 1. - smoothstep(.2, 1.6, age);
    vec2 center = vec2(lo16(a), hi16(a)) * .5;
    vec2 d = g - center;
    d -= vec2(B) * floor(d / vec2(B) + .5);
    vec2 he = vec2(b.xy) * .5 + 1.5 + min(age, 2.) * 1.5;
    float arm = min(he.x, he.y) * .45 + 1.;
    float th = max(.14, 1.2 * aa);
    vec2 e = abs(abs(d) - he);
    bool hor = e.y < th && abs(d.x) < he.x + th && abs(d.x) > he.x - arm;
    bool ver = e.x < th && abs(d.y) < he.y + th && abs(d.y) > he.y - arm;
    if (hor || ver) color += u_accent * .55 * life;
  }
  outColor = vec4(clamp(color, 0., 1.), 1.);
}
`;

const schema = [
  {
    key: "rule",
    label:
      "Rule · Conway / HighLife / Day&Night / Brian's Brain / cyclic / Bosco",
    min: 0,
    max: 5,
    step: 1,
    default: 0,
  },
  {
    key: "board",
    label: "Board · 96 / 160 / 240 / 320 cells across",
    min: 0,
    max: 3,
    step: 1,
    default: 2,
  },
  {
    key: "comp",
    label: "Composition (per rule; cyclic: 313 / C5 / CCA / R3)",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "rate",
    label: "Generations per second",
    min: 2,
    max: 60,
    step: 0.5,
    default: 16,
  },
  {
    key: "fill",
    label: "Soup and patch density",
    min: 0.05,
    max: 0.7,
    step: 0.01,
    default: 0.32,
  },
  {
    key: "inject",
    label: "Injection rain",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "trail",
    label: "Ghost trail · generations",
    min: 0,
    max: 12,
    step: 0.1,
    default: 4,
  },
  {
    key: "span",
    label: "Age colour span · generations",
    min: 4,
    max: 200,
    step: 1,
    default: 40,
  },
];

const look = (name, seed, rule, board, comp, rate, fill, inject, trail, span) => ({
  name,
  seed,
  params: { rule, board, comp, rate, fill, inject, trail, span },
});

const presets = [
  look("Gosper Barrage", 64, 0, 2, 0, 18, 0.3, 0.42, 4, 40),
  look("Gun & Eater", 30, 0, 0, 0, 9, 0.3, 0.12, 3, 30),
  look("Methuselah Bloom", 1103, 0, 3, 1, 28, 0.3, 0.32, 5, 90),
  look("Glider Rain", 4, 0, 1, 3, 15, 0.3, 0.7, 6, 18),
  look("Primordial Soup", 23, 0, 3, 2, 24, 0.34, 0.3, 3, 140),
  look("Replicator Field", 36, 1, 1, 2, 20, 0.25, 0.4, 4, 24),
  look("Day & Night Lava", 3678, 2, 2, 1, 14, 0.5, 0.45, 2, 30),
  look("Brian's Brain Storm", 2, 3, 3, 0, 24, 0.18, 0.5, 5, 40),
  look("Brain Sparks", 222, 3, 1, 1, 12, 0.2, 0.55, 7, 40),
  look("Cyclic Spirals", 14, 4, 3, 2, 30, 0.3, 0.3, 0, 40),
  look("313 Vortex", 313, 4, 2, 0, 20, 0.3, 0.35, 0, 40),
  look("Wide Spirals", 85, 4, 3, 3, 24, 0.3, 0.25, 0, 40),
  look("Bosco Bugs", 5, 5, 1, 0, 10, 0.5, 0.5, 4, 30),
];

export default {
  id: "life",
  number: 64,
  name: "Game of Life",
  // Simulation grid authored for a 16:9 frame; other screens cover-crop it (D7).
  aspect: 16 / 9,
  description:
    "Exact cellular automata on a torus: Conway with Gosper guns, gliders and methuselahs, HighLife replicators, Day & Night, Brian's Brain, Griffeath's cyclic spirals and Bosco's bugs. Cells age through the palette and leave fading ghosts; stale boards get visible injections.",
  energy: {
    rate: { mul: [0.35, 2.1] },
    inject: [0, 0.6],
    trail: [1, 6],
  },
  beat: { punch: 0.5, pulse: 0.8, inject: 1 },
  audio: [
    { param: "rate", feature: "low", amount: 0.1 },
    { param: "trail", feature: "high", amount: 0.1 },
    { param: "inject", feature: "flux", amount: 0.12 },
  ],
  stage: ["rate", "inject", "trail"],
  type: { key: "rule", values: [0, 1, 2, 3, 4, 5] },
  schema,
  presets,
  fragment,
  simulation: {
    fragment: simulationFragment,
    size: TEXTURE,
    steps: STEPS,
  },
};
