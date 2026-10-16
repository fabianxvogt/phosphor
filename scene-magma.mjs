import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// Magma Rift (#104): a volcanic field raymarched as one continuous world.
// The ground is a crust of basalt plates: a jittered Voronoi tessellation
// whose exact seams (distance to the nearest bisector, found in one cached
// 3×3 search) become cracks, then lava rivers, then the shore of a lava
// lake into which the central plates sink one by one. A seed-only drainage
// tree (three meandering trunks from the vent, two branches each) selects
// which seams glow in the crust, widen into braided rivers and lead to the
// vent; a heat front runs out along it with development. The lake opens
// with a fountain of incandescent spray (paraboloid streak cones) and bombs
// on exact ballistic parabolas under an ash umbrella lit from below. Plate
// identity and the tree are functions of the seed only; development never
// moves a site. Light is temperature: the emission ramp runs dark →
// secondary → primary → accent → near white, so every library palette is a
// different "lava".
export const PLATE_JITTER = 0.8; // sites in [0.1, 0.9] of their cell: 3×3 search is exact
export const GRAVITY = 7.0; // world units / s²
export const CYCLE_SECONDS = 4.6; // physical seconds of one ejecta cycle
export const BIG_CAP = 14;
export const SPRAY_CAP = 12;
export const FLARE_SECONDS = 0.55; // a big bomb's landing flare

const schema = [
  {
    key: "development",
    label: "Development · crust / rivers / eruption",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  { key: "flow", label: "Lava flow", min: 0, max: 2, step: 0.01, default: 1 },
  { key: "plates", label: "Plate size", min: 0.6, max: 1.6, step: 0.01, default: 1 },
  { key: "heat", label: "Heat", min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: "embers", label: "Embers", min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: "orbit", label: "Camera orbit", min: -1, max: 1, step: 0.01, default: 0.35 },
  { key: "height", label: "Camera height", min: 0, max: 1, step: 0.01, default: 0.4 },
  { key: "fountain", label: "Fountain force", min: 0, max: 1.5, step: 0.01, default: 1 },
];

const base = {
  flow: 1,
  plates: 1,
  heat: 0.5,
  embers: 0.5,
  orbit: 0.35,
  height: 0.4,
  fountain: 1,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});

const presets = [
  // World states: one seed, identical parameters, development at integers.
  look("Breathing Crust", 10401, 0),
  look("Seam Rivers", 10401, 1),
  look("Lava Fountain", 10401, 2),
  look("Black Glass", 10402, 0.35, {
    plates: 1.5,
    height: 0.12,
    orbit: 0.2,
    flow: 0.6,
    embers: 0.25,
  }),
  look("Ember Delta", 10403, 1.3, {
    plates: 0.75,
    height: 0.85,
    embers: 0.95,
    flow: 1.4,
    orbit: -0.45,
  }),
  look("Night Fountain", 10404, 2, {
    height: 0.2,
    fountain: 1.4,
    heat: 0.7,
    orbit: 0.55,
    embers: 0.7,
  }),
  look("Ash Column", 10405, 1.75, {
    height: 0.65,
    fountain: 0.8,
    plates: 1.25,
    heat: 0.35,
    orbit: -0.25,
  }),
  look("Rift Lattice", 10406, 0.9, {
    plates: 0.65,
    height: 1,
    flow: 1.6,
    heat: 0.6,
    embers: 0.4,
  }),
];

// Clock rates mirror the authored GLSL products exactly.
const orbitRate = (p) => p[5] * 0.07; // rad/s, period 2π
const flowRate = (p) => p[1] * 0.18; // flow-layer cycles/s, period 16
const eruptRate = (p, level) =>
  (0.8 + 0.45 * Math.min(1, Math.max(0, level))) / CYCLE_SECONDS; // cycles/s, period 64

