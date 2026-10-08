// Stage telemetry (D36): bounded sample buffers drained by the harness, and
// a per-minute rehearsal log the owner can export after a rig run.

// Fixed storage even when a live show never drains telemetry.
class Samples {
  constructor(size = 4096) {
    this.values = new Float64Array(size);
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

const quantile = (sorted, q) =>
  sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
    : null;

export class Telemetry {
  constructor() {
    this.frameIntervalsMs = new Samples();
    this.clipPrepMs = new Samples();
    this.blackoutLatencyFrames = new Samples();
    this.frames = 0;
    this.clipRequestedAt = null;
    this.blackoutRequestedFrame = null;
    this.minute = { intervals: [], start: null };
    this.log = [];
  }
  clipRequested(now) {
    this.clipRequestedAt = now;
  }
  blackoutRequested() {
    this.blackoutRequestedFrame = this.frames;
  }
  // Call after each presented frame.
  presented(now, interval, engine) {
    this.frames++;
    if (interval > 0) {
      this.frameIntervalsMs.push(interval);
      this.minute.intervals.push(interval);
    }
    if (
      this.clipRequestedAt !== null &&
      !engine.slots.at(-1)?.warmTicks &&
      (!engine.transition || engine.transition.elapsed > 0)
    ) {
      this.clipPrepMs.push(Math.max(0, now - this.clipRequestedAt));
      this.clipRequestedAt = null;
    }
    if (this.blackoutRequestedFrame !== null && engine.blackout >= 1 - 1e-6) {
      this.blackoutLatencyFrames.push(
        this.frames - this.blackoutRequestedFrame,
      );
      this.blackoutRequestedFrame = null;
    }
  }
  // Once a minute: one compact rehearsal-log row (8 h ≈ 480 rows).
  summarize(now, context, engine, heapBytes = null) {
    if (this.minute.start === null) this.minute.start = now;
    if (now - this.minute.start < 60000) return null;
    const sorted = this.minute.intervals.sort((a, b) => a - b);
    const row = {
      t: Math.round(now),
      frames: sorted.length,
      p50: quantile(sorted, 0.5),
      p95: quantile(sorted, 0.95),
      p99: quantile(sorted, 0.99),
      max: sorted.at(-1) ?? null,
      gpuErrors: engine.counters?.gpuErrors ?? null,
      nonFinite: engine.counters?.nonFinite ?? null,
      flashLimited: engine.counters?.flashLimited ?? null,
      heapMB: heapBytes === null ? null : Math.round(heapBytes / 1e5) / 10,
      ...context,
    };
    this.minute = { intervals: [], start: now };
    this.log.push(row);
    if (this.log.length > 1440) this.log.shift(); // 24 h
    return row;
  }
  drain(now, context, engine, heapBytes = null) {
    const stats = engine.stats();
    return {
      v: 2,
      now,
      ...context,
      frameIntervalsMs: this.frameIntervalsMs.drain(),
      clipPrepMs: this.clipPrepMs.drain(),
      blackoutLatencyFrames: this.blackoutLatencyFrames.drain(),
      gpuErrors: engine.counters?.gpuErrors ?? null,
      nonFinite: engine.counters?.nonFinite ?? null,
      flashLimited: engine.counters?.flashLimited ?? null,
      slots: stats.slots,
      textures: stats.textures,
      liveTextures: stats.liveTextures,
      droppedSamples: {
        frameIntervalsMs: this.frameIntervalsMs.dropped,
        clipPrepMs: this.clipPrepMs.dropped,
        blackoutLatencyFrames: this.blackoutLatencyFrames.dropped,
      },
      heapBytes,
    };
  }
}
