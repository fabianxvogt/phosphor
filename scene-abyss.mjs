import { familyEffect } from "./family-rhythm.mjs";
import {
  ATTRIBUTES,
  BACK,
  FLOOR,
  NCH,
  NG,
  NJ,
  NS,
  NSH,
  OPAQUE_VERTICES,
  PERIOD,
  SPEED,
  createGeometry,
} from "./abyss-geometry.mjs";

// Bioluminescent Abyss (#92): one seeded stretch of deep water the camera
// glides through. Sparks: marine snow, single blinking plankton and lone
// medusae far away. Swarms: jellyfish blooms, siphonophore chains and plankton
// clouds that light up where the camera and the pulsing bells disturb them.
// Reef: a glowing seabed forest (tube worms, sea pens, gorgonian fans), beat-
// locked swarms, plankton light waves on kicks and shafts of light from far
// above. The same organisms carry through; development only grows, reveals,
// gathers and lowers the camera.
//
// State (RGBA8, 256²): texels 0–6 of row 0 are integrated clocks and the
// light-wave/kick latch; every other texel is one particle. Plankton texels
// hold their 16-bit disturbance glow, which the simulation raises where the
// camera wake, a contracting bell or a light wave passes and lets decay.
// Mesh: opaque reef and seabed first, then additive translucent organisms
// (geometry.additiveFrom). Particles are depth tested against the reef.
const f = (x) => (Number.isInteger(x) ? `${x}.` : `${x}`);
const SIZE = [256, 256];
const RESERVED = 16;
const LURES = 12;

