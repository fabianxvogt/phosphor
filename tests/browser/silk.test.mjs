import test from "node:test";
import assert from "node:assert/strict";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";
import { renderLook } from "./client.mjs";

test(
  "silk native GPU: low-energy late states, paused reversal and stable mesh",
  {
    skip: process.env.PHOSPHOR_SILK_GPU !== "1",
    timeout: 120000,
  },
  async () => {
    const server = await serve(".", 48506);
    const runtime = await launch({ rig: true, headless: true });
    try {
      const { page, errors } = await openLab(runtime.browser, server.url);
      const health = await page.evaluate(renderLook, {
        sceneId: "silk",
        frames: 4,
        level: 0.1,
        width: 480,
        height: 270,
        capture: false,
        pollHealth: false,
      });
      assert.equal(health.glError, 0);
      assert.equal(health.nonFinite, 0);
      const result = await page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        const gl = engine.gl,
          slot = engine.slots.at(-1),
          mesh = slot.mesh.buffer;
        const shot = (development, time) => {
          const snapshot = structuredClone(engine.active);
          snapshot.params.development = development;
          engine.setSnapshot(snapshot);
          slot.time = time;
          engine.uniformFrame++;
          engine.drawSlot(slot, 0);
          engine.present();
          const pixels = new Uint8Array(engine.width * engine.height * 4);
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
        const rows = [];
        for (const time of [3600, 43200])
          for (const development of [0, 0.5, 1, 1.3, 1.7, 2]) {
            const pixels = shot(development, time);
            let lit = 0,
              peak = 0,
              borderLit = 0,
              borderPixels = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const value = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
              if (value > 12) lit++;
              const pixel = i / 4, x = pixel % engine.width, y = Math.floor(pixel / engine.width);
              if (x < 5 || x >= engine.width - 5 || y < 5 || y >= engine.height - 5) {
                borderPixels++;
                if (value > 12) borderLit++;
              }
              peak = Math.max(peak, value);
            }
            rows.push({
              time,
              development,
              lit: lit / (pixels.length / 4),
              border: borderLit / borderPixels,
              peak,
            });
          }
        const before = shot(0.65, 43200);
        shot(1.92, 43200);
        const after = shot(0.65, 43200);
        let different = 0;
        for (let i = 0; i < before.length; i++)
          if (before[i] !== after[i]) different++;
        return {
          rows,
          different,
          sameMesh: mesh === slot.mesh.buffer,
          glError: gl.getError(),
          nonFinite: engine.counters.nonFinite,
        };
      });
      for (const row of result.rows) {
        assert.ok(row.lit > 0.03, JSON.stringify(row));
        assert.ok(row.peak > 40, JSON.stringify(row));
        if (row.development === 0) {
          assert.ok(row.lit > 0.35, "veil must fill the frame: " + JSON.stringify(row));
          assert.ok(row.border > 0.15, "no flag floating inside a black border: " + JSON.stringify(row));
        }
      }
      assert.equal(result.different, 0);
      assert.equal(result.sameMesh, true);
      assert.equal(result.glError, 0);
      assert.equal(result.nonFinite, 0);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify(result));
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
