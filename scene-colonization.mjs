import { familyEffect } from "./family-rhythm.mjs";
import {
  createColonization,
  stepColonization,
  TEXTURE_WIDTH,
  TEXTURE_HEIGHT,
  LAYER_SIZE,
  SAMPLE_CAPACITY,
  SAMPLES_PER_EDGE,
  ATTRACTOR_START,
} from "./colonization.mjs";

// CPU graph ancestry is uploaded as packed16 positions and point metadata.
// The render is deliberately a branching skeleton with visible space points,
// rather than a texture called a tree. Its finite regions overlap on renewal.
const fragment = `
void main() {
  vec3 previous = u_reset ? vec3(0.0) : texture(u_previous, v_uv).rgb;
  emit(vec4(previous * pow(clamp(u_params[7], 0.0, 0.75), u_dt * 60.0), 1.0));
}
`;

const particles = {
  vertex: `
vec4 colonyTexel(int index) {
  return texelFetch(u_state, ivec2(index % ${TEXTURE_WIDTH}, index / ${TEXTURE_WIDTH}), 0);
}
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 1.0;
  v_color = vec3(0.0);
  int index = gl_VertexID;
  if (index >= ${LAYER_SIZE}) return;
  bool attraction = index >= ${ATTRACTOR_START};
  if (!attraction && index >= ${SAMPLE_CAPACITY}) return;
  vec2 xy = unpack16(colonyTexel(index));
  if (xy.x == 0.0 && xy.y == 0.0) return;
  vec4 extra = colonyTexel(index + ${LAYER_SIZE});
  int flags = int(floor(extra.a * 255.0 + 0.5));
  float opacity = float(flags & 127) / 127.0;
  if (opacity <= 0.0) return;
  vec3 p = vec3(xy, unpack16(extra.rg)) * 2.0 - 1.0;
  float t = u_time;
  int variant = int(floor(u_params[0] + 0.5));
  float turn = u_params[6];
  float depth = 2.7;
  if (variant == 2) {
    float yaw = mod(t * turn * 0.24, 6.28318530718);
    float pitch = 0.28 + 0.13 * sin(t * 0.11);
    p.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * p.xz;
    p.yz = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch)) * p.yz;
    depth = 2.7 + p.z * 0.55;
    p.xy *= 2.7 / depth;
  } else {
    float sway = 0.04 * turn * sin(t * 0.17);
    p.xy = mat2(cos(sway), -sin(sway), sin(sway), cos(sway)) * p.xy;
  }
  float minSide = min(u_resolution.x, u_resolution.y);
  gl_Position = vec4(p.xy * 0.94 * minSide / u_resolution, 0.0, 1.0);
  float history = 1.0 - clamp(u_params[7], 0.0, 0.75);
  if (attraction) {
    // These are exactly the remaining attraction points, not decorative
    // star noise. Reached points vanish at the next growth iteration.
    gl_PointSize = max(1.4, minSide / 560.0);
    v_color = palette(0.25) * 0.18 * opacity * history;
    return;
  }
  int branch = index / ${SAMPLES_PER_EDGE};
  vec4 ancestry = colonyTexel(${SAMPLE_CAPACITY} + branch);
  float path = unpack16(ancestry.rg) * 12.0;
  float cohort = floor(ancestry.b * 255.0 + 0.5);
  float region = floor(ancestry.a * 255.0 + 0.5);
  bool tip = (flags & 128) != 0 && index % ${SAMPLES_PER_EDGE} >= ${SAMPLES_PER_EDGE - 3};
  float beat = u_rhythmEnabled ? u_rhythm.x : exp(-4.5 * fract(u_beat));
  float tipBeat = u_rhythmEnabled ? u_rhythm.y : exp(-3.5 * fract(u_beat / 4.0));
  // Distance from the root comes from real parent-child path length. A
  // pulse travels through the actual ancestry rather than a screen ring.
  float progress = 1.0 - min(beat, 1.0);
  float wave = exp(-pow((path - progress * 1.45) * 9.0, 2.0)) * beat;
  float pointScale = (1.1 + 1.4 * u_params[5]) * (0.9 + 1.5 * extra.b);
  gl_PointSize = max(1.8, minSide / 650.0 * pointScale) * 2.7 / depth;
  float light = (0.65 + 2.3 * wave + (tip ? 1.7 * tipBeat : 0.0)) * opacity * history;
  float hue = fract(0.15 + 0.16 * cohort + 0.065 * region + path * 0.3);
  v_color = palette(hue) * light * (variant == 2 ? mix(1.1, 0.5, clamp((p.z + 0.7) / 1.4, 0.0, 1.0)) : 1.0);
}
`,
};

