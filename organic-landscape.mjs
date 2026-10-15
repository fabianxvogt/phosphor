// Full-resolution geometry carrier for the two reaction–diffusion landscapes.
// A fixed grid samples the existing simulation, never a cached colour image.
// The sparse additive tail is depth-tested against the opaque terrain.
export const LANDSCAPE_COLUMNS = 384;
export const LANDSCAPE_ROWS = 224;
export const LANDSCAPE_VERTICES = LANDSCAPE_COLUMNS * LANDSCAPE_ROWS * 6;
export const GARDEN_LANDSCAPE_VERTICES = 256 * 160 * 6;
export const SPORE_COUNT = 96;
export const CALYX_VERTICES = 256 * 48 * 6;
export function landscapeGeometry(garden = false) {
  const a = [];
  const put = (x, y, kind) => a.push(x, y, kind);
  const columns = garden ? 256 : LANDSCAPE_COLUMNS;
  const rows = garden ? 160 : LANDSCAPE_ROWS;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const x0 = x / columns,
        x1 = (x + 1) / columns;
      const y0 = y / rows,
        y1 = (y + 1) / rows;
      put(x0, y0, 0);
      put(x1, y0, 0);
      put(x0, y1, 0);
      put(x0, y1, 0);
      put(x1, y0, 0);
      put(x1, y1, 0);
    }
  if (garden) {
    // Material-aligned rings put the bright calyx crest on actual mesh rows.
    // Unlike a projected ground grid this remains smooth at 4K close range.
    const radial = (i) =>
      i < 24 ? (i / 24) * 0.7 : 0.7 + ((i - 24) / 24) * 0.3;
    for (let r = 0; r < 48; r++)
      for (let a = 0; a < 256; a++) {
        const r0 = radial(r),
          r1 = radial(r + 1),
          a0 = a / 256,
          a1 = (a + 1) / 256;
        put(r0, a0, -1);
        put(r1, a0, -1);
        put(r0, a1, -1);
        put(r0, a1, -1);
        put(r1, a0, -1);
        put(r1, a1, -1);
      }
  }
  for (let i = 0; i < SPORE_COUNT; i++) {
    put(-1, -1, i + 1);
    put(1, -1, i + 1);
    put(-1, 1, i + 1);
    put(-1, 1, i + 1);
    put(1, -1, i + 1);
    put(1, 1, i + 1);
  }
  return new Float32Array(a);
}
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function calyxSupport(x, y) {
  const r = Math.hypot(x, y),
    nx = x / Math.max(r, 1e-5),
    ny = y / Math.max(r, 1e-5);
  const c3 = nx * (nx * nx - 3 * ny * ny),
    radius = 0.46 + 0.09 * (2 * c3 * c3 - 1);
  return { r, radius, mask: 1 - smooth(0.78, 1, r / radius) };
}
// CPU mirrors of the live calyx and camera clearance, in world units.
export function calyxHeight(
  x,
  y,
  v,
  bloom,
  { relief = 1, fieldScale = 0.025 } = {},
) {
  const { r, radius, mask } = calyxSupport(x, y);
  return (
    fieldScale * relief * smooth(0.035, 0.28, v) * (1 - bloom * mask) +
    bloom * 0.6 * relief * mask * (0.12 + 0.86 * Math.min(1, r / radius) ** 2)
  );
}
export function gardenEye(development, altitude = 1, relief = 1, yaw = 0) {
  const b = smooth(1, 2, development),
    distance = (0.36 + 0.76 * b) * altitude;
  const x = -Math.sin(yaw) * distance,
    y = -Math.cos(yaw) * distance;
  const z = Math.max(
    (0.105 + 0.645 * b) * altitude * Math.sqrt(relief),
    0.065 * relief + b * 0.6 * relief * calyxSupport(x, y).mask + 0.04,
  );
  return [x, y, z];
}

