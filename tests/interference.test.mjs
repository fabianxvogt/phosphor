import test from "node:test";
import assert from "node:assert/strict";
import interference from "../scene-interference.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { Engine } from "../engine.mjs";
import { renderLook } from "./browser/client.mjs";
import { energyDelta } from "../scripts/energy-metric.mjs";
import { structureSignature, structureDistance } from "./browser/metrics.mjs";

const scenes = [interference];

test("interference exposes six compositions, each covered by authored looks", () => {
  assert.deepEqual(interference.type, {
    key: "composition",
    values: [0, 1, 2, 3, 4, 5],
  });
  const selector = interference.schema.find(({ key }) => key === "composition");
  assert.equal(selector.max, 5);
  // The three looks the D60 rework dropped are back (owner, 2026-10-09).
  for (const name of ["Orbit Loom", "Petal Resonance", "Bent Horizons"])
    assert.ok(
      interference.presets.some((p) => p.name === name),
      name,
    );
  for (const value of interference.type.values)
    assert.ok(
      interference.presets.some(({ params }) => params.composition === value),
    );
  for (let i = 0; i < interference.presets.length; i++) {
    const snapshot = presetSnapshot(interference, i);
    assert.ok(interference.type.values.includes(snapshot.params.composition));
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), scenes),
      snapshot,
    );
  }
});

test("every authored interference look retains its type and palette across the energy ladder", () => {
  const engine = Object.create(Engine.prototype);
  Object.assign(engine, { counters: { nonFinite: 0 }, uniformFrame: 0 });
  for (let i = 0; i < interference.presets.length; i++) {
    const slot = {
      scene: interference,
      snapshot: presetSnapshot(interference, i),
      baseLevel: 0.5,
      params: new Float32Array(interference.schema.length),
    };
    const ladder = [0.1, 0.5, 0.9].map((level) => {
      engine.level = level;
      engine.uniformFrame++;
      engine.updateUniforms(slot);
      return Array.from(slot.params);
    });
    assert.ok(
      ladder[0][6] < ladder[1][6] && ladder[1][6] < ladder[2][6],
      interference.presets[i].name,
    );
    for (const params of ladder) {
      assert.equal(params[0], slot.snapshot.params.composition);
      assert.equal(params[5], ladder[1][5]);
      assert.ok(params.every(Number.isFinite));
    }
  }
  assert.equal(engine.counters.nonFinite, 0);
});

test("energy adds wave sources without changing an authored hold or transport lock", () => {
  const engine = Object.create(Engine.prototype);
  Object.assign(engine, { counters: { nonFinite: 0 }, uniformFrame: 0 });
  for (let i = 0; i < interference.presets.length; i++) {
    const snapshot = presetSnapshot(interference, i);
    snapshot.params.motion = 0;
    const slot = {
      scene: interference,
      snapshot,
      baseLevel: 0.5,
      params: new Float32Array(interference.schema.length),
    };
    const sources = [];
    for (const level of [0.1, 0.5, 0.9]) {
      engine.level = level;
      engine.uniformFrame++;
      engine.updateUniforms(slot);
      sources.push(slot.params[1]);
      assert.equal(
        slot.params[6],
        0,
        `${snapshot.preset}: zero motion holds at ${level}`,
      );
      assert.ok(Math.abs(slot.params[7] - snapshot.params.beatLock) < 1e-6);
    }
    assert.ok(
      sources[0] < sources[2],
      `${snapshot.preset}: energy raises source count`,
    );
  }
  assert.equal(engine.counters.nonFinite, 0);
});

test("interference kick weights drive the shared layer in energy order", () => {
  const engine = Object.create(Engine.prototype);
  Object.assign(engine, {
    slots: [{ scene: interference }],
    options: {},
    beatFx: {},
    counters: { nonFinite: 0 },
    speed: 1,
    beat: 8,
    levelDuration: 0,
    lastKickBeat: null,
    flashHeld: false,
  });
  const responses = [0.1, 0.5, 0.9].map((level) => {
    engine.level = level;
    engine.updatePerformance(1 / 60, false);
    return { ...engine.beatFx };
  });
  assert.equal(responses[0].punch, 0);
  assert.equal(responses[0].pulse, 0);
  assert.ok(responses[1].punch < responses[2].punch);
  assert.ok(responses[1].pulse < responses[2].pulse);
  assert.ok(responses[2].punch > 0.05);
  assert.ok(responses[2].pulse > 0.4);
  engine.beat = 8.5;
  engine.updatePerformance(1 / 60, false);
  assert.ok(engine.beatFx.punch < responses[2].punch / 20);
  assert.ok(engine.beatFx.pulse < responses[2].pulse / 20);
  assert.equal(engine.counters.nonFinite, 0);
});

