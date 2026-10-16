import { familyEffect } from "./family-rhythm.mjs";
import {
  ATTRIBUTES,
  INSTANCE_ATTRIBUTES,
  createGeometry,
  createInstances,
} from "./voxel-model.mjs";
const common = `
float ss(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
void camera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float dev=clamp(u_params[0],0.,2.),a=ss(0.,1.,dev),s=ss(1.,2.,dev);
 float angle=.48+.24*sin(u_clock[1]);
 float radius=mix(mix(8.3,11.8,a),5.8,s)*u_params[5];
 eye=vec3(radius*sin(angle),mix(mix(1.35,3.2,a),10.,s)+.18*sin(2.*u_clock[1]),radius*cos(angle));
 vec3 target=vec3(1.6*a*(1.-s),mix(mix(3.1,4.0,a),16.,s),0.);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0.,1.,0.)));U=cross(R,F);
}
float lens(){return mix(1.6,1.32,ss(1.,2.,u_params[0]))*(1.+.018*clamp(u_kick,0.,1.));}
vec3 fogColor(){return mix(u_secondary,u_primary,.25)*.008;}
// One contiguous oblique write front, distinct from the horizontal cool scan.
// x = narrow live seam, y = passed-front wake; no repeated storey planes.
vec2 rewriteState(vec3 p){
 float e=clamp(u_rhythm.w,0.,1.);
 float phase=clamp(1.-e+min(u_rhythmHit.w,.025),0.,1.);
 float unfold=ss(1.,2.,u_params[0]);
 float address=abs(p.y)+p.x*mix(.48,.15,unfold)-p.z*.12;
 float y=mix(-2.,11.,unfold)+phase*mix(14.,10.,unfold);
 float gate=ss(0.,.10,e);
 return vec2(exp(-pow((address-y)/.8,2.)),ss(-.25,.3,y-address))*gate;
}
float rewrite(vec3 p){return rewriteState(p).x;}
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
uniform vec4 u_rhythm,u_rhythmCount,u_rhythmHit;
uniform vec3 u_primary,u_secondary,u_accent;
${common}
out vec3 v_local,v_world;
out vec4 v_light;
out vec2 v_depth;
flat out vec4 v_info;
flat out float v_tail;
flat out float v_link;
void main(){
 float dev=clamp(u_params[0],0.,2.),rank=a_identity.x,rnd=a_identity.y,mirror=a_identity.z;
 // The tail is exactly degenerate after assembly. Skip its otherwise unused
 // transforms and lighting at those states, without changing any solid vertex.
 if(dev>=1.&&dot(a_normal,a_normal)<.5){
  v_local=vec3(0.);v_world=vec3(0.);v_light=vec4(0.);v_depth=vec2(0.);
  v_info=vec4(0.);v_tail=1.;v_link=0.;gl_Position=vec4(0.,0.,0.,1.);return;
 }
 float assemble=ss(0.,1.,dev*1.65-.65*rank);
 float unfold=ss(0.,1.,max(0.,dev-1.)*1.45-.45*rank);
 float fall=fract(u_clock[0]+rnd);
 vec3 rain=vec3(a_rain.x,.3+14.*(.5+.5*cos(6.28318530718*fall)),a_rain.z);
 vec3 target=a_target;target.xz*=u_params[3];
 vec3 p=mix(mix(rain,a_monolith,assemble),target,unfold);
 // Local row cohorts receive a bounded bit flip, never a population reset.
 float row=floor((a_monolith.y-.22)/.28+.5);
 float cohort=1.-step(.5,abs(mod(row,8.)-mod(u_rhythmCount.z,8.)));
 float glitch=clamp(u_rhythm.z,0.,1.)*cohort*.30*u_params[6];
 p.x+=glitch*sin(6.28318530718*rnd);
 float front=12.1*(1.-clamp(u_kick,0.,1.));
 float bit=exp(-pow((a_monolith.y-front)*2.5,2.))*u_kick;
 p.z+=bit*.08;
 float sparse=(.14+.10*rnd)*ss(.34,.63,fract(rank*83.6843)+u_level*.12);
 float wrap=ss(0.,.035,fall)*ss(.53,.48,fall);
 float halfSize=mix(sparse*wrap,.207,assemble)*u_params[4];
 halfSize=mix(halfSize,.248*u_params[4],unfold);
 vec3 local=a_position;
 float write=rewrite(p);
 float wake=rewriteState(p).y;
 float turn=(bit*.08+glitch)*2.+write*.20+wake*.075;
 p.z-=write*.20;
 mat2 rot=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));
 vec3 n=a_normal;local.xz=rot*local.xz;n.xz=rot*n.xz;
 float link=step(.0001,dot(a_link,a_link));
 vec3 span=abs(a_link);span.xz*=u_params[3];
 vec3 eye,R,U,F;camera(eye,R,U,F);
 // Only rain can approach the lens. Fade its geometric size, not the whole
 // frame, before the near plane; fixed architecture never clips the camera.
 halfSize*=mix(ss(.55,1.25,length(p-eye)),1.,assemble);
 vec3 module=mix(vec3(halfSize),vec3(halfSize*2.20,halfSize*.59,halfSize*1.05),assemble);
 vec3 extent=mix(module,(.5*span+vec3(.012))*unfold,link);
 n=n/max(extent,vec3(.001));
 n*=inversesqrt(max(dot(n,n),.00001));
 vec3 world=p+local*extent;
 float tail=1.-step(.5,dot(a_normal,a_normal));
 if(tail>.5){
  float speed=max(0.,sin(6.28318530718*fall));
  float length=(.45+1.55*speed)*(1.-assemble);
  float width=halfSize*.22;
  world=p+R*a_position.x*width+vec3(0.,halfSize+a_position.y*length,0.);
  if(link>.5||halfSize<.015||assemble>.999)world=p;
 }
 v_tail=tail;
 v_link=link;
 if(mirror>.5){world.y=-world.y;n.y=-n.y;}
 v_world=world;v_local=a_position;
 vec3 V=normalize(eye-world),L=normalize(vec3(-9.,18.,12.)-world);
 v_light=vec4(max(dot(n,L),0.),pow(max(dot(n,normalize(L+V)),0.),44.),
  pow(1.-max(dot(n,V),0.),3.),max(dot(n,normalize(vec3(3.,2.,-4.))),0.));
 v_depth=vec2(length(eye-world),.40+.35*pow(1.-abs(V.y),3.));
 v_info=vec4(rnd,mirror,bit,rank);
 vec3 c=world-eye;vec3 q=vec3(dot(c,R),dot(c,U),dot(c,F));
 float A=u_resolution.x/u_resolution.y,f=lens();
 gl_Position=vec4(q.x*f/max(A,1.),q.y*f*min(A,1.),(q.z*60.1-12.)/59.9,q.z);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_local,v_world;
in vec4 v_light;
in vec2 v_depth;
flat in vec4 v_info;
flat in float v_tail;
flat in float v_link;
uniform float u_params[8],u_kick,u_level;
uniform float u_clock[4];
uniform vec2 u_resolution;
uniform vec4 u_rhythm,u_rhythmCount,u_rhythmHit;
uniform vec3 u_primary,u_secondary,u_accent;
${common}
out vec4 outColor;
void main(){
 if(v_tail>.5){
  float shape=exp(-v_local.x*v_local.x*4.)*pow(1.-v_local.y,2.);
  vec3 glow=mix(u_secondary,u_primary,.35)*shape*1.25;
  glow*=exp(-v_depth.x*.045);
  if(v_info.y>.5)glow*=.5;
  outColor=vec4(glow,0.);return;
 }
 float diffuse=v_light.x,rim=v_light.z,spec=v_light.y;
 vec3 a=abs(v_local);float edge=min(min(max(a.x,a.y),max(a.y,a.z)),max(a.x,a.z));
 float defocus=(1.-ss(0.,1.,u_params[0]))*ss(6.,1.5,v_depth.x);
 float aa=max(fwidth(edge),.012)+defocus*.07;
 float edges=ss(.94-aa,.94+aa,edge);
 float dev=u_params[0];
 float scan=exp(-pow((abs(v_world.y)-(1.-clamp(u_rhythm.y,0.,1.))*32.)*3.,2.))*min(1.,u_rhythm.y*5.);
 float sweep=exp(-pow((abs(v_world.y)-(.5+.5*sin(u_clock[2]))*32.)*4.,2.));
 scan=max(scan,sweep*.6);
 if(v_link>.5){
  vec3 col=u_secondary*(.025+.10*diffuse+edges*.025+scan*.18);
  if(v_info.y>.5)col*=v_depth.y*exp(-abs(v_world.y)*.075);
  col=mix(fogColor(),col,exp(-v_depth.x*mix(.038,.058,ss(1.,2.,dev))));
  outColor=vec4(max(col,vec3(0.)),1.);return;
 }
 vec3 base=mix(u_secondary,vec3(1.),.20+.06*v_info.x);
 vec3 portColor=mix(u_secondary,vec3(1.),.66);
 float cavities=.45+.55*ss(0.,2.8,abs(v_world.y));
 float fill=v_light.w;
 // Solid black-silicon faces, a broad key and a narrow physical bevel.
 float bevel=ss(.78,.99,edge);
 vec3 col=base*(.045+.65*diffuse)*cavities*(1.-bevel*.65);
 col+=u_secondary*fill*.055;
 col+=mix(base,vec3(1.),.04)*spec*.5;
 float address=1.-step(.8,abs(mod(floor(v_info.w*1296.),16.)-mod(u_rhythmCount.x,16.)));
 float data=address*clamp(u_rhythm.x,0.,1.);
 float emit=(.11+u_params[2]*.16);
 float conductor=step(.83,v_info.x);
 col+=base*edges*emit*(.3+.7*diffuse)*(.2+.8*conductor);
 col+=u_secondary*rim*.18;
 col+=u_primary*edges*(scan*.65+v_info.z*.6);
 // Face memory pads: an addressed bit-flip travels with the kick front.
 vec2 uv=a.x>.999?v_local.yz:(a.y>.999?v_local.xz:v_local.xy);
 // A grazing directional gradient and machined inset lip, not a flat fill.
 col*=.62+.38*ss(-1.,1.,uv.x*.65+uv.y*.35);
 float recess=(1.-ss(.67,.78,abs(uv.x)))*(1.-ss(.66,.78,abs(uv.y)));
 col*=1.-recess*.48;
 float lip=(1.-ss(.012,.055,abs(abs(uv.x)-.75)))*(1.-ss(.70,.80,abs(uv.y)));
 col+=base*lip*(.10+.28*diffuse);
 vec2 pad=abs(uv-vec2(-.27,.2));
 vec2 padAA=max(fwidth(uv),vec2(.015));
 float memory=(1.-ss(.13-padAA.x,.13+padAA.x,pad.x))*(1.-ss(.23-padAA.y,.23+padAA.y,pad.y));
 float marked=step(.85,v_info.x);
 col+=u_primary*memory*marked*(.5+v_info.z*2.);
 // Fine face scanline, separate from the large addressed scanning plane.
 float line=abs(fract(uv.y*.5+.5-u_clock[2]/6.28318530718)-.5);
 float lineAA=max(fwidth(line),.008);
 float readout=1.-ss(.012-lineAA,.012+lineAA,line);
 col+=u_secondary*readout*(.025+scan*.18)*(1.-edges);
 // Energy enables more actual illuminated memory ports, not global gain.
 vec2 ports=vec2(abs(uv.x),abs(fract((uv.y*.5+.5)*3.)-.5));
 vec2 portAA=max(fwidth(uv)*1.1,vec2(.03));
 float bank=(1.-ss(.53-portAA.x,.53+portAA.x,ports.x))
  *(1.-ss(.155-portAA.y,.155+portAA.y,ports.y));
 vec2 writeState=rewriteState(v_world);
 float write=writeState.x,wake=writeState.y;
 float portRow=floor((uv.y*.5+.5)*3.);
 float bitAddress=v_info.x*83.+portRow*.618+floor(uv.x*4.)*.37;
 float oldWord=step(.43,fract(bitAddress+mod(u_rhythmCount.w-1.,2.)*.47));
 float newWord=step(.43,fract(bitAddress+mod(u_rhythmCount.w,2.)*.47));
 // Previous data ahead of the seam, retained current data behind it.
 // Muting still silences the gesture; no autonomous rewrite oscillator.
 float written=1.-ss(0.,.10,clamp(u_rhythm.w,0.,1.))+wake;
 float register=mix(oldWord,newWord,clamp(written,0.,1.));
 bank*=.10+.90*register;
 float enabled=step(v_info.x,.18+u_level*.55);
 float portVariation=.35+.65*pow(v_info.x,2.);
 float interior=(1.-edges)*(1.-bevel*.55);
 col*=1.-bank*.45;
 col+=portColor*bank*interior*enabled*portVariation*(1.6+data*2.0+scan*.8);
 col+=u_primary*bank*interior*enabled*wake*.65;
 col+=u_accent*write*interior*(bank*5.+memory*.6+.28);
 col+=u_primary*write*(edges*.65+interior*.12);
 col+=u_accent*(bank*interior*data*.7+memory*marked*v_info.z*2.5);
 if(v_info.y>.5)col*=v_depth.y*exp(-abs(v_world.y)*.075);
 col=mix(fogColor(),col,exp(-v_depth.x*mix(.055,.11,ss(1.,2.,dev))));
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
 float T=65.;
 if(rd.y<-.0001){
  T=min(55.,-eye.y/rd.y);vec3 p=eye+rd*T;
  vec2 grid=p.xz/.85;
  vec2 fw=fwidth(grid),d=abs(fract(grid-.5)-.5);
  vec2 g=1.-smoothstep(vec2(.008),vec2(.008)+fw*1.3,d);
  float lines=max(g.x,g.y)*exp(-T*.07);
  float pool=exp(-dot(p.xz,p.xz)*.055);
  float contact=1.-.9*exp(-dot(p.xz,p.xz)*1.5);
  col+=tone*(lines*.10+pool*.07*contact);
  float ring=exp(-pow((length(p.xz)-3.5)*7.,2.));
  col+=u_secondary*ring*.075;
 }
 // Thin columns of light in the dark server hall. Analytic ray distances,
 // no screen-space noise or expensive volume march.
 for(int i=0;i<8;i++){
  float k=float(i),x=(mod(k,4.)-1.5)*6.,z=-9.-floor(k/4.)*9.;
  float t=max(0.,dot(vec2(x,z)-eye.xz,rd.xz)/max(dot(rd.xz,rd.xz),.00001));
  vec3 p=eye+rd*t;vec2 delta=p.xz-vec2(x,z);float d2=dot(delta,delta);
  // At this conservative distance the widest Gaussian is below 1e-6.
  // Most hall rays miss a column, so avoid three exponentials for them.
  if(d2<3.4){
   float bound=ss(.0,.5,p.y)*ss(38.,34.,p.y)*ss(T+.1,T-.1,t);
   float beam=exp(-d2/.012)*.7+exp(-d2/.3)*.05;
   col+=tone*beam*bound*exp(-t*.055);
  }
 }
 float focus=length(cross(vec3(0.,3.,0.)-eye,rd));
 col+=tone*.07*exp(-focus*focus*.045);
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
  rhythmStyles: {
    restrained: "Idle registers",
    driving: "Address march",
    accented: "Midnight overflow",
  },
  rhythm: [
    familyEffect(
      "address-flip",
      0,
      "Address flip",
      "A persistent address cohort lights along the voxel edges.",
      {
        period: 4,
        strength: 0.7,
        duration: 1.2,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....... | .....x.. | ....X... | .....x..",
            division: 2,
            strength: 0.55,
            duration: 1.1,
          },
          driving: {
            steps: "X...x... | .X....x.",
            division: 2,
            strength: 0.82,
            duration: 0.7,
          },
          accented: {
            steps:
              "X......x........ | ..X.......x..... | ....X.......x... | ......X.......x.",
            division: 4,
            strength: 0.95,
            duration: 0.4,
          },
        },
      },
    ),
    familyEffect(
      "scan-plane",
      1,
      "Scan plane",
      "A narrow scan plane crosses the same voxel matter.",
      {
        period: 8,
        strength: 0.75,
        duration: 3,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "...x.... | .......X | ..x..... | ........",
            division: 2,
            strength: 0.6,
            duration: 1.3,
          },
          driving: {
            steps: "..X.x.x. | .x.X..x.",
            division: 2,
            strength: 0.95,
            duration: 0.38,
          },
          accented: {
            steps: ".X..x.X..x.X..x. | ..X.x..X.x..X.xx",
            division: 4,
            strength: 0.98,
            duration: 0.2,
          },
        },
      },
    ),
    familyEffect(
      "register-shift",
      2,
      "Register shift",
      "One addressed row makes a bounded glitch displacement.",
      {
        period: 16,
        strength: 0.75,
        duration: 2,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | ........ | ......X.",
            division: 2,
            strength: 0.6,
            duration: 1.5,
          },
          driving: {
            steps: "........ | ......x. | ........ | .....X.x",
            division: 2,
            strength: 0.84,
            duration: 0.6,
          },
          accented: {
            steps:
              "................ | .............x.. | ................ | ............X..x",
            division: 4,
            strength: 0.98,
            duration: 0.4,
          },
        },
      },
    ),
    familyEffect(
      "memory-rewrite",
      3,
      "Memory rewrite",
      "A travelling write plane turns voxel banks and rewrites their recessed memory ports.",
      {
        period: 8,
        strength: 1,
        duration: 1.5,
        steps: "X...X...",
        styles: {
          restrained: {
            steps: "..X..... | ......X. | ........ | .....X..",
            division: 2,
            strength: 0.9,
            duration: 1.4,
          },
          driving: {
            steps: "X...X... | ...X..X.",
            division: 2,
            strength: 1,
            duration: 1.65,
          },
          accented: {
            steps: "X...X..X....X... | ..X...X...X...X.",
            division: 4,
            strength: 1,
            duration: 0.65,
          },
        },
      },
    ),
  ],
  clocks: [
    { rate: (p) => 0.055 * p[1], period: 1 },
    { rate: (p) => 0.025 * p[7], period: 2 * Math.PI },
    { rate: (p) => 0.3 * p[1], period: 2 * Math.PI },
  ],
  fragment: background,
  geometry: {
    create: createGeometry,
    additiveFrom: 36,
    attributes: ATTRIBUTES,
    instances: { create: createInstances, attributes: INSTANCE_ATTRIBUTES },
    vertex,
    fragment: surface,
  },
};
