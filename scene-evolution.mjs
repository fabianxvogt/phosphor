// Gray–Scott morphogens, rendered as an illustrative flowering garden.
// Two 16-bit concentrations occupy RG and BA in the RGBA8 simulation texture.
const chemistry = `
vec2 unpackMorphogens(vec4 state) { return unpack16(state); }
vec4 packMorphogens(vec2 value) { return pack16(value); }
`;

const schema = [
  { key: 'feed', label: 'Morphogen feed', min: .025, max: .048, step: .0001, default: .0367 },
  { key: 'prune', label: 'Inhibitor loss', min: .051, max: .065, step: .0001, default: .0589 },
  { key: 'spread', label: 'Inhibitor spread', min: .35, max: .65, step: .005, default: .5 },
  { key: 'planting', label: 'Planting density', min: 3, max: 12, step: 1, default: 6 },
  { key: 'petals', label: 'Petal relief', min: 0, max: 1, step: .01, default: .6 },
  { key: 'sway', label: 'Garden sway', min: 0, max: 1, step: .01, default: .2 },
  { key: 'glow', label: 'Bloom light', min: .35, max: 1.65, step: .01, default: .9 },
  { key: 'growth', label: 'Growth speed', min: .2, max: 1.5, step: .01, default: 1 }
];

const presets = [
  { name: 'Quiet Herbarium', seed: 5601, params: { feed: .0367, prune: .0589, spread: .5, planting: 4, petals: .35, sway: .06, glow: .65, growth: .55 } },
  { name: 'Pearl Nursery', seed: 5602, params: { feed: .03, prune: .062, spread: .46, planting: 8, petals: .9, sway: .13, glow: 1.12, growth: 1.1 } },
  { name: 'Fern Manuscript', seed: 5603, params: { feed: .029, prune: .057, spread: .57, planting: 5, petals: .18, sway: .24, glow: .8, growth: .8 } },
  { name: 'Coral Orchard', seed: 5604, params: { feed: .042, prune: .061, spread: .45, planting: 7, petals: .72, sway: .42, glow: 1.3, growth: 1.3 } },
  { name: 'Moonroot', seed: 5605, params: { feed: .025, prune: .055, spread: .6, planting: 3, petals: .5, sway: .04, glow: .48, growth: .4 } },
  { name: 'Festival of Buds', seed: 5606, params: { feed: .045, prune: .063, spread: .4, planting: 11, petals: 1, sway: .75, glow: 1.5, growth: 1.45 } }
];

export default {
  id: 'evolution',
  // Simulation grid authored for a 16:9 frame; other screens cover-crop it (D7).
  aspect: 16 / 9,
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { growth: [0.5, 1.4], sway: [0.1, 0.8], glow: [0.6, 1.4] },
  beat: { punch: 0.5, pulse: 1, inject: 0.8 },
  stage: ['growth', 'sway', 'glow'],
  type: { key: 'planting', values: [3, 6, 9, 12] },
  number: 56,
  name: 'Evolution Garden',
  description: 'A Gray–Scott morphogen garden: diffusing concentrations become budding islands and petal relief. Breed any scene’s bounded parameters in the lineage instrument; this is an artistic reaction–diffusion model, not a botanical simulation.',
  schema,
  presets,
  simulation: {
    size: [384, 384],
    steps: 2,
    fragment: chemistry + `
vec2 morphogen(vec2 uv) { return unpackMorphogens(texture(u_state, uv)); }
void main() {
  if (u_reset) {
    float density = u_params[3];
    vec2 cell = floor(v_uv * density);
    vec2 local = fract(v_uv * density);
    vec2 center = vec2(.5) + .24 * vec2(hash(cell + 5.7), hash(cell + 19.3)) - .12;
    float planted = step(.3, hash(cell + 71.));
    // Keep a central planted cell even for sparse seeds.
    planted = max(planted, 1. - step(.1, length(cell - floor(vec2(.5) * density))));
    float bud = planted * (1. - smoothstep(.12, .18, length(local - center)));
    outColor = packMorphogens(vec2(1. - .5 * bud, .26 * bud));
    return;
  }
  vec2 current = morphogen(v_uv);
  vec2 lap = laplacian9(u_state, v_uv);
  float reaction = current.x * current.y * current.y;
  float feed = u_params[0];
  float loss = u_params[1];
  vec2 derivative = vec2(lap.x - reaction + feed * (1. - current.x),
                        u_params[2] * lap.y + reaction - (feed + loss) * current.y);
  // Keep explicit diffusion stable even at the maximum growth setting.
  float tick = clamp(u_dt * 60., 0., 1.);
  current += derivative * tick * .65 * u_params[7];
  vec2 distanceToHand = abs(v_uv - u_gesture.xy);
  distanceToHand = min(distanceToHand, 1. - distanceToHand);
  float hand = exp(-dot(distanceToHand, distanceToHand) / .0012) * clamp(u_gesture.z, 0., 1.);
  current += hand * vec2(-.025, .018) * tick;
  outColor = packMorphogens(current);
}
`
  },
  fragment: chemistry + `
float bloomAt(vec2 uv) { return stateBilinear16(uv).y; }
void main() {
  vec2 uv = v_uv;
  float sway = u_params[5];
  uv += .008 * sway * vec2(sin(u_time * .23 + uv.y * 8.), cos(u_time * .19 + uv.x * 7.));
  vec2 texel = 1. / vec2(textureSize(u_state, 0));
  vec2 chemical = stateBilinear16(uv);
  float v = chemical.y;
  vec2 gradient = vec2(bloomAt(uv + vec2(texel.x, 0.)) - bloomAt(uv - vec2(texel.x, 0.)),
                       bloomAt(uv + vec2(0., texel.y)) - bloomAt(uv - vec2(0., texel.y)));
  float island = smoothstep(.035, .18, v);
  float crown = smoothstep(.16, .34, v);
  float edge = exp(-sq((v - .11) * 32.));
  float angle = atan(gradient.y + .00001, gradient.x + .00001);
  float petals = .5 + .5 * cos(angle * 6. + v * 22.);
  float relief = .66 + .34 * tanh(dot(gradient, normalize(vec2(-.6, .8))) * 30.);
  float veins = pow(.5 + .5 * sin(v * 90.), 7.) * island * u_params[4];
  float petalLight = mix(1., .72 + .28 * petals, u_params[4]);
  vec3 soil = mix(u_secondary, u_primary, .12) * .055;
  soil += .009 * u_secondary * (.5 + .5 * sin(uv.x * 28. + sin(uv.y * 21.)));
  vec3 leaf = mix(u_secondary, u_primary, clamp(.25 + v * 1.4, 0., 1.));
  vec3 flower = mix(leaf, u_accent, crown * (.3 + .35 * u_params[4]));
  float audioBloom = 1. + .14 * clamp(u_energy, 0., 1.) + .08 * clamp(u_onset, 0., 1.);
  vec3 color = mix(soil, flower * relief * petalLight * u_params[6] * audioBloom, island);
  color += edge * u_primary * .12 + veins * u_accent * .14;
  vec2 frame = v_uv * (1. - v_uv);
  float vignette = .67 + .33 * pow(clamp(frame.x * frame.y * 16., 0., 1.), .3);
  color *= vignette;
  outColor = vec4(clamp(color, 0., 1.), 1.);
}
`
};
