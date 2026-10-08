export class Telemetry {
  constructor() {
    this.frameIntervalsMs = [];
    this.cuePrepMs = [];
    this.blackoutLatencyFrames = [];
    this.frames = 0;
    this.cueRequestedAt = null;
    this.blackoutRequestedFrame = null;
  }
  cueRequested(now) {
    this.cueRequestedAt = now;
  }
  blackoutRequested() {
    this.blackoutRequestedFrame = this.frames;
  }
  blackoutCancelled() {
    this.blackoutRequestedFrame = null;
  }
  presented(now, interval, engine) {
    this.frames++;
    if (interval > 0) this.frameIntervalsMs.push(interval);
    if (
      this.cueRequestedAt !== null &&
      !engine.slots.at(-1)?.warmTicks &&
      (!engine.transition || engine.transition.elapsed > 0)
    ) {
      this.cuePrepMs.push(Math.max(0, now - this.cueRequestedAt));
      this.cueRequestedAt = null;
    }
    if (this.blackoutRequestedFrame !== null && engine.blackout >= 1 - 1e-6) {
      this.blackoutLatencyFrames.push(
        this.frames - this.blackoutRequestedFrame,
      );
      this.blackoutRequestedFrame = null;
    }
  }
  drain(now, session, transport, governor, engine, heapBytes = null) {
    const stats = engine.stats();
    const result = {
      v: 1,
      now,
      quality: session.options.quality,
      refreshHz: 1000 / governor.refreshMs,
      governorDowngrades: governor.downgrades,
      frameIntervalsMs: this.frameIntervalsMs,
      gpuErrors: engine.counters?.gpuErrors ?? null,
      nonFinite: engine.counters?.nonFinite ?? null,
      flashLimited: engine.counters?.flashLimited ?? null,
      slots: stats.slots,
      textures: stats.textures,
      cuePrepMs: this.cuePrepMs,
      blackoutLatencyFrames: this.blackoutLatencyFrames,
      heapBytes,
      playing: transport.playing,
      currentCue: transport.currentCue,
    };
    this.frameIntervalsMs = [];
    this.cuePrepMs = [];
    this.blackoutLatencyFrames = [];
    return result;
  }
}
