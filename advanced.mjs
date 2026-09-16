// Classical constructions; artistic parameters are bounded by the shared scene schema.
export const advancedDefaults = {
  julia: { real: -.745, imaginary: .186, zoom: 1, detail: 64, trap: .58, motion: .2 },
  fourspace: { shape: 0, rotation: .35, counter: .23, perspective: .65, density: 24, thickness: .4 },
  hyperbolic: { density: 32, bend: .55, orbit: .35, weave: .45, thickness: .35 },
};
export const advancedScenes = [
  { id: 'julia', number: 'F', name: 'Julia Observatory', kind: 'advanced', mechanism: 'Complex iteration · orbit traps', description: 'Drag to change the complex constant. Explore filaments, islands and orbit-trap light.', presets: [
    ['Dendrite', 'branching complex filaments', 1, advancedDefaults.julia],
    ['Rabbit islands', 'disconnected spirals', 2, { real: -.12, imaginary: .74, zoom: 1.25, detail: 80, trap: .35, motion: .08 }],
    ['Siegel lace', 'fine recursive boundaries', 3, { real: -.391, imaginary: -.587, zoom: 1.35, detail: 96, trap: .75, motion: 0 }],
  ], schema: [['real', 'Real constant', -1.2, .5, .001], ['imaginary', 'Imaginary constant', -.9, .9, .001], ['zoom', 'Magnification', .6, 5, .01], ['detail', 'Iteration budget', 24, 112, 1], ['trap', 'Orbit-trap light', 0, 1, .01], ['motion', 'Orbit drift', 0, 1, .01]] },
  { id: 'fourspace', number: '4D', name: 'Fourth Dimension', kind: 'advanced', mechanism: '4D rotations · tesseract / Hopf fibers', description: 'Two independent rotation planes unfold a hypercube. Choose Hopf fibers for linked circles on the 3-sphere.', presets: [
    ['Hypercube', '16 vertices · 32 edges in 4D', 1, advancedDefaults.fourspace],
    ['Hopf lantern', 'linked stereographic fibers', 2, { shape: 1, rotation: .24, counter: -.18, perspective: .7, density: 32, thickness: .45 }],
    ['Isoclinic', 'equal-angle double rotation', 3, { shape: 0, rotation: .3, counter: .3, perspective: .9, density: 24, thickness: .65 }],
  ], schema: [['rotation', 'XW turn / speed', -.8, .8, .01], ['counter', 'YZ turn / speed', -.8, .8, .01], ['perspective', 'Projection view', 0, 1, .01], ['shape', 'Shape · 0 cube / 1 Hopf', 0, 1, 1], ['density', 'Fiber count', 8, 48, 1], ['thickness', 'Line weight', 0, 1, .01]] },
  { id: 'hyperbolic', number: 'H²', name: 'Hyperbolic Loom', kind: 'advanced', mechanism: 'Poincaré disk · Möbius isometries', description: 'Straight paths in hyperbolic space appear as arcs meeting the disk boundary at right angles. Drag to move the viewpoint.', presets: [
    ['Infinite loom', 'orthogonal geodesic arcs', 1, advancedDefaults.hyperbolic],
    ['Boundary choir', 'dense curved-space threads', 2, { density: 56, bend: .8, orbit: .55, weave: .72, thickness: .2 }],
    ['Quiet disk', 'open geometric study', 3, { density: 16, bend: .25, orbit: .15, weave: .2, thickness: .6 }],
  ], schema: [['density', 'Geodesic count', 8, 64, 1], ['bend', 'Viewpoint offset', 0, .85, .01], ['orbit', 'Orbit speed', 0, 1, .01], ['weave', 'Endpoint weave', 0, 1, .01], ['thickness', 'Line weight', 0, 1, .01]] },
];
const TAU = Math.PI * 2;
export function rotate4(point, a, b) {
  const [x, y, z, w] = point;
  return [x * Math.cos(a) - w * Math.sin(a), y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b), x * Math.sin(a) + w * Math.cos(a)];
}
export function hopfPoint(theta, phi, t) {
  return [Math.cos(theta / 2) * Math.cos(t), Math.cos(theta / 2) * Math.sin(t), Math.sin(theta / 2) * Math.cos(phi + t), Math.sin(theta / 2) * Math.sin(phi + t)];
}
export const cubeVertices = Array.from({ length: 16 }, (_, n) => Array.from({ length: 4 }, (_, d) => n & (1 << d) ? .5 : -.5));
export const cubeEdges = cubeVertices.flatMap((_, i) => [0, 1, 2, 3].filter(d => !(i & (1 << d))).map(d => [i, i | (1 << d)]));
function juliaSampleInto(x, y, real, imaginary, iterations, out) {
  let nearest = 8, n = 0, magnitude = x * x + y * y;
  for (; n < iterations && magnitude < 256; n++) {
    const nextX = x * x - y * y + real;
    y = 2 * x * y + imaginary;
    x = nextX;
    magnitude = x * x + y * y;
    nearest = Math.min(nearest, Math.abs(Math.sqrt(magnitude) - .65), Math.abs(y) * .65);
  }
  out.escaped = magnitude >= 256;
  out.smooth = out.escaped ? n + 1 - Math.log2(Math.log2(magnitude) / 2) : n;
  out.trap = Math.exp(-nearest * 12);
  return out;
}
export function juliaSample(x, y, real, imaginary, iterations) {
  return juliaSampleInto(x, y, real, imaginary, iterations, {});
}
export function advancedRasterSize(width, height, low = false) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const maxDimension = low ? 160 : safeWidth >= 1440 && safeHeight >= 900 ? 640 : 320;
  const scale = Math.min(.5, maxDimension / safeWidth, maxDimension / safeHeight);
  return { width: Math.max(1, Math.round(safeWidth * scale)), height: Math.max(1, Math.round(safeHeight * scale)) };
}
export function mobius([x, y], [a, b]) {
  // (z+a)/(1+conj(a)z), an orientation-preserving disk isometry for |a|<1.
  const dr = 1 + a * x + b * y, di = a * y - b * x, norm = dr * dr + di * di;
  return [((x + a) * dr + (y + b) * di) / norm, ((y + b) * dr - (x + a) * di) / norm];
}
export function geodesicPoint(angle, separation, t) {
  // Rotate the short arc of a circle centered at sec(separation), radius tan(separation).
  const center = 1 / Math.cos(separation), radius = Math.tan(separation);
  const arc = Math.PI / 2 + separation + t * (Math.PI - 2 * separation);
  const x = center + radius * Math.cos(arc), y = radius * Math.sin(arc);
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
}
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function setJuliaRenderState(buffer, path, width, height, reason = null) {
  if (!buffer || typeof buffer !== 'object') return;
  buffer.__juliaRenderPath = path;
  buffer.__juliaRenderWidth = width;
  buffer.__juliaRenderHeight = height;
  buffer.__juliaRenderReason = typeof reason === 'string' && reason.length <= 120 ? reason : null;
}
export function juliaRenderState(buffer) {
  const path = ['webgl', 'cpu'].includes(buffer?.__juliaRenderPath) ? buffer.__juliaRenderPath : 'warming-up';
  const width = Number.isInteger(buffer?.__juliaRenderWidth) ? buffer.__juliaRenderWidth : null;
  const height = Number.isInteger(buffer?.__juliaRenderHeight) ? buffer.__juliaRenderHeight : null;
  const reason = typeof buffer?.__juliaRenderReason === 'string' && buffer.__juliaRenderReason.length <= 120 ? buffer.__juliaRenderReason : null;
  return { path, width, height, reason };
}
const juliaVertexShader = `attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * .5 + .5;
  gl_Position = vec4(aPosition, 0., 1.);
}`;
const juliaFragmentShader = `precision highp float;
uniform vec2 uResolution;
uniform vec2 uConstant;
uniform float uZoom;
uniform float uDetail;
uniform float uTrapPower;
uniform float uLevel;
uniform vec3 uSecondary;
uniform vec3 uPrimary;
uniform vec3 uAccent;
varying vec2 vUv;
void main() {
  vec2 uv = vec2(vUv.x, 1. - vUv.y);
  float zoom = max(uZoom, .0001);
  vec2 z = vec2((uv.x - .5) * 3.5 / zoom, (uv.y - .5) * 3.5 * uResolution.y / uResolution.x / zoom);
  float nearest = 8.;
  float magnitude = dot(z, z);
  float iterations = 0.;
  for (int i = 0; i < 112; i++) {
    if (iterations >= uDetail || magnitude >= 256.) break;
    float nextX = z.x * z.x - z.y * z.y + uConstant.x;
    z.y = 2. * z.x * z.y + uConstant.y;
    z.x = nextX;
    magnitude = dot(z, z);
    nearest = min(nearest, min(abs(sqrt(magnitude) - .65), abs(z.y) * .65));
    iterations += 1.;
  }
  bool escaped = magnitude >= 256.;
  float smooth = escaped ? iterations + 1. - log2(log2(magnitude) / 2.) : iterations;
  float trap = exp(-nearest * 12.);
  float tone = .5 + .5 * cos(smooth * .19);
  vec3 color = mix(mix(uSecondary, uPrimary, tone), uAccent, trap * uTrapPower);
  float light = escaped ? .22 + .65 * min(1., smooth / 18.) : .025 + trap * uTrapPower * .28;
  gl_FragColor = vec4(color * light * (1. + uLevel * .4), 1.);
}`;
function createJuliaGpu(buffer) {
  if (typeof document === 'undefined') { buffer.__juliaGpuDisabled = true; buffer.__juliaGpuFailure = 'WebGL unavailable'; return null; }
  if (buffer.__juliaGpuDisabled) return null;
  if (buffer.__juliaGpu) return buffer.__juliaGpu;
  try {
    const surface = document.createElement('canvas');
    const gl = surface.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl || typeof gl.createShader !== 'function') { buffer.__juliaGpuDisabled = true; buffer.__juliaGpuFailure = 'WebGL context unavailable'; return null; }
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Julia shader compilation failed');
      return shader;
    };
    const program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, juliaVertexShader)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, juliaFragmentShader)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Julia shader linking failed');
    const positionBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const uniforms = Object.fromEntries(['uResolution', 'uConstant', 'uZoom', 'uDetail', 'uTrapPower', 'uLevel', 'uSecondary', 'uPrimary', 'uAccent'].map(name => [name, gl.getUniformLocation(program, name)]));
    surface.addEventListener?.('webglcontextlost', event => { event.preventDefault?.(); buffer.__juliaGpuDisabled = true; buffer.__juliaGpuFailure = 'WebGL context lost'; });
    surface.addEventListener?.('webglcontextrestored', () => { if (buffer.__juliaGpu?.surface === surface) { buffer.__juliaGpu = null; buffer.__juliaGpuDisabled = false; buffer.__juliaGpuFailure = null; } });
    buffer.__juliaGpu = { surface, gl, program, position: gl.getAttribLocation(program, 'aPosition'), positionBuffer, uniforms };
    return buffer.__juliaGpu;
  } catch (error) {
    buffer.__juliaGpuDisabled = true;
    buffer.__juliaGpuFailure = error?.message || 'WebGL initialization failed';
    return null;
  }
}
function drawJuliaGpu(ctx, buffer, width, height, p, time, palette, level = 0) {
  const gpu = createJuliaGpu(buffer);
  if (!gpu) return false;
  try {
    const { gl, surface, program, uniforms } = gpu;
    if (typeof gl.isContextLost === 'function' && gl.isContextLost()) throw new Error('Julia WebGL context lost');
    const real = p.real + Math.sin(time * .13) * p.motion * .018;
    const imaginary = p.imaginary + Math.cos(time * .11) * p.motion * .018;
    if (surface.width !== width) surface.width = width;
    if (surface.height !== height) surface.height = height;
    gl.viewport(0, 0, width, height); gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.positionBuffer); gl.enableVertexAttribArray(gpu.position); gl.vertexAttribPointer(gpu.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uniforms.uResolution, width, height); gl.uniform2f(uniforms.uConstant, real, imaginary); gl.uniform1f(uniforms.uZoom, p.zoom); gl.uniform1f(uniforms.uDetail, Math.round(p.detail)); gl.uniform1f(uniforms.uTrapPower, p.trap); gl.uniform1f(uniforms.uLevel, level);
    for (const [name, color] of [['uSecondary', palette.secondary], ['uPrimary', palette.primary], ['uAccent', palette.accent]]) { const values = rgb(color); gl.uniform3f(uniforms[name], values[0] / 255, values[1] / 255, values[2] / 255); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (typeof gl.isContextLost === 'function' && gl.isContextLost()) throw new Error('Julia WebGL context lost');
    ctx.imageSmoothingEnabled = true; ctx.drawImage(surface, 0, 0, width, height); buffer.__juliaGpuFailure = null; setJuliaRenderState(buffer, 'webgl', width, height); return true;
  } catch (error) {
    buffer.__juliaGpuDisabled = true;
    buffer.__juliaGpuFailure = error?.message || 'WebGL draw failed';
    return false;
  }
}
export function drawAdvanced(ctx, buffer, id, p, time, palette, low, level = 0) {
  const { width, height } = ctx.canvas;
  const colors = [rgb(palette.secondary), rgb(palette.primary), rgb(palette.accent)];
  ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, width, height);
  if (id === 'julia') {
    if (drawJuliaGpu(ctx, buffer, width, height, p, time, palette, level)) return 'webgl';
    const { width: w, height: h } = advancedRasterSize(width, height, low);
    buffer.width = w; buffer.height = h;
    const off = buffer.getContext('2d'), image = off.createImageData(w, h);
    const real = p.real + Math.sin(time * .13) * p.motion * .018;
    const imaginary = p.imaginary + Math.cos(time * .11) * p.motion * .018;
    const coordinateScale = 3.5 / (w * p.zoom), xCenter = w * .5, yCenter = h * .5, iterations = Math.round(p.detail);
    const sample = { escaped: false, smooth: 0, trap: 0 };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = juliaSampleInto((x - xCenter) * coordinateScale, (y - yCenter) * coordinateScale, real, imaginary, iterations, sample);
      const tone = .5 + .5 * Math.cos(s.smooth * .19);
      const baseR = Math.round(colors[0][0] + (colors[1][0] - colors[0][0]) * tone);
      const baseG = Math.round(colors[0][1] + (colors[1][1] - colors[0][1]) * tone);
      const baseB = Math.round(colors[0][2] + (colors[1][2] - colors[0][2]) * tone);
      const trapMix = s.trap * p.trap;
      const red = Math.round(baseR + (colors[2][0] - baseR) * trapMix);
      const green = Math.round(baseG + (colors[2][1] - baseG) * trapMix);
      const blue = Math.round(baseB + (colors[2][2] - baseB) * trapMix);
      const light = s.escaped ? .22 + .65 * Math.min(1, s.smooth / 18) : .025 + s.trap * p.trap * .28;
      const i = (y * w + x) * 4;
      image.data[i] = red * light * (1 + level * .4);
      image.data[i + 1] = green * light * (1 + level * .4);
      image.data[i + 2] = blue * light * (1 + level * .4);
      image.data[i + 3] = 255;
    }
    off.putImageData(image, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(buffer, 0, 0, width, height); setJuliaRenderState(buffer, 'cpu', w, h, buffer.__juliaGpuFailure || 'WebGL unavailable'); return 'cpu';
  }
  ctx.save(); ctx.translate(width / 2, height / 2);
  const scale = Math.min(width, height) * .41;
  if (id === 'fourspace') {
    const a = .45 + (time + 3) * p.rotation, b = .32 + (time + 3) * p.counter;
    const project = point => {
      const v = rotate4(point, a, b);
      if (p.shape > .5 && 1 - v[3] < .045) return null;
      const k = p.shape > .5 ? 1 / (1 - v[3]) : (2.5 - p.perspective) / (2.5 - p.perspective - v[3]);
      const z = v[2] * k, x = v[0] * k, y = v[1] * k;
      // Orthographic 3D camera; singular stereographic segments are omitted, never joined.
      const camera = .2 + p.perspective * .8;
      return [(x * Math.cos(camera) + z * Math.sin(camera)) * scale * (p.shape > .5 ? .46 : .88), y * scale * (p.shape > .5 ? .46 : .88)];
    };
    const paths = p.shape > .5 ? Array.from({ length: Math.round(p.density) }, (_, i) => {
      const theta = .35 + (i % 6) / 5 * 2.4, phi = i * 2.399963229728653;
      return Array.from({ length: low ? 65 : 129 }, (_, j) => project(hopfPoint(theta, phi, j / (low ? 64 : 128) * TAU)));
    }) : cubeEdges.map(([i, j]) => [project(cubeVertices[i]), project(cubeVertices[j])]);
    paths.forEach((path, i) => {
      ctx.strokeStyle = `rgb(${mix(colors[i % 2], colors[2], (i % 7) / 7).join(',')})`;
      ctx.globalAlpha = p.shape > .5 ? .65 : .85; ctx.lineWidth = .8 + p.thickness * 2 + level;
      ctx.beginPath(); let previous = null;
      for (const point of path) { if (!point || Math.hypot(...point) > scale * 4) { previous = null; continue; } if (previous && Math.hypot(point[0] - previous[0], point[1] - previous[1]) < scale * 1.8) ctx.lineTo(...point); else ctx.moveTo(...point); previous = point; }
      ctx.stroke();
    });
    if (p.shape < .5) cubeVertices.forEach(point => { const v = project(point); ctx.fillStyle = palette.accent; ctx.beginPath(); ctx.arc(...v, 2 + p.thickness * 3, 0, TAU); ctx.fill(); });
  } else {
    ctx.strokeStyle = palette.secondary; ctx.globalAlpha = .45; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, scale, 0, TAU); ctx.stroke();
    const offset = [p.bend * Math.cos(time * p.orbit * .15), p.bend * Math.sin(time * p.orbit * .15)];
    for (let i = 0; i < Math.round(p.density); i++) {
      ctx.strokeStyle = `rgb(${mix(colors[i % 2], colors[2], (i % 9) / 9).join(',')})`;
      ctx.globalAlpha = .4 + .35 * (i % 3) / 2; ctx.lineWidth = .5 + p.thickness * 2 + level;
      const angle = i / p.density * TAU + time * p.orbit * .035;
      const separation = .18 + (i % 5) / 5 * .95 + p.weave * .2;
      ctx.beginPath(); const samples = low ? 48 : 96;
      for (let j = 0; j <= samples; j++) { const point = mobius(geodesicPoint(angle, separation, j / samples), offset); if (j === 0) ctx.moveTo(point[0] * scale, point[1] * scale); else ctx.lineTo(point[0] * scale, point[1] * scale); }
      ctx.stroke();
    }
  }
  ctx.restore();
  return 'canvas-2d';
}
