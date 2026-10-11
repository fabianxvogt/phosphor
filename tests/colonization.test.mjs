import test from "node:test";
import assert from "node:assert/strict";
import colonization from "../scene-colonization.mjs";
import {
  createGraph,
  growGraph,
  createColonization,
  stepColonization,
  encodeColonization,
  MAX_NODES,
  REGION_NODES,
  REGION_ATTRACTORS,
  MAX_ITERATIONS_PER_TICK,
  TEXTURE_WIDTH,
  TEXTURE_HEIGHT,
  SAMPLE_CAPACITY,
  SAMPLES_PER_EDGE,
  ATTRACTOR_START,
} from "../colonization.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { defaultPattern, validatePattern } from "../rhythm.mjs";

const near = (actual, expected, tolerance = 1e-12) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} vs ${expected}`,
  );
const node = (position, parent = -1) => ({
  position,
  parent,
  children: 0,
  path: 0,
  cohort: 0,
});

test("only reachable space attracts; reached points are removed", () => {
  const graph = createGraph(
    [0, 0, 0],
    [
      [0.01, 0, 0],
      [0.15, 0, 0],
      [0.5, 0, 0],
    ],
  );
  const result = growGraph(graph, { influence: 0.2, kill: 0.025, step: 0.04 });
  assert.equal(result.reached, 1);
  assert.deepEqual(graph.attractors, [
    [0.15, 0, 0],
    [0.5, 0, 0],
  ]);
  assert.equal(graph.nodes.length, 2);
  assert.deepEqual(graph.nodes[1].position, [0.04, 0, 0]);
  assert.equal(graph.nodes[1].parent, 0);
  const unreachable = createGraph([0, 0, 0], [[0.5, 0, 0]]);
  assert.equal(
    growGraph(unreachable, { influence: 0.2, kill: 0.025, step: 0.04 }).added,
    0,
  );
});

test("assigned directions are normalized before their average is normalized", () => {
  const graph = createGraph(
    [0, 0, 0],
    [
      [0.3, 0, 0],
      [0, 0.1, 0],
    ],
  );
  growGraph(graph, { influence: 0.5, kill: 0.02, step: 0.08 });
  near(graph.nodes[1].position[0], 0.08 / Math.sqrt(2));
  near(graph.nodes[1].position[1], 0.08 / Math.sqrt(2));
  near(Math.hypot(...graph.nodes[1].position), 0.08);
  const opposed = createGraph(
    [0, 0, 0],
    [
      [0.1, 0, 0],
      [-0.1, 0, 0],
    ],
  );
  assert.equal(
    growGraph(opposed, { influence: 0.2, kill: 0.01, step: 0.02 }).added,
    0,
  );
});

test("points choose the nearest old node, with stable ID ties across bins", () => {
  const graph = createGraph([0, 0, 0], [[0.22, 0.02, 0]]);
  graph.nodes.push(node([0.2, 0, 0], 0));
  growGraph(graph, { influence: 0.3, kill: 0.01, step: 0.02 });
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.nodes[2].parent, 1);
  const tie = createGraph([-0.1, 0, 0], [[0, 0.1, 0]]);
  tie.nodes.push(node([0.1, 0, 0], 0));
  growGraph(tie, { influence: 0.2, kill: 0.01, step: 0.02 });
  assert.equal(tie.nodes[2].parent, 0);
});

test("spatial queries match exhaustive nearest assignment in shallow 3D", () => {
  const points = Array.from({ length: 160 }, (_, i) => [
    Math.sin(i * 1.13) * 0.42,
    Math.cos(i * 0.79) * 0.4,
    Math.sin(i * 0.31) * 0.27,
  ]);
  const graph = createGraph([0, 0, 0], points);
  graph.nodes.push(
    ...Array.from({ length: 19 }, (_, i) =>
      node(
        [
          Math.sin(i * 0.93) * 0.3,
          Math.cos(i * 0.58) * 0.31,
          Math.sin(i * 0.77) * 0.2,
        ],
        0,
      ),
    ),
  );
  const old = structuredClone(graph.nodes),
    influence = 0.21,
    kill = 0.03,
    step = 0.014;
  const sums = old.map(() => [0, 0, 0]),
    kept = [];
  for (const point of points) {
    let id = -1,
      best = influence * influence;
    old.forEach((n, index) => {
      const d = point.reduce(
        (sum, v, axis) => sum + (v - n.position[axis]) ** 2,
        0,
      );
      if (d < best || (d === best && (id === -1 || index < id))) {
        id = index;
        best = d;
      }
    });
    if (id !== -1 && best <= kill * kill) continue;
    kept.push(point);
    if (id !== -1)
      sums[id] = sums[id].map(
        (v, axis) =>
          v + (point[axis] - old[id].position[axis]) / Math.sqrt(best),
      );
  }
  const expected = sums.flatMap((sum, id) => {
    const norm = Math.hypot(...sum);
    return norm < 1e-10
      ? []
      : [
          {
            parent: id,
            position: old[id].position.map(
              (v, axis) => v + (step * sum[axis]) / norm,
            ),
          },
        ];
  });
  const stats = growGraph(graph, { influence, kill, step });
  assert.deepEqual(graph.attractors, kept);
  assert.equal(stats.added, expected.length);
  assert.ok(stats.checks <= old.length * points.length);
  for (let i = 0; i < expected.length; i++) {
    const actual = graph.nodes[old.length + i];
    assert.equal(actual.parent, expected[i].parent);
    for (let axis = 0; axis < 3; axis++)
      near(actual.position[axis], expected[i].position[axis]);
  }
});

test("node budgets, duplicate prevention and domain limits stop growth safely", () => {
  const capped = createGraph([0, 0, 0], [[0.5, 0, 0]], 2);
  for (let i = 0; i < 12; i++)
    growGraph(capped, { influence: 1, kill: 0.01, step: 0.02 });
  assert.equal(capped.nodes.length, 2);
  const bounded = createGraph([0.99, 0.5, 0.5], [[1.2, 0.5, 0.5]]);
  growGraph(bounded, {
    influence: 0.5,
    kill: 0.01,
    step: 0.03,
    bounds: [
      [0, 0, 0],
      [1, 1, 1],
    ],
  });
  assert.equal(bounded.nodes.length, 1);
  const duplicate = createGraph([0, 0, 0], [[0.3, 0, 0]]);
  duplicate.nodes.push(node([0.1, 0, 0], 0));
  // The parent remains closest to a second, opposing point which cancels
  // the near child's influence while asking for its existing segment.
  duplicate.attractors = [
    [0.04, 0, 0],
    [0.08, 0, 0],
    [0.3, 0, 0],
  ];
  growGraph(duplicate, { influence: 0.5, kill: 0.01, step: 0.1 });
  assert.equal(duplicate.nodes.filter((n) => n.parent === 0).length, 1);
  assert.throws(() =>
    createGraph(
      [0, 0, 0],
      Array.from({ length: REGION_ATTRACTORS + 1 }, () => [1, 1, 1]),
    ),
  );
});

test("seeded regions are deterministic, ancestries acyclic and all positions bounded", () => {
  for (const variant of colonization.type.values) {
    const params = { ...colonization.presets[0].params, variant };
    const a = createColonization({ seed: 91203, params }),
      b = createColonization({ seed: 91203, params });
    const initial = a.regions[0].graph.nodes.length;
    stepColonization(a, { params, reset: true, dt: 0 });
    assert.equal(
      a.regions[0].graph.nodes.length,
      initial,
      "first reset does not warm twice",
    );
    for (let i = 0; i < 1440; i++) {
      stepColonization(a, {
        params,
        rhythm: { hits: [0, 0, i === 600 ? 1 : 0] },
      });
      stepColonization(b, {
        params,
        rhythm: { hits: [0, 0, i === 600 ? 1 : 0] },
      });
      assert.ok(a.stats.iterations <= MAX_ITERATIONS_PER_TICK);
      assert.ok(a.regions.length <= 2);
      assert.ok(
        a.regions.reduce((sum, r) => sum + r.graph.nodes.length, 0) <=
          MAX_NODES,
      );
    }
    assert.deepEqual(a.regions, b.regions);
    assert.deepEqual(encodeColonization(a), encodeColonization(b));
    for (const region of a.regions) {
      assert.ok(region.graph.nodes.length <= REGION_NODES);
      assert.ok(region.graph.attractors.length <= REGION_ATTRACTORS);
      region.graph.nodes.forEach((n, id) => {
        assert.ok(
          n.position.every((v) => Number.isFinite(v) && v >= 0.02 && v <= 0.98),
        );
        assert.ok(id === 0 ? n.parent === -1 : n.parent >= 0 && n.parent < id);
        if (id)
          near(
            n.path - region.graph.nodes[n.parent].path,
            Math.hypot(
              ...n.position.map(
                (v, axis) => v - region.graph.nodes[n.parent].position[axis],
              ),
            ),
            1e-10,
          );
      });
    }
  }
});

test("finite forests renew with overlapping regions; fast cues coalesce", () => {
  const params = colonization.presets[0].params;
  const state = createColonization({ seed: 8301, params });
  const original = state.regions[0];
  stepColonization(state, { params, rhythm: { hits: [0, 0, 1] } });
  assert.equal(state.regions.length, 2);
  assert.equal(state.regions[0], original);
  assert.notEqual(original.retirement, null);
  assert.equal(state.nextRegion, 2);
  for (let i = 0; i < 300; i++)
    stepColonization(state, { params, rhythm: { hits: [0, 0, 1] } });
  assert.equal(
    state.nextRegion,
    2,
    "a six-second fade does not allocate per beat",
  );
  for (let i = 0; i < 1500; i++) stepColonization(state, { params });
  assert.ok(state.nextRegion >= 3);
  assert.ok(!state.regions.includes(original));
  assert.ok(state.regions.length <= 2);
});

test("packed texture contains branch samples, ancestry and actual remaining points", () => {
  const state = createColonization({
    seed: 8301,
    params: colonization.presets[0].params,
  });
  const data = encodeColonization(state);
  assert.equal(data.length, TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
  const branchCount = state.regions[0].graph.nodes.length - 1;
  const sampleCount = branchCount * SAMPLES_PER_EDGE;
  assert.ok(data.subarray(0, sampleCount * 4).some((v) => v > 0));
  assert.ok(
    data.subarray(sampleCount * 4, SAMPLE_CAPACITY * 4).every((v) => v === 0),
  );
  const points = state.regions[0].graph.attractors.length;
  assert.ok(
    data
      .subarray(ATTRACTOR_START * 4, (ATTRACTOR_START + points) * 4)
      .some((v) => v > 0),
  );
  assert.ok(
    data
      .subarray((ATTRACTOR_START + points) * 4, TEXTURE_WIDTH * 128 * 4)
      .every((v) => v === 0),
  );
  assert.equal(
    stepColonization(state, { dt: 0 }),
    null,
    "unchanged graph avoids texture upload",
  );
});

test("a reached-only iteration uploads removal of the final visible attraction point", () => {
  const state = createColonization({ seed: 8301 });
  state.regions[0].graph = createGraph([0.5, 0.5, 0.5], [[0.51, 0.5, 0.5]]);
  encodeColonization(state);
  assert.ok(
    state.data
      .subarray(ATTRACTOR_START * 4, (ATTRACTOR_START + 1) * 4)
      .some((value) => value > 0),
  );
  const data = stepColonization(state, { params: { growth: 1 }, dt: 0.1 });
  assert.ok(
    data instanceof Uint8Array,
    "consuming space must upload even when no branch is added",
  );
  assert.equal(state.regions[0].graph.attractors.length, 0);
  assert.ok(
    data
      .subarray(ATTRACTOR_START * 4, (ATTRACTOR_START + 1) * 4)
      .every((value) => value === 0),
  );
});

test("eight distinct authored looks validate and cover all structural models", () => {
  assert.equal(colonization.presets.length, 8);
  assert.equal(
    new Set(colonization.presets.map((p) => JSON.stringify(p.params))).size,
    8,
  );
  for (const variant of colonization.type.values)
    assert.ok(colonization.presets.some((p) => p.params.variant === variant));
  for (let i = 0; i < colonization.presets.length; i++) {
    const snapshot = presetSnapshot(colonization, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [colonization]),
      snapshot,
    );
  }
  assert.deepEqual(
    validatePattern(defaultPattern(colonization.rhythm), colonization.rhythm),
    defaultPattern(colonization.rhythm),
  );
  for (const stage of colonization.stage)
    assert.ok(colonization.schema.some((p) => p.key === stage));
});
