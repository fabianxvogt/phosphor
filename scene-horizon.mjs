import { familyEffect } from "./family-rhythm.mjs";

// Event Horizon (#89): a Schwarzschild black hole as one continuous world.
// Every pixel integrates its null geodesic exactly in its own orbit plane
// (Binet form u'' + u = 3Mu², u = 1/r, M = 1) with RK4 in the orbit angle.
// The thin disk lies in the equatorial plane, so its crossings sit at known
// orbit angles; they are shaded after the march with screen-space footprints
// (pixel-size detail cutoff). Escaping rays end where u reaches 0, which is
// the exact asymptotic direction for the analytic sky. Development feeds one
// tidal stream from a disrupted star (0) into a forming, heating disk (1)
// and a blazing Doppler-beamed disk with relativistic jets (2).

const schema = [
  {
    key: "development",
    label: "Development · star / infall / horizon",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  { key: "swirl", label: "Disk rotation", min: 0, max: 2, step: 0.01, default: 1 },
  {
    key: "turbulence",
    label: "Turbulence",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  { key: "jets", label: "Jets", min: 0, max: 1.5, step: 0.01, default: 0.8 },
  {
    key: "beaming",
    label: "Doppler beaming",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.7,
  },
  { key: "orbit", label: "Camera orbit", min: -1, max: 1, step: 0.01, default: 0.4 },
  { key: "tilt", label: "Inclination", min: 0, max: 1, step: 0.01, default: 0.35 },
  { key: "stars", label: "Star field", min: 0, max: 1, step: 0.01, default: 0.5 },
];

const base = {
  swirl: 1,
  turbulence: 0.5,
  jets: 0.8,
  beaming: 0.7,
  orbit: 0.4,
  tilt: 0.35,
  stars: 0.5,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});

const presets = [
  // World states: one seed, identical parameters, development at integers.
  look("Tidal Star", 8901, 0),
  look("Infall Spiral", 8901, 1),
  look("Blazing Horizon", 8901, 2),
  look("Edge of Night", 8902, 2, {
    tilt: 0.08,
    beaming: 0.9,
    orbit: 0.25,
    jets: 0.5,
    stars: 0.35,
  }),
  look("Polar Crown", 8903, 1.7, {
    tilt: 0.95,
    swirl: 1.3,
    turbulence: 0.7,
    jets: 1.2,
    orbit: -0.3,
  }),
  look("Quiet Lens", 8904, 0.3, {
    tilt: 0.55,
    stars: 0.9,
    orbit: 0.6,
    swirl: 0.6,
  }),
  look("Ember Ring", 8905, 1.25, {
    turbulence: 0.85,
    beaming: 0.45,
    tilt: 0.22,
    swirl: 1.4,
  }),
  look("Relativistic Gale", 8906, 2, {
    swirl: 1.7,
    turbulence: 0.75,
    jets: 1.4,
    beaming: 1,
    orbit: -0.7,
    tilt: 0.45,
  }),
];

// Integrated phases as 24-bit fractions: energy changes rates, never
// positions. 0 camera azimuth (turns), 1 disk flow (layer period), 2 flow
// wrap counter (integer / 2^24), 3 jet knots, 4 star twinkle, 5 stream head
// orbit (turns), 6 hot-spot orbit (turns). Disk time runs at 9 M per second
// at swirl 1; flow phase covers one 30 M layer period.
const simulation = `
float unpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
vec4 pack24(float x) {
  float n = floor(fract(x) * 16777216.);
  float b0 = floor(n / 65536.); n -= b0 * 65536.;
  float b1 = floor(n / 256.); n -= b1 * 256.;
  return vec4(b0, b1, n, 255.) / 255.;
}
float hzRate(int i) {
  float level = clamp(u_level, 0., 1.);
  float swirl = max(u_params[1], 0.);
  return i == 0 ? u_params[5] * 0.0095
       : i == 1 ? swirl * 0.3
       : i == 3 ? (0.35 + 0.9 * level) * 0.45
       : i == 4 ? 0.06 + 0.22 * level
       : i == 5 ? swirl * 9. * 0.011180340 / 6.283185307   // Ω(20 M)
       : i == 6 ? swirl * 9. * 0.048686 / 6.283185307      // Ω(7.5 M)
       : 0.;
}
void main() {
  int i = int(gl_FragCoord.x);
  float value = unpack24(texelFetch(u_state, ivec2(i, 0), 0));
  if (u_reset) {
    outColor = pack24(i == 2 ? 0. : fract(u_seed * (0.0137 + 0.0071 * float(i))));
    return;
  }
  if (i == 2) {
    // Counts wraps of the flow phase with the same arithmetic as texel 1.
    float flow = unpack24(texelFetch(u_state, ivec2(1, 0), 0));
    float wraps = floor(flow + u_dt * hzRate(1));
    outColor = pack24(value + wraps / 16777216.);
    return;
  }
  outColor = pack24(value + u_dt * hzRate(i));
}
`;

const common = `
const int STEP_CAP = 120;
const float BC = 5.196152422706632; // critical impact parameter √27 M
const float R_IN = 6.0;             // innermost stable circular orbit
const float R_STAR = 20.0;          // orbit of the disrupted star

float unpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
float hzPhase(int i) { return unpack24(texelFetch(u_state, ivec2(i, 0), 0)); }

// Per-frame constants (uniform across the frame), assigned once in main().
float gDev, gForm, gBlaze, gMass, gHeat, gTurb, gBeam, gLevel, gFlow, gCycle;
float gHeadAngle, gSpotAngle, gLapseCam, gJetAmt, gJetLen, gKnot, gTwinkle;
float gPixelAngle, gStars, gSeedShift;
mat3 gSkyRot;

float hz01(uint h) { return float(h >> 8u) / 16777216.; }
// Float-only lattice hashes (no integer multiplies, which are slow on
// tile GPUs). Inputs stay below a few thousand, well inside fp32 range.
float hzH2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hzH3(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
vec4 hzH4(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p4 += dot(p4, p4.wzxy + 33.33);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// ---------------------------------------------------------------- geodesic
// Binet equation of a Schwarzschild null geodesic (M = 1): u'' = -u + 3u².
// Encke-style RK4: the flat-space part (u'' = -u, straight lines) is an
// exact rotation of (u, u'); RK4 integrates only the 3u² perturbation in the
// co-rotating frame z, so straight rays stay exactly straight at any step.
float hzF(float u) { return 3.0 * u * u; }
vec2 hzStep(vec2 y, float h) {
  float c1 = cos(0.5 * h), s1 = sin(0.5 * h);
  float c2 = c1 * c1 - s1 * s1, s2 = 2.0 * s1 * c1;
  vec2 k1 = vec2(0.0, hzF(y.x));
  vec2 z = y + 0.5 * h * k1;
  vec2 k2 = hzF(z.x * c1 + z.y * s1) * vec2(-s1, c1);
  z = y + 0.5 * h * k2;
  vec2 k3 = hzF(z.x * c1 + z.y * s1) * vec2(-s1, c1);
  z = y + h * k3;
  vec2 k4 = hzF(z.x * c2 + z.y * s2) * vec2(-s2, c2);
  z = y + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
  return vec2(z.x * c2 + z.y * s2, -z.x * s2 + z.y * c2);
}
// Step size: larger in the weak field, finer near the photon sphere, and
// at most half the e-folding angle of u, so nearly radial rays resolve too.
float hzH(vec2 y) {
  float u = max(y.x, 0.0);
  return min(0.6 / (1.0 + 18.0 * u), 0.5 * max(u, 0.02) / max(abs(y.y), 1e-6));
}
// Cubic Hermite value and slope between two RK4 states at fraction s.
vec2 hzHermite(vec2 a, vec2 b, float h, float s) {
  float s2 = s * s, s3 = s2 * s;
  float v = (2.0 * s3 - 3.0 * s2 + 1.0) * a.x + (s3 - 2.0 * s2 + s) * h * a.y +
            (-2.0 * s3 + 3.0 * s2) * b.x + (s3 - s2) * h * b.y;
  float d = ((6.0 * s2 - 6.0 * s) * a.x + (3.0 * s2 - 4.0 * s + 1.0) * h * a.y +
             (-6.0 * s2 + 6.0 * s) * b.x + (3.0 * s2 - 2.0 * s) * h * b.y) / h;
  return vec2(v, d);
}

// Camera orbit radius, shared by the geodesic table and the image so both
// see the same camera in the same frame.
float gSa, gSb;
void hzSeedAngles() {
  gSa = float(u_seedBits % 997u) * 0.0063;
  gSb = float((u_seedBits / 997u) % 991u) * 0.0063;
}
float hzCameraRadius(float dev, out float az, out float pass) {
  float form = smoothstep(0.0, 1.0, dev), blaze = smoothstep(1.0, 2.0, dev);
  az = TAU * hzPhase(0) + gSa;
  pass = blaze * pow(0.5 + 0.5 * cos(az - 1.9), 6.0);
  return mix(mix(46.0, 34.0, form), 27.0, blaze) * (1.0 - 0.42 * pass) *
    (1.0 + 0.025 * sin(3.0 * az));
}

// Geodesic table (precompute path). Rows: impact parameter b on an asinh
// scale around √27 M, captured side rows 0..255, escaping side 256..511, so
// no row pair straddles the shadow edge. Columns 0..127: (u, u') at
// φ_j = j·Δφ and φ_(j+1); column 128: (φ_end, flag, φ_end - ψ, ψ) with flag
// 0 escaped, 1 captured, 2 still orbiting at 3.2π.
const float HZ_EPS = 0.002;
const float HZ_X0 = -8.555673749021336;   // asinh(-√27 / HZ_EPS)
const float HZ_DPHI = 0.07915824009045148; // 3.2π / 127
const float HZ_PHIMAX = 10.053096491487338;
// Symmetric asinh: the library form cancels catastrophically for x << 0.
float hzAsinh(float x) { return sign(x) * log(abs(x) + sqrt(x * x + 1.0)); }
float hzX1(float radius) {
  return hzAsinh((radius / sqrt(1.0 - 2.0 / radius) - BC) / HZ_EPS);
}
float hzRowB(float row, float x1) {
  float x = row < 255.75 ? HZ_X0 * (255.5 - row) / 255.5 : x1 * (row - 255.5) / 255.5;
  return BC + HZ_EPS * sinh(x);
}
float hzRowF(float b, float x1) {
  float x = hzAsinh((b - BC) / HZ_EPS);
  return x < 0.0 ? 255.5 * (1.0 - x / HZ_X0) : 255.5 + 255.5 * x / x1;
}
// Advances y from phi to target (adaptive steps, the last one exact).
// Captured rays freeze at the horizon sentinel u = 0.6.
vec2 hzAdvance(vec2 y, float phi, float target) {
  for (int k = 0; k < 220; ++k) {
    if (phi >= target - 1e-6 || y.x >= 0.5) break;
    float h = min(hzH(y), target - phi);
    y = hzStep(y, h);
    phi += h;
  }
  return y.x >= 0.5 ? vec2(0.6, 0.0) : y;
}
// Inward static-observer ray from radius with impact parameter b.
vec2 hzInitial(float b, float radius, out float psi) {
  float u0 = 1.0 / radius, lapse = sqrt(1.0 - 2.0 * u0);
  float sp = clamp(b * u0 * lapse, 1e-5, 1.0), cp = -sqrt(max(1.0 - sp * sp, 0.0));
  psi = atan(sp, cp);
  return vec2(u0, -u0 * lapse * cp / sp);
}
`;

const fragment = `${common}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
// ------------------------------------------------------------------- jets
float hzErf(float x) { return tanh(1.202760580 * x); }
// Line integral of the jet's Gaussian tube along the chord A→B (the
// orbit is locally straight). Returns core and sheath, Doppler-weighted.
vec2 hzJet(vec3 A, vec3 B) {
  vec3 D = B - A;
  float L = length(D);
  float dd = max(dot(D.xz, D.xz), 1e-6);
  float sStar = -dot(A.xz, D.xz) / dd;
  float s = clamp(sStar, 0.0, 1.0);
  vec3 P = A + D * s;
  float y = abs(P.y);
  vec2 closest = A.xz + D.xz * sStar;
  float rho2 = dot(closest, closest);
  // A collimated core inside a widening sheath; brightest near the base.
  float sheathW = 0.5 + 0.11 * y, coreW = 0.16 + 0.02 * y;
  // Most chords pass far from the axis: reject before any transcendentals.
  if (y < 2.4 || y > 4.0 * gJetLen || dot(P.xz, P.xz) > 9.0 * sheathW * sheathW) return vec2(0.0);
  float lxz = sqrt(dd);
  float along = smoothstep(2.4, 4.5, y) * exp(-y / gJetLen) * (1.0 + 2.0 * exp(-(y - 2.4) / 3.5));
  // Knots travel outward on integer harmonics of the knot phase.
  // Sharp knots; energy raises their contrast (activity), not the mean.
  float knotWave = pow(0.5 + 0.5 * sin(0.42 * y - TAU * gKnot * 2.0), 3.0);
  float knots = mix(1.0, 0.45 + 1.6 * knotWave, 0.35 + 0.6 * gLevel);
  knots *= 0.8 + 0.2 * sin(0.17 * y - TAU * gKnot + 1.3);
  // Gesture: one bright knot ejected along both jets.
  float burstY = 4.5 + 30.0 * (1.0 - u_rhythm.z);
  knots += 2.5 * u_rhythm.z * exp(-sq((y - burstY) / 2.2));
  float span0 = sStar * lxz, span1 = (1.0 - sStar) * lxz;
  vec2 cover = vec2(
    (hzErf(span1 / coreW) + hzErf(span0 / coreW)) * 0.886 * coreW * exp(-rho2 / (coreW * coreW)),
    (hzErf(span1 / sheathW) + hzErf(span0 / sheathW)) * 0.886 * sheathW * exp(-rho2 / (sheathW * sheathW))
  ) * min(L / lxz, 12.0);
  // Plasma moves away from the hole at β; photons travel B → A.
  float beta = 0.75 * gBeam;
  float cosT = -sign(P.y) * D.y / max(L, 1e-6);
  float delta = sqrt(1.0 - beta * beta) / (1.0 - beta * cosT);
  return cover * along * knots * delta * delta;
}

// ------------------------------------------------------------------- disk
// Value noise, periodic in y; salt shifts the lattice in x only.
float hzNoise(vec2 p, float period, float salt) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float y0 = mod(i.y, period), y1 = mod(i.y + 1.0, period);
  float x0 = i.x + salt;
  float a = hzH2(vec2(x0, y0)), b = hzH2(vec2(x0 + 1.0, y0));
  float c = hzH2(vec2(x0, y1)), d = hzH2(vec2(x0 + 1.0, y1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Turbulent gas in material coordinates of one flow layer. lr = ln r,
// angle0 = material angle, fl = pixel footprint in ln r.
float hzTurbulence(float lr, float angle0, float fl, float salt, int octaves) {
  float sum = 0.0, norm = 0.0, amp = 1.0, freq = 9.0, per = 8.0;
  float decay = 0.62 + 0.12 * gLevel;
  for (int o = 0; o < 4; ++o) {
    if (o >= octaves) break;
    // Octaves narrower than the pixel footprint fade to their mean.
    float keep = 1.0 - smoothstep(0.35, 1.0, fl * freq);
    norm += amp;
    if (keep > 0.0) {
      float n = hzNoise(vec2(lr * freq, angle0 * per / TAU), per, salt + float(o) * 211.0);
      sum += amp * keep * (n - 0.5);
    }
    amp *= decay; freq *= 2.3; per *= 2.0;
  }
  return sum / norm * 2.0;
}

// Emission (rgb) and opacity (a) of the equatorial gas at xz, observed with
// redshift factor g; fp is the crossing's footprint in M.
vec4 hzDisk(vec2 xz, float g, float fp, float order) {
  float r = length(xz);
  if (r < 2.05 || r > 34.0) return vec4(0.0);
  float th = atan(xz.y, xz.x);
  float lr = log(r);
  float fl = min(fp / r, 2.0);
  float omega = pow(r, -1.5);

  // Tidal stream: a logarithmic spiral of debris trailing the star. The
  // star orbits with decreasing angle, so its debris lies behind it (larger
  // angle) and has fallen inward.
  float pitch = mix(0.085, 0.06, gForm);
  float lrs = lr - log(R_STAR);
  float d0 = mod(th - gHeadAngle, TAU);
  float j = max(0.0, floor((-lrs / pitch - d0) / TAU + 0.5));
  float trail = d0 + TAU * j;
  float off = lrs + pitch * trail;
  // Also test the next wrap outward, so the stream is continuous at j = 0.
  float trailB = max(trail - TAU, d0), offB = lrs + pitch * trailB;
  if (abs(offB) < abs(off)) { trail = trailB; off = offB; }
  float width = mix(0.035, 0.12, gForm) + 0.5 * fl;
  float reach = mix(2.6, 12.0, smoothstep(0.0, 1.2, gDev));
  float stream = exp(-sq(off / width)) * (1.0 - smoothstep(0.55 * reach, reach, trail)) *
    smoothstep(R_IN - 0.5, R_IN + 2.0, r) * mix(0.9, 0.35, gBlaze) * min(1.0, 0.035 / width + 0.25) *
    smoothstep(0.0, 0.3, trail);

  // The star: a tidally stretched bright knot at the head of the stream.
  float dth = mod(th - gHeadAngle + PI, TAU) - PI;
  float headR = r - R_STAR, headS = R_STAR * dth;
  float stretch = mix(0.9, 3.2, smoothstep(0.0, 0.9, gDev));
  float head = exp(-sq(headR / 0.42) - sq(headS / stretch)) * (1.0 - smoothstep(0.5, 1.4, gDev));
  head += 0.35 * exp(-sq(headR / 0.2) - sq(headS / 0.2)) * (1.0 - smoothstep(0.3, 0.9, gDev));

  // The disk: Novikov–Thorne-like envelope with a sharp ISCO edge, faint
  // plunging gas inside it, turbulence and two slow density-wave arms.
  float rOut = mix(mix(9.0, 15.0, gForm), 19.0, gBlaze);
  float edge = 0.35 + 0.6 * fl * r;
  float env = smoothstep(R_IN - edge, R_IN + edge, r) * (1.0 - smoothstep(0.55 * rOut, rOut, r));
  env += 0.06 * smoothstep(2.4, R_IN, r) * (1.0 - smoothstep(R_IN - 0.3, R_IN + 0.3, r));
  // Spot of the hot-spot gesture (see below), needed for the early exit.
  float spotTh = mod(th - gSpotAngle + PI, TAU) - PI;
  float spot = exp(-sq((r - 7.5) / 0.9) - sq(7.5 * spotTh / 1.6)) * u_rhythm.x * gMass;
  if (env * gMass + stream + head + spot < 1e-3) return vec4(0.0);

  // Flow layers: material angle th + Ω t, sheared within ±15 M of time and
  // reseeded every period; two layers cross-fade with variance kept.
  float n = 0.0, wsum = 1.0;
  if (env * gMass + stream > 1e-3) for (int k = 0; k < 2; ++k) {
    if (k == 0) wsum = 0.0;
    float tau = fract(gFlow + 0.5 * float(k));
    float w = 1.0 - abs(2.0 * tau - 1.0);
    float id = gCycle + floor(gFlow + 0.5 * float(k));
    float angle0 = th + omega * (tau - 0.5) * 30.0;
    float salt = mod(id * 2.0 + float(k) + gSeedShift, 61.0) * 37.0;
    n += w * hzTurbulence(lr, angle0, fl, salt, order < 0.5 ? 4 : 2);
    wsum += w * w;
  }
  n /= sqrt(max(wsum, 1e-3));

  stream *= 1.0 + 0.5 * gTurb * n;
  float arms = 1.0 + 0.25 * gForm * sin(2.0 * th + 5.5 * lr + 1.7) * (1.0 - smoothstep(0.2, 0.8, fl * 6.0));
  // Fine ringlets: concentric streaks sheared out of the turbulence.
  float ringlets = 1.0 + 0.3 * gTurb * sin(lr * 70.0 + 5.0 * n) * (1.0 - smoothstep(0.02, 0.06, fl));
  float turb = 0.5 + 1.1 * gTurb;
  float disk = env * gMass * arms * ringlets * pow(max(0.0, 1.0 + turb * n), 1.5) * pow(R_IN / max(r, R_IN), 0.35);
  disk *= mix(1.0, 0.75, smoothstep(0.0, 1.0, order - 1.0));

  float density = disk + stream;
  // Temperature: T ∝ r^-3/4 (1 - √(r_in/r))^1/4, peak 1 at r = 49/36 r_in.
  float x = R_IN / max(r, R_IN * 1.0001);
  float profile = pow(x, 0.75) * pow(1.0 - sqrt(x), 0.25) / 0.48836;
  profile = mix(0.25 * pow(R_IN / r, 0.75), profile, step(R_IN, r)) + 0.12;
  float gb = pow(g, gBeam);
  float T = gHeat * profile * gb;
  // Colour is temperature: cool receding gas toward secondary, hot
  // approaching gas toward primary; the accent stays reserved.
  float tone = clamp(0.64 * pow(T / 1.2, 2.2) + 0.06 * n * gTurb, 0.0, 0.66);
  // The hottest, beamed gas whitens a little (palette mixed with white).
  vec3 hue = mix(palette(tone), vec3(1.0), 0.3 * smoothstep(1.0, 1.8, T));
  vec3 col = hue * density * pow(T, 2.6) * pow(gb, 1.6) * 0.75;
  // Tidal debris glows by itself (shocked gas), so the stream reads before
  // the disk has heated: cool toward secondary, its inner wraps warmer.
  col += mix(u_secondary, u_primary, 0.35 + 0.3 * smoothstep(R_STAR, R_IN, r)) * stream * 0.55 * pow(gb, 1.5) * (1.0 - 0.6 * gBlaze);
  // The star glows with its own light, cooler than the hot inner disk.
  col += mix(u_primary, vec3(1.0), 0.35) * head * 2.2 * (1.0 + 2.5 * u_rhythm.x * (1.0 - gMass)) * pow(gb, 1.5);

  // Gesture: an orbiting hot spot flares in the inner disk (Sgr A*-style).
  col += mix(u_primary, u_accent, 0.6) * spot * 3.0 * pow(gb, 3.0);

  float alpha = 1.0 - exp(-(disk * mix(0.8, 4.5, gBlaze) + stream * 0.6 + head * 2.0));
  return vec4(col, alpha);
}

// -------------------------------------------------------------------- sky
// Point stars on a cube-face grid. sigma follows the lensed pixel footprint
// (fp), so demagnified stars near the shadow dim and spread instead of
// flickering, while flux is conserved; tiny footprints (magnified images)
// brighten up to a cap.
vec3 hzStars(vec3 d, float cells, float fp, float salt, float density, float gain) {
  vec3 a = abs(d);
  vec2 uv; int face;
  if (a.x >= a.y && a.x >= a.z) { uv = d.yz / a.x; face = d.x > 0.0 ? 0 : 1; }
  else if (a.y >= a.z) { uv = d.xz / a.y; face = d.y > 0.0 ? 2 : 3; }
  else { uv = d.xy / a.z; face = d.z > 0.0 ? 4 : 5; }
  vec2 g = (uv * 0.5 + 0.5) * cells;
  vec2 cell = floor(g), f = g - cell;
  vec4 rnd = hzH4(cell + vec2(float(face) * 409.0 + salt, salt * 0.37));
  float r1 = rnd.x, r2 = rnd.y, r3 = rnd.z, r4 = rnd.w;
  float cellAngle = 2.0 / cells;
  float sigma = max(0.45 * gPixelAngle, 0.6 * fp);
  float dist = length(f - (0.2 + 0.6 * vec2(r2, r3))) * cellAngle;
  float r4c = r4 * r4 * r4;
  float flux = r4c * r4c * 7.0 + 0.25 * r4;
  float tw = 1.0 + (0.12 + 0.55 * gLevel) * sin(TAU * (gTwinkle * (1.0 + floor(r1 * 5.0)) + r3));
  float exists = step(r1, density);
  float point = exists * flux * tw * sq(gPixelAngle / sigma) * exp(-0.5 * sq(dist / sigma));
  // Mean of the layer once the footprint covers a large part of a cell.
  float mean = density * 1.125 * 6.2832 * sq(gPixelAngle / cellAngle);
  float blend = smoothstep(0.12, 0.3, sigma / cellAngle);
  vec3 tint = mix(mix(u_secondary, u_primary, r2), vec3(1.0), 0.3);
  return tint * gain * mix(point, mean, blend);
}

float hzNoise3(vec3 p, float salt) {
  vec3 i = floor(p) + salt, f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec3 c = i;
  float n000 = hzH3(c), n100 = hzH3(c + vec3(1, 0, 0));
  float n010 = hzH3(c + vec3(0, 1, 0)), n110 = hzH3(c + vec3(1, 1, 0));
  float n001 = hzH3(c + vec3(0, 0, 1)), n101 = hzH3(c + vec3(1, 0, 1));
  float n011 = hzH3(c + vec3(0, 1, 1)), n111 = hzH3(c + vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

vec3 hzSky(vec3 dir, float fp) {
  vec3 d = gSkyRot * dir;
  // A galactic band along a seeded great circle with dust and filaments.
  float lat = d.y;
  float band = exp(-sq(lat / 0.28));
  // Two octaves of value noise only inside the band; the second one fades
  // with the lensed footprint. Dust lanes reuse the fine octave.
  float neb = 0.0, dust = 0.0;
  if (band > 0.02) {
    neb = hzNoise3(d * 2.4, 17.0) - 0.5;
    float fine = hzNoise3(d * 6.5, 70.0);
    float keep = 1.0 - smoothstep(0.25, 0.8, fp * 13.0);
    neb = (neb * 0.6 + 0.33 * keep * (fine - 0.5)) / 0.93;
    dust = smoothstep(0.45, 0.75, mix(0.5, fine, keep) + 0.3 * neb);
  }
  float glow = band * max(0.0, 0.55 + 1.5 * neb) * (1.0 - 0.7 * dust * band);
  vec3 col = mix(u_secondary, mix(u_primary, u_secondary, 0.4), smoothstep(-0.1, 0.25, neb)) * glow * 0.055 * (0.4 + gStars);
  col += u_secondary * 0.006;
  float denser = 1.0 + 1.6 * band;
  col += hzStars(d, 60.0, fp, 11.0, 0.32 * gStars, 0.7);
  col += hzStars(d, 230.0, fp, 23.0, (0.05 + 0.2 * gStars) * min(1.0, 0.45 * denser), 0.25);
  return col;
}

// Equatorial crossing at orbit angle pc with state c = (u, u'): position
// (xz) and the redshift factor g of Keplerian gas seen by the static camera.
vec4 hzCrossing(float pc, vec2 c, vec3 e1, vec3 e2) {
  float r = 1.0 / c.x;
  vec3 rh = cos(pc) * e1 + sin(pc) * e2;
  vec3 th = -sin(pc) * e1 + cos(pc) * e2;
  vec3 pos = rh * r;
  // Static-frame direction of the backward ray; photons travel opposite.
  float lapse = sqrt(max(1.0 - 2.0 * c.x, 1e-4));
  vec3 back = normalize(rh * (-c.y / lapse) + th * c.x);
  vec3 gas = vec3(pos.z, 0.0, -pos.x) / r;
  float beta = min(sqrt(1.0 / max(r - 2.0, 0.5)), 0.95);
  float g = sqrt(max(1.0 - 3.0 / max(r, 3.05), 0.0)) / (1.0 - beta * dot(gas, -back)) / gLapseCam;
  g = r > R_IN ? g : g * smoothstep(2.0, R_IN, r);
  return vec4(pos.x, pos.z, g, 1.0);
}

// Pixel footprint of a crossing on the disk. A neighbour without the same
// crossing (shadow edge, image order change) gives no derivative: that axis
// is skipped, and a pixel with no valid axis assumes a modest footprint.
float hzFootprint(vec4 X) {
  vec2 dx = dFdx(X.xy), dy = dFdy(X.xy);
  float vx = abs(dFdx(X.w)), vy = abs(dFdy(X.w));
  float fx = vx < 0.5 ? length(dx) : 0.0, fy = vy < 0.5 ? length(dy) : 0.0;
  float fp = max(fx, fy);
  return vx > 0.5 && vy > 0.5 ? 0.02 * length(X.xy) : fp;
}

// ------------------------------------------------------------------- main
void main() {
  float dev = clamp(u_params[0], 0.0, 2.0);
  float level = clamp(u_level, 0.0, 1.0);
  gDev = dev;
  gLevel = level;
  gForm = smoothstep(0.0, 1.0, dev);
  gBlaze = smoothstep(1.0, 2.0, dev);
  gMass = smoothstep(0.3, 1.25, dev);
  gHeat = mix(0.45, 0.82, gForm) + 0.33 * gBlaze;
  gTurb = clamp(u_params[2], 0.0, 1.0);
  gBeam = clamp(u_params[4], 0.0, 1.0);
  gStars = clamp(u_params[7], 0.0, 1.0);
  gFlow = hzPhase(1);
  gCycle = floor(hzPhase(2) * 16777216.0 + 0.5);
  gKnot = hzPhase(3);
  gTwinkle = hzPhase(4);
  gSeedShift = float(u_seedBits % 61u);
  // Seed-derived identity: sky orientation and the star's starting angle.
  hzSeedAngles();
  float sa = gSa, sb = gSb;
  gHeadAngle = -TAU * hzPhase(5) + sa * 3.0;
  gSpotAngle = -TAU * hzPhase(6) + sb * 5.0;
  mat3 ry = mat3(cos(sa), 0.0, -sin(sa), 0.0, 1.0, 0.0, sin(sa), 0.0, cos(sa));
  float tiltSky = 0.35 + 0.8 * fract(sb * 0.37);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(tiltSky), sin(tiltSky), 0.0, -sin(tiltSky), cos(tiltSky));
  gSkyRot = rx * ry;
  float jetsParam = max(u_params[3], 0.0);
  // Jets belong to the peak: they build with development and energy.
  gJetAmt = jetsParam * smoothstep(1.25, 1.95, dev) * (0.3 + 0.7 * smoothstep(0.25, 0.85, level));
  gJetLen = mix(9.0, 24.0, level);

  // Camera: a slow orbit around the spin axis. Inclination moves to a new
  // seeded value on each 8-bar phrase; distance closes in with development
  // and dives into one close pass per orbit in the Horizon state.
  float az, pass;
  float radius = hzCameraRadius(dev, az, pass);
  float phrase = u_beat / 32.0;
  float pk = floor(phrase);
  float wob = mix(hz01(seedHash(uint(int(pk)) ^ 0x2545f491u)),
                  hz01(seedHash(uint(int(pk) + 1) ^ 0x2545f491u)),
                  smoothstep(0.6, 1.0, fract(phrase))) * 2.0 - 1.0;
  float incl = mix(0.42, 0.16, smoothstep(0.0, 2.0, dev)) + 0.9 * (u_params[6] - 0.35) + 0.045 * wob;
  incl = clamp(incl, 0.05, 1.25);
  incl = mix(incl, max(0.06, incl * 0.6), pass);
  vec3 eye = radius * vec3(cos(incl) * cos(az), sin(incl), cos(incl) * sin(az));
  vec3 fw = -eye / radius;
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  float roll = 0.04 * sin(az * 2.0 + 0.5);
  vec2 uv = rot2(roll) * (aspectUV() * 2.0);
  float kick = u_kick * smoothstep(0.15, 1.0, level);
  float focal = mix(mix(2.0, 1.75, gForm), 1.55, gBlaze) * (1.0 - 0.2 * pass) * (1.0 + 0.025 * kick);
  vec3 rd = normalize(fw * focal + rt * uv.x + up * uv.y);
  gPixelAngle = 2.0 / (focal * u_resolution.y);

  // Ray in its orbit plane: e1 toward the camera position, e2 completes the
  // plane with the ray direction. Static-observer initial conditions:
  // b = r sinψ / √(1 - 2/r), du/dφ = -u √(1 - 2u) cot ψ.
  float u0 = 1.0 / radius;
  gLapseCam = sqrt(1.0 - 2.0 * u0);
  vec3 e1 = eye / radius;
  float cp = dot(rd, e1);
  vec3 e2 = rd - cp * e1;
  float sp = length(e2);
  e2 = sp > 1e-7 ? e2 / sp : normalize(cross(e1, vec3(0.0, 0.0, 1.0)));
  sp = max(sp, 1e-5);
  float b = sp / (u0 * gLapseCam);
  vec2 y = vec2(u0, -u0 * gLapseCam * cp / sp);

  // Equatorial crossings at φ_n + kπ.
  float phiN = atan(-e1.y, e2.y);
  float nextCross = mod(phiN, PI);
  if (nextCross < 1e-4) nextCross += PI;

  int crossings = 0;
  vec4 X0 = vec4(0.0, 0.0, 1.0, 0.0), X1 = X0, X2 = X0;  // xz, g, valid
  vec2 J0 = vec2(0.0), J1 = J0, J2 = J0, J3 = J0;         // core, sheath per segment
  bool escaped = false;
  float phiInf = 0.0;
  vec3 prevP = eye;
  // The orbit plane keeps |p.y| ≤ r·cY and ρ ≥ r·|n.y|; the jet needs
  // ρ ≤ 3(0.5 + 0.11|y|) and |y| ≥ 2.4, impossible when 1.5 < 2.4 (|n.y| - 0.33 cY).
  float ny = abs(cross(e1, e2).y), cY = sqrt(max(1.0 - ny * ny, 0.0));
  bool jets = gJetAmt > 0.002 && 2.4 * (ny - 0.33 * cY) < 1.5;
#ifdef PRECOMPUTED
  // Table path: every ray is one row (its b) of the per-frame geodesic table.
  float x1 = hzX1(radius);
  bool inside = b < BC;
  float rf = clamp(hzRowF(b, x1), inside ? 0.0 : 256.0, inside ? 255.0 : 511.0);
  int r0 = int(rf), r1 = min(r0 + 1, inside ? 255 : 511);
  float w = rf - float(r0);
  vec4 m0 = texelFetch(u_precomputed, ivec2(128, r0), 0);
  vec4 m1 = texelFetch(u_precomputed, ivec2(128, r1), 0);
  float phiEnd = mix(m0.x, m1.x, w);
  escaped = !inside && max(m0.y, m1.y) < 0.5;
  phiInf = atan(sp, cp) + mix(m0.z, m1.z, w);
  float cphi0 = 1e9, cphi1 = 1e9, cphi2 = 1e9;
  for (int k = 0; k < 3; ++k) {
    float pc = nextCross + PI * float(k);
    if (pc >= min(phiEnd, HZ_PHIMAX - HZ_DPHI)) break;
    float cc = pc / HZ_DPHI;
    int j = int(cc);
    float sf = cc - float(j);
    vec4 t0 = texelFetch(u_precomputed, ivec2(j, r0), 0);
    vec4 t1 = texelFetch(u_precomputed, ivec2(j, r1), 0);
    vec2 c = mix(hzHermite(t0.xy, t0.zw, HZ_DPHI, sf), hzHermite(t1.xy, t1.zw, HZ_DPHI, sf), w);
    // Samples frozen at the horizon sentinel cannot be interpolated: these
    // rays (nearly radial, captured within one column) integrate directly.
    if (max(max(t0.x, t0.z), max(t1.x, t1.z)) >= 0.5) c = hzAdvance(y, 0.0, pc);
    if (c.x > 0.0 && c.x < 0.5) {
      vec4 X = hzCrossing(pc, c, e1, e2);
      if (crossings == 0) { X0 = X; cphi0 = pc; }
      else if (crossings == 1) { X1 = X; cphi1 = pc; }
      else { X2 = X; cphi2 = pc; }
      crossings++;
    }
  }
  if (jets) {
    // Chords between every third table sample of the nearest row.
    int rn = w < 0.5 ? r0 : r1;
    float pPrev = 0.0;
    for (int k = 1; k < 43; ++k) {
      float pk = 3.0 * float(k) * HZ_DPHI;
      if (pk > phiEnd) break;
      float uk = texelFetch(u_precomputed, ivec2(3 * k, rn), 0).x;
      if (uk <= 0.0 || uk >= 0.5) break;
      vec3 P = (cos(pk) * e1 + sin(pk) * e2) / uk;
      vec2 jv = hzJet(prevP, P);
      float mid = 0.5 * (pPrev + pk);
      int bucket = int(mid > cphi0) + int(mid > cphi1) + int(mid > cphi2);
      if (bucket == 0) J0 += jv; else if (bucket == 1) J1 += jv; else if (bucket == 2) J2 += jv; else J3 += jv;
      prevP = P;
      pPrev = pk;
    }
  }
#else
  // Fallback: integrate each pixel's geodesic directly (same integrator).
  int limit = int(min(float(STEP_CAP), 1.25 * u_raySteps));
  float phi = 0.0;
  for (int i = 0; i < STEP_CAP; ++i) {
    if (i >= limit) break;
    // Larger steps in the weak field, finer near the photon sphere.
    float h = hzH(y);
    vec2 yn = hzStep(y, h);
    float pn = phi + h;
    float uEnd = yn.x;
    if (nextCross <= pn && crossings < 3) {
      vec2 c = hzHermite(y, yn, h, (nextCross - phi) / h);
      if (c.x > 0.0 && c.x < 0.5) {
        vec4 X = hzCrossing(nextCross, c, e1, e2);
        if (crossings == 0) X0 = X; else if (crossings == 1) X1 = X; else X2 = X;
        crossings++;
      }
      nextCross += PI;
    }
    if (jets && uEnd > 0.0) {
      vec3 P = (cos(pn) * e1 + sin(pn) * e2) / uEnd;
      vec2 jv = hzJet(prevP, P);
      if (crossings == 0) J0 += jv; else if (crossings == 1) J1 += jv; else if (crossings == 2) J2 += jv; else J3 += jv;
      prevP = P;
    }
    if (uEnd <= 0.0) {
      escaped = true;
      // In the co-rotating frame u(s) = z.x cos s + z.y sin s with z nearly
      // constant over the step: the root is atan(z.x, -z.y) for the mean z.
      float c = cos(h), sn = sin(h);
      vec2 zm = 0.5 * (y + vec2(yn.x * c - yn.y * sn, yn.x * sn + yn.y * c));
      phiInf = phi + atan(zm.x, -zm.y);
      break;
    }
    if (uEnd >= 0.5) break;
    y = yn;
    phi = pn;
  }
#endif

  // Footprints (top level, uniform control flow): crossing positions and the
  // asymptotic sky direction differentiate across the pixel quad.
  vec3 dirInf = escaped ? cos(phiInf) * e1 + sin(phiInf) * e2 : rd;
  float fpSky = max(length(dFdx(dirInf)), length(dFdy(dirInf)));
  float fp0 = hzFootprint(X0), fp1 = hzFootprint(X1), fp2 = hzFootprint(X2);
  float fwB = fwidth(b);

  vec3 sheathCol = mix(u_primary, u_secondary, 0.4);
  vec3 coreCol = mix(u_accent, vec3(1.0), 0.35);
  float jetGain = gJetAmt * 1.4;
  #define HZ_JET(J) ((coreCol * (J).x * 0.7 + sheathCol * (J).y * 0.6) * jetGain)

  vec3 col = HZ_JET(J0);
  float T = 1.0;
  if (crossings > 0) {
    vec4 d = hzDisk(X0.xy, X0.z, min(fp0, 8.0), 0.0);
    col += T * d.rgb; T *= 1.0 - d.a;
    col += T * HZ_JET(J1);
  }
  if (crossings > 1) {
    vec4 d = hzDisk(X1.xy, X1.z, min(fp1, 8.0), 1.0);
    col += T * d.rgb; T *= 1.0 - d.a;
    col += T * HZ_JET(J2);
  }
  if (crossings > 2) {
    vec4 d = hzDisk(X2.xy, X2.z, min(fp2, 8.0), 2.0);
    col += T * d.rgb; T *= 1.0 - d.a;
    col += T * HZ_JET(J3);
  }
  if (escaped && T > 0.004) col += T * hzSky(dirInf, min(fpSky, 1.0));

  // Photon ring: rays with b near √27 M orbit the photon sphere. Width is
  // the larger of its physical sharpness and 1.2 pixels of b.
  float wr = max(0.035, 1.2 * fwB);
  float ring = exp(-sq((b - BC) / wr)) * (0.035 / wr + 0.15);
  float halo = exp(-max(b - BC, 0.0) / 0.5) * step(BC, b) * 0.12;
  float ringAmt = (0.3 + 0.9 * gMass + 0.3 * gBlaze) * (1.0 + 1.6 * u_rhythm.y);
  col += T * (mix(u_accent, vec3(1.0), 0.2) * ring * 0.7 + mix(u_primary, u_accent, 0.3) * halo * gMass) * ringAmt;

  outColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

// Per-frame geodesic table (see hzRowB). Each texel integrates its row's
// ray from the camera to its column angle with the image's integrator; the
// last step lands exactly on the sample. Captured rays freeze at u = 0.6.
const precompute = `${common}
void main() {
  hzSeedAngles();
  float az, pass;
  float radius = hzCameraRadius(clamp(u_params[0], 0.0, 2.0), az, pass);
  int col = int(gl_FragCoord.x);
  float row = floor(gl_FragCoord.y);
  float psi;
  vec2 y = hzInitial(hzRowB(row, hzX1(radius)), radius, psi);
  if (col < 128) {
    float p0 = float(col) * HZ_DPHI;
    vec2 a = hzAdvance(y, 0.0, p0);
    vec2 b = hzAdvance(a, p0, p0 + HZ_DPHI);
    outColor = vec4(a, b);
    return;
  }
  float phi = 0.0, flag = 2.0, phiEnd = HZ_PHIMAX;
  for (int k = 0; k < 400; ++k) {
    float h = hzH(y);
    vec2 yn = hzStep(y, h);
    if (yn.x <= 0.0) {
      float c = cos(h), sn = sin(h);
      vec2 zm = 0.5 * (y + vec2(yn.x * c - yn.y * sn, yn.x * sn + yn.y * c));
      phiEnd = phi + atan(zm.x, -zm.y);
      flag = 0.0;
      break;
    }
    if (yn.x >= 0.5) {
      phiEnd = phi + h * (0.5 - y.x) / max(yn.x - y.x, 1e-6);
      flag = 1.0;
      break;
    }
    y = yn;
    phi += h;
    if (phi > HZ_PHIMAX) break;
  }
  outColor = vec4(phiEnd, flag, phiEnd - psi, psi);
}
`;

export default {
  id: "horizon",
  number: 89,
  name: "Event Horizon",
  description:
    "A Schwarzschild black hole traced per pixel: every ray integrates its exact null geodesic, so the star field and nebula lens around the shadow and the far side of a thin, Doppler-beamed accretion disk arches over and under it inside a photon ring. Development feeds a tidally stretched star into a forming spiral and a blazing disk with relativistic jets. Energy raises turbulence, rotation, jet activity and twinkle.",
  development: "development",
  schema,
  presets,
  stage: ["swirl", "jets", "tilt"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    swirl: { mul: [0.65, 1.35] },
    turbulence: [-0.3, 0.3],
    orbit: { mul: [0.75, 1.4] },
  },
  beat: { punch: 0.25, pulse: 0.3 },
  audio: [
    { param: "turbulence", feature: "high", amount: 0.08 },
    { param: "jets", feature: "low", amount: 0.1 },
  ],
  rhythm: [
    familyEffect(
      "hot-spot",
      0,
      "Hot spot",
      "A hot spot in the inner disk flares as it orbits; its lensed images flare with it.",
      { period: 4, strength: 0.6, duration: 1 },
    ),
    familyEffect(
      "photon-ring",
      1,
      "Photon ring",
      "The photon ring at √27 M brightens once.",
      { period: 8, strength: 0.6, duration: 1.5 },
    ),
    familyEffect(
      "jet-knot",
      2,
      "Jet knot",
      "One bright knot is ejected along both relativistic jets.",
      { period: 16, strength: 0.7, duration: 2 },
    ),
  ],
  fragment,
  simulation: { fragment: simulation, size: [7, 1], steps: 1 },
  precompute: { fragment: precompute, size: [129, 512] },
};
