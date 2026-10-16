import { familyEffect } from "./family-rhythm.mjs";
import { morphogenSimulation } from "./scene-evolution.mjs";

// Afterglow Garden: one continuing Gray–Scott morphogen field seen as a dusk
// meadow. Every flower is one local maximum of the field ("a spot"); when the
// chemistry divides a spot, its flower pinches and becomes two. Development
// only grows and opens the plants and raises the camera: it never creates or
// removes a flower, and the field itself never resets.
//
// Passes: simulation (shared morphogen step, measured chemistry band, spore
// rain and single-hit local feed) → precompute (64² spot finder) → fullscreen
// visual (afterglow sky, wet soil, faint root under-glow, light pools) →
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
// The head is one lathe surface (no interpenetrating petals): 3 azimuth
// segments per petal, 4 along; petal outlines are cut in the fragment pass.
export const HEAD_AROUND = PETALS * 4,
  HEAD_ALONG = 3;
export const DETAIL_VERTICES =
  STEM_SEGMENTS * 6 + HEAD_AROUND * HEAD_ALONG * 6 + 6;
export const SIMPLE_VERTICES = FAR_IMAGES.length * 12;
export const ADDITIVE_FROM = DETAIL_VERTICES + SIMPLE_VERTICES;
export const TAIL_VERTICES = 18; // halo + two pollen motes
export const FLOWER_VERTICES = ADDITIVE_FROM + TAIL_VERTICES;

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// CPU mirror of agCamera() (eye height and pitch follow development).
export function gardenEye(development, altitude = 1) {
  const d = Math.max(0, Math.min(2, development));
  const z =
    (0.05 + 0.07 * smooth(0, 1, d) + 0.09 * smooth(1, 2, d)) * altitude;
  const pitch = -(0.07 + 0.03 * smooth(0, 1, d) + 0.06 * smooth(1, 2, d));
  return { z, pitch };
}

