// Pulse Geometry (new, D32): hard-edged emissive geometry on black that moves
// with the beat — the club staple the generative families lacked. Analytic,
// cheap, composes natively on any screen shape. Four structural types:
// bars, tunnel, grid horizon and shards.

const schema = [
  { key: "form", label: "Form · bars / tunnel / grid / shards", min: 0, max: 3, step: 1, default: 0 },
  { key: "count", label: "Line count", min: 2, max: 32, step: 1, default: 8 },
  { key: "thickness", label: "Line weight", min: 0.03, max: 0.5, step: 0.01, default: 0.18 },
  { key: "speed", label: "Travel", min: 0, max: 2, step: 0.01, default: 0.5 },
  { key: "twist", label: "Twist", min: -1, max: 1, step: 0.01, default: 0 },
  { key: "step", label: "Beat stepping · glide → snap", min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: "glow", label: "Glow", min: 0, max: 1, step: 0.01, default: 0.45 },
  { key: "fill", label: "Fill · cells / blade width", min: 0, max: 1, step: 0.01, default: 0.2 },
];

const presets = [
  { name: "Scanner Bars", seed: 7101, params: { form: 0, count: 10, thickness: 0.14, speed: 0.6, twist: 0, step: 0.7, glow: 0.5, fill: 0.1 } },
  { name: "Slow Gate", seed: 7102, params: { form: 0, count: 4, thickness: 0.32, speed: 0.35, twist: 0.12, step: 0.2, glow: 0.7, fill: 0.6 } },
  { name: "Square Tunnel", seed: 7103, params: { form: 1, count: 9, thickness: 0.12, speed: 0.7, twist: 0.05, step: 0.6, glow: 0.45, fill: 0 } },
  { name: "Ring Dive", seed: 7104, params: { form: 1, count: 16, thickness: 0.08, speed: 1.1, twist: -0.3, step: 0.85, glow: 0.35, fill: 0.15 } },
  { name: "Horizon Grid", seed: 7105, params: { form: 2, count: 12, thickness: 0.06, speed: 0.55, twist: 0, step: 0.4, glow: 0.55, fill: 0 } },
  { name: "Shard Crown", seed: 7106, params: { form: 3, count: 7, thickness: 0.16, speed: 0.45, twist: 0.25, step: 0.65, glow: 0.4, fill: 0.35 } },
];

const fragment = `
// Anti-aliased band: 1 inside |x| < w, using the pixel footprint of x.
float pgBand(float x, float w) {
  float aa = max(fwidth(x), w * 0.7 * sq(1.0 - u_level) + 1e-4);
  return 1.0 - smoothstep(w - aa, w + aa, abs(x));
}
// Periodic line pattern along coordinate v with \`n\` lines per unit.
float pgLines(float v, float weight) {
  float f = abs(fract(v) - 0.5) * 2.0; // 0 at line centre, 1 between lines
  float aa = max(fwidth(v) * 2.0, weight * 0.7 * sq(1.0 - u_level) + 1e-4);
  return 1.0 - smoothstep(weight - aa, weight + aa, f);
}

void main() {
  float form = floor(u_params[0] + 0.5);
  float count = floor(u_params[1] + 0.5);
  float weight = u_params[2];
  float speed = u_params[3];
  float twist = u_params[4];
  float stepAmt = u_params[5];
  float glow = u_params[6];
  float fill = u_params[7];

  // Motion clock: glide with simulation time, or ease a quarter-cycle over
  // the first 30 % of each beat. Shared punch/pulse/flash own the kick light.
  float beat = u_beat;
  float snap = floor(beat) + smoothstep(0.0, 0.3, fract(beat));
  float travel = mix(u_time * speed * 0.6, snap * 0.25 * speed, stepAmt);
  float seedTurn = fract(u_seed * 0.0137);

  vec2 p = aspectUV();
  float aspect = u_resolution.x / u_resolution.y;
  float mask = 0.0, index = 0.0, depthFade = 1.0;

  if (form < 0.5) {
    // Bars: parallel bars sweeping across, the axis turning with twist.
    vec2 q = rot2(twist * 0.6 * travel + seedTurn * TAU) * p;
    float v = q.x * count * 0.5 / max(aspect, 1.0) + travel;
    mask = pgLines(v, weight);
    index = floor(v + 0.5);
  } else if (form < 1.5) {
    // Tunnel: nested squares rushing toward the viewer (log-depth rings).
    vec2 q = rot2(twist * travel * 0.8 + seedTurn * TAU) * p;
    float d = max(abs(q.x), abs(q.y));
    float z = log(max(d, 1e-3)) * count * 0.35 - travel * 2.0;
    mask = pgLines(z, weight);
    index = floor(z + 0.5);
    depthFade = smoothstep(0.0, 0.18, d);
  } else if (form < 2.5) {
    // Grid horizon: one ground plane beneath a high, offset vanishing point.
    // The open sky is intentional negative space, not an aspect crop.
    vec2 q = rot2(twist * 0.25) * p;
    float h = 0.22 - q.y;
    float z = 1.0 / max(h, 0.002);
    float lanes = pgLines((q.x - 0.18 * aspect) * z * count * 0.12, weight * 0.8);
    float rows = pgLines(z * count * 0.04 + travel, weight);
    mask = max(lanes, rows);
    index = floor(z * count * 0.04 + travel + 0.5);
    depthFade = smoothstep(0.02, 0.35, h);
  } else {
    // Shards: solid radial blades with staggered tips, not concentric rings.
    // Blades extend to the screen edges without stretching their angles.
    float sectors = max(3.0, count);
    float a = atan(p.y, p.x) + twist * travel * 0.7 + seedTurn * TAU;
    float r = length(p);
    float sector = floor(a / TAU * sectors);
    float wedge = abs(fract(a / TAU * sectors) - 0.5) * 2.0;
    float tip = 0.08 + 0.22 * (0.5 + 0.5 * sin(sector * 2.4 + travel));
    float blade = pgBand(wedge, 0.25 + weight + fill * 0.35);
    mask = blade * smoothstep(tip, tip + max(fwidth(r), 0.003), r);
    index = sector;
  }

  // Solid fill between lines: alternating cells glow faintly.
  float cell = step(0.5, fract(index * 0.5 + 0.25));
  float body = form < 2.5 ? fill * cell * 0.35 : 0.0;
  // Emissive colour per line; no scene-local brightness or accent strobe.
  float hue = fract(index * 0.137 + seedTurn);
  vec3 ink = palette(hue);
  vec3 col = ink * (mask + body);
  // Glow halo: widen the band softly (no extra passes).
  col += ink * glow * 0.35 * (1.0 - smoothstep(0.0, 0.6, 1.0 - mask));
  col *= depthFade;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "pulse",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { speed: [0.1, 1.6], step: [0.15, 1], thickness: [0.07, 0.16], count: [5, 20] },
  beat: { punch: 1.2, pulse: 1.2 },
  stage: ["speed", "count", "twist"],
  type: { key: "form", values: [0, 1, 2, 3] },
  number: 57,
  name: "Pulse Geometry",
  description:
    "Hard-edged emissive geometry on black that moves with the beat: sweeping bars, a square tunnel, a perspective grid horizon and solid radial shards with staggered tips. Pixel-footprint anti-aliasing preserves edges at any aspect; beat stepping blends smooth travel with eased quarter-cycle snaps. Kick punch, pulse and limited high-energy flashes come only from the shared layer.",
  schema,
  presets,
  fragment,
};
