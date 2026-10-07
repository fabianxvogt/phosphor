// Projected, depth-tested parametric tubes and ruled ribbons, not a noise field.
// Geometry and illumination depend only on a periodic loop coordinate. Families
// are artistic morphs: crossings are possible and knot preservation is not claimed.
const schema = [
  {
    key: "family",
    label: "Shape · knot / eight / Möbius / braid",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "thickness",
    label: "Tube / ribbon thickness",
    min: 0.018,
    max: 0.14,
    step: 0.002,
    default: 0.064,
  },
  {
    key: "duration",
    label: "Loop duration · seconds",
    min: 4,
    max: 90,
    step: 1,
    default: 24,
  },
  {
    key: "phase",
    label: "Loop phase · cycles",
    min: 0,
    max: 1,
    step: 0.005,
    default: 0,
  },
  {
    key: "yaw",
    label: "Camera orbit · degrees",
    min: -180,
    max: 180,
    step: 1,
    default: 22,
  },
  {
    key: "pitch",
    label: "Camera elevation · degrees",
    min: -70,
    max: 70,
    step: 1,
    default: 24,
  },
  {
    key: "material",
    label: "Ceramic / metal / pearl / velvet / enamel / foil",
    min: 0,
    max: 5,
    step: 1,
    default: 0,
  },
  {
    key: "motion",
    label: "Static 0 · loop 1",
    min: 0,
    max: 1,
    step: 1,
    default: 1,
  },
];

const presets = [
  {
    name: "Porcelain Trefoil",
    seed: 54,
    params: {
      family: 0,
      thickness: 0.064,
      duration: 32,
      phase: 0,
      yaw: 22,
      pitch: 24,
      material: 0,
      motion: 1,
    },
  },
  {
    name: "Brushed Figure Eight",
    seed: 5402,
    params: {
      family: 1,
      thickness: 0.046,
      duration: 22,
      phase: 0.18,
      yaw: -30,
      pitch: 38,
      material: 1,
      motion: 1,
    },
  },
  {
    name: "Pearlescent Möbius",
    seed: 5403,
    params: {
      family: 2,
      thickness: 0.108,
      duration: 40,
      phase: 0.32,
      yaw: 35,
      pitch: 52,
      material: 2,
      motion: 1,
    },
  },
  {
    name: "Velvet Woven Orbit",
    seed: 5404,
    params: {
      family: 3,
      thickness: 0.038,
      duration: 18,
      phase: 0.58,
      yaw: -18,
      pitch: 32,
      material: 3,
      motion: 1,
    },
  },
  {
    name: "Enamel Still Study",
    seed: 5405,
    params: {
      family: 0,
      thickness: 0.098,
      duration: 28,
      phase: 0.67,
      yaw: -65,
      pitch: 12,
      material: 4,
      motion: 0,
    },
  },
  {
    name: "Foil Ribbon Eclipse",
    seed: 5406,
    params: {
      family: 3,
      thickness: 0.078,
      duration: 12,
      phase: 0.86,
      yaw: 70,
      pitch: -42,
      material: 5,
      motion: 1,
    },
  },
];

