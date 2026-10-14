import { familyEffect } from "./family-rhythm.mjs";

// Continuous Jones-inspired chemotaxis. Agents sense/deposit a separate trail
// field. This deliberately omits exclusive occupancy and collision blocking;
// food motion and sparse reseeding are artistic unattended-renewal additions.
export const AGENT_SIDE = 128;
export const FIELD_SIDE = 256;
const TAU_P = Math.PI * 2;
const wrap = (n) => ((n % 1) + 1) % 1;

// x12 / y12 / heading8 fits four RGBA8 bytes without biased short-axis motion.
export function packAgent({ x, y, heading }) {
  const ix = Math.round(wrap(x) * 4095),
    iy = Math.round(wrap(y) * 4095);
  return [
    ix & 255,
    (ix >> 8) | ((iy & 15) << 4),
    iy >> 4,
    Math.round(wrap(heading / TAU_P) * 255),
  ];
}
export function unpackAgent(bytes) {
  return {
    x: (bytes[0] | ((bytes[1] & 15) << 8)) / 4095,
    y: ((bytes[1] >> 4) | (bytes[2] << 4)) / 4095,
    heading: (bytes[3] / 255) * TAU_P,
  };
}

// The paper's three-sensor decision, including its forward-low random branch.
export function sensorTurn(forward, left, right, amount, coin = 0.5) {
  if (forward > left && forward > right) return 0;
  if (forward < left && forward < right) return coin < 0.5 ? -amount : amount;
  if (left < right) return -amount;
  if (right < left) return amount;
  return 0;
}

export function stepAgent(
  agent,
  sample,
  {
    distance = 12,
    angle = (26 * Math.PI) / 180,
    turn = 0.55,
    speed = 1.2,
    size = FIELD_SIDE,
    coin = 0.5,
  } = {},
) {
  const sense = (offset) =>
    sample(
      wrap(agent.x + (Math.cos(agent.heading + offset) * distance) / size),
      wrap(agent.y + (Math.sin(agent.heading + offset) * distance) / size),
    );
  const heading =
    wrap(
      (agent.heading +
        sensorTurn(sense(0), sense(angle), sense(-angle), turn, coin)) /
        TAU_P,
    ) * TAU_P;
  return {
    x: wrap(agent.x + (Math.cos(heading) * speed) / size),
    y: wrap(agent.y + (Math.sin(heading) * speed) / size),
    heading,
  };
}

export function diffuseTrail(
  field,
  width,
  height,
  diffusion = 0.6,
  retention = 0.956,
) {
  const next = new Float64Array(field.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          sum +=
            field[
              ((y + dy + height) % height) * width + ((x + dx + width) % width)
            ];
      const index = y * width + x;
      next[index] =
        (field[index] * (1 - diffusion) + (sum / 9) * diffusion) * retention;
    }
  return next;
}

const codec = `
vec3 pDecode(vec4 packed) {
  ivec4 b = ivec4(floor(packed * 255.0 + 0.5));
  return vec3(float(b.r | ((b.g & 15) << 8)) / 4095.0,
    float((b.g >> 4) | (b.b << 4)) / 4095.0, float(b.a) / 255.0 * 6.283185307179586);
}
`;

const simulation = `${codec}
vec4 pEncode(vec3 p) {
  ivec2 q = ivec2(floor(fract(p.xy) * 4095.0 + 0.5));
  int heading = int(floor(fract(p.z / TAU) * 255.0 + 0.5));
  return vec4(q.x & 255, (q.x >> 8) | ((q.y & 15) << 4), q.y >> 4, heading) / 255.0;
}
float pSense(vec2 p, float angle, float distance) {
  vec2 sampleUV = fract(p + vec2(cos(angle), sin(angle)) * distance / 256.0);
  return texture(u_field, sampleUV).r;
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec3 agent = pDecode(texelFetch(u_state, cell, 0));
  // Sparse population renewal is explicit, not a global network reset.
  if (u_reset || tickHash(cell, 71u) < 0.0007) {
    agent = vec3(tickHash(cell, 3u), tickHash(cell, 5u), tickHash(cell, 7u) * TAU);
  }
  float sensorDistance = u_params[2];
  float sensorAngle = radians(u_params[3]);
  float forward = pSense(agent.xy, agent.z, sensorDistance);
  float left = pSense(agent.xy, agent.z + sensorAngle, sensorDistance);
  float right = pSense(agent.xy, agent.z - sensorAngle, sensorDistance);
  float turn = u_params[4];
  if (forward < left && forward < right) agent.z += tickHash(cell, 11u) < 0.5 ? -turn : turn;
  else if (!(forward > left && forward > right)) {
    if (left < right) agent.z -= turn;
    else if (right < left) agent.z += turn;
  }
  float speed = u_params[1] * u_dt * 60.0;
  agent.xy = fract(agent.xy + vec2(cos(agent.z), sin(agent.z)) * speed / 256.0);
  outColor = pEncode(agent);
}
`;

