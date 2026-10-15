import test from "node:test";
import assert from "node:assert/strict";
import ink, { INK_RING, INK_SPEED, kelvinVelocity, inkIdentity, inkVelocity } from "../scene-ink.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { advanceClocks } from "../scene-time.mjs";

const TAU = 2 * Math.PI;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rot = ([x, y], a) => [Math.cos(a) * x + Math.sin(a) * y, -Math.sin(a) * x + Math.cos(a) * y];
const smin = (a, b, k) => Math.min(a, b) - Math.max(k - Math.abs(a - b), 0) ** 2 / (4 * k);
const noise = (p) => p.reduce((s, v, i) => s + [0.36, 0.32, 0.32][i] * Math.sin(v + Math.sin(p[(i + 1) % 3])), 0);

// CPU mirror of the material field, not a photographic or fluid solver
// reference. Reversal, interpolation and late-time periodicity exercise the
// actual authored field (including its analytic backwards characteristic).
function density(p, dev, phase = 0.7, seed = 11201, level = 0.5) {
  const grow = smooth(0, 1, dev), cloud = smooth(1, 2, dev);
  const finger = 0.9 * (0.7 + 0.35 * level), q = [...p];
  [q[0], q[2]] = rot([q[0], q[2]], 0.12 * Math.sin(phase) + 0.1 * q[1]);
  const r0 = Math.hypot(q[0], q[2]), h0 = r0 - 0.82, aa = 0.32 ** 2;
  const e = Math.exp(-(h0 * h0 + (q[1] + 0.25) ** 2) / aa);
  const vr = 0.75 / Math.PI * r0 * (q[1] + 0.25) / aa * e;
  const vy = 0.75 / TAU * (2 - 2 * r0 * h0 / aa) * e;
  const vel = [q[0] / Math.max(r0, 0.001) * vr, vy, q[2] / Math.max(r0, 0.001) * vr];
  for (let i = 0; i < 3; i++) q[i] -= 0.12 * Math.sin(phase) * vel[i];
  const n = noise(q.map((v, i) => v * 3.3 + [(seed >>> 0) % 991 * 0.013, phase, -phase][i]));
  const fine = Math.sin(q[0] * 12 + n * 2) * Math.sin(q[1] * 11 - phase) * Math.sin(q[2] * 13);
  const angle = Math.atan2(q[2], q[0] + 1e-7), radial = Math.hypot(q[0], q[2]);
  const fingers = 0.5 + 0.5 * Math.sin(angle * 9 + 1.5 * Math.sin(angle * 3) + phase);
  const ringY = -0.25 - 0.22 * Math.sin(phase), R = 0.82 + 0.35 * cloud;
  const fy = 0.22 * finger * fingers * (1 - smooth(-0.7, -0.15, q[1] - ringY));
  const tor = [radial - R, q[1] - ringY + fy];
  const roll = Math.atan2(tor[1], tor[0] + 1e-7);
  let d = Math.hypot(...tor) - mix(0.19, 0.6, cloud) - n * (0.045 + 0.13 * cloud);
  const stemR = mix(0.045, 0.12, cloud) + 0.025 * n + 0.04 * (q[1] - 1.5) ** 2;
  const stem = Math.hypot(q[0] - 0.08 * Math.sin(q[1] * 4 + phase), q[2] - 0.08 * Math.cos(q[1] * 3 - phase), Math.max(Math.abs(q[1] - 0.8) - 0.78, 0)) - stemR;
  d = smin(d, stem, 0.25);
  const below = ringY - q[1], reach = (0.4 + 0.95 * fingers) * finger * (1 + 0.2 * cloud);
  const skirtR = R + 0.12 * Math.sin(below * 4.5 - phase + angle * 3) - 0.12 * below + 0.07 * Math.sin(below * 9 + angle * 7);
  const w = (0.025 + 0.06 * fingers) * (1 - smooth(0, reach, below));
  const daughter = Math.abs(radial - skirtR - 0.12 * Math.sin(angle * 18 + below * 6)) - w * 0.5;
  const skirt = Math.max(Math.min(Math.abs(radial - skirtR) - w, daughter), -below, below - reach);
  d = smin(d, skirt, 0.12);
  const dome = Math.max(Math.hypot(q[0], (q[1] - ringY) * 1.85, q[2]) - R, ringY - q[1]);
  d = smin(d, dome + 0.045 * n, 0.12);
  if (grow > 0.001) for (const side of [-1, 1]) {
    const v = [q[0] - side * (0.72 + 0.32 * cloud), q[1] - (0.4 + side * 0.35), q[2] - side * 0.32];
    [v[0], v[1]] = rot([v[0], v[1]], side * 0.42 * grow);
    const f = 0.5 + 0.5 * Math.sin(v[0] * 9 + n * 2 + side * phase);
    const cap = Math.hypot(Math.hypot(v[0], v[2]) - (0.56 + 0.22 * cloud) * grow, v[1] + 0.22 * Math.sin(phase + side) + 0.32 * finger * f * (1 - smooth(-0.8, 0, v[1])));
    d = smin(d, cap - (0.2 + 0.48 * cloud) * grow - n * 0.12 * grow, 0.25);
  }
  let cd = (Math.hypot(q[0] / 1.55, (q[1] + 0.45) / 1.05, q[2]) - 1) * 1.2 - 0.38 * n - 0.15 * fine;
  cd += 0.12 * noise(q.map((v) => v * 6.5 + n - phase));
  d = smin(d, cd + (1 - cloud) * 4, 0.35);
  const edge = (1 - smooth(-0.05, 0.12, d)) * smooth(0, 0.16, Math.min(2.5 - Math.abs(p[0]), 2.3 - Math.abs(p[1]), 1.8 - Math.abs(p[2])));
  const layers = 0.18 + 0.82 * (0.5 + 0.5 * Math.sin(roll * 2 - 2 * phase + n * 3 + fine * 0.7 + q[1] * 3)) ** 2;
  return edge * layers;
}

