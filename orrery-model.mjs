// Exact reference model and seed-only mesh builder for Brass Orrery.
// All lengths use one module m = .05. External gears share a 20° pressure
// angle; the flank is the involute of its base circle, never a sine tooth.
export const MODULE = 0.05;
export const GEAR_BEVEL = 0.008;
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
// Mitered inward offset; capped at concave roots and acute involute tips.
// One shared point per corner keeps the bevel watertight around the profile.
export function bevelProfile(points, width) {
  const normals = points.map((a, k) => {
    const b = points[(k + 1) % points.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[1] - a[1]) / len, (a[0] - b[0]) / len];
  });
  return points.map((p, k) => {
    const a = normals[(k + points.length - 1) % points.length], b = normals[k];
    const len = Math.hypot(a[0] + b[0], a[1] + b[1]);
    const nx = (a[0] + b[0]) / Math.max(len, 1e-9), ny = (a[1] + b[1]) / Math.max(len, 1e-9);
    const d = Math.min(width * 2, width / Math.max(nx * b[0] + ny * b[1], 0.5));
    return [p[0] - nx * d, p[1] - ny * d];
  });
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
  const r = (1.3 + i * 0.49) * spread;
  return [r * Math.cos(a), r * Math.sin(a), 0.14 * spread];
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
// Exact CPU mirror of the visible planet centres, including reversible
// growth and rigid inclination. Shared by eclipse/falloff regression tests.
export function sunPosition(dev) {
  const { cathedral } = developmentPose(dev);
  return [0, 0, 1.35 * smooth(0.06, 0.85, dev) - 6.5 * cathedral];
}
export function planetPosition(i, phase, dev = 1, tilt = 0.8) {
  const growth = smooth(0.06, 0.85, dev), opening = smooth(0, 1, dev);
  const p = orbitPosition(i, phase, growth), s = sunPosition(dev);
  const angle = (0.4 + 0.85 * (i % 3) / 2) * tilt * opening;
  return [p[0], p[1] * Math.cos(angle) - p[2] * Math.sin(angle),
    s[2] + p[1] * Math.sin(angle) + p[2] * Math.cos(angle)];
}
export const sunIrradiance = (distance) => 5 / (0.7 + distance * distance);
export function sphereVisibility(point, light, center, radius) {
  const ray = light.map((v, k) => v - point[k]), distance = Math.hypot(...ray);
  const dir = ray.map((v) => v / Math.max(distance, 0.001));
  const delta = center.map((v, k) => v - point[k]);
  const t = delta.reduce((s, v, k) => s + v * dir[k], 0);
  if (t < 0.05 || t > distance - 0.1) return 1;
  const miss = Math.hypot(...delta.map((v, k) => v - t * dir[k]));
  return smooth(radius * 0.65, radius * 1.3, miss);
}
// CPU mirror of the shader's whole-train placement. Its one uniform scale
// preserves both pitch-centre distance and the no-slip velocity invariant.
export function trainPose(g, group, dev) {
  const { opening, cathedral: h } = developmentPose(dev);
  if (group === 0) {
    const scale = 1 - 0.12 * opening;
    return {
      center: [g.x * scale, g.y * scale, -6.5 * h],
      radius: pitchRadius(g.teeth) * scale,
      ratio: g.ratio,
      scale,
    };
  }
  const bay = group - 2,
    side = bay % 3,
    layer = Math.floor(bay / 3);
  const scale = (0.68 + 0.32 * h) * (side === 2 ? 0.86 : 1);
  const lean = group < 4 ? 0.3 + 0.82 * h : 0.72 + 0.4 * h;
  const turn = side === 0 ? lean : side === 1 ? -lean : 0;
  const width = group < 4 ? 4.6 + 1.2 * opening : 5.8;
  const x = g.x * scale, y = g.y * scale;
  const roof = side === 2 ? 0.86 + 0.3 * h : 0;
  return {
    center: [
      (side === 0 ? -width : side === 1 ? width : 0) + x * Math.cos(turn),
      (side === 2 ? 5.5 : 0) + y * Math.cos(roof),
      -2 - layer * 4.7 + x * Math.sin(turn) + y * Math.sin(roof) - 3 * opening * (1 - h) + (group < 4 ? 4 * (1 - opening) : 0),
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
      1.8 + 0.85 * Math.sin(phase) - 1.2 * h,
      -1.5 + 0.35 * Math.cos(phase) + 1.9 * h,
      4.6 + 4.6 * o - 8 * h + 1.5 * h * Math.sin(phase),
    ],
    target: [0.1 * Math.cos(phase), 0.1 - 0.3 * h, -0.6 - 7 * h],
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
    const latitude = segments >= 32 ? 24 : 12;
    for (let k = 0; k < latitude; k++)
      for (let j = 0; j < segments; j++) {
        const pts = [
          [j, k],
          [j + 1, k],
          [j + 1, k + 1],
          [j, k + 1],
        ].map(([u, v]) => p((u * TAU) / segments, (v * Math.PI) / latitude));
        const ns = pts.map((v) => v.map((x) => x / r));
        const ps = pts.map((v) => [v[0] + cx, v[1] + cy, v[2] + cz]);
        tri(ps[0], ps[1], ps[2], ns[0], ns[1], ns[2]);
        tri(ps[0], ps[2], ps[3], ns[0], ns[2], ns[3]);
      }
  };
  const gear = (teeth, detail) => {
    const r = pitchRadius(teeth),
      inner = r * 0.62,
      z = 0.26,
      bevel = GEAR_BEVEL;
    radius = r;
    const pts = toothProfile(teeth, detail);
    // A shared offset vertex at every profile corner. A segment-local inset
    // tears the tooth tips apart; a bevel wider than half a tip folds them.
    const front = bevelProfile(pts, bevel).map(([x, y]) => [x, y, z]);
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k],
        b = pts[(k + 1) % pts.length];
      const normal = [b[1] - a[1], a[0] - b[0], 0],
        l = Math.hypot(...normal);
      const n = normal.map((v) => v / Math.max(l, 1e-12));
      const aa = front[k], bb = front[(k + 1) % pts.length];
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
      // Close the inner rim and the rear on the close hero. These surfaces
      // become visible through spoke apertures under the grazing camera.
      if (detail > 1) {
        const rear = (p) => [p[0], p[1], -z];
        quad(rear(bi), rear(b), rear(a), rear(ai), [0, 0, -1]);
        const mid = Math.atan2(ai[1] + bi[1], ai[0] + bi[0]);
        quad(ai, bi, rear(bi), rear(ai), [-Math.cos(mid), -Math.sin(mid), 0]);
      }
      quad(aa, [a[0], a[1], z - 0.024], [b[0], b[1], z - 0.024], bb, [
        n[0] * 0.948683,
        n[1] * 0.948683,
        0.316228,
      ]);
      quad(
        [a[0], a[1], -0.26],
        [b[0], b[1], -0.26],
        [b[0], b[1], z - 0.024],
        [a[0], a[1], z - 0.024],
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
      if (detail > 1)
        quad(pp(r * 0.12, w, -z), pp(inner, w, -z), pp(inner, -w, -z), pp(r * 0.12, -w, -z), [0, 0, -1]);
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
    ring(r * 0.11, r * 0.25, 0.34, 0.66, detail > 1 ? 48 : 24);
    ring(r * 0.04, r * 0.1, 0.44, 0.9, 24);
    ring(r * 0.73, r * 0.755, 0.267, 0.025, detail > 1 ? 96 : 48);
    if (detail > 1)
      for (let j = 0; j < 6; j++) {
        const a = (j * TAU) / 6;
        sphere(0.026, r * 0.51 * Math.cos(a), r * 0.51 * Math.sin(a), 0.28, 6);
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
    center = [0, 0, 1.35];
    meta = [ORBITS[i], i * 1.73, 1, 1];
    radius = 1.3 + i * 0.49;
    material = 0.15;
    box(0.08, radius, -0.045, 0.045, -0.055, 0.055);
    ring(radius - 0.025, radius + 0.025, -0.07, 0.055, 192);
    material = 0.9;
    sphere(0.26 + i * 0.045, radius, 0, 0.14, 40);
    material = 0.55;
    ring(0.11, 0.15, 0.04, 0.11, 40);
  }
  serial++;
  center = [0, 0, 1.35];
  meta = [0, 0, 2, 1];
  material = 1;
  radius = 0.48;
  sphere(0.48, 0, 0, 0, 48);
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
  // Crossed armillary meridians: thick, rigid polished brass circles.
  for (let i = 0; i < 3; i++) {
    serial++;
    center = [0, 0, 1.35];
    meta = [0, i * 0.85, 5, 1];
    radius = 3.65 + i * 0.15;
    material = 0.5;
    ring(radius - 0.045, radius + 0.045, 0, 0.09, 224);
  }
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
    const bz = -2 - layer * 4.7;
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
    // No isolated stilts: each gear bank is carried by the enclosing nave.
    box(-2.35, 2.35, -0.1, 0.1, -0.3, -0.15);
  }
  // Barrel-vault ribs: substantial curved metal, not a 2D outline.
  // These static carriers join the receding clockwork banks into one nave.
  const tube = (points, thickness) => {
    for (let j = 0; j < points.length - 1; j++) {
      const a = points[j],
        b = points[j + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const l = Math.hypot(dx, dy, dz), xy = Math.hypot(dx, dy);
      const nx = xy > 1e-9 ? -dy / xy : 1, ny = xy > 1e-9 ? dx / xy : 0;
      // Orthonormal frame for a genuine round tube on arbitrary 3D trusses.
      const bx = -dz * ny / l, by = dz * nx / l, bz = (dx * ny - dy * nx) / l;
      for (let k = 0; k < 8; k++) {
        const u = (k * TAU) / 8,
          v = ((k + 1) * TAU) / 8;
        const pos = (p, t) => [
          p[0] + (nx * Math.cos(t) + bx * Math.sin(t)) * thickness,
          p[1] + (ny * Math.cos(t) + by * Math.sin(t)) * thickness,
          p[2] + bz * Math.sin(t) * thickness,
        ];
        const norm = (t) => [nx * Math.cos(t) + bx * Math.sin(t), ny * Math.cos(t) + by * Math.sin(t), bz * Math.sin(t)];
        tri(pos(a, u), pos(b, u), pos(b, v), norm(u), norm(u), norm(v));
        tri(pos(a, u), pos(b, v), pos(a, v), norm(u), norm(v), norm(v));
      }
    }
  };
  for (let bay = 0; bay < 8; bay++) {
    serial++;
    center = [0, 0, -2 - bay * 4.7];
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
      center = [0, 0, -2 - bay * 4.7];
      radius = 7;
      box(x - 0.12, x + 0.12, -5.5, -1.8, -0.15, 0.15);
      box(x - 0.3, x + 0.3, -5.5, -5.15, -0.35, 0.35);
      // Axles disappear through bearings into the next bay.
      serial++;
      center = [x, -2.5, -2 - bay * 4.7];
      radius = 0.1;
      ring(0.035, 0.085, 0, 5.8, 24);
    }
  }
  // Ribbed wall carriers, diagonal trusses and coffered vault panels make
  // enclosing architecture, not isolated watches on two thin legs.
  for (let bay = 0; bay < 8; bay++) {
    serial++;
    center = [0, 0, -2 - bay * 4.7];
    meta = [0, 0, 4, 50];
    material = 0.6;
    radius = 7;
    for (const side of [-1, 1]) {
      const x = side * 6.05;
      box(x - 0.22, x + 0.22, -5.5, 5.1, -0.22, 0.22);
      box(x - 0.12, x + 0.12, -3.7, -3.45, -4.7, 0);
      box(x - 0.12, x + 0.12, 3.9, 4.1, -4.7, 0);
      tube([[x, -4.7, 0], [x, 3.9, -4.7]], 0.075);
      tube([[x, 3.9, 0], [x, -4.7, -4.7]], 0.075);
    }
    for (const x of [-3, 0, 3]) {
      box(x - 0.07, x + 0.07, 5.5, 5.64, -4.7, 0);
      tube([[x - 1.5, 5.5, 0], [x + 1.5, 5.5, -4.7]], 0.06);
    }
  }
  // A monumental pendulum hangs in the central nave. Only this rigid body
  // rocks; no impulse ever changes a meshing gear's angular velocity.
  serial++;
  center = [0, 4.6, -2.3];
  meta = [0, 0, 3, 51];
  radius = 6;
  material = 0.45;
  box(-0.085, 0.085, -6.2, 0.1, -0.1, 0.1);
  sphere(0.22, 0, 0, 0, 24);
  sphere(0.95, 0, -5.8, 0, 40);
  // Hanging chain loops and deep transmission shafts give human-scale cues.
  for (const x of [-3.8, 3.8]) {
    center = [x, 4.8, -0.8];
    meta = [0, 0, 4, 50];
    material = 0.65;
    for (let j = 0; j < 26; j++) {
      serial++;
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const a = k * TAU / 16;
        pts.push([0.085 * Math.cos(a), -j * 0.29 + 0.17 * Math.sin(a), 0]);
      }
      tube(pts, 0.023);
    }
  }
  if (cursor > data.length)
    throw new Error("Orrery mesh exceeds its fixed vertex budget");
  return data.subarray(0, cursor);
}
