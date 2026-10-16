import { familyEffect } from "./family-rhythm.mjs";
import { grayScottSimulation } from "./scene-acid.mjs";
import {
  myceliumMesh,
  OPAQUE_VERTICES,
  PERIOD,
  STEM_RINGS,
  CAP_RINGS,
  HAIR_RADIUS,
} from "./mycelium-geometry.mjs";

// Living Mycelium: a seeded hyphal network (tip growth, branching,
// anastomosis) over a living Gray–Scott substrate on a periodic forest floor.
// Nutrient pulses travel along true geodesic distances of the looped graph;
// cords follow Murray's law along the shortest-path transport tree; the top
// state fruits at the cord ends. Development only changes uniforms: reveal,
// hierarchy, fruiting and camera. Artistic biology, not a fungal model.
export const CHEMISTRY = [
  [0.027, 0.058, 0.8],
  [0.037, 0.061, 1.0],
  [0.029, 0.057, 0.9],
];
const glslState = (i) =>
  `vec3(${CHEMISTRY[i].map((x) => x.toFixed(4)).join(", ")})`;
const chemistry = `
vec3 myceliumChemistry() {
  float d = clamp(u_params[0], 0., 2.);
  vec3 a = ${glslState(0)}, b = ${glslState(1)}, c = ${glslState(2)};
  return d < 1. ? mix(a, b, smoothstep(0., 1., d)) : mix(b, c, smoothstep(1., 2., d));
}
`;
// Seed only extinct regions; the ring probe leaves a living colony untouched.
const spores = `
  if (u_tick % 960u < 8u) {
    uint epoch = (u_tick / 960u) % 65521u;
    vec2 aspectScale = vec2(u_resolution.x / u_resolution.y, 1.);
    float spore = 0.;
    for (int i = 0; i < 3; i++) {
      vec2 at = vec2(hash(vec2(float(epoch), float(i) + 3.)), hash(vec2(float(i) + 7., float(epoch))));
      spore = max(spore, 1. - smoothstep(.012, .02, length(torusDelta(v_uv, at) * aspectScale)));
    }
    if (spore > 0.) {
      vec2 texel = 1. / vec2(textureSize(u_state, 0));
      float around = 0.;
      for (int k = 0; k < 8; k++) {
        float angle = float(k) * .78539816;
        around = max(around, chemicals(v_uv + vec2(cos(angle), sin(angle)) * 12. * texel).y);
      }
      c = mix(c, vec2(.48, .29), spore * (1. - smoothstep(.02, .06, around)));
    }
  }
`;
// Linear visual decoding; exact nearest reads for the original chemistry.
const nearestStencil = `
vec4 colonyTexel(vec2 uv) {
  ivec2 size = textureSize(u_state, 0);
  return texelFetch(u_state, ivec2(floor(fract(uv) * vec2(size))), 0);
}
vec2 colonyLaplacian(vec2 uv) {
  vec2 t=1./vec2(textureSize(u_state,0));
  vec4 sum=-colonyTexel(uv);
  sum+=.2*(colonyTexel(uv+vec2(t.x,0.))+colonyTexel(uv-vec2(t.x,0.))
          +colonyTexel(uv+vec2(0.,t.y))+colonyTexel(uv-vec2(0.,t.y)));
  sum+=.05*(colonyTexel(uv+t)+colonyTexel(uv-t)
          +colonyTexel(uv+vec2(t.x,-t.y))+colonyTexel(uv+vec2(-t.x,t.y)));
  return unpack16(sum);
}
`;
const simulationFragment =
  nearestStencil +
  grayScottSimulation(
    {
      family: "u_params[3]",
      audio: "u_params[7]",
      feed: "myceliumChemistry().x",
      kill: "myceliumChemistry().y",
      diffusion: "myceliumChemistry().z",
      speed: "u_params[1]",
      injection: "u_params[2]",
    },
    chemistry,
    spores,
  )
    .replace("texture(u_state, uv)", "colonyTexel(uv)")
    .replace("laplacian9(u_state, v_uv)", "colonyLaplacian(v_uv)");