const common = `${lateClockGlsl}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
const int MARCH_CAP = 110;
const int DETAIL_CAP = 5;
const int BIG_CAP = ${BIG_CAP};
const int SPRAY_CAP = ${SPRAY_CAP};
const int BOMB_CAP = BIG_CAP + SPRAY_CAP;
const int EMBER_CAP = 4;
const int PLUME_STEPS = 14;
const int SHELLS = 4;
const float JIT = ${PLATE_JITTER.toFixed(2)};
const float G_ACC = ${GRAVITY.toFixed(1)};
const float CYCLE = ${CYCLE_SECONDS.toFixed(1)};
const float FLARE = ${FLARE_SECONDS.toFixed(2)};
const float FLARE_R = 2.1; // flare sprite support incl. its splash ring

// Per-frame constants, assigned once in main().
float gDev, gSplit, gLakeAmt, gErupt, gLevel, gHeat, gS, gFlow, gErPh, gOrbit;
float gSeamW, gLavaT, gLakeR, gFountH, gForce, gPix, gEmbers, gKick;
vec2 gSeedOff, gRot;
vec3 gVent;

// Float lattice hashes (inputs stay within a few thousand).
float mrH2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 mrH3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
vec2 mrH22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float mrNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mrH2(i), mrH2(i + vec2(1.0, 0.0)), f.x),
             mix(mrH2(i + vec2(0.0, 1.0)), mrH2(i + vec2(1.0)), f.x), f.y);
}

// Bilinear value noise: its level lines are nearly straight inside each
// lattice cell, so ridges read as angular cracks rather than smooth loops.
float mrNoiseLin(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  return mix(mix(mrH2(i), mrH2(i + vec2(1.0, 0.0)), f.x),
             mix(mrH2(i + vec2(0.0, 1.0)), mrH2(i + vec2(1.0)), f.x), f.y);
}

// Value noise with a lattice periodic in y (period in lattice cells).
float mrNoiseP(vec2 p, float period) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float y0 = mod(i.y, period), y1 = mod(i.y + 1.0, period);
  return mix(mix(mrH2(vec2(i.x, y0)), mrH2(vec2(i.x + 1.0, y0)), f.x),
             mix(mrH2(vec2(i.x, y1)), mrH2(vec2(i.x + 1.0, y1)), f.x), f.y);
}

// Emission of matter at temperature T (≈0 cold … 1 white hot): the colour
// runs dark field → primary → accent → near white and the radiance grows
// steeply, so cooling crust is dim and only the hottest matter reaches the
// accent and bloom.
vec3 mrHeat(float T) {
  T = max(T, 0.0);
  vec3 c = mix(u_secondary * 0.8, u_primary, smoothstep(0.34, 0.86, T));
  c = mix(c, u_accent, smoothstep(1.0, 1.25, T));
  // Only the very hottest matter whitens, and never fully: pale palettes
  // keep their hue.
  c = mix(c, vec3(1.0), 0.6 * smoothstep(1.3, 1.6, T));
  return c * (2.2 * T * T * T + 0.04 * T);
}

// ------------------------------------------------------------------ rivers
// Drainage tree, seed-only and in world units: three meandering trunks
// leave the vent; each throws two distributaries downstream. Curve k runs
// from its origin o along unit d with lateral meander
//   L(s) = A (sin(ws + p) − sin p + 0.35 (sin(2.3ws + q) − sin q)),
// so L(0) = 0 and every branch starts on its trunk, every trunk at the
// vent. The distance is |n − L(s)| / √(1 + L'(s)²) (first order), and the
// distance to the origin before it (s < 0), continuous at s = 0.
// The crust's hot fissures, the rivers' channels and the vent that
// founders into the lake are this one tree: it only selects seams.
const int CURVES = 9;
const int CURVE_TEXEL = 96; // row 0 of the data pass: three texels per curve
void mrCurveCalc(int k, out vec4 od, out vec4 m, out vec2 sw) {
  int trunk = k < 3 ? k : (k - 3) / 2;
  vec3 ht = mrH3(vec3(float(trunk) + 0.5, 5.3, 1.7) + vec3(gSeedOff, 0.0));
  float th = atan(gRot.y, gRot.x) + TAU * float(trunk) / 3.0 + 0.8 * (ht.x - 0.5);
  vec2 dt = vec2(cos(th), sin(th));
  vec4 mt = vec4(0.8 + 0.8 * ht.y, 0.2 + 0.1 * ht.z, TAU * ht.x, TAU * fract(ht.y * 7.1));
  if (k < 3) { od = vec4(0.0, 0.0, dt); m = mt; sw = vec2(0.0, 1.0); return; }
  vec3 hb = mrH3(vec3(float(k) + 0.5, 9.1, 4.2) + vec3(gSeedOff, 0.0));
  float sb = 3.0 + 5.5 * hb.x + 2.0 * float((k - 3) % 2);
  vec2 nt = vec2(-dt.y, dt.x);
  float L = mt.x * (sin(mt.y * sb + mt.z) - sin(mt.z) + 0.35 * (sin(2.3 * mt.y * sb + mt.w) - sin(mt.w)));
  float Lp = mt.x * mt.y * (cos(mt.y * sb + mt.z) + 0.805 * cos(2.3 * mt.y * sb + mt.w));
  vec2 tg = normalize(dt + nt * Lp);
  float a = ((k - 3) % 2 == 0 ? 1.0 : -1.0) * (0.45 + 0.4 * hb.y);
  od = vec4(dt * sb + nt * L, cos(a) * tg + sin(a) * vec2(-tg.y, tg.x));
  m = vec4(0.5 + 0.5 * hb.z, 0.26 + 0.12 * hb.y, TAU * hb.z, TAU * fract(hb.x * 5.3));
  sw = vec2(sb, 0.62);
}
void mrCurve(int k, out vec4 od, out vec4 m, out vec2 sw) {
#ifdef PRECOMPUTED
  od = texelFetch(u_precomputed, ivec2(CURVE_TEXEL + 3 * k, 0), 0);
  m = texelFetch(u_precomputed, ivec2(CURVE_TEXEL + 3 * k + 1, 0), 0);
  sw = texelFetch(u_precomputed, ivec2(CURVE_TEXEL + 3 * k + 2, 0), 0).xy;
#else
  mrCurveCalc(k, od, m, sw);
#endif
}
// Nearest channel (by distance over its width): (profile 0..1 × branch
// weight, arrival along the tree, signed offset across it, along s).
vec4 mrChannel(vec2 x) {
  vec4 best = vec4(0.0, 1.0, 9.0, 0.0);
  float bestD = 1e9;
  for (int k = 0; k < CURVES; ++k) {
    vec4 od, m;
    vec2 sw;
    mrCurve(k, od, m, sw);
    vec2 rel = x - od.xy;
    float s = dot(rel, od.zw), n = dot(rel, vec2(-od.w, od.z));
    float ws = m.y * s;
    float L = m.x * (sin(ws + m.z) - sin(m.z) + 0.35 * (sin(2.3 * ws + m.w) - sin(m.w)));
    float Lp = m.x * m.y * (cos(ws + m.z) + 0.805 * cos(2.3 * ws + m.w));
    float off = (n - L) * inversesqrt(1.0 + Lp * Lp);
    float dist = s < 0.0 ? length(rel) : abs(off);
    float taper = sw.y * (k < 3 ? mix(1.0, 0.72, smoothstep(2.0, 17.0, s)) : mix(1.0, 0.6, smoothstep(0.0, 9.0, s)));
    float prof = (1.0 - smoothstep(0.35, 0.65 + 0.75 * taper, dist)) * taper;
    float dEff = dist / (0.6 + 0.4 * taper);
    if (dEff < bestD) { bestD = dEff; best = vec4(prof, (sw.x + max(s, 0.0)) / 18.0, off, sw.x + s); }
  }
  return best;
}

// ------------------------------------------------------------------ plates
// Cell data: the plate site's seed-only hash (xy) and, at the cell's
// lattice corner, the drainage-tree profile and arrival (zw). The data
// pass caches it for the finite field; elsewhere it is computed.
vec4 mrCellCalc(vec2 c) {
  return vec4(mrH22(c + gSeedOff), mrChannel(c * gS).xy);
}
vec4 mrCellData(vec2 c) {
#ifdef PRECOMPUTED
  if (all(greaterThanEqual(c, vec2(-64.0))) && all(lessThan(c, vec2(64.0))))
    return texelFetch(u_precomputed, ivec2(c) + ivec2(64, 65), 0);
  return mrCellCalc(c);
#else
  // The fallback evaluates the tree once per search instead (mrPlates).
  return vec4(mrH22(c + gSeedOff), 0.0, 0.0);
#endif
}
vec2 mrSite(vec2 h) { return 0.5 + JIT * (h - 0.5); }
// The channel frame (offset across, distance along) at world point x,
// bilinear over lattice corners cached in the data pass's second tile
// (it is smooth inside a channel; only lava is shaded with it).
vec2 mrFrame(vec2 x) {
#ifdef PRECOMPUTED
  vec2 q = x / gS, ic = floor(q), f = q - ic;
  if (all(greaterThanEqual(ic, vec2(-64.0))) && all(lessThan(ic, vec2(63.0)))) {
    ivec2 b = ivec2(ic) + ivec2(64, 193);
    vec2 a00 = texelFetch(u_precomputed, b, 0).zw, a10 = texelFetch(u_precomputed, b + ivec2(1, 0), 0).zw;
    vec2 a01 = texelFetch(u_precomputed, b + ivec2(0, 1), 0).zw, a11 = texelFetch(u_precomputed, b + ivec2(1, 1), 0).zw;
    return mix(mix(a00, a10, f.x), mix(a01, a11, f.x), f.y);
  }
#endif
  return mrChannel(x).zw;
}

struct Plate {
  vec2 cellA;   // nearest site's cell (plate identity)
  vec2 cellB;   // the cell across the governing seam
  vec2 siteA;   // nearest site in plate (cell) units, absolute
  vec2 siteB;   // site across the governing seam
  float gap;    // signed distance to the seam band edge (negative inside)
  float border; // exact distance to the nearest Voronoi border
  float width;  // half-width of the governing seam
  vec2 hA;      // the plate's site hash (seeds its height, tilt, ropes)
  float river;  // drainage-tree profile here (bilinear over cell corners)
  float arrive; // arrival along the tree (0 at the vent, 1 at the rim)
};

// Cached 3×3 Voronoi: one pass finds the nearest site, a second takes the
// minimum bisector distance over the same cached sites, which is the exact
// distance to the cell boundary (CPU test: tests/magma.test.mjs). The
// seam width is a continuous field: the tree profile and a per-corner
// variation, bilinear over the lattice corners the search already fetched.
Plate mrPlates(vec2 q, float wScale) {
  vec2 ic = floor(q), f = q - ic;
  // No dynamic array indexing (it would spill to scratch memory): the
  // nearest site's data is tracked in registers.
  vec2 r[9];
  float best = 1e9;
  vec2 mr = vec2(0.0), hA = vec2(0.0), oA = vec2(0.0);
  vec4 c00 = vec4(0.0), c10 = vec4(0.0), c01 = vec4(0.0), c11 = vec4(0.0);
  for (int k = 0; k < 9; ++k) {
    vec2 o = vec2(float(k % 3) - 1.0, float(k / 3) - 1.0);
    vec4 cd = mrCellData(ic + o);
    if (k == 4) c00 = cd;
    if (k == 5) c10 = cd;
    if (k == 7) c01 = cd;
    if (k == 8) c11 = cd;
    r[k] = o + mrSite(cd.xy) - f;
    float d = dot(r[k], r[k]);
    if (d < best) { best = d; mr = r[k]; hA = cd.xy; oA = o; }
  }
  float border = 1e9;
  vec2 rB = mr;
  for (int k = 0; k < 9; ++k) {
    vec2 dr = r[k] - mr;
    float dd = dot(dr, dr);
    if (dd < 1e-10) continue; // the nearest site itself
    float b = dot(0.5 * (mr + r[k]), dr) * inversesqrt(dd);
    if (b < border) { border = b; rB = r[k]; }
  }
  vec4 c = mix(mix(c00, c10, f.x), mix(c01, c11, f.x), f.y);
  vec4 v4 = fract(vec4(c00.x, c10.x, c01.x, c11.x) * 7.13 + vec4(c00.y, c10.y, c01.y, c11.y) * 3.71);
  float wv = mix(mix(v4.x, v4.y, f.x), mix(v4.z, v4.w, f.x), f.y);
#ifndef PRECOMPUTED
  // Without the data pass the tree is evaluated here (exact, not bilinear).
  c.zw = mrChannel(q * gS).xy;
#endif
  float width = wScale * (0.22 + 3.0 * c.z) * (0.6 + 0.8 * wv);
  Plate P;
  P.cellA = ic + oA;
  P.cellB = ic + floor(rB + f);
  P.siteA = q + mr;
  P.siteB = q + rB;
  P.gap = border - width;
  P.border = border;
  P.width = width;
  P.hA = hA;
  P.river = c.z;
  P.arrive = c.w;
  return P;
}

// ------------------------------------------------------------------ terrain
// Shield (rising to the vent), slow undulation and the caldera wall.
float mrBase(vec2 x) {
  float r2 = dot(x, x);
  float h = 0.55 * exp(-r2 / 70.0);
  h += 0.10 * sin(0.37 * x.x + 1.3) * sin(0.29 * x.y + 0.4) + 0.06 * sin(0.21 * x.x - 0.53 * x.y + 2.1);
  float r = sqrt(r2);
  if (r > 19.0) {
    float a = atan(x.y, x.x);
    float jag = 0.55 * sin(3.0 * a + 1.1) + 0.3 * sin(7.0 * a + 2.3) + 0.15 * sin(17.0 * a + 0.4);
    float wallR = 25.5 + 2.2 * jag;
    float rise = smoothstep(wallR - 3.5, wallR + 5.5, r);
    h += rise * (6.5 + 2.4 * jag + 0.9 * sin(13.0 * a + r * 0.7)) + 0.35 * smoothstep(0.3, 0.7, rise) * sin(r * 2.1 + 5.0 * a);
  }
  return h;
}
// Plates fade out before the caldera wall.
float mrPlateMask(float r) { return 1.0 - smoothstep(18.0, 21.0, r); }
// Upper bound of every plate/lava height above the base.
const float TOP_BOUND = 0.18;
// Highest base + TOP_BOUND inside r <= 19: 0.55 + 0.1 + 0.06 + 0.18 < 0.92.
const float FIELD_TOP = 0.92;

// Lava level above the base: deep in cracks, near the plate tops in the
// rivers, and the lake surface around the vent.
float mrLakeMask(float r) { return 1.0 - smoothstep(gLakeR - 0.6, gLakeR + 0.9, r); }
float lakeAmtAt(float r) { return mrLakeMask(r) * gLakeAmt; }
float mrLavaLevel(float r, float w) {
  float flood = gSplit * smoothstep(0.012, 0.06, w);
  return mix(mix(-0.08, 0.055, flood), 0.075, mrLakeMask(r) * gLakeAmt);
}

// Full height: rock (plate slab with rounded edges, grooves at the seams,
// plates sunk inside the lake) and the lava level; h = max(rock, lava).
float mrPlateId(Plate P) { return fract(P.hA.x * 7.13 + P.hA.y * 3.71); }
vec2 mrTilt(Plate P) { return (fract(P.hA * vec2(17.3, 11.9)) - 0.5) * 0.07; }
// Slab top: 0.1 ± 0.025 by plate, tilted by at most ±0.05 (so every rock
// and lava height stays below TOP_BOUND above the base).
float mrRock(vec2 x, Plate P, float base, float mask, out vec2 grad) {
  if (mask <= 0.0) { grad = vec2(0.0); return base; }
  float id = mrPlateId(P);
  vec2 tilt = mrTilt(P);
  vec2 rel = (x / gS - P.siteA);
  float tl = dot(tilt, rel) * gS;
  float top = 0.1 + 0.05 * (id - 0.5) + clamp(tl, -0.05, 0.05);
  grad = abs(tl) < 0.05 ? tilt : vec2(0.0);
  // Plates whose site lies inside the lake sink as a whole.
  float sr = length(P.siteA * gS);
  float sink = smoothstep(gLakeR + 0.3, gLakeR - 1.6, sr) * gLakeAmt;
  top -= 0.32 * sink;
  // Rounded edge toward the seam, then the groove.
  float ew = 0.1 + 0.4 * P.width;
  float e = clamp(P.gap / ew, 0.0, 1.0);
  top -= 0.075 * sq(1.0 - e);
  // ∇gap = −n/gS with n the unit normal toward the neighbouring site.
  vec2 n = normalize(P.siteB - P.siteA + 1e-6);
  grad -= 0.15 * (1.0 - e) / ew * step(0.0, P.gap) * n / gS;
  float wall = smoothstep(-0.35 * P.width - 0.01, 0.0, P.gap);
  float rock = mix(-0.17, top, wall);
  grad *= mask * wall;
  return base + mask * rock;
}
// Height over the base and its gradient (without the base's own slope).
float mrHeightG(vec2 x, float base, out vec2 grad, out Plate P) {
  float r = length(x);
  float mask = mrPlateMask(r);
  grad = vec2(0.0);
  P = mrPlates(x / gS, gSeamW);
  if (mask <= 0.0) return base;
  float rock = mrRock(x, P, base, mask, grad);
  float lava = base + mask * mrLavaLevel(r, P.width);
  if (lava > rock) grad = vec2(0.0);
  return max(rock, lava);
}
// Coarse bound for the first march: plate tops ignored seams.
float mrBound(vec2 x) { return mrBase(x) + TOP_BOUND * mrPlateMask(length(x)); }

// ------------------------------------------------------------------ lava
// Lava streams down each channel. In the channel's own frame (along s,
// across n) the flow is a constant shift in s: two layers, reseeded at
// zero weight with a counter id (mod 16), stream forever without shear.
// Skins are long along the flow and narrow across it.
vec2 mrFlowNoise(float along, float across, float salt) {
  vec2 sum = vec2(0.0);
  float wsum = 0.0;
  for (int k = 0; k < 2; ++k) {
    float ph = gFlow + 0.5 * float(k);
    float tau = fract(ph);
    float id = mod(floor(ph), 16.0);
    float w = 1.0 - abs(2.0 * tau - 1.0);
    float o = mrH2(vec2(id, salt + 3.0)) * 97.0;
    vec2 pp = vec2(along * 1.5 - tau * 4.5 + o, across * 4.2 + o * 0.37);
    float n = 0.62 * mrNoise(pp) + 0.38 * mrNoise(vec2(pp.x * 2.3 + 5.1, pp.y * 2.0));
    // Ropy folds across the flow (pahoehoe), carried with the crust.
    float rope = sin(pp.x * 9.0 + 5.0 * n);
    sum += w * vec2(n - 0.5, rope);
    wsum += w * w;
  }
  sum /= sqrt(max(wsum, 1e-3));
  return vec2(0.5 + sum.x, sum.y);
}

// ------------------------------------------------------------------ helpers (shared)
// Closest approach of the ray to segment [a, b]: (distance, ray t, s).
vec3 mrRaySeg(vec3 ro, vec3 rd, vec3 a, vec3 b) {
  vec3 ba = b - a, w = ro - a;
  float baba = dot(ba, ba), bard = dot(ba, rd), baw = dot(ba, w), rdw = dot(rd, w);
  float den = baba - bard * bard;
  float s = den > 1e-7 ? clamp((baw - rdw * bard) / den, 0.0, 1.0) : 0.0;
  float t = max(s * bard - rdw, 0.0);
  s = baba > 1e-9 ? clamp((dot(ro + rd * t - a, ba)) / baba, 0.0, 1.0) : 0.0;
  return vec3(length(ro + rd * t - a - ba * s), t, s);
}

// Ballistic ejecta: launch i of bomb b. Returns position at flight time tt.
vec3 mrBomb(vec3 p0, vec3 v0, float tt) {
  return p0 + v0 * tt + vec3(0.0, -0.5 * G_ACC * tt * tt, 0.0);
}

// Closest approach to the exact parabola, not a polyline. Project the
// quadratic onto the plane perpendicular to the ray; squared distance is
// quartic. Its derivative is cubic: test ALL real roots plus endpoints.
// A single Newton seed misses falling branches near the apex.
float mrCbrt(float x) { return sign(x) * pow(abs(x), 1.0 / 3.0); }
vec3 mrRayArc(vec3 ro, vec3 rd, vec3 p0, vec3 v0, float lo, float hi) {
  float span = hi - lo;
  vec3 a = vec3(0.0, -0.5 * G_ACC * span * span, 0.0);
  vec3 b = (v0 + vec3(0.0, -G_ACC * lo, 0.0)) * span;
  vec3 c = mrBomb(p0, v0, lo) - ro;
  a -= rd * dot(a, rd); b -= rd * dot(b, rd); c -= rd * dot(c, rd);
  float aa = 2.0 * dot(a, a);
  vec3 roots;
  if (aa < 1e-8) roots = vec3(-dot(b, c) / max(dot(b, b), 1e-8));
  else {
    float B = 3.0 * dot(a, b) / aa;
    float C = (dot(b, b) + 2.0 * dot(a, c)) / aa, D = dot(b, c) / aa;
    float p = C - B * B / 3.0, q = 2.0 * B * B * B / 27.0 - B * C / 3.0 + D;
    float disc = q * q * 0.25 + p * p * p / 27.0;
    if (disc >= 0.0) {
      float r = sqrt(disc);
      roots = vec3(mrCbrt(-0.5 * q + r) + mrCbrt(-0.5 * q - r) - B / 3.0);
    } else {
      float r = 2.0 * sqrt(-p / 3.0);
      float angle = acos(clamp(1.5 * q / p * sqrt(-3.0 / p), -1.0, 1.0)) / 3.0;
      roots = r * cos(vec3(angle, angle - TAU / 3.0, angle - 2.0 * TAU / 3.0)) - B / 3.0;
    }
  }
  float best = dot(c, c), u = 0.0;
  vec3 end = a + b + c;
  if (dot(end, end) < best) { best = dot(end, end); u = 1.0; }
  for (int k = 0; k < 3; ++k) {
    float v = clamp(roots[k], 0.0, 1.0);
    vec3 e = (a * v + b) * v + c;
    float dd = dot(e, e);
    if (dd < best) { best = dd; u = v; }
  }
  vec3 point = mrBomb(p0, v0, mix(lo, hi, u)) - ro;
  float t = max(dot(point, rd), 0.0);
  return vec3(length(point - rd * t), t, u);
}

// Cheap billow for the ash plume (domain-warped sines, no lattice).
float mrBillow(vec3 p, float phase) {
  // Integer phase harmonics advect each billow upward continuously. One
  // periodic field replaces two separately hashed/reseeded noise layers.
  float n = sin(p.x * 1.7 + sin(p.z * 1.3 + p.y * 0.9 - phase)) * sin(p.z * 1.5 + sin(p.y * 1.4 + p.x * 0.7 - phase));
  n += 0.6 * sin(p.y * 1.9 - phase * 2.0 + sin(p.x * 2.3 - p.z * 1.1) * 1.4) * sin(p.x * 2.1 + p.z * 1.7);
  n += 0.3 * sin(p.x * 4.1 + p.y * 3.3 - phase * 3.0 + sin(p.z * 3.7));
  return 0.5 + 0.28 * n;
}

// Per-frame constants from the uniforms (shared by the image and the
// ejecta precompute pass).
void mrSetup() {
  float dev = clamp(u_params[0], 0.0, 2.0);
  float level = clamp(u_level, 0.0, 1.0);
  gDev = dev;
  gLevel = level;
  gSplit = smoothstep(0.08, 1.0, dev);
  gLakeAmt = smoothstep(1.05, 1.85, dev);
  gErupt = smoothstep(1.3, 2.0, dev);
  gHeat = clamp(u_params[3], 0.0, 1.0);
  gS = 1.1 * clamp(u_params[2], 0.6, 1.6);
  gForce = clamp(u_params[7], 0.0, 1.5);
  gEmbers = clamp(u_params[4], 0.0, 1.0);
  gSeedOff = vec2(float(u_seedBits % 397u), float((u_seedBits / 397u) % 389u)) * 1.37;
  float rotA = float(u_seedBits % 773u) * 0.0081;
  gRot = vec2(cos(rotA), sin(rotA));
  // Seams widen as the plates split; the lake opens around the vent.
  gSeamW = 0.018 + 0.068 * gSplit + 0.03 * smoothstep(1.0, 2.0, dev);
  gLakeR = 6.2 * gLakeAmt;
  gLavaT = mix(0.66, 0.76, gSplit) + 0.1 * gErupt + 0.12 * (gHeat - 0.5);

#ifdef PHOSPHOR_LATE
  gOrbit = u_clock[0];
  gFlow = u_clock[1];
  gErPh = u_clock[2];
#else
  gOrbit = u_time * (u_params[5] * 0.07);
  gFlow = u_time * (u_params[1] * 0.18);
  gErPh = u_time * ((0.8 + 0.45 * clamp(u_level, 0.0, 1.0)) / ${CYCLE_SECONDS.toFixed(1)});
#endif
  float ventBase = mrBase(vec2(0.0));
  gVent = vec3(0.0, ventBase + 0.075, 0.0);
  gKick = u_kick * smoothstep(0.15, 1.0, level);
  gFountH = (1.0 + 8.0 * gForce) * gErupt * (1.0 + 0.12 * u_rhythm.z + 0.04 * gKick);
}

// Ejecta: BIG_CAP bombs on wide arcs and SPRAY_CAP droplets in the
// fountain, on staggered cycles; each launch draws a new seeded direction
// and speed (exact parabolas). Returns false while bomb i is not flying.
bool mrLaunch(int i, out vec3 p0, out vec3 v0, out float tt, out float tf, out float on, out bool big) {
  float fi = float(i);
  big = i < BIG_CAP;
  float nBig = mix(4.0, float(BIG_CAP), gLevel) * smoothstep(0.0, 0.4, gForce);
  float nSpray = mix(4.0, float(SPRAY_CAP), gLevel) * smoothstep(0.0, 0.4, gForce);
  on = clamp(big ? nBig - fi : nSpray - (fi - float(BIG_CAP)), 0.0, 1.0) * gErupt;
  float u = gErPh + fract(fi * 0.6180339887);
  float tau = fract(u);
  float id = mod(floor(u), 64.0);
  vec3 hb = mrH3(vec3(fi, id, 3.7) + vec3(gSeedOff, 0.0));
  // Launch speed grows with the eruption, so a young fountain throws low.
  float kf = sqrt(max(gForce, 0.05)) * mix(0.6, 1.0, gErupt);
  float vy = (big ? mix(8.5, 11.0, hb.x) : mix(5.5, 9.5, hb.x)) * kf;
  float vh = (big ? mix(1.8, 2.8, hb.y) : mix(0.1, 1.1, hb.y)) * kf;
  float ang = TAU * hb.z;
  v0 = vec3(vh * cos(ang), vy, vh * sin(ang));
  p0 = gVent + vec3(0.25 * cos(ang), 0.05, 0.25 * sin(ang));
  // Flight lasts until it falls back to 0.35 below the launch height.
  tf = (vy + sqrt(vy * vy + 2.0 * G_ACC * 0.35)) / G_ACC;
  tt = tau * CYCLE;
  // Big bombs flare where they land (local, short), then wait to relaunch.
  return on > 0.0 && tt < tf + (big ? FLARE : 0.0);
}
// Exact curved tail over 3·trail seconds. The complete parabola lies in
// the sphere around the endpoint midpoint (deviation ≤ gΔ²/8).
float mrTrail(bool big) { return big ? 0.42 : 0.10; }
vec4 mrBombBound(vec3 p0, vec3 v0, float tt, float tf, bool big) {
  if (tt >= tf) return vec4(mrBomb(p0, v0, tf), FLARE_R);
  float span = 3.0 * mrTrail(big);
  vec3 h0 = mrBomb(p0, v0, tt);
  vec3 tail = mrBomb(p0, v0, max(tt - span, 0.0));
  return vec4(0.5 * (h0 + tail), 0.5 * length(h0 - tail) + 0.125 * G_ACC * span * span);
}

`;

