import { WORLD_GLSL, defaultFlightPose, validateFlightPose, flightBasis, worldDistance } from './fractal-navigation.mjs';
// WebGL recursive-passage renderer. Historic module/export names are retained.
// No third-party dependencies. The browser integrator owns scene registration and export/persistence.

export const MANDELBOX_DEFAULTS = Object.freeze({
  seed: 47,
  cameraSpeed: 0.18,
  steeringYaw: 0,
  steeringPitch: 0,
  lateral: 0,
  fractalScale: 2.05,
  foldLimit: 1.0,
  minRadius: 0.5,
  detail: 0.62,
  fog: 0.48,
  light: 0.72,
  hue: 0.58,
  saturation: 0.78,
  exposure: 1.12,
  quality: 'full',
  palette: { primary: '#d5ff5f', secondary: '#5364ff', accent: '#ff5bc8' },
});

export const MANDELBOX_SCHEMA = Object.freeze({
  seed: [-2147483648, 2147483647, 1], cameraSpeed: [0, 0.8, 0.01], steeringYaw: [-0.6, 0.6, 0.01], steeringPitch: [-0.35, 0.35, 0.01], lateral: [-0.7, 0.7, 0.01],
  fractalScale: [2.05, 2.45, 0.01], foldLimit: [0.65, 1.25, 0.01],
  minRadius: [0.25, 0.9, 0.01], detail: [0.25, 1, 0.01], fog: [0, 1, 0.01],
  light: [0, 1, 0.01], hue: [0, 1, 0.01], saturation: [0, 1, 0.01],
  exposure: [0.5, 1.8, 0.01], quality: ['low', 'full'],
});

export const MANDELBOX_VERTEX_SHADER = `#version 100
attribute vec2 a_position;
varying vec2 v_uv;
void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }
`;

export const MANDELBOX_FRAGMENT_SHADER = `#version 100
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform vec3 u_cameraPosition;
uniform vec3 u_cameraForward;
uniform float u_time;
uniform float u_travelDistance;
uniform float u_steeringYaw;
uniform float u_steeringPitch;
uniform float u_lateral;
uniform float u_seed;
uniform float u_cameraSpeed;
uniform float u_fractalScale;
uniform float u_foldLimit;
uniform float u_minRadius;
uniform float u_detail;
uniform float u_fog;
uniform float u_light;
uniform float u_hue;
uniform float u_saturation;
uniform float u_exposure;
uniform float u_maxSteps;
uniform float u_maxDistance;
uniform vec3 u_colorPrimary;
uniform vec3 u_colorSecondary;
uniform vec3 u_colorAccent;

const float PI = 3.14159265359;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 palette(float t) {
  vec3 dark = mix(u_colorSecondary * 0.28, vec3(0.012, 0.018, 0.03), 0.28);
  vec3 mid = mix(u_colorSecondary, u_colorPrimary, 0.5);
  return mix(dark, mix(mid, u_colorAccent, smoothstep(0.45, 0.95, t)), clamp(t, 0.0, 1.0));
}

${WORLD_GLSL}

void main() {
  vec2 p = (v_uv * 2.0 - 1.0); p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  float travel = max(0.0, u_travelDistance);
  vec3 ro = u_cameraPosition;
  vec3 ww = normalize(u_cameraForward), uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww));
  vec3 vv = normalize(cross(ww, uu));
  vec3 rd = normalize(p.x * uu + p.y * vv + 1.45 * ww);
  float distanceTravelled = 0.0, glow = 0.0, trap = 0.0;
  bool hit = false;
  float maxSteps = clamp(u_maxSteps, 40.0, 128.0);
  for (int step = 0; step < 128; step++) {
    if (float(step) >= maxSteps || distanceTravelled >= u_maxDistance) break;
    vec3 samplePoint = ro + rd * distanceTravelled;
    // Five recursive levels repeat seamlessly across all three world axes.
    float localTrap = 0.0;
    float distanceField = mapScene(samplePoint, localTrap);
    glow += exp(-localTrap * 12.0) * 0.0018;
    if (distanceField < 0.002) { trap = localTrap; hit = true; break; }
    distanceTravelled += max(distanceField * 0.58, 0.003);
  }
  float depth = clamp(distanceTravelled / u_maxDistance, 0.0, 1.0);
  float band = clamp(glow * (1.3 + u_detail * 1.7), 0.0, 1.0);
  float materialTone = clamp(0.12 + trap * 1.2 + band * 0.45, 0.0, 1.0);
  vec3 col = palette(materialTone) * (0.5 + band * 1.2);
  col += mix(u_colorSecondary, u_colorAccent, 0.5) * (0.025 + glow * 0.7);
  if (hit) {
    vec3 hitPoint = ro + rd * distanceTravelled;
    float ignoredTrap = 0.0;
    float e = 0.004;
    vec3 gradient = vec3(mapScene(hitPoint + vec3(e, 0.0, 0.0), ignoredTrap) - mapScene(hitPoint - vec3(e, 0.0, 0.0), ignoredTrap), mapScene(hitPoint + vec3(0.0, e, 0.0), ignoredTrap) - mapScene(hitPoint - vec3(0.0, e, 0.0), ignoredTrap), mapScene(hitPoint + vec3(0.0, 0.0, e), ignoredTrap) - mapScene(hitPoint - vec3(0.0, 0.0, e), ignoredTrap));
    vec3 normal = dot(gradient, gradient) > 0.0000001 ? normalize(gradient) : vec3(0.0, 0.0, 1.0);
    vec3 lightDirection = normalize(-rd + vec3(-0.35, 0.6, -0.15));
    float key = max(dot(normal, lightDirection), 0.0);
    float rim = pow(1.0 - max(dot(normal, -rd), 0.0), 2.0);
    vec3 material = mix(u_colorSecondary, u_colorPrimary, clamp(trap * 1.7, 0.0, 0.7));
    col = material * (0.16 + u_light * (0.88 * key + 0.18 * rim));
    col += u_colorAccent * rim * 0.26 + u_colorPrimary * band * u_detail * 0.3;
  } else {
    float fogBand = 0.28 + 0.72 * smoothstep(-0.8, 0.8, v_uv.y * 2.0 - 1.0);
    col = u_colorSecondary * (0.018 + fogBand * 0.045);
  }
  col *= mix(1.0, exp(-depth * u_fog * 1.1), hit ? 0.78 : 0.25);
  col *= u_exposure * (0.62 + u_light * 0.62);
  col = 1.0 - exp(-max(col, vec3(0.0)));
  col = pow(max(col, vec3(0.0)), vec3(0.86));
  gl_FragColor = vec4(col, 1.0);
}
`;

