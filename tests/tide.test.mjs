import test from "node:test";
import assert from "node:assert/strict";
import tide, {
  GRAVITY,
  WAVE_HARMONICS,
  WAVE_AMPLITUDES,
  GERSTNER_Q,
} from "../scene-tide.mjs";
import scenes from "../scenes.mjs";
import { FAMILY_CATALOG } from "../family-catalog.mjs";
import { catalogLooks } from "../catalog.mjs";
import { defaultWorlds, continuousDevelopment } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { advanceClocks } from "../scene-time.mjs";

// Independent double-precision mirror of the GLSL equations, including the
// actual two-Newton-step inverse (not an idealized, converged substitute).
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fract = (x) => x - Math.floor(x);
function hash(x, y) {
  let p = [fract(x * 0.1031), fract(y * 0.1031), fract(x * 0.1031)];
  const d =
    p[0] * (p[1] + 33.33) + p[1] * (p[2] + 33.33) + p[2] * (p[0] + 33.33);
  p = p.map((v) => v + d);
  return fract((p[0] + p[1]) * p[2]);
}
function waves(seed, dev, height = 1, clock = 0) {
  return WAVE_HARMONICS.map((n, i) => {
    const omega = 0.35 * n,
      k = (omega * omega) / GRAVITY;
    const angle = -0.9 + 0.46 * i + 0.35 * (hash(i + 17, seed % 997) - 0.5);
    return {
      id: i,
      k,
      omega,
      direction: [Math.cos(angle), Math.sin(angle)],
      amplitude:
        WAVE_AMPLITUDES[i] *
        height *
        (0.48 + (2.35 - 0.48) * smooth(0, 1, dev)),
      phase:
        -((clock * n) % (2 * Math.PI)) + 2 * Math.PI * hash(i + 71, seed % 991),
    };
  });
}
function horizontal(q, w) {
  const p = [...q];
  let xx = 1,
    xz = 0,
    zz = 1;
  for (const v of w) {
    const [x, z] = v.direction,
      a = v.k * (x * q[0] + z * q[1]) + v.phase;
    p[0] += GERSTNER_Q * v.amplitude * x * Math.cos(a);
    p[1] += GERSTNER_Q * v.amplitude * z * Math.cos(a);
    const d = GERSTNER_Q * v.amplitude * v.k * Math.sin(a);
    xx -= d * x * x;
    xz -= d * x * z;
    zz -= d * z * z;
  }
  return { p, xx, xz, zz };
}
function material(x, w, iterations = 2) {
  const q = [...x];
  for (let j = 0; j < iterations; j++) {
    const { p, xx, xz, zz } = horizontal(q, w),
      det = xx * zz - xz * xz;
    const ex = p[0] - x[0],
      ez = p[1] - x[1];
    q[0] -= (zz * ex - xz * ez) / det;
    q[1] -= (xx * ez - xz * ex) / det;
  }
  return q;
}
function bowl(p, dev, flow = 0) {
  const r = Math.max(Math.hypot(...p), 0.001),
    a = Math.atan2(p[1], p[0]);
  const depression = -42 * Math.exp((-r * r) / 190),
    lip = 3.8 * Math.exp(-(((r - 23) / 7) ** 2));
  const m = 3 * a - 0.12 * r + flow,
    phase = 5 * a + 0.44 * r - 2 * flow + 0.28 * Math.sin(m);
  const inner = clamp(r / 4, 0, 1),
    window = inner * inner * (3 - 2 * inner);
  const gaussian = Math.exp(-(((r - 20) / 17) ** 2)),
    env = gaussian * window;
  const derivative =
    gaussian * (r < 4 ? 1.5 * inner * (1 - inner) : 0) -
    (env * 2 * (r - 20)) / 289;
  let dr = (-depression * 2 * r) / 190 - (lip * 2 * (r - 23)) / 49;
  dr +=
    0.8 *
    (env * (0.44 - 0.0336 * Math.cos(m)) * Math.cos(phase) +
      derivative * Math.sin(phase));
  const da = 0.8 * (5 + 0.84 * Math.cos(m)) * Math.cos(phase) * env;
  const v = smooth(1, 2, dev);
  return {
    h: v * (depression + lip + 0.8 * Math.sin(phase) * env),
    gradient: [
      v * ((dr * p[0]) / r - (da * p[1]) / (r * r)),
      v * ((dr * p[1]) / r + (da * p[0]) / (r * r)),
    ],
  };
}
function sea(x, w, dev, flow = 0) {
  const q = material(x, w),
    { xx, xz, zz } = horizontal(q, w),
    det = xx * zz - xz * xz;
  let h = 0,
    gx = 0,
    gz = 0;
  for (const v of w) {
    const a = v.k * (v.direction[0] * q[0] + v.direction[1] * q[1]) + v.phase;
    h += v.amplitude * Math.sin(a);
    gx += v.amplitude * v.k * v.direction[0] * Math.cos(a);
    gz += v.amplitude * v.k * v.direction[1] * Math.cos(a);
  }
  const b = bowl(x, dev, flow);
  return {
    h: h + b.h,
    gradient: [
      (zz * gx - xz * gz) / det + b.gradient[0],
      (xx * gz - xz * gx) / det + b.gradient[1],
    ],
  };
}

