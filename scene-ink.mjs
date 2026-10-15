import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// Thin-core Kelvin ring, in consistent scene units. Exported for the CPU
// reference and used by the integrated transport clock (not just metadata).
export function kelvinVelocity(gamma, radius, core) {
  if (!(radius > 0 && core > 0 && core < radius))
    throw new RangeError("A thin ring needs 0 < core < radius");
  return gamma / (4 * Math.PI * radius) * (Math.log(8 * radius / core) - 0.25);
}
export const INK_RING = Object.freeze({ gamma: 0.75, radius: 0.82, core: 0.12 });
export const INK_SPEED = kelvinVelocity(INK_RING.gamma, INK_RING.radius, INK_RING.core);
// Identity has no development argument. The analytic volume deforms these
// same three carriers; no simulation, generation or seed reset on reversal.
export function inkIdentity(seed) {
  const materialPhase = ((seed >>> 0) % 991) * 0.013;
  return [0, -1, 1].map((side, id) => ({ id, side, materialPhase,
    centre: side ? [side * 0.72, 0.4 + side * 0.35, side * 0.32] : [0, -0.25, 0] }));
}
// Axisymmetric streamfunction psi = k*r^2*exp(-((r-R)^2+y^2)/a^2).
// vr=-dpsi/dy/r, vy=dpsi/dr/r: exactly divergence free, including the axis.
export function inkVelocity([x, y, z], gamma = INK_RING.gamma, radius = INK_RING.radius, core = 0.32) {
  const r = Math.hypot(x, z), h = r - radius, aa = core * core;
  const k = gamma / (2 * Math.PI), e = Math.exp(-(h * h + y * y) / aa);
  const vr = 2 * k * r * y / aa * e;
  const vy = k * (2 - 2 * r * h / aa) * e - kelvinVelocity(gamma, radius, core);
  return [r > 0 ? vr * x / r : 0, vy, r > 0 ? vr * z / r : 0];
}

const schema = [
  { key: "development", label: "Development · drop / plumes / nebula", min: 0, max: 2, step: 0.01, default: 0 },
  { key: "flow", label: "Ink flow", min: 0, max: 2, step: 0.01, default: 0.8 },
  { key: "curl", label: "Vortex curl", min: 0.3, max: 1.5, step: 0.01, default: 1 },
  { key: "fingers", label: "Branching fingers", min: 0.3, max: 1.5, step: 0.01, default: 0.9 },
  { key: "opacity", label: "Pigment depth", min: 0.4, max: 1.5, step: 0.01, default: 1 },
  { key: "spread", label: "Plume spread", min: 0.6, max: 1.3, step: 0.01, default: 1 },
  { key: "orbit", label: "Tank orbit", min: 0, max: 1, step: 0.01, default: 0.45 },
  { key: "distance", label: "Tank distance", min: 0.8, max: 1.4, step: 0.01, default: 1 },
];
const base = { flow: 0.8, curl: 1, fingers: 0.9, opacity: 1, spread: 1, orbit: 0.45, distance: 1 };
const look = (name, seed, development, params = {}) => ({ name, seed, params: { development, ...base, ...params } });
const presets = [
  look("Drop", 11201, 0),
  look("Plumes", 11201, 1),
  look("Nebula", 11201, 2),
  look("Quiet Infusion", 11202, 0.25, { flow: 0.35, curl: 0.65, opacity: 0.7, distance: 0.85 }),
  look("Twin Currents", 11203, 0.85, { spread: 1.25, curl: 1.3, orbit: 0.75 }),
  look("Silken Tributaries", 11204, 1.35, { fingers: 1.4, opacity: 0.65, flow: 0.5 }),
  look("Velvet Chamber", 11205, 2, { opacity: 1.4, spread: 0.8, curl: 1.25, distance: 0.95 }),
  look("Marbled Lantern", 11206, 1.85, { spread: 1.25, fingers: 1.2, opacity: 0.8, orbit: 0.8 }),
];

