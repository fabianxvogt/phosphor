import test from "node:test";
import assert from "node:assert/strict";
import ink, {
  INK_RING,
  INK_SPEED,
  kelvinVelocity,
  inkIdentity,
  inkVelocity,
  inkCascade,
  inkRim,
  kadenPhase,
  kadenRadius,
  seedHash,
  INK_FLOW,
  INK_ATMOS,
  inkStream,
  inkCross,
  inkSheetIntegral,
  inkEventProgress,
  inkAngle,
} from "../scene-ink.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { advanceClocks } from "../scene-time.mjs";

const TAU = 2 * Math.PI;
const SQRT_PI = Math.sqrt(Math.PI);

test("stream surfaces bound the atmosphere; retained crossing reference recovers hidden folds", () => {
  assert.ok(INK_FLOW.k > 0 && INK_FLOW.U > 0);
  for (const angle of [0, 0.3, 1.2, 2.7]) {
    const r = 1 + INK_ATMOS * Math.cos(angle);
    const y = INK_ATMOS * Math.sin(angle);
    assert.ok(Math.abs(inkStream(r, y)) < 1e-12);
  }
  assert.ok(inkStream(1, 0) > 0);
  assert.ok(inkStream(1, 2) < 0);
  assert.equal(inkCross(0.1, 0.4, 1.1, 1, 1), 1);
  assert.equal(inkCross(1.1, 0.4, 0.1, 1, 1), 0);
  // A parabola touches above 1 between the last two samples, then returns:
  // both endpoints stay below 1 but the fold crosses it twice.
  assert.equal(inkCross(0.1, 0.99, 0.8, 1, 1), 2);
});

test("Kelvin thin-ring velocity has the correct constant, dimensions, sign and core dependence", () => {
  assert.equal(kelvinVelocity(4 * Math.PI, 1, 8 / Math.E ** 3), 2.75);
  const { gamma, radius, core } = INK_RING;
  assert.equal(INK_SPEED, kelvinVelocity(gamma, radius, core));
  assert.ok(INK_SPEED > 0.25 && INK_SPEED < 0.3);
  for (const scale of [0.1, 0.5, 2, 10]) {
    assert.ok(
      Math.abs(
        kelvinVelocity(gamma, radius * scale, core * scale) * scale - INK_SPEED,
      ) < 1e-14,
    );
    assert.ok(
      Math.abs(
        kelvinVelocity(gamma * scale, radius, core) - INK_SPEED * scale,
      ) < 1e-14,
    );
  }
  assert.equal(kelvinVelocity(-gamma, radius, core), -INK_SPEED);
  assert.ok(kelvinVelocity(gamma, radius, core / 2) > INK_SPEED);
  for (const args of [
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 2],
  ])
    assert.throws(() => kelvinVelocity(...args), RangeError);
  // The transport clock is the Kelvin speed (seamless 2 pi period).
  assert.ok(ink.fragment.includes(INK_SPEED.toFixed(10)));
  assert.equal(ink.clocks[0].rate([0, 1]), INK_SPEED);
});

test("analytic toroidal velocity matches independent streamfunction derivatives and is incompressible", () => {
  const { gamma, radius } = INK_RING,
    a = 0.32,
    h = 1e-5;
  const psi = (r, y) =>
    (gamma / TAU) * r * r * Math.exp(-((r - radius) ** 2 + y * y) / (a * a));
  for (const r of [0.1, 0.4, 0.82, 1, 1.3])
    for (const y of [-0.4, -0.1, 0, 0.2]) {
      const v = inkVelocity([r, y, 0]);
      assert.ok(
        Math.abs(v[0] + (psi(r, y + h) - psi(r, y - h)) / (2 * h * r)) < 1e-7,
      );
      assert.ok(
        Math.abs(
          v[1] +
            kelvinVelocity(gamma, radius, a) -
            (psi(r + h, y) - psi(r - h, y)) / (2 * h * r),
        ) < 1e-7,
      );
      const p = [r / Math.sqrt(2), y, r / Math.sqrt(2)];
      let divergence = 0;
      for (let i = 0; i < 3; i++) {
        const up = [...p],
          down = [...p];
        up[i] += h;
        down[i] -= h;
        divergence += (inkVelocity(up)[i] - inkVelocity(down)[i]) / (2 * h);
      }
      assert.ok(Math.abs(divergence) < 1e-7);
    }
  assert.ok(inkVelocity([0.82, 0.2, 0])[0] > 0);
  assert.ok(inkVelocity([0.82, -0.2, 0])[0] < 0);
  assert.ok(inkVelocity([100, 0, 0])[1] < 0);
  assert.ok(inkVelocity([0, 0, 0]).every(Number.isFinite));
});

