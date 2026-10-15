// Crystal Habit geometry. A seed fixes one periodic cavern (rock wall) and
// every crystal in it: root, growth axis, length, radius and birth order.
// Development and energy only move vertices in the shader (see growth()),
// so identity persists through every state and the buffer is built once.
//
// Vertex layout (18 floats): a_p vec3, a_n vec3, a_a vec4, a_b vec4, a_c vec4.
//   wall:    p = position, n = inward normal, a = (glow0, glow1, glow2, rnd),
//            b = (ao0, ao1, ao2, anchorZ), c = (theta, light.y, light.z, kind 0)
//            with a.w = light.x: the nearest seed light of the quad
//   mote:    p = (corner, 0), a = (base.xyz, rnd), b.w = anchor, c = (size, phase, 0, 5)
//   crystal: p = (hexX, hexY, h) unit prism coordinate (h = 2 marks the apex),
//            n = (u, v, face), a = (root.xyz, rnd), b = (dir.xyz, birth),
//            c = (length at Hall, radius at Hall, cluster hue, kind 1..4)
export const PERIOD = 36; // cavern repeats along z; the camera loops through it
export const STRIDE = 18;
export const ATTRIBUTES = [3, 3, 4, 4, 4];
export const KIND = { wall: 0, seed: 1, member: 2, hall: 3, grain: 4, mote: 5 };
export const MOTES = 520;
export const CORRIDOR = 0.62; // clearance kept around the camera path
export const LIFT = 0.22; // camera crane at Hall (development 2)
export const LIMITS = { habit: 1.6, breath: 1.04, tip: 1.9 };
const TAU = Math.PI * 2;
const QUAD = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
const WALL_THETA = 96,
  WALL_Z = 144;

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// Exact triangular-lattice Voronoi cell used by the wall material. The
// lattice is the union of rectangular cosets (i, sqrt(3)j) and
// (i+1/2, sqrt(3)(j+1/2)); the six bisectors bound one regular hexagon.
export function hexCell(x, y) {
  const h = Math.sqrt(3);
  const a = [x - Math.floor(x + .5), y - h * Math.floor(y / h + .5)];
  const b = [x - (Math.floor(x) + .5), y - h * (Math.floor(y / h) + .5)];
  const local = dot2(a, a) < dot2(b, b) ? a : b;
  const edge = .5 - Math.max(Math.abs(local[0]), Math.abs(.5 * local[0] + h / 2 * local[1]), Math.abs(-.5 * local[0] + h / 2 * local[1]));
  return { local, centre: [x-local[0], y-local[1]], edge };
}
const dot2 = (a, b) => a[0]*b[0] + a[1]*b[1];

// Shader mirror: growth factors [length, radius] of the Hall-sized crystal.
// Pure in (kind, birth, development, detail), hence continuous and reversible.
export function growth(kind, birth, development, detail = 0.5) {
  const dev = Math.min(2, Math.max(0, development));
  if (kind === KIND.seed) {
    const t = smooth(0, 2, dev);
    return [0.45 + 0.55 * t, 0.9 + 0.1 * t];
  }
  if (kind === KIND.member) {
    const g1 = smooth(0.08 + 0.62 * birth, 0.38 + 0.62 * birth, dev),
      g2 = smooth(1, 2, dev);
    return [
      g1 * (0.62 + 0.38 * g2),
      smooth(0, 0.25, g1) * (0.7 + 0.3 * g1) * (0.8 + 0.2 * g2),
    ];
  }
  if (kind === KIND.hall) {
    const g = smooth(1.02 + 0.6 * birth, 1.32 + 0.6 * birth, dev);
    return [g, smooth(0, 0.25, g) * (0.7 + 0.3 * g)];
  }
  const g = smooth(birth - 0.1, birth + 0.1, detail) * (0.55 + 0.45 * dev * 0.5);
  return [g, smooth(0, 0.25, g) * (0.7 + 0.3 * g)];
}

