import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

export const REPOSE_DEGREES = 34;
export const REPOSE_SLOPE = Math.tan((REPOSE_DEGREES * Math.PI) / 180);
export const SAND_GRAVITY = 9.81;
// Independent of development: the material chart, dune sites and grain ids
// persist while the camera cranes up and the storm approaches.
export function barchanHeight(crosswind, downwind, height = 4, width = 11) {
  const v = crosswind / width;
  const h = height * Math.max(0, 1 - v * v);
  const crest = -2 + 7 * v * v;
  const d = downwind - crest;
  const windward = Math.max(0, 1 - (d / 14) ** 2);
  return Math.abs(v) >= 1
    ? 0
    : d < 0
      ? h * windward * windward
      : Math.max(0, h - REPOSE_SLOPE * d);
}
export function saltation(id, phase, wind = 1) {
  const launch = 0.7 + 0.6 * ((id * 0.61803398875) % 1);
  const flight = (2 * launch) / SAND_GRAVITY;
  const t = ((phase % 1) + 1) % 1;
  return { id, flight, x: wind * flight * t, y: launch * flight * t * (1 - t) };
}
export function rippleHeight(x, z, phase = 0) {
  const p =
    8 * z +
    2 * Math.sin(0.55 * x + 0.23 * z) +
    0.6 * Math.sin(1.1 * x - 0.18 * z) -
    phase;
  return 0.028 * (Math.sin(p) + 0.22 * Math.sin(2 * p));
}
const schema = [
  {
    key: "development",
    label: "Development · ripples / dunes / storm",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "wind",
    label: "Saltation wind",
    min: 0.2,
    max: 1.5,
    step: 0.01,
    default: 0.8,
  },
  {
    key: "height",
    label: "Dune relief",
    min: 0.6,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "ripple",
    label: "Ripple relief",
    min: 0.3,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "orbit",
    label: "Desert drift",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0.35,
  },
  {
    key: "moon",
    label: "Low moon",
    min: 0.12,
    max: 0.55,
    step: 0.01,
    default: 0.22,
  },
  {
    key: "eye",
    label: "Dune vantage",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "dust",
    label: "Suspended sand",
    min: 0.3,
    max: 1.4,
    step: 0.01,
    default: 0.85,
  },
];
const base = {
  wind: 0.8,
  height: 1,
  ripple: 1,
  orbit: 0.35,
  moon: 0.22,
  eye: 0.45,
  dust: 0.85,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Ripples", 11401, 0),
  look("Dunes", 11401, 1),
  look("Storm", 11401, 2),
  look("Silver Silt", 11402, 0.15, {
    eye: 0.1,
    ripple: 1.4,
    wind: 0.45,
    moon: 0.18,
  }),
  look("Crescent Caravan", 11403, 1, { eye: 0.85, height: 1.3, orbit: -0.55 }),
  look("Star Sands", 11404, 1.15, {
    eye: 0.6,
    height: 1.2,
    wind: 1.2,
    moon: 0.45,
  }),
  look("Buried Temple", 11405, 1.85, {
    eye: 0.15,
    height: 0.75,
    dust: 0.65,
    orbit: -0.3,
  }),
  look("Night Front", 11406, 2, {
    eye: 0.8,
    dust: 1.25,
    wind: 1.3,
    moon: 0.16,
  }),
];
const common = `${lateClockGlsl}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
float gGrowth, gStorm, gPhase, gCam, gDust, gPixel, gRelief;
vec3 gMoon;
float dsHash(vec2 p) {
  vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float dsNoise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  vec4 h;
#ifdef PRECOMPUTED
  if(min(i.x,i.y)>=-64. && max(i.x,i.y)<64.)
    h=texelFetch(u_precomputed,ivec2(i)+ivec2(64),0);
  else
#endif
    h=vec4(dsHash(i),dsHash(i+vec2(1,0)),dsHash(i+vec2(0,1)),dsHash(i+1.));
  return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
}
vec4 dsDuneData(vec2 cell) {
  float rnd=dsHash(cell+float(u_seedBits%991u));
  float angle=(rnd-.5)*.5, scale=mix(.92,1.1,rnd);
  return vec4(3.2+1.2*rnd,cos(angle)*scale,sin(angle)*scale,smoothstep(.55,.9,rnd));
}
vec3 dsBarchan(vec2 q, float h, float repose) {
  float v=q.x/11., cap=h*max(0.,1.-v*v), d=q.y-(-2.+7.*v*v);
  if(abs(v)>=1.)return vec3(0.);
  float capX=-2.*h*v/11., dX=-14.*v/11.;
  if(d<0.) {
    float w=max(0.,1.-sq(d/14.)), dw=-2.*d/196.;
    return vec3(cap*w*w,capX*w*w+2.*cap*w*dw*dX,2.*cap*w*dw);
  }
  float slip=cap-repose*d;
  return slip>0.?vec3(slip,capX-repose*dX,-repose):vec3(0.);
}
vec2 dsSite(vec2 p) {
  float row=floor((p.y+16.)/32.);
  p.x+=mod(row,2.)*14.;
  return floor((p+vec2(14,16))/vec2(28,32));
}
vec3 dsSurface(vec2 p) {
  float row=floor((p.y+16.)/32.);
  p.x+=mod(row,2.)*14.;
  vec2 cell=floor((p+vec2(14,16))/vec2(28,32));
  vec2 q=p-cell*vec2(28,32);
  vec4 data;
#ifdef PRECOMPUTED
  if(min(cell.x,cell.y)>=-16. && max(cell.x,cell.y)<16.) {
    int index=int(cell.x+16.)+int(cell.y+16.)*32;
    data=texelFetch(u_precomputed,ivec2(index%128,128+index/128),0);
  } else
#endif
    data=dsDuneData(cell);
  mat2 transform=mat2(data.y,-data.z,data.z,data.y);
  mat2 rotation=mat2(-.5,-.8660254,.8660254,-.5);
  vec2 shaped=transform*q;
  // Height and site scale change the dune size, not the mature slip angle.
  float repose=.6745085168/(length(data.yz)*u_params[2]);
  vec3 b=dsBarchan(shaped,data.x,repose);
  // Persistent star-dune arms, with exact transformed gradients.
  vec3 star=dsBarchan(rotation*shaped,data.x*.78,repose)*data.w;
  star.yz=transpose(rotation)*star.yz;
  vec3 chosen=b.x>=star.x?b:star;
  chosen.yz=transpose(transform)*chosen.yz;
  float dist=max(abs(q.x),abs(q.y)*.875);
  float f=clamp((dist-11.5)/2.5,0.,1.);
  float edge=1.-f*f*(3.-2.*f), derivative=-6.*f*(1.-f)/2.5;
  vec2 edgeGrad=abs(q.x)>abs(q.y)*.875?vec2(sign(q.x),0.):vec2(0.,sign(q.y)*.875);
  return vec3(chosen.x*edge,chosen.yz*edge+chosen.x*derivative*edgeGrad)*gRelief;
}
float dsMacro(vec2 p) { return dsSurface(p).x; }
float dsRipple(vec2 p) {
  float phase=8.*p.y+2.*sin(.55*p.x+.23*p.y)+.6*sin(1.1*p.x-.18*p.y)-gPhase;
  return .028*u_params[3]*(sin(phase)+.22*sin(2.*phase));
}
`;
// Exact reusable data, never a colour image or a sampled terrain: integer
// noise corner hashes + dune-site transforms. Both have analytic fallbacks.
const precompute = `${common}
void main() {
  ivec2 cell=ivec2(gl_FragCoord.xy);
  if(cell.y<128) {
    vec2 p=vec2(cell)-64.;
    outColor=vec4(dsHash(p),dsHash(p+vec2(1,0)),dsHash(p+vec2(0,1)),dsHash(p+1.));
  } else {
    int index=cell.x+(cell.y-128)*128;
    outColor=dsDuneData(vec2(index%32,index/32)-16.);
  }
}
`;
const fragment = `${common}
float dsTerrain(vec2 p) {
  float macro=dsMacro(p);
  return gGrowth<1.?macro+dsRipple(p)*(1.-gGrowth):macro;
}
float dsIntersect(vec3 ro, vec3 rd) {
  if(rd.y>=.015) return -1.;
  float t=max(.01,(6.2*u_params[2]-ro.y)/min(rd.y,-.001));
  float old=t;
  for(int i=0;i<64;i++) {
    vec3 p=ro+rd*t;
    float h=p.y-dsTerrain(p.xz);
    if(h<.004+gPixel*t*.25) {
      float lo=old, hi=t;
      for(int j=0;j<4;j++) { float m=.5*(lo+hi); vec3 a=ro+rd*m; if(a.y>dsTerrain(a.xz))lo=m;else hi=m; }
      return .5*(lo+hi);
    }
    old=t;
    t+=max(.012,h*.72);
    if(t>170.)break;
  }
  return -1.;
}
float dsShadow(vec3 p, vec3 l) {
  float shadow=1., t=.3;
  for(int i=0;i<8;i++) {
    vec3 q=p+l*t;
    float h=q.y-dsMacro(q.xz);
    shadow=min(shadow,6.*h/t);
    t+=.8+float(i)*1.6;
  }
  return clamp(shadow,.08,1.);
}
vec3 dsHaze() { return u_secondary*(.008+.042*.887)+u_primary*.012*.887; }
vec3 dsSky(vec3 d) {
  float horizon=exp(-max(d.y,0.)*6.);
  vec3 col=u_secondary*(.008+.042*horizon)+u_primary*.012*horizon;
  float r=length(d-gMoon), moon=1.-smoothstep(.036-gPixel,.036+gPixel,r);
  if(moon>0.) {
    float maria=dsNoise(d.xz*240.)*.28+dsNoise(d.xz*600.)*.1;
    col+=mix(u_secondary,vec3(1.),.65)*moon*(1.5-maria);
  }
  col+=mix(u_primary,u_secondary,.5)*.10*exp(-r*17.);
  vec2 sky=d.xz/max(.2,d.y+.45)*90.;
  vec2 cell=floor(sky), f=fract(sky)-.5;
  float star=exp(-dot(f,f)/max(.0015,sq(gPixel*65.)))*step(.9975,dsHash(cell+18.));
  col+=mix(u_secondary,vec3(1.),.4)*star*smoothstep(.04,.3,d.y)*.8;
  return col;
}
float dsGrains(vec3 q, float fp) {
  vec2 cell=floor(q.xz/vec2(.18,.45));
  float total=0., surface=dsTerrain(q.xz);
  for(int k=0;k<2;k++) {
    vec2 c=cell-vec2(0,float(k));
    float id=floor(dsHash(c+float(u_seedBits%997u))*10000.);
    float age=fract(gPhase/TAU+dsHash(c+91.));
    float launch=(.7+.6*fract(id*.61803398875))*(1.+.08*u_rhythm.z), flight=2.*launch/9.81;
    vec2 pos=(c+vec2(.5,.2))*vec2(.18,.45)+vec2(0,u_params[1]*flight*age);
    float y=launch*flight*age*(1.-age);
    float h=surface;
    float sigma=max(.008,fp*.55);
    float distance2=dot(q.xz-pos,q.xz-pos)+sq(q.y-h-y);
    float crest=mix(1.,smoothstep(1.8,3.3,h/max(gRelief,.01)),gGrowth);
    total+=exp(-distance2/(sigma*sigma))*(.008/sigma)*crest;
  }
  return total;
}
// Analytic ray-box intersection: opaque monoliths depth-test against both
// the terrain and the dust volume. The fixed sites never depend on development.
vec2 dsBox(vec3 ro, vec3 rd, vec3 c, vec3 b) {
  vec3 inv=sign(rd)/max(abs(rd),vec3(.00001));
  vec3 a=(c-b-ro)*inv, z=(c+b-ro)*inv;
  vec3 lo=min(a,z), hi=max(a,z);
  float near=max(lo.x,max(lo.y,lo.z)), far=min(hi.x,min(hi.y,hi.z));
  return near>0.&&far>near?vec2(near,lo.x>lo.y&&lo.x>lo.z?0.:lo.y>lo.z?1.:2.):vec2(1e5,0.);
}
void main() {
  gGrowth=smoothstep(0.,1.,u_params[0]); gStorm=smoothstep(1.,2.,u_params[0]);
#ifdef PHOSPHOR_LATE
  gPhase=mod(u_clock[0],TAU); gCam=u_clock[1]; gDust=u_clock[2];
#else
  gPhase=mod(u_time*u_params[1]*1.2,TAU);
  gCam=u_time*u_params[4]*.025;
  gDust=mod(u_time*u_params[1]*.08,TAU);
#endif
  gPixel=2./min(u_resolution.x,u_resolution.y);
  gRelief=mix(.22,1.,gGrowth)*u_params[2];
  gMoon=normalize(vec3(-.6,u_params[5],-1.));
  float yaw=.08*sin(gCam);
  vec3 ro=vec3(2.+2.*sin(gCam),mix(1.3,11.+5.*u_params[6],gGrowth)+gStorm*2.,mix(13.,29.,gGrowth));
  vec3 target=vec3(0.,mix(-3.,2.,gGrowth)+gStorm*9.,-14.);
  vec3 fw=normalize(target-ro), rt=normalize(cross(fw,vec3(0,1,0))), up=cross(rt,fw);
  vec2 uv=aspectUV()*2.;
  vec3 rd=normalize(fw*(1.65+.025*u_kick)+rt*(uv.x+yaw)+up*uv.y);
  float t=dsIntersect(ro,rd), depth=t>0.?t:220.;
  vec3 p=ro+rd*depth;
  float fp=max(gPixel*depth,.008);
  vec3 col=t<0.?dsSky(rd):dsHaze();
  if(t>0.) {
    vec3 surface=dsSurface(p.xz);
    float h=surface.x;
    vec2 grad=surface.yz;
    float bend=.55*p.x+.23*p.z, fine=1.1*p.x-.18*p.z;
    float phase=8.*p.z+2.*sin(bend)+.6*sin(fine)-gPhase;
    float keep=1.-smoothstep(.1,.5,fp);
    float dr=.028*u_params[3]*(cos(phase)+.44*cos(2.*phase))*keep*mix(1.,.25,gGrowth);
    grad+=dr*vec2(1.1*cos(bend)+.66*cos(fine),8.+.46*cos(bend)-.108*cos(fine));
    vec3 n=normalize(vec3(-grad.x,1.,-grad.y));
    float key=max(0.,dot(n,gMoon)), shadow=dsShadow(p+vec3(0,.06,0),gMoon);
    float ao=.5+.5*smoothstep(0.,1.,h);
    float rim=pow(1.-max(0.,dot(n,-rd)),3.);
    float grain=dsNoise(p.xz*5.);
    float rough=mix(.83,grain*.38+.74,1.-smoothstep(.12,.5,fp));
    col=mix(u_secondary,u_primary,.3)*(.05+key*shadow*1.05)*ao*rough;
    col+=u_primary*(rim*key*.035+.025*(1.-n.y));
    float sheen=pow(max(0.,dot(n,normalize(gMoon-rd))),50.);
    col+=mix(u_secondary,vec3(1.),.25)*sheen*shadow*.08;
    // Saltation: ballistic arcs above the existing crest, carried along wind.
    // Launch speed .7..1.3 m/s, gravity 9.81; phase wraps only at the ground.
    float crest=exp(-sq(length(grad)-.55)/.02)*smoothstep(.25,1.,h);
    float lanes=dsNoise(vec2(p.x*2.,p.z*.3)+vec2(sin(gPhase),cos(gPhase)));
    float packet=pow(.5+.5*sin(p.z*1.7-gPhase*3.+p.x*.3),4.);
    float salt=crest*lanes*packet*(.2+.8*u_level)*u_params[1];
    salt*=1.+u_rhythm.x*.6+u_rhythm.y*.35;
    col+=mix(u_secondary,u_primary,.6)*salt*.22;
    float fog=1.-exp(-depth*(.006+gStorm*.004)*u_params[7]);
    col=mix(col,dsHaze(),fog);
    if(rd.y<-.06 && fp<.045) {
      float sand=0.;
      for(int k=0;k<2;k++) {
        float s=max(0.,t-(.025+.045*float(k))/(-rd.y));
        sand+=dsGrains(ro+rd*s,fp);
      }
      col+=mix(u_secondary,vec3(1.),.25)*sand*(1.-smoothstep(.025,.045,fp))*(.6+.8*u_level)*u_params[1]*(1.+.6*u_rhythm.x+.4*u_rhythm.y);
    }
  }
  float monolith=1e5, face=0.;
  vec3 monoCentre=vec3(0), monoBounds=vec3(1);
  for(int i=0;i<5;i++) {
    float j=float(i)-2.;
    float high=(i==2?32.:12.+5.*dsHash(vec2(float(i),float(u_seedBits%997u))))*gStorm;
    vec3 c=vec3(j*9.,high*.5-1.,-16.-abs(j)*4.);
    vec3 bounds=vec3(i==2?2.5:1.4,high*.5,1.8);
    vec2 box=dsBox(ro,rd,c,bounds);
    if(box.x<monolith) {monolith=box.x;face=box.y;monoCentre=c;monoBounds=bounds;}
  }
  if(monolith<depth) {
    depth=monolith; p=ro+rd*depth;
    col=u_secondary*(face<.5?.075:face<1.5?.16:.018);
    vec3 edges=abs(abs(p-monoCentre)-monoBounds);
    float edge=min(max(edges.x,edges.y),min(max(edges.y,edges.z),max(edges.z,edges.x)));
    float bevel=exp(-edge/max(.045,gPixel*depth*.5));
    col+=mix(u_secondary,u_primary,.3)*bevel*.42;
    float seam=pow(.5+.5*cos(p.y*1.8),40.);
    col+=u_primary*seam*.018;
    col=mix(col,u_secondary*.06,1.-exp(-depth*.006));
  }
  // Eight bounded slabs through the haboob. Density is a rolling cellular
  // front, not a screen overlay; foreground dunes/monoliths occlude it.
  if(gStorm>.001 && rd.z<-.01) {
    float start=max(0.,(-29.-ro.z)/rd.z), end=min(depth,(-65.-ro.z)/rd.z);
    float stepSize=max(0.,end-start)/8., trans=1.;
    vec3 cloud=vec3(0.);
    for(int i=0;i<8;i++) {
      float s=start+(float(i)+.5)*stepSize;
      vec3 q=ro+rd*s;
      vec2 roll=vec2(sin(gDust),cos(gDust));
      vec2 warp=vec2(sin(q.y*.15+roll.x),cos(q.x*.11+roll.y))*1.4;
      vec2 chart=q.xy*.12+roll+warp;
      float n=dsNoise(chart)+dsNoise(q.xy*.28+q.z*.055+roll*2.)*.45;
      float nLight=dsNoise(chart+vec2(-.28,.45));
      float front=-44.+gStorm*12.+5.*sin(q.x*.065)+4.*(n-.5);
      float top=24.+10.*dsNoise(vec2(q.x*.06,q.z*.02))+3.*sin(q.x*.16);
      float density=(1.-smoothstep(front-4.,front+3.,q.z))*(1.-smoothstep(top-4.,top+3.,q.y))*smoothstep(-1.,4.,q.y);
      float alpha=1.-exp(-density*stepSize*.11*gStorm*u_params[7]);
      float edge=exp(-sq((q.z-front)/5.));
      float inner=exp(-sq((q.x+8.)/5.)-sq((q.y-16.)/4.))*edge;
      float key=clamp(.45+2.*(n-nLight),.1,1.);
      vec3 lit=u_secondary*(.035+.38*key)+u_primary*(.02+.10*edge);
      lit+=mix(u_primary,u_accent,.38)*inner*(3.8+.6*u_kick+.8*u_rhythm.z);
      cloud+=trans*alpha*lit;
      trans*=1.-alpha;
    }
    col=col*trans+cloud;
  }
  outColor=vec4(max(col,vec3(0)),1.);
}
`;
export default {
  id: "dunes",
  number: 114,
  name: "Dune Sea",
  description:
    "Moonlit ripples rise into crescent dunes before a rolling haboob reveals dark monoliths.",
  development: "development",
  schema,
  presets,
  type: { key: "development", values: [0, 1, 2] },
  stage: ["height", "wind", "dust"],
  energy: { wind: { mul: [0.7, 1.25] } },
  beat: { punch: 0.12, pulse: 0.1 },
  clocks: [
    { rate: (p) => p[1] * 1.2, period: 2 * Math.PI },
    { rate: (p) => p[4] * 0.025, period: 2 * Math.PI },
    { rate: (p) => p[1] * 0.08, period: 2 * Math.PI },
  ],
  rhythm: [
    familyEffect(
      "crest-saltation",
      0,
      "Crest saltation",
      "A packet of windblown grains follows the existing dune crests.",
      { period: 4, strength: 0.55, duration: 1.4 },
    ),
    familyEffect(
      "slipface-stream",
      1,
      "Slipface stream",
      "A second sand stream grazes the persistent slip faces.",
      { period: 8, strength: 0.5, duration: 2 },
    ),
    familyEffect(
      "haboob-roll",
      2,
      "Haboob roll",
      "A slow gust lifts crest grains and lights one rolling fold inside the dust wall.",
      { period: 16, strength: 0.5, duration: 3 },
    ),
  ],
  fragment,
  precompute: { fragment: precompute, size: [128, 136] },
};
