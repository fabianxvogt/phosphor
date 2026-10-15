import test from "node:test";
import assert from "node:assert/strict";
import magma, {
  PLATE_JITTER,
  GRAVITY,
  CYCLE_SECONDS,
  BOMB_CAP,
} from "../scene-magma.mjs";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { catalogLooks } from "../catalog.mjs";
import { shaderVariant } from "../scene-time.mjs";

const src = magma.fragment;
const late = shaderVariant(src, true);
const early = shaderVariant(src, false);

// ------------------------------------------------------------- mirrors
const fract = (x) => x - Math.floor(x);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
// mrH2 (the GPU evaluates it in float32; the algorithm tests below only
// need the same site function in the search and in the reference).
function h2(x, y) {
  let a = fract(x * 0.1031),
    b = fract(y * 0.1031),
    c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d;
  b += d;
  c += d;
  return fract((a + b) * c);
}
const seedOff = [12.33, 45.21];
function site(cx, cy) {
  const hx = h2(cx + seedOff[0], cy + seedOff[1]);
  const hy = h2(cx + seedOff[0] + 57.3, cy + seedOff[1] + 113.1);
  return [0.5 + PLATE_JITTER * (hx - 0.5), 0.5 + PLATE_JITTER * (hy - 0.5)];
}
// The shader's cached 3×3 search (R = 1); R = 3 is the brute-force reference.
function plates(qx, qy, R = 1) {
  const ix = Math.floor(qx),
    iy = Math.floor(qy),
    fx = qx - ix,
    fy = qy - iy;
  const r = [];
  for (let j = -R; j <= R; j++)
    for (let i = -R; i <= R; i++) {
      const s = site(ix + i, iy + j);
      r.push({ x: i + s[0] - fx, y: j + s[1] - fy, cx: ix + i, cy: iy + j });
    }
  let bi = 0,
    best = Infinity;
  r.forEach((s, k) => {
    const d = s.x * s.x + s.y * s.y;
    if (d < best) {
      best = d;
      bi = k;
    }
  });
  const a = r[bi];
  let border = Infinity,
    gi = bi;
  r.forEach((s, k) => {
    if (k === bi) return;
    const dx = s.x - a.x,
      dy = s.y - a.y;
    const b = (0.5 * (a.x + s.x) * dx + 0.5 * (a.y + s.y) * dy) / Math.hypot(dx, dy);
    if (b < border) {
      border = b;
      gi = k;
    }
  });
  return {
    cell: [a.cx, a.cy],
    site: [qx + a.x, qy + a.y],
    neighbour: [r[gi].cx, r[gi].cy],
    border,
  };
}
// Deterministic sample points.
function* points(n, span = 120, seed = 7) {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) yield [(rnd() - 0.5) * span, (rnd() - 0.5) * span];
}

test("shader keeps the mirrored Voronoi search and seam distance", () => {
  for (const line of [
    `const float JIT = ${PLATE_JITTER.toFixed(2)};`,
    "vec2 h = vec2(mrH2(c + gSeedOff), mrH2(c + gSeedOff + vec2(57.3, 113.1)));",
    "return vec3(0.5 + JIT * (h - 0.5), fract(h.x * 13.17 + h.y * 7.31));",
    "float b = dot(0.5 * (mr + r[k]), dr) * inversesqrt(max(dot(dr, dr), 1e-8));",
    "if (b < border) { border = b; gi = k; }",
    "P.gap = border - width;",
  ])
    assert.ok(src.includes(line), line);
});

test("the cached 3×3 search finds the exact nearest plate and exact seam distance", () => {
  // Distance to a convex cell's boundary is the minimum distance to the
  // bisector lines of all other sites; the 7×7 brute force is the reference.
  let n = 0;
  for (const [x, y] of points(60000)) {
    const a = plates(x, y, 1),
      b = plates(x, y, 3);
    assert.deepEqual(a.cell, b.cell, `nearest at ${x},${y}`);
    assert.ok(Math.abs(a.border - b.border) < 1e-12, `border at ${x},${y}`);
    n++;
  }
  assert.equal(n, 60000);
  // The seam distance is a true distance: |∇| = 1 away from junctions, and
  // a point moved along the seam normal by δ changes it by δ.
  for (const [x, y] of points(400, 80, 11)) {
    const p = plates(x, y);
    if (p.border < 0.05 || p.border > 0.3) continue;
    const s = site(...p.neighbour);
    const nb = [p.neighbour[0] + s[0], p.neighbour[1] + s[1]];
    const dx = nb[0] - p.site[0],
      dy = nb[1] - p.site[1],
      L = Math.hypot(dx, dy);
    const q = plates(x + (0.01 * dx) / L, y + (0.01 * dy) / L);
    if (q.cell[0] !== p.cell[0] || q.cell[1] !== p.cell[1]) continue;
    if (q.neighbour[0] !== p.neighbour[0] || q.neighbour[1] !== p.neighbour[1]) continue;
    assert.ok(Math.abs(p.border - q.border - 0.01) < 1e-9);
  }
});

