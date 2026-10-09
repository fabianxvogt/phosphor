// Truchet Tiles (#77): random tiles, continuous paths. Each square holds
// one of two Smith tiles (two quarter arcs around opposite corners), picked
// by a coin toss, and the arcs join into long meandering curves that never
// end. The curves split the plane into two colours, and that 2-colouring
// orients every curve consistently, so light pulses can run along all of
// them without ever meeting head-on. On every beat a few tiles re-toss
// their coin (crossfaded), and the paths re-route through the whole field.
//
// Variants: Smith arcs; 10 PRINT diagonals (the one-line maze); hexagonal
// tiles with three arcs each; and the Smith tiling in log-polar
// coordinates, an endless zooming tunnel.

// CPU reference of one Smith tile: local point f in [0,1]², cell parity,
// coin b. Returns the distance to the curve, the oriented flow parameter
// along the quarter arc (0 → 1) and the region colour (0 or 1).
export function smith([fx, fy], [cx, cy], b) {
  const c0 = b ? [1, 0] : [0, 0];
  const c1 = b ? [0, 1] : [1, 1];
  const d0 = Math.hypot(fx - c0[0], fy - c0[1]),
    d1 = Math.hypot(fx - c1[0], fy - c1[1]);
  const near0 = d0 < d1;
  const cc = near0 ? c0 : c1,
    dc = near0 ? d0 : d1;
  const band = (b ? 1 : 0) ^ ((((cx + cy) % 2) + 2) % 2);
  const inside = dc < 0.5;
  const region = inside ? 1 - band : band;
  const start =
    cc[0] === 0
      ? cc[1] === 0
        ? 0
        : -Math.PI / 2
      : cc[1] === 0
        ? Math.PI / 2
        : -Math.PI;
  let phi = (Math.atan2(fy - cc[1], fx - cc[0]) - start) / (Math.PI / 2);
  if (1 - band === 0) phi = 1 - phi; // the disc's colour decides the direction
  return { d: Math.abs(dc - 0.5), phi, region };
}

