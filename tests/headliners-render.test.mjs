import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import flight from "../scene-flight.mjs";
import cathedral from "../scene-cathedral.mjs";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "../scripts/browser-runtime.mjs";
import { renderLook } from "./browser/client.mjs";
import { imageMetrics } from "./browser/metrics.mjs";

// The public render seam exercises the actual family shaders, not GLSL text.
// Opt in with --port; --quick retains the fixed-time audio/palette/kick checks.
test("headliners retain their energy mappings at full output resolution", () => {
  for (const scene of [flight, cathedral]) {
    assert.equal(scene.energy.glow, undefined, "energy is not a master gain");
    assert.ok(scene.energy.speed);
  }
});

test(
  "headliners map capped low-band accents, palettes and native-aspect cameras",
  {
    skip: !process.argv.includes("--port"),
    timeout: 1200000,
  },
  async () => {
    const args = options({
      quick: { type: "boolean", default: false },
      width: { type: "string", default: "320" },
      height: { type: "string", default: "180" },
    });
    const aspectWidth = Number(args.width),
      aspectHeight = Number(args.height);
    assert.ok(Number.isInteger(aspectWidth) && aspectWidth > 0);
    assert.ok(Number.isInteger(aspectHeight) && aspectHeight > 0);
    assert.equal(args.rig, false, "render probes do not claim rig timing");
    const out = await outputDirectory("contact/headliners-probes", args.out);
    const server = await serve(".", args.port);
    const runtime = await launch();
    const evidence = [];
    try {
      const lab = await openLab(runtime.browser, server.url);
      for (const scene of [flight, cathedral]) {
        for (const type of scene.type.values) {
          const preset = scene.presets.findIndex(
            (p) => p.params[scene.type.key] === type,
          );
          await lab.page.evaluate(() => {
            window.__phosphorLab.engine.rayStepBudget = 96;
          });
          await lab.page.evaluate(renderLook, {
            sceneId: scene.id,
            index: preset,
            level: 0.9,
            frames: 2,
            width: 160,
            height: 90,
            capture: false,
          });
          const hero = await lab.page.evaluate(() => {
            const { engine } = window.__phosphorLab;
            const slot = engine.slots.at(-1);
            engine.options.bloom = 0;
            const capture = (bass, beat) => {
              Object.assign(engine.features, {
                low: bass,
                active: bass > 0,
                locked: bass > 0,
              });
              engine.beat = beat;
              // Settle both the bounded heroes and the two-second clock
              // hand-back without advancing the ray-camera simulation.
              for (let i = 0; i < 60; i++)
                engine.updatePerformance(0.05, false);
              engine.uniformFrame++;
              engine.drawSlot(slot, 0);
              const target = slot.visual[slot.vi];
              const rgba = new Uint8Array(target.w * target.h * 4);
              // Blit float or byte visuals into the byte canvas before readback.
              engine.gl.bindFramebuffer(engine.gl.READ_FRAMEBUFFER, target.fbo);
              engine.gl.bindFramebuffer(engine.gl.DRAW_FRAMEBUFFER, null);
              engine.gl.blitFramebuffer(
                0,
                0,
                target.w,
                target.h,
                0,
                0,
                target.w,
                target.h,
                engine.gl.COLOR_BUFFER_BIT,
                engine.gl.NEAREST,
              );
              engine.gl.bindFramebuffer(engine.gl.FRAMEBUFFER, null);
              engine.gl.readPixels(
                0,
                0,
                target.w,
                target.h,
                engine.gl.RGBA,
                engine.gl.UNSIGNED_BYTE,
                rgba,
              );
              return { rgba, glError: engine.gl.getError() };
            };
            const rest = capture(0, 0.5),
              bass = capture(1, 0.5),
              capped = capture(4, 0.5);
            const kick = capture(0, 1);
            const delta = (a, b) => {
              let sum = 0;
              for (let i = 0; i < a.length; i++)
                if (i % 4 !== 3) sum += Math.abs(a[i] - b[i]);
              return sum / ((a.length / 4) * 3 * 255);
            };
            const warm = {
              primary: "#ff7028",
              secondary: "#ba2517",
              accent: "#ffd07a",
            };
            const cool = {
              primary: "#197bff",
              secondary: "#183cba",
              accent: "#40dcff",
            };
            const paletteFrame = (palette) => {
              engine.setSnapshot({ ...slot.snapshot, palette });
              return capture(0, 0.5);
            };
            const copper = paletteFrame(warm),
              ice = paletteFrame(cool);
            return {
              bassDelta: delta(rest.rgba, bass.rgba),
              capDelta: delta(bass.rgba, capped.rgba),
              kickDelta: delta(rest.rgba, kick.rgba),
              paletteDelta: delta(copper.rgba, ice.rgba),
              glErrors: [rest, bass, capped, kick, copper, ice].map(
                (r) => r.glError,
              ),
              nonFinite:
                engine.counters.nonFinite + window.__harness.nonFiniteUploads,
            };
          });
          evidence.push({ family: scene.id, type, hero });
          assert.ok(
            hero.bassDelta > 0.0005,
            `${scene.id}/${type}: low-band accent invisible (${hero.bassDelta})`,
          );
          assert.equal(
            hero.capDelta,
            0,
            `${scene.id}/${type}: low-band response is not capped`,
          );
          assert.ok(
            hero.kickDelta > 0.0005,
            `${scene.id}/${type}: ray-camera kick invisible`,
          );
          const paletteFloor = scene.id === "cathedral" ? 0.065 : 0.02;
          assert.ok(
            hero.paletteDelta > paletteFloor,
            `${scene.id}/${type}: library palette does not read`,
          );
          assert.deepEqual(hero.glErrors, [0, 0, 0, 0, 0, 0]);
          assert.equal(hero.nonFinite, 0);
          if (args.quick) continue;
          const square = Math.round((aspectHeight * 4) / 3);
          for (const [width, height] of [
            [aspectWidth, aspectHeight],
            [aspectWidth * 2, aspectHeight],
            [square, square],
          ]) {
            for (const steps of [96, 64, 40]) {
              await lab.page.evaluate((steps) => {
                window.__phosphorLab.engine.rayStepBudget = steps;
              }, steps);
              const r = await lab.page.evaluate(renderLook, {
                sceneId: scene.id,
                index: preset,
                level: 0.9,
                frames: 2,
                width,
                height,
              });
              assert.ok(
                r.peak > 8,
                `${scene.id}/${type}/${width}x${height}/${steps}: blank`,
              );
              assert.equal(r.glError, 0);
              assert.equal(r.nonFinite, 0);
              assert.equal(r.stats.liveTextures, r.stats.textures);
              const file = `${scene.id}-${type}-${width}x${height}-${steps}.png`;
              await writeFile(resolve(out, file), Buffer.from(r.png, "base64"));
              evidence.push({
                family: scene.id,
                type,
                width,
                height,
                steps,
                file,
                metrics: imageMetrics(r.rgba, width, height),
              });
            }
          }
        }
        // Full HD shading must preserve the output dimensions.
        const capped = await lab.page.evaluate(renderLook, {
          sceneId: scene.id,
          index: 0,
          level: 0.5,
          frames: 0,
          width: 1920,
          height: 360,
          capture: false,
        });
        assert.equal(capped.glError, 0);
        const size = await lab.page.evaluate(() => {
          const { engine } = window.__phosphorLab;
          const target = engine.slots.at(-1).visual[0];
          return [target.w, target.h];
        });
        assert.deepEqual(size, [1920, 360]);
        if (scene.id === "cathedral") {
          const motion = await lab.page.evaluate(() => {
            const { engine } = window.__phosphorLab;
            const slot = engine.slots.at(-1);
            slot.baseLevel = engine.level;
            const capture = () => {
              engine.uniformFrame++;
              engine.drawSlot(slot, 0);
              const target = slot.visual[slot.vi];
              const data = new Uint8Array(target.w * target.h * 4);
              engine.gl.bindFramebuffer(engine.gl.READ_FRAMEBUFFER, target.fbo);
              engine.gl.bindFramebuffer(engine.gl.DRAW_FRAMEBUFFER, null);
              engine.gl.blitFramebuffer(
                0,
                0,
                target.w,
                target.h,
                0,
                0,
                target.w,
                target.h,
                engine.gl.COLOR_BUFFER_BIT,
                engine.gl.NEAREST,
              );
              engine.gl.bindFramebuffer(engine.gl.FRAMEBUFFER, null);
              engine.gl.readPixels(
                0,
                0,
                target.w,
                target.h,
                engine.gl.RGBA,
                engine.gl.UNSIGNED_BYTE,
                data,
              );
              return data;
            };
            const delta = (a, b) => {
              let sum = 0;
              for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
              return sum;
            };
            slot.snapshot.params.speed = 0;
            const still = capture();
            for (let i = 0; i < 30; i++) engine.tickSlot(slot, 1 / 60);
            const held = capture();
            slot.time = 300;
            const late = capture();
            slot.snapshot.params.speed = 0.01;
            const glide = capture();
            for (let i = 0; i < 30; i++) engine.tickSlot(slot, 1 / 60);
            return {
              stillDelta: delta(still, held),
              glideDelta: delta(late, glide),
              slowDelta: delta(glide, capture()),
            };
          });
          assert.equal(motion.stillDelta, 0, "zero speed must hold the camera");
          assert.equal(
            motion.glideDelta,
            0,
            "a late speed glide must not teleport",
          );
          assert.ok(motion.slowDelta > 0, "sub-quantum speeds must integrate");
          evidence.push({ family: scene.id, motion });
        }
      }
      assert.deepEqual(lab.errors, []);
      assert.deepEqual(
        await lab.page.evaluate(() => window.__phosphorLab.errors),
        [],
      );
      console.log(
        JSON.stringify(
          evidence.filter((r) => r.hero),
          null,
          2,
        ),
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
