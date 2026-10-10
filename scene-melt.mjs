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
#define TAU_MELT TAU
const int MELT_SEGMENTS = 80;
uniform highp sampler2D u_geometry;
vec3 meltPoint(int point,int row) { return texelFetch(u_geometry,ivec2(point,row),0).xyz; }



vec3 meltShade(vec3 normal, vec3 position, float along, float strand, float cycle) {
  vec3 n = normal * inversesqrt(max(dot(normal, normal), .00000001));
  if (n.z < 0.0) n = -n;
  vec3 light = normalize(vec3(-.55, .7, 1.1));
  vec3 view = normalize(vec3(-position.xy, 4.1 - position.z));
  vec3 halfVector = normalize(light + view);
  float diffuse = max(dot(n, light), 0.0);
  float rim = pow(max(1.0 - max(dot(n, view), 0.0), 0.0), 3.0);
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

void meltTube(vec2 uv, vec3 a, vec3 b, vec2 pa, vec2 pb, float radius, float along,
              inout float depth, inout vec3 normal, inout vec3 position,
              inout vec2 material, inout float coverage) {
  vec2 ab = pb - pa;
  float h = clamp(dot(uv - pa, ab) / max(dot(ab, ab), .000001), 0.0, 1.0);
  vec3 center = mix(a, b, h);
  float projectedRadius = radius * 1.78 / (4.1 - center.z);
  vec2 delta = uv - mix(pa, pb, h);
  float distanceToAxis = length(delta), aa = 1.5 / u_resolution.y;
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
  normal = n; position = center + radius * n; material = vec2(along,0.);
}

void meltTriangle(vec2 uv, vec3 a, vec3 b, vec3 c, vec2 pa, vec2 pb, vec2 pc, float along, float strand, bool second,
                  inout float depth, inout vec3 normal, inout vec3 position,
                  inout vec2 material, inout float coverage) {
  vec2 e0 = pb - pa, e1 = pc - pa, q = uv - pa;
  float determinant = e0.x * e1.y - e0.y * e1.x;
  if (abs(determinant) < .0000001) return;
  vec3 bary;
  bary.y = (q.x * e1.y - q.y * e1.x) / determinant;
  bary.z = (e0.x * q.y - e0.y * q.x) / determinant;
  bary.x = 1.0 - bary.y - bary.z;
  if (min(bary.x, min(bary.y, bary.z)) < 0.0) return;
  // AA only the two physical ribbon edges, never the internal diagonal.
  float edge = second ? 1. - 2.*bary.x : 2.*bary.z - 1.;
  float gradient = second ? length(e0-e1) : length(e0);
  float aa = max(.000001, 3.*gradient/(abs(determinant)*u_resolution.y));
  float edgeCoverage = smoothstep(0.,aa,1.-abs(edge));
  bary /= vec3(4.1-a.z,4.1-b.z,4.1-c.z);
  bary /= bary.x+bary.y+bary.z;
  vec3 p = a*bary.x+b*bary.y+c*bary.z;
  if (p.z < depth) return;
  depth=p.z; coverage=edgeCoverage;
  normal=cross(b-a,c-a); position=p; material=vec2(along,strand);
}

void main() {
  vec2 uv = aspectUV();
  float cycle = TAU_MELT * fract(u_params[3] + floor(u_params[7] + .5) * u_time / max(u_params[2], 4.0));
  int family = int(floor(u_params[0] + .5));
  float thickness = u_params[1];
  // CPU computes the camera-space geometry once per visual frame.
  float vignette = exp(-1.4 * dot(uv, uv));
  vec3 background = mix(u_secondary * .018, u_primary * .047, vignette);
  // A subtle central plinth of light gives the sculpture a stable visual anchor.
  background += u_secondary * .025 * exp(-28.0 * dot(uv - vec2(0.0, -.32), uv - vec2(0.0, -.32)));
  vec3 normal=vec3(0.,0.,1.), position=vec3(0.);
  vec2 material=vec2(0.);
  float depth=-10., coverage=0.;
  if (abs(uv.x)<.68 && abs(uv.y)<.68) {
    for (int strandIndex=0; strandIndex<2; strandIndex++) {
      if (strandIndex==1 && family!=3) break;
      float strand=float(strandIndex);
      int offset=strandIndex*81;
      vec3 a=meltPoint(offset,family<2?0:2);
      vec2 pa=meltPoint(offset,family<2?1:4).xy;
      vec3 a1=family<2?vec3(0.):meltPoint(offset,3);
      vec2 pa1=family<2?vec2(0.):meltPoint(offset,5).xy;
      for (int i=0; i<MELT_SEGMENTS; i++) {
        float along=TAU_MELT*(float(i)+.5)/float(MELT_SEGMENTS);
        int point=offset+i+1;
        vec3 b=meltPoint(point,family<2?0:2);
        vec2 pb=meltPoint(point,family<2?1:4).xy;
        if (family<2) {
          meltTube(uv,a,b,pa,pb,thickness,along,depth,normal,position,material,coverage);
        } else {
          vec3 b1=meltPoint(point,3);
          vec2 pb1=meltPoint(point,5).xy;
          meltTriangle(uv,a,b,b1,pa,pb,pb1,along,strand,false,depth,normal,position,material,coverage);
          meltTriangle(uv,a,b1,a1,pa,pb1,pa1,along,strand,true,depth,normal,position,material,coverage);
          a1=b1;pa1=pb1;
        }
        a=b;
        pa=pb;
      }
    }
  }
  vec3 surface=coverage>0. ? meltShade(normal,position,material.x,material.y,cycle) : background;
  outColor=vec4(clamp(mix(background,surface,coverage),0.,1.),1.);
}
`;

export default {
  id: "melt",
  // Contract v3 performance metadata; see scene-acid.mjs. Shorter loops
  // move faster.
  energy: { duration: { mul: [2, 0.35] } },
  beat: { punch: 1, pulse: 0.8 },
  stage: ["duration", "thickness", "yaw"],
  type: { key: "family", values: [0, 1, 2, 3] },
  number: 54,
  name: "Topological Melt",
  // Keep ribbon rasterization within the live-show GPU budget, independent of output.
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
