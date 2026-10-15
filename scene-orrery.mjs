import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";
import { ATTRIBUTES, createGeometry } from "./orrery-model.mjs";

const common = `
#define TAU 6.28318530718
float ss(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
float drive(){
#ifdef PHOSPHOR_LATE
 return u_clock[0];
#else
 return u_time*.065*u_params[1];
#endif
}
float cameraPhase(){
#ifdef PHOSPHOR_LATE
 return u_clock[1];
#else
 return u_time*.035*u_params[2];
#endif
}
void rig(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float d=clamp(u_params[0],0.,2.),o=ss(0.,1.,d),h=ss(1.,2.,d),a=cameraPhase();
 eye=vec3(2.1+1.15*sin(a),-2.4+.5*cos(a)+2.6*h,6.9+2.*o-3.3*h+1.7*h*sin(a));
 vec3 target=vec3(.12*cos(a),.1-.9*h,-.5-4.5*h);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0.,1.,0.)));U=cross(R,F);
}
float focal(){return 1.42*u_params[5]*(1.+.018*clamp(u_kick,0.,1.));}
vec3 fogColor(){return mix(u_primary,u_secondary,.7)*.009;}
`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec3 a_center;
layout(location=3) in vec4 a_motion;
layout(location=4) in vec4 a_surface;
uniform float u_time,u_seed,u_level,u_kick;
uniform float u_params[8];
uniform vec2 u_resolution;
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmCount;
${lateClockGlsl}
${common}
out vec3 v_p,v_n,v_local;
out vec4 v_surface;
flat out vec3 v_tag;
void main(){
 float dev=clamp(u_params[0],0.,2.),opening=ss(0.,1.,dev),hall=ss(1.,2.,dev);
 float kind=a_motion.z,group=a_motion.w;
 bool mirror=group<0.;if(mirror)group=-group-10.;
 vec3 p=a_position,n=a_normal,C=a_center;
 float angle=a_motion.x*drive()+a_motion.y;
 // Every shaft uses the same integrated drive. No kick can shear a mesh.
 if(kind>2.5)angle=.12*sin(drive()*12.)+.10*clamp(u_kick+u_rhythm.x,0.,1.);
 float c=cos(angle),s=sin(angle);
 p.xy=mat2(c,s,-s,c)*p.xy;n.xy=mat2(c,s,-s,c)*n.xy;
 float growth=1.;
 if(group==1.){
   growth=ss(.06,.85,dev);p*=growth;
   C.z*=growth;
   // The orbit platform tilts as a real rigid body, not a screen overlay.
   float tilt=(.72+.08*sin(a_surface.z))*opening*u_params[4];
   p.yz=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*p.yz;
   n.yz=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*n.yz;
 }else if(group>=50.){
   growth=.01+.99*hall;p*=growth;C.z-=14.*(1.-hall);
 }else if(group>=2.){
   growth=.02+.98*ss(1.,1.95,dev);
   // Whole trains grow together: centre distances and teeth stay meshed.
   float side=mod(group-2.,3.);
   vec2 anchor=side<.5?vec2(-8.5,0.):side<1.5?vec2(8.5,0.):vec2(0.,9.);
   float upper=side>1.5?.65:1.;
   C.xy=anchor+(C.xy-anchor)*growth*upper;
   C.xy*=.76;
   p*=growth*.76*upper;
   vec3 rel=vec3(C.xy-anchor*.76,0.);
   float turn=side<.5?.5:side<1.5?-.5:0.;
   mat2 rot=mat2(cos(turn),sin(turn),-sin(turn),cos(turn));
   rel.xz=rot*rel.xz;p.xz=rot*p.xz;n.xz=rot*n.xz;
   C.xy=anchor*.76+rel.xy;C.z+=rel.z;
   if(side>1.5)C.y-=3.*hall;
   C.xy+=anchor*(1.-hall)*1.3;
   C.z-=14.*(1.-hall);
 }
 if(group==0.){float scale=1.-.16*opening;p*=scale;C.xy*=scale;}
 if(group<2.)C.z-=4.*hall;
 p+=C;
 if(mirror){p.y=-11.-p.y;n.y=-n.y;}
 v_local=a_position;v_p=p;v_n=n;
 v_surface=a_surface;
 float cohort=1.-step(.5,abs(mod(a_surface.z+floor(u_rhythmCount.y),9.)-4.));
 v_tag=vec3(kind,mirror?-1.:group,cohort);
 vec3 eye,R,U,F;rig(eye,R,U,F);
 vec3 q=p-eye;vec3 view=vec3(dot(q,R),dot(q,U),dot(q,F));
 float A=u_resolution.x/u_resolution.y,f=focal();
 gl_Position=vec4(view.x*f/max(A,1.),view.y*f*min(A,1.),(view.z*(100.+.05)-2.*100.*.05)/(100.-.05),view.z);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_p,v_n,v_local;
in vec4 v_surface;
flat in vec3 v_tag;
uniform float u_time,u_kick;
uniform float u_params[8];
uniform vec2 u_resolution;
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmCount;
${lateClockGlsl}
${common}
out vec4 outColor;
void main(){
 vec3 eye,R,U,F;rig(eye,R,U,F);
 vec3 N=normalize(v_n),V=normalize(eye-v_p);
 if(dot(N,V)<0.)N=-N;
 vec3 L=normalize(vec3(-4.,6.,8.)-v_p*.12),H=normalize(L+V);
 float nl=max(dot(N,L),0.),nv=max(dot(N,V),0.);
 vec3 reflection=reflect(-V,N);
 // Large studio cards reflected in polished metal, with narrow white
 // edges, not flat yellow Lambert shading. The palette owns the alloy.
 float card=pow(max(0.,1.-abs(dot(reflection,normalize(vec3(-.5,.8,.3))))),9.);
 float strip=pow(max(0.,1.-abs(dot(reflection,normalize(vec3(.8,.2,.6))))),32.);
 float spec=pow(max(dot(N,H),0.),85.);
 float rim=pow(1.-nv,3.);
 float rad=length(v_local.xy)/max(v_surface.y,.001);
 float bearing=ss(.10,.32,rad)*ss(.72,.57,rad);
 float ao=.62+.38*ss(.1,.55,rad);
 float grooves=.88+.12*cos(rad*210.);
 // Subpixel machining grooves disappear analytically, never shimmer.
 float resolved=1.-ss(.012,.045,fwidth(rad));
 grooves=mix(1.,grooves,resolved*.35);
 vec3 metal=mix(u_secondary,mix(u_primary,vec3(1.),.12),.10+v_surface.w*.4);
 float softbox=.4+.6*pow(max(reflection.y*.6+reflection.z*.8,0.),2.);
 vec3 col=metal*(.14+.52*nl)*ao*grooves*(1.-.28*bearing);
 col+=metal*softbox*.24;
 col+=mix(metal,vec3(1.),.42)*(card*.65+strip*.85)*u_params[3];
 col+=mix(metal,vec3(1.),.85)*spec*1.8*u_params[3];
 col+=mix(u_primary,vec3(1.),.25)*rim*.32;
 float core=step(1.5,v_tag.x)*step(v_tag.x,2.5);
 float planet=step(.8,v_surface.w)*step(.5,v_tag.x)*step(v_tag.x,1.5);
 col=mix(col,metal*(.15+.5*nl)+vec3(1.)*spec*1.8,planet);
 col+=u_accent*planet*rim*.4;
 vec3 coreLight=mix(u_secondary,mix(u_primary,vec3(1.),.55),ss(.1,.95,nv));
 col=mix(col,coreLight*(.65+2.1*pow(nv,.7))*u_params[3],core);
 // Three local gestures: escapement, engaged tooth rims, ratio cohort.
 float tooth=ss(.86,.97,rad)*step(v_tag.x,.5);
 col+=u_accent*tooth*clamp(u_rhythm.x,0.,1.)*.55;
 col+=mix(u_secondary,vec3(1.),.3)*v_tag.z*clamp(u_rhythm.y,0.,1.)*tooth*.8;
 float front=length(v_p.xy)-(1.-clamp(u_rhythm.z,0.,1.))*14.;
 col+=u_accent*exp(-front*front*2.)*min(1.,u_rhythm.z*5.)*tooth*.6;
 float distance=length(eye-v_p);
 col=mix(fogColor(),col,exp(-max(distance-5.,0.)*.065));
 if(v_tag.y<0.)col*=.22+.14*pow(1.-abs(V.y),3.);
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
const fragment = `
${lateClockGlsl}
${common}
void main(){
 vec3 eye,R,U,F;rig(eye,R,U,F);
 float A=u_resolution.x/u_resolution.y;
 vec2 q=(v_uv-.5)*2.;
 vec3 rd=normalize(F+R*q.x*max(A,1.)/focal()+U*q.y/(min(A,1.)*focal()));
 vec3 col=fogColor();
 // Analytical dust-free scattering: a pool behind the core and long shafts
 // in the cathedral. Bounded closed form, no volume march or noise texture.
 float hall=ss(1.,2.,u_params[0]);
 vec3 core=vec3(0.,0.,.8-4.*hall);
 float tc=max(0.,dot(core-eye,rd));
 vec3 at=eye+tc*rd-core;
 col+=u_secondary*.11/(1.+dot(at,at)*.9);
 // Soft raking light in the long nave, evaluated at two depth planes.
 for(int i=0;i<2;i++){
  float z=-9.-float(i)*14.;float t=(z-eye.z)/rd.z;
  vec3 p=eye+max(t,0.)*rd;
  float shaft=exp(-pow((p.x+.31*p.y+3.4)/.6,2.))*exp(-abs(p.y-2.)*.19);
  col+=mix(u_primary,u_secondary,.55)*shaft*.065*hall*exp(-max(t,0.)*.016);
 }
 float vault=pow(max(0.,1.-abs(rd.x)*1.4),12.)*pow(max(rd.y,0.),1.4);
 col+=mix(u_secondary,u_primary,.3)*vault*.04*hall;
 if(rd.y<-.001){
  float t=(-5.5-eye.y)/rd.y;vec3 p=eye+rd*t;
  vec2 cell=p.xz*.35;vec2 edge=abs(fract(cell)-.5);
  vec2 fw=fwidth(cell);
  float seam=max(ss(.47-fw.x,.49,edge.x),ss(.47-fw.y,.49,edge.y));
  float pool=1./(1.+p.x*p.x*.12+p.z*p.z*.01);
  col+=u_secondary*.14*pool*exp(-t*.035)*(1.-.55*seam)*hall;
 }
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
const base = { speed: 1, glide: 1, polish: 1, tilt: 0.8, scale: 1 };
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
export default {
  id: "orrery",
  number: 109,
  name: "Brass Orrery",
  description:
    "Involute gears open into an exact-ratio planetary machine and a vast clockwork cathedral.",
  development: "development",
  schema: [
    {
      key: "development",
      label: "Development · gears / orrery / clockwork",
      min: 0,
      max: 2,
      step: 0.01,
      default: 0,
    },
    {
      key: "speed",
      label: "Gear drive",
      min: 0.2,
      max: 2,
      step: 0.01,
      default: 1,
    },
    {
      key: "glide",
      label: "Mechanism flight",
      min: 0,
      max: 2,
      step: 0.01,
      default: 1,
    },
    {
      key: "polish",
      label: "Metal polish",
      min: 0.4,
      max: 1.5,
      step: 0.01,
      default: 1,
    },
    {
      key: "tilt",
      label: "Orbital inclination",
      min: 0,
      max: 1.5,
      step: 0.01,
      default: 0.8,
    },
    {
      key: "scale",
      label: "Mechanism scale",
      min: 0.75,
      max: 1.2,
      step: 0.01,
      default: 1,
    },
  ],
  presets: [
    look("Gears", 10901, 0),
    look("Orrery", 10901, 1),
    look("Clockwork", 10901, 2),
    look("Watchmaker", 1776, 0.15, { scale: 1.08, speed: 0.6, glide: 0.45 }),
    look("Copernican Night", 1610, 1, { tilt: 1.5, glide: 0.6, speed: 0.7 }),
    look("Silver Escapement", 808, 0.65, {
      polish: 1.35,
      scale: 1.1,
      glide: 0.35,
    }),
    look("Sidereal Vault", 2401, 2, { scale: 0.86, speed: 0.8, glide: 0.8 }),
    look("Midnight Calibre", 73, 1.6, {
      scale: 1.12,
      tilt: 0.25,
      speed: 1.3,
      glide: 1.4,
    }),
  ],
  stage: ["speed", "glide", "polish"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { speed: { mul: [0.65, 1.35] }, glide: { mul: [0.75, 1.4] } },
  beat: { punch: 0.035, pulse: 0.025 },
  rhythm: [
    familyEffect(
      "escapement-tick",
      0,
      "Escapement tick",
      "The anchor rocks and the engaged involute tooth rims catch a local accent.",
      { period: 4, duration: 0.65, strength: 0.65 },
    ),
    familyEffect(
      "ratio-cohort",
      1,
      "Ratio cohort",
      "A persistent shaft cohort catches a white glint without changing its meshing speed.",
      { period: 8, duration: 2, strength: 0.7 },
    ),
    familyEffect(
      "clockwork-wave",
      2,
      "Clockwork wave",
      "A bounded light wave follows tooth rims out through the cathedral.",
      { period: 16, duration: 3.5, strength: 0.75 },
    ),
  ],
  // 56/24=7/3 and 56/40=7/5. A drive period of 30π completes
  // integer revolutions on every shaft and every integer orbital ratio.
  clocks: [
    { rate: (p) => 0.065 * p[1], period: 30 * Math.PI },
    { rate: (p) => 0.035 * p[2], period: 2 * Math.PI },
  ],
  fragment,
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    vertex,
    fragment: surface,
  },
};
