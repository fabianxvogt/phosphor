const schema = [
  { key: 'coupling', label: 'Coupling', min: 0, max: 6, step: 0.01, default: 2.8 },
  { key: 'noise', label: 'Phase noise', min: 0, max: 1, step: 0.01, default: 0.04 },
  { key: 'speed', label: 'Clock speed', min: 0, max: 3, step: 0.01, default: 0.65 },
  { key: 'disturbance', label: 'Seed disturbance', min: 0, max: 2, step: 0.01, default: 0.3 },
  { key: 'detuning', label: 'Frequency spread', min: 0, max: 2, step: 0.01, default: 0.12 },
  { key: 'winding', label: 'Wave winding', min: 0, max: 4, step: 1, default: 0 },
  { key: 'coherence', label: 'Initial coherence', min: 0, max: 1, step: 0.01, default: 0.9 },
  { key: 'arc', label: 'Arc: manual / gather / launch / return', min: 0, max: 3, step: 1, default: 1 },
];

// Each pair is a contrasting realization of one 24-second build / transition /
// release score. These are local phase oscillators, not a thermodynamic model.
const presets = [
  { name: 'Gather · quiet porcelain', seed: 5501, params: { coupling: 3.8, noise: 0.015, speed: 0.45, disturbance: 0.25, detuning: 0.05, winding: 0, coherence: 0.96, arc: 1 } },
  { name: 'Gather · domain mosaic', seed: 5502, params: { coupling: 2.7, noise: 0.12, speed: 0.9, disturbance: 0.85, detuning: 0.4, winding: 0, coherence: 0.28, arc: 1 } },
  { name: 'Launch · long wave', seed: 5503, params: { coupling: 4.8, noise: 0.025, speed: 0.85, disturbance: 0.7, detuning: 0.08, winding: 1, coherence: 0.98, arc: 2 } },
  { name: 'Launch · crossing chorus', seed: 5504, params: { coupling: 3.5, noise: 0.16, speed: 1.35, disturbance: 1.65, detuning: 0.3, winding: 3, coherence: 0.76, arc: 2 } },
  { name: 'Return · amber islands', seed: 5505, params: { coupling: 2.2, noise: 0.065, speed: 0.6, disturbance: 0.55, detuning: 0.18, winding: 0, coherence: 0.52, arc: 3 } },
  { name: 'Return · after the storm', seed: 5506, params: { coupling: 5.2, noise: 0.32, speed: 1.15, disturbance: 1.8, detuning: 0.6, winding: 2, coherence: 0.42, arc: 3 } },
];

