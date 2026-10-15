import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";
import { laserData } from "./scene-laser-data.mjs";

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
${laserData}
float gPixel, gSpace;
vec3 gRay;
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec4 lgData(int i, int row) {
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed, ivec2(i, row), 0);
#else
  return lgDatum(i, row);
#endif
}
float lgSegment2(vec2 p, vec2 a, vec2 b) {
  vec2 v = b - a;
  vec2 q = p - a - v * clamp(dot(p - a, v) / max(dot(v, v), 1e-8), 0.0, 1.0);
  return dot(q, q);
}

// Abramowitz-Stegun 7.1.26, max absolute error < 1.5e-7 (CPU tested).
float lgErf(float x) {
  float a = abs(x), t = 1.0 / (1.0 + 0.3275911 * a);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-a * a);
  return sign(x) * y;
}
// Cheap sheath-only erf: Abramowitz-Stegun 7.1.25, error < 4.7e-4.
// The crisp core retains the full-accuracy function above.
float lgSheathErf(float x) {
  float a = abs(x), a2 = a * a;
  float r = 1.0 / (1.0 + 0.278393 * a + 0.230389 * a2 + 0.000972 * a2 * a + 0.078108 * a2 * a2);
  return sign(x) * (1.0 - r * r * r * r);
}
// Integral along ro + t rd, t in [0, limit]. The beam is a Gaussian tube
// with longitudinal Gaussian envelope, clipped by its end planes. Sigma
// is homogeneous view extinction. Completing the square includes Beer
// attenuation EXACTLY; the axial envelope removes the parallel singularity.
float lgBeam(vec3 rd, vec3 d, float len, vec3 q, float z, float width, float limit, float sigma, bool sheath) {
  float c = dot(rd, d), axial = z + len * 0.5;
  float lo = 0.0, hi = limit;
  if (abs(c) < 1e-5) { if (axial < 0.0 || axial > len) return 0.0; }
  else {
    float t0 = -axial / c, t1 = (len - axial) / c;
    lo = max(lo, min(t0, t1)); hi = min(hi, max(t0, t1));
  }
  if (hi <= lo) return 0.0;
  float ell = len * 0.38;
  vec3 v = rd - c * d;
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
  float x1 = root * (hi - shift), x0 = root * (lo - shift);
  float coverage = sheath ? lgSheathErf(x1) - lgSheathErf(x0) : lgErf(x1) - lgErf(x0);
  return exp(exponent) * 0.886226925 / root * coverage;
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
  lgSetup();
  float level = clamp(u_level, 0.0, 1.0);
  gSpace = u_params[2];
  vec2 screen = (v_uv - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y) * 2.0;
  float focal = 1.5 * (1.0 + 0.02 * u_kick);
  vec2 view = screen / focal;
  uvec4 candidates = uvec4(65535u);
#ifdef PRECOMPUTED
  // One tile fetch replaces 53 per-pixel geometry/bounds lookups.
  if (all(lessThan(abs(view), vec2(2.0))))
    if (min(u_resolution.x, u_resolution.y) >= 180.0)
      candidates = uvec4(texelFetch(u_precomputed, ivec2(floor((view + 2.0) * 8.0)) + ivec2(0, 9), 0));
#endif
  gRay = normalize(gFw + gRight * view.x + gUp * view.y);
  gPixel = 2.0 / (min(u_resolution.x, u_resolution.y) * focal);

  float depth = 130.0, key = 1.0; vec2 gridUV = vec2(0.0);
  lgStrip(vec3(-9,0,0), vec3(1,0,0), 18.0, -9.0, depth, gridUV, key);
  float ct = gCt, st = gSt;
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
  float fog = exp(-depth * 0.032);
  float outerFade = mix(1.0 - smoothstep(26.5, 29.85, abs(gridUV.x)), 1.0, gFold);
  fog *= outerFade;
  vec3 col = mix(u_secondary, u_primary, 0.15) * (0.0015 + 0.035 * exp(-sq((gRay.y + 0.015) / 0.065)));
  if (depth < 129.0) {
    col += mix(u_secondary, u_primary, 0.13) * grid * fog * key * 0.24;
    col += mix(u_primary, u_secondary, 0.3) * major * fog * mix(0.35, 0.85, gFold);
    col += u_primary * seam * fog * gRise * 0.7;
    col += u_secondary * 0.009 * fog * key;
  }
  // Towers retain (side, bay, height seed) throughout. They rotate with the
  // side strip and retract into ribbed relief as the cathedral closes.
  float towerDepth = depth; vec3 towerP = vec3(0), towerSize = vec3(1); float towerLight = 0.0, towerId = 0.0;
  if (gRise > 0.001) for (int i = 0; i < 32; ++i) {
    uint mask = i < 16 ? candidates.x : candidates.y;
    if ((mask & (1u << uint(i % 16))) == 0u) continue;
    vec4 bounds = lgData(i, 2);
    if (any(lessThan(view, bounds.xy - gPixel * 4.0)) || any(greaterThan(view, bounds.zw + gPixel * 4.0))) continue;
    float side = (i % 2) == 0 ? -1.0 : 1.0;
    vec3 tx = vec3(side * ct, st, 0), ty = vec3(-side * st, ct, 0);
    vec3 origin = lgData(i, 0).xyz, size = lgData(i, 1).xyz;
    vec3 delta = gEye - origin;
    vec3 o = vec3(dot(delta, tx), dot(delta, ty), delta.z);
    vec3 d = vec3(dot(gRay, tx), dot(gRay, ty), gRay.z);
    // A thin antenna and its hot tip, analytically antialiased in screen.
    vec3 antennaBase = origin + ty * size.y;
    vec3 antennaTip = antennaBase + ty * (0.8 * gRise);
    vec2 antennaA = lgProject(antennaBase), antennaB = lgProject(antennaTip);
    float antenna = 1.0 - smoothstep(gPixel * gPixel * 0.2, gPixel * gPixel * 1.8, lgSegment2(view, antennaA, antennaB));
    float tip = exp(-dot(view - antennaB, view - antennaB) / sq(gPixel * 1.3));
    col += mix(u_primary, u_secondary, 0.35) * (antenna * 0.4 + tip * 1.7) * exp(-length(antennaTip - gEye) * 0.025);
    vec2 hit = lgBox(o, d, size);
    if (hit.x > 0.0 && hit.x < hit.y && hit.x < towerDepth) {
      towerDepth = hit.x; towerP = o + d * hit.x; towerSize = size;
      towerLight = 0.4 + 0.6 * abs(d.x); towerId = float(i);
    }
  }
  if (towerDepth < depth) {
    vec3 edgeDistance = abs(abs(towerP) - towerSize);
    // Analytic world footprint avoids derivatives across different box hits.
    vec3 edgeAA = vec3(max(0.008, gPixel * towerDepth * 0.8));
    vec3 edge = 1.0 - smoothstep(edgeAA * 0.55, edgeAA * 1.65, edgeDistance);
    float corners = max(max(min(edge.x, edge.y), min(edge.y, edge.z)), min(edge.z, edge.x));
    float rowCoordinate = (towerP.y + towerSize.y) / (gSpace * 0.38);
    float levels = lgLine(rowCoordinate, max(edgeAA.y / (gSpace * 0.38), 0.0001));
    float occupied = 0.3 + 0.7 * lgHash(floor(rowCoordinate + 0.5) + towerId * 31.0);
    float uprights = max(lgLine(towerP.x / 0.9, edgeAA.x / 0.9) * edge.z,
                         lgLine(towerP.z, edgeAA.z) * edge.x);
    depth = towerDepth;
    // The opaque faces need a low, directional wash behind the vector
    // skeleton. Otherwise foreground towers look like transparent boxes.
    float faceKey = edgeDistance.z < edgeDistance.x ? 0.45 : 1.0;
    float faceGradient = 0.35 + 0.65 * smoothstep(-towerSize.y, towerSize.y, towerP.y);
    col = mix(u_secondary, u_primary, 0.18) * 0.085 * faceKey * faceGradient * exp(-depth * 0.025);
    col += mix(u_secondary, u_primary, 0.68) *
      (corners * 1.35 + levels * occupied * 0.7 + uprights * 0.16) * exp(-depth * 0.025) * towerLight;
    col += u_secondary * 0.012 * towerLight * exp(-depth * 0.018);
  }

  float haze = u_params[3], limit = min(depth, 120.0);
  vec3 surface = gEye + gRay * depth;
  for (int i = 0; i < 21; ++i) {
    uint mask = i < 16 ? candidates.z : candidates.w;
    if ((mask & (1u << uint(i % 16))) == 0u) continue;
    vec4 endpoints = lgData(i, 5);
    vec4 metrics = lgData(i, 6);
    // Below thumbnail scale the AA core may exceed the .4-unit sheath;
    // retain all candidates instead of using a non-conservative bound.
    vec2 radii = min(u_resolution.x, u_resolution.y) < 180.0 ? vec2(1e6) : metrics.zw;
    if (!lgInsideTaper(view, endpoints.xy, endpoints.zw, radii + gPixel * 4.0)) continue;
    vec4 source = lgData(i, 3), target = lgData(i, 4);
    float weight = source.w;
    if (weight < 0.001) continue;
    vec3 a = source.xyz;
    vec4 axis = lgData(i, 7), eyeOffset = lgData(i, 8);
    float width = max(0.025, gPixel * metrics.y * 0.6);
    float core = 0.0;
    // The same conservative bound, tightened for the AA core.
    if (lgInsideTaper(view, endpoints.xy, endpoints.zw, radii * (width / 0.4) + gPixel * 2.0))
      core = lgBeam(gRay, axis.xyz, axis.w, eyeOffset.xyz, eyeOffset.w, width, limit, 0.014, false) / width;
    float volume = lgBeam(gRay, axis.xyz, axis.w, eyeOffset.xyz, eyeOffset.w, 0.18 + 0.22 * haze, limit, 0.021, true);
    vec3 ink = mix(u_primary, u_secondary, target.w);
    if (i > 0 && abs(mod(u_rhythmCount.x, 16.0) + 1.0 - float(i)) < 0.5)
      ink = mix(ink, u_accent, 0.75 * u_rhythm.x);
    float cosine = dot(axis.xyz, -gRay);
    float phaseBase = inversesqrt(1.09 - 0.6 * cosine);
    float phase = 0.91 * phaseBase * phaseBase * phaseBase;
    col += ink * weight * (core * 0.58 + volume * haze * phase * 0.27);
    // Opaque-surface scattering: the beam leaves a hot, AA impact dot.
    float along = clamp(dot(surface - a, axis.xyz), 0.0, axis.w);
    vec3 off = surface - a - axis.xyz * along;
    float spotWidth = max(0.1, gPixel * depth * 1.1);
    float spotRadius2 = dot(off, off) / sq(spotWidth);
    if (spotRadius2 < 12.0 && depth < 129.0)
      col += mix(ink, vec3(1), 0.2) * weight * exp(-spotRadius2) * 3.5;
  }
  // Liquid sky: a finite, softly filled scanning plane from a far emitter.
  // Analytic ray/plane crossing, with a grazing-angle cap, no volume march.
  vec3 sheetOrigin = vec3(0, mix(2.0, 7.2, gFold), 62);
  vec3 sheetNormal = normalize(vec3(0.16 * sin(gPhase), 1, 0.05 + 0.09 * sin(gPhase)));
  float sheetDenom = dot(gRay, sheetNormal);
  float sheetT = dot(sheetOrigin - gEye, sheetNormal) / (abs(sheetDenom) < 1e-5 ? 1e-5 : sheetDenom);
  vec3 sheetP = gEye + gRay * sheetT - sheetOrigin;
  float sheetSpan = smoothstep(1.0, 10.0, -sheetP.z) * (1.0 - smoothstep(40.0, 64.0, -sheetP.z));
  float sheetWidth = 1.0 - smoothstep(0.25, 0.8, abs(sheetP.x) / max(-sheetP.z, 0.1));
  float sheetRipples = 0.8 + 0.2 * sin(sheetP.z * 0.45 + 1.8 * sin(sheetP.x * 0.38 + gPhase));
  if (sheetT > 0.0 && sheetT < depth)
    col += mix(u_secondary, u_primary, 0.32) * sheetSpan * sheetWidth * sheetRipples * haze * mix(0.13, 0.24, gFold) * exp(-sheetT * 0.012) / max(abs(sheetDenom), 0.16);
  // A widening hollow cone reads as the classic laser tunnel in haze.
  vec3 coneV = gEye - vec3(0, 5.7, 55);
  float coneSlope = 0.19 + 0.025 * sin(gPhase * 2.0);
  float coneA = dot(gRay.xy, gRay.xy) - sq(coneSlope * gRay.z);
  float coneB = dot(coneV.xy, gRay.xy) - sq(coneSlope) * coneV.z * gRay.z;
  float coneC = dot(coneV.xy, coneV.xy) - sq(coneSlope * coneV.z);
  float discr = coneB * coneB - coneA * coneC;
  float coneAA = max(fwidth(discr) * 1.5, 0.00001);
  float coneEdge = smoothstep(0.0, coneAA, discr);
  if (discr > 0.0 && abs(coneA) > 1e-5 && gFold > 0.0) {
    float root = sqrt(discr);
    float t0 = (-coneB - root) / coneA, t1 = (-coneB + root) / coneA;
    // Beer-integrated homogeneous fill inside the finite cone. The ray
    // segment is additionally clipped to the mouth/apex z planes.
    // The tested camera is inside the first nappe. Use the FIRST positive
    // exit, not the second root on the cone's forward continuation.
    float exitT = min(t0 > 0.0 ? t0 : 1e6, t1 > 0.0 ? t1 : 1e6);
    float nearT = max(0.0, (2.0 - gEye.z) / max(gRay.z, 0.01));
    float farT = min(depth, exitT);
    farT = min(farT, (53.0 - gEye.z) / max(gRay.z, 0.01));
    float fill = max(0.0, exp(-nearT * 0.018) - exp(-farT * 0.018));
    col += mix(u_secondary, u_primary, 0.25) * fill * gFold * haze * 0.17;
    for (int side = 0; side < 2; ++side) {
      float t = (-coneB + (side == 0 ? -root : root)) / coneA;
      if (t <= 0.0 || t >= depth) continue;
      vec3 p = coneV + gRay * t;
      float env = smoothstep(0.0, 9.0, -p.z) * (1.0 - smoothstep(32.0, 55.0, -p.z));
      if (env < 0.0001) continue;
      vec3 normal = normalize(vec3(p.xy, -sq(coneSlope) * p.z));
      // Broad axial density waves reveal the cone's circular cross-section,
      // like a scan tunnel in real haze, rather than a flat starburst.
      float rings = exp(-sq((p.z + 36.0 + 4.0 * sin(gPhase)) / 1.15));
      rings += 0.55 * exp(-sq((p.z + 20.0 + 3.0 * sin(gPhase * 2.0)) / 0.95));
      col += mix(u_secondary, u_primary, 0.58) * gFold * env * haze * coneEdge * (0.09 + 0.44 * rings + 0.02 * sin(p.z * 0.45 + p.x * 0.4 + gPhase)) * exp(-t * 0.018) / max(abs(dot(normal, gRay)), 0.13);
    }
  }
  // Two finite scan fronts reveal the cone mouth at projector scale.
  // These are Gaussian axial density bands, evaluated at their centre plane;
  // the surrounding cone above supplies their continuous volumetric fill.
  if (gFold > 0.0) for (int ring = 0; ring < 2; ++ring) {
    float z = mix(12.0, 29.0, float(ring)) + 2.0 * sin(gPhase + float(ring) * PI);
    float t = (z - gEye.z) / max(gRay.z, 0.01);
    vec2 p = (gEye + gRay * t).xy - vec2(0, 5.7);
    float off = length(p) - coneSlope * (55.0 - z);
    float width = max(0.045, gPixel * t * 0.8);
    if (t <= 0.0 || t >= depth || abs(off) > width * 20.0) continue;
    float front = exp(-sq(off / width)) + 0.12 * exp(-sq(off / (width * 5.0)));
    col += mix(u_primary, u_secondary, 0.38) * front * gFold * haze * exp(-t * 0.014) * mix(2.2, 1.3, float(ring));
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
  precompute: {
    size: [32, 41],
    fragment: `${lateClockGlsl}\n${laserData}
void main() {
  lgSetup();
  int x = int(gl_FragCoord.x), row = int(gl_FragCoord.y);
  if (row < 9) { outColor = lgDatum(x, row); return; }
  vec2 lo = vec2(float(x), float(row - 9)) / 8.0 - 2.0;
  vec2 hi = lo + 0.125;
  uvec4 bits = uvec4(0u);
  if (gRise > 0.001) for (int i = 0; i < 32; ++i) {
    vec4 b = lgDatum(i, 2);
    if (all(greaterThanEqual(b.zw + 0.03, lo)) && all(lessThanEqual(b.xy - 0.03, hi))) {
      if (i < 16) bits.x |= 1u << uint(i); else bits.y |= 1u << uint(i - 16);
    }
  }
  for (int i = 0; i < 21; ++i) {
    if (lgDatum(i, 3).w < 0.001) continue;
    vec4 p = lgDatum(i, 5);
    vec4 metrics = lgDatum(i, 6);
    float radius = metrics.x + 0.03;
    vec2 b0 = min(p.xy, p.zw) - radius, b1 = max(p.xy, p.zw) + radius;
    if (all(greaterThanEqual(b1, lo)) && all(lessThanEqual(b0, hi)) &&
        lgInsideTaper((lo + hi) * 0.5, p.xy, p.zw, metrics.zw + 0.03 + 0.088388348)) {
      if (i < 16) bits.z |= 1u << uint(i); else bits.w |= 1u << uint(i - 16);
    }
  }
  outColor = vec4(bits);
}`,
  },
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
