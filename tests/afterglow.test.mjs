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
import afterglow, { CHEMISTRY, crownEnvelope } from "../scene-afterglow.mjs";

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
  const encode = x => [Math.floor(x/256)/255, (x%256)/255];
  const decode = a => (256*a[0]+a[1])*255/65535;
  for (let i=0;i<1000;i++) {
    const a=(i*7919)%65536,b=(i*15401+255)%65536,t=(i%97)/97;
    const aa=encode(a),bb=encode(b);
    const filtered=decode(aa.map((x,j)=>x+(bb[j]-x)*t));
    assert.ok(Math.abs(filtered-((1-t)*a+t*b)/65535)<1e-15);
  }
});

test("calyx envelope has exact six-fold symmetry and continuous bounded development", () => {
  for (let i = 0; i < 200; i++) {
    const angle = i * .17, r = i / 200 * .7;
    const x = r * Math.cos(angle), y = r * Math.sin(angle);
    for (let k = 0; k < 6; k++) {
      const a = angle + k * Math.PI / 3;
      assert.ok(Math.abs(crownEnvelope(x,y,1) - crownEnvelope(r*Math.cos(a),r*Math.sin(a),1)) < 1e-12);
    }
    let previous = 1;
    for (let k = 0; k <= 200; k++) {
      const mask = crownEnvelope(x,y,k/200);
      assert.ok(mask >= 0 && mask <= previous + 1e-12);
      previous = mask;
    }
  }
  assert.equal(crownEnvelope(0,0,1),1);
  assert.equal(crownEnvelope(.551,0,1),0);
  // Algebraic cos(6 theta) avoids trigonometry in every march sample.
  for (let i = 0; i < 100; i++) {
    const a = i*.2, x = Math.cos(a), y = Math.sin(a);
    const c3 = x*(x*x-3*y*y);
    assert.ok(Math.abs(2*c3*c3-1-Math.cos(6*a)) < 1e-13);
  }
  assert.match(afterglow.fragment, /if \(bloom <= 0\.\) break/);
  assert.match(afterglow.fragment, /gardenHeight\(bloomAt/);
  assert.match(afterglow.fragment, /vec2 localXY = hit.xy - focus/);
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
  const current = initialShowSet(scenes).worlds[1];
  assert.equal(current.states[0].look, "afterglow:Glowing Roots");
  for (const old of [
    previous,
    { ...previous, states: previous.states.map(({ params, ...s }) => s) },
  ]) {
    const set = initialShowSet(scenes);
    set.worlds[1] = structuredClone(old);
    assert.deepEqual(validateShowSet(set, scenes).worlds[1], current);
  }
  const set = initialShowSet(scenes);
  set.worlds[1] = { ...structuredClone(previous), name: "My garden" };
  assert.deepEqual(
    validateShowSet(set, scenes).worlds[1].states,
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
