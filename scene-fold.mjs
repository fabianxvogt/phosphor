import { familyEffect } from "./family-rhythm.mjs";
import {
  ATTRIBUTES,
  PANELS,
  ORBIT_PERIOD,
  SWIRL_PERIOD,
  createGeometry,
} from "./fold-geometry.mjs";
// Connected pleated sheets: immutable shared cross-sections, no confetti.
const common = `
#define u_dev clamp(u_params[0],0.,2.)
const float PI=3.14159265359,TAU=6.28318530718;
float ss(float a,float b,float x){return smoothstep(a,b,x);}
float phaseAt(int x){
 vec3 b=floor(texelFetch(u_state,ivec2(x,0),0).rgb*255.+.5);
 return (b.r*65536.+b.g*256.+b.b)/16777216.;
}
void cameraAt(out vec3 cam,out vec3 f,out vec3 r,out vec3 u){
 float a=TAU*phaseAt(0);
 cam=vec3(15.5*cos(a),9.+2.*u_params[7],15.5*sin(a));
 vec3 target=vec3(0.,mix(.9,4.,ss(0.,2.,u_dev)),0.);
 f=normalize(target-cam);r=normalize(cross(vec3(0,1,0),f));u=cross(f,r);
}
vec4 project(vec3 p){
 vec3 cam,f,r,u;cameraAt(cam,f,r,u);vec3 q=p-cam;
 vec3 v=vec3(dot(q,r),dot(q,u),dot(q,f));
 float A=u_resolution.x/u_resolution.y,F=mix(2.8,2.25,ss(0.,2.,u_dev))*(1.+.02*u_kick);
 return vec4(v.x*F/max(A,1.),v.y*F*min(A,1.),(v.z*80.05-8.)/79.95,v.z);
}`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 a0;
layout(location=1) in vec4 a1;
uniform vec2 u_resolution;
uniform float u_params[8],u_kick;
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
uniform highp sampler2D u_state;
${common}
out vec3 v_world;
out vec2 v_uv;
out float v_across,v_station;
flat out vec4 v_info;
vec3 paper(float station,float across,float band,float snap){
 float id=mod(band,3.),hero=1.-step(2.5,band);
 float folded=ss(0.,1.,u_dev),storm=ss(1.,2.,u_dev);
 float t=station/${PANELS.toFixed(1)};
 float small=mix(.22+.035*mod(band,4.),1.,hero);
 float turn=-TAU*phaseAt(1)+id*TAU/3.+a1.z;
 float span=mix(.35,mix(3.9,4.1,storm),folded)*(1.-.42*snap);
 float zig=1.-2.*mod(station,2.);
 float theta=turn+(t-.5)*span+.07*zig*(1.-min(abs(across),1.))*folded;
 float pleat=(1.-2.*mod(station,2.))*mix(.10,.19,folded)*(1.+1.7*snap);
 float radius=mix(3.1,3.65+.4*id,storm)+pleat;
 float taper=.3+.7*pow(max(sin(PI*t),0.),.55);
 float width=small*mix(1.2,1.35,storm)*(1.+.08*u_params[3])*taper;
 float beta=.3+.22*folded+.83*snap+.22*u_rhythm.y;
 float av=min(abs(across),.92),hem=max(abs(across)-.92,0.);
 float radial=radius+av*width*sin(beta)-hem*width*1.8;
 float y=.8+t*mix(2.8,5.9,storm)+id*mix(.3,.55,storm)+sign(across)*(av*width*cos(beta)-hem*width*1.4);
 vec3 coil=vec3(radial*cos(theta),y,radial*sin(theta));
 vec3 sheet=vec3((t-.5)*7.6+1.1*(id-1.)+.16*zig*(1.-min(abs(across),1.)),.8+id*.52+pleat+av*.48-hem*.8+.3*sin(t*PI+id),(id-1.)*3.3+sign(across)*(av-hem)*width+.6*sin(t*TAU+id));
 vec3 p=mix(sheet,coil,folded);
 if(hero<.5){
  float a=turn+band*2.399963;
  p*=small;
  p+=vec3(cos(a)*(5.4+.12*band),1.4+.43*band,sin(a)*(5.4+.12*band));
 }
 return p;
}
void main(){
 float kind=a0.w,band=a0.z;
 v_info=vec4(kind,band,0.,a1.w);v_uv=a1.xy;v_across=a0.y;v_station=a0.x;
 vec3 p;
 if(kind<.5){p=vec3(a0.x,-.12,a0.y);}
 else{
  float presence=band<2.5?1.:ss(.15+.07*(band-3.)-.08,.15+.07*(band-3.)+.08,u_params[6]);
  if(presence<=0.){gl_Position=vec4(2.,2.,2.,1.);return;}
  float selected=1.-step(.5,abs(mod(band,3.)-mod(u_rhythmCount.w,3.)));
  // Fast closure, plateau, softer release. Geometry does the work even
  // with accent colour disabled. The entire connected sheet shares snap.
  float snap=selected*ss(.12,.38,max(u_rhythm.w,.5*u_rhythmHit.w));
  p=paper(a0.x,a0.y,band,snap);
  if(band>2.5)p*=presence;
  v_info.z=snap;
  if(kind>1.5){
   p.xz+=max(p.y+.12,0.)*vec2(.55,.32);
   // Separate from the ground by enough for DEPTH_COMPONENT16; a tiny
   // epsilon produces visible scanline z-fighting in the projected shadows.
   p.y=.20;
  }
 }
 v_world=p;gl_Position=project(p);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_world;
in vec2 v_uv;
in float v_across,v_station;
flat in vec4 v_info;
uniform float u_time,u_level,u_kick;
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
uniform highp sampler2D u_state;
${common}
out vec4 outColor;
vec3 ground(vec3 p){
 float d=length(p.xz);
 vec3 c=mix(u_secondary,u_primary,.35)*.018;
 float pool=exp(-d*d*.06);
 c+=mix(u_primary,u_secondary,.35)*pool*.055*u_params[4];
 // Soft palette reflection beneath the folded paper, not a source sprite.
 c+=u_primary*.04*exp(-p.x*p.x*.12-p.z*p.z*.045);
 c+=u_secondary*.026*exp(-p.x*p.x*.18-(p.z-2.)*(p.z-2.)*.1);
 return c*(1.-ss(12.,25.,d));
}
void main(){
 float kind=v_info.x,band=v_info.y;
 vec3 cam,f,r,u;cameraAt(cam,f,r,u);
 vec3 V=normalize(cam-v_world);
 vec3 N=normalize(cross(dFdx(v_world),dFdy(v_world)));
 if(dot(N,V)<0.)N=-N;
 vec3 col;
 if(kind<.5 || kind>1.5){
  col=ground(v_world);
  if(kind>1.5)col*=.2;
 }else{
  float id=mod(band,3.);
  float dye=id<.5?.08:(id<1.5?.85:.22);
  vec3 front=mix(u_primary,u_secondary,dye);
  vec3 back=mix(front,mix(u_secondary,u_primary,dye),.28);
  vec3 pigment=mix(front,back,gl_FrontFacing?0.:1.);
  pigment=mix(pigment,vec3(1.),.16);
  vec3 K=normalize(vec3(-.7,1.,.5));
  float key=max(dot(N,K),0.);
  float fill=.5+.12*max(N.y,0.);
  // Mountain/valley contact darkening follows actual shared creases.
  float valley=abs(v_across);
  float seam=abs(fract(v_station*.5)-.5)*2.;
  float shade=(.78+.22*ss(0.,.23,valley))*(.8+.2*ss(0.,.18,seam));
  float fibre=fract(sin(dot(v_world,vec3(127.1,311.7,74.7)))*43758.5453);
  col=pigment*(fill+.95*key)*shade*(.985+.03*fibre);
  // Reflected inner light illuminates resolved faces around a dark cavity.
  vec3 L=normalize(vec3(0.,3.2,0.)-v_world);
  float inner=max(dot(N,L),0.)*exp(-length(v_world.xz)*.15);
  col+=pigment*inner*.22*u_params[4]*(1.+.8*u_rhythm.z);
  float edge=1.-ss(0.,max(fwidth(valley)*1.6,.015),1.-valley);
  float crease=1.-ss(0.,max(fwidth(valley)*1.6,.012),valley);
  float selected=pow(.5+.5*cos(band*2.399963-u_rhythmCount.x*2.399963),8.);
  col+=mix(u_primary,u_secondary,.3)*edge*.045*u_params[5];
  col+=u_accent*selected*u_rhythm.x*(edge+.25*crease)*.55*u_params[5];
  col+=u_accent*v_info.z*crease*.7;
  col*=band<2.5?1.:.45;
  float fog=1.-exp(-max(length(cam-v_world)-11.,0.)*.055);
  col=mix(col,mix(u_primary,u_secondary,.5)*.009,fog);
 }
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
const fragment = `
void main(){
 vec3 c=mix(u_secondary,u_primary,.3)*.008;
 c*=.7+.3*v_uv.y;
 outColor=vec4(c,1.);
}`;
const simulation = `
void main(){
 int x=int(gl_FragCoord.x);
 vec3 b=floor(texelFetch(u_state,ivec2(x,0),0).rgb*255.+.5);
 uint n=(uint(b.r)<<16u)|(uint(b.g)<<8u)|uint(b.b);
 float rate=x==0?clamp(u_params[1],0.,2.)/${ORBIT_PERIOD.toFixed(1)}:clamp(u_params[2],0.,2.)/${SWIRL_PERIOD.toFixed(1)};
 if(u_reset)n=seedHash(u_seedBits+uint(x)*7919u)&16777215u;
 else n=(n+uint(floor(u_dt*rate*16777216.+.5)))&16777215u;
 outColor=vec4(float(n>>16u),float((n>>8u)&255u),float(n&255u),255.)/255.;
}`;
const schema = [
  {
    key: "development",
    label: "Development · sheet / fold / shards",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "drift",
    label: "Orbit speed",
    min: 0.1,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "swirl",
    label: "Vortex speed",
    min: 0.1,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "streak",
    label: "Shard streaks",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "light",
    label: "Core light",
    min: 0.2,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  { key: "rims", label: "Edge glow", min: 0, max: 2, step: 0.01, default: 1 },
  {
    key: "density",
    label: "Small solids",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.55,
  },
  {
    key: "crane",
    label: "Crane height",
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
    swirl: 1,
    streak: 1,
    light: 1,
    rims: 1,
    density: 0.55,
    crane: 0,
    ...params,
  },
});
export default {
  id: "fold",
  number: 91,
  name: "Polyhedral Folding",
  description:
    "Connected pleated paper sheets fold into open coils, then sweep around a dark storm cavity. A crease strike closes a whole paper band.",
  development: "development",
  schema,
  presets: [
    look("Creased Sheet", 527, 0),
    look("Rising Solids", 527, 1),
    look("Shard Storm", 527, 2),
    look("Blueprint Field", 1931, 0.35, { crane: 0.8, rims: 1.6, drift: 0.6 }),
    look("Tumbling Choir", 88, 1.15, { swirl: 1.5, light: 1.3, density: 0.9 }),
    look("Slow Comet Ring", 3307, 1.75, {
      swirl: 0.6,
      streak: 1.8,
      drift: 0.7,
      crane: 0.35,
    }),
    look("Paper Lanterns", 777, 0.75, {
      light: 1.5,
      rims: 1.4,
      density: 0.8,
      drift: 0.6,
    }),
    look("Glass Asteroids", 4096, 1.35, {
      swirl: 0.45,
      streak: 0.3,
      crane: 0.25,
      light: 1.2,
    }),
  ],
  stage: ["swirl", "streak", "light"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    drift: { mul: [0.7, 1.4] },
    swirl: { mul: [0.6, 1.5] },
    streak: { mul: [0.5, 1.6] },
    density: [0, 0.45],
  },
  beat: { punch: 0.06, pulse: 0.06 },
  audio: [
    { param: "streak", feature: "low", amount: 0.06 },
    { param: "rims", feature: "high", amount: 0.05 },
  ],
  rhythmStyles: {
    restrained: "Paper hush",
    driving: "Crease dance",
    accented: "Thousand cranes",
  },
  rhythm: [
    familyEffect(
      "edge-flash",
      0,
      "Edge flash",
      "A moving cohort of paper edges catches an accent.",
      {
        period: 4,
        strength: 0.6,
        duration: 0.5,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X.....x. | ...x..X.",
            division: 2,
            strength: 0.5,
            duration: 0.65,
          },
          driving: {
            steps: "X.x.Xx.X | .X.xX.Xx",
            division: 2,
            strength: 0.9,
            duration: 0.35,
          },
          accented: {
            steps: "X.x.X.xX.xX.x.X. | .xX.x.X.Xx.xX.x.",
            division: 4,
            strength: 1,
            duration: 0.2,
          },
        },
      },
    ),
    familyEffect(
      "fold-breath",
      1,
      "Fold breath",
      "All hinges open slightly and close again.",
      {
        period: 8,
        strength: 0.6,
        duration: 1,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "....x... | .X......",
            division: 2,
            strength: 0.5,
            duration: 1.25,
          },
          driving: {
            steps: "...X.... | ......x.",
            division: 2,
            strength: 0.74,
            duration: 1.1,
          },
          accented: {
            steps: ".....X......x... | ...X........x...",
            division: 4,
            strength: 0.88,
            duration: 0.8,
          },
        },
      },
    ),
    familyEffect(
      "core-flare",
      2,
      "Core flare",
      "The light core flares and lights every face.",
      {
        period: 16,
        strength: 0.7,
        duration: 2,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | .......X | ........",
            division: 2,
            strength: 0.55,
            duration: 2,
          },
          driving: {
            steps: "........ | .....x.X | ........ | ......xX",
            division: 2,
            strength: 0.8,
            duration: 0.4,
          },
          accented: {
            steps: "................ | .........x..X.xx",
            division: 4,
            strength: 0.96,
            duration: 0.18,
          },
        },
      },
    ),
    familyEffect(
      "crease-snap",
      3,
      "Crease snap",
      "A sector of paper snaps into a new fold on the accent.",
      {
        period: 8,
        strength: 0.9,
        duration: 0.65,
        kind: "motion",
        styles: {
          restrained: {
            steps: "......x. | ........ | ....X... | ........",
            division: 2,
            strength: 0.6,
            duration: 0.9,
          },
          driving: {
            steps: "..X..... | .....X..",
            division: 2,
            strength: 0.95,
            duration: 0.9,
          },
          accented: {
            steps: "..X.......X..... | ......X.......X.",
            division: 4,
            strength: 1,
            duration: 0.7,
          },
        },
      },
    ),
  ],
  fragment,
  simulation: { fragment: simulation, size: [2, 1], steps: 1 },
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    vertex,
    fragment: surface,
  },
};
