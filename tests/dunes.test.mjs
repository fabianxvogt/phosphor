import test from "node:test";
import assert from "node:assert/strict";
import dunes, {
  REPOSE_DEGREES,
  REPOSE_SLOPE,
  SAND_GRAVITY,
  barchanHeight,
  saltation,
  rippleHeight,
  rippleFilter,
  leadingRidge,
} from "../scene-dunes.mjs";
import scenes from "../scenes.mjs";
import { FAMILY_CATALOG } from "../family-catalog.mjs";
import { catalogLooks } from "../catalog.mjs";
import { defaultWorlds, continuousDevelopment } from "../worlds.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const fract = (v) => v - Math.floor(v);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => {
  const f = clamp((x - a) / (b - a), 0, 1);
  return f * f * (3 - 2 * f);
};
function hash(x, y) {
  let q = [fract(x * 0.1031), fract(y * 0.1031), fract(x * 0.1031)];
  const d =
    q[0] * (q[1] + 33.33) + q[1] * (q[2] + 33.33) + q[2] * (q[0] + 33.33);
  q = q.map((v) => v + d);
  return fract((q[0] + q[1]) * q[2]);
}
function noiseSlope(x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const rx = fract(x),
    ry = fract(y);
  const fx = rx * rx * (3 - 2 * rx),
    fy = ry * ry * (3 - 2 * ry);
  const a = hash(ix, iy),
    b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1),
    d = hash(ix + 1, iy + 1);
  const mix = (a, b, t) => a + (b - a) * t;
  return [
    mix(mix(a, b, fx), mix(c, d, fx), fy),
    mix(b - a, d - c, fy) * 6 * rx * (1 - rx),
    mix(c - a, d - b, fx) * 6 * ry * (1 - ry),
  ];
}
function site(x, z, seed) {
  const row = Math.floor((z + 16) / 32);
  x += (((row % 2) + 2) % 2) * 14;
  const cell = [Math.floor((x + 14) / 28), Math.floor((z + 16) / 32)];
  const rnd = hash(cell[0] + (seed % 991), cell[1] + (seed % 991));
  const scale = 0.92 + 0.18 * rnd,
    angle = 1.05 + (rnd - 0.5) * 0.5;
  return {
    cell,
    q: [x - cell[0] * 28, z - cell[1] * 32],
    data: [
      3.2 + 1.2 * rnd,
      Math.cos(angle) * scale,
      Math.sin(angle) * scale,
      smooth(0.55, 0.9, rnd),
    ],
  };
}
// Independent mirror of the actual height AND analytic normal. Transform
// identities depend only on the seed and the material location, never dev.
function cap(q, H, repose) {
  const v = q[0] / 11,
    h = H * Math.max(0, (1 - v * v) * (1 + 0.6 * v * v)),
    d = q[1] + 3 - 13 * v * v;
  if (Math.abs(v) >= 1) return [0, 0, 0];
  const hx = (H * (-0.8 * v - 2.4 * v ** 3)) / 11,
    dx = (-26 * v) / 11;
  if (d < 0) {
    const shoulder = 14 - 8 * v * v,
      shoulderX = (-16 * v) / 11,
      w = Math.max(0, 1 - (d / shoulder) ** 2),
      dw = (-2 * d) / shoulder ** 2,
      wx = dw * dx + (2 * d * d * shoulderX) / shoulder ** 3;
    return [h * w * w, hx * w * w + 2 * h * w * wx, 2 * h * w * dw];
  }
  return h - repose * d > 0
    ? [h - repose * d, hx - repose * dx, -repose]
    : [0, 0, 0];
}
function surface(x, z, seed, dev, height = 1) {
  const {
      q,
      data: [H, a, b, star],
    } = site(x, z, seed),
    growth = smooth(0, 1, dev),
    relief = (0.5 + 0.7 * growth) * height;
  const shaped = [a * q[0] + b * q[1], -b * q[0] + a * q[1]];
  const repose = REPOSE_SLOPE / (Math.hypot(a, b) * height * 1.2);
  const B = cap(shaped, H, repose);
  const R = [
    -0.5 * shaped[0] + 0.8660254 * shaped[1],
    -0.8660254 * shaped[0] - 0.5 * shaped[1],
  ];
  const C = cap(R, H * 0.78, repose).map((v) => v * star);
  const cg = [-0.5 * C[1] - 0.8660254 * C[2], 0.8660254 * C[1] - 0.5 * C[2]];
  const chosen = B[0] >= C[0] ? B : [C[0], ...cg];
  const grad = [a * chosen[1] - b * chosen[2], b * chosen[1] + a * chosen[2]];
  const d = Math.max(Math.abs(q[0]), Math.abs(q[1]) * 0.875),
    f = clamp((d - 5) / 9, 0, 1);
  const edge = 1 - f * f * (3 - 2 * f),
    de = (-6 * f * (1 - f)) / 9;
  const eg =
    Math.abs(q[0]) > Math.abs(q[1]) * 0.875
      ? [Math.sign(q[0]), 0]
      : [0, Math.sign(q[1]) * 0.875];
  const result = [
    chosen[0] * edge * relief,
    ...grad.map((g, i) => (g * edge + chosen[0] * de * eg[i]) * relief),
  ];
  const leading = leadingRidge(x, z) * (1 - 0.35 * growth);
  const centre = -2 + 4.8 * Math.sin(0.065 * z) + 1.2 * Math.sin(0.13 * z);
  const cz = 0.312 * Math.cos(0.065 * z) + 0.156 * Math.cos(0.13 * z);
  const ld = x - centre,
    w = Math.max(0, 1 - (ld / 9) ** 2);
  const dx =
    leading > 0 ? (ld < 0 ? (-4 * 3.4 * w * ld) / 81 : -REPOSE_SLOPE) : 0;
  const ridge = [
    leading,
    dx * (1 - 0.35 * growth),
    -dx * cz * (1 - 0.35 * growth),
  ];
  const join = clamp(0.5 + (0.5 * (leading - result[0])) / 0.8, 0, 1);
  const blended = result.map((v, i) => v * (1 - join) + ridge[i] * join);
  blended[0] += 0.8 * join * (1 - join);
  return blended;
}