test("six exact directional identities obey deep-water dispersion and group velocity", () => {
  assert.equal(GRAVITY, 9.81);
  assert.deepEqual(WAVE_HARMONICS, [2, 3, 4, 5, 7, 10]);
  assert.match(tide.fragment, /float k = omega \* omega \/ 9\.81;/);
  assert.match(
    tide.fragment,
    /float amp=amplitude\*u_params\[2\]\*mix\(\.48,2\.35,swell\);/,
  );
  for (const v of waves(10301, 1)) {
    assert.ok(Math.abs(v.omega ** 2 - GRAVITY * v.k) < 1e-14);
    assert.ok(Math.abs(Math.hypot(...v.direction) - 1) < 1e-14);
    const dk = 1e-6;
    const numeric =
      (Math.sqrt(GRAVITY * (v.k + dk)) - Math.sqrt(GRAVITY * (v.k - dk))) /
      (2 * dk);
    assert.ok(Math.abs(numeric - v.omega / (2 * v.k)) < 1e-7);
  }
});

test("Gerstner steepness bound: no horizontal fold over the complete schema", () => {
  const max = waves(10301, 2, 1.3).reduce(
    (s, w) => s + GERSTNER_Q * w.k * w.amplitude,
    0,
  );
  assert.ok(max < 0.554 && max > 0.55, `maximum sum QkA = ${max}`);
  assert.match(
    tide.fragment,
    /displacement \+= \.65\*w.z\*gD\[i\]\*cos\(phase\);/,
  );
  for (const seed of [10301, 10302, 10303, 10304, 10305, 10306])
    for (const dev of [0, 0.5, 1, 1.5, 2]) {
      const w = waves(seed, dev, 1.3, 1.7);
      for (let i = 0; i < 120; i++) {
        const { xx, xz, zz } = horizontal([i * 1.71 - 60, Math.sin(i) * 41], w);
        const lambda = (xx + zz - Math.sqrt((xx - zz) ** 2 + 4 * xz * xz)) / 2;
        assert.ok(lambda >= 1 - max - 1e-12);
        assert.ok(xx * zz - xz * xz > 0);
      }
    }
});

