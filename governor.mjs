const targetMs = (quality) => 1000 / (quality === "low" ? 30 : 60);

export class Governor {
  constructor() {
    this.last = null;
    this.lastRender = null;
    this.phase = 0;
    this.refreshMs = 1000 / 60;
    this.downgrades = 0;
    this.slow = 0;
    this.fast = 0;
    this.cooldown = 0;
    this.ceiling = "balanced";
  }
  frame(now, quality = "balanced") {
    if (this.last === null) {
      this.last = this.lastRender = now;
      return 0;
    }
    const delta = now - this.last;
    if (delta <= 0) return 0;
    this.last = now;
    if (delta < 100) this.refreshMs += (delta - this.refreshMs) * 0.08;
    const target = targetMs(quality);
    this.phase += delta;
    if (this.phase + this.refreshMs * 0.5 < target - 1e-7) return 0;
    this.phase = Math.max(-target, this.phase - target);
    if (delta > target * 4) this.phase = 0;
    const interval = now - this.lastRender;
    this.lastRender = now;
    return interval;
  }
  setCeiling(quality) {
    this.ceiling = quality;
    this.reset();
  }
  reset() {
    this.slow = this.fast = 0;
    this.cooldown = 0;
    this.phase = 0;
  }
  assess(p95, quality, eligible = true) {
    if (!eligible || !Number.isFinite(p95) || p95 <= 0) {
      this.slow = this.fast = 0;
      return null;
    }
    if (this.cooldown > 0) {
      this.cooldown--;
      return null;
    }
    const budget = Math.max(targetMs(quality), this.refreshMs);
    this.slow = p95 > budget * 1.6 + 0.5 ? this.slow + 1 : 0;
    this.fast = p95 <= budget * 1.35 + this.refreshMs * 0.4 ? this.fast + 1 : 0;
    const order = ["low", "balanced", "high"];
    const index = order.indexOf(quality);
    if (this.slow >= 2 && index > 0) {
      this.downgrades++;
      this.slow = this.fast = 0;
      this.cooldown = 2;
      return order[index - 1];
    }
    if (this.fast >= 6 && index < order.indexOf(this.ceiling)) {
      this.slow = this.fast = 0;
      this.cooldown = 2;
      return order[index + 1];
    }
    return null;
  }
}
