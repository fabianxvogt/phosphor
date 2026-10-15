import { familyEffect } from "./family-rhythm.mjs";
import { cameraGLSL, createGeometry, layerGLSL, LAYERS } from "./fibration-geometry.mjs";

// Hopf Bloom (#96): the Hopf fibration of the 3-sphere as lit tubes in
// space. Every tube is one exact fibre (a great circle of S³ over one point
// of S²), stereographically projected to a round circle; any two of them are
// linked once. Development blooms one latitude torus of Villarceau circles
// into nested tori and then the full bundle around its core circle. The mesh
// is fixed per seed; development, flow, tumble and camera are uniforms.

// Integrated phases (24-bit fractions), so energy changes speeds, never
// positions: x camera yaw, y flow along the fibres, z tumble, w camera drift.
const simulation = `
float unpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
vec4 pack24(float x) {
  float n = floor(fract(x) * 16777216.);
  float b0 = floor(n / 65536.); n -= b0 * 65536.;
  float b1 = floor(n / 256.); n -= b1 * 256.;
  return vec4(b0, b1, n, 255.) / 255.;
}
void main() {
  int i = int(gl_FragCoord.x);
  float phase = unpack24(texelFetch(u_state, ivec2(i, 0), 0));
  float seed = fract(u_seed * (0.0137 + 0.0071 * float(i)));
  float rate = i == 0 ? u_params[3] * 0.0105
             : i == 1 ? u_params[1] * 0.075
             : i == 2 ? (0.25 + 0.75 * u_params[2]) * 0.011
             : 0.0045;
  outColor = pack24(u_reset ? seed : phase + u_dt * rate);
}
`;

const shared = `
vec3 ground(vec2 frag) {
  vec2 p = (frag - .5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  // Broad, low studio haze: keep a visible palette ground between fibres,
  // without painting a bright disc behind the sculpture.
  vec2 q = p - vec2(-.15, .12);
  float glow = exp(-dot(q, q) * 1.7);
  return u_secondary * .028 + mix(u_secondary, u_primary, .25) * .1 * glow;
}
`;