// Shader mirror: camera path in absolute cavern z (periodic in PERIOD).
export function cameraPath(z, development = 0) {
  const w = (TAU * z) / PERIOD;
  return [
    0.62 * Math.sin(w + 0.7) + 0.22 * Math.sin(3 * w + 2.1),
    -0.2 +
      0.16 * Math.sin(2 * w + 0.4) +
      0.07 * Math.sin(5 * w + 1.3) +
      LIFT * Math.min(2, Math.max(0, development)) * 0.5,
    z,
  ];
}

function rockOf(rand) {
  const terms = [];
  for (let i = 0; i < 9; i++)
    terms.push({
      m: 2 + Math.floor(rand() * 8),
      n: 1 + Math.floor(rand() * 14),
      a: (0.075 / Math.sqrt(1 + i * 0.6)) * (0.6 + 0.8 * rand()),
      p: rand() * TAU,
    });
  return {
    terms,
    b1: rand() * TAU,
    b2: rand() * TAU,
    f1: rand() * TAU,
    f2: rand() * TAU,
  };
}

// Wall point for polar angle theta (-PI/2 is the floor) at cavern depth z.
export function wallPoint(rock, theta, z) {
  const w = (TAU * z) / PERIOD;
  const breathe = 1 + 0.15 * Math.sin(2 * w + rock.b1) + 0.06 * Math.sin(5 * w + rock.b2);
  let r = 1;
  for (const k of rock.terms) r += k.a * Math.sin(k.m * theta + k.n * w + k.p);
  const x = 3.1 * breathe * Math.cos(theta) * r;
  let y = 2.25 * (0.55 + 0.45 * breathe) * Math.sin(theta) * r;
  // A nearly flat floor with low relief keeps the horizon readable.
  const floor = -1.5 + 0.05 * Math.sin(3 * w + rock.f1 + theta * 4) + 0.04 * Math.sin(7 * w + rock.f2);
  const k = 0.45,
    h = Math.max(k - Math.abs(y - floor), 0) / k;
  y = Math.max(y, floor) + h * h * k * 0.25;
  return [x, y, z];
}

export function wallNormal(rock, theta, z) {
  const e = 1e-3;
  const dt = sub(wallPoint(rock, theta + e, z), wallPoint(rock, theta - e, z)),
    dz = sub(wallPoint(rock, theta, z + e), wallPoint(rock, theta, z - e));
  let n = norm(cross(dt, dz));
  const p = wallPoint(rock, theta, z);
  if (n[0] * p[0] + n[1] * (p[1] + 0.2) > 0) n = n.map((v) => -v);
  return n;
}

// Distance from p to the camera corridor (path at every crane lift), from a
// tabulated path; a bounding box rejects points far from the corridor.
const STEP = 0.05,
  SAMPLES = Math.round(PERIOD / STEP),
  TABLE = Array.from({ length: SAMPLES }, (_, k) => cameraPath(k * STEP, 0));
