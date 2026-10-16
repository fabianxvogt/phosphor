// Camera-independent 3D optical field, not a colour image. Each lattice node
// stores extinction (or, outside the cloud, a negative conservative distance
// for empty-space skipping), moonlight optical depth, sky visibility and the
// lightning irradiance of the current frame. The fallback evaluates the same
// function directly.
export const stormVolume = `
const vec2 stAtlas = vec2(1024,675);
const vec3 stVolumeLo = vec3(-26.0,0.3,-7.0);
const vec3 stVolumeSize = vec3(52.0,16.8,30.0);
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
// Periodic lobe microstructure occupies unused topology-atlas columns.
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
  vec2 uv0 = (xy+vec2(float(a.z)*30.0,0))/stAtlas;
  vec2 uv1 = (xy+vec2(float((a.z+1)%28)*30.0,0))/stAtlas;
  return mix(texture(u_precomputed,uv0),texture(u_precomputed,uv1),f.z);
#else
  return mix(mix(mix(stDetailNode(a),stDetailNode(a+ivec3(1,0,0)),f.x),
                 mix(stDetailNode(a+ivec3(0,1,0)),stDetailNode(a+ivec3(1,1,0)),f.x),f.y),
             mix(mix(stDetailNode(a+ivec3(0,0,1)),stDetailNode(a+ivec3(1,0,1)),f.x),
                 mix(stDetailNode(a+ivec3(0,1,1)),stDetailNode(a+ivec3(1,1,1)),f.x),f.y),f.z);
#endif
}
vec3 stAnvil; float stAnvilR, stAnvilT, stDomeR;
mat2 stRotation;
const vec3 stFill = vec3(-0.4364,0.7758,-0.4558);
vec4 stBubble[15];
void stBubbles() {
  for (int i = 0; i < 5; ++i) {
    vec4 c = stCell[i];
    float hgt = c.w-c.z;
    float leanK = (stRand(8,i)-0.5)*0.3*stRise*(1.0-0.6*stSuper);
    float calm = i == 2 ? 1.0-0.75*stSuper : 1.0;
    for (int k = 0; k < 3; ++k) {
      float fk = float(k);
      float bob = sin(stPhase+stTau*stRand(9,i*3+k));
      float by = c.z+hgt*(0.5+0.19*fk)+0.18*bob;
      stBubble[i*3+k] = vec4(c.x+(stRand(10,i*3+k)-0.5)*1.0*stCellR[i]+leanK*(by-c.z), by,
        c.y+(stRand(11,i*3+k)-0.5)*1.0*stCellR[i], stCellR[i]*(0.8-0.14*fk)*mix(0.75,1.0,stRise)*calm);
    }
  }
}
void stCloudSetup() {
#ifndef PRECOMPUTED
  stBubbles();
#endif
  vec4 main = stCell[2];
  stAnvil = vec3(mix(main.x,-3.0,stSuper), main.w*mix(0.92,0.9,stSuper), mix(main.y,7.0,stSuper));
  stAnvilR = mix(0.6*stCellR[2],17.5,stSuper);
  stAnvilT = mix(0.9,1.25,stSuper);
  stDomeR = 2.5*stSuper;
  stRotation = rot2(stPhase);
}
// Conservative axis-aligned bounds of the whole storm (towers with their
// lean, widening, erosion and striations; the anvil and dome), world units.
void stStormBox(out vec3 lo, out vec3 hi) {
  float minX = 1e3, maxX = -1e3, minZ = 1e3, maxZ = -1e3, top = 0.0;
  for (int i = 0; i < 5; ++i) {
    float r = stCellR[i]*1.25+2.0+0.15*(stCell[i].w-stCell[i].z);
    minX = min(minX,stCell[i].x-r); maxX = max(maxX,stCell[i].x+r);
    minZ = min(minZ,stCell[i].y-r); maxZ = max(maxZ,stCell[i].y+r);
    top = max(top,stCell[i].w);
  }
  float ra = stAnvilR+2.0;
  minX = min(minX,stAnvil.x-ra); maxX = max(maxX,stAnvil.x+ra);
  minZ = min(minZ,stAnvil.z-ra); maxZ = max(maxZ,stAnvil.z+ra);
  // No cloud lies below the lowest base (wall cloud, ragged floor and its
  // ramp reach at most 1.4 below stBase): rays under the base start late.
  lo = vec3(max(minX,stVolumeLo.x),max(stVolumeLo.y,(stBase-1.5)*u_params[2]),max(minZ,stVolumeLo.z));
  hi = vec3(min(maxX,stVolumeLo.x+stVolumeSize.x),
    min(stVolumeLo.y+stVolumeSize.y,top+stDomeR+2.0)*u_params[2],
    min(maxZ,stVolumeLo.z+stVolumeSize.z));
}
float stSmin(float a, float b, float k) {
  float h = clamp(0.5+0.5*(b-a)/k,0.0,1.0);
  return mix(b,a,h)-k*h*(1.0-h);
}
// Signed distance (positive outside) of the meteorological carrier: rounded
// convective towers with a flat base, the supercell's striated rotating
// updraft, an anvil that spreads from the main crown and an overshooting dome.
vec2 stParts;
float stCarrier(vec3 p, bool fine, bool lobes, out vec2 parts) {
  float field = 1e3, foot = 1e3;
  for (int i = 0; i < 5; ++i) {
    vec4 c = stCell[i];
    vec2 d = p.xz-c.xy;
    // Seeded lean: towers shear slightly with height instead of standing
    // as identical upright pillars.
    d.x -= (p.y-c.z)*(stRand(8,i)-0.5)*0.3*stRise*(1.0-0.6*stSuper);
    float rad = length(d);
    // Towers taper upward (broad base, narrower crown); the bank stays wide.
    float R = stCellR[i]*(mix(0.82+0.26*smoothstep(c.z,c.z+0.5*(c.w-c.z),p.y),1.1-0.35*smoothstep(c.z+0.2*(c.w-c.z),c.w,p.y),stRise*(1.0-stSuper)));
    if (i == 2 && stSuper > 0.0) {
      // Mesocyclone: narrower stacked base, helical striation terraces.
      float low = 1.0-smoothstep(c.z+3.0,c.z+6.5,p.y);
      float theta = atan(d.y,d.x+1e-5);
      R *= mix(1.0,0.7+0.3*smoothstep(c.z,c.z+5.0,p.y),stSuper*low);
      R += stSuper*low*0.55*sin(stTau*p.y*0.7+theta-2.0*stPhase);
    }
    float hgt = c.w-c.z;
    // Bubbles form the crowns; the supercell's updraft keeps its column.
    // The column reaches 1.6 below the base: the floor ramp cuts one flat,
    // ragged shelf instead of a row of rounded puff bottoms.
    float halfH = 0.5*hgt*mix(1.0,0.78,stRise*(i == 2 ? 1.0-stSuper : 1.0))+1.1;
    float ym = c.z-1.6+halfH;
    float rr = min(R,halfH)*0.85;
    vec2 q = vec2(rad-R+rr, abs(p.y-ym)-halfH+rr);
    float sd = min(max(q.x,q.y),0.0)+length(max(q,0.0))-rr;
    // Thermal bubbles (seeded centres cached once per invocation): stacked
    // domes that boil slowly, so towers read as lobed congestus.
    for (int k = 0; k < 3; ++k) {
      if (!lobes) break;
      vec4 b = stBubble[i*3+k];
      sd = stSmin(sd,length(p-b.xyz)-b.w,0.7);
    }
    if (i == 2) parts.x = sd;
    field = stSmin(field,sd,1.3);
    foot = stSmin(foot,rad-stCellR[i]*1.25,1.5);
  }
  // Supercell: one dark shelf under the whole line of cells.
  // A dark shelf joins the bases (thin in Towers, full under the supercell).
  if (stRise > 0.0) {
    float shelf = max(foot+(1.0-stRise)*6.0, abs(p.y-(stBase-0.5))-mix(0.75,1.1,stSuper));
    field = stSmin(field,shelf,1.0);
  }
  // Anvil: elliptical wedge, thick at the core, thin and lifted at the edge.
  vec2 a = (p.xz-stAnvil.xz)*vec2(1.0,mix(1.4,2.0,stSuper));
  // Downstream (screen right, -x) the anvil streams far; upstream it is short.
  a.x *= a.x > 0.0 ? mix(1.0,1.7,stSuper) : 1.0;
  // Ragged outline: low angular harmonics (bounded Lipschitz factor), so
  // the anvil is a torn plume, not an elliptical saucer.
  float theta = atan(a.y,a.x+1e-5);
  float rim = stAnvilR*(1.0+stSuper*(0.13*sin(2.0*theta+stTau*stRand(12,0))+0.07*sin(5.0*theta+stTau*stRand(12,1))-0.1));
  float k = clamp(length(a)/rim,0.0,1.0);
  float thick = stAnvilT*(1.0-0.7*k*k);
  float centre = stAnvil.y+0.5*k*k;
  float under = centre-thick;
  if (fine && stSuper > 0.0 && abs(p.y-under) < 1.6 && k > 0.2 && k < 0.98) {
    // Mammatus: rounded pouches hang from the anvil underside.
    float pouch = clamp((stBillow(vec3(p.x*0.32,7.0,p.z*0.32)).x-0.3)/0.5,0.0,1.0);
    under -= stSuper*0.9*pouch*pouch*smoothstep(0.2,0.45,k)*(1.0-smoothstep(0.8,0.98,k));
  }
  // The radial term of the scaled ellipse is divided by its gradient
  // magnitude: a near-Euclidean distance, so empty space is skipped in
  // long steps beside the anvil instead of the scaled (×2) bound.
  vec2 sc = vec2(a.x > 0.0 ? mix(1.0,1.7,stSuper) : 1.0, mix(1.4,2.0,stSuper));
  float al = max(length(a),1e-4);
  float gl = max(length(sc*a)/al,1.0);
  float sa = max((al-rim)/gl, max(p.y-centre-thick, under-p.y));
  parts.y = sa;
  field = stSmin(field,sa,1.0);
  if (stDomeR > 0.0) {
    vec3 dome = vec3(stCell[2].x, stCell[2].w+0.2, stCell[2].y);
    field = stSmin(field,length(p-dome)-stDomeR,0.8);
  }
  return field;
}
// Erosion amplitude: billowy crowns, smoother bases, laminar mesocyclone.
float stErosion(vec3 p) {
  float e = mix(1.0,2.5,smoothstep(stBase+0.4,stBase+4.0,p.y));
  vec2 d = p.xz-stCell[2].xy;
  float core = exp(-dot(d,d)/36.0)*(1.0-smoothstep(stBase+3.0,stBase+6.5,p.y));
  e *= 1.0-0.8*stSuper*core;
  float anvil = smoothstep(stAnvil.y-2.5,stAnvil.y-0.5,p.y)*stSuper;
  return e*(1.0-0.5*anvil);
}
// Extinction at p. detail 0 is the light-transport estimate (one billow
// octave); detail 1 adds the second octave. sd returns the carrier distance.
float stDensityAt(vec3 p, int detail, out float sd) {
  p.y /= u_params[2];
  // Far light taps (detail < 0) see the towers without their bubbles.
  sd = stCarrier(p,detail > 0,detail >= 0,stParts);
  float e = stErosion(p);
  if (sd > 0.5*e+0.05) return 0.0;
  float floorHeight = stBase-stSuper*0.75*exp(-dot(p.xz-stCell[2].xy,p.xz-stCell[2].xy)/6.0);
  // Ragged base: no flat glassy cut.
  if (detail >= 0 && p.y < floorHeight+1.0) floorHeight += 0.45*(stNoise(vec3(p.xz*0.3,3.0)).x-0.5);
  float base = smoothstep(floorHeight-0.35,floorHeight+0.6,p.y)*3.2*u_params[3];
  // Light-transport estimate: the carrier alone, eroded by its mean.
  if (detail < 0) return smoothstep(0.0,1.0,-sd)*base;
  vec3 q = p+vec3(0.5*sin(stPhase),0.35*cos(stPhase),0.4*cos(stPhase));
  vec2 d = q.xz-stCell[2].xy;
  float spin = stSuper*exp(-dot(d,d)/50.0)*(1.0-smoothstep(stBase+4.0,stBase+8.0,p.y));
  q.xz = mix(q.xz,stCell[2].xy+stRotation*d,spin);
  float billow = stBillow(q*0.34).x*0.62;
  // Second octave stays below the lattice Nyquist rate (no aliasing blocks).
  billow += detail > 0 ? stBillow(q*0.68+vec3(3.1,1.7,5.3)).x*0.38 : 0.17;
  billow = clamp((billow-0.18)/0.55,0.0,1.0);
  // The anvil is fibrous: streamers stretched downstream, not lobes.
  float anvilW = stSuper*smoothstep(stAnvil.y-2.5,stAnvil.y-0.8,p.y);
  if (anvilW > 0.0) {
    float streak = stNoise(vec3(q.x*0.22,q.y*1.1,q.z*0.8)).x*0.6+stNoise(vec3(q.x*0.5,q.y*2.2,q.z*1.9)+3.3).x*0.4;
    billow = mix(billow,streak,anvilW);
  }
  float v = -sd+e*(billow-0.5);
  // The ramp spans more than two lattice nodes: interpolation cannot print
  // the lattice; full-resolution erosion restores crisp edges.
  float dens = smoothstep(0.0,0.55,v)*base;
  // Ragged scud hanging under the shelf (inside the footprint, never more
  // than 1.45 below the base: the march bounds stay conservative).
  if (stRise > 0.0 && p.y < floorHeight+0.3 && p.y > stBase-1.45) {
    float n = stNoise(vec3(p.x*0.9,p.y*1.8,p.z*0.9)+0.6*vec3(sin(stPhase),0.0,cos(stPhase))).x;
    float hang = smoothstep(stBase-1.45,floorHeight-0.2,p.y);
    dens = max(dens,smoothstep(0.62,0.85,n)*hang*smoothstep(0.3,1.2,-sd)*1.8*u_params[3]*stRise);
  }
  return dens;
}
float stDensityAt(vec3 p) { float sd; return stDensityAt(p,0,sd); }
float stDensityLight(vec3 p) { float sd; return stDensityAt(p,-1,sd); }
float stChannelDistance(vec3 p, int slot, out vec3 c) {
  vec3 a = stTop[slot], b = mix(stTop[slot],stBottom[slot],stSlot[slot].z);
  a.y *= u_params[2]; b.y *= u_params[2];
  vec3 v = b-a;
  c = a+v*clamp(dot(p-a,v)/max(dot(v,v),1e-4),0.0,1.0);
  return length(p-c);
}
// Lightning irradiance with in-cloud attenuation along the path to the
// channel: a flash reveals lobes and gaps instead of fogging a round blob.
float stFlashLight(vec3 p, bool occlude) {
  float light = 0.0;
  for (int k = 0; k < 4; ++k) {
    float power = stSlot[k].x;
    if (power <= 0.002) continue;
    // Buried discharges spend their light inside the cloud.
    power *= (k == 3 ? 1.8 : k == 2 ? 1.2 : mix(1.5,0.8,smoothstep(1.15,1.75,u_params[0])))*mix(3.0,1.0,stRise);
    vec3 c;
    float d = stChannelDistance(p,k,c);
    float g = power/pow(1.0+d*d*0.06,1.5);
    if (g < 0.004) continue;
    if (occlude && g > 0.02) {
      // One midpoint tap along the path to the channel (cheap carrier
      // density); faint contributions skip the occlusion estimate.
      float tau = 2.0*stDensityLight(mix(p,c,0.5));
      g *= exp(-tau*d*0.333*0.16);
    }
    light += g;
  }
  return light;
}
vec4 stOptical(vec3 p) {
  float sd;
  float density = stDensityAt(p,1,sd);
  vec2 parts = stParts;
  // Conservative empty-space distance: the carrier SDF is 1-Lipschitz and
  // erosion moves the boundary outward by at most 0.5·max erosion.
  // Divide by the local Lipschitz bound of whichever part is nearest: the
  // anvil's elliptical scaling and mammatus, the striated updraft.
  float wM = stSuper*(1.0-smoothstep(0.0,2.0,parts.x-sd));
  float wA = 1.0-smoothstep(0.0,2.0,parts.y-sd);
  float lip = mix(1.55,1.25,stRise)+wA*mix(0.45,1.4,stSuper)+3.5*wM;
  float skip = max(1e-4,(sd-1.3)*0.8/lip)*min(1.0,u_params[2]);
  if (density <= 0.0 && sd > 2.2) return vec4(-skip,0.0,1.0,stFlashLight(p,false));
  // Nodes near the boundary carry the same transport as interior nodes, so
  // interpolation across the surface cannot print lattice cells.
  float tau = 0.0, last = 0.0;
  for (int j = 0; j < 5; ++j) {
    float s = 0.25*pow(2.0,float(j))*1.1;
    tau += (j < 2 ? stDensityAt(p+stLight*s) : stDensityLight(p+stLight*s))*(s-last);
    last = s;
  }
  // Sky fill from above the camera side models the visible faces.
  float up = stDensityAt(p+stFill*0.7)*0.7+stDensityLight(p+stFill*2.0)*1.3;
  return vec4(density > 0.0 ? density : -skip,tau,exp(-up*0.35),stFlashLight(p,true));
}
const vec3 stGrid = vec3(128,80,64);
// The first 35 atlas rows remain exact lightning topology and tile masks.
ivec2 stVoxelAddress(ivec3 p) {
  return ivec2((p.z%8)*128+p.x,35+(p.z/8)*80+p.y);
}
vec4 stVolume(vec3 p) {
#ifdef PRECOMPUTED
  vec3 q = clamp((p-stVolumeLo)/stVolumeSize*stGrid-0.5,vec3(0),stGrid-1.001);
  ivec3 a = ivec3(floor(q)); vec3 f = fract(q);
#ifdef PRECOMPUTED_LINEAR
  vec2 xy = q.xy+0.5;
  vec2 uv0 = (vec2((a.z%8)*128,35+(a.z/8)*80)+xy)/stAtlas;
  int z1 = min(a.z+1,int(stGrid.z)-1);
  vec2 uv1 = (vec2((z1%8)*128,35+(z1/8)*80)+xy)/stAtlas;
  return mix(texture(u_precomputed,uv0),texture(u_precomputed,uv1),f.z);
#else
  #define stVoxel(o) texelFetch(u_precomputed,stVoxelAddress(min(a+o,ivec3(stGrid)-1)),0)
  return mix(mix(mix(stVoxel(ivec3(0,0,0)),stVoxel(ivec3(1,0,0)),f.x),
                 mix(stVoxel(ivec3(0,1,0)),stVoxel(ivec3(1,1,0)),f.x),f.y),
             mix(mix(stVoxel(ivec3(0,0,1)),stVoxel(ivec3(1,0,1)),f.x),
                 mix(stVoxel(ivec3(0,1,1)),stVoxel(ivec3(1,1,1)),f.x),f.y),f.z);
  #undef stVoxel
#endif
#else
  // No float targets: evaluate the same optical function at the sample.
  return stOptical(clamp(p,stVolumeLo,stVolumeLo+stVolumeSize));
#endif
}
`;
