import { familyEffect } from "./family-rhythm.mjs";
import {
  CLOCK_PERIOD,
  CLOUD,
  MODES,
  N,
  ORBIT_CORE,
  ORBIT_V,
  RELAX,
  RMAX,
  SHELL,
  SIZE,
  ABSORBERS,
} from "./nebula-model.mjs";
export { SIZE };

// Density Waves (#87): one fixed 512×256 population traces a Zel'dovich
// cosmic-web cloud (Dust), a density-wave spiral galaxy (Spiral) and a
// filamentary supernova remnant with Sedov–Taylor shock fronts (Nova).
// nebula-model.mjs is the CPU reference; keep both in step.
//
// State texture (RGBA8, 512×256): texel 0 is a 32-bit clock (fraction of
// CLOCK_PERIOD, integrated at the motion speed); every other texel holds the
// star's extra azimuth ψ as a 32-bit turn fraction. Global cycles use integer
// counts per period, so uint wrap keeps them exact for a whole night.

const f = (x) => (Number.isInteger(x) ? `${x}.` : `${x}`);
const common = `
const float NB_TAU = 6.283185307179586;
const float NB_P = ${f(CLOCK_PERIOD)};
const float NB_RMAX = ${f(RMAX)};
const float NB_CLOUD = ${f(CLOUD)};
const float NB_SHELL = ${f(SHELL)};
uint nbHash(uint x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16;
  return x;
}
uint nbKey() { return nbHash(u_seedBits + 0x51ed270bu); }
float nbRnd(uint key, uint id, uint k) {
  return float(nbHash((id * 0x9e3779b9u) ^ nbHash(k + key)) >> 8) / 16777216.;
}
uint nbWord(vec4 t) {
  uvec4 b = uvec4(t * 255. + .5);
  return (b.r << 24) | (b.g << 16) | (b.b << 8) | b.a;
}
vec4 nbBytes(uint v) {
  return vec4(uvec4(v >> 24, (v >> 16) & 255u, (v >> 8) & 255u, v & 255u)) / 255.;
}
uint nbClock() { return nbWord(texelFetch(u_state, ivec2(0), 0)); }
float nbCycle(uint clock, uint n) { return float(clock * n) * (1. / 4294967296.); }
float nbSq(float x) { return x * x; }
float nbSmooth(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
float nbGauss(float u1, float u2) { return sqrt(-2. * log(max(u1, 1e-7))) * cos(NB_TAU * u2); }
struct NbStar { int kind; float rank, ang0, a, height, cz, layer, density, tone; vec3 q, shellDir; };
NbStar nbStar(uint key, uint id) {
  NbStar s;
  float kr = nbRnd(key, id, 0u);
  s.kind = id >= ${ABSORBERS}u ? 3 : kr < .045 ? 2 : kr < .165 ? 1 : 0;
  s.rank = nbRnd(key, id, 1u);
  s.ang0 = NB_TAU * nbRnd(key, id, 2u);
  float v = nbGauss(nbRnd(key, id, 3u), nbRnd(key, id, 4u));
  float w = nbGauss(nbRnd(key, id, 5u), nbRnd(key, id, 6u));
  float L = .72 + .12 * nbRnd(key, 0u, 906u);
  if (s.kind == 1) { s.a = .03 + .34 * pow(s.rank, 1.7); s.height = 0.; }
  else {
    s.a = .06 - L * log(1. - s.rank * (1. - exp(-NB_RMAX / L)));
    s.height = v * (.012 + .05 * exp(-s.a / .5));
  }
  float rq = NB_CLOUD * sqrt(s.kind == 1 ? .45 * s.rank : s.rank);
  s.q = vec3(rq * cos(s.ang0), .42 * NB_CLOUD * w * (1. - .55 * s.rank) * .6, rq * sin(s.ang0));
  s.cz = s.kind == 1 ? clamp(v * .45, -.96, .96) : 0.;
  float sz = nbRnd(key, id, 7u) * 2. - 1., saz = NB_TAU * nbRnd(key, id, 8u), sr = sqrt(1. - sz * sz);
  s.shellDir = vec3(sr * cos(saz), sz, sr * sin(saz));
  s.layer = nbRnd(key, id, 9u);
  s.density = nbRnd(key, id, 10u);
  s.tone = nbRnd(key, id, 11u);
  return s;
}
vec2 nbProgress(float dev, float rank) {
  float d = clamp(dev, 0., 2.), lo = .5 * rank;
  return vec2(nbSmooth(lo, lo + .5, d), nbSmooth(lo, lo + .5, d - 1.));
}
float nbOmega(float a) { return ${f(ORBIT_V)} / sqrt(a * a + ${f(ORBIT_CORE * ORBIT_CORE)}); }
`;

