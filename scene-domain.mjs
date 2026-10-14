import { familyEffect } from "./family-rhythm.mjs";

// Domain Colouring (#82): a complex function f as an analytic landscape.
// Rework 2026-10-14 (look audit #3): log |f| is the height of an oblique
// terrain seen by a slowly gliding camera, H·tanh(log|f| / L). Zeros sink
// as dark pits, poles rise as luminous spires. Lines of constant phase
// (coloured through the palette) and of constant log modulus (the
// terrain's level lines) form a conformal grid: they cross at right angles
// everywhere except at zeros, poles and critical points. Modulus lines
// flow, so rings climb from the pits into the spires; around a zero the
// phase colours turn one way, around a pole the other (the argument
// principle). Normals come from the exact f'/f.
//
// Variants:
//   0 Rational: three zeros and three poles orbit, and every 8 beats they
//     trade places (pits and spires pass through each other).
//   1 Riemann zeta: the camera flies along the critical line Re s = ½,
//     computed by Borwein's accelerated Dirichlet eta series (40 terms);
//     the nontrivial zeros are a row of pits, the pole at s = 1 a spire
//     near the start. A per-frame cache of ζ guides the terrain march; the
//     picture at every hit is evaluated exactly.
//   2 Möbius net: g = (z − p)/(z − q), a pit and a spire; Steiner circles
//     as contours, and a twist turns the phase lines into loxodromes.
//   3 Iterated z² + c: the n-th iterate, a polynomial of degree 2ⁿ whose
//     zeros crowd toward the Julia set; height log|fⁿ|/2ⁿ⁻¹, so the basin
//     keeps its scale while n steps on scheduled structure events.

const ZETA_TERMS = 40;
// Borwein's coefficients e_k = (d_k − d_n)/d_n (Algorithm 2).
export function borweinCoefficients(n = ZETA_TERMS) {
  const d = [1];
  let T = 1;
  for (let i = 1; i <= n; i++) {
    T *= (4 * (n + i - 1) * (n - i + 1)) / (2 * i * (2 * i - 1));
    d.push(d[i - 1] + T);
  }
  return d.slice(0, n).map((dk) => (dk - d[n]) / d[n]);
}
// ζ(s) for s = [σ, t] (CPU reference of the shader).
export function zeta([s, t], n = ZETA_TERMS) {
  const e = borweinCoefficients(n);
  let re = 0,
    im = 0;
  for (let k = 0; k < n; k++) {
    const l = Math.log(k + 1),
      mag = Math.exp(-s * l),
      sign = k % 2 ? 1 : -1;
    re += sign * e[k] * mag * Math.cos(t * l);
    im -= sign * e[k] * mag * Math.sin(t * l);
  }
  const l2 = Math.log(2),
    m2 = Math.exp((1 - s) * l2);
  const dr = 1 - m2 * Math.cos(t * l2),
    di = m2 * Math.sin(t * l2);
  const q = dr * dr + di * di;
  return [(re * dr + im * di) / q, (im * dr - re * di) / q];
}
export const ZETA_ZEROS = [
  14.134725, 21.02204, 25.010858, 30.424876, 32.935062, 37.586178,
];
// ζ'/ζ = η'/η − D'/D with η = Σ ±e_k (k+1)^{−s}, D = 1 − 2^{1−s}.
export function zetaLogDerivative([s, t], n = ZETA_TERMS) {
  const e = borweinCoefficients(n);
  let er = 0,
    ei = 0,
    dr = 0,
    di = 0;
  for (let k = 0; k < n; k++) {
    const l = Math.log(k + 1),
      mag = Math.exp(-s * l),
      sign = k % 2 ? 1 : -1;
    const re = sign * e[k] * mag * Math.cos(t * l),
      im = -sign * e[k] * mag * Math.sin(t * l);
    er += re;
    ei += im;
    dr -= l * re;
    di -= l * im;
  }
  const div = (ar, ai, br, bi) => {
    const q = br * br + bi * bi;
    return [(ar * br + ai * bi) / q, (ai * br - ar * bi) / q];
  };
  const [a, b] = div(dr, di, er, ei);
  const l2 = Math.log(2),
    m2 = Math.exp((1 - s) * l2);
  // 2^{1−s} = m2·e^{−it·log 2}; D = 1 − 2^{1−s}; D' = log 2 · 2^{1−s}.
  const pr = m2 * Math.cos(t * l2),
    pi = -m2 * Math.sin(t * l2);
  const [c, d] = div(l2 * pr, l2 * pi, 1 - pr, -pi);
  return [a - c, b - d];
}
// n-th iterate of z² + c and its derivative.
export function iterate([x, y], [cx, cy], n) {
  let fr = x,
    fi = y,
    dr = 1,
    di = 0;
  for (let i = 0; i < n; i++) {
    [dr, di] = [2 * (fr * dr - fi * di), 2 * (fr * di + fi * dr)];
    [fr, fi] = [fr * fr - fi * fi + cx, 2 * fr * fi + cy];
  }
  return [
    [fr, fi],
    [dr, di],
  ];
}
// Terrain height from log |f|: zeros sink to −H, poles rise to +H.
export const terrainHeight = (lm, H = 1, L = TERRAIN_L) => H * Math.tanh(lm / L);
export const TERRAIN_L = 1.3;

