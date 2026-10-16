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
vec4 stMirror(int i) {
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed,ivec2(124+i,33),0);
#else
  return stMirrorDatum(i);
#endif
}
float stValue(vec2 p, float layer) { return stNoise(vec3(p,layer)).x; }
// Night sky: a deep palette gradient, the moon's aureole, warm town light
// domes on the horizon, a thin drifting cirrus deck lit by the moon and by
// sheet lightning, and static stars. Shared by the view and the lake.
// Palette mid-tones pushed away from grey before any mix with white.
vec3 stSat(vec3 c, float k) { return max(mix(vec3(dot(c,vec3(0.3,0.59,0.11))),c,k),0.0); }
// Moonlit night sky: deep zenith, a horizon band tinted toward accent, the
// whole moon side of the sky lighter than the far side.
vec3 stSkyBase(vec3 rd, float up, float angle) {
  vec3 sec = stSat(u_secondary,1.3);
  vec3 col = mix(sec*0.014, mix(sec,u_accent,0.25)*0.06, exp(-up*5.0));
  vec2 h = rd.xz/max(length(rd.xz),1e-4), m = stMoon.xz/max(length(stMoon.xz),1e-4);
  float side = pow(max(dot(h,m),0.0),3.0);
  vec3 moonTint = mix(sec,vec3(1),0.3);
  col += moonTint*(0.34*exp(-angle*7.0)+0.09*exp(-angle*1.8)+0.03*side*(0.4+0.6*exp(-up*2.0)));
  return col;
}
// The sky without cirrus and stars (lake reflections): one small copy.
vec3 stSkyLite(vec3 rd) {
  float up = max(rd.y,0.0);
  float angle = acos(clamp(dot(rd,stMoon),-1.0,1.0));
  vec3 col = stSkyBase(rd,up,angle);
  float az = atan(rd.x,rd.z);
  float domes = 1.2*exp(-sq((az+0.95)/0.11))+0.8*exp(-sq((az+0.2)/0.07))
    +1.4*exp(-sq((az-0.55)/0.13))+0.6*exp(-sq((az-1.05)/0.06));
  return col+mix(u_primary,u_secondary,0.25)*domes*0.05*exp(-up*16.0);
}
vec3 stSky(vec3 rd, vec3 eye, float broad, float pixel, bool stars, out float veil) {
  float up = max(rd.y,0.0);
  float angle = acos(clamp(dot(rd,stMoon),-1.0,1.0));
  vec3 moonTint = mix(stSat(u_secondary,1.3),vec3(1),0.3);
  vec3 col = stSkyBase(rd,up,angle);
  float aureole = 0.34*exp(-angle*7.0)+0.09*exp(-angle*1.8);
  // Light domes of distant towns (primary): scale and colour at the horizon.
  float az = atan(rd.x,rd.z);
  float domes = 1.2*exp(-sq((az+0.95)/0.11))+0.8*exp(-sq((az+0.2)/0.07))
    +1.4*exp(-sq((az-0.55)/0.13))+0.6*exp(-sq((az-1.05)/0.06));
  col += mix(u_primary,u_secondary,0.25)*domes*0.05*exp(-up*16.0);
  veil = 0.0;
  if (stars && rd.y > 0.015) {
    float t = (26.0-eye.y)/rd.y;
    vec2 q = (eye.xz+rd.xz*t)*0.02;
    q = vec2(q.x*0.55,q.y*1.7)+0.9*vec2(cos(stPhase),sin(stPhase));
    float n = stValue(q,1.7)*0.62+stValue(q*2.03+vec2(5.2,1.3),3.1)*0.38;
    float cover = smoothstep(0.38,0.75,n)*smoothstep(0.015,0.16,rd.y)*exp(-t/900.0);
    veil = cover;
    vec3 lit = moonTint*(0.035+0.42*stHG(0.7,dot(rd,stMoon))) + mix(mix(vec3(1),u_accent,0.25),u_secondary,0.2)*broad*0.32;
    col = col*(1.0-0.45*cover)+lit*cover*0.6;
  }
  if (stars && up > 0.04) {
    vec3 s = rd*230.0;
    vec3 cell = floor(s);
    uint h = stHash(u_seedBits ^ uint(int(cell.x)+4096)*0x9e3779b9u ^ uint(int(cell.y)+4096)*0x85ebca6bu ^ uint(int(cell.z)+4096)*0xc2b2ae35u);
    if ((h & 1023u) < 7u) {
      vec3 j = vec3(uvec3(h>>10,h>>16,h>>22)&uvec3(63u))/63.0*0.6+0.2;
      vec3 f = fract(s)-j;
      float r = max(0.12,pixel*230.0*0.75);
      float mag = float((h>>28)&15u)/15.0;
      float star = exp(-dot(f,f)/(r*r))*min(1.0,0.0144/(r*r))*(0.04+0.5*mag*mag*mag);
      col += mix(u_secondary,vec3(1),0.75)*star*(1.0-veil)*smoothstep(0.04,0.2,up)*(1.0-clamp(aureole*6.0,0.0,1.0));
    }
  }
  return col;
}
// The moon disc in view space (no off-axis stretch): limb darkening, maria,
// a few craters, veiled by passing cirrus.
vec3 stMoonDisc(vec2 view, float pixel, float veil) {
  vec3 mq = stMoon;
  float mz = dot(mq,stF);
  if (mz < 0.2) return vec3(0);
  vec2 moonView = vec2(dot(mq,stR),dot(mq,stU))/mz;
  vec2 uv = (view-moonView)/0.045;
  float r = length(uv);
  if (r > 1.2) return vec3(0);
  float disc = 1.0-smoothstep(1.0-pixel/0.045,1.0+pixel/0.045,r);
  float z = sqrt(max(0.0,1.0-r*r));
  float limb = 0.55+0.45*pow(z,0.6);
  float maria = 0.72+0.28*smoothstep(0.3,0.7,stValue(uv*2.2+vec2(3.1,1.7),4.0));
  float crater = 1.0;
  return mix(u_secondary,vec3(1),0.8)*disc*limb*maria*crater*2.1*(1.0-0.55*veil);
}
// Far shore of the lake (world z of the waterline at x).
float stShore(float x) { return -7.0+1.6*sin(x*0.11+0.7)+0.8*sin(x*0.29+2.1); }
void main() {
  stCameraSetup(); stLoadState(); stCloudSetup();
  float shortSide = min(u_resolution.x, u_resolution.y);
  vec2 screen = (v_uv - 0.5) * u_resolution / shortSide * 2.0;
  float framing = mix(1.05,1.0,smoothstep(0.9,1.6,u_resolution.x/u_resolution.y));
  float focal = stFocal * framing * (1.0 + 0.02 * u_kick);
  vec2 view = screen / focal;
  vec3 rd = normalize(stF + stR * view.x + stU * view.y);
  float pixel = 2.0 / (shortSide * focal);
  float mu = dot(rd,stLight);

  // Ridge line, plain and lake. Towns are clusters with a warm pool and
  // dense lights (primary), joined by road threads; strikes light the plain.
  float ridge = 0.002+0.006*sin(rd.x*7.0+1.2)+0.003*sin(rd.x*23.0+0.4)+0.0015*sin(rd.x*61.0);
  float horizon = 1.0-smoothstep(ridge-pixel,ridge+pixel,rd.y);
  // Full-resolution rays through the camera-independent optical lattice.
  vec3 lo, hi;
  stStormBox(lo,hi);
  vec3 moonTint = mix(stSat(u_secondary,1.3),vec3(1),0.3);
  vec3 skyLight = stSat(u_secondary,1.3)*0.12;
  vec3 townLight = stSat(mix(u_primary,u_accent,0.45),1.3)*0.12;
  vec3 flashLight = mix(vec3(1),stSat(u_accent,1.3),0.65)*2.0;
  float phase0 = mix(stHG(0.72,mu),stHG(-0.25,mu),0.3);
  float phase1 = 0.35*mix(stHG(0.36,mu),stHG(-0.125,mu),0.3);
  float phase2 = 0.12*mix(stHG(0.18,mu),stHG(-0.0625,mu),0.3);
  vec3 inv = sign(rd + vec3(1e-8)) / max(abs(rd),vec3(1e-6));
  vec3 nearP = (lo - stEye) * inv, farP = (hi - stEye) * inv;
  vec3 n = min(nearP,farP), f = max(nearP,farP);
  float nearT = max(0.0,max(n.x,max(n.y,n.z))), farT = min(f.x,min(f.y,f.z));
  float trans = 1.0;
  vec3 cloud = vec3(0);
  int limit = int(min(44.0,0.46*u_raySteps));
  if (farT > nearT && horizon < 1.0) {
    float t = nearT, last = nearT;
    bool entered = false;
    int inside = 0;
    float depth = 0.0;
    for (int j = 0; j < 44; ++j) {
      if (j >= limit || t > farT || trans < 0.08) break;
      vec3 p = stEye+rd*t;
      vec4 o = stVolume(p);
      if (o.x <= 0.0) { last = t; t += max(-o.x,0.28+0.011*t); continue; }
      if (!entered) {
        float a = last, b = t;
        for (int k = 0; k < 2; ++k) {
          float m = 0.5*(a+b);
          if (stVolume(stEye+rd*m).x > 0.0) b = m; else a = m;
        }
        entered = true; t = b+stIGN(gl_FragCoord.xy)*min(0.15+0.008*b,0.25); stTEnter = b;
        p = stEye+rd*t; o = stVolume(p);
      }
      // Deep inside, the lit volume is smooth: steps grow with optical depth.
      float ds = min(0.15+0.008*t,0.7/max(o.x,0.5))*(1.0+min(depth*0.5,1.8));
      float sigma = o.x;
      float anvilF = stSuper*smoothstep(stAnvil.y-2.2,stAnvil.y-0.9,p.y/u_params[2]);
      float fade = (1.0-smoothstep(0.1,0.45,pixel*t*2.4))*(inside < 2 ? 1.0 : 0.0)*(1.0-0.35*anvilF);
      float crevice = 1.0;
      inside++;
      if (fade > 0.01) {
        vec3 chart = p*1.5+vec3(sin(stPhase)*0.3,cos(stPhase)*0.2,0);
        chart.xz = stRotation*chart.xz;
        float anvilW = stSuper*smoothstep(stAnvil.y-2.2,stAnvil.y-0.9,p.y/u_params[2]);
        // Anvil: fibrous streamers stretched downstream, not lobes.
        chart.x *= 1.0-0.88*anvilW;
        chart.z *= 1.0-0.5*anvilW;
        chart.y *= 1.0+2.0*anvilW;
        float fine = (1.0-smoothstep(0.1,0.45,pixel*t*3.7))*(inside <= 2 ? 1.0 : 0.0);
        float lobe = stDetail(chart).x*0.68+(fine > 0.0 ? mix(0.5,stDetail(chart*2.47+vec3(1.3,2.9,0.7)).x,fine) : 0.5)*0.32;
        lobe = clamp((lobe-0.25)/0.5,0.0,1.0);
        float full = 3.2*u_params[3];
        float erode = (1.0-lobe)*0.7*fade*(1.0-0.75*anvilW);
        if (anvilW > 0.01) {
          // Anvil: fibrous ice streamers stretched downstream, at output
          // resolution (no lattice steps on the thin sheet's edge).
          vec3 w = p*vec3(0.3,2.6,0.9)+vec3(0.6*sin(stPhase),0.0,0.4*cos(stPhase));
          float fib = stNoise(w).x;
          erode = mix(erode,0.25+(1.0-fib)*0.95,anvilW*fade);
        }
        sigma = full*smoothstep(erode,erode+0.3,sigma/full);
        crevice = mix(1.0,0.22+1.0*lobe,fade*(1.0-0.6*anvilW));
      }
      if (sigma <= 0.0) { t += ds; continue; }
      float tau = o.y;
      float ms = phase0*exp(-tau)+phase1*exp(-0.4*tau)+phase2*exp(-0.16*tau);
      float height = clamp((p.y/u_params[2]-stBase)/9.0,0.0,1.0);
      float powder = mix(0.45,1.0,1.0-exp(-2.0*sigma));
      vec3 S = (moonTint*ms*1.5*powder + skyLight*o.z*(0.3+0.7*height)
        + townLight*sq(sq(1.0-height))*(0.4+1.2*(1.0-o.z)))*crevice + flashLight*o.w*mix(1.0,crevice,0.6);
      float stepT = exp(-sigma*ds);
      cloud += trans*S*(1.0-stepT);
      trans *= stepT;
      depth += sigma*ds;
      if (stTHalf < 0.0 && trans < 0.5) stTHalf = t;
      if (stTTenth < 0.0 && trans < 0.1) stTTenth = t;
      stTExit = t;
      t += ds;
    }
    // The cut-off remainder takes the last sample's colour (no darkening).
    if (trans < 0.08 && entered) {
      cloud += trans*cloud/max(1.0-trans,0.5)*0.6;
      trans = 0.0;
    }
    stTFinal = trans;
  }
  // Per-pixel terms used after the march only (not live inside the loop).
  float level = clamp(u_level,0.0,1.0);
  float groundStrike = smoothstep(1.15,1.75,u_params[0]);
  // Only return strokes feed the broad term: one smooth pulse per event.
  float broad = (stSlot[0].y+stSlot[1].y)*mix(0.35,1.0,groundStrike)+0.4*stSlot[3].y;
  vec3 ink = mix(u_secondary,vec3(1),0.92);
  vec3 flashTint = mix(mix(u_secondary,vec3(1),0.8),u_accent,0.32);
  vec3 col = vec3(0), groundAll = vec3(0);
  // Ground, lake and rain are shaded after the march, so none of their
  // state is live inside the loop (register pressure).
  float water = 0.0;
  vec3 g = vec3(0);
  vec3 waterN = vec3(0,1,0);
  if (horizon > 0.0) {
    float near = rd.y < 0.0 ? 1.0 : 0.0;
    float groundT = -stEye.y/min(rd.y,-0.0005);
    g = stEye+rd*min(groundT,400.0);
    float dist = length(g.xz-stEye.xz);
    vec3 groundCol = mix(u_secondary,vec3(1),0.2)*0.016+mix(u_secondary,vec3(1),0.3)*0.03*exp(rd.y*30.0)*near;
    float fields = 0.55+0.45*(0.5+0.25*sin(g.x*0.9+2.0*sin(g.z*0.31))+0.25*sin(g.z*1.3+1.7*sin(g.x*0.23)));
    fields *= 0.75+0.25*smoothstep(0.0,0.08,abs(fract(g.x*0.31+0.3*sin(g.z*0.2))-0.5));
    groundCol *= 0.6+0.4*fields;
    // Town clusters on a 5-unit grid: a soft warm pool plus dense lights.
    vec2 tc = floor(g.xz/6.0);
    float th = fract(sin(dot(tc,vec2(127.1,311.7)))*43758.5453);
    vec2 centre = (tc+0.5+0.25*(vec2(fract(th*13.7),fract(th*71.3))-0.5))*6.0;
    float size = 0.7+0.8*fract(th*37.1);
    vec2 dq = g.xz-centre;
    float pool = th < 0.5 ? exp(-dot(dq,dq)/(size*size)) : 0.0;
    vec2 lg = g.xz*3.2;
    vec2 lc = floor(lg);
    float lh = fract(sin(dot(lc,vec2(41.3,289.1)))*13758.5453);
    vec2 ld = fract(lg)-0.5-0.35*(vec2(fract(lh*17.3),fract(lh*91.7))-0.5);
    vec2 rad = max(vec2(0.06),fwidth(lg)*0.7);
    float lamp = exp(-dot(ld/rad,ld/rad))*min(1.0,0.012/(rad.x*rad.y));
    // Road threads: a lit road along the far plain, one toward the storm.
    float road1 = abs(g.z-(9.0+3.0*sin(g.x*0.07+1.0)));
    float road2 = abs(g.x-(5.0+2.5*sin(g.z*0.09)));
    float roadMask = max(1.0-smoothstep(0.0,0.12+fwidth(g.z)*1.5,road1),1.0-smoothstep(0.0,0.12+fwidth(g.x)*1.5,road2))*step(1.5,g.z);
    float lights = lamp*(step(0.55,lh)*smoothstep(0.08,0.4,pool)+step(0.8,lh)*roadMask*0.6);
    float fade = smoothstep(4.0,10.0,dist);
    vec3 warm = mix(u_primary,u_secondary,0.2);
    // Far away the lamps fall below a pixel and merge into the town glow.
    float far = smoothstep(0.3,1.5,max(fwidth(lg).x,fwidth(lg).y));
    groundCol += warm*(pool*mix(0.06,0.3,far)+lights*2.2)*fade*near;
    // Return strokes light the plain in a pool around the strike point.
    float flashGround = broad*0.03;
    for (int k = 0; k < 2; ++k) {
      vec2 q = g.xz-stBottom[k].xz;
      flashGround += stSlot[k].x*groundStrike*2.0/(1.0+dot(q,q)*0.12);
    }
    groundCol += flashTint*flashGround*0.35*fields*near;
    // Lake from the camera to the far shore.
    water = near*(1.0-smoothstep(-0.25,0.25,g.z-stShore(g.x)));
    if (water > 0.0) {
      // Static ripple normals with a slow swell; energy raises the chop.
      vec2 wq = g.xz*vec2(0.7,2.6);
      vec4 n1 = stNoise(vec3(wq+0.8*vec2(cos(stPhase),sin(stPhase)),9.0));
      vec4 n2 = vec4(0,0.35*cos(wq.x*2.7+wq.y*0.6+stPhase),0.35*cos(wq.y*2.3-wq.x*0.4-stPhase),0);
      float chop = mix(0.004,0.022,level)*(1.0-smoothstep(10.0,40.0,dist)*0.6);
      vec2 slope = (n1.yz*0.75+n2.yz*0.25*2.7)*chop*vec2(0.7,2.6);
      waterN = normalize(vec3(-slope.x,1.0,-slope.y));
    }
    // Distance haze: the plain recedes into the horizon glow.
    groundCol = mix(groundCol,u_secondary*0.045+mix(u_primary,u_secondary,0.25)*0.01,1.0-exp(-dist/90.0));
    groundAll = groundCol;
  }
  vec3 lakeCol = vec3(0);
  vec3 r = reflect(rd,waterN);
  if (water > 0.0) {
    r.y = max(r.y,0.002);
    float fresnel = 0.02+0.98*pow(1.0-clamp(-rd.y,0.0,1.0),5.0);
    float v2 = 0.0;
    vec3 sky = stSkyLite(r);
    vec3 mq = stMoon;
    float glint = pow(max(dot(r,mq),0.0),900.0)*6.0+pow(max(dot(r,mq),0.0),120.0)*0.25;
    lakeCol = (sky+mix(u_secondary,vec3(1),0.8)*glint*(1.0-0.5*v2))*fresnel + u_secondary*0.003;
  }

  // Rain shafts below the convective cells: soft wind-bent shafts that
  // widen into a rain foot, lit by the moon, the towns and the discharges.
  float rainA = 0.0, rainT = 1e5;
  vec3 townCol = mix(u_primary,u_secondary,0.25)*0.05;
  vec3 rainL = vec3(0);
  float rainAmount = u_params[7]*mix(0.5,1.25,level)*stRise;
  float rise12 = stEye.y+12.0*rd.y/max(length(rd.xz),1e-3);
  if (rainAmount > 0.0 && rise12 < stBase*u_params[2]+0.5) {
#ifdef PRECOMPUTED
    vec3 shaftFlash = stData(133,0).xyz;
#else
    vec3 shaftFlash = vec3(stShaftFlash(0),stShaftFlash(1),stShaftFlash(2));
#endif
    float forward = mix(stHG(0.6,mu),stHG(0.0,mu),0.5);
    vec3 rainLight = moonTint*(0.012+0.25*forward)*0.35+townCol*0.5;
    float top = stBase*u_params[2];
    vec3 tangent = normalize(vec3(-rd.z,0.0,rd.x)+vec3(1e-5,0,0));
    for (int i = 0; i < 3; ++i) {
      int cell = i == 0 ? 1 : i == 1 ? 2 : 0;
      float w = i == 0 ? mix(0.6,1.0,stSuper) : i == 1 ? 0.5*stSuper : mix(0.2,0.55,stSuper);
      vec4 c = stCell[cell];
      float rr = stCellR[cell]*0.75*1.6;
      vec2 o = stEye.xz-c.xy;
      float a2 = dot(rd.xz,rd.xz), b2 = dot(o,rd.xz), c2 = dot(o,o)-rr*rr;
      float disc2 = b2*b2-a2*c2;
      if (disc2 <= 0.0 || a2 < 1e-6) continue;
      float s = sqrt(disc2);
      float t0 = max(0.0,(-b2-s)/a2), t1 = (-b2+s)/a2;
      float tm = 0.5*(t0+t1);
      vec3 pm = stEye+rd*tm;
      float vertical = smoothstep(-0.3,0.9,pm.y)*(1.0-smoothstep(top-2.0,top-0.2,pm.y));
      if (t1 <= 0.0 || vertical <= 0.0) continue;
      float closest = sqrt(max(0.0,c2-b2*b2/a2))/rr*1.6;
      // Wind bends the shaft and spreads the rain foot near the ground.
      float across = dot(pm,tangent)+0.6*sq(1.0-pm.y/top)*(0.6+level);
      float streak = 0.85+0.08*sin(across*17.0+float(i)*2.3)+0.07*sin(across*29.3+pm.y*0.6+sin(stPhase)*0.8);
      float foot = 1.0+0.6*(1.0-smoothstep(0.0,1.2,pm.y));
      float edge = 1.0-smoothstep(0.0,foot,closest);
      edge *= edge*edge;
      float alpha = 0.6*(1.0-exp(-(t1-t0)*edge*vertical*streak*rainAmount*w*0.14));
      float flash = broad*0.5+shaftFlash[i];
      rainL += (rainLight+flashTint*flash*0.35)*alpha*(1.0-rainA);
      rainA += alpha*(1.0-rainA);
      rainT = min(rainT,tm);
    }
  }
  float gw = horizon*(1.0-water);
  vec3 back = groundAll;
  if (trans > 0.004 && gw < 1.0) {
    float veil;
    vec3 sky = stSky(rd,stEye,broad,pixel,true,veil)+stMoonDisc(view,pixel,veil);
    sky += flashTint*broad*0.03*(0.4+0.6*exp(-max(rd.y,0.0)*3.0));
    back = mix(sky,groundAll,gw);
  }
  col = back*trans + cloud;

  // The storm in the lake: one lattice sample at the middle of the
  // reflected ray's chord through the storm (a soft, rippled silhouette
  // with its flash light), not a second march.
  float lakeTrans = 1.0;
  if (water > 0.0) {
    vec3 ri = sign(r+vec3(1e-8))/max(abs(r),vec3(1e-6));
    vec3 a0 = (lo-g)*ri, b0 = (hi-g)*ri;
    vec3 nn = min(a0,b0), ff = max(a0,b0);
    float t0 = max(0.0,max(nn.x,max(nn.y,nn.z))), t1 = min(ff.x,min(ff.y,ff.z));
    if (t1 > t0) {
      float len = min(t1-t0,40.0);
      vec4 o = stVolume(g+r*(t0+len*(0.35+0.3*stIGN(gl_FragCoord.xy))));
      float sigma = max(o.x,0.0);
      lakeTrans = exp(-sigma*len*0.5);
      vec3 S = moonTint*0.1*exp(-o.y)+skyLight*o.z*0.6+townLight*(1.0-o.z)*0.8+flashLight*o.w;
      float fresnel = 0.02+0.98*pow(1.0-clamp(-rd.y,0.0,1.0),5.0);
      lakeCol = lakeCol*lakeTrans+S*(1.0-lakeTrans)*fresnel;
    }
  }

  // Lightning channels: tile-culled seeded edges, occluded by the cloud in
  // front of them. Channels inside the cloud show only as scattered glow;
  // in clear air they are crisp, white-hot cores with an accent halo.
  uvec4 mask = uvec4(65535u), crawlerMask = uvec4(65535u);
#ifdef PRECOMPUTED
  if (shortSide >= 280.0 && all(lessThan(abs(view),vec2(2)))) {
    ivec2 tile = ivec2(floor((view + 2.0) * 8.0)) + ivec2(0,3);
    mask = uvec4(texelFetch(u_precomputed,tile,0));
    crawlerMask = uvec4(texelFetch(u_precomputed,tile+ivec2(32,0),0));
  }
#endif
  vec3 bolts = vec3(0);
  float width = clamp(pixel*2.2,0.0016,0.0075);
  float halo = min(width*9.0,0.04);
  vec3 haloTint = mix(ink,u_accent,0.45);
  // Tile-coherent: most tiles hold no active channel and skip the loop.
  if (any(notEqual(mask|crawlerMask,uvec4(0u))))
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
    float reach = max(width*9.0,halo);
    float support = reach+0.0018+len*0.3;
    vec2 edgeBox = max(min(endpoints.xy,endpoints.zw)-view,view-max(endpoints.xy,endpoints.zw));
    if (max(edgeBox.x,edgeBox.y)>support) continue;
    if (stSegmentDistanceSq(view,endpoints.xy,endpoints.zw)>sq(support)) continue;
    int local = i % 30;
    float d = stBoltDistance(view,endpoints.xy,endpoints.zw,int(stSlot[slot].w),local);
    if (d > reach) continue;
    vec4 a = stData(i,1), b = stData(i,2);
    float rank = local < 18 ? float(local)/18.0 : (4.0 + floor(float(local-18)/4.0)*4.0 + mod(float(local-18),4.0)) / 18.0;
    float grown = 1.0-smoothstep(stSlot[slot].z*1.02-0.04,stSlot[slot].z*1.02,rank);
    if (grown <= 0.0) continue;
    float branch = local < 18 ? 1.0 : u_params[4] * (0.5 + 0.5 * level);
    float taper = local<18 ? 1.0 : mix(0.72,0.3,mod(float(local-18),4.0)/3.0);
    vec2 ab = endpoints.zw-endpoints.xy;
    float s = clamp(dot(view-endpoints.xy,ab)/max(dot(ab,ab),1e-10),0.0,1.0);
    float occlusion = stTransAt(length(mix(a.xyz,b.xyz,s)-stEye));
    float clear = occlusion*occlusion*occlusion;
    float core = exp(-sq(d / (width*taper)));
    float glow = exp(-sq(d / (width * 4.0*taper)));
    // Windowed inside the candidate reach: no disc edge at the cut-off.
    float wide = exp(-sq(2.0*d / (halo*mix(0.6,1.0,taper))))*(1.0-smoothstep(0.6*reach,reach,d));
    vec3 light = ink*(core*7.0+glow*0.8)*clear + haloTint*wide*(0.35*occlusion+0.9*occlusion*(1.0-occlusion));
    bolts += light * a.w * branch * power * grown;
    }
  }
  // Attachment flash where a ground strike meets the plain.
  for (int k = 0; k < 2; ++k) {
    float power = stSlot[k].x*groundStrike;
    if (power <= 0.002 || stSlot[k].z < 0.98) continue;
    vec3 q = stBottom[k]-stEye;
    float qz = dot(q,stF);
    if (qz < 0.5) continue;
    vec2 pv = vec2(dot(q,stR),dot(q,stU))/qz;
    vec2 dv = view-pv;
    float dd = dot(dv,dv);
    bolts += mix(ink,u_accent,0.35)*power*(exp(-dd/sq(width*3.0))*3.0+exp(-dd/sq(halo*0.8))*0.35);
  }
  // Mirrored channels in the lake (exact mirrored projections, rippled).
  if (water > 0.0) {
    vec2 rv = view+vec2(waterN.x,-waterN.z)*0.35;
    uvec4 mmask = uvec4(65535u);
#ifdef PRECOMPUTED
    if (shortSide >= 280.0 && all(lessThan(abs(rv),vec2(2)))) {
      ivec2 tile = ivec2(floor((rv + 2.0) * 8.0)) + ivec2(64,3);
      mmask = uvec4(texelFetch(u_precomputed,tile,0));
    }
#endif
    vec3 mirror = vec3(0);
    float mwidth = width*1.6;
    if (any(notEqual(mmask,uvec4(0u))))
    for (int channel = 0; channel < 4; ++channel) {
      uint bits = channel==0 ? mmask.x : channel==1 ? mmask.y : channel==2 ? mmask.z : mmask.w;
      for (int bit = 0; bit < 16; ++bit) {
        if (bits == 0u) break;
        bool present = (bits & 1u) != 0u; bits >>= 1u;
        int i = channel*16+bit;
        if (!present || i >= 60) continue;
        int slot = i/30;
        float power = stSlot[slot].x*groundStrike;
        if (power <= 0.002) continue;
        vec4 e = stMirror(i);
        float len = length(e.zw-e.xy);
        if (stSegmentDistanceSq(rv,e.xy,e.zw) > sq(halo+0.0018+len*0.3)) continue;
        int local = i % 30;
        float d = stBoltDistance(rv,e.xy,e.zw,int(stSlot[slot].w),local);
        if (d > halo) continue;
        vec4 a = stData(i,1), b = stData(i,2);
        float rank = local < 18 ? float(local)/18.0 : (4.0 + floor(float(local-18)/4.0)*4.0 + mod(float(local-18),4.0)) / 18.0;
        float grown = 1.0-smoothstep(stSlot[slot].z*1.02-0.04,stSlot[slot].z*1.02,rank);
        float ab2 = clamp(dot(rv-e.xy,e.zw-e.xy)/max(dot(e.zw-e.xy,e.zw-e.xy),1e-10),0.0,1.0);
        float hy = mix(a.y,b.y,ab2)/u_params[2];
        float below = 1.0-smoothstep(stBase-0.6,stBase+0.6,hy);
        float branch = local < 18 ? 1.0 : u_params[4] * (0.5 + 0.5 * level);
        mirror += (ink*exp(-sq(d/mwidth))*3.0+haloTint*exp(-sq(2.0*d/halo))*(1.0-smoothstep(0.6*halo,halo,d))*0.4)*a.w*branch*power*grown*below;
      }
    }
    lakeCol += mirror*0.75;
  }
  col = mix(col,lakeCol,water);
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
    "A moonlit bank flickering with heat lightning grows into towering cumulonimbus and a supercell with a streaming anvil over a dark lake. Every discharge lights the cloud from inside; strikes fall from the anvil to the shore and flash again in the water.",
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
  if (row == 33 && x >= 124 && x < 184) { outColor = stMirrorDatum(x-124); return; }
  if (x >= 124 && x < 964 && row < 33) {
    ivec3 q = ivec3((x-124)%30-1,row-4,(x-124)/30);
    outColor = stBillowCore(mod(vec3(q),28.0)*0.25,7.0);
    return;
  }
  if (x >= 96 || row > 34) { outColor = vec4(0); return; }
  vec2 lo = vec2(float(x%32),float(row - 3)) / 8.0 - 2.0, hi = lo + 0.125;
  uvec4 bits = uvec4(0u);
  bool mirrored = x >= 64;
  for (int i = 0; i < 60; ++i) {
    int e = mirrored ? i : i+(x/32)*60;
    // Inactive discharges and unselected branches never enter a tile mask.
    if (stSlot[e/30].x <= 0.002 || stDatum(e,1).w <= 0.0) continue;
    vec4 p = mirrored ? stMirrorDatum(e) : stDatum(e,0);
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
