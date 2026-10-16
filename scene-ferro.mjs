import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// Liquid Chrome (#101). A fixed world-space triangular lattice rises from
// one continuous mercury lens. Development changes height, never site IDs.
// The crown stays joined to its mirror puddle, including on reversal.
export const FERRO_SIGMA = 0.028;
export const FERRO_RHO = 1210;
export const FERRO_G = 9.81;
export const criticalWavelength = (sigma, rho, g) =>
  2 * Math.PI * Math.sqrt(sigma / (rho * g));
export const FERRO_SPACING = 0.28;
export const FERRO_METRES_PER_UNIT =
  criticalWavelength(FERRO_SIGMA, FERRO_RHO, FERRO_G) / FERRO_SPACING;

const schema = [
  {
    key: "development",
    label: "Development · pool / crown / sculpture",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "field",
    label: "Magnetic field",
    min: 0.3,
    max: 1.3,
    step: 0.01,
    default: 0.85,
  },
  {
    key: "motion",
    label: "Fluid motion",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.8,
  },
  {
    key: "orbit",
    label: "Studio orbit",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "elevation",
    label: "Studio elevation",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "strips",
    label: "Light strip width",
    min: 0.4,
    max: 1.5,
    step: 0.01,
    default: 0.85,
  },
  {
    key: "droplets",
    label: "Satellite droplets",
    min: 0.2,
    max: 1,
    step: 0.01,
    default: 0.75,
  },
  {
    key: "scale",
    label: "Sculpture scale",
    min: 0.7,
    max: 1.2,
    step: 0.01,
    default: 1,
  },
];
const base = {
  field: 0.85,
  motion: 0.8,
  orbit: 0.4,
  elevation: 0.45,
  strips: 0.85,
  droplets: 0.75,
  scale: 1,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Pool", 10101, 0),
  look("Crown", 10101, 1),
  look("Sculpture", 10101, 2),
  look("Obsidian Lens", 10102, 0.25, {
    elevation: 0.7,
    strips: 1.25,
    motion: 0.45,
  }),
  look("Needle Garden", 10103, 1, {
    field: 1.2,
    elevation: 0.8,
    orbit: -0.3,
    strips: 0.6,
  }),
  look("Mercury Moon", 10104, 2, {
    field: 0.65,
    droplets: 1,
    elevation: 0.3,
    orbit: -0.5,
  }),
  look("Black Magnet", 10105, 1.45, {
    field: 1.1,
    elevation: 0.25,
    strips: 0.55,
    motion: 1.1,
  }),
  look("Silver Orbit", 10106, 2, {
    field: 1.2,
    elevation: 0.65,
    strips: 1.1,
    droplets: 1,
    motion: 1.2,
  }),
];

