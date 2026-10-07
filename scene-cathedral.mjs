// Conservative signed-distance architecture; all journeys stay in the clear aisle.
const schema = [
  { key: 'geometry', label: 'Architecture', min: 0, max: 3, step: 1, default: 0 },
  { key: 'recursion', label: 'Detail generations', min: 1, max: 4, step: 1, default: 3 },
  { key: 'scale', label: 'Bay scale', min: 0.65, max: 1.6, step: 0.01, default: 1 },
  { key: 'speed', label: 'Traversal · 0 is still', min: 0, max: 1.5, step: 0.01, default: 0.28 },
  { key: 'journey', label: 'Journey · aisle / glide / vault', min: 0, max: 2, step: 1, default: 0 },
  { key: 'material', label: 'Glass / brass / opal / night / enamel / ember', min: 0, max: 5, step: 1, default: 0 },
  { key: 'glow', label: 'Transmitted light', min: 0.1, max: 1.5, step: 0.01, default: 0.8 },
  { key: 'steps', label: 'Ray-step ceiling', min: 32, max: 96, step: 16, default: 80 },
];

const presets = [
  { name: 'Prismatic Nave', seed: 4901, params: { geometry: 0, recursion: 3, scale: 1, speed: 0.28, journey: 0, material: 0, glow: 0.8, steps: 80 } },
  { name: 'Brass Procession', seed: 4923, params: { geometry: 0, recursion: 2, scale: 1.4, speed: 0.52, journey: 1, material: 1, glow: 0.48, steps: 80 } },
  { name: 'Opal Reliquary', seed: 4947, params: { geometry: 1, recursion: 4, scale: 0.85, speed: 0.22, journey: 2, material: 2, glow: 1.05, steps: 96 } },
  { name: 'Midnight Rose', seed: 4961, params: { geometry: 2, recursion: 4, scale: 1.15, speed: 0.18, journey: 1, material: 3, glow: 1.2, steps: 96 } },
  { name: 'Enamel Still', seed: 4981, params: { geometry: 3, recursion: 3, scale: 0.75, speed: 0, journey: 0, material: 4, glow: 0.62, steps: 80 } },
  { name: 'Ember Vault', seed: 4999, params: { geometry: 3, recursion: 4, scale: 1.5, speed: 0.7, journey: 2, material: 5, glow: 1.3, steps: 96 } },
];

