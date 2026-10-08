// Hyperbolic Loom (v6 port, D32/D33): regular tilings of the hyperbolic
// plane in the Poincaré disk, drifting under Möbius motion so the weave
// flows endlessly toward the rim. Each point is reflected into the
// fundamental triangle; tile edges are its third (circular) mirror. Four
// types are different tilings: {7,3}, {5,4}, {4,5} and {3,8}.

const schema = [
  { key: "tiling", label: "Tiling · {7,3} / {5,4} / {4,5} / {3,8}", min: 0, max: 3, step: 1, default: 0 },
  { key: "drift", label: "Möbius drift", min: 0, max: 1.5, step: 0.01, default: 0.3 },
  { key: "turn", label: "Rotation", min: -1, max: 1, step: 0.01, default: 0.05 },
  { key: "weight", label: "Edge weight", min: 0.004, max: 0.05, step: 0.001, default: 0.014 },
  { key: "fill", label: "Tile fill", min: 0, max: 1, step: 0.01, default: 0.35 },
  { key: "spokes", label: "Inner spokes", min: 0, max: 1, step: 0.01, default: 0.3 },
  { key: "cover", label: "Disk · fit → cover screen", min: 0, max: 1, step: 0.01, default: 0.6 },
  { key: "glow", label: "Rim glow", min: 0, max: 1.5, step: 0.01, default: 0.6 },
];

const presets = [
  { name: "Heptagon Weave", seed: 9301, params: { tiling: 0, drift: 0.3, turn: 0.05, weight: 0.014, fill: 0.35, spokes: 0.25, cover: 0.6, glow: 0.6 } },
  { name: "Pentagon Lattice", seed: 9302, params: { tiling: 1, drift: 0.25, turn: -0.08, weight: 0.012, fill: 0.5, spokes: 0.4, cover: 0.7, glow: 0.7 } },
  { name: "Square Abyss", seed: 9303, params: { tiling: 2, drift: 0.4, turn: 0.1, weight: 0.01, fill: 0.2, spokes: 0.6, cover: 0.9, glow: 0.8 } },
  { name: "Triangle Storm", seed: 9304, params: { tiling: 3, drift: 0.6, turn: 0.25, weight: 0.008, fill: 0.6, spokes: 0.1, cover: 0.5, glow: 0.5 } },
  { name: "Quiet Disk", seed: 9305, params: { tiling: 0, drift: 0.08, turn: 0.02, weight: 0.02, fill: 0.15, spokes: 0, cover: 0, glow: 1.2 } },
  { name: "Endless Floor", seed: 9306, params: { tiling: 1, drift: 0.9, turn: 0, weight: 0.009, fill: 0.45, spokes: 0.5, cover: 1, glow: 0.4 } },
];

const fragment = `
const int FOLD_CAP = 40;

vec2 hlMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 hlDiv(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / max(dot(b, b), 1e-9); }

void main() {
  float tiling = floor(u_params[0] + 0.5);
  float drift = u_params[1], turn = u_params[2], weight = u_params[3];
  float fillAmount = u_params[4], spokes = u_params[5], cover = u_params[6], glow = u_params[7];
  float p = tiling < 0.5 ? 7.0 : tiling < 1.5 ? 5.0 : tiling < 2.5 ? 4.0 : 3.0;
  float q = tiling < 0.5 ? 3.0 : tiling < 1.5 ? 4.0 : tiling < 2.5 ? 5.0 : 8.0;

  // Disk radius from fitting the screen height to covering its diagonal.
  float aspect = u_resolution.x / u_resolution.y;
  float radius = mix(0.48, 0.5 * length(vec2(aspect, 1.0)), cover);
  vec2 z = aspectUV() / radius;
  float rr = dot(z, z);
  if (rr >= 1.0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  // Möbius motion: translate along a slowly turning direction, then rotate.
  float t = u_time;
  float phase = fract(u_seed * 0.0057) * 6.2831853;
  vec2 a = 0.55 * vec2(cos(t * drift * 0.13 + phase), sin(t * drift * 0.09 + phase));
  z = hlDiv(z + a, vec2(1.0, 0.0) + hlMul(vec2(a.x, -a.y), z));
  z = rot2(t * turn * 0.2) * z;

  // Fundamental triangle: angle π/p at the origin, π/q at the polygon
  // vertex and π/2 on the x-axis. Its third side is a circle orthogonal to
  // the unit circle with centre (c, 0) and radius r.
  float sp = sin(3.1415927 / p), cp = cos(3.1415927 / p), cq = cos(3.1415927 / q);
  float r = 1.0 / sqrt(cq * cq / (sp * sp) - 1.0);
  float c = sqrt(1.0 + r * r);
  vec2 n = vec2(-sp, cp); // normal of the mirror line at angle π/p
  float parity = 0.0;
  for (int i = 0; i < FOLD_CAP; ++i) {
    bool changed = false;
    if (z.y < 0.0) { z.y = -z.y; parity += 1.0; changed = true; }
    float s = dot(z, n);
    if (s > 0.0) { z -= 2.0 * s * n; parity += 1.0; changed = true; }
    vec2 d = z - vec2(c, 0.0);
    float dd = dot(d, d);
    if (dd < r * r) { z = vec2(c, 0.0) + d * (r * r / dd); parity += 1.0; changed = true; }
    if (!changed) break;
  }
  // Tile edges are the circle mirror; spokes are the two straight mirrors.
  float dEdge = abs(length(z - vec2(c, 0.0)) - r);
  float dSpoke = min(abs(z.y), abs(dot(z, n)));
  // Hyperbolic scale: lines thin toward the rim like the tiles themselves.
  float scale = (1.0 - rr);
  float aa = fwidth(dEdge) + 1e-5;
  float edge = 1.0 - smoothstep(weight * scale - aa, weight * scale + aa, dEdge);
  float aa2 = fwidth(dSpoke) + 1e-5;
  float spoke = (1.0 - smoothstep(weight * 0.5 * scale - aa2, weight * 0.5 * scale + aa2, dSpoke)) * spokes;
  float tile = mod(parity, 2.0);
  vec3 ink = palette(fract(0.15 + 0.5 * tile + 0.1 * sin(t * 0.1)));
  float kick = exp(-fract(u_beat) * 6.0);
  vec3 col = ink * fillAmount * 0.18 * (0.6 + 0.4 * tile);
  col += mix(u_primary, u_accent, tile) * edge * (0.85 + 0.4 * kick * u_level);
  col += u_secondary * spoke * 0.6;
  col += u_accent * glow * 0.25 * smoothstep(0.55, 1.0, rr);
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "hyperbolic",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { drift: [0.06, 1.2], turn: { mul: [0.4, 2.5] }, fill: [0.15, 0.6] },
  beat: { punch: 1, pulse: 1.1 },
  stage: ["drift", "turn", "fill"],
  type: { key: "tiling", values: [0, 1, 2, 3] },
  number: 62,
  name: "Hyperbolic Loom",
  description:
    "Regular tilings of the hyperbolic plane — {7,3}, {5,4}, {4,5} and {3,8} — in the Poincaré disk, drifting under Möbius motion so the weave flows endlessly toward the rim. Points are folded into the fundamental triangle by reflection; tile edges, inner spokes and alternating tile parity are drawn from the folded point, thinning toward the rim. A port of the v6 idea, not its Canvas2D code.",
  schema,
  presets,
  fragment,
};
