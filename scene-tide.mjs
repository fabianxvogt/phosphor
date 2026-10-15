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
    default: 0.29,
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
  moon: 0.29,
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
    moon: 0.16,
    eye: 0.15,
    speed: 0.4,
    wind: 0.2,
  }),
  look("Living Breakers", 10303, 1, {
    height: 1.3,
    glow: 1.3,
    wind: 0.85,
    eye: 0.15,
  }),
  look("Spiral Cathedral", 10304, 2, { eye: 0.9, orbit: 0.75, glow: 1.1 }),
  look("Far Lantern", 10305, 0.65, {
    moon: 0.43,
    eye: 0.65,
    height: 0.65,
    wind: 0.7,
  }),
  look("Undertow", 10306, 1.7, {
    eye: 0.2,
    speed: 0.95,
    orbit: 0.2,
    glow: 0.65,
  }),
];

const common = `${lateClockGlsl}
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
  return u_time * u_params[1] * .12;
#endif
}
// The frequencies are integer harmonics of one periodic integrated clock.
// k = omega^2/g, NEVER k proportional to omega (non-dispersive water).
vec4 tdWave(int i) {
  float j=float(i);
  float harmonic = i==0?2.:i==1?3.:i==2?4.:i==3?5.:i==4?7.:10.;
  float amplitude = i==0?.8:i==1?.4:i==2?.24:i==3?.16:i==4?.085:.035;
  float omega = .35 * harmonic;
  float k = omega * omega / 9.81;
  float angle = -.9 + .46*j + .35*(tdHash(vec2(j+17., float(u_seedBits%997u)))-.5);
  float phase = -mod(tdWaveClock()*harmonic,TAU) + TAU*tdHash(vec2(j+71.,float(u_seedBits%991u)));
  float swell=smoothstep(0.,1.,u_params[0]);
  float amp=amplitude*u_params[2]*mix(.48,2.35,swell);
  return vec4(k*cos(angle), k*sin(angle), amp, phase);
}
`;
const precompute = `${common}
void main() { outColor = tdWave(int(gl_FragCoord.x)); }
`;

