const colours = ["primary", "secondary", "accent"];
const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const hex = (value) => value.toString(16).padStart(2, "0");

// Every possible rounded RGB colour is prepared once. Frames only select an
// existing string; even palette interpolation creates no transient strings.
function paletteRamp(a, b) {
  const from = colours.map((key) => rgb(a[key]));
  const to = colours.map((key) => rgb(b[key]));
  const boundaries = new Set([0, 1]);
  for (let c = 0; c < 3; c++)
    for (let channel = 0; channel < 3; channel++) {
      const x = from[c][channel],
        y = to[c][channel];
      for (let v = Math.min(x, y); v < Math.max(x, y); v++)
        boundaries.add((v + 0.5 - x) / (y - x));
    }
  const beats = [...boundaries].sort((x, y) => x - y);
  const at = (t) =>
    colours.map(
      (key, c) =>
        "#" +
        from[c]
          .map((v, channel) => hex(Math.round(v + (to[c][channel] - v) * t)))
          .join(""),
    );
  const palettes = beats.map((boundary, index) =>
    at(index === beats.length - 1 ? 1 : (boundary + beats[index + 1]) / 2),
  );
  const exact = beats.map(at);
  return { beats, palettes, exact };
}

export function keyframePlayer(cue) {
  const points = [{ beat: 0, snapshot: cue.snapshot }, ...cue.keyframes]
    .sort((a, b) => a.beat - b.beat)
    .filter((p, i, all) => i === all.length - 1 || p.beat !== all[i + 1].beat);
  const keys = Object.keys(cue.snapshot.params);
  const result = structuredClone(cue.snapshot);
  const ramps = points
    .slice(1)
    .map((p, i) => paletteRamp(points[i].snapshot.palette, p.snapshot.palette));
  return {
    sample(offset) {
      offset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
      let index = 0;
      while (index + 1 < points.length && points[index + 1].beat <= offset)
        index++;
      const a = points[index],
        b = points[index + 1];
      const t = b
        ? Math.max(0, Math.min(1, (offset - a.beat) / (b.beat - a.beat)))
        : 0;
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        result.params[key] = b
          ? a.snapshot.params[key] +
            (b.snapshot.params[key] - a.snapshot.params[key]) * t
          : a.snapshot.params[key];
      }
      if (!b || t === 0) {
        for (let c = 0; c < 3; c++)
          result.palette[colours[c]] = a.snapshot.palette[colours[c]];
      } else {
        const ramp = ramps[index];
        let lo = 0,
          hi = ramp.beats.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (ramp.beats[mid] <= t) lo = mid;
          else hi = mid - 1;
        }
        const palette =
          ramp.beats[lo] === t ? ramp.exact[lo] : ramp.palettes[lo];
        for (let c = 0; c < 3; c++) result.palette[colours[c]] = palette[c];
      }
      return result;
    },
  };
}

