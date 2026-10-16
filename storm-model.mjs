// Thunderhead CPU reference. The GLSL mirrors live in scene-storm-data.mjs
// (cells, discharge events, leader graph) and scene-storm-volume.mjs
// (carrier field, light transport). Graph identity is (seed, tree, step);
// each discharge event picks a tree and a site from (seed, slot, event).
export const TRUNK_STEPS = 18;
export const BRANCHES = 3;
export const BRANCH_STEPS = 4;
export const SLOTS = 4;
export const SEGMENTS = SLOTS * (TRUNK_STEPS + BRANCHES * BRANCH_STEPS);
export const BRANCH_PROBABILITY = 0.78;
export const TREE_SHAPES = 12;
const TAU = 2 * Math.PI;
export function hash(x) {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
export const random = (seed, network, n) =>
  (hash(
    (seed ^
      Math.imul(network + 1, 0x9e3779b9) ^
      Math.imul(n + 1, 0x85ebca6b)) >>>
      0,
  ) >>>
    8) /
  16777216;
export const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
export function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
const sub = (a, b) => a.map((v, i) => v - b[i]);
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (a, s) => a.map((v) => v * s);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const length = (a) => Math.sqrt(dot(a, a));
const normalize = (a) => scale(a, 1 / length(a));
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// ---- Stepped-leader graph in normalised coordinates (lateral, along, depth).
export function leaderPoint(seed, network, step) {
  // Bounded lateral jitter per forward step; the root is exactly (0,0,0).
  return [
    (random(seed, network, step * 3) - random(seed, network, 0)) * 0.16,
    step / TRUNK_STEPS,
    (random(seed, network, step * 3 + 1) - random(seed, network, 1)) * 0.12,
  ];
}
export function branchPoint(seed, network, branch, n) {
  const origin = leaderPoint(seed, network, 4 + branch * 4);
  const side = random(seed, network, 90 + branch) < 0.5 ? -1 : 1;
  const jitter = (offset) =>
    random(seed, network, offset + branch * 8 + n) -
    random(seed, network, offset + branch * 8);
  return [
    origin[0] + side * n * 0.12 + jitter(110) * 0.13,
    origin[1] + n * 0.045 + jitter(150) * 0.05,
    origin[2] + jitter(190) * 0.1,
  ];
}
// One 30-edge tree: 18 trunk edges and three four-edge branches.
export function leaderSegment(seed, network, local) {
  if (local < TRUNK_STEPS)
    return {
      id: [network, -1, local],
      a: leaderPoint(seed, network, local),
      b: leaderPoint(seed, network, local + 1),
      active: true,
      parent: local - 1,
    };
  const branch = Math.floor((local - TRUNK_STEPS) / BRANCH_STEPS);
  const step = (local - TRUNK_STEPS) % BRANCH_STEPS;
  return {
    id: [network, branch, step],
    a: branchPoint(seed, network, branch, step),
    b: branchPoint(seed, network, branch, step + 1),
    active: random(seed, network, 70 + branch) < BRANCH_PROBABILITY,
    parent: step === 0 ? 4 + branch * 4 - 1 : local - 1,
  };
}

// ---- Convective cells: Haze bank -> towers -> supercell with flanking line.
const HX = [-17, -8.5, 0, 8.5, 17];
const HT = [0, 3, 1.6, 3.4, 0.4];
const TX = [-13, -6.2, 0.3, 6.6, 13];
const TT = [5.6, 10.4, 12, 9.6, 5.2];
const TR = [3, 2.4, 2.7, 2.3, 2.8];
const SX = [-12.5, -6, 0, 5.8, 10.6];
const SZ = [11, 11.5, 6.5, 8.6, 10.5];
const ST = [4.4, 7.6, 11.6, 8.4, 6];
const SR = [2.4, 3.4, 5.6, 2.8, 2.2];
export function stages(development) {
  return { rise: smooth(0, 1, development), supercell: smooth(1, 2, development) };
}
// [x, z, base, top] and radius of each cell; base is the shared cloud base.
export function cells(seed, development) {
  const { rise, supercell } = stages(development);
  return {
    base: mix(mix(1.4, 2.6, rise), 4.4, supercell),
    cells: HX.map((_, i) => {
      const j0 = random(seed, 7, i * 4) - 0.5,
        j1 = random(seed, 7, i * 4 + 1) - 0.5,
        j2 = random(seed, 7, i * 4 + 2) - 0.5,
        j3 = random(seed, 7, i * 4 + 3);
      const haze = [HX[i] + j0 * 2.5, 15 + j1 * 4, 1.4, 4.4 + j3 * 2.2 + HT[i]];
      const tower = [TX[i] + j0 * 1.2, 11 + j1 * 3, 2.6, TT[i] + 1 + j3 * 1.2];
      const sup = [SX[i] + j0 * 0.8, SZ[i] + j1 * 1.5, 4.4, ST[i] + 2 + j3 * 0.8];
      return {
        cell: mix3(mix3(haze, tower, rise), sup, supercell),
        radius: mix(mix(5.4 + j2 * 2.2, TR[i] + j2 * 0.6, rise), SR[i] + j2 * 0.4, supercell),
      };
    }),
  };
}

// ---- Discharge grammar.
// Shared rhythm envelope (rhythm.mjs): instant attack, smoothstep decay.
export function rhythmEnvelope(elapsed, duration, amplitude) {
  const decay = Math.max(0, 1 - elapsed / duration);
  return amplitude * decay * decay * (3 - 2 * decay);
}
// Inverse of that decay: normalised elapsed time from the envelope value.
export function envelopeTime(value, nominal) {
  const y = Math.max(0, Math.min(1, value / nominal));
  if (y <= 0) return 1;
  const d = 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3);
  return Math.max(1 - d, 0.002);
}
// [local brightness, broad (return stroke only), leader progress].
export function stroke(u, restrikes, crawl, ic, seed, id, slot) {
  if (u <= 0 || u >= 1) return [0, 0, 0];
  const progress = crawl ? smooth(0, 0.45, u) : smooth(0, 0.05, u);
  const leader = 0.1 * (1 - smooth(0.045, 0.065, u));
  const strike = smooth(0.035, 0.05, u) * Math.exp(-Math.max(0, u - 0.05) * 14);
  let re = 0;
  if (restrikes > 0.5) re += 0.7 * Math.exp(-(((u - 0.17) / 0.018) ** 2));
  if (restrikes > 1.5) re += 0.5 * Math.exp(-(((u - 0.29) / 0.018) ** 2));
  const glow = 0.18 * (1 - smooth(0.25, 0.75, u));
  const cg = leader + strike + re + glow;
  const env = smooth(0, 0.04, u) * (1 - smooth(0.45, 0.95, u));
  let pulses = 0;
  for (let j = 0; j < 3; j++) {
    const at = 0.04 + 0.5 * random(seed, 110 + slot * 3 + j, id);
    pulses +=
      mix(0.5, 1, random(seed, 120 + slot * 3 + j, id)) *
      Math.exp(-(((u - at) / 0.06) ** 2));
  }
  const flicker = env * (0.4 + 0.6 * Math.min(pulses, 1.3));
  if (crawl) return [flicker * 0.85, 0, progress];
  return [mix(cg, flicker, ic), mix(strike, 0.35 * strike, ic), progress];
}
// One event of a slot (0 stepped return, 1 autonomous, 2 crawler, 3 buried).
export function discharge(seed, slot, index, u, gain, development) {
  const id = Math.floor(index % 4096);
  const { rise, supercell } = stages(development);
  const ground = smooth(1.15, 1.75, development);
  const { cells: cs } = cells(seed, development);
  const shape = Math.floor(random(seed, 40 + slot, id) * TREE_SHAPES);
  const restrikes = Math.floor(random(seed, 50 + slot, id) * 3);
  const ic = slot >= 2 ? 1 : 1 - ground;
  const [power, broad, progress] = stroke(u, restrikes, slot === 2, ic, seed, id, slot);
  const pick = random(seed, 60 + slot, id);
  const cell = pick < 0.4 ? 2 : pick < 0.6 ? 1 : pick < 0.8 ? 3 : pick < 0.9 ? 0 : 4;
  const [cx, cz, base, topY] = cs[cell].cell,
    rad = cs[cell].radius;
  const a = random(seed, 70 + slot, id) * TAU,
    ra = Math.sqrt(random(seed, 80 + slot, id)) * 0.55;
  const off = [Math.cos(a) * ra * rad, Math.sin(a) * ra * rad];
  const top = topY - base;
  const lean = (random(seed, 90 + slot, id) - 0.5) * 3;
  const other = cell === 4 ? 3 : cell + 1;
  const [ox, oz, obase, otop] = cs[other].cell;
  let A, B;
  if (slot <= 1) {
    let root = [cx + off[0], base + top * mix(0.55, 0.45, supercell), cz + off[1]];
    if (slot === 0) {
      // The hero return stroke leaves the forward anvil in the supercell.
      const side = (random(seed, 91, id) - 0.5) * 2;
      const anvilRoot = [
        -3 + side * (side > 0 ? 5 : 10),
        cs[2].cell[3] * 0.9 - 0.4,
        7 - mix(1.5, 4.5, random(seed, 92, id)),
      ];
      root = mix3(root, anvilRoot, supercell);
    }
    const inCloud = [mix(cx, ox, 0.8), base + top * 0.3, mix(cz, oz, 0.8)];
    const strike = [root[0] + lean, 0, root[2] + lean * 0.4 - 4 * supercell];
    A = root;
    B = mix3(inCloud, strike, ground);
  } else if (slot === 2) {
    const a0 = [cx, base + top * 0.45, cz];
    const b0 = [ox, obase + (otop - obase) * 0.45, oz];
    const [mx, mz, , mtop] = cs[2].cell;
    const centre = [mix(mx, -3, supercell), mtop * 0.9 - 1.5, mix(mz, 7, supercell)];
    const dir = random(seed, 100, id) * TAU,
      turn = (random(seed, 101, id) - 0.5) * 1.6;
    const a1 = add(centre, [Math.cos(dir) * (Math.cos(dir) > 0 ? 7.5 : 13), 0, Math.sin(dir) * 6]);
    const b1 = add(centre, [
      Math.cos(dir + 3.1416 + turn) * 9,
      -0.5,
      Math.sin(dir + 3.1416 + turn) * 4.5,
    ]);
    A = mix3(a0, a1, supercell);
    B = mix3(b0, b1, supercell);
  } else {
    A = [cx + off[0], base + top * 0.7, cz + off[1]];
    B = [cx - off[0] * 0.6 + lean, base + top * 0.25, cz - off[1] * 0.6];
  }
  const axis = sub(B, A);
  let side = cross(axis, slot === 2 ? [0, 1, 0] : [0, 0, 1]);
  side = dot(side, side) > 1e-6 ? normalize(side) : [1, 0, 0];
  let depth = normalize(cross(side, add(axis, [0, 1e-4, 0])));
  if (slot <= 1) {
    side = normalize([side[0] + 1e-4, 0, side[2]]);
    depth = normalize([depth[0], 0, depth[2] + 1e-4]);
  }
  return {
    slot,
    network: slot * 16 + shape,
    cell,
    restrikes,
    power: power * gain,
    broad: broad * gain,
    progress,
    top: A,
    bottom: B,
    side,
    depth,
    rise,
  };
}
// Normalised leader coordinates to world space for one event.
export function worldPoint(p, event, height = 1) {
  const axis = sub(event.bottom, event.top),
    len = length(axis);
  const q = add(
    add(add(event.top, scale(axis, p[1])), scale(event.side, p[0] * len * 1.1)),
    scale(event.depth, p[2] * len * 0.8),
  );
  q[1] *= height;
  return q;
}
export function eventGraph(seed, event, height = 1) {
  return Array.from({ length: 30 }, (_, local) => {
    const s = leaderSegment(seed, event.network, local);
    return {
      ...s,
      a: worldPoint(s.a, event, height),
      b: worldPoint(s.b, event, height),
    };
  });
}

