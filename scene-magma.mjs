import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// Magma Rift (#104): a volcanic field raymarched as one continuous world.
// The ground is a crust of basalt plates: a jittered Voronoi tessellation
// whose exact seams (distance to the nearest bisector, found in one cached
// 3×3 search) become cracks, then lava rivers, then the shore of a lava
// lake into which the central plates sink one by one. Development widens
// the seams (Crust → Rivers) and opens the lake with a fountain that throws
// ejecta on exact ballistic parabolas under an ash plume lit from below
// (→ Eruption). Plate identity (site, height, tilt, rift) is a function of
// the seed only; development never moves a site. Light is temperature: the
// emission ramp runs dark → palette dark field → primary → accent → near
// white, so every library palette is a different "lava".

export const PLATE_JITTER = 0.8; // sites in [0.1, 0.9] of their cell: 3×3 search is exact
export const GRAVITY = 7.0; // world units / s²
export const CYCLE_SECONDS = 3.4; // physical seconds of one ejecta cycle
export const BOMB_CAP = 24;

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
const orbitRate = (p) => p[5] * 0.045; // rad/s, period 2π
const flowRate = (p) => p[1] * 0.18; // flow-layer cycles/s, period 16
const eruptRate = (p, level) =>
  (0.8 + 0.45 * Math.min(1, Math.max(0, level))) / CYCLE_SECONDS; // cycles/s, period 64

