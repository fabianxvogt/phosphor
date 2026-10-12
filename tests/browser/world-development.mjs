import { Engine } from "../../engine.mjs";
import scenes from "../../scenes.mjs";
import {
  ControlPreview,
  performanceState,
  restorePerformance,
} from "../../control-preview.mjs";
import { initialShowSet } from "../../show-set.mjs";
import { presetSnapshot } from "../../session.mjs";
import { THUMBNAIL_PALETTE, thumbnailKey } from "../../thumbnail-palette.mjs";
const result = document.getElementById("result"),
  captures = document.getElementById("captures"),
  canvas = document.getElementById("canvas");
const scene = scenes.find((s) => s.id === "metamorphosis");
let engine;
const assert = (ok, text) => {
  if (!ok) throw Error(text);
};
function pixels(target = null) {
  const gl = engine.gl;
  const data = new Uint8Array(engine.width * engine.height * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo ?? null);
  gl.readPixels(
    0,
    0,
    engine.width,
    engine.height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data,
  );
  return data;
}
function same(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
function capture(text) {
  const figure = document.createElement("figure"),
    img = new Image(),
    caption = document.createElement("figcaption");
  img.src = canvas.toDataURL();
  caption.textContent = text;
  figure.append(img, caption);
  captures.append(figure);
}
document.getElementById("run").onclick = async () => {
  result.textContent = "Running…";
  captures.replaceChildren();
  try {
    engine?.dispose();
    const errors = [];
    engine = new Engine(canvas, scenes, (m) => errors.push(m));
    engine.resize(960, 540);
    engine.options.flashLimit = false;
    engine.options.grain = 0;
    await engine.ready("metamorphosis");
    const set = initialShowSet(scenes);
    set.clock.mode = "manual";
    set.autopilot.enabled = false;
    const player = new ControlPreview(engine, set, scenes, 0);
    engine.options.flashLimit = false;
    engine.options.grain = 0;
    player.command({ type: "world-prepare", id: "unfolding" }, 0);
    player.command({ type: "world-start" }, 0);
    player.tick(2, 1 / 60);
    // Allow parallel shader compilation to finish through the supported engine API.
    await engine.ready("metamorphosis");
    player.tick(10, 1 / 60);
    const slot = engine.slots.at(-1),
      mesh = slot.mesh,
      count = engine.liveTextures - engine.pipeline.targets.length,
      targets = [...slot.visual, ...slot.sim];
    assert(mesh && engine.slots.length === 1, "One persistent geometry slot");
    capture("Filaments");
    const first = pixels();
    assert(new Set(first).size > 50, "Visible shaded geometry");
    player.command({ type: "world-develop", state: 2 }, 10);
    player.tick(12, 1 / 60);
    player.tick(16, 1 / 60);
    assert(
      engine.slots.at(-1) === slot && slot.mesh === mesh,
      "Development must retain the same slot and mesh",
    );
    assert(
      engine.transition === null,
      "No crossfade within the continuous world",
    );
    assert(
      Math.abs(engine.active.params.development - 1) < 1e-8,
      "Midpoint membrane",
    );
    capture("Membrane: same centres");
    assert(!same(first, pixels()), "Forms must visibly change");
    player.command({ type: "pause", on: true }, 16);
    const held = pixels(),
      time = slot.time;
    for (let n = 0; n < 20; n++) player.tick(100 + n, 1 / 60);
    assert(
      same(held, pixels()) && slot.time === time,
      "Pause holds exact pixels and motion time",
    );
    player.command({ type: "world-seek", value: 0.32 }, 120);
    assert(
      !same(held, pixels()) && slot.time === time,
      "Paused scrubbing redraws shape without advancing motion",
    );
    assert(slot.mesh === mesh, "Paused scrub preserves geometry");
    // Exercise the production flash-limited path as well as the direct renderer.
    // Waiting for approval must not leave the displayed shape one edit behind.
    engine.options.flashLimit = true;
    let approvals = 0;
    let previousApproved = engine.pipeline.frames[0];
    for (let n = 0; n < 30; n++) {
      await new Promise(requestAnimationFrame);
      player.command({ type: "world-seek", value: n / 20 }, 120);
      player.tick(120 + n / 60, 1 / 60);
      if (engine.pipeline.frames[0] !== previousApproved) approvals++;
      previousApproved = engine.pipeline.frames[0];
    }
    assert(
      approvals > 1,
      "Continuous paused dragging must not starve approval",
    );
    for (const v of [0, 1, 2, 0]) {
      player.command({ type: "world-seek", value: v }, 120);
      for (let n = 0; n < 180 && engine.pipeline.refreshPending; n++) {
        await new Promise(requestAnimationFrame);
        player.tick(120 + n / 60, 1 / 60);
      }
      assert(!engine.pipeline.refreshPending, "Paused frame approved");
      assert(
        engine.pipeline.gain === 1,
        "Paused approval settles to full safe brightness",
      );
      const approved = pixels(engine.pipeline.frames[0]);
      engine.pipeline.render(engine.pipeline.frames[1], false);
      assert(
        same(approved, pixels(engine.pipeline.frames[1])),
        "Approved paused candidate matches current development",
      );
      assert(slot.time === time, "Approval never advances motion");
      engine.options.flashLimit = true;
    }
    engine.options.flashLimit = false;
    player.command({ type: "pause", on: false }, 120);
    player.command({ type: "world-seek", value: 2 }, 120);
    player.tick(120, 1 / 60);
    capture("Blossom: same connected organism");
    assert(
      engine.liveTextures - engine.pipeline.targets.length === count &&
        targets.every((t) => [...slot.visual, ...slot.sim].includes(t)),
      "Morph and scrub allocate no new textures",
    );
    const state = performanceState(player.show, 120),
      other = new ControlPreview(engine, structuredClone(set), scenes, 200);
    other.apply(restorePerformance(other.show, state, 200));
    other.tick(200, 1 / 60);
    assert(
      engine.active.seed === 112 && engine.active.params.development === 2,
      "Handoff retains lineage and development",
    );
    engine.resize(540, 960);
    other.tick(200.1, 1 / 60);
    capture("Portrait composition");
    for (let n = 0; n < 5; n++) {
      engine.load(presetSnapshot(scene, n % scene.presets.length), 0);
      engine.advance(1 / 60);
    }
    assert(
      engine.slots.length === 1 &&
        engine.liveTextures - engine.pipeline.targets.length === count,
      "Reload cleans up slots and geometry resources",
    );
    assert(engine.gl.getError() === engine.gl.NO_ERROR, "No GPU errors");
    assert(errors.length === 0, errors.join("; "));
    result.textContent =
      "PASS: real mesh morph; same slot/VAO; no crossfade/reseed; beat midpoint; exact pixel pause; flash-limited paused scrub; Stage-state handoff; portrait resize; bounded textures; no GPU errors.";
  } catch (e) {
    result.textContent = "FAIL: " + e.stack;
  }
};
const exportButton = document.createElement("button");
exportButton.textContent = "Export new catalog previews";
document.getElementById("run").after(exportButton);
exportButton.onclick = async () => {
  try {
    engine?.dispose();
    engine = new Engine(canvas, scenes);
    engine.resize(512, 288);
    engine.options.flashLimit = false;
    engine.options.grain = 0;
    engine.compileScene(scene);
    await engine.ready("metamorphosis");
    const entries = {};
    for (let i = 0; i < scene.presets.length; i++) {
      const snapshot = presetSnapshot(scene, i);
      snapshot.palette = { ...THUMBNAIL_PALETTE };
      engine.load(snapshot, 0);
      for (let f = 0; f < 24; f++) engine.advance(1 / 60);
      entries[`${scene.id}:${snapshot.preset}`] = {
        key: thumbnailKey(snapshot),
        url: canvas.toDataURL("image/webp", 0.9),
      };
      await new Promise(requestAnimationFrame);
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(entries)], { type: "application/json" }),
    );
    a.download = "metamorphosis-previews.json";
    a.textContent = "Download generated catalog previews";
    document.body.append(a);
    result.textContent = "Six real renderer previews ready to download.";
  } catch (e) {
    result.textContent = "FAIL: " + e.stack;
  }
};
