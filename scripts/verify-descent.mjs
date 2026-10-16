// Endless Descent review stills at fixed beat times, so before/after rounds
// compare the same frames. Renders development × energy × beat on the native
// GPU after a warm-up run of the beat clock (rhythm envelopes and travel are
// real); --reference <rev> routes scene-descent.mjs from that revision.
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-descent.mjs --rig --port 48561 \
//     --dev 0,1,2 --energy 0.1,0.9 --beats 16,16.5 --sheet
// Options: --dev, --energy (0.5), --beats (16), --palette <id>, --look
// (default Sponge Corridor), --style restrained|driving|accented, --late
// <seconds> (scene-time offset, checks u_time wrap), --warm <beats> of
// clock before each frame (default 8; travel starts at the seed), --width 960 --height 540,
// --bpm 126, --name <dir>, --sheet (tile all stills into sheet.png, needs
// ffmpeg), --columns 4.
// Output: artifacts/stills/descent-<name>/<index>-d<dev>-e<energy>-b<beat>.png
// + report.json (lit fraction, mean, GL and non-finite counters).
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options({
  dev: { type: "string", default: "0,1,2" },
  energy: { type: "string", default: "0.5" },
  beats: { type: "string", default: "16" },
  palette: { type: "string" },
  look: { type: "string", default: "Sponge Corridor" },
  style: { type: "string" },
  late: { type: "string", default: "0" },
  warm: { type: "string", default: "8" },
  width: { type: "string", default: "960" },
  height: { type: "string", default: "540" },
  bpm: { type: "string", default: "126" },
  name: { type: "string", default: "current" },
  reference: { type: "string" },
  sheet: { type: "boolean", default: false },
  columns: { type: "string", default: "4" },
});
const list = (s) => s.split(",").map(Number);
const palette =
  args.palette === undefined
    ? null
    : PALETTES.find((p) => p.id === args.palette)?.colors;
if (args.palette !== undefined && !palette)
  throw new Error(`Unknown palette ${args.palette}`);
