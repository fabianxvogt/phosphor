import { familyEffect } from "./family-rhythm.mjs";
import { chemistry, morphogenSimulation } from "./scene-evolution.mjs";

// Afterglow Garden as one continuous world: evolution's Gray–Scott morphogen
// field becomes a night garden. Development (0 Roots, 1 Petals, 2 Bloom)
// raises the camera from a low tracking shot toward an afterglow horizon to
// an overhead crane above emissive crowns mirrored in wet soil, and slowly
// steers the chemistry inside a band where instant jumps keep the garden
// alive. The simulation is never reset by development. Artistic, not botany.

// Chemistry per state: [feed, loss, inhibitor spread]. Measured on a CPU
// mirror (tests/afterglow.test.mjs): every ordered instant jump keeps > 30%
// coverage. Wider bands collapsed for seconds after a jump: the original
// world's 0.029/0.057 ↔ 0.03/0.062 ↔ 0.042/0.061, and Bloom at 0.039/0.0605
// jumping back to Roots on a 96² torus.
export const CHEMISTRY = [
  [0.032, 0.0585, 0.5], // Roots: looping veins
  [0.034, 0.0612, 0.47], // Petals: broken veins and buds
  [0.037, 0.0605, 0.46], // Bloom: broad crowned bands
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
// Spore rain: every two seconds (240 steps at 2 steps per tick) three seeded
// buds land where a 12-texel ring has gone dark. Evolution has no sources, so
// this is what keeps an extinct region from staying empty.
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
const simulationFragment = morphogenSimulation(
  {
    planting: "u_params[1]",
    feed: "gardenChemistry().x",
    loss: "gardenChemistry().y",
    spread: "gardenChemistry().z",
    growth: "u_params[2]",
  },
  steering,
  spores,
);

const fragment = `${chemistry}
float petalW() { return smoothstep(0., 1., clamp(u_params[0], 0., 1.)); }
float bloomW() { return smoothstep(1., 2., clamp(u_params[0], 1., 2.)); }
float bloomAt(vec2 uv) { return stateBilinear16(uv).y; }
float bloomFast(vec2 uv) { return unpackMorphogens(texture(u_state, uv)).y; }
float body(float v) { return smoothstep(.035, .26, v); }
const float WORLD = 1.6;
vec2 worldToUv(vec2 xy) { return xy / WORLD; }

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (v_uv - .5) * vec2(aspect, 1.);
  float petal = petalW(), bloom = bloomW();
  float petalRelief = clamp(u_params[3], 0., 1.);
  float glow = clamp(u_params[4], .35, 1.65);
  float relief = clamp(u_params[6], .3, 1.6);
  float sway = clamp(u_params[7], 0., 1.);
  float scale = mix(mix(.022, .045, petal), .055, bloom) * relief;

  // Camera: a forward tracking flight. Roots skims low toward a glowing
  // horizon; Bloom cranes up to look down on the crowns.
  float pitch = mix(mix(1.30, .86, petal), .50, bloom);
  float distanceToFocus = mix(mix(.62, .95, petal), 1.45, bloom) * clamp(u_params[5], .7, 1.4);
  float yaw = mix(.22, .55, bloom) * sin(TAU * fract(u_time / 180.));
  vec2 focus = WORLD * (.5 + vec2(.035 * sin(TAU * fract(u_time / 120.)), fract(u_time / 260.)));
  vec2 heading = vec2(sin(yaw), cos(yaw));
  vec3 forward = vec3(heading * sin(pitch), -cos(pitch));
  vec3 right = vec3(heading.y, -heading.x, 0.);
  vec3 up = cross(right, forward);
  vec3 ro = vec3(focus, scale) - forward * distanceToFocus;
  float lens = 1.5 * (1. + .015 * clamp(u_kick, 0., 1.));
  vec3 rd = normalize(p.x * right + p.y * up + lens * forward);

  vec3 night = u_secondary * .016 + vec3(.003, .004, .008);
  // Afterglow sky: a low band of light above the horizon (Roots only).
  vec3 sky = night + mix(u_secondary, u_accent, .35) * .10 * exp(-max(rd.z, 0.) * 12.)
           + mix(u_accent, u_primary, .4) * .10 * exp(-max(rd.z, 0.) * 40.);
  // Rays at or above the horizon see only the sky (no early return, so
  // screen-space derivatives stay defined along the horizon).
  bool skyward = rd.z > -.004;
  // March the heightfield slab (16 bilinear samples, 5 bisections).
  float rz = min(rd.z, -.004);
  float tTop = (scale * 1.2 - ro.z) / rz, tGround = -ro.z / rz;
  float tEnd = min(tGround, 7.);
  float t = max(tTop, 0.), dt = (tEnd - t) / 16.;
  vec3 hit = ro + rd * tGround;
  bool found = tGround < 7.;
  float prev = t;
  vec2 wobble = .004 * sway * vec2(sin(u_time * .23), cos(u_time * .19));
  for (int i = 0; i < 16; i++) {
    vec3 q = ro + rd * t;
    float h = scale * body(bloomAt(worldToUv(q.xy) + wobble));
    if (q.z <= h) {
      float a = prev, b = t;
      for (int k = 0; k < 5; k++) {
        float m = .5 * (a + b);
        vec3 r = ro + rd * m;
        if (r.z <= scale * body(bloomAt(worldToUv(r.xy) + wobble))) b = m; else a = m;
      }
      hit = ro + rd * b;
      found = true;
      break;
    }
    prev = t;
    t += dt;
  }
  float travel = length(hit - ro);
  float fog = smoothstep(mix(1.6, 1.2, bloom) * distanceToFocus, mix(4.5, 2.6, bloom) * distanceToFocus, travel);
  if (!found || skyward) fog = 1.;

  vec2 uv = worldToUv(hit.xy) + wobble;
  vec2 texel = 1. / vec2(textureSize(u_state, 0));
  vec2 e = 1.5 * texel;
  float v = bloomAt(uv);
  float vx1 = bloomAt(uv + vec2(e.x, 0.)), vx0 = bloomAt(uv - vec2(e.x, 0.));
  float vy1 = bloomAt(uv + vec2(0., e.y)), vy0 = bloomAt(uv - vec2(0., e.y));
  vec2 gradient = vec2(vx1 - vx0, vy1 - vy0);
  float b0 = body(v);
  // Petal relief: ridges around each island follow the gradient direction.
  float angle = atan(gradient.y + 1e-5, gradient.x + 1e-5);
  float petals = .5 + .5 * cos(angle * 6. + v * 22.);
  float ridge = petalRelief * mix(.15, 1., petal) * petals * b0 * (1. - b0) * 4.;
  vec2 slope = vec2(body(vx1) - body(vx0), body(vy1) - body(vy0)) * scale / (2. * e * WORLD);
  slope += vec2(cos(angle), sin(angle)) * ridge * .25;
  vec3 normal = normalize(vec3(-slope, 1.));

  vec3 key = normalize(vec3(.35, .75, .55));
  vec3 view = -rd;
  float diffuse = max(0., dot(normal, key));
  float fresnel = pow(1. - max(0., dot(normal, view)), 3.);
  float shadow = 1.;
  for (int i = 1; i <= 3; i++) {
    vec3 s = vec3(hit.xy, scale * b0) + key * float(i) * scale;
    float ground = scale * body(bloomFast(worldToUv(s.xy) + wobble));
    shadow = min(shadow, 1. - .6 * smoothstep(0., scale * .3, ground - s.z));
  }

  // Tissue: dark translucent bodies. Light shows where they are thin (the
  // margins glow as if backlit), and the rims shift hue with view angle.
  float margin = (1. - b0) * smoothstep(.03, .11, v);
  float core = smoothstep(.24, .32, v) * pow(petals, 4.);
  // Tissue leans on secondary and accent; primary is kept for the light.
  vec3 tissue = mix(u_secondary, u_accent, clamp(.25 + .35 * petals * petal + .2 * b0, 0., 1.));
  vec3 iris = palette(fract(.30 + .40 * fresnel + .12 * petals) * .7);
  float tissueLight = (.02 + .30 * diffuse * shadow) * mix(.45, 1., petal) * (1. - .55 * bloom);
  vec3 color = mix(night, tissue * tissueLight, b0);
  color += mix(tissue, u_primary, .35) * margin * (.22 + .30 * petal * (1. - bloom)) * (1. - .6 * bloom) * glow;
  color += iris * fresnel * b0 * (.10 + .40 * petal * (1. - .5 * bloom)) * glow;
  // Roots: glowing veins along each crest with a soft halo, the brightest
  // thing in the frame.
  float veinWidth = max(1.5, u_resolution.y / 720.);
  float vein = abs(v - .21) / max(fwidth(v), 1e-4);
  float veins = (1. - smoothstep(veinWidth * .5, veinWidth, vein)) * (1. - bloom);
  float veinHalo = exp(-vein / (veinWidth * 4.)) * (1. - bloom);
  color += mix(u_primary, vec3(1.), .3) * (veins * 1.1 + veinHalo * .18) * mix(1., .4, petal) * glow;
  // Bloom: emissive cores (above 1.0 on the float path, feeding bloom) in a
  // soft halo; accent marks only the hottest centres.
  // Neon crests: the activator ridge (high V, vanishing gradient) burns as a
  // tube of light, strung with brighter petal beads.
  float crestMask = smoothstep(.20, .29, v);
  float g = length(gradient);
  float neon = crestMask * exp(-sq(g / .04)) * bloom;
  float halo = crestMask * exp(-sq(g / .11)) * bloom;
  color += mix(u_primary, u_accent, .35) * halo * .45 * glow;
  color += mix(u_primary, vec3(1.), .35) * neon * (.7 + .5 * petals) * 1.4 * glow;
  color += mix(u_accent, vec3(1.), .2) * core * bloom * 1.4 * glow;
  // Wet soil mirrors the crowns. A crown of height h reflects at horizontal
  // offset h·|r.xy|/r.z along the reflected ray; three taps around that
  // offset blur it, and a slow ripple breaks it up.
  vec3 reflected = reflect(rd, vec3(0., 0., 1.));
  vec2 toward = reflected.xy / max(reflected.z, .15);
  vec2 ripple = .0025 * vec2(sin(hit.y * 70. + u_time * 1.1), cos(hit.x * 60. - u_time * .9));
  float mirror = 0.;
  for (int i = 0; i < 3; i++) {
    vec2 at = worldToUv(hit.xy + toward * scale * (.75 + .25 * float(i))) + ripple;
    mirror += smoothstep(.22, .34, bloomFast(at)) / 3.;
  }
  color += mix(u_accent, u_primary, .4) * mirror * (1. - b0) * bloom * .45 * glow;

  // Rhythm: vein pulse, a petal cohort and the local morphogen feed.
  color += mix(u_primary, u_accent, .4) * (veins + margin) * u_rhythm.x * .7;
  float cohort = pow(max(0., cos(angle * 6. - u_rhythmCount.y * 1.04719755)), 5.);
  color += iris * b0 * cohort * u_rhythm.y * .45;

  color = mix(color, sky, fog);
  outColor = vec4(max(color, 0.), 1.);
}
`;

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
  fragment,
  // Same codec, grid and step count as evolution, so traces carry across.
  simulation: {
    continuity: "gray-scott-uv16-v1",
    fragment: simulationFragment,
    size: [384, 384],
    steps: 2,
  },
};
