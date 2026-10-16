import { familyEffect } from "./family-rhythm.mjs";
import { morphogenSimulation } from "./scene-evolution.mjs";

// Afterglow Garden: one continuing Gray–Scott morphogen field seen as a dusk
// meadow. Every flower is one local maximum of the field ("a spot"); when the
// chemistry divides a spot, its flower pinches and becomes two. Development
// only grows and opens the plants and cranes the camera: it never creates or
// removes a flower, and the field itself never resets.
//
// Passes: simulation (shared morphogen step, measured chemistry band, spore
// rain and single-hit local feed) → precompute (64² spot finder) → fullscreen
// visual (afterglow sky, matte moss, faint roots, occluded pollen spill) →
// instanced geometry (detailed flowers in the near field, simple flowers to
// the horizon, additive halos and pollen).

// Jump-safe chemistry (F, k, Dv): labyrinth roots → spots and worms → spots.
// The CPU mirror in tests/afterglow.test.mjs keeps coverage after every
// ordered instant jump, and Bloom divides to refill a cleared patch.
export const CHEMISTRY = [
  [0.032, 0.0585, 0.5],
  [0.034, 0.0612, 0.47],
  [0.036, 0.0625, 0.47],
];
export const WORLD_SIZE = 2.8; // world units per field period (384 texels)
export const FIELD = 384;
export const CELLS = 64; // spot-finder cells per side, 6×6 field texels each
export const NEAR_AHEAD = 1.3; // detailed square centre ahead of the eye
// Simple far images: whole field periods beside and ahead of the near square.
export const FAR_IMAGES = [];
for (let dy = 0; dy <= 2; dy++)
  for (let dx = -2; dx <= 2; dx++)
    if (dx !== 0 || dy !== 0) FAR_IMAGES.push([dx, dy]);
// Per-flower template: detailed opaque | simple opaque images | additive tail.
export const STEM_SEGMENTS = 6;
export const PETALS = 6;
// Six overlapping, curved lobes, sampled densely enough for rolled edges.
export const HEAD_AROUND = PETALS * 4,
  HEAD_ALONG = 12;
export const DETAIL_VERTICES =
  STEM_SEGMENTS * 6 + HEAD_AROUND * HEAD_ALONG * 6 + 6;
export const SIMPLE_VERTICES = FAR_IMAGES.length * 12 + 36; // two three-segment grass blades
export const ADDITIVE_FROM = DETAIL_VERTICES + SIMPLE_VERTICES;
export const TRAIL_SEGMENTS = 8;
export const TAIL_VERTICES = (3 + 3 * (TRAIL_SEGMENTS + 1)) * 6;
export const FLOWER_VERTICES = ADDITIVE_FROM + TAIL_VERTICES;

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// CPU mirror of agCamera() (eye height and pitch follow development).
export function gardenEye(development, altitude = 1) {
  const d = Math.max(0, Math.min(2, development));
  const z = (0.12 + 0.06 * smooth(0, 1, d) + 0.08 * smooth(1, 2, d)) * altitude;
  const pitch = -(0.08 + 0.04 * smooth(0, 1, d) + 0.08 * smooth(1, 2, d));
  return { z, pitch };
}

// Template vertex = (part, a, b); instance = (cellX, cellY).
// part 0 stem, 1–6 lobes, 7 core, 8+k far image, 30 halo, 31/32 fireflies.
export function flowerTemplate() {
  const out = [];
  const quad = (part, a0, a1, b0, b1) =>
    out.push(
      part,
      a0,
      b0,
      part,
      a1,
      b0,
      part,
      a0,
      b1,
      part,
      a0,
      b1,
      part,
      a1,
      b0,
      part,
      a1,
      b1,
    );
  for (let s = 0; s < STEM_SEGMENTS; s++)
    quad(0, -1, 1, s / STEM_SEGMENTS, (s + 1) / STEM_SEGMENTS);
  for (let k = 0; k < PETALS; k++)
    for (let i = 0; i < HEAD_AROUND / PETALS; i++)
      for (let j = 0; j < HEAD_ALONG; j++)
        quad(
          1 + k,
          (k + i / (HEAD_AROUND / PETALS) - 0.5) / PETALS,
          (k + (i + 1) / (HEAD_AROUND / PETALS) - 0.5) / PETALS,
          j / HEAD_ALONG,
          (j + 1) / HEAD_ALONG,
        );
  quad(7, -1, 1, -1, 1);
  for (let k = 0; k < FAR_IMAGES.length; k++) {
    quad(8 + k, -1, 1, 0, 1); // stem card
    quad(8 + k, -1, 1, 2, 4); // head card (b - 3 in [-1, 1])
  }
  for (let k = 22; k < 24; k++)
    for (let j = 0; j < 3; j++) quad(k, -1, 1, j / 3, (j + 1) / 3);
  quad(30, -1, 1, -1, 1);
  quad(31, -1, 1, -1, 1);
  quad(32, -1, 1, -1, 1);
  for (let k = 33; k < 33 + 3 * (TRAIL_SEGMENTS + 1); k++)
    quad(k, -1, 1, -1, 1);
  return new Float32Array(out);
}
export function flowerInstances() {
  const out = new Float32Array(CELLS * CELLS * 2);
  for (let y = 0; y < CELLS; y++)
    for (let x = 0; x < CELLS; x++) {
      out[(y * CELLS + x) * 2] = x;
      out[(y * CELLS + x) * 2 + 1] = y;
    }
  return out;
}

