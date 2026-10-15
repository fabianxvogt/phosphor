import test from "node:test";
import assert from "node:assert/strict";
import ink, {
  INK_RING,
  INK_SPEED,
  kelvinVelocity,
  inkIdentity,
  inkVelocity,
} from "../scene-ink.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { advanceClocks } from "../scene-time.mjs";

const TAU = 2 * Math.PI;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const rot = ([x, y], a) => [
  Math.cos(a) * x + Math.sin(a) * y,
  -Math.sin(a) * x + Math.cos(a) * y,
];
const noise = (p) =>
  p.reduce(
    (s, v, i) =>
      s + [0.36, 0.32, 0.32][i] * Math.sin(v + Math.sin(p[(i + 1) % 3])),
    0,
  );
const sq = (x) => x * x;

// Independent CPU transcription of the actual wound-sheet density, not a
// fluid-solver claim. This also exercises the two cached material moments.
function material(p, dev, phase = 0.7, seed = 11201, level = 0.5) {
  const grow = smooth(0, 1, dev),
    cloud = smooth(1, 2, dev);
  const finger = 0.9 * (0.7 + 0.35 * level),
    seedPhase = ((seed >>> 0) % 991) * 0.013;
  const carrier = (point, scale, ph) => {
    const q = point.map((v) => v / scale);
    const r0 = Math.hypot(q[0], q[2]),
      h0 = r0 - 0.82,
      aa = 0.32 ** 2;
    const e = Math.exp(-(h0 * h0 + sq(q[1] + 0.25)) / aa);
    const vr = (((0.75 / Math.PI) * r0 * (q[1] + 0.25)) / aa) * e;
    const vy = (0.75 / TAU) * (2 - (2 * r0 * h0) / aa) * e;
    const vel = [
      (q[0] / Math.max(r0, 0.001)) * vr,
      vy,
      (q[2] / Math.max(r0, 0.001)) * vr,
    ];
    for (let i = 0; i < 3; i++) q[i] -= 0.12 * Math.sin(phase) * vel[i];
    const a = Math.atan2(q[2], q[0] + 1e-7);
    const n = noise(q.map((v, i) => v * 4.1 + [seedPhase, ph, -ph][i]));
    const f = noise(q.map((v, i) => v * 11 + n * 2 + [ph, -ph, seedPhase][i]));
    const y0 =
      -0.25 -
      0.13 * Math.sin(ph) +
      0.04 * Math.sin(a * 3 + ph) +
      0.08 * Math.sin(a);
    const R =
      0.82 + 0.035 * Math.sin(a * 5 + ph) + 0.025 * Math.sin(a * 9 - ph);
    const tor = [Math.hypot(q[0], q[2]) - R + n * 0.035, q[1] - y0 + f * 0.035];
    const rho = Math.hypot(...tor),
      roll = Math.atan2(tor[1], tor[0] + 1e-7);
    const turn = rho * 25 - roll * 2 - 2 * ph + n * 1.6;
    const sheet = (0.5 + 0.5 * Math.cos(turn)) ** 6;
    const ring =
      (0.85 * Math.exp((-rho * rho) / 0.006) + sheet * 0.68) *
      Math.exp((-rho * rho) / 0.08);
    const behind = q[1] - y0,
      lobes = 0.5 + 0.5 * Math.sin(a * 7 + 1.4 * Math.sin(a * 3) + ph);
    const reach = (0.7 + 0.8 * lobes) * finger,
      tip = clamp((behind - reach + 0.48) / 0.48);
    const wakeR =
      R +
      0.22 * behind +
      0.22 * Math.sin(behind * 3.5 + a * 3 - ph) +
      0.19 * Math.sin(tip * Math.PI * 1.7) * tip +
      0.045 * Math.sin(a * 13 + behind * 6);
    const w = mix(0.04, 0.008, tip),
      d = Math.hypot(q[0], q[2]) - wakeR;
    let skirt =
      Math.exp(-sq((d + 0.025 * n) / w)) +
      0.3 * Math.exp(-sq((d - 0.1 * Math.sin(a * 15 + behind * 4)) / 0.018));
    skirt *=
      smooth(-0.02, 0.2, behind) * (1 - smooth(reach - 0.3, reach, behind));
    skirt *=
      (0.08 + 0.92 * sq(lobes)) *
      (0.65 + 0.35 * Math.sin(a * 5 + behind * 5 + ph));
    const above = q[1] - y0;
    const feed = [
      q[0] - 0.09 * Math.sin(above * 4 + ph),
      q[2] - 0.07 * Math.cos(above * 5 - ph),
    ];
    const stem =
      Math.exp(-feed.reduce((s, v) => s + v * v, 0) / 0.0018) *
      smooth(0.1, 0.45, above) *
      (1 - smooth(1.4, 1.8, above));
    const density = ring + skirt * 0.6 + stem * 0.42;
    return [density, density * clamp(0.55 + 0.3 * f + 0.15 * n, 0.05, 1)];
  };
  const q = [...p];
  [q[1], q[2]] = rot([q[1], q[2]], -0.64 - 0.08 * Math.sin(phase));
  [q[0], q[2]] = rot([q[0], q[2]], 0.12 * Math.sin(phase) + 0.08 * q[1]);
  const result = carrier(q, 1 + 0.4 * cloud, phase);
  if (grow > 0.0001)
    for (const side of [-1, 1]) {
      const v = q.map(
        (c, i) => c - [side * 1.3, 0.65 + side * 0.25, side * 0.6][i],
      );
      [v[0], v[1]] = rot([v[0], v[1]], side * 0.36 * grow);
      const m = carrier(
        v,
        Math.max(0.001, (0.72 + 0.38 * cloud) * grow),
        phase + side * 1.2,
      );
      result.forEach((_, i) => (result[i] += m[i] * grow));
    }
  result.forEach((_, i) => (result[i] *= 1 - 0.92 * cloud));
  let cloudEdge = -2;
  if (cloud > 0.0001) {
    const n = [
      noise(q.map((v) => v * 2.1 + phase)),
      noise([q[1], q[2], q[0]].map((v) => v * 2.5 - phase)),
      noise([q[2], q[0], q[1]].map((v) => v * 2 + seedPhase)),
    ];
    const warp = q.map((v, i) => v + 0.3 * n[i]);
    const broad = noise(
      warp.map((v, i) => v * 2.2 + [seedPhase, phase, -phase][i]),
    );
    const fine = noise(warp.map((v) => v * 7.5 + broad * 3));
    const boundary = p.reduce(
      (sum, v, i) => sum + sq(v / [3.0, 2.5, 1.8][i]),
      0,
    );
    cloudEdge =
      broad + fine * 0.27 - (1 - cloud) * 2 - 0.16 - 0.8 * boundary ** 3;
    const folds =
      (0.5 + 0.5 * Math.sin(broad * 7 + fine * 0.65 - q[1] * 1.5)) ** 3;
    const c =
      smooth(-0.06, 0.09, cloudEdge) *
      (0.015 + folds * 0.85) *
      Math.exp(-q.reduce((s, v, i) => s + sq(v / [3.2, 2.7, 2][i]), 0) * 0.65);
    result[0] += c;
    result[1] += c * (0.3 + 0.7 * folds);
  }
  const edge = smooth(
    0,
    0.24,
    Math.min(3.2 - Math.abs(p[0]), 2.7 - Math.abs(p[1]), 2 - Math.abs(p[2])),
  );
  return [...result.map((v) => v * edge), mix(-2, cloudEdge, edge)];
}
const density = (...args) => material(...args)[0];
const grid = [80, 96, 40],
  tile = [82, 98],
  atlas = [656, 490];
