// Contact sheets for art review (D31, D34, family gate D38).
//   npm run contact                       all authored looks, mid energy
//   npm run contact -- --sheet ladder     every look at energy 0.1 / 0.5 / 0.9
//   npm run contact -- --sheet types      grayscale distinctness per family,
//                                         with the structural distance matrix
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
if (!["looks", "ladder", "types"].includes(sheet))
  throw new Error("--sheet must be looks, ladder or types");
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
  let looks = await lookList(lab.page);
  if (args.family) looks = looks.filter((l) => l.sceneId === args.family);
  if (!looks.length) throw new Error(`No looks for family ${args.family}`);
  const levels = sheet === "ladder" ? [0.1, 0.5, 0.9] : [0.5];
  const rows = [];
  for (const look of looks) {
    const cells = [];
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
    rows.push({ ...look, cells });
    console.log(`${look.sceneId} · ${look.name}`);
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
      { sheet, width, height, frames, rows: metricsJson, findings },
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
${sheet === "types" ? `<h2>Near pairs (structural distance &lt; ${near})</h2>${findings.length ? `<table>${findings.map((f) => `<tr class="near"><td>${escape(f.a)}</td><td>${escape(f.b)}</td><td>${f.distance.toFixed(3)}</td><td>${f.sameFamily ? "same family" : "across families"}</td></tr>`).join("")}</table>` : "<p>None.</p>"}` : ""}
${families
  .map(
    (id) =>
      `<h2>${escape(rows.find((r) => r.sceneId === id).sceneName)}</h2>${rows
        .filter((r) => r.sceneId === id)
        .map(
          (r) =>
            `<div class="row"><div class="name">${escape(r.name)}</div>${r.cells
              .map(
                (c) =>
                  `<figure><img src="${c.file}" alt="${escape(r.name)} at energy ${c.level}"><figcaption>${sheet === "ladder" ? `energy ${c.level} · ` : ""}lum ${c.metrics.meanLuminance.toFixed(3)} · edges ${c.metrics.edgeDensity.toFixed(3)}</figcaption></figure>`,
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
