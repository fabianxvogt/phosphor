import { familyEffect } from "./family-rhythm.mjs";
import {
  ATTRIBUTES,
  GLSL,
  LENGTH,
  STROUHAL,
  createGeometry,
} from "./silk-model.mjs";

const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_uv;
layout(location=1) in float a_id;
layout(location=2) in vec3 a_rnd;
uniform float u_params[8];
uniform float u_clock[4];
uniform float u_kick;
uniform vec2 u_resolution;
${GLSL}
out vec3 v_p,v_n,v_t;
out float v_shadow;
out vec2 v_uv;
flat out float v_id;
flat out vec3 v_rnd;
void main(){
 vec3 p=ssPoint(a_uv,a_id,a_rnd);
 vec3 du=ssPoint(a_uv+vec2(.0005,0.),a_id,a_rnd)-p;
 vec3 dv=ssPoint(a_uv+vec2(0.,.0005),a_id,a_rnd)-p;
 v_p=p;v_t=normalize(du);v_n=normalize(cross(du,dv));
 v_uv=a_uv;v_id=a_id;v_rnd=a_rnd;
 // Bounded local fold-ray occlusion, evaluated on the moving mesh, not a
 // painted cosine. Each sample is the same persistent material surface.
 vec3 key=normalize(mix(vec3(-.82,-.5,.26),vec3(-.65,.55,.85),ssSmooth(u_params[0]-1.)));
 v_shadow=1.;
 for(int j=0;j<6;j++){
  float stepU=(j<2?.045:(j<4?.12:.25))*(mod(float(j),2.)<.5?-1.:1.);
  vec2 uv=vec2(clamp(a_uv.x+stepU,0.,1.),a_uv.y);
  vec3 delta=ssPoint(uv,a_id,a_rnd)-p;
  float forward=dot(delta,key),perp=length(delta-key*forward);
  float hit=(1.-smoothstep(.07,.24,perp))*smoothstep(.12,.38,forward);
  v_shadow*=1.-.72*hit;
 }
 vec3 eye,R,U,F;ssCamera(eye,R,U,F);
 vec3 q=p-eye;float z=dot(q,F),A=u_resolution.x/u_resolution.y,f=ssFocal();
 gl_Position=vec4(dot(q,R)*f/max(A,1.),dot(q,U)*f*min(A,1.),(z*(60.+.1)-2.*60.*.1)/(60.-.1),z);
}`;
const material = `#version 300 es
precision highp float;
in vec3 v_p,v_n,v_t;
in float v_shadow;
in vec2 v_uv;
flat in float v_id;
flat in vec3 v_rnd;
uniform float u_params[8];
uniform float u_clock[4];
uniform float u_kick;
uniform vec2 u_resolution;
uniform vec4 u_rhythm,u_rhythmCount;
uniform vec3 u_primary,u_secondary,u_accent;
${GLSL}
out vec4 outColor;
void main(){
 vec3 eye,R,U,F;ssCamera(eye,R,U,F);
 vec3 V=normalize(eye-v_p),N=normalize(v_n),T=normalize(v_t);
 if(dot(N,V)<0.)N=-N;
 float t=ssSmooth(u_params[0]-1.),b=ssSmooth(u_params[0]/.82);
 float light=u_clock[3];
 // One raking key: the dye is uniform; changes in value come from form.
 vec3 L=normalize(mix(vec3(-.82,-.5,.26),vec3(-.65,.55,.85),t));
 vec3 B=normalize(vec3(.25,.45,-1.));
 vec3 H=normalize(L+V),C=normalize(cross(N,T));
 float nl=dot(N,L),nv=max(dot(N,V),.015),nh=max(dot(N,H),.015);
 float diffuse=max(nl,0.),rim=pow(1.-nv,4.);
 float ht=dot(H,T)/.42,hb=dot(H,C)/.17;
 float aniso=exp(-(ht*ht+hb*hb)/(nh*nh))/max(.2,sqrt(max(nl,0.)*nv));
 float g=(v_id+v_uv.y)/SS_N;
 float seam=min(v_uv.y,1.-v_uv.y);
 float fabricEdge=mix(min(g,1.-g),seam,b);
 float thin=exp(-fabricEdge*85.);
 float back=pow(max(dot(-N,B),0.),2.);
 float transmitted=(.035+.7*thin)*back;
 float shadow=mix(.18,1.,ssSmooth((nl+.12)/.52))*v_shadow;
 shadow*=mix(1.,.24+.76*ssSmooth((length(v_p.xz)-.8)/2.3),t);
 vec3 dye=u_secondary;
 float brightRibbon=1.-step(.5,mod(v_id+2.,11.));
 dye=mix(dye,u_accent,brightRibbon*t*.8);
 float weaveFrequency=550.;
 float weaveAA=1.-smoothstep(.2,.65,max(fwidth(v_uv.x*weaveFrequency),fwidth(g*weaveFrequency)));
 float weave=1.+.025*weaveAA*sin(v_uv.x*weaveFrequency*SS_TAU)*sin(g*weaveFrequency*SS_TAU);
 float rake=.72+.28*exp(-pow((v_p.x-2.*sin(light))*.22,2.));
 vec3 col=dye*(.022+.72*diffuse*shadow+transmitted)*weave;
 col+=mix(dye,vec3(1.),.42)*2.4*aniso*u_params[4]*shadow*rake;
 col+=mix(dye,vec3(1.),.2)*rim*(.1+.3*thin);
 float hem=(1.-smoothstep(.02,.02+fwidth(seam)*1.5,seam))*b;
 col+=mix(dye,vec3(1.),.25)*hem*.18;
 float packet=exp(-pow((v_uv.x-(1.-u_rhythm.x))*9.,2.))*u_rhythm.x;
 float cohort=1.-step(.6,abs(mod(v_id-u_rhythmCount.y,7.)));
 col+=mix(dye,vec3(1.),.4)*packet*.24*diffuse;
 col+=u_accent*hem*cohort*u_rhythm.y*.8;
 float spiral=exp(-pow((v_uv.x-(1.-u_rhythm.z))*6.,2.))*u_rhythm.z;
 col+=mix(dye,vec3(1.),.3)*spiral*.3*diffuse;
 float depth=length(eye-v_p);
 vec3 fog=mix(u_secondary,u_primary,.25)*(.008+.018*t);
 col=mix(fog,col,exp(-max(depth-2.,0.)*(.045+.025*t)));
 // Resolution-scaled coverage on free material edges; joined veil seams
 // stay invisible. This is coverage darkening, not sorted transparency.
 float edgeV=mix(min(g,1.-g),min(v_uv.y,1.-v_uv.y),b);
 float aaV=mix(fwidth(g),fwidth(v_uv.y),b)*1.5;
 float edgeU=min(v_uv.x,1.-v_uv.x),aaU=fwidth(v_uv.x)*1.5;
 float coverage=smoothstep(0.,max(aaU,1e-6),edgeU)*smoothstep(0.,max(aaV,1e-6),edgeV);
 col*=.8+.2*coverage;
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
const background = `
uniform float u_clock[4];
${GLSL}
void main(){
 vec3 eye,R,U,F;ssCamera(eye,R,U,F);
 vec2 s=(v_uv-.5)*2.;float A=u_resolution.x/u_resolution.y,f=ssFocal();
 vec3 rd=normalize(F+R*s.x*max(A,1.)/f+U*s.y/(f*min(A,1.)));
 vec3 col=mix(u_secondary,u_primary,.25)*.005;
 float haze=exp(-dot(s*vec2(.7,1.),s*vec2(.7,1.))*2.);
 col+=u_secondary*haze*.022;
 float shaft=exp(-pow((s.x+.24*s.y-.35)*4.,2.))*exp(-pow((s.y-.1)*.9,2.));
 col+=mix(u_primary,u_secondary,.6)*shaft*.018;
 if(rd.y<-.001){
  float d=(-5.3-eye.y)/rd.y;vec3 p=eye+rd*d;
  float pool=exp(-dot(p.xz,p.xz)*.035);
  col+=mix(u_secondary,u_primary,.3)*pool*.035*exp(-d*.025);
 }
 outColor=vec4(col,1.);
}`;
const look = (name, seed, development, extra = {}) => ({
  name,
  seed,
  params: {
    development,
    wind: 7.5,
    amplitude: 1.2,
    spread: 1,
    sheen: 1,
    drift: 1,
    framing: 1.65,
    width: 1,
    ...extra,
  },
});
export default {
  id: "silk",
  number: 111,
  name: "Silk Storm",
  description:
    "One billowing silk veil separates into wind-tossed banners and winds into a towering ribbon vortex. The same fabric throughout.",
  development: "development",
  schema: [
    {
      key: "development",
      label: "Development · veil / banners / tornado",
      min: 0,
      max: 2,
      step: 0.01,
      default: 0,
    },
    {
      key: "wind",
      label: "Silk wind",
      min: 2,
      max: 12,
      step: 0.01,
      default: 7.5,
    },
    {
      key: "amplitude",
      label: "Fold depth",
      min: 0.4,
      max: 1.5,
      step: 0.01,
      default: 1,
    },
    {
      key: "spread",
      label: "Banner spacing",
      min: 0.5,
      max: 1.5,
      step: 0.01,
      default: 1,
    },
    {
      key: "sheen",
      label: "Silk sheen",
      min: 0.4,
      max: 1.5,
      step: 0.01,
      default: 1,
    },
    {
      key: "drift",
      label: "Silk camera drift",
      min: 0,
      max: 2,
      step: 0.01,
      default: 1,
    },
    {
      key: "framing",
      label: "Silk framing",
      min: 1.1,
      max: 2,
      step: 0.01,
      default: 1.65,
    },
    {
      key: "width",
      label: "Ribbon width",
      min: 0.5,
      max: 1.5,
      step: 0.01,
      default: 1,
    },
  ],
  presets: [
    look("Veil", 1811, 0),
    look("Banners", 1811, 1),
    look("Tornado", 1811, 2),
    look("Raking Moon", 720, 0.18, { wind: 3.5, drift: 0.5, amplitude: 1.3 }),
    look("Crosswind", 431, 1, {
      spread: 1.3,
      wind: 9,
      width: 1.25,
      amplitude: 1.3,
    }),
    look("Woven Night", 8128, 1.28, {
      spread: 0.65,
      width: 1.35,
      wind: 5,
      drift: 0.7,
    }),
    look("Spindle", 1117, 2, {
      width: 0.55,
      wind: 4,
      drift: 0.6,
      framing: 1.8,
    }),
    look("Satin Wake", 2718, 0.6, {
      amplitude: 0.65,
      spread: 1.35,
      wind: 6,
      width: 1.4,
    }),
  ],
  stage: ["wind", "amplitude", "sheen"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { wind: { mul: [0.7, 1.3] }, amplitude: { mul: [0.75, 1.2] } },
  beat: { punch: 0.04, pulse: 0.03 },
  rhythm: [
    familyEffect(
      "flutter-packet",
      0,
      "Flutter packet",
      "A bounded sheen packet travels along the material's existing folds.",
      { period: 4, duration: 2.5, strength: 0.65 },
    ),
    familyEffect(
      "selvedge-cohort",
      1,
      "Selvedge cohort",
      "One persistent ribbon cohort catches accent light along its silk hems.",
      { period: 8, duration: 2, strength: 0.6 },
    ),
    familyEffect(
      "vortex-sweep",
      2,
      "Vortex sweep",
      "A broad raking-light front climbs the same fabric into the spiral.",
      { period: 16, duration: 4, strength: 0.7 },
    ),
  ],
  clocks: [
    {
      rate: (p) => (2 * Math.PI * STROUHAL * p[1]) / LENGTH,
      period: 2 * Math.PI,
    },
    { rate: () => 0.055, period: 2 * Math.PI },
    { rate: (p) => 0.035 * p[5], period: 2 * Math.PI },
    { rate: () => 0.13, period: 2 * Math.PI },
  ],
  fragment: background,
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    vertex,
    fragment: material,
  },
};
