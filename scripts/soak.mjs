// Show-gate soak runner (D38): drives the real control + stage for N minutes
// with autopilot on, samples stage telemetry every minute, then checks
// blackout latency and crash recovery, and writes artifacts/soak/summary.json.
//   npm run soak -- --rig --minutes 480 [--audio path/to/mix.wav]
// --rig uses installed Chrome with the real GPU (required for the gate);
// without it this is a headless smoke of the runner itself.
import { open, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openShow,
  deadline,
} from "./browser-runtime.mjs";
import { readStage } from "../tests/browser/client.mjs";
import { percentile, heapEvidence } from "../tests/browser/metrics.mjs";

const args = options({
  minutes: { type: "string", default: "30" },
  audio: { type: "string" },
});
const minutes = Number(args.minutes);
if (!(minutes > 0)) throw new Error("--minutes must be positive");
const out = await outputDirectory("soak", args.out);
const log = await open(resolve(out, "telemetry.jsonl"), "w");
const append = async (record) => {
  await log.write(
    JSON.stringify({ hostTime: new Date().toISOString(), ...record }) + "\n",
  );
  await log.sync();
};
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
const intervals = [],
  heaps = [],
  prep = [];
let summary;
try {
  const viewport = args.rig ? { width: 1600, height: 1000 } : undefined;
  const show = await openShow(
    runtime.browser,
    server.url,
    args.rig ? { viewport, stageViewport: { width: 1920, height: 1080 } } : {},
  );
  const { control, stage } = show;
  const renderer = await stage.evaluate(() => {
    const gl = window.__phosphorStage.engine.gl;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
  });
  if (args.rig && /swiftshader|llvmpipe|software/i.test(renderer))
    throw new Error(`--rig requires the real GPU, got ${renderer}`);
  if (args.audio) await control.setInputFiles("#audioFile", args.audio);
  else await control.click("#useDemo");
  await stage.evaluate(() => {
    const s = window.__phosphorStage.show;
    if (!s.autopilot.enabled)
      s.command({ type: "autopilot", on: true }, performance.now() / 1000);
    s.autopilot.manualUntil = -Infinity;
  });
  await append({
    event: "start",
    renderer,
    minutes,
    audio: args.audio ?? "demo",
  });
  const end = Date.now() + minutes * 60000;
  while (Date.now() < end) {
    await delay(Math.min(60000, end - Date.now()));
    const sample = await deadline(
      stage.evaluate(readStage),
      30000,
      "telemetry poll",
    );
    intervals.push(...sample.telemetry.frameIntervalsMs);
    prep.push(...sample.telemetry.clipPrepMs);
    if (sample.telemetry.heapBytes) heaps.push(sample.telemetry.heapBytes);
    const { frameIntervalsMs, clipPrepMs, ...rest } = sample.telemetry;
    await append({
      event: "minute",
      p95: percentile(frameIntervalsMs, 0.95),
      p99: percentile(frameIntervalsMs, 0.99),
      frames: frameIntervalsMs.length,
      scene: sample.scene,
      live: sample.status.live,
      bpm: sample.status.clock.bpm,
      source: sample.status.clock.source,
      ...rest,
    });
  }
  // Blackout latency at the end of the run.
  await control.locator("body").press("Escape");
  await stage.waitForFunction(
    () => window.__phosphorStage.engine.blackout === 1,
    null,
    { timeout: 5000 },
  );
  const blackout = (await stage.evaluate(readStage)).telemetry
    .blackoutLatencyFrames;
  await control.locator("body").press("Escape");
  // Crash drill: reload the stage; time until it renders the restored clip.
  const t0 = Date.now();
  await stage.reload();
  await stage.waitForFunction(
    () => window.__phosphorStage?.engine.frameCount > 10,
    null,
    { timeout: 30000 },
  );
  const recoverySeconds = (Date.now() - t0) / 1000;
  const final = await stage.evaluate(readStage);
  const heap = heapEvidence(heaps);
  const gate = (name, value, ok) => ({ name, value, ok: !!ok });
  const p95 = percentile(intervals, 0.95),
    p99 = percentile(intervals, 0.99);
  const gates = [
    gate("frame interval p95 ≤ 18 ms", p95, p95 !== null && p95 <= 18),
    gate("frame interval p99 ≤ 34 ms", p99, p99 !== null && p99 <= 34),
    gate(
      "no pixel-budget downgrade",
      final.telemetry.downgrades,
      final.telemetry.downgrades === 0,
    ),
    gate(
      "zero GPU errors",
      final.telemetry.gpuErrors,
      final.telemetry.gpuErrors === 0,
    ),
    gate(
      "zero non-finite inputs",
      final.telemetry.nonFinite,
      final.telemetry.nonFinite === 0,
    ),
    gate(
      "heap growth ≤ 50 MB, no upward trend",
      heap,
      heap && heap.growthMB <= 50 && !heap.upwardTrend,
    ),
    gate(
      "clip preparation ≤ 250 ms",
      prep.length ? Math.max(...prep) : null,
      prep.every((v) => v <= 250),
    ),
    gate(
      "blackout within 2 frames",
      blackout,
      blackout.length && blackout.every((f) => f <= 2),
    ),
    gate(
      "crash drill back on screen ≤ 10 s (stage reload)",
      recoverySeconds,
      recoverySeconds <= 10,
    ),
    gate("no page errors", show.errors, show.errors.length === 0),
  ];
  summary = {
    renderer,
    minutes,
    rig: !!args.rig,
    gates,
    passed: gates.every((g) => g.ok),
  };
  await append({ event: "end", ...summary });
} finally {
  await log.close();
  if (summary)
    await writeFile(
      resolve(out, "summary.json"),
      JSON.stringify(summary, null, 2),
    );
  await runtime.stop();
  await server.close();
}
for (const g of summary?.gates ?? [])
  console.log(
    `${g.ok ? "PASS" : "FAIL"} ${g.name}: ${JSON.stringify(g.value)}`,
  );
console.log(summary?.passed ? "Soak gate passed." : "Soak gate NOT passed.");
if (args.rig && !summary?.passed) process.exitCode = 1;
