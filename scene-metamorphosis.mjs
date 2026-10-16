import { familyEffect } from "./family-rhythm.mjs";
import { createGeometry } from "./metamorphosis-geometry.mjs";
// A fixed mesh releases rolled seed membranes into layered cups and petals.
// The open seams are intentional: no intermediate development becomes a disc.
const camera = `
float gardenLens(float aspect){return mix(2.30,3.35,smoothstep(1.,1.5,aspect));}
void gardenCamera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float yaw=.26*sin(u_time*.025)+.08*sin(u_time*.017);
 eye=vec3(3.15*sin(yaw),-3.15*cos(yaw),3.10);
 F=normalize(vec3(0.,0.,.30)-eye);
 R=normalize(cross(F,vec3(0.,0.,1.)));U=cross(R,F);
}
`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_uv;
layout(location=1) in vec3 a_center;
layout(location=2) in float a_angle;
layout(location=3) in float a_kind;
layout(location=4) in float a_id;
uniform float u_time,u_kick,u_level;
#ifdef PHOSPHOR_LATE
uniform float u_clock[4];
#endif
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
#define u_morph (u_params[0]*.5)
#define u_aspect (u_resolution.x/u_resolution.y)
#define u_inset 0.0
out vec3 v_normal,v_position;
out vec2 v_uv;
flat out float v_kind,v_id;
out float v_angle;
${camera}
const float PI=3.14159265359;
vec3 orient(vec3 p){
 vec3 q=p-vec3(a_center.xy,0.);
 float hero=1.-step(.1,abs(a_id-1.));
 float tiltX=mix(.75*sin(a_id*2.3),.10,hero),tiltY=mix(.65*cos(a_id*1.7),-.08,hero);
 q.yz=mat2(cos(tiltX),sin(tiltX),-sin(tiltX),cos(tiltX))*q.yz;
 q.xz=mat2(cos(tiltY),sin(tiltY),-sin(tiltY),cos(tiltY))*q.xz;
 return q+vec3(a_center.xy,mix(.12*sin(a_id*2.1),.02,hero));
}
vec3 surface(vec2 uv){
 float t=clamp(uv.x,0.,1.),v=uv.y,m=u_morph;
 float membrane=smoothstep(0.,.5,m),flower=smoothstep(.5,1.,m);
 float growth=.65+.35*u_level;
 vec2 radial=vec2(cos(a_angle),sin(a_angle)),side=vec2(-radial.y,radial.x);
 if(a_kind>1.5){
  float r=a_center.z*(.035+.024*membrane+.030*flower)*(1.+.10*sin(v*PI*10.)*sin(t*PI*8.))*(1.+.25*u_rhythm.z);
  float th=t*PI,ph=v*PI;
  return orient(vec3(a_center.xy,0.018)+r*vec3(sin(th)*cos(ph),sin(th)*sin(ph),cos(th)));
 }
 if(a_kind>.5){
  float radius=a_center.z*(.014+.012*(1.-t));
  vec2 bend=vec2(.18*sin(a_id*2.1),.14*cos(a_id*1.7));
  vec2 p=a_center.xy+bend*(1.-t)*(1.-t)+side*sin(t*PI)*.06;
  float ph=v*PI;
  return orient(vec3(p+side*cos(ph)*radius,-.48*(1.-t)+sin(ph)*radius));
 }
 float envelope=pow(max(.00001,sin(PI*pow(t,.83))),.75);
 float petals=a_id==1.?8.:(a_id==0.?3.:5.+mod(a_id,5.));
 float sector=a_angle+v*PI/petals;
 float flushCohort=pow(.5+.5*cos(a_angle-u_rhythmCount.w*2.39996),3.);
 float veinDelay=.10*sin(a_angle*3.+a_id)+.06*cos(a_angle*5.-a_id)+.07*v*v;
 float front=1.12-1.25*u_rhythm.w-veinDelay;
 float release=(1.-smoothstep(front-.13,front+.12,t))*smoothstep(0.,.22,u_rhythm.w);
 float flush=release*(.25+.75*flushCohort)*(.35+.65*flower);
 float nearFrame=1.-step(.1,abs(a_id));
 float opening=mix(membrane,0.,nearFrame*.70);
 float bloom=flower*(1.-nearFrame*.70);
 float lengthScale=1.+.10*sin(a_angle*3.+a_id);
 float reach=mix(mix(.86*t-.58*t*t*t,.92*t-.32*t*t*t,opening),.99*t-.16*t*t*t,bloom)*lengthScale;
 float width=mix(mix(.19,.26,opening),.34,bloom)*(8./petals);
 vec2 p=a_center.xy+a_center.z*(radial*(reach+.22*flush*t*t)+side*(v*width*envelope*sqrt(t)+.14*sin(t*PI)*growth*(1.-bloom)));

#ifdef PHOSPHOR_LATE
 p+=side*.012*u_params[1]*sin(u_clock[0]*.40+a_id*1.3+a_angle)*t*t*(1.-membrane+flower);
#else
 p+=side*.012*u_params[1]*sin(u_time*u_params[2]*.40+a_id*1.3+a_angle)*t*t*(1.-membrane+flower);
#endif
 float cup=mix(mix(.64*t+.16*sin(t*PI),.54*t*t+.08*sin(t*PI),opening),.63*t*t-.12*sin(t*PI),bloom);
 float pleat=(.012*cos(v*PI*2.)+.075*v*v+.018*sin(t*13.+a_angle*2.)*v)*envelope*sqrt(t);
 float layer=.065*sin(a_angle*3.+a_id)*t*t;
 float rise=a_center.z*(cup+pleat+layer+(.10*u_rhythm.y-.34*flush)*t*t);
#ifdef PHOSPHOR_LATE
 rise+=.025*u_params[1]*sin(u_clock[0]*.52+a_id+t*4.)*t;
#else
 rise+=.025*u_params[1]*sin(u_time*u_params[2]*.52+a_id+t*4.)*t;
#endif
 return orient(vec3(p,rise));
}
void main(){
 vec3 p=surface(a_uv);
 vec3 du=surface(a_uv+vec2(.002,0.))-surface(a_uv-vec2(.002,0.));
 vec3 dv=surface(a_uv+vec2(0.,.002))-surface(a_uv-vec2(0.,.002));
 vec3 normal=cross(du,dv);
 v_normal=normal/max(length(normal),.00001);v_position=p;v_uv=a_uv;v_kind=a_kind;v_id=a_id;v_angle=a_angle;
 // Closed, restrained camera arc with real perspective and parallax.
 vec3 eye,R,U,F;gardenCamera(eye,R,U,F);
 vec3 q=p-eye;
 float depth=dot(q,F);
 vec2 fit=vec2(max(1.,u_aspect),max(1.,1./u_aspect));
 gl_Position=vec4(vec2(dot(q,R),dot(q,U))*gardenLens(u_aspect)*(1.+.015*clamp(u_kick,0.,1.))/fit,depth*1.0168067-.20168067,depth);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_normal,v_position;
in vec2 v_uv;
flat in float v_kind,v_id;
in float v_angle;
uniform float u_time,u_level;
uniform vec2 u_resolution;
#ifdef PHOSPHOR_LATE
uniform float u_clock[4];
#endif
uniform float u_params[8];
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
#define u_morph (u_params[0]*.5)
out vec4 outColor;
${camera}
const float PI=3.14159265359;
void main(){
 vec3 N=normalize(v_normal);if(!gl_FrontFacing)N=-N;
 vec3 eye,R,U,F;gardenCamera(eye,R,U,F);
 vec3 view=normalize(eye-v_position);
 vec3 L=normalize(vec3(-.65,-.35,.85));
 float light=max(0.,dot(N,L)),side=max(0.,dot(N,normalize(vec3(.8,.5,.35))));
 float flushCohort=pow(.5+.5*cos(v_angle-u_rhythmCount.w*2.39996),3.);
 float veinDelay=.10*sin(v_angle*3.+v_id)+.06*cos(v_angle*5.-v_id)+.07*v_uv.y*v_uv.y;
 float travel=v_uv.x-(1.12-1.25*u_rhythm.w-veinDelay);
 float veinPath=exp(-pow((v_uv.y+.07*sin(v_uv.x*9.+v_angle))/.18,2.));
 float flushBand=exp(-pow(travel/.075,2.))*smoothstep(0.,.12,u_rhythm.w);
 float wake=exp(-max(0.,-travel)*7.)*step(travel,0.)*smoothstep(0.,.16,u_rhythm.w);
 flushBand*=.18+.82*veinPath;
 float sap=exp(-pow((v_uv.x-(1.-u_rhythm.x))/.15,2.))*smoothstep(0.,.1,u_rhythm.x);
 // Secondary blossoms are scale cues, not extra hero materials. Their
 // low-frequency light avoids paying for subpixel veins/specular lobes.
 if(v_id!=1.&&v_id!=0.&&v_id!=5.&&v_id!=6.){
  float grazing=1.-abs(dot(N,view));
  vec3 small=mix(u_primary,u_secondary,.15*v_uv.x)*(.16+.50*light+.08*side);
  small+=u_primary*grazing*grazing*.08;
  if(v_kind<.5)small+=u_primary*.08*exp(-v_uv.y*v_uv.y*90.);
  small=mix(small,u_secondary*.24,smoothstep(1.1,3.3,v_position.y)*.65);
  if(v_kind<.5)small+=u_primary*.17*(1.-smoothstep(0.,1.,u_params[0]));
  if(v_kind>.5&&v_kind<1.5)small*=.42;
  if(v_kind<.5)small+=u_accent*flushBand*flushCohort*.85;
  if(v_kind>.5&&v_kind<1.5)small+=u_primary*sap*.65;
  if(v_kind>1.5)small=u_accent*(.65+.35*light+u_rhythm.z*.8+u_rhythmHit.w*.10);
  vec2 screen=gl_FragCoord.xy/u_resolution;
  float margin=min(min(screen.x,1.-screen.x),min(screen.y,1.-screen.y));
  small*=u_params[3]*smoothstep(0.,.08,margin);
  float haze=exp(-max(0.,length(eye-v_position)-3.3)*.60);
  outColor=vec4(mix(u_secondary*(.04+.14*light),small,haze),1.);return;
 }
 float fresnel=pow(1.-abs(dot(N,view)),3.);
 float spec=pow(max(0.,dot(N,normalize(L+view))),80.);
 float membrane=smoothstep(0.,.5,u_morph),flower=smoothstep(.5,1.,u_morph);
 vec3 mint=mix(u_secondary,u_primary,.65),pearl=mix(u_primary,vec3(1.),.025),gold=u_accent;
 vec3 pigment=pow(max(u_primary,vec3(0.)),vec3(1.8));
 vec3 transmitted=u_secondary/max(max(u_secondary.r,u_secondary.g),max(u_secondary.b,.05));
 vec3 blue=pow(transmitted,vec3(2.2));
 vec3 base=mix(blue*.80,pigment,pow(smoothstep(.12,1.,v_uv.x),2.5));
 float midrib=exp(-pow((v_uv.y+.035*sin(v_uv.x*11.+v_id))/.036,2.));
 float branch=abs(fract(v_uv.x*(4.+u_level)+abs(v_uv.y)*.82+.06*sin(v_uv.x*17.+v_id))-.5);
 float vein=max(midrib,exp(-branch*branch*1800.)*smoothstep(.05,.2,abs(v_uv.y))*.45);
 float fold=.5+.5*sin(v_uv.y*PI*1.6+v_uv.x*3.+.3*sin(v_uv.x*13.));
 float tissue=.5+.5*sin(v_uv.x*83.+sin(v_uv.y*37.))*sin(v_uv.y*63.+v_uv.x*19.);
 float fibres=pow(.5+.5*sin(v_uv.y*170.+sin(v_uv.x*19.+v_angle)*3.),10.);
#ifdef PHOSPHOR_LATE
 float pulse=pow(.5+.5*sin(v_uv.x*13.-u_clock[0]*.8+v_id),12.);
#else
 float pulse=pow(.5+.5*sin(v_uv.x*13.-u_time*u_params[2]*.8+v_id),12.);
#endif
 float contact=.09+.91*smoothstep(.04,.48,v_uv.x);
 float transmission=pow(max(0.,dot(-N,L)),2.);
 float selectedFold=pow(max(0.,cos(v_angle-1.2)),6.);
 vec3 color=base*(.20+light*1.35+side*.16)*contact;
 color*=.55+.45*fold;
 color*=.78+.16*tissue+.06*fibres;
 color+=base*transmission*(.45+.85*vein)*contact;
 color+=u_accent*.16*exp(-pow((v_uv.x-.28)/.13,2.))*light*contact;
 color+=transmitted*transmission*.36*selectedFold*contact;
 color+=pearl*spec*.07*contact;
 color+=base*fresnel*(.02+.10*selectedFold);
 color+=base*(.025+.40*vein+.045*fibres)*contact;
 color+=u_secondary*pulse*.15*(1.-membrane*.4);
 float edge=1.-smoothstep(max(fwidth(v_uv.y)*1.5,.007),max(fwidth(v_uv.y)*3.,.014),1.-abs(v_uv.y));
 if(v_kind<.5) {
   color+=u_primary*edge*.04*fresnel*membrane;
   color+=u_primary*(1.-membrane)*(.14+.10*pulse);
 }
 if(v_kind>.5&&v_kind<1.5)color=mint*(.025+light*.18)+pearl*spec*.20+u_primary*pulse*.08;
 if(v_kind>1.5)color=gold*(.50+light*.65)+pearl*spec*.7+gold*fresnel*.30;
 color*=u_params[3]*(v_id==1.?1.:.72);
 if(v_kind<.5){
  color+=u_primary*sap*.38;
  color+=mix(u_primary,u_accent,.80)*(flushBand*2.3+wake*vein*.50)*(.18+.82*flushCohort);
  color+=u_primary*u_rhythm.y*.24*pow(abs(v_uv.y),8.)*membrane;
 }
 if(v_kind>.5&&v_kind<1.5)color+=u_primary*sap*.8;
 if(v_kind>1.5)color+=gold*(u_rhythm.z*1.3+u_rhythmHit.w*.10);
 float atmosphere=exp(-max(0.,length(eye-v_position)-3.3)*.48);
 color=mix(u_secondary*.045,color,atmosphere);
 vec2 screen=gl_FragCoord.xy/u_resolution;
 float margin=min(min(screen.x,1.-screen.x),min(screen.y,1.-screen.y));
 color*=smoothstep(0.,.055,margin);
 outColor=vec4(max(vec3(0.),color),1.);
}`;
const schema = [
  {
    key: "development",
    label: "Development · filaments / membrane / blossom",
    min: 0,
    max: 2,
    step: 0.001,
    default: 0,
  },
  { key: "sway", label: "Living sway", min: 0, max: 2, step: 0.01, default: 1 },
  {
    key: "speed",
    label: "Motion speed",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "light",
    label: "Surface light",
    min: 0.2,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
];
const look = (name, seed, development) => ({
  name,
  seed,
  params: { development, sway: 1, speed: 1, light: 1 },
});
export default {
  id: "metamorphosis",
  number: 86,
  name: "Living Forms",
  description:
    "One connected geometric organism develops from filaments into membranes and blossoms while keeping its centres and branches.",
  development: "development",
  schema,
  presets: [
    look("First Filaments", 112, 0),
    look("Pearl Membranes", 112, 1),
    look("Open Blossom", 112, 2),
    look("Wandering Threads", 847, 0),
    look("Silver Canopy", 847, 1),
    look("Evening Blossom", 2451, 2),
  ],
  stage: ["sway", "light", "speed"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { sway: { mul: [0.6, 1.4] } },
  beat: { punch: 0.08, pulse: 0.08 },
  audio: [
    { param: "sway", feature: "low", amount: 0.06 },
    { param: "light", feature: "high", amount: 0.025 },
  ],
  rhythmStyles: {
    restrained: "Folded seed",
    driving: "Opening whorl",
    accented: "Golden emergence",
  },
  rhythm: [
    familyEffect(
      "ancestry-glow",
      0,
      "Ancestry glow",
      "Light travels from the same persistent centres.",
      {
        period: 4,
        strength: 0.65,
        duration: 1,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....... | ...x.... | ......X. | .....x..",
            division: 2,
            strength: 0.55,
            duration: 1.3,
          },
          driving: {
            steps: "X..x..X. | ..X..x..",
            division: 2,
            strength: 0.78,
            duration: 0.65,
          },
          accented: {
            steps: "X..x..X..x..X..x..X.....",
            division: 4,
            strength: 0.92,
            duration: 0.5,
          },
        },
      },
    ),
    familyEffect(
      "membrane-edge",
      1,
      "Membrane edge",
      "A soft accent traces the living surface edges.",
      {
        period: 8,
        strength: 0.55,
        duration: 1,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "..x..... | ......X. | ...x.... | ......X.",
            division: 2,
            strength: 0.48,
            duration: 1.3,
          },
          driving: {
            steps: "..x...X. | .x....X.",
            division: 2,
            strength: 0.72,
            duration: 0.9,
          },
          accented: {
            steps: "..X.....x....... | ....X......x....",
            division: 4,
            strength: 0.86,
            duration: 0.8,
          },
        },
      },
    ),
    familyEffect(
      "golden-centres",
      2,
      "Golden centres",
      "The connected centres glow together.",
      {
        period: 16,
        strength: 0.7,
        duration: 2,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | .......x | ........ | .....X..",
            division: 2,
            strength: 0.55,
            duration: 2,
          },
          driving: {
            steps: "........ | .....x.X",
            division: 2,
            strength: 0.8,
            duration: 0.75,
          },
          accented: {
            steps: "............x... | ........X..x..X.",
            division: 4,
            strength: 0.96,
            duration: 0.4,
          },
        },
      },
    ),
    familyEffect(
      "petal-flush",
      3,
      "Petal flush",
      "A coloured sap front runs out through a whorl and releases its curled petals.",
      {
        period: 8,
        strength: 1,
        duration: 0.9,
        styles: {
          restrained: {
            steps: "........ | ....X... | ........ | ......X.",
            division: 2,
            strength: 0.65,
            duration: 1.4,
          },
          driving: {
            steps: "....X... | .....X..",
            division: 2,
            strength: 1,
            duration: 1.5,
          },
          accented: {
            steps: "X.....x.....X... | ....X.....x.....",
            division: 4,
            strength: 1,
            duration: 0.7,
          },
        },
      },
    ),
  ],
  fragment: `${camera}void main(){
 float aspect=u_resolution.x/u_resolution.y;
 vec2 fit=vec2(max(1.,aspect),max(1.,1./aspect));
 vec2 p=(v_uv-.5)*2.*fit/(gardenLens(aspect)*(1.+.015*clamp(u_kick,0.,1.)));
 vec3 eye,R,U,F;gardenCamera(eye,R,U,F);
 vec3 rd=normalize(F+p.x*R+p.y*U);
 float t=(-.23-eye.z)/min(rd.z,-.001);
 vec2 q=(eye+rd*t).xy;
 float pool=exp(-dot(q,q)*.45);
 float contact=exp(-dot(q/vec2(1.1,.9),q/vec2(1.1,.9))*2.);
 float mist=smoothstep(-1.,3.,q.y);
 float farMist=1.-smoothstep(.4,3.,abs(q.y-1.8));
 vec3 color=u_secondary*(.040+.075*pool+.050*mist+.028*farMist)*(1.-.65*contact);
 float beam=q.x+q.y*.32+.10*sin(u_time*.014);
 float shaft=exp(-pow(beam*beam-1.5,2.)*1.2);
 color+=mix(u_secondary,vec3(1.),.08)*shaft*.080*(.4+.6*pool);
 outColor=vec4(color,1.);
}`,
  // t · speed integrated (clock 0, 50π: uses ×.4, ×.52, ×.8).
  clocks: [{ rate: (p) => p[2], period: 50 * Math.PI }],
  geometry: {
    create: createGeometry,
    attributes: [2, 3, 1, 1, 1],
    vertex,
    fragment: surface,
  },
};
