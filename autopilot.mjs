// Autopilot (decisions D15, D66, D68). Plays from the pool the show builds
// out of the look catalog (all looks it may play, best first), changes on a
// bar line, avoids recently played looks, and reacts to loudness events. Manual input takes over; control returns after
// `handBackBars` idle bars. It may change the clip, palette, energy and speed —
// never master, mirror, blackout or flash (a mirror jump is not smooth).
// Random mode (default on): each chosen clip plays a random 8, 12 or 16 bars,
// picks are weighted by rating (pool entries' `weight`; 0 never plays) and the
// live clip's parameters drift smoothly; off, changes walk the pool in order
// every `everyBars` and parameters stay put. Autopilot changes are always
// smooth: context chooses a transition, never a hard cut (D50, D58).
import { PALETTES, paletteById } from "./palettes.mjs";
import { weightedChoice, UNRATED_WEIGHT } from "./catalog.mjs";

const HISTORY = 24; // recently played looks to avoid
const FADE_BEATS = 12; // regular and breakdown changes: at least three bars
const DROP_FADE_BEATS = 4; // drops land fast but never as a hard cut
export const RANDOM_BARS = [8, 12, 16]; // random-mode clip durations (D66)
export const DRIFT_BARS = 8; // one parameter glide, then the next
const PALETTE_HISTORY = 3;
const PALETTE_BEATS = 4;
const weightOf = (entry) => entry.weight ?? UNRATED_WEIGHT;

function hue(hex) {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255,
    g = (value >> 8) & 255,
    b = value & 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    span = max - min;
  if (!span) return null;
  const sector =
    max === r
      ? (g - b) / span
      : max === g
        ? (b - r) / span + 2
        : (r - g) / span + 4;
  return (sector * 60 + 360) % 360;
}

