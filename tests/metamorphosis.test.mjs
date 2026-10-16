import test from "node:test";
import assert from "node:assert/strict";
import scene from "../scene-metamorphosis.mjs";
import {
  organism,
  createGeometry,
  petalPoint,
  projectPoint,
  orientPoint,
} from "../metamorphosis-geometry.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment } from "../worlds.mjs";
import { defaultPattern } from "../rhythm.mjs";

test("Unfolding Garden preserves all look names, seeds, schema and continuous identity", () => {
  assert.deepEqual(
    scene.presets.map((p) => [p.name, p.seed]),
    [
      ["First Filaments", 112],
      ["Pearl Membranes", 112],
      ["Open Blossom", 112],
      ["Wandering Threads", 847],
      ["Silver Canopy", 847],
      ["Evening Blossom", 2451],
    ],
  );
  assert.deepEqual(
    scene.schema.map((p) => p.key),
    ["development", "sway", "speed", "light"],
  );
  assert.deepEqual(
    continuousDevelopment(
      [0, 1, 2].map((i) => ({ snapshot: presetSnapshot(scene, i) })),
      scene,
    ),
    {
      key: "development",
      min: 0,
      max: 2,
      positions: [0, 1, 2],
    },
  );
  for (const p of scene.presets)
    for (const f of scene.schema)
      assert.ok(p.params[f.key] >= f.min && p.params[f.key] <= f.max);
  const a = createGeometry(112),
    b = createGeometry(112);
  assert.deepEqual(a, b);
  assert.ok(
    a.length / 8 < 150000,
    "bounded static tessellation pays for perspective/materials",
  );
  assert.equal(a.length % 24, 0);
  for (let i = 0; i < a.length; i += 8) {
    assert.ok(Number.isFinite(a[i]));
    assert.equal(a[i + 7], Math.floor(a[i + 7]));
  }
  assert.match(scene.geometry.vertex, /depth\*1\.0168067-\.20168067,depth/);
});

test("separated membranes release progressively and reverse without changing ancestry", () => {
  for (const node of organism(112))
    for (let p = 0; p < node.petals; p++)
      for (const t of [0.1, 0.4, 0.8, 1]) {
        const right = petalPoint(node, p, t, 1, 1, { sway: 0 });
        const left = petalPoint(node, (p + 1) % node.petals, t, -1, 1, {
          sway: 0,
        });
        assert.ok(
          Math.hypot(...right.map((x, i) => x - left[i])) > 0.001,
          "open seams prevent an intermediate radial plate",
        );
        for (const d of [0, 0.25, 0.75, 1, 1.25, 1.75, 2]) {
          const args = [node, p, t, 0.3, d, { phase: 120, sway: 2 }];
          const before = petalPoint(...args);
          petalPoint(node, p, t, 0.3, 2 - d, { phase: 120, sway: 2 });
          assert.deepEqual(
            petalPoint(...args),
            before,
            "no hysteresis or seed reset",
          );
          const after = petalPoint(node, p, t, 0.3, d + 1e-5, {
            phase: 120,
            sway: 2,
          });
          assert.ok(before.every(Number.isFinite));
          assert.ok(Math.hypot(...after.map((x, i) => x - before[i])) < 1e-4);
        }
      }
});

