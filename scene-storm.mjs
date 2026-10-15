import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";
import { stormData } from "./scene-storm-data.mjs";

const schema = [
  {
    key: "development",
    label: "Development · haze / towers / supercell",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "motion",
    label: "Storm motion",
    min: 0.2,
    max: 1.6,
    step: 0.01,
    default: 0.7,
  },
  {
    key: "height",
    label: "Cloud height",
    min: 0.7,
    max: 1.2,
    step: 0.01,
    default: 1,
  },
  {
    key: "density",
    label: "Cloud depth",
    min: 0.5,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "branches",
    label: "Leader branching",
    min: 0.2,
    max: 1,
    step: 0.01,
    default: 0.85,
  },
  {
    key: "eye",
    label: "Storm overlook",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "drift",
    label: "Overlook drift",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "rain",
    label: "Rain curtains",
    min: 0.1,
    max: 1,
    step: 0.01,
    default: 0.7,
  },
];
const base = {
  motion: 0.7,
  height: 1,
  density: 1,
  branches: 0.85,
  eye: 0.45,
  drift: 0.45,
  rain: 0.7,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Haze", 10701, 0),
  look("Towers", 10701, 1),
  look("Supercell", 10701, 2),
  look("Heat Lantern", 10702, 0.25, {
    height: 0.75,
    eye: 0.8,
    motion: 0.35,
    density: 0.75,
  }),
  look("Anvil Choir", 10703, 1.2, {
    height: 1.15,
    density: 1.3,
    branches: 1,
    eye: 0.2,
  }),
  look("Silent Shelf", 10704, 0.8, {
    height: 0.7,
    density: 1.35,
    rain: 0.2,
    drift: 0.2,
  }),
  look("Ground Current", 10705, 2, {
    branches: 1,
    rain: 0.4,
    eye: 0.1,
    motion: 0.9,
  }),
  look("Midnight Rotation", 10706, 1.8, {
    density: 1.1,
    rain: 1,
    drift: 0.8,
    eye: 0.9,
  }),
];

