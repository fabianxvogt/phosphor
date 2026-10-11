// Moving contact sheets with the real engine and native Chrome GPU.
// --families comma-list, --studies imports the three unregistered studies.
// Synthetic frame stepping checks behaviour/pixels, never certifies rig timing.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
const args = options({
  families: { type: "string" },
  "all-looks": { type: "boolean", default: false },
  studies: { type: "boolean", default: false },
});
const out = await outputDirectory("rhythm-review", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const results = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  const ids = await lab.page.evaluate(
    async ({ families, studies, ...rest }) => {
      const { engine, scenes } = window.__phosphorLab;
      if (studies)
        for (const name of ["physarum", "caustics", "colonization"]) {
          if (!scenes.some((s) => s.id === name))
            scenes.push((await import(`/scene-${name}.mjs`)).default);
        }
      const { initialRhythm } = await import("/rhythm.mjs");
      window.__auditRhythm = initialRhythm(scenes);
      // Isolate family gestures so a global zoom/flash cannot hide weak identity.
      window.__auditRhythm.global.tracks.forEach((t) => (t.muted = true));
      return scenes
        .filter((s) => !families || families.split(",").includes(s.id))
        .flatMap((s) =>
          (rest["all-looks"] ? s.presets : [s.presets[0]]).map((p, index) => ({
            id: s.id,
            index,
          })),
        );
    },
    args,
  );
  for (const entry of ids) {
    const result = await lab.page.evaluate(async ({ id, index }) => {
      const { engine, scenes, presetSnapshot } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === id),
        width = 320,
        height = 180;
      engine.resize(width, height);
      engine.options.flashLimit = false;
      engine.options.echo = 0;
      engine.options.kaleido = 1;
      engine.features = { active: false, locked: false };
      engine.speed = 1;
      const sheet = document.createElement("canvas");
      sheet.width = width * 4;
      sheet.height = (height + 24) * 3;
      const ctx = sheet.getContext("2d");
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, sheet.width, sheet.height);
      const sample = document.createElement("canvas");
      sample.width = width;
      sample.height = height;
      const pixels = sample.getContext("2d", { willReadFrequently: true });
      const data = [];
      for (const [row, level] of [0.1, 0.5, 0.9].entries()) {
        engine.setLevel(level, 0);
        let frame = {
          beat: 0,
          origin: 0,
          settings: window.__auditRhythm,
          enabled: true,
        };
        engine.setRhythmFrame(frame);
        const snapshot = presetSnapshot(scene, index);
        snapshot.seed = 77391;
        engine.load(snapshot, 0, { energy: 0.5 });
        if (!(await engine.ready(id))) throw Error(`${id}: shader failed`);
        while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
        const capture = [242, 258, 272, 362];
        let column = 0,
          previous = null;
        for (let i = 1; i <= 362; i++) {
          engine.setRhythmFrame({ ...frame, beat: i / 30 });
          engine.advance(1 / 60, false);
          if (!capture.includes(i)) continue;
          engine.present();
          pixels.drawImage(engine.canvas, 0, 0);
          const bytes = pixels.getImageData(0, 0, width, height).data;
          let mean = 0,
            peak = 0,
            bright = 0,
            delta = 0;
          for (let p = 0; p < bytes.length; p += 4) {
            const l =
              0.2126 * bytes[p] + 0.7152 * bytes[p + 1] + 0.0722 * bytes[p + 2];
            mean += l;
            peak = Math.max(peak, l);
            if (l > 240) bright++;
            if (previous)
              delta +=
                Math.abs(bytes[p] - previous[p]) +
                Math.abs(bytes[p + 1] - previous[p + 1]) +
                Math.abs(bytes[p + 2] - previous[p + 2]);
          }
          data.push({
            level,
            beat: i / 30,
            mean: mean / (width * height),
            peak,
            white: bright / (width * height),
            delta: previous ? delta / (width * height * 3) : null,
          });
          previous = new Uint8ClampedArray(bytes);
          ctx.drawImage(sample, column * width, row * (height + 24));
          ctx.fillStyle = "#ddd";
          ctx.font = "13px sans-serif";
          ctx.fillText(
            `${scene.name} · E${level} · beat ${(i / 30).toFixed(2)}`,
            column * width + 8,
            row * (height + 24) + height + 17,
          );
          column++;
        }
      }
      return {
        id: `${id}${index ? "-" + index : ""}`,
        name: scene.name,
        preset: scene.presets[index].name,
        data,
        errors: window.__phosphorLab.errors,
        stats: engine.stats(),
        gpuError: engine.gl.getError(),
        nonfinite: window.__harness.nonFiniteUploads,
        png: sheet.toDataURL("image/png").split(",")[1],
      };
    }, entry);
    await writeFile(
      resolve(out, `${result.id}.png`),
      Buffer.from(result.png, "base64"),
    );
    delete result.png;
    results.push(result);
    console.log(
      `${result.id}: mean ${result.data.map((r) => r.mean.toFixed(1)).join("/")} GL=${result.gpuError}`,
    );
  }
  const report = {
    results,
    errors: lab.errors,
    kind: "EMPIRICAL native headless behavioural/pixel check; no rig timing claim",
  };
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(report, null, 2),
  );
  await writeFile(
    resolve(out, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Phosphor rhythm review</title><style>body{background:#151819;color:#ddd;font:16px system-ui;max-width:1280px;margin:32px auto}img{width:100%}article{margin:28px 0}p{color:#aaa}</style><h1>Family rhythms in motion</h1><p>Four moments at energy .1 / .5 / .9; global effects muted. Native GPU, synthetic frame stepping.</p>${results.map((r) => `<article><h2>${r.name}</h2><img src="${r.id}.png"></article>`).join("")}`,
  );
  if (
    lab.errors.length ||
    results.some((r) => r.gpuError || r.nonfinite || r.errors.length)
  )
    throw Error("Rendering errors; inspect results.json");
} finally {
  await runtime.stop();
  await server.close();
}
console.log(`Saved ${out}`);