const fragment = `
const float TAU_MELT = 6.28318530718;
const int MELT_SEGMENTS = 80;

vec3 meltCurve(float t, int family, float strand, float cycle) {
  float breath = sin(cycle);
  float tide = cos(cycle);
  vec3 p;
  if (family == 0) {
    // The (2,3) torus-knot parameterization, with periodic sculptural strain.
    float r = .70 + (.23 + .045 * breath) * cos(3.0 * t);
    p = vec3(r * cos(2.0 * t), r * sin(2.0 * t), (.28 + .085 * tide) * sin(3.0 * t));
  } else if (family == 1) {
    // Standard trigonometric figure-eight knot, scaled into the same display volume.
    float r = .60 + .30 * cos(2.0 * t);
    p = vec3(r * cos(3.0 * t), r * sin(3.0 * t), (.27 + .08 * breath) * sin(4.0 * t));
  } else if (family == 2) {
    float r = .82 + .065 * cos(3.0 * t + cycle);
    p = vec3(r * cos(t), r * sin(t), .12 * sin(2.0 * t + cycle));
  } else {
    // Two distinct closed strands wound three times around a toroidal core.
    float a = 3.0 * t + strand * 3.14159265359 + cycle;
    float r = .73 + (.17 + .035 * breath) * cos(a);
    p = vec3(r * cos(t), r * sin(t), (.21 + .03 * tide) * sin(a));
  }
  p.x *= 1.0 + .105 * breath;
  p.y *= 1.0 + .105 * tide;
  return p;
}

vec3 meltRibbonAxis(float t, int family, float strand, float cycle) {
  vec3 radial = vec3(cos(t), sin(t), 0.0);
  // Half twist closes the Möbius surface with its two edges exchanged.
  float twist = family == 2 ? .5 * t + cycle : 3.0 * t + strand * 3.14159265359 + cycle;
  return normalize(radial * cos(twist) + vec3(0.0, 0.0, sin(twist)));
}

mat3 meltCamera(float yaw, float pitch) {
  float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
  mat3 aroundZ = mat3(cy, sy, 0.0, -sy, cy, 0.0, 0.0, 0.0, 1.0);
  mat3 tiltX = mat3(1.0, 0.0, 0.0, 0.0, cp, sp, 0.0, -sp, cp);
  return tiltX * aroundZ;
}

vec2 meltProject(vec3 p) {
  return p.xy * (1.78 / (4.1 - p.z));
}

vec3 meltShade(vec3 normal, vec3 position, float along, float strand, float cycle) {
  vec3 n = normal * inversesqrt(max(dot(normal, normal), .00000001));
  if (n.z < 0.0) n = -n;
  vec3 light = normalize(vec3(-.55, .7, 1.1));
  vec3 view = normalize(vec3(-position.xy, 4.1 - position.z));
  vec3 halfVector = normalize(light + view);
  float diffuse = max(dot(n, light), 0.0);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  float m = floor(u_params[6] + .5);
  float hue = .38 + .22 * sin(along * 2.0 + cycle) + strand * .2;
  vec3 base = palette(clamp(hue, 0.0, 1.0));
  vec3 color;
  if (m < .5) {
    base = mix(base, vec3(.88, .86, .81), .58);
    float specular = pow(max(dot(n, halfVector), 0.0), 48.0);
    color = base * (.24 + .66 * diffuse) + vec3(.5) * specular;
  } else if (m < 1.5) {
    float brushed = .7 + .3 * pow(.5 + .5 * sin(along * 12.0), 2.0);
    float specular = pow(max(dot(n, halfVector), 0.0), 92.0) * brushed;
    float band = pow(max(0.0, 1.0 - abs(n.y + .2)), 18.0);
    color = base * (.14 + .42 * diffuse + .5 * band) + mix(base, vec3(1.0), .45) * specular;
  } else if (m < 2.5) {
    vec3 pearl = palette(.5 + .45 * sin(dot(n, view) * 8.0 + along + cycle));
    color = mix(base, pearl, .6) * (.28 + .65 * diffuse) + vec3(.62) * pow(max(dot(n, halfVector), 0.0), 65.0) + pearl * rim * .2;
  } else if (m < 3.5) {
    color = base * (.17 + .66 * diffuse) + mix(base, u_accent, .4) * rim * .65;
  } else if (m < 4.5) {
    color = base * (.18 + .64 * diffuse) + vec3(.85) * pow(max(dot(n, halfVector), 0.0), 120.0);
  } else {
    float band = pow(.5 + .5 * cos(n.y * 10.0 + n.x * 5.0), 6.0);
    color = base * (.12 + .35 * diffuse + .65 * band) + u_accent * rim * .35 + vec3(.7) * pow(max(dot(n, halfVector), 0.0), 160.0);
  }
  return clamp(color, 0.0, 1.0);
}

void meltTube(vec2 uv, vec3 a, vec3 b, float radius, float along, float cycle,
              inout float depth, inout vec3 surface, inout float coverage) {
  vec2 pa = meltProject(a), pb = meltProject(b);
  vec2 ab = pb - pa;
  float h = clamp(dot(uv - pa, ab) / max(dot(ab, ab), .000001), 0.0, 1.0);
  vec3 center = mix(a, b, h);
  float projectedRadius = radius * 1.78 / (4.1 - center.z);
  vec2 delta = uv - mix(pa, pb, h);
  float distanceToAxis = length(delta);
  float aa = 1.5 / u_resolution.y;
  if (distanceToAxis > projectedRadius + aa) return;
  float radial = min(distanceToAxis / projectedRadius, 1.0);
  float front = sqrt(max(0.0, 1.0 - radial * radial));
  float z = center.z + radius * front;
  if (z < depth) return;
  vec3 tangent = normalize(b - a);
  vec3 n = vec3(delta / projectedRadius, front);
  n -= tangent * dot(n, tangent);
  n *= inversesqrt(max(dot(n, n), .00000001));
  depth = z;
  coverage = 1.0 - smoothstep(projectedRadius - aa, projectedRadius + aa, distanceToAxis);
  surface = meltShade(n, center + radius * n, along, 0.0, cycle);
}

void meltTriangle(vec2 uv, vec3 a, vec3 b, vec3 c, float along, float strand, float cycle,
                  inout float depth, inout vec3 surface, inout float coverage) {
  vec2 pa = meltProject(a), pb = meltProject(b), pc = meltProject(c);
  vec2 e0 = pb - pa, e1 = pc - pa, q = uv - pa;
  float determinant = e0.x * e1.y - e0.y * e1.x;
  if (abs(determinant) < .0000001) return;
  vec3 bary;
  bary.y = (q.x * e1.y - q.y * e1.x) / determinant;
  bary.z = (e0.x * q.y - e0.y * q.x) / determinant;
  bary.x = 1.0 - bary.y - bary.z;
  if (min(bary.x, min(bary.y, bary.z)) < 0.0) return;
  // Perspective-correct interpolation keeps crossing ribbons depth-ordered.
  bary /= vec3(4.1 - a.z, 4.1 - b.z, 4.1 - c.z);
  bary /= bary.x + bary.y + bary.z;
  vec3 p = a * bary.x + b * bary.y + c * bary.z;
  if (p.z < depth) return;
  depth = p.z;
  coverage = 1.0;
  surface = meltShade(cross(b - a, c - a), p, along, strand, cycle);
}

void main() {
  vec2 uv = aspectUV();
  float cycle = TAU_MELT * fract(u_params[3] + floor(u_params[7] + .5) * u_time / max(u_params[2], 4.0));
  int family = int(floor(u_params[0] + .5));
  float thickness = u_params[1];
  mat3 camera = meltCamera(radians(u_params[4]), radians(u_params[5]));
  float vignette = exp(-1.4 * dot(uv, uv));
  vec3 background = mix(u_secondary * .018, u_primary * .047, vignette);
  // A subtle central plinth of light gives the sculpture a stable visual anchor.
  background += u_secondary * .025 * exp(-28.0 * dot(uv - vec2(0.0, -.32), uv - vec2(0.0, -.32)));
  vec3 surface = background;
  float depth = -10.0, coverage = 0.0;
  if (abs(uv.x) < .68 && abs(uv.y) < .68) {
    for (int strandIndex = 0; strandIndex < 2; strandIndex++) {
      if (strandIndex == 1 && family != 3) break;
      float strand = float(strandIndex);
      vec3 a = camera * meltCurve(0.0, family, strand, cycle);
      vec3 axisA = camera * meltRibbonAxis(0.0, family, strand, cycle);
      for (int i = 0; i < MELT_SEGMENTS; i++) {
        float t0 = TAU_MELT * float(i) / float(MELT_SEGMENTS);
        float t1 = TAU_MELT * float(i + 1) / float(MELT_SEGMENTS);
        vec3 b = camera * meltCurve(t1, family, strand, cycle);
        if (family < 2) {
          meltTube(uv, a, b, thickness, .5 * (t0 + t1), cycle, depth, surface, coverage);
        } else {
          vec3 axisB = camera * meltRibbonAxis(t1, family, strand, cycle);
          float width = family == 2 ? .065 + 1.25 * thickness : .024 + .58 * thickness;
          vec3 a0 = a - axisA * width, a1 = a + axisA * width;
          vec3 b0 = b - axisB * width, b1 = b + axisB * width;
          meltTriangle(uv, a0, b0, b1, .5 * (t0 + t1), strand, cycle, depth, surface, coverage);
          meltTriangle(uv, a0, b1, a1, .5 * (t0 + t1), strand, cycle, depth, surface, coverage);
          axisA = axisB;
        }
        a = b;
      }
    }
  }
  outColor = vec4(clamp(mix(background, surface, coverage), 0.0, 1.0), 1.0);
}
`;

