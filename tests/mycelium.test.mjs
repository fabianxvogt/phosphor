import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { catalogLooks } from "../catalog.mjs";
import acid, { grayScottSimulation } from "../scene-acid.mjs";
import mycelium, { CHEMISTRY } from "../scene-mycelium.mjs";
import {
  growNetwork,
  myceliumMesh,
  cordRadius,
  shroomClearance,
  pathDistance,
  OPAQUE_VERTICES,
  STRIDE,
  KIND,
  PERIOD,
} from "../mycelium-geometry.mjs";

const sha = (text) => createHash("sha256").update(text).digest("hex");
const clips = (ids) =>
  ids.map((id) => {
    const index = mycelium.presets.findIndex(
      (p) => `mycelium:${p.name}` === id,
    );
    assert.ok(index >= 0, id);
    return { id, snapshot: presetSnapshot(mycelium, index) };
  });

test("sharing the Gray–Scott step leaves acid's shaders byte-identical", () => {
  // Hashes of scene-acid.mjs before the step became shared (commit 32ea153).
  assert.equal(
    sha(acid.simulation.fragment),
    "dc414a840bb2c72ff8f2daadb3db0567e4182cadd1eada85a94a4c9d26d1172e",
  );
  assert.equal(
    sha(acid.fragment),
    "87ec0e6298f8744adf153ef024376de47f20b9aa51613a0a751bd2f5a36de7ef",
  );
  assert.equal(grayScottSimulation(), acid.simulation.fragment);
  assert.equal(mycelium.simulation.continuity, acid.simulation.continuity);
  assert.deepEqual(mycelium.simulation.size, acid.simulation.size);
  assert.match(mycelium.simulation.fragment, /myceliumChemistry\(\)\.x/);
  assert.doesNotMatch(mycelium.simulation.fragment, /u_params\[5\], 0\., 5\./);
});

test("the Living Mycelium world is one continuous development of one field", () => {
  const world = defaultWorlds(catalogLooks(scenes).map((l) => l.id)).find(
    (w) => w.id === "mycelium",
  );
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Understory", "Tide", "City"],
  );
  const development = continuousDevelopment(
    clips(world.states.map((s) => s.look)).map(({ snapshot }) => ({
      snapshot,
    })),
    mycelium,
  );
  assert.deepEqual(development, {
    key: "development",
    min: 0,
    max: 2,
    positions: [0, 1, 2],
  });
  assert.ok(mycelium.presets.length >= 6);
  assert.deepEqual(mycelium.type, { key: "development", values: [0, 1, 2] });
  for (const preset of mycelium.presets)
    for (const field of mycelium.schema) {
      const value = preset.params[field.key];
      assert.ok(
        value >= field.min && value <= field.max,
        `${preset.name} ${field.key}`,
      );
    }
});

const net = growNetwork(211);

test("the hyphal network is deterministic per seed and independent of development", () => {
  const again = growNetwork(211);
  assert.equal(again.count, net.count);
  assert.deepEqual(
    Array.from(again.px.slice(0, net.count)),
    Array.from(net.px.slice(0, net.count)),
  );
  assert.notEqual(growNetwork(18).count, 0);
  // The geometry entry point only receives the seed.
  assert.equal(mycelium.geometry.create.length, 1);
  assert.ok(net.count > 20000, `nodes ${net.count}`);
  for (let i = 0; i < net.count; i++)
    assert.ok(
      Number.isFinite(net.px[i]) &&
        Number.isFinite(net.py[i]) &&
        Number.isFinite(net.pz[i]),
    );
});

