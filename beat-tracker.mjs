// Causal beat tracker for 4/4 club music (decisions D21–D24).
// Pure DSP with no Web Audio dependency, so it runs in an AudioWorklet,
// in the page, or in Node tests. Feed mono samples; read tempo and phase.
//
// Pipeline: two band filters (kick body, hats/claps) → per-hop log-energy
// flux as an onset function → periodically, a harmonic autocorrelation
// picks the tempo inside [minBpm, maxBpm) (half/double tempos fold in) →
// a phase-locked loop follows the beat and coasts through breakdowns.
// Times are in seconds of the input stream (sample index / sampleRate).

const HOP_SECONDS = 0.01;
const HISTORY_SECONDS = 8;
const TEMPO_WINDOW_SECONDS = 5; // recent onsets dominate after a tempo change
const ESTIMATE_EVERY = 25; // hops between tempo estimates (~0.25 s)
// A beat onset must at least double the band energy (log flux ≥ ln 2 ≈ 0.7
// would be strict; 0.5 leaves room for compressed mixes). Steady noise
// produces flux around 0.1, so it can never lock.
const MIN_ONSET = 0.5;
// Normalised harmonic autocorrelation needed to trust a tempo estimate.
const MIN_PERIODICITY = 0.12;

class Biquad {
  constructor(type, frequency, sampleRate, q = Math.SQRT1_2) {
    const w = (2 * Math.PI * frequency) / sampleRate;
    const cos = Math.cos(w),
      alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    if (type === "lowpass") {
      this.b0 = (1 - cos) / 2 / a0;
      this.b1 = (1 - cos) / a0;
      this.b2 = this.b0;
    } else {
      this.b0 = (1 + cos) / 2 / a0;
      this.b1 = -(1 + cos) / a0;
      this.b2 = this.b0;
    }
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  step(x) {
    const y =
      this.b0 * x +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

export class BeatTracker {
  constructor({ sampleRate = 48000, minBpm = 100, maxBpm = 150 } = {}) {
    if (!(minBpm > 0 && maxBpm > minBpm && maxBpm <= minBpm * 2))
      throw new Error("Tempo range must span at most one octave");
    this.sampleRate = sampleRate;
    this.minBpm = minBpm;
    this.maxBpm = maxBpm;
    this.hop = Math.max(1, Math.round(sampleRate * HOP_SECONDS));
    this.rate = sampleRate / this.hop; // onset frames per second
    this.low = [
      new Biquad("lowpass", 150, sampleRate),
      new Biquad("lowpass", 150, sampleRate),
    ];
    this.high = [
      new Biquad("highpass", 3000, sampleRate),
      new Biquad("highpass", 3000, sampleRate),
    ];
    this.size = Math.round(HISTORY_SECONDS * this.rate);
    this.odf = new Float32Array(this.size);
    this.frame = 0; // completed onset frames
    this.accLow = this.accHigh = 0;
    this.inHop = 0;
    this.prevLow = this.prevHigh = null;
    this.level = 0; // slow loudness follower (linear RMS)
    this.period = 0; // frames per beat, 0 until a tempo is found
    this.nextBeat = 0; // predicted frame of the next beat
    this.beats = 0; // beats passed since lock (monotonic)
    this.window = null; // { best, at } search around nextBeat
    this.hits = [];
    this.periodicity = 0;
    this.pending = null; // candidate tempo awaiting confirmation
  }

  // Feed any number of mono samples.
  process(samples) {
    for (let i = 0; i < samples.length; i++) {
      const x = samples[i];
      if (!Number.isFinite(x)) continue;
      const l = this.low[1].step(this.low[0].step(x));
      const h = this.high[1].step(this.high[0].step(x));
      this.accLow += l * l;
      this.accHigh += h * h;
      if (++this.inHop === this.hop) this.#endHop();
    }
  }

  #endHop() {
    const eLow = this.accLow / this.hop,
      eHigh = this.accHigh / this.hop;
    this.accLow = this.accHigh = 0;
    this.inHop = 0;
    const floor = 1e-7;
    const lLow = Math.log(eLow + floor),
      lHigh = Math.log(eHigh + floor);
    let value = 0;
    if (this.prevLow !== null) {
      value =
        Math.max(0, lLow - this.prevLow) +
        0.3 * Math.max(0, lHigh - this.prevHigh);
    }
    this.prevLow = lLow;
    this.prevHigh = lHigh;
    this.level = 0.995 * this.level + 0.005 * Math.sqrt(eLow + eHigh);
    // Gate onsets far below the running loudness: silence must not lock.
    if (Math.sqrt(eLow + eHigh) < 1e-4) value = 0;
    const t = this.frame++;
    this.odf[t % this.size] = value;
    this.#trackPhase(t, value);
    if (t > 0 && t % ESTIMATE_EVERY === 0 && t >= 3 * this.rate)
      this.#estimateTempo(t);
  }

  #odfAt(t) {
    return t < 0 || t >= this.frame || t < this.frame - this.size
      ? 0
      : this.odf[t % this.size];
  }

  #estimateTempo(now) {
    const n = Math.min(
      this.frame,
      Math.round(TEMPO_WINDOW_SECONDS * this.rate),
    );
    const start = this.frame - n;
    let mean = 0;
    for (let t = start; t < this.frame; t++) mean += this.#odfAt(t);
    mean /= n;
    let variance = 0;
    for (let t = start; t < this.frame; t++)
      variance += (this.#odfAt(t) - mean) ** 2;
    variance /= n;
    if (!(variance > 0)) return;
    const minLag = Math.floor(((60 * this.rate) / this.maxBpm) * 0.5) - 1;
    const maxLag = Math.ceil(((60 * this.rate) / this.minBpm) * 4) + 2;
    if (maxLag >= n / 2) return;
    const acf = new Float64Array(maxLag + 2);
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
      let sum = 0;
      for (let t = start + lag; t < this.frame; t++)
        sum += (this.#odfAt(t) - mean) * (this.#odfAt(t - lag) - mean);
      acf[lag] = sum / (n - lag);
    }
    const at = (lag) => {
      const i = Math.floor(lag),
        f = lag - i;
      return acf[i] * (1 - f) + acf[i + 1] * f;
    };
    let best = -Infinity,
      bestBpm = 0;
    for (let bpm = this.minBpm; bpm < this.maxBpm; bpm += 0.05) {
      const lag = (60 * this.rate) / bpm;
      const score =
        at(lag) + 0.5 * at(2 * lag) + 0.25 * at(4 * lag) + 0.25 * at(lag / 2);
      if (score > best) {
        best = score;
        bestBpm = bpm;
      }
    }
    // Harmonic weights sum to 2; a perfectly periodic onset train scores ~1.
    this.periodicity = best / (2 * variance);
    if (!(best > 0) || this.periodicity < MIN_PERIODICITY) return;
    const period = (60 * this.rate) / bestBpm;
    // Only beat-strength onsets may set or move the grid. In a breakdown
    // (pads, noise) the grid is held rather than chasing weak periodicity.
    const recent = Math.round(2 * this.rate);
    const gate = Math.max(MIN_ONSET, 0.5 * this.#typicalPeak());
    let strong = 0;
    for (let t = this.frame - recent; t < this.frame; t++)
      if (this.#odfAt(t) > gate) strong++;
    if (strong < (2 * bestBpm) / 60 / 2) {
      this.pending = null;
      return;
    }
    if (!this.period) {
      this.#acquire(period, now, false);
      return;
    }
    // Require two consecutive agreeing estimates before a tempo jump.
    if (Math.abs(period - this.period) / this.period > 0.012) {
      if (this.pending && Math.abs(this.pending - period) / period < 0.01) {
        this.pending = null;
        // Two agreeing estimates on beat-strength onsets: keep the lock.
        this.#acquire(period, now, !!this.confirmed);
      } else this.pending = period;
    } else this.pending = null; // fine tempo is the phase loop's job
  }

  // Place the beat grid at the offset that best explains recent onsets.
  #acquire(period, now, keepLock) {
    const span = Math.min(this.frame, Math.round(4 * this.rate));
    let bestOffset = 0,
      bestScore = -Infinity;
    const steps = Math.ceil(period * 4);
    for (let s = 0; s < steps; s++) {
      const offset = (s / steps) * period;
      let score = 0;
      for (let k = 0; k * period + offset < span; k++) {
        const pos = now - offset - k * period;
        const i = Math.floor(pos),
          f = pos - i;
        score += this.#odfAt(i) * (1 - f) + this.#odfAt(i + 1) * f;
      }
      if (score > bestScore) {
        bestScore = score;
        bestOffset = offset;
      }
    }
    const lastBeat = now - bestOffset;
    this.period = period;
    this.nextBeat = lastBeat + period;
    while (this.nextBeat - 0.25 * period <= now) this.nextBeat += period;
    this.window = null;
    this.hits = [];
    this.confirmed = keepLock;
  }

  #trackPhase(t, value) {
    if (!this.period) return;
    const P = this.period,
      reach = 0.2 * P;
    if (t >= this.nextBeat - reach && t <= this.nextBeat + reach) {
      if (!this.window) this.window = { best: 0, at: -1, prev: 0, next: 0 };
      const w = this.window;
      if (value > w.best) {
        w.best = value;
        w.at = t;
        w.prev = this.#odfAt(t - 1);
        w.next = 0;
      } else if (t === w.at + 1) w.next = value;
    }
    if (t > this.nextBeat + reach) {
      const w = this.window;
      const typical = this.#typicalPeak();
      const strong = w && w.best > Math.max(MIN_ONSET, 0.3 * typical);
      if (strong) {
        // Parabolic interpolation around the peak frame.
        const d = w.prev - 2 * w.best + w.next;
        const delta = d < 0 ? (0.5 * (w.prev - w.next)) / d : 0;
        const error =
          w.at + Math.max(-0.5, Math.min(0.5, delta)) - this.nextBeat;
        // Weak onsets (hats in half-time material) correct less.
        const weight = typical > 0 ? Math.min(1, w.best / typical) : 1;
        this.nextBeat += P + 0.35 * weight * error;
        this.period = Math.max(
          (60 * this.rate) / this.maxBpm,
          Math.min((60 * this.rate) / this.minBpm, P + 0.05 * weight * error),
        );
      } else this.nextBeat += P; // coast: keep tempo and phase
      this.hits.push(strong ? 1 : 0);
      if (this.hits.length > 8) this.hits.shift();
      this.beats++;
      this.window = null;
      if (strong && w.best > 0.6 * typical)
        this.peaks = 0.9 * (this.peaks ?? w.best) + 0.1 * w.best;
      else if (!this.peaks && w && w.best > MIN_ONSET) this.peaks = w.best;
      const recent = this.hits.reduce((a, b) => a + b, 0);
      if (
        (this.hits.length >= 8 && recent >= 6) ||
        (this.hits.length >= 4 && this.hits.slice(-4).every((hit) => hit))
      )
        this.confirmed = true;
    }
  }

  #typicalPeak() {
    return this.peaks ?? 0;
  }

