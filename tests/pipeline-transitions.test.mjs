import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openShow,
} from "../scripts/browser-runtime.mjs";
import { percentile } from "./browser/metrics.mjs";

// npm run build, then node tests/pipeline-transitions.test.mjs --rig --port 48115
// Normal npm test skips GPU work; this opt-in test uses the built app, captures
// actual clip transitions, and measures two Flight slots on the real GPU.
test(
  "built transitions ease, dissolve, feed back, interrupt cleanly and render on the stage",
  { skip: !process.argv.includes("--port"), timeout: 600000 },
  async () => {
    const args = options();
    const out = await outputDirectory("browser/transitions", args.out);
    const server = await serve(".", args.port);
    const runtime = await launch({ rig: args.rig });
    const evidence = { rig: args.rig, precision: [], frames: [], timing: [] };
    try {
      const { stage, control, errors, context } = await openShow(
        runtime.browser,
        server.url,
        { stageViewport: { width: 960, height: 540 } },
      );
      const renderer = await stage.evaluate(() => {
        const gl = window.__phosphorStage.engine.gl;
        const debug = gl.getExtension("WEBGL_debug_renderer_info");
        return gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
      });
      evidence.renderer = renderer;
      if (args.rig)
        assert.doesNotMatch(renderer, /swiftshader|llvmpipe|software/i);
      const send = (action) =>
        control.evaluate((action) => {
          new BroadcastChannel("phosphor-show").postMessage({
            type: "action",
            action,
          });
        }, action);
      await send({ type: "autopilot", on: false });
      await send({ type: "speed", value: 1 });
      await send({ type: "energy", value: 0.95 });

      // A deterministic picture probe exercises the real built compositor in
      // both precision paths, without scene motion obscuring the differences.
      evidence.precision = await stage.evaluate(async () => {
        const { Engine } = await import("/dist/engine.mjs");
        const rows = [];
        for (const fallback of [false, true]) {
          const canvas = document.createElement("canvas");
          const gl = canvas.getContext("webgl2", {
            alpha: false,
            antialias: false,
            preserveDrawingBuffer: true,
          });
          const extension = gl.getExtension.bind(gl);
          if (fallback)
            gl.getExtension = (name) =>
              name === "EXT_color_buffer_float" ? null : extension(name);
          const scenes = [
            {
              id: "outgoing",
              schema: [],
              fragment: `void main(){outColor=vec4(.15+.2*step(.5,fract(v_uv.x*8.)),v_uv.y*.2,0.,1.);}`,
            },
            {
              id: "incoming",
              schema: [],
              fragment: `void main(){outColor=vec4(0.,0.,.4,1.);}`,
            },
          ];
          const failures = [];
          const engine = new Engine(canvas, scenes, (message) =>
            failures.push(message),
          );
          engine.resize(160, 90);
          Object.assign(engine.options, {
            brightness: 1,
            bloom: 0,
            echo: 0,
            chroma: 0,
            grain: 0,
            vignette: 0,
            flashLimit: false,
          });
          engine.setLevel(0.5, 0);
          const snapshot = (scene) => ({
            scene,
            preset: scene,
            seed: 17,
            params: {},
            palette: {
              primary: "#ffffff",
              secondary: "#ffffff",
              accent: "#ffffff",
            },
          });
          await engine.ready("outgoing");
          await engine.ready("incoming");
          const pixels = () => {
            engine.present(null, true);
            const image = new Uint8Array(160 * 90 * 4);
            gl.readPixels(0, 0, 160, 90, gl.RGBA, gl.UNSIGNED_BYTE, image);
            return image;
          };
          const difference = (a, b) => {
            let sum = 0;
            for (let i = 0; i < a.length; i++)
              if (i % 4 !== 3) sum += Math.abs(a[i] - b[i]);
            return sum / (a.length * 0.75);
          };
          const captures = {};
          const interruptions = [];
          let historyTargets = null;
          for (const kind of ["crossfade", "dissolve", "melt"]) {
            engine.load(snapshot("outgoing"), 0);
            const outgoing = pixels();
            engine.load(snapshot("incoming"), 2, { transition: kind });
            for (let frame = 0; frame < 30; frame++) engine.advance(1 / 60);
            const middle = pixels();
            captures[kind] = middle;
            let animatedDifference = null;
            if (kind === "dissolve") {
              engine.transition.elapsed += 0.5;
              engine.transition.duration = 4; // Keep progress at 1/4; move only the noise field.
              animatedDifference = difference(middle, pixels());
              engine.transition.elapsed = 0.5;
              engine.transition.duration = 2;
            }
            if (kind === "melt") {
              historyTargets = [
                engine.pipeline.echoTarget,
                engine.pipeline.echoNextTarget,
              ];
              engine.options.echo = 1;
            }
            engine.load(snapshot("outgoing"), 0.5, {
              transition: kind === "melt" ? "dissolve" : "melt",
            });
            const restartDifference = difference(middle, pixels());
            const frozen = !!engine.slots[0].frozen;
            for (let frame = 0; frame < 60 && engine.transition; frame++)
              engine.advance(1 / 60);
            const stats = engine.stats();
            const historyReused =
              !historyTargets ||
              (historyTargets.includes(engine.pipeline.echoTarget) &&
                historyTargets.includes(engine.pipeline.echoNextTarget));
            interruptions.push({
              kind,
              restartDifference,
              frozen,
              animatedDifference,
              historyReused,
              ...stats,
            });
            engine.options.echo = 0;
            if (kind === "crossfade") {
              // At progress 1/4 the specified smoothstep weight is 0.15625,
              // not the old linear 0.25. Blue is independent of A's pattern.
              const pixel = 4 * (45 * 160 + 80);
              rows.push({
                fallback,
                blueAtQuarter: middle[pixel + 2],
                outgoingBlue: outgoing[pixel + 2],
              });
            }
          }
          let pure = 0,
            edge = 0;
          for (let pixel = 0; pixel < 160 * 90; pixel++) {
            const blue = captures.dissolve[pixel * 4 + 2];
            if (blue <= 2 || blue >= 100) pure++;
            else edge++;
          }
          engine.load(snapshot("incoming"), 2, { transition: "cut" });
          rows.at(-1).cutSlots = engine.slots.length;
          rows.at(-1).cutTransition = engine.transition;
          rows.at(-1).crossfadeDissolveDifference = difference(
            captures.crossfade,
            captures.dissolve,
          );
          rows.at(-1).crossfadeMeltDifference = difference(
            captures.crossfade,
            captures.melt,
          );
          rows.at(-1).dissolvePureShare = pure / (160 * 90);
          rows.at(-1).dissolveEdgeShare = edge / (160 * 90);
          rows.at(-1).interruptions = interruptions;
          rows.at(-1).glError = gl.getError();
          rows.at(-1).failures = failures;
          engine.dispose();
        }
        return rows;
      });
      for (const row of evidence.precision) {
        assert.ok(Math.abs(row.blueAtQuarter - 16) <= 2, JSON.stringify(row));
        assert.equal(row.outgoingBlue, 0);
        assert.ok(row.crossfadeDissolveDifference > 5);
        assert.ok(row.crossfadeMeltDifference > 1);
        assert.ok(row.dissolvePureShare > 0.6);
        assert.ok(row.dissolveEdgeShare > 0.01, "dissolve has a soft edge");
        assert.equal(row.cutSlots, 1);
        assert.equal(row.cutTransition, null);
        assert.equal(row.glError, 0);
        assert.deepEqual(row.failures, []);
        for (const interrupted of row.interruptions) {
          assert.ok(
            interrupted.restartDifference < 1,
            JSON.stringify(interrupted),
          );
          assert.equal(interrupted.frozen, true);
          assert.equal(interrupted.slots, 1);
          assert.equal(interrupted.liveTextures, interrupted.textures);
          assert.equal(interrupted.historyReused, true);
          if (interrupted.kind === "dissolve")
            assert.ok(interrupted.animatedDifference > 1);
        }
      }

      const clips = await stage.evaluate(() => {
        const all = window.__phosphorStage.show.set.pages
          .flatMap((page) => page.slots)
          .filter(Boolean);
        return {
          outgoing: all.find((clip) => clip.snapshot.scene === "flight"),
          incoming: all.find((clip) => clip.snapshot.scene === "pulse"),
        };
      });
      const transitionSelect = control
        .locator("#editor select")
        .filter({ has: control.locator('option[value="dissolve"]') });
      await transitionSelect.selectOption("melt");
      assert.equal(await transitionSelect.inputValue(), "melt");
      for (const transition of [
        "auto",
        "crossfade",
        "dissolve",
        "melt",
        "cut",
      ]) {
        await send({
          type: "audition",
          clip: { ...clips.outgoing, transition: "crossfade", fade: 0 },
        });
        await stage.waitForFunction(
          () =>
            window.__phosphorStage.engine.active?.scene === "flight" &&
            !window.__phosphorStage.engine.transition,
        );
        await delay(300);
        if (transition === "cut") {
          await send({ type: "downbeat" });
          await delay(250); // Outside the bar-line grace window.
        }
        await send({
          type: "audition",
          clip: { ...clips.incoming, transition, fade: 8 },
        });
        if (transition === "cut") {
          await stage.waitForFunction(
            () => window.__phosphorStage.show.pending?.transition === "cut",
          );
          const file = resolve(out, "cut-before.png");
          await stage.locator("canvas").first().screenshot({ path: file });
          evidence.frames.push({
            file,
            transition: "cut",
            progress: 0,
            slots: 1,
            clip: "cut",
          });
        }
        await stage.waitForFunction(
          () => window.__phosphorStage.engine.active?.scene === "pulse",
        );
        for (const fraction of transition === "cut" ? [1] : [0.25, 0.5, 0.75]) {
          if (transition !== "cut")
            await stage.waitForFunction((fraction) => {
              const transition = window.__phosphorStage.engine.transition;
              if (
                !transition ||
                transition.elapsed / transition.duration < fraction
              )
                return false;
              transition.manual = true;
              return true;
            }, fraction);
          const state = await stage.evaluate(() => {
            const { engine, show } = window.__phosphorStage;
            return {
              transition: engine.transition?.kind ?? "cut",
              progress: engine.transition
                ? engine.transition.elapsed / engine.transition.duration
                : 1,
              slots: engine.slots.length,
              clip: show.live.clip.transition,
            };
          });
          const file = resolve(
            out,
            `${transition}-${Math.round(fraction * 100)}.png`,
          );
          await stage.locator("canvas").first().screenshot({ path: file });
          evidence.frames.push({ file, ...state });
          await stage.evaluate(() => {
            if (window.__phosphorStage.engine.transition)
              window.__phosphorStage.engine.transition.manual = false;
          });
        }
      }

      // The ordinary Flight family gate measures one slot. Also measure each
      // smooth transition with two Flight types at 1080p-equivalent budget.
      if (args.rig) {
        await stage.setViewportSize({ width: 1920, height: 1080 });
        const flight = await stage.evaluate(() =>
          window.__phosphorStage.show.set.pages
            .flatMap((page) => page.slots)
            .filter((clip) => clip?.snapshot.scene === "flight"),
        );
        for (const transition of ["crossfade", "dissolve", "melt"]) {
          await send({
            type: "audition",
            clip: { ...flight[0], transition: "crossfade", fade: 0 },
          });
          await delay(3000);
          await stage.evaluate(() => window.__phosphorStage.telemetry());
          await send({
            type: "audition",
            clip: { ...flight[1], transition, fade: 24 },
          });
          await stage.waitForFunction(
            (kind) => window.__phosphorStage.engine.transition?.kind === kind,
            transition,
          );
          await delay(7000);
          const telemetry = await stage.evaluate(() => ({
            ...window.__phosphorStage.telemetry(),
            slots: window.__phosphorStage.engine.slots.length,
            transition: window.__phosphorStage.engine.transition?.kind,
          }));
          evidence.timing.push({
            transition,
            slots: telemetry.slots,
            activeTransition: telemetry.transition,
            width: telemetry.width,
            height: telemetry.height,
            frames: telemetry.frameIntervalsMs.length,
            p50: percentile(telemetry.frameIntervalsMs, 0.5),
            p95: percentile(telemetry.frameIntervalsMs, 0.95),
            p99: percentile(telemetry.frameIntervalsMs, 0.99),
            gpuErrors: telemetry.gpuErrors,
            nonFinite: telemetry.nonFinite,
            stepReductions: telemetry.stepReductions,
            downgrades: telemetry.downgrades,
          });
        }
        for (const row of evidence.timing) {
          assert.equal(row.slots, 2);
          assert.equal(row.activeTransition, row.transition);
          assert.ok(row.frames > 100);
          assert.ok(row.p99 <= 34, JSON.stringify(row));
          assert.equal(row.gpuErrors, 0);
          assert.equal(row.nonFinite, 0);
          assert.equal(row.stepReductions, 0);
          assert.equal(row.downgrades, 0);
        }
      }
      assert.deepEqual(errors, []);
      evidence.errors = errors;
      await context.close();
    } finally {
      await writeFile(
        resolve(out, "evidence.json"),
        JSON.stringify(evidence, null, 2),
      );
      await runtime.stop();
      await server.close();
    }
    console.log(JSON.stringify(evidence.timing));
  },
);