const simulationFragment = `
const float TAU = 6.28318530718;
float decodePhase(vec2 rg) {
  return TAU * (rg.x * 65280.0 + rg.y * 255.0) / 65536.0;
}
vec2 encodePhase(float theta) {
  float q = floor(fract(theta / TAU) * 65536.0);
  return vec2(floor(q / 256.0), mod(q, 256.0)) / 255.0;
}
float phaseAt(ivec2 p, ivec2 size) {
  return decodePhase(texelFetch(u_state, (p + size) % size, 0).rg);
}
vec2 torusDelta(vec2 a, vec2 b) {
  return mod(a - b + 0.5, 1.0) - 0.5;
}
void main() {
  ivec2 size = textureSize(u_state, 0);
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec2 uv = (vec2(cell) + 0.5) / vec2(size);
  vec2 source = vec2(0.2 + 0.6 * hash(vec2(15.2, 4.8)),
                     0.2 + 0.6 * hash(vec2(4.2, 19.1)));
  float winding = floor(u_params[5] + 0.5);
  if (u_reset) {
    // A seeded coarse mosaic gives domains without an external potential.
    // Integer winding makes the initial phase continuous across torus seams.
    vec2 tile = floor(uv * 8.0);
    float domain = hash(tile + vec2(34.3, 71.8));
    float theta = TAU * (winding * (uv.x + uv.y)
                       + (1.0 - u_params[6]) * domain);
    vec2 d = torusDelta(uv, source);
    theta += u_params[3] * 2.0 * exp(-dot(d, d) / 0.004);
    float intrinsic = hash(vec2(cell) + vec2(82.1, 16.7));
    outColor = vec4(encodePhase(theta), intrinsic, 1.0);
    return;
  }
  vec4 old = texelFetch(u_state, cell, 0);
  float theta = decodePhase(old.rg);
  vec4 neighbor = vec4(phaseAt(cell + ivec2(1, 0), size),
                       phaseAt(cell - ivec2(1, 0), size),
                       phaseAt(cell + ivec2(0, 1), size),
                       phaseAt(cell - ivec2(0, 1), size));
  vec4 relative = neighbor - theta;
  float alignment = dot(sin(relative), vec4(0.25));
  float arc = floor(u_params[7] + 0.5);
  float t = mod(u_time, 24.0);
  float build = smoothstep(2.0, 9.0, t);
  float release = smoothstep(15.0, 23.0, t);
  float crest = build * (1.0 - release);
  float sourcePulse = smoothstep(8.0, 10.0, t) * (1.0 - smoothstep(12.0, 16.0, t));
  float k = u_params[0];
  float noise = u_params[1];
  float clock = u_params[2];
  float forcing = 0.0;
  if (arc > 0.5 && arc < 1.5) {
    // Gather: coupling grows, a local interruption peaks, then motion softens.
    k *= mix(0.3, 1.0, build);
    noise *= 1.0 - 0.8 * build;
    clock *= mix(0.4, 1.0, crest);
    forcing = sourcePulse;
  } else if (arc > 1.5 && arc < 2.5) {
    // Launch: established winding speeds up, launches a pulse, then coasts.
    k *= mix(0.65, 1.0, crest);
    clock *= mix(0.3, 1.0, crest);
    forcing = 1.5 * sourcePulse;
  } else if (arc > 2.5) {
    // Return: agitation builds while coupling retreats; release restores it.
    k *= mix(1.0, 0.18, crest);
    noise *= mix(0.1, 1.0, crest);
    clock *= mix(0.35, 1.0, crest);
    forcing = sourcePulse;
  }
  float dt = max(u_dt, 0.0) * clock;
  float omega = 0.65 + u_params[4] * (2.0 * old.b - 1.0);
  vec2 ds = torusDelta(uv, source);
  float field = forcing * exp(-dot(ds, ds) / 0.003);
  vec2 dg = torusDelta(uv, u_gesture.xy);
  field += clamp(u_gesture.z, 0.0, 1.0) * exp(-dot(dg, dg) / 0.002);
  field += 0.3 * clamp(u_onset, 0.0, 1.0) * exp(-dot(ds, ds) / 0.003);
  // Uniform zero-mean unit-variance noise, deterministic for a seed/tick.
  float xi = (2.0 * hash(vec2(cell) + vec2(floor(u_time * 60.0) * 0.731, 27.7)) - 1.0) * 1.73205080757;
  if (dt <= 0.0) {
    outColor = old;
    return;
  }
  theta += dt * (omega + k * alignment + 8.0 * u_params[3] * field)
         + noise * sqrt(dt) * xi;
  vec2 order = vec2(dot(cos(relative), vec4(0.25)),
                    dot(sin(relative), vec4(0.25)));
  outColor = vec4(encodePhase(theta), old.b, clamp(length(order), 0.0, 1.0));
}
`;

