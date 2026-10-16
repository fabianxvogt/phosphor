import { familyEffect } from "./family-rhythm.mjs";
import {
  glsl,
  RIBBONS,
  HISTORY,
  ROWS,
  PER_RIBBON,
  SUBSTEPS,
  SAMPLES_PER_SECOND,
  NEAR_FADE,
} from "./ribbons-geometry.mjs";

// Attractor Ribbons (#97): hundreds of lit ribbons, each the recent history
// of one exact trajectory. Every ribbon is integrated at the same time in the
// Lorenz, Aizawa and Thomas flows (fixed-step RK4 on the GPU); development
// blends each ribbon between its own trajectories, so the butterfly's wings
// unfold into Aizawa's vortex and then into Thomas's labyrinth without a cut.
//
// State (RGBA8, HISTORY × ROWS): column j is the sample j steps behind the
// head. Row 6r + 2k (+1) holds ribbon r in flow k: x, y (+ z, generation) as
// 16-bit fractions of the flow's box. The last row holds 24-bit globals:
// 0 the step accumulator, 1 camera yaw, 2 camera drift, 3 light pulses.
// When the accumulator passes a whole step, every column shifts back by one
// and the heads advance one sample; the vertex pass draws the fraction in
// between, so speed changes never jump and the ribbon shape is the same at
// every speed.

const simulation = `
${glsl}
vec4 rbPack24(float x) {
  float n = floor(fract(x) * 16777216.);
  float b0 = floor(n / 65536.); n -= b0 * 65536.;
  float b1 = floor(n / 256.); n -= b1 * 256.;
  return vec4(b0, b1, n, 255.) / 255.;
}
uint rbHash(uint v) { v ^= v >> 16u; v *= 2246822519u; v ^= v >> 13u; v *= 3266489917u; return v ^ (v >> 16u); }
float rbRand(uint a, uint b) { return float(rbHash(a ^ rbHash(b ^ u_seedBits)) >> 8u) / 16777216.; }
vec3 rbFlow(int k, vec3 p) {
  if (k == 0) return vec3(10. * (p.y - p.x), p.x * (28. - p.z) - p.y, p.x * p.y - 8. / 3. * p.z);
  if (k == 1) {
    float zb = p.z - .7;
    return vec3(zb * p.x - 3.5 * p.y, 3.5 * p.x + zb * p.y,
                .6 + RB_K[1] * p.z - p.z * p.z * p.z / 3. - dot(p.xy, p.xy) * (1. + .25 * p.z) + .1 * p.z * p.x * p.x * p.x);
  }
  return sin(p.yzx) - RB_K[2] * p;
}
vec3 rbRk4(int k, vec3 p, float h) {
  vec3 a = rbFlow(k, p), b = rbFlow(k, p + .5 * h * a), c = rbFlow(k, p + .5 * h * b), d = rbFlow(k, p + h * c);
  return p + h / 6. * (a + 2. * (b + c) + d);
}
vec3 rbSample(int k, vec3 p) {
  for (int i = 0; i < ${SUBSTEPS}; i++) p = rbRk4(k, p, RB_H[k]);
  return p;
}
// A seeded start in the flow's basin, run onto the attractor.
vec3 rbSpawn(int k, uint r, uint salt) {
  vec3 d = vec3(rbRand(r, salt), rbRand(r, salt + 1u), rbRand(r, salt + 2u)) * 2. - 1.;
  vec3 p = RB_INIT_CENTER[k] + RB_INIT_RADIUS[k] * d * .577;
  for (int i = 0; i < 96; i++) p = rbRk4(k, p, RB_INIT_H[k]);
  return p;
}
vec4 rbEncode(int k, vec3 p, float generation, int c) {
  vec3 n = clamp((p - RB_LO[k]) / (RB_HI[k] - RB_LO[k]), 0., 1.);
  return c == 0 ? pack16(n.xy) : pack16(vec2(n.z, generation));
}
vec3 rbDecode(int k, ivec2 cell) {
  vec4 a = texelFetch(u_state, ivec2(cell.x, cell.y - cell.y % 2), 0);
  vec4 b = texelFetch(u_state, ivec2(cell.x, cell.y - cell.y % 2 + 1), 0);
  return RB_LO[k] + vec3(unpack16(a), unpack16(b.rg)) * (RB_HI[k] - RB_LO[k]);
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec4 globals = texelFetch(u_state, ivec2(0, GLOBAL_ROW), 0);
  float acc = u_reset ? 0. : rbUnpack24(globals);
  float rate = clamp(u_params[1] * ${(SAMPLES_PER_SECOND / 60).toFixed(4)}, 0., .98);
  bool advance = acc + rate >= 1.;
  if (cell.y == GLOBAL_ROW) {
    float value = u_reset ? fract(u_seed * (.0131 + .0077 * float(cell.x))) : rbUnpack24(texelFetch(u_state, cell, 0));
    float speed = cell.x == 0 ? rate
                : cell.x == 1 ? u_params[3] * .016 / 60.
                : cell.x == 2 ? .0042 / 60.
                : (.25 + u_params[5]) * .4 / 60.;
    outColor = rbPack24(cell.x == 0 && u_reset ? 0. : value + speed);
    return;
  }
  int r = cell.y / 6, k = (cell.y % 6) / 2, c = cell.y % 2;
  if (u_reset) {
    // Fill the whole history at once: column j lies HISTORY − 1 − j samples
    // after the spawn, so ribbons are complete from the first frame.
    vec3 p = rbSpawn(k, uint(r), uint(k) * 7u);
    int steps = HISTORY - 1 - cell.x;
    for (int i = 0; i < ${HISTORY}; i++) { if (i >= steps) break; p = rbSample(k, p); }
    outColor = rbEncode(k, p, 0., c);
    return;
  }
  if (!advance) { outColor = texelFetch(u_state, cell, 0); return; }
  if (cell.x > 0) { outColor = texelFetch(u_state, cell - ivec2(1, 0), 0); return; }
  vec3 p = rbSample(k, rbDecode(k, cell));
  float generation = unpack16(texelFetch(u_state, ivec2(0, cell.y - c + 1), 0).ba);
  if (any(lessThanEqual(p, RB_LO[k])) || any(greaterThanEqual(p, RB_HI[k])) || any(isnan(p))) {
    // Escaped (never observed; a safeguard): respawn and mark a new generation
    // so the vertex pass never joins the old tail to the new head.
    p = rbSpawn(k, uint(r), uint(u_tick) * 3u + 11u);
    generation = fract(generation + 1. / 65535.);
  }
  outColor = rbEncode(k, p, generation, c);
}
`;

