import test from "node:test";
import assert from "node:assert/strict";
import { postCurve } from "../compositor.mjs";
import { Engine } from "../engine.mjs";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
  openShow,
} from "../scripts/browser-runtime.mjs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

for (const start of [0.1, 0.15, 0.25, 0.3]) {
  test(`post curve is bounded, monotonic and clean below ${start}`, () => {
    assert.equal(postCurve(-1, start), 0);
    assert.equal(postCurve(0, start), 0);
    assert.equal(postCurve(start, start), 0);
    assert.ok(Math.abs(postCurve((start + 1) / 2, start) - 0.5) < 1e-12);
    assert.equal(postCurve(1, start), 1);
    assert.equal(postCurve(2, start), 1);
    let previous = 0;
    for (let step = 0; step <= 100; step++) {
      const value = postCurve(step / 100, start);
      assert.ok(value >= previous && value >= 0 && value <= 1);
      previous = value;
    }
  });
}

test("picture targets use half floats while state, byte readbacks and fallback stay RGBA8", () => {
  const uploads = [],
    filters = [];
  const gl = {};
  for (const [index, key] of [
    "TEXTURE_2D",
    "RGBA16F",
    "RGBA8",
    "RGBA",
    "HALF_FLOAT",
    "UNSIGNED_BYTE",
    "TEXTURE_MIN_FILTER",
    "TEXTURE_MAG_FILTER",
    "NEAREST",
    "LINEAR",
    "TEXTURE_WRAP_S",
    "TEXTURE_WRAP_T",
    "REPEAT",
    "CLAMP_TO_EDGE",
    "FRAMEBUFFER",
    "COLOR_ATTACHMENT0",
    "FRAMEBUFFER_COMPLETE",
    "COLOR_BUFFER_BIT",
  ].entries())
    gl[key] = index + 1;
  for (const key of [
    "bindTexture",
    "bindFramebuffer",
    "framebufferTexture2D",
    "clearColor",
    "clear",
  ])
    gl[key] = () => {};
  gl.createTexture = gl.createFramebuffer = () => ({});
  gl.texImage2D = (...args) => uploads.push(args);
  gl.texParameteri = (...args) => filters.push(args);
  gl.checkFramebufferStatus = () => gl.FRAMEBUFFER_COMPLETE;
  const engine = Object.assign(Object.create(Engine.prototype), {
    gl,
    floatPicture: true,
    liveTextures: 0,
  });
  engine.target(16, 9);
  engine.target(8, 8, { simulation: true });
  engine.target(4, 4, { bytes: true });
  engine.target(8, 8, { simulation: true, filter: "linear" });
  engine.floatPicture = false;
  engine.target(16, 9);
  assert.deepEqual(
    uploads.map((args) => [args[2], args[7]]),
    [
      [gl.RGBA16F, gl.HALF_FLOAT],
      [gl.RGBA8, gl.UNSIGNED_BYTE],
      [gl.RGBA8, gl.UNSIGNED_BYTE],
      [gl.RGBA8, gl.UNSIGNED_BYTE],
      [gl.RGBA8, gl.UNSIGNED_BYTE],
    ],
  );
  assert.deepEqual(
    filters
      .filter((args) => args[1] === gl.TEXTURE_MIN_FILTER)
      .map((args) => args[2]),
    [gl.LINEAR, gl.NEAREST, gl.LINEAR, gl.LINEAR, gl.LINEAR],
  );
  assert.equal(engine.liveTextures, 5);
});