// ---- Light transport.
// Lightning irradiance falloff from the closest channel point (before the
// in-cloud attenuation exp(-0.04·τ·d), with τ the summed tap densities).
export const flashFalloff = (d) => 1 / (1 + d * d * 0.06) ** 1.5;
export function channelDistance(point, a, b) {
  const v = sub(b, a),
    q = sub(point, a);
  const t = Math.max(0, Math.min(1, dot(q, v) / Math.max(dot(v, v), 1e-4)));
  return length(sub(q, scale(v, t)));
}
// Henyey–Greenstein phase function (normalised over the sphere).
export const hg = (g, mu) =>
  (1 - g * g) / (12.566 * Math.max(1 + g * g - 2 * g * mu, 1e-4) ** 1.5);
// Three Wrenninge octaves, a = 0.5, b = 0.4, c = 0.5, dual-lobe phase.
export function multipleScattering(tau, mu) {
  let sum = 0,
    a = 1,
    b = 1,
    c = 1;
  for (let k = 0; k < 3; k++) {
    sum += a * Math.exp(-b * tau) * mix(hg(0.72 * c, mu), hg(-0.25 * c, mu), 0.3);
    a *= 0.5;
    b *= 0.4;
    c *= 0.5;
  }
  return sum;
}
// Piecewise log-linear transmittance recorded during the march.
export function transmittanceAt(t, r) {
  if (r.enter < 0 || t <= r.enter) return 1;
  const lf = Math.log(Math.max(r.final, 1e-4));
  const t1 = r.half > 0 ? r.half : r.exit,
    l1 = r.half > 0 ? -0.6931 : lf;
  if (t <= t1) return Math.exp((l1 * (t - r.enter)) / Math.max(t1 - r.enter, 1e-3));
  if (r.tenth > 0 && t <= r.tenth)
    return Math.exp(mix(-0.6931, -2.3026, (t - r.half) / Math.max(r.tenth - r.half, 1e-3)));
  return r.final;
}

