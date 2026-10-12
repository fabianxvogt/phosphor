// Differential visual check against a Git revision, at identical seeded times.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
const args = options({
  reference: { type: "string", default: "HEAD" },
  families: { type: "string", default: "fourspace,quasicrystal" },
  width: { type: "string", default: "640" },
  height: { type: "string", default: "360" },
  levels: { type: "string", default: "0.1,0.5,0.95" },
  times: { type: "string", default: "0.5" },
  look: { type: "string" },
  impulse: { type: "string" },
});
const out = await outputDirectory("performance/pixels", args.out);
const reference = execFileSync(
  "git",
  ["rev-parse", "--verify", `${args.reference}^{commit}`],
  { encoding: "utf8" },
).trim();
const families = args.families.split(",");
const sources = new Map(
  families.map((id) => [
    `/scene-${id}.mjs`,
    execFileSync("git", ["show", `${reference}:scene-${id}.mjs`], {
      encoding: "utf8",
    }),
  ]),
);
const selectedScenes =
  families.map((id, i) => `import s${i} from '/scene-${id}.mjs';`).join("\n") +
  `\nexport default [${families.map((_, i) => `s${i}`).join(",")}];`;
const server = await serve(".", args.port),
  runtime = await launch({
    rig: true,
    headless: true,
    args: [
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
const rows = [];
try {
  const current = await openLab(
    {
      newContext: async (options) => {
        const context = await runtime.browser.newContext(options);
        await context.route("**/scenes.mjs", (route) =>
          route.fulfill({
            contentType: "text/javascript",
            body: selectedScenes,
          }),
        );
        return context;
      },
    },
    server.url,
  );
  const baseline = await openLab(
    {
      newContext: async (options) => {
        const context = await runtime.browser.newContext(options);
        await context.route("**/*.mjs", (route) => {
          const path = new URL(route.request().url()).pathname;
          const source =
            path === "/scenes.mjs" ? selectedScenes : sources.get(path);
          return source
            ? route.fulfill({ contentType: "text/javascript", body: source })
            : route.continue();
        });
        return context;
      },
    },
    server.url,
  );
  const old = baseline.page;
  const looks = await current.page.evaluate(
    (families) =>
      window.__phosphorLab.scenes
        .filter((s) => families.includes(s.id))
        .flatMap((s) =>
          s.presets.map((p, index) => ({ sceneId: s.id, index, name: p.name })),
        ),
    families,
  );
  for (const look of looks.filter(
    (look) => args.look === undefined || look.index === Number(args.look),
  ))
    for (const time of args.times.split(",").map(Number))
      for (const level of args.levels.split(",").map(Number)) {
        const captures = [];
        for (const page of [old, current.page]) {
          // Fresh engine: the same frame counter, post history and rhythm state.
          await page.reload();
          await page.waitForFunction(() => !!window.__phosphorLab);
          const health = await page.evaluate(renderLook, {
            ...look,
            level,
            width: Number(args.width),
            height: Number(args.height),
            frames: 30,
            capture: false,
          });
          assert.equal(health.glError, 0);
          assert.equal(health.nonFinite, 0);
          assert.ok(health.peak > 0);
          const image = await page.evaluate(
            ({ time, impulse }) => {
              const { engine, errors } = window.__phosphorLab,
                slot = engine.slots.at(-1);
              slot.time = time;
              if (impulse !== undefined && slot.rhythm)
                slot.rhythm.values[1] = Number(impulse);
              engine.uniformFrame++;
              engine.drawSlot(slot, 1 / 60);
              engine.present();
              const canvas = document.createElement("canvas");
              canvas.width = engine.width;
              canvas.height = engine.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(engine.canvas, 0, 0);
              return {
                rgba: Array.from(
                  ctx.getImageData(0, 0, canvas.width, canvas.height).data,
                ),
                png: canvas.toDataURL("image/png").split(",")[1],
                width: canvas.width,
                height: canvas.height,
                glError: engine.gl.getError(),
                nonFinite:
                  engine.counters.nonFinite +
                  (window.__harness?.nonFiniteUploads ?? 0),
                errors: [...errors],
              };
            },
            { time, impulse: args.impulse },
          );
          assert.equal(image.glError, 0);
          assert.equal(image.nonFinite, 0);
          assert.deepEqual(image.errors, []);
          captures.push(image);
        }
        const [before, after] = captures;
        let max = 0,
          sum = 0,
          changed = 0,
          over2 = 0;
        for (let i = 0; i < before.rgba.length; i += 4) {
          let pixel = 0;
          for (let c = 0; c < 3; c++) {
            const d = Math.abs(before.rgba[i + c] - after.rgba[i + c]);
            max = Math.max(max, d);
            sum += d;
            pixel = Math.max(pixel, d);
          }
          if (pixel) changed++;
          if (pixel > 2) over2++;
        }
        const row = {
          ...look,
          level,
          time,
          max,
          mean: sum / (before.width * before.height * 3),
          changedFraction: changed / (before.width * before.height),
          over2Fraction: over2 / (before.width * before.height),
        };
        rows.push(row);
        console.log(JSON.stringify(row));
        if (level === 0.5)
          for (const [i, label] of ["before", "after"].entries())
            await writeFile(
              resolve(
                out,
                `${look.sceneId}-${look.index}-${time}-${label}.png`,
              ),
              Buffer.from(captures[i].png, "base64"),
            );
        // Allow only tiny floating-point/edge quantization differences.
        if (row.max > 2) process.exitCode = 1;
      }
  assert.deepEqual(current.errors, []);
  assert.deepEqual(baseline.errors, []);
  assert.ok(rows.length, "No matching looks");
  await writeFile(
    resolve(out, "comparison.json"),
    JSON.stringify(
      {
        reference,
        width: Number(args.width),
        height: Number(args.height),
        rows,
      },
      null,
      2,
    ),
  );
} finally {
  await runtime.stop();
  await server.close();
}