const fragment = `
float tHash(ivec2 c, float b, uint k) {
  return float(cellHash(uvec3(uint(c.x) * 2654435761u, uint(c.y), uint(int(b)) * 8u + k)) >> 8u) / 16777216.0;
}
// The coin of cell c at beat index b: its last re-toss within 16 beats,
// else the coin of the current 64-beat era.
bool tCoin(ivec2 c, float b, float flip) {
  for (int i = 0; i < 16; i++) {
    float bi = b - float(i);
    if (tHash(c, bi, 1u) < flip * 0.25) return tHash(c, bi, 2u) < 0.5;
  }
  return tHash(c, floor(b / 64.0) * 64.0 + 100000.0, 3u) < 0.5;
}
// Smith tile: x = distance to the curve, y = oriented flow parameter,
// z = region colour.
vec3 tSmith(vec2 f, ivec2 c, bool b) {
  vec2 c0 = b ? vec2(1.0, 0.0) : vec2(0.0);
  vec2 c1 = b ? vec2(0.0, 1.0) : vec2(1.0);
  float d0 = length(f - c0), d1 = length(f - c1);
  bool near0 = d0 < d1;
  vec2 cc = near0 ? c0 : c1;
  float dc = near0 ? d0 : d1;
  int band = (b ? 1 : 0) ^ ((c.x + c.y) & 1);
  float region = float(dc < 0.5 ? 1 - band : band);
  float start = cc.x < 0.5 ? (cc.y < 0.5 ? 0.0 : -0.5 * PI) : (cc.y < 0.5 ? 0.5 * PI : -PI);
  float phi = (atan(f.y - cc.y, f.x - cc.x) - start) / (0.5 * PI);
  if (band == 1) phi = 1.0 - phi;
  return vec3(abs(dc - 0.5), phi, region);
}
// 10 PRINT: one diagonal per cell.
vec3 tDiagonal(vec2 f, ivec2 c, bool b) {
  float d = b ? abs(f.x - f.y) : abs(f.x + f.y - 1.0);
  return vec3(d * 0.70710678, b ? f.x : f.y, float((c.x + c.y) & 1));
}
// Hexagonal tile: three 120° arcs around alternate vertices.
vec3 tHex(vec2 q, bool b) {
  float R = 0.57735027;
  float best = 1e9, phi = 0.0;
  for (int k = 0; k < 3; k++) {
    float a = PI / 6.0 + PI / 3.0 * float(2 * k + (b ? 1 : 0));
    vec2 v = R * vec2(cos(a), sin(a));
    float dv = length(q - v);
    float d = abs(dv - 0.5 * R);
    if (d < best) {
      best = d;
      phi = fract((atan(q.y - v.y, q.x - v.x) - a) / (TAU / 3.0));
    }
  }
  return vec3(best, phi, b ? 1.0 : 0.0);
}

void main() {
  int variant = int(floor(u_params[0] + 0.5));
  float scale = u_params[1];
  float flip = u_params[2];
  float flow = u_params[3];
  float pulse = u_params[4];
  float width = u_params[5];
  float fill = u_params[6];
  float spin = u_params[7];
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;
  float bNow = floor(beats);
  float fade = smoothstep(0.0, 0.22, fract(beats));

  vec2 uv = aspectUV();
  vec2 p;
  if (variant == 3) {
    // Log-polar: an even number of cells around keeps the colouring whole.
    float n = 2.0 * floor(scale * 0.5 + 0.5);
    float r = max(length(uv), 1e-4);
    p = vec2(log(r) - t * spin * 0.25, atan(uv.y, uv.x)) * n / TAU;
  } else {
    p = rot2(t * spin * 0.03) * uv * scale + vec2(t * 0.05, t * 0.031);
  }
  float px = max(length(fwidth(p)) * 0.7, 1e-5);

  vec3 now, before;
  if (variant == 2) {
    vec2 s = vec2(1.0, 1.7320508);
    vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
    vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
    vec4 hx = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + 0.5);
    ivec2 c = ivec2(floor(hx.zw * 2.0));
    now = tHex(hx.xy, tCoin(c, bNow, flip));
    before = tHex(hx.xy, tCoin(c, bNow - 1.0, flip));
  } else {
    ivec2 c = ivec2(floor(p));
    if (variant == 3) {
      int n = int(2.0 * floor(scale * 0.5 + 0.5));
      c.y = ((c.y % n) + n) % n;
    }
    vec2 f = fract(p);
    if (variant == 1) {
      now = tDiagonal(f, c, tCoin(c, bNow, flip));
      before = tDiagonal(f, c, tCoin(c, bNow - 1.0, flip));
    } else {
      now = tSmith(f, c, tCoin(c, bNow, flip));
      before = tSmith(f, c, tCoin(c, bNow - 1.0, flip));
    }
  }

  // Draw one tiling state; the flip crossfades two of them.
  vec3 colour = vec3(0.0);
  for (int pass = 0; pass < 2; pass++) {
    vec3 s = pass == 0 ? now : before;
    float w = pass == 0 ? fade : 1.0 - fade;
    if (w <= 0.0) continue;
    // Line width in tile units (bold at any resolution), anti-aliased.
    float wt = 0.025 + 0.13 * width;
    float line = 1.0 - smoothstep(wt - px, wt + px, s.x);
    float halo = exp(-max(s.x - wt, 0.0) / (0.6 * wt + 2.0 * px));
    // Pulses run along the oriented curves (standing on the hex tiles).
    float run = variant == 0 || variant == 3 ? fract(s.y * 2.0 - t * flow * 1.5)
      : 0.5 + 0.5 * sin(TAU * s.y * 2.0) * sin(t * flow * 3.0);
    float beam = pow(run, 6.0) * pulse;
    vec3 base = palette(s.z > 0.5 ? 0.18 : 0.62) * fill * 0.35;
    vec3 c = base * (1.0 - line) + mix(u_primary, vec3(1.0), 0.3) * (line * (0.55 + 0.45 * u_level) + 0.3 * halo);
    c += mix(u_accent, vec3(1.0), 0.5) * beam * (line + 0.15 * halo) * 1.4;
    colour += c * w;
  }
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "variant",
    label: "Tiles · Smith arcs / 10 PRINT / hexagons / log-polar tunnel",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "scale",
    label: "Tiles across (cells around)",
    min: 4,
    max: 40,
    step: 0.1,
    default: 9,
  },
  {
    key: "flip",
    label: "Re-toss per beat",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.2,
  },
  {
    key: "flow",
    label: "Pulse speed",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "pulse",
    label: "Pulse light",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "width",
    label: "Line width",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.35,
  },
  {
    key: "fill",
    label: "Two-colour fill",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "spin",
    label: "Turn · tunnel speed",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0.05,
  },
];

const look = (
  name,
  seed,
  variant,
  scale,
  flip,
  flow,
  pulse,
  width,
  fill,
  spin,
) => ({
  name,
  seed,
  params: { variant, scale, flip, flow, pulse, width, fill, spin },
});

const presets = [
  look("Smith Rivers", 7701, 0, 9, 0.15, 0.4, 0.6, 0.35, 0.5, 0.05),
  look("Flip Storm", 7702, 0, 14, 0.7, 0.6, 0.5, 0.25, 0.35, 0),
  look("Fat Loops", 7703, 0, 5, 0.2, 0.3, 0.7, 0.7, 0.6, 0.1),
  look("Pulse Field", 7704, 0, 7, 0.05, 0.9, 1, 0.45, 0.3, 0),
  look("10 PRINT", 7705, 1, 16, 0.25, 0.5, 0.4, 0.3, 0.2, 0),
  look("Diagonal Maze", 7706, 1, 10, 0.1, 0.3, 0.6, 0.5, 0.4, 0.05),
  look("Hex Rivers", 7707, 2, 8, 0.2, 0.4, 0.6, 0.4, 0.5, 0.05),
  look("Hex Lace", 7708, 2, 14, 0.4, 0.5, 0.5, 0.25, 0.3, -0.05),
  look("Truchet Tunnel", 7709, 3, 12, 0.2, 0.5, 0.6, 0.4, 0.5, 0.4),
  look("Spiral Weave", 7710, 3, 16, 0.35, 0.6, 0.5, 0.3, 0.4, -0.6),
];

export default {
  id: "truchet",
  number: 77,
  name: "Truchet Tiles",
  description:
    "Random tiles, endless paths. Every square tosses a coin between two Smith tiles, and their quarter arcs join into long meandering curves that never end. The curves split the plane into two colours, which orients them all consistently, so light pulses run along every path without meeting head-on. On each beat a few tiles re-toss and the paths re-route through the field. Variants: Smith arcs, 10 PRINT diagonals, hexagonal tiles, and a log-polar tunnel.",
  maxRenderWidth: 1600,
  energy: { flip: [-0.1, 0.4], flow: { mul: [0.5, 2] }, pulse: [-0.1, 0.25] },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "flip", feature: "onset", amount: 0.12 },
    { param: "pulse", feature: "high", amount: 0.1 },
    { param: "flow", feature: "low", amount: 0.06 },
  ],
  stage: ["flip", "flow", "pulse"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
};
