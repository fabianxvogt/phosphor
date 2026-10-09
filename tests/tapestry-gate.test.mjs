import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import tapestry, {
  CELLS,
  GALLERY,
  HISTORY,
  MAX_LAG,
  RAIL,
  RING,
  SPARSE,
  TapestryModel,
  ringLayout,
  seedTapestry,
  signature,
  stalePeriod,
  stepTapestry,
  wrapAge,
} from "../scene-tapestry.mjs";

const bitsOf = (text) => Uint8Array.from(text, Number);
const textOf = (row) => [...row].join("");
const rotate = (row, by) =>
  Uint8Array.from(row, (_, x) => row[(x + by) % row.length]);
const paramsOf = (preset, level = 0.5) => ({
  view: preset.params.seedShape,
  rule: preset.params.rule,
  density: preset.params.density,
  level,
});

test("CPU reference applies every Wolfram code exactly on a periodic ring", () => {
  // Rule 30 from one cell: Wolfram's published first generations.
  let row = bitsOf("000000010000000");
  const rule30 = [
    "000000111000000",
    "000001100100000",
    "000011011110000",
    "000110010001000",
  ];
  for (const expected of rule30) {
    row = stepTapestry(row, 30);
    assert.equal(textOf(row), expected);
  }
  // Rule 110 grows to the left only.
  assert.equal(textOf(stepTapestry(bitsOf("0000100"), 110)), "0001100");
  // The ring wraps: the left neighbour of cell 0 is the last cell.
  assert.equal(textOf(stepTapestry(bitsOf("10000"), 90)), "01001");
  // Every rule, every neighbourhood: bit (4l + 2c + r) of the code.
  for (let rule = 0; rule < 256; rule++)
    for (let n = 0; n < 8; n++) {
      const l = (n >> 2) & 1,
        c = (n >> 1) & 1,
        r = n & 1;
      const next = stepTapestry(Uint8Array.from([l, c, r]), rule);
      assert.equal(next[1], (rule >> n) & 1, `rule ${rule} neighbourhood ${n}`);
    }
});

test("rings avoid powers of two, so additive rule 90 never dies out", () => {
  for (const width of [RING, RAIL]) {
    assert.ok(width & 1, `${width} is odd`);
    assert.notEqual(width & (width - 1), 0, `${width} is not a power of two`);
  }
  assert.equal(3 * RAIL <= CELLS && RING <= CELLS, true);
  const dies = (width) => {
    let row = new Uint8Array(width);
    row[width >> 1] = 1;
    for (let g = 1; g <= 4096; g++) {
      row = stepTapestry(row, 90);
      if (!row.some(Boolean)) return g;
    }
    return 0;
  };
  // The old 512-cell ring went black after 256 generations.
  assert.equal(dies(512), 256);
  assert.equal(dies(RING), 0);
  assert.equal(dies(RAIL), 0);
});

test("row signatures are invariant under rotation and reflection", () => {
  const row = seedTapestry(RING, 5, 0, 0.4);
  const sig = signature(row);
  assert.equal(signature(rotate(row, 37)), sig);
  assert.equal(signature(Uint8Array.from(row).reverse()), sig);
  // Background-relative: a complemented row on a lit background matches.
  assert.equal(
    signature(
      Uint8Array.from(row, (v) => 1 - v),
      1,
    ),
    sig,
  );
  assert.notEqual(signature(stepTapestry(row, 30)), sig);
});

test("stale detection finds dead, uniform, cyclic and shifted states only", () => {
  const sequence = (rule, row, generations) => {
    const sigs = [];
    for (let g = 0; g < generations; g++) {
      sigs.unshift(signature(row));
      row = stepTapestry(row, rule);
    }
    return (j) => sigs[j];
  };
  const single = new Uint8Array(RING);
  single[99] = 1;
  // Dead (rule 0), translation (rule 184 free flow, rule 2 shift).
  assert.equal(stalePeriod(sequence(0, single, 40), 39), 1);
  assert.equal(stalePeriod(sequence(2, single, 40), 39), 1);
  const traffic = seedTapestry(RING, 401, 0, 0.3);
  assert.equal(stalePeriod(sequence(184, traffic, 600), 599), 1);
  // Uniform but blinking (rule 1 from all-zero alternates 0/1): period 2.
  assert.equal(stalePeriod(sequence(1, new Uint8Array(RING), 40), 39), 2);
  // Chaos and the nested Sierpinski cascade keep evolving.
  assert.equal(stalePeriod(sequence(30, single, 200), 199), 0);
  assert.equal(stalePeriod(sequence(90, single, 99), 98), 0);
  assert.equal(
    stalePeriod(sequence(30, seedTapestry(RING, 3, 0, 0.5), 254), 253),
    0,
  );
  // Too little history never reports a period.
  assert.equal(stalePeriod(sequence(0, single, 10), 9), 0);
});

