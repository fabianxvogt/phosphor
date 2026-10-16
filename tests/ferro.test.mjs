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
import { defaultPattern, samplePattern } from "../rhythm.mjs";

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
function profile(q, lift, level = 0.5, strike = 0, poleAngle = 0) {
  const chart = [q[0], q[2]].map(
    (x, i) =>
      x -
      [Math.cos(poleAngle), Math.sin(poleAngle)][i] *
        strike *
        Math.max(q[1], 0) *
        0.38,
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
    (1 - smooth(1.42, 1.84, Math.hypot(q[0], q[2]))) *
    (1 + 0.4 * strike)
  );
}
// Mirror of the grounded height surface and signed-distance estimate.
// Fixed time/seed; no lattice identity depends on development.
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
  const angle = 0.15 * Math.sin(phase) + (seed % 997) * 0.0063;
  const q = [...p];
  // GLSL rot2 has columns (c,-s),(s,c).
  [q[0], q[2]] = [
    Math.cos(angle) * q[0] + Math.sin(angle) * q[2],
    -Math.sin(angle) * q[0] + Math.cos(angle) * q[2],
  ];
  const r = Math.hypot(q[0], q[2]);
  const lensBase = Math.max(0, 1 - (r * r) / 3.61);
  const lens = 0.1 * lensBase * Math.sqrt(lensBase);
  const mound =
    0.54 * lift * Math.exp((-r * r) / 1.35) * (1 - smooth(1.5, 1.9, r));
  const amp =
    form * (0.25 + 0.18 * lift) * fieldStrength * (0.65 + 0.45 * level);
  const peaks = amp > 0.00001 ? amp * profile(q, lift, level) : 0;
  const ripple =
    (1 - 0.8 * form) *
    0.006 *
    Math.sin(17 * r - 2 * phase) *
    Math.exp(-0.45 * r * r) *
    smooth(0, 0.22, r) *
    (1 - smooth(1.5, 1.9, r));
  return Math.max(
    Math.max(
      (p[1] - lens - mound - peaks - ripple) * mix(0.85, 0.35, form),
      r - 1.9,
    ),
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
    "vec2 chart = q.xz - gPole * gStrike * max(q.y, 0.0) * 0.38;",
    "vec2 grid = (chart + vec2(0.031, -0.017)) / 0.28;",
    "vec2 site = grid - local;",
    "float cohort = fract(dot(site, vec2(0.754877666, 0.569840296)));",
    "float population = smoothstep(cohort - 0.14, cohort + 0.14, 0.2 + 0.8 * u_level);",
    "float peak = max(0.0, 1.0 - length(local) * 0.28 / 0.139);",
    "float spikes = peak * peak * mix(0.12, 1.0, population);",
    "float lens = 0.10 * lensBase * sqrt(lensBase);",
    "float mound = 0.54 * gLift * exp(-r * r / 1.35) * (1.0 - smoothstep(1.5, 1.9, r));",
    "float peaks = gAmp > 0.00001 ? gAmp * ferroProfile(q) : 0.0;",
    "float safety = mix(0.85, 0.35, gForm);",
    "return max(max((p.y - height) * safety, r - 1.9), -p.y - 0.003);",
    "float height = lens + mound + peaks + ripple;",
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
  // Every development remains connected to the pool, not a floating ball.
  for (const dev of [0, 0.25, 0.75, 1, 1.5, 2])
    for (const x of [-1.4, -0.7, 0, 0.7, 1.4])
      assert.ok(field([x, 0, 0], dev) < 0);
  // The lens reaches the puddle tangentially rather than a hard rim wall.
  const lens = (r) => 0.1 * Math.max(0, 1 - (r * r) / 3.61) ** 1.5;
  assert.equal(lens(1.9), 0);
  assert.ok(lens(1.9 - 1e-6) / 1e-6 < 0.001);
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
  assert.ok(6.4 - 0.5 > 1.9 + 1.6 + 0.04);
  assert.match(ferro.fragment, /1\.0 \+ 0\.022 \* u_kick/);
  assert.match(
    ferro.fragment,
    /float growth = gLift \* gLift \* u_params\[6\];/,
  );
  assert.match(ferro.fragment, /id \* 2\.39996323 \+ gPhase \+ seedAngle/);
  assert.deepEqual(
    ferro.rhythm.map((r) => r.defaults.length),
    [4, 8, 16, 32],
  );
  for (const channel of ["x", "y", "z", "w"])
    assert.ok(ferro.fragment.includes(`u_rhythm.${channel}`));
});

