import { familyEffect } from "./family-rhythm.mjs";
import {
  ATTRIBUTES,
  CAMERA,
  FACE_COUNT,
  MAX_DEPTH,
  ORBIT_PERIOD,
  SWIRL_PERIOD,
  TEMPLATES,
  createGeometry,
} from "./fold-geometry.mjs";
// Polyhedral Folding: a creased sheet of Platonic nets folds along exact hinge
// chains into closed solids that rise and tumble, then bursts into a vortex
// of streaking shards around a light core. Development moves vertices only;
// a 2×1 state integrates camera orbit and swirl phase in 24-bit steps.
const f = (x) => (Math.abs(x) < 1e-12 ? 0 : x).toFixed(7);
const v3 = (v) => `vec3(${f(v[0])},${f(v[1])},${f(v[2])})`;
const faces = TEMPLATES.flatMap((t) =>
  t.faces.map((face, i) => {
    const h = t.hinge[i],
      pts = t.flat[i],
      c = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]);
    return {
      parent: t.parent[i] < 0 ? -1 : t.offset + t.parent[i],
      a: h?.a ?? [0, 0, 0],
      u: h?.u ?? [1, 0, 0],
      phi: h?.phi ?? 0,
      depth: t.depth[i],
      centre: c.map((x) => x / pts.length),
      template: t.id,
    };
  }),
);
const tables = `
const int FACES=${FACE_COUNT};
const int PARENT[FACES]=int[](${faces.map((x) => x.parent).join(",")});
const vec3 HA[FACES]=vec3[](${faces.map((x) => v3(x.a)).join(",")});
const vec3 HU[FACES]=vec3[](${faces.map((x) => v3(x.u)).join(",")});
const float HPHI[FACES]=float[](${faces.map((x) => f(x.phi)).join(",")});
const float DEPTH[FACES]=float[](${faces.map((x) => x.depth.toFixed(1)).join(",")});
const int TPL[FACES]=int[](${faces.map((x) => x.template).join(",")});
const vec3 SOLID[5]=vec3[](${TEMPLATES.map((t) => v3(t.solidCentre)).join(",")});`;
const consts = `const float PI=3.14159265359,TAU=6.28318530718;`;
const common = `
#define u_dev clamp(u_params[0],0.,2.)
float ss(float a,float b,float x){return smoothstep(a,b,x);}
float phaseAt(int x){
 vec3 b=floor(texelFetch(u_state,ivec2(x,0),0).rgb*255.+.5);
 return (b.r*65536.+b.g*256.+b.b)/16777216.;
}
// Camera: an endless orbit outside the field that cranes from a high view
// of the sheet down to a low, upward view into the vortex.
void cameraAt(float dev,out vec3 cam,out vec3 f,out vec3 r,out vec3 u){
 float pc=phaseAt(0),A=TAU*pc;
 float R=${CAMERA.radius.toFixed(2)}+${CAMERA.sway.toFixed(2)}*sin(TAU*2.*pc)+2.6*ss(1.,2.,dev);
 float h=mix(mix(9.5,4.4,ss(0.,1.,dev)),1.7,ss(1.,2.,dev))+mix(.75,.45,ss(1.,2.,dev))*sin(TAU*3.*pc+1.)+3.5*clamp(u_params[7],0.,1.);
 cam=vec3(R*cos(A),h,R*sin(A));
 vec3 target=vec3(0.,mix(mix(-2.2,1.7,ss(0.,1.,dev)),3.5,ss(1.,2.,dev)),0.);
 f=normalize(target-cam);r=normalize(cross(vec3(0,1,0),f));u=cross(f,r);
}
vec3 wave(vec2 xz,float amp,float pv){
 float w=TAU*pv;
 float h=sin(.55*xz.x+w*2.)*sin(.47*xz.y-w*3.)+.5*sin(.31*(xz.x+xz.y)+w*5.);
 return vec3(0.,amp*h,0.);
}
float waveAmp(float dev){return .12*(1.-ss(0.,.45,dev));}
vec3 floorNormal(vec2 xz,float amp,float pv){
 // Analytic derivatives of wave(): no four displaced wave evaluations.
 float w=TAU*pv,a=.55*xz.x+2.*w,b=.47*xz.y-3.*w,c=.31*(xz.x+xz.y)+5.*w;
 float shared=.155*cos(c);
 float hx=.55*cos(a)*sin(b)+shared,hz=.47*sin(a)*cos(b)+shared;
 return normalize(vec3(-amp*hx,1.,-amp*hz));
}
vec3 coreAt(float dev){return vec3(0.,mix(.9,2.1,ss(.2,1.,dev))+.5*ss(1.,2.,dev),0.);}
float coreLight(float dev){
 return u_params[4]*(ss(.3,1.,dev)*1.2+ss(1.05,2.,dev)*1.4)*(1.+.8*u_rhythm.z);
}`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 a0;
layout(location=1) in vec4 a1;
layout(location=2) in vec4 a2;
layout(location=3) in vec4 a3;
layout(location=4) in vec4 a4;
layout(location=5) in vec4 a5;
layout(location=6) in vec4 a6;
uniform float u_kick;
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec4 u_rhythm;
uniform highp sampler2D u_state;
${tables}
${consts}
${common}
out vec3 v_pos,v_normal,v_world;
out float v_trail;
out vec3 v_bary;
flat out vec4 v_info;
vec3 rot(vec3 p,vec3 a,vec3 k,float t){
 vec3 v=p-a;float c=cos(t),s=sin(t);
 return a+v*c+cross(k,v)*s+k*dot(k,v)*(1.-c);
}
vec3 rotDir(vec3 v,vec3 k,float t){return rot(v,vec3(0.),k,t);}
float foldS(float dev,float birth,float depth){
 float t=clamp((dev-(.05+.4*birth+.05*depth))/.25,0.,1.);
 return clamp(.035+.965*t*t*(3.-2.*t)-.035*u_rhythm.y,0.,1.);
}
void main(){
 float dev=u_dev,kind=a1.y,pv=phaseAt(1);
 float amp=waveAmp(dev);
 vec3 p,n;v_bary=vec3(1.);v_trail=0.;
 v_info=vec4(kind,a5.y,0.,0.);
 if(kind<.5){
  p=a0.xyz+wave(a0.xz,amp,pv);
  n=vec3(0.,1.,0.);
 }else{
  int g=int(a0.w+.5),t=TPL[g];
  float birth=a1.z,scale=a2.z;
  if(a3.w>=0.)scale*=ss(a3.w-.08,a3.w+.08,u_params[6]);
  // Exact hinge chain: apply each face's fold from the leaf to the root.
  vec3 q=a0.xyz,c=vec3(a6.x,0.,a6.y),nn=vec3(0.,-1.,0.);
  int k=g;
  for(int i=0;i<${MAX_DEPTH};i++){
   if(PARENT[k]<0)break;
   float ang=HPHI[k]*foldS(dev,birth,DEPTH[k]);
   q=rot(q,HA[k],HU[k],ang);c=rot(c,HA[k],HU[k],ang);nn=rotDir(nn,HU[k],ang);
   k=PARENT[k];
  }
  float L=ss(.45+.3*birth,.75+.25*birth,dev);
  vec3 axis=normalize(mix(vec3(0.,1.,0.),vec3(sin(a3.x)*cos(a3.y),cos(a3.x),sin(a3.x)*sin(a3.y)),L)+1e-5);
  float ang=a2.w+TAU*a3.z*pv;
  vec3 pivot=mix(vec3(0.),SOLID[t],L)*scale;
  vec3 base=vec3(a2.x,.06*(1.-L)+a1.w*L+.25*L*sin(TAU*2.*pv+a2.w),a2.y);
  vec3 pA=rot(q*scale,pivot,axis,ang)+base;
  vec3 cA=rot(c*scale,pivot,axis,ang)+base;
  pA+=wave(pA.xz,amp,pv)*(1.-L);cA+=wave(cA.xz,amp,pv)*(1.-L);
  vec3 nA=rotDir(nn,axis,ang);
  // Shards leave their solid for a vortex orbit around the light core.
  float e=ss(1.04+.5*a5.x,1.42+.5*a5.x,dev),eR=ss(0.,.55,e);
  float oa=a4.y+TAU*a4.w*pv;
  vec3 H=vec3(a4.x*cos(oa),a4.z+.35*sin(TAU*3.*pv+a5.z),a4.x*sin(oa));
  // Persistent bank per shard: still an orthonormal rigid face frame,
  // but front and back paper surfaces catch different raking light.
  float bank=.38*cos(a5.w);
  vec3 T=vec3(-sin(oa),0.,cos(oa)),B=normalize(vec3(bank*cos(oa),1.,bank*sin(oa)));
  vec2 o=(a0.xz-a6.xy)*mix(scale,min(scale,.8)*1.1,e)*vec2(1.,mix(1.,.6,e));
  float sa=a5.w;o=vec2(o.x*cos(sa)-o.y*sin(sa),o.x*sin(sa)+o.y*cos(sa));
  float stretch=1.+clamp(u_params[3],0.,2.)*3.2*e;
  if(o.x<0.){v_trail=e;o.x*=stretch;}
  vec3 target=T*o.x+B*o.y;
  p=mix(cA,H,e)+mix(pA-cA,target,eR);
  n=normalize(mix(nA,cross(T,B),eR)+1e-5);
  v_bary=vec3(1.-a6.z-a6.w,a6.z,a6.w);
  v_info=vec4(kind,a5.y,e,float(t));
 }
 vec3 cam,fw,rt,up;cameraAt(dev,cam,fw,rt,up);
 vec3 q2=p-cam;
 v_world=p;v_pos=q2;v_normal=n;
 vec3 view=vec3(dot(q2,rt),dot(q2,up),dot(q2,fw));
 float A=u_resolution.x/u_resolution.y,F=mix(mix(2.,1.45,ss(0.,1.,dev)),1.45,ss(1.,2.,dev))*(1.+.02*u_kick);
 float nearZ=.05,farZ=80.;
 gl_Position=vec4(view.x*F/max(A,1.),view.y*F*min(A,1.),
  (view.z*(farZ+nearZ)-2.*farZ*nearZ)/(farZ-nearZ),view.z);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_pos,v_normal,v_world;
in float v_trail;
in vec3 v_bary;
flat in vec4 v_info;
uniform float u_time,u_level;
uniform float u_params[8];
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm;
uniform highp sampler2D u_state;
${consts}
${common}
out vec4 outColor;
vec3 pal(float t){return mix(mix(u_secondary,u_primary,smoothstep(0.,.65,t)),u_accent,smoothstep(.65,1.,t));}
void main(){
 float dev=u_dev,kind=v_info.x,rnd=v_info.y,dist=length(v_pos);
 vec3 V=-v_pos/max(dist,1e-4);
 vec3 N=normalize(v_normal);
 bool outside=dot(N,V)>0.;
 if(!outside)N=-N;
 vec3 K=normalize(vec3(-.75,.38,-.42));
 vec3 L=coreAt(dev)-v_world;float l2=dot(L,L);L*=inversesqrt(l2);
 float I=coreLight(dev),att=I/(1.+.11*l2);
 vec3 coreC=mix(mix(u_primary,vec3(1.),.3),u_accent,.22+.3*u_rhythm.z);
 vec3 fogC=mix(u_secondary,u_primary,.25)*.03;
 float fog=1.-exp(-max(dist-6.,0.)*.035);
 vec3 col;
 if(kind<.5){
  // Paper floor: an origami crease grid lit by the raking key and the core.
  vec2 xz=v_world.xz;
  N=floorNormal(xz,waveAmp(dev),phaseAt(1));
  float lines=0.;
  for(int i=0;i<3;i++){
   float a=float(i)*PI/3.+.3;
   float x=dot(xz,vec2(cos(a),sin(a)))/1.15;
   float d=abs(fract(x)-.5);
   float w=fwidth(x);
   lines=max(lines,(1.-smoothstep(.5-w*1.3,.5,d))*smoothstep(.12,.02,w));
  }
  float rr=length(xz);
  vec3 paper=mix(u_secondary,vec3(.5),.4)*.07;
  float key=max(dot(N,K),0.);
  float pool=I/(1.+.35*l2);
  col=paper*(.2+1.3*key)*(1.-.6*ss(1.,2.,dev))+coreC*pool*max(dot(N,L),0.)*.2;
  // The Sheet's high camera sees the creases from further away, and the
  // calm state lights them more (no core yet).
  float calm=1.-ss(.3,1.,dev);
  col+=mix(u_primary,vec3(1.),.4)*lines*(.07+.04*calm+.08*key+.2*pool)*u_params[5]*(1.-ss(mix(6.,12.,calm),mix(16.,28.,calm),dist));
  // Glossy sheet: the core reflects as a long streak towards the camera.
  vec3 Rv=reflect(-V,N)-L,rt=normalize(cross(vec3(0.,1.,0.),V));
  float sx=dot(Rv,rt),sy=length(Rv-rt*sx);
  float sheen=exp(-sx*sx*700.-sy*sy*9.);
  col+=coreC*I*sheen*.4/(1.+.02*l2);
  col*=1.-ss(14.,25.,rr);
 }else{
  float e=v_info.z;
  vec3 paperO=mix(pal(.04+.6*rnd),vec3(1.),.16)*.5*(1.-.55*e);
  vec3 paperI=mix(mix(u_secondary,pal(.45),.5),vec3(1.),.18)*.42*(1.-.55*e);
  vec3 base=outside?paperO:paperI;
  float key=max(dot(N,K),0.)*(1.-.75*e),cd=dot(N,L);
  // Lit sides face the core; backlit shards keep a faint transmission, so
  // shards in front of the core read as silhouettes with glowing rims.
  float core=max(cd,0.)+mix(.6,.18,e)*max(-cd,0.);
  float nv=abs(dot(N,V)),fres=pow(1.-nv,3.);
  float spec=pow(max(dot(N,normalize(K+V)),0.),40.);
  vec3 tintS=pal(.04+.6*fract(rnd*2.7));
  col=base*(.15+1.25*key)+mix(base,mix(coreC,tintS,.45*e),.55+.3*e)*att*core*(.95+.8*e);
  col+=mix(u_secondary,vec3(1.),.5)*fres*.22;
  col+=vec3(1.)*spec*.25*key;
  // Glowing rims on every polygon edge, about 1.5 px at any resolution.
  // Folded faces glow on their polygon rim; shards on all three edges.
  float edgeS=min(min(v_bary.x,v_bary.y),v_bary.z);
  float edge=mix(v_bary.x,edgeS,ss(0.,.3,e));
  float w=fwidth(edge);
  float rim=(1.-smoothstep(0.,w*1.6,edge))*smoothstep(.6,.15,w);
  float rimG=u_params[5]*(1.15+.1*ss(.3,1.,dev)+.65*e*(.4+att))*(1.+1.1*u_rhythm.x);
  vec3 rimC=mix(pal(.2+.5*fract(rnd*5.3)),vec3(1.),.45);
  col+=mix(rimC,u_accent,.25*u_rhythm.x)*rim*rimG;
  // Shards glow as they stream; the trailing end fades into a streak.
  vec3 glowC=mix(coreC,tintS,.6);
  col+=glowC*e*(.2+.6*att)*(1.-.9*v_trail);
  col*=1.-.85*v_trail*e;
 }
 col=mix(col,fogC,fog);
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
// Background: palette dark with the light core's halo, in the same camera.
const fragment = `
${common}
void main(){
 float dev=u_dev;
 vec3 cam,fw,rt,up;cameraAt(dev,cam,fw,rt,up);
 float A=u_resolution.x/u_resolution.y,F=mix(mix(2.,1.45,ss(0.,1.,dev)),1.45,ss(1.,2.,dev))*(1.+.02*u_kick);
 vec2 ndc=v_uv*2.-1.;
 vec3 rd=normalize(fw+rt*(ndc.x*max(A,1.)/F)+up*(ndc.y/(F*min(A,1.))));
 vec3 c=coreAt(dev)-cam;float t=max(dot(c,rd),0.);float d=length(c-rd*t);
 float I=coreLight(dev);
 vec3 coreC=mix(mix(u_primary,vec3(1.),.35),u_accent,.18+.3*u_rhythm.z);
 vec3 col=mix(u_secondary,u_primary,.25)*.03*(.7+.3*smoothstep(-.3,.4,rd.y));
 col+=coreC*I*(1.1*exp(-d*d*2.)+.1/(1.+d*d*.6));
 col+=mix(u_accent,vec3(1.),.5)*I*exp(-d*d*28.)*.8;
 outColor=vec4(col,1.);
}`;
const simulation = `
void main(){
 int x=int(gl_FragCoord.x);
 vec3 b=floor(texelFetch(u_state,ivec2(x,0),0).rgb*255.+.5);
 uint n=(uint(b.r)<<16u)|(uint(b.g)<<8u)|uint(b.b);
 float rate=x==0?clamp(u_params[1],0.,2.)/${ORBIT_PERIOD.toFixed(1)}:clamp(u_params[2],0.,2.)/${SWIRL_PERIOD.toFixed(1)};
 if(u_reset)n=seedHash(u_seedBits+uint(x)*7919u)&16777215u;
 else n=(n+uint(floor(u_dt*rate*16777216.+.5)))&16777215u;
 outColor=vec4(float(n>>16u),float((n>>8u)&255u),float(n&255u),255.)/255.;
}`;
const schema = [
  {
    key: "development",
    label: "Development · sheet / fold / shards",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  { key: "drift", label: "Orbit speed", min: 0.1, max: 2, step: 0.01, default: 1 },
  { key: "swirl", label: "Vortex speed", min: 0.1, max: 2, step: 0.01, default: 1 },
  { key: "streak", label: "Shard streaks", min: 0, max: 2, step: 0.01, default: 1 },
  { key: "light", label: "Core light", min: 0.2, max: 1.6, step: 0.01, default: 1 },
  { key: "rims", label: "Edge glow", min: 0, max: 2, step: 0.01, default: 1 },
  { key: "density", label: "Small solids", min: 0, max: 1, step: 0.01, default: 0.55 },
  { key: "crane", label: "Crane height", min: 0, max: 1, step: 0.01, default: 0 },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    drift: 1,
    swirl: 1,
    streak: 1,
    light: 1,
    rims: 1,
    density: 0.55,
    crane: 0,
    ...params,
  },
});
export default {
  id: "fold",
  number: 91,
  name: "Polyhedral Folding",
  description:
    "A creased sheet of Platonic nets folds along exact hinge chains into closed solids, which rise, tumble and burst into a vortex of streaking shards.",
  development: "development",
  schema,
  presets: [
    look("Creased Sheet", 527, 0),
    look("Rising Solids", 527, 1),
    look("Shard Storm", 527, 2),
    look("Blueprint Field", 1931, 0.35, { crane: 0.8, rims: 1.6, drift: 0.6 }),
    look("Tumbling Choir", 88, 1.15, { swirl: 1.5, light: 1.3, density: 0.9 }),
    look("Slow Comet Ring", 3307, 1.75, { swirl: 0.6, streak: 1.8, drift: 0.7, crane: 0.35 }),
    look("Paper Lanterns", 777, 0.75, { light: 1.5, rims: 1.4, density: 0.8, drift: 0.6 }),
    look("Glass Asteroids", 4096, 1.35, { swirl: 0.45, streak: 0.3, crane: 0.25, light: 1.2 }),
  ],
  stage: ["swirl", "streak", "light"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    drift: { mul: [0.7, 1.4] },
    swirl: { mul: [0.6, 1.5] },
    streak: { mul: [0.5, 1.6] },
    density: [0, 0.45],
  },
  beat: { punch: 0.06, pulse: 0.06 },
  audio: [
    { param: "streak", feature: "low", amount: 0.06 },
    { param: "rims", feature: "high", amount: 0.05 },
  ],
  rhythm: [
    familyEffect("edge-flash", 0, "Edge flash", "Every polygon edge flares at once.", {
      period: 4,
      strength: 0.6,
      duration: 0.5,
    }),
    familyEffect("fold-breath", 1, "Fold breath", "All hinges open slightly and close again.", {
      period: 8,
      strength: 0.6,
      duration: 1,
    }),
    familyEffect("core-flare", 2, "Core flare", "The light core flares and lights every face.", {
      period: 16,
      strength: 0.7,
      duration: 2,
    }),
  ],
  fragment,
  simulation: { fragment: simulation, size: [2, 1], steps: 1 },
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    vertex,
    fragment: surface,
  },
};