export class Transport {
  constructor() {
    this.beat = 0;
    this.paused = false;
    this.playing = false;
    this.currentCue = -1;
    this.selectedCue = 0;
    this.cueStart = this.cueEnd = this.remainingBeats = 0;
    this.pendingCue = null;
    this.recent = [];
    this.midiAt = null;
    this.midiBeat = this.midiOffset = 0;
    this.midiTempo = 92;
    this.player = null;
  }
  manual() {
    const changed = this.playing || this.currentCue >= 0 || this.pendingCue;
    this.playing = false;
    this.currentCue = -1;
    this.pendingCue = null;
    this.remainingBeats = 0;
    this.player = null;
    return Boolean(changed);
  }
  tempo(now, manual, clock) {
    return clock && this.midiAt !== null && now - this.midiAt < 1500
      ? this.midiTempo
      : manual;
  }
  pause(now) {
    this.paused = !this.paused;
    if (!this.paused && this.midiAt !== null)
      this.midiOffset =
        this.beat -
        this.midiBeat -
        ((now - this.midiAt) * this.midiTempo) / 60000;
  }
  enter(cues, index, start = this.beat) {
    this.currentCue = this.selectedCue = index;
    const cue = cues[index];
    this.recent.push(cue.id);
    if (this.recent.length > 4) this.recent.shift();
    this.cueStart = start;
    this.cueEnd = start + cue.bars * 4;
    this.remainingBeats = Math.max(0, this.cueEnd - this.beat);
    this.pendingCue = null;
    this.player = cue.keyframes.length ? keyframePlayer(cue) : null;
    return index;
  }
  queue(cues, index, quantize) {
    const beat = quantize ? Math.ceil((this.beat + 0.001) / 4) * 4 : this.beat;
    this.pendingCue = { index, beat };
    return beat <= this.beat ? this.enter(cues, index) : null;
  }
  director(cues, energy) {
    let best = 0,
      score = Infinity;
    for (let i = 0; i < cues.length; i++) {
      if (i === this.currentCue && cues.length > 1) continue;
      const cue = cues[i];
      const value =
        Math.abs((cue.energy ?? 0.5) - energy) +
        (this.recent.includes(cue.id) ? 0.35 : 0) +
        Math.abs(Math.sin(this.beat * 0.13 + i * 2.7)) * 0.12;
      if (value < score) {
        best = i;
        score = value;
      }
    }
    return best;
  }
  next(cues, direction, director, energy) {
    return director && direction > 0
      ? this.director(cues, energy)
      : this.currentCue < 0
        ? direction > 0
          ? 0
          : cues.length - 1
        : (this.currentCue + direction + cues.length) % cues.length;
  }
  score(cues) {
    if (this.playing) {
      this.remainingBeats = Math.max(0, this.cueEnd - this.beat);
      this.playing = false;
    } else {
      this.playing = true;
      if (this.currentCue < 0) return this.enter(cues, 0);
      this.cueEnd = this.beat + this.remainingBeats;
      this.cueStart = this.cueEnd - cues[this.currentCue].bars * 4;
    }
    return null;
  }
  clock(event, now, cues) {
    if (event.stop) {
      if (this.playing)
        this.remainingBeats = Math.max(0, this.cueEnd - this.beat);
      this.playing = false;
      return null;
    }
    if (event.start) {
      this.beat = this.midiBeat = this.midiOffset = 0;
      this.midiAt = now;
      this.paused = false;
      this.playing = true;
      return this.enter(cues, 0);
    }
    if (event.beat !== undefined) {
      if (this.midiAt === null || event.resume || this.paused)
        this.midiOffset = this.beat - event.beat;
      this.midiBeat = event.beat;
      this.midiAt = now;
    }
    if (event.tempo) this.midiTempo = Math.max(40, Math.min(200, event.tempo));
    if (event.resume && !this.playing) return this.score(cues);
    return null;
  }
  tick(delta, now, cues, tempo, clock, director, energy) {
    if (this.paused) return null;
    if (clock && this.midiAt !== null && now - this.midiAt < 1500)
      this.beat = Math.max(
        this.beat,
        this.midiBeat +
          this.midiOffset +
          ((now - this.midiAt) * this.midiTempo) / 60000,
      );
    else this.beat += (Math.max(0, delta) * tempo) / 60;
    if (this.pendingCue && this.beat >= this.pendingCue.beat)
      return this.enter(cues, this.pendingCue.index, this.pendingCue.beat);
    if (!this.playing || this.beat < this.cueEnd) return null;
    if (director) return this.enter(cues, this.director(cues, energy));
    const cycle = cues.reduce((sum, cue) => sum + cue.bars * 4, 0);
    let start =
      this.cueEnd + Math.floor((this.beat - this.cueEnd) / cycle) * cycle;
    let index = (this.currentCue + 1) % cues.length;
    for (
      let n = 0;
      n < cues.length && this.beat >= start + cues[index].bars * 4;
      n++
    ) {
      start += cues[index].bars * 4;
      index = (index + 1) % cues.length;
    }
    return this.enter(cues, index, start);
  }
  snapshot() {
    return this.player?.sample(Math.max(0, this.beat - this.cueStart)) ?? null;
  }
  identities(cues) {
    return {
      current: cues[this.currentCue]?.id,
      selected: cues[this.selectedCue]?.id,
      pending: this.pendingCue ? cues[this.pendingCue.index]?.id : null,
    };
  }
  restore(cues, ids) {
    const elapsed = Math.max(
      0,
      this.playing
        ? this.beat - this.cueStart
        : this.cueEnd - this.cueStart - this.remainingBeats,
    );
    this.currentCue = cues.findIndex((cue) => cue.id === ids.current);
    this.selectedCue = Math.max(
      0,
      cues.findIndex((cue) => cue.id === ids.selected),
    );
    if (this.pendingCue) {
      this.pendingCue.index = cues.findIndex((cue) => cue.id === ids.pending);
      if (this.pendingCue.index < 0) this.pendingCue = null;
    }
    if (this.currentCue < 0) {
      this.playing = false;
      this.player = null;
      return;
    }
    const cue = cues[this.currentCue];
    this.cueStart = this.beat - elapsed;
    this.remainingBeats = Math.max(0, cue.bars * 4 - elapsed);
    this.cueEnd = this.beat + this.remainingBeats;
    this.player = cue.keyframes.length ? keyframePlayer(cue) : null;
  }
}
