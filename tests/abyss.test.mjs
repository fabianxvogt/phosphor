import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import {
  ATTRIBUTES,
  DRIFT,
  KIND,
  NCH,
  NJ,
  NS,
  OPAQUE_VERTICES,
  PERIOD,
  REEF_TOP,
  STRIDE,
  cameraPath,
  chain,
  createGeometry,
  floorY,
  hash32,
  jelly,
  jellyReveal,
  reef,
  reefGrowth,
  rnd,
  vertexCounts,
} from "../abyss-geometry.mjs";

const scene = scenes.find((s) => s.id === "abyss");

test("abyss is a registered continuous world with three authored states", () => {
  assert.ok(scene);
  assert.equal(scene.number, 92);
  assert.equal(scene.development, "development");
  const world = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  ).find((w) => w.id === "deep-sea");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Sparks", "Swarms", "Reef"],
  );
  const clips = world.states.map((state) => ({
    snapshot: presetSnapshot(
      scene,
      scene.presets.findIndex((p) => `abyss:${p.name}` === state.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, scene)?.positions, [0, 1, 2]);
  assert.ok(scene.presets.length >= 8);
  assert.equal(new Set(scene.presets.map((p) => p.name)).size, scene.presets.length);
  for (const preset of scene.presets)
    for (const field of scene.schema) {
      const value = preset.params[field.key];
      assert.ok(Number.isFinite(value), `${preset.name}.${field.key}`);
      assert.ok(value >= field.min && value <= field.max, `${preset.name}.${field.key}`);
    }
  assert.equal(ATTRIBUTES.reduce((a, b) => a + b), STRIDE);
  assert.equal(scene.geometry.additiveFrom, OPAQUE_VERTICES);
  assert.equal(scene.particles.depth, true);
});

test("geometry is deterministic, finite, seed-dependent and split at a fixed opaque count", () => {
  const a = createGeometry(61),
    b = createGeometry(62),
    again = createGeometry(61);
  assert.deepEqual(a, again);
  assert.notDeepEqual(a.subarray(0, 8000), b.subarray(0, 8000));
  for (const data of [a, b]) {
    assert.ok(data.every(Number.isFinite));
    const vertices = data.length / STRIDE;
    assert.equal(vertices, vertexCounts().total);
    assert.equal(vertices % 3, 0);
    assert.equal(OPAQUE_VERTICES % 3, 0);
    // Opaque kinds (floor and reef) strictly before the additive tail.
    for (let v = 0; v < vertices; v += 97) {
      const kind = data[v * STRIDE];
      if (v < OPAQUE_VERTICES) assert.ok(kind <= KIND.pen, `opaque ${v} kind ${kind}`);
      else assert.ok(kind >= KIND.fan, `additive ${v} kind ${kind}`);
    }
  }
  assert.ok(vertexCounts().total < 700000);
});

test("integer hash mirrors lowbias32 and stays in [0, 1)", () => {
  // Reference values of lowbias32 (x ^= x>>16; x *= 0x7feb352d; ...).
  const M = (1n << 32n) - 1n;
  const reference = (v) => {
    let x = BigInt(v);
    x ^= x >> 16n;
    x = (x * 0x7feb352dn) & M;
    x ^= x >> 15n;
    x = (x * 0x846ca68bn) & M;
    x ^= x >> 16n;
    return Number(x);
  };
  for (const v of [0, 1, 2, 61, 0x2545f491, 0xffffffff, 123456789])
    assert.equal(hash32(v), reference(v));
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = rnd(61, i, 3);
    assert.ok(v >= 0 && v < 1);
    seen.add(Math.floor(v * 20));
  }
  assert.equal(seen.size, 20);
  assert.notEqual(rnd(61, 5, 1), rnd(62, 5, 1));
});