const fragment = `${lateClockGlsl}
float gForm, gLift, gPhase, gCam, gStudio, gAmp, gPixel, gWidth, gRipple, gStrike, gEvent, gWave;
vec2 gPole;
vec3 gCentre;
mat2 gRotation;

// Nearest point of the triangular (hexagonally coordinated) lattice.
// Both rectangular cosets are necessary: nearest-neighbour distance is a,
// six neighbours at 60 degrees, row separation sqrt(3)*a/2.
vec2 ferroHex(vec2 p) {
  const vec2 period = vec2(1.0, 1.7320508075688772);
  vec2 a = p - period * floor(p / period + 0.5);
  vec2 b = p - period * (floor(p / period) + 0.5);
  return dot(a, a) < dot(b, b) ? a : b;
}
float ferroProfile(vec3 q) {
  // A bounded shear leans the field but keeps every foot in the puddle.
  vec2 chart = q.xz - gPole * gStrike * max(q.y, 0.0) * 0.38;
  vec2 grid = (chart + vec2(0.031, -0.017)) / 0.28;
  vec2 local = ferroHex(grid);
  vec2 site = grid - local;
  float cohort = fract(dot(site, vec2(0.754877666, 0.569840296)));
  // Fixed maximal lattice: energy raises dormant sites, never slides them.
  float population = smoothstep(cohort - 0.14, cohort + 0.14, 0.2 + 0.8 * u_level);
  float peak = max(0.0, 1.0 - length(local) * 0.28 / 0.139);
  // Peaks have conical tips and rounded shoulders, not plastic bubbles.
  float spikes = peak * peak * mix(0.12, 1.0, population);
  float edge = 1.0 - smoothstep(1.42, 1.84, length(q.xz));
  return spikes * edge * (1.0 + 0.40 * gStrike);
}
float ferroMap(vec3 p) {
  vec3 q = p;
  q.xz = gRotation * q.xz;
  float r = length(q.xz);
  float lensBase = max(0.0, 1.0 - r * r / 3.61);
  float lens = 0.10 * lensBase * sqrt(lensBase);
  float mound = 0.54 * gLift * exp(-r * r / 1.35) * (1.0 - smoothstep(1.5, 1.9, r));
  float ripple = (gRipple * sin(17.0 * r - 2.0 * gPhase) *
    exp(-0.45 * r * r) * smoothstep(0.0, 0.22, r) +
    0.022 * gEvent * sq(max(0.0, 1.0 - sq((r - gWave) / 0.24)))) * (1.0 - smoothstep(1.5, 1.9, r));
  float peaks = gAmp > 0.00001 ? gAmp * ferroProfile(q) : 0.0;
  float height = lens + mound + peaks + ripple;
  // The almost-flat Pool needs no high-slope lattice safety factor.
  float safety = mix(0.85, 0.35, gForm);
  return max(max((p.y - height) * safety, r - 1.9), -p.y - 0.003);
}
vec2 ferroBound(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 p = ro - c;
  float b = dot(p, rd), h = b * b - dot(p, p) + r * r;
  return h < 0.0 ? vec2(1.0, -1.0) : vec2(-b - sqrt(h), -b + sqrt(h));
}
float ferroMarch(vec3 ro, vec3 rd) {
  // Tight slab bounds keep the dense field cheap, including mirror rays.
  float top = 0.13 + 0.54 * gLift + gAmp * (1.0 + 0.40 * max(gStrike, 0.0)) + gRipple + 0.022 * gEvent;
  vec3 inv = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), rd)) / max(abs(rd), vec3(0.000001));
  vec3 a = (vec3(-1.92, -0.004, -1.92) - ro) * inv;
  vec3 b = (vec3(1.92, top, 1.92) - ro) * inv;
  vec3 lo = min(a, b), hi = max(a, b);
  vec2 bound = vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
  if (bound.y < max(bound.x, 0.0)) return 100.0;
  float t = max(bound.x, 0.0), previous = t;
  for (int i = 0; i < 128; ++i) {
    if (t > bound.y || float(i) >= u_raySteps) break;
    float d = ferroMap(ro + rd * t);
    if (d < max(0.00045, t * gPixel * 0.24)) {
      // The displaced height surface is an estimator, not an exact SDF.
      // Bracket an overshoot before taking normals: otherwise shallow,
      // strong-field crowns show stair-stepped interior intersections.
      if (d < -0.00045) {
        float lo = previous, hi = t;
        for (int j = 0; j < 7; ++j) {
          float mid = 0.5 * (lo + hi);
          if (ferroMap(ro + rd * mid) > 0.0) lo = mid; else hi = mid;
        }
        return 0.5 * (lo + hi);
      }
      return t;
    }
    previous = t;
    t += max(d * mix(1.0, 0.85, gForm), 0.0002);
  }
  return 100.0;
}
vec3 ferroNormal(vec3 p, float t) {
  float e = max(0.0012, t * gPixel * 0.55);
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * ferroMap(p + k.xyy * e) + k.yyx * ferroMap(p + k.yyx * e) + k.yxy * ferroMap(p + k.yxy * e) + k.xxx * ferroMap(p + k.xxx * e));
}
float ferroBox(vec3 d, vec3 direction, float width, float height) {
  vec3 c = normalize(direction);
  vec3 x = normalize(cross(vec3(0.0, 1.0, 0.0), c));
  vec3 y = cross(c, x);
  float z = dot(d, c);
  vec2 uv = vec2(dot(d, x), dot(d, y)) / max(z, 0.001);
  vec2 edge = abs(uv) - vec2(width, height);
  float aa = max(gPixel * 3.0, 0.022);
  float panel = (1.0 - smoothstep(-aa, aa, max(edge.x, edge.y))) * step(0.0, z);
  // A shaped strip, not a flat white rectangle. Filter angular edges but
  // retain a dark gap even in broad-strip presets.
  return panel * (0.32 + 0.68 * exp(-sq(uv.x / width) - sq(uv.y / height)));
}
vec3 ferroStudio(vec3 d) {
  // The studio keeps moving even when the fluid-motion fader is zero.
  d.xz = rot2(gStudio) * d.xz;
  d.xy = rot2(0.16 * sin(gStudio)) * d.xy;
  vec3 primary = mix(u_primary, vec3(1.0), 0.88);
  vec3 silver = mix(u_secondary, vec3(1.0), 0.82);
  vec3 col = silver * (0.025 + 0.10 * smoothstep(-0.35, 0.8, d.y));
  // Large reflected diffusion cards describe the curvature between strips.
  float window = pow(max(dot(d, normalize(vec3(0.4, 0.8, 0.6))), 0.0), 5.0);
  // Reflected dark mullions cross the broad silver window: this is sharp
  // specular environment structure, never a diffuse paint layer.
  float mullion = 0.55 + 0.45 * smoothstep(0.08, 0.24, abs(sin(d.x * 13.0 + d.z * 4.0)));
  col += silver * 1.05 * window * mullion;
  col += primary * 0.12 * pow(max(dot(d, normalize(vec3(-0.8, 0.4, -0.4))), 0.0), 4.0);
  // Negative space between narrow cards is essential: broad cards turn
  // the shallow crown into a white diffuse-looking plastic sheet.
  col += silver * ferroBox(d, vec3(-0.25, 1.0, 0.2), 0.72, 0.25) * 0.85;
  col += silver * ferroBox(d, vec3(0.1, 0.5, 1.0), 0.70, 0.12) * 1.4;
  col += primary * ferroBox(d, vec3(-0.65, 0.65, 0.6), 0.12 * gWidth, 1.15) * 2.0;
  col += silver * ferroBox(d, vec3(-0.4, 0.05, 0.8), 0.20 * gWidth, 0.85) * 1.5;
  col += silver * ferroBox(d, vec3(0.8, 0.45, 0.1), 1.1, 0.075 * gWidth) * 1.8;
  col += silver * ferroBox(d, vec3(0.1, 0.25, -1.0), 0.11 * gWidth, 1.4) * 1.3;
  // No narrow coloured wire-card: its rippled reflection read as text.
  // The long silver horizon describes the lower-facing valleys as well as
  // the tips. A conductor needs reflected shape, not an emissive outline.
  col += silver * 0.62 * exp(-sq((d.y + 0.15) / 0.14));
  float upperWindow = exp(-sq((d.y - 0.45) / 0.10));
  float bars = 0.35 + 0.65 * smoothstep(0.05, 0.15, abs(sin(d.x * 9.0)));
  col += silver * 0.75 * upperWindow * bars;
  return col;
}
vec3 ferroValley(vec3 p, vec3 n, vec3 rd) {
  if (gForm < 0.001) return vec3(1.0);
  vec3 reflected = reflect(rd, n);
  float nearD = ferroMap(p + reflected * 0.075);
  // One near-field visibility probe is sufficient for the broad reflected
  // window. Cavity shading already supplies the longer-range attenuation.
  float visibility = clamp(nearD / 0.052, 0.0, 1.0);
  // A single environment bounce about the carrier normal approximates
  // neighbouring chrome walls; no recursive ray march / extra normal.
  vec3 carrierNormal = normalize(vec3(p.x * 0.25, 1.0, p.z * 0.25));
  vec3 bounceDirection = reflect(reflected, carrierNormal);
  bounceDirection.xz = rot2(gStudio) * bounceDirection.xz;
  // Only the low-frequency soft cards survive a rough neighbour bounce.
  vec3 bounce = mix(u_secondary, vec3(1.0), 0.45) *
    (0.08 + 0.55 * pow(max(dot(bounceDirection, normalize(vec3(0.4, 0.8, 0.6))), 0.0), 4.0));
  bounce += mix(u_primary, vec3(1.0), 0.35) *
    0.45 * pow(max(dot(bounceDirection, normalize(vec3(-0.8, 0.4, -0.4))), 0.0), 4.0);
  return mix(vec3(0.52) + bounce * 0.28, vec3(1.0), visibility);
}
vec3 ferroMetal(vec3 p, vec3 n, vec3 rd, float cavity) {
  vec3 reflection = reflect(rd, n);
  float fresnel = 0.88 + 0.12 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  vec3 col = ferroStudio(reflection) * fresnel * cavity;
  // A dark conductor: no coloured diffuse lobe. Only a grazing soft rim.
  col += mix(u_secondary, vec3(1.0), 0.2) * 0.065 * pow(1.0 - abs(dot(n, rd)), 3.0);
  return col;
}
void main() {
  float dev = clamp(u_params[0], 0.0, 2.0);
  gForm = smoothstep(0.0, 1.0, dev);
  gLift = smoothstep(1.0, 2.0, dev);
#ifdef PHOSPHOR_LATE
  gPhase = u_clock[0];
  gCam = u_clock[1];
  gStudio = u_clock[2];
#else
  gPhase = u_time * u_params[2] * 0.22;
  gCam = u_time * u_params[3] * 0.045;
  gStudio = u_time * 0.065;
#endif
  float seedAngle = float(u_seedBits % 997u) * 0.0063;
  gRotation = rot2(0.15 * sin(gPhase) + seedAngle);
  // A missed render frame may deliver the newly crossed hit below its
  // envelope peak. The bounded hit floor preserves that strike, not history.
  float event = max(u_rhythm.w, 0.8 * u_rhythmHit.w);
  gEvent = event;
  gWave = 1.15 + 1.50 * (1.0 - event);
  // The negative tail supplies a small liquid settling overshoot.
  gStrike = event * (1.0 - 1.3 * exp(-sq((event - 0.16) / 0.09)));
  float poleAngle = mod(u_rhythmCount.w, 2.0) * 3.141592654 + seedAngle;
  gPole = vec2(cos(poleAngle), sin(poleAngle));
  float impulse = 1.0 + 0.11 * u_kick + 0.38 * u_rhythm.x;
  gAmp = gForm * (0.25 + 0.18 * gLift) * u_params[1] * impulse *
    (0.65 + 0.45 * u_level) * (1.0 + 0.16 * u_rhythm.y);
  gRipple = (1.0 - 0.8 * gForm) * (0.006 + 0.018 * u_kick + 0.030 * u_rhythm.x);
  gCentre = vec3(0.0, 0.22 + 0.3 * gLift, 0.0);
  gPixel = 1.0 / min(u_resolution.x, u_resolution.y);
  gWidth = u_params[5];

  float az = 0.55 + gCam + 0.08 * sin(gPhase);
  float el = 0.43 + 0.4 * u_params[4] - 0.14 * gLift + 0.02 * sin(gCam);
  vec3 target = vec3(0.45 * sin(gCam + 0.8), 0.22 + 0.10 * gLift, 0.16 * cos(gCam));
  vec3 ro = target + 6.4 * vec3(cos(el) * sin(az), sin(el), cos(el) * cos(az));
  vec3 fw = normalize(target - ro), right = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fw);
  vec2 uv = aspectUV() / min(u_resolution.x / u_resolution.y, 1.0);
  float portraitFit = mix(0.72, 1.0, smoothstep(0.6, 1.2, u_resolution.x / u_resolution.y));
  float focal = 2.12 * u_params[7] * portraitFit * (1.0 + 0.022 * u_kick);
  // One full-resolution ray. Pixel-scaled normals and angularly filtered
  // studio cards resolve glints without duplicating the complete SDF path.
  vec3 rd = normalize(fw * focal + right * uv.x + up * uv.y);
  vec3 col = mix(u_secondary, vec3(1.0), 0.18) *
    (0.012 + 0.080 * exp(-sq((uv.y + 0.03) / 0.28)) + 0.018 * exp(-dot(uv - vec2(-0.6, 0.2), uv - vec2(-0.6, 0.2))));

  float hit = ferroMarch(ro, rd);
  bool mainHit = hit < 90.0;
  // Analytic black mirror pool. Never shade / reflect pixels hidden by the
  // primary sculpture. The basin has no hard frame boundary.
  float floorT = -ro.y / min(rd.y, -0.00001);
  vec3 floorP = ro + rd * floorT;
  float pool = 1.0 - smoothstep(2.4, 2.95, length(floorP.xz));
  if (rd.y < -0.0001 && !mainHit) {
    float basinRadius = length(floorP.xz);
    vec2 basinSlope = floorP.xz / max(basinRadius, 0.01) *
      (0.016 * sin(12.0 * basinRadius - 2.0 * gPhase));
    vec3 reflection = reflect(rd, normalize(vec3(basinSlope.x, 1.0, basinSlope.y)));
    float shadow = 1.0 - 0.8 * exp(-dot(floorP.xz, floorP.xz) / (1.6 + gLift));
    col += mix(u_secondary, vec3(1.0), 0.65) * (0.006 + 0.025 * pool) * shadow;
    // A low, spatial reflection connects liquid and floor, rather than an
    // isolated outlined ellipse on black. Broad falloff avoids frame edges.
    float floorCard = exp(-sq((floorP.x + 0.45 * floorP.z) / 0.8)) *
      exp(-0.18 * dot(floorP.xz, floorP.xz));
    col += mix(u_secondary, vec3(1.0), 0.8) * floorCard * pool * 0.055 * shadow;
    // One actual SDF bounce in the pool, rather than a generic ball shadow.
    // Trace from the pool surface so the clipped base cannot occlude it.
    if (pool > 0.001 && gLift > 0.01) {
      vec3 reflectionOrigin = floorP + vec3(0.0, 0.008, 0.0);
      float rt = ferroMarch(reflectionOrigin, reflection);
      if (rt < 90.0) {
        vec3 rp = reflectionOrigin + reflection * rt;
        col += ferroMetal(rp, ferroNormal(rp, rt), reflection, 0.9) * 0.65 * pool * gLift;
      }
    }
    float rim = exp(-sq((basinRadius - 2.25) / 0.24));
    col += mix(u_secondary, vec3(1.0), 0.65) * rim * 0.025;
    float pressure = exp(-sq((basinRadius - gWave) / 0.15));
    float reflectedArc = 0.15 + 0.85 * pow(abs(dot(floorP.xz / max(basinRadius, 0.01), vec2(cos(gStudio), sin(gStudio)))), 4.0);
    col += mix(u_primary, vec3(1.0), 0.65) * pressure * pool * sqrt(event) * reflectedArc * 0.45;
  }
  vec3 normal = vec3(0.0);
  if (mainHit) {
    vec3 p = ro + rd * hit;
    normal = ferroNormal(p, hit);
    vec3 q = p; q.xz = gRotation * q.xz;
    float profile = ferroProfile(q);
    float cavity = mix(1.0, 0.62 + 0.38 * profile, gForm);
    col = ferroMetal(p, normal, rd, cavity) * ferroValley(p, normal, rd);
    // A small hot reflection at the active tips, not an emissive paint coat.
    vec3 tipLight = normalize(vec3(cos(gStudio), 0.65, sin(gStudio)));
    float tip = smoothstep(0.38, 0.8, profile) *
      pow(max(dot(reflect(rd, normal), tipLight), 0.0), 18.0);
    col += mix(u_primary, vec3(1.0), 0.6) * tip * (0.3 + event * 0.5) * gForm;
    float pressure = exp(-sq((length(p.xz) - gWave) / 0.13));
    col += mix(u_primary, vec3(1.0), 0.7) * pressure * event * 0.35 * max(normal.y, 0.0);
    col *= (0.7 + 0.3 * smoothstep(-0.05, 0.25, p.y)) *
      (0.3 + 0.7 * smoothstep(0.0, 0.16, 1.9 - length(p.xz)));
  }
  // Persistent satellite indices; radius grows continuously out of the body.
  for (int i = 0; i < 9; ++i) {
    float id = float(i), a = id * 2.39996323 + gPhase + seedAngle;
    float growth = gLift * gLift * u_params[6];
    float radius = (0.10 + 0.05 * sin(id * 7.1)) * growth * (0.65 + 0.35 * u_level);
    vec3 centre = gCentre + vec3(cos(a) * (1.7 + 0.12 * sin(a * 2.0)), sin(a + id) * 0.85, sin(a) * 1.7);
    centre += normalize(centre - gCentre) * 0.45 * u_rhythm.z;
    if (i >= 7) {
      float nearAngle = id * 2.39996323 + 0.3 * gPhase + seedAngle;
      centre = vec3(cos(nearAngle) * 2.5, 0.18 + 0.09 * sin(nearAngle), sin(nearAngle) * 2.5);
      radius = 0.12 + 0.04 * sin(id * 7.1);
    }
    vec2 span = ferroBound(ro, rd, centre, radius);
    if (radius > 0.0001 && span.x > 0.0 && span.x < span.y && span.x < hit) {
      hit = span.x;
      vec3 p = ro + rd * hit;
      vec3 n = normalize(p - centre);
      vec3 metal = ferroMetal(p, n, rd, 1.0);
      float coverage = smoothstep(0.0, i >= 7 ? 0.10 : 0.025, span.y - span.x);
      col = mix(col, metal, coverage);
    }
  }
  // Lens falloff is stable in portrait too; no output-aspect dependent crop.
  col *= 1.0 - 0.15 * smoothstep(0.6, 1.6, length(uv));
  outColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

export default {
  id: "ferro",
  number: 101,
  name: "Liquid Chrome",
  description:
    "A mercury lens grows a dense hexagonal crown of liquid-metal needles, rooted in its mirror puddle. Magnetic strikes tilt the field and send pressure waves past orbiting chrome droplets.",
  development: "development",
  schema,
  presets,
  stage: ["field", "elevation", "strips"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { motion: { mul: [0.7, 1.35] }, orbit: { mul: [0.8, 1.3] } },
  beat: { punch: 0.15, pulse: 0.1 },
  audio: [{ param: "field", feature: "low", amount: 0.07 }],
  clocks: [
    { rate: (p) => p[2] * 0.22, period: 2 * Math.PI },
    { rate: (p) => p[3] * 0.045, period: 2 * Math.PI },
    { rate: () => 0.065, period: 2 * Math.PI },
  ],
  rhythmStyles: {
    restrained: "Still mercury",
    driving: "Magnetic breath",
    accented: "Chrome resonance",
  },
  rhythm: [
    familyEffect(
      "spike-swell",
      0,
      "Spike swell",
      "The magnetic crown swells without changing its hexagonal cell identities.",
      {
        period: 4,
        strength: 0.55,
        duration: 1.25,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....x.. | ......x. | ...X.... | ....x...",
            division: 2,
            strength: 0.48,
            duration: 1.8,
          },
          driving: {
            steps: "X.....x. | ..X...x.",
            division: 2,
            strength: 0.72,
            duration: 0.9,
          },
          accented: {
            steps: "X.........x..... | .....X.......x.. | ..X........x....",
            division: 4,
            strength: 0.86,
            duration: 1,
          },
        },
      },
    ),
    familyEffect(
      "field-breath",
      1,
      "Field breath",
      "A slow magnetic breath stretches the same liquid body.",
      {
        period: 8,
        strength: 0.5,
        duration: 2,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "....x... | ........ | .......X | ........",
            division: 2,
            strength: 0.45,
            duration: 2,
          },
          driving: {
            steps: "...X.... | .......x",
            division: 2,
            strength: 0.68,
            duration: 1.5,
          },
          accented: {
            steps: ".......X........ | ............x... | ....X...........",
            division: 4,
            strength: 0.82,
            duration: 1.5,
          },
        },
      },
    ),
    familyEffect(
      "droplet-orbit",
      2,
      "Droplet orbit",
      "The persistent chrome satellites drift out from the sculpture.",
      {
        period: 16,
        strength: 0.6,
        duration: 2.5,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | .....X.. | ........",
            division: 2,
            strength: 0.5,
            duration: 2.5,
          },
          driving: {
            steps: "........ | ......x. | ........ | ....X...",
            division: 2,
            strength: 0.74,
            duration: 2,
          },
          accented: {
            steps:
              "..............x. | ........X....... | ............X... | ......x.........",
            division: 4,
            strength: 0.9,
            duration: 1.5,
          },
        },
      },
    ),
    familyEffect(
      "magnetic-strike",
      3,
      "Magnetic strike",
      "A kick-like magnetic strike lifts fixed-site spikes toward alternating poles and sends pressure rings across the mirror pool.",
      {
        strength: 0.85,
        duration: 0.42,
        styles: {
          restrained: {
            steps: "X............... | ..........x.....",
            division: 4,
            strength: 0.6,
            duration: 0.8,
          },
          driving: {
            steps: "X..x..X.X.X..x.. | X..x..X.X..x..X.",
            division: 4,
            strength: 0.9,
            duration: 0.42,
          },
          accented: {
            steps: "X..x..X.x.X...x. | X.x..X..X..x..X.",
            division: 4,
            strength: 1,
            duration: 0.4,
          },
        },
      },
    ),
  ],
  fragment,
};
