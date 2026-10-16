// Native family-local visual/health regression; does not alter shipped runtime.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-metamorphosis.mjs --rig --port 48600
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
if (!args.rig || process.env.PHOSPHOR_HEADLESS_RIG !== "1")
  throw new Error("Use --rig and PHOSPHOR_HEADLESS_RIG=1");
const out = await outputDirectory("verification/unfolding-r3/matrix", args.out);
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
  assert.doesNotMatch(renderer, /swiftshader|software|llvmpipe/i);
  const snapshots = await lab.page.evaluate(() => {
    const { scenes, presetSnapshot } = window.__phosphorLab;
    const scene = scenes.find((s) => s.id === "metamorphosis");
    return scene.presets.map((_, i) => presetSnapshot(scene, i));
  });
  for (const [index, snapshot] of snapshots.entries()) {
    for (const palette of [null, "ember", "glacier"]) {
      const look = structuredClone(snapshot);
      if (palette)
        look.palette = { ...PALETTES.find((p) => p.id === palette).colors };
      for (const level of [0.1, 0.5, 0.9]) {
        const health = await lab.page.evaluate(
          async (input) => {
            const { renderLook } = await import("/tests/browser/client.mjs");
            const { rgba, ...result } = await renderLook(input);
            return result;
          },
          {
            sceneId: "metamorphosis",
            snapshot: look,
            level,
            width: 640,
            height: 360,
            frames: 16,
            capture: true,
            pollHealth: false,
          },
        );
        assert.equal(health.glError, 0);
        assert.equal(health.nonFinite, 0);
        assert.ok(health.peak > 30);
        const file = `${index}-${palette ?? "own"}-${level}.png`;
        await writeFile(resolve(out, file), Buffer.from(health.png, "base64"));
        rows.push({
          index,
          palette,
          level,
          peak: health.peak,
          glError: health.glError,
          nonFinite: health.nonFinite,
        });
      }
    }
  }
  for (const [width, height] of [
    [540, 960],
    [720, 720],
  ]) {
    const health = await lab.page.evaluate(renderLook, {
      sceneId: "metamorphosis",
      index: 5,
      level: 0.9,
      width,
      height,
      frames: 20,
      capture: false,
      pollHealth: false,
    });
    assert.equal(health.glError, 0);
    assert.equal(health.nonFinite, 0);
    const result = await lab.page.evaluate(async () => {
      const { engine } = window.__phosphorLab;
      const slot = engine.slots.at(-1),
        mesh = slot.mesh,
        time = slot.time;
      const base = structuredClone(engine.active);
      const sequence = [2, 1.5, 1, 0.5, 0, 0.5, 1, 1.5, 2];
      for (const development of sequence) {
        const snapshot = structuredClone(base);
        snapshot.params.development = development;
        engine.setSnapshot(snapshot);
        engine.advance(0, true);
        if (slot.mesh !== mesh || slot.time !== time)
          throw new Error("development changed mesh/time identity");
      }
      slot.time = 43200;
      for (let i = 0; i < 8; i++) {
        engine.advance(1 / 60, false);
        await new Promise((r) => requestAnimationFrame(r));
      }
      engine.present();
      const canvas = document.createElement("canvas");
      canvas.width = engine.width;
      canvas.height = engine.height;
      canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
      return {
        png: canvas.toDataURL("image/png").split(",")[1],
        glError: engine.gl.getError(),
        nonFinite:
          engine.counters.nonFinite + window.__harness.nonFiniteUploads,
        late: !!engine.programs.get(slot.scene.id)?.late?.geometry?.uniforms,
        vertices: slot.mesh.count,
        reversal: sequence,
      };
    });
    assert.equal(result.glError, 0);
    assert.equal(result.nonFinite, 0);
    assert.ok(result.late, "late mesh variant compiled");
    await writeFile(
      resolve(out, `late-${width}x${height}.png`),
      Buffer.from(result.png, "base64"),
    );
    delete result.png;
    rows.push({ width, height, ...result });
  }
  // Unlike deterministic films/renderLook, allow the unmodified asynchronous
  // limiter to approve real RAF presentation. This is a smoke, not venue certification.
  const live = await lab.page.evaluate(async () => {
    const { engine } = window.__phosphorLab;
    engine.resize(960, 540);
    engine.setLevel(0.9, 0);
    engine.options.flashLimit = true;
    for (let i = 0; i < 180; i++) {
      engine.beat = 100 + (i * 2.1) / 60;
      engine.advance(1 / 60, false);
      engine.present();
      await new Promise(requestAnimationFrame);
    }
    return {
      frames: 180,
      limiter: engine.options.flashLimit,
      glError: engine.gl.getError(),
      nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
      gpuErrors: engine.counters.gpuErrors,
    };
  });
  assert.equal(live.limiter, true);
  assert.equal(live.glError, 0);
  assert.equal(live.nonFinite, 0);
  assert.equal(live.gpuErrors, 0);
  assert.deepEqual(lab.errors, []);
  await writeFile(
    resolve(out, "health.json"),
    JSON.stringify({ renderer, rows, live, errors: lab.errors }, null, 2) +
      "\n",
  );
  console.log(
    `PASS: ${rows.length} cases, 54 palette/energy/seed images, square/portrait reversal and 12h mesh, 180 limiter-enabled RAF frames, zero GL/non-finite errors`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