const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec2 a_fibre;
uniform float u_params[8];
uniform vec2 u_resolution;
uniform float u_seed, u_kick, u_level;
uniform vec4 u_rhythm, u_rhythmCount;
uniform sampler2D u_state;
uniform vec3 u_primary, u_secondary, u_accent;
out vec3 v_normal, v_view, v_color;
out float v_s, v_core, v_fog, v_glow, v_cohort, v_u, v_shell, v_cover, v_heart;
flat out float v_layer, v_phi;
const float PI = 3.14159265359, TAU = 6.28318530718;
${layerGLSL()}
${cameraGLSL()}
float unpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
float phase(int i) { return unpack24(texelFetch(u_state, ivec2(i, 0), 0)); }
vec3 palette(float t) { return mix(mix(u_secondary,u_primary,smoothstep(0.,.65,t)),u_accent,smoothstep(.65,1.,t)); }
void main() {
  gl_Position = vec4(2., 2., 2., 1.);
  int local = gl_VertexID % PER_FIBRE, quad = local / 6, corner = local - quad * 6;
  int seg = quad / SIDES, side = quad - seg * SIDES;
  int du = corner == 1 || corner == 4 || corner == 5 ? 1 : 0;
  int dv = corner == 2 || corner == 3 || corner == 5 ? 1 : 0;
  float u = float(seg + du) / float(SEGMENTS);
  float ring = TAU * float(side + dv) / float(SIDES);
  float dev = u_params[0];
  int layer = int(floor(a_fibre.y * .25));
  float start = a_fibre.y - 4. * float(layer) - 1.;
  float g = clamp((dev - start) / GROW, 0., 1.);
  if (g <= 0.) return;

  // The fibre over (θ, φ): q(s) = (cos η e^{i(s+φ)}, sin η e^{is}), η = θ/2.
  float theta = layerTheta(layer, dev), eta = .5 * theta, phi = a_fibre.x;
  float arc = TAU * fract(phi * 5.137 + float(layer) * .31);
  float s = arc + u * TAU * g;
  vec4 q = vec4(cos(eta) * cos(s + phi), cos(eta) * sin(s + phi), sin(eta) * cos(s), sin(eta) * sin(s));
  vec4 dq = vec4(-q.y, q.x, -q.w, q.z); // q'(s); q''(s) = -q(s)
  // 4D tumble in the (x1, y2) plane, bounded by the pole margin.
  float a = u_params[2] * safeTumble(dev) * sin(TAU * phase(2));
  float ca = cos(a), sa = sin(a);
  q = vec4(ca * q.x - sa * q.w, q.y, q.z, sa * q.x + ca * q.w);
  dq = vec4(ca * dq.x - sa * dq.w, dq.y, dq.z, sa * dq.x + ca * dq.w);
  // Stereographic projection and its exact first and second derivatives.
  float D = 1. - q.w, dD = -dq.w, ddD = q.w;
  vec3 x = q.xyz, dx = dq.xyz;
  vec3 p = x / D;
  vec3 dp = dx / D - x * dD / (D * D);
  vec3 ddp = -x / D - 2. * dx * dD / (D * D) - x * ddD / (D * D) + 2. * x * dD * dD / (D * D * D);
  // Torus axis (projected z) is the world's vertical.
  p = p.xzy; dp = dp.xzy; ddp = ddp.xzy;
  vec3 T = normalize(dp), B = cross(dp, ddp);
  B = length(B) > 1e-6 ? normalize(B) : normalize(cross(T, vec3(0., 1., .3)));
  vec3 N = cross(B, T);
  // Tubes swell gently with the conformal scale of the projection; they
  // taper while a fibre is still growing around its circle.
  float arcEnd = min(u, 1. - u) * TAU * g;
  float taper = mix(smoothstep(0., .55, arcEnd), 1., smoothstep(.82, 1., g));
  float shellOut = smoothstep(1.62, 2.1, theta);
  float radius = .036 * u_params[4] * pow(.5 + .5 * dot(p, p), .2) * sqrt(g) * taper;
  radius *= mix(1., 1.14, smoothstep(.9, 2., dev)) * (1. - .3 * shellOut);
  vec3 n = cos(ring) * N + sin(ring) * B;

  // Dolly from a frame-filling torus into the outer bundle. At the climax
  // the eye is inside its projection ball, above the swept tube envelope:
  // foreground arcs pass the frame while the linked core stays legible.
  float full = smoothstep(1., 2., dev), focal, dist;
  vec3 eye, target;
  cameraAt(dev, TAU * phase(0), TAU * phase(3), a, eye, target, focal, dist);
  vec3 fwd = normalize(target - eye), right = normalize(cross(fwd, vec3(0., 1., 0.))), up = cross(right, fwd);
  float minSide = min(u_resolution.x, u_resolution.y);
  // Keep every tube at least ~1.3 px wide; thinner tubes dim instead.
  float depth = max(.2, dot(p - eye, fwd));
  float minRadius = 1.3 * depth / (focal * .5 * minSide);
  v_cover = clamp(radius / minRadius, 0., 1.);
  radius = max(radius, minRadius * step(.001, g * taper));
  vec3 world = p + radius * n;
  vec3 rel = world - eye;
  vec3 view = vec3(dot(rel, right), dot(rel, up), -dot(rel, fwd));
  float near = .2, far = 40.;
  gl_Position = vec4(view.x * focal * minSide / u_resolution.x, view.y * focal * minSide / u_resolution.y,
                     (view.z * (far + near) + 2. * far * near) / (near - far), -view.z);
  v_normal = vec3(dot(n, right), dot(n, up), -dot(n, fwd));
  v_view = view;
  v_fog = -view.z;

  // Colour is the map: the base point (θ, φ) on S² picks the palette.
  // Latitude sets the shell's tone (inner shells warmer), longitude
  // shades around each torus, so nested tori read as separate layers.
  float lon = .5 - .5 * cos(phi), lat = clamp(theta / 2.1, 0., 1.);
  v_color = palette(.1 + .4 * (1. - lat) + .2 * (lon - .5) + .06);
  v_color *= .82 + .3 * lon;
  if (theta < .01) v_color = mix(u_accent, u_primary, .3);
  v_shell = shellOut;
  v_heart = smoothstep(1.3, .4, theta) * (1. + .8 * full);
  // Nested occlusion: faces turned towards the core circle sit inside the
  // tori that have already bloomed around it.
  vec3 core = vec3(normalize(p.xz + 1e-5).x, 0., normalize(p.xz + 1e-5).y);
  float inside = 0.;
  for (int k = 1; k < LAYER_COUNT; k++)
    inside += smoothstep(LAYER_A[k], LAYER_B[k], dev) * step(LAYER_THETA[k], theta - .01);
  v_core = clamp(dot(n, normalize(core - p)), 0., 1.) * (.25 + .12 * inside);
  v_s = s; v_u = u * g;
  v_layer = float(layer); v_phi = phi;
  // Rhythm cohorts: x a group of whole fibres, y one latitude torus, z one
  // meridian band of fibres through every torus.
  // φ = twist + (j + jitter)·TAU/n, so this recovers the fibre's index j up
  // to a per-layer offset: every third fibre of every torus forms a cohort.
  float fibreIndex = floor(phi * LAYER_N[layer] / TAU + .5);
  v_cohort = u_rhythm.x * step(mod(fibreIndex - u_rhythmCount.x, 3.), .5);
  float shell = mod(u_rhythmCount.y, 5. + 4. * smoothstep(1., 2., dev));
  v_glow = u_rhythm.y * step(abs(float(layer) - shell), .5);
  float meridian = fract(u_rhythmCount.z * .381966) * TAU;
  v_glow += u_rhythm.z * .8 * exp(-pow(sin(.5 * (phi - meridian)) / .2, 2.));
}`;

const surface = `#version 300 es
precision highp float;
in vec3 v_normal, v_view, v_color;
in float v_s, v_core, v_fog, v_glow, v_cohort, v_u, v_shell, v_cover, v_heart;
flat in float v_layer, v_phi;
uniform float u_params[8];
uniform float u_level;
uniform vec2 u_resolution;
uniform vec3 u_primary, u_secondary, u_accent;
uniform sampler2D u_state;
out vec4 outColor;
const float PI = 3.14159265359, TAU = 6.28318530718;
${shared}
float unpack24(vec4 c) { vec3 b = floor(c.rgb * 255. + .5); return dot(b, vec3(65536., 256., 1.)) / 16777216.; }
void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(-v_view);
  if (dot(N, V) < 0.) N = -N;
  vec3 L = normalize(vec3(-.45, .75, .55));
  float diffuse = max(0., dot(N, L)), wrap = .5 + .5 * dot(N, L);
  float nv = max(0., dot(N, V)), grazing = 1. - nv;
  float fresnel = grazing * grazing * grazing;
  float spec = pow(max(0., dot(N, normalize(L + V))), 64.);
  float ao = 1. - v_core;
  vec3 base = v_color;
  // Outer shells are glassy (rim-lit, dim body) so inner tori show through.
  float body = 1. - .3 * v_shell;
  float back = max(0., dot(N, normalize(vec3(.6, -.1, -.7))));
  vec3 color = base * (.03 + (.74 * diffuse + .14 * wrap) * ao * body);
  color += mix(base, u_secondary, .55) * back * .13 * body;
  vec3 rim = mix(mix(u_secondary, vec3(1.), .3), u_accent, .08);
  color += rim * fresnel * (.48 + .5 * v_shell) * (.55 + .45 * ao);
  color += mix(base, vec3(1.), .55) * spec * .85 * ao * body;
  // The circle action: light beads flow along every fibre at once.
  float flow = unpack24(texelFetch(u_state, ivec2(1, 0), 0));
  // Bead count rises with detail; the next bead fades in, never jumps.
  float n = 1. + 3. * u_params[5], n0 = floor(n);
  float arg = v_s - TAU * flow;
  // A filtered light window, rather than two expensive high-exponent
  // lobes per foreground pixel. The next bead still enters continuously.
  float bead = mix(smoothstep(.973, 1., .5 + .5 * cos(n0 * arg + v_phi * 2.)),
                   smoothstep(.973, 1., .5 + .5 * cos((n0 + 1.) * arg + v_phi * 2.)), smoothstep(.2, .8, n - n0));
  color += (mix(base, u_accent, .3) * 1.1 + .2) * bead * .7;
  // The core circle (all fibres over the north pole) is the one accent ring.
  if (v_layer > 7.5) color += u_accent * (.35 + .5 * wrap);
  // The innermost shells are the focus: a faint inner light.
  color += base * v_heart * (.12 + .45 * wrap);
  color += mix(base, u_accent, .6) * v_glow * (.35 + .9 * fresnel);
  if (v_cohort > .001) {
    float chase = pow(.5 + .5 * cos(v_s - TAU * flow * 3. - v_phi), 8.);
    color = mix(color, mix(base * 1.5, u_accent, .15) * (.5 + .9 * diffuse), .5 * v_cohort);
    color += mix(u_accent, vec3(1.), .4) * v_cohort * 1.1 * chase;
  }
  color *= v_cover;
  // Atmosphere: distance fades towards the ground; silhouettes soften into
  // it over about a pixel, which keeps thin tubes from shimmering.
  vec3 ground = ground(gl_FragCoord.xy);
  float fog = 1. - exp(-max(0., v_fog - 1.8) * .07);
  color = mix(color, ground, clamp(fog, 0., .88));
  color = mix(ground, color, smoothstep(0., max(fwidth(nv) * 1.5, .02), nv));
  // The shared post chain handles display transfer; no per-tube RGB power.
  outColor = vec4(max(color, vec3(0.)) * 1.08, 1.);
}`;

const schema = [
  {
    key: "development",
    label: "Development · torus / nest / bundle",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  { key: "flow", label: "Fibre flow", min: 0, max: 2, step: 0.01, default: 1 },
  { key: "tumble", label: "4D tumble", min: 0, max: 1, step: 0.01, default: 0.6 },
  { key: "orbit", label: "Camera orbit", min: -1, max: 1, step: 0.01, default: 0.4 },
  { key: "thickness", label: "Tube thickness", min: 0.5, max: 1.6, step: 0.01, default: 1 },
  { key: "beads", label: "Light beads", min: 0, max: 1, step: 0.01, default: 0.4 },
  { key: "elevation", label: "Camera elevation", min: 0, max: 1, step: 0.01, default: 0.35 },
  { key: "distance", label: "Camera distance", min: 0.85, max: 1.3, step: 0.01, default: 1 },
];

const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: {
    development,
    flow: 1,
    tumble: 0.6,
    orbit: 0.4,
    thickness: 1,
    beads: 0.4,
    elevation: 0.35,
    distance: 1,
    ...params,
  },
});

export default {
  id: "fibration",
  number: 96,
  name: "Linked Fibres",
  description:
    "Exact Hopf fibres as lit tubes in space: one torus of linked Villarceau circles blooms into nested tori and the full bundle around its core circle. Every pair of circles is linked once; light flows along all fibres at the same time.",
  development: "development",
  schema,
  presets: [
    look("Linked Torus", 9601, 0),
    look("Nested Shells", 9601, 1),
    look("Full Bundle", 9601, 2),
    look("Cyclide Swing", 9602, 0, { tumble: 1, orbit: -0.3, thickness: 1.3, beads: 0.2, elevation: 0.08 }),
    look("Glass Nest", 9603, 1, { flow: 0.6, thickness: 0.7, beads: 0.75, distance: 1.12, elevation: 0.95 }),
    look("Bundle Weather", 9604, 2, { flow: 1.6, orbit: 0.7, thickness: 0.8, beads: 0.9, elevation: 0.55 }),
    look("Half Bloom", 9605, 1.5, { tumble: 0.8, orbit: -0.5, distance: 0.92, elevation: 0.15 }),
    look("Slow Core", 9606, 2, { flow: 0.35, tumble: 0.3, orbit: 0.2, thickness: 1.4, beads: 0.1, distance: 0.88, elevation: 0.75 }),
  ],
  stage: ["flow", "tumble", "orbit"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    flow: { mul: [0.5, 1.6] },
    tumble: { mul: [0.7, 1.35] },
    orbit: { mul: [0.6, 1.6] },
    beads: [-0.25, 0.25],
  },
  beat: { punch: 0.1, pulse: 0.15 },
  audio: [
    { param: "tumble", feature: "low", amount: 0.05 },
    { param: "beads", feature: "onset", amount: 0.08 },
  ],
  rhythm: [
    familyEffect(
      "fibre-chase",
      0,
      "Fibre chase",
      "A cohort of whole fibres lights up and a comet runs once around each circle.",
      { period: 4, strength: 0.65, duration: 1 },
    ),
    familyEffect(
      "torus-shell",
      1,
      "Torus shell",
      "One latitude torus of Villarceau circles glows along its edges.",
      { period: 8, strength: 0.6, duration: 1.5 },
    ),
    familyEffect(
      "meridian-link",
      2,
      "Meridian link",
      "Fibres over one meridian glow through every nested torus at once.",
      { period: 16, strength: 0.7, duration: 2 },
    ),
  ],
  fragment: `${shared}
void main() { outColor = vec4(ground(gl_FragCoord.xy), 1.); }`,
  simulation: { fragment: simulation, size: [4, 1], steps: 1 },
  geometry: {
    create: createGeometry,
    attributes: [2],
    vertex,
    fragment: surface,
  },
};
export { LAYERS };