const coefficients = borweinCoefficients()
  .map((c) => c.toExponential(8))
  .join(", ");
// ζ cache for the terrain march: σ across, t along the view.
const CACHE = [384, 1024];

const shared = `
const float ZETA_E[${ZETA_TERMS}] = float[](${coefficients});
vec2 cMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cDiv(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / max(dot(b, b), 1e-30); }
vec2 cInv(vec2 a) { return vec2(a.x, -a.y) / max(dot(a, a), 1e-30); }
// ζ(s) by Borwein's accelerated eta series; d = ζ'/ζ when wanted.
vec2 dZeta(vec2 s, bool wantDerivative, out vec2 d) {
  vec2 eta = vec2(0.), deta = vec2(0.);
  for (int k = 0; k < ${ZETA_TERMS}; k++) {
    float l = log(float(k + 1));
    float mag = exp(-s.x * l);
    float sgn = (k & 1) == 1 ? 1. : -1.;
    vec2 term = sgn * ZETA_E[k] * mag * vec2(cos(s.y * l), -sin(s.y * l));
    eta += term;
    deta -= l * term;
  }
  float l2 = log(2.), m2 = exp((1. - s.x) * l2);
  vec2 p2 = m2 * vec2(cos(s.y * l2), -sin(s.y * l2));
  vec2 D = vec2(1., 0.) - p2;
  d = wantDerivative ? cDiv(deta, eta) - cDiv(l2 * p2, D) : vec2(0.);
  return cDiv(eta, D);
}
float dHash(float a) { return fract(sin(a * 12.9898 + float(u_seedBits % 991u) * .71) * 43758.5453); }
vec2 dOrbit(float k, float t, float motion) {
  float a = TAU * dHash(k) + t * motion * (.15 + .2 * dHash(k + 9.)) * (dHash(k + 4.) < .5 ? 1. : -1.);
  float r = .35 + .6 * dHash(k + 2.);
  return r * vec2(cos(a), sin(a) * .8);
}
struct Dom {
  int variant; float t; float beats; float motion; float zoom; float span;
  float swap; bool odd; int nA; int nB; vec2 c; vec2 zeros[3]; vec2 poles[3]; vec2 p; vec2 q;
  vec3 ro; vec3 forward; vec3 right; vec3 up; float dist; vec2 cacheMin; vec2 cacheSize;
};
Dom domSetup() {
  Dom d;
  d.variant = int(floor(u_params[0] + .5));
  d.zoom = u_params[1];
  d.motion = u_params[2];
  d.t = mod(u_time, 3600.);
  d.beats = u_beat > 0. ? u_beat : d.t * 2.;
  // Scheduled structure change over one beat: rational zeros and poles trade
  // places; the iterate's degree steps (its heights blend).
  d.swap = u_rhythmEnabled ? smoothstep(0., 1., 1. - min(u_rhythm.z * 1.5, 1.)) : smoothstep(0., 1., clamp(mod(d.beats, 8.), 0., 1.));
  float era = u_rhythmEnabled ? u_rhythmCount.z : floor(d.beats / 8.);
  d.odd = mod(era, 2.) > .5;
  d.nB = 1 + int(mod(era + 2., 6.));
  d.nA = 1 + int(mod(era + 1., 6.));
  d.c = vec2(-.75, .12) + .08 * vec2(cos(d.t * d.motion * .11), sin(d.t * d.motion * .17));
  // Rational: zeros and poles orbit and trade places (fixed per frame).
  float w = d.odd ? 1. - d.swap : d.swap;
  for (int k = 0; k < 3; k++) {
    vec2 a = dOrbit(float(k), d.t, d.motion), b = dOrbit(float(k) + 20., d.t, d.motion);
    d.zeros[k] = mix(a, b, w);
    d.poles[k] = mix(b, a, w);
  }
  // Möbius fixed points.
  d.p = vec2(-.7, 0.) + .25 * vec2(cos(d.t * .1), sin(d.t * .13));
  d.q = vec2(.7, 0.) + .25 * vec2(cos(d.t * .11 + 2.), sin(d.t * .09 + 1.));
  float lvl = clamp(u_level, 0., 1.);
  // Camera: an oblique glide. Zeta trucks sideways along its critical line
  // (t runs across the screen, the strip faces the viewer and Re s < 0
  // rises behind it into the dark); the others orbit the origin.
  float yaw, pitch;
  vec2 focus;
  if (d.variant == 1) {
    d.span = 14. / d.zoom;
    // Ping-pong along the line between t ≈ 16 and 30 (zeros 14.1 … 37.6 in view).
    float centre = 16. + 14. * (.5 - .5 * cos(d.t * d.motion * .03));
    focus = vec2(.3, centre);
    yaw = -PI / 2. + .12 * sin(TAU * fract(d.t / 150.));
    pitch = .92 + .06 * sin(TAU * fract(d.t / 90.));
  } else {
    d.span = 3.2 / d.zoom;
    focus = vec2(0.);
    yaw = d.t * d.motion * .025 + .35 * sin(TAU * fract(d.t / 120.));
    pitch = .82 + .1 * lvl + .07 * sin(TAU * fract(d.t / 72.));
  }
  vec2 heading = vec2(sin(yaw), cos(yaw));
  d.forward = vec3(heading * sin(pitch), -cos(pitch));
  d.right = vec3(heading.y, -heading.x, 0.);
  d.up = cross(d.right, d.forward);
  d.dist = d.span * .78;
  d.ro = vec3(focus, 0.) - d.forward * d.dist;
  // ζ cache: Re s from the trust edge to the camera, Im s across the view.
  d.cacheMin = vec2(-2.5, focus.y - 1.7 * d.dist);
  d.cacheSize = vec2(d.ro.x + 3.5, 3.4 * d.dist);
  return d;
}
`;

