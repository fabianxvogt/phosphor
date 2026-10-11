// Short full-HD native, RAF-paced smoke; not an external-display/soak gate.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { serve, launch, openLab, outputDirectory } from "./browser-runtime.mjs";
const out = await outputDirectory("rhythm-native");
const server = await serve(".", 48136),
  runtime = await launch({ rig: true, headless: true });
const results = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const pair of [
    ["physarum"],
    ["caustics"],
    ["colonization"],
    ["physarum", "caustics"],
    ["colonization", "cathedral"],
    ["sandpile", "turmite"],
  ]) {
    const row = await lab.page.evaluate(async (pair) => {
      const { engine, scenes, presetSnapshot } = window.__phosphorLab;
      const { initialRhythm } = await import("/rhythm.mjs");
      const settings = initialRhythm(scenes);
      engine.resize(1920, 1080);
      engine.setLevel(0.9, 0);
      const load = async (id, seconds) => {
        engine.load(presetSnapshot(scenes.find((s) => s.id === id)), seconds, {
          energy: 0.5,
        });
        if (!(await engine.ready(id))) throw Error("Compile " + id);
        while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
      };
      await load(pair[0], 0);
      if (pair[1]) await load(pair[1], 8);
      const dt = [],
        raf = () => new Promise((r) => requestAnimationFrame(r));
      let previous = await raf();
      for (let i = 0; i < 200; i++) {
        const ms = await raf();
        engine.setRhythmFrame({
          beat: ms / 500,
          origin: 0,
          settings,
          enabled: true,
        });
        engine.advance(Math.min(0.1, (ms - previous) / 1000), false);
        if (i >= 20) dt.push(ms - previous);
        previous = ms;
      }
      dt.sort((a, b) => a - b);
      const quant = (p) => dt[Math.floor((dt.length - 1) * p)];
      const gl = engine.gl,
        debug = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        pair,
        p50: quant(0.5),
        p95: quant(0.95),
        p99: quant(0.99),
        max: dt.at(-1),
        renderer: gl.getParameter(
          debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER,
        ),
        gpuError: gl.getError(),
        stats: engine.stats(),
        nonfinite: window.__harness.nonFiniteUploads,
        errors: window.__phosphorLab.errors,
        png: engine.canvas.toDataURL("image/png").split(",")[1],
      };
    }, pair);
    await writeFile(
      resolve(out, pair.join("-") + ".png"),
      Buffer.from(row.png, "base64"),
    );
    delete row.png;
    results.push(row);
    console.log(JSON.stringify(row));
  }
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(
      {
        kind: "Native headless full-HD short-run smoke, not venue certification",
        results,
        errors: lab.errors,
      },
      null,
      2,
    ),
  );
  if (
    results.some(
      (r) =>
        r.gpuError ||
        r.nonfinite ||
        r.errors.length ||
        r.stats.textures !== r.stats.liveTextures,
    ) ||
    lab.errors.length
  )
    throw Error("Rendering/lifetime errors");
} finally {
  await runtime.stop();
  await server.close();
}