test("slot-3 flush is authored, full, local and continuous on each membrane", () => {
  assert.deepEqual(
    scene.rhythm.map((g) => g.slot),
    [0, 1, 2, 3],
  );
  assert.equal(scene.rhythm[3].id, "petal-flush");
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const pattern = defaultPattern(scene.rhythm, style);
    let density = 0;
    for (const track of pattern.tracks) {
      const hits = track.steps.flatMap((v, i) => (v > 0 ? [i] : []));
      density += (hits.length * 4 * track.division) / track.length;
      const gaps = hits.map(
        (h, i) =>
          (hits[(i + 1) % hits.length] +
            (i === hits.length - 1 ? track.length : 0) -
            h) /
          track.division,
      );
      assert.ok(track.duration < Math.min(...gaps));
    }
    assert.ok(density >= minimum, `${style}: ${density} hits/bar`);
    assert.ok(
      scene.rhythm[3].styles[style].steps.filter((v) => v > 0).length >= 2,
    );
  }
  const node = organism(112)[1];
  for (let p = 0; p < node.petals; p++) {
    for (const count of [0, 3, 50000]) {
      const opts = { sway: 0, flush: 1, count };
      for (const v of [-1, 0, 1]) {
        const a = petalPoint(node, p, 0.75, v, 1, opts);
        const b = petalPoint(node, p, 0.750001, v, 1, opts);
        assert.ok(Math.hypot(...a.map((v, i) => v - b[i])) < 1e-4);
      }
      for (const d of [0, 0.5, 1, 1.5, 2]) {
        const a = petalPoint(node, p, 0.8, 0.3, d, opts);
        const b = petalPoint(node, p, 0.8, 0.3, d + 1e-5, opts);
        assert.ok(a.every(Number.isFinite));
        assert.ok(Math.hypot(...a.map((v, i) => v - b[i])) < 1e-4);
      }
    }
  }
  for (const source of [scene.geometry.vertex, scene.geometry.fragment]) {
    assert.match(source, /u_rhythm\.w/);
    assert.match(source, /u_rhythmCount\.w/);
  }
  assert.match(scene.geometry.fragment, /u_rhythmHit\.w/);
  const low = petalPoint(node, 0, 0.7, 0.3, 0, { level: 0.1 });
  const high = petalPoint(node, 0, 0.7, 0.3, 0, { level: 0.9 });
  assert.ok(Math.hypot(...low.map((v, i) => v - high[i])) > 0.03);
});

test("rooted stalks never connect flowers; seed membranes and local frames break rotor repetition", () => {
  const nodes = organism(112),
    data = createGeometry(112);
  assert.ok(new Set(nodes.map((n) => n.petals)).size >= 5);
  for (let i = 0; i < data.length; i += 8) {
    if (data[i + 6] !== 1) continue;
    const node = nodes[data[i + 7]];
    assert.ok(Math.abs(data[i + 2] - node.x) < 1e-6);
    assert.ok(Math.abs(data[i + 3] - node.y) < 1e-6);
    assert.ok(Math.abs(data[i + 4] - node.size) < 1e-6);
  }
  const tips = nodes.map((n) => {
    const p = orientPoint(n, [n.x, n.y + 1, 0]);
    return p[2] - orientPoint(n, [n.x, n.y, 0])[2];
  });
  assert.ok(Math.max(...tips) - Math.min(...tips) > 1);
  const hero = nodes[1];
  const seed = petalPoint(hero, 0, 1, 0, 0, { sway: 0 });
  const centre = orientPoint(hero, [hero.x, hero.y, 0]);
  assert.ok(
    seed[2] - centre[2] > 0.45,
    "curled upright seed, not flat pinwheel",
  );
  assert.match(scene.geometry.fragment, /float midrib=/);
  assert.match(scene.geometry.fragment, /float branch=/);
  assert.doesNotMatch(scene.geometry.fragment, /float rib=/);
});

test("petal flush moves root to tip and releases only behind its front, then recovers", () => {
  const hero = organism(112)[1];
  const opts = { sway: 0, count: hero.angle / 2.39996 };
  const displacement = (t, flush) => {
    const a = petalPoint(hero, 0, t, 0, 2, { ...opts, flush });
    const b = petalPoint(hero, 0, t, 0, 2, { ...opts, flush: 0 });
    return Math.hypot(...a.map((x, i) => x - b[i]));
  };
  // At onset the local front is still inside the root. It crosses the
  // middle before the tips; the decaying envelope then closes the petals.
  assert.ok(displacement(0.5, 1) < 1e-9);
  assert.ok(displacement(0.5, 0.45) > 0.05);
  assert.ok(displacement(0.95, 0.45) < 1e-9);
  assert.ok(displacement(0.95, 0.15) > 0.05);
  assert.equal(displacement(0.95, 0), 0);
  assert.ok(scene.rhythm[3].styles.driving.duration >= 1.5);
  assert.match(scene.geometry.vertex, /float front=1\.12-1\.25\*u_rhythm\.w/);
  assert.match(scene.geometry.fragment, /1\.12-1\.25\*u_rhythm\.w/);
});

