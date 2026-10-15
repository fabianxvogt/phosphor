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
  const theta =
    (u - 0.5) * (2.6 + (5.95 - 2.6) * crown) + sheet * 0.13 + (h - 0.5) * 0.35;
  const w = theta * 5 + phase + sheet * 2.3;
  const kink = Math.sin(w + 0.65 * Math.sin(2 * w - phase));
  const radius =
    ((24 + sheet * 7) * (1 - crown) + (7 + sheet * 2) * crown) * spread;
  const ripple =
    (0.65 + 1.65 * rise) * fold * kink + 0.6 * Math.sin(9 * theta - 2 * phase);
  const r = radius + ripple;
  const bend = theta + 0.11 * rise * fold * Math.sin(8 * theta - phase + sheet);
  const z = (27 + sheet * 4) * (1 - crown) + r * Math.cos(bend);
  const x = r * Math.sin(bend);
  const base =
    (7.3 +
      sheet * 0.6 +
      3.5 * Math.cos(theta) +
      rise * (3 + 2.5 * Math.sin(3 * theta + phase))) *
      (1 - crown) +
    (19 + sheet * 3.5 + 2 * Math.sin(3 * theta + phase)) * crown;
  const length =
    (8.8 + 20 * rise + 31 * crown) *
    height *
    (0.8 + 0.2 * Math.sin(4 * theta - phase + sheet));
  return [
    x + FIELD[0] * length * v,
    base + length * v,
    z + FIELD[2] * length * v,
  ];
}
export const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
export function camera(development, phase = 0, tilt = 0, spread = 1, kick = 0) {
  const crown = smooth(1, 2, development);
  const yaw = 0.04 * Math.sin(phase);
  const pitch =
    0.12 +
    0.1 * smooth(0, 1, development) +
    1.29 * smooth(0, 0.82, crown) +
    tilt;
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
    0.8 * Math.sin(phase),
    1.25 + 0.12 * Math.sin(2 * phase),
    0.65 * Math.cos(phase),
  ];
  const focal =
    (1.3 * (1 - 0.17 * Math.sin(Math.PI * crown)) * (1 + 0.018 * kick)) /
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