const material = `${lateClockGlsl}
float gPhase, gGrow, gCloud, gSeed, gCurl, gFinger;
float inkSmin(float a, float b, float k) {
  float h = max(k - abs(a-b), 0.0) / k;
  return min(a,b) - h*h*k*0.25;
}
// Smooth, band-limited Fourier material field. No stochastic pixel noise.
float inkNoise(vec3 p) {
  return dot(sin(p + sin(p.yzx)), vec3(0.36,0.32,0.32));
}
vec2 inkField(vec3 p) {
  vec3 q = p;
  q.xz = rot2(0.12 * sin(gPhase) + 0.1*q.y*gCurl) * q.xz;
  // Bounded backward characteristic of the tested analytic toroidal flow.
  float r0=length(q.xz), h0=r0-0.82, aa=0.32*0.32;
  float e0=exp(-(h0*h0+sq(q.y+0.25))/aa);
  float vr=0.75/PI*r0*(q.y+0.25)/aa*e0;
  float vy=0.75/(2.0*PI)*(2.0-2.0*r0*h0/aa)*e0;
  q-=0.12*sin(gPhase)*vec3(q.x/max(r0,0.001)*vr,vy,q.z/max(r0,0.001)*vr);
  float n = inkNoise(q * 3.3 + vec3(gSeed, gPhase, -gPhase));
  float fine = sin(q.x*12.0+n*2.0)*sin(q.y*11.0-gPhase)*sin(q.z*13.0);
  float angle = atan(q.z, q.x + 1e-7);
  float radial = length(q.xz);
  float fingers = (0.5 + 0.5*sin(angle*9.0 + 1.5*sin(angle*3.0) + gPhase));
  float ringY = -0.25 - 0.22*sin(gPhase);
  float R = 0.82 + 0.35*gCloud;
  float tube = mix(0.19,0.6,gCloud);
  float fy = 0.22*gFinger*fingers*(1.0-smoothstep(-0.7,-0.15,q.y-ringY));
  vec2 tor = vec2(radial-R, q.y-ringY+fy);
  // A wound material coordinate: the vortex visibly rolls over its rim.
  float roll = atan(tor.y, tor.x + 1e-7);
  float marble = sin(roll*3.0 - 2.0*gPhase + n*2.8 + fine*0.8);
  float d = length(tor) - tube - n*(0.045+0.13*gCloud);
  // The descending cap feeds a narrower, ragged stem above the ring.
  float stemR = mix(0.045,0.12,gCloud) + 0.025*n + 0.04*sq(q.y-1.5);
  vec2 stemXZ=q.xz-0.08*vec2(sin(q.y*4.0+gPhase),cos(q.y*3.0-gPhase));
  float stem = length(vec3(stemXZ,max(abs(q.y-0.8)-0.78,0.0)))-stemR;
  d = inkSmin(d, stem, 0.25);
  // The cap rolls over into a corrugated annular skirt. Long lobes split
  // into fine strands instead of leaving a clean geometric doughnut.
  float below=ringY-q.y;
  float reach=(0.4+0.95*fingers)*gFinger*(1.0+0.2*gCloud);
  float skirtR=R+0.12*sin(below*4.5-gPhase+angle*3.0)-0.12*below+0.07*sin(below*9.0+angle*7.0);
  float strandW=(0.025+0.06*fingers)*(1.0-smoothstep(0.0,reach,below));
  float daughter=abs(radial-skirtR-0.12*sin(angle*18.0+below*6.0))-strandW*0.5;
  float skirt=max(min(abs(radial-skirtR)-strandW,daughter), max(-below,below-reach));
  d=inkSmin(d,skirt,0.12);
  float dome=length(vec3(q.x,(q.y-ringY)*1.85,q.z))-R;
  dome=max(dome,ringY-q.y);
  d=inkSmin(d,dome+0.045*n,0.12);
  // Two persistent oblique carriers approach and collide. They are grown
  // geometrically from zero radius, not crossfaded finished pictures.
  if (gGrow>0.001) for (int i=0; i<2; ++i) {
    float side = i==0 ? -1.0 : 1.0;
    vec3 v = q - vec3(side*(0.72+0.32*gCloud)*u_params[5], 0.4+side*0.35, side*0.32);
    v.xy = rot2(side*0.42*gGrow) * v.xy;
    float rr = length(v.xz);
    float f = 0.5+0.5*sin(v.x*9.0 + n*2.0 + side*gPhase);
    float cap = length(vec2(rr-(0.56+0.22*gCloud)*gGrow, v.y+0.22*sin(gPhase+side)+0.32*gFinger*f*(1.0-smoothstep(-0.8,0.0,v.y))));
    float dd = cap - (0.2+0.48*gCloud)*gGrow - n*0.12*gGrow;
    d = inkSmin(d, dd, 0.25);
  }
  // At the climax the same carrier swells into a scalloped cloud skirt.
  vec3 cloudP = (q+vec3(0,0.45,0)) / vec3(1.55*u_params[5],1.05,1.0);
  float cloud = (length(cloudP)-1.0)*1.2 - 0.38*n - 0.15*fine;
  cloud += 0.12*inkNoise(q*6.5+n-gPhase);
  d = inkSmin(d, cloud + (1.0-gCloud)*4.0, 0.35);
  float edge = 1.0-smoothstep(-0.05,0.12,d);
  // Soft extinction at the finite tank boundary, including wide extra looks.
  edge *= smoothstep(0.0,0.16,min(min(2.5-abs(p.x),2.3-abs(p.y)),1.8-abs(p.z)));
  float layers = 0.18+0.82*sq(0.5+0.5*sin(roll*2.0-2.0*gPhase+n*3.0+fine*0.7+q.y*3.0));
  return vec2(edge*layers, clamp(0.5+0.28*n+0.16*marble,0.0,1.0));
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
  // Reduce uniform phases before material coordinates for 12 h precision.
  gPhase=mod(gPhase,TAU);
  gSeed=float(u_seedBits % 991u)*0.013;
  gCurl=u_params[2]*(1.0+0.08*u_rhythm.x);
  gFinger=u_params[3]*(0.7+0.35*u_level)*(1.0+0.12*u_rhythm.y);
}
`;
// A 3D physical-density lattice, NOT a reduced-resolution colour image.
// One texel stores the four XY corners at one Z plane. Two fetches give
// exact trilinear interpolation; lighting and ray integration remain native.
const lattice = `
const vec3 INK_EXTENT=vec3(2.5,2.3,1.8);
const vec3 INK_GRID=vec3(80,96,64);
ivec2 inkAddress(ivec3 c) { return ivec2((c.z%8)*80+c.x,(c.z/8)*96+c.y); }
`;
const fragment = `${material}\n${lattice}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
float inkDensity(vec3 p) {
#ifdef PRECOMPUTED
  vec3 cell=clamp((p/INK_EXTENT*0.5+0.5)*(INK_GRID-1.0),vec3(0),INK_GRID-1.001);
  ivec3 c=ivec3(floor(cell)); vec3 f=fract(cell);
  vec4 a=texelFetch(u_precomputed,inkAddress(c),0);
  vec4 b=texelFetch(u_precomputed,inkAddress(c+ivec3(0,0,1)),0);
  vec4 v=mix(a,b,f.z);
  return mix(mix(v.x,v.y,f.x),mix(v.z,v.w,f.x),f.y);
#else
  return inkField(p).x;
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
  float az=0.16+0.22*sin(orbit);
  vec3 eye=vec3(6.5*sin(az),2.5+0.2*sin(orbit*2.0),6.5*cos(az))*u_params[7];
  vec3 fw=normalize(vec3(0,0.15,0)-eye), right=normalize(cross(fw,vec3(0,1,0))), up=cross(right,fw);
  float aspectFit=0.82+0.18*smoothstep(1.0,1.5,u_resolution.x/u_resolution.y);
  float focal=(2.5+0.05*u_kick)*aspectFit;
  vec3 rd=normalize(fw*focal+right*uv.x+up*uv.y);
  vec3 bg=mix(u_secondary,u_primary,0.15)*(0.004+0.024*exp(-dot(uv,uv)*2.0));
  // Finite tank, no hard screen-space border or low-resolution colour pass.
  vec3 inv=sign(rd+vec3(1e-8))/max(abs(rd),vec3(1e-6));
  vec3 lo=(-vec3(2.5,2.3,1.8)-eye)*inv, hi=(vec3(2.5,2.3,1.8)-eye)*inv;
  vec3 nearV=min(lo,hi), farV=max(lo,hi);
  float start=max(0.0,max(max(nearV.x,nearV.y),nearV.z));
  float end=min(min(farV.x,farV.y),farV.z);
  vec3 col=vec3(0); float trans=1.0;
  if (end>start) {
    float stepSize=(end-start)/56.0;
    for (int i=0;i<56;++i) {
      vec3 p=eye+rd*(start+(float(i)+0.5)*stepSize);
      float rawDensity=inkDensity(p);
      float density=rawDensity*u_params[4];
      if (density<0.002) continue;
      float alpha=1.0-exp(-density*stepSize*3.2);
      // Saturated pigment, shaded by optical thickness. Secondary key on
      // the left, thin primary backlit layers; never averaged to grey.
      vec3 key=vec3(-0.35,0.55,-0.75);
      float neighbour=inkDensity(p+key*0.14);
      float back=exp(-(rawDensity+neighbour)*u_params[4]*1.8);
      float rim=clamp(abs(neighbour-rawDensity)*5.0,0.0,1.0);
      // Dark saturated pigment, with the primary confined to thin, lit
      // folds. Complementary anchors never average across the whole cloud.
      vec3 light=u_secondary*(0.14+0.9*back);
      light+=u_primary*rim*rim*back*2.7;
      float pulse=exp(-sq((p.y-(1.8-3.5*u_rhythm.z))/0.13))*u_rhythm.z;
      light+=u_accent*pulse*rim*0.65;
      col+=trans*alpha*light;
      trans*=1.0-alpha;
    }
  }
  // Backlight shafts stay behind the ink and are extinguished by it.
  float shafts=pow(0.5+0.5*sin(uv.x*14.0+0.3*sin(orbit)),18.0);
  bg+=u_secondary*shafts*0.065*gCloud*exp(-sq(uv.y-0.2));
  col+=trans*bg;
  // A tiny feeding drop on a closed, exactly periodic descent/return path.
  float fall=0.5+0.5*sin(gPhase);
  vec3 drop=vec3(0,1.9-0.55*fall,0);
  vec3 dv=drop-eye; float z=dot(dv,fw);
  vec2 dp=vec2(dot(dv,right),dot(dv,up))*focal/z;
  col+=u_primary*exp(-dot(uv-dp,uv-dp)/0.00018)*0.7*(1.0-gCloud);
  col*=1.0-0.16*smoothstep(0.7,1.8,length(uv));
  outColor=vec4(max(col,vec3(0)),1);
}
`;

