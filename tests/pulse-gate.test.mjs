import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pulse from "../scene-pulse.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { imageMetrics, structureSignature, structureDistance } from "./browser/metrics.mjs";
import { renderLook } from "./browser/client.mjs";

// The browser seam is opt-in: node tests/pulse-gate.test.mjs --port 48125.
// npm test keeps the inexpensive portable-preset regression only.
test("every Pulse Geometry type has a portable authored look", () => {
  for (const form of pulse.type.values) {
    assert.ok(pulse.presets.some((p) => p.params.form === form));
  }
  for (let index = 0; index < pulse.presets.length; index++) {
    const snapshot = presetSnapshot(pulse, index);
    assert.deepEqual(validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [pulse]), snapshot);
  }
});

async function montage(page, rows, directory, width, height) {
  return page.evaluate(async ({ rows, directory, width, height }) => {
    const canvas = document.createElement("canvas");
    canvas.width = rows[0].cells.length * width; canvas.height = rows.length * (height + 24);
    const context = canvas.getContext("2d");
    context.fillStyle = "#101018"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "16px sans-serif";
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].cells.length; col++) {
        const cell = rows[row].cells[col];
        const image = await createImageBitmap(await (await fetch(
          `/artifacts/contact/${directory}/${cell.file}`)).blob());
        context.fillStyle = "white";
        context.fillText(`${rows[row].name} · ${cell.level}`, col * width + 8, row * (height + 24) + 18);
        context.drawImage(image, col * width, row * (height + 24) + 24);
      }
    }
    return canvas.toDataURL("image/png").split(",")[1];
  }, { rows, directory, width, height });
}