test("seams are continuous: both plates see the same seam at the bisector", () => {
  for (const [x, y] of points(3000, 60, 5)) {
    const p = plates(x, y);
    const s = site(...p.neighbour);
    const nb = [p.neighbour[0] + s[0], p.neighbour[1] + s[1]];
    // Step across the seam along its normal: just inside the neighbour.
    const dx = nb[0] - p.site[0],
      dy = nb[1] - p.site[1],
      L = Math.hypot(dx, dy);
    const step = p.border + 1e-6;
    const q = plates(x + (dx / L) * step, y + (dy / L) * step);
    assert.ok(q.border < 1e-4, `just across the seam ${q.border}`);
  }
});

// ------------------------------------------------------------- identity
// Mirror of the development-dependent quantities (main()).
const dev01 = (dev) => ({
  split: smooth(0.08, 1, dev),
  lake: smooth(1.05, 1.85, dev),
  erupt: smooth(1.3, 2, dev),
  seamW: 0.018 + 0.068 * smooth(0.08, 1, dev) + 0.03 * smooth(1, 2, dev),
});
test("plate identity never depends on development; only seams, lava and sinking do", () => {
  assert.match(src, /Plate mrPlates\(vec2 q, float wScale\)/);
  // wScale enters only the width; identity comes from the sites alone.
  const body = src.slice(src.indexOf("Plate mrPlates("), src.indexOf("// ------------------------------------------------------------------ terrain"));
  assert.equal((body.match(/wScale/g) ?? []).length, 2);
  assert.doesNotMatch(body, /gDev|gSplit|gLakeAmt|gErupt|u_params/);
  assert.match(src, /gSeamW = 0\.018 \+ 0\.068 \* gSplit \+ 0\.03 \* smoothstep\(1\.0, 2\.0, dev\);/);
  // The same plate at every development value, forward and back.
  const probes = [...points(500, 40, 3)].map(([x, y]) => plates(x, y));
  for (let dev = 0; dev <= 2.0001; dev += 0.05)
    for (const [i, [x, y]] of [...points(500, 40, 3)].entries())
      assert.deepEqual(plates(x, y).cell, probes[i].cell);
  // Seams widen monotonically: plates split as development rises and close
  // again on the way back (pure function of development, no state).
  let prev = -Infinity;
  for (let dev = 0; dev <= 2.0001; dev += 0.01) {
    const w = dev01(dev).seamW;
    assert.ok(w >= prev - 1e-12);
    prev = w;
  }
  // Plates sink into the lake as whole plates (by their site), only once
  // the lake opens.
  assert.match(src, /float sr = length\(P\.siteA \* gS\);/);
  assert.match(src, /float sink = smoothstep\(gLakeR \+ 0\.3, gLakeR - 1\.6, sr\) \* gLakeAmt;/);
  assert.equal(dev01(1.0).lake, 0);
  assert.equal(dev01(0).split, 0);
  assert.equal(dev01(2).erupt, 1);
});

// ------------------------------------------------------------- ejecta
// Mirror of the bomb launch: speeds from seeded hashes and fountain force,
// exact parabola p(t) = p0 + v0 t − ½ g t² ŷ, flight until 0.35 below launch.
const launch = (hx, hy, force) => {
  const k = Math.sqrt(Math.max(force, 0.05));
  return { vy: mix(5, 8, hx) * k, vh: mix(0.5, 1.9, hy) * k };
};
const flight = (vy) => (vy + Math.sqrt(vy * vy + 2 * GRAVITY * 0.35)) / GRAVITY;
const bomb = (p0, v0, t) => [
  p0[0] + v0[0] * t,
  p0[1] + v0[1] * t - 0.5 * GRAVITY * t * t,
  p0[2] + v0[2] * t,
];

test("shader keeps the mirrored ballistic ejecta", () => {
  for (const line of [
    `const float G_ACC = ${GRAVITY.toFixed(1)};`,
    `const float CYCLE = ${CYCLE_SECONDS.toFixed(1)};`,
    "return p0 + v0 * tt + vec3(0.0, -0.5 * G_ACC * tt * tt, 0.0);",
    "float vy = mix(5.0, 8.0, hb.x) * sqrt(max(gForce, 0.05));",
    "float vh = mix(0.5, 1.9, hb.y) * sqrt(max(gForce, 0.05));",
    "float tf = (vy + sqrt(vy * vy + 2.0 * G_ACC * 0.35)) / G_ACC;",
    "float tt = tau * CYCLE;",
    "if (tt >= tf) continue;",
    "float id = mod(floor(u), 64.0);",
  ])
    assert.ok(src.includes(line), line);
  assert.match(src, new RegExp(`const int BOMB_CAP = ${BOMB_CAP};`));
});

