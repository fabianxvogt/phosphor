// Living Mycelium: a seeded hyphal network on a periodic forest floor.
// Tip growth with negative autotropism, lateral and apical branching and
// anastomosis (tip fusion, which closes loops) runs once per seed on the CPU.
// Geodesic distances (Dijkstra on the looped graph) drive nutrient pulses,
// shortest-path flow to fruiting sites sets Murray-law cord radii (r³ ∝ Q,
// so r³ is conserved at every junction of the transport tree). Artistic
// biology, not a calibrated fungal model. Nothing here depends on development.

export const PERIOD = 2.4; // torus side in metres
export const PATH_Y = PERIOD / 2;
export const MAX_NODES = 40000;
export const COLONIES = 8;
export const LEAVES = 56;
export const TWIGS = 18;
export const MUSHROOMS = 100;
export const SPORES_PER_MUSHROOM = 60;
export const FREE_SPORES = 1100;
export const STRIDE = 24; // floats per vertex: six vec4 attributes
export const LEAF_U = 10,
  LEAF_V = 4;
export const TWIG_U = 8,
  TWIG_V = 10;
export const STEM_RINGS = 5,
  CAP_RINGS = 14,
  AROUND = 36;
export const LEAF_VERTICES = LEAF_U * LEAF_V * 6;
export const TWIG_VERTICES = TWIG_U * TWIG_V * 6;
export const MUSHROOM_VERTICES = AROUND * (STEM_RINGS + CAP_RINGS) * 6;
export const OPAQUE_VERTICES =
  LEAVES * LEAF_VERTICES +
  TWIGS * TWIG_VERTICES +
  MUSHROOMS * MUSHROOM_VERTICES;
export const KIND = {
  hypha: 0,
  leaf: 1,
  mushroom: 2,
  spore: 3,
  glow: 4,
  twig: 5,
};
// Cap forms: conical, bell, umbonate, convex, small bell.
export const SPECIES = 5;
const TAU = Math.PI * 2;
const STEP = 0.0062;
const BRANCHING = [0.085, 0.11, 0.12, 0.1, 0.06, 0];
const CELL = 0.017;
const GRID = Math.round(PERIOD / CELL);
const HOVER = 0.0016; // surface hyphae hover above litter

// mulberry32 with an int32 state (no boxed doubles in the hot growth loop).
export function randomGenerator(seed = 1) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wrap = (v) => v - PERIOD * Math.floor(v / PERIOD);
const delta = (v) => v - PERIOD * Math.round(v / PERIOD);

// Camera centre line (exactly mirrored in the vertex shader): one closed
// meander per lap along x, so a lap never shows a patch twice.
export function pathY(phase) {
  return (
    PATH_Y +
    0.16 * Math.sin(TAU * phase) +
    0.06 * Math.sin(3 * TAU * phase + 1.3)
  );
}
// Cheap lateral distance from the camera line (slope-corrected |Δy|).
export function pathLateral(x, y) {
  const phase = wrap(x) / PERIOD;
  const slope =
    (0.16 * TAU * Math.cos(TAU * phase) +
      0.18 * TAU * Math.cos(3 * TAU * phase + 1.3)) /
    PERIOD;
  return Math.abs(delta(y - pathY(phase))) / Math.sqrt(1 + slope * slope);
}
const PATH_SAMPLES = Float64Array.from({ length: 960 }, (_, i) =>
  i & 1 ? pathY((i >> 1) / 480) : (PERIOD * (i >> 1)) / 480,
);
// Exact distance to the sampled path; slope < 1, so ±0.55 m in x suffices.
export function pathDistance(x, y) {
  let best = Infinity;
  const centre = Math.round((wrap(x) / PERIOD) * 480);
  for (let k = -110; k <= 110; k++) {
    const s = ((centre + k + 960) % 480) * 2;
    const d = Math.hypot(
      delta(x - PATH_SAMPLES[s]),
      delta(y - PATH_SAMPLES[s + 1]),
    );
    if (d < best) best = d;
  }
  return best;
}

// Leaves: a curled lamina over local (u, v), u along the midrib, |v| ≤ 1.
export function leafWidth(u, lobes) {
  const s = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
  return Math.pow(s, 0.75) * (1 + 0.12 * lobes * Math.sin(u * 5 * Math.PI));
}
export function leafHeight(leaf, u, v) {
  const w = leafWidth(u, leaf.lobes) * leaf.size * 0.32;
  const across = v * w;
  return (
    leaf.z +
    leaf.curl * across * across * 9 +
    0.001 * leaf.size * 10 * Math.sin(Math.PI * u)
  );
}

