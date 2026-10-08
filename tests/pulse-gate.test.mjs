import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pulse from "../scene-pulse.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { imageMetrics, structureDistance } from "./browser/metrics.mjs";
import { renderLook } from "./browser/client.mjs";

// Public seams: portable snapshots and actual Engine pixels in the render lab.
// Opt in with node tests/pulse-gate.test.mjs --port 48204 [--matrix <types-dir>].
// npm test leaves GPU ownership to the browser runner.
test("every saved Pulse form and authored preset remains portable", () => {
  assert.equal(pulse.type.key, "form");
  assert.deepEqual(pulse.type.values, [0, 1, 2, 3]);
  assert.deepEqual(
    pulse.presets.map((preset) => preset.name),
    [
      "Scanner Bars",
      "Slow Gate",
      "Square Tunnel",
      "Ring Dive",
      "Horizon Grid",
      "Shard Crown",
    ],
  );
  for (const form of pulse.type.values) {
    assert.ok(pulse.presets.some((preset) => preset.params.form === form));
  }
  for (let index = 0; index < pulse.presets.length; index++) {
    const snapshot = presetSnapshot(pulse, index);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [pulse]),
      snapshot,
    );
  }
});

const browserRequested = process.argv.includes("--port");
test(
  "Pulse has structural energy, faster motion, clock cuts and bounded flashes",
  {
    skip: !browserRequested,
    timeout: 1200000,
  },
  async () => {
    const { options, outputDirectory, serve, launch, openLab } =
      await import("../scripts/browser-runtime.mjs");
    const args = options({ matrix: { type: "string" } });
    assert.equal(args.rig, false, "correctness probe is software-GPU only");
    const out = await outputDirectory("contact/pulse-rework-probe", args.out);
    const server = await serve(".", args.port);
    let runtime;
    const evidence = {
      energy: [],
      aspects: [],
      palette: [],
      cuts: [],
      beats: [],
      drift: [],
      distances: [],
      nearest: [],
      nearPairs: [],
      crossFrames: [],
    };
    try {
      runtime = await launch();
      const lab = await openLab(runtime.browser, server.url);
      for (const form of pulse.type.values) {
        const snapshot = presetSnapshot(pulse, 0);
        snapshot.params.form = form;
        const sequences = [];
        for (const level of [0.1, 0.9]) {
          const result = await lab.page.evaluate(renderLook, {
            sceneId: "pulse",
            snapshot,
            seed: 17,
            level,
            frames: 120,
            width: 160,
            height: 90,
            capture: false,
          });
          assert.equal(result.glError, 0);
          assert.equal(result.nonFinite, 0);
          sequences.push(
            await lab.page.evaluate(() => {
              const { engine } = window.__phosphorLab;
              const gl = engine.gl;
              const pixels = new Uint8Array(engine.width * engine.height * 4);
              const sequence = [];
              for (let sample = 0; sample < 24; sample++) {
                if (sample)
                  for (let step = 0; step < 2; step++) {
                    engine.beat =
                      0.5 +
                      Math.floor((120 + (sample - 1) * 2 + step + 1) / 30);
                    engine.advance(1 / 60, false);
                  }
                engine.present();
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.readPixels(
                  0,
                  0,
                  engine.width,
                  engine.height,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  pixels,
                );
                sequence.push(Array.from(pixels));
              }
              return sequence;
            }),
          );
        }
        const { energyDelta } = await import("../scripts/energy-metric.mjs");
        const delta = energyDelta(sequences[0], sequences[1], 160, 90);
        evidence.energy.push({ form, ...delta });
        assert.ok(
          delta.score >= 0.15,
          `form ${form}: structural energy ${delta.score}`,
        );
        assert.ok(
          delta.motionDelta > 0.01,
          `form ${form}: motion delta ${delta.motionDelta} must exceed the old <= 0.0004`,
        );
        assert.ok(
          delta.highMotion > delta.lowMotion,
          `form ${form}: peak must move faster`,
        );

        for (const [width, height] of [
          [320, 180],
          [640, 180],
          [240, 240],
          [180, 320],
        ]) {
          for (const level of [0.1, 0.9]) {
            const result = await lab.page.evaluate(renderLook, {
              sceneId: "pulse",
              snapshot,
              level,
              width,
              height,
              frames: 30,
            });
            assert.ok(
              result.peak > 8,
              `form ${form}/${width}x${height}/${level}: blank`,
            );
            assert.equal(result.glError, 0);
            assert.equal(result.nonFinite, 0);
            assert.equal(result.stats.liveTextures, result.stats.textures);
            const file = `form-${form}-${width}x${height}-${level}.png`;
            await writeFile(
              resolve(out, file),
              Buffer.from(result.png, "base64"),
            );
            evidence.aspects.push({
              form,
              width,
              height,
              level,
              file,
              metrics: imageMetrics(result.rgba, width, height),
            });
          }
        }

        // Every palette endpoint contributes actual emissive shapes. Raw output
        // removes post colour/grain so hard-coded scene colours cannot pass.
        for (const endpoint of ["primary", "secondary", "accent"]) {
          const paletteSnapshot = structuredClone(snapshot);
          paletteSnapshot.palette = {
            primary: "#000000",
            secondary: "#000000",
            accent: "#000000",
          };
          paletteSnapshot.palette[endpoint] = "#ff0000";
          await lab.page.evaluate(renderLook, {
            sceneId: "pulse",
            snapshot: paletteSnapshot,
            level: 0.9,
            frames: 1,
            width: 160,
            height: 90,
            capture: false,
          });
          const response = await lab.page.evaluate(() => {
            const { engine } = window.__phosphorLab;
            engine.present(null, true);
            const gl = engine.gl,
              rgba = new Uint8Array(engine.width * engine.height * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.readPixels(
              0,
              0,
              engine.width,
              engine.height,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              rgba,
            );
            let red = 0,
              other = 0;
            for (let i = 0; i < rgba.length; i += 4) {
              red += rgba[i] / (255 * engine.width * engine.height);
              other = Math.max(other, rgba[i + 1], rgba[i + 2]);
            }
            return { red, other, glError: gl.getError() };
          });
          evidence.palette.push({ form, endpoint, ...response });
          assert.ok(
            response.red > 0.001,
            `form ${form}: unused ${endpoint} palette endpoint`,
          );
          assert.equal(
            response.other,
            0,
            `form ${form}: hard-coded colour outside the palette`,
          );
          assert.equal(response.glError, 0);
        }

        // Isolate scene geometry from the shared punch/pulse/flash and grain.
        // Zero travel holds time motion; cuts must still follow integer beats,
        // not a time hash or a fractional-beat flicker. White ink stresses coverage.
        const cutSnapshot = structuredClone(snapshot);
        cutSnapshot.params.speed = 0;
        cutSnapshot.params.step = 1;
        cutSnapshot.palette = {
          primary: "#ffffff",
          secondary: "#ffffff",
          accent: "#ffffff",
        };
        for (const level of [0.1, 0.95]) {
          await lab.page.evaluate(renderLook, {
            sceneId: "pulse",
            snapshot: cutSnapshot,
            level,
            frames: 1,
            width: 160,
            height: 90,
            capture: false,
          });
          const frames = await lab.page.evaluate(() => {
            const { engine } = window.__phosphorLab;
            const gl = engine.gl;
            const pixels = new Uint8Array(engine.width * engine.height * 4);
            return [0.01, 0.99, 1.01, 1.99, 2.01, 3.01, 4.01].map((beat) => {
              engine.beat = beat;
              engine.advance(0, false);
              engine.present(null, true);
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              gl.readPixels(
                0,
                0,
                engine.width,
                engine.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pixels,
              );
              return Array.from(pixels);
            });
          });
          const difference = (a, b) => {
            let sum = 0;
            for (let i = 0; i < a.length; i += 4)
              for (let c = 0; c < 3; c++) sum += Math.abs(a[i + c] - b[i + c]);
            return sum / (160 * 90 * 3 * 255);
          };
          const withinBeat = Math.max(
            difference(frames[0], frames[1]),
            difference(frames[2], frames[3]),
          );
          const onKick = difference(frames[1], frames[2]);
          const means = frames.map(
            (rgba) => imageMetrics(rgba, 160, 90).meanLuminance,
          );
          const meanRange = Math.max(...means) - Math.min(...means);
          evidence.cuts.push({
            form,
            level,
            withinBeat,
            onKick,
            meanRange,
            means,
          });
          assert.equal(
            withinBeat,
            0,
            `form ${form}: configuration flickers within a beat`,
          );
          assert.equal(
            difference(frames[0], frames[6]),
            0,
            `form ${form}: four-beat configuration must repeat`,
          );
          if (level < 0.8)
            assert.equal(
              onKick,
              0,
              `form ${form}: cuts must unlock only at peak`,
            );
          else
            assert.ok(
              onKick > 0.02,
              `form ${form}: missing kick-cut geometry (${onKick})`,
            );
          assert.ok(
            meanRange < 0.1,
            `form ${form}: white-ink cut changes mean luminance by ${meanRange}`,
          );
        }

        await lab.page.evaluate(renderLook, {
          sceneId: "pulse",
          snapshot,
          level: 0.95,
          frames: 1,
          width: 160,
          height: 90,
          capture: false,
        });
        const trace = await lab.page.evaluate(async () => {
          const { engine } = window.__phosphorLab;
          const gl = engine.gl,
            pixels = new Uint8Array(engine.width * engine.height * 4);
          const linear = new Float64Array(256);
          for (let byte = 0; byte < 256; byte++) {
            const value = byte / 255;
            linear[byte] =
              value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4;
          }
          const read = () => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.readPixels(
              0,
              0,
              engine.width,
              engine.height,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixels,
            );
            return pixels;
          };
          const mean = (rgba) => {
            let sum = 0;
            for (let i = 0; i < rgba.length; i += 4)
              sum +=
                0.2126 * linear[rgba[i]] +
                0.7152 * linear[rgba[i + 1]] +
                0.0722 * linear[rgba[i + 2]];
            return sum / (rgba.length / 4);
          };
          engine.beat = 0;
          engine.updatePerformance(0, false);
          engine.beatFx.flash = 0;
          engine.present();
          const kick = Array.from(read()),
            weights = { ...engine.beatFx };
          engine.beatFx.punch = engine.beatFx.pulse = 0;
          engine.present();
          const neutral = Array.from(read());
          engine.options.flashLimit = true;
          // renderLook deliberately bypasses the limiter for stills. Enter
          // through the real blackout path so this models a show's known-black
          // startup, not an unknown baseline after unlimited diagnostic frames.
          engine.blackoutTarget = 1;
          engine.present();
          const startupMean = mean(read());
          engine.blackoutTarget = 0;
          engine.blackout = 0;
          const samples = [{ time: 0, y: startupMean }],
            requests = [];
          let previousBeat = -1,
            previousTime = 0;
          const start = performance.now();
          while (performance.now() - start < 4000) {
            await new Promise(requestAnimationFrame);
            const time = (performance.now() - start) / 1000;
            engine.beat = time * 2.5; // 150 BPM at the normal speed trim.
            engine.advance(time - previousTime, false);
            previousTime = time;
            const beat = Math.floor(engine.beat);
            if (beat !== previousBeat) requests.push(time);
            previousBeat = beat;
            samples.push({ time, y: mean(read()) });
          }
          engine.options.flashLimit = false;
          let difference = 0;
          for (let i = 0; i < kick.length; i += 4)
            for (let c = 0; c < 3; c++)
              difference += Math.abs(kick[i + c] - neutral[i + c]);
          return {
            difference: difference / (pixels.length * 0.75 * 255),
            weights,
            samples,
            requests,
            glError: gl.getError(),
            nonFinite: engine.counters.nonFinite,
            stats: engine.stats(),
          };
        });
        const transitions = [];
        let start = trace.samples[0].y,
          previous = start,
          sign = 0,
          counted = false;
        for (const { time, y } of trace.samples.slice(1)) {
          const nextSign = Math.sign(y - previous);
          if (nextSign && nextSign !== sign) {
            start = previous;
            sign = nextSign;
            counted = false;
          }
          if (
            !counted &&
            sign &&
            Math.abs(y - start) >= 0.1 &&
            Math.min(y, start) < 0.8
          ) {
            transitions.push(time);
            counted = true;
          }
          previous = y;
        }
        const maxWindow = (times) =>
          Math.max(
            0,
            ...times.map(
              (time) => times.filter((t) => t > time - 1 && t <= time).length,
            ),
          );
        const maxTransitions = maxWindow(transitions),
          maxRequests = maxWindow(trace.requests);
        evidence.beats.push({ form, ...trace, maxTransitions, maxRequests });
        assert.equal(
          trace.samples[0].y,
          0,
          "limited trace must start on actual black",
        );
        assert.ok(
          trace.difference > 0.005,
          `form ${form}: missing shared kick`,
        );
        assert.ok(
          maxRequests <= 3,
          `form ${form}: excessive automatic requests`,
        );
        assert.ok(
          maxTransitions <= 6,
          `form ${form}: ${maxTransitions} flash transitions/s`,
        );
        assert.equal(trace.glError, 0);
        assert.equal(trace.nonFinite, 0);
        assert.equal(trace.stats.liveTextures, trace.stats.textures);
      }

      for (let index = 0; index < pulse.presets.length; index++) {
        for (const level of [0.1, 0.5, 0.9]) {
          for (const direction of [-1, 1]) {
            const snapshot = presetSnapshot(pulse, index);
            for (const def of pulse.schema) {
              if (def.step === 1) continue;
              snapshot.params[def.key] = Math.max(
                def.min,
                Math.min(
                  def.max,
                  snapshot.params[def.key] +
                    direction * 0.12 * (def.max - def.min),
                ),
              );
            }
            const result = await lab.page.evaluate(renderLook, {
              sceneId: "pulse",
              snapshot,
              level,
              frames: 20,
              width: 160,
              height: 90,
              capture: false,
            });
            assert.ok(
              result.peak > 8,
              `${index}/${level}/${direction}: blank drift`,
            );
            assert.equal(result.glError, 0);
            assert.equal(result.nonFinite, 0);
            assert.equal(result.stats.liveTextures, result.stats.textures);
            evidence.drift.push({
              preset: pulse.presets[index].name,
              level,
              direction,
              peak: result.peak,
            });
          }
        }
      }

      if (args.matrix) {
        const directory = resolve(args.matrix);
        const sheet = JSON.parse(
          await readFile(resolve(directory, "metrics.json"), "utf8"),
        );
        const signatures = [];
        for (const row of sheet.rows) {
          if (row.sceneId === "pulse") {
            // Never certify current Pulse from an old PNG. Reuse the retained,
            // unchanged other-family references, but render every Pulse form live.
            const frame = await lab.page.evaluate(
              async (args) => {
                const { renderLook } =
                  await import("/tests/browser/client.mjs");
                const { structureSignature } =
                  await import("/tests/browser/metrics.mjs");
                const result = await renderLook(args);
                return {
                  signature: structureSignature(
                    result.rgba,
                    result.width,
                    result.height,
                  ),
                  png: result.png,
                  peak: result.peak,
                  glError: result.glError,
                  nonFinite: result.nonFinite,
                };
              },
              {
                sceneId: "pulse",
                snapshot: row.snapshot,
                level: 0.5,
                width: sheet.width,
                height: sheet.height,
                frames: sheet.frames,
                gray: true,
              },
            );
            assert.ok(frame.peak > 8);
            assert.equal(frame.glError, 0);
            assert.equal(frame.nonFinite, 0);
            const file = `cross-pulse-${row.index}.png`;
            await writeFile(
              resolve(out, file),
              Buffer.from(frame.png, "base64"),
            );
            evidence.crossFrames.push({
              form: row.name,
              file,
              width: sheet.width,
              height: sheet.height,
              frames: sheet.frames,
            });
            signatures.push(frame.signature);
            continue;
          }
          const png = await readFile(resolve(directory, row.cells[0].file));
          signatures.push(
            await lab.page.evaluate(async (base64) => {
              const { structureSignature } =
                await import("/tests/browser/metrics.mjs");
              const image = new Image();
              image.src = `data:image/png;base64,${base64}`;
              await image.decode();
              const canvas = document.createElement("canvas");
              canvas.width = image.width;
              canvas.height = image.height;
              const context = canvas.getContext("2d");
              context.drawImage(image, 0, 0);
              return structureSignature(
                context.getImageData(0, 0, image.width, image.height).data,
                image.width,
                image.height,
              );
            }, png.toString("base64")),
          );
        }
        for (let i = 0; i < sheet.rows.length; i++) {
          const row = sheet.rows[i];
          if (row.sceneId !== "pulse") continue;
          const candidates = [];
          for (let j = 0; j < sheet.rows.length; j++) {
            if (i === j) continue;
            const other = sheet.rows[j];
            const distance = structureDistance(signatures[i], signatures[j]);
            if (other.sceneId === "pulse" && j > i) {
              evidence.distances.push({ a: row.name, b: other.name, distance });
              assert.ok(
                distance >= 0.25,
                `${row.name}/${other.name}: ${distance}`,
              );
            } else if (other.sceneId !== "pulse") {
              candidates.push({
                family: other.sceneId,
                type: other.name,
                distance,
              });
              if (distance < 0.25)
                evidence.nearPairs.push({
                  a: `Pulse Geometry · ${row.name}`,
                  b: `${other.sceneName} · ${other.name}`,
                  distance,
                  sameFamily: false,
                });
            }
          }
          candidates.sort((a, b) => a.distance - b.distance);
          if (candidates.length)
            evidence.nearest.push({ form: row.name, ...candidates[0] });
        }
        evidence.nearPairs.sort((a, b) => a.distance - b.distance);
      }
      assert.deepEqual(lab.errors, []);
      await lab.context.close();
    } finally {
      await writeFile(
        resolve(out, "metrics.json"),
        JSON.stringify(evidence, null, 2),
      );
      await runtime?.stop();
      await server.close();
    }
  },
);
