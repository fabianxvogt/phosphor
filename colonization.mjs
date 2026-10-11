// A bounded space-colonization study, after Runions, Lane & Prusinkiewicz.
// Attraction is local, assigned to the nearest existing node; reached points
// disappear. Regions are finite graphs. Renewal is an explicit presentation
// device, not a claim that the source algorithm grows forever.
export const MAX_NODES = 768;
export const REGION_NODES = MAX_NODES / 2;
export const REGION_ATTRACTORS = 400;
export const SAMPLES_PER_EDGE = 16;
export const SAMPLE_CAPACITY = MAX_NODES * SAMPLES_PER_EDGE;
export const ATTRACTOR_START = SAMPLE_CAPACITY + MAX_NODES;
export const TEXTURE_WIDTH = 128;
export const TEXTURE_HEIGHT = 256;
export const LAYER_SIZE = (TEXTURE_WIDTH * TEXTURE_HEIGHT) / 2;
export const REGION_FADE_SECONDS = 6;
export const REGION_INTERVAL_SECONDS = 20;
export const MAX_ITERATIONS_PER_TICK = 2;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => (Number.isFinite(value) ? value : fallback);
const length = (p) => Math.hypot(p[0], p[1], p[2]);
const distance2 = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const keys = [
  "variant",
  "density",
  "reach",
  "step",
  "growth",
  "size",
  "turn",
  "persistence",
];
const defaults = [0, 0.6, 0.55, 0.45, 0.45, 0.5, 0.2, 0.35];

export function parameters(params = {}) {
  const values = keys.map((key, index) =>
    finite(
      Array.isArray(params) || ArrayBuffer.isView(params)
        ? params[index]
        : params[key],
      defaults[index],
    ),
  );
  return {
    variant: clamp(Math.round(values[0]), 0, 2),
    density: clamp(values[1], 0, 1),
    influence: 0.14 + clamp(values[2], 0, 1) * 0.18,
    step: 0.009 + clamp(values[3], 0, 1) * 0.022,
    kill: 0.019 + clamp(values[3], 0, 1) * 0.016,
    iterationsPerSecond: 5 + clamp(values[4], 0, 1) * 17,
  };
}

