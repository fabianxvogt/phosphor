// Camera-independent 3D density and optical coefficients, not a colour image.
// The atlas caches these scalars; the fallback evaluates the same lattice.
export const stormVolume = `
vec4 stHash4(vec4 n) {
  n = fract(n * 0.1031); n *= n + 33.33; n *= n + n;
  return fract(n);
}
vec4 stNoise(vec3 p) {
  vec3 cell = floor(p), raw = fract(p);
  vec3 df = 6.0 * raw * (1.0 - raw), f = raw * raw * (3.0 - 2.0 * raw);
  vec3 base = cell + float(u_seedBits % 117u) * 0.17;
  vec4 n = vec4(dot(base, vec3(1,57,113))) + vec4(0,1,57,58);
  vec4 a = stHash4(n), b = stHash4(n + 113.0);
  vec4 c = mix(a, b, f.z);
  float value = mix(mix(c.x, c.y, f.x), mix(c.z, c.w, f.x), f.y);
  vec4 dz = b - a;
  vec3 grad = vec3(mix(c.y-c.x,c.w-c.z,f.y),mix(c.z-c.x,c.w-c.y,f.x),mix(mix(dz.x,dz.y,f.x),mix(dz.z,dz.w,f.x),f.y)) * df;
  return vec4(value,grad);
}
// A jittered 3D cellular lobe, with its analytic gradient. Neighbourhood
// search retains all 27 cells; no axis-aligned eight-corner approximation.
vec4 stBillowCore(vec3 p, float period) {
  vec3 cell = floor(p), f = fract(p);
  float best = 3.0;
  vec3 delta = vec3(0);
  for (int z = -1; z <= 1; ++z) for (int y = -1; y <= 1; ++y) for (int x = -1; x <= 1; ++x) {
    vec3 corner = vec3(x,y,z);
    vec3 c = cell+corner;
    if (period > 0.0) c = mod(c,period);
    ivec3 key = ivec3(c);
    uint hcell = stHash(u_seedBits ^ uint(key.x)*0x9e3779b9u ^ uint(key.y)*0x85ebca6bu ^ uint(key.z)*0xc2b2ae35u);
    vec3 feature = vec3(uvec3(hcell,hcell>>10,hcell>>20)&uvec3(1023u))/1024.0;
    vec3 q = f-corner-feature;
    float d = dot(q,q);
    // A rounded union, not a hard Voronoi winner: continuous gradients
    // prevent faceted cloud ridges and compiler-sensitive nearest-cell ties.
    float h = clamp(0.5+0.5*(best-d)/0.12,0.0,1.0);
    best = mix(best,d,h)-0.12*h*(1.0-h);
    delta = mix(delta,q,h);
  }
  // Finite core radius regularises the distance gradient, including rare
  // nearly coincident features; no near-zero derivative cutoff can pop.
  float d = sqrt(max(best+0.03,0.005));
  vec3 gradient = -delta/(1.1*d);
  return vec4(1.0-d/1.1,gradient);
}
vec4 stBillow(vec3 p) { return stBillowCore(p,0.0); }
// Periodic analytic microstructure occupies unused topology-atlas columns.
// Each 28² slice has a one-node wrap gutter, so filtering cannot leak slices.
vec4 stDetailNode(ivec3 q) {
  q = ivec3(mod(vec3(q),28.0));
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed,ivec2(125+q.z*30+q.x,4+q.y),0);
#else
  return stBillowCore(vec3(q)*0.25,7.0);
#endif
}
vec4 stDetail(vec3 p) {
  vec3 q = mod(p,7.0)*4.0;
  ivec3 a = ivec3(floor(q)); vec3 f = fract(q);
#ifdef PRECOMPUTED_LINEAR
  vec2 xy = vec2(125.5,4.5)+q.xy;
  vec2 uv0 = (xy+vec2(float(a.z)*30.0,0))/vec2(1024,515);
  vec2 uv1 = (xy+vec2(float((a.z+1)%28)*30.0,0))/vec2(1024,515);
  return mix(texture(u_precomputed,uv0),texture(u_precomputed,uv1),f.z);
#else
  return mix(mix(mix(stDetailNode(a),stDetailNode(a+ivec3(1,0,0)),f.x),
                 mix(stDetailNode(a+ivec3(0,1,0)),stDetailNode(a+ivec3(1,1,0)),f.x),f.y),
             mix(mix(stDetailNode(a+ivec3(0,0,1)),stDetailNode(a+ivec3(1,0,1)),f.x),
                 mix(stDetailNode(a+ivec3(0,1,1)),stDetailNode(a+ivec3(1,1,1)),f.x),f.y),f.z);
#endif
}
vec3 stCentres[5], stInverse[5];
vec3 stPuffs[9], stPuffInverse[9];
float stScale[5], stPuffScale[9];
mat2 stRotation;
void stCloudSetup() {
  vec3 centres[5]; vec3 radii[5];
  centres[0] = vec3(0, mix(3.7,6.0,stRise), 5.8);
  radii[0] = mix(vec3(8.5,2.5,3.7), mix(vec3(3.8,4.0,3.8),vec3(13.0,3.9,6.0),stSuper), stRise);
  centres[1] = vec3(mix(-12.5,-5.2,stRise), mix(4.1,6.6,stRise), 6.8);
  radii[1] = mix(vec3(6.4,3.1,3.0), vec3(3.1,4.8,3.1), stRise);
  centres[2] = vec3(mix(11.5,4.8,stRise), mix(4.6,7.8,stRise), 7.0);
  radii[2] = mix(vec3(7.2,3.6,3.1), vec3(3.0,5.0,3.4), stRise);
  centres[3] = vec3(-1.2, mix(3.8,11.1,stRise), 6.8);
  radii[3] = vec3(mix(3.0,22.0,stSuper), mix(0.75,1.8,stRise), mix(2.0,5.0,stSuper));
  centres[4] = vec3(0.0, mix(2.5,3.6,stSuper), 2.4);
  radii[4] = vec3(mix(0.4,6.5,stSuper), mix(0.3,1.8,stSuper), mix(0.4,4.8,stSuper));
  for (int j = 0; j < 5; ++j) {
    stCentres[j] = centres[j]; stInverse[j] = 1.0/radii[j];
    stScale[j] = 0.5*min(radii[j].x,radii[j].y);
  }
  for (int j = 0; j < 9; ++j) {
    int parent = j<6 ? j : (j-6)*2;
    float x = -6.6+float(parent)*2.65;
    float y = 8.7+1.1*stRand(2,parent+220)+1.2*sin(float(parent)*0.8);
    float radius = mix(1.1,1.25+stRand(3,parent+240)*0.6,stRise);
    vec3 centre = vec3(x*mix(2.5,mix(1.0,2.0,stSuper),stRise),mix(5.0+stRand(1,parent+250)*1.8,y,stRise)-stSuper*0.5,4.7);
    if (j>=6) {
      centre += vec3((stRand(0,j+290)-0.5)*2.0,0.75,-1.1)*stRise;
      radius *= 0.55;
      float a = float(parent)*1.0471975512;
      vec3 scud = vec3(cos(a)*4.2,2.6+0.25*sin(a*2.0),2.4+sin(a)*2.8);
      centre = mix(centre,scud,stSuper);
      radius = mix(radius,0.7+0.2*stRand(1,j+330),stSuper);
    }
    stPuffs[j] = centre;
    vec3 r = vec3(radius*mix(1.0,1.7,stSuper),radius*mix(1.0,0.65,stSuper),radius);
    stPuffInverse[j] = 1.0/r; stPuffScale[j] = r.y*0.5;
  }
  stRotation = rot2(stPhase);
}
float stShape(vec3 p, out vec3 normal) {
  p.y /= u_params[2];
  float field = -100.0; normal = vec3(0,1,0);
  for (int j = 0; j < 5; ++j) {
    vec3 offset = p-stCentres[j];
    if (j==4) offset.xz = stRotation*offset.xz;
    vec3 q = offset*stInverse[j];
    float v = (1.0-dot(q,q))*stScale[j];
    float blend = clamp(0.5 + 0.5 * (v - field) / 0.7,0.0,1.0);
    field = mix(field,v,blend) + 0.7 * blend * (1.0 - blend);
    vec3 gradient = 2.0*q*stInverse[j]*stScale[j];
    if (j==4) gradient.xz = transpose(stRotation)*gradient.xz;
    normal = mix(normal,gradient,blend);
  }
  for (int j = 0; j < 9; ++j) {
    vec3 q = (p-stPuffs[j])*stPuffInverse[j];
    float v = (1.0-dot(q,q))*stPuffScale[j];
    float blend = clamp(0.5+0.5*(v-field)/0.45,0.0,1.0);
    field = mix(field,v,blend)+0.45*blend*(1.0-blend);
    normal = mix(normal,2.0*q*stPuffInverse[j]*stPuffScale[j],blend);
  }
  normal.y /= u_params[2];
  return field;
}
float stDensity(vec3 p, out vec3 normal) {
  float shape = stShape(p,normal);
  if (shape < -1.5) return 0.0;
  vec3 adv = p * 0.73 + vec3(0.35 * sin(stPhase),0.14 * cos(stPhase),0.25 * cos(stPhase));
  float twist = stSuper * p.y * 0.12;
  adv.xz = stRotation * vec2(adv.x + twist*adv.z,adv.z-twist*adv.x) * inversesqrt(1.0+twist*twist);
  // Broad rounded billows at the top, smaller crisp lobes around their crowns.
  vec4 coarse = stNoise(adv);
  vec3 warp = coarse.yzw*0.32;
  vec4 medium = stBillow(adv*1.45+warp);
  vec4 fine = stNoise(adv*5.8+warp);
  float billow = coarse.x*0.5 + medium.x*0.36 + fine.x*0.14;
  float radius = length(p.xz - vec2(0,3.5));
  float angle = atan(p.z-3.5,p.x+0.00001);
  float shelf = sin(radius*0.8 + p.y*2.7 + 2.0*angle - stPhase*2.0);
  float base = 1.0-smoothstep(4.0,7.0,p.y/u_params[2]);
  billow += 0.3*stSuper*shelf*base;
  float sculpt = mix(1.9,1.1,base);
  vec3 bump = (coarse.yzw*0.5+medium.yzw*0.522+fine.yzw*0.812)*0.73*sculpt;
  bump.xz = transpose(stRotation)*bump.xz;
  normal = normalize(normal-bump*0.8+vec3(0,0.00001,0));
  float floorHeight = mix(1.8,3.0,stRise)-stSuper*1.2*exp(-sq(radius/4.5));
  floorHeight += stSuper*0.16*sin(radius*3.0+angle*3.0-stPhase*2.0);
  float flatBase = smoothstep(floorHeight-0.18,floorHeight+0.35,p.y/u_params[2]);
  return max(0.0,shape+(billow-0.46)*sculpt-0.08)*u_params[3]*5.0*flatBase;
}
float stDensity(vec3 p) { vec3 n; return stDensity(p,n); }
vec4 stOptical(vec3 p) {
  vec3 normal;
  float density = stDensity(p,normal);
  if (density <= 0.0) return vec4(0);
  vec3 moonLight = normalize(vec3(-0.75,0.9,-0.45));
  // Bounded quadrature of optical depth, evaluated once per volume lattice.
  float tau = density*0.35 + stDensity(p+moonLight*1.5)*2.5;
  float moon = exp(-tau*0.7)*pow(max(0.0,dot(normal,moonLight)),1.5)*smoothstep(0.05,0.5,normal.y);
  // Visible front hemisphere: storing x/y avoids octahedral seams when
  // normals are trilinearly interpolated. The visual pass reconstructs -z.
  return vec4(density,moon,normal.xy);
}
const vec3 stVolumeLo = vec3(-24.0,0.4,-3.0);
const vec3 stVolumeSize = vec3(48.0,16.4,16.0);
const vec3 stGrid = vec3(128,80,48);
// The first 35 atlas rows remain exact lightning topology and tile masks.
ivec2 stVoxelAddress(ivec3 p) {
  return ivec2((p.z%8)*128+p.x,35+(p.z/8)*80+p.y);
}
vec4 stVoxel(ivec3 p) {
  p = clamp(p,ivec3(0),ivec3(stGrid)-1);
#ifdef PRECOMPUTED
  return texelFetch(u_precomputed,stVoxelAddress(p),0);
#else
  return stOptical(stVolumeLo+(vec3(p)+0.5)/stGrid*stVolumeSize);
#endif
}
vec4 stVolume(vec3 p) {
  vec3 q = clamp((p-stVolumeLo)/stVolumeSize*stGrid-0.5,vec3(0),stGrid-1.001);
  ivec3 a = ivec3(floor(q)); vec3 f = fract(q);
#ifdef PRECOMPUTED_LINEAR
  vec2 xy = clamp(q.xy,vec2(0),stGrid.xy-1.0)+0.5;
  vec2 uv0 = (vec2((a.z%8)*128,35+(a.z/8)*80)+xy)/vec2(1024,515);
  int z1 = min(a.z+1,47);
  vec2 uv1 = (vec2((z1%8)*128,35+(z1/8)*80)+xy)/vec2(1024,515);
  return mix(texture(u_precomputed,uv0),texture(u_precomputed,uv1),f.z);
#else
  return mix(mix(mix(stVoxel(a),stVoxel(a+ivec3(1,0,0)),f.x),
                 mix(stVoxel(a+ivec3(0,1,0)),stVoxel(a+ivec3(1,1,0)),f.x),f.y),
             mix(mix(stVoxel(a+ivec3(0,0,1)),stVoxel(a+ivec3(1,0,1)),f.x),
                 mix(stVoxel(a+ivec3(0,1,1)),stVoxel(a+ivec3(1,1,1)),f.x),f.y),f.z);
#endif
}
`;
