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
  cells,
  stages,
  rhythmEnvelope,
  envelopeTime,
  stroke,
  discharge,
  eventGraph,
  flashFalloff,
  channelDistance,
  hg,
  multipleScattering,
  transmittanceAt,
  anvil,
  carrier,
  cellFeature,
  billowLobe,
  detailAddress,
  detailWeight,
  camera,
  carrierLipschitz,
  SEGMENTS,
  BRANCH_PROBABILITY,
  TREE_SHAPES,
} from "../storm-model.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { advanceClocks } from "../scene-time.mjs";

const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const developments = Array.from({ length: 41 }, (_, i) => i / 20);

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
  assert.notDeepEqual(cells(10701, 1), cells(10702, 1));
  assert.match(stormData, /0x7feb352du/);
  assert.match(stormData, /0x846ca68bu/);
  assert.match(stormData, /uint\(network \+ 1\) \* 0x9e3779b9u/);
  assert.match(stormData, /uint\(n \+ 1\) \* 0x85ebca6bu/);
});

test("every active branch of every tree shape is connected to its trunk", () => {
  assert.equal(SEGMENTS, 120);
  for (let seed = 10700; seed < 10760; seed++)
    for (let slot = 0; slot < 4; slot++)
      for (let shape = 0; shape < TREE_SHAPES; shape++) {
        const network = slot * 16 + shape;
        const tree = Array.from({ length: 30 }, (_, i) =>
          leaderSegment(seed, network, i),
        );
        for (const segment of tree) {
          assert.ok(distance(segment.a, segment.b) > 0);
          if (segment.parent < 0) continue;
          assert.deepEqual(segment.a, tree[segment.parent].b);
          if (segment.active) assert.equal(tree[segment.parent].active, true);
        }
      }
  assert.match(stormData, /int network = int\(stSlot\[slot\]\.w\)/);
});

