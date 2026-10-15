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

// Shared exact wave data, also used to populate the optional world-space
// surface table. This is geometry/normal data, never a colour buffer.
const gerstner = `
vec4 gW[6];
float gK[6];
vec2 gD[6];
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
// Low-pass material derivative: the foam front belongs to the waves, not
// to a noise texture. Geometry retains all six dispersive modes.
float tdExactCrest(vec2 x) {
  vec2 q=tdMaterial(x);
  float front=0.;
  for(int i=0;i<4;i++) {
    vec4 w=gW[i];
    front+=w.z*dot(w.xy,gD[0])*cos(dot(w.xy,q)+w.w);
  }
  return front;
}
vec4 tdExactWaves(vec2 x) {
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
  return vec4(h,gradient,crest);
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
float gVortex, gFlow;
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
`;
const precompute = `${common}
void main() {
  ivec2 cell=ivec2(gl_FragCoord.xy);
  if(cell.y==0) {
    outColor=cell.x<6?tdWave(cell.x):vec4(0.);
    return;
  }
  gVortex=smoothstep(1.,2.,u_params[0]);
  gFlow=mod(tdFlowClock(),TAU);
  for(int i=0;i<6;i++) {
    gW[i]=tdWave(i); gK[i]=length(gW[i].xy); gD[i]=gW[i].xy/gK[i];
  }
  vec2 p=(vec2(cell.x%512,cell.y-1)/511.-.5)*256.;
  if(cell.x>=512) {
    outColor=vec4(u_params[0]>0.?tdExactCrest(p):0.,0.,0.,0.);
    return;
  }
  vec3 bowl=tdBowlExact(p);
  outColor=tdExactWaves(p)+vec4(bowl,0.);
}
`;

