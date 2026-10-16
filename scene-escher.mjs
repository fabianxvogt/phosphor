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
float gHalfHeight, gFlightScale;
float esGrain(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec4 x = fract(vec4(i.x, i.x + 1.0, i.x, i.x + 1.0) * 0.1031);
  vec4 y = fract(vec4(i.y, i.y, i.y + 1.0, i.y + 1.0) * 0.1031);
  vec4 z = x;
  vec4 d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  vec4 h = fract((x + y + 2.0 * d) * (z + d));
  return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
}
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
vec3 esFlightCentre(float id) {
  return vec3((id - 5.5) * 0.25, (id - 5.5) * 0.13, 0.0);
}
// Fixed outer-loop landings are the hinges, never detached assembly parts.
vec3 esLanding(float frame) { return esCentre(frame < 1.5 ? 30.0 : 6.0); }
vec3 esFrame(vec3 p, float frame) {
  p -= esLanding(frame);
  if (frame < 1.5) p.xy = gGravity * p.xy;
  else p.yz = transpose(gGravity) * p.yz;
  return p / max(gFlightScale, 0.001) + esFlightCentre(0.0);
}
vec3 esWorld(vec3 p, float frame) {
  p = (p - esFlightCentre(0.0)) * gFlightScale;
  if (frame < 1.5) p.xy = transpose(gGravity) * p.xy;
  else p.yz = gGravity * p.yz;
  return p + esLanding(frame);
}
vec2 esStraight(vec3 p) {
  float id = clamp(floor(p.x * 4.0 + 6.0), 0.0, 11.0);
  vec3 q = p - esFlightCentre(id);
  float d = esBox(q + vec3(0.0, 0.15, 0.0), vec3(0.128, 0.15, 0.29 * gWidth));
  float support = esBox(vec3(p.x, (p.y - 0.52 * p.x + 0.24) / 1.127, p.z), vec3(1.55, 0.075, 0.31 * gWidth)) / 1.5;
  return d < support ? vec2(d, id) : vec2(support, 36.0);
}
vec2 esMap(vec3 p) {
  vec2 best = esRing(p);
  if (gRel > 0.001) {
    for (int frame = 1; frame <= 2; ++frame) {
      vec2 a = esStraight(esFrame(p, float(frame)));
      a.x *= gFlightScale; a.y += float(frame) * 48.0;
      if (a.x < best.x) best = a;
    }
  }
  return best;
}
vec3 esNormal(vec3 p, float t, float material) {
  bool pier = material >= 144.0;
  float id = mod(material, 48.0), frame = floor(mod(material, 144.0) / 48.0);
  float sc = frame < 0.5 ? 1.0 : gFlightScale;
  if (frame > 0.5) {
    vec3 q = esFrame(p, frame);
    vec3 b = id > 30.0 ? vec3(1.55, 0.075, 0.31 * gWidth) : vec3(0.128, 0.15, 0.29 * gWidth);
    if (id > 30.0) q.y = (q.y - 0.52 * q.x + 0.24) / 1.127;
    else q -= esFlightCentre(id) - vec3(0.0, 0.15, 0.0);
    vec3 n = normalize(sign(q) * exp(clamp((abs(q) - b) / 0.007, -60.0, 0.0)));
    if (id > 30.0) n = normalize(vec3(n.x - 0.52 * n.y, n.y, n.z));
    if (frame < 1.5) n.xy = transpose(gGravity) * n.xy;
    else n.yz = gGravity * n.yz;
    return n;
  }
  vec3 q = p / sc - esCentre(id);
  bool odd = mod(floor(id / 12.0), 2.0) > 0.5;
  if (odd) q.xz = q.zx;
  vec3 b = pier ? vec3(0.065, 0.55 * gDepth, 0.19 * gWidth) : vec3(0.139, 0.17, 0.24 * gWidth);
  q.y += b.y;
  float e = max(0.007, t * gPixel * 0.3) / sc;
  vec3 n = normalize(sign(q) * exp(clamp((abs(q) - b) / e, -60.0, 0.0)));
  if (odd) n.xz = n.zx;
  if (frame > 0.5 && frame < 1.5) n.xy = rot2(-1.57079632679 * gRel) * n.xy;
  if (frame > 1.5) n.yz = rot2(1.57079632679 * gRel) * n.yz;
  return n;
}
float esShadow(vec3 p, vec3 light);
float esBoxHit(vec3 ro, vec3 rd, vec3 c, vec3 b) {
  vec3 inv = 1.0 / (rd + vec3(1e-9));
  vec3 a = (c - b - ro) * inv, z = (c + b - ro) * inv;
  vec3 nearT = min(a, z), farT = max(a, z);
  float lo = max(nearT.x, max(nearT.y, nearT.z));
  float hi = min(farT.x, min(farT.y, farT.z));
  return hi >= max(lo, 0.0) ? max(lo, 0.0) : 100.0;
}
vec3 esMarch(vec3 ro, vec3 rd) {
  vec3 best = vec3(100.0, 0.0, 0.0);
  // The projection annihilates the covering-space lift. Three neighbours
  // per flight conservatively cover its finite thickness and camera sway.
  vec2 treadChart = (ro + rd * ((-0.17 - ro.y) / rd.y)).xz;
  vec2 pierChart = (ro + rd * ((-0.55 * gDepth - ro.y) / rd.y)).xz;
  for (int side = 0; side < 4; ++side) {
    bool odd = side == 1 || side == 3;
    float u = side == 0 ? treadChart.x : side == 1 ? treadChart.y : side == 2 ? -treadChart.x : -treadChart.y;
    float v = side == 0 ? pierChart.x : side == 1 ? pierChart.y : side == 2 ? -pierChart.x : -pierChart.y;
    float edge = side < 2 ? -1.5 : 1.5;
    if (side == 1) edge = 1.5;
    if (side == 3) edge = -1.5;
    float perpendicular = odd ? treadChart.x : treadChart.y;
    float pierPerpendicular = odd ? pierChart.x : pierChart.y;
    if (abs(perpendicular - edge) > 0.62 && abs(pierPerpendicular - edge) > 1.02) continue;
    float address = floor((u + 1.5) * 4.0);
    float pierAddress = floor(((v + 1.5) * 4.0 - 0.5) / 3.0 + 0.5) * 3.0;
    for (int j = -1; j <= 1; ++j) {
      float id = float(side) * 12.0 + clamp(address + float(j), 0.0, 11.0);
      vec3 b = odd ? vec3(0.24 * gWidth, 0.17, 0.139) : vec3(0.139, 0.17, 0.24 * gWidth);
      float t = esBoxHit(ro, rd, esCentre(id) - vec3(0.0, 0.17, 0.0), b);
      if (t < best.x) best = vec3(t, id, 1.0);
      id = float(side) * 12.0 + clamp(pierAddress + float(j) * 3.0, 0.0, 9.0);
      b = odd ? vec3(0.19 * gWidth, 0.55 * gDepth, 0.065) : vec3(0.065, 0.55 * gDepth, 0.19 * gWidth);
      t = esBoxHit(ro, rd, esCentre(id) - vec3(0.0, 0.55 * gDepth, 0.0), b);
      if (t < best.x) best = vec3(t, id + 144.0, 1.0);
    }
  }
  if (gRel > 0.001) for (int frame = 1; frame <= 2; ++frame) {
    vec3 o = esFrame(ro, float(frame)), d = esFrame(ro + rd, float(frame)) - o;
    for (int i = 0; i < 12; ++i) {
      float t = esBoxHit(o, d, esFlightCentre(float(i)) - vec3(0.0, 0.15, 0.0), vec3(0.128, 0.15, 0.29 * gWidth));
      if (t < best.x) best = vec3(t, float(frame * 48 + i), 1.0);
    }
    o.y = (o.y - 0.52 * o.x + 0.24) / 1.127;
    d.y = (d.y - 0.52 * d.x) / 1.127;
    float t = esBoxHit(o, d, vec3(0.0), vec3(1.55, 0.075, 0.31 * gWidth));
    if (t < best.x) best = vec3(t, float(frame * 48 + 36), 1.0);
  }
  return best;
}
// Exact directional visibility: conservative flight bounds reject empty
// rays, then analytic slabs cast crisp tread and column silhouettes.
float esShadow(vec3 p, vec3 light) {
  for (int side = 0; side < 4; ++side) {
    bool odd = side == 1 || side == 3;
    vec3 a = esCentre(float(side * 12)), z = esCentre(float(side * 12 + 11));
    vec3 w = odd ? vec3(0.24 * gWidth, gHalfHeight, 0.139) : vec3(0.139, gHalfHeight, 0.24 * gWidth);
    vec3 c = (a + z) * 0.5 - vec3(0.0, gHalfHeight, 0.0);
    if (esBoxHit(p, light, c, abs(z - a) * 0.5 + w + 0.002) > 99.0) continue;
    for (int j = 0; j < 12; ++j) {
      float id = float(side * 12 + j);
      vec3 b = odd ? vec3(0.24 * gWidth, 0.17, 0.139) : vec3(0.139, 0.17, 0.24 * gWidth);
      if (esBoxHit(p, light, esCentre(id) - vec3(0.0, 0.17, 0.0), b) < 99.0) return 0.08;
      if (j % 3 == 0) {
        b = odd ? vec3(0.19 * gWidth, 0.55 * gDepth, 0.065) : vec3(0.065, 0.55 * gDepth, 0.19 * gWidth);
        if (esBoxHit(p, light, esCentre(id) - vec3(0.0, 0.55 * gDepth, 0.0), b) < 99.0) return 0.08;
      }
    }
  }
  if (gRel > 0.001) for (int frame = 1; frame <= 2; ++frame) {
    vec3 o = esFrame(p, float(frame)), d = esFrame(p + light, float(frame)) - o;
    if (esBoxHit(o, d, vec3(0.0, -0.15, 0.0), vec3(1.56, 1.0, 0.32 * gWidth)) > 99.0) continue;
    for (int j = 0; j < 12; ++j)
      if (esBoxHit(o, d, esFlightCentre(float(j)) - vec3(0.0, 0.15, 0.0), vec3(0.128, 0.15, 0.29 * gWidth)) < 99.0) return 0.08;
    o.y = (o.y - 0.52 * o.x + 0.24) / 1.127;
    d.y = (d.y - 0.52 * d.x) / 1.127;
    if (esBoxHit(o, d, vec3(0.0), vec3(1.55, 0.075, 0.31 * gWidth)) < 99.0) return 0.08;
  }
  return 1.0;
}
vec2 esDroste(vec2 p, float phase) {
  float r = max(length(p), 0.00001);
  float logRadius = log(r) / 1.0986122886681098 + phase;
  float angle = atan(p.y, p.x) - 0.5235987755982988 * (logRadius - phase);
  float radius = exp(fract(logRadius) * 1.0986122886681098);
  return radius * vec2(cos(angle), sin(angle));
}
// Exact courtyard intersections keep the enclosing architecture out of the
// expensive stair marcher. Arches are open apertures, never painted decals.
vec4 esHall(vec3 ro, vec3 rd) {
  vec4 hit = vec4(100.0, 0.0, 0.0, 0.0);
  float floorT = (-2.15 - ro.y) / rd.y;
  if (floorT > 0.0) hit = vec4(floorT, 0.0, 1.0, 0.0);
  for (int wall = 0; wall < 2; ++wall) {
    for (int layer = 0; layer < 2; ++layer) {
      float plane = -3.4 - float(layer) * 1.4;
      float t = (plane - (wall == 0 ? ro.z : ro.x)) / (wall == 0 ? rd.z : rd.x);
      vec3 p = ro + rd * t;
      float h = p.y + 2.15;
      float across = wall == 0 ? p.x : p.z;
      float bay = mod(across + 0.8, 1.6) - 0.8;
      float storey = floor(h / 2.7), localH = h - storey * 2.7;
      bool opening = abs(bay) < 0.51 && (localH < 1.35 || length(vec2(bay, localH - 1.35)) < 0.51);
      if (localH > 2.48) opening = false;
      if (h >= 0.0 && h < 5.4 && abs(across) < 8.0 && !opening && t > 0.0 && t < hit.x)
        hit = vec4(t, wall == 0 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0));
      // Inner cylindrical soffit and straight jambs give each arch 0.24 m
      // of visible masonry depth, including proper silhouette occlusion.
      float centre = across - bay;
      vec2 o = vec2((wall == 0 ? ro.x : ro.z) - centre, ro.y + 0.8 - storey * 2.7);
      vec2 d2 = vec2(wall == 0 ? rd.x : rd.z, rd.y);
      float aa = dot(d2, d2), bb = dot(o, d2), disc = bb * bb - aa * (dot(o, o) - 0.2601);
      if (disc > 0.0 && storey >= 0.0 && storey < 2.0 && abs(centre) < 8.0) {
        float at = (-bb + sqrt(disc)) / aa;
        vec3 q = ro + rd * at;
        float depth = (wall == 0 ? q.z : q.x) - plane;
        vec2 radial = o + d2 * at;
        if (radial.y > 0.0 && depth > -0.24 && depth < 0.0 && at > 0.0 && at < hit.x) {
          vec2 n = -radial / 0.51;
          hit = vec4(at, wall == 0 ? vec3(n.x, n.y, 0.0) : vec3(0.0, n.y, n.x));
        }
      }
      for (int jamb = -1; jamb <= 1; jamb += 2) {
        float at = (centre + float(jamb) * 0.51 - (wall == 0 ? ro.x : ro.z)) / (wall == 0 ? rd.x : rd.z);
        vec3 q = ro + rd * at;
        float depth = (wall == 0 ? q.z : q.x) - plane;
        if (storey >= 0.0 && storey < 2.0 && abs(centre) < 8.0 && q.y > -2.15 + storey * 2.7 && q.y < -0.8 + storey * 2.7 && depth > -0.24 && depth < 0.0 && at > 0.0 && at < hit.x)
          hit = vec4(at, wall == 0 ? vec3(-float(jamb), 0.0, 0.0) : vec3(0.0, 0.0, -float(jamb)));
      }
    }
  }
  for (int wall = 0; wall < 2; ++wall) {
    float planeT = (-3.16 - (wall == 0 ? ro.z : ro.x)) / (wall == 0 ? rd.z : rd.x);
    vec3 onPlane = ro + rd * planeT;
    float i = floor(((wall == 0 ? onPlane.x : onPlane.z) - 0.8) / 1.6 + 0.5);
    if (abs(i) > 3.0) continue;
    vec2 c = wall == 0 ? vec2(i * 1.6 + 0.8, -3.16) : vec2(-3.16, i * 1.6 + 0.8);
    vec2 q = ro.xz - c;
    float a = dot(rd.xz, rd.xz), b = dot(q, rd.xz), d = b * b - a * (dot(q, q) - 0.0225);
    if (d < 0.0) continue;
    float t = (-b - sqrt(d)) / a;
    vec3 p = ro + rd * t;
    if (p.y > -2.15 && p.y < 2.8 && t > 0.0 && t < hit.x)
      hit = vec4(t, normalize(vec3(p.x - c.x, 0.0, p.z - c.y)));
  }
  return hit;
}
vec3 esPlaster(vec3 p, vec3 n, vec3 rd, float shadow, float ao, float t) {
  vec3 key = normalize(vec3(-0.45, 1.0, 0.65));
  float diffuse = max(dot(n, key), 0.0);
  vec3 ivory = mix(u_secondary, vec3(1.0), 0.52);
  vec2 stoneUV = abs(n.y) > 0.5 ? p.xz : abs(n.x) > 0.5 ? p.zy : p.xy;
  float broad = esGrain(stoneUV * 14.0);
  float grain = sin(stoneUV.x * 73.0 + stoneUV.y * 41.0) * sin(stoneUV.y * 67.0 - stoneUV.x * 29.0) * 0.5 + 0.5;
  float stone = 0.73 + 0.30 * broad + 0.09 * (grain - 0.5) * exp(-gPixel * t * 150.0);
  // Broad bounced key and bevel normals, not chalk faces and black shadows.
  vec3 col = ivory * (0.075 + 0.92 * diffuse * mix(0.25, 1.0, shadow)) * ao * stone;
  col += u_secondary * 0.18 * max(dot(n, normalize(vec3(1.0, 0.4, -0.5))), 0.0) * ao;
  col += mix(u_secondary, vec3(1.0), 0.35) * pow(1.0 - abs(dot(n, rd)), 4.0) * 0.055;
  col += u_primary * 0.12 * exp(-length(p - vec3(-2.2, -1.8, -2.5)) * 0.65);
  col += u_secondary * 0.12 * exp(-length(p - vec3(2.0, -1.8, 0.0)) * 0.7);
  // The leading lantern is a point light as well as a visible object. Its
  // spill crosses tread/material boundaries and lights adjacent jambs.
  // Outer-loop source crosses material boundaries; the smaller gravity
  // flights use their own compact surface wakes below, avoiding three
  // expensive point-light evaluations on every distant wall fragment.
  if (u_rhythm.w > 0.001) {
    float head = mod(u_rhythmCount.w * 3.0, 48.0);
    vec3 source = esCentre(head);
    source.y += 0.20;
    if (mod(floor(head / 12.0), 2.0) > 0.5) source.x += 0.12 * gWidth;
    else source.z += 0.12 * gWidth;
    vec3 delta = source - p;
    float r2 = dot(delta, delta);
    float spill = max(0.0, 1.0 - r2 / 0.9) / (0.10 + r2);
    col += mix(u_primary, u_accent, 0.85) * u_rhythm.w * spill * 0.22 * (0.12 + 0.88 * max(dot(n, delta * inversesqrt(max(r2, 0.00001))), 0.0)) * ao;
  }
  return mix(col, u_secondary * 0.012, 1.0 - exp(-max(0.0, t - 6.0) * 0.075));
}
void main() {
  gDev = clamp(u_params[0], 0.0, 2.0);
  gRel = smoothstep(0.0, 1.0, gDev);
  gFlightScale = gRel * 0.65;
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
  uv *= exp(gInf * 0.14 * sin(gCamera));
  vec2 screen = uv;
  float recursiveDepth = 0.0;
  // A continuous ray-space deformation; no rendered-image crossfade.
  if (gInf > 0.001) {
    float r = max(length(uv), 0.00001);
    float cell = min(0.0, floor(log(r / 0.3) / 1.0986122886681098));
    if (cell < 0.0) {
      recursiveDepth = max(0.0, -log(r / 0.3) / 1.0986122886681098) * gInf;
      vec2 recursive = esDroste(uv / 0.3, 0.0) * 0.3;
      recursive = rot2(cell * (u_params[7] * 1.0471975511965976 - 0.5235987755982988 + gCamera)) * recursive;
      screen = mix(uv, recursive, gInf);
    }
    screen = rot2(gInf * u_params[7] * 0.8 * log(max(length(screen), 0.025) / 0.3)) * screen;
  }
  gPixel *= mix(1.0, pow(3.0, recursiveDepth), gInf);
  gDirection = normalize(vec3(0.6, 1.0, 1.0));
  vec3 direction = normalize(gDirection + vec3(0.012 * sin(gCamera) + 0.009 * u_params[2], 0.0, -0.008 * sin(gCamera)));
  vec3 fw = -direction, right = normalize(cross(fw, vec3(0.0, 1.0, 0.0))), up = cross(right, fw);
  float framing = (4.05 + 0.75 * gRel - 0.65 * gInf) / u_params[6] / (1.0 + 0.018 * u_kick);
  framing *= mix(1.4, 1.0, smoothstep(0.65, 1.2, u_resolution.x / u_resolution.y));
  vec3 ro = direction * 9.0 + vec3(0.0, 0.45 * gRel, 0.0) + right * screen.x * framing + up * screen.y * framing;
  vec3 rd = fw;
  vec3 col = u_secondary * (0.003 + 0.018 * exp(-dot(screen, screen) * 6.0));
  vec4 hall = esHall(ro, rd);
  vec3 traced = esMarch(ro, rd);
  float t = traced.x;
  vec2 field = traced.xy;
  bool hit = traced.z > 0.5 && t < hall.x;
  if (!hit) t = hall.x;
  if (!hit && hall.x < 99.0) {
    vec3 p = ro + rd * hall.x, n = hall.yzw;
    float shade = 1.0;
    if (n.y > 0.5 && dot(p.xz, p.xz) < 24.0)
      shade = esShadow(p + n * 0.012, normalize(vec3(-0.45, 1.0, 0.65)));
    float corner = n.y > 0.5 ? min(abs(p.x + 3.4), abs(p.z + 3.4)) : min(p.y + 2.15, n.z > 0.5 ? abs(p.x + 3.4) : abs(p.z + 3.4));
    float ao = 0.4 + 0.6 * smoothstep(0.0, 0.7, corner);
    col = esPlaster(p, n, rd, shade, ao, hall.x) * 0.52;
    if (n.y > 0.5) {
      vec2 tile = abs(fract(p.xz * 0.8) - 0.5);
      float grout = smoothstep(0.475, 0.49, max(tile.x, tile.y));
      col *= (0.12 + 0.055 * (1.0 - grout));
      col += u_secondary * 0.08 * exp(-dot(p.xz, p.xz) * 0.12);
    } else {
      float h = mod(p.y + 2.15, 2.7), bay = mod((n.z > 0.5 ? p.x : p.z) + 0.8, 1.6) - 0.8;
      float radius = length(vec2(bay, h - 1.35));
      float arch = abs(radius - 0.58);
      float band = (1.0 - smoothstep(0.07, 0.09, arch)) * step(1.35, h);
      float angle = atan(bay, max(0.001, h - 1.35));
      float seam = 1.0 - smoothstep(0.015, 0.035, abs(fract(angle * 4.0) - 0.5));
      col *= 0.92 + 0.17 * band - 0.24 * band * seam;
      float grazing = 0.25 + 0.75 * max(0.0, cos(angle - 0.65));
      float rim = exp(-sq((radius - 0.55) / 0.065)) * step(1.35, h);
      col += mix(u_secondary, vec3(1.0), 0.18) * rim * grazing * (0.15 - 0.07 * seam);
      col += u_secondary * 0.04 * exp(-sq((h - 1.8) / 1.3)) * (0.5 + 0.5 * cos(bay * 3.0));
      // Restrained string courses and carved stone joints, resolution-safe.
      float course = exp(-sq((h - 2.55) / 0.055));
      col *= 1.0 - 0.32 * course;
      // Recessed door lanterns are sparse scale cues, not glowing outlines.
      float sconce = length(vec2(abs(bay) - 0.65, h - 0.96));
      float lampAA = max(gPixel * framing * 1.5, 0.008);
      float lens = 1.0 - smoothstep(0.022, 0.022 + lampAA, sconce);
      float door = floor(((n.z > 0.5 ? p.x : p.z) + 0.8) / 1.6);
      float inhabited = smoothstep(0.75 - 0.42 * u_level, 0.82 - 0.42 * u_level, fract(door * 0.618034 + 0.3));
      vec3 flame = mix(u_primary, u_accent, 0.85);
      col += flame * inhabited * (lens * 2.5 + 0.16 * exp(-sconce * 5.0));
      if (abs(n.x) > 0.02 && abs(n.z) > 0.02 && abs(n.y) < 0.01)
        col *= 0.88 + 0.12 * cos(atan(n.z, n.x) * 16.0);
    }
  }
  if (hit) {
    vec3 p = ro + rd * t, n = esNormal(p, t, field.y);
    vec3 key = normalize(vec3(-0.45, 1.0, 0.65));
    // Directional visibility cannot affect a face whose key irradiance is
    // zero; skip the exhaustive box search on those coherent face regions.
    float shadow = dot(n, key) > 0.0 ? esShadow(p + n * 0.008, key) : 1.0;
    float ao = 1.0;
    for (int i = 1; i <= 2; ++i) {
      float d = 0.06 * float(i);
      ao -= max(0.0, d - esMap(p + n * d).x) * 1.6 / float(i);
    }
    ao = clamp(ao, 0.25, 1.0);
    col = esPlaster(p, n, rd, shadow, ao, t);
    float tread = mod(field.y, 48.0);
    float packet = exp(-sq((tread - mod(gPhase * 5.0 + u_rhythmCount.x * 3.0, 48.0)) / 2.1));
    col += u_primary * packet * u_rhythm.x * 0.55 * max(n.y, 0.0);
    col += u_secondary * u_rhythm.y * 0.65 * pow(max(0.0, dot(n, -rd)), 3.0);
    // Counted lanterns climb actual tread addresses, including both gravity
    // flights. No time-driven impostor pulse and no development-locked event.
    float frame = floor(mod(field.y, 144.0) / 48.0);
    float span = frame < 0.5 ? 48.0 : 12.0;
    float head = mod(u_rhythmCount.w * 3.0 + frame * 4.0, span);
    float behind = mod(head - tread + span, span);
    float ascent = exp(-behind * 0.72) * u_rhythm.w;
    vec3 local = frame < 0.5 ? p - esCentre(tread) : esFrame(p, frame) - esFlightCentre(tread);
    if (frame < 0.5 && mod(floor(tread / 12.0), 2.0) > 0.5) local.xz = local.zx;
    float inset = 1.0 - smoothstep(0.10, 0.125, abs(local.x));
    float lamp = exp(-sq((abs(local.z) - 0.19 * gWidth) / 0.035)) * inset;
    // Worn upper slab and recessed joints, with compact riser spill.
    float contact = smoothstep(-0.13, -0.08, local.x);
    float wear = 0.87 + 0.13 * exp(-sq(local.z / max(0.01, 0.21 * gWidth)));
    col *= mix(0.62, wear, contact);
    float riser = exp(-sq((local.y + 0.07) / 0.12));
    float spill = exp(-sq((local.z - 0.12 * gWidth) / 0.17)) * (0.28 + 0.72 * riser);
    float enabled = field.y < 144.0 && tread < (frame < 0.5 ? 48.0 : 12.0) ? 1.0 : 0.0;
    float permanent = smoothstep(0.86 - 0.40 * u_level, 0.91 - 0.40 * u_level, fract(tread * 0.381966)) * 0.32;
    vec3 fire = mix(u_primary, u_accent, 0.85);
    col += fire * enabled * (lamp * permanent + ascent * (spill * 0.9 + lamp * 0.4));
    if (field.y >= 144.0) {
      float joint = 1.0 - smoothstep(0.018, 0.05, abs(fract(local.y * 6.0) - 0.5));
      col *= 1.0 - 0.18 * joint;
    }
    col += fire * enabled * lamp * min(u_rhythmHit.w, 1.0) * 0.08;
    col *= exp(-max(0.0, t - 7.0) * 0.055);
  }
  // Small persistent lights walk the lifted stair chart under each gravity.
  for (int frame = 0; frame < 3; ++frame) {
    if (frame > 0 && gRel < 0.001) break;
    float sc = frame == 0 ? 1.0 : gFlightScale;
    for (int i = 0; i < 4; ++i) {
      float id = float(i) * (frame == 0 ? 12.0 : 5.5) + float(u_seedBits % 11u) * 0.31 + gPhase * 3.0;
      float at = mod(id, 48.0), lo = floor(at);
      // Cosine traversal is bounded, seamless and turns gently at each door.
      float flightAt = 5.5 - 5.5 * cos(id * 6.28318530718 / 48.0);
      vec3 c = frame == 0 ? mix(esCentre(lo), esCentre(mod(lo + 1.0, 48.0)), fract(at)) : esFlightCentre(flightAt);
      c.y += 0.24;
      vec3 gravity = vec3(0.0, 1.0, 0.0);
      if (frame > 0) c = esWorld(c, float(frame));
      if (frame == 1) gravity.xy = transpose(gGravity) * gravity.xy;
      if (frame == 2) gravity.yz = gGravity * gravity.yz;
      vec3 delta = c - ro;
      float along = dot(delta, rd), dist = length(delta - along * rd);
      if (dist > 0.24 * sc) continue;
      float visibility = along < t + 0.06 ? 1.0 : 0.0;
      float radius = (0.025 + 0.012 * u_level) * sc * u_params[5];
      float core = 1.0 - smoothstep(radius, radius + gPixel * framing * 1.5, dist);
      float halo = exp(-dist * dist / max(0.0001, 0.006 * sc * sc));
      vec3 projected = delta - along * rd;
      vec3 stem = -gravity * 0.21 * sc;
      stem -= rd * dot(stem, rd);
      float nearest = clamp(-dot(projected, stem) / max(dot(stem, stem), 0.000001), 0.0, 1.0);
      float stemDistance = length(projected + stem * nearest);
      float body = 1.0 - smoothstep(0.006 * sc, 0.006 * sc + gPixel * framing * 1.5, stemDistance);
      float cohort = i < 2 ? 1.0 : smoothstep(0.2, 0.85, u_level - float(i - 2) * 0.12);
      col += mix(u_primary, u_accent, 0.75) * (core * 4.0 + halo * 0.48 + body * 1.5) * visibility * cohort * (1.0 + 1.4 * u_rhythm.z);
    }
  }
  // One physical lantern head per gravity, with a surface-light tail. The
  // head moves three addresses per scheduled hit, independently of walkers.
  // Keep only the leading head analytic: the four-tread tail is shaded above.
  if (u_rhythm.w > 0.001) for (int frame = 0; frame < 3; ++frame) {
    if (frame > 0 && gRel < 0.001) break;
    float sc = frame == 0 ? 1.0 : gFlightScale;
    float span = frame == 0 ? 48.0 : 12.0;
    float head = mod(u_rhythmCount.w * 3.0 + float(frame) * 4.0, span);
    {
      float id = head;
      vec3 c = frame == 0 ? esCentre(id) : esFlightCentre(id);
      c.y += 0.20;
      if (frame == 0 && mod(floor(id / 12.0), 2.0) > 0.5) c.x += 0.12 * gWidth;
      else c.z += 0.12 * gWidth;
      vec3 gravity = vec3(0.0, 1.0, 0.0);
      if (frame > 0) c = esWorld(c, float(frame));
      if (frame == 1) gravity.xy = transpose(gGravity) * gravity.xy;
      if (frame == 2) gravity.yz = gGravity * gravity.yz;
      vec3 delta = c - ro;
      float along = dot(delta, rd);
      vec3 projected = delta - along * rd;
      float dist = length(projected);
      if (dist > 0.32 * sc || along > t + 0.025) continue;
      float aa = gPixel * framing * 1.5;
      vec3 upright = gravity - rd * dot(gravity, rd);
      upright /= max(length(upright), 0.001);
      float vertical = dot(projected, upright);
      float horizontal = length(projected - upright * vertical);
      float window = max(horizontal / max(sc, 0.001) - 0.035, abs(vertical) / max(sc, 0.001) - 0.052);
      float core = 1.0 - smoothstep(0.0, aa / max(sc, 0.001), window);
      float roof = 1.0 - smoothstep(0.0, aa / max(sc, 0.001), max(horizontal / max(sc, 0.001) - 0.055, abs(vertical / max(sc, 0.001) - 0.07) - 0.012));
      col *= 1.0 - roof * 0.75;
      float halo = exp(-sq(dist / max(0.001, 0.12 * sc)));
      vec3 stem = -gravity * 0.19 * sc;
      stem -= rd * dot(stem, rd);
      float at = clamp(-dot(projected, stem) / max(dot(stem, stem), 0.000001), 0.0, 1.0);
      float body = 1.0 - smoothstep(0.007 * sc, 0.007 * sc + aa, length(projected + stem * at));
      float flame = u_rhythm.w;
      col += mix(u_primary, u_accent, 0.85) * flame * (core * 7.0 + halo * 1.4 + body * 0.8);
    }
  }
  // The infinitely small levels converge below the pixel footprint, rather
  // than aliasing into a bright moving pinhole at the logarithmic centre.
  float resolved = mix(1.0, smoothstep(gPixel * 1.5, gPixel * 4.0, length(uv)), gInf);
  col = mix(u_secondary * 0.008, col * exp(-recursiveDepth * 0.36), resolved);
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
  rhythmStyles: {
    restrained: "Empty landings",
    driving: "Lantern steps",
    accented: "Endless ascent",
  },
  rhythm: [
    familyEffect(
      "tread-procession",
      0,
      "Tread procession",
      "A local light packet climbs the same persistent impossible treads.",
      {
        period: 4,
        strength: 0.55,
        duration: 1.25,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....... | .....x.. | ....X...",
            division: 2,
            strength: 0.48,
            duration: 1.5,
          },
          driving: {
            steps: "X....x.. | ...X.... | .x....X.",
            division: 2,
            strength: 0.72,
            duration: 0.9,
          },
          accented: {
            steps: "X.........x..... | .X.........x.... | ..X.........x...",
            division: 4,
            strength: 0.86,
            duration: 0.6,
          },
        },
      },
    ),
    familyEffect(
      "gravity-light",
      1,
      "Gravity light",
      "A soft stage light reveals the three stair orientations.",
      {
        period: 8,
        strength: 0.45,
        duration: 2,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "...x.... | .......X | ..x.....",
            division: 2,
            strength: 0.4,
            duration: 1.4,
          },
          driving: {
            steps: "...X..x. | .X...x..",
            division: 2,
            strength: 0.65,
            duration: 0.8,
          },
          accented: {
            steps: "...X..x...X..x.. | .....X..x..X..x.",
            division: 4,
            strength: 0.8,
            duration: 0.5,
          },
        },
      },
    ),
    familyEffect(
      "recursive-lantern",
      2,
      "Recursive lantern",
      "The walking lanterns breathe together through every recursive level.",
      {
        period: 16,
        strength: 0.6,
        duration: 2.5,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | ......X. | ........",
            division: 2,
            strength: 0.5,
            duration: 2.5,
          },
          driving: {
            steps: "........ | ......x. | ........ | .....X.x",
            division: 2,
            strength: 0.74,
            duration: 0.8,
          },
          accented: {
            steps: "............x... | .........X..x.XX",
            division: 4,
            strength: 0.9,
            duration: 0.18,
          },
        },
      },
    ),
    familyEffect(
      "lantern-ascent",
      3,
      "Lantern ascent",
      "Lanterns ignite three treads higher on each hit, carrying a luminous wake through every impossible gravity.",
      {
        period: 8,
        strength: 0.95,
        duration: 0.42,
        styles: {
          restrained: {
            steps: "X....... | ...x.... | ......X. | ....x...",
            division: 2,
            strength: 0.72,
            duration: 0.9,
          },
          driving: {
            steps: "X.x.X.x. | X..X.X.x",
            division: 2,
            strength: 0.95,
            duration: 0.42,
          },
          accented: {
            steps: "X..x..X.x...X... | ..X.x.X..x..X.x.",
            division: 4,
            strength: 1,
            duration: 0.2,
          },
        },
      },
    ),
  ],
  fragment,
};
