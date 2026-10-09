import test from "node:test";
import assert from "node:assert/strict";
import mandelbrot, {
  SETS,
  TARGETS,
  ITERATION_CAP,
  iterationSlope,
  routeList,
  mapStep,
  escapeCount,
  ds,
  dsOrbit,
  perturbEscape,
  orbitShape,
  skewOf,
  jacobian,
} from "../scene-mandelbrot.mjs";
import scenes, { GATED } from "../scenes.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const fr = Math.fround;

// Exact float64 orbit z_0 = 0, z_{n+1} = f(z_n) + c.
function orbit64(set, x, y, count) {
  const out = [[0, 0]];
  let a = 0, b = 0;
  for (let n = 1; n < count; n++) {
    [a, b] = mapStep(set, a, b, x, y);
    out.push([a, b]);
  }
  return out;
}

test("CPU escape counts match hand-iterated orbits for every set", () => {
  // c = 1 on the real axis: 0, 1, 2, 5, 26, 677 for the quadratic sets
  // (|677|² > 1e5), and 0, 1, 2, 9, 730 for z³.
  for (const set of [0, 1, 2, 4]) assert.equal(escapeCount(set, 1, 0, 100), 5, `set ${set}`);
  assert.equal(escapeCount(3, 1, 0, 100), 4);
  // Bounded points: the Mandelbrot centre and tip, c = i (orbit i, -1+i, -i, ...),
  // the period-3 window shared by every quadratic set on the real axis.
  assert.equal(escapeCount(0, 0, 0, 500), 500);
  assert.equal(escapeCount(0, -2, 0, 500), 500);
  assert.equal(escapeCount(0, 0, 1, 500), 500);
  for (const set of [0, 1, 2]) assert.equal(escapeCount(set, -1.7548776662466927, 0, 500), 500, `set ${set}`);
  // c = -1 is the period-2 superattracting point for Mandelbrot and Celtic.
  assert.equal(escapeCount(4, -1, 0, 500), 500);
  // The folds: Burning Ship takes |Re|,|Im| before squaring, Tricorn
  // conjugates, Celtic folds the real part after squaring.
  assert.deepEqual(mapStep(1, -1, 2, 0, 0), [-3, 4]);
  assert.deepEqual(mapStep(2, 1, 2, 0, 0), [-3, -4]);
  assert.deepEqual(mapStep(4, 1, 2, 0, 0), [3, 4]);
});

test("double-single helpers are exact error-free transforms and match float64", () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 4 - 2;
  for (let i = 0; i < 2000; i++) {
    const a = fr(rnd()), b = fr(rnd() * 10 ** Math.floor(rnd() * 3));
    const [s, e] = ds.twoSum(a, b);
    assert.equal(s + e, a + b, "twoSum is exact");
    const [p, q] = ds.twoProd(a, b);
    assert.equal(p + q, a * b, "twoProd is exact");
    // Double-single sums and products keep ~46 bits.
    const x = rnd(), y = rnd();
    const add = ds.value(ds.add(ds.from(x), ds.from(y)));
    const xs = ds.value(ds.from(x)), ys = ds.value(ds.from(y));
    assert.ok(Math.abs(add - (xs + ys)) <= 4e-14 * Math.max(1, Math.abs(xs + ys)), `add ${x} ${y}`);
    const mul = ds.value(ds.mul(ds.from(x), ds.from(y)));
    assert.ok(Math.abs(mul - xs * ys) <= 4e-14 * Math.max(1, Math.abs(xs * ys)), `mul ${x} ${y}`);
  }
  // A double-single number carries a target to ~1e-14, far below float32.
  for (const t of TARGETS) {
    assert.ok(Math.abs(ds.value(ds.from(t.x)) - t.x) < 1e-14);
    assert.ok(Math.abs(ds.value(ds.from(t.y)) - t.y) < 1e-14);
  }
});

