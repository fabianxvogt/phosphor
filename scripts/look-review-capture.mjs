// Review captures for every world (or a subset): the 30 s world film plus
// two sheets for an independent reviewer.
//   <world>-sheet.png   12 stills across the film (hold → sweep → settle)
//   <world>-rhythm.png  24 frames at half-beat spacing near the top state
//                       (three bars at high energy), to judge rhythm effects
//   node scripts/look-review-capture.mjs --out artifacts/look-review/baseline
//     [--worlds a,b] [--port 48190] [--palette <id>]
// Requires ffmpeg. Runs world-film.mjs once per world on the rig GPU.
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import scenes from "../scenes.mjs";
import { defaultWorlds } from "../worlds.mjs";

const { values: args } = parseArgs({
  options: {
    out: { type: "string", default: "artifacts/look-review/latest" },
    worlds: { type: "string" },
    port: { type: "string", default: "48190" },
    palette: { type: "string" },
    seconds: { type: "string", default: "30" },
  },
});
const run = (command, argv, env = {}) =>
  new Promise((done, fail) => {
    const child = spawn(command, argv, {
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, ...env },
    });
    child.on("error", fail);
    child.on("exit", (code) =>
      code === 0 ? done() : fail(new Error(`${command} exited ${code}`)),
    );
  });
const lookIds = scenes.flatMap((scene) =>
  (scene.presets ?? []).map((preset) => `${scene.id}:${preset.name}`),
);
const all = defaultWorlds(lookIds).map((world) => world.id);
const worlds = args.worlds ? args.worlds.split(",") : all;
const out = resolve(args.out);
await mkdir(out, { recursive: true });
const fps = 30,
  bpm = 126,
  seconds = Number(args.seconds);
const beatFrames = (fps * 60) / bpm;
for (const world of worlds) {
  const started = Date.now();
  const film = join(out, `${world}${args.palette ? `-${args.palette}` : ""}`);
  await run(
    "node",
    [
      "scripts/world-film.mjs",
      "--world",
      world,
      "--rig",
      "--port",
      args.port,
      "--out",
      out,
      "--seconds",
      String(seconds),
      ...(args.palette ? ["--palette", args.palette] : []),
    ],
    { PHOSPHOR_HEADLESS_RIG: "1" },
  );
  const total = seconds * fps;
  await run("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    `${film}.mp4`,
    "-vf",
    `select='not(mod(n\\,${Math.floor(total / 12)}))',scale=480:-1,tile=4x3`,
    "-frames:v",
    "1",
    "-fps_mode",
    "vfr",
    `${film}-sheet.png`,
  ]);
  // Half-beat spacing from 62 % of the film: top state, energy ≈ 0.85.
  const start = Math.round(total * 0.62);
  const step = beatFrames / 2;
  const picks = Array.from({ length: 24 }, (_, i) =>
    Math.round(start + i * step),
  );
  await run("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    `${film}.mp4`,
    "-vf",
    `select='${picks.map((n) => `eq(n\\,${n})`).join("+")}',scale=320:-1,tile=6x4`,
    "-frames:v",
    "1",
    "-fps_mode",
    "vfr",
    `${film}-rhythm.png`,
  ]);
  console.log(
    `${world}: ${((Date.now() - started) / 1000).toFixed(0)} s → ${film}-sheet.png, ${film}-rhythm.png`,
  );
}
