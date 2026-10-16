import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import {
  continuousDevelopment,
  defaultWorlds,
  canCarryTraces,
} from "../worlds.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { catalogLooks } from "../catalog.mjs";
import evolution, { morphogenSimulation } from "../scene-evolution.mjs";
import { defaultPattern, validatePattern } from "../rhythm.mjs";
import afterglow, {
  CHEMISTRY,
  CELLS,
  FIELD,
  FAR_IMAGES,
  ADDITIVE_FROM,
  FLOWER_VERTICES,
  DETAIL_VERTICES,
  SIMPLE_VERTICES,
  TAIL_VERTICES,
  flowerTemplate,
  flowerInstances,
  gardenEye,
} from "../scene-afterglow.mjs";

const sha = (text) => createHash("sha256").update(text).digest("hex");

test("sharing the morphogen step leaves evolution's shaders byte-identical", () => {
  // Hashes of scene-evolution.mjs before the step became shared (c8d7295).
  assert.equal(
    sha(evolution.simulation.fragment),
    "ec7225f78b62e2ed947cfd005c66e4d9e2fbd72591f444c9d3020f8ad3b50d6d",
  );
  assert.equal(
    sha(evolution.fragment),
    "8860c25caa0d0340774d317058a996b079d6d14a4ea670855a15904808b44f2d",
  );
  assert.equal(morphogenSimulation(), evolution.simulation.fragment);
  assert.match(afterglow.simulation.fragment, /gardenChemistry\(\)\.x/);
  assert.equal(canCarryTraces(evolution, afterglow), true);
  assert.equal(
    canCarryTraces(
      afterglow,
      scenes.find((s) => s.id === "acid"),
    ),
    true,
  );
});

test("Afterglow Garden is one continuous development of one field", () => {
  const world = defaultWorlds(catalogLooks(scenes).map((l) => l.id)).find(
    (w) => w.id === "garden",
  );
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Roots", "Petals", "Bloom"],
  );
  const snapshots = world.states.map((s) => {
    const index = afterglow.presets.findIndex(
      (p) => `afterglow:${p.name}` === s.look,
    );
    assert.ok(index >= 0, s.look);
    return { snapshot: presetSnapshot(afterglow, index) };
  });
  assert.deepEqual(continuousDevelopment(snapshots, afterglow), {
    key: "development",
    min: 0,
    max: 2,
    positions: [0, 1, 2],
  });
  assert.ok(afterglow.presets.length >= 6);
  for (const preset of afterglow.presets)
    for (const field of afterglow.schema) {
      const value = preset.params[field.key];
      assert.ok(
        value >= field.min && value <= field.max,
        `${preset.name} ${field.key}`,
      );
    }
});

