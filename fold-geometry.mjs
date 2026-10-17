// Connected pleated paper: every panel shares its boundary cross-section.
// a0=(station, across, band, kind); a1=(panel-local u,v,0,0).
// The same immutable mesh develops from shallow sheets to folded coils to
// three helical storm bands. No triangle ever leaves its parent sheet.
export const STRIDE = 8;
export const ATTRIBUTES = [4, 4];
export const PANELS = 18;
export const BANDS = 9;
export const ORBIT_PERIOD = 180;
export const SWIRL_PERIOD = 240;
export const CAMERA = { radius: 15.5, height: 9, aim: 4, focal: 2.25 };
const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function snapAmount(envelope) {
  return smooth(0.12, 0.38, envelope);
}
// CPU mirror of the shader; useful for seam, continuity and bounds checks.
export function paperPoint(
  station,
  across,
  band,
  development,
  phase = 0,
  snap = 0,
  seed = 527,
  streak = 1,
) {
  const hero = band < 3;
  const id = band % 3;
  const folded = smooth(0, 1, development);
  const storm = smooth(1, 2, development);
  const t = station / PANELS;
  const small = hero ? 1 : 0.22 + 0.035 * (band % 4);
  const turn = -TAU * phase + (id * TAU) / 3 + 0.05 * Math.sin(seed);
  const span = mix(0.35, mix(3.9, 4.1, storm), folded) * (1 - 0.42 * snap);
  const zig = station % 2 === 0 ? 1 : -1;
  const theta =
    turn +
    (t - 0.5) * span +
    0.07 * zig * (1 - Math.min(Math.abs(across), 1)) * folded;
  const pleat =
    (station % 2 === 0 ? 1 : -1) * mix(0.1, 0.19, folded) * (1 + 1.7 * snap);
  const radius = mix(3.1, 3.65 + 0.4 * id, storm) + pleat;
  const taper = 0.3 + 0.7 * Math.pow(Math.max(Math.sin(Math.PI * t), 0), 0.55);
  const width = small * mix(1.2, 1.35, storm) * (1 + 0.08 * streak) * taper;
  const beta = 0.3 + 0.22 * folded + 0.83 * snap;
  const av = Math.min(Math.abs(across), 0.92),
    hem = Math.max(Math.abs(across) - 0.92, 0);
  const radial = radius + av * width * Math.sin(beta) - hem * width * 1.8;
  const y =
    0.8 +
    t * mix(2.8, 5.9, storm) +
    id * mix(0.3, 0.55, storm) +
    Math.sign(across) * (av * width * Math.cos(beta) - hem * width * 1.4);
  const coil = [radial * Math.cos(theta), y, radial * Math.sin(theta)];
  const sheet = [
    (t - 0.5) * 7.6 +
      1.1 * (id - 1) +
      0.16 * zig * (1 - Math.min(Math.abs(across), 1)),
    0.8 +
      id * 0.52 +
      pleat +
      av * 0.48 -
      hem * 0.8 +
      0.3 * Math.sin(t * Math.PI + id),
    (id - 1) * 3.3 +
      Math.sign(across) * (av - hem) * width +
      0.6 * Math.sin(t * TAU + id),
  ];
  let p = sheet.map((v, k) => mix(v, coil[k], folded));
  if (!hero) {
    const a = turn + band * 2.399963;
    p = p.map((v) => v * small);
    p[0] += Math.cos(a) * (5.4 + 0.12 * band);
    p[1] += 1.4 + 0.43 * band;
    p[2] += Math.sin(a) * (5.4 + 0.12 * band);
  }
  return p;
}
export function cameraPose(development, phase = 0, crane = 0) {
  const a = TAU * phase;
  return {
    eye: [
      CAMERA.radius * Math.cos(a),
      CAMERA.height + crane * 2,
      CAMERA.radius * Math.sin(a),
    ],
    target: [0, mix(0.9, CAMERA.aim, smooth(0, 2, development)), 0],
    focal: mix(2.8, CAMERA.focal, smooth(0, 2, development)),
  };
}
export function createGeometry(seed = 527) {
  const data = [];
  const put = (s, v, band, kind, u, w) =>
    data.push(s, v, band, kind, u, w, 0.05 * Math.sin(seed), 0);
  for (let band = 0; band < BANDS; band++) {
    for (let panel = 0; panel < PANELS; panel++) {
      for (const [lo, hi] of [
        [-1.06, -0.92],
        [-0.92, 0],
        [0, 0.92],
        [0.92, 1.06],
      ]) {
        for (const kind of [1, 2]) {
          for (const [s, v, u, w] of [
            [panel, lo, 0, 0],
            [panel + 1, lo, 1, 0],
            [panel + 1, hi, 1, 1],
            [panel, lo, 0, 0],
            [panel + 1, hi, 1, 1],
            [panel, hi, 0, 1],
          ])
            put(s, v, band, kind, u, w);
        }
      }
    }
  }
  // A single ground quad; its material has analytical soft pools/reflections.
  for (const [x, z] of [
    [-25, -25],
    [25, -25],
    [25, 25],
    [-25, -25],
    [25, 25],
    [-25, 25],
  ])
    put(x, z, 0, 0, 0, 0);
  return new Float32Array(data);
}