const fragment = `
const float PI = 3.14159265359;
const int RAY_CAP = 96;
const int GENERATION_CAP = 4;

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
  // An enclosed, infinite corridor prevents accidental empty-space camera cuts.
  float enclosure = min(abs(abs(p.x) - 3.28), abs(p.y + 1.8));
  enclosure = min(enclosure, abs(p.y - 4.42)) - .07;
  vec2 result = vec2(enclosure, 0.);
  float generations = clamp(u_params[1], 1., 4.);
  if (family < .5) {
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
      float thinArch = max(max(abs(arch + .13 * (k + 1.)) - .025, .28 - q.y), abs(z) - .035);
      // Each generation adds paired recessed tracery rather than unbounded recursion.
      result = nearer(result, vec2(thinArch, 1.));
    }
  } else if (family < 1.5) {
    // A recursive crown of octahedral crystals grows inward from each side wall.
    vec3 c = vec3(abs(q.x) - 3.05, q.y - .35, q.z);
    result = nearer(result, vec2(crystalSDF(c, 1.42), 2.));
    for (int i = 0; i < GENERATION_CAP; ++i) {
      if (float(i) >= generations) break;
      float k = float(i);
      float size = .78 * pow(.65, k);
      vec3 branch = vec3(abs(q.x) - (2.67 + .12 * k), q.y - (1.25 + .48 * k), abs(q.z) - (.68 + .32 * k));
      result = nearer(result, vec2(crystalSDF(branch, size), 2.));
      vec3 root = vec3(abs(q.x) - 2.88, q.y + 1.24, abs(q.z) - .72);
      result = nearer(result, vec2(crystalSDF(root, .55), 2.));
    }
    float crown = max(abs(length(vec2(q.x, q.y - .9)) - 2.95) - .07, abs(q.z) - .07);
    result = nearer(result, vec2(crown, 1.));
  } else if (family < 2.5) {
    // Round cloister arches with actual nested rose-window rings at the walls.
    float arch = max(abs(length(vec2(q.x, q.y - .75)) - 2.63) - .105, abs(q.z) - .12);
    result = nearer(result, vec2(arch, 1.));
    for (int i = 0; i < GENERATION_CAP; ++i) {
      if (float(i) >= generations) break;
      float k = float(i);
      float ring = abs(length(vec2(q.y - 1.25, q.z)) - (1.5 - .29 * k)) - .035;
      result = nearer(result, vec2(max(ring, abs(abs(q.x) - 3.16) - .09), 1.));
      float tracery = max(abs(length(vec2(q.x, q.y - .75)) - (2.72 + .12 * k)) - .025,
                          abs(abs(q.z) - bay * (.18 + .05 * k)) - .04);
      result = nearer(result, vec2(tracery, 1.));
    }
  } else {
    // A folded diamond vault: planar rib facets and successively inset folds.
    float fold = (abs(q.x) + abs(q.y - 1.05) - 4.05) * .70710678118;
    result = nearer(result, vec2(max(abs(fold) - .11, abs(q.z) - .12), 1.));
    for (int i = 0; i < GENERATION_CAP; ++i) {
      if (float(i) >= generations) break;
      float k = float(i);
      float inset = max(abs(fold + .12 * (k + 1.)) - .03,
                        abs(abs(q.z) - bay * (.15 + .06 * k)) - .035);
      result = nearer(result, vec2(inset, 1.));
    }
    float pier = boxSDF(vec3(abs(q.x) - 2.82, q.y + .45, q.z), vec3(.1, 1.28, .2));
    result = nearer(result, vec2(pier, 1.));
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
  return mix(color, shared, .32);
}
void main() {
  float bay = bayLength();
  float speed = clamp(u_params[3], 0., 1.5);
  float travel = mod(max(u_time, 0.) * speed * .7, bay * 256.);
  float phase = travel / bay * 2. * PI;
  float seedPhase = hash(vec2(4., 9.)) * 2. * PI;
  float journey = clamp(u_params[4], 0., 2.);
  // All camera paths lie within x +/- .42 and y [.12,.56], clear of every family.
  vec3 aisle = vec3(.08 * sin(phase * .125 + seedPhase), .24, travel);
  vec3 glide = vec3(.42 * sin(phase * .125 + seedPhase), .31 + .09 * sin(phase * .25), travel);
  vec3 vault = vec3(.18 * sin(phase * .25 + seedPhase), .4 + .16 * sin(phase * .125), travel);
  vec3 ro = journey < 1. ? mix(aisle, glide, journey) : mix(glide, vault, journey - 1.);
  // Stationary means a fixed position AND fixed orientation; audio may still light it.
  float pitch = mix(.16, .36 + .08 * sin(phase * .125), max(journey - 1., 0.));
  vec3 forward = normalize(vec3(-ro.x * .055, pitch, 1.));
  vec3 right = normalize(cross(vec3(0., 1., 0.), forward));
  vec3 up = normalize(cross(forward, right));
  // Vertical field of view is fixed; width follows actual render-target aspect.
  vec2 screen = aspectUV() * 2.;
  vec3 rd = normalize(forward + right * screen.x * .62 + up * screen.y * .62);
  int limit = int(clamp(u_params[7], 32., float(RAY_CAP)));
  float distance = 0.;
  float hit = 0.;
  vec2 surface = vec2(1., 0.);
  for (int i = 0; i < RAY_CAP; ++i) {
    if (i >= limit) break;
    surface = sceneSDF(ro + rd * distance);
    float epsilon = .0015 + distance * .00022;
    if (surface.x < epsilon) { hit = 1.; break; }
    // A 0.72 safety factor and bounded minimum advance avoid overshoot/stalls.
    distance += max(surface.x * .72, .0008);
    if (distance > 64.) { distance = 64.; break; }
  }
  float glow = clamp(u_params[6], .1, 1.5);
  float material = clamp(u_params[5], 0., 5.);
  vec3 atmosphere = glassPalette(.55, material) * .075;
  // The vanishing point retains a quiet atmospheric presence for axial miss rays.
  float horizon = pow(max(dot(rd, forward), 0.), 28.);
  vec3 color = atmosphere + glassPalette(.82, material) * (.065 + .18 * horizon) * glow;
  if (hit > .5) {
    vec3 p = ro + rd * distance;
    vec3 n = surfaceNormal(p, .002 + distance * .00015);
    vec2 uv = abs(n.x) > .55 ? vec2(p.z, p.y) : vec2(p.x, p.z);
    uv.x = mod(uv.x, bay);
    vec2 glass = glassCells(uv * (1.3 + .27 * clamp(u_params[1], 1., 4.)));
    float family = clamp(u_params[0], 0., 3.);
    if (family > 1.5 && family < 2.5 && abs(n.x) > .55) {
      vec2 rose = vec2(p.y - 1.25, mod(p.z + .5 * bay, bay) - .5 * bay);
      float spokes = abs(sin(atan(rose.y, rose.x) * 8.));
      float rings = abs(sin(length(rose) * 7.));
      glass.x *= smoothstep(.025, .1, spokes) * smoothstep(.02, .1, rings);
      glass.y = fract(atan(rose.y, rose.x) / (2. * PI) + length(rose) * .16);
    } else if (family > 2.5) {
      vec2 lattice = uv * 1.6;
      float seam = min(abs(fract(lattice.x + lattice.y) - .5), abs(fract(lattice.x - lattice.y) - .5));
      glass.x *= smoothstep(.012, .055, seam);
      glass.y = fract(floor(lattice.x + lattice.y) * .37 + floor(lattice.x - lattice.y) * .61);
    }
    vec3 base = glassPalette(glass.y, material);
    float isStructure = smoothstep(.4, .9, surface.y) * (1. - smoothstep(1.3, 1.8, surface.y));
    float isCrystal = smoothstep(1.3, 1.8, surface.y);
    float isFloor = 1. - smoothstep(-1.65, -1.5, p.y);
    vec3 lightDirection = normalize(vec3(-1.7, 3.8, -2.));
    float diffuse = .28 + .72 * max(dot(n, lightDirection), 0.);
    float rim = pow(1. - abs(dot(n, -rd)), 3.);
    float specular = pow(max(dot(reflect(-lightDirection, n), -rd), 0.), mix(20., 65., isCrystal));
    vec3 glassColor = base * (.18 + diffuse * .23 + glass.x * glow * (.6 + .16 * clamp(u_bass, 0., 1.)));
    glassColor *= mix(.14, 1., glass.x);
    vec3 stone = mix(vec3(.085, .09, .105), base * .31, .5) * diffuse;
    color = mix(glassColor, stone, max(isStructure, isFloor));
    color += base * rim * (.15 + .5 * isCrystal) * glow;
    color += mix(vec3(.3), base, .4) * specular * (.28 + .7 * isCrystal);
    color += base * glass.x * clamp(u_onset, 0., 1.) * .12 * (1. - isFloor);
    float fog = 1. - exp(-distance * .025);
    color = mix(color, atmosphere + base * .09 * glow, fog);
  }
  // Soft bounded tonemapping preserves stained-glass highlights without HDR overflow.
  color = max(color, vec3(0.));
  color = color / (vec3(1.) + color);
  float vignette = 1. - .14 * smoothstep(.2, 1.4, length(screen));
  outColor = vec4(clamp(pow(color, vec3(.82)) * vignette, 0., 1.), 1.);
}
`;

export default {
  id: 'cathedral',
  number: 49,
  name: 'Cathedrals of Error',
  description: 'Recursive SDF Gothic naves, octahedral reliquaries, rose cloisters and folded vaults. Three bounded aisle journeys; speed zero holds the camera still. Procedural stained glass, not a physical optics simulation.',
  schema,
  presets,
  fragment,
};