const extent = (dev) => {
  const a = smooth(0, 1, dev),
    b = smooth(1, 2, dev);
  return [
    1.48 + 1.18 * a + 0.54 * b,
    2.08 + 0.18 * a + 0.44 * b,
    1.42 + 0.15 * a + 0.43 * b,
  ];
};
const address = ([x, y, z]) => [
  (z % 8) * tile[0] + x + 1,
  Math.floor(z / 8) * tile[1] + y + 1,
];
const half = (v) => {
  if (!v) return 0;
  const quantum = Math.max(
    2 ** -24,
    2 ** (Math.floor(Math.log2(Math.abs(v))) - 10),
  );
  return Math.round(v / quantum) * quantum;
};
function cachedDensity(p, dev) {
  const ext = extent(dev);
  const c = p.map((v, i) =>
    clamp(((v / ext[i]) * 0.5 + 0.5) * (grid[i] - 1), 0, grid[i] - 1.001),
  );
  const lo = c.map(Math.floor),
    f = c.map((v, i) => v - lo[i]);
  const sample = (dx, dy, dz) =>
    half(
      density(
        lo.map(
          (v, i) => (((v + [dx, dy, dz][i]) / (grid[i] - 1)) * 2 - 1) * ext[i],
        ),
        dev,
      ),
    );
  const plane = (z) =>
    mix(
      mix(sample(0, 0, z), sample(1, 0, z), f[0]),
      mix(sample(0, 1, z), sample(1, 1, z), f[0]),
      f[1],
    );
  return mix(plane(0), plane(1), f[2]);
}

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
  assert.ok(ink.fragment.includes(INK_SPEED.toFixed(10)));
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
  for (const source of [
    "h0=r0-0.82",
    "aa=0.32*0.32",
    "float vr=0.75/PI",
    "q-=0.12*gCurl*sin(gPhase)",
  ])
    assert.ok(ink.fragment.includes(source), source);
});

