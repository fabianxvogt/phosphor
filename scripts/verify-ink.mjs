// Ink Bloom native stills: development × energy × palette × time grids on
// the real GPU, with GL/non-finite/emptiness checks and a tiled sheet.
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-ink.mjs --rig --port 48324 \
//     --devs 0,1,2 --energies 0.1,0.5,0.9 --palettes ember --times 20 --name round1
// Options: --look <preset name> (default Drop; development overrides it),
// --width/--height.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
  devs: { type: "string", default: "0,1,2" },
  energies: { type: "string", default: "0.5" },
  palettes: { type: "string", default: "" },
  times: { type: "string", default: "20" },
  look: { type: "string", default: "Drop" },
  width: { type: "string", default: "480" },
  height: { type: "string", default: "270" },
  name: { type: "string", default: "stills" },
});
const list = (s) => s.split(",").filter(Boolean);
const devs = list(args.devs).map(Number),
  energies = list(args.energies).map(Number),
  palettes = list(args.palettes),
  times = list(args.times).map(Number);
const width = Number(args.width),
  height = Number(args.height);
const out = await outputDirectory(`ink-verify/${args.name}`, args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const files = [],
  rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const dev of devs)
    for (const paletteId of palettes.length ? palettes : [null])
      for (const energy of energies)
        for (const time of times) {
          const colors = paletteId
            ? PALETTES.find((p) => p.id === paletteId)?.colors
            : null;
          if (paletteId && !colors) throw new Error(`palette ${paletteId}`);
          const row = await lab.page.evaluate(
            async ({ look, dev, colors, energy, time, width, height }) => {
              const { engine, scenes, presetSnapshot } = window.__phosphorLab;
              const scene = scenes.find((s) => s.id === "ink");
              const index = scene.presets.findIndex((p) => p.name === look);
              const snapshot = presetSnapshot(scene, index);
              if (Number.isFinite(dev)) snapshot.params.development = dev;
              if (colors) snapshot.palette = { ...colors };
              engine.resize(width, height);
              engine.speed = 1;
              engine.view = { hue: 0, zoom: 1 };
              engine.options.flashLimit = false;
              engine.blackout = engine.blackoutTarget = 0;
              engine.setLevel(energy, 0);
              engine.load(snapshot, 0, { energy });
              if (!(await engine.ready("ink"))) throw new Error("compile");
              while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
              const slot = engine.slots.at(-1);
              slot.time = time;
              engine.beat = time * 2.1 + 0.5;
              engine.uniformFrame++;
              engine.advance(1 / 60, false);
              engine.advance(1 / 60, false);
              engine.present();
              const gl = engine.gl;
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              const bytes = new Uint8Array(width * height * 4);
              gl.readPixels(
                0,
                0,
                width,
                height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                bytes,
              );
              let lit = 0,
                peak = 0,
                sum = 0,
                edges = 0;
              const lum = (i) =>
                0.2126 * bytes[i] +
                0.7152 * bytes[i + 1] +
                0.0722 * bytes[i + 2];
              for (let y = 0; y < height; y++)
                for (let x = 0; x < width; x++) {
                  const i = (y * width + x) * 4;
                  const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
                  peak = Math.max(peak, p);
                  lit += Number(p > 12);
                  sum += lum(i);
                  if (x + 1 < width && y + 1 < height)
                    edges += Number(
                      Math.abs(lum(i) - lum(i + 4)) +
                        Math.abs(lum(i) - lum(i + width * 4)) >
                        24,
                    );
                }
              const c = document.createElement("canvas");
              c.width = width;
              c.height = height;
              c.getContext("2d").drawImage(engine.canvas, 0, 0);
              return {
                peak,
                litFraction: lit / (width * height),
                meanLuma: sum / (width * height) / 255,
                edgeDensity: edges / (width * height),
                glError: gl.getError(),
                nonFinite:
                  engine.counters.nonFinite + window.__harness.nonFiniteUploads,
                png: c.toDataURL("image/png").split(",")[1],
              };
            },
            {
              look: args.look,
              dev,
              colors,
              energy,
              time,
              width,
              height,
            },
          );
          const file = resolve(
            out,
            `d${dev}-e${energy}-${paletteId ?? "own"}-t${time}.png`,
          );
          await writeFile(file, Buffer.from(row.png, "base64"));
          delete row.png;
          files.push(file);
          rows.push({ dev, energy, paletteId, time, ...row });
          console.log(
            JSON.stringify({ dev, energy, paletteId, time, ...row }, (k, v) =>
              typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v,
            ),
          );
          assert.equal(row.glError, 0);
          assert.equal(row.nonFinite, 0);
        }
  assert.deepEqual(lab.errors, []);
} finally {
  await runtime.stop();
  await server.close();
}
await writeFile(resolve(out, "metrics.json"), JSON.stringify(rows, null, 1));
const columns = Math.max(1, files.length / devs.length);
await new Promise((done, fail) => {
  const child = spawn(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      ...files.flatMap((f) => ["-i", f]),
      "-filter_complex",
      files.length === 1
        ? "[0]null"
        : `${files.map((_, i) => `[${i}]`).join("")}xstack=inputs=${files.length}:layout=${files
            .map((_, i) => {
              const x = i % columns,
                y = Math.floor(i / columns);
              return `${x ? `${x * width}` : "0"}_${y ? `${y * height}` : "0"}`;
            })
            .join("|")}`,
      resolve(out, "sheet.png"),
    ],
    { stdio: "inherit" },
  );
  child.on("exit", (code) =>
    code === 0 ? done() : fail(new Error(`ffmpeg ${code}`)),
  );
});
console.log(resolve(out, "sheet.png"));