const fieldFragment = `
float pFood(vec2 uv, float habitat) {
  vec2 p = torusDelta(uv, vec2(0.5));
  if (habitat < 0.5) return 0.0;
  if (habitat < 2.5 && habitat > 1.5) return exp(-sq((length(p) - 0.28) / 0.012)) * 0.0018;
  float food = 0.0;
  for (int i = 0; i < 6; i++) {
    float a = float(i) * TAU / 6.0 + float(u_seedBits % 97u) * 0.031;
#ifdef PHOSPHOR_LATE
    float phase = u_time * 0.015;
#else
    float phase = mod(u_time, 3600.0) * 0.015;
#endif
    float radius = habitat > 2.5 ? 0.19 + 0.10 * sin(phase + float(i) * 1.7) : 0.27;
    vec2 centre = vec2(0.5) + radius * vec2(cos(a + phase), sin(a + phase));
    vec2 d = torusDelta(uv, centre);
    food += exp(-dot(d, d) / 0.00035) * 0.010;
  }
  return food;
}
void main() {
  if (u_reset) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec2 texel = 1.0 / vec2(textureSize(u_field, 0));
  float sum = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++)
    sum += texture(u_field, fract(v_uv + vec2(x, y) * texel)).r;
  float current = texture(u_field, v_uv).r;
  float trail = mix(current, sum / 9.0, u_params[5]) * u_params[6];
  vec2 source = vec2(0.5) + 0.29 * vec2(cos(u_rhythmCount.z * 2.399963), sin(u_rhythmCount.z * 2.399963));
  vec2 d = torusDelta(v_uv, source);
  float foraging = exp(-dot(d, d) / 0.0012) * u_rhythm.z * 0.012;
  // Unbiased RGBA8 rounding keeps sub-byte sparse trails from disappearing.
  emit(vec4(clamp(trail + pFood(v_uv, u_params[0]) + foraging, 0.0, 1.0), 0.0, 0.0, 1.0));
}
`;

const depositVertex = `${codec}
void main() {
  vec3 agent = pDecode(particle());
  gl_Position = vec4(agent.xy * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.5;
  // Field values are trail concentration, independent of the display palette.
  v_color = vec3(0.022, 0.0, 0.0);
}
`;

const fragment = `
void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = vec2((v_uv.x - 0.5) * aspect + 0.5, v_uv.y);
  vec2 texel = 1.0 / vec2(textureSize(u_field, 0));
  float trail = texture(u_field, fract(uv)).r;
  vec2 gradient = vec2(texture(u_field, fract(uv + vec2(texel.x, 0.0))).r - texture(u_field, fract(uv - vec2(texel.x, 0.0))).r,
    texture(u_field, fract(uv + vec2(0.0, texel.y))).r - texture(u_field, fract(uv - vec2(0.0, texel.y))).r);
  float ridge = smoothstep(0.004, 0.065, length(gradient));
  float body = 1.0 - exp(-trail * 5.5);
  vec3 ink = palette(clamp(0.10 + trail * 0.72 + ridge * 0.12, 0.0, 1.0));
  vec3 colour = u_secondary * 0.012 + ink * body * u_params[7] * 0.65;
  colour += mix(u_primary, u_accent, 0.35) * ridge * (0.16 + u_rhythm.y * 0.65);
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const particles = {
  vertex: `${codec}
