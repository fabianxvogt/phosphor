const schema = [
  {
    key: "persistence",
    label: "Trace persistence",
    min: 0.15,
    max: 0.985,
    step: 0.005,
    default: 0.96,
  },
  {
    key: "zoom",
    label: "Tunnel zoom / second",
    min: -0.22,
    max: 0.22,
    step: 0.005,
    default: 0.04,
  },
  {
    key: "rotation",
    label: "Rotation / second",
    min: -0.8,
    max: 0.8,
    step: 0.01,
    default: 0.06,
  },
  {
    key: "symmetry",
    label: "Mirror sectors",
    min: 1,
    max: 12,
    step: 1,
    default: 6,
  },
  {
    key: "geometry",
    label: "Geometry: halo / portal / weave / procession",
    min: 0,
    max: 3,
    step: 0.01,
    default: 0,
  },
  {
    key: "injection",
    label: "Geometry ink",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.65,
  },
  {
    key: "aperture",
    label: "Chapel aperture",
    min: 0.12,
    max: 0.9,
    step: 0.01,
    default: 0.48,
  },
  {
    key: "audio",
    label: "Audio influence",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
];

const presets = [
  {
    name: "Quiet Apse",
    seed: 521,
    params: {
      persistence: 0.96,
      zoom: -0.025,
      rotation: 0.01,
      symmetry: 1,
      geometry: 0,
      injection: 0.52,
      aperture: 0.35,
      audio: 0.12,
    },
  },
  {
    name: "Molten Reliquary",
    seed: 522,
    params: {
      persistence: 0.982,
      zoom: 0.085,
      rotation: -0.13,
      symmetry: 3,
      geometry: 3,
      injection: 0.8,
      aperture: 0.52,
      audio: 0.7,
    },
  },
  {
    name: "Prism Descent",
    seed: 523,
    params: {
      persistence: 0.973,
      zoom: -0.12,
      rotation: -0.17,
      symmetry: 5,
      geometry: 1,
      injection: 0.68,
      aperture: 0.77,
      audio: 0.42,
    },
  },
  {
    name: "Votive Loom",
    seed: 524,
    params: {
      persistence: 0.96,
      zoom: 0.035,
      rotation: 0.23,
      symmetry: 6,
      geometry: 2,
      injection: 0.8,
      aperture: 0.65,
      audio: 0.55,
    },
  },
  {
    name: "Evolving Tunnel",
    seed: 525,
    params: {
      persistence: 0.981,
      zoom: 0.18,
      rotation: 0.06,
      symmetry: 12,
      geometry: 3,
      injection: 0.66,
      aperture: 0.7,
      audio: 0.6,
    },
  },
  {
    name: "Clean Recovery",
    seed: 526,
    params: {
      persistence: 0.15,
      zoom: 0,
      rotation: 0,
      symmetry: 1,
      geometry: 0,
      injection: 0.62,
      aperture: 0.23,
      audio: 0,
    },
  },
];

const fragment = `
#define FC_PI PI
#define FC_TAU TAU

vec2 fcRotate(vec2 p, float a) { return rot2(-a) * p; }

float fcStroke(float distanceToLine, float width, float aa) {
  return 1.0 - smoothstep(width, width + aa, abs(distanceToLine));
}

float fcPolygon(vec2 p, float sides, float radius) {
  float sector = FC_TAU / sides;
  float a = atan(p.y, p.x);
  return length(p) * cos(floor(a / sector + 0.5) * sector - a) - radius;
}

void main() {
  float dt = clamp(u_dt, 0.0, 0.1);
  float dtFrames = dt * 60.0;
  float persistence = clamp(u_params[0], 0.15, 0.985);
  float gain = pow(persistence, dtFrames);
  float zoom = clamp(u_params[1], -0.22, 0.22);
  float rotation = clamp(u_params[2], -0.8, 0.8);
  float sectors = floor(clamp(u_params[3], 1.0, 12.0) + 0.5);
  float geometry = floor(clamp(u_params[4], 0.0, 3.0) + 0.5);
  float injection = clamp(u_params[5], 0.0, 1.0);
  float aperture = clamp(u_params[6], 0.12, 0.9);
  float audio = clamp(u_params[7], 0.0, 1.0);
  float bass = clamp(u_bass, 0.0, 1.0) * audio;
  float mid = clamp(u_mid, 0.0, 1.0) * audio;
  float high = clamp(u_high, 0.0, 1.0) * audio;
  float onset = clamp(u_onset, 0.0, 1.0) * audio;
  float level = clamp(u_level, 0.0, 1.0);
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float aa = 1.5 / max(u_resolution.y, 1.0);
  float phase = hash(vec2(52.0, 19.0)) * FC_TAU;
  // Energy drives the injector even when an authored transport is stationary.
  // Persistence controls trails, not whether the high-energy look can move.
  float clock = u_time * mix(0.06, 1.8, level * level);
  float spin = clamp(rotation * (1.0 + 0.3 * mid), -0.8, 0.8);
  float dilation = clamp(zoom + bass * 0.035 * sign(zoom), -0.22, 0.22);
  vec2 source = fcRotate(p, -spin * dt);
  source *= exp(-dilation * dt);
  if (geometry == 0.0) source = fold(source, sectors);
  else if (geometry == 2.0) source.x += 0.012 * sin(p.y * 8.0 + clock) * dt;
  else if (geometry == 3.0) source.y -= 0.08 * dt;
  vec2 sourceUV = source / vec2(aspect, 1.0) + 0.5;
  vec3 history = vec3(0.0);
  if (!u_reset && all(greaterThanEqual(sourceUV, vec2(0.0))) && all(lessThanEqual(sourceUV, vec2(1.0)))) {
    history = texture(u_previous, sourceUV).rgb;
  }

  float width = mix(0.025, 0.009, level) + 0.002 * high;
  float ink = 0.0;
  float colorPhase = 0.0;
  if (geometry == 0.0) {
    // A breathing central halo; satellites fill wide walls without stretching.
    float spacing = 0.92;
    vec2 q = p;
    q.x -= spacing * floor(q.x / spacing + 0.5);
    float radius = 0.16 + aperture * 0.22 + 0.018 * sin(clock + phase) + 0.025 * bass;
    float r = length(q);
    float rings = 1.0 + floor(level * 5.0);
    float band = (r - radius) * (8.0 + rings * 2.0);
    float envelope = 1.0 - smoothstep(0.09 + level * 0.18, 0.12 + level * 0.18, abs(r - radius));
    ink = fcStroke(fract(band - clock * 0.08) - 0.5, 0.16, aa * (8.0 + rings * 2.0)) * envelope;
    colorPhase = atan(q.y, q.x) / FC_TAU + r;
  } else if (geometry == 1.0) {
    // Off-axis nested triangular portals, travelling into a dark vanishing point.
    vec2 q = fcRotate(p - vec2(-0.22, 0.06), 0.13 * sin(clock * 0.5 + phase));
    float d = fcPolygon(q, 3.0, 0.0);
    float count = 3.0 + floor(level * 9.0);
    float bands = log(max(d, 0.025) / (0.08 + aperture * 0.15)) * count - clock * 0.4;
    ink = fcStroke(fract(bands) - 0.5, 0.28, aa * count / max(d, 0.025));
    ink *= smoothstep(0.035, 0.07, d);
    colorPhase = floor(bands) * 0.17;
  } else if (geometry == 2.0) {
    // Full-frame interlaced horizontal and vertical ribbons, not radial spokes.
    float count = 6.0 + floor(level * 22.0) + sectors * 0.3;
    vec2 q = p * count;
    q.x += 0.35 * sin(p.y * 9.0 + clock + phase);
    q.y += 0.35 * sin(p.x * 7.0 - clock * 0.7);
    vec2 cell = floor(q);
    vec2 ribbon = abs(fract(q) - 0.5);
    float warp = fcStroke(ribbon.x, 0.1, aa * count);
    float weft = fcStroke(ribbon.y, 0.1, aa * count);
    float over = mod(cell.x + cell.y, 2.0);
    ink = max(warp * mix(0.45, 1.0, over), weft * mix(1.0, 0.45, over));
    colorPhase = (cell.x + cell.y) * 0.07;
  } else {
    // Staggered vertical processions of broad votive tiles with hollow centres.
    float count = 2.0 + floor(level * 5.0);
    vec2 q = p * vec2(count, count * 1.6);
    float column = floor(q.x);
    q.y += mod(column, 2.0) * 0.5 + clock * (0.18 + 0.06 * sin(column + phase));
    vec2 cell = abs(fract(q) - 0.5);
    float tile = max(cell.x / 0.42, cell.y / 0.43);
    float outside = 1.0 - smoothstep(0.92, 1.0 + aa * count, tile);
    float inside = smoothstep(0.22 + aperture * 0.2, 0.3 + aperture * 0.2, tile);
    ink = outside * inside;
    colorPhase = column * 0.13 + floor(q.y) * 0.21;
  }

  // Gesture and shared beat injection use the same bounded history path.
  vec2 gesture = (u_gesture.xy - 0.5) * vec2(aspect, 1.0);
  float brushRadius = 0.03 + 0.012 * bass;
  float brushDistance = length(p - gesture);
  float brush = (1.0 - smoothstep(brushRadius * 0.35, brushRadius, brushDistance)) * clamp(u_gesture.z, 0.0, 1.0);
  float brushRim = fcStroke(brushDistance - brushRadius * 1.7, width, aa) * clamp(u_gesture.z, 0.0, 1.0);
  vec3 pigment = mix(u_primary, u_secondary, 0.5 + 0.35 * sin(colorPhase * FC_TAU + phase));
  pigment = mix(pigment, u_accent, 0.2 + 0.15 * cos(colorPhase * FC_TAU - clock * 0.2));
  pigment = 0.86 * clamp(mix(pigment, u_accent, brush), 0.0, 1.0);
  float coverage = clamp(ink * injection + brush + 0.6 * brushRim, 0.0, 1.0);
  float alphaAt60 = clamp(coverage * (0.72 + 0.08 * onset), 0.0, 0.9);
  float alpha = 1.0 - pow(1.0 - alphaAt60, dtFrames);
  // Convex injection: return coefficient <= pow(.985, 60 * dt), and pigment
  // <= .86 per channel. Neither cuts nor fades feed the graded output back.
  vec3 color = history * gain * (1.0 - alpha) + pigment * alpha;
  emit(vec4(clamp(color, 0.0, 1.0), 1.0));
}
`;

export default {
  id: "feedback",
  // Contract v3 performance metadata; see scene-acid.mjs. Signed motions
  // scale their magnitude with energy instead of shifting.
  energy: {
    rotation: { mul: [0.3, 2.5] },
    zoom: { mul: [0.4, 2.5] },
    injection: [0.3, 0.95],
    persistence: [0.98, 0.86],
  },
  beat: { punch: 1.2, pulse: 1, inject: 0.8 },
  audio: [
    { param: "injection", feature: "onset", amount: 0.16 },
    { param: "aperture", feature: "low", amount: 0.08 },
    { param: "rotation", feature: "mid", amount: 0.06 },
  ],
  stage: ["zoom", "rotation", "injection"],
  type: { key: "geometry", values: [0, 1, 2, 3] },
  number: 52,
  name: "Feedback Chapel",
  description:
    "Bounded feedback halos, off-axis polygon portals, interlaced ribbons and votive processions. Paint an impulse; sculpt transport and trace persistence. Energy adds motion and detail without additive brightness.",
  schema,
  presets,
  fragment,
};
