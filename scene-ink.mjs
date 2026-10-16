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

// The shared shader header's seedHash, transcribed for CPU references.
export function seedHash(value) {
  let v = value >>> 0;
  v ^= v >>> 16;
  v = Math.imul(v, 2246822519) >>> 0;
  v ^= v >>> 13;
  v = Math.imul(v, 3266489917) >>> 0;
  return (v ^ (v >>> 16)) >>> 0;
}
// Seed-derived cascade identity. Development never changes it: the same
// Widnall lobes become the same daughter rings in every state.
export function inkIdentity(seed) {
  const s = seed >>> 0;
  const lobes = 5 + ((s + 2) % 3);
  return {
    lobes,
    lobePhase: (((seedHash(s) % 1000) / 1000) * 2 * Math.PI) / lobes,
    daughterLobes: lobes > 5 ? 4 : 3,
    materialPhase: (s % 991) * 0.013,
  };
}
// Kaden's self-similar roll-up of a vortex sheet: rho/a = (c/theta)^(2/3).
// The shader draws sheets where Phi = c (rho/a)^(-3/2) - theta + roll = 2 pi k.
export const kadenPhase = (x, theta, c, roll = 0) =>
  c * x ** -1.5 - theta + roll;
export const kadenRadius = (theta, c) => (c / theta) ** (2 / 3);
// Widnall bending wave of the primary rim: [radius, height] at azimuth phi.
export function inkRim(phi, amplitude, lobes, lobePhase, radius = 1) {
  const w = Math.cos(lobes * (phi - lobePhase));
  return [radius * (1 + 0.55 * amplitude * w), -radius * amplitude * w];
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
// CPU transcription of the cascade schedule (shader inkCascade()).
export function inkCascade(development, finger = 0.9, level = 0.5, spread = 1) {
  const dev = Math.min(2, Math.max(0, development));
  const g1 = smooth(0, 1, dev),
    g2 = smooth(1, 2, dev);
  const reach = Math.min(finger, 1.4) * (0.85 + 0.3 * level);
  const lobeAmp = 0.035 + 0.15 * smooth(0, 0.55, g1) * reach;
  const bud = smooth(0.05, 0.95, g1),
    pinch = smooth(0.35, 0.95, g1);
  const radius = 1 + 0.3 * g2;
  const peak = [radius * (1 + 0.55 * lobeAmp), -radius * lobeAmp];
  return {
    g1,
    g2,
    lobeAmp,
    bud,
    pinch,
    peak,
    radius,
    // Born at the lobe peak; at the top state the daughters rise and roll
    // outward (a blooming crown).
    daughterCentre: [
      peak[0] + (0.35 * bud * reach + 0.55 * g2) * spread,
      peak[1] - 1.15 * bud * reach * (1 - 0.8 * g2) + 0.2 * g2,
    ],
    daughterTilt: 0.5 * bud + 1.0 * g2,
    daughterRadius: mix(0.05, 0.3, smooth(0.15, 0.85, g1)) + 0.06 * g2,
    neck: 1 - smooth(0.45, 0.9, pinch),
  };
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

// The visual flow in the ring's frame (R = 1, ring falling, water rising):
// a Gaussian-core ring whose atmosphere, Stokes Psi = r^2 (k e - U/2) > 0,
// is a torus of tube radius INK_ATMOS. The ink is material this flow carries.
export const INK_FLOW = Object.freeze({ k: 2.97, aa: 0.18, U: 0.7 });
export const INK_ATMOS = Math.sqrt(
  -INK_FLOW.aa * Math.log(INK_FLOW.U / (2 * INK_FLOW.k)),
);
export function inkStream(r, y, { k, aa, U } = INK_FLOW, radius = 1) {
  const h = r - radius;
  return r * r * (k * Math.exp(-(h * h + y * y) / aa) - U / 2);
}
// Level crossings of a smooth sheet function between two samples, plus the
// pair a fold hides inside one step: a parabola through the last three
// samples (offsets -h1, 0, h2) recovers the extremum. CPU twin of inkCross().
const inkFloorJs = (x, e) => Math.floor(x) + smooth(1 - e, 1, x - Math.floor(x));
export function inkCross(S0, S1, S2, h1, h2, e = 0) {
  let n = Math.abs(inkFloorJs(S2, e) - inkFloorJs(S1, e));
  if ((S1 - S0) * (S2 - S1) < 0) {
    const a = ((S2 - S1) / h2 + (S0 - S1) / h1) / (h1 + h2);
    const b = (S2 - S1) / h2 - a * h2;
    const tau = Math.min(h2, Math.max(-h1, -b / (2 * a)));
    const sx = S1 + b * tau + a * tau * tau;
    const F = (v) => inkFloorJs(v, e);
    n += Math.max(
      Math.abs(F(sx) - F(S0)) + Math.abs(F(S2) - F(sx)) -
        Math.abs(F(S1) - F(S0)) - Math.abs(F(S2) - F(S1)),
      0,
    );
  }
  return n;
}

const material = `${lateClockGlsl}
const float INK_K=${INK_FLOW.k.toFixed(4)}, INK_AA=${INK_FLOW.aa.toFixed(4)}, INK_U=${INK_FLOW.U.toFixed(4)}, INK_RS=${INK_ATMOS.toFixed(4)};
float gPhase, gG1, gG2, gSeed, gCurl, gFinger, gN, gLobe, gTurns, gRoll, gLobeAmp, gTau, gTurb, gDist, gPortrait;
float gRP, gBud, gRd, gTiltC, gTiltS, gDFade;
vec2 gLobeRot, gPeak, gDC;
vec3 gEye, gFw, gRight, gUp, gLight, gCentre;
vec3 gK[6], gA[6], gB[6];
float gP[6];
float inkNoise(vec3 p) {
  return dot(sin(p + sin(p.yzx)), vec3(0.36,0.32,0.32));
}
void inkCamera() {
#ifdef PHOSPHOR_LATE
  float orbit=u_clock[1];
#else
  float orbit=u_time*u_params[6]*0.09;
#endif
  orbit=mod(orbit,TAU);
  // A slow full orbit about the fall axis; elevation swings between a side
  // view and looking slightly down into the ring. Portrait looks more from
  // the side and frames the trailing wake above the ring.
  float az=orbit+0.35, el=mix(0.14+0.2*sin(2.0*orbit+0.6),0.06+0.12*sin(2.0*orbit+0.6),gPortrait);
  gCentre=vec3(0.0,0.42-0.62*gG1+0.5*gG2+gPortrait*(0.45-0.3*gG1),0.0);
  gDist=4.2*(1.0+0.1*gG1+0.3*gG2)*max(u_params[7],0.88);
  gEye=gCentre+gDist*vec3(cos(el)*sin(az),sin(el),cos(el)*cos(az));
  gFw=normalize(gCentre-gEye);
  gRight=normalize(cross(gFw,vec3(0,1,0)));
  gUp=cross(gRight,gFw);
  // The key light sits behind the ink, high and to the left: thin sheets
  // glow by forward scattering, folds and dense ink stay deep.
  vec3 key=normalize(vec3(-0.35,0.42,0.84));
  gLight=key.x*gRight+key.y*gUp+key.z*gFw;
}
void inkSetup() {
  float dev=clamp(u_params[0],0.0,2.0);
  gG1=smoothstep(0.0,1.0,dev);
  gG2=smoothstep(1.0,2.0,dev);
#ifdef PHOSPHOR_LATE
  gPhase=u_clock[0];
#else
  gPhase=u_time*u_params[1]*${INK_SPEED.toFixed(10)};
#endif
  gPhase=mod(gPhase,TAU);
  gSeed=float(u_seedBits % 991u)*0.013;
  gN=5.0+float((u_seedBits+2u)%3u);
  gLobe=float(seedHash(u_seedBits)%1000u)/1000.0*TAU/gN;
  gLobeRot=vec2(cos(gN*gLobe),sin(gN*gLobe));
  gCurl=u_params[2];
  gFinger=min(u_params[3],1.4)*(0.85+0.3*u_level)*(1.0+0.12*u_rhythm.y);
  // Energy winds more Kaden turns into the rim and carries the ink further.
  gTurns=1.6+2.4*u_level;
  gRoll=3.0*gPhase+0.9*u_rhythm.x;
  gTau=0.9+0.2*u_level;
  gTurb=(0.16+0.12*gCurl)*(0.65+0.6*u_level)*(1.0+0.35*gG2);
  // The cascade schedule (inkCascade() in JS): Widnall lobes grow, and the
  // daughters are born at the lobe peaks, fall away and at the top state
  // rise outward and roll over.
  gLobeAmp=0.035+0.15*smoothstep(0.0,0.55,gG1)*gFinger;
  gBud=smoothstep(0.05,0.95,gG1);
  gRP=1.0+0.3*gG2;
  gPeak=gRP*vec2(1.0+0.55*gLobeAmp,-gLobeAmp);
  gDC=vec2(gPeak.x+(0.35*gBud*gFinger+0.55*gG2)*u_params[5],
    gPeak.y-1.15*gBud*gFinger*(1.0-0.8*gG2)+0.2*gG2);
  gTiltC=cos(0.5*gBud+1.0*gG2); gTiltS=sin(0.5*gBud+1.0*gG2);
  gRd=mix(0.05,0.3,smoothstep(0.15,0.85,gG1))+0.06*gG2;
  gDFade=smoothstep(0.0,0.3,gBud);
  // Six seeded divergence-free plane waves: v = curl(env a sin(k.x+phase)).
  for (int i=0;i<6;++i) {
    uint h=seedHash(u_seedBits+uint(i)*7919u+101u);
    float a=float(h%1000u)/1000.0*TAU, z=float((h/1000u)%1000u)/500.0-1.0;
    vec3 dir=vec3(sqrt(1.0-z*z)*cos(a),z,sqrt(1.0-z*z)*sin(a));
    vec3 perp=normalize(cross(dir,abs(dir.y)<0.9?vec3(0,1,0):vec3(1,0,0)));
    float kk=i<3?2.3:5.1;
    gK[i]=dir*kk;
    gA[i]=perp*((i<3?1.0:0.18)/kk);
    gB[i]=cross(gK[i],gA[i]);
    gP[i]=float((h>>20u)%628u)*0.01+float(i%3+1)*(i%2==0?1.0:-1.0)*gPhase;
  }
  gPortrait=1.0-smoothstep(0.75,1.0,u_resolution.x/u_resolution.y);
  inkCamera();
}
// cos(n (phi - lobe)) without atan: Re(((x + i z)/r)^n e^(-i n lobe)).
float inkLobe(vec2 xz, float r) {
  vec2 c=xz/max(r,1e-5), z=c;
  for (int i=1;i<7;++i) {
    if (float(i)>=gN) break;
    z=vec2(z.x*c.x-z.y*c.y,z.x*c.y+z.y*c.x);
  }
  return z.x*gLobeRot.x+z.y*gLobeRot.y;
}
// Poloidal coordinates about the Widnall-bent core circle: (h, y, r).
vec3 inkPolar(vec3 p) {
  float r=length(p.xz), w=inkLobe(p.xz,r);
  return vec3(r-gRP*(1.0+0.55*gLobeAmp*w),p.y+gRP*gLobeAmp*w,r);
}
float inkPsi(vec3 q) {
  return q.z*q.z*(INK_K*exp(-dot(q.xy,q.xy)/INK_AA)-0.5*INK_U);
}
// The map's velocity is divergence-free (volume-preserving, it never
// thickens ink): the curl of the plane-wave potentials, strongest in the
// shear layer. The ring's own steady flow needs no map: its stream surfaces
// and Kaden roll-up are left invariant by it.
vec3 inkFlow(vec3 p) {
  float r=length(p.xz);
  // Axisymmetric envelope: this gradient is exact (including the curl's
  // envelope term), not an approximation to the bent material surface.
  vec3 q=vec3(r-gRP,p.y,r);
  float rho=max(length(q.xy),1e-4);
  vec2 er=p.xz/max(r,1e-5);
  float lo=0.1, hi=0.55, st=clamp((rho-lo)/(hi-lo),0.0,1.0);
  float env=gTurb*st*st*(3.0-2.0*st), denv=gTurb*6.0*st*(1.0-st)/(hi-lo);
  vec3 gradEnv=denv*vec3(q.x/rho*er.x,q.y/rho,q.x/rho*er.y);
  vec3 v=vec3(0);
  for (int i=0;i<6;++i) {
    float ph=dot(gK[i],p)+gP[i];
    v+=env*gB[i]*cos(ph)+cross(gradEnv,gA[i])*sin(ph);
  }
  return v;
}
// Where the ink at p was a fixed time gTau ago (RK2, backward).
const int INK_MAP_STEPS=3;
vec3 inkOrigin(vec3 p) {
  float dt=gTau/float(INK_MAP_STEPS);
  vec3 x=p;
  for (int i=0;i<INK_MAP_STEPS;++i) {
    vec3 k1=inkFlow(x);
    x-=dt*inkFlow(x-0.5*dt*k1);
  }
  return x;
}
// The nearest Widnall lobe's daughter ring in its own scaled, tilted frame:
// Stokes function (its skin and its wake back toward the parent) and the
// signed distance to its rolled rim. Far away and near the sector seams it
// fades to a level without sheets, so neighbouring lobes never meet.
vec3 inkDaughter(vec3 X) {
  if (gDFade<0.001) return vec3(-1.0,9.0,1.0);
  float r=length(X.xz), phi=atan(X.z,X.x+1e-9), sector=TAU/gN;
  float dphi=phi-gLobe-floor((phi-gLobe)/sector+0.5)*sector;
  vec3 l=vec3(r*cos(dphi)-gDC.x,X.y-gDC.y,r*sin(dphi))/gRd;
  l.xy=mat2(gTiltC,-gTiltS,gTiltS,gTiltC)*l.xy;
  float rl=length(l.xz), hl=rl-1.0, rho2=hl*hl+l.y*l.y;
  float Psi=rl*rl*(INK_K*exp(-rho2/INK_AA)-0.5*INK_U);
  float fade=gDFade*smoothstep(0.05,0.3,r*sin(0.5*sector-abs(dphi)))
    *smoothstep(-1.2,-0.4,l.y)*(1.0-smoothstep(2.0,3.5,l.y));
  float e=exp(-rho2/INK_AA), f=INK_K*e-0.5*INK_U, rr=max(rl,1e-3);
  float g=length(vec2(2.0*rr*f-2.0*rr*rr*INK_K*e*hl/INK_AA,-2.0*rr*rr*INK_K*e*l.y/INK_AA));
  return vec3(mix(-1.0,max(Psi,-1.0),fade),(sqrt(rho2)-0.15)*gRd+(1.0-fade)*2.0,
    max(g*fade,0.05)/gRd);
}
// The torn-coverage noise of an origin: holes fast across stream surfaces;
// outside the atmosphere the pattern rides up with the water.
float inkCoverNoise(vec3 X, vec3 q, float Psi) {
  float rho=length(q.xy), outside=smoothstep(INK_RS,INK_RS+0.25,rho);
  vec3 cq=vec3(X.x*2.6,X.y*1.4+Psi*1.5,X.z*2.6)+vec3(gSeed,0.0,0.0);
  float nIn=outside<0.999?inkNoise(cq):0.0;
  vec3 cw=vec3(X.x*3.0,X.y*1.2,X.z*3.0)+vec3(gSeed+sin(2.0*gPhase),cos(2.0*gPhase),0.0);
  float nOut=outside>0.001?inkNoise(cw):0.0;
  return mix(nIn,nOut,outside);
}
`;
const lattice = `
// Box of the cached fields: the primary, its wake and the daughters.
vec3 inkExtent() {
  float lo=-1.6-0.9*gG1+0.5*gG2, hi=3.4-0.4*gG1;
  float rr=1.9+0.6*gG1+0.9*gG2;
  return vec3(rr,0.5*(hi-lo),rr);
}
vec3 inkOffset() { return vec3(0.0,0.5*(1.8-1.3*gG1+0.5*gG2),0.0); }
const vec3 INK_GRID=vec3(48,64,48);
const vec2 INK_TILE=vec2(50,66);
const vec2 INK_ATLAS=vec2(800,198);
vec2 inkAddress(vec2 xy, float z) {
  return (vec2(mod(z,16.0),floor(z/16.0))*INK_TILE+xy+1.5)/INK_ATLAS;
}
float inkCellSize() {
  vec3 c=2.0*inkExtent()/(INK_GRID-1.0);
  return max(c.x,max(c.y,c.z));
}
// The cache holds only the smooth backward map (displacement to the ink's
// origin a fixed time ago, nearly constant across a cell, so trilinear
// interpolation adds no facets) and a conservative distance to any ink:
// the rim tube, the nearest primary or daughter sheet level (first order)
// and the daughter's rim. The pixel pass applies the sharp sheet functions
// to the interpolated origin.
vec4 inkCell(vec3 p) {
  vec3 X=inkOrigin(p), q=inkPolar(X);
  float Psi=inkPsi(q);
  vec3 d=inkDaughter(X);
  float rho=length(q.xy), r=max(q.z,1e-3), e=exp(-rho*rho/INK_AA), f=INK_K*e-0.5*INK_U;
  vec2 gPsi=vec2(2.0*r*f-2.0*r*r*INK_K*e*q.x/INK_AA,-2.0*r*r*INK_K*e*q.y/INK_AA);
  float bandP=max(min(abs(Psi-0.06),abs(Psi+0.06))-0.004,0.0)/max(length(gPsi),0.3);
  float bandD=max(min(abs(d.x-0.06),abs(d.x+0.06))-0.004,0.0)/d.z;
  float wake=max(-0.6-X.y,X.y-3.2);
  float dist=max(min(min(rho-0.45,bandP),min(bandD,max(d.y,0.0))),wake);
  return vec4(p-X,0.7*max(dist,0.0));
}
`;
const fragment = `${material}\n${lattice}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec4 inkSample(vec3 p, vec3 offset, vec3 bound) {
#ifdef PRECOMPUTED
  vec3 cell=clamp(((p-offset)/bound*0.5+0.5)*(INK_GRID-1.0),vec3(0),INK_GRID-1.001);
  float z=floor(cell.z);
  vec4 a=texture(u_precomputed,inkAddress(cell.xy,z));
  vec4 b=texture(u_precomputed,inkAddress(cell.xy,z+1.0));
  return mix(a,b,fract(cell.z));
#else
  return inkCell(p);
#endif
}
float inkPhase(float mu, float g) {
  return (1.0-g*g)/pow(1.0+g*g-2.0*g*mu,1.5);
}
// A finite-thickness Gaussian sheet, filtered over the ray footprint.
float inkSheet(float distance, float width, float footprint) {
  float w=sqrt(width*width+footprint*footprint);
  return exp(-sq(distance/w))*width/w;
}
const int INK_STEP_CAP=96;
void main() {
  inkSetup();
  float aspect=u_resolution.x/u_resolution.y;
  vec2 uv=(v_uv-0.5)*u_resolution/min(u_resolution.x,u_resolution.y)*2.0;
  float aspectFit=aspect<1.0?mix(0.72,1.0,aspect):0.92+0.08*smoothstep(1.0,1.6,aspect);
  float focal=(2.4+0.048*u_kick)*aspectFit;
  vec3 rd=normalize(gFw*focal+gRight*uv.x+gUp*uv.y), eye=gEye;
  float pix=2.0/(focal*min(u_resolution.x,u_resolution.y));
  // Two inks from the palette: thin dye is the saturated primary (pale
  // primaries are cubed and renormalized, never beige or white), dense dye
  // the deep secondary.
  float topP=max(max(u_primary.r,u_primary.g),max(u_primary.b,0.04));
  vec3 thin=u_primary*u_primary*u_primary/(topP*topP);
  float top=max(max(u_secondary.r,u_secondary.g),max(u_secondary.b,0.04));
  vec3 deep=u_secondary*u_secondary/top;
  // The dark tank: a faint glow behind the ring, and old diluted ink rising
  // past the falling drop in three parallax layers of torn veils.
#ifdef PHOSPHOR_LATE
  float orbit=u_clock[1];
#else
  float orbit=u_time*u_params[6]*0.09;
#endif
  orbit=mod(orbit,TAU);
  vec3 cr=vec3(0.0,0.1+0.5*gG2,0.0)-eye;
  vec2 ringScreen=vec2(dot(cr,gRight),dot(cr,gUp))/max(dot(cr,gFw),0.2)*focal;
  vec2 dl=uv-ringScreen-vec2(-0.3,0.35);
  vec3 bg=thin*0.035*exp(-0.7*dot(dl,dl))+deep*0.008;
  float haze=0.0;
  for (int k=0;k<3;++k) {
    float fk=float(k+1);
    vec2 h=uv*(0.6+0.55*fk)+vec2(sin(fk*orbit),cos((1.0+fk)*gPhase));
    float v=inkNoise(vec3(h,gSeed+1.3*fk));
    float c=inkNoise(vec3(h.yx,gSeed+4.0+fk));
    haze+=pow(1.0-abs(v),8.0+2.0*fk)*smoothstep(0.0,0.5,c)*(0.02+0.012*fk);
  }
  bg+=mix(deep,thin,0.5)*haze*(0.6+0.4*u_level);

  vec3 bound=inkExtent(), offset=inkOffset();
  vec3 inv=sign(rd+vec3(1e-8))/max(abs(rd),vec3(1e-6));
  vec3 lo=(offset-bound-eye)*inv, hi=(offset+bound-eye)*inv;
  vec3 nearV=min(lo,hi), farV=max(lo,hi);
  float start=max(0.0,max(max(nearV.x,nearV.y),nearV.z));
  float end=min(min(farV.x,farV.y),farV.z);
  vec3 col=vec3(0);
  float trans=1.0;
  float mu=dot(rd,gLight), phase=0.08+0.92*inkPhase(mu,0.6)/inkPhase(1.0,0.6);
  float sigmaScale=u_params[4];
  float bandY=3.0-4.4*(1.0-u_rhythm.z);
  // The engine's ray-step budget (96, or 64/40 under load): coarse steps,
  // with crispness from the sharp transfer functions, not from step length.
  int limit=int(min(float(INK_STEP_CAP),0.75*u_raySteps));
  float budget=96.0/clamp(u_raySteps,16.0,96.0);
  float skipMargin=0.6*length(2.0*bound/(INK_GRID-1.0))+0.01;
  float focusT=length(gCentre-eye);
  if (end>start) {
    float t=start+0.035*budget;
    for (int i=0;i<INK_STEP_CAP;++i) {
      if (i>=limit || t>end || trans<0.08) break;
      vec3 p=eye+rd*t;
      vec4 A=inkSample(p,offset,bound);
      float skip=A.w-skipMargin;
      // The padded distance excludes empty water, never the soft dye fringe.
      if (skip>0.0) { t+=clamp(skip,0.03,0.6); continue; }
      // The ink here is whatever the flow carried from X.
      vec3 X=p-A.xyz;
      // Small material-space shear breaks smooth balloon skins without
      // differentiating the coarse cache or introducing temporal grain.
      float fray=inkNoise(X*10.0+vec3(gSeed,sin(gPhase),cos(gPhase)));
      X.y+=0.035*(0.35+u_level)*fray;
      vec3 q=inkPolar(X);
      float PsiP=inkPsi(q), Xy=X.y;
      vec3 dau=inkDaughter(X);
      float nCov=inkCoverNoise(X,q,PsiP);
      vec2 hy=q.xy;
      float rho=length(hy), r=max(q.z,1e-3);
      float e=exp(-rho*rho/INK_AA), f=INK_K*e-0.5*INK_U;
      vec2 gPsi=vec2(2.0*r*f-2.0*r*r*INK_K*e*hy.x/INK_AA,-2.0*r*r*INK_K*e*hy.y/INK_AA);
      float stepLen=0.075*budget;
      float fp=max(t*pix+0.0015*abs(t-focusT),stepLen*0.28);
      float phi=atan(X.z,X.x+1e-9), theta=atan(hy.y,hy.x);
      // Kaden winding remains visible as broad internal folds, rather than
      // quantized crossing contours. All dye is a volume, never a surface.
      float x=max(rho/0.2,0.35);
      float K=gTurns/(x*sqrt(x));
      float S1=(K+gRoll-theta)/TAU;
      float winding=0.5+0.5*sin(TAU*S1+1.4*nCov);
      float mist=inkNoise(X*7.0+vec3(gSeed,0.0,0.0));
      // Stretched meridian filaments, warped by the same material map.
      // Their density changes with energy; no per-frame random jitter.
      float strand=0.5+0.5*sin(23.0*phi+3.0*theta+5.0*nCov+4.0*mist+gRoll);
      float fine=0.5+0.5*sin(53.0*phi+7.0*theta+4.0*mist);
      float striation=mix(0.35,1.8,strand*strand)*(0.65+0.7*u_level*fine*fine);
      float coverage=smoothstep(0.0,0.38,nCov+0.5*mist);
      // The axial separatrix is not an infinitely long ink pipe: the wake
      // dilutes and tears above the ring, before the cache's border.
      float wake=(1.0-smoothstep(0.65,1.85,Xy))
        *smoothstep(-1.0,-0.45,Xy);
      float dP=(abs(PsiP)-0.06)/max(length(gPsi),0.3);
      float dD=(abs(dau.x)-0.06)/max(dau.z,0.3);
      float sheetP=inkSheet(dP,0.025,fp)*wake;
      float sheetD=inkSheet(dD,0.025,fp)*gDFade
        *(1.0-smoothstep(0.08,0.25,dau.y));
      float fold=exp(-sq((rho-0.40-0.09*mist)/0.14));
      float tauS=(3.0*sheetP+4.5*sheetD+fold*(0.1+0.5*winding))
        *coverage*striation*stepLen;
      float core=exp(-sq(rho/0.17));
      float tauC=core*(1.0+0.7*mist)*8.0*stepLen;
      float tau=(tauS+tauC)*sigmaScale;
      if (tau>1e-4) {
        float a=1.0-exp(-tau);
        float band=u_rhythm.z>0.001?exp(-sq((Xy-bandY)/0.26))*u_rhythm.z:0.0;
        float inkMix=smoothstep(-0.08,0.25,nCov+0.3*sin(3.0*phi+Xy));
        vec3 dye=mix(mix(thin,deep,inkMix),u_accent,0.8*band);
        float shadow=exp(-2.4*(1.0-smoothstep(0.1,INK_RS,rho)));
        vec3 lightS=dye*(0.12+6.0*phase*shadow*exp(-0.7*tauS));
        vec3 lightC=deep*(0.04+0.12*phase);
        vec3 light=(lightS*tauS+lightC*tauC)/max(tauS+tauC,1e-5);
        col+=trans*a*light;
        trans*=1.0-a;
      }
      t+=stepLen;
    }
  }
  col+=trans*bg;
  col*=1.0-0.25*smoothstep(0.8,2.1,length(uv));
  outColor=vec4(max(col,vec3(0)),1);
}
`;

export default {
  id: "ink",
  number: 112,
  name: "Ink Bloom",
  description:
    "A falling drop rolls into a vortex ring whose Widnall lobes pinch off into a crown of daughter rings, each shedding silk bells in a dark tank.",
  development: "development",
  schema,
  presets,
  fragment,
  precompute: {
    size: [800, 198],
    filter: "linear",
    format: "rgba16f",
    fragment: `${material}\n${lattice}
void main() {
  inkSetup();
  ivec2 pixel=ivec2(gl_FragCoord.xy);
  int py=pixel.y;
  int z=(py/66)*16+pixel.x/50;
  // A duplicate-node gutter isolates each Z slice under bilinear filtering.
  vec3 cell=vec3(clamp(pixel.x%50-1,0,47),clamp(py%66-1,0,63),z);
  vec3 p=(cell/(INK_GRID-1.0)*2.0-1.0)*inkExtent()+inkOffset();
  outColor=inkCell(p);
}`,
  },
  type: { key: "development", values: [0, 1, 2] },
  stage: ["curl", "fingers", "opacity"],
  energy: { flow: { mul: [0.65, 1.3] }, orbit: { mul: [0.8, 1.25] } },
  beat: { punch: 0.08, pulse: 0.08 },
  clocks: [
    { rate: (p) => p[1] * INK_SPEED, period: 2 * Math.PI },
    { rate: (p) => p[6] * 0.09, period: 2 * Math.PI },
  ],
  rhythmStyles: { restrained: "Suspended pigment", driving: "Vortex bloom", accented: "Widnall flourish" },
  rhythm: [
    familyEffect(
      "ring-roll",
      0,
      "Ring roll",
      "The wound sheets of every vortex core roll a step further and catch the light.",
      { period: 4, strength: 0.55, duration: 1.5, kind: "motion", steps: "X...", styles: {
        restrained: { steps: "X....... | ......x. | ...X.... | ........", division: 2, strength: 0.48, duration: 1.7 },
        driving: { steps: "X.....x. | ...X.... | .x....X. | .....x..", division: 2, strength: 0.7, duration: 0.9 },
        accented: { steps: "X........x...... | ....X.......x... | ..X.......x..... | ......X.......x.", division: 4, strength: 0.84, duration: 0.4 },
      } },
    ),
    familyEffect(
      "finger-reach",
      1,
      "Finger reach",
      "The Widnall lobes and daughter rings stretch a little further from the rim.",
      { period: 8, strength: 0.6, duration: 2.5, kind: "motion", steps: "X.......", styles: {
        restrained: { steps: "....x... | ........ | .......X | ........", division: 2, strength: 0.5, duration: 2 },
        driving: { steps: "....X... | .......x | ........ | .....X..", division: 2, strength: 0.72, duration: 1.5 },
        accented: { steps: ".......X........ | .............x.. | .....X.......... | ...........x...X", division: 4, strength: 0.86, duration: 0.8 },
      } },
    ),
    familyEffect(
      "pigment-wave",
      2,
      "Pigment wave",
      "A narrow backlit pigment band travels down the cascade, generation by generation.",
      { period: 16, strength: 0.6, duration: 3, steps: "X...............", styles: {
        restrained: { steps: "........ | .....x.. | ........ | ..X.....", division: 2, strength: 0.5, duration: 1.8 },
        driving: { steps: "........ | .....x.X | ........ | ....x.xX", division: 2, strength: 0.76, duration: 0.4 },
        accented: { steps: "................ | ..........x.X.xx | ................ | .........X.x.XXX", division: 4, strength: 0.92, duration: 0.18 },
      } },
    ),
  ],
};
