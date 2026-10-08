import assert from "node:assert/strict";
import { open, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  options,
  outputDirectory,
  serve,
  launch,
  newInstrument,
  pauseForCapture,
  deadline,
} from "./browser-runtime.mjs";
import { readTelemetry } from "../tests/browser/client.mjs";
import { percentile, heapEvidence } from "../tests/browser/metrics.mjs";

const args = options({ minutes: { type: "string", default: "30" } });
const minutes = Number(args.minutes);
if (!Number.isFinite(minutes) || minutes <= 0)
  throw new Error("--minutes must be positive");
const out = await outputDirectory("soak", args.out);
const log = await open(resolve(out, "telemetry.jsonl"), "w");
const append = async (record) => {
  await log.write(
    JSON.stringify({ hostTime: new Date().toISOString(), ...record }) + "\n",
  );
  await log.sync();
};
const server = await serve(args.dist, args.port);
let runtime, page, errors, set, source;
const samples = [],
  watchdogs = [],
  sources = new Set();
let exportEqual = false,
  blackoutFrames = null;
async function start() {
  runtime = await launch({ rig: args.rig });
  const instrument = await newInstrument(runtime.browser, server.url);
  ({ page, errors, source } = instrument);
  sources.add(source);
  const renderer = await page.evaluate(() => {
    const gl = window.__phosphor.engine.gl;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
  });
  if (args.rig && /swiftshader|llvmpipe|software/i.test(renderer))
    throw new Error(`--rig requires the real GPU, received ${renderer}`);
  if (!set)
    set = await page.evaluate(async () => {
      const app = window.__phosphor;
      const { presetSnapshot } = await import("/session.mjs");
      const set = app.getSession();
      set.name = "M1 all-preset real-time rehearsal";
      set.tempo = 92;
      set.options.quality = "balanced";
      set.options.autoQuality = true;
      set.options.autoRecovery = true;
      set.cues = app.scenes.flatMap((scene) =>
        scene.presets.map((preset, index) => {
          const snapshot = presetSnapshot(scene, index);
          snapshot.seed = 48113;
          return {
            id: `${scene.id}-${index}`,
            name: `${scene.name} / ${preset.name}`,
            snapshot,
            bars: 1,
            transition: 0.5,
            keyframes: [],
            energy: 0.5,
          };
        }),
      );
      set.active = set.cues[0].snapshot;
      return set;
    });
  await page.evaluate((set) => window.__phosphor.applySession(set), set);
  await page.locator('[data-tab="set"]').click();
  await page.locator("#playSetButton").click();
  const popupPromise = page.waitForEvent("popup");
  await page.locator("#outputButton").click();
  const popup = await popupPromise;
  await popup.waitForFunction(
    () => document.getElementById("output")?.videoWidth > 0,
  );
  await page.bringToFront();
  await append({
    event: "score-start",
    source,
    browser: runtime.version,
    renderer,
    rig: args.rig,
    cueCount: set.cues.length,
  });
}
async function probes() {
  // Freeze the clock and adaptive options before comparing one exported set.
  await pauseForCapture(page);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportButton").click();
  const download = await downloadPromise;
  const file = resolve(out, "rehearsal-set.json");
  await download.saveAs(file);
  const exported = JSON.parse(await readFile(file, "utf8"));
  await page.locator("#saveButton").click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__phosphor?.getSession);
  assert.deepEqual(
    await page.evaluate(() => window.__phosphor.getSession()),
    exported,
  );
  exportEqual = true;
  await page.waitForFunction(
    () => window.__phosphor.engine.health().mean > 0.001,
  );
  await page.evaluate(() => {
    window.__harness.blackoutResult = null;
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key.toLowerCase() !== "b") return;
        let frames = 0;
        function measure() {
          frames++;
          if (window.__phosphor.engine.health().mean < 0.0001 || frames >= 240)
            window.__harness.blackoutResult = frames;
          else requestAnimationFrame(measure);
        }
        requestAnimationFrame(measure);
      },
      { once: true },
    );
  });
  await page.locator("#stage").focus();
  await page.keyboard.press("b");
  await page.waitForFunction(() => window.__harness.blackoutResult != null);
  blackoutFrames = await page.evaluate(() => window.__harness.blackoutResult);
  await page.keyboard.press("b");
  await page.waitForFunction(
    () => window.__phosphor.engine.health().mean > 0.001,
  );
  await append({
    event: "preflight",
    exportEqual,
    blackoutFrames,
    note: "Blackout measured in observer rAF callbacks; rig only gate",
  });
  // Restart on a fresh browser so preflight/output reload cannot contaminate score samples.
  await runtime.stop();
  await start();
}
function summary(elapsedMinutes) {
  const intervals = samples.flatMap((sample) => sample.frameIntervalsMs ?? []);
  const prep = samples.flatMap((sample) => sample.cuePrepMs ?? []);
  const blackout = [
    ...(blackoutFrames == null ? [] : [blackoutFrames]),
    ...samples.flatMap((sample) => sample.blackoutLatencyFrames ?? []),
  ];
  const heaps = samples
    .map((sample) => sample.heapBytes)
    .filter((value) => typeof value === "number");
  const heap = heapEvidence(heaps);
  const settled = samples.flatMap((sample) => sample.settled ?? []);
  const max = (key) => {
    const values = samples
      .map((sample) => sample[key])
      .filter((value) => typeof value === "number");
    return values.length ? Math.max(...values) : null;
  };
  const gate = (name, value, passed, timing = false) => ({
    name,
    status:
      timing && !args.rig
        ? "SKIP (non-rig timing)"
        : value == null
          ? "INCONCLUSIVE"
          : passed
            ? "PASS"
            : "FAIL",
    value,
  });
  const p95 = percentile(intervals, 0.95),
    p99 = percentile(intervals, 0.99),
    downgrades = max("governorDowngrades"),
    gpu = max("gpuErrors"),
    nonFinite = max("nonFinite");
  const gates = [
    gate("frame interval p95 <= 18ms", p95, p95 <= 18, true),
    gate("frame interval p99 <= 34ms", p99, p99 <= 34, true),
    gate("zero governor downgrades", downgrades, downgrades === 0, true),
    gate("zero GPU errors", gpu, gpu === 0),
    gate("zero non-finite inputs", nonFinite, nonFinite === 0),
    gate(
      "heap growth <= 50MB without upward trend",
      heap,
      heap && heap.growthMB <= 50 && !heap.upwardTrend,
      true,
    ),
    gate(
      "every completed fade: 1 slot / 5 textures",
      settled.length ? settled.length : null,
      settled.every((stats) => stats.slots === 1 && stats.textures === 5),
    ),
    gate(
      "cue preparation -> fade start <= 250ms",
      prep.length ? Math.max(...prep) : null,
      prep.every((value) => value <= 250),
      true,
    ),
    gate(
      "blackout within 2 frames",
      blackout.length ? Math.max(...blackout) : null,
      blackout.every((value) => value <= 2),
      true,
    ),
    gate("export -> reload identical", exportEqual, exportEqual),
    gate(
      "responsive page / no browser errors",
      watchdogs.length + errors.length,
      watchdogs.length === 0 && errors.length === 0,
    ),
  ];
  return {
    rig: args.rig,
    requestedMinutes: minutes,
    elapsedMinutes,
    source: [...sources],
    limitations: [
      "Headless/software GPU never clears reference-rig timing gates.",
      "Fallback rAF measures callbacks, not physical presentation; fallback gl.getError is sampled, not an all-time GPU-error proof.",
      "This host rehearsal is not owner artistic approval or a physical projector/refresh-rate certification.",
    ],
    sampleCount: samples.length,
    cueCoverage: [
      ...new Set(
        samples.map((sample) => sample.currentCue).filter((cue) => cue != null),
      ),
    ],
    watchdogs,
    gates,
    passed: gates.every(
      (gate) => gate.status === "PASS" || gate.status.startsWith("SKIP"),
    ),
  };
}
let started;
try {
  await append({
    event: "begin",
    minutes,
    rig: args.rig,
    pollMs: 4000,
    watchdogMs: 2500,
    dist: args.dist,
  });
  await start();
  await probes();
  started = performance.now();
  console.log(
    `RUN ${minutes}-minute ${args.rig ? "headed real-GPU rig" : "headless software-GPU"} score; ${source}`,
  );
  console.log(`Host-side JSONL: ${resolve(out, "telemetry.jsonl")}`);
  if (args.rig)
    console.log(
      "Preflight finished. Move the clean-output window to the external 60Hz display; enter fullscreen there.",
    );
  const end = started + minutes * 60000;
  let due = started;
  while (performance.now() < end) {
    if (performance.now() < due) await delay(due - performance.now());
    await append({
      event: "poll-start",
      elapsedMs: performance.now() - started,
    });
    try {
      const sample = await deadline(
        page.evaluate(readTelemetry),
        2500,
        "telemetry poll",
      );
      samples.push(sample);
      await append({
        event: "sample",
        elapsedMs: performance.now() - started,
        ...sample,
      });
    } catch (error) {
      const record = {
        elapsedMs: performance.now() - started,
        error: error.message,
      };
      watchdogs.push(record);
      await append({ event: "watchdog", ...record });
      // Kill only this harness's browser process if CDP shutdown is also hung.
      await runtime.stop();
      await deadline(start(), 60000, "browser recovery");
      await append({
        event: "recovered",
        elapsedMs: performance.now() - started,
      });
    }
    due += 4000;
    if (due < performance.now()) due = performance.now();
  }
  const result = summary((performance.now() - started) / 60000);
  await append({ event: "summary", ...result });
  await writeFile(
    resolve(out, "summary.json"),
    JSON.stringify(result, null, 2),
  );
  for (const gate of result.gates)
    console.log(`${gate.status} ${gate.name}: ${JSON.stringify(gate.value)}`);
  console.log(`Host-side JSONL: ${resolve(out, "telemetry.jsonl")}`);
  if (!result.passed) process.exitCode = 1;
} catch (error) {
  await append({ event: "fatal", error: error.message });
  throw error;
} finally {
  await runtime?.stop();
  await server.close();
  await log.close();
}
