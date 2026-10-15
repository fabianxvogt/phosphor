import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// Laser Grid (#105). Five extruded strips form ONE hinged sheet. The
// same material grid folds into walls and a pointed vault; seeded towers
// ride its hinges. Haze is an analytic anisotropic-Gaussian line integral,
// not a sampled volume. All geometry and phases survive development reversal.
const schema = [
  {
    key: "development",
    label: "Development · horizon / towers / tunnel",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "sweep",
    label: "Laser sweep",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "spacing",
    label: "Vector spacing",
    min: 1,
    max: 3,
    step: 0.01,
    default: 2,
  },
  {
    key: "haze",
    label: "Scattering haze",
    min: 0.1,
    max: 1,
    step: 0.01,
    default: 0.65,
  },
  {
    key: "spread",
    label: "Laser aperture",
    min: 0.3,
    max: 1.3,
    step: 0.01,
    default: 0.85,
  },
  {
    key: "height",
    label: "Tower height",
    min: 0.4,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "drift",
    label: "Camera glide",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "eye",
    label: "Eye height",
    min: 1.5,
    max: 5,
    step: 0.01,
    default: 2.8,
  },
];
const base = {
  sweep: 0.5,
  spacing: 2,
  haze: 0.65,
  spread: 0.85,
  height: 1,
  drift: 0.5,
  eye: 2.8,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Horizon", 10501, 0),
  look("Towers", 10501, 1),
  look("Tunnel", 10501, 2),
  look("Low Voltage", 10502, 0.3, {
    eye: 1.6,
    spacing: 2.8,
    sweep: 0.2,
    haze: 0.85,
  }),
  look("Vector District", 10503, 1, {
    eye: 4.5,
    spacing: 1.3,
    height: 1.25,
    spread: 1.1,
  }),
  look("Folded Chapel", 10504, 1.65, {
    eye: 2,
    spacing: 2.7,
    sweep: 0.25,
    haze: 0.9,
  }),
  look("Light Organ", 10505, 2, {
    spacing: 1.25,
    spread: 0.5,
    sweep: 0.65,
    eye: 3.7,
  }),
  look("Afterimage Arcade", 10506, 2, {
    spacing: 2.8,
    height: 0.5,
    spread: 1.25,
    drift: 0.9,
    haze: 0.45,
  }),
];

