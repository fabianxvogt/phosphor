// Artistic continuous-cell model, inspired by Lenia: a normalized annular
// convolution feeds a bell-shaped growth response. Nutrient consumption and
// bilinear field advection are additions, not a biological or research claim.
// RGBA state = density, nutrient, density trail, neighborhood response.
// Fixed cost: 192 x 128 cells, 24 annular samples + 4 transport samples +
// 4 diffusion samples + 1 center sample per cell/tick; at most 12 seeded patches,
// not tracked agents. Seeded stochastic rounding preserves sub-RGBA8 growth.
const schema = [
  { key: 'population', label: 'Population capacity', min: 0, max: 12, step: 1, default: 3 },
  { key: 'dynamics', label: 'Growth dynamics', min: 0, max: 1.6, step: 0.01, default: 0.55 },
  { key: 'radius', label: 'Organism scale', min: 4, max: 13, step: 0.1, default: 9 },
  { key: 'feeding', label: 'Nutrient supply', min: 0, max: 1, step: 0.01, default: 0.65 },
  { key: 'habitat', label: 'Habitat: lagoon / tide / gyre', min: 0, max: 2, step: 1, default: 0 },
  { key: 'form', label: 'Membrane morphology', min: 0, max: 1, step: 0.01, default: 0.4 },
  { key: 'flow', label: 'Current strength', min: 0, max: 1.5, step: 0.01, default: 0.22 },
  { key: 'trails', label: 'Bioluminescent trails', min: 0, max: 0.97, step: 0.01, default: 0.7 },
];

const presets = [
  { name: 'Solitary Pearl · Lagoon', seed: 5001, params: { population: 1, dynamics: 0.38, radius: 12, feeding: 0.72, habitat: 0, form: 0.12, flow: 0.12, trails: 0.5 } },
  { name: 'Glass Twins · Lagoon', seed: 5089, params: { population: 2, dynamics: 0.52, radius: 10.4, feeding: 0.8, habitat: 0, form: 0.48, flow: 0.24, trails: 0.68 } },
  { name: 'Ribbon Grazers · Tide', seed: 5027, params: { population: 4, dynamics: 0.7, radius: 8.4, feeding: 0.76, habitat: 1, form: 0.88, flow: 0.68, trails: 0.82 } },
  { name: 'Moon Jellies · Gyre', seed: 5053, params: { population: 6, dynamics: 0.62, radius: 9.2, feeding: 0.88, habitat: 2, form: 0.35, flow: 0.56, trails: 0.88 } },
  { name: 'Lantern Shoal · Tide', seed: 5071, params: { population: 10, dynamics: 0.95, radius: 5.8, feeding: 0.92, habitat: 1, form: 0.62, flow: 1.06, trails: 0.77 } },
  { name: 'Spore Carnival · Gyre', seed: 5099, params: { population: 12, dynamics: 1.18, radius: 4.8, feeding: 1, habitat: 2, form: 0.95, flow: 1.2, trails: 0.94 } },
];

