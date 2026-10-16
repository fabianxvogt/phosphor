import { familyEffect } from "./family-rhythm.mjs";
import {
  BANK_RANGE,
  CLOCK_PERIOD,
  LATTICE,
  N,
  POS_RANGE,
  TAU_STARTLE,
  VEL_RANGE,
} from "./murmuration-model.mjs";
import { ATTRIBUTES, createGeometry } from "./murmuration-geometry.mjs";

// Starling Flock (#88): 32 767 birds on a fixed topological lattice, simulated
// on the GPU (four RGBA8 texels per bird) and drawn as oriented, banking,
// flapping bird meshes. murmuration-model.mjs is the CPU reference.
const f = (x) => (Number.isInteger(x) ? `${x}.` : `${x}`);
const [W, H] = LATTICE;

const common = `
const float MU_TAU = 6.283185307179586;
const float MU_P = ${f(CLOCK_PERIOD)};
const int MU_W = ${W}, MU_H = ${H};
const float MU_PR = ${f(POS_RANGE)}, MU_VR = ${f(VEL_RANGE)}, MU_BR = ${f(BANK_RANGE)};
uint muHash(uint x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16;
  return x;
}
uint muKey() { return muHash(u_seedBits + 0x2545f491u); }
float muRnd(uint key, uint id, uint k) {
  return float(muHash((id * 0x9e3779b9u) ^ muHash(k + key)) >> 8) / 16777216.;
}
uint muWord(vec4 t) {
  uvec4 b = uvec4(t * 255. + .5);
  return (b.r << 24) | (b.g << 16) | (b.b << 8) | b.a;
}
vec4 muBytes(uint v) {
  return vec4(uvec4(v >> 24, (v >> 16) & 255u, (v >> 8) & 255u, v & 255u)) / 255.;
}
uint muClock() { return muWord(texelFetch(u_state, ivec2(0), 0)); }
float muCycle(uint c, uint n) { return float(c * n) * (1. / 4294967296.); }
float muSmooth(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
float muDec(vec2 b) { return dot(b, vec2(256., 1.)) * (255. / 65535.); }
struct Bird { vec3 p, v; float T, bank; };
ivec2 muCell(int id) { return ivec2(4 * (id % MU_W), id / MU_W); }
vec3 muPos(int id) {
  ivec2 c = muCell(id);
  vec4 t0 = texelFetch(u_state, c, 0), t1 = texelFetch(u_state, c + ivec2(1, 0), 0);
  return (vec3(muDec(t0.rg), muDec(t0.ba), muDec(t1.rg)) * 2. - 1.) * MU_PR;
}
Bird muBird(int id) {
  ivec2 c = muCell(id);
  vec4 t0 = texelFetch(u_state, c, 0), t1 = texelFetch(u_state, c + ivec2(1, 0), 0);
  vec4 t2 = texelFetch(u_state, c + ivec2(2, 0), 0), t3 = texelFetch(u_state, c + ivec2(3, 0), 0);
  Bird b;
  b.p = (vec3(muDec(t0.rg), muDec(t0.ba), muDec(t1.rg)) * 2. - 1.) * MU_PR;
  b.v = (vec3(muDec(t1.ba), muDec(t2.rg), muDec(t2.ba)) * 2. - 1.) * MU_VR;
  b.T = muDec(t3.rg);
  b.bank = (muDec(t3.ba) * 2. - 1.) * MU_BR;
  return b;
}
// x flock, y surge, z formation, w loose.
vec4 muWeights(float dev) {
  float d = clamp(dev, 0., 2.), form = muSmooth(1., 2., d);
  return vec4(.06 + .94 * muSmooth(0., 1., d), muSmooth(0., 1., d) * (1. - form), form, 1. - muSmooth(0., 1., d));
}
vec3 muAnchor(uint c) {
  return vec3(3.2 * sin(MU_TAU * muCycle(c, ${N.anchorX}u)),
    2.8 + .6 * sin(MU_TAU * muCycle(c, ${N.anchorY}u)),
    2.4 * sin(MU_TAU * muCycle(c, ${N.anchorX * 2}u) + 1.));
}
vec3 muFalcon(uint c) {
  float s = (muCycle(c, ${N.falcon}u) - .5) * 2.;
  vec3 a = muAnchor(c);
  float side = MU_TAU * muCycle(c, ${N.falcon / 16}u);
  return a + vec3(cos(side) * s * 9., 2.5 - 2.5 * (1. - s * s) + .5, sin(side) * s * 9.);
}
float muYaw(uint c) { return MU_TAU * (muCycle(c, ${N.yaw}u) + muRnd(muKey(), 0u, 907u)); }
// A folded sheet, not a uniformly filled volume. Cross-sheet compression
// creates dense ribbons with graded skirts; integer clock modes are endless.
vec3 muCloud(float u, float v, float h, uint c) {
  float t = MU_TAU * (u + muCycle(c, ${N.swirl}u));
  float flow = MU_TAU * muCycle(c, ${N.flow}u);
  float br = MU_TAU * muCycle(c, ${N.breath}u);
  float fold = clamp(u_params[5], 0., 2.);
  float s = 2.*v-1., swell = cos(t+br);
  float width = 1.65*(.7*s*s*s+.3*s)*(.65+.35*swell*swell);
  float wave = 2.*t + flow;
  vec3 q = vec3(4.2*cos(t), 1.65*sin(wave)+.5*fold*sin(3.*t-flow), 1.6*sin(t));
  q += vec3(.35*width*sin(t), width*(.8+.3*sin(br+t)), (h-.5)*.95 + width*cos(wave));
  float yaw = muYaw(c), cy = cos(yaw), sy = sin(yaw);
  return vec3(cy*q.x+sy*q.z,q.y,-sy*q.x+cy*q.z) + vec3(0., 1.2, 0.);
}
vec3 muKnot(float t) { return 1.25 * vec3(sin(t) + 2. * sin(2. * t), -sin(3. * t), cos(t) - 2. * cos(2. * t)); }
vec3 muSlot(float u, float v, float h, uint c, float formation) {
  float circ = MU_TAU * muCycle(c, ${N.circ}u), roll = MU_TAU * muCycle(c, ${N.roll}u);
  float th = MU_TAU * u + circ;
  // A travelling compression changes density sharply along the ribbon.
  th += .55*sin(th-roll)+.19*sin(3.*th+roll);
  float sheet = 2.*v-1., swell = sin(th+roll);
  float width = 1.85*(.7*sheet*sheet*sheet+.3*sheet)*(.65+.35*swell*swell);
  float curl = 2.*th+roll;
  vec3 torus = vec3(3.8*cos(th), 2.05*sin(curl)+.35*sin(3.*th-roll), 1.4*sin(th));
  torus += vec3(.2*width*cos(th), width*cos(th+roll), width*sin(th+roll)+(h-.5)*.55);
  float s = MU_TAU * (u + muCycle(c, ${N.circ / 2}u));
  vec3 k0 = muKnot(s), tan = normalize(muKnot(s + .01) - k0);
  vec3 nrm = normalize(cross(tan, vec3(0., 1., 0.))), bin = cross(tan, nrm);
  float tw = 2. * s + roll, w = (v - .5) * 1.3, d = (h - .5) * .5;
  vec3 ribbon = k0 + (nrm * cos(tw) + bin * sin(tw)) * w + (bin * cos(tw) - nrm * sin(tw)) * d;
  float strand = v < .5 ? 0. : 3.141592653589793;
  // Open strand ends fray into a seeded tail instead of a cut row.
  float tail = muSmooth(.75, 1., abs(2. * u - 1.));
  float y = (u - .5) * 6.4 + sign(u - .5) * tail * tail * 1.3 * h;
  // Each strand is dense at its centre and frays at its angular edges.
  float sv = 4. * mod(v, .5) - 1.;
  float fr = (.7 + .32 * (y + 3.2) + .6 * h * h + .3 * sv * sv) * (1. - .3 * tail);
  float ta = MU_TAU * 2.2 * u + circ + strand + 1.1 * (.6 * sv * sv * sv + .4 * sv);
  vec3 twister = vec3(fr * cos(ta), y, fr * sin(ta));
  float fm = mod(formation, 3.);
  float i = floor(fm), t = muSmooth(0., 1., fm - i);
  vec3 a = i < .5 ? torus : i < 1.5 ? ribbon : twister;
  vec3 b = i < .5 ? ribbon : i < 1.5 ? twister : torus;
  vec3 q = mix(a, b, t);
  // Tilt toward the orbiting camera so rings read as rings from below.
  float yaw = muYaw(c), cy = cos(yaw), sy = sin(yaw);
  q = vec3(q.x, .9 * q.y + .43589 * q.z, -.43589 * q.y + .9 * q.z);
  return vec3(cy * q.x + sy * q.z, q.y, -sy * q.x + cy * q.z) + vec3(0., 1.2, 0.);
}
// Persistent per-bird home offset: rows near the sheet's edges spread into a
// ragged fringe and a seeded share strays outside the sheet, so density
// falls off into stragglers instead of ending at a cut edge.
vec3 muJitter(uint key, uint uid, float v) {
  float e = muSmooth(.55, 1., abs(2. * v - 1.));
  vec3 j = (vec3(muRnd(key, uid, 8u), muRnd(key, uid, 9u), muRnd(key, uid, 10u)) - .5) * (.3 * (1. + 3. * e * e));
  if (muRnd(key, uid, 11u) < .05 + .3 * e * e) {
    vec3 d = vec3(muRnd(key, uid, 12u), muRnd(key, uid, 13u), muRnd(key, uid, 14u)) - .5;
    j += d * ((.5 + 1.2 * muRnd(key, uid, 15u)) / max(length(d), 1e-3));
  }
  return j;
}
// The falcon strikes a count-selected real bird in the flock's core rows.
int muStrikeBird(float count) {
  float a = fract(sin(count * 12.9898 + 4.1) * 43758.5453);
  float b = fract(sin(count * 78.233 + 1.7) * 12543.123);
  int row = MU_H / 2 + int((b - .5) * .3 * float(MU_H));
  return max(1, row * MU_W + int(a * float(MU_W)));
}
// Linear 0→1 progress of a rhythm gesture: invert the scheduler's
// smoothstep envelope with the amplitude stored at its hit (clock bird,
// texel 2). A wave can then sweep across the flock exactly once.
vec4 muHitAmp() { return texelFetch(u_state, ivec2(2, 0), 0); }
float muPhase(float env, float amp) {
  float y = clamp(env / max(amp, .02), 0., 1.);
  return env > .001 ? .5 + sin(asin(1. - 2. * y) / 3.) : 1.;
}
// A second persistent uint phase integrates the formation-rate fader. It
// cannot jump at a fractional-rate cycle wrap or when the rate is edited.
float muFormation(uint c) { return u_params[2] + 3. * muCycle(muWord(texelFetch(u_state,ivec2(1,0),0)),1u); }
`;

