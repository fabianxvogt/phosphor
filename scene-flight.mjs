// Fractal Flight (v6 port, D32/D33): a flight through an infinite recursive
// sponge. Ported as an idea, not code: a GPU raymarcher on contract v3 with
// four authored camera paths instead of manual flying (the keys are the
// clip grid). Each path has a guaranteed free-space core. Travel and roll
// are integrated in a one-texel state, so live glides never teleport the view.

const schema = [
  {
    key: "path",
    label: "Path · corridor / spiral / shaft / narrows",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "speed",
    label: "Flight speed",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "detail",
    label: "Recursion levels",
    min: 2,
    max: 5,
    step: 0.01,
    default: 3.2,
  },
  {
    key: "opening",
    label: "Passage width",
    min: 0.75,
    max: 1.2,
    step: 0.01,
    default: 1,
  },
  { key: "roll", label: "Roll", min: -1, max: 1, step: 0.01, default: 0.1 },
  {
    key: "glow",
    label: "Edge glow",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.7,
  },
  { key: "fog", label: "Depth fog", min: 0, max: 1, step: 0.01, default: 0.5 },
  {
    key: "light",
    label: "Headlight",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.8,
  },
];

const presets = [
  {
    name: "Long Corridor",
    seed: 6101,
    params: {
      path: 0,
      speed: 0.45,
      detail: 3.2,
      opening: 1,
      roll: 0,
      glow: 0.6,
      fog: 0.45,
      light: 1.1,
    },
  },
  {
    name: "Corkscrew",
    seed: 6102,
    params: {
      path: 1,
      speed: 0.5,
      detail: 3.2,
      opening: 0.9,
      roll: 0.15,
      glow: 0.7,
      fog: 0.4,
      light: 1.1,
    },
  },
  {
    name: "Mine Shaft",
    seed: 6103,
    params: {
      path: 2,
      speed: 0.45,
      detail: 3.4,
      opening: 1,
      roll: 0,
      glow: 0.6,
      fog: 0.4,
      light: 1.1,
    },
  },
  {
    name: "Narrows",
    seed: 6104,
    params: {
      path: 3,
      speed: 0.4,
      detail: 3.2,
      opening: 1,
      roll: 0.05,
      glow: 0.8,
      fog: 0.35,
      light: 1.1,
    },
  },
  {
    name: "Ember Drift",
    seed: 6105,
    params: {
      path: 0,
      speed: 0.2,
      detail: 3.5,
      opening: 1.1,
      roll: 0.05,
      glow: 0.9,
      fog: 0.6,
      light: 0.85,
    },
  },
  {
    name: "Neon Spiral",
    seed: 6106,
    params: {
      path: 1,
      speed: 0.8,
      detail: 3,
      opening: 0.85,
      roll: 0.3,
      glow: 1,
      fog: 0.3,
      light: 1.2,
    },
  },
];

// Bounded phases: the sponge repeats every two units and the paths every
// six. Both sides of the travel wrap therefore render the same geometry.
const simulation = `
void main() {
  vec2 phase = unpack16(texture(u_state, vec2(0.5)));
  if (u_reset) phase = vec2(fract(u_seed * 0.0173), 0.0);
  else phase = fract(phase + u_dt * vec2(u_params[1] * 0.9 / 6.0, u_params[4] * 0.35 / TAU));
  outColor = pack16(phase);
}
`;

