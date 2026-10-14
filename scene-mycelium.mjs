import { familyEffect } from "./family-rhythm.mjs";
import { grayScottSimulation, stateCodec } from "./scene-acid.mjs";

// Living Mycelium as one continuous world: acid's Gray–Scott field, seen as
// a lit terrain. Development (0 Understory, 1 Tide, 2 City) changes how the
// same field is lit, raised and viewed, and slowly steers its chemistry
// inside a band where abrupt jumps cannot extinguish it. The simulation is
// never reset by development. An artistic chemical model, not biology.

// Chemistry per state: [feed, kill, nutrient diffusion]. Measured on a CPU
// mirror (tests/mycelium.test.mjs): every pairwise jump keeps a living field.
export const CHEMISTRY = [
  [0.027, 0.058, 0.8], // Understory: broken threads and spores
  [0.037, 0.061, 1.0], // Tide: long parallel lamellae
  [0.029, 0.057, 0.9], // City: a closed labyrinth network
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
// Spore rain: every two seconds three seeded discs land. A disc takes only
// where the surrounding ring has gone dark, so a living network is untouched
// while any extinct region regrows. u_tick counts simulation steps (480/s).
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
const simulationFragment = grayScottSimulation(
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
);

const fragment = `${stateCodec}
float tideW() { return smoothstep(0., 1., clamp(u_params[0], 0., 1.)); }
float cityW() { return smoothstep(1., 2., clamp(u_params[0], 1., 2.)); }
float activator(vec2 uv) { return stateBilinear16(uv).y; }
float activatorFast(vec2 uv) { return unpack16(texture(u_state, uv)).y; }
// Terrain height in [0,1] from the activator: a low swell in Understory, a
// soft membrane in Tide, stepped plateaus (terraces) in City.
float shape(float v, float contrast, float city) {
  float body = smoothstep(.04, .30, v * contrast);
  float steps = body * 3.;
  float terrace = (floor(steps) + smoothstep(.30, .70, fract(steps))) / 3.;
  return mix(body, terrace, city * .85);
}
const vec2 WORLD = vec2(${(320 / 192).toFixed(6)}, 1.) * 1.25;
vec2 worldToUv(vec2 xy) { return xy / WORLD; }

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (v_uv - .5) * vec2(aspect, 1.);
  float tide = tideW(), city = cityW();
  float contrast = clamp(u_params[6], .7, 1.9);
  float relief = clamp(u_params[4], .3, 1.6);
  float scale = mix(mix(.010, .030, tide), .050, city) * relief;

  // Camera: an endless slow orbit around a drifting focus. Development tilts
  // it from a near-vertical forest-floor view to an oblique city flight.
  float orbit = TAU * fract(u_time / 720.) + .32 * sin(TAU * fract(u_time / 96.));
  float pitch = mix(mix(.30, .60, tide), .92, city);
  float distanceToFocus = 1.25 * clamp(u_params[5], .7, 1.4);
  // The focus starts on the seeded composition (uv .5) and drifts across the
  // periodic field; one full lap wraps onto an identical texel.
  vec2 focus = WORLD * (.5 + vec2(fract(u_time / 560.), fract(u_time / 1330.)));
  vec2 heading = vec2(sin(orbit), cos(orbit));
  vec3 forward = vec3(heading * sin(pitch), -cos(pitch));
  vec3 right = vec3(heading.y, -heading.x, 0.);
  vec3 up = cross(right, forward);
  vec3 ro = vec3(focus, scale * .5) - forward * distanceToFocus;
  float lens = 1.55 * (1. + .015 * clamp(u_kick, 0., 1.));
  vec3 rd = normalize(p.x * right + p.y * up + lens * forward);

  // March the heightfield from its top slab down to the ground plane.
  float tTop = (scale - ro.z) / rd.z, tGround = -ro.z / rd.z;
  float t = tTop, dt = (tGround - tTop) / 12.;
  vec3 hit = ro + rd * tGround;
  float prev = tTop;
  for (int i = 0; i < 12; i++) {
    vec3 q = ro + rd * t;
    float h = scale * shape(activator(worldToUv(q.xy)), contrast, city);
    if (q.z <= h) {
      // Bisect between the last free sample and this one.
      float a = prev, b = t;
      for (int k = 0; k < 5; k++) {
        float m = .5 * (a + b);
        vec3 r = ro + rd * m;
        if (r.z <= scale * shape(activator(worldToUv(r.xy)), contrast, city)) b = m; else a = m;
      }
      hit = ro + rd * b;
      break;
    }
    prev = t;
    t += dt;
  }
  vec2 uv = worldToUv(hit.xy);
  vec2 texel = 1. / vec2(textureSize(u_state, 0));
  float v = activator(uv);
  vec2 e = 1.5 * texel;
  float vx1 = activator(uv + vec2(e.x, 0.)), vx0 = activator(uv - vec2(e.x, 0.));
  float vy1 = activator(uv + vec2(0., e.y)), vy0 = activator(uv - vec2(0., e.y));
  float height = shape(v, contrast, city);
  vec2 slope = vec2(shape(vx1, contrast, city) - shape(vx0, contrast, city),
                    shape(vy1, contrast, city) - shape(vy0, contrast, city)) * scale
             / (2. * e * WORLD);
  vec3 normal = normalize(vec3(-slope, 1.));
  vec2 gradient = vec2(vx1 - vx0, vy1 - vy0) * .5;

  // Light: a soft key, a cool fill and a rim in accent/secondary.
  // In City the key is a raking light at low energy (long shadows, a mostly
  // dark frame) that climbs with energy; other states keep a fixed key.
  vec3 key = normalize(vec3(-.55, .45, mix(.70, mix(.16, .62, clamp(u_level, 0., 1.)), city)));
  vec3 view = -rd;
  float diffuse = max(0., dot(normal, key));
  float wrap = .5 + .5 * dot(normal, key);
  float rim = pow(1. - max(0., dot(normal, view)), 3.);
  float specular = pow(max(0., dot(normal, normalize(key + view))), mix(18., 60., tide));
  // Self-shadow toward the key light and contact darkening in the valleys.
  float shadow = 1.;
  for (int i = 1; i <= 4; i++) {
    vec3 s = vec3(hit.xy, scale * height) + key * float(i) * scale * .9;
    float ground = scale * shape(activatorFast(worldToUv(s.xy)), contrast, city);
    shadow = min(shadow, 1. - .55 * smoothstep(0., scale * .25, ground - s.z));
  }
  float cavity = 1. - .5 * (1. - height) * smoothstep(.0, .35, (vx1 + vx0 + vy1 + vy0) * .25 - v + .05);

  // Thread: the activator isoline at the colony edge, a constant-width line.
  float lineWidth = max(1.5, u_resolution.y / 720.);
  float edge = abs(v * contrast - .13) / max(fwidth(v * contrast), 1e-4);
  float thread = 1. - smoothstep(lineWidth * .5, lineWidth, edge);
  float halo = exp(-edge / (lineWidth * 5.));
  float body = smoothstep(.04, .30, v * contrast);
  float crest = smoothstep(.18, .34, v * contrast);
  float travel = length(hit - ro) - distanceToFocus;
  float near = 1. - smoothstep(0., 1.2, travel);

  vec3 ground = u_secondary * .018 + vec3(.004, .006, .009);
  // Two-tone bodies so every palette shows its range: tops lean toward
  // primary, flanks and low bodies toward secondary, and a slow regional
  // drift across the field shifts the mix (accent stays for edges/events).
  float region = .5 + .5 * sin(dot(hit.xy, vec2(1.7, 2.3)) + 1.3 * sin(hit.x * .9 - hit.y * 1.4));
  float top = smoothstep(.55, .95, normal.z) * smoothstep(.2, .8, height);
  vec3 inkTop = palette(clamp(.22 + .42 * region + .14 * crest, 0., .8));
  vec3 inkSide = mix(u_secondary, palette(.22 + .2 * region), .35);
  vec3 ink = mix(inkSide, inkTop, top);
  float lightAmount = (.05 + .72 * pow(diffuse, 1.3) * shadow + .08 * wrap) * cavity;
  // A cool fill from the opposite side keeps shadowed flanks coloured.
  float fill = max(0., dot(normal, normalize(vec3(.6, -.5, .45))));
  vec3 lit = ink * lightAmount + mix(u_secondary, ink, .3) * fill * .16 * cavity;
  vec3 rimColor = mix(u_primary, u_accent, .3);

  // Understory: a dark floor, luminous threads with a soft halo and low,
  // dimly lit colony bodies.
  vec3 under = ground + ink * body * .16 * lightAmount
             + mix(palette(.35 + .4 * region), vec3(1.), .15) * (thread * .9 + halo * .10)
             + u_accent * crest * pow(diffuse, 6.) * .08;
  // Tide: wet membranes with specular sheen, fresnel rims and a translucent
  // margin where the activator thins out.
  vec3 membrane = mix(ground, lit, body)
                + mix(u_primary, vec3(1.), .45) * specular * body * shadow * .85
                + rimColor * rim * body * .42
                + mix(u_primary, u_secondary, .5) * (1. - body) * smoothstep(.02, .09, v) * .08
                + u_primary * thread * .18;
  // City: stepped plateaus with dark walls and dim roofs; one row of lit
  // windows runs along the middle of each terrace wall.
  float level = clamp(hit.z / max(scale, 1e-5), 0., 1.);
  float steep = smoothstep(.25, .6, 1. - normal.z);
  float storeys = level * 3.;
  float storeyLine = abs(fract(storeys) - .5) / max(fwidth(storeys), 1e-4);
  vec2 block = floor(uv * vec2(textureSize(u_state, 0)) * .34) + floor(storeys) * 17.;
  float windows = (1. - smoothstep(lineWidth * .5, lineWidth * 1.2, storeyLine))
                * step(mix(.84, .66, u_level), hash(block)) * steep * (.35 + .65 * near);
  vec3 town = mix(ground, lit * mix(.45, .85, level), body)
            + mix(u_primary, vec3(1.), .3) * specular * crest * shadow * .30
            + rimColor * rim * body * .30
            + mix(u_accent, vec3(1.), .2) * windows * .85
            + u_primary * halo * (1. - body) * .05;
  vec3 color = mix(mix(under, membrane, tide), town, city);

  // Rhythm: reaction front, a selected concentration band (feed is simulation).
  color += mix(ink, u_accent, .4) * thread * u_rhythm.x * .9;
  float band = exp(-sq((v - (.08 + .05 * mod(u_rhythmCount.y, 5.))) / .022));
  color += ink * band * body * u_rhythm.y * .55;
  float audioLight = clamp(u_params[7], 0., 1.) * clamp(u_mid, 0., 1.);
  color += u_accent * thread * audioLight * .04;

  // Atmosphere: distance fades toward the palette's dark.
  float fog = smoothstep(-.35, mix(1.2, 1.7, city), travel);
  color = mix(color, ground * .7, fog);
  vec2 frame = v_uv * (1. - v_uv);
  color *= .72 + .28 * pow(clamp(frame.x * frame.y * 16., 0., 1.), .35);
  outColor = vec4(max(color, 0.), 1.);
}
`;

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
  fragment,
  // Same codec and stability bounds as acid (see scene-acid.mjs): feed, kill
  // and diffusion stay inside acid's clamped ranges for every development.
  simulation: {
    continuity: "gray-scott-uv16-v1",
    fragment: simulationFragment,
    size: [320, 192],
    steps: 8,
  },
};
