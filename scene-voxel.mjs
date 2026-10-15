import { familyEffect } from "./family-rhythm.mjs";
import {
  ATTRIBUTES,
  INSTANCE_ATTRIBUTES,
  createCube,
  createInstances,
} from "./voxel-model.mjs";
const common = `
float ss(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
void camera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float dev=clamp(u_params[0],0.,2.),s=ss(1.,2.,dev);
 float angle=.48+u_clock[1];
 float radius=mix(11.8,10.9,s)*u_params[5];
 eye=vec3(radius*sin(angle),2.65+.3*sin(2.*u_clock[1]),radius*cos(angle));
 vec3 target=vec3(0.,mix(2.55,3.05,s),0.);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0.,1.,0.)));U=cross(R,F);
}
float lens(){return 2.65*(1.+.018*clamp(u_kick,0.,1.));}
vec3 fogColor(){return mix(u_secondary,u_primary,.25)*.008;}
`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec3 a_rain;
layout(location=3) in vec3 a_monolith;
layout(location=4) in vec3 a_target;
layout(location=5) in vec3 a_identity;
layout(location=6) in vec3 a_link;
uniform float u_params[8];
uniform float u_clock[4];
uniform float u_level,u_kick;
uniform vec2 u_resolution;
uniform vec4 u_rhythm,u_rhythmCount;
uniform vec3 u_primary,u_secondary,u_accent;
${common}
out vec3 v_local,v_world,v_normal;
flat out vec4 v_info;
flat out float v_link;
void main(){
 float dev=clamp(u_params[0],0.,2.),rank=a_identity.x,rnd=a_identity.y,mirror=a_identity.z;
 float assemble=ss(0.,1.,dev*1.65-.65*rank);
 float unfold=ss(0.,1.,max(0.,dev-1.)*1.45-.45*rank);
 float fall=fract(u_clock[0]+rnd);
 vec3 rain=vec3(a_rain.x,.3+7.5*(.5+.5*cos(6.28318530718*fall)),a_rain.z);
 vec3 target=a_target;target.xz*=u_params[3];
 vec3 p=mix(mix(rain,a_monolith,assemble),target,unfold);
 // Local row cohorts receive a bounded bit flip, never a population reset.
 float row=floor(a_monolith.y/.155);
 float cohort=1.-step(.5,abs(mod(row,8.)-mod(u_rhythmCount.z,8.)));
 float glitch=clamp(u_rhythm.z,0.,1.)*cohort*.10*u_params[6];
 p.x+=glitch*sin(6.28318530718*rnd);
 float front=4.7*(1.-clamp(u_kick,0.,1.));
 float bit=exp(-pow((a_monolith.y-front)*7.,2.))*u_kick;
 p.z+=bit*.028;
 float sparse=.088*ss(.72,.96,fract(rank*83.6843)+u_level*.12);
 float wrap=ss(0.,.06,fall)*ss(.54,.48,fall);
 float halfSize=mix(sparse*wrap,.071,assemble)*u_params[4];
 halfSize=mix(halfSize,.050*u_params[4],unfold);
 vec3 local=a_position;
 float turn=(bit*.18+glitch)*3.;
 mat2 rot=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));
 vec3 n=a_normal;local.xz=rot*local.xz;n.xz=rot*n.xz;
 float link=step(.0001,dot(a_link,a_link));
 vec3 span=abs(a_link);span.xz*=u_params[3];
 vec3 extent=mix(vec3(halfSize),(.5*span+vec3(.006))*unfold,link);
 vec3 world=p+local*extent;
 v_link=link;
 if(mirror>.5){world.y=-world.y;n.y=-n.y;}
 v_world=world;v_normal=n;v_local=a_position;
 v_info=vec4(rnd,mirror,bit,rank);
 vec3 eye,R,U,F;camera(eye,R,U,F);
 vec3 c=world-eye;vec3 q=vec3(dot(c,R),dot(c,U),dot(c,F));
 float A=u_resolution.x/u_resolution.y,f=lens();
 gl_Position=vec4(q.x*f/max(A,1.),q.y*f*min(A,1.),(q.z*60.1-12.)/59.9,q.z);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_local,v_world,v_normal;
