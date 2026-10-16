import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { Engine } from "../engine.mjs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "../scripts/browser-runtime.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { defaultPattern } from "../rhythm.mjs";
import {
  ATTRIBUTES,
  INSTANCE_ATTRIBUTES,
  COUNT,
  GENERATIONS,
  MONOLITH,
  SPACING,
  ASSEMBLY_PITCH,
  RAIN_HEIGHT,
  NEIGHBOURS,
  caStep,
  caGeneration,
  key,
  hash,
  morton3,
  assemblyOrder,
  identities,
  position,
  smooth,
  bridges,
  createCube,
  createGeometry,
  cameraFrame,
  createInstances,
} from "../voxel-model.mjs";
const scene = scenes.find((s) => s.id === "voxel");
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const equalSet = (a, b) => assert.deepEqual([...a].sort(), [...b].sort());

test("voxel is a continuous, eight-look spatial world with bounded presets", () => {
  assert.equal(scene.number, 115);
  assert.equal(scene.development, "development");
  assert.equal(scene.presets.length, 8);
  const world = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  ).find((w) => w.id === "data-monolith");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Rain", "Assembly", "Unfold"],
  );
  const clips = world.states.map((s) => ({
    snapshot: presetSnapshot(
      scene,
      scene.presets.findIndex((p) => `voxel:${p.name}` === s.look),
    ),
  }));
  assert.deepEqual(continuousDevelopment(clips, scene).positions, [0, 1, 2]);
  for (const preset of scene.presets)
    for (const field of scene.schema) {
      const value = preset.params[field.key];
      assert.ok(
        Number.isFinite(value) && value >= field.min && value <= field.max,
        `${preset.name}.${field.key}`,
      );
    }
  assert.equal(scene.rhythm.length, 4);
  assert.deepEqual(
    scene.rhythm.map((r) => r.defaults.length),
    [4, 8, 16, 8],
  );
  assert.equal(scene.geometry.instances.create, createInstances);
  assert.equal(
    ATTRIBUTES.reduce((a, b) => a + b),
    6,
  );
  assert.equal(
    INSTANCE_ATTRIBUTES.reduce((a, b) => a + b),
    15,
  );
});

test("rewrite is slot 3, all presets are dense and shader responses stay local", () => {
  const effect = scene.rhythm.find((r) => r.slot === 3);
  assert.equal(effect.id, "memory-rewrite");
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const pattern = defaultPattern(scene.rhythm, style);
    const density = pattern.tracks.reduce(
      (sum, track) =>
        sum +
        track.steps.filter((v) => v > 0).length /
          (track.length / track.division / 4),
      0,
    );
    assert.ok(density >= minimum, `${style}: ${density} hits/bar`);
    assert.ok(effect.styles[style].steps.filter((v) => v > 0).length >= 2);
  }
  for (const shader of [scene.geometry.vertex, scene.geometry.fragment]) {
    assert.match(shader, /u_rhythm\.w/);
    assert.match(shader, /u_rhythmHit\.w/);
    assert.match(shader, /u_rhythmCount\.w/);
    assert.match(shader, /exp\(-pow\(\(address-y\)\/.9,2\.\)\)/);
  }
  assert.match(scene.geometry.fragment, /\.18\+u_level\*\.55/);
});

test("CA step equals an independent dense six-neighbour XOR reference", () => {
  let input = new Set(["0,0,0", "1,0,0", "-1,1,0", "0,0,2"]);
  for (let g = 0; g < 4; g++) {
    const reference = new Set();
    for (let x = -8; x <= 8; x++)
      for (let y = -8; y <= 8; y++)
        for (let z = -8; z <= 8; z++) {
          const n = [
            input.has(`${x - 1},${y},${z}`),
            input.has(`${x + 1},${y},${z}`),
            input.has(`${x},${y - 1},${z}`),
            input.has(`${x},${y + 1},${z}`),
            input.has(`${x},${y},${z - 1}`),
            input.has(`${x},${y},${z + 1}`),
          ].filter(Boolean).length;
          if (n % 2) reference.add(`${x},${y},${z}`);
        }
    input = caStep(input);
    equalSet(input, reference);
  }
  equalSet(caStep(new Set()), new Set());
  const pair = caStep(new Set(["-1,0,0", "1,0,0"]));
  assert.ok(!pair.has("0,0,0"), "two parents cancel, this is XOR not OR");
});