test("anastomosis closes loops: the graph has a positive cycle rank", () => {
  // Union–find over growth-tree and fusion edges: rank = E − V + components.
  const parent = Int32Array.from({ length: net.count }, (_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  let edges = 0;
  const union = (a, b) => {
    edges++;
    parent[find(a)] = find(b);
  };
  for (let i = 0; i < net.count; i++)
    if (net.parent[i] >= 0) union(i, net.parent[i]);
  for (let f = 0; f < net.fusions.length; f += 2)
    union(net.fusions[f], net.fusions[f + 1]);
  let components = 0;
  for (let i = 0; i < net.count; i++) components += find(i) === i;
  const rank = edges - net.count + components;
  assert.ok(rank > 500, `cycle rank ${rank}`);
});

test("pulse distances are true shortest paths (Bellman optimality on every edge)", () => {
  const { dist, px, py, pz, delta } = net;
  const len = (a, b) =>
    Math.hypot(delta(px[a] - px[b]), delta(py[a] - py[b]), pz[a] - pz[b]);
  const check = (a, b) => {
    if (!Number.isFinite(dist[a]) && !Number.isFinite(dist[b])) return;
    const w = len(a, b);
    assert.ok(dist[a] <= dist[b] + w + 1e-6 && dist[b] <= dist[a] + w + 1e-6);
  };
  for (let i = 0; i < net.count; i++)
    if (net.parent[i] >= 0) check(i, net.parent[i]);
  for (let f = 0; f < net.fusions.length; f += 2)
    check(net.fusions[f], net.fusions[f + 1]);
  // The predecessor tree attains the distance exactly.
  for (let i = 0; i < net.count; i += 97)
    if (net.pred[i] >= 0)
      assert.ok(
        Math.abs(dist[i] - dist[net.pred[i]] - len(i, net.pred[i])) < 1e-5,
      );
});

test("cords obey Murray's law: r³ is conserved at every junction of the transport tree", () => {
  const children = new Map();
  for (let i = 0; i < net.count; i++)
    if (net.pred[i] >= 0) {
      if (!children.has(net.pred[i])) children.set(net.pred[i], []);
      children.get(net.pred[i]).push(i);
    }
  let junctions = 0;
  for (const [node, kids] of children) {
    if (kids.length < 2 || net.pred[node] < 0) continue;
    junctions++;
    // Flow into the parent edge = node demand + the children's flows.
    const inflow = net.flow[node];
    const out = kids.reduce((s, k) => s + net.flow[k], 0);
    assert.ok(inflow >= out - 1e-9);
    const r3 = cordRadius(inflow) ** 3,
      sum = kids.reduce((s, k) => s + cordRadius(net.flow[k]) ** 3, 0);
    assert.ok(r3 >= sum * (1 - 1e-9), `r³ ${r3} < Σ ${sum}`);
  }
  assert.ok(junctions > 100);
});

test("the camera never enters a mushroom, at any development, scale or altitude", () => {
  assert.ok(net.mushrooms.length >= 80, `mushrooms ${net.mushrooms.length}`);
  assert.ok(new Set(net.mushrooms.map((m) => m.site)).size >= 25);
  for (const seed of [211, 101, 149, 41, 18, 73])
    for (const m of growNetwork(seed).mushrooms)
      assert.ok(shroomClearance(m) > 0.032, `seed ${seed} clearance`);
  // Every stem stands off the camera line.
  for (const m of net.mushrooms) assert.ok(pathDistance(m.x, m.y) > 0.03);
});

test("the mesh: fixed opaque head, finite attributes, segments shorter than the wrap", () => {
  const { data, opaque, vertices } = myceliumMesh(211);
  assert.equal(opaque, OPAQUE_VERTICES);
  assert.equal(mycelium.geometry.additiveFrom, OPAQUE_VERTICES);
  assert.equal(data.length, vertices * STRIDE);
  assert.deepEqual(mycelium.geometry.attributes, [4, 4, 4, 4, 4, 4]);
  for (let i = 0; i < data.length; i++) assert.ok(Number.isFinite(data[i]));
  for (let v = opaque; v < vertices; v++) {
    const o = v * STRIDE;
    if (data[o + 23] >> 8 !== KIND.hypha) break;
    const seg = Math.hypot(data[o] - data[o + 4], data[o + 1] - data[o + 5]);
    assert.ok(seg < 0.03 && seg < PERIOD / 4);
  }
  // Larger clustered canopy, but only one mesh instance (no flat pools).
  assert.ok(vertices < 720000, `vertices ${vertices}`);
  assert.deepEqual(Array.from(mycelium.geometry.instances.create()), [0]);
});

test("rhythm ids, slots and the simulation contract are kept", () => {
  assert.deepEqual(
    mycelium.rhythm.map((r) => [r.id, r.slot]),
    [
      ["reaction-front", 0],
      ["chemical-band", 1],
      ["feed", 2],
      ["signal-relay", 3],
    ],
  );
  assert.equal(mycelium.simulation.filter, "linear");
  assert.match(mycelium.simulation.fragment, /texelFetch\(u_state/);
  assert.doesNotMatch(mycelium.simulation.fragment, /texture\(u_state/);
  assert.equal(mycelium.clocks.length, 4);
  for (const c of mycelium.clocks) assert.ok(c.period > 0);
});

test("signal relay has three full authored styles and uses the complete slot-3 contract", () => {
  const effect = mycelium.rhythm.find((r) => r.slot === 3);
  for (const style of ["restrained", "driving", "accented"]) {
    const loop = effect.styles[style];
    const hits = loop.steps.flatMap((s, i) => (s > 0 ? [i] : []));
    assert.ok(hits.length >= 2, style);
    for (const [i, hit] of hits.entries()) {
      const next =
        hits[(i + 1) % hits.length] + (i === hits.length - 1 ? loop.length : 0);
      assert.ok(
        loop.duration < (next - hit) / loop.division,
        `${style} settles`,
      );
    }
    assert.ok(
      loop.steps.some((s, i) => s > 0 && i % loop.division !== 0),
      `${style} offbeat`,
    );
    assert.ok(loop.duration >= 1.8 && loop.strength <= 1);
  }
  assert.deepEqual(Object.values(mycelium.rhythmStyles), [
    "Dormant threads",
    "Root signals",
    "Spore chorus",
  ]);
  for (const name of ["u_rhythm.w", "u_rhythmHit.w", "u_rhythmCount.w"])
    assert.ok(mycelium.geometry.fragment.includes(name), name);
  assert.match(mycelium.geometry.vertex, /mySignal\(a3.x\+travel\)/);
  assert.match(mycelium.geometry.vertex, /s\.h\*w/);
  assert.match(mycelium.geometry.vertex, /exp\(-max\(0\.,age\)\/\.23\)/);
});

test("r4 keeps a floor-facing continuous crane and energy-dependent fine branching", () => {
  const shader = mycelium.geometry.vertex;
  assert.match(shader, /pitch=mix\(-\.53,-\.42,crane\)/);
  assert.match(shader, /h=mix\(\.17,\.14,crane\)/);
  assert.match(shader, /smoothstep\(hh-\.12,hh\+\.12,\.24\+\.8\*lv\)/);
  const tip = mycelium.rhythm[0].styles.driving;
  assert.equal(tip.length / tip.division, 3, "three beats against four");
  for (const [style, minimum] of [
    ["driving", 6],
    ["accented", 8],
  ]) {
    const density = mycelium.rhythm.reduce((total, effect) => {
      const loop = effect.styles[style];
      return (
        total +
        (loop.steps.filter((x) => x > 0).length * 4 * loop.division) /
          loop.length
      );
    }, 0);
    assert.ok(density >= minimum, `${style}: ${density}`);
  }
});

test("development chemistry stays inside acid's stability clamps", () => {
  assert.equal(CHEMISTRY.length, 3);
  for (const [feed, kill, diffusion] of CHEMISTRY) {
    assert.ok(feed >= 0.024 && feed <= 0.055);
    assert.ok(kill >= 0.05 && kill <= 0.067);
    assert.ok(diffusion >= 0.65 && diffusion <= 1);
  }
});

test("saved sets with the earlier acid-based Living Mycelium upgrade; edited ones stay", () => {
  const previous = {
    id: "mycelium",
    name: "Living Mycelium",
    description:
      "Quiet filaments become tidal membranes and luminous networks.",
    states: [
      {
        name: "Understory",
        look: "acid:Signal Understory",
        params: { feed: 0.029, kill: 0.057, diffusion: 0.9, speed: 0.5 },
      },
      {
        name: "Tide",
        look: "acid:Tidal Membrane",
        params: { feed: 0.029, kill: 0.057, diffusion: 0.9, speed: 0.7 },
      },
      {
        name: "City",
        look: "acid:Mycelial City",
        params: { feed: 0.029, kill: 0.057, diffusion: 0.9, speed: 1 },
      },
    ],
  };
  const worldIndex = initialShowSet(scenes).worlds.findIndex(
    (w) => w.id === "mycelium",
  );
  const current = initialShowSet(scenes).worlds.find(
    (w) => w.id === "mycelium",
  );
  for (const old of [
    previous,
    { ...previous, states: previous.states.map(({ params, ...s }) => s) },
  ]) {
    const set = initialShowSet(scenes);
    set.worlds[worldIndex] = structuredClone(old);
    assert.deepEqual(
      validateShowSet(set, scenes).worlds.find((w) => w.id === "mycelium"),
      current,
    );
    // An untouched prefix of only the old world still gains the newer worlds.
    set.worlds = [structuredClone(old)];
    const upgraded = validateShowSet(set, scenes).worlds;
    assert.deepEqual(
      upgraded.find((w) => w.id === "mycelium"),
      current,
    );
    assert.equal(upgraded.length, initialShowSet(scenes).worlds.length);
  }
  const set = initialShowSet(scenes);
  set.worlds[worldIndex] = {
    ...structuredClone(previous),
    name: "My mycelium",
  };
  assert.deepEqual(
    validateShowSet(set, scenes).worlds.find((w) => w.id === "mycelium").states,
    previous.states,
  );
});

// CPU mirror of the shared Gray–Scott step (texel units, no brush or audio)
// with the scene's source colonies and spore rain. Small grid for speed.
function field(width, height) {
  const u = new Float32Array(width * height).fill(1);
  const v = new Float32Array(width * height);
  return {
    width,
    height,
    u,
    v,
    nu: new Float32Array(u.length),
    nv: new Float32Array(u.length),
    tick: 0,
  };
}
function disc(f, cx, cy, radius, amount) {
  const { width, height } = f;
  for (let dy = -radius - 1; dy <= radius + 1; dy++)
    for (let dx = -radius - 1; dx <= radius + 1; dx++) {
      const d = Math.hypot(dx, dy);
      const mask = amount(d);
      if (mask <= 0) continue;
      const i =
        ((cy + dy + height) % height) * width + ((cx + dx + width) % width);
      f.u[i] += (0.48 - f.u[i]) * mask;
      f.v[i] += (0.29 - f.v[i]) * mask;
    }
}
let rng = 1;
const random = () => (rng = (rng * 1103515245 + 12345) >>> 0) / 2 ** 32;
function step(f, [feed, kill, du], speed = 0.72, injection = 0.35) {
  const { width: W, height: H, u, v, nu, nv } = f;
  const h = 0.45 * speed,
    dv = du * 0.5;
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
        g = ym + xp,
        k = yp + xm,
        l = yp + xp;
      const lu =
        -u[i] +
        0.2 * (u[a] + u[b] + u[c] + u[d]) +
        0.05 * (u[e] + u[g] + u[k] + u[l]);
      const lv =
        -v[i] +
        0.2 * (v[a] + v[b] + v[c] + v[d]) +
        0.05 * (v[e] + v[g] + v[k] + v[l]);
      const r = u[i] * v[i] * v[i];
      nu[i] = Math.min(
        1,
        Math.max(0, u[i] + h * (du * lu - r + feed * (1 - u[i]))),
      );
      nv[i] = Math.min(
        1,
        Math.max(0, v[i] + h * (dv * lv + r - (feed + kill) * v[i])),
      );
    }
  }
  [f.u, f.nu, f.v, f.nv] = [nu, u, nv, v];
  for (const [sx, sy] of [
    [0.3, 0.3],
    [0.7, 0.4],
    [0.5, 0.75],
  ])
    disc(
      f,
      Math.round(sx * W),
      Math.round(sy * H),
      4,
      (d) =>
        (1 - Math.min(1, Math.max(0, (d - 1.7) / 2.9))) * injection * h * 0.025,
    );
  // Spore rain: three discs every 960 steps, only where the 12-texel ring is dark.
  if (f.tick % 960 < 8) {
    if (f.tick % 960 === 0)
      f.spores = [0, 1, 2].map(() => [
        Math.floor(random() * W),
        Math.floor(random() * H),
      ]);
    for (const [sx, sy] of f.spores) {
      let around = 0;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const x = (sx + Math.round(Math.cos(a) * 12) + W) % W,
          y = (sy + Math.round(Math.sin(a) * 12) + H) % H;
        around = Math.max(around, f.v[y * W + x]);
      }
      const dark = 1 - Math.min(1, Math.max(0, (around - 0.02) / 0.04));
      disc(
        f,
        sx,
        sy,
        4,
        (d) => (1 - Math.min(1, Math.max(0, (d - 2.3) / 1.5))) * dark,
      );
    }
  }
  f.tick++;
}
const coverage = (f) => f.v.reduce((n, x) => n + (x > 0.1), 0) / f.v.length;
const run = (f, chemistry, seconds, low = { value: 1 }) => {
  for (let i = 0; i < seconds * 480; i++) {
    step(f, chemistry);
    if (i % 240 === 0) low.value = Math.min(low.value, coverage(f));
  }
  return coverage(f);
};

test("abrupt development jumps never extinguish the field; an empty field regrows", () => {
  rng = 7;
  const f = field(96, 64);
  disc(f, 48, 32, 6, (d) => (d < 6 ? 1 : 0));
  const [U, T, C] = CHEMISTRY;
  run(f, U, 20);
  const low = { value: 1 };
  // Every ordered pair of states, each as an instant jump.
  for (const chemistry of [T, U, C, T, C, U]) {
    const after = run(f, chemistry, 8, low);
    assert.ok(after > 0.2, `coverage ${after}`);
  }
  assert.ok(low.value > 0.03, `minimum coverage ${low.value}`);
  // A fully extinct field regrows (spore rain and source colonies).
  const empty = field(96, 64);
  assert.ok(run(empty, U, 30) > 0.1);
});