test("fresh rows: single seeds where the cone crosses the screen, else a fill", () => {
  const ones = (row) => row.reduce((n, v) => n + v, 0);
  // Two-sided rules start near the middle; the mirror view starts exactly there.
  const mirror = seedTapestry(RING, 1234, 1, 0.01, 0, 90);
  assert.deepEqual(
    [...mirror].flatMap((v, i) => (v ? [i] : [])),
    [RING >> 1],
  );
  // Rule 110 grows left, so its seed sits right; rule 60 grows right.
  const left = seedTapestry(RING, 7, 0, 0.01, 0, 110).indexOf(1);
  const right = seedTapestry(RING, 7, 0, 0.01, 0, 60).indexOf(1);
  assert.ok(left > RING * 0.7 && right < RING * 0.3, `${left} ${right}`);
  // Seed count grows with density and with energy.
  assert.equal(ones(seedTapestry(RING, 7, 0, 0.01, 0, 90, 0.5)), 1);
  assert.ok(ones(seedTapestry(RING, 7, 0, 0.1, 0, 90, 0.5)) >= 2);
  assert.ok(ones(seedTapestry(RING, 7, 0, 0.01, 0, 90, 0.9)) >= 2);
  // Dense fills match their density; a lit background is complemented.
  const fill = ones(seedTapestry(RING, 7, 0, 0.5));
  assert.ok(fill > 75 && fill < 125, `${fill}`);
  const dark = seedTapestry(RING, 7, 0, 0.01, 0, 90, 0.5, 1);
  assert.equal(ones(dark), RING - 1);
});

test("a live rule change continues from the current row and marks a boundary", () => {
  const model = new TapestryModel({ seed: 3, rule: 90, density: 0.01 });
  const params = { view: 0, rule: 90, density: 0.01, level: 0.1 };
  for (let g = 0; g < 50; g++) model.advance(params);
  const before = model.row(0).slice(0, RING);
  model.advance({ ...params, rule: 30 });
  assert.equal(model.generation, 51);
  assert.deepEqual(
    [...model.row(0).slice(0, RING)],
    [...stepTapestry(before, 30)],
  );
  assert.equal(model.rowInfo(0)[0].kind, 3);
  assert.deepEqual([...model.row(1).slice(0, RING)], [...before]);
  // A view change re-partitions the ring and starts a fresh row; history stays.
  model.advance({ ...params, rule: 30, view: 2 });
  assert.equal(model.rowInfo(0).length, 3);
  assert.equal(model.rowInfo(0)[1].kind, 2);
  assert.deepEqual(
    [...model.row(1).slice(0, RING)],
    [...stepTapestry(before, 30)],
  );
});

test("rails run the look's rule in the centre and a gallery of rules outside", () => {
  const model = new TapestryModel({
    seed: 9,
    view: 2,
    rule: 110,
    density: 0.3,
  });
  const params = { view: 2, rule: 110, density: 0.3, level: 0.5 };
  const seen = new Set();
  for (let g = 0; g < 2000; g++) {
    const old = model.row(0);
    model.advance(params, g % 240 === 0);
    const info = model.rowInfo(0);
    assert.equal(info[1].rule, 110);
    for (const k of [0, 2]) {
      assert.ok(GALLERY.includes(info[k].rule) && info[k].rule !== 110);
      seen.add(info[k].rule);
    }
    // Each ring wraps on itself: stepping a ring never reads its neighbours.
    ringLayout(2).forEach((ring, k) => {
      if (info[k].kind) return;
      const slice = (row) => row.slice(ring.offset, ring.offset + ring.width);
      assert.deepEqual(
        [...slice(model.row(0))],
        [...stepTapestry(slice(old), info[k].rule)],
      );
    });
  }
  // Phrase boundaries move the outer rails on through the gallery.
  assert.ok(seen.size >= 6, `${seen.size} gallery rules`);
});

