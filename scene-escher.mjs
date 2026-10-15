import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

export const ESCHER_STEPS = 48;
export const ESCHER_RISE = 0.045;
export const DROSTE_SCALE = 3;
export const DROSTE_TURN = Math.PI / 6;
// The height lives on a covering space, not on a globally single-valued
// Euclidean loop. Each local tread rises; the last-to-first join is projective.
export function penroseHeight(tread) {
  return Math.floor(tread) * ESCHER_RISE;
}
export function stairIdentity(seed) {
  return Array.from({ length: ESCHER_STEPS }, (_, id) => {
    const side = Math.floor(id / 12),
      u = ((id % 12) + 0.5) / 12;
    const a = 1.5,
      x = -a + 2 * a * u;
    const flat = [
      [x, -a],
      [a, x],
      [-x, a],
      [-a, -x],
    ][side];
    const h = penroseHeight(id) - 1.0575;
    return { id, side, seed, centre: [flat[0] + 0.6 * h, h, flat[1] + h] };
  });
}
// Log-polar quotient. Multiplication by scale and rotation by turn leaves
// the chart invariant, including its angle: exact Droste monodromy.
export function drosteMap([x, y], phase = 0) {
  const r = Math.max(Math.hypot(x, y), 1e-30);
  const log = Math.log(r) / Math.log(DROSTE_SCALE) + phase;
  const cell = Math.floor(log),
    f = log - cell;
  const angle = Math.atan2(y, x) - DROSTE_TURN * (log - phase);
  const radius = Math.exp(f * Math.log(DROSTE_SCALE));
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}
const schema = [
  {
    key: "development",
    label: "Development · stair / relativity / infinity",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "motion",
    label: "Lantern motion",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.7,
  },
  {
    key: "view",
    label: "Impossible perspective",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0.15,
  },
  {
    key: "width",
    label: "Stair breadth",
    min: 0.7,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
  {
    key: "arcade",
    label: "Arcade depth",
    min: 0.3,
    max: 1.2,
    step: 0.01,
    default: 0.8,
  },
  {
    key: "lanterns",
    label: "Walking lanterns",
    min: 0.2,
    max: 1,
    step: 0.01,
    default: 0.7,
  },
  {
    key: "scale",
    label: "Architectural scale",
    min: 0.75,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "twist",
    label: "Recursive turn",
    min: -1,
    max: 1,
    step: 0.01,
    default: 1,
  },
];
const base = {
  motion: 0.7,
  view: 0.15,
  width: 1,
  arcade: 0.8,
  lanterns: 0.7,
  scale: 1,
  twist: 1,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Stair", 11001, 0),
  look("Relativity", 11001, 1),
  look("Infinity", 11001, 2),
  look("Chalk Procession", 11002, 0, {
    view: -0.6,
    width: 1.3,
    arcade: 1.1,
    motion: 0.35,
  }),
  look("Three Gravities", 11003, 1, { view: 0.6, width: 0.8, lanterns: 1 }),
  look("Ivory Labyrinth", 11004, 1.45, {
    width: 1.25,
    arcade: 1.2,
    scale: 0.9,
    twist: -0.5,
  }),
  look("Endless Atrium", 11005, 2, { twist: 1, width: 0.8, motion: 1.1 }),
  look("Night Loggia", 11006, 0.65, {
    arcade: 1.2,
    width: 0.75,
    view: -0.8,
    lanterns: 0.4,
  }),
];
const fragment = `${lateClockGlsl}
float gDev, gRel, gInf, gPhase, gCamera, gWidth, gDepth, gPixel;
vec3 gDirection;
mat2 gGravity;
float gHalfHeight;
// Conservative Chebyshev box distance: the exact same zero set, no square
// root in the hot loop. A lower bound remains safe for sphere tracing.
float esBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return max(q.x, max(q.y, q.z)); }
float esFlightBound(vec3 p) {
  float y = gHalfHeight;
  float d = esBox(p - vec3(-0.486, -0.81 - y, -2.31), vec3(1.6645, 0.2495 + y, 0.2495 + 0.24 * gWidth));
  d = min(d, esBox(p - vec3(1.338, -0.27 - y, -0.27), vec3(0.1505 + 0.24 * gWidth, 0.2495 + y, 1.7635)));
  d = min(d, esBox(p - vec3(0.162, 0.27 - y, 1.77), vec3(1.3675, 0.2495 + y, 0.2495 + 0.24 * gWidth)));
  return min(d, esBox(p - vec3(-1.014, 0.81 - y, 0.81), vec3(0.1505 + 0.24 * gWidth, 0.2495 + y, 1.2685)));
}
vec3 esCentre(float id) {
  float side = floor(id / 12.0), u = (mod(id, 12.0) + 0.5) * 0.25 - 1.5;
  vec2 plan;
  if (side < 0.5) plan = vec2(u, -1.5);
  else if (side < 1.5) plan = vec2(1.5, u);
  else if (side < 2.5) plan = vec2(-u, 1.5);
  else plan = vec2(-1.5, -u);
  float h = id * 0.045 - 1.0575;
  return vec3(plan.x + 0.6 * h, h, plan.y + h);
}
float esAddress(vec2 c) {
  float side, u;
  if (abs(c.y) >= abs(c.x)) {
    if (c.y < 0.0) { side = 0.0; u = c.x; }
    else { side = 2.0; u = -c.x; }
  } else {
    if (c.x > 0.0) { side = 1.0; u = c.y; }
    else { side = 3.0; u = -c.y; }
  }
  return side * 12.0 + clamp((u + 1.5) * 4.0 - 0.5, 0.0, 11.0);
}
float esOtherAddress(vec2 c) {
  float side, u;
  if (abs(c.y) >= abs(c.x)) {
    if (c.x > 0.0) { side = 1.0; u = c.y; }
    else { side = 3.0; u = -c.y; }
  } else {
    if (c.y < 0.0) { side = 0.0; u = c.x; }
    else { side = 2.0; u = -c.x; }
  }
  return side * 12.0 + clamp((u + 1.5) * 4.0 - 0.5, 0.0, 11.0);
}
vec2 esRing(vec3 p) {
  float bound = esFlightBound(p);
  if (bound > 0.08) return vec2(bound, 0.0);
  vec2 chart = p.xz - vec2(0.6, 1.0) * (p.y + 0.17);
  float address = floor(esAddress(chart));
  vec2 pierChart = p.xz - vec2(0.6, 1.0) * (p.y + 0.55 * gDepth);
  float pierAddress = floor(esAddress(pierChart) / 3.0) * 3.0;
  vec2 result = vec2(100.0, 0.0);
  // Separate nearest addresses for the treads and the lower arcade. A low
  // pier must not disappear just because its top lives on another chart.
  for (int j = 0; j < 2; ++j) {
    float id = mod(address + float(j) + 48.0, 48.0);
    vec3 q = p - esCentre(id);
    if (mod(floor(id / 12.0), 2.0) > 0.5) q.xz = q.zx;
    float d = esBox(q + vec3(0.0, 0.17, 0.0), vec3(0.139, 0.17, 0.24 * gWidth));
    if (d < result.x) result = vec2(d, id);
    id = mod(pierAddress + float(j) * 3.0 + 48.0, 48.0);
    q = p - esCentre(id);
    if (mod(floor(id / 12.0), 2.0) > 0.5) q.xz = q.zx;
    d = esBox(q + vec3(0.0, 0.55 * gDepth, 0.0), vec3(0.065, 0.55 * gDepth, 0.19 * gWidth));
    if (d < result.x) result = vec2(d, id + 144.0);
  }
  // Both charts meet at each corner. Searching only the winning sector
  // leaves subpixel cracks when the privileged ray skims that boundary.
  if (abs(abs(chart.x) - abs(chart.y)) < 0.5) {
    float id = mod(floor(esOtherAddress(chart) + 0.5) + 48.0, 48.0);
    vec3 q = p - esCentre(id);
    if (mod(floor(id / 12.0), 2.0) > 0.5) q.xz = q.zx;
    float d = esBox(q + vec3(0.0, 0.17, 0.0), vec3(0.139, 0.17, 0.24 * gWidth));
    if (d < result.x) result = vec2(d, id);
  }
  if (abs(abs(pierChart.x) - abs(pierChart.y)) < 0.65) {
    float id = mod(floor(esOtherAddress(pierChart) / 3.0) * 3.0 + 48.0, 48.0);
    vec3 q = p - esCentre(id);
    if (mod(floor(id / 12.0), 2.0) > 0.5) q.xz = q.zx;
    float d = esBox(q + vec3(0.0, 0.55 * gDepth, 0.0), vec3(0.065, 0.55 * gDepth, 0.19 * gWidth));
    if (d < result.x) result = vec2(d, id + 144.0);
  }
  return result;
}
vec2 esMap(vec3 p) {
  vec2 best = esRing(p);
  if (gRel > 0.001) {
    float s = gRel * 0.78;
    vec3 q = p - vec3(-0.85, 0.9, -0.6) * gRel;
    q.xy = gGravity * q.xy;
    vec2 a = esRing(q / max(s, 0.001)); a.x *= s; a.y += 48.0;
    if (a.x < best.x) best = a;
    q = p - vec3(0.7, 0.85, -0.7) * gRel;
    q.yz = transpose(gGravity) * q.yz;
    a = esRing(q / max(s, 0.001)); a.x *= s; a.y += 96.0;
    if (a.x < best.x) best = a;
  }
  return best;
}
vec3 esNormal(vec3 p, float t, float material) {
  bool pier = material >= 144.0;
  float id = mod(material, 48.0), frame = floor(mod(material, 144.0) / 48.0);
  float sc = frame < 0.5 ? 1.0 : gRel * 0.78;
  if (frame > 0.5 && frame < 1.5) { p -= vec3(-0.85, 0.9, -0.6) * gRel; p.xy = rot2(1.57079632679 * gRel) * p.xy; }
  if (frame > 1.5) { p -= vec3(0.7, 0.85, -0.7) * gRel; p.yz = rot2(-1.57079632679 * gRel) * p.yz; }
  vec3 q = p / sc - esCentre(id);
  bool odd = mod(floor(id / 12.0), 2.0) > 0.5;
  if (odd) q.xz = q.zx;
  vec3 b = pier ? vec3(0.065, 0.55 * gDepth, 0.19 * gWidth) : vec3(0.139, 0.17, 0.24 * gWidth);
  q.y += b.y;
  float e = max(0.002, t * gPixel * 0.3) / sc;
  vec3 n = normalize(sign(q) * exp(clamp((abs(q) - b) / e, -60.0, 0.0)));
  if (odd) n.xz = n.zx;
  if (frame > 0.5 && frame < 1.5) n.xy = rot2(-1.57079632679 * gRel) * n.xy;
  if (frame > 1.5) n.yz = rot2(1.57079632679 * gRel) * n.yz;
  return n;
}
float esShadow(vec3 p, vec3 light) {
  float shade = 1.0, t = 0.035;
  for (int i = 0; i < 4; ++i) {
    float d = esMap(p + light * t).x;
    shade = min(shade, 10.0 * d / t);
    t += clamp(d, 0.06, 0.3);
    if (t > 3.0 || shade < 0.02) break;
  }
  return clamp(shade, 0.15, 1.0);
}
vec3 esMarch(vec3 ro, vec3 rd) {
  float b = dot(ro, rd), discr = b * b - dot(ro, ro) + 24.0;
  if (discr < 0.0) return vec3(100.0, 0.0, 0.0);
  float t = max(0.0, -b - sqrt(discr)), farT = -b + sqrt(discr);
  for (int i = 0; i < 88; ++i) {
    vec2 field = esMap(ro + rd * t);
    if (field.x < max(0.001, t * gPixel * 0.3)) return vec3(t, field.y, 1.0);
    t += max(field.x * 0.9, 0.001);
    if (t > farT) break;
  }
  return vec3(t, 0.0, 0.0);
}
vec2 esDroste(vec2 p, float phase) {
  float r = max(length(p), 0.00001);
  float logRadius = log(r) / 1.0986122886681098 + phase;
  float angle = atan(p.y, p.x) - 0.5235987755982988 * (logRadius - phase);
  float radius = exp(fract(logRadius) * 1.0986122886681098);
  return radius * vec2(cos(angle), sin(angle));
}
void main() {
  gDev = clamp(u_params[0], 0.0, 2.0);
  gRel = smoothstep(0.0, 1.0, gDev);
  gInf = smoothstep(1.0, 2.0, gDev);
#ifdef PHOSPHOR_LATE
  gPhase = u_clock[0]; gCamera = u_clock[1];
#else
  gPhase = u_time * u_params[1] * 0.12; gCamera = u_time * 0.035;
#endif
  gWidth = u_params[3]; gDepth = u_params[4];
  gHalfHeight = max(0.17, 0.55 * gDepth);
  gGravity = rot2(1.57079632679 * gRel);
  gPixel = 1.0 / min(u_resolution.x, u_resolution.y);
  vec2 uv = aspectUV() / min(u_resolution.x / u_resolution.y, 1.0);
  vec2 screen = uv;
  // A continuous ray-space deformation; no rendered-image crossfade.
  if (gInf > 0.001) {
    float r = max(length(uv), 0.00001);
    float cell = min(0.0, floor(log(r / 0.09) / 1.0986122886681098));
    if (cell < 0.0) {
      vec2 recursive = esDroste(uv / 0.09, 0.0) * 0.09;
      recursive = rot2(cell * (u_params[7] * 1.0471975511965976 - 0.5235987755982988 + gCamera)) * recursive;
      screen = mix(uv, recursive, gInf);
    }
    screen = rot2(gInf * u_params[7] * 0.8 * log(max(length(screen), 0.025) / 0.3)) * screen;
  }
  gDirection = normalize(vec3(0.6, 1.0, 1.0));
  vec3 direction = normalize(gDirection + vec3(0.012 * sin(gCamera) + 0.009 * u_params[2], 0.0, -0.008 * sin(gCamera)));
  vec3 fw = -direction, right = normalize(cross(fw, vec3(0.0, 1.0, 0.0))), up = cross(right, fw);
  float framing = (5.7 + 0.6 * gRel - 0.4 * gInf) / u_params[6] / (1.0 + 0.018 * u_kick);
  vec3 ro = direction * 9.0 + vec3(0.0, 0.45 * gRel, 0.0) + right * screen.x * framing + up * screen.y * framing;
  vec3 rd = fw;
  vec3 col = u_secondary * (0.003 + 0.018 * exp(-dot(screen, screen) * 6.0));
  // Dark stage, soft contact pool and palette light spilled below the piers.
  float groundT = (-2.25 - ro.y) / rd.y;
  vec3 ground = ro + rd * groundT;
  float pool = exp(-dot(ground.xz, ground.xz) * 0.16);
  col += u_secondary * pool * 0.025;
  col += u_primary * exp(-sq(length(ground.xz) - 2.4) * 3.0) * 0.018;
  vec3 traced = esMarch(ro, rd);
  float t = traced.x;
  vec2 field = traced.xy;
  bool hit = traced.z > 0.5;
  if (hit) {
    vec3 p = ro + rd * t, n = esNormal(p, t, field.y);
    vec3 key = normalize(vec3(-0.7, 1.0, 0.35));
    float shadow = esShadow(p + n * 0.008, key);
    float ao = 1.0;
    for (int i = 1; i <= 2; ++i) {
      float d = 0.06 * float(i);
      ao -= max(0.0, d - esMap(p + n * d).x) * 1.6 / float(i);
    }
    ao = clamp(ao, 0.25, 1.0);
    vec3 plaster = mix(vec3(0.92), u_secondary, 0.06);
    vec3 keyColour = mix(u_primary, vec3(1.0), 0.72);
    vec3 rimColour = mix(u_secondary, vec3(1.0), 0.28);
    float diffuse = max(dot(n, key), 0.0);
    float rim = pow(1.0 - abs(dot(n, rd)), 3.0);
    col = plaster * (0.09 + 1.1 * diffuse * shadow) * ao * keyColour;
    col += rimColour * (0.22 + 0.3 * rim) * max(dot(n, normalize(vec3(1.0, 0.3, -0.7))), 0.0) * ao;
    float tread = mod(field.y, 48.0);
    float packet = exp(-sq((tread - mod(gPhase * 5.0 + u_rhythmCount.x * 3.0, 48.0)) / 2.1));
    col += u_primary * packet * u_rhythm.x * 0.55 * max(n.y, 0.0);
    col += u_secondary * u_rhythm.y * 0.18 * pow(max(0.0, dot(n, -rd)), 3.0);
    col *= exp(-max(0.0, t - 7.0) * 0.055);
  }
  // Small persistent lights walk the lifted stair chart under each gravity.
  for (int frame = 0; frame < 3; ++frame) {
    if (frame > 0 && gRel < 0.001) break;
    float sc = frame == 0 ? 1.0 : gRel * 0.78;
    for (int i = 0; i < 4; ++i) {
      float id = float(i) * 12.0 + float(u_seedBits % 11u) * 0.31 + gPhase * 3.0;
      float at = mod(id, 48.0), lo = floor(at);
      vec3 c = mix(esCentre(lo), esCentre(mod(lo + 1.0, 48.0)), fract(at));
      c.y += 0.15;
      vec3 gravity = vec3(0.0, 1.0, 0.0);
      if (frame == 1) { c.xy = rot2(-1.57079632679 * gRel) * c.xy; gravity.xy = rot2(-1.57079632679 * gRel) * gravity.xy; c *= sc; c += vec3(-0.85, 0.9, -0.6) * gRel; }
      if (frame == 2) { c.yz = rot2(1.57079632679 * gRel) * c.yz; gravity.yz = rot2(1.57079632679 * gRel) * gravity.yz; c *= sc; c += vec3(0.7, 0.85, -0.7) * gRel; }
      vec3 delta = c - ro;
      float along = dot(delta, rd), dist = length(delta - along * rd);
      if (dist > 0.24 * sc) continue;
      float visibility = along < t + 0.06 || !hit ? 1.0 : 0.0;
      float radius = (0.025 + 0.012 * u_level) * sc * u_params[5];
      float core = 1.0 - smoothstep(radius, radius + gPixel * framing * 1.5, dist);
      float halo = exp(-dist * dist / max(0.0001, 0.006 * sc * sc));
      vec3 projected = delta - along * rd;
      vec3 stem = -gravity * 0.12 * sc;
      stem -= rd * dot(stem, rd);
      float nearest = clamp(-dot(projected, stem) / max(dot(stem, stem), 0.000001), 0.0, 1.0);
      float stemDistance = length(projected + stem * nearest);
      float body = 1.0 - smoothstep(0.006 * sc, 0.006 * sc + gPixel * framing * 1.5, stemDistance);
      col += mix(u_primary, u_accent, 0.75) * (core * 4.0 + halo * 0.32 + body * 0.8) * visibility * (1.0 + 0.3 * u_rhythm.z);
    }
  }
  // The infinitely small levels converge below the pixel footprint, rather
  // than aliasing into a bright moving pinhole at the logarithmic centre.
  float resolved = mix(1.0, smoothstep(gPixel * 1.5, gPixel * 4.0, length(uv)), gInf);
  col = mix(u_secondary * 0.015, col, resolved);
  col *= 1.0 - 0.15 * smoothstep(0.4, 1.4, length(uv));
  outColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;
export default {
  id: "escher",
  number: 110,
  name: "Impossible Stairs",
  description:
    "A white plaster staircase climbs into its own beginning, opens to three gravities and spirals into an endless recursive atrium.",
  development: "development",
  schema,
  presets,
  stage: ["width", "arcade", "twist"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { motion: { mul: [0.65, 1.35] } },
  beat: { punch: 0.1, pulse: 0.08 },
  clocks: [
    { rate: (p) => p[1] * 0.12, period: 48 },
    { rate: () => 0.035, period: 2 * Math.PI },
  ],
  rhythm: [
    familyEffect(
      "tread-procession",
      0,
      "Tread procession",
      "A local light packet climbs the same persistent impossible treads.",
      { period: 4, strength: 0.55, duration: 1.25 },
    ),
    familyEffect(
      "gravity-light",
      1,
      "Gravity light",
      "A soft stage light reveals the three stair orientations.",
      { period: 8, strength: 0.45, duration: 2 },
    ),
    familyEffect(
      "recursive-lantern",
      2,
      "Recursive lantern",
      "The walking lanterns breathe together through every recursive level.",
      { period: 16, strength: 0.6, duration: 2.5 },
    ),
  ],
  fragment,
};
