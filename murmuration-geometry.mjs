import { LATTICE } from "./murmuration-model.mjs";
// One small bird template per lattice bird (plus the falcon, id −1). The
// vertex shader reads each bird's simulated state and orients the template:
// x forward, y wing normal, z right. Attributes: bird id, local position,
// flap weight (0 body … 1 wing tip).
export const ATTRIBUTES = [1, 3, 1];
// Body diamond and two swept wings: four triangles, twelve vertices.
export const TEMPLATE = [
  // body, top
  [0.55, 0, 0, 0],
  [0, 0, 0.1, 0],
  [0, 0, -0.1, 0],
  // body, tail
  [-0.5, 0, 0, 0],
  [0, 0, -0.1, 0],
  [0, 0, 0.1, 0],
  // right wing
  [0.16, 0, 0.06, 0],
  [-0.12, 0, 0.06, 0],
  [-0.18, 0, 0.62, 1],
  // left wing
  [0.16, 0, -0.06, 0],
  [-0.18, 0, -0.62, 1],
  [-0.12, 0, -0.06, 0],
];
export const BIRDS = LATTICE[0] * LATTICE[1];
// A distant, procedural second flock (ids −2 … −FAR−1): a scale cue only.
export const FAR = 64 * 32;
export function createGeometry() {
  const per = TEMPLATE.length * 5;
  const data = new Float32Array((BIRDS + FAR) * per);
  let o = 0;
  // Bird 0 holds the clock; its slot draws the falcon (id −1).
  for (let id = 0; id < BIRDS; id++)
    for (const [x, y, z, w] of TEMPLATE) {
      data[o++] = id === 0 ? -1 : id;
      data[o++] = x;
      data[o++] = y;
      data[o++] = z;
      data[o++] = w;
    }
  for (let k = 0; k < FAR; k++)
    for (const [x, y, z, w] of TEMPLATE) {
      data[o++] = -2 - k;
      data[o++] = x;
      data[o++] = y;
      data[o++] = z;
      data[o++] = w;
    }
  return data;
}
