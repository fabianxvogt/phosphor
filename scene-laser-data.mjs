// Shared exact geometry for the tiny per-frame data pass and its fallback.
// This is geometry, not a reduced-resolution colour cache.
export const laserData = `
float lgHash(float x) { return hash(vec2(x, 105.0)); }
float gFold, gRise, gPhase, gCt, gSt;
vec3 gEye, gFw, gRight, gUp;
void lgSetup() {
  float dev = clamp(u_params[0], 0.0, 2.0);
  gRise = smoothstep(0.0, 1.0, dev); gFold = smoothstep(1.0, 2.0, dev);
#ifdef PHOSPHOR_LATE
  float motion = u_clock[0], camera = u_clock[1];
#else
  float motion = u_time * u_params[1] * 0.32;
  float camera = u_time * u_params[6] * 0.055;
#endif
  gPhase = mod(motion, TAU); camera = mod(camera, TAU);
  float seedAngle = lgHash(41.0) * TAU;
  gEye = vec3(1.1 * sin(camera + seedAngle), u_params[7] + 0.25 * sin(camera * 2.0), -9.0 + 1.8 * cos(camera));
  vec3 target = vec3(0.8 * sin(camera), mix(1.9, 6.0, gFold), 34.0);
  gFw = normalize(target - gEye); gRight = normalize(cross(vec3(0,1,0), gFw)); gUp = cross(gFw, gRight);
  gCt = cos(gFold * PI * 0.5); gSt = sin(gFold * PI * 0.5);
}
vec2 lgProject(vec3 p) {
  vec3 v = p - gEye;
  return vec2(dot(v, gRight), dot(v, gUp)) / max(dot(v, gFw), 0.01);
}
void lgTower(int i, out vec3 origin, out vec3 size) {
  float fi = float(i), side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
  float bay = floor(fi / 2.0), u = 2.4 + 5.0 * mod(bay, 2.0);
  float h = (4.5 + 8.5 * lgHash(fi + 7.0)) * u_params[5] * gRise * mix(1.0, 0.16, gFold);
  vec3 tx = vec3(side * gCt, gSt, 0), ty = vec3(-side * gSt, gCt, 0);
  origin = vec3(side * 9.0, 0, 5.0 + bay * 5.3) + tx * u + ty * (h * 0.5);
  size = vec3(0.85 + 0.85 * lgHash(fi + 71.0), max(h * 0.5, 0.0001), 1.05 + 0.95 * lgHash(fi + 92.0));
}
void lgEndpoints(int i, out vec3 a, out vec3 b, out float weight, out float tint) {
  float fi = float(i), level = clamp(u_level, 0.0, 1.0);
  float aperture = u_params[4] * (1.0 + 0.12 * u_rhythm.y);
  weight = 1.0; tint = 0.05;
  if (i == 0) {
    a = vec3(0, 3.4, 65);
    b = vec3(15.0 * sin(gPhase), 0.0, 3.0 + 5.0 * (0.5 + 0.5 * sin(gPhase * 2.0)));
  } else {
    float bank = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
    float index = floor((fi - 1.0) / 2.0), k = (index - 3.5) / 3.5;
    float cohort = mix(index * 0.5, mod(index, 4.0), gFold);
    // Extra cohorts open on the kick; no gain flash or unbounded population.
    weight = gRise * smoothstep(cohort - 0.65, cohort + 0.65, 0.7 + 2.7 * level + 0.4 * gFold + 0.65 * u_kick * gFold);
    float upper = step(3.5, index);
    a = vec3(bank * mix(10.0, 7.8, gFold), 1.0 + 10.0 * upper * gFold, 49.0 - 10.0 * upper * gFold);
    // In Towers the far emitter strikes the front facade of a persistent tower.
    int tower = (i - 1) * 2 + (bank > 0.0 ? 1 : 0);
    vec3 origin, size; lgTower(tower, origin, size);
    vec3 strike = origin + vec3(0, size.y * (0.35 + 0.5 * sin(gPhase + fi)), -size.z);
    float local = (mod(index, 4.0) - 1.5) / 1.5;
    vec3 crossEnd = vec3(-bank * (4.5 + local * 3.2 * aperture) + 1.4 * sin(gPhase),
      mix(10.5, 0.0, upper) + (1.0 - upper) * local * 1.3 * aperture + 0.65 * sin(gPhase + bank), 2.0 + index * 0.75);
    b = mix(strike, crossEnd, gFold);
    tint = 0.35 + 0.4 * mod(fi, 2.0);
  }
}
// Exact perspective bounds of the eight box vertices. Perspective extrema
// of a convex positive-z box occur at vertices. Include its antenna tip.
vec4 lgTowerBounds(int i, vec3 origin, vec3 size) {
  float side = (i % 2) == 0 ? -1.0 : 1.0;
  vec3 tx = vec3(side * gCt, gSt, 0), ty = vec3(-side * gSt, gCt, 0);
  vec2 lo = vec2(1e6), hi = vec2(-1e6);
  for (int k = 0; k < 8; ++k) {
    vec3 p = vec3((k & 1) == 0 ? -size.x : size.x, (k & 2) == 0 ? -size.y : size.y, (k & 4) == 0 ? -size.z : size.z);
    vec2 v = lgProject(origin + tx * p.x + ty * p.y + vec3(0,0,p.z));
    lo = min(lo, v); hi = max(hi, v);
  }
  vec2 tip = lgProject(origin + ty * (size.y + 0.8 * gRise));
  return vec4(min(lo, tip), max(hi, tip));
}
vec4 lgDatum(int i, int row) {
  if (row < 3) {
    vec3 origin, size; lgTower(i, origin, size);
    if (row == 0) return vec4(origin, 0);
    if (row == 1) return vec4(size, 0);
    return lgTowerBounds(i, origin, size);
  }
  vec3 a, b; float weight, tint; lgEndpoints(i, a, b, weight, tint);
  if (row == 3) return vec4(a, weight);
  if (row == 4) return vec4(b, tint);
  if (row == 5) return vec4(lgProject(a), lgProject(b));
  vec3 d = normalize(b - a);
  if (row == 7) return vec4(d, length(b - a));
  if (row == 8) {
    vec3 p = gEye - (a + b) * 0.5; float z = dot(p, d);
    return vec4(p - z * d, z);
  }
  float nearZ = min(dot(a - gEye, gFw), dot(b - gEye, gFw));
  float projectedSlope = max(length(lgProject(a)), length(lgProject(b)));
  // Perspective Lipschitz bound for the six-sigma tube (w <= .4).
  return vec4(6.0 * 0.4 * (1.0 + projectedSlope) / max(nearZ - 2.4, 0.01), length((a + b) * 0.5 - gEye), 0, 0);
}
`;
