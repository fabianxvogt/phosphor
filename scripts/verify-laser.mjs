// Compile Laser Grid's shaders in the lab and print the GLSL info logs.
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-laser.mjs --port 48522
import assert from "node:assert/strict";
import { renderLook } from "../tests/browser/client.mjs";
import { options, serve, launch, openLab } from "./browser-runtime.mjs";
const args = options();
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
try {
  const lab = await openLab(runtime.browser, server.url);
  const logs = await lab.page.evaluate(() => {
    const { engine, scenes } = window.__phosphorLab;
    const scene = scenes.find((s) => s.id === "laser");
    const gl = engine.gl;
    const compile = (source) => {
      const sh = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      return log;
    };
    const header = engine.pictureHeader;
    return {
      visual: compile(header + "#define PRECOMPUTED\n" + scene.fragment),
      visualLate: compile(
        header +
          "#define PRECOMPUTED\n#define PHOSPHOR_LATE\n" +
          scene.fragment,
      ),
      fallback: compile(header + scene.fragment),
      precompute: compile(header + scene.precompute.fragment),
    };
  });
  for (const [k, v] of Object.entries(logs)) {
    console.log(k, v ? v.slice(0, 2000) : "ok");
    assert.equal(v, "", `${k}: shader must compile without diagnostics`);
  }
  for (const level of [0.1, 0.5, 0.9]) {
    await lab.page.evaluate(renderLook, {
      sceneId: "laser",
      index: 0,
      level,
      width: 640,
      height: 360,
      frames: 2,
      capture: false,
      pollHealth: false,
    });
    const health = await lab.page.evaluate(async () => {
      const { engine } = window.__phosphorLab;
      engine.options.flashLimit = true;
      engine.slots.at(-1).time = 43200;
      let minPeak = 255;
      const gl = engine.gl;
      const bytes = new Uint8Array(640 * 360 * 4);
      for (let i = 0; i <= 120; i++) {
        const shot = structuredClone(engine.active);
        shot.params.development = i <= 60 ? i / 30 : 4 - i / 30;
        engine.setSnapshot(shot);
        engine.beat = (i * 2.1) / 30;
        engine.advance(1 / 30, false);
        engine.present();
        // Let the real asynchronous limiter approve local beam events.
        await new Promise((done) => requestAnimationFrame(done));
        if (i % 15 === 0 && i > 0) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.readPixels(0, 0, 640, 360, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
          let peak = 0;
          for (let p = 0; p < bytes.length; p += 4)
            peak = Math.max(peak, bytes[p], bytes[p + 1], bytes[p + 2]);
          minPeak = Math.min(minPeak, peak);
        }
      }
      return {
        glError: gl.getError(),
        minPeak,
        nonFinite:
          engine.counters.nonFinite + window.__harness.nonFiniteUploads,
        limiterEnabled: engine.options.flashLimit,
      };
    });
    assert.equal(health.glError, 0);
    assert.equal(health.nonFinite, 0);
    assert.equal(health.limiterEnabled, true);
    assert.ok(health.minPeak > 40, JSON.stringify(health));
    console.log(
      `PASS: 12-hour reversal, energy ${level}, live limiter`,
      health,
    );
  }
  assert.deepEqual(lab.errors, []);
} finally {
  await runtime.stop();
  await server.close();
}