test("ejecta follow exact parabolas and land before their next launch", () => {
  // RK4 on dp/dt = v, dv/dt = −g ŷ reproduces the closed form.
  const p0 = [0.1, 0.72, -0.2];
  for (const [hx, hy, force] of [
    [0, 0, 0.3],
    [0.5, 0.5, 1],
    [1, 1, 1.5],
    [0.2, 0.9, 1.2],
  ]) {
    const { vy, vh } = launch(hx, hy, force);
    const v0 = [vh * 0.6, vy, vh * 0.8];
    const tf = flight(vy);
    let p = [...p0],
      v = [...v0];
    const n = 400,
      h = tf / n;
    for (let i = 0; i < n; i++) {
      const acc = [0, -GRAVITY, 0];
      // Exact for constant acceleration: RK4 == Taylor to second order.
      const k1p = v,
        k2p = v.map((x, j) => x + 0.5 * h * acc[j]),
        k4p = v.map((x, j) => x + h * acc[j]);
      p = p.map((x, j) => x + (h / 6) * (k1p[j] + 4 * k2p[j] + k4p[j]));
      v = v.map((x, j) => x + h * acc[j]);
    }
    const exact = bomb(p0, v0, tf);
    for (let j = 0; j < 3; j++) assert.ok(Math.abs(p[j] - exact[j]) < 1e-9);
    // Lands exactly 0.35 below the launch height at tf; apex v²/2g.
    assert.ok(Math.abs(exact[1] - (p0[1] - 0.35)) < 1e-9);
    const apex = bomb(p0, v0, vy / GRAVITY)[1] - p0[1];
    assert.ok(Math.abs(apex - (vy * vy) / (2 * GRAVITY)) < 1e-9);
    // Every flight ends inside its cycle, so no bomb jumps to its next
    // launch mid-air; the landing stays well inside the camera orbit.
    assert.ok(tf < CYCLE_SECONDS, `flight ${tf}`);
    assert.ok(vh * tf + 0.25 < 8.6 - 1.5, `landing radius ${vh * tf}`);
  }
  // Worst case over the whole hash and force range.
  const { vy, vh } = launch(1, 1, 1.5);
  assert.ok(flight(vy) < CYCLE_SECONDS);
  assert.ok(vh * flight(vy) < 7);
});

// ------------------------------------------------------------- camera
function base(x, z) {
  const r2 = x * x + z * z;
  let h = 0.55 * Math.exp(-r2 / 70);
  h += 0.1 * Math.sin(0.37 * x + 1.3) * Math.sin(0.29 * z + 0.4) + 0.06 * Math.sin(0.21 * x - 0.53 * z + 2.1);
  return h; // the caldera wall starts beyond r = 19
}
test("the camera orbit never enters the ground", () => {
  for (const line of [
    "float R = mix(8.6, 9.8, gErupt) * (1.0 + 0.05 * wob) + 1.2 * camH;",
    "ro.y = mrBase(ro.xz) + mix(2.2, 6.6, camH) + 0.9 * gErupt + 0.15 * wob;",
    "const float TOP_BOUND = 0.2;",
  ])
    assert.ok(src.includes(line), line);
  let least = Infinity;
  for (let dev = 0; dev <= 2.0001; dev += 0.1)
    for (const camH of [0, 0.5, 1])
      for (const wob of [-1, 0, 1])
        for (let az = 0; az < 2 * Math.PI; az += 0.02) {
          const erupt = smooth(1.3, 2, dev);
          const R = mix(8.6, 9.8, erupt) * (1 + 0.05 * wob) + 1.2 * camH;
          assert.ok(R < 19, "inside the plate field, far from the wall");
          const x = R * Math.cos(az),
            z = R * Math.sin(az);
          const y = base(x, z) + mix(2.2, 6.6, camH) + 0.9 * erupt + 0.15 * wob;
          least = Math.min(least, y - (base(x, z) + 0.2));
        }
  assert.ok(least > 1.8, `clearance ${least}`);
});