  // Current estimate at the end of the samples fed so far.
  state() {
    const now = this.frame;
    const hitRatio = this.hits.length
      ? this.hits.reduce((a, b) => a + b, 0) / this.hits.length
      : 0;
    if (!this.period)
      return {
        bpm: null,
        phase: 0,
        beats: 0,
        nextBeatTime: null,
        confidence: 0,
        locked: false,
        coasting: false,
      };
    const phase = 1 - (this.nextBeat - now) / this.period;
    const confidence = Math.max(
      0,
      Math.min(1, hitRatio * Math.min(1, this.periodicity / 0.3)),
    );
    // Coasting: a confirmed grid with no onsets on the last four beats
    // (a breakdown). Tempo and phase are held, not dropped.
    const coasting =
      !!this.confirmed &&
      this.hits.length >= 4 &&
      this.hits.slice(-4).every((hit) => hit === 0);
    return {
      bpm: (60 * this.rate) / this.period,
      phase: ((phase % 1) + 1) % 1,
      beats: this.beats,
      // Beat onset time in seconds of the input stream. The attack lands
      // inside its hop and the band filters add a few ms of delay; on
      // synthetic kicks these cancel to within ±2 ms at the frame index.
      nextBeatTime: this.nextBeat / this.rate,
      confidence,
      locked: !!this.confirmed,
      coasting,
    };
  }
}