const fragment = `
const float TAU = 6.28318530718;
float decodePhase(vec2 rg) {
  return TAU * (rg.x * 65280.0 + rg.y * 255.0) / 65536.0;
}
vec3 phaseSample(ivec2 p, ivec2 size) {
  vec4 s = texelFetch(u_state, (p + size) % size, 0);
  float theta = decodePhase(s.rg);
  return vec3(cos(theta), sin(theta), s.a);
}
vec3 smoothPhase(vec2 uv) {
  ivec2 size = textureSize(u_state, 0);
  vec2 p = fract(uv) * vec2(size) - 0.5;
  ivec2 cell = ivec2(floor(p));
  vec2 f = fract(p);
  // Interpolate complex phase, never angle: no false seam at 2 pi.
  return mix(mix(phaseSample(cell, size), phaseSample(cell + ivec2(1, 0), size), f.x),
             mix(phaseSample(cell + ivec2(0, 1), size), phaseSample(cell + ivec2(1, 1), size), f.x), f.y);
}
void main() {
  vec3 state = smoothPhase(v_uv);
  float theta = atan(state.y, state.x);
  float order = clamp(state.z, 0.0, 1.0);
  float phaseLight = 0.5 + 0.5 * cos(theta);
  float band = pow(0.5 + 0.5 * cos(theta * 3.0), 12.0);
  float boundary = 1.0 - order;
  float coherence = clamp(length(state.xy), 0.0, 1.0);
  vec2 pixel = 1.0 / vec2(textureSize(u_state, 0));
  vec3 sx = smoothPhase(v_uv + vec2(pixel.x, 0.0));
  vec3 sy = smoothPhase(v_uv + vec2(0.0, pixel.y));
  // Directional illumination makes wave sheets legible, not random glow.
  float slope = (sx.x - state.x) * 5.0 + (sy.y - state.y) * 3.0;
  float light = clamp(0.58 + slope, 0.18, 1.0);
  vec3 color = palette(0.12 + 0.76 * phaseLight) * (0.2 + 0.5 * light);
  color += u_primary * band * (0.08 + 0.3 * coherence);
  color = mix(color, u_secondary * 0.12, clamp(boundary * 0.6, 0.0, 0.7));
  color += u_accent * boundary * (0.3 + 0.25 * clamp(u_energy, 0.0, 1.0));
  float vignette = 1.0 - 0.55 * smoothstep(0.15, 0.8, length(aspectUV()));
  color *= vignette;
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export default {
  id: 'phase',
  number: 55,
  name: 'Phase Transition Theatre',
  description: 'A toroidal nearest-neighbor Kuramoto lattice: seeded domains, winding waves, and three 24-second build / interruption / release scores. Coupling aligns phases; frequency spread and noise compete with it. Reset seeds the disturbance; drag to drive a local wave. Artistic oscillator dynamics, not a claim of thermodynamic transitions or hysteresis.',
  schema,
  presets,
  fragment,
  simulation: { fragment: simulationFragment, size: [128, 128], steps: 1 },
  model: {
    equation: 'theta_i(t+dt) = wrap(theta_i + dt*s*(0.65 + spread*(2*b_i-1) + K/4*sum_{j in four toroidal neighbors} sin(theta_j-theta_i) + 8*disturbance*F_i) + noise*sqrt(dt*s)*xi_i). Arc scores modulate K, noise and s; xi has zero mean and unit variance.',
    state: '128 x 128 = 16,384 oscillators. RG encodes periodic phase in 16 bits; B stores seeded intrinsic frequency; A stores local four-neighbor order. Two RGBA8 buffers: 131,072 bytes total. One explicit Euler / Euler-Maruyama update per 1/60-second tick.',
    disturbance: 'Reset applies a seeded Gaussian phase kick. Pointer input, audio onset and the authored transition pulse add bounded Gaussian frequency forcing, with periodic distances on the torus.',
    limitations: 'Finite-size, quantized, nearest-neighbor oscillator artwork. No measured hysteresis, critical point, physical crystallization or equilibrium-phase claim. Clock speed zero freezes the state.',
  },
  arcs: [
    { name: 'Gather', value: 1, duration: 24, stages: '0–2s quiet; 2–9s increasing alignment; 8–16s local disturbance; 15–23s quiet release.' },
    { name: 'Launch', value: 2, duration: 24, stages: '0–2s coasting winding; 2–9s accelerating waves; 8–16s wave launch; 15–23s deceleration.' },
    { name: 'Return', value: 3, duration: 24, stages: '0–2s aligned; 2–9s increasing noise and reduced coupling; 8–16s interruption; 15–23s restoring alignment.' },
  ],
};