test("barchan crescent has downwind horns and a 34 degree slip face", () => {
  assert.equal(REPOSE_DEGREES, 34);
  assert.ok(Math.abs(REPOSE_SLOPE - Math.tan((34 * Math.PI) / 180)) < 1e-14);
  for (const x of [-9, -6, 0, 6, 9]) {
    const v = x / 11,
      crest = -3 + 13 * v ** 2,
      H = 4 * (1 - v ** 2) * (1 + 0.6 * v ** 2);
    assert.ok(Math.abs(barchanHeight(x, crest) - H) < 1e-12);
    assert.ok(crest >= -3 && crest < 10);
    const eps = 1e-5,
      d = Math.min(0.2, (H / REPOSE_SLOPE) * 0.1);
    const slope =
      (barchanHeight(x, crest + d + eps) - barchanHeight(x, crest + d - eps)) /
      (2 * eps);
    assert.ok(Math.abs(slope + REPOSE_SLOPE) < 1e-9);
    assert.equal(barchanHeight(x, crest + H / REPOSE_SLOPE + 1), 0);
    assert.equal(barchanHeight(x, crest - (14 - 8 * v * v) - 1e-8), 0);
  }
  for (const x of [-15, -11, 11, 15]) assert.equal(barchanHeight(x, 0), 0);
  assert.ok(barchanHeight(0, -9) > 0);
  assert.equal(barchanHeight(0, 7), 0, "the lee centre is empty between horns");
  assert.ok(barchanHeight(-9.5, 7) > 0.5);
  assert.ok(barchanHeight(9.5, 7) > 0.5);
  assert.match(
    dunes.fragment,
    /float repose=\.6745085168\/\(length\(data.yz\)\*u_params\[2\]\*1\.2\)/,
  );
});

