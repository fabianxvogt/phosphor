// Silk Storm: seeded material coordinates never depend on development.
export const STRIPS = 28;
export const ALONG = 160;
export const ACROSS = 12;
export const MOTES = 112;
export const ADDITIVE_FROM = STRIPS * ALONG * ACROSS * 6;
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
  // Four adjacent persistent lanes are one continuous broad cloth length.
  const panel = id < STRIPS ? Math.floor(id / 4) : id;
  let n = (seed ^ Math.imul(panel + 1, 0x9e3779b9)) >>> 0;
  const rand = () => {
    n ^= n << 13;
    n ^= n >>> 17;
    n ^= n << 5;
    return (n >>> 0) / 4294967296;
  };
  return [rand(), rand(), rand()];
}
// Integrated tangent (cos(a sin q), sin(a sin q)), Bessel series through J4.
// At a <= 1.08 the omitted terms bound the tangent strain below .15%.
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
  const b = smooth((development - 0.35) / 0.47),
    t = smooth((development - 1) / 0.72);
  const g = (id + v) / STRIPS;
  v = ((id % 4) + v) / 4;
  id = Math.floor(id / 4);
  const phi = phase + g * 0.28 + b * rnd[0] * TAU;
  const a = 0.48 * amplitude;
  const fl = flutter(u * LENGTH, phi, a);
  const q = TAU * 1.5 * u - phi,
    angleW = a * Math.sin(q);
  const wrinkle =
    0.035 * Math.sin(3 * q + g * 14) + 0.016 * Math.sin(7 * q - g * 22);
  const x = fl[0] - Math.sin(angleW) * wrinkle,
    z = fl[1] + Math.cos(angleW) * wrinkle;
  // Oblique material chart: a generalized cylinder, not a displaced flat flag.
  // Rotation of the chart preserves the metric; waves travel across the sheet.
  const mx = (u - 0.5) * LENGTH,
    my = (g - 0.5) * 8.4,
    along = mx * 0.8 + my * 0.6 + 7.32,
    across = -mx * 0.6 + my * 0.8;
  const veilPhase =
    phase +
    0.9 * Math.sin(across * 0.45 + phase) +
    0.25 * Math.sin(across * 0.9 - phase);
  const veilAmplitude =
    0.72 * amplitude * (0.85 + 0.15 * Math.cos(across * 0.55));
  const centre = flutter(7.32 * 2.6, veilPhase, veilAmplitude);
  const vf = flutter(along * 2.6, veilPhase, veilAmplitude).map(
    (x, k) => (x - centre[k]) / 2.6,
  );
  vf[1] += 0.3 * Math.cos(phase);
  const vq = (TAU * 1.5 * along * 2.6) / LENGTH - veilPhase;
  const va = veilAmplitude * Math.sin(vq);
  const fine = 0.027 * Math.sin(3 * vq) + 0.008 * Math.sin(7 * vq);
  vf[0] -= Math.sin(va) * fine;
  vf[1] += Math.cos(va) * fine;
  const billow =
    0.55 * Math.sin(mx * 0.52 - phase) * Math.cos(my * 0.38 + phase);
  const s0 = [
    (vf[0] * 0.8 - across * 0.6) * 1.35,
    (vf[0] * 0.6 + across * 0.8) * 1.35,
    vf[1] * 2.8 + billow,
  ];
  const panelWidth = (1.35 + 0.9 * rnd[1]) * width;
  const yy = (v - 0.5) * panelWidth;
  const tilt = -0.48 + (rnd[2] - 0.5) * 1.6;
  const curve = TAU * u - phi + rnd[2] * TAU;
  const xx = (x - LENGTH * 0.47) * 1.6;
  const cy = 2.1 * Math.sin(curve);
  const tangent = [
    1.6 * LENGTH * Math.cos(angleW),
    2.1 * TAU * Math.cos(curve),
    1.3 * LENGTH * Math.sin(angleW) + 1.8 * TAU * Math.cos(curve + 1.3),
  ];
  const norm = (p) => p.map((x) => x / Math.hypot(...p));
  const d = norm(tangent),
    w0 = norm([-d[1], d[0], 0]);
  const n0 = [
    d[1] * w0[2] - d[2] * w0[1],
    d[2] * w0[0] - d[0] * w0[2],
    d[0] * w0[1] - d[1] * w0[0],
  ];
  const bw = yy;
  const bannerTwist = 0.5 * Math.sin(q + rnd[2] * TAU);
  // A rounded transverse belly with returning hems, never a planar blade.
  const ruffle1 =
    panelWidth *
    (0.19 * Math.sin(v * Math.PI) +
      0.12 * Math.sin(v * TAU + q) +
      0.045 * Math.sin(v * Math.PI * 5 - q)) *
    (0.75 + 0.25 * Math.sin(q));
  const offset = w0.map(
    (x, k) =>
      bw * (x * Math.cos(bannerTwist) + n0[k] * Math.sin(bannerTwist)) +
      n0[k] * ruffle1,
  );
  const bx = xx + offset[0],
    by = cy + offset[1];
  const s1 = [
    bx * Math.cos(tilt) - by * Math.sin(tilt) + (rnd[2] - 0.5) * 3,
    (id - 3) * 1.1 * spread + bx * Math.sin(tilt) + by * Math.cos(tilt),
    (rnd[1] - 0.5) * 6 * spread +
      1.3 * z +
      1.8 * Math.sin(curve + 1.3) +
      offset[2],
  ];
  // At the peak the seven lengths nest edge-to-edge into one soft twisted
  // canopy. A single periodic chart removes intersecting turbine shoulders.
  const angle = g * TAU + turn;
  const baseR = 0.45 + 0.235 * u * LENGTH;
  const crown = smooth((u - 0.48) / 0.52);
  const r = baseR * (1 - 0.92 * crown);
  const theta = angle + (0.72 / 0.235) * Math.log(baseR / 0.45);
  const wave = TAU * 1.5 * u - phase;
  const pleat =
    7 * angle +
    1.3 * Math.sin(wave + 2 * angle) +
    0.4 * Math.sin(2 * wave - angle);
  const radius =
    r *
    (1 +
      0.13 * amplitude * width * Math.sin(pleat) +
      0.055 * Math.sin(2 * pleat + wave) +
      0.075 * Math.sin(3 * angle - phase) +
      0.025 * Math.sin(3 * pleat - 2 * wave));
  const hy = Math.sqrt(1 - 0.235 ** 2 - 0.72 ** 2);
  const s2 = [
    radius * Math.cos(theta),
    hy * (u * LENGTH - LENGTH / 2) +
      0.17 * Math.sin(pleat + wave) * Math.sin(u * Math.PI),
    radius * Math.sin(theta),
  ];
  return s0.map((q, k) => (q + b * (s1[k] - q)) * (1 - t) + s2[k] * t);
}
export function camera(development, phase = 0) {
  const t = smooth(development - 1),
    approach = smooth(t / 0.72);
  const outside = [
    1.2 * Math.sin(phase),
    0.5 + 0.22 * Math.sin(2 * phase),
    5.7 + 3.2 * smooth(development) + 0.3 * Math.cos(phase),
  ];
  const inside = [0.06 * Math.cos(phase), -3.1, 0.06 * Math.sin(phase)];
  const eye = outside.map((q, k) => q + approach * (inside[k] - q));
  return {
    eye,
    target: [
      0.6 * t * Math.sin(phase),
      0.1 + 2.1 * t,
      0.45 * t * Math.cos(phase),
    ],
    up: [0, 1 - approach, -approach],
  };
}
export function createGeometry(seed) {
  const data = new Float32Array((ADDITIVE_FROM + MOTES * 6) * STRIDE);
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
  // Additive, depth-tested dust tail; the cloth itself remains opaque.
  for (let id = 0; id < MOTES; id++) {
    const rnd = identity(seed, STRIPS + id);
    for (const [u, v] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]) {
      data.set([u, v, -1 - id, ...rnd], at);
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
 float b=ssSmooth((u_params[0]-.35)/.47),t=ssSmooth((u_params[0]-1.)/.72);
 float g=(id+uv.y)/SS_N;
 uv.y=(mod(id,4.)+uv.y)/4.;id=floor(id/4.);
 vec3 p0=vec3(0.);
 // Uniform branches omit inactive charts, never geometry or persistent ids.
 if(b<1. && t<1.){
  float mx=(uv.x-.5)*SS_L,my=(g-.5)*8.4;
  float along=mx*.8+my*.6+7.32,across=-mx*.6+my*.8;
  float veilPhase=u_clock[0]+.9*sin(across*.45+u_clock[0])+.25*sin(across*.9-u_clock[0]);
  float veilAmplitude=.72*u_params[2]*(.85+.15*cos(across*.55));
  vec2 vf=(ssFlutter(along*2.6,veilPhase,veilAmplitude)-ssFlutter(7.32*2.6,veilPhase,veilAmplitude))/2.6;
  vf.y+=.3*cos(u_clock[0]);
  float vq=SS_TAU*1.5*along*2.6/SS_L-veilPhase,va=veilAmplitude*sin(vq);
  float fine=.027*sin(3.*vq)+.008*sin(7.*vq);
  vf+=vec2(-sin(va),cos(va))*fine;
  float billow=.55*sin(mx*.52-u_clock[0])*cos(my*.38+u_clock[0]);
  p0=vec3((vf.x*.8-across*.6)*1.35,(vf.x*.6+across*.8)*1.35,vf.y*2.8+billow);
 }
 if(b<=0.)return p0;
 float phi=u_clock[0]+g*.28+b*rnd.x*SS_TAU,a=.48*u_params[2];
 vec2 fl=ssFlutter(uv.x*SS_L,phi,a);
 float q=SS_TAU*1.5*uv.x-phi,ang=a*sin(q);
 float wrinkle=.035*sin(3.*q+g*14.)+.016*sin(7.*q-g*22.);
 fl+=vec2(-sin(ang),cos(ang))*wrinkle;
 float panelWidth=(1.35+.9*rnd.y)*u_params[7];
 float yy=(uv.y-.5)*panelWidth;
 vec3 p1=vec3(0.);
 if(t<1.){
  float tilt=-.48+(rnd.z-.5)*1.6,curve=SS_TAU*uv.x-phi+rnd.z*SS_TAU;
  float xx=(fl.x-SS_L*.47)*1.6,cy=2.1*sin(curve);
  vec3 d=normalize(vec3(1.6*SS_L*cos(ang),2.1*SS_TAU*cos(curve),1.3*SS_L*sin(ang)+1.8*SS_TAU*cos(curve+1.3)));
  vec3 w0=normalize(vec3(-d.y,d.x,0.)),n0=cross(d,w0);
  float bw=yy;
  float bannerTwist=.5*sin(q+rnd.z*SS_TAU);
  float ruffle1=panelWidth*(.19*sin(uv.y*3.14159265359)+.12*sin(uv.y*SS_TAU+q)+.045*sin(uv.y*3.14159265359*5.-q))*(.75+.25*sin(q));
  vec3 offset=bw*(w0*cos(bannerTwist)+n0*sin(bannerTwist))+n0*ruffle1;
  float bx=xx+offset.x,by=cy+offset.y;
  p1=vec3(bx*cos(tilt)-by*sin(tilt)+(rnd.z-.5)*3.,(id-3.)*1.1*u_params[3]+bx*sin(tilt)+by*cos(tilt),(rnd.y-.5)*6.*u_params[3]+1.3*fl.y+1.8*sin(curve+1.3)+offset.z);
 }
 if(t<=0.)return mix(p0,p1,b);
 float angle=g*SS_TAU+u_clock[1],baseR=.45+.235*uv.x*SS_L,crown=ssSmooth((uv.x-.48)/.52);
 float r=baseR*(1.-.92*crown),theta=angle+.72/.235*log(baseR/.45);
 float wave=SS_TAU*1.5*uv.x-u_clock[0],pleat=7.*angle+1.3*sin(wave+2.*angle)+.4*sin(2.*wave-angle);
 float radius=r*(1.+.13*u_params[2]*u_params[7]*sin(pleat)+.055*sin(2.*pleat+wave)+.075*sin(3.*angle-u_clock[0])+.025*sin(3.*pleat-2.*wave));
 float hy=sqrt(1.-.235*.235-.72*.72);
 vec3 p2=vec3(radius*cos(theta),hy*(uv.x*SS_L-SS_L*.5)+.17*sin(pleat+wave)*sin(uv.x*3.14159265359),radius*sin(theta));
 return mix(mix(p0,p1,b),p2,t);
}
void ssCamera(out vec3 eye,out vec3 R,out vec3 U,out vec3 F){
 float t=ssSmooth(u_params[0]-1.),a=u_clock[2];
 vec3 outside=vec3(1.2*sin(a),.5+.22*sin(2.*a),5.7+3.2*ssSmooth(u_params[0])+.3*cos(a));
 float approach=ssSmooth(t/.72);
 eye=mix(outside,vec3(.06*cos(a),-3.1,.06*sin(a)),approach);
 vec3 target=vec3(.6*t*sin(a),.1+2.1*t,.45*t*cos(a));
 vec3 up=mix(vec3(0.,1.,0.),vec3(0.,0.,-1.),approach);
 F=normalize(target-eye);R=normalize(cross(F,up));U=cross(R,F);
}
float ssFocal(){return u_params[6]*mix(1.,.72,ssSmooth(u_params[0]-1.))*(1.+.018*clamp(u_kick,0.,1.));}
`;
