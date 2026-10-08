// Show clock (decisions D22, D24): one monotonic beat position for the
// whole show. In auto mode it steers toward the beat tracker; in manual
// mode tap tempo drives it. Downbeat marks bar starts; nudge shifts phase
// (manual) or the latency offset (auto). Times are seconds on one timeline
// (the output window's performance clock); beats never run backwards.

const MIN_BPM = 40;
const MAX_BPM = 200;
const SLEW = 0.15; // steering may change the beat rate by at most ±15 %
const SNAP = 0.25; // phase errors above a quarter beat snap forward
const TAP_RESET = 2; // seconds without a tap start a new tap sequence

const clampBpm = (bpm) => Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
const mod = (x, n) => ((x % n) + n) % n;

export class ShowClock {
  constructor({ bpm = 120, mode = "auto", latencyMs = 0, now = 0 } = {}) {
    this.mode = mode;
    this.latencyMs = latencyMs;
    this.base = 60 / clampBpm(bpm); // target seconds per beat
    this.period = this.base; // current (steered) seconds per beat
    this.anchorTime = now;
    this.anchorBeat = 0;
    this.barOffset = 0;
    this.taps = [];
    this.source = mode === "auto" ? "coast" : "manual";
    this.last = now;
    this.tracker = null;
  }

  beatAt(t) {
    return (
      this.anchorBeat +
      (Math.max(t, this.anchorTime) - this.anchorTime) / this.period
    );
  }

  #rebase(t) {
    t = Math.max(t, this.last);
    this.anchorBeat = this.beatAt(t);
    this.anchorTime = t;
    this.last = t;
  }

  // Steer so that time `target` lands on an integer beat while the beat
  // rate approaches `base`. Never moves the beat backwards.
  #steer(t, target, base) {
    this.#rebase(t);
    this.base = base;
    const b = this.anchorBeat;
    let at = b + (target - t) / base; // beat value `target` would get
    const error = at - Math.round(at);
    if (Math.abs(error) > SNAP) {
      // Snap forward to the next alignment (monotonic jump).
      const jump = mod(-error, 1);
      this.anchorBeat += jump;
      this.period = base;
      return;
    }
    let k = Math.round(at);
    let when = target;
    if (k - b < 0.05) {
      k += 1;
      when += base;
    }
    const wanted = (when - t) / (k - b);
    this.period = Math.max(
      base * (1 - SLEW),
      Math.min(base * (1 + SLEW), wanted),
    );
  }

  // Beat tracker state, with nextBeatTime already on this clock's timeline.
  track(t, state) {
    this.tracker = state;
    if (this.mode !== "auto") return;
    if (
      !state?.locked ||
      !Number.isFinite(state.nextBeatTime) ||
      !(state.bpm > 0)
    ) {
      this.source = "coast";
      return;
    }
    this.source = state.coasting ? "coast" : "auto";
    this.#steer(
      t,
      state.nextBeatTime + this.latencyMs / 1000,
      60 / clampBpm(state.bpm),
    );
  }

  // Space: tap tempo. Switches to manual; the tap is a beat.
  tap(t) {
    if (this.taps.length && t - this.taps.at(-1) > TAP_RESET) this.taps = [];
    this.taps.push(t);
    if (this.taps.length > 8) this.taps.shift();
    this.mode = "manual";
    this.source = "manual";
    let base = this.base;
    if (this.taps.length >= 2) {
      const n = this.taps.length;
      base = 60 / clampBpm(60 / ((this.taps[n - 1] - this.taps[0]) / (n - 1)));
    }
    this.#steer(t, t, base);
  }

  setManualBpm(t, bpm) {
    this.mode = "manual";
    this.source = "manual";
    this.#rebase(t);
    this.base = this.period = 60 / clampBpm(bpm);
  }

  resumeAuto(t) {
    this.#rebase(t);
    this.mode = "auto";
    this.source = this.tracker?.locked ? "auto" : "coast";
    this.taps = [];
  }

  // Enter: the beat nearest to now is beat 1 of a bar.
  downbeat(t) {
    this.barOffset = mod(Math.round(this.beatAt(Math.max(t, this.last))), 4);
  }

  // ←/→: 10 ms per press. Auto mode adjusts the latency offset (projector
  // and LED processing delay); manual mode shifts the phase.
  nudge(t, direction) {
    const ms = 10 * Math.sign(direction);
    if (this.mode === "auto") {
      this.latencyMs = Math.max(-250, Math.min(250, this.latencyMs + ms));
      return;
    }
    this.#rebase(t);
    if (ms > 0) this.anchorBeat += ms / 1000 / this.period;
    else
      this.period = Math.min(this.base * (1 + SLEW), this.period - ms / 1000);
  }

  at(t) {
    t = Math.max(t, this.last);
    // Manual steering relaxes back to the target tempo after one beat.
    if (
      this.mode === "manual" &&
      this.period !== this.base &&
      t - this.anchorTime > this.period
    ) {
      this.#rebase(t);
      this.period = this.base;
    }
    const beat = this.beatAt(t);
    const inBar = beat - this.barOffset;
    return {
      beat,
      bpm: 60 / this.base,
      phase: mod(beat, 1),
      bar: Math.floor(inBar / 4),
      beatInBar: mod(inBar, 4),
      mode: this.mode,
      source: this.source,
      latencyMs: this.latencyMs,
    };
  }
}