// Periodic 3×3-cell neighbour scan around a growing tip: negative
// autotropism (repulsion sum), crowding and the nearest fusion partner.
const SCAN = new Float64Array(4);
function scan(g, x, y, zHere, self, spawn, hypha, recent, out) {
  const { px, py, pz, parent, hyphaOf, seq, head, next } = g;
  let rx = 0,
    ry = 0,
    crowd = 0,
    fuse = -1,
    fd = 0.0065 * 0.0065;
  const cx0 = Math.floor(wrap(x) / CELL),
    cy0 = Math.floor(wrap(y) / CELL);
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++) {
      let k =
        head[((cx0 + i + GRID) % GRID) * GRID + ((cy0 + j + GRID) % GRID)];
      for (; k >= 0; k = next[k]) {
        if (k === self || k === spawn) continue;
        const own = hyphaOf[k] === hypha;
        if (own && recent - seq[k] < 10) continue;
        let dx = px[k] - x,
          dy = py[k] - y;
        dx -= PERIOD * Math.round(dx / PERIOD);
        dy -= PERIOD * Math.round(dy / PERIOD);
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.017 * 0.017) continue;
        const w = 1 / (d2 + 1e-5);
        rx -= dx * w;
        ry -= dy * w;
        if (d2 < 0.011 * 0.011) crowd++;
        if (
          !own &&
          d2 < fd &&
          parent[k] !== spawn &&
          Math.abs(pz[k] - zHere) < 0.006
        ) {
          fd = d2;
          fuse = k;
        }
      }
    }
  out[0] = rx;
  out[1] = ry;
  out[2] = crowd;
  out[3] = fuse;
}

// Multi-source Dijkstra on a CSR graph with a typed-array binary heap
// (lazy deletion). The settle order is recorded so flows need no sort.
function shortestPaths(
  count,
  degree,
  adjacency,
  weight,
  heap,
  sources,
  settled,
  limit = Infinity,
) {
  const heapKey = heap.key,
    heapNode = heap.node;
  const dist = new Float64Array(count).fill(Infinity);
  const pred = new Int32Array(count).fill(-1);
  let size = 0,
    popped = 0;
  const push = (d, i) => {
    let k = size++;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heapKey[p] <= d) break;
      heapKey[k] = heapKey[p];
      heapNode[k] = heapNode[p];
      k = p;
    }
    heapKey[k] = d;
    heapNode[k] = i;
  };
  for (const s of sources) {
    dist[s] = 0;
    push(0, s);
  }
  while (size) {
    const d = heapKey[0],
      i = heapNode[0];
    const lastKey = heapKey[--size],
      lastNode = heapNode[size];
    let k = 0;
    for (;;) {
      const l = 2 * k + 1;
      if (l >= size) break;
      const m = l + 1 < size && heapKey[l + 1] < heapKey[l] ? l + 1 : l;
      if (heapKey[m] >= lastKey) break;
      heapKey[k] = heapKey[m];
      heapNode[k] = heapNode[m];
      k = m;
    }
    heapKey[k] = lastKey;
    heapNode[k] = lastNode;
    if (d > dist[i]) continue;
    if (d > limit) break;
    if (settled) settled[popped++] = i;
    for (let e = degree[i]; e < degree[i + 1]; e++) {
      const j = adjacency[e],
        nd = d + weight[e];
      if (nd < dist[j]) {
        dist[j] = nd;
        pred[j] = i;
        push(nd, j);
      }
    }
  }
  return { dist, pred, popped };
}

