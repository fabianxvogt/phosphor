import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";
import { stormData } from "./scene-storm-data.mjs";
import { stormVolume } from "./scene-storm-volume.mjs";

const schema = [
  {
    key: "development",
    label: "Development · haze / towers / supercell",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "motion",
    label: "Storm motion",
    min: 0.2,
    max: 1.6,
    step: 0.01,
    default: 0.7,
  },
  {
    key: "height",
    label: "Cloud height",
    min: 0.7,
    max: 1.2,
    step: 0.01,
    default: 1,
  },
  {
    key: "density",
    label: "Cloud depth",
    min: 0.5,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
  {
    key: "branches",
    label: "Leader branching",
    min: 0.2,
    max: 1,
    step: 0.01,
    default: 0.85,
  },
  {
    key: "eye",
    label: "Storm overlook",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "drift",
    label: "Overlook drift",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
  {
    key: "rain",
    label: "Rain curtains",
    min: 0.1,
    max: 1,
    step: 0.01,
    default: 0.7,
  },
];
const base = {
  motion: 0.7,
  height: 1,
  density: 1,
  branches: 0.85,
  eye: 0.45,
  drift: 0.45,
  rain: 0.7,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const presets = [
  look("Haze", 10701, 0),
  look("Towers", 10701, 1),
  look("Supercell", 10701, 2),
  look("Heat Lantern", 10702, 0.25, {
    height: 0.75,
    eye: 0.8,
    motion: 0.35,
    density: 0.75,
  }),
  look("Anvil Choir", 10703, 1.2, {
    height: 1.15,
    density: 1.3,
    branches: 1,
    eye: 0.2,
  }),
  look("Silent Shelf", 10704, 0.8, {
    height: 0.7,
    density: 1.35,
    rain: 0.2,
    drift: 0.2,
  }),
  look("Ground Current", 10705, 2, {
    branches: 1,
    rain: 0.4,
    eye: 0.1,
    motion: 0.9,
  }),
  look("Midnight Rotation", 10706, 1.8, {
    density: 1.1,
    rain: 1,
    drift: 0.8,
    eye: 0.9,
  }),
];

const common = `${lateClockGlsl}\n${stormData}`;
const fragment = `${common}
#ifdef PRECOMPUTED
uniform highp sampler2D u_precomputed;
#endif
vec4 stData(int i, int row) {
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed, ivec2(i, row), 0);
#else
  return stDatum(i, row);
#endif
}
${stormVolume}
void stLoadState() {
#ifdef PRECOMPUTED
  for (int k = 0; k < 4; ++k) {
    stSlot[k] = stData(120+k,0); stTop[k] = stData(120+k,1).xyz; stBottom[k] = stData(120+k,2).xyz;
  }
  for (int i = 0; i < 5; ++i) { stCell[i] = stData(128+i,0); stCellR[i] = stData(128+i,1).x; }
  stBase = stData(128,1).y;
#else
  stCells(); stEvents();
#endif
}
float stSegmentDistanceSq(vec2 p, vec2 a, vec2 b) {
  vec2 v = b-a;
  vec2 q = p-a-v*clamp(dot(p-a,v)/max(dot(v,v),1e-10),0.0,1.0);
  return dot(q,q);
}
float stSegmentDistance(vec2 p, vec2 a, vec2 b) {
  return sqrt(stSegmentDistanceSq(p,a,b));
}
// Two levels of seeded midpoint displacement: the tortuous small-scale
// zigzag of a real channel inside every stepped-leader edge.
float stBoltDistance(vec2 p, vec2 a, vec2 b, int network, int edge) {
  vec2 v = b-a;
  float len = length(v);
  vec2 n = vec2(-v.y,v.x)/max(len,1e-5);
  float r0 = stRand(network,400+edge)*2.0-1.0;
  float r1 = stRand(network,440+edge)*2.0-1.0;
  float r2 = stRand(network,480+edge)*2.0-1.0;
  vec2 m = mix(a,b,0.5)+n*len*0.2*r0;
  vec2 q0 = mix(a,m,0.5)+n*len*0.1*r1;
  vec2 q1 = mix(m,b,0.5)+n*len*0.1*r2;
  return sqrt(min(min(stSegmentDistanceSq(p,a,q0),stSegmentDistanceSq(p,q0,m)),
                  min(stSegmentDistanceSq(p,m,q1),stSegmentDistanceSq(p,q1,b))));
}
float stIGN(vec2 f) { return fract(52.9829189*fract(dot(f,vec2(0.06711056,0.00583715)))); }
float stHG(float g, float mu) {
  float g2 = g*g;
  return (1.0-g2)/(12.566*pow(max(1.0+g2-2.0*g*mu,1e-4),1.5));
}
// Piecewise log-linear transmittance along the view ray, recorded during the
// march; bolts inside the cloud dim by the optical depth in front of them.
float stTEnter = -1.0, stTHalf = -1.0, stTTenth = -1.0, stTExit = 0.0, stTFinal = 1.0;
float stTransAt(float t) {
  if (stTEnter < 0.0 || t <= stTEnter) return 1.0;
  float lf = log(max(stTFinal,1e-4));
  float t1 = stTHalf > 0.0 ? stTHalf : stTExit, l1 = stTHalf > 0.0 ? -0.6931 : lf;
  if (t <= t1) return exp(l1*(t-stTEnter)/max(t1-stTEnter,1e-3));
  if (stTTenth > 0.0 && t <= stTTenth) return exp(mix(-0.6931,-2.3026,(t-stTHalf)/max(stTTenth-stTHalf,1e-3)));
  return stTFinal;
}
void main() {
  stCameraSetup(); stLoadState(); stCloudSetup();
  float shortSide = min(u_resolution.x, u_resolution.y);
  vec2 screen = (v_uv - 0.5) * u_resolution / shortSide * 2.0;
  float framing = mix(1.05,1.0,smoothstep(0.9,1.6,u_resolution.x/u_resolution.y));
  float focal = stFocal * framing * (1.0 + 0.02 * u_kick);
  vec2 view = screen / focal;
  vec3 rd = normalize(stF + stR * view.x + stU * view.y);
  float pixel = 2.0 / (shortSide * focal);
  float level = clamp(u_level,0.0,1.0);
  float groundStrike = smoothstep(1.15,1.75,u_params[0]);
  // Only return strokes feed the broad term: one smooth pulse per event.
  float broad = (stSlot[0].y+stSlot[1].y)*mix(0.35,1.0,groundStrike)+0.4*stSlot[3].y;
  vec3 ink = mix(u_secondary,vec3(1),0.9);
  vec3 flashTint = mix(mix(u_secondary,vec3(1),0.88),u_accent,0.1);
  vec3 moonTint = mix(u_secondary,vec3(1),0.78);
  float mu = dot(rd,stMoon);

  // Night sky, horizon glow and a large moon.
  vec3 col = u_secondary*(0.004+0.022*exp(-sq((rd.y+0.02)/0.13)));
  // The moon disc is drawn in view space: no off-axis perspective stretch.
  vec3 mq = stMoon;
  float mz = dot(mq,stF);
  vec2 moonView = vec2(dot(mq,stR),dot(mq,stU))/max(mz,0.05);
  vec2 moonUV = (view-moonView)/0.045;
  float moonR = length(moonUV), angle = acos(clamp(mu,-1.0,1.0));
  float disc = (1.0-smoothstep(1.0-pixel/0.045,1.0+pixel/0.045,moonR))*step(0.2,mz);
  vec3 sphere = vec3(moonUV,sqrt(max(0.0,1.0-moonR*moonR)));
  float lit = 0.75+0.25*sphere.z;
  float maria = 0.8+0.2*stNoise(vec3(moonUV*2.2,4.0)).x;
  col += moonTint*(disc*lit*maria*1.8+disc*0.03+0.05*exp(-angle*14.0)+0.16*exp(-angle*50.0));
  col += flashTint*broad*0.018*(0.4+0.6*exp(-max(rd.y,0.0)*3.0));

  // Ridge line and plain: towns in primary, flash-lit ground, wet strike glints.
  float ridge = 0.003+0.008*sin(rd.x*7.0+1.2)+0.004*sin(rd.x*23.0+0.4)+0.002*sin(rd.x*61.0);
  float horizon = 1.0-smoothstep(ridge-pixel,ridge+pixel,rd.y);
  vec3 groundCol = u_secondary*0.006;
  if (horizon > 0.0) {
    float groundT = -stEye.y/min(rd.y,-0.0005);
    vec3 g = stEye+rd*min(groundT,400.0);
    float near = rd.y < 0.0 ? 1.0 : 0.0;
    float basin = exp(-sq(g.x/45.0)-sq((g.z-14.0)/30.0))*near;
    float ridges = 0.6+0.4*sin(g.x*0.35+sin(g.z*0.4)*1.5);
    groundCol += mix(u_secondary,u_primary,0.15)*0.035*basin*ridges;
    // Faint sheen toward the horizon: the plain reads as a surface.
    groundCol += u_secondary*0.03*exp(rd.y*40.0)*near;
    // Settlements: clusters of point lights, always about one output pixel.
    vec2 townGrid = g.xz*vec2(2.2,2.2);
    vec2 townCell = floor(townGrid);
    float townHash = fract(sin(dot(townCell,vec2(127.1,311.7)))*43758.5453);
    vec2 townDelta = fract(townGrid)-0.5-0.3*(vec2(fract(townHash*13.7),fract(townHash*71.3))-0.5);
    vec2 radius = max(vec2(0.035),fwidth(townGrid)*0.8);
    float settlements = smoothstep(0.62,0.85,stNoise(vec3(townCell*0.09,7.0)).x);
    float towns = exp(-dot(townDelta/radius,townDelta/radius))*min(1.0,0.03/(radius.x*radius.y))*step(0.9,townHash)*settlements;
    float distanceFade = smoothstep(6.0,14.0,length(g.xz-stEye.xz));
    groundCol += mix(u_primary,vec3(1),0.4)*towns*distanceFade*near*3.0;
    // Fields and hedgerows only read when a strike lights the plain.
    float fields = 0.55+0.45*stNoise(vec3(g.xz*vec2(0.7,0.9),2.0)).x;
    fields *= 0.75+0.25*smoothstep(0.0,0.08,abs(fract(g.x*0.31+0.3*sin(g.z*0.2))-0.5));
    float flashGround = broad*0.015*basin;
    for (int k = 0; k < 2; ++k) {
      vec2 q = g.xz-stBottom[k].xz;
      flashGround += stSlot[k].x*groundStrike*1.4/(1.0+dot(q,q)*0.15)*near;
    }
    groundCol += mix(u_secondary,vec3(1),0.6)*flashGround*0.25*fields;
    col = mix(col,groundCol,horizon);
  }

  // Rain shafts below the convective cells: analytic chords through soft
  // cylinders, lit by the moon and strongly by nearby discharges.
  float rainA = 0.0, rainT = 1e5;
  vec3 townCol = mix(u_secondary,u_primary,0.55)*0.03;
  vec3 rainL = vec3(0);
  float rainAmount = u_params[7]*mix(0.6,1.15,level)*stRise;
  float rise12 = stEye.y+12.0*rd.y/max(length(rd.xz),1e-3);
  if (rainAmount > 0.0 && rise12 < stBase*u_params[2]+0.5) {
#ifdef PRECOMPUTED
    vec3 shaftFlash = stData(133,0).xyz;
#else
    vec3 shaftFlash = vec3(stShaftFlash(0),stShaftFlash(1),stShaftFlash(2));
#endif
    // Moonlight scatters forward through rain backlit by the moon; nearby
    // discharges light the whole shaft, not a tube around the channel.
    float forward = mix(stHG(0.6,mu),stHG(0.0,mu),0.5);
    vec3 rainLight = moonTint*(0.012+0.25*forward)*0.35+townCol*0.4;
    float top = stBase*u_params[2];
    vec3 tangent = normalize(vec3(-rd.z,0.0,rd.x)+vec3(1e-5,0,0));
    for (int i = 0; i < 3; ++i) {
      int cell = i == 0 ? 1 : i == 1 ? 2 : 0;
      float w = i == 0 ? mix(0.6,1.0,stSuper) : i == 1 ? 0.5*stSuper : mix(0.2,0.55,stSuper);
      vec4 c = stCell[cell];
      float r = stCellR[cell]*0.75;
      vec2 o = stEye.xz-c.xy;
      float a2 = dot(rd.xz,rd.xz), b2 = dot(o,rd.xz), c2 = dot(o,o)-r*r;
      float disc2 = b2*b2-a2*c2;
      if (disc2 <= 0.0 || a2 < 1e-6) continue;
      float s = sqrt(disc2);
      float t0 = max(0.0,(-b2-s)/a2), t1 = (-b2+s)/a2;
      float tm = 0.5*(t0+t1);
      vec3 pm = stEye+rd*tm;
      float vertical = smoothstep(-0.2,0.6,pm.y)*(1.0-smoothstep(top-0.6,top+0.1,pm.y));
      if (t1 <= 0.0 || vertical <= 0.0) continue;
      float closest = sqrt(max(0.0,c2-b2*b2/a2))/r;
      float across = dot(pm,tangent);
      float streak = 0.35+0.65*stNoise(vec3(across*9.0+pm.y*0.6,pm.y*0.35+cos(stPhase*3.0)*0.4,float(i)*7.0+sin(stPhase*3.0)*0.4)).x;
      float curtain = 0.6+0.4*sin(across*1.3+float(i)*2.1)*sin(across*0.53+1.7);
      float alpha = 1.0-exp(-(t1-t0)*(1.0-closest*closest)*vertical*streak*curtain*rainAmount*w*0.3);
      float flash = broad*0.5+shaftFlash[i];
      rainL += (rainLight+flashTint*flash*0.3)*alpha*(1.0-rainA);
      rainA += alpha*(1.0-rainA);
      rainT = min(rainT,tm);
    }
  }
  // Full-resolution rays through the camera-independent optical lattice.
  // Outside the cloud the lattice stores a conservative distance, so empty
  // space is skipped; inside, short fixed steps with one static dither.
  vec3 lo, hi;
  stStormBox(lo,hi);
  vec3 inv = sign(rd + vec3(1e-8)) / max(abs(rd),vec3(1e-6));
  vec3 nearP = (lo - stEye) * inv, farP = (hi - stEye) * inv;
  vec3 n = min(nearP,farP), f = max(nearP,farP);
  float nearT = max(0.0,max(n.x,max(n.y,n.z))), farT = min(f.x,min(f.y,f.z));
  float trans = 1.0;
  vec3 cloud = vec3(0);
  if (farT > nearT && horizon < 1.0) {
    vec3 skyLight = mix(u_secondary,vec3(1),0.3)*0.2;
    vec3 townLight = mix(u_secondary,u_primary,0.55)*0.045;
    vec3 flashLight = flashTint*2.2;
    // Multiple-scattering octaves (Wrenninge): the phase terms depend only
    // on the view ray, so they are evaluated once per pixel.
    float phase0 = mix(stHG(0.72,mu),stHG(-0.25,mu),0.3);
    float phase1 = 0.5*mix(stHG(0.36,mu),stHG(-0.125,mu),0.3);
    float phase2 = 0.25*mix(stHG(0.18,mu),stHG(-0.0625,mu),0.3);
    float t = nearT, last = nearT;
    bool entered = false;
    int inside = 0;
    for (int j = 0; j < 48; ++j) {
      if (t > farT || trans < 0.03) break;
      vec3 p = stEye+rd*t;
      vec4 o = stVolume(p);
      if (o.x <= 0.0) { last = t; t += max(-o.x,0.2+0.008*t); continue; }
      if (!entered) {
        // Bisect the boundary crossing: a continuous entry depth per pixel,
        // so the fixed interior steps cannot print depth contours.
        float a = last, b = t;
        for (int k = 0; k < 3; ++k) {
          float m = 0.5*(a+b);
          if (stVolume(stEye+rd*m).x > 0.0) b = m; else a = m;
        }
        entered = true; t = b+stIGN(gl_FragCoord.xy)*min(0.15+0.008*b,0.25); stTEnter = b;
        p = stEye+rd*t; o = stVolume(p);
      }
      float ds = min(0.15+0.008*t,0.7/max(o.x,0.5));
      float sigma = o.x;
      // Full-resolution lobes carve the visible surface (Nubis-style
      // erosion), faded where they would be smaller than the output pixel.
      float fade = (1.0-smoothstep(0.1,0.45,pixel*t*2.4))*(inside < 4 ? 1.0 : 0.0);
      float crevice = 1.0;
      inside++;
      if (fade > 0.01) {
        vec3 chart = p*1.5+vec3(sin(stPhase)*0.3,cos(stPhase)*0.2,0);
        chart.xz = stRotation*chart.xz;
        // Sheared, fibrous, shallower lobes in the anvil.
        float anvilW = stSuper*smoothstep(stAnvil.y-2.2,stAnvil.y-0.9,p.y/u_params[2]);
        chart.x *= 1.0-0.65*anvilW;
        float fine = (1.0-smoothstep(0.1,0.45,pixel*t*3.7))*(inside <= 2 ? 1.0 : 0.0);
        float lobe = stDetail(chart).x*0.68+(fine > 0.0 ? mix(0.5,stDetail(chart*2.47+vec3(1.3,2.9,0.7)).x,fine) : 0.5)*0.32;
        lobe = clamp((lobe-0.25)/0.5,0.0,1.0);
        float full = 3.2*u_params[3];
        float erode = (1.0-lobe)*0.6*fade*(1.0-0.6*anvilW);
        sigma = full*smoothstep(erode,erode+0.3,sigma/full);
        crevice = mix(1.0,0.45+0.75*lobe,fade);
      }
      if (sigma <= 0.0) { t += ds; continue; }
      float tau = o.y;
      float ms = phase0*exp(-tau)+phase1*exp(-0.4*tau)+phase2*exp(-0.16*tau);
      float height = clamp((p.y/u_params[2]-stBase)/9.0,0.0,1.0);
      float powder = mix(0.45,1.0,1.0-exp(-2.0*sigma));
      vec3 S = (moonTint*ms*2.0*powder + skyLight*o.z*(0.3+0.7*height)
        + townLight*(sq(1.0-height)+0.8*(1.0-o.z)))*crevice + flashLight*o.w*mix(1.0,crevice,0.6);
      float stepT = exp(-sigma*ds);
      cloud += trans*S*(1.0-stepT);
      trans *= stepT;
      if (stTHalf < 0.0 && trans < 0.5) stTHalf = t;
      if (stTTenth < 0.0 && trans < 0.1) stTTenth = t;
      stTExit = t;
      t += ds;
    }
    stTFinal = trans;
  }
  col = col*trans + cloud;

  // Lightning channels: tile-culled seeded edges, occluded by the cloud in
  // front of them, so channels vanish into the cloud as a glow and emerge
  // crisp below the base.
  uvec4 mask = uvec4(65535u), crawlerMask = uvec4(65535u);
#ifdef PRECOMPUTED
  if (shortSide >= 280.0 && all(lessThan(abs(view),vec2(2)))) {
    ivec2 tile = ivec2(floor((view + 2.0) * 8.0)) + ivec2(0,3);
    mask = uvec4(texelFetch(u_precomputed,tile,0));
    crawlerMask = uvec4(texelFetch(u_precomputed,tile+ivec2(32,0),0));
  }
#endif
  vec3 bolts = vec3(0);
  float width = max(pixel * 1.45,0.0014);
  for (int group = 0; group < 8; ++group) {
    uvec4 candidate = group<4 ? mask : crawlerMask;
    int channel = group%4;
    uint bits = channel==0 ? candidate.x : channel==1 ? candidate.y : channel==2 ? candidate.z : candidate.w;
    if (bits == 0u) continue;
    for (int bit = 0; bit < 16; ++bit) {
    if (bits == 0u) break;
    bool present = (bits & 1u) != 0u; bits >>= 1u;
    int i = (group/4)*60 + channel*16 + bit;
    if (!present || channel*16+bit >= 60) continue;
    int slot = i/30;
    float power = stSlot[slot].x;
    if (power <= 0.002) continue;
    vec4 endpoints = stData(i,0);
    float len = length(endpoints.zw-endpoints.xy);
    float support = width*9.0+0.0018+len*0.3;
    vec2 edgeBox = max(min(endpoints.xy,endpoints.zw)-view,view-max(endpoints.xy,endpoints.zw));
    if (max(edgeBox.x,edgeBox.y)>support) continue;
    if (stSegmentDistanceSq(view,endpoints.xy,endpoints.zw)>sq(support)) continue;
    int local = i % 30;
    float d = stBoltDistance(view,endpoints.xy,endpoints.zw,int(stSlot[slot].w),local);
    if (d > width * 9.0) continue;
    vec4 a = stData(i,1), b = stData(i,2);
    float rank = local < 18 ? float(local)/18.0 : (4.0 + floor(float(local-18)/4.0)*4.0 + mod(float(local-18),4.0)) / 18.0;
    float grown = 1.0-smoothstep(stSlot[slot].z*1.02-0.04,stSlot[slot].z*1.02,rank);
    if (grown <= 0.0) continue;
    float branch = local < 18 ? 1.0 : u_params[4] * (0.5 + 0.5 * level);
    float taper = local<18 ? 1.0 : mix(0.72,0.3,mod(float(local-18),4.0)/3.0);
    vec2 ab = endpoints.zw-endpoints.xy;
    float s = clamp(dot(view-endpoints.xy,ab)/max(dot(ab,ab),1e-10),0.0,1.0);
    float occlusion = stTransAt(length(mix(a.xyz,b.xyz,s)-stEye));
    float core = exp(-sq(d / (width*taper)));
    float glow = exp(-sq(d / (width * 4.0*taper)));
    float halo = exp(-sq(d / (width * 5.0*taper)));
    vec3 light = (ink*(core*6.0+glow*0.7) + mix(ink,u_accent,0.3)*halo*0.08)*occlusion;
    bolts += light * a.w * branch * power * grown;
    }
  }
  col += bolts;
  // Rain in front of the cloud veils it and its channels; behind, it is veiled.
  float rainVisible = rainT < stTEnter || stTEnter < 0.0 ? 1.0 : stTransAt(rainT);
  col = col*(1.0-rainA*rainVisible)+rainL*rainVisible;
  outColor = vec4(max(col,vec3(0)),1.0);
}
`;

export default {
  id: "storm",
  number: 107,
  name: "Thunderhead",
  description:
    "A distant bank flickering with heat lightning grows into towering cumulonimbus and a supercell with a streaming anvil. Every discharge lights the cloud from inside; strikes fall from the anvil to the plain.",
  development: "development",
  schema,
  presets,
  fragment,
  precompute: {
    size: [1024, 675],
    filter: "linear",
    nearestFallback: true,
    fragment: `${common}
${stormVolume}
void main() {
  stCameraSetup(); stCells(); stCloudSetup();
  int x = int(gl_FragCoord.x), row = int(gl_FragCoord.y);
  if (row >= 35) {
    ivec3 voxel = ivec3(x%128,(row-35)%80,(row-35)/80*8+x/128);
    if (voxel.z >= 64) { outColor = vec4(0); return; }
    vec3 p = stVolumeLo+(vec3(voxel)+0.5)/stGrid*stVolumeSize;
    // Most nodes lie far from the storm: store the distance to its bounds
    // (a lower bound of the cloud distance) and skip all transport work.
    vec3 lo, hi;
    stStormBox(lo,hi);
    float box = length(max(lo-p,0.0)+max(p-hi,0.0));
    if (box > 2.5) { outColor = vec4(-max(1e-4,box*0.8),0,1,0); return; }
    stEvents();
    outColor = stOptical(p);
    return;
  }
  stEvents();
  if (row < 3) { outColor = stDatum(x,row); return; }
  if (x >= 124 && x < 964 && row < 33) {
    ivec3 q = ivec3((x-124)%30-1,row-4,(x-124)/30);
    outColor = stBillowCore(mod(vec3(q),28.0)*0.25,7.0);
    return;
  }
  if (x >= 64) { outColor = vec4(0); return; }
  vec2 lo = vec2(float(x%32),float(row - 3)) / 8.0 - 2.0, hi = lo + 0.125;
  uvec4 bits = uvec4(0u);
  for (int i = 0; i < 60; ++i) {
    int e = i+(x/32)*60;
    // Inactive discharges and unselected branches never enter a tile mask.
    if (stSlot[e/30].x <= 0.002 || stDatum(e,1).w <= 0.0) continue;
    vec4 p = stDatum(e,0);
    float pad = 0.07+0.3*length(p.zw-p.xy);
    vec2 a = min(p.xy,p.zw) - pad, b = max(p.xy,p.zw) + pad;
    if (all(greaterThanEqual(b,lo)) && all(lessThanEqual(a,hi))) {
      if (i < 16) bits.x |= 1u << uint(i); else if (i < 32) bits.y |= 1u << uint(i-16);
      else if (i < 48) bits.z |= 1u << uint(i-32); else bits.w |= 1u << uint(i-48);
    }
  }
  outColor = vec4(bits);
}`,
  },
  stage: ["height", "branches", "rain"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { motion: { mul: [0.75, 1.35] }, drift: { mul: [0.8, 1.3] } },
  beat: { punch: 0.12, pulse: 0.08 },
  clocks: [
    { rate: (p) => p[1] * 0.16, period: 2 * Math.PI },
    { rate: (p) => p[6] * 0.035, period: 2 * Math.PI },
  ],
  rhythm: [
    familyEffect(
      "buried-discharge",
      0,
      "Buried discharge",
      "A bounded discharge lights the interior of the same charged cloud.",
      { period: 4, strength: 0.6, duration: 1.2 },
    ),
    familyEffect(
      "branch-corona",
      1,
      "Branch corona",
      "A small ionisation glow expands around a persistent leader root.",
      { period: 8, strength: 0.6, duration: 2 },
    ),
    familyEffect(
      "stepped-return",
      2,
      "Stepped return",
      "A return stroke traces the existing connected leader tree.",
      { period: 16, strength: 0.65, duration: 2.5 },
    ),
  ],
};