test("linear visual filtering decodes exactly; simulation retains explicit nearest stencils", () => {
  assert.equal(afterglow.simulation.filter, "linear");
  assert.match(afterglow.simulation.fragment, /texelFetch\(u_state/);
  assert.doesNotMatch(afterglow.simulation.fragment, /texture\(u_state/);
  assert.match(afterglow.simulation.fragment, /gardenLaplacian\(v_uv\)/);
  const encode = (x) => [Math.floor(x / 256) / 255, (x % 256) / 255];
  const decode = (a) => ((256 * a[0] + a[1]) * 255) / 65535;
  for (let i = 0; i < 1000; i++) {
    const a = (i * 7919) % 65536,
      b = (i * 15401 + 255) % 65536,
      t = (i % 97) / 97;
    const aa = encode(a),
      bb = encode(b);
    const filtered = decode(aa.map((x, j) => x + (bb[j] - x) * t));
    assert.ok(Math.abs(filtered - ((1 - t) * a + t * b) / 65535) < 1e-15);
  }
});

test("flower template: detailed, simple and additive parts in a fixed order", () => {
  const template = flowerTemplate();
  assert.equal(template.length / 3, FLOWER_VERTICES);
  assert.equal(afterglow.geometry.additiveFrom, ADDITIVE_FROM);
  assert.equal(ADDITIVE_FROM, DETAIL_VERTICES + SIMPLE_VERTICES);
  assert.equal(FLOWER_VERTICES - ADDITIVE_FROM, TAIL_VERTICES);
  assert.ok(template.every(Number.isFinite));
  const parts = [];
  for (let i = 0; i < template.length; i += 3) parts.push(template[i]);
  // Opaque parts (< 30) strictly precede the additive halo and pollen.
  assert.ok(parts.slice(0, ADDITIVE_FROM).every((p) => p < 30));
  assert.ok(parts.slice(ADDITIVE_FROM).every((p) => p >= 30));
  // One instance per spot-finder cell; the far images never include the
  // detailed square itself and stay unique.
  assert.equal(flowerInstances().length / 2, CELLS * CELLS);
  assert.equal(afterglow.precompute.size[0], CELLS);
  assert.equal(afterglow.precompute.size[1], 3 * CELLS);
  assert.equal(FIELD % CELLS, 0);
  assert.ok(!FAR_IMAGES.some(([x, y]) => x === 0 && y === 0));
  assert.equal(new Set(FAR_IMAGES.map(String)).size, FAR_IMAGES.length);
  // The no-float fallback still grows concentration-driven lanterns.
  assert.match(afterglow.geometry.vertex, /#else\n  \/\/ No float target/);
  assert.match(afterglow.geometry.vertex, /vec4 spot = vec4\(at, peak \* \.55/);
  // Development is a uniform, never an input to either identity buffer.
  assert.deepEqual(
    afterglow.geometry.create(5607),
    afterglow.geometry.create(5607),
  );
  assert.deepEqual(
    afterglow.geometry.instances.create(5607),
    flowerInstances(),
  );
  assert.doesNotMatch(
    afterglow.precompute.fragment.split("void main() {")[1],
    /agDev|agGrow|agBloom|u_params/,
  );
  assert.match(afterglow.simulation.fragment, /if \(u_rhythmHit.z > 0\.\)/);
  assert.doesNotMatch(afterglow.simulation.fragment, /wilt|phase < 180u/);
});

test("camera rises within a bounded range so a one-bar drop is a gentle crane", () => {
  let previous = gardenEye(0);
  for (let d = 0.01; d <= 2.0001; d += 0.01) {
    const eye = gardenEye(d);
    assert.ok(eye.z >= previous.z - 1e-12, "eye height is monotone");
    assert.ok(Math.abs(eye.z - previous.z) < 0.002, "no jump per 0.01");
    previous = eye;
  }
  const low = gardenEye(0),
    high = gardenEye(2);
  assert.ok(high.z / low.z <= 2.2);
  assert.ok(Math.abs(high.pitch - low.pitch) <= (10 * Math.PI) / 180);
  for (const altitude of [0.7, 1.4])
    assert.ok(gardenEye(0, altitude).z > 0.034, "never in the soil");
  // The shader mirrors the same numbers.
  assert.match(
    afterglow.fragment,
    /\.12 \+ \.06 \* agSmooth\(0\., 1\., d\) \+ \.08 \* agSmooth\(1\., 2\., d\)/,
  );
});

test("saved sets with the earlier evolution-based Afterglow Garden upgrade; edited ones stay", () => {
  const chemistry = { feed: 0.029, prune: 0.057, spread: 0.5 };
  const previous = {
    id: "garden",
    name: "Afterglow Garden",
    description:
      "An inherited network opens into relief, petals and glowing crowns.",
    states: [
      { name: "Roots", look: "evolution:Quiet Herbarium", params: chemistry },
      { name: "Petals", look: "evolution:Pearl Nursery", params: chemistry },
      { name: "Bloom", look: "evolution:Coral Orchard", params: chemistry },
    ],
  };
  const worldIndex = initialShowSet(scenes).worlds.findIndex(
    (w) => w.id === "garden",
  );
  const current = initialShowSet(scenes).worlds.find((w) => w.id === "garden");
  assert.equal(current.states[0].look, "afterglow:Glowing Roots");
  for (const old of [
    previous,
    { ...previous, states: previous.states.map(({ params, ...s }) => s) },
    {
      id: "garden",
      name: "Afterglow Garden",
      description:
        "A low flight over glowing roots rises above petals into crowns of light. Play every stage in between.",
      states: [
        { name: "Roots", look: "afterglow:Glowing Roots" },
        { name: "Petals", look: "afterglow:Opening Petals" },
        { name: "Bloom", look: "afterglow:Crowns at Dusk" },
      ],
    },
  ]) {
    const set = initialShowSet(scenes);
    set.worlds[worldIndex] = structuredClone(old);
    assert.deepEqual(
      validateShowSet(set, scenes).worlds.find((w) => w.id === "garden"),
      current,
    );
  }
  const set = initialShowSet(scenes);
  set.worlds[worldIndex] = { ...structuredClone(previous), name: "My garden" };
  assert.deepEqual(
    validateShowSet(set, scenes).worlds.find((w) => w.id === "garden").states,
    previous.states,
  );
});

// CPU mirror of the shared morphogen step (Du = 1, Dv = spread, h = .65 ·
// growth, two steps per tick) with the scene's spore rain, on a small torus.
function garden(W, H) {
  return {
    W,
    H,
    u: new Float32Array(W * H).fill(1),
    v: new Float32Array(W * H),
    nu: new Float32Array(W * H),
    nv: new Float32Array(W * H),
    tick: 0,
    spores: [],
  };
}
let rng = 11;
const random = () => (rng = (rng * 1103515245 + 12345) >>> 0) / 2 ** 32;
function bud(g, cx, cy, radius, weight = 1) {
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.hypot(dx, dy) > radius - 0.5) continue;
      const i = ((cy + dy + g.H) % g.H) * g.W + ((cx + dx + g.W) % g.W);
      g.u[i] += (0.5 - g.u[i]) * weight;
      g.v[i] += (0.26 - g.v[i]) * weight;
    }
}
function step(g, [F, K, Dv], growth = 1) {
  const { W, H, u, v, nu, nv } = g;
  const h = 0.65 * growth;
  for (let y = 0; y < H; y++) {
    const ym = ((y + H - 1) % H) * W,
      y0 = y * W,
      yp = ((y + 1) % H) * W;
    for (let x = 0; x < W; x++) {
      const xm = (x + W - 1) % W,
        xp = (x + 1) % W,
        i = y0 + x;
      const a = y0 + xm,
        b = y0 + xp,
        c = ym + x,
        d = yp + x;
      const e = ym + xm,
        f = ym + xp,
        k = yp + xm,
        l = yp + xp;
      const lu =
        -u[i] +
        0.2 * (u[a] + u[b] + u[c] + u[d]) +
        0.05 * (u[e] + u[f] + u[k] + u[l]);
      const lv =
        -v[i] +
        0.2 * (v[a] + v[b] + v[c] + v[d]) +
        0.05 * (v[e] + v[f] + v[k] + v[l]);
      const r = u[i] * v[i] * v[i];
      nu[i] = u[i] + h * (lu - r + F * (1 - u[i]));
      nv[i] = v[i] + h * (Dv * lv + r - (F + K) * v[i]);
    }
  }
  [g.u, g.nu, g.v, g.nv] = [nu, u, nv, v];
  if (g.tick % 240 < 2) {
    if (g.tick % 240 === 0)
      g.spores = [0, 1, 2].map(() => [
        Math.floor(random() * W),
        Math.floor(random() * H),
      ]);
    for (const [sx, sy] of g.spores) {
      let around = 0;
      for (let q = 0; q < 8; q++) {
        const angle = (q * Math.PI) / 4;
        const x = (sx + Math.round(Math.cos(angle) * 12) + W) % W;
        const y = (sy + Math.round(Math.sin(angle) * 12) + H) % H;
        around = Math.max(around, g.v[y * W + x]);
      }
      bud(g, sx, sy, 3, 1 - Math.min(1, Math.max(0, (around - 0.02) / 0.04)));
    }
  }
  g.tick++;
}
const coverage = (g) => g.v.reduce((n, x) => n + (x > 0.1), 0) / g.v.length;
function run(g, chemistry, seconds, low) {
  for (let i = 0; i < seconds * 120; i++) {
    step(g, chemistry);
    if (low && i % 60 === 0) low.value = Math.min(low.value, coverage(g));
  }
  return coverage(g);
}

test("abrupt development jumps keep the garden alive; an empty garden regrows", () => {
  const [R, P, B] = CHEMISTRY;
  for (const [W, H] of [
    [96, 96],
    [128, 80],
  ]) {
    const g = garden(W, H);
    for (let y = 8; y < H; y += 32)
      for (let x = 8; x < W; x += 32) bud(g, x, y, 5);
    run(g, R, 40);
    const low = { value: 1 };
    // Every ordered pair of states, each as an instant jump.
    for (const chemistry of [P, R, B, P, B, R]) {
      const after = run(g, chemistry, 15, low);
      assert.ok(after > 0.3, `${W}x${H} coverage ${after}`);
    }
    assert.ok(low.value > 0.25, `${W}x${H} minimum coverage ${low.value}`);
  }
  const empty = garden(96, 96);
  assert.ok(run(empty, B, 40) > 0.2);
});

// CPU mirror of the precompute spot finder: 2×2 box means on the half-texel
// lattice (one bilinear tap), cell argmax, strict local maximum within r = 5
// (ties broken towards lower y, then lower x).
function boxField(g) {
  const { W, H, v } = g;
  const at = (x, y) => v[(((y % H) + H) % H) * W + (((x % W) + W) % W)];
  return (x, y) =>
    (at(x - 1, y - 1) + at(x, y - 1) + at(x - 1, y) + at(x, y)) / 4;
}
function isMaximum(S, x, y) {
  const s = S(x, y);
  if (s <= 0.06) return false;
  for (let dy = -5; dy <= 5; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      if ((!dx && !dy) || dx * dx + dy * dy > 25) continue;
      const q = S(x + dx, y + dy);
      if (q > s || (q === s && (dy < 0 || (dy === 0 && dx < 0)))) return false;
    }
  return true;
}
function findSpots(g, cell = 6) {
  const S = boxField(g),
    spots = [];
  for (let cy = 0; cy < g.H / cell; cy++)
    for (let cx = 0; cx < g.W / cell; cx++) {
      let best = -1,
        at = null;
      for (let j = 0; j < cell; j++)
        for (let i = 0; i < cell; i++) {
          const s = S(cx * cell + i, cy * cell + j);
          if (s > best) [best, at] = [s, [cx * cell + i, cy * cell + j]];
        }
      if (isMaximum(S, ...at)) spots.push(at);
    }
  return spots;
}
function elongation(g, [x, y]) {
  const S = boxField(g),
    s = S(x, y);
  const hxx = S(x + 3, y) + S(x - 3, y) - 2 * s,
    hyy = S(x, y + 3) + S(x, y - 3) - 2 * s;
  const hxy =
    (S(x + 3, y + 3) + S(x - 3, y - 3) - S(x + 3, y - 3) - S(x - 3, y + 3)) / 4;
  const m = (hxx + hyy) / 2,
    q = Math.hypot((hxx - hyy) / 2, hxy);
  const l1 = m - q,
    l2 = m + q;
  return l1 < 0
    ? Math.max(0, Math.min(1, 1 - Math.abs(Math.min(l2, 0)) / Math.abs(l1)))
    : 1;
}

test("the spot finder sees every flower exactly once, owned by one cell", () => {
  const g = garden(96, 96);
  for (let y = 8; y < 96; y += 24)
    for (let x = 8; x < 96; x += 24) bud(g, x, y, 5);
  run(g, CHEMISTRY[2], 40);
  const S = boxField(g);
  const global = [];
  for (let y = 0; y < 96; y++)
    for (let x = 0; x < 96; x++)
      if (isMaximum(S, x, y)) global.push(`${x},${y}`);
  const found = findSpots(g).map(String);
  assert.ok(found.length > 20, `flowers ${found.length}`);
  assert.deepEqual([...found].sort(), [...global].sort());
  assert.equal(new Set(found).size, found.length);
});

test("a cleared Bloom patch refills by spot division", () => {
  const g = garden(96, 96);
  for (let y = 8; y < 96; y += 24)
    for (let x = 8; x < 96; x += 24) bud(g, x, y, 5);
  run(g, CHEMISTRY[2], 50);
  const [cx, cy, R] = [48, 48, 18];
  const near = (spots) =>
    spots.filter(([x, y]) => Math.hypot(x - cx, y - cy) < R + 6).length;
  const before = near(findSpots(g));
  // External damage robustness experiment (not an autonomous shader event):
  // remove a disk, then plant a seed and let the continuing chemistry refill it.
  for (let k = 0; k < 180; k++) {
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++) {
        const d = Math.hypot(x - cx, y - cy);
        const w = 1 - smooth(14, 20, d);
        const i = y * 96 + x;
        g.u[i] += (1 - g.u[i]) * 0.03 * w;
        g.v[i] += (0 - g.v[i]) * 0.03 * w;
      }
    step(g, CHEMISTRY[2]);
  }
  bud(g, cx, cy, 4);
  assert.ok(near(findSpots(g)) < before, "the patch wilted");
  let dividing = 0;
  for (let s = 0; s < 14; s++) {
    run(g, CHEMISTRY[2], 1);
    dividing += findSpots(g).filter(
      (p) =>
        Math.hypot(p[0] - cx, p[1] - cy) < R + 8 &&
        elongation(g, p) > 0.5 &&
        elongation(g, p) < 0.85,
    ).length;
  }
  assert.ok(dividing > 0, "pinching spots appear while the patch refills");
  assert.ok(
    near(findSpots(g)) >= before - 1,
    `refilled ${near(findSpots(g))} / ${before}`,
  );
});
test("slot-3 pollen signature has three authored, distinct, bounded loops", () => {
  const signature = afterglow.rhythm.find((effect) => effect.slot === 3);
  assert.equal(signature.id, "pollen-rising");
  const placements = [];
  for (const style of ["restrained", "driving", "accented"]) {
    const pattern = defaultPattern(afterglow.rhythm, style);
    assert.deepEqual(validatePattern(pattern, afterglow.rhythm), pattern);
    const track = pattern.tracks.find((track) => track.effect === signature.id);
    assert.ok(track.steps.filter((value) => value > 0).length >= 2);
    assert.ok(track.duration >= 2.5 && track.duration <= 3);
    const hits = track.steps.flatMap((value, i) => (value > 0 ? [i] : []));
    for (let i = 0; i < hits.length; i++) {
      const next =
        hits[(i + 1) % hits.length] +
        (i === hits.length - 1 ? track.length : 0);
      assert.ok(track.duration < (next - hits[i]) / track.division);
    }
    placements.push(JSON.stringify([track.division, track.steps]));
  }
  assert.equal(new Set(placements).size, 3);
  for (const uniform of ["u_rhythm.w", "u_rhythmHit.w", "u_rhythmCount.w"])
    assert.ok(afterglow.geometry.vertex.includes(uniform), uniform);
  assert.match(afterglow.geometry.vertex, /part >= 33/);
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const pattern = defaultPattern(afterglow.rhythm, style);
    const density = pattern.tracks.reduce(
      (sum, track) =>
        sum +
        (track.steps.filter((x) => x > 0).length * track.division * 4) /
          track.length,
      0,
    );
    assert.ok(density >= minimum, `${style}: ${density} hits/bar`);
  }
});

