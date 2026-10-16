import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { defaultPattern } from "../rhythm.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import {
  ATTRIBUTES,
  STRIDE,
  PANELS,
  BANDS,
  CAMERA,
  createGeometry,
  paperPoint,
  snapAmount,
  cameraPose,
} from "../fold-geometry.mjs";
const scene = scenes.find((s) => s.id === "fold");
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
test("fold preserves continuous world, authored looks, seeds and schema", () => {
  assert.equal(scene.number, 91);
  const w = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  ).find((w) => w.id === "origami");
  assert.deepEqual(
    w.states.map((s) => s.name),
    ["Sheet", "Fold", "Shards"],
  );
  assert.deepEqual(
    scene.presets.slice(0, 3).map((p) => p.seed),
    [527, 527, 527],
  );
  const clips = w.states.map((s) => ({
    snapshot: presetSnapshot(
      scene,
      scene.presets.findIndex((p) => `fold:${p.name}` === s.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, scene).positions, [0, 1, 2]);
  assert.equal(scene.presets.length, 8);
  for (const p of scene.presets)
    for (const f of scene.schema)
      assert.ok(
        p.params[f.key] >= f.min && p.params[f.key] <= f.max,
        `${p.name}.${f.key}`,
      );
  assert.equal(
    ATTRIBUTES.reduce((s, n) => s + n),
    STRIDE,
  );
});
test("connected paper topology includes shared median, chevrons and folded-back hems", () => {
  const mesh = createGeometry(527);
  assert.equal(mesh.length / STRIDE, PANELS * BANDS * 4 * 2 * 6 + 6);
  const points = new Map();
  for (let i = 0; i < mesh.length; i += STRIDE) {
    assert.ok([...mesh.subarray(i, i + STRIDE)].every(Number.isFinite));
    if (mesh[i + 3] !== 1) continue;
    const [s, v, b] = mesh.subarray(i, i + 3),
      key = `${s},${v},${b}`;
    points.set(key, (points.get(key) ?? 0) + 1);
  }
  // Every internal cross-section and the centre crease are reused, never
  // independent triangle rotations that could open cracks.
  for (let b = 0; b < BANDS; b++)
    for (let s = 1; s < PANELS; s++) {
      for (const v of [-0.92, 0, 0.92]) {
        const fv = Math.fround(v);
        assert.ok(points.get(`${s},${fv},${b}`) >= 4);
      }
    }
  assert.deepEqual(createGeometry(527), mesh);
  assert.notDeepEqual(createGeometry(777), mesh);
});
test("shadow topology matches the exact surface mesh", () => {
  const m = createGeometry();
  let count = 0;
  for (let i = 0; i < m.length - STRIDE * 12; i += STRIDE * 6) {
    if (m[i + 3] !== 1) continue;
    const j = i + STRIDE * 6;
    assert.equal(m[j + 3], 2);
    for (let v = 0; v < 6; v++)
      for (let k = 0; k < STRIDE; k++)
        if (k !== 3) assert.equal(m[i + v * STRIDE + k], m[j + v * STRIDE + k]);
    count++;
  }
  assert.equal(count, PANELS * BANDS * 4);
});
test("all phases, development values and snaps are finite, bounded and reversible", () => {
  for (const seed of [527, 1931, 88, 3307, 777, 4096])
    for (const dev of [0, 0.2, 0.5, 0.9, 1, 1.4, 1.8, 2])
      for (const phase of [0, 0.37, 1])
        for (const snap of [0, 0.5, 1])
          for (let b = 0; b < BANDS; b++)
            for (const s of [0, 1, 9, 17, 18])
              for (const v of [-1.06, 0, 1.06]) {
                const p = paperPoint(s, v, b, dev, phase, snap, seed, 2);
                assert.ok(p.every(Number.isFinite));
                assert.ok(
                  Math.hypot(p[0], p[2]) < 9.5,
                  "outside camera clearance",
                );
                assert.ok(p[1] > -0.2 && p[1] < 10.5);
                assert.ok(
                  dist(p, paperPoint(s, v, b, dev, phase + 1, snap, seed, 2)) <
                    1e-11,
                  "phase wrap",
                );
                const next = paperPoint(
                  s,
                  v,
                  b,
                  dev + 1e-5,
                  phase,
                  snap,
                  seed,
                  2,
                );
                assert.ok(dist(p, next) < 0.001, "no development jump");
                assert.deepEqual(
                  p,
                  paperPoint(s, v, b, dev, phase, snap, seed, 2),
                );
              }
});
test("crease snap closes a coherent connected band, with a hold independent of colour", () => {
  assert.equal(snapAmount(0), 0);
  assert.equal(snapAmount(0.4), 1);
  assert.equal(snapAmount(1), 1);
  assert.ok(snapAmount(0.25) > 0.4);
  let moved = 0;
  for (let s = 0; s <= PANELS; s++) {
    const a = paperPoint(s, 1, 0, 2, 0.2, 0),
      b = paperPoint(s, 1, 0, 2, 0.2, 1);
    moved += dist(a, b);
  }
  assert.ok(
    moved / (PANELS + 1) > 1,
    "structural fold moves over one world unit",
  );
  assert.match(scene.geometry.vertex, /mod\(u_rhythmCount\.w,3\.\)/);
  assert.match(scene.geometry.vertex, /ss\(\.12,\.38,max\(u_rhythm\.w/);
});
test("camera remains outside all paper and has only bounded development movement", () => {
  for (const dev of [0, 0.5, 1, 1.5, 2])
    for (const phase of [0, 0.17, 0.65]) {
      const p = cameraPose(dev, phase);
      assert.equal(Math.hypot(p.eye[0], p.eye[2]), CAMERA.radius);
      assert.ok(dist(p.eye, cameraPose(dev, phase + 1).eye) < 1e-11);
      assert.ok(
        dist(p.eye, cameraPose(2 - dev, phase).eye) < 1e-11,
        "no dolly lurch",
      );
    }
});
test("every preset owns four distinct gestures with full driving/accented grids", () => {
  assert.deepEqual(
    scene.rhythm.map((g) => g.slot),
    [0, 1, 2, 3],
  );
  assert.equal(scene.rhythm[3].id, "crease-snap");
  for (const [style, min] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    let density = 0;
    for (const g of scene.rhythm) {
      const p = defaultPattern([g], style).tracks[0],
        hits = p.steps.filter((x) => x > 0).length;
      assert.ok(hits >= (g.slot === 3 ? 2 : 1), `${style}/${g.id}`);
      density += hits / (p.length / p.division / 4);
    }
    assert.ok(density >= min, `${style}: ${density}`);
  }
  assert.deepEqual(Object.values(scene.rhythmStyles), [
    "Paper hush",
    "Crease dance",
    "Thousand cranes",
  ]);
});
