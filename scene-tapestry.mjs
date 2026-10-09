// Causal Tapestry (#51): exact elementary (Wolfram) cellular automata.
//
// State texture (256×256 RGBA8). Row 0 is metadata; rows 1–255 are a ring
// buffer of exact binary generations. Columns 0–239 hold cells: one ring of
// 199 cells, or three rings of 37 for the rails view (both prime, so additive
// rules such as 90 never collapse the way they do on a power-of-two ring).
// Columns 240+ hold per-row bookkeeping: a translation-invariant signature
// (population, boundaries, pairs at distance 2 and 3) and the row's rule,
// background bit and event. One controller texel per ring compares the last
// signatures for any period up to MAX_LAG (shifted cycles included) and
// schedules a visible seed event, so the automaton never stops generating.
export const TEXTURE = 256;
export const HISTORY = 255;
export const CELLS = 240;
export const RING = 199;
export const RAIL = 37;
// Density in hundredths below which a look runs seeded cascades (drift-safe:
// sparse looks sit at <= .10, dense ones at >= .36, autopilot drift is +-.095).
export const SPARSE = 25;
export const MIN_RUN = 12;
export const MAX_LAG = 40;
export const COOLDOWN = 32;
export const QUIET_LIMIT = 360;
// Simulation passes per 60 Hz tick; at most one generation per pass.
const STEPS = 2;
// Generations written instantly on load (inside the engine's 120 warm ticks).
export const PREFILL = 200;
const SIG = 240;
const INFO = 244;
const AXIS = 248;
const PATCH_SALT = 0x9e3779b9;
const RAIN_SALT = 0x85ebca6b;
const SIDE_SALT = 0xc2b2ae35;
const FILL_SALT = 0x632be5ab;

// CPU reference for exact fixtures; bit ordering is Wolfram's (left, self, right).
export function stepTapestry(row, rule) {
  const next = new Uint8Array(row.length);
  const code = Math.round(rule) & 255;
  for (let x = 0; x < row.length; x += 1) {
    const neighborhood =
      (row[(x + row.length - 1) % row.length] << 2) |
      (row[x] << 1) |
      row[(x + 1) % row.length];
    next[x] = (code >>> neighborhood) & 1;
  }
  return next;
}

