// Fractal Flight (v6 port, D32/D33): a flight through an infinite recursive
// sponge. Ported as an idea, not code: a GPU raymarcher on contract v3 with
// four authored camera paths instead of manual flying (the keys are the
// clip grid). Every path stays inside free space of the level-0 or level-1
// tunnels, so the camera never enters the solid.

const schema = [
  { key: "path", label: "Path · corridor / spiral / shaft / narrows", min: 0, max: 3, step: 1, default: 0 },
  { key: "speed", label: "Flight speed", min: 0, max: 2, step: 0.01, default: 0.45 },
  { key: "detail", label: "Recursion levels", min: 2, max: 5, step: 1, default: 4 },
  { key: "opening", label: "Passage width", min: 0.75, max: 1.2, step: 0.01, default: 1 },
  { key: "roll", label: "Roll", min: -1, max: 1, step: 0.01, default: 0.1 },
  { key: "glow", label: "Edge glow", min: 0, max: 1.5, step: 0.01, default: 0.7 },
  { key: "fog", label: "Depth fog", min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: "light", label: "Headlight", min: 0, max: 1.5, step: 0.01, default: 0.8 },
];

const presets = [
  { name: "Long Corridor", seed: 6101, params: { path: 0, speed: 0.35, detail: 4, opening: 1, roll: 0, glow: 0.6, fog: 0.55, light: 0.85 } },
  { name: "Corkscrew", seed: 6102, params: { path: 1, speed: 0.6, detail: 4, opening: 0.95, roll: 0.45, glow: 0.8, fog: 0.45, light: 0.7 } },
  { name: "Mine Shaft", seed: 6103, params: { path: 2, speed: 0.5, detail: 5, opening: 1.05, roll: -0.2, glow: 0.9, fog: 0.6, light: 0.6 } },
  { name: "Narrows", seed: 6104, params: { path: 3, speed: 0.75, detail: 4, opening: 1, roll: 0.15, glow: 1.1, fog: 0.4, light: 0.75 } },
  { name: "Ember Drift", seed: 6105, params: { path: 0, speed: 0.15, detail: 5, opening: 1.15, roll: 0.05, glow: 1.3, fog: 0.75, light: 0.45 } },
  { name: "Neon Spiral", seed: 6106, params: { path: 1, speed: 1.1, detail: 3, opening: 0.85, roll: 0.9, glow: 1.0, fog: 0.3, light: 1 } },
];

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
// 2/3^k); the map is the distance from free space to the solid: positive in
// the tunnels. trap records which level's edge is nearest, for colour.
float ffMap(vec3 p, out float trap) {
  float levels = clamp(u_params[2], 2.0, 5.0);
  float w = clamp(u_params[3], 0.75, 1.2) / 3.0;
  float holes = 1e9;
  float scale = 1.0;
  trap = 0.0;
  for (int i = 0; i < LEVEL_CAP; ++i) {
    if (float(i) >= levels) break;
    vec3 q = mod(p * scale + 1.0, 2.0) - 1.0;
    float c = ffCross(q, w) / scale;
    if (c < holes) { holes = c; trap = float(i); }
    scale *= 3.0;
  }
  return -holes;
}

// Camera path at travel distance s for each type. All stay in free space.
void ffCamera(float path, float s, out vec3 ro, out vec3 fw, out float extraRoll) {
  extraRoll = 0.0;
  if (path < 0.5) {
    // Corridor: down the centre of a level-0 tunnel with a gentle sway.
    ro = vec3(s, 0.06 * sin(s * 0.7), 0.06 * cos(s * 0.53));
    fw = normalize(vec3(1.0, 0.04 * cos(s * 0.7), -0.03 * sin(s * 0.53)));
  } else if (path < 1.5) {
    // Spiral: corkscrew inside the tunnel, the view rolling with it.
    float a = s * 1.3;
    ro = vec3(s, 0.13 * sin(a), 0.13 * cos(a));
    fw = normalize(vec3(1.0, 0.17 * cos(a), -0.17 * sin(a)));
    extraRoll = a;
  } else if (path < 2.5) {
    // Shaft: falling down a vertical level-0 tunnel, looking down and ahead.
    ro = vec3(0.05 * sin(s * 0.4), -s, 0.05 * cos(s * 0.4));
    fw = normalize(vec3(0.25 * sin(s * 0.2), -1.0, 0.25 * cos(s * 0.2)));
  } else {
    // Narrows: a level-1 tunnel inside the wall (two-thirds off the axis).
    ro = vec3(s * 0.8, 2.0 / 3.0, 0.03 * sin(s * 1.1));
    fw = normalize(vec3(1.0, 0.0, 0.05 * cos(s * 1.1)));
  }
}

