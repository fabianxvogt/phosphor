import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// A single ocean, not three overlaid pictures. The Lagrangian wave identities
// survive development; the maelstrom only deforms the vertical coordinate.
export const GRAVITY = 9.81;
export const WAVE_HARMONICS = [2, 3, 4, 5, 7, 10];
export const WAVE_AMPLITUDES = [0.8, 0.4, 0.24, 0.16, 0.085, 0.035];
export const GERSTNER_Q = 0.65;
// The camera follows a critically damped spring copy of development (state
// texel 0), so a one-bar drop never lurches the crane. Geometry, foam and
// slabs keep the raw development value.
export const CAMERA_SPRING = { omega: 1.4, vmax: 0.3, range: 0.5 };
// Moon glitter: facet slopes per axis sigma = base + gain * wind, and the
// acceptance width tau of one facet (moon disc plus twinkle).
export const GLITTER = { base: 0.1, gain: 0.14, tau: 0.05 };
// Angular radius of the moon disc (rad): a big, present moon.
export const MOON_RADIUS = 0.068;
// Artistic exposure of the glitter road relative to a physical moon.
const GLITTER_GAIN = 3;
// Peel segment length along the crest (m): one break point every L.
export const PEEL_LENGTH = 55;
const f = (x) => (Number.isInteger(x) ? `${x}.` : `${x}`);
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
// The swell runs obliquely toward the coastal camera: breaking faces and
// tumbling lips face the viewer, and crests sweep diagonally across frame.
vec4 tdWave(int i) {
  float j=float(i);
  float harmonic = i==0?2.:i==1?3.:i==2?4.:i==3?5.:i==4?7.:10.;
  float amplitude = i==0?.8:i==1?.4:i==2?.24:i==3?.16:i==4?.085:.035;
  float spread = i==0?0.:i==1?-.32:i==2?.38:i==3?-.55:i==4?.8:-1.05;
  float omega = .35 * harmonic;
  float k = omega * omega / 9.81;
  float angle = 1.0208 + spread + .3*(tdHash(vec2(j+17., float(u_seedBits%997u)))-.5);
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
// Handoff: the twist winds the existing crests first (1.0-1.6), the bowl
// deepens after it (1.2-2.0) and the camera cranes in between (1.1-1.9).
void tdSetup() {
  gVortex=smoothstep(1.2,2.,u_params[0]);
  gTwist=-3.5*smoothstep(1.,1.6,u_params[0]);
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

// State texel 0 = (camera development / 2, velocity / (2 range) + 1/2).
const simulation = `
void main() {
  vec2 state = unpack16(texelFetch(u_state, ivec2(0), 0));
  float target = clamp(u_params[0], 0., 2.);
  float d = 2. * state.x, v = (state.y - .5) * ${f(2 * CAMERA_SPRING.range)};
  if (u_reset) { d = target; v = 0.; }
  else {
    float acc = ${f(CAMERA_SPRING.omega ** 2)} * (target - d) - ${f(2 * CAMERA_SPRING.omega)} * v;
    v = clamp(v + acc * u_dt, -${f(CAMERA_SPRING.vmax)}, ${f(CAMERA_SPRING.vmax)});
    d = clamp(d + v * u_dt, 0., 2.);
    // Settle exactly (16-bit storage would otherwise park a hair off).
    if (abs(target - d) < 4e-4 && abs(v) < 4e-3) { d = target; v = 0.; }
  }
  outColor = pack16(vec2(.5 * d, v / ${f(2 * CAMERA_SPRING.range)} + .5));
}
`;

const fragment = `${common}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
float gSwell, gPixel, gWavePhase, gWaveHeight;
vec3 gMoon;
float tdCamDev() { return 2. * unpack16(texelFetch(u_state, ivec2(0), 0)).x; }
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
// erf to ~1e-3 (Abramowitz-Stegun style tanh fit).
float tdErf(float x) { return tanh(1.1283792*x*(1.+.0893*x*x)); }
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
// The horizon band brightens toward the moon's azimuth; the sea reflects it,
// so the swell reads as sheen bands across the whole frame. The moon disc,
// aureole and clouds exist only on direct view: on the water the moon is
// the statistical glitter road (tdGlitter), never a mirrored disc.
vec3 tdSky(vec3 d, bool detail) {
  float up=max(d.y,0.);
  float toward=.5+.5*dot(normalize(d.xz+vec2(1e-6,0.)),normalize(gMoon.xz));
  toward*=toward*toward;
  float horizon=exp(-up*5.);
  vec3 moonColor=mix(u_secondary,vec3(1.),.78);
  float dist=length(d-gMoon);
  // A broad moonlit wash around the moon: on the water it becomes the soft
  // base of the road and the silver sheen of the swell faces near it.
  vec3 col=u_secondary*(.014+.06*horizon)+moonColor*horizon*(.014+.11*toward)
    +u_primary*.006*horizon+moonColor*.07*exp(-dist*1.6);
  if(detail) {
    float aa=gPixel/1.5;
    float moon=1.-smoothstep(${f(MOON_RADIUS)}-aa,${f(MOON_RADIUS)}+aa,dist);
    if(moon>0.) {
      // Shade only the disc: maria noise is never evaluated elsewhere.
      vec3 moonRight=normalize(cross(gMoon,vec3(0,1,0))), moonUp=cross(moonRight,gMoon);
      vec2 local=vec2(dot(d,moonRight),dot(d,moonUp))/${f(MOON_RADIUS)};
      float maria=smoothstep(.35,.75,tdNoise(local*1.6+3.)*.65+tdNoise(local*3.7)*.35);
      float craters=tdNoise(local*9.)*.6+tdNoise(local*19.)*.4;
      float limb=sqrt(max(0.,1.-sq(dist/${f(MOON_RADIUS)})));
      col+=moonColor*moon*(.62+.5*limb)*(1.08-.38*maria-.14*craters);
    }
    // Three-scale aureole: a tight corona, a broad glow and a sky wash.
    col+=moonColor*(.22*exp(-dist*28.)+.07*exp(-dist*7.)+.025*exp(-dist*2.2));
    float cloud=0.;
    if(d.y>-.01 && d.y<.42) {
      vec2 cp=d.xz/(d.y+.09)*.55+vec2(cos(gFlow),sin(gFlow))*.18;
      vec2 mp=gMoon.xz/(gMoon.y+.09)*.55+vec2(cos(gFlow),sin(gFlow))*.18;
      float n=tdNoise(cp*1.1)*.55+tdNoise(cp*2.7+7.)*.3+tdNoise(cp*6.3+3.)*.15;
      float band=smoothstep(-.005,.04,d.y)*(1.-smoothstep(.12,.34,d.y));
      cloud=smoothstep(.47,.66,n)*band;
      float edge=smoothstep(.41,.5,n)*(1.-smoothstep(.5,.62,n))*band;
      float nearMoon=exp(-length(cp-mp)*.8);
      col=mix(col,col*.22+moonColor*.006*(.4+nearMoon),cloud);
      col+=moonColor*edge*(.006+.22*nearMoon*nearMoon);
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
// Moon glitter from slope statistics (Cox-Munk). Each material cell holds
// one facet whose slope is Gaussian (sigma per axis) plus a twinkle that is
// periodic in the wave clock. It lights when its slope matches the slope s
// that reflects the moon into the eye, within tau. Averaged over cells the
// facets give exactly (tau^2/S^2) exp(-|s|^2/S^2), S^2 = tau^2 + 2.25 sigma^2,
// the statistical road: resolved cells show facets, unresolved cells the mean.
// Facets ride the material coordinate: deterministic, no per-frame noise.
float tdFacets(vec2 q, vec2 s, vec2 axis, float size, float sigma, float fp) {
  vec2 g=q/size, cell=floor(g), f=fract(g);
  float r1=tdHash(cell+3.1), r2=tdHash(cell+7.7), r3=tdHash(cell+13.), r4=tdHash(cell+19.);
  vec2 local=sigma*(sqrt(-2.*log(max(r1,1e-4)))*vec2(cos(TAU*r2),sin(TAU*r2))
    +.5*vec2(cos(5.*gWavePhase+TAU*r3),sin(7.*gWavePhase+TAU*r4)))*vec2(1.6,1.);
  vec2 slope=local.x*axis+local.y*vec2(-axis.y,axis.x);
  float match=exp(-dot(slope-s,slope-s)/${f(GLITTER.tau ** 2)});
  vec2 center=.25+.5*vec2(r3,r4);
  float cellFp=fp/size;
  float variance=.004+min(.03,cellFp*cellFp*.7);
  // The spot integrates to one per cell: flux is conserved at every size.
  // Facet sizes vary (mean 1): bright glints among faint ones.
  float size2=.25+1.5*tdHash(cell+31.);
  return size2*match*exp(-dot(f-center,f-center)/variance)/(PI*variance);
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
  float coverage=smoothstep(1.-.78*fill-aa,1.-.78*fill+aa,n)*smoothstep(0.,.08,fill);
  return mix(mix(coverage,.5*fill,.06),.5*fill,smoothstep(.5,1.2,cellFp));
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
  float crane=smoothstep(1.1,1.9,tdCamDev());
  float radius=mix(54.+3.*cos(orbit),45.+2.*cos(2.*orbit)-20.*high,crane);
  float coastal=gWaveHeight+4.6*gVortex+.5+2.6*eye;
  vec3 ro=vec3(mix(12.*sin(orbit),radius*sin(orbit),crane),
    mix(coastal,27.+15.*eye+12.*high-14.*lowEye+2.*sin(orbit),crane),mix(radius,radius*cos(orbit),crane));
  // The peak orbit looks across the funnel: horizon glow and the far moon
  // road sit at the top edge. Overhead and lip views look into the eye.
  vec3 target=mix(vec3(.5*ro.x,ro.y-18.5,ro.z-84.),vec3(0.,mix(4.,-5.,max(high,lowEye)),0.),crane);
  vec3 fw=normalize(target-ro), rt=normalize(cross(fw,vec3(0,1,0))), up=cross(rt,fw);
  vec2 uv=2.*aspectUV();
  float focal=1.5*(1.+.022*u_kick);
  vec3 rd=normalize(fw*focal+rt*uv.x+up*uv.y);
  vec3 col=tdSky(rd,true);
  // Palette ramp, blackbody-like: white tip -> primary lip -> saturated
  // glow (secondary/accent) -> moonlit off-white foam as the light dies.
  vec3 glowHue=mix(u_secondary,u_accent,.45);
  glowHue=max(mix(vec3(dot(glowHue,vec3(.3,.55,.15))),glowHue,1.35),0.);
  vec3 tipHue=mix(u_primary,vec3(1.),.35);
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
  // Calm's swell is low (no geometry change here): its shading slopes are
  // raised so the long swell reads as moonlit bands across the frame.
  float slopeGain=mix(2.4,1.,max(gSwell,gVortex));
  vec3 normal=normalize(vec3(-surface.y*slopeGain,1.,-surface.z*slopeGain));
  if(t>0.) {
    float r=length(p.xz);
    vec2 q=foamData.zw;
    float wind=u_params[7]*(.25+.75*u_level);
    float glow=u_params[3];
    // Three band-limited capillary trains (integer clock harmonics) alter
    // normals, not the silhouette; crossing directions avoid glitter stripes.
    float keep=1.-smoothstep(.12,.5,footprint);
    // Far water: the old analytic far normal (against the 0.5 m table cells
    // in a sharp moon lobe) is gone; the statistical glitter road is broad
    // (sigma >= 0.1 rad), so the C0 table kinks no longer show.
    // World coordinates, not the bilinear material table: no cell kinks.
    vec2 micro=vec2(.83,.56)*sin(dot(p.xz,vec2(2.6,1.75))-5.*gWavePhase)
      +vec2(-.45,.89)*sin(dot(p.xz,vec2(-1.6,3.2))-6.*gWavePhase+1.3)
      +vec2(.98,-.2)*sin(dot(p.xz,vec2(3.9,-.8))-7.*gWavePhase+4.1);
    normal=normalize(normal+vec3(micro.x,0.,micro.y)*.03*(.35+.65*wind)*keep);
    vec3 moonLightBody=mix(u_secondary,vec3(1.),.4);
    vec3 reflected=reflect(rd,normal);
    float fresnel=.025+.975*pow(1.-max(0.,dot(-rd,normal)),5.);
    // Moonlight scattered in the water body: deep palette blue near the lens,
    // modulated by the face tilt so the surface texture reads.
    vec3 water=u_secondary*(.012+.008*normal.y)+moonLightBody*(.016+.09*max(0.,dot(normal,gMoon)-.12))*exp(-t/90.);
    water*=.45+.55*smoothstep(-26.,3.,h);
    col=mix(water,tdSky(reflected,false),fresnel);
    float key=max(0.,dot(normal,normalize(vec3(-.4,.7,-.5))));
    float rim=pow(1.-max(0.,dot(normal,-rd)),2.);
    vec3 moonLight=mix(u_secondary,vec3(1.),.72);
    // No matte key lift on open water (it flattened Calm into a slab); a
    // little remains for the steep Swell faces and the funnel walls.
    col+=u_secondary*(.003+.05*key*key*max(gSwell,gVortex))+moonLight*.012*rim;
    // The moon on the water is a glitter road: the slope s of the half
    // vector in the resolved surface frame against the facet statistics.
    // Wind (energy) widens the road and multiplies its sparkles.
    vec3 halfVector=normalize(gMoon-rd);
    float nh=dot(normal,halfVector);
    float sigma=${f(GLITTER.base)}+${f(GLITTER.gain)}*wind;
    // Wind runs toward the moon: slopes along it are 1.6x steeper, so the
    // road is long (moon to lens) and narrower across.
    vec2 moonAxis=normalize(gMoon.xz);
    float roadVariance=${f(GLITTER.tau ** 2)}+2.25*sigma*sigma;
    float alongVariance=${f(GLITTER.tau ** 2)}+2.25*sq(1.6*sigma);
    vec2 slope=(halfVector.xz-normal.xz*nh)/max(nh,.05);
    vec2 slopeAxes=vec2(dot(slope,moonAxis),dot(slope,vec2(-moonAxis.y,moonAxis.x)));
    // Squared slope in units of the (anisotropic) road variance.
    float slope2=roadVariance*(sq(slopeAxes.x)/alongVariance+sq(slopeAxes.y)/roadVariance);
    // A broad moonlit sheen around the road (long slope tails): the swell
    // reads as bands of light on either side of it.
    col+=moonLight*exp(-slope2/(16.*roadVariance))*.05*(.35+.65*fresnel);
    if(nh>0. && slope2<9.*roadVariance) {
      float road=exp(-slope2/roadVariance)*${f(GLITTER.tau ** 2)}/sqrt(roadVariance*alongVariance);
      float nearSize=.1, midSize=.6;
      float nearWeight=1.-smoothstep(.25,.6,glintFootprint/nearSize);
      float midWeight=1.-smoothstep(.25,.6,glintFootprint/midSize);
      // Many unresolved facets per cell keep a soft diffuse base under the
      // resolved sparkles (35 % of the mean): a dense band, not a dotted line.
      float sparkle=road;
      float tinyWeight=1.-smoothstep(.25,.6,glintFootprint/.04);
      // Facets only where the road holds > 0.7 % of its peak: outside it
      // the cell mean (road) is exact enough and the hashes are skipped.
      if(slope2<5.*roadVariance) {
        if(midWeight>0. && nearWeight<.999) sparkle=mix(road,tdFacets(q+vec2(17.3,5.1),slope,moonAxis,midSize,sigma,glintFootprint),midWeight);
        if(nearWeight>0.) sparkle=mix(sparkle,tdFacets(q,slope,moonAxis,nearSize,sigma,glintFootprint),nearWeight);
        if(tinyWeight>0.) sparkle+=tinyWeight*.6*(tdFacets(q+vec2(5.7,9.3),slope,moonAxis,.04,sigma,glintFootprint)-road);
      }
      sparkle=mix(sparkle,road,.35);
      // Soft, slightly wider glow under the sparkles: the continuous road.
      float roadBase=exp(-slope2/(1.8*roadVariance))*${f(GLITTER.tau ** 2)}/sqrt(roadVariance*alongVariance);
      // Moon radiance x solid angle / (4 mu_v), Fresnel at the half angle.
      float fresnelHalf=.12+.88*pow(1.-max(0.,dot(-rd,halfVector)),5.);
      col+=moonLight*sparkle*fresnelHalf*${f(Math.PI * MOON_RADIUS ** 2)}
        /(${f(GLITTER.tau ** 2)}*PI*max(4.*dot(-rd,normal),.3))*${f(GLITTER_GAIN)}
        *(1.-.85*gVortex*exp(-sq(r/26.)));
      // The soft diffuse base of the road, visible down to the lens.
      col+=moonLight*roadBase*${f(MOON_RADIUS ** 2)}/(${f(GLITTER.tau ** 2)}*max(4.*dot(-rd,normal),.3))*4.5
        *(1.-.85*gVortex*exp(-sq(r/26.)));
    }
    // Silvery moonlit sheen on every swell face tilted toward the moon,
    // across the whole frame (troughs stay dark).
    col+=moonLight*smoothstep(0.,.07,dot(normal.xz,moonAxis)/max(normal.y,.2))*(.5+.5*fresnel)*.05*(1.-gVortex*.5);

    // Breaking foam. The analytic swell signal gives a local phase psi and a
    // group envelope. Foam is the closed-form decaying sum of past crest
    // passages, F(age) = (e^{-age/k} - e^{-2pi/k}) / (1 - e^{-2pi/k}),
    // gated by the group envelope: where the phase is undefined the gate is 0.
    float throatFade=mix(1.,smoothstep(5.,12.,r),gVortex);
    float threshold=mix(1.1,.65,u_level);
    // A seeded shoal in front of the coast: big swells steepen and break
    // over it, so the near field almost always holds a breaking crest. Its
    // place never moves; its effect scales with swell height (none in Calm)
    // and yields to the maelstrom.
    float shoal=0.;
    if(gVortex<1.) {
      vec2 shoalOffset=p.xz-vec2(-5.+10.*tdHash(vec2(5.,float(u_seedBits%983u))),30.);
      shoal=exp(-sq(shoalOffset.x)/1600.-sq(shoalOffset.y)/600.)*gSwell*(1.-gVortex);
    }
    threshold-=.55*shoal;
    // Short waves break preferentially on the crests of the long swell, so
    // whitecaps line up along the swell crests across the frame.
    float swellCrest=sin(dot(gW[0].xy,q)+gW[0].w);
    float breaking=smoothstep(threshold,threshold+.5,envelope/.6242)*throatFade
      *mix(.35+.65*smoothstep(-.3,.8,swellCrest),1.,shoal)
      // Near the maelstrom the current steepens the sea; far water calms.
      *mix(1.,.3+.7*exp(-sq(r/45.)),gVortex)
      // No breaker rolls through the lens: fronts fade in the last metres.
      *smoothstep(6.,16.,t);
    float age=mod(1.5707963-atan(foamData.x,foamData.y),TAU);
    float kappa=mix(.6,1.7,u_level);
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
    // Streaming arm foam: streaks long along the arms, advected inward with
    // the two-phase flow-map crossfade. Both phases are periodic in the flow
    // clock (whole cycles per period) and each is invisible at its wrap.
    float armStreak=.5, armSlow=.5;
    // Only near a band or core (most funnel pixels lie between arms).
    if(armWindow>.002 && armAcross>-.95 && armAcross<.25) {
      vec2 around=vec2(cos(armPhase),sin(armPhase))*1.7+vec2(cos(polar),sin(polar))*2.3;
      float cycle=24.*gFlow/TAU, f0=fract(cycle), f1=fract(cycle+.5);
      float n0=tdNoise(around*vec2(1.,1.3)+vec2(.09*(r+16.*f0),0.));
      float n1=tdNoise(around*vec2(1.,1.3)+vec2(.09*(r+16.*f1),0.)+vec2(5.3,2.9));
      float w0=1.-abs(2.*f0-1.);
      float streak=mix(n1,n0,w0);
      float fine=tdNoise(around*vec2(4.5,5.5)+vec2(.22*(r+16.*f0),1.7))*w0
        +tdNoise(around*vec2(4.5,5.5)+vec2(.22*(r+16.*f1),8.1))*(1.-w0);
      // Contrast lost in the crossfade is restored around the mean.
      armStreak=clamp(.5+1.5*(streak-.5)+1.3*(fine-.5),0.,1.);
      armStreak=mix(armStreak,.5,smoothstep(.4,1.2,footprint));
      armSlow=tdNoise(vec2(cos(polar),sin(polar))*1.4+vec2(.08*r,3.));
    }
    float bandWidth=.44*(.6+.8*armSlow);
    float armBand=exp(-sq((armAcross+.22)/bandWidth))*(1.-smoothstep(-armAA,.06+armAA,armAcross))*armWindow
      *(.15+1.3*smoothstep(.3,.75,armStreak));
    float coreWidth=.025*(.5+1.2*armSlow)+armAA;
    float armCore=exp(-sq(armAcross/coreWidth))*(.025/coreWidth)*armWindow*(.3+1.2*smoothstep(.25,.75,armStreak));
    // Gesture x: a wave group at the true group velocity of mode 3,
    // c_g = omega/(2k): envelope wavenumber 2k/n per unit of clock.
    float packet=pow(.5+.5*cos(2.*gK[3]/5.*dot(gD[3],q)-gWavePhase),6.);
    float hot=smoothstep(.55,1.,breaking/max(throatFade,.001))*throatFade;
    vec2 crestAxes=vec2(dot(q,vec2(-gD[0].y,gD[0].x)),dot(q,gD[0]));
    // Peeling break: the break point runs sideways along each crest like a
    // lit fuse. Segment phase u = fract(7 clock/2pi - age/2pi - s/L + seed):
    // the integer 7 keeps it periodic in the wave clock, the unit age
    // coefficient keeps it continuous across the crest wrap, and the window
    // vanishes at both ends of u, so the fract seam is continuous too.
    float peelRaw=7.*gWavePhase/TAU-age/TAU-crestAxes.x/${f(PEEL_LENGTH)}
      +tdHash(vec2(9.,float(u_seedBits%977u)));
    float peel=fract(peelRaw);
    float peelAA=min(.2,phaseAA/TAU+footprint/${f(PEEL_LENGTH)});
    float lit=smoothstep(0.,.012+peelAA,peel)*(1.-smoothstep(.55,.8,peel));
    float ignite=smoothstep(0.,.012+peelAA,peel)*exp(-peel/.045);
    // The unbroken crest ahead of the peel point keeps only a glassy glint.
    float peelGate=mix(1.,.04+.96*lit,gSwell*(1.-gVortex));
    float foamFill=breaking*fill*peelGate;
    float lace=foamFill>.01?tdFoamStreaks(q,foamFill,footprint):0.;
    // Tumbling knots travel along the lip (periodic in the wave clock);
    // water cascading down the lit face streaks across the crest.
    // Texture noise only where a breaking front exists (most funnel and
    // calm pixels skip it). It fades out across the peak (thin wound
    // fronts), so the full maelstrom skips it continuously.
    float knots=1., tumble=.68, cascade=.65;
    if(breaking>.001 && gVortex<1.) {
      knots=mix(.55+.9*tdNoise(vec2(crestAxes.x*.22,0.)+1.5*vec2(cos(gWavePhase),sin(gWavePhase))),1.,gVortex);
      // Fine whitewater texture across the lip: tumbling streaks, resolved
      // to their mean when smaller than a pixel.
      tumble=mix(mix(.35+.65*tdNoise(vec2(crestAxes.x*1.3,crestAxes.y*.5)),.68,smoothstep(.3,.8,footprint)),.68,gVortex);
      cascade=mix(mix(.3+.7*tdNoise(vec2(crestAxes.x*.8,crestAxes.y*.15)),.65,smoothstep(.5,1.2,footprint)),.65,gVortex);
    }
    float igniteLight=ignite*breaking*gSwell*(1.-gVortex)*(1.+2.*packet*u_rhythm.x);
    // Swell lip: a thin white-hot edge, a tumbling whitewater mass behind it
    // broken into chunks (material coordinates, resolved to its mean when
    // unresolved), kept in display range so the texture survives.
    float lipCore=exp(-sq(behind/(.02+phaseAA)))*(.02/(.02+phaseAA))*breaking;
    float lipMass=exp(-sq(max(behind,0.)/(.5+phaseAA))-sq(min(behind,0.)/(.03+phaseAA)))*breaking;
    float chunks=.5;
    if(lipMass>.002 && gVortex<1.) {
      vec2 tumbleAt=vec2(crestAxes.x*.8,crestAxes.y*1.1)+1.2*vec2(cos(gWavePhase),sin(gWavePhase));
      chunks=.62*tdNoise(tumbleAt)+.38*tdNoise(tumbleAt*2.3+4.);
      chunks=mix(smoothstep(.32,.72,chunks),.5,smoothstep(.15,.6,footprint));
    }
    float gesture=(1.+1.6*packet*u_rhythm.x)*(1.+.3*u_kick*hot);
    float massLight=lipMass*(.15+1.1*chunks)*peelGate*knots*gesture*(1.-gVortex);
    float swellLip=(lipCore*1.1+lipMass*.45*(.15+1.1*chunks))*peelGate*knots*gesture
      +(lipCore*4.+lipMass*1.4)*igniteLight;
    float vortexFront=front*knots*tumble*gesture;
    float frontLight=mix(swellLip,vortexFront,gVortex);
    // Throat light: a glowing eye inside the funnel lights the walls from below.
    float depth=exp(min(0.,h)*.072*gVortex);
    col*=mix(1.,depth,gVortex);
    // Moonlit foam matter: the light of ageing foam turns to moonlit white.
    vec3 foamMatter=mix(moonLight*(.07+.16*key),glowHue*.25,fill*fill*.6)*mix(1.,depth,gVortex);
    col=mix(col,foamMatter,lace*mix(.5,.6,gVortex));
    // Swell keeps its lips in display range for texture; the maelstrom's thin
    // wound fronts keep their wave-6 HDR strength.
    float wake=lace*foamFill*mix(fill*fill*.6,fill,gVortex);
    float living=frontLight*mix(.75,3.8,gVortex)+armCore*2.3;
    living+=armCore*exp(-sq((r-(6.+30.*u_rhythm.y))/3.5))*u_rhythm.y*3.;
    living+=gVortex*exp(-sq((r-(6.+40.*(1.-u_rhythm.z)))/2.2))*u_rhythm.z*.45;
    col+=u_primary*living*glow*1.1;
    col+=glowHue*(wake*1.4+armBand*1.2+massLight*.9)*glow;
    col+=tipHue*(frontLight*mix(.25+.9*hot,1.2*(.5+hot),gVortex)+armCore*.4)*glow;
    col+=glowHue*breaking*peelGate*exp(-sq(behind/.6))*.1*glow*(.6+.4*normal.y);
    // The tumbling lip lights the translucent wave face ahead of it (toward
    // the viewer) from inside: continuous at the crest, decaying down the face.
    float face=breaking*peelGate*exp(behind/.3)*smoothstep(.06,-.06,behind);
    col+=mix(glowHue,u_primary,.35)*face*cascade*.4*glow*(1.-fresnel)*(.4+.6*max(0.,dot(normal,-rd)));
    col+=u_accent*(front*hot*smoothstep(.8,1.,breaking)*(.5+packet)*1.2+front*igniteLight*1.5)*glow;
    vec3 toEye=vec3(0.,-36.,0.)-p;
    float eyeDistance=length(toEye);
    float wallLight=max(0.,dot(normal,toEye/eyeDistance))*exp(-eyeDistance/13.)*gVortex;
    // Depth colour: glow hue on the upper wall, accent deep in the throat.
    col+=mix(mix(glowHue,u_primary,.3),u_accent,smoothstep(-14.,-32.,h))*wallLight*(1.6+.8*rim)*glow*(1.+u_rhythm.y*.6);
    float core=exp(-r*r/14.)*smoothstep(-24.,-36.,h)*gVortex;
    // Crests on the lip between the lens and the eye are thin water: the
    // eye shines through them (no hard black cut-outs against the glow).
    float towardEye=1.-dot(rd,normalize(vec3(0.,-36.,0.)-ro));
    col+=mix(glowHue,u_accent,.35)*exp(-towardEye/.0025)*smoothstep(4.,14.,eyeDistance)*smoothstep(30.,18.,r)*gVortex*1.7*glow;
    // The column's light pools on the throat floor, whatever its slope.
    // Light scattered through the thin water near the eye: no normal term,
    // so ridges between the lens and the eye glow instead of silhouetting.
    col+=mix(glowHue,u_accent,.3)*(exp(-r/6.)*smoothstep(-18.,-34.,h)*1.2+exp(-eyeDistance/8.)*1.6)*gVortex*glow;
    col+=(u_accent*core*1.8+u_primary*exp(-r*r/40.)*smoothstep(-12.,-36.,h)*gVortex*1.2)*glow;
    // Biolight sparks: plankton flashes where small crests compress and
    // glowing droplets thrown off breaking fronts. One candidate per cell.
    float compress=surface.w/(.279*max(scale,.01));
    float sparkGate=smoothstep(.15,.7,compress)*mix(.5,1.,u_level)+front*hot*2.;
    if(sparkGate>.001) {
      float sparks=tdPoints(q*2.2,footprint*2.2,.0015,.82)*sparkGate;
      col+=mix(u_primary,u_accent,step(.93,tdHash(floor(q*2.2)+3.)))*sparks*(3.+5.*wind)*glow;
    }
    // Spray thrown forward off the peel point: a dense fan of glowing
    // droplets on the face ahead of the igniting lip.
    float spray=igniteLight*smoothstep(.02,-.05,behind)*exp(behind/.5)*(.5+.5*u_level);
    if(spray>.001) {
      float drops=tdPoints(q*2.6+vec2(3.,7.),footprint*2.6,.0012,.55)+.6*tdPoints(q*1.3+11.,footprint*1.3,.0012,.7);
      col+=mix(tipHue,u_accent,.25)*drops*spray*14.*glow;
    }
    float fog=1.-exp(-t*.0045);
    col=mix(col,tdSky(vec3(rd.x,.012,rd.z),false),fog);
  }
  // Light column above the eye and a wide glow haze filling the funnel: the
  // closed-form Gaussian line integral of the radial profile along the ray
  // up to the water hit, e^{-d^2/S} (erf((T-tc)k) - erf(-tc k)) / 2, k =
  // sqrt(|d.xz|^2/S), normalized to 1/|d.xz| for a full crossing. Height
  // falloff at the closest approach. Ridges in front of the eye catch the
  // haze instead of silhouetting. Rising mist streaks use the two-phase
  // crossfade, periodic in the flow clock.
  if(gVortex>0.) {
    float a=max(dot(rd.xz,rd.xz),1e-4);
    float tc=-dot(ro.xz,rd.xz)/a;
    vec2 closest=ro.xz+rd.xz*tc;
    float y=ro.y+rd.y*tc;
    // Skip rays that pass the axis high above the funnel or far from it.
    if(tc>0. && y<12. && dot(closest,closest)<1600.) {
      float hitT=t<0.?1e4:t;
      float spread=mix(10.,70.,smoothstep(-36.,12.,y));
      float k=sqrt(a/spread), kHaze=sqrt(a/260.);
      float column=exp(-dot(closest,closest)/spread)*.5*(tdErf((hitT-tc)*k)+tdErf(tc*k))/sqrt(a);
      float haze=exp(-dot(closest,closest)/260.)*.5*(tdErf((hitT-tc)*kHaze)+tdErf(tc*kHaze))/sqrt(a);
      float vertical=smoothstep(-40.,-31.,y)*exp(-max(0.,y+31.)/16.);
      float hazeHeight=smoothstep(-42.,-30.,y)*(1.-smoothstep(-26.,2.,y));
      float mist=1.;
      if(column*vertical>.004) {
        vec2 around=closest*.3;
        float cycle=12.*gFlow/TAU, f0=fract(cycle), w0=1.-abs(2.*f0-1.);
        float m0=tdNoise(around+vec2(0.,.12*(y-10.*f0)));
        float m1=tdNoise(around+vec2(4.1,.12*(y-10.*fract(cycle+.5))));
        mist=.35+1.3*smoothstep(.3,.8,mix(m1,m0,w0));
      }
      vec3 columnHue=mix(mix(u_accent,glowHue,smoothstep(-34.,-10.,y)),u_secondary,smoothstep(-10.,10.,y));
      col+=(columnHue*column*vertical*mist*1.4+mix(glowHue,u_accent,.3)*haze*hazeHeight*.35)
        *gVortex*u_params[3]*(.55+.45*u_rhythm.y);
    }
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
    // Droplet hashes only inside the visible ring (derivatives taken above).
    float mistSpark=mistVisible*mistRing>.002?tdDroplets(orbiting*vec2(.65,1.1)+17.*l,mistFP*1.1):0.;
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
  rhythmStyles: { restrained: "Slack water", driving: "Rolling swell", accented: "Spring tide" },
  rhythm: [
    familyEffect(
      "crest-packet",
      0,
      "Crest packet",
      "A wave group at the true group velocity lights the breaking crests it passes.",
      { period: 4, strength: 0.55, duration: 1.3, steps: "X...", styles: {
        restrained: { steps: "X....... | .....x.. | ........ | ..X.....", division: 2, strength: 0.48, duration: 2 },
        driving: { steps: "X....x.. | .X...x..", division: 2, strength: 0.74, duration: 1.1 },
        accented: { steps: "X.........x..... | ......X......x.. | ....X.......x...", division: 4, strength: 0.88, duration: 0.9 },
      } },
    ),
    familyEffect(
      "spiral-ridge",
      1,
      "Spiral ridge",
      "A surge of biolight runs down the spiral arms into the glowing eye.",
      { period: 8, strength: 0.5, duration: 2, steps: "X.......", styles: {
        restrained: { steps: "...x.... | ........ | ......X. | ........", division: 2, strength: 0.45, duration: 2.5 },
        driving: { steps: "...X.... | ......x. | ..X..... | .......x", division: 2, strength: 0.7, duration: 1.5 },
        accented: { steps: ".....X......x... | ...X......x..... | .......X......x.", division: 4, strength: 0.84, duration: 1.2 },
      } },
    ),
    familyEffect(
      "incoming-tide",
      2,
      "Incoming tide",
      "A tide ring rolls out from the glowing eye across the maelstrom's shoulder.",
      { period: 16, strength: 0.6, duration: 3, steps: "X...............", styles: {
        restrained: { steps: "........ | ........ | ........ | .......X", division: 2, strength: 0.5, duration: 3 },
        driving: { steps: "........ | .....x.. | ........ | .......X", division: 2, strength: 0.76, duration: 2.5 },
        accented: { steps: "................ | ..........X..... | ................ | .........x....X.", division: 4, strength: 0.92, duration: 1 },
      } },
    ),
  ],
  fragment,
  simulation: { fragment: simulation, size: [1, 1], steps: 1 },
  precompute: { fragment: precompute, size: [1024, 513] },
};