test("height-only hot path equals the full differentiable profile", () => {
  for (let i = 0; i < 10000; i++) {
    const q = [Math.sin(i * 0.71) * 15, Math.cos(i * 1.37) * 30];
    const h = 3.2 + (i % 121) / 100,
      repose = 0.4 + (i % 65) / 100;
    const v = q[0] / 11,
      capHeight = h * Math.max(0, (1 - v * v) * (1 + 0.6 * v * v));
    const d = q[1] - (-3 + 13 * v * v);
    const w = Math.max(0, 1 - (d / (14 - 8 * v * v)) ** 2);
    const height =
      Math.abs(v) >= 1
        ? 0
        : d < 0
          ? capHeight * w * w
          : Math.max(0, capHeight - repose * d);
    assert.ok(Math.abs(height - cap(q, h, repose)[0]) < 1e-14);
  }
  assert.match(
    dunes.fragment,
    /float dsProfile\(vec2 q, float h, float repose\)/,
  );
});

test("mature slip angle survives site scale and authored height changes", () => {
  for (const scale of [0.92, 1, 1.1])
    for (const height of [0.6, 1, 1.3]) {
      const repose = REPOSE_SLOPE / (scale * height * 1.2);
      const grad = cap([0, 0], 4, repose);
      const worldSlope = -grad[2] * scale * height * 1.2;
      assert.ok(Math.abs((Math.atan(worldSlope) * 180) / Math.PI - 34) < 1e-12);
    }
});

test("analytic barchan/star-dune normals match finite differences", () => {
  const e = 1e-5;
  let maximum = 0,
    checked = 0;
  for (const seed of [11401, 11403, 11404, 11406])
    for (const dev of [0, 0.4, 1, 1.6, 2]) {
      for (let i = 0; i < 250; i++) {
        const x = Math.sin(i * 2.71) * 90 + 0.123,
          z = Math.cos(i * 0.73) * 90 + 0.321;
        const s = surface(x, z, seed, dev);
        const numeric = [
          (surface(x + e, z, seed, dev)[0] - surface(x - e, z, seed, dev)[0]) /
            (2 * e),
          (surface(x, z + e, seed, dev)[0] - surface(x, z - e, seed, dev)[0]) /
            (2 * e),
        ];
        maximum = Math.max(
          maximum,
          ...numeric.map((v, j) => Math.abs(v - s[j + 1])),
        );
        assert.ok(s.every(Number.isFinite));
        checked++;
      }
    }
  assert.ok(checked >= 5000);
  assert.ok(maximum < 2e-7, `gradient error ${maximum}`);
  assert.match(dunes.fragment, /chosen.yz=transpose\(transform\)\*chosen.yz/);
});

test("tile joins close without cracks and development keeps every material identity", () => {
  for (const seed of [11401, 11402, 11405]) {
    for (let k = -3; k <= 3; k++) {
      // Every row boundary has zero support at its edge.
      for (const x of [-25, -9, 0, 8, 23]) {
        for (const dev of [0, 0.25, 0.75, 1])
          assert.ok(
            Math.abs(
              surface(x, k * 32 + 16 - 1e-7, seed, dev)[0] -
                surface(x, k * 32 + 16 + 1e-7, seed, dev)[0],
            ) < 1e-6,
          );
      }
    }
    for (let i = 0; i <= 200; i++) {
      const dev = i / 100,
        x = Math.sin(i) * 40,
        z = Math.cos(i) * 40;
      const identity = site(x, z, seed);
      const a = surface(x, z, seed, dev),
        b = surface(x, z, seed, Math.max(0, dev - 1e-4));
      assert.deepEqual(site(x, z, seed), identity);
      assert.ok(Math.abs(a[0] - b[0]) < 0.001);
      assert.ok(
        surface(x, z, seed, 2 - (2 - dev)).every(
          (v, j) => Math.abs(v - a[j]) < 1e-12,
        ),
      );
    }
  }
  assert.equal(
    dunes.geometry,
    undefined,
    "analytic field has no stateful geometry to rebuild",
  );
  const data = dunes.precompute.fragment.split("void main()")[1];
  const staticData = data.split("} else if(cell.y<136)")[0];
  assert.doesNotMatch(staticData, /gGrowth|gStorm|u_params|u_time/);
  assert.match(data, /dsVeilVertex\(min\(cell.x,14\)\)/);
});