test("two-step inverse and analytic normal agree with converged reference", () => {
  assert.match(tide.fragment, /iteration<2/);
  let residual = 0,
    heightError = 0,
    gradientError = 0;
  for (const seed of [10301, 10303, 10306])
    for (const dev of [0, 1, 2])
      for (let i = 0; i < 600; i++) {
        const x = [Math.sin(i * 2.71) * 90, Math.cos(i * 0.71) * 90],
          w = waves(seed, dev, 1.3, i * 0.017);
        const q = material(x, w),
          p = horizontal(q, w).p;
        residual = Math.max(residual, Math.hypot(p[0] - x[0], p[1] - x[1]));
        const exact = material(x, w, 12);
        const height = (q) =>
          w.reduce(
            (h, v) =>
              h +
              v.amplitude *
                Math.sin(
                  v.k * (v.direction[0] * q[0] + v.direction[1] * q[1]) +
                    v.phase,
                ),
            0,
          );
        heightError = Math.max(
          heightError,
          Math.abs(height(q) - height(exact)),
        );
        const eps = 1e-4,
          s = sea(x, w, dev, 0.8);
        for (let axis = 0; axis < 2; axis++) {
          const a = [...x],
            b = [...x];
          a[axis] -= eps;
          b[axis] += eps;
          const derivative =
            (sea(b, w, dev, 0.8).h - sea(a, w, dev, 0.8).h) / (2 * eps);
          gradientError = Math.max(
            gradientError,
            Math.abs(derivative - s.gradient[axis]),
          );
        }
      }
  assert.ok(residual < 0.025, `horizontal residual ${residual} m`);
  assert.ok(heightError < 0.012, `height error ${heightError} m`);
  assert.ok(gradientError < 0.025, `gradient error ${gradientError}`);
});

test("bowl normal, angular seam and center are continuous", () => {
  assert.match(tide.fragment, /depression=-42\.\*exp\(-r\*r\/190\.\)/);
  assert.match(tide.fragment, /dr=-depression\*2\.\*r\/190\./);
  assert.ok(bowl([0, 0], 2).h < -41.9, "the throat is 42 m deep");
  for (const r of [0.01, 0.5, 2, 3.99, 4, 4.01, 10, 20, 40, 100])
    for (const phase of [0, 0.9, 3.2, 6.28]) {
      const x = [r * Math.cos(phase), r * Math.sin(phase)],
        b = bowl(x, 2, phase),
        eps = 1e-5;
      for (let j = 0; j < 2; j++) {
        const a = [...x],
          c = [...x];
        a[j] -= eps;
        c[j] += eps;
        assert.ok(
          Math.abs(
            (bowl(c, 2, phase).h - bowl(a, 2, phase).h) / (2 * eps) -
              b.gradient[j],
          ) < 1e-5,
        );
      }
      assert.ok(
        Math.abs(bowl([-r, 1e-7], 2, phase).h - bowl([-r, -1e-7], 2, phase).h) <
          1e-5,
      );
    }
  assert.ok(Number.isFinite(bowl([0, 0], 2).h));
});

test("identity persists and development reverses without a phase or position reset", () => {
  let maxStep = 0;
  for (const dev of Array.from({ length: 201 }, (_, i) => i / 100)) {
    const a = waves(10301, dev),
      b = waves(10301, 2 - dev);
    for (let i = 0; i < a.length; i++) {
      for (const key of ["id", "k", "omega", "direction", "phase"])
        assert.deepEqual(a[i][key], b[i][key]);
    }
    for (const x of [
      [0, 0],
      [14, 2],
      [23, -10],
      [60, 80],
    ]) {
      const h = sea(x, a, dev).h,
        next = sea(x, waves(10301, dev + 0.0001), dev + 0.0001).h;
      maxStep = Math.max(maxStep, Math.abs(h - next));
      assert.ok(Number.isFinite(h));
    }
  }
  assert.ok(maxStep < 0.007, `development Lipschitz check ${maxStep}`);
  for (const edge of [0, 1, 2]) {
    const eps = 1e-5,
      x = [17, 8];
    const before = sea(x, waves(10301, edge - eps), edge - eps).h;
    const after = sea(x, waves(10301, edge + eps), edge + eps).h;
    assert.ok(Math.abs(after - before) < 1e-7, `C1 endpoint ${edge}`);
  }
});

function crestSlope(q, w) {
  return w.slice(0, 4).reduce((sum, v) => {
    const projected =
      v.k *
      (v.direction[0] * w[0].direction[0] + v.direction[1] * w[0].direction[1]);
    return (
      sum +
      v.amplitude *
        projected *
        Math.cos(
          v.k * (v.direction[0] * q[0] + v.direction[1] * q[1]) + v.phase,
        )
    );
  }, 0);
}

