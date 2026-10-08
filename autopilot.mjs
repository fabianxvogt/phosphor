// Autopilot (decision D15). Plays autopilot-allowed clips on the current
// page, changes every N bars on a bar line, avoids the last six clips, and
// reacts to loudness events. Manual input takes over; control returns after
// `handBackBars` idle bars. It may change the clip, energy, speed trim and
// mirror — never master, blackout, flash or page.

const HISTORY = 6;
const MIRRORS = [1, 1, 1, 2, 3, 4, 6];

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Autopilot {
  constructor({
    enabled = true,
    everyBars = 32,
    handBackBars = 32,
    seed = 1,
  } = {}) {
    this.enabled = enabled;
    this.everyBars = everyBars;
    this.handBackBars = handBackBars;
    this.random = rng(seed);
    this.nextChange = null;
    this.manualUntil = -Infinity;
    this.history = [];
    this.breakdownSince = null;
    this.calmerTaken = false;
  }

  // Any manual performance input at `bar`.
  manual(bar) {
    this.manualUntil = bar + this.handBackBars;
  }

  played(clipId) {
    if (!clipId) return;
    this.history = this.history.filter((id) => id !== clipId);
    this.history.push(clipId);
    if (this.history.length > HISTORY) this.history.shift();
  }

  active(bar) {
    return this.enabled && bar >= this.manualUntil;
  }

  // pool: [{ slot, clip }] on the current page; current: { slot, clip } | null.
  #pick(pool, current, target) {
    const allowed = pool.filter((p) => p.clip.autopilot);
    let candidates = allowed.filter(
      (p) =>
        p.clip.id !== current?.clip.id && !this.history.includes(p.clip.id),
    );
    if (!candidates.length)
      candidates = allowed.filter((p) => p.clip.id !== current?.clip.id);
    if (!candidates.length) return null;
    let best = null,
      score = Infinity;
    for (const p of candidates) {
      const s = Math.abs(p.clip.energy - target) + this.random() * 0.15;
      if (s < score) {
        score = s;
        best = p;
      }
    }
    return best;
  }

  // Called once per clock update. Returns actions for the show.
  // event: "build" | "drop" | "breakdown" | null (from loudness analysis).
  update({ bar, pool, current, energy, event = null }) {
    const actions = [];
    if (!this.active(bar)) {
      // Resume on a bar line after hand-back, not immediately.
      if (this.nextChange === null || this.nextChange < this.manualUntil)
        this.nextChange = Math.max(bar + 1, this.manualUntil);
      this.breakdownSince = null;
      return actions;
    }
    const trigger = (choice, fade) => {
      actions.push({
        type: "trigger",
        slot: choice.slot,
        fade,
        quantize: "bar",
      });
      this.played(choice.clip.id);
      this.nextChange = bar + this.everyBars;
    };
    if (event === "build") {
      actions.push({
        type: "energy",
        value: Math.min(1, energy + 0.2),
        beats: 16,
      });
    } else if (event === "drop") {
      const wasBreakdown = this.breakdownSince !== null;
      this.breakdownSince = null;
      if (wasBreakdown) actions.push({ type: "speed", value: 1 });
      const choice = this.#pick(pool, current, Math.min(1, energy + 0.3));
      if (choice && choice.clip.energy >= (current?.clip.energy ?? 0))
        trigger(choice, 1);
      return actions;
    } else if (event === "breakdown" && this.breakdownSince === null) {
      this.breakdownSince = bar;
      this.calmerTaken = false;
      actions.push({
        type: "energy",
        value: Math.max(0, energy - 0.3),
        beats: 8,
      });
      actions.push({ type: "speed", value: 0.5 });
    }
    if (
      this.breakdownSince !== null &&
      !this.calmerTaken &&
      bar >= this.breakdownSince + 8
    ) {
      this.calmerTaken = true;
      const choice = this.#pick(pool, current, Math.max(0, energy - 0.3));
      if (choice) trigger(choice, choice.clip.fade);
      return actions;
    }
    if (this.nextChange === null)
      this.nextChange = current ? bar + this.everyBars : bar;
    if (bar >= this.nextChange) {
      const choice = this.#pick(pool, current, energy);
      if (choice) {
        trigger(choice, choice.clip.fade);
        if (this.random() < 0.25)
          actions.push({
            type: "mirror",
            value: MIRRORS[Math.floor(this.random() * MIRRORS.length)],
          });
      } else this.nextChange = bar + this.everyBars;
    }
    return actions;
  }
}