test("branching probability and unbiased stepped-leader jitter meet independent statistics", () => {
  let active = 0,
    trials = 0,
    dx = 0,
    dx2 = 0,
    steps = 0,
    left = 0;
  for (let seed = 0; seed < 6000; seed++)
    for (let network = 0; network < 4; network++) {
      for (let branch = 0; branch < 3; branch++) {
        active += Number(leaderSegment(seed, network, 18 + branch * 4).active);
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
  assert.ok(Math.abs(active / trials - BRANCH_PROBABILITY) < 0.01);
  assert.ok(Math.abs(left / trials - 0.5) < 0.01);
  assert.ok(Math.abs(dx / steps) < 0.001);
  // Difference of two independent U(-a/2,a/2) samples has variance a²/6.
  assert.ok(Math.abs(dx2 / steps - 0.16 ** 2 / 6) < 0.00008);
  assert.match(stormData, /stRand\(network, 70 \+ branch\) < 0\.78/);
  assert.match(stormData, /stRand\(network,n\*3\)-stRand\(network,0\)\)\*0\.16/);
});

test("each event picks a seeded tree and site; development never changes identity", () => {
  const counts = new Map();
  for (let index = 0; index < 4000; index++) {
    const base = discharge(10701, 0, index, 0.3, 1, 0);
    counts.set(base.network, (counts.get(base.network) ?? 0) + 1);
    for (const d of [0.5, 1, 1.5, 2]) {
      const e = discharge(10701, 0, index, 0.3, 1, d);
      assert.equal(e.network, base.network);
      assert.equal(e.cell, base.cell);
      assert.equal(e.restrikes, base.restrikes);
    }
  }
  // Twelve shapes per slot, each used: strikes do not repeat one tree.
  assert.equal(counts.size, TREE_SHAPES);
  for (const n of counts.values()) assert.ok(n > 4000 / TREE_SHAPES / 2);
  // Consecutive events land in different places most of the time.
  let moved = 0;
  for (let index = 0; index < 1000; index++) {
    const a = discharge(10701, 0, index, 0.3, 1, 2),
      b = discharge(10701, 0, index + 1, 0.3, 1, 2);
    moved += Number(distance(a.bottom, b.bottom) > 2);
  }
  assert.ok(moved > 750, `${moved}`);
  assert.doesNotMatch(
    stormData.slice(stormData.indexOf("vec3 stLeader"), stormData.indexOf("vec3 stWorld")),
    /stRise|stSuper|u_time|u_params/,
  );
});

test("endpoints morph continuously with development and reverse exactly", () => {
  for (const slot of [0, 1, 2, 3])
    for (const index of [3, 77, 1024]) {
      let previous = null;
      for (let j = 0; j <= 2000; j++) {
        const d = j / 1000;
        const e = discharge(10701, slot, index, 0.3, 1, d);
        const back = discharge(10701, slot, index, 0.3, 1, 2 - (2 - d));
        assert.ok(distance(e.top, back.top) < 1e-12);
        if (previous) {
          assert.ok(distance(e.top, previous.top) < 0.05, `${slot}/${d}`);
          assert.ok(distance(e.bottom, previous.bottom) < 0.05, `${slot}/${d}`);
        }
        previous = e;
      }
    }
});

test("leaders stay inside the cloud as heat lightning, then strike exactly on the ground", () => {
  for (const seed of [0, 10701, 10702, 0xffffffff])
    for (let index = 0; index < 200; index++)
      for (const slot of [0, 1]) {
        const haze = discharge(seed, slot, index, 0.3, 1, 0);
        const { base } = cells(seed, 0);
        assert.ok(haze.bottom[1] > base, "Haze leaders end inside the bank");
        const strike = discharge(seed, slot, index, 0.3, 1, 2);
        const graph = eventGraph(seed, strike);
        assert.ok(Math.abs(graph[17].b[1]) < 1e-9, "the trunk ends on the ground");
        assert.ok(strike.top[1] > 3, "the root is inside the cloud");
        if (slot === 0) assert.ok(strike.top[1] > 9, "hero bolts leave the anvil");
      }
});

test("crawlers stay under the anvil and are never mirrored", () => {
  const an = anvil(10701, 2);
  const inside = (p) => {
    const a = [p[0] - an.centre[0], (p[2] - an.centre[2]) * 2];
    if (a[0] > 0) a[0] *= 1.7;
    return Math.hypot(a[0], a[1]) < an.radius;
  };
  let mirrored = 0;
  for (let index = 0; index < 500; index++) {
    const e = discharge(10701, 2, index, 0.3, 1, 2);
    assert.ok(inside(e.top) && inside(e.bottom), `${index}`);
    assert.ok(Math.abs(e.top[1] - e.bottom[1]) < 1);
    const f = discharge(10701, 2, index + 1, 0.3, 1, 2);
    mirrored += Number(Math.abs(e.top[0] + f.top[0] - 2 * an.centre[0]) < 0.05);
  }
  assert.ok(mirrored < 5);
  assert.doesNotMatch(stormData, /side\s*\*\s*\(-6\.5/);
});

test("rhythm envelopes invert exactly to normalised event time", () => {
  for (const amplitude of [0.6, 0.65])
    for (let k = 3; k < 1000; k++) {
      const u = k / 1000;
      const value = rhythmEnvelope(u * 2.5, 2.5, amplitude);
      assert.ok(Math.abs(envelopeTime(value, amplitude) - u) < 2e-6, `${u}`);
    }
  assert.equal(envelopeTime(0, 0.6), 1);
  assert.match(stormData, /0\.5 - sin\(asin\(1\.0-2\.0\*y\)\/3\.0\)/);
});

test("one broad pulse per event; restrikes and flicker stay local and bounded", () => {
  for (const seed of [10701, 10702])
    for (let id = 0; id < 200; id++)
      for (const [slot, ic, crawl] of [
        [0, 0, false],
        [1, 1, false],
        [2, 1, true],
        [3, 1, false],
      ]) {
        let broadPeaks = 0,
          previous = 0,
          rising = false,
          maxLocal = 0;
        for (let k = -10; k <= 1010; k++) {
          const u = k / 1000;
          const [local, broad, progress] = stroke(u, id % 3, crawl, ic, seed, id, slot);
          assert.ok(local >= 0 && local <= 1.6 && broad >= 0 && broad <= 1);
          assert.ok(progress >= 0 && progress <= 1);
          if (u <= 0 || u >= 1) assert.deepEqual([local, broad], [0, 0]);
          if (broad < previous && rising && previous > 0.05) broadPeaks++;
          rising = broad > previous;
          previous = broad;
          maxLocal = Math.max(maxLocal, local);
        }
        assert.ok(broadPeaks <= 1, `${slot}/${id}: ${broadPeaks}`);
        assert.ok(maxLocal > 0.3);
      }
  // Intra-cloud flicker modulates a sustained glow rather than strobing.
  for (let id = 0; id < 100; id++) {
    let lo = Infinity;
    for (let u = 0.1; u < 0.4; u += 0.001)
      lo = Math.min(lo, stroke(u, 0, false, 1, 10701, id, 3)[0]);
    assert.ok(lo > 0.3, `${id}: ${lo}`);
  }
});

test("autonomous storm life follows energy, never development", () => {
  const rate = (level, rise) => {
    let fires = 0;
    for (let k = 0; k < 4000; k++) {
      const chance =
        rise * (0.14 + (0.7 - 0.14) * level) + (1 - rise) * (0.35 + 0.5 * level);
      fires += Number(random(10701, 31, k % 4096) < chance);
    }
    return fires / 4000;
  };
  assert.ok(rate(0.1, 1) < 0.25 && rate(0.9, 1) > 0.6);
  assert.ok(rate(0.1, 0) > rate(0.1, 1), "heat lightning flickers more often");
  assert.match(stormData, /float k = floor\(u_beat\*0\.5\)/);
  assert.match(stormData, /mix\(mix\(0\.35,0\.85,level\),mix\(0\.14,0\.7,level\),stRise\)/);
});

test("conservative tile masks include the tortuous zigzag and AA support", () => {
  // Two midpoint levels displace at most 0.2·len + 0.1·len from the edge.
  for (const shortSide of [280, 540, 1080, 2160])
    for (const focal of [1.45, 2.35])
      for (const framing of [1, 1.05])
        for (const len of [0, 0.01, 0.1, 0.4]) {
          const width = Math.max((2 / (shortSide * focal * framing)) * 1.45, 0.0014);
          assert.ok(width * 9 + 0.0018 + len * 0.3 < 0.07 + 0.3 * len);
        }
  assert.match(storm.fragment, /shortSide >= 280\.0/);
  assert.match(storm.precompute.fragment, /float pad = 0\.07\+0\.3\*length\(p\.zw-p\.xy\)/);
  assert.match(storm.fragment, /n\*len\*0\.2\*r0/);
  assert.match(storm.fragment, /n\*len\*0\.1\*r1/);
  assert.deepEqual(storm.precompute.size, [1024, 675]);
  assert.equal(storm.precompute.filter, "linear");
  assert.equal(storm.precompute.nearestFallback, true);
  assert.match(storm.fragment, /return stDatum\(i, row\)/, "uncached exact fallback");
  for (let bits = 0; bits <= 65535; bits++) assert.equal(Math.fround(bits), bits);
});

test("bolts are occluded by the cloud in front of them", () => {
  const record = { enter: 10, half: 11, tenth: 12.5, exit: 14, final: 0.02 };
  let previous = 1;
  for (let t = 0; t < 20; t += 0.01) {
    const value = transmittanceAt(t, record);
    assert.ok(value <= previous + 1e-12 && value >= record.final - 1e-12);
    previous = value;
  }
  assert.equal(transmittanceAt(9.9, record), 1);
  assert.ok(Math.abs(transmittanceAt(11, record) - 0.5) < 1e-4);
  assert.ok(Math.abs(transmittanceAt(12.5, record) - 0.1) < 1e-4);
  assert.equal(transmittanceAt(5, { enter: -1, half: -1, tenth: -1, exit: 0, final: 1 }), 1);
  assert.match(storm.fragment, /float occlusion = stTransAt\(length\(mix\(a\.xyz,b\.xyz,s\)-stEye\)\)/);
  assert.doesNotMatch(storm.fragment, /flashLimit|flashExempt|gl_FragDepth/);
  assert.match(storm.fragment, /1\.0 \+ 0\.02 \* u_kick/);
});

test("phase functions and multiple-scattering octaves are physical", () => {
  // Henyey–Greenstein integrates to one over the sphere.
  for (const g of [-0.25, 0, 0.36, 0.72]) {
    let sum = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const mu = -1 + (2 * (i + 0.5)) / n;
      sum += hg(g, mu) * 2 * Math.PI * (2 / n);
    }
    assert.ok(Math.abs(sum - 1) < 2e-3, `${g}: ${sum}`);
  }
  for (const mu of [-0.8, 0, 0.9]) {
    let previous = Infinity;
    for (let tau = 0; tau < 30; tau += 0.1) {
      const value = multipleScattering(tau, mu);
      assert.ok(value > 0 && value <= previous);
      previous = value;
    }
  }
  // Backlit: thin edges outshine thick fronts by more than an order.
  assert.ok(multipleScattering(0.3, 0.9) > 10 * multipleScattering(12, 0.9));
  assert.match(storm.fragment, /phase0\*exp\(-tau\)\+phase1\*exp\(-0\.4\*tau\)\+phase2\*exp\(-0\.16\*tau\)/);
});

test("lightning irradiance is local, monotone and attenuated inside the cloud", () => {
  let previous = Infinity;
  for (let d = 0; d < 60; d += 0.1) {
    const value = flashFalloff(d);
    assert.ok(value > 0 && value <= previous);
    previous = value;
  }
  assert.equal(flashFalloff(0), 1);
  assert.ok(flashFalloff(40) < 0.01);
  for (const x of [-4, 0, 8]) {
    const a = [x, 0, 1],
      b = [x, 4, 1];
    for (const t of [0, 0.5, 1]) assert.equal(channelDistance([x, t * 4, 1], a, b), 0);
    assert.equal(channelDistance([x, 5, 1], a, b), 1);
    assert.equal(channelDistance([x + 3, 2, 1], a, b), channelDistance([x + 3, 2, 1], b, a));
  }
  assert.match(stormVolume, /float g = power\/pow\(1\.0\+d\*d\*0\.06,1\.5\)/);
  assert.match(stormVolume, /g \*= exp\(-tau\*d\*0\.333\*0\.16\)/);
});

test("empty-space skipping is conservative for the carrier field", () => {
  // Outside, the lattice stores -(sd - 1.3)·0.8/L. Skipping that far is safe
  // where |∇sd| ≤ L/0.8, with L the local bound for anvil and updraft.
  let worst = 0;
  const eps = 1e-3;
  for (const d of [0, 0.6, 1, 1.4, 2])
    for (let i = 0; i < 4000; i++) {
      const p = [
        -26 + 52 * random(7, 1, i),
        0.3 + 16.8 * random(7, 2, i),
        -7 + 30 * random(7, 3, i),
      ];
      const grad = [0, 1, 2].map((k) => {
        const hi = [...p],
          lo = [...p];
        hi[k] += eps;
        lo[k] -= eps;
        return (carrier(hi, 10701, d, 0.7) - carrier(lo, 10701, d, 0.7)) / (2 * eps);
      });
      worst = Math.max(worst, Math.hypot(...grad) / carrierLipschitz(p, 10701, d));
    }
  assert.ok(worst <= 1 / 0.8, `${worst}`);
  // Erosion moves the surface outward by at most half the largest erosion.
  assert.match(stormVolume, /float e = mix\(1\.0,2\.5,/);
  assert.match(stormVolume, /float skip = max\(1e-4,\(sd-1\.3\)\*0\.8\/lip\)/);
  assert.match(stormVolume, /float lip = mix\(1\.55,1\.15,stRise\)\+wA\*mix\(0\.45,2\.2,stSuper\)\+3\.0\*wM/);
  assert.match(stormVolume, /if \(sd > 0\.5\*e\+0\.05\) return 0\.0/);
});

test("the camera never enters a cloud, keeps above ground and moves gently", () => {
  for (const eye of [0, 0.45, 1]) {
    let path = 0;
    for (let j = 0; j < developments.length; j++) {
      const d = developments[j];
      const c = camera(d, eye);
      assert.ok(c.y > 0.1);
      // The closed orbit adds at most ±2.2 x and ±0.6 z.
      for (const [dx, dz] of [[-2.2, -0.6], [2.2, 0.6], [0, 0.6]])
        assert.ok(carrier([dx, c.y, c.z + dz], 10701, d) > 2, `${eye}/${d}`);
      if (j) {
        const p = camera(developments[j - 1], eye);
        path += Math.hypot(c.z - p.z, c.y - p.y);
      }
    }
    // The storm grows toward the camera; the camera itself travels < 8 units
    // across the whole development (a one-bar drop never lurches).
    assert.ok(path < 8, `${path}`);
    assert.ok(camera(0, eye).focal / camera(2, eye).focal < 1.7);
  }
});

test("3D atlas addresses are bijective and trilinear interpolation preserves affine fields", () => {
  const grid = [128, 80, 64],
    size = [52, 16.8, 30],
    lo = [-26, 0.3, -7];
  const address = ([x, y, z]) => [(z % 8) * 128 + x, 35 + Math.floor(z / 8) * 80 + y];
  const seen = new Set();
  for (let z = 0; z < grid[2]; z++)
    for (let y = 0; y < grid[1]; y++)
      for (let x = 0; x < grid[0]; x++) {
        const [u, v] = address([x, y, z]);
        assert.ok(u >= 0 && u < 1024 && v >= 35 && v < 675);
        seen.add(u * 1000 + v);
      }
  assert.equal(seen.size, 128 * 80 * 64);
  const affine = (p) => 0.7 + p[0] * 0.23 - p[1] * 0.51 + p[2] * 0.37;
  for (let j = 1; j < 100; j++) {
    const q = [(j * 1.271) % 126, (j * 0.731) % 78, (j * 0.431) % 62];
    let value = 0;
    for (let z = 0; z < 2; z++)
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          const corner = [x, y, z],
            fraction = q.map((v) => v - Math.floor(v));
          const weight = corner.reduce((w, c, k) => w * (c ? fraction[k] : 1 - fraction[k]), 1);
          const p = q.map((v, k) => lo[k] + ((Math.floor(v) + corner[k] + 0.5) / grid[k]) * size[k]);
          value += affine(p) * weight;
        }
    const exact = affine(q.map((v, k) => lo[k] + ((v + 0.5) / grid[k]) * size[k]));
    assert.ok(Math.abs(value - exact) < 1e-12);
  }
  assert.match(stormVolume, /const vec3 stGrid = vec3\(128,80,64\)/);
  assert.match(stormVolume, /const vec3 stVolumeSize = vec3\(52\.0,16\.8,30\.0\)/);
  assert.match(stormVolume, /#ifdef PRECOMPUTED_LINEAR/);
  assert.match(stormVolume, /return stOptical\(clamp\(p,stVolumeLo,stVolumeLo\+stVolumeSize\)\)/);
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
    assert.deepEqual(cellFeature(10701, c, 7), cellFeature(10701, c.map((n) => n + 14), 7));
  }
  for (const value of sum) assert.ok(Math.abs(value / 10000 - 0.5) < 0.015);
  assert.notDeepEqual(cellFeature(10701, [2, -3, 7]), cellFeature(10702, [2, -3, 7]));
  assert.match(stormVolume, /hcell>>10,hcell>>20/);
});

test("rounded billow gradients match independent central differences and the cache period", () => {
  const eps = 1e-5;
  for (let i = 1; i <= 150; i++) {
    const p = [i * 0.143 + 0.21, i * 0.277 - 13.17, i * 0.063 + 0.55];
    const a = billowLobe(10701, p, 7),
      b = billowLobe(10701, p.map((n) => n + 7), 7);
    assert.ok(Math.abs(a.value - b.value) < 1e-12);
    assert.ok(distance(a.gradient, b.gradient) < 1e-11);
    if (a.value > 0.93) continue;
    for (let axis = 0; axis < 3; axis++) {
      const lo = [...p],
        hi = [...p];
      lo[axis] -= eps;
      hi[axis] += eps;
      const numerical =
        (billowLobe(10701, hi, 7).value - billowLobe(10701, lo, 7).value) / (2 * eps);
      assert.ok(Math.abs(numerical - a.gradient[axis]) < 1e-6);
    }
  }
  assert.match(stormVolume, /best = mix\(best,d,h\)-0\.12\*h\*\(1\.0-h\)/);
});

test("periodic detail atlas is bijective, padded and separate from all other data", () => {
  const seen = new Set();
  for (let z = 0; z < 28; z++)
    for (let y = 0; y < 28; y++)
      for (let x = 0; x < 28; x++) {
        const address = detailAddress([x, y, z]);
        assert.ok(address[0] >= 125 && address[0] < 964 && address[1] >= 4 && address[1] < 33);
        // Never overlaps the per-frame state texels (x 120–132, rows 0–2).
        assert.ok(address[1] > 2);
        seen.add(address.join(","));
        for (const shift of [-56, 28])
          assert.deepEqual(detailAddress([x + shift, y + shift, z + shift]), address);
      }
  assert.equal(seen.size, 28 ** 3);
  assert.match(stormVolume, /vec2\(125\.5,4\.5\)\+q.xy/);
  assert.match(storm.precompute.fragment, /x >= 124 && x < 964 && row < 33/);
  assert.match(storm.precompute.fragment, /if \(row < 3\) \{ outColor = stDatum\(x,row\); return; \}/);
});

test("full-resolution lobes fade monotonically at the output pixel footprint", () => {
  let previous = 1;
  for (let x = 0; x < 2; x += 0.001) {
    const value = detailWeight(x);
    assert.ok(value >= 0 && value <= previous);
    previous = value;
  }
  assert.equal(detailWeight(0.1), 1);
  assert.equal(detailWeight(0.45), 0);
  assert.match(storm.fragment, /1\.0-smoothstep\(0\.1,0\.45,pixel\*t\*2\.4\)/);
  assert.doesNotMatch(storm.fragment, /dFdx\(|dFdy\(/);
});

test("the supercell carries a rotating anvil, dome and striated updraft only at the top state", () => {
  const towers = anvil(10701, 1),
    supercell = anvil(10701, 2);
  assert.equal(towers.dome, 0);
  assert.ok(supercell.dome > 2 && supercell.radius > 3 * towers.radius);
  // Striation phase is 2π-periodic: the carrier repeats exactly per clock wrap.
  for (const p of [
    [2, 4.5, 6],
    [-1, 5.2, 7.5],
  ])
    for (const d of [1.3, 2])
      assert.ok(Math.abs(carrier(p, 10701, d, 0.4) - carrier(p, 10701, d, 0.4 + 2 * Math.PI)) < 1e-9);
  assert.match(stormVolume, /stRotation = rot2\(stPhase\)/);
  assert.doesNotMatch(stormVolume, /stSuper \* stPhase|stPhase \* stSuper/);
  const { supercell: s } = stages(1.5);
  assert.ok(s > 0 && s < 1);
});

test("eight complete bounded presets register one continuous three-state world", () => {
  assert.equal(storm.number, 107);
  assert.equal(storm.development, "development");
  assert.deepEqual(storm.type, { key: "development", values: [0, 1, 2] });
  assert.equal(storm.presets.length, 8);
  for (const p of storm.presets)
    for (const f of storm.schema)
      assert.ok(
        Number.isFinite(p.params[f.key]) && p.params[f.key] >= f.min && p.params[f.key] <= f.max,
        `${p.name}.${f.key}`,
      );
  const worlds = defaultWorlds(catalogLooks(scenes).map((l) => l.id));
  const world = worlds.find((w) => w.id === "thunderhead");
  assert.ok(world);
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
    storm.rhythm.map((r) => [r.id, r.slot, r.defaults.length]),
    [
      ["buried-discharge", 0, 4],
      ["branch-corona", 1, 8],
      ["stepped-return", 2, 16],
    ],
  );
  assert.match(stormData, /u_rhythm\.x/);
  assert.match(stormData, /u_rhythm\.y/);
  assert.match(stormData, /u_rhythm\.z/);
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
  // Every use of the weather clock is an integer harmonic of stPhase.
  for (const source of [stormVolume, storm.fragment])
    for (const m of source.matchAll(/stPhase\*([0-9.]+)/g))
      assert.ok(Number.isInteger(Number(m[1])), m[0]);
});
