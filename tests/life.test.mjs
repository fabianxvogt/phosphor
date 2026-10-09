import test from "node:test";
import assert from "node:assert/strict";
import life, {
  BOARDS,
  TEXTURE,
  META_ROWS,
  CYCLIC,
  PATTERNS,
  PATTERN_ORDER,
  GUN_EATER,
  parsePattern,
  packPatterns,
  gunEaterRows,
  orientedSize,
  orientedDirection,
  patternCoord,
  stamp,
  stepRule,
  lifeStep,
  brainStep,
  cyclicStep,
  ltlStep,
  LIFE_LIKE,
} from "../scene-life.mjs";
import scenes from "../scenes.mjs";
import { validateSnapshot, presetSnapshot } from "../session.mjs";

const CONWAY = 0,
  HIGHLIFE = 1,
  DAY_NIGHT = 2;

function place(w, h, rows, x, y, o = 0) {
  return stamp(new Uint8Array(w * h), w, h, parsePattern(rows), x, y, o);
}
function run(rule, cells, w, h, gens, comp = 0) {
  for (let g = 0; g < gens; g++) cells = stepRule(rule, comp, cells, w, h);
  return cells;
}
function liveCells(cells, w) {
  const out = [];
  cells.forEach((v, i) => v && out.push([i % w, Math.floor(i / w)]));
  return out;
}
// Shape and position of a pattern away from the torus seam.
function shape(cells, w) {
  const list = liveCells(cells, w);
  const x0 = Math.min(...list.map((p) => p[0]));
  const y0 = Math.min(...list.map((p) => p[1]));
  return {
    x0,
    y0,
    key: list
      .map(([x, y]) => `${x - x0},${y - y0}`)
      .sort()
      .join(" "),
  };
}
function translates(rows, rule, period, [dx, dy], o = 0) {
  const w = 64,
    h = 64;
  const start = place(w, h, rows, 28, 28, o);
  const end = run(rule, start, w, h, period);
  const a = shape(start, w),
    b = shape(end, w);
  assert.equal(b.key, a.key, "same phase after one period");
  assert.deepEqual([b.x0 - a.x0, b.y0 - a.y0], [dx, dy]);
}

test("Conway: blinker has period 2, block is still", () => {
  const w = 8,
    h = 8;
  const blinker = place(w, h, ["OOO"], 2, 3);
  const once = run(CONWAY, blinker, w, h, 1);
  assert.notDeepEqual(once, blinker);
  assert.deepEqual(liveCells(once, w), [
    [3, 2],
    [3, 3],
    [3, 4],
  ]);
  assert.deepEqual(run(CONWAY, blinker, w, h, 2), blinker);
  const block = place(w, h, ["OO", "OO"], 1, 1);
  assert.deepEqual(run(CONWAY, block, w, h, 5), block);
});

test("Conway: the glider moves (1,1) every 4 generations, in all 8 orientations", () => {
  translates(PATTERNS.glider, CONWAY, 4, [1, 1]);
  for (let o = 0; o < 8; o++)
    translates(PATTERNS.glider, CONWAY, 4, orientedDirection([1, 1], o), o);
});

test("Conway: spaceships, oscillators and their periods", () => {
  for (const ship of ["lwss", "mwss", "hwss"])
    translates(PATTERNS[ship], CONWAY, 4, [-2, 0]);
  translates(PATTERNS.copperhead, CONWAY, 10, [0, -1]);
  translates(PATTERNS.pulsar, CONWAY, 3, [0, 0]);
  translates(PATTERNS.pentadecathlon, CONWAY, 15, [0, 0]);
  translates(PATTERNS.eater, CONWAY, 1, [0, 0]);
  // Declared GPU travel directions agree with the measured motion.
  const declared = new Map(PATTERN_ORDER);
  assert.deepEqual(declared.get("glider"), [1, 1]);
  assert.deepEqual(declared.get("lwss"), [-1, 0]);
  assert.deepEqual(declared.get("copperhead"), [0, -1]);
});

test("Conway: methuselahs behave as catalogued", () => {
  const w = 160,
    h = 160;
  const diehard = run(CONWAY, place(w, h, PATTERNS.diehard, 76, 78), w, h, 130);
  assert.equal(liveCells(diehard, w).length, 0, "diehard vanishes at 130");
  const r = run(CONWAY, place(w, h, PATTERNS.rpentomino, 78, 78), w, h, 200);
  assert.ok(liveCells(r, w).length > 100, "R-pentomino blooms");
});