// z_n and dz_n/dc (2×2, rows) at c.
function orbitJ(set, x, y, count) {
  let a = 0, b = 0, J = [0, 0, 0, 0];
  for (let n = 0; n < count; n++) {
    const D = jacobian(set, a, b);
    J = [D[0] * J[0] + D[1] * J[2] + 1, D[0] * J[1] + D[1] * J[3], D[2] * J[0] + D[3] * J[2], D[2] * J[1] + D[3] * J[3] + 1];
    [a, b] = mapStep(set, a, b, x, y);
  }
  return { z: [a, b], J };
}
// Size of the Newton correction that would solve F(c) = 0.
function newtonStep(F, J) {
  const det = J[0] * J[3] - J[1] * J[2];
  return Math.hypot((J[3] * F[0] - J[1] * F[1]) / det, (-J[2] * F[0] + J[0] * F[1]) / det);
}

test("every target is an exact nucleus or Misiurewicz point of its set", () => {
  for (const [i, t] of TARGETS.entries()) {
    const o = orbit64(t.set, t.x, t.y, (t.k ?? 0) + t.p + 1);
    if (t.kind === "n") {
      // Newton for z_p(c) = 0 would move c by less than float64 resolution.
      const { z, J } = orbitJ(t.set, t.x, t.y, t.p);
      assert.ok(newtonStep(z, J) < 2e-15, `#${i} z_p = 0`);
      // Lowest period: no proper divisor returns to 0.
      for (let q = 1; q < t.p; q++) if (t.p % q === 0) assert.ok(Math.hypot(...o[q]) > 1e-6, `#${i} period ${q}`);
    } else {
      const A = orbitJ(t.set, t.x, t.y, t.k + t.p), B = orbitJ(t.set, t.x, t.y, t.k);
      const F = [A.z[0] - B.z[0], A.z[1] - B.z[1]], J = A.J.map((v, j) => v - B.J[j]);
      assert.ok(newtonStep(F, J) < 2e-15, `#${i} z_{k+p} = z_k`);
      const [c, d] = [o[t.k - 1 + t.p], o[t.k - 1]];
      assert.ok(Math.hypot(c[0] - d[0], c[1] - d[1]) > 1e-6, `#${i} preperiod is exactly k`);
    }
  }
});

test("the double-single reference orbit (GPU port) agrees with float64", () => {
  for (const [i, t] of TARGETS.entries()) {
    const { L } = orbitShape(t);
    assert.ok(L <= 256, "orbit fits the state texture");
    const a = dsOrbit(t.set, t.x, t.y, L), b = orbit64(t.set, t.x, t.y, L);
    for (let n = 0; n < L; n++) {
      const err = Math.hypot(a[n][0] - b[n][0], a[n][1] - b[n][1]);
      assert.ok(err < 4e-7 * Math.max(1, Math.hypot(...b[n])), `#${i} Z_${n} err ${err}`);
    }
  }
});

// Escape counts on a coarse grid around a target at depth d, by float64
// perturbation (the reference is the exact periodic orbit).
function grid(t, depth, w = 20, h = 12) {
  const { L, loopAt } = orbitShape(t);
  const ref = orbit64(t.set, t.x, t.y, L);
  const scale = SETS[t.set].view[2] * 2 ** -depth;
  const limit = Math.round(Math.min(ITERATION_CAP, 64 + iterationSlope(t) * depth));
  const counts = [];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const u = ((i + 0.5) / w - 0.5) * (w / h) * 2, v = ((j + 0.5) / h - 0.5) * 2;
      counts.push(perturbEscape(t.set, ref, loopAt, u * scale, v * scale, limit));
    }
  return { counts, limit };
}

test("dives stay on the boundary all the way down and nuclei end on a minibrot", () => {
  for (const [i, t] of TARGETS.entries()) {
    for (const f of [0.35, 0.7, 1]) {
      const { counts, limit } = grid(t, t.D * f);
      const escaped = counts.filter((c) => c < limit);
      const spread = new Set(escaped).size;
      assert.ok(escaped.length >= counts.length * 0.5, `#${i} at ${f}·D mostly exterior`);
      assert.ok(spread >= 8, `#${i} at ${f}·D shows structure (${spread} distinct counts)`);
      if (f === 1 && t.kind === "n") {
        const inside = counts.length - escaped.length;
        assert.ok(inside >= 1 && inside < counts.length * 0.4, `#${i} minibrot visible at the end (${inside})`);
      }
    }
    // Every dive ends with the view's short side at 1e-10 or less.
    assert.ok(2 * SETS[t.set].view[2] * 2 ** -t.D <= 1e-10, `#${i} depth`);
  }
});

