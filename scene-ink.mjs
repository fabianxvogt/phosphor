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

// Reversible affine plume coordinates. The same transform applies to the
// native volume, feed streams and shed pigment; no state-dependent reset.
export function inkPlumePoint([x, y, z], development, inverse = false) {
  const crown = smooth(1, 2, Math.min(2, Math.max(0, development)));
  const height = 1.3 + 0.5 * crown;
  if (inverse) {
    x /= 1.08;
    z /= 0.9;
    return [x, (y - 0.55 * x - 0.22 * z) / height, z];
  }
  return [1.08 * x, height * y + 0.55 * x + 0.22 * z, 0.9 * z];
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
// samples (offsets -h1, 0, h2) recovers the extremum. Retained as a legacy
// mathematical reference; the renderer now integrates finite dye volumes.
const inkFloorJs = (x, e) =>
  Math.floor(x) + smooth(1 - e, 1, x - Math.floor(x));
export function inkCross(S0, S1, S2, h1, h2, e = 0) {
  let n = Math.abs(inkFloorJs(S2, e) - inkFloorJs(S1, e));
  if ((S1 - S0) * (S2 - S1) < 0) {
    const a = ((S2 - S1) / h2 + (S0 - S1) / h1) / (h1 + h2);
    const b = (S2 - S1) / h2 - a * h2;
    const tau = Math.min(h2, Math.max(-h1, -b / (2 * a)));
    const sx = S1 + b * tau + a * tau * tau;
    const F = (v) => inkFloorJs(v, e);
    n += Math.max(
      Math.abs(F(sx) - F(S0)) +
        Math.abs(F(S2) - F(sx)) -
        Math.abs(F(S1) - F(S0)) -
        Math.abs(F(S2) - F(S1)),
      0,
    );
  }
  return n;
}

// CPU reference for native compact-sheet quadrature. The quartic kernel
// approximates a Gaussian but has finite support and a polynomial integral.
export function inkSheetIntegral(d0, d1, width, length) {
  const cdf = (x) => {
    const q = Math.max(-1, Math.min(1, 0.6 * x));
    return q * (1.875 + q * q * (-1.25 + 0.375 * q * q));
  };
  const dd = d1 - d0;
  if (Math.abs(dd) < 0.0001 * width) {
    const q = 0.6 * ((0.5 * (d0 + d1)) / width);
    return length * Math.max(1 - q * q, 0) ** 2;
  }
  return (length * (8 / 9) * width * (cdf(d1 / width) - cdf(d0 / width))) / dd;
}
export function inkAngle([x, y]) {
  const ax = Math.abs(x),
    ay = Math.abs(y);
  const t = Math.min(ax, ay) / Math.max(ax, ay, 1e-8),
    s = t * t;
  let r = t * (1 + s * (-0.327622764 + s * (0.15931422 - 0.046496475 * s)));
  if (ay > ax) r = 0.5 * Math.PI - r;
  if (x < 0) r = Math.PI - r;
  return y < 0 ? -r : r;
}
export function inkEventProgress(envelope, strength = 0.9) {
  const y = Math.max(0, Math.min(1, envelope / strength));
  return 0.5 + Math.sin(Math.asin(1 - 2 * y) / 3);
}

const material = `${lateClockGlsl}
const float INK_K=${INK_FLOW.k.toFixed(4)}, INK_AA=${INK_FLOW.aa.toFixed(4)}, INK_U=${INK_FLOW.U.toFixed(4)}, INK_RS=${INK_ATMOS.toFixed(4)};
float gPhase, gG1, gG2, gSeed, gCurl, gFinger, gN, gLobe, gTurns, gRoll, gLobeAmp, gTau, gTurb, gDist, gPortrait;
float gRP, gBud, gRd, gTiltC, gTiltS, gDFade, gOrbit;
// Rhythm-derived event state: ink-burst progress/sector/bulge, ring-roll sweep.
float gBurst, gBurstPr, gBulge, gSweep, gSweepPhi, gFacing;
vec2 gLobeRot, gPeak, gDC, gBurstXZ;
vec3 gEye, gFw, gRight, gUp, gLight, gCentre;
vec3 gK[6], gA[6], gB[6];
float gP[6];
float inkNoise(vec3 p) {
  return dot(sin(p + sin(p.yzx)), vec3(0.36,0.32,0.32));
}
// Range-reduced angle approximation; max error <0.00021 rad. Native sheet
// phase needs continuity, not hardware atan at every interval of every ray.
float inkAngle(vec2 p) {
  vec2 a=abs(p);
  float t=min(a.x,a.y)/max(max(a.x,a.y),1e-8), s=t*t;
  float r=t*(1.0+s*(-0.327622764+s*(0.15931422-0.046496475*s)));
  if (a.y>a.x) r=0.25*TAU-r;
  if (p.x<0.0) r=0.5*TAU-r;
  return p.y<0.0?-r:r;
}
// Envelope e = A*smoothstep(1-progress): recover progress for a full hit.
float inkProgress(float envelope, float strength) {
  float y=clamp(envelope/strength,0.0,1.0);
  return 1.0-(0.5-sin(asin(1.0-2.0*y)/3.0));
}
void inkCamera() {
#ifdef PHOSPHOR_LATE
  float orbit=u_clock[1];
#else
  float orbit=u_time*u_params[6]*0.09;
#endif
  orbit=mod(orbit,TAU);
  gOrbit=orbit;
  // A slow full orbit about the fall axis, looking slightly down into the
  // ring. The centre and distance follow each state's bounding box so the
  // cascade fills about three quarters of the short side.
  float az=orbit+0.35, el=mix(0.2+0.12*sin(2.0*orbit+0.6),0.1+0.08*sin(2.0*orbit+0.6),gPortrait);
  gCentre=vec3(0.0,0.40-0.60*gG1+0.35*gG2+gPortrait*(0.15-0.1*gG1),0.0);
  gCentre.y*=1.3+0.5*gG2;
  gDist=4.55*(1.0+0.16*gG1+0.18*gG2)*max(u_params[7],0.88)*(1.0+0.14*gPortrait);
  gEye=gCentre+gDist*vec3(cos(el)*sin(az),sin(el),cos(el)*cos(az));
  gFw=normalize(gCentre-gEye);
  gRight=normalize(cross(gFw,vec3(0,1,0)));
  gUp=cross(gRight,gFw);
  gFacing=atan(gEye.z,gEye.x);
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
  gFinger=min(u_params[3],1.4)*(0.85+0.3*u_level)*(1.0+0.45*u_rhythm.y);
  // Energy winds more Kaden turns into the rim and carries the ink further.
  gTurns=1.6+2.4*u_level;
  gRoll=3.0*gPhase+1.2*u_rhythm.x;
  gTau=0.9+0.2*u_level;
  gTurb=(0.12+0.1*gCurl)*(0.6+0.6*u_level)*(1.0+0.15*gG2);
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
  // Ink burst: the event count picks one of three rim sectors around the one
  // facing the camera; the envelope drives a single packet's flight.
  gBurst=clamp(u_rhythm.w,0.0,1.0);
  gBurstPr=gBurst>0.001?inkProgress(gBurst,0.9):1.0;
  float bphi=gFacing+0.85*(mod(u_rhythmCount.w,3.0)-1.0)+0.25;
  gBurstXZ=vec2(cos(bphi),sin(bphi));
  // The rim sector curls out at the hit and relaxes as the packet leaves.
  gBulge=gBurst>0.001?smoothstep(0.0,0.08,gBurstPr)*(1.0-smoothstep(0.15,0.7,gBurstPr)):0.0;
  // Ring roll: a highlight sweeps half way round the rolled rim.
  gSweep=clamp(u_rhythm.x,0.0,1.0);
  gSweepPhi=gFacing-1.7+3.4*(gSweep>0.001?inkProgress(gSweep,0.84):1.0);
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
// Poloidal coordinates about the Widnall-bent core circle: (h, y, r). The
// burst sector bulges the rim outward and down while it sheds its packet.
vec3 inkPolar(vec3 p) {
  float r=length(p.xz), w=inkLobe(p.xz,r);
  float bulge=0.16*gBulge*exp(9.0*(dot(p.xz,gBurstXZ)/max(r,1e-5)-1.0));
  return vec3(r-gRP*(1.0+0.55*gLobeAmp*w)-bulge,p.y+gRP*gLobeAmp*w+0.6*bulge,r);
}
vec3 inkPlume(vec3 p) {
  return vec3(1.08*p.x,(1.3+0.5*gG2)*p.y+0.55*p.x+0.22*p.z,0.9*p.z);
}
vec3 inkUnplume(vec3 p) {
  p.x/=1.08; p.z/=0.9;
  p.y=(p.y-0.55*p.x-0.22*p.z)/(1.3+0.5*gG2);
  return p;
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
  // Shear belongs to the dye atmosphere, not the whole tank. Include both
  // product-rule terms so the compact vector-potential curl stays solenoidal.
  float outer=clamp((rho-0.55)/0.45,0.0,1.0);
  float fall=1.0-outer*outer*(3.0-2.0*outer);
  denv=denv*fall-env*6.0*outer*(1.0-outer)/0.45;
  env*=fall;
  vec3 gradEnv=denv*vec3(q.x/rho*er.x,q.y/rho,q.x/rho*er.y);
  vec3 v=vec3(0);
  for (int i=0;i<6;++i) {
    float ph=dot(gK[i],p)+gP[i];
    v+=env*gB[i]*cos(ph)+cross(gradEnv,gA[i])*sin(ph);
  }
  return v;
}
// Where the ink at p was a fixed time gTau ago (RK2, backward).
const int INK_MAP_STEPS=2;
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
// local poloidal coordinates (h, y, r) in daughter radii, and a fade that is
// zero near the sector seams, so neighbouring lobes never meet.
vec3 inkDaughter(vec3 X, out float fade) {
  fade=0.0;
  if (gDFade<0.001) return vec3(9.0,9.0,1.0);
  float r=length(X.xz), phi=atan(X.z,X.x+1e-9), sector=TAU/gN;
  float dphi=phi-gLobe-floor((phi-gLobe)/sector+0.5)*sector;
  vec3 l=vec3(r*cos(dphi)-gDC.x,X.y-gDC.y,r*sin(dphi))/gRd;
  l.xy=mat2(gTiltC,-gTiltS,gTiltS,gTiltC)*l.xy;
  float rl=length(l.xz);
  fade=gDFade*smoothstep(0.08,0.3,r*sin(0.5*sector-abs(dphi)));
  float a=atan(l.z,l.x+1e-8);
  float fingers=0.035+0.085*u_level;
  float curl=fingers*sin(4.0*a+gPhase+gSeed);
  return vec3(rl-1.0-curl,l.y+0.7*curl,rl);
}
// One ring at poloidal coordinates (h, y, r) in units of its radius: signed
// world distance to its skin sheet inside the atmosphere, and the Kaden
// roll-up phase parts (K, theta), the phase gradient (world) and rho.
vec4 inkRing(vec3 q, float scale, float turns, out float skin) {
  float rho=length(q.xy), r=max(q.z,1e-3);
  float e=exp(-rho*rho/INK_AA), f=INK_K*e-0.5*INK_U;
  vec2 gPsi=vec2(2.0*r*f-2.0*r*r*INK_K*e*q.x/INK_AA,-2.0*r*r*INK_K*e*q.y/INK_AA);
  skin=(r*r*f-0.4)/max(length(gPsi),0.35)*scale;
  float theta=inkAngle(q.xy);
  float x=max(rho/0.2,0.35);
  float K=turns/(x*sqrt(x));
  float rr=max(rho,0.03);
  return vec4(K,theta,sqrt(sq(1.5*K/rr)+1.0/(rr*rr))/scale,rho);
}
`;
const lattice = `
// Box of the cached map: the primary, its skin and the daughters.
vec3 inkExtent() {
  float lo=-1.35-1.0*gG1+0.85*gG2, hi=1.3+0.2*gG2;
  float rr=2.15+0.35*gG1+1.0*gG2;
  return vec3(rr,0.5*(hi-lo),rr);
}
vec3 inkOffset() { return vec3(0.0,0.5*(-0.05-1.0*gG1+1.05*gG2),0.0); }
const vec3 INK_GRID=vec3(48,80,48);
const vec2 INK_TILE=vec2(50,82);
const vec2 INK_ATLAS=vec2(800,246);
vec2 inkAddress(vec2 xy, float z) {
  return (vec2(mod(z,16.0),floor(z/16.0))*INK_TILE+xy+1.5)/INK_ATLAS;
}
// Two smooth poloidal coordinate pairs, never sampled colour or density.
// The expensive transported lobe/sector maps run here; native quadrature
// resolves sheets below a voxel's width without a blurry density cache.
vec4 inkCell(vec3 p) {
  vec3 X=inkOrigin(p);
  vec3 q=inkPolar(X);
  q.xy+=0.05*(0.6+u_level)*vec2(inkNoise(X*8.0+gSeed),inkNoise(X.zxy*9.0-gSeed));
  float front=1.6-3.6*(u_rhythm.z>0.001?inkProgress(u_rhythm.z,0.9):1.0);
  q.xy+=vec2(0.025,0.065)*u_rhythm.z*exp(-sq((p.y-front)/0.35));
  float fade;
  vec3 dl=inkDaughter(X,fade);
  vec2 daughter=fade>0.001?dl.xy/max(fade,0.03):vec2(9);
  return vec4(q.xy,daughter);
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
float inkCdf(float x) {
  float q=clamp(0.6*x,-1.0,1.0), q2=q*q;
  return q*(1.875+q2*(-1.25+0.375*q2));
}
// A compact quartic sheet integrated exactly along d0 -> d1. Finite
// support preserves crisp edges without per-interval exp/sqrt evaluation.
float inkSheet(float d0, float d1, float w, float len) {
  float dd=d1-d0;
  if (abs(dd)<0.0001*w) return len*sq(max(1.0-sq(0.6*0.5*(d0+d1)/w),0.0));
  return len*(8.0/9.0)*w*(inkCdf(d1/w)-inkCdf(d0/w))/dd;
}
// Kaden sheets lie at phase F = K - theta + roll = 2 pi k. A periodic train
// of compact sheets integrated exactly along a step whose (unwrapped)
// phase runs linearly f0 -> f1: crisp curling lines, never slice moire.
float inkTrain(float f, float wf) {
  float n=floor(f/TAU+0.5);
  return (8.0/9.0)*wf*(2.0*n+inkCdf((f-TAU*n)/wf));
}
float inkSpiral(float f0, float f1, float wf, float len) {
  float df=f1-f0;
  if (abs(df)<0.0001*wf) {
    float m=0.5*(f0+f1);
    m-=TAU*floor(m/TAU+0.5);
    return len*sq(max(1.0-sq(0.6*m/wf),0.0));
  }
  return len*(inkTrain(f1,wf)-inkTrain(f0,wf))/df;
}
float inkWrap(float a) { return a-TAU*floor(a/TAU+0.5); }
// Conservative ray/sphere rejection for compact strand groups.
bool inkMiss(vec3 ro, vec3 rd, vec3 centre, float radius) {
  vec3 d=centre-ro;
  float t=max(dot(d,rd),0.0);
  vec3 q=d-rd*t;
  return dot(q,q)>radius*radius;
}
// A Gaussian tube of radius s about segment a->b, integrated along the ray:
// x = integral, y = ray depth of closest approach.
vec2 inkTube(vec3 ro, vec3 rd, vec3 a, vec3 b, float s) {
  vec3 ba=b-a;
  float len=max(length(ba),1e-4), h=0.2*len;
  if (inkMiss(ro,rd,0.5*(a+b),0.7*len+3.0*s)) return vec2(0);
  vec3 u=ba/len, w0=ro-a;
  float bd=dot(rd,u), d=dot(rd,w0), e=dot(u,w0), den=max(1.0-bd*bd,1e-4);
  float tl=(e-bd*d)/den, tc=clamp(tl,-h,len+h);
  vec3 c=a+u*tc;
  float t=dot(c-ro,rd);
  float dist2=dot(ro+rd*t-c,ro+rd*t-c);
  if (dist2>9.0*s*s) return vec2(0);
  // Overlapping linear windows sum to one across a shared joint.
  float win=clamp((tl+h)/(2.0*h),0.0,1.0)*clamp((len-tl+h)/(2.0*h),0.0,1.0);
  return vec2(1.7725*s*exp(-dist2/(s*s))*win/max(sqrt(den),0.2),t);
}
// A Gaussian ball of radius s integrated along the ray: x = integral,
// y = depth of closest approach.
vec2 inkBall(vec3 ro, vec3 rd, vec3 c, float s) {
  float t=dot(c-ro,rd);
  vec3 d=ro+rd*t-c;
  if (dot(d,d)>9.0*s*s) return vec2(0);
  return vec2(1.7725*s*exp(-dot(d,d)/(s*s)),t);
}
vec3 inkLocal(vec2 cs, vec3 l) {
  return vec3(l.x*cs.x-l.z*cs.y,l.y,l.x*cs.y+l.z*cs.x);
}
// Thin analytic strands composited front/back of the focus plane: the
// drop's twisted stem, the tendrils from each Widnall lobe to its daughter,
// and the ink-burst packet with its unrolling filaments.
vec4 gFrontC, gBackC;
void inkLayer(float integral, float t, vec3 colour, float sigma) {
  float a=1.0-exp(-sigma*integral);
  if (t<gDist) { gFrontC.rgb+=gFrontC.a*a*colour; gFrontC.a*=1.0-a; }
  else { gBackC.rgb+=gBackC.a*a*colour; gBackC.a*=1.0-a; }
}
float inkWidth(float base, float t) {
  return base*(1.0+0.2*max(t-gDist,0.0));
}
vec3 inkBez(vec3 a, vec3 b, vec3 c, float t) {
  return mix(mix(a,b,t),mix(b,c,t),t);
}
// A quadratic strand a-b-c as four tapered tube segments.
void inkCurve(vec3 ro, vec3 rd, vec3 a, vec3 b, vec3 c, float s0, float s1, vec3 col, float amount) {
  a=inkPlume(a); b=inkPlume(b); c=inkPlume(c);
  vec3 centre=(a+b+c)/3.0;
  float radius=max(length(a-centre),max(length(b-centre),length(c-centre)))+4.0*max(s0,s1);
  if (inkMiss(ro,rd,centre,radius)) return;
  vec3 prev=a;
  for (int i=1;i<=4;++i) {
    float u=float(i)*0.25;
    vec3 next=inkBez(a,b,c,u);
    float s=mix(s0,s1,u-0.125)*(0.75+0.35*sin(3.0*u+gPhase));
    vec2 k=inkTube(ro,rd,prev,next,inkWidth(s,length(prev-ro)));
    inkLayer(k.x*amount,k.y,col,9.0);
    prev=next;
  }
}
void inkStrands(vec3 ro, vec3 rd, vec3 thin, vec3 edge, vec3 accent, float band) {
  gFrontC=vec4(0,0,0,1); gBackC=vec4(0,0,0,1);
  float lit=0.9+0.5*u_level;
  // Drop stem: two streams twist from the ring's inner top up to the
  // source and pinch away as the ring develops.
  float stem=1.0-smoothstep(0.15,0.75,gG1);
  if (stem>0.01) {
    for (int i=0;i<2;++i) {
      float a=gLobe+float(i)*3.1416+0.3*sin(gPhase+float(i));
      vec3 p0=inkLocal(vec2(cos(a),sin(a)),vec3(0.46,0.32,0.0));
      vec3 p1=inkLocal(vec2(cos(a+0.8),sin(a+0.8)),vec3(0.16,0.55,0.0));
      vec3 p2=inkLocal(vec2(cos(a+1.6),sin(a+1.6)),vec3(0.085,0.95,0.0));
      vec3 p3=inkLocal(vec2(cos(a+2.8),sin(a+2.8)),vec3(0.24+0.08*sin(gPhase+float(i)),1.13,0.0));
      vec3 p4=inkLocal(vec2(cos(a+4.0),sin(a+4.0)),vec3(0.09,1.25,0.0));
      inkCurve(ro,rd,p0,p1,p2,0.105,0.065,thin*lit*0.4,stem*0.8);
      inkCurve(ro,rd,p2,p3,p4,0.065,0.018,mix(thin,edge,0.3)*lit*0.4,stem*0.7);
    }
  }
  // Each lobe feeds one broad bowed stream into its daughter. Energy
  // increases its reach and lateral wandering, not a redundant wire count.
  if (gDFade>0.01) {
    float reach=1.0+0.25*u_rhythm.y;
    for (int k=0;k<7;++k) {
      if (float(k)>=gN) break;
      float a=gLobe+float(k)*TAU/gN;
      for (int j=0;j<1;++j) {
        float on=1.0;
        if (on<0.01) continue;
        float side=j==0?0.0:(j==1?1.0:-1.0);
        float aj=a+0.1*side*(1.0+0.4*gG2);
        vec2 cs=vec2(cos(aj),sin(aj));
        float wob=sin(gPhase*float(1+(k+j)%3)+float(k)*1.7+float(j)*2.3);
        vec3 l0=vec3(gPeak.x-0.08,gPeak.y-0.12,0.0);
        vec3 l2=vec3(gDC.x+0.2*side*gRd,gDC.y+0.6*gRd*(1.0-gG2),0.0);
        l2=mix(l0,l2,reach);
        vec3 l1=mix(l0,l2,0.5)+vec3(0.28+0.3*gG2+0.1*side,0.22+0.25*gG2,(0.18+0.22*u_level)*wob);
        vec3 p0=inkLocal(cs,l0), p1=inkLocal(cs,l1), p2=inkLocal(cs,l2);
        float s=(j==0?0.058:0.032)*(0.8+0.4*gRd/0.36);
        float hp=exp(-sq((p1.y-band)/0.3))*u_rhythm.z;
        inkCurve(ro,rd,p0,p1,p2,0.4*s,1.4*s,mix(thin,edge,0.15*float(j))*lit*(0.35+0.65*hp),gDFade*on*0.6);
      }
    }
  }
  // Ink burst: a hooked tongue peels from its parent into four unequal
  // branches. No shell subtraction or rotationally symmetric neon bead.
  if (gBurst>0.001) {
    float pr=gBurstPr;
    vec3 radial=vec3(gBurstXZ.x,0.0,gBurstXZ.y), tang=vec3(-gBurstXZ.y,0.0,gBurstXZ.x);
    vec3 o=radial*(gRP+0.32)+vec3(0.0,gPeak.y+0.05,0.0);
    vec3 dir=normalize(radial*0.8+vec3(0.0,-0.5,0.0)+tang*0.25);
    float fly=smoothstep(0.0,0.6,pr);
    float unroll=smoothstep(0.15,0.9,pr);
    float fade=1.0-smoothstep(0.75,1.0,pr);
    vec3 c=o+dir*0.62*fly+tang*0.08*sin(3.0*fly);
    float rad=0.13+0.06*fly+0.06*unroll-0.01*min(u_rhythmHit.w,1.0);
    float dense=(1.0-0.85*unroll)*fade;
    vec3 side=normalize(cross(dir,vec3(0,1,0)));
    vec3 up2=cross(side,dir);
    vec3 hook=c+side*rad*(0.7+unroll)+up2*rad*0.3+dir*0.25*unroll;
    inkCurve(ro,rd,o-dir*0.22,c+up2*rad*1.8,hook,0.09,0.14*(1.0-0.7*unroll),accent*0.9,dense*1.2);
    // Dilute concentrations stretch along the peeling tongue, never a
    // hollow shell: overlapping off-axis puffs dissolve into its branches.
    for (int i=0;i<3;++i) {
      float u=(float(i)+0.5)/3.0;
      vec3 puff=inkBez(o-dir*0.12,c+up2*rad*1.8,hook,u);
      vec2 k=inkBall(ro,rd,inkPlume(puff+side*0.04*sin(float(i)*2.3)),rad*(0.55+0.35*u));
      inkLayer(k.x*dense,k.y,accent*0.6,3.5);
    }
    // An offset absorbing concentration ridge, not a circular hole.
    inkCurve(ro,rd,o-dir*0.15,c+up2*rad,hook,0.028,0.035,accent*0.03,dense*1.5);
    for (int i=0;i<4;++i) {
      float a=float(i)*1.1+0.35+0.8*unroll;
      vec3 off=(side*cos(a)+up2*sin(a));
      vec3 q0=mix(o,hook,0.3*unroll)+off*0.03;
      vec3 q1=c-dir*rad*0.6+off*rad*(0.5+0.4*unroll);
      vec3 q2=c+dir*(0.08+(0.3+0.13*float(i))*unroll)+off*(rad+0.35*unroll)+tang*0.12*unroll*sin(a);
      float s=0.021+0.006*float(i%2);
      inkCurve(ro,rd,q0,q1,q2,s,0.012,accent*(1.0+0.3*fly),fade*(0.3+0.7*unroll));
    }
  }
}
float inkMotes(vec2 uv, float scale, float period, vec2 drift, float size) {
  vec2 g=uv*scale+drift;
  vec2 cell=floor(g), f=fract(g)-0.5;
  uint hx=uint(int(mod(cell.x,period))+512), hy=uint(int(mod(cell.y,period))+512);
  uint h=seedHash(hx*7919u^seedHash(hy+u_seedBits));
  vec2 pos=vec2(float(h&1023u),float((h>>10u)&1023u))/1023.0-0.5;
  float on=float((h>>20u)&7u)<2.5?1.0:0.0;
  float d=length(f-0.7*pos);
  return on*exp(-sq(d/size))*(0.4+0.6*float((h>>23u)&255u)/255.0);
}
const int INK_STEP_CAP=96;
void main() {
  inkSetup();
  float aspect=u_resolution.x/u_resolution.y;
  vec2 uv=(v_uv-0.5)*u_resolution/min(u_resolution.x,u_resolution.y)*2.0;
  // Slow off-centre drift of the composition over phrases.
  vec2 shift=vec2((-0.2+0.08*sin(2.0*gOrbit+0.7))*(1.0-gPortrait),0.05*sin(3.0*gOrbit));
  vec2 view=uv-shift;
  float aspectFit=aspect<1.0?mix(0.72,1.0,aspect):0.92+0.08*smoothstep(1.0,1.6,aspect);
  float focal=(2.4+0.048*u_kick)*aspectFit;
  vec3 rd=normalize(gFw*focal+gRight*view.x+gUp*view.y), eye=gEye;
  // Two inks from the palette: dye is the saturated primary (pale
  // primaries are cubed and renormalized, never beige or white); the
  // secondary only lights thin backlit skins.
  float topP=max(max(u_primary.r,u_primary.g),max(u_primary.b,0.04));
  vec3 thin=u_primary*u_primary*u_primary/(topP*topP);
  float top=max(max(u_secondary.r,u_secondary.g),max(u_secondary.b,0.04));
  vec3 deep=u_secondary*u_secondary/top;
  vec3 edge=mix(thin,deep,0.9);
  float topA=max(max(u_accent.r,u_accent.g),max(u_accent.b,0.04));
  vec3 accent=u_accent*u_accent/topA;
  // The tank: a dim backlit water volume, darker toward the floor, with two
  // parallax layers of suspended pigment motes drifting slowly upward.
  vec2 bl=uv-vec2(-0.75,0.95)-0.3*shift;
  vec3 bg=deep*(0.006+0.012*smoothstep(-1.2,1.0,uv.y))+mix(deep,thin,0.3)*0.09*exp(-0.5*dot(bl,bl));
  float rise=gPhase/TAU;
  bg+=mix(thin,deep,0.4)*0.12*inkMotes(uv,18.0,36.0,vec2(0.35*sin(gOrbit),-36.0*rise),0.06);
  bg+=mix(thin,deep,0.6)*0.03*inkMotes(uv,5.0,10.0,vec2(1.1*sin(gOrbit),-10.0*rise),0.3);

  float band=1.6-3.6*(u_rhythm.z>0.001?inkProgress(u_rhythm.z,0.9):1.0);
  vec3 bound=inkExtent(), offset=inkOffset();
  // Intersect the exact affine volume, not its enlarged world AABB. The
  // unnormalised local direction retains world ray-depth units.
  vec3 localEye=inkUnplume(eye), localRd=inkUnplume(rd);
  vec3 inv=sign(localRd+vec3(1e-8))/max(abs(localRd),vec3(1e-6));
  vec3 lo=(offset-bound-localEye)*inv, hi=(offset+bound-localEye)*inv;
  vec3 nearV=min(lo,hi), farV=max(lo,hi);
  float start=max(0.0,max(max(nearV.x,nearV.y),nearV.z));
  float end=min(min(farV.x,farV.y),farV.z);
  // Reject empty water for source/receiving streams. A burst can fly beyond
  // the Drop atlas, so never apply this group rejection while it is active.
  gFrontC=vec4(0,0,0,1); gBackC=vec4(0,0,0,1);
  if (end>start || gBurst>0.001) inkStrands(eye,rd,thin,edge,accent,band);
  vec3 col=vec3(0);
  float trans=1.0;
  float mu=dot(rd,gLight), phase=0.1+0.9*inkPhase(mu,0.55)/inkPhase(1.0,0.55);
  float sigmaScale=u_params[4];
  float lit=0.9+0.5*u_level;
  int limit=int(min(float(INK_STEP_CAP),(0.23-0.01*gG2)*u_raySteps));
  float budget=96.0/clamp(u_raySteps,16.0,96.0);
  float skipMargin=0.6*length(2.0*bound/(INK_GRID-1.0))+0.01;
  if (end>start) {
    float stepLen=max(0.1*budget,(end-start)/float(max(limit-1,1)));
    // Analytic interval quadrature needs no screen-space jitter at all.
    float t=start+0.5*stepLen;
    float prevP=9.0, prevD=9.0, prevFP=0.0, prevKP=0.0, prevTP=0.0, prevFD=0.0, prevKD=0.0, prevTD=0.0;
    bool havePrev=false, prevActiveP=false, prevActiveD=false;
    for (int i=0;i<INK_STEP_CAP;++i) {
      if (i>=limit || t>end || trans<0.04) break;
      vec3 p=eye+rd*t;
      vec3 local=inkUnplume(p);
      vec4 s=inkSample(local,offset,bound);
      float support=min(length(s.xy)-0.8,gDFade>0.001?(length(s.zw)-0.8)*gRd:9.0);
      float skip=0.28*max(support,0.0)-skipMargin;
      if (skip>stepLen) { t+=min(skip,0.6); havePrev=false; continue; }
      // Finite sheet/roll support ends below rho .8; this 1.1-unit guard
      // includes the quartic width, native pleat and an empty entry interval.
      // Avoid exp/angle/quadrature in water, independently for each body.
      bool activeP=length(s.xy)<1.1;
      bool activeD=gDFade>0.001 && length(s.zw)<1.1;
      if (!activeP && !activeD) { t+=stepLen; havePrev=false; continue; }
      vec3 X=local;
      float skinP=9.0, skinD=9.0, fade=gDFade;
      vec3 q=vec3(s.xy,max(gRP+s.x,0.08));
      vec4 rP=activeP?inkRing(q,1.0,gTurns,skinP):vec4(0,0,1,9);
      vec3 dl=vec3(s.zw,max(1.0+s.z,0.08));
      vec4 rD=activeD?inkRing(dl,gRd,0.6+0.4*gTurns,skinD):vec4(0,0,1,9);
      float phiX=inkAngle(X.xz);
      float pleat=sin(7.0*phiX+2.0*rP.y+gPhase);
      rP.x+=0.85*pleat;
      rD.x+=0.55*sin(9.0*phiX+2.0*rD.y-gPhase);
      skinP+=0.025*pleat;
      bool fresh=!havePrev || activeP!=prevActiveP || activeD!=prevActiveD;
      float len=min(stepLen,max(t-start,0.0001));
      prevActiveP=activeP; prevActiveD=activeD;
      float FP=rP.x+gRoll-rP.y, FD=rD.x+gRoll-rD.y;
      if (!fresh) {
        FP=prevFP+(rP.x-prevKP)-inkWrap(rP.y-prevTP);
        FD=prevFD+(rD.x-prevKD)-inkWrap(rD.y-prevTD);
      } else {
        // Enter from dye-free water, not a constant-density slab. A signed
        // outer distance plus mean winding avoids a bright false contour.
        prevP=-0.5; prevD=-0.5*gRd; prevFP=FP; prevFD=FD;
        havePrev=true;
      }
      float w=inkWidth(0.012,t), ws=inkWidth(0.015,t);
      float iP=inkSheet(havePrev?prevP:skinP,skinP,w,len);
      float iD=inkSheet(havePrev?prevD:skinD,skinD,w*max(gRd/0.3,0.5),len);
      float wfP=min(ws*rP.z,1.2), wfD=min(1.4*ws*rD.z,1.2);
      float sP=inkSpiral(havePrev?prevFP:FP,FP,wfP,len);
      float sD=inkSpiral(havePrev?prevFD:FD,FD,wfD,len);
      if (fresh) { sP=0.28294*wfP*len; sD=0.28294*wfD*len; }
      // Where a step turns too far round a small core to unwrap its angle,
      // use the train's mean density instead of aliasing.
      sP=mix(sP,0.28294*wfP*len,smoothstep(0.7,1.4,len/max(rP.w,1e-3)));
      // Subpixel daughter turns converge to the train's mean density.
      sD=mix(sD,0.28294*wfD*len,smoothstep(0.5,1.4,len/max(rD.w*gRd,1e-3)));
      prevP=skinP; prevD=skinD; prevFP=FP; prevKP=rP.x; prevTP=rP.y; prevFD=FD; prevKD=rD.x; prevTD=rD.y;
      havePrev=true;
      // Torn coverage; skins thin out on the leading (lower) side and fade
      // beyond the atmosphere, so no infinite wake tube appears.
      float fold=sin(dot(X,vec3(3.1,2.2,2.3))+gSeed)+0.55*sin(dot(X,vec3(-5.1,6.3,4.7))+gPhase);
      float cov=smoothstep(-0.15,0.65,fold);
      float ampP=cov*cov*(1.0-smoothstep(0.4,0.6,rP.w))*mix(0.25,1.0,smoothstep(-0.45,0.25,s.y));
      float ampD=(0.2+0.8*cov)*fade*(1.0-smoothstep(0.4,0.6,rD.w));
      float envP=exp(-sq(rP.w/0.3))*smoothstep(0.03,0.1,rP.w)*(1.0-smoothstep(0.32,0.46,rP.w));
      float envD=fade*exp(-sq(rD.w/0.3))*smoothstep(0.03,0.1,rD.w)*(1.0-smoothstep(0.32,0.46,rD.w));
      float inv=1.0/max(len,1e-4);
      float sheet=(ampP*iP+0.8*ampD*iD)*inv*8.0;
      float roll=(envP*sP+0.65*envD*sD)*inv*18.0;
      float core=9.0*exp(-sq(rP.w/0.13))+1.5*fade*exp(-sq(rD.w/0.13));
      float tot=sheet+roll+core;
      if (tot>0.002) {
        // Ring-roll highlight sweeping round the primary's rolled rim.
        float sweep=gSweep*exp(6.0*(cos(phiX-gSweepPhi)-1.0))*exp(-sq((rP.w-0.28)/0.2));
        float wave=u_rhythm.z*exp(-sq((p.y-band)/0.28));
        float tau=tot*len*sigmaScale;
        float a=1.0-exp(-tau);
        float rhoS=min(rP.w,rD.w);
        float shadow=exp(-2.2*(1.0-smoothstep(0.12,INK_RS,rhoS)));
        float fog=exp(-0.42*max(t-gDist+0.8,0.0));
        float nearKey=0.65+0.7*exp(2.0*(cos(phiX-gFacing+0.35)-1.0));
        vec3 cRoll=thin*(1.0+3.2*sweep)*(0.08+7.0*phase*shadow)*nearKey;
        vec3 cSkin=edge*(0.03+2.6*phase)*exp(-0.9*sheet*len);
        vec3 cCore=thin*0.012;
        vec3 light=(roll*cRoll+sheet*cSkin+core*cCore)/tot*(1.0+1.6*wave)*lit*fog;
        col+=trans*a*light;
        trans*=1.0-a;
      }
      t+=stepLen;
    }
  }
  // Composite: strands in front, the volume, strands behind, the tank.
  vec3 res=gFrontC.rgb+gFrontC.a*(col+trans*(gBackC.rgb+gBackC.a*bg));
  res*=1.0-0.3*smoothstep(0.9,2.2,length(uv));
  outColor=vec4(max(res,vec3(0)),1);
}
`;

export default {
  id: "ink",
  number: 112,
  name: "Ink Bloom",
  description:
    "One falling dye ring opens into a tilted crown of folded pigment; local fills peel away into branching streams.",
  development: "development",
  schema,
  presets,
  fragment,
  precompute: {
    size: [800, 246],
    filter: "linear",
    format: "rgba16f",
    fragment: `${material}\n${lattice}
void main() {
  inkSetup();
  ivec2 pixel=ivec2(gl_FragCoord.xy);
  int py=pixel.y;
  int z=(py/82)*16+pixel.x/50;
  // A duplicate-node gutter isolates each Z slice under bilinear filtering.
  vec3 cell=vec3(clamp(pixel.x%50-1,0,47),clamp(py%82-1,0,79),z);
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
  rhythmStyles: {
    restrained: "Suspended pigment",
    driving: "Vortex bloom",
    accented: "Widnall flourish",
  },
  rhythm: [
    familyEffect(
      "ring-roll",
      0,
      "Ring roll",
      "A bright highlight sweeps half way round the rolled rim while its sheets wind a step further.",
      {
        period: 4,
        strength: 0.55,
        duration: 1.5,
        kind: "motion",
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....... | ......x. | ...X.... | ........",
            division: 2,
            strength: 0.6,
            duration: 1.7,
          },
          driving: {
            steps: "X.....x. | ...X...x | .x....X. | ...X.x..",
            division: 2,
            strength: 0.8,
            duration: 0.8,
          },
          accented: {
            steps:
              "X........x...... | ....X.......x... | ..X.......x..... | ......X.......x.",
            division: 4,
            strength: 0.84,
            duration: 0.4,
          },
        },
      },
    ),
    familyEffect(
      "finger-reach",
      1,
      "Finger reach",
      "The Widnall lobes swell and the tendrils stretch toward their daughters, then relax.",
      {
        period: 8,
        strength: 0.6,
        duration: 2.5,
        kind: "motion",
        steps: "X.......",
        styles: {
          restrained: {
            steps: "....x... | ........ | .......X | ........",
            division: 2,
            strength: 0.6,
            duration: 2,
          },
          driving: {
            steps: "....X... | .......x | ....X... | .x...X..",
            division: 2,
            strength: 0.8,
            duration: 1.5,
          },
          accented: {
            steps:
              ".......X........ | .....x.......x.. | .....X.......... | ...........x...X",
            division: 4,
            strength: 0.9,
            duration: 0.8,
          },
        },
      },
    ),
    familyEffect(
      "pigment-wave",
      2,
      "Pigment wave",
      "A descending concentration front bends the pigment folds and lights the receiving streams generation by generation.",
      {
        period: 16,
        strength: 0.6,
        duration: 3,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | .....x.. | ........ | ..X.....",
            division: 2,
            strength: 0.6,
            duration: 1.8,
          },
          // Six eighths: a dotted cross-rhythm against the four-beat bar.
          driving: {
            steps: "X..x..",
            division: 2,
            strength: 0.8,
            duration: 1.2,
          },
          // A three-beat loop against the bar (3 against 4).
          accented: {
            steps: "X.....x..x..",
            division: 4,
            strength: 0.92,
            duration: 0.6,
          },
        },
      },
    ),
    familyEffect(
      "ink-burst",
      3,
      "Ink burst",
      "On fills one rim sector peels into a hooked pigment tongue, stretches away and dissolves into four unequal branches.",
      {
        period: 16,
        strength: 0.9,
        duration: 1.8,
        kind: "motion",
        styles: {
          restrained: {
            steps: "........ | ......X. | ........ | ......X.",
            division: 2,
            strength: 0.9,
            duration: 2.4,
          },
          driving: {
            steps: "........ | ......X. | ........ | ....X.X.",
            division: 2,
            strength: 0.9,
            duration: 1.8,
          },
          accented: {
            steps:
              "................ | ..........X..... | ................ | ........X...X...",
            division: 4,
            strength: 0.9,
            duration: 1.6,
          },
        },
      },
    ),
  ],
};
