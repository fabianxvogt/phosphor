import test from "node:test";
import assert from "node:assert/strict";
import horizon from "../scene-horizon.mjs";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { catalogLooks } from "../catalog.mjs";
import { defaultPattern } from "../rhythm.mjs";

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
const stepOf = (y) => {
  const u = Math.max(y[0], 0);
  return Math.min(
    0.6 / (1 + 18 * u),
    (0.5 * Math.max(u, 0.02)) / Math.max(Math.abs(y[1]), 1e-6),
  );
};
function trace(y, cap = 4000) {
  let phi = 0;
  for (let i = 0; i < cap; i++) {
    const h = stepOf(y);
    const next = encke(y, h);
    if (next[0] <= 0) {
      const c = Math.cos(h),
        s = Math.sin(h);
      const zm = [
        0.5 * (y[0] + next[0] * c - next[1] * s),
        0.5 * (y[1] + next[0] * s + next[1] * c),
      ];
      return {
        escaped: true,
        phiInf: phi + Math.atan2(zm[0], -zm[1]),
        steps: i + 1,
      };
    }
    if (next[0] >= 0.5) return { captured: true, steps: i + 1 };
    y = next;
    phi += h;
  }
  return { steps: cap };
}
// A ray arriving from (practically) infinity with impact parameter b.
const incoming = (b, u0 = 1e-6) => [
  u0,
  Math.sqrt(1 / (b * b) - u0 * u0 * (1 - 2 * u0)),
];