export function randomGenerator(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let x = Math.imul(value ^ (value >>> 15), value | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function node(position, parent = -1, path = 0, cohort = 0) {
  return { position: [...position], parent, path, cohort, children: 0 };
}

export function createGraph(root, attractors, maxNodes = REGION_NODES) {
  if (!root?.every(Number.isFinite) || root.length !== 3)
    throw new Error("A finite 3D root is required");
  if (!Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > MAX_NODES)
    throw new Error("Invalid node budget");
  if (attractors.length > REGION_ATTRACTORS)
    throw new Error("Attractor budget exceeded");
  for (const point of attractors)
    if (point.length !== 3 || !point.every(Number.isFinite))
      throw new Error("A finite 3D attraction point is required");
  return {
    nodes: [node(root)],
    attractors: attractors.map((p) => [...p]),
    maxNodes,
    iteration: 0,
    nextCohort: 1,
    stats: { checks: 0, reached: 0, added: 0 },
  };
}

function binsFor(nodes, cellSize) {
  const low = [Infinity, Infinity, Infinity],
    high = [-Infinity, -Infinity, -Infinity];
  for (const { position } of nodes)
    for (let axis = 0; axis < 3; axis++) {
      const cell = Math.floor(position[axis] / cellSize);
      low[axis] = Math.min(low[axis], cell);
      high[axis] = Math.max(high[axis], cell);
    }
  const nx = high[0] - low[0] + 1,
    ny = high[1] - low[1] + 1;
  // Exact integer coordinates within this finite grid; no lossy spatial
  // hash and no string allocation in the attraction-point inner loop.
  const keyOf = (x, y, z) => x - low[0] + nx * (y - low[1] + ny * (z - low[2]));
  const bins = new Map();
  for (let id = 0; id < nodes.length; id++) {
    const p = nodes[id].position;
    const key = keyOf(
      Math.floor(p[0] / cellSize),
      Math.floor(p[1] / cellSize),
      Math.floor(p[2] / cellSize),
    );
    let bucket = bins.get(key);
    if (!bucket) bins.set(key, (bucket = []));
    bucket.push(id);
  }
  return { bins, low, high, keyOf };
}

// One exact simultaneous iteration. New children cannot attract points until
// the next iteration. Ties go to the oldest node, including across hash bins.
export function growGraph(
  graph,
  { influence = 0.24, kill = 0.026, step = 0.019, bounds = null } = {},
) {
  if (
    ![influence, kill, step].every((v) => Number.isFinite(v) && v > 0) ||
    kill > influence
  )
    throw new Error("Invalid growth distances");
  const oldCount = graph.nodes.length;
  const { bins, low, high, keyOf } = binsFor(graph.nodes, influence);
  const directions = new Float64Array(oldCount * 3);
  const assigned = new Uint16Array(oldCount);
  const kept = [];
  const influence2 = influence * influence,
    kill2 = kill * kill;
  let checks = 0,
    reached = 0;
  for (const point of graph.attractors) {
    const bx = Math.floor(point[0] / influence),
      by = Math.floor(point[1] / influence),
      bz = Math.floor(point[2] / influence);
    let nearest = -1,
      nearest2 = influence2;
    for (let x = Math.max(low[0], bx - 1); x <= Math.min(high[0], bx + 1); x++)
      for (
        let y = Math.max(low[1], by - 1);
        y <= Math.min(high[1], by + 1);
        y++
      )
        for (
          let z = Math.max(low[2], bz - 1);
          z <= Math.min(high[2], bz + 1);
          z++
        ) {
          const bucket = bins.get(keyOf(x, y, z));
          if (!bucket) continue;
          for (const id of bucket) {
            checks++;
            const d2 = distance2(point, graph.nodes[id].position);
            if (
              d2 < nearest2 ||
              (d2 === nearest2 && (nearest === -1 || id < nearest))
            ) {
              nearest = id;
              nearest2 = d2;
            }
          }
        }
    if (nearest !== -1 && nearest2 <= kill2) {
      reached++;
      continue;
    }
    kept.push(point);
    if (nearest === -1) continue;
    const p = graph.nodes[nearest].position,
      norm = Math.sqrt(nearest2);
    for (let axis = 0; axis < 3; axis++)
      directions[nearest * 3 + axis] += (point[axis] - p[axis]) / norm;
    assigned[nearest]++;
  }
  graph.attractors = kept;
  let added = 0;
  // ID order makes the node-budget truncation deterministic and transparent.
  for (let id = 0; id < oldCount && graph.nodes.length < graph.maxNodes; id++) {
    if (!assigned[id]) continue;
    const dx = directions[id * 3],
      dy = directions[id * 3 + 1],
      dz = directions[id * 3 + 2];
    const norm = Math.hypot(dx, dy, dz);
    if (norm < 1e-10) continue; // opposing attraction cancels exactly
    const parent = graph.nodes[id];
    const position = [
      parent.position[0] + (step * dx) / norm,
      parent.position[1] + (step * dy) / norm,
      parent.position[2] + (step * dz) / norm,
    ];
    if (
      bounds &&
      position.some((v, axis) => v < bounds[0][axis] || v > bounds[1][axis])
    )
      continue;
    // A stationary point assignment can ask the same branch to grow twice.
    // Avoid duplicate edges rather than repeatedly painting one segment.
    if (
      graph.nodes.some(
        (existing) =>
          existing.parent === id &&
          distance2(position, existing.position) < step * step * 0.01,
      )
    )
      continue;
    let cohort = parent.cohort;
    if (parent.children > 0 && parent.path < 0.75)
      cohort = graph.nextCohort++ % 6;
    parent.children++;
    graph.nodes.push(node(position, id, parent.path + step, cohort));
    added++;
  }
  graph.iteration++;
  graph.stats = { checks, reached, added };
  return graph.stats;
}

function seedTrunk(graph, end, step) {
  const root = graph.nodes[0].position;
  const delta = end.map((v, axis) => v - root[axis]),
    distance = length(delta);
  const count = Math.ceil(distance / step);
  for (let i = 1; i <= count; i++) {
    const p = root.map((v, axis) => v + (delta[axis] * i) / count);
    const parent = graph.nodes.length - 1;
    graph.nodes[parent].children++;
    graph.nodes.push(node(p, parent, (distance * i) / count));
  }
}

function makeRegion(state, config, first = false) {
  const random = state.random;
  const index = state.nextRegion++;
  const xOffset = first ? 0 : (random() - 0.5) * 0.22;
  const scale = first ? 1 : 0.84 + random() * 0.14;
  const transform = (p) => [
    clamp(0.5 + (p[0] - 0.5) * scale + xOffset, 0.02, 0.98),
    clamp(0.5 + (p[1] - 0.5) * scale, 0.02, 0.98),
    clamp(0.5 + (p[2] - 0.5) * scale, 0.02, 0.98),
  ];
  const count = Math.round(150 + config.density * 250);
  const points = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    if (config.variant === 1) {
      // A downward root fan has an open taper near the stem, a broad front
      // below it and little depth. It is not an inverted canopy picture.
      const depth = 0.12 + random() * 0.72;
      points.push(
        transform([
          0.5 + (random() - 0.5) * 0.9 * Math.sqrt(depth),
          0.91 - depth,
          0.5 + (random() - 0.5) * 0.045,
        ]),
      );
    } else if (config.variant === 2) {
      // A filled ellipsoid is genuinely three dimensional: z participates
      // in nearest-node queries and the averaged growth direction.
      const z = 2 * random() - 1;
      const r = Math.cbrt(random()),
        ring = Math.sqrt(1 - z * z);
      points.push(
        transform([
          0.5 + 0.38 * r * ring * Math.cos(angle),
          0.58 + 0.36 * r * ring * Math.sin(angle),
          0.5 + 0.35 * r * z,
        ]),
      );
    } else {
      points.push(
        transform([
          0.5 + radius * 0.4 * Math.cos(angle),
          0.57 + radius * 0.34 * Math.sin(angle),
          0.5 + (random() - 0.5) * 0.024,
        ]),
      );
    }
  }
  const root = transform(
    config.variant === 1 ? [0.5, 0.93, 0.5] : [0.5, 0.06, 0.5],
  );
  const graph = createGraph(root, points);
  // A short seed stem is explicit initial geometry. All later branching
  // comes exclusively from reachable attraction, with no global pull.
  seedTrunk(
    graph,
    transform(config.variant === 1 ? [0.5, 0.79, 0.5] : [0.5, 0.26, 0.5]),
    config.step,
  );
  const warmup = first ? 15 : 0;
  for (let i = 0; i < warmup; i++)
    growGraph(graph, {
      ...config,
      bounds: [
        [0.02, 0.02, 0.02],
        [0.98, 0.98, 0.98],
      ],
    });
  return {
    graph,
    index,
    born: state.time,
    retirement: null,
    stalled: 0,
    variant: config.variant,
  };
}

export function createColonization({ seed = 1, params = {} } = {}) {
  const state = {
    seed,
    random: randomGenerator(seed),
    time: 0,
    accumulator: 0,
    regions: [],
    nextRegion: 0,
    lastRegion: 0,
    pendingRegion: false,
    data: new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4),
    dirty: true,
    initialized: false,
    stats: { checks: 0, iterations: 0, nodes: 0 },
  };
  state.regions.push(makeRegion(state, parameters(params), true));
  return state;
}