test("Conway: the Gosper gun emits one glider every 30 generations", () => {
  const w = 120,
    h = 120;
  let cells = place(w, h, PATTERNS.gosper, 10, 10);
  const pops = [];
  for (let g = 1; g <= 120; g++) {
    cells = run(CONWAY, cells, w, h, 1);
    if (g % 30 === 0) pops.push(liveCells(cells, w).length);
  }
  // Same gun phase each 30 generations, plus exactly one 5-cell glider.
  assert.deepEqual(
    pops.slice(1).map((p, i) => p - pops[i]),
    [5, 5, 5],
  );
  const gun = (c) =>
    liveCells(c, w)
      .filter(([x, y]) => x < 47 && y < 20)
      .join(" ");
  assert.equal(gun(run(CONWAY, cells, w, h, 30)), gun(cells));
});

test("Conway: gun and eater stay exactly periodic (period 30, no debris)", () => {
  const w = 84,
    h = 64;
  const rows = gunEaterRows();
  assert.equal(rows.length, GUN_EATER.size[1]);
  assert.equal(rows[0].length, GUN_EATER.size[0]);
  for (const o of [0, 5]) {
    const settled = run(CONWAY, place(w, h, rows, 2, 2, o), w, h, 600);
    assert.deepEqual(run(CONWAY, settled, w, h, 30), settled, `orientation ${o}`);
    assert.notDeepEqual(run(CONWAY, settled, w, h, 15), settled);
  }
});

test("HighLife: the replicator copies itself diagonally in 12 generations", () => {
  const w = 40,
    h = 40;
  const start = place(w, h, PATTERNS.replicator, 18, 18);
  const copies = new Uint8Array(w * h);
  for (const d of [-2, 2])
    stamp(copies, w, h, parsePattern(PATTERNS.replicator), 18 + d, 18 + d);
  const both = liveCells(copies, w).join(" ");
  assert.equal(liveCells(run(HIGHLIFE, start, w, h, 12), w).join(" "), both);
  // Conway destroys it instead: B6 is what makes it replicate.
  assert.notEqual(liveCells(run(CONWAY, start, w, h, 12), w).join(" "), both);
  translates(PATTERNS.glider, HIGHLIFE, 4, [1, 1]);
});

test("Day & Night is self-complementary: on and off obey the same rule", () => {
  const w = 48,
    h = 30;
  let seed = 7;
  const soup = Uint8Array.from({ length: w * h }, () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed >>> 31;
  });
  const invert = (c) => c.map((v) => 1 - v);
  const { birth, survive } = LIFE_LIKE[DAY_NIGHT];
  assert.deepEqual(
    lifeStep(invert(soup), w, h, birth, survive),
    invert(lifeStep(soup, w, h, birth, survive)),
  );
});

test("Brian's Brain: firing → refractory → off; birth needs exactly two", () => {
  const w = 9,
    h = 9;
  const at = (x, y) => y * w + x;
  const c = new Uint8Array(w * h);
  c[at(4, 4)] = 1;
  c[at(5, 4)] = 1; // a firing domino
  c[at(1, 1)] = 2; // a lone refractory cell
  const n1 = brainStep(c, w, h);
  assert.equal(n1[at(4, 4)], 2);
  assert.equal(n1[at(1, 1)], 0);
  // Cells touching both firing cells fire; those touching one do not.
  for (const [x, y] of [
    [4, 3],
    [5, 3],
    [4, 5],
    [5, 5],
  ])
    assert.equal(n1[at(x, y)], 1);
  assert.equal(n1[at(3, 3)], 0);
  assert.equal(n1[at(6, 4)], 0);
  // Three firing neighbours: no birth. Refractory neighbours never count.
  const t = new Uint8Array(w * h);
  t[at(3, 3)] = t[at(4, 3)] = t[at(5, 3)] = 1;
  assert.equal(brainStep(t, w, h)[at(4, 4)], 0);
  const r = new Uint8Array(w * h);
  r[at(3, 3)] = r[at(5, 3)] = 2;
  assert.equal(brainStep(r, w, h)[at(4, 4)], 0);
  // The domino launches two c/1 ships (firing pair, refractory pair behind)
  // flying apart vertically.
  const W = 12,
    H = 16;
  let d = new Uint8Array(W * H);
  d[8 * W + 5] = d[8 * W + 6] = 1;
  for (let g = 1; g <= 4; g++) {
    d = brainStep(d, W, H);
    for (const [y, behind] of [
      [8 - g, 1],
      [8 + g, -1],
    ])
      for (const x of [5, 6]) {
        assert.equal(d[y * W + x], 1, `gen ${g} front`);
        assert.equal(d[(y + behind) * W + x], 2, `gen ${g} tail`);
      }
  }
});

