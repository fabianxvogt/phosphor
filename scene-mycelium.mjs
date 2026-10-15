import { familyEffect } from "./family-rhythm.mjs";
import { grayScottSimulation } from "./scene-acid.mjs";
import { landscape, landscapeBackdrop } from "./organic-landscape.mjs";

// One continuing Gray–Scott field, now a landscape seen from inside its
// membranes. Development changes relief, lighting and safe chemistry, never
// the simulation's identity. Artistic chemical choreography, not biology.
export const CHEMISTRY = [
  [0.027, 0.058, 0.8],
  [0.037, 0.061, 1.0],
  [0.029, 0.057, 0.9],
];
const glslState = (i) =>
  `vec3(${CHEMISTRY[i].map((x) => x.toFixed(4)).join(", ")})`;
const chemistry = `
vec3 myceliumChemistry() {
  float d = clamp(u_params[0], 0., 2.);
  vec3 a = ${glslState(0)}, b = ${glslState(1)}, c = ${glslState(2)};
  return d < 1. ? mix(a, b, smoothstep(0., 1., d)) : mix(b, c, smoothstep(1., 2., d));
}
`;
// Seed only extinct regions; the ring probe leaves a living colony untouched.
const spores = `
  if (u_tick % 960u < 8u) {
    uint epoch = (u_tick / 960u) % 65521u;
    vec2 aspectScale = vec2(u_resolution.x / u_resolution.y, 1.);
    float spore = 0.;
    for (int i = 0; i < 3; i++) {
      vec2 at = vec2(hash(vec2(float(epoch), float(i) + 3.)), hash(vec2(float(i) + 7., float(epoch))));
      spore = max(spore, 1. - smoothstep(.012, .02, length(torusDelta(v_uv, at) * aspectScale)));
    }
    if (spore > 0.) {
      vec2 texel = 1. / vec2(textureSize(u_state, 0));
      float around = 0.;
      for (int k = 0; k < 8; k++) {
        float angle = float(k) * .78539816;
        around = max(around, chemicals(v_uv + vec2(cos(angle), sin(angle)) * 12. * texel).y);
      }
      c = mix(c, vec2(.48, .29), spore * (1. - smoothstep(.02, .06, around)));
    }
  }
`;
// Linear visual decoding; exact nearest reads for the original chemistry.
const nearestStencil = `
vec4 colonyTexel(vec2 uv) {
  ivec2 size = textureSize(u_state, 0);
  return texelFetch(u_state, ivec2(floor(fract(uv) * vec2(size))), 0);
}
vec2 colonyLaplacian(vec2 uv) {
  vec2 t=1./vec2(textureSize(u_state,0));
  vec4 sum=-colonyTexel(uv);
  sum+=.2*(colonyTexel(uv+vec2(t.x,0.))+colonyTexel(uv-vec2(t.x,0.))
          +colonyTexel(uv+vec2(0.,t.y))+colonyTexel(uv-vec2(0.,t.y)));
  sum+=.05*(colonyTexel(uv+t)+colonyTexel(uv-t)
          +colonyTexel(uv+vec2(t.x,-t.y))+colonyTexel(uv+vec2(-t.x,t.y)));
  return unpack16(sum);
}
`;
const simulationFragment =
  nearestStencil +
  grayScottSimulation(
    {
      family: "u_params[3]",
      audio: "u_params[7]",
      feed: "myceliumChemistry().x",
      kill: "myceliumChemistry().y",
      diffusion: "myceliumChemistry().z",
      speed: "u_params[1]",
      injection: "u_params[2]",
    },
    chemistry,
    spores,
  )
    .replace("texture(u_state, uv)", "colonyTexel(uv)")
    .replace("laplacian9(u_state, v_uv)", "colonyLaplacian(v_uv)");

const schema = [
  {
    key: "development",
    label: "Development · understory / tide / city",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "speed",
    label: "Growth speed",
    min: 0.25,
    max: 1,
    step: 0.01,
    default: 0.72,
  },
  {
    key: "injection",
    label: "Growth injection",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.35,
  },
  {
    key: "composition",
    label: "Seed composition",
    min: 0,
    max: 5,
    step: 1,
    default: 5,
  },
  {
    key: "relief",
    label: "Terrain relief",
    min: 0.3,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "altitude",
    label: "Camera altitude",
    min: 0.7,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
  {
    key: "contrast",
    label: "Structure relief",
    min: 0.7,
    max: 1.9,
    step: 0.01,
    default: 1.2,
  },
  {
    key: "audio",
    label: "Audio influence",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    speed: 0.72,
    injection: 0.35,
    composition: 5,
    relief: 1,
    altitude: 1,
    contrast: 1.2,
    audio: 0.3,
    ...params,
  },
});
export default {
  id: "mycelium",
  number: 99,
  name: "Living Mycelium",
  description:
    "One Gray–Scott reaction–diffusion field seen as a living terrain. Development lights and raises the same field from understory threads through tidal membranes to a luminous city, and steers its chemistry within a safe band without resetting it.",
  development: "development",
  schema,
  presets: [
    look("Hyphal Understory", 211, 0),
    look("Tidal Lamellae", 211, 1),
    look("Lantern City", 211, 2),
    look("Spore Floor", 101, 0.35, {
      composition: 3,
      altitude: 0.8,
      relief: 1.2,
    }),
    look("Night Membrane", 149, 1, {
      composition: 4,
      relief: 1.45,
      contrast: 1.05,
      speed: 0.5,
    }),
    look("Tide Turning", 41, 1.5, { composition: 1, altitude: 1.15 }),
    look("Street Plan", 18, 2, { composition: 0, altitude: 1.3, relief: 1.25 }),
    look("Bloom Quarter", 73, 1.8, {
      composition: 2,
      injection: 0.5,
      contrast: 1.45,
      altitude: 0.9,
    }),
  ],
  stage: ["speed", "relief", "altitude"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    speed: [0.35, 1],
    injection: [0.1, 0.8],
    contrast: [0.9, 1.6],
    audio: [0.1, 0.8],
  },
  beat: { punch: 0.4, pulse: 0.8, inject: 1 },
  rhythm: [
    familyEffect(
      "reaction-front",
      0,
      "Reaction-front light",
      "Light the threads where the activator front advances.",
      { period: 4, strength: 0.6 },
    ),
    familyEffect(
      "chemical-band",
      1,
      "Chemical-band light",
      "Select one concentration band across the terrain.",
      { period: 8, strength: 0.5 },
    ),
    familyEffect(
      "feed",
      2,
      "Local chemical feed",
      "Inject a bounded local feed patch into the living field.",
      { period: 16, strength: 0.6, duration: 0.25, kind: "simulation" },
    ),
  ],
  fragment: landscapeBackdrop(false),
  geometry: landscape(false),
  simulation: {
    continuity: "gray-scott-uv16-v1",
    fragment: simulationFragment,
    size: [320, 192],
    steps: 8,
    filter: "linear",
  },
};