test("every look generates forever: no dead, frozen or short-cycle stretch", () => {
  const window = 300;
  for (const preset of tapestry.presets)
    for (const level of [0.1, 0.5, 0.9]) {
      const params = paramsOf(preset, level);
      const model = new TapestryModel({ seed: preset.seed, ...params });
      const rings = ringLayout(params.view);
      const history = rings.map(() => []);
      const fresh = rings.map(() => []);
      const phrase = preset.params.phrase;
      const generations = 3000;
      for (let g = 1; g <= generations; g++) {
        // At 120 BPM and the look's own rate, a phrase lasts this many rows.
        const rows = Math.max(
          1,
          Math.round(phrase * 0.5 * preset.params.scroll || 0),
        );
        model.advance(params, phrase > 0 && g % rows === 0);
        rings.forEach((ring, k) => {
          const info = model.rowInfo(0)[k];
          const cells = model
            .row(0)
            .slice(ring.offset, ring.offset + ring.width);
          history[k].push(signature(cells, info.background));
          if (info.kind === 2) fresh[k].push(g);
        });
      }
      const name = `${preset.name} @${level}`;
      rings.forEach((ring, k) => {
        const sigs = history[k];
        for (let start = window; start + window <= sigs.length; start += 100) {
          const slice = sigs.slice(start, start + window);
          const dead = slice.filter((s) => (s & 255) === 0).length;
          assert.ok(dead < window / 2, `${name} ring ${k}: dead ${dead}`);
          // A window that is one short cycle throughout would read as frozen.
          let periodic = 0;
          for (let p = 1; p <= MAX_LAG && !periodic; p++)
            if (
              slice.every((s, j) => j + p >= slice.length || s === slice[j + p])
            )
              periodic = p;
          assert.equal(
            periodic,
            0,
            `${name} ring ${k}: cycle ${periodic} at ${start}`,
          );
          assert.ok(new Set(slice).size >= 12, `${name} ring ${k}: variety`);
        }
        // Sparse looks keep giving birth to new cascades.
        if (Math.floor(params.density * 100 + 0.5) < SPARSE) {
          const limit = wrapAge(ring.width, 255) * 2 + 2;
          const births = [0, ...fresh[k], generations];
          for (let i = 1; i < births.length; i++)
            assert.ok(
              births[i] - births[i - 1] <= limit,
              `${name} ring ${k}: no cascade between ${births[i - 1]} and ${births[i]}`,
            );
        }
      });
    }
});

test("looks: original names and seeds kept, new famous rules, valid params", () => {
  const original = [
    ["90 · Nested linen", 97],
    ["54 · Twin brocade", 211],
    ["30 · Wild silk", 307],
    ["184 · Traffic ribbon", 401],
    ["110 · Persistent knots", 509],
    ["150 · Interference lace", 613],
    ["22 · Sparse ceremony", 719],
    ["126 · Burning fringe", 823],
  ];
  const { presets, schema } = tapestry;
  assert.deepEqual(
    schema.map((d) => d.key),
    [
      "rule",
      "seedShape",
      "density",
      "scroll",
      "weave",
      "playback",
      "phrase",
      "paletteDrift",
    ],
  );
  assert.deepEqual(
    presets.slice(0, 8).map((p) => [p.name, p.seed]),
    original,
  );
  assert.ok(presets.length >= 12);
  assert.equal(new Set(presets.map((p) => p.name)).size, presets.length);
  for (const preset of presets) {
    assert.ok(preset.name.startsWith(`${preset.params.rule} · `), preset.name);
    for (const field of schema) {
      const value = preset.params[field.key];
      assert.ok(
        value >= field.min && value <= field.max,
        `${preset.name} ${field.key}`,
      );
      if (field.step === 1) assert.ok(Number.isInteger(value));
    }
  }
  // Each view carries at least three looks; no two looks share rule and view.
  for (const view of tapestry.type.values)
    assert.ok(
      presets.filter((p) => p.params.seedShape === view).length >= 3,
      `view ${view}`,
    );
  const pairs = presets.map((p) => `${p.params.rule}/${p.params.seedShape}`);
  assert.equal(new Set(pairs).size, pairs.length);
  const rules = new Set(presets.map((p) => p.params.rule));
  for (const famous of [30, 45, 73, 90, 110, 150, 184])
    assert.ok(rules.has(famous), `rule ${famous}`);
  // Simulation stays small: one 256² RGBA8 state, at most four passes a tick.
  assert.deepEqual(tapestry.simulation.size, [256, 256]);
  assert.ok(tapestry.simulation.steps <= 4);
  assert.equal(HISTORY, 255);
});

