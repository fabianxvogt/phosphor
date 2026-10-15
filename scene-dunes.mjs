import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

export const REPOSE_DEGREES = 34;
export const REPOSE_SLOPE = Math.tan((REPOSE_DEGREES * Math.PI) / 180);
export const SAND_GRAVITY = 9.81;
// Independent of development: the material chart, dune sites and grain ids
// persist while the camera cranes up and the storm approaches.
export function barchanHeight(crosswind, downwind, height = 4, width = 11) {
  const v = crosswind / width;
  const h = height * Math.max(0, (1 - v * v) * (1 + 0.6 * v * v));
  const crest = -3 + 13 * v * v;
  const d = downwind - crest;
  const shoulder = 14 - 8 * v * v;
  const windward = Math.max(0, 1 - (d / shoulder) ** 2);
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
    6 * (0.55 * x + 0.84 * z) +
    2.6 * Math.sin(0.31 * x - 0.19 * z + 1.4 * Math.sin(0.09 * z)) +
    2.2 * Math.sin(0.13 * x + 0.35 * z) +
    0.8 * Math.sin(0.8 * x + 0.57 * z) - phase;
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
float gGrowth, gStorm, gPhase, gCam, gDust, gPixel, gRelief;
vec3 gMoon;
float dsHash(vec2 p) {
  vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
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
  return vec4(vec3(height,gradient)*(1.-gGrowth),abs(d));
}
vec4 dsSurface(vec2 world) {
  vec4 leading=vec4(0,0,0,100);
  if(gGrowth<1.) {
    leading=dsLeading(world);
    // The continuous ridge already dominates every possible tiled dune.
    if(leading.x>4.4*gRelief)return leading;
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
  float f=clamp((dist-11.5)/2.5,0.,1.);
  float edge=1.-f*f*(3.-2.*f), derivative=-6.*f*(1.-f)/2.5;
  vec2 edgeGrad=abs(q.x)>abs(q.y)*.875?vec2(sign(q.x),0.):vec2(0.,sign(q.y)*.875);
  vec4 result=vec4(vec3(chosen.x*edge,chosen.yz*edge+chosen.x*derivative*edgeGrad)*gRelief,chosen.w);
  return leading.x>result.x?leading:result;
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
  if(gGrowth<1.) {
    float s=sin(.065*p.y), c=cos(.065*p.y);
    float d=p.x-(-2.+4.8*s+2.4*s*c), w=max(0.,1.-sq(d/9.));
    leading=(d<0.?3.4*w*w:max(0.,3.4-.6745085168*d))*(1.-gGrowth);
    if(leading>4.4*gRelief)return leading;
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
  float f=clamp((max(abs(local.x),abs(local.y)*.875)-11.5)/2.5,0.,1.);
  return max(leading,h*(1.-f*f*(3.-2.*f))*gRelief);
}
vec4 dsDustData(float id, int kind) {
  float cx=(id+.5)*14., random=dsHash(vec2(id,33.));
  float storm=smoothstep(1.,2.,u_params[0]);
  float crown=27.+storm*6.+3.*sin(cx*.047);
  vec3 centre=vec3(cx,crown-12.+2.*random,-43.+storm*15.-6.);
  float radius=12.+3.*random;
  if(kind>0) {
    int j=kind==2?1:0; float side=float(j)*2.-1.;
    radius=4.+2.*dsHash(vec2(id,float(j)+74.));
    centre+=vec3(side*5.5,11.+2.*sin(id*2.7+float(j)),1.5);
    if(kind==3) {centre+=vec3(side*radius*.6,radius*.55,0.);radius*=.55;}
  }
  return vec4(centre,radius);
}
vec4 dsDustFetch(float id, int kind) {
#ifdef PRECOMPUTED
  if(id>=-16. && id<16.)return texelFetch(u_precomputed,ivec2(int(id+16.)*4+kind,136),0);
#endif
  return dsDustData(id,kind);
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
  } else outColor=dsDustData(float(cell.x/4)-16.,cell.x%4);
}
`;
const fragment = `${common}
float dsTerrain(vec2 p) { return dsMacro(p); }
float dsIntersect(vec3 ro, vec3 rd) {
  // Exact bound for both the tiled dunes and continuous leading ridge.
  float ceiling=max(4.4*gRelief,3.4*(1.-gGrowth));
  if(rd.y>=0. && ro.y>ceiling) return -1.;
  float t=max(.01,(ceiling-ro.y)/min(rd.y,-.001));
  float old=t;
  for(int i=0;i<36;i++) {
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
  for(int i=0;i<5;i++) {
    vec3 q=p+l*t;
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
// Exact ray/sphere support gives the crown a pixel-sharp silhouette without
// raising the volume sample count. The volume is integrated behind this skin.
void dsDustBall(vec3 ro, vec3 rd, vec3 centre, float radius, float stretch,
                inout vec3 hit, inout vec3 normal) {
  vec3 local=(ro-centre)/vec3(1,stretch,1), direction=rd/vec3(1,stretch,1);
  float a=dot(direction,direction), b=dot(local,direction), c=dot(local,local)-radius*radius;
  float discriminant=b*b-a*c;
  float aa=max(.001,gPixel*max(-b/a,1.)*radius*a*1.1);
  if(discriminant < -aa)return;
  float root=sqrt(max(0.,discriminant)), near=(-b-root)/a;
  if(near>0. && near<hit.x+16.) {
    vec3 n=normalize((ro+rd*near-centre)/vec3(1,stretch*stretch,1));
    float coverage=smoothstep(-aa,aa,discriminant);
    // Interior joins fade over a physical roll shoulder; final silhouette
    // coverage still uses the much narrower pixel footprint above.
    float shoulder=smoothstep(-aa,max(aa,radius*3.),discriminant);
    float blend=clamp(.5+.5*(hit.x-near)/16.,0.,1.)*shoulder;
    bool existing=hit.x<1e4;
    normal=normalize(mix(normal,n,existing?blend:1.));
    float far=existing?mix(hit.y,max(hit.y,(-b+root)/a),blend):(-b+root)/a;
    float entry=existing?mix(hit.x,near,blend)-16.*blend*(1.-blend):near;
    hit=vec3(entry,max(entry+.1,far),max(existing?hit.z:0.,coverage));
  }
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
  gRelief=mix(.5,1.2,gGrowth)*u_params[2];
  gMoon=normalize(vec3(-.75,u_params[5],-.7));
  float yaw=.08*sin(gCam);
  vec3 ro=vec3(mix(3.,4.,gGrowth)+3.*sin(gCam),mix(5.,10.+5.*u_params[6],gGrowth)+gStorm*2.,mix(25.,33.,gGrowth));
  vec3 target=vec3(mix(-5.,-3.,gGrowth),mix(1.6,1.5,gGrowth)+gStorm*12.,-25.);
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
  float rippleWidth=length(vec2(dot(rippleChart.yz,footprintX),dot(rippleChart.yz,footprintY)));
  vec3 col=t<0.?dsSky(rd):dsHaze();
  if(t>0. && depth<170.) {
    vec4 surface=dsSurface(p.xz);
    float h=surface.x;
    vec2 grad=surface.yz;
    float phase=rippleChart.x;
    float filter1=exp(-.5*rippleWidth*rippleWidth), filter2=filter1*filter1*filter1*filter1;
    float amplitude=.028*u_params[3]*(.65+.35*sin(.2*p.x+.23*p.z));
    float rippleRelief=mix(.32,0.,gGrowth)*(1.-smoothstep(.12,.35,length(grad)));
    float dr=amplitude*(cos(phase)*filter1+.44*cos(2.*phase)*filter2)*rippleRelief;
    grad+=dr*rippleChart.yz;
    vec3 n=normalize(vec3(-grad.x,1.,-grad.y));
    float key=max(0.,dot(n,gMoon));
    float shadow=key>.001?dsShadow(p+vec3(0,.06,0),gMoon):.08;
    float fill=max(0.,dot(n,normalize(vec3(.4,.4,1.))));
    float ao=.5+.5*smoothstep(0.,1.,h);
    float rim=pow(1.-max(0.,dot(n,-rd)),3.);
    float grainFootprint=max(length(footprintX),length(footprintY))*23.;
    float grain=grainFootprint<1.5?dsNoise(p.xz*23.):.5;
    float rough=mix(.93,grain*.38+.74,exp(-2.*grainFootprint*grainFootprint));
    vec3 sandColor=mix(mix(u_secondary,u_primary,.42),vec3(1.),.18);
    col=sandColor*(.065+key*shadow*2.5)*ao*rough;
    col+=u_secondary*fill*.095+u_primary*(rim*key*.055+.035*(1.-n.y));
    vec2 grainChart=p.xz*45., grainCell=floor(grainChart);
    float random=dsHash(grainCell+19.);
    vec2 grainPoint=fract(grainChart)-vec2(.2+.6*random,.2+.6*dsHash(grainCell+41.));
    float grainWidth=max(.09,max(length(footprintX),length(footprintY))*27.);
    float sparkle=exp(-dot(grainPoint,grainPoint)/(grainWidth*grainWidth))*sq(.09/grainWidth);
    sparkle*=smoothstep(.72,.98,random)*pow(max(0.,dot(n,normalize(gMoon-rd))),6.);
    col+=mix(u_secondary,vec3(1.),.7)*sparkle*shadow*9.*(1.-smoothstep(.018,.055,fp));
    float brink=exp(-sq(surface.w/max(.085,fp*.65)))*smoothstep(.1,.6,h);
    col+=sandColor*brink*(.55+.15*u_rhythm.y);
    float sheen=pow(max(0.,dot(n,normalize(gMoon-rd))),50.);
    col+=mix(u_secondary,vec3(1.),.25)*sheen*shadow*.025;
    // Saltation: ballistic arcs above the existing crest, carried along wind.
    // Launch speed .7..1.3 m/s, gravity 9.81; phase wraps only at the ground.
    float crest=exp(-sq(length(grad)-.55)/.02)*smoothstep(.25,1.,h);
    float lanes=dsNoise(vec2(p.x*2.,p.z*.3)+vec2(sin(gPhase),cos(gPhase)));
    float packet=pow(.5+.5*sin(p.z*1.7-gPhase*3.+p.x*.3),4.);
    float salt=crest*lanes*packet*(.2+.8*u_level)*u_params[1];
    salt*=1.+u_rhythm.x*.6+u_rhythm.y*.35;
    col+=mix(u_secondary,u_primary,.6)*salt*.22;
    float fog=1.-exp(-depth*(.003+gStorm*.002)*u_params[7]);
    col=mix(col,dsHaze(),fog);
    // Three depth-correct samples through the saltation veil above the brinks.
    if(rd.y<-.03 && depth<130. && surface.w<3.5) {
      float plume=0.;
      for(int j=0;j<3;j++) {
        float distance=max(0.,t-(.2+.24*float(j))/max(-rd.y,.08));
        vec3 q=ro+rd*distance;
        vec4 ridge=dsSurface(q.xz);
        float height=q.y-ridge.x;
        float streamer=dsNoise(q.xz*vec2(1.2,.35)+vec2(sin(gPhase),cos(gPhase)));
        float curl=.5+.5*sin(q.x*.8+q.z*.33-gPhase*3.+sin(q.x*.23));
        plume+=exp(-ridge.w*.9)*exp(-height*height*2.5)*smoothstep(.02,.25,height)*streamer;
        plume+=gStorm*streamer*curl*exp(-height*1.6)*smoothstep(.01,.15,height)*.16;
      }
      col+=mix(u_secondary,vec3(1.),.48)*plume*.7*u_params[1]*(.6+.4*u_level+.35*u_rhythm.x+.2*u_rhythm.y);
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
  if(gStorm>.001)for(int i=0;i<5;i++) {
    float j=float(i)-2.;
    float high=(i==2?32.:12.+5.*dsHash(vec2(float(i),float(u_seedBits%997u))))*gStorm;
    vec3 c=vec3(j*9.,high*.5-1.,-16.-abs(j)*4.);
    vec3 bounds=vec3(i==2?2.5:1.4,high*.5,1.8);
    vec2 box=dsBox(ro,rd,c,bounds);
    if(box.x<monolith) {monolith=box.x;face=box.y;monoCentre=c;monoBounds=bounds;}
  }
  if(monolith<depth) {
    depth=monolith; p=ro+rd*depth;
    vec3 normal=face<.5?vec3(sign(p.x-monoCentre.x),0,0):face<1.5?vec3(0,sign(p.y-monoCentre.y),0):vec3(0,0,sign(p.z-monoCentre.z));
    float stone=.75+.25*dsNoise(p.xy*vec2(5.,.7));
    col=mix(u_secondary,u_primary,.18)*(.055+.22*max(0.,dot(normal,gMoon)))*stone;
    col+=u_secondary*.04*max(0.,dot(normal,-rd));
    vec3 edges=abs(abs(p-monoCentre)-monoBounds);
    float edge=min(max(edges.x,edges.y),min(max(edges.y,edges.z),max(edges.z,edges.x)));
    float bevel=exp(-edge/max(.045,gPixel*depth*.5));
    col+=mix(mix(u_secondary,u_primary,.35),vec3(1.),.3)*bevel*(.8+.55*gStorm);
    // Carved vertical rune columns, footprint-filtered cores and soft halos.
    float across=face<.5?p.z-monoCentre.z:p.x-monoCentre.x;
    vec2 rune=vec2(across*.7,fract(p.y*.55)-.5);
    float diamond=abs(abs(rune.x)+abs(rune.y)-.27);
    float stroke=min(max(abs(rune.x),abs(rune.y)-.34),max(diamond,abs(rune.y)-.23));
    float runeWidth=max(.012,gPixel*depth*.45);
    float glyph=(1.-smoothstep(runeWidth,runeWidth*2.,stroke))*smoothstep(1.,3.,p.y);
    float halo=exp(-stroke*stroke/.012)*smoothstep(1.,3.,p.y);
    col+=mix(u_secondary,u_primary,.45)*(glyph*1.4+halo*.12)*(.8+.2*sin(gDust));
    col+=mix(u_primary,u_accent,.08)*.11*exp(-sq((p.y-19.)/13.));
    col=mix(col,u_secondary*.06,1.-exp(-depth*.006));
  }
  // Sharp nested billows bound an actual Beer–Lambert dust column. Two
  // interior samples now start at its exact surface, not eight blurred slabs
  // spanning mostly empty air. The opaque base is deliberately much darker.
  if(gStorm>.001 && rd.z<-.01) {
    float front=-43.+gStorm*15.;
    float plane=(front-ro.z)/rd.z;
    vec3 projected=ro+rd*plane;
    float top=27.+gStorm*6.+3.*sin(projected.x*.047);
    float baseCoverage=1.-smoothstep(top-13.,top-8.,projected.y);
    vec3 hit=vec3(plane,plane+45.,baseCoverage), normal=vec3(0,0,1);
    float cell=floor(projected.x/14.);
    for(int k=-1;k<=1;k++) {
      float id=cell+float(k);
      vec4 parent=dsDustFetch(id,0);
      dsDustBall(ro,rd,parent.xyz,parent.w,1.25,hit,normal);
      // Asymmetric smaller turrets interrupt the large rolls' round outline.
      for(int j=1;j<4;j++) {
        vec4 child=dsDustFetch(id,j);
        dsDustBall(ro,rd,child.xyz,child.w,1.,hit,normal);
      }
    }
    if(hit.x<depth && hit.z>.0001) {
      float end=min(depth,hit.y), stepSize=max(0.,end-hit.x)/2.;
      float trans=1.; vec3 cloud=vec3(0.);
      vec2 roll=vec2(sin(gDust),cos(gDust));
      vec3 skin=ro+rd*hit.x;
      vec2 curl=vec2(sin(skin.y*.23+sin(skin.x*.13)),cos(skin.x*.17));
      vec3 detail=dsNoiseSlope(skin.xy*.7+skin.z*.17+roll+curl*.7);
      float skinFine=dsNoise(skin.xy*2.1+skin.z*.31+roll);
      vec3 litNormal=normalize(normal+vec3(-detail.y,-detail.z,0.)*.2);
      float key=max(0.,dot(litNormal,normalize(vec3(-.65,.75,.28))));
      float heightLight=smoothstep(2.,33.,skin.y);
      vec3 dustColor=mix(mix(u_primary,u_secondary,.65),vec3(1.),.13);
      for(int i=0;i<2;i++) {
        if(trans<.01)break;
        vec3 q=ro+rd*(hit.x+(float(i)+.5)*stepSize);
        vec2 chart=q.xy*.23+q.z*.12+roll+curl*.6;
        float coarse=dsNoise(chart), fine=skinFine;
        float density=(.5+.65*coarse+.22*fine)*smoothstep(-1.,2.,q.y);
        float alpha=1.-exp(-density*stepSize*.25*gStorm*u_params[7]);
        float penetration=exp(-float(i)*.38);
        vec3 lit=dustColor*(.018+heightLight*(.045+key*1.15*penetration))*(.65+.55*coarse+.2*fine);
        // Broad, warped light transport through folds: no sun/disc primitive.
        float spread=exp(-sq((q.x+8.+5.*sin(q.y*.2))/22.)-sq((q.y-22.+5.*coarse)/14.));
        float inner=spread*(.1+.9*coarse*coarse)*(.4+.6*fine)*exp(-sq((q.z-front+9.)/22.));
        lit+=mix(mix(u_primary,u_secondary,.22),u_accent,.12)*inner*(1.3+.16*u_rhythm.z+.08*u_kick);
        cloud+=trans*alpha*lit;
        trans*=1.-alpha;
      }
      col=mix(col,col*trans+cloud,hit.z);
    }
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
  precompute: { fragment: precompute, size: [128, 137] },
};
