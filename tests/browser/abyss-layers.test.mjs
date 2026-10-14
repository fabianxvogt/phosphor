import test from "node:test";
import assert from "node:assert/strict";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";
import { renderLook } from "./client.mjs";

// Optional engine paths used by Bioluminescent Abyss: an additive mesh tail
// (geometry.additiveFrom) and depth-tested particles (particles.depth).
// Native GPU: PHOSPHOR_HEADLESS_RIG=1 PHOSPHOR_ABYSS_GPU=1 node --test tests/browser/abyss-layers.test.mjs
test(
  "additive mesh tail and depth-tested particles restore GL state and change the picture",
  { skip: process.env.PHOSPHOR_ABYSS_GPU !== "1", timeout: 180000 },
  async () => {
    const server = await serve(".", 48338);
    const runtime = await launch({ rig: true });
    try {
      const { page, errors } = await openLab(runtime.browser, server.url);
      const health = await page.evaluate(renderLook, {
        sceneId: "abyss",
        index: 2,
        width: 320,
        height: 180,
        frames: 20,
        level: 0.8,
        capture: false,
        pollHealth: false,
      });
      assert.equal(health.glError, 0);
      assert.equal(health.nonFinite, 0);
      assert.ok(health.peak > 0);
      const result = await page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        const gl = engine.gl,
          slot = engine.slots.at(-1);
        const read = () => {
          const t = slot.visual[slot.vi]; // drawSlot flips vi after drawing
          gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
          const px = new Float32Array(t.w * t.h * 4);
          const bytes = new Uint8Array(t.w * t.h * 4);
          if (t.floating) gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.FLOAT, px);
          else gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          let sum = 0;
          const data = t.floating ? px : bytes;
          for (let i = 0; i < data.length; i += 4)
            sum += data[i] + data[i + 1] + data[i + 2];
          return sum;
        };
        const draw = () => {
          slot.frozen = false;
          engine.drawSlot(slot, 0);
          return read();
        };
        const full = draw();
        const state = {
          blend: gl.isEnabled(gl.BLEND),
          depthTest: gl.isEnabled(gl.DEPTH_TEST),
          depthMask: gl.getParameter(gl.DEPTH_WRITEMASK),
        };
        const geometry = slot.scene.geometry,
          particles = slot.scene.particles;
        const from = geometry.additiveFrom;
        // Without the tail split everything is opaque: a different picture.
        geometry.additiveFrom = undefined;
        const opaque = draw();
        geometry.additiveFrom = from;
        particles.depth = false;
        const undepthed = draw();
        particles.depth = true;
        return { full, opaque, undepthed, state, error: gl.getError() };
      });
      assert.equal(result.error, 0);
      assert.deepEqual(result.state, {
        blend: false,
        depthTest: false,
        depthMask: true,
      });
      assert.notEqual(result.full, result.opaque);
      // Particles behind the reef are hidden only with the depth test.
      assert.ok(result.undepthed > result.full, JSON.stringify(result));
      assert.deepEqual(errors, []);
    } finally {
      await runtime.stop();
      await server.close?.();
    }
  },
);