// The tip-growth loop, kept apart from growNetwork so the optimising
// compiler handles a small function (one giant function compiles slowly
// and runs unoptimised for most of a cold generation).
function growTips(S) {
  const {
    grid,
    tips,
    hyphae,
    colonies,
    fusions,
    addNode,
    surface,
    random,
    gauss,
    newHypha,
  } = S;
  const { px, py, pz, seq } = grid;
  const pending = [];
  let iter = 0;
  const maxTips = 4200;
  while (tips.length && grid.count < MAX_NODES - 2 && iter < 420) {
    iter++;
    for (let t = tips.length - 1; t >= 0; t--) {
      const tip = tips[t];
      if (iter < tip.start) continue;
      if (grid.count >= MAX_NODES - 2) break;
      const h = tip.h;
      const x = px[tip.node],
        y = py[tip.node];
      // Small hot kernel (fast to optimise; the big function is not).
      const zHere = pz[tip.node];
      scan(grid, x, y, zHere, tip.node, h.spawn, h.id, h.nodes.length, SCAN);
      const rx = SCAN[0],
        ry = SCAN[1],
        crowd = SCAN[2],
        fuse = SCAN[3];
      const c = colonies[h.colony];
      const ox = delta(x - c.x),
        oy = delta(y - c.y);
      let target = tip.angle;
      if (rx || ry) {
        let d = Math.atan2(ry, rx) - target;
        d -= TAU * Math.round(d / TAU);
        target += d * Math.min(0.1, Math.hypot(rx, ry) * 0.00025);
      }
      if (ox * ox + oy * oy > 1e-6) {
        let d = Math.atan2(oy, ox) - target;
        d -= TAU * Math.round(d / TAU);
        target += d * (h.order === 0 ? 0.035 : 0.015);
      }
      // Correlated turning: slow meandering arcs, not tight curls or rays.
      tip.curl =
        0.92 * tip.curl + 0.08 * gauss() * (h.order === 0 ? 0.09 : 0.13);
      tip.angle = target + tip.curl + gauss() * 0.04;
      const step = STEP * (0.85 + 0.3 * random());
      const nx = x + Math.cos(tip.angle) * step,
        ny = y + Math.sin(tip.angle) * step;
      let zt;
      if (tip.depth > 0) zt = surface(nx, ny) + HOVER;
      else {
        tip.depth = Math.max(
          -0.015,
          Math.min(-0.0025, tip.depth + gauss() * 0.0006),
        );
        zt = tip.depth;
      }
      const z = zHere + (zt - zHere) * 0.55;
      const node = addNode(nx, ny, z, tip.node, h.id, iter);
      seq[node] = h.nodes.length;
      h.nodes.push(node);
      tip.node = node;
      tip.steps++;
      let dead = tip.steps > tip.life;
      if (
        fuse >= 0 &&
        tip.steps > 3 &&
        random() < (h.order === 0 ? 0.08 : 0.42)
      ) {
        fusions.push(node, fuse);
        h.fuse = fuse;
        h.terminal = false;
        dead = true;
      }
      if (crowd > 9 && random() < 0.3) dead = true;
      // The visible band beside the camera line holds the network.
      if (pathLateral(nx, ny) > 0.5 && random() < 0.25) dead = true;
      if (!dead && tips.length + pending.length < maxTips) {
        if (random() < BRANCHING[Math.min(5, h.order)])
          pending.push(
            node,
            tip.angle + (random() < 0.5 ? -1 : 1) * (0.55 + 0.45 * random()),
            h.order + 1,
            h.colony,
            tip.depth,
          );
        // Apical dichotomy at the fringe builds the fan of fine tips.
        if (h.order >= 2 && random() < 0.022) {
          pending.push(node, tip.angle + 0.38, h.order, h.colony, tip.depth);
          tip.angle -= 0.38;
        }
      }
      if (dead) {
        tips[t] = tips[tips.length - 1];
        tips.pop();
      }
    }
    for (let p = 0; p < pending.length; p += 5)
      newHypha(
        pending[p],
        pending[p + 1],
        pending[p + 2],
        pending[p + 3],
        pending[p + 4],
        iter + 1,
      );
    pending.length = 0;
  }
  return iter;
}

// CPU mirrors of the shader's camera height and mushroom growth, used to
// keep the camera clear of every stem and cap at every development value.
const sstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function eyeHeight(dev, altitude = 1) {
  const d = Math.max(0, Math.min(2, dev)) / 2,
    crane = 0.7 * d + 0.3 * d * d;
  return (0.17 + (0.14 - 0.17) * crane) * altitude;
}
const TALL = [1.75, 1.45, 1.05, 0.85, 1.45],
  FLAT = [1.25, 0.85, 0.62, 0.52, 0.85];
export function shroomShape(m, dev, scale = 1, openBias = 0) {
  const st = m.stagger;
  const prim = sstep(0.82 + st, 1.28 + st, dev),
    g = sstep(1.02 + st, 1.96, dev);
  const h = m.height * scale * (0.05 + 0.95 * Math.pow(g, 1.2));
  const rc = m.cap * scale * (0.28 + 0.72 * g) * (0.45 + 0.55 * prim);
  const open = Math.min(1, sstep(0.3, 1, g) + openBias * g);
  const capH =
    rc * (TALL[m.species] + (FLAT[m.species] - TALL[m.species]) * open);
  const reach = m.bend * h;
  return {
    prim,
    g,
    h,
    rc,
    capH,
    zApex: capH * 0.42,
    rs: m.cap * scale * 0.07 * (2.2 - 1.2 * g),
    top: [
      m.x + Math.cos(m.lean) * reach,
      m.y + Math.sin(m.lean) * reach,
      m.z + h,
    ],
  };
}
// Smallest clearance (metres) between the camera path and this mushroom
// over development 1…2, both cap scales and the altitude range of the looks.
export function shroomClearance(m) {
  let best = Infinity;
  const phase0 = wrap(m.x) / PERIOD;
  for (let dev = 1; dev <= 2.0001; dev += 0.05)
    for (const scale of [0.82, 1.1]) {
      const s = shroomShape(m, dev, scale, 0);
      if (s.prim <= 0) continue;
      const zLow = s.top[2] + s.zApex - s.capH - s.rc * Math.sin(m.tilt),
        zHigh = s.top[2] + s.zApex + s.rc * Math.sin(m.tilt);
      for (let k = -14; k <= 14; k++) {
        const ph = phase0 + k / 240;
        const ex = PERIOD * ph,
          ey = pathY(ph);
        const capD =
          Math.hypot(delta(ex - s.top[0]), delta(ey - s.top[1])) - s.rc;
        for (const altitude of [0.7, 1, 1.4]) {
          const ez = eyeHeight(dev, altitude);
          const vert = ez > zHigh ? ez - zHigh : ez < zLow ? zLow - ez : 0;
          best = Math.min(best, Math.max(capD, vert));
          if (ez < s.top[2] && s.h > 0) {
            // The stem curves quadratically: offset bend·h·t² at height t·h.
            const t = Math.max(0, (ez - m.z) / s.h),
              o = m.bend * s.h * t * t;
            const sx = m.x + Math.cos(m.lean) * o,
              sy = m.y + Math.sin(m.lean) * o;
            best = Math.min(
              best,
              Math.hypot(delta(ex - sx), delta(ey - sy)) - s.rs * 1.6,
            );
          }
        }
      }
    }
  return best;
}