test("GF(2) Frobenius scaling and the generation-27 closed form", () => {
  for (const g of [1, 2, 4, 8, 16, 32])
    equalSet(
      new Set(caGeneration(g).map(key)),
      new Set(NEIGHBOURS.map((p) => key(p.map((x) => x * g)))),
    );
  // (A)^27 = A^16 A^8 A^2 A over GF(2), evaluated independently of caStep.
  let paths = new Set(["0,0,0"]);
  for (const scale of [16, 8, 2, 1]) {
    const next = new Set();
    for (const address of paths)
      for (const delta of NEIGHBOURS) {
        const p = address.split(",").map(Number),
          q = key(p.map((x, i) => x + scale * delta[i]));
        if (next.has(q)) next.delete(q);
        else next.add(q);
      }
    paths = next;
  }
  assert.equal(GENERATIONS, 27);
  equalSet(paths, new Set(caGeneration().map(key)));
  assert.equal(paths.size, 1296);
  assert.equal(COUNT, 1296);
  assert.deepEqual(MONOLITH, [8, 27, 6]);
  for (const p of caGeneration())
    assert.ok(
      p.every(Number.isInteger) &&
        p.reduce((s, x) => s + Math.abs(x), 0) <= GENERATIONS,
    );
  // Exact reflection symmetry survives every generation.
  for (const p of caGeneration())
    for (let axis = 0; axis < 3; axis++) {
      const q = [...p];
      q[axis] *= -1;
      assert.ok(paths.has(key(q)));
    }
});

test("Morton assembly is a deterministic bottom-up permutation, independent of development", () => {
  const order = assemblyOrder(1151);
  assert.deepEqual(order, assemblyOrder(1151));
  assert.equal(new Set(order).size, COUNT);
  const coordinates = (id) => [
    id % 8,
    Math.floor(id / 48),
    Math.floor(id / 8) % 6,
  ];
  let previous = null;
  for (const id of order) {
    const p = coordinates(id);
    if (previous)
      assert.ok(
        p[1] > previous[1] ||
          (p[1] === previous[1] && morton3(...p) > morton3(...previous)),
      );
    previous = p;
  }
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++)
      for (let z = 0; z < 8; z++) assert.equal(morton3(x, y, z) & 1, x & 1);
  assert.equal(createInstances.length, 1);
  assert.equal(createCube().length, 36 * 6);
  assert.equal(createGeometry().length, 42 * 6);
  assert.deepEqual(createGeometry().slice(0, 36 * 6), createCube());
  assert.ok(
    createGeometry()
      .slice(36 * 6)
      .every((x, i) => i % 6 < 3 || x === 0),
  );
  assert.equal(scene.geometry.additiveFrom, 36);
  assert.ok(createCube().every(Number.isFinite));
  assert.deepEqual(createInstances(1151), createInstances(1151));
  assert.notDeepEqual(createInstances(1151), createInstances(1152));
  for (let i = 0; i < COUNT; i++)
    assert.ok(hash(1151, i) >= 0 && hash(1151, i) < 1);
});