// ------------------------------------------------------------- time
test("clocks are the authored products and every use is periodic", () => {
  assert.match(early, /gOrbit = u_time \* \(u_params\[5\] \* 0\.045\);/);
  assert.match(early, /gFlow = u_time \* \(u_params\[1\] \* 0\.18\);/);
  assert.match(early, /gErPh = u_time \* \(\(0\.8 \+ 0\.45 \* clamp\(u_level, 0\.0, 1\.0\)\) \/ 3\.4\);/);
  assert.match(late, /gOrbit = u_clock\[0\];/);
  const p = magma.schema.map((f) => f.default);
  p[5] = 0.7;
  p[1] = 1.3;
  assert.equal(magma.clocks[0].rate(p, 0.5), 0.7 * 0.045);
  assert.equal(magma.clocks[1].rate(p, 0.5), 1.3 * 0.18);
  assert.equal(magma.clocks[2].rate(p, 0.4), (0.8 + 0.45 * 0.4) / 3.4);
  assert.deepEqual(
    magma.clocks.map((c) => c.period),
    [2 * Math.PI, 16, 64],
  );
  // Orbit (period 2π): only whole multiples of the azimuth.
  const azUses = [...src.matchAll(/(sin|cos)\(az[^)]*\)/g)].map((m) => m[0]);
  for (const use of azUses) assert.match(use, /^(sin|cos)\(az( \* 2\.0)?( \+ 0\.7)?\)$/, use);
  // Flow (period 16): sin(TAU·φ), the lake turn TAU·φ/16, fract and floor mod 16.
  for (const use of src.match(/[^\n]*gFlow[^\n]*/g).filter((l) => !/gFlow = |float gDev/.test(l)))
    assert.match(use, /sin\(TAU \* gFlow|TAU \* gFlow \/ 16\.0|gFlow \+ 0\.5 \* float\(k\)/, use);
  assert.match(src, /float id = mod\(floor\(ph\), 16\.0\);/);
  // Eruption (period 64): integer frequencies, ×0.5 with mod 32, ×0.5/0.75.
  for (const use of src.match(/[^\n]*gErPh[^\n]*/g).filter((l) => !/gErPh = |float gDev/.test(l)))
    assert.match(
      use,
      /gErPh \* 0\.5 \+ 0\.5|TAU \* \(gErPh \* 8\.0\)|TAU \* gErPh \* 5\.0|gErPh \+ fract|gErPh \* \(0\.5 \+ floor\(h\.z \* 2\.0\) \* 0\.25\)/,
      use,
    );
  assert.match(src, /float id = mod\(floor\(ph\), 32\.0\);/);
  for (const m of [8, 5, 1, 0.5, 0.75]) assert.ok(Number.isInteger(64 * m));
});

// ------------------------------------------------------------- looks
test("magma declares a continuous three-state world and strong extra looks", () => {
  assert.equal(magma.number, 104);
  assert.equal(magma.id, "magma");
  assert.equal(magma.development, "development");
  assert.deepEqual(magma.type, { key: "development", values: [0, 1, 2] });
  assert.ok(magma.presets.length >= 8);
  assert.equal(new Set(magma.presets.map((p) => p.name)).size, magma.presets.length);
  for (const preset of magma.presets)
    for (const field of magma.schema) {
      const v = preset.params[field.key];
      assert.ok(Number.isFinite(v) && v >= field.min && v <= field.max, `${preset.name}.${field.key}`);
    }
  const ids = catalogLooks(scenes).map((l) => l.id);
  const world = defaultWorlds(ids).find((w) => w.id === "magma-rift");
  assert.ok(world, "authored world is playable");
  assert.equal(world.name, "Magma Rift");
  assert.deepEqual(world.states.map((s) => s.name), ["Crust", "Rivers", "Eruption"]);
  const clips = world.states.map((s) => {
    const index = magma.presets.findIndex((p) => `magma:${p.name}` === s.look);
    return { snapshot: presetSnapshot(magma, index) };
  });
  assert.deepEqual(continuousDevelopment(clips, magma)?.positions, [0, 1, 2]);
  assert.ok(world.description.length <= 240);
});

test("style limits: palette-only colour, kick punch, roll, speed range, gestures", () => {
  // Every literal colour is a grey: hue comes only from the palette.
  const colours = [
    ...src.matchAll(/(?:col|albedo|emit|sky|deck|keyCol|hazeCol|c)\s*[+*]?=[^;]*vec3\(([^)]*)\)/g),
  ].map((m) => m[1].split(",").map(Number));
  for (const c of colours)
    if (c.length === 3 && c.every(Number.isFinite)) assert.ok(c[0] === c[1] && c[1] === c[2], `colour ${c}`);
  assert.match(src, /float focal = 1\.55 \* \(1\.0 \+ 0\.02 \* kick\);/);
  assert.match(src, /rot2\(0\.03 \* sin\(az \* 2\.0\)\)/);
  const [a, b] = magma.energy.orbit.mul;
  assert.ok(b / a <= 2.1, "energy raises the orbit at most about 2x");
  const [fa, fb] = magma.energy.flow.mul;
  assert.ok(fb / fa <= 2.3);
  assert.deepEqual(
    magma.rhythm.map((r) => [r.slot, r.defaults.length]),
    [
      [0, 4],
      [1, 8],
      [2, 16],
    ],
  );
});
