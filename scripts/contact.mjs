// Contact sheets for art review (D31, D34, family gate D38).
//   npm run contact                       all authored looks, mid energy
//   npm run contact -- --sheet ladder     every look at energy 0.1 / 0.5 / 0.9
//   npm run contact -- --sheet types      grayscale distinctness per family,
//                                         with the structural distance matrix
//   npm run contact -- --sheet energy     normalized structure + motion at
//                                         energy 0.1 / 0.9 per declared type
// Energy options: --samples 24 --stride 2 (24 samples at 30 Hz after warm-up).
// --family accepts a comma-separated list; --seed fixes both energy runs.
// Options: --family <id>, --width 480 --height 270, --frames 120, --seed N,
// --rig (real Chrome and GPU). Output: artifacts/contact/<sheet>/index.html.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
  lookList,
} from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";
import {
  imageMetrics,
  structureSignature,
  structureDistance,
} from "../tests/browser/metrics.mjs";
import { energyDelta } from "./energy-metric.mjs";

const args = options({
  sheet: { type: "string", default: "looks" },
  family: { type: "string" },
  width: { type: "string", default: "480" },
  height: { type: "string", default: "270" },
  frames: { type: "string", default: "120" },
  seed: { type: "string" },
  near: { type: "string", default: "0.25" },
  samples: { type: "string", default: "24" },
  stride: { type: "string", default: "2" },
});
const sheet = args.sheet;
if (!["looks", "ladder", "types", "energy"].includes(sheet))
  throw new Error("--sheet must be looks, ladder, types or energy");
const width = Number(args.width),
  height = Number(args.height),
  frames = Number(args.frames),
  near = Number(args.near);
const samples = Number(args.samples);
const stride = Number(args.stride);
if (
  sheet === "energy" &&
  (!Number.isInteger(samples) ||
    samples < 2 ||
    !Number.isInteger(stride) ||
    stride < 1)
)
  throw new Error("--samples must be an integer >= 2 and --stride >= 1");
const out = await outputDirectory(`contact/${sheet}`, args.out);
const escape = (t) =>
  String(t).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
