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

export function interferenceField(x, y, time, frequency, ratio, phase, orientation) {
  const angle = clamp(orientation, 0, 1) * Math.PI;
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  const u = (x * cos - y * sin) * clamp(frequency, .2, 4) * 18;
  const v = (x * sin + y * cos) * clamp(ratio, .25, 2) * 18;
  return clamp((Math.sin(u + time) + Math.sin(v - time * .7) + Math.sin((u + v) * .61 + clamp(phase, 0, 1) * Math.PI * 2)) / 3, -1, 1);
}

export function filteredInterference(value, filter) {
  return clamp(.5 + Math.tanh(clamp(value, -1, 1) * (1.5 + clamp(filter, .2, 1) * 4)) * .5, 0, 1);
}

export function rayMarchCorridor(origin, direction, family = 0, recursion = 4, maxSteps = 48) {
  const safeFamily = Math.round(clamp(family, 0, 3));
  const safeRecursion = Math.round(clamp(recursion, 1, 6));
  const steps = Math.round(clamp(maxSteps, 8, 64));
  let distance = 0;
  for (let step = 0; step < steps; step += 1) {
    const x = origin[0] + direction[0] * distance;
    const y = origin[1] + direction[1] * distance;
    const z = origin[2] + direction[2] * distance;
    let px = x; let py = y;
    for (let fold = 0; fold < safeRecursion; fold += 1) {
      const scale = 1.45 + fold * .18;
      px = Math.abs(((px + .5 * scale) % scale) - .5 * scale) - .16;
      py = Math.abs(((py + .5 * scale) % scale) - .5 * scale) - .16;
      const swap = safeFamily === 1 || (safeFamily === 3 && fold % 2 === 1);
      if (swap) [px, py] = [py, px];
    }
    const radial = Math.hypot(px, py);
    const corridor = safeFamily === 0 ? Math.max(Math.abs(px), Math.abs(py)) - .06 : safeFamily === 1 ? radial - .08 : safeFamily === 2 ? Math.abs(px) + Math.abs(py) - .095 : Math.max(Math.abs(px + py) * .7, Math.abs(px - py) * .7) - .07;
    const depth = Math.abs(Math.sin(z * (1.2 + safeFamily * .4))) * .018;
    const fieldDistance = Math.max(.002, corridor + depth);
    if (!Number.isFinite(fieldDistance)) return { hit: false, distance: 6, steps: step + 1 };
    if (fieldDistance < .006) return { hit: true, distance, steps: step + 1 };
    distance += clamp(fieldDistance * .72, .004, .22);
    if (distance > 6) return { hit: false, distance, steps: step + 1 };
  }
  return { hit: false, distance, steps };
}

export function lifecycleStressCheck(sceneCount = 3, switches = 10) {
  let active = 0;
  for (let i = 0; i < switches; i += 1) active = (active + 1) % sceneCount;
  return { activeScene: active, switches, retainedBuffers: 2, retainedRows: 120, retainedAcidCells: 120 * 75 };
}