test("dark conductor uses graduated reflection windows and fits the shallow crown in portrait", () => {
  // Discrete softbox cards leave dark gaps even in the widest preset.
  // Rectangular solid angle on the unit sphere: 4 atan(wh/sqrt(1+w²+h²)).
  const solidAngle = (w, h) =>
    4 * Math.atan((w * h) / Math.sqrt(1 + w * w + h * h));
  const widest = 1.5;
  const coverage =
    [
      [0.72, 0.25],
      [0.7, 0.12],
      [0.12 * widest, 1.15],
      [0.2 * widest, 0.85],
      [1.1, 0.075 * widest],
      [0.11 * widest, 1.4],
    ].reduce((s, [w, h]) => s + solidAngle(w, h), 0) /
    (4 * Math.PI);
  assert.ok(coverage > 0.1 && coverage < 0.25, `${coverage}`);
  assert.match(ferro.fragment, /0\.025 \+ 0\.10 \* smoothstep/);
  assert.match(ferro.fragment, /window \* mullion/);
  assert.match(ferro.fragment, /silver \* 0\.62 \* exp/);
  assert.match(ferro.fragment, /float\(i\) >= u_raySteps/);
  assert.match(
    ferro.fragment,
    /0\.32 \+ 0\.68 \* exp\(-sq\(uv\.x \/ width\) - sq\(uv\.y \/ height\)\)/,
  );
  assert.match(
    ferro.fragment,
    /float portraitFit = mix\(0\.72, 1\.0, smoothstep\(0\.6, 1\.2, u_resolution\.x \/ u_resolution\.y\)\);/,
  );
  assert.match(ferro.fragment, /u_params\[7\] \* portraitFit/);
  assert.doesNotMatch(ferro.fragment, /Lambert|dot\(n, tipLight\)/);
});

test("magnetic strike is slot 3, bounded to fixed sites, and every preset is full", () => {
  const strike = ferro.rhythm.find((r) => r.id === "magnetic-strike");
  assert.equal(strike.slot, 3);
  for (const uniform of ["u_rhythm.w", "u_rhythmHit.w", "u_rhythmCount.w"])
    assert.ok(ferro.fragment.includes(uniform));
  assert.match(
    ferro.fragment,
    /gAmp \* \(1\.0 \+ 0\.40 \* max\(gStrike, 0\.0\)\)/,
  );
  assert.match(
    ferro.fragment,
    /return spikes \* edge \* \(1\.0 \+ 0\.40 \* gStrike\)/,
  );
  assert.match(ferro.fragment, /mod\(u_rhythmCount\.w, 2\.0\) \* 3\.141592654/);
  assert.match(ferro.fragment, /gWave = 1\.15 \+ 1\.50 \* \(1\.0 - event\)/);
  const names = ["Still mercury", "Magnetic breath", "Chrome resonance"];
  for (const [index, style] of [
    "restrained",
    "driving",
    "accented",
  ].entries()) {
    assert.equal(ferro.rhythmStyles[style], names[index]);
    const pattern = defaultPattern(ferro.rhythm, style);
    const track = pattern.tracks.find((t) => t.effect === strike.id);
    assert.deepEqual(track, { ...strike.styles[style], effect: strike.id });
    const hits = track.steps.flatMap((v, i) => (v > 0 ? [i] : []));
    assert.ok(hits.length >= 2);
    const gap = Math.min(
      ...hits.map(
        (i, n) =>
          ((hits[(n + 1) % hits.length] - i + track.length) % track.length) /
          track.division,
      ),
    );
    assert.ok(track.duration < gap, `${style}: settles before next pole`);
    const density = pattern.tracks.reduce(
      (sum, t) =>
        sum + (t.steps.filter((s) => s > 0).length * t.division * 4) / t.length,
      0,
    );
    assert.ok(density >= [2, 6, 8][index], `${style}: ${density}`);
    const muted = structuredClone(pattern);
    muted.tracks.forEach((t) => {
      t.muted = true;
    });
    assert.deepEqual(
      samplePattern(muted, ferro.rhythm, 4, 3.9).values,
      [0, 0, 0, 0],
    );
  }
  for (let a = 0; a < TAU; a += 0.11) {
    // At the foot the shear is zero and every pole gives exactly +40%.
    const foot = [Math.cos(a), 0, Math.sin(a)];
    const base = profile(foot, 1, 0.85);
    for (const pole of [0, TAU / 4, TAU / 2, (3 * TAU) / 4]) {
      const top = profile(foot, 1, 0.85, 1, pole);
      assert.ok(Math.abs(top - base * 1.4) < 1e-12);
      assert.equal(profile(foot, 1, 0.85, 0, pole), base);
      assert.ok(Math.abs(profile(foot, 1, 0.85, 1e-6, pole) - base) < 1e-6);
    }
  }
});

test("strike settles with overshoot and its pressure front moves outward", () => {
  const impulse = (e) => e * (1 - 1.3 * Math.exp(-(((e - 0.16) / 0.09) ** 2)));
  assert.ok(impulse(1) > 0.999);
  assert.ok(impulse(0.16) < 0);
  assert.equal(impulse(0), 0);
  let previous = 0;
  for (let e = 1; e >= 0; e -= 0.01) {
    const wave = 1.15 + 1.5 * (1 - e);
    assert.ok(wave >= previous);
    previous = wave;
    assert.ok(impulse(e) >= -0.06 && impulse(e) <= 1);
  }
  const accented = defaultPattern(ferro.rhythm, "accented");
  const beats = (id) => {
    const track = accented.tracks.find((t) => t.effect === id);
    return track.length / track.division;
  };
  assert.equal(beats("spike-swell"), 12);
  assert.equal(beats("droplet-orbit"), 16);
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
