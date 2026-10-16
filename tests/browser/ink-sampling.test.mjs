import test from "node:test";
import assert from "node:assert/strict";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";
import { renderLook } from "./client.mjs";

// Native GPU checks for Ink Bloom's sampling: the body lattice's duplicate
// gutters, and graceful degradation under the governor's ray-step budget
// (96 -> 64 -> 40): fewer, longer filtered steps must keep the picture.
function frame({ time, steps }) {
  const { engine } = window.__phosphorLab,
    slot = engine.slots.at(-1);
  engine.rayStepBudget = steps;
  slot.time = time;
  engine.uniformFrame++;
  engine.drawSlot(slot, 0);
  engine.present();
  const gl = engine.gl,
    width = engine.width,
    height = engine.height,
    data = new Uint8Array(width * height * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
  let lit = 0;
  for (let i = 0; i < data.length; i += 4)
    lit += Number(Math.max(data[i], data[i + 1], data[i + 2]) > 12);
  // Gutter check: duplicated border nodes equal their neighbours.
  const cache = slot.precompute,
    field = new Float32Array(cache.w * cache.h * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, cache.fbo);
  gl.readPixels(0, 0, cache.w, cache.h, gl.RGBA, gl.FLOAT, field);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  let gutter = 0,
    nonFinite = 0;
  const at = (x, y, c) => field[(y * cache.w + x) * 4 + c];
  for (let y = 0; y < cache.h; y++)
    for (let tile = 0; tile < 16; tile++) {
      const x0 = tile * 98;
      for (let c = 0; c < 4; c++) {
        gutter = Math.max(
          gutter,
          Math.abs(at(x0, y, c) - at(x0 + 1, y, c)),
          Math.abs(at(x0 + 97, y, c) - at(x0 + 96, y, c)),
        );
        if (!Number.isFinite(at(x0 + 40, y, c))) nonFinite++;
      }
    }
  return {
    rgba: Array.from(data),
    litFraction: lit / (width * height),
    gutter,
    nonFinite: nonFinite + engine.counters.nonFinite,
    glError: gl.getError(),
  };
}

test(
  "ink lattice gutters are exact and lower ray-step budgets keep the picture",
  { skip: process.env.PHOSPHOR_INK_GPU !== "1", timeout: 180000 },
  async () => {
    const server = await serve(".", 48517),
      runtime = await launch({ rig: true, headless: true });
    try {
      const lab = await openLab(runtime.browser, server.url);
      for (const index of [0, 1, 2]) {
        const health = await lab.page.evaluate(renderLook, {
          sceneId: "ink",
          index,
          frames: 2,
          level: 0.6,
          width: 480,
          height: 270,
          capture: false,
          pollHealth: false,
        });
        assert.equal(health.glError, 0);
        const shots = {};
        for (const steps of [96, 64, 40])
          shots[steps] = await lab.page.evaluate(frame, { time: 24, steps });
        for (const steps of [96, 64, 40]) {
          const s = shots[steps];
          assert.equal(s.glError, 0);
          assert.equal(s.nonFinite, 0);
          assert.ok(s.gutter < 1e-3, `gutter ${s.gutter}`);
          assert.ok(s.litFraction > 0.04, `lit ${s.litFraction}`);
        }
        for (const steps of [64, 40]) {
          let error = 0;
          const a = shots[96].rgba,
            b = shots[steps].rgba;
          for (let i = 0; i < a.length; i++)
            if (i % 4 !== 3) error += Math.abs(a[i] - b[i]);
          const mean = error / (a.length * 0.75);
          console.log(JSON.stringify({ index, steps, mean }));
          assert.ok(mean < 6, `${index}@${steps}: ${mean} mean levels`);
        }
      }
      assert.deepEqual(lab.errors, []);
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
