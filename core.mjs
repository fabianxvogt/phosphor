export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function seededRandom(seed) {
  let x = seed | 0;
  return () => { x = Math.imul(1664525, x) + 1013904223 | 0; return (x >>> 0) / 4294967296; };
}

export const PHOSPHOR_FAMILY_CATALOG = [
  ['47', 'Acid Mycelium'], ['48', 'Magnetic Choir'], ['49', 'Cathedrals of Error'], ['50', 'Alien Aquarium'], ['51', 'Causal Tapestry'],
  ['52', 'Feedback Chapel'], ['53', 'Interference Rituals'], ['54', 'Topological Melt'], ['55', 'Phase Transition Theatre'], ['56', 'Evolution Garden'],
];

export function qualityProfile(quality = '1080') {
  if (quality === '720') return { id: '480x300', label: '480 × 300 · 30 target', width: 480, height: 300, cadence: 30, workScale: .5, cathedralWidth: 112, cathedralHeight: 70, interferenceWidth: 160, interferenceHeight: 100, topologyPoints: 96, magneticCap: 240, aquariumCap: 32 };
  return { id: '960x600', label: '960 × 600 · 60 target', width: 960, height: 600, cadence: 60, workScale: 1, cathedralWidth: 160, cathedralHeight: 100, interferenceWidth: 240, interferenceHeight: 150, topologyPoints: 160, magneticCap: 480, aquariumCap: 64 };
}

export function cathedralShading(distance, steps, direction = [0, 0, 1], lighting = .5, material = .5, fog = .3, emission = .2) {
  const safeDistance = clamp(distance, 0, 6);
  const safeSteps = clamp(steps, 1, 64);
  const length = Math.max(.001, Math.hypot(Number(direction[0]) || 0, Number(direction[1]) || 0, Number(direction[2]) || 1));
  const normalZ = Math.abs((Number(direction[2]) || 1) / length);
  const facing = clamp((normalZ + 1) * .5, 0, 1);
  const light = clamp(lighting, 0, 1);
  const surface = clamp(material, 0, 1);
  const haze = clamp(fog, 0, 1);
  const glow = clamp(emission, 0, 1);
  const specular = Math.pow(facing, 2 + surface * 10) * (.12 + surface * .48);
  const depth = clamp(1 - safeDistance / 6, 0, 1);
  const marchConfidence = clamp(1 - safeSteps / 64, 0, 1);
  const diffuse = facing * (.2 + light * .8) * (.35 + depth * .65);
  const fogFactor = clamp(haze * (safeDistance / 6) + (1 - marchConfidence) * .18, 0, .95);
  const value = clamp((diffuse + specular + glow * (.2 + depth * .45)) * (1 - fogFactor) + glow * .12, 0, 1);
  return { value, facing, specular, fogFactor };
}

export function aquariumFoodStep(energy, patchAmount, distance, radius, feeding, dt) {
  const safeEnergy = clamp(energy, 0, 1);
  const safePatch = clamp(patchAmount, 0, 1);
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : Infinity;
  const safeRadius = clamp(radius, .001, .5);
  const safeFeeding = clamp(feeding, 0, 1);
  const safeDt = clamp(dt, 0, .05);
  if (safeEnergy <= .02 || safeDistance > safeRadius || safePatch <= 0 || safeFeeding <= 0) return { energy: safeEnergy, patchAmount: safePatch, consumed: 0, active: safeEnergy > .02 };
  const consumed = Math.min(safePatch, safeFeeding * safeDt * 60 * .018);
  return { energy: clamp(safeEnergy + consumed * .9, 0, 1), patchAmount: clamp(safePatch - consumed, 0, 1), consumed, active: true };
}

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