const precompute = `${shared}
void main() {
  Dom d = domSetup();
  if (d.variant != 1) { outColor = vec4(0.); return; }
  vec2 s = d.cacheMin + floor(gl_FragCoord.xy) / vec2(${CACHE[0] - 1}., ${CACHE[1] - 1}.) * d.cacheSize;
  vec2 unused;
  outColor = vec4(dZeta(s, false, unused), 0., 0.);
}
`;

const fragment = `${shared}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
const float TERRAIN_L = ${TERRAIN_L};
// log |f| only (for the march). Zeta reads the per-frame cache.
float logModulus(vec2 z, Dom d) {
  if (d.variant == 0) {
    float num = 1., den = 1.;
    for (int k = 0; k < 3; k++) {
      vec2 a = z - d.zeros[k], b = z - d.poles[k];
      num *= max(dot(a, a), 1e-12);
      den *= max(dot(b, b), 1e-12);
    }
    return .5 * log(num / den);
  }
  if (d.variant == 1) {
#ifdef PRECOMPUTED
    vec2 g = clamp((z - d.cacheMin) / d.cacheSize, 0., 1.) * vec2(${CACHE[0] - 1}., ${CACHE[1] - 1}.);
    ivec2 i0 = min(ivec2(g), ivec2(${CACHE[0] - 2}, ${CACHE[1] - 2}));
    vec2 f = g - vec2(i0);
    vec2 v = mix(mix(texelFetch(u_precomputed, i0, 0).xy, texelFetch(u_precomputed, i0 + ivec2(1, 0), 0).xy, f.x),
                 mix(texelFetch(u_precomputed, i0 + ivec2(0, 1), 0).xy, texelFetch(u_precomputed, i0 + 1, 0).xy, f.x), f.y);
#else
    vec2 unused;
    vec2 v = dZeta(z, false, unused);
#endif
    return log(max(length(v), 1e-20));
  }
  if (d.variant == 2) {
    vec2 a = z - d.p, b = z - d.q;
    return .5 * log(max(dot(a, a), 1e-24) / max(dot(b, b), 1e-24));
  }
  // Iterate: log |fⁿ| / 2ⁿ⁻¹ (the potential's scale), blended across a degree step.
  // Outside a degree step only the current iterate is needed.
  bool blend = d.swap < 1.;
  vec2 F = z, FA = z;
  for (int i = 0; i < 6; i++) {
    if (blend && i < d.nA) FA = cMul(FA, FA) + d.c;
    if (i < d.nB) F = cMul(F, F) + d.c;
    if (dot(F, F) > 1e12 || dot(FA, FA) > 1e12) break;
  }
  float lb = .5 * log(max(dot(F, F), 1e-40)) / exp2(float(d.nB - 1));
  if (!blend) return lb;
  float la = .5 * log(max(dot(FA, FA), 1e-40)) / exp2(float(d.nA - 1));
  return mix(la, lb, d.swap);
}
// Full evaluation at the hit: (log |f|, arg f / 2π, ∇ log |f|).
vec4 domainField(vec2 z, Dom d, out float trust) {
  trust = 1.;
  vec2 F, g; // f and f'/f
  float scale = 1.;
  if (d.variant == 0) {
    F = vec2(1., 0.);
    g = vec2(0.);
    for (int k = 0; k < 3; k++) {
      vec2 zero = d.zeros[k], pole = d.poles[k];
      F = cMul(F, cDiv(z - zero, z - pole));
      g += cInv(z - zero) - cInv(z - pole);
    }
  } else if (d.variant == 1) {
    F = dZeta(z, true, g);
    // Float precision limits the series far left of the strip: fade there.
    trust = smoothstep(-1.5, -.9, z.x);
  } else if (d.variant == 2) {
    vec2 p = d.p, q = d.q;
    vec2 gm = cDiv(z - p, z - q);
    // Loxodromic twist: the phase picks up log-modulus (|f| unchanged).
    float twist = .6 * sin(d.t * d.motion * .05);
    float lg = log(max(length(gm), 1e-20));
    float ang = atan(gm.y, gm.x) + twist * lg;
    F = exp(lg) * vec2(cos(ang), sin(ang));
    g = cInv(z - p) - cInv(z - q);
  } else {
    vec2 FA = z, DA = vec2(1., 0.), FB = z, DB = vec2(1., 0.);
    for (int i = 0; i < 6; i++) {
      if (i < d.nA) { DA = 2. * cMul(FA, DA); FA = cMul(FA, FA) + d.c; }
      if (i < d.nB) { DB = 2. * cMul(FB, DB); FB = cMul(FB, FB) + d.c; }
      if (dot(FB, FB) > 1e12 || dot(FA, FA) > 1e12) break;
    }
    float sa = 1. / exp2(float(d.nA - 1)), sb = 1. / exp2(float(d.nB - 1));
    vec2 ga = cDiv(DA, FA) * sa, gb = cDiv(DB, FB) * sb;
    float la = log(max(length(FA), 1e-20)) * sa, lb = log(max(length(FB), 1e-20)) * sb;
    vec2 Fm = d.swap < .5 ? FA : FB;
    vec2 gmix = mix(ga, gb, d.swap);
    return vec4(mix(la, lb, d.swap), atan(Fm.y, Fm.x) / TAU, gmix.x, -gmix.y);
  }
  // d/dx log|f| = Re(f'/f), d/dy log|f| = −Im(f'/f).
  return vec4(log(max(length(F), 1e-20)), atan(F.y, F.x) / TAU, g.x, -g.y);
}

void main() {
  Dom d = domSetup();
  float grid = u_params[3];
  float bands = u_params[4];
  float flow = u_params[5];
  float sectors = floor(u_params[6] + .5);
  float glow = u_params[7];
  float lvl = clamp(u_level, 0., 1.);
  float px = u_resolution.y / 1080.;
  float beatPulse = u_rhythmEnabled ? 0. : u_beat > 0. ? exp(-5. * fract(u_beat)) : 0.;
  bool usePoles = d.variant != 3;
  vec2 uv = aspectUV();

  float lens = 1.6 * (1. + .02 * clamp(u_kick, 0., 1.));
  vec3 rd = normalize(uv.x * d.right + uv.y * d.up + lens * d.forward);
  // Terrain: height H·tanh(log|f| / L); energy raises the relief.
  float H = d.span * mix(.13, .2, lvl);
  float tTop = (H - d.ro.z) / rd.z, tBottom = (-H - d.ro.z) / rd.z;
  float tFar = d.dist * 2.8;
  float tEnd = min(tBottom, tFar);
  float tm = tTop, prev = tTop;
#ifdef PRECOMPUTED
  const int STEPS = 18;
#else
  int STEPS = d.variant == 1 ? 6 : 18;
#endif
  float tHit = tEnd;
  bool sky = tTop > tFar;
  if (!sky) {
    // Samples crowd toward the top of the slab, where spires are thinnest.
    for (int i = 1; i <= 18; i++) {
      if (i > STEPS) break;
      float u = float(i) / float(STEPS);
      tm = tTop + (tEnd - tTop) * u * u;
      vec3 q = d.ro + rd * tm;
      if (q.z <= H * tanh(logModulus(q.xy, d) / TERRAIN_L)) {
        float a = prev, b = tm;
        for (int k = 0; k < 6; k++) {
          float m = .5 * (a + b);
          vec3 r = d.ro + rd * m;
          if (r.z <= H * tanh(logModulus(r.xy, d) / TERRAIN_L)) b = m; else a = m;
        }
        tHit = b;
        break;
      }
      prev = tm;
    }
  }
  vec3 hit = d.ro + rd * tHit;
  float trust;
  vec4 f = domainField(hit.xy, d, trust);
  float lm = f.x, ph = f.y;
  float th = tanh(lm / TERRAIN_L);
  vec2 slope = H * (1. - th * th) / TERRAIN_L * f.zw;
  vec3 normal = normalize(vec3(-slope, 1.));
  vec3 view = -rd;

  // Dark lit ground: a soft key, a rim, contact darkening down in the pits.
  vec3 key = normalize(vec3(-.6 * d.right.xy - .3 * d.forward.xy, .7));
  float diffuse = max(0., dot(normal, key));
  float rim = pow(1. - max(0., dot(normal, view)), 3.);
  float pit = smoothstep(-.97, -.35, th);
  vec3 base = mix(u_secondary, u_primary, .5 + .5 * th);
  // Light favours the heights: the plain stays near black.
  float lift = smoothstep(-.3, .9, th);
  float wrap = .25 + .75 * diffuse;
  vec3 colour = base * (.01 + (.06 + .42 * lift) * wrap * wrap) * pit;
  colour += mix(u_secondary, u_primary, .4) * rim * (.05 + .18 * lift) * pit;

  // Phase lines (constant arg f), coloured through the palette, and modulus
  // contours (constant log |f| = level lines of the terrain) flowing from
  // the zeros up into the poles: together the conformal grid.
  float a1 = ph * sectors, a2 = fract(ph * sectors + .5);
  float w1 = max(min(fwidth(a1), fwidth(a2)), 1e-5);
  float d1 = abs(fract(a1 + .5) - .5) / w1;
  float half1 = abs(fract(a1) - .5) / w1;
  float hw = .75 * px;
  float density = 1. - smoothstep(.12, .35, w1);
  float phaseLine = clamp(hw + .5 - d1, 0., 1.)
                  + clamp(hw * .7 + .5 - half1, 0., 1.) * smoothstep(.45, .9, lvl) * .6;
  vec3 phaseColour = palette(.42 - .42 * cos(TAU * ph));
  colour += phaseColour * phaseLine * density * grid * (.55 + .45 * pit) * 1.4;
  float qn = lm * sectors / TAU - d.t * flow * .1;
  float wq = max(fwidth(qn), 1e-5);
  float modLine = clamp(hw + .5 - abs(fract(qn + .5) - .5) / wq, 0., 1.) * (1. - smoothstep(.15, .4, wq));
  float band = fract(lm / log(2.) - d.t * flow * .6);
  colour += mix(u_secondary, vec3(1.), .25) * modLine * grid * (.35 + .3 * bands * band) * pit;

  // Poles rise as luminous spires; zeros stay dark pits with an ember at
  // the bottom when the zero/pole light plays.
  float m = exp(lm);
  // Emission from log |f| itself, so only the tip of each spire glows.
  float spire = usePoles ? smoothstep(2., 4.6, lm) : 0.;
  colour += mix(u_primary, mix(u_accent, vec3(1.), .35), spire) * spire * spire * glow * (1.8 + .6 * beatPulse);
  float zeroGlow = exp(-m * 6.), poleGlow = usePoles ? exp(-6. / m) : 0.;
  colour += mix(u_accent, vec3(1.), .4) * (!usePoles || mod(u_rhythmCount.x, 2.) < 1. ? zeroGlow : poleGlow) * u_rhythm.x * .65;
  float modulusCohort = exp(-sq((band - mod(u_rhythmCount.y, 4.) * .25) / .055));
  colour += phaseColour * modulusCohort * u_rhythm.y * .35 * pit;

  // Atmosphere and the zeta trust fade.
  float fog = sky ? 1. : smoothstep(d.dist * 1.15, tFar, tHit);
  colour = mix(colour, u_secondary * .005, fog);
  outColor = vec4(max(colour * trust, 0.), 1.);
}
`;