export function growNetwork(seed = 1) {
  const random = randomGenerator((seed * 2654435761) >>> 0 || 1);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(TAU * random());
  // Litter: few large leaves near the camera line, sparse elsewhere; twigs.
  const leaves = [];
  for (let i = 0; i < LEAVES; i++) {
    const x = random() * PERIOD,
      y = random() * PERIOD;
    const nearPath = pathLateral(x, y) < 0.3;
    leaves.push({
      x,
      y,
      size: nearPath ? 0.07 + random() * 0.05 : 0.045 + random() * 0.035,
      angle: random() * TAU,
      curl: -0.05 + random() * 0.45,
      lobes: random() < 0.4 ? 1 : 0,
      z: 0.0012 + (i % 4) * 0.0009,
      hash: random(),
      glow: 0,
    });
  }
  const twigs = [];
  for (let i = 0; i < TWIGS; i++)
    twigs.push({
      x: random() * PERIOD,
      y: random() * PERIOD,
      radius: 0.0018 + 0.004 * random() ** 2,
      length: 0.08 + 0.2 * random(),
      angle: random() * TAU,
      bend: (random() - 0.5) * 0.4,
      hash: random(),
      glow: 0,
    });
  // Litter heights on demand from a coarse periodic bucket grid (10 cm).
  const buckets = Array.from({ length: 24 * 24 }, () => []);
  const bucket = (x, y) =>
    (Math.floor(wrap(x) / 0.1) % 24) * 24 + (Math.floor(wrap(y) / 0.1) % 24);
  const enrol = (item, x, y, reach) => {
    const seen = new Set();
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const r of [reach, reach * 0.5]) {
          const k = bucket(x + i * r, y + j * r);
          if (!seen.has(k)) {
            seen.add(k);
            buckets[k].push(item);
          }
        }
  };
  for (const leaf of leaves) {
    leaf.c = Math.cos(leaf.angle);
    leaf.s = Math.sin(leaf.angle);
    enrol(leaf, leaf.x, leaf.y, leaf.size * 0.55);
  }
  for (const twig of twigs) {
    twig.c = Math.cos(twig.angle);
    twig.s = Math.sin(twig.angle);
    // Twigs are long: enrol points along them.
    for (let u = -0.5; u <= 0.5; u += 0.1)
      enrol(
        twig,
        twig.x + twig.c * u * twig.length,
        twig.y + twig.s * u * twig.length,
        0.02,
      );
  }
  const surface = (x, y) => {
    let top = 0;
    const list = buckets[bucket(x, y)];
    for (let n = 0; n < list.length; n++) {
      const o = list[n];
      const dx = delta(x - o.x),
        dy = delta(y - o.y);
      if (o.size !== undefined) {
        const u = (dx * o.c + dy * o.s) / o.size + 0.5;
        if (u <= 0 || u >= 1) continue;
        const across = -dx * o.s + dy * o.c;
        const w = leafWidth(u, o.lobes) * o.size * 0.32;
        if (Math.abs(across) < w)
          top = Math.max(top, leafHeight(o, u, across / w));
      } else {
        const u = (dx * o.c + dy * o.s) / o.length + 0.5;
        if (u <= 0 || u >= 1) continue;
        const across =
          -dx * o.s + dy * o.c - o.bend * o.length * (u - 0.5) ** 2;
        const r = o.radius;
        if (Math.abs(across) < r)
          top = Math.max(top, r + Math.sqrt(r * r - across * across));
      }
    }
    return top;
  };

  const px = new Float32Array(MAX_NODES),
    py = new Float32Array(MAX_NODES),
    pz = new Float32Array(MAX_NODES);
  const parent = new Int32Array(MAX_NODES).fill(-1);
  const hyphaOf = new Int32Array(MAX_NODES).fill(-1);
  const iterOf = new Float32Array(MAX_NODES);
  const seq = new Int32Array(MAX_NODES);
  const head = new Int32Array(GRID * GRID).fill(-1);
  const next = new Int32Array(MAX_NODES).fill(-1);
  const grid = { px, py, pz, parent, hyphaOf, seq, head, next, count: 0 };
  const addNode = (x, y, z, from, hypha, iter) => {
    const i = grid.count++;
    px[i] = x;
    py[i] = y;
    pz[i] = z;
    parent[i] = from;
    hyphaOf[i] = hypha;
    iterOf[i] = iter;
    const c =
      (Math.floor(wrap(x) / CELL) % GRID) * GRID +
      (Math.floor(wrap(y) / CELL) % GRID);
    next[i] = head[c];
    head[c] = i;
    return i;
  };
  // Nodes within radius r of (x, y), periodic (only for setup, not growth).
  const near = (x, y, r, visit) => {
    const cx = Math.floor(wrap(x) / CELL),
      cy = Math.floor(wrap(y) / CELL),
      n = Math.ceil(r / CELL);
    for (let i = -n; i <= n; i++)
      for (let j = -n; j <= n; j++)
        for (
          let k =
            head[((cx + i + GRID) % GRID) * GRID + ((cy + j + GRID) % GRID)];
          k >= 0;
          k = next[k]
        ) {
          const dx = delta(px[k] - x),
            dy = delta(py[k] - y);
          const d2 = dx * dx + dy * dy;
          if (d2 < r * r) visit(k, d2);
        }
  };

  const hyphae = [];
  const tips = [];
  const fusions = [];
  const colonies = [];
  const newHypha = (spawn, angle, order, colony, depth, iter) => {
    const h = {
      id: hyphae.length,
      spawn,
      nodes: [],
      order,
      colony,
      fuse: -1,
      terminal: true,
      children: 0,
      hash: random(),
    };
    hyphae.push(h);
    tips.push({
      h,
      node: spawn,
      angle,
      depth,
      life: order === 0 ? 1e9 : 30 + random() * (order > 2 ? 80 : 160),
      start: iter,
      steps: 0,
      curl: 0,
    });
    if (spawn >= 0 && hyphaOf[spawn] >= 0) hyphae[hyphaOf[spawn]].children++;
    return h;
  };
  // Inocula along the camera's lap; each leading hypha starts at its own
  // point of a small germination disc, all of them sources of the colony.
  for (let c = 0; c < COLONIES; c++) {
    const phase = (c + 0.25 + 0.5 * random()) / COLONIES;
    const side = (c % 2 ? 1 : -1) * (0.05 + 0.3 * random());
    const x = wrap(PERIOD * phase),
      y = wrap(pathY(phase) + side);
    const delay = Math.floor(random() * 22);
    const sources = [];
    colonies.push({ x, y, sources, delay });
    const arms = 10 + Math.floor(random() * 5);
    for (let a = 0; a < arms; a++) {
      const angle = (TAU * (a + 0.6 * random())) / arms;
      const r = 0.02 + 0.1 * Math.sqrt(random());
      const sx = wrap(x + Math.cos(angle) * r),
        sy = wrap(y + Math.sin(angle) * r);
      const deep = random() < 0.25;
      const z = deep ? -(0.003 + 0.011 * random()) : surface(sx, sy) + HOVER;
      const root = addNode(sx, sy, z, -1, -1, delay);
      sources.push(root);
      newHypha(root, angle + gauss() * 0.3, 0, c, deep ? z : 1, delay);
    }
  }
  const iterations = growTips({
    grid,
    tips,
    hyphae,
    colonies,
    fusions,
    addNode,
    surface,
    random,
    gauss,
    newHypha,
    iterOf,
  });
  const count = grid.count;

  // Graph (CSR): growth-tree edges plus fusion edges, periodic lengths.
  const degree = new Int32Array(count + 1);
  for (let i = 0; i < count; i++)
    if (parent[i] >= 0) {
      degree[i + 1]++;
      degree[parent[i] + 1]++;
    }
  for (let f = 0; f < fusions.length; f += 2) {
    degree[fusions[f] + 1]++;
    degree[fusions[f + 1] + 1]++;
  }
  for (let i = 0; i < count; i++) degree[i + 1] += degree[i];
  const adjacency = new Int32Array(degree[count]),
    weight = new Float32Array(degree[count]),
    fill = degree.slice(0, count);
  const link = (a, b) => {
    const w = Math.hypot(
      delta(px[a] - px[b]),
      delta(py[a] - py[b]),
      pz[a] - pz[b],
    );
    adjacency[fill[a]] = b;
    weight[fill[a]++] = w;
    adjacency[fill[b]] = a;
    weight[fill[b]++] = w;
  };
  for (let i = 0; i < count; i++) if (parent[i] >= 0) link(i, parent[i]);
  for (let f = 0; f < fusions.length; f += 2) link(fusions[f], fusions[f + 1]);
  const heap = {
    key: new Float64Array(degree[count] + count + 8),
    node: new Int32Array(degree[count] + count + 8),
  };
  const dijkstra = (sources, settled, limit) =>
    shortestPaths(
      count,
      degree,
      adjacency,
      weight,
      heap,
      sources,
      settled,
      limit,
    );
  const settled = new Int32Array(count);
  const all = dijkstra(
    colonies.flatMap((c) => c.sources),
    settled,
  );
  // Rhythm waves travel at most 2.4 m; farther nodes keep d = ∞.
  const single = [0, 1, 2].map(
    (c) => dijkstra(colonies[c].sources, null, 2.6).dist,
  );

  // Fruiting sites beside the camera line; each cluster rises from one base.
  const mushrooms = [];
  const sites = [];
  const candidates = [];
  for (let i = 0; i < count; i += 3) {
    const h = hyphaOf[i] >= 0 ? hyphae[hyphaOf[i]] : null;
    if (!h || h.order > 1 || pz[i] < 0 || !Number.isFinite(all.dist[i]))
      continue;
    const d = pathLateral(px[i], py[i]);
    if (d > 0.04 && d < 0.3) candidates.push(i);
  }
  for (let tries = 0; tries < 10000 && sites.length < 36; tries++) {
    if (!candidates.length) break;
    const i = candidates[Math.floor(random() * candidates.length)];
    // Half of the clusters stand right beside the line, to arch over it.
    if (sites.length % 2 === 0 && pathLateral(px[i], py[i]) > 0.12) continue;
    if (
      sites.every(
        (s) => Math.hypot(delta(px[s] - px[i]), delta(py[s] - py[i])) > 0.105,
      ) &&
      pathDistance(px[i], py[i]) > 0.04
    )
      sites.push(i);
  }
  for (let s = 0; s < sites.length && mushrooms.length < MUSHROOMS; s++) {
    const site = sites[s];
    const members = 3 + Math.floor(random() * 3);
    const spin = random() * TAU;
    // Lean away from the camera line so caps fan outwards.
    const away = Math.atan2(
      delta(py[site] - pathY(wrap(px[site]) / PERIOD)),
      0,
    );
    for (let m = 0; m < members && mushrooms.length < MUSHROOMS; m++) {
      const big = m === 0 ? 1 : 0.45 + 0.4 * random();
      const species =
        m === 0 ? Math.floor(random() * 4) : Math.floor(random() * SPECIES);
      const scale = species === 4 ? 0.55 : 1;
      const cap = (0.028 + 0.03 * random()) * big * scale;
      // The main stem leans over the camera line (its cap grows over the
      // path late, above the eye); the others fan outwards.
      const lean =
        m === 0
          ? away + Math.PI + 0.35 * gauss()
          : away * 0.5 + spin + (TAU * m) / members + 0.4 * gauss();
      const height = cap * (2.6 + 1.6 * random()) * (m === 0 ? 1.12 : 1);
      const candidate = {
        node: site,
        site: s,
        x: px[site] + Math.cos(lean) * 0.004 * m,
        y: py[site] + Math.sin(lean) * 0.004 * m,
        z: Math.max(0, pz[site] - HOVER),
        cap,
        height,
        lean,
        // Stems curve apart: horizontal reach ≈ bend · height at the top.
        bend:
          m === 0
            ? 0.22 + 0.25 * random()
            : Math.min(0.9, (cap * 1.15) / height + 0.1 * random()),
        stagger: 0.2 * random(),
        species,
        tilt: 0.38 + 0.1 * random(),
        hash: random(),
        d: all.dist[site],
      };
      // Keep only mushrooms the camera can never touch (it may pass below
      // tall caps: gills overhead are the point of the top state).
      if (
        pathDistance(candidate.x, candidate.y) > 0.035 &&
        shroomClearance(candidate) > 0.032
      )
        mushrooms.push(candidate);
    }
  }
  // Flow: each mushroom draws its size, each free tip a little; routed along
  // the shortest-path tree in reverse settle order. Edge flow (i, pred[i])
  // equals the demand of the subtree below i.
  const demand = new Float64Array(count);
  for (const h of hyphae)
    if (h.terminal && h.nodes.length)
      demand[h.nodes[h.nodes.length - 1]] += 0.02;
  for (const m of mushrooms) demand[m.node] += m.cap / 0.03;
  const flow = new Float64Array(count);
  const sub = demand;
  const pred = all.pred;
  for (let p = all.popped - 1; p >= 0; p--) {
    const i = settled[p];
    if (pred[i] >= 0) {
      flow[i] = sub[i];
      sub[pred[i]] += sub[i];
    }
  }
  const edgeFlow = (a, b) =>
    pred[a] === b ? flow[a] : pred[b] === a ? flow[b] : 0;

  // Litter learns how much network glows beneath it.
  for (const leaf of leaves) {
    let n = 0;
    near(leaf.x, leaf.y, leaf.size * 0.45, () => n++);
    leaf.glow = Math.min(1, n / 40);
  }
  for (const twig of twigs) {
    let n = 0;
    near(twig.x, twig.y, twig.length * 0.4, () => n++);
    twig.glow = Math.min(1, n / 60);
  }
  return {
    seed,
    count,
    iterations,
    px,
    py,
    pz,
    parent,
    hyphaOf,
    iterOf,
    hyphae,
    fusions,
    colonies,
    leaves,
    twigs,
    mushrooms,
    dist: all.dist,
    pred,
    single,
    flow,
    edgeFlow,
    delta,
  };
}

