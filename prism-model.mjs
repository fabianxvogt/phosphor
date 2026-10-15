// Prism Engine: wavelengths in micrometres, air index = 1.
export const CAUCHY_A = 1.48;
export const CAUCHY_B = 0.012;
export const PRISM_COUNT = 19;
export const SPECTRAL_SAMPLES = 41;
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
// Independently follow the energy reflected at the first exit face.
// A branch still undergoing TIR at its second exit is deliberately omitted.
export function traceSecondary(lambda, dispersion = 1, slope = 0.34) {
  const primary = tracePrism(lambda, dispersion, slope);
  const entry = primary.points[1],
    leave = primary.points[2];
  const delta = leave.map((v, i) => v - entry[i]),
    len = Math.hypot(...delta);
  const d = delta.map((v) => v / len);
  const h = intersectPrism(
    entry.map((v, i) => v + d[i] * 1e-5),
    d,
  );
  const cosine = d.reduce((s, v, i) => s + v * h.exit[i], 0);
  const bounce = d.map((v, i) => v - 2 * cosine * h.exit[i]);
  const next = intersectPrism(
    leave.map((v, i) => v + bounce[i] * 1e-5),
    bounce,
  );
  const exit = leave.map((v, i) => v + bounce[i] * (next.far + 1e-5));
  const direction = refract(
    bounce,
    next.exit.map((v) => -v),
    refractiveIndex(lambda, dispersion),
  );
  return { entry: leave, exit, bounce, normal: next.exit, direction };
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
      center: [0, 1.55 + 0.25 * vault, -2.2 * vault],
      scale: 2 - 0.35 * rise + 0.45 * vault,
      angle: 0.08 * Math.sin(phase),
      yaw,
    };
  if (id > 18) {
    const lens = id - 19,
      side = lens % 2 ? -1 : 1;
    return {
      identity: ident,
      center: [
        side * (1.75 - 0.7 * vault) * spacing * rise,
        (2.15 + vault * (Math.floor(lens / 2) < 0.5 ? 1.05 : 3.15)) * rise,
        ((Math.floor(lens / 2) - 0.5) * 3.5 * (1 - vault) - 1.2 * vault) * rise,
      ],
      scale: (0.65 + 0.04 * vault) * rise,
      angle: 0,
      yaw: (side * 0.35 + 0.1 * Math.sin(phase)) * (1 - vault),
    };
  }
  const upper = id > 8,
    growth = upper ? vault : rise,
    bay = upper ? Math.floor((id - 9) / 2) : ident.bay;
  const side = ident.side;
  if (upper) {
    const theta = (id - 9) * 0.6283185307 + 0.06 * Math.sin(phase);
    return {
      identity: ident,
      center: [
        Math.cos(theta) * 2.45 * spacing * growth,
        (4.25 + Math.sin(theta) * 2.45) * growth,
        -1.5 * growth,
      ],
      scale: 0.82 * growth,
      angle: theta + 3.48,
      yaw: 0.05 * Math.sin(phase + ident.phase),
    };
  }
  const center = [
    side * (upper ? 2.6 : 2.65 + 0.4 * vault) * spacing * growth,
    (upper
      ? 4.3 + 0.15 * bay
      : 1.05 + 1.15 * vault + 0.12 * Math.sin(ident.phase)) * growth,
    (bay - (upper ? 2 + 1.6 * vault : 1.5 + 0.9 * vault)) *
      (1.65 + 0.95 * vault) *
      growth,
  ];
  return {
    identity: ident,
    center,
    scale: (upper ? 1.05 : 0.8) * growth,
    angle:
      (upper ? side * 0.16 : side * 0.12) +
      0.07 * Math.sin(phase + ident.phase),
    yaw:
      Math.atan2(
        -(bay - (upper ? 2 : 1.5)) * 1.65,
        side * (upper ? 2.6 : 2.65) * spacing,
      ) +
      Math.PI * vault +
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
export const ARCH_BAYS = 7;
export const ARCH_SEGMENTS = 7; // column + six curved ribs, on each side
export const ARCH_RIB_COUNT = ARCH_BAYS * ARCH_SEGMENTS * 2;
export const ARCH_RAIL_COUNT = (ARCH_BAYS - 1) * 3;
export const ARCH_COUNT = ARCH_RIB_COUNT + ARCH_RAIL_COUNT;
export const VAULT_PANELS = (ARCH_BAYS - 1) * 12;
export const ARCH_FIRST = PRISM_COUNT + LENS_COUNT;
export const ADDITIVE_FROM =
  (PRISM_COUNT + ARCH_COUNT) * 48 +
  LENS_COUNT * LENS_SLICES * LENS_RINGS * 12 +
  VAULT_PANELS * 6;
// Two equal circular arcs meet continuously at a pointed vault crown.
export function archPoint(side, t, spacing = 1) {
  const w = 3.3 * spacing,
    x = w * (1 - t);
  return [side * x, 2.3 + Math.sqrt(Math.max(0, 4 * w * w - (w + x) ** 2))];
}
export function archPose(id, development, spacing = 1) {
  const index = id - ARCH_FIRST,
    growth = smooth(1, 2, development);
  if (index >= ARCH_RIB_COUNT) {
    const rail = index - ARCH_RIB_COUNT,
      side = (rail % 3) - 1;
    return {
      center: [
        side * 3.3 * spacing * growth,
        (side ? 2.3 : archPoint(1, 1, spacing)[1]) * growth,
        (4.5 - Math.floor(rail / 3) * 3) * growth,
      ],
      scale: growth,
      angle: 0,
      stretch: [0.14, 0.14, 3 / 1.3],
    };
  }
  const bay = Math.floor(index / 14);
  const side = index % 14 < 7 ? -1 : 1,
    step = index % 7;
  const a = step
    ? archPoint(side, (step - 1) / 6, spacing)
    : [side * 3.3 * spacing, 0.04];
  const b = step
    ? archPoint(side, step / 6, spacing)
    : archPoint(side, 0, spacing);
  return {
    center: [
      (a[0] + b[0]) * 0.5 * growth,
      (a[1] + b[1]) * 0.5 * growth,
      (6 - bay * 3) * growth,
    ],
    scale: growth,
    angle: -Math.atan2(b[0] - a[0], b[1] - a[1]),
    stretch: [0.23, 0.23, Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.3],
  };
}
export function createGeometry(seed) {
  const data = [];
  const push = (p, n, id, kind, wavelength = 0, segment = 0) =>
    data.push(...p, ...n, id, kind, wavelength, segment);
  for (const mirror of [false, true])
    for (let index = 0; index < PRISM_COUNT + ARCH_COUNT; index++) {
      const architectural = index >= PRISM_COUNT;
      const id = architectural ? ARCH_FIRST + index - PRISM_COUNT : index;
      const kind = architectural ? (mirror ? 6 : 5) : mirror ? 4 : 0;
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
  // Faceted, thin glass infill encloses the ribs. The normal points into
  // the nave; these are real world-space panes, not a background graphic.
  for (let bay = 0; bay < ARCH_BAYS - 1; bay++)
    for (const side of [-1, 1])
      for (let step = 0; step < 6; step++) {
        const a = archPoint(side, step / 6),
          b = archPoint(side, (step + 1) / 6);
        const dx = b[0] - a[0],
          dy = b[1] - a[1],
          len = Math.hypot(dx, dy);
        const n = [(-side * dy) / len, (side * dx) / len, 0];
        for (const [u, v] of corners) {
          const p = u < 0 ? a : b;
          push([p[0], p[1], 6 - bay * 3 - (v + 1) * 1.5], n, 0, 7);
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
            segment === 2 ? 2.5 : segment,
          );
  // Adjacent exact wavelength traces share their edges: the outgoing fan
  // is a continuous dispersive sheet, not a stack of aliased laser lines.
  for (let id = 0; id < PRISM_COUNT; id++)
    for (let l = 0; l < SPECTRAL_SAMPLES - 1; l++)
      for (const segment of [2, 5])
        for (const [x, y] of corners)
          push(
            [x, y, 0],
            [0, 0, 0],
            id,
            1,
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
