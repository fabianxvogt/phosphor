// Bioluminescent Abyss geometry and CPU mirrors of the shader's placement.
//
// Everything that moves in the water (jellyfish, swarms, siphonophore chains,
// light shafts, plankton) is placed by a seeded integer hash that the shaders
// evaluate identically (dRnd below), so the simulation pass can find the
// jellies without reading the mesh. The reef is seeded on the CPU and baked
// into the buffer. Development and energy only move vertices in the shader:
// identity (anchors, sizes, birth order) is fixed by the seed.
//
// Vertex layout (16 floats): a_k vec4, a_l vec4, a_r vec4, a_s vec4.
//   a_k = (kind, id or anchor z, rnd, birth)
//   a_l = local coordinates (meaning per kind)
//   a_r = reef root (x, y, z, height) or floor position + glow weight
//   a_s = reef extras (radius / half angle, yaw, width, -) or floor normal + mean birth
export const PERIOD = 64; // the water repeats along z; the camera loops through it
export const BACK = 4; // objects are wrapped into [camera - BACK, camera - BACK + PERIOD)
export const SPEED = 0.34; // glide speed (units per second at current 1)
export const FLOOR = -3.2;
export const STRIDE = 16;
export const ATTRIBUTES = [4, 4, 4, 4];
export const KIND = {
  floor: 0,
  tube: 1,
  crown: 2,
  pen: 3,
  fan: 4,
  shaft: 5,
  chain: 6,
  bead: 7,
  tentacle: 8,
  arm: 9,
  bell: 10,
};
// Counts. The opaque part (floor and reef) has a seed-independent vertex
// count, so the engine can switch to additive blending at OPAQUE_VERTICES.
export const NJ = 40; // large medusae (the first five are the lone jellies of Sparks)
export const NS = 144; // swarm medusae in NG groups
export const NG = 6;
export const NCH = 6; // siphonophore chains
export const NSH = 20; // light shafts
export const NP = 150; // reef patches
export const TUBES = 6; // tube worms per patch
export const PENS = 2; // sea pens per patch
export const CROWN_PETALS = 8;
export const PEN_LEAVES = 12;
export const FAN_SIDES = 5;
export const FAN_BRANCHES = 31;
export const FLOOR_GRID = [72, 128];
export const FLOOR_HALF = 24;
export const BELL = { big: [10, 24], small: [6, 12] }; // rings, segments
export const TENTACLES = { big: [12, 18], small: [6, 8] }; // count, segments
export const ARMS = [4, 12];
export const CHAIN_SEGMENTS = 40;
export const BEADS = 32;
export const SHAFT_SEGMENTS = 6;
// Fixed drift amplitudes of jellies (x, y, z); tests use them for clearance.
export const DRIFT = [0.45, 0.3, 0.7];
export const CAMERA_FLOOR_CLEARANCE = 0.5;

const TAU = Math.PI * 2;
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Shader mirror: lowbias32 integer hash and the seeded draw dRnd(id, k).
export function hash32(x) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}
export function rnd(seed, id, k) {
  const key = hash32((seed + 0x2545f491) >>> 0);
  const v = hash32((Math.imul(id, 0x9e3779b9) ^ hash32((k + key) >>> 0)) >>> 0);
  return (v >>> 8) / 16777216;
}

// Shader mirror: camera path in absolute water z (periodic in PERIOD).
export function cameraPath(z, development = 0) {
  const w = (TAU * z) / PERIOD;
  const dev = Math.min(2, Math.max(0, development));
  return [
    1.1 * Math.sin(w + 0.4) + 0.35 * Math.sin(3 * w + 1.7),
    0.35 -
      0.25 * smooth(1, 2, dev) +
      0.2 * Math.sin(2 * w + 0.9) +
      0.06 * Math.sin(5 * w + 2.3),
    z,
  ];
}

// Shader mirror: seabed height, periodic in z.
export function floorY(x, z) {
  const w = (TAU * z) / PERIOD;
  return (
    FLOOR +
    0.16 * Math.sin(0.45 * x + 3 * w + 1.3) +
    0.1 * Math.sin(0.9 * x - 5 * w + 0.4) +
    0.06 * Math.sin(1.7 * x + 9 * w + 2.2)
  );
}

