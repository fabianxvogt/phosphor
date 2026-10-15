// Prism Engine: wavelengths in micrometres, air index = 1.
export const CAUCHY_A = 1.48;
export const CAUCHY_B = 0.012;
export const PRISM_COUNT = 19;
export const SPECTRAL_SAMPLES = 13;
export const refractiveIndex = (lambda, dispersion = 1) =>
  CAUCHY_A + (CAUCHY_B * dispersion) / (lambda * lambda);
export const minimumDeviation = (apex, n) =>
  2 * Math.asin(n * Math.sin(apex / 2)) - apex;
export const criticalAngle = (n1, n2 = 1) => Math.asin(n2 / n1);
export function refract(I, N, eta) {
  const c = I.reduce((s, x, i) => s + x * N[i], 0);
  const k = 1 - eta * eta * (1 - c * c);
  return k < 0
    ? null
    : I.map((x, i) => eta * x - (eta * c + Math.sqrt(k)) * N[i]);
}
export const PLANES = [
  [-Math.sqrt(3) / 2, 0.5, 0],
  [Math.sqrt(3) / 2, 0.5, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
export function intersectPrism(o, d) {
  let near = -1e8,
    far = 1e8,
    entry,
    exit;
  for (let i = 0; i < 5; i++) {
    const n = PLANES[i],
      b = i < 3 ? 0.5 : 0.65;
    const den = n.reduce((s, x, j) => s + x * d[j], 0);
    const dist = b - n.reduce((s, x, j) => s + x * o[j], 0);
    if (Math.abs(den) < 1e-9) {
      if (dist < 0) return null;
      continue;
    }
    const t = dist / den;
    if (den < 0 && t > near) {
      near = t;
      entry = n;
    }
    if (den > 0 && t < far) {
      far = t;
      exit = n;
    }
  }
  return far >= Math.max(near, 0) ? { near, far, entry, exit } : null;
}
export function tracePrism(lambda, dispersion = 1, slope = 0.34) {
  const n = refractiveIndex(lambda, dispersion),
    I = [Math.cos(slope), Math.sin(slope), 0];
  const origin = I.map((v) => -3 * v),
    hit = intersectPrism(origin, I);
  const entry = origin.map((v, i) => v + I[i] * hit.near);
  let direction = refract(I, hit.entry, 1 / n),
    p = entry,
    reflections = 0;
  const points = [origin, entry];
  for (let i = 0; i < 3; i++) {
    const h = intersectPrism(
      p.map((v, j) => v + direction[j] * 1e-5),
      direction,
    );
    p = p.map((v, j) => v + direction[j] * (h.far + 1e-5));
    points.push(p);
    const out = refract(
      direction,
      h.exit.map((v) => -v),
      n,
    );
    if (out) return { points, direction: out, reflections };
    const c = direction.reduce((s, v, j) => s + v * h.exit[j], 0);
    direction = direction.map((v, j) => v - 2 * c * h.exit[j]);
    reflections++;
  }
  return { points, direction, reflections };
}
export function traceLens(lambda, aperture = [0.65, 0]) {
  const norm = (v) => v.map((x) => x / Math.hypot(...v));
  const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
  const entry = [...aperture, -0.22 + 0.19 * dot2(aperture, aperture)];
  const d = refract(
    [0, 0, 1],
    norm([0.38 * aperture[0], 0.38 * aperture[1], -1]),
    1 / refractiveIndex(lambda),
  );
  const a = 0.19 * dot2(d, d),
    b = d[2] + 0.38 * dot2(entry, d),
    c = entry[2] - 0.22 + 0.19 * dot2(entry, entry);
  const path = (-2 * c) / (b + Math.sqrt(b * b - 4 * a * c));
  const exit = entry.map((v, i) => v + d[i] * path);
  const direction = refract(
    d,
    norm([-0.38 * exit[0], -0.38 * exit[1], -1]),
    refractiveIndex(lambda),
  );
  const focusDistance = -dot2(exit, direction) / dot2(direction, direction);
  return {
    entry,
    exit,
    direction,
    focus: exit.map((v, i) => v + direction[i] * focusDistance),
  };
}
export const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function identity(seed, id) {
  return {
    id,
    phase: ((seed % 997) * 0.0063 + id * 2.39996323) % (2 * Math.PI),
    side: id % 2 ? -1 : 1,
    bay: Math.floor((id - 1) / 2),
  };
}
export function prismPose(seed, id, development, phase = 0, spacing = 1) {
  const ident = identity(seed, id),
    rise = smooth(0, 1, development),
    vault = smooth(1, 2, development);
  const yaw =
    0.06 + 0.22 * Math.sin(phase) + 0.12 * Math.sin((seed % 997) * 0.0063);
  if (!id)
    return {
      identity: ident,
      center: [0, 1.55 + 0.6 * vault, 0],
      scale: 2 - 0.35 * rise + 0.18 * vault,
      angle: 0.08 * Math.sin(phase),
      yaw,
    };
  if (id > 18) {
    const lens = id - 19,
      side = lens % 2 ? -1 : 1;
    return {
      identity: ident,
      center: [
        side * 1.75 * spacing * rise,
        (2.15 + 1.05 * vault) * rise,
        (Math.floor(lens / 2) - 0.5) * 3.5 * rise,
      ],
      scale: (0.65 + 0.3 * vault) * rise,
      angle: 0,
      yaw: side * 0.35 + 0.1 * Math.sin(phase),
    };
  }
  const upper = id > 8,
    growth = upper ? vault : rise,
    bay = upper ? Math.floor((id - 9) / 2) : ident.bay;
  const side = ident.side;
  const center = [
    side * (upper ? 2.6 - 0.35 * bay : 2.65) * spacing * growth,
    (upper ? 2.8 + bay * 0.43 : 1.05 + 0.12 * Math.sin(ident.phase)) * growth,
    (bay - (upper ? 2 : 1.5)) * 1.65 * growth,
  ];
  return {
    identity: ident,
    center,
    scale: (upper ? 0.85 : 0.8) * growth,
    angle:
      (upper ? side * (0.2 + bay * 0.035) : side * 0.12) +
      0.07 * Math.sin(phase + ident.phase),
    yaw:
      Math.atan2(
        -(bay - (upper ? 2 : 1.5)) * 1.65,
        side * (upper ? 2.6 - 0.35 * bay : 2.65) * spacing,
      ) +
      0.08 * Math.sin(phase + ident.phase),
  };
}
const TRI = [
  [0, 1, 0],
  [-0.866025404, -0.5, 0],
  [0.866025404, -0.5, 0],
];
const corners = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
export const ATTRIBUTES = [3, 3, 4]; // position, normal, object/kind/wavelength/segment
export const STRIDE = 10;
export const LENS_COUNT = 4;
export const LENS_SLICES = 48;
export const LENS_RINGS = 8;
export const ADDITIVE_FROM =
  PRISM_COUNT * 48 + LENS_COUNT * LENS_SLICES * LENS_RINGS * 12;
export function createGeometry(seed) {
  const data = [];
  const push = (p, n, id, kind, wavelength = 0, segment = 0) =>
    data.push(...p, ...n, id, kind, wavelength, segment);
  for (const kind of [0, 4])
    for (let id = 0; id < PRISM_COUNT; id++) {
      for (const z of [-0.65, 0.65])
        for (const i of [0, 1, 2])
          push([TRI[i][0], TRI[i][1], z], [0, 0, Math.sign(z)], id, kind);
      for (let face = 0; face < 3; face++) {
        const a = TRI[face],
          b = TRI[(face + 1) % 3];
        const dx = b[0] - a[0],
          dy = b[1] - a[1],
          n = [dy / Math.hypot(dx, dy), -dx / Math.hypot(dx, dy), 0];
        for (const [v, z] of [
          [a, -0.65],
          [b, -0.65],
          [a, 0.65],
          [a, 0.65],
          [b, -0.65],
          [b, 0.65],
        ])
          push([v[0], v[1], z], n, id, kind);
      }
    }
  for (let lens = 0; lens < LENS_COUNT; lens++) {
    const point = (r, a, side) => {
      const z = side * (0.03 + 0.19 * (1 - r * r));
      const n = [0.38 * r * Math.cos(a), 0.38 * r * Math.sin(a), side];
      return { p: [r * Math.cos(a), r * Math.sin(a), z], n };
    };
    for (const side of [-1, 1])
      for (let j = 0; j < LENS_RINGS; j++)
        for (let i = 0; i < LENS_SLICES; i++) {
          const a = (i * Math.PI * 2) / LENS_SLICES,
            b = ((i + 1) * Math.PI * 2) / LENS_SLICES;
          const r = j / LENS_RINGS,
            s = (j + 1) / LENS_RINGS;
          for (const [rr, aa] of [
            [r, a],
            [s, a],
            [r, b],
            [r, b],
            [s, a],
            [s, b],
          ]) {
            const v = point(rr, aa, side);
            push(v.p, v.n, PRISM_COUNT + lens, 3);
          }
        }
  }
  for (let id = 0; id < PRISM_COUNT; id++)
    for (let l = 0; l < SPECTRAL_SAMPLES; l++)
      for (let segment = 0; segment < 4; segment++)
        for (const [x, y] of corners)
          push(
            [x, y, 0],
            [0, 0, 0],
            id,
            segment === 3 ? 2 : 1,
            l / (SPECTRAL_SAMPLES - 1),
            segment,
          );
  // Five aperture rays per wavelength show the real converging bundle of
  // each biconvex lens; the final quad is its small airy focal caustic.
  for (let lens = 0; lens < LENS_COUNT; lens++)
    for (let l = 0; l < SPECTRAL_SAMPLES; l++)
      for (let aperture = 0; aperture < 5; aperture++) {
        const angle = (aperture * Math.PI * 2) / 5;
        for (let segment = 0; segment < 4; segment++)
          for (const [x, y] of corners)
            push(
              [x, y, 0],
              [0.65 * Math.cos(angle), 0.65 * Math.sin(angle), 0],
              PRISM_COUNT + lens,
              segment === 3 ? 2 : 1,
              l / (SPECTRAL_SAMPLES - 1),
              segment,
            );
      }
  // Seed is deliberately NOT a source of topology; it only selects persistent poses.
  return new Float32Array(data);
}