flat in vec4 v_info;
flat in float v_link;
uniform float u_params[8],u_kick;
uniform float u_clock[4];
uniform vec2 u_resolution;
uniform vec4 u_rhythm,u_rhythmCount;
uniform vec3 u_primary,u_secondary,u_accent;
${common}
out vec4 outColor;
void main(){
 vec3 eye,R,U,F;camera(eye,R,U,F);
 vec3 N=normalize(v_normal),V=normalize(eye-v_world);
 vec3 L=normalize(vec3(-4.,8.,5.)-v_world);
 float diffuse=max(dot(N,L),0.);
 float rim=pow(1.-max(dot(N,V),0.),3.);
 float spec=pow(max(dot(N,normalize(L+V)),0.),44.);
 vec3 a=abs(v_local);float edge=min(min(max(a.x,a.y),max(a.y,a.z)),max(a.x,a.z));
 float aa=max(fwidth(edge),.012);
 float edges=ss(.91-aa,.91+aa,edge);
 float dev=u_params[0];
 vec3 base=mix(u_secondary,u_primary,.2+.65*v_info.w);
 float cavities=.45+.55*ss(0.,2.8,abs(v_world.y));
 float fill=max(dot(N,normalize(vec3(3.,2.,-4.))),0.);
 vec3 col=base*(.08+.62*diffuse)*cavities+u_secondary*fill*.22;
 col+=mix(base,vec3(1.),.25)*spec*1.15;
 float scan=exp(-pow((abs(v_world.y)-(1.-clamp(u_rhythm.y,0.,1.))*6.4)*10.,2.))*min(1.,u_rhythm.y*5.);
 float address=1.-step(.8,abs(mod(floor(v_info.w*1296.),16.)-mod(u_rhythmCount.x,16.)));
 float data=address*clamp(u_rhythm.x,0.,1.);
 float emit=(.85+u_params[2]*1.0)*(1.+.25*sin(abs(v_world.y)*10.-u_clock[2]));
 col+=base*edges*emit*(.5+.5*diffuse);
 col+=u_secondary*rim*.13;
 col+=mix(u_primary,vec3(1.),.4)*edges*(scan*1.8+v_info.z*1.6);
 // Face memory pads: an addressed bit-flip travels with the kick front.
 vec2 uv=a.x>.999?v_local.yz:(a.y>.999?v_local.xz:v_local.xy);
 vec2 pad=abs(uv-vec2(-.27,.2));
 vec2 padAA=max(fwidth(uv),vec2(.015));
 float memory=(1.-ss(.13-padAA.x,.13+padAA.x,pad.x))*(1.-ss(.23-padAA.y,.23+padAA.y,pad.y));
 float marked=step(.85,v_info.x);
 col+=mix(u_primary,vec3(1.),.3)*memory*marked*(.25+v_info.z*2.);
 col+=u_accent*edges*data*1.4;
 col=mix(col,u_secondary*(.12+edges*.75+scan*.9),v_link);
 if(v_info.y>.5){
  float fres=.15+.35*pow(1.-abs(V.y),3.);
  col*=fres*exp(-abs(v_world.y)*.19);
 }
 float distance=length(eye-v_world);
 col=mix(fogColor(),col,exp(-distance*.027));
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
const background = `
uniform float u_clock[4];
${common}
void main(){
 vec3 eye,R,U,F;camera(eye,R,U,F);
 vec2 s=(v_uv-.5)*2.;float A=u_resolution.x/u_resolution.y;
 vec3 rd=normalize(F+R*s.x*max(A,1.)/lens()+U*s.y/(lens()*min(A,1.)));
 vec3 tone=mix(u_secondary,u_primary,.35),col=fogColor();
 float T=35.;
 if(rd.y<-.0001){
  T=min(55.,-eye.y/rd.y);vec3 p=eye+rd*T;
  vec2 grid=p.xz/.85;
  vec2 fw=fwidth(grid),d=abs(fract(grid-.5)-.5);
  vec2 g=1.-smoothstep(vec2(.008),vec2(.008)+fw*1.3,d);
  float lines=max(g.x,g.y)*exp(-T*.07);
  float pool=exp(-dot(p.xz,p.xz)*.055);
  float contact=1.-.9*exp(-dot(p.xz,p.xz)*1.5);
  col+=tone*(lines*.065+pool*.045*contact);
  float ring=exp(-pow((length(p.xz)-3.5)*7.,2.));
  col+=u_secondary*ring*.075;
 }
 // Thin columns of light in the dark server hall. Analytic ray distances,
 // no screen-space noise or expensive volume march.
 for(int i=0;i<12;i++){
  float k=float(i),x=(mod(k,4.)-1.5)*3.1,z=-4.-floor(k/4.)*3.;
  float t=max(0.,dot(vec2(x,z)-eye.xz,rd.xz)/max(dot(rd.xz,rd.xz),.00001));
  vec3 p=eye+rd*t;float d=length(p.xz-vec2(x,z));
  float bound=ss(.0,.5,p.y)*ss(8.,7.4,p.y)*ss(T+.1,T-.1,t);
  float beam=exp(-d*d/0.004)*.23+exp(-d*d/.12)*.012;
  col+=tone*beam*bound*exp(-t*.055);
 }
 float focus=length(cross(vec3(0.,3.,0.)-eye,rd));
 col+=tone*.04*exp(-focus*focus*.28);
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
const schema = [
  {
    key: "development",
    label: "Development · rain / assembly / unfold",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "speed",
    label: "Data fall",
    min: 0.2,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "edges",
    label: "Emissive edges",
    min: 0.3,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "spread",
    label: "Architecture span",
    min: 0.65,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "size",
    label: "Voxel size",
    min: 0.65,
    max: 1.25,
    step: 0.01,
    default: 1,
  },
  {
    key: "distance",
    label: "Hall distance",
    min: 0.85,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "glitch",
    label: "Bit displacement",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  { key: "orbit", label: "Hall orbit", min: 0, max: 2, step: 0.01, default: 1 },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    speed: 1,
    edges: 1,
    spread: 1,
    size: 1,
    distance: 1,
    glitch: 1,
    orbit: 1,
    ...params,
  },
});
export default {
  id: "voxel",
  number: 115,
  name: "Data Monolith",
  description:
    "Falling digital matter assembles into a scanned monolith and unfolds into a deterministic cellular architecture. Every voxel keeps its address.",
  development: "development",
  schema,
  presets: [
    look("Rain", 1151, 0),
    look("Assembly", 1151, 1),
    look("Unfold", 1151, 2),
    look("Quiet Addresses", 703, 0.35, { speed: 0.45, size: 1.2, orbit: 0.5 }),
    look("Memory Vault", 128, 1, { distance: 0.88, size: 1.1, glitch: 0.4 }),
    look("Parity Cathedral", 4095, 2, {
      spread: 1.18,
      size: 0.8,
      distance: 1.1,
    }),
    look("Broken Register", 808, 1.55, {
      spread: 0.75,
      glitch: 1.5,
      orbit: 1.4,
    }),
    look("Cold Archive", 67, 1.85, {
      spread: 0.7,
      size: 1.2,
      speed: 0.6,
      orbit: 0.45,
    }),
  ],
  stage: ["speed", "spread", "glitch"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    speed: { mul: [0.65, 1.4] },
    glitch: { mul: [0.6, 1.2] },
    orbit: { mul: [0.8, 1.3] },
  },
  beat: { punch: 0.04, pulse: 0.04 },
  audio: [{ param: "glitch", feature: "onset", amount: 0.06 }],
  rhythm: [
    familyEffect(
      "address-flip",
      0,
      "Address flip",
      "A persistent address cohort lights along the voxel edges.",
      { period: 4, strength: 0.7, duration: 1.2 },
    ),
    familyEffect(
      "scan-plane",
      1,
      "Scan plane",
      "A narrow scan plane crosses the same voxel matter.",
      { period: 8, strength: 0.75, duration: 3 },
    ),
    familyEffect(
      "register-shift",
      2,
      "Register shift",
      "One addressed row makes a bounded glitch displacement.",
      { period: 16, strength: 0.75, duration: 2 },
    ),
  ],
  clocks: [
    { rate: (p) => 0.055 * p[1], period: 1 },
    { rate: (p) => 0.025 * p[7], period: 2 * Math.PI },
    { rate: (p) => 0.3 * p[1], period: 2 * Math.PI },
  ],
  fragment: background,
  geometry: {
    create: createCube,
    attributes: ATTRIBUTES,
    instances: { create: createInstances, attributes: INSTANCE_ATTRIBUTES },
    vertex,
    fragment: surface,
  },
};
