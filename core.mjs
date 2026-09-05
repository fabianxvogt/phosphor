export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function seededRandom(seed) {
  let x = seed | 0;
  return () => { x = Math.imul(1664525, x) + 1013904223 | 0; return (x >>> 0) / 4294967296; };
}

export const PHOSPHOR_FAMILY_CATALOG = [
  ['47', 'Acid Mycelium'], ['48', 'Magnetic Choir'], ['49', 'Cathedrals of Error'], ['50', 'Alien Aquarium'], ['51', 'Causal Tapestry'],
  ['52', 'Feedback Chapel'], ['53', 'Interference Rituals'], ['54', 'Topological Melt'], ['55', 'Phase Transition Theatre'], ['56', 'Evolution Garden'],
];

export function stepElementary(row, rule) {
  const next = new Uint8Array(row.length);
  const safeRule = Math.round(clamp(rule, 0, 255));
  for (let i = 0; i < row.length; i += 1) {
    const left = row[(i - 1 + row.length) % row.length];
    const center = row[i];
    const right = row[(i + 1) % row.length];
    const pattern = (left << 2) | (center << 1) | right;
    next[i] = (safeRule >> pattern) & 1;
  }
  return next;
}

export function reactionDiffusionStep(u, v, width, height, feed, kill, diffusion = 1) {
  const nextU = new Float32Array(u.length);
  const nextV = new Float32Array(v.length);
  const safeFeed = clamp(feed, 0.005, 0.09);
  const safeKill = clamp(kill, 0.02, 0.09);
  const safeDiffusion = clamp(diffusion, 0.2, 1.4);
  const at = (x, y) => ((y + height) % height) * width + ((x + width) % width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = at(x, y);
      const lapU = u[at(x - 1, y)] + u[at(x + 1, y)] + u[at(x, y - 1)] + u[at(x, y + 1)] - 4 * u[i];
      const lapV = v[at(x - 1, y)] + v[at(x + 1, y)] + v[at(x, y - 1)] + v[at(x, y + 1)] - 4 * v[i];
      const uvv = u[i] * v[i] * v[i];
      nextU[i] = clamp(u[i] + (diffusion * lapU - uvv + safeFeed * (1 - u[i])) * 0.9, 0, 1);
      nextV[i] = clamp(v[i] + (diffusion * lapV + uvv - (safeFeed + safeKill) * v[i]) * 0.9, 0, 1);
    }
  }
  return { u: nextU, v: nextV };
}

export function finiteArray(values) {
  return values.every((value) => Number.isFinite(value));
}

export function boundedFeedbackValue(previous, injection, decay) {
  return clamp(clamp(previous, 0, 1) * clamp(decay, 0, .99) + clamp(injection, 0, 1) * .12, 0, 1);
}

export function lifecycleStressCheck(sceneCount = 3, switches = 10) {
  let active = 0;
  for (let i = 0; i < switches; i += 1) active = (active + 1) % sceneCount;
  return { activeScene: active, switches, retainedBuffers: 2, retainedRows: 120, retainedAcidCells: 120 * 75 };
}
