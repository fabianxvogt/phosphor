// Catalog thumbnails (D65): one small offscreen Engine renders one look at a
// time in idle slices, like the browser harness's renderLook (load, warm a
// simulation, ~60 frames). Results are cached as object URLs for the session.
// It yields whenever `busy()` (a transition on the stage or preview, or a
// hidden tab), never runs outside requestIdleCallback, and keeps at most one
// small batch of GPU work in flight (a fence must signal before the next), so
// it does not take time from the stage or the live preview.
const FRAMES = 60;
const STEP_MS = 4; // keep this much idle time in reserve before each step
const STEPS_PER_SLICE = 4;
const BUSY_RETRY_MS = 400;
const FENCE_RETRY_MS = 16;

export class Thumbnails {
  constructor({
    createEngine, // () => Engine (called lazily, once)
    width = 192,
    height = 108,
    busy = () => false,
    onReady = () => {},
    onError = () => {},
  }) {
    this.createEngine = createEngine;
    this.width = width;
    this.height = height;
    this.busy = busy;
    this.onReady = onReady;
    this.onError = onError;
    this.engine = undefined; // null once creation failed
    this.cache = new Map(); // id → { url } | { failed: true }
    this.queue = []; // [{ id, snapshot }]
    this.job = null;
    this.scheduled = false;
    this.fence = null;
    this.failedFamilies = new Set();
  }

  get(id) {
    return this.cache.get(id) ?? null;
  }

  // A card became visible: render its look (snapshot carries the palette).
  want(id, snapshot) {
    if (this.cache.has(id) || this.job?.id === id) return;
    if (this.queue.some((entry) => entry.id === id)) return;
    this.queue.push({ id, snapshot });
    this.#schedule();
  }

  // A card left the view before its turn.
  forget(id) {
    this.queue = this.queue.filter((entry) => entry.id !== id);
  }

  #schedule(delay = 0) {
    if (this.scheduled) return;
    this.scheduled = true;
    const idle = () => {
      if (globalThis.requestIdleCallback)
        requestIdleCallback((deadline) => {
          this.scheduled = false;
          this.#work(deadline);
        });
      else
        setTimeout(() => {
          this.scheduled = false;
          this.#work({ timeRemaining: () => 8 });
        }, 50);
    };
    if (delay) setTimeout(idle, delay);
    else idle();
  }

  #fail(id, message) {
    this.cache.set(id, { failed: true });
    if (message) this.onError(message);
    this.onReady(id);
  }

  #ensureEngine() {
    if (this.engine !== undefined) return this.engine;
    try {
      this.engine = this.createEngine();
      this.engine.resize(this.width, this.height);
      Object.assign(this.engine.options, { flashLimit: true, kaleido: 1 });
    } catch (error) {
      this.engine = null;
      this.onError(`Catalog thumbnails unavailable: ${error.message}`);
    }
    return this.engine;
  }

  #start(entry) {
    const engine = this.#ensureEngine();
    if (!engine || engine.lost) return this.#fail(entry.id);
    const scene = entry.snapshot.scene;
    if (this.failedFamilies.has(scene)) return this.#fail(entry.id);
    const job = { ...entry, phase: "compile", frame: 0 };
    this.job = job;
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
    engine.blackout = engine.blackoutTarget = 0;
    engine.beat = 0.5;
    engine.setLevel(0.5, 0);
    engine.updatePerformance(2, false);
    let loaded;
    try {
      loaded = engine.load(entry.snapshot, 0, { energy: 0.5 });
    } catch {
      loaded = false;
    }
    if (loaded === false) {
      this.job = null;
      this.failedFamilies.add(scene);
      return this.#fail(entry.id);
    }
    // Shaders compile in parallel; completion advances between tasks.
    engine.ready(scene).then((ok) => {
      if (this.job !== job) return;
      if (!ok) {
        this.job = null;
        this.failedFamilies.add(scene);
        this.#fail(entry.id);
      } else job.phase = "warm";
      this.#schedule();
    });
  }

  #step(job) {
    const engine = this.engine;
    if (job.phase === "warm") {
      if (engine.slots.at(-1)?.warmTicks > 0) engine.advance(0, true);
      else job.phase = "frames";
      return;
    }
    if (job.phase === "frames") {
      engine.beat = 0.5 + Math.floor((job.frame + 1) / 30); // mid-beat still
      engine.advance(1 / 60, false);
      if (++job.frame >= FRAMES) job.phase = "capture";
      return;
    }
    if (job.phase === "capture") {
      engine.present();
      const canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      canvas.getContext("2d").drawImage(engine.canvas, 0, 0);
      job.phase = "encode";
      this.job = null;
      canvas.toBlob(
        (blob) => {
          if (blob) this.cache.set(job.id, { url: URL.createObjectURL(blob) });
          else this.cache.set(job.id, { failed: true });
          this.onReady(job.id);
        },
        "image/webp",
        0.85,
      );
    }
  }

  // The last batch's GPU work has finished (sync status updates between tasks
  // only, so this never blocks).
  #gpuIdle() {
    const gl = this.engine?.gl;
    if (!this.fence || !gl) return true;
    if (gl.isContextLost()) {
      this.fence = null;
      return true;
    }
    if (gl.getSyncParameter(this.fence, gl.SYNC_STATUS) !== gl.SIGNALED)
      return false;
    gl.deleteSync(this.fence);
    this.fence = null;
    return true;
  }

  #work(deadline) {
    if (this.busy()) {
      if (this.job || this.queue.length) this.#schedule(BUSY_RETRY_MS);
      return;
    }
    if (!this.#gpuIdle()) {
      this.#schedule(FENCE_RETRY_MS);
      return;
    }
    let steps = 0;
    try {
      while (deadline.timeRemaining() > STEP_MS && steps < STEPS_PER_SLICE) {
        if (!this.job) {
          const entry = this.queue.shift();
          if (!entry) break;
          this.#start(entry);
          continue;
        }
        if (this.job.phase === "compile") return; // ready() reschedules
        this.#step(this.job);
        steps++;
      }
      const gl = this.engine?.gl;
      if (steps && gl && !this.fence) {
        this.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
      }
    } catch (error) {
      const id = this.job?.id;
      this.job = null;
      if (id) this.#fail(id, `Thumbnail: ${error.message}`);
    }
    if (this.job || this.queue.length) this.#schedule();
  }
}
