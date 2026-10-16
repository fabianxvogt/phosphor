// Magma Rift native evidence: stills at chosen development/energy/time/
// palette/aspect, plus health (GL errors, non-finite values, lit fraction).
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-magma.mjs --port 48365
//   ... --shots '[{"dev":0,"energy":0.1,"time":20,"palette":"ember"}]'
// Default shots: every state and half state at energies 0.1/0.5/0.9,
// four palettes, a portrait and a 43,200 s late time. Shader compile logs:
// scripts/check-magma-compile.mjs. PNGs and a JSON
// report go to artifacts/checks/magma (or --out).
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";
import { PALETTES } from "../palettes.mjs";

const args = options({
  shots: { type: "string" },
  look: { type: "string", default: "Breathing Crust" },
  width: { type: "string", default: "960" },
  height: { type: "string", default: "540" },
});
const W = Number(args.width),
  H = Number(args.height);
const defaults = [];
for (const dev of [0, 0.5, 1, 1.5, 2])
  for (const energy of [0.1, 0.5, 0.9])
    defaults.push({ dev, energy, time: 20 });
for (const palette of ["ember", "glacier", "cobalt", "chalk"])
  for (const dev of [0, 1, 2])
    defaults.push({ dev, energy: 0.6, time: 20, palette });
for (const dev of [0, 1, 2])
  defaults.push({ dev, energy: 0.6, time: 20, width: 540, height: 960 });
for (const dev of [0, 1, 2]) defaults.push({ dev, energy: 0.6, time: 43200 });
const shots = args.shots ? JSON.parse(args.shots) : defaults;

const out = await outputDirectory("checks/magma", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
const rows = [];
try {
  const lab = await openLab(runtime.browser, server.url);
  for (const shot of shots) {
    const look = shot.look ?? args.look;
    const width = shot.width ?? W,
      height = shot.height ?? H;
    const snapshot = await lab.page.evaluate(
      ({ look, dev, colors }) => {
        const { scenes, presetSnapshot } = window.__phosphorLab;
        const scene = scenes.find((s) => s.id === "magma");
        const s = presetSnapshot(
          scene,
          scene.presets.findIndex((p) => p.name === look),
        );
        if (dev !== undefined && dev !== null) s.params.development = dev;
        if (colors) s.palette = { ...colors };
        return s;
      },
      {
        look,
        dev: shot.dev,
        colors: shot.palette
          ? PALETTES.find((p) => p.id === shot.palette).colors
          : null,
      },
    );
    const initial = await lab.page.evaluate(renderLook, {
      sceneId: "magma",
      snapshot,
      level: shot.energy ?? 0.5,
      width,
      height,
      frames: 2,
      capture: false,
      pollHealth: false,
    });
    assert.equal(initial.glError, 0);
    const row = await lab.page.evaluate(
      async ({ time }) => {
        const { engine } = window.__phosphorLab;
        const slot = engine.slots.at(-1);
        slot.time = time;
        engine.beat = time * (126 / 60) + 0.5;
        engine.uniformFrame++;
        engine.advance(0, true);
        await engine.ready("magma");
        for (let i = 0; i < 3; i++) engine.advance(1 / 60, false);
        engine.present();
        const gl = engine.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const bytes = new Uint8Array(engine.width * engine.height * 4);
        gl.readPixels(
          0,
          0,
          engine.width,
          engine.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          bytes,
        );
        let lit = 0,
          peak = 0,
          sum = 0,
          topLit = 0;
        for (let i = 0; i < bytes.length; i += 4) {
          const p = Math.max(bytes[i], bytes[i + 1], bytes[i + 2]);
          peak = Math.max(peak, p);
          lit += Number(p > 12);
          sum += p;
          // readPixels rows start at the bottom: the top third is the end.
          if (i >= (bytes.length * 2) / 3) topLit += Number(p > 6);
        }
        const c = document.createElement("canvas");
        c.width = engine.width;
        c.height = engine.height;
        c.getContext("2d").drawImage(engine.canvas, 0, 0);
        return {
          peak,
          litFraction: lit / (bytes.length / 4),
          topLitFraction: topLit / (bytes.length / 12),
          mean: sum / (bytes.length / 4),
          glError: gl.getError(),
          nonFinite:
            engine.counters.nonFinite + window.__harness.nonFiniteUploads,
          png: c.toDataURL("image/png").split(",")[1],
        };
      },
      { time: shot.time ?? 20 },
    );
    const name = [
      look.replace(/\W+/g, "-").toLowerCase(),
      `d${shot.dev ?? "p"}`,
      `e${shot.energy ?? 0.5}`,
      `t${shot.time ?? 20}`,
      shot.palette ?? "own",
      `${width}x${height}`,
    ].join("_");
    await writeFile(
      resolve(out, `${name}.png`),
      Buffer.from(row.png, "base64"),
    );
    delete row.png;
    rows.push({ name, ...shot, ...row });
    console.log(
      `${name} peak ${row.peak} lit ${row.litFraction.toFixed(3)} top ${row.topLitFraction.toFixed(3)} gl ${row.glError} nf ${row.nonFinite}`,
    );
    assert.equal(row.glError, 0, name);
    assert.equal(row.nonFinite, 0, name);
    assert.ok(row.peak > 40, `${name} is nearly black`);
  }
  assert.deepEqual(lab.errors, []);
  await writeFile(
    resolve(out, "report.json"),
    JSON.stringify(rows, null, 2) + "\n",
  );
} finally {
  await runtime.stop();
  await server.close();
}