test("persistent identities cover exactly the CA and move continuously in both directions", () => {
  const voxels = identities(1151);
  assert.equal(new Set(voxels.map((v) => v.id)).size, COUNT);
  equalSet(
    new Set(voxels.map((v) => key(v.cell))),
    new Set(caGeneration().map(key)),
  );
  let worst = 0;
  for (let i = 0; i < COUNT; i += 17) {
    const v = voxels[i];
    assert.ok(distance(position(v, 1, 0.21), v.monolith) < 1e-10);
    assert.ok(distance(position(v, 2, 0.21), v.target) < 1e-10);
    const forward = position(v, 1.37, 0.21);
    position(v, 1.9, 0.21);
    assert.deepEqual(position(v, 1.37, 0.21), forward);
    for (let d = 0.002; d <= 2; d += 0.002)
      worst = Math.max(
        worst,
        distance(position(v, d, 0.21), position(v, d - 0.002, 0.21)) / 0.002,
      );
    for (const d of [0, 0.2, 0.7, 1, 1.3, 2]) {
      assert.ok(
        distance(position(v, d, 0.21), position(v, d, 1.21)) < 1e-10,
        "clock is 1-periodic",
      );
      const seam = 1 - v.random;
      assert.ok(
        distance(position(v, d, seam - 1e-7), position(v, d, seam + 1e-7)) <
          1e-4,
        "no falling wrap jump, including partial assembly",
      );
      for (const phase of [0, 0.25, 0.5, 0.75])
        assert.ok(position(v, d, phase).every(Number.isFinite));
    }
    assert.ok(v.target[1] >= 0.26 && v.target[1] <= 30.26);
  }
  assert.ok(worst < 120, `development Lipschitz bound: ${worst}`);
});

test("monumental framing keeps the low camera outside cubes and causal bridges", () => {
  const voxels = identities(1151),
    links = bridges(voxels);
  assert.deepEqual(ASSEMBLY_PITCH, [0.46, 0.44, 0.46]);
  assert.equal(RAIN_HEIGHT, 14);
  assert.ok(Math.max(...voxels.map((v) => v.monolith[1])) > 11.5);
  assert.equal(Math.min(...voxels.map((v) => v.monolith[1])), 0.22);
  const boxDistance = (eye, center, extent) =>
    Math.hypot(
      ...eye.map((x, i) => Math.max(0, Math.abs(x - center[i]) - extent[i])),
    );
  let clearance = Infinity;
  for (const cameraDistance of [0.85, 1, 1.3])
    for (let d = 1; d <= 2.00001; d += 0.05)
      for (let phase = 0; phase < 2 * Math.PI; phase += 0.3) {
        const { eye, target } = cameraFrame(d, phase, cameraDistance);
        assert.ok(target[1] > eye[1], "a low, upward-looking camera");
        assert.deepEqual(
          cameraFrame(d, phase + 2 * Math.PI, cameraDistance).eye.map(
            (x, i) => Math.abs(x - eye[i]) < 1e-12,
          ),
          [true, true, true],
        );
        for (const v of voxels) {
          // circumscribed extent also covers the bounded kick rotation.
          const p = position(v, d, 0),
            extent = [0.4, 0.32, 0.4];
          clearance = Math.min(clearance, boxDistance(eye, p, extent));
        }
        for (const { from, to } of links) {
          const center = from.target.map((x, i) => (x + to.target[i]) / 2);
          const p = position({ ...from, target: center }, d, 0);
          const unfold = smooth(
            0,
            1,
            Math.max(0, d - 1) * 1.45 - 0.45 * from.rank,
          );
          const extent = from.target.map(
            (x, i) => (Math.abs(x - to.target[i]) / 2 + 0.035) * unfold,
          );
          clearance = Math.min(clearance, boxDistance(eye, p, extent));
        }
      }
  assert.ok(clearance > 0.1, `camera clearance: ${clearance}`);
  const peak = cameraFrame(2, 0);
  assert.ok(
    Math.hypot(peak.eye[0], peak.eye[2]) < 6,
    "camera is inside the 30-unit architecture",
  );
  assert.ok(peak.eye[1] > 12);
});

test("recursive bridges join real cells, are axis-aligned, unique and never skip live cells", () => {
  const voxels = identities(1151),
    links = bridges(voxels),
    live = new Set(voxels.map((v) => key(v.cell))),
    seen = new Set();
  assert.equal(links.length, 225);
  for (const { from, to, axis, distance: d } of links) {
    assert.ok(live.has(key(from.cell)) && live.has(key(to.cell)));
    assert.ok(d === 10 || d === 12);
    for (let a = 0; a < 3; a++)
      assert.equal(to.cell[a] - from.cell[a], a === axis ? d : 0);
    for (let offset = 1; offset < d; offset++) {
      const p = [...from.cell];
      p[axis] += offset;
      assert.ok(!live.has(key(p)));
    }
    const address = `${from.id}:${to.id}`;
    assert.ok(!seen.has(address));
    seen.add(address);
    assert.ok(Math.abs(distance(from.target, to.target) - d * SPACING) < 1e-10);
  }
  const data = createInstances(1151),
    stride = 15,
    half = (COUNT + links.length) * stride;
  assert.equal(data.length, half * 2);
  for (let i = 0; i < half; i += stride) {
    assert.deepEqual(
      data.slice(i, i + 11),
      data.slice(i + half, i + half + 11),
    );
    assert.equal(data[i + 11], 0);
    assert.equal(data[i + half + 11], 1);
    assert.deepEqual(
      data.slice(i + 12, i + 15),
      data.slice(i + half + 12, i + half + 15),
    );
  }
});