// ---- Cloud carrier field (signed distance, positive outside).
export function anvil(seed, development) {
  const { supercell } = stages(development);
  const { cells: cs } = cells(seed, development);
  const [mx, mz, , mtop] = cs[2].cell;
  return {
    centre: [mix(mx, -3, supercell), mtop * mix(0.92, 0.9, supercell), mix(mz, 7, supercell)],
    radius: mix(0.6 * cs[2].radius, 17.5, supercell),
    thickness: mix(0.9, 1.25, supercell),
    dome: 2.5 * supercell,
  };
}
const smin = (a, b, k) => {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return mix(b, a, h) - k * h * (1 - h);
};
// Coarse carrier (no mammatus), as used by the light-transport taps.
export function carrier(p, seed, development, phase = 0, parts = null) {
  const { supercell } = stages(development);
  const { cells: cs } = cells(seed, development);
  let field = 1e3,
    foot = 1e3;
  const { rise } = stages(development);
  cs.forEach(({ cell: c, radius }, i) => {
    const d = [p[0] - c[0], p[2] - c[1]];
    d[0] -= (p[1] - c[2]) * (random(seed, 8, i) - 0.5) * 0.3 * rise * (1 - 0.6 * supercell);
    const rad = Math.hypot(d[0], d[1]);
    let R = radius * mix(0.82 + 0.26 * smooth(c[2], c[2] + 0.5 * (c[3] - c[2]), p[1]), 1.1 - 0.35 * smooth(c[2] + 0.2 * (c[3] - c[2]), c[3], p[1]), rise * (1 - supercell));
    if (i === 2 && supercell > 0) {
      const low = 1 - smooth(c[2] + 3, c[2] + 6.5, p[1]);
      const theta = Math.atan2(d[1], d[0] + 1e-5);
      R *= mix(1, 0.7 + 0.3 * smooth(c[2], c[2] + 5, p[1]), supercell * low);
      R += supercell * low * 0.85 * Math.sin(TAU * p[1] * 0.8 + theta - 2 * phase);
    }
    const hgt = c[3] - c[2];
    const halfH = 0.5 * hgt * mix(1, 0.78, rise * (i === 2 ? 1 - supercell : 1)) + 1.1,
      ym = c[2] - 1.6 + halfH,
      rr = Math.min(R, halfH) * 0.85;
    const q = [rad - R + rr, Math.abs(p[1] - ym) - halfH + rr];
    let sd =
      Math.min(Math.max(q[0], q[1]), 0) +
      Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0)) -
      rr;
    // Thermal bubbles (scene-storm-volume.mjs stCarrier).
    const leanK = (random(seed, 8, i) - 0.5) * 0.3 * rise * (1 - 0.6 * supercell);
    const calm = i === 2 ? 1 - 0.75 * supercell : 1;
    for (let k = 0; k < 3; k++) {
      const bob = Math.sin(phase + TAU * random(seed, 9, i * 3 + k));
      const by = c[2] + hgt * (0.5 + 0.19 * k) + 0.18 * bob;
      const bc = [
        c[0] + (random(seed, 10, i * 3 + k) - 0.5) * 1.0 * radius + leanK * (by - c[2]),
        by,
        c[1] + (random(seed, 11, i * 3 + k) - 0.5) * 1.0 * radius,
      ];
      const br = radius * (0.8 - 0.14 * k) * mix(0.75, 1, rise) * calm;
      sd = smin(sd, length(sub(p, bc)) - br, 0.7);
    }
    if (i === 2 && parts) parts.main = sd;
    field = smin(field, sd, 1.3);
    foot = smin(foot, rad - radius * 1.25, 1.5);
  });
  if (rise > 0) {
    const base = cells(seed, development).base;
    const shelf = Math.max(foot + (1 - rise) * 6, Math.abs(p[1] - (base - 0.5)) - mix(0.75, 1.1, supercell));
    field = smin(field, shelf, 1);
  }
  const an = anvil(seed, development);
  const a = [p[0] - an.centre[0], (p[2] - an.centre[2]) * mix(1.4, 2, supercell)];
  if (a[0] > 0) a[0] *= mix(1, 1.7, supercell);
  const theta = Math.atan2(a[1], a[0] + 1e-5);
  const rim =
    an.radius *
    (1 +
      supercell *
        (0.13 * Math.sin(2 * theta + TAU * random(seed, 12, 0)) +
          0.07 * Math.sin(5 * theta + TAU * random(seed, 12, 1)) -
          0.1));
  const k = Math.min(1, Math.hypot(a[0], a[1]) / rim);
  const thick = an.thickness * (1 - 0.7 * k * k);
  const centre = an.centre[1] + 0.5 * k * k;
  const sc = [a[0] > 0 ? mix(1, 1.7, supercell) : 1, mix(1.4, 2, supercell)];
  const al = Math.max(Math.hypot(a[0], a[1]), 1e-4);
  const gl = Math.max(Math.hypot(sc[0] * a[0], sc[1] * a[1]) / al, 1);
  const sa = Math.max(
    (al - rim) / gl,
    Math.max(p[1] - centre - thick, centre - thick - p[1]),
  );
  if (parts) parts.anvil = sa;
  field = smin(field, sa, 1);
  if (an.dome > 0) {
    const dome = [cs[2].cell[0], cs[2].cell[3] + 0.2, cs[2].cell[1]];
    field = smin(field, length(sub(p, dome)) - an.dome, 0.8);
  }
  return field;
}

