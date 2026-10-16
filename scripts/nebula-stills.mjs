// Held stills of Spiral Nebula (or any continuous look) at chosen
// developments, scene times and energies, rendered on the beat clock like
// world-film.mjs. Faster than a film for iteration and before/after sets.
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/nebula-stills.mjs --rig --port 48384 \
//     --dev 0,1,2 --at 4,12 --level 0.5 --palette ember --width 960 --height 540
// Output: artifacts/stills/<name>-d<dev>-t<at>-e<level>.png and a
// metrics line per still (mean, lit fraction, accent-free GL health).
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
  lookList,
} from "./browser-runtime.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options({
  look: { type: "string", default: "nebula:Drifting Dust" },
  dev: { type: "string", default: "0,1,2" },
  at: { type: "string", default: "6" },
  level: { type: "string", default: "0.5" },
  palette: { type: "string" },
  width: { type: "string", default: "960" },
  height: { type: "string", default: "540" },
  bpm: { type: "string", default: "126" },
  name: { type: "string" },
});
const list = (s) => s.split(",").map(Number);
const palette =
  args.palette === undefined
    ? null
    : PALETTES.find((p) => p.id === args.palette)?.colors;
if (args.palette && !palette) throw new Error(`Unknown palette ${args.palette}`);
const out = await outputDirectory("stills", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
try {
  const lab = await openLab(runtime.browser, server.url);
  const looks = await lookList(lab.page);
  const first = looks.find((l) => `${l.sceneId}:${l.name}` === args.look);
  if (!first) throw new Error(`Unknown look ${args.look}`);
  const base =
    args.name ??
    args.look.replace(/[^a-z0-9]+/gi, "-").toLowerCase() +
      (args.palette ? `-${args.palette}` : "");
  for (const dev of list(args.dev))
    for (const level of list(args.level)) {
      const shots = await lab.page.evaluate(
        async ({ first, dev, level, ats, palette, width, height, bpm }) => {
          const { engine, scenes, presetSnapshot } = window.__phosphorLab;
          const scene = scenes.find((s) => s.id === first.sceneId);
          const snapshot = presetSnapshot(scene, first.index);
          if (palette) snapshot.palette = { ...palette };
          snapshot.params[scene.development] = dev;
          engine.resize(width, height);
          engine.speed = 1;
          engine.view = { hue: 0, zoom: 1 };
          engine.options.flashLimit = false;
          engine.blackout = engine.blackoutTarget = 0;
          engine.setLevel(level, 0);
          engine.load(snapshot, 0, { energy: level });
          if (!(await engine.ready(snapshot.scene)))
            throw new Error("scene failed to compile");
          while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          let beat = 0,
            time = 0;
          const result = [];
          for (const at of ats) {
            while (time < at - 1e-6) {
              beat += bpm / 60 / 60;
              engine.beat = beat;
              engine.advance(1 / 60, false);
              time += 1 / 60;
            }
            engine.present();
            context.drawImage(engine.canvas, 0, 0);
            const data = context.getImageData(0, 0, width, height).data;
            let sum = 0,
              lit = 0;
            for (let i = 0; i < data.length; i += 4) {
              const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
              sum += y;
              if (y > 24) lit++;
            }
            result.push({
              at,
              mean: sum / (data.length / 4),
              lit: lit / (data.length / 4),
              png: canvas.toDataURL("image/png").split(",")[1],
            });
          }
          return result;
        },
        {
          first,
          dev,
          level,
          ats: list(args.at),
          palette,
          width: Number(args.width),
          height: Number(args.height),
          bpm: Number(args.bpm),
        },
      );
      for (const s of shots) {
        const file = resolve(out, `${base}-d${dev}-t${s.at}-e${level}.png`);
        await writeFile(file, Buffer.from(s.png, "base64"));
        console.log(
          `${file}  mean ${s.mean.toFixed(1)}  lit ${(100 * s.lit).toFixed(1)}%`,
        );
      }
    }
  if (lab.errors.length) throw new Error(lab.errors.join("\n"));
} finally {
  await runtime.stop();
  await server.close();
}
