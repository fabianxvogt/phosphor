import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  options,
  outputDirectory,
  serve,
  launch,
  newInstrument,
  pauseForCapture,
  presets,
} from "./browser-runtime.mjs";
import { renderPreset } from "../tests/browser/client.mjs";

const args = options();
if (args.rig) throw new Error("Cross-browser smoke is correctness-only");
const out = await outputDirectory("cross", args.out);
const server = await serve(args.dist, args.port);
const results = [];
try {
  for (const browserName of ["webkit", "firefox"]) {
    let runtime;
    try {
      try {
        runtime = await launch({ browserName });
      } catch (error) {
        if (
          !/Executable doesn't exist|Host system is missing dependencies|cannot open shared object|Library not loaded/i.test(
            error.message,
          )
        )
          throw error;
        const result = {
          browser: browserName,
          status: "SKIP",
          reason: error.message.split("\n")[0],
          install: `npx playwright-core install ${browserName}`,
        };
        results.push(result);
        console.log(
          `SKIP ${browserName}: unavailable; install with ${result.install}`,
        );
        continue;
      }
      const { page, errors, capabilityMessage } = await newInstrument(
        runtime.browser,
        server.url,
        { capability: true },
      );
      if (capabilityMessage) {
        const result = {
          browser: browserName,
          version: runtime.version,
          status: "PASS capability message",
          capabilityMessage,
        };
        results.push(result);
        console.log(
          `PASS ${browserName}: clear capability message: ${capabilityMessage}`,
        );
        continue;
      }
      await pauseForCapture(page);
      const families = (await presets(page)).filter((look) => look.index === 0);
      for (const look of families) {
        const result = await page.evaluate(renderPreset, {
          ...look,
          seed: 48113,
          frames: 60,
          capture: false,
        });
        assert.ok(result.mean > 0.00001, `${look.sceneId}: blank`);
        assert.equal(result.glError, 0, `${look.sceneId}: WebGL error`);
        assert.equal(result.nonFinite, 0, `${look.sceneId}: non-finite upload`);
      }
      assert.deepEqual(errors, []);
      results.push({
        browser: browserName,
        version: runtime.version,
        status: "PASS",
        families: families.map((look) => look.sceneId),
      });
      console.log(
        `PASS ${browserName}: ${families.length} families rendered, WebGL 0, nonFinite 0`,
      );
    } catch (error) {
      results.push({
        browser: browserName,
        status: "FAIL",
        error: error.message,
      });
      console.error(`FAIL ${browserName}: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await runtime?.stop();
    }
  }
  await writeFile(
    resolve(out, "summary.json"),
    JSON.stringify({ timingGates: false, results }, null, 2),
  );
} finally {
  await server.close();
}