const f = (x) => (Number.isInteger(x) ? `${x}.` : `${x}`);
// Shared by backdrop, vertex and fragment stages (camera, substrate, fog).
const common = `
const float MY_L=${f(PERIOD)};
const float MY_TAU=6.28318530718;
float myDev(){return clamp(u_params[0],0.,2.);}
float myTide(){return smoothstep(0.,1.,myDev());}
float myCity(){return smoothstep(1.,2.,myDev());}
int myMorph(){return int(clamp(u_params[3],0.,5.)+.5);}
float myPathY(float ph){return MY_L*.5+.16*sin(MY_TAU*ph)+.06*sin(3.*MY_TAU*ph+1.3);}
// Camera: one closed meander per lap (clock 0, laps, period 1). Development
// cranes it down within a limited range; slow 64 s / 27 s yaw sway.
void myCamera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float ph=u_clock[0];
 float slope=(myPathY(ph+.002)-myPathY(ph-.002))/(.004*MY_L);
 float yaw=atan(slope)+.26*sin(MY_TAU*fract(u_time/64.))+.08*sin(MY_TAU*fract(u_time/27.));
 float altitude=clamp(u_params[5],.7,1.4);
 // Nearly linear in development: a one-bar drop cranes at ≲ 20°/s.
 float d=myDev()*.5,crane=.7*d+.3*d*d;
 float h=mix(.15,.046,crane)*altitude;
 float pitch=mix(-.48,.065,crane)+.05*(1.-altitude);
 eye=vec3(MY_L*ph,myPathY(ph),h);
 vec2 hd=vec2(cos(yaw),sin(yaw));
 F=vec3(hd*cos(pitch),sin(pitch));
 R=normalize(vec3(hd.y,-hd.x,0.));U=cross(R,F);
}
float myLens(){return 1.45*(1.+.015*clamp(u_kick,0.,1.));}
vec2 myFit(){float a=u_resolution.x/u_resolution.y;return vec2(max(1.,a),max(1.,1./a));}
// Substrate: the living Gray–Scott activator, periodic over the floor.
float mySubstrate(vec2 xy){
 vec4 b=texture(u_state,fract(xy/vec2(MY_L,MY_L*.5)));
 return (b.b*256.+b.a)*255./65535.;
}
float myFog(float d){return exp(-pow(d/.82,1.7))*(1.-smoothstep(.95,1.14,d));}
// Ground mist: a band at the horizon lit from below by the network.
vec3 myMist(vec3 rd){
 float horizon=exp(-abs(rd.z+.015)*8.);
 vec3 c=u_secondary*(.008+.085*horizon);
 c+=mix(u_secondary,u_primary,.5)*.06*exp(-abs(rd.z+.008)*20.);
 c+=u_secondary*.014*smoothstep(.0,.6,rd.z);
 return c;
}
// Nutrient trains: a soft head and a trailing streak travelling outward
// along the geodesic distance d (clock 1, metres, period 1).
float myTrain(float d,float lambda,float off,float tail){
 float s=fract((u_clock[1]-d)/lambda+off);
 return smoothstep(0.,.012/lambda,s)*exp(-s*lambda/tail);
}
// A relayed signal follows the actual network metric, not a screen ring.
// The envelope is a bounded travel coordinate; count shifts successive
// trains, and the hit marks only the tiny source region on the first frame.
float mySignal(float distanceToSource){
 float e=clamp(u_rhythm.w,0.,1.);
 float phase=mod(u_rhythmCount.w,3.)*.035;
 float d=distanceToSource+phase;
 float front=(1.-e)*.82;
 float head=exp(-pow((d-front)/.052,2.));
 float tail=step(d,front)*exp(-max(0.,front-d)/.12)*.32;
 float gate=smoothstep(0.,.12,e);
 float source=clamp(u_rhythmHit.w,0.,1.)*.06*exp(-d/.06);
 return (head+tail)*gate+source;
}
float myPulses(float dmin,float d0){
 // Energy adds trains (structure); tails shorten so the mean stays put.
 float lv=clamp(u_level,0.,1.),tail=.085-.04*lv;
 float p=myTrain(dmin,1.,0.,tail);
 p+=myTrain(dmin,.5,.37,tail)*smoothstep(.28,.55,lv);
 p+=myTrain(d0,1./3.,.11,tail)*smoothstep(.55,.82,lv);
 return p*exp(-dmin*.35);
}
`;

const attributes = `
layout(location=0) in vec4 a0;
layout(location=1) in vec4 a1;
layout(location=2) in vec4 a2;
layout(location=3) in vec4 a3;
layout(location=4) in vec4 a4;
layout(location=5) in vec4 a5;
layout(location=6) in float a_instance;`;
const uniforms = `uniform float u_time,u_level,u_kick,u_low;
uniform vec2 u_resolution;
uniform float u_params[8];
uniform float u_clock[4];
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
uniform sampler2D u_state;`;
const varyings = (dir) => `
${dir} vec4 v_a;
${dir} vec4 v_b;
${dir} vec4 v_c;
${dir} vec3 v_world;
${dir} vec3 v_normal;
flat ${dir} int v_kind;`;

// Mushroom growth and shape, shared by cap, spores and glow sprites.
// Species: 0 conical, 1 bell, 2 umbonate, 3 convex, 4 small bell. Caps tilt
// back toward the camera line so their gills face the viewer.
const mushroomGlsl = `
struct Shroom{vec3 top;float rc,capH,zApex,rs,g,prim,open;vec3 base;vec2 lean;float h,bend;int species;vec3 axis;float tilt;};
float myCapScale(){return mix(.82,1.1,clamp((u_params[4]-.3)/1.3,0.,1.));}
Shroom myShroom(vec4 p1,vec4 p2,vec4 p4){
 Shroom s;
 float st=p2.w,dev=myDev();
 s.species=int(p4.y+.5);
 s.prim=smoothstep(1.02+st,1.38+st,dev);
 s.g=smoothstep(1.2+st,1.96,dev);
 float k=myCapScale();
 s.h=p2.x*k*(.05+.95*pow(s.g,1.2));
 s.rc=p1.w*k*(.28+.72*s.g)*mix(.45,1.,s.prim);
 int m=myMorph();
 float openBias=m==2?.25:m==0?.12:0.;
 s.open=clamp(smoothstep(.3,1.,s.g)+openBias*s.g,0.,1.);
 float tall=s.species==0?1.75:s.species==2?1.05:s.species==3?.85:1.45;
 float flatH=s.species==0?1.25:s.species==2?.62:s.species==3?.52:.85;
 s.capH=s.rc*mix(tall,flatH,s.open);
 s.zApex=s.capH*.42;
 s.rs=p1.w*k*.045*mix(2.6,1.,s.g);
 s.base=p1.xyz;s.lean=vec2(cos(p2.y),sin(p2.y));s.bend=p2.z;
 s.top=s.base+vec3(s.lean*s.bend*s.h,s.h);
 s.axis=vec3(s.lean.y,-s.lean.x,0.);s.tilt=-p4.z*s.g;
 return s;
}
vec3 myRotate(vec3 v,vec3 k,float a){return v*cos(a)+cross(k,v)*sin(a)+k*dot(k,v)*(1.-cos(a));}
vec3 myStem(Shroom s,float t,float a){
 vec3 c=s.base+vec3(s.lean*s.bend*s.h*t*t,s.h*t);
 float r=s.rs*(1.15-.3*t)*(1.+.6*exp(-t*12.));
 return c+vec3(cos(a),sin(a),0.)*r;
}
// w in [0,1]: outer cap apex→margin (w<.62), then gills margin→stem.
vec3 myCap(Shroom s,float w,float a){
 float rho,z;
 if(w<.62){
  float q=w/.62;
  if(s.species==0){rho=s.rc*pow(q,.85);z=s.zApex-s.capH*pow(q,1.05);}
  else if(s.species==2){rho=s.rc*pow(sin(q*1.5708),.9);z=s.zApex-s.capH*(.3*smoothstep(0.,.3,q)+.7*pow(q,2.2));}
  else if(s.species==3){rho=s.rc*pow(sin(q*1.5708),.6);z=s.zApex-s.capH*pow(q,2.6);}
  else{rho=s.rc*pow(sin(q*1.5708),.72);z=s.zApex-s.capH*pow(q,mix(2.3,1.5,s.open));}
  // A slightly wavy, translucent margin.
  rho*=1.+.035*q*q*sin(a*7.+s.rc*900.);
  z+=s.rc*.018*q*q*sin(a*28.);
 }else{float q=(w-.62)/.38;rho=mix(s.rc*.98,s.rs,q);z=mix(s.zApex-s.capH*.97,s.zApex-s.capH*.34,pow(q,.8));
  z-=s.rc*.035*sin(3.14159*q)*(.5+.5*cos(a*28.));}
 return s.top+myRotate(vec3(cos(a)*rho,sin(a)*rho,z),s.axis,s.tilt);
}
`;