// Shader mirror: anchor, bell radius and birth of medusa i (0..NJ+NS-1).
export function jelly(seed, i) {
  if (i < NJ) {
    const h = (k) => rnd(seed, i, k);
    const lone = i < 5;
    const z = lone
      ? ((hash32(seed) / 4294967296) * PERIOD + [9, 11.5, 19.5, 38, 52][i]) %
        PERIOD
      : ((((i * 0.618034 + 0.37 + 0.05 * h(1)) % 1) + 1) % 1) * PERIOD;
    const R = lone ? 1.25 + 0.2 * h(5) : 0.3 + 0.45 * h(5) * h(5);
    const side = lone
      ? (rnd(seed, 0, 2) < 0.5 ? -1 : 1) * (i % 2 === 0 ? 1 : -1)
      : h(2) < 0.5
        ? -1
        : 1;
    const gap = 1.9 + R + (lone ? 0.55 + 1.2 * h(3) : 4.5 * h(3) ** 1.5);
    const y = lone ? 0.6 + 0.9 * h(4) : -1.3 + 4 * h(4);
    return {
      anchor: [cameraPath(z).at(0) + side * gap, y, z],
      R,
      birth: lone ? -1 : 0.3 + 0.65 * h(6),
      swarm: false,
      tentacle: R * (lone ? 2.4 + 1.4 * h(7) : 3.2 + 3 * h(7)),
    };
  }
  const j = i - NJ,
    g = Math.floor(j / (NS / NG));
  const group = swarmGroup(seed, g);
  const h = (k) => rnd(seed, i, k);
  const u = 2 * h(1) - 1,
    a = TAU * h(2),
    s = Math.sqrt(1 - u * u),
    r = group.radius * Math.cbrt(h(3));
  const offset = [s * Math.cos(a) * r, u * r * 0.6, s * Math.sin(a) * r * 1.3];
  const R = 0.08 + 0.12 * h(5) * h(5);
  return {
    anchor: group.centre.map((v, k) => v + offset[k]),
    R,
    birth: 0.8 + 1.1 * h(6),
    swarm: true,
    tentacle: R * (3.2 + 3 * h(7)),
  };
}
export function swarmGroup(seed, g) {
  const h = (k) => rnd(seed, 1000 + g, k);
  const z = ((((g * 0.618034 + 0.11) % 1) + 1) % 1) * PERIOD;
  const radius = 1.2 + 0.8 * h(3);
  const side = h(1) < 0.5 ? -1 : 1;
  const gap = 2.1 + radius + 4.5 * h(2);
  return {
    centre: [cameraPath(z).at(0) + side * gap, -1.3 + 3 * h(4), z],
    radius,
  };
}
// Shader mirror: siphonophore chain k (anchor, unit direction, length).
export function chain(seed, k) {
  const h = (n) => rnd(seed, 2000 + k, n);
  const z = ((((k * 0.618034 + 0.77) % 1) + 1) % 1) * PERIOD;
  const side = h(1) < 0.5 ? -1 : 1;
  const gap = 3.6 + 5 * h(2);
  const d = [0.35 * (h(3) - 0.5), 0.15 * (h(4) - 0.5), 1];
  const l = Math.hypot(...d);
  return {
    anchor: [cameraPath(z).at(0) + side * gap, -0.9 + 2.8 * h(5), z],
    dir: d.map((v) => v / l),
    length: 6 + 4 * h(6),
    birth: 0.6 + 0.3 * h(7),
  };
}

