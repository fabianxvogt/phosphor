// Shared exact geometry for the tiny per-frame data pass and its fallback.
// This is geometry, not a reduced-resolution colour cache.
export const laserData = `
float lgHash(float x) { return hash(vec2(x, 105.0)); }
float gFold, gRise, gPhase, gCt, gSt, gSlope;
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
  // One cone slope for spokes, haze cone and scan fronts. Aperture breath
  // (slot 1) widens the whole tunnel by at most 10%.
  gSlope = (0.19 + 0.025 * sin(gPhase * 2.0)) * (1.0 + 0.1 * u_rhythm.y);
}
// Rhythm selections, shared by the data pass and the picture so a selected
// beam is always a candidate. Beam address (slot 0): one crossfire laser, or
// the horizon scanner before towers exist. Tunnel chase (slot 3): the newest
// hit fires the next of the eight spokes, its two predecessors still glow.
float lgAddress(int i) {
  if (i == 0) return u_rhythm.x * (1.0 - gRise);
  if (i > 12) return 0.0;
  return abs(mod(u_rhythmCount.x + 11.0, 12.0) + 1.0 - float(i)) < 0.5 ? u_rhythm.x * gRise : 0.0;
}
float lgChase(int i) {
  if (i < 13) return 0.0;
  float back = mod(mod(u_rhythmCount.w + 7.0, 8.0) - float(i - 13) + 8.0, 8.0);
  return u_rhythm.w * (back < 0.5 ? 1.0 : back < 1.5 ? 0.55 : back < 2.5 ? 0.22 : 0.0);
}
vec2 lgProject(vec3 p) {
  vec3 v = p - gEye;
  return vec2(dot(v, gRight), dot(v, gUp)) / max(dot(v, gFw), 0.01);
}
// Union of discs along a projected segment with linearly varying radius.
// Minimize the signed squared distance (a quadratic); concave quadratics
// attain their minimum at an endpoint, included explicitly below.
bool lgInsideTaper(vec2 p, vec2 a, vec2 b, vec2 radii) {
  vec2 v = b - a, q = p - a;
  float dr = radii.y - radii.x;
  float A = dot(v,v) - dr * dr, B = -dot(q,v) - radii.x * dr;
  float t = A > 1e-8 ? clamp(-B / A, 0.0, 1.0) : 0.0;
  vec2 off = q - v * t;
  float f = dot(off,off) - sq(radii.x + dr * t);
  return min(f, min(dot(q,q) - sq(radii.x), dot(q-v,q-v) - sq(radii.y))) <= 0.0;
}
void lgTower(int i, out vec3 origin, out vec3 size) {
  float fi = float(i), side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
  float bay = floor(fi / 2.0), u = 2.4 + 5.0 * mod(bay, 2.0);
  float h = (4.5 + 8.5 * lgHash(fi + 7.0)) * u_params[5] * gRise * mix(1.0, 0.16, gFold);
  vec3 tx = vec3(side * gCt, gSt, 0), ty = vec3(-side * gSt, gCt, 0);
  origin = vec3(side * 9.0, 0, 5.0 + bay * 5.3) + tx * u + ty * (h * 0.5);
  size = vec3(0.85 + 0.85 * lgHash(fi + 71.0), max(h * 0.5, 0.0001), 1.05 + 0.95 * lgHash(fi + 92.0));
}
void lgClipStrip(vec3 a, vec3 v, vec3 base, vec3 tangent, float span, inout float nearest) {
  vec3 normal = vec3(-tangent.y, tangent.x, 0);
  float den = dot(v, normal);
  if (abs(den) < 1e-6) return;
  float t = dot(base - a, normal) / den;
  float u = dot(a + v * t - base, tangent);
  if (t > 0.001 && t < nearest && u >= 0.0 && u <= span) nearest = t;
}
vec3 lgSurfaceEnd(vec3 a, vec3 b) {
  vec3 v = b - a; float nearest = 1.0;
  lgClipStrip(a, v, vec3(-9,0,0), vec3(1,0,0), 18.0, nearest);
  for (int s = 0; s < 2; ++s) {
    float side = s == 0 ? -1.0 : 1.0;
    lgClipStrip(a, v, vec3(side*9.0,0,0), vec3(side*gCt,gSt,0), 11.0, nearest);
    float angle = gFold * (PI - 0.42);
    lgClipStrip(a, v, vec3(side*(9.0+11.0*gCt),11.0*gSt,0), vec3(side*cos(angle),sin(angle),0), 9.85665208, nearest);
  }
  return a + v * nearest;
}
void lgEndpoints(int i, out vec3 a, out vec3 b, out float weight, out float tint) {
  float fi = float(i), level = clamp(u_level, 0.0, 1.0);
  float aperture = u_params[4] * (1.0 + 0.12 * u_rhythm.y);
  weight = 1.0; tint = 0.05;
  if (i == 0) {
    a = vec3(0, 3.4, 65);
    b = vec3(15.0 * sin(gPhase), 0.0, 3.0 + 5.0 * (0.5 + 0.5 * sin(gPhase * 2.0)));
  } else if (i >= 13) {
    float spoke = fi - 13.0;
    float angle = spoke * TAU / 8.0 + gPhase;
    vec3 apex = vec3(0, 5.7, 55);
    // Truncated cone: virtual apex is at z=70. The physical eight-laser
    // crown at z=55 leaves a dark portal instead of a point starburst.
    vec3 crown = apex + vec3(cos(angle), sin(angle), 0) * (15.0 * gSlope);
    vec3 coneEnd = apex + vec3(cos(angle) * gSlope * 68.0, sin(angle) * gSlope * 68.0, -53.0);
    // Before the vault closes the SAME eight lasers fan out of the horizon
    // projector over the audience; the fan plane tilts slowly up and down.
    // Development folds this fan into the cone, so identity persists.
    float k = (spoke - 3.5) / 3.5;
    float lift = 0.5 + 0.5 * sin(gPhase * 2.0 + 1.3);
    // Low: the central rays strike the floor, the outer ones leave the frame
    // over the audience. High: the fan sweeps overhead out of the top.
    vec3 fanEnd = vec3(k * 18.0 * aperture + 3.0 * sin(gPhase + 0.4 * spoke),
      mix(-1.5, 9.5, lift) + 1.5 * k * k, 0.5);
    a = mix(vec3(0, 3.4, 65), crown, gFold);
    b = mix(fanEnd, coneEnd, gFold);
    weight = smoothstep(mod(spoke, 4.0) - 0.65, mod(spoke, 4.0) + 0.65, 0.7 + 2.6 * level + 0.6 * u_kick);
    // Four persistent spokes gain four interleaved neighbours on the kick.
    // A soft pedestal and smooth envelope avoid binary on/off strobing.
    weight *= mix(1.0, 0.14 + 0.86 * smoothstep(0.0, 0.55, u_kick), mod(spoke, 2.0));
    // Competing spokes rest while the clockwise accent speaks.
    weight *= (1.0 - 0.82 * u_rhythm.w) * mix(1.0, 0.52, gFold);
    weight = max(weight, lgChase(i));
    tint = 0.16 + 0.15 * mod(spoke, 2.0);
  } else {
    float bank = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
    float index = floor((fi - 1.0) / 2.0), k = (index - 3.5) / 3.5;
    float cohort = mix(index * 0.5, mod(index, 4.0), gFold);
    // Extra cohorts open on the kick; no gain flash or unbounded population.
    weight = gRise * smoothstep(cohort - 0.65, cohort + 0.65, 0.7 + 2.7 * level + 0.4 * gFold + 0.65 * u_kick * gFold);
    float upper = step(3.5, index);
    a = vec3(bank * mix(10.0, 8.7, gFold), mix(1.0, 2.1 + 7.6 * upper, gFold), mix(49.0, 47.0 - index * 5.8, gFold));
    // In Towers the far emitter strikes the front facade of a persistent tower.
    int tower = (i - 1) * 2 + (bank > 0.0 ? 1 : 0);
    vec3 origin, size; lgTower(tower, origin, size);
    vec3 strike = origin + vec3(0, size.y * (0.35 + 0.5 * sin(gPhase + fi)), -size.z);
    float local = (mod(index, 4.0) - 1.5) / 1.5;
    // Near / middle / far wall rakes keep the central portal open.
    // A bank never fires across the entire nave into the other bank.
    vec3 crossEnd = vec3(bank * (2.4 + 0.5 * local * aperture),
      mix(5.0 + local * aperture, 7.3 + local * 0.6, upper) + 0.5 * sin(gPhase + bank),
      29.0 - index * 5.8);
    b = mix(strike, crossEnd, gFold);
    float bankCycle = 0.5 + 0.5 * sin(gPhase * 2.0 + index * 1.7 + bank * 1.2);
    weight *= mix(1.0, 0.12 + 0.65 * smoothstep(0.3, 0.8, bankCycle), gFold);
    weight *= 1.0 - 0.88 * u_rhythm.w;
    weight = max(weight, lgAddress(i) * (1.0 - 0.8 * u_rhythm.w));
    tint = 0.35 + 0.4 * mod(fi, 2.0);
  }
  b = lgSurfaceEnd(a, b);
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
  vec2 depths = vec2(dot(a - gEye, gFw), dot(b - gEye, gFw));
  float nearZ = min(depths.x, depths.y);
  float projectedSlope = max(length(lgProject(a)), length(lgProject(b)));
  // Inverse depth is affine along the projected segment. This conservative
  // Lipschitz radius therefore tapers instead of expanding the entire beam
  // to its nearest endpoint's width. Six sigma, including end caps.
  float factor = 6.0 * 0.4 * (1.0 + projectedSlope) / max(1.0 - 2.4 / nearZ, 0.001);
  vec2 radii = factor / depths;
  return vec4(max(radii.x, radii.y), length((a + b) * 0.5 - gEye), radii);

}
`;
