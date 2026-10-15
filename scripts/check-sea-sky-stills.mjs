// Full-resolution/crop evidence; optional previous-scene replay, identical engine.
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
  reference: { type: "string" },
  families: { type: "string", default: "tide,murmuration" },
});
const out = await outputDirectory("sea-sky-stills", args.out);
const server = await serve(".", args.port),
  runtime = await launch({ rig: args.rig });
try {
  const context = await runtime.browser.newContext();
  if (args.reference)
    await context.route(/\/scene-(tide|murmuration)\.mjs$/, (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: execFileSync(
          "git",
          [
            "show",
            `${args.reference}:${new URL(route.request().url()).pathname.slice(1)}`,
          ],
          { encoding: "utf8" },
        ),
      }),
    );
  const { page, errors } = await openLab(
    { newContext: async () => context },
    server.url,
  );
  const results = [];
  for (const sceneId of args.families.split(","))
    for (const height of [1080, 2160])
      for (const index of [0, 1, 2]) {
        const width = (height * 16) / 9,
          level = index === 0 ? 0.1 : index === 1 ? 0.5 : 0.9;
        await page.evaluate(renderLook, {
          sceneId,
          index,
          width: 960,
          height: 540,
          frames: sceneId === "murmuration" ? 900 : 2,
          level,
          capture: false,
          pollHealth: false,
        });
        const result = await page.evaluate(
          ({ sceneId, index, width, height }) => {
            const { engine } = window.__phosphorLab;
            engine.resize(width, height);
            const slot = engine.slots.at(-1);
            if (sceneId === "tide") slot.time = 15;
            engine.advance(1 / 60, false);
            engine.present();
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(engine.canvas, 0, 0);
            const full = canvas.toDataURL("image/png").split(",")[1];
            // Native-pixel detail, not an upsample. Tide's lower near-camera sea;
            // birds use a centred strip through the silhouette.
            const crop = document.createElement("canvas");
            crop.width = 960;
            crop.height = 540;
            crop
              .getContext("2d")
              .drawImage(
                canvas,
                Math.floor(width * 0.22),
                Math.min(
                  height - 540,
                  Math.floor(height * (sceneId === "tide" ? 0.57 : 0.25)),
                ),
                960,
                540,
                0,
                0,
                960,
                540,
              );
            return {
              full,
              crop: crop.toDataURL("image/png").split(",")[1],
              glError: engine.gl.getError(),
              nonFinite: engine.counters.nonFinite,
              gpuErrors: engine.counters.gpuErrors,
            };
          },
          { sceneId, index, width, height },
        );
        const name = `${sceneId}-${index}-${height}`;
        for (const kind of ["full", "crop"])
          await writeFile(
            resolve(out, `${name}-${kind}.png`),
            Buffer.from(result[kind], "base64"),
          );
        const { full, crop, ...health } = result;
        assert.equal(health.glError, 0);
        assert.equal(health.nonFinite, 0);
        assert.equal(health.gpuErrors, 0);
        results.push({ name, ...health });
        console.log(name);
      }
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "health.json"),
    JSON.stringify(results, null, 2),
  );
} finally {
  await runtime.stop();
  await server.close();
}