if (process.argv.includes("--port")) {
  test("Pulse Geometry headless family evidence", { timeout: 1800000 }, async () => {
    const { options, outputDirectory, serve, launch, openLab } = await import("../scripts/browser-runtime.mjs");
    const args = options({ cross: { type: "boolean", default: false } });
    assert.equal(args.rig, false, "software GPU only");
    const out = await outputDirectory("contact/pulse-probe", args.out);
    const server = await serve(".", args.port);
    const runtime = await launch();
    const evidence = { drift: [], beats: [], distances: [], nearest: [] };
    try {
      const lab = await openLab(runtime.browser, server.url);
      if (args.cross) {
        const { readFile } = await import("node:fs/promises");
        const sheet = JSON.parse(await readFile(resolve(out, "../pulse-cross-types/metrics.json"), "utf8"));
        const signatures = [];
        for (const row of sheet.rows) {
          const rgba = await lab.page.evaluate(async (file) => {
            const image = await createImageBitmap(await (await fetch(file)).blob());
            const canvas = document.createElement("canvas");
            canvas.width = image.width; canvas.height = image.height;
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);
            return Array.from(context.getImageData(0, 0, image.width, image.height).data);
          }, `/artifacts/contact/pulse-cross-types/${row.cells[0].file}`);
          signatures.push(structureSignature(rgba, sheet.width, sheet.height));
        }
        for (let i = 0; i < sheet.rows.length; i++) {
          const row = sheet.rows[i];
          if (row.sceneId !== "pulse") continue;
          const candidates = [];
          for (let j = 0; j < sheet.rows.length; j++) {
            if (i === j) continue;
            const other = sheet.rows[j];
            const distance = structureDistance(signatures[i], signatures[j]);
            if (other.sceneId === "pulse" && j > i)
              evidence.distances.push({ a: row.name, b: other.name, distance });
            else if (other.sceneId !== "pulse")
              candidates.push({ family: other.sceneId, type: other.name, distance });
          }
          candidates.sort((a, b) => a.distance - b.distance);
          evidence.nearest.push({ type: row.name, ...candidates[0] });
        }
        for (const pair of evidence.distances)
          assert.ok(pair.distance >= 0.25, `${pair.a}/${pair.b}: ${pair.distance}`);
      } else {
        for (let index = 0; index < pulse.presets.length; index++) {
          for (const level of [0.1, 0.5, 0.9]) {
            for (const direction of [-1, 1]) {
              const snapshot = presetSnapshot(pulse, index);
              for (const def of pulse.schema) {
                if (def.step === 1) continue;
                snapshot.params[def.key] = Math.max(def.min, Math.min(def.max,
                  snapshot.params[def.key] + direction * 0.12 * (def.max - def.min)));
              }
              const r = await lab.page.evaluate(renderLook, {
                sceneId: "pulse", snapshot, level, frames: 30, width: 320, height: 180,
              });
              assert.ok(r.peak > 8, `${index}/${level}/${direction}: blank drift`);
              assert.equal(r.glError, 0); assert.equal(r.nonFinite, 0);
              assert.equal(r.stats.liveTextures, r.stats.textures);
              const file = `drift-${index}-${level}-${direction}.png`;
              await writeFile(resolve(out, file), Buffer.from(r.png, "base64"));
              const params = await lab.page.evaluate(() =>
                Array.from(window.__phosphorLab.engine.slots.at(-1).params));
              evidence.drift.push({ preset: pulse.presets[index].name, level, direction,
                file, params, metrics: imageMetrics(r.rgba, r.width, r.height) });
            }
          }
        }
        const { readFile } = await import("node:fs/promises");
        const ladder = JSON.parse(await readFile(resolve(out, "../pulse-ladder/metrics.json"), "utf8"));
        const ladderPng = await montage(lab.page, ladder.rows, "pulse-ladder", 480, 270);
        await writeFile(resolve(out, "ladder.png"), Buffer.from(ladderPng, "base64"));
        const driftRows = pulse.presets.map(preset => ({ name: preset.name,
          cells: evidence.drift.filter(row => row.preset === preset.name) }));
        const driftPng = await montage(lab.page, driftRows, "pulse-probe", 320, 180);
        await writeFile(resolve(out, "drift.png"), Buffer.from(driftPng, "base64"));
        for (const name of ["pulse-16x9", "pulse-ultrawide", "pulse-square"]) {
          const sheet = JSON.parse(await readFile(resolve(out, `../${name}/metrics.json`), "utf8"));
          const png = await montage(lab.page, sheet.rows, name, sheet.width, sheet.height);
          await writeFile(resolve(out, `${name}.png`), Buffer.from(png, "base64"));
        }
        evidence.ladder = ladder.rows.map(row => ({ preset: row.name,
          cells: row.cells.map(cell => ({ level: cell.level, ...cell.metrics })) }));
        for (const row of evidence.ladder) {
          assert.ok(row.cells[0].edgeDensity < row.cells[1].edgeDensity &&
            row.cells[1].edgeDensity < row.cells[2].edgeDensity,
            `${row.preset}: edge detail must rise across the energy ladder`);
        }
        for (const preset of pulse.presets) {
          for (const direction of [-1, 1]) {
            const cells = evidence.drift.filter(row => row.preset === preset.name && row.direction === direction);
            assert.ok(cells[0].params[3] < cells[1].params[3] && cells[1].params[3] < cells[2].params[3],
              `${preset.name}: drift travel must rise with energy`);
            assert.ok(cells[0].params[1] < cells[1].params[1] && cells[1].params[1] < cells[2].params[1],
              `${preset.name}: drift density must rise with energy`);
          }
        }
        for (const form of pulse.type.values) {
          const index = pulse.presets.findIndex((p) => p.params.form === form);
          await lab.page.evaluate(renderLook, { sceneId: "pulse", index, level: 0.9,
            frames: 1, width: 160, height: 90, capture: false });
          const result = await lab.page.evaluate(async () => {
            const { engine } = window.__phosphorLab;
            const gl = engine.gl, pixels = new Uint8Array(engine.width * engine.height * 4);
            const read = () => {
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              gl.readPixels(0, 0, engine.width, engine.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
              return Array.from(pixels);
            };
            engine.beat = 0;
            engine.updatePerformance(0, false);
            engine.beatFx.flash = 0; // Isolate the declared shared punch/pulse.
            engine.present();
            const kick = read(), weights = { ...engine.beatFx };
            engine.beatFx.punch = engine.beatFx.pulse = 0;
            engine.present();
            const neutral = read();
            engine.options.flashLimit = true;
            const samples = [], requests = [];
            let previousBeat = -1;
            const start = performance.now();
            while (performance.now() - start < 6000) {
              await new Promise(requestAnimationFrame);
              const time = (performance.now() - start) / 1000;
              engine.beat = time * 2.5; // Worst show tempo: 150 BPM, 1x trim.
              engine.advance(1 / 60, false);
              const beat = Math.floor(engine.beat);
              if (beat !== previousBeat) requests.push(time);
              previousBeat = beat;
              samples.push({ time, rgba: read() });
            }
            engine.options.flashLimit = false;
            return { kick, neutral, weights, samples, requests, glError: gl.getError(),
              nonFinite: engine.counters.nonFinite, stats: engine.stats() };
          });
          let difference = 0;
          for (let i = 0; i < result.kick.length; i += 4)
            for (let c = 0; c < 3; c++)
              difference += Math.abs(result.kick[i + c] - result.neutral[i + c]) / 255;
          difference /= result.kick.length * 0.75;
          const samples = result.samples.map(({ time, rgba }) => ({ time,
            y: imageMetrics(rgba, 160, 90).meanLuminance }));
          const transitions = [];
          let start = samples[0].y, previous = start, sign = 0, counted = false;
          for (const { time, y } of samples.slice(1)) {
            const nextSign = Math.sign(y - previous);
            if (nextSign && nextSign !== sign) { start = previous; sign = nextSign; counted = false; }
            if (!counted && sign && Math.abs(y - start) >= 0.1 && Math.min(y, start) < 0.8) {
              transitions.push(time); counted = true;
            }
            previous = y;
          }
          const maxTransitions = Math.max(0, ...transitions.map(time =>
            transitions.filter(t => t > time - 1 && t <= time).length));
          const maxRequests = Math.max(...result.requests.map(time =>
            result.requests.filter(t => t > time - 1 && t <= time).length));
          evidence.beats.push({ form, difference, weights: result.weights, maxRequests,
            maxTransitions, samples, glError: result.glError, nonFinite: result.nonFinite });
          assert.ok(difference > 0.005, `form ${form}: invisible shared kick (${difference})`);
          assert.ok(maxRequests <= 3, `form ${form}: excessive automatic flashes`);
          assert.ok(maxTransitions <= 6, `form ${form}: ${maxTransitions} flash transitions/s`);
          assert.equal(result.glError, 0); assert.equal(result.nonFinite, 0);
          assert.equal(result.stats.liveTextures, result.stats.textures);
        }
      }
      assert.deepEqual(lab.errors, []);
      await lab.context.close();
    } finally {
      await writeFile(resolve(out, args.cross ? "distinctness.json" : "metrics.json"), JSON.stringify(evidence, null, 2));
      await runtime.stop();
      await server.close();
    }
  });
}