test("wound pigment sheets, not solid domes, stay finite, reversible and periodic", () => {
  const identity = inkIdentity(11201);
  assert.equal(identity.length, 3);
  assert.notDeepEqual(identity, inkIdentity(11202));
  for (const p of [
    [0, 0, 0],
    [0.8, -0.5, 0.1],
    [1.3, 0.5, 0.3],
    [-1, -1, 0.2],
    [0.1, 1.6, 0],
  ]) {
    const values = Array.from({ length: 401 }, (_, i) => density(p, i / 200));
    for (let i = 0; i < values.length; i++) {
      assert.ok(Number.isFinite(values[i]) && values[i] >= 0 && values[i] < 4);
      assert.equal(density(p, i / 200), values[i]);
      if (i) assert.ok(Math.abs(values[i] - values[i - 1]) < 0.12);
      assert.deepEqual(inkIdentity(11201), identity);
    }
    for (const d of [0, 1, 2])
      assert.ok(Math.abs(density(p, d - 1e-6) - density(p, d + 1e-6)) < 1e-7);
    assert.ok(
      Math.abs(density(p, 1.4, 0.7) - density(p, 1.4, 0.7 + TAU)) < 1e-12,
    );
    const [d, m] = material(p, 1.4);
    assert.ok(m >= 0 && m <= d);
  }
  assert.equal(ink.geometry, undefined);
  assert.equal(ink.simulation, undefined);
  assert.doesNotMatch(ink.fragment, /fract\(.*u_time|mod\(u_time|float dome=/);
  assert.doesNotMatch(ink.fragment, /uv\.x\*14\.0/); // old vertical bars
  assert.match(ink.fragment, /broad\+fine\*0\.27-\(1\.0-gCloud\)\*2\.0/);
});

test("guttered half-float density atlas has bijective nodes and bounded trilinear error", () => {
  const addresses = new Set();
  for (let z = 0; z < grid[2]; z++)
    for (let y = 0; y < grid[1]; y++)
      for (let x = 0; x < grid[0]; x++) {
        const [u, v] = address([x, y, z]);
        assert.ok(u > 0 && u < atlas[0] && v > 0 && v < atlas[1]);
        addresses.add(v * atlas[0] + u);
        // Node's entire bilinear footprint lies inside its slice, including
        // at the two extreme nodes, thanks to the duplicate one-node gutter.
        assert.ok(u % tile[0] >= 1 && u % tile[0] <= grid[0]);
        assert.ok(v % tile[1] >= 1 && v % tile[1] <= grid[1]);
      }
  assert.equal(
    addresses.size,
    grid.reduce((a, b) => a * b),
  );
  let sum = 0,
    max = 0,
    n = 0;
  for (const d of [0, 0.7, 1, 1.5, 2])
    for (let i = 0; i < 100; i++) {
      const ext = extent(d),
        p = [
          Math.sin(i * 2.39) * ext[0] * 0.9,
          Math.sin(i * 3.73) * ext[1] * 0.9,
          Math.cos(i * 1.17) * ext[2] * 0.9,
        ];
      const approx = cachedDensity(p, d),
        exact = density(p, d),
        error = Math.abs(approx - exact);
      assert.ok(approx >= 0 && approx < 4);
      sum += error;
      max = Math.max(max, error);
      n++;
    }
  assert.ok(sum / n < 0.035, `mean density error ${sum / n}`);
  assert.ok(max < 0.45, `worst thin-filament error ${max}`);
  assert.deepEqual(ink.precompute.size, atlas);
  assert.equal(ink.precompute.filter, "linear");
  assert.equal(ink.precompute.format, "rgba16f");
  assert.match(ink.fragment, /return vec4\(m\.x,inkField/);
  assert.match(ink.fragment, /for \(int i=0;i<16;\+\+i\)/);
  // This cache is far material only: the focused ring, wake and cloud
  // edges are evaluated at native output resolution, not sampled from it.
  assert.match(ink.fragment, /inkRingSkin/);
  assert.match(ink.fragment, /float ph=d\*42\.0/);
  // Cloud skin: one footprint-filtered noise ridge, no stacked isolines.
  assert.match(ink.fragment, /boxFade/);
  assert.match(ink.fragment, /for \(int j=0;j<7;\+\+j\)/);
  assert.match(ink.fragment, /float root=mix\(loT,hiT/);
});

const cloudField = (...args) => material(...args)[2];
const filamentPhase = (p, phase, seed = 11201) => {
  const n = noise(
    p.map(
      (v, i) =>
        v * 22 + [Math.sin(phase), (seed % 991) * 0.013, Math.cos(phase)][i],
    ),
  );
  return noise(p.map((v) => v * 7 + n * 0.6)) * 97 + n * 4;
};

test("native 3D billow crossings retain bright gaps, fine lamellae and continuous material identity", () => {
  let gaps = 0,
    clouds = 0,
    crossings = 0;
  for (let x = -10; x <= 10; x++)
    for (let y = -10; y <= 10; y++) {
      const p = [x / 4, y / 4, 0.3],
        a = cloudField(p, 2, 0.7);
      assert.ok(Math.abs(a - cloudField(p, 2, 0.7 + TAU)) < 1e-13);
      assert.ok(
        Math.abs(filamentPhase(p, 0.7) - filamentPhase(p, 0.7 + TAU)) < 1e-11,
      );
      if (a < 0) gaps++;
      if (a > 0.3) clouds++;
      for (const dev of [0, 0.5, 1, 1.5, 2]) {
        const f = cloudField(p, dev, 0.7);
        assert.ok(Number.isFinite(f));
        // |d field / d development| <= 3; allow floating-point slack.
        assert.ok(Math.abs(f - cloudField(p, dev + 1e-6, 0.7)) <= 3.01e-6);
      }
      // Independently bisect a real front-to-back 3D sign crossing. Seven
      // refinements + the final interpolated root avoid quantized skin UVs.
      let previous = 2,
        previousField = -2;
      for (let i = 0; i < 16; i++) {
        const z = 2 - (i + 0.5) * 0.25;
        const value = cloudField([p[0], p[1], z], 2, 0.7);
        if (value > 0 && previousField < 0) {
          let lo = previous,
            hi = z;
          for (let j = 0; j < 7; j++) {
            const mid = (lo + hi) / 2;
            if (cloudField([p[0], p[1], mid], 2, 0.7) > 0) hi = mid;
            else lo = mid;
          }
          assert.ok(Math.abs(lo - hi) <= 0.25 / 128 + 1e-12);
          const loField = cloudField([p[0], p[1], lo], 2, 0.7);
          const hiField = cloudField([p[0], p[1], hi], 2, 0.7);
          assert.ok(loField <= 0 && hiField > 0);
          const root = mix(lo, hi, clamp(-loField / (hiField - loField)));
          assert.ok(Math.abs(cloudField([p[0], p[1], root], 2, 0.7)) < 0.001);
          crossings++;
          break;
        }
        previous = z;
        previousField = value;
      }
    }
  assert.ok(
    gaps > 100 && clouds > 20 && crossings > 100,
    `${gaps} gaps / ${clouds} interiors / ${crossings} crossings`,
  );
  const skin = ink.fragment
    .split("vec3 inkRingSkin")[1]
    .split("vec3 inkFocus")[0];
  assert.doesNotMatch(skin, /fwidth|dFdx|dFdy/);
  assert.match(skin, /for \(int i=0;i<26;\+\+i\)/);
  assert.match(ink.fragment, /float behind=q\.y-y0/);
  assert.match(ink.fragment, /wakeR=R\+0\.22\*behind/);
  assert.match(ink.fragment, /u_secondary\*sideLamp\*0\.36/);
  assert.match(ink.fragment, /medium\.z\/max\(medium\.x/); // normalized moment
});

test("analytic noise gradient filters wake hairlines without derivatives in rejected branches", () => {
  const gradient = (p) => {
    const c = p.map(
      (x, i) => [0.36, 0.32, 0.32][i] * Math.cos(x + Math.sin(p[(i + 1) % 3])),
    );
    return c.map((x, i) => x + c[(i + 2) % 3] * Math.cos(p[i]));
  };
  for (let i = 0; i < 100; i++) {
    const p = [Math.sin(i) * 20, Math.cos(i * 3) * 20, i * 0.3];
    const g = gradient(p),
      h = 1e-5;
    for (let axis = 0; axis < 3; axis++) {
      const up = [...p],
        down = [...p];
      up[axis] += h;
      down[axis] -= h;
      assert.ok(Math.abs(g[axis] - (noise(up) - noise(down)) / (2 * h)) < 1e-8);
    }
  }
  assert.ok(
    ink.fragment.indexOf("vec2 dx=dFdx(q)") <
      ink.fragment.indexOf("if (abs(d)>0.19"),
  );
  assert.ok(
    0.82 + 0.19 + 0.022 < 1.06,
    "sphere encloses corrugated ring plus AA margin",
  );
  // Even the maximum possible broad+fine field is negative before the box
  // wall: portrait may see a curved billow silhouette, never a flat cap.
  for (const [box, radius] of [
    [3.2, 3],
    [2.7, 2.5],
    [2, 1.8],
  ])
    assert.ok(0.8 * (((box * 0.995) / radius) ** 2) ** 3 > 1 + 0.27 - 0.16);
});

test("eight stable looks, id-selected world, gestures and Kelvin clocks obey the contract", () => {
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
    ink.rhythm.map((r) => r.defaults.length),
    [4, 8, 16],
  );
  for (const ch of ["x", "y", "z"])
    assert.ok(ink.fragment.includes(`u_rhythm.${ch}`));
  assert.match(ink.fragment, /2\.4\+0\.048\*u_kick/);
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
