import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

export const REPOSE_DEGREES = 34;
export const REPOSE_SLOPE = Math.tan((REPOSE_DEGREES * Math.PI) / 180);
export const SAND_GRAVITY = 9.81;
// Independent of development: material chart, dune sites and grain ids
// persist while the viewpoint rises gently and ground-connected dust approaches.
export function barchanHeight(crosswind, downwind, height = 4, width = 11) {
  const v = crosswind / width;
  const h = height * Math.max(0, (1 - v * v) * (1 + 0.6 * v * v));
  const crest = -3 + 13 * v * v;
  const d = downwind - crest;
  const shoulder = 14 - 8 * v * v;
  const windward = Math.max(0, 1 - (d / shoulder) ** 2);
  if (Math.abs(v) >= 1) return 0;
  if (d < 0) return h * windward * windward;
  return Math.max(0, h - REPOSE_SLOPE * d);
}
export function saltation(id, phase, wind = 1) {
  const launch = 0.7 + 0.6 * ((id * 0.61803398875) % 1);
  const flight = (2 * launch) / SAND_GRAVITY;
  const t = ((phase % 1) + 1) % 1;
  return { id, flight, x: wind * flight * t, y: launch * flight * t * (1 - t) };
}
export function rippleHeight(x, z, phase = 0) {
  const p =
    6 * (0.55 * x + 0.84 * z) +
    2.6 * Math.sin(0.31 * x - 0.19 * z + 1.4 * Math.sin(0.09 * z)) +
    2.2 * Math.sin(0.13 * x + 0.35 * z) +
    0.8 * Math.sin(0.8 * x + 0.57 * z) -
    phase;
  const amplitude = 0.028 * (0.65 + 0.35 * Math.sin(0.2 * x + 0.23 * z));
  return amplitude * (Math.sin(p) + 0.22 * Math.sin(2 * p));
}
// A continuous, compactly supported leading ridge; no tiled crest identities.
export function leadingRidge(x, z) {
  const centre = -2 + 4.8 * Math.sin(0.065 * z) + 1.2 * Math.sin(0.13 * z);
  const d = x - centre;
  const h = 3.4;
  const w = Math.max(0, 1 - (d / 9) ** 2);
  return d < 0 ? h * w * w : Math.max(0, h - REPOSE_SLOPE * d);
}
export function rippleFilter(width) {
  return Math.exp(-0.5 * width * width);
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
float gGrowth, gStorm, gPhase, gCam, gDust, gPixel, gRelief, gVeil, gGustLane;
vec3 gMoon;
float dsHash(vec2 p) {
  vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
vec2 dsStoneSite(float i) {
  float j=i-2.;
  return vec2(j*10.+2.*sin(i*3.7),-13.-abs(j)*5.-7.*dsHash(vec2(i,83.)));
}
vec3 dsNoiseSlope(vec2 p) {
  vec2 i=floor(p), raw=fract(p), derivative=6.*raw*(1.-raw);
  vec2 f=raw*raw*(3.-2.*raw);
  vec4 h;
#ifdef PRECOMPUTED
  if(min(i.x,i.y)>=-64. && max(i.x,i.y)<64.)
    h=texelFetch(u_precomputed,ivec2(i)+ivec2(64),0);
  else
#endif
    h=vec4(dsHash(i),dsHash(i+vec2(1,0)),dsHash(i+vec2(0,1)),dsHash(i+1.));
  float n=mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
  return vec3(n,mix(h.y-h.x,h.w-h.z,f.y)*derivative.x,mix(h.z-h.x,h.w-h.y,f.x)*derivative.y);
}
float dsNoise(vec2 p) { return dsNoiseSlope(p).x; }
vec4 dsDuneData(vec2 cell) {
  float rnd=dsHash(cell+float(u_seedBits%991u));
  float angle=1.05+(rnd-.5)*.5, scale=mix(.92,1.1,rnd);
  return vec4(3.2+1.2*rnd,cos(angle)*scale,sin(angle)*scale,smoothstep(.55,.9,rnd));
}
vec4 dsBarchan(vec2 q, float h, float repose) {
  float v=q.x/11., cap=h*max(0.,(1.-v*v)*(1.+.6*v*v)), d=q.y-(-3.+13.*v*v);
  if(abs(v)>=1.)return vec4(0.,0.,0.,100.);
  float capX=h*(-.8*v-2.4*v*v*v)/11., dX=-26.*v/11.;
  if(d<0.) {
    float shoulder=14.-8.*v*v, shoulderX=-16.*v/11.;
    float w=max(0.,1.-sq(d/shoulder)), dw=-2.*d/(shoulder*shoulder);
    float wx=dw*dX+2.*d*d*shoulderX/(shoulder*shoulder*shoulder);
    return vec4(cap*w*w,capX*w*w+2.*cap*w*wx,2.*cap*w*dw,-d);
  }
  float slip=cap-repose*d;
  return slip>0.?vec4(slip,capX-repose*dX,-repose,d):vec4(0.,0.,0.,100.);
}
vec2 dsSite(vec2 p) {
  float row=floor((p.y+16.)/32.);
  p.x+=mod(row,2.)*14.;
  return floor((p+vec2(14,16))/vec2(28,32));
}
vec4 dsLeading(vec2 world) {
  float s=sin(.065*world.y), c=cos(.065*world.y);
  float centre=-2.+4.8*s+2.4*s*c;
  float centreZ=.312*c+.156*(1.-2.*s*s);
  float d=world.x-centre, h=3.4;
  float w=max(0.,1.-sq(d/9.));
  float height=d<0.?h*w*w:max(0.,h-.6745085168*d);
  float dx=d<0.?-4.*h*w*d/81.:-.6745085168;
  vec2 gradient=height>0.?vec2(dx,-dx*centreZ):vec2(0.);
  return vec4(vec3(height,gradient)*(1.-.35*gGrowth),abs(d));
}
vec4 dsSurface(vec2 world) {
  vec4 leading=vec4(0,0,0,100);
  if(gGrowth<=1.) {
    leading=dsLeading(world);
    // The continuous ridge already dominates every possible tiled dune.
    if(leading.x>4.4*gRelief+.8)return leading;
  }
  vec2 p=world;
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
  float repose=.6745085168/(length(data.yz)*u_params[2]*1.2);
  vec4 b=dsBarchan(shaped,data.x,repose);
  // Persistent star-dune arms, with exact transformed gradients.
  vec4 chosen=b;
  if(data.w>0.) {
    vec4 star=dsBarchan(rotation*shaped,data.x*.78,repose);
    star.xyz*=data.w;
    star.yz=transpose(rotation)*star.yz;
    if(star.x>b.x)chosen=star;
  }
  chosen.yz=transpose(transform)*chosen.yz;
  float dist=max(abs(q.x),abs(q.y)*.875);
  float f=clamp((dist-5.)/9.,0.,1.);
  float edge=1.-f*f*(3.-2.*f), derivative=-6.*f*(1.-f)/9.;
  vec2 edgeGrad=abs(q.x)>abs(q.y)*.875?vec2(sign(q.x),0.):vec2(0.,sign(q.y)*.875);
  vec4 result=vec4(vec3(chosen.x*edge,chosen.yz*edge+chosen.x*derivative*edgeGrad)*gRelief,chosen.w);
  float join=clamp(.5+.5*(leading.x-result.x)/.8,0.,1.);
  return vec4(mix(result.xyz,leading.xyz,join)+vec3(.8*join*(1.-join),0,0),mix(result.w,leading.w,join));
}
// Height-only hot path: no gradient transport or brink selection in marching
// and shadows. This is the same exact profile, not a sampled approximation.
float dsProfile(vec2 q, float h, float repose) {
  float v=q.x/11.;
  if(abs(v)>=1.)return 0.;
  float cap=h*max(0.,(1.-v*v)*(1.+.6*v*v)), d=q.y-(-3.+13.*v*v);
  float w=max(0.,1.-sq(d/(14.-8.*v*v)));
  return d<0.?cap*w*w:max(0.,cap-repose*d);
}
float dsMacro(vec2 p) {
  float leading=0.;
  if(gGrowth<=1.) {
    float s=sin(.065*p.y), c=cos(.065*p.y);
    float d=p.x-(-2.+4.8*s+2.4*s*c), w=max(0.,1.-sq(d/9.));
    leading=(d<0.?3.4*w*w:max(0.,3.4-.6745085168*d))*(1.-.35*gGrowth);
    if(leading>4.4*gRelief+.8)return leading;
  }
  float row=floor((p.y+16.)/32.); p.x+=mod(row,2.)*14.;
  vec2 cell=floor((p+vec2(14,16))/vec2(28,32)), q=p-cell*vec2(28,32);
  vec4 data;
#ifdef PRECOMPUTED
  if(min(cell.x,cell.y)>=-16. && max(cell.x,cell.y)<16.) {
    int index=int(cell.x+16.)+int(cell.y+16.)*32;
    data=texelFetch(u_precomputed,ivec2(index%128,128+index/128),0);
  } else
#endif
    data=dsDuneData(cell);
  q=mat2(data.y,-data.z,data.z,data.y)*q;
  float repose=.6745085168/(length(data.yz)*u_params[2]*1.2);
  float h=dsProfile(q,data.x,repose);
  if(data.w>0.)h=max(h,dsProfile(mat2(-.5,-.8660254,.8660254,-.5)*q,data.x*.78,repose)*data.w);
  vec2 local=p-cell*vec2(28,32);
  float f=clamp((max(abs(local.x),abs(local.y)*.875)-5.)/9.,0.,1.);
  float dune=h*(1.-f*f*(3.-2.*f))*gRelief;
  float join=clamp(.5+.5*(leading-dune)/.8,0.,1.);
  return mix(dune,leading,join)+.8*join*(1.-join);
}
// A real thin curved grain sheet, cached as exact vertices, not surface paint.
vec3 dsVeilVertex(int index) {
  float u=float(index%3)*.5, v=float(index/3)/4.;
  float z=11.+4.*sin(gGustLane)+(v-.5)*18.;
  float centre=-2.+4.8*sin(.065*z)+1.2*sin(.13*z);
  float x=centre+.5+u*(4.+gVeil*2.);
  float base=dsMacro(vec2(centre,z));
  float curl=.25*sin(z*.65-gPhase*2.+u*4.);
  float lift=1.+gVeil*(.25+.75*u_level)*1.5+sin(u*PI)*1.1+curl;
  return vec3(x,base+lift,z);
}
vec3 dsVeilFetch(int index) {
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed,ivec2(index,136),0).xyz;
#else
  return dsVeilVertex(index);
#endif
}
// The chart has varying spacing, orientation and amplitude. Harmonics get
// independent Gaussian pixel integrals rather than a world-distance cutoff.
vec3 dsRippleChart(vec2 p) {
  float a=.31*p.x-.19*p.y+1.4*sin(.09*p.y), b=.13*p.x+.35*p.y, c=.8*p.x+.57*p.y;
  float phase=6.*dot(p,vec2(.55,.84))+2.6*sin(a)+2.2*sin(b)+.8*sin(c)-gPhase;
  vec2 gradient=vec2(3.3,5.04)+2.6*cos(a)*vec2(.31,-.19+.126*cos(.09*p.y))+2.2*cos(b)*vec2(.13,.35)+.8*cos(c)*vec2(.8,.57);
  return vec3(phase,gradient);
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
  } else if(cell.y<136) {
    int index=cell.x+(cell.y-128)*128;
    outColor=dsDuneData(vec2(index%32,index/32)-16.);
  } else {
    gGrowth=smoothstep(0.,1.,u_params[0]);
    gRelief=mix(.5,1.2,gGrowth)*u_params[2];
    gVeil=clamp(u_rhythm.w+.12*u_rhythmHit.w,0.,1.);
    gGustLane=mod(u_rhythmCount.w,7.)*2.399963;
#ifdef PHOSPHOR_LATE
    gPhase=mod(u_clock[0],TAU);
#else
    gPhase=mod(u_time*u_params[1]*1.2,TAU);
#endif
    outColor=vec4(dsVeilVertex(min(cell.x,14)),1.);
  }
}
`;
const fragment = `${common}
float dsTerrain(vec2 p) { return dsMacro(p); }
float dsIntersect(vec3 ro, vec3 rd) {
  // Exact bound for both the tiled dunes and continuous leading ridge.
  float ceiling=max(4.4*gRelief,3.4*(1.-.35*gGrowth))+.2;
  if(rd.y>=0. && ro.y>ceiling) return -1.;
  float t=max(.01,(ceiling-ro.y)/min(rd.y,-.001));
  float old=t;
  for(int i=0;i<28;i++) {
    vec3 p=ro+rd*t;
    if(rd.y>=0. && p.y>ceiling)break;
    float h=p.y-dsMacro(p.xz);
    if(h<.004+gPixel*t*.25) {
      float lo=old, hi=t;
      for(int j=0;j<4;j++) {
        float m=.5*(lo+hi); vec3 a=ro+rd*m;
        if(a.y>dsMacro(a.xz))lo=m;else hi=m;
      }
      return .5*(lo+hi);
    }
    old=t;
    t+=max(.012,h*mix(.95,.8,gGrowth));
    if(t>170.)break;
  }
  // A downward ray must eventually hit this nonnegative heightfield. Near
  // tangent brinks can exhaust the conservative march: finish the bracket
  // against the guaranteed ground-plane endpoint instead of punching a hole.
  if(rd.y<-.001) {
    // Past this distance the material is fully extinguished by horizon haze.
    if(old>150.)return 220.;
    float lo=old, hi=-ro.y/rd.y;
    if(hi>lo) {
      for(int j=0;j<8;j++) {
        float m=(lo+hi)*.5; vec3 q=ro+rd*m;
        if(q.y>dsMacro(q.xz))lo=m;else hi=m;
      }
      return (lo+hi)*.5;
    }
  }
  return -1.;
}
float dsShadow(vec3 p, vec3 l) {
  float shadow=1., t=.3;
  float ceiling=max(4.4*gRelief,3.4*(1.-.35*gGrowth))+.2;
  for(int i=0;i<5;i++) {
    vec3 q=p+l*t;
    // Every later sample is above the proven heightfield bound too.
    if(l.y>0. && q.y>ceiling)break;
    float h=q.y-dsMacro(q.xz);
    shadow=min(shadow,18.*h/t);
    if(shadow<=.08)break;
    t+=1.5+float(i)*3.2;
  }
  return clamp(shadow,.08,1.);
}
vec3 dsHaze() { return mix(u_secondary,u_primary,.3)*.075; }
vec3 dsSky(vec3 d) {
  float horizon=exp(-max(d.y,0.)*6.);
  vec3 col=u_secondary*(.012+.045*horizon)+u_primary*.018*horizon;
  float r=length(d-gMoon), moon=1.-smoothstep(.036-gPixel*.5,.036+gPixel*.5,r);
  if(moon>0.) {
    vec3 east=normalize(cross(gMoon,vec3(0,1,0))), north=cross(east,gMoon);
    vec2 chart=vec2(dot(d,east),dot(d,north))/.036;
    vec3 normal=vec3(chart,sqrt(max(0.,1.-dot(chart,chart))));
    float maria=dsNoise(chart*3.+17.)*.42+dsNoise(chart*11.+31.)*.18;
    float craters=dsNoise(chart*32.+53.);
    float key=max(0.,dot(normal,normalize(vec3(-.65,.35,.7))));
    col+=mix(u_secondary,vec3(1.),.74)*moon*(.09+1.7*key)*(1.-maria)*(.85+.15*craters);
  }
  col+=mix(u_primary,u_secondary,.5)*.08*exp(-r*15.);
  vec2 sky=vec2(atan(d.x,-d.z),asin(clamp(d.y,-1.,1.)));
  float band=exp(-sq((sky.y-.32-.36*sky.x)/.19));
  float clouds=dsNoise(sky*9.+15.)*.6+dsNoise(sky*27.+31.)*.3+dsNoise(sky*81.)*.1;
  float lane=smoothstep(.28,.68,dsNoise(sky*18.+77.));
  col+=mix(u_secondary,u_primary,.22)*band*(.025+.13*clouds)*lane*smoothstep(.02,.18,d.y);
  vec2 grid=sky*210., cell=floor(grid), f=fract(grid)-.5;
  float random=dsHash(cell+18.);
  float width=max(.055,gPixel*65.);
  float star=exp(-dot(f,f)/(width*width))*step(.975-band*.025,random);
  float bright=pow(dsHash(cell+93.),12.);
  col+=mix(u_secondary,vec3(1.),.55)*star*(.5+bright*2.5)*smoothstep(.015,.12,d.y);
  return col;
}
float dsGrains(vec3 q, float fp, float surface) {
  vec2 cell=floor(q.xz/vec2(.18,.45));
  float total=0.;
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
    float airborne=smoothstep(.02,.16,u_level-dsHash(c+113.)*.65);
    total+=exp(-distance2/(sigma*sigma))*(.008/sigma)*crest*airborne;
  }
  return total;
}
// Analytic ray-box intersection: opaque monoliths depth-test against both
// the terrain and the dust volume. The fixed sites never depend on development.
vec2 dsBox(vec3 ro, vec3 rd, vec3 c, vec3 b) {
  vec3 inv=mix(vec3(-1),vec3(1),step(vec3(0),rd))/max(abs(rd),vec3(.00001));
  vec3 a=(c-b-ro)*inv, z=(c+b-ro)*inv;
  vec3 lo=min(a,z), hi=max(a,z);
  float near=max(lo.x,max(lo.y,lo.z)), far=min(hi.x,min(hi.y,hi.z));
  return near>0.&&far>near?vec2(near,lo.x>lo.y&&lo.x>lo.z?0.:lo.y>lo.z?1.:2.):vec2(1e5,0.);
}
// A continuous, ground-connected dust bank, not an opaque cloud skin.
// The front curls back with height. Noise transports around that roll and
// tears its upper edge into translucent trailing wisps.
vec3 dsVeilTriangle(vec3 ro, vec3 rd, vec3 a, vec3 b, vec3 c) {
  vec3 e=b-a, f=c-a, h=cross(rd,f);
  float det=dot(e,h);
  if(abs(det)<.00001)return vec3(1e5,0,0);
  vec3 s=ro-a; float u=dot(s,h)/det;
  vec3 q=cross(s,e); float v=dot(rd,q)/det;
  float t=dot(f,q)/det;
  return t>0. && u>=0. && v>=0. && u+v<=1.?vec3(t,u,v):vec3(1e5,0,0);
}
float dsDustDensity(vec3 q) {
  float front=-48.+gStorm*18.;
  float curl=sin(q.y*.19+gDust)*3.;
  float coarse=dsNoise(vec2(q.x*.065+sin(q.z*.07),q.z*.075)+vec2(sin(gDust),cos(gDust)));
  float fine=dsNoise(vec2(q.x*.23+q.z*.11+curl,q.y*.19+q.z*.09)+vec2(cos(gDust),sin(gDust)));
  float top=14.+19.*coarse+5.*(fine-.5);
  float nose=front+13.*exp(-sq((q.y-10.)/9.))+5.*sin(q.x*.075)+5.*coarse;
  float body=smoothstep(-4.,5.,nose-q.z)*smoothstep(-3.5,4.,top-q.y);
  float ragged=smoothstep(.18,.75,.55*coarse+.65*fine);
  float base=exp(-max(q.y,0.)*.16)*smoothstep(-8.,15.,front+24.-q.z);
  return (body*(.16+.84*ragged)+base*.5)*smoothstep(-1.,1.,q.y);
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
  // The scheduler owns the event: no development-triggered flashes or resets.
  gVeil=clamp(u_rhythm.w+.12*u_rhythmHit.w,0.,1.);
  gGustLane=mod(u_rhythmCount.w,7.)*2.399963;
  gPixel=2./min(u_resolution.x,u_resolution.y);
  gRelief=mix(.5,1.2,gGrowth)*u_params[2];
  gMoon=normalize(vec3(-.75,u_params[5],-.7));
  float yaw=.08*sin(gCam);
  vec3 ro=vec3(mix(3.,4.,gGrowth)+3.*sin(gCam),mix(5.,8.+2.*u_params[6],gGrowth)+gStorm*.5,mix(25.,33.,gGrowth));
  vec3 target=vec3(mix(-5.,-3.,gGrowth),mix(1.6,1.5,gGrowth)+gStorm*1.5,-25.);
  vec3 fw=normalize(target-ro), rt=normalize(cross(fw,vec3(0,1,0))), up=cross(rt,fw);
  vec2 uv=aspectUV()*2.;
  vec3 rd=normalize(fw*(1.65+.025*u_kick)+rt*(uv.x+yaw)+up*uv.y);
  float t=dsIntersect(ro,rd), depth=t>0.?t:220.;
  vec3 p=ro+rd*depth;
  float fp=max(gPixel*depth,.008);
  // Derivatives are outside all per-pixel branches, including sky/hit.
  vec2 footprintX=dFdx(p.xz), footprintY=dFdy(p.xz);
  vec3 rippleChart=vec3(0.);
  if(gGrowth<1.)rippleChart=dsRippleChart(p.xz);
  else {
    float bend=.23*p.x+.17*p.z;
    rippleChart=vec3(6.*dot(p.xz,vec2(.55,.84))+1.5*sin(bend)-gPhase,vec2(3.3,5.04)+1.5*cos(bend)*vec2(.23,.17));
  }
  float rippleWidth=length(vec2(dot(rippleChart.yz,footprintX),dot(rippleChart.yz,footprintY)));
  vec3 col=t<0.?dsSky(rd):dsHaze();
  if(t>0. && depth<170.) {
    vec4 surface=dsSurface(p.xz);
    float h=surface.x;
    vec2 grad=surface.yz;
    float phase=rippleChart.x;
    float filter1=exp(-.5*rippleWidth*rippleWidth), filter2=filter1*filter1*filter1*filter1;
    float amplitude=.028*u_params[3]*(.65+.35*sin(.2*p.x+.23*p.z));
    float rippleRelief=mix(.32,.12,gGrowth)*(1.-smoothstep(.5,1.2,length(grad)));
    float dr=amplitude*(cos(phase)*filter1+.44*cos(2.*phase)*filter2)*rippleRelief;
    grad+=dr*rippleChart.yz;
    float sandFootprint=max(length(footprintX),length(footprintY));
    vec3 granules=dsNoiseSlope(p.xz*7.);
    grad+=granules.yz*.055*exp(-sq(sandFootprint*7.));
    vec3 n=normalize(vec3(-grad.x,1.,-grad.y));
    float key=max(0.,dot(n,gMoon));
    float shadow=key>.001?dsShadow(p+vec3(0,.06,0),gMoon):.08;
    shadow=.18+.82*shadow;
    float fill=max(0.,dot(n,normalize(vec3(.4,.4,1.))));
    float ao=.5+.5*smoothstep(0.,1.,h);
    float rim=pow(1.-max(0.,dot(n,-rd)),3.);
    float grainFootprint=max(length(footprintX),length(footprintY))*23.;
    float grain=grainFootprint<1.5?dsNoise(p.xz*23.):.5;
    float rough=mix(.93,grain*.38+.74,exp(-2.*grainFootprint*grainFootprint));
    // Pigmented shadow fields; pale mineral light belongs only to brinks.
    vec3 sandColor=mix(u_secondary,u_primary,.07);
    col=sandColor*(.07+key*shadow*1.45)*ao*rough;
    col+=u_secondary*fill*.13+u_primary*(rim*key*.025+.018*(1.-n.y));
    // Filtered albedo corrugation remains on mature slopes, not glossy plates.
    col*=1.-.08*filter1*(.5+.5*sin(phase));
    float granularity=exp(-sq(sandFootprint*9.));
    col*=mix(1.,.65+.7*granules.x,granularity);
    if(gStorm>.001)for(int i=0;i<5;i++) {
      vec2 contact=p.xz-dsStoneSite(float(i));
      float shade=exp(-dot(contact/vec2(3.5,4.5),contact/vec2(3.5,4.5)));
      col*=1.-gStorm*.65*shade;
    }
    vec2 grainChart=p.xz*45., grainCell=floor(grainChart);
    float random=dsHash(grainCell+19.);
    vec2 grainPoint=fract(grainChart)-vec2(.2+.6*random,.2+.6*dsHash(grainCell+41.));
    float grainWidth=max(.09,max(length(footprintX),length(footprintY))*27.);
    float sparkle=exp(-dot(grainPoint,grainPoint)/(grainWidth*grainWidth))*sq(.09/grainWidth);
    sparkle*=smoothstep(.72,.98,random)*pow(max(0.,dot(n,normalize(gMoon-rd))),6.);
    col+=mix(u_secondary,vec3(1.),.7)*sparkle*shadow*9.*(1.-smoothstep(.018,.055,fp));
    float brink=exp(-sq(surface.w/max(.085,fp*.65)))*smoothstep(.1,.6,h);
    float slipPacket=pow(.5+.5*sin(p.x*.42+p.z*.29-mod(u_rhythmCount.y,9.)*1.7),4.);
    col+=mix(u_secondary,u_primary,.15)*brink*.12;
    col+=u_primary*brink*slipPacket*u_rhythm.y*1.8;
    float sheen=pow(max(0.,dot(n,normalize(gMoon-rd))),50.);
    col+=u_secondary*sheen*shadow*.008;
    // Saltation: ballistic arcs above the existing crest, carried along wind.
    // Launch speed .7..1.3 m/s, gravity 9.81; phase wraps only at the ground.
    float crest=exp(-sq(length(grad)-.55)/.02)*smoothstep(.25,1.,h);
    float lanes=dsNoise(vec2(p.x*2.,p.z*.3)+vec2(sin(gPhase),cos(gPhase)));
    float packet=pow(.5+.5*sin(p.z*1.7-gPhase*3.+p.x*.3),4.);
    float salt=crest*lanes*packet*(.2+.8*u_level)*u_params[1];
    salt*=1.+u_rhythm.x*3.5+u_rhythm.y*1.8;
    col+=mix(u_secondary,u_primary,.75)*salt*.55;
    float grainRun=pow(.5+.5*sin(p.x*.65+p.z*.35-mod(u_rhythmCount.x,11.)*1.9),8.);
    col+=u_primary*crest*grainRun*u_rhythm.x*1.7;
    float fog=1.-exp(-depth*(.003+gStorm*.002)*u_params[7]);
    col=mix(col,dsHaze(),fog);
    // Two depth-correct samples through quiet saltation above the brinks.
    if(rd.y<-.03 && depth<130. && surface.w<3.5) {
      float plume=0.;
      for(int j=0;j<2;j++) {
        // Two broad strata replace the old three-sample micro-plume.
        // The gust lifts the sand, not the camera.
        float lift=.2+.36*float(j);
        float distance=max(0.,t-lift/max(-rd.y,.08));
        vec3 q=ro+rd*distance;
        vec4 ridge=dsSurface(q.xz);
        float height=q.y-ridge.x;
        float streamer=dsNoise(q.xz*vec2(1.2,.35)+vec2(sin(gPhase),cos(gPhase)));
        float curl=.5+.5*sin(q.x*.8+q.z*.33-gPhase*3.+sin(q.x*.23));
        plume+=exp(-ridge.w*.9)*exp(-height*height*2.5)*smoothstep(.02,.25,height)*streamer;
        plume+=gStorm*streamer*curl*exp(-max(height,0.)*1.6)*smoothstep(.01,.15,height)*.16;

      }
      col+=u_secondary*plume*.65*u_params[1]*(.6+.4*u_level+u_rhythm.x+u_rhythm.y);

    }
    if(rd.y<-.06 && fp<.045) {
      float sand=0.;
      for(int k=0;k<2;k++) {
        float s=max(0.,t-(.025+.045*float(k))/(-rd.y));
        vec3 q=ro+rd*s;
        sand+=dsGrains(q,fp,h+dot(grad,q.xz-p.xz));
      }
      col+=mix(u_secondary,vec3(1.),.25)*sand*(1.-smoothstep(.025,.045,fp))*(.6+.8*u_level)*u_params[1]*(1.+.6*u_rhythm.x+.4*u_rhythm.y);
    }
    col=mix(col,dsHaze(),smoothstep(100.,170.,depth));
  }
  float monolith=1e5, face=0.;
  vec3 monoCentre=vec3(0), monoBounds=vec3(1);
  mat2 monoTurn=mat2(1.);
  if(gStorm>.001)for(int i=0;i<5;i++) {
    float high=(i==2?27.:11.+6.*dsHash(vec2(float(i),float(u_seedBits%997u))))*gStorm;
    vec2 site=dsStoneSite(float(i));
    vec3 c=vec3(site.x,dsMacro(site)+high*.5-2.,site.y);
    float angle=.18+.48*dsHash(vec2(float(i),71.));
    mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
    vec3 local=ro-c, direction=rd;
    local.xz=turn*local.xz; direction.xz=turn*direction.xz;
    vec3 bounds=vec3(i==2?2.1:1.25,high*.5,1.6);
    vec2 box=dsBox(local,direction,vec3(0),bounds);
    if(box.x<monolith) {monolith=box.x;face=box.y;monoCentre=c;monoBounds=bounds;monoTurn=turn;}
  }
  if(monolith<depth) {
    depth=monolith; p=ro+rd*depth;
    vec3 local=p-monoCentre; local.xz=monoTurn*local.xz;
    vec3 normal=face<.5?vec3(sign(local.x),0,0):face<1.5?vec3(0,sign(local.y),0):vec3(0,0,sign(local.z));
    normal.xz=transpose(monoTurn)*normal.xz;
    float stone=.55+.45*dsNoise(p.xy*vec2(2.5,.7));
    float buried=smoothstep(-monoBounds.y,-monoBounds.y+4.,local.y);
    col=mix(u_secondary,u_primary,.08)*(.09+.65*max(0.,dot(normal,gMoon)))*stone*(.3+.7*buried);
    col+=u_secondary*(.035*max(0.,dot(normal,-rd))+.25*max(0.,dot(normal,normalize(vec3(-.5,.4,1.)))))*stone;
    vec3 edges=abs(abs(local)-monoBounds);
    float edge=min(max(edges.x,edges.y),min(max(edges.y,edges.z),max(edges.z,edges.x)));
    float bevel=exp(-edge/max(.045,gPixel*depth*.5));
    col+=u_secondary*bevel*(.035+.1*max(0.,dot(normal,gMoon)));
    // Carved vertical rune columns, footprint-filtered cores and soft halos.
    float across=face<.5?local.z:local.x;
    float row=floor(p.y*.31), eroded=dsHash(vec2(row,monoCentre.x+31.));
    vec2 rune=vec2(across*(.7+.5*eroded)+.18*sin(row*5.1),fract(p.y*.31)-.5);
    float spine=max(abs(rune.x+.05*sin(row*1.7)),abs(rune.y)-.29);
    float branch=max(abs(rune.y-rune.x*sign(eroded-.5)*.7),abs(rune.x)-.12-.18*eroded);
    float stroke=min(spine,branch)+step(eroded,.19)*.5;
    float runeWidth=max(.012,gPixel*depth*.45);
    float glyph=(1.-smoothstep(runeWidth,runeWidth*2.,stroke))*smoothstep(1.,3.,p.y);
    float halo=exp(-stroke*stroke/.012)*smoothstep(1.,3.,p.y);
    float erosion=smoothstep(.4,.9,eroded)*(.15+.85*dsHash(vec2(row+17.,monoCentre.z)));
    col+=mix(u_secondary,u_primary,.7)*(glyph*.85+halo*.06)*erosion*buried;
    col=mix(col,dsHaze(),1.-exp(-depth*.008));
  }
  // A single translucent curved sheet, with a visible air gap. Nearest
  // triangle wins once; no doubled opacity at diagonals or folded edges.
  if(gVeil>.005) {
    vec3 inv=mix(vec3(-1),vec3(1),step(vec3(0),rd))/max(abs(rd),vec3(.00001));
    vec3 lo=min((vec3(-20,0,-3)-ro)*inv,(vec3(20,12,25)-ro)*inv);
    vec3 hi=max((vec3(-20,0,-3)-ro)*inv,(vec3(20,12,25)-ro)*inv);
    if(max(0.,max(lo.x,max(lo.y,lo.z)))<min(depth,min(hi.x,min(hi.y,hi.z)))) {
      vec3 hit=vec3(1e5,0,0); vec2 chart=vec2(0.);
      for(int j=0;j<4;j++)for(int k=0;k<2;k++) {
        int a=j*3+k;
        vec3 va=dsVeilFetch(a), vb=dsVeilFetch(a+1), vc=dsVeilFetch(a+3), vd=dsVeilFetch(a+4);
        vec3 h=dsVeilTriangle(ro,rd,va,vb,vc);
        if(h.x<hit.x) {hit=h;chart=vec2((float(k)+h.y)*.5,(float(j)+h.z)/4.);}
        h=dsVeilTriangle(ro,rd,vd,vc,vb);
        if(h.x<hit.x) {hit=h;chart=vec2((float(k)+1.-h.y)*.5,(float(j)+1.-h.z)/4.);}
      }
      if(hit.x<depth) {
        float ends=pow(max(0.,sin(chart.y*PI)),1.5);
        float tail=smoothstep(0.,.15,chart.x)*(1.-smoothstep(.35,1.,chart.x));
        vec3 q=ro+rd*hit.x;
        float wisps=dsNoise(vec2(chart.x*15.+sin(chart.y*18.-gPhase),chart.y*46.));
        float grains=.7+.3*(dsNoise(q.xz*18.)-.5)*exp(-sq(gPixel*hit.x*18.));
        float alpha=clamp(gVeil*ends*tail*(.25+.75*wisps)*grains*2.,0.,.48);
        col=mix(col,col*.4+mix(u_secondary,u_accent,.7)*1.8,alpha);
      }
    }
  }
  // Integrate the bank through the same depth as terrain and stones. The
  // foreground dust extends to ground, so the landscape disappears INTO it.
  if(gStorm>.001 && rd.z<-.01) {
    float start=max(0.,(-8.-ro.z)/rd.z), end=min(depth,(-90.-ro.z)/rd.z);
    if(rd.y>0.)end=min(end,(38.-ro.y)/rd.y);
    float stepSize=max(0.,end-start)/6.;
    float trans=1.; vec3 cloud=vec3(0.);
    for(int i=0;i<6;i++) {
      if(trans<.015 || stepSize<=0.)break;
      vec3 q=ro+rd*(start+(float(i)+.5)*stepSize);
      float density=dsDustDensity(q);
      float alpha=1.-exp(-density*stepSize*.115*gStorm*u_params[7]);
      float heightLight=smoothstep(0.,27.,q.y);
      float light=exp(-density*1.8);
      vec3 lit=u_secondary*(.28+1.3*heightLight*light);
      float fold=exp(-sq((q.x-22.*sin(mod(u_rhythmCount.z,8.)*2.4))/10.));
      lit+=u_primary*fold*u_rhythm.z*.3*heightLight*light;
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
  rhythmStyles: {
    restrained: "Leeward hush",
    driving: "Saltation trails",
    accented: "Haboob drums",
  },
  rhythm: [
    familyEffect(
      "crest-saltation",
      0,
      "Crest saltation",
      "A packet of windblown grains follows the existing dune crests.",
      {
        period: 4,
        strength: 0.55,
        duration: 1.4,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X......x | ....X... | ..x..... | ........",
            division: 2,
            strength: 0.48,
            duration: 1.3,
          },
          driving: {
            steps: "X..x.X.. | x..X..x.",
            division: 2,
            strength: 0.72,
            duration: 0.7,
          },
          accented: {
            steps: "X..x..X..x..X..x..X.",
            division: 4,
            strength: 0.86,
            duration: 0.4,
          },
        },
      },
    ),
    familyEffect(
      "slipface-stream",
      1,
      "Slipface stream",
      "A second sand stream grazes the persistent slip faces.",
      {
        period: 8,
        strength: 0.5,
        duration: 2,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "...x.... | ......X. | .....x.. | ........",
            division: 2,
            strength: 0.45,
            duration: 1.5,
          },
          driving: {
            steps: "..X..x.. | ....X..x",
            division: 2,
            strength: 0.68,
            duration: 0.8,
          },
          accented: {
            steps: "..X...x..X..x... | ....X..x..X...x.",
            division: 4,
            strength: 0.82,
            duration: 0.5,
          },
        },
      },
    ),
    familyEffect(
      "haboob-roll",
      2,
      "Haboob roll",
      "A slow gust lifts crest grains and lights one rolling fold inside the dust wall.",
      {
        period: 16,
        strength: 0.5,
        duration: 3,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | ........ | .....X..",
            division: 2,
            strength: 0.42,
            duration: 2.8,
          },
          driving: {
            steps: "........ | .......x | ........ | ......X.",
            division: 2,
            strength: 0.66,
            duration: 2,
          },
          accented: {
            steps:
              "................ | ...........X.... | ................ | .........x....X.",
            division: 4,
            strength: 0.8,
            duration: 1,
          },
        },
      },
    ),
    familyEffect(
      "crest-veil",
      3,
      "Crest veil",
      "An accent gust peels a curling sand veil off the persistent dune crests.",
      {
        period: 16,
        strength: 0.88,
        duration: 1,
        steps: "X......x........",
        styles: {
          restrained: {
            steps: "........ | .....X.. | ........ | ......x.",
            division: 2,
            strength: 0.7,
            duration: 1.4,
          },
          driving: {
            steps: "X......x........ | X.........X.....",
            division: 4,
            strength: 0.94,
            duration: 1,
          },
          accented: {
            steps:
              "X.....x.......X. | .......X........ | X......x........ | X.........X.....",
            division: 4,
            strength: 1,
            duration: 0.85,
          },
        },
      },
    ),
  ],
  fragment,
  precompute: { fragment: precompute, size: [128, 137] },
};
