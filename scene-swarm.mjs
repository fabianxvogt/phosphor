// Particle Swarm (new, D32): 65,536 GPU particles drawn as additive points
// over fading trails (contract v3 particles). Positions live in a 16-bit
// packed simulation texture; motion comes from a stateless field per type:
// curl-noise flock, morphing strange attractor, differential-rotation
// galaxy, and bursts thrown out on every kick.

const SIZE = 256;

const schema = [
  { key: "form", label: "Form · flock / attractor / galaxy / bursts", min: 0, max: 3, step: 1, default: 0 },
  { key: "speed", label: "Speed", min: 0, max: 2, step: 0.01, default: 0.5 },
  { key: "scale", label: "Field scale", min: 0.5, max: 4, step: 0.01, default: 1.6 },
  { key: "size", label: "Point size", min: 0.6, max: 4, step: 0.01, default: 1.4 },
  { key: "trail", label: "Trails", min: 0, max: 0.97, step: 0.01, default: 0.82 },
  { key: "burst", label: "Kick burst", min: 0, max: 1, step: 0.01, default: 0.3 },
  { key: "density", label: "Visible particles", min: 0.1, max: 1, step: 0.01, default: 0.7 },
  { key: "brightness", label: "Brightness", min: 0.2, max: 2, step: 0.01, default: 1 },
];

const presets = [
  { name: "Murmuration", seed: 9401, params: { form: 0, speed: 0.45, scale: 1.4, size: 1.3, trail: 0.85, burst: 0.2, density: 0.7, brightness: 1 } },
  { name: "Strange Silk", seed: 9402, params: { form: 1, speed: 0.3, scale: 1.8, size: 1, trail: 0.7, burst: 0.15, density: 0.9, brightness: 0.9 } },
  { name: "Spiral Galaxy", seed: 9403, params: { form: 2, speed: 0.4, scale: 1.2, size: 1.2, trail: 0.88, burst: 0.1, density: 0.85, brightness: 1.1 } },
  { name: "Kick Bloom", seed: 9404, params: { form: 3, speed: 0.6, scale: 2, size: 1.6, trail: 0.75, burst: 0.8, density: 0.6, brightness: 1.2 } },
  { name: "Dust Drift", seed: 9405, params: { form: 0, speed: 0.12, scale: 0.8, size: 0.9, trail: 0.94, burst: 0, density: 0.5, brightness: 0.7 } },
  { name: "Attractor Storm", seed: 9406, params: { form: 1, speed: 1.2, scale: 2.6, size: 1.4, trail: 0.55, burst: 0.6, density: 1, brightness: 1.3 } },
];

