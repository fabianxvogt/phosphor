// Fixed ancestry: generation depends only on seed, never on development or time.
function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function organism(seed) {
  const rand = random(seed),
    base = [
      [-0.98, -0.55, 0.43],
      [0.06, -0.05, 1.22], // hero; all other centres are persistent scale cues
      [-0.68, 0.92, 0.48],
      [0.8, 0.91, 0.35],
      [-1.25, 0.48, 0.29],
      [1.12, -0.63, 0.3],
      [-0.84, -1.05, 0.26],
      [1.2, 0.3, 0.32],
      [-1.8, 1.6, 0.45],
      [0.1, 1.9, 0.5],
      [1.7, 1.65, 0.4],
      [-2.6, 2.5, 0.5],
      [-0.7, 2.6, 0.55],
      [2.8, 2.7, 0.5],
    ];
  return base.map(([x, y, size], i) => ({
    x: x + (rand() - 0.5) * 0.34,
    y: y + (rand() - 0.5) * 0.24,
    size: size * (0.9 + 0.2 * rand()),
    angle: rand() * Math.PI * 2,
    petals: 7 + (i % 2),
    id: i,
  }));
}

export function mesh(nodes) {
  const a = [];
  function grid(nx, ny, cx, cy, size, angle, kind, id) {
    function v(x, y) {
      a.push(x / nx, (y / ny) * 2 - 1, cx, cy, size, angle, kind, id);
    }
    for (let x = 0; x < nx; x++)
      for (let y = 0; y < ny; y++) {
        v(x, y);
        v(x + 1, y);
        v(x, y + 1);
        v(x, y + 1);
        v(x + 1, y);
        v(x + 1, y + 1);
      }
  }
  nodes.forEach((n, i) => {
    for (let p = 0; p < n.petals; p++)
      grid(
        i === 1 ? 28 : 16,
        i === 1 ? 12 : 6,
        n.x,
        n.y,
        n.size,
        n.angle + (p / n.petals) * Math.PI * 2,
        0,
        i,
      );
    grid(i === 1 ? 12 : 8, i === 1 ? 16 : 12, n.x, n.y, n.size, 0, 2, i);
    // A connected tree, retained throughout the entire transformation.
    const parent = i < 3 ? { x: 0, y: -1.25 } : nodes[i % 3];
    const dx = n.x - parent.x,
      dy = n.y - parent.y;
    grid(
      i === 1 ? 34 : 24,
      i === 1 ? 8 : 6,
      parent.x,
      parent.y,
      Math.hypot(dx, dy),
      Math.atan2(dy, dx),
      1,
      i,
    );
  });
  return new Float32Array(a);
}

export const createGeometry = (seed) => mesh(organism(seed));

// CPU reference for the signature deformation; phase is the integrated
// speed clock, not time times a changing speed. No identity is regenerated.
export function petalPoint(
  node,
  petal,
  t,
  v,
  development,
  { phase = 0, sway = 1, edgeGesture = 0 } = {},
) {
  const smooth = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  };
  const membrane = smooth(development),
    flower = smooth(development - 1);
  const angle = node.angle + (petal / node.petals) * Math.PI * 2;
  const radial = [Math.cos(angle), Math.sin(angle)],
    side = [-radial[1], radial[0]];
  const envelope =
    Math.max(
      0.00001,
      Math.sin(Math.PI * Math.pow(Math.max(0, Math.min(1, t)), 0.83)),
    ) ** 0.75;
  const sector = angle + (v * Math.PI) / node.petals;
  const filament = [
    radial[0] * t * 0.7 + side[0] * v * 0.012 * envelope,
    radial[1] * t * 0.7 + side[1] * v * 0.012 * envelope,
  ];
  const sheet = [Math.cos(sector) * t * 0.7, Math.sin(sector) * t * 0.7];
  const pet = [
    radial[0] * (t * 0.98 - 0.16 * t * t * t) + side[0] * v * 0.29 * envelope,
    radial[1] * (t * 0.98 - 0.16 * t * t * t) + side[1] * v * 0.29 * envelope,
  ];
  const mix = (a, b, w) => a + (b - a) * w;
  const drift =
    0.012 *
    sway *
    Math.sin(phase * 0.4 + node.id * 1.3 + angle) *
    t *
    t *
    (1 - membrane + flower);
  const p = [node.x, node.y].map(
    (x, i) =>
      x +
      node.size * mix(mix(filament[i], sheet[i], membrane), pet[i], flower) +
      side[i] * drift,
  );
  const sheetRise =
    node.size *
    (0.1 * Math.sin(t * Math.PI) +
      0.014 * Math.sin(sector * node.petals) * t * t);
  const petalRise =
    node.size *
    (0.62 * t * t -
      0.12 * Math.sin(t * Math.PI) +
      0.016 * Math.cos(v * Math.PI * 2) * envelope +
      0.1 * v * v * envelope +
      0.025 * edgeGesture * t * t);
  const filamentRise =
    0.025 * Math.sin(t * Math.PI) +
    0.012 * Math.sqrt(Math.max(0, 1 - v * v)) * envelope;
  const z =
    mix(mix(filamentRise, sheetRise, membrane), petalRise, flower) +
    0.008 * sway * Math.sin(phase * 0.52 + node.id + t * 4) * t;
  return [...p, z];
}

export function projectPoint(point, time, aspect = 16 / 9, kick = 0) {
  const yaw = 0.26 * Math.sin(time * 0.025) + 0.08 * Math.sin(time * 0.017);
  const eye = [2.55 * Math.sin(yaw), -2.55 * Math.cos(yaw), 3.65];
  const norm = (v) => {
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };
  const F = norm(eye.map((x, i) => (i === 2 ? 0.18 : 0) - x));
  const R = norm([F[1], -F[0], 0]);
  const U = [R[1] * F[2], -R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  const q = point.map((x, i) => x - eye[i]),
    dot = (v) => q.reduce((sum, x, i) => sum + x * v[i], 0);
  const fit = Math.max(0, Math.min(1, (aspect - 1) / 0.5));
  const depth = dot(F),
    lens =
      (2.75 + 0.28 * fit * fit * (3 - 2 * fit)) *
      (1 + 0.015 * Math.max(0, Math.min(1, kick)));
  return [
    (dot(R) * lens) / (Math.max(1, aspect) * depth),
    (dot(U) * lens) / (Math.max(1, 1 / aspect) * depth),
    depth,
  ];
}
