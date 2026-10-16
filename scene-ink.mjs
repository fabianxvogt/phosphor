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
  const radius = 1 + 0.35 * g2;
  const peak = [radius * (1 + 0.55 * lobeAmp), -radius * lobeAmp];
  return {
    g1,
    g2,
    lobeAmp,
    bud,
    pinch,
    peak,
    radius,
    // At the peak the daughters rise and roll outward (a blooming crown).
    daughterCentre: [
      peak[0] + (0.62 * bud * reach + 0.95 * g2) * spread,
      peak[1] - 1.05 * bud * reach * (1 - 0.85 * g2) + 0.25 * g2,
    ],
    daughterTilt: 0.5 * bud + 1.1 * g2,
    daughterRadius: mix(0.06, 0.34, smooth(0.15, 0.85, g1)) + 0.16 * g2,
    parentCore: 0.24 - 0.06 * g1 + 0.08 * g2,
    // The neck stretches and dissolves as it pinches: no string remains.
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

const material = `${lateClockGlsl}
float gPhase, gG1, gG2, gSeed, gCurl, gFinger, gN, gM, gLobe, gTurns, gRoll, gSpread;
float gCell, gVeil2, gLobeAmp, gRP, gAP, gRd, gAd, gBud, gPinch, gTiltC, gTiltS, gSpinC, gSpinS, gVeilH;
vec2 gPeak;
vec3 gEye, gFw, gRight, gUp, gLight, gCentre, gDaughter;
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
  // A full orbit about the descent axis; elevation swings between looking
  // into the ring from above and up into the hanging crown from below.
  float az=orbit+0.35, el=0.1+0.3*sin(2.0*orbit+0.6);
  // Longer fingers hang the crown lower: frame them (no state crops it).
  float reach=max(min(u_params[3],1.4)-0.9,0.0)*gG1;
  gCentre=vec3(0.0,0.35-0.62*gG1+0.38*gG2-0.45*reach,0.0);
  float dist=(4.1+1.15*gG1+1.7*gG2+0.9*reach)*max(u_params[7],0.92);
  gEye=gCentre+dist*vec3(cos(el)*sin(az),sin(el),cos(el)*cos(az));
  gFw=normalize(gCentre-gEye);
  gRight=normalize(cross(gFw,vec3(0,1,0)));
  gUp=cross(gRight,gFw);
  // Off-axis key BEHIND the ink: thin edges glow, thick cores stay deep.
  // At the peak the key swings to a raking three-quarter light.
  vec3 key=normalize(mix(vec3(-0.45,0.22,0.86),vec3(-0.85,0.35,0.4),gG2*gG2));
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
  gM=gN>5.5?4.0:3.0;
  gLobe=float(seedHash(u_seedBits)%1000u)/1000.0*TAU/gN;
  gCurl=u_params[2];
  gSpread=u_params[5];
  gFinger=min(u_params[3],1.4)*(0.85+0.3*u_level)*(1.0+0.12*u_rhythm.y);
  // Energy winds more Kaden turns into every core.
  gTurns=4.0+5.0*u_level;
  gRoll=3.0*gPhase+0.9*u_rhythm.x;
  // The cascade schedule (inkCascade() in JS): Widnall lobes grow, neck and
  // pinch off into daughter rings; at the peak every bell flares and folds.
  gLobeAmp=0.035+0.15*smoothstep(0.0,0.55,gG1)*gFinger;
  gRP=1.0+0.35*gG2;
  gAP=0.24-0.06*gG1+0.08*gG2;
  gBud=smoothstep(0.05,0.95,gG1);
  gPinch=smoothstep(0.35,0.95,gG1);
  gPeak=gRP*vec2(1.0+0.55*gLobeAmp,-gLobeAmp);
  // At the peak the daughters rise and roll outward: a blooming crown,
  // not a hanging mobile.
  gDaughter=vec3(gPeak.x+(0.62*gBud*gFinger+0.95*gG2)*gSpread,
    gPeak.y-1.05*gBud*gFinger*(1.0-0.85*gG2)+0.25*gG2,0.0);
  gTiltC=cos(0.5*gBud+1.1*gG2); gTiltS=sin(0.5*gBud+1.1*gG2);
  gSpinC=cos(gSeed); gSpinS=sin(gSeed);
  gRd=mix(0.06,0.34,smoothstep(0.15,0.85,gG1))+0.16*gG2;
  gAd=mix(gAP*0.85,0.062,smoothstep(0.1,0.8,gG1))+0.07*gG2;
  gVeilH=1.1+0.2*gG2;
  gVeil2=smoothstep(0.45,1.1,dev);
  inkCamera();
}
// The wake bell's radius (relative to the ring) at height fraction sv: a
// short scalloped wake that narrows but never closes to a point; at the
// peak it rounds into a mushroom cap rolling outward over the ring.
float inkBell(float sv, float w) {
  float root=sqrt(sv), lobe=1.0+0.55*gLobeAmp*w;
  float wake=lobe*(1.0-0.65*root*sqrt(root))+(0.07+0.07*gG2)*w*(1.0-sv);
  float cap=lobe*(1.12*sqrt(max(1.0-sv*sv,0.0))+0.2*sq(1.0-sv))+0.1*w*(1.0-sv);
  return mix(wake,cap,gG2);
}
// Shared two-octave turbulence: ink rising past the descending ring.
float inkErode(vec3 q) {
  return inkNoise(q*6.0+vec3(gSeed,-2.0*gPhase,0.0))
    +0.5*inkNoise(q.zxy*13.0+vec3(0.0,gSeed,-3.0*gPhase));
}
// One vortex ring of radius R in its own frame (axis +y, travelling -y): a
// well-mixed core wrapped in Kaden-wound sheets. x density, y distance bound.
// v is the ray direction in the same frame and span the march step: each
// sheet is box-filtered over the step, so face-on layers integrate to their
// mean while edge-on layers stay crisp, with no slice aliasing.
vec2 inkRing(vec3 q, vec3 v, float span, float R, float a, float core, float turns, float amp,
             float lobes, float lobePhase, float roll, float fp, float ero, float phi) {
  float r=length(q.xz);
  // phi>-9 is an azimuth; otherwise lobes use cos(m phi) from Chebyshev
  // polynomials of x/r (m = 3 or 4), avoiding atan for the daughters.
  float c=q.x/max(r,1e-5);
  float w=amp<=0.0?0.0:phi>-9.0?cos(lobes*(phi-lobePhase)):
    lobes>3.5?8.0*c*c*(c*c-1.0)+1.0:c*(4.0*c*c-3.0);
  vec2 hv=vec2(r-R*(1.0+0.55*amp*w),q.y+R*amp*w);
  float rho=length(hv);
  float dist=(rho-2.6*a)*0.8;
  if (rho>=2.6*a) return vec2(0.0,dist);
  // Erosion swells or thins the layers; bounded so support stays < 2.6a.
  float x=max(rho/a*clamp(1.0+(0.15+0.12*gCurl+0.25*gG2)*ero,0.8,1.8),0.08);
  float density=0.9*(1.0-0.15*gG2)*exp(-sq(x/core))*(0.75+0.3*ero);
  dist=1.0;
  if (turns>0.0 && x>0.3 && x<2.05) {
    float theta=atan(hv.y,hv.x);
    float ix=inversesqrt(x), k=turns*ix*ix*ix;
    float Phi=k-theta+roll+0.35*sin(3.0*phi+gSeed);
    float grad=sqrt(sq(1.5*k/(x*a))+1.0/sq(max(rho,1e-3)));
    float spacing=TAU/grad;
    float d=abs(fract(Phi/TAU)-0.5)*spacing;
    // |dPhi/dt| along the ray: radial and poloidal parts of grad Phi.
    vec3 er=vec3(q.x,0.0,q.z)/max(r,1e-4);
    float vr=dot(er,v), vy=v.y;
    float alongRho=(hv.x*vr+hv.y*vy)/max(rho,1e-4), alongTheta=(hv.x*vy-hv.y*vr)/max(rho,1e-4);
    float sweep=span*abs(1.5*k/(x*a)*alongRho+alongTheta/max(rho,1e-3))/grad;
    float width=0.02*R*(1.0+0.5*gG2), wide=sqrt(sq(max(width,fp))+sweep*sweep/6.0);
    float sheet=exp(-sq(d/wide))*width/wide;
    // Sheets closer than their filtered width integrate to their mean: the
    // fully mixed centre, never an aliased contour pattern.
    sheet=mix(1.7725*width/spacing,sheet,smoothstep(2.5*wide,6.0*wide,spacing));
    float streak=0.55+0.45*sin(7.0*phi+2.5*ero+gSeed);
    density+=1.6*(1.0-0.35*gG2)*sheet*streak*smoothstep(2.05,1.2,x)*
      smoothstep(0.3,0.75,x)*clamp(0.7+0.5*ero,0.0,1.0);
  }
  return vec2(density,dist);
}
// The cascade's bodies, cached per frame at the lattice resolution: the
// primary ring's wound core and the Widnall daughters with their necks.
// x density, y generation (0 primary, 1 daughters). fp is the cell size.
vec2 inkBody(vec3 p, float fp) {
  vec3 q=p;
  float ero=inkErode(q);
  float phi=atan(q.z,q.x+1e-9);
  float density=inkRing(q,vec3(0),0.0,gRP,gAP,0.55,gTurns,gLobeAmp,gN,gLobe,gRoll,fp,ero,phi).x;
  float gen=0.0;
  if (gG1>0.001) {
    // The nearest Widnall lobe, rotated onto +x, and its daughter ring.
    float pk=gLobe+floor((phi-gLobe)*gN/TAU+0.5)*TAU/gN;
    vec3 sq3=q;
    sq3.xz=rot2(pk)*sq3.xz;
    vec3 d=sq3-gDaughter;
    d.xy=mat2(gTiltC,-gTiltS,gTiltS,gTiltC)*d.xy;
    float daughter=0.0;
    if (length(d)<gRd+2.6*gAd) {
      // Daughters are secondary; their own Widnall lobes (the next
      // generation) appear as texture at the peak.
      d.xz=mat2(gSpinC,-gSpinS,gSpinS,gSpinC)*d.xz;
      daughter=0.8*inkRing(d,vec3(0),0.0,gRd,gAd,1.05,gTurns*0.6,0.13*gG2,gM,0.0,gRoll*1.3,fp,ero,-10.0).x;
    }
    // The lobe's neck pinches to a thread as the daughter separates.
    vec3 A=vec3(gPeak,0.0), ab=gDaughter+vec3(0.0,0.45*gRd,0.0)-A;
    float h=clamp(dot(sq3-A,ab)/max(dot(ab,ab),1e-6),0.0,1.0);
    float dn=length(sq3-A-ab*h);
    float rn=mix(gAP*0.8,0.016,gPinch)*(1.0-0.3*h*gPinch);
    float wide=max(rn,fp);
    // Thick necks are cached; once thinner than a cell they are drawn as
    // silk (inkSilk) so the lattice never slices them.
    // The neck stretches and dissolves as it pinches: no string remains.
    float neck=(1.0+0.8*gPinch)*(1.0-smoothstep(0.45,0.9,gPinch))*exp(-sq(dn/wide))*rn/wide;
    density+=daughter+neck;
    gen=(daughter+0.5*neck)/max(density,1e-4);
  }
  return vec2(density,gen);
}
// Thin silk evaluated per sample at native resolution: the wake bells, the
// drop's tail, thin necks and (at the peak) each daughter's own bell. Bells
// return signed sheet distances and weights: the march adds a sheet's exact
// optical depth (rho w sqrt(pi) / |cos|) wherever consecutive samples change
// side, so silk is crisp at any step length and brightens edge-on.
vec2 inkSilk(vec3 q, vec3 v, float span, float fp, float ero, out vec3 sheet, out vec3 weight) {
  float r=length(q.xz), phi=atan(q.z,q.x+1e-9), s=q.y/gVeilH;
  float density=0.0, gen=0.0;
  sheet=vec3(9.0); weight=vec3(0.0);
  if (s>-0.05 && s<1.1) {
    float sv=clamp(s,0.0,1.0), w=cos(gN*(phi-gLobe));
    float bell=inkBell(sv,w);
    float fade=smoothstep(-0.05,0.18,s)*(1.0-smoothstep(0.55,0.95+0.1*gG2,s))*clamp(0.6+0.6*ero,0.0,1.3);
    for (int k=0;k<2;++k) {
      float layer=k==0?1.0:gVeil2;
      if (layer<0.001) break;
      float fk=float(k);
      float rv=gRP*(1.0-0.17*fk)*(bell+0.035*sin(3.0*phi+7.0*sv-2.0*gPhase+2.1*fk)*sv);
      // Energy shifts the silk from 7 broad pleats to 15 fine ones (integer
      // harmonics blended, so the azimuth seam never shows).
      float pleat=4.0*sv-gPhase+gSeed+1.7*fk;
      float streak=0.5+0.5*mix(sin(7.0*phi+pleat),sin(15.0*phi+pleat),u_level);
      sheet[k]=r-rv+0.04*ero;
      weight[k]=layer*(0.08+0.92*streak*streak)*fade;
    }
  }
  if (gG2>0.001) {
    float pk=gLobe+floor((phi-gLobe)*gN/TAU+0.5)*TAU/gN;
    vec3 sq3=q, dv=v;
    mat2 turn=rot2(pk), tilt=mat2(gTiltC,-gTiltS,gTiltS,gTiltC);
    sq3.xz=turn*sq3.xz; dv.xz=turn*dv.xz;
    vec3 d=sq3-gDaughter;
    d.xy=tilt*d.xy; dv.xy=tilt*dv.xy;
    float veilD=gRd*1.25*gG2, sd=d.y/max(veilD,1e-3);
    if (sd>-0.05 && sd<1.1 && length(d.xz)<gRd*1.3) {
      d.xz=mat2(gSpinC,-gSpinS,gSpinS,gSpinC)*d.xz;
      dv.xz=mat2(gSpinC,-gSpinS,gSpinS,gSpinC)*dv.xz;
      float rd=length(d.xz), c=d.x/max(rd,1e-5);
      float wd=gM>3.5?8.0*c*c*(c*c-1.0)+1.0:c*(4.0*c*c-3.0);
      float sv=clamp(sd,0.0,1.0), root=sqrt(sv);
      float rv=gRd*((1.0+0.07*gG2*wd)*mix(1.0-0.8*root*sqrt(root),1.12*sqrt(max(1.0-sv*sv,0.0)),gG2)+0.12*wd*(1.0-sv));
      sheet.z=rd-rv+0.02*ero;
      weight.z=0.75*gG2*smoothstep(-0.05,0.2,sd)*(1.0-smoothstep(0.65,1.05,sd))*clamp(0.6+0.6*ero,0.0,1.3);
    }
  }
  return vec2(density,gen/max(density,1e-4));
}
// Smooth support of the same cascade, without texture: shadows and skips.
vec3 inkEnvelope(vec3 p) {
  vec3 q=p;
  float r=length(q.xz), phi=atan(q.z,q.x+1e-9);
  float w=cos(gN*(phi-gLobe));
  float rho=length(vec2(r-gRP*(1.0+0.55*gLobeAmp*w),q.y+gRP*gLobeAmp*w));
  // The same erosion as the visible ink, so shadows carry its structure.
  float ero=rho<2.6*gAP?inkErode(q):0.0;
  float x=rho/gAP*clamp(1.0+(0.22+0.25*gG2)*ero,0.8,1.8);
  float density=0.9*(1.0-0.4*gG2)*exp(-sq(x/1.1))*clamp(0.7+0.5*ero,0.1,1.3);
  float dist=(rho-2.6*gAP)*0.8;
  float s=q.y/gVeilH, sv=clamp(s,0.0,1.0);
  float bell=gRP*inkBell(sv,w);
  float dv=r-bell, dv2=r-0.83*bell;
  if (s>-0.05 && s<1.1)
    density+=0.18*exp(-sq(dv/0.06))*smoothstep(-0.05,0.18,s)*(1.0-smoothstep(0.55,0.95+0.1*gG2,s));
  // Distance to the bells' finite sheets (their rims are curves, not slabs);
  // the margin covers the omitted folds (0.035) and erosion (0.06).
  float over=max(max(s-1.1,-0.05-s),0.0)*gVeilH;
  float silk=(length(vec2(min(abs(dv),gVeil2>0.001?abs(dv2):9.0),over))-0.11)*0.6;
  if (gG1>0.001) {
    float pk=gLobe+floor((phi-gLobe)*gN/TAU+0.5)*TAU/gN;
    vec3 sq3=q;
    sq3.xz=rot2(pk)*sq3.xz;
    vec3 d=sq3-gDaughter;
    d.xy=mat2(gTiltC,-gTiltS,gTiltS,gTiltC)*d.xy;
    float rd=length(vec2(length(d.xz)-gRd,d.y))-0.14*gRd*gG2;
    density+=0.6*exp(-sq(max(rd,0.0)/(1.5*gAd)));
    vec3 A=vec3(gPeak,0.0), ab=gDaughter+vec3(0.0,0.45*gRd,0.0)-A;
    float dn=length(sq3-A-ab*clamp(dot(sq3-A,ab)/max(dot(ab,ab),1e-6),0.0,1.0));
    float rn=mix(gAP*0.8,0.016,gPinch);
    density+=(1.0-smoothstep(0.45,0.9,gPinch))*exp(-sq(dn/max(rn,0.04)))*rn/max(rn,0.04);
    dist=min(dist,min((rd-2.6*gAd)*0.8,(dn-2.2*max(rn,0.015))*0.8));
    // Each daughter's bell sits in a short cylinder above its ring.
    if (gG2>0.001) silk=min(silk,max(length(d.xz)-gRd*1.3,max(-d.y-0.08,d.y-gRd*1.25*gG2)));
  }
  return vec3(density,min(dist,silk),silk);
}
`;
const lattice = `
vec3 inkExtent() { return vec3(1.75+0.85*gG1+1.35*gG2,2.3+0.55*gG1-0.75*gG2,1.75+0.85*gG1+1.35*gG2); }
vec3 inkOffset() { return vec3(0.0,0.45-0.55*gG1+0.55*gG2,0.0); }
const vec3 INK_GRID=vec3(96,128,96);
const vec2 INK_TILE=vec2(98,130);
const vec2 INK_ATLAS=vec2(1568,780);
vec2 inkAddress(vec2 xy, float z) {
  return (vec2(mod(z,16.0),floor(z/16.0))*INK_TILE+xy+1.5)/INK_ATLAS;
}
float inkCellSize() {
  vec3 c=2.0*inkExtent()/(INK_GRID-1.0);
  return max(c.x,max(c.y,c.z));
}
// Physical cache cell: the cascade's body density, optical depth toward the
// key light, the conservative distance to any ink (bodies, silk, tail) and
// the distance to the silk alone.
vec4 inkCell(vec3 p) {
  vec3 e=inkEnvelope(p);
  float tau=0.0;
  for (int i=1;i<=4;++i) {
    float s=0.1*float(i*i), ds=0.1*float(2*i-1);
    tau+=inkEnvelope(p+gLight*s).x*ds;
  }
  return vec4(e.y<0.06+inkCellSize()?inkBody(p,inkCellSize()).x:0.0,tau,e.y,e.z);
}
`;
const fragment = `${material}\n${lattice}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec4 inkSample(vec3 p) {
#ifdef PRECOMPUTED
  vec3 cell=clamp(((p-inkOffset())/inkExtent()*0.5+0.5)*(INK_GRID-1.0),vec3(0),INK_GRID-1.001);
  float z=floor(cell.z);
  vec4 a=texture(u_precomputed,inkAddress(cell.xy,z));
  vec4 b=texture(u_precomputed,inkAddress(cell.xy,z+1.0));
  return mix(a,b,fract(cell.z));
#else
  return inkCell(p);
#endif
}
// Ink barely diffuses: carve the cached body near its surface with ridged
// detail (1-2 octaves, faded by footprint) so edges become crisp lobes and
// creases. Deep inside and far outside the field is left untouched.
float inkCarve(vec3 p, float raw, float fp) {
  float near=smoothstep(0.0,0.1,raw)*(1.0-smoothstep(0.55,1.1,raw));
  if (near<=0.0) return raw;
  float r1=1.0-abs(inkNoise(p*9.0+vec3(0.0,-3.0*gPhase,gSeed)));
  float r2=1.0-abs(inkNoise(p.zxy*21.0+vec3(gSeed,0.0,-4.0*gPhase)));
  float detail=0.34*(r1*r1-0.5)*(1.0-smoothstep(0.03,0.07,fp))
    +0.17*(r2*r2-0.5)*(1.0-smoothstep(0.012,0.03,fp));
  return raw+near*detail*(0.35+0.3*gCurl)*(0.8+0.4*u_level);
}
const float INK_ISO=0.2;
const int INK_STEP_CAP=96;
float inkPhase(float mu, float g) {
  return (1.0-g*g)/pow(1.0+g*g-2.0*g*mu,1.5);
}
void main() {
  inkSetup();
  vec2 uv=(v_uv-0.5)*u_resolution/min(u_resolution.x,u_resolution.y)*2.0;
  float aspectFit=0.84+0.16*smoothstep(1.0,1.6,u_resolution.x/u_resolution.y);
  float focal=(2.4+0.048*u_kick)*aspectFit;
  vec3 rd=normalize(gFw*focal+gRight*uv.x+gUp*uv.y), eye=gEye;
  float pix=2.0/(focal*min(u_resolution.x,u_resolution.y));
  vec3 lamp=mix(vec3(1),u_primary,0.5)*(3.0+1.0*gG2);
  vec3 fillLamp=mix(vec3(1),u_secondary,0.5)*(0.07+0.2*gG2);
  // A very dark tank; the key glows faintly off the upper-left corner.
  vec2 lampScreen=vec2(dot(gLight,gRight),dot(gLight,gUp))/max(dot(gLight,gFw),0.2)*focal;
  vec3 bg=lamp*0.022*exp(-0.22*dot(uv-lampScreen,uv-lampScreen))+u_secondary*0.006;
  vec3 bound=inkExtent(), offset=inkOffset();
  vec3 inv=sign(rd+vec3(1e-8))/max(abs(rd),vec3(1e-6));
  vec3 lo=(offset-bound-eye)*inv, hi=(offset+bound-eye)*inv;
  vec3 nearV=min(lo,hi), farV=max(lo,hi);
  float start=max(0.0,max(max(nearV.x,nearV.y),nearV.z));
  float end=min(min(farV.x,farV.y),farV.z);
  vec3 col=vec3(0);
  vec3 trans=vec3(1.0);
  float mu=dot(rd,gLight), phaseInk=0.15+0.5*inkPhase(mu,0.5);
  float sigmaScale=5.0*u_params[4];
  float bandY=2.2-4.8*(1.0-u_rhythm.z);
  // Trilinear interpolation of a 1-Lipschitz distance errs by at most half
  // a cell diagonal; skip by the cached distance minus that margin.
  float skipMargin=0.6*length(2.0*bound/(INK_GRID-1.0))+0.01;
  // Dye colour: the palette colour squared and renormalized is the light that
  // survives the pigment, so thick ink deepens toward it. Two generations.
  // Two generations of deep dye plus a second hue for thin sheets and lit
  // rims (toward the palette's primary), so a palette reads in two colours.
  vec3 dyes[3], absorbs[3];
  for (int g=0;g<3;++g) {
    vec3 base=g<2?palette(0.06+0.18*float(g)):mix(u_secondary,u_primary,0.85);
    float top=max(max(base.r,base.g),max(base.b,0.04));
    dyes[g]=base*base/top;
    absorbs[g]=1.0-0.9*dyes[g]/max(max(dyes[g].r,dyes[g].g),max(dyes[g].b,0.02));
  }
  // The engine's ray-step budget (96, or 64/40 under load): a slower venue
  // machine takes fewer, longer filtered steps instead of losing pixels.
  int limit=int(min(float(INK_STEP_CAP),u_raySteps));
  float budget=96.0/clamp(u_raySteps,16.0,96.0), cell0=inkCellSize();
  gCell=cell0;
  vec3 prevSheet=vec3(9.0), prevWeight=vec3(0.0);
  float prevStep=1.0, prevField=0.0, prevT=start;
  bool prevOk=false;
  if (end>start) {
    float t=start;
    for (int i=0;i<INK_STEP_CAP;++i) {
      float clear=max(trans.r,max(trans.g,trans.b));
      if (i>=limit || t>end || clear<0.05) break;
      vec3 p=eye+rd*t;
      vec4 cell=inkSample(p);
      // The cached distance (minus its trilinear error) skips empty water.
      float skip=cell.z-skipMargin;
      float fp=t*pix;
      if (skip>0.0) { prevT=t; t+=clamp(skip,0.05,0.5); prevOk=false; prevField=0.0; continue; }
      // Bodies come from the cache at its own resolution; the march steps
      // at most about half a cell through them, longer through sparse or
      // already-hidden ink. One analytic octave adds native-resolution grain.
      bool nearSilk=cell.w<skipMargin;
      float span=max(1.5*fp,(cell.x>0.02?2.3:3.5)*cell0)*budget*(2.2-1.2*clear);
      float grain=0.0;
      vec3 sheet=vec3(9.0), weight=vec3(0.0);
      vec2 silk=nearSilk?inkSilk(p,rd,span,fp,grain,sheet,weight):vec2(0.0);
      float sheetTau=0.0;
      if (prevOk) for (int k=0;k<3;++k)
        if (sheet[k]*prevSheet[k]<0.0 && abs(sheet[k]-prevSheet[k])<0.3)
          sheetTau+=max(weight[k],prevWeight[k])*0.65*0.012*1.7725/
            max(abs(sheet[k]-prevSheet[k])/prevStep,0.1);
      prevSheet=sheet; prevWeight=weight; prevOk=nearSilk;
      // A steep density -> opacity curve on the carved field: crisp ink
      // edges. Where a step enters the ink, bisect to the edge so the
      // silhouette never shows the march's slices, and light its rim.
      float field=inkCarve(p,cell.x,fp);
      float edgeExtra=0.0, rim=0.0;
      if (prevField<INK_ISO && field>=INK_ISO) {
        float lo=prevT, hi=t;
        for (int j=0;j<3;++j) {
          float mid=0.5*(lo+hi);
          vec3 pm=eye+rd*mid;
          if (inkCarve(pm,inkSample(pm).x,mid*pix)>=INK_ISO) hi=mid; else lo=mid;
        }
        edgeExtra=t-0.5*(lo+hi);
        // Backlit rim: silhouette-facing edges toward the key glow.
        vec3 pe=eye+rd*hi;
        float e=cell0*0.7;
        float f0=inkSample(pe).x;
        vec3 n=-normalize(vec3(inkSample(pe+vec3(e,0,0)).x-f0,
          inkSample(pe+vec3(0,e,0)).x-f0,inkSample(pe+vec3(0,0,e)).x-f0)+vec3(1e-6));
        rim=pow(1.0-abs(dot(n,rd)),2.0)*(0.3+0.7*max(dot(n,gLight),0.0));
      }
      prevField=field; prevT=t;
      float body=0.75*smoothstep(INK_ISO-0.03,INK_ISO+0.03,field)+0.6*max(field-INK_ISO,0.0);
      float thin=1.0-smoothstep(INK_ISO+0.02,0.8,field);
      // Bodies below the primary rim belong to the daughters' generation.
      float bodyGen=gG1*smoothstep(gPeak.y-0.05,gPeak.y-0.45,p.y)*smoothstep(0.6,1.1,length(p.xz));
      float stepLen=span;
      float density=body*(1.0+edgeExtra/stepLen)+silk.x+sheetTau/stepLen;
      float gen=mix(bodyGen,silk.y,silk.x/max(body+silk.x,1e-4));
      float hue=clamp(max(sheetTau/max(sheetTau+body*stepLen,1e-4),0.35*thin),0.0,1.0);
      prevStep=stepLen;
      vec3 inside=bound-abs(p-offset);
      float box=smoothstep(0.0,0.3,min(min(inside.x,inside.y),inside.z));
      vec3 dye=mix(mix(dyes[0],dyes[1],gen),dyes[2],hue);
      vec3 absorb=mix(mix(absorbs[0],absorbs[1],gen),absorbs[2],hue);
      // Light reaching the sample (key optical depth) and, scattered inside
      // dense ink, crossing more dye: cores deepen and saturate while thin
      // sheets stay light and translucent. Exponents combined: two exps.
      vec3 keyDepth=cell.y*sigmaScale*(4.0-2.0*gG2)*mix(vec3(1),absorb,0.4);
      vec3 inner=min(density,1.6)*0.6*mix(vec3(1),absorb,0.7);
      vec3 alpha=1.0-exp(-density*box*sigmaScale*1.8*stepLen*mix(vec3(1),absorb,0.12));
      vec3 lit=exp(-keyDepth-inner);
      float band=u_rhythm.z>0.001?exp(-sq((p.y-bandY)/0.22))*u_rhythm.z:0.0;
      vec3 light=lit*(lamp*phaseInk*(1.0+0.15*u_rhythm.x)+u_accent*band*1.6)
        +fillLamp*exp(-0.5*keyDepth-inner);
      col+=trans*alpha*dye*light;
      col+=trans*rim*dyes[2]*lamp*exp(-0.5*keyDepth)*(1.1+0.3*u_rhythm.x);
      trans*=1.0-alpha;
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
    size: [1568, 780],
    filter: "linear",
    format: "rgba16f",
    fragment: `${material}\n${lattice}
void main() {
  inkSetup();
  ivec2 pixel=ivec2(gl_FragCoord.xy);
  int z=(pixel.y/130)*16+pixel.x/98;
  // A duplicate-node gutter isolates each Z slice under bilinear filtering.
  vec3 cell=vec3(clamp(pixel.x%98-1,0,95),clamp(pixel.y%130-1,0,127),z);
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
  rhythm: [
    familyEffect(
      "ring-roll",
      0,
      "Ring roll",
      "The wound sheets of every vortex core roll a step further and catch the light.",
      { period: 4, strength: 0.55, duration: 1.5, kind: "motion" },
    ),
    familyEffect(
      "finger-reach",
      1,
      "Finger reach",
      "The Widnall lobes and daughter rings stretch a little further from the rim.",
      { period: 8, strength: 0.6, duration: 2.5, kind: "motion" },
    ),
    familyEffect(
      "pigment-wave",
      2,
      "Pigment wave",
      "A narrow backlit pigment band travels down the cascade, generation by generation.",
      { period: 16, strength: 0.6, duration: 3 },
    ),
  ],
};
