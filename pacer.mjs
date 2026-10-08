// Frame pacing for the stage (fixes the 120 Hz governor bug): render about
// 60 times a second whatever the display's refresh rate, by accumulating
// callback time rather than gating each callback on a fixed threshold.
export class Pacer {
  constructor(targetHz = 60, slackMs = 4) {
    this.target = 1000 / targetHz;
    this.slack = slackMs;
    this.last = null;
    this.lastRender = null;
    this.phase = 0;
  }
  // Returns the interval since the last rendered frame (ms), or 0 to skip.
  frame(ms) {
    if (this.last === null) {
      this.last = this.lastRender = ms;
      return 0;
    }
    const delta = ms - this.last;
    this.last = ms;
    if (!(delta > 0)) return 0;
    this.phase += delta;
    if (this.phase + this.slack < this.target) return 0;
    this.phase =
      delta > this.target * 4 ? 0 : Math.max(0, this.phase - this.target);
    const interval = ms - this.lastRender;
    this.lastRender = ms;
    return interval;
  }
}
