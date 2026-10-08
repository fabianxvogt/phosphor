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
    }
  }
}

export function attachFallback() {
  const native = typeof window.__phosphor.telemetry === "function";
  const app = window.__phosphor,
    state = window.__harness,
    engine = app.engine;
  const load = engine.load;
  if (!native)
    engine.load = function (...args) {
      state.preparingAt = performance.now();
      return load.apply(this, args);
    };
  function sample(now) {
    if (!native && state.previousFrame !== null) {
      state.frameIntervalsMs.push(now - state.previousFrame);
      if (state.frameIntervalsMs.length > 10000)
        state.frameIntervalsMs.splice(0, 5000);
    }
    state.previousFrame = now;
    const slots = engine.slots.length;
    if (state.previousSlots > 1 && slots === 1) {
      const stats = engine.stats();
      state.settled.push({ slots, textures: stats.textures });
    }
    state.previousSlots = slots;
    if (state.preparingAt != null && engine.transition?.elapsed > 0) {
      state.cuePrepMs.push(now - state.preparingAt);
      state.preparingAt = null;
    }
    const quality = document.getElementById("qualityInput").value;
    const rank = { low: 0, balanced: 1, high: 2 };
    if (state.previousQuality && rank[quality] < rank[state.previousQuality])
      state.governorDowngrades++;
    state.previousQuality = quality;
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
  return native
    ? "contract-5"
    : "fallback: own rAF callbacks (not presentation), sampled gl.getError, observed uniform uploads";
}

export function readTelemetry() {
  const app = window.__phosphor,
    state = window.__harness;
  const settled = state.settled.splice(0);
  if (typeof app.telemetry === "function")
    return { source: "contract-5", ...app.telemetry(), settled };
  const error = app.engine.gl.getError();
  if (error) state.gpuErrors++;
  const stats = app.engine.stats();
  return {
    source: "fallback",
    v: 1,
    now: performance.now(),
    quality: app.getSession().options.quality,
    refreshHz: null,
    governorDowngrades: state.governorDowngrades,
    frameIntervalsMs: state.frameIntervalsMs.splice(0),
    gpuErrors: app.engine.counters?.gpuErrors ?? state.gpuErrors,
    nonFinite: app.engine.counters?.nonFinite ?? state.nonFiniteUploads,
    flashLimited: app.engine.counters?.flashLimited ?? null,
    slots: stats.slots,
    textures: stats.textures,
    cuePrepMs: state.cuePrepMs.splice(0),
    blackoutLatencyFrames: [],
    heapBytes: performance.memory?.usedJSHeapSize ?? null,
    playing: /Pause score/.test(
      document.getElementById("playSetButton").textContent,
    ),
    currentCue:
      document.querySelector(".cue-row.current")?.querySelector("input")
        ?.value ?? null,
    settled,
    lastGlError: error,
  };
}

export async function renderPreset({
  sceneId,
  index,
  seed,
  frames = 120,
  capture = true,
}) {
  const app = window.__phosphor;
  const { presetSnapshot } = await import("/session.mjs");
  const scene = app.scenes.find((scene) => scene.id === sceneId);
  const snapshot = presetSnapshot(scene, index);
  snapshot.seed = seed;
  const engine = app.engine;
  engine.mappings = [];
  engine.features = { energy: 0, bass: 0, mid: 0, high: 0, onset: 0 };
  engine.blackout = engine.blackoutTarget = 0;
  engine.load(snapshot, 0);
  while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
  for (let i = 0; i < frames; i++) engine.advance(1 / 60, false);
  engine.present();
  if (!capture) {
    const health = engine.health();
    return {
      mean: health.mean,
      glError: engine.gl.getError(),
      nonFinite:
        engine.counters?.nonFinite ?? window.__harness.nonFiniteUploads,
      stats: engine.stats(),
    };
  }
  const canvas = document.createElement("canvas");
  canvas.width = engine.canvas.width;
  canvas.height = engine.canvas.height;
  const context = canvas.getContext("2d");
  context.drawImage(engine.canvas, 0, 0);
  const rgba = Array.from(
    context.getImageData(0, 0, canvas.width, canvas.height).data,
  );
  return {
    png: canvas.toDataURL("image/png").split(",")[1],
    rgba,
    width: canvas.width,
    height: canvas.height,
    glError: engine.gl.getError(),
    nonFinite: engine.counters?.nonFinite ?? window.__harness.nonFiniteUploads,
    stats: engine.stats(),
    snapshot,
  };
}