function mockEngine() {
  const calls = [],
    gl = new Proxy(
      { TRIANGLES: 4, ARRAY_BUFFER: 34962, FLOAT: 5126, STATIC_DRAW: 35044 },
      {
        get(target, key) {
          if (key in target) return target[key];
          return (...args) => {
            calls.push([key, ...args]);
            return {};
          };
        },
      },
    );
  const engine = Object.assign(Object.create(Engine.prototype), {
    gl,
    vao: {},
    paletteCache: new Map(),
  });
  return { engine, calls };
}
test("optional engine instancing uploads divisors, persists across development and releases buffers", () => {
  const { engine, calls } = mockEngine(),
    slot = { scene };
  const snapshot = presetSnapshot(scene, 0);
  engine.prepareSnapshot(slot, snapshot);
  assert.equal(slot.mesh.count, 42);
  assert.equal(slot.mesh.instances, 3042);
  assert.deepEqual(
    calls.filter((c) => c[0] === "vertexAttribDivisor").map((c) => c.slice(1)),
    [
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
    ],
  );
  const uploads = calls.filter((c) => c[0] === "bufferData").length;
  for (const d of [0.4, 1, 1.7, 2, 0.3])
    engine.prepareSnapshot(slot, {
      ...snapshot,
      params: { ...snapshot.params, development: d },
    });
  assert.equal(calls.filter((c) => c[0] === "bufferData").length, uploads);
  engine.prepareSnapshot(slot, { ...snapshot, seed: snapshot.seed + 1 });
  assert.equal(calls.filter((c) => c[0] === "bufferData").length, uploads + 2);
  Object.assign(slot, { visual: [], sim: [] });
  engine.destroySlot(slot);
  assert.equal(calls.filter((c) => c[0] === "deleteBuffer").length, 2);
  assert.equal(calls.filter((c) => c[0] === "deleteVertexArray").length, 1);
});
test("engine draws instanced meshes optionally; ordinary meshes retain drawArrays", () => {
  for (const instances of [undefined, 7]) {
    const { engine, calls } = mockEngine();
    Object.assign(engine, {
      checkScene: () => true,
      programsFor: () => ({ visual: {}, geometry: { uniforms: {} } }),
      bind: () => {},
      uniforms: () => {},
      options: { reducedMotion: false },
    });
    const slot = {
      scene,
      mesh: {
        vao: {},
        count: 36,
        ...(instances === undefined ? {} : { instances }),
      },
      visual: [{}, {}],
      vi: 0,
    };
    engine.drawSlot(slot, 1 / 60);
    const instanced = calls.filter((c) => c[0] === "drawArraysInstanced");
    if (instances === undefined) {
      assert.equal(instanced.length, 0);
      assert.ok(calls.some((c) => c[0] === "drawArrays" && c[3] === 36));
    } else
      assert.deepEqual(
        instanced.map((c) => c.slice(1)),
        [[4, 0, 36, 7]],
      );
  }
});