// Simulation: one texel per particle, xy packed as two 16-bit values.
// Particle space is a 16:9 frame (aspect 16/9 below); the engine crops it.
const simulation = `
vec2 swNoiseGrad(vec2 p) {
  // Gradient of a smooth value-noise-like field built from sines.
  float a = 1.7, b = 2.3;
  return vec2(cos(p.x * a + sin(p.y * b)) * a, -sin(p.y * b + cos(p.x * a)) * b);
}
void main() {
  vec2 pos = unpack16(texture(u_state, v_uv));
  float id = dot(floor(v_uv * vec2(textureSize(u_state, 0))), vec2(1.0, 256.0));
  float form = floor(u_params[0] + 0.5);
  float speed = u_params[1], scale = u_params[2], burst = u_params[5];
  float dt = u_dt;
  // Respawn: on reset, and a few particles each frame to keep the swarm fresh.
  if (u_reset || tickHash(ivec2(gl_FragCoord.xy), 7u) < 0.0015) {
    pos = vec2(tickHash(ivec2(gl_FragCoord.xy), 3u), tickHash(ivec2(gl_FragCoord.xy), 5u));
    if (form > 1.5 && form < 2.5) {
      float a = pos.x * TAU, r = sqrt(pos.y) * 0.42;
      pos = vec2(0.5) + vec2(cos(a) * r * 0.5625, sin(a) * r);
    }
    if (form > 2.5) pos = vec2(0.5) + (pos - 0.5) * 0.2;
  }
  vec2 q = (pos - 0.5) * vec2(16.0 / 9.0, 1.0);
  vec2 v;
  if (form < 0.5) {
    // Flock: divergence-free curl of a drifting field.
    vec2 g = swNoiseGrad(q * scale * 2.0 + vec2(u_time * 0.07, -u_time * 0.05));
    v = vec2(g.y, -g.x) * 0.06 * speed;
  } else if (form < 1.5) {
    // Attractor: each step moves toward the de Jong map image of the point,
    // so the cloud settles on a slowly morphing strange attractor.
    float t = u_time * 0.03 * speed;
    vec4 k = vec4(1.4 + 0.3 * sin(t), -2.3 + 0.2 * cos(t * 1.3), 2.4 + 0.25 * sin(t * 0.7), -2.1 + 0.3 * cos(t * 0.9)) * (0.7 + 0.15 * scale);
    vec2 s = q * 2.4;
    vec2 f = vec2(sin(k.x * s.y) - cos(k.y * s.x), sin(k.z * s.x) - cos(k.w * s.y)) / 2.4 * 0.5;
    v = (f - q) * (0.6 + 2.0 * speed);
  } else if (form < 2.5) {
    // Galaxy: differential rotation (inner orbits faster) shears a disc
    // into spiral arms.
    float r = length(q) + 0.02;
    v = vec2(-q.y, q.x) * (0.25 * speed / (r + 0.12)) - q * 0.02 * speed;
  } else {
    // Bursts: drawn toward the centre, thrown outward on every kick.
    float kick = exp(-fract(u_beat) * 7.0);
    float r = length(q) + 1e-3;
    v = q / r * kick * (0.6 + 1.6 * burst) * (0.3 + 0.7 * fract(id * 0.618)) - q * (0.4 + speed);
    v += vec2(-q.y, q.x) * 0.3 * speed;
  }
  // Kick push for every form, scaled by the burst parameter.
  v += normalize(q + 1e-4) * burst * 0.15 * exp(-fract(u_beat) * 8.0) * u_level;
  q += v * dt;
  pos = q / vec2(16.0 / 9.0, 1.0) + 0.5;
  if (any(lessThan(pos, vec2(0.0))) || any(greaterThan(pos, vec2(1.0)))) pos = fract(pos);
  outColor = pack16(clamp(pos, 0.0, 1.0));
}
`;

// Visual pass: fade the previous frame (trails); particles add on top.
const fragment = `
void main() {
  vec3 previous = u_reset ? vec3(0.0) : texture(u_previous, v_uv).rgb;
  emit(vec4(previous * u_params[4], 1.0));
}
`;

const particles = {
  vertex: `
void main() {
  vec2 pos = unpack16(particle());
  float id = float(gl_VertexID);
  float visible = step(fract(id * 0.61803398875), u_params[6]);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
  float pixels = u_resolution.y / 540.0;
  gl_PointSize = visible * u_params[3] * pixels * (1.0 + 0.6 * u_level * exp(-fract(u_beat) * 6.0));
  float hue = fract(particleHash(id) * 0.35 + pos.x * 0.4 + u_time * 0.01);
  // Thousands overlap additively: keep each one faint.
  v_color = palette(hue) * 0.06 * u_params[7] * visible;
}
`,
};

export default {
  id: "swarm",
  // Particle space is a 16:9 frame; other screens cover-crop it (D7).
  aspect: 16 / 9,
  // Contract v3 performance metadata; see scene-acid.mjs.
  energy: { speed: [0.15, 1.5], burst: [0, 0.9], trail: [0.9, 0.6], brightness: [0.8, 1.4] },
  beat: { punch: 0.8, pulse: 1 },
  stage: ["speed", "burst", "trail"],
  type: { key: "form", values: [0, 1, 2, 3] },
  number: 63,
  name: "Particle Swarm",
  description:
    "65,536 GPU particles as additive points over fading trails: a curl-noise flock, a cloud settling on a morphing de Jong attractor, a galaxy sheared into spiral arms by differential rotation, and bursts thrown out on every kick. Positions are 16-bit packed in a simulation texture; motion is a stateless field per type, with a small respawn rate keeping the swarm fresh.",
  simulation: { size: [SIZE, SIZE], steps: 1, fragment: simulation },
  particles,
  schema,
  presets,
  fragment,
};
