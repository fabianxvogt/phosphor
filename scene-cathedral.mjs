// Conservative signed-distance architecture with four bounded camera grammars.
const schema = [
  {
    key: "geometry",
    label: "Architecture",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "recursion",
    label: "Detail generations",
    min: 1,
    max: 4,
    step: 0.01,
    default: 3,
  },
  {
    key: "scale",
    label: "Bay scale",
    min: 0.65,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "speed",
    label: "Traversal · 0 is still",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.28,
  },
  {
    key: "journey",
    label: "Journey · aisle / glide / vault",
    min: 0,
    max: 2,
    step: 1,
    default: 0,
  },
  {
    key: "material",
    label: "Glass / brass / opal / night / enamel / ember",
    min: 0,
    max: 5,
    step: 1,
    default: 0,
  },
  {
    key: "glow",
    label: "Transmitted light",
    min: 0.1,
    max: 1.5,
    step: 0.01,
    default: 0.8,
  },
  {
    key: "steps",
    label: "Ray-step ceiling",
    min: 32,
    max: 96,
    step: 16,
    default: 80,
  },
];

const presets = [
  {
    name: "Prismatic Nave",
    seed: 4901,
    params: {
      geometry: 0,
      recursion: 3,
      scale: 1,
      speed: 0.28,
      journey: 0,
      material: 0,
      glow: 0.8,
      steps: 80,
    },
  },
  {
    name: "Brass Procession",
    seed: 4923,
    params: {
      geometry: 0,
      recursion: 2,
      scale: 1.4,
      speed: 0.52,
      journey: 1,
      material: 1,
      glow: 0.48,
      steps: 80,
    },
  },
  {
    name: "Opal Reliquary",
    seed: 4947,
    params: {
      geometry: 1,
      recursion: 3,
      scale: 0.85,
      speed: 0.22,
      journey: 2,
      material: 2,
      glow: 1.05,
      steps: 96,
    },
  },
  {
    name: "Midnight Rose",
    seed: 4961,
    params: {
      geometry: 2,
      recursion: 3,
      scale: 1.15,
      speed: 0.18,
      journey: 1,
      material: 3,
      glow: 1.2,
      steps: 96,
    },
  },
  {
    name: "Enamel Glide",
    seed: 4981,
    params: {
      geometry: 3,
      recursion: 3,
      scale: 0.75,
      speed: 0.26,
      journey: 0,
      material: 4,
      glow: 0.62,
      steps: 80,
    },
  },
  // Restored 2026-10-09: the still-camera look the D62 rework replaced with
  // Enamel Glide (energy still adds a slow drift).
  {
    name: "Enamel Still",
    seed: 4981,
    params: {
      geometry: 3,
      recursion: 3,
      scale: 0.75,
      speed: 0,
      journey: 0,
      material: 4,
      glow: 0.62,
      steps: 80,
    },
  },
  {
    name: "Ember Vault",
    seed: 4999,
    params: {
      geometry: 3,
      recursion: 3,
      scale: 1.5,
      speed: 0.7,
      journey: 2,
      material: 5,
      glow: 1.3,
      steps: 96,
    },
  },
];

// Integrate traversal/rotation without speed glides re-evaluating elapsed time.
// A second texel carries quantization residuals, preserving sub-quantum speeds.
// Camera harmonics repeat after forty bays; all crystal harmonics after 100 turns.
const simulation = `
void main() {
  vec2 phase = unpack16(texture(u_state, vec2(.25, .5)));
  vec2 residual = unpack16(texture(u_state, vec2(.75, .5))) - .5;
  if (u_reset) {
    outColor = pack16(v_uv.x < .5 ? vec2(0.) : vec2(.5));
    return;
  } else {
    float bay = 5.8 * clamp(u_params[2], .65, 1.6);
    float speed = clamp(u_params[3], 0., 1.5);
    phase = fract(phase + residual / 65535. +
      u_dt * speed * vec2(.7 / (bay * 40.), .22 / (TAU * 100.)));
  }
  vec2 error = phase * 65535. - floor(phase * 65535. + .5);
  outColor = pack16(v_uv.x < .5 ? phase : error + .5);
}
`;