// ---------------------------------------------------------------- shared GLSL
const f = (x) => (Number.isInteger(x) ? `${x}.` : `${x}`);
const farList = FAR_IMAGES.map(([x, y]) => `vec2(${f(x)},${f(y)})`).join(",");
const common = `
const float AG_TAU = 6.28318530718;
const float AG_WS = ${f(WORLD_SIZE)};
const float AG_N = ${f(FIELD)};
float agSmooth(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
float agDev() { return clamp(u_params[0], 0., 2.); }
float agGrow() { return agSmooth(0., 1., agDev()); }
float agBloom() { return agSmooth(1., 2., agDev()); }
float agGlow() { return clamp(u_params[4], .35, 1.65); }
float agRelief() { return clamp(u_params[6], .3, 1.6); }
float agSway() { return clamp(u_params[7], 0., 1.); }
float agLevel() { return clamp(u_level, 0., 1.); }
uint agHash3(uvec3 v) {
  v ^= uvec3(u_seedBits * 0x9E3779B9u, u_seedBits, 0x2545F491u);
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v.x ^ v.y ^ v.z;
}
float agRand(vec2 c, uint k) { return float(agHash3(uvec3(uvec2(c), k)) >> 8u) / 16777216.; }
// Value noise with an integer lattice period (seamless on the torus).
float agNoise(vec2 x, float period, uint k) {
  vec2 i = floor(x), t = fract(x);
  t = t * t * (3. - 2. * t);
  vec2 a = mod(i, period), b = mod(i + 1., period);
  return mix(mix(agRand(a, k), agRand(vec2(b.x, a.y), k), t.x),
             mix(agRand(vec2(a.x, b.y), k), agRand(b, k), t.x), t.y);
}
// The camera glides one field period every 96 s along +y; yaw and the
// lateral weave complete whole cycles. Development raises the eye within a
// deliberately small range (2.2×) plus a slow phrase crane; no shake or cuts.
void agCameraAt(float time, out vec3 eye, out vec3 R, out vec3 U, out vec3 F) {
  float d = agDev();
  float yaw = .20 * sin(AG_TAU * fract(time / 180.)) + .06 * sin(AG_TAU * fract(time / 72.));
  vec2 heading = vec2(sin(yaw), cos(yaw));
  float altitude = clamp(u_params[5], .7, 1.4);
  vec2 track = AG_WS * vec2(.5 + .05 * sin(AG_TAU * fract(time / 120.)), fract(time / 96.));
  float crane = .008 * sin(AG_TAU * fract(time / 64.));
  eye = vec3(track, (.12 + .06 * agSmooth(0., 1., d) + .08 * agSmooth(1., 2., d) + crane) * altitude);
  float pitch = -(.08 + .04 * agSmooth(0., 1., d) + .08 * agSmooth(1., 2., d)) + crane;
  F = vec3(heading * cos(pitch), sin(pitch));
  R = vec3(heading.y, -heading.x, 0.);
  U = cross(R, F);
}
void agCamera(out vec3 eye, out vec3 R, out vec3 U, out vec3 F) { agCameraAt(u_time, eye, R, U, F); }
float agLens() { return 1.15 * (1. + .012 * clamp(u_kick, 0., 1.)); }
vec2 agFit() { float a = u_resolution.x / u_resolution.y; return vec2(max(1., a), max(1., 1. / a)); }
// Centre of the detailed square, ahead of the eye.
vec2 agNearCentre(vec3 eye, vec3 F) { return eye.xy + normalize(F.xy) * ${f(NEAR_AHEAD)}; }

// ----- afterglow light: the sun has just set ahead and to the right.
vec3 agSun() { return normalize(vec3(.30, .95, -.035)); }
vec3 agSat(vec3 c, float k) { float l = dot(c, vec3(.299, .587, .114)); return max(mix(vec3(l), c, k), 0.); }
// Blackbody-like ramp in palette terms: black → deep secondary →
// saturated secondary/primary → primary → a white-hot tip (top few %).
vec3 agRamp(float h) {
  vec3 c = agSat(u_secondary, 1.3) * .34 * agSmooth(0., .32, h);
  c = mix(c, agSat(u_secondary, 1.35) * .76, agSmooth(.22, .62, h));
  c = mix(c, u_primary * .98, agSmooth(.55, .9, h));
  return mix(c, mix(u_primary, vec3(1.), .16) * 1.25, agSmooth(.9, 1., h));
}
float agSector(vec2 dir) { return pow(.5 + .5 * dot(normalize(dir + 1e-6), normalize(agSun().xy)), 2.2); }
float agHeat(vec3 rd) {
  float sector = agSector(rd.xy);
  float e = max(rd.z + .012, 0.);
  return min(1., exp(-e / (.025 + .065 * sector)) * (.14 + .86 * sector) * .62);
}
vec3 agHaze(vec3 rd) { return agRamp(agHeat(vec3(rd.xy, 0.)) * .72) * .30; }
`;

const geometryUniforms = `uniform float u_time, u_level, u_kick;
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec3 u_primary, u_secondary, u_accent;
uniform vec4 u_rhythm, u_rhythmHit, u_rhythmCount;
uniform highp uint u_seedBits;
uniform sampler2D u_state;
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif`;

// Independent local gestures: travelling sap packets, flexing cohorts and
// a camera-local pollen release. No whole-corolla contour switch.
const pulse = `
// Count selects a moving patch of the meadow, never the whole screen.
vec2 agPollenFocus(vec2 eye, vec2 forward) {
  vec2 ahead = normalize(forward), side = vec2(ahead.y, -ahead.x);
  float event = u_rhythmCount.w;
  return eye + ahead * .88 + side * (.32 * sin(event * 3.8));
}
float agPollen(vec2 p, vec2 eye, vec2 forward) {
  float cohort = 1. - agSmooth(.09, .21, length(p - agPollenFocus(eye, forward)));
  return cohort * clamp(u_rhythm.w + .08 * u_rhythmHit.w, 0., 1.);
}
float agPulse(float distanceFromEye) {
  float front = (1. - clamp(u_rhythm.x, 0., 1.)) * 3.;
  float ring = exp(-sq((distanceFromEye - front) / .22));
  return clamp(u_rhythm.x * 1.5, 0., 1.) * ring;
}
// Count moves each independent gesture through a visible near-field patch.
// Selecting a narrow chemical tone could miss every foreground crown.
float agFlowerPatch(vec2 p, vec2 eye, vec2 forward, float count, float offset) {
  vec2 ahead = normalize(forward), side = vec2(ahead.y, -ahead.x);
  vec2 focus = eye + ahead * .72 + side * (.20 * sin(count * 2.4 + offset));
  return 1. - agSmooth(.14, .34, length(p - focus));
}
float agCohort(vec2 p, vec2 eye, vec2 forward) {
  return clamp(u_rhythm.y, 0., 1.) * agFlowerPatch(p, eye, forward, u_rhythmCount.y, 1.7);
}
float agSapSelection(vec2 p, vec2 eye, vec2 forward) {
  return agFlowerPatch(p, eye, forward, u_rhythmCount.x, 0.);
}
float agSapPacket(float path) {
  float age = 1. - clamp(u_rhythm.x, 0., 1.);
  float front = age * 1.75 - .42;
  return exp(-sq((path - front) / .10)) * agSmooth(0., .07, u_rhythm.x);
}
`;
const sqHelper = `float sq(float x) { return x * x; }\n`;

