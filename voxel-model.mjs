// Data Monolith: the same addresses survive rain, assembly and unfold.
// Additive, synchronous 3D CA over GF(2), infinite dead exterior:
// s'(x,y,z) = XOR(s(x±1,y,z), s(x,y±1,z), s(x,y,z±1)).
export const GENERATIONS = 27;
export const SPACING = 2.85 / GENERATIONS;
export const MONOLITH = [8, 27, 6];
export const COUNT = MONOLITH.reduce((a, b) => a * b);
export const NEIGHBOURS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
export const key = (p) => p.join(",");
export function caStep(live) {
  const next = new Set();
  for (const address of live) {
    const p = address.split(",").map(Number);
    for (const delta of NEIGHBOURS) {
      const k = key(p.map((v, i) => v + delta[i]));
      if (next.has(k)) next.delete(k);
      else next.add(k);
    }
  }
  return next;
}
export function caGeneration(generation = GENERATIONS) {
  let live = new Set(["0,0,0"]);
  for (let g = 0; g < generation; g++) live = caStep(live);
  return [...live].map((s) => s.split(",").map(Number));
}
export function hash(seed, index) {
  let h =
    (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function morton3(x, y, z) {
  let code = 0;
  for (let b = 0; b < 6; b++)
    code |=
      (((x >> b) & 1) << (3 * b)) |
      (((y >> b) & 1) << (3 * b + 1)) |
      (((z >> b) & 1) << (3 * b + 2));
  return code;
}
// Bottom-up layers, Morton locality inside a layer; seed breaks only ties.
export function assemblyOrder(seed) {
  return Array.from({ length: COUNT }, (_, id) => id).sort((a, b) => {
    const xyz = (id) => [id % 8, Math.floor(id / 48), Math.floor(id / 8) % 6];
    const p = xyz(a),
      q = xyz(b);
    return (
      p[1] - q[1] ||
      morton3(...p) - morton3(...q) ||
      hash(seed, a) - hash(seed, b)
    );
  });
}
const architecture = caGeneration().sort(
  (a, b) =>
    a[1] - b[1] ||
    morton3(a[0] + 32, a[1] + 32, a[2] + 32) -
      morton3(b[0] + 32, b[1] + 32, b[2] + 32),
);
export function identities(seed) {
  const rank = new Uint16Array(COUNT);
  assemblyOrder(seed).forEach((id, i) => {
    rank[id] = i;
  });
  return Array.from({ length: COUNT }, (_, id) => {
    const h = hash(seed, id),
      h2 = hash(seed + 17, id);
    return {
      id,
      rank: rank[id] / (COUNT - 1),
      random: hash(seed + 53, id),
      rain: [(h - 0.5) * 12, hash(seed + 37, id) * 7.5 + 0.3, (h2 - 0.5) * 9],
      monolith: [
        ((id % 8) - 3.5) * 0.155,
        0.55 + Math.floor(id / 48) * 0.155,
        ((Math.floor(id / 8) % 6) - 2.5) * 0.155,
      ],
      cell: architecture[rank[id]],
      target: architecture[rank[id]].map((v, i) =>
        i === 1 ? 0.5 + (v + GENERATIONS) * SPACING : v * SPACING,
      ),
    };
  });
}
export const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function position(voxel, development, phase = 0) {
  const a = smooth(0, 1, development * 1.65 - 0.65 * voxel.rank);
  const b = smooth(
    0,
    1,
    Math.max(0, development - 1) * 1.45 - 0.45 * voxel.rank,
  );
  const rain = [...voxel.rain];
  rain[1] =
    0.3 + 7.5 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (phase + voxel.random)));
  return rain.map(
    (v, i) => (v + (voxel.monolith[i] - v) * a) * (1 - b) + voxel.target[i] * b,
  );
}
// Unit cube, shared by every instance and its depth-correct floor mirror.
export const ATTRIBUTES = [3, 3];
export const INSTANCE_ATTRIBUTES = [3, 3, 3, 3, 3]; // rain, monolith, CA target, identity, causal bridge span
export function createCube() {
  const data = [];
  for (let axis = 0; axis < 3; axis++)
    for (const side of [-1, 1]) {
      const u = (axis + 1) % 3,
        v = (axis + 2) % 3;
      for (const [a, b] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]) {
        const p = [0, 0, 0],
          n = [0, 0, 0];
        p[axis] = side;
        p[u] = a;
        p[v] = b;
        n[axis] = side;
        data.push(...p, ...n);
      }
    }
  return new Float32Array(data);
}
// Sparse axis-aligned bridges cross the first two recursive void sizes.
// Both endpoints are genuine live cells; no bridge jumps an intervening cell.
export function bridges(voxels) {
  const addresses = new Map(voxels.map((v) => [key(v.cell), v]));
  const result = [];
  for (const v of voxels)
    for (let axis = 0; axis < 3; axis++) {
      for (let distance = 1; distance <= 12; distance++) {
        const cell = [...v.cell];
        cell[axis] += distance;
        const end = addresses.get(key(cell));
        if (!end) continue;
        if (distance >= 10) result.push({ from: v, to: end, axis, distance });
        break;
      }
    }
  return result;
}
export function createInstances(seed) {
  const data = [],
    voxels = identities(seed),
    links = bridges(voxels);
  for (const mirror of [0, 1]) {
    for (const v of voxels)
      data.push(
        ...v.rain,
        ...v.monolith,
        ...v.target,
        v.rank,
        v.random,
        mirror,
        0,
        0,
        0,
      );
    for (const { from: v, to: w } of links) {
      const center = v.target.map((x, i) => (x + w.target[i]) / 2);
      const span = w.target.map((x, i) => x - v.target[i]);
      data.push(
        ...v.rain,
        ...v.monolith,
        ...center,
        v.rank,
        v.random,
        mirror,
        ...span,
      );
    }
  }
  return new Float32Array(data);
}