function corridorDistance(p) {
  const margin = CORRIDOR + 0.6;
  if (Math.abs(p[0]) > 0.84 + margin || p[1] < -0.43 - margin || p[1] > 0.03 + LIFT + margin)
    return margin;
  let best = Infinity;
  const base = Math.round(p[2] / STEP);
  for (let o = -60; o <= 60; o++) {
    const c = TABLE[(((base + o) % SAMPLES) + SAMPLES) % SAMPLES],
      dz = (base + o) * STEP - p[2],
      dx = p[0] - c[0],
      dy = p[1] - c[1],
      ey = dy - Math.min(LIFT, Math.max(0, dy)),
      d = dx * dx + ey * ey + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Longest axis length (shaft plus pyramidal tip, at maximum habit, breath and
// tip ratio) that keeps the whole prism outside the camera corridor.
function clampLength(root, dir, length, radius) {
  const widest = radius * LIMITS.habit,
    tip = widest * LIMITS.tip;
  for (let s = 0; s <= 1.0001; s += 0.04) {
    const reach = (length * LIMITS.breath + tip) * s;
    if (corridorDistance(add(root, dir, reach)) < CORRIDOR + widest)
      return Math.max(0, (reach - tip) / LIMITS.breath - 0.02) * 0.97;
  }
  return length;
}

function tangentPoint(rock, theta, z, angle, distance) {
  const p = wallPoint(rock, theta, z),
    radius = Math.hypot(p[0], p[1]) || 1;
  return [theta + (Math.sin(angle) * distance) / radius, z + Math.cos(angle) * distance];
}

function towardWall(dir, normal, minimum = 0.3) {
  for (let i = 0; i < 4; i++) {
    const d = dot(dir, normal);
    if (d >= minimum) break;
    dir = norm(add(dir, normal, minimum - d + 0.05));
  }
  return dir;
}

function jitter(rand, dir, amount) {
  return norm([
    dir[0] + (rand() - 0.5) * 2 * amount,
    dir[1] + (rand() - 0.5) * 2 * amount,
    dir[2] + (rand() - 0.5) * 2 * amount,
  ]);
}

export function cavern(seed) {
  const rand = random(seed >>> 0 || 1);
  // Hues come from a separate stream so the layout of every seed is unchanged.
  const hueRand = random(((seed >>> 0) ^ 0x51ed27) || 1);
  let hue = 0;
  const rock = rockOf(rand);
  const crystals = [],
    clusters = [];
  const push = (c) => {
    c.length = clampLength(c.root, c.dir, c.length, c.radius);
    if (c.length > 0.02) crystals.push({ hue, ...c, id: crystals.length });
  };
  const site = (theta, z) => ({
    theta,
    z: ((z % PERIOD) + PERIOD) % PERIOD,
    root: wallPoint(rock, theta, ((z % PERIOD) + PERIOD) % PERIOD),
    normal: wallNormal(rock, theta, ((z % PERIOD) + PERIOD) % PERIOD),
  });
  // Nucleation sites: stratified along the cavern, all around its section.
  const NC = 56;
  for (let i = 0; i < NC; i++) {
    const theta = -Math.PI / 2 + (rand() - 0.5) * TAU * (rand() < 0.35 ? 0.35 : 1),
      { root, normal, z } = site(theta, ((i + rand()) * PERIOD) / NC);
    const axis = jitter(rand, normal, 0.22);
    const helper = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0],
      e1 = norm(cross(helper, axis)),
      e2 = cross(axis, e1);
    const cone = 0.38 + rand() * 0.3,
      turn = rand() * TAU,
      habits = [axis];
    for (let k = 0; k < 3; k++) {
      const a = turn + (k * TAU) / 3;
      habits.push(
        norm(add(add([0, 0, 0], axis, Math.cos(cone)), add(e1.map((v) => v * Math.cos(a)), e2, Math.sin(a)), Math.sin(cone))),
      );
    }
    const scale = 0.55 + 0.5 * rand();
    hue = hueRand();
    clusters.push({ theta, z, root, axis, habits, scale, hue });
    push({
      kind: KIND.seed,
      root,
      dir: axis,
      length: scale * (1.25 + 0.75 * rand()),
      radius: scale * (0.1 + 0.04 * rand()),
      birth: 0,
      rnd: rand(),
    });
    const members = 18 + Math.floor(rand() * 16),
      spread = 0.3 + 0.35 * scale;
    for (let m = 0; m < members; m++) {
      const angle = rand() * TAU,
        distance = spread * Math.sqrt(0.04 + 0.96 * rand());
      const [t2, z2] = tangentPoint(rock, theta, z, angle, distance),
        s = site(t2, z2);
      const out = norm(sub(s.root, root));
      let best = 0;
      if (rand() < 0.85)
        habits.forEach((h, k) => {
          if (dot(h, out) > dot(habits[best], out)) best = k;
        });
      else best = Math.floor(rand() * habits.length);
      const dir = towardWall(jitter(rand, habits[best], 0.05), s.normal),
        near = 1 - 0.5 * (distance / spread),
        length = scale * (0.25 + 1.0 * Math.pow(rand(), 2.4)) * near,
        needle = rand() < 0.16;
      push({
        kind: KIND.member,
        root: s.root,
        dir,
        length,
        radius: length * (needle ? 0.05 : 0.1 + 0.07 * rand()),
        birth: Math.min(1, 0.72 * (distance / spread) + 0.28 * rand()),
        rnd: rand(),
      });
    }
  }
  // Hall: micro-druses that only open towards the top state, lining the walls.
  for (let i = 0; i < 120; i++) {
    const theta = rand() * TAU,
      base = site(theta, rand() * PERIOD),
      axis = jitter(rand, base.normal, 0.3),
      birth = rand(),
      scale = 0.35 + 0.55 * rand();
    hue = hueRand();
    for (let m = 0; m < 7; m++) {
      const [t2, z2] = tangentPoint(rock, theta, base.z, rand() * TAU, 0.32 * Math.sqrt(rand())),
        s = site(t2, z2),
        length = scale * (0.35 + 0.9 * Math.pow(rand(), 1.8));
      push({
        kind: KIND.hall,
        root: s.root,
        dir: towardWall(jitter(rand, axis, 0.28), s.normal),
        length,
        radius: length * (0.11 + 0.06 * rand()),
        birth: Math.min(1, birth * 0.85 + 0.15 * rand()),
        rnd: rand(),
      });
    }
  }
  // Grains: tiny crystals revealed by the detail control (energy).
  for (let i = 0; i < 360; i++) {
    hue = hueRand();
    const s = site(rand() * TAU, rand() * PERIOD),
      length = 0.05 + 0.12 * Math.pow(rand(), 2);
    push({
      kind: KIND.grain,
      root: s.root,
      dir: towardWall(jitter(rand, s.normal, 0.45), s.normal),
      length,
      radius: length * (0.14 + 0.08 * rand()),
      birth: rand(),
      rnd: rand(),
    });
  }
  return { rock, clusters, crystals };
}

// Wall glow and contact occlusion for the three integer states, baked once.
function bake(crystals, points) {
  const BINS = 36,
    bins = Array.from({ length: BINS }, () => []);
  const bin = (z) => Math.floor((((z % PERIOD) + PERIOD) % PERIOD) / (PERIOD / BINS)) % BINS;
  const n = crystals.length,
    root = new Float64Array(n * 3),
    stage = new Float64Array(n * 3 * 7), // per stage: light xyz, 1/reach², glow, ao depth, 1/spread²
    cutoff = new Float64Array(n);
  crystals.forEach((c, i) => {
    if (c.kind !== KIND.grain) bins[bin(c.root[2])].push(i);
    root.set(c.root, i * 3);
    for (let s = 0; s < 3; s++) {
      const [lf, rf] = growth(c.kind, c.birth, s),
        length = c.length * lf,
        radius = c.radius * rf,
        reach = (c.kind === KIND.seed ? 0.55 : 0.25) + length * 0.6,
        spread = radius * 2.4 + 0.04,
        k = (i * 3 + s) * 7;
      stage[k] = c.root[0] + c.dir[0] * length * 0.55;
      stage[k + 1] = c.root[1] + c.dir[1] * length * 0.55;
      stage[k + 2] = c.root[2] + c.dir[2] * length * 0.55;
      stage[k + 3] = length > 0.001 ? 1 / (reach * reach) : 0;
      stage[k + 4] = length > 0.001 ? (c.kind === KIND.seed ? 1.1 : 0.05) + length * radius * 2.5 : 0;
      stage[k + 5] = length > 0.001 ? 0.55 * Math.min(1, length * 4) : 0;
      stage[k + 6] = 1 / (spread * spread);
      // Beyond this root distance both terms are below about 1e-3.
      cutoff[i] = Math.max(cutoff[i], (length * 0.55 + reach * 2.7) ** 2, (spread * 2.7) ** 2);
    }
  });
  return points.map((p) => {
    const glow = [0, 0, 0],
      ao = [1, 1, 1],
      centre = bin(p[2]);
    for (let o = -3; o <= 3; o++)
      for (const i of bins[(centre + o + BINS) % BINS]) {
        let dz = p[2] - root[i * 3 + 2];
        dz -= Math.round(dz / PERIOD) * PERIOD;
        const rx = root[i * 3] - p[0],
          ry = root[i * 3 + 1] - p[1],
          r2 = rx * rx + ry * ry + dz * dz;
        if (r2 > cutoff[i]) continue;
        const shift = dz - (p[2] - root[i * 3 + 2]);
        for (let s = 0; s < 3; s++) {
          const k = (i * 3 + s) * 7;
          if (stage[k + 4] === 0) continue;
          const lx = stage[k] - p[0],
            ly = stage[k + 1] - p[1],
            lz = p[2] + shift - stage[k + 2],
            d2 = lx * lx + ly * ly + lz * lz;
          glow[s] += stage[k + 4] * Math.exp(-d2 * stage[k + 3]);
          ao[s] *= 1 - stage[k + 5] * Math.exp(-r2 * stage[k + 6]);
        }
      }
    return { glow, ao };
  });
}

// The last buffer is reused when another slot loads the same seed.
let cache = null;
export function createGeometry(seed) {
  if (cache?.seed === seed) return cache.data;
  const data = build(seed);
  cache = { seed, data };
  return data;
}

function build(seed) {
  const { rock, crystals } = cavern(seed);
  const wallVertices = WALL_THETA * WALL_Z * 6,
    crystalVertices = crystals.length * 54;
  const data = new Float32Array((wallVertices + crystalVertices + MOTES * 6) * STRIDE);
  let o = 0;
  // Crystals first, so the wall behind them is rejected by the depth test.
  const hex = Array.from({ length: 7 }, (_, k) => [
    Math.cos((k * Math.PI) / 3),
    Math.sin((k * Math.PI) / 3),
  ]);
  const local = [];
  for (let k = 0; k < 6; k++) {
    const [a, b] = [hex[k], hex[k + 1]];
    local.push(
      [a[0], a[1], -0.15, 0, 0, k],
      [b[0], b[1], -0.15, 1, 0, k],
      [b[0], b[1], 1, 1, 1, k],
      [a[0], a[1], -0.15, 0, 0, k],
      [b[0], b[1], 1, 1, 1, k],
      [a[0], a[1], 1, 0, 1, k],
      [a[0], a[1], 1, 0, 0, k + 6],
      [b[0], b[1], 1, 1, 0, k + 6],
      [0, 0, 2, 0.5, 1, k + 6],
    );
  }
  const instance = new Float32Array(12);
  for (const c of crystals) {
    instance.set([...c.root, c.rnd, ...c.dir, c.birth, c.length, c.radius, c.hue, c.kind]);
    for (const v of local) {
      data.set(v, o);
      data.set(instance, o + 6);
      o += STRIDE;
    }
  }
  // Wall grid: rings along z, wrapped per quad by its starting ring.
  const at = (i, j) => j * (WALL_THETA + 1) + i;
  const grid = [];
  for (let j = 0; j <= WALL_Z; j++)
    for (let i = 0; i <= WALL_THETA; i++) {
      const theta = -Math.PI / 2 + (i / WALL_THETA) * TAU,
        z = (j / WALL_Z) * PERIOD;
      grid.push({ p: wallPoint(rock, theta, z), theta });
    }
  // Normals from periodic central differences of the grid itself.
  for (let j = 0; j <= WALL_Z; j++)
    for (let i = 0; i <= WALL_THETA; i++) {
      const ip = (i + 1) % WALL_THETA,
        im = (i + WALL_THETA - 1) % WALL_THETA,
        jp = j + 1 > WALL_Z ? 1 : j + 1,
        jm = j - 1 < 0 ? WALL_Z - 1 : j - 1;
      const dt = sub(grid[at(ip, j)].p, grid[at(im, j)].p),
        dz = sub(grid[at(i, jp)].p, grid[at(i, jm)].p);
      dz[2] = (2 * PERIOD) / WALL_Z;
      let n = norm(cross(dt, dz));
      const p = grid[at(i, j)].p;
      if (n[0] * p[0] + n[1] * (p[1] + 0.2) > 0) n = n.map((v) => -v);
      grid[at(i, j)].n = n;
    }
  // Glow pools are smooth: bake every second ring/column and interpolate.
  const coarse = [];
  for (let j = 0; j <= WALL_Z; j += 2)
    for (let i = 0; i <= WALL_THETA; i += 2) coarse.push(grid[at(i, j)].p);
  const coarseBaked = bake(crystals, coarse),
    cw = WALL_THETA / 2 + 1;
  const baked = grid.map((_, k) => {
    const i = k % (WALL_THETA + 1),
      j = Math.floor(k / (WALL_THETA + 1)),
      i0 = i >> 1,
      j0 = j >> 1,
      i1 = Math.min(i0 + (i & 1), cw - 1),
      j1 = Math.min(j0 + (j & 1), WALL_Z / 2);
    const corners = [
      coarseBaked[j0 * cw + i0],
      coarseBaked[j0 * cw + i1],
      coarseBaked[j1 * cw + i0],
      coarseBaked[j1 * cw + i1],
    ];
    const mean = (key, c) => corners.reduce((a, b) => a + b[key][c], 0) / 4;
    return {
      glow: [0, 1, 2].map((c) => mean("glow", c)),
      ao: [0, 1, 2].map((c) => mean("ao", c)),
    };
  });
  const rand = random((seed ^ 0x9e3779b9) >>> 0);
  // Each wall quad knows its nearest seed light, so the shader can draw a
  // crisp point-light pool around every seed.
  const lights = crystals
    .filter((c) => c.kind === KIND.seed)
    .map((c) => add(c.root, c.dir, 0.15));
  const nearest = (p) => {
    let best = lights[0],
      bestD = Infinity;
    for (const l of lights) {
      let dz = p[2] - l[2];
      dz -= Math.round(dz / PERIOD) * PERIOD;
      const d = (p[0] - l[0]) ** 2 + (p[1] - l[1]) ** 2 + dz * dz;
      if (d < bestD) (bestD = d), (best = l);
    }
    return best;
  };
  const record = new Float32Array(grid.length * STRIDE);
  grid.forEach((g, k) => {
    const b = baked[k];
    record.set([...g.p, ...g.n, ...b.glow, 0, ...b.ao, 0, g.theta, 0, 0, KIND.wall], k * STRIDE);
  });
  for (let j = 0; j < WALL_Z; j++) {
    const anchor = (j / WALL_Z) * PERIOD;
    for (let i = 0; i < WALL_THETA; i++) {
      const centre = mul4(grid, [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)]),
        light = nearest(centre);
      for (const [di, dj] of QUAD) {
        const k = at(i + di, j + dj);
        data.set(record.subarray(k * STRIDE, k * STRIDE + STRIDE), o);
        data[o + 9] = light[0];
        data[o + 13] = anchor;
        data[o + 15] = light[1];
        data[o + 16] = light[2];
        o += STRIDE;
      }
    }
  }
  // Motes: tiny drifting specks inside the hall, drawn as camera-facing quads.
  for (let m = 0; m < MOTES; m++) {
    const z = rand() * PERIOD,
      w = wallPoint(rock, rand() * TAU, z),
      f = 0.2 + 0.65 * rand(),
      base = [w[0] * f, -0.2 + (w[1] + 0.2) * f, z],
      rnd = rand(),
      size = 0.008 + 0.014 * rand() * rand(),
      phase = rand();
    for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
      data.set([cx, cy, 0, 0, 0, 0, ...base, rnd, 0, 0, 0, z, size, phase, 0, KIND.mote], o);
      o += STRIDE;
    }
  }
  return data;
}
const mul4 = (grid, ks) => {
  const s = [0, 0, 0];
  for (const k of ks) for (let c = 0; c < 3; c++) s[c] += grid[k].p[c] / ks.length;
  return s;
};
