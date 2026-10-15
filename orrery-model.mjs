// Exact reference model and seed-only mesh builder for Brass Orrery.
// All lengths use one module m = .05. External gears share a 20° pressure
// angle; the flank is the involute of its base circle, never a sine tooth.
export const MODULE = 0.05;
export const PRESSURE = Math.PI / 9;
export const TAU = 2 * Math.PI;
export const ATTRIBUTES = [3, 3, 3, 4, 4];
export const STRIDE = 17;
export const ORBITS = [1, 2, 3, 4, 6];
export const pitchRadius = (teeth) => (MODULE * teeth) / 2;
export const involute = (t, rb = 1) => [
  rb * (Math.cos(t) + t * Math.sin(t)),
  rb * (Math.sin(t) - t * Math.cos(t)),
];
export const involuteAngle = (r, rb) => {
  const t = Math.sqrt(Math.max(0, (r / rb) ** 2 - 1));
  return t - Math.atan(t);
};
export function toothProfile(teeth, steps = 3) {
  const r = pitchRadius(teeth),
    rb = r * Math.cos(PRESSURE);
  const root = r - 1.25 * MODULE,
    tip = r + MODULE;
  const start = Math.max(root, rb);
  const half = Math.PI / (2 * teeth),
    inv = Math.tan(PRESSURE) - PRESSURE;
  const flank = (rad) => half + inv - involuteAngle(rad, rb);
  const pts = [];
  const polar = (rad, a) => pts.push([rad * Math.cos(a), rad * Math.sin(a)]);
  for (let tooth = 0; tooth < teeth; tooth++) {
    const a = (tooth * TAU) / teeth;
    polar(root, a - Math.PI / teeth);
    if (rb > root) polar(root, a - flank(start));
    for (let j = 0; j <= steps; j++) {
      const rad = start + ((tip - start) * j) / steps;
      polar(rad, a - flank(rad));
    }
    for (let j = steps; j >= 0; j--) {
      const rad = start + ((tip - start) * j) / steps;
      polar(rad, a + flank(rad));
    }
    if (rb > root) polar(root, a + flank(start));
  }
  return pts;
}
// A tree, not an overconstrained closed loop. A child is exactly one sum of
// pitch radii from its parent, and Np*thetaP + Nc*thetaC is invariant.
export function makeTrain(seed = 10901) {
  const phase = ((seed % 97) / 97) * 0.12;
  const g = [{ id: 0, teeth: 56, x: 0, y: 0, ratio: 1, phase, parent: -1 }];
  for (let arm = 0; arm < 4; arm++) {
    const angle = (arm * Math.PI) / 2 + Math.PI / 4;
    let parent = 0;
    for (let depth = 0; depth < 2; depth++) {
      const p = g[parent],
        teeth = depth === 0 ? 24 : 40;
      const r = pitchRadius(p.teeth) + pitchRadius(teeth);
      // The half-tooth phase makes a tooth meet a gap on the pitch line.
      const phi =
        ((p.teeth + teeth) * angle) / teeth +
        Math.PI -
        Math.PI / teeth -
        (p.phase * p.teeth) / teeth;
      g.push({
        id: g.length,
        teeth,
        x: p.x + r * Math.cos(angle),
        y: p.y + r * Math.sin(angle),
        ratio: (-p.ratio * p.teeth) / teeth,
        phase: phi,
        parent,
      });
      parent = g.length - 1;
    }
  }
  return g;
}
export function meshResidual(a, b, drive = 1) {
  return (
    a.ratio * drive * pitchRadius(a.teeth) +
    b.ratio * drive * pitchRadius(b.teeth)
  );
}
export function gearPose(g, drive) {
  return { x: g.x, y: g.y, angle: g.phase + drive * g.ratio };
}
export function orbitPosition(i, phase, spread = 1) {
  const a = phase * ORBITS[i] + i * 1.73;
  const r = (0.9 + i * 0.5) * spread;
  return [r * Math.cos(a), r * Math.sin(a), 0.8 + i * 0.17];
}
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function developmentPose(development) {
  return {
    opening: smooth(0, 1, development),
    cathedral: smooth(1, 2, development),
  };
}
// CPU mirror of the shader's whole-train placement. Its one uniform scale
// preserves both pitch-centre distance and the no-slip velocity invariant.
export function trainPose(g, group, dev) {
  const { opening, cathedral: h } = developmentPose(dev);
  if (group === 0) {
    const scale = 1 - 0.16 * opening;
    return {
      center: [g.x * scale, g.y * scale, -4 * h],
      radius: pitchRadius(g.teeth) * scale,
      ratio: g.ratio,
      scale,
    };
  }
  const bay = group - 2,
    side = bay % 3,
    layer = Math.floor(bay / 3);
  const anchor = side === 0 ? [-8.5, 0] : side === 1 ? [8.5, 0] : [0, 9];
  const scale =
    (0.02 + 0.98 * smooth(1, 1.95, dev)) * 0.76 * (side === 2 ? 0.65 : 1);
  const turn = side === 0 ? 0.5 : side === 1 ? -0.5 : 0;
  const x = g.x * scale,
    y = g.y * scale;
  return {
    center: [
      anchor[0] * 0.76 + x * Math.cos(turn) + anchor[0] * (1 - h) * 1.3,
      anchor[1] * 0.76 +
        y +
        (side === 2 ? -3 * h : 0) +
        anchor[1] * (1 - h) * 1.3,
      -4 - layer * 5.8 + x * Math.sin(turn) - 14 * (1 - h),
    ],
    radius: pitchRadius(g.teeth) * scale,
    ratio: g.ratio,
    scale,
  };
}
export function camera(dev, phase) {
  const { opening: o, cathedral: h } = developmentPose(dev);
  return {
    eye: [
      2.1 + 1.15 * Math.sin(phase),
      -2.4 + 0.5 * Math.cos(phase) + 2.6 * h,
      6.9 + 2 * o - 3.3 * h + 1.7 * h * Math.sin(phase),
    ],
    target: [0.12 * Math.cos(phase), 0.1 - 0.9 * h, -0.5 - 4.5 * h],
  };
}
// Position, normal, rotation centre, (ratio,phase,kind,group),
// (local radius,object radius,stable identity,material).
// group 0: watch, 1: orrery, 2+: cathedral bay. Mesh creation knows no dev.
export function createGeometry(seed) {
  // Fixed topology: a bounded typed allocation avoids a >500 MB temporary
  // JS number array while authoring/loading the cathedral mesh.
  const data = new Float32Array(32 * 1024 * 1024);
  let cursor = 0;
  const train = makeTrain(seed);
  let serial = 0;
  let meta = [0, 0, 0, 0],
    center = [0, 0, 0],
    radius = 1,
    material = 0;
  const emit = (p, n) => {
    data[cursor++] = p[0];
    data[cursor++] = p[1];
    data[cursor++] = p[2];
    data[cursor++] = n[0];
    data[cursor++] = n[1];
    data[cursor++] = n[2];
    data[cursor++] = center[0];
    data[cursor++] = center[1];
    data[cursor++] = center[2];
    data[cursor++] = meta[0];
    data[cursor++] = meta[1];
    data[cursor++] = meta[2];
    data[cursor++] = meta[3];
    data[cursor++] = Math.hypot(p[0], p[1]);
    data[cursor++] = radius;
    data[cursor++] = serial;
    data[cursor++] = material;
  };
  const tri = (a, b, c, na, nb = na, nc = na) => {
    emit(a, na);
    emit(b, nb);
    emit(c, nc);
  };
  const quad = (a, b, c, d, n) => {
    tri(a, b, c, n);
    tri(a, c, d, n);
  };
  const ring = (r1, r2, z, depth = 0.08, count = 80) => {
    for (let j = 0; j < count; j++) {
      const a = (j * TAU) / count,
        b = ((j + 1) * TAU) / count;
      const p = (r, t, h) => [r * Math.cos(t), r * Math.sin(t), h];
      quad(p(r1, a, z), p(r2, a, z), p(r2, b, z), p(r1, b, z), [0, 0, 1]);
      const n = [Math.cos((a + b) / 2), Math.sin((a + b) / 2), 0];
      quad(
        p(r2, a, z - depth),
        p(r2, b, z - depth),
        p(r2, b, z),
        p(r2, a, z),
        n,
      );
      quad(
        p(r1, b, z - depth),
        p(r1, a, z - depth),
        p(r1, a, z),
        p(r1, b, z),
        n.map((v) => -v),
      );
    }
  };
  const box = (x0, x1, y0, y1, z0, z1) => {
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]);
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]);
    quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
  };
  const sphere = (r, cx = 0, cy = 0, cz = 0, segments = 24) => {
    const p = (a, b) => [
      r * Math.sin(b) * Math.cos(a),
      r * Math.sin(b) * Math.sin(a),
      r * Math.cos(b),
    ];
    for (let k = 0; k < 12; k++)
      for (let j = 0; j < segments; j++) {
        const pts = [
          [j, k],
          [j + 1, k],
          [j + 1, k + 1],
          [j, k + 1],
        ].map(([u, v]) => p((u * TAU) / segments, (v * Math.PI) / 12));
        const ns = pts.map((v) => v.map((x) => x / r));
        const ps = pts.map((v) => [v[0] + cx, v[1] + cy, v[2] + cz]);
        tri(ps[0], ps[1], ps[2], ns[0], ns[1], ns[2]);
        tri(ps[0], ps[2], ps[3], ns[0], ns[2], ns[3]);
      }
  };
  const gear = (teeth, detail) => {
    const r = pitchRadius(teeth),
      inner = r * 0.65,
      z = 0.18,
      bevel = 0.028;
    radius = r;
    const pts = toothProfile(teeth, detail);
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k],
        b = pts[(k + 1) % pts.length];
      const normal = [b[1] - a[1], a[0] - b[0], 0],
        l = Math.hypot(...normal);
      const n = normal.map((v) => v / Math.max(l, 1e-12));
      const inset = (p) => [p[0] - n[0] * bevel, p[1] - n[1] * bevel, z];
      const aa = inset(a),
        bb = inset(b);
      const ai = [
        (inner * a[0]) / Math.hypot(...a),
        (inner * a[1]) / Math.hypot(...a),
        z,
      ];
      const bi = [
        (inner * b[0]) / Math.hypot(...b),
        (inner * b[1]) / Math.hypot(...b),
        z,
      ];
      quad(ai, aa, bb, bi, [0, 0, 1]);
      quad(aa, [a[0], a[1], z - bevel], [b[0], b[1], z - bevel], bb, [
        n[0] * 0.707,
        n[1] * 0.707,
        0.707,
      ]);
      quad(
        [a[0], a[1], -0.13],
        [b[0], b[1], -0.13],
        [b[0], b[1], z - bevel],
        [a[0], a[1], z - bevel],
        n,
      );
    }
    // Real negative space between six spokes, concentric bearing and axle.
    for (let j = 0; j < 6; j++) {
      const a = (j * TAU) / 6,
        c = Math.cos(a),
        s = Math.sin(a),
        w = r * 0.07;
      const pp = (x, y, z) => [x * c - y * s, x * s + y * c, z];
      quad(
        pp(r * 0.12, -w, z),
        pp(inner, -w, z),
        pp(inner, w, z),
        pp(r * 0.12, w, z),
        [0, 0, 1],
      );
      quad(
        pp(r * 0.12, w, -z),
        pp(inner, w, -z),
        pp(inner, w, z),
        pp(r * 0.12, w, z),
        [-s, c, 0],
      );
      quad(
        pp(r * 0.12, -w, z),
        pp(inner, -w, z),
        pp(inner, -w, -z),
        pp(r * 0.12, -w, -z),
        [s, -c, 0],
      );
    }
    ring(r * 0.11, r * 0.25, 0.24, 0.4, detail > 1 ? 48 : 24);
    ring(r * 0.04, r * 0.1, 0.31, 0.5, 24);
    ring(r * 0.73, r * 0.755, 0.187, 0.025, detail > 1 ? 96 : 48);
    if (detail > 1)
      for (let j = 0; j < 6; j++) {
        const a = (j * TAU) / 6;
        sphere(0.026, r * 0.51 * Math.cos(a), r * 0.51 * Math.sin(a), 0.195, 6);
      }
  };
  // Central gear train. The same nine gears remain throughout the arc.
  for (const g of train) {
    serial++;
    center = [g.x, g.y, 0];
    meta = [g.ratio, g.phase, 0, 0];
    material = g.id % 3 === 0 ? 0.3 : 0;
    gear(g.teeth, 3);
  }
  // Mechanical chapter ring and sixty minute studs, behind the open gears.
  serial++;
  center = [0, 0, -0.3];
  meta = [0, 0, 0, 0];
  material = 0.55;
  radius = 4.5;
  ring(4.03, 4.18, 0, 0.3, 160);
  ring(4.32, 4.37, 0.03, 0.16, 160);
  for (let j = 0; j < 60; j++) {
    const a = (j * TAU) / 60;
    sphere(
      j % 5 === 0 ? 0.045 : 0.022,
      4.24 * Math.cos(a),
      4.24 * Math.sin(a),
      0.03,
      8,
    );
  }
  // Orrery: independent gear-ratio shafts with rigid arms and spheres.
  for (let i = 0; i < 5; i++) {
    serial++;
    center = [0, 0, 0.7 + i * 0.18];
    meta = [ORBITS[i], i * 1.73, 1, 1];
    radius = 0.9 + i * 0.5;
    material = 0.15;
    box(0.06, radius, -0.026, 0.026, -0.04, 0.04);
    ring(radius - 0.012, radius + 0.012, -0.07, 0.024, 160);
    material = i % 2 === 0 ? 0.9 : 0.2;
    sphere(0.21 + i * 0.035, radius, 0, 0.14, 32);
    material = 0.55;
    ring(0.11, 0.15, 0.04, 0.11, 40);
  }
  serial++;
  center = [0, 0, 1.8];
  meta = [0, 0, 2, 1];
  material = 1;
  radius = 0.42;
  sphere(0.42, 0, 0, 0, 40);
  // Escapement anchor rocks on the kick, but never changes gear ratios.
  serial++;
  center = [0, 0.8, 0.45];
  meta = [0, 0, 3, 0];
  material = 0.25;
  radius = 0.8;
  sphere(0.075, 0, 0, 0, 16);
  box(-0.045, 0.045, 0, 0.8, -0.04, 0.04);
  box(-0.66, 0.66, 0.7, 0.78, -0.04, 0.04);
  for (const x of [-0.65, 0.65])
    box(x - 0.035, x + 0.035, 0.42, 0.78, -0.04, 0.04);
  // A sharp, dim floor reflection of the hero only (not the entire hall).
  // Its actual depth-tested triangles are mirrored by the vertex stage.
  const heroEnd = cursor;
  for (let i = 0; i < heroEnd; i += STRIDE) {
    for (let j = 0; j < STRIDE; j++) data[cursor + j] = data[i + j];
    data[cursor + 12] = -10 - data[i + 12];
    cursor += STRIDE;
  }
  // 24 persistent nine-gear bays = 216 cathedral gears. Each is a complete
  // meshing train with the very same invariant, repeated in depth.
  for (let bay = 0; bay < 24; bay++) {
    const side = bay % 3,
      layer = Math.floor(bay / 3);
    const bx = side === 0 ? -8.5 : side === 1 ? 8.5 : 0;
    const by = side === 2 ? 9 : 0;
    const bz = -4 - layer * 5.8;
    for (const g of train) {
      serial++;
      center = [bx + g.x, by + g.y, bz];
      meta = [g.ratio, g.phase, 0, bay + 2];
      material = (g.id + bay) % 4 === 0 ? 0.45 : 0;
      gear(g.teeth, 1);
    }
    // Bearing rails, a cathedral rib framing each bank.
    serial++;
    center = [bx, by, bz - 0.25];
    meta = [0, 0, 0, bay + 2];
    material = 0.5;
    radius = 4.5;
    ring(4.18, 4.3, 0, 0.24, 96);
    box(-4.5, -4.41, -4.7, 4.7, -0.2, 0.02);
    box(4.41, 4.5, -4.7, 4.7, -0.2, 0.02);
  }
  // Pointed barrel-vault ribs: substantial curved metal, not a 2D outline.
  // These static carriers join the receding clockwork banks into one nave.
  const tube = (points, thickness) => {
    for (let j = 0; j < points.length - 1; j++) {
      const a = points[j],
        b = points[j + 1];
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        l = Math.hypot(dx, dy);
      const nx = -dy / l,
        ny = dx / l;
      for (let k = 0; k < 8; k++) {
        const u = (k * TAU) / 8,
          v = ((k + 1) * TAU) / 8;
        const pos = (p, t) => [
          p[0] + nx * Math.cos(t) * thickness,
          p[1] + ny * Math.cos(t) * thickness,
          p[2] + Math.sin(t) * thickness,
        ];
        const norm = (t) => [nx * Math.cos(t), ny * Math.cos(t), Math.sin(t)];
        tri(pos(a, u), pos(b, u), pos(b, v), norm(u), norm(u), norm(v));
        tri(pos(a, u), pos(b, v), pos(a, v), norm(u), norm(v), norm(v));
      }
    }
  };
  for (let bay = 0; bay < 8; bay++) {
    serial++;
    center = [0, 0, -3 - bay * 5.8];
    meta = [0, 0, 4, 50];
    material = 0.35;
    radius = 7;
    const points = [];
    for (let j = 0; j <= 64; j++) {
      const t = j / 64,
        theta = Math.PI * t;
      points.push([
        -6.2 * Math.cos(theta),
        -1.8 + 7.4 * Math.sin(theta) ** 0.8,
        0,
      ]);
    }
    tube(points, 0.115);
    tube(
      points.map((p) => [p[0] * 1.035, p[1] + 0.28, p[2] - 0.15]),
      0.04,
    );
    for (const x of [-6.2, 6.2]) {
      center = [0, 0, -3 - bay * 5.8];
      radius = 7;
      box(x - 0.12, x + 0.12, -5.5, -1.8, -0.15, 0.15);
      box(x - 0.3, x + 0.3, -5.5, -5.15, -0.35, 0.35);
      // Axles disappear through bearings into the next bay.
      serial++;
      center = [x, -2.5, -3 - bay * 5.8];
      radius = 0.1;
      ring(0.035, 0.085, 0, 5.8, 24);
    }
  }
  if (cursor > data.length)
    throw new Error("Orrery mesh exceeds its fixed vertex budget");
  return data.subarray(0, cursor);
}