const fragment = `
const int RAY_CAP = 96;
const int GENERATION_CAP = 4;
float crystalTurn;

float boxSDF(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.);
}
float crystalSDF(vec3 p, float radius) {
  // Conservative octahedron distance: its planar facets, not a sphere proxy.
  return (dot(abs(p), vec3(1.)) - radius) * .57735026919;
}
vec2 nearer(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
float bayLength() { return 5.8 * clamp(u_params[2], .65, 1.6); }

vec2 familySDF(vec3 p, float family) {
  float bay = bayLength();
  vec3 q = p;
  q.z = mod(p.z + .5 * bay, bay) - .5 * bay;
  float generations = clamp(u_params[1], 1., 4.);
  float level = clamp(u_level, 0., 1.);
  vec2 result = vec2(64., 0.);
  if (family < .5) {
    // Only the nave shares an enclosure; other types have their own silhouettes.
    float enclosure = min(abs(abs(p.x) - 3.28), abs(p.y + 1.8));
    result = vec2(min(enclosure, abs(p.y - 4.42)) - .07, 0.);
    // Two intersecting circles make a pointed Gothic arch, joined to columns.
    float arch = max(length(vec2(q.x - 1.65, q.y - .12)),
                     length(vec2(q.x + 1.65, q.y - .12))) - 4.;
    float rib = max(max(abs(arch) - .095, .12 - q.y), abs(q.z) - .13);
    float pillars = boxSDF(vec3(abs(q.x) - 2.34, q.y + .76, q.z), vec3(.12, .88, .15));
    result = nearer(result, vec2(min(rib, pillars), 1.));
    for (int i = 0; i < GENERATION_CAP; ++i) {
      if (float(i) >= generations) break;
      float k = float(i);
      float z = abs(q.z) - bay * (.16 + .055 * k);
      float width = .025 * clamp(generations - k, 0., 1.);
      float thinArch = max(max(abs(arch + .13 * (k + 1.)) - width, .28 - q.y), abs(z) - .035);
      // Each generation adds paired recessed tracery rather than unbounded recursion.
      result = nearer(result, vec2(thinArch, 1.));
    }
  } else if (family < 1.5) {
    // A free-standing reliquary and orbiting facet clusters, not another aisle.
    vec3 c = p - vec3(0., .5, 0.);
    float turn = crystalTurn;
    c.xz = rot2(turn) * c.xz;
    c.xy = rot2(.35) * c.xy;
    // Peak opens real axial apertures through the main relic, not a tint or
    // engraving change on the same opaque silhouette.
    float aperture = min(length(c.xy), min(length(c.yz), length(c.xz))) -
      mix(.08, .78, smoothstep(.1, .9, level));
    result = vec2(max(crystalSDF(c, 1.85), -aperture), 2.);
    for (int i = 0; i < GENERATION_CAP; ++i) {
      if (float(i) >= generations) break;
      float k = float(i), angle = k * 2.4 + turn * .7;
      vec3 center = vec3(2.15 * cos(angle), .8 * sin(angle * 1.7), 1.4 * sin(angle));
      vec3 branch = c - center;
      branch.yz = rot2(angle) * branch.yz;
      float radius = (.75 - .09 * k) * clamp(generations - k, 0., 1.);
      result = nearer(result, vec2(crystalSDF(branch, radius), 2.));
    }
    // Wide walls reveal a faceted chamber instead of empty lateral margins.
    if (u_resolution.x / u_resolution.y > 2.2) {
      vec2 wall = abs(p.xz);
      float chamber = max(max(wall.x, wall.y), (wall.x + wall.y) * .70710678118) - 9.;
      result = nearer(result, vec2(abs(chamber) - .08, 2.));
    }
    result = nearer(result, vec2(abs(p.y + 2.1) - .06, 0.));
  } else if (family < 2.5) {
    // A frontal rose disk, nested raised rings and a radial mullion pattern.
    vec3 rose = p - vec3(0., .6, 1.);
    if (u_resolution.x / u_resolution.y > 2.2) rose.x = mod(rose.x + 3.4, 6.8) - 3.4;
    float radius = length(rose.xy);
    float disk = max(radius - 2.55, abs(rose.z) - .09);
    // Broad low-energy panes open into a sixteen-spoke, nested-ring skeleton.
    // SDF subtraction changes holes/coverage independently of glass emission.
    float aperture = mix(.12, 2.24, smoothstep(.1, .9, level));
    result = vec2(max(disk, aperture - radius), 3.);
    vec2 spoke = fold(rose.xy, 16.) - vec2(1.35, 0.);
    float mullion = boxSDF(vec3(spoke, rose.z), vec3(1.2, mix(.22, .075, level), .1));
    result = nearer(result, vec2(max(mullion, radius - 2.55), 3.));
    float frame = max(abs(radius - 2.62) - .13, abs(rose.z) - .2);
    result = nearer(result, vec2(frame, 1.));
    for (int i = 0; i < GENERATION_CAP; ++i) {
      if (float(i) >= generations) break;
      float k = float(i);
      float width = .045 * clamp(generations - k, 0., 1.);
      float ring = max(abs(radius - (2.05 - .42 * k)) - width, abs(rose.z + .12) - .08);
      result = nearer(result, vec2(ring, 1.));
    }
    // Side lancets carry the composition onto wide walls without stretching it.
    vec3 side = vec3(abs(p.x) - 4.3, p.y - .6, p.z - 1.5);
    float lancet = max(max(abs(side.x) - .62, abs(side.y) - 2.5), abs(side.z) - .1);
    result = nearer(result, vec2(lancet, 0.));
  } else {
    // A zigzag gallery of broad folded planes, viewed obliquely from below.
    float shell = (abs(p.x) + abs(p.y - .9) - 5.) * .70710678118;
    result = vec2(abs(shell) - .07, 0.);
    // Evaluate both staggered rows: no discontinuous nearest-bay side switch.
    for (int row = 0; row < 2; ++row) {
      float side = float(row) * 2. - 1.;
      float z = mod(p.z - float(row) * bay + bay, 2. * bay) - bay;
      vec3 panel = vec3(p.x - side * 2.15, p.y - .9, z);
      panel.xy = rot2(side * .62) * panel.xy;
      result = nearer(result, vec2(boxSDF(panel, vec3(2., 3.5, .14)), 0.));
      float seam = boxSDF(vec3(abs(panel.x) - 1.97, panel.y, panel.z), vec3(.06, 3.55, .2));
      result = nearer(result, vec2(seam, 1.));
      for (int i = 0; i < GENERATION_CAP; ++i) {
        if (float(i) >= generations) break;
        float k = float(i);
        vec3 rib = vec3(panel.x, panel.y - (k - 1.5) * 1.2, panel.z);
        float width = .045 * clamp(generations - k, 0., 1.);
        result = nearer(result, vec2(boxSDF(rib, vec3(2.05, width, .22)), 1.));
      }
    }
    result = nearer(result, vec2(abs(p.y + 2.) - .06, 0.));
  }
  return result;
}
vec2 sceneSDF(vec3 p) {
  float geometry = clamp(u_params[0], 0., 3.);
  float family = floor(geometry);
  vec2 a = familySDF(p, family);
  float blend = fract(geometry);
  if (blend < .001 || family > 2.5) return a;
  vec2 b = familySDF(p, family + 1.);
  // Convex blending retains the distance fields' conservative Lipschitz bound.
  return mix(a, b, blend);
}
vec3 surfaceNormal(vec3 p, float epsilon) {
  vec2 e = vec2(1., -1.) * epsilon;
  vec3 n = e.xyy * sceneSDF(p + e.xyy).x + e.yyx * sceneSDF(p + e.yyx).x
         + e.yxy * sceneSDF(p + e.yxy).x + e.xxx * sceneSDF(p + e.xxx).x;
  return n / max(length(n), .00001);
}
float ambientOcclusion(vec3 p, vec3 n) {
  float blocked = 0., weight = .5;
  for (int i = 0; i < 3; ++i) {
    float h = .035 * pow(2.5, float(i));
    blocked += weight * max(0., 1. - sceneSDF(p + n * h).x / h);
    weight *= .5;
  }
  return clamp(1. - blocked * .85, .25, 1.);
}
vec2 glassCells(vec2 uv) {
  vec2 cell = floor(uv), f = fract(uv);
  float first = 8., second = 8., tint = 0.;
  for (int y = -1; y <= 1; ++y) {
    for (int x = -1; x <= 1; ++x) {
      vec2 g = vec2(float(x), float(y));
      vec2 site = vec2(hash(cell + g), hash(cell + g + vec2(37., 91.)));
      float d = length(g + .18 + .64 * site - f);
      if (d < first) { second = first; first = d; tint = hash(cell + g + 113.); }
      else second = min(second, d);
    }
  }
  return vec2(smoothstep(.018, .075, second - first), tint);
}
vec3 glassPalette(float t, float material) {
  vec3 shared = palette(t);
  vec3 color;
  if (material < .5) color = mix(vec3(.055, .18, .72), vec3(.82, .12, .27), t);
  else if (material < 1.5) color = mix(vec3(.16, .065, .018), vec3(1., .67, .18), t);
  else if (material < 2.5) color = mix(vec3(.22, .65, .72), vec3(.95, .63, .92), t);
  else if (material < 3.5) color = mix(vec3(.028, .07, .24), vec3(.35, .22, .85), t);
  else if (material < 4.5) color = mix(vec3(.04, .63, .53), vec3(.94, .34, .065), t);
  else color = mix(vec3(.26, .025, .018), vec3(1., .4, .045), t);
  return mix(color, shared, .78);
}
void main() {
  float bay = bayLength();
  float level = clamp(u_level, 0., 1.);
  // D61 envelopes are attack/release smoothed and fade out with beat lock.
  float bass = smoothstep(0., 1., clamp(u_low, 0., 1.));
  float kick = u_kick * smoothstep(.15, 1., level);
  vec2 state = fract(unpack16(texture(u_state, vec2(.25, .5))) +
    (unpack16(texture(u_state, vec2(.75, .5))) - .5) / 65535.);
  crystalTurn = state.y * TAU * 100.;
  float travel = state.x * bay * 40.;
  float phase = state.x * TAU * 40.;
  float seedPhase = hash(vec2(4., 9.)) * 2. * PI;
  float journey = clamp(u_params[4], 0., 2.);
  // The nave/folds traverse; the reliquary orbits; the rose holds a frontal view.
  vec3 aisle = vec3(.08 * sin(phase * .125 + seedPhase), .24, travel);
  vec3 glide = vec3(.42 * sin(phase * .125 + seedPhase), .31 + .09 * sin(phase * .25), travel);
  vec3 vault = vec3(.18 * sin(phase * .25 + seedPhase), .4 + .16 * sin(phase * .125), travel);
  vec3 ro = journey < 1. ? mix(aisle, glide, journey) : mix(glide, vault, journey - 1.);
  float family = clamp(u_params[0], 0., 3.);
  float pitch = mix(.16, .36 + .08 * sin(phase * .125), max(journey - 1., 0.));
  vec3 forward = normalize(vec3(-ro.x * .055, pitch, 1.));
  if (family > .5 && family < 1.5) {
    float orbit = phase * .5 + seedPhase;
    float orbitRadius = mix(6.4, 4.7, level);
    ro = vec3(orbitRadius * sin(orbit), .8 + (.1 + .4 * level) * sin(orbit * .7), -orbitRadius * cos(orbit));
    forward = normalize(vec3(0., .5, 0.) - ro);
  } else if (family > 1.5 && family < 2.5) {
    ro = vec3((.04 + .65 * level) * sin(phase * .3),
      .6 + .15 * level * sin(phase * .2), -4.8 + .35 * level * sin(phase * .25));
    forward = normalize(vec3(0., .6, 1.) - ro);
  } else if (family > 2.5) {
    ro.x = .35 * sin(phase * .35);
    ro.y = -.5;
    forward = normalize(vec3(.22 * sin(phase * .2), .2, 1.));
  }
  vec3 right = normalize(cross(vec3(0., 1., 0.), forward));
  vec3 up = normalize(cross(forward, right));
  // Fixed vertical field of view preserves circles/facets at every aspect.
  vec2 screen = aspectUV() * 2.;
  float bank = (.015 + level * level * .16) * sin(phase * .25 + seedPhase);
  screen = rot2(bank) * screen;
  float fov = .62 / (1. + kick * .07);
  vec3 rd = normalize(forward + right * screen.x * fov + up * screen.y * fov);
  int limit = int(min(clamp(u_params[7], 32., float(RAY_CAP)), u_raySteps));
  float distance = 0.;
  float hit = 0.;
  vec2 surface = vec2(1., 0.);
  float scattering = 0.;
  float extinction = .028;
  float glow = clamp(u_params[6], .1, 1.5);
  float material = clamp(u_params[5], 0., 5.);
  vec3 atmosphere = glassPalette(.35, material) * .11;
  for (int i = 0; i < RAY_CAP; ++i) {
    if (i >= limit) break;
    vec3 samplePoint = ro + rd * distance;
    surface = sceneSDF(samplePoint);
    float epsilon = .0015 + distance * .00022;
    if (surface.x < epsilon) { hit = 1.; break; }
    // Integrate cheap oblique light sheets on the governed primary ray.
    // No shadow march or unbounded second volume pass.
    float segment = min(max(surface.x * .72, .0008), 64. - distance);
    float shaft = pow(.5 + .5 * cos((samplePoint.x + .45 * samplePoint.y -
      .3 * samplePoint.z) * (1.5 + 3.5 * level)), 12.);
    scattering += exp(-distance * extinction) * (1. - exp(-segment * extinction)) *
      (.045 + shaft * (.3 + .9 * level));
    distance += segment;
    if (distance >= 64.) break;
  }
  // The vanishing point retains a quiet atmospheric presence for axial miss rays.
  float horizon = pow(max(dot(rd, forward), 0.), 28.);
  vec3 color = atmosphere + glassPalette(.82, material) * (.04 + .12 * horizon) * glow;
  if (hit > .5) {
    vec3 p = ro + rd * distance;
    vec3 n = surfaceNormal(p, .002 + distance * .00015);
    vec3 dominant = abs(n);
    vec2 uv = dominant.x > dominant.y && dominant.x > dominant.z ? p.zy
            : dominant.y > dominant.z ? p.xz : p.xy;
    uv.x = mod(uv.x, bay);
    vec2 glass;
    if (family > 1.5 && family < 2.5 && surface.y > 2.5) {
      vec2 rose = p.xy - vec2(0., .6);
      if (u_resolution.x / u_resolution.y > 2.2) rose.x = mod(rose.x + 3.4, 6.8) - 3.4;
      float angle = atan(rose.y, rose.x);
      float spokes = abs(sin(angle * (6. + 2. * clamp(u_params[1], 1., 4.))));
      float rings = abs(sin(length(rose) * (3. + 6. * level)));
      glass.x = smoothstep(.04, .12 + .12 * level, spokes) * smoothstep(.03, .1 + .1 * level, rings);
      glass.y = .5 + .5 * sin(angle * 8. + length(rose) * 4.);
    } else if (family > 2.5) {
      vec2 lattice = uv * (.65 + 2.4 * level);
      float seam = min(abs(fract(lattice.x + lattice.y) - .5), abs(fract(lattice.x - lattice.y) - .5));
      glass.x = smoothstep(.02, .08, seam);
      glass.y = fract(floor(lattice.x + lattice.y) * .37 + floor(lattice.x - lattice.y) * .61);
    } else if (family > .5 && family < 1.5) {
      glass = vec2(1., .5 + .25 * n.y + .2 * n.x);
    } else {
      glass = glassCells(uv * (.65 + 2.4 * level));
    }
    vec3 base = glassPalette(glass.y, material);
    float isStructure = smoothstep(.4, .9, surface.y) * (1. - smoothstep(1.3, 1.8, surface.y));
    float isCrystal = smoothstep(1.3, 1.8, surface.y) * (1. - smoothstep(2.3, 2.8, surface.y));
    float isFloor = 1. - smoothstep(-1.65, -1.5, p.y);
    vec3 lightDirection = normalize(vec3(-1.7, 3.8, -2.));
    float diffuse = .28 + .72 * max(dot(n, lightDirection), 0.);
    float rim = pow(max(1. - abs(dot(n, -rd)), 0.), 3.);
    float specular = pow(max(dot(reflect(-lightDirection, n), -rd), 0.), mix(20., 65., isCrystal));
    float occlusion = ambientOcclusion(p, n);
    // Contrast pivots around the typical pane coverage, not a brightness gain.
    float transmission = clamp(.72 + (glass.x - .86) * (.25 + .75 * level), .02, 1.);
    vec3 glassColor = base * ((.35 + diffuse * .4) * occlusion + transmission * glow * 2.5);
    glassColor *= mix(.04, 1., transmission);
    if (isCrystal > .5) {
      float engraving = smoothstep(-.08, .08, sin(p.y * (2. + 10. * level) + p.x * 3.)) * 2. - 1.;
      glassColor = base * (.2 + diffuse * 2.4) * occlusion * (1. + engraving * level * .85);
    }
    vec3 stone = mix(vec3(.085, .09, .105), base * .31, .5) * diffuse * occlusion;
    color = mix(glassColor, stone, max(isStructure, isFloor));
    color += base * rim * (.15 + .5 * isCrystal) * glow;
    color += mix(vec3(.3), base, .4) * specular * (.28 + .7 * isCrystal);
    float emissive = glass.x * (1. - isFloor) *
      (.04 + .12 * level + bass * (.15 + .7 * level));
    color += glassPalette(fract(glass.y + .23), material) * emissive * glow;
    float fog = 1. - exp(-distance * extinction);
    color = mix(color, atmosphere, fog);
  }
  color += glassPalette(.82, material) * min(scattering, 1.2) * glow *
    (.45 + .55 * level + bass * level * .35);
  // Soft bounded tonemapping preserves stained-glass highlights without HDR overflow.
  color = max(color, vec3(0.));
  color = color / (vec3(1.) + color);
  float vignette = 1. - .14 * smoothstep(.2, 1.4, length(screen));
  outColor = vec4(clamp(pow(color, vec3(.82)) * vignette, 0., 1.), 1.);
}
`;

export default {
  id: "cathedral",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { speed: [0.05, 1.3], recursion: [1, 4] },
  beat: { punch: 1.2, pulse: 1 },
  audio: [
    { param: "glow", feature: "low", amount: 0.16 },
    { param: "scale", feature: "mid", amount: -0.05 },
    { param: "recursion", feature: "flux", amount: 0.08 },
  ],
  stage: ["speed", "glow", "scale"],
  type: { key: "geometry", values: [0, 1, 2, 3] },
  number: 49,
  name: "Cathedrals of Error",
  maxRenderWidth: 1280,
  description:
    "Bounded SDF Gothic naves, perforating octahedral reliquaries, opening rose-window skeletons and zigzag folded galleries. Palette-led stained glass, distance atmosphere, bounded in-scattered shafts and three-sample SDF occlusion. The smoothed low band excites emissive panes; energy increases structural openings, detail, integrated traversal, banking and kick FOV. Speed zero holds the camera still; this is procedural stained glass, not physical optics.",
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [2, 1], steps: 1 },
};
