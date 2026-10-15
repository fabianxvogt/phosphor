import { familyEffect } from "./family-rhythm.mjs";
import { createGeometry } from "./metamorphosis-geometry.mjs";
// The same connected mesh develops continuously: spokes fill into membranes,
// then separate and curl into petals. This is authored geometry, not biology.
const camera = `
float gardenLens(float aspect){return mix(2.75,3.03,smoothstep(1.,1.5,aspect));}
void gardenCamera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float yaw=.26*sin(u_time*.025)+.08*sin(u_time*.017);
 eye=vec3(2.55*sin(yaw),-2.55*cos(yaw),3.65);
 F=normalize(vec3(0.,0.,.18)-eye);
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
uniform float u_time,u_kick;
#ifdef PHOSPHOR_LATE
uniform float u_clock[4];
#endif
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec4 u_rhythm;
#define u_morph (u_params[0]*.5)
#define u_aspect (u_resolution.x/u_resolution.y)
#define u_inset 0.0
out vec3 v_normal,v_position;
out vec2 v_uv;
flat out float v_kind,v_id;
${camera}
const float PI=3.14159265359;
vec3 surface(vec2 uv){
 float t=clamp(uv.x,0.,1.),v=uv.y,m=u_morph;
 float membrane=smoothstep(0.,.5,m),flower=smoothstep(.5,1.,m);
 vec2 radial=vec2(cos(a_angle),sin(a_angle)),side=vec2(-radial.y,radial.x);
 if(a_kind>1.5){
  float r=a_center.z*(.018+.025*membrane+.025*flower);
  float th=t*PI,ph=v*PI;
  return vec3(a_center.xy,0.018)+r*vec3(sin(th)*cos(ph),sin(th)*sin(ph),cos(th));
 }
 if(a_kind>.5){
  float radius=mix(.005,.011,membrane)*(.7+.3*sin(t*PI));
  vec2 p=a_center.xy+radial*t*a_center.z+side*sin(t*PI)*(.065+.02*sin(a_id*2.));
  float ph=v*PI;
  return vec3(p+side*cos(ph)*radius,-.16+.03*sin(t*PI)+sin(ph)*radius);
 }
 float envelope=pow(max(.00001,sin(PI*pow(t,.83))),.75);
 float petals=7.+mod(a_id,2.);
 float sector=a_angle+v*PI/petals;
 vec2 filament=radial*(t*.70)+side*(v*.012*envelope);
 vec2 sheet=vec2(cos(sector),sin(sector))*t*.70;
 vec2 petal=radial*(t*.98-.16*t*t*t)+side*(v*.29*envelope);
 vec2 p=a_center.xy+a_center.z*mix(mix(filament,sheet,membrane),petal,flower);
#ifdef PHOSPHOR_LATE
 p+=side*.012*u_params[1]*sin(u_clock[0]*.40+a_id*1.3+a_angle)*t*t*(1.-membrane+flower);
#else
 p+=side*.012*u_params[1]*sin(u_time*u_params[2]*.40+a_id*1.3+a_angle)*t*t*(1.-membrane+flower);
#endif
 float sheetRise=a_center.z*(.10*sin(t*PI)+.014*sin(sector*petals)*t*t);
 float petalRise=a_center.z*(.62*t*t-.12*sin(t*PI)+.016*cos(v*PI*2.)*envelope+.10*v*v*envelope);
 petalRise+=a_center.z*.025*u_rhythm.y*t*t;
 float filamentRise=.025*sin(t*PI)+.012*sqrt(max(0.,1.-v*v))*envelope;
 float rise=mix(mix(filamentRise,sheetRise,membrane),petalRise,flower);
#ifdef PHOSPHOR_LATE
 rise+=.008*u_params[1]*sin(u_clock[0]*.52+a_id+t*4.)*t;
#else
 rise+=.008*u_params[1]*sin(u_time*u_params[2]*.52+a_id+t*4.)*t;
#endif
 return vec3(p,rise);
}
void main(){
 vec3 p=surface(a_uv);
 vec3 du=surface(a_uv+vec2(.002,0.))-surface(a_uv-vec2(.002,0.));
 vec3 dv=surface(a_uv+vec2(0.,.002))-surface(a_uv-vec2(0.,.002));
 vec3 normal=cross(du,dv);
 v_normal=normal/max(length(normal),.00001);v_position=p;v_uv=a_uv;v_kind=a_kind;v_id=a_id;
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
uniform float u_time,u_level;
#ifdef PHOSPHOR_LATE
uniform float u_clock[4];
#endif
uniform float u_params[8];
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm;
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
 // Secondary blossoms are scale cues, not extra hero materials. Their
 // low-frequency light avoids paying for subpixel veins/specular lobes.
 if(v_id!=1.){
  float grazing=1.-abs(dot(N,view));
  vec3 small=mix(u_secondary,u_primary,.30+.25*v_uv.x)*(.045+.50*light+.08*side);
  small+=mix(u_secondary,u_primary,.35)*grazing*grazing*.22;
  if(v_kind<.5)small+=mix(u_primary,vec3(1.),.15)*.35*(1.-smoothstep(0.,1.,u_params[0]));
  if(v_kind>1.5)small=u_accent*(.65+.35*light+u_rhythm.z*.8);
  small*=u_params[3];
  float haze=exp(-max(0.,length(eye-v_position)-3.3)*.48);
  outColor=vec4(mix(mix(u_secondary,u_primary,.15)*.022,small,haze),1.);return;
 }
 float fresnel=pow(1.-abs(dot(N,view)),3.);
 float spec=pow(max(0.,dot(N,normalize(L+view))),80.);
 float membrane=smoothstep(0.,.5,u_morph),flower=smoothstep(.5,1.,u_morph);
 vec3 mint=mix(u_secondary,u_primary,.42),pearl=mix(u_primary,vec3(1.),.25),gold=u_accent;
 vec3 base=mix(u_secondary,u_primary,.22+.40*v_uv.x);
 base=mix(base,pearl,flower*.25);
 float rib=pow(abs(cos(v_uv.y*PI*3.)),20.);
#ifdef PHOSPHOR_LATE
 float pulse=pow(.5+.5*sin(v_uv.x*13.-u_clock[0]*.8+v_id),12.);
#else
 float pulse=pow(.5+.5*sin(v_uv.x*13.-u_time*u_params[2]*.8+v_id),12.);
#endif
 float contact=.40+.60*smoothstep(.02,.42,v_uv.x);
 float transmission=pow(max(0.,dot(-N,L)),2.)*.32;
 vec3 color=base*(.035+light*.64+side*.12+transmission)*contact;
 color*=1.-membrane*.12*rib;
 color+=pearl*spec*1.45*contact;
 color+=mix(u_secondary,vec3(1.),.20)*fresnel*.55;
 color+=u_primary*pulse*.10*(1.-membrane*.4);
 float edge=1.-smoothstep(max(fwidth(v_uv.y)*1.5,.007),max(fwidth(v_uv.y)*3.,.014),1.-abs(v_uv.y));
 if(v_kind<.5) {
   color+=pearl*edge*(.18+.45*fresnel)*membrane;
   color+=pearl*(1.-membrane)*(.48+.65*pulse);
 }
 if(v_kind>.5&&v_kind<1.5)color=mint*(.04+light*.22)+pearl*spec*.5+u_primary*pulse*.30;
 if(v_kind>1.5)color=gold*(.85+light*.65)+pearl*spec*2.2+gold*fresnel*.30;
 color*=u_params[3];
 color+=pearl*u_rhythm.x*.38*pow(1.-v_uv.x,2.);
 color+=pearl*u_rhythm.y*.40*edge*membrane;
 if(v_kind>1.5)color+=gold*u_rhythm.z*1.3;
 float atmosphere=exp(-max(0.,length(eye-v_position)-3.3)*.48);
 color=mix(mix(u_secondary,u_primary,.15)*.022,color,atmosphere);
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
  rhythm: [
    familyEffect(
      "ancestry-glow",
      0,
      "Ancestry glow",
      "Light travels from the same persistent centres.",
      { period: 4, strength: 0.65, duration: 1 },
    ),
    familyEffect(
      "membrane-edge",
      1,
      "Membrane edge",
      "A soft accent traces the living surface edges.",
      { period: 8, strength: 0.55, duration: 1 },
    ),
    familyEffect(
      "golden-centres",
      2,
      "Golden centres",
      "The connected centres glow together.",
      { period: 16, strength: 0.7, duration: 2 },
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
 vec3 color=u_secondary*(.030+.045*pool+.028*mist+.018*farMist)*(1.-.55*contact);
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
