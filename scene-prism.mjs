import { familyEffect } from "./family-rhythm.mjs";
import {
  createGeometry,
  ATTRIBUTES,
  ADDITIVE_FROM,
  ARCH_FIRST,
  ARCH_RIB_COUNT,
  SPECTRAL_SAMPLES,
} from "./prism-model.mjs";

const schema = [
  {
    key: "development",
    label: "Development · shard / array / kaleidoscope",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "motion",
    label: "Optical motion",
    min: 0,
    max: 1.8,
    step: 0.01,
    default: 0.65,
  },
  {
    key: "dispersion",
    label: "Glass dispersion",
    min: 0.5,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "spacing",
    label: "Optical spacing",
    min: 0.7,
    max: 1.25,
    step: 0.01,
    default: 1,
  },
  {
    key: "elevation",
    label: "Optical elevation",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "orbit",
    label: "Gallery glide",
    min: 0,
    max: 1.6,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "haze",
    label: "Beam atmosphere",
    min: 0.3,
    max: 1.4,
    step: 0.01,
    default: 0.8,
  },
  {
    key: "scale",
    label: "Gallery framing",
    min: 0.75,
    max: 1.2,
    step: 0.01,
    default: 1,
  },
];
const base = {
  motion: 0.65,
  dispersion: 1,
  spacing: 1,
  elevation: 0.4,
  orbit: 0.6,
  haze: 0.8,
  scale: 1,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Shard", 10801, 0),
  look("Array", 10801, 1),
  look("Kaleidoscope", 10801, 2),
  look("Flint Nocturne", 10802, 0, {
    elevation: 0.15,
    dispersion: 1.5,
    motion: 0.3,
    scale: 1.15,
  }),
  look("Spectral Cloister", 10803, 1.6, {
    spacing: 0.75,
    elevation: 0.7,
    haze: 1.2,
  }),
  look("Long Exposure", 10804, 0.6, {
    elevation: 0.85,
    dispersion: 1.4,
    motion: 0.2,
    orbit: 0.3,
  }),
  look("Cauchy Vault", 10805, 2, {
    spacing: 1.2,
    scale: 0.9,
    motion: 1.2,
    elevation: 0.2,
  }),
  look("Quiet Optics", 10806, 1, {
    spacing: 1.2,
    dispersion: 0.55,
    elevation: 0.6,
    haze: 0.45,
    orbit: 0.2,
  }),
];
// Shared optics are executed per vertex, not per output pixel. A fixed mesh
// carries all states, spectral ray quads and their floor-receiver caustics.
const common = `
float ss(float a,float b,float x){float q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
vec2 archPoint(float side,float t){float w=3.3*u_params[3],x=w*(1.-t);return vec2(side*x,2.3+sqrt(max(0.,4.*w*w-(w+x)*(w+x))));}
void archRod(float id,out vec3 C,out vec3 stretch,out mat3 Q){
 float index=id-${ARCH_FIRST}.,bay=floor(index/14.),part=mod(index,14.),side=part<7.?-1.:1.,step=mod(part,7.);
 vec2 a=step<.5?vec2(side*3.3*u_params[3],.04):archPoint(side,(step-1.)/6.);
 vec2 b=step<.5?archPoint(side,0.):archPoint(side,step/6.);
 C=vec3((a+b)*.5,6.-bay*3.);stretch=vec3(.23,.23,length(b-a)/1.3);
 Q=rz(-atan(b.x-a.x,b.y-a.y))*rx(-1.5707963268);
 if(index>=${ARCH_RIB_COUNT}.){float rail=index-${ARCH_RIB_COUNT}.,s=mod(rail,3.)-1.;C=vec3(s*3.3*u_params[3],abs(s)>.5?2.3:archPoint(1.,1.).y,4.5-floor(rail/3.)*3.);stretch=vec3(.14,.14,3./1.3);Q=mat3(1);}
}
vec3 objectStretch(float id){vec3 C,s;mat3 Q;if(id>22.5){archRod(id,C,s,Q);return s;}return vec3(1);}
float glassIndex(float lambda){return 1.48+0.012*u_params[2]/(lambda*lambda);}
vec3 planeN(int i){if(i==0)return vec3(-.8660254038,.5,0);if(i==1)return vec3(.8660254038,.5,0);if(i==2)return vec3(0,-1,0);return vec3(0,0,i==3?1.:-1.);}
vec2 prismHit(vec3 o,vec3 d,out vec3 enterN,out vec3 exitN){
 float lo=-1e8,hi=1e8;enterN=vec3(0);exitN=vec3(0);
 for(int i=0;i<5;i++){vec3 n=planeN(i);float den=dot(n,d),dist=(i<3?.5:.65)-dot(n,o);
  if(abs(den)<1e-7){if(dist<0.)return vec2(1.,-1.);continue;}
  float t=dist/den;if(den<0.&&t>lo){lo=t;enterN=n;}if(den>0.&&t<hi){hi=t;exitN=n;}}
 return vec2(lo,hi);
}
void pose(float id,out vec3 C,out float size,out mat3 Q){
 float dev=clamp(u_params[0],0.,2.),rise=ss(0.,1.,dev),vault=ss(1.,2.,dev);
 float phase=u_clock[0],seed=mod(u_seed,997.)*.0063,ip=seed+id*2.39996323;
 float ang=.08*sin(phase),yaw=.06+.22*sin(phase)+.12*sin(seed);
 if(id<.5){C=vec3(0,1.55+.25*vault,-2.2*vault);size=2.-.35*rise+.45*vault;}
 else{bool upper=id>8.;float growth=upper?vault:rise,side=mod(id,2.)>.5?-1.:1.;
  float bay=upper?floor((id-9.)/2.):floor((id-1.)/2.);
  C=vec3(side*(upper?2.6:mix(2.65,3.05,vault))*u_params[3],upper?4.3+.15*bay:1.05+1.15*vault+.12*sin(ip),(bay-(upper?2.+1.6*vault:1.5+.9*vault))*mix(1.65,2.6,vault))*growth;
  size=(upper?1.05:.8)*growth;ang=(upper?side*.16:side*.12)+.07*sin(phase+ip);
  // The side relays turn inward as ten persistent upper prisms grow into
  // an optical rose. Physically traced spectra cross through the nave.
  yaw=atan(-(bay-(upper?2.:1.5))*1.65,side*(upper?2.6:2.65)*u_params[3])+3.1415926536*vault+.08*sin(phase+ip);
  if(upper){float theta=(id-9.)*.6283185307+.06*sin(phase);
   C=vec3(cos(theta)*2.45*u_params[3],4.25+sin(theta)*2.45,-1.5)*growth;
   size=.82*growth;ang=theta+3.48;yaw=.05*sin(phase+ip);}}
 if(id>18.5&&id<22.5){float lens=id-19.,side=mod(lens,2.)>.5?-1.:1.;float g=rise;
  C=vec3(side*mix(1.75,1.05,vault)*u_params[3],2.15+vault*(floor(lens/2.)<.5?1.05:3.15),mix((floor(lens/2.)-.5)*3.5,-1.2,vault))*g;
  size=(.65+.04*vault)*g;ang=0.;yaw=(side*.35+.1*sin(phase))*(1.-vault);}
 Q=ry(yaw)*rz(ang);
 if(id>22.5){vec3 stretch;archRod(id,C,stretch,Q);C*=vault;size=vault;}
}
void camera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float d=clamp(u_params[0],0.,2.),v=ss(1.,2.,d),a=u_clock[1];
 vec3 target=vec3(1.05,1.15+.7*v,0);
 vec3 exterior=target+normalize(vec3(.35+.18*sin(a),.25+.35*u_params[4]+.035*sin(a*2.),1.))*(7.4+2.*ss(0.,2.,d));
 vec3 entrance=vec3(.35+.65*sin(a),2.35+.4*u_params[4]+.12*sin(a*2.),4.3+1.1*cos(a));
 eye=mix(exterior,entrance,v);target=mix(target,vec3(0,3.3,-5.),v);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0,1,0)));U=cross(R,F);
}
float focal(){return mix(2.15,1.22,ss(1.,2.,u_params[0]))*u_params[7]*(1.+.02*u_kick);}
// Same full, non-wrapping gradient as the picture header's palette(t).
vec3 spectrum(float t){return mix(mix(u_secondary,u_primary,ss(0.,.65,t)),u_accent,ss(.65,1.,t));}
vec3 tone(float t){return spectrum(t);}
vec3 floorColor(vec3 p){
 float r=length(p.xz),pool=exp(-r*r/40.);
 float rings=abs(fract(r*.4)-.5);float aa=max(.003,r*.001);
 float engraving=(1.-ss(.001,.001+aa,rings))*.013;
 float shadow=1.-.78*exp(-dot(p.xz,p.xz)/1.8);
 float tile=min(abs(fract(p.x*.25+.5)-.5),abs(fract(p.z*.25+.5)-.5));
 float seams=1.-ss(.001,.004+length(p.xz)*.0003,tile);
 vec3 col=mix(u_secondary,u_primary,.15)*(.045*pool*shadow+engraving*pool+seams*.009);
 col+=mix(u_secondary,vec3(1),.3)*exp(-pow((p.x+3.)/2.,2.))*.025*exp(-abs(p.z)*.035);
 // A low-frequency optical receiver pattern is also sampled by refracted
 // view rays: the engraving visibly shifts behind the transparent glass.
 float stripes=pow(.5+.5*sin(p.x*1.8+p.z*.6),18.);
 col+=tone(.25+.3*sin(p.x*.3))*stripes*.055*pool;
 // Broad scattered energy beneath the exact sharp receiver footprints.
 // Its continuous spectral position also becomes visible through glass.
 float caustic=exp(-pow(p.z/.26,2.))*exp(-pow((p.x-3.4)/1.7,8.));
 col+=spectrum(ss(1.8,5.,p.x))*caustic*.12;
 // Smooth fold caustics support the exact ray-receiver footprints. Their
 // finite envelope is the light's receiver, never a whole-floor effect.
 float vault=ss(1.,2.,u_params[0]);vec2 q=p.xz-vec2(3.2*(1.-vault),-2.*vault);
 float folds=sin(q.x*3.1+.7*sin(q.y*2.8+u_clock[0]))+sin(q.y*3.7+.6*sin(q.x*2.4-u_clock[0]));
 float footprint=exp(-pow(q.x/(1.7+2.4*vault),4.)-pow(q.y/(1.15+4.*vault),4.));
 float net=exp(-abs(folds)*24.);
 col+=spectrum(ss(-2.,3.,q.x))*(net*.28+.012)*footprint;
 return col;
}
vec3 gallery(vec3 o,vec3 d){
 if(d.z>-.001)return vec3(0);
 float t=(-18.-o.z)/d.z;vec3 p=o+d*t;
 float height=ss(0.,.5,p.y)*(1.-ss(8.5,10.,p.y));
 float slots=exp(-pow((abs(p.x)-4.5)/.025,2.))+exp(-pow((abs(p.x)-7.5)/.025,2.));
 float wall=exp(-pow(p.y-3.,2.)*.022)*exp(-p.x*p.x*.006)*.065;
 slots+=exp(-pow((abs(p.x)-1.6)/.045,2.))*.6;
 return mix(u_secondary,vec3(1),.35)*(slots*.16*height+wall)*exp(-t*.012);
}
vec3 environment(vec3 o,vec3 d){
 vec3 col=u_secondary*(.003+.01*max(d.y,0.))+gallery(o,d);
 vec3 silver=mix(u_secondary,vec3(1),.6),key=mix(u_primary,vec3(1),.7);
 // A broad, distant cyclorama stays below the subject's specular strips.
 col+=mix(u_secondary,u_primary,.12)*.04*pow(max(d.y,0.),.5);
 float soft=pow(max(dot(d,normalize(vec3(-.45,.8,1))),0.),22.);
 float rim=pow(max(dot(d,normalize(vec3(.8,.4,-.7))),0.),65.);
 float strip=exp(-pow((d.x+.3*d.z-.25)/.035,2.))*ss(-.2,.5,d.y);
 col+=silver*soft*.8+key*rim*2.+key*strip*1.4;
 // Broad diffusion cards are visible as faint gradients between the hard
 // reflected strips; glass remains transparent instead of an outline.
 col+=silver*.16*pow(max(dot(d,normalize(vec3(.1,.3,1))),0.),5.);
 // Finite studio cards give the plane faces spatial reflections, rather
 // than a uniform fill. Their hard/soft edges describe optical thickness.
 if(d.z>.02){float t=(6.-o.z)/d.z;vec3 p=o+d*t;
  float card=exp(-pow((p.x+5.)/4.,8.))*exp(-pow((p.y+.3)/2.5,8.));
  float slit=exp(-pow((p.x+5.5)/.13,2.))*exp(-pow((p.y+.3)/3.,8.));
  col+=silver*card*2.5+key*slit*4.;}
 if(d.y<-.001){float t=-o.y/d.y;col+=floorColor(o+d*t)*exp(-t*.025);}
 return col;
}
`;
const uniforms = `uniform float u_time,u_seed,u_level,u_kick;uniform float u_clock[4];uniform float u_params[8];uniform vec2 u_resolution;uniform vec3 u_primary,u_secondary,u_accent;uniform vec4 u_rhythm,u_rhythmCount;`;
const vertex = `#version 300 es
precision highp float;
layout(location=0)in vec3 a_position;layout(location=1)in vec3 a_normal;layout(location=2)in vec4 a_info;
${uniforms}
${common}
out vec3 v_world,v_local,v_normal;out vec2 v_uv;out float v_wavelength;flat out float v_visibility;flat out vec4 v_info;flat out vec3 v_center;flat out float v_size;flat out mat3 v_Q;
void main(){
 float id=a_info.x,kind=a_info.y,segment=a_info.w;
 float spectral=a_info.z+(kind==1.&&(segment==2.||segment==5.)&&id<18.5?(a_position.x*.5+.5)/${SPECTRAL_SAMPLES - 1}.:0.);
 float lambda=mix(.38,.78,spectral);v_wavelength=spectral;v_visibility=1.;
 vec3 C;float size;mat3 Q;pose(id,C,size,Q);
 vec3 eye,R,U,F;camera(eye,R,U,F);vec3 p;
 v_center=C;v_size=size;v_Q=Q;v_uv=a_position.xy;v_info=a_info;v_local=a_position;v_normal=Q*(a_normal/objectStretch(id));
 if(size<.0001){gl_Position=vec4(0,0,2,1);v_world=vec3(0);return;}
 if(kind==7.){float growth=ss(1.,2.,u_params[0]);p=vec3(a_position.x*u_params[3],2.3+(a_position.y-2.3)*u_params[3],a_position.z)*growth;v_normal=a_normal;}
 else if(kind<.5||kind>2.5){p=C+Q*(a_position*objectStretch(id))*size;}
 else{
  float slope=.34+.025*sin(u_clock[0])+.018*u_rhythm.y;vec3 I=vec3(cos(slope),sin(slope),0),o=-3.*I,en,ex;
  vec2 h=prismHit(o,I,en,ex);vec3 entry=o+I*h.x,d=refract(I,en,1./glassIndex(lambda));
  vec2 inner=prismHit(entry+d*.0001,d,en,ex);vec3 leave=entry+d*(inner.y+.0001);
  vec3 outgoing=refract(d,-ex,glassIndex(lambda));
  // The bounded reflected branch is used when the glass/air interface
  // exceeds its critical angle. No normalization of a zero refract vector.
  if(dot(outgoing,outgoing)<1e-8){d=reflect(d,ex);vec2 b=prismHit(leave+d*.0001,d,en,ex);leave+=d*(b.y+.0001);outgoing=refract(d,-ex,glassIndex(lambda));if(dot(outgoing,outgoing)<1e-8)outgoing=reflect(d,ex);}
  if(segment==5.&&id<18.5){
   // Fresnel-reflected energy takes one further physical interface. This
   // is a secondary optical branch, not a duplicated decorative fan.
   vec3 bounce=reflect(d,ex);vec2 ghost=prismHit(leave+bounce*.0001,bounce,en,ex);
   leave+=bounce*(ghost.y+.0001);outgoing=refract(bounce,-ex,glassIndex(lambda));
   // At a critical wavelength, keep vertices on the finite limiting
   // tangent and suppress the primitive, never stretch it to clip origin.
   if(dot(outgoing,outgoing)<1e-8){outgoing=normalize(bounce-ex*dot(bounce,ex));v_visibility=0.;}
  }
  if(id>18.5){
   // Paraboloidal biconvex lens: exact ray/exit-paraboloid quadratic,
   // followed by a second Snell interface (not a decorative beam bend).
   vec2 aperture=a_normal.xy;entry=vec3(aperture,-.22+.19*dot(aperture,aperture));
   I=vec3(0,0,1);o=entry-I*2.;en=normalize(vec3(.38*aperture,-1));
   d=refract(I,en,1./glassIndex(lambda));
   float qa=.19*dot(d.xy,d.xy),qb=d.z+.38*dot(entry.xy,d.xy),qc=entry.z-.22+.19*dot(entry.xy,entry.xy);
   float path=-2.*qc/(qb+sqrt(max(qb*qb-4.*qa*qc,0.)));
   leave=entry+d*path;ex=normalize(vec3(.38*leave.xy,1));outgoing=refract(d,-ex,glassIndex(lambda));
  }
  vec3 A=C+Q*entry*size,B=C+Q*leave*size,D=Q*outgoing;
  float travel=D.y<-.025?clamp(-B.y/D.y,.1,11.):6.;
  if(id>18.5)travel=clamp(-dot(leave.xy,outgoing.xy)/max(dot(outgoing.xy,outgoing.xy),1e-5),.5,6.)*size;
  vec3 end=B+D*travel;
  if(kind>1.5&&id>18.5){p=end+(R*a_position.x+U*a_position.y)*.065;}
  else if(kind>1.5){
   vec2 axis=normalize(D.xz+vec2(1e-5)),side=vec2(-axis.y,axis.x);
   p=vec3(end.x,.006,end.z);p.xz+=side*a_position.x*.018+axis*a_position.y*.65;
   if(end.y>.03){gl_Position=vec4(0,0,2,1);v_world=vec3(0);return;}
  }else{
   vec3 start=segment<.5?C+Q*o*size:segment<1.5?A:B;
   vec3 finish=segment<.5?A:segment<1.5?B:end;
   p=mix(start,finish,a_position.y*.5+.5);
   vec3 dir=normalize(finish-start),toEye=normalize(eye-p),side=cross(dir,toEye);
   side=dot(side,side)>1e-8?normalize(side):R;
   float width=max(.007,length(eye-p)*.7/(min(u_resolution.x,u_resolution.y)*focal()));
   if(segment==2.5)width=.09;
   if(segment<.5)width*=1.6;
   if(!((segment==2.||segment==5.)&&id<18.5))p+=side*a_position.x*width*3.;
  }
 }
 v_world=p;if(kind==4.||kind==6.)p.y=-p.y;vec3 q=p-eye;vec3 cv=vec3(dot(q,R),dot(q,U),dot(q,F));float aspect=u_resolution.x/u_resolution.y;
 gl_Position=vec4(cv.x*focal()/max(aspect,1.),cv.y*focal()*min(aspect,1.),(cv.z*60.1-12.)/59.9,cv.z);
}`;
const surface = `#version 300 es
precision highp float;
${uniforms}
${common}
in vec3 v_world,v_local,v_normal;in vec2 v_uv;in float v_wavelength;flat in float v_visibility;flat in vec4 v_info;flat in vec3 v_center;flat in float v_size;flat in mat3 v_Q;out vec4 outColor;
float pathGlow(vec3 o,vec3 d,float limit,vec3 a,vec3 b){
 vec3 e=b-a,q=o-a;float len=length(e);e/=max(len,1e-5);
 float c=dot(d,e),den=max(1.-c*c,1e-5);
 float s=clamp((c*dot(q,e)-dot(q,d))/den,0.,limit);
 float t=clamp(dot(q+d*s,e),0.,len);s=clamp(dot(a+e*t-o,d),0.,limit);
 float dist=length(o+d*s-a-e*t),w=max(.012,fwidth(dist));
 return exp(-dist*dist/(w*w))*2.4+exp(-dist*dist/.004)*.09;
}
void main(){
 if(v_visibility<.5)discard;
 vec3 eye,R,U,F;camera(eye,R,U,F);float id=v_info.x,kind=v_info.y,t=v_wavelength;
 if(kind==4.||kind==6.)eye.y=-eye.y;
 vec3 rd=normalize(v_world-eye),col=vec3(0);
 if(kind==7.){
  vec3 n=normalize(v_normal);if(dot(n,rd)>0.)n=-n;
  float fr=.04+.96*pow(1.-max(dot(n,-rd),0.),5.);
  col=environment(v_world,reflect(rd,n))*fr*.55+gallery(v_world,rd)*.6;
  col+=mix(u_secondary,u_primary,.1)*(.014+.035*fr);
 }else if(kind<.5||kind>2.5){
  vec3 n=normalize(v_normal);if(dot(n,rd)>0.)discard;
  float mu=max(dot(n,-rd),0.),eta=glassIndex(.55),fr=.043+.957*pow(1.-mu,5.);
  vec3 d=refract(rd,n,1./eta),localD=transpose(v_Q)*d/objectStretch(id),en,ex;
  vec2 h=prismHit(v_local+localD*.0001,localD,en,ex);
  if(kind==3.){h.y=.36;ex=normalize(vec3(v_local.xy*.38,-1.));}
  vec3 exitP=v_local+localD*(h.y+.0001),exitNormal=normalize(v_Q*(ex/objectStretch(id)));
  vec3 outgoing=refract(d,-exitNormal,eta);
  float tir=step(dot(outgoing,outgoing),1e-8);if(tir>.5)outgoing=reflect(d,exitNormal);
  vec3 source=v_center+v_Q*(exitP*objectStretch(id))*v_size;
  vec3 transmitted=environment(source,outgoing);
  float absorb=exp(-max(h.y,0.)*v_size*.075);
  col=transmitted*absorb*(1.-fr)+environment(v_world,reflect(rd,n))*fr;
  // Polished bevels: the second nearest supporting plane measures edge
  // proximity independently of triangulation (no fake triangle diagonals).
  float m1=1e3,m2=1e3;
  for(int i=0;i<5;i++){float dis=abs((i<3?.5:.65)-dot(planeN(i),v_local));if(dis<m1){m2=m1;m1=dis;}else m2=min(m2,dis);}
  if(kind==3.)m2=abs(1.-length(v_local.xy));
  float footprint=max(fwidth(m2),.001),edge=1.-ss(.003,.013+footprint,m2);
  float key=.3+.7*pow(max(dot(n,normalize(vec3(-.5,.8,1))),0.),2.);
  col+=mix(u_secondary,vec3(1),.55)*edge*(.35+.85*key);
  float innerBevel=exp(-pow((m2-.038)/.014,2.));
  col+=mix(u_primary,vec3(1),.6)*innerBevel*.1*(.4+key);
  col+=tone(.25)*(.012+.024*(1.-mu))*absorb;
  col+=tone(.3)*tir*.1;
  // View-segment integration carries the two internal optical paths
  // through the front face, instead of hiding them behind its depth write.
  if(kind==0.||kind==4.){
  float slope=.34+.025*sin(u_clock[0])+.018*u_rhythm.y;
  vec3 incident=vec3(cos(slope),sin(slope),0),origin=-3.*incident,entryN,exitN;
  vec2 bounds=prismHit(origin,incident,entryN,exitN);vec3 entry=origin+incident*bounds.x;
  vec3 internal=refract(incident,entryN,1./eta);vec2 span=prismHit(entry+internal*.0001,internal,entryN,exitN);
  vec3 leave=entry+internal*(span.y+.0001),bounce=reflect(internal,exitN),en2,ex2;
  vec2 reflected=prismHit(leave+bounce*.0001,bounce,en2,ex2);
  vec3 next=leave+bounce*(reflected.y+.0001);
  vec3 view=normalize(localD);float viewLength=max(h.y,0.)*length(localD);
  float transported=pathGlow(v_local,view,viewLength,entry,leave);
  float ghost=pathGlow(v_local,view,viewLength,leave,next);
  col+=mix(spectrum(.35),vec3(1),.82)*transported+spectrum(.92)*ghost*.24;
  }
  if(kind==3.){
   float r=length(v_local.xy),coating=exp(-pow((r-.87)/.035,2.));
   float image=exp(-pow((v_local.y+.25*v_local.x)/.045,2.))*(1.-ss(.65,.95,r));
   col+=tone(.12+.56*ss(-1.,1.,v_local.x))*image*.5;
   col+=mix(u_secondary,vec3(1),.35)*coating*.12;
   col+=tone(.25)*(.022+.06*pow(r,4.));
  }
  if(kind==4.||kind==6.)col*=.17;
  col+=tone(.2+.4*ss(-.5,.9,v_local.y))*.04*pow(1.-mu,2.);
 }else{
  float population=ss((id-1.)/18.-.12,(id-1.)/18.+.2,.25+.75*u_level);if(id<.5)population=1.;
  vec3 ink=spectrum(t);float weight=id<.5?1.:id>18.5?.018:.3;
  if(id>18.5)population=.5+.5*u_level;
  if(kind<1.5){
   float x=v_uv.x*3.,core=exp(-x*x*2.2),sheath=exp(-x*x*.22)*.12*u_params[6];
   float ends=ss(0.,.12,1.-abs(v_uv.y));
   if(v_info.w<.5){ink=mix(mix(u_primary,u_secondary,.5),vec3(1),.88);weight*=.035;}
   float address=1.+.65*u_rhythm.x*float(abs(mod(u_rhythmCount.x,19.)-id)<.5);
   if((v_info.w==2.||v_info.w==5.)&&id<18.5){
    float band=ss(0.,.018,t)*(1.-ss(.982,1.,t));
    float branch=v_info.w==5.?.075:1.;
    col=ink*1.9*ends*weight*population*address*band*branch;
   }else if(v_info.w==2.5){col=ink*sheath*.22*ends*weight*population;}
   else col=ink*(core*1.9+sheath)*ends*weight*population*address;
  }else{
   float transverse=exp(-v_uv.x*v_uv.x*12.),longitudinal=exp(-v_uv.y*v_uv.y*2.5);
   float fringe=.75+.25*cos(v_uv.y*18.+t*4.);
   float sweep=1.+.6*u_rhythm.z*exp(-pow((t-(1.-u_rhythm.z))*7.,2.));
   col=ink*transverse*longitudinal*fringe*weight*population*4.*sweep;
  }
 }
 col*=exp(-length(v_world-eye)*.018);outColor=vec4(max(col,vec3(0)),1.);
}`;
const fragment = `uniform float u_clock[4];
${common}
void main(){vec3 eye,R,U,F;camera(eye,R,U,F);float a=u_resolution.x/u_resolution.y;vec2 q=(v_uv-.5)*2.;vec3 rd=normalize(F+R*q.x*max(a,1.)/focal()+U*q.y/(focal()*min(a,1.)));vec3 col=u_secondary*(.008+.008*max(rd.y,0.))+gallery(eye,rd);
 if(rd.y<-.0001){float t=-eye.y/rd.y;vec3 p=eye+rd*t;col+=floorColor(p)*exp(-t*.025);}
 // Smooth, bounded haze around the optical sculpture, not a volume march.
 vec3 delta=vec3(0,1.6,0)-eye;float along=max(dot(delta,rd),0.);float b2=max(dot(delta,delta)-along*along,0.);
 col+=mix(u_secondary,u_primary,.3)*exp(-b2*.055)*.025*u_params[6];
 outColor=vec4(col,1.);}`;
