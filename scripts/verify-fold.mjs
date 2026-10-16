// Native Origami matrix + full-source paired probe (shared pair omits geometry).
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-fold.mjs --rig --port 48583
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
const args = options({
  pair: { type: "boolean", default: false },
  reference: { type: "string", default: "main" },
  width: { type: "string", default: "1920" },
  height: { type: "string", default: "1080" },
});
const out = await outputDirectory("fold-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
try {
  const lab = await openLab(runtime.browser, server.url);
  if (args.pair) {
    const reference = execFileSync("git", ["rev-parse", args.reference], {
      encoding: "utf8",
    }).trim();
    const baselineBrowser = {
      newContext: async (opts) => {
        const context = await runtime.browser.newContext(opts);
        await context.route(/\/(scene-fold|fold-geometry)\.mjs$/, (route) => {
          const file = new URL(route.request().url()).pathname.slice(1);
          return route.fulfill({
            contentType: "text/javascript",
            body: execFileSync("git", ["show", `${reference}:${file}`], {
              encoding: "utf8",
            }),
          });
        });
        return context;
      },
    };
    const base = await openLab(baselineBrowser, server.url),
      labs = [base, lab],
      rows = [];
    for (const index of [0, 1, 2]) {
      for (const item of labs) {
        const health = await item.page.evaluate(renderLook, {
          sceneId: "fold",
          index,
          level: 0.95,
          width: Number(args.width),
          height: Number(args.height),
          frames: 8,
          capture: false,
          pollHealth: false,
        });
        assert.equal(health.glError, 0);
        assert.equal(health.nonFinite, 0);
      }
      const samples = [[], []];
      for (const candidate of [0, 1, 1, 0, 1, 0, 0, 1]) {
        const block = await labs[candidate].page.evaluate(() => {
          const { engine } = window.__phosphorLab,
            gl = engine.gl,
            bytes = new Uint8Array(4),
            times = [];
          for (let i = 0; i < 19; i++) {
            const start = performance.now();
            engine.beat = (engine.renderTick + 0.5) / 30;
            engine.advance(1 / 60, false);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            if (i >= 3) times.push(performance.now() - start);
          }
          if (gl.getError() || engine.counters.nonFinite)
            throw new Error("GPU health error");
          return times;
        });
        samples[candidate].push(...block);
      }
      const stats = (a) => {
        const sorted = [...a].sort((a, b) => a - b);
        return { p50: sorted[32], p95: sorted[60] };
      };
      const baseline = stats(samples[0]),
        final = stats(samples[1]);
      rows.push({
        index,
        baseline,
        final,
        deltaPercent: (final.p50 / baseline.p50 - 1) * 100,
        samples,
      });
    }
    await writeFile(
      resolve(out, "pair.json"),
      JSON.stringify(
        {
          reference,
          width: Number(args.width),
          height: Number(args.height),
          rows,
          errors: labs.flatMap((l) => l.errors),
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify(rows.map(({ samples, ...r }) => r)));
  } else {
    const rows = [];
    for (const palette of ["phosphor", "ember", "glacier"]) {
      for (const development of [0, 0.5, 1, 1.5, 2])
        for (const energy of [0.1, 0.5, 0.9]) {
          const snapshot = await lab.page.evaluate(
            ({ development, colors }) => {
              const { scenes, presetSnapshot } = window.__phosphorLab;
              const s = presetSnapshot(
                scenes.find((s) => s.id === "fold"),
                0,
              );
              s.params.development = development;
              s.palette = colors;
              return s;
            },
            {
              development,
              colors: PALETTES.find((p) => p.id === palette).colors,
            },
          );
          const health = await lab.page.evaluate(renderLook, {
            sceneId: "fold",
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
            engine.slots.at(-1).time = 43200;
            engine.advance(0, true);
            await engine.ready("fold");
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
            JSON.stringify({ palette, development, energy, metrics }),
          );
          rows.push({ palette, development, energy, time: 43200, ...metrics });
          if (Number.isInteger(development))
            await lab.page.evaluate(
              ({ palette, development, energy }) => {
                const { engine } = window.__phosphorLab;
                window.__foldSheets ??= {};
                const sheet = (window.__foldSheets[palette] ??=
                  document.createElement("canvas"));
                if (sheet.width !== 1440) {
                  sheet.width = 1440;
                  sheet.height = 810;
                }
                sheet
                  .getContext("2d")
                  .drawImage(
                    engine.canvas,
                    [0.1, 0.5, 0.9].indexOf(energy) * 480,
                    development * 270,
                    480,
                    270,
                  );
              },
              { palette, development, energy },
            );
        }
      const png = await lab.page.evaluate(
        (palette) =>
          window.__foldSheets[palette].toDataURL("image/png").split(",")[1],
        palette,
      );
      await writeFile(
        resolve(out, `${palette}-energy.png`),
        Buffer.from(png, "base64"),
      );
    }
    const reversal = await lab.page.evaluate(() => {
      const { engine } = window.__phosphorLab,
        slot = engine.slots.at(-1);
      for (let i = 0; i <= 240; i++) {
        const s = structuredClone(engine.active);
        s.params.development = i <= 120 ? i / 60 : 4 - i / 60;
        engine.setSnapshot(s);
        engine.beat = (i * 2.1) / 60;
        engine.advance(1 / 60, false);
        if (engine.slots.at(-1) !== slot)
          throw new Error("slot reset on reversal");
      }
      return {
        frames: 241,
        glError: engine.gl.getError(),
        nonFinite: engine.counters.nonFinite,
      };
    });
    assert.equal(reversal.glError, 0);
    assert.equal(reversal.nonFinite, 0);
    for (const [name, index, width, height] of [
      ["sheet-portrait", 0, 540, 960],
      ["fold-square", 1, 720, 720],
      ["storm-portrait", 2, 540, 960],
      ["storm-4k", 2, 3840, 2160],
    ]) {
      const health = await lab.page.evaluate(renderLook, {
        sceneId: "fold",
        index,
        width,
        height,
        level: 0.85,
        frames: 20,
        capture: false,
        pollHealth: false,
      });
      assert.equal(health.glError, 0);
      assert.equal(health.nonFinite, 0);
      const png = await lab.page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        const c = document.createElement("canvas");
        c.width = engine.width;
        c.height = engine.height;
        c.getContext("2d").drawImage(engine.canvas, 0, 0);
        return c.toDataURL("image/png").split(",")[1];
      });
      await writeFile(resolve(out, `${name}.png`), Buffer.from(png, "base64"));
    }
    const signature = await lab.page.evaluate(() => {
      const { engine } = window.__phosphorLab,
        slot = engine.slots.at(-1);
      engine.resize(960, 540);
      const sheet = document.createElement("canvas");
      sheet.width = 1920;
      sheet.height = 540;
      const ctx = sheet.getContext("2d"),
        images = [];
      for (const [i, strength] of [0, 1].entries()) {
        slot.rhythm.values.fill(0);
        slot.rhythm.hits.fill(0);
        slot.rhythm.counts.fill(0);
        slot.rhythm.values[3] = strength;
        engine.uniformFrame++;
        engine.drawSlot(slot, 0);
        engine.present();
        ctx.drawImage(engine.canvas, i * 960, 0);
        images.push(ctx.getImageData(i * 960, 0, 960, 540).data);
      }
      let changed = 0;
      for (let i = 0; i < images[0].length; i += 4)
        if (
          Math.max(
            ...[0, 1, 2].map((k) =>
              Math.abs(images[0][i + k] - images[1][i + k]),
            ),
          ) > 12
        )
          changed++;
      return {
        changedFraction: changed / (960 * 540),
        png: sheet.toDataURL("image/png").split(",")[1],
      };
    });
    assert.ok(
      signature.changedFraction > 0.002,
      `signature visible: ${signature.changedFraction}`,
    );
    await writeFile(
      resolve(out, "crease-snap-off-on.png"),
      Buffer.from(signature.png, "base64"),
    );
    delete signature.png;
    // Live limiter enabled, real async approval allowed to progress. No limiter
    // internals are changed; offline sheets above are not compliance evidence.
    const live = await lab.page.evaluate(async () => {
      const { engine } = window.__phosphorLab;
      engine.resize(960, 540);
      engine.options.flashLimit = true;
      for (let i = 0; i < 120; i++) {
        engine.beat = (i * 2.1) / 60;
        engine.advance(1 / 60, false);
        engine.present();
        await new Promise(requestAnimationFrame);
      }
      return {
        frames: 120,
        limiter: engine.options.flashLimit,
        glError: engine.gl.getError(),
        nonFinite: engine.counters.nonFinite,
      };
    });
    assert.equal(live.limiter, true);
    assert.equal(live.glError, 0);
    assert.equal(live.nonFinite, 0);
    assert.deepEqual(lab.errors, []);
    await writeFile(
      resolve(out, "checks.json"),
      JSON.stringify(
        { rows, reversal, signature, live, errors: lab.errors },
        null,
        2,
      ),
    );
    console.log(
      `PASS ${rows.length} late palette/energy/development cases, reversal, aspect/4K, 120 limiter-enabled RAF frames`,
    );
  }
} finally {
  await runtime.stop();
  await server.close();
}
