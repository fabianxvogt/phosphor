import { familyEffect } from "./family-rhythm.mjs";
import { createGeometry, ATTRIBUTES, ADDITIVE_FROM } from "./prism-model.mjs";

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
 if(id<.5){C=vec3(0,1.55+.6*vault,0);size=2.-.35*rise+.18*vault;}
 else{bool upper=id>8.;float growth=upper?vault:rise,side=mod(id,2.)>.5?-1.:1.;
  float bay=upper?floor((id-9.)/2.):floor((id-1.)/2.);
  C=vec3(side*(upper?(2.6-.35*bay):2.65)*u_params[3],upper?2.8+bay*.43:1.05+.12*sin(ip),(bay-(upper?2.:1.5))*1.65)*growth;
  size=(upper?.85:.8)*growth;ang=(upper?side*(.2+bay*.035):side*.12)+.07*sin(phase+ip);
  // Relay banks point away from the persistent central optical axis.
  // Their dispersed rays paint radial fans, not a parallel laser bank.
  yaw=atan(-(bay-(upper?2.:1.5))*1.65,side*(upper?(2.6-.35*bay):2.65)*u_params[3])+.08*sin(phase+ip);}
 if(id>18.5){float lens=id-19.,side=mod(lens,2.)>.5?-1.:1.;float g=rise;
  C=vec3(side*1.75*u_params[3],2.15+1.05*vault,(floor(lens/2.)-.5)*3.5)*g;
  size=(.65+.3*vault)*g;ang=0.;yaw=side*.35+.1*sin(phase);}
 Q=ry(yaw)*rz(ang);
}
void camera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float d=clamp(u_params[0],0.,2.),v=ss(1.,2.,d),a=u_clock[1];
 vec3 target=vec3(1.05,1.15+.7*v,0);
 vec3 exterior=target+normalize(vec3(.35+.18*sin(a),.25+.35*u_params[4]+.035*sin(a*2.),1.))*(7.4+2.*ss(0.,2.,d));
 vec3 entrance=vec3(.3+.65*sin(a),2.9+.4*u_params[4]+.12*sin(a*2.),9.2+.45*cos(a));
 eye=mix(exterior,entrance,v);target=mix(target,vec3(0,2.2,0),v);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0,1,0)));U=cross(R,F);
}
float focal(){return mix(2.15,1.6,ss(1.,2.,u_params[0]))*u_params[7]*(1.+.02*u_kick);}
vec3 tone(float t){return mix(mix(u_secondary,u_primary,ss(0.,.65,t)),u_accent,ss(.65,1.,t));}
vec3 floorColor(vec3 p){
 float r=length(p.xz),pool=exp(-r*r/40.);
 float rings=abs(fract(r*.4)-.5);float aa=max(.003,r*.001);
 float engraving=(1.-ss(.001,.001+aa,rings))*.013;
 float shadow=1.-.78*exp(-dot(p.xz,p.xz)/1.8);
 vec3 col=mix(u_secondary,u_primary,.15)*(.012*pool*shadow+engraving*pool);
 // A low-frequency optical receiver pattern is also sampled by refracted
 // view rays: the engraving visibly shifts behind the transparent glass.
 float stripes=pow(.5+.5*sin(p.x*1.8+p.z*.6),18.);
 col+=tone(.25+.3*sin(p.x*.3))*stripes*.055*pool;
 // Broad scattered energy beneath the exact sharp receiver footprints.
 // Its continuous spectral position also becomes visible through glass.
 float caustic=exp(-pow(p.z/.26,2.))*exp(-pow((p.x-3.4)/1.7,8.));
 col+=tone(.07+.66*ss(1.8,5.,p.x))*caustic*.12;
 return col;
}
vec3 gallery(vec3 o,vec3 d){
 if(d.z>-.001)return vec3(0);
 float t=(-7.-o.z)/d.z;vec3 p=o+d*t;
 float height=ss(0.,.5,p.y)*(1.-ss(4.5,5.8,p.y));
 float slots=exp(-pow((abs(p.x)-4.5)/.025,2.))+exp(-pow((abs(p.x)-7.5)/.025,2.));
 float wall=exp(-pow(p.y-2.,2.)*.2)*exp(-p.x*p.x*.02)*.009;
 slots+=exp(-pow((abs(p.x)-1.6)/.045,2.))*.6;
 return mix(u_secondary,vec3(1),.35)*(slots*.16*height+wall)*exp(-t*.012);
}
vec3 environment(vec3 o,vec3 d){
 vec3 col=u_secondary*(.003+.01*max(d.y,0.))+gallery(o,d);
 vec3 silver=mix(u_secondary,vec3(1),.6),key=mix(u_primary,vec3(1),.7);
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
out vec3 v_world,v_local,v_normal;out vec2 v_uv;flat out vec4 v_info;flat out vec3 v_center;flat out float v_size;flat out mat3 v_Q;
void main(){
 float id=a_info.x,kind=a_info.y,lambda=mix(.38,.78,a_info.z),segment=a_info.w;
 vec3 C;float size;mat3 Q;pose(id,C,size,Q);
 vec3 eye,R,U,F;camera(eye,R,U,F);vec3 p;
 v_center=C;v_size=size;v_Q=Q;v_uv=a_position.xy;v_info=a_info;v_local=a_position;v_normal=Q*a_normal;
 if(size<.0001){gl_Position=vec4(0,0,2,1);v_world=vec3(0);return;}
 if(kind<.5||kind>2.5){p=C+Q*a_position*size;}
 else{
  float slope=.34+.025*sin(u_clock[0])+.018*u_rhythm.y;vec3 I=vec3(cos(slope),sin(slope),0),o=-3.*I,en,ex;
  vec2 h=prismHit(o,I,en,ex);vec3 entry=o+I*h.x,d=refract(I,en,1./glassIndex(lambda));
  vec2 inner=prismHit(entry+d*.0001,d,en,ex);vec3 leave=entry+d*(inner.y+.0001);
  vec3 outgoing=refract(d,-ex,glassIndex(lambda));
  // The bounded reflected branch is used when the glass/air interface
  // exceeds its critical angle. No normalization of a zero refract vector.
  if(dot(outgoing,outgoing)<1e-8){d=reflect(d,ex);vec2 b=prismHit(leave+d*.0001,d,en,ex);leave+=d*(b.y+.0001);outgoing=refract(d,-ex,glassIndex(lambda));if(dot(outgoing,outgoing)<1e-8)outgoing=reflect(d,ex);}
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
   p=vec3(end.x,.006,end.z);p.xz+=side*a_position.x*.12+axis*a_position.y*.65;
   if(end.y>.03){gl_Position=vec4(0,0,2,1);v_world=vec3(0);return;}
  }else{
   vec3 start=segment<.5?C+Q*o*size:segment<1.5?A:B;
   vec3 finish=segment<.5?A:segment<1.5?B:end;
   p=mix(start,finish,a_position.y*.5+.5);
   vec3 dir=normalize(finish-start),toEye=normalize(eye-p),side=cross(dir,toEye);
   side=dot(side,side)>1e-8?normalize(side):R;
   float width=max(.018,length(eye-p)*2./(min(u_resolution.x,u_resolution.y)*focal()));
   p+=side*a_position.x*width*3.;
  }
 }
 v_world=p;if(kind>3.5)p.y=-p.y;vec3 q=p-eye;vec3 cv=vec3(dot(q,R),dot(q,U),dot(q,F));float aspect=u_resolution.x/u_resolution.y;
 gl_Position=vec4(cv.x*focal()/max(aspect,1.),cv.y*focal()*min(aspect,1.),(cv.z*60.1-12.)/59.9,cv.z);
}`;
const surface = `#version 300 es
precision highp float;
${uniforms}
${common}
in vec3 v_world,v_local,v_normal;in vec2 v_uv;flat in vec4 v_info;flat in vec3 v_center;flat in float v_size;flat in mat3 v_Q;out vec4 outColor;
void main(){
 vec3 eye,R,U,F;camera(eye,R,U,F);float id=v_info.x,kind=v_info.y,t=v_info.z;
 if(kind>3.5)eye.y=-eye.y;
 vec3 rd=normalize(v_world-eye),col=vec3(0);
 if(kind<.5||kind>2.5){
  vec3 n=normalize(v_normal);if(dot(n,rd)>0.)discard;
  float mu=max(dot(n,-rd),0.),eta=glassIndex(.55),fr=.043+.957*pow(1.-mu,5.);
  vec3 d=refract(rd,n,1./eta),localD=transpose(v_Q)*d,en,ex;
  vec2 h=prismHit(v_local+localD*.0001,localD,en,ex);
  if(kind>2.5&&kind<3.5){h.y=.36;ex=normalize(vec3(v_local.xy*.38,-1.));}
  vec3 exitP=v_local+localD*(h.y+.0001),outgoing=refract(localD,-ex,eta);
  float tir=step(dot(outgoing,outgoing),1e-8);if(tir>.5)outgoing=reflect(localD,ex);
  vec3 source=v_center+v_Q*exitP*v_size;
  vec3 transmitted=environment(source,v_Q*outgoing);
  float absorb=exp(-max(h.y,0.)*v_size*.075);
  col=transmitted*absorb*(1.-fr)+environment(v_world,reflect(rd,n))*fr;
  // Polished bevels: the second nearest supporting plane measures edge
  // proximity independently of triangulation (no fake triangle diagonals).
  float m1=1e3,m2=1e3;
  for(int i=0;i<5;i++){float dis=abs((i<3?.5:.65)-dot(planeN(i),v_local));if(dis<m1){m2=m1;m1=dis;}else m2=min(m2,dis);}
  if(kind>2.5&&kind<3.5)m2=abs(1.-length(v_local.xy));
  float footprint=max(fwidth(m2),.001),edge=1.-ss(.003,.013+footprint,m2);
  float key=.3+.7*pow(max(dot(n,normalize(vec3(-.5,.8,1))),0.),2.);
  col+=mix(u_secondary,vec3(1),.55)*edge*(.35+.85*key);
  float innerBevel=exp(-pow((m2-.038)/.014,2.));
  col+=mix(u_primary,vec3(1),.6)*innerBevel*.1*(.4+key);
  col+=tone(.25)*(.012+.024*(1.-mu))*absorb;
  col+=tone(.3)*tir*.1;
  // Light transported inside the solid. The front face transmits this
  // local optical path instead of hiding it behind its depth write.
  float slope=.34+.025*sin(u_clock[0])+.018*u_rhythm.y;
  vec3 incident=vec3(cos(slope),sin(slope),0),origin=-3.*incident,entryN,exitN;
  vec2 bounds=prismHit(origin,incident,entryN,exitN);vec3 entry=origin+incident*bounds.x;
  vec3 internal=refract(incident,entryN,1./eta);vec2 span=prismHit(entry+internal*.0001,internal,entryN,exitN);
  vec2 off=v_local.xy-entry.xy;float along=clamp(dot(off,internal.xy)/dot(internal.xy,internal.xy),0.,span.y);
  float dist=length(off-internal.xy*along),w=max(.006,fwidth(dist)*1.2);
  col+=mix(mix(u_primary,u_secondary,.5),vec3(1),.75)*exp(-dist*dist/(w*w))*1.2*float(kind<.5||kind>3.5);
  if(kind>2.5&&kind<3.5){
   float r=length(v_local.xy),coating=exp(-pow((r-.87)/.035,2.));
   float image=exp(-pow((v_local.y+.25*v_local.x)/.045,2.))*(1.-ss(.65,.95,r));
   col+=tone(.12+.56*ss(-1.,1.,v_local.x))*image*.5;
   col+=mix(u_secondary,vec3(1),.35)*coating*.12;
   col+=tone(.25)*(.022+.06*pow(r,4.));
  }
  if(kind>3.5)col*=.22;
  col+=tone(.2+.4*ss(-.5,.9,v_local.y))*.04*pow(1.-mu,2.);
 }else{
  float population=ss((id-1.)/18.-.12,(id-1.)/18.+.2,.25+.75*u_level);if(id<.5)population=1.;
  vec3 ink=tone(.07+.66*t);float weight=id<.5?1.:id>18.5?.045:.6;
  if(id>18.5)population=.5+.5*u_level;
  if(kind<1.5){
   float x=v_uv.x*3.,core=exp(-x*x*2.2),sheath=exp(-x*x*.35)*.045*u_params[6];
   float ends=ss(0.,.12,1.-abs(v_uv.y));
   if(v_info.w<.5){ink=mix(mix(u_primary,u_secondary,.5),vec3(1),.88);weight*=.1;}
   float address=1.+.65*u_rhythm.x*float(abs(mod(u_rhythmCount.x,19.)-id)<.5);
   col=ink*(core*.7+sheath)*ends*weight*population*address;
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
void main(){vec3 eye,R,U,F;camera(eye,R,U,F);float a=u_resolution.x/u_resolution.y;vec2 q=(v_uv-.5)*2.;vec3 rd=normalize(F+R*q.x*max(a,1.)/focal()+U*q.y/(focal()*min(a,1.)));vec3 col=u_secondary*.002+gallery(eye,rd);
 if(rd.y<-.0001){float t=-eye.y/rd.y;vec3 p=eye+rd*t;col+=floorColor(p)*exp(-t*.025);}
 // Smooth, bounded haze around the optical sculpture, not a volume march.
 vec3 delta=vec3(0,1.6,0)-eye;float along=max(dot(delta,rd),0.);float b2=max(dot(delta,delta)-along*along,0.);
 col+=mix(u_secondary,u_primary,.3)*exp(-b2*.2)*.008*u_params[6];
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
  rhythm: [
    familyEffect(
      "spectral-address",
      0,
      "Spectral address",
      "One persistent prism receives a bounded pulse along its dispersed rays.",
      { period: 4, strength: 0.6, duration: 1.5 },
    ),
    familyEffect(
      "snell-breath",
      1,
      "Snell breath",
      "The incident angle breathes gently, steering the physically refracted fan.",
      { period: 8, strength: 0.6, duration: 2, kind: "motion" },
    ),
    familyEffect(
      "caustic-sweep",
      2,
      "Caustic sweep",
      "A wavelength band travels across the existing spectral floor caustics.",
      { period: 16, strength: 0.65, duration: 3 },
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
