import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

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

// Rework 2026-10-14 (look audit #1): the set is lit as relief on a dark
// ground. A distance estimate draws the boundary as a constant-width glowing
// filament; the exterior carries normal-mapped relief (z/dz) that fades to
// black with distance from the set; the interior stays near black apart from
// sparse orbit-trap glints. Energy changes iterations and filament reach, not
// brightness.
const fragment = `${lateClockGlsl}
const int ITER_CAP = 128;

vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cdiv(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / max(dot(b, b), 1e-30); }

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
#ifdef PHOSPHOR_LATE
  // t · drift and t · spin: integrated clocks, so energy glides change speed only.
  float a = u_clock[0] * 0.15 + u_rhythm.z * 0.12 + fract(u_seed * 0.0071) * 6.2831853;
#else
  float a = u_time * drift * 0.15 + u_rhythm.z * 0.12 + fract(u_seed * 0.0071) * 6.2831853;
#endif
  vec2 cardioid = 0.5 * vec2(cos(a), sin(a)) - 0.25 * vec2(cos(2.0 * a), sin(2.0 * a));
  vec2 c = cardioid * mix(0.7, 1.0, edge);
  if (map > 0.5 && map < 1.5) c = 0.62 * vec2(cos(a * 1.3), sin(a)) * mix(0.75, 1.02, edge);
  if (map > 1.5 && map < 2.5) c = vec2(-1.1 + 0.12 * cos(a), -0.1 + 0.06 * sin(a * 1.4)) * mix(0.85, 1.0, edge);

  float scale = 2.6 / zoom;
  float pixel = scale / u_resolution.y;
#ifdef PHOSPHOR_LATE
  vec2 z = rot2(mod(u_clock[1] * 0.2, 6.2831853)) * aspectUV() * scale;
#else
  vec2 z = rot2(mod(spin * u_time * 0.2, 6.2831853)) * aspectUV() * scale;
#endif
  vec2 dz = vec2(1.0, 0.0);
  if (map > 2.5) {
    // Mirror: fold the plane four ways before iterating (an isometry, so the
    // distance estimate keeps its scale).
    z = rot2(0.7853982) * abs(z);
  }
  float n = 0.0, trap = 1e9;
  float limit = min(detail, float(ITER_CAP));
  float m = 0.0;
  bool escaped = false;
  for (int i = 0; i < ITER_CAP; ++i) {
    if (float(i) >= limit) break;
    if (map > 1.5 && map < 2.5) {
      // The absolute fold acts on the derivative as a reflection.
      dz *= vec2(z.x < 0.0 ? -1.0 : 1.0, z.y < 0.0 ? -1.0 : 1.0);
      z = abs(z);
    }
    if (map > 0.5 && map < 1.5) {
      vec2 z2 = cmul(z, z);
      dz = 3.0 * cmul(z2, dz);
      z = cmul(z2, z) + c;
    } else {
      dz = 2.0 * cmul(z, dz);
      z = cmul(z, z) + c;
    }
    trap = min(trap, abs(z.x * z.y));
    m = dot(z, z);
    if (m > 1024.0) {
      n = float(i) - log2(log2(m)) + 4.0; // smooth escape count
      escaped = true;
      break;
    }
  }
  float t = escaped ? clamp(n / limit, 0.0, 1.0) : 1.0;

  vec3 color = vec3(0.0);
  float boundaryPx = 0.0;
  if (escaped) {
    // Distance to the set in pixels (Hubbard–Douady estimate).
    float r = sqrt(m);
    float distance = 0.5 * r * log(r) / max(length(dz), 1e-30);
    boundaryPx = distance / pixel;
    float lineWidth = max(1.2, u_resolution.y / 900.0);
    float core = exp(-boundaryPx / lineWidth);
    float halo = exp(-boundaryPx / (lineWidth * 9.0));
    // Normal-mapped relief: z/dz points away from the set.
    vec2 u = normalize(cdiv(z, dz));
    vec3 normal = normalize(vec3(u, 0.7 / contrast));
    vec3 key = normalize(vec3(-0.55, 0.6, 0.6));
    float diffuse = max(0.0, dot(normal, key));
    float rim = pow(1.0 - normal.z, 2.0);
    float reach = exp(-boundaryPx / (26.0 * contrast * lineWidth));
    // Where the boundary is finer than a pixel (dust), escape counts alias:
    // show a dim haze instead of a speckled filament.
    float dust = smoothstep(1.0, 6.0, fwidth(n));
    core *= 1.0 - 0.85 * dust;
    halo *= 1.0 - 0.6 * dust;
    float potential = log2(max(n, 1.0));
    float band = 0.5 + 0.5 * cos(potential * 6.2831853 * (0.6 + bands * 2.0) - a * 0.3);
    vec3 ink = palette(clamp(0.18 + 0.42 * t + 0.25 * band * bands, 0.0, 1.0));
    float terrace = mix(1.0, 0.55 + 0.45 * band, bands);
    color += ink * (0.05 + 0.75 * diffuse) * terrace * reach * (1.0 - 0.7 * dust);
    color += mix(u_secondary, u_primary, 0.5) * rim * reach * 0.12;
    color += ink * dust * 0.10;
    // Equipotential lines spread from the set like a contour map; they fade
    // with distance, so the far ground stays black.
    float level = potential * (1.5 + 4.0 * bands);
    float isoline = 1.0 - smoothstep(0.6, 1.4, abs(fract(level) - 0.5) / max(fwidth(level), 1e-4));
    float far = exp(-boundaryPx / (110.0 * lineWidth));
    color += palette(clamp(0.25 + 0.5 * fract(level / 7.0), 0.0, 1.0)) * isoline * far * (1.0 - dust) * 0.30;
    color += mix(u_primary, vec3(1.0), 0.35) * core * 1.15;
    color += mix(ink, u_accent, 0.35) * halo * 0.18;
    // Rhythm: chase selected smooth escape contours near the boundary.
    float contour = exp(-pow((mod(n, 12.0) - mod(u_rhythmCount.x, 6.0) * 2.0) / 0.8, 2.0));
    color += ink * contour * reach * u_rhythm.x * 0.8;
  } else {
    // Interior: near black, with rare orbit-trap glints in accent.
    // Glints fade where the trap aliases (chaotic interiors stay quiet).
    float calm = 1.0 - smoothstep(0.2, 1.5, fwidth(log(trap + 1e-6)));
    float glint = exp(-trap * 900.0) * calm;
    float filigree = exp(-trap * 120.0) * calm;
    color += u_secondary * 0.012 + mix(u_secondary, u_primary, 0.45) * filigree * 0.13
           + u_accent * glint * 0.22;
    color += u_accent * exp(-trap * 120.0) * calm * u_rhythm.y * 0.6;
  }
  outColor = vec4(max(color, 0.0), 1.0);
}
`;

