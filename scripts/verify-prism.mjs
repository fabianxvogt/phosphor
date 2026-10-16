// Native, limiter-enabled Prism Engine evidence. Never changes live safety.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-prism.mjs --rig --port 48801
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
import prism from "../scene-prism.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options({});
if (!args.rig) throw new Error("--rig required");
const out = await outputDirectory("prism-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const cases = [];
for (let index = 0; index < prism.presets.length; index++)
  for (const energy of [0.1, 0.5, 0.9]) cases.push({ index, energy });
for (const palette of ["ember", "glacier"])
  for (const development of [0, 1, 2])
    for (const energy of [0.1, 0.5, 0.9])
      cases.push({ development, energy, palette });
for (const development of [0, 1, 2])
  cases.push({ development, energy: 0.85, portrait: true });
for (const late of [3600, 4096, 43200])
  cases.push({ development: 2, energy: 0.9, late });
for (const muted of [false, true])
  for (const beat of [16.15, 16.4, 16.7])
    cases.push({ development: 2, energy: 0.85, muted, beat });
// These cases keep one live slot, seed and clock while reversing development.
for (const development of [0, 0.5, 1, 1.5, 2, 1.5, 1, 0.5, 0])
  cases.push({ development, energy: 0.85, reverse: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  const renderer = await lab.page.evaluate(() => {
    const gl = window.__phosphorLab.engine.gl;
    return gl.getParameter(
      gl.getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ??
        gl.RENDERER,
    );
  });
  if (/software|swiftshader|llvmpipe/i.test(renderer))
    throw new Error(renderer);
  let previousReverse = false;
  for (const [i, spec] of cases.entries()) {
    const colors = spec.palette
      ? PALETTES.find((p) => p.id === spec.palette)?.colors
      : null;
    const shot = await lab.page.evaluate(
      async ({ spec, colors, keep }) => {
        const { engine, scenes, presetSnapshot } = window.__phosphorLab;
        const { defaultPattern } = await import("../../rhythm.mjs");
        const scene = scenes.find((s) => s.id === "prism");
        const snapshot = presetSnapshot(scene, spec.index ?? 0);
        if (spec.development !== undefined)
          snapshot.params.development = spec.development;
        if (colors) snapshot.palette = { ...colors };
        const width = spec.portrait ? 540 : 640,
          height = spec.portrait ? 810 : 360;
        engine.resize(width, height);
        engine.speed = 1;
        engine.view = { hue: 0, zoom: 1 };
        engine.blackout = engine.blackoutTarget = 0;
        engine.options.flashLimit = true;
        engine.setLevel(spec.energy, 0);
        if (keep) engine.setSnapshot(snapshot);
        else engine.load(snapshot, 0, { energy: 0.5 });
        if (!(await engine.ready("prism")))
          throw new Error("Prism compile failed");
        const slot = engine.slots.at(-1);
        if (!keep) slot.time = spec.late ?? 0;
        const pattern = defaultPattern(scene.rhythm, "driving");
        if (spec.muted)
          pattern.tracks.find((t) => t.effect === "spectral-relay").muted =
            true;
        const end = spec.beat ?? 16.3;
        // Actual advancing beat clock, including asynchronous flash approval.
        for (let tick = 0; tick < 36; tick++) {
          engine.setRhythmFrame({
            beat: end - ((35 - tick) * 126) / 3600,
            origin: 0,
            settings: { families: { prism: pattern } },
          });
          engine.advance(1 / 60, false);
          await new Promise((done) => setTimeout(done, 0));
        }
        for (let settle = 0; settle < 3; settle++) {
          await new Promise((done) => requestAnimationFrame(done));
          engine.present();
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(engine.canvas, 0, 0);
        const pixels = ctx.getImageData(0, 0, width, height).data;
        let lit = 0,
          white = 0,
          sum = 0;
        for (let p = 0; p < pixels.length; p += 4) {
          const max = Math.max(pixels[p], pixels[p + 1], pixels[p + 2]);
          lit += Number(max > 12);
          sum += max;
          white += Number(
            Math.min(pixels[p], pixels[p + 1], pixels[p + 2]) > 230,
          );
        }
        let signatureChanged = null;
        if (spec.muted === false) {
          window.__prismSignature ??= {};
          window.__prismSignature[spec.beat] = Array.from(pixels);
        } else if (spec.muted === true) {
          const original = window.__prismSignature[spec.beat];
          let changed = 0;
          for (let p = 0; p < pixels.length; p += 4)
            changed += Number(
              Math.max(
                ...[0, 1, 2].map((c) =>
                  Math.abs(pixels[p + c] - original[p + c]),
                ),
              ) > 8,
            );
          signatureChanged = changed / (width * height);
          if (signatureChanged < 0.001 || slot.rhythm.values[3] !== 0)
            throw new Error("Signature is invisible or fails to mute");
        }
        return {
          signatureChanged,
          png: canvas.toDataURL("image/png").split(",")[1],
          lit: lit / (width * height),
          white: white / (width * height),
          mean: sum / (width * height),
          rhythm: Array.from(slot.rhythm.values),
          limiterEnabled: engine.options.flashLimit,
          glError: engine.gl.getError(),
          nonFinite:
            engine.counters.nonFinite + window.__harness.nonFiniteUploads,
          gpuErrors: engine.counters.gpuErrors,
        };
      },
      { spec, colors, keep: previousReverse && !!spec.reverse },
    );
    previousReverse = !!spec.reverse;
    const file = `${String(i).padStart(2, "0")}.png`;
    await writeFile(resolve(out, file), Buffer.from(shot.png, "base64"));
    delete shot.png;
    rows.push({ file, ...spec, ...shot });
    console.log(JSON.stringify(rows.at(-1)));
    if (
      shot.glError ||
      shot.nonFinite ||
      shot.gpuErrors ||
      shot.lit < 0.04 ||
      shot.white > 0.1 ||
      !shot.limiterEnabled
    )
      throw new Error(`Unhealthy/empty/unsafe frame ${file}`);
  }
  await writeFile(
    resolve(out, "report.json"),
    JSON.stringify({ renderer, rows, errors: lab.errors }, null, 2),
  );
  if (lab.errors.length) throw new Error(lab.errors.join("\n"));
  // Landscape matrix; portrait evidence stays in its original files.
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-reinit_filter",
    "0",
    "-framerate",
    "1",
    "-i",
    resolve(out, "%02d.png"),
    "-vf",
    "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,tile=6x11",
    "-frames:v",
    "1",
    resolve(out, "sheet.png"),
  ]);
} finally {
  await runtime.stop();
  await server.close();
}
