import test from "node:test";
import assert from "node:assert/strict";
import horizon from "../scene-horizon.mjs";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { catalogLooks } from "../catalog.mjs";

// CPU mirror of the shader's geodesic integrator (M = 1): the Binet
// equation u'' = -u + 3u² in the orbit angle. The flat part is an exact
// rotation; RK4 integrates the 3u² perturbation in the co-rotating frame
// (Encke). Escape at the root u = 0 (the asymptotic direction), capture at
// the horizon u = 1/2. The source checks below pin the shader to it.
const F = (u) => 3 * u * u;
function encke(y, h) {
  const c1 = Math.cos(h / 2),
    s1 = Math.sin(h / 2),
    c2 = c1 * c1 - s1 * s1,
    s2 = 2 * s1 * c1;
  const at = (z, s, k) => [y[0] + s * k[0], y[1] + s * k[1]];
  const k1 = [0, F(y[0])];
  let z = at(y, h / 2, k1);
  let f = F(z[0] * c1 + z[1] * s1);
  const k2 = [-f * s1, f * c1];
  z = at(y, h / 2, k2);
  f = F(z[0] * c1 + z[1] * s1);
  const k3 = [-f * s1, f * c1];
  z = at(y, h, k3);
  f = F(z[0] * c2 + z[1] * s2);
  const k4 = [-f * s2, f * c2];
  z = [
    y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
  ];
  return [z[0] * c2 + z[1] * s2, -z[0] * s2 + z[1] * c2];
}
const step = (u) => 0.6 / (1 + 18 * u);
function trace(y, cap = 4000) {
  let phi = 0;
  for (let i = 0; i < cap; i++) {
    const h = step(y[0]);
    const next = encke(y, h);
    if (next[0] <= 0) {
      const c = Math.cos(h),
        s = Math.sin(h);
      const zm = [
        0.5 * (y[0] + next[0] * c - next[1] * s),
        0.5 * (y[1] + next[0] * s + next[1] * c),
      ];
      return { escaped: true, phiInf: phi + Math.atan2(zm[0], -zm[1]), steps: i + 1 };
    }
    if (next[0] >= 0.5) return { captured: true, steps: i + 1 };
    y = next;
    phi += h;
  }
  return { steps: cap };
}
// A ray arriving from (practically) infinity with impact parameter b.
const incoming = (b, u0 = 1e-6) => [u0, Math.sqrt(1 / (b * b) - u0 * u0 * (1 - 2 * u0))];

test("shader keeps the mirrored geodesic integrator", () => {
  for (const line of [
    "float hzF(float u) { return 3.0 * u * u; }",
    "vec2 k2 = hzF(z.x * c1 + z.y * s1) * vec2(-s1, c1);",
    "vec2 k4 = hzF(z.x * c2 + z.y * s2) * vec2(-s2, c2);",
    "z = y + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);",
    "return vec2(z.x * c2 + z.y * s2, -z.x * s2 + z.y * c2);",
    "float h = 0.6 / (1.0 + 18.0 * y.x);",
    "vec2 zm = 0.5 * (y + vec2(yn.x * c - yn.y * sn, yn.x * sn + yn.y * c));",
    "phiInf = phi + atan(zm.x, -zm.y);",
    "if (uEnd >= 0.5) { captured = true; break; }",
    "float b = sp / (u0 * gLapseCam);",
    "vec2 y = vec2(u0, -u0 * gLapseCam * cp / sp);",
    "const float BC = 5.196152422706632;",
  ])
    assert.ok(horizon.fragment.includes(line), line);
});

test("deflection matches the weak-field limit 4M/b", () => {
  for (const b of [40, 80, 160, 320, 640]) {
    const start = incoming(b);
    const { escaped, phiInf } = trace(start);
    assert.ok(escaped, `b=${b} escapes`);
    // The incoming asymptote lies atan(u0 / u0') before the start angle.
    const deflection = phiInf + Math.atan2(start[0], start[1]) - Math.PI;
    // Leading order 4M/b; the next term is 15π M²/(4 b²).
    const expected = 4 / b + (15 * Math.PI) / (4 * b * b);
    assert.ok(
      Math.abs(deflection - expected) / (4 / b) < 0.01,
      `b=${b}: ${deflection} vs ${expected}`,
    );
    assert.ok(Math.abs(deflection * b / 4 - 1) < 6 / b, `b=${b} weak-field ratio`);
  }
});

test("the shadow edge sits at the critical impact parameter √27 M", () => {
  let lo = 4.5,
    hi = 6;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (trace(incoming(mid)).captured) lo = mid;
    else hi = mid;
  }
  assert.ok(Math.abs(lo - Math.sqrt(27)) < 2e-3, `critical b ${lo}`);
});

test("static-observer rays: capture exactly below √27 M from any camera radius", () => {
  for (const r of [10, 16, 27, 46]) {
    const u0 = 1 / r,
      lapse = Math.sqrt(1 - 2 * u0);
    // Inward ray at local angle ψ from the outward radial direction.
    const ray = (b) => {
      const sp = (b * u0 * lapse);
      const cp = -Math.sqrt(1 - sp * sp);
      return [u0, (-u0 * lapse * cp) / sp];
    };
    assert.ok(trace(ray(Math.sqrt(27) - 0.02)).captured, `r=${r} inside`);
    assert.ok(trace(ray(Math.sqrt(27) + 0.02)).escaped, `r=${r} outside`);
  }
});