test("identity is independent of development; growth and reveal are continuous and reversible", () => {
  // Placement depends on the seed only.
  for (let i = 0; i < NJ + NS; i += 7) assert.deepEqual(jelly(61, i), jelly(61, i));
  const { items } = reef(61);
  for (const birth of [0, 0.3, 0.7, 1]) {
    let last = reefGrowth(birth, 0);
    for (let k = 1; k <= 20000; k++) {
      const next = reefGrowth(birth, k / 10000);
      assert.ok(Math.abs(next - last) < 0.004);
      assert.ok(next >= last - 1e-12);
      last = next;
    }
    assert.equal(reefGrowth(birth, 0), 0);
    assert.equal(reefGrowth(birth, 0.79), 0);
    assert.equal(reefGrowth(birth, 2), 1);
  }
  assert.ok(items.length > 1000);
  const jellies = Array.from({ length: NJ + NS }, (_, i) => jelly(61, i));
  const count = (dev) => jellies.filter((j) => jellyReveal(j, dev) > 0.5).length;
  // Sparks: only the three lone medusae. Swarms: every large medusa, few
  // swarm members. Reef: everything.
  assert.equal(count(0), 3);
  assert.equal(jellies.slice(0, NJ).filter((j) => jellyReveal(j, 1) > 0.99).length, NJ);
  assert.ok(jellies.slice(NJ).filter((j) => jellyReveal(j, 1) > 0.5).length < NS * 0.1);
  assert.equal(count(2), NJ + NS);
  for (const j of jellies.slice(0, 40)) {
    let last = jellyReveal(j, 0);
    for (let k = 1; k <= 4000; k++) {
      const next = jellyReveal(j, k / 2000);
      assert.ok(Math.abs(next - last) < 0.02);
      last = next;
    }
  }
});

test("seabed and camera path are periodic, so the glide is endless", () => {
  for (const x of [-20, -3, 0, 7.5])
    for (const z of [0, 11, 40]) {
      assert.ok(Math.abs(floorY(x, z) - floorY(x, z + PERIOD)) < 1e-9);
    }
  for (const dev of [0, 1, 1.5, 2])
    for (const z of [0, 9, 33]) {
      const a = cameraPath(z, dev),
        b = cameraPath(z + PERIOD, dev);
      assert.ok(Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9);
    }
});

const camXRange = (z0, reach) => {
  let lo = Infinity,
    hi = -Infinity;
  for (let z = z0 - reach; z <= z0 + reach; z += 0.02) {
    const x = cameraPath(z).at(0);
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return [lo, hi];
};

test("camera clearance: the glide never enters the reef, a medusa or a chain", () => {
  for (const seed of [61, 1709, 433, 2203, 877, 3301]) {
    // Reef: the tallest vertex stays below the lowest camera height.
    let camLow = Infinity;
    for (let z = 0; z < PERIOD; z += 0.05) camLow = Math.min(camLow, cameraPath(z, 2)[1]);
    for (const it of reef(seed).items) {
      assert.ok(it.height <= REEF_TOP, `${seed} reef height ${it.height}`);
      assert.ok(it.root[1] + REEF_TOP < camLow - 0.5, `${seed} reef top`);
    }
    // Medusae: worst-case lateral reach (bell, tentacle spread and sway at
    // maximum sway, current trail, drift) stays clear of the camera's x.
    for (let i = 0; i < NJ + NS; i++) {
      const j = jelly(seed, i);
      const reach =
        j.R * 1.05 + 0.25 * j.R + 0.25 * j.R * 1.5 + 0.05 * j.tentacle + DRIFT[0];
      const [lo, hi] = camXRange(j.anchor[2], DRIFT[2] + 0.5);
      const gap = Math.min(Math.abs(j.anchor[0] - lo), Math.abs(j.anchor[0] - hi));
      const inside = j.anchor[0] > lo && j.anchor[0] < hi;
      assert.ok(!inside && gap - reach > 0.5, `${seed} jelly ${i} clearance ${gap - reach}`);
    }
    for (let k = 0; k < NCH; k++) {
      const c = chain(seed, k);
      const half = c.length / 2 + 0.8;
      const reach = Math.abs(c.dir[0]) * half + 0.3 + 0.18;
      const [lo, hi] = camXRange(c.anchor[2], half * Math.abs(c.dir[2]) + 0.2);
      const gap = Math.min(Math.abs(c.anchor[0] - lo), Math.abs(c.anchor[0] - hi));
      assert.ok(gap - reach > 0.5, `${seed} chain ${k} clearance ${gap - reach}`);
    }
  }
});

test("shader and CPU agree on the reserved state layout and counts", () => {
  const src = scene.simulation.fragment + scene.particles.vertex + scene.geometry.vertex;
  assert.deepEqual(scene.simulation.size, [256, 256]);
  assert.ok(src.includes(`const int D_NJ = ${NJ}, D_NS = ${NS}`));
  assert.ok(scene.geometry.vertex.includes("dJelly(") && scene.simulation.fragment.includes("dJelly("));
  // Every loop is constant-capped.
  for (const m of src.matchAll(/for \(int (\w+) = 0; \1 < (\w+)/g))
    assert.ok(/^(\d+|D_[A-Z]+)$/.test(m[2]), m[0]);
});