const common = `${lateClockGlsl}\n${stormData}`;
const fragment = `${common}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec4 stData(int i, int row) {
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed, ivec2(i, row), 0);
#else
  return stDatum(i, row);
#endif
}
vec4 stHash4(vec4 n) {
  n = fract(n * 0.1031); n *= n + 33.33; n *= n + n;
  return fract(n);
}
vec4 stNoise(vec3 p) {
  vec3 cell = floor(p), raw = fract(p);
  vec3 df = 6.0 * raw * (1.0 - raw), f = raw * raw * (3.0 - 2.0 * raw);
  vec3 base = cell + float(u_seedBits % 117u) * 0.17;
  vec4 n = vec4(dot(base, vec3(1,57,113))) + vec4(0,1,57,58);
  vec4 a = stHash4(n), b = stHash4(n + 113.0);
  vec4 c = mix(a, b, f.z);
  float value = mix(mix(c.x, c.y, f.x), mix(c.z, c.w, f.x), f.y);
  vec4 dz = b - a;
  vec3 grad = vec3(mix(c.y-c.x,c.w-c.z,f.y),mix(c.z-c.x,c.w-c.y,f.x),mix(mix(dz.x,dz.y,f.x),mix(dz.z,dz.w,f.x),f.y)) * df;
  return vec4(value,grad);
}
// Maximal five-cell skeleton. Centres and lobe identities persist while the
// same bank rises; the anvil and wall cloud grow out of that carrier.
vec3 stCentres[5], stInverse[5];
float stScale[5];
mat2 stRotation;
void stCloudSetup() {
  vec3 centres[5]; vec3 radii[5];
  centres[0] = vec3(0, mix(2.8,5.4,stRise), 4.0);
  radii[0] = mix(vec3(5.8,1.0,2.5), mix(vec3(2.7,3.4,2.8),vec3(4.0,2.55,3.3),stSuper), stRise);
  centres[1] = vec3(-2.8, mix(2.7,4.6,stRise), 4.5);
  radii[1] = mix(vec3(2.7,0.8,1.8), vec3(2.1,2.6,2.0), stRise);
  centres[2] = vec3(2.6, mix(2.9,5.5,stRise), 4.6);
  radii[2] = mix(vec3(2.6,0.8,1.8), vec3(2.25,2.8,2.2), stRise);
  centres[3] = vec3(-0.55, mix(3.3,7.4,stRise), 4.1);
  radii[3] = vec3(mix(2.0,6.2,stSuper), mix(0.4,1.35,stRise), mix(1.0,3.8,stSuper));
  centres[4] = vec3(0.0, mix(2.5,2.8,stSuper), 3.2);
  radii[4] = vec3(mix(0.4,2.6,stSuper), mix(0.3,1.35,stSuper), mix(0.4,2.1,stSuper));
  for (int j = 0; j < 5; ++j) {
    stCentres[j] = centres[j]; stInverse[j] = 1.0/radii[j];
    stScale[j] = 0.5*min(radii[j].x,radii[j].y);
  }
  stRotation = rot2(stPhase);
}
float stShape(vec3 p, out vec3 normal) {
  p.y /= u_params[2];
  float field = -100.0; normal = vec3(0,1,0);
  for (int j = 0; j < 5; ++j) {
    vec3 q = (p-stCentres[j])*stInverse[j];
    float v = (1.0-dot(q,q))*stScale[j];
    float blend = clamp(0.5 + 0.5 * (v - field) / 0.65,0.0,1.0);
    field = mix(field,v,blend) + 0.65 * blend * (1.0 - blend);
    normal = mix(normal,q*stInverse[j] + vec3(0,0.0001,0),blend);
  }
  normal = normalize(normal);
  return field;
}
float stSegmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 v = b - a;
  return length(p - a - v * clamp(dot(p - a, v) / max(dot(v,v), 1e-10), 0.0, 1.0));
}
float stDischarge(int network) {
  float wave = 0.5 + 0.5 * sin(stPhase * 6.0 + float(network) * 2.9);
  float selected = abs(mod(u_rhythmCount.x,2.0)-float(network)) < 0.5 ? 1.0 : 0.0;
  return pow(wave, 14.0) * 0.72 + selected * (0.34 * u_kick + 0.8 * u_rhythm.x) + 0.25*u_rhythm.z;
}
void main() {
  stSetup(); stCloudSetup();
  float shortSide = min(u_resolution.x, u_resolution.y);
  vec2 screen = (v_uv - 0.5) * u_resolution / shortSide * 2.0;
  float framing = mix(0.74,1.0,smoothstep(0.9,1.6,u_resolution.x/u_resolution.y));
  float focal = 2.35 * framing * (1.0 + 0.02 * u_kick);
  vec2 view = screen / focal;
  vec3 rd = normalize(stF + stR * view.x + stU * view.y);
  float pixel = 2.0 / (shortSide * focal);
  vec3 moonDir = normalize(vec3(-0.38,0.16,1.0));
  float moonDist = length(rd - moonDir);
  vec2 moonUV = vec2(dot(rd-moonDir,normalize(cross(moonDir,vec3(0,1,0)))),rd.y-moonDir.y) / 0.023;
  float moonZ = sqrt(max(0.0,1.0-dot(moonUV,moonUV)));
  float moonShade = max(0.0,dot(vec3(moonUV,moonZ),normalize(vec3(-0.6,0.3,0.8))));
  vec3 col = u_secondary * (0.006 + 0.024 * exp(-sq((rd.y + 0.06) / 0.15)));
  col += mix(u_secondary,vec3(1),0.72) * (0.026 * exp(-moonDist * 9.0) + 1.1 * moonShade * (1.0 - smoothstep(0.022,0.024,moonDist)));
  // A far shelf at a different depth extends the weather beyond the hero.
  // Analytic optical depth, no second raymarch or screen-space texture.
  float farPlane = (35.0-stEye.z) / max(rd.z,0.1);
  vec3 farPoint = stEye + rd * farPlane;
  float bankNoise = stNoise(vec3(farPoint.x*0.3,farPoint.y*0.6,1.0)).x;
  float bankHeight = 1.4 + 0.45 * sin(farPoint.x*0.19);
  float farBank = exp(-sq((farPoint.y-bankHeight)/(0.45+0.6*bankNoise))) * exp(-sq(farPoint.x/45.0));
  col += mix(u_secondary,vec3(1),0.12) * farBank * 0.055;

  // Distant terrain and rain-lit basin give scale without competing with sky.
  float land = -0.12 + 0.012 * sin(rd.x * 45.0) + 0.008 * sin(rd.x * 103.0);
  float terrain = 1.0 - smoothstep(land - pixel, land + pixel, rd.y);
  col = mix(col,u_secondary * 0.009,terrain);
  float ridge = -0.32 + 0.045 * sin(rd.x * 9.0 + 1.2) + 0.016 * sin(rd.x * 27.0);
  float foreground = 1.0 - smoothstep(ridge-pixel,ridge+pixel,rd.y);
  col *= 1.0 - 0.88 * foreground;
  float groundT = -stEye.y / min(rd.y, -0.0001);
  vec3 ground = stEye + rd * groundT;
  if (rd.y < -0.001) {
    float basin = exp(-sq(ground.x / 18.0) - sq((ground.z - 5.0) / 23.0));
    float ridges = 0.6 + 0.4 * sin(ground.x * 0.35 + sin(ground.z * 0.4) * 1.5);
    col += mix(u_secondary,u_primary,0.1) * 0.028 * basin * ridges * (1.0-foreground);
    for (int net = 0; net < 2; ++net) {
      vec3 impact = stWorld(stLeader(net,18),net);
      vec2 q = ground.xz - impact.xz;
      float wet = exp(-dot(q,q) * 0.25) * stSuper * stDischarge(net);
      col += mix(u_primary,vec3(1),0.25) * wet * 0.2;
    }
  }
  // Analytic slab bound: at most 14 samples, no unbounded / nested march.
  vec3 lo = vec3(-8.0,0.6,0.0), hi = vec3(8.0,10.0 * u_params[2],8.5);
  vec3 inv = sign(rd + vec3(1e-8)) / max(abs(rd),vec3(1e-6));
  vec3 nearP = (lo - stEye) * inv, farP = (hi - stEye) * inv;
  vec3 n = min(nearP,farP), f = max(nearP,farP);
  float nearT = max(0.0,max(n.x,max(n.y,n.z))), farT = min(f.x,min(f.y,f.z));
  float trans = 1.0; vec3 cloud = vec3(0);
  float flash0 = stDischarge(0), flash1 = stDischarge(1);
  vec3 source0 = stWorld(vec3(0,0.15,0),0), source1 = stWorld(vec3(0,0.1,0),1);
  if (farT > nearT) {
    float ds = (farT - nearT) / 14.0;
    for (int j = 0; j < 14; ++j) {
      vec3 p = stEye + rd * (nearT + (float(j) + 0.5) * ds);
      vec3 normal; float shape = stShape(p,normal);
      if (shape < -0.75) continue;
      vec3 adv = p * 1.05 + vec3(0.4 * sin(stPhase),0.14 * cos(stPhase),0.25 * cos(stPhase));
      // A rotating material chart in the mesocyclone, not a rotating camera.
      float twist = stSuper * p.y * 0.12;
      adv.xz = stRotation * vec2(adv.x + twist*adv.z,adv.z-twist*adv.x) * inversesqrt(1.0+twist*twist);
      vec4 coarse = stNoise(adv), fine = stNoise(adv * 2.7);
      float noise = coarse.x * 0.72 + fine.x * 0.28;
      float radius = length(p.xz - vec2(0,3.5));
      float angle = atan(p.z-3.5,p.x+0.00001);
      float shelfPhase = radius * 2.0 + p.y * 6.0 + 2.0*angle - stPhase * 2.0;
      float shelf = sin(shelfPhase) * smoothstep(0.4,1.2,radius);
      float wall = 1.0-smoothstep(4.0,6.0,p.y);
      noise += 0.32 * stSuper * shelf * wall;
      vec3 bump = coarse.yzw * 0.72 + fine.yzw * 0.65;
      normal = normalize(normal - bump * 0.75 + vec3(0,0.7*stSuper*cos(shelfPhase)*wall,0));
      float density = max(0.0,shape + (noise - 0.52) * 1.15) * u_params[3];
      if (density <= 0.0) continue;
      float alpha = 1.0 - exp(-density * ds * 1.65);
      float key = max(0.0,dot(normal,normalize(vec3(-0.65,0.75,-0.55))));
      float rim = pow(1.0 - abs(dot(normal,rd)),3.0);
      float cavity = exp(-density * 0.8);
      vec3 light = mix(u_secondary,u_primary,0.18) * (0.045 + 0.72 * key * cavity + 0.32 * rim * cavity);
      vec3 q0 = p - source0, q1 = p - source1;
      float inside = flash0 * exp(-dot(q0,q0) * 0.42) + flash1 * exp(-dot(q1,q1) * 0.5);
      light += mix(u_primary,vec3(1),0.36) * inside * 6.5;
      // A local branch-corona pulse walks only around the charged cell.
      float halo = exp(-sq((length(q0) - (0.4 + 2.4 * u_rhythm.y)) / 0.5));
      light += u_accent * halo * u_rhythm.y * 0.14;
      cloud += trans * alpha * light;
      trans *= 1.0 - alpha;
      if (trans < 0.012) break;
    }
  }
  col = col * trans + cloud;
  // Finite rain curtains below the carrier: smooth filaments, advected with
  // integer-period harmonics. Energy increases filament detail, not exposure.
  if (rd.y < 0.15 && stRise > 0.0) {
    float t = (4.0 - stEye.z) / max(rd.z,0.01);
    vec3 p = stEye + rd * t;
    float curtains = exp(-sq((p.x + 2.5 + p.y * 0.12) / 0.85)) + exp(-sq((p.x - 2.4 + p.y * 0.12) / 1.1));
    float vertical = smoothstep(-0.1,0.6,p.y) * (1.0 - smoothstep(2.5,4.2,p.y));
    float filaments = 0.52 + 0.25 * sin(p.x * 29.0 + p.y * 1.7 + stPhase * 4.0 + 1.5*sin(p.x*4.0)) + 0.15 * sin(p.x * 61.0 + p.y * 3.0 - stPhase * 6.0);
    curtains *= 0.6 + 0.4 * sin(p.x * 5.0 + p.y * 0.3);
    float litRain = 0.6 + 0.6 * (flash0 + flash1);
    col += mix(u_secondary,u_primary,0.2) * curtains * vertical * u_params[7] * stRise * (0.08 + 0.13 * stSuper) * mix(0.5,filaments,u_level) * litRain;
  }
  uvec4 mask = uvec4(65535u);
#ifdef PRECOMPUTED
  if (shortSide >= 240.0 && all(lessThan(abs(view),vec2(2))))
    mask = uvec4(texelFetch(u_precomputed,ivec2(floor((view + 2.0) * 8.0)) + ivec2(0,3),0));
#endif
  if (stRise > 0.001) for (int i = 0; i < 60; ++i) {
    uint bits = i < 16 ? mask.x : i < 32 ? mask.y : i < 48 ? mask.z : mask.w;
    if ((bits & (1u << uint(i % 16))) == 0u) continue;
    vec4 endpoints = stData(i,0);
    float d = stSegmentDistance(view,endpoints.xy,endpoints.zw);
    float width = max(pixel * 0.8,0.0007);
    if (d > width * 7.0) continue;
    vec4 a = stData(i,1);
    float branch = (i % 30) < 18 ? 1.0 : u_params[4] * (0.5 + 0.5 * u_level);
    float flash = i < 30 ? flash0 : flash1;
    float local = float(i % 30);
    float rank = local < 18.0 ? local / 18.0 : (4.0 + floor((local-18.0)/4.0)*4.0 + mod(local-18.0,4.0)) / 18.0;
    float returnStroke = exp(-sq((rank - (1.0-u_rhythm.z) * 1.3) / 0.15)) * u_rhythm.z;
    float leader = 1.0 + 2.0 * returnStroke;
    float core = exp(-sq(d / width));
    float glow = exp(-sq(d / (width * 3.3)));
    float buried = mix(0.28,0.8,stSuper);
    vec3 ink = mix(u_primary,vec3(1),0.65);
    col += ink * (core * 2.4 + glow * 0.3) * a.w * branch * flash * stRise * buried * leader;
  }
  outColor = vec4(max(col,vec3(0)),1.0);
}
`;

