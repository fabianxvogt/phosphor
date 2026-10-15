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
function profile(q, lift, level = 0.5) {
  const n = q.map((x) => x / Math.max(length(q), 0.00001));
  const chart = [n[0], n[2]].map(
    (x) => x / (1 + Math.sqrt(n[1] * n[1] + 0.025)),
  );
  const grid = chart.map((x, i) => (x + [0.031, -0.017][i]) / FERRO_SPACING);
  const cell = hex(grid);
  const site = grid.map((x, i) => x - cell[i]);
  const value = site[0] * 0.754877666 + site[1] * 0.569840296;
  const cohort = value - Math.floor(value);
  const population = smooth(cohort - 0.14, cohort + 0.14, 0.2 + 0.8 * level);
  const peak = Math.max(0, 1 - (length(cell) * FERRO_SPACING) / 0.139);
  return (
    peak *
    peak *
    mix(0.12, 1, population) *
    mix(smooth(-0.1, 0.3, n[1]), 1, lift)
  );
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
  const radii = [1.9, 0.24 + 0.018 * Math.sin(phase), 1.9].map((x) =>
    mix(x, 1, lift),
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
  const amp = form * (0.25 + 0.16 * lift) * fieldStrength;
  const displacement = amp > 0.00001 ? amp * profile(v, lift, level) : 0;
  const rippleAmp = (1 - form) * 0.006;
  const r = Math.hypot(q[0], q[2]);
  const ripple =
    rippleAmp > 0.00001
      ? rippleAmp *
        Math.sin(17 * r - 2 * phase) *
        Math.exp(-0.45 * r * r) *
        smooth(0, 0.22, r) *
        smooth(0, 0.35, v[1])
      : 0;
  return Math.max(body - (displacement + ripple) * shell, -p[1] - 0.003);
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
    "vec2 chart = n.xz / (1.0 + sqrt(n.y * n.y + 0.025));",
    "vec2 grid = (chart + vec2(0.031, -0.017)) / 0.28;",
    "vec2 site = grid - local;",
    "float cohort = fract(dot(site, vec2(0.754877666, 0.569840296)));",
    "float population = smoothstep(cohort - 0.14, cohort + 0.14, 0.2 + 0.8 * u_level);",
    "float peak = max(0.0, 1.0 - length(local) * 0.28 / 0.139);",
    "float spikes = peak * peak * mix(0.12, 1.0, population);",
    "float body = k0 * (k0 - 1.0) / max(k1, 0.0001);",
    "body = mix(-min(gRadii.x, gRadii.y), body, smoothstep(0.15, 0.5, k0));",
    "float shell = smoothstep(0.3, 0.8, k0);",
    "float displacement = gAmp > 0.00001 ? gAmp * ferroProfile(v) : 0.0;",
    "return max(body - (displacement + ripple) * shell, -p.y - 0.003);",
    "ripple = gRipple * sin(17.0 * r - 2.0 * gPhase) *",
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
  // The equator is C1, not merely C0: mirrored hemispheres have zero
  // chart slope at the join, so the conductor normal cannot flip there.
  for (let a = 0; a < TAU; a += 0.1) {
    const at = (y) => profile([Math.cos(a), y, Math.sin(a)], 1);
    assert.ok(Math.abs(at(1e-8) - at(-1e-8)) < 1e-10);
    const h = 1e-6;
    assert.ok(Math.abs((at(h) - at(0)) / h - (at(0) - at(-h)) / h) < 0.001);
  }
});

test("energy grows persistent lattice sites continuously without retiming the chart", () => {
  let dormant = 0,
    active = 0;
  for (let a = 0; a < TAU; a += 0.07)
    for (let y = -0.9; y < 0.95; y += 0.09) {
      const p = [Math.cos(a), y, Math.sin(a)];
      const low = profile(p, 1, 0.1),
        high = profile(p, 1, 0.9);
      assert.ok(high >= low - 1e-12);
      dormant += Number(low > 0.03);
      active += Number(high > 0.03);
      assert.ok(Math.abs(profile(p, 1, 0.50001) - profile(p, 1, 0.5)) < 0.001);
    }
  assert.ok(active > dormant * 1.3, `${dormant} -> ${active}`);
  assert.match(ferro.fragment, /ferroMap\(p \+ reflected \* 0\.075\)/);
  assert.match(
    ferro.fragment,
    /vec3 bounceDirection = reflect\(reflected, carrierNormal\);/,
  );
});

