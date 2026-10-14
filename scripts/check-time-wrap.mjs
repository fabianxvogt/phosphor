// Long-show time seams on the native GPU (docs/families/TIME.md).
//
// For every family's first look, steps scene time at speed 2× (1/30 s per
// frame, simulations included) across each epoch: 10 s (an ordinary step),
// the old hourly wrap at 3600 s, Abyss's old 4096 s wrap and 12 hours. The
// mean frame-to-frame difference across an epoch must stay within the
// ordinary steps around it. --reference <rev> serves the scenes of another
// revision (for example origin/main before the fix) to show its seams.
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/check-time-wrap.mjs --rig --port 48402
// --identity <rev> --families a,b instead compares every look of those
// families at first-hour times (--times) with that revision's shaders.
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "./browser-runtime.mjs";
import { renderLook } from "../tests/browser/client.mjs";

// 12 h is probed at 43 201 s: at exactly 43 200 s a pre-existing Newton root
// hue sawtooth (fract(k/3 + t·drift/80), every 1600/3 s at drift .25) wraps
// by coincidence; that palette seam is first-hour behaviour (TIME.md).
export const EPOCHS = [10, 3600, 4096, 43201];
export const STEP = 1 / 30; // speed 2× at 60 Hz
// A seam is a crossing step larger than SEAM_FACTOR × the largest ordinary
// step next to it (or at 10 s), plus a small absolute floor for still looks.
export const SEAM_FACTOR = 2;
export const SEAM_FLOOR = 0.35;

// Runs in the lab page: frame-to-frame mean |ΔRGB| (0–255) of six frames
// straddling each epoch, the middle step crossing it.
export async function stepAcross({ epochs, step, width, height }) {
  const { engine } = window.__phosphorLab;
  const gl = engine.gl;
  const read = () => {
    engine.present();
    const pixels = new Uint8Array(engine.width * engine.height * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.readPixels(
      0,
      0,
      engine.width,
      engine.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    return pixels;
  };
  const difference = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i += 4)
      sum +=
        Math.abs(a[i] - b[i]) +
        Math.abs(a[i + 1] - b[i + 1]) +
        Math.abs(a[i + 2] - b[i + 2]);
    return sum / ((a.length / 4) * 3);
  };
  if (engine.width !== width || engine.height !== height)
    engine.resize(width, height);
  const slot = engine.slots.at(-1);
  const beat = engine.beat;
  engine.speed = 2;
  const rows = [];
  for (const epoch of epochs) {
    // Start 3½ steps early: frames land at epoch ± ½, 1½, 2½ steps.
    slot.time = epoch - 3.5 * step;
    const frames = [];
    for (let i = 0; i < 6; i++) {
      engine.beat = beat;
      engine.advance(step / 2, false);
      frames.push(read());
    }
    const steps = [];
    for (let i = 1; i < frames.length; i++)
      steps.push(difference(frames[i - 1], frames[i]));
    rows.push({ epoch, steps, time: slot.time });
  }
  engine.speed = 1;
  return {
    rows,
    // The long-show variant (PHOSPHOR_LATE) drew the late epochs.
    late: !!engine.programs.get(slot.scene.id)?.late?.visual?.uniforms,
    glError: gl.getError(),
    nonFinite:
      engine.counters.nonFinite + (window.__harness?.nonFiniteUploads ?? 0),
  };
}

// Judges one family's rows: the step across each epoch (index 2) against the
// ordinary steps beside it and the steps at 10 s.
export function judge(rows) {
  const ordinary = rows.find((row) => row.epoch === EPOCHS[0]);
  const base = Math.max(...ordinary.steps);
  return rows
    .filter((row) => row !== ordinary)
    .map((row) => {
      const cross = row.steps[2];
      const beside = Math.max(
        row.steps[0],
        row.steps[1],
        row.steps[3],
        row.steps[4],
      );
      const limit = SEAM_FACTOR * Math.max(beside, base) + SEAM_FLOOR;
      return {
        epoch: row.epoch,
        cross,
        beside,
        base,
        ratio: cross / Math.max(beside, 1e-6),
        seam: cross > limit,
      };
    });
}