// Real render seam, opt-in like the other family probes:
// node tests/interference.test.mjs --port 48213
if (process.argv.includes("--port")) {
  test(
    "layered interference has structural and temporal energy at every composition",
    { timeout: 1800000 },
    async () => {
      const { writeFile } = await import("node:fs/promises");
      const { resolve } = await import("node:path");
      const { options, outputDirectory, serve, launch, openLab } =
        await import("../scripts/browser-runtime.mjs");
      const args = options();
      const out = await outputDirectory(
        "contact/interference-rework-probe",
        args.out,
      );
      const server = await serve(".", args.port);
      const runtime = await launch({ rig: args.rig });
      const evidence = { energy: [], aspects: [], distinctness: [] };
      try {
        const lab = await openLab(runtime.browser, server.url);
        const signatures = [];
        const clean = (result) => {
          assert.equal(result.glError, 0);
          assert.equal(result.nonFinite, 0);
          assert.ok(result.peak > 24, "wave surfaces remain visible");
          assert.equal(result.stats.liveTextures, result.stats.textures);
        };
        for (const composition of interference.type.values) {
          const snapshot = presetSnapshot(interference, 0);
          snapshot.params.composition = composition;
          const sequences = [];
          for (const level of [0.1, 0.9]) {
            const result = await lab.page.evaluate(renderLook, {
              sceneId: interference.id,
              snapshot,
              seed: 17,
              level,
              base: 0.5,
              frames: 24,
              width: 160,
              height: 90,
              capture: false,
            });
            clean(result);
            sequences.push(
              await lab.page.evaluate(() => {
                const { engine } = window.__phosphorLab;
                const canvas = document.createElement("canvas");
                canvas.width = engine.width;
                canvas.height = engine.height;
                const context = canvas.getContext("2d");
                const frames = [];
                for (let sample = 0; sample < 12; sample++) {
                  if (sample) {
                    for (let step = 0; step < 2; step++) {
                      engine.beat =
                        0.5 +
                        Math.floor((24 + (sample - 1) * 2 + step + 1) / 30);
                      engine.advance(1 / 60, false);
                    }
                  }
                  engine.present();
                  context.drawImage(engine.canvas, 0, 0);
                  frames.push(
                    Array.from(
                      context.getImageData(0, 0, canvas.width, canvas.height)
                        .data,
                    ),
                  );
                }
                return frames;
              }),
            );
          }
          const delta = energyDelta(sequences[0], sequences[1], 160, 90);
          evidence.energy.push({ composition, ...delta });
          assert.ok(
            delta.score >= 0.15,
            `composition ${composition}: structural gate ${delta.score}`,
          );
          assert.ok(
            delta.highMotion - delta.lowMotion >= 0.01,
            `composition ${composition}: temporal energy ${delta.highMotion - delta.lowMotion}`,
          );
          const mid = await lab.page.evaluate(renderLook, {
            sceneId: interference.id,
            snapshot,
            seed: 17,
            level: 0.5,
            frames: 24,
            width: 320,
            height: 180,
            gray: true,
          });
          clean(mid);
          signatures.push(structureSignature(mid.rgba, mid.width, mid.height));

          for (const [width, height] of [
            [320, 180],
            [640, 180],
            [240, 240],
          ]) {
            snapshot.params.fields = 3;
            snapshot.params.ratio = 2;
            snapshot.params.orientation = 180;
            snapshot.params.motion = 1;
            const result = await lab.page.evaluate(renderLook, {
              sceneId: interference.id,
              snapshot,
              seed: 17,
              level: 0.95,
              frames: 4,
              width,
              height,
              capture: false,
            });
            clean(result);
            evidence.aspects.push({ composition, width, height, ...result });
          }
        }
        for (let a = 0; a < signatures.length; a++) {
          for (let b = a + 1; b < signatures.length; b++) {
            const distance = structureDistance(signatures[a], signatures[b]);
            evidence.distinctness.push({ a, b, distance });
            assert.ok(
              distance >= 0.25,
              `compositions ${a}/${b}: grayscale distinctness ${distance}`,
            );
          }
        }
        assert.deepEqual(lab.errors, []);
        assert.deepEqual(
          await lab.page.evaluate(() => window.__phosphorLab.errors),
          [],
        );
      } finally {
        await writeFile(
          resolve(out, "metrics.json"),
          JSON.stringify(evidence, null, 2),
        );
        await runtime.stop();
        await server.close();
      }
    },
  );
}