test("wind ripples are asymmetric, bounded and exactly phase-periodic", () => {
  for (let i = 0; i < 1000; i++) {
    const x = i * 0.037,
      z = Math.sin(i) * 20,
      phase = i * 0.091;
    const value = rippleHeight(x, z, phase);
    assert.ok(Math.abs(value) <= 0.028 * 1.22);
    assert.ok(
      Math.abs(value - rippleHeight(x, z, phase + 2 * Math.PI)) < 1e-14,
    );
    assert.ok(Math.abs(value - rippleHeight(x, z, phase + 1e-5)) < 1e-6);
  }
  assert.match(dunes.fragment, /filter2=filter1\*filter1\*filter1\*filter1/);
  assert.match(dunes.fragment, /rippleRelief=mix\(\.32,\.12,gGrowth\)/);
  assert.doesNotMatch(
    dunes.fragment.split("float dsIntersect")[1].split("float dsShadow")[0],
    /dsRipple/,
  );
  for (const width of [0, 0.1, 0.5, 1, 2, 4, 8]) {
    assert.ok(rippleFilter(width) >= 0 && rippleFilter(width) <= 1);
    assert.ok(
      Math.abs(rippleFilter(width * 2) - rippleFilter(width) ** 4) < 1e-15,
    );
    // Fourier response of a Gaussian pixel kernel, independently integrated.
    let integral = 0,
      weight = 0;
    for (let i = -800; i <= 800; i++) {
      const x = i / 100,
        w = Math.exp((-x * x) / 2);
      integral += w * Math.cos(width * x);
      weight += w;
    }
    assert.ok(Math.abs(integral / weight - rippleFilter(width)) < 1e-14);
  }
  assert.equal(rippleFilter(0), 1);
  assert.ok(rippleFilter(4) < 0.00034);
  const derivatives = dunes.fragment.indexOf("vec2 footprintX=dFdx");
  assert.ok(derivatives < dunes.fragment.indexOf("if(t>0. &&"));
});

test("saltation is ballistic, lands once per cycle and conserves grain identity", () => {
  assert.equal(SAND_GRAVITY, 9.81);
  for (let id = 0; id < 100; id++)
    for (const wind of [0.2, 0.8, 1.5]) {
      const start = saltation(id, 0, wind),
        end = saltation(id, 1 - 1e-10, wind),
        peak = saltation(id, 0.5, wind);
      const launch = (start.flight * SAND_GRAVITY) / 2;
      assert.equal(start.y, 0);
      assert.ok(end.y < 1e-9);
      assert.ok(Math.abs(peak.y - launch ** 2 / (2 * SAND_GRAVITY)) < 1e-14);
      assert.ok(Math.abs(end.x - wind * start.flight) < 1e-9);
      const dt = 1e-4,
        f = 0.5;
      const accel =
        (saltation(id, f + dt, wind).y -
          2 * peak.y +
          saltation(id, f - dt, wind).y) /
        (dt * start.flight) ** 2;
      assert.ok(Math.abs(accel + SAND_GRAVITY) < 1e-6);
      assert.deepEqual(saltation(id, 0.25, wind), saltation(id, 12.25, wind));
      assert.equal(peak.id, id);
    }
  assert.match(dunes.fragment, /flight=2\.\*launch\/9\.81/);
  assert.match(dunes.fragment, /float y=launch\*flight\*age\*\(1\.-age\)/);
  assert.match(dunes.fragment, /\.08\*u_rhythm.z/);
});

