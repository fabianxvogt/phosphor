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
    3.3 + .9 * sin(MU_TAU * muCycle(c, ${N.anchorY}u)),
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
// creates dense ribbons with sparse skirts; integer clock modes are endless.
vec3 muCloud(float u, float v, float h, uint c) {
  float t = MU_TAU * (u + muCycle(c, ${N.swirl}u));
  float flow = MU_TAU * muCycle(c, ${N.flow}u);
  float br = MU_TAU * muCycle(c, ${N.breath}u);
  float fold = clamp(u_params[5], 0., 2.);
  float s = 2.*v-1., width = .65*s*s*s;
  float wave = 2.*t + flow;
  vec3 q = vec3(4.6*cos(t), 1.25*sin(wave)+.4*fold*sin(3.*t-flow), 1.6*sin(t));
  q += vec3(.35*width*sin(t), width*(.6+.3*sin(br+t)), (h-.5)*.32 + width*cos(wave));
  return q + vec3(0., .8, 0.);
}
vec3 muKnot(float t) { return 1.25 * vec3(sin(t) + 2. * sin(2. * t), -sin(3. * t), cos(t) - 2. * cos(2. * t)); }
vec3 muSlot(float u, float v, float h, uint c, float formation) {
  float circ = MU_TAU * muCycle(c, ${N.circ}u), roll = MU_TAU * muCycle(c, ${N.roll}u);
  float th = MU_TAU * u + circ;
  // A travelling compression changes density sharply along the ribbon.
  th += .55*sin(th-roll)+.19*sin(3.*th+roll);
  float sheet = 2.*v-1., width = .95*sheet*sheet*sheet;
  float curl = 2.*th+roll;
  vec3 torus = vec3(3.8*cos(th), 2.05*sin(curl)+.35*sin(3.*th-roll), 1.4*sin(th));
  torus += vec3(.2*width*cos(th), width*cos(th+roll), width*sin(th+roll)+(h-.5)*.22);
  float s = MU_TAU * (u + muCycle(c, ${N.circ / 2}u));
  vec3 k0 = muKnot(s), tan = normalize(muKnot(s + .01) - k0);
  vec3 nrm = normalize(cross(tan, vec3(0., 1., 0.))), bin = cross(tan, nrm);
  float tw = 2. * s + roll, w = (v - .5) * 1.3, d = (h - .5) * .25;
  vec3 ribbon = k0 + (nrm * cos(tw) + bin * sin(tw)) * w + (bin * cos(tw) - nrm * sin(tw)) * d;
  float strand = v < .5 ? 0. : 3.141592653589793;
  float y = (u - .5) * 6.4, fr = .7 + .32 * (y + 3.2) + .45 * sqrt(h);
  float ta = MU_TAU * 2.2 * u + circ + strand + MU_TAU * mod(v, .5) * .35;
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
  float dist = u_params[6] * (mix(11.5, 9.2, w.x) - 1.2 * w.z);
  // A bounded dolly breath keeps the whole formation readable rather than
  // putting the camera inside a cropped wall of subpixel wings.
  float r = mix(dist, .82 * dist, m.dive);
  // Eye height is absolute so the horizon stays put; the flock flies above.
  float h = mix(mix(.45, 4.5, clamp(u_params[7], 0., 1.)) + .3 * sin(MU_TAU * muCycle(c, ${N.anchorY * 3}u)), a.y, m.dive);
  m.eye = vec3(a.x + r * sin(yaw), h, a.z + r * cos(yaw));
  m.fwd = normalize(a + vec3(0., .5 + .7 * w.z, 0.) - m.eye);
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
vec2 muCloudExact(vec3 dir) {
  float e=dir.y;
  vec2 h=normalize(dir.xz+vec2(1e-5));
  vec2 q=h*4.+vec2(e*2., e*9.);
  float n=muNoise(q)+.4*muNoise(q*3.1+19.);
  float detail=muNoise(q*9.3+7.)-.5;
  n+=.12*detail;
  float bands=sin(e*26.+n*2.+dot(h,vec2(1.,2.)));
  float cloud=muSmooth(-.65,.9,bands+n*.45)*muSmooth(.03,.13,e)*(1.-muSmooth(.5,.85,e));
  return vec2(clamp(cloud*.68+detail*.09,0.,.82),exp(-abs(bands+.25)*8.)*cloud*.045);
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
// Palette dusk lights the whole sky behind the birds, not a thin neon line.
vec3 muSky(vec3 dir) {
  vec3 L = muSun();
  float e = dir.y;
  vec2 h = normalize(dir.xz + vec2(1e-5)), s = normalize(L.xz);
  float az = .5 + .5 * dot(h, s);
  float band = exp(-max(e,0.)*2.8);
  vec3 warm = mix(u_primary,vec3(1.),.32);
  vec3 col = mix(u_secondary*.14, mix(u_secondary,warm,.72)*.75, band);
  col += warm * pow(az,4.) * exp(-max(e,0.)*5.)*.38;
  vec4 clouds=muCloudData(dir);
  col=mix(col,col*.38+u_secondary*.025,clouds.x);
  col+=warm*clouds.y;
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
    b.p = A + muCloud(float(id%MU_W)/float(MU_W),float(id/MU_W)/float(MU_H),muRnd(key,uid,6u),clock);
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
    vec3 jit = (vec3(muRnd(key, uid, 8u), muRnd(key, uid, 9u), muRnd(key, uid, 10u)) - .5) * .16;
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
      vec3 at = A + 2.5 * vec3(cos(u_rhythmCount.y * 2.4), .3 * sin(u_rhythmCount.y * 1.7), sin(u_rhythmCount.y * 2.4));
      if (length(b.p - at) < 1.) fired = true;
    }
    if (u_rhythmHit.z > 0. && length(b.p - muFalcon(clock)) < 2.) fired = true;
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
uniform vec3 u_primary, u_secondary, u_accent;
${common}
${view}
out vec3 v_normal, v_view, v_sky;
out float v_startle, v_density, v_kind, v_tip, v_depth, v_cover;
out vec3 v_bary;
void main() {
  gl_Position = vec4(2., 2., 2., 1.);
  uint key = muKey(), clock = muClock();
  float dev = clamp(u_params[0], 0., 2.), level = clamp(u_level, 0., 1.);
  int id = int(a_bird);
  vec3 p, v;
  float T = 0., bank = 0., kind = 0., density = 0., reveal = 1.;
  if (id < 0) {
    // The falcon: only while it hunts the surging cloud.
    float hunt = muWeights(dev).y * clamp(u_params[4], 0., 2.);
    if (hunt < .05) return;
    p = muFalcon(clock);
    v = (muFalcon(clock + 2982617u) - p) / .02;
    kind = 1.;
  } else {
    // Energy density: birds fade in by size, never popping.
    float keep = mix(.55, 1., level), r = muRnd(key, uint(id), 20u);
    if (r > keep) return;
    reveal = 1. - muSmooth(keep - .05, keep, r);
    Bird b = muBird(id);
    p = b.p; v = b.v; T = b.T; bank = b.bank;
    // A broad interior fill is only a lighting cue, not a simulated force.
    // Avoid fetching four neighbours for each of twelve mesh vertices.
    // The actual flock dynamics still use all eight topological neighbours.
    vec3 fromHome = p - muAnchor(clock);
    density = .8 / (1. + .08 * dot(fromHome, fromHome)) * reveal;
  }
  MuCam cam = muCamera(clock, dev);
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
  float res = min(u_resolution.x, u_resolution.y);
  float span = kind > .5 ? .2 : .06;
  // At least about 3 px wide at 1080p; birds by the lens shrink away.
  float px = span * cam.focal / z * res * .5;
  float grow = max(1., 3. * res / 1080. / px);
  float scale = grow * muSmooth(.3, 1.1, z) * sqrt(reveal);
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
  float wingArea=.32+.68*abs(cos(bank));
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
}
`;

const surface = `#version 300 es
precision highp float;
precision highp int;
in vec3 v_normal, v_view, v_sky;
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
  vec3 col=u_secondary*(.004+.008*rim)+warm*.018*turn*rim;
  if(v_kind>.5) col+=u_accent*.045;
  col=mix(col,sky,1.-exp(-v_depth*.003));
  // Coverage: a bird drawn larger than it is shows its light spread thinly,
  // and outer edges fade into the sky over about a pixel.
  float e = min(v_bary.x, min(v_bary.y, v_bary.z));
  float edge = clamp(e / max(fwidth(e), 1e-6) + .5, 0., 1.);
  // (Dense clouds have birds, not sky, behind those edges: fade only half.)
  col = mix(sky, col, (.82 + .18 * v_cover) * edge);
  outColor = vec4(col, 1.);
}
`;

const fragment = `
${common}
${view}
void main() {
  uint clock = muClock();
  MuCam cam = muCamera(clock, clamp(u_params[0], 0., 2.));
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
    float ridge=.003+.007*sin(az*3.)+.003*cos(az*7.);
    float treeX=az*23., cell=floor(treeX), local=fract(treeX)-.5;
    float rnd=fract(sin(cell*127.1)*43758.5453);
    float crown=sqrt(max(0.,1.-4.*local*local));
    float twig=.0015*sin(treeX*51.)+.001*sin(treeX*113.);
    float trees=ridge+.003+(.005+.014*rnd)*crown+twig*crown;
    float aa=horizonAA;
    float land=1.-smoothstep(trees-aa,trees+aa,e);
    vec3 reflected=muSky(normalize(vec3(dir.x,abs(e)*.7,dir.z)));
    float ripple=.96+.04*sin(e*650.+sin(az*91.+e*220.)*3.);
    vec3 lake=reflected*.18*ripple*exp(min(0.,e)*2.)+u_secondary*.006;
    float shore=-.022+.007*sin(az*4.);
    col=mix(col,u_secondary*.003,land);
    col=mix(col,lake,1.-smoothstep(shore-aa,shore+aa,e));
  }
  if(p.y<-.65) {
    float x=p.x*22.+cam.eye.x*.32;
    float id=floor(x), local=fract(x)-.5;
    float rnd=fract(sin(id*73.13)*43758.5453);
    float tip=-1.04+.41*rnd*rnd;
    float bend=(p.y+1.)*(p.y+1.)*2.*sin(id);
    float stem=abs(local-bend);
    float aa=22./min(u_resolution.x,u_resolution.y);
    float reed=(1.-smoothstep(.018,.018+aa,stem))*(1.-smoothstep(tip-.02,tip,p.y));
    float head=exp(-pow((p.y-tip+.025)/.035,2.)-pow(stem/.055,2.));
    float leaf=exp(-pow((p.y-tip+.16)/.11,2.)-pow((local-bend+(p.y-tip+.13)*2.)/.035,2.));
    col=mix(col,u_secondary*.002,clamp(reed+head+leaf,0.,1.));
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
  rhythm: [
    familyEffect(
      "sun-glint",
      0,
      "Sun glint",
      "The flock's wings catch the low sun together.",
      { period: 4, strength: 0.55, duration: 1 },
    ),
    familyEffect(
      "startle-wave",
      1,
      "Startle wave",
      "A startle runs across the flock from neighbour to neighbour.",
      { period: 8, strength: 0.7, duration: 1 },
    ),
    familyEffect(
      "falcon-strike",
      2,
      "Falcon strike",
      "The falcon strikes; the birds around it scatter and startle.",
      { period: 16, strength: 0.7, duration: 2 },
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