test("Kaden roll-up: sheets lie on rho/a = (c/theta)^(2/3), denser toward the core", () => {
  for (const c of [4, 6.5, 9])
    for (const theta of [0.5, 1, 3, 8, 20]) {
      const x = kadenRadius(theta, c);
      assert.ok(Math.abs(kadenPhase(x, theta, c)) < 1e-9);
      // Successive turns (theta + 2 pi) sit closer together further in.
      const inner = kadenRadius(theta + TAU, c),
        inner2 = kadenRadius(theta + 2 * TAU, c);
      assert.ok(inner < x && inner2 < inner && x - inner > inner - inner2);
    }
  // The shader phase is c x^-1.5 - theta + roll with |grad| from dPhi/dx.
  assert.match(ink.fragment, /K=turns\/\(x\*sqrt\(x\)\)/);
  assert.match(ink.fragment, /FP=rP\.x\+gRoll-rP\.y/);
  const x = 0.9,
    c = 6,
    h = 1e-6;
  const dPhi = (kadenPhase(x + h, 0, c) - kadenPhase(x - h, 0, c)) / (2 * h);
  assert.ok(Math.abs(dPhi + (1.5 * c * x ** -1.5) / x) < 1e-5);
});

test("seeded Widnall identity: lobe count and azimuths never depend on development", () => {
  const counts = new Set();
  for (const seed of [11201, 11202, 11203, 11204, 11205, 11206, 7, 99991]) {
    const id = inkIdentity(seed);
    assert.ok([5, 6, 7].includes(id.lobes));
    assert.equal(id.lobes, 5 + ((seed + 2) % 3));
    assert.equal(id.daughterLobes, id.lobes > 5 ? 4 : 3);
    assert.ok(id.lobePhase >= 0 && id.lobePhase < TAU / id.lobes);
    assert.deepEqual(inkIdentity(seed), id);
    counts.add(id.lobes);
  }
  assert.deepEqual([...counts].sort(), [5, 6, 7]);
  assert.equal(inkIdentity(11201).lobes, 6);
  // CPU transcription of the shader header's hash (spot values).
  assert.equal(seedHash(0), 0);
  assert.notEqual(seedHash(11201), seedHash(11202));
  assert.match(ink.fragment, /gN=5\.0\+float\(\(u_seedBits\+2u\)%3u\)/);
  assert.match(
    ink.fragment,
    /gLobe=float\(seedHash\(u_seedBits\)%1000u\)\/1000\.0\*TAU\/gN/,
  );
  // Lobe peaks of the rim go outward and down by the same amplitude.
  const { lobes, lobePhase } = inkIdentity(11201);
  for (let k = 0; k < lobes; k++) {
    const [r, y] = inkRim(lobePhase + (k * TAU) / lobes, 0.1, lobes, lobePhase);
    assert.ok(Math.abs(r - 1.055) < 1e-12 && Math.abs(y + 0.1) < 1e-12);
    const [r2, y2] = inkRim(
      lobePhase + ((k + 0.5) * TAU) / lobes,
      0.1,
      lobes,
      lobePhase,
    );
    assert.ok(r2 < 1 && y2 > 0);
  }
});