void main() {
  vec3 agent = pDecode(particle());
  float minSide = min(u_resolution.x, u_resolution.y);
  gl_Position = vec4((agent.xy * 2.0 - 1.0) * minSide / u_resolution, 0.0, 1.0);
  float cohort = mod(float(gl_VertexID) - u_rhythmCount.x, 12.0) < 1.0 ? 1.0 : 0.0;
  gl_PointSize = max(1.0, minSide / 720.0 * (1.0 + cohort * u_rhythm.x));
  float trail = texture(u_field, agent.xy).r;
  v_color = mix(u_primary, u_accent, 0.4) * (0.007 + cohort * u_rhythm.x * 0.045) * u_params[7] * (0.35 + trail);
}
`,
};

const schema = [
  {
    key: "habitat",
    label: "Habitat · free / food nodes / food ring / moving nodes",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "speed",
    label: "Agent travel",
    min: 0.2,
    max: 2.4,
    step: 0.01,
    default: 1.2,
  },
  {
    key: "sensing",
    label: "Sensor distance",
    min: 4,
    max: 30,
    step: 0.1,
    default: 12,
  },
  {
    key: "angle",
    label: "Sensor angle",
    min: 10,
    max: 75,
    step: 0.1,
    default: 26,
  },
  {
    key: "turn",
    label: "Steering turn",
    min: 0.12,
    max: 1.2,
    step: 0.01,
    default: 0.55,
  },
  {
    key: "diffusion",
    label: "Trail diffusion",
    min: 0.05,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "retention",
    label: "Trail retention",
    min: 0.88,
    max: 0.992,
    step: 0.001,
    default: 0.956,
  },
  {
    key: "glow",
    label: "Network light",
    min: 0.35,
    max: 1.75,
    step: 0.01,
    default: 1,
  },
];
const look = (
  name,
  seed,
  habitat,
  speed,
  sensing,
  angle,
  turn,
  diffusion,
  retention,
  glow,
) => ({
  name,
  seed,
  params: { habitat, speed, sensing, angle, turn, diffusion, retention, glow },
});
const presets = [
  look("Foraging Veins", 8301, 0, 1.1, 14, 15, 0.7, 0.62, 0.953, 1.05),
  look("Honeycomb Transport", 8302, 0, 0.8, 18, 45, 0.78, 0.85, 0.96, 0.95),
  look("Braided Couriers", 8303, 0, 1.8, 8, 23, 0.42, 0.42, 0.94, 1.12),
  look("Six Food Stations", 8304, 1, 1.1, 17, 28, 0.58, 0.67, 0.952, 1.05),
  look("Fine Nutrient Roads", 8305, 1, 0.65, 22, 18, 0.48, 0.45, 0.966, 0.85),
  look("Annular Foragers", 8306, 2, 1.0, 13, 34, 0.62, 0.7, 0.949, 1.12),
  look("Migrating Stations", 8307, 3, 1.55, 16, 20, 0.63, 0.6, 0.95, 1.0),
  look("Living Circuit", 8308, 3, 1.85, 9, 52, 0.9, 0.82, 0.943, 1.15),
];

export default {
  id: "physarum",
  number: 83,
  name: "Physarum Networks",
  description:
    "16,384 continuous chemotactic agents steer toward three trail sensors, deposit into a separate diffusing field and thereby reorganise their own transport network. Free foraging, food-node, ring and moving-node habitats use the same feedback mechanism. Jones-inspired, with artistic renewal and no exclusive occupancy; it does not claim biological fidelity or optimal routes.",
  aspect: 1,
  study: true,
  rhythm: [
    familyEffect(
      "carrier-cohort",
      0,
      "Carrier-cohort light",
      "Tag existing agents so their travel through the actual trail network is visible.",
      { strength: 0.7 },
    ),
    familyEffect(
      "trail-ridges",
      1,
      "Trail-ridge light",
      "Illuminate measured gradients of the deposited network field.",
      { period: 3, strength: 0.55 },
    ),
    familyEffect(
      "foraging-source",
      2,
      "Foraging source",
      "Introduce a temporary local trail attractant, then watch agents reroute and deposits recover.",
      { period: 16, strength: 0.6, duration: 2, kind: "simulation" },
    ),
  ],
  energy: { speed: { mul: [0.6, 1.5] }, sensing: [-2, 4], glow: [-0.1, 0.15] },
  beat: { punch: 0, pulse: 0 },
  stage: ["speed", "sensing", "angle"],
  type: { key: "habitat", values: [0, 1, 2, 3] },
  simulation: {
    size: [AGENT_SIDE, AGENT_SIDE],
    steps: 1,
    fragment: simulation,
  },
  field: {
    size: [FIELD_SIDE, FIELD_SIDE],
    fragment: fieldFragment,
    depositVertex,
  },
  particles,
  schema,
  presets,
  fragment,
};