test("rolled membranes extend monotonically without an intermediate flat disc", () => {
  const node = organism(112)[1],
    centre = orientPoint(node, [node.x, node.y, 0]);
  for (let p = 0; p < node.petals; p++) {
    const angle = node.angle + (p / node.petals) * Math.PI * 2;
    const axis = orientPoint(node, [
      node.x + Math.cos(angle),
      node.y + Math.sin(angle),
      0,
    ]).map((x, i) => x - centre[i]);
    let previous = 0;
    for (const d of [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]) {
      const point = petalPoint(node, p, 1, 0, d, { sway: 0 });
      const reach = point.reduce((s, x, i) => s + (x - centre[i]) * axis[i], 0);
      assert.ok(
        reach >= previous - 1e-10,
        "tip reaches outward throughout development",
      );
      previous = reach;
      assert.ok(
        point[2] - centre[2] > 0.5,
        "persistent cup depth, never a plate",
      );
    }
  }
  assert.match(scene.geometry.fragment, /veinDelay/);
  assert.match(scene.geometry.fragment, /float wake=/);
  assert.match(scene.geometry.fragment, /float selectedFold=/);
});

test("background blossoms keep the mesh bounded and the landscape hero fills 60–80% vertically", () => {
  for (const seed of [112, 847, 2451]) {
    const nodes = organism(seed),
      hero = nodes[1];
    assert.equal(nodes.length, 14);
    assert.ok(
      nodes.slice(8).every((n) => n.y > 1.4),
      "persistent distant scale cues",
    );
    assert.ok(
      createGeometry(seed).length / 8 <= 143232,
      "no additional vertex budget",
    );
    for (const time of [0, 30, 120]) {
      const points = [];
      for (let p = 0; p < hero.petals; p++)
        for (const t of [0.2, 0.4, 0.6, 0.8, 1])
          for (const v of [-1, 0, 1])
            points.push(
              projectPoint(
                petalPoint(hero, p, t, v, 2, { phase: time, sway: 1 }),
                time,
              ),
            );
      const height =
        (Math.max(...points.map((p) => p[1])) -
          Math.min(...points.map((p) => p[1]))) /
        2;
      assert.ok(
        height >= 0.6 && height <= 0.8,
        `seed ${seed} height ${height}`,
      );
    }
  }
});

test("the top blossom is larger than its membrane and the hero fits landscape and portrait", () => {
  for (const seed of [112, 847, 2451]) {
    const hero = organism(seed)[1];
    const root = petalPoint(hero, 0, 0, 0, 0, { sway: 0 });
    const membrane = petalPoint(hero, 0, 1, 0, 1, { sway: 0 });
    const blossom = petalPoint(hero, 0, 1, 0, 2, { sway: 0 });
    assert.ok(
      Math.hypot(...blossom.map((x, i) => x - root[i])) >
        Math.hypot(...membrane.map((x, i) => x - root[i])) * 1.15,
    );
    for (const time of [0, 30, 120, 1000, 43200])
      for (const aspect of [16 / 9, 9 / 16])
        for (const d of [0, 0.5, 1, 1.5, 2])
          for (let p = 0; p < hero.petals; p++)
            for (const t of [0.2, 0.5, 0.8, 1])
              for (const v of [-1, 0, 1])
                for (const flush of [0, 0.3, 0.6, 1]) {
                  const q = petalPoint(hero, p, t, v, d, {
                    phase: time % 150,
                    sway: 2,
                    edgeGesture: 1,
                    flush,
                    count:
                      (hero.angle + (p / hero.petals) * Math.PI * 2) / 2.39996,
                    level: 0.9,
                  });
                  const [x, y, z] = projectPoint(q, time, aspect, 1);
                  assert.ok(z > 0.1 && z < 12);
                  assert.ok(
                    Math.abs(x) < 0.99 && Math.abs(y) < 0.99,
                    `cropped hero seed=${seed} d=${d} t=${time}: ${x},${y}`,
                  );
                }
  }
});
