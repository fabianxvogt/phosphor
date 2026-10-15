import test from "node:test";
import assert from "node:assert/strict";
import ferro, {
  criticalWavelength,
  FERRO_SIGMA,
  FERRO_RHO,
  FERRO_G,
  FERRO_SPACING,
  FERRO_METRES_PER_UNIT,
} from "../scene-ferro.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { advanceClocks } from "../scene-time.mjs";

const TAU = 2 * Math.PI;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const length = (v) => Math.hypot(...v);
// Exact mirror of ferroHex, including the tie convention at cell borders.
function hex(p) {
  const period = [1, Math.sqrt(3)];
  const a = p.map((x, i) => x - period[i] * Math.floor(x / period[i] + 0.5));
  const b = p.map((x, i) => x - period[i] * (Math.floor(x / period[i]) + 0.5));
  return length(a) < length(b) ? a : b;
}
function profile(q, lift) {
  const n = q.map((x) => x / Math.max(length(q), 0.00001));
  const chart = [n[0], n[2]].map((x) => x / (1 + Math.abs(n[1])));
  const cell = hex(
    chart.map((x, i) => (x + [0.031, -0.017][i]) / FERRO_SPACING),
  );
  const peak = Math.max(0, 1 - (length(cell) * FERRO_SPACING) / 0.139);
  return peak * peak * mix(smooth(-0.1, 0.3, n[1]), 1, lift);
}
// Mirror of the carrier and signed-distance estimate. Fixed time/seed,
// no identity parameter ever depends on development.
function field(
  p,
  dev,
  phase = 0.7,
  seed = 10101,
  level = 0.5,
  fieldStrength = 0.85,
) {
  const form = smooth(0, 1, dev),
    lift = smooth(1, 2, dev);
  const radii = [1.65, 0.3 + 0.018 * Math.sin(phase), 1.65].map((x) =>
    mix(x, 0.96, lift),
  );
  radii[1] *= 1 + 0.025 * level * Math.sin(phase * 2);
  const centre = [0, 0.23 + 1.25 * lift + 0.035 * Math.sin(phase) * lift, 0];
  const angle = 0.15 * Math.sin(phase) + (seed % 997) * 0.0063;
  const q = p.map((x, i) => x - centre[i]);
  // GLSL rot2 has columns (c,-s),(s,c).
  [q[0], q[2]] = [
    Math.cos(angle) * q[0] + Math.sin(angle) * q[2],
    -Math.sin(angle) * q[0] + Math.cos(angle) * q[2],
  ];
  const v = q.map((x, i) => x / radii[i]);
  const k0 = length(v),
    k1 = length(q.map((x, i) => x / (radii[i] * radii[i])));
  const estimate = (k0 * (k0 - 1)) / Math.max(k1, 0.0001);
  const body = mix(
    -Math.min(radii[0], radii[1]),
    estimate,
    smooth(0.15, 0.5, k0),
  );
  const shell = smooth(0.3, 0.8, k0);
  return Math.max(
    body -
      form * (0.25 + 0.16 * lift) * fieldStrength * profile(v, lift) * shell,
    -p[1] - 0.003,
  );
}

test("critical Rosensweig wavelength minimizes the capillary/gravity threshold", () => {
  const lambda = criticalWavelength(FERRO_SIGMA, FERRO_RHO, FERRO_G);
  assert.ok(lambda > 0.009 && lambda < 0.01, `physical wavelength ${lambda} m`);
  assert.equal(lambda, FERRO_SPACING * FERRO_METRES_PER_UNIT);
  const kc = TAU / lambda;
  const threshold = (k) => FERRO_SIGMA * k + (FERRO_RHO * FERRO_G) / k;
  for (const factor of [0.25, 0.5, 0.9, 1.1, 2, 4])
    assert.ok(threshold(kc) < threshold(kc * factor));
  assert.ok(
    Math.abs(
      criticalWavelength(FERRO_SIGMA * 4, FERRO_RHO, FERRO_G) / lambda - 2,
    ) < 1e-14,
  );
});

