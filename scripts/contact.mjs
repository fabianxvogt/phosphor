// Contact sheets for art review (D31, D34, family gate D38).
//   npm run contact                       all authored looks, mid energy
//   npm run contact -- --sheet ladder     every look at energy 0.1 / 0.5 / 0.9
//   npm run contact -- --sheet types      grayscale distinctness per family,
//                                         with the structural distance matrix
//   npm run contact -- --sheet palettes   library colours across gated families
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
import { PALETTES } from "../palettes.mjs";
import { GATED } from "../scenes.mjs";
import {
  imageMetrics,
  structureSignature,
  structureDistance,
} from "../tests/browser/metrics.mjs";

const args = options({
  sheet: { type: "string", default: "looks" },
  family: { type: "string" },
  width: { type: "string", default: "480" },
  height: { type: "string", default: "270" },
  frames: { type: "string", default: "120" },
  seed: { type: "string" },
  near: { type: "string", default: "0.25" },
});
const sheet = args.sheet;
if (!["looks", "ladder", "types", "palettes"].includes(sheet))
  throw new Error("--sheet must be looks, ladder, types or palettes");
const width = Number(args.width),
  height = Number(args.height),
  frames = Number(args.frames),
  near = Number(args.near);
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
  // Types sheet: each family's default look with its structural type
  // selector set to every declared type (D30); otherwise authored looks.
  let looks =
    sheet === "types"
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
  if (sheet === "palettes")
    looks = await lab.page.evaluate(
      (gated) => {
        const { scenes, presetSnapshot } = window.__phosphorLab;
        return scenes
          .filter((scene) => gated.includes(scene.id))
          .map((scene) => {
            const snapshot = presetSnapshot(scene, 0);
            if (scene.type)
              snapshot.params[scene.type.key] = scene.type.values[0];
            return {
              sceneId: scene.id,
              sceneName: scene.name,
              index: 0,
              name: snapshot.preset,
              snapshot,
            };
          });
      },
      [...GATED],
    );
  if (args.family) looks = looks.filter((l) => l.sceneId === args.family);
  if (!looks.length) throw new Error(`No looks for family ${args.family}`);
  const levels = sheet === "ladder" ? [0.1, 0.5, 0.9] : [0.5];
  const rows = [];
  const findings = [];
  const variants = sheet === "palettes" ? PALETTES : looks;
  for (const look of variants) {
    const cells = [];
    const samples =
      sheet === "palettes"
        ? looks.map((family) => ({
            ...family,
            level: 0.5,
            snapshot: { ...family.snapshot, palette: { ...look.colors } },
          }))
        : levels.map((level) => ({ ...look, level }));
    for (const sample of samples) {
      const r = await lab.page.evaluate(renderLook, {
        ...sample,
        base: 0.5,
        frames,
        width,
        height,
        seed: args.seed === undefined ? null : Number(args.seed),
        gray: sheet === "types",
      });
      const file =
        sheet === "palettes"
          ? `${look.id}-${sample.sceneId}.png`
          : `${sample.sceneId}-${sample.index}-${Math.round(sample.level * 100)}.png`;
      await writeFile(resolve(out, file), Buffer.from(r.png, "base64"));
      const metrics = imageMetrics(r.rgba, r.width, r.height);
      if (
        sheet === "palettes" &&
        (r.peak < 24 ||
          metrics.meanLuminance < 0.005 ||
          r.glError ||
          r.nonFinite)
      )
        findings.push({
          palette: look.id,
          family: sample.sceneId,
          peak: r.peak,
          meanLuminance: metrics.meanLuminance,
          glError: r.glError,
          nonFinite: r.nonFinite,
        });
      cells.push({
        level: sample.level,
        sceneName: sample.sceneName,
        peak: r.peak,
        file,
        metrics,
        signature:
          sheet === "types"
            ? structureSignature(r.rgba, r.width, r.height)
            : undefined,
        glError: r.glError,
        nonFinite: r.nonFinite,
      });
    }
    rows.push({ ...look, cells });
    console.log(
      `${sheet === "palettes" ? look.id : look.sceneId} · ${look.name}`,
    );
  }
  // Distinctness: pairwise structural distance within each family, and the
  // nearest look in any other family.
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
  if (sheet === "types") findings.sort((a, b) => a.distance - b.distance);
  const metricsJson = rows.map(({ cells, ...look }) => ({
    ...look,
    cells: cells.map(({ signature, ...c }) => c),
  }));
  await writeFile(
    resolve(out, "metrics.json"),
    JSON.stringify(
      { sheet, width, height, frames, rows: metricsJson, findings },
      null,
      1,
    ),
  );
  const families =
    sheet === "palettes"
      ? ["palettes"]
      : [...new Set(rows.map((r) => r.sceneId))];
  const html = `<!doctype html><meta charset="utf-8"><title>Phosphor contact · ${sheet}</title>
<style>body{background:#0b0d12;color:#eef2f8;font:13px system-ui;margin:16px}h2{margin:24px 0 8px}
.row{display:flex;gap:8px;align-items:flex-start;margin:6px 0}.name{width:${sheet === "palettes" ? 160 : 220}px;flex:none}
figure{margin:0}img{display:block;width:${Math.min(width, sheet === "palettes" ? 200 : 320)}px;border-radius:4px}figcaption{color:#a3afc1;font-size:11px}
table{border-collapse:collapse}td{border:1px solid #303949;padding:3px 6px}.near{color:#ffd166}.swatch{display:inline-block;width:24px;height:16px;margin:6px 2px 2px 0}</style>
<h1>Phosphor contact sheet · ${sheet}</h1>
<p>${rows.length} ${sheet === "palettes" ? "palettes across the gated families' first types · energy 0.5" : "looks"} · ${width}×${height} · ${frames} frames${sheet === "ladder" ? " · energy 0.1 / 0.5 / 0.9 (clip base 0.5)" : ""}${sheet === "types" ? " · grayscale; colour cannot make looks distinct" : ""}</p>
${sheet === "types" ? `<h2>Near pairs (structural distance &lt; ${near})</h2>${findings.length ? `<table>${findings.map((f) => `<tr class="near"><td>${escape(f.a)}</td><td>${escape(f.b)}</td><td>${f.distance.toFixed(3)}</td><td>${f.sameFamily ? "same family" : "across families"}</td></tr>`).join("")}</table>` : "<p>None.</p>"}` : ""}
${sheet === "palettes" ? `<h2>Dim / faulty renders</h2>${findings.length ? `<ul>${findings.map((f) => `<li class="near">${escape(f.palette)} · ${escape(f.family)}: lum ${f.meanLuminance.toFixed(4)}, peak ${f.peak}, GPU errors ${f.glError}, non-finite ${f.nonFinite}</li>`).join("")}</ul>` : "<p>None detected. Artistic keep/reject is the owner's decision.</p>"}` : ""}
${families
  .map(
    (id) =>
      `<h2>${sheet === "palettes" ? "Keep / reject · one row per palette" : escape(rows.find((r) => r.sceneId === id).sceneName)}</h2>${rows
        .filter((r) => sheet === "palettes" || r.sceneId === id)
        .map(
          (r) =>
            `<div class="row"><div class="name">${escape(r.name)}${
              sheet === "palettes"
                ? `<br>${Object.values(r.colors)
                    .map(
                      (color) =>
                        `<i class="swatch" style="background:${color}"></i>`,
                    )
                    .join("")}<br>${escape(r.moods.join(" / "))}`
                : ""
            }</div>${r.cells
              .map(
                (c) =>
                  `<figure><img src="${c.file}" alt="${escape(r.name)} · ${escape(c.sceneName)} at energy ${c.level}"><figcaption>${sheet === "palettes" ? `${escape(c.sceneName)}<br>` : ""}${sheet === "ladder" ? `energy ${c.level} · ` : ""}lum ${c.metrics.meanLuminance.toFixed(3)} · edges ${c.metrics.edgeDensity.toFixed(3)}</figcaption></figure>`,
              )
              .join("")}</div>`,
        )
        .join("")}`,
  )
  .join("")}`;
  await writeFile(resolve(out, "index.html"), html);
  console.log(
    `Wrote ${resolve(out, "index.html")}${sheet === "types" ? ` · ${findings.length} near pair(s)` : sheet === "palettes" ? ` · ${findings.length} dim / faulty render(s)` : ""}`,
  );
} finally {
  await runtime.stop();
  await server.close();
}
