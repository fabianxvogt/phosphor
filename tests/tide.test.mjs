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
const SPREAD = [0, -0.32, 0.38, -0.55, 0.8, -1.05];
const TWIST = -3.5;
// The maelstrom's coordinate twist y = R(phi(r)) x, phi = TWIST v e^{-r²/900}.
function twistAngle(x, dev) {
  return TWIST * smooth(1, 1.6, dev) * Math.exp(-(x[0] ** 2 + x[1] ** 2) / 900);
}
function twist(x, dev) {
  const a = twistAngle(x, dev),
    c = Math.cos(a),
    s = Math.sin(a);
  return [c * x[0] - s * x[1], s * x[0] + c * x[1]];
}
function pullback(x, g, dev) {
  const a = twistAngle(x, dev),
    c = Math.cos(a),
    s = Math.sin(a);
  const turned = [-c * x[1] - s * x[0], -s * x[1] + c * x[0]];
  const d = turned[0] * g[0] + turned[1] * g[1];
  return [
    c * g[0] + s * g[1] - ((a * 2) / 900) * x[0] * d,
    -s * g[0] + c * g[1] - ((a * 2) / 900) * x[1] * d,
  ];
}
function waves(seed, dev, height = 1, clock = 0) {
  return WAVE_HARMONICS.map((n, i) => {
    const omega = 0.35 * n,
      k = (omega * omega) / GRAVITY;
    const angle =
      1.0208 + SPREAD[i] + 0.3 * (hash(i + 17, seed % 997) - 0.5);
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
  const v = smooth(1.2, 2, dev);
  return {
    h: v * (depression + lip + 0.8 * Math.sin(phase) * env),
    gradient: [
      v * ((dr * p[0]) / r - (da * p[1]) / (r * r)),
      v * ((dr * p[1]) / r + (da * p[0]) / (r * r)),
    ],
  };
}
function sea(x, w, dev, flow = 0) {
  const q = material(twist(x, dev), w),
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
  const b = bowl(x, dev, flow),
    g = pullback(
      x,
      [(zz * gx - xz * gz) / det, (xx * gz - xz * gx) / det],
      dev,
    );
  return {
    h: h + b.h,
    gradient: [g[0] + b.gradient[0], g[1] + b.gradient[1]],
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
  // The twist winds over development 1.0-1.6: 1e-4 of development moves
  // the surface by < 1 cm anywhere.
  assert.ok(maxStep < 0.01, `development Lipschitz check ${maxStep}`);
  for (const edge of [0, 1, 2]) {
    const eps = 1e-5,
      x = [17, 8];
    const before = sea(x, waves(10301, edge - eps), edge - eps).h;
    const after = sea(x, waves(10301, edge + eps), edge + eps).h;
    assert.ok(Math.abs(after - before) < 1e-7, `C1 endpoint ${edge}`);
  }
});

// Analytic signal of the wind sea, modes 1-4 with steepness weights
// c_i = A_i (n_i/5)^2: z = sum c_i (sin phase_i, cos phase_i).
const FOAM_WEIGHTS = [0, 0.36, 0.64, 1, 1.96];
function foamSignal(q, w) {
  let im = 0,
    re = 0;
  for (let i = 1; i < 5; i++) {
    const v = w[i],
      a = v.k * (v.direction[0] * q[0] + v.direction[1] * q[1]) + v.phase;
    im += v.amplitude * FOAM_WEIGHTS[i] * Math.sin(a);
    re += v.amplitude * FOAM_WEIGHTS[i] * Math.cos(a);
  }
  return [im, re];
}
// The shader's foam model, mirrored: closed-form persistence F(age), the
// envelope gate and the one-sided front.
function foamAt(signal, level, scale = 1) {
  const envelope = Math.hypot(...signal),
    threshold = 1.45 + (0.65 - 1.45) * level,
    breaking = smooth(threshold, threshold + 0.5, envelope / 0.6242);
  const age =
    (((Math.PI / 2 - Math.atan2(signal[0], signal[1])) % (2 * Math.PI)) +
      2 * Math.PI) %
    (2 * Math.PI);
  const kappa = 0.6 + (2.4 - 0.6) * level,
    floor = Math.exp((-2 * Math.PI) / kappa);
  const fill =
    ((Math.exp(-age / kappa) - floor) / (1 - floor)) * smooth(0, 0.1, age);
  const behind =
    ((((age - 0.1 + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
    Math.PI;
  const width = behind < 0 ? 0.035 : 0.14;
  return {
    breaking,
    fill,
    front: Math.exp(-((behind / width) ** 2)) * breaking,
    foam: breaking * fill,
    scale,
  };
}

test("foam follows the wind sea's analytic signal, not noise ridges", () => {
  assert.ok(!/tdLace|tdGradient|laceField|threads|tdFoamCells/.test(tide.fragment));
  assert.match(tide.fragment, /foamData=tdFoamData\(p.xz\)/);
  assert.match(
    tide.fragment,
    /for\(int i=1;i<5;i\+\+\) \{\s*vec4 w=gW\[i\]; float phase=dot\(w.xy,q\)\+w.w;\s*float c=w.z\*\(i==1\?\.36:i==2\?\.64:i==3\?1\.:1\.96\);/,
  );
  assert.match(tide.fragment, /age=mod\(1\.5707963-atan\(foamData.x,foamData.y\),TAU\)/);
  // For a single mode the analytic signal's argument IS the wave phase, and
  // age 0 is exactly its crest (maximum height).
  const w = waves(10301, 1, 1, 0.4);
  for (const i of [1, 2, 3, 4]) {
    const only = w.map((v, j) => (j === i ? v : { ...v, amplitude: 0 }));
    for (let s = 0; s < 50; s++) {
      const q = [s * 3.1 - 70, s * 1.7 - 40],
        v = w[i],
        a = v.k * (v.direction[0] * q[0] + v.direction[1] * q[1]) + v.phase;
      const signal = foamSignal(q, only);
      const phase = Math.atan2(signal[0], signal[1]);
      assert.ok(Math.abs(Math.sin(phase - a)) < 1e-9);
      assert.ok(
        Math.abs(Math.hypot(...signal) - v.amplitude * FOAM_WEIGHTS[i]) < 1e-12,
      );
    }
  }
  // Steepness weights are monotone toward the short wind sea.
  for (let i = 2; i < 5; i++) assert.ok(FOAM_WEIGHTS[i] > FOAM_WEIGHTS[i - 1]);
  const unit = waves(10301, 0, 1).map((v) => v.amplitude / 0.48);
  const sum = [1, 2, 3, 4].reduce((s, i) => s + unit[i] * FOAM_WEIGHTS[i], 0);
  assert.ok(Math.abs(sum - 0.6242) < 1e-4, `normalizer ${sum}`);
  assert.match(tide.fragment, /envelope\/\.6242/);
});

test("foam persistence is the closed-form decaying sum of past crest passages", () => {
  assert.match(
    tide.fragment,
    /fill=\(exp\(-age\/kappa\)-floorDecay\)\/\(1\.-floorDecay\)/,
  );
  for (const kappa of [0.6, 1.2, 2.4])
    for (let age = 0.001; age < 2 * Math.PI; age += 0.05) {
      // Sum of pulses from every earlier crest, each decaying since passing.
      let sum = 0;
      for (let m = 0; m < 400; m++) sum += Math.exp(-(age + 2 * Math.PI * m) / kappa);
      const closed = Math.exp(-age / kappa) / (1 - Math.exp((-2 * Math.PI) / kappa));
      assert.ok(Math.abs(sum - closed) < 1e-9);
      // The shader subtracts the floor left just before the next crest and
      // normalizes: 1 at the crest, 0 just before the next one.
      const floor = Math.exp((-2 * Math.PI) / kappa) / (1 - Math.exp((-2 * Math.PI) / kappa));
      const fill = (Math.exp(-age / kappa) - Math.exp((-2 * Math.PI) / kappa)) /
        (1 - Math.exp((-2 * Math.PI) / kappa));
      assert.ok(Math.abs(fill - (closed - floor) / (1 / (1 - Math.exp((-2 * Math.PI) / kappa)) - floor)) < 1e-9);
    }
});

test("gated foam is continuous through phase dislocations and the crest wrap", () => {
  // A discontinuity keeps its jump under refinement; a steep but continuous
  // front does not. Every 3 cm step that changes by more than 0.05 is
  // re-sampled at 0.3 mm.
  let worstRefined = 0,
    dislocations = 0,
    steep = 0;
  const value = (q, w, level) => {
    const f = foamAt(foamSignal(q, w), level);
    return f.foam + f.front;
  };
  for (const seed of [10301, 10303, 10306])
    for (const level of [0.1, 0.5, 0.9]) {
      const w = waves(seed, 1, 1.3, 2.3);
      for (let line = 0; line < 12; line++) {
        const start = [-90 + line * 13, -80 + line * 7],
          dir = [Math.cos(line * 0.7), Math.sin(line * 0.7)];
        const at = (u) => [start[0] + dir[0] * u, start[1] + dir[1] * u];
        let previous = value(at(0), w, level),
          previousEnvelope = Infinity;
        for (let s = 1; s < 6000; s++) {
          const u = s * 0.03,
            current = value(at(u), w, level);
          const envelope = Math.hypot(...foamSignal(at(u), w));
          if (envelope < 0.02 && previousEnvelope >= 0.02) dislocations++;
          previousEnvelope = envelope;
          if (Math.abs(current - previous) > 0.05) {
            steep++;
            let last = previous;
            for (let j = 1; j <= 100; j++) {
              const v = value(at(u - 0.03 + j * 0.0003), w, level);
              worstRefined = Math.max(worstRefined, Math.abs(v - last));
              last = v;
            }
          }
          previous = current;
        }
      }
    }
  assert.ok(dislocations > 0, "the sample crosses near-dislocations");
  assert.ok(steep > 0, "the sample crosses breaking fronts");
  assert.ok(worstRefined < 0.03, `largest refined step ${worstRefined}`);
  // Calm can never break: the full-schema Calm envelope stays below the
  // lowest threshold, so the gate is exactly zero.
  assert.ok(1.3 * 0.48 < 0.65);
  assert.match(tide.fragment, /threshold=mix\(1\.45,\.65,u_level\)/);
});

test("the vortex twist is a radius-preserving bijection with an exact pullback", () => {
  assert.match(tide.fragment, /float a=gTwist\*exp\(-dot\(x,x\)\/900\.\)/);
  assert.match(tide.fragment, /gTwist=-3\.5\*smoothstep\(1\.,1\.6,u_params\[0\]\)/);
  assert.match(tide.fragment, /gVortex=smoothstep\(1\.2,2\.,u_params\[0\]\)/);
  const field = (y) => Math.sin(0.21 * y[0] - 0.13 * y[1]) + 0.4 * Math.cos(0.33 * y[1]);
  const gradientAt = (y) => [
    0.21 * Math.cos(0.21 * y[0] - 0.13 * y[1]),
    -0.13 * Math.cos(0.21 * y[0] - 0.13 * y[1]) - 0.4 * 0.33 * Math.sin(0.33 * y[1]),
  ];
  for (const dev of [1, 1.3, 1.7, 2])
    for (let i = 0; i < 400; i++) {
      const x = [Math.sin(i * 1.3) * 60, Math.cos(i * 0.77) * 60],
        y = twist(x, dev);
      assert.ok(Math.abs(Math.hypot(...x) - Math.hypot(...y)) < 1e-9);
      // Inverse: rotate back by the same angle (radius is unchanged).
      const a = -twistAngle(x, dev),
        back = [Math.cos(a) * y[0] - Math.sin(a) * y[1], Math.sin(a) * y[0] + Math.cos(a) * y[1]];
      assert.ok(Math.hypot(back[0] - x[0], back[1] - x[1]) < 1e-9);
      const g = pullback(x, gradientAt(y), dev),
        eps = 1e-5;
      for (let axis = 0; axis < 2; axis++) {
        const p = [...x],
          m = [...x];
        p[axis] += eps;
        m[axis] -= eps;
        const fd = (field(twist(p, dev)) - field(twist(m, dev))) / (2 * eps);
        assert.ok(Math.abs(fd - g[axis]) < 1e-6);
      }
    }
  // No twist below the vortex: the open ocean is untouched in Calm/Swell.
  for (const dev of [0, 0.5, 1]) assert.ok(twistAngle([3, 4], dev) === 0);
});

test("line coverage conserves flux at 540p, 1080p and 4K; spiral seams are exact", () => {
  assert.match(tide.fragment, /\(\.025\/coreWidth\)/);
  assert.match(tide.fragment, /\(\.09\/\(\.09\+phaseAA\)\)/);
  assert.match(tide.fragment, /armAcross=cos\(armPhase\)/);
  assert.match(tide.fragment, /armAA=max\(\.006,1\.25\*fwidth\(armAcross\)\)/);
  assert.ok(
    tide.fragment.indexOf("armAA=max") < tide.fragment.lastIndexOf("if(t>0.)"),
  );
  assert.ok(
    tide.fragment.indexOf("phaseAA=min") < tide.fragment.lastIndexOf("if(t>0.)"),
  );
  for (const height of [540, 1080, 2160]) {
    const width = 0.025 + (1.25 * 80) / height;
    let integral = 0;
    const steps = 4000,
      dx = (12 * width) / steps;
    for (let i = 0; i < steps; i++) {
      const x = -6 * width + (i + 0.5) * dx;
      const coverage = (Math.exp(-((x / width) ** 2)) * 0.025) / width;
      assert.ok(coverage >= 0 && coverage <= 1);
      integral += coverage * dx;
    }
    assert.ok(Math.abs(integral - Math.sqrt(Math.PI) * 0.025) < 1e-12);
  }
  for (let r = 3; r < 50; r += 0.2)
    for (const flow of [0, 0.9, 3.2, 2 * Math.PI]) {
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

test("biolight is HDR and locally kick-modulated; points conserve subpixel flux", () => {
  assert.match(tide.fragment, /frontLight=front\*knots\*tumble\*\(1\.\+1\.6\*packet\*u_rhythm.x\)\*\(1\.\+\.3\*u_kick\*hot\)/);
  assert.match(tide.fragment, /col\+=u_primary\*living\*glow\*1\.3/);
  // Knots travel along the lip with whole wave-clock turns: periodic.
  assert.match(tide.fragment, /1\.5\*vec2\(cos\(gWavePhase\),sin\(gWavePhase\)\)/);
  assert.match(tide.fragment, /mistT<t/);
  // Gesture x travels at the true group velocity of mode 3:
  // envelope wavenumber K per unit clock Omega=1 gives c = 1/K = n/(2k).
  assert.match(tide.fragment, /cos\(2\.\*gK\[3\]\/5\.\*dot\(gD\[3\],q\)-gWavePhase\)/);
  const w = waves(10301, 1)[3];
  assert.ok(Math.abs(1 / ((2 * w.k) / 5) - 5 / (2 * w.k)) < 1e-12);
  // Kick lifts a hot front by at most 30 %, never the whole frame.
  const base = 2.6 * 1 * 0.85 * 1.3,
    kicked = base * 1.3;
  assert.ok(base > 1 && kicked / base <= 1.3 + 1e-12);
  for (const size of [0.0012, 0.004])
    for (const fp of [0, 0.02, 0.1, 0.2, 0.4]) {
      const variance = size + Math.min(0.0085 - size, fp * fp * 0.7);
      assert.ok(
        Math.abs(Math.PI * variance * (size / variance) - Math.PI * size) < 1e-15,
      );
      const atCellBorder =
        Math.exp(-(0.25 ** 2) / variance) *
        (size / variance) *
        (1 - smooth(0.15, 0.45, fp));
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
  const data = corners[0].map(
    (_, k) =>
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
  assert.match(
    tide.precompute.fragment,
    /outColor=tdExactWaves\(p\)\+vec4\(tdBowlExact\(p\),0\.\)/,
  );
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

test("swell-signal bank preserves the foam phase without caching colour", (t) => {
  assert.match(tide.precompute.fragment, /cell.x>=512/);
  assert.match(tide.precompute.fragment, /outColor=tdExactFoam\(p\)/);
  assert.match(tide.fragment, /tdTable\(p,512\)/);
  const errors = {};
  for (const seed of [10301, 10303, 10306])
    for (const dev of [0, 0.5, 1, 1.5, 2]) {
      const w = waves(seed, dev, 1.3, 1.7);
      const exactAt = (p) => {
        const q = material(twist(p, dev), w);
        return [...foamSignal(q, w), ...q];
      };
      const e = (errors[dev] ??= { signal: 0, phase: 0, material: 0 });
      // Breaking needs at least the lowest threshold times the normalizer.
      const breaks = 0.65 * 0.6242;
      for (let i = 0; i < 1800; i++) {
        const p = [127.6 * Math.sin(i * 1.71), 127.6 * Math.cos(i * 0.37)];
        const exact = exactAt(p),
          cached = cachedData(p, exactAt);
        const scale = Math.hypot(exact[0], exact[1]);
        e.signal = Math.max(e.signal, Math.hypot(exact[0] - cached[0], exact[1] - cached[1]));
        e.material = Math.max(e.material, Math.hypot(exact[2] - cached[2], exact[3] - cached[3]));
        if (scale > breaks) {
          const d = Math.atan2(exact[0], exact[1]) - Math.atan2(cached[0], cached[1]);
          e.phase = Math.max(e.phase, Math.abs(Math.atan2(Math.sin(d), Math.cos(d))));
        }
      }
    }
  t.diagnostic(JSON.stringify(errors));
  for (const [dev, e] of Object.entries(errors)) {
    // The twisted peak compresses the short modes near the throat: the
    // bilinear table then shifts a breaking front by < 0.1 rad (~1.6 % of
    // its wavelength); the open ocean stays below 0.025 rad.
    assert.ok(
      e.phase < (Number(dev) <= 1 ? 0.025 : 0.1),
      `${dev}: breaking-front phase error ${e.phase} rad`,
    );
    assert.ok(e.material < 0.05, `${dev}: material error ${e.material} m`);
  }
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
  // The maelstrom's twist compresses the 4 m mode near the throat; its
  // bilinear normal error reaches about 0.10 there (0.016 before the twist).
  assert.ok(normalError < 0.11, `combined normal error ${normalError}`);
  assert.match(tide.fragment, /layer<3/);
  assert.ok(
    !tide.fragment.includes("float aeration="),
    "no filled thresholded noise lobes",
  );
});

test("ray-specific slabs bound the exact ocean, including the deep throat", (tc) => {
  assert.match(tide.fragment, /lower=-gWaveHeight-gVortex\*\(\.8\+42\.\*exp/);
  // The governor's step budget scales the solve: 96/64/40 -> 15/10/7.
  assert.match(
    tide.fragment,
    /solveSteps=int\(clamp\(ceil\(15\.\*u_raySteps\/96\.\),7\.,15\.\)\)/,
  );
  const budgets = [96, 64, 40].map((b) => ({
    budget: b,
    steps: Math.min(15, Math.max(7, Math.ceil((15 * b) / 96))),
    residual: 0,
  }));
  assert.deepEqual(
    budgets.map((b) => b.steps),
    [15, 10, 7],
  );
  for (const budget of budgets) {
  assert.match(tide.fragment, /if\(previous==1\) fhi\*=\.5/);
  assert.match(tide.fragment, /if\(previous==-1\) flo\*=\.5/);
  let worstResidual = 0;
  for (const dev of [0, 0.5, 1, 1.5, 2])
    for (const seed of [10301, 10303]) {
      const w = waves(seed, dev, 1.3, 1.8),
        v = smooth(1.2, 2, dev);
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
          for (let i = 0; i < budget.steps; i++) {
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
  budget.residual = worstResidual;
  }
  tc.diagnostic(budgets.map((b) => `${b.steps} steps: ${b.residual} m`).join("; "));
  assert.ok(
    budgets[0].residual < 0.15,
    `15-step intersection residual ${budgets[0].residual} m`,
  );
  // Reduced budgets stay a bounded geometric approximation (sub-metre).
  assert.ok(budgets[2].residual < 0.3, `7-step residual ${budgets[2].residual} m`);
});

// Mirror of the shader camera: coastal sway, crane and orbit; eye > 0.7
// cranes overhead, eye < 0.25 drops toward the lip.
function camera(dev, phase, eyeParam = 0.4, height = 1) {
  // Bowl (clearance) and crane follow separate, overlapping schedules.
  const bowlWeight = smooth(1.2, 2, dev),
    v = smooth(1.1, 1.9, dev),
    high = smooth(0.7, 1, eyeParam),
    low = 1 - smooth(0, 0.25, eyeParam);
  const upper = waves(10301, dev, height).reduce((s, w) => s + w.amplitude, 0);
  const radius =
    (54 + 3 * Math.cos(phase)) * (1 - v) +
    (45 + 2 * Math.cos(2 * phase) - 20 * high) * v;
  const coastal = upper + 4.6 * bowlWeight + 0.5 + 2.6 * eyeParam;
  return {
    upper: upper + 4.6 * bowlWeight,
    position: [
      12 * Math.sin(phase) * (1 - v) + radius * Math.sin(phase) * v,
      coastal * (1 - v) +
        (35 + 12 * eyeParam + 10 * high - 22 * low + 2 * Math.sin(phase)) * v,
      radius * (1 - v) + radius * Math.cos(phase) * v,
    ],
  };
}

test("camera remains above the sea; kick bounded; energy never changes development", () => {
  assert.match(tide.fragment, /coastal=gWaveHeight\+4\.6\*gVortex\+\.5\+2\.6\*eye/);
  assert.match(tide.fragment, /crane=smoothstep\(1\.1,1\.9,u_params\[0\]\)/);
  assert.match(
    tide.fragment,
    /mix\(12\.\*sin\(orbit\),radius\*sin\(orbit\),crane\)/,
  );
  assert.match(tide.fragment, /mix\(radius,radius\*cos\(orbit\),crane\)/);
  assert.match(tide.fragment, /35\.\+12\.\*eye\+10\.\*high-22\.\*lowEye\+2\.\*sin\(orbit\)/);
  for (let dev = 0; dev <= 2; dev += 0.01)
    for (const eyeParam of [0, 0.1, 0.25, 0.4, 0.7, 1])
      for (const height of [0.4, 1, 1.3])
        for (let phase = 0; phase < 2 * Math.PI; phase += 0.4) {
          const { upper, position } = camera(dev, phase, eyeParam, height);
          assert.ok(
            position[1] > upper + 0.49,
            `${dev}/${eyeParam}: eye ${position[1]} above envelope ${upper}`,
          );
        }
  for (const dev of [0, 0.5, 1, 1.25, 1.5, 1.75, 2])
    for (const eyeParam of [0, 0.4, 1]) {
      const a = camera(dev, -1e-7, eyeParam).position,
        b = camera(dev, 2 * Math.PI - 1e-7, eyeParam).position;
      assert.ok(
        Math.hypot(...a.map((v, i) => v - b[i])) < 1e-9,
        "camera wraps at intermediate development too",
      );
    }
  for (let phase = 0; phase < 2 * Math.PI; phase += 0.1) {
    const p = camera(2, phase).position,
      radius = Math.hypot(p[0], p[2]);
    assert.ok(radius >= 43 - 1e-10 && radius <= 47 + 1e-10, "peak orbit");
    // The overhead crane stays outside the throat, above the lip.
    const over = camera(2, phase, 1).position;
    assert.ok(Math.hypot(over[0], over[2]) >= 23 && over[1] > 50);
  }
  // The development sweep is C1: no camera jerk at the state boundaries.
  for (const edge of [1.1, 1.9]) {
    const e = 1e-5,
      a = camera(edge - e, 0.7).position,
      b = camera(edge + Math.min(e, 2 - edge || e), 0.7).position;
    assert.ok(Math.hypot(...a.map((v, i) => v - b[i])) < 1e-3);
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

test("Calm has no breaking foam at any energy; only faint biolight sparks", () => {
  for (const level of [0.1, 0.5, 0.9])
    for (const height of [0.4, 1, 1.3]) {
      // Calm amplitudes are 0.48 of the unit spectrum: the normalized
      // envelope cannot exceed height * 0.48 < the lowest threshold.
      const w = waves(10301, 0, height, 1.1);
      for (let i = 0; i < 400; i++) {
        const q = [Math.sin(i * 0.37) * 80, Math.cos(i * 1.31) * 80];
        const f = foamAt(foamSignal(q, w), level);
        assert.equal(f.breaking, 0);
        assert.equal(f.foam + f.front, 0);
      }
    }
  assert.match(tide.fragment, /sparkGate=smoothstep\(\.15,\.7,compress\)/);
  // The seeded shoal biases breaking near the coastal camera; it scales
  // with swell height (zero in Calm) and yields to the maelstrom.
  assert.match(tide.fragment, /\*gSwell\*\(1\.-gVortex\);\s*\}\s*threshold-=\.55\*shoal;/);
  // Far-field normals: each mode Gaussian-filtered by the footprint; the
  // table stays authoritative inside the twisted zone.
  assert.match(tide.fragment, /exp\(-\.5\*sq\(gK\[i\]\*footprint\)\)/);
  assert.match(tide.fragment, /mix\(1\.,smoothstep\(35\.,55\.,r\),-gTwist\/3\.5\)/);
  assert.match(tide.fragment, /tdPoints\(q\*\.8,footprint\*\.8,\.004,\.8\)/);
});