test(
  "native voxel buffers survive reversals, late time, ordinary-mesh switches and context recovery",
  {
    skip: !process.argv.includes("--port"),
    timeout: 120000,
  },
  async () => {
    const args = options(),
      out = await outputDirectory("voxel-native", args.out);
    const server = await serve(".", args.port),
      runtime = await launch({ rig: args.rig });
    try {
      const lab = await openLab(runtime.browser, server.url);
      const evidence = await lab.page.evaluate(async () => {
        const { engine, scenes, presetSnapshot, errors } = window.__phosphorLab;
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        const scene = scenes.find((s) => s.id === "voxel"),
          snapshot = presetSnapshot(scene, 0);
        const { renderLook } = await import("/tests/browser/client.mjs");
        await renderLook({
          sceneId: "voxel",
          frames: 10,
          width: 960,
          height: 540,
          capture: false,
          pollHealth: false,
        });
        const mesh = engine.slots.at(-1).mesh,
          rows = [];
        for (const time of [0, 3599.99, 3600.01, 4096, 43200])
          for (const development of [0, 0.4, 1, 1.7, 2, 0.6]) {
            engine.setSnapshot({
              ...snapshot,
              params: { ...snapshot.params, development },
            });
            const slot = engine.slots.at(-1);
            if (
              slot.mesh !== mesh ||
              slot.mesh.instanceBuffer !== mesh.instanceBuffer
            )
              throw Error("identity buffer replaced");
            slot.time = time;
            engine.advance(0, true);
            engine.present();
            const gl = engine.gl,
              pixels = new Uint8Array(960 * 540 * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.readPixels(0, 0, 960, 540, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            let peak = 0,
              lit = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const value = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
              peak = Math.max(peak, value);
              if (value > 12) lit++;
            }
            const row = {
              time,
              development,
              peak,
              lit,
              glError: gl.getError(),
              nonFinite: engine.counters.nonFinite,
            };
            if (row.glError || row.nonFinite || peak < 30 || lit < 100)
              throw Error(JSON.stringify(row));
            rows.push(row);
          }
        // Check that instance attribute divisors do not leak into old mesh VAOs.
        for (const id of ["kinetic", "fold", "voxel"]) {
          await renderLook({
            sceneId: id,
            frames: 2,
            width: 960,
            height: 540,
            capture: false,
            pollHealth: false,
          });
          if (engine.gl.getError()) throw Error(`${id} GL switch`);
        }
        const before = engine.slots.at(-1).mesh.instanceBuffer,
          ext = engine.gl.getExtension("WEBGL_lose_context");
        ext.loseContext();
        for (let i = 0; i < 60 && !engine.lost; i++) await frame();
        if (!engine.lost) throw Error("context did not lose");
        ext.restoreContext();
        for (let i = 0; i < 120 && engine.lost; i++) await frame();
        if (engine.lost || !(await engine.ready("voxel")))
          throw Error("context did not recover");
        engine.advance(0, true);
        engine.present();
        const restored = engine.slots.at(-1).mesh;
        if (
          restored.instanceBuffer === before ||
          restored.instances !== 3042 ||
          engine.gl.getError()
        )
          throw Error("instance restore");
        const stills = [];
        for (const development of [0, 1, 2]) {
          const health = await renderLook({
            sceneId: "voxel",
            snapshot: {
              ...snapshot,
              params: { ...snapshot.params, development },
            },
            frames: 120,
            width: 3840,
            height: 2160,
            capture: false,
            pollHealth: false,
          });
          if (health.glError || health.nonFinite || health.peak < 30)
            throw Error(`4K state ${development}: ${JSON.stringify(health)}`);
          const canvas = document.createElement("canvas");
          canvas.width = 3840;
          canvas.height = 2160;
          canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
          stills.push({
            development,
            png: canvas.toDataURL("image/png").split(",")[1],
          });
        }
        const unexpected = errors.filter(
          (m) => !/Graphics|context|restored|Grafik|wiederhergestellt/i.test(m),
        );
        if (unexpected.length) throw Error(unexpected.join("\n"));
        return {
          rows,
          instances: restored.instances,
          restored: true,
          stills,
          engineMessages: errors,
        };
      });
      assert.equal(evidence.restored, true);
      assert.deepEqual(lab.errors, []);
      const { stills, ...summary } = evidence;
      for (const { development, png } of stills)
        await writeFile(
          resolve(out, `4k-${["rain", "assembly", "unfold"][development]}.png`),
          Buffer.from(png, "base64"),
        );
      await writeFile(
        resolve(out, "native.json"),
        JSON.stringify(summary, null, 2),
      );
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