// Reef growth of an item born at `birth` (0..1): pure, continuous, monotone.
export function reefGrowth(birth, development) {
  const b = Math.min(1, Math.max(0, birth));
  return smooth(0.8 + 0.85 * b, 1.15 + 0.85 * b, development);
}
// Shader mirror (dSettle): at Reef, medusae and swarm centres settle into a
// lower, flatter band above the reef so the tilted camera keeps near animals
// in frame. Identity below development 1.2; continuous and reversible.
export function settleY(y, development) {
  return y + (-0.25 + 0.35 * (y - 0.8) - y) * smooth(1.2, 2, development);
}
// Reveal of a medusa (light-up and scale) with the swarm-density boost.
export function jellyReveal(j, development, swarm = 0.5) {
  if (!j.swarm)
    return j.birth < 0
      ? 1
      : smooth(j.birth - 0.25, j.birth + 0.05, development);
  const boost =
    Math.min(0.5, Math.max(-0.5, swarm - 0.5)) *
    0.5 *
    smooth(0.7, 1.3, development);
  return smooth(j.birth - 0.12, j.birth + 0.05, development + boost);
}

// A real tapered skeleton, not a branching mask on a sector. Local y <= 1.
export function fanBranches(rnd) {
  const rand = random(Math.floor(rnd * 4294967295) >>> 0);
  const branches = [];
  const grow = (start, angle, depth) => {
    const length = (0.245 - depth * 0.032) * (0.82 + rand() * 0.3);
    const end = [
      start[0] + Math.sin(angle) * length,
      start[1] + Math.cos(angle) * length,
      start[2] + (rand() - 0.5) * length * 0.9,
    ];
    branches.push({ start, end, radius: 0.034 * 0.78 ** depth, depth });
    if (depth < 4) {
      grow(end, angle - 0.22 - rand() * 0.4, depth + 1);
      grow(end, angle + 0.22 + rand() * 0.4, depth + 1);
    }
  };
  grow([0, 0, 0], (rand() - 0.5) * 0.35, 0);
  const bound = Math.max(...branches.map((b) => b.end[1] + b.radius));
  if (bound > 0.95)
    for (const branch of branches) {
      branch.start = branch.start.map((v) => (v * 0.95) / bound);
      branch.end = branch.end.map((v) => (v * 0.95) / bound);
      branch.radius *= 0.95 / bound;
    }
  return branches;
}

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Seeded reef: patches on the seabed with tube worms, sea pens and one fan.
export function reef(seed) {
  const rand = random((seed ^ 0x5bd1e995) >>> 0 || 1);
  const patches = [];
  for (let p = 0; p < NP; p++) {
    const z = ((p + rand()) * PERIOD) / NP;
    const sign = rand() < 0.5 ? -1 : 1;
    const x = sign * 14 * Math.pow(rand(), 0.9);
    patches.push({
      x,
      z,
      radius: 0.8 + 1.0 * rand(),
      birth: rand(),
      scale: 0.75 + 0.35 * rand(),
    });
  }
  const items = [];
  const place = (patch, spread) => {
    const a = rand() * TAU,
      r = patch.radius * spread * Math.sqrt(rand());
    const x = patch.x + Math.cos(a) * r,
      z = (((patch.z + Math.sin(a) * r) % PERIOD) + PERIOD) % PERIOD;
    return [x, floorY(x, z) - 0.03, z];
  };
  for (const patch of patches) {
    const birth = () => Math.min(1, patch.birth + 0.15 * rand());
    for (let t = 0; t < TUBES; t++)
      items.push({
        kind: KIND.tube,
        root: place(patch, 0.6),
        height: patch.scale * (0.35 + 0.9 * Math.pow(rand(), 1.5)),
        radius: 0.028 + 0.035 * rand(),
        yaw: rand() * TAU,
        width: 0,
        rnd: rand(),
        birth: birth(),
      });
    for (let s = 0; s < PENS; s++)
      items.push({
        kind: KIND.pen,
        root: place(patch, 1),
        height: patch.scale * (0.8 + 0.9 * rand()),
        radius: 0.012,
        yaw: rand() * TAU,
        width: 0.16 + 0.14 * rand(),
        rnd: rand(),
        birth: birth(),
      });
    items.push({
      kind: KIND.fan,
      root: place(patch, 0.8),
      height: patch.scale * (1.0 + 0.9 * rand()),
      radius: 0.65 + 0.3 * rand(), // half opening angle
      yaw: rand() * Math.PI,
      width: 0,
      rnd: rand(),
      birth: birth(),
    });
  }
  return { patches, items };
}
// Bound on the height above its root that any reef vertex reaches.
export const REEF_TOP = 2.15;

