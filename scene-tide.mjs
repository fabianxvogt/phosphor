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
float gVortex, gSwell, gFlow, gPixel, gWavePhase;
vec3 gMoon;
// Newton inversion of Gerstner's horizontal map. Its Jacobian has
// lambda_min >= 1 - sum(Q*k*A) >= .446 over the ENTIRE schema range.
vec2 tdMaterial(vec2 x) {
  vec2 q=x;
  for(int iteration=0;iteration<2;iteration++) {
    vec2 displacement=vec2(0.);
    float jxx=1., jxz=0., jzz=1.;
    for(int i=0;i<6;i++) {
      vec4 w=gW[i]; float k=length(w.xy), phase=dot(w.xy,q)+w.w;
      displacement += .65*w.z*(w.xy/k)*cos(phase);
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
  float depression=-27.*exp(-r*r/245.);
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
  float dr=-depression*2.*r/245.-lip*2.*(r-23.)/49.;
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
    crest+=length(w.xy)*w.z*s;
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
    float s=sin(phase), c=cos(phase), k=length(w.xy);
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
  float lo=0., hi=min(700.,(-38.-ro.y)/rd.y);
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
  }
  float orbit=mod(tdOrbitClock(),TAU);
  vec3 ro=vec3(5.*sin(orbit),mix(4.8+1.6*gSwell+3.*u_params[6],33.+13.*u_params[6],gVortex),54.+3.*cos(orbit));
  vec3 target=vec3(0.,mix(2.,-4.,gVortex),mix(-30.,0.,gVortex));
  vec3 fw=normalize(target-ro), rt=normalize(cross(fw,vec3(0,1,0))), up=cross(rt,fw);
  vec2 uv=2.*aspectUV();
  float focal=1.5*(1.+.022*u_kick);
  vec3 rd=normalize(fw*focal+rt*uv.x+up*uv.y);
  vec3 sky=tdSky(rd,true), col=sky;
  float t=tdIntersect(ro,rd);
  vec3 p=ro+rd*max(t,0.);
  // Footprints outside divergent flow, including on the horizon quads.
  float footprint=max(gPixel*max(t,1.),.018);
  vec4 surface=tdSurface(p.xz);
  float h=surface.x;
  vec3 normal=normalize(vec3(-surface.y,1.,-surface.z));
  if(t>0.) {
    float r=length(p.xz), a=atan(p.z,p.x);
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
    float texture=mix(.5,tdNoise(p.xz*1.6+vec2(cos(gFlow),sin(gFlow))),1.-smoothstep(.3,1.,footprint*1.6));
    float foam=smoothstep(mix(.014,.065,gSwell),mix(.095,.32,gSwell),crest)*smoothstep(.30,.68,texture);
    foam*=mix(.20,1.,gSwell);
    float armPhase=5.*a+.44*r-2.*gFlow+.28*sin(3.*a-.12*r+gFlow);
    float spiral=pow(.5+.5*sin(armPhase),22.)*exp(-sq((r-21.)/17.))*gVortex;
    float veins=mix(.5,tdNoise(p.xz*5.),1.-smoothstep(.3,1.,footprint*5.));
    float filaments=.65+.35*sin(p.x*8.+p.z*3.+3.*texture)*(1.-smoothstep(.5,1.5,footprint*8.));
    float living=foam*(.35+.85*veins)*filaments+spiral*(.3+.7*texture);
    living*=u_params[3];
    // Local gestures: an advected foam crest, a luminous spiral ridge, and
    // one broad incoming ring. None changes time or seed identity.
    float packet=pow(.5+.5*sin(.17*p.x+.22*p.z-gWavePhase*2.),8.);
    living+=foam*packet*u_rhythm.x*.7;
    living+=spiral*u_rhythm.y*.5;
    float ring=exp(-sq((r-(10.+30.*(1.-u_rhythm.z)))/1.8));
    living+=gVortex*ring*u_rhythm.z*.3;
    vec3 bio=mix(u_primary,u_secondary,.4);
    col+=bio*living*1.45;
    col+=u_accent*(pow(max(0.,living-.65),3.)*.65+spiral*pow(texture,4.)*.32);
    col+=u_secondary*gVortex*exp(-r*r/500.)*max(0.,1.-normal.y)*.045;
    // Fine wind-torn spindrift, tied to the crests rather than screen noise.
    float spray=pow(tdNoise(p.xz*8.),14.)*foam*wind*(1.-smoothstep(.35,1.,footprint*8.));
    col+=u_primary*spray*3.;
    float fog=1.-exp(-t*.006);
    col=mix(col,tdSky(vec3(rd.x,.012,rd.z),false),fog);
  }
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
