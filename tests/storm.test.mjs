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
  discharge,
  channelGlow,
  cellFeature,
  billowLobe,
  detailAddress,
  detailWeight,
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
  // Include nine halo widths AND the 0.0018 micro-leader kink.
  for (const shortSide of [280, 540, 1080, 2160])
    for (const framing of [1, 1.05]) {
      const width = Math.max((2 / (shortSide * 1.65 * framing)) * 1.45, 0.0014);
      assert.ok(width * 9 + 0.0018 < 0.06);
    }
  assert.match(storm.fragment, /shortSide >= 280\.0/);
  assert.match(storm.precompute.fragment, /min\(p.xy,p.zw\) - 0\.06/);
  assert.deepEqual(storm.precompute.size, [1024, 515]);
  assert.equal(storm.precompute.filter, "linear");
  assert.equal(storm.precompute.nearestFallback, true);
  assert.match(
    storm.fragment,
    /return stDatum\(i, row\)/,
    "uncached exact fallback",
  );
  for (let bits = 0; bits <= 65535; bits++)
    assert.equal(Math.fround(bits), bits);
});

test("volume and local lighting are bounded and never bypass the shared flash limiter", () => {
  assert.match(storm.fragment, /for \(int j = 0; j < 16;/);
  assert.match(storm.fragment, /float ds = \(farT-nearT\)\/16\.0/);
  assert.match(storm.fragment, /opticalMoment \+= weight\*p/);
  assert.doesNotMatch(storm.fragment, /optical.x > 0\.5|surfaceT < 0\.0/);
  assert.match(storm.fragment, /if \(trans < 0\.0005\) break/);
  assert.match(storm.fragment, /1\.0\/sq\(1\.0\+dot\(q,q\)\*0\.1\)/);
  assert.match(stormVolume, /stDensity\(p\+moonLight\*1\.5\)/);
  assert.match(stormVolume, /smoothstep\(0\.05,0\.5,normal.y\)/);
  assert.match(
    storm.fragment,
    /flashIntegral \+= weight\*vec2\(stChannelGlow\(p,0\),stChannelGlow\(p,1\)\)/,
  );
  assert.match(storm.fragment, /moonIntegral \+= weight \* optical.y/);
  assert.doesNotMatch(storm.fragment, /flashLimit|flashExempt|gl_FragDepth/);
  assert.match(storm.fragment, /1\.0 \+ 0\.02 \* u_kick/);
  assert.ok(
    channelGlow([1000, 0, 0], [0, 0, 0], [0, 1, 0]) < 1e-9,
    "glow has negligible far-field support",
  );
  // Beer-Lambert compositing stays finite and energy conserving in opacity.
  for (const density of [0, 0.1, 1, 5, 100]) {
    let trans = 1,
      integral = 0;
    const ds = 9 / 24,
      alpha = 1 - Math.exp(-density * ds);
    for (let i = 0; i < 24; i++) {
      integral += trans * alpha;
      trans *= 1 - alpha;
    }
    assert.ok(Math.abs(integral + trans - 1) < 1e-12);
    assert.ok(trans >= 0 && trans <= 1);
  }
});

test("discharges persist across frames, restrike, decay and stay periodic/bounded", () => {
  for (const network of [0, 1]) {
    let visible = 0,
      peak = 0,
      previous = 0,
      reversals = 0,
      direction = 1;
    for (let frame = 0; frame < 600; frame++) {
      const phase = (frame / 60) * 0.7 * 0.16;
      const value = discharge(phase, network);
      const nextDirection = Math.sign(value - previous);
      if (value > 0.1 && nextDirection && nextDirection !== direction)
        reversals++;
      direction = nextDirection || direction;
      previous = value;
      visible += Number(value > 0.3);
      peak = Math.max(peak, value);
      assert.ok(value >= 0 && value <= 0.9);
      assert.ok(
        Math.abs(value - discharge(phase + 2 * Math.PI, network)) < 2e-13,
      );
      const driven = discharge(phase, network, {
        count: network,
        kick: 1,
        buried: 1,
        returned: 1,
      });
      assert.ok(driven >= value && driven <= 2.2);
    }
    assert.ok(visible >= 6 && visible < 100, `${network}: ${visible} frames`);
    assert.ok(
      peak > 0.6 && reversals > 2,
      "multi-frame local flicker, not one hairline frame",
    );
  }
  assert.match(storm.fragment, /pow\(wave,40\.0\)/);
  assert.match(storm.fragment, /core\*12\.0\+glow\*1\.6/);
  assert.match(storm.fragment, /width \* 7\.0\*taper/);
  assert.match(storm.fragment, /float taper/);
  assert.match(storm.fragment, /internalFlash = max\(vec2\(flash0,flash1\)/);
  assert.match(storm.fragment, /dot\(internalFlash,flashIntegral\)/);
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
    size = [48, 16.4, 16],
    lo = [-24, 0.4, -3];
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
    channelGlow([d, 0, 0], [0, 0, 0], [0, 1, 0]) * Math.exp(-density);
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
  assert.match(stormVolume, /float moon = exp\(-tau\*0\.7\)/);
});

test("integer cloud features are seed-specific, uniform and exactly spatially periodic", () => {
  const sum = [0, 0, 0];
  for (let i = 0; i < 10000; i++) {
    const c = [i - 5000, ((i * 37) % 53) - 26, ((i * 17) % 29) - 14];
    const feature = cellFeature(10701, c);
    feature.forEach((v, k) => {
      assert.ok(v >= 0 && v < 1 && Number.isInteger(v * 1024));
      sum[k] += v;
    });
    assert.deepEqual(
      cellFeature(10701, c, 7),
      cellFeature(
        10701,
        c.map((n) => n + 14),
        7,
      ),
    );
  }
  for (const value of sum) assert.ok(Math.abs(value / 10000 - 0.5) < 0.015);
  assert.notDeepEqual(
    cellFeature(10701, [2, -3, 7]),
    cellFeature(10702, [2, -3, 7]),
  );
  assert.match(stormVolume, /hcell>>10,hcell>>20/);
});

test("rounded billow gradients match independent central differences and the cache period", () => {
  const eps = 1e-5;
  for (let i = 1; i <= 150; i++) {
    const p = [i * 0.143 + 0.21, i * 0.277 - 13.17, i * 0.063 + 0.55];
    const a = billowLobe(10701, p, 7),
      b = billowLobe(
        10701,
        p.map((n) => n + 7),
        7,
      );
    assert.ok(Math.abs(a.value - b.value) < 1e-12);
    assert.ok(distance(a.gradient, b.gradient) < 1e-11);
    // The regularised finite core has a deliberately bounded gradient.
    if (a.value > 0.93) continue;
    for (let axis = 0; axis < 3; axis++) {
      const lo = [...p],
        hi = [...p];
      lo[axis] -= eps;
      hi[axis] += eps;
      const numerical =
        (billowLobe(10701, hi, 7).value - billowLobe(10701, lo, 7).value) /
        (2 * eps);
      assert.ok(
        Math.abs(numerical - a.gradient[axis]) < 1e-6,
        `${i}/${axis}: ${numerical} vs ${a.gradient[axis]}`,
      );
    }
  }
  assert.match(stormVolume, /best = mix\(best,d,h\)-0\.12\*h\*\(1\.0-h\)/);
});

test("buried line sources peak on the channel, decay radially and respect endpoints", () => {
  for (const x of [-4, 0, 2, 8]) {
    const a = [x, 0, 1],
      b = [x, 4, 1];
    for (const t of [0, 0.1, 0.5, 1])
      assert.equal(channelGlow([x, t * 4, 1], a, b), 1);
    assert.equal(channelGlow([x, 5, 1], a, b), 1 / 1.1 ** 2);
    for (let d = 0; d < 20; d += 0.25) {
      const p = [x + d, 2, 1];
      assert.ok(
        Math.abs(channelGlow(p, a, b) - 1 / (1 + d * d * 0.1) ** 2) < 1e-14,
      );
      assert.equal(channelGlow(p, a, b), channelGlow(p, b, a));
    }
  }
  assert.match(storm.fragment, /stPhase\*8\.0\+1\.1/);
  assert.match(storm.fragment, /u_accent,0\.12/);
});

test("periodic detail atlas is bijective, padded and separate from all optical/topology data", () => {
  const seen = new Set();
  for (let z = 0; z < 28; z++)
    for (let y = 0; y < 28; y++)
      for (let x = 0; x < 28; x++) {
        const address = detailAddress([x, y, z]);
        assert.ok(
          address[0] >= 125 &&
            address[0] < 964 &&
            address[1] >= 4 &&
            address[1] < 33,
        );
        const key = address.join(",");
        assert.ok(!seen.has(key));
        seen.add(key);
        for (const shift of [-56, -28, 28, 56])
          assert.deepEqual(
            detailAddress([x + shift, y + shift, z + shift]),
            address,
          );
      }
  assert.equal(seen.size, 28 ** 3);
  assert.match(stormVolume, /vec2\(125\.5,4\.5\)\+q.xy/);
  assert.match(stormVolume, /stBillowCore\(vec3\(q\)\*0\.25,7\.0\)/);
  assert.match(storm.precompute.fragment, /x >= 124 && x < 964 && row < 33/);
  assert.match(stormVolume, /for \(int z = -1; z <= 1;/);
});

test("micro-billow octaves fade monotonically at the output pixel footprint", () => {
  let previous = 1;
  for (let x = 0; x < 2; x += 0.001) {
    const value = detailWeight(x);
    assert.ok(value >= 0 && value <= previous);
    previous = value;
  }
  assert.equal(detailWeight(0.15), 1);
  assert.equal(detailWeight(0.65), 0);
  assert.match(storm.fragment, /pixel\*surfaceT\*2\.4/);
  assert.match(storm.fragment, /footprint\*3\.81/);
  assert.doesNotMatch(storm.fragment, /dFdx\(surface\)|dFdy\(surface\)/);
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