// The last buffer is reused when another slot loads the same seed.
let cache = null;
export function createGeometry(seed) {
  if (cache?.seed === seed) return cache.data;
  const data = build(seed);
  cache = { seed, data };
  return data;
}

const QUAD = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
  [1, 1],
  [0, 1],
];

export function vertexCounts() {
  const tube = 5 * 2 * 6,
    crown = CROWN_PETALS * 4 * 6,
    pen = 4 * 6 + PEN_LEAVES * 2 * 2 * 6,
    floor = FLOOR_GRID[0] * FLOOR_GRID[1] * 6,
    fan = FAN_BRANCHES * FAN_SIDES * 6;
  const opaque = NP * (TUBES * (tube + crown) + PENS * pen + fan) + floor;
  const bigJelly =
    BELL.big[0] * BELL.big[1] * 6 +
    TENTACLES.big[0] * TENTACLES.big[1] * 6 +
    ARMS[0] * ARMS[1] * 6;
  const smallJelly =
    BELL.small[0] * BELL.small[1] * 6 +
    TENTACLES.small[0] * TENTACLES.small[1] * 6;
  const additive =
    NSH * SHAFT_SEGMENTS * 6 +
    NCH * (CHAIN_SEGMENTS * 6 + BEADS * 6) +
    NJ * bigJelly +
    NS * smallJelly;
  return { opaque, additive, total: opaque + additive };
}
export const OPAQUE_VERTICES = vertexCounts().opaque;

