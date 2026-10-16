// Exact per-frame geometry data, shared by the optional float cache and the
// uncached path. No cached colour, no stochastic temporal sampling.
//
// Four discharge slots: 0 stepped return (rhythm z), 1 autonomous storm life
// (beat grid, energy-driven), 2 crawler (rhythm y), 3 buried discharge
// (rhythm x). Each event picks a seeded tree shape and a seeded site from
// (seed, slot, event index); development only moves the endpoints smoothly.
export const stormData = `
float stRise, stSuper, stPhase, stCamera, stFocal;
vec3 stEye, stF, stR, stU, stMoon, stLight;
// x local brightness (stroke + restrikes), y broad flash (return stroke only),
// z leader progress 0..1, w tree identity used by stRand.
vec4 stSlot[4];
vec3 stTop[4], stBottom[4], stSide[4], stDepth[4];
const float stTau = 6.28318530718;
uint stHash(uint x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16;
  return x;
}
float stRand(int network, int n) {
  return float(stHash(u_seedBits ^ (uint(network + 1) * 0x9e3779b9u) ^ (uint(n + 1) * 0x85ebca6bu)) >> 8) / 16777216.0;
}
// Cell layout: Haze bank -> separated towers -> supercell with flanking line.
const float stHX[5] = float[5](-17.0,-8.5,0.0,8.5,17.0);
// Haze: a low bank with a few towers rising out of it.
const float stHT[5] = float[5](0.0,3.0,1.6,3.4,0.4);
const float stTX[5] = float[5](-13.0,-6.2,0.3,6.6,13.0);
const float stTT[5] = float[5](5.6,10.4,12.0,9.6,5.2);
const float stTR[5] = float[5](3.0,2.4,2.7,2.3,2.8);
const float stSX[5] = float[5](-12.5,-6.0,0.0,5.8,10.6);
const float stSZ[5] = float[5](11.0,11.5,6.5,8.6,10.5);
const float stST[5] = float[5](4.4,7.6,11.6,8.4,6.0);
const float stSR[5] = float[5](2.4,3.4,5.6,2.8,2.2);
// x, z, base, top of each convective cell; radius separately.
vec4 stCell[5];
float stCellR[5];
float stBase;
void stCells() {
  stBase = mix(mix(1.4,2.6,stRise),4.4,stSuper);
  for (int i = 0; i < 5; ++i) {
    float j0 = stRand(7,i*4)-0.5, j1 = stRand(7,i*4+1)-0.5;
    float j2 = stRand(7,i*4+2)-0.5, j3 = stRand(7,i*4+3);
    vec4 haze = vec4(stHX[i]+j0*2.5, 15.0+j1*4.0, 1.4, 4.4+j3*2.2+stHT[i]);
    vec4 tower = vec4(stTX[i]+j0*1.2, 11.0+j1*3.0, 2.6, stTT[i]+1.0+j3*1.2);
    vec4 super = vec4(stSX[i]+j0*0.8, stSZ[i]+j1*1.5, 4.4, stST[i]+2.0+j3*0.8);
    stCell[i] = mix(mix(haze,tower,stRise),super,stSuper);
    stCellR[i] = mix(mix(5.4+j2*2.2,stTR[i]+j2*0.6,stRise),stSR[i]+j2*0.4,stSuper);
  }
}
// Normalised event time u in (0,1): stepped leader, one return stroke, up to
// two local restrikes and a short afterglow. Only the return stroke feeds the
// broad sky/ground term (one broad pulse per event, never a strobe).
vec3 stStroke(float u, float restrikes, float crawl, float ic, int id, int slot) {
  if (u <= 0.0 || u >= 1.0) return vec3(0);
  float progress = crawl > 0.5 ? smoothstep(0.0,0.45,u) : smoothstep(0.0,0.05,u);
  float leader = 0.1*(1.0-smoothstep(0.045,0.065,u));
  float strike = smoothstep(0.035,0.05,u)*exp(-max(0.0,u-0.05)*14.0);
  float re = 0.0;
  if (restrikes > 0.5) re += 0.7*exp(-sq((u-0.17)/0.018));
  if (restrikes > 1.5) re += 0.5*exp(-sq((u-0.29)/0.018));
  float glow = 0.18*(1.0-smoothstep(0.25,0.75,u));
  float cg = leader+strike+re+glow;
  // Intra-cloud discharges flicker: three overlapping seeded pulses on a
  // sustained glow (modulation, not on/off), one broad pulse at most.
  float env = smoothstep(0.0,0.04,u)*(1.0-smoothstep(0.45,0.95,u));
  float pulses = 0.0;
  for (int j = 0; j < 3; ++j) {
    float at = 0.04+0.5*stRand(110+slot*3+j,id);
    pulses += mix(0.5,1.0,stRand(120+slot*3+j,id))*exp(-sq((u-at)/0.06));
  }
  float flicker = env*(0.4+0.6*min(pulses,1.3));
  if (crawl > 0.5) return vec3(flicker*0.85, 0.0, progress);
  return vec3(mix(cg,flicker,ic), mix(strike,0.35*strike,ic), progress);
}
// Inverse of the rhythm envelope's smoothstep decay: normalised elapsed time.
float stEnvelopeTime(float value, float nominal) {
  float y = clamp(value/nominal,0.0,1.0);
  if (y <= 0.0) return 1.0;
  float d = 0.5 - sin(asin(1.0-2.0*y)/3.0);
  return max(1.0-d,0.002);
}
// One event: tree identity and site from (seed, slot, event index).
void stEvent(int slot, float index, float u, float gain) {
  int id = int(mod(index,4096.0));
  float shape = floor(stRand(40+slot,id)*12.0);
  float restrikes = floor(stRand(50+slot,id)*3.0);
  float ic = slot >= 2 ? 1.0 : 1.0-smoothstep(1.15,1.75,u_params[0]);
  vec3 s = stStroke(u,restrikes,slot==2 ? 1.0 : 0.0,ic,id,slot);
  stSlot[slot] = vec4(s.x*gain, s.y*gain, s.z, float(slot*16)+shape);
  // Site: a seeded convective cell, weighted toward the active towers.
  float pick = stRand(60+slot,id);
  int cell = pick < 0.4 ? 2 : pick < 0.6 ? 1 : pick < 0.8 ? 3 : pick < 0.9 ? 0 : 4;
  vec4 c = stCell[cell];
  float rad = stCellR[cell];
  float a = stRand(70+slot,id)*stTau, ra = sqrt(stRand(80+slot,id))*0.55;
  vec2 off = vec2(cos(a),sin(a))*ra*rad;
  float top = c.w-c.z;
  vec3 root = vec3(c.x+off.x, c.z+top*mix(0.55,0.45,stSuper), c.y+off.y);
  float lean = (stRand(90+slot,id)-0.5)*3.0;
  if (slot <= 1) {
    // Intra-cloud / cloud-to-cloud leaders in Haze and Towers turn into
    // cloud-to-ground strikes as the supercell forms.
    int other = cell==4 ? 3 : cell+1;
    vec3 inCloud = vec3(mix(c.x,stCell[other].x,0.8), c.z+top*0.3, mix(c.y,stCell[other].y,0.8));
    if (slot == 0) {
      // The hero return stroke leaves the forward anvil: a long bolt in
      // front of the storm ("bolt from the anvil"), never at a fixed spot.
      vec4 m = stCell[2];
      float side = (stRand(91,id)-0.5)*2.0;
      vec3 anvilRoot = vec3(-3.0+side*(side > 0.0 ? 5.0 : 10.0), m.w*0.9-0.4, 7.0-mix(1.5,4.5,stRand(92,id)));
      root = mix(root,anvilRoot,stSuper);
    }
    vec3 ground = vec3(root.x+lean, 0.0, root.z+lean*0.4-1.5*stSuper);
    stTop[slot] = root;
    stBottom[slot] = mix(inCloud,ground,smoothstep(1.15,1.75,u_params[0]));
  } else if (slot == 2) {
    // Crawler: buried cloud-to-cloud inside the bank and towers, then
    // one-sided spider lightning across the anvil underside (a seeded
    // chord, never mirrored, never leaving the anvil).
    int other = cell==4 ? 3 : cell+1;
    vec3 a0 = vec3(c.x, c.z+top*0.45, c.y);
    vec3 b0 = vec3(stCell[other].x, stCell[other].z+(stCell[other].w-stCell[other].z)*0.45, stCell[other].y);
    vec4 m = stCell[2];
    vec3 centre = vec3(mix(m.x,-3.0,stSuper), m.w*0.9-1.5, mix(m.y,7.0,stSuper));
    float dir = stRand(100,id)*stTau, turn = (stRand(101,id)-0.5)*1.6;
    vec3 a1 = centre+vec3(cos(dir)*(cos(dir) > 0.0 ? 7.5 : 13.0),0.0,sin(dir)*6.0);
    vec3 b1 = centre+vec3(cos(dir+3.1416+turn)*9.0,-0.5,sin(dir+3.1416+turn)*4.5);
    stTop[slot] = mix(a0,a1,stSuper);
    stBottom[slot] = mix(b0,b1,stSuper);
  } else {
    stTop[slot] = vec3(c.x+off.x, c.z+top*0.7, c.y+off.y);
    stBottom[slot] = vec3(c.x-off.x*0.6+lean, c.z+top*0.25, c.y-off.y*0.6);
  }
  vec3 axis = stBottom[slot]-stTop[slot];
  vec3 side = cross(axis,slot==2 ? vec3(0,1,0) : vec3(0,0,1));
  side = dot(side,side) > 1e-6 ? normalize(side) : vec3(1,0,0);
  vec3 depth = normalize(cross(side,axis+vec3(0,1e-4,0)));
  if (slot <= 1) {
    // Horizontal jitter only: the trunk ends exactly on the ground.
    side = normalize(vec3(side.x,0.0,side.z)+vec3(1e-4,0,0));
    depth = normalize(vec3(depth.x,0.0,depth.z)+vec3(0,0,1e-4));
  }
  stSide[slot] = side;
  stDepth[slot] = depth;
}
void stEvents() {
  float level = clamp(u_level,0.0,1.0);
  // 0: stepped return, rhythm z; between its events, at high energy, the
  // slot carries autonomous anvil strikes on a two-beat grid (multi-strike
  // bars in the supercell). 2: crawler, rhythm y; 3: buried, rhythm x.
  float u0 = stEnvelopeTime(u_rhythm.z,0.65);
  if (u0 >= 1.0) {
    float k0 = floor(u_beat*0.5);
    int id0 = int(mod(k0,4096.0));
    float start0 = k0*2.0+0.5+0.5*stRand(34,id0);
    float chance0 = stSuper*clamp((level-0.3)/0.6,0.0,1.0)*0.8;
    float on0 = stRand(35,id0) < chance0 ? 1.0 : 0.0;
    stEvent(0, 2048.0+mod(k0,2048.0), on0 > 0.5 ? (u_beat-start0)/1.4 : 1.0, 0.85);
  } else stEvent(0, u_rhythmCount.z, u0, 1.0);
  stEvent(2, u_rhythmCount.y, stEnvelopeTime(u_rhythm.y,0.6), 1.0);
  // 3: the buried rhythm discharge; between its events the slot carries
  // autonomous intra-cloud flicker on a one-beat grid (energy sets the rate).
  float u3 = stEnvelopeTime(u_rhythm.x,0.6);
  if (u3 >= 1.0) {
    float k3 = floor(u_beat);
    int id3 = int(mod(k3,4096.0));
    float on = stRand(33,id3) < mix(0.15,0.6,clamp(u_level,0.0,1.0)) ? 1.0 : 0.0;
    stEvent(3, 2048.0+mod(k3,2048.0), on > 0.5 ? (u_beat-k3)*0.9 : 1.0, 0.7);
  } else stEvent(3, u_rhythmCount.x, u3, 0.9);
  // 1: autonomous storm life on a one-beat grid; energy sets the rate
  // (rare strikes at 0.1, nearly every beat at 0.9 in the supercell).
  float k = floor(u_beat);
  int id = int(mod(k,4096.0));
  float start = k + 0.25*stRand(30,id);
  float chance = mix(mix(0.22,0.55,level),mix(0.08,0.85,level),stRise);
  float fires = stRand(31,id) < chance ? 1.0 : 0.0;
  stEvent(1, k, fires > 0.5 ? (u_beat-start)/1.3 : 1.0, mix(0.75,1.0,stRand(32,id)));
}
void stCameraSetup() {
  stRise = smoothstep(0.0, 1.0, u_params[0]);
  stSuper = smoothstep(1.0, 2.0, u_params[0]);
#ifdef PHOSPHOR_LATE
  stPhase = u_clock[0]; stCamera = u_clock[1];
#else
  stPhase = u_time * u_params[1] * 0.16;
  stCamera = u_time * u_params[6] * 0.035;
#endif
  // The storm grows toward and over the camera; the camera itself moves
  // only moderately so a one-bar drop never lurches. At the top state it
  // sits low and looks up: anvil overhead, room for strikes below the base.
  float grow = 0.55*stRise+0.45*stSuper;
  // Overlook: low and close (0) to high and far (1).
  float eye = u_params[5]-0.45;
  float z = mix(-21.0,-14.0,grow)-eye*7.0;
  float y = mix(1.5,0.6,grow)+eye*(eye < 0.0 ? 0.8 : 1.4);
  float ty = mix(3.0,mix(4.8,8.4,stSuper),stRise)*u_params[2];
  float tz = mix(14.0,8.0,grow);
  stEye = vec3(2.2*sin(stCamera), y+0.08*sin(2.0*stCamera), z+0.6*cos(stCamera));
  vec3 target = vec3(0.6*sin(stCamera), ty, tz);
  stF = normalize(target - stEye);
  stR = normalize(cross(stF, vec3(0,1,0))); stU = cross(stR, stF);
  stFocal = mix(mix(2.2,2.25,stRise),1.6,stSuper);
  // The moon is placed in the view of the orbit-free camera, so it stays
  // in frame in every state: above the bank, low between the towers, at
  // the downstream anvil edge of the supercell (side-back light, silver
  // linings). A smooth function of development only.
  vec3 e0 = vec3(0.0,y,z), f0 = normalize(vec3(0.0,ty,tz)-e0);
  vec3 r0 = normalize(cross(f0,vec3(0,1,0))), u0 = cross(r0,f0);
  vec2 m = mix(mix(vec2(0.82,0.6),vec2(0.92,0.46),stRise),vec2(1.02,0.6),stSuper);
  stMoon = normalize(f0*stFocal+r0*m.x+u0*m.y);
  // Transport light comes from slightly beyond the disc: more side light
  // on the camera-facing flanks, silver linings toward the moon.
  stLight = normalize(stMoon+0.45*r0+0.1*u0);
}
void stSetup() { stCameraSetup(); stCells(); stEvents(); }
// Light reaching each rain shaft (under cells 1, 2, 0) from the discharges,
// evaluated once per frame at mid-shaft height.
float stShaftFlash(int i) {
  int cell = i == 0 ? 1 : i == 1 ? 2 : 0;
  vec3 p = vec3(stCell[cell].x, 0.5*stBase, stCell[cell].y);
  float flash = 0.0;
  for (int k = 0; k < 4; ++k) {
    vec3 a = stTop[k], b = mix(stTop[k],stBottom[k],stSlot[k].z), v = b-a;
    vec3 q = p-a-v*clamp(dot(p-a,v)/max(dot(v,v),1e-4),0.0,1.0);
    flash += stSlot[k].x*1.2/(1.0+dot(q,q)*0.025);
  }
  return flash;
}
// Per-frame storm state packed into data rows 0-2, x 120-133, so the visual
// pass reads it instead of re-deriving ~70 hashes per output pixel.
vec4 stState(int i, int row) {
  if (i < 124) { int k = i-120; return row == 0 ? stSlot[k] : row == 1 ? vec4(stTop[k],0) : vec4(stBottom[k],0); }
  if (i < 128) { int k = i-124; return row == 0 ? vec4(stSide[k],0) : row == 1 ? vec4(stDepth[k],0) : vec4(0); }
  if (i < 133) { int k = i-128; return row == 0 ? stCell[k] : row == 1 ? vec4(stCellR[k],stBase,0,0) : vec4(0); }
  if (i == 133 && row == 0) return vec4(stShaftFlash(0),stShaftFlash(1),stShaftFlash(2),0);
  return vec4(0);
}
vec2 stProject(vec3 p) {
  vec3 q = p - stEye;
  return vec2(dot(q, stR), dot(q, stU)) / max(dot(q, stF), 0.1);
}
vec3 stLeader(int network, int n) {
  return vec3((stRand(network,n*3)-stRand(network,0))*0.16, float(n)/18.0,
    (stRand(network,n*3+1)-stRand(network,1))*0.12);
}
vec3 stBranch(int network, int branch, int n) {
  vec3 p = stLeader(network, 4 + branch * 4);
  float side = stRand(network, 90 + branch) < 0.5 ? -1.0 : 1.0;
  return p + vec3(side * float(n)*0.12 + (stRand(network,110+branch*8+n)-stRand(network,110+branch*8))*0.13,
    float(n)*0.045 + (stRand(network,150+branch*8+n)-stRand(network,150+branch*8))*0.05,
    (stRand(network,190+branch*8+n)-stRand(network,190+branch*8))*0.1);
}
// Normalised leader coordinates (lateral, along, depth) to world space.
vec3 stWorld(vec3 p, int slot) {
  vec3 axis = stBottom[slot]-stTop[slot];
  float len = length(axis);
  vec3 q = stTop[slot]+axis*p.y+stSide[slot]*p.x*len*1.1+stDepth[slot]*p.z*len*0.8;
  q.y *= u_params[2];
  return q;
}
void stSegment(int i, out vec3 a, out vec3 b, out float weight) {
  int slot = i / 30, local = i % 30;
  int network = int(stSlot[slot].w);
  if (local < 18) {
    a = stLeader(network, local); b = stLeader(network, local + 1); weight = 1.0;
  } else {
    int branch = (local - 18) / 4, stepIndex = (local - 18) % 4;
    a = stBranch(network, branch, stepIndex); b = stBranch(network, branch, stepIndex + 1);
    weight = stRand(network, 70 + branch) < 0.78 ? 0.52 : 0.0;
  }
  a = stWorld(a, slot); b = stWorld(b, slot);
}
vec4 stDatum(int i, int row) {
  if (i >= 120) return stState(i,row);
  vec3 a, b; float weight; stSegment(i, a, b, weight);
  if (row == 0) return vec4(stProject(a), stProject(b));
  if (row == 1) return vec4(a, weight);
  return vec4(b, weight);
}
// Exact projections of each channel mirrored in the lake plane y = 0.
vec4 stMirrorDatum(int i) {
  vec3 a, b; float weight; stSegment(i, a, b, weight);
  a.y = -a.y; b.y = -b.y;
  return vec4(stProject(a), stProject(b));
}
`;
