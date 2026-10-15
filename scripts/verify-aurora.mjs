// Bounded native-GPU verification. Run with PHOSPHOR_HEADLESS_RIG=1 and
// --port 48501. Evidence only; never alters production engine behaviour.
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
const out = await outputDirectory("aurora/verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const paletteId of ["phosphor", "glacier", "ember"])
    for (const development of [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2])
      for (const energy of [0.1, 0.9]) {
        const snapshot = await lab.page.evaluate(
          ({ development, colors }) => {
            const { scenes, presetSnapshot } = window.__phosphorLab;
            const s = presetSnapshot(
              scenes.find((s) => s.id === "aurora"),
              0,
            );
            s.params.development = development;
            s.palette = colors;
            return s;
          },
          {
            development,
            colors: PALETTES.find((p) => p.id === paletteId).colors,
          },
        );
        const initial = await lab.page.evaluate(renderLook, {
          sceneId: "aurora",
          snapshot,
          level: energy,
          width: 480,
          height: 270,
          frames: 2,
          capture: false,
          pollHealth: false,
        });
        assert.equal(initial.glError, 0);
        assert.equal(initial.nonFinite, 0);
        for (const time of [3600, 43200]) {
          const row = await lab.page.evaluate(
            ({ time }) => {
              const { engine } = window.__phosphorLab;
              engine.slots.at(-1).time = time;
              engine.uniformFrame++;
              engine.advance(0, true);
              engine.present();
              const gl = engine.gl;
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              const bytes = new Uint8Array(engine.width * engine.height * 4);
              gl.readPixels(
                0,
                0,
                engine.width,
                engine.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                bytes,
              );
              let peak = 0,
                sum = 0,
                lit = 0;
              for (let i = 0; i < bytes.length; i += 4) {
                const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
                peak = Math.max(peak, p);
                sum += p;
                lit += Number(p > 12);
              }
              return {
                time,
                peak,
                meanPeak: sum / (bytes.length / 4),
                litFraction: lit / (bytes.length / 4),
                glError: gl.getError(),
                nonFinite:
                  engine.counters.nonFinite + window.__harness.nonFiniteUploads,
              };
            },
            { time },
          );
          assert.equal(row.glError, 0);
          assert.equal(row.nonFinite, 0);
          assert.ok(
            row.peak > 35 && row.litFraction > 0.005,
            JSON.stringify({ paletteId, development, energy, ...row }),
          );
          rows.push({ paletteId, development, energy, ...row });
        }
      }
  for (const [name, index, width, height] of [
    ["glow-portrait", 0, 540, 960],
    ["curtains-portrait", 1, 540, 960],
    ["corona-portrait", 2, 540, 960],
    ["corona-4k", 2, 3840, 2160],
  ]) {
    const result = await lab.page.evaluate(renderLook, {
      sceneId: "aurora",
      index,
      width,
      height,
      frames: 60,
      capture: false,
      pollHealth: false,
    });
    assert.equal(result.glError, 0);
    assert.equal(result.nonFinite, 0);
    const png = await lab.page.evaluate(
      () =>
        window.__phosphorLab.engine.canvas.toDataURL("image/png").split(",")[1],
    );
    await writeFile(resolve(out, `${name}.png`), Buffer.from(png, "base64"));
  }
  for (const paletteId of ["phosphor", "glacier", "ember"]) {
    const snapshot = await lab.page.evaluate(
      ({ colors }) => {
        const { scenes, presetSnapshot } = window.__phosphorLab;
        const s = presetSnapshot(
          scenes.find((s) => s.id === "aurora"),
          1,
        );
        s.palette = colors;
        return s;
      },
      { colors: PALETTES.find((p) => p.id === paletteId).colors },
    );
    await lab.page.evaluate(renderLook, {
      sceneId: "aurora",
      snapshot,
      width: 960,
      height: 540,
      frames: 60,
      capture: false,
      pollHealth: false,
    });
    const png = await lab.page.evaluate(
      () =>
        window.__phosphorLab.engine.canvas.toDataURL("image/png").split(",")[1],
    );
    await writeFile(
      resolve(out, `curtains-${paletteId}.png`),
      Buffer.from(png, "base64"),
    );
    const hdr = await lab.page.evaluate(() => {
      const { engine } = window.__phosphorLab,
        gl = engine.gl,
        s = engine.slots.at(-1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, s.visual[s.vi].fbo);
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
      let peak = 0,
        aboveOne = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const p = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        peak = Math.max(peak, p);
        aboveOne += Number(p > 1);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { peak, aboveOne, glError: gl.getError() };
    });
    assert.equal(hdr.glError, 0);
    assert.ok(hdr.peak > 1 && hdr.aboveOne > 0, "rare rays feed HDR bloom");
    rows.push({ paletteId, kind: "linear-HDR-curtains", ...hdr });
  }
  await lab.page.evaluate(renderLook, {
    sceneId: "aurora",
    index: 0,
    width: 960,
    height: 540,
    frames: 10,
    capture: false,
    pollHealth: false,
  });
  const reversal = await lab.page.evaluate(() => {
    const { engine } = window.__phosphorLab;
    engine.options.grain = 0;
    engine.options.echo = 0;
    const mesh = engine.slots.at(-1).mesh;
    const pixels = () => {
      engine.uniformFrame++;
      engine.advance(0, true);
      engine.present();
      const gl = engine.gl,
        slot = engine.slots.at(-1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, slot.visual[slot.vi].fbo);
      const a = new Float32Array(engine.width * engine.height * 4);
      gl.readPixels(0, 0, engine.width, engine.height, gl.RGBA, gl.FLOAT, a);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return a;
    };
    const set = (d) => {
      const s = structuredClone(engine.active);
      s.params.development = d;
      engine.setSnapshot(s);
    };
    set(0.7);
    const before = pixels();
    set(1.83);
    pixels();
    set(0.7);
    const after = pixels();
    let maximum = 0,
      changed = 0;
    for (let i = 0; i < before.length; i++) {
      const diff = Math.abs(before[i] - after[i]);
      maximum = Math.max(maximum, diff);
      changed += Number(diff > 0);
    }
    return {
      maximum,
      changed,
      sameMesh: mesh === engine.slots.at(-1).mesh,
      glError: engine.gl.getError(),
      nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
    };
  });
  assert.deepEqual(reversal, {
    maximum: 0,
    changed: 0,
    sameMesh: true,
    glError: 0,
    nonFinite: 0,
  });
  assert.deepEqual(lab.errors, []);
  await writeFile(
    resolve(out, "gpu-checks.json"),
    JSON.stringify({ rows, reversal }, null, 2) + "\n",
  );
  console.log(
    `PASS: ${rows.filter((r) => !r.kind).length} late-time frames; three HDR probes; exact paused reversal; portrait, palette and 4K stills in ${out}`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