// Scene sources (scene-*.mjs, *-geometry.mjs) of another revision.
function revisionSources(reference) {
  const revision = execFileSync(
    "git",
    ["rev-parse", "--verify", `${reference}^{commit}`],
    { encoding: "utf8" },
  ).trim();
  const files = execFileSync(
    "git",
    ["ls-tree", "--name-only", revision, "--", "."],
    { encoding: "utf8" },
  )
    .split("\n")
    .filter((name) => /^scene-.*\.mjs$|-geometry\.mjs$/.test(name));
  return new Map(
    files.map((name) => [
      `/${name}`,
      execFileSync("git", ["show", `${revision}:${name}`], {
        encoding: "utf8",
      }),
    ]),
  );
}

async function start(port) {
  const server = await serve(".", port);
  const runtime = await launch({
    rig: true,
    headless: true,
    args: [
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
  const open = (sources) =>
    openLab(
      {
        newContext: async (contextOptions) => {
          const context = await runtime.browser.newContext(contextOptions);
          if (sources)
            await context.route("**/*.mjs", (route) => {
              const path = new URL(route.request().url()).pathname;
              const source = sources.get(path);
              return source
                ? route.fulfill({
                    contentType: "text/javascript",
                    body: source,
                  })
                : route.continue();
            });
          return context;
        },
      },
      server.url,
    );
  const stop = async () => {
    await runtime.stop();
    await server.close();
  };
  return { open, stop };
}

export async function checkTimeWrap({
  port = 48402,
  reference = null,
  families = null,
  epochs = EPOCHS,
  width = 320,
  height = 180,
  log = () => {},
} = {}) {
  const browser = await start(port);
  const results = [];
  try {
    const { page, errors } = await browser.open(
      reference ? revisionSources(reference) : null,
    );
    const ids = await page.evaluate(() =>
      window.__phosphorLab.scenes.map((scene) => scene.id),
    );
    for (const sceneId of ids.filter(
      (id) => !families || families.includes(id),
    )) {
      await page.reload();
      await page.waitForFunction(() => !!window.__phosphorLab);
      const health = await page.evaluate(renderLook, {
        sceneId,
        index: 0,
        level: 0.5,
        width,
        height,
        frames: 20,
        capture: false,
        pollHealth: false,
      });
      const measured = await page.evaluate(stepAcross, {
        epochs,
        step: STEP,
        width,
        height,
      });
      const verdicts = judge(measured.rows);
      const result = {
        sceneId,
        glError: health.glError || measured.glError,
        nonFinite: measured.nonFinite,
        late: measured.late,
        rows: measured.rows,
        verdicts,
        seams: verdicts.filter((verdict) => verdict.seam).map((v) => v.epoch),
      };
      results.push(result);
      log(result);
    }
    if (errors.length) throw new Error(errors.join("\n"));
  } finally {
    await browser.stop();
  }
  return results;
}

// Runs in the lab page: one frame at each scene time, as base64 RGBA bytes.
export function framesAt({ times }) {
  const { engine } = window.__phosphorLab;
  const gl = engine.gl;
  const slot = engine.slots.at(-1);
  return times.map((time) => {
    slot.time = time;
    engine.uniformFrame++;
    engine.drawSlot(slot, 1 / 60);
    engine.present();
    const pixels = new Uint8Array(engine.width * engine.height * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.readPixels(
      0,
      0,
      engine.width,
      engine.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    let bytes = "";
    for (let i = 0; i < pixels.length; i += 32768)
      bytes += String.fromCharCode(...pixels.subarray(i, i + 32768));
    return btoa(bytes);
  });
}

// First-hour identity: every look of the families at several levels and
// times < 3600 s, current shaders against the reference revision's, with the
// same engine and the same render sequence on both pages.
export async function compareFirstHour({
  port = 48404,
  reference,
  families,
  times = [0.5, 1234.5, 3599],
  levels = [0.1, 0.5, 0.95],
  width = 320,
  height = 180,
  log = () => {},
}) {
  const browser = await start(port);
  const rows = [];
  try {
    const current = await browser.open(null);
    const baseline = await browser.open(revisionSources(reference));
    const pages = [baseline.page, current.page];
    for (const sceneId of families) {
      for (const page of pages) {
        await page.reload();
        await page.waitForFunction(() => !!window.__phosphorLab);
      }
      const looks = await current.page.evaluate(
        (id) =>
          window.__phosphorLab.scenes.find((scene) => scene.id === id).presets
            .length,
        sceneId,
      );
      for (let index = 0; index < looks; index++)
        for (const level of levels) {
          const captures = [];
          for (const page of pages) {
            // Background pages throttle requestAnimationFrame (compiles).
            await page.bringToFront();
            await page.evaluate(renderLook, {
              sceneId,
              index,
              level,
              width,
              height,
              frames: 30,
              capture: false,
              pollHealth: false,
            });
            const frames = await page.evaluate(framesAt, { times });
            captures.push(frames.map((b64) => Buffer.from(b64, "base64")));
          }
          for (const [i, time] of times.entries()) {
            const [a, b] = [captures[0][i], captures[1][i]];
            let max = 0,
              changed = 0;
            for (let p = 0; p < a.length; p += 4) {
              const d = Math.max(
                Math.abs(a[p] - b[p]),
                Math.abs(a[p + 1] - b[p + 1]),
                Math.abs(a[p + 2] - b[p + 2]),
              );
              max = Math.max(max, d);
              if (d) changed++;
            }
            const row = { sceneId, index, level, time, max, changed };
            rows.push(row);
            log(row);
          }
        }
      for (const { errors } of [current, baseline])
        if (errors.length) throw new Error(errors.join("\n"));
    }
  } finally {
    await browser.stop();
  }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = options({
    reference: { type: "string" },
    identity: { type: "string" },
    times: { type: "string", default: "0.5,1234.5,3599" },
    families: { type: "string" },
    width: { type: "string", default: "320" },
    height: { type: "string", default: "180" },
  });
  const out = await outputDirectory("time-wrap", args.out);
  if (args.identity) {
    const rows = await compareFirstHour({
      port: Number(args.port),
      reference: args.identity,
      families: (args.families ?? "").split(",").filter(Boolean),
      times: args.times.split(",").map(Number),
      width: Number(args.width),
      height: Number(args.height),
      log: (row) => console.log(JSON.stringify(row)),
    });
    await writeFile(
      resolve(out, "identity.json"),
      JSON.stringify({ reference: args.identity, rows }, null, 2),
    );
    const differing = rows.filter((row) => row.max > 0);
    console.log(
      `${rows.length} frames, ${differing.length} differ, max ${Math.max(0, ...rows.map((row) => row.max))}`,
    );
    if (differing.length) process.exitCode = 1;
  } else {
    const results = await checkTimeWrap({
      port: Number(args.port),
      reference: args.reference ?? null,
      families: args.families?.split(",") ?? null,
      width: Number(args.width),
      height: Number(args.height),
      log: (result) =>
        console.log(
          `${result.sceneId.padEnd(14)} ${result.verdicts
            .map(
              (v) =>
                `${v.epoch}: ${v.cross.toFixed(2)} vs ${v.beside.toFixed(2)}${v.seam ? " SEAM" : ""}`,
            )
            .join(
              "  ",
            )}  (10 s: ${result.verdicts[0].base.toFixed(2)})${result.late ? "  late variant" : ""}`,
        ),
    });
    await writeFile(
      resolve(out, "time-wrap.json"),
      JSON.stringify({ reference: args.reference ?? null, results }, null, 2),
    );
    const bad = results.filter(
      (r) => r.seams.length || r.glError || r.nonFinite,
    );
    console.log(
      `${results.length} families, ${bad.length} with seams or errors` +
        (bad.length ? `: ${bad.map((r) => r.sceneId).join(", ")}` : ""),
    );
    if (bad.length && !args.reference) process.exitCode = 1;
  }
}
