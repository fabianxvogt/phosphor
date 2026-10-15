import { familyEffect } from "./family-rhythm.mjs";
import { createGeometry } from "./metamorphosis-geometry.mjs";
// The same connected mesh develops continuously: spokes fill into membranes,
// then separate and curl into petals. This is authored geometry, not biology.
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_uv;
layout(location=1) in vec3 a_center;
layout(location=2) in float a_angle;
layout(location=3) in float a_kind;
layout(location=4) in float a_id;
uniform float u_time;
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
  return vec3(p+side*cos(ph)*radius,-.075+.09*sin(t*PI)+sin(ph)*radius);
 }
 float envelope=pow(max(.00001,sin(PI*pow(t,.83))),.75);
 float petals=7.+mod(a_id,2.);
 float sector=a_angle+v*PI/petals;
 vec2 filament=radial*(t*.70)+side*(v*.012*envelope);
 vec2 sheet=vec2(cos(sector),sin(sector))*t*.70;
 vec2 petal=radial*(t*.88)+side*(v*.195*envelope);
 vec2 p=a_center.xy+a_center.z*mix(mix(filament,sheet,membrane),petal,flower);
#ifdef PHOSPHOR_LATE
 p+=side*.012*u_params[1]*sin(u_clock[0]*.40+a_id*1.3+a_angle)*t*t*(1.-membrane+flower);
#else
 p+=side*.012*u_params[1]*sin(u_time*u_params[2]*.40+a_id*1.3+a_angle)*t*t*(1.-membrane+flower);
#endif
 float sheetRise=a_center.z*(.10*sin(t*PI)+.014*sin(sector*petals)*t*t);
 float petalRise=a_center.z*(.34*t*t-.13*sin(t*PI)+.012*cos(v*PI*2.)*envelope+.065*v*v*envelope);
 float rise=mix(mix(.025*sin(t*PI),sheetRise,membrane),petalRise,flower);
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
 float scale=max(1.30,1.80/u_aspect);
 vec2 screen=vec2(p.x/(scale*u_aspect),(p.y*.87+p.z*.65+.07)/scale);
 screen*=1.-u_inset; screen.y-=u_inset;
 gl_Position=vec4(screen,(p.y*.14-p.z*.40),1.);
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
const float PI=3.14159265359;
void main(){
 vec3 N=normalize(v_normal);if(!gl_FrontFacing)N=-N;
 vec3 view=normalize(vec3(0.,-.45,1.));
 vec3 L=normalize(vec3(-.55,.7,1.));
 float light=max(0.,dot(N,L)),side=max(0.,dot(N,normalize(vec3(.8,-.4,.35))));
 float fresnel=pow(1.-abs(dot(N,view)),2.6);
 float spec=pow(max(0.,dot(N,normalize(L+view))),48.);
 float membrane=smoothstep(0.,.5,u_morph),flower=smoothstep(.5,1.,u_morph);
 vec3 mint=mix(u_secondary,u_primary,.68),pearl=mix(u_primary,vec3(1.),.20),gold=u_accent;
 vec3 base=mix(mint,pearl,flower*.78);
 base=mix(base,gold,flower*.19*pow(1.-v_uv.x,3.));
 float rib=pow(abs(cos(v_uv.y*PI*3.)),20.);
 float crossVein=pow(.5+.5*cos(v_uv.x*96.+abs(v_uv.y)*17.),22.);
#ifdef PHOSPHOR_LATE
 float pulse=pow(.5+.5*sin(v_uv.x*13.-u_clock[0]*.8+v_id),12.);
#else
 float pulse=pow(.5+.5*sin(v_uv.x*13.-u_time*u_params[2]*.8+v_id),12.);
#endif
 vec3 color=base*(.16+light*.64+side*.13);
 color*=1.-membrane*.14*rib;
 color+=base*crossVein*.055*membrane;
 color+=vec3(.88,.96,.83)*spec*.42;
 color+=mint*fresnel*.24+gold*flower*fresnel*.11;
 color+=mix(mint,gold,.25)*pulse*.16*(1.-membrane*.5);
 color+=mint*(1.-membrane)*.32;
 if(v_kind>.5&&v_kind<1.5) color=mint*(.12+light*.38)+pearl*spec*.2+mint*pulse*.13;
 if(v_kind>1.5)color=gold*(.28+.72*light)+pearl*spec*.55;
 float edge=smoothstep(.80,1.,abs(v_uv.y));
 if(v_kind<.5)color+=base*edge*.20*membrane;
 color*=u_params[3]*(.78+.44*u_level);
 color+=mint*u_rhythm.x*.12*pow(1.-v_uv.x,2.);
 color+=pearl*u_rhythm.y*.10*pow(abs(v_uv.y),4.);
 if(v_kind>1.5)color+=gold*u_rhythm.z*.18;
 outColor=vec4(pow(max(vec3(0.),color),vec3(.86)),1.);
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
  energy: { sway: { mul: [0.6, 1.4] }, light: { mul: [0.75, 1.25] } },
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
  fragment: `void main(){vec2 p=v_uv-.5;float glow=exp(-dot(p,p)*3.5);outColor=vec4(mix(u_secondary*.045,u_secondary*.10,glow),1.);}`,
  // t · speed integrated (clock 0, 50π: uses ×.4, ×.52, ×.8).
  clocks: [{ rate: (p) => p[2], period: 50 * Math.PI }],
  geometry: {
    create: createGeometry,
    attributes: [2, 3, 1, 1, 1],
    vertex,
    fragment: surface,
  },
};