test("shader keeps the mirrored geodesic integrator", () => {
  for (const line of [
    "float hzF(float u) { return 3.0 * u * u; }",
    "vec2 k2 = hzF(z.x * c1 + z.y * s1) * vec2(-s1, c1);",
    "vec2 k4 = hzF(z.x * c2 + z.y * s2) * vec2(-s2, c2);",
    "z = y + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);",
    "return vec2(z.x * c2 + z.y * s2, -z.x * s2 + z.y * c2);",
    "return min(0.6 / (1.0 + 18.0 * u), 0.5 * max(u, 0.02) / max(abs(y.y), 1e-6));",
    "float h = hzH(y);",
    "vec2 zm = 0.5 * (y + vec2(yn.x * c - yn.y * sn, yn.x * sn + yn.y * c));",
    "phiInf = phi + atan(zm.x, -zm.y);",
    "if (uEnd >= 0.5) break;",
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
    assert.ok(
      Math.abs((deflection * b) / 4 - 1) < 6 / b,
      `b=${b} weak-field ratio`,
    );
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
      const sp = b * u0 * lapse;
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
    return (
      (2 * s3 - 3 * s2 + 1) * a[0] +
      (s3 - 2 * s2 + s) * h * a[1] +
      (-2 * s3 + 3 * s2) * b[0] +
      (s3 - s2) * h * b[1]
    );
  };
  for (const b of [6, 8, 12, 20]) {
    const start = [1 / 30, Math.sqrt(1 / (b * b) - (1 / 900) * (1 - 2 / 30))];
    const target = Math.PI / 2;
    let y = start,
      phi = 0,
      coarse = null;
    while (phi < target) {
      const h = stepOf(y),
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

// The precompute path tabulates (u, u') per impact-parameter row and orbit
// angle column; the image interpolates rows linearly and columns with cubic
// Hermite. Emulate it on the CPU against direct integration.
const EPS = 0.002,
  X0 = Math.asinh(-Math.sqrt(27) / EPS),
  DPHI = (3.2 * Math.PI) / 127;
const rowB = (row, x1) =>
  Math.sqrt(27) +
  EPS *
    Math.sinh(
      row < 255.75
        ? (X0 * (255.5 - row)) / 255.5
        : (x1 * (row - 255.5)) / 255.5,
    );
const rowF = (b, x1) => {
  const x = Math.asinh((b - Math.sqrt(27)) / EPS);
  return x < 0 ? 255.5 * (1 - x / X0) : 255.5 + (255.5 * x) / x1;
};
function initial(b, r) {
  const u0 = 1 / r,
    lapse = Math.sqrt(1 - 2 * u0);
  const sp = Math.min(Math.max(b * u0 * lapse, 1e-5), 1),
    cp = -Math.sqrt(Math.max(1 - sp * sp, 0));
  return [u0, (-u0 * lapse * cp) / sp];
}
function advance(y, phi, target) {
  for (let k = 0; k < 220 && phi < target - 1e-6 && y[0] < 0.5; k++) {
    const h = Math.min(stepOf(y), target - phi);
    y = encke(y, h);
    phi += h;
  }
  return y[0] >= 0.5 ? [0.6, 0] : y;
}
test("table rows invert, never straddle the shadow edge, and match direct integration", () => {
  for (const line of [
    "const float HZ_X0 = -8.555673749021336;",
    "const float HZ_DPHI = 0.07915824009045148;",
    "return x < 0.0 ? 255.5 * (1.0 - x / HZ_X0) : 255.5 + 255.5 * x / x1;",
  ])
    assert.ok(horizon.fragment.includes(line), line);
  const r = 27,
    x1 = Math.asinh((r / Math.sqrt(1 - 2 / r) - Math.sqrt(27)) / EPS);
  for (const row of [0, 17, 255, 256, 400, 511])
    assert.ok(Math.abs(rowF(rowB(row, x1), x1) - row) < 1e-6);
  assert.ok(rowB(255, x1) < Math.sqrt(27) && rowB(256, x1) > Math.sqrt(27));
  let worst = 0,
    checked = 0;
  for (const b of [1.5, 3, 4.6, 5.6, 7, 9.5, 14, 20]) {
    const inside = b < Math.sqrt(27);
    const rf = Math.min(
      Math.max(rowF(b, x1), inside ? 0 : 256),
      inside ? 255 : 511,
    );
    const r0 = Math.floor(rf),
      r1 = Math.min(r0 + 1, inside ? 255 : 511),
      w = rf - r0;
    for (const phi of [0.3, 1.1, 2.0, 2.9]) {
      const j = Math.floor(phi / DPHI),
        sf = phi / DPHI - j;
      const sample = (row) => {
        const y0 = initial(rowB(row, x1), r);
        const a = advance(y0, 0, j * DPHI),
          c = advance(a, j * DPHI, (j + 1) * DPHI);
        if (a[0] >= 0.5 || c[0] >= 0.5) return null;
        const s2 = sf * sf,
          s3 = s2 * sf;
        return (
          (2 * s3 - 3 * s2 + 1) * a[0] +
          (s3 - 2 * s2 + sf) * DPHI * a[1] +
          (-2 * s3 + 3 * s2) * c[0] +
          (s3 - s2) * DPHI * c[1]
        );
      };
      const u0 = sample(r0),
        u1 = sample(r1);
      if (u0 === null || u1 === null) continue;
      const table = u0 + (u1 - u0) * w;
      const direct = advance(initial(b, r), 0, phi)[0];
      if (direct <= 0.02 || direct >= 0.5) continue;
      worst = Math.max(worst, Math.abs(1 / table - 1 / direct) * direct);
      checked++;
    }
  }
  // Crossing radii from the table agree with direct integration to 2%.
  assert.ok(checked > 10, `checked ${checked}`);
  assert.ok(worst < 0.02, `relative radius error ${worst}`);
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
  return (
    mix(mix(34, 32, form), 30, blaze) *
    (1 - 0.08 * pass) *
    (1 + 0.025 * Math.sin(3 * az))
  );
}
test("the camera never enters the horizon or the photon sphere", () => {
  for (const line of [
    "pass = blaze * pow(0.5 + 0.5 * cos(az - 1.9), 6.0);",
    "return mix(mix(34.0, 32.0, form), 30.0, blaze) * (1.0 - 0.08 * pass) *\n    (1.0 + 0.025 * sin(3.0 * az));",
    "incl = clamp(incl, 0.05, 1.25);",
  ])
    assert.ok(horizon.fragment.includes(line), line);
  let least = Infinity;
  for (let dev = 0; dev <= 2.0001; dev += 0.01)
    for (let az = 0; az < 2 * Math.PI; az += 0.01)
      least = Math.min(least, cameraRadius(dev, az));
  assert.ok(
    least > 15 && least > 3 && least > 2,
    `closest camera radius ${least}`,
  );
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
        assert.ok(
          tau < 0.02,
          `layer ${k} reseeded at weight ${1 - Math.abs(2 * tau - 1)}`,
        );
      lastId[k] = id;
    }
  }
  assert.ok(count > 20);
  assert.match(
    horizon.simulation.fragment,
    /float wraps = floor\(flow \+ u_dt \* hzRate\(1\)\);/,
  );
  assert.match(
    horizon.simulation.fragment,
    /outColor = pack24\(value \+ u_dt \* hzRate\(i\)\);/,
  );
});

test("horizon declares a continuous three-state world and strong extra looks", () => {
  assert.equal(horizon.number, 89);
  assert.equal(horizon.development, "development");
  assert.deepEqual(horizon.type, { key: "development", values: [0, 1, 2] });
  assert.ok(horizon.presets.length >= 8);
  for (const preset of horizon.presets)
    for (const field of horizon.schema) {
      const v = preset.params[field.key];
      assert.ok(
        Number.isFinite(v) && v >= field.min && v <= field.max,
        `${preset.name}.${field.key}`,
      );
    }
  const ids = catalogLooks(scenes).map((l) => l.id);
  const world = defaultWorlds(ids).find((w) => w.id === "horizon");
  assert.ok(world, "authored world is playable");
  const clips = world.states.map((s) => {
    const index = horizon.presets.findIndex(
      (p) => `horizon:${p.name}` === s.look,
    );
    return { snapshot: presetSnapshot(horizon, index) };
  });
  assert.deepEqual(continuousDevelopment(clips, horizon)?.positions, [0, 1, 2]);
  assert.equal(
    new Set(horizon.presets.map((p) => p.seed)).size,
    horizon.presets.length - 2,
  );
});

test("rework keeps a short-side camera, finite jets and footprint-filtered gas", () => {
  assert.match(horizon.fragment, /2\.0 \* u_resolution\.y \/ shortSide/);
  assert.match(
    horizon.fragment,
    /gPixelAngle = 2\.0 \/ \(focal \* shortSide\)/,
  );
  assert.match(horizon.fragment, /gJetLen = min\(gJetLen, radius \* 0\.36\)/);
  assert.match(horizon.fragment, /y > 1\.15 \* gJetLen/);
  assert.match(
    horizon.fragment,
    /1\.0 - smoothstep\(0\.8 \* gJetLen, 1\.15 \* gJetLen, y\)/,
  );
  assert.match(horizon.fragment, /order < 0\.5 \? 3 : 2/);
  // Finite luminous jets project inside the short side even on close passes.
  for (let r = 15; r <= 48; r += 0.1)
    assert.ok(((1.15 * Math.min(24, r * 0.36)) / r) * 2.3 < 0.96);
});

test("slot-3 photon relay is local, count-addressed and authored in all styles", () => {
  const relay = horizon.rhythm.find((r) => r.slot === 3);
  assert.equal(relay.id, "photon-relay");
  for (const style of ["restrained", "driving", "accented"]) {
    const pattern = defaultPattern(horizon.rhythm, style);
    const hits = pattern.tracks.reduce(
      (sum, t) =>
        sum + (t.steps.filter((v) => v > 0).length * t.division * 4) / t.length,
      0,
    );
    assert.ok(hits >= { restrained: 2, driving: 6, accented: 8 }[style]);
    const track = relay.styles[style];
    assert.ok(track.steps.filter((v) => v > 0).length >= 2);
    assert.ok(track.duration > 0 && track.strength <= 1);
  }
  for (const uniform of ["u_rhythm.w", "u_rhythmHit.w", "u_rhythmCount.w"])
    assert.ok(horizon.fragment.includes(uniform));
  assert.match(horizon.fragment, /relayRim = exp\(-sq\(\(b - BC/);
  assert.ok(
    !horizon.fragment.includes("u_time"),
    "integrated phases are late-time safe",
  );
});

test("camera development is smooth and reversible without a close-pass lurch", () => {
  for (let az = 0; az < Math.PI * 2; az += 0.08) {
    for (let dev = 0; dev <= 2; dev += 0.01) {
      const r = cameraRadius(dev, az);
      const next = cameraRadius(Math.min(2, dev + 0.01), az);
      assert.ok(Number.isFinite(r) && r > 26);
      assert.ok(Math.abs(next - r) < 0.075);
    }
    assert.ok(cameraRadius(0, az) / cameraRadius(2, az) < 1.24);
  }
});

test("r4 plasma has broad cells, filtered higher images and a directional relay", () => {
  assert.ok(!horizon.fragment.includes("float ringlets"));
  assert.match(horizon.fragment, /freq = 3\.0, per = 32\.0/);
  assert.match(horizon.fragment, /disk \*= exp\(-0\.65 \* order\)/);
  assert.match(horizon.fragment, /float shear = headR \+ 0\.055 \* headS/);
  assert.match(horizon.fragment, /1\.0 - smoothstep\(24\.0, 34\.0, r\)/);
  assert.ok(!horizon.fragment.includes("smoothstep(R_STAR, R_IN"));
  assert.match(horizon.fragment, /float behind = mod\(da, TAU\)/);
  assert.match(horizon.fragment, /col \*= 1\.0 - 0\.9 \* relay \* quietRim/);
  const wake = (a) => Math.exp(-a / 0.65) * (1 - smooth(1.1, 1.65, a));
  for (let a = 0; a < 1.65; a += 0.01) {
    assert.ok(wake(a) >= wake(a + 0.01));
    assert.ok(wake(a) >= 0 && wake(a) <= 1);
  }
  assert.equal(wake(1.65), 0);
  // Star shear follows its 16M Keplerian orbit without raw-time phases.
  assert.match(horizon.simulation.fragment, /0\.015625/);
  assert.match(horizon.fragment, /R_STAR = 16\.0/);
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
      [3, 8],
    ],
  );
});
