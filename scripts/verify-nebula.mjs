// Family-local native checks. Deterministic art evidence uses the stock lab
// renderer; the final RAF smoke explicitly restores the live flash limiter.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options();
assert.ok(
  args.rig && process.env.PHOSPHOR_HEADLESS_RIG === "1",
  "Use --rig and PHOSPHOR_HEADLESS_RIG=1",
);
const out = await outputDirectory("nebula-r3/verify", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  const renderer = await lab.page.evaluate(() => {
    const gl = window.__phosphorLab.engine.gl;
    return gl.getParameter(
      gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL,
    );
  });
  assert.doesNotMatch(renderer, /swiftshader|software/i);
  for (const palette of ["glacier", "ember", "arctic"]) {
    const colors = PALETTES.find((p) => p.id === palette).colors;
    for (const dev of [0, 1, 2])
      for (const energy of [0.1, 0.5, 0.9]) {
        const snapshot = await lab.page.evaluate(
          ({ dev, colors }) => {
            const { scenes, presetSnapshot } = window.__phosphorLab;
            const s = presetSnapshot(
              scenes.find((s) => s.id === "nebula"),
              dev,
            );
            s.palette = { ...colors };
            return s;
          },
          { dev, colors },
        );
        const shot = await lab.page.evaluate(renderLook, {
          sceneId: "nebula",
          snapshot,
          level: energy,
          width: 480,
          height: 270,
          frames: 20,
          pollHealth: false,
        });
        const name = `${palette}-${dev}-${energy}`;
        await writeFile(
          resolve(out, `${name}.png`),
          Buffer.from(shot.png, "base64"),
        );
        let lit = 0;
        for (let i = 0; i < shot.rgba.length; i += 4)
          if (Math.max(...shot.rgba.slice(i, i + 3)) > 12) lit++;
        const litFraction = lit / (shot.width * shot.height);
        assert.ok(
          shot.peak > 20 && litFraction > 0.025,
          `${name} is not empty`,
        );
        assert.equal(shot.glError + shot.nonFinite, 0);
        rows.push({
          name,
          peak: shot.peak,
          litFraction,
          glError: shot.glError,
          nonFinite: shot.nonFinite,
        });
      }
  }
  // All authored looks, including the edge-on look, at low energy in portrait.
  for (let index = 0; index < 7; index++) {
    const shot = await lab.page.evaluate(renderLook, {
      sceneId: "nebula",
      index,
      width: 360,
      height: 640,
      level: 0.1,
      frames: 30,
      pollHealth: false,
    });
    assert.ok(shot.peak > 20 && shot.glError + shot.nonFinite === 0);
    await writeFile(
      resolve(out, `portrait-${index}.png`),
      Buffer.from(shot.png, "base64"),
    );
  }
  const reversal = await lab.page.evaluate(async () => {
    const { engine } = window.__phosphorLab;
    const slot = engine.slots.at(-1);
    const values = [2, 1.5, 1, 0.5, 0, 0.5, 1, 1.5, 2];
    engine.resize(640, 360);
    for (const dev of values) {
      slot.snapshot.params.development = dev;
      for (let i = 0; i < 45; i++) engine.advance(1 / 60, false);
    }
    // The shader clock is metadata texel 0, not u_time. Seed that clock to
    // its quantised 12h value in both ping-pong textures; keep every identity
    // and particle's integrated azimuth. This is a late-clock sample, not a soak.
    const { clockStep } = await import("/nebula-model.mjs");
    const word = Math.imul(clockStep(1 / 60, 1.5), 43200 * 60) >>> 0;
    const bytes = new Uint8Array([
      word >>> 24,
      (word >>> 16) & 255,
      (word >>> 8) & 255,
      word & 255,
    ]);
    const gl = engine.gl;
    for (const target of slot.sim) {
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        bytes,
      );
    }
    slot.time = 43200;
    for (let i = 0; i < 4; i++) engine.advance(1 / 60, false);
    return {
      glError: gl.getError(),
      counters: engine.counters,
      nonFinite: window.__harness.nonFiniteUploads,
      png: engine.canvas.toDataURL("image/png").split(",")[1],
    };
  });
  assert.equal(
    reversal.glError + reversal.counters.gpuErrors + reversal.nonFinite,
    0,
  );
  await writeFile(
    resolve(out, "reversal-late.png"),
    Buffer.from(reversal.png, "base64"),
  );
  delete reversal.png;
  const live = await lab.page.evaluate(async () => {
    const { engine, scenes, presetSnapshot } = window.__phosphorLab;
    const { initialRhythm } = await import("/rhythm.mjs");
    const settings = initialRhythm(scenes);
    engine.resize(1920, 1080);
    engine.load(
      presetSnapshot(
        scenes.find((s) => s.id === "nebula"),
        2,
      ),
      0,
      { energy: 0.85 },
    );
    engine.setLevel(0.85, 0);
    engine.options.flashLimit = true;
    const raf = () => new Promise((done) => requestAnimationFrame(done));
    let previous = await raf();
    const samples = [];
    for (let i = 0; i < 240; i++) {
      const now = await raf();
      engine.setRhythmFrame({
        beat: ((now / 1000) * 126) / 60,
        origin: 0,
        settings,
        enabled: true,
      });
      engine.advance(Math.min(0.1, (now - previous) / 1000), false);
      if (i > 20) samples.push(now - previous);
      previous = now;
    }
    samples.sort((a, b) => a - b);
    return {
      flashLimit: engine.options.flashLimit,
      flashExempt: engine.flashExempt,
      p50: samples[Math.floor(samples.length * 0.5)],
      p95: samples[Math.floor(samples.length * 0.95)],
      glError: engine.gl.getError(),
      nonFinite: window.__harness.nonFiniteUploads,
      counters: engine.counters,
      stats: engine.stats(),
      errors: window.__phosphorLab.errors,
    };
  });
  assert.ok(live.flashLimit && !live.flashExempt);
  assert.equal(live.glError + live.nonFinite + live.counters.gpuErrors, 0);
  assert.deepEqual([...lab.errors, ...live.errors], []);
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(
      { renderer, rows, reversal, live, errors: lab.errors },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ cases: rows.length, portraitLooks: 7, reversal, live }),
  );
} finally {
  await runtime.stop();
  await server.close();
}
