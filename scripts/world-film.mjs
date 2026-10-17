// Review films for continuous worlds: one MP4 per world that holds the first
// development, sweeps to the last while energy rises, then settles at mid
// energy. Frames come from the render lab on the beat clock, so rhythm and
// development read as they would on Stage. Requires ffmpeg on PATH.
//   node scripts/world-film.mjs --world unfolding --rig
//   node scripts/world-film.mjs --look "metamorphosis:First Filaments" --to 2
// Options: --world <id> | --look <scene:Preset> [--from N --to N],
// --seconds 30, --fps 30, --bpm 126, --width 960 --height 540, --rig,
// --palette <library id> (default: the look's own palette).
// Output: artifacts/films/<name>.mp4 (and a contact strip <name>.png).
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
  lookList,
} from "./browser-runtime.mjs";
import { defaultWorlds } from "../worlds.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options({
  world: { type: "string" },
  look: { type: "string" },
  from: { type: "string" },
  to: { type: "string" },
  seconds: { type: "string", default: "30" },
  fps: { type: "string", default: "30" },
  bpm: { type: "string", default: "126" },
  width: { type: "string", default: "960" },
  height: { type: "string", default: "540" },
  energy: { type: "string" },
  palette: { type: "string" },
});
const paletteColors =
  args.palette === undefined
    ? null
    : PALETTES.find((p) => p.id === args.palette)?.colors;
if (args.palette !== undefined && !paletteColors)
  throw new Error(`Unknown palette ${args.palette}`);
if (Boolean(args.world) === Boolean(args.look))
  throw new Error("Pass exactly one of --world <id> or --look <scene:Preset>");
const seconds = Number(args.seconds),
  fps = Number(args.fps),
  bpm = Number(args.bpm),
  width = Number(args.width),
  height = Number(args.height);
const fixedEnergy = args.energy === undefined ? null : Number(args.energy);
if (
  fixedEnergy !== null &&
  (!Number.isFinite(fixedEnergy) || fixedEnergy < 0 || fixedEnergy > 1)
)
  throw new Error("Energy must be 0–1");

const ffmpeg = (argv) =>
  new Promise((done, fail) => {
    const child = spawn("ffmpeg", ["-loglevel", "error", "-y", ...argv], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", fail);
    child.on("exit", (code) =>
      code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}`)),
    );
  });

const out = await outputDirectory("films", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const frames = await mkdtemp(join(tmpdir(), "phosphor-film-"));
try {
  const lab = await openLab(runtime.browser, server.url);
  const looks = await lookList(lab.page);
  const id = (l) => `${l.sceneId}:${l.name}`;
  let first, positions, name;
  if (args.world) {
    const world = defaultWorlds(looks.map(id)).find((w) => w.id === args.world);
    if (!world) throw new Error(`Unknown or unplayable world ${args.world}`);
    first = looks.find((l) => id(l) === world.states[0].look);
    name = world.id;
    positions = world.states.map((s) => s.look);
  } else {
    first = looks.find((l) => id(l) === args.look);
    if (!first) throw new Error(`Unknown look ${args.look}`);
    name = args.look.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  }
  if (args.palette) name += `-${args.palette}`;
  const plan = await lab.page.evaluate(
    ({ first, positions, from, to, paletteColors }) => {
      const { scenes, presetSnapshot } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === first.sceneId);
      const key = scene.development;
      if (!key) throw new Error(`${scene.id} declares no development key`);
      const snapshot = presetSnapshot(scene, first.index);
      if (paletteColors) snapshot.palette = { ...paletteColors };
      const values = positions
        ? positions.map((lookId) => {
            const preset = scene.presets.findIndex(
              (p) => `${scene.id}:${p.name}` === lookId,
            );
            if (preset < 0) throw new Error(`${lookId} is not in ${scene.id}`);
            return presetSnapshot(scene, preset).params[key];
          })
        : [snapshot.params[key]];
      const field = scene.schema.find((f) => f.key === key);
      return {
        key,
        snapshot,
        from: from ?? values[0],
        to: to ?? (values.length > 1 ? values.at(-1) : field.max),
      };
    },
    {
      first,
      positions,
      from: args.from === undefined ? null : Number(args.from),
      to: args.to === undefined ? null : Number(args.to),
      paletteColors,
    },
  );
  const total = Math.round(seconds * fps);
  const smooth = (x) => x * x * (3 - 2 * x);
  // Hold 20%, sweep 60% while energy rises, settle 20% at mid energy.
  const timeline = Array.from({ length: total }, (_, i) => {
    const u = i / (total - 1);
    const sweep = smooth(Math.min(1, Math.max(0, (u - 0.2) / 0.6)));
    const energy =
      u < 0.8 ? 0.2 + 0.7 * smooth(Math.min(1, u / 0.8)) : 0.9 - 2 * (u - 0.8);
    return {
      development: plan.from + (plan.to - plan.from) * sweep,
      energy: fixedEnergy ?? energy,
    };
  });
  const batch = 15;
  for (let start = 0; start < total; start += batch) {
    const shots = await lab.page.evaluate(
      async ({ plan, slice, start, fps, bpm, width, height }) => {
        const { engine } = window.__phosphorLab;
        if (start === 0) {
          engine.resize(width, height);
          engine.speed = 1;
          engine.view = { hue: 0, zoom: 1 };
          engine.options.flashLimit = false;
          engine.blackout = engine.blackoutTarget = 0;
          engine.setLevel(slice[0].energy, 0);
          engine.load(plan.snapshot, 0, { energy: slice[0].energy });
          if (!(await engine.ready(plan.snapshot.scene)))
            throw new Error("scene failed to compile");
          while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
          window.__filmBeat = 0;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        const ticks = Math.max(1, Math.round(60 / fps));
        return slice.map(({ development, energy }) => {
          const snapshot = structuredClone(engine.active);
          snapshot.params[plan.key] = development;
          engine.setSnapshot(snapshot);
          engine.setLevel(energy, 0);
          for (let t = 0; t < ticks; t++) {
            window.__filmBeat += bpm / 60 / 60;
            engine.beat = window.__filmBeat;
            engine.advance(1 / 60, false);
          }
          engine.present();
          context.drawImage(engine.canvas, 0, 0);
          return canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
        });
      },
      {
        plan,
        slice: timeline.slice(start, start + batch),
        start,
        fps,
        bpm,
        width,
        height,
      },
    );
    await Promise.all(
      shots.map((b64, i) =>
        writeFile(
          join(frames, `${String(start + i).padStart(5, "0")}.jpg`),
          Buffer.from(b64, "base64"),
        ),
      ),
    );
  }
  if (lab.errors.length) throw new Error(lab.errors.join("\n"));
  const film = resolve(out, `${name}.mp4`);
  await ffmpeg([
    "-framerate",
    String(fps),
    "-i",
    join(frames, "%05d.jpg"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    film,
  ]);
  // Six evenly spaced stills for quick review without playing the film.
  await ffmpeg([
    "-i",
    film,
    "-vf",
    `select='not(mod(n\\,${Math.floor(total / 6)}))',scale=480:-2,tile=3x2`,
    "-frames:v",
    "1",
    resolve(out, `${name}.png`),
  ]);
  console.log(film);
} finally {
  await rm(frames, { recursive: true, force: true });
  await runtime.stop();
  await server.close();
}
