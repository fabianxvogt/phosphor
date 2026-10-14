import test from "node:test";
import assert from "node:assert/strict";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";
import { renderLook } from "./client.mjs";

test(
  "GPU data caches preserve exact maps, refresh paused draws and recover",
  {
    skip: process.env.PHOSPHOR_PRECOMPUTE_GPU !== "1",
    timeout: 120000,
  },
  async () => {
    const server = await serve(".", 48139);
    const runtime = await launch({ rig: true, headless: true });
    try {
      for (const fallback of [false, true]) {
        const { page, context, errors } = await openLab(
          {
            newContext: async (options) => {
              const context = await runtime.browser.newContext(options);
              if (fallback)
                await context.addInitScript(() => {
                  const original =
                    WebGL2RenderingContext.prototype.getExtension;
                  WebGL2RenderingContext.prototype.getExtension = function (
                    name,
                  ) {
                    return name === "EXT_color_buffer_float"
                      ? null
                      : original.call(this, name);
                  };
                });
              return context;
            },
          },
          server.url,
        );
        for (const sceneId of [
          "hilbert",
          "mandelbrot",
          "voronoi",
          "cathedral",
          "fourspace",
          "wallpaper",
          "domain",
        ]) {
          const health = await page.evaluate(renderLook, {
            sceneId,
            index: 0,
            width: 256,
            height: 144,
            frames: 4,
            level: 0.95,
            capture: false,
            pollHealth: false,
          });
          assert.equal(health.glError, 0);
          assert.equal(health.nonFinite, 0);
          assert.ok(health.peak > 0);
          const result = await page.evaluate(() => {
            const { engine } = window.__phosphorLab;
            const slot = engine.slots.at(-1);
            return {
              cached: !!slot.precompute,
              accounted: engine.liveTextures === engine.stats().textures,
            };
          });
          assert.equal(result.cached, !fallback);
          assert.equal(result.accounted, true);
        }
        if (!fallback) {
          const result = await page.evaluate(async () => {
            const { engine, scenes, presetSnapshot } = window.__phosphorLab;
            const gl = engine.gl;
            const check = (condition, message) => {
              if (!condition) throw Error(message);
            };
            const load = async (id, index = 0) => {
              engine.load(
                presetSnapshot(
                  scenes.find((s) => s.id === id),
                  index,
                ),
                0,
              );
              check(await engine.ready(id), `${id} compilation`);
              while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
              engine.advance(1 / 60);
              check(
                engine.liveTextures === engine.stats().textures,
                `${id} texture accounting`,
              );
              return engine.slots.at(-1);
            };
            const data = (slot) => {
              const t = slot.precompute;
              const pixels = new Float32Array(t.w * t.h * 4);
              gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
              gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.FLOAT, pixels);
              check(gl.getError() === 0, "float readback");
              return pixels;
            };
            // Every stored orbit value is the same float32 decoded by the old
            // picture shader, including each of the five escape-time maps.
            let orbitValues = 0;
            for (const index of [0, 5, 7, 8, 9]) {
              const slot = await load("mandelbrot", index);
              const cache = data(slot),
                state = slot.sim[slot.si];
              const bytes = new Uint8Array(state.w * state.h * 4);
              gl.bindFramebuffer(gl.FRAMEBUFFER, state.fbo);
              gl.readPixels(
                0,
                0,
                state.w,
                state.h,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                bytes,
              );
              const view = new DataView(bytes.buffer);
              for (let m = 0; m < 256; m++)
                for (let axis = 0; axis < 2; axis++) {
                  const offset =
                    ((1 + (m >> 6) + axis * 4) * 64 + (m & 63)) * 4;
                  check(
                    cache[m * 4 + axis] === view.getFloat32(offset, true),
                    `orbit ${index}:${m}:${axis}`,
                  );
                  orbitValues++;
                }
            }
            // Check both cached map directions and the parent order against the
            // independent CPU maps at every order the visual schedule can use.
            const maps = await import("/scene-hilbert.mjs");
            const d2xy = [maps.hilbertD2xy, maps.mooreD2xy, maps.peanoD2xy];
            const xy2d = [maps.hilbertXy2d, maps.mooreXy2d, maps.peanoXy2d];
            const slot = await load("hilbert");
            let mapCells = 0;
            for (let kind = 0; kind < 3; kind++) {
              const lo = kind === 1 ? 2 : 1,
                max = kind === 2 ? 4 : 7;
              slot.snapshot.params.variant = kind;
              slot.snapshot.params.order = max;
              for (let order = lo + 1; order <= max; order++) {
                slot.rhythm.counts[2] = order - lo - 1;
                slot.rhythm.values[2] = 0.2;
                engine.uniformFrame++;
                engine.drawSlot(slot, 1 / 60);
                const pixels = data(slot);
                for (const o of [order, order - 1]) {
                  const n = (kind === 2 ? 3 : 2) ** o,
                    arg = kind === 2 ? o : n;
                  for (let d = 0; d < n * n; d++) {
                    const xy = d2xy[kind](arg, d);
                    const row = o === order ? 128 : 256;
                    const at = (row * 128 + d) * 4;
                    check(
                      pixels[at] === xy[0] && pixels[at + 1] === xy[1],
                      `d2xy ${kind}:${o}:${d}`,
                    );
                    if (o === order) {
                      const cell = [d % n, Math.floor(d / n)];
                      check(
                        pixels[(cell[1] * 128 + cell[0]) * 4] ===
                          xy2d[kind](arg, cell),
                        `xy2d ${kind}:${o}:${d}`,
                      );
                    }
                    mapCells++;
                  }
                }
              }
            }
            const sites = await load("voronoi", 7);
            const before = data(sites);
            const tick = sites.tick;
            sites.time += 7;
            engine.uniformFrame++;
            engine.drawSlot(sites, 0);
            const after = data(sites);
            check(sites.tick === tick, "paused data pass advanced simulation");
            check(
              after.some((value, i) => value !== before[i]),
              "paused data was stale",
            );
            const ext = gl.getExtension("WEBGL_lose_context");
            await new Promise((resolve) => {
              engine.canvas.addEventListener("webglcontextlost", resolve, {
                once: true,
              });
              ext.loseContext();
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            await new Promise((resolve) => {
              engine.canvas.addEventListener("webglcontextrestored", resolve, {
                once: true,
              });
              ext.restoreContext();
            });
            check(await engine.ready("voronoi"), "restored compilation");
            engine.advance(1 / 60);
            check(!!engine.slots.at(-1).precompute, "restored data target");
            check(
              engine.liveTextures === engine.stats().textures,
              "restored texture accounting",
            );
            check(gl.getError() === 0, "restored GL error");
            engine.dispose();
            check(engine.liveTextures === 0, "data texture leak after dispose");
            return { orbitValues, mapCells };
          });
          console.log(result);
          assert.equal(result.orbitValues, 2560);
          assert.ok(result.mapCells > 50000);
        } else {
          assert.equal(
            await page.evaluate(() => {
              const { engine } = window.__phosphorLab;
              engine.dispose();
              return engine.liveTextures;
            }),
            0,
          );
        }
        assert.deepEqual(errors, []);
        await context.close();
      }
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