export default {
  id: "ink", number: 112, name: "Ink Bloom",
  description: "A falling drop rolls into a descending vortex ring, branches into colliding plumes and fills a backlit tank with marbled ink clouds.",
  development: "development", schema, presets, fragment,
  precompute: {
    size: [640, 768],
    fragment: `${material}\n${lattice}
void main() {
  inkSetup();
  ivec2 pixel=ivec2(gl_FragCoord.xy);
  int z=(pixel.y/96)*8+pixel.x/80;
  ivec3 cell=ivec3(pixel.x%80,pixel.y%96,z);
  vec3 p=(vec3(cell)/(INK_GRID-1.0)*2.0-1.0)*INK_EXTENT;
  vec3 delta=2.0*INK_EXTENT/(INK_GRID-1.0);
  outColor=vec4(inkField(p).x,inkField(p+vec3(delta.x,0,0)).x,
    inkField(p+vec3(0,delta.y,0)).x,inkField(p+vec3(delta.xy,0)).x);
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
    familyEffect("ring-roll", 0, "Ring roll", "The existing vortex rim curls a little tighter.", { period: 4, strength: 0.55, duration: 1.5, kind: "motion" }),
    familyEffect("finger-reach", 1, "Finger reach", "The same ink fingers stretch into the water.", { period: 8, strength: 0.6, duration: 2.5, kind: "motion" }),
    familyEffect("pigment-wave", 2, "Pigment wave", "A narrow backlit pigment band travels down the existing plumes.", { period: 16, strength: 0.6, duration: 3 }),
  ],
};