const vertex = `#version 300 es
precision highp float;
precision highp int;
${attributes}
${uniforms}
${varyings("out")}
float sq(float x){return x*x;}
${common}
${mushroomGlsl}
vec3 eye,R,U,F;
vec4 project(vec3 p){
 vec3 q=p-eye;float depth=dot(q,F);
 vec2 xy=vec2(dot(q,R),dot(q,U))*myLens()*2./myFit();
 const float n=.004,fa=4.;
 return vec4(xy,depth*(fa+n)/(fa-n)-2.*fa*n/(fa-n),depth);
}
vec2 wrapOffset(vec2 centre){return MY_L*floor((eye.xy-centre)/MY_L+.5);}
void hide(){gl_Position=vec4(2.,2.,2.,1.);v_kind=-1;v_a=v_b=v_c=vec4(0.);v_world=vec3(0.);v_normal=vec3(0.,0.,1.);}
float leafWidth(float u,float lobes){float s=sin(3.14159265*clamp(u,0.,1.));return pow(s,.75)*(1.+.12*lobes*sin(u*5.*3.14159265));}
vec3 leafPoint(float u,float vv){
 float w=leafWidth(u,a2.w)*a1.w*.32,across=vv*w;
 float z=a1.z+a2.y*across*across*9.+.004*a1.w*10.*sin(3.14159265*u)*.25;
 vec2 dir=vec2(cos(a2.x),sin(a2.x));
 vec2 xy=a1.xy+dir*(u-.5)*a1.w+vec2(-dir.y,dir.x)*across;
 return vec3(xy,z);
}
void main(){
 myCamera(eye,R,U,F);
 int flags=int(a5.w+.5),kind=flags>>8;
 v_kind=kind;v_a=vec4(0.);v_b=vec4(0.);v_c=vec4(0.);v_normal=vec3(0.,0.,1.);
 bool pool=a_instance>.5;
 if(pool&&kind!=0){hide();return;}
 float scale=u_resolution.y/1080.,lv=clamp(u_level,0.,1.);
 vec2 off=wrapOffset(a5.xy);
 int morph=myMorph();
 if(kind==0){
  vec3 P=a0.xyz,Q=a1.xyz;float side=a0.w;
  int order=flags&7;bool terminal=(flags&8)!=0,childless=(flags&16)!=0,tipEnd=(flags&32)!=0;
  float hh=a4.w;
  // Reveal: growth fronts (iteration keys) advance with development; fine
  // childless laterals forage (extend and retract) at an energy-rate clock.
  float reveal=mix(.56,1.02,myTide());
  float forage=(order>=2&&childless)?(.004+.02*lv)*sin(u_clock[3]+hh*MY_TAU):0.;
  float rh=reveal+forage;
  float qE=rh-a2.x,qO=rh-a2.z;
  float aE=a2.y;
  if(qE<0.){
   if(qO<=0.){hide();return;}
   float k=qO/(qO-qE);P=mix(Q,P,k);aE=mix(a2.w,a2.y,k);qE=0.;
  }
  // Cull whole segments (both endpoints agree), never single vertices.
  vec3 A=a0.xyz,B=a1.xyz;A.xy+=off;B.xy+=off;
  if(min(dot(A-eye,F),dot(B-eye,F))<.008||max(length(A-eye),length(B-eye))>1.15){hide();return;}
  P.xy+=off;Q.xy+=off;
  vec3 q=P-eye;float depth=dot(q,F),dist=length(q);
  float cordGain=(morph==0?1.35:morph==1||morph==4?.6:1.)*clamp(u_params[6],.7,1.9)/1.2;
  float cordGrow=(.25+.75*smoothstep(.1,1.4,myDev()))*cordGain*(1.+.25*myCity());
  float rTrue=max(${f(HAIR_RADIUS)}*(order==0?1.7:order==1?1.25:1.),a1.w*cordGrow*.85);
  float cord=smoothstep(.0005,.0026,rTrue);
  // Brightness is a field: dim felt, younger margin brighter, cords and
  // substrate-rich regions brighter; pruning dims fine hyphae toward City.
  float sub=mySubstrate(P.xy);
  float act=.6+1.1*smoothstep(.04,.34,sub);
  float young=smoothstep(rh-.22,rh,a2.x);
  float fineGain=morph==4?1.6:morph==1?1.35:morph==0?.7:1.;
  float vary=.3+1.2*sq(fract(hh*7.31+float(order)*.37));
  float I=(.36+.95*young)*vary*(order==0?1.25:1.)*fineGain;
  if(order>=2)I*=mix(mix(.3,1.,young),1.,myTide());
  I*=mix(1.,.38,myCity()*(1.-cord));
  I+=cord*(.45+.5*myCity())*cordGain;
  I*=act*mix(1.25,.8,lv);
  float under=max(0.,-P.z);
  vec3 rd=q/dist;
  float soil=exp(-under/max(.08,-rd.z)*24.);
  if(pool){
   // Light pool on the soil (or leaf) beneath the thread.
   vec2 t=a4.xy;float tl=length(t);vec2 n=tl>1e-4?vec2(-t.y,t.x)/tl:vec2(1.,0.);
   float w=.007+rTrue*4.+under*.9;
   vec3 G=vec3(P.xy+n*side*w,P.z>=0.?max(.0004,P.z-.0006):.0004);
   gl_Position=project(G);
   v_a=vec4(side,0.,I*(.16+.16*cord)*(P.z<0.?mix(1.,soil*2.,.5):1.),cord);
   v_b=vec4(a3.x,a3.y,a3.y,0.);
   v_c=vec4(qE,0.,0.,1.);
   v_world=G;
   return;
  }
  vec4 C=project(P),C2=project(P+a4.xyz*.003);
  vec2 res=u_resolution;
  vec2 s1=C.xy/C.w*res*.5,s2=C2.xy/max(C2.w,.001)*res*.5;
  vec2 dir=s2-s1;dir=length(dir)>1e-4?normalize(dir):vec2(1.,0.);
  vec2 perp=vec2(-dir.y,dir.x);
  float pxPerM=myLens()*res.y/(myFit().y*depth);
  float rPx=rTrue*pxPerM,minR=.78*scale;
  float rCore=max(rPx,minR),coverage=min(1.,rPx/minR);
  float spread=1.+under*90.;
  float W=(rCore*3.2+5.*scale)*spread;
  C.xy+=perp*side*W*2./res*C.w;
  gl_Position=C;
  float near=smoothstep(.01,.045,depth);
  // Rhythm wave source: one of three colonies per event.
  int src=int(mod(u_rhythmCount.y,3.));
  float dWave=src==0?a3.y:src==1?a3.z:a3.w;
  v_a=vec4(side*W,rCore,I*mix(coverage,1.,.35)*near,cord);
  v_b=vec4(a3.x,a3.y,dWave,1./pxPerM);
  v_c=vec4(qE,tipEnd?1.:0.,under,0.);
  v_world=P;
  v_normal=vec3(soil,young*(order>=1?1.:.5),dist);
  return;
 }
 if(kind==1){
  // Leaf lamina: curled, lying on the soil, wrapped to the nearest copy.
  float u=a0.x,vv=a0.y;
  vec3 P=leafPoint(u,vv),Pu=leafPoint(u+.02,vv),Pv=leafPoint(u,vv+.05);
  P.xy+=off;Pu.xy+=off;Pv.xy+=off;
  vec3 N=cross(Pu-P,Pv-P);N=dot(N,N)>1e-16?normalize(N):vec3(0.,0.,1.);if(N.z<0.)N=-N;
  if(length(vec3(a1.xy+off,a1.z)-eye)>1.2){hide();return;}
  gl_Position=project(P);
  v_a=vec4(u,vv,a2.z,a2.w);v_b=vec4(a4.w,a2.y,a1.w,0.);
  v_world=P;v_normal=N;
  return;
 }
 if(kind==5){
  // Twig: a gently bent bark cylinder lying on the soil (CPU mirror drapes hyphae).
  float a=a0.x*MY_TAU,v=a0.y;
  vec2 dir=vec2(cos(a2.x),sin(a2.x)),side=vec2(-dir.y,dir.x);
  float u=v-.5,r=a1.z*(1.-.35*pow(abs(2.*u),4.));
  vec2 c=a1.xy+off+dir*u*a1.w+side*a2.y*a1.w*u*u;
  vec3 N=normalize(vec3(side*cos(a),sin(a)));
  vec3 P=vec3(c,a1.z)+N*r;
  if(length(vec3(a1.xy+off,0.)-eye)>1.25){hide();return;}
  gl_Position=project(P);
  v_a=vec4(a0.x,v,a2.z,a2.w);v_world=P;v_normal=N;
  return;
 }
 if(kind==2){
  if((flags&1)==0){hide();return;}
  Shroom s=myShroom(a1,a2,a4);
  if(s.prim<=0.){hide();return;}
  s.base.xy+=off;s.top.xy+=off;
  if(length(s.base-eye)>1.25){hide();return;}
  float a=a0.x*MY_TAU;int j=int(a0.y*${STEM_RINGS + CAP_RINGS}.+.5);
  vec3 P,Pa,Pw;float w;float part;
  const float da=.04;
  if(j<=${STEM_RINGS}){
   float t=float(j)/${STEM_RINGS}.;w=t;part=0.;
   P=myStem(s,t,a);Pa=myStem(s,t,a+da);Pw=myStem(s,min(t+.04,1.),a);
   if(t>.99)Pw=P+vec3(0.,0.,.001);
  }else{
   w=float(j-${STEM_RINGS + 1})/${CAP_RINGS - 1}.;part=w<.62?1.:2.;
   P=myCap(s,w,a);Pa=myCap(s,w,a+da);Pw=myCap(s,min(w+.03,1.),a);
   if(w>.99)Pw=myCap(s,w-.03,a)*2.-P;
  }
  vec3 N=cross(Pa-P,Pw-P);N=dot(N,N)>1e-16?normalize(N):vec3(0.,0.,1.);
  vec3 c=part<.5?s.base+vec3(s.lean*s.bend*s.h*w*w,s.h*w):s.top+myRotate(vec3(0.,0.,s.zApex-s.capH*.5),s.axis,s.tilt);
  if(dot(N,P-c)<0.)N=-N;
  gl_Position=project(P);
  float flare=myPulses(a3.x,a3.x)*1.4+mySignal(a3.x)*3.5;
  float hitSite=float(abs(a3.y-mod(u_rhythmCount.z,15.))<.5)*u_rhythm.z;
  v_a=vec4(a0.x,w,part,s.g);
  v_b=vec4(flare+hitSite*1.5,s.prim,a4.w,float(s.species));
  v_world=P;v_normal=N;
  return;
 }
 // Billboards: spores (from gills or free motes) and lantern glow.
 vec2 corner=a0.xy;float sub=a0.w;
 if(sub<.5){hide();return;}
 vec3 C;float size,bright;
 if(kind==3&&sub>1.5){
  // Free motes drifting over the floor: periodic whole-cycle paths.
  float h=a3.z,k=a3.w;
  float T=31.+17.*k,ph=fract(u_time/T+h);
  C=vec3(a1.xy+.03*vec2(sin(MY_TAU*ph+h*9.),cos(MY_TAU*ph*2.+k*7.)),.004+.17*fract(h*7.13+ph));
  C.xy+=wrapOffset(C.xy);
  float dens=(morph==3?1.:.45)*(.25+.75*lv);
  bright=.10*sin(3.14159*ph)*float(a4.x<dens);
  size=.0007;
 }else{
  Shroom s=myShroom(a1,a2,a4);
  s.top.xy+=off;s.base.xy+=off;
  if(kind==4){
   C=s.top+myRotate(vec3(0.,0.,s.zApex-s.capH*.7),s.axis,s.tilt);size=s.rc*5.;
   bright=.022*s.g*s.g*(1.+myPulses(a3.x,a3.x)*1.5+mySignal(a3.x)*3.);
  }else{
   float h=a3.z,k=a3.w;
   float T=8.+6.*a4.x,ph=fract(u_time/T+h);float age=ph*T;
   float rho=s.rc*.85*sqrt(fract(h*13.7));float ang=k*MY_TAU;
   vec3 start=s.top+myRotate(vec3(cos(ang)*rho,sin(ang)*rho,s.zApex-s.capH*.8),s.axis,s.tilt);
   float puff=float(abs(a3.y-mod(u_rhythmCount.z,15.))<.5)*u_rhythm.z;
   vec2 wind=vec2(.0055,.0022)+vec2(cos(ang),sin(ang))*(.0015+.012*puff);
   C=start+vec3(wind*age+.004*vec2(sin(age*.9+h*20.),cos(age*.7+k*20.)),-(.0035+.003*fract(h*5.))*age);
   float dens=smoothstep(1.55,1.95,myDev())*(.15+.85*lv)*(morph==2?1.:.85);
   bright=.45*sin(3.14159*ph)*float(a4.x<dens)*step(.004,C.z)*smoothstep(.5,.8,s.g)*(1.+2.*puff);
   size=.0007;
  }
 }
 if(bright<=0.){hide();return;}
 vec3 q=C-eye;float depth=dot(q,F),dist=length(q);
 if(depth<.01||dist>1.15){hide();return;}
 float pxPerM=myLens()*u_resolution.y/(myFit().y*depth);
 float px=max(size*pxPerM,1.3*scale);
 if(kind==3)bright*=min(1.,size*pxPerM/(1.3*scale)+.35);
 vec4 P=project(C);
 P.xy+=corner*px*2./u_resolution*P.w;
 gl_Position=P;
 v_a=vec4(corner,bright*myFog(dist),float(kind));
 v_world=C;
}`;

