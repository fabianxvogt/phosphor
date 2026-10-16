// Thunderhead review stills at fixed beat times, so before/after rounds
// compare the same frames. Renders development × energy × beat on the native
// GPU; --reference <rev> routes the storm sources from that revision.
//   node scripts/storm-stills.mjs --rig --port 48304 --dev 0,1,2 --beats 8,9.1
// Options: --dev, --energy (0.5), --beats (8), --palette <id>, --look <name>
// (default Haze), --width 960 --height 540, --bpm 126, --name <dir>.
// Output: artifacts/stills/<name>/d<dev>-e<energy>-b<beat>.png + report.json
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
import { PALETTES } from "../palettes.mjs";

const args = options({
  dev: { type: "string", default: "0,1,2" },
  energy: { type: "string", default: "0.5" },
  beats: { type: "string", default: "8" },
  palette: { type: "string" },
  look: { type: "string", default: "Haze" },
  looks: { type: "boolean", default: false },
  width: { type: "string", default: "960" },
  height: { type: "string", default: "540" },
  bpm: { type: "string", default: "126" },
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
await import("node:fs/promises").then((fs) => fs.mkdir(out, { recursive: true }));
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
// Surface shader compile logs (engine reports only the link failure).
const logCompile = () => {
  const proto = WebGL2RenderingContext.prototype;
  const compile = proto.compileShader;
  proto.compileShader = function (shader) {
    compile.call(this, shader);
    if (!this.getShaderParameter(shader, this.COMPILE_STATUS))
      console.error("shader: " + this.getShaderInfoLog(shader));
  };
};
let browser = {
  newContext: async (opts) => {
    const context = await runtime.browser.newContext(opts);
    await context.addInitScript(logCompile);
    return context;
  },
};
if (args.reference) {
  const sources = new Map();
  browser = {
    newContext: async (opts) => {
      const context = await runtime.browser.newContext(opts);
      await context.addInitScript(logCompile);
      await context.route(/\/(scene-storm[^/]*|storm-model)\.mjs$/, (route) => {
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
}
const report = [];
try {
  const lab = await openLab(browser, server.url);
  if (process.env.STORM_DUMP) await lab.page.evaluate(() => (window.__stormDump = true));
  lab.page.on("console", (m) => {
    if (m.type() === "error") console.error(m.text().slice(0, 2000));
  });
  const lookNames = args.looks
    ? await lab.page.evaluate(() =>
        window.__phosphorLab.scenes.find((s) => s.id === "storm").presets.map((p) => p.name),
      )
    : [args.look];
  for (const look of lookNames)
  for (const development of args.looks ? [null] : list(args.dev))
    for (const energy of list(args.energy))
      for (const beat of list(args.beats)) {
        const shot = await lab.page.evaluate(
          async ({ development, energy, beat, palette, look, width, height, bpm }) => {
            const { engine, scenes, presetSnapshot } = window.__phosphorLab;
            const scene = scenes.find((s) => s.id === "storm");
            const snapshot = presetSnapshot(
              scene,
              scene.presets.findIndex((p) => p.name === look),
            );
            if (development !== null) snapshot.params.development = development;
            if (palette) snapshot.palette = { ...palette };
            engine.resize(width, height);
            engine.speed = 1;
            engine.view = { hue: 0, zoom: 1 };
            engine.options.flashLimit = false;
            engine.blackout = engine.blackoutTarget = 0;
            engine.beat = 0;
            engine.setLevel(energy, 0);
            engine.load(snapshot, 0, { energy });
            if (!(await engine.ready("storm"))) throw new Error("compile " + engine.programs.get("storm")?.error);
            while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
            const ticks = 6;
            engine.slots.at(-1).time = Math.max(0, (beat * 60) / bpm - ticks / 60);
            for (let t = ticks; t > 0; t--) {
              engine.beat = beat - ((t - 1) * bpm) / 3600;
              engine.advance(1 / 60, false);
            }
            engine.present();
            const gl = engine.gl;
            const c = document.createElement("canvas");
            c.width = width;
            c.height = height;
            c.getContext("2d").drawImage(engine.canvas, 0, 0);
            const bytes = c.getContext("2d").getImageData(0, 0, width, height).data;
            let lit = 0, sum = 0;
            for (let i = 0; i < bytes.length; i += 4) {
              const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
              lit += Number(p > 12);
              sum += p;
            }
            let dump = null;
            if (window.__stormDump) {
              const slot = engine.slots.at(-1);
              gl.bindFramebuffer(gl.FRAMEBUFFER, slot.precompute.fbo);
              const b = new Float32Array(1024 * 675 * 4);
              gl.readPixels(0, 0, 1024, 675, gl.RGBA, gl.FLOAT, b);
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              dump = Array.from(b);
            }
            return {
              dump,
              png: c.toDataURL("image/png").split(",")[1],
              lit: lit / (width * height),
              mean: sum / (width * height),
              glError: gl.getError(),
              nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
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
          },
        );
        const file = args.looks
          ? `${look.replace(/ /g, "-")}-e${energy}-b${beat}.png`
          : `d${development}-e${energy}-b${beat}.png`;
        await writeFile(resolve(out, file), Buffer.from(shot.png, "base64"));
        delete shot.png;
        if (shot.dump) {
          await writeFile(resolve(out, file.replace(".png", ".f32")), Buffer.from(new Float32Array(shot.dump).buffer));
          delete shot.dump;
        }
        report.push({ file, development, energy, beat, ...shot });
        console.log(JSON.stringify(report.at(-1)));
      }
  if (lab.errors.length) throw new Error(lab.errors.join("\n"));
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2));
} finally {
  await runtime.stop();
  await server.close();
}
