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
    label: "Geometry: ring / polygon / lines / mixed",
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
const float FC_PI = 3.14159265359;
const float FC_TAU = 6.28318530718;

vec2 fcRotate(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec2 fcMirror(vec2 p, float sectors) {
  if (sectors < 1.5) return p;
  float wedge = FC_TAU / sectors;
  float angle = abs(mod(atan(p.y, p.x) + 0.5 * wedge, wedge) - 0.5 * wedge);
  return length(p) * vec2(cos(angle), sin(angle));
}

float fcStroke(float distanceToLine, float width, float aa) {
  return 1.0 - smoothstep(width, width + aa, abs(distanceToLine));
}

float fcPolygon(vec2 p, float sides, float radius) {
  float sector = FC_TAU / sides;
  float a = atan(p.y, p.x);
  return length(p) * cos(floor(a / sector + 0.5) * sector - a) - radius;
}

void main() {
  float dtFrames = clamp(u_dt, 0.0, 0.1) * 60.0;
  float persistence = clamp(u_params[0], 0.15, 0.985);
  float gain = pow(persistence, dtFrames);
  float zoom = clamp(u_params[1], -0.22, 0.22);
  float rotation = clamp(u_params[2], -0.8, 0.8);
  float sectors = floor(clamp(u_params[3], 1.0, 12.0) + 0.5);
  float geometry = clamp(u_params[4], 0.0, 3.0);
  float injection = clamp(u_params[5], 0.0, 1.0);
  float aperture = clamp(u_params[6], 0.12, 0.9);
  float audio = clamp(u_params[7], 0.0, 1.0);
  float bass = clamp(u_bass, 0.0, 1.0) * audio;
  float mid = clamp(u_mid, 0.0, 1.0) * audio;
  float high = clamp(u_high, 0.0, 1.0) * audio;
  float onset = clamp(u_onset, 0.0, 1.0) * audio;
  float energy = clamp(u_energy, 0.0, 1.0) * audio;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  float aa = 1.5 / max(u_resolution.y, 1.0);
  float phase = hash(vec2(52.0, 19.0)) * FC_TAU;

  // Low persistence is a stable recovery cue: freeze the injector's motion too.
  float movement = smoothstep(0.2, 0.9, persistence);
  float clock = u_time * movement;
  float spin = clamp(rotation * (1.0 + 0.3 * mid), -0.8, 0.8);
  float dilation = clamp(zoom + bass * 0.035 * sign(zoom), -0.22, 0.22);
  vec2 source = fcRotate(p, -spin * clamp(u_dt, 0.0, 0.1));
  source *= exp(-dilation * clamp(u_dt, 0.0, 0.1));
  source = fcMirror(source, sectors);
  vec2 sourceUV = source / vec2(aspect, 1.0) + 0.5;
  vec3 history = vec3(0.0);
  if (!u_reset && all(greaterThanEqual(sourceUV, vec2(0.0))) && all(lessThanEqual(sourceUV, vec2(1.0)))) {
    history = texture(u_previous, sourceUV).rgb;
  }

  // Narrow signed-distance strokes inject geometry, never filled white disks.
  float radius = aperture * 0.46 * (1.0 + 0.065 * sin(clock * 0.43 + phase) + 0.09 * bass);
  vec2 q = fcRotate(p, 0.09 * clock + phase + audio * 0.015 * sin(u_beat * FC_PI));
  float r = length(q);
  float angle = atan(q.y, q.x);
  float width = 0.003 + 0.003 * injection + 0.0012 * high;
  float ring = fcStroke(r - radius, width, aa);
  float outer = fcStroke(r - radius * (1.32 + 0.04 * sin(clock * 0.29)), width * 0.65, aa);
  float ringGap = 0.3 + 0.7 * smoothstep(-0.55, 0.2, sin(angle * 3.0 + clock * 0.21 + phase));
  float rings = ring + 0.46 * outer * ringGap * movement;
  float sides = max(3.0, sectors);
  float polygon = fcStroke(fcPolygon(q, sides, radius), width, aa);
  float polygonInner = fcStroke(fcPolygon(fcRotate(q, 0.2 + clock * 0.035), sides, radius * 0.67), width * 0.65, aa);
  float polygons = polygon + 0.55 * polygonInner;
  vec2 folded = fcMirror(q, max(3.0, sectors));
  float spoke = fcStroke(folded.y, width * 0.7, aa);
  spoke *= smoothstep(radius * 0.28, radius * 0.42, r) * (1.0 - smoothstep(radius * 1.35, radius * 1.5, r));
  float chord = fcStroke(folded.x - radius * 0.76, width, aa);
  chord *= 1.0 - smoothstep(radius * 0.48, radius * 0.61, abs(folded.y));
  float lines = max(spoke, chord);

  float ringWeight = max(1.0 - geometry, 0.0) + max(geometry - 2.0, 0.0) * 0.55;
  float polygonWeight = max(1.0 - abs(geometry - 1.0), 0.0) + max(geometry - 2.0, 0.0) * 0.65;
  float lineWeight = max(1.0 - abs(geometry - 2.0), 0.0) + max(geometry - 2.0, 0.0) * 0.35;
  float ringInk = rings * ringWeight;
  float polygonInk = polygons * polygonWeight;
  float lineInk = lines * lineWeight;

  // Gesture deposits a finite brush stroke that enters the same feedback path.
  vec2 gesture = (u_gesture.xy - 0.5) * vec2(aspect, 1.0);
  float brushRadius = 0.016 + 0.012 * bass;
  float brushDistance = length(p - gesture);
  float brush = (1.0 - smoothstep(brushRadius * 0.35, brushRadius, brushDistance)) * clamp(u_gesture.z, 0.0, 1.0);
  float brushRim = fcStroke(brushDistance - brushRadius * 1.7, width, aa) * clamp(u_gesture.z, 0.0, 1.0);
  float total = ringInk + polygonInk + lineInk + brush + brushRim;
  vec3 ringColor = mix(u_primary, u_secondary, 0.25 + 0.2 * sin(angle + clock * 0.15));
  ringColor = mix(ringColor, u_accent, 0.12 + 0.1 * sin(angle * 3.0 - clock * 0.13));
  vec3 polygonColor = mix(u_secondary, u_accent, 0.25 + 0.2 * sin(clock * 0.23 + phase));
  polygonColor = mix(polygonColor, u_primary, 0.12 + 0.08 * cos(angle * 2.0));
  vec3 lineColor = mix(mix(u_accent, u_primary, 0.35), u_secondary, 0.18 + 0.1 * cos(clock * 0.19 + angle));
  vec3 pigment = ringInk * ringColor + polygonInk * polygonColor + lineInk * lineColor;
  pigment += brush * u_accent + brushRim * u_secondary;
  pigment = 0.86 * clamp(pigment / max(total, 0.00001), 0.0, 1.0);

  float geometryCoverage = clamp(ringInk + polygonInk + lineInk, 0.0, 1.0) * injection;
  float coverage = clamp(geometryCoverage + brush + 0.6 * brushRim, 0.0, 1.0);
  float inkRate = mix(0.75, 0.22, smoothstep(0.2, 0.9, persistence));
  float alphaAt60 = coverage * (inkRate + 0.06 * energy + 0.06 * onset);
  float alpha = 1.0 - pow(1.0 - alphaAt60, dtFrames);
  // Convex injection: return coefficient <= pow(.985, 60 * dt), and pigment
  // <= .86 per channel. It cannot build brightness through additive feedback.
  vec3 color = history * gain * (1.0 - alpha) + pigment * alpha;
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "feedback",
  number: 52,
  name: "Feedback Chapel",
  description:
    "Mirrored video-feedback halos, polygon tunnels and woven rays. Paint an impulse; sculpt trace persistence. Rehearse Quiet Apse → Molten Reliquary → Evolving Tunnel → Clean Recovery for a deliberate opening and ending.",
  schema,
  presets,
  fragment,
};
