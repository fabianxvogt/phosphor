import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";
import { stormData } from "./scene-storm-data.mjs";
import { stormVolume } from "./scene-storm-volume.mjs";

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
${stormVolume}
float stSegmentDistanceSq(vec2 p, vec2 a, vec2 b) {
  vec2 v = b-a;
  vec2 q = p-a-v*clamp(dot(p-a,v)/max(dot(v,v),1e-10),0.0,1.0);
  return dot(q,q);
}
float stSegmentDistance(vec2 p, vec2 a, vec2 b) {
  return sqrt(stSegmentDistanceSq(p,a,b));
}
float stBoltDistance(vec2 p, vec2 a, vec2 b, int edge) {
  vec2 v = b-a;
  vec2 normal = vec2(-v.y,v.x)/max(length(v),0.0001);
  float kink = min(length(v)*0.16,0.0018);
  vec2 c = mix(a,b,0.33)+normal*kink*(stRand(edge/30,edge+410)*2.0-1.0);
  vec2 d = mix(a,b,0.68)+normal*kink*(stRand(edge/30,edge+470)*2.0-1.0);
  return sqrt(min(stSegmentDistanceSq(p,a,c),min(stSegmentDistanceSq(p,c,d),stSegmentDistanceSq(p,d,b))));
}
float stDischarge(int network) {
  float wave = 0.5 + 0.5 * sin(stPhase * 6.0 + float(network) * 2.9);
  float selected = abs(mod(u_rhythmCount.x,2.0)-float(network)) < 0.5 ? 1.0 : 0.0;
  float flicker = 0.55+0.45*sq(sin(stPhase*144.0+float(network)*4.0));
  return (pow(wave,40.0)*0.9+selected*(0.22*u_kick+0.9*u_rhythm.x)+0.18*u_rhythm.z)*flicker;
}
void main() {
  stSetup(); stCloudSetup();
  float shortSide = min(u_resolution.x, u_resolution.y);
  vec2 screen = (v_uv - 0.5) * u_resolution / shortSide * 2.0;
  float framing = mix(1.05,1.0,smoothstep(0.9,1.6,u_resolution.x/u_resolution.y));
  float focal = 1.65 * framing * (1.0 + 0.02 * u_kick);
  vec2 view = screen / focal;
  vec3 rd = normalize(stF + stR * view.x + stU * view.y);
  float pixel = 2.0 / (shortSide * focal);
  vec3 moonDir = normalize(vec3(-0.72,0.56,1.0));
  float moonDist = length(rd - moonDir);
  vec2 moonUV = vec2(dot(rd-moonDir,normalize(cross(moonDir,vec3(0,1,0)))),rd.y-moonDir.y) / 0.023;
  float moonZ = sqrt(max(0.0,1.0-dot(moonUV,moonUV)));
  float moonShade = max(0.0,dot(vec3(moonUV,moonZ),normalize(vec3(-0.6,0.3,0.8))));
  vec3 col = u_secondary * (0.006 + 0.024 * exp(-sq((rd.y + 0.06) / 0.15)));
  col += mix(u_secondary,vec3(1),0.72) * (0.04 * exp(-moonDist * 9.0) + 0.8 * moonShade * (1.0 - smoothstep(0.022,0.024,moonDist)));
  // A far shelf at a different depth extends the weather beyond the hero.
  // Analytic optical depth, no second raymarch or screen-space texture.
  float farPlane = (35.0-stEye.z) / max(rd.z,0.1);
  vec3 farPoint = stEye + rd * farPlane;
  float bankNoise = stNoise(vec3(farPoint.x*0.3,farPoint.y*0.6,1.0)).x;
  float bankHeight = 1.4 + 0.45 * sin(farPoint.x*0.19);
  float farBank = exp(-sq((farPoint.y-bankHeight)/(0.45+0.6*bankNoise))) * exp(-sq(farPoint.x/45.0));
  float secondBank = exp(-sq((farPoint.y-bankHeight-1.7)/(0.6+0.5*bankNoise))) * exp(-sq((farPoint.x+7.0)/55.0));
  col += mix(u_secondary,vec3(1),0.2) * (farBank*0.022+secondBank*0.009);

  // Distant terrain and rain-lit basin give scale without competing with sky.
  float land = 0.003 + 0.008 * sin(rd.x * 45.0) + 0.004 * sin(rd.x * 103.0);
  float terrain = 1.0 - smoothstep(land - pixel, land + pixel, rd.y);
  col = mix(col,u_secondary * 0.009,terrain);
  float ridge = -0.16 + 0.013 * sin(rd.x * 9.0 + 1.2) + 0.006 * sin(rd.x * 27.0);
  float foreground = 1.0 - smoothstep(ridge-pixel,ridge+pixel,rd.y);
  col *= 1.0 - 0.88 * foreground;
  float groundT = -stEye.y / min(rd.y, -0.0001);
  vec3 ground = stEye + rd * groundT;
  if (rd.y < -0.001) {
    float basin = exp(-sq(ground.x / 40.0) - sq((ground.z - 18.0) / 28.0));
    float ridges = 0.6 + 0.4 * sin(ground.x * 0.35 + sin(ground.z * 0.4) * 1.5);
    col += mix(u_secondary,u_primary,0.1) * 0.045 * basin * ridges * (1.0-foreground);
    vec2 townGrid = ground.xz * vec2(1.8,2.5);
    vec2 townCell = floor(townGrid);
    float townHash = fract(sin(dot(townCell,vec2(127.1,311.7))) * 43758.5453);
    vec2 townDelta = fract(townGrid)-0.5;
    float townFootprint = max(0.012,dot(fwidth(townGrid),fwidth(townGrid))*0.3);
    float settlements = 0.5+0.5*sin(townCell.x*0.17+sin(townCell.y*0.14)*2.0);
    float towns = exp(-dot(townDelta,townDelta)/townFootprint) * 0.012/townFootprint * step(0.97,townHash)*smoothstep(0.5,0.9,settlements);
    col += mix(u_primary,vec3(1),0.5) * towns * basin * 3.0 * (1.0-foreground);
    for (int net = 0; net < 2; ++net) {
      vec3 impact = stWorld(stLeader(net,18),net);
      vec2 q = ground.xz - impact.xz;
      float wet = exp(-dot(q,q) * 0.25) * stSuper * stDischarge(net);
      col += mix(u_secondary,vec3(1),0.7) * wet * 1.5;
    }
  }
  // Full-resolution rays integrate a camera-independent 3D optical field.
  // Conservative carrier bounds avoid marching empty sky. The atlas remains
  // camera-independent and unchanged; every retained ray uses full-size data.
  float boundX = min(24.0,mix(24.0,mix(12.0,26.0,stSuper),stRise));
  vec3 lo = vec3(-boundX,stVolumeLo.y,mix(1.0,-3.0,smoothstep(0.0,0.5,stSuper)));
  vec3 hi = vec3(boundX,min(16.8,mix(9.2,14.4,stRise)*u_params[2]),mix(11.2,13.0,stSuper));
  vec3 inv = sign(rd + vec3(1e-8)) / max(abs(rd),vec3(1e-6));
  vec3 nearP = (lo - stEye) * inv, farP = (hi - stEye) * inv;
  vec3 n = min(nearP,farP), f = max(nearP,farP);
  float nearT = max(0.0,max(n.x,max(n.y,n.z))), farT = min(f.x,min(f.y,f.z));
  float trans = 1.0; vec3 cloud = vec3(0);
  float flash0 = stDischarge(0), flash1 = stDischarge(1);
  float crawlerSelection = mod(u_rhythmCount.y,2.0)<0.5 ? 1.0 : 0.0;
  vec2 internalFlash = max(vec2(flash0,flash1),vec2(crawlerSelection,1.0-crawlerSelection)*u_rhythm.y*0.35);
  vec3 source0 = stWorld(vec3(0,0.15,0),0);
  if (farT > nearT) {
    float ds = (farT-nearT)/24.0;
    for (int j = 0; j < 24; ++j) {
      vec3 p = stEye+rd*(nearT+(float(j)+0.5)*ds);
      vec4 optical = stVolume(p);
      if (optical.x <= 0.0) continue;
      float alpha = 1.0 - exp(-optical.x * ds);
      vec3 light = mix(u_secondary,vec3(1),0.8) * (0.005 + 1.7*optical.y);
      light += mix(u_secondary,vec3(1),0.85) * (internalFlash.x*optical.z+internalFlash.y*optical.w) * 3.0;
      float halo = exp(-sq((length(p-source0) - (0.4 + 2.4 * u_rhythm.y)) / 0.5));
      light += u_accent * halo * u_rhythm.y * 0.14;
      cloud += trans * alpha * light;
      trans *= 1.0 - alpha;
      if (trans < 0.012) break;
    }
  }
  col = col * trans + cloud;
  // Finite rain curtains below the carrier: smooth filaments, advected with
  // integer-period harmonics. Energy increases filament detail, not exposure.
  if (rd.y < 0.3 && stRise > 0.0) {
    float t = (4.0 - stEye.z) / max(rd.z,0.01);
    vec3 p = stEye + rd * t;
    float curtains = exp(-sq((p.x + 5.0 + p.y * 0.2) / 2.0)) + exp(-sq((p.x - 3.8 + p.y * 0.14) / 2.5));
    float vertical = smoothstep(-0.1,0.8,p.y) * (1.0 - smoothstep(3.0,5.1,p.y));
    float filaments = 0.3+0.7*stNoise(vec3(p.x*15.0,p.y*0.22+sin(stPhase*4.0)*0.6,3.0+cos(stPhase*4.0)*0.6)).x;
    curtains *= 0.55 + 0.45 * stNoise(vec3(p.x*2.0,p.y*0.15,3)).x;
    float rainAlpha = 1.0-exp(-curtains*vertical*u_params[7]*stRise*0.7);
    vec3 rainLight = mix(u_secondary,vec3(1),0.65)*(0.012+0.18*(internalFlash.x+internalFlash.y));
    col = mix(col,rainLight*mix(0.75,filaments,u_level),rainAlpha);
  }
  uvec4 mask = uvec4(65535u), crawlerMask = uvec4(65535u);
#ifdef PRECOMPUTED
  if (shortSide >= 280.0 && all(lessThan(abs(view),vec2(2)))) {
    ivec2 tile = ivec2(floor((view + 2.0) * 8.0)) + ivec2(0,3);
    mask = uvec4(texelFetch(u_precomputed,tile,0));
    crawlerMask = uvec4(texelFetch(u_precomputed,tile+ivec2(32,0),0));
  }
#endif
  // Skip empty 16-edge groups before visiting their bits. Most sky pixels
  // have no candidates; no 120-edge per-pixel scan through empty space.
  for (int group = 0; group < 8; ++group) {
    uvec4 candidate = group<4 ? mask : crawlerMask;
    int channel = group%4;
    uint bits = channel==0 ? candidate.x : channel==1 ? candidate.y : channel==2 ? candidate.z : candidate.w;
    if (bits == 0u) continue;
    for (int bit = 0; bit < 16; ++bit) {
    if (bits == 0u) break;
    bool present = (bits & 1u) != 0u; bits >>= 1u;
    int i = (group/4)*60 + channel*16 + bit;
    if (!present || channel*16+bit >= 60) continue;
    vec4 endpoints = stData(i,0);
    float width = max(pixel * 1.45,0.0014);
    float support = width*9.0+0.0018;
    vec2 edgeBox = max(min(endpoints.xy,endpoints.zw)-view,view-max(endpoints.xy,endpoints.zw));
    if (max(edgeBox.x,edgeBox.y)>support) continue;
    if (stSegmentDistanceSq(view,endpoints.xy,endpoints.zw)>sq(support)) continue;
    float d = stBoltDistance(view,endpoints.xy,endpoints.zw,i);
    if (d > width * 9.0) continue;
    vec4 a = stData(i,1);
    float branch = (i % 30) < 18 ? 1.0 : u_params[4] * (0.5 + 0.5 * u_level);
    float flash = (i/30)%2 == 0 ? flash0 : flash1;
    if (i >= 60) {
      float selected = abs(mod(u_rhythmCount.y,2.0)-float((i/30)%2))<0.5 ? 1.0 : 0.0;
      flash = max(flash*0.65,selected*u_rhythm.y*0.35);
    }
    float local = float(i % 30);
    float rank = local < 18.0 ? local / 18.0 : (4.0 + floor((local-18.0)/4.0)*4.0 + mod(local-18.0,4.0)) / 18.0;
    float returnStroke = exp(-sq((rank - (1.0-u_rhythm.z) * 1.3) / 0.15)) * u_rhythm.z;
    float leader = 1.0 + 2.0 * returnStroke;
    float taper = local<18.0 ? 1.0 : mix(0.72,0.3,mod(local-18.0,4.0)/3.0);
    float core = exp(-sq(d / (width*taper)));
    float glow = exp(-sq(d / (width * 4.0)));
    float buried = i<60 ? mix(0.35,1.0,stSuper)*stRise : mix(0.04,0.65,stRise);
    vec3 ink = mix(u_secondary,vec3(1),0.93);
    col += ink * (core * 12.0 + glow * 0.8) * a.w * branch * flash * buried * leader;
    }
  }
  if (rd.y < -0.001 && stSuper > 0.0) {
    for (int net = 0; net < 2; ++net) {
      vec3 hit = stWorld(stLeader(net,18),net);
      vec3 reflected = stWorld(vec3(0,0.2,0),net); reflected.y = -reflected.y;
      vec2 a = stProject(hit), b = stProject(reflected);
      float d = stSegmentDistance(view+vec2(0.003*sin(view.y*310.0+stPhase*2.0),0),a,b);
      float ripple = 0.3+0.7*sq(sin(view.y*650.0+sin(view.x*90.0)));
      col += mix(u_primary,vec3(1),0.6)*exp(-sq(d/0.009))*stDischarge(net)*stSuper*ripple*0.16;
    }
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
    size: [1024, 515],
    filter: "linear",
    nearestFallback: true, // the shader filters itself without PRECOMPUTED_LINEAR
    fragment: `${common}
${stormVolume}
void main() {
  stSetup(); stCloudSetup();
  int x = int(gl_FragCoord.x), row = int(gl_FragCoord.y);
  if (row >= 35) {
    ivec3 voxel = ivec3(x%128,(row-35)%80,(row-35)/80*8+x/128);
    outColor = stOptical(stVolumeLo+(vec3(voxel)+0.5)/stGrid*stVolumeSize);
    return;
  }
  if (row < 3) { outColor = stDatum(x,row); return; }
  if (x >= 64) { outColor = vec4(0); return; }
  vec2 lo = vec2(float(x%32),float(row - 3)) / 8.0 - 2.0, hi = lo + 0.125;
  uvec4 bits = uvec4(0u);
  for (int i = 0; i < 60; ++i) {
    vec4 p = stDatum(i+(x/32)*60,0);
    vec2 a = min(p.xy,p.zw) - 0.06, b = max(p.xy,p.zw) + 0.06;
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
