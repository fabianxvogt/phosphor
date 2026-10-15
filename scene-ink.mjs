import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// Kelvin's thin-core ring speed sets the integrated material clock.
export function kelvinVelocity(gamma, radius, core) {
  if (!(radius > 0 && core > 0 && core < radius))
    throw new RangeError("A thin ring needs 0 < core < radius");
  return (
    (gamma / (4 * Math.PI * radius)) * (Math.log((8 * radius) / core) - 0.25)
  );
}
export const INK_RING = Object.freeze({
  gamma: 0.75,
  radius: 0.82,
  core: 0.12,
});
export const INK_SPEED = kelvinVelocity(
  INK_RING.gamma,
  INK_RING.radius,
  INK_RING.core,
);
export function inkIdentity(seed) {
  const materialPhase = ((seed >>> 0) % 991) * 0.013;
  return [0, -1, 1].map((side, id) => ({
    id,
    side,
    materialPhase,
    centre: side ? [side * 1.3, 0.65 + side * 0.25, side * 0.6] : [0, -0.25, 0],
  }));
}
// A regular axisymmetric streamfunction: vr=-psi_y/r, vy=psi_r/r-U.
export function inkVelocity(
  [x, y, z],
  gamma = INK_RING.gamma,
  radius = INK_RING.radius,
  core = 0.32,
) {
  const r = Math.hypot(x, z),
    h = r - radius,
    aa = core * core;
  const k = gamma / (2 * Math.PI),
    e = Math.exp(-(h * h + y * y) / aa);
  const vr = ((2 * k * r * y) / aa) * e;
  const vy =
    k * (2 - (2 * r * h) / aa) * e - kelvinVelocity(gamma, radius, core);
  return [r > 0 ? (vr * x) / r : 0, vy, r > 0 ? (vr * z) / r : 0];
}
const schema = [
  {
    key: "development",
    label: "Development · drop / plumes / nebula",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  { key: "flow", label: "Ink flow", min: 0, max: 2, step: 0.01, default: 0.8 },
  {
    key: "curl",
    label: "Vortex curl",
    min: 0.3,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "fingers",
    label: "Branching fingers",
    min: 0.3,
    max: 1.5,
    step: 0.01,
    default: 0.9,
  },
  {
    key: "opacity",
    label: "Pigment depth",
    min: 0.4,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "spread",
    label: "Plume spread",
    min: 0.6,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "orbit",
    label: "Tank orbit",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "distance",
    label: "Tank distance",
    min: 0.8,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
];
const base = {
  flow: 0.8,
  curl: 1,
  fingers: 0.9,
  opacity: 1,
  spread: 1,
  orbit: 0.45,
  distance: 1,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Drop", 11201, 0),
  look("Plumes", 11201, 1),
  look("Nebula", 11201, 2),
  look("Quiet Infusion", 11202, 0.25, {
    flow: 0.35,
    curl: 0.65,
    opacity: 0.7,
    distance: 0.85,
  }),
  look("Twin Currents", 11203, 0.85, { spread: 1.25, curl: 1.3, orbit: 0.75 }),
  look("Silken Tributaries", 11204, 1.35, {
    fingers: 1.4,
    opacity: 0.65,
    flow: 0.5,
  }),
  look("Velvet Chamber", 11205, 2, {
    opacity: 1.4,
    spread: 0.8,
    curl: 1.25,
    distance: 0.95,
  }),
  look("Marbled Lantern", 11206, 1.85, {
    spread: 1.25,
    fingers: 1.2,
    opacity: 0.8,
    orbit: 0.8,
  }),
];

const material = `${lateClockGlsl}
float gPhase, gGrow, gCloud, gSeed, gCurl, gFinger;
float inkNoise(vec3 p) {
  return dot(sin(p + sin(p.yzx)), vec3(0.36,0.32,0.32));
}
// A wound sheet, not a shaded solid cap. The cross-section is an ink
// spiral around a dark toroidal core; the space between turns is water.
vec2 inkCarrier(vec3 q, float scale, float phase) {
  q /= scale;
  float r0=length(q.xz), h0=r0-0.82, aa=0.32*0.32;
  float e0=exp(-(h0*h0+sq(q.y+0.25))/aa);
  float vr=0.75/PI*r0*(q.y+0.25)/aa*e0;
  float vy=0.75/(2.0*PI)*(2.0-2.0*r0*h0/aa)*e0;
  q-=0.12*gCurl*sin(gPhase)*vec3(q.x/max(r0,0.001)*vr,vy,q.z/max(r0,0.001)*vr);
  float a=atan(q.z,q.x+1e-7);
  float n=inkNoise(q*4.1+vec3(gSeed,phase,-phase));
  float f=inkNoise(q*11.0+n*2.0+vec3(phase,-phase,gSeed));
  float y0=-0.25-0.13*sin(phase)+0.04*sin(a*3.0+phase)+0.08*sin(a);
  float R=0.82+0.035*sin(a*5.0+phase)+0.025*sin(a*9.0-phase);
  vec2 tor=vec2(length(q.xz)-R,q.y-y0);
  tor+=vec2(n,f)*0.035*gCurl;
  float rho=length(tor), roll=atan(tor.y,tor.x+1e-7);
  float turn=rho*25.0-roll*2.0-2.0*phase+n*1.6;
  float sheet=pow(0.5+0.5*cos(turn),6.0);
  float ring=(0.85*exp(-rho*rho/0.006)+sheet*0.68)*exp(-rho*rho/0.08);
  // Rayleigh–Taylor-like hanging sheets split into thinner daughters.
  float below=y0-q.y;
  float lobes=0.5+0.5*sin(a*11.0+1.4*sin(a*4.0)+phase);
  float reach=(0.75+0.95*lobes)*gFinger;
  float tip=clamp((below-reach+0.42)/0.42,0.0,1.0);
  float skirtR=R-0.06*below+0.22*sin(below*3.5+a*3.0-phase)+0.065*sin(a*13.0+below*5.0);
  skirtR+=0.16*sin(tip*PI*1.5)*tip;
  float w=0.032+0.026*lobes;
  float d=length(q.xz)-skirtR;
  float skirt=exp(-sq((d+0.035*n)/w));
  skirt+=0.48*exp(-sq((d-0.16*sin(a*15.0+below*4.0))/0.032));
  skirt*=smoothstep(-0.05,0.15,below)*(1.0-smoothstep(reach-0.4,reach,below));
  skirt*=0.12+0.88*sq(lobes);
  skirt*=0.65+0.35*sin(a*5.0+below*5.0+phase);
  // The feed is a twisted pair of wisps, never an opaque jellyfish dome.
  float above=q.y-y0;
  vec2 feed=q.xz-vec2(0.09*sin(above*4.0+phase),0.07*cos(above*5.0-phase));
  float stem=exp(-dot(feed,feed)/0.0018)*smoothstep(0.1,0.45,above)*(1.0-smoothstep(1.4,1.8,above));
  float density=ring+skirt*0.6+stem*0.42;
  float illumination=clamp(0.55+0.3*f+0.15*n,0.05,1.0);
  return vec2(density,density*illumination);
}
vec2 inkField(vec3 p) {
  vec3 q=p;
  q.xz=rot2(0.12*sin(gPhase)+0.08*q.y*gCurl)*q.xz;
  vec2 medium=inkCarrier(q,1.0+0.4*gCloud,gPhase);
  if (gGrow>0.0001) for (int i=0;i<2;++i) {
    float side=i==0?-1.0:1.0;
    vec3 v=q-vec3(side*1.3*u_params[5],0.65+side*0.25,side*0.6);
    v.xy=rot2(side*0.36*gGrow)*v.xy;
    medium+=inkCarrier(v,max(0.001,(0.72+0.38*gCloud)*gGrow),gPhase+side*1.2)*gGrow;
  }
  // The same pigment opens into full-tank marbling; no round cloud SDF.
  if (gCloud>0.0001) {
    vec3 warp=q+0.3*vec3(inkNoise(q*2.1+gPhase),inkNoise(q.yzx*2.5-gPhase),inkNoise(q.zxy*2.0+gSeed));
    float broad=inkNoise(warp*2.2+vec3(gSeed,gPhase,-gPhase));
    float fine=inkNoise(warp*7.5+broad*3.0);
    float folds=pow(0.5+0.5*sin(broad*7.0+fine*0.65-q.y*1.5),3.0);
    float cloud=smoothstep(-0.05,0.3,broad+fine*0.27-(1.0-gCloud)*2.0)*(0.07+folds*0.65);
    cloud*=exp(-dot(q/vec3(3.2,2.7,2.0),q/vec3(3.2,2.7,2.0))*0.65);
    medium+=vec2(cloud,cloud*(0.3+0.7*folds));
  }
  medium*=smoothstep(0.0,0.24,min(min(3.2-abs(p.x),2.7-abs(p.y)),2.0-abs(p.z)));
  return medium;
}
void inkSetup() {
  float dev=clamp(u_params[0],0.0,2.0);
  gGrow=smoothstep(0.0,1.0,dev);
  gCloud=smoothstep(1.0,2.0,dev);
#ifdef PHOSPHOR_LATE
  gPhase=u_clock[0];
#else
  gPhase=u_time*u_params[1]*${INK_SPEED.toFixed(10)};
#endif
  gPhase=mod(gPhase,TAU);
  gSeed=float(u_seedBits % 991u)*0.013;
  gCurl=u_params[2]*(1.0+0.08*u_rhythm.x);
  gFinger=u_params[3]*(0.7+0.35*u_level)*(1.0+0.12*u_rhythm.y);
}
`;
const lattice = `
vec3 inkExtent() { return vec3(1.48+1.18*gGrow+0.54*gCloud,2.08+0.18*gGrow+0.44*gCloud,1.42+0.15*gGrow+0.43*gCloud); }
const vec3 INK_GRID=vec3(128,144,64);
const vec2 INK_ATLAS=vec2(1040,1168);
vec2 inkAddress(vec2 xy, float z) {
  return (vec2(mod(z,8.0),floor(z/8.0))*vec2(130,146)+xy+1.5)/INK_ATLAS;
}
`;
const fragment = `${material}\n${lattice}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec3 inkSample(vec3 p) {
#ifdef PRECOMPUTED
  vec3 cell=clamp((p/inkExtent()*0.5+0.5)*(INK_GRID-1.0),vec3(0),INK_GRID-1.001);
  float z=floor(cell.z);
  vec3 a=texture(u_precomputed,inkAddress(cell.xy,z)).rgb;
  vec3 b=texture(u_precomputed,inkAddress(cell.xy,z+1.0)).rgb;
  return mix(a,b,fract(cell.z));
#else
  vec2 m=inkField(p);
  return vec3(m.x,inkField(p+vec3(-0.065,0.085,-0.07)).x,m.y);
#endif
}
void main() {
  inkSetup();
#ifdef PHOSPHOR_LATE
  float orbit=u_clock[1];
#else
  float orbit=u_time*u_params[6]*0.035;
#endif
  orbit=mod(orbit,TAU);
  vec2 uv=(v_uv-0.5)*u_resolution/min(u_resolution.x,u_resolution.y)*2.0;
  float az=0.13+0.15*sin(orbit);
  vec3 eye=vec3(5.2*sin(az),1.2+0.18*sin(orbit*2.0),5.2*cos(az))*u_params[7];
  vec3 fw=normalize(vec3(0,-0.15,0)-eye), right=normalize(cross(fw,vec3(0,1,0))), up=cross(right,fw);
  float aspectFit=0.82+0.18*smoothstep(1.0,1.5,u_resolution.x/u_resolution.y);
  float focal=(2.4+0.048*u_kick)*aspectFit;
  vec3 rd=normalize(fw*focal+right*uv.x+up*uv.y);
  // A diffused lamp behind a tank. No periodic screen-space shaft pattern.
  float lamp=exp(-dot((uv-vec2(0.25,0.3))*vec2(0.62,0.76),(uv-vec2(0.25,0.3))*vec2(0.62,0.76)));
  vec3 lampColor=mix(u_primary,vec3(1),0.68);
  vec3 bg=lampColor*(0.018+1.15*lamp*lamp)+u_secondary*0.008;
  vec3 inv=sign(rd+vec3(1e-8))/max(abs(rd),vec3(1e-6));
  vec3 bound=inkExtent();
  vec3 lo=(-bound-eye)*inv, hi=(bound-eye)*inv;
  vec3 nearV=min(lo,hi), farV=max(lo,hi);
  float start=max(0.0,max(max(nearV.x,nearV.y),nearV.z));
  float end=min(min(farV.x,farV.y),farV.z);
  vec3 col=vec3(0);
  float trans=1.0, optical=0.0;
  vec3 pigment=mix(u_secondary,u_primary,0.06);
  vec3 absorption=vec3(1.5)-pigment*1.13;
  if (end>start) {
    float stepSize=(end-start)/40.0;
    for (int i=0;i<40;++i) {
      vec3 p=eye+rd*(start+(float(i)+0.5)*stepSize);
      vec3 medium=inkSample(p);
      float density=medium.x;
      float shade=medium.z/max(density,0.0001);
      float depth=density*u_params[4]*stepSize*8.0;
      float alpha=1.0-exp(-depth);
      // Shadow density is sampled in the analytic field BEFORE caching;
      // interpolation is continuous, unlike differentiating a trilinear grid.
      float rim=clamp((density-medium.y)*8.0,0.0,1.0);
      float back=1.0/(1.0+medium.y*5.0);
      vec3 light=pigment*(0.025+0.06*shade)*back+lampColor*rim*back*0.3;
      float band=max(0.0,1.0-abs(p.y-(1.8-3.5*u_rhythm.z))/0.2);
      float wave=band*band*(3.0-2.0*band)*u_rhythm.z;
      light+=u_accent*wave*rim*0.45;
      col+=trans*alpha*light;
      trans*=1.0-alpha;
      optical+=depth;
      if (trans<0.002) break;
    }
  }
  // Broad, irregular fans from one off-axis lamp, not parallel stripes.
  float rayAngle=atan(uv.x-0.8,2.0-uv.y);
  float shafts=sq(0.5+0.5*sin(rayAngle*9.0+0.6*sin(rayAngle*17.0+orbit)));
  bg+=lampColor*shafts*gCloud*0.18*exp(-sq(uv.y-0.6)*0.4);
  col+=exp(-optical*absorption)*bg;
  col*=1.0-0.22*smoothstep(0.7,2.0,length(uv));
  outColor=vec4(max(col,vec3(0)),1);
}
`;

export default {
  id: "ink",
  number: 112,
  name: "Ink Bloom",
  description:
    "A falling drop rolls into a descending vortex ring, branches into colliding plumes and fills a backlit tank with marbled ink clouds.",
  development: "development",
  schema,
  presets,
  fragment,
  precompute: {
    size: [1040, 1168],
    filter: "linear",
    format: "rgba16f",
    fragment: `${material}\n${lattice}
void main() {
  inkSetup();
  ivec2 pixel=ivec2(gl_FragCoord.xy);
  int z=(pixel.y/146)*8+pixel.x/130;
  // A duplicate-node gutter isolates each Z slice under bilinear filtering.
  vec3 cell=vec3(clamp(pixel.x%130-1,0,127),clamp(pixel.y%146-1,0,143),z);
  vec3 p=(cell/(INK_GRID-1.0)*2.0-1.0)*inkExtent();
  vec2 m=inkField(p);
  float shadow=m.x>0.0001?inkField(p+vec3(-0.065,0.085,-0.07)).x:0.0;
  outColor=vec4(m.x,shadow,m.y,1);
}`,
  },
  type: { key: "development", values: [0, 1, 2] },
  stage: ["curl", "fingers", "opacity"],
  energy: { flow: { mul: [0.65, 1.3] }, orbit: { mul: [0.8, 1.25] } },
  beat: { punch: 0.08, pulse: 0.08 },
  clocks: [
    { rate: (p) => p[1] * INK_SPEED, period: 2 * Math.PI },
    { rate: (p) => p[6] * 0.035, period: 2 * Math.PI },
  ],
  rhythm: [
    familyEffect(
      "ring-roll",
      0,
      "Ring roll",
      "The existing vortex rim curls a little tighter.",
      { period: 4, strength: 0.55, duration: 1.5, kind: "motion" },
    ),
    familyEffect(
      "finger-reach",
      1,
      "Finger reach",
      "The same ink fingers stretch into the water.",
      { period: 8, strength: 0.6, duration: 2.5, kind: "motion" },
    ),
    familyEffect(
      "pigment-wave",
      2,
      "Pigment wave",
      "A narrow backlit pigment band travels down the existing plumes.",
      { period: 16, strength: 0.6, duration: 3 },
    ),
  ],
};
