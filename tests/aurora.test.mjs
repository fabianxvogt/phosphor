import test from "node:test";
import assert from "node:assert/strict";
import aurora from "../scene-aurora.mjs";
import scenes from "../scenes.mjs";
import {
  FIELD,
  SHEETS,
  COLUMNS,
  ROWS,
  createGeometry,
  sheetPoint,
  camera,
  dot,
  project,
  zenith,
} from "../aurora-model.mjs";
import { catalogLooks } from "../catalog.mjs";
import { FAMILY_CATALOG } from "../family-catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { advanceClocks } from "../scene-time.mjs";

const sub = (a, b) => a.map((x, i) => x - b[i]);
const distance = (a, b) => Math.hypot(...sub(a, b));
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const shaders =
  aurora.fragment + aurora.geometry.vertex + aurora.geometry.fragment;

test("Aurora Veil appends a registered continuous world with eight valid looks", () => {
  assert.equal(aurora.number, 106);
  assert.ok(scenes.includes(aurora));
  assert.ok(FAMILY_CATALOG.aurora.styles.includes("spatial"));
  assert.equal(aurora.presets.length, 8);
  assert.deepEqual(aurora.type, { key: "development", values: [0, 1, 2] });
  const field = aurora.schema.find((f) => f.key === aurora.development);
  assert.deepEqual([field.min, field.max, field.step], [0, 2, 0.01]);
  for (const [i, preset] of aurora.presets.entries()) {
    validateSnapshot(presetSnapshot(aurora, i), scenes);
    for (const f of aurora.schema)
      assert.ok(
        Number.isFinite(preset.params[f.key]) &&
          preset.params[f.key] >= f.min &&
          preset.params[f.key] <= f.max,
        `${preset.name}.${f.key}`,
      );
  }
  const world = defaultWorlds(catalogLooks(scenes).map((l) => l.id)).at(-1);
  assert.equal(world.id, "aurora-veil");
  assert.deepEqual(
    world.states.map((s) => s.look),
    ["aurora:Glow", "aurora:Curtains", "aurora:Corona"],
  );
  const clips = [0, 1, 2].map((i) => ({ snapshot: presetSnapshot(aurora, i) }));
  assert.deepEqual(continuousDevelopment(clips, aurora)?.positions, [0, 1, 2]);
  const { development, ...base } = aurora.presets[0].params;
  for (const p of aurora.presets.slice(0, 3)) {
    const { development, ...rest } = p.params;
    assert.deepEqual(rest, base);
    assert.equal(p.seed, 1061);
  }
});

test("the persistent material lattice never receives development or energy", () => {
  assert.deepEqual(aurora.geometry.attributes, [2, 1, 1]);
  assert.equal(aurora.geometry.additiveFrom, 0);
  const a = createGeometry(1061),
    b = createGeometry(1061);
  assert.deepEqual(a, b);
  assert.equal(a.length, SHEETS * COLUMNS * ROWS * 6 * 2 * 4);
  for (let i = 0; i < a.length; i += 4) {
    assert.ok(a[i] >= 0 && a[i] <= 1 && a[i + 1] >= 0 && a[i + 1] <= 1);
    assert.ok(a[i + 2] >= 0 && a[i + 2] < SHEETS);
    assert.ok(a[i + 3] === 0 || a[i + 3] === 1);
  }
  // Each mirrored triangle preserves the exact material ID and coordinates.
  const half = a.length / 2;
  for (let i = 0; i < half; i += 4)
    assert.deepEqual(
      [...a.slice(i, i + 3)],
      [...a.slice(i + half, i + half + 3)],
    );
});

test("every ray is straight and parallel to the same magnetic field at every development", () => {
  assert.match(shaders, /const vec3 AV_B=vec3\(\.035,1\.,-\.025\)/);
  assert.match(shaders, /return base\+AV_B\*len\*uv.y/);
  for (let dev = 0; dev <= 2; dev += 0.05)
    for (let sheet = 0; sheet < SHEETS; sheet++)
      for (let u = 0; u <= 1; u += 0.03125) {
        const p = sheetPoint(u, 0, sheet, dev, 1.7),
          q = sheetPoint(u, 1, sheet, dev, 1.7);
        const ray = sub(q, p);
        assert.ok(Math.hypot(...cross(ray, FIELD)) < 1e-12);
        const middle = sheetPoint(u, 0.37, sheet, dev, 1.7);
        assert.ok(
          distance(
            middle,
            p.map((x, i) => x + 0.37 * ray[i]),
          ) < 1e-12,
        );
        assert.ok(ray[1] > 0);
      }
});