// Murray radius of a transport edge from its flow: r³ ∝ Q.
export const CORD_RADIUS = 0.0017; // radius at unit flow (one mean cap)
export const HAIR_RADIUS = 0.00022;
export const cordRadius = (q) => CORD_RADIUS * Math.cbrt(Math.max(0, q));

// Hyphae as polyline strips with shared, averaged tangents (6 vertices per
// segment, both endpoints per vertex), written straight into the buffer.
function emitHyphae(net, data, v, longest, keyScale) {
  const { px, py, pz, iterOf, hyphae } = net;
  const far = (n) => (Number.isFinite(n) ? n : 99);
  const X = new Float64Array(longest),
    Y = new Float64Array(longest),
    Z = new Float64Array(longest),
    ID = new Int32Array(longest),
    K = new Float64Array(longest),
    RAD = new Float64Array(longest),
    T = new Float64Array(longest * 3);
  for (const h of hyphae) {
    let n = 0;
    const push = (id, key) => {
      const lx = n ? X[n - 1] : px[id],
        ly = n ? Y[n - 1] : py[id];
      // Unwrapped polyline: each point is the previous one plus a periodic step.
      X[n] = lx + delta(px[id] - lx);
      Y[n] = ly + delta(py[id] - ly);
      Z[n] = pz[id];
      ID[n] = id;
      K[n++] = key;
    };
    if (!h.nodes.length) continue;
    push(h.spawn, iterOf[h.nodes[0]] * keyScale - keyScale);
    for (const id of h.nodes) push(id, iterOf[id] * keyScale);
    if (h.fuse >= 0) push(h.fuse, K[n - 1] + keyScale);
    for (let i = 0; i < n; i++) {
      const before = i ? cordRadius(net.edgeFlow(ID[i - 1], ID[i])) : 0,
        after = i + 1 < n ? cordRadius(net.edgeFlow(ID[i], ID[i + 1])) : 0;
      RAD[i] = Math.max(before, after);
      const a = Math.max(0, i - 1),
        b = Math.min(n - 1, i + 1);
      const tx = X[b] - X[a],
        ty = Y[b] - Y[a],
        tz = Z[b] - Z[a];
      const len = Math.hypot(tx, ty, tz) || 1;
      T[3 * i] = tx / len;
      T[3 * i + 1] = ty / len;
      T[3 * i + 2] = tz / len;
    }
    const flags =
      Math.min(7, h.order) + (h.terminal ? 8 : 0) + (h.children ? 0 : 16);
    for (let i = 0; i + 1 < n; i++) {
      const mx = (X[i] + X[i + 1]) / 2,
        my = (Y[i] + Y[i + 1]) / 2;
      const end = (e, o, side) => {
        const id = ID[e],
          w = v * STRIDE;
        data[w] = X[e];
        data[w + 1] = Y[e];
        data[w + 2] = Z[e];
        data[w + 3] = side;
        data[w + 4] = X[o];
        data[w + 5] = Y[o];
        data[w + 6] = Z[o];
        data[w + 7] = RAD[e];
        data[w + 8] = K[e];
        data[w + 9] = e / (n - 1);
        data[w + 10] = K[o];
        data[w + 11] = o / (n - 1);
        data[w + 12] = far(net.dist[id]);
        data[w + 13] = far(net.single[0][id]);
        data[w + 14] = far(net.single[1][id]);
        data[w + 15] = far(net.single[2][id]);
        data[w + 16] = T[3 * e];
        data[w + 17] = T[3 * e + 1];
        data[w + 18] = T[3 * e + 2];
        data[w + 19] = h.hash;
        data[w + 20] = mx;
        data[w + 21] = my;
        data[w + 22] = h.hash;
        data[w + 23] =
          KIND.hypha * 256 + flags + (e === n - 1 && h.terminal ? 32 : 0);
        v++;
      };
      end(i, i + 1, -1);
      end(i, i + 1, 1);
      end(i + 1, i, -1);
      end(i + 1, i, -1);
      end(i, i + 1, 1);
      end(i + 1, i, 1);
    }
  }
  return v;
}

