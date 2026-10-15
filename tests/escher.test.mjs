import test from "node:test";
import assert from "node:assert/strict";
import escher, {
  ESCHER_STEPS,
  ESCHER_RISE,
  DROSTE_SCALE,
  DROSTE_TURN,
  penroseHeight,
  stairIdentity,
  drosteMap,
} from "../scene-escher.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { advanceClocks } from "../scene-time.mjs";

const TAU = 2 * Math.PI;
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const rotate = ([x, y], a) => [
  x * Math.cos(a) - y * Math.sin(a),
  x * Math.sin(a) + y * Math.cos(a),
];
const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
const subtract = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const scale = (a, s) => a.map((x) => x * s);
const normalize = (a) => scale(a, 1 / Math.hypot(...a));
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const direction = normalize([0.6, 1, 1]);
const right = normalize(cross(scale(direction, -1), [0, 1, 0]));
const up = cross(right, scale(direction, -1));
const project = (p) => [dot(p, right), dot(p, up)];

// CPU counterpart of the three persistent gravity frames. Development only
// changes transforms and scale; never the tread's id, side, seed or ancestry.
function frames(seed, development) {
  const rel = smooth(development);
  return [0, 1, 2].flatMap((frame) =>
    stairIdentity(seed).map((tread) => {
      let p = [...tread.centre];
      if (frame === 1) [p[0], p[1]] = rotate([p[0], p[1]], (Math.PI / 2) * rel);
      if (frame === 2)
        [p[1], p[2]] = rotate([p[1], p[2]], (-Math.PI / 2) * rel);
      if (frame)
        p = p.map(
          (v, i) =>
            v * rel * 0.78 +
            [
              [0, 0, 0],
              [-0.85, 0.9, -0.6],
              [0.7, 0.85, -0.7],
            ][frame][i] *
              rel,
        );
      return {
        id: frame * ESCHER_STEPS + tread.id,
        seed,
        side: tread.side,
        centre: p,
      };
    }),
  );
}

test("Penrose height is locally integrable, strictly ascending, with nonzero monodromy", () => {
  assert.equal(ESCHER_STEPS, 48);
  for (let i = -96; i < 192; i++) {
    near(penroseHeight(i + 1) - penroseHeight(i), ESCHER_RISE);
    near(penroseHeight(i + ESCHER_STEPS) - penroseHeight(i), 48 * ESCHER_RISE);
    assert.equal(penroseHeight(i + 0.99), penroseHeight(i));
  }
  // A globally single-valued Euclidean height cannot climb around a closed
  // loop. We explicitly model the cover instead of claiming that it can.
  assert.ok(penroseHeight(48) > penroseHeight(0));
  near(
    Array.from(
      { length: 48 },
      (_, i) => penroseHeight(i + 1) - penroseHeight(i),
    ).reduce((a, b) => a + b),
    2.16,
  );
});

test("the lifted staircase closes exactly under its privileged projection", () => {
  const identities = stairIdentity(11001);
  assert.equal(new Set(identities.map((p) => p.id)).size, 48);
  for (const { id, centre } of identities) {
    const h = id * 0.045 - 1.0575;
    const flat = [centre[0] - 0.6 * h, 0, centre[2] - h];
    project(centre).forEach((v, i) => near(v, project(flat)[i]));
    const nextSheet = centre.map(
      (v, i) => v + [0.6, 1, 1][i] * 48 * ESCHER_RISE,
    );
    project(nextSheet).forEach((v, i) => near(v, project(centre)[i]));
  }
  // The same plan position at the first and next-sheet join, not a hidden
  // negative riser. Small camera excursions introduce bounded parallax.
  const delta = [0.6, 1, 1].map((v) => v * 48 * ESCHER_RISE);
  const shifted = normalize([0.6 + 0.021, 1, 1 - 0.008]);
  const departure = subtract(delta, scale(shifted, dot(delta, shifted)));
  assert.ok(Math.hypot(...departure) < 0.06);
});

test("Droste quotient has an exact scale-three / thirty-degree similarity period", () => {
  assert.equal(DROSTE_SCALE, 3);
  near(DROSTE_TURN, Math.PI / 6);
  for (let i = 0; i < 80; i++) {
    const angle = i * 0.173 + 0.012,
      radius = Math.exp(-5.113 + i * 0.137);
    const p = [radius * Math.cos(angle), radius * Math.sin(angle)];
    for (const phase of [0, 0.17, 0.71]) {
      const reference = drosteMap(p, phase);
      for (let k = -10; k <= 10; k++) {
        const equivalent = rotate(scale(p, 3 ** k), k * DROSTE_TURN);
        drosteMap(equivalent, phase).forEach((v, j) =>
          near(v, reference[j], 2e-12),
        );
      }
      drosteMap(p, phase + 1).forEach((v, j) => near(v, reference[j], 2e-12));
      assert.ok(
        Math.hypot(...reference) >= 1 - 1e-12 &&
          Math.hypot(...reference) < 3 + 1e-12,
      );
    }
  }
  for (const p of [
    [0, 0],
    [1e-20, 1e-20],
    [1e20, -1e20],
  ])
    assert.ok(drosteMap(p).every(Number.isFinite));
});