// Camera and sky, shared by the sky pass and the birds.
const view = `
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
struct MuCam { vec3 eye, right, up, fwd; float focal, dive; };
MuCam muCamera(uint c, float dev) {
  MuCam m;
#ifdef PRECOMPUTED
  m.eye=texelFetch(u_precomputed,ivec2(0,0),0).xyz;
  m.right=texelFetch(u_precomputed,ivec2(1,0),0).xyz;
  m.up=texelFetch(u_precomputed,ivec2(2,0),0).xyz;
  m.fwd=texelFetch(u_precomputed,ivec2(3,0),0).xyz;
  vec2 lens=texelFetch(u_precomputed,ivec2(4,0),0).xy;
  m.focal=lens.x; m.dive=lens.y;
#else
  uint key = muKey();
  vec4 w = muWeights(dev);
  vec3 a = muAnchor(c);
  float yaw = muYaw(c);
  float wave = .5 - .5 * cos(MU_TAU * muCycle(c, ${N.dive}u));
  m.dive = muSmooth(1.35, 1.9, dev) * muSmooth(.2, .8, wave);
  float dist = u_params[6] * (mix(9.4, 7.8, w.x) - 1.1 * w.z);
  // A bounded dive at the peak: part of the formation sweeps close past the
  // lens while the rest of it stays in frame.
  float r = mix(dist, .66 * dist, m.dive);
  // Eye height is absolute so the horizon stays put; the flock flies above.
  float h = mix(.45, 3.2, clamp(u_params[7], 0., 1.)) + .15 * sin(MU_TAU * muCycle(c, ${N.anchorY * 3}u));
  m.eye = vec3(a.x + r * sin(yaw), h, a.z + r * cos(yaw));
  // The aim drifts beside the flock over ~24 s: off-centre framing that
  // moves by phrase, never a cut or a lurch (integer clock harmonic).
  vec3 aim = a + vec3(0., .7, 0.);
  vec3 side0 = normalize(cross(aim - m.eye, vec3(0., 1., 0.)));
  aim += side0 * (1.1 + .5 * w.x) * sin(MU_TAU * muCycle(c, ${N.drift}u));
  m.fwd = normalize(aim - m.eye);
  m.right = normalize(cross(m.fwd, vec3(0., 1., 0.)));
  m.up = cross(m.right, m.fwd);
  m.focal = mix(1.8 - .15 * w.z, 1.45, m.dive) * (1. + .02 * clamp(u_kick, 0., 1.));
#endif
  return m;
}
vec3 muSun() {
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed,ivec2(5,0),0).xyz;
#else
  float az = MU_TAU * muRnd(muKey(), 0u, 908u);
  return normalize(vec3(cos(az), -.012, sin(az)));
#endif
}
float muNoise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  vec4 a=fract(sin(vec4(dot(i,vec2(127.1,311.7)),dot(i+vec2(1,0),vec2(127.1,311.7)),
    dot(i+vec2(0,1),vec2(127.1,311.7)),dot(i+vec2(1),vec2(127.1,311.7))))*43758.5453);
  return mix(mix(a.x,a.y,f.x),mix(a.z,a.w,f.x),f.y);
}
vec2 muRot(vec2 h, float a) { float c=cos(a), s=sin(a); return vec2(c*h.x-s*h.y, s*h.x+c*h.y); }
// Two raw cloud fields (thresholds and light are applied at output): high
// wisps stretched along azimuth and low lumpy banks. Each layer turns about
// the zenith at its own integer clock rate, so they drift with parallax,
// endlessly and without an azimuth seam.
vec2 muCloudExact(vec3 dir) {
  float e=max(dir.y,0.);
  vec2 h=normalize(dir.xz+vec2(1e-5));
  uint c=muClock();
  vec2 hh=muRot(h,MU_TAU*muCycle(c,${N.highDrift}u)), hl=muRot(h,MU_TAU*muCycle(c,${N.lowDrift}u));
  // Domain-warped value noise: organic edges, no straight cell contours.
  vec2 q=hh*3.6+vec2(e*11.,-e*9.);
  q+=.6*vec2(muNoise(q*1.7+3.),muNoise(q*1.7+8.));
  float hi=.6*muNoise(q)+.28*muNoise(q*2.6+11.)+.12*muNoise(q*6.1+2.);
  vec2 r=hl*4.5+vec2(e*34.,e*27.);
  r+=.8*vec2(muNoise(r*1.3+1.),muNoise(r*1.3+6.));
  float lo=.55*muNoise(r)+.3*muNoise(r*2.3+5.)+.15*muNoise(r*5.1+9.);
  return vec2(hi,lo);
}
vec2 muRidges(vec2 h) {
  vec2 h2=vec2(h.x*h.x-h.y*h.y,2.*h.x*h.y);
  vec2 h3=vec2(h2.x*h.x-h2.y*h.y,h2.x*h.y+h2.y*h.x);
  vec2 h4=vec2(h2.x*h2.x-h2.y*h2.y,2.*h2.x*h2.y);
  vec2 h7=vec2(h3.x*h4.x-h3.y*h4.y,h3.x*h4.y+h3.y*h4.x);
  return vec2(.004+.007*h3.y+.003*h7.x,-.012+.006*h4.y+.003*h7.y);
}
vec4 muCloudData(vec3 dir) {
#ifdef PRECOMPUTED
  // Periodic angular density data, not cached sky colour. Final palette,
  // scattering, silhouettes and reflections still shade at output resolution.
  vec2 h=dir.xz/max(abs(dir.x)+abs(dir.z),1e-6);
  float az=dir.z>=0.?1.-h.x:3.+h.x;
#ifdef PRECOMPUTED_LINEAR
  return texture(u_precomputed,vec2(az*.25,(1.+clamp(dir.y*128.,.5,127.5))/129.));
#else
  vec2 grid=vec2(az*.25,clamp(dir.y,0.,1.))*vec2(512.,128.)-.5;
  ivec2 c=ivec2(floor(grid)); vec2 f=fract(grid);
  ivec2 a=ivec2((c.x+512)%512,1+clamp(c.y,0,127)), b=ivec2((c.x+513)%512,1+clamp(c.y+1,0,127));
  return mix(mix(texelFetch(u_precomputed,a,0),texelFetch(u_precomputed,ivec2(b.x,a.y),0),f.x),
    mix(texelFetch(u_precomputed,ivec2(a.x,b.y),0),texelFetch(u_precomputed,b,0),f.x),f.y);
#endif
#else
  return vec4(muCloudExact(dir),muRidges(normalize(dir.xz+vec2(1e-5))));
#endif
}
// Dusk: a near-black secondary zenith, saturated primary light confined to
// a low horizon band, dusky secondary between (where the flock flies).
// Darkening moves toward secondary, never to a dark (olive) primary.
// Energy widens the glow band and breaks the cloud banks up.
vec3 muSky(vec3 dir) {
  vec3 L = muSun();
  float e = dir.y, ep = max(e, 0.), level = clamp(u_level, 0., 1.);
  vec2 h = normalize(dir.xz + vec2(1e-5)), s = normalize(L.xz);
  float az = .5 + .5 * dot(h, s);
  float band = exp(-ep * mix(7.5, 5.0, level));
  vec3 col = u_secondary * (.025 + .45 * exp(-ep * 2.8));
  col += u_primary * band * (.5 + .45 * az * az * az);
  col += u_primary * exp(-ep * 26.) * pow(az, 18.) * .45;
  vec4 clouds=muCloudData(dir);
  // High banks: translucent darker bands whose lower edges catch the glow.
  float hiT = mix(.44, .56, level);
  float hi = muSmooth(hiT, hiT + .27, clouds.x) * muSmooth(.1, .3, ep) * (1. - muSmooth(.6, .95, ep));
  col = mix(col, col * .5 + u_secondary * .012, hi * .65);
  col += u_secondary * hi * (1. - hi) * .1;
  col += u_primary * hi * (1. - hi) * (.03 + .2 * band) * (.5 + .5 * az);
  // Low banks: lumpy, broken, silhouetted against the glow with lit rims.
  float loT = mix(.46, .6, level);
  float top = .06 + .1 * clouds.x;
  float lo = muSmooth(loT, loT + .26, clouds.y) * muSmooth(.006, .04, ep) * (1. - muSmooth(top * .5, top, ep));
  col = mix(col, col * .35 + u_secondary * .02, lo * .6);
  col += u_primary * lo * (1. - lo) * 2. * band * .25 * (.45 + .55 * az);
  // Two very low distant silhouettes break the laser-straight horizon.
  // Fixed angular harmonics give stable geographic scale cues on the orbit.
  // Integer angular harmonics via complex products: no per-pixel atan or
  // trigonometric calls, and the azimuth seam stays exactly continuous.
  float farRidge=clouds.z, nearRidge=clouds.w;
  col *= mix(.24, 1., muSmooth(farRidge - .0015, farRidge + .0015, e));
  col *= mix(.12, 1., muSmooth(nearRidge - .0015, nearRidge + .0015, e));
  return col;
}
`;