const fragment = `${common}
void main() {
  mrSetup();
  float level = gLevel;
  float dev = gDev;
  // Camera: a slow orbit around the vent; radius and height on 16-bar
  // phrases; it pulls back and rises as the eruption builds.
  float seedAz = float(u_seedBits % 1009u) * 0.0062;
  float az = gOrbit + seedAz;
  float phrase = u_beat / 64.0;
  float pk = floor(phrase);
  float wob = mix(float(seedHash(uint(int(pk)) ^ 0x51ed27u) >> 8u) / 16777216.0,
                  float(seedHash(uint(int(pk) + 1) ^ 0x51ed27u) >> 8u) / 16777216.0,
                  smoothstep(0.55, 1.0, fract(phrase))) * 2.0 - 1.0;
  float camH = clamp(u_params[6], 0.0, 1.0);
  float peakR = 12.8 + 12.0 * max(gForce - 1.0, 0.0);
  float R = mix(mix(7.6, 8.6, gSplit), peakR, gErupt) * (1.0 + 0.05 * wob) + 1.2 * camH;
  vec3 ro = vec3(R * cos(az), 0.0, R * sin(az));
  ro.y = mrBase(ro.xz) + mix(2.2, 6.6, camH) * mix(0.8, 1.0, gSplit) + 1.4 * gErupt + 0.15 * wob;
  vec3 target = vec3(0.0, gVent.y - mix(0.9, 1.6, camH) - 1.1 * (1.0 - gSplit) + (4.8 + 3.5 * max(gForce - 1.0, 0.0)) * gErupt, 0.0);
  // Keep the vent a little off-centre, alternating slowly.
  vec3 fw0 = normalize(target - ro);
  vec3 side = normalize(cross(fw0, vec3(0.0, 1.0, 0.0)));
  target += side * (0.9 + 1.4 * gErupt) * sin(az + 0.7);
  vec3 fw = normalize(target - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  float kick = gKick;
  float focal = 1.55 * (1.0 + 0.02 * kick);
  // A longer lens for the eruption: the fountain fills the frame.
  focal *= 1.0 + 0.2 * gErupt;
  vec2 uv = rot2(0.03 * sin(az * 2.0)) * (aspectUV() * 2.0);
  // Small refractive displacement in the hot near-ground air, not camera shake.
  float shimmerPhase = sin(TAU * gFlow);
  vec2 shimmer = vec2(sin(uv.y * 37.0 + shimmerPhase * 2.0 + sin(uv.x * 13.0)),
                      sin(uv.x * 29.0 - shimmerPhase * 3.0 + uv.y * 11.0));
  uv += shimmer * (0.0012 + 0.001 * gSplit) * exp(-sq((uv.y + 0.25) / 0.5));
  vec3 rd = normalize(fw * focal + rt * uv.x + up * uv.y);
  gPix = 2.0 / (focal * u_resolution.y);

  // ------------------------------------------------------------ march
  // 1) Coarse march against the plate-top bound (Lipschitz step with a
  //    slope bound that grows toward the caldera wall), bisection refine.
  float t = 0.05, tPrev = 0.0;
  // Exact skip: inside r < 19 (no caldera wall yet) every slab and lava
  // height lies below FIELD_TOP, so a camera inside that cylinder can
  // start where the ray first drops to FIELD_TOP or leaves the cylinder.
  {
    float a2 = dot(rd.xz, rd.xz), b2 = dot(ro.xz, rd.xz), c2 = dot(ro.xz, ro.xz) - 361.0;
    if (c2 < 0.0 && ro.y > FIELD_TOP) {
      float tCyl = a2 > 1e-8 ? (-b2 + sqrt(b2 * b2 - a2 * c2)) / a2 : 1e9;
      float tTop = rd.y < 0.0 ? (ro.y - FIELD_TOP) / -rd.y : 1e9;
      t = max(t, min(tCyl, tTop) - 0.01);
      tPrev = t;
    }
  }
  // The plate of the converged detail step, reused for shading.
  Plate marchP;
  bool haveP = false;
  float tMax = 75.0;
  bool hit = false;
  // The governor's ray-step budget (u_raySteps 96 → 64 → 40 under load)
  // scales the coarse march, the detail iterations and the ash samples.
  int limit = int(min(float(MARCH_CAP), 1.15 * u_raySteps));
  int detailN = u_raySteps >= 90.0 ? DETAIL_CAP : (u_raySteps >= 60.0 ? 4 : 3);
  int plumeN = int(clamp(u_raySteps * float(PLUME_STEPS) / 96.0, 8.0, float(PLUME_STEPS)));
  for (int i = 0; i < MARCH_CAP; ++i) {
    if (i >= limit) break;
    vec3 p = ro + rd * t;
    float r = length(p.xz);
    float gap = p.y - mrBound(p.xz);
    if (gap < 0.01 + 0.001 * t) { hit = true; break; }
    if (p.y > 11.5 && rd.y > 0.0) break; // above the caldera wall
    float slope = 0.13 + 2.3 * smoothstep(15.0, 21.0, r);
    tPrev = t;
    t += clamp(gap / (max(-rd.y, 0.0) + slope), 0.004 + 0.002 * t, 2.2 + 0.04 * t);
    if (t > tMax) break;
  }
  if (hit) {
    float a = tPrev, b = t;
    for (int k = 0; k < 5; ++k) {
      float m = 0.5 * (a + b);
      vec3 p = ro + rd * m;
      if (p.y < mrBound(p.xz)) b = m; else a = m;
    }
    t = b;
    // 2) Detail march with the full plate field from the bound surface.
    vec3 p0 = ro + rd * a;
    if (a < 17.0 && mrPlateMask(length(p0.xz)) > 0.0) {
      // Newton steps on f(s) = y(s) − h(s): slab tops are planes, so most
      // rays converge in two evaluations; a step into a groove brackets the
      // root and regula falsi finishes. The base is linearised over this
      // short segment (curvature error below 0.01 over a unit).
      float b0 = mrBase(p0.xz);
      vec2 g0 = vec2(mrBase(p0.xz + vec2(0.05, 0.0)) - b0, mrBase(p0.xz + vec2(0.0, 0.05)) - b0) / 0.05;
      float s = a, lo = a, glo = 1.0, hi = -1.0, ghi = 0.0;
      for (int k = 0; k < DETAIL_CAP; ++k) {
        if (k >= detailN) break;
        vec3 p = ro + rd * s;
        vec2 gh;
        // Fully sunk central plates cannot reach the molten surface:
        // top <= .175 - .32 < .075. Include the maximum site offset
        // before skipping the expensive plate search, never at the shore.
        bool molten = gLakeAmt >= 1.0 && length(p.xz) + 1.6 * gS < gLakeR - 1.6;
        float baseH = b0 + dot(g0, p.xz - p0.xz);
        float height;
        if (molten) { gh = vec2(0.0); height = baseH + 0.075; }
        else height = mrHeightG(p.xz, baseH, gh, marchP);
        float g = p.y - height;
        if (abs(g) < 0.0012 + 0.0005 * s) { haveP = !molten; break; }
        if (g > 0.0) { lo = s; glo = g; } else { hi = s; ghi = g; }
        float slope = rd.y - dot(g0 + gh, rd.xz);
        float relaxed = g / (max(-rd.y, 0.0) + 0.12);
        float sn = slope < -0.02 ? s - g / slope : s + relaxed;
        if (g > 0.0) sn = max(sn, s + 0.25 * relaxed);
        // Keep the bracket once it exists.
        if (hi > 0.0 && (sn <= lo || sn >= hi)) sn = lo + (hi - lo) * glo / max(glo - ghi, 1e-6);
        s = sn;
      }
      t = s;
    }
  }

  // ------------------------------------------------------------ shading
  vec3 col = vec3(0.0);
  vec3 P = ro + rd * t;
  float fp = gPix * t / max(abs(rd.y), 0.12) / gS; // ground footprint in cells
  // Light of the lake and fountain (point light above the vent).
  float lakeGlow = gLakeAmt * (0.55 + 0.45 * gErupt);
  vec3 lightP = gVent + vec3(0.0, 0.6 + 0.35 * gFountH, 0.0);
  float fountainLight = (0.5 * lakeGlow + 1.1 * gErupt * (0.6 + 0.4 * gForce)) * (1.0 + 0.12 * kick + 0.3 * u_rhythm.z);
  vec3 glowCol = mrHeat(0.72);
  // Overall glow of the lava field, which lights the haze, wall and clouds.
  // The crust's hot fissures already light a little haze.
  float fieldGlow = 0.32 + 0.45 * gSplit + 0.9 * lakeGlow + 0.6 * gErupt;
  vec3 heat62 = mrHeat(0.62);
  vec3 hazeCol = heat62 * 0.05 * fieldGlow / (1.0 + 0.6 * fieldGlow) + u_secondary * 0.006;
  float fog = 0.0;
  // Heat front: the tree's fissures are hot up to this arrival; it runs
  // out from the vent to the rim between Crust and Rivers, and back.
  float front = mix(0.56, 1.45, smoothstep(0.0, 0.95, gDev)) + 0.14 * gLevel;

  if (hit) {
    vec2 x = P.xz;
    float r = length(x);
    float base = mrBase(x);
    float mask = mrPlateMask(r);
    // Outside the finite plate field the caldera is solid rock. A valid
    // inert record avoids 9 site fetches + bisectors for every wall pixel.
    Plate Pl = Plate(vec2(0.0), vec2(1.0, 0.0), vec2(0.0), vec2(1.0, 0.0), 1.0, 1.0, 0.0, vec2(0.5), 0.0, 1.0);
    if (mask > 0.0) {
      if (haveP) Pl = marchP; else Pl = mrPlates(x / gS, gSeamW);
    }
    vec2 rockGrad;
    float rock = mrRock(x, Pl, base, mask, rockGrad);
    float lavaY = base + mask * mrLavaLevel(r, Pl.width);
    // Seams narrower than the pixel footprint shade as rock; their glow
    // comes from the footprint coverage below (no far-field sparkle).
    bool lava = lavaY >= rock && mask > 0.0 && (Pl.width > 0.8 * fp || lakeAmtAt(r) > 0.5);

    // Base gradient (finite differences of the cheap base).
    float e = 0.02;
    vec2 gb = vec2(mrBase(x + vec2(e, 0.0)) - base, mrBase(x + vec2(0.0, e)) - base) / e;

    // Normal across the nearest seam, toward the neighbouring plate.
    vec2 sn = normalize(Pl.siteB - Pl.siteA + 1e-6);
    float lakeM = mrLakeMask(r) * gLakeAmt * mask;
    float vent = exp(-r * r / 50.0);
    // Breathing: slow waves of heat travel outward through the seams.
    float breathe = 0.5 + 0.5 * sin(TAU * gFlow - 0.55 * r + 2.5 * sin(x.x * 0.37 + 1.7 * sin(x.y * 0.29)) + 2.0 * sin(x.y * 0.41 - 0.8));
    // Which seams are hot: the drainage tree behind the heat front, a few
    // lone seams (a hash symmetric in both plates, so one seam has one
    // temperature) and, as the plates split, every seam a little.
    vec2 hB = mrCellData(Pl.cellB).xy;
    float seamId = fract((Pl.hA.x + hB.x) * 13.7 + (Pl.hA.y + hB.y) * 7.3);
    // The whole braided channel belongs to the tree (its margins too).
    float net = smoothstep(0.03, 0.3, Pl.river);
    float behind = 1.0 - smoothstep(front - 0.16, front, Pl.arrive);
    float lone = smoothstep(0.86 - 0.1 * gLevel, 0.9 - 0.1 * gLevel, seamId) * (0.45 + 0.55 * breathe);
    float hot = max(net * behind, 0.6 * lone);
    hot = max(hot, mix(0.0, 0.55, smoothstep(0.6, 1.6, gDev)));
    // Gesture x: a crack-propagation flash runs out along the hot tree.
    float pulseA = 1.25 * (1.0 - u_rhythm.x);
    float ring = u_rhythm.x * exp(-sq((Pl.arrive - pulseA) / 0.1)) * (0.25 + 0.75 * net * behind);
    // Gesture y: a surge front of fresh lava travels down the channels.
    float surgeA = 1.35 * (1.0 - u_rhythm.y);
    float surge = u_rhythm.y * (0.3 + 0.7 * exp(-sq((Pl.arrive - surgeA) / 0.12)) * net);
    // Cold seams are dark grooves; hot ones run near the lava temperature.
    float seamT = gLavaT * (0.86 + 0.28 * vent) * mix(0.44, 1.0, hot);
    seamT *= 1.0 - 0.2 * gSplit * (1.0 - net) * (1.0 - smoothstep(0.03, 0.14, Pl.width));
    seamT += 0.16 * (breathe - 0.5) * (1.0 - 0.6 * gSplit) * hot;
    // Only a seeded subset of hot cracks flares with any kick.
    float flare = smoothstep(0.72, 0.96, mrPlateId(Pl)) * hot;
    seamT += 0.34 * ring + 0.1 * surge + 0.12 * kick * flare;

#ifdef MR_DEBUG
    vec3 dbgT = vec3(0.0);
#endif
    vec3 N;
    vec3 albedo;
    vec3 emit = vec3(0.0);
    float ao = 1.0;
    float gloss = 0.4;
    vec3 env = vec3(0.0); // obsidian reflection colour (secondary-tinted)
    if (lava) {
      // Lava: cooling skins stream down each channel in the channel's own
      // frame (along / across), torn by incandescent seams; the centre
      // runs hotter than the banks.
      float lakeFull = smoothstep(0.75, 0.95, lakeM);
      // Skins only resolve in channels several footprints wide; narrower
      // ones take the skin/lava average (n = 0.5, half skinned).
      vec2 fn = vec2(0.5, 0.0);
      if (lakeFull < 1.0 && Pl.width > 3.0 * fp) {
        vec2 fr = mrFrame(x);
        fn = mrFlowNoise(fr.y, fr.x, 11.0);
      }
      // Contrast-stretched: open incandescent lava, dull crust skins with
      // ropy folds, and hot seams where skins tear apart.
      float n = clamp((fn.x - 0.5) * 2.8 + 0.5, 0.0, 1.0);
      float skinAmt = mix(0.35, 1.0, gSplit) * (1.0 - 0.35 * gLevel) * (1.0 - 0.6 * surge);
      float skin = smoothstep(0.4, 0.6, n) * skinAmt;
      float tear = (1.0 - smoothstep(0.0, 0.05, abs(n - 0.43))) * skinAmt;
      float centre = sqrt(clamp(-Pl.gap / max(Pl.width * 0.8, 1e-3), 0.0, 1.0));
      float T = min(seamT, 0.74) * (0.72 + 0.28 * centre + 0.06 * smoothstep(0.05, 0.2, Pl.width));
      T *= mix(1.04, 0.42 + 0.08 * fn.y, skin);
      T += (0.22 * tear * centre + 0.12 * surge) * hot;
      if (lakeM > 0.01) {
        // The lake turns slowly (one turn per 16 flow cycles) under a crust
        // of black floes split by incandescent cracks: ridges of a warped
        // value noise, wider where the fountain tears the crust open.
        float la = TAU * gFlow / 16.0;
        vec2 xr = mat2(cos(la), sin(la), -sin(la), cos(la)) * x;
        xr += 0.35 * vec2(sin(xr.y * 0.9 + 0.6 * sin(xr.x * 1.7)), sin(xr.x * 0.8 + 1.0 + 0.6 * sin(xr.y * 1.5)));
        float lfp = fp * gS;
        float c1 = mrNoiseLin(xr * 1.1 + gSeedOff);
        float c2 = mrNoiseLin(xr * 2.6 + 0.6 * vec2(sin(TAU * gFlow), cos(TAU * gFlow)) + 7.0);
        float open = exp(-r * r / (2.0 + 3.0 * gErupt));
        float ridge1 = abs(2.0 * c1 - 1.0), ridge2 = abs(2.0 * c2 - 1.0);
        float cw1 = 0.04 + 0.22 * open + 0.04 * gLevel, cw2 = 0.03 + 0.1 * open;
        // Thin incandescent cracks whose heat varies along them, with a
        // soft glow in the crust beside each crack.
        float along1 = 0.55 + 0.6 * mrNoise(xr * 3.7 + 3.0);
        float lcrack = max((1.0 - smoothstep(cw1 * 0.3, cw1 + lfp * 2.0, ridge1)) * along1,
                           0.6 * (1.0 - smoothstep(cw2 * 0.3, cw2 + lfp * 3.0, ridge2)));
        lcrack = max(lcrack, 0.25 * (1.0 - smoothstep(0.0, 0.22, ridge1)) * along1);
        float boil = sin(r * 3.0 - TAU * gFlow) * sin(xr.x * 2.1 + xr.y * 1.7);
        float crust = (1.0 - lcrack) * (1.0 - open);
        float Tl = (0.74 + 0.1 * (gHeat - 0.5)) * (1.0 - 0.42 * crust) + 0.14 * lcrack + (0.12 + 0.1 * boil) * open * gErupt;
        // Ripples run out from the fountain's foot.
        Tl += 0.05 * gErupt * sin(r * 2.6 - TAU * gFlow * 2.0) * exp(-r / 2.5);
        float nl = 0.5 + 0.5 * (ridge1 - 0.5);
        // Sinking plates show as dark rafts just below the lake surface.
        float raft = smoothstep(-0.14, -0.02, rock - lavaY);
        Tl *= 1.0 - 0.5 * raft;
        T = mix(T, Tl, smoothstep(0.0, 0.7, lakeM));
        n = mix(n, nl, lakeM);
        skin = mix(skin, crust, lakeM);
      }
      T += 0.18 * ring;
#ifdef MR_DEBUG
      dbgT = vec3(T, skin, n);
#endif
      emit = mrHeat(T) * (0.8 + 0.5 * gHeat);
      N = normalize(vec3(-gb.x + 0.1 * (n - 0.5), 1.0, -gb.y));
      albedo = vec3(0.04);
      gloss = mix(0.8, 0.3, skin);
    } else {
      // Basalt plate: slab tilt, rounded edges and ropy surface relief.
      float id = mrPlateId(Pl);
      vec2 tilt = mrTilt(Pl);
      float ew = 0.1 + 0.4 * Pl.width;
      float ec = clamp(Pl.gap / ew, 0.0, 1.0);
      // d(rounding)/d(gap) · ∇gap, with ∇gap = -sn / gS (the gap grows
      // away from the seam, i.e. away from the neighbouring site).
      float dEdge = 0.15 * (1.0 - ec) / ew * step(0.0, Pl.gap);
      vec2 grad = gb + mask * (tilt - dEdge * sn / gS);
      // Two crusts: glassy obsidian plates and ropy pahoehoe plates.
      float glassy = step(0.42, fract(id * 3.7));
      float ropeA = TAU * fract(Pl.hA.x * 5.3 + Pl.hA.y * 19.1);
      vec2 rdir = vec2(cos(ropeA), sin(ropeA));
      float rq = dot(x / gS - Pl.siteA, rdir) * 22.0 + 1.2 * sin(x.x * 2.7 + 1.5 * sin(x.y * 3.1)) + 0.8 * sin(x.y * 2.3 - x.x * 1.1);
      float ropeKeep = (1.0 - smoothstep(0.25, 0.7, fp * 22.0 / TAU * 2.0)) * (1.0 - 0.8 * glassy);
      grad += mask * rdir * cos(rq) * 0.12 * ropeKeep;
      float bump = mrNoise(x * 9.0) - 0.5;
      N = normalize(vec3(-grad.x, 1.0, -grad.y));
      // Groove walls face the seam.
      float wallF = 1.0 - smoothstep(-0.012, 0.004, Pl.gap);
      N = normalize(mix(N, normalize(vec3(sn.x * 0.9, 0.45, sn.y * 0.9)), wallF * mask));
      float tone = 0.7 + 0.3 * id + 0.3 * bump * ropeKeep;
      albedo = (vec3(0.16) + u_secondary * 0.05) * tone * mix(1.0, 0.45, glassy);
      gloss = mix(0.35, 0.95, glassy);
      // Hot rock: groove walls glow just above the lava.
      float hotWall = (1.0 - smoothstep(0.0, 0.05, rock - lavaY)) * (1.0 - smoothstep(-0.005, 0.03, Pl.gap)) * mask;
      vec3 heatS = mrHeat(seamT);
      emit = heatS * hotWall * 0.48;
      // The crack as coverage of the pixel footprint (far seams fade
      // smoothly instead of aliasing), plus a soft heat halo on hot rims.
      float wEff = max(Pl.width, 0.002);
      float cover = wEff / max(wEff, fp * 1.2) * exp(-max(Pl.gap, 0.0) / max(fp * 1.2, 0.004));
      emit += heatS * (cover + 0.1 * hot * exp(-max(Pl.gap, 0.0) / 0.03)) * mask;
      // Hairline cooling cracks in the slab next to a hot seam (they fade
      // out with the footprint, so distant pixels skip them).
      if (fp < 0.3 && hot > 0.05) {
        float hair = abs(mrNoise((x / gS - Pl.siteA) * 7.0 + Pl.hA * 31.0) - 0.5);
        float hairW = 0.035 + fp * 3.0;
        float hairGlow = (1.0 - smoothstep(0.0, hairW, hair)) * 0.035 / hairW
                       * exp(-max(Pl.gap, 0.0) / 0.12) * hot * (1.0 - smoothstep(0.08, 0.3, fp));
        emit += heatS * 0.6 * hairGlow * mask;
      }
      ao = mix(1.0, mix(0.35, 1.0, smoothstep(-0.02, 0.12, Pl.gap)) * (1.0 - 0.25 * (1.0 - ec)), mask);
      // Beyond the lava field: the caldera wall, layered rock.
      if (mask < 1.0) {
        float strata = 0.5 + 0.5 * sin(P.y * 3.1 + 2.0 * mrNoise(x * 0.7));
        float grit = mrNoise(x * 2.3 + P.y);
        albedo = mix(albedo, vec3(0.16) * (0.5 + 0.5 * strata) * (0.7 + 0.6 * grit), 1.0 - mask);
        vec3 nw = normalize(vec3(-gb.x, 1.0, -gb.y) + 0.35 * vec3(grit - 0.5, 0.0, strata - 0.5));
        N = normalize(mix(N, nw, 1.0 - mask));
        gloss = mix(gloss, 0.1, 1.0 - mask);
      }
      // Obsidian mirrors the ash deck (secondary-tinted, lit from below).
      vec3 R = reflect(rd, N);
      env = (u_secondary * 0.035 + heat62 * 0.05 * fieldGlow) * smoothstep(-0.05, 0.4, R.y) * glassy * mask * (0.35 + 0.65 * ec);
    }

    // Lighting: a dim cool key (sky), lava light from the nearest seam,
    // the lake/fountain light, field glow from below and a fresnel rim.
    vec3 keyDir = normalize(vec3(-0.45, 0.6, 0.35));
    vec3 keyCol = mix(u_secondary, vec3(1.0), 0.35) * 0.2;
    float diff = max(dot(N, keyDir), 0.0);
    vec3 light = keyCol * (0.3 + diff);
    // Seam light: falls off away from the seam, brightest on faces turned to it.
    vec3 Ls = normalize(vec3(sn.x, -0.2, sn.y));
    float seamFall = exp(-max(Pl.gap, 0.0) * gS / (0.05 + 0.45 * Pl.width * gS));
    vec3 seamHeat = mrHeat(seamT);
    light += seamHeat * 0.7 * seamFall * (0.25 + 0.75 * max(dot(N, Ls), 0.0)) * mask;
    // Field glow: the lit haze and the whole lava field seen from the wall.
    vec3 Lf = normalize(vec3(-x / max(r, 1e-3), 0.25));
    light += heat62 * 0.1 * fieldGlow * (0.2 + max(dot(N, Lf), 0.0)) * (0.3 + 1.7 * (1.0 - mask));
    // Lake / fountain light.
    vec3 Lp = lightP - P;
    float dl = length(Lp);
    Lp /= dl;
    float lambert = max(dot(N, Lp), 0.0);
    light += glowCol * fountainLight * (lambert + 0.1) * (2.0 + 0.6 * gLakeR) / (1.0 + 0.3 * dl * dl);
    // Glassy sheen toward the lake light, glints of the nearest hot seam
    // on glass, and the haze rim.
    vec3 H = normalize(Lp - rd);
    float spec = pow(max(dot(N, H), 0.0), 30.0) * gloss;
    vec3 sheen = glowCol * fountainLight * spec * 2.0 / (1.0 + 0.2 * dl * dl);
    vec3 Hs = normalize(normalize(vec3(sn.x, 0.12, sn.y)) - rd);
    float glint = pow(max(dot(N, Hs), 0.0), 48.0) * gloss * gloss;
    if (!lava) sheen += seamHeat * glint * 1.6 * exp(-max(Pl.gap, 0.0) * gS / 0.6) * mask;
    float fres = pow(1.0 - max(dot(N, -rd), 0.0), 4.0);
    vec3 rim = hazeCol * 2.0 * fres * gloss + env * (0.3 + 0.5 * fres);
    col = albedo * light * ao + emit + (sheen + rim) * ao;
#ifdef MR_DEBUG
    col = lava ? dbgT : vec3(0.0);
#endif

    // Distance haze glows faintly with the field's light below it.
    fog = 1.0 - exp(-t * 0.017);
    col = mix(col, hazeCol + heat62 * 0.05 * fieldGlow / (1.0 + 0.6 * fieldGlow) * (1.0 - smoothstep(2.0, 9.0, P.y)), fog);
  } else {
    t = 80.0;
  }
  if (!hit || P.y > 4.0) {
    // Sky: an ash deck lit from below by the field and the fountain, which
    // gives the caldera wall a silhouette, and a glowing haze band on the
    // horizon. Dark at the top of frame, but slowly rolling.
    vec3 sky = hazeCol;
    if (rd.y > 0.0) {
      float tc = (15.0 - ro.y) / rd.y;
      vec2 cw = ro.xz + rd.xz * tc;
      float la = TAU * gFlow / 16.0;
      vec2 cp = cw * 0.075 + 0.6 * vec2(cos(la), sin(la));
      float cn = 0.62 * mrNoise(cp + 3.1) + 0.38 * mrNoise(cp * 2.6 - 0.8 * vec2(sin(la), cos(la)) + 7.7);
      float dist = length(cw);
      float below = fieldGlow * (0.2 + 0.8 * exp(-dist * dist / 500.0)) + 6.0 * gErupt * exp(-dist * dist / 150.0);
      float billow = smoothstep(0.25, 0.8, cn);
      // Billow undersides catch the glow; the gaps stay dark.
      vec3 deck = (heat62 * 0.1 * below + u_secondary * 0.006) * (0.08 + billow * billow * 1.4);
      float far = exp(-tc * 0.014);
      sky = mix(hazeCol, deck, far);
    }
    sky += heat62 * 0.3 * fieldGlow * exp(-abs(rd.y - 0.02) * 12.0);
    if (!hit) col = sky;
  }

  // ------------------------------------------------------------ plume
  // Ash column above the vent, ray-cylinder bounded, lit from below by the
  // fountain: a rising stem that spreads into an umbrella under the deck.
  // Integer phase harmonics keep its upward billow endless.
  float plumeAmt = gErupt;
  // Conservative bound of the core column, its halo and every spray shell
  // (outer shell radius <= 3.3 at force 1.5) plus antialiasing.
  vec3 curtainBound = mrRaySeg(ro, rd, gVent, gVent + vec3(0.0, gFountH, 0.0));
  float curtainRadius = max(7.2, 3.3 + 6.0 * gPix * 80.0);
  bool seesCurtain = curtainBound.x < curtainRadius && curtainBound.y < t + curtainRadius;
  if (plumeAmt > 0.01) {
    float y0 = gVent.y + 0.25 * gFountH, y1 = gVent.y + 15.0;
    float Rc = 12.0;
    vec2 oc = ro.xz;
    float A = dot(rd.xz, rd.xz), B = dot(oc, rd.xz), C = dot(oc, oc) - Rc * Rc;
    float disc = B * B - A * C;
    if (disc > 0.0 && A > 1e-6) {
      float sq0 = sqrt(disc);
      float ta = max((-B - sq0) / A, 0.0), tb = min((-B + sq0) / A, t);
      // Clip to the slab y0..y1.
      if (abs(rd.y) > 1e-5) {
        float ty0 = (y0 - ro.y) / rd.y, ty1 = (y1 - ro.y) / rd.y;
        ta = max(ta, min(ty0, ty1));
        tb = min(tb, max(ty0, ty1));
      }
      // Tighter chord: the widest plume radius between the clipped heights.
      if (tb > ta) {
        float hMax = max(ro.y + rd.y * ta, ro.y + rd.y * tb) - y0;
        float Rh = 1.0 + 0.36 * hMax + 4.0 * smoothstep(6.5, 12.0, hMax) + length(vec2(0.08, 0.035)) * max(hMax, 0.0) + 0.36 + 0.3;
        Rh = min(Rh, Rc);
        float d2 = B * B - A * (dot(oc, oc) - Rh * Rh);
        if (d2 > 0.0) {
          float sq1 = sqrt(d2);
          ta = max(ta, (-B - sq1) / A);
          tb = min(tb, (-B + sq1) / A);
        } else tb = ta;
      }
      if (tb > ta) {
        // Static interleaved-gradient offset over the whole step: fine,
        // evenly spread grain that bloom hides; no temporal flicker.
        float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        float ds = (tb - ta) / float(plumeN);
        float trans = 1.0;
        vec3 acc = vec3(0.0);
        for (int k = 0; k < PLUME_STEPS; ++k) {
          if (k >= plumeN) break;
          float s = ta + ds * (float(k) + ign);
          vec3 p = ro + rd * s;
          float hy = p.y - y0;
          vec2 axis = vec2(0.08, 0.035) * hy + 0.25 * vec2(sin(hy * 0.35 + 1.0), cos(hy * 0.3));
          float umb = smoothstep(6.5, 12.0, hy);
          float rad = 1.0 + 0.36 * hy + 4.0 * umb;
          float dr = length(p.xz - axis);
          float shape = smoothstep(rad, rad * 0.5, dr) * smoothstep(0.0, 1.2, hy) * (1.0 - smoothstep(11.5, 14.0, hy));
          if (shape <= 0.0) continue;
          float nRaw = mrBillow(p * vec3(0.95 - 0.4 * umb, 0.95, 0.95 - 0.4 * umb) + vec3(gSeedOff, 0.0), TAU * gErPh * 0.5);
          // A lattice value noise breaks the sines' regular holes.
          nRaw += 0.22 * (mrNoise(p.xz * 0.7 + vec2(p.y * 0.45, -p.y * 0.3) + gSeedOff) - 0.5);
          float dens = smoothstep(0.36, 0.8, nRaw) * shape * 3.0 * plumeAmt;
          // Lit from below: the fountain's light decays with height, but
          // the umbrella's underside still catches it; the top stays dark.
          float under = exp(-hy / (4.5 + 2.0 * gForce)) * (0.55 + 0.45 * smoothstep(rad, rad * 0.3, dr))
                      + 0.35 * umb * (1.0 - smoothstep(0.0, 2.5, hy - 7.5 - 2.0 * umb)) * smoothstep(rad * 0.2, rad * 0.8, dr);
          vec3 lightC = glowCol * (1.5 * under * (0.6 + 0.4 * gForce) * (1.0 + 0.35 * u_rhythm.z)) + mix(u_secondary, vec3(1.0), 0.2) * 0.02 + hazeCol * 1.5;
          // Thin billow edges catch the light; dense cores stay dark ash.
          lightC *= mix(1.35, 0.15, smoothstep(0.48, 0.92, nRaw));
          float a = 1.0 - exp(-dens * ds * 2.0);
          acc += trans * a * lightC;
          trans *= 1.0 - a;
          if (trans < 0.02) break;
        }
        col = acc + trans * col;
      }
    }
  }

  // ------------------------------------------------------------ fountain
  vec3 add = vec3(0.0);
  if (gErupt > 0.01) {
    if (seesCurtain) {
      // A dense white-hot root that tears apart into spray: the molten
      // column only reaches 40% of the fountain height and thins upward.
      float coreH = gFountH * 0.42;
      vec3 cs = mrRaySeg(ro, rd, gVent, gVent + vec3(0.0, coreH, 0.0));
      if (cs.y < t + 0.2 && cs.x < 2.5) {
        vec3 q = ro + rd * cs.y;
        float hy = cs.z;
        float billow = mrBillow(q * 2.1, TAU * gErPh);
        float width = (1.05 - 0.85 * hy) * (0.55 + 0.85 * billow) * (0.75 + 0.25 * gForce);
        width *= 1.0 + 0.13 * sin(hy * 39.0 - TAU * gErPh * 3.0 + q.x * 4.0);
        float aa = max(0.035, gPix * cs.y * 1.5);
        float liquid = 1.0 - smoothstep(width - aa, width + aa, cs.x);
        float core = 1.0 - smoothstep(width * 0.05, width * 0.4, cs.x);
        float skin = smoothstep(0.53, 0.82, billow);
        float T = 0.96 - 0.15 * hy + 0.1 * billow - 0.18 * skin;
        add += (mrHeat(T) + mrHeat(1.5 - 0.2 * hy) * core * (0.65 + 0.3 * billow)) * liquid * gErupt;
        add += mrHeat(0.94) * exp(-sq(cs.x / (width * 1.6 + 0.2))) * gErupt * 0.22 * (1.0 - smoothstep(2.1, 2.5, cs.x));
      }
      // Spray: four coaxial cones of incandescent droplets, each a lattice
      // of streaks on its surface (angle × height) moving with the eruption
      // clock. Inner cones rise and widen; outer cones are the falling
      // umbrella, widest at the lake. Front and back sides of every cone
      // give parallax, so the fan reads as a volume of spray.
      vec2 oc = ro.xz - gVent.xz;
      float A = dot(rd.xz, rd.xz), B = dot(oc, rd.xz), C0 = dot(oc, oc);
      float occupancy = mix(0.32, 0.8, gLevel) * (1.0 + 0.4 * u_rhythm.z);
      float fs = 0.7 + 0.35 * gForce;
      for (int i = 0; i < SHELLS; ++i) {
        float fi = float(i);
        bool fall = i >= 2;
        float top = gFountH * (fall ? 0.97 - 0.1 * (fi - 2.0) : 0.86 + 0.1 * fi);
        float bottom = fall ? 0.0 : gFountH * (0.1 + 0.12 * fi);
        // Paraboloids rho² = r0² + c·|y − yRef|: a droplet leaving the crown
        // with horizontal speed u has fallen Δy = g ρ² / (2u²), so the
        // falling umbrella widens like √Δy; the rising core opens likewise.
        float sgn = fall ? -1.0 : 1.0;
        float r0 = (fall ? 0.6 + 0.4 * (fi - 2.0) : 0.2 + 0.2 * fi) * fs;
        float r1 = (fall ? 3.2 + 1.4 * (fi - 2.0) : 0.9 + 0.7 * fi) * fs;
        float c = (r1 * r1 - r0 * r0) / max(top - bottom, 0.5);
        float yRef = gVent.y + (fall ? top : 0.0);
        float qa = A, qb = B - 0.5 * c * sgn * rd.y, qc = C0 - r0 * r0 - c * sgn * (ro.y - yRef);
        float disc = qb * qb - qa * qc;
        if (disc <= 0.0 || qa < 1e-5) continue;
        float sq0 = sqrt(disc);
        float rhoMid = sqrt(0.5 * (r0 * r0 + r1 * r1));
        float nCells = max(floor(TAU * rhoMid / 0.15), 6.0);
        float speed = fall ? -26.0 : 38.0;
        for (int side = 0; side < 2; ++side) {
          float ts = (-qb + (side == 0 ? -sq0 : sq0)) / qa;
          if (ts <= 0.0 || ts > t) continue;
          vec3 q = ro + rd * ts;
          float hy = q.y - gVent.y;
          if (hy < bottom - 0.5 || hy > top + 0.5) continue;
          vec2 rel = q.xz - gVent.xz;
          float u = (atan(rel.y, rel.x) / TAU + 0.5) * nCells;
          float column = mod(floor(u), nCells);
          float v = hy / 0.9 - speed * gErPh + 7.0 * mrH2(vec2(column, fi + 0.5) + gSeedOff);
          vec3 h = mrH3(vec3(column, floor(v), fi * 7.0 + 1.3) + vec3(gSeedOff, 0.0));
          if (h.x > occupancy) continue;
          float rho = length(rel);
          float du = (fract(u) - (0.2 + 0.6 * h.y)) * TAU * rho / nCells;
          // Motion blur: a streak along the flight, bright at its head.
          float dv = fract(v) - 0.2 - 0.6 * h.z;
          float along = fall ? -dv : dv;
          float tailF = smoothstep(-0.6, 0.0, along);
          float streak = tailF * tailF * (1.0 - smoothstep(0.0, 0.04, along));
          float wd = (0.012 + 0.016 * h.z) * (0.4 + 0.6 * tailF);
          float sig = max(wd, gPix * ts * 1.2);
          float drop = exp(-sq(du / sig)) * (wd / sig) * streak;
          float env = smoothstep(bottom - 0.5, bottom + 1.0, hy) * (1.0 - smoothstep(top - 1.6, top + 0.5, hy));
          float T = (fall ? 0.8 - 0.14 * (1.0 - hy / max(top, 1.0)) : 1.06 - 0.2 * hy / max(gFountH, 1.0)) - 0.04 * fi + 0.12 * h.y;
          add += mrHeat(T) * drop * env * gErupt * (side == 0 ? 1.0 : 0.55) * 1.9;
        }
      }
    }

    // Ejecta (see mrLaunch). With the precompute pass each bomb's bounding
    // sphere is one texel, so most bombs cost one fetch and a distance.
#ifdef PRECOMPUTED
    // Group spheres (texels BOMB_CAP, BOMB_CAP + 1) hold every flying big
    // bomb and every spray droplet: one test skips a whole group.
    vec4 gBig = texelFetch(u_precomputed, ivec2(BOMB_CAP, 0), 0);
    vec4 gSpray = texelFetch(u_precomputed, ivec2(BOMB_CAP + 1, 0), 0);
    float tgb = max(dot(gBig.xyz - ro, rd), 0.0), tgs = max(dot(gSpray.xyz - ro, rd), 0.0);
    bool anyBig = gBig.w > 0.0 && length(ro + rd * tgb - gBig.xyz) < gBig.w + 4.0 * max(0.085, gPix * tgb * 1.2);
    bool anySpray = gSpray.w > 0.0 && length(ro + rd * tgs - gSpray.xyz) < gSpray.w + 4.0 * max(0.085, gPix * tgs * 1.2);
#endif
    for (int i = 0; i < BOMB_CAP; ++i) {
#ifdef PRECOMPUTED
      if (i < BIG_CAP ? !anyBig : !anySpray) continue;
      vec4 bb = texelFetch(u_precomputed, ivec2(i, 0), 0);
      if (bb.w < 0.0) continue;
      float tb = max(dot(bb.xyz - ro, rd), 0.0);
      if (length(ro + rd * tb - bb.xyz) > bb.w + 4.0 * max(0.085, gPix * tb * 1.2)) continue;
#endif
      vec3 p0, v0;
      float tt, tf, on;
      bool big;
      if (!mrLaunch(i, p0, v0, tt, tf, on, big)) continue;
#ifndef PRECOMPUTED
      vec4 bb = mrBombBound(p0, v0, tt, tf, big);
      float tb = max(dot(bb.xyz - ro, rd), 0.0);
      if (length(ro + rd * tb - bb.xyz) > bb.w + 4.0 * max(0.085, gPix * tb * 1.2)) continue;
#endif
      if (tt >= tf) {
        // Landing flare: a local splash of heat that spreads and cools.
        vec3 lp = mrBomb(p0, v0, tf);
        float a = (tt - tf) / FLARE;
        float tq = dot(lp - ro, rd);
        float d = length(ro + rd * tq - lp);
        float sigF = max(0.12 + 0.55 * a, gPix * tq * 1.5);
        float f = exp(-sq(d / sigF)) * sq(1.0 - a) * 1.6;
        add += mrHeat(1.12 - 0.35 * a) * f * on * step(tq, t + 0.8) * (1.0 + 0.6 * u_rhythm.z);
        continue;
      }
      float size = big ? 0.09 : 0.04;
      float trail = mrTrail(big);
      vec3 h0 = mrBomb(p0, v0, tt);
      float life = tt / tf;
      float T = (big ? 1.14 : 1.04) - 0.3 * life;
      float fade = smoothstep(0.0, 0.05, tt) * (big ? 1.0 : 1.0 - smoothstep(0.82, 1.0, life)) * on;
      // Head: distance from the ray to the bomb.
      float tq = dot(h0 - ro, rd);
      float sigH = max(size, gPix * tq * 1.2);
      float head = exp(-sq(length(ro + rd * tq - h0) / sigH)) * sq(size / sigH) * 2.5 * step(tq, t + 0.05);
      vec3 glow = mrHeat(T) * head;
      // Large tails follow one exact parabola: the head can already be
      // falling while the cooling ember wake still curves over the apex.
      vec3 sg;
      if (big) sg = mrRayArc(ro, rd, p0, v0, max(tt - 3.0 * trail, 0.0), tt);
      else {
        // Fine short spray retains two cheap chords (each deviates from
        // its parabola by <= .009 world units), not the long-arc solver.
        vec3 mid = mrBomb(p0, v0, max(tt - trail, 0.0));
        vec3 tailP = mrBomb(p0, v0, max(tt - 2.0 * trail, 0.0));
        vec3 s0 = mrRaySeg(ro, rd, tailP, mid), s1 = mrRaySeg(ro, rd, mid, h0);
        s0.z *= 0.5; s1.z = 0.5 + 0.5 * s1.z;
        sg = s0.x < s1.x ? s0 : s1;
      }
      float sw = size * mix(0.22, 0.82, sg.z);
      float sig = max(sw, gPix * sg.y * 1.2);
      float tail = exp(-sq(sg.x / sig)) * (sw / sig) * smoothstep(0.0, 0.65, sg.z);
      glow += mrHeat(min(T, 1.0) - 0.3 * (1.0 - sg.z)) * tail * 0.9 * step(sg.y, t + 0.05);
      add += glow * fade * (1.0 + 0.6 * u_rhythm.z);
    }
  }

  // ------------------------------------------------------------ embers
  // A 3D cell DDA along the ray: each visited cell may hold one ember that
  // rises through it (fading at the cell faces), so no ember ever pops.
  float emberAmt = smoothstep(0.3, 1.1, dev) * (0.25 + 0.75 * gEmbers) * (0.15 + 0.85 * level + 0.3 * u_rhythm.z);
  if (emberAmt > 0.01) {
    const float CE = 2.2;
    float baseY = gVent.y - 0.9;
    // Start where the ray enters the ember layer (cells below baseY + 3.5).
    float emberTop = mix(baseY + 3.5, ro.y + 2.5, gErupt);
    float bandTop = (floor(emberTop / CE) + 1.0) * CE;
    float tc = rd.y < 0.0 ? max((ro.y - bandTop) / -rd.y, 0.0) : 0.0;
    vec3 ps = ro + rd * tc;
    vec3 pe = ps / CE;
    vec3 cell = floor(pe);
    vec3 stepv = sign(rd);
    vec3 inv = 1.0 / max(abs(rd), vec3(1e-5));
    vec3 tNext = tc + abs(((cell + max(stepv, 0.0)) - pe) * stepv * inv * CE);
    vec3 tDelta = inv * CE;
    float tEnd = min(t, 17.0);
    for (int k = 0; k < EMBER_CAP; ++k) {
      if (tc > tEnd) break;
      vec3 c = cell * CE;
      if (c.y >= baseY - CE && c.y < emberTop) {
        vec3 h0 = mrH3(cell + vec3(gSeedOff, 0.0) + 0.5);
        float r = length(c.xz);
        float dens = emberAmt * mix(0.25 + 0.25 * gErupt, 1.0, exp(-r * r / 110.0)) * (1.0 + 0.3 * gErupt);
        // One ember per cell, rising through it (faded at the cell faces)
        // and shaded only by rays that pass close to it.
        vec3 h = h0;
        if (h.x < dens) {
          float ph = fract(h.y * 7.31 + gErPh * (0.5 + floor(h.z * 2.0) * 0.25));
          vec3 pos = c + CE * vec3(0.2 + 0.6 * h.z, ph, 0.2 + 0.6 * fract(h.y * 3.7));
          // Wind carries nearby embers outward, toward the circling camera.
          pos.xz += (0.08 + 0.5 * gErupt) * sin(TAU * ph) * normalize(c.xz + vec2(0.01));
          float tq = max(dot(pos - ro, rd), 0.0);
          float d = length(ro + rd * tq - pos);
          float size = mix(0.016, 0.03, gErupt);
          float sig = max(size, gPix * tq * 1.3);
          if (d < 3.5 * sig && tq < t) {
            float env = sq(sin(PI * ph));
            float T = 0.95 - 0.3 * ph + 0.15 * h.x;
            add += mrHeat(T) * exp(-sq(d / sig)) * sq(size / sig) * env * 2.8;
          }
        }
      }
      // Advance to the next cell.
      if (tNext.x < tNext.y && tNext.x < tNext.z) { tc = tNext.x; tNext.x += tDelta.x; cell.x += stepv.x; }
      else if (tNext.y < tNext.z) { tc = tNext.y; tNext.y += tDelta.y; cell.y += stepv.y; }
      else { tc = tNext.z; tNext.z += tDelta.z; cell.z += stepv.z; }
    }
  }

  col += add;
  outColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

// Per-frame data: row 0 holds ejecta spheres and the drainage-tree curves;
// rows 1..128 cache the seed-only plate hashes and tree samples for cells
// [-64, 63]². Same arithmetic as the fallback.
// No colour image, geometry approximation or temporal cache is involved.
const precompute = `${common}
void main() {
  mrSetup();
  int i = int(gl_FragCoord.x);
  if (gl_FragCoord.y > 129.0) {
    // Second tile: the channel frame at each lattice corner.
    vec2 c = floor(gl_FragCoord.xy) - vec2(64.0, 193.0);
    outColor = mrChannel(c * gS);
    return;
  }
  if (gl_FragCoord.y > 1.0) {
    vec2 c = floor(gl_FragCoord.xy) - vec2(64.0, 65.0);
    outColor = mrCellCalc(c);
    return;
  }
  if (i >= CURVE_TEXEL && i < CURVE_TEXEL + 3 * CURVES) {
    vec4 od, m;
    vec2 sw;
    mrCurveCalc((i - CURVE_TEXEL) / 3, od, m, sw);
    int part = (i - CURVE_TEXEL) % 3;
    outColor = part == 0 ? od : part == 1 ? m : vec4(sw, 0.0, 1.0);
    return;
  }
  if (i >= BOMB_CAP + 2) { outColor = vec4(0.0, 0.0, 0.0, -1.0); return; }
  vec3 p0, v0;
  float tt, tf, on;
  bool big;
  if (i < BOMB_CAP) {
    if (!mrLaunch(i, p0, v0, tt, tf, on, big)) { outColor = vec4(0.0, 0.0, 0.0, -1.0); return; }
    outColor = mrBombBound(p0, v0, tt, tf, big);
    return;
  }
  // Group sphere: centre of the flying bombs' box, radius to the farthest
  // bomb sphere.
  bool wantBig = i == BOMB_CAP;
  vec3 lo = vec3(1e9), hi = vec3(-1e9);
  for (int k = 0; k < BOMB_CAP; ++k) {
    if ((k < BIG_CAP) != wantBig) continue;
    if (!mrLaunch(k, p0, v0, tt, tf, on, big)) continue;
    vec4 b = mrBombBound(p0, v0, tt, tf, big);
    lo = min(lo, b.xyz - b.w);
    hi = max(hi, b.xyz + b.w);
  }
  if (lo.x > hi.x) { outColor = vec4(0.0, 0.0, 0.0, -1.0); return; }
  outColor = vec4(0.5 * (lo + hi), 0.5 * length(hi - lo));
}
`;

export default {
  id: "magma",
  number: 104,
  name: "Magma Rift",
  description:
    "A volcanic field raymarched as one continuous world: a seed-only drainage tree picks which seams of a Voronoi basalt crust glow, opens them into braided lava rivers with streaming crust skins and leads them to the vent, which founders into a crusted lava lake. Its fountain throws incandescent spray and ballistic bombs that flare where they land, under an ash umbrella lit from below. Colour is temperature on the palette. Energy raises flow, spray, ejecta and embers.",
  development: "development",
  schema,
  presets,
  stage: ["flow", "embers", "fountain"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    flow: { mul: [0.65, 1.45] },
    embers: [-0.25, 0.3],
    orbit: { mul: [0.75, 1.4] },
  },
  beat: { punch: 0.25, pulse: 0.3 },
  audio: [
    { param: "embers", feature: "high", amount: 0.1 },
    { param: "flow", feature: "mid", amount: 0.08 },
  ],
  rhythm: [
    familyEffect(
      "seam-pulse",
      0,
      "Seam pulse",
      "A ring of heat runs outward from the vent through every plate seam.",
      { period: 4, strength: 0.6, duration: 1 },
    ),
    familyEffect(
      "lava-surge",
      1,
      "Lava surge",
      "Fresh lava surges through the rivers; the crust skins thin and glow.",
      { period: 8, strength: 0.6, duration: 1.5 },
    ),
    familyEffect(
      "ejecta-volley",
      2,
      "Ejecta volley",
      "The fountain surges and the ejecta flare; embers burst from the field.",
      { period: 16, strength: 0.7, duration: 2 },
    ),
  ],
  fragment,
  precompute: { fragment: precompute, size: [128, 257] },
  clocks: [
    { rate: orbitRate, period: 2 * Math.PI },
    { rate: flowRate, period: 16 },
    { rate: eruptRate, period: 64 },
  ],
};