// Camera shared by the background and the stars.
const camera = `
struct NbCam { vec3 eye, right, up, fwd; float focal, dist; };
NbCam nbCamera(uint clock, float dev) {
  NbCam c;
  uint key = nbKey();
  float yaw = NB_TAU * (nbCycle(clock, ${N.yaw}u) + nbRnd(key, 0u, 907u));
  float el = mix(.16, 1.1, clamp(u_params[6], 0., 1.)) + .1 * sin(NB_TAU * nbCycle(clock, ${N.lift}u));
  c.dist = u_params[5] * (mix(4.5, 3.5, nbSmooth(0., 1., dev)) + .2 * nbSmooth(1., 2., dev))
    * (1. + .04 * sin(NB_TAU * nbCycle(clock, ${N.dolly}u)));
  c.eye = c.dist * vec3(cos(el) * sin(yaw), sin(el), cos(el) * cos(yaw));
  c.fwd = normalize(vec3(0., -.06, 0.) - c.eye);
  c.right = normalize(cross(c.fwd, vec3(0., 1., 0.)));
  c.up = cross(c.right, c.fwd);
  c.focal = 1.85 * (1. + .02 * clamp(u_kick, 0., 1.));
  return c;
}
`;

const modes = `
// Zel'dovich potential modes (seeded). xyz = −∇Φ, w = normalised Σ amp·cos;
// hess accumulates ∂S/∂q, so the mapped density is 1 / |det(I + D·∂S/∂q)|.
vec4 nbWeb(uint key, vec3 q, uint clock, out mat3 hess) {
  vec3 s = vec3(0.); float fsum = 0., total = 0.;
  hess = mat3(0.);
  for (int m = 0; m < ${MODES}; m++) {
    uint um = uint(m);
    float z = nbRnd(key, um, 900u) * 2. - 1., az = NB_TAU * nbRnd(key, um, 901u), r = sqrt(1. - z * z);
    vec3 dir = vec3(r * cos(az), z * .55, r * sin(az));
    float kl = 2.4 + 2.4 * nbRnd(key, um, 902u);
    vec3 k = normalize(dir) * kl;
    float amp = .22 + .2 * nbRnd(key, um, 903u);
    float ph = NB_TAU * nbRnd(key, um, 904u) + NB_TAU * nbCycle(clock, uint(1 + m % ${N.drift}));
    float arg = dot(k, q) + ph;
    s += amp / (kl * kl) * sin(arg) * k;
    hess += outerProduct(k, k) * (amp / (kl * kl) * cos(arg));
    fsum += amp * cos(arg);
    total += amp;
  }
  return vec4(s, 2. * fsum / total);
}
`;

const simulation = `
${common}
float nbPsiRate(NbStar s, float dev, float psi) {
  if (s.kind == 2) return 0.;
  vec2 pr = nbProgress(dev, s.rank);
  float spin = max(0., nbOmega(s.a) - NB_TAU * ${N.cloud}. / NB_P);
  return pr.x * (1. - pr.y) * spin - (1. - pr.x) * ${f(RELAX)} * psi;
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  uint v = u_reset ? 0u : nbWord(texelFetch(u_state, cell, 0));
  float rate = clamp(u_params[1], 0., 2.) * u_dt;
  if (cell == ivec2(0)) {
    v += uint(rate * (4294967296. / NB_P) + .5);
  } else {
    uint id = uint(cell.y * textureSize(u_state, 0).x + cell.x);
    // Only the fixed tracer cohort consumes ψ. Sky stars never consume it;
    // the dormant identities retain their original state without extra work.
    if (id >= ${ABSORBERS}u || (id & 3u) != 0u) { outColor = nbBytes(v); return; }
    NbStar s = nbStar(nbKey(), id);
    // ψ is a signed turn fraction; the relaxation takes the short way home.
    float psi = float(int(v)) * (NB_TAU / 4294967296.);
    float dpsi = nbPsiRate(s, u_params[0], psi) * rate;
    v += uint(int(round(dpsi * (4294967296. / NB_TAU))));
  }
  outColor = nbBytes(v);
}
`;

