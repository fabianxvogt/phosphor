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
export function juliaSample(x, y, real, imaginary, iterations) {
  let nearest = 8, n = 0, magnitude = x * x + y * y;
  for (; n < iterations && magnitude < 256; n++) {
    [x, y] = [x * x - y * y + real, 2 * x * y + imaginary];
    magnitude = x * x + y * y;
    nearest = Math.min(nearest, Math.abs(Math.hypot(x, y) - .65), Math.abs(y) * .65);
  }
  return { escaped: magnitude >= 256, smooth: magnitude >= 256 ? n + 1 - Math.log2(Math.log2(magnitude) / 2) : n, trap: Math.exp(-nearest * 12) };
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
export function drawAdvanced(ctx, buffer, id, p, time, palette, low, level = 0) {
  const { width, height } = ctx.canvas;
  const colors = [rgb(palette.secondary), rgb(palette.primary), rgb(palette.accent)];
  ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, width, height);
  if (id === 'julia') {
    const w = low ? 96 : 176, h = Math.round(w * height / width);
    buffer.width = w; buffer.height = h;
    const off = buffer.getContext('2d'), image = off.createImageData(w, h);
    const real = p.real + Math.sin(time * .13) * p.motion * .018;
    const imaginary = p.imaginary + Math.cos(time * .11) * p.motion * .018;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = juliaSample((x / w - .5) * 3.5 / p.zoom, (y / h - .5) * 3.5 * h / w / p.zoom, real, imaginary, Math.round(p.detail));
      const tone = .5 + .5 * Math.cos(s.smooth * .19);
      const c = mix(mix(colors[0], colors[1], tone), colors[2], s.trap * p.trap);
      const light = s.escaped ? .22 + .65 * Math.min(1, s.smooth / 18) : .025 + s.trap * p.trap * .28;
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) image.data[i + ch] = c[ch] * light * (1 + level * .4);
      image.data[i + 3] = 255;
    }
    off.putImageData(image, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(buffer, 0, 0, width, height); return;
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
}