const fragment = `#version 300 es
precision highp float;
precision highp int;
${uniforms}
${varyings("in")}
out vec4 outColor;
float sq(float x){return x*x;}
${common}
vec3 ramp(float I){
 vec3 c=mix(u_secondary,u_primary,smoothstep(.02,.3,I))*I;
 c=mix(c,u_accent*I,smoothstep(.9,2.6,I)*.5);
 return c+vec3(max(0.,I-2.6)*.12);
}
void main(){
 vec3 eye,R,U,F;myCamera(eye,R,U,F);
 vec3 rd=normalize(v_world-eye);float dist=length(v_world-eye);
 float lv=clamp(u_level,0.,1.);
 if(v_kind==0){
  float cord=v_a.w;
  float pulse=myPulses(v_b.x,v_b.y)*(1.3+2.2*cord)*(1.+.4*clamp(u_params[7],0.,1.)*u_low);
  float e=clamp(u_rhythm.y,0.,1.);
  float front=(1.-e)*.85;
  float wave=(exp(-sq((v_b.z-front)/.075))+.35*step(v_b.z,front)*exp(-max(0.,front-v_b.z)/.12))*smoothstep(0.,.1,e)*(.8+1.5*cord);
  float I=v_a.z;
  float signal=mySignal(v_b.x);
  float P=pulse*2.2+wave*3.+signal*(2.8+2.*cord);
  if(v_c.w>.5){
   // Light pool on the soil.
   float g=exp(-3.5*v_a.x*v_a.x)*(1.-smoothstep(.75,1.,abs(v_a.x)));
   vec3 c=mix(u_secondary,u_primary,.25+.5*cord)*I*(1.+P)*g;
   outColor=vec4(c*myFog(dist),0.);return;
  }
  float x=abs(v_a.x),r=v_a.y;
  float core=1.-smoothstep(r-.7,r+.7,x);
  float tube=sqrt(max(0.,1.-sq(x/max(r,1.))));
  float halo=exp(-x/(r*.8+2.2*u_resolution.y/1080.));
  // Braided rhizomorph strands with cytoplasmic streaming along the cord.
  float fibre=1.;
  if(r>2.4){
   float along=v_b.x;float braid=0.;
   for(int k=0;k<5;k++){float o=.62*sin(MY_TAU*(along*18.+float(k)*.2)+float(k)*1.3);braid+=exp(-sq((v_a.x/r-o)/.16));}
   float stream=.65+.35*sin(MY_TAU*40.*(along-u_clock[2]));
   fibre=mix(1.,(.18+.9*clamp(braid,0.,1.2))*stream,smoothstep(2.4,7.,r));
  }
  float profile=core*(.22+.78*tube)*fibre+halo*.25;
  // Growing tips and finished apices.
  float tip=exp(-sq(v_c.x/.0035))+smoothstep(.75,1.,v_c.y);
  float flareX=clamp(u_rhythm.x/.6,0.,1.);
  float glint=exp(-sq((v_c.x-(1.-flareX)*.03)/.004))*flareX;
  float tipI=(tip*(.9+2.6*flareX)+glint*1.2)*v_a.z/max(.06,v_a.z)*.55;
  // Palette ramp: dim felt leans secondary, lit threads primary.
  vec3 base=mix(u_secondary,u_primary,smoothstep(.05,.32,I))*I;
  vec3 c=base*profile;
  // Fuzzy margin: fine slanted side hairs on young hyphae, faded before aliasing.
  float young=v_normal.y,mpp=v_b.w;
  float acrossM=x*mpp,hp=v_b.x*700.-acrossM*900.;
  float fw=fwidth(hp);
  if(young>.02){
   float fr=abs(fract(hp)-.5);
   float hair=(1.-smoothstep(.06,.06+fw*1.5+.04,fr))*exp(-acrossM/.0012)*step(r+.5,x);
   hair*=step(.4,fract(sin(floor(hp)*12.9898+v_b.y*7.)*43758.5))*(1.-smoothstep(.35,.8,fw));
   c+=mix(u_secondary,u_primary,.7)*I*hair*young*.9;
  }
  // Pulses: a soft head heating from primary to accent, near-white only at
  // the hottest core.
  float heat=smoothstep(1.6,3.2,P);
  c+=mix(mix(u_primary,vec3(1.),.15),u_accent,heat*.6)*(.1+I)*P*profile*1.2;
  c+=u_accent*signal*profile*(.3+I)*1.2;
  c+=mix(u_primary,u_accent,.5)*tipI*core*1.6+u_accent*tipI*halo*.2;
  // Seen through translucent soil: dimmer, wider, cooler with depth.
  float soil=v_normal.x;
  c=mix(c,u_secondary*dot(c,vec3(.4)),.8*(1.-soil))*mix(soil,1.,.3)*(1.-.5*core*(1.-soil));
  outColor=vec4(c*myFog(dist),0.);return;
 }
 if(v_kind==1){
  float u=v_a.x,vv=v_a.y,glow=v_a.z;
  // Skeleton veins: midrib plus pinnate secondaries; decay holes show the floor.
  float mid=abs(vv);
  float sec=abs(fract((u-mid*mid*.5-mid*.25)*6.+v_b.x*3.+.08*sin(u*17.))-.5);
  float vein=max(1.-smoothstep(.0,.06,mid),1.-smoothstep(.0,.07,sec))*smoothstep(1.,.75,mid);
  vec3 N=normalize(v_normal+vec3(0.,0.,1e-5));
  vec3 key=normalize(vec3(-.35,.45,.8));
  float diff=max(0.,dot(N,key));
  float edge=smoothstep(.6,1.,mid)+smoothstep(.85,1.,abs(u*2.-1.));
  // Dark litter silhouettes: a faint translucent glow through the lamina
  // where hyphae run beneath, darker veins, and a network-lit rim.
  vec3 c=u_secondary*(.002+.006*diff);
  float back=glow*(.4+.6*myTide())*(1.-.6*vein);
  c+=mix(u_secondary,u_primary,.4)*back*.035;
  c+=mix(u_secondary,u_primary,.55)*pow(edge,2.)*(.15+glow)*.09;
  float near=smoothstep(.03,.12,dist);
  c*=mix(.35,1.,near);
  float fg=myFog(dist);
  outColor=vec4(mix(myMist(rd),c,fg),1.);return;
 }
 if(v_kind==5){
  vec3 N=normalize(v_normal);
  float glow=v_a.z,bark=.6+.4*sin(v_a.y*140.+sin(v_a.x*MY_TAU*3.)*2.+v_a.w*30.);
  vec3 c=u_secondary*(.004+.012*max(0.,dot(N,normalize(vec3(-.35,.45,.8)))))*bark;
  // Underside and flanks catch the network glow from the soil.
  c+=mix(u_secondary,u_primary,.45)*glow*.07*pow(clamp(1.-N.z,0.,1.),1.5)*(.6+.4*myTide());
  c+=mix(u_secondary,u_primary,.5)*pow(1.-abs(dot(N,-rd)),4.)*glow*.06;
  outColor=vec4(mix(myMist(rd),c,myFog(dist)),1.);return;
 }
 if(v_kind==2){
  float a=v_a.x*MY_TAU,w=v_a.y,part=v_a.z,g=v_a.w,flare=v_b.x,prim=v_b.y,open=v_b.w;
  vec3 N=normalize(v_normal+vec3(0.,0.,1e-5)),V=-rd;
  float ndv=abs(dot(N,V));
  float rim=pow(1.-ndv,3.);
  float glowLevel=(.45+.55*g)*(.35+.65*prim)*(1.+flare);
  float gillN=28.+8.*floor(v_b.z*3.);
  float gw=fwidth(a*gillN);
  float ridge=mix(.5+.5*cos(a*gillN),.5,smoothstep(.4,1.2,gw));
  ridge=ridge*ridge;
  vec3 capColour=v_b.z<.58?u_secondary:u_primary;
  vec3 c;
  if(part<.5){
   // Slender translucent stem, brighter at the base where cords arrive.
   // Slender translucent stem: dim core, glowing silhouette edges.
   float key=max(0.,dot(N,normalize(vec3(-.35,.45,.8))));
   c=capColour*(.028+.085*key)+capColour*pow(1.-ndv,2.)*.3+u_primary*.28*exp(-w*14.);
  }else if(part<1.5){
   // Bell cap: thin translucent margin glows, gills show through it.
   float q=w/.62,thin=smoothstep(.2,1.,q);
   float through=mix(1.,.9+.1*ridge,thin);
   vec3 flesh=capColour;
   // Thick flesh at the crown is dim; the thin margin transmits the gill glow.
   float stri=.5+.5*cos(a*gillN+q*3.);
   float key=max(0.,dot(N,normalize(vec3(-.35,.45,.8))));
   c=flesh*(.08+.12*key+.72*pow(thin,2.2))*(.65+.35*stri*thin);
   c+=capColour*rim*(.08+.65*thin);
   c+=u_primary*smoothstep(.92,1.,q)*.35;
  }else{
   // Gills from below: the brightest structure, ridged lamellae.
   float q=(w-.62)/.38;
   float attachment=1.-.7*smoothstep(.65,1.,q);
   c=capColour*(.45+1.8*ridge)*(.65+.35*(1.-q))*attachment;
   c+=u_primary*.25*pow(1.-q,4.);
  }
  c*=glowLevel;
  c=mix(c,mix(c,u_accent*dot(c,vec3(.4)),.5),clamp(flare*.4,0.,.45));
  c=c/(1.+.35*max(max(c.r,c.g),c.b));
  c+=u_primary*(1.-smoothstep(.0,.35,g))*prim*.4;
  float fg=myFog(dist);
  outColor=vec4(mix(myMist(rd),c,fg),1.);return;
 }
 // Billboards.
 float r2=dot(v_a.xy,v_a.xy);
 float disc=v_a.w>3.5?exp(-r2*4.5)*(1.-smoothstep(.5,1.,r2)):exp(-r2*4.)*(1.-smoothstep(.6,1.,r2));
 vec3 c=v_a.w>3.5?mix(u_primary,u_accent,.2):mix(u_primary,vec3(1.),.35);
 outColor=vec4(c*disc*v_a.z,0.);
}`;