test("overshot estimator hits are bracketed before shading, including strong-field crowns", () => {
  assert.match(ferro.fragment, /float lo = previous, hi = t;/);
  assert.match(ferro.fragment, /for \(int j = 0; j < 7; \+\+j\)/);
  assert.match(
    ferro.fragment,
    /if \(ferroMap\(ro \+ rd \* mid\) > 0\.0\) lo = mid; else hi = mid;/,
  );
  // CPU mirror of the exact refinement, using actual crown fields rather
  // than a generic sphere. Bracket error contracts by 2^-7.
  let hits = 0;
  for (const x of [-1.6, -1, -0.4, 0.3, 0.9, 1.6]) {
    let previous = 3,
      before = field([x, previous, 0.2], 1, 0.7, 10103, 0.9, 1.2);
    for (let y = 2.95; y >= 0; y -= 0.05) {
      const d = field([x, y, 0.2], 1, 0.7, 10103, 0.9, 1.2);
      if (before > 0 && d < 0) {
        let lo = y,
          hi = previous;
        for (let j = 0; j < 7; j++) {
          const mid = (lo + hi) / 2;
          if (field([x, mid, 0.2], 1, 0.7, 10103, 0.9, 1.2) > 0) hi = mid;
          else lo = mid;
        }
        assert.ok(hi - lo <= 0.05 / 128 + 1e-12);
        assert.ok(field([x, hi, 0.2], 1, 0.7, 10103, 0.9, 1.2) >= 0);
        hits++;
        break;
      }
      previous = y;
      before = d;
    }
  }
  assert.ok(hits >= 4);
  assert.match(ferro.fragment, /if \(rd\.y < -0\.0001 && !mainHit\)/);
});

test("carrier camera bounds, kick and persistent droplets stay bounded", () => {
  // Bound includes maximum spikes, ripples and camera-target offset.
  assert.ok(7.1 - 0.4 > 1.9 + 0.75 + 0.04 + 1.85 * 0.15);
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

test("dark conductor uses separated shaped cards and fits the shallow crown in portrait", () => {
  // Light-card angular area must stay sparse even with the widest preset.
  // Rectangular solid angle on the unit sphere: 4 atan(wh/sqrt(1+w²+h²)).
  const solidAngle = (w, h) => 4 * Math.atan(w * h / Math.sqrt(1 + w * w + h * h));
  const widest = 1.5;
  const coverage = [[0.72, 0.11], [0.12 * widest, 1.15], [1.1, 0.075 * widest],
    [0.045 * widest, 1.4], [0.018 * widest, 0.6]]
    .reduce((s, [w, h]) => s + solidAngle(w, h), 0) / (4 * Math.PI);
  assert.ok(coverage > 0.05 && coverage < 0.12, `${coverage}`);
  assert.match(ferro.fragment, /0\.008 \+ 0\.018 \* smoothstep/);
  assert.match(ferro.fragment, /0\.32 \+ 0\.68 \* exp\(-sq\(uv\.x \/ width\) - sq\(uv\.y \/ height\)\)/);
  assert.match(ferro.fragment, /float portraitFit = mix\(0\.72, 1\.0, smoothstep\(0\.6, 1\.2, u_resolution\.x \/ u_resolution\.y\)\);/);
  assert.match(ferro.fragment, /u_params\[7\] \* portraitFit/);
  assert.doesNotMatch(ferro.fragment, /Lambert|dot\(n, tipLight\)/);
});

test("rate clocks stay periodic and continuous at 3600 seconds and 12 hours", () => {
  assert.match(ferro.fragment, /uniform float u_clock\[4\];/);
  const params = ferro.schema.map((f) => f.default);
  for (const t of [3600, 43200]) {
    const state = {};
    advanceClocks(state, ferro.clocks, t - 1 / 60, params, 0.1);
    const before = advanceClocks(state, ferro.clocks, t, params, 0.1).slice();
    const changed = params.map((p, i) => (i === 2 || i === 3 ? p * 1.5 : p));
    const after = advanceClocks(state, ferro.clocks, t + 1 / 60, changed, 0.9);
    for (let i = 0; i < 3; i++) {
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