const fragment = `
const int RAY_CAP = 96;
const int LEVEL_CAP = 5;

// Distance to an infinite cross (three orthogonal square prisms, half-width w).
float ffCross(vec3 p, float w) {
  vec3 a = abs(p);
  float dxy = max(a.x, a.y), dyz = max(a.y, a.z), dzx = max(a.z, a.x);
  return min(dxy, min(dyz, dzx)) - w;
}

// Free space is the union of crosses carved at every level (cells of size
// 2/3^k); positive distances are inside the tunnels. Fractional levels open
// the next set of holes continuously, including during Random-mode drift.
float ffMap(vec3 p, out float trap) {
  float path = floor(u_params[0] + 0.5);
  float twistBound = 1.0;
  if (path > 0.5 && path < 1.5) {
    twistBound += PI * length(p.yz);
    p.yz = rot2(p.x * PI) * p.yz;
  }
  if (path > 1.5 && path < 2.5) p.y /= 3.0;
  float levels = clamp(u_params[2], 2.0, 5.0);
  float w = clamp(u_params[3], 0.75, 1.2) / 3.0;
  float holes = 1e9;
  float scale = 1.0;
  trap = 0.0;
  for (int i = 0; i < LEVEL_CAP; ++i) {
    if (float(i) >= levels) break;
    vec3 q = mod(p * scale + 1.0, 2.0) - 1.0;
    float c = ffCross(q, w * clamp(levels - float(i), 0.0, 1.0)) / scale;
    if (c < holes) { holes = c; trap = float(i); }
    scale *= 3.0;
  }
  // Twist stretches the distance field; bound its Jacobian over the step.
  return -holes / (twistBound + (twistBound > 1.0 ? PI * abs(holes) : 0.0));
}

// Camera path at travel distance s for each type. All stay in free space.
void ffCamera(float path, float s, out vec3 ro, out vec3 fw, out float extraRoll) {
  float a = s * TAU / 6.0;
  extraRoll = 0.0;
  if (path < 0.5) {
    // Corridor: axial perspective and square recursive portals.
    ro = vec3(s, 0.04 * sin(a), 0.04 * cos(a));
    fw = normalize(vec3(1.0, 0.04 * cos(a), -0.04 * sin(a)));
  } else if (path < 1.5) {
    // Corkscrew: twisted sponge walls, orbiting camera and oblique view.
    ro = vec3(s, 0.12 * sin(a), 0.12 * cos(a));
    fw = normalize(vec3(0.65, 0.7 * cos(a), -0.7 * sin(a)));
    extraRoll = a;
  } else if (path < 2.5) {
    // Shaft: descend a three-times-taller lattice, looking across its wall.
    ro = vec3(0.04 * sin(a), -s * 3.0, 0.04 * cos(a));
    fw = normalize(vec3(1.0, -0.3, 0.12));
  } else {
    // Inner tunnels: a level-one side passage, looking into a junction.
    ro = vec3(s, 2.0 / 3.0, 0.02 * sin(a));
    fw = normalize(vec3(0.55, 0.8, 0.2));
  }
}

// Three SDF samples shade recesses; ray iteration count is not occlusion.
float ffOcclusion(vec3 p, vec3 n) {
  float blocked = 0.0, weight = 0.5, tmp;
  for (int i = 0; i < 3; ++i) {
    float h = 0.014 * pow(3.0, float(i));
    blocked += weight * max(0.0, 1.0 - ffMap(p + n * h, tmp) / h);
    weight *= 0.5;
  }
  return clamp(1.0 - blocked * 0.8, 0.25, 1.0);
}

void main() {
  float path = floor(u_params[0] + 0.5);
  vec2 phase = unpack16(texture(u_state, vec2(0.5)));
  float level = clamp(u_level, 0.0, 1.0);
  // D61 envelopes are attack/release smoothed and fade out with beat lock.
  float bass = smoothstep(0.0, 1.0, clamp(u_low, 0.0, 1.0));
  float kick = u_kick * smoothstep(0.15, 1.0, level);
  float glowAmount = u_params[5];
  float fog = u_params[6];
  float light = u_params[7];
  float s = phase.x * 6.0;
  vec3 ro, fw;
  float extraRoll;
  ffCamera(path, s, ro, fw, extraRoll);
  vec3 up = abs(fw.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 rt = normalize(cross(up, fw));
  up = cross(fw, rt);
  vec2 uv = aspectUV() * 2.0;
  float bank = level * level * 0.22 * sin(s * TAU / 6.0);
  uv = rot2(phase.y * TAU + extraRoll + bank) * uv;
  // A small ray-camera FOV response complements the shared compositor punch.
  float focal = 1.35 * (1.0 + kick * 0.07);
  vec3 rd = normalize(fw * focal + rt * uv.x + up * uv.y);

  int limit = int(min(float(RAY_CAP), u_raySteps));
  float t = 0.02, trap = 0.0, edge = 0.0, scattering = 0.0;
  float extinction = 0.035 + fog * 0.12;
  bool hit = false;
  for (int i = 0; i < RAY_CAP; ++i) {
    if (i >= limit) break;
    vec3 p = ro + rd * t;
    float d = ffMap(p, trap);
    if (d < 0.0006 * t) { hit = true; break; }
    float segment = min(d * 0.85, 14.0 - t);
    // Reuse the governed march: no second volume ray and no extra SDF calls.
    // Oblique sheets of light become narrower/more numerous towards peak.
    float shaft = pow(0.5 + 0.5 * sin(dot(p, vec3(0.4, 3.0, 2.0)) * (1.0 + level * 1.8)), 8.0);
    float absorbed = 1.0 - exp(-segment * extinction);
    scattering += exp(-t * extinction) * absorbed * (0.07 + shaft * (0.2 + level * 0.65));
    edge += exp(-max(d, 0.0) * 90.0) * min(segment, 0.03) * 0.6;
    t += segment;
    if (t >= 14.0) break;
  }
  vec3 atmosphere = mix(u_secondary, u_primary, 0.25) * 0.12;
  vec3 col = vec3(0.0);
  if (hit) {
    vec3 hp = ro + rd * t;
    float tmp;
    vec2 e = vec2(1.0, -1.0) * (0.0008 * max(t, 1.0));
    vec3 n = normalize(
      e.xyy * ffMap(hp + e.xyy, tmp) + e.yyx * ffMap(hp + e.yyx, tmp) +
      e.yxy * ffMap(hp + e.yxy, tmp) + e.xxx * ffMap(hp + e.xxx, tmp) + vec3(1e-7));
    // The map is positive in free space, so its gradient points into the room.
    float diffuse = max(dot(n, -rd), 0.0);
    float occlusion = ffOcclusion(hp, n);
    vec3 material = palette(fract(trap * 0.27 + 0.15));
    // Contrast pivots around a fixed midtone, rather than becoming a master.
    // Detail/speed are driven by metadata; the local kick only changes FOV.
    float shade = 0.2 + light * 1.15 * diffuse * diffuse;
    shade = max(0.0, 0.4 + (shade - 0.4) * (0.7 + 1.1 * u_level));
    col = material * shade * occlusion;
    float rim = pow(max(1.0 - abs(dot(n, -rd)), 0.0), 3.0);
    col += palette(fract(trap * 0.27 + 0.72)) * rim * glowAmount *
      (0.08 + level * 0.22 + bass * (0.18 + level * 0.7));
  }
  vec3 glowColour = mix(u_accent, u_primary, 0.5 + 0.5 * sin(s * TAU / 6.0 + trap));
  float transmission = exp(-min(t, 14.0) * extinction);
  col = mix(atmosphere, col, transmission);
  col += glowColour * glowAmount * (edge * (1.0 + bass * level) +
    min(scattering, 0.9) * (0.35 + level * 0.5 + bass * level * 0.6));
  // Float picture targets retain highlights; RGBA8 fallback clips as before.
  outColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

export default {
  id: "flight",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: {
    speed: { mul: [0.08, 1.9] },
    detail: [2, 5],
    fog: [0.6, 0.3],
    roll: { mul: [0.4, 2] },
  },
  beat: { punch: 1.3, pulse: 1 },
  audio: [
    { param: "glow", feature: "low", amount: 0.16 },
    { param: "roll", feature: "mid", amount: 0.05 },
    { param: "light", feature: "high", amount: 0.1 },
  ],
  stage: ["speed", "roll", "glow"],
  type: { key: "path", values: [0, 1, 2, 3] },
  number: 60,
  name: "Fractal Flight",
  description:
    "A flight through an infinite recursive sponge with continuously opening detail. Four authored paths compose square corridor portals, twisted corkscrew walls, a tall falling shaft and level-one inner junctions. Palette-tinted distance atmosphere, bounded in-scattered light and three-sample SDF occlusion give the passages depth; the smoothed low band excites emissive edges. Energy increases traversal, banking and kick FOV. A one-texel phase integrator keeps travel and roll smooth under live glides; each camera stays in a guaranteed free-space core.",
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [1, 1], steps: 1 },
};
