import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// A single ocean, not three overlaid pictures. The Lagrangian wave identities
// survive development; the maelstrom only deforms the vertical coordinate.
export const GRAVITY = 9.81;
export const WAVE_HARMONICS = [2, 3, 4, 5, 7, 10];
export const WAVE_AMPLITUDES = [0.8, 0.4, 0.24, 0.16, 0.085, 0.035];
export const GERSTNER_Q = 0.65;
const schema = [
  {
    key: "development",
    label: "Development · calm / swell / maelstrom",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "speed",
    label: "Ocean motion",
    min: 0.2,
    max: 1.6,
    step: 0.01,
    default: 0.7,
  },
  {
    key: "height",
    label: "Wave height",
    min: 0.4,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "glow",
    label: "Living foam",
    min: 0.2,
    max: 1.4,
    step: 0.01,
    default: 0.85,
  },
  {
    key: "orbit",
    label: "Coastal drift",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "moon",
    label: "Moon elevation",
    min: 0.1,
    max: 0.7,
    step: 0.01,
    default: 0.2,
  },
  {
    key: "eye",
    label: "Viewing height",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "wind",
    label: "Wind detail",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
];
const base = {
  speed: 0.7,
  height: 1,
  glow: 0.85,
  orbit: 0.4,
  moon: 0.2,
  eye: 0.4,
  wind: 0.5,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Calm", 10301, 0),
  look("Swell", 10301, 1),
  look("Maelstrom", 10301, 2),
  look("Silver Passage", 10302, 0.2, {
    moon: 0.1,
    eye: 0.05,
    speed: 0.4,
    wind: 0.95,
  }),
  look("Living Breakers", 10303, 1, {
    height: 1.3,
    glow: 1.25,
    wind: 0.85,
    eye: 0,
  }),
  look("Spiral Cathedral", 10304, 2, { eye: 1, orbit: 0.75, glow: 1.1 }),
  look("Far Lantern", 10305, 0.65, {
    moon: 0.32,
    eye: 0.65,
    height: 0.65,
    wind: 0.7,
  }),
  look("Undertow", 10306, 1.7, {
    eye: 0,
    speed: 0.95,
    orbit: 0.2,
    glow: 0.8,
  }),
];

// Shared exact wave data, also used to populate the optional world-space
// surface table. This is geometry/normal data, never a colour buffer.
// The maelstrom winds the SAME ocean: y = R(phi(r)) x with
// phi = TWIST * vortex * exp(-r²/900). The twist preserves radius, so it is a
// bijection; the heightfield stays single-valued and the Gerstner no-fold
// bound (a property of the material map) is untouched.
const gerstner = `
vec4 gW[6];
float gK[6];
vec2 gD[6];
float gVortex, gFlow, gTwist;
vec2 tdTwist(vec2 x) {
  float a=gTwist*exp(-dot(x,x)/900.), c=cos(a), s=sin(a);
  return vec2(c*x.x-s*x.y,s*x.x+c*x.y);
}
// Pull a gradient taken in twisted coordinates back to world coordinates:
// J = R + (R J90 x) grad(phi)^T, so J^T g = R^T g + grad(phi) (R J90 x . g).
vec2 tdPullback(vec2 x, vec2 g) {
  float a=gTwist*exp(-dot(x,x)/900.), c=cos(a), s=sin(a);
  vec2 turned=vec2(-c*x.y-s*x.x,-s*x.y+c*x.x);
  return vec2(c*g.x+s*g.y,-s*g.x+c*g.y)-a*(2./900.)*x*dot(turned,g);
}
vec2 tdMaterial(vec2 x) {
  vec2 q=x;
  for(int iteration=0;iteration<2;iteration++) {
    vec2 displacement=vec2(0.);
    float jxx=1., jxz=0., jzz=1.;
    for(int i=0;i<6;i++) {
      vec4 w=gW[i]; float k=gK[i], phase=dot(w.xy,q)+w.w;
      displacement += .65*w.z*gD[i]*cos(phase);
      float v=.65*w.z*sin(phase)/k;
      jxx-=v*w.x*w.x; jxz-=v*w.x*w.y; jzz-=v*w.y*w.y;
    }
    vec2 error=q+displacement-x;
    q-=vec2(jzz*error.x-jxz*error.y,jxx*error.y-jxz*error.x)/(jxx*jzz-jxz*jxz);
  }
  return q;
}
// Analytic signal of the wind sea: z = sum c_i exp(i phase_i) over modes 1-4
// (56, 31, 20, 10 m) with steepness weights c_i = A_i (n_i/5)^2. Im z is the
// weighted crest height, arg z the local wave phase, |z| the group envelope.
// Stored with the material coordinate q so foam texture rides the water.
vec4 tdExactFoam(vec2 x) {
  vec2 q=tdMaterial(tdTwist(x));
  vec2 z=vec2(0.);
  for(int i=1;i<5;i++) {
    vec4 w=gW[i]; float phase=dot(w.xy,q)+w.w;
    float c=w.z*(i==1?.36:i==2?.64:i==3?1.:1.96);
    z+=c*vec2(sin(phase),cos(phase));
  }
  return vec4(z,q);
}
vec4 tdExactWaves(vec2 x) {
  vec2 q=tdMaterial(tdTwist(x)), gradient=vec2(0.);
  float jxx=1., jxz=0., jzz=1., h=0., crest=0.;
  for(int i=0;i<6;i++) {
    vec4 w=gW[i]; float phase=dot(w.xy,q)+w.w;
    float s=sin(phase), c=cos(phase), k=gK[i];
    h+=w.z*s; crest+=k*w.z*s;
    gradient+=w.z*w.xy*c;
    float v=.65*w.z*s/k;
    jxx-=v*w.x*w.x; jxz-=v*w.x*w.y; jzz-=v*w.y*w.y;
  }
  gradient=vec2(jzz*gradient.x-jxz*gradient.y,jxx*gradient.y-jxz*gradient.x)/(jxx*jzz-jxz*jxz);
  return vec4(h,tdPullback(x,gradient),crest);
}
`;

const common = `${lateClockGlsl}
${gerstner}
float tdHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float tdNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(tdHash(i),tdHash(i+vec2(1,0)),f.x),mix(tdHash(i+vec2(0,1)),tdHash(i+vec2(1)),f.x),f.y);
}
float tdWaveClock() {
#ifdef PHOSPHOR_LATE
  return u_clock[0];
#else
  return u_time * u_params[1] * .35;
#endif
}
float tdOrbitClock() {
#ifdef PHOSPHOR_LATE
  return u_clock[1];
#else
  return u_time * u_params[4] * .018 * (.8 + .6 * u_level);
#endif
}
float tdFlowClock() {
#ifdef PHOSPHOR_LATE
  return u_clock[2];
#else
  return u_time * u_params[1] * .12 * (.6 + .8 * u_level);
#endif
}
// The frequencies are integer harmonics of one periodic integrated clock.
// k = omega^2/g, NEVER k proportional to omega (non-dispersive water).
// The long swell runs away from the coastal camera (toward the moon), so
// the foam on its back slopes faces the viewer.
vec4 tdWave(int i) {
  float j=float(i);
  float harmonic = i==0?2.:i==1?3.:i==2?4.:i==3?5.:i==4?7.:10.;
  float amplitude = i==0?.8:i==1?.4:i==2?.24:i==3?.16:i==4?.085:.035;
  float spread = i==0?0.:i==1?-.32:i==2?.38:i==3?-.55:i==4?.8:-1.05;
  float omega = .35 * harmonic;
  float k = omega * omega / 9.81;
  float angle = -1.5708 + spread + .3*(tdHash(vec2(j+17., float(u_seedBits%997u)))-.5);
  float phase = -mod(tdWaveClock()*harmonic,TAU) + TAU*tdHash(vec2(j+71.,float(u_seedBits%991u)));
  float swell=smoothstep(0.,1.,u_params[0]);
  float amp=amplitude*u_params[2]*mix(.48,2.35,swell);
  return vec4(k*cos(angle), k*sin(angle), amp, phase);
}
vec3 tdBowlExact(vec2 p) {
  if(gVortex==0.) return vec3(0.);
  float r=max(length(p),.001), a=atan(p.y,p.x);
  float depression=-42.*exp(-r*r/190.);
  float lip=3.8*exp(-sq((r-23.)/7.));
  // Integer angular harmonics keep the atan seam EXACTLY periodic.
  float meander=3.*a-.12*r+gFlow;
  float phase=5.*a + .44*r - 2.*gFlow + .28*sin(meander);
  float inner=clamp(r/4.,0.,1.);
  float window=inner*inner*(3.-2.*inner);
  float gaussian=exp(-sq((r-20.)/17.));
  float envelope=gaussian*window;
  float derivative=gaussian*(r<4.?1.5*inner*(1.-inner):0.)-envelope*2.*(r-20.)/289.;
  float spiral=.8*sin(phase)*envelope;
  float dr=-depression*2.*r/190.-lip*2.*(r-23.)/49.;
  dr+=.8*(envelope*(.44-.0336*cos(meander))*cos(phase)+derivative*sin(phase));
  float da=.8*(5.+.84*cos(meander))*cos(phase)*envelope;
  vec2 gradient=dr*p/r+da*vec2(-p.y,p.x)/(r*r);
  return gVortex*vec3(depression+lip+spiral,gradient);
}
void tdSetup() {
  gVortex=smoothstep(1.,2.,u_params[0]);
  gTwist=-3.5*gVortex;
  gFlow=mod(tdFlowClock(),TAU);
}
`;
const precompute = `${common}
void main() {
  ivec2 cell=ivec2(gl_FragCoord.xy);
  if(cell.y==0) {
    outColor=cell.x<6?tdWave(cell.x):vec4(0.);
    return;
  }
  tdSetup();
  for(int i=0;i<6;i++) {
    gW[i]=tdWave(i); gK[i]=length(gW[i].xy); gD[i]=gW[i].xy/gK[i];
  }
  vec2 p=(vec2(cell.x%512,cell.y-1)/511.-.5)*256.;
  if(cell.x>=512) {
    outColor=tdExactFoam(p);
    return;
  }
  outColor=tdExactWaves(p)+vec4(tdBowlExact(p),0.);
}
`;

const fragment = `${common}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
float gSwell, gPixel, gWavePhase, gWaveHeight;
vec3 gMoon;
// Sparse Gaussian points: the cell is only a candidate lookup, never a
// shaded square. Each point vanishes well before its cell border; widen by
// the pixel footprint and conserve its integrated flux when subpixel.
float tdPoints(vec2 p, float fp, float size, float rarity) {
  vec2 cell=floor(p), f=fract(p);
  float rnd=tdHash(cell+43.);
  vec2 center=.25+.5*vec2(tdHash(cell+11.),tdHash(cell+29.));
  float variance=size+min(.0085-size,fp*fp*.7);
  return exp(-dot(f-center,f-center)/variance)*(size/variance)
    *smoothstep(rarity,rarity+.05,rnd)*(1.-smoothstep(.15,.45,fp));
}
float tdDroplets(vec2 p, float fp) { return tdPoints(p,fp,.0012,.91); }
// Bilinear world-space table read (explicit, nearest-fetch safe).
#ifdef PRECOMPUTED
vec4 tdTable(vec2 p, int bank) {
  vec2 grid=(p/256.+.5)*511.;
  ivec2 cell=ivec2(floor(grid))+ivec2(bank,1);
  vec2 f=fract(grid);
  return mix(mix(texelFetch(u_precomputed,cell,0),
                 texelFetch(u_precomputed,cell+ivec2(1,0),0),f.x),
             mix(texelFetch(u_precomputed,cell+ivec2(0,1),0),
                 texelFetch(u_precomputed,cell+ivec2(1),0),f.x),f.y);
}
#endif
vec4 tdSurface(vec2 p) {
#ifdef PRECOMPUTED
  // Bilinear world-space surface data; shading stays full-resolution.
  // Keep the polar core and the table boundary on the exact fallback.
  if(max(abs(p.x),abs(p.y))<127.5 && dot(p,p)>36.) {
    vec4 data=tdTable(p,0);
    float blend=smoothstep(36.,64.,dot(p,p))*(1.-smoothstep(126.,127.5,max(abs(p.x),abs(p.y))));
    if(blend<1.) return mix(tdExactWaves(p)+vec4(tdBowlExact(p),0.),data,blend);
    return data;
  }
#endif
  return tdExactWaves(p)+vec4(tdBowlExact(p),0.);
}
vec4 tdFoamData(vec2 p) {
#ifdef PRECOMPUTED
  // Right bank: swell analytic signal and material coordinate.
  if(max(abs(p.x),abs(p.y))<127.5 && dot(p,p)>36.) {
    vec4 data=tdTable(p,512);
    float blend=smoothstep(36.,64.,dot(p,p))*(1.-smoothstep(126.,127.5,max(abs(p.x),abs(p.y))));
    if(blend<1.) return mix(tdExactFoam(p),data,blend);
    return data;
  }
#endif
  return tdExactFoam(p);
}
vec2 tdSea(vec2 x) {
#ifdef PRECOMPUTED
  return tdSurface(x).xw;
#else
  vec2 q=tdMaterial(tdTwist(x));
  float h=0., crest=0.;
  for(int i=0;i<6;i++) {
    vec4 w=gW[i]; float s=sin(dot(w.xy,q)+w.w);
    h+=w.z*s;
    crest+=gK[i]*w.z*s;
  }
  return vec2(h+tdBowlExact(x).x,crest);
#endif
}
// Moonlit sky: a large moon with limb, maria and halo, a thin cloud bank
// with silver edges near the horizon, round stars. Cold light only.
vec3 tdSky(vec3 d, bool detail) {
  float horizon=exp(-max(d.y,0.)*9.);
  vec3 moonColor=mix(u_secondary,vec3(1.),.78);
  vec3 col=u_secondary*(.006+.065*horizon)+u_primary*.008*horizon;
  float dist=length(d-gMoon);
  float aa=gPixel/1.5;
  float moon=1.-smoothstep(.042-aa,.042+aa,dist);
  if(moon>0.) {
    // Shade only the disc: maria noise is never evaluated elsewhere.
    vec3 moonRight=normalize(cross(gMoon,vec3(0,1,0))), moonUp=cross(moonRight,gMoon);
    vec2 local=vec2(dot(d,moonRight),dot(d,moonUp))*70.;
    float maria=tdNoise(local*2.1)+.4*tdNoise(local*5.);
    float limb=sqrt(max(0.,1.-sq(dist/.042)));
    col+=moonColor*moon*(.8+.35*limb)*(1.05-.22*maria);
  }
  col+=moonColor*(.1*exp(-dist*14.)+.035*exp(-dist*3.5));
  if(detail) {
    float cloud=0.;
    if(d.y>-.01 && d.y<.36) {
      vec2 cp=d.xz/(d.y+.09)*.55+vec2(cos(gFlow),sin(gFlow))*.18;
      vec2 mp=gMoon.xz/(gMoon.y+.09)*.55+vec2(cos(gFlow),sin(gFlow))*.18;
      float n=tdNoise(cp*1.1)*.55+tdNoise(cp*2.7+7.)*.3+tdNoise(cp*6.3+3.)*.15;
      float band=smoothstep(-.005,.04,d.y)*(1.-smoothstep(.07,.22,d.y));
      cloud=smoothstep(.5,.7,n)*band;
      float edge=smoothstep(.44,.52,n)*(1.-smoothstep(.52,.62,n))*band;
      float nearMoon=exp(-length(cp-mp)*.9);
      col=mix(col,col*.3+u_secondary*.004,cloud);
      col+=moonColor*edge*(.004+.09*nearMoon);
    }
    if(d.y>0.) {
      vec2 sky=vec2(atan(d.x,-d.z),asin(d.y))*70.;
      vec2 cell=floor(sky), f=fract(sky);
      float rnd=tdHash(cell+float(u_seedBits%577u));
      vec2 pos=.15+.7*vec2(tdHash(cell+11.),tdHash(cell+29.));
      float width=max(.05,aa*70.);
      float star=exp(-sq(length(f-pos)/width))*(.05/width)*step(.9965,rnd)*smoothstep(0.,.1,d.y);
      col+=mix(moonColor,u_primary,.25*rnd)*star*.75*(1.-cloud)*(1.-moon);
    }
  }
  return col;
}
// A safeguarded Illinois regula-falsi solve on a heightfield. Conservative
// ray-specific height planes bracket the ocean. The capped solve keeps cost independent
// of horizon distance; far waves dissolve into horizon haze.
float tdIntersect(vec3 ro, vec3 rd) {
  if(rd.y>=-.006) return -1.;
  // Conservative ray-specific height slab: the depression along the ray
  // cannot exceed its value at the closest projected approach to the axis.
  // Outside the funnel this avoids solving against a fictitious -55 m sea.
  float closest=max(0.,-dot(ro.xz,rd.xz)/max(dot(rd.xz,rd.xz),.0001));
  vec2 nearAxis=ro.xz+rd.xz*closest;
  // Include the table cell's full diagonal in the radial lower bound.
  float nearRadius=max(0.,length(nearAxis)-.72);
  float lower=-gWaveHeight-gVortex*(.8+42.*exp(-nearRadius*nearRadius/190.));
  float upper=gWaveHeight+4.6*gVortex;
  float lo=max(0.,(upper-ro.y)/rd.y), hi=min(700.,(lower-ro.y)/rd.y);
  if(lo>=hi) return -1.;
  float flo=(ro+rd*lo).y-tdSea((ro+rd*lo).xz).x;
  float fhi=(ro+rd*hi).y-tdSea((ro+rd*hi).xz).x;
  if(fhi>0.) return -1.;
  float t=lo;
  int previous=0;
  // The stage governor lowers u_raySteps 96 -> 64 -> 40 under load; the
  // solve follows it (15 -> 10 -> 7 iterations), identical at full budget.
  int solveSteps=int(clamp(ceil(15.*u_raySteps/96.),7.,15.));
  for(int i=0;i<15;i++) {
    if(i>=solveSteps) break;
    t=mix(lo,hi,clamp(flo/(flo-fhi),.08,.92));
    vec3 p=ro+rd*t;
    float f=p.y-tdSea(p.xz).x;
    if(abs(f)<.008+gPixel*t*.2) break;
    // Halve only the stale endpoint's secant weight, never its position.
    // This avoids the slow one-sided convergence of ordinary false position.
    if(f>0.) {lo=t; flo=f; if(previous==1) fhi*=.5; previous=1;}
    else {hi=t; fhi=f; if(previous==-1) flo*=.5; previous=-1;}
  }
  return t;
}
// Moon glints: one tilted micro-facet per cell of material coordinate. Each
// glint is a Gaussian point inside its cell; subpixel glints conserve flux and
// fade into the smooth glitter lobe instead of shimmering.
float tdGlints(vec2 q, vec3 n, vec3 hv, float fp) {
  vec2 g=q/.22, cell=floor(g), f=fract(g);
  float r1=tdHash(cell+3.1), r2=tdHash(cell+7.7), r3=tdHash(cell+13.);
  vec2 tilt=(vec2(r1,r2)-.5)*.75+.06*vec2(cos(3.*gWavePhase+TAU*r3),sin(4.*gWavePhase+TAU*r1));
  float aligned=pow(max(0.,dot(normalize(n+vec3(tilt.x,0.,tilt.y)),hv)),160.);
  vec2 center=.25+.5*vec2(r3,tdHash(cell+19.));
  float cellFp=fp/.22;
  float variance=.003+min(.02,cellFp*cellFp*.7);
  return aligned*exp(-dot(f-center,f-center)/variance)*(.003/variance)
    *(1.-smoothstep(.15,.45,cellFp));
}
// Trailing foam in material coordinates: streaks combed back from the crest
// along the direction of travel (about 0.9 m across, 8 m long). Young foam
// (fill 1) is solid; ageing foam tears into separate streaks and vanishes.
// Soft thresholds and the unresolved mean avoid hairy or cellular outlines.
float tdFoamStreaks(vec2 q, float fill, float fp) {
  vec2 d=gD[0];
  vec2 g=vec2(dot(q,vec2(-d.y,d.x))*.7,dot(q,d)*.45);
  float n=.6*tdNoise(g)+.4*tdNoise(g*vec2(2.3,1.7)+vec2(5.1,1.7));
  float cellFp=fp*.7;
  float aa=.12+.6*cellFp;
  float coverage=smoothstep(1.-fill-aa,1.-fill+aa,n)*smoothstep(0.,.08,fill);
  return mix(mix(coverage,fill,.2),fill,smoothstep(.5,1.2,cellFp));
}
void main() {
  tdSetup();
  gSwell=smoothstep(0.,1.,u_params[0]);
  gWavePhase=mod(tdWaveClock(),TAU);
  gPixel=2./min(u_resolution.x,u_resolution.y);
  gMoon=normalize(vec3(.27,u_params[5],-1.));
  gWaveHeight=0.;
  for(int i=0;i<6;i++) {
#ifdef PRECOMPUTED
    gW[i]=texelFetch(u_precomputed,ivec2(i,0),0);
#else
    gW[i]=tdWave(i);
#endif
    gK[i]=length(gW[i].xy);
    gD[i]=gW[i].xy/gK[i];
    gWaveHeight+=gW[i].z;
  }
  float scale=gW[0].z/.8;
  float eye=u_params[6];
  float orbit=mod(tdOrbitClock(),TAU);
  // Coastal: just above the highest possible crest, pitched so the sea fills
  // two thirds. Peak: a full orbit; high eye cranes overhead, low eye drops
  // to the lip. All terms are periodic in the orbit clock.
  float high=smoothstep(.7,1.,eye), lowEye=1.-smoothstep(0.,.25,eye);
  float radius=mix(54.+3.*cos(orbit),45.+2.*cos(2.*orbit)-20.*high,gVortex);
  float coastal=gWaveHeight+4.6*gVortex+.5+2.6*eye;
  vec3 ro=vec3(mix(12.*sin(orbit),radius*sin(orbit),gVortex),
    mix(coastal,35.+12.*eye+10.*high-22.*lowEye+2.*sin(orbit),gVortex),mix(radius,radius*cos(orbit),gVortex));
  vec3 target=mix(vec3(.5*ro.x,ro.y-18.5,ro.z-84.),vec3(0.,-5.,0.),gVortex);
  vec3 fw=normalize(target-ro), rt=normalize(cross(fw,vec3(0,1,0))), up=cross(rt,fw);
  vec2 uv=2.*aspectUV();
  float focal=1.5*(1.+.022*u_kick);
  vec3 rd=normalize(fw*focal+rt*uv.x+up*uv.y);
  vec3 col=tdSky(rd,true);
  float t=tdIntersect(ro,rd);
  vec3 p=ro+rd*max(t,0.);
  // Footprints and phase derivatives outside divergent flow.
  float footprint=max(max(length(dFdx(p.xz)),length(dFdy(p.xz))),.012);
  float glintFootprint=max(.6*footprint,.006);
  vec4 surface=tdSurface(p.xz);
  vec4 foamData=tdFoamData(p.xz);
  float envelope=length(foamData.xy);
  float phaseAA=min(1.5,length(fwidth(foamData.xy))/max(envelope,1e-3));
  float polar=atan(p.z,p.x), radial=length(p.xz);
  float armPhase=5.*polar+.44*radial-2.*gFlow+.28*sin(3.*polar-.12*radial+gFlow);
  // Differentiate periodic sin/cos, not atan: no polar-seam AA flare.
  float armWave=sin(armPhase), armAcross=cos(armPhase);
  float armAA=max(.006,1.25*fwidth(armAcross));
  float h=surface.x;
  vec3 normal=normalize(vec3(-surface.y,1.,-surface.z));
  if(t>0.) {
    float r=length(p.xz);
    vec2 q=foamData.zw;
    float wind=u_params[7]*(.25+.75*u_level);
    float glow=u_params[3];
    // Three band-limited capillary trains (integer clock harmonics) alter
    // normals, not the silhouette; crossing directions avoid glitter stripes.
    float keep=1.-smoothstep(.12,.5,footprint);
    // World coordinates, not the bilinear material table: no cell kinks.
    vec2 micro=vec2(.83,.56)*sin(dot(p.xz,vec2(2.6,1.75))-5.*gWavePhase)
      +vec2(-.45,.89)*sin(dot(p.xz,vec2(-1.6,3.2))-6.*gWavePhase+1.3)
      +vec2(.98,-.2)*sin(dot(p.xz,vec2(3.9,-.8))-7.*gWavePhase+4.1);
    normal=normalize(normal+vec3(micro.x,0.,micro.y)*.045*(.35+.65*wind)*keep);
    vec3 reflected=reflect(rd,normal);
    float fresnel=.025+.975*pow(1.-max(0.,dot(-rd,normal)),5.);
    vec3 water=u_secondary*(.012+.012*normal.y);
    water*=.45+.55*smoothstep(-26.,3.,h);
    col=mix(water,tdSky(reflected,false),fresnel);
    float key=max(0.,dot(normal,normalize(vec3(-.4,.7,-.5))));
    float rim=pow(1.-max(0.,dot(normal,-rd)),2.);
    vec3 moonLight=mix(u_secondary,vec3(1.),.72);
    col+=u_secondary*(.016+.1*key)+moonLight*.016*rim;
    vec3 halfVector=normalize(gMoon-rd);
    float nh=max(0.,dot(normal,halfVector));
    float glitter=pow(nh,180.)*.7+pow(nh,40.)*.1+pow(nh,10.)*.03+pow(nh,3.)*.006;
    if(nh>.85) glitter+=tdGlints(q,normal,halfVector,glintFootprint)*22.;
    col+=moonLight*glitter*(.25+.75*fresnel);

    // Breaking foam. The analytic swell signal gives a local phase psi and a
    // group envelope. Foam is the closed-form decaying sum of past crest
    // passages, F(age) = (e^{-age/k} - e^{-2pi/k}) / (1 - e^{-2pi/k}),
    // gated by the group envelope: where the phase is undefined the gate is 0.
    float throatFade=mix(1.,smoothstep(5.,12.,r),gVortex);
    float threshold=mix(1.45,.65,u_level);
    // Short waves break preferentially on the crests of the long swell, so
    // whitecaps line up along the swell crests across the frame.
    float swellCrest=sin(dot(gW[0].xy,q)+gW[0].w);
    float breaking=smoothstep(threshold,threshold+.5,envelope/.6242)*throatFade
      *(.35+.65*smoothstep(-.3,.8,swellCrest))
      // Near the maelstrom the current steepens the sea; far water calms.
      *mix(1.,.3+.7*exp(-sq(r/45.)),gVortex);
    float age=mod(1.5707963-atan(foamData.x,foamData.y),TAU);
    float kappa=mix(.6,2.4,u_level);
    float floorDecay=exp(-TAU/kappa);
    float fill=(exp(-age/kappa)-floorDecay)/(1.-floorDecay)*smoothstep(0.,.1+phaseAA,age);
    // One-sided front: a sharp leading edge at the crest, a longer tumble
    // behind it. Widening by the phase footprint conserves line flux.
    float behind=mod(age-.1+PI,TAU)-PI;
    float frontWidth=(behind<0.?.035:.14)+phaseAA;
    float front=exp(-sq(behind/frontWidth))*(.09/(.09+phaseAA))*breaking;
    // The maelstrom's own spiral ridges carry foam too.
    float inner=smoothstep(3.,8.,r);
    float armWindow=exp(-sq((r-18.)/19.))*inner*gVortex*smoothstep(.1,.6,armWave);
    float armBand=exp(-sq((armAcross+.22)/.44))*(1.-smoothstep(-armAA,.06+armAA,armAcross))*armWindow;
    float coreWidth=.025+armAA;
    float armCore=exp(-sq(armAcross/coreWidth))*(.025/coreWidth)*armWindow;
    float foamFill=breaking*fill;
    float lace=foamFill>.01?tdFoamStreaks(q,foamFill,footprint):0.;
    // Gesture x: a wave group at the true group velocity of mode 3,
    // c_g = omega/(2k): envelope wavenumber 2k/n per unit of clock.
    float packet=pow(.5+.5*cos(2.*gK[3]/5.*dot(gD[3],q)-gWavePhase),6.);
    float hot=smoothstep(.55,1.,breaking/max(throatFade,.001))*throatFade;
    float frontLight=front*(1.+1.6*packet*u_rhythm.x)*(1.+.3*u_kick*hot);
    // Throat light: a glowing eye inside the funnel lights the walls from below.
    float depth=exp(min(0.,h)*.072*gVortex);
    col*=mix(1.,depth,gVortex);
    // Moonlit foam matter, then biolight (primary) where the crest tumbles.
    col=mix(col,moonLight*(.05+.12*key)*mix(1.,depth,gVortex),lace*.6);
    float living=frontLight*2.6+lace*foamFill*1.+armCore*2.3+armBand*.9;
    living+=armCore*exp(-sq((r-(6.+30.*u_rhythm.y))/3.5))*u_rhythm.y*3.;
    living+=gVortex*exp(-sq((r-(6.+40.*(1.-u_rhythm.z)))/2.2))*u_rhythm.z*.45;
    col+=u_primary*living*glow*1.3;
    col+=mix(u_primary,vec3(1.),.6)*(frontLight*(.5+hot)+armCore*.4)*glow;
    col+=mix(u_primary,u_secondary,.4)*breaking*exp(-sq(behind/1.))*.12*glow*(.6+.4*normal.y);
    col+=u_accent*front*hot*smoothstep(.8,1.,breaking)*(.5+packet)*1.2*glow;
    vec3 toEye=vec3(0.,-36.,0.)-p;
    float eyeDistance=length(toEye);
    float wallLight=max(0.,dot(normal,toEye/eyeDistance))*exp(-eyeDistance/13.)*gVortex;
    col+=mix(u_primary,u_accent,.2)*wallLight*(1.6+.8*rim)*glow*(1.+u_rhythm.y*.6);
    float core=exp(-r*r/14.)*smoothstep(-24.,-36.,h)*gVortex;
    col+=(u_accent*core*1.8+u_primary*exp(-r*r/40.)*smoothstep(-12.,-36.,h)*gVortex*1.2)*glow;
    // Biolight sparks: plankton flashes where small crests compress and
    // glowing droplets thrown off breaking fronts. One candidate per cell.
    float compress=surface.w/(.279*max(scale,.01));
    float sparkGate=smoothstep(.15,.7,compress)*mix(.5,1.,u_level)+front*hot*2.;
    if(sparkGate>.001) {
      float sparks=tdPoints(q*.8,footprint*.8,.004,.8)*sparkGate;
      col+=mix(u_primary,u_accent,step(.93,tdHash(floor(q*.8)+3.)))*sparks*(3.+5.*wind)*glow;
    }
    float fog=1.-exp(-t*.0045);
    col=mix(col,tdSky(vec3(rd.x,.012,rd.z),false),fog);
  }
  // Three thin strata of wind-torn spindrift. Separate depths create
  // parallax over the lip; every stratum remains water-occluded. All drift
  // terms are exactly periodic in the integrated flow clock.
  if(gVortex>0.) for(int layer=0;layer<3;layer++) {
    float l=float(layer);
    float mistT=(5.5+1.7*l-ro.y)/min(rd.y,-.001);
    vec3 mistP=ro+rd*max(0.,mistT);
    float mistFP=max(length(dFdx(mistP.xz)),length(dFdy(mistP.xz)));
    float mistRadius=length(mistP.xz);
    float gust=.65+.35*sin(3.*atan(mistP.z,mistP.x)+gFlow+2.*l);
    float mistRing=exp(-sq((mistRadius-22.5-l*.7)/(2.3+l*.6)))*gVortex*gust;
    float mistVisible=mistT>0. && (t<0. || mistT<t)?1.:0.;
    // Each stratum orbits the axis at a whole number of turns per flow
    // period (1, 2, 3), in the arms' sense of rotation: exactly periodic.
    float turn=(l+1.)*gFlow, ct=cos(turn), st=sin(turn);
    vec2 orbiting=vec2(ct*mistP.x+st*mistP.z,ct*mistP.z-st*mistP.x);
    float mistSpark=tdDroplets(orbiting*vec2(.65,1.1)+17.*l,mistFP*1.1);
    vec3 sprayLight=mix(u_secondary,vec3(1.),.35);
    col+=mistVisible*mistRing*(sprayLight*.012+mix(u_primary,u_accent,.12)*mistSpark*12.)*u_params[3];
  }
  outColor=vec4(max(col,vec3(0.)),1.);
}
`;

export default {
  id: "tide",
  number: 103,
  name: "Moon Tide",
  description:
    "A moonlit dispersive ocean breaks into bioluminescent foam and winds into a vast glowing maelstrom.",
  development: "development",
  schema,
  presets,
  type: { key: "development", values: [0, 1, 2] },
  stage: ["height", "glow", "eye"],
  energy: { speed: { mul: [0.7, 1.3] }, wind: [-0.25, 0.25] },
  beat: { punch: 0.15, pulse: 0.15 },
  audio: [{ param: "wind", feature: "high", amount: 0.06 }],
  clocks: [
    { rate: (p) => p[1] * 0.35, period: 2 * Math.PI },
    {
      rate: (p, level) => p[4] * 0.018 * (0.8 + 0.6 * level),
      period: 2 * Math.PI,
    },
    {
      rate: (p, level) => p[1] * 0.12 * (0.6 + 0.8 * level),
      period: 2 * Math.PI,
    },
  ],
  rhythm: [
    familyEffect(
      "crest-packet",
      0,
      "Crest packet",
      "A wave group at the true group velocity lights the breaking crests it passes.",
      { period: 4, strength: 0.55, duration: 1.3 },
    ),
    familyEffect(
      "spiral-ridge",
      1,
      "Spiral ridge",
      "A surge of biolight runs down the spiral arms into the glowing eye.",
      { period: 8, strength: 0.5, duration: 2 },
    ),
    familyEffect(
      "incoming-tide",
      2,
      "Incoming tide",
      "A tide ring rolls out from the glowing eye across the maelstrom's shoulder.",
      { period: 16, strength: 0.6, duration: 3 },
    ),
  ],
  fragment,
  precompute: { fragment: precompute, size: [1024, 513] },
};