const vertex = `
${common}
${camera}
${modes}
out float v_soft;
// Normalised sech² dust column on the finite emitter→eye segment.
// Unlike a screen overlay, a foreground emitter never sees dust behind it.
float nbDustColumn(vec3 start, vec3 eye) {
  vec3 ray = eye - start;
  float dy = ray.y, h = .035;
  if (abs(dy) < .0001) { float a = tanh(1.20276058 * start.y / h); return length(ray) * .60138029 / h * (1. - a * a); }
  return .5 * length(ray) / abs(dy) * abs(tanh(1.20276058 * eye.y / h) - tanh(1.20276058 * start.y / h));
}
float nbTransmission(vec3 start, vec3 eye, uint key, uint clock, float arms) {
  vec3 ray = eye - start;
  float t = abs(ray.y) > .0001 ? clamp(-start.y / ray.y, 0., 1.) : 0.;
  vec3 q = start + ray * t;
  float r = length(q.xz);
  float beta = r * 1.35 * (2.2 + .9 * nbRnd(key, 0u, 905u)) * arms + NB_TAU * nbCycle(clock, ${N.pattern}u);
  float w = atan(q.z, q.x) - beta + .7853981634 + .42;
  float off = mod(w + 1.5707963, 3.1415926536) - 1.5707963;
  float lane = exp(-off * off / .065) * nbSmooth(.12, .4, r) * (1. - nbSmooth(1.35, 1.7, r));
  return exp(-2.4 * lane * min(nbDustColumn(start, eye), 12.));
}
vec3 nbRotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z); }
void main() {
  gl_Position = vec4(2., 2., 2., 1.);
  gl_PointSize = 1.;
  v_color = vec3(0.);
  v_soft = 0.;
  uint id = uint(gl_VertexID);
  // The continuous radiance layer carries unresolved gas. Keep a stable,
  // seed-independent quarter of the existing tracers for resolved depth.
  if (id == 0u || id >= ${ABSORBERS}u) return;
  uint key = nbKey(), clock = nbClock();
  NbStar s = nbStar(key, id);
  if (s.kind != 2 && (id & 3u) != 0u) return;
  float dev = clamp(u_params[0], 0., 2.);
  float growth = u_params[2], arms = u_params[3], light = u_params[4], shock = u_params[7];
  float level = clamp(u_level, 0., 1.);
  // Energy density: fewer stars at low energy, never a pop.
  float keep = mix(.74, 1., level);
  float shown = 1. - nbSmooth(keep - .06, keep, s.density);
  if (shown <= 0.) return;
  float psi = float(int(nbWord(particle()))) * (NB_TAU / 4294967296.);
  vec2 pr = nbProgress(dev, s.rank);
  float p = pr.x, n = pr.y;
  float cloud = NB_TAU * nbCycle(clock, ${N.cloud}u);
  float lambda = s.ang0 + cloud + psi;
  vec3 pos;
  float crest = 0., compress = 1.;
  vec3 hue = u_primary;
  float bright = 0., size = 1.6, soft = 0., shellStage = 0.;
  if (s.kind == 2) {
    // Distant stars: parallax and scale against the near form.
    pos = s.shellDir * mix(7., 16., s.layer);
    bright = 1.5 + 4. * pow(s.tone, 14.);
    hue = mix(mix(u_secondary, vec3(1.), .7), u_primary, .15 * s.tone);
    size = 2.6 + 5. * pow(s.tone, 26.);
  } else {
    float rhoG, epsG = 0., yG;
    if (s.kind == 1) {
      rhoG = s.a * sqrt(1. - s.cz * s.cz);
      yG = s.a * s.cz * .72;
    } else {
      // Density wave: an ellipse whose orientation turns with radius.
      float ell = 1. - .32 * nbSmooth(.08, .55, s.a);
      float twist = 1.35 * (2.2 + .9 * nbRnd(key, 0u, 905u)) * arms;
      // Each orbit's orientation scatters a little: broad, clumpy arms.
      float beta = s.a * twist + NB_TAU * nbCycle(clock, ${N.pattern}u) + 1.1 * (s.tone - .5) * s.layer;
      float u = lambda - beta, cu = cos(u), su = sin(u), b = s.a * ell;
      epsG = atan((b - s.a) * su * cu, s.a * cu * cu + b * su * su);
      rhoG = sqrt(s.a * s.a * cu * cu + b * b * su * su);
      yG = s.height;
      // Arms are where neighbouring ellipses crowd: u ≈ −π/4 (mod π).
      float w = u + .7853981634;
      crest = pow(.5 + .5 * cos(2. * w), 3.);
    }
    float rhoQ = length(s.q.xz);
    float rho = mix(rhoQ, rhoG, p), y = mix(s.q.y, yG, p);
    float th = lambda + p * epsG;
    pos = vec3(rho * cos(th), y, rho * sin(th));
    if (p < 1.) {
      // Zel'dovich: x = q + D·S(q); caustics gather the cosmic web.
      mat3 hess;
      vec3 S = nbWeb(key, s.q, clock, hess).xyz;
      // Exact Zel'dovich density: caustics (det → 0) glow as the web.
      float det = abs(determinant(mat3(1.) + growth * hess));
      compress = clamp(1. / max(det, .05), .25, 7.);
      float wob = NB_TAU * nbCycle(clock, ${N.wobble}u) + NB_TAU * s.tone;
      vec3 jitter = .03 * (.4 + .9 * level) * vec3(sin(wob + s.q.y * 3.), sin(wob * 1. + 1.7 + s.q.x * 2.), cos(wob + s.q.z * 2.));
      pos += nbRotY(S * growth + jitter, cloud + psi) * (1. - p);
    }
    // Dust: gas glows faintly; the web's caustics brighten by crowding.
    vec3 gas = mix(u_secondary, u_primary, clamp(.1 + .3 * s.tone + .18 * compress, 0., 1.));
    float dustB = .0015 * pow(compress, 1.1) + 1.6 * pow(s.tone, 60.);
    float dustSize = 1.9 + 2.6 * s.layer;
    // Spiral: crest stars young and light, inter-arm stars old, lanes dark.
    vec3 young = mix(u_primary, vec3(1.), .18), old = mix(u_secondary, u_primary, .45);
    vec3 starHue = s.kind == 1 ? mix(mix(u_primary, u_accent, .3), vec3(1.), .3) : mix(old, young, crest);
    // The bulge's centre is dense already: dim its stars there (no white blob).
    float starB = s.kind == 1 ? .08 : (.15 + .7 * crest) * (.04 + 2.2 * pow(s.tone, 18.));
    if (s.kind == 0 && s.tone > .994 && crest > .55) { starHue = u_accent; starB = 1.1; }
    hue = mix(gas, starHue, p);
    bright = mix(dustB, starB, p);
    size = mix(dustSize, s.kind == 1 ? 1.7 : 1.5 + .9 * crest, p);
    soft = 1. - p;
    bool cloudlet = s.kind == 0 && s.layer > .9;
    if (cloudlet) {
      // Glowing gas: large soft sprites trace the web, then the arms.
      hue = mix(mix(u_secondary, u_primary, .3 + .2 * s.tone), mix(u_primary, u_accent, .12), p * crest);
      bright = mix(.025 * pow(compress, 1.1), (.025 + .1 * crest) * nbSmooth(.05, .5, s.a), p);
      size = mix(20. + 12. * s.tone, 14. + 9. * s.tone, p);
      soft = 1.;
    }
    if (n > 0.) {
      // Nova: collapse, ignite, then ride out on the filamented shell.
      float len = max(length(pos), 1e-4);
      vec3 dir = s.shellDir + .8 * (pos / len) * vec3(1., .3, 1.);
      vec3 n0 = normalize(dir);
      vec3 shell;
      float front = 0., shellCompress = 1., jet = -1.;
      if (s.kind == 1) {
        if (s.layer > .72) {
          // Pulsar jets: bulge stars stream out along a precessing axis.
          float ph = NB_TAU * nbCycle(clock, ${N.lift}u);
          vec3 axis = normalize(vec3(.45 * sin(ph), 1., .45 * cos(ph)));
          jet = fract((s.layer - .72) / .28 + nbCycle(clock, ${N.jet}u));
          vec3 side = n0 - dot(n0, axis) * axis;
          shell = axis * (s.tone < .5 ? -1. : 1.) * (.05 + 1.6 * jet * jet) + side * .035 * jet;
        } else shell = n0 * (.015 + .05 * s.layer * s.layer);
      } else {
        mat3 shellHess;
        vec4 web = nbWeb(key, n0 * 2., clock, shellHess);
        shellCompress = clamp(1. / max(abs(determinant(mat3(1.) + .7 * growth * shellHess)), .06), .3, 6.);
        vec3 t = n0 + .35 * growth * (web.xyz - dot(web.xyz, n0) * n0);
        vec3 nd = normalize(t);
        float depth = s.layer < .6 ? .92 + .08 * sqrt(s.layer / .6) : .3 + .75 * (s.layer - .6) / .4;
        float breath = 1. + .03 * sin(NB_TAU * nbCycle(clock, ${N.dolly}u));
        float R = NB_SHELL * breath * (1. + .16 * web.w) * depth;
        // Sedov–Taylor shock fronts R ∝ t^(2/5) run through the shell.
        float c = nbCycle(clock, ${N.shock}u);
        float F = 2.35 * pow(c, .4);
        float amp = shock * nbSmooth(0., .05, c) * (1. - c);
        front = amp * exp(-(R - F) * (R - F) / .006);
        shell = nd * (R + .08 * front);
      }
      float s1 = nbSmooth(0., .3, n), s2 = nbSmooth(.18, 1., n);
      shellStage = s2;
      pos = mix(pos * (1. - .62 * s1), shell, s2);
      // Ignition: the core flares as it collapses, then settles.
      float ignite = exp(-nbSq((n - .24) / .1));
      vec3 rim = mix(u_primary, vec3(1.), .22), ejecta = mix(u_secondary, u_primary, .3);
      vec3 novaHue = s.kind == 1 ? mix(u_accent, vec3(1.), .45) : (s.layer < .6 ? rim : ejecta);
      float novaB = s.kind == 1 ? .025 : (s.layer < .6 ? .018 + .012 * shellCompress * shellCompress : .008);
      novaHue = mix(novaHue, u_accent, .7 * clamp(front, 0., 1.));
      novaB += 1.3 * front;
      if (jet >= 0.) {
        novaHue = mix(mix(u_accent, vec3(1.), .6), u_secondary, jet);
        novaB = .18 * pow(1. - jet, 1.5) * nbSmooth(0., .06, jet);
      }
      hue = mix(hue, novaHue, s2);
      bright = mix(bright, novaB, s2) + ignite * (s.kind == 1 ? .5 : .12);
      size = mix(size, cloudlet ? 8. + 6. * s.tone : 1.6 + .7 * front, s2);
      if (cloudlet) bright = mix(bright, (.015 + .006 * shellCompress * shellCompress) + .12 * front, s2);
      else soft *= 1. - s2;
    }
    // Rhythm: arm/filament accent, core flare, outward ripple.
    float r3 = length(pos);
    bright += u_rhythm.x * .08 * (p * crest + (1. - p) * pow(s.tone, 6.) + n * float(s.layer < .6) * .5);
    if (s.kind == 1) { bright += u_rhythm.y * .35; hue = mix(hue, u_accent, .5 * u_rhythm.y); }
    float ripple = 2.6 * (1. - u_rhythm.z);
    bright += u_rhythm.z * .15 * exp(-nbSq((r3 - ripple) / .14));
  }
  NbCam cam = nbCamera(clock, dev);
  vec3 v = pos - cam.eye;
  float z = dot(v, cam.fwd);
  if (z < .25) return;
  vec2 screen = vec2(dot(v, cam.right), dot(v, cam.up)) * cam.focal / z;
  float minSide = min(u_resolution.x, u_resolution.y);
  float res = minSide / 1080.;
  gl_Position = vec4(screen * minSide / u_resolution, 0., 1.);
  // Depth: near stars larger and brighter, far ones recede into the dark.
  float near = s.kind == 2 ? 1. : clamp(cam.dist / z, .45, 2.6);
  float fog = s.kind == 2 ? 1. : clamp(exp(-.3 * (z - cam.dist)), .3, 1.7);
  gl_PointSize = max(1.5 * res, size * res * mix(1., near, soft > .99 ? .4 : .85));
  // Soft gas keeps its total light as sprites grow; stars stay crisp.
  float spread = max(1., gl_PointSize / (1.6 * res));
  spread = mix(spread * spread, spread, soft);
  v_soft = soft;
  if (shellStage > 0. && s.kind == 0) {
    float limb = pow(max(0., 1. - abs(dot(normalize(pos), normalize(cam.eye - pos)))), .6);
    bright *= mix(1., .4 + .95 * limb, shellStage);
    hue = mix(hue, mix(u_secondary, u_primary, limb), .4 * shellStage);
  }
  float galaxy = nbSmooth(0., 1., dev) * (1. - nbSmooth(1., 2., dev));
  if (galaxy > 0.) bright *= mix(1., nbTransmission(pos, cam.eye, key, clock, arms), galaxy);
  hue = mix(hue * .8 + u_secondary * .2, hue, clamp(fog, 0., 1.));
  v_color = hue * bright * fog * light * shown * (1.3 - .35 * level) / spread * ${f(4.2 * 65536 / (SIZE[0] * SIZE[1]))};
}
`;