void main() {
  float path = floor(u_params[0] + 0.5);
  float speed = u_params[1];
  float glowAmount = u_params[5];
  float fog = u_params[6];
  float light = u_params[7];
  float s = u_time * speed * 0.9 + fract(u_seed * 0.0173) * 12.0;
  vec3 ro, fw;
  float extraRoll;
  ffCamera(path, s, ro, fw, extraRoll);
  vec3 up = abs(fw.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 rt = normalize(cross(up, fw));
  up = cross(fw, rt);
  vec2 uv = aspectUV() * 2.0;
  uv = rot2(u_params[4] * u_time * 0.35 + extraRoll) * uv;
  vec3 rd = normalize(fw * 1.35 + rt * uv.x + up * uv.y);

  int limit = int(min(float(RAY_CAP), u_raySteps));
  float t = 0.02, trap = 0.0, edge = 0.0;
  int steps = 0;
  bool hit = false;
  for (int i = 0; i < RAY_CAP; ++i) {
    if (i >= limit) break;
    float d = ffMap(ro + rd * t, trap);
    // Near-misses along the ray glow: emissive edges on black.
    edge += exp(-d * 90.0) * 0.012;
    if (d < 0.0006 * t) { hit = true; break; }
    t += d * 0.85;
    steps = i;
    if (t > 14.0) break;
  }
  float depth = clamp(t / 14.0, 0.0, 1.0);
  vec3 col = vec3(0.0);
  if (hit) {
    vec3 hp = ro + rd * t;
    float tmp;
    vec2 e = vec2(0.0008 * max(t, 1.0), 0.0);
    vec3 n = normalize(vec3(
      ffMap(hp + e.xyy, tmp) - ffMap(hp - e.xyy, tmp),
      ffMap(hp + e.yxy, tmp) - ffMap(hp - e.yxy, tmp),
      ffMap(hp + e.yyx, tmp) - ffMap(hp - e.yyx, tmp)));
    // The map is positive in free space, so its gradient points into the room.
    float diffuse = max(dot(n, -rd), 0.0);
    float occlusion = 1.0 - float(steps) / float(RAY_CAP);
    vec3 material = palette(fract(trap * 0.27 + 0.15));
    col = material * (0.06 + light * 0.75 * diffuse * diffuse) * occlusion;
  }
  vec3 glowColour = mix(u_accent, u_primary, 0.5 + 0.5 * sin(s * 0.2 + trap));
  col += glowColour * edge * glowAmount * (0.7 + 0.6 * u_level);
  col *= exp(-depth * depth * fog * 6.0);
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "flight",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { speed: [0.1, 1.6], glow: [0.5, 1.3], fog: [0.7, 0.3], roll: { mul: [0.4, 2] } },
  beat: { punch: 1.3, pulse: 1 },
  stage: ["speed", "roll", "glow"],
  type: { key: "path", values: [0, 1, 2, 3] },
  number: 60,
  name: "Fractal Flight",
  description:
    "A flight through an infinite recursive sponge (two to five levels of carved crosses). Four authored camera paths — a long corridor, a corkscrew, a falling shaft and the narrow level-one tunnels inside the walls — stay in free space. Near-misses along each ray glow as emissive edges on black; fog and headlight shape depth. A port of the v6 idea, not its Canvas2D code; manual flying is replaced by paths so the keyboard stays the clip grid.",
  maxRenderWidth: 960,
  schema,
  presets,
  fragment,
};