const common = `
const float D_TAU = 6.283185307179586;
const float D_PI = 3.141592653589793;
const float D_PERIOD = ${f(PERIOD)};
const float D_BACK = ${f(BACK)};
const float D_FLOOR = ${f(FLOOR)};
const int D_NJ = ${NJ}, D_NS = ${NS}, D_GROUP = ${NS / NG}, D_NCH = ${NCH}, D_NSH = ${NSH};
const int D_RESERVED = ${RESERVED}, D_LURES = ${LURES};
#define D_DEV clamp(u_params[0], 0., 2.)
uint dKey;
float dSS(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
uint dHash(uint x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16;
  return x;
}
void dInit() { dKey = dHash(u_seedBits + 0x2545f491u); }
float dRnd(uint id, uint k) {
  return float(dHash((id * 0x9e3779b9u) ^ dHash(k + dKey)) >> 8) * (1. / 16777216.);
}
uint dWord(int k) {
  uvec4 b = uvec4(texelFetch(u_state, ivec2(k, 0), 0) * 255. + .5);
  return (b.r << 24) | (b.g << 16) | (b.b << 8) | b.a;
}
// Exact phase of n cycles per clock wrap; uint overflow keeps it periodic.
float dCycle(uint w, uint n) { return fract(float(w * n) * (1. / 4294967296.)); }
float dWave(uint w, uint n, float offset) { return sin(D_TAU * (dCycle(w, n) + offset)); }
vec3 dPal(float t) { return mix(mix(u_secondary, u_primary, smoothstep(0., .65, t)), u_accent, smoothstep(.65, 1., t)); }
vec3 dCamPath(float z, float dev) {
  float w = D_TAU * z / D_PERIOD;
  return vec3(1.1 * sin(w + .4) + .35 * sin(3. * w + 1.7),
    .35 - .25 * dSS(1., 2., dev) + .2 * sin(2. * w + .9) + .06 * sin(5. * w + 2.3), z);
}
float dCamX(float z) { float w = D_TAU * z / D_PERIOD; return 1.1 * sin(w + .4) + .35 * sin(3. * w + 1.7); }
float dFloorY(float x, float z) {
  float w = D_TAU * z / D_PERIOD;
  return D_FLOOR + .16 * sin(.45 * x + 3. * w + 1.3) + .1 * sin(.9 * x - 5. * w + .4) + .06 * sin(1.7 * x + 9. * w + 2.2);
}
// Signed shift that moves absolute z into the window around the camera.
float dRel(float z, float Z) { return mod(z - Z + D_BACK, D_PERIOD) - D_BACK; }
struct DCam { vec3 p, r, u, f; float Z, F; };
DCam dCamera(float dev, float kick) {
  DCam c;
  c.Z = dCycle(dWord(0), 1u) * D_PERIOD;
  vec3 a = dCamPath(c.Z, dev), b = dCamPath(c.Z + 3.5, dev);
  c.p = vec3(a.xy, 0.);
  vec3 f = normalize(vec3(b.xy - a.xy, 3.5));
  vec3 r = normalize(cross(vec3(0., 1., 0.), f)), u = cross(f, r);
  float pitch = .03 - .33 * dSS(1., 2., dev) + .22 * clamp(u_params[7], -1., 1.);
  f = normalize(f * cos(pitch) + u * sin(pitch));
  // Narrow screens look slightly towards the sentinel rather than cropping it.
  float portrait = 1. - dSS(.65, 1.2, u_resolution.x / u_resolution.y);
  float yaw = portrait * .1 * (dRnd(0u, 2u) < .5 ? -1. : 1.) * (1. - dSS(1., 2., dev));
  f = normalize(f * cos(yaw) + r * sin(yaw));
  c.r = normalize(cross(vec3(0., 1., 0.), f));
  c.u = cross(f, c.r);
  c.f = f;
  c.F = 1.45 * (1. - .22 * portrait) * (1. + .02 * kick);
  return c;
}
vec4 dProject(DCam c, vec3 p) {
  vec3 q = p - c.p;
  vec3 v = vec3(dot(q, c.r), dot(q, c.u), dot(q, c.f));
  float A = u_resolution.x / u_resolution.y;
  const float n = .06, fa = 90.;
  return vec4(v.x * c.F / max(A, 1.), v.y * c.F * min(A, 1.), (v.z * (fa + n) - 2. * fa * n) / (fa - n), v.z);
}
float dPixels(DCam c, float w) { return c.F * min(u_resolution.x, u_resolution.y) * .5 / max(w, .06); }
float dMinPx() { return max(1., 1.4 * min(u_resolution.x, u_resolution.y) / 1080.); }
// Kick latch envelope (0..1) written by the simulation on rising kicks.
float dBeatEnv() { return texelFetch(u_state, ivec2(6, 0), 0).r; }
float dCurve(float ph) { return ph < .18 ? dSS(0., .18, ph) : 1. - dSS(.18, .9, ph); }
// Reef: medusae settle into a lower, flatter band above the reef, so the
// tilted camera keeps near animals inside the frame (CPU mirror settleY).
float dSettle(float y, float dev) { return mix(y, -.25 + .35 * (y - .8), dSS(1.2, 2., dev)); }
// ---- medusae ----
struct DJelly { vec3 c, ax, ex, ez; float R, L, h, reveal, own, syn, lock, kick, beat; bool swarm; };
DJelly dJelly(int i, float dev, float Z, float swarmParam, float rhythmX) {
  DJelly j;
  uint id = uint(i);
  uint P = dWord(1), S = dWord(2);
  float birth;
  vec3 anchor;
  j.swarm = i >= D_NJ;
  if (!j.swarm) {
    bool lone = i < 5;
    // Five lanterns at distinct depths compose the sparse opening.
    float initial = float(dHash(u_seedBits)) * (D_PERIOD / 4294967296.);
    float z = lone ? mod(initial + (i == 0 ? 9. : i == 1 ? 11.5 : i == 2 ? 19.5 : i == 3 ? 38. : 52.), D_PERIOD)
      : fract(float(i) * .618034 + .37 + .05 * dRnd(id, 1u)) * D_PERIOD;
    float h5 = dRnd(id, 5u), h3 = dRnd(id, 3u);
    j.R = lone ? 1.25 + .2 * h5 : .3 + .45 * h5 * h5;
    float side = lone ? (dRnd(0u, 2u) < .5 ? -1. : 1.) * (i % 2 == 0 ? 1. : -1.) : (dRnd(id, 2u) < .5 ? -1. : 1.);
    float gap = 1.9 + j.R + (lone ? .55 + 1.2 * h3 : 4.5 * h3 * sqrt(h3));
    anchor = vec3(dCamX(z) + side * gap, dSettle(lone ? .6 + .9 * dRnd(id, 4u) : -1.3 + 4. * dRnd(id, 4u), dev), z);
    birth = lone ? -1. : .3 + .65 * dRnd(id, 6u);
    j.reveal = lone ? 1. : dSS(birth - .25, birth + .05, dev);
  } else {
    int g = (i - D_NJ) / D_GROUP;
    uint gid = 1000u + uint(g);
    float gz = fract(float(g) * .618034 + .11) * D_PERIOD;
    float radius = 1.2 + .8 * dRnd(gid, 3u);
    float side = dRnd(gid, 1u) < .5 ? -1. : 1.;
    vec3 centre = vec3(dCamX(gz) + side * (2.1 + radius + 4.5 * dRnd(gid, 2u)), dSettle(-1.3 + 3. * dRnd(gid, 4u), dev), gz);
    float u = 2. * dRnd(id, 1u) - 1., a = D_TAU * dRnd(id, 2u), s = sqrt(max(0., 1. - u * u));
    float r = radius * pow(dRnd(id, 3u), 1. / 3.);
    anchor = centre + vec3(s * cos(a) * r, u * r * .6, s * sin(a) * r * 1.3);
    float h5 = dRnd(id, 5u);
    j.R = .08 + .12 * h5 * h5;
    birth = .8 + 1.1 * dRnd(id, 6u);
    float boost = clamp(swarmParam - .5, -.5, .5) * .5 * dSS(.7, 1.3, dev);
    j.reveal = dSS(birth - .12, birth + .05, dev + boost);
  }
  j.L = j.R * (i < 5 ? 2.4 + 1.4 * dRnd(id, 7u) : 3.2 + 3. * dRnd(id, 7u));
  j.h = dRnd(id, 0u);
  float h = j.h;
  vec3 drift = vec3(.45 * dWave(S, 37u, h), .3 * dWave(S, 29u, h * 1.7), .7 * dWave(S, 23u, h * 2.3));
  // Pulses: own rhythm, a shared (swarm: travelling) rhythm and the kick.
  uint n = (j.swarm ? 96u : 48u) + uint(dRnd(id, 8u) * 4.) * 8u;
  j.own = fract(dCycle(P, n) + h);
  j.syn = j.swarm ? fract(dCycle(P, 112u) - .05 * anchor.z) : dCycle(P, 56u);
  j.lock = j.swarm ? dSS(1.3, 1.9, dev) : .5 * dSS(1.5, 2., dev);
  j.beat = j.swarm ? dSS(1.4, 2., dev) : .6 * dSS(1.6, 2., dev);
  j.kick = max(dBeatEnv() * j.beat * .85, rhythmX * .9);
  j.R *= mix(.55, 1., j.reveal);
  float lift = .3 * j.R * max(mix(dCurve(j.own), dCurve(j.syn), j.lock), j.kick);
  j.c = anchor + drift + vec3(0., lift, 0.);
  float tilt = .1 + .3 * dRnd(id, 9u);
  float az = D_TAU * dRnd(id, 10u) + .4 * dWave(S, 17u, h);
  j.ax = vec3(sin(tilt) * cos(az), cos(tilt), sin(tilt) * sin(az));
  j.ex = normalize(cross(j.ax, vec3(0., 0., 1.)));
  j.ez = cross(j.ex, j.ax);
  return j;
}
float dCon(DJelly j, float delay) {
  return max(mix(dCurve(fract(j.own - delay)), dCurve(fract(j.syn - delay)), j.lock), j.kick);
}
vec3 dBell(DJelly j, float u, float v) {
  float c = dCon(j, .08 * u);
  float a = u * 1.72;
  float rr = j.R * sin(a) * (1. - .3 * c * u * u) * (1. + .045 * u * u * u * u * sin(v * 16.));
  float yy = j.R * (.78 * (cos(a) - .2) - .12 * c * u * u + .1 * c);
  return j.c + (j.ex * cos(v) + j.ez * sin(v)) * rr + j.ax * yy;
}
// ---- siphonophores and light shafts ----
struct DChain { vec3 a, d, n1, n2; float L, reveal, h; };
DChain dChain(int k, float dev) {
  DChain c;
  uint id = 2000u + uint(k), S = dWord(2);
  float z = fract(float(k) * .618034 + .77) * D_PERIOD;
  float side = dRnd(id, 1u) < .5 ? -1. : 1.;
  c.d = normalize(vec3(.35 * (dRnd(id, 3u) - .5), .15 * (dRnd(id, 4u) - .5), 1.));
  c.L = 6. + 4. * dRnd(id, 6u);
  c.h = dRnd(id, 0u);
  c.a = vec3(dCamX(z) + side * (3.6 + 5. * dRnd(id, 2u)), -.9 + 2.8 * dRnd(id, 5u), z)
    + c.d * .8 * dWave(S, 13u, c.h) + vec3(0., .25 * dWave(S, 19u, c.h), 0.);
  float b = .6 + .3 * dRnd(id, 7u);
  c.reveal = dSS(b - .2, b + .15, dev);
  c.n1 = normalize(cross(c.d, vec3(0., 1., 0.)));
  c.n2 = cross(c.n1, c.d);
  return c;
}
vec3 dChainAt(DChain c, float s, float phase) {
  float w = D_TAU * 1.4 * s - phase;
  return c.a + c.d * (s - .5) * c.L + c.n1 * .3 * sin(w) + c.n2 * .18 * sin(.7 * w + 1.);
}
vec3 dShaftAxis(uint id) { return normalize(vec3(.22 + .12 * (dRnd(id, 3u) - .5), -1., .1)); }
vec3 dShaftTop(uint id) {
  return vec3((dRnd(id, 1u) - .5) * 28., 9., (float(id - 3000u) + dRnd(id, 2u)) * D_PERIOD / float(D_NSH));
}
float dShaftWidth(uint id) { float h = dRnd(id, 4u); return .5 + 1.6 * h * h; }
float dShaftReveal(float dev) { return .2 * dSS(.8, 1.3, dev) + .8 * dSS(1.3, 2., dev); }
// Light from the shafts at a camera-relative point (used by marine snow).
float dShaftLight(vec3 p, float Z) {
  float sum = 0.;
  for (int n = 0; n < D_NSH; n++) {
    uint id = 3000u + uint(n);
    vec3 top = dShaftTop(id);
    top.z = dRel(top.z, Z);
    vec3 ax = dShaftAxis(id), q = p - top;
    float w = dShaftWidth(id);
    vec3 perp = q - ax * dot(q, ax);
    sum += exp(-dot(perp, perp) / (w * w * .35));
  }
  return sum;
}
// Wandering caustic network projected from the surface (two warped layers).
float dCaustic(vec2 p, uint S) {
  float t1 = D_TAU * dCycle(S, 140u), t2 = D_TAU * dCycle(S, 113u);
  vec2 q = p + .4 * vec2(sin(p.y * 1.3 + t1), sin(p.x * 1.1 - t2));
  float a = sin(q.x * 2.1 + t1) + sin(q.y * 1.8 - t2) + sin((q.x + q.y) * 1.4 + t1 + t2);
  vec2 r = p * 1.7 + vec2(1.3, .7) + .3 * vec2(sin(p.y * 2.3 - t2), sin(p.x * 1.9 + t1));
  float b = sin(r.x * 2.3 - t2) + sin(r.y * 2.6 + t1) + sin((r.x - r.y) * 1.6 + t2);
  float x = 1. - abs(a) / 3., y = 1. - abs(b) / 3.;
  float x2 = x * x, y2 = y * y, y4 = y2 * y2;
  return x * x2 * x2 * x2 + .6 * y * y4 * y4; // x^7 + .6 y^9 without pow
}
// Water colour seen along a direction: near-black depth, surface light far
// above (Reef) and the reef's glow haze below the horizon.
vec3 dWater(vec3 rd, float dev) {
  vec3 deep = mix(u_secondary, u_primary, .3) * .016;
  vec3 col = deep * (.8 + .9 * dSS(-.4, .7, rd.y));
  col += mix(u_secondary, u_primary, .5) * .012 * dSS(.3, 1.2, dev) * dSS(-.2, .9, rd.y);
  float sun = .4 + .6 * dSS(.9, 1.9, dev);
  col += mix(u_secondary, vec3(1.), .3) * .04 * sun * pow(dSS(-.1, 1., rd.y), 1.8);
  col += mix(u_primary, u_secondary, .4) * .018 * dSS(1.1, 2., dev) * dSS(.08, -.25, rd.y) * dSS(-1., -.15, rd.y);
  return col;
}
float dFog(float dist) { return max(1. - exp(-dist * .06), dSS(34., 58., dist)); }
// ---- light waves: four slots of expanding shells (texels 3,4,7,8) ----
// Texels 5 and 9 hold each slot's origin z, texels 10–13 its seeded x and y
// offset (written once at the trigger, so no pixel re-hashes the origin).
float dUnpack16(vec2 b) { return dot(b, vec2(256., 1.)) * (255. / 65535.); }
int dWaveTexel(int k) { return k < 2 ? 3 + k : 5 + k; }
const float D_WAVE_X = 6., D_WAVE_Y = .7;
// Shell half-width .55; a wider width gives a conservative envelope.
float dWaveShell(vec3 p, float Z, float dev, float react, float width) {
  vec4 oa = texelFetch(u_state, ivec2(5, 0), 0), ob = texelFetch(u_state, ivec2(9, 0), 0);
  float best = 0., y0 = mix(.3, -2.1, dSS(1., 2., dev)), speed = 3.4 * (.75 + .25 * min(react, 1.5));
  for (int k = 0; k < 4; k++) {
    vec4 w = texelFetch(u_state, ivec2(dWaveTexel(k), 0), 0);
    float age = dUnpack16(w.rg) * 8.;
    if (age > 7.9 || w.b <= 0.) continue;
    vec4 xy = texelFetch(u_state, ivec2(10 + k, 0), 0);
    vec2 packed = k == 0 ? oa.rg : k == 1 ? oa.ba : k == 2 ? ob.rg : ob.ba;
    float oz = dRel(dUnpack16(packed) * D_PERIOD, Z);
    vec3 o = vec3((2. * dUnpack16(xy.rg) - 1.) * D_WAVE_X, y0 + (2. * dUnpack16(xy.ba) - 1.) * D_WAVE_Y, oz);
    float radius = age * speed;
    float x = (length(p - o) - radius) / width;
    best = max(best, exp(-x * x) * w.b * (1. - age / 7.9));
  }
  return best;
}
float dWaveLight(vec3 p, float Z, float dev, float react) { return dWaveShell(p, Z, dev, react, .55); }
// Slot 3: a latched, finite-speed living-light relay, not a frame flash.
// Age survives the short sequencer envelope; event count alternates its side.
float dRelayFront(vec3 p, int slot) {
  vec4 relay = texelFetch(u_state, ivec2(slot, 0), 0);
  float age = dUnpack16(relay.rg) * 3.;
  float side = relay.a < .5 ? -1. : 1.;
  // A diagonal biological path climbs off the reef into the water column.
  float front = -2. + 11. * age;
  float path = .55 * p.x * side + 1.6 * (p.y - D_FLOOR) + .12 * p.z;
  float x = (path - front) / .7;
  float head = exp(-x * x);
  float wake = .18 * exp(-pow((path - front + 1.6) / 1.8, 2.));
  return (head + wake) * relay.b * (1. - dSS(1.5, 2.3, age));
}
float dRelay(vec3 p) {
  return max(dRelayFront(p, 14), dRelayFront(p, 15));
}
// ---- plankton (simulation and particles share the placement) ----
vec3 dPlankton(int idx, float dev, float Z, uint S) {
  uint id = uint(idx);
  float h1 = dRnd(id, 51u), h2 = dRnd(id, 52u), h3 = dRnd(id, 53u), h6 = dRnd(id, 56u);
  vec3 p0 = vec3((h1 - .5) * 24., -2.9 + 8. * h2, h3 * D_PERIOD);
  uint cl = 4000u + uint(dRnd(id, 55u) * 10.);
  vec3 cc = vec3((dRnd(cl, 1u) - .5) * 18., -1.6 + 3.6 * dRnd(cl, 2u), fract(float(cl) * .618034 + .53) * D_PERIOD);
  float rad = 1.5 + 1.6 * dRnd(cl, 3u);
  float u = 2. * dRnd(id, 57u) - 1., a = D_TAU * dRnd(id, 58u), s = sqrt(max(0., 1. - u * u));
  float r = rad * pow(dRnd(id, 59u), .45);
  vec3 off = vec3(s * cos(a), u * .55, s * sin(a) * 1.4) * r;
  // Slow swirl of the cloud around its centre.
  float sw = .5 * dWave(S, 11u, dRnd(cl, 4u));
  off.xz = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * off.xz;
  // Narrow sinuous currents leave water between clouds, not spherical confetti.
  off.xy *= .32;
  off.x += .5 * sin(off.z * 1.7 + dRnd(cl, 4u) * D_TAU);
  off.y += .22 * sin(off.z * 2.1 + dRnd(cl, 2u) * D_TAU);
  vec3 p1 = cc + off;
  vec3 p2 = h6 < .45
    ? vec3(p1.x + (h1 - .5) * 3., 0., p1.z + (h3 - .5) * 3.)
    : cc + off * 1.35;
  if (h6 < .45) p2.y = dFloorY(p2.x, p2.z) + .25 + 1.4 * h2 * h2;
  if (h6 > .82) {
    // A seeded helical current physically joins the reef to the third lantern.
    DJelly lantern = dJelly(2, dev, Z, .5, 0.);
    float turn = h2 * D_TAU * 1.8 + dCycle(S, 11u) * D_TAU;
    p2 = vec3(lantern.c.x + .7 * cos(turn), mix(D_FLOOR + .2, lantern.c.y, h2), lantern.c.z + .7 * sin(turn));
  }
  vec3 p = mix(mix(p0, p1, dSS(.3, 1., dev)), p2, dSS(1.2, 1.9, dev));
  p += vec3(.25 * dWave(S, 43u, h1), .15 * dWave(S, 47u, h2), .25 * dWave(S, 41u, h3));
  p.z = dRel(p.z, Z);
  return p;
}
bool dIsPlankton(int idx) { return idx >= D_RESERVED + D_LURES && dRnd(uint(idx), 40u) >= .78; }
`;