// Four-XY-corner packing used by the optional data pass.
const grid = [80, 96, 64], extent = [2.5, 2.3, 1.8];
const address = ([x, y, z]) => [(z % 8) * 80 + x, Math.floor(z / 8) * 96 + y];
function cachedDensity(p, dev) {
  const c = p.map((v, i) => clamp((v / extent[i] * 0.5 + 0.5) * (grid[i] - 1), 0, grid[i] - 1.001));
  const lo = c.map(Math.floor), f = c.map((v, i) => v - lo[i]);
  const sample = (dx, dy, dz) => density(lo.map((v, i) => ((v + [dx, dy, dz][i]) / (grid[i] - 1) * 2 - 1) * extent[i]), dev);
  const plane = (z) => mix(mix(sample(0, 0, z), sample(1, 0, z), f[0]), mix(sample(0, 1, z), sample(1, 1, z), f[0]), f[1]);
  return mix(plane(0), plane(1), f[2]);
}

test("Kelvin thin-ring velocity has the correct constant, dimensions, sign and core dependence", () => {
  assert.equal(kelvinVelocity(4 * Math.PI, 1, 8 / Math.E ** 3), 2.75);
  const { gamma, radius, core } = INK_RING;
  assert.equal(INK_SPEED, kelvinVelocity(gamma, radius, core));
  assert.ok(INK_SPEED > 0.25 && INK_SPEED < 0.3);
  for (const scale of [0.1, 0.5, 2, 10]) {
    assert.ok(Math.abs(kelvinVelocity(gamma, radius * scale, core * scale) * scale - INK_SPEED) < 1e-14);
    assert.ok(Math.abs(kelvinVelocity(gamma * scale, radius, core) - INK_SPEED * scale) < 1e-14);
  }
  assert.equal(kelvinVelocity(-gamma, radius, core), -INK_SPEED);
  assert.ok(kelvinVelocity(gamma, radius, core / 2) > INK_SPEED);
  for (const args of [[1, 0, 1], [1, 1, 0], [1, 1, 2]]) assert.throws(() => kelvinVelocity(...args), RangeError);
  assert.match(ink.fragment, new RegExp(INK_SPEED.toFixed(10).replaceAll(".", "\\.")));
});

test("analytic toroidal velocity matches independent streamfunction derivatives and is incompressible", () => {
  const { gamma, radius } = INK_RING, a = 0.32, h = 1e-5;
  const psi = (r, y) => gamma / TAU * r * r * Math.exp(-((r - radius) ** 2 + y * y) / (a * a));
  for (const r of [0.1, 0.4, 0.82, 1, 1.3]) for (const y of [-0.4, -0.1, 0, 0.2]) {
    const v = inkVelocity([r, y, 0]);
    assert.ok(Math.abs(v[0] + (psi(r, y + h) - psi(r, y - h)) / (2 * h * r)) < 1e-7);
    assert.ok(Math.abs(v[1] + kelvinVelocity(gamma, radius, a) - (psi(r + h, y) - psi(r - h, y)) / (2 * h * r)) < 1e-7);
    const p = [r / Math.sqrt(2), y, r / Math.sqrt(2)];
    let divergence = 0;
    for (let i = 0; i < 3; i++) {
      const up = [...p], down = [...p]; up[i] += h; down[i] -= h;
      divergence += (inkVelocity(up)[i] - inkVelocity(down)[i]) / (2 * h);
    }
    assert.ok(Math.abs(divergence) < 1e-7);
  }
  assert.ok(inkVelocity([0.82, 0.2, 0])[0] > 0);
  assert.ok(inkVelocity([0.82, -0.2, 0])[0] < 0);
  assert.ok(inkVelocity([100, 0, 0])[1] < 0, "far water carries the descending ring");
  assert.ok(inkVelocity([0, 0, 0]).every(Number.isFinite));
  for (const source of ["h0=r0-0.82", "aa=0.32*0.32", "float vr=0.75/PI", "q-=0.12*sin(gPhase)"])
    assert.ok(ink.fragment.includes(source), source);
});