const fragment = `${lateClockGlsl}
const int MARCH_CAP = 110;
const int DETAIL_CAP = 14;
const int BOMB_CAP = ${BOMB_CAP};
const int EMBER_CAP = 20;
const int PLUME_STEPS = 14;
const float JIT = ${PLATE_JITTER.toFixed(2)};
const float G_ACC = ${GRAVITY.toFixed(1)};
const float CYCLE = ${CYCLE_SECONDS.toFixed(1)};

// Per-frame constants, assigned once in main().
float gDev, gSplit, gLakeAmt, gErupt, gLevel, gHeat, gS, gFlow, gErPh, gOrbit;
float gSeamW, gLavaT, gLakeR, gFountH, gForce, gPix, gEmbers;
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
float mrNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
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
  vec3 c = mix(u_secondary * 0.75, u_primary, smoothstep(0.25, 0.68, T));
  c = mix(c, u_accent, smoothstep(0.8, 1.0, T));
  c = mix(c, vec3(1.0), 0.8 * smoothstep(1.02, 1.4, T));
  return c * (2.2 * T * T * T + 0.04 * T);
}

// ------------------------------------------------------------------ plates
// Site of plate cell c, inside [0.5 - JIT/2, 0.5 + JIT/2]² of the cell,
// and the plate's rift tendency (a seam's width grows with both rifts).
vec3 mrSite(vec2 c) {
  vec2 h = vec2(mrH2(c + gSeedOff), mrH2(c + gSeedOff + vec2(57.3, 113.1)));
  return vec3(0.5 + JIT * (h - 0.5), fract(h.x * 13.17 + h.y * 7.31));
}

struct Plate {
  vec2 cellA;   // nearest site's cell (plate identity)
  vec2 siteA;   // nearest site in plate (cell) units, absolute
  vec2 siteB;   // site across the governing seam
  float gap;    // signed distance to the seam band edge (negative inside)
  float border; // exact distance to the nearest Voronoi border
  float width;  // half-width of the governing seam
  float rift;   // rift sum of the governing seam (0..2)
};

// Cached 3×3 Voronoi: one pass finds the nearest site, a second takes the
// minimum bisector distance over the same cached sites, which is the exact
// distance to the cell boundary (CPU test: tests/magma.test.mjs).
// River network in world units: K = 5 meandering channels radiate from the
// vent (seed-rotated), with K = 8 distributaries farther out. The distance
// to the nearest channel line comes from cos Kθ without atan:
// r·sin|Δθ| ≈ (2r/K)·|sin(Kθ/2)| = (2r/K)·√((1 − cos Kθ)/2).
float mrRiver(vec2 m) {
  m += 0.9 * vec2(sin(0.33 * m.y + 1.0), sin(0.29 * m.x + 2.0));
  float r = length(m);
  vec2 d = m / max(r, 1e-4);
  d = vec2(d.x * gRot.x - d.y * gRot.y, d.x * gRot.y + d.y * gRot.x);
  vec2 z2 = vec2(d.x * d.x - d.y * d.y, 2.0 * d.x * d.y);
  vec2 z4 = vec2(z2.x * z2.x - z2.y * z2.y, 2.0 * z2.x * z2.y);
  float c5 = z4.x * d.x - z4.y * d.y;
  float c8 = z4.x * z4.x - z4.y * z4.y;
  float d5 = 0.4 * r * sqrt(max(0.5 - 0.5 * c5, 0.0));
  float d8 = 0.25 * r * sqrt(max(0.5 + 0.5 * c8, 0.0));
  float main = 1.0 - smoothstep(0.25, 1.0, d5);
  float branch = (1.0 - smoothstep(0.2, 0.75, d8)) * smoothstep(5.5, 9.5, r) * 0.7;
  return max(main, branch) * smoothstep(0.8, 2.0, r);
}

Plate mrPlates(vec2 q, float wScale) {
  vec2 ic = floor(q), f = q - ic;
  vec2 r[9];
  float rf[9];
  float best = 1e9;
  int bi = 4;
  for (int k = 0; k < 9; ++k) {
    vec2 o = vec2(float(k % 3) - 1.0, float(k / 3) - 1.0);
    vec3 st = mrSite(ic + o);
    r[k] = o + st.xy - f;
    rf[k] = st.z;
    float d = dot(r[k], r[k]);
    if (d < best) { best = d; bi = k; }
  }
  vec2 mr = r[bi];
  float border = 1e9;
  int gi = bi;
  for (int k = 0; k < 9; ++k) {
    if (k == bi) continue;
    vec2 dr = r[k] - mr;
    float b = dot(0.5 * (mr + r[k]), dr) * inversesqrt(max(dot(dr, dr), 1e-8));
    if (b < border) { border = b; gi = k; }
  }
  // Seam half-width is a smooth field (wide along the river channels), so
  // the band edge border − width is continuous across every seam.
  float width = wScale * (0.22 + 3.0 * mrRiver(q * gS));
  vec2 oA = vec2(float(bi % 3) - 1.0, float(bi / 3) - 1.0);
  Plate P;
  P.cellA = ic + oA;
  P.siteA = q + mr;
  P.siteB = q + r[gi];
  P.gap = border - width;
  P.border = border;
  P.width = width;
  P.rift = rf[bi] + rf[gi];
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
const float TOP_BOUND = 0.2;

// Lava level above the base: deep in cracks, near the plate tops in the
// rivers, and the lake surface around the vent.
float mrLakeMask(float r) { return 1.0 - smoothstep(gLakeR - 0.6, gLakeR + 0.9, r); }
float mrLavaLevel(float r, float w) {
  float flood = gSplit * smoothstep(0.012, 0.06, w);
  return mix(mix(-0.08, 0.055, flood), 0.075, mrLakeMask(r) * gLakeAmt);
}

// Full height: rock (plate slab with rounded edges, grooves at the seams,
// plates sunk inside the lake) and the lava level; h = max(rock, lava).
float mrRock(vec2 x, Plate P, float base, float mask) {
  float id = mrH2(P.cellA + gSeedOff + vec2(5.3, 9.1));
  vec2 tilt = (vec2(mrH2(P.cellA + gSeedOff + vec2(2.9, 4.4)), id) - 0.5) * 0.09;
  vec2 rel = (x / gS - P.siteA);
  float top = 0.1 + 0.05 * (id - 0.5) + dot(tilt, rel) * gS;
  // Plates whose site lies inside the lake sink as a whole.
  float sr = length(P.siteA * gS);
  float sink = smoothstep(gLakeR + 0.3, gLakeR - 1.6, sr) * gLakeAmt;
  top -= 0.32 * sink;
  // Rounded edge toward the seam, then the groove.
  float e = clamp(P.gap / (0.1 + 0.4 * P.width), 0.0, 1.0);
  top -= 0.075 * sq(1.0 - e);
  float wall = smoothstep(-0.35 * P.width - 0.01, 0.0, P.gap);
  float rock = mix(-0.17, top, wall);
  return base + mask * rock;
}
float mrHeight(vec2 x) {
  float base = mrBase(x);
  float r = length(x);
  float mask = mrPlateMask(r);
  if (mask <= 0.0) return base;
  Plate P = mrPlates(x / gS, gSeamW);
  return max(mrRock(x, P, base, mask), base + mask * mrLavaLevel(r, P.width));
}
// Coarse bound for the first march: plate tops ignored seams.
float mrBound(vec2 x) { return mrBase(x) + TOP_BOUND * mrPlateMask(length(x)); }

// ------------------------------------------------------------------ lava
// Lava streams radially away from the vent. In polar material coordinates
// (r, θ) the flow is a constant shift in r: two layers, reseeded at zero
// weight with a counter id (mod 16), stream forever without shear. The
// lattice is periodic in θ (96 cells around), so there is no seam at ±π.
float mrFlowNoise(float r, float th, float salt) {
  float sum = 0.0, wsum = 0.0;
  for (int k = 0; k < 2; ++k) {
    float ph = gFlow + 0.5 * float(k);
    float tau = fract(ph);
    float id = mod(floor(ph), 16.0);
    float w = 1.0 - abs(2.0 * tau - 1.0);
    float o = mrH2(vec2(id, salt + 3.0)) * 97.0;
    vec2 pp = vec2(r * 1.5 - tau * 2.4 + o, th * (96.0 / TAU));
    float n = 0.55 * mrNoiseP(pp, 96.0) + 0.3 * mrNoiseP(vec2(pp.x * 2.0 + 5.1, pp.y * 2.0), 192.0)
            + 0.15 * mrNoiseP(vec2(pp.x * 4.0 + 1.7, pp.y * 4.0), 384.0);
    sum += w * (n - 0.5);
    wsum += w * w;
  }
  return 0.5 + sum / sqrt(max(wsum, 1e-3));
}

// ------------------------------------------------------------------ helpers
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

// Cheap billow for the ash plume (domain-warped sines, no lattice).
float mrBillow(vec3 p) {
  float n = sin(p.x * 1.7 + sin(p.z * 1.3 + p.y * 0.9)) * sin(p.z * 1.5 + sin(p.y * 1.4 + p.x * 0.7));
  n += 0.6 * sin(p.y * 1.9 + sin(p.x * 2.3 - p.z * 1.1) * 1.4) * sin(p.x * 2.1 + p.z * 1.7);
  n += 0.3 * sin(p.x * 4.1 + p.y * 3.3 + sin(p.z * 3.7));
  return 0.5 + 0.28 * n;
}

void main() {
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
  gLakeR = 4.4 * gLakeAmt;
  gLavaT = mix(0.52, 0.74, gSplit) + 0.1 * gErupt + 0.12 * (gHeat - 0.5);

#ifdef PHOSPHOR_LATE
  gOrbit = u_clock[0];
  gFlow = u_clock[1];
  gErPh = u_clock[2];
#else
  gOrbit = u_time * (u_params[5] * 0.045);
  gFlow = u_time * (u_params[1] * 0.18);
  gErPh = u_time * ((0.8 + 0.45 * clamp(u_level, 0.0, 1.0)) / ${CYCLE_SECONDS.toFixed(1)});
#endif
  float ventBase = mrBase(vec2(0.0));
  gVent = vec3(0.0, ventBase + 0.075, 0.0);
  float kick = u_kick * smoothstep(0.15, 1.0, level);
  gFountH = (1.0 + 2.6 * gForce) * gErupt * (1.0 + 0.35 * u_rhythm.z + 0.06 * kick);

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
  float R = mix(8.6, 9.8, gErupt) * (1.0 + 0.05 * wob) + 1.2 * camH;
  vec3 ro = vec3(R * cos(az), 0.0, R * sin(az));
  ro.y = mrBase(ro.xz) + mix(2.2, 6.6, camH) + 0.9 * gErupt + 0.15 * wob;
  vec3 target = vec3(0.0, gVent.y - mix(0.9, 1.6, camH) + 2.2 * gErupt, 0.0);
  // Keep the vent a little off-centre, alternating slowly.
  vec3 fw0 = normalize(target - ro);
  vec3 side = normalize(cross(fw0, vec3(0.0, 1.0, 0.0)));
  target += side * 0.9 * sin(az + 0.7);
  vec3 fw = normalize(target - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  float focal = 1.55 * (1.0 + 0.02 * kick);
  vec2 uv = rot2(0.03 * sin(az * 2.0)) * (aspectUV() * 2.0);
  vec3 rd = normalize(fw * focal + rt * uv.x + up * uv.y);
  gPix = 2.0 / (focal * u_resolution.y);

  // ------------------------------------------------------------ march
  // 1) Coarse march against the plate-top bound (Lipschitz step with a
  //    slope bound that grows toward the caldera wall), bisection refine.
  float t = 0.05, tPrev = 0.0;
  float tMax = 75.0;
  bool hit = false;
  int limit = int(min(float(MARCH_CAP), 1.15 * u_raySteps));
  for (int i = 0; i < MARCH_CAP; ++i) {
    if (i >= limit) break;
    vec3 p = ro + rd * t;
    float r = length(p.xz);
    float gap = p.y - mrBound(p.xz);
    if (gap < 0.0) { hit = true; break; }
    if (p.y > 16.0 && rd.y > 0.0) break;
    float slope = 0.22 + 2.2 * smoothstep(15.0, 21.0, r);
    tPrev = t;
    t += clamp(gap / (max(-rd.y, 0.0) + slope), 0.004 + 0.002 * t, 2.2 + 0.04 * t);
    if (t > tMax) break;
  }
  if (hit) {
    float a = tPrev, b = t;
    for (int k = 0; k < 6; ++k) {
      float m = 0.5 * (a + b);
      vec3 p = ro + rd * m;
      if (p.y < mrBound(p.xz)) b = m; else a = m;
    }
    t = b;
    // 2) Detail march with the full plate field from the bound surface.
    vec3 p0 = ro + rd * a;
    if (a < 26.0 && mrPlateMask(length(p0.xz)) > 0.0) {
      float s = a, sPrev = a;
      bool found = false;
      for (int k = 0; k < DETAIL_CAP; ++k) {
        vec3 p = ro + rd * s;
        float g = p.y - mrHeight(p.xz);
        if (g < 0.0) { found = true; break; }
        sPrev = s;
        s += max(g / (max(-rd.y, 0.0) + 0.55), 0.004 + 0.0015 * s);
      }
      if (found) {
        float lo = sPrev, hi = s;
        for (int k = 0; k < 4; ++k) {
          float m = 0.5 * (lo + hi);
          vec3 p = ro + rd * m;
          if (p.y < mrHeight(p.xz)) hi = m; else lo = m;
        }
        t = hi;
      } else {
        t = s;
      }
    }
  }

  // ------------------------------------------------------------ shading
  vec3 col = vec3(0.0);
  vec3 P = ro + rd * t;
  float fp = gPix * t / max(abs(rd.y), 0.12) / gS; // ground footprint in cells
  // Light of the lake and fountain (point light above the vent).
  float lakeGlow = gLakeAmt * (0.55 + 0.45 * gErupt);
  vec3 lightP = gVent + vec3(0.0, 0.6 + 0.35 * gFountH, 0.0);
  float fountainLight = (0.5 * lakeGlow + 1.1 * gErupt * (0.6 + 0.4 * gForce)) * (1.0 + 0.12 * kick);
  vec3 glowCol = mrHeat(0.72);
  // Overall glow of the lava field, which lights the haze, wall and clouds.
  float fieldGlow = 0.12 + 0.55 * gSplit + 0.9 * lakeGlow + 0.6 * gErupt;
  vec3 hazeCol = mrHeat(0.62) * 0.018 * fieldGlow + u_secondary * 0.004;
  float fog = 0.0;

  if (hit) {
    vec2 x = P.xz;
    float r = length(x);
    float base = mrBase(x);
    float mask = mrPlateMask(r);
    Plate Pl = mrPlates(x / gS, gSeamW);
    float rock = mrRock(x, Pl, base, mask);
    float lavaY = base + mask * mrLavaLevel(r, Pl.width);
    bool lava = lavaY >= rock && mask > 0.0;

    // Base gradient (finite differences of the cheap base).
    float e = 0.02;
    vec2 gb = vec2(mrBase(x + vec2(e, 0.0)) - mrBase(x - vec2(e, 0.0)),
                   mrBase(x + vec2(0.0, e)) - mrBase(x - vec2(0.0, e))) / (2.0 * e);

    // Normal across the nearest seam, toward the neighbouring plate.
    vec2 sn = normalize(Pl.siteB - Pl.siteA + 1e-6);
    float lakeM = mrLakeMask(r) * gLakeAmt * mask;
    float vent = exp(-r * r / 50.0);
    // Breathing: slow waves of heat travel outward through the seams.
    float breathe = 0.5 + 0.5 * sin(TAU * gFlow - 0.55 * r + 5.0 * mrNoise(x * 0.4));
    // Gesture x: a ring of heat running outward through every seam.
    float ringR = 1.0 + 19.0 * (1.0 - u_rhythm.x);
    float ring = u_rhythm.x * exp(-sq((r - ringR) / 2.2));
    // Gesture y: a surge of fresh lava.
    float surge = u_rhythm.y;
    // Narrow cracks stay cooler than the rivers once the plates split.
    float seamT = gLavaT * (0.86 + 0.28 * vent) * (1.0 - 0.3 * gSplit * (1.0 - smoothstep(0.03, 0.14, Pl.width)));
    seamT += 0.16 * (breathe - 0.5) * (1.0 - 0.6 * gSplit);
    seamT += 0.2 * ring + 0.1 * surge;

#ifdef MR_DEBUG
    vec3 dbgT = vec3(0.0);
#endif
    vec3 N;
    vec3 albedo;
    vec3 emit = vec3(0.0);
    float ao = 1.0;
    float gloss = 0.4;
    if (lava) {
      // Lava: crust skins stream outward along the rivers, with hot seams
      // between them; banks are cooler than the channel centre.
      float th = atan(x.y, x.x);
      float n = mrFlowNoise(r, th, 11.0);
      float skin = smoothstep(0.55 + 0.08 * surge, 0.62, n);
      float crack = exp(-sq((n - 0.555) / 0.02));
      float centre = sqrt(clamp(-Pl.gap / max(Pl.width * 0.8, 1e-3), 0.0, 1.0));
      float T = min(seamT, 0.78) * (0.72 + 0.28 * centre + 0.1 * smoothstep(0.05, 0.2, Pl.width));
      T *= (0.82 + 0.4 * (0.5 - n)) * (1.0 - 0.45 * skin * gSplit);
      T += 0.1 * crack * gSplit * centre;
      if (lakeM > 0.01) {
        // The lake circulates: a rigid slow turn (one turn per 16 flow
        // cycles) carries a finer crust of floes with incandescent cracks.
        float la = TAU * gFlow / 16.0;
        vec2 xr = mat2(cos(la), sin(la), -sin(la), cos(la)) * x;
        Plate Lk = mrPlates(xr * 1.9 + vec2(311.0, 173.0), 0.025);
        float lfp = fp * gS * 1.9;
        float lcrack = 0.03 / max(0.03, lfp) * exp(-max(Lk.gap, 0.0) / max(lfp, 0.02));
        float open = exp(-r * r / (1.5 + 2.0 * gErupt));
        float crust = (1.0 - lcrack) * (1.0 - open) * smoothstep(0.0, 0.1, Lk.border);
        float Tl = (0.7 + 0.1 * (gHeat - 0.5)) * (1.0 - 0.45 * crust) + 0.14 * lcrack + 0.35 * open * gErupt;
        float nl = Lk.border;
        // Sinking plates show as dark rafts just below the lake surface.
        float raft = smoothstep(-0.14, -0.02, rock - lavaY);
        Tl *= 1.0 - 0.45 * raft;
        T = mix(T, Tl, smoothstep(0.0, 0.7, lakeM));
        n = mix(n, nl, lakeM);
      }
      T += 0.18 * ring;
#ifdef MR_DEBUG
      dbgT = vec3(T, skin, n);
#endif
      emit = mrHeat(T) * (0.8 + 0.5 * gHeat);
      N = normalize(vec3(-gb.x + 0.1 * (n - 0.5), 1.0, -gb.y));
      albedo = vec3(0.04);
      gloss = 0.8;
    } else {
      // Basalt plate: slab tilt, rounded edges and ropy surface relief.
      float id = mrH2(Pl.cellA + gSeedOff + vec2(5.3, 9.1));
      vec2 tilt = (vec2(mrH2(Pl.cellA + gSeedOff + vec2(2.9, 4.4)), id) - 0.5) * 0.09;
      float ew = 0.1 + 0.4 * Pl.width;
      float ec = clamp(Pl.gap / ew, 0.0, 1.0);
      // d(rounding)/d(gap) · ∇gap, with ∇gap = -sn / gS (the gap grows
      // away from the seam, i.e. away from the neighbouring site).
      float dEdge = 0.15 * (1.0 - ec) / ew * step(0.0, Pl.gap);
      vec2 grad = gb + mask * (tilt - dEdge * sn / gS);
      // Rope ridges (pahoehoe), faded by footprint.
      float ropeA = TAU * mrH2(Pl.cellA + gSeedOff + vec2(8.1, 1.3));
      vec2 rdir = vec2(cos(ropeA), sin(ropeA));
      float rq = dot(x / gS - Pl.siteA, rdir) * 22.0 + 2.0 * mrNoise(x * 3.0);
      float ropeKeep = 1.0 - smoothstep(0.25, 0.7, fp * 22.0 / TAU * 2.0);
      grad += mask * rdir * cos(rq) * 0.12 * ropeKeep;
      float bump = mrNoise(x * 9.0) - 0.5;
      N = normalize(vec3(-grad.x, 1.0, -grad.y));
      // Groove walls face the seam.
      float wallF = 1.0 - smoothstep(-0.012, 0.004, Pl.gap);
      N = normalize(mix(N, normalize(vec3(sn.x * 0.9, 0.45, sn.y * 0.9)), wallF * mask));
      float tone = 0.7 + 0.3 * id + 0.3 * bump * ropeKeep;
      albedo = (vec3(0.2) + u_secondary * 0.06) * tone;
      // Hot rock: groove walls glow just above the lava.
      float hotWall = (1.0 - smoothstep(0.0, 0.05, rock - lavaY)) * (1.0 - smoothstep(-0.005, 0.03, Pl.gap)) * mask;
      emit = mrHeat(seamT * 0.85) * hotWall * 0.8;
      // The crack as coverage of the pixel footprint (far seams fade
      // smoothly instead of aliasing), plus a soft heat halo on the rims.
      float wEff = max(Pl.width, 0.002);
      float cover = wEff / max(wEff, fp * 1.2) * exp(-max(Pl.gap, 0.0) / max(fp * 1.2, 0.004));
      emit += mrHeat(seamT) * cover * mask;
      emit += mrHeat(seamT * 0.8) * 0.16 * exp(-max(Pl.gap, 0.0) / 0.025) * mask;
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
    }

    // Lighting: a dim cool key (sky), lava light from the nearest seam,
    // the lake/fountain light, field glow from below and a fresnel rim.
    vec3 keyDir = normalize(vec3(-0.45, 0.6, 0.35));
    vec3 keyCol = mix(u_secondary, vec3(1.0), 0.5) * 0.2;
    float diff = max(dot(N, keyDir), 0.0);
    vec3 light = keyCol * (0.3 + diff);
    // Seam light: falls off away from the seam, brightest on faces turned to it.
    vec3 Ls = normalize(vec3(sn.x, -0.2, sn.y));
    float seamFall = exp(-max(Pl.gap, 0.0) * gS / (0.05 + 0.45 * Pl.width * gS));
    light += mrHeat(seamT) * 0.7 * seamFall * (0.25 + 0.75 * max(dot(N, Ls), 0.0)) * mask;
    // Field glow: the lit haze and the whole lava field seen from the wall.
    vec3 Lf = normalize(vec3(-x / max(r, 1e-3), 0.25));
    light += mrHeat(0.62) * 0.1 * fieldGlow * (0.2 + max(dot(N, Lf), 0.0)) * (0.3 + 1.7 * (1.0 - mask));
    // Lake / fountain light.
    vec3 Lp = lightP - P;
    float dl = length(Lp);
    Lp /= dl;
    float lambert = max(dot(N, Lp), 0.0);
    light += glowCol * fountainLight * (lambert + 0.1) * (2.0 + 0.6 * gLakeR) / (1.0 + 0.3 * dl * dl);
    // Glassy sheen toward the lake light and the haze.
    vec3 H = normalize(Lp - rd);
    float spec = pow(max(dot(N, H), 0.0), 30.0) * gloss;
    vec3 sheen = glowCol * fountainLight * spec * 2.0 / (1.0 + 0.2 * dl * dl);
    float fres = pow(1.0 - max(dot(N, -rd), 0.0), 4.0);
    vec3 rim = hazeCol * 3.0 * fres * gloss;
    col = albedo * light * ao + emit + (sheen + rim) * ao;
#ifdef MR_DEBUG
    col = lava ? dbgT : vec3(0.0);
#endif

    fog = 1.0 - exp(-t * 0.017);
    col = mix(col, hazeCol, fog);
  } else {
    t = 80.0;
  }
  if (!hit || P.y > 4.0) {
    // Sky: an ash deck lit from below by the field and the fountain; it
    // gives the caldera wall a silhouette. Near black in the crust state.
    vec3 sky = hazeCol;
    if (rd.y > 0.0) {
      float tc = (24.0 - ro.y) / rd.y;
      vec2 cp = (ro.xz + rd.xz * tc) * 0.055;
      float cn = 0.6 * mrNoise(cp + 3.1) + 0.4 * mrNoise(cp * 2.3 + 7.7);
      float dist = length(ro.xz + rd.xz * tc);
      float below = fieldGlow * (0.35 + 0.65 * exp(-dist * dist / 900.0)) + 2.5 * gErupt * exp(-dist * dist / 160.0);
      vec3 deck = mrHeat(0.6) * 0.06 * below * smoothstep(0.3, 0.75, cn);
      float far = exp(-tc * 0.012);
      sky = mix(hazeCol, deck + u_secondary * 0.003, far);
    }
    if (!hit) col = sky;
  }

  // ------------------------------------------------------------ plume
  // Ash column above the vent, ray-cylinder bounded, lit from below by the
  // fountain. Two drift layers in the eruption phase keep it endless.
  float plumeAmt = gErupt;
  if (plumeAmt > 0.01) {
    float y0 = gVent.y + 0.6, y1 = gVent.y + 15.0;
    float Rc = 6.5;
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
      if (tb > ta) {
        float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        float ds = (tb - ta) / float(PLUME_STEPS);
        float trans = 1.0;
        vec3 acc = vec3(0.0);
        for (int k = 0; k < PLUME_STEPS; ++k) {
          float s = ta + ds * (float(k) + ign);
          vec3 p = ro + rd * s;
          float hy = p.y - y0;
          vec2 axis = vec2(0.16, 0.07) * hy + 0.25 * vec2(sin(hy * 0.35 + 1.0), cos(hy * 0.3));
          float rad = 0.55 + 0.33 * hy;
          float dr = length(p.xz - axis);
          float shape = smoothstep(rad, rad * 0.25, dr) * smoothstep(0.0, 1.2, hy) * (1.0 - smoothstep(10.0, 14.0, hy));
          if (shape <= 0.0) continue;
          float dens = 0.0, wsum = 0.0;
          for (int l = 0; l < 2; ++l) {
            float ph = gErPh * 0.5 + 0.5 * float(l);
            float tau = fract(ph);
            float w = 1.0 - abs(2.0 * tau - 1.0);
            float id = mod(floor(ph), 32.0);
            vec3 o = vec3(mrH2(vec2(id, 4.0)), mrH2(vec2(7.0, id)), mrH2(vec2(id, id + 2.0))) * 30.0;
            dens += w * mrBillow(p * 0.55 - vec3(0.0, tau * 2.4, 0.0) + o);
            wsum += w;
          }
          dens = dens / max(wsum, 1e-3);
          dens = max(dens - 0.32, 0.0) * shape * 1.6 * plumeAmt;
          // Lit from below: the fountain's light decays with height and
          // reaches deeper into the core.
          float under = exp(-hy / (2.2 + 1.2 * gForce)) * (0.6 + 0.4 * smoothstep(rad, 0.0, dr));
          vec3 lightC = glowCol * (0.28 * under * under * (0.6 + 0.4 * gForce) * (1.0 + 0.3 * u_rhythm.z)) + hazeCol * 0.6;
          float a = 1.0 - exp(-dens * ds * 2.2);
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
    vec3 a = gVent, b = gVent + vec3(0.0, gFountH, 0.0);
    vec3 cs = mrRaySeg(ro, rd, a, b);
    if (cs.y < t + 0.2) {
      float hy = cs.z;
      float wcol = 0.12 + 0.28 * hy;
      float sig = max(wcol, gPix * cs.y * 1.5);
      float flick = 0.8 + 0.2 * sin(TAU * (gErPh * 8.0) - hy * 9.0) * sin(TAU * gErPh * 5.0 + hy * 4.0);
      float T = 1.25 - 0.45 * hy;
      add += mrHeat(T) * exp(-sq(cs.x / sig)) * (wcol / sig) * gErupt * flick * 0.55;
      // Wide glow around the base of the fountain.
      add += glowCol * exp(-cs.x / (0.6 + 0.6 * gForce)) * (1.0 - hy) * gErupt * 0.12;
    }

    // Ejecta: BOMB_CAP bombs on staggered cycles; each launch draws new
    // seeded direction and speed. Exact parabolas; head and a two-segment
    // trail, cooling over the flight; hidden behind terrain.
    float nActive = mix(9.0, float(BOMB_CAP), level) * smoothstep(0.0, 0.4, gForce);
    for (int i = 0; i < BOMB_CAP; ++i) {
      float fi = float(i);
      float on = clamp(nActive - fi, 0.0, 1.0);
      if (on <= 0.0) break;
      float u = gErPh + fract(fi * 0.6180339887);
      float tau = fract(u);
      float id = mod(floor(u), 64.0);
      vec3 hb = mrH3(vec3(fi, id, 3.7) + vec3(gSeedOff, 0.0));
      float vy = mix(5.0, 8.0, hb.x) * sqrt(max(gForce, 0.05));
      float vh = mix(0.5, 1.9, hb.y) * sqrt(max(gForce, 0.05));
      float ang = TAU * hb.z;
      vec3 v0 = vec3(vh * cos(ang), vy, vh * sin(ang));
      vec3 p0 = gVent + vec3(0.25 * cos(ang), 0.05, 0.25 * sin(ang));
      // Flight lasts until it falls back to 0.35 below the launch height.
      float tf = (vy + sqrt(vy * vy + 2.0 * G_ACC * 0.35)) / G_ACC;
      float tt = tau * CYCLE;
      if (tt >= tf) continue;
      vec3 h0 = mrBomb(p0, v0, tt);
      vec3 h1 = mrBomb(p0, v0, max(tt - 0.09, 0.0));
      vec3 h2 = mrBomb(p0, v0, max(tt - 0.2, 0.0));
      float life = tt / tf;
      float T = 1.18 - 0.5 * life;
      float fade = smoothstep(0.0, 0.04, tt) * (1.0 - smoothstep(0.85, 1.0, life)) * on * gErupt;
      vec3 s0 = mrRaySeg(ro, rd, h1, h0);
      vec3 s1 = mrRaySeg(ro, rd, h2, h1);
      float size = 0.045;
      float sig0 = max(size, gPix * s0.y * 1.2);
      float sig1 = max(size * 0.7, gPix * s1.y * 1.2);
      float vis0 = step(s0.y, t + 0.05), vis1 = step(s1.y, t + 0.05);
      float head = exp(-sq(length(ro + rd * s0.y - h0) / sig0)) * sq(size / sig0) * 2.2;
      float tr0 = exp(-sq(s0.x / sig0)) * (size / sig0) * (0.35 + 0.65 * s0.z);
      float tr1 = exp(-sq(s1.x / sig1)) * (size * 0.7 / sig1) * 0.35 * s1.z;
      add += (mrHeat(T) * (head + tr0) * vis0 + mrHeat(T - 0.12) * tr1 * vis1) * fade * (1.0 + 0.6 * u_rhythm.z);
    }
  }

  // ------------------------------------------------------------ embers
  // A 3D cell DDA along the ray: each visited cell may hold one ember that
  // rises through it (fading at the cell faces), so no ember ever pops.
  float emberAmt = smoothstep(0.35, 1.1, dev) * (0.25 + 0.75 * gEmbers) * (0.35 + 0.65 * level + 0.3 * u_rhythm.z);
  if (emberAmt > 0.01) {
    const float CE = 1.15;
    vec3 pe = ro / CE;
    vec3 cell = floor(pe);
    vec3 stepv = sign(rd);
    vec3 inv = 1.0 / max(abs(rd), vec3(1e-5));
    vec3 tNext = ((cell + max(stepv, 0.0)) - pe) * stepv * inv * CE;
    tNext = abs(tNext);
    vec3 tDelta = inv * CE;
    float tEnd = min(t, 22.0);
    float tc = 0.0;
    for (int k = 0; k < EMBER_CAP; ++k) {
      if (tc > tEnd) break;
      vec3 c = cell * CE;
      float baseY = gVent.y - 0.9;
      if (c.y >= baseY - CE && c.y < baseY + 3.5) {
        vec3 h = mrH3(cell + vec3(gSeedOff, 0.0) + 0.5);
        float r = length(c.xz);
        float dens = emberAmt * mix(0.08, 0.75, exp(-r * r / 70.0)) * (1.0 + 0.8 * gErupt);
        if (h.x < dens) {
          float ph = fract(h.y * 7.31 + gErPh * (0.5 + floor(h.z * 2.0) * 0.25));
          vec3 pos = c + CE * vec3(0.2 + 0.6 * h.z, ph, 0.2 + 0.6 * fract(h.y * 3.7));
          pos.x += 0.08 * sin(TAU * ph + h.y * 6.0);
          float env = sq(sin(PI * ph));
          float tq = max(dot(pos - ro, rd), 0.0);
          float d = length(ro + rd * tq - pos);
          float size = 0.014;
          float sig = max(size, gPix * tq * 1.3);
          float vis = step(tq, t);
          float T = 0.95 - 0.3 * ph + 0.15 * h.x;
          add += mrHeat(T) * exp(-sq(d / sig)) * sq(size / sig) * env * 2.8 * vis;
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

export default {
  id: "magma",
  number: 104,
  name: "Magma Rift",
  description:
    "A volcanic field raymarched as one continuous world: basalt plates on a Voronoi crust whose exact seams breathe with heat, split into lava rivers with drifting crust skins and embers, and open into a lava lake whose fountain throws glowing ejecta on ballistic arcs under an ash plume lit from below. Colour is temperature on the palette. Energy raises flow, embers, ejecta and breathing.",
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
  clocks: [
    { rate: orbitRate, period: 2 * Math.PI },
    { rate: flowRate, period: 16 },
    { rate: eruptRate, period: 64 },
  ],
};
