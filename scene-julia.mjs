// Julia Observatory (v6 port, D32/D33): filaments of Julia sets whose
// parameter c travels along the edge of the Mandelbrot set, where the most
// intricate structure lives. Four types are different iteration maps:
// quadratic, cubic, burning (absolute fold) and a four-fold mirror.

const schema = [
  { key: "map", label: "Map · quadratic / cubic / burning / mirror", min: 0, max: 3, step: 1, default: 0 },
  { key: "drift", label: "Parameter drift", min: 0, max: 1.5, step: 0.01, default: 0.25 },
  { key: "zoom", label: "Zoom", min: 0.6, max: 4, step: 0.01, default: 1.2 },
  { key: "detail", label: "Iterations", min: 24, max: 128, step: 8, default: 72 },
  { key: "edge", label: "Edge · inside c-orbit → boundary", min: 0, max: 1, step: 0.01, default: 0.8 },
  { key: "spin", label: "Spin", min: -1, max: 1, step: 0.01, default: 0.05 },
  { key: "contrast", label: "Filament contrast", min: 0.5, max: 2, step: 0.01, default: 1.1 },
  { key: "bands", label: "Colour bands", min: 0, max: 1, step: 0.01, default: 0.35 },
];

const presets = [
  { name: "Seahorse Valley", seed: 9101, params: { map: 0, drift: 0.2, zoom: 1.3, detail: 80, edge: 0.92, spin: 0.03, contrast: 1.2, bands: 0.3 } },
  { name: "Cubic Lace", seed: 9102, params: { map: 1, drift: 0.3, zoom: 1.1, detail: 72, edge: 0.85, spin: -0.05, contrast: 1.1, bands: 0.5 } },
  { name: "Burning Coast", seed: 9103, params: { map: 2, drift: 0.25, zoom: 1.5, detail: 88, edge: 0.8, spin: 0, contrast: 1.4, bands: 0.2 } },
  { name: "Mirror Bloom", seed: 9104, params: { map: 3, drift: 0.35, zoom: 1.0, detail: 64, edge: 0.75, spin: 0.15, contrast: 1, bands: 0.6 } },
  { name: "Dust Filaments", seed: 9105, params: { map: 0, drift: 0.08, zoom: 2.4, detail: 112, edge: 0.98, spin: 0.01, contrast: 1.7, bands: 0.1 } },
  { name: "Storm Lens", seed: 9106, params: { map: 1, drift: 0.9, zoom: 0.9, detail: 48, edge: 0.7, spin: 0.4, contrast: 0.9, bands: 0.8 } },
];

const fragment = `
const int ITER_CAP = 128;

vec2 jCube(vec2 z) { return vec2(z.x * z.x * z.x - 3.0 * z.x * z.y * z.y, 3.0 * z.x * z.x * z.y - z.y * z.y * z.y); }

void main() {
  float map = floor(u_params[0] + 0.5);
  float drift = u_params[1];
  float zoom = u_params[2];
  float detail = u_params[3];
  float edge = u_params[4];
  float spin = u_params[5];
  float contrast = u_params[6];
  float bands = u_params[7];

  // c travels around the main cardioid's boundary (scaled by edge): the
  // closer to 1, the more filamentary the Julia set.
  float a = u_time * drift * 0.15 + fract(u_seed * 0.0071) * 6.2831853;
  vec2 cardioid = 0.5 * vec2(cos(a), sin(a)) - 0.25 * vec2(cos(2.0 * a), sin(2.0 * a));
  vec2 c = cardioid * mix(0.7, 1.0, edge);
  if (map > 0.5 && map < 1.5) c = 0.62 * vec2(cos(a * 1.3), sin(a)) * mix(0.75, 1.02, edge);
  if (map > 1.5 && map < 2.5) c = vec2(-0.55 + 0.25 * cos(a), -0.6 + 0.15 * sin(a * 1.4)) * mix(0.85, 1.0, edge);

  vec2 z = rot2(spin * u_time * 0.2) * aspectUV() * (2.6 / zoom);
  if (map > 2.5) {
    // Mirror: fold the plane four ways before iterating.
    z = abs(z);
    z = rot2(0.7853982) * z;
  }
  float n = 0.0, trap = 1e9;
  float limit = min(detail, float(ITER_CAP));
  for (int i = 0; i < ITER_CAP; ++i) {
    if (float(i) >= limit) break;
    if (map > 1.5 && map < 2.5) z = abs(z);
    z = (map > 0.5 && map < 1.5) ? jCube(z) + c : vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    trap = min(trap, abs(z.x * z.y));
    float m = dot(z, z);
    if (m > 256.0) {
      n = float(i) - log2(log2(m)) + 4.0; // smooth escape count
      break;
    }
    n = limit;
  }
  float escaped = step(n, limit - 0.5);
  float t = n / limit;
  // Filaments: brightness peaks just outside the set; the inside stays dark
  // apart from an orbit-trap glow.
  float filament = clamp(pow(t, 0.35) * (1.0 - t) * 4.0 * contrast, 0.0, 1.0) * escaped;
  float inside = (1.0 - escaped) * exp(-trap * 8.0) * 0.35;
  float hue = fract(n * 0.04 * bands + a * 0.05);
  vec3 col = palette(hue) * filament + u_accent * inside;
  col *= 0.85 + 0.4 * u_level;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export default {
  id: "julia",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { drift: [0.05, 1.1], spin: { mul: [0.4, 2.5] }, contrast: [0.9, 1.5], bands: [0.2, 0.7] },
  beat: { punch: 1, pulse: 1 },
  stage: ["drift", "zoom", "edge"],
  type: { key: "map", values: [0, 1, 2, 3] },
  number: 59,
  name: "Julia Observatory",
  description:
    "Julia-set filaments whose parameter travels around the edge of the Mandelbrot set. Four iteration maps give four structures: quadratic, cubic, burning-ship (absolute fold) and a four-fold mirror. Smooth escape counts light the filaments; the interior stays dark apart from an orbit-trap glow. A port of the v6 idea, not its Canvas2D code.",
  maxRenderWidth: 1280,
  schema,
  presets,
  fragment,
};
