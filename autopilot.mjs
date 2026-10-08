// Autopilot (decision D15). Plays autopilot-allowed clips on the current
// page, changes every N bars on a bar line, avoids the last six clips, and
// reacts to loudness events. Manual input takes over; control returns after
// `handBackBars` idle bars. It may change the clip, energy and speed trim —
// never master, mirror, blackout, flash or page (a mirror jump is not smooth).
// Random mode (owner direction 2026-10-08, default on): regular changes pick
// a random clip and the live clip's parameters drift smoothly; off, changes
// walk the page in slot order and parameters stay put. Autopilot changes
// always crossfade.

const HISTORY = 6;
const FADE_BEATS = 8; // regular and breakdown changes: at least two bars
const DROP_FADE_BEATS = 4; // drops land fast but never as a hard cut
export const DRIFT_BARS = 8; // one parameter glide, then the next

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
    random = true,
    everyBars = 32,
    handBackBars = 32,
    seed = 1,
  } = {}) {
    this.enabled = enabled;
    this.randomMode = random;
    this.everyBars = everyBars;
    this.handBackBars = handBackBars;
    this.random = rng(seed);
    this.nextChange = null;
    this.nextDrift = null;
    this.manualUntil = -Infinity;
    this.history = [];
    this.breakdownSince = null;
    this.calmerTaken = false;
    // Energy is show state (D54), so the event chain is anchored: `chainFrom`
    // is the energy before a breakdown/build began; after a drop, `settle`
    // eases back to it so repeated chains never ratchet upward.
    this.chainFrom = null;
    this.settle = null; // { bar, to }
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

  // Regular change: a random allowed clip not played recently (random mode)
  // or the next allowed clip in page order.
  #next(pool, current) {
    const allowed = pool.filter(
      (p) => p.clip.autopilot && p.clip.id !== current?.clip.id,
    );
    if (!allowed.length) return null;
    if (!this.randomMode)
      return allowed.find((p) => p.slot > (current?.slot ?? -1)) ?? allowed[0];
    const fresh = allowed.filter((p) => !this.history.includes(p.clip.id));
    const from = fresh.length ? fresh : allowed;
    return from[Math.floor(this.random() * from.length)];
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
      this.chainFrom = this.settle = null; // the performer's level is the new anchor
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
      this.nextDrift = bar + Math.ceil(fade / 4); // drift once the fade is over
    };
    const anchor = () => {
      if (this.chainFrom === null) {
        this.chainFrom = this.settle?.to ?? energy;
        this.settle = null;
      }
      return this.chainFrom;
    };
    if (event === "build") {
      anchor();
      actions.push({
        type: "energy",
        value: Math.min(1, energy + 0.2),
        beats: 16,
      });
    } else if (event === "drop") {
      const wasBreakdown = this.breakdownSince !== null;
      this.breakdownSince = null;
      if (wasBreakdown) actions.push({ type: "speed", value: 1 });
      // The drop lifts energy 0.3 above where the chain began, then settles
      // back there after 32 bars; the new clip keeps it (D54).
      const from = anchor();
      const target = Math.min(1, from + 0.3);
      this.chainFrom = null;
      this.settle = { bar: bar + 32, to: from };
      actions.push({ type: "energy", value: target, beats: 4 });
      const choice = this.#pick(pool, current, target);
      if (choice && choice.clip.energy >= (current?.clip.energy ?? 0))
        trigger(choice, DROP_FADE_BEATS);
      return actions;
    } else if (event === "breakdown" && this.breakdownSince === null) {
      this.breakdownSince = bar;
      this.calmerTaken = false;
      actions.push({
        type: "energy",
        value: Math.max(0, anchor() - 0.3),
        beats: 8,
      });
      actions.push({ type: "speed", value: 0.5 });
    }
    if (this.settle && bar >= this.settle.bar) {
      actions.push({ type: "energy", value: this.settle.to, beats: 32 });
      this.settle = null;
    }
    if (
      this.breakdownSince !== null &&
      !this.calmerTaken &&
      bar >= this.breakdownSince + 8
    ) {
      this.calmerTaken = true;
      const choice = this.#pick(pool, current, Math.max(0, energy - 0.3));
      if (choice) trigger(choice, Math.max(FADE_BEATS, choice.clip.fade));
      return actions;
    }
    if (this.nextChange === null)
      this.nextChange = current ? bar + this.everyBars : bar;
    if (bar >= this.nextChange) {
      const choice = this.#next(pool, current);
      if (choice) {
        trigger(choice, Math.max(FADE_BEATS, choice.clip.fade));
        return actions;
      }
      this.nextChange = bar + this.everyBars;
    }
    // Random mode: the live clip's parameters glide to a new nearby target
    // every DRIFT_BARS bars (the show computes and interpolates the target).
    if (this.randomMode && current && bar >= (this.nextDrift ?? bar)) {
      actions.push({ type: "drift", bars: DRIFT_BARS });
      this.nextDrift = bar + DRIFT_BARS;
    }
    return actions;
  }
}
