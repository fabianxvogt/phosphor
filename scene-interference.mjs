const schema = [
  {
    key: "composition",
    label: "Composition · 0–2",
    min: 0,
    max: 2,
    step: 1,
    default: 0,
  },
  {
    key: "fields",
    label: "Wave sources · per layer",
    min: 1,
    max: 3,
    step: 1,
    default: 2,
  },
  {
    key: "ratio",
    label: "Frequency ratio",
    min: 0.5,
    max: 2,
    step: 0.001,
    default: 1.04,
  },
  {
    key: "phase",
    label: "Relative phase · turns",
    min: 0,
    max: 1,
    step: 0.001,
    default: 0.18,
  },
  {
    key: "orientation",
    label: "Orientation · degrees",
    min: 0,
    max: 180,
    step: 1,
    default: 24,
  },
  {
    key: "palette",
    label: "Palette phase",
    min: 0,
    max: 1,
    step: 0.001,
    default: 0.12,
  },
  {
    key: "motion",
    label: "Motion · zero holds still",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.25,
  },
  {
    key: "beatLock",
    label: "Beat lock · free → tempo",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
  },
];

const presets = [
  {
    name: "Moire Veil",
    seed: 5311,
    params: {
      composition: 0,
      fields: 2,
      ratio: 1.04,
      phase: 0.18,
      orientation: 24,
      palette: 0.12,
      motion: 0.22,
      beatLock: 0,
    },
  },
  {
    name: "Twin Tides",
    seed: 5322,
    params: {
      composition: 1,
      fields: 2,
      ratio: 0.97,
      phase: 0.38,
      orientation: 8,
      palette: 0.32,
      motion: 0.18,
      beatLock: 0,
    },
  },
  {
    name: "Golden Lattice",
    seed: 5333,
    params: {
      composition: 2,
      fields: 3,
      ratio: 1.618,
      phase: 0.12,
      orientation: 72,
      palette: 0.56,
      motion: 0.12,
      beatLock: 0,
    },
  },
  {
    name: "Crossed Loom",
    seed: 5344,
    params: {
      composition: 2,
      fields: 3,
      ratio: 0.75,
      phase: 0.63,
      orientation: 35,
      palette: 0.74,
      motion: 0.55,
      beatLock: 1,
    },
  },
  {
    name: "Ripple Resonance",
    seed: 5355,
    params: {
      composition: 1,
      fields: 3,
      ratio: 1.23,
      phase: 0.27,
      orientation: 116,
      palette: 0.94,
      motion: 0.35,
      beatLock: 0.6,
    },
  },
  {
    name: "Tempo Veil",
    seed: 5366,
    params: {
      composition: 0,
      fields: 2,
      ratio: 1.08,
      phase: 0.82,
      orientation: 154,
      palette: 0.42,
      motion: 0.12,
      beatLock: 1,
    },
  },
];