const schema = [
  {
    key: "variant",
    label: "Space · canopy / root fan / coral volume",
    min: 0,
    max: 2,
    step: 1,
    default: 0,
  },
  {
    key: "density",
    label: "Available space points",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "reach",
    label: "Attraction neighbourhood",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.55,
  },
  {
    key: "step",
    label: "Branch segment length",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "growth",
    label: "Growth iterations",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "size",
    label: "Branch width",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "turn",
    label: "Sway · volume orbit",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.2,
  },
  {
    key: "persistence",
    label: "Light memory",
    min: 0,
    max: 0.75,
    step: 0.01,
    default: 0.35,
  },
];

const look = (
  name,
  seed,
  variant,
  density,
  reach,
  step,
  growth,
  size,
  turn,
  persistence,
) => ({
  name,
  seed,
  params: { variant, density, reach, step, growth, size, turn, persistence },
});

const presets = [
  look("Branching Crown", 8301, 0, 0.56, 0.58, 0.45, 0.38, 0.56, 0.15, 0.28),
  look("Broad Canopy", 8302, 0, 0.88, 0.9, 0.24, 0.54, 0.62, 0.2, 0.38),
  look("Winter Crown", 8303, 0, 0.12, 0.27, 0.85, 0.2, 0.46, 0.11, 0.12),
  look("Root Veins", 8304, 1, 0.3, 0.36, 0.6, 0.33, 0.5, 0.15, 0.3),
  look("Deep Root Fan", 8305, 1, 0.8, 0.75, 0.8, 0.62, 0.75, 0.26, 0.25),
  look("Fine Root Lace", 8306, 1, 0.95, 0.82, 0.15, 0.5, 0.25, 0.2, 0.45),
  look("Coral Arbor", 8307, 2, 0.42, 0.48, 0.62, 0.4, 0.65, 0.5, 0.26),
  look("Coral Thicket", 8308, 2, 0.95, 0.68, 0.23, 0.65, 0.38, 0.73, 0.45),
];

export default {
  id: "colonization",
  number: 85,
  name: "Space Colonization",
  description:
    "A branching graph grows toward nearby available-space points: each point selects its nearest node, growth averages those local directions and reached points disappear. Canopies, tapered root fans and coral volumes share the exact local growth rule. Light travels along real parent-child distance and active tips answer a separate rhythm track. Finite local regions grow successively with a six-second overlap, so the unattended scene renews without pretending one tree grows forever.",
  energy: {
    density: [-0.12, 0.14],
    growth: { mul: [0.55, 1.65] },
    turn: { mul: [0.6, 1.5] },
  },
  beat: { punch: 0.12, pulse: 0.2 },
  audio: [
    { param: "growth", feature: "low", amount: 0.06 },
    { param: "turn", feature: "mid", amount: 0.035 },
    { param: "size", feature: "high", amount: 0.035 },
  ],
  rhythm: [
    familyEffect(
      "ancestry-pulse",
      0,
      "Branch ancestry pulse",
      "Send light outward along measured parent-child distance.",
      { strength: 0.8, duration: 1 },
    ),
    familyEffect(
      "active-tips",
      1,
      "Active tip accent",
      "Highlight the actual terminal nodes of the growing graph.",
      { period: 4, strength: 0.75, duration: 0.75 },
    ),
    familyEffect(
      "new-space-region",
      2,
      "Open growth region",
      "Start another local attraction region; cues coalesce during the six-second overlap.",
      { period: 32, strength: 0.6, duration: 0.5, kind: "simulation" },
    ),
  ],
  stage: ["growth", "reach", "size"],
  type: { key: "variant", values: [0, 1, 2] },
  schema,
  presets,
  fragment,
  simulation: {
    // Placeholder is retained for contract tools; CPU state skips this pass.
    fragment: "void main() { outColor = vec4(0.0); }",
    size: [TEXTURE_WIDTH, TEXTURE_HEIGHT],
    steps: 1,
    warmTicks: 0,
    filter: "nearest",
    cpu: { create: createColonization, step: stepColonization },
  },
  particles,
};
