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
  return vec2((.28+.72*g1)*(.62+.38*g2),(.36+.64*ss(0.,.25,g1))*(.7+.3*g1)*(.8+.2*g2));
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
  // Periodic cellular surface on (theta, z): chipped rock that becomes a
  // druse lining of tiny hexagonal pyramids, first near the clusters.
  // Exact hexagonal Wigner-Seitz cells of the triangular habit lattice.
  // Two rectangular cosets replace nine random Voronoi candidates; both
  // chart periods contain whole lattice cells, including the half coset.
  vec2 cells=vec2(96.,192.),period=vec2(1.,1.73205080757);
  vec2 uv=vec2((v_wall.z+PI*.5)/TAU*cells.x,v_abs.z/PERIOD*cells.y)*period;
  vec2 a=uv-period*floor(uv/period+.5),b=uv-period*(floor(uv/period)+.5);
  vec2 local=dot(a,a)<dot(b,b)?a:b,best=-local;
  vec2 bestId=mod((uv-local)/period,cells);
  float d1=dot(local,local);
  vec2 hc=hash2(bestId+17.);
  float fw=fwidth(uv.x)+fwidth(uv.y),detail=smoothstep(.9,.25,fw);
  float glowN=1.-exp(-v_wall.x*1.6);
  float cover=(dev-1.)*.45+.65*glowN-.48;
  float grow=smoothstep(hc.x*.8,hc.x*.8+.3,cover);
  // Each Voronoi cell is one crystal base; growth raises its hexagonal
  // pyramid from a flat rock chip to a pointed druse crystal.
  float r=sqrt(d1),edge=.5-max(abs(local.x),max(abs(dot(local,vec2(.5,.8660254))),abs(dot(local,vec2(-.5,.8660254)))));
  vec3 T1=normalize(cross(N,vec3(0.,0.,1.))+vec3(1e-4,0.,0.)),T2=cross(N,T1);
  float ang=atan(-best.y,-best.x)+hc.y*TAU;
  float sector=floor(ang/(PI/3.)+.5)*(PI/3.);
  float ridgeD=abs(abs(ang-sector)-PI/6.)*r;
  sector-=hc.y*TAU;
  vec2 fd=vec2(cos(sector),sin(sector)),chip=hc-.5;
  N=normalize(N+((T1*fd.x+T2*fd.y)*1.6*grow+(T1*chip.x+T2*chip.y)*.14*(1.-grow))*detail);
  float groove=smoothstep(0.,.16,edge);
  float strata=.6+.4*sin(v_abs.z*2.8+v_abs.x*3.+sin(v_abs.y*7.));
  vec3 rock=mix(u_secondary,u_primary,.18)*.1*(.7+.3*strata);
  float diff=max(dot(N,K),0.),lit=max(dot(N,lamp),0.)*lampA;
  vec3 stone=rock*(.12+.45*diff+1.6*lit+.25*max(-N.y,0.));
  float poolK=u_params[4]*mix(.38,.18,smoothstep(1.,2.,dev));
  vec3 poolC=mix(u_primary,u_secondary,.25);
  float pool=glowN*glowN*glowN*poolK;
  stone+=poolC*pool*(.85+.3*hc.y)*1.4;
  // Crisp point-light pool from the nearest seed crystal (all states).
  vec3 dl=v_root-v_abs;dl.z=mod(dl.z+PERIOD*.5,PERIOD)-PERIOD*.5;
  float sd2=dot(dl,dl);
  float seedI=u_params[4]*(1.+.9*(1.-smoothstep(.3,1.,dev))*(.6+.4*sin(TAU*phaseAt(1)*2.)));
  float seedPool=seedI*max(dot(N,dl*inversesqrt(sd2+1e-4)),0.)/(1.+sd2*8.)*(1.-smoothstep(.5,1.1,sqrt(sd2)));
  vec3 seedLC=mix(u_primary,u_accent,.38)*1.15;
  stone+=seedLC*seedPool*.8;
  // Druse points: glassy facets with a bright apex and sparkle.
  float nv=abs(dot(N,V)),fres=pow(1.-nv,3.);
  float spec=pow(max(dot(N,normalize(K+V)),0.),220.)+pow(max(dot(N,normalize(lamp+V)),0.),260.)*lampA*1.5;
  float apex=exp(-r*r/.015);
  vec3 cellC=pal(.08+.55*fract(hc.x*1.7+hc.y));
  float lively=.35+.65*clamp(u_params[6],0.,1.);
  vec3 druse=cellC*.05*(.25+diff+1.2*lit)
   +mix(cellC,vec3(1.),.35)*fres*.05
   +mix(cellC,vec3(1.),.2)*spec*.3*detail*lively
   +poolC*pool*1.1+seedLC*seedPool*.5
   +cellC*apex*glowN*u_params[4]*.035*lively;
  float rfw=fwidth(ridgeD)+1e-4;
  druse+=cellC*(1.-smoothstep(0.,rfw*1.3,ridgeD))*detail*.018*glowN*smoothstep(.05,.3,r);
  float slot=floor(u_time*2.3+hc.x*7.);
  float tw=step(1.-clamp(u_params[3],0.,2.)*.05-u_rhythm.x*.12,hash1(hc.y*91.+slot*.31))
   *sin(PI*fract(u_time*2.3+hc.x*7.));
  druse+=mix(cellC,vec3(1.),.6)*tw*(1.5*spec+.9*apex)*detail*lively;
  col=mix(stone,druse,grow)*(.4+.6*mix(1.,groove,grow))*mix(1.,.6,smoothstep(1.,2.,dev));
  col*=mix(.3,1.,v_wall.y);
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
  float hueT=mix(.04,.62,fract(v_hue+.13*rnd));
  vec3 tint=pal(hueT);
  vec3 body=tint*.22;
  vec3 coreC=pal(mix(.12,.64,v_hue));
  // Transverse mineral growth zones are visible through the flat facets;
  // narrow discontinuities are filtered, never time-varying grain.
  float zones=.5+.5*cos(along*19.+face*.45+rnd*8.);
  coreC*=.65+.35*smoothstep(.25,.65,zones);
  vec3 seedC=mix(u_accent,vec3(1.),.12);
  // Seeds glow in accent; as they grow only their terminations keep it.
  float accentMix=seed?tipZone*.3:0.;
  coreC=mix(coreC,mix(coreC,seedC,smoothstep(.25,.8,core)),accentMix);
  float dormant=seed?(1.-smoothstep(.3,1.,dev)):0.;
  float glowP=u_params[4]*(seed?1.15:.45)*(.45+.55*g)*(1.+.45*smoothstep(1.,2.,dev))*(1.+dormant*(.9+.5*sin(TAU*phaseAt(1)*2.+rnd*TAU)));
  col=body*(.3+.7*diff+1.1*lit+.3*max(-N.y,0.));
  col+=tint*haze*.26*glowP;
  col+=mix(tint,vec3(1.),.18)*fres*.2;
  // A bounded interference tint, no discontinuity at a palette endpoint.
  col+=pal(.5-.5*cos(TAU*(2.2*nv+rnd)))*fres*.14;
  col+=mix(tint,vec3(1.),.35)*spec*.65;
  float inclusions=.82+.18*sin(along*38.+rnd*17.+face*2.);
  col+=coreC*core*glowP*.55*inclusions;
  // Broad reflected light strips break up the axial glow. They are locked
  // to facet/view geometry, not time noise, and retain saturated midtones.
  float reflection=pow(.5+.5*cos(dot(reflect(-V,N),K)*9.+rnd*5.),14.);
  col+=mix(u_secondary,u_primary,.35)*reflection*(.2+.5*fres);
  col+=tint*pow(.5+.5*cos(along*17.+face*.8),10.)*.06;
  // Facet edges stay about 1.5 px wide at any output size.
  float ed=face<5.5?min(min(v_face.x,1.-v_face.x),1.-v_face.y)
   :min(min(v_face.x-.5*v_face.y,1.-v_face.x-.5*v_face.y),v_face.y);
  float fw=fwidth(ed);
  float line=(1.-smoothstep(0.,fw*1.4,ed))*smoothstep(.45,.1,fw);
  col+=mix(tint,vec3(1.),.15)*line*(.035+.12*fres+.12*tipZone);
  // Light pulses travel from the root to the tip; energy speeds them up.
  float pulse=fract(phaseAt(1)+rnd);
  float band=exp(-pow((along-pulse*1.25)*7.,2.))*min(u_params[2],2.);
  col+=coreC*band*(.25*haze+.6*core)*glowP;
  col+=coreC*exp(-pow((along-(1.-u_rhythm.y))*5.,2.))*u_rhythm.y*2.2*(.25+haze);
  // Facet sparkle: a few facets glint at a time; density rises with energy.
  float slot=floor(u_time*2.3+rnd*7.);
  float pick=hash1(face+rnd*97.+slot*.137);
  float amount=clamp(u_params[3],0.,2.)*.08+u_rhythm.x*.25;
  float tw=step(1.-amount,pick)*sin(PI*fract(u_time*2.3+rnd*7.));
  col+=mix(u_primary,vec3(1.),.25)*tw*(.35+1.5*spec+.4*fres);
  float facetCohort=.35+.65*pow(.5+.5*cos(face*PI/3.-u_rhythm.x*3.),3.);
  col+=mix(tint,u_accent,.3)*u_rhythm.x*facetCohort*(.22+.7*fres+.5*tipZone);
  if(seed)col+=seedC*u_rhythm.z*1.8*(core+.3*fres)*(.4+.6*tipZone);
  // Crystal chime: an angular wave selects mineral groups, then a broad
  // ring climbs each selected prism. Count rotates the next strike origin.
  float theta=atan(v_abs.y+.2,v_abs.x);
  float chimePhase=theta-u_rhythmCount.w*2.399963+(1.-u_rhythm.w)*TAU;
  float cohort=pow(.5+.5*cos(chimePhase),8.);
  float ring=exp(-pow((along-(1.-u_rhythm.w)*1.4)*4.,2.));
  float chime=u_rhythm.w*cohort*(.25+1.7*ring+.6*tipZone);
  chime+=u_rhythmHit.w*cohort*.2*(1.-smoothstep(0.,.3,along));
  col+=mix(u_primary,u_accent,.72)*chime*2.4*(.3+haze);
  // Contact occlusion where the prism meets rock and its neighbours.
  col*=.2+.8*smoothstep(0.,.3,along*len)*smoothstep(-.1,.08,along);
  col*=.9+.1*float(seed);
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
            duration: 1.3,
          },
          driving: {
            steps: "..X..... | .....X.. | ...x.... | ......X.",
            division: 2,
            strength: 0.95,
            duration: 0.85,
          },
          accented: {
            steps: "..X..... | .....x.. | ...X.... | ..x...X.",
            division: 2,
            strength: 1,
            duration: 0.8,
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