export function seedHash(value) {
  let h = value >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// View 2 (rails) runs three independent rings; every other view runs one.
export function ringLayout(view) {
  return view === 2
    ? [0, 1, 2].map((k) => ({ offset: k * RAIL, width: RAIL }))
    : [{ offset: 0, width: RING }];
}

// Light-cone edges of one live cell on a quiet background: the cell left of
// a 1 is born through neighbourhood 001 (bit 1), the right one through 100
// (bit 4). Rules whose background flips (bit 0) use the full cone.
export function growth(rule) {
  const r = rule & 255;
  if (r & 1) return { left: 1, right: 1 };
  return { left: (r >> 1) & 1, right: (r >> 4) & 1 };
}

// Generations until a single seed's light cone has wrapped the ring, plus a
// short hold; 111 for two-sided rules on 199 cells, i.e. one cascade page.
export function wrapAge(width, rule) {
  const g = growth(rule);
  const speed = Math.max(1, g.left + g.right);
  return Math.ceil((width - 1) / speed) + Math.ceil((width * 3) / 50);
}

export const eventSalt = (seed, generation, ring) =>
  (seed + Math.imul(generation, 7919) + Math.imul(ring, 64829)) >>> 0;
// The outer rails cycle through famous rules beside the look's own (centre).
export const GALLERY = [
  18, 22, 30, 41, 45, 54, 60, 62, 73, 90, 102, 105, 106, 110, 126, 150,
];
const sidePick = (salt) => seedHash(salt ^ SIDE_SALT) % GALLERY.length;
export function ringRule(ring, rule, view, pick) {
  if (view !== 2 || ring === 1) return rule;
  const side = GALLERY[pick];
  return side === rule ? GALLERY[(pick + 1) % GALLERY.length] : side;
}

export function seedCount(densityH, levelQ, width) {
  const n =
    1 + Math.floor(densityH / 5) + Math.floor(Math.max(levelQ - 10, 0) / 3);
  return Math.max(1, Math.min(n, 6, Math.floor(width / 12)));
}

// Column of a cascade's first seed: where its light cone crosses the screen
// (centre for two-sided rules, right for left-growing ones and vice versa),
// jittered per cascade; the mirror view (1) keeps it exactly central.
export function firstSeed(width, salt, view, rule) {
  const g = growth(rule);
  const span = Math.min(97, width);
  const jitter = view === 1 ? 0 : (salt % span) - Math.floor(span / 2);
  let anchor = Math.floor(width / 2);
  if (g.left && !g.right) anchor = width - 1 - Math.floor(width / 8);
  if (g.right && !g.left) anchor = Math.floor(width / 8);
  const offset = g.left === g.right ? jitter : Math.trunc(jitter / 4);
  return (((anchor + offset) % width) + width) % width;
}

// A fresh row: n seeds on a quiet ring (cascade mode, density < .25) or a
// random fill.
export function seedTapestry(
  width = RING,
  seed = 1,
  view = 0,
  density = 0.01,
  generation = 0,
  rule = 90,
  level = 0.5,
  background = 0,
  ring = 0,
) {
  const densityH = Math.floor(density * 100 + 0.5);
  const levelQ = Math.floor(level * 20 + 0.5);
  const salt = eventSalt(seed, generation, ring);
  const row = new Uint8Array(width).fill(background);
  if (densityH >= SPARSE) {
    const threshold = Math.floor((densityH * 65536) / 100);
    for (let x = 0; x < width; x++)
      if ((seedHash((x + salt) >>> 0) & 65535) < threshold) row[x] ^= 1;
    return row;
  }
  row[firstSeed(width, salt, view, rule)] = 1 ^ background;
  const n = seedCount(densityH, levelQ, width);
  for (let i = 1; i < n; i++)
    row[seedHash((salt + Math.imul(i, 40503)) >>> 0) % width] = 1 ^ background;
  return row;
}

// Rotation- and reflection-invariant row signature (each count < 256).
export function signature(row, background = 0) {
  const w = row.length;
  let pop = 0,
    boundaries = 0,
    pairs2 = 0,
    pairs3 = 0;
  for (let x = 0; x < w; x++) {
    const a = row[x] ^ background,
      b = row[(x + 1) % w] ^ background,
      c = row[(x + 2) % w] ^ background,
      d = row[(x + 3) % w] ^ background;
    pop += a;
    boundaries += a ^ b;
    pairs2 += a & c;
    pairs3 += a & d;
  }
  return (pop | (boundaries << 8) | (pairs2 << 16) | (pairs3 << 24)) >>> 0;
}

// sig(j) is the signature j generations before the newest checked row.
// Returns the detected period (0 when the sequence still evolves): every
// lag p needs max(MIN_RUN, 2p + 2) consecutive equal signatures.
export function stalePeriod(sig, available) {
  for (let p = 1; p <= MAX_LAG; p++) {
    const need = Math.max(MIN_RUN, 2 * p + 2);
    if (need + p > available) break;
    let j = 0;
    while (j < need && sig(j) === sig(j + p)) j++;
    if (j === need) return p;
  }
  return 0;
}

// Exact CPU mirror of the GPU simulation, one generation per advance().
// Events: 1 inject (rain), 2 inject and re-pick the rails' neighbour rule
// (stale, phrase, long quiet), 3 fresh cascade (light cone wrapped, or a
// sparse ring went stale).
export class TapestryModel {
  constructor({
    seed = 1,
    view = 0,
    rule = 90,
    density = 0.01,
    level = 0.5,
  } = {}) {
    this.seed = seed >>> 0;
    this.cells = Array.from({ length: HISTORY }, () => new Uint8Array(CELLS));
    this.info = Array.from({ length: HISTORY }, () => []);
    this.sigs = Array.from({ length: HISTORY }, () => [0, 0, 0]);
    this.log = [];
    this.reset({ view, rule, density, level });
  }
  quantize({ view = 0, rule = 90, density = 0.01, level = 0.5 }) {
    return {
      view,
      rule: Math.round(rule) & 255,
      density,
      densityH: Math.floor(density * 100 + 0.5),
      levelQ: Math.floor(level * 20 + 0.5),
      level,
    };
  }
  controllers(rings, generation) {
    return rings.map((_, k) => ({
      age: 0,
      quiet: 0,
      pending: 0,
      events: 0,
      pick: sidePick(eventSalt(this.seed, generation, k)),
    }));
  }
  writeFresh(row, q, rings, generation) {
    this.cells[row].fill(0);
    this.info[row] = rings.map((ring, k) => {
      const rule = ringRule(k, q.rule, q.view, this.ctrl[k].pick);
      this.cells[row].set(
        seedTapestry(
          ring.width,
          this.seed,
          q.view,
          q.density,
          generation,
          rule,
          q.level,
          0,
          k,
        ),
        ring.offset,
      );
      // The seed column of a cascade (rule 30's centre column is Wolfram's RNG).
      const axis =
        q.densityH < SPARSE
          ? firstSeed(
              ring.width,
              eventSalt(this.seed, generation, k),
              q.view,
              rule,
            ) + 1
          : 0;
      return { rule, background: 0, kind: 2, x0: 0, span: ring.width, axis };
    });
  }
  reset(params) {
    const q = this.quantize(params);
    const rings = ringLayout(q.view);
    this.head = 0;
    this.generation = 0;
    this.valid = 1;
    this.sinceLayout = 1;
    this.lastRule = q.rule;
    this.lastLayout = q.view === 2 ? 1 : 0;
    this.ctrl = this.controllers(rings, 0);
    this.writeFresh(0, q, rings, 0);
  }
  ring(row, k, rings) {
    const r = rings[k];
    return this.cells[row].subarray(r.offset, r.offset + r.width);
  }
  // phrase: a beat-phrase boundary was crossed since the last generation.
  advance(params, phrase = false) {
    const q = this.quantize(params);
    const layout = q.view === 2 ? 1 : 0;
    const rings = ringLayout(q.view);
    const old = this.head;
    const head = (old + 1) % HISTORY;
    const generation = (this.generation + 1) >>> 0;
    const oldRings = ringLayout(this.lastLayout === 1 ? 2 : 0);
    for (let k = 0; k < 3; k++)
      this.sigs[old][k] =
        k < oldRings.length
          ? signature(this.ring(old, k, oldRings), this.info[old][k].background)
          : 0;
    this.head = head;
    this.generation = generation;
    this.valid = Math.min(255, this.valid + 1);
    if (layout !== this.lastLayout) {
      this.ctrl = this.controllers(rings, generation);
      this.writeFresh(head, q, rings, generation);
      this.sinceLayout = 1;
      this.lastLayout = layout;
      this.lastRule = q.rule;
      this.log.push({ generation, ring: -1, kind: 2 });
      return;
    }
    const sparse = q.densityH < SPARSE;
    const next = new Uint8Array(CELLS);
    const infos = rings.map((ring, k) => {
      const c = this.ctrl[k];
      const salt = eventSalt(this.seed, generation, k);
      const pick = c.pending >= 2 ? sidePick(salt) : c.pick;
      const rule = ringRule(k, q.rule, q.view, pick);
      const background = this.info[old][k].background
        ? (rule >> 7) & 1
        : rule & 1;
      let cells;
      let kind = q.rule !== this.lastRule ? 3 : 0,
        x0 = 0,
        span = 0,
        axis = this.info[old][k].axis;
      if (c.pending === 3) {
        cells = seedTapestry(
          ring.width,
          this.seed,
          q.view,
          q.density,
          generation,
          rule,
          q.level,
          background,
          k,
        );
        kind = 2;
        span = ring.width;
        axis = sparse ? firstSeed(ring.width, salt, q.view, rule) + 1 : 0;
      } else {
        cells = stepTapestry(this.ring(old, k, rings), rule);
        if (c.pending) {
          span = sparse
            ? 1
            : Math.max(
                3,
                Math.min(
                  Math.floor(ring.width / 16) + (q.levelQ >> 1),
                  Math.floor(ring.width / 3),
                ),
              );
          // Flip the first cell and half of the rest: a local perturbation
          // that conserves density on average (traffic rule 184 stays fair).
          x0 = seedHash(salt ^ PATCH_SALT) % ring.width;
          for (let i = 0; i < span; i++) {
            const x = (x0 + i) % ring.width;
            if (i === 0 || seedHash((x + salt + FILL_SALT) >>> 0) & 1)
              cells[x] ^= 1;
          }
          kind = 1;
        }
      }
      next.set(cells, ring.offset);
      return { rule, background, kind, x0, span, axis };
    });
    const available = this.sinceLayout - 1;
    rings.forEach((ring, k) => {
      const c = this.ctrl[k];
      const salt = eventSalt(this.seed, generation, k);
      if (c.pending) this.log.push({ generation, ring: k, kind: c.pending });
      if (c.pending >= 2) c.pick = sidePick(salt);
      if (c.pending) c.events = (c.events + 1) & 255;
      c.age = c.pending === 3 ? 0 : Math.min(65535, c.age + 1);
      c.quiet = c.pending ? 0 : Math.min(65535, c.quiet + 1);
      const sig = (j) => this.sigs[(old - 1 - j + 2 * HISTORY) % HISTORY][k];
      const stale = c.quiet >= COOLDOWN && stalePeriod(sig, available) > 0;
      // Only a dead or saturated ring re-picks a rails neighbour rule.
      const pop = sig(0) & 255;
      const dead = pop === 0 || pop === ring.width;
      const wrap = sparse && c.age >= wrapAge(ring.width, infos[k].rule);
      const rain =
        c.quiet >= 8 &&
        (seedHash(salt ^ RAIN_SALT) & 65535) <
          12 * Math.max(q.levelQ - 6, 0) ** 2;
      const quiet = !sparse && c.quiet >= QUIET_LIMIT;
      c.pending =
        wrap || (stale && sparse)
          ? 3
          : (stale && dead) || phrase || quiet
            ? 2
            : stale || rain
              ? 1
              : 0;
    });
    this.cells[head] = next;
    this.info[head] = infos;
    this.sinceLayout = Math.min(255, this.sinceLayout + 1);
    this.lastRule = q.rule;
  }
  row(age = 0) {
    return this.cells[(this.head - age + 2 * HISTORY) % HISTORY];
  }
  rowInfo(age = 0) {
    return this.info[(this.head - age + 2 * HISTORY) % HISTORY];
  }
}

const schema = [
  {
    key: "rule",
    label: "Wolfram rule",
    min: 0,
    max: 255,
    step: 1,
    default: 90,
  },
  {
    key: "seedShape",
    label: "View · cascade / mirror / rails / tunnel",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "density",
    label: "Seeds · single cell → random fill",
    min: 0.01,
    max: 0.8,
    step: 0.01,
    default: 0.01,
  },
  {
    key: "scroll",
    label: "Generations per second",
    min: 0,
    max: 96,
    step: 1,
    default: 24,
  },
  {
    key: "weave",
    label: "Cell tiles · flush → bevelled",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "playback",
    label: "Time flow · reversed ↔ forward (size = write-head glow)",
    min: -1,
    max: 1,
    step: 0.05,
    default: 1,
  },
  {
    key: "phrase",
    label: "Seed event every N beats (0 off)",
    min: 0,
    max: 32,
    step: 1,
    default: 0,
  },
  {
    key: "paletteDrift",
    label: "Palette drift along generations",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.24,
  },
];

const look = (name, seed, params) => ({ name, seed, params });
const presets = [
  look("90 · Nested linen", 97, {
    rule: 90,
    seedShape: 0,
    density: 0.01,
    scroll: 26,
    weave: 0.55,
    playback: 1,
    phrase: 0,
    paletteDrift: 0.12,
  }),
  look("54 · Twin brocade", 211, {
    rule: 54,
    seedShape: 1,
    density: 0.06,
    scroll: 20,
    weave: 0.7,
    playback: 1,
    phrase: 16,
    paletteDrift: 0.3,
  }),
  look("30 · Wild silk", 307, {
    rule: 30,
    seedShape: 3,
    density: 0.45,
    scroll: 30,
    weave: 0.4,
    playback: -1,
    phrase: 0,
    paletteDrift: 0.6,
  }),
  look("184 · Traffic ribbon", 401, {
    rule: 184,
    seedShape: 0,
    density: 0.45,
    scroll: 18,
    weave: 0.38,
    playback: 1,
    phrase: 0,
    paletteDrift: 0.08,
  }),
  look("110 · Persistent knots", 509, {
    rule: 110,
    seedShape: 0,
    density: 0.37,
    scroll: 34,
    weave: 0.62,
    playback: 1,
    phrase: 32,
    paletteDrift: 0.26,
  }),
  look("150 · Interference lace", 613, {
    rule: 150,
    seedShape: 1,
    density: 0.1,
    scroll: 28,
    weave: 0.5,
    playback: -1,
    phrase: 16,
    paletteDrift: 0.44,
  }),
  look("22 · Sparse ceremony", 719, {
    rule: 22,
    seedShape: 3,
    density: 0.01,
    scroll: 14,
    weave: 0.85,
    playback: -1,
    phrase: 0,
    paletteDrift: 0.04,
  }),
  look("126 · Burning fringe", 823, {
    rule: 126,
    seedShape: 2,
    density: 0.01,
    scroll: 54,
    weave: 0.3,
    playback: 1,
    phrase: 8,
    paletteDrift: 0.82,
  }),
  look("30 · Centre column", 929, {
    rule: 30,
    seedShape: 0,
    density: 0.01,
    scroll: 20,
    weave: 0.5,
    playback: -1,
    phrase: 0,
    paletteDrift: 0.18,
  }),
  look("45 · Chaos fan", 1033, {
    rule: 45,
    seedShape: 1,
    density: 0.01,
    scroll: 32,
    weave: 0.45,
    playback: 1,
    phrase: 0,
    paletteDrift: 0.5,
  }),
  look("73 · Walled gardens", 1129, {
    rule: 73,
    seedShape: 3,
    density: 0.36,
    scroll: 22,
    weave: 0.6,
    playback: 1,
    phrase: 16,
    paletteDrift: 0.34,
  }),
  look("18 · Kink rails", 1223, {
    rule: 18,
    seedShape: 2,
    density: 0.36,
    scroll: 30,
    weave: 0.5,
    playback: -1,
    phrase: 16,
    paletteDrift: 0.2,
  }),
  look("102 · Pascal slope", 1321, {
    rule: 102,
    seedShape: 0,
    density: 0.06,
    scroll: 40,
    weave: 0.7,
    playback: 1,
    phrase: 8,
    paletteDrift: 0.4,
  }),
  look("41 · Glider loom", 1427, {
    rule: 41,
    seedShape: 2,
    density: 0.36,
    scroll: 24,
    weave: 0.55,
    playback: 1,
    phrase: 32,
    paletteDrift: 0.28,
  }),
];

// Shared GLSL: byte access and the ring-buffer geometry.
const common = `
const int H = ${HISTORY};
const int RING = ${RING};
const int RAIL = ${RAIL};
const int CELLS = ${CELLS};
const int SIG = ${SIG};
const int INFO = ${INFO};
const int AXIS = ${AXIS};
ivec4 bytesAt(ivec2 p) { return ivec4(floor(texelFetch(u_state, p, 0) * 255. + .5)); }
vec4 bytes(ivec4 b) { return vec4(b) / 255.; }
int wrapRow(int row) { return (row % H + H) % H; }
`;

const simulationFragment = `${common}
const int STEPS = ${STEPS};
const int PREFILL = ${PREFILL};
const int SPARSE = ${SPARSE};
const int MIN_RUN = ${MIN_RUN};
const int MAX_LAG = ${MAX_LAG};
const int COOLDOWN = ${COOLDOWN};
const int QUIET_LIMIT = ${QUIET_LIMIT};
const uint PATCH_SALT = ${PATCH_SALT}u;
const uint RAIN_SALT = ${RAIN_SALT}u;
const uint SIDE_SALT = ${SIDE_SALT}u;
const uint FILL_SALT = ${FILL_SALT}u;
uint eventSalt(uint generation, int ring) {
  return u_seedBits + generation * 7919u + uint(ring) * 64829u;
}
const int GALLERY[16] = int[16](${GALLERY.join(", ")});
int sidePick(uint salt) { return int(seedHash(salt ^ SIDE_SALT) % 16u); }
int ringRule(int ring, int rule, int view, int pick) {
  if (view != 2 || ring == 1) return rule;
  int side = GALLERY[pick];
  return side == rule ? GALLERY[(pick + 1) % 16] : side;
}
ivec2 growthOf(int rule) {
  if ((rule & 1) == 1) return ivec2(1);
  return ivec2((rule >> 1) & 1, (rule >> 4) & 1);
}
int wrapAge(int width, int rule) {
  ivec2 g = growthOf(rule);
  int speed = max(1, g.x + g.y);
  return (width - 1 + speed - 1) / speed + (width * 3 + 49) / 50;
}
int seedCount(int densityH, int levelQ, int width) {
  int n = 1 + densityH / 5 + max(levelQ - 10, 0) / 3;
  return max(1, min(min(n, 6), width / 12));
}
int firstSeed(int width, uint salt, int view, int rule) {
  ivec2 g = growthOf(rule);
  int span = min(97, width);
  int jitter = view == 1 ? 0 : int(salt % uint(span)) - span / 2;
  int anchor = width / 2;
  if (g.x == 1 && g.y == 0) anchor = width - 1 - width / 8;
  if (g.y == 1 && g.x == 0) anchor = width / 8;
  int quarter = jitter >= 0 ? jitter / 4 : -((-jitter) / 4);
  int first = anchor + (g.x == g.y ? jitter : quarter);
  return (first % width + width) % width;
}
int freshCell(int x, int width, int view, int densityH, int levelQ, int rule,
  uint salt, int background) {
  if (densityH >= SPARSE)
    return background ^ (int(seedHash(uint(x) + salt) & 65535u)
      < densityH * 65536 / 100 ? 1 : 0);
  if (x == firstSeed(width, salt, view, rule)) return 1 - background;
  int n = seedCount(densityH, levelQ, width);
  for (int i = 1; i < 6; i++) {
    if (i >= n) break;
    if (x == int(seedHash(salt + uint(i) * 40503u) % uint(width))) return 1 - background;
  }
  return background;
}
int cellAt(int column, int row) {
  return texelFetch(u_state, ivec2(column, row + 1), 0).r > .5 ? 1 : 0;
}
ivec4 sigAt(int ring, int row) { return bytesAt(ivec2(SIG + ring, wrapRow(row) + 1)); }
bool stale(int ring, int head, int available) {
  for (int p = 1; p <= MAX_LAG; p++) {
    int need = max(MIN_RUN, 2 * p + 2);
    if (need + p > available) break;
    int j = 0;
    for (int i = 0; i < 2 * MAX_LAG + 2; i++) {
      if (j >= need) break;
      if (any(notEqual(sigAt(ring, head - 1 - j), sigAt(ring, head - 1 - j - p)))) break;
      j++;
    }
    if (j >= need) return true;
  }
  return false;
}
ivec4 signatureOf(int row, int offset, int width, int background) {
  ivec4 s = ivec4(0);
  int a = cellAt(offset, row) ^ background;
  int b = cellAt(offset + 1, row) ^ background;
  int c = cellAt(offset + 2, row) ^ background;
  for (int x = 0; x < RING; x++) {
    if (x >= width) break;
    int d = cellAt(offset + (x + 3) % width, row) ^ background;
    s += ivec4(a, a ^ b, a & c, a & d);
    a = b; b = c; c = d;
  }
  return s;
}
// A texel of a fresh row (reset or a new ring arrangement): cells, the
// row's rule/background/event and its seed column.
vec4 freshTexel(int column, int view, int rule, int densityH, int levelQ,
  uint generation, int rings, int width) {
  bool cell = column < CELLS;
  int k = cell ? (rings == 3 ? min(column / RAIL, 2) : 0)
    : min(column - (column >= AXIS ? AXIS : INFO), rings - 1);
  uint salt = eventSalt(generation, k);
  int ruleK = ringRule(k, rule, view, sidePick(salt));
  if (cell) {
    int v = column < rings * width
      ? freshCell(column - k * width, width, view, densityH, levelQ, ruleK, salt, 0) : 0;
    return vec4(float(v), 0., 0., 1.);
  }
  if (column >= AXIS)
    return bytes(ivec4(densityH < SPARSE ? firstSeed(width, salt, view, ruleK) + 1 : 0, 0, 0, 0));
  return bytes(ivec4(ruleK, 4, 0, width));
}
bool rowColumn(int column) {
  return column < CELLS || column >= INFO && column < INFO + 3
    || column >= AXIS && column < AXIS + 3;
}
void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  int rule = clamp(int(floor(u_params[0] + .5)), 0, 255);
  int view = clamp(int(floor(u_params[1] + .5)), 0, 3);
  int densityH = clamp(int(floor(u_params[2] * 100. + .5)), 0, 100);
  int levelQ = clamp(int(floor(u_level * 20. + .5)), 0, 20);
  int phrase = clamp(int(floor(u_params[6] + .5)), 0, 255);
  int phraseIndex = phrase > 0 ? int(floor(max(u_beat, 0.) / float(phrase))) % 65536 : 0;
  int arrangement = view == 2 ? 1 : 0;
  int rings = arrangement == 1 ? 3 : 1;
  int width = arrangement == 1 ? RAIL : RING;
  bool sparse = densityH < SPARSE;
  if (u_reset) {
    if (pixel.y == 0) {
      if (pixel.x == 0) outColor = bytes(ivec4(0, 0, 0, PREFILL));
      else if (pixel.x == 2) outColor = bytes(ivec4(1, phraseIndex >> 8, phraseIndex & 255, phrase));
      else if (pixel.x == 3) outColor = bytes(ivec4(rule, arrangement, 0, 255));
      else if (pixel.x == 4) outColor = bytes(ivec4(1, 0, 0, 255));
      else if (pixel.x >= 12 && pixel.x < 15)
        outColor = bytes(ivec4(0, 0, sidePick(eventSalt(0u, pixel.x - 12)), 0));
      else outColor = vec4(0.);
    } else outColor = pixel.y == 1 && rowColumn(pixel.x)
      ? freshTexel(pixel.x, view, rule, densityH, levelQ, 0u, rings, width) : vec4(0.);
    return;
  }
  ivec4 clockBytes = bytesAt(ivec2(0, 0));
  int head = clockBytes.r;
  float clock = float(clockBytes.g * 256 + clockBytes.b) / 65536.;
  // While warming up, every pass writes a generation (alpha counts down), so
  // a clip opens on a full diagram. Afterwards the clock never stalls either.
  int prefill = clockBytes.a;
  if (prefill == 0) clock += max(u_params[3], 2.) * u_dt / float(STEPS);
  bool advance = prefill > 0 || clock >= 1.;
  if (prefill == 0 && advance) clock -= 1.;
  int clock16 = int(min(floor(clock * 65536.), 65535.));
  if (pixel.y == 0 && pixel.x == 5) {
    // Tunnel rotation is integrated, so energy changes never jump the phase.
    ivec4 spin = bytesAt(pixel);
    float rate = mix(.0015, .012, smoothstep(.1, .9, u_level));
    float phase = fract(float(spin.r * 256 + spin.g) / 65536. + rate * u_dt / float(STEPS));
    int phase16 = int(min(floor(phase * 65536.), 65535.));
    outColor = bytes(ivec4(phase16 >> 8, phase16 & 255, 0, 255));
    return;
  }
  if (!advance) {
    outColor = pixel == ivec2(0, 0)
      ? bytes(ivec4(head, clock16 >> 8, clock16 & 255, prefill))
      : texelFetch(u_state, pixel, 0);
    return;
  }
  int next = (head + 1) % H;
  int row = pixel.y - 1;
  // Most texels only keep their history; only metadata, the previous newest
  // row's signatures and the new row read further state.
  bool sigTexel = row == head && pixel.x >= SIG && pixel.x < SIG + 3;
  bool rowTexel = row == next && rowColumn(pixel.x);
  if (pixel.y > 0 && !sigTexel && !rowTexel) {
    outColor = row == next ? vec4(0.) : texelFetch(u_state, pixel, 0);
    return;
  }
  ivec4 genBytes = bytesAt(ivec2(1, 0));
  uint generation = uint(genBytes.r) | uint(genBytes.g) << 8
    | uint(genBytes.b) << 16 | uint(genBytes.a) << 24;
  uint nextGeneration = generation + 1u;
  ivec4 config = bytesAt(ivec2(3, 0));
  bool layoutChanged = config.g != arrangement;
  if (pixel.y == 0) {
    ivec4 phraseBytes = bytesAt(ivec2(2, 0));
    int sinceLayout = bytesAt(ivec2(4, 0)).r;
    bool phraseEvent = phrase > 0 && phraseBytes.a == phrase
      && phraseBytes.g * 256 + phraseBytes.b != phraseIndex;
    if (pixel.x == 0) outColor = bytes(ivec4(next, clock16 >> 8, clock16 & 255, max(prefill - 1, 0)));
    else if (pixel.x == 1)
      outColor = bytes(ivec4(nextGeneration & 255u, (nextGeneration >> 8) & 255u,
        (nextGeneration >> 16) & 255u, nextGeneration >> 24));
    else if (pixel.x == 2)
      outColor = bytes(ivec4(min(phraseBytes.r + 1, 255), phraseIndex >> 8, phraseIndex & 255, phrase));
    else if (pixel.x == 3) outColor = bytes(ivec4(rule, arrangement, 0, 255));
    else if (pixel.x == 4) outColor = bytes(ivec4(layoutChanged ? 1 : min(sinceLayout + 1, 255), 0, 0, 255));
    else if (pixel.x >= 8 && pixel.x < 11 || pixel.x >= 12 && pixel.x < 15) {
      // Ring controllers: event bookkeeping, then the next generation's event.
      int k = pixel.x >= 12 ? pixel.x - 12 : pixel.x - 8;
      uint salt = eventSalt(nextGeneration, k);
      if (layoutChanged || k >= rings) {
        outColor = pixel.x >= 12 ? bytes(ivec4(0, 0, sidePick(salt), 0)) : vec4(0.);
        return;
      }
      ivec4 control = bytesAt(ivec2(8 + k, 0));
      ivec4 control2 = bytesAt(ivec2(12 + k, 0));
      int pending = control.b;
      int pick = pending >= 2 ? sidePick(salt) : control2.b;
      int events = pending > 0 ? (control.a + 1) & 255 : control.a;
      int age = pending == 3 ? 0 : min(control.r * 256 + control.g + 1, 65535);
      int quiet = pending > 0 ? 0 : min(control2.r * 256 + control2.g + 1, 65535);
      if (pixel.x >= 12) {
        outColor = bytes(ivec4(quiet >> 8, quiet & 255, pick, 0));
        return;
      }
      int ruleK = ringRule(k, rule, view, pick);
      bool isStale = quiet >= COOLDOWN && stale(k, head, sinceLayout - 1);
      // Only a dead or saturated ring re-picks a rails neighbour rule.
      int population = sigAt(k, head - 1).r;
      bool dead = population == 0 || population == width;
      bool wrapped = sparse && age >= wrapAge(width, ruleK);
      int levelRain = max(levelQ - 6, 0);
      bool rain = quiet >= 8
        && int(seedHash(salt ^ RAIN_SALT) & 65535u) < 12 * levelRain * levelRain;
      bool longQuiet = !sparse && quiet >= QUIET_LIMIT;
      int nextPending = wrapped || (isStale && sparse) ? 3
        : (isStale && dead) || phraseEvent || longQuiet ? 2
        : isStale || rain ? 1 : 0;
      outColor = bytes(ivec4(age >> 8, age & 255, nextPending, events));
    } else outColor = texelFetch(u_state, pixel, 0);
    return;
  }
  // Signature of the previous newest row, under the arrangement it was written in.
  if (sigTexel) {
    int k = pixel.x - SIG;
    int oldRings = config.g == 1 ? 3 : 1;
    int oldWidth = config.g == 1 ? RAIL : RING;
    int background = bytesAt(ivec2(INFO + k, row + 1)).g & 1;
    outColor = k < oldRings ? bytes(signatureOf(row, k * oldWidth, oldWidth, background)) : vec4(0.);
    return;
  }
  // The newly written generation.
  if (layoutChanged) {
    outColor = freshTexel(pixel.x, view, rule, densityH, levelQ, nextGeneration, rings, width);
    return;
  }
  bool cell = pixel.x < CELLS;
  int k = cell ? (rings == 3 ? min(pixel.x / RAIL, 2) : 0)
    : min(pixel.x - (pixel.x >= AXIS ? AXIS : INFO), rings - 1);
  if (cell && pixel.x >= rings * width) {
    outColor = vec4(0., 0., 0., 1.);
    return;
  }
  int x = cell ? pixel.x - k * width : 0;
  uint salt = eventSalt(nextGeneration, k);
  int pending = bytesAt(ivec2(8 + k, 0)).b;
  int pick = pending >= 2 ? sidePick(salt) : bytesAt(ivec2(12 + k, 0)).b;
  int ruleK = ringRule(k, rule, view, pick);
  if (pixel.x >= AXIS) {
    // The seed column follows its cascade until the next fresh row.
    int axis = pending == 3
      ? (sparse ? firstSeed(width, salt, view, ruleK) + 1 : 0)
      : bytesAt(ivec2(AXIS + k, head + 1)).r;
    outColor = bytes(ivec4(axis, 0, 0, 0));
    return;
  }
  int previousBackground = bytesAt(ivec2(INFO + k, head + 1)).g & 1;
  int background = previousBackground == 1 ? (ruleK >> 7) & 1 : ruleK & 1;
  int kind = config.r != rule ? 3 : 0;
  int x0 = 0;
  int span = 0;
  int value = 0;
  if (pending == 3) {
    kind = 2;
    span = width;
    if (cell) value = freshCell(x, width, view, densityH, levelQ, ruleK, salt, background);
  } else {
    if (cell) {
      int offset = k * width;
      int left = cellAt(offset + (x + width - 1) % width, head);
      int self = cellAt(offset + x, head);
      int right = cellAt(offset + (x + 1) % width, head);
      value = (ruleK >> ((left << 2) | (self << 1) | right)) & 1;
    }
    if (pending > 0) {
      kind = 1;
      span = sparse ? 1 : max(3, min(width / 16 + (levelQ >> 1), width / 3));
      x0 = int(seedHash(salt ^ PATCH_SALT) % uint(width));
      int i = (x - x0 + width) % width;
      if (cell && i < span && (i == 0 || (seedHash(uint(x) + salt + FILL_SALT) & 1u) == 1u))
        value ^= 1;
    }
  }
  outColor = cell
    ? vec4(float(value), 0., 0., 1.)
    : bytes(ivec4(ruleK, background | kind << 1, x0, span));
}
`;

const fragment = `${common}
struct Hit { int ring; int x; int width; float age; vec2 local; float ppc; float lead; float along; float pen; float reveal; float fade; };
float headAlong(float a, float period) { return a - period * floor(a / period + .5); }
void main() {
  int view = clamp(int(floor(u_params[1] + .5)), 0, 3);
  float weave = clamp(u_params[4], 0., 1.);
  float flow = clamp(u_params[5], -1., 1.);
  bool forward = flow >= 0.;
  float energy = smoothstep(.1, .9, u_level);
  ivec4 clockBytes = bytesAt(ivec2(0, 0));
  int head = clockBytes.r;
  float f = float(clockBytes.g * 256 + clockBytes.b) / 65536.;
  ivec4 genBytes = bytesAt(ivec2(1, 0));
  uint generation = uint(genBytes.r) | uint(genBytes.g) << 8
    | uint(genBytes.b) << 16 | uint(genBytes.a) << 24;
  int valid = bytesAt(ivec2(2, 0)).r;
  ivec4 spinBytes = bytesAt(ivec2(5, 0));
  float spin = float(spinBytes.r * 256 + spinBytes.g) / 65536.;
  float px = u_resolution.y;
  Hit h;
  h.ring = 0; h.width = RING; h.fade = 1.;
  float histSpan = 112.;
  bool gap = false;
  // Every view maps the pixel to (ring cell, generation age, position in cell),
  // the signed distance to the write head (lead > 0 on the history side) and
  // the distance along the head to the pen that writes the newest row.
  if (view == 0) {
    // Cascade: a printed page. The write head sweeps down (up when reversed)
    // over a static, exact space-time diagram; one 199-cell ring per width.
    vec2 c = vec2(v_uv.x * 199., (forward ? 1. - v_uv.y : v_uv.y) * 112.);
    int pageRow = int(floor(c.y));
    int headRow = int(generation % 112u);
    int age = (headRow - pageRow + 112) % 112;
    h.x = int(floor(c.x));
    h.age = float(age);
    h.local = fract(c);
    h.ppc = px / 112.;
    h.lead = headAlong(float(headRow) + 1. - c.y, 112.);
    h.along = c.x;
    h.pen = f * 199.;
    h.reveal = (float(h.x) + .5) / 199.;
    // The rows just ahead of the head are erased before they are rewritten.
    h.fade = smoothstep(111., 106., float(age));
  } else if (view == 1) {
    // Mirror: the newest generation is the centre line; history streams out
    // both ways, and energy folds the ring into more kaleidoscope copies.
    float yc = (v_uv.y - .5) * 112.;
    float s = abs(yc);
    if (!forward) s = 56. - s;
    float folds = 1. + 2. * energy;
    float window = 199. / folds;
    float u = mod((v_uv.x - .5) * 199. + window * .5, 2. * window);
    float rc = 99.5 - window * .5 + (u < window ? u : 2. * window - u);
    float t = s + 1. - f;
    h.x = int(floor(rc)) % 199;
    h.age = floor(t);
    h.local = vec2(fract(rc), fract(t));
    h.ppc = px / 112.;
    h.lead = s;
    h.along = rc;
    h.pen = 99.5 + sign(rc - 99.5) * f * 99.5;
    h.reveal = abs(float(h.x) + .5 - 99.5) / 99.5;
    histSpan = 56.;
  } else if (view == 2) {
    // Rails: three 37-cell rings with time running sideways. The centre rail
    // runs the look's rule; the outer rails cycle through famous rules.
    float cy = (1. - v_uv.y) * 113.;
    int rail = min(int(floor(cy / 38.)), 2);
    float within = cy - float(rail) * 38.;
    gap = within >= 37.;
    float across = 113. * 16. / 9.;
    float cx = v_uv.x * across;
    bool leftward = (rail != 1) == forward;
    float s = leftward ? across - 8. - cx : cx - 8.;
    float t = s + 1. - f;
    h.ring = rail;
    h.width = RAIL;
    h.x = min(int(floor(within)), RAIL - 1);
    h.age = floor(t);
    h.local = vec2(fract(within), fract(t));
    h.ppc = px / 113.;
    h.lead = s;
    h.along = within;
    h.pen = f * 37.;
    h.reveal = (float(h.x) + .5) / 37.;
    histSpan = across - 8.;
  } else {
    // Tunnel: log-polar, so every cell stays square. Time is depth: the ring
    // is literally a ring, and generations fly out of the vanishing point.
    vec2 p = (v_uv - .5) * vec2(16. / 9., 1.);
    float r = max(length(p), 1e-4);
    float a = fract(atan(p.y, p.x) / TAU + .5 + spin);
    float k = 199. / TAU;
    float s = forward ? log(r / .055) * k : log(.8 / r) * k;
    float t = s + 1. - f;
    float rc = a * 199.;
    h.x = min(int(floor(rc)), 198);
    h.age = floor(t);
    h.local = vec2(fract(rc), fract(t));
    h.ppc = TAU * r * px / 199.;
    h.lead = s;
    h.along = rc;
    h.pen = f * 199.;
    h.reveal = (float(h.x) + .5) / 199.;
    histSpan = forward ? log(1.02 / .055) * k : log(.8 / .03) * k;
  }
  vec3 ground = u_secondary * .035 + vec3(.004, .005, .008);
  vec3 hotInk = mix(u_accent, vec3(1.), .45);
  float headGain = (.45 + .75 * energy) * (.35 + .65 * abs(flow)) * (1. + .4 * u_kick);
  vec3 color = ground;
  int age = int(h.age);
  // The newest row is revealed cell by cell as the pen passes (fraction f).
  bool shown = !gap && h.age >= 0. && (view == 0 || h.lead >= 0.)
    && age < valid && age < H - 1 && (age > 0 || h.reveal < f);
  if (shown) {
    int row = wrapRow(head - age) + 1;
    int column = h.ring * h.width + h.x;
    ivec4 info = bytesAt(ivec2(INFO + h.ring, row));
    int background = info.g & 1;
    int kind = (info.g >> 1) & 3;
    float on = float((texelFetch(u_state, ivec2(column, row), 0).r > .5 ? 1 : 0) ^ background);
    // Sub-pixel cells (the tunnel's vanishing point) settle to row density.
    if (h.ppc < 1.6 && age > 0) {
      float density = float(bytesAt(ivec2(SIG + h.ring, row)).r) / float(h.width);
      on = mix(density, on, smoothstep(.7, 1.6, h.ppc));
    }
    float ageNorm = clamp(h.age / histSpan, 0., 1.);
    float spark = 0.;
    if (kind == 1 && (h.x - info.b + h.width) % h.width < info.a) spark = 1.;
    if (kind == 2) spark = .8;
    if (kind == 3) spark = .55;
    spark *= exp(-h.age / 28.);
    // Tiles: gap and bevel grow with weave; they vanish on sub-3px cells.
    float gapSize = mix(.06, .3, weave);
    vec2 q = abs(h.local - .5);
    float d = max(q.x, q.y);
    float aa = .7 / max(h.ppc, .7);
    float edge = .5 - gapSize * .5;
    float crisp = smoothstep(2.5, 6., h.ppc);
    float tile = mix(1., 1. - smoothstep(edge - aa, edge + aa, d), crisp);
    float bevel = 1. + crisp * weave * (.12 - .5 * smoothstep(.1, edge, d));
    // Palette drift: a colour tide tied to generation numbers (exact, bounded).
    float tide = float((generation - uint(age)) % 240u) / 240.;
    float tone = clamp(.72 - .38 * ageNorm
      + u_params[7] * .22 * sin(TAU * (tide + fract(u_time * .013))), 0., 1.);
    vec3 ink = palette(tone);
    ink = mix(ink, sqrt(max(ink, vec3(0.))), .35);
    float fade = mix(1., .4, pow(ageNorm, .85)) * h.fade;
    vec3 lit = ink * bevel * fade;
    float hot = headGain * .7 * exp(-h.age * 1.1);
    lit = mix(lit, hotInk, clamp(hot, 0., .85));
    lit = mix(lit, u_accent * 1.15 + .08, clamp(spark, 0., 1.));
    // The seed column of an asymmetric two-sided cascade: for rule 30 this is
    // the centre column Wolfram used as a random number generator.
    int code = info.r;
    int mirrored = (code & 165) | (code & 2) << 3 | (code & 16) >> 3
      | (code & 8) << 3 | (code & 64) >> 3;
    bool chiral = (code & 1) == 1 || (code & 18) == 18;
    if (chiral && mirrored != code && bytesAt(ivec2(AXIS + h.ring, row)).r - 1 == h.x)
      lit = mix(lit, hotInk, .55 * fade + .15);
    // Unlit lattice glows faintly near the head, so the grid being written reads.
    // A live rule change leaves a faint accent seam across the diagram.
    vec3 dark = ground + u_accent * (.035 * exp(-h.age * .35) * headGain + .14 * spark * float(kind == 3)) * tile;
    color = mix(dark, lit, on * tile);
  }
  // Write head: a bright line on the newest edge and the pen writing it.
  float lead = h.lead;
  float line = exp(-abs(lead) * 2.4) * .5 + exp(-abs(lead) * .5) * (lead < 0. ? .22 : .08);
  float dAlong = h.along - h.pen;
  if (view == 3) dAlong = headAlong(dAlong, 199.);
  float pen = exp(-(dAlong * dAlong + lead * lead) * .09);
  float headSize = view == 3 ? smoothstep(.0, 3., h.ppc) : 1.;
  color += hotInk * headGain * headSize * (line * .32 + pen * .75);
  if (view == 3 && forward) {
    // The vanishing point is where every generation is born.
    float r = length((v_uv - .5) * vec2(16. / 9., 1.));
    color += hotInk * headGain * .35 * exp(-r * 38.);
  }
  outColor = vec4(clamp(color, 0., 1.), 1.);
}
`;

export default {
  id: "tapestry",
  // Simulation grid authored for a 16:9 frame; other screens cover-crop it (D7).
  aspect: 16 / 9,
  // Energy moves generation rate here and, in the shaders, seed count, rain
  // of perturbations, mirror folds, tunnel spin and write-head intensity.
  energy: { scroll: { mul: [0.4, 1.6] }, paletteDrift: [0.1, 0.5] },
  beat: { punch: 0.8, pulse: 1 },
  audio: [
    { param: "weave", feature: "low", amount: 0.12 },
    { param: "scroll", feature: "mid", amount: 0.08 },
    { param: "paletteDrift", feature: "high", amount: 0.1 },
  ],
  stage: ["scroll", "weave", "paletteDrift"],
  type: { key: "seedShape", values: [0, 1, 2, 3] },
  number: 51,
  name: "Causal Tapestry",
  description:
    "Exact elementary (Wolfram) automata written generation by generation: a printed cascade page, a mirrored kaleidoscope, three rails of famous rules side by side and a log-polar tunnel. A glowing write head prints each new row; stale rings are detected by signature and reseeded, so it generates forever.",
  schema,
  presets,
  fragment,
  simulation: {
    fragment: simulationFragment,
    size: [TEXTURE, TEXTURE],
    steps: STEPS,
  },
};
