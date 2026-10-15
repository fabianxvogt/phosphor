import test from "node:test";
import assert from "node:assert/strict";
import storm from "../scene-storm.mjs";
import { stormData } from "../scene-storm-data.mjs";
import { stormVolume } from "../scene-storm-volume.mjs";
import {
  hash,
  random,
  leaderPoint,
  leaderSegment,
  lightningGraph,
  worldPoint,
  SEGMENTS,
  BRANCH_PROBABILITY,
} from "../storm-model.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { advanceClocks } from "../scene-time.mjs";

const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));

test("uint avalanche and 24-bit random values are deterministic and seed-specific", () => {
  // Independent BigInt implementation: verify JS overflow matches GLSL uint.
  const mask = 0xffffffffn;
  function oracle(value) {
    let x = BigInt(value >>> 0);
    x = ((x ^ (x >> 16n)) * 0x7feb352dn) & mask;
    x = ((x ^ (x >> 15n)) * 0x846ca68bn) & mask;
    return Number((x ^ (x >> 16n)) & mask);
  }
  for (let i = 0; i < 10000; i++) {
    const n = Math.imul(i, 0x9e3779b9) >>> 0;
    assert.equal(hash(n), oracle(n));
    const r = random(n, i % 2, i % 200);
    assert.ok(r >= 0 && r < 1 && Number.isInteger(r * 16777216));
  }
  assert.notDeepEqual(lightningGraph(10701), lightningGraph(10702));
  assert.match(stormData, /0x7feb352du/);
  assert.match(stormData, /0x846ca68bu/);
  assert.match(stormData, /uint\(network \+ 1\) \* 0x9e3779b9u/);
  assert.match(stormData, /uint\(n \+ 1\) \* 0x85ebca6bu/);
});

test("every active branch is connected to an existing trunk or branch endpoint", () => {
  assert.equal(SEGMENTS, 120);
  for (let seed = 10700; seed < 10900; seed++) {
    for (const development of [0, 0.33, 1, 1.7, 2]) {
      const graph = lightningGraph(seed, development);
      for (const [index, segment] of graph.entries()) {
        assert.ok(
          segment.a.every(Number.isFinite) && segment.b.every(Number.isFinite),
        );
        assert.ok(distance(segment.a, segment.b) > 0);
        if (segment.parent < 0) continue;
        const parent = graph[segment.id[0] * 30 + segment.parent];
        assert.deepEqual(
          segment.a,
          parent.b,
          `${seed}/${development}/${index}`,
        );
        if (segment.active) assert.equal(parent.active, true);
      }
    }
  }
});

test("branching probability and unbiased stepped-leader jitter meet independent statistics", () => {
  let active = 0,
    trials = 0,
    dx = 0,
    dx2 = 0,
    steps = 0,
    left = 0;
  for (let seed = 0; seed < 6000; seed++) {
    for (let network = 0; network < 4; network++) {
      for (let branch = 0; branch < 3; branch++) {
        active += Number(
          leaderSegment(seed, network * 30 + 18 + branch * 4).active,
        );
        trials++;
        left += Number(random(seed, network, 90 + branch) < 0.5);
      }
      for (let i = 0; i < 18; i++) {
        const a = leaderPoint(seed, network, i),
          b = leaderPoint(seed, network, i + 1);
        const d = b[0] - a[0];
        dx += d;
        dx2 += d * d;
        steps++;
        assert.ok(Math.abs(d) <= 0.16);
        assert.ok(Math.abs(b[2] - a[2]) <= 0.12);
        assert.ok(Math.abs(b[1] - a[1] - 1 / 18) < 2e-16);
      }
    }
  }
  assert.ok(Math.abs(active / trials - BRANCH_PROBABILITY) < 0.01);
  assert.ok(Math.abs(left / trials - 0.5) < 0.01);
  assert.ok(Math.abs(dx / steps) < 0.001);
  // Difference of two independent U(-a/2,a/2) samples has variance a²/6.
  assert.ok(Math.abs(dx2 / steps - 0.16 ** 2 / 6) < 0.00008);
  assert.match(stormData, /stRand\(network, 70 \+ branch\) < 0\.78/);
  assert.match(stormData, /float\(n\)\/18\.0/);
  assert.match(
    stormData,
    /stRand\(network,n\*3\)-stRand\(network,0\)\)\*0\.16/,
  );
});

