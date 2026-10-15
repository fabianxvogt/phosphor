// Thunderhead: deterministic stepped-leader graph. The GLSL mirror lives in
// scene-storm-data.mjs. Identity is (seed, network, branch, step), never dev.
export const TRUNK_STEPS = 18;
export const BRANCHES = 3;
export const BRANCH_STEPS = 4;
export const SEGMENTS = 4 * (TRUNK_STEPS + BRANCHES * BRANCH_STEPS);
export const BRANCH_PROBABILITY = 0.78;
export function hash(x) {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
export const random = (seed, network, n) =>
  (hash(
    (seed ^
      Math.imul(network + 1, 0x9e3779b9) ^
      Math.imul(n + 1, 0x85ebca6b)) >>>
      0,
  ) >>>
    8) /
  16777216;
const mix = (a, b, t) => a + (b - a) * t;
export function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
export function leaderPoint(seed, network, step) {
  // A field-biased leader: each forward step has bounded lateral jitter.
  // Subtract the root jitter so the root is exactly (0,0,0).
  return [
    (random(seed, network, step * 3) - random(seed, network, 0)) * 0.16,
    step / TRUNK_STEPS,
    (random(seed, network, step * 3 + 1) - random(seed, network, 1)) * 0.12,
  ];
}
export function leaderSegment(seed, index) {
  const network = Math.floor(index / 30),
    local = index % 30;
  if (local < TRUNK_STEPS)
    return {
      id: [network, -1, local],
      a: leaderPoint(seed, network, local),
      b: leaderPoint(seed, network, local + 1),
      active: true,
      parent: local - 1,
    };
  const branch = Math.floor((local - TRUNK_STEPS) / BRANCH_STEPS);
  const step = (local - TRUNK_STEPS) % BRANCH_STEPS;
  const attach = 4 + branch * 4;
  const origin = leaderPoint(seed, network, attach);
  const point = (n) => {
    const side = random(seed, network, 90 + branch) < 0.5 ? -1 : 1;
    const jitter = (offset) =>
      random(seed, network, offset + branch * 8 + n) -
      random(seed, network, offset + branch * 8);
    return [
      origin[0] + side * n * 0.12 + jitter(110) * 0.13,
      origin[1] + n * 0.045 + jitter(150) * 0.05,
      origin[2] + jitter(190) * 0.1,
    ];
  };
  return {
    id: [network, branch, step],
    a: point(step),
    b: point(step + 1),
    active: random(seed, network, 70 + branch) < BRANCH_PROBABILITY,
    parent: step === 0 ? attach - 1 : local - 1,
  };
}
export function worldPoint(p, network, development, height = 1) {
  const rise = smooth(0, 1, development),
    supercell = smooth(1, 2, development);
  const side = network % 2 === 0 ? -1 : 1;
  if (network >= 2)
    return [
      side * (-6.5 + p[1] * 13 + p[0] * 4),
      (mix(3.1, 5.8, rise) -
        supercell * 1.9 +
        p[1] * 0.35 +
        Math.sin(p[1] * 9) * 0.35 * rise +
        p[2] * 3) *
        height,
      4.2 + (network - 2) * 0.8 + p[2] * 4,
    ];
  const offset = network * 0.65;
  return [
    side * (0.8 + p[0] * 5 + p[1] * mix(8, 2 + offset, supercell)),
    (mix(3.1, 8.6 + offset, rise) -
      p[1] * mix(0.6, mix(3.1, 8.6 + offset, supercell), rise)) *
      height,
    5.1 + network * 0.8 + p[2] * 3.2,
  ];
}
// Display envelope, not graph identity. Integer harmonics keep both clocks
// exactly 2π-periodic, including the short local restrikes within a discharge.
export function discharge(
  phase,
  network,
  { count = 0, kick = 0, buried = 0, returned = 0 } = {},
) {
  const wave = 0.5 + 0.5 * Math.sin(phase * 6 + network * 2.9);
  const selected = Math.abs((((count % 2) + 2) % 2) - network) < 0.5 ? 1 : 0;
  const flicker = 0.55 + 0.45 * Math.sin(phase * 144 + network * 4) ** 2;
  return (
    (wave ** 40 * 0.9 +
      selected * (0.22 * kick + 0.9 * buried) +
      0.18 * returned) *
    flicker
  );
}
export function lightningGraph(seed, development = 0, height = 1) {
  return Array.from({ length: SEGMENTS }, (_, i) => {
    const s = leaderSegment(seed, i);
    return {
      ...s,
      a: worldPoint(s.a, s.id[0], development, height),
      b: worldPoint(s.b, s.id[0], development, height),
    };
  });
}