try {
  const lab = await openLab(runtime.browser, server.url);
  // Types and energy sheets cover each declared structural type, rather
  // than letting a strong authored preset hide another type's weak response.
  let looks =
    sheet === "types" || sheet === "energy"
      ? await lab.page.evaluate(() => {
          const { scenes, presetSnapshot } = window.__phosphorLab;
          return scenes.flatMap((scene) =>
            (scene.type?.values ?? [null]).map((value, index) => {
              const snapshot = presetSnapshot(scene, 0);
              if (value !== null) snapshot.params[scene.type.key] = value;
              return {
                sceneId: scene.id,
                sceneName: scene.name,
                index,
                name:
                  value === null
                    ? snapshot.preset
                    : `${scene.type.key} ${value}`,
                snapshot,
              };
            }),
          );
        })
      : await lookList(lab.page);
  if (args.family)
    looks = looks.filter((l) => args.family.split(",").includes(l.sceneId));
  if (!looks.length) throw new Error(`No looks for family ${args.family}`);
  const levels =
    sheet === "ladder"
      ? [0.1, 0.5, 0.9]
      : sheet === "energy"
        ? [0.1, 0.9]
        : [0.5];
  const rows = [];
  for (const look of looks) {
    const cells = [];
    const sequences = [];
    for (const level of levels) {
      const r = await lab.page.evaluate(renderLook, {
        ...look,
        level,
        base: 0.5,
        frames,
        width,
        height,
        seed: args.seed === undefined ? null : Number(args.seed),
        gray: sheet === "types",
      });
      if (sheet === "energy") {
        const sequence = await lab.page.evaluate(
          ({ samples, stride, frames }) => {
            const { engine } = window.__phosphorLab;
            const canvas = document.createElement("canvas");
            canvas.width = engine.width;
            canvas.height = engine.height;
            const context = canvas.getContext("2d");
            const sequence = [];
            for (let sample = 0; sample < samples; sample++) {
              if (sample)
                for (let step = 0; step < stride; step++) {
                  const tick = frames + (sample - 1) * stride + step + 1;
                  engine.beat = 0.5 + Math.floor(tick / 30);
                  engine.advance(1 / 60, false);
                }
              engine.present();
              context.drawImage(engine.canvas, 0, 0);
              sequence.push(
                Array.from(
                  context.getImageData(0, 0, canvas.width, canvas.height).data,
                ),
              );
            }
            return sequence;
          },
          { samples, stride, frames },
        );
        sequences.push(sequence);
      }
      const file = `${look.sceneId}-${look.index}-${Math.round(level * 100)}.png`;
      await writeFile(resolve(out, file), Buffer.from(r.png, "base64"));
      cells.push({
        level,
        file,
        metrics: imageMetrics(r.rgba, r.width, r.height),
        signature: structureSignature(r.rgba, r.width, r.height),
        glError: r.glError,
        nonFinite: r.nonFinite,
      });
    }
    const delta =
      sheet === "energy"
        ? energyDelta(sequences[0], sequences[1], width, height)
        : null;
    rows.push({ ...look, cells, ...(delta ? { energyDelta: delta } : {}) });
    console.log(
      delta
        ? JSON.stringify({
            family: look.sceneId,
            type: look.name,
            ...delta,
          })
        : `${look.sceneId} · ${look.name}`,
    );
  }
  // Distinctness: pairwise structural distance within each family, and the
  // nearest look in any other family.
  const findings = [];
  if (sheet === "types")
    for (let i = 0; i < rows.length; i++)
      for (let j = i + 1; j < rows.length; j++) {
        const d = structureDistance(
          rows[i].cells[0].signature,
          rows[j].cells[0].signature,
        );
        if (d < near)
          findings.push({
            a: `${rows[i].sceneName} · ${rows[i].name}`,
            b: `${rows[j].sceneName} · ${rows[j].name}`,
            distance: d,
            sameFamily: rows[i].sceneId === rows[j].sceneId,
          });
      }
  findings.sort((a, b) => a.distance - b.distance);
  const metricsJson = rows.map(({ cells, ...look }) => ({
    ...look,
    cells: cells.map(({ signature, ...c }) => c),
  }));
  await writeFile(
    resolve(out, "metrics.json"),
    JSON.stringify(
      {
        sheet,
        width,
        height,
        frames,
        ...(sheet === "energy"
          ? { samples, stride, sampleHz: 60 / stride, levels, baseEnergy: 0.5 }
          : {}),
        rows: metricsJson,
        findings,
      },
      null,
      1,
    ),
  );
  const families = [...new Set(rows.map((r) => r.sceneId))];
  const html = `<!doctype html><meta charset="utf-8"><title>Phosphor contact · ${sheet}</title>
<style>body{background:#0b0d12;color:#eef2f8;font:13px system-ui;margin:16px}h2{margin:24px 0 8px}
.row{display:flex;gap:8px;align-items:flex-start;margin:6px 0}.name{width:220px;flex:none}
figure{margin:0}img{display:block;width:${Math.min(width, 320)}px;border-radius:4px}figcaption{color:#a3afc1;font-size:11px}
table{border-collapse:collapse}td{border:1px solid #303949;padding:3px 6px}.near{color:#ffd166}</style>
<h1>Phosphor contact sheet · ${sheet}</h1>
<p>${rows.length} looks · ${width}×${height} · ${frames} frames${sheet === "ladder" ? " · energy 0.1 / 0.5 / 0.9 (clip base 0.5)" : ""}${sheet === "types" ? " · grayscale; colour cannot make looks distinct" : ""}</p>
${sheet === "energy" ? `<p>Energy 0.1 / 0.9 · clip base 0.5 · ${samples} samples at ${60 / stride} Hz. Grayscale luminance normalized per frame: brightness and uniform tint do not count. Scores are structural/motion proxies, not aesthetic sign-off.</p>` : ""}
${sheet === "types" ? `<h2>Near pairs (structural distance &lt; ${near})</h2>${findings.length ? `<table>${findings.map((f) => `<tr class="near"><td>${escape(f.a)}</td><td>${escape(f.b)}</td><td>${f.distance.toFixed(3)}</td><td>${f.sameFamily ? "same family" : "across families"}</td></tr>`).join("")}</table>` : "<p>None.</p>"}` : ""}
${families
  .map(
    (id) =>
      `<h2>${escape(rows.find((r) => r.sceneId === id).sceneName)}</h2>${rows
        .filter((r) => r.sceneId === id)
        .map(
          (r) =>
            `<div class="row"><div class="name">${escape(r.name)}${r.energyDelta ? `<br>structure ${r.energyDelta.structuralDelta.toFixed(3)} · motion ${r.energyDelta.motionDelta.toFixed(3)} · score ${r.energyDelta.score.toFixed(3)}` : ""}</div>${r.cells
              .map(
                (c) =>
                  `<figure><img src="${c.file}" alt="${escape(r.name)} at energy ${c.level}"><figcaption>${sheet === "ladder" || sheet === "energy" ? `energy ${c.level} · ` : ""}lum ${c.metrics.meanLuminance.toFixed(3)} · edges ${c.metrics.edgeDensity.toFixed(3)}</figcaption></figure>`,
              )
              .join("")}</div>`,
        )
        .join("")}`,
  )
  .join("")}`;
  await writeFile(resolve(out, "index.html"), html);
  console.log(
    `Wrote ${resolve(out, "index.html")}${sheet === "types" ? ` · ${findings.length} near pair(s)` : ""}`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
