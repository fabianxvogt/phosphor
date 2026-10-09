// Ripple Tank (#72): the discrete wave equation u_tt = c²∇²u on a 400×225
// grid, leapfrog in time, four steps per frame, with absorbing sponge
// borders. The state keeps u and u_prev (16 bit each) and a time-averaged
// intensity ⟨u²⟩, so the picture can show the moving wavefronts and the
// standing pattern they leave behind.
//
// Signature details: a plane wave through N slits leaves the textbook
// interference fringes, maxima where the path difference is mλ; a
// slower-wave lens bends the fronts into a focus; a phased array steers
// its beam by delaying each emitter (and throws grating lobes when the
// emitters sit more than λ/2 apart); beat raindrops ring outward and
// interfere. The source amplitude pulses with the kick, so the rhythm
// travels through the tank as wave trains.

export const GRID = [400, 225];
export const COURANT2 = 0.25; // (c·dt/dx)² for c = 1, stable below 0.5
export const SOURCE_X = 30;
export const WALL_X = 120;
export const SPONGE = 24;
const [GW, GH] = GRID;

// Slit centres (cells) for `count` slits `gap` cells apart.
export const slitCentres = (count, gap) =>
  Array.from({ length: count }, (_, k) => GH / 2 + (k - (count - 1) / 2) * gap);
// One slit is wider than λ so its own diffraction minima show.
export const slitHalfWidth = (lambda, count) =>
  Math.max(1, (count === 1 ? 1.2 : 0.35) * lambda);

// Biconvex lens: intersection of two discs.
export function lensContains([x, y]) {
  const cx = 0.42 * GW,
    cy = GH / 2,
    R = 0.9 * GH,
    T = 0.16 * GW;
  const a = Math.hypot(x - (cx - R + T / 2), y - cy) < R;
  const b = Math.hypot(x - (cx + R - T / 2), y - cy) < R;
  return a && b;
}

// Emitters of the phased array and their phase delays (radians) for
// steering angle theta: φ_k = k·2π·gap·sin θ / λ.
export function emitters(count, gap, lambda, theta) {
  const K = 4 + 2 * count;
  return Array.from({ length: K }, (_, k) => ({
    y: GH / 2 + (k - (K - 1) / 2) * gap,
    phase: (k * 2 * Math.PI * gap * Math.sin(theta)) / lambda,
  }));
}

const header = `
const int GW = ${GW}, GH = ${GH};
const float C2 = ${COURANT2};
const float SOURCE_X = ${SOURCE_X}.0, WALL_X = ${WALL_X}.0;
bool rWall(vec2 c, int variant, int count, float gap, float lambda) {
  if (variant != 0 || c.x < WALL_X || c.x >= WALL_X + 2.0) return false;
  float w = max(1.0, (count == 1 ? 1.2 : 0.35) * lambda);
  for (int k = 0; k < 6; k++) {
    if (k >= count) break;
    float yk = float(GH) * 0.5 + (float(k) - float(count - 1) * 0.5) * gap;
    if (abs(c.y + 0.5 - yk) < w) return false;
  }
  return true;
}
bool rLens(vec2 c) {
  float cx = 0.42 * float(GW), cy = float(GH) * 0.5, R = 0.9 * float(GH), T = 0.16 * float(GW);
  return length(c - vec2(cx - R + T * 0.5, cy)) < R && length(c - vec2(cx + R - T * 0.5, cy)) < R;
}
float rIndex(int count) { return 1.0 + 0.2 * float(count); }
int rEmitters(int count) { return 4 + 2 * count; }
float rTheta(float beat, float t) { return 0.85 * sin(TAU * beat / 32.0 + t * 0.03); }
`;