const ground = `
vec3 ground(vec2 frag) {
  vec2 p = (frag - .5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float glow = exp(-dot(p, p) * 2.2);
  return mix(u_secondary * .01, mix(u_secondary, u_primary, .25) * .05, glow);
}
`;

const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in float a_rank;
uniform float u_params[8];
uniform vec2 u_resolution;
uniform float u_kick, u_level;
uniform vec4 u_rhythm, u_rhythmCount;
uniform sampler2D u_state;
uniform vec3 u_primary, u_secondary, u_accent;
out vec3 v_side, v_toCam, v_color;
out float v_across, v_s, v_fog, v_cover, v_speed, v_head, v_glow;
flat out float v_rank;
const float PI = 3.14159265359, TAU = 6.28318530718;
${glsl}
float global(int i) { return rbUnpack24(texelFetch(u_state, ivec2(i, GLOBAL_ROW), 0)); }
vec4 rbTexel(int r, int k, int j, int c) { return texelFetch(u_state, ivec2(j, r * 6 + k * 2 + c), 0); }
// Canonical position of ribbon r in flow k at sample j, plus its generation.
vec4 rbPoint(int r, int k, int j) {
  vec4 a = rbTexel(r, k, j, 0), b = rbTexel(r, k, j, 1);
  vec3 p = RB_LO[k] + vec3(rbUnpack16(a.rg), rbUnpack16(a.ba), rbUnpack16(b.rg)) * (RB_HI[k] - RB_LO[k]);
  return vec4(RB_SCALE[k] * (RB_FRAME[k] * (p - RB_CENTER[k])), rbUnpack16(b.ba));
}
// Interpolated position at fractional sample u; w = 0 marks a broken segment.
vec4 rbAt(int r, int k, float u) {
  int j = int(floor(u));
  vec4 a = rbPoint(r, k, j), b = rbPoint(r, k, j + 1);
  return vec4(mix(a.xyz, b.xyz, u - float(j)), a.w == b.w ? 1. : 0.);
}
vec3 palette(float t) { return mix(mix(u_secondary,u_primary,smoothstep(0.,.65,t)),u_accent,smoothstep(.65,1.,t)); }
void main() {
  gl_Position = vec4(2., 2., 2., 1.);
  int r = gl_VertexID / PER_RIBBON, local = gl_VertexID - r * PER_RIBBON;
  int quad = local / 6, corner = local - quad * 6;
  int du = corner == 1 || corner == 4 || corner == 5 ? 1 : 0;
  float side = corner == 2 || corner == 3 || corner == 5 ? 1. : -1.;
  float dev = clamp(u_params[0], 0., 2.);
  // Development shows more ribbons: sparse wings, fuller vortex, labyrinth.
  float shown = .42 + .26 * smoothstep(.1, 1., dev) + .2 * smoothstep(1.1, 2., dev);
  float presence = smoothstep(a_rank, a_rank + .06, shown + .06 * (1. - a_rank) - .0001);
  if (presence <= 0.) return;
  int ka = min(int(dev), 1);
  float w = smoothstep(0., 1., dev - float(ka));
  // At the top state only Thomas is visible: read one flow, not two.
  if (w >= 1.) { ka = 2; w = 0.; }

  float s = float(quad + du) / float(SEGMENTS);
  float span = clamp(u_params[2], .2, 1.) * float(HISTORY - 4);
  float f = global(0);
  float u = 1. + s * span + 1. - f;
  vec4 p0 = rbAt(r, ka, u), pm = rbAt(r, ka, u - .5), pp = rbAt(r, ka, u + .5);
  if (w > 0.) {
    vec4 q0 = rbAt(r, ka + 1, u), qm = rbAt(r, ka + 1, u - .5), qp = rbAt(r, ka + 1, u + .5);
    p0 = vec4(mix(p0.xyz, q0.xyz, w), w < 1. ? p0.w * q0.w : q0.w);
    pm.xyz = mix(pm.xyz, qm.xyz, w); pp.xyz = mix(pp.xyz, qp.xyz, w);
  }
  vec3 P = p0.xyz, T = pp.xyz - pm.xyz;
  float speed = length(T) / mix(RB_VREF[ka], RB_VREF[min(ka + 1, 2)], w);
  T = length(T) > 1e-6 ? normalize(T) : vec3(1., 0., 0.);

  // Camera (mirrors camera() in ribbons-geometry.mjs).
  float mid = smoothstep(0., 1., dev), peak = smoothstep(1., 2., dev);
  float yaw = .7 + (.6 + .9 * mid) * sin(TAU * global(1)), drift = TAU * global(2);
  float dist = u_params[7] * mix(mix(3., 2.9, mid), 2.45, peak) * (1. + .1 * peak * sin(2. * yaw + drift));
  float pitch = clamp(.12 + .2 * mid + (u_params[6] - .35) + (.1 + .12 * peak) * sin(drift), -.4, 1.3);
  vec3 eye = dist * vec3(cos(pitch) * cos(yaw), sin(pitch), cos(pitch) * sin(yaw));
  vec3 target = vec3(.15 * peak * sin(1.3 * yaw + .5), -.14 * (1. - mid) - .04 * peak + .08 * peak * sin(drift), .15 * peak * cos(1.3 * yaw + .5));
  float roll = .09 * peak * sin(1.7 * drift + 1.);
  vec3 fwd = normalize(target - eye);
  vec3 right = normalize(cross(fwd, vec3(sin(roll), cos(roll), 0.)));
  vec3 up = cross(right, fwd);
  float focal = mix(mix(2.1, 1.75, mid), 1.72, peak) * (1. + .022 * u_kick);
  focal *= mix(.88, 1., smoothstep(.7, 1.2, u_resolution.x / u_resolution.y));
  float minSide = min(u_resolution.x, u_resolution.y);

  // A camera-facing band, shaded as a tube (see the surface pass).
  vec3 toCam = eye - P;
  float depth = max(.05, dot(P - eye, fwd));
  vec3 W = cross(T, toCam);
  W = length(W) > 1e-6 ? normalize(W) : right;
  float head = 1. - smoothstep(0., .035, s);
  // A few broad foreground trajectories against many fine tracers give
  // scale without changing seeded ranks, population or integration.
  float weight = mix(.6, 1.65, pow(1. - a_rank, 2.));
  float width = .018 * u_params[4] * (1. + .18 * peak) * weight * mix(1., .3, s) * (1. - .75 * head * head) * presence * p0.w;
  width *= smoothstep(${NEAR_FADE[0].toFixed(2)}, ${NEAR_FADE[1].toFixed(2)}, depth);
  float minWidth = 1.2 * depth / (focal * .5 * minSide);
  v_cover = clamp(width / minWidth, 0., 1.);
  width = width > 1e-5 ? max(width, minWidth) : 0.;
  vec3 world = P + side * width * W;
  vec3 rel = world - eye;
  vec3 view = vec3(dot(rel, right), dot(rel, up), -dot(rel, fwd));
  float near = .04, far = 30.;
  gl_Position = vec4(view.x * focal * minSide / u_resolution.x, view.y * focal * minSide / u_resolution.y,
                     (view.z * (far + near) + 2. * far * near) / (near - far), -view.z);
  // Ribbons on one surface (Aizawa's sphere) get a stable order, not z-fighting.
  gl_Position.z += a_rank * 2e-4 * gl_Position.w;
  // Keep W unsigned: v_across supplies the sign exactly once. Multiplying
  // both here and in the surface folded both halves onto the same normal.
  v_side = vec3(dot(W, right), dot(W, up), -dot(W, fwd));
  vec3 c = normalize(toCam);
  v_toCam = vec3(dot(c, right), dot(c, up), -dot(c, fwd));
  v_across = side;
  v_s = s;
  v_fog = (depth - dist) * (1. + .6 * peak); // stronger depth layering in the labyrinth
  v_speed = clamp(speed, 0., 2.);
  v_head = head;
  v_rank = a_rank;
  // Colour: speed along the flow picks the palette (fast = light), the rank
  // shifts it a little so neighbouring ribbons separate.
  v_color = palette(min(.62, .06 + .3 * smoothstep(.1, 1.4, speed) + .28 * a_rank)) * (1. + .25 * peak);
  // Rhythm: x one cohort of whole ribbons, y light running down every
  // ribbon at once, z a burst at the heads.
  float cohort = step(mod(floor(a_rank * 24.) - u_rhythmCount.x, 4.), .5);
  v_glow = u_rhythm.x * cohort;
}`;

const surface = `#version 300 es
precision highp float;
in vec3 v_side, v_toCam, v_color;
in float v_across, v_s, v_fog, v_cover, v_speed, v_head, v_glow;
flat in float v_rank;
uniform float u_params[8];
uniform vec2 u_resolution;
uniform vec3 u_primary, u_secondary, u_accent;
uniform vec4 u_rhythm, u_rhythmCount;
uniform sampler2D u_state;
out vec4 outColor;
const float PI = 3.14159265359, TAU = 6.28318530718;
${ground}
float rbUnpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
void main() {
  // Tube impostor: the band's cross coordinate bends the normal round.
  float a = clamp(v_across, -1., 1.);
  vec3 N = normalize(normalize(v_side) * a + normalize(v_toCam) * sqrt(max(0., 1. - a * a)));
  vec3 V = normalize(v_toCam);
  vec3 L = normalize(vec3(-.5, .75, .45));
  float diffuse = max(0., dot(N, L)), wrap = .5 + .5 * dot(N, L);
  float fresnel = pow(1. - max(0., dot(N, V)), 2.5);
  float spec = pow(max(0., dot(N, normalize(L + V))), 36.);
  vec3 base = v_color;
  // Tails fade into the dark; heads carry the light.
  float life = pow(1. - v_s, 1.1);
  vec3 color = base * (.06 + 1.2 * diffuse + .22 * wrap) * (.35 + .65 * life);
  // A little self-light: ribbons are light, not paint.
  color += base * .22 * life;
  color += mix(mix(u_secondary, vec3(1.), .35), u_accent, .2) * fresnel * .45 * life;
  color += mix(base, vec3(1.), .6) * spec * .9 * life;
  // Flowing light: pulses run from tail to head along every ribbon.
  float pulse = rbUnpack24(texelFetch(u_state, ivec2(3, ${RIBBONS * 6}), 0));
  float wave = pow(.5 + .5 * cos(TAU * (v_s * (2. + 4. * u_params[5]) + pulse * 3. + v_rank * 7.)), 18.);
  color += mix(base, vec3(1.), .35) * wave * (.15 + .5 * u_params[5]) * life;
  float run = pow(.5 + .5 * cos(TAU * (v_s * 1.5 + pulse * 6.)), 30.);
  color += mix(base, u_accent, .4) * run * u_rhythm.y * .9 * life;
  // Heads: a small accent spark (rare, ≤ a few % of lit pixels).
  color += mix(u_accent, vec3(1.), .3) * v_head * (.5 + .9 * u_rhythm.z);
  color = mix(color, mix(base, u_accent, .5) * 1.4, .5 * v_glow * life);
  color *= v_cover;
  vec3 g = ground(gl_FragCoord.xy);
  float fog = 1. - exp(-max(0., v_fog + .9) * .55);
  color = mix(color, g, clamp(fog, 0., .9));
  // Soft silhouettes: the band's edges fade into the ground over ~a pixel.
  float edge = 1. - abs(a);
  color = mix(g, color, smoothstep(0., max(fwidth(edge) * 1.5, .02), edge));
  outColor = vec4(pow(max(color, vec3(0.)), vec3(.92)), 1.);
}`;

const schema = [
  { key: "development", label: "Development · wings / vortex / labyrinth", min: 0, max: 2, step: 0.01, default: 0 },
  { key: "flow", label: "Flow speed", min: 0, max: 1.9, step: 0.01, default: 1 },
  { key: "length", label: "Ribbon length", min: 0.2, max: 1, step: 0.01, default: 0.7 },
  { key: "orbit", label: "Camera orbit", min: -1, max: 1, step: 0.01, default: 0.4 },
  { key: "thickness", label: "Ribbon width", min: 0.5, max: 1.8, step: 0.01, default: 1 },
  { key: "pulses", label: "Light pulses", min: 0, max: 1, step: 0.01, default: 0.4 },
  { key: "elevation", label: "Camera elevation", min: 0, max: 1, step: 0.01, default: 0.35 },
  { key: "distance", label: "Camera distance", min: 0.85, max: 1.3, step: 0.01, default: 1 },
];

const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    flow: 1,
    length: 0.7,
    orbit: 0.4,
    thickness: 1,
    pulses: 0.4,
    elevation: 0.35,
    distance: 1,
    ...params,
  },
});

export default {
  id: "ribbons",
  number: 97,
  name: "Attractor Ribbons",
  description:
    "Hundreds of lit ribbons, each the recent path of one exact trajectory. Every ribbon flows in the Lorenz, Aizawa and Thomas systems at once; development carries the same ribbons from the butterfly's wings through Aizawa's vortex into Thomas's labyrinth.",
  development: "development",
  schema,
  presets: [
    look("Butterfly Wings", 9701, 0),
    look("Aizawa Vortex", 9701, 1),
    look("Thomas Labyrinth", 9701, 2),
    look("Long Exposure", 9702, 0, { flow: 0.6, length: 1, thickness: 0.75, pulses: 0.15, elevation: 0.55 }),
    look("Vortex from Below", 9703, 1, { elevation: 0.05, orbit: -0.35, thickness: 1.3, distance: 0.92 }),
    look("Labyrinth Rush", 9704, 2, { flow: 1.6, length: 0.55, orbit: 0.75, pulses: 0.85 }),
    look("Unfolding Wings", 9705, 0.3, { length: 0.85, orbit: -0.3, elevation: 0.2 }),
    look("Slow Labyrinth", 9706, 1.85, { flow: 0.45, length: 0.9, orbit: 0.2, thickness: 1.25, pulses: 0.1, elevation: 0.75 }),
  ],
  stage: ["flow", "length", "orbit"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    flow: { mul: [0.55, 1.5] },
    length: [-0.15, 0.15],
    orbit: { mul: [0.6, 1.6] },
    pulses: [-0.2, 0.2],
  },
  beat: { punch: 0.1, pulse: 0.15 },
  audio: [
    { param: "flow", feature: "low", amount: 0.04 },
    { param: "pulses", feature: "onset", amount: 0.08 },
  ],
  rhythmStyles: { restrained: "Loose strands", driving: "Braided current", accented: "Attractor weave" },
  rhythm: [
    familyEffect("ribbon-cohort", 0, "Ribbon cohort", "One in four whole ribbons lights up along its full trajectory.", { period: 4, strength: 0.6, duration: 1, steps: "X...", styles: {
        restrained: { steps: "X....... | ......x. | ...X....", division: 2, strength: 0.5, duration: 1.5 },
        driving: { steps: "X.....x. | ...X..x.", division: 2, strength: 0.76, duration: 0.8 },
        accented: { steps: "X........x...... | ..X........x.... | ....X........x..", division: 4, strength: 0.9, duration: 0.65 },
      } }),
    familyEffect("flow-run", 1, "Flow run", "Light runs down every ribbon along the direction of the flow.", { period: 8, strength: 0.6, duration: 1.5, steps: "X.......", styles: {
        restrained: { steps: "...x.... | .X...... | .....x..", division: 2, strength: 0.5, duration: 1.3 },
        driving: { steps: "..X..x..X..x", division: 2, strength: 0.76, duration: 0.8 },
        accented: { steps: "..X..x..X..x..X..x..", division: 4, strength: 0.9, duration: 0.5 },
      } }),
    familyEffect("head-sparks", 2, "Head sparks", "The leading point of every trajectory flares together.", { period: 16, strength: 0.7, duration: 2, steps: "X...............", styles: {
        restrained: { steps: "........ | .......x | ........ | ......X.", division: 2, strength: 0.55, duration: 1.6 },
        driving: { steps: "........ | ......xX | ........ | ....x..X", division: 2, strength: 0.8, duration: 0.4 },
        accented: { steps: "............x... | .........X.x..xx", division: 4, strength: 0.96, duration: 0.18 },
      } }),
  ],
  fragment: `${ground}
void main() { outColor = vec4(ground(gl_FragCoord.xy), 1.); }`,
  simulation: { fragment: simulation, size: [HISTORY, ROWS], steps: 1 },
  geometry: {
    create: createRibbons,
    attributes: [1],
    vertex,
    fragment: surface,
  },
};

// Seed identity: the rank of every ribbon (when it appears, its colour shift
// and its rhythm cohort). The trajectories themselves are seeded on the GPU.
export function ribbonRanks(seed) {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const ranks = Array.from({ length: RIBBONS }, (_, i) => (i + rand()) / RIBBONS);
  for (let i = ranks.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
  }
  return ranks;
}
export function createRibbons(seed) {
  const ranks = ribbonRanks(seed),
    data = new Float32Array(RIBBONS * PER_RIBBON);
  for (let r = 0; r < RIBBONS; r++) data.fill(ranks[r], r * PER_RIBBON, (r + 1) * PER_RIBBON);
  return data;
}
