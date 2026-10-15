import test from "node:test";
import assert from "node:assert/strict";
import magma, {
  PLATE_JITTER,
  GRAVITY,
  CYCLE_SECONDS,
  BIG_CAP,
  SPRAY_CAP,
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
// The GPU evaluates the hash in float32; the algorithm tests below only
// need the same site function in the search and in the reference.
// mrH22: one hash, two outputs.
function h22(x, y) {
  let a = fract(x * 0.1031),
    b = fract(y * 0.103),
    c = fract(x * 0.0973);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d;
  b += d;
  c += d;
  return [fract((a + b) * c), fract((a + c) * b)];
}
const seedOff = [12.33, 45.21];
function site(cx, cy) {
  const [hx, hy] = h22(cx + seedOff[0], cy + seedOff[1]);
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
    "return mrH22(c + gSeedOff);", "return texelFetch(u_precomputed, ivec2(c) + ivec2(64, 65), 0).xy;",
    "vec2 mrSite(vec2 h) { return 0.5 + JIT * (h - 0.5); }",
    "return fract((p3.xx + p3.yz) * p3.zy);",
    "if (d < best) { best = d; mr = r[k]; hA = h; oA = o; }",
    "float b = dot(0.5 * (mr + r[k]), dr) * inversesqrt(dd);",
    "if (b < border) { border = b; rB = r[k]; }",
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
const launch = (hx, hy, force, big = true) => {
  const k = Math.sqrt(Math.max(force, 0.05));
  return big
    ? { vy: mix(8.5, 11, hx) * k, vh: mix(0.9, 2.1, hy) * k }
    : { vy: mix(5.5, 9.5, hx) * k, vh: mix(0.1, 1.1, hy) * k };
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
    "float kf = sqrt(max(gForce, 0.05));",
    "float vy = (big ? mix(8.5, 11.0, hb.x) : mix(5.5, 9.5, hb.x)) * kf;",
    "float vh = (big ? mix(0.9, 2.1, hb.y) : mix(0.1, 1.1, hb.y)) * kf;",
    "tf = (vy + sqrt(vy * vy + 2.0 * G_ACC * 0.35)) / G_ACC;",
    "tt = tau * CYCLE;",
    "return on > 0.0 && tt < tf;",
    "float id = mod(floor(u), 64.0);",
  ])
    assert.ok(src.includes(line), line);
  assert.match(src, new RegExp(`const int BIG_CAP = ${BIG_CAP};`));
  assert.match(src, new RegExp(`const int SPRAY_CAP = ${SPRAY_CAP};`));
});

test("ejecta follow exact parabolas and land before their next launch", () => {
  // RK4 on dp/dt = v, dv/dt = −g ŷ reproduces the closed form.
  const p0 = [0.1, 0.72, -0.2];
  for (const [hx, hy, force, big] of [
    [0, 0, 0.3, true],
    [0.5, 0.5, 1, true],
    [1, 1, 1.5, true],
    [0.2, 0.9, 1.2, true],
    [1, 1, 1.5, false],
    [0, 0.3, 0.6, false],
  ]) {
    const { vy, vh } = launch(hx, hy, force, big);
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
    // Peak camera radius is at least 12.8 · 0.95 = 12.16.
    assert.ok(vh * tf + 0.25 < 12.16 - 0.8, `landing radius ${vh * tf}`);
  }
  // Worst case over the whole hash and force range.
  const { vy, vh } = launch(1, 1, 1.5);
  assert.ok(flight(vy) < CYCLE_SECONDS);
  assert.ok(vh * flight(vy) + 0.25 < 11.36);
});

test("the bound surface is above every slab and lava level", () => {
  for (const line of [
    "float top = 0.1 + 0.05 * (id - 0.5) + clamp(tl, -0.05, 0.05);",
    "vec2 mrTilt(Plate P) { return (fract(P.hA * vec2(17.3, 11.9)) - 0.5) * 0.07; }",
    "return mix(mix(-0.08, 0.055, flood), 0.075, mrLakeMask(r) * gLakeAmt);",
  ])
    assert.ok(src.includes(line), line);
  // Highest slab top 0.1 + 0.025 + 0.05 and highest lava 0.075 stay below.
  assert.ok(0.1 + 0.025 + 0.05 < 0.18 && 0.075 < 0.18);
});