test("hexagonal lattice has six nearest neighbours at the critical spacing", () => {
  const sites = [];
  for (let j = -4; j <= 4; j++)
    for (let i = -4; i <= 4; i++)
      sites.push([
        (i + j * 0.5) * FERRO_SPACING,
        j * Math.sqrt(3) * 0.5 * FERRO_SPACING,
      ]);
  const neighbours = sites.filter(
    (p) => Math.abs(length(p) - FERRO_SPACING) < 1e-12,
  );
  assert.equal(neighbours.length, 6);
  const angles = neighbours
    .map((p) => (Math.atan2(p[1], p[0]) + TAU) % TAU)
    .sort((a, b) => a - b);
  for (let i = 0; i < 6; i++)
    assert.ok(
      Math.abs(((angles[(i + 1) % 6] - angles[i] + TAU) % TAU) - TAU / 6) <
        1e-12,
    );
  // Check the two-coset shortcut against brute force, not against itself.
  for (let x = -0.8; x <= 0.8; x += 0.037)
    for (let y = -0.8; y <= 0.8; y += 0.041) {
      const d =
        length(hex([x / FERRO_SPACING, y / FERRO_SPACING])) * FERRO_SPACING;
      const brute = Math.min(
        ...sites.map((p) => Math.hypot(x - p[0], y - p[1])),
      );
      assert.ok(Math.abs(d - brute) < 1e-12);
    }
});

test("hex distance is invariant under 60-degree rotation and lattice translation", () => {
  for (let x = -3; x <= 3; x += 0.137)
    for (let y = -3; y <= 3; y += 0.173) {
      const p = [x, y],
        d = length(hex(p));
      assert.ok(
        Math.abs(
          d -
            length(
              hex([
                x * 0.5 - (y * Math.sqrt(3)) / 2,
                (x * Math.sqrt(3)) / 2 + y * 0.5,
              ]),
            ),
        ) < 1e-12,
      );
      assert.ok(
        Math.abs(d - length(hex([x + 0.5, y + Math.sqrt(3) / 2]))) < 1e-12,
      );
    }
});

test("the shader remains pinned to the tested chart, lattice, profile and carrier", () => {
  for (const source of [
    "const vec2 period = vec2(1.0, 1.7320508075688772);",
    "vec2 a = p - period * floor(p / period + 0.5);",
    "vec2 b = p - period * (floor(p / period) + 0.5);",
    "return dot(a, a) < dot(b, b) ? a : b;",
    "vec2 chart = n.xz / (1.0 + abs(n.y));",
    "ferroHex((chart + vec2(0.031, -0.017)) / 0.28) * 0.28",
    "float peak = max(0.0, 1.0 - length(cell) / 0.139);",
    "float spikes = peak * peak;",
    "float body = k0 * (k0 - 1.0) / max(k1, 0.0001);",
    "body = mix(-min(gRadii.x, gRadii.y), body, smoothstep(0.15, 0.5, k0));",
    "float shell = smoothstep(0.3, 0.8, k0);",
    "return max(body - gAmp * ferroProfile(v) * shell, -p.y - 0.003);",
  ])
    assert.ok(ferro.fragment.includes(source), source);
  const chartSource = ferro.fragment.slice(
    ferro.fragment.indexOf("vec2 ferroHex"),
    ferro.fragment.indexOf("float ferroMap"),
  );
  assert.doesNotMatch(chartSource, /u_time|u_params\[0\]|gForm/);
  assert.equal(
    ferro.geometry,
    undefined,
    "no development-triggered geometry rebuild",
  );
});