const backdrop = `
uniform float u_clock[4];
${common}
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
// Value noise periodic on the floor so the camera's lap wrap is seamless.
float pnoise(vec2 p,float period){
 vec2 i=floor(p),fr=fract(p);fr=fr*fr*(3.-2.*fr);
 float a=hash21(mod(i,period)),b=hash21(mod(i+vec2(1.,0.),period));
 float c=hash21(mod(i+vec2(0.,1.),period)),d=hash21(mod(i+vec2(1.,1.),period));
 return mix(mix(a,b,fr.x),mix(c,d,fr.x),fr.y);
}
void main(){
 vec2 p=(v_uv-.5)*myFit()/myLens();
 vec3 eye,R,U,F;myCamera(eye,R,U,F);
 vec3 rd=normalize(F+p.x*R+p.y*U);
 vec3 col=myMist(rd);
 // Distant trunks and buttress roots in the mist give the floor its scale.
 float az=atan(rd.y,rd.x),ph=u_clock[0];
 float trunk=0.,trunkRim=0.;
 for(int k=0;k<6;k++){
  float fk=float(k);
  float c=fk*1.047+.4*sin(fk*2.3)+.18*sin(MY_TAU*ph+fk);
  float wdt=(.045+.05*fract(fk*.618))*(1.+1.6*exp(-max(rd.z,0.)*14.));
  float d=abs(mod(az-c+3.14159,MY_TAU)-3.14159);
  float m=(1.-smoothstep(wdt*.55,wdt,d))*.7;
  trunk=max(trunk,m*step(-.03,rd.z));
  trunkRim+=exp(-sq((d-wdt)/(wdt*.12)))*step(-.03,rd.z);
 }
 trunk*=.25+.75*myCity();
 col=mix(col,col*.35,trunk);
 col+=u_secondary*.018*trunkRim*exp(-max(rd.z,0.)*3.);
 // Faint slanted moonbeams between the trunks.
 float beam=pow(max(0.,sin(az*5.+rd.z*6.+1.)),30.)*smoothstep(-.05,.35,rd.z)*(1.-trunk);
 col+=u_secondary*beam*.03;
 float t=-eye.z/min(rd.z,-.0005);vec3 h=eye+rd*t;
 float fw=length(fwidth(h.xy/MY_L*480.));
 if(rd.z<-.0005){
  float n=pnoise(h.xy/MY_L*480.,480.)*.6+pnoise(h.xy/MY_L*160.,160.)*.4;
  n=mix(n,.5,smoothstep(.3,1.,fw));
  float sub=mySubstrate(h.xy);
  vec3 ground=u_secondary*(.007+.016*n*n)+mix(u_secondary,u_primary,.35)*smoothstep(.06,.36,sub)*.035;
  ground+=u_secondary*.02*pow(n,6.)*(1.-smoothstep(.2,1.,fw));
  col=mix(col,ground,myFog(t));
 }
 outColor=vec4(col,1.);
}`;

