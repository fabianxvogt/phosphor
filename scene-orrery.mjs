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
 float hero=o-h;
 eye=vec3(1.8+.85*sin(a)-1.2*h-hero*(1.35+.3*sin(a)),-1.5+.35*cos(a)+1.9*h+1.8*hero,4.6+4.3*o-7.7*h+1.5*h*sin(a));
 // Aim at the sun, not behind the mechanism: the armillary stays centred.
 vec3 target=vec3(.1*cos(a)*(1.-hero),.1-.3*h-.1*hero,-.6-7.*h+1.95*hero);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0.,1.,0.)));U=cross(R,F);
}
float focal(){return 1.42*u_params[5]*(1.+.09*(ss(0.,1.,u_params[0])-ss(1.,2.,u_params[0])))*(1.+.018*clamp(u_kick,0.,1.));}
// Select the warm anchor *within* the active palette. Phosphor's brass is
// its yellow primary; Symbiosis' brass is its ochre secondary, never blue.
vec3 brass(){
 float p=dot(u_primary,vec3(1.,.35,-1.)),s=dot(u_secondary,vec3(1.,.35,-1.));
 return mix(u_secondary,u_primary,ss(-.06,.06,p-s)*.84+.08);
}
vec3 fogColor(){return u_secondary*(.001+.004*ss(1.,2.,u_params[0]));}
vec3 sunPosition(){return vec3(0.,0.,1.35*ss(.06,.85,u_params[0])-6.5*ss(1.,2.,u_params[0]));}
#ifndef ORRERY_VERTEX
// Integrate a narrow light sheet along the visible ray, clipped by the
// first solid surface. Unlike a background stripe it also veils near metal.
vec3 atmosphere(vec3 eye,vec3 rd,float distance){
 float hall=ss(1.,2.,u_params[0]);
 if(hall<.001)return vec3(0.);
 float len=min(distance,32.);
 float b=eye.x+.31*eye.y+3.4,k=rd.x+.31*rd.y;
 float safeK=abs(k)<.001?.001:k;
 float closest=clamp(-b/safeK,0.,len),miss=b+k*closest;
 // Bounded Lorentzian approximation to the sheet's ray integral. Avoid
 // two per-pixel atan calls and generate the dust as tiny depth-tested mesh.
 float sheet=.68/(abs(k)+.68/max(len,.001))/(1.+miss*miss*8.65);
 return mix(brass(),u_accent,.28)*hall*(.0008*len+.018*sheet);
}
#endif
float inclination(float id){return (.4+.85*mod(id,3.)/2.)*u_params[4];}
vec3 planetPosition(int i){
 float k=float(i),a=drive()*(i==4?6.:k+1.)+k*1.73;
 vec3 p=vec3(vec2(cos(a),sin(a))*(1.3+k*.49),.14);
 float tilt=inclination(k)*ss(0.,1.,u_params[0]);
 p.yz=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*p.yz;
 return sunPosition()+p*ss(.06,.85,u_params[0]);
}
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
uniform vec4 u_rhythm,u_rhythmCount,u_rhythmHit;
${lateClockGlsl}
#define ORRERY_VERTEX
${common}
out vec3 v_p,v_n,v_local;
out vec4 v_surface;
flat out vec3 v_tag,v_eye;
void main(){
 float dev=clamp(u_params[0],0.,2.),opening=ss(0.,1.,dev),hall=ss(1.,2.,dev);
 float kind=a_motion.z,group=a_motion.w;
 bool mirror=group<0.;if(mirror)group=-group-10.;
 vec3 p=a_position,n=a_normal,C=a_center;
 float angle=a_motion.x*drive()+a_motion.y;
 // Every shaft uses the same integrated drive. No kick can shear a mesh.
 if(kind>2.5&&kind<3.5)angle=(group==51.?.25:.12)*sin(drive()*12.)+.10*clamp(u_kick+u_rhythm.x,0.,1.)+.13*clamp(u_rhythm.w+u_rhythmHit.w,0.,1.)*(mod(floor(u_rhythmCount.w),2.)*2.-1.);
 float c=cos(angle),s=sin(angle);
 p.xy=mat2(c,s,-s,c)*p.xy;n.xy=mat2(c,s,-s,c)*n.xy;
 float growth=1.;
 if(group==1.){
   growth=ss(.06,.85,dev);p*=growth;
   C.z*=growth;
   // Independent, rigid inclinations turn the arms into an armillary sphere.
   float id=kind>4.5?a_motion.y/.85:kind>1.5?0.:(a_motion.y/1.73);
   float tilt=(kind>4.5?.28+.43*id:inclination(id))*opening;
   p.yz=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*p.yz;
   n.yz=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*n.yz;
   if(kind>4.5){
    float meridian=a_motion.y*1.23*opening;
    mat2 mr=mat2(cos(meridian),sin(meridian),-sin(meridian),cos(meridian));
    p.xz=mr*p.xz;n.xz=mr*n.xz;
   }
 }else if(group>=50.){
   growth=.001+.999*hall;p*=growth;C.z-=12.*(1.-hall);
 }else if(group>=2.){
   // Visible layered trains from frame one; the walls unfold and enclose us.
   float side=mod(group-2.,3.);
   vec2 anchor=side<.5?vec2(-8.5,0.):side<1.5?vec2(8.5,0.):vec2(0.,9.);
   growth=(.68+.32*hall)*(side>1.5?.86:1.);
   vec3 rel=vec3((C.xy-anchor)*growth,0.);p*=growth;
   float lean=group<4.?.3+.82*hall:.72+.4*hall;
   float turn=side<.5?lean:side<1.5?-lean:0.;
   mat2 rot=mat2(cos(turn),sin(turn),-sin(turn),cos(turn));
   rel.xz=rot*rel.xz;p.xz=rot*p.xz;n.xz=rot*n.xz;
   if(side>1.5){
    float roof=.86+.3*hall;
    mat2 rr=mat2(cos(roof),sin(roof),-sin(roof),cos(roof));
    rel.yz=rr*rel.yz;p.yz=rr*p.yz;n.yz=rr*n.yz;
   }
   float width=group<4.?4.6+1.2*opening:5.8;
   C.xy=(side<.5?vec2(-width,0.):side<1.5?vec2(width,0.):vec2(0.,5.5))+rel.xy;
   C.z+=rel.z-3.*opening*(1.-hall)+(group<4.?4.*(1.-opening):0.);
 }
 if(group==0.){float scale=1.-.12*opening;p*=scale;C.xy*=scale;C.z-=1.1*opening*(1.-hall);}
 if(group<2.)C.z-=6.5*hall;
 p+=C;
 vec3 eye,R,U,F;rig(eye,R,U,F);
 if(kind>5.5){
   float size=1.+.08*length(C-eye);
   p=C+vec3(.15*sin(drive()+a_motion.y),.2*cos(drive()+a_motion.y),0.)*hall
    +(R*a_position.x+U*a_position.y)*growth*size;
   n=-F;
 }
 if(mirror){p.y=-11.-p.y;n.y=-n.y;}
 v_local=a_position;v_p=p;v_n=n;
 v_surface=a_surface;v_eye=eye;
 float cohort=1.-step(.5,abs(mod(a_surface.z+floor(u_rhythmCount.y),9.)-4.));
 v_tag=vec3(kind,mirror?-1.:group,cohort);
 vec3 q=p-eye;vec3 view=vec3(dot(q,R),dot(q,U),dot(q,F));
 float A=u_resolution.x/u_resolution.y,f=focal();
 gl_Position=vec4(view.x*f/max(A,1.),view.y*f*min(A,1.),(view.z*(100.+.05)-2.*100.*.05)/(100.-.05),view.z);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_p,v_n,v_local;
in vec4 v_surface;
flat in vec3 v_tag,v_eye;
uniform float u_time,u_kick,u_level;
uniform float u_params[8];
uniform vec2 u_resolution;
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmCount;
${lateClockGlsl}
${common}
out vec4 outColor;
void main(){
 vec3 eye=v_eye;
 if(v_tag.x>5.5){
  float edge=1.-ss(.001,.01,length(v_local.xy));
  outColor=vec4(brass()*edge*.8*exp(-length(eye-v_p)*.035),1.);return;
 }
 vec3 N=normalize(v_n),V=normalize(eye-v_p);
 if(dot(N,V)<0.)N=-N;
 float rad=length(v_local.xy)/max(v_surface.y,.001);
 float resolved=1.-ss(.012,.045,fwidth(rad));
 // Lathe polishing: bounded normal variation, filtered before subpixel scale.
 vec3 tangent=normalize(vec3(v_local.xy+vec2(.00001),0.));
 N=normalize(N+tangent*.022*sin(rad*180.)*resolved*abs(N.z));
 vec3 L=normalize(vec3(-4.,6.,6.)-v_p*.08),H=normalize(L+V);
 float nl=max(dot(N,L),0.),nv=max(dot(N,V),0.);
 vec3 reflection=reflect(-V,N);
 // Directional environment cards. Empty directions stay dark, so bevels
 // and cylinders carry reflections instead of a uniform lavender fill.
 float card=pow(max(dot(reflection,normalize(vec3(-.7,.8,.45))),0.),12.);
 float strip=pow(max(dot(reflection,normalize(vec3(.8,.25,.6))),0.),64.);
 float ceiling=pow(max(dot(reflection,normalize(vec3(.1,1.,-.3))),0.),6.);
 float broad=pow(max(dot(reflection,normalize(vec3(-.15,.4,.9))),0.),3.);
 float spec=pow(max(dot(N,H),0.),110.);
 float rim=pow(1.-nv,4.);
 float ao=(.40+.60*ss(.17,.42,rad))*(.7+.3*ss(-.22,.28,v_local.z));
 float grooves=1.-resolved*.12*(.5+.5*cos(rad*210.));
 // Recessed bearing seats darken near contact; the bright lip above is
 // separate geometry, so this is occlusion rather than a painted outline.
 ao*=1.-.28*exp(-pow((rad-.255)/.045,2.))*ss(.4,.15,v_local.z);
 // Warm alloy and cool environment are distinct palette-owned materials.
 // The accent is blended into the alloy, never used as a flat pink fill.
 vec3 alloy=mix(brass(),u_accent,.30);
 vec3 metal=mix(alloy,u_secondary,min(.23,v_surface.w*.05));
 vec3 bright=mix(metal,vec3(1.),.16);
 vec3 col=metal*(.035+.18*nl)*ao*grooves;
 col+=mix(bright,u_secondary,.18)*(card*1.25+strip*2.2+ceiling*.18+broad*.22)*u_params[3]*ao*grooves;
 // Energy resolves a second scale of engraved dial indices, not exposure.
 float theta=atan(v_local.y,v_local.x);
 float aa=max(fwidth(theta)*48.,.012);
 float graduations=1.-ss(.10,.10+aa,abs(sin(theta*48.)));
 float dial=ss(.67,.69,rad)*(1.-ss(.74,.76,rad))*step(v_tag.x,.5);
 col*=1.-dial*.55;
 col+=mix(bright,u_secondary,.4)*dial*graduations*ss(.15,.8,u_level)*.85;
 col+=mix(metal,vec3(1.),.28)*spec*2.4*u_params[3];
 col+=mix(metal,u_primary,.18)*rim*.35;
 float core=step(1.5,v_tag.x)*step(v_tag.x,2.5);
 float planet=step(.8,v_surface.w)*step(.5,v_tag.x)*step(v_tag.x,1.5);
 col+=planet*bright*(card*.5+strip*.6);
 float orbitArc=step(.5,v_tag.x)*step(v_tag.x,1.5)*ss(.97,1.,rad)*step(v_local.z,-.01);
 col+=u_secondary*orbitArc*.24;
 // The sun is an actual local point light: inverse-square falloff and
 // analytic planet eclipses cast moving soft shadows onto the mechanism.
 vec3 S=sunPosition()-v_p;
 float sd=length(S),sn=max(dot(N,S/max(sd,.001)),0.);
 float visibility=1.;
 float opening=ss(.06,.85,u_params[0]);
 if(opening>.01&&core<.5&&sd<12.){
  vec3 lightDir=S/max(sd,.001);
  for(int i=0;i<5;i++){
   vec3 delta=planetPosition(i)-v_p;
   float t=dot(delta,lightDir);
   float miss=length(delta-lightDir*t);
   float r=(.26+float(i)*.045)*opening;
   visibility*=mix(1.,ss(r*.65,r*1.3,miss),step(.05,t)*step(t,sd-.1));
  }
 }
 float sun=opening*visibility*10./(.7+sd*sd);
 vec3 sunColor=mix(alloy,vec3(1.),.18);
 col+=metal*sunColor*(.12+.58*sn)*sun;
 vec3 SH=normalize(V+S/max(sd,.001));
 col+=sunColor*pow(max(dot(N,SH),0.),70.)*sun*2.*u_params[3];
 vec3 coreLight=mix(alloy,mix(alloy,vec3(1.),.55),ss(.1,.95,nv));
 col=mix(col,coreLight*(1.2+2.8*pow(nv,.7))*u_params[3],core);
 // Three local gestures: escapement, engaged tooth rims, ratio cohort.
 float tooth=ss(.86,.97,rad)*step(v_tag.x,.5);
 float contact=pow(max(0.,cos(atan(v_local.y,v_local.x)*4.+u_rhythmCount.x*1.5707963)),8.);
 col+=u_accent*tooth*clamp(u_rhythm.x,0.,1.)*contact*2.8;
 col+=mix(u_secondary,vec3(1.),.16)*v_tag.z*clamp(u_rhythm.y,0.,1.)*ss(.55,.92,rad)*step(v_tag.x,.5)*1.8;
 float front=length(v_p.xy)-(1.-clamp(u_rhythm.z,0.,1.))*14.;
 col+=u_accent*exp(-front*front*2.)*min(1.,u_rhythm.z*5.)*tooth*2.2;
 // A strike propagates on the real mechanism, never a screen-space ring.
 // Alternating pallet origins are count-selected; managed mute is exact zero.
 float strike=clamp(u_rhythm.w,0.,1.);
 vec3 origin=sunPosition()+vec3(mod(floor(u_rhythmCount.w),2.)*4.-2.,0.,0.);
 float travel=length((v_p-origin)*vec3(1.,1.,.6))-(1.-strike)*10.;
 float stress=exp(-travel*travel*7.)*min(1.,strike*6.);
 float bearing=exp(-pow((rad-.29)/.06,2.));
 float struckMetal=max(ss(.66,.91,rad),bearing)*(step(v_tag.x,.5)+.32*step(4.5,v_tag.x)*step(v_tag.x,5.5));
 col+=mix(u_accent,brass(),.22)*stress*struckMetal*3.4;
 float distance=length(eye-v_p);
 col=mix(fogColor(),col,exp(-max(distance-4.,0.)*.075));
 col+=atmosphere(eye,-V,distance);
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
 // Analytic scattering and sparse dust in the cathedral. Bounded closed
 // form, no volume march or noise texture.
 float hall=ss(1.,2.,u_params[0]);
 vec3 core=sunPosition();
 float tc=max(0.,dot(core-eye,rd));
 vec3 at=eye+tc*rd-core;
 col+=mix(brass(),u_accent,.30)*(.008+.035*ss(0.,1.,u_params[0]))/(1.+dot(at,at)*.9);
 col+=u_secondary*.014*ss(0.,1.,u_params[0])/(1.+dot(at,at)*.22);
 // Soft raking light in the long nave, evaluated at two depth planes.
 for(int i=0;i<2;i++){
  float z=-9.-float(i)*14.;float t=(z-eye.z)/rd.z;
  vec3 p=eye+max(t,0.)*rd;
  float shaft=exp(-pow((p.x+.31*p.y+3.4)/.6,2.))*exp(-abs(p.y-2.)*.19);
  col+=mix(brass(),u_accent,.28)*shaft*.10*hall*exp(-max(t,0.)*.024);
 }
 float vault=pow(max(0.,1.-abs(rd.x)*1.4),12.)*pow(max(rd.y,0.),1.4);
 col+=mix(u_secondary,u_primary,.3)*vault*.04*hall;
 if(rd.y<-.001){
  float t=(-5.5-eye.y)/rd.y;vec3 p=eye+rd*t;
  vec2 cell=p.xz*.35;vec2 edge=abs(fract(cell)-.5);
  vec2 fw=fwidth(cell);
  float seam=max(ss(.47-fw.x,.49,edge.x),ss(.47-fw.y,.49,edge.y));
  float pool=1./(1.+p.x*p.x*.12+p.z*p.z*.01);
  col+=mix(u_primary,u_secondary,.7)*.18*pool*exp(-t*.035)*(1.-.55*seam)*hall;
 }
 col+=atmosphere(eye,rd,40.);
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
  rhythmStyles: { restrained: "Sleeping gears", driving: "Brass escapement", accented: "Cathedral clock" },
  rhythm: [
    familyEffect(
      "escapement-tick",
      0,
      "Escapement tick",
      "The anchor rocks and the engaged involute tooth rims catch a local accent.",
      { period: 4, duration: 0.65, strength: 0.65, steps: "X...", styles: {
        restrained: { steps: "X...x... | ..X....x", division: 2, strength: 0.55, duration: 0.4 },
        driving: { steps: "X.x.X.x.X.x.X.xx", division: 4, strength: 0.8, duration: 0.18 },
        accented: { steps: "XxxxXx.xXxxxXxXx | Xx.xXxxxXxXxXxXX", division: 4, strength: 0.94, duration: 0.14 },
      } },
    ),
    familyEffect(
      "ratio-cohort",
      1,
      "Ratio cohort",
      "A persistent shaft cohort catches a white glint without changing its meshing speed.",
      { period: 8, duration: 2, strength: 0.7, steps: "X.......", styles: {
        restrained: { steps: ".....x.. | .......X", division: 2, strength: 0.55, duration: 1.2 },
        driving: { steps: "...X...x | ..X...x.", division: 2, strength: 0.82, duration: 0.65 },
        accented: { steps: "...X.......x.... | ......X.......x. | .X.......x......", division: 4, strength: 0.94, duration: 0.6 },
      } },
    ),
    familyEffect(
      "clockwork-wave",
      2,
      "Clockwork wave",
      "A bounded light wave follows tooth rims out through the cathedral.",
      { period: 16, duration: 3.5, strength: 0.75, steps: "X...............", styles: {
        restrained: { steps: "........ | ........ | ........ | ......X.", division: 2, strength: 0.6, duration: 2.5 },
        driving: { steps: "........ | .....x.. | ........ | .......X", division: 2, strength: 0.84, duration: 1.8 },
        accented: { steps: "............x... | ..........X...x. | ................ | ............X..x", division: 4, strength: 0.98, duration: 0.5 },
      } },
    ),
    familyEffect(
      "escapement-strike",
      3,
      "Escapement strike",
      "An alternating pallet strike sends a narrow luminous stress front through gear faces, bearings and armillary rings.",
      { period: 16, duration: 1.1, strength: 0.9, steps: "X.......x.......", styles: {
        restrained: { steps: "........ | ......X. | ........ | ....x...", division: 2, strength: 0.78, duration: 1.5 },
        driving: { steps: "X....... | .....X.. | ..x..... | ......X.", division: 2, strength: 0.94, duration: 0.85 },
        accented: { steps: "X....... | ...X.... | ......x. | X.....X.", division: 2, strength: 1, duration: 0.7 },
      } },
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