const common = (garden) => `
#define GARDEN ${garden ? 1 : 0}
const float PI=3.14159265359,TAU=6.28318530718;
float smoothBody(float v){return smoothstep(.035,.28,v);}
float field(vec2 uv){
#if GARDEN
 uv+=.004*clamp(u_params[7],0.,1.)*vec2(sin(u_time*.23),cos(u_time*.19));
#endif
 vec4 b=texture(u_state,fract(uv));return (b.b*256.+b.a)*255./65535.;
}
vec2 worldSize(){return ${garden ? "vec2(1.6)" : "vec2(2.083333,1.25)"};}
vec2 focus(){return worldSize()*(.5+vec2(${garden ? ".035*sin(TAU*fract(u_time/120.)),fract(u_time/260.)" : "fract(u_time/560.),fract(u_time/1330.)"}));}
float city(){return smoothstep(1.,2.,u_params[0]);}
float tide(){return smoothstep(0.,1.,u_params[0]);}
float relief(){return clamp(u_params[${garden ? 6 : 4}],.3,1.6);}
float scale(){return ${garden ? "mix(.025+.04*tide()*clamp(u_params[3],0.,1.),.025,city())*relief()" : "mix(mix(.025,.09,tide()),.30,city())*relief()"};}
float crown(vec2 q);
void landscapeCamera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float yaw=${garden ? ".18*sin(TAU*fract(u_time/180.))" : ".35*sin(TAU*fract(u_time/240.))+.12*sin(TAU*fract(u_time/96.))"};
 vec2 heading=vec2(sin(yaw),cos(yaw));
 float altitude=clamp(u_params[5],.7,1.4);
#if GARDEN
 eye=vec3(focus()-heading*mix(.36,1.12,city())*altitude,mix(.105,.75,city())*altitude*sqrt(relief()));
 // Conservative clearance for low-altitude / high-relief intermediate states.
 eye.z=max(eye.z,.065*relief()+city()*.60*relief()*crown(eye.xy-focus())+.04);
 F=normalize(vec3(heading,mix(-.20,-.45,city())));
#else
 eye=vec3(focus()-heading*.38,mix(.10,.20,city())*altitude*sqrt(relief()));
 F=normalize(vec3(heading,mix(-.16,-.035,city())));
#endif
 R=vec3(heading.y,-heading.x,0.);U=cross(R,F);
}
float crown(vec2 q){
 float r=length(q);vec2 n=q/max(r,1e-5);
 float c3=n.x*(n.x*n.x-3.*n.y*n.y);
 float radius=.46+.09*(2.*c3*c3-1.);
 return 1.-smoothstep(.78,1.,r/radius);
}
float heightAt(vec2 q,vec2 eye){
 float v=field(q/worldSize());
#if GARDEN
 vec2 local=q-focus();float r=length(local);
 vec2 n=local/max(r,1e-5);float c3=n.x*(n.x*n.x-3.*n.y*n.y);
 float radius=.46+.09*(2.*c3*c3-1.);
 // The original field persists everywhere; the calyx is ADDED, not a mask.
 float low=scale()*smoothBody(v)*(1.-city()*crown(local));
 float cup=(.12+.86*pow(min(1.,r/radius),2.))*crown(local);
 return low+city()*.60*relief()*cup;
#else
 float body=smoothBody(v*clamp(u_params[6],.7,1.9));
 float steps=body*3.;
 float terraces=(floor(steps)+smoothstep(.30,.70,fract(steps)))/3.;
 // Local clearance keeps the endless camera above its path, not inside a wall.
 vec3 camera,R,U,F;landscapeCamera(camera,R,U,F);
 vec2 delta=q-eye;
 float along=dot(delta,F.xy),across=abs(dot(delta,R.xy));
 float avenue=mix(smoothstep(.08,.16,across),1.,smoothstep(.65,1.25,along));
 float clearance=smoothstep(.12,.26,length(delta))*mix(1.,avenue,city());
 return scale()*mix(body,terraces,city()*.18)*clearance;
#endif
}
vec3 fogColor(vec3 rd){
 float horizon=exp(-abs(rd.z)*8.);
 vec3 color=u_secondary*(.012+.055*horizon)+u_primary*.020*exp(-abs(rd.z+.03)*22.);
 float shaft=pow(max(0.,sin(atan(rd.x,rd.y)*11.+.2*sin(u_time*.035))),18.);
 color+=mix(u_secondary,u_primary,.35)*shaft*.025*exp(-abs(rd.z)*2.);
 return color;
}
`;
const uniforms = `uniform float u_time,u_level,u_kick;
uniform vec2 u_resolution;
uniform float u_params[8];
uniform vec3 u_primary,u_secondary,u_accent;
uniform vec4 u_rhythm,u_rhythmCount;
uniform sampler2D u_state;`;
export function landscape(garden = false) {
  const shared = common(garden);
  return {
    create: () => landscapeGeometry(garden),
    attributes: [3],
    additiveFrom: garden
      ? GARDEN_LANDSCAPE_VERTICES + CALYX_VERTICES
      : LANDSCAPE_VERTICES,
    vertex: `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
${uniforms}
out vec3 v_position,v_normal;
out vec2 v_spore;
flat out float v_kind;
${shared}
float meshHeight(vec2 q,vec2 eye){
#if GARDEN
 if(a_position.z>-.5)return scale()*smoothBody(field(q/worldSize()));
#endif
 return heightAt(q,eye);
}
void main(){
 vec3 eye,R,U,F;landscapeCamera(eye,R,U,F);
 vec3 p,N=vec3(0.,0.,1.);v_spore=vec2(0.);v_kind=a_position.z;
 if(a_position.z<.5){
  // Quadratic longitudinal distribution preserves detail beside the camera.
  float along=-.18+4.8*a_position.y*a_position.y;
  float across=(a_position.x*2.-1.)*(.12+max(along,0.)*.80);
  p=vec3(eye.xy+F.xy*along+R.xy*across,0.);
#if GARDEN
  if(a_position.z<-.5){
   float angle=a_position.y*TAU;
   float radius=.46+.09*cos(angle*6.);
   p.xy=focus()+vec2(cos(angle),sin(angle))*radius*a_position.x;
  }
#endif
  p.z=meshHeight(p.xy,eye.xy);
  vec2 e=worldSize()/vec2(textureSize(u_state,0))*1.5;
  vec2 slope=vec2(meshHeight(p.xy+vec2(e.x,0.),eye.xy)-meshHeight(p.xy-vec2(e.x,0.),eye.xy),meshHeight(p.xy+vec2(0.,e.y),eye.xy)-meshHeight(p.xy-vec2(0.,e.y),eye.xy))/(2.*e);
  N=normalize(vec3(-slope,1.));
 }else{
  float id=a_position.z;
  float a=id*2.39996323;
  float radius=.30+1.8*fract(id*.61803399);
  // Fixed-rate whole cycles: no velocity parameter can jump a position.
  float z=.12+.72*(.5+.5*sin(u_time*.085+id*1.71));
  vec2 drift=.045*vec2(sin(u_time*.11+id),cos(u_time*.09+id*1.7));
  p=vec3(focus()+vec2(cos(a),sin(a))*radius+drift,z);
  float size=.0025+.003*fract(id*.75487766);
  p+=(R*a_position.x+U*a_position.y)*size;
  v_spore=a_position.xy;
 }
 v_position=p;v_normal=N;
 vec3 q=p-eye;float depth=dot(q,F);
 float aspect=u_resolution.x/u_resolution.y;
 vec2 fit=vec2(max(1.,aspect),max(1.,1./aspect));
 float lens=1.45*(1.+.015*clamp(u_kick,0.,1.));
 gl_Position=vec4(vec2(dot(q,R),dot(q,U))*lens*2./fit,depth*1.00803213-.04016064,depth);
}`,
    fragment: `#version 300 es
precision highp float;
${uniforms}
in vec3 v_position,v_normal;
in vec2 v_spore;
flat in float v_kind;
out vec4 outColor;
${shared}
void main(){
 vec3 eye,R,U,F;landscapeCamera(eye,R,U,F);
 vec3 rd=normalize(v_position-eye),V=-rd;
 float distanceToEye=length(v_position-eye);
 if(v_kind>.5){
  float r2=dot(v_spore,v_spore);float disk=exp(-r2*5.)*(1.-smoothstep(.6,1.,r2));
  float blink=.65+.35*sin(u_time*.33+v_kind);
  outColor=vec4(mix(u_primary,u_accent,.15)*disk*blink*1.8*exp(-distanceToEye*.45),0.);return;
 }
 vec2 uv=v_position.xy/worldSize();float v=field(uv);
 // Resolution-normalized differential concentration avoids four extra
 // fragment texture taps; all derivatives precede the carrier discard.
 vec2 grad=3.*vec2(dFdx(v),dFdy(v))/max(length(fwidth(uv))*320.,.0001);
 float vWidth=fwidth(v),gillWidth=fwidth(v*105.);
 vec2 local=v_position.xy-focus();
#if GARDEN
 float r=length(local);vec2 n=local/max(r,1e-5);
 float c3=n.x*(n.x*n.x-3.*n.y*n.y);
 float rn=r/(.46+.09*(2.*c3*c3-1.));
 float rnWidth=fwidth(rn);
 // Keep every derivative defined before discarding the covered carrier.
 if(v_kind>-.5&&crown(local)>0.)discard;
#endif
 vec3 N=normalize(v_normal);if(!gl_FrontFacing)N=-N;
 vec3 key=normalize(vec3(-.5,.35,.7));
 float diffuse=max(0.,dot(N,key)),fill=max(0.,dot(N,normalize(vec3(.7,-.3,.25))));
 float rim=pow(1.-abs(dot(N,V)),3.);
 float spec=pow(max(0.,dot(N,normalize(key+V))),48.);
 float b=smoothBody(v),height=v_position.z/max(scale(),.001);
 float region=.5+.5*sin(local.x*2.1+sin(local.y*2.9));
 vec3 ink=mix(u_secondary,u_primary,.22+.50*region);
 float cavity=.50+.50*smoothstep(.05,.8,height);
 vec3 color=ink*(.035+mix(.62,.34,city())*diffuse+.14*fill)*cavity;
 color+=mix(u_primary,vec3(1.),.28)*spec*.85;
 color+=mix(u_secondary,u_primary,.45)*rim*.42;
 float edge=abs(v-.16)/max(vWidth,.0001);
 float thread=1.-smoothstep(.65,1.5,edge),halo=exp(-edge/6.);
 float gillPhase=v*105.;
 float gill=1.-smoothstep(.18,.18+max(gillWidth,.10),abs(sin(gillPhase)));
 color*=1.-.13*gill*b;
#if GARDEN
 float glow=clamp(u_params[4],.35,1.65);
 float cup=crown(local)*city();
 float radial=clamp(length(local)/.55,0.,1.);
 vec3 tissue=mix(ink,mix(u_secondary,u_primary,.25+.5*radial),cup);
 color=mix(u_secondary*.012,tissue*(.07+.62*diffuse+.25*rim),max(b,cup*.9));
 float neon=smoothstep(.20,.29,v)*exp(-dot(grad,grad)/.0036);
 color+=mix(u_primary,vec3(1.),.16)*(thread*(1.-city()*.75)*1.05+halo*.10)*glow;
 color+=u_primary*neon*city()*mix(1.2,.35,cup)*glow;
 color+=mix(u_secondary,vec3(1.),.22)*spec*.75+u_primary*rim*cup*.7;
 // The luminous lip follows the calyx silhouette, with chemical veins on it.
 float lip=1.-smoothstep(.012,.012+max(rnWidth*1.5,.005),abs(rn-.80));
 color+=mix(u_primary,vec3(1.),.12)*lip*city()*2.2*glow;
 float centre=exp(-dot(local,local)*180.);
 color+=mix(u_accent,vec3(1.),.12)*centre*city()*2.*glow;
#else
 color=mix(u_secondary*.012,color,b);
 color+=mix(ink,vec3(1.),.12)*(thread*(1.0-.65*tide()+city()*1.0)+halo*.12);
 float storeys=height*5.;
 float line=abs(fract(storeys)-.5)/max(fwidth(storeys),.001);
 vec2 block=floor(fract(uv)*vec2(textureSize(u_state,0))*.45)+floor(storeys)*17.;
 float h=fract(sin(dot(block,vec2(127.1,311.7)))*43758.5453);
 float bay=fract(uv.x*float(textureSize(u_state,0).x)*.45);
 float windows=(1.-smoothstep(.6,1.5,line))*smoothstep(.15,.3,bay)*(1.-smoothstep(.7,.85,bay))*step(.90-.03*u_level,h)*smoothstep(.18,.55,1.-N.z);
 color+=mix(u_accent,vec3(1.),.18)*windows*city()*2.4;
 // Transmitting membrane tops are luminous, not grey concrete roofs.
 color+=u_primary*b*city()*(.12+.70*rim)+mix(u_secondary,u_primary,.5)*b*tide()*.08;
 color+=u_primary*b*city()*pow(max(0.,dot(-N,key)),2.)*.25;
#endif
 color+=mix(ink,u_accent,.25)*thread*u_rhythm.x*.5;
 float band=exp(-pow((v-(.08+.05*mod(u_rhythmCount.y,5.)))/.022,2.));
 color+=ink*band*b*u_rhythm.y*.3;
 float fog=1.-exp(-pow(distanceToEye/${garden ? "2.6" : "2.4"},1.6));
 color=mix(color,fogColor(rd),fog);
 outColor=vec4(max(color,vec3(0.)),1.);
}`,
  };
}
export const landscapeBackdrop = (
  garden = false,
) => `${common(garden).replace("const float PI=3.14159265359,TAU=6.28318530718;", "")}
void main(){
 float aspect=u_resolution.x/u_resolution.y;
 vec2 fit=vec2(max(1.,aspect),max(1.,1./aspect));
 vec2 p=(v_uv-.5)*fit/(1.45*(1.+.015*clamp(u_kick,0.,1.)));
 vec3 eye,R,U,F;landscapeCamera(eye,R,U,F);
 vec3 rd=normalize(F+p.x*R+p.y*U);
 outColor=vec4(fogColor(rd),1.);
}`;
