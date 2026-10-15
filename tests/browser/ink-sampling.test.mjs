import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";
import { renderLook } from "./client.mjs";

// Negative control: restore the former interior texture without depending on
// an external git revision. This must visibly fail the smooth-interior gate.
function engravedControl(source) {
  return source
    .replace("fine*0.8*(1.0-gGrow)", "fine*0.8")
    .replace(
      "float folded=pow(0.5+0.5*inkNoise(hitP*3.0),4.0);",
      `float n=inkNoise(hitP*22.0+vec3(sin(gPhase),gSeed,cos(gPhase)));
    float phi=inkNoise(hitP*7.0+n*0.6)*97.0+n*4.0;
    float aa=max(fwidth(phi),0.025);
    float filament=(1.0-smoothstep(0.14,0.14+aa,abs(sin(phi))))*0.14/(0.14+aa*0.5);
    filament=mix(filament,0.0894,smoothstep(1.0,2.5,aa));
    float folded=pow(0.5+0.5*inkNoise(hitP*3.0+n*0.35),4.0);`,
    )
    .replace("(0.6076+folded*2.4)", "(0.25+folded*2.4+filament*4.0)");
}

function measure({ time, capture }) {
  const { engine } = window.__phosphorLab,
    slot = engine.slots.at(-1);
  slot.time = time;
  engine.uniformFrame++;
  engine.drawSlot(slot, 0);
  engine.present();
  const width = engine.width,
    height = engine.height,
    canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(engine.canvas, 0, 0);
  const data = context.getImageData(0, 0, width, height).data;
  const luma = (i) =>
    0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  let sum = 0,
    count = 0;
  const radius = Math.max(3, Math.round(height / 135));
  for (let y = radius; y < height - radius; y++)
    for (let x = radius; x < width - radius; x++) {
      const i = (y * width + x) * 4,
        l = luma(i);
      if (l < 12 || l > 105) continue;
      let low = l,
        high = l;
      for (const [dx, dy] of [
        [-radius, 0],
        [radius, 0],
        [0, -radius],
        [0, radius],
        [-radius, -radius],
        [radius, radius],
        [-radius, radius],
        [radius, -radius],
      ]) {
        const v = luma(i + (dy * width + dx) * 4);
        low = Math.min(low, v);
        high = Math.max(high, v);
      }
      if (high > 115 || low < 10 || high - low > 45) continue;
      const lap =
        4 * l -
        luma(i - 4) -
        luma(i + 4) -
        luma(i - width * 4) -
        luma(i + width * 4);
      sum += lap * lap;
      count++;
    }
  // Compare the physical field independently of rendered interior pigment.
  // The fix must not erase filaments by blurring/changing the density cache.
  const gl = engine.gl,
    cache = slot.precompute,
    field = new Float32Array(cache.w * cache.h * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, cache.fbo);
  gl.readPixels(0, 0, cache.w, cache.h, gl.RGBA, gl.FLOAT, field);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  let hash = 2166136261;
  for (const bits of new Uint32Array(field.buffer))
    hash = Math.imul(hash ^ bits, 16777619) >>> 0;
  return {
    rms: Math.sqrt(sum / Math.max(count, 1)),
    count,
    fieldHash: hash,
    rgba: capture ? Array.from(data) : [],
    glError: gl.getError(),
    nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads,
  };
}

test(
  "native ink interiors reject engraved fringes without changing Drop or the physical field",
  { skip: process.env.PHOSPHOR_INK_GPU !== "1", timeout: 180000 },
  async () => {
    const source = await readFile(
      new URL("../../scene-ink.mjs", import.meta.url),
      "utf8",
    );
    const control = engravedControl(source);
    assert.notEqual(source, control);
    assert.match(control, /float phi=inkNoise/);
    const server = await serve(".", 48517),
      runtime = await launch({ rig: true, headless: true });
    try {
      const results = {};
      for (const [name, body] of [
        ["final", source],
        ["engraved", control],
      ]) {
        const lab = await openLab(
          {
            newContext: async (options) => {
              const context = await runtime.browser.newContext(options);
              await context.route("**/scene-ink.mjs", (route) =>
                route.fulfill({ contentType: "text/javascript", body }),
              );
              return context;
            },
          },
          server.url,
        );
        results[name] = [];
        for (const index of [0, 1, 2, 5, 6]) {
          const health = await lab.page.evaluate(renderLook, {
            sceneId: "ink",
            index,
            frames: 1,
            level: 0.85,
            base: 0.85,
            width: 960,
            height: 540,
            capture: false,
            pollHealth: false,
          });
          assert.equal(health.glError, 0);
          const result = await lab.page.evaluate(measure, {
            time: 24,
            capture: index === 0,
          });
          assert.equal(result.glError, 0);
          assert.equal(result.nonFinite, 0);
          assert.ok(result.count > 10000);
          results[name].push({ index, ...result });
        }
        assert.deepEqual(lab.errors, []);
        await lab.context.close();
      }
      for (let i = 0; i < results.final.length; i++) {
        const a = results.final[i],
          b = results.engraved[i];
        assert.equal(a.fieldHash, b.fieldHash, `physical field ${a.index}`);
        if ([2, 6].includes(a.index))
          assert.ok(
            a.rms < b.rms * 0.75,
            `cloud ${a.index}: ${a.rms} vs ${b.rms}`,
          );
        if ([1, 5].includes(a.index))
          assert.ok(
            a.rms < b.rms * 0.95,
            `plume ${a.index}: ${a.rms} vs ${b.rms}`,
          );
        if (a.index === 0) {
          let sum = 0;
          for (let j = 0; j < a.rgba.length; j++)
            sum += Math.abs(a.rgba[j] - b.rgba[j]);
          assert.ok(
            sum / a.rgba.length < 0.02,
            "Drop must retain its resolved lamellae",
          );
        }
        console.log(
          JSON.stringify({
            index: a.index,
            final: a.rms,
            engraved: b.rms,
            fieldUnchanged: true,
          }),
        );
      }
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