function pack16(data, offset, value) {
  const encoded = Math.round(clamp(value, 0, 1) * 65535);
  data[offset] = encoded >>> 8;
  data[offset + 1] = encoded & 255;
}

export function encodeColonization(state) {
  const data = state.data;
  data.fill(0);
  let branch = 0,
    attractionSample = ATTRACTOR_START;
  for (const region of state.regions) {
    const nodes = region.graph.nodes;
    const fade =
      region.retirement === null
        ? 1
        : clamp(
            1 - (state.time - region.retirement) / REGION_FADE_SECONDS,
            0,
            1,
          );
    // Descendant counts produce genuine tapered branches, not size noise.
    const descendants = new Uint16Array(nodes.length).fill(1);
    for (let i = nodes.length - 1; i > 0; i--)
      descendants[nodes[i].parent] += descendants[i];
    for (let i = 1; i < nodes.length; i++, branch++) {
      const child = nodes[i],
        parent = nodes[child.parent];
      const metadata = (SAMPLE_CAPACITY + branch) * 4;
      pack16(data, metadata, child.path / 12);
      data[metadata + 2] = child.cohort;
      data[metadata + 3] = region.index % 6;
      const taper = clamp(Math.sqrt(descendants[i]) / 20, 0, 1);
      for (let s = 0; s < SAMPLES_PER_EDGE; s++) {
        const sample = branch * SAMPLES_PER_EDGE + s,
          t = (s + 0.5) / SAMPLES_PER_EDGE;
        pack16(
          data,
          sample * 4,
          parent.position[0] * (1 - t) + child.position[0] * t,
        );
        pack16(
          data,
          sample * 4 + 2,
          parent.position[1] * (1 - t) + child.position[1] * t,
        );
        const extra = (LAYER_SIZE + sample) * 4;
        pack16(
          data,
          extra,
          parent.position[2] * (1 - t) + child.position[2] * t,
        );
        data[extra + 2] = Math.round(taper * 255);
        data[extra + 3] =
          Math.round(fade * 127) + (child.children === 0 ? 128 : 0);
      }
    }
    for (const point of region.graph.attractors) {
      pack16(data, attractionSample * 4, point[0]);
      pack16(data, attractionSample * 4 + 2, point[1]);
      const extra = (LAYER_SIZE + attractionSample) * 4;
      pack16(data, extra, point[2]);
      data[extra + 3] = Math.round(fade * 127);
      attractionSample++;
    }
  }
  state.dirty = false;
  state.stats.nodes = state.regions.reduce(
    (sum, region) => sum + region.graph.nodes.length,
    0,
  );
  return data;
}