function finite(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
function color(value, fallback) { const match = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.slice(1) : fallback.slice(1); return [parseInt(match.slice(0, 2), 16) / 255, parseInt(match.slice(2, 4), 16) / 255, parseInt(match.slice(4, 6), 16) / 255]; }
export function validateMandelboxParams(input = {}) {
  const result = { ...MANDELBOX_DEFAULTS, ...input, palette: { ...MANDELBOX_DEFAULTS.palette, ...(input.palette || {}) } };
  for (const [key, bounds] of Object.entries(MANDELBOX_SCHEMA)) {
    if (key === 'quality' || key === 'palette') { if (key === 'quality') result.quality = result.quality === 'low' ? 'low' : 'full'; continue; }
    const [min, max, step] = bounds;
    result[key] = Math.min(max, Math.max(min, finite(result[key], MANDELBOX_DEFAULTS[key])));
    if (key === 'seed') result[key] = Math.round(result[key]);
    else if (step >= 1) result[key] = Math.round(result[key]);
  }
  return result;
}

// The historic renderer export names remain for import compatibility; every probe
// now uses the same recursive world and explicit pose as the GPU renderer.
export function deterministicCamera(_timeSeconds, input = {}) {
  const pose = validateFlightPose(input.pose || defaultFlightPose());
  const forward = flightBasis(pose).forward;
  return { origin: pose.position, target: pose.position.map((v, i) => v + forward[i]) };
}
export function mapSceneDistance(point, input = {}) { return worldDistance(point, input.fractalScale); }
export const mandelboxDistance = mapSceneDistance;
export function probeCenterRay(input = {}) {
  const camera = deterministicCamera(0, input);
  const ray = camera.target.map((v, i) => v - camera.origin[i]);
  let distance = 0;
  for (let step = 0; step < 104 && distance < 28; step++) {
    const field = mapSceneDistance(camera.origin.map((v, i) => v + ray[i] * distance), input);
    if (field < .002) return { hit: true, steps: step + 1, distance };
    distance += Math.max(field * .58, .003);
  }
  return { hit: false, distance };
}

function compile(gl, type, source) {
  const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(shader) || 'unknown shader error'; gl.deleteShader(shader); const error = new Error(`Fractal shader compilation failed: ${log}`); error.code = 'WEBGL_SHADER_ERROR'; throw error; }
  return shader;
}

