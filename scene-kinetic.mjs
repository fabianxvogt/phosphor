import { familyEffect } from "./family-rhythm.mjs";
import {
  ADDITIVE_FROM,
  ATTRIBUTES,
  CEILING,
  CENTER,
  FOCAL,
  FORM,
  HALF,
  HANG,
  HOLD,
  KICK_STRENGTH,
  N,
  RADIUS,
  RING,
  RMAX,
  SPACING,
  STAGGER,
  SURFACE_COLS,
  SURFACE_ROWS,
  TILT,
  createGeometry,
} from "./kinetic-model.mjs";
// Kinetic Rain: a club kinetic installation. 9216 glowing spheres hang on
// threads from a motor ceiling; one index lattice carries every state.
// Ceiling (level, faint ripple) → Waves (interfering travelling-wave
// choreographies, kick rings) → Sculpture (the lattice becomes the (u, v)
// grid of one parametric surface morphing sphere → torus → Möbius → saddle).
// Positions are a pure function of (index, development, clocks), mirrored on
// the CPU in kinetic-model.mjs. Each sphere is a ray-traced impostor that
// also carries the lighting of the surface it belongs to, so thousands of
// points read as one coherent, lit surface.
const f = (x) => {
  const s = String(x);
  return s.includes(".") || s.includes("e") ? s : `${s}.`;
};
const common = `
const float N=${f(N)},SP=${f(SPACING)},HANG=${f(HANG)},CEIL=${f(CEILING)},R0=${f(RADIUS)};
const float RMAX=${RMAX.toFixed(6)},STAGGER=${f(STAGGER)},FOCAL=${f(FOCAL)},HOLD=${f(HOLD)};
const vec3 CENTER=vec3(${CENTER.map(f).join(",")});
const float RREACH=${f(RING.reach)},RWIDTH=${f(RING.width)},RAMP=${f(RING.amp)},RWAVE=${f(RING.wave)},RGROW=${f(RING.grow)},KSTR=${f(KICK_STRENGTH)};
const float FSPH=${f(FORM.sphere)},FTR=${f(FORM.torusR)},FTr=${f(FORM.torusr)},FMR=${f(FORM.mobiusR)},FMW=${f(FORM.mobiusW)};
const float FSR=${f(FORM.saddleR)},FSK=${f(FORM.saddleK)},FSW=${f(FORM.saddleWave)};
const float TC=${Math.cos(TILT).toFixed(7)},TS=${Math.sin(TILT).toFixed(7)};
const float NEARZ=.05,FARZ=60.,FOGK=.05,EXT=${(HALF + 0.6).toFixed(3)};
#define K_TAU 6.28318530718
#define DEV clamp(u_params[0],0.,2.)
float sst(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
vec4 chorus(float M){
 float c=floor(M),s=sst(HOLD,1.,M-c);
 vec4 I=vec4(0.,1.,2.,3.);
 return (1.-s)*vec4(equal(I,vec4(mod(c,4.))))+s*vec4(equal(I,vec4(mod(c+1.,4.))));
}
float seedAngle(float k){return K_TAU*fract(mod(u_seed,8192.)*k);}
void cameraRig(float dev,out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float s2=sst(1.,2.,dev),a=u_clock[3]+seedAngle(.7548776662);
 float radius=6.-1.4*s2+(.4-.25*s2)*sin(2.*a),height=.75+.45*s2+.1*sin(3.*a);
 eye=vec3(radius*cos(a),height,radius*sin(a));
 float side=.9*(1.-s2);
 vec3 target=vec3(-sin(a)*side,2.2-.3*sst(0.,1.,dev)-.25*s2,cos(a)*side);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0.,1.,0.)));U=cross(R,F);
}
float focal(){return (FOCAL+.38*sst(1.,2.,DEV))*(1.+.02*clamp(u_kick,0.,1.));}
vec3 tone(float h){
 return mix(mix(u_secondary,u_primary,sst(.05,.72,h)),mix(u_primary,vec3(1.),.28),sst(.8,1.,h)*.6);
}`;
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
uniform vec4 u_rhythm;
uniform vec3 u_primary,u_secondary,u_accent;
${common}
out vec3 v_ray;
out vec2 v_q;
flat out vec3 v_c,v_col;
flat out vec4 v_info;
const float TAU=6.28318530718,PI=3.14159265359;
float rippleH(vec2 p,float W){return .045*sin(.42*p.x+.27*p.y-W)+.03*sin(.31*p.y-.38*p.x-W+1.3);}
float waveH(vec2 p,float W,vec4 w,float Phi,float detail,float base){
 float a=base+.5*Phi,b=a+2.2;
 vec2 d1=vec2(cos(a),sin(a)),d2=vec2(cos(b),sin(b));
 float rho=length(p),th=atan(p.y,p.x+1e-7);
 float h0=.17*sin(1.25*dot(d1,p)-2.*W)+.17*sin(1.05*dot(d2,p)-2.*W);
 float h1=.27*sin(1.15*rho-2.*W);
 float h2=.25*sin(.95*rho+3.*th-2.*W)*sst(.4,2.6,rho);
 float h3=.32*sin(.85*dot(d1,p))*sin(.85*dot(vec2(-d1.y,d1.x),p))*cos(2.*W);
 float fine=.06*detail*sin(2.9*dot(d2,p)+1.7*rho-3.*W);
 return dot(w,vec4(h0,h1,h2,h3))+fine;
}
// Kick ring (kinetic-model.mjs ringProfile): the envelope is normalised by
// the authored strength and the engine's energy gain, so the front starts
// on the axis.
float ringP(float rho,float kick){
 float kn=clamp(kick/(KSTR*(.12+.88*sst(0.,1.,u_level))),0.,1.);
 float front=RREACH*(1.-kn),x=(rho-front)/RWIDTH;
 return sst(0.,RGROW,front)*exp(-x*x)*cos(RWAVE*x);
}
vec3 sculpt(vec2 uv,vec4 w,float W,float Phi,float detail){
 float th=TAU*uv.x;vec3 p=vec3(0.);
 if(w.x>0.){float ph=PI*uv.y;p+=w.x*FSPH*vec3(sin(ph)*cos(th),cos(ph),sin(ph)*sin(th));}
 if(w.y>0.){float ps=PI*.5-TAU*uv.y,R=FTR+FTr*cos(ps);p+=w.y*vec3(R*cos(th),FTr*sin(ps),R*sin(th));}
 if(w.z>0.){float m=FMW*(1.-2.*uv.y),R=FMR+m*cos(th*.5);p+=w.z*vec3(R*cos(th),m*sin(th*.5),R*sin(th));}
 if(w.w>0.){float r=FSR*sqrt(.02+.98*uv.y);
  p+=w.w*vec3(r*cos(th),FSK*r*r*cos(2.*th)+FSW*r*sin(2.6*r-2.*W),r*sin(th));}
 float shimmer=1.+(.01+.02*detail)*sin(TAU*(5.*uv.x+3.*uv.y)-2.*W);
 p.yz=vec2(TC*p.y-TS*p.z,TS*p.y+TC*p.z);
 float c=cos(Phi),s=sin(Phi);
 return vec3(c*p.x-s*p.z,p.y,s*p.x+c*p.z)*shimmer;
}
void main(){
 // The seed picks the first form / choreography (whole steps: a hold).
 float dev=DEV,W=u_clock[0],M=u_clock[1]+mod(u_seed,4.),Phi=u_clock[2];
 float amp=u_params[2],detail=clamp(u_params[3],0.,1.),size=u_params[7];
 float kick=clamp(u_kick,0.,1.);
 vec2 g=(a_cell-(N-1.)*.5)*SP;
 float rho=length(g);
 float s01=sst(0.,1.,dev),s12=clamp(dev-1.,0.,1.);
 float sig=sst(0.,1.,s12*(1.+STAGGER)-STAGGER*rho/RMAX);
 vec4 w=chorus(M);
 float rp=ringP(rho,kick),ring=RAMP*kick*rp*amp;
 float base=seedAngle(.6180339887);
 vec3 pg=vec3(0.),ng=vec3(0.,1.,0.);float hg=.5;
 if(sig<1.){
  float e=SP*.5;
  vec4 hx=vec4(g.x+e,g.x-e,g.x,g.x),hz=vec4(g.y,g.y,g.y+e,g.y-e);
  float y0=rippleH(g,W),y=y0+s01*(waveH(g,W,w,Phi,detail,base)*amp-y0);
  vec4 hh;
  for(int k=0;k<4;k++){vec2 q=vec2(hx[k],hz[k]);float r0=rippleH(q,W);hh[k]=r0+s01*(waveH(q,W,w,Phi,detail,base)*amp-r0);}
  pg=vec3(g.x,HANG+y+ring,g.y);
  ng=normalize(vec3(-(hh.x-hh.y)/(2.*e),1.,-(hh.z-hh.w)/(2.*e)));
  hg=clamp(.5+(y+ring)*1.15+.22*(1.-s01)*y0/.075,0.,1.);
 }
 vec3 ps=vec3(0.),ns=vec3(0.,1.,0.);float rs=R0,hs=.5;
 if(sig>0.){
  float index=a_cell.y*N+a_cell.x;
  vec2 dims=vec2(${f(SURFACE_COLS)},${f(SURFACE_ROWS)});
  vec2 uv=(vec2(mod(index,dims.x),floor(index/dims.x))+.5)/dims,e=.5/dims;
  vec3 p=sculpt(uv,w,W,Phi,detail);
  vec3 du=sculpt(uv+vec2(e.x,0.),w,W,Phi,detail)-sculpt(uv-vec2(e.x,0.),w,W,Phi,detail);
  vec3 dv=sculpt(uv+vec2(0.,e.y),w,W,Phi,detail)-sculpt(uv-vec2(0.,e.y),w,W,Phi,detail);
  vec3 cr=cross(dv,du);float cl=length(cr);
  ns=cl>1e-9?cr/cl:vec3(0.,1.,0.);
  ps=CENTER+p+ns*ring*.6;
  if(ns.y<0.)ns=-ns;
  rs=clamp(.55*sqrt(length(du)*length(dv)),.014,.055);
  hs=clamp(.5+.34*p.y,0.,1.);
 }
 vec3 P=mix(pg,ps,sig);
 vec3 Ns=normalize(mix(ng,ns,sig)+vec3(0.,1e-4,0.));
 float r=size*mix(R0,rs,sig),hue=mix(hg,hs,sig);
 vec3 eye,R,U,F;cameraRig(dev,eye,R,U,F);
 // Surface light: every sphere carries the shading of the surface it
 // belongs to (facing ratio, glint, rim), so the lattice reads as one sheet.
 vec3 V=normalize(eye-P);
 vec3 Nv=dot(Ns,V)<0.?-Ns:Ns;
 float facing=max(dot(Nv,V),0.);
 vec3 L=normalize(vec3(-eye.x*.35,2.6,-eye.z*.35));
 vec3 Hh=normalize(L+V);
 float glint=pow(max(dot(Nv,Hh),0.),28.);
 vec3 L2=normalize(vec3(eye.z,-1.4,-eye.x));
 float glint2=pow(max(dot(Nv,normalize(L2+V)),0.),18.);
 float rim=pow(1.-facing,3.);
 float glow=u_params[4];
 vec3 col=tone(hue);
 // Kick ring crests and lattice lines are the rare accent.
 // Light outlives the small motor displacement, making the travelling
 // front readable even at breakdown energy. The launch still grows from 0.
 float gain=KSTR*(.12+.88*sst(0.,1.,u_level));
 float crest=max(rp,0.)*sst(0.,.06,kick/max(gain,1e-5));
 float lattice=float(mod(a_cell.x,8.)<.5||mod(a_cell.y,8.)<.5)*clamp(u_rhythm.z,0.,1.);
 float q=(a_cell.x+a_cell.y)/(2.*N);
 float sweep=exp(-pow((q-(1.-clamp(u_rhythm.y,0.,1.)))*11.,2.))*min(1.,u_rhythm.y*4.);
 float slot=floor(u_time*1.3+a_rnd*9.);
 float tw=step(1.-(.006+.05*detail),fract(sin(slot*12.9898+a_rnd*78.233)*43758.5453))*sin(PI*fract(u_time*1.3+a_rnd*9.));
 // Occlusion proxy for the sculpture: spheres near its axis (the torus
 // hole, the saddle's centre, the band's inner rim) sit deeper in the form.
 float ao=mix(1.,.3+.7*sst(.3,1.6,length(P-CENTER)),sig);
 // The level ceiling's faint ripple also travels as light: slow bands of
 // brightness drift across the lattice and fade as the waves take over.
 float sheen=1.+.7*(1.-s01)*(1.-sig)*rippleH(g,W)/.075;
 vec3 emit=col*glow*(mix(.5,.14,sig)+mix(.55,1.2,sig)*pow(facing,1.4))*(.6+.4*max(s01,sig))*ao*sheen;
 emit+=mix(col,vec3(1.),.55)*glow*(1.6*glint+.6*glint2)*mix(1.,1.8,sig)*ao;
 emit+=mix(u_secondary,vec3(1.),.35)*rim*.28*glow*(.4+.6*max(s01,sig));
 emit+=mix(u_primary,vec3(1.),.55)*glow*crest*2.4;
 emit=mix(emit,u_accent*glow*2.,crest*.35);
 emit+=u_accent*lattice*glow*1.2;
 emit+=mix(col,vec3(1.),.5)*sweep*glow*.9;
 emit+=vec3(1.)*tw*glow*.8;
 float A=u_resolution.x/u_resolution.y,Fk=focal();
 float pixA=2./(Fk*min(u_resolution.x,u_resolution.y));
 v_info=vec4(a_kind,r,sig,crest);
 vec3 Cw;
 if(a_kind<.5){
  Cw=P;
 }else if(a_kind<1.5){
  Cw=vec3(P.x,-P.y,P.z);
 }else{
  Cw=P+vec3(0.,r,0.);
 }
 vec3 c=Cw-eye;
 vec3 cv=vec3(dot(c,R),dot(c,U),dot(c,F));
 v_c=cv;v_col=emit;v_q=a_corner;
 vec3 view;
 if(a_kind<1.5){
  // Ray-traced impostor; kind 1 is the sphere mirrored in the polished
  // floor (opaque, so the mirror world occludes itself correctly), dimmed
  // by Fresnel and softened with the sphere's height above the floor.
  float blur=0.,refl=1.;
  if(a_kind>.5){
   vec3 toM=normalize(Cw-eye);
   float cosI=clamp(-toM.y,0.,1.);
   refl=.55+.35*pow(1.-cosI,2.);
   blur=.004*max(P.y,0.);
  }
  float L2c=dot(cv,cv);
  float ext=r*sqrt(L2c/max(L2c-r*r,1e-6))+2.*sqrt(L2c)*pixA+blur;
  vec3 dir=cv/sqrt(L2c);
  vec3 ax=vec3(dir.z,0.,-dir.x);ax=dot(ax,ax)>1e-8?normalize(ax):vec3(1.,0.,0.);
  vec3 ay=cross(dir,ax);
  view=cv+(ax*a_corner.x+ay*a_corner.y)*ext;
  if(cv.z<NEARZ+r)view=vec3(0.,0.,-1.);
  v_ray=view;
  v_info.z=blur;v_info.w=refl;
 }else{
  // Thread: from the sphere's top towards the ceiling, a resolution-scaled
  // antialiased line, clipped at the near plane.
  float top=min(CEIL,Cw.y+3.2);
  vec3 b=vec3(Cw.x,top,Cw.z)-eye;
  vec3 a3=cv,b3=vec3(dot(b,R),dot(b,U),dot(b,F));
  float zn=NEARZ*2.;
  if(a3.z<zn&&b3.z<zn){gl_Position=vec4(0.,0.,2.,1.);v_ray=vec3(0.);return;}
  if(a3.z<zn)a3=mix(a3,b3,(zn-a3.z)/(b3.z-a3.z));
  if(b3.z<zn)b3=mix(b3,a3,(zn-b3.z)/(a3.z-b3.z));
  vec2 sc=vec2(Fk/max(A,1.),Fk*min(A,1.));
  vec2 pa=a3.xy*sc/a3.z,pb=b3.xy*sc/b3.z;
  vec2 dpx=(pb-pa)*u_resolution*.5;
  vec2 dir=dot(dpx,dpx)>1e-8?normalize(dpx):vec2(0.,1.);
  vec2 perp=vec2(-dir.y,dir.x);
  float hw=1.25*max(1.,min(u_resolution.x,u_resolution.y)/1080.);
  vec3 e3=a_corner.y<0.?a3:b3;
  vec2 pe=(a_corner.y<0.?pa:pb)+perp*a_corner.x*hw*2./u_resolution;
  float along=a_corner.y<0.?0.:top-Cw.y;
  v_q=vec2(a_corner.x,along);
  v_ray=vec3(0.,0.,length(e3));
  gl_Position=vec4(pe*e3.z,(e3.z*(FARZ+NEARZ)-2.*FARZ*NEARZ)/(FARZ-NEARZ),e3.z);
  return;
 }
 gl_Position=vec4(view.x*Fk/max(A,1.),view.y*Fk*min(A,1.),
  (view.z*(FARZ+NEARZ)-2.*FARZ*NEARZ)/(FARZ-NEARZ),view.z);
}`;
const surface = `#version 300 es
precision highp float;
in vec3 v_ray;
in vec2 v_q;
flat in vec3 v_c,v_col;
flat in vec4 v_info;
uniform float u_time,u_kick,u_seed;
uniform float u_clock[4];
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec3 u_primary,u_secondary,u_accent;
${common}
out vec4 outColor;
void main(){
 float kind=v_info.x;
 vec3 fogC=mix(u_secondary,u_primary,.3)*.02;
 if(kind<1.5){
  float r=v_info.y;
  vec3 d=normalize(v_ray);
  float b=dot(d,v_c),c2=max(dot(v_c,v_c)-b*b,0.),h=sqrt(c2);
  float pixA=2./(focal()*min(u_resolution.x,u_resolution.y));
  float wpx=b*pixA+v_info.z;
  float cover=clamp((r-h)/wpx+.5,0.,1.);
  if(cover<=0.)discard;
  float t=b-sqrt(max(r*r-c2,0.));
  vec3 hit=d*t,n=(hit-v_c)/r;
  float mu=max(dot(n,-d),0.);
  // Frosted globe: bright diffuse core and a soft limb.
  vec3 col=v_col*(.5+.5*pow(mu,.6));
  col+=mix(v_col,vec3(1.),.6)*pow(1.-mu,2.5)*.25;
  col*=v_info.w;
  col=mix(fogC,col,exp(-t*FOGK));
  col=mix(fogC*.5,col,cover);
  float z=hit.z;
  gl_FragDepth=clamp(((FARZ+NEARZ)-2.*FARZ*NEARZ/max(z,NEARZ))/(FARZ-NEARZ)*.5+.5,0.,1.);
  outColor=vec4(max(col,vec3(0.)),1.);
 }else{
  float side=1.-abs(v_q.x);
  float along=v_q.y;
  float fade=exp(-along*1.05)*sst(0.,.08,along);
  float dist=v_ray.z;
  float k=v_info.y/R0;
  vec3 col=mix(v_col,vec3(1.),.2)*side*side*fade*mix(.11,.006,v_info.z)*min(k*k,1.4)*exp(-dist*FOGK);
  outColor=vec4(max(col,vec3(0.)),1.);
  gl_FragDepth=gl_FragCoord.z;
 }
}`;
const background = `
uniform float u_clock[4];
${common}
// Closed form of the haze layer integral (kinetic-model.mjs hazeLayer).
float segI(float c,float a,float t0,float t1){
 if(!(t1>t0))return 0.;
 if(abs(a)<1e-6)return (t1-t0)*exp(c+a*.5*(t0+t1));
 return (exp(c+a*t1)-exp(c+a*t0))/a;
}
float hazeLayer(float o,float d,float t0,float t1,float h,float sA,float sB,float F){
 if(!(t1>t0))return 0.;
 float y0=o-h;
 vec2 ab=vec2(-y0/sA,-d/sA-1./F),bl=vec2(y0/sB,d/sB-1./F);
 bool first=y0+d*t0>=0.;
 float tc=-y0/d;
 if(!(tc>t0&&tc<t1))return first?segI(ab.x,ab.y,t0,t1):segI(bl.x,bl.y,t0,t1);
 return first?segI(ab.x,ab.y,t0,tc)+segI(bl.x,bl.y,tc,t1):segI(bl.x,bl.y,t0,tc)+segI(ab.x,ab.y,tc,t1);
}
vec2 columnSpan(vec2 o,vec2 d,float e,float T){
 vec2 inv=1./(abs(d)+1e-9)*sign(d+1e-12);
 vec2 a=(-e-o)*inv,b=(e-o)*inv;
 float t0=max(0.,max(min(a.x,b.x),min(a.y,b.y))),t1=min(T,min(max(a.x,b.x),max(a.y,b.y)));
 return t1>t0?vec2(t0,t1):vec2(0.);
}
// ∫ s²/(s²+|o+d t-C|²) dt over [0,T]: glow of the sculpture in haze.
float hazeBall(vec3 o,vec3 d,float T,vec3 C,float s){
 vec3 w=C-o;float tc=dot(w,d),b2=max(dot(w,w)-tc*tc,0.),q=sqrt(s*s+b2);
 return s*s/q*(atan((T-tc)/q)-atan(-tc/q))*exp(-max(tc,0.)*.06);
}
float poolGrid(vec2 p){float m=max(abs(p.x),abs(p.y));return sst(${f((((N - 1) / 2) * SPACING + 2.5).toFixed(3))},${f((((N - 1) / 2) * SPACING - 3.0).toFixed(3))},m);}
void main(){
 float dev=DEV,s2=sst(1.,2.,dev),s01=sst(0.,1.,dev);
 vec3 eye,R,U,F;cameraRig(dev,eye,R,U,F);
 float A=u_resolution.x/u_resolution.y,Fk=focal();
 vec2 s=(v_uv-.5)*2.;
 vec3 rd=normalize(R*(s.x*max(A,1.)/Fk)+U*(s.y/(Fk*min(A,1.)))+F);
 vec3 hazeC=mix(u_secondary,u_primary,.6);
 vec3 fogC=mix(u_secondary,u_primary,.3)*.02;
 float glow=u_params[4];
 float T=40.;vec3 col=fogC;
 float layerH=HANG;
 if(rd.y<-1e-4){
  T=-eye.y/rd.y;
  vec3 P=eye+rd*T;
  // Light pool on the polished floor under the installation.
  float pool=mix(poolGrid(P.xz),1./pow(1.+dot(P.xz,P.xz)/5.,1.5),s2);
  // Large polished tiles: faint seams and per-tile sheen as scale cue.
  vec2 tile=P.xz/1.2;vec2 fw=fwidth(tile);
  vec2 sd=abs(fract(tile)-.5);
  vec2 ti=floor(tile);
  float sheen=.85+.3*fract(sin(dot(ti,vec2(12.9898,78.233)))*43758.5453);
  float lineAA=sst(1.,.2,max(fw.x,fw.y));
  float seams=max(1.-sst(0.,fw.x*1.5,.5-sd.x),1.-sst(0.,fw.y*1.5,.5-sd.y))*lineAA;
  vec3 floorC=hazeC*pool*.05*glow*(1.-.6*seams);
  // Mirror of the haze glow in the floor (Schlick-weighted).
  vec3 md=vec3(rd.x,-rd.y,rd.z);
  float fres=.08+.6*pow(1.-abs(rd.y),5.);
  vec2 ms=columnSpan(P.xz,md.xz,EXT,30.);
  float mh=mix(hazeLayer(0.,md.y,ms.x,ms.y,layerH,.4,1.3,12.),hazeBall(P,md,30.,CENTER,1.3),s2);
  floorC+=hazeC*mh*.105*glow*fres*sheen;
  col=mix(fogC,floorC,exp(-T*FOGK));
 }else if(rd.y>1e-4){
  T=min((CEIL-eye.y)/rd.y,40.);
  vec3 P=eye+rd*T;
  float pool=mix(poolGrid(P.xz),1./pow(1.+dot(P.xz,P.xz)/9.,1.5),s2);
  // Motor housings: a dark lattice of small plates over the installation.
  vec2 cell=P.xz/SP+.5*(N-1.);vec2 fw=fwidth(cell);
  vec2 sd=abs(fract(cell)-.5);
  float plate=(1.-sst(.18,.18+fw.x,max(sd.x,sd.y)))*sst(.6,.15,max(fw.x,fw.y))*poolGrid(P.xz);
  vec3 ceilC=hazeC*pool*.012*glow+hazeC*plate*.02*glow*pool;
  col=mix(fogC,ceilC,exp(-T*FOGK));
 }
 // Haze lit by the installation: a light layer at hang height while the
 // grid hangs, the sculpture's glow ball as it gathers.
 vec2 cs=columnSpan(eye.xz,rd.xz,EXT,T);
 float layer=hazeLayer(eye.y,rd.y,cs.x,cs.y,layerH,.4,1.3,12.);
 float ball=hazeBall(eye,rd,T,CENTER,1.3);
 // Broad shafts inside the installation's footprint: smooth modulation of
 // the analytic light integral, never grainy raymarch noise.
 float tm=clamp((HANG-eye.y)/max(abs(rd.y),.08)*sign(rd.y),cs.x,max(cs.x,cs.y));
 vec2 hp=(eye+rd*tm).xz;
 float shafts=.72+.28*pow(.5+.5*cos(hp.x*.7+u_clock[0]) * cos(hp.y*.53-u_clock[0]),2.);
 col+=hazeC*glow*(mix(layer*.032*shafts,ball*.04,s2));
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
  { key: "speed", label: "Wave speed", min: 0.1, max: 2, step: 0.01, default: 1 },
  { key: "amplitude", label: "Wave height", min: 0.3, max: 1.6, step: 0.01, default: 1 },
  { key: "detail", label: "Ripple detail", min: 0, max: 1, step: 0.01, default: 0.4 },
  { key: "glow", label: "Sphere glow", min: 0.4, max: 1.6, step: 0.01, default: 1 },
  { key: "morph", label: "Choreography pace", min: 0.2, max: 2, step: 0.01, default: 1 },
  { key: "orbit", label: "Camera orbit", min: 0, max: 2, step: 0.01, default: 1 },
  { key: "size", label: "Sphere size", min: 0.6, max: 1.5, step: 0.01, default: 1 },
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
    "Thousands of glowing spheres on threads hang level under a motor ceiling, ripple into interfering wave choreographies and gather into one floating surface that morphs from sphere to torus, Möbius band and saddle.",
  development: "development",
  schema,
  presets: [
    look("Still Ceiling", 1216, 0),
    look("Wave Choreography", 1216, 1),
    look("Floating Sculpture", 1216, 2),
    look("Slow Tide", 377, 0.7, { speed: 0.55, amplitude: 1.35, detail: 0.2, orbit: 0.6 }),
    look("Rain Curtain", 2048, 1.65, { morph: 0.6, size: 0.85, orbit: 0.7 }),
    look("Dense Swell", 909, 1, { speed: 1.35, detail: 0.85, size: 0.8, morph: 1.4 }),
    look("Möbius Drift", 6006, 2, { morph: 0.45, orbit: 0.55, size: 0.9, detail: 0.6 }),
    look("Night Mirror", 63, 0.35, { glow: 0.85, orbit: 0.4, amplitude: 1.2 }),
  ],
  stage: ["speed", "amplitude", "glow"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    speed: { mul: [0.6, 1.5] },
    detail: [0, 0.5],
    morph: { mul: [0.8, 1.3] },
    orbit: { mul: [0.75, 1.5] },
  },
  beat: { punch: 0.05, pulse: 0.05 },
  audio: [
    { param: "speed", feature: "low", amount: 0.05 },
    { param: "detail", feature: "high", amount: 0.06 },
  ],
  rhythm: [
    familyEffect(
      "kick-rings",
      0,
      "Kick rings",
      "A ring wave runs outwards through the sphere lattice from its centre.",
      { period: 4, strength: KICK_STRENGTH, duration: 3.5 },
    ),
    familyEffect(
      "index-sweep",
      1,
      "Index sweep",
      "A band of light sweeps diagonally across the lattice by sphere index, in every state.",
      { period: 8, strength: 0.65, duration: 2 },
    ),
    familyEffect(
      "lattice-lines",
      2,
      "Lattice lines",
      "Every eighth row and column of spheres lights up, tracing the grid across the surface.",
      { period: 16, strength: 0.7, duration: 2.5 },
    ),
  ],
  // Integrated phases (scene-time.mjs): every use is periodic in its period.
  // 0 wave phase (uses ×1, ×2, ×3 inside sin), 1 choreography / form phase
  // (four forms), 2 sculpture turn (×1) and wave direction drift (×½, so the
  // period is 4π), 3 camera orbit.
  clocks: [
    { rate: (p) => 0.75 * p[1], period: 2 * Math.PI },
    { rate: (p) => p[5] / 14, period: 4 },
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
