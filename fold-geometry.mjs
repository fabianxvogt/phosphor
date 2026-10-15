// Fold geometry. Five Platonic solids are unfolded once into flat nets
// (spanning trees of their faces). Every non-root face folds about the edge it
// shares with its parent; composing those hinge rotations from the face to
// the root closes the solid exactly. The hinge tables are seed-independent
// and become GLSL constants; a seed only places, sizes and orbits instances.
//
// Vertex layout (28 floats): a0 = (flat.xyz, face), a1 = (edge, kind, birth,
// lift), a2 = (x, z, scale, spin0), a3 = (axisTheta, axisPhi, turns, threshold),
// a4 = (orbitRadius, orbitAngle, orbitHeight, orbitTurns), a5 = (order, rnd,
// bob, shardAngle), a6 = (triangle centre x, z, bary a, bary b); each fan
// triangle becomes its own shard. Floor vertices use a0.xyz as position and kind 0.
export const STRIDE = 28;
export const ATTRIBUTES = [4, 4, 4, 4, 4, 4, 4];
export const KIND = { floor: 0, face: 1 };
export const MAX_DEPTH = 8;
export const FIELD = 9.6; // every folded solid and shard stays inside this radius
export const CAMERA = { radius: 12.6, sway: 0.6 }; // orbit never comes closer than 12
export const FLOOR = { radius: 26, rings: 32, segments: 96 }; // analytic normals carry the fine paper relief
const TAU = Math.PI * 2;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));

// Rodrigues rotation of point p about the line (a, unit u) by angle t.
export function rotateAbout(p, a, u, t) {
  const v = sub(p, a),
    c = Math.cos(t),
    s = Math.sin(t);
  return add(a, add(add(mul(v, c), mul(cross(u, v), s)), mul(u, dot(u, v) * (1 - c))));
}
const rotateDir = (v, u, t) => rotateAbout(v, [0, 0, 0], u, t);

function solids() {
  const p = (1 + Math.sqrt(5)) / 2;
  const tetra = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  const cube = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) cube.push([x, y, z]);
  const octa = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const icosa = [];
  for (const a of [-1, 1])
    for (const b of [-p, p]) icosa.push([0, a, b], [a, b, 0], [b, 0, a]);
  const dodeca = [...cube];
  for (const a of [-1 / p, 1 / p])
    for (const b of [-p, p]) dodeca.push([0, a, b], [a, b, 0], [b, 0, a]);
  return [tetra, cube, octa, dodeca, icosa].map(hull);
}

// Faces of a convex point set: maximal coplanar subsets on the hull, ordered
// counter-clockwise around their outward normal; scaled to unit edge length.
function hull(points) {
  const faces = [],
    seen = new Set(),
    n = points.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        let normal = cross(sub(points[j], points[i]), sub(points[k], points[i]));
        if (Math.hypot(...normal) < 1e-9) continue;
        normal = norm(normal);
        const d = dot(normal, points[i]);
        const side = points.map((q) => dot(normal, q) - d);
        if (side.some((s) => s > 1e-7)) {
          if (side.some((s) => s < -1e-7)) continue;
          normal = mul(normal, -1);
        }
        const on = points.map((_, m) => m).filter((m) => Math.abs(side[m]) < 1e-7);
        const key = on.join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        const c = mul(on.reduce((s, m) => add(s, points[m]), [0, 0, 0]), 1 / on.length);
        const e1 = norm(sub(points[on[0]], c)),
          e2 = cross(normal, e1);
        on.sort((a, b) => {
          const va = sub(points[a], c),
            vb = sub(points[b], c);
          return Math.atan2(dot(va, e2), dot(va, e1)) - Math.atan2(dot(vb, e2), dot(vb, e1));
        });
        faces.push(on);
      }
  const f0 = faces[0],
    edge = Math.hypot(...sub(points[f0[0]], points[f0[1]]));
  return { vertices: points.map((q) => mul(q, 1 / edge)), faces };
}

const centroid = (pts) => mul(pts.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / pts.length);
function normalOf(solid, f) {
  const v = solid.faces[f].map((i) => solid.vertices[i]);
  return norm(cross(sub(v[1], v[0]), sub(v[2], v[0])));
}