function build(seed) {
  const counts = vertexCounts();
  const data = new Float32Array(counts.total * STRIDE);
  let o = 0;
  const v = (k, l, r = [0, 0, 0, 0], s = [0, 0, 0, 0]) => {
    data.set(k, o);
    data.set(l, o + 4);
    data.set(r, o + 8);
    data.set(s, o + 12);
    o += STRIDE;
  };
  const strip = (k, segments, local, r, s) => {
    for (let j = 0; j < segments; j++)
      for (const [a, b] of QUAD) v(k, local(j + b, a * 2 - 1), r, s);
  };
  const { patches, items } = reef(seed);
  // Opaque reef first (tall items occlude the floor early), then the floor.
  for (const it of items) {
    const k = [it.kind, 0, it.rnd, it.birth],
      r = [...it.root, it.height],
      s = [it.radius, it.yaw, it.width, 0];
    if (it.kind === KIND.fan) {
      for (const [index, branch] of fanBranches(it.rnd).entries()) {
        const delta = branch.end.map((v, i) => v - branch.start[i]);
        const length = Math.hypot(...delta);
        const axis = delta.map((v) => v / length);
        const norm = Math.hypot(axis[0], axis[1]);
        const right = [axis[1] / norm, -axis[0] / norm, 0];
        const back = [
          -axis[2] * right[1],
          axis[2] * right[0],
          axis[0] * right[1] - axis[1] * right[0],
        ];
        for (let side = 0; side < FAN_SIDES; side++)
          for (const [a, b] of QUAD) {
            const phi = ((side + a) / FAN_SIDES) * TAU;
            const normal = right.map(
              (v, i) => v * Math.cos(phi) + back[i] * Math.sin(phi),
            );
            const radius = branch.radius * (1 - b * 0.32);
            const point = branch.start.map(
              (v, i) => v + delta[i] * b + normal[i] * radius,
            );
            v([KIND.fan, index, it.rnd, it.birth], [...point, b], r, [
              normal[0],
              it.yaw,
              normal[1],
              normal[2],
            ]);
          }
      }
    } else if (it.kind === KIND.tube) {
      for (let j = 0; j < 2; j++)
        for (let a = 0; a < 5; a++)
          for (const [di, dj] of QUAD) v(k, [a + di, (j + dj) / 2, 0, 0], r, s);
      const ck = [KIND.crown, 0, it.rnd, it.birth];
      for (let p = 0; p < CROWN_PETALS; p++)
        strip(ck, 4, (j, side) => [p, j / 4, side, 0], r, s);
    } else {
      for (let j = 0; j < 4; j++)
        for (const [a, b] of QUAD) v(k, [0, (j + b) / 4, a * 2 - 1, 0], r, s);
      for (let leaf = 0; leaf < PEN_LEAVES; leaf++)
        for (const side of [-1, 1])
          for (let u = 0; u < 2; u++)
            for (let w = 0; w < 1; w++)
              for (const [a, b] of QUAD)
                v(k, [1 + (u + a) * 0.5, leaf, side, w + b], r, s);
    }
  }
  // Seabed grid with baked reef-glow weight and mean patch birth.
  const [GX, GZ] = FLOOR_GRID;
  const grid = [];
  for (let j = 0; j <= GZ; j++)
    for (let i = 0; i <= GX; i++) {
      const x = -FLOOR_HALF + (2 * FLOOR_HALF * i) / GX,
        z = (j / GZ) * PERIOD,
        e = 0.01;
      const y = floorY(x, z);
      const dx = (floorY(x + e, z) - floorY(x - e, z)) / (2 * e),
        dz = (floorY(x, z + e) - floorY(x, z - e)) / (2 * e);
      const l = Math.hypot(dx, 1, dz);
      let w = 0,
        wb = 0;
      for (const p of patches) {
        let d = z - p.z;
        d -= Math.round(d / PERIOD) * PERIOD;
        const r2 = (x - p.x) ** 2 + d * d,
          q = p.radius * 1.9,
          g = p.scale * Math.exp(-r2 / (q * q));
        w += g;
        wb += g * p.birth;
      }
      grid.push([
        x,
        y,
        z,
        Math.min(1.5, w),
        -dx / l,
        1 / l,
        -dz / l,
        w > 1e-4 ? wb / w : 1,
      ]);
    }
  const rand = random((seed ^ 0x9e3779b9) >>> 0);
  for (let j = 0; j < GZ; j++) {
    const anchor = (j / GZ) * PERIOD;
    for (let i = 0; i < GX; i++) {
      const rn = rand();
      for (const [di, dj] of QUAD) {
        const g = grid[(j + dj) * (GX + 1) + i + di];
        // The last ring repeats the first one a whole period further on.
        v(
          [KIND.floor, anchor, rn, 0],
          [0, 0, 0, 0],
          g.slice(0, 4),
          g.slice(4, 8),
        );
      }
    }
  }
  if (o !== counts.opaque * STRIDE) throw new Error("abyss: opaque count");
  // Additive: shafts, siphonophores, then the medusae.
  for (let n = 0; n < NSH; n++)
    strip([KIND.shaft, n, 0, 0], SHAFT_SEGMENTS, (j, side) => [
      j / SHAFT_SEGMENTS,
      side,
      0,
      0,
    ]);
  for (let c = 0; c < NCH; c++) {
    strip([KIND.chain, c, 0, 0], CHAIN_SEGMENTS, (j, side) => [
      j / CHAIN_SEGMENTS,
      side,
      0,
      0,
    ]);
    for (let b = 0; b < BEADS; b++)
      for (const [a, d] of QUAD)
        v([KIND.bead, c, 0, 0], [b, a * 2 - 1, d * 2 - 1, 0]);
  }
  for (let i = 0; i < NJ + NS; i++) {
    const big = i < NJ;
    const [NT, TS] = big ? TENTACLES.big : TENTACLES.small;
    for (let t = 0; t < NT; t++)
      strip([KIND.tentacle, i, 0, 0], TS, (j, side) => [t, j / TS, side, NT]);
    if (big)
      for (let a = 0; a < ARMS[0]; a++)
        strip([KIND.arm, i, 0, 0], ARMS[1], (j, side) => [
          a,
          j / ARMS[1],
          side,
          0,
        ]);
    const [rings, segments] = big ? BELL.big : BELL.small;
    for (let j = 0; j < rings; j++)
      for (let s = 0; s < segments; s++)
        for (const [di, dj] of QUAD)
          v(
            [KIND.bell, i, 0, 0],
            [(j + dj) / rings, (s + di) / segments, 0, 0],
          );
  }
  if (o !== data.length) throw new Error("abyss: vertex count");
  return data;
}