const fragment = `${common}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
float gSwell, gPixel, gWavePhase, gWaveHeight;
vec3 gMoon;
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
vec4 tdSurface(vec2 p) {
#ifdef PRECOMPUTED
  // Bilinear world-space surface data; shading stays full-resolution.
  // Keep the polar core and the table boundary on the exact fallback.
  if(max(abs(p.x),abs(p.y))<127.5 && dot(p,p)>36.) {
    vec2 grid=(p/256.+.5)*511.;
    ivec2 cell=ivec2(floor(grid))+ivec2(0,1);
    vec2 f=fract(grid);
    vec4 data=mix(mix(texelFetch(u_precomputed,cell,0),
                      texelFetch(u_precomputed,cell+ivec2(1,0),0),f.x),
                  mix(texelFetch(u_precomputed,cell+ivec2(0,1),0),
                      texelFetch(u_precomputed,cell+ivec2(1),0),f.x),f.y);
    float blend=smoothstep(36.,64.,dot(p,p))*(1.-smoothstep(126.,127.5,max(abs(p.x),abs(p.y))));
    if(blend<1.) return mix(tdExactWaves(p)+vec4(tdBowlExact(p),0.),data,blend);
    return data;
  }
#endif
  return tdExactWaves(p)+vec4(tdBowlExact(p),0.);
}
float tdFoamFront(vec2 p) {
  if(gSwell==0.) return 0.;
#ifdef PRECOMPUTED
  // Right bank stores only the signed material slope. The exact fallback
  // and smooth table-edge blend match the geometry bank's footprint.
  if(max(abs(p.x),abs(p.y))<127.5 && dot(p,p)>36.) {
    vec2 grid=(p/256.+.5)*511.;
    ivec2 cell=ivec2(floor(grid))+ivec2(512,1);
    vec2 f=fract(grid);
    float data=mix(mix(texelFetch(u_precomputed,cell,0).x,
                       texelFetch(u_precomputed,cell+ivec2(1,0),0).x,f.x),
                   mix(texelFetch(u_precomputed,cell+ivec2(0,1),0).x,
                       texelFetch(u_precomputed,cell+ivec2(1),0).x,f.x),f.y);
    float blend=smoothstep(36.,64.,dot(p,p))*(1.-smoothstep(126.,127.5,max(abs(p.x),abs(p.y))));
    if(blend<1.) return mix(tdExactCrest(p),data,blend);
    return data;
  }
#endif
  return tdExactCrest(p);
}
vec2 tdSea(vec2 x) {
#ifdef PRECOMPUTED
  return tdSurface(x).xw;
#else
  vec2 q=tdMaterial(x);
  float h=0., crest=0.;
  for(int i=0;i<6;i++) {
    vec4 w=gW[i]; float s=sin(dot(w.xy,q)+w.w);
    h+=w.z*s;
    crest+=gK[i]*w.z*s;
  }
  return vec2(h+tdBowlExact(x).x,crest);
#endif
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
  for(int i=0;i<15;i++) {
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
void main() {
  gVortex=smoothstep(1.,2.,u_params[0]);
  gSwell=smoothstep(0.,1.,u_params[0]);
  gFlow=mod(tdFlowClock(),TAU);
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
  // The low-pass material slope vanishes along breaking wave crests.
  // Excluding the two shortest modes keeps the front continuous;
  // compression distinguishes the luminous crest from the dark trough.
  float crestFront=tdFoamFront(p.xz);
  float crestSide=smoothstep(.0,.13,surface.w);
  float frontAA=max(.0015,1.25*fwidth(crestFront));
  vec2 windUV=vec2(.83*p.x+.56*p.z,-.56*p.x+.83*p.z)*vec2(.42,1.50);
  windUV+=vec2(cos(gFlow),sin(gFlow))*.65;
  float armPhase=5.*atan(p.z,p.x)+.44*length(p.xz)-2.*gFlow
    +.28*sin(3.*atan(p.z,p.x)-.12*length(p.xz)+gFlow);
  // Differentiate periodic sin/cos, not atan: no polar-seam AA flare.
  float armWave=sin(armPhase), armAcross=cos(armPhase);
  float armAA=max(.006,1.25*fwidth(armAcross));
  float h=surface.x;
  vec3 normal=normalize(vec3(-surface.y,1.,-surface.z));
  if(t>0.) {
    float r=length(p.xz);
    float wind=u_params[7]*(.25+.75*u_level);
    // Band-limited capillary ripples alter normals, not the silhouette.
    float keep=1.-smoothstep(.12,.5,footprint);
    vec2 micro=vec2(cos(3.1*p.x+2.4*p.z-5.*gWavePhase),sin(-2.2*p.x+4.3*p.z-7.*gWavePhase));
    normal=normalize(normal+vec3(micro.x,0.,micro.y)*.065*wind*keep*mix(.25,1.,gSwell));
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
    float develop=smoothstep(.08,.85,gSwell);
    float outer=mix(1.,smoothstep(26.,40.,r),gVortex);
    float breaking=(.12+.88*crestMask)*crestSide*develop*outer;
    float frontWidth=.006+frontAA;
    float foam=breaking*exp(-sq(crestFront/frontWidth))*(.006/frontWidth);
    // A softer, one-sided wake fades behind the bright breaking front.
    float wake=breaking*exp(-sq((crestFront-.045)/.07))*smoothstep(-.008,.012,crestFront);
    float halo=breaking*exp(-sq(crestFront/.08));
    float inner=smoothstep(3.,8.,r);
    float armWindow=exp(-sq((r-18.)/19.))*inner*gVortex*smoothstep(.1,.6,armWave);
    float churn=.4+.6*tdNoise(p.xz*.10+vec2(cos(gFlow),sin(gFlow)));
    float spiral=exp(-sq((armAcross+.22)/.44))*(1.-smoothstep(-armAA,.06+armAA,armAcross))*armWindow*churn;
    float lip=exp(-sq((r-22.5)/1.35))*gVortex;
    float coreWidth=.025+armAA;
    float spiralCore=exp(-sq(armAcross/coreWidth))*(.025/coreWidth)*armWindow*(.65+.35*churn);
    // Broad parallel streaks roll within the wake, not across its leading
    // edge. Their wavelengths are metres, not per-pixel brush filaments.
    float roll=.075*sin(.67*r+2.*gFlow)+.025*sin(1.4*r-3.*gFlow);
    float trailAcross=armAcross+.29+roll;
    float trailWidth=.075+armAA;
    float armTrail=(exp(-sq(trailAcross/trailWidth))
      +.6*exp(-sq((armAcross+.57+roll*.7)/trailWidth)))
      *(.075/trailWidth)*armWindow*churn;
    // Broad flares travel along the crest; they never corrugate its edge.
    float spark=.5+.5*sin(.09*p.x-.07*p.z+3.*gWavePhase);
    float ignition=.46+.72*spark*spark+.45*u_kick*pow(spark,4.);
    float living=(foam*4.8+wake*.30+spiral*.42+spiralCore*2.4+armTrail*.8+lip*.12)*u_params[3]*ignition;
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
    col+=mix(u_secondary,vec3(1.),.65)*(foam+spiralCore)*(.18+.26*key)*bioDepth;
    // Nearby water carries the same light as a broad, surface-weighted pool.
    col+=mix(u_secondary,u_primary,.35)*(halo*.20+wake*.16+spiral*.22)*u_params[3]*bioDepth*(.6+.4*normal.y);
    float hot=pow(spark,16.)*smoothstep(.85,1.55,living);
    col+=mix(u_accent,u_primary,.15)*hot*(foam+spiralCore)*2.;
    col+=mix(u_secondary,u_accent,.15)*gVortex*exp(-r*r/55.)*.12;
    // Smooth subpixel-filtered wind-torn droplets, not thresholded cells.
    float spray=tdDroplets(windUV*1.8,footprint*2.7)*(crestMask*gSwell+spiral)*wind;
    col+=mix(u_accent,u_primary,.35)*spray*9.;
    col+=u_secondary*lip*.025*wind;
    float fog=1.-exp(-t*.0045);
    col=mix(col,tdSky(vec3(rd.x,.012,rd.z),false),fog);
  }
  // Three thin strata of wind-torn spindrift. Separate depths create
  // parallax over the lip; every stratum remains water-occluded. All drift
  // terms are exactly periodic in the integrated flow clock.
  for(int layer=0;layer<3;layer++) {
    float l=float(layer);
    float mistT=(5.5+1.7*l-ro.y)/min(rd.y,-.001);
    vec3 mistP=ro+rd*max(0.,mistT);
    float mistFP=max(length(dFdx(mistP.xz)),length(dFdy(mistP.xz)));
    float mistRadius=length(mistP.xz);
    float gust=.65+.35*sin(3.*atan(mistP.z,mistP.x)+gFlow+2.*l);
    float mistRing=exp(-sq((mistRadius-22.5-l*.7)/(2.3+l*.6)))*gVortex*gust;
    float mistVisible=mistT>0. && (t<0. || mistT<t)?1.:0.;
    vec2 drift=vec2(cos(gFlow+l),sin(gFlow+l))*(1.+l*.4);
    float mistSpark=tdDroplets(mistP.xz*vec2(.65,1.1)+drift+17.*l,mistFP*1.1);
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
  precompute: { fragment: precompute, size: [1024, 513] },
};