const simulation = `${header}
float rU(ivec2 c) {
  c = clamp(c, ivec2(0), ivec2(GW - 1, GH - 1));
  return (unpack16(texelFetch(u_state, c, 0).rg) - 0.5) * 8.0;
}
float rRand(uint a, uint b) { return float(cellHash(uvec3(a, b, 31u)) >> 8u) / 16777216.0; }
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  int variant = int(floor(u_params[0] + 0.5));
  float lambda = u_params[1];
  int count = int(floor(u_params[2] + 0.5));
  float gap = u_params[3];
  float drops = u_params[4];
  float damping = u_params[5];
  float t = mod(u_time, 3600.0);

  // Meta texel (0, 2·GH): rg source phase in cycles, b last beat, a init.
  vec4 meta = texelFetch(u_state, ivec2(0, 2 * GH), 0);
  bool fresh = u_reset || meta.a < 0.5;
  float phase = fresh ? 0.0 : unpack16(meta.rg);
  int lastBeat = int(meta.b * 255.0 + 0.5);
  float beatF = floor(max(u_beat, 0.0));
  int beat = int(beatF) & 255;
  bool event = !fresh && beat != lastBeat;
  float freq = 0.5 / lambda; // cycles per step at phase speed 0.5 cells/step

  if (px.y == 2 * GH) {
    outColor = px.x == 0 ? vec4(pack16(fract(phase + freq)), float(beat) / 255.0, 1.0) : vec4(0.0);
    return;
  }
  if (px.y >= GH) {
    // Time-averaged intensity ⟨u²⟩ (time constant ≈ 100 steps).
    ivec2 c = ivec2(px.x, px.y - GH);
    float I = fresh ? 0.0 : unpack16(texelFetch(u_state, px, 0).rg);
    float u = fresh ? 0.0 : rU(c);
    outColor = vec4(pack16(mix(I, min(u * u, 1.0), 0.01)), 0.0, 0.0);
    return;
  }
  if (fresh) { outColor = pack16(vec2(0.5)); return; }

  vec2 c = vec2(px) ;
  if (rWall(c, variant, count, gap, lambda)) { outColor = pack16(vec2(0.5)); return; }
  float u = rU(px);
  float up = (unpack16(texelFetch(u_state, px, 0).ba) - 0.5) * 8.0;
  float lap = rU(px + ivec2(1, 0)) + rU(px - ivec2(1, 0)) + rU(px + ivec2(0, 1)) + rU(px - ivec2(0, 1)) - 4.0 * u;
  float speed2 = 1.0;
  if (variant == 2 && rLens(c)) speed2 = 1.0 / sq(rIndex(count));
  // Sponge borders absorb what leaves the tank.
  float edge = float(min(min(px.x, GW - 1 - px.x), min(px.y, GH - 1 - px.y)));
  float gamma = damping * 0.004 + 0.2 * sq(max(0.0, 1.0 - edge / ${SPONGE}.0));
  float un = (2.0 - gamma) * u - (1.0 - gamma) * up + C2 * speed2 * lap;

  // Sources (soft: added, so returning waves pass through them).
  float beatPulse = u_beat > 0.0 ? exp(-4.0 * fract(u_beat)) : 0.0;
  float amp = (0.55 + 0.45 * beatPulse) * (0.75 + 0.5 * u_level);
  float omega = TAU * freq;
  if ((variant == 0 || variant == 2) && px.x == int(SOURCE_X))
    un += amp * omega * 1.0 * sin(TAU * phase);
  if (variant == 3) {
    int K = rEmitters(count);
    float theta = rTheta(max(u_beat, 0.0), t);
    for (int k = 0; k < 16; k++) {
      if (k >= K) break;
      float yk = float(GH) * 0.5 + (float(k) - float(K - 1) * 0.5) * gap;
      if (px.y == int(floor(yk)) && px.x == int(SOURCE_X) + 4)
        un += amp * omega * 2.6 * sin(TAU * phase - float(k) * TAU * gap * sin(theta) / lambda);
    }
  }
  // Raindrops: one on every beat, more at random.
  if (drops > 0.05) {
    if (event) {
      vec2 dc = vec2(mix(30.0, float(GW) - 30.0, rRand(uint(beatF), 1u)), mix(25.0, float(GH) - 25.0, rRand(uint(beatF), 2u)));
      float d = exp(-dot(c - dc, c - dc) / 7.0) * (0.6 + 0.6 * drops);
      un += d;
      u += d;
    }
    if (rRand(u_tick, 3u) < drops * drops * 0.04) {
      vec2 dc = vec2(rRand(u_tick, 4u) * float(GW), rRand(u_tick, 5u) * float(GH));
      float d = exp(-dot(c - dc, c - dc) / 4.0) * 0.5;
      un += d;
      u += d;
    }
  }
  outColor = pack16(clamp(vec2(un, u) * 0.125 + 0.5, 0.0, 1.0));
}
`;

