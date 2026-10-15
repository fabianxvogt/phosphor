// Exact per-frame geometry data, shared by the optional float cache and the
// uncached path. No cached colour, no stochastic temporal sampling.
export const stormData = `
float stRise, stSuper, stPhase, stCamera;
vec3 stEye, stF, stR, stU;
uint stHash(uint x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16;
  return x;
}
float stRand(int network, int n) {
  return float(stHash(u_seedBits ^ (uint(network + 1) * 0x9e3779b9u) ^ (uint(n + 1) * 0x85ebca6bu)) >> 8) / 16777216.0;
}
void stSetup() {
  stRise = smoothstep(0.0, 1.0, u_params[0]);
  stSuper = smoothstep(1.0, 2.0, u_params[0]);
#ifdef PHOSPHOR_LATE
  stPhase = u_clock[0]; stCamera = u_clock[1];
#else
  stPhase = u_time * u_params[1] * 0.16;
  stCamera = u_time * u_params[6] * 0.035;
#endif
  stEye = vec3(1.2 * sin(stCamera), 1.15 + u_params[5] * 0.9 + 0.12 * sin(2.0 * stCamera), mix(-10.5,-6.7,stSuper) + 0.5 * cos(stCamera));
  vec3 target = vec3(0, mix(3.1, 6.6, stRise) * u_params[2], 5.5);
  stF = normalize(target - stEye);
  stR = normalize(cross(stF, vec3(0,1,0))); stU = cross(stR, stF);
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
  return p + vec3(side * float(n)*0.12 + (stRand(network,110+branch*8+n)-stRand(network,110+branch*8))*0.055,
    float(n)*0.045 + (stRand(network,150+branch*8+n)-stRand(network,150+branch*8))*0.05,
    (stRand(network,190+branch*8+n)-stRand(network,190+branch*8))*0.1);
}
vec3 stWorld(vec3 p, int network) {
  float side = network%2 == 0 ? -1.0 : 1.0;
  if (network >= 2) return vec3(side*(-6.5+p.y*13.0+p.x*4.0),
    (mix(3.1,5.8,stRise)-stSuper*1.9+p.y*0.35+sin(p.y*9.0)*0.35*stRise+p.z*3.0)*u_params[2],
    4.2+float(network-2)*0.8+p.z*4.0);
  float offset = float(network) * 0.65;
  return vec3(side * (0.8 + p.x * 5.0 + p.y * mix(8.0, 2.0 + offset, stSuper)),
    (mix(3.1, 8.6 + offset, stRise) - p.y * mix(0.6, 8.6 + offset, stSuper)) * u_params[2],
    5.1 + float(network) * 0.8 + p.z * 3.2);
}
void stSegment(int i, out vec3 a, out vec3 b, out float weight) {
  int network = i / 30, local = i % 30;
  if (local < 18) {
    a = stLeader(network, local); b = stLeader(network, local + 1); weight = 1.0;
  } else {
    int branch = (local - 18) / 4, stepIndex = (local - 18) % 4;
    a = stBranch(network, branch, stepIndex); b = stBranch(network, branch, stepIndex + 1);
    weight = stRand(network, 70 + branch) < 0.78 ? 0.52 : 0.0;
  }
  a = stWorld(a, network); b = stWorld(b, network);
}
vec4 stDatum(int i, int row) {
  if (i >= 120) return vec4(0);
  vec3 a, b; float weight; stSegment(i, a, b, weight);
  if (row == 0) return vec4(stProject(a), stProject(b));
  if (row == 1) return vec4(a, weight);
  return vec4(b, weight);
}
`;
