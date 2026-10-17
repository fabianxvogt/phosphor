// Review captures for every world (or a subset): the 30 s world film plus
// two sheets for an independent reviewer.
//   <world>-sheet.png   12 stills across the film (hold → sweep → settle)
//   <world>-rhythm.png  24 frames at half-beat spacing near the top state
//                       (three bars at high energy), to judge rhythm effects
//   node scripts/look-review-capture.mjs --out artifacts/look-review/baseline
//     [--worlds a,b] [--port 48190] [--palette <id>]
// Requires ffmpeg. Runs world-film.mjs once per world on the rig GPU.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import scenes from "../scenes.mjs";
import { defaultWorlds } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { rhythmFramePicks } from "./capture-clock.mjs";

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
  // Separate held top-state capture: development/energy must not confound
  // the rhythm judgement. Warm for two bars, then sample three aligned bars.
  const definition = defaultWorlds(lookIds).find((w) => w.id === world);
  const lastLook = definition.states.at(-1).look;
  const scene = scenes.find((s) => lastLook.startsWith(`${s.id}:`));
  const top = presetSnapshot(
    scene,
    scene.presets.findIndex((p) => `${scene.id}:${p.name}` === lastLook),
  ).params[scene.development];
  const heldDir = join(out, "rhythm-held");
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
      heldDir,
      "--seconds",
      "12",
      "--from",
      String(top),
      "--to",
      String(top),
      "--energy",
      "0.85",
      ...(args.palette ? ["--palette", args.palette] : []),
    ],
    { PHOSPHOR_HEADLESS_RIG: "1" },
  );
  const heldFilm = join(
    heldDir,
    `${world}${args.palette ? `-${args.palette}` : ""}.mp4`,
  );
  const picks = rhythmFramePicks({ fps, bpm });
  await run("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    heldFilm,
    "-vf",
    `select='${picks.map((n) => `eq(n\\,${n})`).join("+")}',scale=320:-1,tile=6x4`,
    "-frames:v",
    "1",
    "-fps_mode",
    "vfr",
    `${film}-rhythm.png`,
  ]);
  await writeFile(
    `${film}-evidence.json`,
    JSON.stringify(
      {
        version: 2,
        world,
        rhythm: {
          heldDevelopment: top,
          energy: 0.85,
          bpm,
          fps,
          startBeat: 8,
          halfBeatFrames: picks,
          film: heldFilm,
        },
      },
      null,
      2,
    ),
  );
  console.log(
    `${world}: ${((Date.now() - started) / 1000).toFixed(0)} s → ${film}-sheet.png, ${film}-rhythm.png`,
  );
}
