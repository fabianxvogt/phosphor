import { familyEffect } from "./family-rhythm.mjs";
import {
  ATTRIBUTES,
  ADDITIVE_FROM,
  GLSL,
  LENGTH,
  STROUHAL,
  createGeometry,
} from "./silk-model.mjs";

// One material-space front drives both the real crease and its local light.
const whip = `
float ssWhip(vec2 uv,float id){
 float b=ssSmooth((u_params[0]-.35)/.47),g=(id+uv.y)/SS_N;
 float cohort=1.-step(.5,abs(mod(floor(id/4.)-u_rhythmCount.w+3.5,7.)-3.5));
 float panelV=(mod(id,4.)+uv.y)/4.;
 float across=sin(panelV*3.14159265359);
 cohort*=across*across;
 float veil=pow(.5+.5*cos(SS_TAU*(g*3.-u_rhythmCount.w/7.)),8.);
 float address=mix(veil,cohort,b);
 float envelope=clamp(u_rhythm.w+u_rhythmHit.w*.08,0.,1.);
 float centre=1.-clamp(u_rhythm.w,0.,1.);
 return exp(-pow((uv.x-centre)*18.,2.))*sqrt(envelope)*address;
}
`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_uv;
layout(location=1) in float a_id;
layout(location=2) in vec3 a_rnd;
uniform float u_params[8];
uniform float u_clock[4];
uniform float u_kick;
uniform vec2 u_resolution;
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
${GLSL}
${whip}
vec3 ssDrapedPoint(vec2 uv,float id,vec3 rnd){
 vec3 p=ssPoint(uv,id,rnd);
 float t=ssSmooth(u_params[0]-1.);
 vec3 direction=normalize(mix(vec3(0.,0.,1.),vec3(p.x,.15,p.z),t));
 return p+direction*(.12*ssWhip(uv,id));
}
out vec3 v_p,v_n,v_t,v_view;
out float v_shadow;
out vec2 v_uv;
flat out float v_id;
flat out vec3 v_rnd;
void main(){
 vec3 eye,R,U,F;ssCamera(eye,R,U,F);
 if(a_id<0.){
  vec3 centre=vec3((a_rnd.x-.5)*16.,(a_rnd.y-.5)*10.,1.+a_rnd.z*7.);
  centre+=.3*vec3(sin(u_clock[2]+a_rnd.y*SS_TAU),cos(u_clock[3]+a_rnd.x*SS_TAU),sin(u_clock[3]+a_rnd.z*SS_TAU));
  float radius=.009+.014*a_rnd.z;
  vec3 p=centre+radius*(R*a_uv.x+U*a_uv.y),q=p-eye;
  float z=dot(q,F),A=u_resolution.x/u_resolution.y,f=ssFocal();
  v_p=centre;v_n=F;v_t=R;v_view=eye-centre;v_shadow=1.;v_uv=a_uv;v_id=a_id;v_rnd=a_rnd;
  gl_Position=vec4(dot(q,R)*f/max(A,1.),dot(q,U)*f*min(A,1.),(z*(60.+.1)-2.*60.*.1)/(60.-.1),z);
  return;
 }
 vec3 p=ssDrapedPoint(a_uv,a_id,a_rnd);
 vec3 du=ssDrapedPoint(a_uv+vec2(.0005,0.),a_id,a_rnd)-p;
 vec3 dv=ssDrapedPoint(a_uv+vec2(0.,.0005),a_id,a_rnd)-p;
 v_p=p;v_view=eye-p;v_t=normalize(du);v_n=normalize(cross(du,dv));
 v_uv=a_uv;v_id=a_id;v_rnd=a_rnd;
 // Bounded local fold-ray occlusion, evaluated on the moving mesh, not a
 // painted cosine. Each sample is the same persistent material surface.
 vec3 key=normalize(mix(vec3(-.82,-.5,.26),vec3(-.65,.55,.85),ssSmooth(u_params[0]-1.)));
 v_shadow=1.;
 for(int j=0;j<2;j++){
  float stepU=j==0?-.12:.12;
  vec2 uv=vec2(clamp(a_uv.x+stepU,0.,1.),a_uv.y);
  vec3 delta=ssDrapedPoint(uv,a_id,a_rnd)-p;
  float forward=dot(delta,key),perp=length(delta-key*forward);
  float hit=(1.-smoothstep(.07,.24,perp))*smoothstep(.12,.38,forward);
  v_shadow*=1.-.72*hit;
 }
 vec3 q=p-eye;float z=dot(q,F),A=u_resolution.x/u_resolution.y,f=ssFocal();
 gl_Position=vec4(dot(q,R)*f/max(A,1.),dot(q,U)*f*min(A,1.),(z*(60.+.1)-2.*60.*.1)/(60.-.1),z);
}`;
const material = `#version 300 es
precision highp float;
in vec3 v_p,v_n,v_t,v_view;
in float v_shadow;
in vec2 v_uv;
flat in float v_id;
flat in vec3 v_rnd;
uniform float u_params[8];
uniform float u_clock[4];
uniform float u_kick;
uniform vec2 u_resolution;
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
uniform vec3 u_primary,u_secondary,u_accent;
${GLSL}
${whip}
out vec4 outColor;
void main(){
 if(v_id<0.){
  float r2=dot(v_uv,v_uv);
  float core=(1.-smoothstep(.1,1.,r2))*exp(-r2*3.);
  float beam=exp(-pow((v_p.x+.3*v_p.y-.5)*.38,2.));
  float fade=1.-.65*ssSmooth(u_params[0]-1.);
  outColor=vec4(mix(u_primary,vec3(1.),.35)*core*beam*(.08+.16*v_rnd.z)*fade,0.);
  return;
 }
 vec3 V=normalize(v_view),N=normalize(v_n),T=normalize(v_t);
 if(dot(N,V)<0.)N=-N;
 float t=ssSmooth(u_params[0]-1.),b=ssSmooth((u_params[0]-.35)/.47);
 float light=u_clock[3];
 // The raking light exposes primary silk sheen, secondary in the undersides.
 vec3 L=normalize(mix(vec3(-.82,-.5,.26),vec3(-.65,.55,.85),t));
 vec3 B=normalize(vec3(.25,.45,-1.));
 vec3 H=normalize(L+V),C=normalize(cross(N,T));
 float nl=dot(N,L),nv=max(dot(N,V),.015),nh=max(dot(N,H),.015);
 float diffuse=max(nl,0.),rim=pow(1.-nv,4.);
 float ht=dot(H,T)/mix(.32,.42,t),hb=dot(H,C)/mix(.13,.17,t);
 float aniso=exp(-(ht*ht+hb*hb)/(nh*nh))/max(.2,sqrt(max(nl,0.)*nv));
 float g=(v_id+v_uv.y)/SS_N;
 float panelV=(mod(v_id,4.)+v_uv.y)/4.;
 float seam=min(panelV,1.-panelV);
 float fabricEdge=mix(mix(min(g,1.-g),seam,b),1.,t);
 float thin=exp(-fabricEdge*85.);
 float back=pow(max(dot(-N,B),0.),2.);
 float transmitted=(.035+.7*thin)*back;
 float shadow=mix(.18,1.,ssSmooth((nl+.12)/.52))*v_shadow;
 shadow*=mix(1.,.48+.52*ssSmooth((length(v_p.xz)-.8)/2.3),t);
 float inner=pow(max(dot(N,normalize(vec3(-v_p.x,.6,-v_p.z))),0.),2.)*t;
 vec3 dye=mix(u_secondary,u_primary,.025+.07*diffuse);
 float brightRibbon=1.-step(.5,abs(mod(floor(v_id/4.)+2.,7.)));
 dye=mix(dye,u_accent,brightRibbon*b*(1.-t)*.22);
 vec3 sheen=mix(mix(u_secondary,u_primary,(.22+.38*ssSmooth(aniso))*(1.-t)),u_accent,brightRibbon*b*(1.-t)*.3);
 float weaveFrequency=550.;
 float weaveAA=1.-smoothstep(.2,.65,max(fwidth(v_uv.x*weaveFrequency),fwidth(g*weaveFrequency)));
 float weave=1.+.025*weaveAA*sin(v_uv.x*weaveFrequency*SS_TAU)*sin(g*weaveFrequency*SS_TAU);
 float rake=.72+.28*exp(-pow((v_p.x-2.*sin(light))*.22,2.));
 vec3 col=dye*(.035+.72*diffuse*shadow+transmitted)*weave;
 col+=mix(sheen,vec3(1.),.22)*mix(2.9,2.6,t)*aniso*u_params[4]*shadow*rake;
 // Broad silk return lobe reveals the inward faces without flattening gaps.
 float returnLight=pow(max(dot(N,normalize(vec3(.4,-.7,1.))),0.),2.);
 col+=u_secondary*((.09+.10*b*(1.-t))*returnLight+.4*inner)*(1.-.35*rim);
 col+=u_primary*pow(inner,4.)*.075;
 // A separate coloured grazing lobe, rather than desaturating the blue dye.
 float crossSheen=pow(max(dot(N,normalize(vec3(-.6,.25,-.7))),0.),12.);
 col+=u_primary*crossSheen*(.12+.55*t)*shadow;
 col+=mix(dye,vec3(1.),.2)*rim*(.1+.3*thin);
 float hem=(1.-smoothstep(.02,.02+fwidth(seam)*1.5,seam))*b*(1.-t);
 col+=mix(dye,vec3(1.),.25)*hem*.18;
 float packet=exp(-pow((v_uv.x-(1.-u_rhythm.x))*9.,2.))*u_rhythm.x;
 float cohort=1.-step(.6,abs(mod(floor(v_id/4.)-u_rhythmCount.y+7.,7.)));
 col+=mix(u_primary,u_secondary,.65)*packet*.65*(.3+.7*diffuse);
 float softHem=exp(-seam*24.)*b;
 col+=u_accent*softHem*cohort*u_rhythm.y*2.;
 float spiral=exp(-pow((v_uv.x-(1.-u_rhythm.z))*6.,2.))*u_rhythm.z;
 col+=mix(u_secondary,u_primary,.2)*spiral*.65*(.25+.75*diffuse);
 float crack=ssWhip(v_uv,v_id);
 col=mix(col,col*.55+u_accent*1.65,crack*.85);
 // Narrow dyed wake stays behind the raised fold, never a whole-strip wash.
 vec2 wakeUV=v_uv+vec2(.045,0.);
 float wake=ssWhip(wakeUV,v_id);
 col+=u_accent*wake*.45*(1.-crack);
 float depth=length(v_view);
 vec3 fog=mix(u_secondary,u_primary,.25)*(.008+.018*t);
 col=mix(fog,col,exp(-max(depth-2.,0.)*(.045+.025*t)));
 // Feather grazing contacts: analytical sheen must not draw a sparkling
 // one-pixel wire along a nearly tangent mesh contour.
 col=mix(fog,col,smoothstep(.015,.065,nv));
 // Resolution-scaled coverage on free material edges; joined veil seams
 // stay invisible. This is coverage darkening, not sorted transparency.
 float edgeV=mix(mix(min(g,1.-g),seam,b),1.,t);
 float aaV=mix(fwidth(g),fwidth(panelV),b)*1.5;
 float edgeU=min(v_uv.x,1.-v_uv.x),aaU=fwidth(v_uv.x)*1.5;
 float coverage=smoothstep(0.,max(aaU,1e-6),edgeU)*smoothstep(0.,max(aaV,1e-6),edgeV);
 col=mix(fog,col,coverage);
 // The enormous veil's distant boundaries dissolve, never a lit rectangle.
 float dissolve=smoothstep(0.,.12,min(v_uv.x,1.-v_uv.x))*smoothstep(0.,.12,min(g,1.-g));
 float tail=smoothstep(0.,.075,min(v_uv.x,1.-v_uv.x));
 col=mix(fog,col,mix(dissolve,tail,b));
 float mist=exp(-pow((v_p.x+.3*v_p.y-.5)*.38,2.))*.012*(1.-t);
 col+=mix(u_primary,u_secondary,.5)*mist*(1.-exp(-depth*.18));
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
 // Scattered raking light at the far opening, not an empty black axis.
 float axis=pow(max(rd.y,0.),8.)*ssSmooth(u_params[0]-1.);
 col+=u_secondary*axis*.065+u_primary*axis*.008;
 float shaft=exp(-pow((s.x+.24*s.y-.35)*4.,2.))*exp(-pow((s.y-.1)*.9,2.));
 col+=mix(u_primary,u_secondary,.6)*shaft*.018;
 if(rd.y<-.001){
  float d=(-5.3-eye.y)/rd.y;vec3 p=eye+rd*d;
  float pool=exp(-dot(p.xz,p.xz)*.025);
  float folds=.5+.5*sin(p.x*.8+.25*sin(p.z*.5)-u_clock[0]);
  col+=mix(u_secondary,u_primary,.3)*pool*(.065+.045*folds)*exp(-d*.025);
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
  rhythmStyles: {
    restrained: "Still selvedge",
    driving: "Satin current",
    accented: "Vortex brocade",
  },
  rhythm: [
    familyEffect(
      "flutter-packet",
      0,
      "Flutter packet",
      "A bounded sheen packet travels along the material's existing folds.",
      {
        period: 4,
        duration: 2.5,
        strength: 0.65,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....... | .....x.. | ........ | ...X....",
            division: 2,
            strength: 0.65,
            duration: 1.8,
          },
          driving: {
            steps: "X...x..X | ...x..X.",
            division: 2,
            strength: 0.9,
            duration: 0.8,
          },
          accented: {
            steps: "X..x...X..x..X..x...",
            division: 4,
            strength: 1,
            duration: 0.5,
          },
        },
      },
    ),
    familyEffect(
      "selvedge-cohort",
      1,
      "Selvedge cohort",
      "One persistent ribbon cohort catches accent light along its silk hems.",
      {
        period: 8,
        duration: 2,
        strength: 0.6,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "..x..... | ........ | ......X. | ........",
            division: 2,
            strength: 0.5,
            duration: 1.8,
          },
          driving: {
            steps: "...X...x | ..X....x",
            division: 2,
            strength: 0.74,
            duration: 0.9,
          },
          accented: {
            steps: ".....X......x... | ..X.......x..... | .......X......x.",
            division: 4,
            strength: 0.88,
            duration: 0.8,
          },
        },
      },
    ),
    familyEffect(
      "vortex-sweep",
      2,
      "Vortex sweep",
      "A broad raking-light front climbs the same fabric into the spiral.",
      {
        period: 16,
        duration: 4,
        strength: 0.7,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | ........ | .......X",
            division: 2,
            strength: 0.55,
            duration: 3,
          },
          driving: {
            steps: "........ | ......x. | ........ | ....X...",
            division: 2,
            strength: 0.8,
            duration: 2,
          },
          accented: {
            steps: "..............x. | ........X....... | ...........X...x",
            division: 4,
            strength: 0.95,
            duration: 0.7,
          },
        },
      },
    ),
    familyEffect(
      "whip-crack",
      3,
      "Whip-crack ripple",
      "A raised crease races along selected silk lengths, catching a narrow accent-light wake.",
      {
        period: 8,
        duration: 0.8,
        strength: 0.9,
        steps: "X..x..X.",
        styles: {
          restrained: {
            steps: "X...x... | ..X..... | x.....X. | ....x...",
            division: 2,
            strength: 0.65,
            duration: 1.4,
          },
          driving: {
            steps: "X.x.X... | x.X...X.",
            division: 2,
            strength: 0.9,
            duration: 0.8,
          },
          accented: {
            steps: "X..x....X.x..... | ..X.x...X....x..",
            division: 4,
            strength: 1,
            duration: 0.45,
          },
        },
      },
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
    additiveFrom: ADDITIVE_FROM,
    vertex,
    fragment: material,
  },
};