test("a bomb's trail lies inside its precomputed bounding sphere", () => {
  assert.match(src, /return vec4\(0\.5 \* \(h0 \+ tail\), 0\.5 \* length\(h0 - tail\) \+ 0\.125 \* G_ACC \* span \* span\);/);
  const p0 = [0, 0.7, 0];
  for (const [hx, hy, big] of [[0.3, 0.8, true], [1, 1, true], [0.5, 0.1, false]]) {
    const { vy, vh } = launch(hx, hy, 1.5, big);
    const v0 = [vh, vy, 0.3 * vh];
    const span = 3 * (big ? 0.22 : 0.1);
    for (let tt = 0; tt < flight(vy); tt += 0.05) {
      const h0 = bomb(p0, v0, tt),
        tail = bomb(p0, v0, Math.max(tt - span, 0));
      const mid = h0.map((x, j) => 0.5 * (x + tail[j]));
      const radius = 0.5 * Math.hypot(...h0.map((x, j) => x - tail[j])) + 0.125 * GRAVITY * span * span;
      for (let k = 0; k <= 20; k++) {
        const q = bomb(p0, v0, Math.max(tt - (span * k) / 20, 0));
        assert.ok(Math.hypot(...q.map((x, j) => x - mid[j])) <= radius + 1e-9);
      }
    }
  }
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
    "float peakR = 12.8 + 12.0 * max(gForce - 1.0, 0.0);", 
    "float R = mix(mix(7.6, 8.6, gSplit), peakR, gErupt) * (1.0 + 0.05 * wob) + 1.2 * camH;",
    "ro.y = mrBase(ro.xz) + mix(2.2, 6.6, camH) * mix(0.8, 1.0, gSplit) + 1.4 * gErupt + 0.15 * wob;",
    "const float TOP_BOUND = 0.18;",
  ])
    assert.ok(src.includes(line), line);
  let least = Infinity;
  for (let dev = 0; dev <= 2.0001; dev += 0.1)
    for (const camH of [0, 0.5, 1])
      for (const wob of [-1, 0, 1])
        for (let az = 0; az < 2 * Math.PI; az += 0.02) {
          const erupt = smooth(1.3, 2, dev),
            split = smooth(0.08, 1, dev);
          const R = mix(mix(7.6, 8.6, split), 12.8, erupt) * (1 + 0.05 * wob) + 1.2 * camH;
          // The camera cranes back continuously while the eruption forms.
          if (erupt > 0) assert.ok(R > 7.6, `camera radius ${R} during the eruption`);
          assert.ok(R < 19, "inside the plate field, far from the wall");
          const x = R * Math.cos(az),
            z = R * Math.sin(az);
          const y = base(x, z) + mix(2.2, 6.6, camH) * mix(0.8, 1, split) + 1.4 * erupt + 0.15 * wob;
          least = Math.min(least, y - (base(x, z) + 0.18));
        }
  assert.ok(least > 1.3, `clearance ${least}`);
});

// ------------------------------------------------------------- time
test("clocks are the authored products and every use is periodic", () => {
  assert.match(early, /gOrbit = u_time \* \(u_params\[5\] \* 0\.07\);/);
  assert.match(early, /gFlow = u_time \* \(u_params\[1\] \* 0\.18\);/);
  assert.match(early, /gErPh = u_time \* \(\(0\.8 \+ 0\.45 \* clamp\(u_level, 0\.0, 1\.0\)\) \/ 4\.6\);/);
  assert.match(late, /gOrbit = u_clock\[0\];/);
  const p = magma.schema.map((f) => f.default);
  p[5] = 0.7;
  p[1] = 1.3;
  assert.equal(magma.clocks[0].rate(p, 0.5), 0.7 * 0.07);
  assert.equal(magma.clocks[1].rate(p, 0.5), 1.3 * 0.18);
  assert.equal(magma.clocks[2].rate(p, 0.4), (0.8 + 0.45 * 0.4) / 4.6);
  assert.deepEqual(
    magma.clocks.map((c) => c.period),
    [2 * Math.PI, 16, 64],
  );
  // Orbit (period 2π): only whole multiples of the azimuth.
  const azUses = [...src.matchAll(/(sin|cos)\(az[^)]*\)/g)].map((m) => m[0]);
  for (const use of azUses) assert.match(use, /^(sin|cos)\(az( \* 2\.0)?( \+ 0\.7)?\)$/, use);
  // Flow (period 16): sin(TAU·φ), the lake turn TAU·φ/16, fract and floor mod 16.
  for (const use of src.match(/[^\n]*gFlow[^\n]*/g).filter((l) => !/gFlow = |float gDev/.test(l)))
    assert.match(use, /sin\(TAU \* gFlow|TAU \* gFlow \/ 16\.0|gFlow \+ 0\.5 \* float\(k\)|sin\(r \* 4\.0 - TAU \* gFlow\)/, use);
  assert.match(src, /float id = mod\(floor\(ph\), 16\.0\);/);
  // Eruption (period 64): integer fountain harmonics and ash ×0.5, embers ×0.5/0.75.
  for (const use of src.match(/[^\n]*gErPh[^\n]*/g).filter((l) => !/gErPh = |float gDev/.test(l)))
    assert.match(
      use,
      /TAU \* gErPh|TAU \* \(gErPh \* 8\.0\)|gErPh \+ fract|gErPh \* \(0\.5 \+ floor\(h\.z \* 2\.0\) \* 0\.25\)/,
      use,
    );
  assert.match(src, /mrBillow\(p \* 0\.95 \+ vec3\(gSeedOff, 0\.0\), TAU \* gErPh \* 0\.5\)/);
  for (const m of [8, 5, 1, 0.5, 0.75]) assert.ok(Number.isInteger(64 * m));
});