// ------------------------------------------------------------- simulation
const steering = `
vec3 gardenChemistry() {
  float d = clamp(u_params[0], 0., 2.);
  vec3 a = ${glsl(0)}, b = ${glsl(1)}, c = ${glsl(2)};
  return d < 1. ? mix(a, b, smoothstep(0., 1., d)) : mix(b, c, smoothstep(1., 2., d));
}
`;
function glsl(i) {
  return `vec3(${CHEMISTRY[i].map((x) => x.toFixed(4)).join(", ")})`;
}
const nearestStencil = `
vec4 gardenTexel(vec2 uv) {
  ivec2 size = textureSize(u_state, 0);
  return texelFetch(u_state, ivec2(floor(fract(uv) * vec2(size))), 0);
}
vec2 gardenLaplacian(vec2 uv) {
  vec2 t=1./vec2(textureSize(u_state,0));
  vec4 sum=-gardenTexel(uv);
  sum+=.2*(gardenTexel(uv+vec2(t.x,0.))+gardenTexel(uv-vec2(t.x,0.))
          +gardenTexel(uv+vec2(0.,t.y))+gardenTexel(uv-vec2(0.,t.y)));
  sum+=.05*(gardenTexel(uv+t)+gardenTexel(uv-t)
          +gardenTexel(uv+vec2(t.x,-t.y))+gardenTexel(uv+vec2(-t.x,t.y)));
  return unpack16(sum);
}
${common}
// Feed in view, with the placement held by the event count.
float gardenPatch(vec2 uv, float started, float salt) {
  vec3 eye, R, U, F;
  agCameraAt(started, eye, R, U, F);
  vec2 ahead = normalize(F.xy);
  vec2 side = vec2(ahead.y, -ahead.x);
  float h = fract(sin(salt * 12.9898) * 43758.5453);
  vec2 at = eye.xy + ahead * (.48 + .25 * h) + side * (h - .5) * .4;
  vec2 delta = torusDelta(uv, at / AG_WS) * AG_N;
  return 1. - smoothstep(14., 20., length(delta));
}
`;
const epilogue = `
  if (u_tick % 240u < 2u) {
    uint epoch = (u_tick / 240u) % 65521u;
    float spore = 0.;
    for (int i = 0; i < 3; i++) {
      vec2 at = vec2(hash(vec2(float(epoch), float(i) + 5.)), hash(vec2(float(i) + 9., float(epoch))));
      spore = max(spore, 1. - smoothstep(.006, .010, length(torusDelta(v_uv, at))));
    }
    if (spore > 0.) {
      vec2 texel = 1. / vec2(textureSize(u_state, 0));
      float around = 0.;
      for (int k = 0; k < 8; k++) {
        float angle = float(k) * .78539816;
        around = max(around, morphogen(v_uv + vec2(cos(angle), sin(angle)) * 12. * texel).y);
      }
      current = mix(current, vec2(.5, .26), spore * (1. - smoothstep(.02, .06, around)));
    }
  }
  if (u_rhythmHit.z > 0.) {
    float packet = gardenPatch(v_uv, u_time, u_rhythmCount.z + 17.);
    // One bounded nutrient packet, never repeated for the envelope lifetime.
    current = mix(current, vec2(.5, .26), packet * .7 * clamp(u_rhythmHit.z, 0., 1.));
  }
`;
const simulationFragment = morphogenSimulation(
  {
    planting: "u_params[1]",
    feed: "gardenChemistry().x",
    loss: "gardenChemistry().y",
    spread: "gardenChemistry().z",
    growth: "u_params[2]",
  },
  nearestStencil + steering,
  epilogue,
)
  .replace("texture(u_state, uv)", "gardenTexel(uv)")
  .replace("laplacian9(u_state, v_uv)", "gardenLaplacian(v_uv)")
  // Three buds per planting cell and side: the meadow matures in seconds.
  .replace("float density = u_params[1];", "float density = u_params[1] * 3.;");

// -------------------------------------------------------------- spot finder
// Texel (x, y<64): spot of cell (x, y) = (field x, field y, prominence,
// elongation). Texel (x, 64+y): (axis cos, axis sin, peak, 0). The search runs
// on the half-texel lattice, where one bilinear tap is an exact 2×2 box mean.
const precompute = `${common}
float agS(vec2 corner) { return unpack16(texture(u_state, corner / ${f(FIELD)})).y; }
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 cell = ivec2(c.x, c.y % ${CELLS});
  vec2 o = vec2(cell) * 6.;
  float best = -1.;
  vec2 at = o;
  for (int j = 0; j < 6; j++)
    for (int i = 0; i < 6; i++) {
      vec2 q = o + vec2(i, j);
      float s = agS(q);
      if (s > best) { best = s; at = q; }
    }
  bool ok = best > .06;
  for (int dy = -5; dy <= 5 && ok; dy++)
    for (int dx = -5; dx <= 5; dx++) {
      if ((dx == 0 && dy == 0) || dx * dx + dy * dy > 25) continue;
      float s = agS(at + vec2(dx, dy));
      if (s > best || (s == best && (dy < 0 || (dy == 0 && dx < 0)))) { ok = false; break; }
    }
  if (!ok) { outColor = vec4(0.); return; }
  float l = agS(at - vec2(1., 0.)), r = agS(at + vec2(1., 0.));
  float b = agS(at - vec2(0., 1.)), t = agS(at + vec2(0., 1.));
  vec2 sub = vec2(.5 * (l - r) / min(l - 2. * best + r, -1e-5), .5 * (b - t) / min(b - 2. * best + t, -1e-5));
  vec2 lattice = (at + clamp(sub, -.5, .5)) / 12.;
  if (c.y >= 128) {
    outColor = vec4(agNoise(lattice, 32., 21u), agNoise(lattice * 1.5, 48., 22u), agNoise(lattice * .5 + 7., 16., 23u), agNoise(lattice * .375, 12., 24u));
    return;
  }
  float ring = 0.;
  for (int k = 0; k < 12; k++) {
    float a = float(k) * .5235988;
    ring += agS(at + 7. * vec2(cos(a), sin(a)));
  }
  float prominence = best - ring / 12.;
  float hxx = agS(at + vec2(3., 0.)) + agS(at - vec2(3., 0.)) - 2. * best;
  float hyy = agS(at + vec2(0., 3.)) + agS(at - vec2(0., 3.)) - 2. * best;
  float hxy = .25 * (agS(at + vec2(3.)) + agS(at - vec2(3.)) - agS(at + vec2(3., -3.)) - agS(at + vec2(-3., 3.)));
  float m = .5 * (hxx + hyy), q = length(vec2(.5 * (hxx - hyy), hxy));
  float l1 = m - q, l2 = m + q;
  float elongation = l1 < 0. ? clamp(1. - abs(min(l2, 0.)) / abs(l1), 0., 1.) : 1.;
  float axis = .5 * atan(2. * hxy, hxx - hyy);
  outColor = c.y < ${CELLS}
    ? vec4(at + clamp(sub, -.5, .5), prominence, elongation)
    : vec4(cos(axis), sin(axis), best, agSmooth(.62, .9, agNoise(lattice * .5 + 3., 16., 27u)));
}
`;

