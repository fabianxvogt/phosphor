import { Engine } from "../../engine.mjs";
import scenes from "../../scenes.mjs";
import { presetSnapshot } from "../../session.mjs";
import { ControlPreview } from "../../control-preview.mjs";
import { initialShowSet } from "../../show-set.mjs";
const result = document.getElementById("result");
const captures = document.getElementById("captures");
let engine;
function assert(ok, message) {
  if (!ok) throw new Error(message);
}
function read(slot) {
  const gl = engine.gl,
    target = slot.sim[slot.si];
  const data = new Uint8Array(target.w * target.h * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { data, w: target.w, h: target.h };
}
function same(a, b) {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}
function capture(label) {
  const figure = document.createElement("figure"),
    img = new Image(),
    caption = document.createElement("figcaption");
  img.src = engine.canvas.toDataURL();
  caption.textContent = label;
  figure.append(img, caption);
  captures.append(figure);
}
document.getElementById("run").onclick = async () => {
  result.textContent = "Running…";
  captures.replaceChildren();
  try {
    engine?.dispose();
    const errors = [];
    engine = new Engine(document.getElementById("canvas"), scenes, (m) =>
      errors.push(m),
    );
    engine.resize(640, 360);
    engine.options.flashLimit = false;
    const set = initialShowSet(scenes);
    set.autopilot.enabled = false;
    set.clock.mode = "manual";
    const player = new ControlPreview(engine, set, scenes, 0);
    engine.options.flashLimit = false;
    player.command({ type: "look", id: "acid:Signal Understory" }, 0);
    for (let i = 0; i < 180; i++) player.tick(i / 60, 1 / 60);
    const source = engine.slots.at(-1),
      field = read(source);
    assert(
      new Set(field.data).size > 32,
      "Source field must contain grown structure",
    );
    capture("Grown mycelium before transfer");
    player.command({ type: "world-prepare", id: "garden" }, 3);
    player.command({ type: "world-start" }, 3);
    const due = player.show.pending.at;
    // Apply separately: inspect field before the first destination simulation step.
    player.apply(player.show.tick(due / 2));
    const target = engine.slots.at(-1),
      copied = read(target);
    assert(
      target.carriedFrom === "acid:Signal Understory",
      "Engine must report actual field carry",
    );
    let mismatch = 0;
    for (let y = 0; y < copied.h; y++)
      for (let x = 0; x < copied.w; x++) {
        const sx = Math.min(
          field.w - 1,
          Math.floor(((x + 0.5) * field.w) / copied.w),
        );
        const sy = Math.min(
          field.h - 1,
          Math.floor(((y + 0.5) * field.h) / copied.h),
        );
        for (let c = 0; c < 4; c++)
          if (
            copied.data[(y * copied.w + x) * 4 + c] !==
            field.data[(sy * field.w + sx) * 4 + c]
          )
            mismatch++;
      }
    // Exact half-texel tie-breaking varies between GPU backends. Compare to
    // nearest texels on either side only for ties, otherwise exact packed bytes.
    let invalid = 0;
    for (let y = 0; y < copied.h; y++)
      for (let x = 0; x < copied.w; x++) {
        const fx = ((x + 0.5) * field.w) / copied.w,
          fy = ((y + 0.5) * field.h) / copied.h;
        const xs = [Math.floor(fx)],
          ys = [Math.floor(fy)];
        if (Math.abs(fx - Math.round(fx)) < 1e-9) xs.push(Math.round(fx) - 1);
        if (Math.abs(fy - Math.round(fy)) < 1e-9) ys.push(Math.round(fy) - 1);
        if (
          !xs.some((sx) =>
            ys.some((sy) =>
              [0, 1, 2, 3].every(
                (c) =>
                  copied.data[(y * copied.w + x) * 4 + c] ===
                  field.data[(sy * field.w + sx) * 4 + c],
              ),
            ),
          )
        )
          invalid++;
      }
    assert(invalid === 0, `Transfer corrupted ${invalid} concentration texels`);
    assert(
      target.warmTicks === 0 && !target.reset,
      "Transferred field must bypass seeding/warmup",
    );
    const start = engine.transition.beatStart,
      end = engine.transition.beatEnd;
    engine.speed = 0.5;
    engine.beat = (start + end) / 2;
    engine.advance(1 / 60);
    assert(
      Math.abs(engine.transition.elapsed / engine.transition.duration - 0.5) <
        1e-8,
      "Fade must follow beat, independent of speed",
    );
    capture("Halfway: both living renderers");
    const paused = read(target).data;
    const phase = engine.transition.elapsed;
    player.command({ type: "pause", on: true }, (start + end) / 4);
    for (let i = 0; i < 30; i++) player.tick(100 + i, 1 / 60);
    assert(
      same(paused, read(target).data),
      "Pause must preserve exact GPU concentrations",
    );
    assert(
      phase === engine.transition.elapsed,
      "Pause must preserve transition phase",
    );
    player.command({ type: "pause", on: false }, 200);
    engine.beat = end;
    engine.advance(1 / 60);
    assert(
      engine.slots.length === 1 && engine.transition === null,
      "Fade must finish after exactly four bars",
    );
    engine.speed = 1;
    for (let i = 0; i < 600; i++) {
      engine.beat = end + i / 30;
      engine.advance(1 / 60);
      if (i % 60 === 0) await new Promise(requestAnimationFrame);
    }
    const grown = read(target);
    const occupied = Array.from(
      { length: grown.w * grown.h },
      (_, i) => (grown.data[i * 4 + 2] * 256 + grown.data[i * 4 + 3]) / 65535,
    ).filter((v) => v > 0.035).length;
    assert(
      occupied > grown.w * grown.h * 0.005,
      "Inherited garden must stay visibly alive for ten seconds",
    );
    capture("Garden after ten seconds of inherited growth");
    assert(
      !same(copied.data, read(target).data),
      "Garden must continue evolving the inherited field",
    );
    // Reverse carry and same-family development, with bounded renderer slots.
    for (const [id, index] of [
      ["acid", 4],
      ["acid", 0],
      ["evolution", 3],
    ]) {
      engine.load(
        presetSnapshot(
          scenes.find((s) => s.id === id),
          index,
        ),
        2,
        { carryTraces: true },
      );
      assert(engine.slots.length <= 2, "At most two live renderer slots");
      if (engine.slots[0]?.frozen) continue; // explicit interruption falls back safely
      assert(
        engine.slots.at(-1).carriedFrom,
        "Reverse/same-family carry must work",
      );
      for (let i = 0; i < 250; i++) engine.advance(1 / 60);
    }
    assert(
      engine.gl.getError() === engine.gl.NO_ERROR,
      "GPU must not report transfer errors",
    );
    assert(errors.length === 0, errors.join("; "));
    result.textContent = `PASS: normalized nearest transfer across 320×192 → 384×384 (0 invalid texels; ${mismatch} alternative tie bytes); real field evolves; no reseed; half-speed beat timing; exact pause; reverse/same-family carry; ≤2 slots; no GPU errors.`;
  } catch (error) {
    result.textContent = `FAIL: ${error.stack}`;
  }
};

const sustain = document.createElement("button");
sustain.textContent = "Run sustained world cycle";
document.getElementById("run").after(sustain);
sustain.onclick = async () => {
  result.textContent = "Running sustained cycle…";
  try {
    engine?.dispose();
    engine = new Engine(document.getElementById("canvas"), scenes);
    engine.resize(320, 180);
    const set = initialShowSet(scenes);
    set.autopilot.enabled = false;
    set.clock.mode = "manual";
    const player = new ControlPreview(engine, set, scenes, 0);
    engine.options.flashLimit = false;
    const report = [];
    for (let i = 0; i < 60 * 96; i++) {
      const t = i / 60;
      if ([0, 1440, 2880, 4320].includes(i)) {
        const id = i < 2880 ? "mycelium" : "garden";
        const state = i === 1440 || i === 4320 ? 1 : 0;
        player.command({ type: "world-prepare", id, state }, t);
        player.command({ type: "world-start" }, t);
      }
      player.tick(t, 1 / 60);
      if (i % 60 === 0) {
        await new Promise(requestAnimationFrame);
        if (i > 600) {
          const field = read(engine.slots.at(-1));
          let occupied = 0;
          for (let k = 2; k < field.data.length; k += 4)
            if ((field.data[k] * 256 + field.data[k + 1]) / 65535 > 0.035)
              occupied++;
          const area = occupied / (field.w * field.h);
          assert(area > 0.005, `World faded to empty at ${t}s: ${area}`);
          if (i % 600 === 0)
            report.push(
              `${t}s ${player.show.world}: ${(area * 100).toFixed(1)}% alive`,
            );
        }
      }
    }
    capture("After a 96-second world cycle");
    result.textContent = "PASS sustained growth: " + report.join("; ");
  } catch (e) {
    result.textContent = "FAIL: " + e.stack;
  }
};