test("cascade morph is continuous and reversible: lobes neck, pinch and re-absorb", () => {
  const keys = (c) => [
    c.g1,
    c.g2,
    c.lobeAmp,
    c.bud,
    c.pinch,
    ...c.peak,
    ...c.daughterCentre,
    c.daughterRadius,
    c.daughterTilt,
    c.radius,
    c.neck,
  ];
  let previous = keys(inkCascade(0));
  for (let i = 1; i <= 2000; i++) {
    const dev = i / 1000,
      now = keys(inkCascade(dev));
    now.forEach((v, j) => {
      assert.ok(Number.isFinite(v));
      // Lipschitz-bounded in development (the dissolving neck is steepest).
      assert.ok(
        Math.abs(v - previous[j]) < (j === 12 ? 0.02 : 0.004),
        `jump at ${dev} key ${j}`,
      );
    });
    // Reversal: the same development is the same form, from either side.
    assert.deepEqual(keys(inkCascade(dev)), now);
    previous = now;
  }
  const drop = inkCascade(0),
    half = inkCascade(0.5),
    plumes = inkCascade(1),
    nebula = inkCascade(2);
  // Daughters are born AT the rim lobe (no pop from nowhere) ...
  assert.deepEqual(drop.daughterCentre, drop.peak);
  assert.ok(drop.daughterRadius >= 0.05 && drop.pinch === 0);
  // ... are half-pinched at 0.5 ...
  assert.ok(
    half.bud > 0.3 && half.bud < 0.7 && half.pinch > 0 && half.pinch < 0.5,
  );
  // ... separate fully at Plumes, leaving no string behind, and stay
  // secondary to the primary ring ...
  assert.equal(plumes.pinch, 1);
  assert.equal(plumes.neck, 0);
  assert.ok(half.neck === 1 && plumes.daughterRadius < 0.4);
  assert.ok(plumes.daughterCentre[1] < plumes.peak[1] - 0.8);
  // ... and at the peak bloom: they rise to the rim, travel outward and
  // roll over (axis tilted past 80 degrees), still smaller than the parent.
  assert.ok(nebula.g2 === 1 && nebula.daughterRadius < 0.4 * nebula.radius);
  assert.ok(nebula.daughterCentre[1] > plumes.daughterCentre[1] + 0.8);
  assert.ok(nebula.daughterCentre[0] > plumes.daughterCentre[0] + 0.7);
  assert.ok(nebula.daughterTilt > 1.4);
  // The shader carries the same schedule.
  for (const source of [
    "gLobeAmp=0.035+0.15*smoothstep(0.0,0.55,gG1)*gFinger",
    "gBud=smoothstep(0.05,0.95,gG1)",
    "gRP=1.0+0.3*gG2",
    "gDC=vec2(gPeak.x+(0.35*gBud*gFinger+0.55*gG2)*u_params[5],",
    "gPeak.y-1.15*gBud*gFinger*(1.0-0.8*gG2)+0.2*gG2)",
    "gTiltC=cos(0.5*gBud+1.0*gG2)",
    "gRd=mix(0.05,0.3,smoothstep(0.15,0.85,gG1))+0.06*gG2",
  ])
    assert.ok(ink.fragment.includes(source), source);
});

test("sheet integral reference and characteristic dye have no opaque isosurfaces", () => {
  // Numerical integral of rho exp(-d^2/w^2) along a ray crossing a sheet at
  // angle: rho w sqrt(pi) / |cos|.
  const integrate = (f, a, b, n = 200000) => {
    let sum = 0;
    const h = (b - a) / n;
    for (let i = 0; i < n; i++) sum += f(a + (i + 0.5) * h);
    return sum * h;
  };
  for (const cos of [1, 0.5, 0.2]) {
    const w = 0.012,
      numeric = integrate((s) => Math.exp(-((s * cos) ** 2) / w ** 2), -1, 1);
    assert.ok(Math.abs(numeric - (w * SQRT_PI) / cos) < 1e-6);
  }
  assert.ok(Math.abs(1.7725 - SQRT_PI) < 1e-4);
  assert.match(ink.precompute.fragment, /vec3 X=inkOrigin\(p\)/);
  assert.match(ink.fragment, /vec3 q=vec3\(s\.xy,max\(gRP\+s\.x,0\.08\)\)/);
  // Cache only smooth poloidal coordinates, never palette or density.
  assert.doesNotMatch(
    ink.precompute.fragment,
    /u_primary|u_secondary|u_accent/,
  );
  assert.match(ink.precompute.fragment, /return vec4\(q\.xy,daughter\)/);
  assert.match(ink.fragment, /inkSheet\(havePrev\?prevP:skinP,skinP,w,len\)/);
  assert.match(ink.fragment, /inkSpiral\(havePrev\?prevFP:FP,FP,wfP,len\)/);
  assert.doesNotMatch(ink.fragment, /dot\(p,vec3\(31,7,-19\)\)/);
  assert.doesNotMatch(ink.fragment, /INK_ISO|inkCarve|prevField/);
  // The straight drop tail and pinched-neck threads are gone (L0 review):
  // necks dissolve as they pinch, wakes are the bells.
  assert.doesNotMatch(ink.fragment, /twisted pair of threads|sine\*span/);
});

test("native quartic quadrature resolves sub-step sheets, including reverse rays", () => {
  for (const width of [0.003, 0.013, 0.02]) {
    for (const [d0, d1] of [
      [-0.4, 0.3],
      [0.3, -0.4],
      [-0.01, 0.03],
      [0.4, 0.5],
      [0, 0],
    ]) {
      const n = 20000;
      let reference = 0;
      for (let i = 0; i < n; i++) {
        const d = d0 + ((d1 - d0) * (i + 0.5)) / n;
        reference += Math.max(1 - ((0.6 * d) / width) ** 2, 0) ** 2 / n;
      }
      assert.ok(
        Math.abs(inkSheetIntegral(d0, d1, width, 1) - reference) < 0.002,
      );
    }
  }
});