const particleFragment = `#version 300 es
precision highp float;
in vec3 v_color;
in float v_soft;
out vec4 outColor;
void main() {
  vec2 d = gl_PointCoord * 2. - 1.;
  float r2 = dot(d, d);
  if (r2 > 1.) discard;
  float m = mix(exp(-r2 * 4.), exp(-r2 * 2.2) * (1. - r2), v_soft);
  outColor = vec4(v_color * m, 0.);
}
`;

// Exact periodic lattice data, not a cached or reduced-resolution image.
// Packing the four corners in RGBA replaces four hashes with one data fetch.
const noise = `
float nbGrain(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
vec4 nbCorners(ivec2 cell) {
  vec2 i = vec2(cell & 127);
  return vec4(nbGrain(i), nbGrain(vec2((cell+ivec2(1,0)) & 127)),
    nbGrain(vec2((cell+ivec2(0,1)) & 127)), nbGrain(vec2((cell+1) & 127)));
}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec4 nbLattice(ivec2 i) {
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed, i & 127, 0);
#else
  return nbCorners(i);
#endif
}
float nbNoise(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p); f = f*f*(3.-2.*f);
  vec4 corners = nbLattice(i);
  return mix(mix(corners.x,corners.y,f.x),mix(corners.z,corners.w,f.x),f.y);
}
`;
const radianceData = `
vec4 nbRadianceData(uint clock) {
  uint key = nbKey();
  return vec4(vec2(nbRnd(key,0u,910u),nbRnd(key,0u,911u))*30.,
    1.35*(2.2+.9*nbRnd(key,0u,905u))*u_params[3],
    NB_TAU*nbCycle(clock,${N.pattern}u));
}
`;
// Unresolved gas radiance at full output resolution. A finite tilted cloud
// condenses into a winding disk, then blows out into a hollow shock shell.
const fragment = `
${common}
${camera}
${noise}
${radianceData}
NbCam nbPictureCamera(uint clock, float dev) {
#ifdef PRECOMPUTED
  NbCam c;
  vec4 eye = texelFetch(u_precomputed,ivec2(0,128),0);
  vec4 fwd = texelFetch(u_precomputed,ivec2(1,128),0);
  c.eye = eye.xyz; c.focal = eye.w;
  c.fwd = fwd.xyz; c.dist = fwd.w;
  c.right = texelFetch(u_precomputed,ivec2(2,128),0).xyz;
  c.up = texelFetch(u_precomputed,ivec2(3,128),0).xyz;
  return c;
#else
  return nbCamera(clock,dev);
#endif
}
void main() {
  uint clock = nbClock();
  float dev = clamp(u_params[0], 0., 2.);
  float p = nbSmooth(0., 1., dev), n = nbSmooth(1., 2., dev);
  NbCam cam = nbPictureCamera(clock, dev);
#ifdef PRECOMPUTED
  vec4 data = texelFetch(u_precomputed,ivec2(4,128),0);
  vec2 turn = texelFetch(u_precomputed,ivec2(5,128),0).xy;
#else
  vec4 data = nbRadianceData(clock);
  float cloudPhase = NB_TAU*nbCycle(clock,${N.cloud}u);
  vec2 turn = vec2(cos(cloudPhase),sin(cloudPhase));
#endif
  vec2 seed = data.xy;
  vec2 screen = (v_uv*2.-1.) * u_resolution / min(u_resolution.x, u_resolution.y);
  vec3 ray = normalize(cam.fwd * cam.focal + cam.right * screen.x + cam.up * screen.y);
  vec3 col = u_secondary * .003;
  vec3 centreRay = cam.eye - ray * dot(cam.eye,ray);
  if (dot(centreRay,centreRay) > 9.) { emit(vec4(col,1.)); return; }
  if (n < 1.) {
  // Closest point in the cloud's ellipsoidal metric: continuous thickness,
  // not a face-on screen texture. In Spiral the metric tends to the midplane.
  float thick = mix(.65, .035, p);
  vec3 metric = vec3(1., 1./thick, 1.);
  vec3 er = ray * metric, eo = cam.eye * metric;
  float t = max(0., -dot(er, eo) / dot(er, er));
  vec3 q = cam.eye + ray*t;
  float radius = length(q.xz);
  // Outside this finite cloud the analytic tails are below 0.00002.
  // Keep the shell branch alive in mixed developments.
  if (radius < mix(3.,2.5,p) && abs(q.y) < 3.5*thick) {
  vec2 uv = mat2(turn.x,-turn.y,turn.y,turn.x)*q.xz;
  float a = nbNoise(uv*2.4+seed);
  float b = nbNoise(uv*8.5+seed+a);
  float c = nbNoise(uv*29.+seed+b);
  float d = nbNoise(uv*94.+seed+c);
  float texture = .5*a + .27*b + .15*c + .08*d;
  float edge = exp(-pow(radius / mix(1.65, 1.2, p), 4.)) * exp(-nbSq(q.y / thick));
  float theta = atan(q.z,q.x);
  float phase = theta - radius*data.z - data.w + .7853981634;
  float arm = exp(-nbSq(sin(phase + .14*(b-.5)))/.26);
  float feathers = exp(-nbSq(sin(phase + .24 + .22*(c-.5)))/.04);
  float lane = exp(-nbSq(sin(phase+.32+.15*(b-.5)))/.012);
  float cloud = pow(max(0., texture-.23), 2.) * 5.;
  float disk = (.19 + 1.3*arm + .42*feathers) * (.3 + texture*texture*2.);
  float extinction = exp(-p*lane*(1.1+2.4*c)*nbSmooth(.14,.32,radius));
  float gas = mix(cloud, disk, p) * edge * extinction * (1.+.1*u_rhythm.x*arm);
  gas *= mix(1., .55+.45*nbSmooth(.15,.6,radius),p);
  vec3 gasHue = mix(u_secondary, mix(u_primary,vec3(1.),.25), .12 + .18*texture);
  col += gasHue * gas * mix(.95, 1.9, p) * (1.-n);
  // HII regions are sparse, saturated knots nested in the bright arms.
  vec2 clusterGrid = uv*14.;
  vec4 cluster = nbLattice(ivec2(floor(clusterGrid)));
  vec2 clusterDelta = fract(clusterGrid) - (.35+.3*cluster.xy);
  float clusterR2 = dot(clusterDelta,clusterDelta);
  float knotWidth = .003 + nbSq(14.*cam.dist/(cam.focal*min(u_resolution.x,u_resolution.y)));
  float knots = exp(-clusterR2/knotWidth) + .12*exp(-clusterR2/.025);
  vec2 cellFade = smoothstep(vec2(0.),vec2(.12),min(fract(clusterGrid),1.-fract(clusterGrid)));
  knots *= cellFade.x*cellFade.y*nbSmooth(.78,.96,cluster.w)*arm*nbSmooth(.25,.5,radius);
  col += mix(u_accent,vec3(1.),.35) * knots * edge * p*(1.-n) * 5.;
  col += mix(u_primary,vec3(1.),.6) * pow(d,12.) * arm * edge * p*(1.-n) * 1.4;
  float core = exp(-nbSq(radius/.14)) + .32*exp(-nbSq(radius/.42));
  core *= exp(-nbSq(q.y / mix(.35,.16,p)));
  col += mix(u_primary,vec3(1.),.65) * core * p*(1.-n) * (2.2+.2*u_rhythm.y);
  }
  }
  if (n > 0.) {
  // Analytic near-shell radiance with a bright limb and diffuse ionised
  // cavity. The particle tracers supply the back-side depth cues.
  float along = -dot(cam.eye,ray);
  vec3 closest = cam.eye + ray*along;
  float impact = length(closest);
  if (impact < NB_SHELL * mix(.25,1.,n) * 1.16) {
  float angle = atan(dot(closest,cam.up),dot(closest,cam.right));
  float R = NB_SHELL * mix(.25,1.,n) * (1.+.055*sin(5.*angle)+.028*cos(11.*angle));
  float chord = sqrt(max(0.,R*R-impact*impact));
  vec3 shell = cam.eye + ray*(along-chord);
  vec2 sh = shell.xz + vec2(shell.y*.61, shell.y*.37);
  float s0 = nbNoise(sh*3.2+seed);
  float s1 = nbNoise(sh*14.+seed+s0);
  float s2 = nbNoise(sh*52.+seed+s1);
  float s3 = nbNoise(sh*137.+seed+s2);
  float fil = exp(-nbSq((s1+.3*s2+.1*s3-.68)/(.025+.1*s2)));
  float cover = 1.-nbSmooth(R*.9,R*1.06,impact);
  float limb = exp(-nbSq((impact-R*(.81+.13*s0))/(R*.16+.001)));
  float shock = exp(-nbSq((impact - 2.35*pow(nbCycle(clock,${N.shock}u),.4))/.045));
  vec3 litGas = mix(u_secondary, mix(u_primary,vec3(1.),.5), .16+.25*limb);
  float cloud = .3 + .7*nbSmooth(.12,.75,s0);
  col += litGas * cover*n * (.19*cloud + .85*fil*(.2+.8*limb)*cloud + .9*limb*cloud*(.4+.9*s1)) * (.45+.45*s2+.1*s3);
  col += mix(u_accent,vec3(1.),.15)*cover*n*fil*pow(s0,8.)*.8;
  col += mix(u_secondary,vec3(1.),.5)*shock*cover*n*u_params[7]*.08*(.15+.85*s1)
    * (1.-nbCycle(clock,${N.shock}u));
  float d2 = dot(closest,closest);
  float ignite = exp(-nbSq((dev-1.3)/.12));
  col += mix(u_primary,vec3(1.),.7)*exp(-d2/.004)*n*(.8+ignite);
  }
  }
  col *= u_params[4];
  emit(vec4(col,1.));
}
`;