const fragment = `${lateClockGlsl}
float lgHash(float x) { return hash(vec2(x, 105.0)); }
float gPixel, gSpace, gFold, gRise, gPhase;
vec3 gEye, gRay;

// Abramowitz-Stegun 7.1.26, max absolute error < 1.5e-7 (CPU tested).
float lgErf(float x) {
  float a = abs(x), t = 1.0 / (1.0 + 0.3275911 * a);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-a * a);
  return sign(x) * y;
}
// Integral along ro + t rd, t in [0, limit]. The beam is a Gaussian tube
// with longitudinal Gaussian envelope, clipped by its end planes. Sigma
// is homogeneous view extinction. Completing the square includes Beer
// attenuation EXACTLY; the axial envelope removes the parallel singularity.
float lgBeam(vec3 ro, vec3 rd, vec3 start, vec3 end, float width, float limit, float sigma) {
  vec3 axis = end - start;
  float len = length(axis); vec3 d = axis / len;
  float c = dot(rd, d), axial = dot(ro - start, d);
  float lo = 0.0, hi = limit;
  if (abs(c) < 1e-5) { if (axial < 0.0 || axial > len) return 0.0; }
  else {
    float t0 = -axial / c, t1 = (len - axial) / c;
    lo = max(lo, min(t0, t1)); hi = min(hi, max(t0, t1));
  }
  if (hi <= lo) return 0.0;
  vec3 p = ro - (start + end) * 0.5;
  float z = dot(p, d), ell = len * 0.38;
  vec3 q = p - z * d, v = rd - c * d;
  float iw = 1.0 / (width * width), il = 1.0 / (ell * ell);
  float A = 0.5 * (dot(v, v) * iw + c * c * il);
  float B = dot(q, v) * iw + z * c * il;
  float tc = -B / (2.0 * A);
  // Conservative 6-sigma rejection before exp/erf, independent of derivatives.
  float nearT = clamp(tc, lo, hi);
  vec3 nearQ = q + v * nearT;
  float nearZ = z + c * nearT;
  if (0.5 * (dot(nearQ, nearQ) * iw + nearZ * nearZ * il) > 18.0) return 0.0;
  vec3 qc = q + v * tc; float zc = z + c * tc;
  float C = 0.5 * (dot(qc, qc) * iw + zc * zc * il);
  float root = sqrt(A), shift = tc - sigma / (2.0 * A);
  float exponent = -C - sigma * tc + sigma * sigma / (4.0 * A);
  return exp(exponent) * 0.886226925 / root *
    (lgErf(root * (hi - shift)) - lgErf(root * (lo - shift)));
}

// Analytic box intersection; the same tower's basis follows the sheet hinge.
vec2 lgBox(vec3 o, vec3 d, vec3 b) {
  vec3 inv = sign(d + vec3(1e-9)) / max(abs(d), vec3(1e-7));
  vec3 t0 = (-b - o) * inv, t1 = (b - o) * inv;
  vec3 nearT = min(t0, t1), farT = max(t0, t1);
  return vec2(max(max(nearT.x, nearT.y), nearT.z), min(min(farT.x, farT.y), farT.z));
}
float lgLine(float x, float footprint) {
  float d = abs(fract(x + 0.5) - 0.5);
  float w = max(footprint, 0.0001);
  return (1.0 - smoothstep(0.55 * w, 1.65 * w, d)) * (1.0 - smoothstep(0.25, 0.7, w));
}
// Every strip is one material interval of the original plane, extruded in z.
// Signed material x is kept at the hinge, so grid lines never re-index.
void lgStrip(vec3 basePoint, vec3 tangent, float span, float material,
             inout float depth, inout vec2 uv, inout float light) {
  vec3 normal = vec3(-tangent.y, tangent.x, 0.0);
  float denom = dot(gRay, normal);
  float t = dot(basePoint - gEye, normal) / (abs(denom) < 1e-6 ? 1e-6 : denom);
  vec3 hit = gEye + gRay * t;
  float u = dot(hit - basePoint, tangent);
  if (t > 0.0 && t < depth && u >= 0.0 && u <= span) {
    depth = t; uv = vec2(material + u, hit.z);
    light = 0.6 + 0.4 * abs(dot(normal, normalize(vec3(-0.4, 0.8, -0.5))));
  }
}
void main() {
  float dev = clamp(u_params[0], 0.0, 2.0);
  float level = clamp(u_level, 0.0, 1.0);
  gRise = smoothstep(0.0, 1.0, dev); gFold = smoothstep(1.0, 2.0, dev);
  gSpace = u_params[2];
#ifdef PHOSPHOR_LATE
  float motion = u_clock[0], camera = u_clock[1];
#else
  float motion = u_time * u_params[1] * 0.32;
  float camera = u_time * u_params[6] * 0.055;
#endif
  // All uses are integer harmonics; reduce uniform phases before spatial sums.
  gPhase = mod(motion, TAU); camera = mod(camera, TAU);
  float seedAngle = lgHash(41.0) * TAU;
  gEye = vec3(1.1 * sin(camera + seedAngle), u_params[7] + 0.25 * sin(camera * 2.0), -9.0 + 1.8 * cos(camera));
  vec3 target = vec3(0.8 * sin(camera), mix(1.9, 6.0, gFold), 34.0);
  vec3 fw = normalize(target - gEye), right = normalize(cross(vec3(0,1,0), fw)), up = cross(fw, right);
  vec2 screen = (v_uv - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y) * 2.0;
  float focal = 1.5 * (1.0 + 0.02 * u_kick);
  gRay = normalize(fw * focal + right * screen.x + up * screen.y);
  gPixel = 2.0 / (min(u_resolution.x, u_resolution.y) * focal);

  float depth = 130.0, key = 1.0; vec2 gridUV = vec2(0.0);
  lgStrip(vec3(-9,0,0), vec3(1,0,0), 18.0, -9.0, depth, gridUV, key);
  float theta = gFold * PI * 0.5;
  float ct = cos(theta), st = sin(theta);
  for (int sideIndex = 0; sideIndex < 2; ++sideIndex) {
    float side = sideIndex == 0 ? -1.0 : 1.0;
    vec3 tangent = vec3(side * ct, st, 0);
    lgStrip(vec3(side * 9.0,0,0), tangent, 11.0, 9.0, depth, gridUV, key);
    vec3 roofBase = vec3(side * (9.0 + 11.0 * ct), 11.0 * st, 0);
    float roofAngle = gFold * (PI - 0.42);
    lgStrip(roofBase, vec3(side * cos(roofAngle),sin(roofAngle),0), 9.85665208, 20.0, depth, gridUV, key);
  }
  // Derivatives must be outside fragment-dependent hit branches.
  vec2 footprint = max(fwidth(gridUV / gSpace), vec2(0.0001));
  float grid = max(lgLine(gridUV.x / gSpace, footprint.x), lgLine(gridUV.y / gSpace, footprint.y));
  float fine = max(lgLine(gridUV.x * 2.0 / gSpace, footprint.x * 2.0), lgLine(gridUV.y * 2.0 / gSpace, footprint.y * 2.0));
  grid = max(grid, fine * 0.22 * smoothstep(0.25, 0.9, level));
  float major = lgLine(gridUV.y / (gSpace * 4.0), footprint.y / 4.0);
  float seamDistance = min(abs(abs(gridUV.x) - 9.0), abs(abs(gridUV.x) - 20.0));
  float seamAA = max(footprint.x * gSpace, 0.001);
  float seam = 1.0 - smoothstep(seamAA * 0.55, seamAA * 1.65, seamDistance);
  float fog = exp(-depth * 0.026);
  float outerFade = mix(1.0 - smoothstep(26.5, 29.85, abs(gridUV.x)), 1.0, gFold);
  fog *= outerFade;
  vec3 col = u_secondary * (0.0015 + 0.012 * exp(-sq((gRay.y + 0.015) / 0.055)));
  if (depth < 129.0) {
    col += mix(u_secondary, u_primary, 0.13) * grid * fog * key * 0.32;
    col += mix(u_primary, u_secondary, 0.3) * major * fog * mix(0.18, 0.46, gFold);
    col += u_primary * seam * fog * gRise * 0.42;
    col += u_secondary * 0.009 * fog * key;
  }
  // Towers retain (side, bay, height seed) throughout. They rotate with the
  // side strip and retract into ribbed relief as the cathedral closes.
  float towerDepth = depth; vec3 towerP = vec3(0), towerSize = vec3(1); float towerLight = 0.0;
  for (int i = 0; i < 12; ++i) {
    float fi = float(i), side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
    float bay = floor(fi / 2.0), u = 2.8 + 4.5 * mod(bay, 2.0);
    float h = (4.5 + 4.5 * lgHash(fi + 7.0)) * u_params[5] * gRise * mix(1.0, 0.16, gFold);
    vec3 tx = vec3(side * ct, st, 0), ty = vec3(-side * st, ct, 0);
    vec3 origin = vec3(side * 9.0, 0, 9.0 + bay * 8.0) + tx * u + ty * (h * 0.5);
    vec3 delta = gEye - origin;
    vec3 o = vec3(dot(delta, tx), dot(delta, ty), delta.z);
    vec3 d = vec3(dot(gRay, tx), dot(gRay, ty), gRay.z);
    vec3 size = vec3(1.35, max(h * 0.5, 0.0001), 1.5);
    vec2 hit = lgBox(o, d, size);
    if (h > 0.015 && hit.x > 0.0 && hit.x < hit.y && hit.x < towerDepth) {
      towerDepth = hit.x; towerP = o + d * hit.x; towerSize = size;
      towerLight = 0.4 + 0.6 * abs(d.x);
    }
  }
  vec3 edgeDistance = abs(abs(towerP) - towerSize);
  vec3 edgeAA = max(fwidth(towerP), vec3(gPixel * towerDepth));
  vec3 edge = 1.0 - smoothstep(edgeAA * 0.55, edgeAA * 1.65, edgeDistance);
  float corners = max(max(min(edge.x, edge.y), min(edge.y, edge.z)), min(edge.z, edge.x));
  float levels = lgLine((towerP.y + towerSize.y) / (gSpace * 0.6), max(edgeAA.y / (gSpace * 0.6), 0.0001));
  float uprights = max(lgLine(towerP.x / 0.9, edgeAA.x / 0.9) * edge.z,
                       lgLine(towerP.z, edgeAA.z) * edge.x);
  if (towerDepth < depth) {
    depth = towerDepth;
    col = u_secondary * 0.004 + mix(u_secondary, u_primary, 0.68) *
      (corners * 1.15 + levels * 0.46 + uprights * 0.25) * exp(-depth * 0.025) * towerLight;
  }

  float haze = u_params[3], aperture = u_params[4] * (1.0 + 0.12 * u_rhythm.y);
  float limit = min(depth, 120.0);
  for (int i = 0; i < 17; ++i) {
    float fi = float(i), weight = 1.0;
    vec3 a, b;
    if (i == 0) {
      a = vec3(0.0, 3.4, 65.0);
      b = vec3(12.0 * sin(gPhase), 2.5 + 1.2 * sin(gPhase * 2.0), -15.0);
    } else {
      float bank = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
      float index = floor((fi - 1.0) / 2.0), k = (index - 3.5) / 3.5;
      // Interleaved upper/lower cohorts survive even at low energy.
      float cohort = mix(index * 0.5, mod(index, 4.0), gFold);
      weight = gRise * smoothstep(cohort - 0.65, cohort + 0.65, 0.7 + 2.7 * level + 0.4 * gFold);
      float upper = step(3.5, index);
      a = vec3(bank * mix(10.0, 7.8, gFold), 1.0 + 10.0 * upper * gFold, 49.0 - 10.0 * upper * gFold);
      float open = mix(0.35, 1.0, gFold);
      vec3 fanEnd = vec3((k * 15.0 * aperture + bank * 5.0 * sin(gPhase)) * open,
        3.0 + open * (3.0 + 6.0 * sin(gPhase + k * 1.45 + bank * 1.5)), -17.0);
      float local = (mod(index, 4.0) - 1.5) / 1.5;
      vec3 crossEnd = vec3(-bank * (4.5 + local * 3.2 * aperture) + 2.2 * sin(gPhase),
        mix(11.0, 1.2, upper) + local * 2.2 * aperture + 1.0 * sin(gPhase + bank), -11.0);
      b = mix(fanEnd, crossEnd, gFold);
    }
    if (weight < 0.001) continue;
    float width = max(0.022, gPixel * length((a + b) * 0.5 - gEye) * 0.48);
    float core = lgBeam(gEye, gRay, a, b, width, limit, 0.014) / width;
    float volume = lgBeam(gEye, gRay, a, b, 0.18 + 0.22 * haze, limit, 0.021);
    vec3 ink = mix(u_primary, u_secondary, i == 0 ? 0.05 : 0.35 + 0.4 * mod(fi, 2.0));
    // Rare accent: one selected beam, never an entire fan or the ground.
    if (i > 0 && abs(mod(u_rhythmCount.x, 16.0) + 1.0 - fi) < 0.5)
      ink = mix(ink, u_accent, 0.75 * u_rhythm.x);
    // A bounded phase function gives the forward-scattered sheath depth,
    // while the narrow integral remains the crisp vector signature.
    float cosine = dot(normalize(b - a), -gRay);
    float phase = 0.91 / pow(1.09 - 0.6 * cosine, 1.5);
    col += ink * weight * (core * 0.24 + volume * haze * phase * 0.075);
  }
  // A sparse travelling grid rib, not a whole-frame beat flash.
  float rib = exp(-sq((gridUV.y - (52.0 - 58.0 * u_rhythm.z)) / 0.65));
  col += u_accent * rib * grid * fog * gRise * u_rhythm.z * 0.5;
  outColor = vec4(max(col, vec3(0)), 1.0);
}
`;

