import { familyEffect } from "./family-rhythm.mjs";
import {
  ADDITIVE_FROM,
  ATTRIBUTES,
  CEILING,
  FOCAL,
  HANG,
  HOLD,
  KICK_STRENGTH,
  N,
  RADIUS,
  RING,
  SPACING,
  createGeometry,
} from "./kinetic-model.mjs";
const f = (x) => (Number.isInteger(x) ? `${x}.` : String(x));
const common = `
const float N=${f(N)},SP=${f(SPACING)},HANG=${f(HANG)},CEIL=${f(CEILING)},R0=${f(RADIUS)},FOCAL=${f(FOCAL)},HOLD=${f(HOLD)};
const float RREACH=${f(RING.reach)},RWIDTH=${f(RING.width)},RAMP=${f(RING.amp)},RWAVE=${f(RING.wave)},RGROW=${f(RING.grow)},KSTR=${f(KICK_STRENGTH)};
const float NEARZ=.05,FARZ=80.,FOGK=.025,EXT=12.475;
#define DEV clamp(u_params[0],0.,2.)
#define TAU 6.28318530718
float sst(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
vec4 chorus(float M){float c=floor(M),s=sst(HOLD,1.,M-c);vec4 I=vec4(0.,1.,2.,3.);return (1.-s)*vec4(equal(I,vec4(mod(c,4.))))+s*vec4(equal(I,vec4(mod(c+1.,4.))));}
float seedAngle(float k){return TAU*fract(mod(u_seed,8192.)*k);}
void cameraRig(float dev,out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float a=u_clock[3]+seedAngle(.7548776662),f=sst(1.,1.65,dev),rise=sst(1.6,2.,dev);
 float radius=6.+.4*sin(2.*a)+14.*f,height=.75+.1*sin(3.*a)+4.75*rise;
 eye=vec3(radius*cos(a),height,radius*sin(a));
 float side=.9+sst(1.,2.,dev);
 vec3 target=vec3(-sin(a)*side,2.5-2.3*sst(1.,2.,dev),cos(a)*side);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0.,1.,0.)));U=cross(R,F);
}
float focal(){return (FOCAL+.38*sst(1.,2.,DEV))*(1.+.02*clamp(u_kick,0.,1.));}
`;
const heightfield = `
float rippleH(vec2 p,float W){return .14*sin(.42*p.x+.27*p.y-W)+.1*sin(.31*p.y-.38*p.x-W+1.3)+.22*exp(-pow((length(p)-5.)/3.,2.));}
float waveH(vec2 p,float W,vec4 w,float Phi,float detail,float base){
 float a=base+.5*Phi,b=a+2.2;
 vec2 d1=vec2(cos(a),sin(a)),d2=vec2(cos(b),sin(b));
 float rho=length(p),th=atan(p.y,p.x+1e-7);
 float h0=.17*sin(1.25*dot(d1,p)-2.*W)+.17*sin(1.05*dot(d2,p)-2.*W);
 float h1=.27*sin(1.15*rho-2.*W);
 float h2=.25*sin(.95*rho+3.*th-2.*W)*sst(.4,2.6,rho);
 float h3=.32*sin(.85*dot(d1,p))*sin(.85*dot(vec2(-d1.y,d1.x),p))*cos(2.*W);
 return dot(w,vec4(h0,h1,h2,h3))+.06*detail*sin(2.9*dot(d2,p)+1.7*rho-3.*W);
}
float foldH(vec2 p,float W,vec4 w,float Phi){
 float a=Phi*.5,q=dot(vec2(cos(a),sin(a)),p),t=dot(vec2(-sin(a),cos(a)),p),r=length(p),th=atan(p.y,p.x+1e-7);
 float h0=1.35*sin(.42*q-W)+.38*cos(.32*t+W);
 float h1=1.55*cos(.43*r-W)+.25*sin(.3*q+W);
 float h2=1.35*sin(.38*r+2.*th-W)*sst(0.,3.,r)+.3*cos(.3*t-W);
 float h3=1.35*sin(.34*q-W)*cos(.28*t)+.35*sin(.3*t+W);
 return dot(w,vec4(h0,h1,h2,h3));
}
float heightAt(vec2 p,float W,vec4 w,float Phi,float detail,float amp){
 float wave=waveH(p,W,w,Phi,detail,seedAngle(.6180339887))*amp;
 float tiers=.09*sin(TAU*p.x/(SP*5.))+.06*cos(TAU*p.y/(SP*7.));
 return HANG+mix(mix(rippleH(p,W),wave,sst(0.,1.,DEV)),foldH(p,W,w,Phi)*(.68+.22*amp),sst(1.,2.,DEV))+tiers*(.2+.8*sst(1.,2.,DEV));
}
float ringP(float rho,float kick){
 float kn=clamp(kick/(KSTR*(.12+.88*sst(0.,1.,u_level))),0.,1.);
 float front=RREACH*(1.-kn),x=(rho-front)/RWIDTH;
 return sst(0.,RGROW,front)*exp(-x*x)*cos(RWAVE*x);
}
// A physical-height address, not index depth or a broad colour cap. The
// reflected population follows the same falling front a little later.
float cascadeAt(float y,float envelope,float lag){
 float d=clamp(envelope/(.96*(.12+.88*sst(0.,1.,u_level))),0.,1.);
 float progress=clamp(1.-d-lag,0.,1.);
 float front=5.65-5.5*progress;
 return exp(-pow((y-front)/.14,2.))*sst(0.,.08,progress)*(1.-sst(.94,1.,progress))*sst(0.,.035,d);
}
`;
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_cell;
layout(location=1) in vec2 a_corner;
layout(location=2) in float a_kind;
layout(location=3) in float a_rnd;
uniform float u_time,u_kick,u_seed,u_level;
uniform float u_clock[4];
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec4 u_rhythm,u_rhythmHit,u_rhythmCount;
uniform vec3 u_primary,u_secondary,u_accent;
${common}
${heightfield}
out vec3 v_ray;
out vec2 v_q;
flat out vec3 v_c,v_col;
flat out vec4 v_info;
flat out float v_focal;
void main(){
 float dev=DEV,W=u_clock[0],Phi=u_clock[2],amp=u_params[2],detail=clamp(u_params[3],0.,1.),size=u_params[7];
 vec4 w=chorus(u_clock[1]+mod(u_seed,4.));
 vec2 g=(a_cell-(N-1.)*.5)*SP;
 float kick=clamp(u_kick,0.,1.),rho=length(g),rp=ringP(rho,kick);
 float y=heightAt(g,W,w,Phi,detail,amp),ring=RAMP*kick*rp*amp;
 vec3 P=vec3(g.x,y+ring,g.y);
 float r=R0*size*(1.+.2*sst(1.,2.,dev));
 vec3 eye,R,U,F;cameraRig(dev,eye,R,U,F);
 float Fk=focal(),A=u_resolution.x/u_resolution.y;
 v_focal=Fk;
 bool mirrored=a_kind>.5&&a_kind<1.5;
 // Three lanes of material hierarchy: dark sapphire body, a selected crest
 // of luminous cores, and rare hot rhythm fronts. No surface-normal shell.
 float crestShape=exp(-pow((y-HANG-(.04+1.1*sst(1.,2.,dev)))/(.07+.35*sst(1.,2.,dev)),2.));
 crestShape*=.25+.75*exp(-pow((rho-5.)/3.2,2.));
 float nearLight=exp(-length(P-eye)*.015);
 vec3 body=mix(u_secondary,u_primary,.12+.55*crestShape);
 float cohort=.3+.7*sst(.4,.9,a_rnd);
 vec3 emit=body*(.8+.3*cohort)*nearLight;
 emit+=mix(u_primary,u_secondary,.12)*crestShape*(1.0+1.8*cohort)*nearLight;
 // Rare fixed hot centres are embedded in the frosted lamp, not random
 // temporal grain. Seed identity is stable even while paused/reversed.
 emit+=mix(u_secondary,vec3(1.),.24)*step(.965,a_rnd)*(.4+.8*crestShape)*nearLight;
 float gain=KSTR*(.12+.88*sst(0.,1.,u_level));
 float crest=max(rp,0.)*sst(0.,.06,kick/max(gain,1e-5));
 float q=(a_cell.x+a_cell.y)/(2.*N);
 float sweep=exp(-pow((q-(1.-clamp(u_rhythm.y,0.,1.)))*16.,2.))*min(1.,u_rhythm.y*4.);
 // Staggered every-eighth lamps, NOT full row/column cables or CAD edges.
 float lattice=float(mod(a_cell.x,8.)<.5&&mod(a_cell.y+4.*mod(floor(a_cell.x/8.),2.),8.)<.5)*clamp(u_rhythm.z,0.,1.);
 float tilt=(mod(u_rhythmCount.w,2.)-.5)*.1*(g.x/12.);
 float cascade=cascadeAt(P.y+tilt,u_rhythm.w,mirrored?.14:0.);
 float launch=clamp(u_rhythmHit.w,0.,1.)*sst(4.85,5.5,P.y)*.2;
 emit+=mix(u_primary,u_secondary,.2)*crest*1.5;
 emit+=u_secondary*sweep*2.4;
 emit+=u_accent*lattice*3.5;
 emit+=mix(u_accent,u_primary,.08)*(cascade*5.5+launch);
 emit*=u_params[4];
 v_info=vec4(a_kind,r,0.,1.);
 v_col=emit;v_q=a_corner;
 vec3 Cw=a_kind<.5?P:a_kind<1.5?vec3(P.x,-P.y,P.z):P+vec3(0.,r,0.);
 vec3 c=Cw-eye,cv=vec3(dot(c,R),dot(c,U),dot(c,F));
 v_c=cv;
 vec3 view;
 float pixA=2./(Fk*min(u_resolution.x,u_resolution.y));
 if(a_kind<1.5){
  float blur=0.,refl=1.;
  if(mirrored){vec3 toM=normalize(Cw-eye);float cosI=clamp(-toM.y,0.,1.);refl=.28+.34*pow(1.-cosI,2.);blur=.006*max(P.y,0.);}
  float L2c=dot(cv,cv),ext=r*sqrt(L2c/max(L2c-r*r,1e-6))+2.*sqrt(L2c)*pixA+blur;
  vec3 dir=cv/sqrt(max(L2c,1e-8)),ax=vec3(dir.z,0.,-dir.x);
  ax=dot(ax,ax)>1e-8?normalize(ax):vec3(1.,0.,0.);
  vec3 ay=cross(dir,ax);
  view=cv+(ax*a_corner.x+ay*a_corner.y)*ext;
  if(cv.z<NEARZ+r)view=vec3(0.,0.,-1.);
  v_ray=view;v_info.z=blur;v_info.w=refl;
 }else{
  // Only a sparse subset of unobtrusive real suspension threads. All
  // lamps retain a motor address; dark cables do not become luminous mesh.
  if(mod(a_cell.x,6.)>.5||mod(a_cell.y,6.)>.5){gl_Position=vec4(0.,0.,2.,1.);v_ray=vec3(0.);return;}
  float top=CEIL;
  vec3 b=vec3(Cw.x,top,Cw.z)-eye;
  vec3 a3=cv,b3=vec3(dot(b,R),dot(b,U),dot(b,F));
  float zn=NEARZ*2.;
  if(a3.z<zn&&b3.z<zn){gl_Position=vec4(0.,0.,2.,1.);v_ray=vec3(0.);return;}
  if(a3.z<zn)a3=mix(a3,b3,(zn-a3.z)/(b3.z-a3.z));
  if(b3.z<zn)b3=mix(b3,a3,(zn-b3.z)/(a3.z-b3.z));
  vec2 sc=vec2(Fk/max(A,1.),Fk*min(A,1.));
  vec2 pa=a3.xy*sc/a3.z,pb=b3.xy*sc/b3.z,dpx=(pb-pa)*u_resolution*.5;
  vec2 dir=dot(dpx,dpx)>1e-8?normalize(dpx):vec2(0.,1.);
  float hw=1.*max(1.,min(u_resolution.x,u_resolution.y)/1080.);
  vec3 e3=a_corner.y<0.?a3:b3;
  vec2 pe=(a_corner.y<0.?pa:pb)+vec2(-dir.y,dir.x)*a_corner.x*hw*2./u_resolution;
  v_q=vec2(a_corner.x,a_corner.y<0.?0.:top-Cw.y);v_ray=vec3(0.,0.,length(e3));
  gl_Position=vec4(pe*e3.z,(e3.z*(FARZ+NEARZ)-2.*FARZ*NEARZ)/(FARZ-NEARZ),e3.z);return;
 }
 gl_Position=vec4(view.x*Fk/max(A,1.),view.y*Fk*min(A,1.),(view.z*(FARZ+NEARZ)-2.*FARZ*NEARZ)/(FARZ-NEARZ),view.z);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_ray;
in vec2 v_q;
flat in vec3 v_c,v_col;
flat in vec4 v_info;
flat in float v_focal;
uniform float u_time,u_kick,u_seed;
uniform float u_clock[4];
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec3 u_primary,u_secondary,u_accent;
${common}
out vec4 outColor;
void main(){
 vec3 fogC=mix(u_secondary,u_primary,.3)*.012;
 if(v_info.x<1.5){
  float r=v_info.y;vec3 d=normalize(v_ray);
  float b=dot(d,v_c),c2=max(dot(v_c,v_c)-b*b,0.),h=sqrt(c2);
  float pixA=2./(v_focal*min(u_resolution.x,u_resolution.y)),wpx=b*pixA+v_info.z;
  float cover=clamp((r-h)/max(wpx,1e-6)+.5,0.,1.);if(cover<=0.)discard;
  float t=b-sqrt(max(r*r-c2,0.));vec3 hit=d*t,n=(hit-v_c)/r;
  float mu=max(dot(n,-d),0.);
  // A luminous lens inside each dark globe: bright centre and soft limb.
  vec3 col=v_col*(.34+.55*pow(mu,2.)+.9*pow(mu,12.));
  col*=v_info.w;col=mix(fogC,col,exp(-t*FOGK));col=mix(fogC*.5,col,cover);
  gl_FragDepth=clamp(((FARZ+NEARZ)-2.*FARZ*NEARZ/max(hit.z,NEARZ))/(FARZ-NEARZ)*.5+.5,0.,1.);
  outColor=vec4(max(col,vec3(0.)),1.);
 }else{
  float side=1.-abs(v_q.x),fade=exp(-v_q.y*.14)*sst(0.,.08,v_q.y);
  outColor=vec4(mix(u_secondary,u_primary,.3)*.19*side*side*fade*exp(-v_ray.z*FOGK),1.);
  gl_FragDepth=gl_FragCoord.z;
 }
}`;
const background = `
uniform float u_clock[4];
${common}
float segI(float c,float a,float t0,float t1){if(!(t1>t0))return 0.;if(abs(a)<1e-6)return (t1-t0)*exp(c+a*.5*(t0+t1));return (exp(c+a*t1)-exp(c+a*t0))/a;}
float hazeLayer(float o,float d,float t0,float t1,float h,float sA,float sB,float F){
 if(!(t1>t0))return 0.;float y0=o-h;vec2 ab=vec2(-y0/sA,-d/sA-1./F),bl=vec2(y0/sB,d/sB-1./F);
 bool first=y0+d*t0>=0.;float tc=-y0/d;
 if(!(tc>t0&&tc<t1))return first?segI(ab.x,ab.y,t0,t1):segI(bl.x,bl.y,t0,t1);
 return first?segI(ab.x,ab.y,t0,tc)+segI(bl.x,bl.y,tc,t1):segI(bl.x,bl.y,t0,tc)+segI(ab.x,ab.y,tc,t1);
}
vec2 columnSpan(vec2 o,vec2 d,float e,float T){vec2 inv=1./(abs(d)+1e-9)*sign(d+1e-12),a=(-e-o)*inv,b=(e-o)*inv;float t0=max(0.,max(min(a.x,b.x),min(a.y,b.y))),t1=min(T,min(max(a.x,b.x),max(a.y,b.y)));return t1>t0?vec2(t0,t1):vec2(0.);}
float poolGrid(vec2 p){return 1.-sst(9.,14.5,max(abs(p.x),abs(p.y)));}
void main(){
 vec3 eye,R,U,F;cameraRig(DEV,eye,R,U,F);float A=u_resolution.x/u_resolution.y,Fk=focal();
 vec2 s=(v_uv-.5)*2.;vec3 rd=normalize(R*s.x*max(A,1.)/Fk+U*s.y/(Fk*min(A,1.))+F);
 vec3 hazeC=mix(u_secondary,u_primary,.45),fogC=hazeC*.012,col=fogC;
 float T=55.,glow=u_params[4];
 if(rd.y<-1e-4){
  T=-eye.y/rd.y;vec3 P=eye+rd*T;
  vec2 tile=P.xz/2.5,fw=fwidth(tile),sd=abs(fract(tile)-.5);
  float seams=max(1.-sst(0.,max(fw.x*1.5,1e-6),.5-sd.x),1.-sst(0.,max(fw.y*1.5,1e-6),.5-sd.y));
  vec3 floorC=hazeC*poolGrid(P.xz)*.035*glow*(1.-.5*seams);
  vec3 md=vec3(rd.x,-rd.y,rd.z);vec2 span=columnSpan(P.xz,md.xz,EXT,35.);
  float mh=hazeLayer(0.,md.y,span.x,span.y,HANG,.5,1.1,16.);
  floorC+=hazeC*mh*.035*glow*(.1+.5*pow(1.-abs(rd.y),5.));
  col=mix(fogC,floorC,exp(-T*FOGK));
 }else if(rd.y>1e-4){
  T=max(0.,min((CEIL-eye.y)/rd.y,55.));vec3 P=eye+rd*T;
  col=mix(fogC,hazeC*poolGrid(P.xz)*.012*glow,exp(-T*FOGK));
 }
 vec2 span=columnSpan(eye.xz,rd.xz,EXT,T);
 float layer=hazeLayer(eye.y,rd.y,span.x,span.y,HANG,.7,1.4,18.);
 float tm=clamp((HANG-eye.y)/max(abs(rd.y),.08)*sign(rd.y),span.x,max(span.x,span.y));
 vec2 hp=(eye+rd*tm).xz;
 float shafts=.65+.35*pow(.5+.5*cos(hp.x*.5+u_clock[0])*cos(hp.y*.38-u_clock[0]),2.);
 col+=hazeC*glow*layer*.032*shafts;
 outColor=vec4(max(col,vec3(0.)),1.);
}`;
const schema = [
  {
    key: "development",
    label: "Development · ceiling / waves / sculpture",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "speed",
    label: "Wave speed",
    min: 0.1,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "amplitude",
    label: "Wave height",
    min: 0.3,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "detail",
    label: "Ripple detail",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "glow",
    label: "Sphere glow",
    min: 0.4,
    max: 1.6,
    step: 0.01,
    default: 1,
  },
  {
    key: "morph",
    label: "Choreography pace",
    min: 0.2,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "orbit",
    label: "Camera orbit",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
  },
  {
    key: "size",
    label: "Sphere size",
    min: 0.6,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
];
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    speed: 1,
    amplitude: 1,
    detail: 0.4,
    glow: 1,
    morph: 1,
    orbit: 1,
    size: 1,
    ...params,
  },
});
export default {
  id: "kinetic",
  number: 102,
  name: "Kinetic Rain",
  description:
    "Thousands of luminous suspended lamps ripple into broad, open sculptural folds above a dark mirror floor. The same motor lattice persists throughout.",
  development: "development",
  schema,
  presets: [
    look("Still Ceiling", 1216, 0),
    look("Wave Choreography", 1216, 1),
    look("Floating Sculpture", 1216, 2),
    look("Slow Tide", 377, 0.7, {
      speed: 0.55,
      amplitude: 1.35,
      detail: 0.2,
      orbit: 0.6,
    }),
    look("Rain Curtain", 2048, 1.65, { morph: 0.6, size: 0.85, orbit: 0.7 }),
    look("Dense Swell", 909, 1, {
      speed: 1.35,
      detail: 0.85,
      size: 0.8,
      morph: 1.4,
    }),
    look("Möbius Drift", 6006, 2, {
      morph: 0.45,
      orbit: 0.55,
      size: 0.9,
      detail: 0.6,
    }),
    look("Night Mirror", 63, 0.35, { glow: 0.85, orbit: 0.4, amplitude: 1.2 }),
  ],
  stage: ["speed", "amplitude", "glow"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    speed: { mul: [0.6, 1.5] },
    amplitude: { mul: [0.65, 1.25] },
    size: { mul: [0.8, 1.08] },
    detail: [0, 0.5],
    morph: { mul: [0.8, 1.3] },
    orbit: { mul: [0.75, 1.5] },
  },
  beat: { punch: 0.05, pulse: 0.05 },
  audio: [
    { param: "speed", feature: "low", amount: 0.05 },
    { param: "detail", feature: "high", amount: 0.06 },
  ],
  rhythmStyles: {
    restrained: "Suspended drops",
    driving: "Pendulum rain",
    accented: "Lattice cascade",
  },
  rhythm: [
    familyEffect(
      "kick-rings",
      0,
      "Kick rings",
      "A ring wave runs outwards through the sphere lattice from its centre.",
      {
        period: 4,
        strength: KICK_STRENGTH,
        duration: 3.5,
        steps: "X...",
        styles: {
          restrained: {
            steps: "X....... | ......x. | ........ | ...X....",
            division: 2,
            strength: 0.58,
            duration: 2.2,
          },
          driving: {
            steps: "X....... | ....x... | ....X... | ....X...",
            division: 2,
            strength: 0.84,
            duration: 1.8,
          },
          accented: {
            steps: "X.........x..... | ....X.......x...",
            division: 4,
            strength: 0.98,
            duration: 0.9,
          },
        },
      },
    ),
    familyEffect(
      "index-sweep",
      1,
      "Index sweep",
      "A band of light sweeps diagonally across the lattice by sphere index, in every state.",
      {
        period: 8,
        strength: 0.65,
        duration: 2,
        steps: "X.......",
        styles: {
          restrained: {
            steps: "...x.... | ........ | .....X.. | .......x",
            division: 2,
            strength: 0.52,
            duration: 1.5,
          },
          driving: {
            steps: "..X..x.X | ...X.xX.",
            division: 2,
            strength: 0.88,
            duration: 0.38,
          },
          accented: {
            steps: "..X..x..X..x..X..x..X...",
            division: 4,
            strength: 0.92,
            duration: 0.5,
          },
        },
      },
    ),
    familyEffect(
      "lattice-lines",
      2,
      "Lattice lines",
      "Staggered every-eighth lamp cohorts chime locally without illuminating the suspension cables.",
      {
        period: 16,
        strength: 0.7,
        duration: 2.5,
        steps: "X...............",
        styles: {
          restrained: {
            steps: "........ | ........ | ........ | ......X.",
            division: 2,
            strength: 0.55,
            duration: 2,
          },
          driving: {
            steps: "........ | .......x | ........ | .....X.x",
            division: 2,
            strength: 0.82,
            duration: 0.7,
          },
          accented: {
            steps: "...........x.... | ........X.x..Xxx",
            division: 4,
            strength: 0.96,
            duration: 0.18,
          },
        },
      },
    ),
    familyEffect(
      "drop-cascade",
      3,
      "Drop cascade",
      "A luminous ripple drops through suspended lamp heights, alternating its tilt on each launch and echoing in the mirror.",
      {
        period: 8,
        strength: 0.96,
        duration: 0.8,
        styles: {
          restrained: {
            steps: "....X... | ........ | ......X. | ........",
            division: 2,
            strength: 0.72,
            duration: 1.6,
          },
          driving: {
            steps: "X...X... | X...X...",
            division: 2,
            strength: 0.96,
            duration: 1.7,
          },
          accented: {
            steps: "X...X...X....... | ..X...X...X.....",
            division: 4,
            strength: 0.96,
            duration: 0.82,
          },
        },
      },
    ),
  ],
  clocks: [
    { rate: (p) => 0.52 * p[1], period: 2 * Math.PI },
    { rate: (p) => p[5] / 22, period: 4 },
    { rate: (p) => 0.12 * (0.5 + 0.5 * p[5]), period: 4 * Math.PI },
    { rate: (p) => 0.035 * p[6], period: 2 * Math.PI },
  ],
  fragment: background,
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    additiveFrom: ADDITIVE_FROM,
    vertex,
    fragment: surface,
  },
};