// Template vertex = (part, a, b); instance = (cellX, cellY).
// part 0 stem, 1 corolla, 7 core, 8+k simple image k, 30 halo, 31/32 pollen.
export function flowerTemplate() {
  const out = [];
  const quad = (part, a0, a1, b0, b1) =>
    out.push(
      part, a0, b0, part, a1, b0, part, a0, b1,
      part, a0, b1, part, a1, b0, part, a1, b1,
    );
  for (let s = 0; s < STEM_SEGMENTS; s++)
    quad(0, -1, 1, s / STEM_SEGMENTS, (s + 1) / STEM_SEGMENTS);
  for (let k = 0; k < PETALS; k++)
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < HEAD_ALONG; j++)
        quad(1 + k, (k + i / 4 - .5) / PETALS, (k + (i + 1) / 4 - .5) / PETALS, j / HEAD_ALONG, (j + 1) / HEAD_ALONG);
  quad(7, -1, 1, -1, 1);
  for (let k = 0; k < FAR_IMAGES.length; k++) {
    quad(8 + k, -1, 1, 0, 1); // stem card
    quad(8 + k, -1, 1, 2, 4); // head card (b - 3 in [-1, 1])
  }
  quad(30, -1, 1, -1, 1);
  quad(31, -1, 1, -1, 1);
  quad(32, -1, 1, -1, 1);
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
// deliberately small range (4.2×) so a one-bar drop is a gentle crane.
void agCameraAt(float time, out vec3 eye, out vec3 R, out vec3 U, out vec3 F) {
  float d = agDev();
  float yaw = .20 * sin(AG_TAU * fract(time / 180.)) + .06 * sin(AG_TAU * fract(time / 72.));
  vec2 heading = vec2(sin(yaw), cos(yaw));
  float altitude = clamp(u_params[5], .7, 1.4);
  vec2 track = AG_WS * vec2(.5 + .05 * sin(AG_TAU * fract(time / 120.)), fract(time / 96.));
  eye = vec3(track, (.05 + .07 * agSmooth(0., 1., d) + .09 * agSmooth(1., 2., d)) * altitude);
  float pitch = -(.07 + .03 * agSmooth(0., 1., d) + .06 * agSmooth(1., 2., d));
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
  return mix(c, mix(u_primary, vec3(1.), .45) * 1.45, agSmooth(.9, 1., h));
}
float agSector(vec2 dir) { return pow(.5 + .5 * dot(normalize(dir + 1e-6), normalize(agSun().xy)), 2.2); }
float agHeat(vec3 rd) {
  float sector = agSector(rd.xy);
  float e = max(rd.z + .012, 0.);
  return min(1., exp(-e / (.08 + .16 * sector)) * (.14 + .86 * sector) * 1.12);
}
vec3 agHaze(vec3 rd) { return agRamp(agHeat(vec3(rd.xy, 0.)) * .72) * .30; }
`;

const geometryUniforms = `uniform float u_time, u_level, u_kick;
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec3 u_primary, u_secondary, u_accent;
uniform vec4 u_rhythm, u_rhythmCount;
uniform highp uint u_seedBits;
uniform sampler2D u_state;
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif`;

// Wave of light (vein pulse): a front runs out from the near field through
// the flowers to the horizon; flowers behind it keep a decaying afterglow.
const pulse = `
float agPulse(float distanceFromEye) {
  float front = (1. - clamp(u_rhythm.x, 0., 1.)) * 7.;
  float ring = exp(-sq((distanceFromEye - front) / .35));
  return clamp(u_rhythm.x, 0., 1.) * (ring + .35 * step(distanceFromEye, front));
}
// Petal cohort: a band of flowers selected per event opens fully and flares.
float agCohort(float tone) {
  float pick = fract(u_rhythmCount.y * .618034);
  return clamp(u_rhythm.y, 0., 1.) * (1. - agSmooth(.08, .16, abs(fract(tone - pick + .5) - .5)));
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
  if (u_rhythmHit.z > .5) {
    float packet = gardenPatch(v_uv, u_time, u_rhythmCount.z + 17.);
    // One bounded nutrient packet, never repeated for the envelope lifetime.
    current = mix(current, vec2(.5, .26), packet * .7);
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
const precompute = `
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
    : vec4(cos(axis), sin(axis), best, 0.);
}
`;

// --------------------------------------------------- fullscreen sky and soil
const visual = `${common}${pulse}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
float agV(vec2 uv) { return unpack16(texture(u_state, uv)).y; }
vec3 agSkyBase(vec3 rd, float heat) {
  return agRamp(heat) * (.36 + .30 * agSector(rd.xy)) + agSat(u_secondary, 1.2) * .006 * (1. - heat);
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
    float ridge = .004 + .020 * agNoise(vec2(az * 24., 0.), 24., 9u) + .008 * agNoise(vec2(az * 80., 0.), 80., 10u);
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
    // Wet black soil reflecting the afterglow, broken by static micro relief.
    float grain = agNoise(uv * 768., 768., 11u) - .5;
    vec3 mirrored = normalize(vec3(rd.xy + grain * .05, -rd.z));
    vec3 refl = agSkyBase(mirrored, agHeat(mirrored));
    float fresnel = .02 + .5 * pow(1. - abs(rd.z), 6.);
    color = agSat(u_secondary, 1.1) * .004 + refl * fresnel * (.30 + .25 * agSmooth(.3, -.3, grain));
    // Broad root tissue with a thickness-dependent core, never an iso-outline.
    float roots = agSmooth(.12, .34, v) * (1. - .65 * agBloom());
    float sap = .65 + .35 * sin(uv.x * 43. + uv.y * 31. - u_time * .8);
    color += agSat(mix(u_secondary, u_primary, .55), 1.4) * roots * sap * .32 * agGlow();
    // Light pools below every flower (wide blur of the spot field).
    float lit = .25 + .75 * agGrow();
    float pools = agSmooth(.06, .28, vp);
    color += mix(u_primary, agSat(mix(u_secondary, u_primary, .5), 1.5), .4) * pools * lit * .09 * agGlow();
    float front = (1. - clamp(u_rhythm.x, 0., 1.)) * 7.;
    color += u_primary * pools * clamp(u_rhythm.x, 0., 1.) * exp(-sq((t - front) / .3)) * .05;
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
out vec4 v_event;   // (dividing, flare, fade, size)
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
void hide() { gl_Position = vec4(2., 2., 2., 1.); v_part = -1; }
void project(vec3 p, vec3 eye, vec3 R, vec3 U, vec3 F) {
  vec3 q = p - eye;
  float depth = dot(q, F);
  gl_Position = vec4(vec2(dot(q, R), dot(q, U)) * agLens() * 2. / agFit(), depth * 1.00501253 - .02005013, depth);
}
void main() {
  int part = int(a_vertex.x + .5);
#ifdef PRECOMPUTED
  vec4 spot = texelFetch(u_precomputed, ivec2(a_cell), 0);
  vec4 axisData = texelFetch(u_precomputed, ivec2(a_cell) + ivec2(0, ${CELLS}), 0);
#else
  // No float target: continuous concentration-driven seed lanterns still grow.
  vec2 at = (a_cell + .5) * 6.;
  float peak = unpack16(texture(u_state, at / AG_N)).y;
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
  float fade = simple > 0. ? 1. - agSmooth(5.5, 7.6, far) : 1.;
  if (fade <= 0. || dot(base - eye.xy, normalize(F.xy)) < -.6) { hide(); return; }
  // Continuous per-flower character from periodic noise of the spot position.
  vec2 lattice = spot.xy / 12.;
  float n1 = agNoise(lattice, 32., 21u), n2 = agNoise(lattice * 1.5, 48., 22u);
  float n3 = agNoise(lattice * .5 + 7., 16., 23u), tone = agNoise(lattice * .375, 12., 24u);
  float grow = .16 + .84 * agGrow(), bloom = agBloom(), level = agLevel();
  // A pinching spot (peanut) has a moderate Hessian anisotropy; a worm
  // segment is almost fully anisotropic and is not a division.
  float dividing = agSmooth(.50, .70, spot.w) * (1. - agSmooth(.80, .90, spot.w)) * agSmooth(.5, .9, size);
  float flare = agPulse(far) + agCohort(tone);
  float openness = clamp(mix(.04, .72 + .30 * level, bloom) + .34 * agCohort(tone) * (.25 + .75 * bloom) - .38 * dividing * bloom, 0., 1.);
  // Height, lean in a travelling wind wave, and a bow away from the camera.
  float height = (.028 + .055 * n1 + .04 * agSmooth(.62, .9, agNoise(lattice * .5 + 3., 16., 27u))) * agRelief() * grow * (.55 + .45 * size);
  vec2 wdir = normalize(vec2(.8, .6));
  vec2 pf = base / AG_WS;
  float wave = sin(AG_TAU * (2. * pf.x + 3. * pf.y) - u_time * 1.4) * .5 + .5;
  float gust = .4 + .6 * agSmooth(.3, .9, level);
  vec2 lean = wdir * agSway() * (.10 + .28 * wave) * gust + (vec2(n2, n3) - .5) * .5;
  vec2 away = base - eye.xy;
  float near = length(away);
  lean += away / max(near, 1e-3) * max(0., .16 - near) * 7. / max(height, .02) * .02;
  vec3 head = vec3(base + lean * height, height * (1. - .25 * dot(lean, lean)));
  vec3 axis = normalize(vec3(lean * 1.4 + (vec2(n3, n1) - .5) * .5, 1.));
  float hero = agSmooth(.62, .9, agNoise(lattice * .5 + 3., 16., 27u));
  float petalLength = (.021 + .018 * n2 + .060 * hero) * (.6 + .7 * clamp(u_params[3], 0., 1.25)) * (.28 + .72 * grow) * (.5 + .5 * size);
  v_surface = vec4(0., 0., tone, openness);
  v_event = vec4(dividing * bloom, flare, fade, size);
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
    // Corolla: bud = a closed lantern (base flares out, tips curve in); open =
    // a cup of separate petals whose tips flare. A dividing spot stretches it
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
    float phi0 = mix(.24, 1.04, openness) + (lift - .5) * .48 * openness;
    float bulge = mix(.46, -.18, openness);
    float curl = (.12 + .65 * n2) * openness * (.6 + .8 * lift);
    float rib = .07 * (1. - 4. * petal * petal) * agSmooth(0., .5, v) * (.4 + .6 * openness);
    vec3 P0 = agCorolla(v, head, axis, radial, L, phi0, bulge, curl, rib);
    float ea = .02, ev = .04;
    float t1 = AG_TAU * (a + ea + spin);
    vec3 Pa = agCorolla(v, head, axis, cos(t1) * b1 + sin(t1) * b2, L, phi0, bulge, curl, .07 * (1. - 4. * sq(fract((a + ea) * ${f(PETALS)} + .5) - .5)) * agSmooth(0., .5, v) * (.4 + .6 * openness));
    vec3 Pv = agCorolla(v + ev, head, axis, radial, L, phi0, bulge, curl, rib);
    p = P0;
    N = normalize(cross(Pa - P0, Pv - P0) + 1e-7);
    v_surface.xy = vec2(petal * 2., v);
  } else if (part == 7) {
    // Core: a small glowing dome facing the eye.
    // A dividing core stretches along the division axis into two lobes.
    float r = petalLength * .17 * (.7 + .3 * openness);
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
  } else {
    // Pollen motes rise from open flowers on fixed-rate whole cycles.
    float k = float(part - 31);
    float phase = fract(u_time * .10 + n1 * 7. + k * .5);
    float motes = agSmooth(.25 + .4 * k, .55 + .4 * k, level) * bloom * openness;
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
flat in int v_part;
out vec4 outColor;
${sqHelper}${common}
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
  float heatTop = mix(.64, .97, agSmooth(.34, .44, tone));
  vec3 bloomColor = agRamp(heatTop * .86) * 1.15;
  vec3 rimColor = agRamp(.82);
  vec3 tissue = agSat(u_secondary, 1.1) * .035;
  vec3 color;
  float alpha = 1.;
  if (v_part == 0) {
    float s = v_surface.y;
    float roundStem = sqrt(max(0., 1. - sq(v_surface.x)));
    color = tissue * (.5 + roundStem) + rimColor * (1. - roundStem) * back * .14 + bloomColor * .24 * pow(s, 4.) * glow;
  } else if (v_part >= 1 && v_part <= 6) {
    float u = v_surface.x, v = v_surface.y;
    // Petal outlines: a closed bud keeps only six notches at its tip, an
    // open flower separates into pointed, rounded petals.
    float shape = pow(max(sin(3.14159 * (.06 + .94 * v)), 0.), .5);
    float width = mix(1.02 - .40 * agSmooth(.80, 1., v), shape * .87, agSmooth(.15, .7, openness));
    if (abs(u) > width) discard;
    float margin = agSmooth(.6, 1., abs(u) / max(width, .05));
    // Emission comes from inside the flower: bright at the base, veined,
    // fading to darker saturated tips; backlit edges glow, fronts stay darker.
    float veins = pow(.5 + .5 * cos(u * 9.4 + v * 2.), 6.) * (1. - v);
    float inner = exp(-v * 2.6) * (.45 + .55 * openness) + .34 * (1. - openness) * (1. - .55 * v);
    float translucency = .45 + .55 * tone;
    float petalHeat = heatTop * (1. - .48 * agSmooth(0., 1., v)) * (1. - .12 * margin);
    vec3 body = agRamp(petalHeat);
    color = tissue * (.4 + .6 * max(N.z, 0.));
    color += body * (.55 + .95 * inner + veins * .35) * translucency * glow * (.6 + .4 * agGrow());
    color += agRamp(petalHeat + .07) * (grazing * .30 + margin * .22) * (.12 + 1.1 * back) * (.35 + .65 * v);
    color += bloomColor * flare * (inner + .4) * .9;
    color += mix(u_accent, vec3(1.), .1) * dividing * exp(-v * 5.) * .35;
  } else if (v_part == 7) {
    vec2 q = v_surface.xy;
    float lobe = 1.1 * dividing;
    float r2 = min(dot(q - vec2(lobe, 0.), q - vec2(lobe, 0.)), dot(q + vec2(lobe, 0.), q + vec2(lobe, 0.)));
    if (r2 > 1.) discard;
    color = mix(u_primary, vec3(1.), .35) * (1.4 + 1.6 * flare) * glow * (.4 + .6 * openness) * (1. - .4 * r2);
    color = mix(color, u_accent * (.4 + 1.4 * exp(-r2 * 3.)) * glow, dividing * .85);
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
      color = tissue + bloomColor * (inner * .9 + .1) * glow * (.35 + .65 * agGrow()) + rimColor * back * .4 * r;
      color += bloomColor * flare * .9 + mix(u_accent, vec3(1.), .1) * dividing * inner;
    }
  } else if (v_part == 30) {
    vec2 q = v_surface.xy;
    float h = exp(-dot(q, q) * 4.) * (1. - smoothstep(.7, 1., dot(q, q)));
    color = mix(bloomColor, mix(u_primary, vec3(1.), .2), .4) * h * (.04 + .08 * openness) * glow;
    color += bloomColor * h * flare * .6;
  } else {
    vec2 q = v_surface.xy;
    float h = exp(-q.x * q.x * 3.) * (1. - smoothstep(.6, 1., abs(q.y)));
    color = mix(u_primary, vec3(1.), .3) * h * flare * .8 * glow;
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
  rhythmStyles: { restrained: "Sleeping petals", driving: "Nectar paths", accented: "Midnight flowering" },
  rhythm: [
    familyEffect(
      "vein-pulse",
      0,
      "Vein pulse",
      "Light runs along the glowing veins and petal margins.",
      { period: 4, strength: 0.6, steps: "X...", styles: {
        restrained: { steps: "..X..... | .....x.. | X....... | .......x", division: 2, strength: 0.5, duration: 1 },
        driving: { steps: "X..xX.x. | ..x.X..x", division: 2, strength: 0.76, duration: 0.35 },
        accented: { steps: "X..x.X..x..X..x. | ..x.X.x...X..xxx", division: 4, strength: 0.9, duration: 0.2 },
      } },
    ),
    familyEffect(
      "petal-cohort",
      1,
      "Petal-cohort light",
      "Select oriented petals in developed reaction crowns.",
      { period: 8, strength: 0.5, steps: "X.......", styles: {
        restrained: { steps: ".....x.. | ..X..... | ......x. | ...X....", division: 2, strength: 0.45, duration: 1.25 },
        driving: { steps: "...X...x | .X....x.", division: 2, strength: 0.7, duration: 0.75 },
        accented: { steps: ".....X......x... | ..X.........x... | ...X.......x....", division: 4, strength: 0.84, duration: 0.6 },
      } },
    ),
    familyEffect(
      "morphogen-feed",
      2,
      "Local morphogen feed",
      "Seed a bounded patch into the continuing garden chemistry.",
      { period: 16, strength: 0.55, duration: 0.25, kind: "simulation", steps: "X...............", styles: {
        restrained: { steps: "........ | ........ | .......X | ........", division: 2, strength: 0.45, duration: 0.25 },
        driving: { steps: "........ | .......x | ........ | .....X..", division: 2, strength: 0.7, duration: 0.25 },
        accented: { steps: "................ | .............x.. | ................ | .........x.....X", division: 4, strength: 0.85, duration: 0.2 },
      } },
    ),
  ],
  fragment: visual,
  precompute: { fragment: precompute, size: [CELLS, 2 * CELLS] },
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
