// Show controller: turns performer actions, the clock and autopilot into
// renderer actions. Pure (no DOM, no WebGL) so the output window can own it
// (decision D8) and tests can drive it with synthetic time.
import { ShowClock } from "./show-clock.mjs";
import { Autopilot } from "./autopilot.mjs";
import { SLOTS } from "./show-set.mjs";

const LATE = 0.1; // a press this soon after a beat or bar line fires on it
const ENERGY_STEP = 0.1;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class Show {
  constructor({ set, safeSnapshot, now = 0, seed = 1 }) {
    this.set = set;
    this.safeSnapshot = safeSnapshot;
    this.clock = new ShowClock({
      bpm: set.clock.manualBpm,
      mode: set.clock.mode,
      latencyMs: set.clock.latencyMs,
      now,
    });
    this.autopilot = new Autopilot({ ...set.autopilot, seed });
    this.page = 0;
    this.live = null; // { page, slot, clip }
    this.pending = null; // { page, slot, clip, at, fade }
    this.energy = 0.5;
    this.speed = 1;
    this.shared = { ...set.shared };
    this.blackout = false;
    this.freeze = false;
    this.flash = false;
    this.lastBar = null;
  }

  #pool(page = this.page) {
    const pool = [];
    this.set.pages[page].slots.forEach(
      (clip, slot) => clip && pool.push({ slot, clip }),
    );
    return pool;
  }

  #schedule(t, page, slot, quantize, fade) {
    const clip = this.set.pages[page]?.slots[slot];
    if (!clip) return [];
    const now = this.clock.at(t);
    let at = now.beat;
    if (quantize === "beat") {
      const since = now.beat - Math.floor(now.beat);
      at = since <= LATE ? now.beat : Math.floor(now.beat) + 1;
    } else if (quantize === "bar") {
      const barStart = now.beat - now.beatInBar;
      at = now.beatInBar <= LATE ? now.beat : barStart + 4;
    }
    this.pending = { page, slot, clip, at, fade: fade ?? clip.fade };
    return this.#fire(t);
  }

  #fire(t) {
    const p = this.pending;
    if (!p) return [];
    const now = this.clock.at(t);
    if (now.beat + 1e-9 < p.at) return [];
    this.pending = null;
    this.live = { page: p.page, slot: p.slot, clip: p.clip };
    this.energy = p.clip.energy;
    this.autopilot.played(p.clip.id);
    return [
      {
        type: "load",
        snapshot: p.clip.snapshot,
        fadeSeconds: (p.fade * 60) / now.bpm,
        energy: p.clip.energy,
        page: p.page,
        slot: p.slot,
        clipId: p.clip.id,
      },
    ];
  }

  #manual(t) {
    this.autopilot.manual(this.clock.at(t).bar);
  }

  command(action, t) {
    switch (action.type) {
      case "slot": {
        const clip = this.set.pages[this.page].slots[action.index];
        if (!clip || action.index >= SLOTS) return [];
        this.#manual(t);
        return this.#schedule(t, this.page, action.index, clip.quantize);
      }
      case "page":
        if (action.index >= 0 && action.index < this.set.pages.length)
          this.page = action.index;
        return [];
      case "blackout":
        this.blackout = action.on ?? !this.blackout;
        return [{ type: "blackout", on: this.blackout }];
      case "safe":
        this.#manual(t);
        this.blackout = this.freeze = this.flash = false;
        this.pending = null;
        this.live = null;
        this.energy = 0.15;
        this.speed = 1;
        Object.assign(this.shared, { hue: 0, zoom: 1, mirror: 1 });
        return [
          { type: "safe", snapshot: this.safeSnapshot, energy: this.energy },
          { type: "speed", value: 1 },
          { type: "shared", shared: { ...this.shared } },
          { type: "blackout", on: false },
          { type: "freeze", on: false },
          { type: "flash", on: false },
        ];
      case "tap":
        this.clock.tap(t);
        return [];
      case "downbeat":
        this.clock.downbeat(t);
        return [];
      case "nudge":
        this.clock.nudge(t, action.direction);
        return [];
      case "energy":
        this.#manual(t);
        this.energy = clamp01(
          action.value ??
            this.energy + ENERGY_STEP * Math.sign(action.direction),
        );
        return [{ type: "energy", value: this.energy, seconds: 0.25 }];
      case "speed":
        this.#manual(t);
        this.speed = this.speed === action.value ? 1 : action.value;
        return [{ type: "speed", value: this.speed }];
      case "autopilot":
        this.autopilot.enabled = action.on ?? !this.autopilot.enabled;
        this.set.autopilot.enabled = this.autopilot.enabled;
        if (this.autopilot.enabled) this.autopilot.manualUntil = -Infinity;
        return [];
      case "freeze":
        this.freeze = action.on ?? !this.freeze;
        return [{ type: "freeze", on: this.freeze }];
      case "flash":
        this.flash = !!action.on;
        return [{ type: "flash", on: this.flash }];
      case "shared": {
        for (const key of ["master", "hue", "zoom", "mirror"])
          if (Number.isFinite(action[key])) this.shared[key] = action[key];
        this.set.shared = { ...this.shared };
        return [{ type: "shared", shared: { ...this.shared } }];
      }
      default:
        return [];
    }
  }

  // Call every frame. tracker: beat-tracker state on this clock's timeline;
  // event: "build" | "drop" | "breakdown" from loudness analysis.
  tick(t, { tracker = null, event = null } = {}) {
    if (tracker) this.clock.track(t, tracker);
    const actions = this.#fire(t);
    const now = this.clock.at(t);
    if (now.bar !== this.lastBar || event) {
      this.lastBar = now.bar;
      const auto = this.autopilot.update({
        bar: now.bar,
        pool: this.#pool(),
        current: this.live?.page === this.page ? this.live : null,
        energy: this.energy,
        event,
      });
      for (const a of auto) {
        if (a.type === "trigger")
          actions.push(
            ...this.#schedule(t, this.page, a.slot, a.quantize, a.fade),
          );
        else if (a.type === "energy") {
          this.energy = clamp01(a.value);
          actions.push({
            type: "energy",
            value: this.energy,
            seconds: (a.beats * 60) / now.bpm,
          });
        } else if (a.type === "speed") {
          this.speed = a.value;
          actions.push({ type: "speed", value: a.value });
        } else if (a.type === "mirror") {
          this.shared.mirror = a.value;
          actions.push({ type: "shared", shared: { ...this.shared } });
        }
      }
    }
    return actions;
  }

  status(t) {
    const clock = this.clock.at(t);
    return {
      page: this.page,
      live: this.live && {
        page: this.live.page,
        slot: this.live.slot,
        clipId: this.live.clip.id,
      },
      pending: this.pending && {
        page: this.pending.page,
        slot: this.pending.slot,
        beats: Math.max(0, this.pending.at - clock.beat),
      },
      energy: this.energy,
      speed: this.speed,
      shared: { ...this.shared },
      blackout: this.blackout,
      freeze: this.freeze,
      flash: this.flash,
      autopilot: {
        enabled: this.autopilot.enabled,
        active: this.autopilot.active(clock.bar),
        handBackIn: Math.max(0, this.autopilot.manualUntil - clock.bar),
        nextChangeIn:
          this.autopilot.nextChange === null
            ? null
            : this.autopilot.nextChange - clock.bar,
      },
      clock,
    };
  }

  // Runtime state for crash recovery (decision D9), separate from the set.
  snapshot(t) {
    const clock = this.clock.at(t);
    return {
      page: this.page,
      live: this.live && { page: this.live.page, slot: this.live.slot },
      energy: this.energy,
      speed: this.speed,
      shared: { ...this.shared },
      blackout: this.blackout,
      clock: {
        mode: this.clock.mode,
        bpm: clock.bpm,
        latencyMs: this.clock.latencyMs,
        barOffset: this.clock.barOffset,
      },
      autopilot: this.autopilot.enabled,
    };
  }

  restore(saved, t) {
    this.page = saved.page;
    this.energy = saved.energy;
    this.speed = saved.speed;
    this.shared = { ...saved.shared };
    this.blackout = saved.blackout;
    this.autopilot.enabled = saved.autopilot;
    this.clock.latencyMs = saved.clock.latencyMs;
    this.clock.barOffset = saved.clock.barOffset;
    if (saved.clock.mode === "manual")
      this.clock.setManualBpm(t, saved.clock.bpm);
    const actions = [
      { type: "shared", shared: { ...this.shared } },
      { type: "speed", value: this.speed },
      { type: "blackout", on: this.blackout },
    ];
    const clip =
      saved.live && this.set.pages[saved.live.page]?.slots[saved.live.slot];
    if (clip) {
      this.live = { page: saved.live.page, slot: saved.live.slot, clip };
      actions.unshift({
        type: "load",
        snapshot: clip.snapshot,
        fadeSeconds: 0,
        energy: this.energy,
        page: saved.live.page,
        slot: saved.live.slot,
        clipId: clip.id,
      });
    }
    return actions;
  }
}