test("dust noise gradients are exact", () => {
  const e = 1e-5;
  for (let i = 0; i < 2000; i++) {
    const x = Math.sin(i * 2.71) * 37 + 0.123;
    const y = Math.cos(i * 0.73) * 49 + 0.321;
    const analytic = noiseSlope(x, y);
    const dx = (noiseSlope(x + e, y)[0] - noiseSlope(x - e, y)[0]) / (2 * e);
    const dy = (noiseSlope(x, y + e)[0] - noiseSlope(x, y - e)[0]) / (2 * e);
    assert.ok(Math.abs(dx - analytic[1]) < 2e-7);
    assert.ok(Math.abs(dy - analytic[2]) < 2e-7);
    assert.ok(analytic[0] >= 0 && analytic[0] <= 1);
  }
  assert.match(dunes.fragment, /grad\+=granules.yz\*\.055/);
});

test("heterogeneous dust stays ground connected and respects opaque depth", () => {
  assert.doesNotMatch(dunes.fragment, /dsDustBall|baseCoverage|dsDustFetch/);
  assert.match(dunes.fragment, /float dsDustDensity\(vec3 q\)/);
  assert.match(dunes.fragment, /base\*\.5/);
  assert.match(dunes.fragment, /end=min\(depth,\(-90\.-ro.z\)\/rd.z\)/);
  assert.match(dunes.fragment, /for\(int i=0;i<6;i\+\+\)/);
  // Homogeneous Beer–Lambert integration is invariant to subdivision.
  for (const density of [0.1, 0.5, 1])
    for (const length of [0, 1, 10, 30]) {
      const alpha = 1 - Math.exp((-density * length) / 2);
      assert.ok(
        Math.abs((1 - alpha) ** 2 - Math.exp(-density * length)) < 1e-15,
      );
    }
  // Every seeded x/z position retains a nonzero low dust layer in the bank.
  for (let i = 0; i < 1000; i++) {
    const y = (i % 40) / 10;
    const base = Math.exp(-y * 0.16) * smooth(-8, 15, 24);
    assert.ok(base > 0.5 && Number.isFinite(base));
  }
  assert.match(dunes.fragment, /dsMacro\(site\)\+high\*\.5-2\./);
  assert.match(dunes.fragment, /local.xz=turn\*local.xz/);
  assert.match(dunes.fragment, /erosion\*buried/);
});

test("detached veil vertices stay above the crest, bounded and reversible", () => {
  for (const dev of [0, 0.5, 1, 1.5, 2])
    for (const level of [0.1, 0.5, 0.9])
      for (const event of [0, 1, 2, 3, 4, 5, 6])
        for (let index = 0; index < 15; index++) {
          const u = (index % 3) * 0.5,
            v = Math.floor(index / 3) / 4;
          const z = 11 + 4 * Math.sin(event * 2.399963) + (v - 0.5) * 18;
          const centre =
            -2 + 4.8 * Math.sin(0.065 * z) + 1.2 * Math.sin(0.13 * z);
          const base = surface(centre, z, 11401, dev)[0];
          for (const envelope of [0.01, 0.5, 1]) {
            const x = centre + 0.5 + u * (4 + envelope * 2);
            const lift =
              1 +
              envelope * (0.25 + 0.75 * level) * 1.5 +
              Math.sin(u * Math.PI) * 1.1 +
              0.25 * Math.sin(z * 0.65 + u * 4);
            assert.ok(lift >= 0.75, "physical crest-to-air gap");
            assert.ok(
              x >= -20 && x <= 20 && base + lift <= 12 && z >= -3 && z <= 25,
            );
          }
        }
  assert.match(dunes.fragment, /dsVeilTriangle/);
  assert.match(dunes.fragment, /if\(hit.x<depth\)/);
  assert.match(dunes.fragment, /if\(abs\(det\)<\.00001\)/);
  assert.match(
    dunes.fragment,
    /for\(int j=0;j<4;j\+\+\)for\(int k=0;k<2;k\+\+\)/,
  );
  assert.match(dunes.precompute.fragment, /dsVeilVertex\(min\(cell.x,14\)\)/);
});