const fragment = `
// Integrate the carriers over the pixel footprint, then taper before Nyquist.
// Pair differences are filtered independently: resolvable moire survives even
// when the individual waves disappear into the distance.
float irFilteredCos(float phase) {
  vec2 gradient = vec2(dFdx(phase), dFdy(phase));
  float cutoff = 1.0 - smoothstep(0.55, 1.04719755, max(abs(gradient.x), abs(gradient.y)));
  cutoff *= 1.0 - smoothstep(1.10, 2.09439510, fwidth(phase));
  // In the retained range this second-order sinc footprint avoids two extra
  // trigonometric evaluations per wave; the taper removes its high-error tail.
  float footprint = max(0.0, 1.0 - dot(gradient, gradient) / 24.0);
  return cos(phase) * footprint * cutoff;
}

void main() {
  float mode = floor(u_params[0] + 0.5);
  float count = floor(u_params[1] + 0.5);
  float ratio = u_params[2];
  float motion = u_params[6];
  // Both clocks advance one unit in four beats at 120 BPM. Multiplicative
  // energy motion keeps an authored zero stationary at every show level.
  float clock = mix(u_time * 0.5, u_beat * 0.25, u_params[7]);
  float evolution = motion * clock;
  // Keep sources near the view instead of advecting them infinitely far away
  // (which eventually collapses spherical waves to stripes). Commensurate
  // orbit/phase periods also retain float precision through an eight-hour set.
  float orbit = mod(evolution, TAU * 100.0);
  float drift = TAU * mod(evolution, 20.0);
  float travel = sin(orbit * 0.7) * 2.4;
  float phase = TAU * u_params[3];
  float seedAngle = float(seedHash(u_seedBits) >> 8u) / 16777216.0 * TAU;
  float orientation = radians(u_params[4]);
  vec2 screen = aspectUV();
  vec2 gesture = (u_gesture.xy - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 camera = vec2(sin(orbit * 0.9 + seedAngle), cos(orbit * 0.73 + seedAngle))
    * motion * 0.18 + gesture * u_gesture.z * 0.16;
  float frequency = mix(1.6, 7.2, u_level);
  float hard = smoothstep(0.65, 0.95, u_level);
  float hasB = step(1.5, count), hasC = step(2.5, count);
  float pairs = hasB + 2.0 * hasC;
  float separation = mix(0.035, 0.43, u_level);
  float paletteBase = 0.5 + 0.17 * sin(TAU * u_params[5]);
  vec3 background = palette(0.15) * 0.035;
  vec3 color = background;

  // Three transparent wave surfaces, composed far to near. The third enters
  // with energy; different plane heights/shell radii and camera offsets give
  // real perspective scale, distance attenuation and depth-dependent parallax.
  // This fixed analytic bound has no raymarch, texture lookup or simulation.
  for (int index = 0; index < 3; index++) {
    float layer = float(2 - index);
    float visibility = layer > 1.5 ? smoothstep(0.18, 0.78, u_level)
      : layer > 0.5 ? 0.55 + 0.45 * u_level : 1.0;
    if (visibility <= 0.0) continue;
    vec2 ray = screen - camera / (1.0 + layer * 0.65);
    float depth;
    vec3 waves;
    float f = frequency * (1.0 + 0.13 * layer);
    if (mode < 0.5) {
      // Receding floors: circular sources on three parallel wave planes.
      // A raised horizon and open sky distinguish this oblique landscape from
      // the central vault and the suspended rectangular lattice screens.
      float height = 0.28 + layer * 0.34;
      depth = height / max(0.14 - ray.y, 0.04);
      visibility *= 1.0 - smoothstep(0.10, 0.18, ray.y);
      vec2 q = rot2(orientation + layer * 0.09) * vec2(ray.x * depth, depth + travel);
      q += camera;
      waves.x = TAU * f * length(q - vec2(-0.62, 1.15)) - drift;
      waves.y = TAU * f * ratio * length(q - vec2(0.68, 1.48)) + phase + drift * 0.6;
      waves.z = TAU * f * ratio * ratio * length(q - vec2(0.08, -0.75)) - phase - drift * 0.35;
    } else if (mode < 1.5) {
      // Ripple vault: concentric cylindrical shells carry spherical sources.
      // The reciprocal radius projects an endless tunnel, not flat circles.
      float radius = 0.26 + layer * 0.22;
      depth = radius / max(length(ray), 0.04);
      vec3 wall = vec3(rot2(orientation) * ray * depth, depth + travel);
      wall.xy += camera;
      waves.x = TAU * f * length(wall - vec3(-0.34, 0.15, 0.0)) - drift * 0.2;
      waves.y = TAU * f * ratio * length(wall - vec3(0.41, -0.28, 1.25)) + phase + drift * 0.4;
      waves.z = TAU * f * ratio * ratio * length(wall - vec3(0.12, 0.42, 2.3)) - phase - drift * 0.6;
    } else {
      // Lattice screens: tilted rectangular wave planes at three depths,
      // rather than another tunnel. Outboard screens repeat on wide walls;
      // the central frame fits square outputs without cover-cropping.
      depth = 1.0 + layer * 0.75;
      float frameWidth = min(0.72, u_resolution.x / u_resolution.y * 0.42);
      vec2 q = ray * depth;
      q.x = mod(q.x + frameWidth * 1.35, frameWidth * 2.7) - frameWidth * 1.35;
      q = rot2(orientation * 0.2 + layer * 0.2) * q;
      float edge = max(abs(q.x) / frameWidth, abs(q.y) / 0.4);
      float frameAA = max(fwidth(edge), 0.002);
      visibility *= 1.0 - smoothstep(1.0 - frameAA, 1.0 + frameAA, edge);
      // Advect the wave sources through the fixed screens, so higher spatial
      // frequency increases apparent travel as well as phase oscillation.
      q += vec2(sin(orbit * 0.9) * 0.65, travel);
      waves.x = TAU * f * q.x - drift;
      waves.y = TAU * f * ratio * (q.y * 0.92 + q.x * 0.22) + phase + drift * 0.7;
      waves.z = TAU * f * ratio * ratio * (q.x - q.y) * 0.70710678 - phase - drift * 0.4;
    }

    float carrier = irFilteredCos(waves.x), envelope = 0.0;
    // Source count is uniform across the draw, so these derivative branches
    // are coherent and quiet looks do not evaluate unused carriers or pairs.
    if (hasB > 0.5) {
      carrier += irFilteredCos(waves.y);
      envelope = irFilteredCos(waves.x - waves.y);
    }
    if (hasC > 0.5) {
      carrier += irFilteredCos(waves.z);
      envelope += irFilteredCos(waves.x - waves.z) + irFilteredCos(waves.y - waves.z);
    }
    carrier = 0.5 + 0.5 * carrier / count;
    envelope = pairs > 0.0 ? 0.5 + 0.5 * envelope / pairs : 0.5;
    float interference = mix(carrier, envelope, (mode > 1.5 ? 0.25 : 0.58) * hasB);
    float edgeAA = max(fwidth(interference), 0.004);
    float bands = mix(smoothstep(0.16, 0.84, interference),
      smoothstep(0.53 - edgeAA, 0.53 + edgeAA, interference), hard);
    float fog = 1.0 / (1.0 + depth * 0.16 + depth * depth * 0.012);
    vec3 pigment = palette(clamp(paletteBase + (layer - 1.0) * separation
      + (interference - 0.5) * 0.12, 0.0, 1.0));
    float opacity = visibility * fog * (0.22 + 0.48 * bands);
    color = mix(color, background + pigment * (0.12 + 0.73 * bands), opacity);
  }

  float vignette = 1.0 - 0.14 * smoothstep(0.2, 0.7, length(v_uv - 0.5));
  outColor = vec4(clamp(color * vignette, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "interference",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { fields: [1, 3], motion: { mul: [0.08, 2.2] } },
  beat: { punch: 1, pulse: 1.2 },
  audio: [
    { param: "ratio", feature: "low", amount: 0.07 },
    { param: "phase", feature: "mid", amount: 0.12 },
    { param: "palette", feature: "high", amount: 0.12 },
  ],
  stage: ["motion", "ratio", "phase"],
  type: { key: "composition", values: [0, 1, 2] },
  number: 53,
  name: "Interference Rituals",
  description:
    "Layered analytic moire with perspective depth: receding wave floors, cylindrical ripple vaults and suspended lattice screens. Energy adds wave sources and a third depth layer, raises spatial frequency and transport speed, separates layer colours through the shared palette and hardens the interference into anti-aliased peak bands; brightness stays on master and kicks use the shared punch/pulse layer. Existing composition ids and authored controls remain portable. Beat lock follows transport; zero motion freezes every layer. Pixel-footprint filtering retains resolvable moire when distant carriers are subpixel. This is an artistic scalar-wave model, not an optical simulation.",
  schema,
  presets,
  fragment,
};
