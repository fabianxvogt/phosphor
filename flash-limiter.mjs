// Full-frame WCAG general-flash mitigation, not a spatial/red-flash certification.
// A flash is two opposing >=0.1 relative-luminance excursions with a darker
// extremum below 0.8. Output gain is applied in linear light by the presenter.
// Reserve a flash before permitting an upward excursion: a later fall cannot
// be prevented by a gain-only limiter. Retain completed flashes for 1.05 s:
// the extra 50 ms is conservative presentation-clock margin, not extra flashes.
// sRGB8 presentation may shift each mean by <0.005. Track potential flashes
// at 0.09 / darker <0.81, and cap blocked rises at 0.08: two rounding errors
// cannot promote an uncounted/blocked excursion into a >=0.1 general flash.
const trackingDelta = 0.09;
const darkerBoundary = 0.81;
const blockedRise = 0.08;
export class FlashLimiter {
  constructor() {
    this.events = new Float64Array(3);
    this.count = 0;
    this.direction = 0;
    this.anchor = 0; // The presenter starts on black.
    this.extreme = 0;
    this.limitedFrames = 0;
    this.limited = false;
  }
  update(mean, time, enabled = true, exempt = false) {
    let remaining = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.events[i] > time - 1.05) this.events[remaining++] = this.events[i];
    }
    this.count = remaining;
    this.limited = false;
    if (!enabled || exempt || this.anchor === null) {
      this.anchor = mean;
      this.extreme = mean;
      this.direction = 0;
      return 1;
    }
    let output = mean;
    if (this.direction === 1) {
      this.extreme = Math.max(this.extreme, output);
      if (this.extreme - output >= trackingDelta && output < darkerBoundary) {
        this.events[this.count++] = time;
        this.anchor = output;
        this.direction = 0;
      }
    } else if (this.direction === -1) {
      this.extreme = Math.min(this.extreme, output);
      if (output - this.extreme >= trackingDelta && this.extreme < darkerBoundary) {
        if (this.count >= 3) output = this.extreme + blockedRise;
        else {
          this.events[this.count++] = time;
          this.anchor = output;
          this.direction = 0;
        }
      }
    } else if (output - this.anchor >= trackingDelta && this.anchor < darkerBoundary) {
      if (this.count >= 3) output = this.anchor + blockedRise;
      else {
        this.direction = 1;
        this.extreme = output;
      }
    } else if (this.anchor - output >= trackingDelta && output < darkerBoundary) {
      this.direction = -1;
      this.extreme = output;
    }
    this.limited = output < mean;
    if (this.limited) this.limitedFrames++;
    return mean > 0 ? output / mean : 1;
  }
}
