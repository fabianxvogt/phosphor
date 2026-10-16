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
  hemOffset,
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
  const worlds = defaultWorlds(catalogLooks(scenes).map((l) => l.id));
  const world = worlds.find((w) => w.id === "aurora-veil");
  assert.ok(world);
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
    /theta\+\.17\*u_params\[2\]\*sin\(5\.\*theta-phase\+sheet\)/,
  );
  for (let sheet = 0; sheet < SHEETS; sheet++)
    for (let u = 0; u <= 1; u += 0.025) {
      for (let dev = 0; dev <= 2; dev += 0.01) {
        const a = sheetPoint(u, 0.3, sheet, dev, 1.2);
        const b = sheetPoint(u, 0.3, sheet, dev + 1e-5, 1.2);
        assert.ok(a.every(Number.isFinite));
        // The open-curve morph and 212-unit peak reach remain C1 and bounded.
        assert.ok(distance(a, b) < 0.008, `development Lipschitz ${dev}`);
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
    "(uv.x-.5)*6.18+sheet*.24+(avSeed()-.5)*.35",
    "theta*2.3+phase+sheet*2.3",
    "mix(32.+sheet*20.,26.+sheet*18.,crown)*u_params[5]",
    "(3.+6.*rise)*u_params[2]*kink+1.7*sin(9.*theta-2.*phase)",
    "14.+sheet*3.+6.*sin(1.6*theta+phase+sheet)+3.5*sin(4.3*theta-phase)+.55*sin(23.*theta-phase)",
    "theta*35.+24.*sin(w)",
    "25.+sheet*33.+16.*sin(theta*1.3+sheet*1.7)+ripple*.65",
    "base.xz=mix(base.xz,overhead*u_params[5],crown)",
    "(62.+30.*rise+120.*crown)*u_params[3]*(.85+.15*sin(4.*theta-phase+sheet))",
    "eye=vec3(1.4*sin(a),2.2+.16*sin(2.*a)+.8*c,1.1*cos(a))",
    "pitch=.30+.08*smoothstep(0.,1.,avDev())+.12*c+u_params[6]",
    "R=vec3(cos(yaw),0.,-sin(yaw))",
    "mix(1.22,.80,c)*(1.+.018*u_kick)/mix(1.,max(1.,u_params[5]),c)",
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

test("open overhead sheets converge above the frame while retaining the lake and horizon", () => {
  for (let phase = 0; phase < 2 * Math.PI; phase += 0.2) {
    const c = camera(2, phase);
    const vp = zenith(c.right, c.up, c.forward, c.focal);
    assert.ok(Math.abs(vp[0]) < 0.1 && vp[1] > 1.4 && vp[1] < 1.7);
    const horizon = (-c.focal * c.forward[1]) / c.up[1];
    assert.ok(
      horizon > -0.5 && horizon < -0.38,
      "bottom quarter retains lake and scale",
    );
    let left = Infinity,
      right = -Infinity,
      visible = 0;
    for (let sheet = 0; sheet < SHEETS; sheet++) {
      // An open curve has distant endpoints, not a closed luminous ring.
      assert.ok(
        distance(
          sheetPoint(0, 0, sheet, 2, phase),
          sheetPoint(1, 0, sheet, 2, phase),
        ) > 150,
      );
      for (let u = 0.02; u <= 0.98; u += 0.005) {
        const base = sheetPoint(u, 0.02, sheet, 2, phase);
        if (dot(sub(base, c.eye), c.forward) < 1) continue;
        const low = project(base, c.eye, c.right, c.up, c.forward, c.focal);
        const high = project(
          sheetPoint(u, 0.9, sheet, 2, phase),
          c.eye,
          c.right,
          c.up,
          c.forward,
          c.focal,
        );
        assert.ok([...low, ...high].every(Number.isFinite));
        assert.ok(distance(high, vp) < distance(low, vp));
        left = Math.min(left, low[0]);
        right = Math.max(right, low[0]);
        if (Math.abs(low[0]) < 1.5 && high[1] > low[1] + 0.3) visible++;
      }
    }
    assert.ok(left < -16 / 9 && right > 16 / 9);
    assert.ok(visible > 60, "layered curtains fill the sky, not an empty ring");
  }
});

test("overhead curves contain actual returning S-folds, not monotone fan bases", () => {
  for (let phase = 0; phase < 2 * Math.PI; phase += 0.4) {
    let returning = 0;
    for (let u = 0.02; u < 0.98; u += 0.005) {
      const a = sheetPoint(u, 0, 0, 2, phase);
      const b = sheetPoint(u + 0.0001, 0, 0, 2, phase);
      if (b[0] < a[0]) returning++;
    }
    assert.ok(returning > 20, `genuine folded sheet at ${phase}`);
  }
});

test("the sharply filtered hem has fine travelling kinks and soft, multi-octave ray tips", () => {
  for (const dev of [0, 1, 1.5, 2])
    for (let u = 0; u <= 1; u += 0.003)
      for (const sheet of [0, 1, 2]) {
        const a = hemOffset(u, 1.2, sheet, dev);
        assert.ok(a >= 0.0028 && a <= 0.0072);
        assert.ok(
          Math.abs(a - hemOffset(u, 1.2 + 2 * Math.PI, sheet, dev)) < 1e-14,
        );
        assert.ok(Math.abs(a - hemOffset(u, 1.20001, sheet, dev)) < 0.00000006);
      }
  assert.ok(Math.abs(hemOffset(0.2, 0) - hemOffset(0.2, 0.7)) > 0.0001);
  for (const token of [
    ".0014*sin(u*61.-3.*phase+v_sheet)",
    ".0008*sin(u*137.+2.*phase)",
    "hemWidth=max(.0018,fwidth(h)*.85)",
    "midFoot=fwidth(midPhase)",
    "1.-smoothstep(tip*reach,1.,h)",
    "mix(.20,.065,crown)",
  ])
    assert.ok(aurora.geometry.fragment.includes(token), token);
});

test("Glow and Curtains have tall rays and a full-width horizon, not a central strip", () => {
  for (const dev of [0, 0.5, 1])
    for (const phase of [0, 1.5, 3, 4.5, 6]) {
      const c = camera(dev, phase);
      let left = Infinity,
        right = -Infinity,
        tall = 0;
      for (let sheet = 0; sheet < SHEETS; sheet++)
        for (let u = 0.02; u < 0.98; u += 0.005) {
          const base = sheetPoint(u, 0.02, sheet, dev, phase);
          if (dot(sub(base, c.eye), c.forward) < 2) continue;
          const a = project(base, c.eye, c.right, c.up, c.forward, c.focal);
          const b = project(
            sheetPoint(u, 0.55, sheet, dev, phase),
            c.eye,
            c.right,
            c.up,
            c.forward,
            c.focal,
          );
          left = Math.min(left, a[0]);
          right = Math.max(right, a[0]);
          if (Math.abs(a[0]) < 1.5 && b[1] - a[1] > 0.8) tall++;
        }
      assert.ok(left < -16 / 9 && right > 16 / 9);
      assert.ok(
        tall >= 15,
        `near-sheet rays span >40% of frame: ${dev}/${phase}`,
      );
      assert.ok(c.forward[1] - c.up[1] / c.focal < 0, "ground remains in view");
    }
});

test("the wide crane camera stays continuous for every saved extra look", () => {
  for (const tilt of [-0.15, 0, 0.1, 0.15]) {
    let previous = camera(1, 0.7, tilt);
    for (let dev = 1.001; dev <= 2; dev += 0.001) {
      const c = camera(dev, 0.7, tilt);
      assert.ok(dot(previous.right, c.right) > 0.999999);
      assert.ok(dot(previous.up, c.up) > 0.9999);
      assert.ok(Math.abs(dot(c.right, c.up)) < 1e-14);
      previous = c;
    }
  }
  assert.doesNotMatch(shaders, /normalize\(cross\(vec3\(0\.,1\.,0\.\),F\)\)/);
});

test("landscape and reflection use resolved frost, cracks, snow normals, mountain layers and a galactic band", () => {
  for (const token of [
    "avRidge(az)",
    "farRidge",
    "snowCap",
    "snowH",
    "dFdx(snowP)",
    "galaxy",
    "float crack=",
    "float frost=",
    "fwidth(floe.y)",
    "avFloe(warped)",
    "float sparkle=",
    "float crust=",
  ])
    assert.ok(aurora.fragment.includes(token), token);
  assert.match(aurora.geometry.fragment, /u\+=\(rough-\.5\)\*\.065/);
  assert.match(
    aurora.geometry.fragment,
    /rayCore=mix\(rayCore,\.1185,v_mirror\*\.8\)/,
  );
  assert.match(aurora.geometry.fragment, /smoothstep\(\.012,\.12,h\)/);
  assert.match(aurora.geometry.fragment, /u_accent\*edge\*\.025/);
});

test("four bounded family gestures act on the signature, and energy never multiplies exposure", () => {
  assert.deepEqual(
    aurora.rhythm.map((r) => [r.slot, r.defaults.length]),
    [
      [0, 4],
      [1, 8],
      [2, 16],
      [3, 16],
    ],
  );
  const signature = aurora.rhythm.find((r) => r.slot === 3);
  assert.equal(signature.id, "curtain-surge");
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const hits = aurora.rhythm.reduce((sum, r) => {
      const p = r.styles[style];
      assert.ok(p.steps.filter((x) => x > 0).length >= 2, `${r.id}/${style}`);
      return (
        sum + (p.steps.filter((x) => x > 0).length * 4 * p.division) / p.length
      );
    }, 0);
    assert.ok(hits >= minimum, `${style}: ${hits} hits/bar`);
  }
  for (const uniform of ["u_rhythm.w", "u_rhythmHit.w", "u_rhythmCount.w"])
    assert.ok(aurora.geometry.fragment.includes(uniform));
  assert.match(aurora.geometry.fragment, /rays\*heightFade\*cohort/);
  assert.match(aurora.geometry.fragment, /sweep\*\(rays/);
  assert.match(aurora.geometry.fragment, /edge\*\.7\+lowerGlow\*2\./);
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