export default {
  id: "prism",
  number: 108,
  name: "Prism Engine",
  description:
    "A turning glass prism disperses a white beam, grows an optical array and opens into a cathedral of glass and spectral caustics.",
  development: "development",
  schema,
  presets,
  stage: ["dispersion", "spacing", "haze"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { motion: { mul: [0.7, 1.3] }, orbit: { mul: [0.8, 1.25] } },
  beat: { punch: 0.1, pulse: 0.06 },
  clocks: [
    { rate: (p) => p[1] * 0.15, period: 2 * Math.PI },
    { rate: (p) => p[5] * 0.035, period: 2 * Math.PI },
  ],
  rhythmStyles: { restrained: "Sleeping spectrum", driving: "Refracted paths", accented: "Caustic choir" },
  rhythm: [
    familyEffect(
      "spectral-address",
      0,
      "Spectral address",
      "One persistent prism receives a bounded pulse along its dispersed rays.",
      { period: 4, strength: 0.6, duration: 1.5, steps: "X...", styles: {
        restrained: { steps: "X....... | ......x. | ....X... | ........", division: 2, strength: 0.5, duration: 1.4 },
        driving: { steps: "X....x.. | ...X..x.", division: 2, strength: 0.76, duration: 0.8 },
        accented: { steps: "X.......x....... | ...X.......x.... | ......X.......x.", division: 4, strength: 0.9, duration: 0.4 },
      } },
    ),
    familyEffect(
      "snell-breath",
      1,
      "Snell breath",
      "The incident angle breathes gently, steering the physically refracted fan.",
      { period: 8, strength: 0.6, duration: 2, kind: "motion", steps: "X.......", styles: {
        restrained: { steps: "...x.... | ........ | .......X | ........", division: 2, strength: 0.5, duration: 1.8 },
        driving: { steps: "......x. | .......X | ........ | ....X...", division: 2, strength: 0.72, duration: 1.4 },
        accented: { steps: "...........x.... | ..............X. | .......x........ | ............X...", division: 4, strength: 0.86, duration: 1.1 },
      } },
    ),
    familyEffect(
      "caustic-sweep",
      2,
      "Caustic sweep",
      "A wavelength band travels across the existing spectral floor caustics.",
      { period: 16, strength: 0.65, duration: 3, steps: "X...............", styles: {
        restrained: { steps: ".....x.. | ........ | ..X..... | ........", division: 2, strength: 0.52, duration: 1.6 },
        driving: { steps: "..X..x.. | .X..x..X", division: 2, strength: 0.78, duration: 0.75 },
        accented: { steps: "..X..x..X..x | .X..x..X..xx", division: 4, strength: 0.92, duration: 0.18 },
      } },
    ),
  ],
  fragment,
  geometry: {
    create: createGeometry,
    attributes: ATTRIBUTES,
    additiveFrom: ADDITIVE_FROM,
    vertex,
    fragment: surface,
  },
};
