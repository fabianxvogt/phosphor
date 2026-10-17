// Native, limiter-enabled r4 staging and scheduled-strike evidence.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { options, serve, launch, openLab } from "./browser-runtime.mjs";
const args = options({});
const out = resolve(args.out ?? "artifacts/orrery/r4-live");
await mkdir(out, { recursive: true });
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
try {
  const lab = await openLab(runtime.browser, server.url);
  const result = await lab.page.evaluate(async () => {
    const { engine, scenes, presetSnapshot } = window.__phosphorLab;
    const { PALETTES } = await import("../../palettes.mjs");
    const { defaultPattern } = await import("../../rhythm.mjs");
    const scene = scenes.find((s) => s.id === "orrery");
    const gl = engine.gl;
    const renderer = gl.getParameter(
      gl.getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ??
        gl.RENDERER,
    );
    if (/software|swiftshader|llvmpipe/i.test(renderer))
      throw new Error(renderer);
    const rows = [];
    const capture = async (name, spec) => {
      for (let i = 0; i < 3; i++) {
        await new Promise((done) => requestAnimationFrame(done));
        engine.present();
      }
      const c = document.createElement("canvas");
      c.width = engine.width;
      c.height = engine.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(engine.canvas, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let lit = 0,
        white = 0;
      for (let i = 0; i < data.length; i += 4) {
        lit += Number(Math.max(data[i], data[i + 1], data[i + 2]) > 12);
        white += Number(Math.min(data[i], data[i + 1], data[i + 2]) > 230);
      }
      const row = {
        name,
        ...spec,
        lit: lit / (c.width * c.height),
        white: white / (c.width * c.height),
        limiter: engine.options.flashLimit,
        glError: gl.getError(),
        nonFinite:
          engine.counters.nonFinite + window.__harness.nonFiniteUploads,
        rhythm: Array.from(engine.slots.at(-1).rhythm.values),
        png: c.toDataURL("image/png").split(",")[1],
      };
      if (
        !row.limiter ||
        row.glError ||
        row.nonFinite ||
        row.lit < 0.04 ||
        row.white > 0.1
      )
        throw new Error(JSON.stringify({ ...row, png: null }));
      rows.push(row);
    };
    engine.options.flashLimit = true;
    engine.speed = 1;
    engine.view = { hue: 0, zoom: 1 };
    engine.blackout = engine.blackoutTarget = 0;
    for (const palette of ["phosphor", "ember", "glacier"])
      for (const development of [0, 1, 2])
        for (const energy of [0.1, 0.5, 0.9]) {
          const snapshot = presetSnapshot(scene, 0);
          snapshot.params.development = development;
          snapshot.palette = PALETTES.find((p) => p.id === palette).colors;
          engine.resize(600, 600);
          engine.setLevel(energy, 0);
          engine.load(snapshot, 0, { energy: 0.5 });
          if (!(await engine.ready("orrery"))) throw new Error("compile");
          engine.slots.at(-1).time = 43200;
          for (let tick = 0; tick < 40; tick++) {
            engine.setRhythmFrame({
              beat: 14 + (tick * 126) / 3600,
              origin: 0,
              settings: {
                families: { orrery: defaultPattern(scene.rhythm, "driving") },
              },
            });
            engine.advance(1 / 60, false);
            await new Promise((done) => setTimeout(done, 0));
          }
          await capture(`${palette}-${development}-${energy}`, {
            palette,
            development,
            energy,
          });
        }
    // Actual authored strike at beat 15. Other family accents are muted so
    // the contact → face propagation → recovery is not confused with them.
    const snapshot = presetSnapshot(scene, 2);
    engine.resize(960, 540);
    engine.setLevel(0.85, 0);
    engine.load(snapshot, 0, { energy: 0.5 });
    await engine.ready("orrery");
    engine.slots.at(-1).time = 22;
    const pattern = defaultPattern(scene.rhythm, "driving");
    for (const t of pattern.tracks)
      if (t.effect !== "escapement-strike") t.muted = true;
    for (let tick = 0; tick <= 45; tick++) {
      const beat = 14.8 + (tick * 126) / 3600;
      engine.setRhythmFrame({
        beat,
        origin: 0,
        settings: { families: { orrery: pattern } },
      });
      engine.advance(1 / 60, false);
      await new Promise((done) => setTimeout(done, 0));
      if ([4, 6, 9, 12, 16, 20, 26, 36].includes(tick))
        await capture(`strike-${String(tick).padStart(2, "0")}`, { beat });
    }
    return { renderer, rows };
  });
  for (const row of result.rows) {
    await writeFile(
      resolve(out, `${row.name}.png`),
      Buffer.from(row.png, "base64"),
    );
    delete row.png;
  }
  if (lab.errors.length) throw new Error(lab.errors.join("\n"));
  await writeFile(resolve(out, "report.json"), JSON.stringify(result, null, 2));
  console.log(
    `${result.rows.length} limiter-enabled captures; ${result.renderer}`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
