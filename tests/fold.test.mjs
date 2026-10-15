import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import {
  ATTRIBUTES,
  CAMERA,
  FIELD,
  KIND,
  STORM,
  MAX_DEPTH,
  STRIDE,
  SWIRL_PERIOD,
  TEMPLATES,
  arrangement,
  cameraPose,
  createGeometry,
  foldPoint,
  foldProgress,
  liftProgress,
  netOverlaps,
  paperNormal,
  shardFrame,
  rotateAbout,
  shardOrbit,
  shardProgress,
  shadowPoint,
} from "../fold-geometry.mjs";

const scene = scenes.find((s) => s.id === "fold");
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("fold is a registered continuous world with three authored states", () => {
  assert.ok(scene);
  assert.equal(scene.number, 91);
  assert.equal(scene.development, "development");
  const world = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  ).find((w) => w.id === "origami");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Sheet", "Fold", "Shards"],
  );
  const clips = world.states.map((state) => ({
    snapshot: presetSnapshot(
      scene,
      scene.presets.findIndex((p) => `fold:${p.name}` === state.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, scene)?.positions, [0, 1, 2]);
  assert.ok(scene.presets.length >= 6);
  for (const preset of scene.presets)
    for (const field of scene.schema) {
      const value = preset.params[field.key];
      assert.ok(
        value >= field.min && value <= field.max,
        `${preset.name}.${field.key}`,
      );
    }
  assert.equal(
    ATTRIBUTES.reduce((a, b) => a + b),
    STRIDE,
  );
});

test("Platonic nets are flat, non-overlapping spanning trees with short hinge chains", () => {
  assert.deepEqual(
    TEMPLATES.map((t) => t.faces.length),
    [4, 6, 8, 12, 20],
  );
  for (const t of TEMPLATES) {
    assert.ok(!netOverlaps(t), `template ${t.id} overlaps`);
    assert.equal(t.parent.filter((p) => p < 0).length, 1, "one root");
    assert.ok(t.maxDepth <= MAX_DEPTH);
    for (const face of t.flat)
      for (const v of face) assert.ok(Math.abs(v[1]) < 1e-12);
    // Every unfolded edge has unit length.
    t.flat.forEach((face) =>
      face.forEach((v, i) =>
        assert.ok(Math.abs(dist(v, face[(i + 1) % face.length]) - 1) < 1e-9),
      ),
    );
  }
});

test("hinge chains close every solid exactly (CPU reference of the shader)", () => {
  for (const t of TEMPLATES) {
    let worst = 0;
    t.faces.forEach((face, f) =>
      face.forEach((vertex, k) => {
        const folded = foldPoint(t, f, t.flat[f][k]);
        worst = Math.max(worst, dist(folded, t.folded[vertex]));
        assert.ok(folded[1] >= -1e-9, "solid stands on the sheet");
      }),
    );
    assert.ok(worst < 1e-9, `template ${t.id}: ${worst}`);
    // All copies of one solid vertex coincide, so no face is left open.
    const copies = new Map();
    t.faces.forEach((face, f) =>
      face.forEach((v, k) =>
        copies.set(v, [
          ...(copies.get(v) ?? []),
          foldPoint(t, f, t.flat[f][k]),
        ]),
      ),
    );
    for (const list of copies.values())
      for (const p of list) assert.ok(dist(p, list[0]) < 1e-9);
  }
});

test("folding is rigid at every intermediate development", () => {
  const t = TEMPLATES[4];
  for (const development of [0, 0.3, 0.55, 0.81, 1]) {
    t.faces.forEach((face, f) => {
      const pts = t.flat[f].map((p) =>
        foldPoint(t, f, p, (g) => foldProgress(development, 0.4, t.depth[g])),
      );
      pts.forEach((p, i) =>
        assert.ok(Math.abs(dist(p, pts[(i + 1) % pts.length]) - 1) < 1e-9),
      );
    });
  }
});

test("development is continuous, reversible and staged sheet → fold → shards", () => {
  for (const birth of [0, 0.5, 1])
    for (const depth of [0, 2, 5]) {
      assert.ok(
        Math.abs(foldProgress(0, birth, depth) - 0.035) < 1e-12,
        "faint creases at Sheet",
      );
      assert.equal(foldProgress(1, birth, depth), 1, "closed at Fold");
      assert.equal(foldProgress(2, birth, depth), 1);
      assert.equal(liftProgress(0, birth), 0);
      assert.equal(liftProgress(1, birth), 1);
      let last = foldProgress(0, birth, depth);
      for (let i = 1; i <= 20000; i++) {
        const next = foldProgress(i / 10000, birth, depth);
        assert.ok(Math.abs(next - last) < 0.002);
        last = next;
      }
    }
  for (const order of [0, 0.5, 1]) {
    assert.equal(shardProgress(1, order), 0, "solids intact at Fold");
    assert.equal(shardProgress(2, order), 1, "all shards free at Shards");
  }
});

test("nets and solids stay in their field; expanded vortex phases wrap without jumps", () => {
  const camera = CAMERA.radius - CAMERA.sway;
  for (const seed of [527, 1931, 88, 3307]) {
    const items = arrangement(seed);
    assert.ok(items.length > 40);
    for (const it of items) {
      const t = TEMPLATES[it.t];
      // A lifted solid tumbles about its centre: it stays inside the field.
      const centre = Math.hypot(t.solidCentre[0], t.solidCentre[2]) * it.scale;
      assert.ok(
        Math.hypot(it.x, it.z) + centre + t.solidRadius * it.scale <= FIELD,
      );
      assert.ok(Math.hypot(it.x, it.z) + it.r <= FIELD);
      for (const face of it.shards)
        for (const shard of face) {
          assert.ok(Number.isInteger(shard.turns) && shard.turns >= 1);
          const a = shardOrbit(shard, 0),
            b = shardOrbit(shard, 1);
          assert.ok(dist(a, b) < 1e-9, "integer turns: phase wrap is seamless");
          assert.ok(a[1] > 0.2);
        }
    }
  }
  assert.ok(SWIRL_PERIOD > 0);
  assert.ok(camera > FIELD + 1.5, "early camera stays outside the paper field");
});

test("low camera is inside the storm canopy, outside every peak shard and streak", () => {
  const peak = cameraPose(2, .25);
  assert.ok(Math.hypot(peak.eye[0], peak.eye[2]) < FIELD);
  assert.ok(peak.target[1] > peak.eye[1] + 3);
  // Bound actual triangle extents in their orthonormal shard frame. Taking
  // worst bob, camera sway and height independently covers every phase.
  for (const seed of [527, 1931, 88, 3307, 777, 4096]) for (const item of arrangement(seed)) {
    const t = TEMPLATES[item.t];
    t.flat.forEach((face, f) => {
      const c = [0, 1, 2].map(k => face.reduce((s, p) => s + p[k], 0) / face.length);
      face.forEach((a, i) => {
        const b = face[(i + 1) % face.length], pts = [c, a, b];
        const tc = [0, 1, 2].map(k => pts.reduce((s, p) => s + p[k], 0) / 3);
        const shard = item.shards[f][i], sa = shard.shardAngle;
        const scale = Math.min(item.scale, .8) * 1.1;
        const offsets = pts.map(p => {
          const x = (p[0] - tc[0]) * scale, y = (p[2] - tc[2]) * scale * .6;
          const ox = x * Math.cos(sa) - y * Math.sin(sa), oy = x * Math.sin(sa) + y * Math.cos(sa);
          return [ox * (ox < 0 ? 1 + 2 * STORM.stretch : 1), oy];
        });
        const mx = Math.max(...offsets.map(o => Math.abs(o[0]))), my = Math.max(...offsets.map(o => Math.abs(o[1])));
        const bank = .38 * Math.cos(sa), len = Math.hypot(bank, 1);
        const radialMax = Math.hypot(shard.radius * STORM.radius + Math.abs(bank) * my / len, mx);
        const yMin = STORM.height * (shard.height - .35) - my / len;
        for (const crane of [0, .25, .5, .75, 1]) {
          const cameraR = CAMERA.peakRadius - CAMERA.sway + 3.5 * crane;
          const cameraY = CAMERA.peakHeight + .18 + 3.5 * crane;
          assert.ok(radialMax < cameraR - .1 || yMin > cameraY + .1,
            `shard/camera overlap seed ${seed}, crane ${crane}: r ${radialMax}, y ${yMin}`);
        }
      });
    });
  }
  for (const dev of [0, .8, 1.4, 1.7, 2]) {
    const a = cameraPose(dev, .37), b = cameraPose(dev, 1.37);
    assert.ok(dist(a.eye, b.eye) < 1e-12);
  }
});

test("cast shadows reuse exact hinge attributes and project in the key direction", () => {
  const data = createGeometry(527);
  let pairs = 0;
  for (let i = 0; i < data.length; i += STRIDE * 3) {
    if (data[i + 5] !== KIND.face || data[i + 10] < .45) continue;
    const next = i + STRIDE * 3;
    assert.equal(data[next + 5], KIND.shadow);
    for (let v = 0; v < 3; v++) for (let k = 0; k < STRIDE; k++) {
      if (k !== 5) assert.equal(data[i + v * STRIDE + k], data[next + v * STRIDE + k]);
    }
    pairs++;
  }
  assert.ok(pairs > 300, "all hero nets carry actual triangle shadows");
  const p = [1, 2, -3], q = shadowPoint(p), h = p[1] + .22;
  assert.ok(Math.abs((q[0] - p[0]) / h - .75 / .6) < 1e-12);
  assert.ok(Math.abs((q[2] - p[2]) / h - .42 / .6) < 1e-12);
  assert.equal(q[1], -.185);
});

test("analytic paper normals match differences; banked shards stay rigid and periodic", () => {
  const wave=(x,z,a,p)=>a*(Math.sin(.55*x+4*Math.PI*p)*Math.sin(.47*z-6*Math.PI*p)+.5*Math.sin(.31*(x+z)+10*Math.PI*p));
  const e=1e-5;
  for(const x of [-9,-.2,3,12]) for(const z of [-7,0,5]) for(const p of [0,.37,1]) {
    const dx=(wave(x+e,z,.12,p)-wave(x-e,z,.12,p))/(2*e);
    const dz=(wave(x,z+e,.12,p)-wave(x,z-e,.12,p))/(2*e);
    const q=[-dx,1,-dz],len=Math.hypot(...q),n=paperNormal(x,z,.12,p);
    assert.ok(dist(n,q.map(v=>v/len))<1e-9);
    assert.ok(dist(n,paperNormal(x,z,.12,p+1))<1e-12);
  }
  for(const item of arrangement(527)) for(const face of item.shards) for(const shard of face) {
    const f=shardFrame(shard,.37),wrapped=shardFrame(shard,1.37);
    for(const v of Object.values(f))assert.ok(Math.abs(Math.hypot(...v)-1)<1e-12);
    assert.ok(Math.abs(f.tangent.reduce((s,v,i)=>s+v*f.across[i],0))<1e-12);
    assert.ok(dist(f.normal,wrapped.normal)<1e-12);
  }
  assert.deepEqual(scene.presets.map(p=>p.seed),[527,527,527,1931,88,3307,777,4096]);
});

test("geometry is deterministic, finite and bounded", () => {
  const a = createGeometry(527),
    b = createGeometry(528);
  assert.deepEqual(a, createGeometry(527));
  assert.notDeepEqual(a.subarray(0, 2000), b.subarray(0, 2000));
  assert.ok(a.every(Number.isFinite));
  assert.equal(a.length % (STRIDE * 3), 0);
  assert.ok(a.length / STRIDE < 30000, "floor tessellation must not dominate vertex work");
  // Rodrigues sanity: a quarter turn about +y maps +x to -z.
  const r = rotateAbout([1, 0, 0], [0, 0, 0], [0, 1, 0], Math.PI / 2);
  assert.ok(dist(r, [0, 0, -1]) < 1e-12);
});