test("the exact field is finite and continuous through the entire development, including reversal", () => {
  for (const p of [
    [0, 0, 0],
    [0, 0.23, 0],
    [0.1, 0.6, 0.4],
    [1, 0.2, -0.8],
    [0, 1.6, 1],
    [-1.3, 1.8, 0.3],
  ]) {
    const forward = [];
    for (let i = 0; i <= 400; i++) {
      const d = field(p, i / 200);
      assert.ok(Number.isFinite(d));
      forward.push(d);
      if (i) assert.ok(Math.abs(d - forward[i - 1]) < 0.15, `${p}: step ${i}`);
    }
    for (let i = 400; i >= 0; i--) assert.equal(field(p, i / 200), forward[i]);
    for (const boundary of [0, 1, 2])
      assert.ok(
        Math.abs(field(p, boundary + 1e-6) - field(p, boundary - 1e-6)) < 1e-8,
      );
  }
  // Stereographic hemispheres meet continuously at the equator.
  for (let a = 0; a < TAU; a += 0.1)
    assert.ok(
      Math.abs(
        profile([Math.cos(a), 1e-8, Math.sin(a)], 1) -
          profile([Math.cos(a), -1e-8, Math.sin(a)], 1),
      ) < 1e-10,
    );
});

test("carrier camera bounds, kick and persistent droplets stay bounded", () => {
  // Any carrier is within 1.65 + max displacement 0.75 of its centre.
  // The camera is 7.6 from its target, whose offset to the centre is < 0.4.
  assert.ok(7.6 - 0.4 > 1.65 + 0.75 + 1.85 * 0.15);
  assert.match(ferro.fragment, /1\.0 \+ 0\.022 \* u_kick/);
  assert.match(
    ferro.fragment,
    /float growth = gLift \* gLift \* u_params\[6\];/,
  );
  assert.match(ferro.fragment, /id \* 2\.39996323 \+ gPhase \+ seedAngle/);
  assert.deepEqual(
    ferro.rhythm.map((r) => r.defaults.length),
    [4, 8, 16],
  );
  for (const channel of ["x", "y", "z"])
    assert.ok(ferro.fragment.includes(`u_rhythm.${channel}`));
});

test("rate clocks stay periodic and continuous at 3600 seconds and 12 hours", () => {
  const params = ferro.schema.map((f) => f.default);
  for (const t of [3600, 43200]) {
    const state = {};
    advanceClocks(state, ferro.clocks, t - 1 / 60, params, 0.1);
    const before = advanceClocks(state, ferro.clocks, t, params, 0.1).slice();
    const changed = params.map((p, i) => (i === 2 || i === 3 ? p * 1.5 : p));
    const after = advanceClocks(state, ferro.clocks, t + 1 / 60, changed, 0.9);
    for (let i = 0; i < 2; i++) {
      const delta = (after[i] - before[i] + TAU) % TAU;
      assert.ok(delta < 0.01 && Number.isFinite(delta));
    }
  }
});

test("all eight looks validate and the appended world is continuously playable", () => {
  assert.equal(ferro.number, 101);
  assert.equal(ferro.development, "development");
  assert.deepEqual(ferro.type.values, [0, 1, 2]);
  assert.ok(ferro.presets.length >= 8);
  for (const preset of ferro.presets)
    for (const f of ferro.schema)
      assert.ok(
        Number.isFinite(preset.params[f.key]) &&
          preset.params[f.key] >= f.min &&
          preset.params[f.key] <= f.max,
        `${preset.name}.${f.key}`,
      );
  const first = ferro.presets.slice(0, 3);
  assert.equal(new Set(first.map((p) => p.seed)).size, 1);
  assert.deepEqual(
    first.map(({ params: { development, ...params } }) => params),
    Array.from({ length: 3 }, () => {
      const { development, ...p } = first[0].params;
      return p;
    }),
  );
  const world = defaultWorlds(catalogLooks(scenes).map((l) => l.id)).find(
    (w) => w.id === "liquid-chrome",
  );
  assert.ok(world);
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Pool", "Crown", "Sculpture"],
  );
  assert.deepEqual(
    continuousDevelopment(
      first.map((_, i) => ({ snapshot: presetSnapshot(ferro, i) })),
      ferro,
    )?.positions,
    [0, 1, 2],
  );
});