export default {
  rhythm: [
    familyEffect("escape-contour", 0, "Escape-contour chase", "Highlight selected smooth escape-iteration contours outside the Julia set."),
    familyEffect("orbit-trap", 1, "Orbit-trap light", "Reveal the measured orbit trap inside the non-escaping set.", { period: 3, strength: 0.55 }),
    familyEffect("parameter-excursion", 2, "Julia parameter excursion", "Move the map parameter a short distance along its authored path.", { period: 16, strength: 0.5, duration: 2, kind: "motion" }),
  ],
  id: "julia",
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { drift: [0.05, 1.1], spin: { mul: [0.4, 2.5] }, detail: { mul: [0.6, 1.15] }, edge: [-0.06, 0.04] },
  beat: { punch: 1, pulse: 1 },
  stage: ["drift", "zoom", "edge"],
  type: { key: "map", values: [0, 1, 2, 3] },
  number: 59,
  name: "Julia Observatory",
  description:
    "Julia-set filaments whose parameter travels around the edge of the Mandelbrot set. Four iteration maps give four structures: quadratic, cubic, burning-ship (absolute fold) and a four-fold mirror. Smooth escape counts light the filaments; the interior stays dark apart from an orbit-trap glow. A port of the v6 idea, not its Canvas2D code.",
  schema,
  presets,
  fragment,
  clocks: [{ rate: (p) => p[1] }, { rate: (p) => p[5], period: 10 * Math.PI }],
};