export function stepColonization(
  state,
  { dt = 1 / 60, params = {}, rhythm = null, reset = false } = {},
) {
  // The engine's first reset follows create(), so do not seed/warm twice.
  if (reset && state.initialized) {
    const fresh = createColonization({ seed: state.seed, params });
    Object.assign(state, fresh);
  }
  state.initialized = true;
  const config = parameters(params);
  const elapsed = clamp(finite(dt, 0), 0, 0.1);
  state.time += elapsed;
  state.stats.checks = 0;
  state.stats.iterations = 0;
  const regionHit = rhythm?.hits?.[2] ?? 0;
  if (regionHit > 0) state.pendingRegion = true;
  // Region cues are coalesced during a bounded six-second overlap, rather
  // than clearing the graph or allocating a new forest on every beat.
  const canStartRegion =
    state.regions.length === 1 ||
    state.time - state.lastRegion >= REGION_FADE_SECONDS;
  if (
    canStartRegion &&
    (state.pendingRegion ||
      state.time - state.lastRegion >= REGION_INTERVAL_SECONDS ||
      state.regions.at(-1).variant !== config.variant)
  ) {
    state.regions = state.regions.filter(
      (region) => region.retirement === null,
    );
    for (const region of state.regions) region.retirement = state.time;
    state.regions.push(makeRegion(state, config));
    state.lastRegion = state.time;
    state.pendingRegion = false;
    state.dirty = true;
  }
  const before = state.regions.length;
  state.regions = state.regions.filter(
    (region) =>
      region.retirement === null ||
      state.time - region.retirement < REGION_FADE_SECONDS,
  );
  if (
    before !== state.regions.length ||
    state.regions.some((region) => region.retirement !== null)
  )
    state.dirty = true;
  state.accumulator = Math.min(
    state.accumulator + elapsed * config.iterationsPerSecond,
    MAX_ITERATIONS_PER_TICK,
  );
  const iterations = Math.floor(state.accumulator);
  state.accumulator -= iterations;
  // Only the newest region grows. The outgoing finite graph fades gently.
  const region = state.regions.at(-1);
  for (let i = 0; i < iterations; i++) {
    if (
      region.stalled >= 8 ||
      region.graph.nodes.length >= REGION_NODES ||
      !region.graph.attractors.length
    )
      break;
    const result = growGraph(region.graph, {
      ...config,
      bounds: [
        [0.02, 0.02, 0.02],
        [0.98, 0.98, 0.98],
      ],
    });
    region.stalled = result.added ? 0 : region.stalled + 1;
    state.stats.checks += result.checks;
    state.stats.iterations++;
    if (result.added || result.reached) state.dirty = true;
  }
  return state.dirty ? encodeColonization(state) : null;
}