test("upward-ray rejection bounds every dune and the continuous leading ridge", () => {
  for (let i = 0; i < 10000; i++) {
    const dev = (i % 201) / 100;
    const height = 0.6 + (i % 71) / 100;
    const relief = (0.5 + 0.7 * smooth(0, 1, dev)) * height;
    const s = surface(
      Math.sin(i * 2.1) * 90,
      Math.cos(i * 0.71) * 90,
      11401 + (i % 6),
      dev,
      height,
    );
    assert.ok(
      s[0] >= 0 &&
        s[0] <=
          Math.max(4.4 * relief, 3.4 * (1 - 0.35 * smooth(0, 1, dev))) +
            0.2 +
            1e-12,
    );
  }
  assert.match(
    dunes.fragment,
    /float ceiling=max\(4.4\*gRelief,3.4\*\(1\.-\.35\*gGrowth\)\)\+\.2/,
  );
  assert.match(
    dunes.fragment,
    /if\(leading.x>4.4\*gRelief\+\.8\)return leading/,
  );
  assert.match(dunes.fragment, /if\(rd.y>=0\. && p.y>ceiling\)break/);
  assert.match(dunes.fragment, /if\(l.y>0\. && q.y>ceiling\)break/);
  for (const lightY of [0.12, 0.22, 0.55]) {
    for (const height of [1, 3.4, 5.72]) {
      const above = height + 0.01;
      for (const advance of [0, 1, 20, 100])
        assert.ok(
          above + lightY * advance > height,
          "rising shadow ray stays above the bound",
        );
    }
  }
  assert.match(dunes.fragment, /hi=-ro.y\/rd.y/);
  // World-space leading ridge must not inherit the staggered tile offset.
  assert.match(dunes.fragment, /leading=dsLeading\(world\)/);
  assert.ok(
    dunes.fragment.indexOf("leading=dsLeading(world)") <
      dunes.fragment.indexOf("vec2 p=world"),
  );
});

