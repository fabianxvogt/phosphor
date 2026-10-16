// Native matrix, saved looks, reversal, late clocks and limiter-enabled smoke.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-aurora.mjs --rig --port 48822
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
assert.ok(args.rig, "Native GPU --rig required");
const out = await outputDirectory("aurora-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  const renderer = await lab.page.evaluate(() => {
    const gl = window.__phosphorLab.engine.gl;
    return gl.getParameter(
      gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL,
    );
  });
  assert.doesNotMatch(renderer, /swiftshader|software|llvmpipe/i);
  for (const palette of ["phosphor", "ember", "glacier"]) {
    const colors = PALETTES.find((p) => p.id === palette).colors;
    for (const development of [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]) {
      for (const energy of [0.1, 0.5, 0.9]) {
        const snapshot = await lab.page.evaluate(
          ({ colors, development }) => {
            const { scenes, presetSnapshot } = window.__phosphorLab;
            const shot = presetSnapshot(
              scenes.find((s) => s.id === "aurora"),
              0,
            );
            shot.params.development = development;
            shot.palette = colors;
            return shot;
          },
          { colors, development },
        );
        const health = await lab.page.evaluate(renderLook, {
          sceneId: "aurora",
          snapshot,
          level: energy,
          frames: 12,
          width: 640,
          height: 360,
          capture: false,
          pollHealth: false,
        });
        assert.equal(health.glError, 0);
        assert.equal(health.nonFinite, 0);
        const metrics = await lab.page.evaluate(
          ({ palette, development, energy }) => {
            const { engine } = window.__phosphorLab;
            const slot = engine.slots.at(-1);
            // Probe both the late-variant boundary and the 12-hour epoch.
            slot.time = 3600;
            engine.uniformFrame++;
            engine.advance(0, true);
            if (engine.gl.getError()) throw new Error("3600s GL error");
            slot.time = 43200;
            engine.uniformFrame++;
            engine.advance(0, true);
            engine.present();
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(engine.canvas, 0, 0);
            const bytes = ctx.getImageData(0, 0, 640, 360).data;
            let lit = 0,
              peak = 0;
            for (let i = 0; i < bytes.length; i += 4) {
              const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
              lit += Number(p > 12);
              peak = Math.max(peak, p);
            }
            window.__auroraSheets ??= {};
            const sheet = (window.__auroraSheets[palette] ??=
              document.createElement("canvas"));
            if (sheet.width !== 1440) {
              sheet.width = 1440;
              sheet.height = 810;
            }
            if (Number.isInteger(development))
              sheet
                .getContext("2d")
                .drawImage(
                  engine.canvas,
                  [0.1, 0.5, 0.9].indexOf(energy) * 480,
                  development * 270,
                  480,
                  270,
                );
            return {
              litFraction: lit / (640 * 360),
              peak,
              glError: engine.gl.getError(),
              nonFinite:
                engine.counters.nonFinite + window.__harness.nonFiniteUploads,
            };
          },
          { palette, development, energy },
        );
        assert.equal(metrics.glError, 0);
        assert.equal(metrics.nonFinite, 0);
        assert.ok(
          metrics.litFraction > 0.1 && metrics.peak > 50,
          JSON.stringify(metrics),
        );
        rows.push({ palette, development, energy, time: 43200, ...metrics });
      }
    }
    const png = await lab.page.evaluate(
      (id) => window.__auroraSheets[id].toDataURL("image/png").split(",")[1],
      palette,
    );
    await writeFile(
      resolve(out, `${palette}-energy.png`),
      Buffer.from(png, "base64"),
    );
  }
  for (let index = 0; index < 8; index++) {
    const health = await lab.page.evaluate(renderLook, {
      sceneId: "aurora",
      index,
      frames: 4,
      capture: false,
      pollHealth: false,
    });
    assert.equal(health.glError, 0);
    assert.equal(health.nonFinite, 0);
    assert.ok(health.peak > 50);
  }
  for (let index = 0; index < 3; index++) {
    const shot = await lab.page.evaluate(renderLook, {
      sceneId: "aurora",
      index,
      width: 540,
      height: 960,
      frames: 12,
      level: 0.85,
      pollHealth: false,
    });
    assert.equal(shot.glError, 0);
    assert.equal(shot.nonFinite, 0);
    await writeFile(
      resolve(out, `portrait-${index}.png`),
      Buffer.from(shot.png, "base64"),
    );
  }
  const reversal = await lab.page.evaluate(() => {
    const { engine } = window.__phosphorLab;
    const slot = engine.slots.at(-1);
    for (let i = 0; i <= 240; i++) {
      const shot = structuredClone(engine.active);
      shot.params.development = i <= 120 ? i / 60 : 4 - i / 60;
      engine.setSnapshot(shot);
      engine.beat = (i * 2.1) / 60;
      engine.advance(1 / 60, false);
      if (engine.slots.at(-1) !== slot) throw new Error("identity reset");
    }
    return {
      frames: 241,
      glError: engine.gl.getError(),
      nonFinite: engine.counters.nonFinite,
    };
  });
  assert.equal(reversal.glError, 0);
  assert.equal(reversal.nonFinite, 0);
  const hdr = [];
  for (const index of [0, 1, 2]) {
    await lab.page.evaluate(renderLook, {
      sceneId: "aurora",
      index,
      width: 640,
      height: 360,
      frames: 4,
      capture: false,
      pollHealth: false,
    });
    const row = await lab.page.evaluate(() => {
      const { engine } = window.__phosphorLab,
        gl = engine.gl,
        slot = engine.slots.at(-1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, slot.visual[slot.vi].fbo);
      const pixels = new Float32Array(engine.width * engine.height * 4);
      gl.readPixels(
        0,
        0,
        engine.width,
        engine.height,
        gl.RGBA,
        gl.FLOAT,
        pixels,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      let peak = 0,
        aboveOne = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const p = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        peak = Math.max(peak, p);
        aboveOne += Number(p > 1);
        if (!Number.isFinite(p)) throw new Error("non-finite HDR pixel");
      }
      return { peak, aboveOne, glError: gl.getError() };
    });
    assert.equal(row.glError, 0);
    assert.ok(row.peak > 1 && row.aboveOne > 0, "rare rays feed HDR bloom");
    hdr.push({ index, ...row });
  }
  // Preserve the older oracle: frozen reversal is pixel-exact, not merely
  // smooth in motion. Read linear picture pixels before post/history.
  const frozen = await lab.page.evaluate(() => {
    const { engine } = window.__phosphorLab;
    const mesh = engine.slots.at(-1).mesh;
    const read = (development) => {
      const shot = structuredClone(engine.active);
      shot.params.development = development;
      engine.setSnapshot(shot);
      engine.uniformFrame++;
      engine.advance(0, true);
      const gl = engine.gl,
        slot = engine.slots.at(-1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, slot.visual[slot.vi].fbo);
      const pixels = new Float32Array(engine.width * engine.height * 4);
      gl.readPixels(
        0,
        0,
        engine.width,
        engine.height,
        gl.RGBA,
        gl.FLOAT,
        pixels,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return pixels;
    };
    const before = read(0.7);
    read(1.83);
    const after = read(0.7);
    let changed = 0;
    for (let i = 0; i < before.length; i++)
      changed += Number(before[i] !== after[i]);
    return {
      changed,
      sameMesh: mesh === engine.slots.at(-1).mesh,
      glError: engine.gl.getError(),
    };
  });
  assert.deepEqual(frozen, { changed: 0, sameMesh: true, glError: 0 });
  // Force only the material clock uniform across its 2π seam while keeping
  // geometry/camera/beat/history fixed. This catches non-periodic noise inputs.
  const clockSeam = await lab.page.evaluate(() => {
    const { engine } = window.__phosphorLab;
    const original = engine.sceneClocks;
    let phase = 0;
    engine.sceneClocks = function (slot) {
      const values = original.call(this, slot);
      values[0] = phase;
      values[1] = 0.7;
      return values;
    };
    const read = () => {
      engine.uniformFrame++;
      engine.advance(0, true);
      const gl = engine.gl,
        slot = engine.slots.at(-1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, slot.visual[slot.vi].fbo);
      const pixels = new Float32Array(engine.width * engine.height * 4);
      gl.readPixels(
        0,
        0,
        engine.width,
        engine.height,
        gl.RGBA,
        gl.FLOAT,
        pixels,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return pixels;
    };
    try {
      const before = read();
      phase = 2 * Math.PI;
      const after = read();
      let max = 0,
        mean = 0;
      for (let i = 0; i < before.length; i++) {
        const delta = Math.abs(before[i] - after[i]);
        max = Math.max(max, delta);
        mean += delta;
      }
      return { max, mean: mean / before.length, glError: engine.gl.getError() };
    } finally {
      engine.sceneClocks = original;
    }
  });
  assert.equal(clockSeam.glError, 0);
  assert.ok(
    clockSeam.max < 0.01 && clockSeam.mean < 0.00001,
    JSON.stringify(clockSeam),
  );
  const limiter = await lab.page.evaluate(async () => {
    const { engine } = window.__phosphorLab;
    engine.resize(960, 540);
    const shot = structuredClone(engine.active);
    shot.params.development = 1.85;
    engine.setSnapshot(shot);
    engine.options.flashLimit = true;
    engine.setLevel(0.85, 0);
    for (let i = 0; i < 180; i++) {
      engine.beat = 16 + (i * 2.1) / 60;
      engine.advance(1 / 60, false);
      engine.present();
      await new Promise((done) => requestAnimationFrame(done));
    }
    return {
      frames: 180,
      enabled: engine.options.flashLimit,
      glError: engine.gl.getError(),
      nonFinite: engine.counters.nonFinite,
      gpuErrors: engine.counters.gpuErrors,
    };
  });
  assert.equal(limiter.enabled, true);
  assert.equal(limiter.glError, 0);
  assert.equal(limiter.nonFinite, 0);
  assert.equal(limiter.gpuErrors, 0);
  assert.deepEqual(lab.errors, []);
  await writeFile(
    resolve(out, "verification.json"),
    JSON.stringify(
      {
        renderer,
        rows,
        savedLooks: 8,
        portraitStates: 3,
        reversal,
        frozen,
        clockSeam,
        hdr,
        limiter,
        errors: lab.errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `PASS: ${rows.length} late matrix frames, 8 saved looks, 3 portraits, reversal, limiter smoke`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
