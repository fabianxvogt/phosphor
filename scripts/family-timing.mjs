// Family-gate frame timing (D38): plays every type of one family at full
// energy on the real stage at the 1080p-equivalent pixel budget and reports
// frame-interval percentiles per type. Writes artifacts/timing/<family>.json.
//   npm run timing -- --rig --family cathedral [--seconds 30] [--level 0.95]
// The gate needs --rig (installed Chrome, real GPU, nothing else heavy
// running); without it this is a headless smoke of the runner itself.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openShow,
} from "./browser-runtime.mjs";
import { percentile } from "../tests/browser/metrics.mjs";

const args = options({
  family: { type: "string" },
  seconds: { type: "string", default: "30" },
  level: { type: "string", default: "0.95" },
});
if (!args.family) throw new Error("--family is required");
const seconds = Number(args.seconds),
  level = Number(args.level);
const out = await outputDirectory("timing", args.out);
const server = await serve(".", args.port);
const runtime = await launch({ rig: args.rig });
let summary;
try {
  const { control, stage, errors } = await openShow(
    runtime.browser,
    server.url,
    {
      viewport: { width: 1280, height: 800 },
      stageViewport: { width: 1920, height: 1080 },
    },
  );
  const send = (action) =>
    control.evaluate(
      (action) =>
        new BroadcastChannel("phosphor-show").postMessage({
          type: "action",
          action,
        }),
      action,
    );
  const drain = () => stage.evaluate(() => window.__phosphorStage.telemetry());
  const family = await stage.evaluate((id) => {
    const { engine, scenes, show } = window.__phosphorStage;
    const scene = scenes.find((s) => s.id === id);
    const clip = show.set.pages
      .flatMap((p) => p.slots)
      .find((c) => c?.snapshot.scene === id);
    const gl = engine.gl;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return (
      scene &&
      clip && {
        clip,
        key: scene.type?.key ?? null,
        values: scene.type?.values ?? [null],
        renderer: gl.getParameter(
          debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER,
        ),
      }
    );
  }, args.family);
  if (!family) throw new Error(`No family or starter clip for ${args.family}`);
  if (args.rig && /swiftshader|llvmpipe|software/i.test(family.renderer))
    throw new Error(`--rig requires the real GPU, got ${family.renderer}`);
  await send({ type: "autopilot", on: false });
  const rows = [];
  for (const value of family.values) {
    const snapshot = structuredClone(family.clip.snapshot);
    if (family.key !== null) snapshot.params[family.key] = value;
    // Energy is show state (D54): set it, then audition the clip at its
    // authored energy so the family's energy curves move it to `level`.
    await send({ type: "energy", value: level });
    await send({
      type: "audition",
      clip: { ...family.clip, snapshot, fade: 0 },
    });
    await delay(3000); // compile, warm-up and the energy ramp
    await drain();
    await delay(seconds * 1000);
    const t = await drain();
    const intervals = t.frameIntervalsMs;
    rows.push({
      type: family.key === null ? null : `${family.key} ${value}`,
      scene: t.scene,
      level: t.level,
      size: `${t.width}×${t.height}`,
      frames: intervals.length,
      p50: percentile(intervals, 0.5),
      p95: percentile(intervals, 0.95),
      p99: percentile(intervals, 0.99),
      max: intervals.length ? Math.max(...intervals) : null,
      gpuErrors: t.gpuErrors,
      nonFinite: t.nonFinite,
      stepReductions: t.stepReductions,
      downgrades: t.downgrades,
    });
    console.log(JSON.stringify(rows.at(-1)));
  }
  const ok = (r) =>
    r.scene === args.family &&
    r.p99 !== null &&
    r.p99 <= 34 &&
    r.gpuErrors === 0 &&
    r.nonFinite === 0 &&
    r.stepReductions === 0 &&
    r.downgrades === 0;
  summary = {
    family: args.family,
    renderer: family.renderer,
    rig: !!args.rig,
    seconds,
    level,
    rows,
    errors,
    passed: !!args.rig && errors.length === 0 && rows.every(ok),
  };
} finally {
  await runtime.stop();
  await server.close();
}
await writeFile(
  resolve(out, `${args.family}.json`),
  JSON.stringify(summary, null, 1),
);
console.log(
  summary.passed
    ? `PASS ${args.family}: every type p99 ≤ 34 ms at energy ${level}`
    : `NOT PASSED ${args.family}${args.rig ? "" : " (headless smoke, no verdict)"}`,
);
