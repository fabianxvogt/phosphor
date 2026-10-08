// Deterministic synthetic club audio for beat-tracker tests: four-on-the-
// floor kicks, off-beat hats and bass, optional breakdowns, with ground-truth
// beat times. Not music; enough structure to exercise tempo and phase.

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// segments: [{ beats, bpm, kick = true, hats = true, bass = false }]
export function synth({
  segments,
  sampleRate = 48000,
  start = 0.37,
  noise = 0.01,
  seed = 7,
}) {
  const random = rng(seed);
  const truth = [];
  let time = start;
  for (const seg of segments) {
    const period = 60 / seg.bpm;
    for (let b = 0; b < seg.beats; b++) {
      truth.push({ time, period, ...seg });
      time += period;
    }
  }
  const seconds = time + 1;
  const samples = new Float32Array(Math.ceil(seconds * sampleRate));
  for (let i = 0; i < samples.length; i++)
    samples[i] = noise * (random() * 2 - 1);
  const add = (at, length, fn) => {
    const first = Math.round(at * sampleRate);
    const count = Math.round(length * sampleRate);
    for (let i = 0; i < count && first + i < samples.length; i++)
      samples[first + i] += fn(i / sampleRate);
  };
  for (const beat of truth) {
    if (beat.kick !== false) {
      let phase = 0;
      add(beat.time, 0.35, (t) => {
        phase += (2 * Math.PI * (45 + 110 * Math.exp(-t / 0.03))) / sampleRate;
        return 0.9 * Math.exp(-t / 0.18) * Math.sin(phase);
      });
    }
    const off = beat.time + beat.period / 2;
    if (beat.hats !== false)
      add(off, 0.06, (t) => 0.25 * Math.exp(-t / 0.015) * (random() * 2 - 1));
    if (beat.bass)
      add(
        off,
        beat.period * 0.4,
        (t) =>
          0.35 *
          Math.min(1, t / 0.01) *
          Math.exp(-t / 0.12) *
          Math.sin(2 * Math.PI * 55 * t),
      );
    if (beat.pad)
      add(
        beat.time,
        beat.period,
        (t) =>
          0.08 *
          (Math.sin(2 * Math.PI * 220 * (beat.time + t)) +
            Math.sin(2 * Math.PI * 277.2 * (beat.time + t)) +
            Math.sin(2 * Math.PI * 329.6 * (beat.time + t))),
      );
  }
  return { samples, sampleRate, truth };
}

// Run a tracker over the audio in AudioWorklet-sized blocks and, just
// before each true beat, record the predicted beat time and tempo.
export function run(tracker, { samples, sampleRate, truth }, block = 128) {
  const results = [];
  let next = 0,
    position = 0;
  while (position < samples.length) {
    const end = Math.min(samples.length, position + block);
    tracker.process(samples.subarray(position, end));
    position = end;
    const now = position / sampleRate;
    while (next < truth.length && now >= truth[next].time - 0.05) {
      const state = tracker.state();
      const beat = truth[next];
      let error = null;
      if (state.nextBeatTime !== null) {
        // The predicted beat nearest to the true one, allowing for the
        // tracker having already passed or not yet reached it.
        const p = 60 / state.bpm;
        const k = Math.round((beat.time - state.nextBeatTime) / p);
        error = state.nextBeatTime + k * p - beat.time;
      }
      results.push({ beat: next, truth: beat, state, error });
      next++;
    }
  }
  return results;
}

// The octave of `truth` nearest to `bpm` (half/double tempos are equivalent).
export function folded(truth, bpm) {
  let value = truth;
  while (value * 2 <= bpm * 1.5) value *= 2;
  while (value >= bpm * 1.5) value /= 2;
  return value;
}

// First beat index from which tempo and phase stay within tolerance.
export function lockedFrom(results, { from = 0, bpm = 0.5, ms = 20 } = {}) {
  let lock = null;
  for (let i = from; i < results.length; i++) {
    const r = results[i];
    const ok =
      r.state.locked &&
      r.error !== null &&
      Math.abs(r.error) * 1000 < ms &&
      Math.abs(r.state.bpm - folded(60 / r.truth.period, r.state.bpm)) < bpm;
    if (ok && lock === null) lock = i;
    if (!ok) lock = null;
  }
  return lock;
}
