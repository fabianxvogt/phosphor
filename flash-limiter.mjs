// Full-frame WCAG general-flash mitigation, not a spatial/red-flash certification.
// A flash is two opposing >=0.1 relative-luminance excursions with a darker
// extremum below 0.8. Output gain is applied in linear light by the presenter.
// Reserve a flash before permitting an upward excursion: a later fall cannot
// be prevented by a gain-only limiter. Retain completed flashes for 1.05 s:
// the extra 50 ms is conservative presentation-clock margin, not extra flashes.
// sRGB8 presentation may shift each mean by <0.005. Track potential flashes
// at 0.09 / darker <0.81. Once the budget is full, output cannot rise:
// even a subthreshold rise can enable another full fall to a varying trough.
const trackingDelta = 0.09;
const darkerBoundary = 0.81;
export class FlashLimiter {
  constructor() {
    this.events = new Float64Array(3);
    this.count = 0;
    this.reset(0); // The presenter starts on black.
    this.limitedFrames = 0;
    this.limited = false;
  }
  // Rebaseline after an exempt/direct presentation without erasing the budget.
  reset(mean = null) {
    this.low = this.high = this.extreme = mean;
    this.previous = mean;
    this.direction = 0;
  }
  update(mean, time, enabled = true, exempt = false) {
    let remaining = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.events[i] > time - 1.05) this.events[remaining++] = this.events[i];
    }
    this.count = remaining;
    this.limited = false;
    if (!enabled || exempt || this.low === null) {
      this.reset(mean);
      return 1;
    }
    let output = this.count >= 3 ? Math.min(mean, this.previous) : mean;
    if (this.direction === 1) {
      this.extreme = Math.max(this.extreme, output);
      if (this.extreme - output >= trackingDelta && output < darkerBoundary) {
        this.events[this.count++] = time;
        this.reset(output);
      }
    } else if (this.direction === -1) {
      this.extreme = Math.min(this.extreme, output);
      if (output - this.extreme >= trackingDelta && this.extreme < darkerBoundary) {
        this.events[this.count++] = time;
        this.reset(output);
      }
    } else {
      this.low = Math.min(this.low, output);
      if (output - this.low >= trackingDelta && this.low < darkerBoundary) {
        this.direction = 1;
        this.extreme = output;
      } else if (this.high - output >= trackingDelta && output < darkerBoundary) {
        this.direction = -1;
        this.extreme = output;
      }
      // Track actual output extrema, including unpaired subthreshold motion.
      this.high = Math.max(this.high, output);
    }
    this.limited = output < mean;
    if (this.limited) this.limitedFrames++;
    this.previous = output;
    return mean > 0 ? output / mean : 1;
  }
}
