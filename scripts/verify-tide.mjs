// Moon Tide review stills at fixed beat times, so before/after rounds compare
// the same frames. Renders development × energy × beat on the native GPU with
// the authored rhythm running (the engine samples it from engine.beat); the
// last --warm beats are simulated tick by tick so the camera spring and the
// roller latch see the real event history. --reference <rev> routes
// scene-tide.mjs from that revision.
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-tide.mjs --rig --port 48441 \
//     --dev 0,1,2 --energy 0.1,0.85 --beats 8,10
// Options: --dev, --energy (0.5), --beats (8), --palette <id>, --look <name>
// (default Calm), --looks (every preset at its own development), --width 960
// --height 540, --bpm 126, --warm 6 (beats), --time-offset <s> (late u_time),
// --name <dir>. Output: artifacts/stills/<name>/*.png + report.json.
import { execFileSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
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
  beats: { type: "string", default: "8" },
  palette: { type: "string" },
  look: { type: "string", default: "Calm" },
  looks: { type: "boolean", default: false },
  width: { type: "string", default: "960" },
  height: { type: "string", default: "540" },
  bpm: { type: "string", default: "126" },
  warm: { type: "string", default: "6" },
  "time-offset": { type: "string", default: "0" },
  name: { type: "string", default: "current" },
  reference: { type: "string" },
});
const list = (s) => s.split(",").map(Number);
const palette =
  args.palette === undefined
    ? null
    : PALETTES.find((p) => p.id === args.palette)?.colors;
if (args.palette !== undefined && !palette)
  throw new Error(`Unknown palette ${args.palette}`);
const out = resolve(await outputDirectory("stills"), args.name);
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
const browser = {
  newContext: async (opts) => {
    const context = await runtime.browser.newContext(opts);
    await context.addInitScript(logCompile);
    if (args.reference) {
      const body = execFileSync(
        "git",
        ["show", `${args.reference}:scene-tide.mjs`],
        { encoding: "utf8" },
      );
      await context.route(/\/scene-tide\.mjs$/, (route) =>
        route.fulfill({ contentType: "text/javascript", body }),
      );
    }
    return context;
  },
};
const report = [];
try {
  const lab = await openLab(browser, server.url);
  lab.page.on("console", (m) => {
    if (m.type() === "error") console.error(m.text().slice(0, 2000));
  });
  const lookNames = args.looks
    ? await lab.page.evaluate(() =>
        window.__phosphorLab.scenes
          .find((s) => s.id === "tide")
          .presets.map((p) => p.name),
      )
    : [args.look];
  for (const look of lookNames)
    for (const development of args.looks ? [null] : list(args.dev))
      for (const energy of list(args.energy))
        for (const beat of list(args.beats)) {
          const shot = await lab.page.evaluate(
            async (o) => {
              const { engine, scenes, presetSnapshot } = window.__phosphorLab;
              const scene = scenes.find((s) => s.id === "tide");
              const snapshot = presetSnapshot(
                scene,
                scene.presets.findIndex((p) => p.name === o.look),
              );
              if (o.development !== null)
                snapshot.params.development = o.development;
              if (o.palette) snapshot.palette = { ...o.palette };
              engine.resize(o.width, o.height);
              engine.speed = 1;
              engine.view = { hue: 0, zoom: 1 };
              engine.blackout = engine.blackoutTarget = 0;
              const ticks = Math.max(2, Math.round((o.warm * 3600) / o.bpm));
              const startBeat = o.beat - (ticks * o.bpm) / 3600;
              engine.beat = startBeat;
              engine.setLevel(o.energy, 0);
              engine.load(snapshot, 0, { energy: o.energy });
              if (!(await engine.ready("tide")))
                throw new Error(
                  "compile " + engine.programs.get("tide")?.error,
                );
              while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
              engine.slots.at(-1).time = Math.max(
                0,
                o.offset + (startBeat * 60) / o.bpm,
              );
              for (let t = ticks - 1; t >= 0; t--) {
                engine.beat = o.beat - (t * o.bpm) / 3600;
                engine.advance(1 / 60, false);
              }
              // Let the normal asynchronous safety pipeline approve this
              // exact frame; a tight simulation loop otherwise captures a
              // stale approved frame (or startup black). Never disable it.
              engine.pipeline.requestRefresh();
              for (let frame = 0; frame < 120; frame++) {
                await new Promise((done) => requestAnimationFrame(done));
                engine.present();
                if (!engine.pipeline.refreshPending) break;
              }
              if (engine.pipeline.refreshPending)
                throw new Error("Flash approval did not settle");
              const gl = engine.gl;
              const c = document.createElement("canvas");
              c.width = o.width;
              c.height = o.height;
              c.getContext("2d").drawImage(engine.canvas, 0, 0);
              const bytes = c
                .getContext("2d")
                .getImageData(0, 0, o.width, o.height).data;
              let lit = 0,
                sum = 0,
                white = 0;
              for (let i = 0; i < bytes.length; i += 4) {
                const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
                const q = Math.min(bytes[i], bytes[i + 1], bytes[i + 2]);
                lit += Number(p > 12);
                white += Number(q > 235);
                sum += p;
              }
              const n = o.width * o.height;
              return {
                png: c.toDataURL("image/png").split(",")[1],
                lit: lit / n,
                white: white / n,
                mean: sum / n,
                rhythm: Array.from(engine.slots.at(-1).rhythm?.values ?? []),
                glError: gl.getError(),
                nonFinite:
                  engine.counters.nonFinite + window.__harness.nonFiniteUploads,
                gpuErrors: engine.counters.gpuErrors,
              };
            },
            {
              development,
              energy,
              beat,
              palette,
              look,
              width: Number(args.width),
              height: Number(args.height),
              bpm: Number(args.bpm),
              warm: Number(args.warm),
              offset: Number(args["time-offset"]),
            },
          );
          const file = args.looks
            ? `${look.replace(/ /g, "-")}-e${energy}-b${beat}.png`
            : `d${development}-e${energy}-b${beat}.png`;
          await writeFile(resolve(out, file), Buffer.from(shot.png, "base64"));
          delete shot.png;
          report.push({ file, look, development, energy, beat, ...shot });
          console.log(JSON.stringify(report.at(-1)));
        }
  if (lab.errors.length) throw new Error(lab.errors.join("\n"));
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2));
} finally {
  await runtime.stop();
  await server.close();
}
