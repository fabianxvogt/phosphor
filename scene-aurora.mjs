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
 return mix(1.22,.80,c)*(1.+.018*u_kick)/mix(1.,max(1.,u_params[5]),c);
}
void avCamera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float a=u_clock[1],c=smoothstep(1.,2.,avDev());
 eye=vec3(1.4*sin(a),2.2+.16*sin(2.*a)+.8*c,1.1*cos(a));
 float yaw=.055*sin(a),pitch=.30+.08*smoothstep(0.,1.,avDev())+.40*c+u_params[6];
 F=vec3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch));
 // Yaw-defined right stays continuous even when an extra look passes zenith.
 R=vec3(cos(yaw),0.,-sin(yaw));U=cross(F,R);
}
vec3 avPoint(vec2 uv,float sheet){
 float rise=smoothstep(0.,1.,avDev()),crown=smoothstep(1.,2.,avDev()),phase=u_clock[0];
 float theta=(uv.x-.5)*6.18+sheet*.24+(avSeed()-.5)*.35;
 float w=theta*2.3+phase+sheet*2.3;
 float kink=sin(w+.65*sin(2.*w-phase));
 float radius=mix(32.+sheet*20.,26.+sheet*18.,crown)*u_params[5];
 float ripple=(3.+6.*rise)*u_params[2]*kink+1.7*sin(9.*theta-2.*phase);
 float r=radius+ripple;
 float bend=theta+.17*u_params[2]*sin(5.*theta-phase+sheet);
 float bottom=14.+sheet*3.+6.*sin(1.6*theta+phase+sheet)+3.5*sin(4.3*theta-phase)+.55*sin(23.*theta-phase);
 vec3 base=vec3(r*sin(bend),bottom,8.+r*cos(bend));
 // The approaching arcs unfold into open, meandering sheets, not concentric
 // cylinders. Their supporting field lines still meet at the same zenith.
 vec2 overhead=vec2(theta*35.+24.*sin(w),7.+sheet*33.+16.*sin(theta*1.3+sheet*1.7)+ripple*.65);
 base.xz=mix(base.xz,overhead*u_params[5],crown);
 float len=(62.+30.*rise+420.*crown)*u_params[3]*(.85+.15*sin(4.*theta-phase+sheet));
 return base+AV_B*len*uv.y;
}
float avHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+u_seed*.17)*43758.5453);}
float avNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(avHash(i),avHash(i+vec2(1.,0.)),f.x),mix(avHash(i+vec2(0.,1.)),avHash(i+1.),f.x),f.y);
}
float avRidge(float az){
 return .045+.035*sin(az*3.+avSeed()*6.)+.033*abs(sin(az*9.+.4))+.018*sin(az*23.)+.008*sin(az*61.);
}
float avShore(vec2 p){return 3.5+abs(p.y)*.24+2.*sin(p.y*.12)+sin(p.y*.39);}
// Nearest two seeded frozen floes. Their bisectors form a non-repeating
// pressure-crack network rather than three families of sinusoidal grid lines.
vec2 avFloe(vec2 p){
 vec2 cell=floor(p),f=fract(p);float a=8.,b=8.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 g=vec2(float(x),float(y));
  vec2 o=vec2(avHash(cell+g),avHash(cell+g+71.));
  vec2 d=g+.18+.64*o-f;float q=dot(d,d);
  if(q<a){b=a;a=q;}else b=min(b,q);
 }
 return vec2(sqrt(a),sqrt(b)-sqrt(a));
}
// Snow drifts on both sides of a widening frozen inlet.
float avIce(vec2 p){return smoothstep(-.65,.65,avShore(p)-abs(p.x));}
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
 float z=dot(q,F),nearZ=.05,farZ=1100.;
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
 float crown=smoothstep(1.,2.,avDev());
 // Sub-quad kinks travel along the lower emission boundary. This contour
 // is evaluated per fragment so the fine hem never follows mesh facets.
 float hem=.005+mix(1.,.5,crown)*(.0014*sin(u*61.-3.*phase+v_sheet)+.0008*sin(u*137.+2.*phase));
 h-=hem;
 vec3 floorP=vec3(0.);float frost=1.;
 if(v_mirror>.5){
  vec3 mp=vec3(v_world.x,-v_world.y,v_world.z);
  float t=eye.y/(eye.y-mp.y);floorP=mix(eye,mp,t);
  float rough=avNoise(floorP.xz*.7);
  u+=(rough-.5)*.065;h+=.025*(rough-.5);
  frost=.38+.56*smoothstep(.24,.85,rough);
 }
 // Field-aligned ray density. Footprint filters the finest rays, not a
 // pixel-sized random texture: stable at 4K and during the overhead tilt.
 float q=u*520.+9.*sin(u*13.+phase)+3.7*sin(u*31.-phase)+v_sheet*4.;
 float fw=max(fwidth(q),.001);
 float fine=.5+.5*cos(q*3.);
 fine=mix(fine,.5,smoothstep(.35,1.5,fw*3.));
 float rayPhase=q+1.7*sin(q*.37)+.6*sin(q*1.73);
 float rayFoot=max(fwidth(rayPhase),.001);
 float rayDistance=abs(mod(rayPhase-AV_PI*.5+AV_PI,AV_TAU)-AV_PI);
 float rayWidth=max(.38,rayFoot*.8);
 float rayCore=exp(-pow(rayDistance/rayWidth,2.))*.55/rayWidth;
 rayCore=mix(rayCore,.1185,smoothstep(1.,3.,rayFoot));
 rayCore=mix(rayCore,.1185,v_mirror*.8);
 float midPhase=u*113.+3.*sin(u*19.+phase)+v_sheet*5.;
 float midFoot=fwidth(midPhase);
 float midRay=pow(.5+.5*cos(midPhase),6.);
 midRay=mix(midRay,.2256,smoothstep(.6,2.5,midFoot));
 // A second octave survives where the finest hair becomes sub-pixel.
 // The corona must not collapse to a handful of broad zoom-blur spokes.
 float rays=rayCore*(.25+.75*fine)+midRay*.28;
 float gaps=.24+.76*pow(.5+.5*sin(u*17.+1.8*sin(u*5.-phase)+v_sheet),2.);
 float folds=.35+.65*pow(.5+.5*sin(u*9.+phase+v_sheet),2.);
 float detail=mix(.23,.76,clamp(u_params[4]+u_level*.25,0.,1.));
 float density=mix(.20+folds*.18,.10+rays*1.10+folds*.22,detail)*gaps;
 // At the zenith, the long rays must be hair inside empty air, not broad
 // filled spotlight wedges. Concentrate sheet glow near its folded hem.
 density=mix(density,(.016+rays*.85+folds*.045)*gaps,crown);
 density*=.65+.35*sin(u*27.+.7*sin(h*9.+u*6.)-phase);
 // Fine vertical excitation travels inside stable field-aligned filaments.
 float shimmer=.80+.20*sin(h*83.+u*19.-3.*phase+6.*sin(u*93.));
 density*=shimmer;
 float tip=.48+.25*sin(u*7.-phase)+.15*sin(u*19.+phase);
 float reach=.72+.28*sin(u*11.+1.7*sin(u*3.-phase)+v_sheet);
 float heightFade=exp(-max(h,0.)*(mix(3.8,1.5,crown)+1.8*(1.-reach)))*(1.-smoothstep(tip*reach,1.,h));
 float hemWidth=max(.0018,fwidth(h)*.85);
 float edge=exp(-pow((h-.0025)/hemWidth,2.))*.0025/hemWidth;
 float baseFade=smoothstep(-fwidth(h),max(.003,fwidth(h)),h);
 float facing=abs(dot(normalize(v_normal),normalize(eye-v_world)));
 float optical=min(1.9,1./max(facing,.52));
 float cohort=exp(-pow((sin(u-u_rhythmCount.x*.73-v_sheet)*4.),2.))*u_rhythm.x;
 float sweep=exp(-pow((h-(1.-u_rhythm.y))/.12,2.))*u_rhythm.y;
 float foldPulse=exp(-pow(sin(u*2.-u_rhythmCount.z*.41)*5.,2.))*u_rhythm.z;
 vec3 ink=mix(u_primary,mix(u_secondary,vec3(1.),.10),smoothstep(.025,.27,h));
 float endFade=smoothstep(0.,.08,v_uv.x)*(1.-smoothstep(.92,1.,v_uv.x));
 float lowerGlow=exp(-max(h,0.)*44.)*(.14+.30*folds)*gaps;
 vec3 col=ink*(density*heightFade*(1.65-rise*.2)+lowerGlow+edge*.22)*baseFade*optical*endFade*.8;
 col+=ink*rays*heightFade*cohort*.25*endFade;
 // A broad emission layer under the filaments reads as ionised air,
 // not just a set of electric wires. Its lower edge remains the hero.
 float veil=exp(-pow((h-.035)/mix(.20,.065,crown),2.))*(.13+.24*folds)*gaps;
 col+=ink*veil*baseFade*endFade*(1.-.25*rise);
 col+=u_secondary*sweep*rays*.3;
 col+=u_accent*edge*foldPulse*.35*endFade;
 col+=u_accent*edge*.025*endFade*baseFade;
 col+=mix(u_primary,vec3(1.),.12)*rays*edge*.55*(1.+.25*u_kick)*endFade;
 // An almost edge-on triangle is an unresolved slice of the sheet.
 // Fade only that vanishing footprint rather than sparkling at its edge.
 float coverage=1.-smoothstep(.006,.035,fwidth(v_uv.x));
 col*=exp(-length(v_world-eye)*mix(.006,.002,crown))*coverage;
 // Distant sheets are dimmer; overlapping folds therefore read
 // as separate curtains rather than a single printed radial gradient.
 col*=1.-v_sheet*.13;
 if(v_mirror>.5){
  vec3 mp=vec3(v_world.x,-v_world.y,v_world.z);
  float fres=.30+.65*pow(1.-abs(normalize(mp-eye).y),3.);
  col*=avIce(floorP.xz)*frost*fres*u_params[7]*exp(-length(floorP.xz)*.003);
 }
 outColor=vec4(max(col,vec3(0.)),0.);
}
`;
const fragment = `
uniform float u_clock[4];
${common}
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
 vec3 col=skyInk*(.006+.035*exp(-pow((rd.y-.015)/.19,2.)));
 vec3 sr=rd;
 bool ground=rd.y<0.;
 if(ground)sr.y=-sr.y;
 float stars=avStars(sr,150.)*.45+avStars(sr,59.)*.7+avStars(sr,27.);
 float galaxy=exp(-pow(dot(sr,normalize(vec3(.5,.32,-.7)))/.16,2.));
 float dust=avNoise(sr.xz*13.+sr.y*5.)*.65+avNoise(sr.xz*31.)*.35;
 col+=skyInk*galaxy*(.012+.026*dust)*smoothstep(0.,.12,sr.y);
 col+=mix(u_secondary,vec3(1.),.7)*stars*.45*smoothstep(0.,.07,sr.y)*(ground?.1:1.);
 // Two mountain ranges: distant atmospheric teeth and snow-lit foreground.
 float az=atan(rd.x,rd.z);
 float ridge=avRidge(az);
 float aa=max(fwidth(rd.y-ridge),.0002);
 float land=1.-smoothstep(ridge-aa,ridge+aa,rd.y);
 if(!ground){
  float rim=exp(-pow((rd.y-ridge)/.0035,2.));
  float farRidge=ridge*.65+.065+.008*sin(az*37.);
  float farLand=1.-smoothstep(farRidge-aa,farRidge+aa,rd.y);
  col=mix(col,skyInk*.045,farLand);
  float snowCap=smoothstep(ridge-.026,ridge-.006,rd.y)*(.4+.6*pow(.5+.5*sin(az*81.+rd.y*270.),2.));
  vec3 mountain=skyInk*(.016+.13*snowCap);
  col=mix(col,mountain,land)+u_secondary*rim*.025;
 }else{
  float t=-eye.y/rd.y;vec3 p=eye+rd*t;
  float ice=avIce(p.xz),fog=exp(-t*.009);
  float grain=avNoise(p.xz*7.),drift=avNoise(p.xz*vec2(.55,1.3));
  float resolved=1.-smoothstep(.2,2.,length(fwidth(p.xz)));
  float ripples=.5+.5*sin(p.z*11.+p.x*2.+drift*8.);
  float snowH=.5*drift*drift+.035*ripples;
  vec3 snowP=vec3(p.x,snowH,p.z);
  vec3 normal=normalize(cross(dFdx(snowP),dFdy(snowP)));
  normal*=sign(normal.y);
  float key=max(dot(normal,normalize(vec3(-.6,.7,.5))),0.);
  vec3 snow=mix(mix(u_secondary,u_primary,.18),vec3(1.),.26)*(.11+.28*key);
  snow*=.58+.30*drift+.12*grain*resolved;
  float bank=exp(-pow((abs(p.x)-avShore(p.xz))/.75,2.));
  // Wind-packed crust has granular albedo as well as normal relief.
  float crust=avNoise(p.xz*vec2(13.,19.));
  snow*=.83+.34*crust*resolved;
  snow+=mix(u_secondary,vec3(1.),.2)*bank*.12;
  col=mix(col*.3+skyInk*(.018+.026*drift),snow,(1.-ice)*fog);
  // Sparse, branching stresses beneath the glass; derivative AA and
  // distance fade avoid a grid or moiré on the frozen lake.
  vec2 warped=p.xz*.43+vec2(sin(p.z*1.9),sin(p.x*2.3))*.07;
  vec2 floe=avFloe(warped);
  float width=max(fwidth(floe.y)*.7,.006);
  float lines=1.-smoothstep(width,width*2.,floe.y);
  float crack=lines*(.3+.7*drift)*exp(-t*.035)*ice;
  col+=mix(mix(u_secondary,u_primary,.35),vec3(1.),.28)*crack*.19;
  col*=1.-.35*exp(-floe.y*45.)*ice*fog;
  col+=u_primary*(.012+.028*grain*resolved)*ice*exp(-pow(p.x/16.,2.))*fog;
  float frost=pow(avNoise(p.xz*1.8),3.)*resolved;
  float needlePhase=p.x*39.+p.z*21.+drift*11.;
  float needles=pow(.5+.5*sin(needlePhase),12.);
  needles=mix(needles,.1612,smoothstep(.5,2.,fwidth(needlePhase)));
  float sparkle=pow(grain,12.)*needles*resolved;
  col+=mix(u_secondary,vec3(1.),.45)*(frost*.22+sparkle*.8)*ice*fog;
  // Frosted pressure ridges catch grazing curtain light; the smooth patches
  // between them keep the actual mirrored mesh's specular image.
  float etched=pow(avNoise(p.xz*vec2(3.,9.)),7.);
  col+=mix(u_primary,vec3(1.),.22)*etched*.038*ice*fog*resolved;
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
