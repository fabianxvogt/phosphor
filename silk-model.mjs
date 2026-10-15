// Silk Storm: seeded material coordinates never depend on development.
export const STRIPS = 28;
export const ALONG = 160;
export const ACROSS = 6;
export const LENGTH = 12;
export const STROUHAL = 0.2;
export const ATTRIBUTES = [2, 1, 3];
export const STRIDE = 6;
export const TAU = Math.PI * 2;
export const frequency = (wind, length = LENGTH) => (STROUHAL * wind) / length;
export const smooth = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
export function identity(seed, id) {
  let n = (seed ^ Math.imul(id + 1, 0x9e3779b9)) >>> 0;
  const rand = () => {
    n ^= n << 13;
    n ^= n >>> 17;
    n ^= n << 5;
    return (n >>> 0) / 4294967296;
  };
  return [rand(), rand(), rand()];
}
// Integrated tangent (cos(a sin q), sin(a sin q)), Bessel series through J4.
// For a <= .72 the omitted terms bound the longitudinal strain below .02%.
export function flutter(s, phase, a = 0.5) {
  const k = (TAU * 1.5) / LENGTH,
    a2 = a * a;
  const j0 = 1 - a2 / 4 + (a2 * a2) / 64 - a2 ** 3 / 2304;
  const j1 = a / 2 - (a * a2) / 16 + (a * a2 * a2) / 384;
  const j2 = a2 / 8 - (a2 * a2) / 96 + a2 ** 3 / 3072;
  const j3 = (a * a2) / 48 - (a * a2 * a2) / 768;
  const j4 = (a2 * a2) / 384 - a2 ** 3 / 7680;
  const q = k * s - phase;
  return [
    j0 * s +
      (j2 / k) * (Math.sin(2 * q) + Math.sin(2 * phase)) +
      (j4 / (2 * k)) * (Math.sin(4 * q) + Math.sin(4 * phase)),
    ((-2 * j1) / k) * (Math.cos(q) - Math.cos(phase)) -
      ((2 * j3) / (3 * k)) * (Math.cos(3 * q) - Math.cos(3 * phase)),
  ];
}
// Unit-speed conical helix: r'=b, r theta'=c, y'=sqrt(1-b²-c²).
export function helix(s, angle = 0) {
  const b = 0.235,
    c = 0.72,
    r0 = 0.45,
    r = r0 + b * s;
  const theta = angle + (c / b) * Math.log(r / r0);
  return [
    r * Math.cos(theta),
    Math.sqrt(1 - b * b - c * c) * (s - LENGTH / 2),
    r * Math.sin(theta),
  ];
}
export function point(u, v, id, rnd, state = {}) {
  const {
    development = 0,
    phase = 0,
    turn = 0,
    amplitude = 1,
    spread = 1,
    width = 1,
  } = state;
  const b = smooth(development),
    t = smooth((development - 1) / 0.72);
  const g = (id + v) / STRIPS;
  const phi = phase + g * 0.28 + b * rnd[0] * TAU;
  const a = 0.48 * amplitude;
  const fl = flutter(u * LENGTH, phi, a);
  const q = TAU * 1.5 * u - phi,
    angleW = a * Math.sin(q);
  const wrinkle =
    0.035 * Math.sin(3 * q + g * 14) + 0.016 * Math.sin(7 * q - g * 22);
  const x = fl[0] - Math.sin(angleW) * wrinkle,
    z = fl[1] + Math.cos(angleW) * wrinkle;
  const s0 = [x - LENGTH * 0.47, (g - 0.5) * 8.4, z + 0.28 * Math.cos(g * TAU)];
  const yy = (v - 0.5) * (0.38 + 0.48 * rnd[1]) * width;
  const torsion = 0.62 * Math.sin(2 * q + rnd[2] * TAU);
  const wy = yy * Math.cos(torsion),
    wz = yy * Math.sin(torsion);
  const tilt = (rnd[2] - 0.5) * 1.4,
    xx = x - LENGTH * 0.47;
  const s1 = [
    xx * Math.cos(tilt) - wy * Math.sin(tilt) + (rnd[2] - 0.5) * 2,
    (rnd[0] - 0.5) * 6.8 * spread + xx * Math.sin(tilt) + wy * Math.cos(tilt),
    (rnd[1] - 0.5) * 5.2 * spread + z + wz,
  ];
  const angle = id * 2.3999632297 + turn;
  const h = helix(u * LENGTH, angle);
  const r = 0.45 + 0.235 * u * LENGTH;
  const theta = angle + (0.72 / 0.235) * Math.log(r / 0.45);
  const taper = Math.sqrt(r / 3.27);
  const dr = (z * 0.55 + wz) * taper,
    hy = Math.sqrt(1 - 0.235 ** 2 - 0.72 ** 2),
    w = wy * taper;
  const loose = id % 7 === 0 ? 1 + 3.0 * smooth(u) : 1;
  const s2 = [
    h[0] * loose + dr * Math.cos(theta) - w * hy * Math.sin(theta),
    h[1] - w * 0.72,
    h[2] * loose + dr * Math.sin(theta) + w * hy * Math.cos(theta),
  ];
  return s0.map((q, k) => (q + b * (s1[k] - q)) * (1 - t) + s2[k] * t);
}
export function camera(development, phase = 0) {
  const t = smooth(development - 1),
    approach = smooth(t / 0.72),
    rise = smooth((t - 0.72) / 0.28);
  const outside = [
    2.1 * Math.sin(phase),
    1.1 + 0.28 * Math.sin(2 * phase),
    12.8 + 0.4 * Math.cos(phase),
  ];
  const inside = [0.06 * Math.cos(phase), -5.7, 0.06 * Math.sin(phase)];
  const eye = outside.map((q, k) => q + approach * (inside[k] - q));
  eye[1] += 2.6 * rise;
  return { eye, target: [0, 0.1 + 2.1 * t, 0] };
}
export function createGeometry(seed) {
  const data = new Float32Array(STRIPS * ALONG * ACROSS * 6 * STRIDE);
  let at = 0;
  for (let id = 0; id < STRIPS; id++) {
    const rnd = identity(seed, id);
    for (let u = 0; u < ALONG; u++)
      for (let v = 0; v < ACROSS; v++)
        for (const [du, dv] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [0, 1],
          [1, 0],
          [1, 1],
        ]) {
          data.set([(u + du) / ALONG, (v + dv) / ACROSS, id, ...rnd], at);
          at += STRIDE;
        }
  }
  return data;
}
// Same formula in both stages, not a different visual approximation.
export const GLSL = `
const float SS_TAU=6.28318530718,SS_L=${LENGTH}.,SS_N=${STRIPS}.;
float ssSmooth(float x){float t=clamp(x,0.,1.);return t*t*(3.-2.*t);}
vec2 ssFlutter(float s,float phase,float a){
 float k=SS_TAU*1.5/SS_L,a2=a*a;
 float j0=1.-a2/4.+a2*a2/64.-a2*a2*a2/2304.;
 float j1=a/2.-a*a2/16.+a*a2*a2/384.;
 float j2=a2/8.-a2*a2/96.+a2*a2*a2/3072.;
 float j3=a*a2/48.-a*a2*a2/768.;
 float j4=a2*a2/384.-a2*a2*a2/7680.;
 float q=k*s-phase;
 return vec2(j0*s+j2/k*(sin(2.*q)+sin(2.*phase))+j4/(2.*k)*(sin(4.*q)+sin(4.*phase)),
 -2.*j1/k*(cos(q)-cos(phase))-2.*j3/(3.*k)*(cos(3.*q)-cos(3.*phase)));
}
vec3 ssPoint(vec2 uv,float id,vec3 rnd){
 float b=ssSmooth(u_params[0]),t=ssSmooth((u_params[0]-1.)/.72);
 float g=(id+uv.y)/SS_N,phi=u_clock[0]+g*.28+b*rnd.x*SS_TAU;
 float a=.48*u_params[2];
 vec2 fl=ssFlutter(uv.x*SS_L,phi,a);
 float q=SS_TAU*1.5*uv.x-phi,ang=a*sin(q);
 float wrinkle=.035*sin(3.*q+g*14.)+.016*sin(7.*q-g*22.);
 fl+=vec2(-sin(ang),cos(ang))*wrinkle;
 vec3 p0=vec3(fl.x-SS_L*.47,(g-.5)*8.4,fl.y+.28*cos(g*SS_TAU));
 float yy=(uv.y-.5)*(.38+.48*rnd.y)*u_params[7];
 float torsion=.62*sin(2.*q+rnd.z*SS_TAU),wy=yy*cos(torsion),wz=yy*sin(torsion);
 float tilt=(rnd.z-.5)*1.4,xx=fl.x-SS_L*.47;
 vec3 p1=vec3(xx*cos(tilt)-wy*sin(tilt)+(rnd.z-.5)*2.,(rnd.x-.5)*6.8*u_params[3]+xx*sin(tilt)+wy*cos(tilt),(rnd.y-.5)*5.2*u_params[3]+fl.y+wz);
 float r=.45+.235*uv.x*SS_L,theta=id*2.3999632297+u_clock[1]+.72/.235*log(r/.45);
 float taper=sqrt(r/3.27),dr=(fl.y*.55+wz)*taper,hy=sqrt(1.-.235*.235-.72*.72),w=wy*taper;
 float loose=mod(id,7.)<.5?1.+3.*ssSmooth(uv.x):1.;
 vec3 p2=vec3((r*loose+dr)*cos(theta)-w*hy*sin(theta),hy*(uv.x*SS_L-SS_L*.5)-w*.72,(r*loose+dr)*sin(theta)+w*hy*cos(theta));
 return mix(mix(p0,p1,b),p2,t);
}
void ssCamera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float t=ssSmooth(u_params[0]-1.),a=u_clock[2];
 vec3 outside=vec3(2.1*sin(a),1.1+.28*sin(2.*a),12.8+.4*cos(a));
 float approach=ssSmooth(t/.72),rise=ssSmooth((t-.72)/.28);
 eye=mix(outside,vec3(.06*cos(a),-5.7,.06*sin(a)),approach);
 eye.y+=2.6*rise;
 vec3 target=vec3(0.,.1+2.1*t,0.);
 F=normalize(target-eye);R=normalize(cross(F,vec3(0.,1.,0.)));U=cross(R,F);
}
float ssFocal(){return u_params[6]*mix(1.,.72,ssSmooth(u_params[0]-1.))*(1.+.018*clamp(u_kick,0.,1.));}
`;