export default {
  id: "melt",
  number: 54,
  name: "Topological Melt",
  // Keep ribbon rasterization within the live-show GPU budget, independent of output.
  maxRenderWidth: 960,
  description:
    "Trefoil and figure-eight tubes, a Möbius band, and woven torus ribbons. Periodic parametric sculptures with six opaque artistic materials. Artistic morphs may cross; topology preservation is not promised.",
  schema,
  presets,
  fragment,
  families: [
    "Trefoil tube",
    "Figure-eight tube",
    "Möbius ribbon",
    "Woven torus ribbons",
  ],
  materials: [
    "Porcelain ceramic",
    "Brushed metal",
    "Pearlescent lacquer",
    "Velvet",
    "Gloss enamel",
    "Reflective foil",
  ],
  loopSemantics: {
    durationKey: "duration",
    phaseKey: "phase",
    staticKey: "motion",
    phaseUnit: "cycles",
    staticValue: 0,
    loopValue: 1,
    coordinate: "phase + motion * elapsedSeconds / duration",
    endpointTolerance:
      "Analytically identical positions and time tangents at phase 0 and 1; floating-point rendering tolerance applies.",
    sampling:
      "80 closed parametric segments per strand, at most two strands; ruled ribbons and projected tube capsules.",
    topology:
      "Artistic topology-changing presentation: self-crossing or tube overlap may occur; no preservation claim.",
    audio:
      "Audio does not alter this deterministic loop; palette and cue changes must be held constant for seamless recording.",
  },
};