test("the same material and carrier identities persist across the full reversible development", () => {
  const identity = inkIdentity(11201);
  assert.equal(identity.length, 3);
  assert.notDeepEqual(identity, inkIdentity(11202));
  for (const p of [[0, 0, 0], [0.8, -0.5, 0.1], [1.3, 0.5, 0.3], [-1, -1, 0.2], [0.1, 1.6, 0]]) {
    const values = Array.from({ length: 401 }, (_, i) => density(p, i / 200));
    for (let i = 0; i < values.length; i++) {
      assert.ok(Number.isFinite(values[i]) && values[i] >= 0 && values[i] <= 1);
      assert.equal(density(p, i / 200), values[i]);
      if (i) assert.ok(Math.abs(values[i] - values[i - 1]) < 0.1);
      assert.deepEqual(inkIdentity(11201), identity);
    }
    for (const d of [0, 1, 2]) assert.ok(Math.abs(density(p, d - 1e-6) - density(p, d + 1e-6)) < 1e-7);
    assert.ok(Math.abs(density(p, 1.4, 0.7) - density(p, 1.4, 0.7 + TAU)) < 1e-12);
  }
  assert.equal(ink.geometry, undefined);
  assert.equal(ink.simulation, undefined);
  assert.doesNotMatch(ink.fragment, /fract\(.*u_time|mod\(u_time/);
});

test("density lattice addressing is bijective and its interpolation is bounded", () => {
  const addresses = new Set();
  for (let z = 0; z < 64; z++) for (let y = 0; y < 96; y++) for (let x = 0; x < 80; x++) {
    const [u, v] = address([x, y, z]);
    assert.ok(u >= 0 && u < 640 && v >= 0 && v < 768);
    addresses.add(v * 640 + u);
  }
  assert.equal(addresses.size, 80 * 96 * 64);
  let sum = 0, max = 0, n = 0;
  for (const d of [0, 0.7, 1, 1.5, 2]) for (let i = 0; i < 100; i++) {
    const p = [Math.sin(i * 2.39) * 2.2, Math.sin(i * 3.73) * 1.9, Math.cos(i * 1.17) * 1.5];
    const approx = cachedDensity(p, d), exact = density(p, d), error = Math.abs(approx - exact);
    assert.ok(approx >= 0 && approx <= 1);
    sum += error; max = Math.max(max, error); n++;
  }
  assert.ok(sum / n < 0.035, `mean density error ${sum / n}`);
  assert.ok(max < 0.4, `worst thin-filament error ${max}`);
  assert.deepEqual(ink.precompute.size, [640, 768]);
  assert.match(ink.fragment, /return inkField\(p\)\.x/);
  assert.match(ink.fragment, /for \(int i=0;i<56;\+\+i\)/);
});

test("eight validated looks, appended world, gestures and Kelvin clocks obey the continuous contract", () => {
  assert.equal(ink.number, 112);
  assert.equal(ink.development, "development");
  assert.deepEqual(ink.type.values, [0, 1, 2]);
  assert.equal(ink.presets.length, 8);
  for (const preset of ink.presets) for (const f of ink.schema)
    assert.ok(Number.isFinite(preset.params[f.key]) && preset.params[f.key] >= f.min && preset.params[f.key] <= f.max, `${preset.name}.${f.key}`);
  const first = ink.presets.slice(0, 3);
  assert.equal(new Set(first.map((p) => p.seed)).size, 1);
  const withoutDev = (p) => { const { development, ...other } = p.params; return other; };
  assert.deepEqual(first.map(withoutDev), first.map(() => withoutDev(first[0])));
  assert.deepEqual(continuousDevelopment(first.map((_, i) => ({ snapshot: presetSnapshot(ink, i) })), ink)?.positions, [0, 1, 2]);
  const worlds = defaultWorlds(catalogLooks(scenes).map((l) => l.id));
  assert.equal(worlds.at(-1).id, "ink-bloom");
  assert.deepEqual(worlds.at(-1).states.map((s) => s.name), ["Drop", "Plumes", "Nebula"]);
  assert.deepEqual(ink.rhythm.map((r) => r.defaults.length), [4, 8, 16]);
  for (const ch of ["x", "y", "z"]) assert.ok(ink.fragment.includes(`u_rhythm.${ch}`));
  assert.match(ink.fragment, /2\.5\+0\.05\*u_kick/);
  const p = ink.schema.map((f) => f.default);
  for (const t of [3600, 4096, 43200]) {
    const state = {};
    advanceClocks(state, ink.clocks, t - 1 / 60, p, 0.1);
    const before = [...advanceClocks(state, ink.clocks, t, p, 0.1)];
    const changed = p.map((v, i) => i === 1 || i === 6 ? v * 1.3 : v);
    const after = advanceClocks(state, ink.clocks, t + 1 / 60, changed, 0.9);
    for (let i = 0; i < 2; i++) assert.ok((after[i] - before[i] + TAU) % TAU < 0.01);
  }
});