export function createMandelboxFlythroughRenderer(options = {}) {
  const canvas = options.canvas || globalThis.document?.createElement?.('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') { const error = new Error('Fractal renderer needs an HTML canvas'); error.code = 'CANVAS_UNAVAILABLE'; throw error; }
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false }) || canvas.getContext('experimental-webgl');
  if (!gl) { const error = new Error('WebGL is unavailable; keep the existing 2D renderer active'); error.code = 'WEBGL_UNAVAILABLE'; throw error; }
  let program, buffer, uniforms = {}, attribute = -1, disposed = false, contextLost = false;
  const onContextLost = event => { event.preventDefault(); contextLost = true; options.onError?.(Object.assign(new Error('Fractal WebGL context lost; pause and wait for recovery'), { code: 'WEBGL_CONTEXT_LOST' })); };
  const onContextRestored = () => { try { buildGpu(); contextLost = false; options.onRecover?.(); } catch (error) { contextLost = true; options.onError?.(error); } };
  canvas.addEventListener?.('webglcontextlost', onContextLost, false); canvas.addEventListener?.('webglcontextrestored', onContextRestored, false);
  function buildGpu() {
    if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer);
    const vertex = compile(gl, gl.VERTEX_SHADER, MANDELBOX_VERTEX_SHADER), fragment = compile(gl, gl.FRAGMENT_SHADER, MANDELBOX_FRAGMENT_SHADER);
    program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { const error = new Error(`Fractal shader link failed: ${gl.getProgramInfoLog(program) || 'unknown link error'}`); error.code = 'WEBGL_SHADER_ERROR'; throw error; }
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    uniforms = Object.fromEntries(['u_cameraPosition', 'u_cameraForward', 'u_resolution', 'u_time', 'u_travelDistance', 'u_seed', 'u_cameraSpeed', 'u_steeringYaw', 'u_steeringPitch', 'u_lateral', 'u_fractalScale', 'u_foldLimit', 'u_minRadius', 'u_detail', 'u_fog', 'u_light', 'u_hue', 'u_saturation', 'u_exposure', 'u_maxSteps', 'u_maxDistance', 'u_colorPrimary', 'u_colorSecondary', 'u_colorAccent'].map(name => [name, gl.getUniformLocation(program, name)]));
    attribute = gl.getAttribLocation(program, 'a_position');
  }
  try { buildGpu(); } catch (error) { if (program) gl.deleteProgram(program); throw error; }
  function resize(width, height) { if (disposed) return; canvas.width = Math.min(1920, Math.max(1, Math.floor(width))); canvas.height = Math.min(1200, Math.max(1, Math.floor(height))); gl.viewport(0, 0, canvas.width, canvas.height); }
  resize(options.width || 960, options.height || 600);
  function render(timeSeconds = 0, input = {}) {
    if (disposed) throw new Error('Fractal renderer is disposed');
    if (contextLost) { const error = new Error('Fractal WebGL context is lost; wait for recovery'); error.code = 'WEBGL_CONTEXT_LOST'; throw error; }
    const p = validateMandelboxParams(input); if (!canvas.width || !canvas.height) resize(options.width || 960, options.height || 600);
    const travelDistance = Number.isFinite(Number(input.travelDistance)) ? Math.max(0, Number(input.travelDistance)) : Math.max(0, finite(timeSeconds, 0)) * p.cameraSpeed * 1.55;
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    const pose = validateFlightPose(input.pose || defaultFlightPose());
    gl.uniform3f(uniforms.u_cameraPosition, ...pose.position); gl.uniform3f(uniforms.u_cameraForward, ...flightBasis(pose).forward);
    gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height); gl.uniform1f(uniforms.u_time, Math.max(0, finite(timeSeconds, 0))); gl.uniform1f(uniforms.u_travelDistance, travelDistance); gl.uniform1f(uniforms.u_seed, p.seed); gl.uniform1f(uniforms.u_cameraSpeed, p.cameraSpeed); gl.uniform1f(uniforms.u_steeringYaw, p.steeringYaw); gl.uniform1f(uniforms.u_steeringPitch, p.steeringPitch); gl.uniform1f(uniforms.u_lateral, p.lateral); gl.uniform1f(uniforms.u_fractalScale, p.fractalScale); gl.uniform1f(uniforms.u_foldLimit, p.foldLimit); gl.uniform1f(uniforms.u_minRadius, p.minRadius); gl.uniform1f(uniforms.u_detail, p.detail); gl.uniform1f(uniforms.u_fog, p.fog); gl.uniform1f(uniforms.u_light, p.light); gl.uniform1f(uniforms.u_hue, p.hue); gl.uniform1f(uniforms.u_saturation, p.saturation); gl.uniform1f(uniforms.u_exposure, p.exposure); gl.uniform1f(uniforms.u_maxSteps, p.quality === 'low' ? 56 : 104); gl.uniform1f(uniforms.u_maxDistance, p.quality === 'low' ? 18 : 28); gl.uniform3f(uniforms.u_colorPrimary, ...color(p.palette.primary, '#d5ff5f')); gl.uniform3f(uniforms.u_colorSecondary, ...color(p.palette.secondary, '#5364ff')); gl.uniform3f(uniforms.u_colorAccent, ...color(p.palette.accent, '#ff5bc8')); gl.drawArrays(gl.TRIANGLES, 0, 6);
    return { canvas, width: canvas.width, height: canvas.height, time: Math.max(0, finite(timeSeconds, 0)), camera: { origin: pose.position, forward: flightBasis(pose).forward }, quality: p.quality };
  }
  function dispose() { if (disposed) return; disposed = true; canvas.removeEventListener?.('webglcontextlost', onContextLost); canvas.removeEventListener?.('webglcontextrestored', onContextRestored); gl.deleteBuffer(buffer); gl.deleteProgram(program); buffer = null; program = null; }
  return { canvas, gl, resize, render, dispose, params: MANDELBOX_SCHEMA };
}

