import test from "node:test";
import assert from "node:assert/strict";
import scene from "../scene-fibration.mjs";
import {
  LAYERS,
  SEGMENTS,
  SIDES,
  FIBRES,
  PER_FIBRE,
  MARGIN,
  GROW,
  fibres,
  createGeometry,
  fibrePoint,
  hopf,
  tumble,
  untumble,
  stereo,
  fibreCurve,
  layerTheta,
  growth,
  safeTumble,
  layerGLSL,
} from "../fibration-geometry.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { defaultWorlds, continuousDevelopment } from "../worlds.mjs";

const TAU = 2 * Math.PI;
const near = (a, b, eps, label) =>
  assert.ok(Math.abs(a - b) < eps, `${label ?? ""} ${a} != ${b}`);
const base = (theta, phi) => [
  Math.sin(theta) * Math.cos(phi),
  Math.sin(theta) * Math.sin(phi),
  Math.cos(theta),
];
const list = fibres(9601);
const visible = (dev) => list.filter((f) => growth(f.start, dev) > 0);
const curve = (f, dev, a, n = 240) =>
  Array.from({ length: n }, (_, k) => fibreCurve(f, dev, (TAU * k) / n, a));
// Gauss linking integral of two closed polygons.
function linking(A, B) {
  let sum = 0;
  for (let i = 0; i < A.length; i++) {
    const a0 = A[i],
      a1 = A[(i + 1) % A.length];
    const ma = a0.map((v, k) => (v + a1[k]) / 2),
      da = a1.map((v, k) => v - a0[k]);
    for (let j = 0; j < B.length; j++) {
      const b0 = B[j],
        b1 = B[(j + 1) % B.length];
      const mb = b0.map((v, k) => (v + b1[k]) / 2),
        db = b1.map((v, k) => v - b0[k]);
      const r = ma.map((v, k) => v - mb[k]),
        d = Math.hypot(...r);
      sum +=
        (r[0] * (da[1] * db[2] - da[2] * db[1]) +
          r[1] * (da[2] * db[0] - da[0] * db[2]) +
          r[2] * (da[0] * db[1] - da[1] * db[0])) /
        (d * d * d);
    }
  }
  return sum / (4 * Math.PI);
}

test("every point of every visible fibre maps to its base point, also under the 4D tumble", () => {
  for (const dev of [0, 0.5, 1, 1.5, 2])
    for (const f of visible(dev)) {
      const theta = layerTheta(f.layer, dev),
        b = base(theta, f.phi),
        a = safeTumble(dev) * 0.9;
      for (let k = 0; k < 12; k++) {
        const q = fibrePoint(theta, f.phi, (TAU * k) / 12);
        near(Math.hypot(...q), 1, 1e-12, "on S³");
        const h = hopf(q);
        if (theta > 0) near(Math.hypot(...h.map((v, i) => v - b[i])), 0, 1e-12);
        else near(h[2], 1, 1e-12, "core over the north pole");
        // The tumbled fibre is a fibre of the rotated Hopf map h ∘ R⁻¹.
        const r = hopf(untumble(tumble(q, a, 0.3), a, 0.3));
        near(Math.hypot(...r.map((v, i) => v - h[i])), 0, 1e-12, "R⁻¹R");
      }
    }
});

test("projected fibres are round, planar circles", () => {
  const sub = (p, q) => p.map((v, i) => v - q[i]);
  const cross = (p, q) => [
    p[1] * q[2] - p[2] * q[1],
    p[2] * q[0] - p[0] * q[2],
    p[0] * q[1] - p[1] * q[0],
  ];
  const dot = (p, q) => p.reduce((s, v, i) => s + v * q[i], 0);
  for (const f of [list[0], list[25], list.at(-2), list.at(-1)]) {
    const pts = curve(f, 2, safeTumble(2), 63);
    const [a, b, c] = [pts[0], pts[21], pts[42]];
    const ab = sub(b, a),
      ac = sub(c, a),
      w = cross(ab, ac),
      w2 = dot(w, w);
    const centre = a.map(
      (v, i) =>
        v +
        (cross(w, ab)[i] * dot(ac, ac) + cross(ac, w)[i] * dot(ab, ab)) /
          (2 * w2),
    );
    const radii = pts.map((p) => Math.hypot(...sub(p, centre)));
    assert.ok(Math.max(...radii) - Math.min(...radii) < 1e-6, "round");
    for (const p of pts) near(dot(sub(p, a), w) / Math.sqrt(w2), 0, 1e-8, "planar");
  }
});