test("authored recursive turns and whole-cell clock motion preserve the exact similarity", () => {
  const chart = (p, turn, camera) => {
    const cell = Math.floor(Math.log(Math.hypot(...p)) / Math.log(3));
    return rotate(drosteMap(p), -cell * (turn - DROSTE_TURN + camera));
  };
  for (const turn of [-Math.PI / 3, 0, Math.PI / 3])
    for (const camera of [0, 0.8, 6.1]) {
      for (const p of [
        [0.127, -0.037],
        [0.03, 0.01],
        [-1.2, 0.2],
      ]) {
        const reference = chart(p, turn, camera);
        const next = chart(rotate(scale(p, 3), turn + camera), turn, camera);
        next.forEach((v, i) => near(v, reference[i]));
        chart(p, turn, camera + TAU).forEach((v, i) => near(v, reference[i]));
      }
    }
});

test("Chebyshev marching distance has the same zero set and never oversteps a Euclidean box", () => {
  for (let i = 0; i < 1000; i++) {
    const q = [
      Math.sin(i * 1.13) * 2 - 0.4,
      Math.cos(i * 0.91) * 2 - 0.7,
      Math.sin(i * 0.77) * 2 - 0.2,
    ];
    const lower = Math.max(...q);
    const exact =
      Math.hypot(...q.map((v) => Math.max(v, 0))) + Math.min(lower, 0);
    assert.ok(lower <= exact + 1e-12);
    assert.equal(lower <= 0, exact <= 0);
  }
  assert.match(escher.fragment, /return max\(q.x, max\(q.y, q.z\)\);/);
});

test("flight bounds conservatively contain every tread and lower pier at all fader extremes", () => {
  const identity = stairIdentity(11001);
  for (const width of [0.7, 1, 1.4])
    for (const depth of [0.3, 0.8, 1.2]) {
      for (let side = 0; side < 4; side++) {
        const a = identity[side * 12].centre,
          b = identity[side * 12 + 11].centre;
        const halfHeight = Math.max(0.17, 0.55 * depth);
        const centre = a.map(
          (v, i) => (v + b[i]) / 2 - (i === 1 ? halfHeight : 0),
        );
        const w =
          side % 2
            ? [0.24 * width, halfHeight, 0.139]
            : [0.139, halfHeight, 0.24 * width];
        const extent = a.map((v, i) => Math.abs(b[i] - v) / 2 + w[i] + 0.002);
        const centres = [
          [-0.486, -0.81 - halfHeight, -2.31],
          [1.338, -0.27 - halfHeight, -0.27],
          [0.162, 0.27 - halfHeight, 1.77],
          [-1.014, 0.81 - halfHeight, 0.81],
        ];
        const extents = [
          [1.6645, 0.2495 + halfHeight, 0.2495 + 0.24 * width],
          [0.1505 + 0.24 * width, 0.2495 + halfHeight, 1.7635],
          [1.3675, 0.2495 + halfHeight, 0.2495 + 0.24 * width],
          [0.1505 + 0.24 * width, 0.2495 + halfHeight, 1.2685],
        ];
        centre.forEach((v, i) => near(v, centres[side][i]));
        extent.forEach((v, i) => near(v, extents[side][i]));
        for (let id = side * 12; id < side * 12 + 12; id++)
          for (const pier of [false, true]) {
            if (pier && id % 3) continue;
            const h = pier ? 0.55 * depth : 0.17;
            let box = pier
              ? [0.065, h, 0.19 * width]
              : [0.139, h, 0.24 * width];
            if (side % 2) box = [box[2], box[1], box[0]];
            const c = identity[id].centre.map((v, i) => v - (i === 1 ? h : 0));
            for (let axis = 0; axis < 3; axis++)
              assert.ok(
                Math.abs(c[axis] - centre[axis]) + box[axis] <= extent[axis],
              );
          }
      }
    }
});