const simulationFragment = `
vec2 wrappedDelta(vec2 a, vec2 b) { return torusDelta(a,b); }
vec4 transported(vec2 uv) { return stateBilinear(uv); }
float habitatFood(vec2 uv, float habitat) {
  vec2 p = wrappedDelta(uv, vec2(0.5));
  if (habitat < 0.5) {
    return 0.3 + 0.7 * exp(-dot(p, p) * 5.0);
  }
  if (habitat < 1.5) {
    float lane = p.y - 0.10 * sin(TAU * uv.x);
    return 0.28 + 0.72 * exp(-lane * lane * 24.0);
  }
  float ring = length(p) - 0.28;
  return 0.28 + 0.72 * exp(-ring * ring * 34.0);
}
vec2 habitatCurrent(vec2 uv, float habitat) {
  vec2 p = wrappedDelta(uv, vec2(0.5));
  if (habitat < 0.5) {
    return vec2(-sin(TAU * p.y), sin(TAU * p.x)) * 0.16;
  }
  if (habitat < 1.5) {
    return vec2(0.45 + 0.18 * cos(TAU * uv.y), 0.12 * sin(TAU * uv.x + u_time * 0.12));
  }
  return vec2(-sin(TAU * p.y), sin(TAU * p.x)) * 0.42;
}
void main() {
  vec2 texel = 1.0 / u_resolution;
  float population = u_params[0];
  float dynamics = u_params[1];
  float radius = u_params[2];
  float supply = u_params[3];
  float habitat = u_params[4];
  float form = u_params[5];
  if (u_reset) {
    float density = 0.0;
    for (int i = 0; i < 12; ++i) {
      float fi = float(i);
      if (fi >= population) continue;
      vec2 random = vec2(hash(vec2(fi + 7.1, 21.3)), hash(vec2(fi + 3.7, 64.8)));
      vec2 center;
      if (habitat < 0.5) {
        float angle = TAU * (fi / max(population, 1.0) + random.x * 0.09);
        float spread = population < 1.5 ? 0.0 : 0.16 + 0.11 * random.y;
        center = vec2(0.5) + vec2(cos(angle), sin(angle)) * spread;
      } else if (habitat < 1.5) {
        center = vec2((fi + 0.5) / max(population, 1.0), 0.5 + (random.y - 0.5) * 0.34);
      } else {
        float angle = TAU * (fi / max(population, 1.0) + random.x * 0.035);
        center = vec2(0.5) + vec2(cos(angle), sin(angle)) * (0.24 + 0.06 * random.y);
      }
      vec2 d = wrappedDelta(v_uv, center) * u_resolution;
      float angle = TAU * random.x;
      d = rot2(angle) * d;
      d.x /= mix(1.0, 1.75, form);
      float r = length(d) / radius;
      float core = exp(-r * r * 1.65);
      float membrane = exp(-sq((r - 0.58) / 0.35));
      // These are inocula only; subsequent geometry is evolved from field state.
      density = max(density, 0.82 * mix(core, membrane, form));
    }
    float nutrient = supply * (0.72 + 0.22 * habitatFood(v_uv, habitat));
    emit(vec4(clamp(density, 0.0, 1.0), nutrient, density, 0.0));
    return;
  }
  vec4 previous = texture(u_state, v_uv);
  if (dynamics < 0.001) {
    outColor = previous;
    return;
  }
  vec4 north = texture(u_state, v_uv + vec2(0.0, texel.y));
  vec4 south = texture(u_state, v_uv - vec2(0.0, texel.y));
  vec4 east = texture(u_state, v_uv + vec2(texel.x, 0.0));
  vec4 west = texture(u_state, v_uv - vec2(texel.x, 0.0));
  vec2 nutrientGradient = vec2(east.g - west.g, north.g - south.g);
  float tick = u_dt * 60.0;
  // Transport moves the actual density texture, rather than rendering moving blobs.
  vec2 current = habitatCurrent(v_uv, habitat) * u_params[6];
  current += nutrientGradient * 0.7;
  current *= dynamics * tick * (1.0 + 0.10 * u_bass);
  vec4 state = transported(v_uv - current * texel);
  float sum = 0.0;
  float weightSum = 0.0;
  // Two radial quadrature rings: 8 inner + 16 outer = 24 fixed samples.
  for (int i = 0; i < 24; ++i) {
    float fi = float(i);
    bool inner = i < 8;
    float angle = inner ? TAU * fi / 8.0 : TAU * (fi - 8.0 + 0.5) / 16.0;
    float r = inner ? 0.42 : 0.86;
    float weight = inner ? 0.7 : 1.0;
    vec2 offset = vec2(cos(angle), sin(angle)) * radius * r * texel;
    sum += texture(u_state, v_uv - current * texel + offset).r * weight;
    weightSum += weight;
  }
  float neighborhood = sum / weightSum;
  float mu = mix(0.29, 0.23, form);
  float sigma = mix(0.13, 0.105, form);
  float bell = 2.0 * exp(-0.5 * sq((neighborhood - mu) / sigma)) - 1.0;
  float capacity = clamp(population / 4.0, 0.0, 1.0);
  float crowding = max(neighborhood - mix(0.24, 0.64, population / 12.0), 0.0);
  float growth = 0.66 * bell + 0.64 * state.g - 0.50 - 0.26 * crowding;
  growth -= (1.0 - capacity) * 0.11;
  float density = state.r + 0.058 * dynamics * tick * growth;
  // Zero capacity is deliberate extinction; zero supply starves the nutrient field.
  if (population < 0.5) density = max(state.r - 0.025 * dynamics * tick, 0.0);
  float nutrientLaplacian = (north.g + south.g + east.g + west.g) * 0.25 - state.g;
  float nutrient = state.g + tick * dynamics * (
    0.085 * nutrientLaplacian + 0.011 * supply * habitatFood(v_uv, habitat) * (1.0 - state.g)
    - 0.0035 * state.r - 0.0008 * (1.0 - supply));
  vec2 gestureDelta = wrappedDelta(v_uv, u_gesture.xy) * u_resolution;
  float gesture = exp(-dot(gestureDelta, gestureDelta) / 145.0) * u_gesture.z;
  // Pointer feeding is localized nutrient deposition with a tiny inoculation.
  nutrient += gesture * 0.12 * tick;
  density += gesture * 0.025 * capacity * tick;
  density = clamp(density, 0.0, 0.98);
  nutrient = clamp(nutrient, 0.0, 1.0);
  float persistence = mix(0.68, 0.995, u_params[7] / 0.97);
  float trail = max(density, state.b * pow(persistence, tick * dynamics));
  vec4 nextState = clamp(vec4(density, nutrient, trail, neighborhood), 0.0, 1.0);
  // Per-cell integer tick noise keeps RGBA8 growth/decay unbiased indefinitely.
  emit(nextState);
}
`;

