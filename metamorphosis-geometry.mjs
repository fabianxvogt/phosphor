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
      [-0.55, -0.62, 0.68],
      [0.58, -0.3, 0.86],
      [-0.42, 0.44, 0.78],
      [0.64, 0.77, 0.43],
      [-1.02, 0.91, 0.38],
      [1.22, -0.87, 0.35],
      [-1.25, -0.93, 0.32],
      [1.25, 0.34, 0.4],
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
        36,
        20,
        n.x,
        n.y,
        n.size,
        n.angle + (p / n.petals) * Math.PI * 2,
        0,
        i,
      );
    grid(12, 16, n.x, n.y, n.size, 0, 2, i);
    // A connected tree, retained throughout the entire transformation.
    const parent = i < 3 ? { x: 0, y: -1.25 } : nodes[i % 3];
    const dx = n.x - parent.x,
      dy = n.y - parent.y;
    grid(
      34,
      8,
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