test("any two visible fibres are linked exactly once (Gauss integral)", () => {
  for (const [dev, a] of [
    [0, safeTumble(0)],
    [1, -safeTumble(1)],
    [2, safeTumble(2)],
  ]) {
    const shown = visible(dev);
    // Same layer, neighbouring layers, inner/outer extremes and the core.
    const pairs = [
      [shown[0], shown[1]],
      [shown[0], shown[Math.floor(shown.length / 2)]],
      [shown.at(-1), shown[3]],
      [shown.at(-2), shown.at(-1)],
    ];
    for (const [p, q] of pairs) {
      if (p === q) continue;
      const L = linking(curve(p, dev, a, 220), curve(q, dev, a, 220));
      near(Math.abs(L), 1, 0.03, `dev ${dev} layers ${p.layer}/${q.layer}`);
    }
  }
});

test("projected geometry stays bounded and outside the camera at every development and tumble", () => {
  const bound = 1 / Math.tan(MARGIN / 2); // cot(margin/2) ≈ 4.70
  let max = 0;
  for (let dev = 0; dev <= 2.0001; dev += 0.05)
    for (const sign of [-1, 1])
      for (const f of visible(dev))
        for (const p of curve(f, dev, sign * safeTumble(dev), 96))
          max = Math.max(max, Math.hypot(...p));
  assert.ok(max <= bound + 1e-9, `${max} > ${bound}`);
  // Closest camera: distance × base 7.2 × (1 − 4% drift), minus the thickest tube.
  const minCamera =
    scene.schema.find((f) => f.key === "distance").min * 7.2 * 0.96;
  const thickest = 0.036 * 1.6 * Math.pow(0.5 + 0.5 * bound * bound, 0.2);
  assert.ok(minCamera - thickest > bound, `${minCamera} vs ${bound}`);
});

test("development blooms continuously and each integer state is complete", () => {
  const complete = (dev) =>
    new Set(
      LAYERS.map((_, k) => k).filter((k) =>
        list.filter((f) => f.layer === k).every((f) => growth(f.start, dev) === 1),
      ),
    );
  const hidden = (dev) =>
    new Set(
      LAYERS.map((_, k) => k).filter((k) =>
        list.filter((f) => f.layer === k).every((f) => growth(f.start, dev) === 0),
      ),
    );
  assert.deepEqual([...complete(0)], [0]);
  assert.equal(hidden(0).size, LAYERS.length - 1);
  assert.deepEqual([...complete(1)], [0, 1, 2, 3, 4]);
  assert.deepEqual([...hidden(1)], [5, 6, 7, 8]);
  assert.equal(complete(2).size, LAYERS.length);
  for (const dev of [0, 1, 2])
    for (const f of visible(dev))
      near(layerTheta(f.layer, dev), LAYERS[f.layer].theta, 1e-12, "final latitude");
  // Lipschitz continuity in development: no jumps anywhere in [0, 2].
  for (let dev = 0; dev < 2; dev += 0.001)
    for (let k = 0; k < LAYERS.length; k++) {
      const dt = Math.abs(layerTheta(k, dev + 0.001) - layerTheta(k, dev));
      assert.ok(dt < 0.01, `layer ${k} at ${dev}`);
    }
  for (const f of list)
    for (let dev = 0; dev < 2; dev += 0.01)
      assert.ok(growth(f.start, dev + 0.01) - growth(f.start, dev) <= 0.01 / GROW + 1e-12);
  // A new torus appears out of its parent latitude, never out of nowhere.
  for (let k = 1; k < LAYERS.length; k++)
    near(layerTheta(k, LAYERS[k].a), LAYERS[LAYERS[k].from].theta, 1e-12);
});

