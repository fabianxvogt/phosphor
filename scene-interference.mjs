const schema = [
  { key: 'composition', label: 'Composition · 0–5', min: 0, max: 5, step: 1, default: 0 },
  { key: 'fields', label: 'Coherent fields', min: 1, max: 3, step: 1, default: 2 },
  { key: 'ratio', label: 'Frequency ratio', min: 0.5, max: 2, step: 0.001, default: 1.04 },
  { key: 'phase', label: 'Relative phase · turns', min: 0, max: 1, step: 0.001, default: 0.18 },
  { key: 'orientation', label: 'Orientation · degrees', min: 0, max: 180, step: 1, default: 24 },
  { key: 'palette', label: 'Palette phase', min: 0, max: 1, step: 0.001, default: 0.12 },
  { key: 'motion', label: 'Motion · zero holds still', min: 0, max: 1, step: 0.01, default: 0.25 },
  { key: 'beatLock', label: 'Beat lock · free → tempo', min: 0, max: 1, step: 0.01, default: 0 },
];

const presets = [
  { name: 'Moire Veil', seed: 5311, params: { composition: 0, fields: 2, ratio: 1.04, phase: 0.18, orientation: 24, palette: 0.12, motion: 0.22, beatLock: 0 } },
  { name: 'Twin Tides', seed: 5322, params: { composition: 1, fields: 2, ratio: 0.97, phase: 0.38, orientation: 8, palette: 0.32, motion: 0.18, beatLock: 0 } },
  { name: 'Golden Lattice', seed: 5333, params: { composition: 2, fields: 3, ratio: 1.618, phase: 0.12, orientation: 72, palette: 0.56, motion: 0.12, beatLock: 0 } },
  { name: 'Orbit Loom', seed: 5344, params: { composition: 3, fields: 3, ratio: 0.75, phase: 0.63, orientation: 35, palette: 0.74, motion: 0.55, beatLock: 1 } },
  { name: 'Petal Resonance', seed: 5355, params: { composition: 4, fields: 3, ratio: 1.23, phase: 0.27, orientation: 116, palette: 0.94, motion: 0.35, beatLock: 0.6 } },
  { name: 'Bent Horizons', seed: 5366, params: { composition: 5, fields: 2, ratio: 1.08, phase: 0.82, orientation: 154, palette: 0.42, motion: 0, beatLock: 1 } },
];