const simulation = `
${common}
float muPack(float x, uint s) {
  float r = tickHash(ivec2(gl_FragCoord.xy), s);
  return min(65535., floor(clamp(x, 0., 1.) * 65535. + r));
}
vec2 muBytes16(float n) { return vec2(floor(n / 256.), mod(n, 256.)) / 255.; }
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  int k = cell.x % 4, id = cell.y * MU_W + cell.x / 4;
  float rate = clamp(u_params[1], 0., 2.);
  if (id == 0) {
    // Texel 2 keeps each slot's latest hit amplitude for muPhase().
    if (k == 2) {
      vec4 amp = u_reset ? vec4(0.) : texelFetch(u_state, ivec2(2, 0), 0);
      outColor = mix(amp, clamp(u_rhythmHit, 0., 1.), vec4(greaterThan(u_rhythmHit, vec4(0.))));
      return;
    }
    uint c = u_reset ? 0u : muWord(texelFetch(u_state, ivec2(k,0), 0));
    if (k == 0) c += uint(u_dt * rate * (4294967296. / MU_P) + .5);
    if (k == 1) c += uint(u_dt * rate * u_params[3] * (4294967296. / 240.) + .5);
    outColor = k < 2 ? muBytes(c) : vec4(0.);
    return;
  }
  uint key = muKey(), clock = muClock(), uid = uint(id);
  float dt = u_dt * rate;
  Bird b;
  if (u_reset) {
    vec3 A = muAnchor(clock);
    b.p = A + muJitter(key, uid, float(id/MU_W)/float(MU_H)) + muCloud(float(id%MU_W)/float(MU_W),float(id/MU_W)/float(MU_H),muRnd(key,uid,6u),clock);
    b.v = vec3(1.2,0.,0.);
    b.T = 0.; b.bank = 0.;
  } else {
    b = muBird(id);
    float dev = clamp(u_params[0], 0., 2.), level = clamp(u_level, 0., 1.);
    vec4 w = muWeights(dev);
    vec3 A = muAnchor(clock), a = vec3(0.), pm = vec3(0.), vm = vec3(0.);
    bool fired = false;
    float count = 0.;
    // Lattice springs with a rest length: the flock is a crumpled sheet that
    // fills space instead of collapsing; closer than .09 neighbours repel.
    float rest = mix(.42, .13, w.x), spring = 2.2 * w.x * (1. - .8 * w.z);
    int x = id % MU_W, y = id / MU_W;
    for (int i = 0; i < 8; i++) {
      ivec2 o = i == 0 ? ivec2(1, 0) : i == 1 ? ivec2(-1, 0) : i == 2 ? ivec2(0, 1) : i == 3 ? ivec2(0, -1)
        : i == 4 ? ivec2(1, 1) : i == 5 ? ivec2(-1, -1) : i == 6 ? ivec2(1, -1) : ivec2(-1, 1);
      int n = ((y + o.y + MU_H) % MU_H) * MU_W + (x + o.x + MU_W) % MU_W;
      if (n == 0) continue;
      Bird q = muBird(n);
      pm += q.p; vm += q.v; count += 1.;
      vec3 d = b.p - q.p;
      float dl = length(d);
      if (dl < .09) a += d * (12. * (.09 - dl) / max(dl, 1e-3));
      else if (dl > rest) a -= d * (spring * (dl - rest) / dl);
      if (q.T > .999) fired = true;
    }
    pm /= count; vm /= count;
    a += (vm - b.v) * 2.6 * w.x;
    vec3 rel = b.p - A;
    // A fixed per-bird offset hides the lattice's rows up close.
    vec3 jit = muJitter(key, uid, float(y) / float(MU_H));
    if (w.w > 0.) {
      // Weak sheet-following leaves room to wander under the existing
      // cruise/neighbor forces, without an unrelated per-group orbit field.
      vec3 home = A + jit + muCloud(float(x)/float(MU_W),float(y)/float(MU_H),muRnd(key,uid,6u),clock);
      a += ((home-b.p)*.8 - b.v*.35) * w.w;
    }
    float strike = clamp(u_params[4], 0., 2.) * (1. + 1.5 * u_rhythm.z);
    if (w.y > 0.) {
      // Each bird's home circulates in the cloud; a drifting displacement
      // field folds the cloud, and its folds are the dense, dark bands.
      float u = float(x) / float(MU_W), v = float(y) / float(MU_H), h = muRnd(key, uid, 6u);
      uint c1 = clock + ${Math.round((0.05 * 2 ** 32) / CLOCK_PERIOD)}u;
      vec3 s0 = A + jit + muCloud(u, v, h, clock), s1 = muAnchor(c1) + jit + muCloud(u, v, h, c1);
      a += (s0 - b.p) * 2.4 * w.y;
      a += ((s1 - s0) / .05 - b.v) * 1.8 * w.y;
      vec3 fd = b.p - muFalcon(clock);
      float fl = length(fd);
      a += fd * (w.y * strike * 14. * exp(-fl * fl * 1.6) / max(fl, .05));
      if (fl < .75 * w.y * strike) fired = true;
    }
    if (w.z > 0.) {
      float u = float(x) / float(MU_W), v = float(y) / float(MU_H), h = muRnd(key, uid, 6u);
      float form = muFormation(clock);
      uint c1 = clock + ${Math.round((0.05 * 2 ** 32) / CLOCK_PERIOD)}u;
      vec3 s0 = A + jit + muSlot(u, v, h, clock, form);
      vec3 s1 = muAnchor(c1) + jit + muSlot(u, v, h, c1, form);
      a += (s0 - b.p) * 5.2 * w.z;
      a += ((s1 - s0) / .05 - b.v) * 3.0 * w.z;
    }
    // Rhythm: a startle wave from a seeded point; a falcon strike.
    if (u_rhythmHit.y > 0.) {
      int ox = int(mod(u_rhythmCount.y*73.,float(MU_W)));
      if (abs(x-ox)<3 && abs(y-MU_H/2)<4) fired = true;
    }
    // The strike startles the birds around the struck bird in every state.
    if (u_rhythmHit.z > 0. && length(b.p - muPos(muStrikeBird(u_rhythmCount.z))) < 1.7) fired = true;
    // The fill's visible wing-front also launches a real excitable wave.
    // One consumed hit, never repeated for the envelope's lifetime.
    if (u_rhythmHit.w > 0.) {
      int ox = int(mod(u_rhythmCount.w*97.,float(MU_W)));
      if (abs(x-ox)<3 && abs(y-MU_H/2)<6) fired = true;
    }
    // In Surge and Formation a startle fires from a seeded lattice point
    // every few seconds; the lattice carries it round the flock.
    uint back = clock - uint(u_dt * rate * (4294967296. / MU_P) + .5);
    if (w.y + w.z > .3 && muCycle(clock, ${N.pulse}u) < muCycle(back, ${N.pulse}u)) {
      uint n = clock / ${Math.round(2 ** 32 / N.pulse)}u;
      int ox = int(muRnd(key, n, 30u) * float(MU_W)), oy = int(muRnd(key, n, 31u) * float(MU_H));
      if (abs(x - ox) + abs(y - oy) < 3) fired = true;
    }
    float rl = length(rel), roam = 7. - 3.5 * w.x;
    if (rl > roam) a -= rel * (1.2 * (rl - roam) / rl);
    float sp = length(b.v), cruise = 1.1 + .9 * w.x + .4 * level;
    a += b.v * (1.5 * (cruise - sp) / max(sp, 1e-3));
    a.y -= .6 * b.v.y;
    a.y += 6. * max(0., .8 - b.p.y);
    b.v += a * dt;
    float vl = length(b.v);
    if (vl > MU_VR * .9) b.v *= MU_VR * .9 / vl;
    b.p = clamp(b.p + b.v * dt, -MU_PR * .98, MU_PR * .98);
    if (b.T < .002 && fired) b.T = 1.;
    else b.T = max(0., b.T - dt / ${f(TAU_STARTLE)});
    vec3 side = normalize(cross(normalize(b.v + vec3(0., 0., 1e-4)), vec3(0., 1., 0.)));
    float roll = b.T > .55 ? 1.25 * sin(3.141592653589793 * (1. - b.T) / .45) : 0.;
    float target = clamp(dot(a, side) * .12, -1., 1.) + roll;
    b.bank += (clamp(target, -MU_BR, MU_BR) - b.bank) * min(1., 8. * dt);
    // Endless: a bird that ever leaves the sky returns home.
    if (any(isnan(b.p)) || any(isnan(b.v)) || rl > 20.) {
      b.p = A + vec3(muRnd(key, uid, 0u), muRnd(key, uid, 1u), muRnd(key, uid, 2u)) * 2. - 1.;
      b.v = vec3(1., 0., 0.);
    }
  }
  uint s = uint(k) * 2u;
  vec2 lo, hi;
  if (k == 0) { lo = muBytes16(muPack(b.p.x / (2. * MU_PR) + .5, s)); hi = muBytes16(muPack(b.p.y / (2. * MU_PR) + .5, s + 1u)); }
  else if (k == 1) { lo = muBytes16(muPack(b.p.z / (2. * MU_PR) + .5, s)); hi = muBytes16(muPack(b.v.x / (2. * MU_VR) + .5, s + 1u)); }
  else if (k == 2) { lo = muBytes16(muPack(b.v.y / (2. * MU_VR) + .5, s)); hi = muBytes16(muPack(b.v.z / (2. * MU_VR) + .5, s + 1u)); }
  else { lo = muBytes16(b.T >= 1. ? 65535. : muPack(b.T, s)); hi = muBytes16(muPack(b.bank / (2. * MU_BR) + .5, s + 1u)); }
  outColor = vec4(lo, hi);
}
`;