const schema = [
  {
    key: "variant",
    label: "Function · rational / Riemann zeta / Möbius net / iterated z² + c",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  { key: "zoom", label: "Zoom", min: 0.4, max: 4, step: 0.01, default: 1 },
  { key: "motion", label: "Motion", min: 0, max: 1, step: 0.01, default: 0.4 },
  {
    key: "grid",
    label: "Conformal grid",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "bands",
    label: "Modulus bands",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  { key: "flow", label: "Band flow", min: 0, max: 1, step: 0.01, default: 0.4 },
  {
    key: "sectors",
    label: "Phase lines",
    min: 4,
    max: 24,
    step: 1,
    default: 12,
  },
  {
    key: "glow",
    label: "Zero and pole glow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
];

const look = (
  name,
  seed,
  variant,
  zoom,
  motion,
  grid,
  bands,
  flow,
  sectors,
  glow,
) => ({
  name,
  seed,
  params: { variant, zoom, motion, grid, bands, flow, sectors, glow },
});

const presets = [
  look("Zeros and Poles", 8201, 0, 1, 0.4, 0.5, 0.6, 0.4, 12, 0.5),
  look("Pole Dance", 8202, 0, 0.8, 0.8, 0.35, 0.8, 0.7, 8, 0.6),
  look("Conformal Grid", 8203, 0, 1.2, 0.3, 1, 0.3, 0.3, 16, 0.4),
  look("Critical Line", 8204, 1, 1, 0.5, 0.5, 0.6, 0.4, 12, 0.5),
  look("Zeta Bands", 8205, 1, 0.7, 0.35, 0.3, 0.9, 0.6, 8, 0.6),
  look("Steiner Net", 8206, 2, 1, 0.4, 0.9, 0.4, 0.4, 16, 0.4),
  look("Loxodrome Flow", 8207, 2, 0.8, 0.9, 0.6, 0.8, 0.8, 12, 0.5),
  look("Julia Polynomial", 8208, 3, 1, 0.4, 0.4, 0.7, 0.5, 12, 0.5),
  look("Degree Doubling", 8209, 3, 1.4, 0.6, 0.6, 0.5, 0.4, 8, 0.5),
];

export default {
  rhythm: [
    familyEffect("zero-pole", 0, "Zero/pole light", "Independently reveal the function's genuine zeros and poles."),
    familyEffect("modulus-band", 1, "Modulus-band light", "Select a logarithmic modulus contour of the evaluated complex function.", { period: 3, strength: 0.55 }),
    familyEffect("conformal-change", 2, "Conformal structure change", "Schedule a rational zero/pole exchange or an iterated-map depth change.", { period: 8, strength: 0.65, duration: 1.5, kind: "motion", variants: [0, 3] }),
  ],
  id: "domain",
  number: 82,
  name: "Domain Colouring",
  description:
    "Complex functions as an analytic landscape: log |f| is the height of an oblique terrain under a gliding camera, so zeros sink as dark pits and poles rise as luminous spires. Phase lines, coloured through the palette, and modulus contours, the terrain's level lines, form a conformal grid that crosses at right angles everywhere but at zeros and poles; the contours flow from the pits up into the spires. Three zeros and three poles orbit and trade places; the camera flies along the Riemann zeta function's critical line over its row of zeros; a Möbius map raises a pit and a spire wrapped in Steiner circles and loxodromes; iterating z² + c sinks 2ⁿ pits toward the Julia set on scheduled structure events. Independent zero/pole and modulus-band tracks illuminate the evaluated function.",
  energy: {
    motion: { mul: [0.5, 2] },
    flow: { mul: [0.5, 2] },
    zoom: { mul: [1.12, 0.88] },
  },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "flow", feature: "low", amount: 0.06 },
    { param: "glow", feature: "onset", amount: 0.12 },
    { param: "grid", feature: "high", amount: 0.08 },
  ],
  stage: ["motion", "flow", "grid"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
  precompute: { fragment: precompute, size: CACHE },
};