function hueDistance(a, b) {
  let distance = 0;
  for (const key of ["primary", "secondary", "accent"]) {
    const from = hue(a[key]),
      to = hue(b[key]);
    if (from === null || to === null) continue;
    const delta = Math.abs(from - to);
    distance = Math.max(distance, Math.min(delta, 360 - delta));
  }
  return distance;
}

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
    everyBars = 16,
    handBackBars = 32,
    seed = 1,
  } = {}) {
    this.enabled = enabled;
    this.randomMode = random;
    this.everyBars = everyBars;
    this.handBackBars = handBackBars;
    this.random = rng(seed);
    this.paletteRandom = rng(seed ^ 0x50414c);
    this.transitionRandom = rng(seed ^ 0x545241);
    this.durationRandom = rng(seed ^ 0x445552);
    this.nextPalette = null;
    this.paletteHistory = [];
    this.nextChange = null;
    this.duration = null; // bars the current autopilot clip plays
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

  // How long the look starting now plays: a random 8/12/16 bars in random
  // mode, else the set's interval.
  #period() {
    this.duration = this.randomMode
      ? RANDOM_BARS[Math.floor(this.durationRandom() * RANDOM_BARS.length)]
      : this.everyBars;
    return this.duration;
  }

  // Weighted by rating among looks not played recently: up to the last 24,
  // but always leaving more than half of the candidates, so a small pool (a
  // few favourites) still rotates and its ratings still matter.
  #weighted(candidates) {
    for (let k = Math.min(HISTORY, this.history.length); k > 0; k--) {
      const recent = new Set(this.history.slice(-k));
      const fresh = candidates.filter((p) => !recent.has(p.clip.id));
      if (fresh.length * 2 > candidates.length)
        return weightedChoice(fresh, weightOf, this.random);
    }
    return weightedChoice(candidates, weightOf, this.random);
  }

  palettePlayed(id) {
    if (!paletteById(id)) return;
    this.paletteHistory = this.paletteHistory.filter(
      (previous) => previous !== id,
    );
    this.paletteHistory.push(id);
    if (this.paletteHistory.length > PALETTE_HISTORY)
      this.paletteHistory.shift();
  }

  #paletteInterval() {
    return 64 + Math.floor(this.paletteRandom() * 65);
  }

  #palette(palette, mood, contrast) {
    const source = paletteById(palette);
    const colors =
      source?.colors ?? (typeof palette === "object" ? palette : null);
    let pool = PALETTES.filter(
      (candidate) =>
        candidate.id !== palette &&
        (mood === null || candidate.moods.includes(mood)),
    );
    if (contrast && colors) {
      const contrasting = pool.filter(
        (candidate) =>
          (source && candidate.moods[0] !== source.moods[0]) ||
          hueDistance(colors, candidate.colors) >= 60,
      );
      if (contrasting.length) pool = contrasting;
      else {
        const largest = Math.max(
          ...pool.map((candidate) => hueDistance(colors, candidate.colors)),
        );
        pool = pool.filter(
          (candidate) => hueDistance(colors, candidate.colors) === largest,
        );
      }
    }
    const fresh = pool.filter(
      (candidate) => !this.paletteHistory.includes(candidate.id),
    );
    const choices = fresh.length ? fresh : pool;
    if (!choices.length) return null;
    const choice = choices[Math.floor(this.paletteRandom() * choices.length)];
    this.palettePlayed(choice.id);
    return { type: "palette", id: choice.id, beats: PALETTE_BEATS };
  }

  active(bar) {
    return this.enabled && bar >= this.manualUntil;
  }

  // Event change (drop, breakdown). pool: [{ clip, weight, order }] —
  // the looks autopilot may play; current: { clip } | null. Catalog looks
  // share the authored mid energy, so event changes pick by rating too.
  #pick(pool, current) {
    const allowed = pool.filter(
      (p) => p.clip.autopilot && p.clip.id !== current?.clip.id && weightOf(p),
    );
    return allowed.length ? this.#weighted(allowed) : null;
  }

  // Regular change: a weighted random allowed look not played recently
  // (random mode) or the next one in pool order (the catalog, best first).
  #next(pool, current) {
    const allowed = pool.filter(
      (p) => p.clip.autopilot && p.clip.id !== current?.clip.id,
    );
    if (!allowed.length) return null;
    if (this.randomMode) return this.#weighted(allowed);
    const here = pool.find((p) => p.clip.id === current?.clip.id);
    const from = here ? here.order : -1;
    return allowed.find((p) => p.order > from) ?? allowed[0];
  }

  #transition(clip, event) {
    const requested = clip.transition ?? "auto";
    if (requested === "cut") return "crossfade";
    if (requested !== "auto") return requested;
    if (event === "drop") return "melt";
    if (this.breakdownSince !== null)
      return this.transitionRandom() < 0.5 ? "melt" : "dissolve";
    if (!this.randomMode) return "crossfade";
    // Random mode varies regular changes: crossfade 60 %, dissolve 20 %,
    // melt 20 % (D66).
    const x = this.transitionRandom();
    return x < 0.6 ? "crossfade" : x < 0.8 ? "dissolve" : "melt";
  }

  #trigger(choice, bar, fade, quantize, event) {
    this.played(choice.clip.id);
    this.nextChange = bar + this.#period();
    this.nextDrift = bar + Math.ceil(fade / 4); // drift once the fade is over
    return {
      type: "trigger",
      clip: choice.clip,
      fade,
      quantize,
      transition: this.#transition(choice.clip, event),
    };
  }

  // The Next button (D66): the pick a regular change would make, on the next
  // beat with the regular fade; its duration starts now. Not a performer
  // takeover, and it plays even with autopilot off. null when nothing can.
  next({ bar, pool, current }) {
    const choice = this.#next(pool, current);
    if (!choice) return null;
    return this.#trigger(
      choice,
      bar,
      Math.max(FADE_BEATS, choice.clip.fade),
      "beat",
      null,
    );
  }

  // Called once per clock update. Returns actions for the show.
  // event: "build" | "drop" | "breakdown" | null (from loudness analysis).
  update({
    bar,
    pool,
    current,
    energy,
    palette = null,
    mood = null,
    event = null,
  }) {
    const actions = [];
    if (typeof palette === "string" && this.paletteHistory.at(-1) !== palette)
      this.palettePlayed(palette);
    if (this.nextPalette === null)
      this.nextPalette = bar + this.#paletteInterval();
    if (!this.active(bar)) {
      // Resume on a bar line after hand-back, not immediately.
      if (this.nextChange === null || this.nextChange < this.manualUntil)
        this.nextChange = Math.max(bar + 1, this.manualUntil);
      if (this.nextPalette < this.manualUntil)
        this.nextPalette = this.manualUntil;
      this.breakdownSince = null;
      this.chainFrom = this.settle = null; // the performer's level is the new anchor
      return actions;
    }
    // Colour cadence is independent of clip order and parameter drift (D57).
    if (current && (event === "drop" || bar >= this.nextPalette)) {
      const step = this.#palette(palette, mood, event === "drop");
      if (step) actions.push(step);
      this.nextPalette = bar + this.#paletteInterval();
    }
    const trigger = (choice, fade) =>
      actions.push(this.#trigger(choice, bar, fade, "bar", event));
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
      const choice = this.#pick(pool, current);
      if (choice) trigger(choice, DROP_FADE_BEATS);
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
      const choice = this.#pick(pool, current);
      if (choice) trigger(choice, Math.max(FADE_BEATS, choice.clip.fade));
      return actions;
    }
    if (this.nextChange === null)
      this.nextChange = current ? bar + this.#period() : bar;
    if (bar >= this.nextChange) {
      const choice = this.#next(pool, current);
      if (choice) {
        trigger(choice, Math.max(FADE_BEATS, choice.clip.fade));
        return actions;
      }
      this.nextChange = bar + this.#period();
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
