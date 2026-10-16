import test from "node:test";
import assert from "node:assert/strict";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";
import { renderLook } from "./client.mjs";

test(
  "optional linear float data: interpolation fallback, paused refresh, restoration and legacy defaults",
  {
    skip: process.env.PHOSPHOR_STORM_GPU !== "1",
    timeout: 180000,
  },
  async () => {
    const server = await serve(".", Number(process.env.PHOSPHOR_PORT ?? 48502));
    const runtime = await launch({ rig: true, headless: true });
    let native = null;
    try {
      for (const mode of ["native", "nearest", "uncached"]) {
        const lab = await openLab(
          {
            newContext: async (options) => {
              const context = await runtime.browser.newContext(options);
              if (mode !== "native")
                await context.addInitScript((mode) => {
                  const get = WebGL2RenderingContext.prototype.getExtension;
                  WebGL2RenderingContext.prototype.getExtension = function (
                    name,
                  ) {
                    if (
                      name ===
                      (mode === "nearest"
                        ? "OES_texture_float_linear"
                        : "EXT_color_buffer_float")
                    )
                      return null;
                    return get.call(this, name);
                  };
                }, mode);
              return context;
            },
          },
          server.url,
        );
        const shot = await lab.page.evaluate(renderLook, {
          sceneId: "storm",
          index: 2,
          width: 192,
          height: 108,
          frames: 2,
          level: 0.7,
          pollHealth: false,
        });
        assert.equal(shot.glError, 0);
        assert.equal(shot.nonFinite, 0);
        assert.ok(shot.peak > 20);
        const state = await lab.page.evaluate(() => {
          const { engine } = window.__phosphorLab,
            gl = engine.gl,
            slot = engine.slots.at(-1);
          let linear = null,
            refreshed = null;
          if (slot.precompute) {
            gl.bindTexture(gl.TEXTURE_2D, slot.precompute.texture);
            linear =
              gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER) ===
              gl.LINEAR;
            const data = () => {
              gl.bindFramebuffer(gl.FRAMEBUFFER, slot.precompute.fbo);
              const b = new Float32Array(128 * 80 * 4);
              gl.readPixels(0, 35 + 2 * 80, 128, 80, gl.RGBA, gl.FLOAT, b);
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              return b;
            };
            const before = data(),
              tick = slot.tick;
            slot.time += 3;
            engine.uniformFrame++;
            engine.drawSlot(slot, 0);
            const after = data();
            refreshed =
              slot.tick === tick && after.some((v, i) => v !== before[i]);
          }
          return {
            cached: !!slot.precompute,
            linear,
            refreshed,
            accounted: engine.liveTextures === engine.stats().textures,
            error: gl.getError(),
          };
        });
        assert.equal(state.cached, mode !== "uncached");
        assert.equal(state.error, 0);
        assert.equal(state.accounted, true);
        if (mode !== "uncached") {
          assert.equal(state.linear, mode === "native");
          assert.equal(state.refreshed, true);
        }
        if (mode === "native") native = shot.rgba;
        else if (mode === "nearest") {
          const differences = shot.rgba.map((v, i) => Math.abs(v - native[i]));
          const max = Math.max(...differences),
            mean = differences.reduce((a, b) => a + b, 0) / differences.length;
          // Hardware interpolation has implementation-defined subtexel precision;
          // the empty-space skip and bisected cloud entry are threshold
          // decisions on the interpolated field, so a few boundary pixels may
          // step differently. Permit sparse small outliers, never a widespread
          // picture difference.
          const outliers =
            differences.filter((d) => d > 2).length / differences.length;
          console.log(JSON.stringify({ mode, max, mean, outliers }));
          assert.ok(
            max <= 4 && mean < 0.02 && outliers < 1e-4,
            `${mode}: max=${max} mean=${mean} outliers=${outliers}`,
          );
        }
        if (mode === "native") {
          const restored = await lab.page.evaluate(async () => {
            const { engine } = window.__phosphorLab,
              gl = engine.gl,
              ext = gl.getExtension("WEBGL_lose_context");
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
            await engine.ready("storm");
            engine.advance(1 / 60, false);
            const slot = engine.slots.at(-1);
            gl.bindTexture(gl.TEXTURE_2D, slot.precompute.texture);
            return {
              linear:
                gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER) ===
                gl.LINEAR,
              accounted: engine.liveTextures === engine.stats().textures,
              error: gl.getError(),
            };
          });
          assert.deepEqual(restored, {
            linear: true,
            accounted: true,
            error: 0,
          });
        }
        await lab.page.evaluate(renderLook, {
          sceneId: "hilbert",
          width: 192,
          height: 108,
          frames: 1,
          capture: false,
          pollHealth: false,
        });
        const legacy = await lab.page.evaluate(() => {
          const { engine } = window.__phosphorLab,
            gl = engine.gl,
            t = engine.slots.at(-1).precompute;
          if (!t) return null;
          gl.bindTexture(gl.TEXTURE_2D, t.texture);
          return (
            gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER) ===
            gl.NEAREST
          );
        });
        assert.equal(legacy, mode === "uncached" ? null : true);
        assert.deepEqual(lab.errors, []);
        await lab.context.close();
      }
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
