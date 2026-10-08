// Fixed storage even when a live show never drains telemetry.
class Samples {
  constructor() {
    this.values = new Float64Array(4096);
    this.count = 0;
    this.next = 0;
    this.dropped = 0;
  }
  push(value) {
    this.values[this.next] = value;
    this.next = (this.next + 1) % this.values.length;
    if (this.count < this.values.length) this.count++;
    else this.dropped++;
  }
  drain() {
    const result = new Array(this.count);
    const start =
      (this.next - this.count + this.values.length) % this.values.length;
    for (let i = 0; i < this.count; i++)
      result[i] = this.values[(start + i) % this.values.length];
    this.count = 0;
    this.next = 0;
    return result;
  }
}

export class Telemetry {
  constructor() {
    this.frameIntervalsMs = new Samples();
    this.cuePrepMs = new Samples();
    this.blackoutLatencyFrames = new Samples();
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
      frameIntervalsMs: this.frameIntervalsMs.drain(),
      gpuErrors: engine.counters?.gpuErrors ?? null,
      nonFinite: engine.counters?.nonFinite ?? null,
      flashLimited: engine.counters?.flashLimited ?? null,
      slots: stats.slots,
      textures: stats.textures,
      cuePrepMs: this.cuePrepMs.drain(),
      blackoutLatencyFrames: this.blackoutLatencyFrames.drain(),
      droppedSamples: {
        frameIntervalsMs: this.frameIntervalsMs.dropped,
        cuePrepMs: this.cuePrepMs.dropped,
        blackoutLatencyFrames: this.blackoutLatencyFrames.dropped,
      },
      heapBytes,
      playing: transport.playing,
      currentCue: transport.currentCue,
    };
    return result;
  }
}