// --------------------------------------------------- fullscreen sky and soil
const visual = `${common}${pulse}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
float agV(vec2 uv) { return unpack16(texture(u_state, uv)).y; }
vec3 agSkyBase(vec3 rd, float heat) {
  return agSat(u_secondary, 1.25) * (.06 + .24 * exp(-max(rd.z, 0.) * 5.)) + u_primary * pow(heat, 6.) * .10;
}
vec3 agSky(vec3 rd) {
  float heat = agHeat(rd);
  vec3 color = agSkyBase(rd, heat);
  float e = rd.z;
  float az = atan(rd.x, rd.y) / AG_TAU;
  if (e > .015 && e < .32) {
    // Cloud bars in the afterglow: bodies darker than the sky behind them,
    // lower edges lit by the band.
    float cl = agNoise(vec2(az * 20., e * 75.), 20., 3u) * .7 + agNoise(vec2(az * 60., e * 160.), 60., 4u) * .3;
    float layer = agSmooth(.015, .04, e) * (1. - agSmooth(.10, .24, e));
    float cloud = agSmooth(.64, .78, cl) * layer;
    float edge = agSmooth(.60, .67, cl) * (1. - agSmooth(.67, .78, cl)) * layer;
    color = mix(color, color * .65 + agSat(u_secondary, 1.2) * .004, cloud * .45);
    color += agRamp(min(1., heat * 1.3 + .05)) * edge * heat * .12;
  }
  if (e > .08) {
    // Static stars in the cooling zenith.
    vec2 sc = vec2(az * 900., e * 520.);
    vec2 cell = floor(sc);
    float star = step(.988, agRand(mod(cell, vec2(900., 1e4)), 7u));
    vec2 sub = fract(sc) - .5;
    color += mix(u_primary, vec3(1.), .5) * star * exp(-dot(sub, sub) * 18.) * agSmooth(.10, .35, e) * (1. - heat) * .45;
  }
  if (e < .04) {
    // Far hills: a dark ridge silhouetted on the band.
    float parallax = .025 * sin(AG_TAU * fract(u_time / 120.));
    float ridge = .004 + .030 * agNoise(vec2(az * 24. + parallax, 0.), 24., 9u) + .012 * agNoise(vec2(az * 80. + parallax * 3., 0.), 80., 10u);
    float hill = 1. - smoothstep(ridge - .0015, ridge + .0015, e);
    color = mix(color, agHaze(rd) * .55, hill);
  }
  return color;
}
void main() {
  vec3 eye, R, U, F;
  agCamera(eye, R, U, F);
  vec2 p = (v_uv - .5) * agFit() / agLens();
  vec3 rd = normalize(F + p.x * R + p.y * U);
  vec3 color;
  // Ground terms are evaluated everywhere so derivatives stay defined.
  {
    float t = eye.z / max(-rd.z, 2e-4);
    vec2 q = eye.xy + rd.xy * t;
    vec2 uv = q / AG_WS;
    float tx = 1. / AG_N;
    float footprint = length(fwidth(uv)) * AG_N;
    float v = agV(uv);
    float vb = .25 * (agV(uv + vec2(2.5, 1.) * tx) + agV(uv - vec2(2.5, 1.) * tx) + agV(uv + vec2(-1., 2.5) * tx) + agV(uv - vec2(-1., 2.5) * tx));
    float vp = .25 * (agV(uv + vec2(7., 3.) * tx) + agV(uv - vec2(7., 3.) * tx) + agV(uv + vec2(-3., 7.) * tx) + agV(uv - vec2(-3., 7.) * tx));
    v = mix(v, vb, agSmooth(.8, 3., footprint));
    // Matte moss: no mirror reflection or broad elliptical pools/wedges.
    float grain = agNoise(uv * 768., 768., 11u);
    float moss = agNoise(uv * 128., 128., 12u);
    color = agSat(u_secondary, 1.2) * (.022 + .04 * moss + .018 * grain);
    // Broad root tissue with a thickness-dependent core, never an iso-outline.
    float roots = pow(agSmooth(.14, .37, v), 2.) * (1. - .65 * agBloom());
    float sap = .65 + .35 * sin(AG_TAU * (uv.x * 7. + uv.y * 5.) - u_time * .8);
    color += agSat(mix(u_secondary, u_primary, .25), 1.4) * roots * sap * .07 * agGlow();
    // Light pools below every flower (wide blur of the spot field).
    float lit = .25 + .75 * agGrow();
    float pools = agSmooth(.06, .28, vp);
    color += u_secondary * pools * lit * .012 * agGlow();
    float front = (1. - clamp(u_rhythm.x, 0., 1.)) * 7.;
    color += u_primary * roots * clamp(u_rhythm.x, 0., 1.) * exp(-sq((t - front) / .45)) * .55;
    vec2 spillDelta = q - agPollenFocus(eye.xy, F.xy);
    float pollenSpill = exp(-dot(spillDelta, spillDelta) / .018) * pools * (.25 + .75 * moss) * grain;
    color += u_accent * pollenSpill * u_rhythm.w * .32;
    float fog = 1. - exp(-pow(t / 5.5, 1.7));
    color = mix(color, agHaze(rd), fog);
  }
  if (rd.z > -.0005) color = agSky(rd);
  outColor = vec4(max(color, vec3(0.)), 1.);
}
`;