test("Hermite crossings agree with a fine reference integration", () => {
  // Shader-sized steps with cubic Hermite interpolation at φ = π/2 versus a
  // very fine RK4 run: equatorial crossing radii agree to 1e-3 relative.
  const hermite = (a, b, h, s) => {
    const s2 = s * s,
      s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * a[0] + (s3 - 2 * s2 + s) * h * a[1] +
      (-2 * s3 + 3 * s2) * b[0] + (s3 - s2) * h * b[1];
  };
  for (const b of [6, 8, 12, 20]) {
    const start = [1 / 30, Math.sqrt(1 / (b * b) - (1 / 900) * (1 - 2 / 30))];
    const target = Math.PI / 2;
    let y = start,
      phi = 0,
      coarse = null;
    while (phi < target) {
      const h = step(y[0]),
        next = encke(y, h);
      if (phi + h >= target) coarse = hermite(y, next, h, (target - phi) / h);
      y = next;
      phi += h;
    }
    let fine = start;
    const n = 20000;
    for (let i = 0; i < n; i++) fine = encke(fine, target / n);
    assert.ok(Math.abs(1 / coarse - 1 / fine[0]) * fine[0] < 1e-3, `b=${b}`);
  }
});

// CPU mirror of the camera radius: never inside the horizon (r = 2M), nor
// the photon sphere (3M); the close pass stays outside 15M.
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
function cameraRadius(dev, az) {
  const form = smooth(0, 1, dev),
    blaze = smooth(1, 2, dev);
  const pass = blaze * Math.pow(0.5 + 0.5 * Math.cos(az - 1.9), 6);
  return mix(mix(46, 34, form), 27, blaze) * (1 - 0.42 * pass) * (1 + 0.025 * Math.sin(3 * az));
}
test("the camera never enters the horizon or the photon sphere", () => {
  for (const line of [
    "float pass = gBlaze * pow(0.5 + 0.5 * cos(az - 1.9), 6.0);",
    "float radius = mix(mix(46.0, 34.0, gForm), 27.0, gBlaze) * (1.0 - 0.42 * pass) *\n    (1.0 + 0.025 * sin(3.0 * az));",
    "incl = clamp(incl, 0.05, 1.25);",
  ])
    assert.ok(horizon.fragment.includes(line), line);
  let least = Infinity;
  for (let dev = 0; dev <= 2.0001; dev += 0.01)
    for (let az = 0; az < 2 * Math.PI; az += 0.01) least = Math.min(least, cameraRadius(dev, az));
  assert.ok(least > 15 && least > 3 && least > 2, `closest camera radius ${least}`);
});

// The flow counter (texel 2) counts wraps of the flow phase (texel 1) with
// the same arithmetic; each layer keeps one seed id for its whole life.
test("flow layers keep their seed while visible and advance on reset", () => {
  const q = (x) => Math.floor((x - Math.floor(x)) * 16777216) / 16777216;
  let flow = q(0.3),
    count = 0;
  const lastId = [null, null];
  for (let tick = 0; tick < 60 * 120; tick++) {
    const rate = 0.3 * (1 + 0.5 * Math.sin(tick / 300));
    const x = flow + rate / 60;
    count += Math.floor(x);
    flow = q(x);
    for (const k of [0, 1]) {
      const tau = (flow + 0.5 * k) % 1;
      const id = count + Math.floor(flow + 0.5 * k);
      if (lastId[k] !== null && id !== lastId[k])
        assert.ok(tau < 0.02, `layer ${k} reseeded at weight ${1 - Math.abs(2 * tau - 1)}`);
      lastId[k] = id;
    }
  }
  assert.ok(count > 20);
  assert.match(horizon.simulation.fragment, /float wraps = floor\(flow \+ u_dt \* hzRate\(1\)\);/);
  assert.match(horizon.simulation.fragment, /outColor = pack24\(value \+ u_dt \* hzRate\(i\)\);/);
});

test("horizon declares a continuous three-state world and strong extra looks", () => {
  assert.equal(horizon.number, 89);
  assert.equal(horizon.development, "development");
  assert.deepEqual(horizon.type, { key: "development", values: [0, 1, 2] });
  assert.ok(horizon.presets.length >= 8);
  for (const preset of horizon.presets)
    for (const field of horizon.schema) {
      const v = preset.params[field.key];
      assert.ok(Number.isFinite(v) && v >= field.min && v <= field.max, `${preset.name}.${field.key}`);
    }
  const ids = catalogLooks(scenes).map((l) => l.id);
  const world = defaultWorlds(ids).find((w) => w.id === "horizon");
  assert.ok(world, "authored world is playable");
  const clips = world.states.map((s) => {
    const index = horizon.presets.findIndex((p) => `horizon:${p.name}` === s.look);
    return { snapshot: presetSnapshot(horizon, index) };
  });
  assert.deepEqual(continuousDevelopment(clips, horizon)?.positions, [0, 1, 2]);
  assert.equal(new Set(horizon.presets.map((p) => p.seed)).size, horizon.presets.length - 2);
});

test("style limits: kick punch, roll, speed range and gesture periods", () => {
  assert.match(horizon.fragment, /\(1\.0 \+ 0\.025 \* kick\)/);
  assert.match(horizon.fragment, /float roll = 0\.04 \* sin/);
  const [a, b] = horizon.energy.swirl.mul;
  assert.ok(b / a <= 2.1, "energy raises rotation at most about 2x");
  assert.deepEqual(
    horizon.rhythm.map((r) => [r.slot, r.defaults.length]),
    [
      [0, 4],
      [1, 8],
      [2, 16],
    ],
  );
});