export default {
  id: "storm",
  number: 107,
  name: "Thunderhead",
  description:
    "A distant bank of heat lightning rises into towering cumulonimbus and a rotating supercell. Seeded branching leaders illuminate the clouds from within.",
  development: "development",
  schema,
  presets,
  fragment,
  precompute: {
    size: [64, 35],
    fragment: `${common}
void main() {
  stSetup();
  int x = int(gl_FragCoord.x), row = int(gl_FragCoord.y);
  if (row < 3) { outColor = stDatum(x,row); return; }
  if (x >= 32) { outColor = vec4(0); return; }
  vec2 lo = vec2(float(x),float(row - 3)) / 8.0 - 2.0, hi = lo + 0.125;
  uvec4 bits = uvec4(0u);
  for (int i = 0; i < 60; ++i) {
    vec4 p = stDatum(i,0);
    vec2 a = min(p.xy,p.zw) - 0.035, b = max(p.xy,p.zw) + 0.035;
    if (all(greaterThanEqual(b,lo)) && all(lessThanEqual(a,hi))) {
      if (i < 16) bits.x |= 1u << uint(i); else if (i < 32) bits.y |= 1u << uint(i-16);
      else if (i < 48) bits.z |= 1u << uint(i-32); else bits.w |= 1u << uint(i-48);
    }
  }
  outColor = vec4(bits);
}`,
  },
  stage: ["height", "branches", "rain"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { motion: { mul: [0.75, 1.35] }, drift: { mul: [0.8, 1.3] } },
  beat: { punch: 0.12, pulse: 0.08 },
  clocks: [
    { rate: (p) => p[1] * 0.16, period: 2 * Math.PI },
    { rate: (p) => p[6] * 0.035, period: 2 * Math.PI },
  ],
  rhythm: [
    familyEffect(
      "buried-discharge",
      0,
      "Buried discharge",
      "A bounded discharge lights the interior of the same charged cloud.",
      { period: 4, strength: 0.6, duration: 1.2 },
    ),
    familyEffect(
      "branch-corona",
      1,
      "Branch corona",
      "A small ionisation glow expands around a persistent leader root.",
      { period: 8, strength: 0.6, duration: 2 },
    ),
    familyEffect(
      "stepped-return",
      2,
      "Stepped return",
      "A return stroke traces the existing connected leader tree.",
      { period: 16, strength: 0.65, duration: 2.5 },
    ),
  ],
};
