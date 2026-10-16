// Native GPU matrix, reversal, and single-use relay-state probe.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-ribbons.mjs --rig --port 48682
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
const out = await outputDirectory("ribbons-verification/visual", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const palette of ["phosphor", "ember", "glacier"]) {
    for (const development of [0, 0.5, 1, 1.5, 2]) {
      for (const energy of [0.1, 0.5, 0.9]) {
        const snapshot = await lab.page.evaluate(
          ({ development, colors }) => {
            const { scenes, presetSnapshot } = window.__phosphorLab;
            const shot = presetSnapshot(
              scenes.find((s) => s.id === "ribbons"),
              0,
            );
            shot.params.development = development;
            shot.palette = colors;
            return shot;
          },
          {
            development,
            colors: PALETTES.find((p) => p.id === palette).colors,
          },
        );
        const health = await lab.page.evaluate(renderLook, {
          sceneId: "ribbons",
          snapshot,
          level: energy,
          width: 640,
          height: 360,
          frames: 4,
          capture: false,
          pollHealth: false,
        });
        assert.equal(health.glError, 0);
        assert.equal(health.nonFinite, 0);
        const metrics = await lab.page.evaluate(async () => {
          const { engine } = window.__phosphorLab;
          const slot = engine.slots.at(-1);
          slot.time = 43200;
          engine.uniformFrame++;
          engine.advance(0, true);
          await engine.ready("ribbons");
          engine.advance(1 / 60, false);
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
          return {
            litFraction: lit / (640 * 360),
            peak,
            glError: engine.gl.getError(),
            nonFinite:
              engine.counters.nonFinite + window.__harness.nonFiniteUploads,
          };
        });
        assert.equal(metrics.glError, 0);
        assert.equal(metrics.nonFinite, 0);
        assert.ok(
          metrics.litFraction > 0.025 && metrics.peak > 50,
          JSON.stringify(metrics),
        );
        rows.push({ palette, development, energy, time: 43200, ...metrics });
        if (Number.isInteger(development))
          await lab.page.evaluate(
            ({ palette, development, energy }) => {
              window.__ribbonSheets ??= {};
              const sheet = (window.__ribbonSheets[palette] ??=
                document.createElement("canvas"));
              if (sheet.width !== 1440) {
                sheet.width = 1440;
                sheet.height = 810;
              }
              sheet
                .getContext("2d")
                .drawImage(
                  window.__phosphorLab.engine.canvas,
                  [0.1, 0.5, 0.9].indexOf(energy) * 480,
                  development * 270,
                  480,
                  270,
                );
            },
            { palette, development, energy },
          );
      }
    }
    const png = await lab.page.evaluate(
      (id) => window.__ribbonSheets[id].toDataURL("image/png").split(",")[1],
      palette,
    );
    await writeFile(
      resolve(out, `${palette}-energy.png`),
      Buffer.from(png, "base64"),
    );
  }
  const reversal = await lab.page.evaluate(() => {
    const { engine } = window.__phosphorLab;
    const slot = engine.slots.at(-1);
    const start = slot.time;
    for (let i = 0; i <= 240; i++) {
      const shot = structuredClone(engine.active);
      shot.params.development = i <= 120 ? i / 60 : 4 - i / 60;
      engine.setSnapshot(shot);
      engine.beat = (i * 2.1) / 60;
      engine.advance(1 / 60, false);
      if (engine.slots.at(-1) !== slot || slot.time < start)
        throw new Error("identity reset on reversal");
    }
    return {
      glError: engine.gl.getError(),
      nonFinite: engine.counters.nonFinite,
      frames: 241,
    };
  });
  assert.equal(reversal.glError, 0);
  assert.equal(reversal.nonFinite, 0);
  // A controlled event verifies the actual RGBA8 shader state, not just a CPU
  // formula: consume once, advance monotonically, keep all trajectories alive.
  const relay = await lab.page.evaluate(() => {
    const { engine } = window.__phosphorLab;
    const slot = engine.slots.at(-1),
      gl = engine.gl;
    slot.rhythm.values.fill(0);
    slot.rhythm.counts[3] = 2;
    slot.rhythm.values[3] = 0.9;
    slot.rhythmPending.fill(0);
    slot.rhythmPending[3] = 0.9;
    const samples = [];
    for (let tick = 0; tick <= 50; tick++) {
      engine.tickSlot(slot, 1 / 60);
      const bytes = new Uint8Array(12);
      gl.bindFramebuffer(gl.FRAMEBUFFER, slot.sim[slot.si].fbo);
      gl.readPixels(4, 1152, 3, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      const decode = (i) =>
        (bytes[i] * 65536 + bytes[i + 1] * 256 + bytes[i + 2]) / 16777216;
      samples.push({
        age: decode(0),
        strength: decode(4),
        cohort: Math.round(decode(8) * 3),
      });
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { samples, glError: gl.getError() };
  });
  assert.equal(relay.glError, 0);
  assert.equal(relay.samples[0].age, 0);
  assert.equal(relay.samples[0].cohort, 2);
  assert.ok(Math.abs(relay.samples[0].strength - 0.9) < 1e-5);
  for (let i = 1; i <= 50; i++)
    assert.ok(relay.samples[i].age >= relay.samples[i - 1].age);
  assert.ok(
    relay.samples[45].age > 0.99,
    "one hit, not a repeated envelope injection",
  );
  for (const [name, index, width, height] of [
    ["wings-portrait", 0, 540, 960],
    ["vortex-portrait", 1, 540, 960],
    ["labyrinth-square", 2, 720, 720],
    ["labyrinth-4k", 2, 3840, 2160],
  ]) {
    const shot = await lab.page.evaluate(renderLook, {
      sceneId: "ribbons",
      index,
      width,
      height,
      level: 0.85,
      frames: 90,
      capture: false,
      pollHealth: false,
    });
    assert.equal(shot.glError, 0);
    assert.equal(shot.nonFinite, 0);
    const png = await lab.page.evaluate(() => {
      const { engine } = window.__phosphorLab;
      const canvas = document.createElement("canvas");
      canvas.width = engine.width;
      canvas.height = engine.height;
      canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await writeFile(resolve(out, `${name}.png`), Buffer.from(png, "base64"));
  }
  assert.deepEqual(lab.errors, []);
  await writeFile(
    resolve(out, "checks.json"),
    JSON.stringify({ rows, reversal, relay }, null, 2),
  );
  console.log(
    `PASS: ${rows.length} palette/development/energy/late frames; reversal; relay readback; aspect/4K stills`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