test("plate hash tile addresses are exact and contain every terrain site", () => {
  assert.deepEqual(magma.precompute.size, [128, 129]);
  assert.match(magma.precompute.fragment, /floor\(gl_FragCoord\.xy\) - vec2\(64\.0, 65\.0\)/);
  assert.match(magma.precompute.fragment, /outColor = vec4\(mrH22\(c \+ gSeedOff\), 0\.0, 1\.0\);/);
  for (let y = -64; y < 64; y++)
    for (let x = -64; x < 64; x++) {
      const texel = [x + 64, y + 65];
      assert.ok(texel[0] >= 0 && texel[0] < 128 && texel[1] >= 1 && texel[1] < 129);
      assert.deepEqual([texel[0] - 64, texel[1] - 65], [x, y]);
    }
  // At the smallest plate size, even the outermost detailed terrain and
  // its neighbouring cells fit. Lake material uses the checked fallback.
  assert.ok(Math.ceil(21 / (1.1 * 0.6)) + 1 < 64);
  assert.match(src, /all\(greaterThanEqual\(c, vec2\(-64\.0\)\)\) && all\(lessThan\(c, vec2\(64\.0\)\)\)/);
});

test("curtain bound contains every compact-support jet, including its AA width", () => {
  const maxBillow = 0.5 + 0.28 * (1 + 0.6 + 0.3);
  const maxWidth = (0.28 + 0.3) * (0.6 + maxBillow);
  assert.ok(maxWidth < 0.947);
  assert.ok(3.3 + 4 * maxWidth < 7.2);
  assert.match(src, /max\(7\.2, 3\.3 \+ 6\.0 \* gPix \* 80\.0\)/);
  assert.match(src, /cs\.x >= 4\.0 \* maxSig/);
  assert.match(src, /1\.0 - smoothstep\(3\.4 \* sig, 4\.0 \* sig, cs\.x\)/);
  assert.match(src, /dir\.x \* 3\.3, h, dir\.y \* 3\.3/);
});

test("rising ash is smooth and periodic at the 64-cycle clock boundary", () => {
  const billow = ([x, y, z], phase) => {
    let n = Math.sin(x * 1.7 + Math.sin(z * 1.3 + y * 0.9 - phase)) * Math.sin(z * 1.5 + Math.sin(y * 1.4 + x * 0.7 - phase));
    n += 0.6 * Math.sin(y * 1.9 - phase * 2 + Math.sin(x * 2.3 - z * 1.1) * 1.4) * Math.sin(x * 2.1 + z * 1.7);
    n += 0.3 * Math.sin(x * 4.1 + y * 3.3 - phase * 3 + Math.sin(z * 3.7));
    return 0.5 + 0.28 * n;
  };
  for (const [x, y] of points(1000, 30)) {
    const p = [x, y, x * 0.3 - y * 0.8];
    for (const harmonic of [0.5, 1]) {
      const phase = x * harmonic;
      assert.ok(Math.abs(billow(p, phase) - billow(p, phase + 2 * Math.PI * 64 * harmonic)) < 1e-12);
      assert.ok(Math.abs(billow(p, phase + 1e-5) - billow(p, phase)) < 5e-5);
    }
  }
  assert.match(src, /p\.y \* 1\.9 - phase \* 2\.0/);
  assert.match(src, /p\.y \* 3\.3 - phase \* 3\.0/);
});

test("high-force extra looks crane back instead of cropping the taller curtain", () => {
  for (let force = 1; force <= 1.5001; force += 0.05) {
    const R = 12.8 + 12 * (force - 1);
    const height = 1 + 8 * force;
    // Apparent height does not grow with the fountain-force fader.
    assert.ok(height / R <= 9 / 12.8 + 1e-12);
    assert.ok(R * 1.05 + 1.2 < 21);
    const { vy, vh } = launch(1, 1, force);
    assert.ok(vh * flight(vy) + 0.25 < R * 0.95 - 0.8);
  }
  assert.match(src, /4\.8 \+ 3\.5 \* max\(gForce - 1\.0, 0\.0\)/);
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