const fragment = `
#define IR_TAU TAU

vec2 irRotate(vec2 p, float angle) { return rot2(-angle) * p; }

float irSinc(float x) {
  return abs(x) < 0.001 ? 1.0 - x * x / 6.0 : sin(x) / x;
}

// A rectangular pixel footprint integrates each analytic cosine. A conservative
// third-Nyquist taper reserves headroom for the nonlinear pigment/contrast map,
// removing fine animated carriers before their harmonics can shimmer.
float irFilteredCos(float phase) {
  float dx = dFdx(phase), dy = dFdy(phase);
  float width = fwidth(phase);
  float cutoff = 1.0 - smoothstep(0.55, 1.04719755, max(abs(dx), abs(dy)));
  float footprint = irSinc(0.5 * dx) * irSinc(0.5 * dy);
  // fwidth also guards diagonal footprints whose individual axes are narrow.
  cutoff *= 1.0 - smoothstep(1.10, 2.09439510, width);
  return cos(phase) * footprint * cutoff;
}

void main() {
  float mode = floor(u_params[0] + 0.5);
  float count = floor(u_params[1] + 0.5);
  float ratio = u_params[2];
  float motion = u_params[6];
  // A locked performance derives all evolution from transport beats, not a
  // second wall-clock oscillator: one phrase is eight beats. Motion scales
  // both transports; zero freezes geometry, interference and audio response.
  float clock = mix(u_time * 0.07, u_beat * 0.125, u_params[7]);
  float evolution = motion * clock;
  float phase = IR_TAU * u_params[3];
  float drift = IR_TAU * evolution;
  float seedAngle = fract(u_seed * 0.173) * IR_TAU;
  vec2 p = irRotate(aspectUV(), radians(u_params[4]));
  float breath = sin(drift * 0.25 + seedAngle) * motion;
  float bend = 0.12 + 0.10 * breath;
  vec2 gesture = (u_gesture.xy - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  gesture = irRotate(gesture, radians(u_params[4]));
  vec2 center = gesture * u_gesture.z * 0.22;
  p -= center;

  // Each branch constructs exactly three scalar phases; the field-count
  // control excludes the second/third terms without introducing more fields.
  // Relative phase is in turns and the frequencies are f, f*r, f*r*r.
  float a, b, c;
  float f;
  if (mode < 0.5) {
    f = 15.0;
    float separation = 0.085 + 0.025 * breath;
    a = IR_TAU * f * p.x - drift;
    b = IR_TAU * f * ratio * dot(p, vec2(cos(separation), sin(separation))) + phase + drift;
    c = IR_TAU * f * ratio * ratio * dot(p, vec2(cos(-separation), sin(-separation))) - phase;
  } else if (mode < 1.5) {
    f = 10.0;
    vec2 offset = vec2(0.19 + 0.045 * breath, 0.075);
    a = IR_TAU * f * length(p - offset) - drift;
    b = IR_TAU * f * ratio * length(p + offset) + phase - drift;
    c = IR_TAU * f * ratio * ratio * length(p - vec2(0.0, 0.23)) - phase + drift * 0.5;
  } else if (mode < 2.5) {
    f = 8.0;
    a = IR_TAU * f * p.x - drift;
    b = IR_TAU * f * ratio * dot(p, vec2(0.309016994, 0.951056516)) + phase + drift * 0.5;
    c = IR_TAU * f * ratio * ratio * dot(p, vec2(-0.809016994, 0.587785252)) - phase - drift * 0.25;
  } else if (mode < 3.5) {
    f = 9.0;
    vec2 orbit = vec2(cos(drift * 0.2 + seedAngle), sin(drift * 0.2 + seedAngle)) * (0.08 + motion * 0.09);
    a = IR_TAU * f * length(p - orbit) - drift;
    b = IR_TAU * f * ratio * p.x + phase + drift * 0.5;
    c = IR_TAU * f * ratio * ratio * p.y - phase - drift * 0.5;
  } else if (mode < 4.5) {
    f = 9.0;
    float r = length(p);
    // A smooth Cartesian rose avoids atan's branch-cut derivative seam.
    vec2 n = p / sqrt(dot(p, p) + 0.0025);
    float rose = n.x * n.x - n.y * n.y;
    float petals = 2.0 * n.x * n.y;
    a = IR_TAU * f * (r + 0.055 * rose) - drift;
    b = IR_TAU * f * ratio * (r + 0.055 * petals) + phase + drift * 0.5;
    c = IR_TAU * f * ratio * ratio * (r - 0.055 * rose) - phase - drift * 0.25;
  } else {
    f = 12.0;
    a = IR_TAU * f * (p.y + bend * p.x * p.x) - drift;
    b = IR_TAU * f * ratio * (p.y - bend * p.x * p.x + 0.055 * p.x) + phase + drift;
    c = IR_TAU * f * ratio * ratio * (p.x + bend * p.y * p.y) - phase;
  }

  float hasB = step(1.5, count);
  float hasC = step(2.5, count);
  float sum = irFilteredCos(a) + hasB * irFilteredCos(b) + hasC * irFilteredCos(c);
  // Average of pair phase differences is the analytic interference envelope.
  // Filtering these differences separately preserves resolvable moire bands
  // even when their individual carriers are finer than the pixel footprint.
  float pairs = hasB + 2.0 * hasC;
  float envelope = hasB * irFilteredCos(a - b)
    + hasC * (irFilteredCos(a - c) + irFilteredCos(b - c));
  envelope = pairs > 0.0 ? 0.5 + 0.5 * envelope / pairs : 0.5;
  float carrier = 0.5 + 0.5 * sum / count;
  float interference = mix(carrier, envelope, 0.62 * hasB);
  float light = smoothstep(0.1, 0.93, interference);
  float contour = pow(max(0.0, carrier), 3.0);
  float palettePhase = 0.5 + 0.5 * sin(IR_TAU * (u_params[5] + interference * 0.63) + motion * sin(drift * 0.125) * 0.2);
  vec3 pigment = palette(palettePhase);
  vec3 background = mix(u_secondary, u_primary, 0.18) * 0.045;
  float audioLift = motion * (0.10 * u_energy + 0.05 * u_bass);
  vec3 color = background + pigment * (0.13 + light * 0.64 + audioLift) + u_accent * contour * 0.12;
  // A soft spatial falloff keeps the full-screen lattice composed, not cropped
  // to a hard circle; it remains legible in quiet and zero-motion performances.
  float vignette = 1.0 - 0.32 * smoothstep(0.18, 1.15, length(aspectUV()));
  outColor = vec4(clamp(color * vignette, 0.0, 1.0), 1.0);
}
`;

export default {
  id: 'interference',
  number: 53,
  name: 'Interference Rituals',
  description: 'Six analytic wave compositions: moire veils, paired ripples, quasiperiodic gratings, orbit lattices, petal ripples and curved horizons. Combine one to three fields with frequency ratios f:f·r:f·r² and relative phase in turns. Beat lock follows an eight-beat phrase; zero motion freezes evolution. Pixel-footprint filtering fades unresolved carriers while retaining resolvable interference envelopes; this is an artistic scalar-wave model, not an optical simulation.',
  schema,
  presets,
  fragment,
};