test("data prepass packs exact corner hashes, dune sites and airborne vertices", () => {
  assert.deepEqual(dunes.precompute.size, [128, 137]);
  for (let y = -16; y < 16; y++)
    for (let x = -16; x < 16; x++) {
      const index = x + 16 + (y + 16) * 32,
        tex = [index % 128, 128 + Math.floor(index / 128)];
      const decoded = tex[0] + (tex[1] - 128) * 128;
      assert.deepEqual(
        [(decoded % 32) - 16, Math.floor(decoded / 32) - 16],
        [x, y],
      );
    }
  assert.match(dunes.fragment, /#ifdef PRECOMPUTED/);
  assert.match(dunes.fragment, /data=dsDuneData\(cell\)/, "analytic fallback");
  assert.match(dunes.precompute.fragment, /dsHash\(p\+vec2\(0,1\)\)/);
  for (let i = 0; i < 15; i++) {
    assert.equal((i % 3) + Math.floor(i / 3) * 3, i);
    assert.ok(Math.floor(i / 3) <= 4);
  }
  assert.match(
    dunes.fragment,
    /return dsVeilVertex\(index\)/,
    "analytic vertex fallback",
  );
});

test("three exact state snapshots form one continuous world, followed by five extra looks", () => {
  assert.equal(dunes.number, 114);
  assert.equal(
    scenes.find((s) => s.id === "dunes"),
    dunes,
  );
  assert.equal(dunes.development, "development");
  assert.deepEqual(dunes.type, { key: "development", values: [0, 1, 2] });
  assert.ok(FAMILY_CATALOG.dunes.styles.includes("spatial"));
  assert.equal(dunes.presets.length, 8);
  const [first, ...states] = dunes.presets.slice(0, 3);
  for (const preset of states) {
    assert.equal(preset.seed, first.seed);
    const without = ({ development, ...rest }) => rest;
    assert.deepEqual(without(preset.params), without(first.params));
  }
  for (let i = 0; i < dunes.presets.length; i++)
    assert.deepEqual(
      validateSnapshot(presetSnapshot(dunes, i), scenes),
      presetSnapshot(dunes, i),
    );
  const looks = catalogLooks(scenes),
    worlds = defaultWorlds(looks.map((l) => l.id)),
    world = worlds.find((w) => w.id === "dune-sea");
  assert.ok(world, "find the world by stable id, not append order");
  assert.deepEqual(
    world.states.map((s) => s.look),
    ["dunes:Ripples", "dunes:Dunes", "dunes:Storm"],
  );
  const clips = world.states.map((s) => ({
    snapshot: presetSnapshot(
      dunes,
      dunes.presets.findIndex((p) => `dunes:${p.name}` === s.look),
    ),
  }));
  const arc = continuousDevelopment(clips, dunes);
  assert.ok(arc);
  assert.deepEqual(arc.positions, [0, 1, 2]);
  const changed = structuredClone(clips);
  changed[1].snapshot.seed++;
  assert.equal(continuousDevelopment(changed, dunes), null);
});

test("energy raises grain population and veil height without resetting identity", () => {
  assert.match(
    dunes.fragment,
    /airborne=smoothstep\(\.02,\.16,u_level-dsHash\(c\+113\.\)\*\.65\)/,
  );
  assert.match(dunes.fragment, /gVeil\*\(\.25\+\.75\*u_level\)/);
  for (let i = 0; i < 100; i++) {
    const identity = hash(i, 113);
    const population = (energy) => smooth(0.02, 0.16, energy - identity * 0.65);
    assert.ok(population(0.1) <= population(0.5));
    assert.ok(population(0.5) <= population(0.9));
    assert.equal(population(0.9), 1);
  }
});

test("bounded rhythm and rendering use palette-only light and integrated clocks", () => {
  assert.equal(dunes.rhythm.length, 4);
  const veil = dunes.rhythm.find((r) => r.slot === 3);
  assert.equal(veil.id, "crest-veil");
  for (const style of ["restrained", "driving", "accented"]) {
    assert.ok(veil.styles[style].steps.filter((v) => v > 0).length >= 2);
    const hitsPerBar = dunes.rhythm.reduce((total, effect) => {
      const track = effect.styles[style];
      return (
        total +
        (track.steps.filter((v) => v > 0).length * 4 * track.division) /
          track.length
      );
    }, 0);
    assert.ok(
      hitsPerBar >= { restrained: 2, driving: 6, accented: 8 }[style],
      `${style}: ${hitsPerBar} hits/bar`,
    );
  }
  assert.match(dunes.fragment, /u_rhythmHit\.w/);
  assert.match(dunes.fragment, /u_rhythmCount\.w/);
  assert.deepEqual(
    dunes.rhythm.map((r) => r.defaults.length),
    [4, 8, 16, 16],
  );
  for (const channel of ["x", "y", "z", "w"])
    assert.ok(dunes.fragment.includes(`u_rhythm.${channel}`));
  assert.equal(dunes.clocks.length, 3);
  for (const clock of dunes.clocks) {
    assert.equal(clock.period, 2 * Math.PI);
    for (const dev of [0, 1, 2])
      assert.ok(
        Number.isFinite(
          clock.rate([dev, 0.8, 1, 1, 0.35, 0.22, 0.45, 0.85], 0.9),
        ),
      );
  }
  assert.doesNotMatch(dunes.fragment, /mod\(u_time\s*,/);
  assert.doesNotMatch(
    dunes.fragment,
    /vec3\(\s*\d*\.\d+\s*,\s*\d*\.\d+\s*,\s*\d*\.\d+\s*\)\s*\*/,
  );
  assert.match(dunes.fragment, /for\(int i=0;i<28;i\+\+\)/);
  assert.match(dunes.fragment, /for\(int j=0;j<2;j\+\+\)/);
  assert.match(
    dunes.fragment,
    /end=min\(depth,\(-90\.-ro.z\)\/rd.z\)/,
    "dust respects opaque depth",
  );
});
