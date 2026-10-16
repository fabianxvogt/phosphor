import { familyEffect } from "./family-rhythm.mjs";
import {
  CLOCK_PERIOD,
  CAMERA,
  CLOUD,
  FOLLOW,
  MODES,
  MODULATION,
  N,
  ORBIT_CORE,
  ORBIT_V,
  RELAX,
  RMAX,
  SHELL,
  SIZE,
  ABSORBERS,
  WEB_BOX,
  WEB_GRID,
  OCTA,
  DISK_MAP,
  DISK_EXTENT,
} from "./nebula-model.mjs";
export { SIZE };

// Density Waves (#87): one fixed 512×256 population traces a Zel'dovich
// cosmic web (Dust), a density-wave spiral galaxy (Spiral) and a filamentary
// supernova remnant with Sedov–Taylor shock fronts (Nova). The unresolved
// gas is a bounded volumetric raymarch (emission + absorption) over a
// per-frame Zel'dovich data atlas and periodic 3D noise; the particles are
// the resolved stars, tracers and near-field motes.
// nebula-model.mjs is the CPU reference; keep both in step.
//
// State texture (RGBA8, 512×256): texel 0 is a 32-bit clock (fraction of
// CLOCK_PERIOD, integrated at the motion speed); texels 1 and 2 hold the
// camera development spring (position, velocity); every other texel holds
// the star's extra azimuth ψ as a 32-bit turn fraction. Global cycles use
// integer counts per period, so uint wrap keeps them exact for a whole night.

const f = (x) => (Number.isInteger(x) ? `${x}.` : `${x}`);
const v3 = (a) => `vec3(${a.map(f).join(", ")})`;
const SLICES = [8 * (WEB_GRID[0] + 2), (WEB_GRID[1] / 8) * (WEB_GRID[2] + 2)];
// Atlas: web slices | disk map to their right; the remnant direction map
// reuses the slice region while the web is not shown.
const ATLAS = [SLICES[0] + DISK_MAP, Math.max(SLICES[1], DISK_MAP, OCTA)];
const common = `
const float NB_TAU = 6.283185307179586;
const float NB_PI = 3.141592653589793;
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
// Camera development: a spring-smoothed copy of development (texel 1).
float nbCamDev() { return float(nbWord(texelFetch(u_state, ivec2(1, 0), 0))) * (2. / 4294967296.); }
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
// Zel'dovich potential modes (seeded). Phases are π: every mode crests at
// the origin, so the seed's densest web node is the galaxy nucleus and the
// pulsar. Amplitudes breathe slowly; the node never moves.
void nbModeEval(uint key, uint m, uint clock, out vec3 k, out float amp) {
  float z = nbRnd(key, m, 900u) * 2. - 1., az = NB_TAU * nbRnd(key, m, 901u), r = sqrt(1. - z * z);
  k = normalize(vec3(r * cos(az), z * .85, r * sin(az))) * (5. + 5. * nbRnd(key, m, 902u));
  amp = (.22 + .2 * nbRnd(key, m, 903u))
    * (1. + ${f(MODULATION)} * sin(NB_TAU * nbCycle(clock, ${N.breathe}u + 3u * m) + NB_TAU * nbRnd(key, m, 904u)));
}
// The simulation writes the mode table (k, amp) once per tick into spare
// texels of the last state row (x = 8m+1..4); readers fetch exact floats.
void nbMode(uint key, uint m, uint clock, out vec3 k, out float amp) {
  int x = int(m) * 8;
  k = vec3(uintBitsToFloat(nbWord(texelFetch(u_state, ivec2(x + 1, ${SIZE[1] - 1}), 0))),
    uintBitsToFloat(nbWord(texelFetch(u_state, ivec2(x + 2, ${SIZE[1] - 1}), 0))),
    uintBitsToFloat(nbWord(texelFetch(u_state, ivec2(x + 3, ${SIZE[1] - 1}), 0))));
  amp = uintBitsToFloat(nbWord(texelFetch(u_state, ivec2(x + 4, ${SIZE[1] - 1}), 0)));
}
// Zel'dovich: xyz = −∇Φ, w = normalised Σ amp·cos; hess = ∂S/∂q.
vec4 nbWeb(uint key, vec3 q, uint clock, out mat3 hess) {
  vec3 s = vec3(0.); float fsum = 0., total = 0.;
  hess = mat3(0.);
  for (int m = 0; m < ${MODES}; m++) {
    vec3 k; float amp;
    nbMode(key, uint(m), clock, k, amp);
    float kk = max(dot(k, k), 1e-3), arg = dot(k, q) + NB_PI;
    s += amp / kk * sin(arg) * k;
    hess += outerProduct(k, k) * (amp / kk * cos(arg));
    fsum += amp * cos(arg);
    total += amp;
  }
  return vec4(s, 2. * fsum / total);
}
`;

// Camera shared by the volume and the particles (CPU: cameraFraming).
const camera = `
struct NbCam { vec3 eye, right, up, fwd; float focal, dist; };
NbCam nbCamera(uint clock, float d) {
  NbCam c;
  uint key = nbKey();
  float p = nbSmooth(0., 1., d), n = nbSmooth(1., 2., d);
  vec3 w = vec3(1. - p, p * (1. - n), n);
  float height = clamp(u_params[6], 0., 1.);
  float crane = sin(NB_TAU * (nbCycle(clock, ${N.crane}u) + nbRnd(key, 0u, 908u)));
  float craneAmp = dot(w, ${v3(CAMERA.crane)}) * nbSmooth(0., .5, height);
  float el = clamp(dot(w, ${v3(CAMERA.elevation)}) + ${f(CAMERA.heightGain)} * (height - .66) + craneAmp * crane
    + ${f(CAMERA.lift)} * sin(NB_TAU * nbCycle(clock, ${N.lift}u)), -.05, 1.35);
  float yaw = NB_TAU * (nbCycle(clock, ${N.yaw}u) + nbRnd(key, 0u, 907u));
  // Never closer than 2.0: outside the disk and the web's dense core.
  c.dist = max(2., u_params[5] * dot(w, ${v3(CAMERA.distance)}) * (1. + ${f(CAMERA.craneDolly)} * w.y * crane * nbSmooth(0., .5, height))
    * (1. + .03 * sin(NB_TAU * nbCycle(clock, ${N.dolly}u))));
  c.eye = c.dist * vec3(cos(el) * sin(yaw), sin(el), cos(el) * cos(yaw));
  vec3 r0 = normalize(cross(-c.eye, vec3(0., 1., 0.)));
  float fr = NB_TAU * (nbCycle(clock, ${N.frame}u) + nbRnd(key, 0u, 909u));
  vec3 target = dot(w, ${v3(CAMERA.offset)}) * (r0 * sin(fr) + vec3(0., .3 * cos(fr), 0.)) - vec3(0., .04, 0.);
  c.fwd = normalize(target - c.eye);
  c.right = normalize(cross(c.fwd, vec3(0., 1., 0.)));
  c.up = cross(c.right, c.fwd);
  c.focal = ${f(CAMERA.focal)} * (1. + .02 * clamp(u_kick, 0., 1.));
  return c;
}
`;

