import { familyEffect } from "./family-rhythm.mjs";
import { createGeometry, ATTRIBUTES } from "./aurora-model.mjs";

// Aurora Veil (#106). Three folded material sheets extruded along ONE
// parallel magnetic field. The same curves approach as the camera cranes
// into their zenith vanishing point. No respawning, state switches or march.
const common = `
const float AV_PI=3.14159265359, AV_TAU=6.28318530718;
const vec3 AV_B=vec3(.035,1.,-.025);
float avDev(){return clamp(u_params[0],0.,2.);}
float avSeed(){return fract(mod(u_seed,8192.)*.61803398875);}
float avFocal(){
 float c=smoothstep(1.,2.,avDev());
 return 1.3*(1.-.17*sin(AV_PI*c))*(1.+.018*u_kick)/mix(1.,max(1.,u_params[5]),c);
}
void avCamera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float a=u_clock[1],c=smoothstep(1.,2.,avDev());
 eye=vec3(.8*sin(a),1.25+.12*sin(2.*a),.65*cos(a));
 float yaw=.04*sin(a),pitch=.12+.1*smoothstep(0.,1.,avDev())+1.29*smoothstep(0.,.82,c)+u_params[6];
 F=vec3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch));
 R=normalize(cross(vec3(0.,1.,0.),F));U=cross(F,R);
}
vec3 avPoint(vec2 uv,float sheet){
 float rise=smoothstep(0.,1.,avDev()),crown=smoothstep(1.,2.,avDev()),phase=u_clock[0];
 float theta=(uv.x-.5)*mix(2.6,5.95,crown)+sheet*.13+(avSeed()-.5)*.35;
 float w=theta*5.+phase+sheet*2.3;
 float kink=sin(w+.65*sin(2.*w-phase));
 float radius=mix(24.+sheet*7.,7.+sheet*2.,crown)*u_params[5];
 float ripple=(.65+1.65*rise)*u_params[2]*kink+.6*sin(9.*theta-2.*phase);
 float r=radius+ripple;
 float bend=theta+.11*rise*u_params[2]*sin(8.*theta-phase+sheet);
 float bottom=mix(7.3+sheet*.6+3.5*cos(theta)+rise*(3.+2.5*sin(3.*theta+phase)),19.+sheet*3.5+2.*sin(3.*theta+phase),crown);
 vec3 base=vec3(r*sin(bend),bottom,mix(27.+sheet*4.,0.,crown)+r*cos(bend));
 float len=(8.8+20.*rise+31.*crown)*u_params[3]*(.8+.2*sin(4.*theta-phase+sheet));
 return base+AV_B*len*uv.y;
}
// A winding snow shore leaves the central ice dark and open.
float avIce(vec2 p){
 float shore=17.+3.*sin(p.y*.065)+2.*sin(p.y*.14+.6);
 return smoothstep(-1.5,1.5,shore-abs(p.x));
}
`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_uv;
layout(location=1) in float a_sheet;
layout(location=2) in float a_mirror;
uniform float u_seed,u_kick;
uniform float u_params[8];
uniform float u_clock[4];
uniform vec2 u_resolution;
${common}
out vec2 v_uv;
out vec3 v_world,v_normal;
flat out float v_sheet,v_mirror;
void main(){
 vec3 p=avPoint(a_uv,a_sheet);
 vec3 tangent=avPoint(a_uv+vec2(.0002,0.),a_sheet)-avPoint(a_uv-vec2(.0002,0.),a_sheet);
 v_normal=normalize(cross(tangent,AV_B));v_world=p;
 v_uv=a_uv;v_sheet=a_sheet;v_mirror=a_mirror;
 if(a_mirror>.5)p.y=-p.y;
 vec3 eye,R,U,F;avCamera(eye,R,U,F);vec3 q=p-eye;
 float z=dot(q,F),nearZ=.05,farZ=250.;
 vec2 extent=u_resolution/min(u_resolution.x,u_resolution.y);
 gl_Position=vec4(vec2(dot(q,R),dot(q,U))*avFocal()/extent,(farZ+nearZ)/(farZ-nearZ)*z-2.*farZ*nearZ/(farZ-nearZ),z);
}
`;
const surface = `#version 300 es
precision highp float;
uniform float u_seed,u_kick,u_level;
uniform float u_params[8];
uniform float u_clock[4];
uniform vec2 u_resolution;
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmCount;
in vec2 v_uv;
in vec3 v_world,v_normal;
flat in float v_sheet,v_mirror;
out vec4 outColor;
${common}
void main(){
 vec3 eye,R,U,F;avCamera(eye,R,U,F);
 float u=v_uv.x*AV_TAU, h=v_uv.y,phase=u_clock[0],rise=smoothstep(0.,1.,avDev());
 // Field-aligned ray density. Footprint filters the finest rays, not a
 // pixel-sized random texture: stable at 4K and during the overhead tilt.
 float q=u*48.+2.3*sin(u*13.+phase)+.8*sin(u*31.-phase)+v_sheet*4.;
 float fw=max(fwidth(q),.001);
 float fine=.5+.5*cos(q*3.);
 fine=mix(fine,.5,smoothstep(.35,1.5,fw*3.));
 float rayPhase=q+1.7*sin(q*.37)+.6*sin(q*1.73);
 float rayFoot=max(fwidth(rayPhase),.001);
 float rayDistance=abs(mod(rayPhase-AV_PI*.5+AV_PI,AV_TAU)-AV_PI);
 float rayWidth=max(.42,rayFoot*.8);
 float rayCore=exp(-pow(rayDistance/rayWidth,2.))*.42/rayWidth;
 rayCore=mix(rayCore,.1185,smoothstep(1.,3.,rayFoot));
 float rays=rayCore*(.25+.75*fine);
 float gaps=.28+.72*pow(.5+.5*sin(u*17.+1.8*sin(u*5.-phase)+v_sheet),2.);
 float folds=.35+.65*pow(.5+.5*sin(u*9.+phase+v_sheet),2.);
 float detail=mix(.23,.76,clamp(u_params[4]+u_level*.25,0.,1.));
 float density=mix(.16+folds*.16,.055+rays*1.9+folds*.11,detail)*gaps;
 float tip=.48+.25*sin(u*7.-phase)+.15*sin(u*19.+phase);
 float heightFade=exp(-h*2.8)*(1.-smoothstep(tip,1.,h));
 float edge=exp(-h*65.);
 float baseFade=smoothstep(0.,.018,h);
 float facing=abs(dot(normalize(v_normal),normalize(eye-v_world)));
 float optical=min(1.9,1./max(facing,.52));
 float cohort=exp(-pow((sin(u-u_rhythmCount.x*.73-v_sheet)*4.),2.))*u_rhythm.x;
 float sweep=exp(-pow((h-(1.-u_rhythm.y))/.12,2.))*u_rhythm.y;
 float foldPulse=exp(-pow(sin(u*2.-u_rhythmCount.z*.41)*5.,2.))*u_rhythm.z;
 vec3 ink=mix(u_primary,mix(u_secondary,vec3(1.),.12),smoothstep(.025,.48,h)*.95);
 float endFade=smoothstep(0.,.08,v_uv.x)*(1.-smoothstep(.92,1.,v_uv.x));
 vec3 col=ink*(density*heightFade*(1.4-rise*.2)+edge*.2)*baseFade*optical*endFade*.8;
 col+=mix(u_primary,vec3(1.),.18)*rays*heightFade*cohort*.3*endFade;
 // A broad emission layer under the filaments reads as ionised air,
 // not just a set of electric wires. Its lower edge remains the hero.
 float veil=exp(-pow((h-.075)/.17,2.))*(.08+.18*folds)*gaps;
 col+=u_primary*veil*baseFade*endFade*(1.-.25*rise);
 col+=u_secondary*sweep*rays*.3;
 col+=u_accent*edge*foldPulse*.35*endFade;
 col+=mix(u_primary,vec3(1.),.12)*rays*edge*.18*(1.+.25*u_kick)*endFade;
 // An almost edge-on triangle is an unresolved slice of the sheet.
 // Fade only that vanishing footprint rather than sparkling at its edge.
 float coverage=1.-smoothstep(.006,.035,fwidth(v_uv.x));
 col*=exp(-length(v_world-eye)*.006)*coverage;
 if(v_mirror>.5){
  vec3 mp=vec3(v_world.x,-v_world.y,v_world.z);
  float t=eye.y/(eye.y-mp.y);vec3 floorP=mix(eye,mp,t);
  float frost=.86+.14*sin(floorP.x*1.7+floorP.z*.4)*sin(floorP.z*.81);
  float fres=.18+.5*pow(1.-abs(normalize(mp-eye).y),3.);
  col*=avIce(floorP.xz)*frost*fres*u_params[7]*exp(-length(floorP.xz)*.003);
 }
 outColor=vec4(max(col,vec3(0.)),0.);
}
`;
const fragment = `
uniform float u_clock[4];
${common}
float avHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+u_seed*.17)*43758.5453);}
float avStars(vec3 rd,float scale){
 // Spherical coordinates, pole-safe for the overhead camera.
 vec2 p=rd.xz/(1.+abs(rd.y))*scale;
 vec2 cell=floor(p),f=fract(p),rnd=vec2(avHash(cell),avHash(cell+71.));
 vec2 delta=f-(.12+.76*rnd);
 float footprint=max(length(dFdx(p)),length(dFdy(p)));
 float radius=max(.018,footprint*.65);
 float star=exp(-dot(delta,delta)/(radius*radius));
 return star*step(.91,avHash(cell+19.))*min(1.,.025/(radius*radius))*(.2+.8*rnd.y);
}
void main(){
 vec3 eye,R,U,F;avCamera(eye,R,U,F);
 vec2 screen=(v_uv-.5)*2.*u_resolution/min(u_resolution.x,u_resolution.y);
 vec3 rd=normalize(F+R*screen.x/avFocal()+U*screen.y/avFocal());
 vec3 skyInk=mix(u_secondary,u_primary,.28);
 vec3 col=skyInk*(.003+.023*exp(-pow((rd.y-.015)/.12,2.)));
 vec3 sr=rd;
 bool ground=rd.y<0.;
 if(ground)sr.y=-sr.y;
 float stars=avStars(sr,120.)+avStars(sr,59.)*.8;
 col+=mix(u_secondary,vec3(1.),.7)*stars*.55*smoothstep(0.,.07,sr.y)*(ground?.2:1.);
 // Distant snow ridges and a raking palette rim, against a stable horizon.
 float az=atan(rd.x,rd.z);
 float ridge=.012+.014*sin(az*11.+avSeed()*6.)+.009*sin(az*27.)+.004*sin(az*71.);
 float aa=max(fwidth(rd.y-ridge),.0002);
 float land=1.-smoothstep(ridge-aa,ridge+aa,rd.y);
 if(!ground){
  float rim=exp(-pow((rd.y-ridge)/.0025,2.));
  col=mix(col,skyInk*.008,land)+u_secondary*rim*.065;
 }else{
  float t=-eye.y/rd.y;vec3 p=eye+rd*t;
  float ice=avIce(p.xz),fog=exp(-t*.009);
  float ridgeLight=.35+.65*(.5+.5*sin(p.z*.075+p.x*.17));
  vec3 snow=mix(mix(u_secondary,u_primary,.15),vec3(1.),.13)*(.11+.2*ridgeLight);
  // Wind-cut snow ridges: resolved striations with a near-bank shadow.
  float bands=.5+.5*sin(p.x*.9+p.z*.12+2.*sin(p.z*.11));
  vec3 normal=normalize(vec3(-.4*cos(p.x*.9+p.z*.12),1.,-.17*cos(p.z*.11)));
  float key=max(dot(normal,normalize(vec3(-.6,.4,.5))),0.);
  snow*=(.5+.5*bands)*(.45+.9*key);
  float bank=exp(-pow((abs(p.x)-(17.+3.*sin(p.z*.065)+2.*sin(p.z*.14+.6)))/1.1,2.));
  snow+=mix(u_secondary,vec3(1.),.2)*bank*.09;
  col=mix(col*.5+skyInk*.009,snow,(1.-ice)*fog);
  // Sparse, branching stresses beneath the glass; derivative AA and
  // distance fade avoid a grid or moiré on the frozen lake.
  float crackP=p.x*.18+sin(p.z*.09)+.22*sin(p.z*.31);
  float crackD=abs(sin(crackP));
  float width=max(fwidth(crackP)*.8,.001);
  float crack=(1.-smoothstep(width,width*2.,crackD))*exp(-t*.025)*ice;
  col+=u_secondary*crack*.034;
  col+=u_primary*.012*ice*exp(-pow(p.x/16.,2.))*fog;
 }
 outColor=vec4(max(col,vec3(0.)),1.);
}
`;
const schema = [
  {
    key: "development",
    label: "Development · glow / curtains / corona",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "travel",
    label: "Auroral travel",
    min: 0.1,
    max: 1.5,
    step: 0.01,
    default: 0.65,
  },
  {
    key: "fold",
    label: "Magnetic folds",
    min: 0.25,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "height",
    label: "Ray reach",
    min: 0.5,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
  {
    key: "detail",
    label: "Ray density",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "spread",
    label: "Curtain span",
    min: 0.7,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
  {
    key: "tilt",
    label: "Polar elevation",
    min: -0.15,
    max: 0.15,
    step: 0.01,
    default: 0,
  },
  {
    key: "mirror",
    label: "Frozen mirror",
    min: 0.2,
    max: 1,
    step: 0.01,
    default: 0.85,
  },
];
const base = {
  travel: 0.65,
  fold: 1,
  height: 1,
  detail: 0.6,
  spread: 1,
  tilt: 0,
  mirror: 0.85,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
export default {
  id: "aurora",
  number: 106,
  name: "Aurora Veil",
  description:
    "Folded curtains of field-aligned light travel over a frozen lake, then gather into an overhead magnetic corona. The same rays throughout.",
  development: "development",
  schema,
  presets: [
    look("Glow", 1061, 0),
    look("Curtains", 1061, 1),
    look("Corona", 1061, 2),
    look("Icebound Arc", 1062, 0.25, {
      spread: 1.35,
      height: 0.6,
      travel: 0.25,
      tilt: -0.1,
    }),
    look("Silent Meridian", 1063, 0.8, {
      fold: 0.35,
      spread: 0.75,
      height: 1.25,
      detail: 0.3,
    }),
    look("Pleated Night", 1064, 1.15, {
      fold: 1.45,
      spread: 1.2,
      detail: 0.9,
      travel: 0.85,
    }),
    look("Zenith Bloom", 1065, 2, {
      spread: 0.75,
      height: 1.3,
      fold: 0.65,
      travel: 0.35,
      tilt: 0.1,
    }),
    look("Magnetic Thaw", 1066, 1.65, {
      spread: 1.3,
      fold: 1.3,
      height: 0.7,
      mirror: 1,
      tilt: -0.12,
    }),
  ],
  fragment,
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    additiveFrom: 0,
    vertex,
    fragment: surface,
  },
  stage: ["travel", "fold", "height"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { travel: { mul: [0.75, 1.35] }, detail: [0, 0.15] },
  beat: { punch: 0.08, pulse: 0.08 },
  rhythm: [
    familyEffect(
      "ray-packet",
      0,
      "Ray packet",
      "A local cohort of persistent field-aligned rays catches a travelling pulse.",
      { period: 4, strength: 0.6, duration: 1.5 },
    ),
    familyEffect(
      "upward-fold",
      1,
      "Upward fold",
      "A soft excitation travels upward along the existing magnetic curtain.",
      { period: 8, strength: 0.65, duration: 2.5, kind: "motion" },
    ),
    familyEffect(
      "polar-hem",
      2,
      "Polar hem",
      "A few folds on the lower auroral edge receive a rare accent.",
      { period: 16, strength: 0.65, duration: 3 },
    ),
  ],
  // All uses of phase are integer multiples inside sin/cos. Development
  // and energy never re-anchor either the material or the camera phase.
  clocks: [
    { rate: (p) => p[1] * 0.22, period: 2 * Math.PI },
    { rate: () => 0.025, period: 2 * Math.PI },
  ],
};