const fragment = `${header}
float rField(ivec2 c, int layer) {
  c = clamp(c, ivec2(0), ivec2(GW - 1, GH - 1));
  float v = unpack16(texelFetch(u_state, c + ivec2(0, layer * GH), 0).rg);
  return layer == 0 ? (v - 0.5) * 8.0 : v;
}
float rSample(vec2 cell, int layer) {
  vec2 g = cell - 0.5;
  ivec2 b = ivec2(floor(g));
  vec2 f = fract(g);
  return mix(mix(rField(b, layer), rField(b + ivec2(1, 0), layer), f.x),
             mix(rField(b + ivec2(0, 1), layer), rField(b + ivec2(1, 1), layer), f.x), f.y);
}
void main() {
  int variant = int(floor(u_params[0] + 0.5));
  float lambda = u_params[1];
  int count = int(floor(u_params[2] + 0.5));
  float gap = u_params[3];
  float glow = u_params[6];
  float fringes = u_params[7];
  float t = mod(u_time, 3600.0);
  vec2 cell = v_uv * vec2(GW, GH);
  float px = max(fwidth(cell.x), 1e-3);

  float u = rSample(cell, 0);
  float I = sqrt(max(rSample(cell, 1), 0.0));
  // Compressive tone curve: diffracted waves are weak but must read.
  float g = 2.0 + 5.0 * glow;
  float su = 1.0 - exp(-abs(u) * g);
  // Wavefronts: crests in the primary colour, troughs in the secondary.
  vec3 waves = u > 0.0 ? mix(u_primary, vec3(1.0), 0.3 * su * su) * su : u_secondary * 0.35 * su;
  // The standing pattern: time-averaged amplitude.
  float si = 1.0 - exp(-I * g * 1.4);
  vec3 pattern = palette(0.15 + 0.8 * si) * si;
  vec3 colour = waves * (1.0 - 0.65 * fringes) + pattern * fringes * 1.1;

  vec3 neon = mix(u_accent, vec3(1.0), 0.35);
  if (rWall(floor(cell), variant, count, gap, lambda)) colour = neon * (0.55 + 0.35 * u_level);
  if (variant == 2) {
    // Lens outline and a faint glass tint.
    float inside = rLens(cell) ? 1.0 : 0.0;
    float rim = fwidth(inside) > 0.0 ? 1.0 : 0.0;
    colour += neon * (0.06 * inside + 0.5 * rim);
  }
  if (variant == 0 || variant == 2)
    colour += neon * 0.35 * (1.0 - smoothstep(0.0, 1.5 * px, abs(cell.x - SOURCE_X - 0.5)));
  if (variant == 3) {
    int K = rEmitters(count);
    for (int k = 0; k < 16; k++) {
      if (k >= K) break;
      float yk = float(GH) * 0.5 + (float(k) - float(K - 1) * 0.5) * gap;
      float d = length(cell - vec2(SOURCE_X + 4.5, floor(yk) + 0.5)) / px;
      colour += neon * exp(-d * d / 10.0);
    }
  }
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "variant",
    label: "Tank · slits / raindrops / lens / phased array",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "wavelength",
    label: "Wavelength (cells)",
    min: 8,
    max: 40,
    step: 0.1,
    default: 16,
  },
  {
    key: "count",
    label: "Slits · emitters · lens index",
    min: 1,
    max: 6,
    step: 1,
    default: 2,
  },
  {
    key: "gap",
    label: "Slit / emitter spacing",
    min: 4,
    max: 80,
    step: 0.5,
    default: 40,
  },
  { key: "drops", label: "Raindrops", min: 0, max: 1, step: 0.01, default: 0 },
  {
    key: "damping",
    label: "Damping",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.1,
  },
  {
    key: "glow",
    label: "Wavefront glow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "fringes",
    label: "Standing pattern",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
];

const look = (
  name,
  seed,
  variant,
  wavelength,
  count,
  gap,
  drops,
  damping,
  glow,
  fringes,
) => ({
  name,
  seed,
  params: { variant, wavelength, count, gap, drops, damping, glow, fringes },
});

const presets = [
  look("Double Slit", 7201, 0, 16, 2, 40, 0, 0.1, 0.5, 0.5),
  look("Single Slit", 7202, 0, 20, 1, 30, 0.1, 0.1, 0.5, 0.6),
  look("Grating", 7203, 0, 12, 6, 18, 0, 0.1, 0.4, 0.7),
  look("Kick Rain", 7204, 1, 14, 1, 30, 0.7, 0.3, 0.6, 0.2),
  look("Monsoon", 7205, 1, 10, 1, 30, 1, 0.5, 0.4, 0.35),
  look("Glass Lens", 7206, 2, 14, 3, 30, 0, 0.1, 0.5, 0.5),
  look("Dense Lens", 7207, 2, 10, 5, 30, 0.15, 0.1, 0.5, 0.6),
  look("Phased Array", 7208, 3, 14, 4, 6, 0, 0.1, 0.5, 0.4),
  look("Grating Lobes", 7209, 3, 10, 3, 18, 0, 0.1, 0.5, 0.45),
  look("Sonar Rain", 7210, 3, 16, 2, 8, 0.4, 0.2, 0.6, 0.3),
];

export default {
  id: "ripple",
  number: 72,
  name: "Ripple Tank",
  description:
    "The discrete wave equation on a grid. A plane wave through slits leaves the textbook interference fringes; a slower-wave lens bends the fronts into a focus; a phased array steers its beam by delaying each emitter and throws extra grating lobes when the emitters sit too far apart; raindrops on the beat ring out and interfere. The source pulses with the kick, so the rhythm travels through the tank.",
  energy: { drops: [0, 0.3], glow: [-0.1, 0.25], fringes: [0.15, -0.15] },
  beat: { punch: 0.6, pulse: 0.8 },
  audio: [
    { param: "drops", feature: "onset", amount: 0.15 },
    { param: "glow", feature: "high", amount: 0.08 },
    { param: "wavelength", feature: "low", amount: 0.04 },
  ],
  stage: ["wavelength", "drops", "fringes"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [GW, 2 * GH + 1], steps: 4 },
};