// Disk dust lanes on the concave side of the arms (shared with particles).
const lanes = `
float nbArmPhase(vec2 xz, float twist, float pattern) {
  return atan(xz.y, xz.x) - length(xz) * twist - pattern + .7853981634;
}
// Normalised sech² column of a disk of scale height h on a finite segment.
float nbColumn(vec3 a, vec3 b, float h) {
  vec3 ray = b - a;
  float dy = ray.y;
  if (abs(dy) < .0001) { float t = tanh(1.20276058 * a.y / h); return length(ray) * .60138029 / h * (1. - t * t); }
  return .5 * length(ray) / abs(dy) * abs(tanh(1.20276058 * b.y / h) - tanh(1.20276058 * a.y / h));
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
  } else if (cell == ivec2(1, 0) || cell == ivec2(2, 0)) {
    // Camera development spring (real time, independent of motion speed).
    float target = clamp(u_params[0], 0., 2.);
    float d = float(nbWord(texelFetch(u_state, ivec2(1, 0), 0))) * (2. / 4294967296.);
    float vel = float(int(nbWord(texelFetch(u_state, ivec2(2, 0), 0)))) / 268435456.;
    if (u_reset) { d = target; vel = 0.; }
    else {
      float acc = ${f(FOLLOW.omega * FOLLOW.omega)} * (target - d) - ${f(2 * FOLLOW.omega)} * vel;
      vel = clamp(vel + acc * u_dt, -${f(FOLLOW.vmax)}, ${f(FOLLOW.vmax)});
      d = clamp(d + vel * u_dt, 0., 2.);
    }
    v = cell.x == 1 ? uint(min(d * 2147483648., 4294967040.)) : uint(int(round(vel * 268435456.)));
  } else if (cell.y == ${SIZE[1] - 1} && cell.x < ${MODES * 8} && (cell.x & 7) >= 1 && (cell.x & 7) <= 4) {
    // Mode table for this tick (exact float bits).
    vec3 k; float amp;
    nbModeEval(nbKey(), uint(cell.x >> 3), nbClock(), k, amp);
    int c = (cell.x & 7) - 1;
    v = floatBitsToUint(c == 0 ? k.x : c == 1 ? k.y : c == 2 ? k.z : amp);
  } else {
    uint id = uint(cell.y * textureSize(u_state, 0).x + cell.x);
    // Only the tracer cohort (a fixed quarter) consumes ψ. Sky stars and
    // near-field motes never consume it.
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
${lanes}
out float v_soft;
float nbTransmission(vec3 start, vec3 eye, float twist, float pattern) {
  vec3 ray = eye - start;
  float t = abs(ray.y) > .0001 ? clamp(-start.y / ray.y, 0., 1.) : 0.;
  vec3 q = start + ray * t;
  float r = length(q.xz);
  float w = nbArmPhase(q.xz, twist, pattern) - .28;
  float ragged = .65 + .35 * sin(21.*q.x + 13.*q.z) * sin(17.*q.z - 8.*q.x);
  float lane = exp(-nbSq(sin(w)) / .03) * ragged * nbSmooth(.12, .32, r) * (1. - nbSmooth(1.2, 1.75, r));
  return exp(-2.2 * lane * exp(-r / .52) * 2.6 * min(nbColumn(start, eye, .022 + .018 * r), 3.));
}
vec3 nbRotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z); }
void main() {
  gl_Position = vec4(2., 2., 2., 1.);
  gl_PointSize = 1.;
  v_color = vec3(0.);
  v_soft = 0.;
  uint id = uint(gl_VertexID);
  if (id == 0u) return;
  uint key = nbKey(), clock = nbClock();
  float dev = clamp(u_params[0], 0., 2.);
  float growth = u_params[2], arms = u_params[3], light = u_params[4], shock = u_params[7];
  float level = clamp(u_level, 0., 1.);
  float p0 = nbSmooth(0., 1., dev), n0 = nbSmooth(1., 2., dev);
  vec3 cGas = u_primary, cArm = u_secondary, cHot = mix(u_primary, vec3(1.), .7), cAcc = u_accent;
  NbCam cam = nbCamera(clock, nbCamDev());
  float twist = 1.35 * (2.2 + .9 * nbRnd(key, 0u, 905u)) * arms;
  float pattern = NB_TAU * nbCycle(clock, ${N.pattern}u);
  float minSide = min(u_resolution.x, u_resolution.y), res = minSide / 1080.;
  if (id >= ${ABSORBERS}u) {
    // Near-field motes: wisps and stars around the camera's orbit give
    // parallax against the distant form. Eight points form one wisp.
    uint m = id - ${ABSORBERS}u;
    if ((m & 7u) != 0u) return;
    uint g = m >> 6;
    float member = float((m >> 3) & 7u) / 7. - .5;
    // A shell of motes between the camera's orbit and the form.
    float gz = nbRnd(key, g, 952u) * 1.6 - .8, ga = NB_TAU * nbRnd(key, g, 950u) + NB_TAU * nbCycle(clock, ${N.cloud}u);
    float gr = 1.9 + 1.4 * nbRnd(key, g, 951u);
    vec3 centre = gr * vec3(sqrt(1. - gz * gz) * cos(ga), gz, sqrt(1. - gz * gz) * sin(ga));
    vec3 along = normalize(vec3(nbRnd(key, g, 953u) - .5, .4 * (nbRnd(key, g, 954u) - .5), nbRnd(key, g, 955u) - .5));
    bool star = nbRnd(key, g, 956u) > .78;
    float bend = sin(member * 4. + 6. * nbRnd(key, g, 957u));
    vec3 scatter = vec3(nbRnd(key, m, 961u), nbRnd(key, m, 962u), nbRnd(key, m, 963u)) - .5;
    vec3 pos = star ? centre + .35 * scatter : centre + along * member * .5 + .06 * bend * vec3(along.z, .5, -along.x);
    vec3 v = pos - cam.eye;
    float z = dot(v, cam.fwd);
    if (z < .2) return;
    vec2 screen = vec2(dot(v, cam.right), dot(v, cam.up)) * cam.focal / z;
    gl_Position = vec4(screen * minSide / u_resolution, 0., 1.);
    // Depth of field: near motes defocus into larger, dimmer discs.
    float px = (star ? .006 : .2) * cam.focal / z * minSide * .5;
    float blur = star ? 1. + 9. * nbSmooth(1.4, .5, z) : 1. + 1.2 * nbSmooth(1.4, .4, z);
    float size = clamp(px * blur, 1.5 * res, 150. * res);
    gl_PointSize = size;
    // Only the near field: far motes would clutter the form.
    float near = nbSmooth(.2, .55, z) * nbSmooth(star ? 2.6 : 3.2, star ? 1.3 : 1.7, z) * (1. - nbSmooth(150., 170., px * blur / res));
    float keep = nbSmooth(.1, .5, level + .35 * nbRnd(key, g, 958u));
    vec3 hue = star ? cHot : mix(cGas, cArm, .35 + .3 * nbRnd(key, g, 959u));
    float bright = star ? 1.2 + 3. * nbRnd(key, g, 960u) : .35;
    v_soft = star ? .5 : 1.;
    float area = nbSq(max(1., size / (2. * res)));
    v_color = hue * bright * near * keep * light * (star ? 1. : 1. + .3 * level) / (star ? max(1., area * .12) : area * .006 + 1.);
    return;
  }
  NbStar s = nbStar(key, id);
  if (s.kind != 2 && (id & 3u) != 0u) return;
  // Energy draws more of the tracer cohort: 1/16, then 1/8, then 1/4.
  uint c16 = id & 15u;
  float cohort = c16 == 0u ? -1. : c16 == 8u ? .4 : .7;
  float shown = s.kind == 2 ? 1. : nbSmooth(cohort - .12, cohort + .03, level);
  if (shown <= 0.) return;
  float psi = float(int(nbWord(particle()))) * (NB_TAU / 4294967296.);
  vec2 pr = nbProgress(dev, s.rank);
  float p = pr.x, n = pr.y;
  float cloud = NB_TAU * nbCycle(clock, ${N.cloud}u);
  float lambda = s.ang0 + cloud + psi;
  vec3 pos;
  float crest = 0., compress = 1.;
  vec3 hue = cHot;
  float bright = 0., size = 1.6, soft = 0., shellStage = 0., flowLight = 1.;
  if (s.kind == 2) {
    // Distant stars: parallax and scale against the near form.
    pos = s.shellDir * mix(7., 16., s.layer);
    bright = 1.4 + 4. * pow(s.tone, 14.);
    hue = mix(vec3(1.), mix(cArm, cHot, .5), .25 * s.tone);
    size = 2.4 + 5. * pow(s.tone, 26.);
  } else {
    float rhoG, epsG = 0., yG;
    if (s.kind == 1) {
      rhoG = s.a * sqrt(1. - s.cz * s.cz);
      yG = s.a * s.cz * .72;
    } else {
      // Density wave: an ellipse whose orientation turns with radius.
      float ell = 1. - .32 * nbSmooth(.08, .55, s.a);
      // Each orbit's orientation scatters a little: broad, clumpy arms.
      float beta = s.a * twist + pattern + 1.1 * (s.tone - .5) * s.layer;
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
      // Zel'dovich: x = q + D·S(q); caustics gather the cosmic web. Each
      // tracer streams along S into the node over its own cycle and is dark
      // where the cycle wraps.
      mat3 hess;
      vec3 S = nbWeb(key, s.q, clock, hess).xyz;
      float det = abs(determinant(mat3(1.) + growth * hess));
      compress = clamp(1. / max(det, .05), .25, 7.);
      float tau = fract(nbCycle(clock, ${N.stream}u) + s.tone);
      flowLight = mix(1., sin(NB_PI * tau), 1. - p);
      float wob = NB_TAU * nbCycle(clock, ${N.wobble}u) + NB_TAU * s.tone;
      vec3 jitter = .03 * (.4 + .9 * level) * vec3(sin(wob + s.q.y * 3.), sin(wob * 1. + 1.7 + s.q.x * 2.), cos(wob + s.q.z * 2.));
      pos += nbRotY(S * growth * (1. + .7 * (tau - .5)) + jitter, cloud + psi) * (1. - p);
    }
    // Dust: tracers glow faintly; the web's caustics brighten by crowding.
    vec3 gas = mix(cGas, cHot, clamp(.1 + .2 * s.tone + .12 * compress, 0., 1.));
    float dustB = .004 * pow(compress, 1.2) + 1.4 * pow(s.tone, 50.);
    float dustSize = 1.8 + 1.6 * s.layer;
    // Spiral: crest stars young (secondary → white), inter-arm stars old.
    vec3 young = mix(cArm, vec3(1.), .35), old = mix(cGas, cArm, .25);
    vec3 starHue = s.kind == 1 ? cHot : mix(old, young, crest);
    float starB = s.kind == 1 ? .06 : (.12 + 1.2 * crest) * (.05 + 3. * pow(s.tone, 18.));
    if (s.kind == 0 && s.tone > .994 && crest > .55) { starHue = cAcc; starB = 1.1; }
    hue = mix(gas, starHue, p);
    bright = mix(dustB, starB, p);
    size = mix(dustSize, s.kind == 1 ? 1.7 : 1.5 + .9 * crest, p);
    soft = 1. - p;
    if (n > 0.) {
      // Nova: collapse, then ride out on the filamented shell.
      float len = max(length(pos), 1e-4);
      vec3 dir = s.shellDir + .8 * (pos / len) * vec3(1., .3, 1.);
      vec3 nd0 = normalize(dir);
      vec3 shell;
      float front = 0., shellCompress = 1., jet = -1.;
      if (s.kind == 1) {
        if (s.layer > .72) {
          // Pulsar jets: bulge stars stream out along a precessing axis.
          float ph = NB_TAU * nbCycle(clock, ${N.lift}u);
          vec3 axis = normalize(vec3(.45 * sin(ph), 1., .45 * cos(ph)));
          jet = fract((s.layer - .72) / .28 + nbCycle(clock, ${N.jet}u));
          vec3 side = nd0 - dot(nd0, axis) * axis;
          shell = axis * (s.tone < .5 ? -1. : 1.) * (.05 + 1.6 * jet * jet) + side * .035 * jet;
        } else shell = nd0 * (.015 + .05 * s.layer * s.layer);
      } else {
        mat3 shellHess;
        vec4 web = nbWeb(key, nd0 * 2., clock, shellHess);
        shellCompress = clamp(1. / max(abs(determinant(mat3(1.) + .7 * growth * shellHess)), .06), .3, 6.);
        vec3 t = nd0 + .35 * growth * (web.xyz - dot(web.xyz, nd0) * nd0);
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
      vec3 rim = mix(cHot, cArm, .25), ejecta = mix(cArm, cGas, .3);
      vec3 novaHue = s.kind == 1 ? cHot : (s.layer < .6 ? rim : ejecta);
      float novaB = s.kind == 1 ? .02 : (s.layer < .6 ? .02 + .014 * shellCompress * shellCompress : .012);
      novaHue = mix(novaHue, cAcc, .6 * clamp(front, 0., 1.));
      novaB += 1.1 * front;
      if (jet >= 0.) {
        novaHue = mix(mix(cAcc, vec3(1.), .5), cArm, jet);
        novaB = .2 * pow(1. - jet, 1.5) * nbSmooth(0., .06, jet);
      }
      hue = mix(hue, novaHue, s2);
      bright = mix(bright, novaB, s2);
      size = mix(size, 1.6 + .7 * front, s2);
      soft *= 1. - s2;
    }
    // Rhythm: arm/filament accent, core flare, outward ripple.
    float r3 = length(pos);
    float pulse = exp(-nbSq((r3 - mix(.15, 1.8, 1. - u_rhythm.x)) / .18));
    bright += u_rhythm.x * .12 * pulse * (p * crest + (1. - p) * .5 + n * float(s.layer < .6));
    if (s.kind == 1) { bright *= 1. + 1.5 * u_rhythm.y; hue = mix(hue, cAcc, .5 * u_rhythm.y); }
    bright += u_rhythm.z * .15 * exp(-nbSq((r3 - 2.6 * (1. - u_rhythm.z)) / .14));
    bright *= flowLight;
  }
  vec3 v = pos - cam.eye;
  float z = dot(v, cam.fwd);
  if (z < .25) return;
  vec2 screen = vec2(dot(v, cam.right), dot(v, cam.up)) * cam.focal / z;
  gl_Position = vec4(screen * minSide / u_resolution, 0., 1.);
  // Depth: near stars larger and brighter, far ones recede into the dark.
  float near = s.kind == 2 ? 1. : clamp(cam.dist / z, .45, 2.6);
  float fog = s.kind == 2 ? 1. : clamp(exp(-.3 * (z - cam.dist)), .3, 1.7);
  gl_PointSize = max(1.5 * res, size * res * mix(1., near, .85));
  float spread = max(1., gl_PointSize / (1.6 * res));
  spread = mix(spread * spread, spread, soft);
  v_soft = soft;
  if (shellStage > 0. && s.kind == 0) {
    float limb = pow(max(0., 1. - abs(dot(normalize(pos), normalize(cam.eye - pos)))), .6);
    bright *= mix(1., .4 + .95 * limb, shellStage);
  }
  float galaxy = p0 * (1. - n0);
  if (galaxy > 0. && s.kind != 2) bright *= mix(1., nbTransmission(pos, cam.eye, twist, pattern), galaxy);
  // Never through the bright bulge or hot core: dim stars whose sight line
  // passes close behind the centre.
  vec3 toEye = cam.eye - pos;
  float L = length(toEye);
  vec3 de = toEye / L;
  float tc = clamp(-dot(pos, de), 0., L);
  vec3 cp = pos + de * tc;
  float sb = .26 * mix(1., .3, nbSmooth(0., .35, n0));
  float veil = exp(-dot(cp, cp) / (sb * sb * 1.6)) * nbSmooth(.03, .25, tc) * p0 * (1. - .6 * n0);
  if (s.kind != 1) bright *= 1. - .97 * veil;
  hue = mix(hue * .8 + cArm * .2, hue, clamp(fog, 0., 1.));
  float cohortGain = s.kind == 2 ? 1. : mix(1.5, .8, level);
  v_color = hue * bright * fog * light * shown * cohortGain / spread * ${f((4.2 * 65536) / (SIZE[0] * SIZE[1]))};
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

// Periodic value noise and the Zel'dovich web field. Used by the per-frame
// data atlas and, without float targets, directly by the fallback path.
const fields = `
// A fixed oblique rotation hides the value-noise lattice axes.
const mat3 nbRot = mat3(.788, .462, -.408, -.364, .884, .292, .496, -.068, .866);
// Periodic gradient (Perlin) noise in [0, 1]: no lattice-aligned boxes.
vec3 nbGrad(ivec3 c, ivec3 period, uint salt) {
  c = (c + period * 4096) % period;
  uint h = nbHash(uint(c.x) * 73856093u ^ uint(c.y) * 19349663u ^ uint(c.z) * 83492791u ^ salt);
  // One of the twelve cube-edge directions: no trigonometry.
  float u = (h & 1u) == 0u ? 1. : -1., v = (h & 2u) == 0u ? 1. : -1.;
  uint k = (h >> 2) % 3u;
  return k == 0u ? vec3(u, v, 0.) : k == 1u ? vec3(u, 0., v) : vec3(0., u, v);
}
float nbCorner(ivec3 i, vec3 f, ivec3 o, ivec3 period, uint salt) {
  return dot(nbGrad(i + o, period, salt), f - vec3(o));
}
float nbGNoise(vec3 p, ivec3 period, uint salt) {
  ivec3 i = ivec3(floor(p));
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  float a = mix(nbCorner(i, f, ivec3(0, 0, 0), period, salt), nbCorner(i, f, ivec3(1, 0, 0), period, salt), u.x);
  float b = mix(nbCorner(i, f, ivec3(0, 1, 0), period, salt), nbCorner(i, f, ivec3(1, 1, 0), period, salt), u.x);
  float c = mix(nbCorner(i, f, ivec3(0, 0, 1), period, salt), nbCorner(i, f, ivec3(1, 0, 1), period, salt), u.x);
  float d = mix(nbCorner(i, f, ivec3(0, 1, 1), period, salt), nbCorner(i, f, ivec3(1, 1, 1), period, salt), u.x);
  return clamp(.5 + .5 * mix(mix(a, b, u.y), mix(c, d, u.y), u.z), 0., 1.);
}
// Eigenvalues of a symmetric 3×3 matrix (trigonometric method).
vec3 nbEigen(mat3 m) {
  float p1 = nbSq(m[0][1]) + nbSq(m[0][2]) + nbSq(m[1][2]);
  float q = (m[0][0] + m[1][1] + m[2][2]) / 3.;
  float p2 = nbSq(m[0][0] - q) + nbSq(m[1][1] - q) + nbSq(m[2][2] - q) + 2. * p1;
  float p = sqrt(p2 / 6.);
  if (p < 1e-6) return vec3(q);
  float r = clamp(determinant((m - q * mat3(1.)) / p) * .5, -1., 1.);
  float phi = acos(r) / 3.;
  float e1 = q + 2. * p * cos(phi), e3 = q + 2. * p * cos(phi + 2.0943951);
  return vec3(e1, 3. * q - e1 - e3, e3);
}
// Cloud-frame web: one fixed-point inversion q = x − D·S(x) of the map
// x = q + D·S(q), deformation eigenvalues there, linear-overdensity node.
// y = streaming fibres: two-phase flow noise advected along S.
vec2 nbWebField(vec3 x, uint clock, float growth) {
  // Read the mode table once; both passes reuse it.
  vec3 ks[${MODES}]; float as[${MODES}];
  for (int m = 0; m < ${MODES}; m++) nbMode(nbKey(), uint(m), clock, ks[m], as[m]);
  vec3 S0 = vec3(0.);
  for (int m = 0; m < ${MODES}; m++) S0 += as[m] / max(dot(ks[m], ks[m]), 1e-3) * sin(dot(ks[m], x) + NB_PI) * ks[m];
  vec3 q = x - growth * S0;
  vec4 web = vec4(0.); mat3 h = mat3(0.); float total = 0.;
  for (int m = 0; m < ${MODES}; m++) {
    float kk = max(dot(ks[m], ks[m]), 1e-3), arg = dot(ks[m], q) + NB_PI;
    web.xyz += as[m] / kk * sin(arg) * ks[m];
    h += outerProduct(ks[m], ks[m]) * (as[m] / kk * cos(arg));
    web.w += as[m] * cos(arg);
    total += as[m];
  }
  web.w *= 2. / total;
  // Eigenvalues of the deformation I + D·∂S/∂q: one near zero is a sheet
  // (pancake), two a filament, three a node. Filaments carry the light.
  vec3 ev = abs(nbEigen(mat3(1.) + growth * h));
  vec3 a = vec3(min(min(ev.x, ev.y), ev.z), 0., max(max(ev.x, ev.y), ev.z));
  a.y = ev.x + ev.y + ev.z - a.x - a.z;
  float sheet = min(1. / max(a.x, .09), 11.);
  float filament = max(1. / max(a.y, .2) - .85, 0.);
  float node = max(0., -.5 * web.w);
  float env = exp(-pow(length(x.xz) / 1.8, 4.)) * exp(-nbSq(x.y / .8));
  float rho = ((.1 * max(sheet - 1.5, 0.) + .5 * sheet * filament) * (1. - .9 * nbSmooth(.2, .6, node)) + 3. * pow(node, 6.)) * env;
  // Voids carry no light: skip their fibres (the volume weights by rho).
  if (rho < .02) return vec2(rho, .5);
  vec3 dir = web.xyz / max(length(web.xyz), 1e-5);
  vec3 c = nbRot * x * 3.2;
  c -= .55 * dot(c, dir) * dir;
  float t1 = nbCycle(clock, ${N.flow}u), t2 = fract(t1 + .5);
  float f1 = nbGNoise(c - dir * 1.6 * t1 + 17.3, ivec3(4096), 0x2f6au);
  float f2 = nbGNoise(c - dir * 1.6 * t2 + 41.9, ivec3(4096), 0x2f6au);
  float w1 = 1. - abs(2. * t1 - 1.);
  return vec2(rho, f1 * w1 + f2 * (1. - w1));
}
`;

// Remnant filaments on the sphere of directions: x = finger strength,
// y = second ridge (hot filament cores).
const shellData = `
// x = finger strength, y = second ridge (hot cores), z = broad patchiness,
// w = smooth breathing corrugation of the shell radius.
vec4 nbShellData(vec3 dn, float level, uint clock) {
  float a = nbGNoise(dn * 1.6 + 3.1, ivec3(14, 7, 14), 0x51a7u);
  float a2 = nbGNoise(dn * 3.2 + 6.2, ivec3(28, 14, 28), 0x9c3bu);
  float s1 = nbGNoise(dn * 3.1 + 7.7 + .25 * (a - .5), ivec3(14, 7, 14), 0x51a7u);
  vec3 c2 = nbRot * dn * 7.3 + 2.3;
  float s2x = nbGNoise(c2, ivec3(14, 7, 14), 0x51a7u), s2y = nbGNoise(c2 * 2., ivec3(28, 14, 28), 0x9c3bu);
  float ridge = 1. - abs(2. * s1 - 1.), ridge2 = 1. - abs(2. * s2x - 1.);
  float holes = nbSmooth(.35, .65, a + .3 * (s2y - .5));
  float bA = NB_TAU * nbCycle(clock, ${N.breathe}u), bB = NB_TAU * nbCycle(clock, ${N.breathe + 7}u);
  float lift = .032 * sin(dot(dn, vec3(3.1, 1.7, -2.3)) + bA) + .025 * sin(dot(dn, vec3(-3.2, 4.9, 2.2)) + bB)
    + .02 * sin(dot(dn, vec3(5.1, -6., 6.4)) - bA);
  return vec4(pow(ridge, mix(24., 13., level)) * (.3 + 1.1 * ridge2 * ridge2 * ridge2) * holes, ridge2, a2, lift);
}
vec3 nbOctaDecode(vec2 uv) {
  vec2 p = uv * 2. - 1.;
  vec3 d = vec3(p.x, 1. - abs(p.x) - abs(p.y), p.y);
  if (d.y < 0.) d.xz = (1. - abs(d.zx)) * vec2(d.x >= 0. ? 1. : -1., d.z >= 0. ? 1. : -1.);
  return normalize(d);
}
// Disk map at a world point of the plane: x = arm crest, y = clumpy arm
// light, z = lane optical depth, w = HII knots. Arms follow the pattern;
// their texture rides with the gas.
vec4 nbDiskData(vec2 xz, float twist, float pattern, float gasPhase, float level) {
  float rd = length(xz);
  vec2 g = mat2(cos(gasPhase), -sin(gasPhase), sin(gasPhase), cos(gasPhase)) * xz;
  float nzx = nbGNoise(vec3(g.x * 2.4 + 9.7, 9.7, g.y * 2.4 + 9.7), ivec3(14, 7, 14), 0x51a7u);
  float nzy = nbGNoise(vec3(g.x * 4.8 + 3.1, 3.1, g.y * 4.8 + 3.1), ivec3(28, 14, 28), 0x9c3bu);
  vec3 hc = nbRot * vec3(g.x, 0., g.y) * 7.5 + 1.3;
  float hfx = nbGNoise(hc, ivec3(14, 7, 14), 0x51a7u), hfy = nbGNoise(hc * 2., ivec3(28, 14, 28), 0x9c3bu);
  float ph = nbArmPhase(xz, twist, pattern);
  float arm = exp(-nbSq(sin(ph + .35 * (nzx - .5))) / .18);
  float lane = exp(-nbSq(sin(ph - .28 + .3 * (nzx - .5) + .15 * (hfx - .5))) / (.01 + .018 * hfy)) * nbSmooth(.12, .32, rd);
  float inner = nbSmooth(.12, .42, rd);
  float clumps = .2 + 1.6 * nbSq(nbSmooth(.3, .8, hfx)) + .5 * nzy;
  float spur = exp(-nbSq(sin(ph + 1.1 + 2.5 * (nzy - .5))) / .05) * .35;
  // Fine star-cloud grain resolves the arms at full output resolution.
  vec3 fc = nbRot * vec3(g.y, 0., g.x) * 26. + 4.2;
  float fine = nbGNoise(fc, ivec3(56, 28, 56), 0x3e1du);
  float armLight = (arm * clumps * (.45 + 1.1 * fine * fine) + spur * hfy) * inner;
  float kn = nbGNoise(fc * .55 + 7.1, ivec3(56, 28, 56), 0x77c1u);
  float knots = nbSmooth(.74 - .08 * level, .86, kn) * nbSmooth(.4, .7, hfy) * arm * arm * nbSmooth(.22, .45, rd);
  return vec4(arm, armLight, lane * (.6 + 2.6 * nzy * nzy) * inner, knots);
}
`;

// Web slices: ${WEB_GRID[1]} y-slices of (${WEB_GRID[0]}+2)×(${WEB_GRID[2]}+2) texels, 8 per
// row (r: web density, g: streaming fibres; clamped box, cloud frame).
const atlas = `
const vec3 NB_BOX = ${v3(WEB_BOX)};
const vec3 NB_GRID = ${v3(WEB_GRID)};
const vec2 NB_ATLAS = vec2(${f(ATLAS[0])}, ${f(ATLAS[1])});
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
vec2 nbSlice(float s) { return vec2(mod(s, 8.), floor(s / 8.)) * vec2(NB_GRID.x + 2., NB_GRID.z + 2.); }
#endif
vec2 nbWebAt(vec3 x, uint clock) {
#ifdef PRECOMPUTED
  vec3 c = clamp((x / NB_BOX * .5 + .5) * (NB_GRID - 1.), vec3(0.), NB_GRID - 1.001);
  float s = floor(c.y);
  vec2 a = texture(u_precomputed, (nbSlice(s) + c.xz + 1.5) / NB_ATLAS).xy;
  vec2 b = texture(u_precomputed, (nbSlice(s + 1.) + c.xz + 1.5) / NB_ATLAS).xy;
  return mix(a, b, c.y - s);
#else
  return nbWebField(x, clock, u_params[2]);
#endif
}
vec4 nbShellAt(vec3 dn) {
#ifdef PRECOMPUTED
  vec3 d = dn / (abs(dn.x) + abs(dn.y) + abs(dn.z));
  if (d.y < 0.) d.xz = (1. - abs(d.zx)) * vec2(d.x >= 0. ? 1. : -1., d.z >= 0. ? 1. : -1.);
  vec2 c = clamp((d.xz * .5 + .5) * ${f(OCTA)}, .5, ${f(OCTA - 0.5)});
  return texture(u_precomputed, c / NB_ATLAS);
#else
  return nbShellData(dn, clamp(u_level, 0., 1.), nbClock());
#endif
}
vec4 nbDiskAt(vec2 xz, float twist, float pattern, float gasPhase) {
#ifdef PRECOMPUTED
  vec2 c = clamp((xz / ${f(DISK_EXTENT)} * .5 + .5) * ${f(DISK_MAP)}, .5, ${f(DISK_MAP - 0.5)});
  return texture(u_precomputed, (c + vec2(${f(SLICES[0])}, 0.)) / NB_ATLAS);
#else
  return nbDiskData(xz, twist, pattern, gasPhase, clamp(u_level, 0., 1.));
#endif
}
`;

// Volumetric radiance at full output resolution: a jittered front-to-back
// march over the union of tight analytic bounds (cloud ellipsoid → disk →
// shell), with emission and absorption.
const fragment = `
${common}
${camera}
${lanes}
${fields}
${shellData}
${atlas}
// ∫ exp(−|m∘(o + t·d)|²/s²) dt on t < tc and t > tc (erf ≈ tanh form).
vec2 nbGaussPath(vec3 o, vec3 d, vec3 m, float s, float tc) {
  vec3 om = o * m, dm = d * m;
  float A = dot(dm, dm), B = dot(om, dm), C = dot(om, om);
  float total = s * 1.7724539 / sqrt(A) * exp(-(C - B * B / A) / (s * s));
  float z = clamp((tc + B / A) * sqrt(A) / s, -6., 6.);
  float front = .5 * (1. + tanh(1.12838 * z + .10066 * z * z * z)) * total;
  return vec2(front, total - front);
}
vec2 nbEllipsoid(vec3 o, vec3 d, vec3 r) {
  vec3 oo = o / r, dd = d / r;
  float a = dot(dd, dd), b = dot(oo, dd), c = dot(oo, oo) - 1.;
  float disc = b * b - a * c;
  if (disc <= 0.) return vec2(1e9, -1e9);
  float s = sqrt(disc);
  return vec2((-b - s) / a, (-b + s) / a);
}
void main() {
  uint clock = nbClock(), key = nbKey();
  float dev = clamp(u_params[0], 0., 2.), level = clamp(u_level, 0., 1.);
  float p = nbSmooth(0., 1., dev), n = nbSmooth(1., 2., dev);
  NbCam cam = nbCamera(clock, nbCamDev());
  vec2 screen = (v_uv * 2. - 1.) * u_resolution / min(u_resolution.x, u_resolution.y);
  vec3 ray = normalize(cam.fwd * cam.focal + cam.right * screen.x + cam.up * screen.y);
  vec3 cGas = u_primary, cArm = u_secondary, cHot = mix(u_primary, vec3(1.), .7), cAcc = u_accent;
  float wWeb = 1. - p, wDisk = p * (1. - nbSmooth(.45, 1., n)), wShell = n;
  float R0 = NB_SHELL * (.1 + .9 * n) * (1. + .03 * sin(NB_TAU * nbCycle(clock, ${N.dolly}u)));
  float lobe = .6 * (1. - nbSmooth(.3, 1., n));
  vec2 span = vec2(1e9, -1e9), b;
  vec3 webR = vec3(mix(1.97, 1.66, p), .9 * mix(1., .1, p), mix(1.97, 1.66, p));
  if (wWeb > .001) { b = nbEllipsoid(cam.eye, ray, webR); span = vec2(min(span.x, b.x), max(span.y, b.y)); }
  if (wDisk > .001) {
    // Only the thin slab is marched; the bulge is integrated analytically.
    b = nbEllipsoid(cam.eye, ray, vec3(1.78, .16, 1.78));
    span = vec2(min(span.x, b.x), max(span.y, b.y));
  }
  if (wShell > .001) { b = nbEllipsoid(cam.eye, ray, R0 * vec3(1.15, 1.15 * (1. + lobe), 1.15)); span = vec2(min(span.x, b.x), max(span.y, b.y)); }
  float along = -dot(cam.eye, ray);
  float impact = length(cam.eye + ray * along);
  vec3 col = vec3(0.);
  float T = 1., Tcore = 1., Tpre = 1., Tpost = 1.;
  float tPlane = abs(ray.y) > 1e-4 ? -cam.eye.y / ray.y : 1e9;
  float sb = .26 * mix(1., .22, nbSmooth(0., .35, n));
  if (span.y > max(span.x, .05)) {
    float t0 = max(span.x, .05), t1 = span.y;
    float minSide = min(u_resolution.x, u_resolution.y);
    // Steps follow the bounded chord: tight bounds cost little.
    // At 4K four pixels share one 1080p pixel's footprint and average the
    // jittered samples, so fewer steps per pixel keep the same quality.
    float k4 = clamp((minSide - 1080.) / 1080., 0., 1.);
    // A pure remnant keeps only its filament layers in the march: the
    // interior (haze, shock fronts) is integrated analytically below.
    vec2 hole = vec2(1e9, -1e9);
    if (wShell > .999 && wWeb + wDisk < .001) hole = nbEllipsoid(cam.eye, ray, vec3(R0 * .72));
    float skip = max(0., min(hole.y, t1) - max(hole.x, t0));
    float steps = clamp(ceil((t1 - t0 - skip) / mix(.08, .16, k4)), wWeb + wShell > .001 ? mix(8., 5., k4) : 2., mix(24., 12., k4));
    float dt = (t1 - t0 - skip) / steps;
    uvec2 pix = uvec2(gl_FragCoord.xy);
    // The jitter changes every frame: at 60 Hz the eye averages it like
    // film grain instead of a screen-fixed pattern under moving gas.
    float t = t0 + dt * float(nbHash(pix.x * 1973u + pix.y * 9277u + nbHash(u_tick + 0x2a1bu)) >> 8) / 16777216.;
    float cloudPhase = NB_TAU * nbCycle(clock, ${N.cloud}u);
    mat2 toCloud = mat2(cos(cloudPhase), -sin(cloudPhase), sin(cloudPhase), cos(cloudPhase));
    float twist = 1.35 * (2.2 + .9 * nbRnd(key, 0u, 905u)) * u_params[3];
    float pattern = NB_TAU * nbCycle(clock, ${N.pattern}u);
    float flatten = mix(1., .1, p);
    float armPulse = mix(.15, 1.8, 1. - u_rhythm.x), ripple = 2.6 * (1. - u_rhythm.z);
    float shellPhase = NB_TAU * nbCycle(clock, 2u); // 720 s per turn, exact at wrap
    mat2 shellTurn = mat2(cos(shellPhase), -sin(shellPhase), sin(shellPhase), cos(shellPhase));
    float ejecta = nbCycle(clock, ${N.ejecta}u);
    float sharp = mix(.6, 1.35, level);
    for (int i = 0; i < 24; i++) {
      if (t > hole.x && t < hole.y) t += hole.y - hole.x;
      if (float(i) >= steps || t > t1) break;
      vec3 x = cam.eye + ray * t;
      float r = length(x);
      vec3 e = vec3(0.);
      float sigma = 0., matter = 0.;
      if (wWeb > .001) {
        // The web's pre-image: wound, contracted and flattened toward the
        // disk as it condenses (geometry, not a dissolve).
        vec3 w = vec3(toCloud * x.xz, x.y).xzy;
        if (p > 0.) {
          float a = p * 2.4 * exp(-length(w.xz) * .7);
          w.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * w.xz * mix(1., 1.2, p);
          w.y /= flatten;
        }
        // Finite cloud: the envelope reaches zero inside the march bound.
        float env = 1. - nbSmooth(.68, 1., length(w / vec3(1.95, .88, 1.95)));
        if (env > 0.) {
          vec2 web = nbWebAt(w, clock);
          float fib = nbSmooth(.25, .85, web.y);
          // Crisp filament cores (an iso-band of the smooth field) inside a
          // soft glow; energy sharpens the streaming fibres.
          float fibre = mix(1., .25 + 1.6 * fib * fib, .5 * sharp);
          float near = nbSmooth(.05, .6, t);
          float core = nbSmooth(1.6, 3.4, web.x) * web.x * fibre * env * near;
          float dens = (web.x * .35 + core) * env * near;
          float hot = max(web.x - 2.6, 0.) * sharp * env;
          float haze = env * fib * fib * .03;
          e += wWeb * (cGas * (web.x * .08 * env + core * .6) + cHot * hot * .35 + cArm * haze * 1.5);
          if (u_rhythm.x > 0.) e += wWeb * cHot * dens * u_rhythm.x * .8 * exp(-nbSq((r - armPulse) / .25));
          sigma += wWeb * (dens * .5 + haze * 4.);
          matter += wWeb * dens * .3;
        }
      }
      if (wDisk > .001) {
        float rd = length(x.xz);
        vec4 dk = nbDiskAt(x.xz, twist, pattern, cloudPhase);
        float arm = dk.x, armLight = dk.y, laneK = dk.z, knots = dk.w;
        float surface = exp(-rd / .52) * (1. - nbSmooth(1.2, 1.75, rd));
        float clear = n > 0. ? nbSmooth(R0 * .85, R0 * 1.05, r) : 1.;
        float h = .022 + .018 * rd;
        vec3 xa = x - ray * dt * .5, xb = x + ray * dt * .5;
        float column = nbColumn(xa, xb, h) / dt;
        // Star-forming knots sit in a thinner layer than the stellar disk.
        float knotColumn = min(nbColumn(xa, xb, .012), 1.2) / dt;
        // Arms: clumpy star-forming gas; the brightest clumps go white-hot.
        float hotC = nbSmooth(1.1, 2.4, armLight), inner = nbSmooth(.12, .42, rd);
        // Lanes are cold, opaque dust: they stop emitting and hide what is behind.
        float dark = exp(-laneK * .85);
        // Old disk stars fill the whole disk softly; young arms ride on top.
        vec3 E = surface * dark * (cGas * .1 * (.5 + arm) + mix(cArm, cHot, .35) * .14 * inner + cArm * armLight * 3.6 * (1. - .4 * hotC) + cHot * hotC * 3.2);
        if (u_rhythm.x > 0.) E += cArm * arm * surface * u_rhythm.x * 3. * exp(-nbSq((rd - armPulse) / .15));
        float K = surface * (laneK * 2.2 + .3 * arm + .5); // + diffuse midplane dust (edge-on lane)
        e += wDisk * clear * cAcc * knots * surface * 16. * dark * knotColumn * 2. * mix(.25, 1., nbSmooth(.05, .35, abs(ray.y)));
        e += wDisk * clear * E * column * 2.;
        sigma += wDisk * clear * K * column;
        matter += wDisk * clear * surface * column * (1. + arm) * .5;
      }
      if (wShell > .001) {
        vec3 d = x / max(r, 1e-4);
        float Rs = R0 * (1. + lobe * d.y * d.y);
        // Filaments live on the sphere of directions, so the same fingers
        // ride outward with the shell; radial extent makes them RT fingers.
        vec3 dn = nbRot * vec3(shellTurn * d.xz, d.y).xzy;
        vec4 sh = nbShellAt(dn);
        float patchy = sh.z, lift = sh.w, ridge2 = sh.y;
        float u = r / Rs;
        float limb = exp(-nbSq((u - .99 - lift) / (.012 + .02 * ridge2)));
        float reach = .8 + .1 * ridge2;
        float band = nbSmooth(reach, reach + .08, u) * (1. - nbSmooth(.98 + lift, 1.03 + lift, u)) * (.55 + .45 * nbSmooth(reach, 1., u));
        float fil = sh.x * band;
        fil *= .55 + .45 * sin(NB_TAU * (u * 11. - ejecta) + 6. * ridge2);
        float rim = exp(-nbSq((u - 1.035 - lift) / .009)) * nbSmooth(.5, .8, patchy) * nbSmooth(.25, .6, ridge2);
        vec3 E = mix(cGas, cHot, .4 * ridge2) * limb * (.08 + 1.4 * patchy * patchy) * .9 + mix(cArm, cHot, pow(ridge2, 5.)) * fil * 9.
          + cAcc * rim * 1.1
          + cAcc * fil * pow(ridge2, 12.) * 6.;
        E += mix(cArm, cHot, .5) * fil * u_rhythm.x * 3.;
        // The breakout reaches full brightness early: an energetic young bubble.
        e += nbSmooth(0., .4, n) * E;
        sigma += wShell * (fil * 6. + limb * .3);
        matter += wShell * (fil + limb * .5);
      }
      // Shock ripple: a ring of light runs out through whatever matter is there.
      if (u_rhythm.z > 0.) e += cHot * matter * u_rhythm.z * 2.2 * exp(-nbSq((r - ripple) / .08));
      // The remnant's interior holds only smooth haze: stride through it.
      col += T * e * dt;
      if (t < along) Tcore = T;
      float Tbefore = T;
      T *= exp(-sigma * dt);
      if (t - .5 * dt < tPlane) { Tpost = T; Tpre = t + .5 * dt < tPlane ? T : Tbefore; }
      if (T < .02) break;
      t += dt;
    }
    if (t1 < along) Tcore = T;
  }
  if (wDisk > .001 || (p > 0. && n < 1.)) {
    // Bulge: old hot stars, compact, rising into the steady hot core. Path
    // integrals split at the disk plane: lanes hide the far half.
    float bulgeAmp = p * (1. - nbSmooth(.55, 1., n)) * mix(2.4, 5., nbSmooth(0., .35, n)) * (1. + 1.2 * u_rhythm.y);
    vec2 core = nbGaussPath(cam.eye, ray, vec3(1., 1. / .62, 1.), sb, tPlane);
    vec2 halo = nbGaussPath(cam.eye, ray, vec3(1., 1. / .5, 1.), .4, tPlane);
    col += cHot * bulgeAmp * (core.x * Tpre + core.y * Tpost)
      + mix(cGas, cHot, .4) * .6 * wDisk * (halo.x * Tpre + halo.y * Tpost);
  }
  if (n > 0.) {
    // Remnant interior: synchrotron haze around the pulsar and the
    // Sedov–Taylor fronts as thin spheres (path-integrated, analytic).
    float sig = .32 * R0;
    float haze = sig * 1.7725 * exp(-impact * impact / (sig * sig));
    float shockC = nbCycle(clock, ${N.shock}u);
    float F = R0 * pow(shockC, .4), fw = .035; // Sedov–Taylor R ∝ t^(2/5), inside the shell
    float sphere = F > impact ? 2. * fw * 1.7725 / max(sqrt(1. - nbSq(impact / F)), sqrt(2. * fw / max(F, .01)))
      : fw * 1.7725 * sqrt(2. * F / fw) * exp(-nbSq((impact - F) / fw));
    float front = u_params[7] * nbSmooth(0., .05, shockC) * (1. - shockC) * sphere * nbSmooth(.05, .3, F);
    col += Tcore * n * (mix(cArm, cHot, .55) * haze * .35 + cHot * front * .45);
  }
  // The densest web node, the future nucleus: a compact hot knot
  // (path-integrated Gaussian, analytic).
  col += Tcore * cHot * (1. - p) * (.19 * exp(-impact * impact / .012) * 3. + .5 * exp(-impact * impact / .0015)) * (1. + u_rhythm.y);
  // Steady hot core and pulsar (point-like, analytic): ignition is a
  // structural state of development, never a timed flash.
  float core = nbSmooth(0., .3, n);
  float coreR2 = impact * impact;
  col += Tcore * (cHot * core * (exp(-coreR2 / .0016) * 2.4 + exp(-coreR2 / .03) * .35) * (1. + 1.5 * u_rhythm.y)
    + cAcc * core * exp(-coreR2 / .0003) * 3.);
  if (n > 0. && along > 0.) {
    // Pulsar jets along a precessing axis.
    float ph = NB_TAU * nbCycle(clock, ${N.lift}u);
    vec3 axis = normalize(vec3(.45 * sin(ph), 1., .45 * cos(ph)));
    vec3 cr = cross(ray, axis);
    float cl = max(length(cr), 1e-4);
    float dl = abs(dot(cam.eye, cr)) / cl;
    vec3 w0 = cam.eye;
    float b2 = dot(ray, axis);
    float sAxis = (dot(w0, axis) - b2 * dot(w0, ray)) / max(1. - b2 * b2, 1e-4);
    float jet = exp(-nbSq(dl / (.006 + .03 * abs(sAxis)))) * exp(-abs(sAxis) / (.28 * R0)) * nbSmooth(.02, .1, abs(sAxis));
    col += Tcore * mix(cAcc, vec3(1.), .35) * jet * n * 1.4 * (1. + 1.5 * u_rhythm.y);
  }
  // Faint scattered light around the form: depth, not a fill.
  col += cGas * .012 * exp(-impact * impact / 3.) * (1. - .5 * n);
  col *= u_params[4];
  emit(vec4(col, 1.));
}
`;

const precompute = `${common}
${lanes}
${fields}
${shellData}
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  float dev = clamp(u_params[0], 0., 2.), level = clamp(u_level, 0., 1.);
  uint clock = nbClock(), key = nbKey();
  outColor = vec4(0.);
  if (px.x >= ${SLICES[0]}) {
    // Disk map, only while the disk is shown.
    if (dev > 0. && dev < 2. && px.y < ${DISK_MAP}) {
      vec2 xz = ((vec2(px - ivec2(${SLICES[0]}, 0)) + .5) / ${f(DISK_MAP)} * 2. - 1.) * ${f(DISK_EXTENT)};
      outColor = nbDiskData(xz, 1.35 * (2.2 + .9 * nbRnd(key, 0u, 905u)) * u_params[3],
        NB_TAU * nbCycle(clock, ${N.pattern}u), NB_TAU * nbCycle(clock, ${N.cloud}u), level);
    }
    return;
  }
  if (dev >= 1.) {
    // Remnant direction map while the web is not shown.
    if (px.x < ${OCTA} && px.y < ${OCTA})
      outColor = nbShellData(nbOctaDecode((vec2(px) + .5) / ${f(OCTA)}), level, clock);
    return;
  }
  // Web slices with a clamped duplicate gutter; the box corners stay empty.
  ivec2 blk = px / ivec2(${WEB_GRID[0] + 2}, ${WEB_GRID[2] + 2});
  ivec2 loc = px - blk * ivec2(${WEB_GRID[0] + 2}, ${WEB_GRID[2] + 2}) - 1;
  int slice = blk.y * 8 + blk.x;
  if (slice >= ${WEB_GRID[1]}) return;
  ivec3 cc = ivec3(clamp(loc.x, 0, ${WEB_GRID[0] - 1}), slice, clamp(loc.y, 0, ${WEB_GRID[2] - 1}));
  vec3 x = (vec3(cc) / ${v3(WEB_GRID.map((g) => g - 1))} * 2. - 1.) * ${v3(WEB_BOX)};
  if (length(x.xz) < 2.05 && abs(x.y) < 1.) outColor = vec4(nbWebField(x, clock, u_params[2]), 0., 0.);
}`;

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
    look("Cosmic Web", 1618, 0, { web: 2.4, distance: 0.95, height: 0.8, speed: 1.2 }),
    look("Edge-on Lanes", 2718, 1, { height: 0.08, distance: 0.8, arms: 1.25 }),
    look("Open Whirlpool", 577, 1, { height: 0.92, arms: 0.85, distance: 1.02 }),
    look("Remnant Bloom", 4669, 2, { distance: 0.82, height: 0.35, shock: 1.3 }),
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
      "A pulse of light runs outward along the arm crests, the web's filaments or the remnant's filaments.",
      { period: 4, strength: 0.6, duration: 1 },
    ),
    familyEffect(
      "core-flare",
      1,
      "Core flare",
      "The bulge or the pulsar and its jets flare.",
      { period: 8, strength: 0.6, duration: 1 },
    ),
    familyEffect(
      "shock-ripple",
      2,
      "Shock ripple",
      "A ring of light runs outward through the gas, the disk or the shell.",
      { period: 16, strength: 0.7, duration: 2 },
    ),
  ],
  fragment,
  precompute: {
    size: ATLAS,
    format: "rgba16f",
    filter: "linear",
    fragment: precompute,
  },
  simulation: { fragment: simulation, size: SIZE, steps: 1 },
  particles: { vertex, fragment: particleFragment },
};