const schema = [
  {
    key: "development",
    label: "Development · understory / tide / city",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "speed",
    label: "Pulse and flight speed",
    min: 0.25,
    max: 1,
    step: 0.01,
    default: 0.72,
  },
  {
    key: "injection",
    label: "Substrate feed",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.35,
  },
  {
    key: "composition",
    label: "Mycelium morphology",
    min: 0,
    max: 5,
    step: 1,
    default: 5,
  },
  {
    key: "relief",
    label: "Fruiting body scale",
    min: 0.3,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "altitude",
    label: "Camera altitude",
    min: 0.7,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
  {
    key: "contrast",
    label: "Cord hierarchy",
    min: 0.7,
    max: 1.9,
    step: 0.01,
    default: 1.2,
  },
  {
    key: "audio",
    label: "Audio influence",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
  },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    speed: 0.72,
    injection: 0.35,
    composition: 5,
    relief: 1,
    altitude: 1,
    contrast: 1.2,
    audio: 0.3,
    ...params,
  },
});
export default {
  id: "mycelium",
  number: 99,
  name: "Living Mycelium",
  description:
    "A seeded hyphal network grows, fuses into loops and carries nutrient pulses along its shortest paths over a living reaction–diffusion substrate. Development thickens Murray-law cords and fruits luminous mushrooms at their ends, without resetting the field.",
  development: "development",
  schema,
  presets: [
    look("Hyphal Understory", 211, 0),
    look("Tidal Lamellae", 211, 1),
    look("Lantern City", 211, 2),
    look("Spore Floor", 101, 0.35, {
      composition: 3,
      altitude: 0.8,
    }),
    look("Night Membrane", 149, 1, {
      composition: 4,
      contrast: 0.9,
      speed: 0.5,
    }),
    look("Tide Turning", 41, 1.5, { composition: 1, altitude: 1.3 }),
    look("Street Plan", 18, 2, { composition: 0, altitude: 1.4, relief: 0.6 }),
    look("Bloom Quarter", 73, 1.8, {
      composition: 2,
      injection: 0.5,
      contrast: 1.45,
      altitude: 0.85,
      relief: 1.3,
    }),
  ],
  stage: ["speed", "relief", "altitude"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    speed: [0.35, 1],
    injection: [0.1, 0.8],
    contrast: [0.9, 1.6],
    audio: [0.1, 0.8],
  },
  beat: { punch: 0.4, pulse: 0.8, inject: 1 },
  clocks: [
    // 0: camera laps (period 1); 1: pulse metres (λ ∈ {1, ½, ⅓});
    // 2: cord streaming; 3: foraging phase (2π).
    {
      rate: (p, level) => ((0.75 + 0.6 * p[1]) * (0.75 + 0.5 * level)) / 150,
      period: 1,
    },
    {
      rate: (p, level) => (0.04 + 0.09 * p[1]) * (0.7 + 0.6 * level),
      period: 1,
    },
    { rate: (p) => 0.012 + 0.03 * p[1], period: 1 },
    { rate: (p, level) => 0.06 + 0.22 * level, period: 2 * Math.PI },
  ],
  rhythmStyles: {
    restrained: "Dormant threads",
    driving: "Root signals",
    accented: "Spore chorus",
  },
  rhythm: [
    familyEffect(
      "reaction-front",
      0,
      "Hyphal tip flare",
      "Flash every growing hyphal tip and send a glint back along its thread.",
      {
        period: 4,
        strength: 0.8,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X.....x. | ....x...",
            division: 2,
            strength: 0.65,
            duration: 0.8,
          },
          driving: {
            steps: "X.x.X..x | X.x.X.x.",
            division: 2,
            strength: 0.9,
            duration: 0.45,
          },
          accented: {
            steps: "X..x..x.X..x.x.. | X.x..x..X..x..xx",
            division: 4,
            strength: 1,
            duration: 0.35,
          },
        },
      },
    ),
    familyEffect(
      "chemical-band",
      1,
      "Nutrient wave",
      "Send one geodesic nutrient front from a colony through the whole network.",
      {
        period: 8,
        strength: 0.8,
        steps: "X.......",
        duration: 1.2,
        styles: {
          restrained: {
            steps: "...x.... | ......X.",
            division: 2,
            strength: 0.6,
            duration: 1.3,
          },
          driving: {
            steps: "..X...x. | ...X...x",
            division: 2,
            strength: 0.85,
            duration: 1.1,
          },
          accented: {
            steps: "...X.......x.... | ......X......x..",
            division: 4,
            strength: 1,
            duration: 0.85,
          },
        },
      },
    ),
    familyEffect(
      "feed",
      2,
      "Local chemical feed",
      "Inject a bounded feed patch into the living substrate; fruiting clusters puff spores.",
      {
        period: 16,
        strength: 0.8,
        duration: 0.5,
        kind: "simulation",
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | ........ | ......X.",
            division: 2,
            strength: 0.55,
            duration: 0.6,
          },
          driving: {
            steps: "........ | ......x. | ........ | .......X",
            division: 2,
            strength: 0.9,
            duration: 0.6,
          },
          accented: {
            steps:
              "................ | ............x... | ................ | ..........X...x.",
            division: 4,
            strength: 1,
            duration: 0.45,
          },
        },
      },
    ),
    familyEffect(
      "signal-relay",
      3,
      "Signal relay",
      "A nutrient signal races along branching cords and lights the gills as it arrives.",
      {
        strength: 0.85,
        duration: 2.4,
        styles: {
          restrained: {
            steps: "X....... | .......x | ........ | ........",
            division: 2,
            strength: 0.65,
            duration: 3,
          },
          driving: {
            steps: "X....... | ........ | ..X..... | .......x",
            division: 2,
            strength: 0.9,
            duration: 2.2,
          },
          accented: {
            steps:
              "X............... | ..............x. | ........X....... | ............X...",
            division: 4,
            strength: 1,
            duration: 1.8,
          },
        },
      },
    ),
  ],
  fragment: backdrop,
  geometry: {
    create: (seed) => myceliumMesh(seed).data,
    attributes: [4, 4, 4, 4, 4, 4],
    instances: { create: () => new Float32Array([0, 1]), attributes: [1] },
    additiveFrom: OPAQUE_VERTICES,
    vertex,
    fragment,
  },
  simulation: {
    continuity: "gray-scott-uv16-v1",
    fragment: simulationFragment,
    size: [320, 192],
    steps: 8,
    filter: "linear",
  },
};