test("foam traces the low-pass material crest, not noise ridges or compression outlines", () => {
  assert.ok(
    !/tdLace|tdGradient|laceField|threads|streakPhase/.test(tide.fragment),
  );
  assert.match(tide.fragment, /crestFront=tdFoamFront\(p.xz\)/);
  assert.match(
    tide.fragment,
    /for\(int i=0;i<4;i\+\+\) \{\s*vec4 w=gW\[i\];\s*front\+=w.z\*dot\(w.xy,gD\[0\]\)\*cos/,
  );
  assert.match(tide.fragment, /crestSide=smoothstep\(\.0,\.13,surface.w\)/);
  assert.match(
    tide.fragment,
    /frontAA=max\(\.0015,1\.25\*fwidth\(crestFront\)\)/,
  );
  assert.ok(
    tide.fragment.indexOf("frontAA=max") <
      tide.fragment.lastIndexOf("if(t>0.)"),
  );
  // The displayed front is a zero directional derivative of the first four
  // physical waves; the two shortest modes remain in geometry, not foam.
  const eps = 1e-4;
  for (const seed of [10301, 10303, 10306])
    for (const clock of [0, 1.7, 6.28]) {
      const w = waves(seed, 1, 1.3, clock),
        d = w[0].direction;
      const height = (q) =>
        w
          .slice(0, 4)
          .reduce(
            (s, v) =>
              s +
              v.amplitude *
                Math.sin(
                  v.k * (v.direction[0] * q[0] + v.direction[1] * q[1]) +
                    v.phase,
                ),
            0,
          );
      for (let i = 0; i < 300; i++) {
        const q = material([60 * Math.sin(i), 60 * Math.cos(i * 0.71)], w);
        const a = q.map((v, j) => v - eps * d[j]),
          b = q.map((v, j) => v + eps * d[j]);
        assert.ok(
          Math.abs((height(b) - height(a)) / (2 * eps) - crestSlope(q, w)) <
            1e-8,
        );
      }
    }
});

test("Gaussian crest and arm coverage conserves line flux at 540p, 1080p and 4K", () => {
  assert.match(tide.fragment, /\(\.006\/frontWidth\)/);
  assert.match(tide.fragment, /\(\.025\/coreWidth\)/);
  assert.match(tide.fragment, /\(\.075\/trailWidth\)/);
  for (const height of [540, 1080, 2160])
    for (const intrinsic of [0.006, 0.025, 0.075]) {
      const width = intrinsic + (1.25 * 80) / height;
      let integral = 0;
      const steps = 4000,
        dx = (12 * width) / steps;
      for (let i = 0; i < steps; i++) {
        const x = -6 * width + (i + 0.5) * dx;
        const coverage = (Math.exp(-((x / width) ** 2)) * intrinsic) / width;
        assert.ok(coverage >= 0 && coverage <= 1);
        integral += coverage * dx;
      }
      assert.ok(Math.abs(integral - Math.sqrt(Math.PI) * intrinsic) < 1e-12);
    }
});

test("spiral bands have a crisp continuous front and broad one-sided rolling wakes", () => {
  assert.match(tide.fragment, /armAcross=cos\(armPhase\)/);
  assert.match(tide.fragment, /armAA=max\(\.006,1\.25\*fwidth\(armAcross\)\)/);
  assert.match(
    tide.fragment,
    /outer=mix\(1\.,smoothstep\(26\.,40\.,r\),gVortex\)/,
  );
  assert.match(tide.fragment, /wake=breaking\*exp/);
  assert.match(tide.fragment, /halo=breaking\*exp/);
  for (let r = 3; r < 50; r += 0.2)
    for (const flow of [0, 0.9, 3.2, 2 * Math.PI]) {
      const roll =
        0.075 * Math.sin(0.67 * r + 2 * flow) +
        0.025 * Math.sin(1.4 * r - 3 * flow);
      assert.ok(Math.abs(roll) <= 0.1);
      assert.ok(
        -0.29 - roll < -0.18 && -0.57 - 0.7 * roll < -0.49,
        "wake centres stay behind the leading edge",
      );
      const arm = (a, f) =>
        5 * a + 0.44 * r - 2 * f + 0.28 * Math.sin(3 * a - 0.12 * r + f);
      assert.ok(
        Math.abs(Math.cos(arm(-Math.PI, flow)) - Math.cos(arm(Math.PI, flow))) <
          1e-12,
      );
      assert.ok(
        Math.abs(
          Math.cos(arm(0.4, flow)) - Math.cos(arm(0.4, flow + 2 * Math.PI)),
        ) < 1e-12,
      );
    }
});

test("living light is HDR, locally kick-modulated; droplets conserve subpixel flux", () => {
  assert.match(
    tide.fragment,
    /ignition=\.46\+\.72\*spark\*spark\+\.45\*u_kick\*pow\(spark,4\.\)/,
  );
  assert.match(tide.fragment, /col\+=bio\*living\*bioDepth\*1\.75/);
  assert.match(tide.fragment, /\.0012\/variance/);
  assert.match(tide.fragment, /mistT<t/);
  assert.ok(
    tide.fragment.indexOf("armAA=max") < tide.fragment.lastIndexOf("if(t>0.)"),
  );
  const crest = 0.6,
    glow = 0.85,
    spark = 1;
  const base = crest * 4.8 * glow * (0.46 + 0.72 * spark ** 2) * 1.75;
  const kick = crest * 4.8 * glow * (0.46 + 0.72 + 0.45) * 1.75;
  assert.ok(
    base > 2 && kick / base < 1.4,
    "living cores exceed 1 without a global flash",
  );
  for (const fp of [0, 0.02, 0.1, 0.2, 0.4]) {
    const variance = 0.0012 + Math.min(0.012, fp * fp * 0.7);
    // Integral of the Gaussian over R² = pi * variance.
    assert.ok(
      Math.abs(Math.PI * variance * (0.0012 / variance) - Math.PI * 0.0012) <
        1e-15,
    );
    const atCellBorder =
      Math.exp(-(0.25 ** 2) / variance) * (0.0012 / variance);
    assert.ok(atCellBorder < 0.001, "no visible square candidate boundary");
  }
});

function cachedData(p, exactAt) {
  if (Math.hypot(...p) <= 6 || Math.max(...p.map(Math.abs)) >= 127.5)
    return exactAt(p);
  const grid = p.map((v) => (v / 256 + 0.5) * 511);
  const cell = grid.map(Math.floor),
    f = grid.map((v, i) => v - cell[i]);
  const at = (x, y) => exactAt([(x / 511 - 0.5) * 256, (y / 511 - 0.5) * 256]);
  const corners = [
    at(cell[0], cell[1]),
    at(cell[0] + 1, cell[1]),
    at(cell[0], cell[1] + 1),
    at(cell[0] + 1, cell[1] + 1),
  ];
  const data = [0, 1, 2].map(
    (k) =>
      (corners[0][k] * (1 - f[0]) + corners[1][k] * f[0]) * (1 - f[1]) +
      (corners[2][k] * (1 - f[0]) + corners[3][k] * f[0]) * f[1],
  );
  const blend =
    smooth(36, 64, p[0] ** 2 + p[1] ** 2) *
    (1 - smooth(126, 127.5, Math.max(...p.map(Math.abs))));
  if (blend < 1) {
    const exact = exactAt(p);
    return data.map((v, k) => exact[k] + (v - exact[k]) * blend);
  }
  return data;
}

test("world-space bowl data cache preserves height and normal without caching colour", () => {
  assert.deepEqual(tide.precompute.size, [1024, 513]);
  assert.match(tide.precompute.fragment, /tdExactWaves\(p\)\+vec4\(bowl,0\.\)/);
  assert.match(
    tide.fragment,
    /return tdExactWaves\(p\)\+vec4\(tdBowlExact\(p\),0\.\)/,
  );
  assert.match(tide.fragment, /nearRadius=max\(0\.,length\(nearAxis\)-\.72\)/);
  let heightError = 0,
    normalError = 0;
  for (const flow of [0, 0.9, 2.1, 4.7, 6.28])
    for (let i = 0; i < 6000; i++) {
      const p = [63.4 * Math.sin(i * 1.71), 63.4 * Math.cos(i * 0.37)];
      const b = bowl(p, 2, flow),
        c = cachedData(p, (p) => {
          const b = bowl(p, 2, flow);
          return [b.h, ...b.gradient];
        });
      heightError = Math.max(heightError, Math.abs(b.h - c[0]));
      const a = [-b.gradient[0], 1, -b.gradient[1]],
        d = [-c[1], 1, -c[2]];
      const al = Math.hypot(...a),
        dl = Math.hypot(...d);
      normalError = Math.max(
        normalError,
        Math.hypot(...a.map((v, k) => v / al - d[k] / dl)),
      );
    }
  assert.ok(heightError < 0.03, `cached bowl height error ${heightError} m`);
  assert.ok(
    normalError < 0.025,
    `cached bowl unit-normal error ${normalError}`,
  );
});

test("signed crest-data bank preserves the analytic front without caching colour", (t) => {
  assert.match(tide.precompute.fragment, /cell.x>=512/);
  assert.match(
    tide.precompute.fragment,
    /vec4\(u_params\[0\]>0\.\?tdExactCrest\(p\):0\.,0\.,0\.,0\.\)/,
  );
  assert.match(tide.fragment, /ivec2\(512,1\)/);
  let error = 0;
  for (const seed of [10301, 10303, 10306])
    for (const dev of [0, 0.5, 1, 1.5, 2]) {
      const w = waves(seed, dev, 1.3, 1.7);
      const exactAt = (p) => [crestSlope(material(p, w), w), 0, 0];
      for (let i = 0; i < 1800; i++) {
        const p = [127.6 * Math.sin(i * 1.71), 127.6 * Math.cos(i * 0.37)];
        error = Math.max(
          error,
          Math.abs(exactAt(p)[0] - cachedData(p, exactAt)[0]),
        );
      }
    }
  t.diagnostic(`signed crest slope cache error ${error}`);
  assert.ok(error < 0.003, `crest-data error ${error}`);
});

test("combined surface cache bounds wave height/normal error over the whole schema", (t) => {
  let heightError = 0,
    normalError = 0;
  for (const seed of [10301, 10303, 10306])
    for (const dev of [0, 0.5, 1, 1.5, 2]) {
      const w = waves(seed, dev, 1.3, 1.7);
      const exactAt = (p) => {
        const s = sea(p, w, dev, 0.9);
        return [s.h, ...s.gradient];
      };
      for (let i = 0; i < 1800; i++) {
        const p = [127.6 * Math.sin(i * 1.71), 127.6 * Math.cos(i * 0.37)];
        const exact = exactAt(p),
          cached = cachedData(p, exactAt);
        heightError = Math.max(heightError, Math.abs(exact[0] - cached[0]));
        const a = [-exact[1], 1, -exact[2]],
          b = [-cached[1], 1, -cached[2]];
        const al = Math.hypot(...a),
          bl = Math.hypot(...b);
        normalError = Math.max(
          normalError,
          Math.hypot(...a.map((v, k) => v / al - b[k] / bl)),
        );
      }
    }
  t.diagnostic(
    `combined height error ${heightError} m; unit-normal error ${normalError}`,
  );
  assert.ok(heightError < 0.06, `combined height error ${heightError} m`);
  assert.ok(normalError < 0.06, `combined normal error ${normalError}`);
  assert.match(tide.fragment, /layer<3/);
  assert.ok(
    !tide.fragment.includes("float aeration="),
    "no filled thresholded noise lobes",
  );
  assert.match(tide.fragment, /develop=smoothstep\(\.08,\.85,gSwell\)/);
  assert.match(tide.fragment, /crestMask\*gSwell\+spiral/);
});

test("ray-specific slabs bound the exact ocean, including the deep throat", () => {
  assert.match(tide.fragment, /lower=-gWaveHeight-gVortex\*\(\.8\+42\.\*exp/);
  assert.match(tide.fragment, /if\(previous==1\) fhi\*=\.5/);
  assert.match(tide.fragment, /if\(previous==-1\) flo\*=\.5/);
  let worstResidual = 0;
  for (const dev of [0, 0.5, 1, 1.5, 2])
    for (const seed of [10301, 10303]) {
      const w = waves(seed, dev, 1.3, 1.8),
        v = smooth(1, 2, dev);
      const height = w.reduce((s, a) => s + a.amplitude, 0);
      const ro = [0, 9 + 33 * v, 47];
      for (const dx of [-0.7, -0.3, 0, 0.3, 0.7])
        for (const dy of [-1, -0.7, -0.4]) {
          const length = Math.hypot(dx, dy, -1),
            rd = [dx / length, dy / length, -1 / length];
          const closest = Math.max(
            0,
            -(ro[0] * rd[0] + ro[2] * rd[2]) / (rd[0] ** 2 + rd[2] ** 2),
          );
          const radius2 =
            (ro[0] + rd[0] * closest) ** 2 + (ro[2] + rd[2] * closest) ** 2;
          const nearRadius = Math.max(0, Math.sqrt(radius2) - 0.72);
          const lower =
            -height - v * (0.8 + 42 * Math.exp(-(nearRadius ** 2) / 190));
          const upper = height + 4.6 * v;
          let lo = Math.max(0, (upper - ro[1]) / rd[1]),
            hi = Math.min(700, (lower - ro[1]) / rd[1]);
          const sample = (t) =>
            sea([ro[0] + rd[0] * t, ro[2] + rd[2] * t], w, dev, 0.8).h;
          for (let i = 0; i <= 40; i++) {
            const h = sample(lo + ((hi - lo) * i) / 40);
            assert.ok(h >= lower - 1e-10 && h <= upper + 1e-10);
          }
          const f = (t) => ro[1] + rd[1] * t - sample(t);
          let flo = f(lo),
            fhi = f(hi),
            previous = 0,
            t = lo;
          assert.ok(flo >= 0 && fhi <= 0);
          for (let i = 0; i < 15; i++) {
            t = lo + (hi - lo) * clamp(flo / (flo - fhi), 0.08, 0.92);
            const value = f(t);
            if (Math.abs(value) < 0.008 + (2 / 1080) * t * 0.2) break;
            if (value > 0) {
              lo = t;
              flo = value;
              if (previous === 1) fhi *= 0.5;
              previous = 1;
            } else {
              hi = t;
              fhi = value;
              if (previous === -1) flo *= 0.5;
              previous = -1;
            }
          }
          worstResidual = Math.max(worstResidual, Math.abs(f(t)));
        }
    }
  assert.ok(
    worstResidual < 0.15,
    `15-step intersection residual ${worstResidual} m`,
  );
});

test("camera remains above the sea; kick bounded; energy never changes development", () => {
  for (let dev = 0; dev <= 2; dev += 0.01) {
    const vortex = smooth(1, 2, dev),
      low = 4.8 + 1.6 * smooth(0, 1, dev),
      eye = low + (33 - low) * vortex;
    const upper =
      waves(10301, dev, 1.3).reduce((s, w) => s + w.amplitude, 0) +
      4.6 * vortex;
    assert.ok(eye > upper, `${dev}: eye ${eye} above upper envelope ${upper}`);
  }
  assert.match(
    tide.fragment,
    /mix\(5\.\*sin\(orbit\),radius\*sin\(orbit\),gVortex\)/,
  );
  assert.match(tide.fragment, /mix\(radius,radius\*cos\(orbit\),gVortex\)/);
  const camera = (dev, phase) => {
    const v = smooth(1, 2, dev),
      s = smooth(0, 1, dev);
    const radius =
      (54 + 3 * Math.cos(phase)) * (1 - v) + (45 + 2 * Math.cos(2 * phase)) * v;
    return [
      5 * Math.sin(phase) * (1 - v) + radius * Math.sin(phase) * v,
      (4.8 + 1.6 * s) * (1 - v) + (35 + 2 * Math.sin(phase)) * v,
      radius * (1 - v) + radius * Math.cos(phase) * v,
    ];
  };
  for (const dev of [0, 0.5, 1, 1.25, 1.5, 1.75, 2]) {
    const a = camera(dev, -1e-7),
      b = camera(dev, 2 * Math.PI - 1e-7);
    assert.ok(
      Math.hypot(...a.map((v, i) => v - b[i])) < 1e-10,
      "camera wraps at intermediate development too",
    );
  }
  for (let phase = 0; phase < 2 * Math.PI; phase += 0.1) {
    const p = camera(2, phase),
      radius = Math.hypot(p[0], p[2]);
    assert.ok(
      radius >= 43 - 1e-10 && radius <= 47 + 1e-10,
      "closer full peak orbit",
    );
  }
  assert.match(tide.fragment, /1\.\+\.022\*u_kick/);
  assert.ok(!tide.energy.development);
  assert.ok(tide.energy.speed.mul[1] / tide.energy.speed.mul[0] < 2);
  assert.deepEqual(
    tide.rhythm.map((r) => r.defaults.length),
    [4, 8, 16],
  );
});

test("periodic clocks remain finite at 3600 s and twelve hours, also after a rate change", () => {
  for (const source of [tide.fragment, tide.precompute.fragment])
    assert.match(source, /#ifdef PHOSPHOR_LATE\nuniform float u_clock\[4\];/);
  for (const time of [3599.99, 3600, 43200]) {
    const state = {},
      p = tide.schema.map((f) => f.default);
    const a = Array.from(advanceClocks(state, tide.clocks, time, p, 0.1));
    const b = Array.from(
      advanceClocks(state, tide.clocks, time + 1 / 60, p, 0.9),
    );
    for (let i = 0; i < 3; i++) {
      assert.ok(a[i] >= 0 && a[i] < 2 * Math.PI && Number.isFinite(b[i]));
      const delta = (b[i] - a[i] + 2 * Math.PI) % (2 * Math.PI);
      assert.ok(delta < 0.02, `${i} at ${time}: ${delta}`);
    }
  }
});

test("presets validate and register a continuous eight-look spatial world", () => {
  assert.equal(tide.number, 103);
  assert.deepEqual(tide.type, { key: "development", values: [0, 1, 2] });
  assert.equal(tide.presets.length, 8);
  for (const p of tide.presets)
    for (const f of tide.schema)
      assert.ok(
        Number.isFinite(p.params[f.key]) &&
          p.params[f.key] >= f.min &&
          p.params[f.key] <= f.max,
        `${p.name}.${f.key}`,
      );
  const world = defaultWorlds(catalogLooks(scenes).map((l) => l.id)).find(
    (w) => w.id === "moon-tide",
  );
  assert.ok(world);
  const clips = world.states.map((s) => ({
    snapshot: presetSnapshot(
      tide,
      tide.presets.findIndex((p) => `tide:${p.name}` === s.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, tide)?.positions, [0, 1, 2]);
  assert.ok(FAMILY_CATALOG.tide.styles.includes("spatial"));
  assert.equal(new Set(tide.presets.map((p) => p.seed)).size, 6);
});

test("Calm has no foam or spray at every energy; filtered crest coverage is bounded", () => {
  for (const dev of [0, 0.1, 0.3, 0.5, 1, 2]) {
    const swell = smooth(0, 1, dev),
      develop = smooth(0.08, 0.85, swell);
    assert.ok(develop >= 0 && develop <= 1);
    if (dev === 0) assert.equal(develop, 0);
  }
  for (const fp of [0.001, 0.01, 0.1, 0.5, 1, 10]) {
    const width = 0.006 + Math.max(0.0015, 1.25 * fp);
    const coverage = (Math.exp(-((0.06 / width) ** 2)) * 0.006) / width;
    assert.ok(Number.isFinite(coverage) && coverage >= 0 && coverage <= 1);
  }
  assert.match(
    tide.fragment,
    /breaking=\(\.12\+\.88\*crestMask\)\*crestSide\*develop\*outer/,
  );
  assert.match(tide.fragment, /crestMask\*gSwell\+spiral/);
  assert.match(tide.fragment, /vec2\(\.42,1\.50\)/);
});
