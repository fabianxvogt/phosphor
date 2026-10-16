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
      [-1.35, -0.55, 0.88], // single rolled foreground frame
      [0.06, -0.05, 1.22], // hero; all other centres are persistent scale cues
      [-1.75, 1.85, 0.65],
      [1.85, 2.0, 0.68],
      [-1.45, 2.18, 0.4],
      [1.4, -0.3, 0.62],
      [-1.5, 1.62, 0.48],
      [1.53, 2.22, 0.52],
      [-1.12, 2.52, 0.56],
      [-1.78, 2.9, 0.48],
      [2.0, 2.78, 0.44],
      [-1.52, 3.15, 0.55],
      [-2.0, 3.32, 0.62],
      [1.68, 3.2, 0.54],
    ];
  return base.map(([x, y, size], i) => ({
    x: x + (rand() - 0.5) * 0.34,
    y: y + (rand() - 0.5) * 0.24,
    size: size * (0.9 + 0.2 * rand()),
    angle: rand() * Math.PI * 2,
    petals: i === 1 ? 8 : i === 0 ? 3 : 5 + (i % 5),
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
    // Independent rooted stalks: never draw a graph between flower centres.
    grid(i === 1 ? 34 : 24, i === 1 ? 8 : 6, n.x, n.y, n.size, n.angle, 1, i);
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
  {
    phase = 0,
    sway = 1,
    level = 0.5,
    edgeGesture = 0,
    flush = 0,
    count = 0,
  } = {},
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
  const cohort = (0.5 + 0.5 * Math.cos(angle - count * 2.39996)) ** 3;
  const veinDelay =
    0.1 * Math.sin(angle * 3 + node.id) +
    0.06 * Math.cos(angle * 5 - node.id) +
    0.07 * v * v;
  const front = 1.12 - 1.25 * flush - veinDelay;
  const released =
    (1 - smooth((t - (front - 0.13)) / 0.25)) * smooth(flush / 0.22);
  const release = released * (0.25 + 0.75 * cohort) * (0.35 + 0.65 * flower);
  const mix = (a, b, w) => a + (b - a) * w;
  const opening = membrane * (node.id === 0 ? 0.3 : 1),
    bloom = flower * (node.id === 0 ? 0.3 : 1);
  const reach =
    mix(
      mix(0.86 * t - 0.58 * t ** 3, 0.92 * t - 0.32 * t ** 3, opening),
      0.99 * t - 0.16 * t ** 3,
      bloom,
    ) *
    (1 + 0.1 * Math.sin(angle * 3 + node.id));
  const width = mix(mix(0.19, 0.26, opening), 0.34, bloom) * (8 / node.petals);
  const pet = radial.map(
    (r, i) =>
      r * (reach + 0.22 * release * t * t) +
      side[i] *
        (v * width * envelope * Math.sqrt(t) +
          0.14 * Math.sin(t * Math.PI) * (0.65 + 0.35 * level) * (1 - bloom)),
  );
  const drift =
    0.012 *
    sway *
    Math.sin(phase * 0.4 + node.id * 1.3 + angle) *
    t *
    t *
    (1 - membrane + flower);
  const p = [node.x, node.y].map(
    (x, i) => x + node.size * pet[i] + side[i] * drift,
  );
  const cup = mix(
    mix(
      0.64 * t + 0.16 * Math.sin(t * Math.PI),
      0.54 * t * t + 0.08 * Math.sin(t * Math.PI),
      opening,
    ),
    0.63 * t * t - 0.12 * Math.sin(t * Math.PI),
    bloom,
  );
  const pleat =
    (0.012 * Math.cos(v * Math.PI * 2) +
      0.075 * v * v +
      0.018 * Math.sin(t * 13 + angle * 2) * v) *
    envelope *
    Math.sqrt(t);
  const layer = 0.065 * Math.sin(angle * 3 + node.id) * t * t;
  const z =
    node.size *
      (cup + pleat + layer + (0.1 * edgeGesture - 0.34 * release) * t * t) +
    0.025 * sway * Math.sin(phase * 0.52 + node.id + t * 4) * t;
  return orientPoint(node, [...p, z]);
}

// Common rigid frame preserves exact seams and all centre identities.
export function orientPoint(node, point) {
  const tx = node.id === 1 ? 0.1 : 0.75 * Math.sin(node.id * 2.3);
  const ty = node.id === 1 ? -0.08 : 0.65 * Math.cos(node.id * 1.7);
  let [x, y, z] = point.map(
    (v, i) => v - (i === 0 ? node.x : i === 1 ? node.y : 0),
  );
  [y, z] = [
    Math.cos(tx) * y - Math.sin(tx) * z,
    Math.sin(tx) * y + Math.cos(tx) * z,
  ];
  [x, z] = [
    Math.cos(ty) * x - Math.sin(ty) * z,
    Math.sin(ty) * x + Math.cos(ty) * z,
  ];
  return [
    x + node.x,
    y + node.y,
    z + (node.id === 1 ? 0.02 : 0.12 * Math.sin(node.id * 2.1)),
  ];
}

export function projectPoint(point, time, aspect = 16 / 9, kick = 0) {
  const yaw = 0.26 * Math.sin(time * 0.025) + 0.08 * Math.sin(time * 0.017);
  const eye = [3.15 * Math.sin(yaw), -3.15 * Math.cos(yaw), 3.1];
  const norm = (v) => {
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };
  const F = norm(eye.map((x, i) => (i === 2 ? 0.3 : 0) - x));
  const R = norm([F[1], -F[0], 0]);
  const U = [R[1] * F[2], -R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  const q = point.map((x, i) => x - eye[i]),
    dot = (v) => q.reduce((sum, x, i) => sum + x * v[i], 0);
  const fit = Math.max(0, Math.min(1, (aspect - 1) / 0.5));
  const depth = dot(F),
    lens =
      (2.3 + 1.05 * fit * fit * (3 - 2 * fit)) *
      (1 + 0.015 * Math.max(0, Math.min(1, kick)));
  return [
    (dot(R) * lens) / (Math.max(1, aspect) * depth),
    (dot(U) * lens) / (Math.max(1, 1 / aspect) * depth),
    depth,
  ];
}