// Local Lipschitz bound of the carrier, by its nearest part: the anvil's
// elliptical scaling (and, on the GPU, mammatus) and the striated updraft.
export function carrierLipschitz(p, seed, development) {
  const { supercell } = stages(development);
  const parts = {};
  const sd = carrier(p, seed, development, 0.7, parts);
  const wM = supercell * (1 - smooth(0, 2, parts.main - sd));
  const wA = 1 - smooth(0, 2, parts.anvil - sd);
  return mix(1.55, 1.25, stages(development).rise) + wA * mix(0.45, 1.4, supercell) + 3.5 * wM;
}
// ---- Cellular billows (unchanged hashing, exact periodic cache).
export function cellFeature(seed, cell, period = 0) {
  const c = cell.map((n) =>
    period > 0 ? ((n % period) + period) % period : n,
  );
  const h = hash(
    (seed ^
      Math.imul(c[0], 0x9e3779b9) ^
      Math.imul(c[1], 0x85ebca6b) ^
      Math.imul(c[2], 0xc2b2ae35)) >>>
      0,
  );
  return [h & 1023, (h >>> 10) & 1023, (h >>> 20) & 1023].map((n) => n / 1024);
}
export function billowLobe(seed, p, period = 0) {
  const cell = p.map(Math.floor),
    f = p.map((x, i) => x - cell[i]);
  let best = 3,
    delta = [0, 0, 0];
  for (let z = -1; z <= 1; z++)
    for (let y = -1; y <= 1; y++)
      for (let x = -1; x <= 1; x++) {
        const corner = [x, y, z];
        const feature = cellFeature(
          seed,
          cell.map((c, i) => c + corner[i]),
          period,
        );
        const q = f.map((v, i) => v - corner[i] - feature[i]);
        const d = q.reduce((sum, v) => sum + v * v, 0);
        const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (best - d)) / 0.12));
        best = mix(best, d, h) - 0.12 * h * (1 - h);
        delta = delta.map((v, i) => mix(v, q[i], h));
      }
  const d = Math.sqrt(Math.max(best + 0.03, 0.005));
  return { value: 1 - d / 1.1, gradient: delta.map((v) => -v / (1.1 * d)) };
}
export function detailAddress(voxel) {
  const [x, y, z] = voxel.map((n) => ((n % 28) + 28) % 28);
  return [125 + z * 30 + x, 4 + y];
}
// Full-resolution lobes fade where they fall below the output pixel.
export function detailWeight(pixelFootprint) {
  return 1 - smooth(0.1, 0.45, pixelFootprint);
}
// ---- Camera: the storm grows toward the camera; the camera moves little.
export function camera(development, eye = 0.45) {
  const { rise, supercell } = stages(development);
  const grow = 0.55 * rise + 0.45 * supercell;
  return {
    z: mix(-21, -14, grow) - (eye - 0.45) * 7,
    y: mix(1.5, 0.6, grow) + (eye - 0.45) * (eye < 0.45 ? 0.8 : 1.4),
    focal: mix(mix(2.2, 2.25, rise), 1.6, supercell),
  };
}
// Conservative storm bounds (scene-storm-volume.mjs stStormBox), unscaled y.
export function stormBox(seed, development, height = 1) {
  const { cells: cs } = cells(seed, development);
  const an = anvil(seed, development);
  let minX = 1e3,
    maxX = -1e3,
    minZ = 1e3,
    maxZ = -1e3,
    top = 0;
  for (const { cell: c, radius } of cs) {
    const r = radius * 1.25 + 2 + 0.15 * (c[3] - c[2]);
    minX = Math.min(minX, c[0] - r);
    maxX = Math.max(maxX, c[0] + r);
    minZ = Math.min(minZ, c[1] - r);
    maxZ = Math.max(maxZ, c[1] + r);
    top = Math.max(top, c[3]);
  }
  const ra = an.radius + 2;
  minX = Math.min(minX, an.centre[0] - ra);
  maxX = Math.max(maxX, an.centre[0] + ra);
  minZ = Math.min(minZ, an.centre[2] - ra);
  maxZ = Math.max(maxZ, an.centre[2] + ra);
  return {
    lo: [Math.max(minX, -26), Math.max(0.3, (cells(seed, development).base - 1.5) * height), Math.max(minZ, -7)],
    hi: [Math.min(maxX, 26), Math.min(17.1, top + an.dome + 2) * height, Math.min(maxZ, 23)],
  };
}
