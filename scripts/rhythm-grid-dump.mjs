// Print every world's authored rhythm presets as step grids, for review.
//   node scripts/rhythm-grid-dump.mjs [--worlds a,b] > grids.md
import scenes from "../scenes.mjs";
import { defaultWorlds } from "../worlds.mjs";
import { defaultPattern, GLOBAL_EFFECTS } from "../rhythm.mjs";

const only = process.argv.includes("--worlds")
  ? process.argv[process.argv.indexOf("--worlds") + 1].split(",")
  : null;
const byId = new Map(scenes.map((scene) => [scene.id, scene]));
const lookIds = scenes.flatMap((scene) =>
  (scene.presets ?? []).map((preset) => `${scene.id}:${preset.name}`),
);
const cell = (v) =>
  v <= 0 ? "." : v >= 0.95 ? "X" : v >= 0.55 ? "x" : String(Math.round(v * 10));
// Render on a sixteenth grid so divisions compare: one bar = 16 cells.
const grid = (track) => {
  const per = 4 / track.division;
  const beats = track.length / track.division;
  const bars = Math.max(1, Math.ceil(beats / 4));
  let line = "";
  for (let i = 0; i < bars * 16; i++) {
    if (i && i % 16 === 0) line += "|";
    const step = i / per;
    line +=
      Number.isInteger(step) && step < track.length
        ? cell(track.steps[step])
        : " ";
  }
  return line;
};
const print = (title, definitions, names) => {
  console.log(`### ${title}\n`);
  for (const style of ["restrained", "driving", "accented"]) {
    const pattern = defaultPattern(definitions, style);
    console.log(
      `${style}${names?.[style] ? ` — “${names[style]}”` : ""}:\n\n\`\`\``,
    );
    for (const track of pattern.tracks)
      console.log(
        `${track.effect.padEnd(20)} ${grid(track)}  (str ${track.strength.toFixed(2)}, dur ${track.duration})`,
      );
    console.log("```\n");
  }
};
print("Global tracks (shared by every look)", GLOBAL_EFFECTS);
for (const world of defaultWorlds(lookIds)) {
  if (only && !only.includes(world.id)) continue;
  const scene = byId.get(world.states[0].look.split(":")[0]);
  console.log(`## ${world.name} (\`${world.id}\`, family \`${scene.id}\`)\n`);
  for (const d of scene.rhythm)
    console.log(`- slot ${d.slot} **${d.id}** (${d.kind}): ${d.description}`);
  console.log();
  print(world.name, scene.rhythm, scene.rhythmStyles);
}
