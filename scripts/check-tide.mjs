// Moon Tide review evidence: native/late/fallback shaders, reverse sweep,
// portrait, low-energy coverage and full-resolution stills. No live UI edits.
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
const args = options();
const out = await outputDirectory("films/tide-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig, headless: true });
try {
  const { page, errors } = await openLab(runtime.browser, server.url);
  const results = [];
  for (const shot of [
    {
      name: "calm-low-1080",
      index: 0,
      level: 0.1,
      width: 1920,
      height: 1080,
      time: 10,
    },
    {
      name: "swell-1080",
      index: 1,
      level: 0.5,
      width: 1920,
      height: 1080,
      time: 15,
    },
    {
      name: "maelstrom-4k",
      index: 2,
      level: 0.9,
      width: 3840,
      height: 2160,
      time: 25,
    },
    {
      name: "calm-portrait",
      index: 0,
      level: 0.1,
      width: 540,
      height: 960,
      time: 10,
    },
    {
      name: "maelstrom-portrait",
      index: 2,
      level: 0.9,
      width: 540,
      height: 960,
      time: 25,
    },
    {
      name: "swell-hour",
      index: 1,
      level: 0.5,
      width: 960,
      height: 540,
      time: 3600,
    },
    {
      name: "maelstrom-12h",
      index: 2,
      level: 0.9,
      width: 960,
      height: 540,
      time: 43200,
    },
  ]) {
    await page.evaluate(renderLook, {
      sceneId: "tide",
      ...shot,
      frames: 2,
      capture: false,
      pollHealth: false,
    });
    const capture = await page.evaluate(async ({ time }) => {
      const { engine } = window.__phosphorLab,
        slot = engine.slots.at(-1);
      slot.time = time;
      engine.advance(1 / 60, false);
      // Late compilation is asynchronous: finish before judging the actual
      // late image (a missing clock uniform must never silently fall back).
      for (let i = 0; i < 120; i++) {
        engine.programsFor(slot);
        const late = engine.programs.get("tide").late;
        if (late?.error) throw new Error(late.error);
        if (late?.visual && late?.precompute) {
          engine.finishProgram(late.visual);
          engine.finishProgram(late.precompute);
          break;
        }
        await new Promise((done) => setTimeout(done, 10));
      }
      engine.advance(1 / 60, false);
      engine.present();
      const programs = engine.programs.get("tide");
      if (
        !programs.late?.visual?.uniforms ||
        !programs.late?.precompute?.uniforms
      )
        throw new Error("Late visual/precompute did not compile");
      const c = document.createElement("canvas");
      c.width = engine.width;
      c.height = engine.height;
      const context = c.getContext("2d");
      context.drawImage(engine.canvas, 0, 0);
      const pixels = context.getImageData(0, 0, c.width, c.height).data;
      let lit = 0,
        waterLit = 0,
        total = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const l = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        lit += l > 12 ? 1 : 0;
        total += l;
        if (i > pixels.length * 0.5) waterLit += l > 12 ? 1 : 0;
      }
      return {
        png: c.toDataURL("image/png").split(",")[1],
        glError: engine.gl.getError(),
        nonFinite:
          engine.counters.nonFinite + window.__harness.nonFiniteUploads,
        gpuErrors: engine.counters.gpuErrors,
        lateCompiled: true,
        litFraction: lit / (pixels.length / 4),
        lowerHalfLitFraction: waterLit / (pixels.length / 8),
        meanMaxChannel: total / (pixels.length / 4),
      };
    }, shot);
    assert.equal(capture.glError, 0);
    assert.equal(capture.nonFinite, 0);
    assert.equal(capture.gpuErrors, 0);
    assert.ok(capture.litFraction > 0.07, `${shot.name}: non-empty`);
    await writeFile(
      resolve(out, `${shot.name}.png`),
      Buffer.from(capture.png, "base64"),
    );
    const { png, ...health } = capture;
    results.push({ ...shot, ...health });
  }
  const extra = await page.evaluate(async () => {
    const { engine, scenes, presetSnapshot } = window.__phosphorLab;
    const scene = scenes.find((s) => s.id === "tide"),
      slot = engine.slots.at(-1);
    // Explicit fallback compilation: no PRECOMPUTED macro.
    const { shaderHeader } = await import("/scene-contract.mjs");
    const early = engine.program(shaderHeader + scene.fragment, true);
    const late = engine.program(
      shaderHeader.replace(
        "#version 300 es",
        "#version 300 es\n#define PHOSPHOR_LATE",
      ) + scene.fragment,
      true,
    );
    engine.finishProgram(early);
    engine.finishProgram(late);
    engine.gl.deleteProgram(early.p);
    engine.gl.deleteProgram(late.p);
    const snapshot = presetSnapshot(scene, 0);
    engine.resize(480, 270);
    engine.load(snapshot, 0, { energy: 0.5 });
    await engine.ready("tide");
    const identities = [];
    for (const development of [0, 0.5, 1, 1.5, 2, 1.5, 1, 0.5, 0]) {
      const next = structuredClone(engine.active);
      next.params.development = development;
      engine.setSnapshot(next);
      engine.advance(1 / 60, false);
      identities.push({
        seed: engine.slots.at(-1).snapshot.seed,
        slotSame: engine.slots.length === 1,
      });
    }
    return {
      fallbackCompiled: true,
      identities,
      glError: engine.gl.getError(),
      nonFinite: engine.counters.nonFinite,
    };
  });
  assert.equal(extra.glError, 0);
  assert.equal(extra.nonFinite, 0);
  assert.ok(extra.identities.every((x) => x.seed === 10301 && x.slotSame));
  // Readable contact grid, including all eight looks at all three energies.
  await page.goto(server.url + "artifacts/contact/tide-final/index.html");
  await page.setViewportSize({ width: 1560, height: 1000 });
  await page.screenshot({
    path: resolve(out, "energy-ladder.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "verification.json"),
    JSON.stringify({ results, extra, errors }, null, 2),
  );
  console.log(JSON.stringify({ results, extra, errors }, null, 2));
} finally {
  await runtime.stop();
  await server.close();
}