test("float32 perturbation resolves a 1e-10 view that plain float32 cannot", () => {
  const t = TARGETS[0];
  const { L, loopAt } = orbitShape(t);
  const ref32 = dsOrbit(t.set, t.x, t.y, L), ref64 = orbit64(t.set, t.x, t.y, L);
  const scale = SETS[0].view[2] * 2 ** -(t.D - 1);
  const limit = Math.round(64 + iterationSlope(t) * t.D);
  const naive = new Set(), pert = new Set();
  let agree = 0;
  const n = 48;
  for (let i = 0; i < n; i++) {
    const dx = ((i + 0.5) / n - 0.5) * 2 * scale, dy = 0.37 * scale;
    naive.add(`${fr(t.x + dx)},${fr(t.y + dy)}`);
    const a = perturbEscape(t.set, ref32, loopAt, fr(dx), fr(dy), limit, fr);
    const b = perturbEscape(t.set, ref64, loopAt, dx, dy, limit);
    pert.add(a);
    if (a === b) agree++;
  }
  assert.ok(naive.size <= 2, "float32 coordinates collapse to one point");
  assert.ok(pert.size >= 12, `perturbation shows structure (${pert.size})`);
  assert.ok(agree >= n * 0.85, `float32 perturbation matches float64 (${agree}/${n})`);
});

test("routes, skews and shader tables are consistent", () => {
  for (let set = 0; set < SETS.length; set++)
    for (let route = 0; route < 4; route++) {
      const list = routeList(set, route);
      assert.ok(list.length >= 2, `set ${set} route ${route} loops over targets`);
      for (const i of list) assert.equal(TARGETS[i].set, set);
    }
  for (const t of TARGETS) {
    const { theta, ell } = skewOf(t);
    assert.ok(Number.isFinite(theta) && Number.isFinite(ell) && ell >= 0 && ell < 2.5);
    if (t.set === 0 || t.set === 3) assert.equal(ell, 0, "conformal sets need no unskew");
    // Exact hi/lo bit patterns reach the shader.
    const hi = new Uint32Array(new Float32Array([t.x]).buffer)[0].toString(16).padStart(8, "0");
    assert.ok(mandelbrot.fragment.includes(`0x${hi}u`));
    assert.ok(t.D >= 30 && t.D <= 64 && iterationSlope(t) > 0);
  }
  assert.ok(/const int CAP = \d+;/.test(mandelbrot.fragment));
  assert.equal(mandelbrot.simulation.size[0] * (mandelbrot.simulation.size[1] - 1), 512);
});

test("mandelbrot is registered, ungated, and its looks validate", () => {
  assert.ok(scenes.includes(mandelbrot));
  assert.ok(!GATED.has("mandelbrot"));
  assert.equal(mandelbrot.number, 66);
  assert.ok(mandelbrot.presets.length >= 8);
  const names = new Set(), seeds = new Set(), styles = new Set();
  for (const [i, preset] of mandelbrot.presets.entries()) {
    names.add(preset.name);
    seeds.add(preset.seed);
    for (const def of mandelbrot.schema) {
      const v = preset.params[def.key];
      assert.ok(v >= def.min && v <= def.max, `${preset.name}.${def.key}`);
      if (def.step === 1) assert.ok(Number.isInteger(v));
    }
    const p = preset.params;
    styles.add(`${p.set}/${p.route}/${p.edge > 0.7 ? "lines" : p.bands > 0.6 ? "bands" : "glow"}/${p.speed > 0.6 ? "fast" : p.speed < 0.2 ? "slow" : "mid"}`);
    const snapshot = presetSnapshot(mandelbrot, i);
    assert.deepEqual(validateSnapshot(JSON.parse(JSON.stringify(snapshot)), scenes), snapshot);
  }
  assert.equal(names.size, mandelbrot.presets.length);
  assert.equal(seeds.size, mandelbrot.presets.length);
  assert.equal(styles.size, mandelbrot.presets.length, "every look has its own style");
  for (const v of mandelbrot.type.values) assert.ok(mandelbrot.presets.some((p) => p.params.set === v), `set ${v} has a look`);
});