export function resolutionAwareInterferenceFilter(center, neighborAverage, width, height, filter) {
  const pixelRatio = clamp(240 / Math.max(1, Math.max(Number(width) || 1, Number(height) || 1)), .25, 4);
  const footprint = clamp((1 - clamp(filter, .2, 1)) * pixelRatio * .35, 0, .8);
  return clamp(clamp(center, -1, 1) * (1 - footprint) + clamp(neighborAverage, -1, 1) * footprint, -1, 1);
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

export function topologyLoopPoint(family, t, twist = .5, camera = .5, phase = 0) {
  const safeFamily = Math.round(clamp(family, 0, 3));
  const theta = (Number.isFinite(t) ? t : 0) * Math.PI * 2 + phase;
  const safeTwist = clamp(twist, 0, 1);
  const safeCamera = clamp(camera, 0, 1);
  let x; let y;
  if (safeFamily === 0) {
    x = Math.cos(theta) * (.78 + .12 * Math.cos(3 * theta + safeTwist));
    y = Math.sin(theta) * (.58 + .1 * Math.cos(3 * theta + safeTwist));
  } else if (safeFamily === 1) {
    x = Math.sin(theta) * .78;
    y = Math.sin(2 * theta) * (.34 + safeTwist * .16);
  } else if (safeFamily === 2) {
    const radius = .56 + .2 * Math.cos(5 * theta + safeTwist * Math.PI * 2);
    x = radius * Math.cos(theta);
    y = radius * Math.sin(theta);
  } else {
    x = Math.sin(2 * theta) * (.62 + safeTwist * .12);
    y = Math.sin(3 * theta + safeTwist) * (.48 + safeCamera * .16);
  }
  return [x * (1 + safeCamera * .12), y * (1 - safeCamera * .08)];
}

export function topologyClosureError(family, twist = .5, camera = .5, phase = 0) {
  const epsilon = 1e-4;
  const start = topologyLoopPoint(family, 0, twist, camera, phase);
  const end = topologyLoopPoint(family, 1, twist, camera, phase);
  const startTangent = topologyLoopPoint(family, epsilon, twist, camera, phase).map((value, i) => value - start[i]);
  const endTangent = end.map((value, i) => value - topologyLoopPoint(family, 1 - epsilon, twist, camera, phase)[i]);
  return { position: Math.hypot(start[0] - end[0], start[1] - end[1]), tangent: Math.hypot(startTangent[0] - endTangent[0], startTangent[1] - endTangent[1]) };
}

function orientation(a, b, c) {
  const value = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return value > 1e-7 ? 1 : value < -1e-7 ? -1 : 0;
}

export function countPolylineIntersections(points) {
  if (!Array.isArray(points) || points.length < 4) return 0;
  let count = 0;
  const crosses = (a, b, c, d) => orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0;
  for (let i = 0; i < points.length - 1; i += 1) for (let j = i + 2; j < points.length - 1; j += 1) {
    if (i === 0 && j === points.length - 2) continue;
    if (crosses(points[i], points[i + 1], points[j], points[j + 1])) count += 1;
  }
  return count;
}

export function coupledRegimeStep(value, neighbor, control, coupling, disturbance, release, dt, regime = 0, model = 0) {
  const safeValue = clamp(value, 0, 1);
  const safeNeighbor = clamp(neighbor, 0, 1);
  const safeControl = clamp(control, 0, 1);
  const safeCoupling = clamp(coupling, 0, 1);
  const safeDisturbance = clamp(disturbance, 0, 1);
  const safeRelease = clamp(release, 0, 1);
  const safeDt = clamp(dt, 0, .05);
  const safeRegime = Math.round(clamp(regime, 0, 5));
  const bias = (safeRegime - 2.5) * .08 + (model === 1 ? Math.sin(safeValue * Math.PI * 2) * .04 : model === 2 ? (safeValue > .5 ? .06 : -.06) : 0);
  const drive = (safeControl - .5) * .12 + bias + Math.sin(safeValue * 9 + safeRegime) * safeDisturbance * .008;
  const relaxation = (safeNeighbor - safeValue) * (.04 + safeCoupling * .2);
  return clamp(safeValue + (relaxation + drive - safeRelease * (safeValue - .5) * .04) * safeDt * 60, 0, 1);
}

export function coupledRegimeFieldStep(value, neighbor, control, coupling, disturbance, release, dt, regime = 0) {
  return coupledRegimeStep(value, neighbor, control, coupling, disturbance, release, dt, regime, 0);
}

export function lifecycleStressCheck(sceneCount = 3, switches = 10) {
  let active = 0;
  for (let i = 0; i < switches; i += 1) active = (active + 1) % sceneCount;
  return { activeScene: active, switches, retainedBuffers: 2, retainedRows: 120, retainedAcidCells: 120 * 75 };
}
