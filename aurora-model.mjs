// Persistent material coordinates: development never changes topology or IDs.
export const SHEETS = 3;
export const COLUMNS = 384;
export const ROWS = 12;
export const FIELD = [0.035, 1, -0.025];
export const ATTRIBUTES = [2, 1, 1];
export function createGeometry(seed) {
  // Seed is read in the shader, not used to re-index the material lattice.
  const data = new Float32Array(SHEETS * COLUMNS * ROWS * 6 * 2 * 4);
  let n = 0;
  for (let mirror = 0; mirror < 2; mirror++)
    for (let sheet = 0; sheet < SHEETS; sheet++)
      for (let x = 0; x < COLUMNS; x++)
        for (let y = 0; y < ROWS; y++)
          for (const [dx, dy] of [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
            [1, 1],
            [0, 1],
          ]) {
            data[n++] = (x + dx) / COLUMNS;
            data[n++] = (y + dy) / ROWS;
            data[n++] = sheet;
            data[n++] = mirror;
          }
  return data;
}
export const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Exact CPU mirror of the shader's folded base curve / field-line extrusion.
export function sheetPoint(
  u,
  v,
  sheet,
  development,
  phase = 0,
  seed = 1061,
  fold = 1,
  height = 1,
  spread = 1,
) {
  const rise = smooth(0, 1, development),
    crown = smooth(1, 2, development);
  const h = ((seed % 8192) * 0.61803398875) % 1;
  const theta = (u - 0.5) * 6.18 + sheet * 0.24 + (h - 0.5) * 0.35;
  const w = theta * 2.3 + phase + sheet * 2.3;
  const kink = Math.sin(w + 0.65 * Math.sin(2 * w - phase));
  const radius =
    ((32 + sheet * 20) * (1 - crown) + (26 + sheet * 18) * crown) * spread;
  const ripple =
    (3 + 6 * rise) * fold * kink + 1.7 * Math.sin(9 * theta - 2 * phase);
  const r = radius + ripple;
  const bend = theta + 0.17 * fold * Math.sin(5 * theta - phase + sheet);
  const overheadX = theta * 35 + 24 * Math.sin(w);
  const overheadZ =
    25 + sheet * 33 + 16 * Math.sin(theta * 1.3 + sheet * 1.7) + ripple * 0.65;
  const z = (8 + r * Math.cos(bend)) * (1 - crown) + overheadZ * spread * crown;
  const x = r * Math.sin(bend) * (1 - crown) + overheadX * spread * crown;
  const base =
    14 +
    sheet * 3 +
    6 * Math.sin(1.6 * theta + phase + sheet) +
    3.5 * Math.sin(4.3 * theta - phase) +
    0.55 * Math.sin(23 * theta - phase);
  const length =
    (62 + 30 * rise + 120 * crown) *
    height *
    (0.85 + 0.15 * Math.sin(4 * theta - phase + sheet));
  return [
    x + FIELD[0] * length * v,
    base + length * v,
    z + FIELD[2] * length * v,
  ];
}
// Fragment-space contour; independent of the coarse vertical mesh rows.
export function hemOffset(u, phase = 0, sheet = 0, development = 0) {
  const angle = u * 2 * Math.PI;
  const crown = smooth(1, 2, development);
  return (
    0.005 +
    (1 - 0.5 * crown) *
      (0.0014 * Math.sin(angle * 61 - 3 * phase + sheet) +
        0.0008 * Math.sin(angle * 137 + 2 * phase))
  );
}
export const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
export function camera(development, phase = 0, tilt = 0, spread = 1, kick = 0) {
  const crown = smooth(1, 2, development);
  const yaw = 0.055 * Math.sin(phase);
  const pitch = 0.3 + 0.08 * smooth(0, 1, development) + 0.12 * crown + tilt;
  const forward = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
  const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up = [
    -Math.sin(yaw) * Math.sin(pitch),
    Math.cos(pitch),
    -Math.cos(yaw) * Math.sin(pitch),
  ];
  const eye = [
    1.4 * Math.sin(phase),
    2.2 + 0.16 * Math.sin(2 * phase) + 0.8 * crown,
    1.1 * Math.cos(phase),
  ];
  const focal =
    ((1.22 * (1 - crown) + 0.8 * crown) * (1 + 0.018 * kick)) /
    (1 + (Math.max(1, spread) - 1) * crown);
  return { eye, right, up, forward, focal };
}
export function project(point, eye, right, up, forward, focal = 1.3) {
  const q = point.map((x, i) => x - eye[i]);
  return [
    (focal * dot(q, right)) / dot(q, forward),
    (focal * dot(q, up)) / dot(q, forward),
  ];
}
// Direction, not a point: all parallel field lines have this vanishing point.
export function zenith(right, up, forward, focal = 1.3) {
  return [
    (focal * dot(FIELD, right)) / dot(FIELD, forward),
    (focal * dot(FIELD, up)) / dot(FIELD, forward),
  ];
}