test("native range-reduced angle preserves sheet phase in every quadrant", () => {
  for (let i = 0; i <= 10000; i++) {
    const a = -Math.PI + (2 * Math.PI * i) / 10000;
    const p = [Math.cos(a), Math.sin(a)];
    assert.ok(Math.abs(inkAngle(p) - Math.atan2(p[1], p[0])) < 0.00021);
  }
  assert.equal(inkAngle([0, 0]), 0);
});

test("packet flight recovers envelope progress, keeps four filaments and fill timing", () => {
  for (let i = 0; i <= 100; i++) {
    const progress = i / 100;
    const x = 1 - progress;
    assert.ok(
      Math.abs(inkEventProgress(0.9 * x * x * (3 - 2 * x)) - progress) < 1e-7,
    );
  }
  assert.match(ink.fragment, /for \(int i=0;i<4;\+\+i\)/);
  assert.match(ink.fragment, /dir\*0\.62\*fly/);
  assert.match(
    ink.fragment,
    /inkLayer\(heart\.x\*dense,heart\.y,accent\*0\.03/,
  );
  assert.match(ink.fragment, /inkMiss\(ro,rd,centre,radius\)/);
  const density = (style) =>
    ink.rhythm.reduce((sum, gesture) => {
      const pattern = gesture.styles[style];
      return (
        sum +
        (pattern.steps.filter((v) => v > 0).length * 4 * pattern.division) /
          pattern.steps.length
      );
    }, 0);
  assert.ok(density("driving") >= 6);
  assert.ok(density("accented") >= 8);
  assert.equal(ink.rhythm[2].styles.driving.steps.length, 6);
  assert.equal(ink.rhythm[2].styles.accented.steps.length, 12);
  for (const style of ["restrained", "driving", "accented"]) {
    const p = ink.rhythm[3].styles[style];
    p.steps.forEach((hit, i) => {
      if (hit)
        assert.ok(
          (i / p.division) % 8 >= 6,
          `${style} hit at beat ${i / p.division}`,
        );
    });
  }
});

test("guttered half-float coordinate atlas has bijective nodes and matching shader layout", () => {
  const grid = [64, 96, 64],
    tile = [66, 98],
    columns = 16,
    atlas = [tile[0] * columns, tile[1] * Math.ceil(grid[2] / columns)];
  assert.deepEqual(ink.precompute.size, atlas);
  assert.equal(ink.precompute.filter, "linear");
  assert.equal(ink.precompute.format, "rgba16f");
  const addresses = new Set();
  for (let z = 0; z < grid[2]; z++)
    for (let y = 0; y < grid[1]; y++)
      for (let x = 0; x < grid[0]; x++) {
        const u = (z % columns) * tile[0] + x + 1,
          v = Math.floor(z / columns) * tile[1] + y + 1;
        assert.ok(u > 0 && u < atlas[0] && v > 0 && v < atlas[1]);
        // The bilinear footprint stays inside its slice (one-node gutter).
        assert.ok(u % tile[0] >= 1 && u % tile[0] <= grid[0]);
        assert.ok(v % tile[1] >= 1 && v % tile[1] <= grid[1]);
        // The precompute pass decodes the same node from that pixel.
        assert.equal(
          Math.floor(v / tile[1]) * columns + Math.floor(u / tile[0]),
          z,
        );
        assert.equal(Math.min(Math.max((u % tile[0]) - 1, 0), grid[0] - 1), x);
        addresses.add(v * atlas[0] + u);
      }
  assert.equal(addresses.size, grid[0] * grid[1] * grid[2]);
  for (const source of [
    "const vec3 INK_GRID=vec3(64,96,64);",
    "const vec2 INK_TILE=vec2(66,98);",
    "const vec2 INK_ATLAS=vec2(1056,392);",
  ])
    assert.ok(ink.fragment.includes(source), source);
  assert.ok(ink.precompute.fragment.includes("int z=(py/98)*16+pixel.x/66;"));
  // Trilinear interpolation of a 1-Lipschitz distance errs by at most half a
  // cell diagonal; the skip subtracts more than that.
  assert.match(
    ink.fragment,
    /skipMargin=0\.6\*length\(2\.0\*bound\/\(INK_GRID-1\.0\)\)/,
  );
});

test("time stays seamless: every clock phase has an integer coefficient", () => {
  const glsl = ink.fragment + ink.precompute.fragment;
  assert.doesNotMatch(glsl, /fract\([^)]*u_time|mod\(u_time/);
  for (const [, coefficient] of glsl.matchAll(/([0-9.]+)\*gPhase/g))
    assert.ok(
      Number.isInteger(Number(coefficient)),
      `gPhase coefficient ${coefficient}`,
    );
  const p = ink.schema.map((f) => f.default);
  for (const t of [3600, 4096, 43200]) {
    const state = {};
    advanceClocks(state, ink.clocks, t - 1 / 60, p, 0.1);
    const before = [...advanceClocks(state, ink.clocks, t, p, 0.1)];
    const changed = p.map((v, i) => (i === 1 || i === 6 ? v * 1.3 : v));
    const after = advanceClocks(state, ink.clocks, t + 1 / 60, changed, 0.9);
    for (let i = 0; i < 2; i++)
      assert.ok((after[i] - before[i] + TAU) % TAU < 0.01);
  }
});

test("eight stable looks, id-selected world, gestures, step budget and dark tank obey the contract", () => {
  assert.equal(ink.number, 112);
  assert.equal(ink.development, "development");
  assert.deepEqual(ink.type.values, [0, 1, 2]);
  assert.equal(ink.presets.length, 8);
  for (const preset of ink.presets)
    for (const f of ink.schema)
      assert.ok(
        Number.isFinite(preset.params[f.key]) &&
          preset.params[f.key] >= f.min &&
          preset.params[f.key] <= f.max,
        `${preset.name}.${f.key}`,
      );
  assert.deepEqual(
    ink.presets.map((p) => p.name),
    [
      "Drop",
      "Plumes",
      "Nebula",
      "Quiet Infusion",
      "Twin Currents",
      "Silken Tributaries",
      "Velvet Chamber",
      "Marbled Lantern",
    ],
  );
  // Extra looks span all three Widnall lobe counts.
  assert.deepEqual(
    new Set(ink.presets.slice(3).map((p) => inkIdentity(p.seed).lobes)),
    new Set([5, 6, 7]),
  );
  const first = ink.presets.slice(0, 3);
  assert.equal(new Set(first.map((p) => p.seed)).size, 1);
  const withoutDev = (p) => {
    const { development, ...other } = p.params;
    return other;
  };
  assert.deepEqual(
    first.map(withoutDev),
    first.map(() => withoutDev(first[0])),
  );
  assert.deepEqual(
    continuousDevelopment(
      first.map((_, i) => ({ snapshot: presetSnapshot(ink, i) })),
      ink,
    )?.positions,
    [0, 1, 2],
  );
  const worlds = defaultWorlds(catalogLooks(scenes).map((l) => l.id));
  const world = worlds.find((w) => w.id === "ink-bloom");
  assert.ok(world);
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Drop", "Plumes", "Nebula"],
  );
  assert.deepEqual(
    ink.rhythm.map((r) => r.id),
    ["ring-roll", "finger-reach", "pigment-wave", "ink-burst"],
  );
  assert.deepEqual(
    ink.rhythm.map((r) => r.defaults.length),
    [4, 8, 16, 32],
  );
  const signature = ink.rhythm.find((r) => r.slot === 3);
  assert.equal(signature.id, "ink-burst");
  for (const style of ["restrained", "driving", "accented"]) {
    assert.ok(signature.styles[style].steps.filter((v) => v > 0).length >= 2);
    assert.ok(signature.styles[style].strength >= 0.7);
    for (const preset of ink.presets) assert.ok(preset.params.development >= 0); // no variant exclusion
  }
  for (const uniform of ["u_rhythm.w", "u_rhythmHit.w", "u_rhythmCount.w"])
    assert.ok(ink.fragment.includes(uniform));
  for (const ch of ["x", "y", "z", "w"])
    assert.ok(ink.fragment.includes(`u_rhythm.${ch}`));
  // Kick punches focal length by at most 2%.
  assert.match(ink.fragment, /2\.4\+0\.048\*u_kick/);
  // The march honours the engine's ray-step budget (governor 96/64/40).
  assert.match(
    ink.fragment,
    /int limit=int\(min\(float\(INK_STEP_CAP\),\(0\.23-0\.01\*gG2\)\*u_raySteps\)\)/,
  );
  assert.match(ink.fragment, /budget=96\.0\/clamp\(u_raySteps,16\.0,96\.0\)/);
  // Dark tank: no cream lamp field; colour only from the palette.
  assert.doesNotMatch(ink.fragment, /lampColor\*\(0\.018\+1\.1\*lamp\*lamp\)/);
  assert.equal(ink.geometry, undefined);
  assert.equal(ink.simulation, undefined);
});
