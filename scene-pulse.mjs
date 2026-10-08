// Pulse Geometry (D60): clock-cut strobe geometry, not a full-screen flash.
// Analytic tiles, broken portals, a block floor and splintered radial blades
// gain count, subdivision, travel and a second shape layer with energy.
// All four forms compose in isotropic short-side coordinates at native aspect.

const schema = [
  {
    key: "form",
    label: "Form · bars / tunnel / grid / shards",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  { key: "count", label: "Shape count", min: 2, max: 32, step: 1, default: 8 },
  {
    key: "thickness",
    label: "Shape weight",
    min: 0.03,
    max: 0.5,
    step: 0.01,
    default: 0.18,
  },
  { key: "speed", label: "Travel", min: 0, max: 2, step: 0.01, default: 0.5 },
  { key: "twist", label: "Twist", min: -1, max: 1, step: 0.01, default: 0 },
  { key: "step", label: "Kick cuts", min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: "glow", label: "Glow", min: 0, max: 1, step: 0.01, default: 0.45 },
  {
    key: "fill",
    label: "Fill · cells / blade width",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.2,
  },
];

const presets = [
  {
    name: "Scanner Bars",
    seed: 7101,
    params: {
      form: 0,
      count: 10,
      thickness: 0.14,
      speed: 0.6,
      twist: 0,
      step: 0.7,
      glow: 0.5,
      fill: 0.1,
    },
  },
  {
    name: "Slow Gate",
    seed: 7102,
    params: {
      form: 0,
      count: 4,
      thickness: 0.32,
      speed: 0.35,
      twist: 0.12,
      step: 0.2,
      glow: 0.7,
      fill: 0.6,
    },
  },
  {
    name: "Square Tunnel",
    seed: 7103,
    params: {
      form: 1,
      count: 9,
      thickness: 0.12,
      speed: 0.7,
      twist: 0.05,
      step: 0.6,
      glow: 0.45,
      fill: 0,
    },
  },
  {
    name: "Ring Dive",
    seed: 7104,
    params: {
      form: 1,
      count: 16,
      thickness: 0.08,
      speed: 1.1,
      twist: -0.3,
      step: 0.85,
      glow: 0.35,
      fill: 0.15,
    },
  },
  {
    name: "Horizon Grid",
    seed: 7105,
    params: {
      form: 2,
      count: 12,
      thickness: 0.06,
      speed: 0.55,
      twist: 0,
      step: 0.4,
      glow: 0.55,
      fill: 0,
    },
  },
  {
    name: "Shard Crown",
    seed: 7106,
    params: {
      form: 3,
      count: 7,
      thickness: 0.16,
      speed: 0.45,
      twist: 0.25,
      step: 0.65,
      glow: 0.4,
      fill: 0.35,
    },
  },
];

const fragment = `
// Periodic hard bands, filtered before they become sub-pixel at the horizon.
float pgLines(float v, float weight) {
  float footprint = fwidth(v);
  float aa = max(footprint * 2.0, 0.002);
  float d = abs(fract(v) - 0.5) * 2.0;
  return (1.0 - smoothstep(weight - aa, weight + aa, d))
       * (1.0 - smoothstep(0.35, 0.9, footprint));
}
float pgBox(vec2 v, vec2 size) {
  vec2 d = abs(fract(v) - 0.5) - size;
  float aa = max(max(fwidth(v.x), fwidth(v.y)), 0.001);
  return (1.0 - smoothstep(-aa, aa, max(d.x, d.y)))
       * (1.0 - smoothstep(0.35, 0.9, aa));
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

  // The shared clock selects one of four configurations, exactly on a kick.
  // No time hash, random flicker, local light pulse or full-frame white.
  float cutAmt = smoothstep(0.7, 0.9, u_level) * stepAmt;
  float configuration = mod(floor(u_beat), 4.0);
  float cut = configuration * cutAmt;
  float travel = u_time * speed * 1.5;
  float seedTurn = fract(u_seed * 0.0137);
  float divisions = 1.0 + floor(u_level * 4.0);
  float layers = smoothstep(0.4, 0.9, u_level);
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = aspectUV() / min(aspect, 1.0);
  vec3 col = vec3(0.0);

  if (form < 0.5) {
    // Staggered scanner bricks: rows, slits and a counter-travelling chip layer.
    // At peak the whole stack alternates horizontal/vertical on the kick.
    float angle = twist * 0.35 + mod(configuration, 2.0) * cutAmt * PI * 0.5;
    vec2 q = rot2(angle) * p;
    vec2 cell = q * vec2(count * 0.3, count);
    float row = floor(cell.y);
    cell.x += travel + mod(row, 2.0) * 0.5
            + sin(row * 1.7 + travel) * 0.18 + cut * 0.25;
    vec2 size = vec2(0.43, 0.08 + weight * 0.35 + fill * 0.035);
    // Broad mid-energy slots read as shutters rather than a generic lattice;
    // subdivision accelerates into five slits per brick at energy 0.9.
    float brick = pgBox(cell, size) * pgLines(cell.x * (1.0 + floor(sq(u_level) * 5.0)), 0.76);
    vec3 ink = palette(fract(floor(cell.x) * 0.23 + row * 0.137 + seedTurn));
    col = ink * brick;
    col += ink * glow * 0.12 * pgBox(cell, size + 0.035);
    vec2 chips = q * vec2(count, count * 0.4) + vec2(-travel, travel * 0.7);
    float chip = pgBox(chips + cut * 0.17, vec2(0.055, 0.36));
    col = max(col, palette(fract(row * 0.19 + 0.8)) * chip * layers * 0.55);
  } else if (form < 1.5) {
    // Broken square portals: log-depth frames split into edge tiles, with an
    // offset counter-moving portal behind them at high energy.
    vec2 q = rot2(twist * travel * 0.25 + cut * PI * 0.125) * p;
    q -= vec2(sin(cut * PI * 0.5), cos(cut * PI * 0.5) - 1.0) * 0.06;
    float r = max(abs(q.x), abs(q.y));
    float z = log(max(r, 0.006)) * count * 0.36 - travel * 2.0;
    float tangent = abs(q.x) > abs(q.y) ? q.y : q.x;
    float segments = tangent / max(r, 0.006) * divisions + floor(z) * 0.25;
    // A bounded main portal gives the tunnel a focal silhouette, unlike the
    // edge-to-edge scanner wall. The rear layer opens up the surround at peak.
    float portal = 1.0 - smoothstep(0.42 + layers * 0.1, 0.44 + layers * 0.1, r);
    float frame = pgLines(z, weight * 1.3);
    frame *= mix(1.0, pgLines(segments + cut * 0.5, 0.64), layers);
    frame *= smoothstep(0.012, 0.06, r);
    vec3 ink = palette(fract(floor(z) * 0.173 + seedTurn));
    col = ink * frame * portal;
    col += ink * glow * 0.1 * pgLines(z, weight * 1.8) * portal;
    vec2 rear = rot2(-twist * travel * 0.3 - 0.2) * (p - vec2(0.24, 0.09));
    float rr = max(abs(rear.x), abs(rear.y));
    float rz = log(max(rr, 0.006)) * count * 0.27 + travel * 1.4;
    float rt = abs(rear.x) > abs(rear.y) ? rear.y : rear.x;
    float back = pgLines(rz, weight)
               * pgLines(rt / max(rr, 0.006) * divisions + cut * 0.25, 0.55)
               * smoothstep(0.015, 0.08, rr);
    col = max(col, palette(fract(floor(rz) * 0.21 + 0.85)) * back * layers * 0.5);
  } else if (form < 2.5) {
    // A single receding block floor keeps its open sky and off-axis vanishing
    // point. Peak tiles split into micro-cells above a separate circuit grid.
    vec2 q = rot2(twist * 0.2) * p;
    float h = 0.18 - q.y;
    float z = 0.22 / max(h, 0.02);
    vec2 cell = vec2((q.x - 0.14) * z * count * 0.32,
                     z * count * 0.22 - travel * 2.0);
    cell.x += cut * 0.25;
    float block = pgBox(cell, vec2(0.36 + fill * 0.04, 0.32));
    block *= pgBox(cell * divisions, vec2(0.39, 0.36));
    float depth = smoothstep(0.02, 0.13, h);
    vec3 ink = palette(fract(floor(cell.x) * 0.21 + floor(cell.y) * 0.137 + seedTurn));
    col = ink * block;
    col += ink * glow * 0.08 * pgBox(cell, vec2(0.4, 0.36));
    float circuit = max(pgLines(cell.x + 0.5, weight * 0.4),
                        pgLines(cell.y + 0.5 + travel * 0.3, weight * 0.4));
    col = max(col, palette(0.9) * circuit * layers * 0.55);
    col *= depth;
  } else {
    // Radial splinters, not rings: staggered tips, tapered angular blades and
    // radial cuts. A shorter, reversed crown interleaves behind the main fan.
    float r = length(p);
    float a = atan(p.y, p.x) / TAU + seedTurn + travel * 0.12 + twist * 0.1;
    float spoke = a * count + cut * 0.5;
    float sector = floor(spoke);
    float tip = 0.045 + 0.12 * fract(sector * 0.381966);
    float width = max(0.12, 0.32 + weight * 0.4 + fill * 0.1 - r * 0.16);
    float blade = pgLines(spoke, width) * smoothstep(tip, tip + 0.012, r);
    blade *= mix(1.0, pgLines(r * count * 0.7 - travel + sector * 0.17, 0.64), layers);
    vec3 ink = palette(fract(sector * 0.173 + seedTurn));
    col = ink * blade;
    col += ink * glow * 0.08 * pgLines(spoke, width + 0.08)
         * smoothstep(tip, tip + 0.012, r);
    float crown = pgLines((a - travel * 0.24) * count + 0.5 - cut * 0.5, 0.23)
                * pgLines(r * count - travel * 0.7, 0.72)
                * smoothstep(0.04, 0.09, r) * (1.0 - smoothstep(0.28, 0.38, r));
    col = max(col, palette(fract(sector * 0.21 + 0.9)) * crown * layers * 0.6);
  }

  // Energy changes geometry, not a full-frame exposure multiplier. Layering
  // uses max rather than an unbounded sum; the shared output owns flash safety.
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "pulse",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: {
    speed: { mul: [0.025, 3.5] },
    step: [0.2, 1],
    thickness: [0.1, 0.17],
    count: [3, 25],
  },
  beat: { punch: 1.2, pulse: 1.2 },
  stage: ["speed", "count", "twist"],
  type: { key: "form", values: [0, 1, 2, 3] },
  number: 57,
  name: "Pulse Geometry",
  description:
    "Kick-cut strobe geometry: staggered slotted scanner bricks, broken square portals, a receding block floor and radial splinters. Energy multiplies travel speed, adds shapes and subdivisions, and reveals a counter-moving second layer. Peak configurations cut only on the shared beat clock; colour comes from the live palette, while punch, pulse and limited flashes remain in the shared layer.",
  schema,
  presets,
  fragment,
};
