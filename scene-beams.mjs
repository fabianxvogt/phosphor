// Light Beams (new, D32): laser fans and searchlight beams in haze — the
// club's own light language, emissive on black. Analytic and cheap; beams
// switch in beat patterns as energy rises. Four types: fan, pillars,
// crossfire and starburst.

const schema = [
  { key: "form", label: "Form · fan / pillars / crossfire / starburst", min: 0, max: 3, step: 1, default: 0 },
  { key: "count", label: "Beams", min: 2, max: 24, step: 1, default: 9 },
  { key: "width", label: "Beam width", min: 0.002, max: 0.05, step: 0.001, default: 0.008 },
  { key: "sweep", label: "Sweep speed", min: 0, max: 2, step: 0.01, default: 0.4 },
  { key: "spread", label: "Spread", min: 0.1, max: 1, step: 0.01, default: 0.6 },
  { key: "haze", label: "Haze", min: 0, max: 1, step: 0.01, default: 0.55 },
  { key: "chase", label: "Beat chase · steady → patterns", min: 0, max: 1, step: 0.01, default: 0.3 },
  { key: "tilt", label: "Tilt", min: -1, max: 1, step: 0.01, default: 0 },
];

const presets = [
  { name: "Laser Fan", seed: 8101, params: { form: 0, count: 11, width: 0.006, sweep: 0.45, spread: 0.7, haze: 0.5, chase: 0.35, tilt: 0 } },
  { name: "Slow Searchlights", seed: 8102, params: { form: 1, count: 5, width: 0.03, sweep: 0.12, spread: 0.45, haze: 0.85, chase: 0, tilt: 0 } },
  { name: "Crossfire", seed: 8103, params: { form: 2, count: 8, width: 0.005, sweep: 0.6, spread: 0.6, haze: 0.4, chase: 0.6, tilt: 0.1 } },
  { name: "Starburst", seed: 8104, params: { form: 3, count: 16, width: 0.004, sweep: 0.3, spread: 1, haze: 0.45, chase: 0.25, tilt: 0 } },
  { name: "Cathedral Haze", seed: 8105, params: { form: 1, count: 9, width: 0.018, sweep: 0.25, spread: 0.9, haze: 1, chase: 0.1, tilt: -0.2 } },
  { name: "Strobe Fan", seed: 8106, params: { form: 0, count: 18, width: 0.003, sweep: 1.1, spread: 0.95, haze: 0.3, chase: 0.95, tilt: 0 } },
];

const fragment = `
const int BEAM_CAP = 24;

float lbHash(float n) { return fract(sin(n * 127.1 + u_seed * 0.013) * 43758.5453); }

// Light from one beam: a sharp core and a hazy halo around a half-line
// from origin o in direction d (screen units), fading with distance.
float lbBeam(vec2 p, vec2 o, vec2 d, float width, float haze) {
  vec2 v = p - o;
  float along = dot(v, d);
  if (along < 0.0) return 0.0;
  float across = abs(v.x * d.y - v.y * d.x);
  float w = width * (1.0 + along * 0.6);
  float aa = fwidth(across) + 1e-4;
  float core = 1.0 - smoothstep(w - aa, w + aa, across);
  float halo = haze * 0.12 / (1.0 + pow(across / (w * 6.0), 2.0));
  return (core + halo) * exp(-along * (0.35 + 0.9 * (1.0 - haze)));
}

void main() {
  float form = floor(u_params[0] + 0.5);
  float count = floor(u_params[1] + 0.5);
  float width = u_params[2];
  float sweep = u_params[3];
  float spread = u_params[4];
  float haze = u_params[5];
  float chase = u_params[6];
  float tilt = u_params[7];
  vec2 p = aspectUV();
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time * sweep;
  float beatIndex = floor(u_beat);
  float kick = exp(-fract(u_beat) * 5.0);
  vec3 col = vec3(0.0);

  for (int i = 0; i < BEAM_CAP; ++i) {
    float fi = float(i);
    if (fi >= count) break;
    float k = count > 1.0 ? fi / (count - 1.0) - 0.5 : 0.0; // -0.5..0.5
    vec2 o;
    float angle;
    if (form < 0.5) {
      // Fan: one source below the screen, beams spread and sweep together.
      o = vec2(0.0, -0.62);
      angle = 1.5708 + tilt * 0.6 + k * spread * 2.4 + sin(t + fi * 0.15) * 0.35 * spread;
    } else if (form < 1.5) {
      // Pillars: searchlights along the bottom edge, each swaying alone.
      o = vec2(k * aspect * 0.95, -0.58);
      angle = 1.5708 + tilt * 0.5 + sin(t * (0.7 + lbHash(fi) * 0.6) + fi * 1.7) * 0.45 * spread;
    } else if (form < 2.5) {
      // Crossfire: two banks from the lower corners crossing in the middle.
      float side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
      o = vec2(side * aspect * 0.5, -0.5 + 0.08 * floor(fi * 0.5));
      angle = 1.5708 - side * (0.55 + 0.35 * spread * sin(t + fi * 0.6)) + tilt * 0.4;
    } else {
      // Starburst: rays radiating from the centre, rotating.
      o = vec2(0.0);
      angle = fi / count * 6.2831853 + t * 0.4 + tilt;
    }
    vec2 d = vec2(cos(angle), sin(angle));
    // Beat chase: beams switch on in shifting patterns; steady when zero.
    float on = step(lbHash(fi + beatIndex * 7.0), 1.0 - 0.6 * chase);
    float gate = mix(1.0, on * (0.55 + 0.45 * kick), chase);
    vec3 ink = palette(fract(fi / max(count, 1.0) * 0.8 + 0.1 * sin(t * 0.3)));
    col += ink * lbBeam(p, o, d, width, haze) * gate;
  }
  // Haze glow near the sources and a whisper of floor light.
  col *= 0.9 + 0.5 * u_level * kick;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "beams",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { sweep: [0.1, 1.4], chase: [0, 0.95], count: [5, 18], haze: [0.8, 0.35] },
  beat: { punch: 0.6, pulse: 1.3 },
  stage: ["sweep", "spread", "chase"],
  type: { key: "form", values: [0, 1, 2, 3] },
  number: 58,
  name: "Light Beams",
  description:
    "Laser fans and searchlight beams in haze, emissive on black: a fan from below, swaying pillars along the floor, crossfire from both corners and a rotating starburst. Each beam has an anti-aliased core and a haze halo that fade with distance. Beat chase switches beams in shifting patterns, rising with energy.",
  schema,
  presets,
  fragment,
};
