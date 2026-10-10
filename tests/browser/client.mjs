// Runs in the browser, before app modules. Never changes the shipped runtime.
export function installProbes() {
  const state = {
    nonFiniteUploads: 0,
    gpuErrors: 0,
    frameIntervalsMs: [],
    cuePrepMs: [],
    settled: [],
    previousFrame: null,
    previousSlots: 0,
    governorDowngrades: 0,
    previousQuality: null,
    restoreUniforms: [],
  };
  window.__harness = state;
  for (const proto of new Set([
    window.WebGLRenderingContext?.prototype,
    window.WebGL2RenderingContext?.prototype,
  ])) {
    if (!proto) continue;
    for (const name of Object.getOwnPropertyNames(proto).filter((name) =>
      /^uniform.*f/.test(name),
    )) {
      const original = proto[name];
      if (typeof original !== "function") continue;
      proto[name] = function (location, ...values) {
        for (const value of values) {
          if (typeof value === "number") {
            if (!Number.isFinite(value)) state.nonFiniteUploads++;
          } else if (value && typeof value.length === "number") {
            for (const number of value)
              if (!Number.isFinite(number)) state.nonFiniteUploads++;
          }
        }
        return original.call(this, location, ...values);
      };
      state.restoreUniforms.push(() => (proto[name] = original));
    }
  }
}

// Runs in the lab page: render one look and return pixels and checks.
// level/base: live energy and the clip's base energy (energy curves move
// parameters by the slope times level − base). Captured mid-beat so the
// kick envelope does not dominate a still.
export async function renderLook({
  sceneId,
  index = 0,
  snapshot = null,
  seed = null,
  frames = 60,
  level = 0.5,
  base = 0.5,
  width = 320,
  height = 180,
  capture = true,
  gray = false,
}) {
  const { engine, scenes, presetSnapshot } = window.__phosphorLab;
  const scene = scenes.find((s) => s.id === sceneId);
  const look = snapshot
    ? structuredClone(snapshot)
    : presetSnapshot(scene, index);
  if (seed !== null) look.seed = seed;
  if (engine.width !== width || engine.height !== height)
    engine.resize(width, height);
  engine.features = {
    energy: 0,
    low: 0,
    mid: 0,
    high: 0,
    onset: 0,
    flux: 0,
    hit: false,
    hitId: 0,
    active: false,
    locked: false,
  };
  engine.speed = 1;
  engine.view = { hue: 0, zoom: 1 };
  engine.flashHeld = false;
  engine.gesture = [0.5, 0.5, 0];
  engine.blackout = engine.blackoutTarget = 0;
  engine.options.flashLimit = false;
  engine.options.kaleido = 1;
  engine.beat = 0.5;
  engine.setLevel(level, 0);
  engine.updatePerformance(2, false); // A look starts outside any audio hand-back.
  engine.load(look, 0, { energy: base });
  // Programs compile in parallel (KHR_parallel_shader_compile); completion
  // only advances between tasks, so a synchronous warm loop would never end.
  if (!(await engine.ready(sceneId)))
    throw new Error(`${sceneId} failed to compile`);
  while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
  for (let i = 0; i < frames; i++) {
    engine.beat = 0.5 + Math.floor((i + 1) / 30); // stays mid-beat
    engine.advance(1 / 60, false);
  }
  engine.present();
  // The health mean (0–255) arrives through an asynchronous readback. Drain
  // any readback still in flight from earlier frames, then measure this one.
  const frame = () => new Promise((done) => requestAnimationFrame(done));
  for (let i = 0; i < 60 && engine.healthReadback.sync; i++) {
    await frame();
    engine.pollHealth();
  }
  engine.lastHealth.pending = true;
  let health = engine.health();
  for (let i = 0; i < 60 && health.pending; i++) {
    await frame();
    engine.pollHealth();
    health = engine.lastHealth;
  }
  // Brightest pixel of a 64×36 downsample (synchronous read; test only):
  // dim looks with thin bright lines are fine, an all-black frame is not.
  const gl = engine.gl;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, engine.healthTarget.fbo);
  gl.blitFramebuffer(
    0,
    0,
    engine.width,
    engine.height,
    0,
    0,
    64,
    36,
    gl.COLOR_BUFFER_BIT,
    gl.LINEAR,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, engine.healthTarget.fbo);
  const pixels = new Uint8Array(64 * 36 * 4);
  gl.readPixels(0, 0, 64, 36, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  let peak = 0;
  for (let i = 0; i < pixels.length; i += 4)
    peak = Math.max(peak, pixels[i], pixels[i + 1], pixels[i + 2]);
  const result = {
    peak,
    glError: engine.gl.getError(),
    nonFinite:
      engine.counters.nonFinite + (window.__harness?.nonFiniteUploads ?? 0),
    stats: engine.stats(),
    health: { ...health },
  };
  if (!capture) return result;
  const canvas = document.createElement("canvas");
  canvas.width = engine.canvas.width;
  canvas.height = engine.canvas.height;
  const context = canvas.getContext("2d");
  context.drawImage(engine.canvas, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  if (gray) {
    const d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      const y = Math.round(
        0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2],
      );
      d[i] = d[i + 1] = d[i + 2] = y;
    }
    context.putImageData(image, 0, 0);
  }
  return {
    ...result,
    png: canvas.toDataURL("image/png").split(",")[1],
    rgba: Array.from(image.data),
    width: canvas.width,
    height: canvas.height,
    snapshot: look,
  };
}

// Runs in the stage page.
export function readStage() {
  const stage = window.__phosphorStage;
  return {
    telemetry: stage.telemetry(),
    status: stage.show.status(performance.now() / 1000),
    blackout: stage.engine.blackout,
    blackoutTarget: stage.engine.blackoutTarget,
    scene: stage.engine.slots.at(-1)?.scene.id ?? null,
    level: stage.engine.level,
    frames: stage.engine.frameCount,
  };
}