const browserRequested = process.argv.includes("--port");
test(
  "float and byte picture paths preserve HDR, black, feedback decay and limiter means",
  {
    skip: !browserRequested,
    timeout: 600000,
  },
  async () => {
    const args = options();
    const out = await outputDirectory("browser/d56-picture", args.out);
    const server = await serve(".", args.port);
    const runtime = await launch({ rig: args.rig });
    try {
      const lab = await openLab(runtime.browser, server.url);
      const evidence = await lab.page.evaluate(async () => {
        const { Engine } = await import("/engine.mjs");
        const { shaderHeader } = await import("/scene-contract.mjs");
        const results = [];
        for (const fallback of [false, true]) {
          const canvas = document.createElement("canvas");
          const gl = canvas.getContext("webgl2", {
            alpha: false,
            antialias: false,
            preserveDrawingBuffer: true,
          });
          const getExtension = gl.getExtension.bind(gl);
          const available = !!getExtension("EXT_color_buffer_float");
          const debug = getExtension("WEBGL_debug_renderer_info");
          const renderer = gl.getParameter(
            debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER,
          );
          if (fallback)
            gl.getExtension = (name) =>
              name === "EXT_color_buffer_float" ? null : getExtension(name);
          const scene = {
            id: "picture-probe",
            name: "Picture probe",
            schema: [],
            beat: {},
            fragment:
              "void main(){emit(vec4(4.*v_uv.x,.1+.2*v_uv.x,.00123,1.));}",
            simulation: {
              size: [1, 1],
              fragment: "void main(){outColor=pack16(vec2(.25,.75));}",
            },
          };
          const decay = {
            id: "decay-probe",
            name: "Decay probe",
            schema: [],
            beat: {},
            fragment:
              "void main(){vec3 c=u_reset?vec3(1.):texture(u_previous,v_uv).rgb;emit(vec4(u_time<.1?c*.99+.05:c*.9,1.));}",
          };
          const errors = [];
          const engine = new Engine(canvas, [scene, decay], (message) =>
            errors.push(message),
          );
          engine.resize(2, 1);
          Object.assign(engine.options, {
            brightness: 1,
            bloom: 0,
            echo: 0,
            chroma: 0,
            grain: 0,
            vignette: 0,
            flashLimit: false,
          });
          engine.beat = 0.5;
          const snapshot = (id) => ({
            scene: id,
            preset: "Probe",
            seed: 17,
            params: {},
            palette: {
              primary: "#ffffff",
              secondary: "#ffffff",
              accent: "#ffffff",
            },
          });
          engine.load(snapshot(scene.id), 0);
          await engine.ready(scene.id);
          engine.advance(1 / 60);
          const slot = engine.slots[0],
            visual = slot.visual[slot.vi];
          const read = (target, floating = false) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo ?? null);
            const pixels = floating
              ? new Float32Array(
                  (target?.w ?? engine.width) *
                    (target?.h ?? engine.height) *
                    4,
                )
              : new Uint8Array(
                  (target?.w ?? engine.width) *
                    (target?.h ?? engine.height) *
                    4,
                );
            gl.readPixels(
              0,
              0,
              target?.w ?? engine.width,
              target?.h ?? engine.height,
              gl.RGBA,
              floating ? gl.FLOAT : gl.UNSIGNED_BYTE,
              pixels,
            );
            return Array.from(pixels);
          };
          const hdr = read(visual, engine.floatPicture);
          const state = read(slot.sim[slot.si]);
          const hdrGlow = read(engine.pipeline.bloom(), engine.floatPicture);
          const sample = engine.program(
            shaderHeader +
              "uniform highp sampler2D source;void main(){outColor=texture(source,vec2(.5));}",
          );
          const bytes = engine.target(1, 1, { bytes: true });
          engine.bind(sample, bytes);
          engine.pipeline.texture(sample, "source", 0, visual);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          const filtered = read(bytes);
          engine.deleteTarget(bytes);
          gl.deleteProgram(sample.p);

          engine.resize(64, 36);
          // Constant neutral mid-grey makes grain, vignette and the mean independently measurable.
          scene.fragment = "void main(){emit(vec4(vec3(.5),1.));}";
          const program = engine.program(engine.pictureHeader + scene.fragment);
          const previousProgram = engine.programs.get(scene.id).visual;
          gl.deleteProgram(previousProgram.p);
          engine.programs.get(scene.id).visual = program;
          engine.drawSlot(slot, 0);
          engine.setLevel(1);
          const frame = (settings) => {
            Object.assign(engine.options, settings);
            engine.present();
            return read(null);
          };
          const clean = frame({ grain: 0, vignette: 0 });
          const grain = frame({ grain: 1 });
          engine.renderTick++;
          const nextGrain = frame({ grain: 1 });
          const vignette = frame({ grain: 0, vignette: 1 });
          engine.setLevel(0.1);
          const calm = frame({ grain: 1, vignette: 1 });
          const calmClean = frame({ grain: 0, vignette: 0 });
          engine.setLevel(1);
          const masterBlack = frame({ grain: 1, brightness: 0 });
          engine.blackoutTarget = engine.blackout = 1;
          const blackout = frame({ brightness: 1, grain: 1, vignette: 1 });
          engine.blackoutTarget = engine.blackout = 0;
          Object.assign(engine.options, {
            grain: 0,
            vignette: 0,
            brightness: 1,
            echo: 1,
            bloom: 1,
          });
          engine.present();
          const echoFloat = engine.pipeline.echoTarget.floating;
          const bloomFloat = engine.pipeline.bloomTargets.every(
            (target) => target.floating,
          );
          Object.assign(engine.options, {
            echo: 0,
            bloom: 0,
            flashLimit: true,
          });
          engine.present();
          gl.finish();
          // A WebGL fence is not observable until a subsequent browser task,
          // even after finish(); exercise the presenter's asynchronous seam.
          let encoded = null;
          for (let i = 0; i < 60 && !encoded; i++) {
            await new Promise((done) => requestAnimationFrame(done));
            encoded = engine.pipeline.readback.poll();
          }
          if (!encoded)
            throw new Error(
              "Limiter mean readback did not complete: " +
                JSON.stringify({
                  fallback,
                  lost: gl.isContextLost(),
                  sync: !!engine.pipeline.readback.sync,
                  error: gl.getError(),
                  frames: engine.pipeline.frames.length,
                  meanTargets: engine.pipeline.meanTargets.length,
                  flashLimit: engine.options.flashLimit,
                  exempt: engine.flashExempt,
                  blackout: engine.blackoutTarget,
                }),
            );
          const mean = new DataView(encoded.buffer).getFloat32(0);
          const meanBytes = engine.pipeline.meanTargets.every(
            (target) => !target.floating,
          );
          const mixFloat = engine.pipeline.frames.every(
            (target) => target.floating,
          );
          engine.pipeline.approve();
          engine.present();
          const approved = read(null);
          const mixError = gl.getError();

          Object.assign(engine.options, { flashLimit: false, grain: 0 });
          engine.load(snapshot(decay.id), 0);
          await engine.ready(decay.id);
          engine.advance(1 / 60);
          const start = read(
            engine.slots[0].visual[engine.slots[0].vi],
            engine.floatPicture,
          );
          for (let i = 0; i < 600; i++) engine.advance(1 / 60);
          const tail = read(
            engine.slots[0].visual[engine.slots[0].vi],
            engine.floatPicture,
          );
          const difference = (a, b) =>
            a.reduce(
              (sum, value, i) =>
                sum + (i % 4 === 3 ? 0 : Math.abs(value - b[i])),
              0,
            ) /
            (a.length * 0.75 * 255);
          results.push({
            fallback,
            available,
            renderer,
            floating: engine.floatPicture,
            hdr,
            hdrGlow,
            state,
            filtered,
            grainDelta: difference(clean, grain),
            temporalDelta: difference(grain, nextGrain),
            calmDelta: difference(calm, calmClean),
            corner: vignette[0],
            center: vignette[(18 * 64 + 32) * 4],
            masterPeak: Math.max(...masterBlack.filter((_, i) => i % 4 !== 3)),
            blackoutPeak: Math.max(...blackout.filter((_, i) => i % 4 !== 3)),
            echoFloat,
            bloomFloat,
            mixFloat,
            meanBytes,
            mean,
            approvedPeak: Math.max(...approved.filter((_, i) => i % 4 !== 3)),
            mixError,
            startPeak: Math.max(...start.filter((_, i) => i % 4 !== 3)),
            tailPeak: Math.max(...tail.filter((_, i) => i % 4 !== 3)),
            glError: gl.getError(),
            errors,
            textures: engine.stats(),
          });
          engine.dispose();
        }
        return results;
      });
      for (const row of evidence) {
        assert.ok(
          row.available,
          "the probe driver must exercise the float path",
        );
        assert.equal(row.floating, !row.fallback);
        assert.equal(row.glError, 0);
        assert.equal(row.mixError, 0);
        assert.deepEqual(row.errors, []);
        assert.deepEqual(
          row.state,
          [64, 0, 191, 255],
          "byte-packed simulation state is unchanged",
        );
        assert.ok(
          Math.abs(row.filtered[1] / 255 - 0.2) < 1 / 255,
          "half-float LINEAR interpolation works",
        );
        if (!row.fallback) {
          assert.equal(
            row.hdr[4],
            3,
            "HDR highlights are not clamped at the slot",
          );
          assert.ok(
            Math.abs(row.hdr[2] - 0.00123) < 0.00001,
            "sub-byte dark precision survives",
          );
          assert.ok(
            row.hdrGlow[0] > 1,
            "the bloom pyramid retains HDR highlight radiance",
          );
        } else assert.equal(row.hdr[4], 255);
        assert.ok(row.grainDelta > 0.003 && row.temporalDelta > 0.003);
        assert.equal(row.calmDelta, 0, "calm post is clean");
        assert.ok(
          row.corner < row.center / 2,
          "vignette attenuates the edge, not the centre",
        );
        assert.equal(row.masterPeak, 0);
        assert.equal(row.blackoutPeak, 0);
        assert.equal(row.echoFloat, !row.fallback);
        assert.equal(row.bloomFloat, !row.fallback);
        assert.equal(row.mixFloat, !row.fallback);
        assert.equal(
          row.meanBytes,
          true,
          "limiter float-bit codec stays RGBA8",
        );
        assert.ok(Math.abs(row.mean - 0.21404) < 0.002);
        assert.ok(row.approvedPeak > 120 && row.approvedPeak < 135);
        assert.ok(row.startPeak <= (row.fallback ? 255 : 1));
        assert.equal(
          row.tailPeak,
          0,
          "byte-dependent feedback completely decays",
        );
        assert.equal(row.textures.liveTextures, row.textures.textures);
      }
      assert.deepEqual(lab.errors, []);
      const show = await openShow(runtime.browser, server.url);
      for (const key of ["grain", "vignette"]) {
        const field = show.control.locator(`#fader-opt-${key}`);
        await field.evaluate((input) => {
          input.value = "0.37";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await show.stage.waitForFunction(
          (key) => window.__phosphorStage.engine.options[key] === 0.37,
          key,
        );
        await show.control.locator("#settingsLock").check();
        assert.equal(await field.isDisabled(), true);
        await show.control.locator("#settingsLock").uncheck();
        assert.equal(await field.isDisabled(), false);
      }
      assert.deepEqual(show.errors, []);
      await writeFile(
        resolve(out, "summary.json"),
        JSON.stringify(evidence, null, 2),
      );
      console.log(JSON.stringify(evidence));
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