test("identity is fixed per seed and independent of development", () => {
  const a = createGeometry(9601),
    b = createGeometry(9601),
    c = createGeometry(9602);
  assert.equal(a.length, FIBRES * PER_FIBRE * 2);
  assert.equal(c.length, a.length);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  // Every vertex of a fibre carries the same identity (φ, packed layer and
  // growth start), and the packing decodes exactly as the shader does.
  for (let f = 0; f < FIBRES; f++) {
    const o = f * PER_FIBRE * 2;
    for (let v = 0; v < PER_FIBRE; v += 997)
      for (let i = 0; i < 2; i++) assert.equal(a[o + v * 2 + i], a[o + i]);
    const layer = Math.floor(a[o + 1] * 0.25);
    assert.equal(layer, list[f].layer);
    near(a[o + 1] - 4 * layer - 1, list[f].start, 1e-5, "start");
    near(a[o], list[f].phi, 1e-5, "phi");
  }
  for (const layer of LAYERS)
    assert.ok(layerGLSL().includes(layer.theta.toFixed(6)));
  for (const f of list) {
    assert.ok(Number.isFinite(f.phi) && Number.isFinite(f.arc));
    assert.ok(f.start >= LAYERS[f.layer].a - 1e-12);
    assert.ok(f.start + GROW <= LAYERS[f.layer].b + 1e-12);
  }
});

test("looks validate; the three world states differ only in development", () => {
  assert.ok(scene.presets.length >= 6);
  for (let i = 0; i < scene.presets.length; i++) {
    const snapshot = presetSnapshot(scene, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [scene]),
      snapshot,
    );
  }
  assert.ok(!("development" in scene.energy));
  assert.ok(!(scene.audio ?? []).some((m) => m.param === "development"));
  const world = defaultWorlds(
    scene.presets.map((p) => `${scene.id}:${p.name}`),
  ).find((w) => w.id === "hopf-bloom");
  assert.ok(world, "Hopf Bloom is authored");
  const clips = world.states.map((s) => ({
    snapshot: presetSnapshot(
      scene,
      scene.presets.findIndex((p) => `${scene.id}:${p.name}` === s.look),
    ),
  }));
  const development = continuousDevelopment(clips, scene);
  assert.deepEqual(development?.positions, [0, 1, 2]);
  assert.equal(development.key, "development");
});

test("rework keeps saved look identities and a bounded circle tessellation", () => {
  assert.deepEqual(scene.presets.map(({ name, seed }) => [name, seed]), [
    ["Linked Torus", 9601], ["Nested Shells", 9601], ["Full Bundle", 9601],
    ["Cyclide Swing", 9602], ["Glass Nest", 9603], ["Bundle Weather", 9604],
    ["Half Bloom", 9605], ["Slow Core", 9606],
  ]);
  assert.equal(SIDES, 8);
  assert.ok(FIBRES * PER_FIBRE < 750000, "reduce repeated vertex work");
  // A projected circle is contained by the projection ball; its polygon's
  // sagitta stays below .002 scene units, without changing the exact curve.
  const sagitta = (1 / Math.tan(MARGIN / 2)) * (1 - Math.cos(Math.PI / SEGMENTS));
  assert.ok(sagitta < .002);
});

test("stereographic projection sends the pole fibre through infinity only", () => {
  // Sanity of the margin argument: the south-pole fibre contains the pole.
  const q = fibrePoint(Math.PI, 0, Math.PI / 2);
  near(q[3], 1, 1e-12);
  assert.ok(!Number.isFinite(Math.hypot(...stereo(q))) || Math.hypot(...stereo(q)) > 1e12);
});
