// Native, limiter-enabled Dune Sea energy/reversal/palette/late-time evidence.
// PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-dunes.mjs --rig --port 48701
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
  palettes: { type: "string", default: "phosphor,ember,glacier" },
  energies: { type: "string", default: "0.1,0.5,0.9" },
  dev: { type: "string", default: "0,0.5,1,1.5,2,1.5,1,0.5,0" },
  late: { type: "string", default: "0" },
  width: { type: "string", default: "960" },
  height: { type: "string", default: "540" },
});
const palettes = args.palettes.split(",").map((id) => {
  const palette = PALETTES.find((p) => p.id === id);
  if (!palette) throw new Error(`Unknown palette ${id}`);
  return palette;
});
const out = await outputDirectory("dunes-verification", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const palette of palettes)
    for (const energy of args.energies.split(",").map(Number)) {
      const shots = await lab.page.evaluate(
        async ({ palette, energy, dev, late, width, height }) => {
          const { engine, scenes, presetSnapshot } = window.__phosphorLab;
          const scene = scenes.find((s) => s.id === "dunes");
          const snapshot = presetSnapshot(scene, 0);
          snapshot.palette = palette.colors;
          engine.resize(width, height);
          engine.speed = 1;
          engine.view = { hue: 0, zoom: 1 };
          engine.blackout = engine.blackoutTarget = 0;
          engine.setLevel(energy, 0);
          engine.load(snapshot, 0, { energy: 0.5 });
          if (!(await engine.ready("dunes")))
            throw new Error("Dunes compile failed");
          while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
          engine.slots.at(-1).time = late;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          const shots = [];
          let beat = 32;
          for (const development of dev) {
            snapshot.params.development = development;
            engine.setSnapshot(snapshot);
            // Limiter is never disabled. Yield so asynchronous approval can finish.
            for (let i = 0; i < 36; i++) {
              beat += 126 / 3600;
              engine.beat = beat;
              engine.advance(1 / 60, false);
              await new Promise((done) => setTimeout(done, 0));
            }
            for (let i = 0; i < 3; i++) {
              await new Promise((done) => requestAnimationFrame(done));
              engine.present();
            }
            ctx.drawImage(engine.canvas, 0, 0);
            const bytes = ctx.getImageData(0, 0, width, height).data;
            let lit = 0,
              mean = 0;
            for (let i = 0; i < bytes.length; i += 4) {
              const v = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
              lit += Number(v > 12);
              mean += v;
            }
            const gl = engine.gl;
            shots.push({
              development,
              beat,
              lit: lit / (width * height),
              mean: mean / (width * height),
              glError: gl.getError(),
              gpuErrors: engine.counters.gpuErrors,
              nonFinite:
                engine.counters.nonFinite + window.__harness.nonFiniteUploads,
              limiterEnabled: engine.options.flashLimit !== false,
              png: canvas.toDataURL("image/png").split(",")[1],
            });
          }
          return shots;
        },
        {
          palette,
          energy,
          dev: args.dev.split(",").map(Number),
          late: Number(args.late),
          width: Number(args.width),
          height: Number(args.height),
        },
      );
      for (const shot of shots) {
        const file = `${String(rows.length).padStart(3, "0")}-${palette.id}-e${energy}-d${shot.development}.png`;
        const { png, ...health } = shot;
        await writeFile(resolve(out, file), Buffer.from(png, "base64"));
        rows.push({
          file,
          palette: palette.id,
          energy,
          late: Number(args.late),
          ...health,
        });
        console.log(JSON.stringify(rows.at(-1)));
        if (
          shot.glError ||
          shot.gpuErrors ||
          shot.nonFinite ||
          !shot.limiterEnabled ||
          shot.lit < 0.03
        )
          throw new Error(`Unhealthy frame ${file}`);
      }
    }
  if (lab.errors.length) throw new Error(lab.errors.join("\n"));
  await writeFile(
    resolve(out, "report.json"),
    JSON.stringify(rows, null, 2) + "\n",
  );
} finally {
  await runtime.stop();
  await server.close();
}