test("parallel field lines converge to the zenith vanishing point in perspective (independent oracle)", () => {
  // Project endpoints at finite height. Their supporting image lines MUST
  // contain the direction's vanishing point, regardless of sheet folds.
  // Separately check the asymptotic perspective limit at enormous height.
  for (const dev of [0, 0.5, 1, 1.4, 1.8, 2])
    for (const turn of [0, 0.8, 3.2, 6.1]) {
      const c = camera(dev, turn),
        vp = zenith(c.right, c.up, c.forward, c.focal);
      for (let sheet = 0; sheet < SHEETS; sheet++)
        for (let u = 0.05; u < 1; u += 0.1) {
          const a = sheetPoint(u, 0, sheet, dev, 2.1),
            b = sheetPoint(u, 1, sheet, dev, 2.1);
          if (
            dot(sub(a, c.eye), c.forward) < 0.1 ||
            dot(sub(b, c.eye), c.forward) < 0.1
          )
            continue;
          const p = project(a, c.eye, c.right, c.up, c.forward, c.focal);
          const q = project(b, c.eye, c.right, c.up, c.forward, c.focal);
          const v = sub(q, p),
            w = sub(vp, p);
          assert.ok(Math.abs(v[0] * w[1] - v[1] * w[0]) < 1e-10);
          const far = a.map((x, i) => x + FIELD[i] * 1e12);
          const limit = project(far, c.eye, c.right, c.up, c.forward, c.focal);
          assert.ok(distance(limit, vp) < 1e-7);
        }
    }
});

test("fold/kink dynamics are periodic, non-rigid and reversible without material reindexing", () => {
  assert.match(shaders, /sin\(w\+\.65\*sin\(2\.\*w-phase\)\)/);
  assert.match(
    shaders,
    /theta\+\.11\*rise\*u_params\[2\]\*sin\(8\.\*theta-phase\+sheet\)/,
  );
  for (let sheet = 0; sheet < SHEETS; sheet++)
    for (let u = 0; u <= 1; u += 0.025) {
      for (let dev = 0; dev <= 2; dev += 0.01) {
        const a = sheetPoint(u, 0.3, sheet, dev, 1.2);
        const b = sheetPoint(u, 0.3, sheet, dev + 1e-5, 1.2);
        assert.ok(a.every(Number.isFinite));
        assert.ok(distance(a, b) < 0.003, `development Lipschitz ${dev}`);
        assert.deepEqual(
          a,
          sheetPoint(u, 0.3, sheet, dev, 1.2),
          "no history/direction input",
        );
        assert.ok(
          distance(a, sheetPoint(u, 0.3, sheet, dev, 1.2 + 2 * Math.PI)) <
            1e-12,
        );
        assert.ok(a[1] > 3, "entire luminous curtain stays above the lake");
      }
    }
  const a0 = sheetPoint(0.22, 0, 0, 1, 0),
    a1 = sheetPoint(0.28, 0, 0, 1, 0);
  const b0 = sheetPoint(0.22, 0, 0, 1, 1),
    b1 = sheetPoint(0.28, 0, 0, 1, 1);
  assert.ok(
    Math.abs(distance(a0, a1) - distance(b0, b1)) > 0.01,
    "genuine folds, not rigid sheet translation",
  );
  assert.ok(
    distance(
      sheetPoint(0.2, 0, 0, 1, 0, 1061),
      sheetPoint(0.2, 0, 0, 1, 0, 1062),
    ) > 0.01,
    "seed affects the persistent curve",
  );
});

test("CPU mirror is pinned to the shader geometry coefficients", () => {
  for (const line of [
    "(uv.x-.5)*mix(2.6,5.95,crown)+sheet*.13+(avSeed()-.5)*.35",
    "mix(24.+sheet*7.,7.+sheet*2.,crown)*u_params[5]",
    "(.65+1.65*rise)*u_params[2]*kink+.6*sin(9.*theta-2.*phase)",
    "7.3+sheet*.6+3.5*cos(theta)+rise*(3.+2.5*sin(3.*theta+phase))",
    "19.+sheet*3.5+2.*sin(3.*theta+phase)",
    "mix(27.+sheet*4.,0.,crown)+r*cos(bend)",
    "(8.8+20.*rise+31.*crown)*u_params[3]*(.8+.2*sin(4.*theta-phase+sheet))",
  ])
    assert.ok(shaders.includes(line), line);
});