const schema = [
  {
    key: "development",
    label: "Development · dust / spiral / nova",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  { key: "speed", label: "Motion speed", min: 0, max: 2, step: 0.01, default: 1 },
  { key: "web", label: "Cosmic web", min: 0.6, max: 2.6, step: 0.01, default: 1.8 },
  { key: "arms", label: "Arm winding", min: 0.5, max: 1.6, step: 0.01, default: 1 },
  { key: "light", label: "Starlight", min: 0.3, max: 1.6, step: 0.01, default: 1 },
  { key: "distance", label: "Camera distance", min: 0.7, max: 1.4, step: 0.01, default: 1 },
  { key: "height", label: "Camera height", min: 0, max: 1, step: 0.01, default: 0.66 },
  { key: "shock", label: "Shock fronts", min: 0, max: 1.6, step: 0.01, default: 1 },
];

const look = (name, seed, development, overrides = {}) => ({
  name,
  seed,
  params: {
    development,
    speed: 1,
    web: 1.8,
    arms: 1,
    light: 1,
    distance: 1,
    height: 0.66,
    shock: 1,
    ...overrides,
  },
});

export default {
  id: "nebula",
  number: 87,
  name: "Density Waves",
  description:
    "One population of stars condenses from a Zel'dovich cosmic web into a density-wave spiral galaxy, then collapses and ignites into a filamentary supernova shell crossed by Sedov–Taylor shock fronts.",
  development: "development",
  schema,
  presets: [
    look("Drifting Dust", 3141, 0),
    look("Grand Spiral", 3141, 1),
    look("Supernova Shell", 3141, 2),
    look("Cosmic Web", 1618, 0, { web: 2.4, distance: 0.92, height: 0.3 }),
    look("Edge-on Lanes", 2718, 1, { height: 0.08, distance: 1.06, arms: 1.25 }),
    look("Open Whirlpool", 577, 1, { height: 0.92, arms: 0.85, distance: 1.02 }),
    look("Remnant Bloom", 4669, 2, { distance: 1.02, height: 0.35, shock: 1.3 }),
  ],
  stage: ["speed", "web", "shock"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { speed: { mul: [0.6, 1.5] }, web: { mul: [0.85, 1.15] }, shock: { mul: [0.6, 1.3] } },
  beat: { punch: 0.06, pulse: 0.1 },
  audio: [
    { param: "web", feature: "low", amount: 0.04 },
    { param: "shock", feature: "onset", amount: 0.08 },
    { param: "light", feature: "high", amount: 0.02 },
  ],
  rhythm: [
    familyEffect(
      "arm-light",
      0,
      "Arm light",
      "Young stars on the arm crests and the web's brightest knots flare.",
      { period: 4, strength: 0.6, duration: 1 },
    ),
    familyEffect(
      "core-flare",
      1,
      "Core flare",
      "The bulge or the compact remnant flares in the accent.",
      { period: 8, strength: 0.6, duration: 1 },
    ),
    familyEffect(
      "shock-ripple",
      2,
      "Shock ripple",
      "A bright shell of light runs outward through the same stars.",
      { period: 16, strength: 0.7, duration: 2 },
    ),
  ],
  fragment,
  precompute: {
    size: [128, 129],
    fragment: `${common}
${camera}
${noise}
${radianceData}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  if (cell.y < 128) { outColor = nbCorners(cell); return; }
  uint clock = nbClock();
  NbCam c = nbCamera(clock,clamp(u_params[0],0.,2.));
  if (cell.x == 0) outColor = vec4(c.eye,c.focal);
  else if (cell.x == 1) outColor = vec4(c.fwd,c.dist);
  else if (cell.x == 2) outColor = vec4(c.right,0.);
  else if (cell.x == 3) outColor = vec4(c.up,0.);
  else if (cell.x == 4) outColor = nbRadianceData(clock);
  else {
    float phase = NB_TAU*nbCycle(clock,${N.cloud}u);
    outColor = vec4(cos(phase),sin(phase),0.,0.);
  }
}`,
  },
  simulation: { fragment: simulation, size: SIZE, steps: 1 },
  particles: { vertex, fragment: particleFragment },
};
