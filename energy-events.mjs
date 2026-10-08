// Loudness events for autopilot (decision D15): breakdown when the kick
// disappears for two bars, build when high-band energy rises through a
// breakdown, drop when the kick returns. Heuristic; ships only if it proves
// itself on real mixes (D36).

export class EnergyEvents {
  constructor() {
    this.state = "playing"; // playing | breakdown
    this.quietBeats = 0;
    this.lastBeat = null;
    this.highFloor = null;
    this.built = false;
  }
  // beat: integer beat count from the clock; tracker: beat-tracker state;
  // high: smoothed high-band level 0..1. Returns an event or null.
  update(beat, tracker, high) {
    if (beat === this.lastBeat) return null;
    this.lastBeat = beat;
    const kick = !!tracker?.locked && !tracker.coasting;
    if (this.state === "playing") {
      this.quietBeats = kick ? 0 : this.quietBeats + 1;
      if (tracker?.locked && this.quietBeats >= 8) {
        this.state = "breakdown";
        this.highFloor = high;
        this.built = false;
        return "breakdown";
      }
      return null;
    }
    if (kick) {
      this.state = "playing";
      this.quietBeats = 0;
      return "drop";
    }
    this.highFloor = Math.min(this.highFloor, high);
    if (!this.built && high > this.highFloor * 1.3 + 0.05) {
      this.built = true;
      return "build";
    }
    return null;
  }
}
