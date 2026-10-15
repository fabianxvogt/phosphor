import { familyEffect } from "./family-rhythm.mjs";

// Liquid Chrome (#101). The fixed triangular lattice is sampled in a
// stereographic material chart; development deforms its carrier ellipsoid,
// never its seed, spacing or cell indices. No simulation restart on reversal.
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

const fragment = `
float gForm, gLift, gPhase, gCam, gBreath, gAmp, gPixel, gWidth;
vec3 gRadii, gCentre;
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
  vec3 n = q / max(length(q), 0.00001);
  vec2 chart = n.xz / (1.0 + abs(n.y));
  vec2 cell = ferroHex((chart + vec2(0.031, -0.017)) / 0.28) * 0.28;
  float peak = max(0.0, 1.0 - length(cell) / 0.139);
  // Peaks have conical tips and rounded shoulders, not plastic bubbles.
  float spikes = peak * peak;
  float upper = mix(smoothstep(-0.1, 0.3, n.y), 1.0, gLift);
  return spikes * upper;
}
float ferroMap(vec3 p) {
  vec3 q = p - gCentre;
  q.xz = gRotation * q.xz;
  vec3 v = q / gRadii;
  float k0 = length(v), k1 = length(q / (gRadii * gRadii));
  float body = k0 * (k0 - 1.0) / max(k1, 0.0001);
  // Regularize the ellipsoid estimator at its centre. This changes no
  // exterior zero set, but keeps the entire field continuous on reversal.
  body = mix(-min(gRadii.x, gRadii.y), body, smoothstep(0.15, 0.5, k0));
  float shell = smoothstep(0.3, 0.8, k0);
  return max(body - gAmp * ferroProfile(v) * shell, -p.y - 0.003);
}
vec2 ferroBound(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 p = ro - c;
  float b = dot(p, rd), h = b * b - dot(p, p) + r * r;
  return h < 0.0 ? vec2(1.0, -1.0) : vec2(-b - sqrt(h), -b + sqrt(h));
}
float ferroMarch(vec3 ro, vec3 rd) {
  vec2 bound = ferroBound(ro, rd, gCentre, max(gRadii.x, gRadii.y) + gAmp + 0.025);
  float t = max(bound.x, 0.0);
  for (int i = 0; i < 144; ++i) {
    if (t > bound.y) break;
    float d = ferroMap(ro + rd * t);
    if (d < max(0.00045, t * gPixel * 0.24)) return t;
    t += max(d * mix(0.7, 0.32, gForm), 0.0002);
  }
  return 100.0;
}
vec3 ferroNormal(vec3 p, float t) {
  float e = max(0.0012, t * gPixel * 1.1);
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
  float aa = max(gPixel * 3.0, 0.035);
  float panel = (1.0 - smoothstep(-aa, aa, max(edge.x, edge.y))) * step(0.0, z);
  return panel * (0.7 + 0.3 * exp(-dot(uv, uv) * 0.8));
}
vec3 ferroStudio(vec3 d) {
  vec3 primary = mix(u_primary, vec3(1.0), 0.82);
  vec3 silver = mix(u_secondary, vec3(1.0), 0.76);
  vec3 col = silver * (0.018 + 0.04 * smoothstep(-0.6, 0.7, d.y));
  // Large reflected diffusion cards describe the curvature between strips.
  col += silver * 0.22 * pow(max(dot(d, normalize(vec3(0.4, 0.8, 0.6))), 0.0), 7.0);
  col += primary * 0.12 * pow(max(dot(d, normalize(vec3(-0.8, 0.4, -0.4))), 0.0), 4.0);
  col += silver * ferroBox(d, vec3(-0.25, 1.0, 0.2), 0.75, 0.4) * 0.28;
  col += primary * ferroBox(d, vec3(-0.65, 0.65, 0.6), 0.31 * gWidth, 0.95) * 1.2;
  col += mix(u_secondary, vec3(1.0), 0.6) * ferroBox(d, vec3(0.8, 0.45, 0.1), 0.65, 0.23 * gWidth) * 1.35;
  col += primary * ferroBox(d, vec3(0.1, 0.25, -1.0), 0.075 * gWidth, 1.2) * 1.6;
  col += u_accent * ferroBox(d, vec3(-0.85, 0.1, -0.5), 0.024 * gWidth, 0.6) * 1.2;
  col += primary * 0.15 * exp(-sq((d.y - 0.06) / 0.09));
  return col;
}
vec3 ferroMetal(vec3 p, vec3 n, vec3 rd, float cavity) {
  vec3 reflection = reflect(rd, n);
  float fresnel = 0.88 + 0.12 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  vec3 col = ferroStudio(reflection) * fresnel * cavity;
  // A dark conductor: no coloured diffuse lobe. Only a grazing soft rim.
  col += mix(u_secondary, vec3(1.0), 0.2) * 0.025 * pow(1.0 - abs(dot(n, rd)), 3.0);
  return col;
}
void main() {
  float dev = clamp(u_params[0], 0.0, 2.0);
  gForm = smoothstep(0.0, 1.0, dev);
  gLift = smoothstep(1.0, 2.0, dev);
#ifdef PHOSPHOR_LATE
  gPhase = u_clock[0];
  gCam = u_clock[1];
#else
  gPhase = u_time * u_params[2] * 0.22;
  gCam = u_time * u_params[3] * 0.045;
#endif
  float seedAngle = float(u_seedBits % 997u) * 0.0063;
  gBreath = sin(gPhase);
  gRotation = rot2(0.15 * sin(gPhase) + seedAngle);
  float impulse = 1.0 + 0.11 * u_kick + 0.12 * u_rhythm.x;
  gAmp = gForm * (0.25 + 0.16 * gLift) * u_params[1] * impulse;
  gRadii = mix(vec3(1.65, 0.30 + 0.018 * gBreath, 1.65), vec3(0.96), gLift);
  gRadii.y *= 1.0 + 0.035 * u_rhythm.y + 0.025 * u_level * sin(gPhase * 2.0);
  gCentre = vec3(0.0, 0.23 + 1.25 * gLift + 0.035 * sin(gPhase) * gLift, 0.0);
  gPixel = 1.0 / min(u_resolution.x, u_resolution.y);
  gWidth = u_params[5];

  float az = 0.55 + gCam + 0.08 * sin(gPhase);
  float el = 0.34 + 0.5 * u_params[4] + 0.02 * sin(gCam);
  vec3 target = vec3(0.0, 0.28 + 0.98 * gLift, 0.0);
  vec3 ro = target + 7.6 * vec3(cos(el) * sin(az), sin(el), cos(el) * cos(az));
  vec3 fw = normalize(target - ro), right = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fw);
  vec2 uv = aspectUV() / min(u_resolution.x / u_resolution.y, 1.0);
  float focal = 1.7 * u_params[7] * (1.0 + 0.022 * u_kick);
  vec3 accumulated = vec3(0.0);
  // Two deterministic subpixel rays resolve sharp conductor glints. There
  // is no temporal noise, so nothing shimmers when paused or at late times.
  for (int sampleIndex = 0; sampleIndex < 2; ++sampleIndex) {
  vec2 jitter = vec2(0.24, 0.19) * (sampleIndex == 0 ? -1.0 : 1.0) * gPixel;
  vec3 rd = normalize(fw * focal + right * (uv.x + jitter.x) + up * (uv.y + jitter.y));
  vec3 col = u_secondary * (0.003 + 0.003 * exp(-dot(uv, uv) * 3.0));

  // Analytic black mirror pool. The basin has no hard frame boundary.
  float floorT = -ro.y / min(rd.y, -0.00001);
  vec3 floorP = ro + rd * floorT;
  float pool = 1.0 - smoothstep(2.1, 2.55, length(floorP.xz));
  if (rd.y < -0.0001) {
    vec3 reflection = reflect(rd, vec3(0.0, 1.0, 0.0));
    float shadow = 1.0 - 0.8 * exp(-dot(floorP.xz, floorP.xz) / (1.6 + gLift));
    col += mix(u_secondary, vec3(1.0), 0.4) * (0.008 + 0.012 * pool) * shadow;
    // One actual SDF bounce in the pool, rather than a generic ball shadow.
    // Trace from the pool surface so the clipped base cannot occlude it.
    if (pool > 0.001 && gLift > 0.01) {
      vec3 reflectionOrigin = floorP + vec3(0.0, 0.008, 0.0);
      float rt = ferroMarch(reflectionOrigin, reflection);
      if (rt < 90.0) {
        vec3 rp = reflectionOrigin + reflection * rt;
        col += ferroMetal(rp, ferroNormal(rp, rt), reflection, 0.75) * 0.17 * pool * gLift;
      }
    }
    float rim = exp(-sq((length(floorP.xz) - 2.3) / 0.032));
    col += mix(u_primary, vec3(1.0), 0.65) * rim * 0.04;
  }
  float hit = ferroMarch(ro, rd);
  bool mainHit = hit < 90.0;
  vec3 normal = vec3(0.0);
  if (mainHit) {
    vec3 p = ro + rd * hit;
    normal = ferroNormal(p, hit);
    vec3 q = p - gCentre; q.xz = gRotation * q.xz;
    float cavity = 0.55 + 0.45 * ferroProfile(q / gRadii);
    cavity = mix(1.0, cavity, gForm);
    col = ferroMetal(p, normal, rd, cavity);
    col *= 0.7 + 0.3 * smoothstep(-0.05, 0.25, p.y);
  }
  // Persistent satellite indices; radius grows continuously out of the body.
  for (int i = 0; i < 7; ++i) {
    float id = float(i), a = id * 2.39996323 + gPhase + seedAngle;
    float growth = gLift * gLift * u_params[6];
    float radius = (0.10 + 0.05 * sin(id * 7.1)) * growth * (0.65 + 0.35 * u_level);
    vec3 centre = gCentre + vec3(cos(a) * (1.7 + 0.12 * sin(a * 2.0)), sin(a + id) * 0.85, sin(a) * 1.7);
    centre += normalize(centre - gCentre) * 0.14 * u_rhythm.z;
    vec2 span = ferroBound(ro, rd, centre, radius);
    if (radius > 0.0001 && span.x > 0.0 && span.x < span.y && span.x < hit) {
      hit = span.x;
      vec3 p = ro + rd * hit;
      vec3 n = normalize(p - centre);
      col = ferroMetal(p, n, rd, 1.0);
    }
  }
  // Lens falloff is stable in portrait too; no output-aspect dependent crop.
  col *= 1.0 - 0.15 * smoothstep(0.6, 1.6, length(uv));
  accumulated += col * 0.5;
  }
  outColor = vec4(max(accumulated, vec3(0.0)), 1.0);
}
`;

export default {
  id: "ferro",
  number: 101,
  name: "Liquid Chrome",
  description:
    "A black mirror pool grows a hexagonal crown of ferrofluid spikes, then lifts into a floating chrome sculpture with orbiting droplets. Palette light strips reflect in the dark metal.",
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
  ],
  rhythm: [
    familyEffect(
      "spike-swell",
      0,
      "Spike swell",
      "The magnetic crown swells without changing its hexagonal cell identities.",
      { period: 4, strength: 0.55, duration: 1.25 },
    ),
    familyEffect(
      "field-breath",
      1,
      "Field breath",
      "A slow magnetic breath stretches the same liquid body.",
      { period: 8, strength: 0.5, duration: 2 },
    ),
    familyEffect(
      "droplet-orbit",
      2,
      "Droplet orbit",
      "The persistent chrome satellites drift out from the sculpture.",
      { period: 16, strength: 0.6, duration: 2.5 },
    ),
  ],
  fragment,
};