const out = resolve(await outputDirectory("stills"), `descent-${args.name}`);
await mkdir(out, { recursive: true });
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const logCompile = () => {
  const proto = WebGL2RenderingContext.prototype;
  const compile = proto.compileShader;
  proto.compileShader = function (shader) {
    compile.call(this, shader);
    if (!this.getShaderParameter(shader, this.COMPILE_STATUS))
      console.error("shader: " + this.getShaderInfoLog(shader));
  };
};
const sources = new Map();
const browser = {
  newContext: async (opts) => {
    const context = await runtime.browser.newContext(opts);
    await context.addInitScript(logCompile);
    if (args.reference)
      await context.route(/\/scene-descent\.mjs$/, (route) => {
        const file = new URL(route.request().url()).pathname.slice(1);
        if (!sources.has(file))
          sources.set(
            file,
            execFileSync("git", ["show", `${args.reference}:${file}`], {
              encoding: "utf8",
            }),
          );
        return route.fulfill({
          contentType: "text/javascript",
          body: sources.get(file),
        });
      });
    return context;
  },
};
const report = [];
const files = [];
try {
  const lab = await openLab(browser, server.url);
  lab.page.on("console", (m) => {
    if (m.type() === "error") console.error(m.text().slice(0, 2000));
  });
  // One load per development × energy; the clock then runs forward through
  // the requested beats (ascending), so travel and envelopes are continuous.
  const beats = list(args.beats).sort((x, y) => x - y);
  for (const development of list(args.dev))
    for (const energy of list(args.energy)) {
      const shots = await lab.page.evaluate(
        async ({
          development,
          energy,
          beats,
          palette,
          look,
          style,
          late,
          warm,
          width,
          height,
          bpm,
        }) => {
          const { engine, scenes, presetSnapshot } = window.__phosphorLab;
          const scene = scenes.find((s) => s.id === "descent");
          const index = scene.presets.findIndex((p) => p.name === look);
          if (index < 0) throw new Error(`Unknown look ${look}`);
          const snapshot = presetSnapshot(scene, index);
          if (Number.isFinite(development))
            snapshot.params.development = development;
          if (palette) snapshot.palette = { ...palette };
          engine.resize(width, height);
          engine.speed = 1;
          engine.view = { hue: 0, zoom: 1 };
          engine.blackout = engine.blackoutTarget = 0;
          engine.setLevel(energy, 0);
          // Keep the clip's anchor fixed so the energy ladder exercises
          // authored structure/speed slopes, not three re-anchored looks.
          engine.load(snapshot, 0, { energy: 0.5 });
          if (!(await engine.ready("descent")))
            throw new Error("compile " + engine.programs.get("descent")?.error);
          while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
          // Warm up for --warm beats of the clock before the first frame.
          let b = Math.max(0, beats[0] - warm);
          engine.slots.at(-1).time = late + (b * 60) / bpm;
          const gl = engine.gl;
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          const context = c.getContext("2d");
          const result = [];
          for (const beat of beats) {
            const ticks = Math.max(0, Math.round(((beat - b) * 3600) / bpm));
            const from = b;
            for (let t = 1; t <= ticks; t++) {
              const at = from + (t * bpm) / 3600;
              if (style) engine.setRhythmFrame({ beat: at, origin: 0, style });
              engine.beat = at;
              engine.advance(1 / 60, false);
              // Let the unmodified asynchronous flash approval fence settle.
              // A synchronous loop would capture a stale approved frame.
              await new Promise((done) => setTimeout(done, 0));
            }
            b = from + (ticks * bpm) / 3600;
            for (let settle = 0; settle < 3; settle++) {
              await new Promise((done) => requestAnimationFrame(done));
              engine.present();
            }
            context.drawImage(engine.canvas, 0, 0);
            const bytes = context.getImageData(0, 0, width, height).data;
            let lit = 0,
              sum = 0;
            for (let i = 0; i < bytes.length; i += 4) {
              const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
              lit += Number(p > 12);
              sum += p;
            }
            const rhythm = engine.slots.at(-1).rhythm;
            result.push({
              beat,
              png: c.toDataURL("image/png").split(",")[1],
              lit: lit / (width * height),
              mean: sum / (width * height),
              rhythm: rhythm
                ? Array.from(rhythm.values).map((v) => +v.toFixed(3))
                : null,
              glError: gl.getError(),
              nonFinite:
                engine.counters.nonFinite + window.__harness.nonFiniteUploads,
              gpuErrors: engine.counters.gpuErrors,
            });
          }
          return result;
        },
        {
          development,
          energy,
          beats,
          palette,
          look: args.look,
          style: args.style ?? null,
          late: Number(args.late),
          warm: Number(args.warm),
          width: Number(args.width),
          height: Number(args.height),
          bpm: Number(args.bpm),
        },
      );
      for (const shot of shots) {
        const file = `${String(files.length).padStart(2, "0")}-d${development}-e${energy}-b${shot.beat}.png`;
        await writeFile(resolve(out, file), Buffer.from(shot.png, "base64"));
        files.push(file);
        delete shot.png;
        report.push({ file, development, energy, ...shot });
        console.log(JSON.stringify(report.at(-1)));
        if (shot.glError || shot.nonFinite || shot.gpuErrors || shot.lit < 0.02)
          throw new Error(`Unhealthy or mostly empty frame: ${file}`);
      }
    }
  if (lab.errors.length) throw new Error(lab.errors.join("\n"));
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2));
  if (args.sheet && files.length > 1) {
    const columns = Math.min(Number(args.columns), files.length);
    const rows = Math.ceil(files.length / columns);
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      "-framerate",
      "1",
      "-pattern_type",
      "glob",
      "-i",
      resolve(out, "[0-9][0-9]-*.png"),
      "-vf",
      `scale=${Math.min(480, Number(args.width))}:-1,tile=${columns}x${rows}`,
      "-frames:v",
      "1",
      resolve(out, "sheet.png"),
    ]);
    console.log(resolve(out, "sheet.png"));
  }
} finally {
  await runtime.stop();
  await server.close();
}