test("the lake mirror obeys reflection geometry; camera has no roll and never enters a curtain", () => {
  for (let dev = 0; dev <= 2; dev += 0.1)
    for (let phase = 0; phase < 2 * Math.PI; phase += 0.4) {
      const c = camera(dev, phase);
      assert.ok(c.eye[1] > 1.1);
      assert.equal(c.right[1], 0);
      assert.ok(Math.abs(dot(c.forward, c.up)) < 1e-14);
      assert.ok(Math.abs(dot(c.right, c.up)) < 1e-14);
      for (let sheet = 0; sheet < SHEETS; sheet++) {
        const p = sheetPoint(0.45, 0.2, sheet, dev, phase);
        assert.ok(distance(c.eye, p) > 5);
        const mp = [p[0], -p[1], p[2]],
          t = c.eye[1] / (c.eye[1] - mp[1]);
        const hit = c.eye.map((x, i) => x + t * (mp[i] - x));
        assert.ok(Math.abs(hit[1]) < 1e-14 && t > 0 && t < 1);
        const incoming = sub(hit, c.eye),
          outgoing = sub(p, hit);
        const ni = Math.hypot(...incoming),
          no = Math.hypot(...outgoing);
        assert.ok(Math.abs(incoming[1] / ni + outgoing[1] / no) < 1e-12);
      }
    }
  assert.match(aurora.geometry.fragment, /float t=eye.y\/\(eye.y-mp.y\)/);
  assert.match(shaders, /1\.\+\.018\*u_kick/);
});

test("top-state corona is framed on the short side across the complete camera / fold cycle", () => {
  let maximum = 0,
    minimum = Infinity;
  for (let phase = 0; phase < 2 * Math.PI; phase += 0.2) {
    const c = camera(2, phase);
    let extent = 0;
    for (let sheet = 0; sheet < SHEETS; sheet++)
      for (let u = 0.08; u <= 0.92; u += 0.01) {
        const p = sheetPoint(u, 0.03, sheet, 2, phase);
        const q = project(p, c.eye, c.right, c.up, c.forward, c.focal);
        extent = Math.max(extent, Math.abs(q[0]), Math.abs(q[1]));
      }
    maximum = Math.max(maximum, extent);
    minimum = Math.min(minimum, extent);
  }
  assert.ok(maximum < 0.95, `no cropped hero: ${maximum}`);
  assert.ok(minimum > 0.55, `no small climax: ${minimum}`);
});

test("three bounded family gestures act on the signature, and energy never multiplies exposure", () => {
  assert.deepEqual(
    aurora.rhythm.map((r) => [r.slot, r.defaults.length]),
    [
      [0, 4],
      [1, 8],
      [2, 16],
    ],
  );
  assert.match(aurora.geometry.fragment, /rays\*heightFade\*cohort/);
  assert.match(aurora.geometry.fragment, /sweep\*rays/);
  assert.match(aurora.geometry.fragment, /u_accent\*edge\*foldPulse/);
  assert.match(aurora.geometry.fragment, /rayFoot=max\(fwidth\(rayPhase\)/);
  assert.match(aurora.geometry.fragment, /rayCore=mix\(rayCore,\.1185/);
  assert.deepEqual(Object.keys(aurora.energy).sort(), ["detail", "travel"]);
  assert.ok(aurora.energy.travel.mul[1] / aurora.energy.travel.mul[0] <= 2);
  assert.doesNotMatch(shaders, /u_time|u_level\s*\*\s*col|col\s*\*=\s*u_level/);
});

test("integrated phases retain identity on reversals/rate changes at 12 hours", () => {
  for (const time of [100, 3600, 43200]) {
    const state = {},
      p = aurora.schema.map((f) => f.default);
    const start = [...advanceClocks(state, aurora.clocks, time, p, 0.1)];
    p[0] = 2;
    assert.deepEqual(
      [...advanceClocks(state, aurora.clocks, time, p, 0.9)],
      start,
    );
    p[1] = 1.5;
    const after = [
      ...advanceClocks(state, aurora.clocks, time + 1 / 60, p, 0.9),
    ];
    for (let i = 0; i < 2; i++) assert.ok(Math.abs(after[i] - start[i]) < 0.01);
  }
});