test("cyclic CA: advance needs threshold successors, states wrap", () => {
  const rule = { range: 1, threshold: 2, states: 4, moore: true };
  const w = 5,
    h = 5;
  const at = (x, y) => y * w + x;
  const c = new Uint8Array(w * h).fill(3);
  c[at(2, 2)] = 3;
  c[at(1, 1)] = 0;
  assert.equal(cyclicStep(c, w, h, rule)[at(2, 2)], 3, "one successor");
  c[at(3, 3)] = 0;
  assert.equal(cyclicStep(c, w, h, rule)[at(2, 2)], 0, "two successors: 3 → 0");
  // Von Neumann ignores the diagonals that Moore counts.
  const vn = { ...rule, moore: false };
  assert.equal(cyclicStep(c, w, h, vn)[at(2, 2)], 3);
  c[at(2, 1)] = 0;
  c[at(2, 3)] = 0;
  assert.equal(cyclicStep(c, w, h, vn)[at(2, 2)], 0);
});

// The GPU seeds cyclic boards with soup plus winding cores (phase
// singularities): state = ⌊N·angle/2π⌋ inside a disc. Bare CCA soup can
// fixate on a small torus; a core grows into a spiral that takes over.
function windingCore(c, w, h, cx, cy, radius, states) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x - cx,
        dy = y - cy;
      if (dx * dx + dy * dy > radius * radius) continue;
      const turn = Math.atan2(dy + 0.5, dx + 0.5) / (2 * Math.PI) + 0.5;
      c[y * w + x] = Math.floor(turn * states) % states;
    }
  return c;
}

test("cyclic CA flavours keep turning from soup plus a core (no freeze)", () => {
  const [w, h] = BOARDS[0];
  CYCLIC.forEach((flavour, comp) => {
    let seed = 99 + comp;
    let c = Uint8Array.from({ length: w * h }, () => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return (seed >>> 16) % flavour.states;
    });
    c = windingCore(c, w, h, w >> 1, h >> 1, 8, flavour.states);
    c = run(4, c, w, h, 300, comp);
    const next = stepRule(4, comp, c, w, h);
    let changed = 0;
    for (let i = 0; i < c.length; i++) changed += +(c[i] !== next[i]);
    assert.ok(changed > w * h * 0.03, `${flavour.name}: ${changed} cells move`);
  });
});

test("Bosco's rule: the bug travels (0,−5) every 6 generations", () => {
  const w = 60,
    h = 60;
  const start = place(w, h, PATTERNS.bug, 25, 30);
  const end = ltlStep(run(5, start, w, h, 5), w, h);
  const a = shape(start, w),
    b = shape(end, w);
  assert.equal(b.key, a.key);
  assert.deepEqual([b.x0 - a.x0, b.y0 - a.y0], [0, -5]);
});

// Decode the shader's select-chain tables: they are the GPU seed data.
function shaderTables() {
  const src = life.simulation.fragment;
  const info = [...src.matchAll(/if \(id == (\d+)\) r = ivec4\((\d+),(\d+),(\d+),(\d+)\);/g)]
    .map((m) => m.slice(1).map(Number))
    .map(([id, w, h, offset, dir]) => ({ id, w, h, offset, dir }));
  const words = [];
  for (const m of src.matchAll(/if \(k == (\d+)\) w = (\d+)u;/g))
    words[Number(m[1])] = Number(m[2]);
  const eater = src.match(/EATER_INFO = ivec4\((\d+),(\d+),(\d+),(\d+)\)/).slice(1).map(Number);
  const ids = Object.fromEntries(
    [...src.matchAll(/const int P_(\w+) = (\d+);/g)].map((m) => [m[1], Number(m[2])]),
  );
  const bit = (k) => (words[k >> 5] >>> (k & 31)) & 1;
  return { info, words, eater, ids, bit };
}