// Unfold one solid from a root face with a breadth-first spanning tree.
function unfold(solid, root, order) {
  const F = solid.faces.length;
  const edgeKey = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  const byEdge = new Map();
  solid.faces.forEach((face, f) =>
    face.forEach((v, i) => {
      const k = edgeKey(v, face[(i + 1) % face.length]);
      byEdge.set(k, [...(byEdge.get(k) ?? []), f]);
    }),
  );
  // Rigid maps from solid coordinates to flat coordinates, as (R, t).
  const apply = (M, v) => add([dot(M.R[0], v), dot(M.R[1], v), dot(M.R[2], v)], M.t);
  const applyDir = (M, v) => [dot(M.R[0], v), dot(M.R[1], v), dot(M.R[2], v)];
  const nr = normalOf(solid, root),
    target = [0, -1, 0];
  let axis = cross(nr, target),
    angle = Math.acos(Math.max(-1, Math.min(1, dot(nr, target))));
  if (Math.hypot(...axis) < 1e-9) axis = [1, 0, 0];
  axis = norm(axis);
  const R = [0, 1, 2].map((r) => rotateDir([r === 0 ? 1 : 0, r === 1 ? 1 : 0, r === 2 ? 1 : 0], axis, angle));
  // R rows from rotated basis columns.
  const rows = [0, 1, 2].map((r) => [R[0][r], R[1][r], R[2][r]]);
  const c0 = centroid(solid.faces[root].map((i) => solid.vertices[i]));
  const M0 = { R: rows, t: mul([dot(rows[0], c0), dot(rows[1], c0), dot(rows[2], c0)], -1) };
  const maps = new Array(F),
    parent = new Array(F).fill(-1),
    depth = new Array(F).fill(0),
    hinge = new Array(F).fill(null);
  maps[root] = M0;
  const queue = [root],
    done = new Set([root]);
  while (queue.length) {
    const p = order === "dfs" ? queue.pop() : queue.shift();
    const face = solid.faces[p];
    const edges = face.map((v, i) => [v, face[(i + 1) % face.length]]);
    for (const [a, b] of edges) {
      const c = byEdge.get(edgeKey(a, b)).find((f) => f !== p);
      if (done.has(c)) continue;
      done.add(c);
      parent[c] = p;
      depth[c] = depth[p] + 1;
      const A = solid.vertices[a],
        u = norm(sub(solid.vertices[b], A)),
        nc = normalOf(solid, c),
        np = normalOf(solid, p),
        delta = Math.atan2(dot(u, cross(nc, np)), dot(nc, np));
      // Flat map of c: rotate about the shared edge into p's plane, then M_p.
      const Mp = maps[p];
      const rotRows = [0, 1, 2].map((r) => {
        const e = [r === 0 ? 1 : 0, r === 1 ? 1 : 0, r === 2 ? 1 : 0];
        return rotateDir(e, u, delta);
      });
      const Rr = [0, 1, 2].map((r) => [rotRows[0][r], rotRows[1][r], rotRows[2][r]]);
      const R2 = Mp.R.map((row) => [0, 1, 2].map((col) => dot(row, [Rr[0][col], Rr[1][col], Rr[2][col]])));
      // t: M_p(Rot(v)) with Rot(v) = Rr (v - A) + A.
      const t2 = add(apply(Mp, A), mul([dot(R2[0], A), dot(R2[1], A), dot(R2[2], A)], -1));
      maps[c] = { R: R2, t: t2 };
      hinge[c] = { a: apply(Mp, A), u: norm(applyDir(Mp, u)), phi: -delta };
      queue.push(c);
    }
  }
  const flat = solid.faces.map((face, f) => face.map((i) => apply(maps[f], solid.vertices[i])));
  const folded = solid.vertices.map((v) => apply(M0, v));
  return { root, parent, depth, hinge, flat, folded, faces: solid.faces };
}

// Strict overlap of two convex polygons in the y = 0 plane (separating axis).
function overlap(a, b) {
  for (const poly of [a, b])
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i],
        q = poly[(i + 1) % poly.length],
        nx = -(q[2] - p[2]),
        nz = q[0] - p[0];
      const pa = a.map((v) => v[0] * nx + v[2] * nz),
        pb = b.map((v) => v[0] * nx + v[2] * nz);
      if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6)
        return false;
    }
  return true;
}
export const netOverlaps = (net) =>
  net.flat.some((a, i) => net.flat.some((b, j) => j > i && overlap(a, b)));

// Shallowest non-overlapping net over all roots and both traversal orders.
function bestNet(solid) {
  let best = null;
  for (const order of ["bfs", "dfs"])
    for (let root = 0; root < solid.faces.length; root++) {
      const net = unfold(solid, root, order);
      if (netOverlaps(net)) continue;
      const deep = Math.max(...net.depth);
      if (!best || deep < Math.max(...best.depth)) best = net;
    }
  return best;
}