const fragment = `
vec4 softState(vec2 uv) { return stateBilinear(uv); }
void main() {
  vec4 state = softState(v_uv);
  vec2 texel = 1.0 / vec2(textureSize(u_state, 0));
  float east = softState(v_uv + vec2(texel.x, 0.0)).r;
  float west = softState(v_uv - vec2(texel.x, 0.0)).r;
  float north = softState(v_uv + vec2(0.0, texel.y)).r;
  float south = softState(v_uv - vec2(0.0, texel.y)).r;
  vec2 gradient = vec2(east - west, north - south);
  float body = smoothstep(0.025, 0.72, state.r);
  float edge = clamp(length(gradient) * 2.4, 0.0, 1.0);
  float rim = exp(-sq((state.r - 0.25) / 0.065)) * smoothstep(0.035, 0.13, state.r);
  float inner = exp(-sq((state.r - 0.53) / 0.045));
  vec3 normal = normalize(vec3(-gradient * 4.0, 0.58));
  float light = 0.45 + 0.55 * max(dot(normal, normalize(vec3(-0.6, 0.7, 1.0))), 0.0);
  vec2 p = aspectUV();
  float vignette = 1.0 / (1.0 + dot(p, p) * 1.45);
  vec3 background = mix(u_secondary, u_primary, 0.16 + state.g * 0.3) * (0.012 + state.g * 0.024) * vignette;
  float afterglow = max(state.b - state.r * 0.68, 0.0);
  vec3 color = background + u_secondary * afterglow * 0.17 * u_params[7];
  vec3 organism = palette(clamp(0.12 + state.a * 0.9 + edge * 0.35, 0.0, 1.0));
  color += organism * body * (0.35 + light * 0.30);
  color += mix(u_primary, u_accent, 0.65) * (edge * 0.56 + rim * 0.29 + inner * 0.1);
  // Sparse suspended nutrients decorate the habitat, never stand in for organisms.
  vec2 grainCell = floor(v_uv * vec2(320.0, 210.0));
  float speck = step(0.997, hash(grainCell)) * state.g;
  color += u_secondary * speck * 0.10;
  color *= 1.0 + min(u_energy, 1.0) * 0.08;
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export default {
  id: 'aquarium',
  // Contract v3 performance metadata; see scene-acid.mjs. The one family
  // allowed to stay calm (D26).
  energy: { dynamics: [0.3, 0.9], flow: [0.1, 0.6] },
  beat: { punch: 0.3, pulse: 0.5, inject: 0.4 },
  stage: ['dynamics', 'flow', 'trails'],
  type: { key: 'habitat', values: [0, 1, 2] },
  calm: true,
  number: 50,
  name: 'Alien Aquarium',
  description: 'A Lenia-inspired continuous density field: 24-sample annular growth, nutrient consumption, and transported membranes. Six seeded organisms inhabit lagoon, tide, or gyre. Feed locally with the pointer; population sets inocula and carrying capacity, not a measured creature count. Zero supply starves; zero capacity extinguishes. An artistic model, with no biological realism or artificial-life discovery claims.',
  schema,
  presets,
  fragment,
  simulation: { fragment: simulationFragment, size: [192, 128], steps: 1 },
};
