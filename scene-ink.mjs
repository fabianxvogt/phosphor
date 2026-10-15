import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// Kelvin's thin-core ring speed sets the integrated material clock.
export function kelvinVelocity(gamma, radius, core) {
  if (!(radius > 0 && core > 0 && core < radius))
    throw new RangeError("A thin ring needs 0 < core < radius");
  return (
    (gamma / (4 * Math.PI * radius)) * (Math.log((8 * radius) / core) - 0.25)
  );
}
export const INK_RING = Object.freeze({
  gamma: 0.75,
  radius: 0.82,
  core: 0.12,
});
export const INK_SPEED = kelvinVelocity(
  INK_RING.gamma,
  INK_RING.radius,
  INK_RING.core,
);
export function inkIdentity(seed) {
  const materialPhase = ((seed >>> 0) % 991) * 0.013;
  return [0, -1, 1].map((side, id) => ({
    id,
    side,
    materialPhase,
    centre: side ? [side * 1.3, 0.65 + side * 0.25, side * 0.6] : [0, -0.25, 0],
  }));
}
// A regular axisymmetric streamfunction: vr=-psi_y/r, vy=psi_r/r-U.
export function inkVelocity(
  [x, y, z],
  gamma = INK_RING.gamma,
  radius = INK_RING.radius,
  core = 0.32,
) {
  const r = Math.hypot(x, z),
    h = r - radius,
    aa = core * core;
  const k = gamma / (2 * Math.PI),
    e = Math.exp(-(h * h + y * y) / aa);
  const vr = ((2 * k * r * y) / aa) * e;
  const vy =
    k * (2 - (2 * r * h) / aa) * e - kelvinVelocity(gamma, radius, core);
  return [r > 0 ? (vr * x) / r : 0, vy, r > 0 ? (vr * z) / r : 0];
}
const schema = [
  {
    key: "development",
    label: "Development · drop / plumes / nebula",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  { key: "flow", label: "Ink flow", min: 0, max: 2, step: 0.01, default: 0.8 },
  {
    key: "curl",
    label: "Vortex curl",
    min: 0.3,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "fingers",
    label: "Branching fingers",
    min: 0.3,
    max: 1.5,
    step: 0.01,
    default: 0.9,
  },
  {
    key: "opacity",
    label: "Pigment depth",
    min: 0.4,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "spread",
    label: "Plume spread",
    min: 0.6,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "orbit",
    label: "Tank orbit",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "distance",
    label: "Tank distance",
    min: 0.8,
    max: 1.4,
    step: 0.01,
    default: 1,
  },
];
const base = {
  flow: 0.8,
  curl: 1,
  fingers: 0.9,
  opacity: 1,
  spread: 1,
  orbit: 0.45,
  distance: 1,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Drop", 11201, 0),
  look("Plumes", 11201, 1),
  look("Nebula", 11201, 2),
  look("Quiet Infusion", 11202, 0.25, {
    flow: 0.35,
    curl: 0.65,
    opacity: 0.7,
    distance: 0.85,
  }),
  look("Twin Currents", 11203, 0.85, { spread: 1.25, curl: 1.3, orbit: 0.75 }),
  look("Silken Tributaries", 11204, 1.35, {
    fingers: 1.4,
    opacity: 0.65,
    flow: 0.5,
  }),
  look("Velvet Chamber", 11205, 2, {
    opacity: 1.4,
    spread: 0.8,
    curl: 1.25,
    distance: 0.95,
  }),
  look("Marbled Lantern", 11206, 1.85, {
    spread: 1.25,
    fingers: 1.2,
    opacity: 0.8,
    orbit: 0.8,
  }),
];

const material = `${lateClockGlsl}
float gPhase, gGrow, gCloud, gSeed, gCurl, gFinger;
float inkNoise(vec3 p) {
  return dot(sin(p + sin(p.yzx)), vec3(0.36,0.32,0.32));
}
vec3 inkNoiseGradient(vec3 p) {
  vec3 c=cos(p+sin(p.yzx))*vec3(0.36,0.32,0.32);
  return c+c.zxy*cos(p);
}
// Wound toroidal sheets. The ring's axis leans toward the viewer; its
// entrained wake is ABOVE and behind it, never a hanging jellyfish skirt.
vec2 inkCarrier(vec3 q, float scale, float phase) {
  q /= scale;
  float r0=length(q.xz), h0=r0-0.82, aa=0.32*0.32;
  float e0=exp(-(h0*h0+sq(q.y+0.25))/aa);
  float vr=0.75/PI*r0*(q.y+0.25)/aa*e0;
  float vy=0.75/(2.0*PI)*(2.0-2.0*r0*h0/aa)*e0;
  q-=0.12*gCurl*sin(gPhase)*vec3(q.x/max(r0,0.001)*vr,vy,q.z/max(r0,0.001)*vr);
  float a=atan(q.z,q.x+1e-7);
  float n=inkNoise(q*4.1+vec3(gSeed,phase,-phase));
  float f=inkNoise(q*11.0+n*2.0+vec3(phase,-phase,gSeed));
  float y0=-0.25-0.13*sin(phase)+0.04*sin(a*3.0+phase)+0.08*sin(a);
  float R=0.82+0.035*sin(a*5.0+phase)+0.025*sin(a*9.0-phase);
  vec2 tor=vec2(length(q.xz)-R,q.y-y0);
  tor+=vec2(n,f)*0.035*gCurl;
  float rho=length(tor), roll=atan(tor.y,tor.x+1e-7);
  float turn=rho*25.0-roll*2.0-2.0*phase+n*1.6;
  float sheet=pow(0.5+0.5*cos(turn),6.0);
  float ring=(0.85*exp(-rho*rho/0.006)+sheet*0.68)*exp(-rho*rho/0.08);
  // The wake rolls UP and OUT around the travelling ring. A quadratic
  // flare and reversing terminal curl replace the old dangling legs.
  float behind=q.y-y0;
  float lobes=0.5+0.5*sin(a*7.0+1.4*sin(a*3.0)+phase);
  float reach=(0.7+0.8*lobes)*gFinger;
  float tip=clamp((behind-reach+0.48)/0.48,0.0,1.0);
  float wakeR=R+0.22*behind+0.22*sin(behind*3.5+a*3.0-phase);
  wakeR+=0.19*sin(tip*PI*1.7)*tip+0.045*sin(a*13.0+behind*6.0);
  float w=mix(0.04,0.008,tip);
  float d=length(q.xz)-wakeR;
  float skirt=exp(-sq((d+0.025*n)/w));
  skirt+=0.3*exp(-sq((d-0.1*sin(a*15.0+behind*4.0))/0.018));
  skirt*=smoothstep(-0.02,0.2,behind)*(1.0-smoothstep(reach-0.3,reach,behind));
  skirt*=0.08+0.92*sq(lobes);
  skirt*=0.65+0.35*sin(a*5.0+behind*5.0+phase);
  // The feed is a twisted pair of wisps, never an opaque jellyfish dome.
  float above=q.y-y0;
  vec2 feed=q.xz-vec2(0.09*sin(above*4.0+phase),0.07*cos(above*5.0-phase));
  float stem=exp(-dot(feed,feed)/0.0018)*smoothstep(0.1,0.45,above)*(1.0-smoothstep(1.4,1.8,above));
  float density=ring+skirt*0.6+stem*0.42;
  float illumination=clamp(0.55+0.3*f+0.15*n,0.05,1.0);
  return vec2(density,density*illumination);
}
vec3 inkField(vec3 p) {
  vec3 q=p;
  q.yz=rot2(-0.64-0.08*sin(gPhase))*q.yz;
  q.xz=rot2(0.12*sin(gPhase)+0.08*q.y*gCurl)*q.xz;
  vec2 medium=inkCarrier(q,1.0+0.4*gCloud,gPhase);
  if (gGrow>0.0001) for (int i=0;i<2;++i) {
    float side=i==0?-1.0:1.0;
    vec3 v=q-vec3(side*1.3*u_params[5],0.65+side*0.25,side*0.6);
    v.xy=rot2(side*0.36*gGrow)*v.xy;
    medium+=inkCarrier(v,max(0.001,(0.72+0.38*gCloud)*gGrow),gPhase+side*1.2)*gGrow;
  }
  // The original carriers entrain into the new billows, rather than staying
  // visible as three blurred tyres behind the final cloud field.
  medium*=1.0-0.92*gCloud;
  float cloudEdge=-2.0;
  // The same pigment opens into full-tank marbling; no round cloud SDF.
  if (gCloud>0.0001) {
    vec3 warp=q+0.3*vec3(inkNoise(q*2.1+gPhase),inkNoise(q.yzx*2.5-gPhase),inkNoise(q.zxy*2.0+gSeed));
    float broad=inkNoise(warp*2.2+vec3(gSeed,gPhase,-gPhase));
    float fine=inkNoise(warp*7.5+broad*3.0);
    float folds=pow(0.5+0.5*sin(broad*7.0+fine*0.65-q.y*1.5),3.0);
    vec3 boundaryPoint=p/vec3(3.0,2.5,1.8);
    float boundary=dot(boundaryPoint,boundaryPoint);
    // Die into rounded water-space BEFORE the conservative atlas box. This
    // prevents flat tank-wall caps when the camera is in portrait.
    cloudEdge=broad+fine*0.27-(1.0-gCloud)*2.0-0.16-0.8*boundary*boundary*boundary;
    float cloud=smoothstep(-0.06,0.09,cloudEdge)*(0.015+folds*0.85);
    cloud*=exp(-dot(q/vec3(3.2,2.7,2.0),q/vec3(3.2,2.7,2.0))*0.65);
    medium+=vec2(cloud,cloud*(0.3+0.7*folds));
  }
  float edge=smoothstep(0.0,0.24,min(min(3.2-abs(p.x),2.7-abs(p.y)),2.0-abs(p.z)));
  return vec3(medium*edge,mix(-2.0,cloudEdge,edge));
}
void inkSetup() {
  float dev=clamp(u_params[0],0.0,2.0);
  gGrow=smoothstep(0.0,1.0,dev);
  gCloud=smoothstep(1.0,2.0,dev);
#ifdef PHOSPHOR_LATE
  gPhase=u_clock[0];
#else
  gPhase=u_time*u_params[1]*${INK_SPEED.toFixed(10)};
#endif
  gPhase=mod(gPhase,TAU);
  gSeed=float(u_seedBits % 991u)*0.013;
  gCurl=u_params[2]*(1.0+0.08*u_rhythm.x);
  gFinger=u_params[3]*(0.7+0.35*u_level)*(1.0+0.12*u_rhythm.y);
}
`;
const lattice = `
vec3 inkExtent() { return vec3(1.48+1.18*gGrow+0.54*gCloud,2.08+0.18*gGrow+0.44*gCloud,1.42+0.15*gGrow+0.43*gCloud); }
const vec3 INK_GRID=vec3(80,96,40);
const vec2 INK_ATLAS=vec2(656,490);
vec2 inkAddress(vec2 xy, float z) {
  return (vec2(mod(z,8.0),floor(z/8.0))*vec2(82,98)+xy+1.5)/INK_ATLAS;
}
`;
const fragment = `${material}\n${lattice}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec4 inkSample(vec3 p) {
#ifdef PRECOMPUTED
  vec3 cell=clamp((p/inkExtent()*0.5+0.5)*(INK_GRID-1.0),vec3(0),INK_GRID-1.001);
  float z=floor(cell.z);
  vec4 a=texture(u_precomputed,inkAddress(cell.xy,z));
  vec4 b=texture(u_precomputed,inkAddress(cell.xy,z+1.0));
  return mix(a,b,fract(cell.z));
#else
  vec3 m=inkField(p);
  return vec4(m.x,inkField(p+vec3(-0.065,0.085,-0.07)).x,m.y,m.z);
#endif
}
// Sector-local torus tracing resolves the focus silhouette independently
// of the FAR-volume cache. Freeze the small corrugation at the ray's sector
// rather than recomputing trigonometry at every conservative distance step.
vec3 inkRingSkin(vec3 ro, vec3 ray, float scale, float phase, vec3 bg) {
  ro/=scale;
  float b=dot(ro-vec3(0,-0.25,0),ray);
  float c=dot(ro-vec3(0,-0.25,0),ro-vec3(0,-0.25,0))-1.06*1.06;
  float disc=b*b-c;
  if (disc<0.0) return bg;
  float t=max(0.0,-b-sqrt(disc));
  float limit=-b+sqrt(disc), d=1.0;
  vec3 sector=ro+ray*max(0.0,-b);
  float corrugation=0.022*sin(sector.x*19.0+phase)*sin(sector.z*17.0-phase);
  vec3 p=ro;
  for (int i=0;i<26;++i) {
    p=ro+ray*t;
    d=length(vec2(length(p.xz)-0.82,p.y+0.25))-0.19+corrugation;
    if (d<0.001 || t>limit) break;
    t+=max(d*0.9,0.0008);
  }
  float aa=max(t*0.8/min(u_resolution.x,u_resolution.y),0.0008);
  float hit=(1.0-smoothstep(aa,aa*2.5,d))*step(t,limit);
  float a=atan(p.z,p.x+1e-7), roll=atan(p.y+0.25,length(p.xz)-0.82+1e-7);
  float n=inkNoise(p*19.0+vec3(gSeed,sin(phase),cos(phase)));
  float phi=roll*11.0+a*3.0+n*1.7-phase*2.0;
  float footprint=max(t*45.0/min(u_resolution.x,u_resolution.y),0.035);
  float fine=(1.0-smoothstep(0.14,0.14+footprint,abs(sin(phi))))*0.14/(0.14+footprint*0.5);
  float folds=pow(0.5+0.5*sin(roll*3.0+a*2.0+n*0.7-phase*2.0),4.0);
  // Keep the Drop's rolled lamellae, but don't stamp those parallel
  // contour lines over the growing Plumes' dense bodies. Wake hairlines
  // remain independent geometry/sections, not an interior texture.
  float alpha=hit*(0.22+0.65*folds+fine*0.8*(1.0-gGrow))*(1.0-gCloud)*u_params[4];
  vec3 tint=mix(u_primary,u_secondary,0.5+0.5*sin(a+roll));
  vec3 transmitted=bg*(0.2+tint*0.2)+tint*0.025;
  return mix(bg,transmitted,clamp(alpha,0.0,0.95));
}
// Native-resolution material sections resolve thin, curling wake sheets.
vec3 inkFocus(vec3 eye, vec3 rd, vec3 background) {
  vec3 ro=eye, ray=rd;
  float tilt=-0.64-0.08*sin(gPhase);
  ro.yz=rot2(tilt)*ro.yz; ray.yz=rot2(tilt)*ray.yz;
  vec3 result=background;
  if (gGrow>0.001 && gCloud<0.999) for (int i=0;i<2;++i) {
    float side=i==0?-1.0:1.0;
    vec3 origin=ro-vec3(side*1.3*u_params[5],0.65+side*0.25,side*0.6), direction=ray;
    origin.xy=rot2(side*0.36*gGrow)*origin.xy;
    direction.xy=rot2(side*0.36*gGrow)*direction.xy;
    result=inkRingSkin(origin,direction,max(0.001,(0.72+0.38*gCloud)*gGrow),gPhase+side*1.2,result);
  }
  if (gCloud<0.999) result=inkRingSkin(ro,ray,1.0+0.4*gCloud,gPhase,result);
  // Focus-plane wake sections curl back into their terminal eddies. Signed
  // sheet coordinates are filtered before extinction, preserving hairlines.
  float wakeT=(0.24-ro.z)/(sign(ray.z+1e-8)*max(abs(ray.z),0.001));
  vec2 wake=(ro+ray*wakeT).xy;
  if (gCloud<0.999) for (int i=0;i<2;++i) {
    float side=i==0?-1.0:1.0;
    vec2 c=vec2(side*1.1,0.72), v=wake-c;
    float roll=2.3*exp(-dot(v,v)/0.3)*gCurl;
    vec2 q=c+rot2(side*roll)*v;
    float h=q.y+0.25, reach=(1.15+0.15*sin(gPhase+side))*gFinger;
    float centre=0.82+0.21*h+0.16*sin(h*4.0+gPhase+side);
    float d=side*q.x-centre;
    // Derivatives stay outside the conservative support rejection. The
    // analytic phase gradient below filters native hairlines without paying
    // for high-frequency noise over the entire empty tank.
    vec2 dx=dFdx(q), dy=dFdy(q);
    if (abs(d)>0.19 || h<0.0 || h>reach) continue;
    vec3 point=vec3(q*17.0,sin(gPhase));
    float n=inkNoise(point);
    vec2 dn=inkNoiseGradient(point).xy*17.0;
    float ph=d*95.0+1.6*sin(h*13.0+side+gPhase)+n*1.1;
    vec2 gradient=vec2(side*95.0,-95.0*(0.21+0.64*cos(h*4.0+gPhase+side))+20.8*cos(h*13.0+side+gPhase))+dn*1.1;
    float aa=max(abs(dot(gradient,dx))+abs(dot(gradient,dy)),0.02), width=0.16;
    float line=(1.0-smoothstep(width,width+aa,abs(sin(ph))))*width/(width+aa*0.5);
    float taper=1.0-smoothstep(reach-0.5,reach,h);
    float mask=(1.0-smoothstep(0.07*taper,0.18*taper+0.001,abs(d)))*smoothstep(0.02,0.2,h)*taper;
    float alpha=mask*(0.04+line*0.75)*(0.4+0.6*smoothstep(-0.4,0.4,n))*(1.0-gCloud);
    result*=mix(vec3(1),mix(vec3(0.025),u_primary*0.22,0.4),alpha);
  }
  return result;
}
void main() {
  inkSetup();
#ifdef PHOSPHOR_LATE
  float orbit=u_clock[1];
#else
  float orbit=u_time*u_params[6]*0.035;
#endif
  orbit=mod(orbit,TAU);
  vec2 uv=(v_uv-0.5)*u_resolution/min(u_resolution.x,u_resolution.y)*2.0;
  float az=0.13+0.15*sin(orbit);
  vec3 eye=vec3(5.2*sin(az),1.2+0.18*sin(orbit*2.0),5.2*cos(az))*u_params[7];
  vec3 fw=normalize(vec3(0,-0.15,0)-eye), right=normalize(cross(fw,vec3(0,1,0))), up=cross(right,fw);
  float aspectFit=0.82+0.18*smoothstep(1.0,1.5,u_resolution.x/u_resolution.y);
  float focal=(2.4+0.048*u_kick)*aspectFit;
  vec3 rd=normalize(fw*focal+right*uv.x+up*uv.y);
  // A diffused lamp behind a tank. No periodic screen-space shaft pattern.
  float lamp=exp(-dot((uv-vec2(0.25,0.3))*vec2(0.62,0.76),(uv-vec2(0.25,0.3))*vec2(0.62,0.76)));
  vec3 lampColor=mix(u_primary,vec3(1),0.65);
  float sideLamp=exp(-dot((uv-vec2(-1.0,0.15))*vec2(0.65,0.9),(uv-vec2(-1.0,0.15))*vec2(0.65,0.9)));
  vec3 bg=lampColor*(0.018+1.1*lamp*lamp)+u_secondary*sideLamp*0.36;
  vec3 inv=sign(rd+vec3(1e-8))/max(abs(rd),vec3(1e-6));
  vec3 bound=inkExtent();
  vec3 lo=(-bound-eye)*inv, hi=(bound-eye)*inv;
  vec3 nearV=min(lo,hi), farV=max(lo,hi);
  float start=max(0.0,max(max(nearV.x,nearV.y),nearV.z));
  float end=min(min(farV.x,farV.y),farV.z);
  vec3 col=vec3(0);
  float trans=1.0, optical=0.0;
  vec3 pigment=mix(u_secondary,u_primary,0.06);
  vec3 absorption=vec3(1.5)-pigment*1.13;
  bool cloudHit=false;
  vec3 hitP=eye+rd*5.0;
  float maximumField=-2.0;
  if (end>start) {
    float stepSize=(end-start)/16.0;
    float previous=-2.0, previousT=start;
    for (int i=0;i<16;++i) {
      float t=start+(float(i)+0.5)*stepSize;
      vec3 p=eye+rd*t;
      vec4 medium=inkSample(p);
      // Refine the FIRST actual 3D billow crossing, not a planar cutout or
      // a blurred density threshold. Only far layers use coarse quadrature.
      if (!cloudHit && gCloud>0.0001 && medium.w>0.0 && previous<0.0) {
        float loT=previousT, hiT=t, loField=previous, hiField=medium.w;
        for (int j=0;j<7;++j) {
          float midT=(loT+hiT)*0.5, field=inkSample(eye+rd*midT).w;
          if (field>0.0) { hiT=midT; hiField=field; }
          else { loT=midT; loField=field; }
        }
        // Linear root within the final tiny bracket avoids quantizing native
        // filament coordinates to a bisection midpoint (visible at 4K).
        float root=mix(loT,hiT,clamp(-loField/max(hiField-loField,1e-8),0.0,1.0));
        hitP=eye+rd*root;
        cloudHit=true;
      }
      maximumField=max(maximumField,medium.w);
      previous=medium.w; previousT=t;
      float farLayer=1.0-smoothstep(-0.65,0.45,p.z);
      vec3 inside=bound-abs(p);
      float density=medium.x*mix(0.25+0.75*farLayer,1.0,gCloud)*
        smoothstep(0.0,0.35,min(min(inside.x,inside.y),inside.z));
      // Illumination is a normalized physical moment, not divided by the
      // focus attenuation (which would brighten the far haze artificially).
      float shade=medium.z/max(medium.x,0.0001);
      float depth=density*u_params[4]*stepSize*8.0;
      float alpha=1.0-exp(-depth);
      // Shadow density is sampled in the analytic field BEFORE caching;
      // interpolation is continuous, unlike differentiating a trilinear grid.
      float rim=clamp((density-medium.y)*8.0,0.0,1.0);
      float back=1.0/(1.0+medium.y*5.0);
      vec3 diluted=mix(u_primary,u_secondary,clamp(shade,0.0,1.0));
      vec3 light=diluted*(0.015+0.05*shade)*back+lampColor*rim*back*0.12;
      float band=max(0.0,1.0-abs(p.y-(1.8-3.5*u_rhythm.z))/0.2);
      float wave=band*band*(3.0-2.0*band)*u_rhythm.z;
      light+=u_accent*wave*rim*0.45;
      col+=trans*alpha*light;
      trans*=1.0-alpha;
      optical+=depth;
      if (trans<0.002) break;
    }
  }
  // Broad, irregular fans from one off-axis lamp, not parallel stripes.
  float rayAngle=atan(uv.x-0.8,2.0-uv.y);
  float shafts=sq(0.5+0.5*sin(rayAngle*9.0+0.6*sin(rayAngle*17.0+orbit)));
  bg+=lampColor*shafts*gCloud*0.28*exp(-sq(uv.y-0.6)*0.4);
  col+=exp(-optical*absorption)*bg;
  // The native crossing supplies the crisp silhouette; pigment INSIDE it
  // must be smooth. A nested noise*97 -> abs(sin) isoline texture used to
  // engrave the whole body (even where its fringes were pixel-resolved).
  // Remove that term, not the silhouette, and retain its mean optical depth.
  if (gCloud>0.0001) {
    float folded=pow(0.5+0.5*inkNoise(hitP*3.0),4.0);
    float coverage=smoothstep(0.0,length(hitP-eye)*8.0/min(u_resolution.x,u_resolution.y),maximumField);
    // Fade the skin before the cache box: clamped edge texels form flat cards.
    vec3 inside=bound-abs(hitP);
    float boxFade=smoothstep(0.0,0.35,min(min(inside.x,inside.y),inside.z));
    float surfaceDepth=(0.6076+folded*2.4)*gCloud*u_params[4]*coverage*boxFade;
    float alpha=(1.0-exp(-surfaceDepth))*(cloudHit?1.0:0.0);
    vec3 tint=mix(u_primary,u_secondary,0.5+0.45*sin(hitP.y*1.8+gPhase));
    col=col*exp(-surfaceDepth*absorption*(cloudHit?1.0:0.0))+tint*0.012*alpha;
  }
  col=inkFocus(eye,rd,col);
  col*=1.0-0.22*smoothstep(0.7,2.0,length(uv));
  outColor=vec4(max(col,vec3(0)),1);
}
`;

export default {
  id: "ink",
  number: 112,
  name: "Ink Bloom",
  description:
    "A falling drop rolls into a descending vortex ring, branches into colliding plumes and fills a backlit tank with marbled ink clouds.",
  development: "development",
  schema,
  presets,
  fragment,
  precompute: {
    size: [656, 490],
    filter: "linear",
    format: "rgba16f",
    fragment: `${material}\n${lattice}
void main() {
  inkSetup();
  ivec2 pixel=ivec2(gl_FragCoord.xy);
  int z=(pixel.y/98)*8+pixel.x/82;
  // A duplicate-node gutter isolates each Z slice under bilinear filtering.
  vec3 cell=vec3(clamp(pixel.x%82-1,0,79),clamp(pixel.y%98-1,0,95),z);
  vec3 p=(cell/(INK_GRID-1.0)*2.0-1.0)*inkExtent();
  vec3 m=inkField(p);
  float shadow=m.x>0.0001?inkField(p+vec3(-0.065,0.085,-0.07)).x:0.0;
  outColor=vec4(m.x,shadow,m.y,m.z);
}`,
  },
  type: { key: "development", values: [0, 1, 2] },
  stage: ["curl", "fingers", "opacity"],
  energy: { flow: { mul: [0.65, 1.3] }, orbit: { mul: [0.8, 1.25] } },
  beat: { punch: 0.08, pulse: 0.08 },
  clocks: [
    { rate: (p) => p[1] * INK_SPEED, period: 2 * Math.PI },
    { rate: (p) => p[6] * 0.035, period: 2 * Math.PI },
  ],
  rhythm: [
    familyEffect(
      "ring-roll",
      0,
      "Ring roll",
      "The existing vortex rim curls a little tighter.",
      { period: 4, strength: 0.55, duration: 1.5, kind: "motion" },
    ),
    familyEffect(
      "finger-reach",
      1,
      "Finger reach",
      "The same ink fingers stretch into the water.",
      { period: 8, strength: 0.6, duration: 2.5, kind: "motion" },
    ),
    familyEffect(
      "pigment-wave",
      2,
      "Pigment wave",
      "A narrow backlit pigment band travels down the existing plumes.",
      { period: 16, strength: 0.6, duration: 3 },
    ),
  ],
};