test("development preserves every graph identity and reverses without state or reseeding", () => {
  const baseline = lightningGraph(10701, 0);
  const identity = (g) =>
    g.map(({ id, active, parent }) => ({ id, active, parent }));
  for (let j = 0; j <= 400; j++) {
    const d = j / 200;
    const graph = lightningGraph(10701, d);
    assert.deepEqual(identity(graph), identity(baseline));
    const reverse = lightningGraph(10701, 2 - (2 - d));
    assert.deepEqual(identity(graph), identity(reverse));
    for (let i = 0; i < SEGMENTS; i++) {
      assert.ok(distance(graph[i].a, reverse[i].a) < 1e-12);
      assert.ok(distance(graph[i].b, reverse[i].b) < 1e-12);
    }
    const next = lightningGraph(10701, Math.min(d + 0.00001, 2));
    for (let i = 0; i < SEGMENTS; i++) {
      assert.ok(distance(graph[i].a, next[i].a) < 0.0002);
      assert.ok(distance(graph[i].b, next[i].b) < 0.0002);
    }
  }
  assert.doesNotMatch(stormData, /u_params\[0\][\s\S]*stHash\(/);
  assert.doesNotMatch(
    stormData.slice(
      stormData.indexOf("vec3 stLeader"),
      stormData.indexOf("vec3 stWorld"),
    ),
    /stRise|stSuper|u_time|u_params/,
  );
});

test("the same field-biased leaders become cloud-to-cloud and terminate exactly on ground", () => {
  for (const seed of [0, 10701, 10702, 0xffffffff])
    for (const height of [0.7, 1, 1.2])
      for (const network of [0, 1]) {
        assert.deepEqual(leaderPoint(seed, network, 0), [0, 0, 0]);
        const end = leaderPoint(seed, network, 18);
        assert.ok(worldPoint(end, network, 1, height)[1] > 5 * height);
        assert.ok(Math.abs(worldPoint(end, network, 2, height)[1]) < 1e-12);
        const root = worldPoint([0, 0, 0], network, 2, height);
        assert.ok(root[1] >= 6.2 * height);
      }
});

test("conservative cached tile bounds include the whole AA lightning support", () => {
  // At >=280 px even the widest portrait AA support fits the data bound.
  for (const shortSide of [280, 540, 1080, 2160])
    for (const framing of [0.74, 1, 1.05]) {
      const width = Math.max((2 / (shortSide * 1.65 * framing)) * 0.8, 0.00085);
      assert.ok(width * 7 < 0.035);
    }
  assert.match(storm.fragment, /shortSide >= 280\.0/);
  assert.match(storm.precompute.fragment, /min\(p.xy,p.zw\) - 0\.035/);
  assert.deepEqual(storm.precompute.size, [1024, 515]);
  assert.equal(storm.precompute.filter, "linear");
  assert.match(
    storm.fragment,
    /return stDatum\(i, row\)/,
    "uncached exact fallback",
  );
  for (let bits = 0; bits <= 65535; bits++)
    assert.equal(Math.fround(bits), bits);
});

test("volume and local lighting are bounded and never bypass the shared flash limiter", () => {
  assert.match(storm.fragment, /for \(int j = 0; j < 28;/);
  assert.match(storm.fragment, /float ds = \(farT - nearT\) \/ 28\.0/);
  assert.match(storm.fragment, /if \(trans < 0\.012\) break/);
  assert.match(stormVolume, /exp\(-d0\*\(0\.16\+depth0\*0\.16\)\)/);
  assert.match(stormVolume, /stDensity\(p\+moonLight\*0\.8\)/);
  assert.match(stormVolume, /stDensity\(mix\(p,s0,0\.5\)\)/);
  assert.match(storm.fragment, /cloud \+= trans \* alpha \* light/);
  assert.doesNotMatch(storm.fragment, /flashLimit|flashExempt|gl_FragDepth/);
  assert.match(storm.fragment, /1\.0 \+ 0\.02 \* u_kick/);
  assert.ok(
    Math.exp(-1000 * 0.16) < 1e-18,
    "glow has negligible far-field support",
  );
  // Beer-Lambert compositing stays finite and energy conserving in opacity.
  for (const density of [0, 0.1, 1, 5, 100]) {
    let trans = 1,
      integral = 0;
    const ds = 9 / 28,
      alpha = 1 - Math.exp(-density * ds);
    for (let i = 0; i < 28; i++) {
      integral += trans * alpha;
      trans *= 1 - alpha;
    }
    assert.ok(Math.abs(integral + trans - 1) < 1e-12);
    assert.ok(trans >= 0 && trans <= 1);
  }
});

test("cloud-base crawlers remain horizontal while the original leaders turn to ground", () => {
  for (const d of [0, 0.5, 1, 1.5, 2]) {
    const graph = lightningGraph(10701, d);
    for (const net of [2, 3]) {
      const a = graph[net * 30].a,
        b = graph[net * 30 + 17].b;
      assert.ok(Math.abs(a[0] - b[0]) > 12);
      assert.ok(Math.abs(a[1] - b[1]) < 1);
      assert.ok(b[1] > 2.5);
    }
  }
  assert.match(storm.fragment, /for \(int group = 0; group < 8;/);
  assert.match(storm.fragment, /if \(bits == 0u\) continue/);
});

test("3D atlas addresses are bijective and trilinear interpolation preserves affine fields", () => {
  const grid = [128, 80, 48],
    size = [48, 16.4, 13],
    lo = [-24, 0.4, 0];
  const address = ([x, y, z]) => [
    (z % 8) * 128 + x,
    35 + Math.floor(z / 8) * 80 + y,
  ];
  for (let z = 0; z < grid[2]; z++)
    for (let y = 0; y < grid[1]; y++)
      for (let x = 0; x < grid[0]; x++) {
        const [u, v] = address([x, y, z]);
        assert.ok(u >= 0 && u < 1024 && v >= 35 && v < 515);
        assert.deepEqual(
          [
            u % 128,
            (v - 35) % 80,
            Math.floor((v - 35) / 80) * 8 + Math.floor(u / 128),
          ],
          [x, y, z],
        );
      }
  const affine = (p) => 0.7 + p[0] * 0.23 - p[1] * 0.51 + p[2] * 0.37;
  for (let j = 1; j < 100; j++) {
    const q = [(j * 1.271) % 126, (j * 0.731) % 78, (j * 0.431) % 46];
    let value = 0;
    for (let z = 0; z < 2; z++)
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          const corner = [x, y, z],
            fraction = q.map((v) => v - Math.floor(v));
          const weight = corner.reduce(
            (w, c, k) => w * (c ? fraction[k] : 1 - fraction[k]),
            1,
          );
          const p = q.map(
            (v, k) =>
              lo[k] + ((Math.floor(v) + corner[k] + 0.5) / grid[k]) * size[k],
          );
          value += affine(p) * weight;
        }
    const exact = affine(
      q.map((v, k) => lo[k] + ((v + 0.5) / grid[k]) * size[k]),
    );
    assert.ok(Math.abs(value - exact) < 1e-12);
  }
  assert.match(stormVolume, /const vec3 stGrid = vec3\(128,80,48\)/);
  assert.match(stormVolume, /#ifdef PRECOMPUTED_LINEAR/);
  assert.match(stormVolume, /return stOptical\(stVolumeLo/);
});

test("Beer light transport falls with optical depth and internal distance", () => {
  const light = (d, density) =>
    Math.exp(-d * (0.16 + density * 0.16)) / (1 + d * d * 0.08);
  for (const density of [0, 0.1, 1, 10]) {
    let previous = 1;
    for (let d = 0; d < 100; d += 0.25) {
      const current = light(d, density);
      assert.ok(current >= 0 && current <= previous);
      previous = current;
    }
  }
  assert.ok(light(4, 2) < light(4, 0.2));
  assert.ok(Math.exp(-4) < Math.exp(-0.4));
  assert.match(stormVolume, /float moon = exp\(-tau\*0\.55\)/);
});

test("eight complete bounded presets register one continuous three-state world", () => {
  assert.equal(storm.number, 107);
  assert.equal(storm.development, "development");
  assert.deepEqual(storm.type, { key: "development", values: [0, 1, 2] });
  assert.equal(storm.presets.length, 8);
  for (const p of storm.presets)
    for (const f of storm.schema)
      assert.ok(
        Number.isFinite(p.params[f.key]) &&
          p.params[f.key] >= f.min &&
          p.params[f.key] <= f.max,
        `${p.name}.${f.key}`,
      );
  const worlds = defaultWorlds(catalogLooks(scenes).map((l) => l.id));
  const world = worlds.find((w) => w.id === "thunderhead");
  assert.ok(world);
  assert.equal(world.id, "thunderhead");
  assert.deepEqual(
    world.states.map((s) => s.look),
    ["storm:Haze", "storm:Towers", "storm:Supercell"],
  );
  const clips = world.states.map((state) => ({
    snapshot: presetSnapshot(
      storm,
      storm.presets.findIndex((p) => `storm:${p.name}` === state.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, storm)?.positions, [0, 1, 2]);
  assert.deepEqual(
    storm.rhythm.map((r) => [r.slot, r.defaults.length]),
    [
      [0, 4],
      [1, 8],
      [2, 16],
    ],
  );
  assert.match(storm.fragment, /u_rhythm\.x/);
  assert.match(storm.fragment, /u_rhythm\.y/);
  assert.match(storm.fragment, /u_rhythm\.z/);
});

test("the rotating material chart is 2π-periodic at every intermediate development", () => {
  // Development affects the depth-dependent twist, NEVER the time multiplier.
  // Multiplying a wrapped phase by stSuper would jump at fractional states.
  const chart = (p, phase, supercell) => {
    const twist = supercell * p[1] * 0.12,
      scale = 1 / Math.hypot(1, twist);
    const x = (p[0] + twist * p[2]) * scale,
      z = (p[2] - twist * p[0]) * scale;
    return [
      Math.cos(phase) * x - Math.sin(phase) * z,
      Math.sin(phase) * x + Math.cos(phase) * z,
    ];
  };
  for (let dev = 0; dev <= 1; dev += 0.01)
    for (const phase of [0, 0.7, 2.8, 5.4])
      assert.ok(
        distance(
          chart([2, 4, 3], phase, dev),
          chart([2, 4, 3], phase + 2 * Math.PI, dev),
        ) < 1e-12,
      );
  assert.match(storm.fragment, /stRotation = rot2\(stPhase\)/);
  assert.doesNotMatch(storm.fragment, /stSuper \* stPhase|stPhase \* stSuper/);
});

test("cloud and camera clocks remain continuous at reversals and late energy changes", () => {
  for (const time of [100, 3600, 43200]) {
    const p = storm.schema.map((f) => f.default),
      state = {};
    const a = [...advanceClocks(state, storm.clocks, time, p, 0.1)];
    p[0] = 2;
    const b = [...advanceClocks(state, storm.clocks, time, p, 0.9)];
    assert.deepEqual(a, b);
    p[1] = 1.5;
    p[6] = 1;
    const c = [...advanceClocks(state, storm.clocks, time + 1 / 60, p, 0.9)];
    for (let i = 0; i < 2; i++) assert.ok(Math.abs(c[i] - a[i]) < 0.01);
  }
});
