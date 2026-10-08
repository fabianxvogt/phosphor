const schema = [
  { key: 'flow', label: 'Torus · Vortices · Silk', min: 0, max: 2, step: 0.01, default: 0 },
  { key: 'motion', label: 'Motion', min: 0, max: 2, step: 0.01, default: 0.7 },
  { key: 'density', label: 'Thread density', min: 0.15, max: 1, step: 0.01, default: 0.55 },
  { key: 'trails', label: 'Trail persistence', min: 0.2, max: 3, step: 0.01, default: 1.6 },
  { key: 'radius', label: 'Orbit radius', min: 0.12, max: 0.38, step: 0.01, default: 0.28 },
  { key: 'curl', label: 'Field curl', min: 0, max: 1.4, step: 0.01, default: 0.45 },
  { key: 'separation', label: 'Vortex separation', min: 0.14, max: 0.64, step: 0.01, default: 0.38 },
  { key: 'weave', label: 'Silk weave', min: 0, max: 1, step: 0.01, default: 0.45 },
];

const presets = [
  { name: 'Quiet Torus', seed: 4801, params: { flow: 0, motion: 0.32, density: 0.35, trails: 2.3, radius: 0.3, curl: 0.12, separation: 0.38, weave: 0.2 } },
  { name: 'Breathing Halo', seed: 4819, params: { flow: 0.12, motion: 0.9, density: 0.78, trails: 1.4, radius: 0.22, curl: 0.8, separation: 0.3, weave: 0.65 } },
  { name: 'Twin Choir', seed: 4843, params: { flow: 1, motion: 0.6, density: 0.55, trails: 2.1, radius: 0.28, curl: 0.22, separation: 0.46, weave: 0.25 } },
  { name: 'Split Counterpoint', seed: 4871, params: { flow: 1, motion: 1.4, density: 0.85, trails: 0.85, radius: 0.18, curl: 1.2, separation: 0.32, weave: 0.85 } },
  { name: 'Liquid Silk', seed: 4897, params: { flow: 2, motion: 0.42, density: 0.42, trails: 2.8, radius: 0.32, curl: 0.18, separation: 0.5, weave: 0.38 } },
  { name: 'Storm Loom', seed: 4931, params: { flow: 1.95, motion: 1.6, density: 0.95, trails: 1.2, radius: 0.24, curl: 1.3, separation: 0.6, weave: 0.95 } },
];

// Semi-Lagrangian dye transport, not discrete particles or a magnetic-physics model.
// RG carries two luminous dye concentrations; BA carries the persistent attractor UV.
// One 320² tick at 60 Hz, five state fetches/tick, no particle loops. Two RGBA8
// simulation buffers total 819,200 bytes; display history is allocated by the engine.
// Four-tap wrapped bilinear sampling is explicit because state textures use NEAREST.
// RGBA8 rounds concentrations/attractor coordinates to 1/255; deterministic fixed
// ticks reproduce a seed/control sequence on the same WebGL implementation.
const simulationFragment = `
vec2 dyeAt(vec2 uv) { return stateBilinear(uv).rg; }
vec2 turn(vec2 p) { return vec2(-p.y, p.x); }
vec2 orbit(vec2 d, float radius, float direction) {
  float r = length(d);
  return direction * turn(d) * 0.68 - d * (r - radius) * 0.7 / (r + 0.06);
}
vec2 field(vec2 uv, vec2 center) {
  vec2 d = uv - center;
  float breathing = 1.0 + 0.035 * sin(u_time * 0.5 + u_seed) + 0.045 * u_bass;
  float radius = u_params[4] * breathing;
  vec2 torus = orbit(d, radius, 1.0);
  float separation = u_params[6] * 0.5;
  vec2 dl = d + vec2(separation, 0.0);
  vec2 dr = d - vec2(separation, 0.0);
  float left = exp(-dot(dl, dl) * 15.0);
  float right = exp(-dot(dr, dr) * 15.0);
  vec2 twins = (orbit(dl, radius * 0.53, 1.0) * left
             + orbit(dr, radius * 0.53, -1.0) * right) / max(left + right, 0.1);
  float phase = u_time * 0.23 + mod(u_seed, 97.0) * 0.11;
  vec2 silk = vec2(0.065 * sin(d.y * 12.0 + phase)
                  + 0.07 * u_params[7] * sin(d.y * 23.0 - phase),
                  0.14 + 0.035 * cos(d.x * 17.0 + phase));
  // Curl of a smooth scalar streamfunction: coherent bending, not white noise.
  float k = 9.0;
  vec2 curl = vec2(cos(k * d.y - phase) * sin(k * d.x + phase),
                  -cos(k * d.x + phase) * sin(k * d.y - phase)) * 0.045;
  float mode = u_params[0];
  vec2 velocity = mix(mix(torus, twins, clamp(mode, 0.0, 1.0)), silk, clamp(mode - 1.0, 0.0, 1.0));
  velocity += curl * u_params[5];
  // Phrase-level energy changes transport, never globally pumps output brightness.
  velocity *= u_params[1] * (1.0 + 0.18 * u_energy + 0.07 * sin(u_beat * 0.392699));
  return velocity * min(1.0, 0.62 / max(length(velocity), 0.0001));
}
vec2 ringSource(vec2 d, float radius, float phase, float orientation) {
  float angle = atan(d.y, d.x + 0.00001);
  float strands = 6.0 + 22.0 * u_params[2];
  float winding = angle * strands + (length(d) - radius) * 65.0 + phase * orientation;
  // Narrow travelling injection windows are carried around the ring by the field.
  vec2 stripe = pow(0.5 + 0.5 * cos(vec2(winding, winding + 2.2)), vec2(12.0));
  float width = 0.012 + 0.008 * u_params[2];
  float ring = exp(-sq((length(d) - radius) / width));
  return stripe * ring;
}
vec2 source(vec2 uv, vec2 center) {
  vec2 d = uv - center;
  float phase = mod(u_seed, 113.0) + u_time * (0.2 + 0.3 * u_params[1]);
  float radius = u_params[4] * (1.0 + 0.035 * sin(u_time * 0.5 + u_seed) + 0.045 * u_bass);
  vec2 torus = ringSource(d, radius, phase, 1.0);
  vec2 twins = ringSource(d + vec2(u_params[6] * 0.5, 0.0), radius * 0.53, phase, 1.0)
             + ringSource(d - vec2(u_params[6] * 0.5, 0.0), radius * 0.53, phase + 1.7, -1.0).gr;
  float weave = sin(d.y * 12.0 + phase * 0.15) * (0.2 + u_params[7] * 0.5);
  float warp = (d.x * (8.0 + 20.0 * u_params[2]) + weave) * TAU;
  vec2 threads = pow(0.5 + 0.5 * cos(vec2(warp, warp + 2.4)), vec2(20.0));
  float envelope = exp(-sq(sq(d.x / (0.2 + u_params[4] * 0.4))));
  // Multiple narrow looms keep silk populated while an attractor is moved.
  float loom = 0.22 + 0.78 * pow(0.5 + 0.5 * cos(d.y * 19.0 + phase * 0.2), 10.0);
  vec2 silk = threads * envelope * loom;
  float mode = u_params[0];
  return mix(mix(torus, twins, clamp(mode, 0.0, 1.0)), silk, clamp(mode - 1.0, 0.0, 1.0));
}
void main() {
  vec2 center = u_reset ? vec2(0.5) : texture(u_state, vec2(0.5)).ba;
  if (u_gesture.z > 0.0) {
    center = mix(center, clamp(u_gesture.xy, vec2(0.12), vec2(0.88)), 0.18 * clamp(u_gesture.z, 0.0, 1.0));
  }
  float dt = clamp(u_dt, 0.0, 0.033334);
  vec2 initialVelocity = field(v_uv, center);
  vec2 departure = v_uv - dt * field(v_uv - 0.5 * dt * initialVelocity, center);
  vec2 concentration = u_reset ? vec2(0.0) : dyeAt(departure);
  float decay = exp(-dt / (0.12 + 0.46 * u_params[3]));
  concentration = max(vec2(0.0), concentration * decay - dt * 0.025);
  vec2 emission = source(v_uv, center);
  float dose = (u_reset ? 0.7 : dt * 5.0) * (0.3 + 0.7 * u_params[2]);
  concentration += (vec2(1.0) - concentration) * emission * dose;
  // Dye decays stochastically; byte-exact attractor coordinates must not drift.
  outColor = vec4(quantize8(vec4(concentration, 0., 1.)).rg, clamp(center, 0., 1.));
}
`;