const fragment = `${common}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec4 gW[6];
float gK[6];
vec2 gD[6];
float gVortex, gSwell, gFlow, gPixel, gWavePhase;
vec3 gMoon;
// Quintic gradient noise: zero value at lattice vertices, continuous first
// AND second derivatives across the lattice. Foam never thresholds cell values.
vec2 tdGradient(vec2 p) {
  float angle=TAU*tdHash(p);
  return vec2(cos(angle),sin(angle));
}
float tdLace(vec2 p) {
  vec2 i=floor(p), f=fract(p), s=f*f*f*(f*(6.*f-15.)+10.);
  return mix(mix(dot(tdGradient(i),f),dot(tdGradient(i+vec2(1,0)),f-vec2(1,0)),s.x),
             mix(dot(tdGradient(i+vec2(0,1)),f-vec2(0,1)),dot(tdGradient(i+vec2(1)),f-vec2(1)),s.x),s.y);
}
// Sparse Gaussian droplets: the cell is only a candidate lookup, never a
// shaded square. Each point vanishes well before its cell border; widen by
// the pixel footprint and conserve its integrated flux when subpixel.
float tdDroplets(vec2 p, float fp) {
  vec2 cell=floor(p), f=fract(p);
  float rnd=tdHash(cell+43.);
  vec2 center=.25+.5*vec2(tdHash(cell+11.),tdHash(cell+29.));
  float variance=.0012+min(.012,fp*fp*.7);
  return exp(-dot(f-center,f-center)/variance)*(.0012/variance)
    *smoothstep(.91,.96,rnd)*(1.-smoothstep(.15,.45,fp));
}
// Newton inversion of Gerstner's horizontal map. Its Jacobian has
// lambda_min >= 1 - sum(Q*k*A) >= .446 over the ENTIRE schema range.
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
vec3 tdBowl(vec2 p) {
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
vec2 tdSea(vec2 x) {
  vec2 q=tdMaterial(x);
  float h=0., crest=0.;
  for(int i=0;i<6;i++) {
    vec4 w=gW[i]; float s=sin(dot(w.xy,q)+w.w);
    h+=w.z*s;
    crest+=gK[i]*w.z*s;
  }
  return vec2(h+tdBowl(x).x,crest);
}
// Analytic Gerstner normal: pull the material-space height gradient through
// the inverse horizontal Jacobian. No repeated ray intersections/finite
// differences, and the same six wave identities provide crest curvature.
vec4 tdSurface(vec2 x) {
  vec2 q=tdMaterial(x), gradient=vec2(0.);
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
  vec3 bowl=tdBowl(x);
  return vec4(h+bowl.x,gradient+bowl.yz,crest);
}
vec3 tdSky(vec3 d, bool stars) {
  float horizon=exp(-max(d.y,0.)*9.);
  vec3 col=u_secondary*(.006+.055*horizon)+u_primary*.014*horizon;
  float dist=length(d-gMoon);
  float moon=1.-smoothstep(.024-gPixel,.024+gPixel,dist);
  // The moon is a sphere with subdued maria, not an unshaded white dot.
  vec2 local=(d.xz-gMoon.xz)*110.;
  float maria=tdNoise(local*2.1)+.4*tdNoise(local*5.);
  col+=mix(u_primary,vec3(1.),.55)*moon*(.95+.2*maria);
  col+=mix(u_primary,vec3(1.),.25)*.085*exp(-dist*15.);
  if(stars && d.y>0.) {
    vec2 sky=d.xz/max(.18,d.y+.3)*85.;
    vec2 cell=floor(sky), f=fract(sky);
    float rnd=tdHash(cell+float(u_seedBits%577u));
    vec2 pos=.15+.7*vec2(tdHash(cell+11.),tdHash(cell+29.));
    float width=max(.045,gPixel*85./max(.3,d.y+.3));
    float star=exp(-sq(length(f-pos)/width))*step(.9975,rnd)*smoothstep(0.,.14,d.y);
    col+=mix(u_secondary,u_primary,rnd)*star*.65;
  }
  return col;
}
// A safeguarded regula-falsi solve on a heightfield. The upper/lower height
// planes bracket the ocean. The finite capped solve keeps cost independent
// of horizon distance; far waves dissolve into horizon haze.
float tdIntersect(vec3 ro, vec3 rd) {
  if(rd.y>=-.006) return -1.;
  float lo=0., hi=min(700.,(-55.-ro.y)/rd.y);
  float flo=ro.y-tdSea(ro.xz).x;
  float fhi=(ro+rd*hi).y-tdSea((ro+rd*hi).xz).x;
  if(fhi>0.) return -1.;
  float t=lo;
  for(int i=0;i<15;i++) {
    t=mix(lo,hi,clamp(flo/(flo-fhi),.08,.92));
    vec3 p=ro+rd*t;
    float f=p.y-tdSea(p.xz).x;
    if(abs(f)<.008+gPixel*t*.2) break;
    if(f>0.) {lo=t; flo=f;} else {hi=t; fhi=f;}
  }
  return t;
}
void main() {
  gVortex=smoothstep(1.,2.,u_params[0]);
  gSwell=smoothstep(0.,1.,u_params[0]);
  gFlow=mod(tdFlowClock(),TAU);
  gWavePhase=mod(tdWaveClock(),TAU);
  gPixel=2./min(u_resolution.x,u_resolution.y);
  gMoon=normalize(vec3(.27,u_params[5],-1.));
  for(int i=0;i<6;i++) {
#ifdef PRECOMPUTED
    gW[i]=texelFetch(u_precomputed,ivec2(i,0),0);
#else
    gW[i]=tdWave(i);
#endif
    gK[i]=length(gW[i].xy);
    gD[i]=gW[i].xy/gK[i];
  }
  float orbit=mod(tdOrbitClock(),TAU);
  float radius=mix(54.+3.*cos(orbit),45.+2.*cos(2.*orbit),gVortex);
  vec3 ro=vec3(mix(5.*sin(orbit),radius*sin(orbit),gVortex),
    mix(4.8+1.6*gSwell+3.*u_params[6],35.+12.*u_params[6]+2.*sin(orbit),gVortex),mix(radius,radius*cos(orbit),gVortex));
  vec3 target=vec3(0.,mix(2.,-5.,gVortex),mix(-30.,0.,gVortex));
  vec3 fw=normalize(target-ro), rt=normalize(cross(fw,vec3(0,1,0))), up=cross(rt,fw);
  vec2 uv=2.*aspectUV();
  float focal=1.5*(1.+.022*u_kick);
  vec3 rd=normalize(fw*focal+rt*uv.x+up*uv.y);
  vec3 sky=tdSky(rd,true), col=sky;
  float t=tdIntersect(ro,rd);
  vec3 p=ro+rd*max(t,0.);
  // Footprints outside divergent flow, including on the horizon quads.
  float footprint=max(max(length(dFdx(p.xz)),length(dFdy(p.xz))),.012);
  vec4 surface=tdSurface(p.xz);
  float crestAA=max(.008,1.5*fwidth(surface.w));
  // These derivatives are outside the water branch, including horizon quads.
  vec2 windUV=vec2(.83*p.x+.56*p.z,-.56*p.x+.83*p.z)*vec2(.85,1.50);
  // Smooth domain bending removes even the implicit gradient lattice from
  // the lace; the separate wind filaments remain gently anisotropic.
  windUV+=.9*vec2(sin(.16*p.x+.21*p.z+gFlow),cos(.23*p.x-.14*p.z-2.*gFlow));
  windUV+=vec2(cos(gFlow),sin(gFlow))*.65;
  float lace=tdLace(windUV);
  float fineLace=tdLace(windUV*2.7+vec2(17.,9.));
  float laceAA=max(.025,1.5*fwidth(lace));
  float armPhase=5.*atan(p.z,p.x)+.44*length(p.xz)-2.*gFlow
    +.28*sin(3.*atan(p.z,p.x)-.12*length(p.xz)+gFlow);
  // Differentiate sin, not atan: no artificially broad line at the polar seam.
  float armWave=sin(armPhase), armAA=max(.025,1.5*fwidth(armWave));
  float h=surface.x;
  vec3 normal=normalize(vec3(-surface.y,1.,-surface.z));
  if(t>0.) {
    float r=length(p.xz);
    float wind=u_params[7]*(.25+.75*u_level);
    // Band-limited capillary ripples alter normals, not the silhouette.
    float keep=1.-smoothstep(.12,.5,footprint);
    vec2 micro=vec2(cos(3.1*p.x+2.4*p.z-5.*gWavePhase),sin(-2.2*p.x+4.3*p.z-7.*gWavePhase));
    normal=normalize(normal+vec3(micro.x,0.,micro.y)*.065*wind*keep);
    vec3 reflected=reflect(rd,normal);
    float fresnel=.025+.975*pow(1.-max(0.,dot(-rd,normal)),5.);
    vec3 water=mix(u_secondary*.018,u_primary*.025,.5+.5*normal.y);
    water*=.45+.55*smoothstep(-26.,3.,h);
    col=mix(water,tdSky(reflected,false),fresnel);
    float key=max(0.,dot(normal,normalize(vec3(-.4,.7,-.5))));
    float rim=pow(1.-max(0.,dot(normal,-rd)),2.);
    col+=u_secondary*(.018+.075*key)+u_primary*.018*rim;
    vec3 halfVector=normalize(gMoon-rd);
    float nh=max(0.,dot(normal,halfVector));
    float glitter=pow(nh,180.)*2.2+pow(nh,32.)*.09;
    col+=mix(u_primary,vec3(1.),.45)*glitter*(.2+.8*fresnel);
    float crest=surface.w;
    float crestMask=smoothstep(mix(.035,.14,gSwell)-crestAA,mix(.075,.29,gSwell)+crestAA,crest);
    float laceKeep=1.-smoothstep(.3,1.2,footprint*1.50);
    float ridge=abs(lace+.22*fineLace-.035);
    float threads=1.-smoothstep(.035-laceAA,.11+laceAA,ridge);
    float streak=.5+.5*sin((-p.x*.56+p.z*.83)*7.+5.*lace);
    float filamentKeep=1.-smoothstep(.25,.9,footprint*7.);
    float lacy=mix(.27,.07+.84*threads+.09*streak*filamentKeep,laceKeep);
    float foam=crestMask*lacy*mix(.10,1.,gSwell);
    float inner=smoothstep(3.,8.,r);
    float spiral=smoothstep(.76-armAA,.97+armAA,armWave)*exp(-sq((r-18.)/19.))*inner*gVortex;
    float lip=exp(-sq((r-22.5)/1.35))*gVortex;
    float coreWidth=.018+.45*armAA;
    float spiralCore=exp(-(1.-armWave)/coreWidth)*(.018/coreWidth)
      *exp(-sq((r-17.)/17.))*inner*gVortex;
    float spark=.5+.5*sin(.51*p.x-.37*p.z+3.*gWavePhase+4.*lace);
    float ignition=.46+.72*spark*spark+.45*u_kick*pow(spark,4.);
    float living=(foam*4.+spiral*(.50+2.6*threads*laceKeep)+lip*(.30+.6*threads))*u_params[3]*ignition;
    // Local gestures: an advected foam crest, a luminous spiral ridge, and
    // one broad incoming ring. None changes time or seed identity.
    float packet=pow(.5+.5*sin(.17*p.x+.22*p.z-gWavePhase*2.),8.);
    living+=foam*packet*u_rhythm.x*.7;
    living+=spiral*u_rhythm.y*.5;
    float ring=exp(-sq((r-(10.+30.*(1.-u_rhythm.z)))/1.8));
    living+=gVortex*ring*u_rhythm.z*.3;
    // The throat loses reflected light exponentially; luminous arms remain
    // visible down its walls. The small subsurface pool is deliberately faint.
    float depth=exp(min(0.,h)*.072*gVortex);
    col*=mix(1.,depth,gVortex);
    float bioDepth=mix(1.,.32+.68*depth,gVortex);
    vec3 bio=mix(u_secondary,u_primary,.20);
    col+=bio*living*bioDepth*1.75;
    float hot=pow(spark,12.)*smoothstep(.85,1.55,living);
    col+=mix(u_accent,u_primary,.12)*hot*(foam+spiral)*3.2;
    col+=u_primary*threads*threads*(foam+spiral*.3)*.20;
    col+=mix(u_secondary,u_accent,.24)*spiralCore*ignition*bioDepth*2.8*u_params[3];
    col+=mix(u_secondary,u_accent,.15)*gVortex*exp(-r*r/55.)*.25;
    // Smooth subpixel-filtered wind-torn droplets, not thresholded cells.
    float spray=tdDroplets(windUV*1.8,footprint*2.7)*(crestMask+spiral)*wind;
    col+=mix(u_accent,u_primary,.35)*spray*9.;
    col+=u_secondary*lip*(.025+.035*lace)*wind;
    float fog=1.-exp(-t*.0045);
    col=mix(col,tdSky(vec3(rd.x,.012,rd.z),false),fog);
  }
  // A shallow mist/spray layer above the funnel lip. The water hit masks it
  // correctly; it is analytic suspended spray, not an airborne simulation.
  float mistT=(6.-ro.y)/min(rd.y,-.001);
  vec3 mistP=ro+rd*max(0.,mistT);
  float mistFP=max(length(dFdx(mistP.xz)),length(dFdy(mistP.xz)));
  float mistRadius=length(mistP.xz);
  float mistRing=exp(-sq((mistRadius-22.5)/3.2))*gVortex;
  float mistVisible=mistT>0. && (t<0. || mistT<t)?1.:0.;
  float mistSpark=tdDroplets(mistP.xz*.65+vec2(cos(gFlow),sin(gFlow)),mistFP*.65);
  col+=mistVisible*mistRing*(u_secondary*.022+mix(u_primary,u_accent,.2)*mistSpark*7.)*u_params[3];
  outColor=vec4(max(col,vec3(0.)),1.);
}
`;

export default {
  id: "tide",
  number: 103,
  name: "Moon Tide",
  description:
    "A moonlit dispersive ocean gathers living crests and opens into a vast glowing maelstrom.",
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
    { rate: (p) => p[1] * 0.12, period: 2 * Math.PI },
  ],
  rhythm: [
    familyEffect(
      "crest-packet",
      0,
      "Crest packet",
      "A travelling patch of living foam wakes on the existing wave crests.",
      { period: 4, strength: 0.55, duration: 1.3 },
    ),
    familyEffect(
      "spiral-ridge",
      1,
      "Spiral ridge",
      "The maelstrom's existing spiral ridge catches a local light pulse.",
      { period: 8, strength: 0.5, duration: 2 },
    ),
    familyEffect(
      "incoming-tide",
      2,
      "Incoming tide",
      "A broad luminous ring travels across the maelstrom's shoulders.",
      { period: 16, strength: 0.6, duration: 3 },
    ),
  ],
  fragment,
  precompute: { fragment: precompute, size: [6, 1] },
};