const cache = new Map();
export function myceliumMesh(seed = 1) {
  if (cache.has(seed)) return cache.get(seed);
  const net = growNetwork(seed);
  const { px, py, pz, iterOf, hyphae, leaves, twigs, mushrooms } = net;
  const keyScale = 1 / Math.max(1, net.iterations);
  const far = (n) => (Number.isFinite(n) ? n : 99);
  // Fixed-size opaque head, then the additive tail.
  let hyphaVertices = 0,
    longest = 0;
  for (const h of hyphae) {
    const n = h.nodes.length + 1 + (h.fuse >= 0 ? 1 : 0);
    if (n >= 2) hyphaVertices += (n - 1) * 6;
    longest = Math.max(longest, n);
  }
  const sporeVertices = (MUSHROOMS * SPORES_PER_MUSHROOM + FREE_SPORES) * 6;
  const glowVertices = MUSHROOMS * 6;
  const total = OPAQUE_VERTICES + hyphaVertices + sporeVertices + glowVertices;
  const data = new Float32Array(total * STRIDE);
  let v = 0;
  // Per-object attributes are fixed; only the first vec4 varies per vertex.
  const fixed = new Float32Array(20);
  const set = (...values) => {
    fixed.fill(0);
    fixed.set(values);
  };
  const put = (x, y, z, w) => {
    const o = v * STRIDE;
    data[o] = x;
    data[o + 1] = y;
    data[o + 2] = z;
    data[o + 3] = w;
    data.set(fixed, o + 4);
    v++;
  };
  const grid = (U, V, w) => {
    for (let i = 0; i < U; i++)
      for (let j = 0; j < V; j++) {
        put(i / U, j / V, 0, w);
        put((i + 1) / U, j / V, 0, w);
        put(i / U, (j + 1) / V, 0, w);
        put(i / U, (j + 1) / V, 0, w);
        put((i + 1) / U, j / V, 0, w);
        put((i + 1) / U, (j + 1) / V, 0, w);
      }
  };
  for (const f of leaves) {
    set(
      f.x,
      f.y,
      f.z,
      f.size,
      f.angle,
      f.curl,
      f.glow,
      f.lobes,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      f.hash,
      f.x,
      f.y,
      f.hash,
      KIND.leaf * 256,
    );
    grid(LEAF_U, LEAF_V, 0);
  }
  for (const f of twigs) {
    set(
      f.x,
      f.y,
      f.radius,
      f.length,
      f.angle,
      f.bend,
      f.glow,
      f.hash,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      f.hash,
      f.x,
      f.y,
      f.hash,
      KIND.twig * 256,
    );
    grid(TWIG_U, TWIG_V, 0);
  }
  const rings = STEM_RINGS + CAP_RINGS;
  const shroom = (f, flags, a3z, a3w, a4x) => [
    f.x,
    f.y,
    f.z,
    f.cap,
    f.height,
    f.lean,
    f.bend,
    f.stagger,
    far(f.d),
    f.site,
    a3z,
    a3w,
    a4x,
    f.species,
    f.tilt,
    f.hash,
    f.x,
    f.y,
    f.hash,
    flags,
  ];
  for (let m = 0; m < MUSHROOMS; m++) {
    const f = mushrooms[m];
    if (f) set(...shroom(f, KIND.mushroom * 256 + 1, 0, 0, 0));
    else
      set(
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        99,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        KIND.mushroom * 256,
      );
    grid(AROUND, rings, 0);
  }
  const opaque = v;
  if (opaque !== OPAQUE_VERTICES) throw new Error("mycelium opaque layout");
  v = emitHyphae(net, data, v, longest, keyScale);
  // Spores: cohorts per mushroom, then free motes over the floor; lanterns.
  const corners = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  const random = randomGenerator((seed * 40503) >>> 0 || 3);
  const quad = (w, z) => {
    for (let c = 0; c < 12; c += 2) put(corners[c], corners[c + 1], z, w);
  };
  for (let m = 0; m < MUSHROOMS; m++) {
    const f = mushrooms[m];
    for (let s = 0; s < SPORES_PER_MUSHROOM; s++) {
      const h = random(),
        k = random(),
        r = random();
      if (f) set(...shroom(f, KIND.spore * 256 + 1, h, k, r));
      else
        set(
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          99,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          KIND.spore * 256,
        );
      quad(f ? 1 : 0, s / SPORES_PER_MUSHROOM);
    }
  }
  for (let s = 0; s < FREE_SPORES; s++) {
    const x = random() * PERIOD,
      y = random() * PERIOD,
      h = random(),
      k = random(),
      r = random();
    set(
      x,
      y,
      0,
      0,
      0,
      0,
      0,
      0,
      99,
      0,
      h,
      k,
      r,
      0,
      0,
      0,
      x,
      y,
      h,
      KIND.spore * 256 + 2,
    );
    quad(2, 0);
  }
  for (let m = 0; m < MUSHROOMS; m++) {
    const f = mushrooms[m];
    if (f) set(...shroom(f, KIND.glow * 256 + 1, 0, 0, 0));
    else
      set(
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        99,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        KIND.glow * 256,
      );
    quad(f ? 1 : 0, 0);
  }
  if (v !== total) throw new Error(`mycelium mesh ${v} != ${total}`);
  const result = { data, opaque, net, vertices: v };
  cache.clear();
  cache.set(seed, result);
  return result;
}