test("GPU pattern words decode to exactly the CPU patterns", () => {
  const { info, eater, ids, bit } = shaderTables();
  assert.equal(info.length, PATTERN_ORDER.length);
  PATTERN_ORDER.forEach(([name, [dx, dy]], i) => {
    assert.equal(ids[name.toUpperCase()], i, `P_${name.toUpperCase()}`);
    const p = parsePattern(PATTERNS[name]);
    const t = info[i];
    assert.deepEqual([t.w, t.h, t.dir], [p.w, p.h, dx + 1 + 3 * (dy + 1)], name);
    for (let k = 0; k < p.w * p.h; k++)
      assert.equal(bit(t.offset + k), p.bits[k], `${name} bit ${k}`);
  });
  assert.deepEqual(eater.slice(0, 3), [
    4,
    4,
    info[PATTERN_ORDER.findIndex(([n]) => n === "eater")].offset,
  ]);
  assert.equal(ids.GUNEATER, PATTERN_ORDER.length);
  assert.deepEqual(packPatterns().words.length, Math.max(...info.map((t) => t.offset + t.w * t.h + 31)) >> 5);
});

test("GPU stamp addressing (gun plus eater companion) matches the CPU stamp", () => {
  const { info, eater, ids, bit } = shaderTables();
  const gun = info[ids.GOSPER];
  const [w, h] = [96, 54];
  for (let o = 0; o < 8; o++) {
    // Mirror of applyEvent's kind-1 branch for one copy at (x, y).
    const gpu = new Uint8Array(w * h);
    const [sw, sh] = orientedSize(...GUN_EATER.size, o);
    for (let dy = 0; dy < sh; dy++)
      for (let dx = 0; dx < sw; dx++) {
        const [u, v] = patternCoord(dx, dy, ...GUN_EATER.size, o);
        let k = -1;
        if (u < gun.w && v < gun.h) k = gun.offset + v * gun.w + u;
        const [u2, v2] = [u - GUN_EATER.at[0], v - GUN_EATER.at[1]];
        if (u2 >= 0 && v2 >= 0 && u2 < eater[0] && v2 < eater[1])
          k = eater[2] + v2 * eater[0] + u2;
        gpu[((5 + dy) % h) * w + ((7 + dx) % w)] = k >= 0 ? bit(k) : 0;
      }
    const cpu = place(w, h, gunEaterRows(), 7, 5, o);
    assert.deepEqual(gpu, cpu, `orientation ${o}`);
  }
});

test("boards are 16:9 and fit the state texture under the metadata rows", () => {
  for (const [w, h] of BOARDS) {
    assert.equal(w * 9, h * 16);
    assert.ok(w <= TEXTURE[0] && h + META_ROWS <= TEXTURE[1]);
  }
  assert.equal(TEXTURE[0] * TEXTURE[1] <= 512 * 288, true);
});

test("life: at least ten looks, every rule shown, every preset valid", () => {
  assert.equal(life.id, "life");
  assert.equal(life.number, 64);
  assert.ok(scenes.includes(life));
  assert.ok(life.presets.length >= 10);
  assert.equal(new Set(life.presets.map((p) => p.name)).size, life.presets.length);
  const keys = life.schema.map((d) => d.key);
  for (const preset of life.presets) {
    assert.deepEqual(Object.keys(preset.params).sort(), [...keys].sort());
    for (const d of life.schema) {
      const v = preset.params[d.key];
      assert.ok(v >= d.min && v <= d.max, `${preset.name}.${d.key}`);
      if (d.step === 1) assert.ok(Number.isInteger(v));
    }
  }
  for (const rule of life.type.values)
    assert.ok(
      life.presets.some((p) => p.params.rule === rule),
      `a look for rule ${rule}`,
    );
  for (let i = 0; i < life.presets.length; i++) {
    const snapshot = presetSnapshot(life, i);
    assert.deepEqual(validateSnapshot(snapshot, scenes), snapshot);
  }
  assert.ok(life.type.values.length >= 5);
  assert.ok(life.schema.length <= 8);
  assert.ok(life.simulation.steps <= 8);
});