const fragment = `
void main() {
  // Flow coordinates match pointer UVs; a wide stage projects the orbits elliptically.
  vec2 uv = v_uv;
  vec2 texel = 1.0 / vec2(textureSize(u_state, 0));
  vec2 dye = stateBilinear(clamp(uv, texel * 0.5, 1.0 - texel * 0.5)).rg;
  float edge = smoothstep(0.0, 0.025, uv.x) * (1.0 - smoothstep(0.975, 1.0, uv.x))
             * smoothstep(0.0, 0.025, uv.y) * (1.0 - smoothstep(0.975, 1.0, uv.y));
  // A small cross filter blooms the actual dye, not an independent analytic image.
  vec2 glow = stateBilinear(clamp(uv + vec2(texel.x * 2.0, 0.0), 0.0, 1.0)).rg
            + stateBilinear(clamp(uv - vec2(texel.x * 2.0, 0.0), 0.0, 1.0)).rg
            + stateBilinear(clamp(uv + vec2(0.0, texel.y * 2.0), 0.0, 1.0)).rg
            + stateBilinear(clamp(uv - vec2(0.0, texel.y * 2.0), 0.0, 1.0)).rg;
  float total = dye.r + dye.g;
  vec3 light = u_primary * dye.r * 2.6 + u_secondary * dye.g * 2.6;
  light += (u_primary * glow.r + u_secondary * glow.g) * 0.12;
  light += u_accent * pow(clamp(total, 0.0, 1.0), 3.0) * 0.8;
  light *= edge;
  vec2 p = aspectUV();
  vec3 background = mix(vec3(0.002, 0.004, 0.008), u_secondary * 0.014, exp(-dot(p, p) * 3.0));
  vec3 color = background + vec3(1.0) - exp(-light);
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export default {
  id: 'magnetic',
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { motion: [0.2, 1.8], curl: [0.2, 1.2], trails: [2.4, 0.8] },
  beat: { punch: 0.8, pulse: 1, inject: 0.6 },
  stage: ['motion', 'curl', 'density'],
  type: { key: 'flow', values: [0, 1, 2] },
  number: 48,
  name: 'Magnetic Choir',
  description: 'Two luminous dye-thread layers advect through breathing torus, split-vortex and liquid-silk fields. Drag to place a persistent attractor; density, motion and trail persistence shape the flow. A bounded artistic flow simulation, not discrete particles or physical magnetism.',
  schema,
  presets,
  fragment,
  simulation: { fragment: simulationFragment, size: [320, 320], steps: 1 },
};