// Templates: nets centred on their bounding-circle centre, plus global face
// indices for the shader tables.
export const TEMPLATES = (() => {
  let offset = 0;
  return solids().map((solid, t) => {
    const net = bestNet(solid);
    const all = net.flat.flat();
    const cx = (Math.min(...all.map((v) => v[0])) + Math.max(...all.map((v) => v[0]))) / 2,
      cz = (Math.min(...all.map((v) => v[2])) + Math.max(...all.map((v) => v[2]))) / 2,
      shift = [-cx, 0, -cz];
    const flat = net.flat.map((face) => face.map((v) => add(v, shift)));
    const hinge = net.hinge.map((h) => h && { ...h, a: add(h.a, shift) });
    const folded = net.folded.map((v) => add(v, shift));
    const radius = Math.max(...flat.flat().map((v) => Math.hypot(v[0], v[2])));
    const solidCentre = centroid(folded);
    const solidRadius = Math.max(...folded.map((v) => Math.hypot(...sub(v, solidCentre))));
    const template = {
      id: t,
      offset,
      faces: net.faces,
      parent: net.parent,
      depth: net.depth,
      hinge,
      flat,
      folded,
      radius,
      solidCentre,
      solidRadius,
      maxDepth: Math.max(...net.depth),
    };
    offset += net.faces.length;
    return template;
  });
})();
export const FACE_COUNT = TEMPLATES.reduce((s, t) => s + t.faces.length, 0);

// CPU mirror of the shader chain: fold a flat point of global face g by the
// per-face progress s(face) (0 flat, 1 closed).
export function foldPoint(template, f, point, progress = () => 1) {
  let p = point;
  for (let g = f, i = 0; i < MAX_DEPTH && template.parent[g] >= 0; i++, g = template.parent[g]) {
    const h = template.hinge[g];
    p = rotateAbout(p, h.a, h.u, h.phi * progress(g));
  }
  return p;
}

// Shader mirror: per-face fold progress for an instance born at `birth`.
export function foldProgress(development, birth, depth, rhythm = 0) {
  const s0 = 0.05 + 0.4 * birth + 0.05 * depth;
  const t = Math.min(1, Math.max(0, (development - s0) / 0.25));
  return Math.max(0, Math.min(1, 0.035 + 0.965 * t * t * (3 - 2 * t) - 0.035 * rhythm));
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const liftProgress = (development, birth) =>
  smooth(0.45 + 0.3 * birth, 0.75 + 0.25 * birth, development);
export const shardProgress = (development, order) =>
  smooth(1.04 + 0.5 * order, 1.42 + 0.5 * order, development);

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Seeded arrangement: a few large solids and many small ones packed by their
// (rotation-invariant) net circles inside the field.
export function arrangement(seed) {
  const rand = random(seed >>> 0 || 1);
  const items = [];
  const tryPlace = (count, scaleRange, types, tries = 4000) => {
    for (let n = 0, attempt = 0; n < count && attempt < tries; attempt++) {
      const t = types[Math.floor(rand() * types.length)],
        template = TEMPLATES[t],
        scale = scaleRange[0] + (scaleRange[1] - scaleRange[0]) * rand(),
        r = template.radius * scale,
        limit = FIELD - Math.max(r, template.solidRadius * scale * 2.2) - 0.2;
      if (limit <= 0.5) continue;
      const rr = Math.sqrt(rand()) * limit,
        a = rand() * TAU,
        x = Math.cos(a) * rr,
        z = Math.sin(a) * rr;
      if (items.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 0.08)) continue;
      items.push({ t, x, z, r, scale, small: scale < 0.45 });
      n++;
    }
  };
  tryPlace(7, [1.0, 1.45], [3, 4]);
  tryPlace(18, [0.5, 0.85], [0, 1, 2, 3, 4]);
  tryPlace(160, [0.16, 0.36], [0, 1, 2, 2, 0], 20000);
  return items.map((it, i) => {
    const template = TEMPLATES[it.t],
      lift = 0.6 + rand() * (it.small ? 3.4 : 2.6),
      birth = Math.min(1, Math.hypot(it.x, it.z) / FIELD * 0.55 + rand() * 0.45);
    return {
      ...it,
      id: i,
      birth,
      lift,
      spin0: rand() * TAU,
      axisTheta: Math.acos(2 * rand() - 1),
      axisPhi: rand() * TAU,
      turns: (rand() < 0.5 ? -1 : 1) * (1 + Math.floor(rand() * 3)),
      threshold: it.small ? 0.05 + 0.9 * rand() : -1,
      shards: template.faces.map((face) => face.map(() => {
        // Keplerian-like vortex: inner shards turn faster (integer turns per
        // swirl cycle, so the integrated phase wraps without a jump).
        // A funnel: shards widen with height around the light core.
        const height = 0.6 + 6.4 * Math.pow(rand(), 1.15),
          radius = Math.max(1.2, 1.3 + 0.75 * height + (rand() - 0.5) * 1.6),
          omega = 0.6 * Math.pow(radius / 2, -1.1);
        return {
          radius,
          angle: rand() * TAU,
          height,
          turns: Math.max(1, Math.round((omega * SWIRL_PERIOD) / TAU)),
          order: rand(),
          rnd: rand(),
          bob: rand() * TAU,
          shardAngle: rand() * TAU,
        };
      })),
    };
  });
}
// Seconds per swirl cycle at swirl 1 and energy base: the vortex phase period.
export const SWIRL_PERIOD = 240;
export const ORBIT_PERIOD = 150;

