import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";
import { renderLook } from "./client.mjs";

test(
  "opt-in half-float linear data cache, default exact caches, fallback and restoration",
  {
    skip: process.env.PHOSPHOR_INK_GPU !== "1",
    timeout: 180000,
  },
  async () => {
    const server = await serve(".", 48507),
      runtime = await launch({ rig: true, headless: true });
    const source = await readFile(
      new URL("../../scene-ink.mjs", import.meta.url),
      "utf8",
    );
    const images = [];
    try {
      for (const mode of [
        "half",
        "half-no-float-linear",
        "no-float-targets",
        "float32-no-float-linear",
      ]) {
        const lab = await openLab(
          {
            newContext: async (options) => {
              const context = await runtime.browser.newContext(options);
              await context.addInitScript(
                ({ mode }) => {
                  const proto = WebGL2RenderingContext.prototype;
                  const extension = proto.getExtension,
                    allocate = proto.texImage2D;
                  window.__inkAllocations = [];
                  proto.getExtension = function (name) {
                    if (mode !== "half" && name === "OES_texture_float_linear")
                      return null;
                    if (
                      mode === "no-float-targets" &&
                      name === "EXT_color_buffer_float"
                    )
                      return null;
                    return extension.call(this, name);
                  };
                  proto.texImage2D = function (...args) {
                    window.__inkAllocations.push({
                      format: args[2],
                      width: args[3],
                      height: args[4],
                      type: args[7],
                    });
                    return allocate.apply(this, args);
                  };
                },
                { mode },
              );
              if (mode === "float32-no-float-linear")
                await context.route("**/scene-ink.mjs", (route) =>
                  route.fulfill({
                    contentType: "text/javascript",
                    body: source.replace('format: "rgba16f",', ""),
                  }),
                );
              return context;
            },
          },
          server.url,
        );
        const result = await lab.page.evaluate(renderLook, {
          sceneId: "ink",
          index: 1,
          frames: 2,
          level: 0.5,
          width: 256,
          height: 144,
          pollHealth: false,
        });
        assert.equal(result.glError, 0);
        assert.equal(result.nonFinite, 0);
        assert.ok(result.peak > 40);
        images.push({ mode, rgba: result.rgba });
        const state = await lab.page.evaluate(() => {
          const { engine } = window.__phosphorLab,
            gl = engine.gl;
          const slot = engine.slots.at(-1),
            texture = slot.precompute;
          if (texture) gl.bindTexture(gl.TEXTURE_2D, texture.texture);
          return {
            cached: !!texture,
            filter: texture
              ? gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER)
              : null,
            linear: gl.LINEAR,
            allocations: window.__inkAllocations.filter((t) => {
              const [w, h] = slot.scene.precompute.size;
              return t.width === w && t.height === h;
            }),
            half: gl.RGBA16F,
            halfType: gl.HALF_FLOAT,
            accounted: engine.liveTextures === engine.stats().textures,
          };
        });
        const cached = mode.startsWith("half");
        assert.equal(state.cached, cached);
        assert.equal(state.accounted, true);
        if (cached) {
          assert.equal(state.filter, state.linear);
          assert.ok(state.allocations.length > 0);
          assert.ok(
            state.allocations.every(
              (a) => a.format === state.half && a.type === state.halfType,
            ),
          );
        }
        if (mode === "half") {
          const checks = await lab.page.evaluate(async () => {
            const { engine } = window.__phosphorLab,
              gl = engine.gl,
              slot = engine.slots.at(-1);
            const sample = () => {
              gl.bindFramebuffer(gl.FRAMEBUFFER, slot.precompute.fbo);
              const { w, h } = slot.precompute;
              const p = new Float32Array(w * h * 4);
              gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, p);
              return p;
            };
            const before = sample(),
              tick = slot.tick;
            slot.time += 1.7;
            engine.uniformFrame++;
            engine.drawSlot(slot, 0);
            const after = sample();
            const refreshed = after.some((v, i) => v !== before[i]);
            const paused = slot.tick === tick;
            const ext = gl.getExtension("WEBGL_lose_context");
            await new Promise((done) => {
              engine.canvas.addEventListener("webglcontextlost", done, {
                once: true,
              });
              ext.loseContext();
            });
            await new Promise((done) => setTimeout(done, 100));
            await new Promise((done) => {
              engine.canvas.addEventListener("webglcontextrestored", done, {
                once: true,
              });
              ext.restoreContext();
            });
            const ready = await engine.ready("ink");
            engine.advance(1 / 60);
            return {
              refreshed,
              paused,
              ready,
              restored: !!engine.slots.at(-1).precompute,
              error: gl.getError(),
              accounted: engine.liveTextures === engine.stats().textures,
            };
          });
          assert.deepEqual(checks, {
            refreshed: true,
            paused: true,
            ready: true,
            restored: true,
            error: 0,
            accounted: true,
          });
        }
        // An unchanged exact-map scene must retain nearest RGBA32F even when
        // float-linear support is missing. No existing family's output changes.
        if (mode === "half-no-float-linear") {
          const health = await lab.page.evaluate(renderLook, {
            sceneId: "mandelbrot",
            frames: 2,
            width: 64,
            height: 36,
            capture: false,
            pollHealth: false,
          });
          assert.equal(health.glError, 0);
          const exact = await lab.page.evaluate(() => {
            const { engine } = window.__phosphorLab,
              gl = engine.gl,
              t = engine.slots.at(-1).precompute;
            gl.bindTexture(gl.TEXTURE_2D, t.texture);
            return {
              cached: !!t,
              nearest:
                gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER) ===
                gl.NEAREST,
              fullFloat: window.__inkAllocations.some(
                (a) =>
                  a.width === t.w &&
                  a.height === t.h &&
                  a.format === gl.RGBA32F &&
                  a.type === gl.FLOAT,
              ),
            };
          });
          assert.deepEqual(exact, {
            cached: true,
            nearest: true,
            fullFloat: true,
          });
        }
        assert.equal(
          await lab.page.evaluate(() => {
            const { engine } = window.__phosphorLab;
            engine.dispose();
            return engine.liveTextures;
          }),
          0,
        );
        assert.deepEqual(lab.errors, []);
        await lab.context.close();
      }
      for (const image of images.slice(1)) {
        let error = 0;
        for (let i = 0; i < image.rgba.length; i++)
          if (i % 4 !== 3) error += Math.abs(images[0].rgba[i] - image.rgba[i]);
        const mean = error / (image.rgba.length * 0.75);
        // Density reconstruction and the byte fallback are approximate, not
        // exact images; this gate prevents black/incomplete float textures.
        assert.ok(mean < 4, `${image.mode}: ${mean} mean levels`);
        console.log(
          `${image.mode}: ${mean.toFixed(4)} mean levels vs half cache`,
        );
      }
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