// ---------------------------------------------------------------- flowers
const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec3 a_vertex;
layout(location=1) in vec2 a_cell;
${geometryUniforms}
out vec3 v_world, v_normal;
out vec4 v_surface; // (u, v, tone, openness)
out vec4 v_event;   // (dividing, flare, fade, hero weight)
out vec3 v_signal;  // (travelling sap, local pollen, petal flex)
flat out int v_part;
${sqHelper}${common}${pulse}
vec3 agPerp(vec3 n) { return normalize(abs(n.z) < .9 ? cross(n, vec3(0., 0., 1.)) : cross(n, vec3(1., 0., 0.))); }
vec2 agBend(float s, float phi0, float bulge, float curl) {
  float phi = phi0 + bulge * (1. - 2. * s) + curl * s * s;
  return vec2(cos(phi), sin(phi));
}
vec3 agCorolla(float v, vec3 head, vec3 axis, vec3 radial, float L,
               float phi0, float bulge, float curl, float rib) {
  // Simpson integral of the bending profile; ribs bulge each petal's middle.
  vec2 c = v / 6. * (agBend(0., phi0, bulge, curl) + 4. * agBend(.5 * v, phi0, bulge, curl) + agBend(v, phi0, bulge, curl));
  vec2 t = agBend(v, phi0, bulge, curl);
  vec3 nrm = -t.y * axis + t.x * radial;
  return head + (c.x * axis + c.y * radial) * L + nrm * rib * L;
}
vec3 agLobe(float v, float u, vec3 head, vec3 axis, vec3 b1, vec3 b2,
            float centreAngle, float L, float phi0, float bulge, float curl, float openness) {
  vec3 radial = cos(centreAngle) * b1 + sin(centreAngle) * b2;
  vec3 side = -sin(centreAngle) * b1 + cos(centreAngle) * b2;
  // Elliptical lamina rather than a polar wedge: broad overlapping cheeks,
  // softly rounded tip and rolled edges around a longitudinal central fold.
  float along = .5 - .5 * cos(3.14159 * v);
  float width = max(0., sin(3.14159 * v));
  float edgeRoll = (.035 - .20 * u * u) * width;
  vec3 p = agCorolla(along, head, axis, radial, L, phi0, bulge, curl, edgeRoll);
  return p + side * u * L * width * mix(.48, 1.35, openness);
}
void hide() { gl_Position = vec4(2., 2., 2., 1.); v_part = -1; }
void project(vec3 p, vec3 eye, vec3 R, vec3 U, vec3 F) {
  vec3 q = p - eye;
  float depth = dot(q, F);
  gl_Position = vec4(vec2(dot(q, R), dot(q, U)) * agLens() * 2. / agFit(), depth * 1.00501253 - .02005013, depth);
}
void main() {
  int part = int(a_vertex.x + .5);
  if (part == 22 || part == 23) {
    vec3 eye, R, U, F;
    agCamera(eye, R, U, F);
    vec2 centre = agNearCentre(eye, F);
    vec2 at = (a_cell + vec2(agRand(a_cell, 51u), agRand(a_cell, 52u))) / 64. * AG_WS;
    vec2 base = at + AG_WS * floor((centre - at) / AG_WS + .5);
    float far = length(base - eye.xy);
    if (far < .12 || dot(base - eye.xy, F.xy) < .05 || far > 3.) { hide(); return; }
    float k = float(part - 22), s = a_vertex.z;
    float height = .012 + .032 * agRand(a_cell, 53u);
    float angle = agRand(a_cell, 54u) * AG_TAU + k * 1.7;
    vec2 bend = vec2(cos(angle), sin(angle)) * height * .5;
    float wind = sin(AG_TAU * (at.x / AG_WS * 2. + at.y / AG_WS * 3.) - u_time * 1.4);
    vec3 c = vec3(base + (bend + vec2(wind * .012, 0.)) * s * s, height * s);
    vec3 side = normalize(cross(vec3(bend, height), normalize(eye - c)));
    vec3 p = c + side * a_vertex.y * .0022 * (1. - s * .97);
    v_world = p; v_normal = normalize(eye - c);
    v_surface = vec4(a_vertex.y, s, 0., 0.);
    v_event = vec4(0., agPulse(far), 1., 1.); v_signal = vec3(0.);
    v_part = part; project(p, eye, R, U, F); return;
  }
#ifdef PRECOMPUTED
  vec4 spot = texelFetch(u_precomputed, ivec2(a_cell), 0);
  vec4 axisData = texelFetch(u_precomputed, ivec2(a_cell) + ivec2(0, ${CELLS}), 0);
#else
  // No float target: continuous concentration-driven seed lanterns still grow.
  vec2 at = (a_cell + .5) * 6.;
  float peak = dot(texture(u_state, at / AG_N).ba, vec2(256., 1.)) * (255. / 65535.);
  vec4 spot = vec4(at, peak * .55, 0.);
  vec4 axisData = vec4(1., 0., peak, 0.);
#endif
  float size = agSmooth(.025, .14, spot.z);
  if (size <= 0.) { hide(); return; }
  vec3 eye, R, U, F;
  agCamera(eye, R, U, F);
  vec2 centre = agNearCentre(eye, F);
  vec2 world = spot.xy / AG_N * AG_WS;
  vec2 base = world + AG_WS * floor((centre - world) / AG_WS + .5);
  float simple = 0.;
  if (part >= 8 && part < 30) {
    base += AG_WS * vec2[](${farList})[part - 8];
    simple = 1.;
  }
  float far = length(base - eye.xy);
  // Retract plants softly before their heads enter the camera clearance disk.
  float clearance = agSmooth(.18, .34, far);
  size *= clearance;
  if (size <= 0.) { hide(); return; }
  float fade = simple > 0. ? 1. - agSmooth(5.5, 7.6, far) : 1.;
  if (fade <= 0. || dot(base - eye.xy, normalize(F.xy)) < -.6) { hide(); return; }
  // Conservative frustum bound includes the largest flower and pollen fan.
  vec3 bound = vec3(base, .12) - eye;
  float depthBound = dot(bound, F);
  if (depthBound > .4 && (abs(dot(bound, R)) > depthBound * agFit().x / (2. * agLens()) + .60 || abs(dot(bound, U)) > depthBound * agFit().y / (2. * agLens()) + .60)) { hide(); return; }
  // Continuous per-flower character from periodic noise of the spot position.
  vec2 lattice = spot.xy / 12.;
#ifdef PRECOMPUTED
  vec4 character = texelFetch(u_precomputed, ivec2(a_cell) + ivec2(0, 128), 0);
  float n1 = character.x, n2 = character.y, n3 = character.z, tone = character.w;
  float hero = axisData.w;
#else
  float n1 = agNoise(lattice, 32., 21u), n2 = agNoise(lattice * 1.5, 48., 22u);
  float n3 = agNoise(lattice * .5 + 7., 16., 23u), tone = agNoise(lattice * .375, 12., 24u);
  float hero = agSmooth(.62, .9, agNoise(lattice * .5 + 3., 16., 27u));
#endif
  float grow = .70 + .30 * agGrow(), bloom = agBloom(), level = agLevel();
  // A pinching spot (peanut) has a moderate Hessian anisotropy; a worm
  // segment is almost fully anisotropic and is not a division.
  float dividing = agSmooth(.50, .70, spot.w) * (1. - agSmooth(.80, .90, spot.w)) * agSmooth(.5, .9, size);
  float pollen = agPollen(base, eye.xy, F.xy);
  float feedCohort = (1. - agSmooth(.10, .23, abs(fract(tone - fract(u_rhythmCount.z * .618034) + .5) - .5))) * u_rhythm.z;
  float cohort = agCohort(base, eye.xy, F.xy);
  float flex = min(.8, cohort * (1. - agSmooth(.72, .90, u_rhythm.y)) * 2.2);
  float flare = .10 * flex + .25 * feedCohort;
  float openness = clamp(mix(.04, .38 + .30 * level, bloom) + .7 * flex + .55 * pollen - .38 * dividing * bloom, 0., .92);
  v_signal = vec3(agSapSelection(base, eye.xy, F.xy), pollen, flex);
  // Height, lean in a travelling wind wave, and a bow away from the camera.
  float nearCanopy = mix(.48, 1., agSmooth(.4, 1.3, far));
  float height = nearCanopy * (.045 + .09 * n1 + .095 * hero) * agRelief() * grow * (.55 + .45 * size) * clearance * (1. + pollen * .20);
  vec2 wdir = normalize(vec2(.8, .6));
  vec2 pf = base / AG_WS;
  float wave = sin(AG_TAU * (2. * pf.x + 3. * pf.y) - u_time * 1.4) * .5 + .5;
  float gust = .4 + .6 * agSmooth(.3, .9, level);
  vec2 lean = wdir * agSway() * (.10 + .28 * wave) * gust + (vec2(n2, n3) - .5) * .5;
  // Only the selected cohort bows and recovers; neighbours retain quiet wind.
  lean += R.xy * flex * .85;
  vec2 away = base - eye.xy;
  float near = length(away);
  lean += away / max(near, 1e-3) * max(0., .16 - near) * 7. / max(height, .02) * .02;
  vec3 head = vec3(base + lean * height, height * (1. - .25 * dot(lean, lean)));
  vec3 axis = normalize(vec3(lean * 1.4 + (vec2(n3, n1) - .5) * .5, 1.));
  float foreground = 1. - agSmooth(.65, 1.8, far);
  float petalLength = (1.10 + 1.20 * foreground) * (.021 + .018 * n2 + .060 * hero) * (.6 + .7 * clamp(u_params[3], 0., 1.25)) * (.28 + .72 * grow) * (.5 + .5 * size) * clearance;
  // Protect top/side defining edges; shaded lower lobes may overlap the frame.
  vec3 headView = head - eye;
  float headDepth = dot(headView, F);
  float frameRoom = min(headDepth * agFit().x / (2. * agLens()) - abs(dot(headView, R)), headDepth * agFit().y / (2. * agLens()) - dot(headView, U));
  petalLength *= agSmooth(0., petalLength * 1.5 + .015, frameRoom);
  v_surface = vec4(0., 0., tone, openness);
  v_event = vec4(dividing * bloom, flare, fade, hero);
  v_part = part;
  vec3 p, N = vec3(0., 0., 1.);
  vec3 toEye = normalize(eye - head);
  if (part == 0) {
    // Stem: a curved, tapered, camera-facing ribbon.
    float s = a_vertex.z;
    vec3 c = vec3(base + lean * height * s * s, height * s * (1. - .25 * dot(lean, lean)));
    vec3 tangent = normalize(vec3(lean * height * 2. * s, height) + 1e-5);
    vec3 side = normalize(cross(tangent, normalize(eye - c)));
    p = c + side * a_vertex.y * (.00065 + .00055 * size) * (1. - .68 * s);
    N = normalize(eye - c);
    v_surface.xy = vec2(a_vertex.y, s);
  } else if (part >= 1 && part <= 6) {
    // Corolla: bud = a closed lantern; open = overlapping elliptical lobes. A dividing spot stretches it
    // along the division axis, so the head pinches before it becomes two.
    vec3 b1 = agPerp(axis), b2 = cross(axis, b1);
    float a = a_vertex.y, v = a_vertex.z;
    float spin = n1 + .13 * n3;
    float theta = AG_TAU * (a + spin);
    float petal = a * ${f(PETALS)} - float(part - 1); // independent petal coordinates
    float k = float(part - 1);
    // Smooth per-petal character (wraps over the six petals).
    float centreAngle = AG_TAU * (k / ${f(PETALS)} + spin);
    float lift = .5 + .25 * sin(centreAngle + n2 * 6.) + .25 * sin(centreAngle * 2. + n3 * 6.);
    float az2 = theta + .0;
    vec3 radial = cos(az2) * b1 + sin(az2) * b2;
    float along = abs(dot(radial.xy, axisData.xy));
    float stretch = 1. + .55 * dividing * bloom * (2. * along * along - 1.);
    float L = petalLength * (.85 + .3 * lift) * stretch;
    float phi0 = mix(.08, .92 + .32 * n3, openness) + (lift - .5) * .48 * openness;
    float bulge = mix(.95, -.18, openness);
    float curl = (.14 + .42 * n2) * openness * (.6 + .8 * lift);
    vec3 P0 = agLobe(v, petal, head, axis, b1, b2, centreAngle, L, phi0, bulge, curl, openness);
    float ea = .004, ev = .004, nv = clamp(v, .006, .994);
    vec3 Pn = agLobe(nv, petal, head, axis, b1, b2, centreAngle, L, phi0, bulge, curl, openness);
    vec3 Pa = agLobe(nv, petal + ea, head, axis, b1, b2, centreAngle, L, phi0, bulge, curl, openness);
    vec3 Pv = agLobe(nv + ev, petal, head, axis, b1, b2, centreAngle, L, phi0, bulge, curl, openness);
    p = P0;
    N = normalize(cross(Pa - Pn, Pv - Pn) + 1e-10);
    v_surface.xy = vec2(petal * 2., v);
  } else if (part == 7) {
    // Core: a small glowing dome facing the eye.
    // A dividing core stretches along the division axis into two lobes.
    float r = petalLength * .10 * (.7 + .3 * openness);
    float split = dividing * bloom;
    vec3 aw = vec3(axisData.xy, 0.);
    vec3 cx = aw - toEye * dot(aw, toEye);
    cx = dot(cx, cx) > 1e-6 ? normalize(cx) : normalize(cross(toEye, vec3(0., 0., 1.)) + 1e-5);
    vec3 cy = cross(toEye, cx);
    p = head + axis * petalLength * .12 + (cx * a_vertex.y * (1. + 1.6 * split) + cy * a_vertex.z) * r;
    v_surface.xy = vec2(a_vertex.y * (1. + 1.6 * split), a_vertex.z);
  } else if (part < 30) {
    // Simple far flower: stem card and a head card facing the eye.
    vec3 cx = normalize(vec3(-toEye.y, toEye.x, 0.) + 1e-5);
    if (a_vertex.z <= 1.) {
      float s = a_vertex.z;
      p = vec3(base + lean * height * s * s, height * s) + cx * a_vertex.y * .0009;
      v_surface.xy = vec2(9., s);
    } else {
      vec3 cy = normalize(cross(cx, toEye));
      float r = petalLength * mix(.55, 1.15, openness);
      p = head + (cx * a_vertex.y + cy * (a_vertex.z - 3.)) * r;
      v_surface.xy = vec2(a_vertex.y, a_vertex.z - 3.);
    }
    N = toEye;
  } else if (part == 30) {
    float r = petalLength * (1.1 + .5 * openness) * (1. + .5 * flare);
    vec3 cx = normalize(cross(toEye, vec3(0., 0., 1.)) + 1e-5), cy = cross(cx, toEye);
    p = head + axis * petalLength * .2 + (cx * a_vertex.y + cy * a_vertex.z) * r;
    v_surface.xy = a_vertex.yz;
  } else if (part >= 33) {
    // Continuous eight-segment curves begin at the same opaque crown core.
    // Their ends lift and drift; tapered tails fade into the air above it.
    float emitter = agSmooth(.42, .52, n3) * (1. - agSmooth(.66, .74, n3));
    if (pollen * emitter < .005) { hide(); return; }
    float k = floor(float(part - 33) / ${f(TRAIL_SEGMENTS + 1)});
    float piece = mod(float(part - 33), ${f(TRAIL_SEGMENTS + 1)});
    bool moteHead = piece > ${f(TRAIL_SEGMENTS - 0.5)};
    float along = moteHead ? 1. : (piece + a_vertex.z * .5 + .5) / ${f(TRAIL_SEGMENTS)};
    float age = 1. - clamp(u_rhythm.w, 0., 1.);
    float phase = along * (.10 + .85 * age);
    float az = AG_TAU * (n2 + k * .382) + phase * 3.;
    float spreadRate = .09 + .17 * level;
    float spread = spreadRate * phase * (.3 + phase);
    vec3 origin = head + axis * petalLength * .12;
    vec3 c = origin + vec3(cos(az) * spread + .04 * phase, sin(az) * spread, (.27 + .08 * level) * phase);
    vec3 tangent = vec3(spreadRate * ((.3 + 2. * phase) * cos(az) - 3. * phase * (.3 + phase) * sin(az)) + .04, spreadRate * ((.3 + 2. * phase) * sin(az) + 3. * phase * (.3 + phase) * cos(az)), .27 + .08 * level);
    vec3 side = normalize(cross(toEye, tangent) + 1e-5);
    float width = max(.0012, far * 2.8 / (min(u_resolution.x, u_resolution.y) * agLens()));
    if (moteHead) {
      vec3 up = normalize(cross(side, toEye));
      p = c + (side * a_vertex.y + up * a_vertex.z) * width * 1.35;
      v_surface.xy = a_vertex.yz;
    } else {
      p = c + side * a_vertex.y * width * (.55 - .36 * along);
      v_surface.xy = vec2(a_vertex.y, along);
    }
    v_event.y = pollen * emitter * (1. - .5 * along) * agSmooth(0., .08, age);
  } else {
    // Pollen motes rise from open flowers on fixed-rate whole cycles.
    float k = float(part - 31);
    float phase = fract(u_time * .10 + n1 * 7. + k * .5);
    float motes = (.12 + .28 * agSmooth(.25 + .4 * k, .55 + .4 * k, level)) * (.35 + .65 * bloom);
    if (motes <= .01) { hide(); return; }
    vec3 c = head + vec3(wdir * agSway() * .08 * phase + (vec2(n2, n3) - .5) * .05 * phase, .015 + .16 * phase);
    vec3 cx = normalize(cross(toEye, vec3(0., 0., 1.)) + 1e-5);
    vec3 cy = cross(cx, toEye);
    p = c + cx * a_vertex.y * .0011 + cy * (a_vertex.z * .0011 - (a_vertex.z * .5 + .5) * .004);
    v_surface.xy = a_vertex.yz;
    v_event.y = motes * sin(3.14159 * phase);
  }
  v_world = p;
  v_normal = N;
  project(p, eye, R, U, F);
}
`;

const fragment = `#version 300 es
precision highp float;
precision highp int;
${geometryUniforms}
in vec3 v_world, v_normal;
in vec4 v_surface, v_event;
in vec3 v_signal;
flat in int v_part;
out vec4 outColor;
${sqHelper}${common}${pulse}
void main() {
  if (v_part < 0) discard;
  vec3 eye, R, U, F;
  agCamera(eye, R, U, F);
  vec3 V = normalize(eye - v_world);
  float dist = length(eye - v_world);
  vec3 N = normalize(v_normal);
  if (dot(N, V) < 0.) N = -N;
  vec3 L = agSun();
  float back = pow(max(0., dot(-V, L)), 2.);
  float grazing = pow(1. - abs(dot(N, V)), 2.);
  float tone = v_surface.z, openness = v_surface.w;
  float dividing = v_event.x, flare = v_event.y;
  float glow = agGlow();
  // Two flower kinds from the palette, with a narrow blend between them so
  // no grey in-between dominates: primary blooms and brightened secondary ones.
  // Petals glow along the same blackbody-like palette ramp as the sky: hot
  // at the base, saturated mid-tones, deep secondary at the tips. Two kinds
  // of flower: warm ones reach primary, cool ones top out in the mid-tones.
  float heatTop = mix(.62, .89, agSmooth(.34, .44, tone));
  vec3 bloomColor = agRamp(heatTop * .86) * 1.15;
  vec3 rimColor = agRamp(.82);
  vec3 tissue = agSat(u_secondary, 1.1) * .035;
  vec3 color;
  float alpha = 1.;
  if (v_part == 0) {
    float s = v_surface.y;
    float roundStem = sqrt(max(0., 1. - sq(v_surface.x)));
    float sap = agSapPacket(s * .40) * v_signal.x;
    color = tissue * (.5 + roundStem) + rimColor * (1. - roundStem) * back * .14 + bloomColor * .16 * pow(s, 4.) * glow;
    color += mix(u_secondary, u_primary, .35) * sap * .65;
  } else if (v_part >= 1 && v_part <= 6) {
    float u = v_surface.x, v = v_surface.y;
    // The silhouette is geometry, not a blade-shaped fragment cutout.
    float margin = agSmooth(.62, 1., abs(u));
    // Emission comes from inside the flower: bright at the base, veined,
    // fading to darker saturated tips; backlit edges glow, fronts stay darker.
    float midrib = exp(-sq(u / .055));
    float branches = pow(.5 + .5 * cos(abs(u) * 17. - v * 27.), 14.) * (1. - agSmooth(.65, 1., abs(u)));
    float veins = (midrib * .8 + branches * .28) * sin(3.14159 * v);
    float inner = exp(-v * 2.6) * (.45 + .55 * openness) + .34 * (1. - openness) * (1. - .55 * v);
    float translucency = .45 + .55 * tone;
    float petalHeat = heatTop * (1. - .48 * agSmooth(0., 1., v)) * (1. - .12 * margin);
    vec3 body = agRamp(petalHeat);
    color = tissue * (.4 + .6 * max(N.z, 0.));
    float fold = .42 + .58 * agSmooth(.02, .36, v);
    float diffuse = .42 + .58 * max(dot(N, L), 0.);
    color += body * (.60 + .85 * inner + veins * .65) * translucency * glow * (.85 + .15 * agGrow()) * diffuse * fold;
    color += u_secondary * (1. - openness) * (.10 + .20 * margin);
    color += u_secondary * (grazing * .20 + margin * .18) * (.35 + .65 * back) * (.35 + .65 * v);
    // One bounded packet: stem → midrib → a short segment of the margin.
    float veinTravel = agSapPacket(.40 + v * .36);
    float marginTravel = agSapPacket(.76 + (1. - v) * .24 + abs(u) * .10);
    float pulseRib = exp(-sq(u / .11));
    color += mix(u_secondary, u_primary, .65) * v_signal.x * (veinTravel * (pulseRib * .9 + branches * .70) + marginTravel * margin * .18) * 1.7;
    color *= mix(.66, 1., v_event.w);
    // Cool shadowed tissue remains visible beside the narrow warm throat.
    color += u_secondary * (.035 + .065 * v_event.w) * sin(3.14159 * v) * (1. - .65 * margin) * glow;
    color += u_accent * v_signal.y * (.35 + margin * .9 + inner * .3);
    color += bloomColor * flare * inner * .3;
    color += u_secondary * v_signal.z * (.15 + .20 * veins) * fold;
    vec3 flushed = u_accent * (.22 + .68 * diffuse * fold + .25 * veins + .12 * margin) * (.7 + .3 * inner);
    color = mix(color, flushed, min(1., v_signal.y * 1.25));
    color /= 1. + max(color.r, max(color.g, color.b)) * .22;
    color += u_accent * dividing * exp(-v * 7.) * .18;
  } else if (v_part == 7) {
    vec2 q = v_surface.xy;
    float lobe = 1.1 * dividing;
    float r2 = min(dot(q - vec2(lobe, 0.), q - vec2(lobe, 0.)), dot(q + vec2(lobe, 0.), q + vec2(lobe, 0.)));
    if (r2 > 1.) discard;
    float seeds = .78 + .22 * sin(q.x * 23.) * sin(q.y * 23.);
    color = u_primary * (.85 + .5 * flare) * glow * (.4 + .6 * openness) * (1. - .4 * r2) * seeds;
    color = mix(color, u_accent * 1.25, v_signal.y);
    color = mix(color, u_accent * (.4 + 1.4 * exp(-r2 * 3.)) * glow, dividing * .85);
  } else if (v_part == 22 || v_part == 23) {
    float s = v_surface.y;
    color = u_secondary * (.02 + .10 * s) + u_primary * pow(s, 5.) * (.065 + .14 * flare);
  } else if (v_part < 30) {
    vec2 q = v_surface.xy;
    if (q.x > 8.) {
      color = tissue * .5 + rimColor * back * .08;
    } else {
      // Six-lobed head silhouette; buds are narrow lanterns.
      float r = length(q * vec2(1., mix(1.6, 1., openness)));
      float a = atan(q.y, q.x);
      float lobes = mix(.72, .62 + .38 * pow(abs(cos(a * 3. + tone * 6.)), .6), openness);
      if (r > lobes) discard;
      float inner = exp(-r * 2.6);
      color = tissue + bloomColor * (inner * .6 + .08) * glow * (.35 + .65 * agGrow()) + rimColor * back * .12 * r;
      color += bloomColor * flare * .9 + mix(u_accent, vec3(1.), .1) * dividing * inner;
    }
  } else if (v_part == 30) {
    vec2 q = v_surface.xy;
    float h = exp(-dot(q, q) * 4.) * (1. - smoothstep(.7, 1., dot(q, q)));
    color = mix(bloomColor, mix(u_primary, vec3(1.), .2), .4) * h * (.04 + .08 * openness) * glow;
    color += u_accent * h * v_signal.y * .06;
  } else {
    vec2 q = v_surface.xy;
    bool trail = v_part >= 33 && (v_part - 33) % ${TRAIL_SEGMENTS + 1} != ${TRAIL_SEGMENTS};
    float h = trail
      ? exp(-sq(q.x) * 3.5) * (.75 - .45 * q.y)
      : exp(-dot(q, q) * 3.5) * (1. - smoothstep(.65, 1., length(q)));
    color = mix(u_primary, u_accent, v_part >= 33 ? .85 : .12) * h * flare * (v_part >= 33 ? 3.2 : .8) * glow;
  }
  color *= v_event.z;
  float fog = 1. - exp(-pow(dist / 5.5, 1.7));
  if (v_part >= 30) color *= 1. - fog;
  else color = mix(color, agHaze(-V), fog);
  outColor = vec4(max(color, vec3(0.)), alpha);
}
`;

const schema = [
  {
    key: "development",
    label: "Development · roots / petals / bloom",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "planting",
    label: "Planting density",
    min: 3,
    max: 12,
    step: 1,
    default: 6,
  },
  {
    key: "growth",
    label: "Growth speed",
    min: 0.2,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "petals",
    label: "Petal size",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "glow",
    label: "Bloom light",
    min: 0.35,
    max: 1.65,
    step: 0.01,
    default: 1,
  },
  {
    key: "altitude",
    label: "Camera altitude",
    min: 0.7,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
  {
    key: "relief",
    label: "Stem height",
    min: 0.3,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "sway",
    label: "Garden sway",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.2,
  },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    planting: 6,
    growth: 1,
    petals: 0.6,
    glow: 1,
    altitude: 1,
    relief: 1,
    sway: 0.2,
    ...params,
  },
});
export default {
  id: "afterglow",
  number: 100,
  name: "Afterglow Garden",
  description:
    "One Gray–Scott morphogen field as a meadow at dusk. Every flower is one living spot of the field; when the chemistry divides a spot, its flower pinches into two. Development grows buds out of the roots and opens them towards the afterglow while the camera rises, without resetting the field.",
  development: "development",
  schema,
  presets: [
    look("Glowing Roots", 5607, 0),
    look("Opening Petals", 5607, 1),
    look("Crowns at Dusk", 5607, 2),
    look("Root Horizon", 5608, 0.2, {
      planting: 4,
      altitude: 0.8,
      relief: 1.3,
    }),
    look("Petal Field", 5609, 1, { planting: 10, petals: 1, altitude: 1.2 }),
    look("Halfway to Bloom", 5610, 1.5, { planting: 8, glow: 1.2 }),
    look("Lantern Orchard", 5611, 2, {
      planting: 3,
      relief: 1.4,
      altitude: 0.85,
    }),
    look("Low Bloom", 5612, 1.8, {
      planting: 12,
      petals: 0.9,
      altitude: 0.75,
      sway: 0.5,
    }),
  ],
  stage: ["growth", "petals", "altitude"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    growth: { mul: [0.6, 1.3] },
    petals: [-0.15, 0.2],
    sway: [0.05, 0.6],
  },
  beat: { punch: 0.4, pulse: 0.8, inject: 0.8 },
  rhythmStyles: {
    restrained: "Sleeping petals",
    driving: "Nectar paths",
    accented: "Midnight flowering",
  },
  rhythm: [
    familyEffect(
      "vein-pulse",
      0,
      "Vein pulse",
      "Light runs along the glowing veins and petal margins.",
      {
        period: 4,
        strength: 0.6,
        steps: "X...",
        styles: {
          restrained: {
            steps: "..X..... | .....x.. | X....... | .......x",
            division: 2,
            strength: 0.5,
            duration: 1,
          },
          driving: {
            steps: "X..xX.x. | ..x.X..x",
            division: 2,
            strength: 0.76,
            duration: 0.35,
          },
          accented: {
            steps: "X..x.X..x..X..x. | ..x.X.x...X..xxx",
            division: 4,
            strength: 0.9,
            duration: 0.2,
          },
        },
      },
    ),
    familyEffect(
      "petal-cohort",
      1,
      "Petal-cohort light",
      "Select oriented petals in developed reaction crowns.",
      {
        period: 8,
        strength: 0.5,
        steps: "X.......",
        styles: {
          restrained: {
            steps: ".....x.. | ..X..... | ......x. | ...X....",
            division: 2,
            strength: 0.45,
            duration: 1.25,
          },
          driving: {
            steps: "...X...x | .X....x.",
            division: 2,
            strength: 0.7,
            duration: 0.75,
          },
          accented: {
            steps: ".....X......x... | ..X.........x... | ...X.......x....",
            division: 4,
            strength: 0.84,
            duration: 0.6,
          },
        },
      },
    ),
    familyEffect(
      "morphogen-feed",
      2,
      "Local morphogen feed",
      "Seed a bounded patch into the continuing garden chemistry.",
      {
        period: 16,
        strength: 0.55,
        duration: 0.25,
        kind: "simulation",
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | .......X | ........",
            division: 2,
            strength: 0.45,
            duration: 0.25,
          },
          driving: {
            steps: "........ | .......x | ........ | .....X..",
            division: 2,
            strength: 0.7,
            duration: 0.25,
          },
          accented: {
            steps:
              "................ | .............x.. | ................ | .........x.....X",
            division: 4,
            strength: 0.85,
            duration: 0.2,
          },
        },
      },
    ),
    familyEffect(
      "pollen-rising",
      3,
      "Pollen rising",
      "A patch of flowers unfurls and releases curved pollen trails into the afterglow.",
      {
        strength: 0.9,
        duration: 3,
        styles: {
          restrained: {
            steps: "X....... | ........ | ........ | x.......",
            division: 2,
            strength: 0.7,
            duration: 3,
          },
          driving: {
            steps: "........ | ......X. | ........ | ....X...",
            division: 2,
            strength: 0.9,
            duration: 2.75,
          },
          accented: {
            steps:
              "............X... | ..............x. | ............X... | ............x...",
            division: 4,
            strength: 1,
            duration: 2.5,
          },
        },
      },
    ),
  ],
  fragment: visual,
  precompute: { fragment: precompute, size: [CELLS, 3 * CELLS] },
  geometry: {
    create: flowerTemplate,
    attributes: [3],
    instances: { create: flowerInstances, attributes: [2] },
    additiveFrom: ADDITIVE_FROM,
    vertex,
    fragment,
  },
  simulation: {
    continuity: "gray-scott-uv16-v1",
    fragment: simulationFragment,
    size: [FIELD, FIELD],
    steps: 2,
    filter: "linear",
  },
};
