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
  landscapeGeometry,
  LANDSCAPE_VERTICES,
  SPORE_COUNT,
} from "../organic-landscape.mjs";

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

test("the landscape is a persistent full-resolution mesh with depth-tested spores", () => {
  const a = landscapeGeometry();
  assert.deepEqual(a, landscapeGeometry());
  assert.equal(a.length / 3, LANDSCAPE_VERTICES + SPORE_COUNT * 6);
  assert.ok(LANDSCAPE_VERTICES < 520000);
  assert.equal(mycelium.geometry.additiveFrom, LANDSCAPE_VERTICES);
  for (let i = 0; i < LANDSCAPE_VERTICES * 3; i += 3) {
    assert.ok(a[i] >= 0 && a[i] <= 1 && a[i + 1] >= 0 && a[i + 1] <= 1);
    assert.equal(a[i + 2], 0);
  }
  assert.match(mycelium.geometry.vertex, /meshHeight\(p\.xy/);
  assert.match(mycelium.geometry.fragment, /floor\(fract\(uv\)/);
  assert.equal(mycelium.simulation.filter, "linear");
  assert.match(mycelium.simulation.fragment, /texelFetch\(u_state/);
  assert.doesNotMatch(mycelium.simulation.fragment, /texture\(u_state/);
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