test("development preserves identity and has finite continuous geometry in both directions", () => {
  const identity = frames(11001, 0).map(({ centre, ...id }) => id);
  let previous;
  const forward = [];
  for (let i = 0; i <= 400; i++) {
    const current = frames(11001, i / 200);
    assert.deepEqual(
      current.map(({ centre, ...id }) => id),
      identity,
    );
    for (let j = 0; j < current.length; j++) {
      assert.ok(current[j].centre.every(Number.isFinite));
      if (previous)
        assert.ok(
          Math.hypot(...subtract(current[j].centre, previous[j].centre)) < 0.09,
        );
    }
    previous = current;
    forward.push(current);
  }
  for (let i = 400; i >= 0; i--)
    assert.deepEqual(frames(11001, i / 200), forward[i]);
  assert.equal(
    escher.geometry,
    undefined,
    "analytic identity cannot be rebuilt on development",
  );
});

test("shader is pinned to the tested covering chart, quotient and conservative flight bounds", () => {
  for (const source of [
    "float h = id * 0.045 - 1.0575;",
    "return vec3(plan.x + 0.6 * h, h, plan.y + h);",
    "float logRadius = log(r) / 1.0986122886681098 + phase;",
    "float angle = atan(p.y, p.x) - 0.5235987755982988 * (logRadius - phase);",
    "float radius = exp(fract(logRadius) * 1.0986122886681098);",
    "esDroste(uv / 0.09, 0.0)",
    "if (bound > 0.08) return vec2(bound, 0.0);",
    "floor(esOtherAddress(chart) + 0.5)",
    "floor(esOtherAddress(pierChart) / 3.0) * 3.0",
    "for (int i = 0; i < 88; ++i)",
    "esShadow(p + n * 0.008, key)",
    "1.0 + 0.018 * u_kick",
  ])
    assert.ok(escher.fragment.includes(source), source);
  const identity = escher.fragment.slice(
    escher.fragment.indexOf("vec3 esCentre"),
    escher.fragment.indexOf("float esAddress"),
  );
  assert.doesNotMatch(identity, /gDev|gRel|gInf|u_time|u_params|u_level/);
  assert.deepEqual(
    escher.rhythm.map((r) => r.defaults.length),
    [4, 8, 16],
  );
  for (const axis of ["x", "y", "z"])
    assert.ok(escher.fragment.includes(`u_rhythm.${axis}`));
});

test("integrated clocks survive rate changes and have exact shader periods for twelve hours", () => {
  const p = escher.schema.map((f) => f.default);
  assert.equal(escher.clocks[0].period, 48);
  near(escher.clocks[1].period, TAU);
  // The walking/address phases are 3 and 5 times the first clock; both
  // complete integer laps of 48 treads at a clock wrap.
  for (const rate of [3, 5]) assert.equal((48 * rate) % 48, 0);
  for (const time of [100, 3600, 7200, 43200]) {
    const state = {};
    advanceClocks(state, escher.clocks, time - 1 / 60, p, 0.1);
    const before = advanceClocks(state, escher.clocks, time, p, 0.1).slice();
    const changed = p.map((v, i) => (i === 1 ? v * 1.8 : v));
    const after = advanceClocks(
      state,
      escher.clocks,
      time + 1 / 60,
      changed,
      0.9,
    );
    for (let i = 0; i < 2; i++) {
      const period = escher.clocks[i].period;
      const delta = (after[i] - before[i] + period) % period;
      assert.ok(delta < 0.01 && Number.isFinite(delta));
    }
  }
});

test("all eight presets validate and the appended world is one continuous development", () => {
  assert.equal(escher.number, 110);
  assert.equal(escher.development, "development");
  assert.deepEqual(escher.type, { key: "development", values: [0, 1, 2] });
  assert.equal(escher.presets.length, 8);
  for (const preset of escher.presets)
    for (const field of escher.schema) {
      assert.ok(
        Number.isFinite(preset.params[field.key]),
        `${preset.name}.${field.key}`,
      );
      assert.ok(
        preset.params[field.key] >= field.min &&
          preset.params[field.key] <= field.max,
      );
    }
  const states = escher.presets.slice(0, 3);
  assert.equal(new Set(states.map((p) => p.seed)).size, 1);
  const rest = ({ params: { development, ...params } }) => params;
  assert.deepEqual(states.map(rest), [
    rest(states[0]),
    rest(states[0]),
    rest(states[0]),
  ]);
  assert.deepEqual(
    continuousDevelopment(
      states.map((_, i) => ({ snapshot: presetSnapshot(escher, i) })),
      escher,
    )?.positions,
    [0, 1, 2],
  );
  const worlds = defaultWorlds(catalogLooks(scenes).map((l) => l.id));
  assert.equal(worlds.at(-1).id, "impossible-stairs");
  assert.deepEqual(
    worlds.at(-1).states.map((s) => s.name),
    ["Stair", "Relativity", "Infinity"],
  );
});