// CPU mirrors of the analytic paper normal and rigid banked shard frame.
export function paperNormal(x, z, amplitude, phase) {
  const w=TAU*phase,a=.55*x+2*w,b=.47*z-3*w,c=.31*(x+z)+5*w;
  const shared=.155*Math.cos(c);
  return norm([-amplitude*(.55*Math.cos(a)*Math.sin(b)+shared),1,
    -amplitude*(.47*Math.sin(a)*Math.cos(b)+shared)]);
}
export function shardFrame(shard, phase) {
  const a=shard.angle+TAU*shard.turns*phase,bank=.38*Math.cos(shard.shardAngle);
  const tangent=[-Math.sin(a),0,Math.cos(a)];
  const across=norm([bank*Math.cos(a),1,bank*Math.sin(a)]);
  return {tangent,across,normal:cross(tangent,across)};
}

// Shader mirror: shard centre on its vortex orbit at swirl phase `phase`.
export function shardOrbit(shard, phase) {
  const a = shard.angle + TAU * shard.turns * phase;
  return [
    shard.radius * Math.cos(a),
    shard.height + 0.35 * Math.sin(TAU * 3 * phase + shard.bob),
    shard.radius * Math.sin(a),
  ];
}

export function createGeometry(seed) {
  const items = arrangement(seed);
  let triangles = 0;
  for (const it of items)
    for (const face of TEMPLATES[it.t].faces) triangles += face.length;
  const floorTriangles = FLOOR.rings * FLOOR.segments * 2;
  const data = new Float32Array((triangles + floorTriangles) * 3 * STRIDE);
  let o = 0;
  const put = (values) => {
    data.set(values, o);
    o += STRIDE;
  };
  for (const it of items) {
    const template = TEMPLATES[it.t];
    template.faces.forEach((face, f) => {
      const pts = template.flat[f],
        c = centroid(pts),
        g = template.offset + f;
      // Fan from the face centroid: edge = 1 at the centroid, 0 on the rim.
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i],
          b = pts[(i + 1) % pts.length],
          s = it.shards[f][i],
          tc = centroid([c, a, b]);
        const tail = [
          it.birth, it.lift,
          it.x, it.z, it.scale, it.spin0,
          it.axisTheta, it.axisPhi, it.turns, it.threshold,
          s.radius, s.angle, s.height, s.turns,
          s.order, s.rnd, s.bob, s.shardAngle,
        ];
        put([...c, g, 1, KIND.face, ...tail, tc[0], tc[2], 0, 0]);
        put([...a, g, 0, KIND.face, ...tail, tc[0], tc[2], 1, 0]);
        put([...b, g, 0, KIND.face, ...tail, tc[0], tc[2], 0, 1]);
      }
    });
  }
  // Floor: a polar disc, finer near the centre.
  const ring = (k) => FLOOR.radius * Math.pow(k / FLOOR.rings, 1.35);
  const zeros = new Array(STRIDE - 8).fill(0);
  for (let k = 0; k < FLOOR.rings; k++)
    for (let j = 0; j < FLOOR.segments; j++) {
      const r0 = ring(k),
        r1 = ring(k + 1),
        a0 = (j / FLOOR.segments) * TAU,
        a1 = ((j + 1) / FLOOR.segments) * TAU;
      const P = (r, a) => [r * Math.cos(a), 0, r * Math.sin(a), -1, 0, KIND.floor, 0, 0, ...zeros];
      put(P(r0, a0));
      put(P(r1, a0));
      put(P(r1, a1));
      put(P(r0, a0));
      put(P(r1, a1));
      put(P(r0, a1));
    }
  return data;
}