export default {
  id: "laser",
  number: 105,
  name: "Laser Grid",
  description:
    "A vector plane raises wireframe towers, then folds into a vaulted laser cathedral. Crisp material grid lines and sweeping laser fans inhabit analytically integrated scattering haze.",
  development: "development",
  schema,
  presets,
  fragment,
  stage: ["sweep", "haze", "spread"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { sweep: { mul: [0.75, 1.35] }, drift: { mul: [0.75, 1.35] } },
  beat: { punch: 0.15, pulse: 0.1 },
  rhythm: [
    familyEffect(
      "beam-address",
      0,
      "Beam address",
      "One persistent laser in the fan receives a brief accent.",
      { period: 4, strength: 0.55, duration: 1 },
    ),
    familyEffect(
      "aperture-breath",
      1,
      "Aperture breath",
      "The laser fan opens by a bounded twelve percent.",
      { period: 8, strength: 0.65, duration: 2, kind: "motion" },
    ),
    familyEffect(
      "vault-rib",
      2,
      "Vault rib",
      "A narrow light rib travels along the same folded material grid.",
      { period: 16, strength: 0.65, duration: 3 },
    ),
  ],
  clocks: [
    { rate: (p) => p[1] * 0.32, period: 2 * Math.PI },
    { rate: (p) => p[6] * 0.055, period: 2 * Math.PI },
  ],
};