const meshUniforms = `
uniform vec2 u_resolution;
uniform float u_params[8];
uniform highp sampler2D u_state;
uniform highp uint u_seedBits;
uniform vec3 u_primary, u_secondary, u_accent;
uniform vec4 u_rhythm;
uniform vec4 u_rhythmHit, u_rhythmCount;
uniform float u_level;
`;

const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec4 a_k;
layout(location=1) in vec4 a_l;
layout(location=2) in vec4 a_r;
layout(location=3) in vec4 a_s;
${meshUniforms}
${common}
out vec3 v_q;
out vec3 v_n;
out vec4 v_l;
out vec3 v_w;
out vec4 v_i;
out float v_fade;
const vec4 HIDDEN = vec4(0., 0., 2., 1.);
float dGrow(float birth, float dev) {
  float b = clamp(birth, 0., 1.);
  return dSS(.8 + .85 * b, 1.15 + .85 * b, dev);
}
vec4 dRibbon(DCam c, vec3 p, vec3 t, float side, float worldW, out float fade) {
  vec4 a = dProject(c, p), b = dProject(c, p + t * .03);
  vec2 pa = a.xy / max(a.w, .06), pb = b.xy / max(b.w, .06);
  vec2 d = (pb - pa) * u_resolution;
  d = dot(d, d) > 1e-12 ? normalize(d) : vec2(1., 0.);
  float px = worldW * dPixels(c, a.w), w = max(px, dMinPx());
  fade = px / w;
  a.xy += vec2(-d.y, d.x) * side * w * a.w / (u_resolution * .5);
  return a;
}
void main() {
  dInit();
  float dev = D_DEV, kind = a_k.x;
  DCam c = dCamera(dev, dBeatEnv());
  uint S = dWord(2), P = dWord(1);
  float sway = clamp(u_params[6], 0., 2.);
  v_fade = 1.;
  v_l = a_l;
  v_n = vec3(0., 1., 0.);
  v_i = vec4(kind, a_k.z, 1., 0.);
  vec3 p;
  if (kind < 4.5) {
    // ---- seabed and reef (wrapped by their own z) ----
    vec3 root = a_r.xyz;
    float anchor = kind < .5 ? a_k.y : root.z;
    float shift = dRel(anchor, c.Z) - anchor;
    v_w = root;
    if (kind < .5) {
      p = root;
      v_n = a_s.xyz;
      v_i.z = a_r.w * dGrow(a_s.w, dev);
      v_l = vec4(root.xy, root.z + shift, 0.);
      // Envelope of the light-wave rings (grid spacing <= .67): the floor
      // evaluates the exact rings only where this is lit.
      v_fade = dWaveShell(v_l.xyz, c.Z, dev, clamp(u_params[4], 0., 2.5), 1.4);
    } else {
      float g = dGrow(a_k.w, dev);
      if (g < .002) { gl_Position = HIDDEN; return; }
      float H = a_r.w * g, yaw = a_s.y, rnd = a_k.z;
      vec3 up = vec3(0., 1., 0.), bendDir = vec3(cos(yaw), 0., sin(yaw));
      float bendAmp = .09 * sway * dWave(S, 41u, rnd + root.x * .05);
      v_i.z = g;
      // Reef cascade: a light front sweeps outwards from the camera.
      float front = (1. - u_rhythm.z) * 30.;
      vec3 rootRel = vec3(root.x, root.y, root.z + shift);
      float fx = (length(rootRel - c.p) - front) / 2.5;
      v_i.w = max(u_rhythm.z * exp(-fx * fx), dWaveLight(rootRel, c.Z, dev, clamp(u_params[4], 0., 2.5)));
      v_i.w = max(v_i.w, dRelay(rootRel) * 1.8);
      // Caustic light at the root (tubes and sea-pen leaves; ribbons overwrite v_fade).
      float shaftsV = dShaftReveal(dev);
      v_fade = shaftsV > .001 ? dCaustic(root.xz * .55 + root.y * vec2(.12, .05), S) * shaftsV : 0.;
      if (kind < 1.5) {
        float s = a_l.y, ang = a_l.x * D_TAU / 5. + yaw;
        vec3 radial = vec3(cos(ang), 0., sin(ang));
        p = root + up * s * H + bendDir * bendAmp * H * s * s + radial * a_s.x * (1.15 - .3 * s) * (.4 + .6 * g);
        v_n = radial;
        v_l = vec4(s, H, 0., 0.);
      } else if (kind < 2.5) {
        // Crown: feathery plume filaments as screen-space ribbons.
        vec3 top = root + up * H + bendDir * bendAmp * H;
        float k = a_l.x, t = a_l.y;
        float phi = D_TAU * k / 8. + yaw;
        float open = .6 + .2 * dWave(S, 53u, rnd) + .15 * v_i.w + .16 * sin(k * 13. + rnd * 71.);
        vec3 dk = vec3(cos(phi), 0., sin(phi));
        float Lp = (.1 + .12 * a_r.w) * g;
        vec3 dir = dk * sin(open) + up * cos(open);
        p = top + dir * t * Lp - up * t * t * Lp * .75 * sin(open) + bendDir * t * t * Lp * .25;
        vec3 tan = dir - up * 2. * t * .4 * sin(open);
        p.z += shift;
        gl_Position = dRibbon(c, p, normalize(tan), a_l.z, .024 * (1. - .8 * t), v_fade);
        v_q = p - c.p;
        v_l = vec4(t, a_l.z, 0., 0.);
        return;
      } else if (kind < 3.5) {
        // Sea pen: stalk ribbon and a feather of leaf pairs.
        vec3 pen = vec3(-sin(yaw), 0., cos(yaw));
        if (a_l.x < .5) {
          float s = a_l.y;
          p = root + up * s * H + bendDir * bendAmp * H * s * s;
          p.z += shift;
          gl_Position = dRibbon(c, p, normalize(up + bendDir * bendAmp * 2. * s), a_l.z, .022, v_fade);
          v_q = p - c.p;
          v_l = vec4(s, a_l.z, 0., 0.);
          return;
        }
        float leaf = a_l.y, side = a_l.z;
        float ca = a_l.x - 1., cb = a_l.w;
        float irregular = sin(leaf * 17.3 + rnd * 93.);
        float sj = .23 + .74 * (leaf + .5 + .23 * side * irregular) / 12.;
        vec3 base = root + up * sj * H + bendDir * bendAmp * H * sj * sj;
        vec3 dir = normalize(pen * side + up * (.3 + .32 * irregular) + bendDir * (.28 * sin(leaf * 2.7 + rnd * 51.) + bendAmp));
        float ll = a_s.z * g * (.3 + .7 * sin(D_PI * (leaf + .5) / 12.)) * (.75 + .25 * irregular);
        float lw = .7 * H / 12.;
        p = base + dir * ll * ca + up * lw * (cb - .5) * (1. - .55 * ca);
        p += bendDir * .055 * H * sin(ca * D_PI) * sin(cb * D_PI + leaf);
        v_n = normalize(cross(dir, up) + up * .35 * (cb - .5) + bendDir * .3 * ca);
        v_l = vec4(sj, ca, cb, leaf);
        v_i.x = 3.5; // leaf
      } else {
        // Opaque branching tubes: real round backs and seeded depth excursions.
        vec3 right = vec3(cos(yaw), 0., sin(yaw)), back = vec3(-sin(yaw), 0., cos(yaw));
        p = root + (right * a_l.x + up * a_l.y + back * a_l.z) * H;
        p += bendDir * bendAmp * H * a_l.y * a_l.y;
        v_n = right * a_s.x + up * a_s.z + back * a_s.w;
        v_l = vec4(a_l.y, a_l.w, a_k.y, H);
      }
    }
    p.z += shift;
    if (kind > .5) v_i.w = max(v_i.w * .3, dRelay(p) * 1.8);
    v_q = p - c.p;
    gl_Position = dProject(c, p);
    return;
  }
  if (kind < 5.5) {
    // ---- light shaft: cylindrical billboard from far above ----
    uint id = 3000u + uint(a_k.y);
    float rev = dShaftReveal(dev);
    if (rev < .002) { gl_Position = HIDDEN; return; }
    vec3 top = dShaftTop(id), ax = dShaftAxis(id);
    top.z = dRel(top.z, c.Z);
    float len = (9. - D_FLOOR + .3) / abs(ax.y);
    p = top + ax * a_l.x * len;
    vec3 side = normalize(cross(ax, p - c.p));
    // Trimmed to |side| <= .8, where the profile has fallen to zero.
    p += side * a_l.y * .8 * dShaftWidth(id);
    v_q = p - c.p;
    v_i = vec4(kind, dRnd(id, 0u), rev, 0.);
    v_l = vec4(a_l.x, a_l.y * .8, dot(p - c.p, c.f), 0.);
    gl_Position = dProject(c, p);
    return;
  }
  if (kind < 7.5) {
    // ---- siphonophore chain: backbone ribbon and glowing beads ----
    DChain ch = dChain(int(a_k.y), dev);
    if (ch.reveal < .002) { gl_Position = HIDDEN; return; }
    float phase = D_TAU * dCycle(S, 300u);
    // Chains are long: wrap them well behind the camera.
    ch.a.z = mod(ch.a.z - c.Z + 9., D_PERIOD) - 9.;
    v_i = vec4(kind, ch.h, ch.reveal, D_TAU * dCycle(P, 40u));
    if (kind < 6.5) {
      float s = a_l.x;
      p = dChainAt(ch, s, phase);
      vec3 t = dChainAt(ch, s + .01, phase) - p;
      gl_Position = dRibbon(c, p, normalize(t), a_l.y, .012, v_fade);
      v_l = vec4(s, a_l.y, 0., 0.);
    } else {
      float s = (a_l.x + .5) / 32.;
      p = dChainAt(ch, s, phase);
      float size = mix(.035, .11, dSS(.7, 1., s)) * mix(.6, 1., ch.reveal);
      vec4 q = dProject(c, p);
      float px = size * dPixels(c, q.w), w = max(px, dMinPx() * 1.5);
      v_fade = px / w;
      q.xy += a_l.yz * w * q.w / (u_resolution * .5);
      gl_Position = q;
      v_l = vec4(s, a_l.yz, 0.);
    }
    v_q = p - c.p;
    return;
  }
  // ---- medusae: tentacles, oral arms, bells ----
  int ji = int(a_k.y);
  DJelly j = dJelly(ji, dev, c.Z, u_params[3], u_rhythm.x);
  // Wrap the whole animal by its anchor z.
  float az = j.c.z;
  float shift = dRel(az, c.Z) - az;
  j.c.z += shift;
  // Before they bloom, large medusae glow faintly in the distance and go
  // dark as the camera nears (distant life in the Sparks breakdown).
  float ghost = (j.swarm ? .7 : .9) * dSS(5., 11., length(j.c - c.p));
  float viewDepth = dot(j.c - c.p, c.f);
  float nearFade = dSS(j.swarm ? .5 : 3., j.swarm ? 1.5 : 7., viewDepth);
  float shown = max(j.reveal, ghost) * nearFade;
  if (shown < .002) { gl_Position = HIDDEN; return; }
  uint id = uint(ji);
  float accent = (!j.swarm && (ji == 0 || dRnd(id, 11u) < .25)) ? 1. : 0.;
  v_i = vec4(kind, j.h, shown, accent * 4. + j.beat);
  float flash = max(dWaveLight(j.c, c.Z, dev, clamp(u_params[4], 0., 2.5)), dRelay(j.c) * 1.5);
  if (kind < 9.5) {
    float s = a_l.y, side = a_l.z;
    vec3 base, dir, rad;
    float ph = D_TAU * (1.4 * s - dCycle(P, 32u) + a_l.x * .37 + j.h);
    if (kind < 8.5) {
      float NT = a_l.w, v = D_TAU * (a_l.x + .5) / NT;
      rad = j.ex * cos(v) + j.ez * sin(v);
      base = dBell(j, .97, v);
      float conT = dCon(j, .2 + .4 * s);
      vec3 down = normalize(-j.ax * (1. - .45 * s) - vec3(0., .45 * s, 0.));
      float amp = (.03 + .22 * s) * j.R * (.5 + .5 * sway);
      vec3 tang = cross(j.ax, rad);
      vec3 at = base + down * s * j.L * (1. - .08 * conT) + rad * j.R * .25 * sin(D_PI * s) * (1. - .5 * conT)
        + (rad * sin(ph) + tang * cos(.8 * ph + a_l.x)) * amp + vec3(.05, 0., .04) * s * s * j.L;
      float s2 = s + .02, ph2 = ph + D_TAU * 1.4 * .02;
      vec3 down2 = normalize(-j.ax * (1. - .45 * s2) - vec3(0., .45 * s2, 0.));
      vec3 at2 = base + down2 * s2 * j.L * (1. - .08 * conT) + rad * j.R * .25 * sin(D_PI * s2) * (1. - .5 * conT)
        + (rad * sin(ph2) + tang * cos(.8 * ph2 + a_l.x)) * amp * (.03 + .22 * s2) / (.03 + .22 * s) + vec3(.05, 0., .04) * s2 * s2 * j.L;
      p = at;
      gl_Position = dRibbon(c, p, normalize(at2 - at), side, (j.swarm ? .006 : .009) * (1. - .5 * s) * j.R / .3, v_fade);
      v_l = vec4(s, side, a_l.x, flash);
    } else {
      float v = D_TAU * (a_l.x / 4. + .125);
      rad = j.ex * cos(v) + j.ez * sin(v);
      vec3 tang = cross(j.ax, rad);
      float La = j.R * (1.6 + 1.2 * j.h);
      base = j.c - j.ax * .1 * j.R + rad * .12 * j.R;
      vec3 at = base - j.ax * s * La + (rad * (.1 + .12 * sin(ph)) + tang * .1 * cos(ph * .7)) * j.R * s;
      float s2 = s + .03, ph2 = ph + D_TAU * 1.4 * .03;
      vec3 at2 = base - j.ax * s2 * La + (rad * (.1 + .12 * sin(ph2)) + tang * .1 * cos(ph2 * .7)) * j.R * s2;
      p = at;
      gl_Position = dRibbon(c, p, normalize(at2 - at), side, .14 * j.R * (1. - .55 * s), v_fade);
      v_l = vec4(s, side, a_l.x, flash);
    }
    v_q = p - c.p;
    return;
  }
  // Bell: parametric surface, pulse travels from apex to margin.
  float u = a_l.x, v = a_l.y * D_TAU;
  p = dBell(j, u, v);
  float uu = max(u, .03);
  vec3 du = dBell(j, min(uu + .02, 1.), v) - dBell(j, max(uu - .02, .01), v);
  vec3 dv = dBell(j, uu, v + .03) - dBell(j, uu, v);
  vec3 n = normalize(cross(dv, du));
  if (dot(n, p - (j.c - j.ax * j.R * .6)) < 0.) n = -n;
  v_n = n;
  v_l = vec4(u, a_l.y, dCon(j, .08 * u), max(flash * .25, dRelay(p) * 1.5));
  v_q = p - c.p;
  gl_Position = dProject(c, p);
}`;

const surface = `#version 300 es
precision highp float;
precision highp int;
${meshUniforms}
${common}
in vec3 v_q;
in vec3 v_n;
in vec4 v_l;
in vec3 v_w;
in vec4 v_i;
in float v_fade;
out vec4 outColor;
float h1(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
void main() {
  dInit();
  float dev = D_DEV, kind = v_i.x, rnd = v_i.y;
  float dist = length(v_q);
  vec3 V = -v_q / max(dist, 1e-4);
  float fog = dFog(dist);
  float glowP = clamp(u_params[5], .2, 2.);
  uint S = dWord(2), P = dWord(1);
  float shafts = dShaftReveal(dev);
  vec3 col = vec3(0.);
  if (kind < 3.9) {
    // Fully fogged seabed is just water.
    if (fog > .985) { outColor = vec4(dWater(-V, dev), 1.); return; }
    vec3 N = normalize(v_n);
    if (dot(N, V) < 0. && kind > .5) N = -N;
    // Caustics exist only under the shafts and fade with the fog.
    float caust = kind > .5 ? v_fade
      : shafts * (1. - fog) > .01 ? dCaustic(v_w.xz * .55 + v_w.y * vec2(.12, .05), S) * shafts : 0.;
    if (kind < .5) {
      // Seabed: dark sediment, glow pools around the reef, caustics.
      float grain = h1(floor(v_w.x * 9.) + floor(v_w.z * 9.) * 57.);
      col = mix(u_secondary, vec3(.55), .5) * .01 * (.75 + .5 * grain) * (.4 + .6 * N.y);
      col += mix(dPal(.3 + .25 * rnd), u_secondary, .3) * v_i.z * .055 * glowP;
      col += mix(u_secondary, vec3(1.), .45) * caust * .075 * max(N.y, 0.);
      // Edge of the seabed grid fades into the water.
      // Light waves sweep across the seabed as luminous rings.
      float ring = v_fade > .015 ? dWaveLight(v_l.xyz, dCycle(dWord(0), 1u) * D_PERIOD, dev, clamp(u_params[4], 0., 2.5)) : 0.;
      col += mix(dPal(.4 + .2 * rnd), vec3(1.), .15) * ring * .22 * glowP;
      col = mix(col, dWater(V * -1., dev), dSS(17., 23., abs(v_w.x)));
    } else if (kind < 1.5) {
      // Tube worm: dark banded tube lit by its own crown.
      float s = v_l.x, H = v_l.y;
      float band = .75 + .25 * smoothstep(.3, .5, abs(fract(s * H * 16.) - .5));
      col = mix(u_secondary, u_primary, .3) * .055 * band * (.15 + .85 * max(dot(N, normalize(vec3(-.4, .7, -.5))), 0.));
      col += dPal(.32 + .3 * rnd) * (.015 + .12 * pow(s, 4.)) * v_i.z * glowP * (1. + 2. * v_i.w);
      col += mix(u_secondary, vec3(1.), .4) * caust * .1 * max(N.y + .3, 0.);
      col += mix(u_secondary, vec3(1.), .3) * pow(1. - abs(dot(N, V)), 3.) * .12;
      col *= .35 + .65 * dSS(0., .15, s);
    } else if (kind < 2.5) {
      float t = v_l.x;
      vec3 cc = rnd < .09 ? mix(u_accent, vec3(1.), .12) : dPal(.55 + .35 * rnd);
      float flare = 1. + 2.2 * v_i.w;
      float barb = .45 + .55 * pow(.5 + .5 * sin(t * 91. + rnd * 37.), 3.);
      col = cc * (.14 + .8 * t * t) * barb * flare * glowP * (1. - v_l.y * v_l.y) * v_fade;
    } else if (kind < 3.25) {
      // Sea pen stalk.
      col = dPal(.35 + .3 * rnd) * .2 * glowP * (1. - v_l.y * v_l.y) * v_fade;
    } else if (kind < 3.75) {
      // Sea pen leaves: waves of light run up the feather (as real sea pens do).
      float sj = v_l.x, along = v_l.y;
      float t = dCycle(P, 20u) + dCycle(S, 300u);
      float wave = exp(-pow((fract(sj * .8 - t + rnd) - .5) * 7., 2.));
      vec3 cc = dPal(.3 + .35 * rnd);
      float edge = pow(abs(v_l.z * 2. - 1.), 3.);
      float polyp = pow(.5 + .5 * sin(along * 45. + v_l.w * 7.3 + rnd * 31.), 16.) * edge;
      float tissue = .08 + .24 * max(dot(N, normalize(vec3(-.4, .8, -.3))), 0.);
      polyp *= .65 + .35 * max(dot(N, normalize(vec3(-.4, .8, -.3))), 0.);
      col = cc * tissue * dSS(.12, .3, sj);
      col += mix(cc, u_accent, .7 * clamp(v_i.w, 0., 1.)) * (.3 + .4 * wave + 2. * v_i.w) * polyp * v_i.z * glowP;
      col += mix(u_secondary, vec3(1.), .4) * caust * .06;
    }
    col = mix(col, dWater(-V, dev), fog);
    outColor = vec4(max(col, vec3(0.)), 1.);
    return;
  }
  float keep = 1. - fog;
  if (kind < 4.75) {
    // ---- gorgonian skeleton: opaque tissue, shaded back, isolated polyps ----
    vec3 N = normalize(v_n);
    float h = v_l.x, along = v_l.y, branch = v_l.z;
    float key = max(dot(N, normalize(vec3(-.4, .7, -.5))), 0.);
    float contact = dSS(0., .17, h);
    float pore = pow(.5 + .5 * sin(along * 23. + branch * 7.3 + rnd * 91.), 14.);
    float selected = step(.52, h1(branch + rnd * 77.));
    vec3 tissue = dPal(.12 + .3 * rnd);
    col = tissue * (.12 + .55 * key) * (.2 + .8 * contact);
    col += mix(tissue, u_accent, clamp(v_i.w, 0., 1.)) * pore * selected * (.8 + 5.5 * v_i.w) * contact * glowP;
    col *= v_i.z;
    outColor = vec4(mix(col, dWater(-V, dev), fog), 1.);
    return;
  }
  if (kind < 5.5) {
    // ---- light shaft ----
    float s = v_l.x, side = v_l.y, depth = v_l.z;
    float prof = exp(-side * side * 2.6) * max(1. - side * side / .64, 0.);
    float flick = .65 + .35 * sin(D_TAU * (dCycle(S, 97u) + rnd) + s * 4.);
    float a = prof * dSS(0., .4, s) * (1. - dSS(.62, .97, s)) * flick * dSS(.5, 4., depth);
    col = mix(u_secondary, vec3(1.), .4) * .3 * a * v_i.z;
    outColor = vec4(col * keep, 1.);
    return;
  }
  if (kind < 7.5) {
    // ---- siphonophore: backbone and beads with a travelling light wave ----
    float s = v_l.x;
    float wave = exp(-pow((fract(s * 1.5 - v_i.w / D_TAU) - .5) * 9., 2.));
    vec3 cc = dPal(.3 + .3 * v_i.y);
    if (kind < 6.5) {
      col = cc * (.12 + .5 * wave) * (1. - v_l.y * v_l.y) * v_fade;
    } else {
      vec2 d = v_l.yz;
      float r2 = dot(d, d);
      float head = dSS(.7, 1., s);
      float disc = exp(-r2 * 4.5) * step(r2, 1.);
      float rim = exp(-pow((sqrt(r2) - .7) * 6., 2.)) * head;
      col = cc * (disc * (.35 + 1.8 * wave) + rim * .5) * v_fade;
      col += mix(cc, vec3(1.), .5) * exp(-r2 * 18.) * wave * 1.2 * v_fade;
    }
    col *= v_i.z * glowP;
    outColor = vec4(col * keep, 1.);
    return;
  }
  // ---- medusae ----
  float accent = v_i.w > 2. ? 1. : 0., beatLock = v_i.w - 4. * accent;
  vec3 jc = dPal(.12 + .5 * rnd);
  vec3 rimC = mix(jc, vec3(1.), .12);
  if (kind < 9.5) {
    float s = v_l.x, side = v_l.y;
    float prof = (1. - side * side);
    if (kind < 8.5) {
      float beads = pow(.5 + .5 * cos(s * 70. + v_l.z * 2.), 8.) * .5;
      float drip = exp(-pow((fract(s * .8 - dCycle(P, 24u) + rnd + v_l.z * .13) - .5) * 8., 2.));
      col = jc * (.42 * pow(1. - s, 1.4) + .08 + beads * (1. - s) + .7 * drip * (1. - s * .6)) * prof * v_fade;
    } else {
      float frill = .55 + .45 * sin(s * 46. + side * 2.5 + v_l.z);
      vec3 ac = accent > .5 ? mix(u_accent, jc, .5) : jc;
      col = ac * (.12 + .35 * frill) * (1. - .65 * s) * prof * v_fade;
    }
    col *= v_i.z * glowP * (1. + 1.5 * v_l.w);
    outColor = vec4(col * keep, 1.);
    return;
  }
  // Bell: fresnel rim, bright scalloped margin with lights, radial canals,
  // gonads (accent in a few animals) and the contraction light ring.
  vec3 N = normalize(v_n);
  float u = v_l.x, vv = v_l.y * D_TAU, con = v_l.z;
  float nv = abs(dot(N, V));
  float fres = pow(1. - nv, 3.);
  float margin = exp(-pow((1. - u) * 11., 2.));
  float lights = pow(.5 + .5 * cos(vv * 16.), 10.) * dSS(.9, 1., u);
  float canals = pow(abs(cos(vv * 4. + .08 * sin(u * 19. + rnd * 7.))), 48.) * dSS(.15, .5, u) * (1. - margin);
  float lobes = pow(.5 + .5 * cos(vv * 4.), 3.) * exp(-pow((u - .32) * 6., 2.));
  float ring = exp(-pow((u - con) * 7., 2.)) * con;
  vec3 core = accent > .5 ? mix(u_accent, vec3(1.), .1) : mix(jc, vec3(1.), .2);
  float key = max(dot(N, normalize(vec3(-.4, .8, -.3))), 0.);
  // Thin mesoglea: a dark transparent body, raking key and living canals.
  // Keep the broad fresnel below the narrow emissive margin.
  col = jc * (.012 + .022 * u + .035 * key) + rimC * fres * .14 + rimC * margin * .65 + mix(rimC, vec3(1.), .2) * lights * 1.5;
  col += jc * canals * 1.1 + core * lobes * (accent > .5 ? 1.5 : .35) + rimC * ring * .35;
  col += mix(rimC, u_accent, .8) * (canals + lobes + margin * .6) * 2.4 * v_l.w;
  // Beat-locked swarms flash as they contract.
  col *= v_i.z * glowP * (1. + .9 * con * beatLock);
  outColor = vec4(col * keep, 1.);
}`;

// Background: the water itself (also the fog colour of every surface).
const background = `
${common}
void main() {
  dInit();
  float dev = D_DEV;
  DCam c = dCamera(dev, 0.);
  vec2 ndc = v_uv * 2. - 1.;
  float A = u_resolution.x / u_resolution.y;
  vec3 rd = normalize(c.r * ndc.x * max(A, 1.) / c.F + c.u * ndc.y / (c.F * min(A, 1.)) + c.f);
  outColor = vec4(dWater(rd, dev), 1.);
}`;

const simulation = `
${common}
vec4 dBytes(uint v) { return vec4(uvec4(v >> 24, (v >> 16) & 255u, (v >> 8) & 255u, v & 255u)) / 255.; }
uint dAdvance(uint w, float perSecond) { return w + uint(floor(u_dt * perSecond * 4294967296. + .5)); }
void main() {
  dInit();
  ivec2 cell = ivec2(gl_FragCoord.xy);
  int id = cell.x + cell.y * ${SIZE[0]};
  float dev = D_DEV;
  vec4 old = texelFetch(u_state, cell, 0);
  // Kick latch and light-wave trigger, evaluated identically by texels 3–6.
  vec4 latch = texelFetch(u_state, ivec2(6, 0), 0);
  // Beats are counted from the show's beat clock (rhythm-agnostic).
  uint beatNow = uint(max(floor(u_beat), 0.)) & 255u;
  uint counter = uint(latch.a * 255. + .5);
  bool edge = !u_reset && beatNow != counter;
  uint gate = u_level > .62 ? 2u : u_level > .35 ? 4u : 8u;
  bool kickWave = edge && dev > 1.1 && beatNow % gate == 0u;
  bool gesture = !u_reset && u_rhythmHit.y > .5 && dev > .5;
  bool trigger = kickWave || gesture;
  int slot = int(latch.b * 3. + .5);
  float Z = dCycle(dWord(0), 1u) * D_PERIOD;
  float waveZ = fract((Z + 8. + 5. * dRnd(4500u + beatNow, 1u)) / D_PERIOD);
  if (id < D_RESERVED) {
    if (id <= 2) {
      uint w = dWord(id);
      if (u_reset) w = dHash(u_seedBits + uint(id) * 7919u);
      else if (id == 0) w = dAdvance(w, ${f(SPEED)} * clamp(u_params[1], 0., 3.) / D_PERIOD);
      else if (id == 1) w = dAdvance(w, .45 * clamp(u_params[2], 0., 3.) / 64.);
      else w = dAdvance(w, (.4 + .6 * clamp(u_params[1], 0., 3.)) / 1200.);
      outColor = dBytes(w);
    } else if (id == 3 || id == 4 || id == 7 || id == 8) {
      float age = unpack16(old.rg) * 8.;
      float strength = old.b;
      if (u_reset) { age = 8.; strength = 0.; }
      else age = min(8., age + u_dt);
      if (trigger && dWaveTexel(slot) == id) {
        age = 0.;
        strength = gesture ? 1. : dSS(1.1, 1.8, dev) * (.55 + .45 * u_level);
        outColor = vec4(pack16(0.), strength, float(beatNow) / 255.);
      } else outColor = vec4(pack16(age / 8.), strength, old.a);
    } else if (id == 5 || id == 9) {
      vec4 o = u_reset ? vec4(0.) : old;
      int base = id == 5 ? 0 : 2;
      if (trigger && slot == base) o.rg = pack16(waveZ);
      if (trigger && slot == base + 1) o.ba = pack16(waveZ);
      outColor = o;
    } else if (id >= 10 && id < 14) {
      // Seeded origin offsets of the wave in slot id − 10.
      vec4 o = u_reset ? vec4(0.) : old;
      if (trigger && slot == id - 10) {
        float x = dCamX(dUnpack16(pack16(waveZ)) * D_PERIOD) + (dRnd(4500u + beatNow, 2u) - .5) * 7.;
        float y = (dRnd(4500u + beatNow, 3u) - .5) * 1.4;
        o = vec4(pack16(.5 + .5 * x / D_WAVE_X), pack16(.5 + .5 * y / D_WAVE_Y));
      }
      outColor = o;
    } else if (id == 6) {
      float env = u_reset ? 0. : latch.r * exp(-u_dt * 5.);
      if (edge) env = 1.;
      outColor = vec4(env, 0., float(trigger ? (slot + 1) % 4 : slot) / 3., float(beatNow) / 255.);
    } else if (id == 14) {
      float age = u_reset ? 3. : min(3., dUnpack16(old.rg) * 3. + u_dt);
      float strength = u_reset ? 0. : old.b;
      float direction = old.a;
      if (!u_reset && u_rhythmHit.w > .5) {
        age = 0.;
        strength = max(.5, u_rhythm.w);
        direction = mod(u_rhythmCount.w, 2.);
      }
      outColor = vec4(pack16(age / 3.), strength, direction);
    } else if (id == 15) {
      // Retain the preceding front so a close fill never erases its transit.
      vec4 prior = u_rhythmHit.w > .5 ? texelFetch(u_state, ivec2(14, 0), 0) : old;
      float age = u_reset ? 3. : min(3., dUnpack16(prior.rg) * 3. + u_dt);
      outColor = vec4(pack16(age / 3.), u_reset ? 0. : prior.b, prior.a);
    } else outColor = vec4(0.);
    return;
  }
  if (u_reset || !dIsPlankton(id)) { outColor = vec4(0.); return; }
  float g = unpack16(old.rg);
  g = max(0., g - u_dt * (.22 + .85 * g));
  uint S = dWord(2), P = dWord(1);
  DCam c = dCamera(dev, 0.);
  vec3 p = dPlankton(id, dev, Z, S);
  float react = clamp(u_params[4], 0., 2.5);
  // Bow wave: plankton ahead of the gliding camera flare up as it passes.
  vec3 q = p - c.p;
  float ahead = clamp(dot(q, c.f), 0., 2.6);
  float wake = length(q - c.f * ahead);
  g = max(g, dSS(.55 + .35 * react, .1, wake) * .85 * min(1., react));
  // Contracting bells push the water: plankton around them light up.
  if (dev > .25) {
    for (int i = 0; i < D_NJ; i++) {
      // Conservative axial broad phase, before pulse/tilt/hash work. The
      // largest bell radius is 1.45 (others .75), with .7 axial drift.
      float initial = float(dHash(u_seedBits)) * (D_PERIOD / 4294967296.);
      float jz = i < 5 ? mod(initial + (i == 0 ? 9. : i == 1 ? 11.5 : i == 2 ? 19.5 : i == 3 ? 38. : 52.), D_PERIOD)
        : fract(float(i) * .618034 + .37 + .05 * dRnd(uint(i), 1u)) * D_PERIOD;
      float dz = abs(mod(jz - Z - p.z + D_PERIOD * .5, D_PERIOD) - D_PERIOD * .5);
      if (dz > (i < 5 ? 1.45 : .75) * 3. + .7) continue;
      DJelly j = dJelly(i, dev, Z, u_params[3], u_rhythm.x);
      if (j.reveal < .05) continue;
      vec3 jc = j.c;
      jc.z = dRel(jc.z, Z);
      float d = length(p - jc);
      if (d > j.R * 3.) continue;
      float push = max(dSS(0., .05, j.own) * (1. - dSS(.12, .3, j.own)), j.kick);
      g = max(g, dSS(j.R * 2.8, j.R * 1.05, d) * push * j.reveal * min(1., .45 * react + .2));
    }
  }
  // Light waves: expanding shells from points ahead of the camera.
  g = max(g, dWaveLight(p, Z, dev, react) * min(1., .55 + .35 * react));
  g = max(g, dRelay(p) * .85);
  outColor = vec4(pack16(clamp(g, 0., 1.)), 0., 1.);
}`;

const particles = `
${common}
out float v_soft;
void main() {
  dInit();
  int id = gl_VertexID;
  gl_Position = vec4(0., 0., 2., 1.);
  gl_PointSize = 1.;
  v_color = vec3(0.);
  v_soft = 0.;
  if (id < D_RESERVED) return;
  float dev = D_DEV;
  DCam c = dCamera(dev, dBeatEnv());
  uint S = dWord(2), P = dWord(1), uid = uint(id);
  float Z = c.Z;
  vec3 p, col;
  float size, minSize = 1.;
  if (id < D_RESERVED + D_LURES) {
    // Anglerfish lures: rare accent lights hovering above the seabed.
    float h1 = dRnd(uid, 61u), h2 = dRnd(uid, 62u), h3 = dRnd(uid, 63u);
    float x = (h1 - .5) * 22. + .4 * dWave(S, 31u, h2), z = h3 * D_PERIOD + .5 * dWave(S, 27u, h1);
    p = vec3(x, dFloorY(x, z) + .45 + 1.1 * h2 + .15 * dWave(S, 59u, h3), dRel(z, Z));
    float b = id == D_RESERVED ? -1. : .15 + .7 * dRnd(uid, 64u);
    float rev = b < 0. ? 1. : dSS(b - .15, b + .1, dev);
    float beat = .65 + .35 * dWave(P, 9u, h1);
    col = mix(u_accent, vec3(1.), .15) * 1.6 * rev * beat;
    size = .055 * (.6 + .4 * rev);
    minSize = 2.5;
  } else if (!dIsPlankton(id)) {
    // Marine snow: dim flakes sinking through the window around the camera.
    float h1 = dRnd(uid, 41u), h2 = dRnd(uid, 42u), h3 = dRnd(uid, 43u), h4 = dRnd(uid, 44u);
    float yf = fract(h2 - dCycle(S, 2u + uint(h1 * 3.)));
    float zr = mod(h4 * 32. - Z + 2., 32.) - 2.;
    p = vec3((h3 - .5) * 26. + .3 * dWave(S, 31u, h1), D_FLOOR - .2 + 9.6 * yf, zr);
    float edge = dSS(0., .06, yf) * dSS(1., .9, yf) * dSS(30., 18., zr) * dSS(13., 10., abs(p.x - c.p.x));
    float light = .065 + .2 * (1. - dSS(.3, 1.2, dev)) + .5 * dShaftReveal(dev) * min(dShaftLight(p, Z), 2.);
    light += .06 * dSS(1.2, 2., dev) * dSS(-1., -2.7, p.y);
    col = mix(u_secondary, vec3(1.), .25) * light * edge * .45 * step(.45, h1);
    size = (.01 + .012 * h1) * (1. + .4 * (1. - dSS(.3, 1.2, dev)));
  } else {
    // Bioluminescent plankton: disturbance glow from the simulation.
    p = dPlankton(id, dev, Z, S);
    float h7 = dRnd(uid, 60u), h8 = dRnd(uid, 54u);
    vec4 st = texelFetch(u_state, ivec2(id % ${SIZE[0]}, id / ${SIZE[0]}), 0);
    float g = unpack16(st.rg);
    float base = .012 + .02 * (1. - dSS(.3, 1., dev));
    float blink = 0.;
    if (h7 < .05 + .15 * (1. - dSS(.3, 1.2, dev))) {
#ifdef PHOSPHOR_LATE
      float t = u_time * (.25 + .3 * h8) + h7 * 97.;
#else
      float t = mod(u_time, 4096.) * (.25 + .3 * h8) + h7 * 97.;
#endif
      float slot = floor(t);
      blink = step(.55 - .2 * (1. - dSS(.3, 1.2, dev)), fract(sin(slot * 12.9898 + h8 * 78.2) * 43758.5453)) * pow(sin(D_PI * fract(t)), 8.);
    }
    vec3 pc = dPal(.25 + .4 * h8);
    float spark = 1. - dSS(.3, 1.2, dev);
    float relay = dRelay(p);
    float e = base + 1.5 * g + (.7 + .6 * spark) * blink;
    col = mix(pc, u_accent, clamp(relay, 0., 1.)) * e;
    // Dark water around the principal animals keeps canals/tentacles legible.
    float gap = 1.;
    float initial = float(dHash(u_seedBits)) * (D_PERIOD / 4294967296.);
    for (int i = 0; i < 5; i++) {
      float z = mod(initial + (i == 0 ? 9. : i == 1 ? 11.5 : i == 2 ? 19.5 : i == 3 ? 38. : 52.), D_PERIOD);
      // 1.45 * 1.8 + .7 axial drift: exact rejection outside the dark gap.
      if (abs(dRel(z, Z) - p.z) > 3.31) continue;
      DJelly j = dJelly(i, dev, Z, u_params[3], 0.);
      j.c.z = dRel(j.c.z, Z);
      vec3 delta = p - j.c;
      delta.y = max(delta.y, -j.L) * .32;
      gap *= mix(.12, 1., dSS(j.R * 1.1, j.R * 1.8, length(delta)));
    }
    col *= gap * mix(1., .28, dSS(10., 30., p.z));
    col *= dSS(-D_BACK + .5, -D_BACK + 2., p.z) * dSS(46., 36., p.z);
    size = .011 + .03 * max(g, blink * (1. + .6 * spark));
  }
  vec4 q = dProject(c, p);
  if (q.w < .08) return;
  float px = size * dPixels(c, q.w), lo = dMinPx() * minSize;
  bool snow = id >= D_RESERVED + D_LURES && !dIsPlankton(id);
  float pts = clamp(px, lo, (snow ? 24. : 7.) * dMinPx());
  // Sub-pixel points dim instead of shrinking; near flakes become bokeh.
  col *= min(1., px / lo) * min(1., px / lo) * (px > pts ? pts * pts / (px * px) : 1.) * 1.;
  v_soft = snow ? dSS(1.6, .5, q.w) : 0.;
  col *= mix(1., .2, v_soft) * (1. - dFog(length(p - c.p)));
  v_color = col;
  gl_Position = q;
  gl_PointSize = pts;
}`;

const particleFragment = `#version 300 es
precision highp float;
in vec3 v_color;
in float v_soft;
out vec4 outColor;
void main() {
  vec2 d = gl_PointCoord * 2. - 1.;
  float r2 = dot(d, d);
  if (r2 > 1.) discard;
  float point = exp(-r2 * 3.2);
  float bokeh = (1. - smoothstep(.72, 1., r2)) * (.55 + .45 * r2);
  outColor = vec4(v_color * mix(point, bokeh, v_soft), 1.);
}`;

const schema = [
  {
    key: "development",
    label: "Development · sparks / swarms / reef",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "current",
    label: "Current speed",
    min: 0.1,
    max: 2.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "pulse",
    label: "Bell pulse rate",
    min: 0.2,
    max: 2.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "swarm",
    label: "Swarm density",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "reactivity",
    label: "Plankton reactivity",
    min: 0,
    max: 2.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "glow",
    label: "Bioluminescence",
    min: 0.3,
    max: 1.8,
    step: 0.01,
    default: 1,
  },
  {
    key: "sway",
    label: "Current sway",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "gaze",
    label: "Gaze up / down",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0,
  },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    current: 1,
    pulse: 1,
    swarm: 0.5,
    reactivity: 1,
    glow: 1,
    sway: 1,
    gaze: 0,
    ...params,
  },
});
export default {
  id: "abyss",
  number: 92,
  name: "Bioluminescent Abyss",
  description:
    "Deep water lit only by living light: lone medusae and blinking plankton become pulsing jellyfish blooms and a glowing reef the camera glides over.",
  development: "development",
  schema,
  presets: [
    look("First Sparks", 61, 0),
    look("Medusa Bloom", 61, 1),
    look("Lantern Reef", 61, 2),
    look("Siphonophore Drift", 1709, 0.85, {
      current: 0.6,
      pulse: 0.8,
      gaze: 0.35,
      sway: 1.3,
    }),
    look("Midnight Swarm", 433, 1.55, {
      swarm: 0.9,
      pulse: 1.3,
      reactivity: 1.4,
      gaze: 0.15,
    }),
    look("Sea Pen Meadow", 2203, 1.9, {
      current: 0.7,
      glow: 1.2,
      gaze: -0.45,
      swarm: 0.3,
    }),
    look("Ghost Bells", 877, 1.15, {
      glow: 0.95,
      pulse: 0.6,
      current: 0.5,
      reactivity: 0.6,
      gaze: 0.2,
    }),
    look("Abyssal Storm", 3301, 2, {
      current: 1.6,
      reactivity: 1.8,
      swarm: 1,
      pulse: 1.4,
    }),
  ],
  stage: ["current", "pulse", "reactivity"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    current: { mul: [0.6, 1.5] },
    pulse: { mul: [0.6, 1.6] },
    swarm: [0, 0.6],
    reactivity: { mul: [0.5, 1.6] },
    sway: { mul: [0.7, 1.4] },
  },
  beat: { punch: 0.05, pulse: 0.05 },
  audio: [
    { param: "pulse", feature: "low", amount: 0.05 },
    { param: "reactivity", feature: "high", amount: 0.06 },
  ],
  rhythmStyles: {
    restrained: "Abyssal hush",
    driving: "Lantern drift",
    accented: "Reef awakening",
  },
  rhythm: [
    familyEffect(
      "bell-beat",
      0,
      "Bell beat",
      "Every jellyfish bell contracts together.",
      {
        period: 4,
        strength: 0.7,
        duration: 0.5,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....... | ...x.... | ......X. | ..x.....",
            division: 2,
            strength: 0.7,
            duration: 1.2,
          },
          driving: {
            steps: "X....x.. | ..X...x.",
            division: 2,
            strength: 0.95,
            duration: 0.85,
          },
          accented: {
            steps: "X......x........ | ....X......x.... | ..X......x......",
            division: 4,
            strength: 1,
            duration: 0.8,
          },
        },
      },
    ),
    familyEffect(
      "plankton-wave",
      1,
      "Plankton wave",
      "A shell of light ripples outwards through the plankton.",
      {
        period: 8,
        strength: 0.7,
        duration: 1,
        steps: "X.......",
        styles: {
          restrained: {
            steps: ".....x.. | .......X | ........ | .....x..",
            division: 2,
            strength: 0.55,
            duration: 1.5,
          },
          driving: {
            steps: "...X.... | .......x | .....X.. | ........",
            division: 2,
            strength: 0.8,
            duration: 1.25,
          },
          accented: {
            steps:
              ".....X.......... | ...........x.... | .......X.....x.. | ..............X.",
            division: 4,
            strength: 0.94,
            duration: 1,
          },
        },
      },
    ),
    familyEffect(
      "reef-cascade",
      2,
      "Reef cascade",
      "A front of light sweeps across the reef: crowns, sea pens and fans flare in turn.",
      {
        period: 16,
        strength: 0.7,
        duration: 2,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "..X...x. | ...X..x.",
            division: 2,
            strength: 0.65,
            duration: 0.65,
          },
          driving: {
            steps: "..X.x..x | .X..x.X.",
            division: 2,
            strength: 0.9,
            duration: 0.4,
          },
          accented: {
            steps: "..X.x..x.X..x.X. | .X..x.X..x.X.x.X",
            division: 4,
            strength: 1,
            duration: 0.2,
          },
        },
      },
    ),
    familyEffect(
      "living-relay",
      3,
      "Living relay",
      "A bioluminescent fill travels across reef polyps, bell canals and plankton, alternating sides.",
      {
        period: 8,
        strength: 0.9,
        duration: 0.9,
        steps: "...X.... | ......X.",
        styles: {
          restrained: {
            steps: "........ | ......X. | ........ | ....x...",
            division: 2,
            strength: 0.65,
            duration: 1.4,
          },
          driving: {
            steps: "...X..........X. | ......X.......X.",
            division: 4,
            strength: 0.95,
            duration: 0.9,
          },
          accented: {
            steps: "..X.....X.....X. | ....X.....X...X.",
            division: 4,
            strength: 1,
            duration: 0.8,
          },
        },
      },
    ),
  ],
  fragment: background,
  simulation: { fragment: simulation, size: SIZE, steps: 1 },
  particles: { vertex: particles, fragment: particleFragment, depth: true },
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    additiveFrom: OPAQUE_VERTICES,
    vertex,
    fragment: surface,
  },
};
