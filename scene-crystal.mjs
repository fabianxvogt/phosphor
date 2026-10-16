import { familyEffect } from "./family-rhythm.mjs";
import {
  ATTRIBUTES,
  LIFT,
  PERIOD,
  createGeometry,
} from "./crystal-geometry.mjs";
// Crystal Habit: one seeded cavern of faceted hexagonal prisms. Seeds sprout,
// druses grow along shared lattice directions, and at the top state the walls
// become a luminous hall. Development moves vertices only; the mesh, roots,
// axes and birth order are fixed per seed. A 2×1 state integrates camera
// travel and light-pulse phase so energy changes speed without jumps.
const common = `
const float PERIOD=${PERIOD.toFixed(1)};
const float LIFT=${LIFT.toFixed(3)};
const float PI=3.14159265359,TAU=6.28318530718;
#define u_dev clamp(u_params[0],0.,2.)
float phaseAt(int x){
 vec3 b=floor(texelFetch(u_state,ivec2(x,0),0).rgb*255.+.5);
 return (b.r*65536.+b.g*256.+b.b)/16777216.;
}
vec3 pathAt(float z,float dev){
 float w=TAU*z/PERIOD;
 return vec3(.62*sin(w+.7)+.22*sin(3.*w+2.1),
  -.2+.16*sin(2.*w+.4)+.07*sin(5.*w+1.3)+LIFT*dev*.5,z);
}`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_p;
layout(location=1) in vec3 a_n;
layout(location=2) in vec4 a_a;
layout(location=3) in vec4 a_b;
layout(location=4) in vec4 a_c;
uniform float u_kick;
uniform vec2 u_resolution;
uniform float u_params[8];
uniform highp sampler2D u_state;
${common}
out vec3 v_pos,v_normal;
out vec2 v_face;
out vec3 v_wall,v_abs;
flat out vec4 v_info;
flat out vec3 v_root;
flat out vec4 v_axis;
flat out float v_rad,v_hue;
float ss(float a,float b,float x){return smoothstep(a,b,x);}
vec2 growth(float kind,float birth,float dev,float detail){
 if(kind<1.5){float t=ss(0.,2.,dev);return vec2(.72+.28*t,.95+.05*t);}
 if(kind<2.5){
  float g1=ss(.08+.62*birth,.38+.62*birth,dev),g2=ss(1.,2.,dev);
  return vec2((.64+.36*g1)*(.62+.38*g2),(.78+.22*ss(0.,.25,g1))*(.7+.3*g1)*(.8+.2*g2));
 }
 float g=kind<3.5?ss(1.02+.6*birth,1.32+.6*birth,dev)
  :ss(birth-.1,birth+.1,detail)*(.55+.45*dev*.5);
 return vec2(g,ss(0.,.25,g)*(.7+.3*g));
}
void main(){
 float dev=u_dev,kind=a_c.w,Z=phaseAt(0)*PERIOD;
 vec3 p,n;float anchor;
 v_info=vec4(kind,a_a.w,a_n.z,0.);v_face=a_n.xy;v_hue=a_c.z;
 if(kind<.5){
  p=a_p;n=a_n;anchor=a_b.w;v_info.y=a_a.w;
  float s01=clamp(dev,0.,1.),s12=clamp(dev-1.,0.,1.);
  v_wall=vec3(mix(mix(a_a.x,a_a.y,s01),a_a.z,s12),mix(mix(a_b.x,a_b.y,s01),a_b.z,s12),a_c.x);
  v_root=vec3(a_a.w,a_c.y,a_c.z);v_axis=vec4(0.,0.,1.,0.);v_rad=0.;
 }else if(kind>4.5){
  // Mote: a drifting speck; phases use whole turns of the pulse phase.
  float pv=phaseAt(1),ph=a_c.y*TAU;
  p=a_a.xyz+vec3(sin(TAU*pv+ph),.6*sin(TAU*2.*pv+ph*1.7),cos(TAU*pv+ph*2.3))*.22;
  n=vec3(0.,0.,1.);anchor=a_b.w;v_face=a_p.xy;
  v_wall=vec3(0.);v_root=vec3(0.);v_axis=vec4(0.,0.,1.,0.);v_rad=a_c.x;
 }else{
  vec3 root=a_a.xyz,d=a_b.xyz;float rnd=a_a.w;
  vec2 g=growth(kind,a_b.w,dev,u_params[6]);
  float breath=1.+.02*min(u_params[2],2.)*sin(TAU*(phaseAt(1)*.5+rnd));
  float len=a_c.x*g.x*breath,rad=a_c.y*g.y*clamp(u_params[5],.4,1.6);
  float tip=rad*(1.1+.8*fract(rnd*7.));
  vec3 h=abs(d.y)<.9?vec3(0,1,0):vec3(1,0,0);
  vec3 e1=normalize(cross(h,d)),e2=cross(d,e1);
  float c=cos(rnd*TAU),s=sin(rnd*TAU);
  vec3 r1=e1*c+e2*s,r2=-e1*s+e2*c;
  if(a_p.z>1.5)p=root+d*(len+tip);
  else p=root+d*(a_p.z*len)+(r1*a_p.x+r2*a_p.y)*rad;
  float face=a_n.z,phi=(mod(face,6.)+.5)*PI/3.;
  vec3 radial=r1*cos(phi)+r2*sin(phi);
  n=face<5.5?radial:normalize(radial*tip+d*rad*.8660254+1e-6);
  anchor=root.z;
  v_info.w=g.x;
  v_wall=vec3(0.);
  v_rad=rad;v_axis=vec4(d,len);
  v_root=root;
 }
 // Periodic cavern: every element is shifted by whole periods into the
 // window around the camera, so travel never ends and never cuts.
 float shift=mod(anchor-Z+5.,PERIOD)-5.-anchor;
 v_abs=p;
 p.z+=shift;
 vec3 cam=pathAt(Z,dev),look=pathAt(Z+2.6,dev);
 cam.z=0.;look.z=2.6;look.y-=.16;
 vec3 f=normalize(look-cam),r=normalize(cross(vec3(0,1,0),f));
 // Gaze turns the view from the glide direction towards the right wall.
 float yaw=clamp(u_params[7],0.,1.)*1.1;
 f=normalize(f*cos(yaw)+r*sin(yaw));r=normalize(cross(vec3(0,1,0),f));
 vec3 u=cross(f,r);
 vec3 q=p-cam;
 v_pos=q;v_normal=n;
 if(kind>.5&&kind<4.5)v_root=v_root+vec3(0.,0.,shift)-cam;
 vec3 view=vec3(dot(q,r),dot(q,u),dot(q,f));
 if(kind>4.5){
  float shown=step(fract(a_a.w*7.31),.25+.75*clamp(u_params[6],0.,1.));
  view.xy+=a_p.xy*a_c.x*smoothstep(.5,1.5,view.z)*shown;
 }
 float A=u_resolution.x/u_resolution.y,F=mix(1.9,1.5,ss(1.,2.,dev))*(1.+.02*u_kick);
 float nearZ=.04,farZ=40.;
 gl_Position=vec4(view.x*F/max(A,1.),view.y*F*min(A,1.),
  (view.z*(farZ+nearZ)-2.*farZ*nearZ)/(farZ-nearZ),view.z);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_pos,v_normal;
in vec2 v_face;
in vec3 v_wall,v_abs;
flat in vec4 v_info;
flat in vec3 v_root;
flat in vec4 v_axis;
flat in float v_rad,v_hue;
uniform float u_time,u_level;
uniform float u_params[8];
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
uniform highp sampler2D u_state;
${common}
out vec4 outColor;
float hash1(float x){return fract(sin(x*12.9898)*43758.5453);}
vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
vec3 pal(float t){return mix(mix(u_secondary,u_primary,smoothstep(0.,.65,t)),u_accent,smoothstep(.65,1.,t));}
void main(){
 float dist=length(v_pos),kind=v_info.x,rnd=v_info.y,dev=u_dev;
 vec3 V=-v_pos/max(dist,1e-4);
 vec3 N=normalize(v_normal);
 vec3 K=normalize(vec3(-.35,.85,.45));
 vec3 lamp=vec3(.3,.45,-.3)-v_pos;float lampD=dot(lamp,lamp);lamp*=inversesqrt(lampD);
 float lampA=1.1/(1.+.22*lampD)*mix(.75,1.,smoothstep(0.,1.2,dev));
 vec3 fogC=mix(u_secondary,u_primary,.3)*.025;
 float fog=max(1.-exp(-dist*.055),smoothstep(16.,25.,dist));
 vec3 col;
 if(kind>4.5){
  float r2=dot(v_face,v_face);
  if(r2>1.)discard;
  float tw=.55+.45*sin(u_time*1.7+rnd*40.);
  col=mix(pal(.2+.5*fract(rnd*3.3)),vec3(1.),.4)*(1.-r2)*(1.-r2)*.9*tw*u_params[4];
 }else if(kind<.5){
  if(dot(N,V)<0.)N=-N;
  // Quiet geological planes: no cellular shell or high-frequency camo.
  // Integer z frequencies preserve the exact periodic cavern seam.
  float w=TAU*v_abs.z/PERIOD;
  float strata=.5+.5*sin(v_wall.z*3.+2.*w+.35*sin(3.*w));
  float diff=max(dot(N,K),0.),lit=max(dot(N,lamp),0.)*lampA;
  float glowN=1.-exp(-v_wall.x*.9);
  vec3 rock=mix(u_secondary,u_primary,.06);
  float contour=pow(1.-abs(dot(N,V)),2.);
  col=rock*(.024+.03*diff+.065*lit)*(.8+.2*strata);
  col+=u_secondary*contour*.085;
  col+=mix(u_secondary,u_primary,.12)*glowN*.21*u_params[4];
  vec3 dl=v_root-v_abs;dl.z=mod(dl.z+PERIOD*.5,PERIOD)-PERIOD*.5;
  float sd2=dot(dl,dl);
  float seedPool=max(dot(N,dl*inversesqrt(sd2+1e-4)),0.)/(1.+sd2*3.);
  col+=mix(u_secondary,u_primary,.3)*seedPool*.18*u_params[4];
  // The same narrow ringing front bounces off nearby rock pools, carrying
  // the event between groups without drawing artificial connecting tubes.
  float rockPhase=atan(v_pos.y+.2,v_pos.x)-u_rhythmCount.w*2.399963+(1.-u_rhythm.w)*TAU;
  float rockFront=pow(.5+.5*cos(rockPhase),24.);
  float rockWake=pow(.5+.5*cos(rockPhase-.55),16.)*.1;
  col+=u_accent*(rockFront+rockWake)*u_rhythm.w*glowN*.18;
  col*=mix(.18,1.,v_wall.y);
 }else{
  float face=v_info.z,g=v_info.w;
  vec3 d=v_axis.xyz;float len=max(v_axis.w,1e-4),rad=max(v_rad,1e-4);
  float along=clamp(dot(v_pos-v_root,d)/len,-.2,1.6);
  float diff=max(dot(N,K),0.),lit=max(dot(N,lamp),0.)*lampA;
  float nv=abs(dot(N,V)),fres=pow(1.-nv,3.);
  vec3 H1=normalize(K+V),H2=normalize(lamp+V);
  float spec=pow(max(dot(N,H1),0.),90.)+pow(max(dot(N,H2),0.),140.)*lampA*1.5;
  // Refracted view ray against the emissive core on the crystal axis.
  vec3 rd=refract(-V,N,.66);
  vec3 w0=v_pos-v_root;float b=dot(rd,d),dd=dot(rd,w0),e=dot(d,w0),den=max(1.-b*b,1e-4);
  float sAx=clamp((e-b*dd)/den,0.,len);
  float tR=max(dot(v_root+d*sAx-v_pos,rd),0.);
  float dc=length(v_pos+rd*tR-v_root-d*sAx)/rad;
  float core=exp(-dc*dc*5.)*(.15+.85*smoothstep(.35,1.05,sAx/len));
  float haze=exp(-dc*dc*1.5)*(.25+.75*sAx/len);
  bool seed=kind<1.5;
  float tipZone=smoothstep(.8,1.12,along);
  // One mineral family per druse; primary light is a rare internal glint.
  vec3 tint=v_hue>.84?u_primary:u_secondary;
  vec3 body=tint*.07;
  vec3 coreC=tint;
  vec3 seedC=mix(u_accent,vec3(1.),.12);
  // Seeds glow in accent; as they grow only their terminations keep it.
  float accentMix=seed?tipZone*.3:0.;
  coreC=mix(coreC,mix(coreC,seedC,smoothstep(.25,.8,core)),accentMix);
  float dormant=seed?(1.-smoothstep(.3,1.,dev)):0.;
  float glowP=u_params[4]*(seed?1.15:.45)*(.45+.55*g)*(1.+.45*smoothstep(1.,2.,dev))*(1.+dormant*(.9+.5*sin(TAU*phaseAt(1)*2.+rnd*TAU)));
  col=body*(.25+.8*diff+lit);
  // Absorptive interior and coherent flat-facet reflections. There is no
  // transverse periodic signal: the old milky wax bands are gone.
  col+=tint*haze*.075*glowP;
  col+=tint*fres*.25;
  col+=mix(tint,vec3(1.),.32)*spec*.85;
  vec3 R=reflect(-V,N);
  float reflection=smoothstep(.65,.9,dot(R,K));
  col+=tint*reflection*(.4+.55*fres);
  float cleavage=0.,fracture=0.;
  // Micro-druses use the same faceted habit but do not need an optical
  // exit solve: their interiors are below a few pixels even at 4K.
  if(kind<2.5){
  // Trace the transmitted ray to the back of the actual hexagonal shaft.
  // Back facets create a second, displaced set of planes inside the glass,
  // not axial neon lines or cloudy longitudinal texture.
  vec3 helper=abs(d.y)<.9?vec3(0,1,0):vec3(1,0,0);
  vec3 e1=normalize(cross(helper,d)),e2=cross(d,e1);
  vec3 r1=e1*cos(rnd*TAU)+e2*sin(rnd*TAU);
  vec3 r2=-e1*sin(rnd*TAU)+e2*cos(rnd*TAU);
  float exitT=rad*6.;vec3 exitN=-N;
  vec3 rel=v_pos-v_root;
  // Opposite hexagon planes form three pairs. Only the outgoing member
  // of each pair can be the exit, so trace three rather than six planes.
  for(int j=0;j<3;j++){
   float phi=(float(j)+.5)*PI/3.;
   vec3 side=r1*cos(phi)+r2*sin(phi);
   side*=dot(rd,side)<0.?-1.:1.;
   float denom=dot(rd,side);
   float t=(rad*.8660254-dot(rel,side))/max(denom,1e-4);
   if(denom>1e-4&&t>.001&&t<exitT){exitT=t;exitN=side;}
  }
  // Include the far termination; its oblique intersection is visible
  // through the shaft and breaks the otherwise extruded pencil silhouette.
  float capDen=dot(rd,d);
  float capT=(len+rad*.65-dot(rel,d))/max(capDen,1e-4);
  if(capDen>1e-4&&capT>.001&&capT<exitT){exitT=capT;exitN=d;}
  vec3 exitP=rel+rd*exitT;
  vec3 exitRay=refract(rd,-exitN,1.5);
  if(dot(exitRay,exitRay)<.01)exitRay=reflect(rd,-exitN);
  exitRay=normalize(exitRay);
  float slit=pow(max(dot(exitRay,K),0.),26.);
  float absorption=exp(-exitT/max(rad,.01)*.6);
  // Transmission samples directional cave light, not a diffuse back-face
  // fill: dark clear interiors remain between the displaced light images.
  float portal=pow(max(dot(exitRay,normalize(vec3(.45,.16,1.))),0.),18.);
  float ceiling=pow(max(dot(exitRay,normalize(vec3(-.6,.7,.3))),0.),12.);
  vec3 transmitted=u_secondary*(.025+.6*ceiling)+mix(tint,u_primary,.25)*portal*.85;
  col+=transmitted*(.18+.82*absorption)*u_params[4];
  col+=mix(tint,u_primary,.25)*slit*1.4;
  // One coherent reflected softbox, rather than repeated reflection bands.
  float panel=smoothstep(.12,.2,R.y)*(1.-smoothstep(.38,.49,R.y))*smoothstep(-.4,.1,R.x);
  col+=mix(u_secondary,vec3(1.),.16)*panel*(.3+.4*fres);
  float internalGlint=abs(dc-.55);
  float edgeWidth=max(.035,fwidth(internalGlint)*1.5);
  cleavage=(1.-smoothstep(0.,edgeWidth,internalGlint))*smoothstep(.15,.5,along)*(1.-smoothstep(.85,1.1,along));
  // Unequal trapped cleavage planes refract as short, tilted glints. The
  // plane is fixed in the crystal, not a texture stripe across its surface.
  vec3 cleavageN=normalize(d+r1*(.55+.5*rnd)+r2*.3);
  float fissure=abs(dot(exitP,cleavageN)-len*(.28+.28*rnd));
  float fissureWidth=max(rad*.025,fwidth(fissure)*1.4);
  fracture=(1.-smoothstep(fissureWidth,fissureWidth*2.,fissure))*smoothstep(.1,.3,along)*(1.-smoothstep(.85,1.15,along));
  fracture*=step(.72,fract(rnd*91.))*step(abs(mod(face,6.)-floor(rnd*6.)),.1);
  col+=mix(coreC,u_primary,.45)*cleavage*.13*glowP;
  col+=mix(tint,u_primary,.35)*fracture*(.3+.65*absorption)*glowP;
  col+=coreC*core*glowP*.48;
  }else{
   col+=tint*(.035+.1*diff)+tint*spec*.3;
  }
  // Facet edges stay about 1.5 px wide at any output size.
  float ed=face<5.5?min(min(v_face.x,1.-v_face.x),1.-v_face.y)
   :min(min(v_face.x-.5*v_face.y,1.-v_face.x-.5*v_face.y),v_face.y);
  float fw=fwidth(ed);
  float line=(1.-smoothstep(0.,fw*1.4,ed))*smoothstep(.45,.1,fw);
  col+=tint*line*.025*fres;
  // Light pulses travel from the root to the tip; energy speeds them up.
  float pulse=fract(phaseAt(1)+rnd);
  float band=exp(-pow((along-pulse*1.25)*7.,2.))*min(u_params[2],2.);
  col+=coreC*band*(.06*haze+.15*cleavage)*glowP;
  col+=mix(coreC,u_primary,.3)*exp(-pow((along-(1.-u_rhythm.y))*10.,2.))*u_rhythm.y*1.7*(.08+.6*cleavage+.25*fres);
  // Facet sparkle: a few facets glint at a time; density rises with energy.
  float slot=floor(u_time*2.3+rnd*7.);
  float pick=hash1(face+rnd*97.+slot*.137);
  float amount=clamp(u_params[3],0.,2.)*.08+u_rhythm.x*.25;
  float tw=step(1.-amount,pick)*sin(PI*fract(u_time*2.3+rnd*7.));
  col+=mix(u_primary,vec3(1.),.25)*tw*(.35+1.5*spec+.4*fres);
  float facetCohort=.35+.65*pow(.5+.5*cos(face*PI/3.-u_rhythm.x*3.),3.);
  col+=mix(tint,u_primary,.2)*u_rhythm.x*facetCohort*(.1+.5*fres+.25*tipZone);
  if(seed)col+=seedC*u_rhythm.z*1.8*(.2*core+.3*fres)*(.2+.8*tipZone);
  // Crystal chime: narrow circuit front, dim wake, then climbing tips.
  // Constant per-root angle keeps every druse identifiable as it rings.
  float theta=atan(v_root.y+.2,v_root.x);
  float travel=(1.-u_rhythm.w)*TAU;
  float chimePhase=theta-u_rhythmCount.w*2.399963+travel;
  float cohort=pow(.5+.5*cos(chimePhase),24.);
  float wake=pow(.5+.5*cos(chimePhase-.55),16.)*.16;
  float ring=exp(-pow((along-(1.-u_rhythm.w)*1.4)*9.,2.));
  float chime=u_rhythm.w*(cohort*(.2+3.8*ring)+wake*tipZone);
  chime+=u_rhythmHit.w*cohort*.35*(1.-smoothstep(0.,.2,along));
  col+=u_accent*chime*4.2*(.25+.5*fres+.4*cleavage);
  // Contact shadows and dark near-frame occluders frame the midground.
  col*=.2+.8*smoothstep(0.,.3,along*len)*smoothstep(-.1,.08,along);
  col*=mix(.28,1.,smoothstep(.8,3.8,dist));
  col*=kind>2.5?.3:1.;
  col*=mix(1.,.6,smoothstep(8.,20.,dist));
 }
 col=mix(col,fogC,fog);
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
const simulation = `
void main(){
 int x=int(gl_FragCoord.x);
 vec3 b=floor(texelFetch(u_state,ivec2(x,0),0).rgb*255.+.5);
 uint n=(uint(b.r)<<16u)|(uint(b.g)<<8u)|uint(b.b);
 float rate=x==0?.42*clamp(u_params[1],0.,2.)/${PERIOD.toFixed(1)}:.22*(.4+clamp(u_params[2],0.,2.));
 if(u_reset)n=seedHash(u_seedBits+uint(x)*7919u)&16777215u;
 else n=(n+uint(floor(u_dt*rate*16777216.+.5)))&16777215u;
 outColor=vec4(float(n>>16u),float((n>>8u)&255u),float(n&255u),255.)/255.;
}`;
const schema = [
  {
    key: "development",
    label: "Development · seeds / lattice / hall",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "drift",
    label: "Glide speed",
    min: 0.1,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "shimmer",
    label: "Light pulses",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "sparkle",
    label: "Facet sparkle",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "glow",
    label: "Core glow",
    min: 0.2,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "habit",
    label: "Crystal habit",
    min: 0.4,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "detail",
    label: "Crystal grains",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "gaze",
    label: "Gaze to the wall",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
  },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    drift: 1,
    shimmer: 1,
    sparkle: 1,
    glow: 1,
    habit: 1,
    detail: 0.45,
    gaze: 0,
    ...params,
  },
});
export default {
  id: "crystal",
  number: 90,
  name: "Crystal Habit",
  description:
    "Seeded crystals sprout faceted prisms, grow into lattice-aligned druses and line a luminous cavern hall the camera glides through.",
  development: "development",
  schema,
  presets: [
    look("Dormant Seeds", 311, 0),
    look("Quartz Lattice", 311, 1),
    look("Geode Hall", 311, 2),
    look("Needle Grotto", 1207, 1.5, {
      habit: 0.5,
      detail: 0.85,
      drift: 0.7,
      gaze: 0.3,
    }),
    look("Amethyst Vault", 4421, 1.6, {
      habit: 1.3,
      glow: 1.3,
      drift: 0.6,
      gaze: 0.35,
    }),
    look("Glacier Druse", 58, 1.25, {
      habit: 0.85,
      sparkle: 1.6,
      detail: 0.7,
      drift: 1.35,
    }),
    look("Ember Sprouts", 2718, 0.6, {
      glow: 1.4,
      shimmer: 1.4,
      detail: 0.8,
      drift: 0.8,
      gaze: 0.2,
    }),
    look("Cathedral Geode", 911, 2, {
      habit: 1.15,
      drift: 0.8,
      sparkle: 0.7,
      gaze: 0.15,
    }),
  ],
  stage: ["drift", "sparkle", "glow"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    drift: { mul: [0.7, 1.4] },
    shimmer: { mul: [0.5, 1.5] },
    sparkle: { mul: [0.4, 1.6] },
    detail: [0, 0.5],
  },
  beat: { punch: 0.06, pulse: 0.06 },
  audio: [
    { param: "shimmer", feature: "low", amount: 0.06 },
    { param: "sparkle", feature: "high", amount: 0.05 },
  ],
  rhythmStyles: {
    restrained: "Hidden facets",
    driving: "Quartz steps",
    accented: "Prismatic chime",
  },
  rhythm: [
    familyEffect(
      "facet-glint",
      0,
      "Facet glint",
      "More crystal facets catch the light at once.",
      {
        period: 4,
        strength: 0.6,
        duration: 0.5,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....x.. | ...x....",
            division: 2,
            strength: 0.5,
            duration: 0.9,
          },
          driving: {
            steps: "X.x.X.x. | X..xX.xx",
            division: 2,
            strength: 0.78,
            duration: 0.3,
          },
          accented: {
            steps: "X.x..X.x..X.x..xX.x.",
            division: 4,
            strength: 0.94,
            duration: 0.2,
          },
        },
      },
    ),
    familyEffect(
      "growth-pulse",
      1,
      "Growth pulse",
      "A band of light climbs every crystal from its root to its tip.",
      {
        period: 8,
        strength: 0.65,
        duration: 1,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "..x..... | ......X.",
            division: 2,
            strength: 0.55,
            duration: 1.25,
          },
          driving: {
            steps: "...X..x. | .X...x..",
            division: 2,
            strength: 0.78,
            duration: 0.75,
          },
          accented: {
            steps: "...X..x..X..x... | .X..x..X..x...X.",
            division: 4,
            strength: 0.9,
            duration: 0.4,
          },
        },
      },
    ),
    familyEffect(
      "seed-beacons",
      2,
      "Seed beacons",
      "The original seed crystals flare together.",
      {
        period: 16,
        strength: 0.7,
        duration: 2,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | ....X... | ........",
            division: 2,
            strength: 0.55,
            duration: 2,
          },
          driving: {
            steps: "........ | ......xX | ........ | .....x.X",
            division: 2,
            strength: 0.82,
            duration: 0.35,
          },
          accented: {
            steps: "................ | ..........x.X.xx",
            division: 4,
            strength: 0.97,
            duration: 0.18,
          },
        },
      },
    ),
    familyEffect(
      "crystal-chime",
      3,
      "Crystal chime",
      "A ringing light cascade circles the crystal groups and climbs their terminations.",
      {
        period: 8,
        strength: 0.95,
        duration: 0.8,
        steps: "..X...x.",
        styles: {
          restrained: {
            steps: "........ | ....X... | ........ | ......x.",
            division: 2,
            strength: 0.72,
            duration: 2,
          },
          driving: {
            steps: "..X..... | .....X.. | ...x.... | ......X.",
            division: 2,
            strength: 0.95,
            duration: 1.7,
          },
          accented: {
            steps: "..X..... | .....x.. | ...X.... | ..x...X.",
            division: 2,
            strength: 1,
            duration: 1.5,
          },
        },
      },
    ),
  ],
  fragment: `void main(){vec2 p=v_uv-.5;outColor=vec4(mix(u_secondary,u_primary,.3)*.035*(1.-.4*dot(p,p)),1.);}`,
  simulation: { fragment: simulation, size: [2, 1], steps: 1 },
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    vertex,
    fragment: surface,
  },
};