test("r4 meadow keeps opaque grass, local motes and independent sap/flex signals", () => {
  const parts = [];
  const template = flowerTemplate();
  for (let i = 0; i < template.length; i += 3) parts.push(template[i]);
  for (const grass of [22, 23]) {
    assert.equal(parts.filter((p) => p === grass).length, 18);
    assert.ok(parts.indexOf(grass) < ADDITIVE_FROM);
  }
  for (let mote = 33; mote < 45; mote++)
    assert.equal(parts.filter((p) => p === mote).length, 6);
  assert.match(
    afterglow.geometry.vertex,
    /v_signal = vec3\(agPulse\(far\), pollen, cohort\)/,
  );
  assert.match(
    afterglow.geometry.fragment,
    /u_primary \* v_signal.x \* \(margin/,
  );
  assert.match(afterglow.geometry.fragment, /u_accent \* v_signal.y/);
  assert.match(afterglow.fragment, /packetRing/);
  assert.doesNotMatch(afterglow.fragment, /vec3 mirrored|float fresnel/);
  // Conservative angular projection of a radius .21 patch at .88 distance,
  // including its lateral excursion: < one third of a 16:9 review frame.
  const width = (2 * 0.21 * 1.15) / Math.sqrt(0.88 ** 2 - 0.21 ** 2) / (16 / 9);
  assert.ok(width < 1 / 3, `patch width ${width}`);
  assert.match(afterglow.geometry.vertex, /agSmooth\(\.09, \.21/);
});

function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