const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in float a_bird;
layout(location=1) in vec3 a_local;
layout(location=2) in float a_flap;
uniform highp sampler2D u_state;
uniform highp uint u_seedBits;
uniform float u_params[8];
uniform vec2 u_resolution;
uniform float u_kick, u_level;
uniform vec4 u_rhythm, u_rhythmCount;
uniform vec3 u_primary, u_secondary, u_accent;
${common}
${view}
out vec3 v_normal, v_view, v_sky;
out float v_glint, v_front, v_trail, v_strike, v_dense, v_far;
out float v_startle, v_density, v_kind, v_tip, v_depth, v_cover;
out vec3 v_bary;
vec2 muScreen(vec3 q, MuCam cam) {
  vec3 r = q - cam.eye;
  return vec2(dot(r, cam.right), dot(r, cam.up)) * cam.focal / max(dot(r, cam.fwd), .3);
}
void main() {
  gl_Position = vec4(2., 2., 2., 1.);
  uint key = muKey(), clock = muClock();
  float dev = clamp(u_params[0], 0., 2.), level = clamp(u_level, 0., 1.);
  int id = int(a_bird);
  MuCam cam = muCamera(clock, dev);
  // Preserve the full cloud in tall output without changing landscape.
  cam.focal *= min(1., max(.72, 1.35*u_resolution.x/u_resolution.y));
  float res = min(u_resolution.x, u_resolution.y);
  vec3 p, v;
  float T = 0., bank = 0., kind = 0., far = 0., density = 0., reveal = 1., cell = -1.;
  vec3 A = muAnchor(clock);
  if (id == -1) {
    // The falcon: only while it hunts the surging cloud.
    float hunt = (.3+.7*muWeights(dev).y) * clamp(u_params[4], 0., 2.);
    if (hunt < .05 && u_rhythm.z < .002) return;
    p = muFalcon(clock);
    v = (muFalcon(clock + 2982617u) - p) / .02;
    kind = 1.;
  } else if (id < -1) {
    // A distant second flock low over the horizon, beside and behind the
    // main one: a scale cue. Procedural sheet, no simulation, no rhythm.
    int k = -2 - id;
    float fu = float(k % 64) / 64., fv = float(k / 64) / 32.;
    float fh = muRnd(key, uint(k), 40u);
    uint c2 = clock + 1717986918u;
    float yw = muYaw(clock);
    float ang = .5 + .22 * sin(MU_TAU * muCycle(clock, ${N.drift}u) + 1.3);
    vec3 C = A + vec3(-sin(yw + ang), 0., -cos(yw + ang)) * 30.;
    C.y = 6.2 + .6 * sin(MU_TAU * muCycle(clock, ${N.anchorY}u) + 2.);
    vec3 off = (vec3(muRnd(key, uint(k), 41u), muRnd(key, uint(k), 42u), muRnd(key, uint(k), 43u)) - .5) * .6;
    // A flattened, drawn-out distant cloud reads as birds, not a bush.
    vec3 flat_ = vec3(.95, .38, .95);
    p = C + flat_ * (muCloud(fu, fv, fh, c2) - vec3(0., 1.2, 0.)) + off;
    v = C + flat_ * (muCloud(fu, fv, fh, c2 + 2982617u) - vec3(0., 1.2, 0.)) + off - p + vec3(1e-3, 0., 0.);
    far = 1.;
  } else {
    // Energy density: birds fade in by size, never popping.
    float keep = mix(.55, 1., level), r = muRnd(key, uint(id), 20u);
    if (r > keep) return;
    reveal = 1. - muSmooth(keep - .05, keep, r);
    Bird b = muBird(id);
    p = b.p; v = b.v; T = b.T; bank = b.bank;
    // A broad interior fill is only a lighting cue, not a simulated force.
    vec3 fromHome = p - A;
    density = .8 / (1. + .08 * dot(fromHome, fromHome)) * reveal;
    // Projected lattice cell from two real neighbours: where the sheet is
    // compressed or edge-on the cell is small and the birds merge into a
    // dark fold; thin, stretched sections stay open and translucent.
    int bx = id % MU_W, by = id / MU_W;
    int n1 = by * MU_W + (bx + 1) % MU_W, n2 = ((by + 1) % MU_H) * MU_W + bx;
    if (n1 == 0) n1 = by * MU_W + (bx + MU_W - 1) % MU_W;
    if (n2 == 0) n2 = ((by + MU_H - 1) % MU_H) * MU_W + bx;
    vec2 s0 = muScreen(p, cam), s1 = muScreen(muPos(n1), cam) - s0, s2 = muScreen(muPos(n2), cam) - s0;
    cell = abs(s1.x * s2.y - s1.y * s2.x) * res * res * .25;
  }
  vec3 centre = A + vec3(0., 1.2, 0.);
  vec4 amp = muHitAmp();
  float longitude = float(max(id,0)%MU_W)/float(MU_W);
  float glintAt = fract(u_rhythmCount.x*.618034);
  float glintDistance = abs(sin(3.141592653589793*(longitude-glintAt)));
  v_glint = u_rhythm.x*(1.-muSmooth(.12,.38,glintDistance))*(1.-kind)*(1.-far);
  // Wing front: a curved band about an eighth of the flock wide sweeps once
  // across it in image space over the gesture's duration (inverted
  // envelope). The birds it passes bank edge-on and catch silver light, the
  // sheet dents as they lift and drop, and a dark broad-winged wave follows.
  float front = 0., trail = 0.;
  if (u_rhythm.w > .002 && kind < .5 && far < .5) {
    float ph = muPhase(u_rhythm.w, amp.w);
    float cnt = u_rhythmCount.w, tilt = (fract(cnt * .618034) - .5) * .9;
    float dir = mod(cnt, 2.) < 1. ? 1. : -1.;
    vec3 ax = cam.right * cos(tilt) + cam.up * sin(tilt), ay = cam.up * cos(tilt) - cam.right * sin(tilt);
    vec3 rel = p - centre;
    float sx = dir * dot(rel, ax) / 5., sy = dot(rel, ay) / 5.;
    float sw = sx + .35 * sy * sy;
    float f = mix(-1.4, 1.3, ph);
    float gate = muSmooth(.002, .06, u_rhythm.w);
    // A crest with a sharp leading edge and a longer lit tail, then a
    // dark trough of broad, open wings behind it.
    float x = sw - f, xc = x / (x > 0. ? .075 : .2), xt = (x + .4) / .17;
    front = exp(-xc * xc) * gate;
    trail = exp(-xt * xt) * gate;
    p += ay * (.75 * front - .45 * trail);
    bank += front * 1.5;
  }
  v_front = front; v_trail = trail;
  // Falcon strike: a void punched along the view line through a struck
  // bird. Birds inside are thrown out radially (seeded spray), leaving a
  // hole with a dense, startled rim; the falcon dives through its centre.
  float strike = 0.;
  if (u_rhythm.z > .002 && far < .5) {
    float ph = muPhase(u_rhythm.z, amp.z);
    vec3 S = muPos(muStrikeBird(u_rhythmCount.z));
    vec3 axis = normalize(S - cam.eye);
    float open = muSmooth(0., .1, ph) * (1. - muSmooth(.4, 1., ph)) * muSmooth(.002, .05, u_rhythm.z);
    if (kind > .5) {
      p = mix(p, S + axis * mix(-3., 4., ph), muSmooth(0., .06, ph) * (1. - muSmooth(.8, 1., ph)));
      v = axis;
    } else {
      vec3 d = p - S, radial = d - axis * dot(d, axis);
      float rr = length(radial), R = 1.45;
      vec3 out_ = rr > 1e-3 ? radial / rr : cam.right;
      float spray = 1. + 1.6 * muRnd(key, uint(max(id, 0)), 44u) * muRnd(key, uint(max(id, 0)), 45u);
      float push = open * R * exp(-rr * rr / (R * R)) * spray;
      p += (out_ + cam.fwd * .15 * (spray - 1.)) * push;
      strike = open * exp(-(rr - R) * (rr - R) / .35);
      bank += 1.3 * open * exp(-rr * rr / (4. * R * R));
    }
  }
  v_strike = strike;
  // The background varies only on cloud scales, not feather scales. Evaluate
  // its exact density at the bird centre once per vertex, never per fragment.
  v_sky=muSky(normalize(p-cam.eye));
  vec3 fw = normalize(v + vec3(1e-4, 0., 0.));
  vec3 rt = normalize(cross(fw, vec3(0., 1., 0.)));
  vec3 up = cross(rt, fw);
  vec3 side = rt * cos(bank) + up * sin(bank);
  vec3 nrm = cross(side, fw);
  float flapN = float(${N.flap}u + uint(id < 0 ? 0 : id % 640));
  float flap = sin(MU_TAU * float(clock * uint(flapN)) / 4294967296. + MU_TAU * muRnd(key, uint(max(id, 0)), 21u));
  vec3 local = a_local;
  local.y += a_flap * flap * (kind > .5 ? .25 : .5);
  float z = dot(p - cam.eye, cam.fwd);
  if (z < .3) return;
  float span = kind > .5 ? .26 : .085;
  // At least about 4 px wide at 1080p; birds by the lens shrink away.
  float px = span * cam.focal / z * res * .5;
  float grow = max(1., (far > .5 ? 2.6 : 4.) * res / 1080. / px);
  // Coverage of its own lattice cell: dense folds go solid, open sheet
  // sections thin out; near birds are physically larger and darker.
  float dense = cell < 0. ? 1. : muSmooth(.03, .5, .5 * px * grow * px * grow / max(cell, 1e-3));
  float scale = grow * muSmooth(.3, 1.1, z) * sqrt(reveal) * mix(.8, 1.7, dense) * (1. + .35 * trail);
  scale *= .8 + .4 * muRnd(key, uint(max(id, 0)), 46u);
  // Small birds: body width and wing chord (0.2 and 0.28 template units)
  // would be sub-pixel slivers that flicker in and out of pixels, so they
  // thicken to about 2 px and their light spreads over the larger footprint
  // (v_cover, a cheap coverage antialiasing).
  float fat = clamp(7.5 * res / 1080. / (px * grow), 1., 2.5);
  if (gl_VertexID % 12 < 6) local.z *= fat;
  else local.x = -.05 + (local.x + .05) * fat;
  v_cover = 1. / (grow * fat);
  // Barycentrics for edge antialiasing. Inner edges (the body's centre line,
  // the wing roots inside the body) are held at 1 so they never darken.
  int corner = gl_VertexID % 3, tri = (gl_VertexID % 12) / 3;
  v_bary = vec3(corner == 0, corner == 1, corner == 2);
  if (tri < 2) v_bary.x = 1.;
  else if (tri == 2) v_bary.z = 1.;
  else v_bary.y = 1.;
  // Below a resolved wing chord, rotate the same template into the image
  // plane. Edge-on triangles can otherwise disappear despite thickness AA.
  // Orientation still follows projected flight; no identity or state reset.
  float lod = (1. - muSmooth(3., 7., px * 1080. / res)) * (1. - kind);
  vec2 heading = vec2(dot(fw, cam.right), dot(fw, cam.up));
  heading = dot(heading, heading) > 1e-6 ? normalize(heading) : vec2(1., 0.);
  vec2 across = vec2(-heading.y, heading.x);
  // Even the distant LOD retains the banking compression. A startle wave
  // sweeps a dark/light density edge rather than lighting a band of dots.
  float wingArea=.15+.85*abs(cos(bank));
  vec2 plane = heading * (local.x + local.z*.18*sin(bank))
    + across * local.z * wingArea * (1. + .12 * flap);
  vec3 offset = mix(fw * local.x + nrm * local.y + side * local.z,
    cam.right * plane.x + cam.up * plane.y, lod);
  vec3 world = p + offset * span * scale;
  vec3 rel = world - cam.eye;
  float vz = dot(rel, cam.fwd);
  vec2 xy = vec2(dot(rel, cam.right), dot(rel, cam.up)) * cam.focal * res / u_resolution;
  gl_Position = vec4(xy, (vz - .2) / 80. * 2. * vz - vz, vz);
  v_normal = nrm;
  v_view = cam.eye - world;
  v_startle = T;
  v_density = density;
  v_kind = kind;
  v_tip = a_flap;
  v_depth = vz;
  v_dense = dense;
  v_far = far;
}
`;

const surface = `#version 300 es
precision highp float;
precision highp int;
in vec3 v_normal, v_view, v_sky;
in float v_glint, v_front, v_trail, v_strike, v_dense, v_far;
in float v_startle, v_density, v_kind, v_tip, v_depth, v_cover;
in vec3 v_bary;
uniform highp sampler2D u_state;
uniform highp uint u_seedBits;
uniform float u_params[8];
uniform float u_kick, u_level;
uniform vec4 u_rhythm;
uniform vec3 u_primary, u_secondary, u_accent;
out vec4 outColor;
${common}
${view}
void main() {
  vec3 V = normalize(v_view), N = normalize(v_normal);
  // Backlit starlings are nearly black. A turning wave changes the banking
  // silhouette, with only a restrained feather rim, never a bright dot.
  float turn=muSmooth(.55,1.,v_startle);
  vec3 warm=mix(u_primary,vec3(1.),.32);
  vec3 sky=v_sky;
  float rim=pow(1.-abs(dot(N,V)),3.);
  vec3 col=u_secondary*(.004+.008*rim)+warm*.18*turn*rim;
  // Broad feather gradients inside a local cohort, not neon outlines.
  float feather=.25+.75*abs(v_tip);
  col += mix(u_primary,vec3(1.),.25)*v_glint*feather*1.;
  // Silver wing-front: a restrained primary-tinted feather sheen, local.
  col += mix(u_primary,vec3(1.),.75)*v_front*(.45+.55*feather)*1.6;
  col *= 1. - .8 * v_trail;
  // The struck rim catches a trace of the falcon's accent.
  col += u_accent*.25*v_strike*feather;
  if(v_kind>.5) col+=u_accent*(.12+.65*u_rhythm.z);
  // Aerial perspective inside the flock: near birds black, the far side
  // hazes toward the dusk; the distant second flock is mostly air.
  float haze = v_far > .5 ? .12 : 1. - exp(-max(v_depth - 5., 0.) * .03);
  col=mix(col,sky,haze*(1.-.7*v_front));
  // Coverage: a bird drawn larger than it is shows its light spread thinly,
  // and outer edges fade into the sky over about a pixel. Open, stretched
  // sheet sections stay translucent; folds and trailing waves are solid.
  float e = min(v_bary.x, min(v_bary.y, v_bary.z));
  float edge = clamp(e / max(fwidth(e), 1e-6) + .5, 0., 1.);
  float opacity = mix(.85, 1., max(v_dense, max(v_trail, v_front)));
  // In a compressed fold the next bird, not empty sky, sits behind
  // an antialiased feather edge. This prevents pinholes in the dark core.
  vec3 behind = mix(sky, u_secondary * .012, v_dense * .7 * (1. - v_far));
  col = mix(behind, col, (.94 + .06 * v_cover) * edge * opacity);
  outColor = vec4(col, 1.);
}
`;

const fragment = `
${common}
${view}
void main() {
  uint clock = muClock();
  MuCam cam = muCamera(clock, clamp(u_params[0], 0., 2.));
  cam.focal *= min(1., max(.72, 1.35*u_resolution.x/u_resolution.y));
  vec2 res = u_resolution / min(u_resolution.x, u_resolution.y);
  vec2 p = (v_uv * 2. - 1.) * res;
  vec3 dir = normalize(cam.fwd * cam.focal + cam.right * p.x + cam.up * p.y);
  vec3 col=muSky(dir);
  // The lake repeats the dusk below a layered, wooded shoreline. Geographic
  // azimuth and camera-relative reeds supply scale without extra geometry.
  float e=dir.y;
  float horizonAA=max(fwidth(e)*1.3,.0003);
  if(e<.07) {
    vec2 h=normalize(dir.xz+vec2(1e-5));
    float az=atan(h.y,h.x);
    // Woods as irregular masses with gaps and ragged crowns: noise on the
    // unit circle is periodic in azimuth, so nothing repeats or seams.
    float ridge=.002+.004*muNoise(h*3.+2.);
    float mass=.6*muNoise(h*5.+3.)+.4*muNoise(h*12.+7.);
    float wood=muSmooth(.38,.62,mass);
    float tall=.006+.022*muNoise(h*21.+1.)*muNoise(h*9.+4.);
    float crowns=(muNoise(h*75.)-.5)*.012+(muNoise(h*190.+5.)-.5)*.006;
    float spire=max(muNoise(h*60.+9.)-.62,0.)/.38;
    float lone=spire*spire*.02*(1.-wood);
    float trees=ridge+wood*(tall+crowns)+lone+.0006;
    float aa=horizonAA;
    float land=1.-smoothstep(trees-aa,trees+aa,e);
    vec3 reflected=muSky(normalize(vec3(dir.x,abs(e)*.7,dir.z)));
    float ripple=.96+.04*sin(e*650.+sin(az*91.+e*220.)*3.);
    vec3 lake=reflected*.18*ripple*exp(min(0.,e)*2.)+u_secondary*.006;
    float shore=-.022+.007*sin(az*4.);
    col=mix(col,u_secondary*.003,land);
    col=mix(col,lake,1.-smoothstep(shore-aa,shore+aa,e));
  }
  if(p.y<-.6) {
    // Foreground reeds in clumps: three layers with seeded presence, height,
    // lean, thickness and taper, a few seed heads. Not an even picket.
    float mask=0.;
    for(int i=0;i<3;i++) {
      float fi=float(i), fq=7.+6.*fi;
      float x=p.x*fq+cam.eye.x*.32*(1.+.4*fi)+17.3*fi;
      float id=floor(x), lx=fract(x)-.5;
      vec4 r=fract(sin(vec4(id*73.13+fi*7.,id*41.7+fi*3.,id*19.3+fi*11.,id*91.9+fi*5.))*43758.5453);
      float clump=muNoise(vec2(id*.23+fi*9.,fi*3.));
      if(r.x>.15+.75*clump) continue;
      float tip=-1.02+(.1+.3*r.y*r.y)*(1.-.22*fi)*(.6+.6*clump);
      float t=clamp((p.y+1.)/max(tip+1.,.01),0.,1.);
      float off=(r.z-.5)*1.1*t*t;
      float wdt=(.03+.09*r.w*r.w)*(1.-.85*t)*(1.+.3*fi);
      float aa=fq*2.2/min(u_resolution.x,u_resolution.y);
      float stem=abs(lx-off)-wdt;
      float reed=(1.-smoothstep(-aa*.5,aa*.5,stem))*(1.-smoothstep(tip-aa*.3/fq,tip,p.y));
      if(r.w>.72) {
        vec2 hd=vec2((lx-off)/(wdt+.09),(p.y-tip+.04)/.04);
        reed=max(reed,1.-smoothstep(.8,1.,length(hd)));
      }
      mask=max(mask,reed);
    }
    col=mix(col,u_secondary*.002,mask);
  }
  emit(vec4(col, 1.));
}
`;

const schema = [
  {
    key: "development",
    label: "Development · loose / surge / formation",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "speed",
    label: "Motion speed",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "formation",
    label: "Formation · vortex / ribbon / twister",
    min: 0,
    max: 3,
    step: 0.01,
    default: 0,
  },
  {
    key: "cycle",
    label: "Formation cycle",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  { key: "falcon", label: "Falcon", min: 0, max: 1.6, step: 0.01, default: 1 },
  { key: "fold", label: "Folding", min: 0, max: 2, step: 0.01, default: 1 },
  {
    key: "distance",
    label: "Camera distance",
    min: 0.7,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
  {
    key: "height",
    label: "Camera height",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.12,
  },
];

const look = (name, seed, development, overrides = {}) => ({
  name,
  seed,
  params: {
    development,
    speed: 1,
    formation: 0,
    cycle: 0.5,
    falcon: 1,
    fold: 1,
    distance: 1,
    height: 0.12,
    ...overrides,
  },
});

export default {
  id: "murmuration",
  number: 88,
  name: "Starling Flock",
  description:
    "Thousands of birds on a fixed topological lattice: loose wanderers align into a surging cloud folded by a drifting displacement field and crossed by startle waves when a falcon strikes, then fly vortex, ribbon and twister formations.",
  development: "development",
  schema,
  presets: [
    look("Evening Roost", 1207, 0),
    look("Surging Cloud", 1207, 1),
    look("Vortex Mill", 1207, 2),
    look("Falcon Hour", 3301, 1, { falcon: 1.5, height: 0.25, distance: 1.12 }),
    look("Knotted Ribbon", 2207, 2, { formation: 1, cycle: 0.15, height: 0.6 }),
    look("Twister", 4409, 2, { formation: 2, cycle: 0.1, height: 0.2 }),
    look("High Cloud", 5113, 1, { height: 0.85, distance: 1.1, speed: 0.8 }),
  ],
  stage: ["speed", "falcon", "formation"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    speed: { mul: [0.65, 1.45] },
    falcon: { mul: [0.6, 1.4] },
    fold: { mul: [0.75, 1.25] },
  },
  beat: { punch: 0.05, pulse: 0.08 },
  audio: [
    { param: "falcon", feature: "onset", amount: 0.06 },
    { param: "fold", feature: "low", amount: 0.05 },
  ],
  rhythmStyles: {
    restrained: "Dusk wings",
    driving: "Turning flock",
    accented: "Falcon shadow",
  },
  rhythm: [
    familyEffect(
      "sun-glint",
      0,
      "Sun glint",
      "The flock's wings catch the low sun together.",
      {
        period: 4,
        strength: 0.55,
        duration: 1,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X......x | ...x....",
            division: 2,
            strength: 0.48,
            duration: 0.9,
          },
          // Three-beat loops: the glint walks across the 4/4 bar.
          driving: {
            steps: "X.x..x",
            division: 2,
            strength: 0.86,
            duration: 0.4,
          },
          accented: {
            steps: "X....x..x...",
            division: 4,
            strength: 0.88,
            duration: 0.3,
          },
        },
      },
    ),
    familyEffect(
      "startle-wave",
      1,
      "Startle wave",
      "A startle runs across the flock from neighbour to neighbour.",
      {
        period: 8,
        strength: 0.7,
        duration: 1,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "..x..... | ......X.",
            division: 2,
            strength: 0.55,
            duration: 1.2,
          },
          driving: {
            steps: "...x.... | ......X. | ........ | .....x..",
            division: 2,
            strength: 0.8,
            duration: 1,
          },
          accented: {
            steps:
              ".......x........ | ...........X.... | ....x........... | .........X.....x",
            division: 4,
            strength: 0.94,
            duration: 0.8,
          },
        },
      },
    ),
    familyEffect(
      "falcon-strike",
      2,
      "Falcon strike",
      "The falcon strikes; the birds around it scatter and startle.",
      {
        period: 16,
        strength: 0.7,
        duration: 2,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | ........ | .......X",
            division: 2,
            strength: 0.55,
            duration: 1.5,
          },
          driving: {
            steps: "........ | .......x | ........ | ......X.",
            division: 2,
            strength: 0.82,
            duration: 1,
          },
          accented: {
            steps:
              "................ | ..............x. | ................ | ...........X...x",
            division: 4,
            strength: 0.96,
            duration: 0.6,
          },
        },
      },
    ),
    familyEffect(
      "wing-front",
      3,
      "Wing front",
      "A startled silver wing-front peels through the flock on fills, launching a neighbour wave.",
      {
        period: 8,
        strength: 0.85,
        duration: 0.65,
        styles: {
          restrained: {
            steps: "........ | ......x. | ........ | .......X",
            division: 2,
            strength: 0.58,
            duration: 0.8,
          },
          driving: {
            steps: "....X..x | ..X...x. | ....X..x | ...X...X",
            division: 2,
            strength: 0.88,
            duration: 1.1,
          },
          accented: {
            steps: "...X....x...X... | ......X..x...X..",
            division: 4,
            strength: 1,
            duration: 0.65,
          },
        },
      },
    ),
  ],
  fragment,
  precompute: {
    size: [512, 129],
    filter: "linear",
    nearestFallback: true,
    fragment: `${common}\n${view}\nvoid main() {
    if(gl_FragCoord.y<1.) {
      MuCam cam=muCamera(muClock(),clamp(u_params[0],0.,2.));
      int x=int(gl_FragCoord.x);
      outColor=x==0?vec4(cam.eye,0.):x==1?vec4(cam.right,0.):x==2?vec4(cam.up,0.):x==3?vec4(cam.fwd,0.):x==5?vec4(muSun(),0.):vec4(cam.focal,cam.dive,0.,0.);
      return;
    }
    float az=gl_FragCoord.x/512.*4., e=(gl_FragCoord.y-1.)/128.;
    vec2 h=az<1.?vec2(1.-az,az):az<2.?vec2(1.-az,2.-az):az<3.?vec2(az-3.,2.-az):vec2(az-3.,az-4.);
    h=normalize(h);
    outColor=vec4(muCloudExact(vec3(h.x,e,h.y)),muRidges(h));
  }`,
  },
  simulation: { fragment: simulation, size: [4 * W, H], steps: 1 },
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    vertex,
    fragment: surface,
  },
};