// Opt-in browser regression: node tests/tapestry-gate.test.mjs --port 48124.
// npm test leaves browser ownership to the main headless lab runner.
const browserRequested = process.argv.includes("--port");
test(
  "GPU simulation equals the CPU reference; views render at every energy",
  { skip: !browserRequested, timeout: 1800000 },
  async () => {
    const { options, outputDirectory, serve, launch, openLab } =
      await import("../scripts/browser-runtime.mjs");
    const { renderLook } = await import("./browser/client.mjs");
    const args = options();
    const out = await outputDirectory("contact/tapestry-gate", args.out);
    const server = await serve(".", args.port);
    let runtime;
    const report = [];
    try {
      runtime = await launch();
      const lab = await openLab(runtime.browser, server.url);
      const readState = () =>
        lab.page.evaluate(() => {
          const { engine } = window.__phosphorLab;
          const gl = engine.gl;
          const slot = engine.slots.at(-1);
          gl.bindFramebuffer(gl.FRAMEBUFFER, slot.sim[slot.si].fbo);
          const pixels = new Uint8Array(256 * 256 * 4);
          gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          return Array.from(pixels);
        });
      for (const [index, preset] of tapestry.presets.entries()) {
        const level = [0.1, 0.5, 0.9][index % 3];
        const snapshot = await lab.page.evaluate((index) => {
          const { scenes, presetSnapshot } = window.__phosphorLab;
          const snap = presetSnapshot(
            scenes.find((s) => s.id === "tapestry"),
            index,
          );
          snap.params.phrase = 0;
          return snap;
        }, index);
        const frame = await lab.page.evaluate(renderLook, {
          sceneId: "tapestry",
          snapshot,
          level,
          base: 0.5,
          frames: 60,
          width: 320,
          height: 180,
        });
        assert.equal(frame.glError, 0);
        assert.equal(frame.nonFinite, 0);
        assert.ok(frame.peak > 8, `${preset.name} is blank`);
        await writeFile(
          resolve(out, `tapestry-${index}-${level}.png`),
          Buffer.from(frame.png, "base64"),
        );
        const state = await readState();
        const byte = (x, y, c) => state[(y * 256 + x) * 4 + c];
        const head = byte(0, 0, 0);
        const generation =
          byte(1, 0, 0) | (byte(1, 0, 1) << 8) | (byte(1, 0, 2) << 16);
        const model = new TapestryModel({
          seed: preset.seed,
          ...paramsOf(preset, level),
        });
        for (let g = 0; g < generation; g++)
          model.advance(paramsOf(preset, level));
        const rings = ringLayout(preset.params.seedShape);
        let compared = 0;
        for (let age = 0; age < Math.min(generation, HISTORY - 1); age++) {
          const y = ((head - age + HISTORY) % HISTORY) + 1;
          const cpu = model.row(age);
          const info = model.rowInfo(age);
          rings.forEach((ring, k) => {
            for (let x = 0; x < ring.width; x++) {
              const c = ring.offset + x;
              assert.equal(
                byte(c, y, 0) > 127 ? 1 : 0,
                cpu[c],
                `${preset.name}: generation ${generation - age} cell ${c}`,
              );
            }
            assert.equal(byte(244 + k, y, 0), info[k].rule);
            assert.equal(
              byte(244 + k, y, 1),
              info[k].background | (info[k].kind << 1),
            );
          });
          compared++;
        }
        report.push({
          name: preset.name,
          level,
          generation,
          compared,
          peak: frame.peak,
        });
        assert.ok(compared >= 200, `${preset.name}: ${compared} rows compared`);
      }
      assert.deepEqual(lab.errors, []);
      await writeFile(
        resolve(out, "metrics.json"),
        JSON.stringify(report, null, 2),
      );
      console.log(JSON.stringify(report));
    } finally {
      await runtime?.stop();
      await server.close();
    }
  },
);
