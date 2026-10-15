import { familyEffect } from "./family-rhythm.mjs";
import { morphogenSimulation } from "./scene-evolution.mjs";
import { landscape, landscapeBackdrop } from "./organic-landscape.mjs";

// One continuing morphogen field: roots, petals, then a raised six-lobed
// calyx. The field never contracts away; it extends beyond the calyx to fog.
// The measured chemistry band survives every ordered instant state jump.
export const CHEMISTRY = [
  [0.032, 0.0585, 0.5],
  [0.034, 0.0612, 0.47],
  [0.037, 0.0605, 0.46],
];
const glslState = (i) =>
  `vec3(${CHEMISTRY[i].map((x) => x.toFixed(4)).join(", ")})`;
const steering = `
vec3 gardenChemistry() {
  float d = clamp(u_params[0], 0., 2.);
  vec3 a = ${glslState(0)}, b = ${glslState(1)}, c = ${glslState(2)};
  return d < 1. ? mix(a, b, smoothstep(0., 1., d)) : mix(b, c, smoothstep(1., 2., d));
}
`;
const spores = `
  if (u_tick % 240u < 2u) {
    uint epoch = (u_tick / 240u) % 65521u;
    float spore = 0.;
    for (int i = 0; i < 3; i++) {
      vec2 at = vec2(hash(vec2(float(epoch), float(i) + 5.)), hash(vec2(float(i) + 9., float(epoch))));
      spore = max(spore, 1. - smoothstep(.006, .010, length(torusDelta(v_uv, at))));
    }
    if (spore > 0.) {
      vec2 texel = 1. / vec2(textureSize(u_state, 0));
      float around = 0.;
      for (int k = 0; k < 8; k++) {
        float angle = float(k) * .78539816;
        around = max(around, morphogen(v_uv + vec2(cos(angle), sin(angle)) * 12. * texel).y);
      }
      current = mix(current, vec2(.5, .26), spore * (1. - smoothstep(.02, .06, around)));
    }
  }
`;
const nearestStencil = `
vec4 gardenTexel(vec2 uv) {
  ivec2 size = textureSize(u_state, 0);
  return texelFetch(u_state, ivec2(floor(fract(uv) * vec2(size))), 0);
}
vec2 gardenLaplacian(vec2 uv) {
  vec2 t=1./vec2(textureSize(u_state,0));
  vec4 sum=-gardenTexel(uv);
  sum+=.2*(gardenTexel(uv+vec2(t.x,0.))+gardenTexel(uv-vec2(t.x,0.))
          +gardenTexel(uv+vec2(0.,t.y))+gardenTexel(uv-vec2(0.,t.y)));
  sum+=.05*(gardenTexel(uv+t)+gardenTexel(uv-t)
          +gardenTexel(uv+vec2(t.x,-t.y))+gardenTexel(uv+vec2(-t.x,t.y)));
  return unpack16(sum);
}
`;
const simulationFragment = morphogenSimulation(
  {
    planting: "u_params[1]",
    feed: "gardenChemistry().x",
    loss: "gardenChemistry().y",
    spread: "gardenChemistry().z",
    growth: "u_params[2]",
  },
  nearestStencil + steering,
  spores,
)
  .replace("texture(u_state, uv)", "gardenTexel(uv)")
  .replace("laplacian9(u_state, v_uv)", "gardenLaplacian(v_uv)");

// CPU silhouette reference retained for the six-fold support's symmetry.
export function crownEnvelope(x, y, bloom) {
  if (bloom <= 0) return 1;
  const r = Math.hypot(x, y),
    nx = x / Math.max(r, 1e-5),
    ny = y / Math.max(r, 1e-5);
  const c3 = nx * (nx * nx - 3 * ny * ny);
  const radius = 0.46 + 0.09 * (2 * c3 * c3 - 1);
  const t = Math.max(
    0,
    Math.min(1, ((r * Math.max(bloom, 0.01)) / radius - 0.82) / 0.18),
  );
  return 1 - t * t * (3 - 2 * t);
}
const schema = [
  {
    key: "development",
    label: "Development · roots / petals / bloom",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "planting",
    label: "Planting density",
    min: 3,
    max: 12,
    step: 1,
    default: 6,
  },
  {
    key: "growth",
    label: "Growth speed",
    min: 0.2,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "petals",
    label: "Petal relief",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "glow",
    label: "Bloom light",
    min: 0.35,
    max: 1.65,
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
    key: "relief",
    label: "Terrain relief",
    min: 0.3,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "sway",
    label: "Garden sway",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.2,
  },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    planting: 6,
    growth: 1,
    petals: 0.6,
    glow: 1,
    altitude: 1,
    relief: 1,
    sway: 0.2,
    ...params,
  },
});
export default {
  id: "afterglow",
  number: 100,
  name: "Afterglow Garden",
  description:
    "One Gray–Scott morphogen field seen as a night garden. Development raises the camera from a low flight over glowing roots toward an afterglow horizon to an overhead view of emissive crowns mirrored in wet soil, and steers the chemistry within a safe band without resetting it.",
  development: "development",
  schema,
  presets: [
    look("Glowing Roots", 5607, 0),
    look("Opening Petals", 5607, 1),
    look("Crowns at Dusk", 5607, 2),
    look("Root Horizon", 5608, 0.2, {
      planting: 4,
      altitude: 0.8,
      relief: 1.3,
    }),
    look("Petal Field", 5609, 1, { planting: 10, petals: 1, altitude: 1.2 }),
    look("Halfway to Bloom", 5610, 1.5, { planting: 8, glow: 1.2 }),
    look("Lantern Orchard", 5611, 2, {
      planting: 3,
      relief: 1.4,
      altitude: 0.85,
    }),
    look("Low Bloom", 5612, 1.8, {
      planting: 12,
      petals: 0.9,
      altitude: 0.75,
      sway: 0.5,
    }),
  ],
  stage: ["growth", "petals", "altitude"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    growth: { mul: [0.6, 1.3] },
    petals: [-0.15, 0.2],
    sway: [0.05, 0.6],
  },
  beat: { punch: 0.4, pulse: 0.8, inject: 0.8 },
  rhythm: [
    familyEffect(
      "vein-pulse",
      0,
      "Vein pulse",
      "Light runs along the glowing veins and petal margins.",
      { period: 4, strength: 0.6 },
    ),
    familyEffect(
      "petal-cohort",
      1,
      "Petal-cohort light",
      "Select oriented petals in developed reaction crowns.",
      { period: 8, strength: 0.5 },
    ),
    familyEffect(
      "morphogen-feed",
      2,
      "Local morphogen feed",
      "Seed a bounded patch into the continuing garden chemistry.",
      { period: 16, strength: 0.55, duration: 0.25, kind: "simulation" },
    ),
  ],
  fragment: landscapeBackdrop(true),
  geometry: landscape(true),
  simulation: {
    continuity: "gray-scott-uv16-v1",
    fragment: simulationFragment,
    size: [384, 384],
    steps: 2,
    filter: "linear",
  },
};
