// Show controller: turns performer actions, the clock and autopilot into
// renderer actions. Pure (no DOM, no WebGL) so the output window can own it
// (decision D8) and tests can drive it with synthetic time.
import { ShowClock } from "./show-clock.mjs";
import { Autopilot } from "./autopilot.mjs";
import { SLOTS } from "./show-set.mjs";
import { paletteById } from "./palettes.mjs";

const LATE = 0.1; // a press this soon after a beat or bar line fires on it
const ENERGY_STEP = 0.1;
const DRIFT_SPAN = 0.12; // drift targets stay within ±12 % of each range
const PALETTE_BEATS = 4;
const PALETTE_KEYS = ["primary", "secondary", "accent"];
const PARAMS = Object.freeze({ type: "params" });
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class Show {
  constructor({ set, safeSnapshot, scenes = [], now = 0, seed = 1 }) {
    this.set = set;
    this.safeSnapshot = safeSnapshot;
    this.safeFrame = structuredClone(safeSnapshot);
    this.safeShowing = false;
    this.clock = new ShowClock({
      bpm: set.clock.manualBpm,
      mode: set.clock.mode,
      latencyMs: set.clock.latencyMs,
      now,
    });
    this.autopilot = new Autopilot({ ...set.autopilot, seed });
    this.page = 0;
    this.live = null; // { page, slot, clip, base } — base: authored params
    this.drift = null; // { keys, from, to, t0, seconds } while params glide
    this.scenes = new Map(scenes.map((s) => [s.id, s]));
    this.pending = null; // { page, slot, clip, at, fade, transition }
    this.energy = 0.5;
    this.palette = null; // library ID or custom colours; the glide's target
    this.paletteColors = null; // actual colours currently on screen
    this.paletteGlide = null; // { to, t0, seconds }
    this.paletteValues = new Uint32Array(3);
    this.paletteFrom = new Uint32Array(3);
    this.paletteTo = new Uint32Array(3);
    this.resumeEnergy = null; // energy to resume after the safe look
    this.speed = 1;
    this.shared = { ...set.shared };
    this.blackout = false;
    this.freeze = false;
    this.flash = false;
    this.lastBar = null;
    this.disabled = new Set(); // families whose shaders failed
  }

  #pool(page = this.page) {
    const pool = [];
    this.set.pages[page].slots.forEach(
      (clip, slot) =>
        clip &&
        !this.disabled.has(clip.snapshot.scene) &&
        pool.push({ slot, clip }),
    );
    return pool;
  }

  #snapshot(snapshot) {
    return this.paletteColors
      ? { ...snapshot, palette: this.paletteColors }
      : snapshot;
  }

  #rememberColors() {
    for (let i = 0; i < PALETTE_KEYS.length; i++)
      this.paletteValues[i] = parseInt(
        this.paletteColors[PALETTE_KEYS[i]].slice(1),
        16,
      );
  }

  #glideTo(colors, t, seconds) {
    this.paletteFrom.set(this.paletteValues);
    for (let i = 0; i < PALETTE_KEYS.length; i++)
      this.paletteTo[i] = parseInt(colors[PALETTE_KEYS[i]].slice(1), 16);
    return { to: { ...colors }, t0: t, seconds };
  }

  #writePalette(t, colors = this.paletteColors, values = this.paletteValues) {
    const glide = this.paletteGlide;
    const x = clamp01((t - glide.t0) / glide.seconds);
    const k = x * x * (3 - 2 * x);
    let changed = false;
    for (let i = 0; i < PALETTE_KEYS.length; i++) {
      let rgb = 0;
      for (let shift = 16; shift >= 0; shift -= 8) {
        const a = (this.paletteFrom[i] >> shift) & 255;
        const b = (this.paletteTo[i] >> shift) & 255;
        rgb |= Math.round(a + (b - a) * k) << shift;
      }
      // Endpoints are parsed once; unchanged 8-bit colours need neither
      // new strings nor another renderer upload.
      if (rgb !== values[i]) {
        values[i] = rgb;
        colors[PALETTE_KEYS[i]] = `#${rgb.toString(16).padStart(6, "0")}`;
        changed = true;
      }
    }
    return changed;
  }

  #colorsAt(t) {
    if (!this.paletteGlide) return this.paletteColors;
    const colors = { ...this.paletteColors };
    this.#writePalette(t, colors, this.paletteValues.slice());
    return colors;
  }

  #advancePalette(t) {
    if (!this.paletteGlide) return false;
    const changed = this.#writePalette(t);
    if (t >= this.paletteGlide.t0 + this.paletteGlide.seconds)
      this.paletteGlide = null;
    return changed;
  }

  #setPalette(palette, t, beats = PALETTE_BEATS) {
    const colors =
      typeof palette === "string" ? paletteById(palette)?.colors : palette;
    if (!colors) return;
    const same =
      typeof palette === "string"
        ? palette === this.palette
        : typeof this.palette === "object" &&
          this.palette &&
          Object.keys(colors).every((key) => colors[key] === this.palette[key]);
    this.#advancePalette(t);
    if (same && this.paletteColors) return;
    this.palette = typeof palette === "string" ? palette : { ...palette };
    this.autopilot.palettePlayed(palette);
    if (!this.paletteColors) {
      this.paletteColors = { ...colors };
      this.#rememberColors();
      return;
    }
    this.paletteGlide = this.#glideTo(
      colors,
      t,
      (beats * 60) / this.clock.at(t).bpm,
    );
  }

  #schedule(
    t,
    page,
    slot,
    quantize,
    fade,
    clip = this.set.pages[page]?.slots[slot],
    adoptPalette = true,
    transition = clip?.transition === "auto"
      ? "crossfade"
      : (clip?.transition ?? "crossfade"),
  ) {
    if (!clip || this.disabled.has(clip.snapshot.scene)) return [];
    if (transition === "cut") {
      quantize = "bar";
      fade = 0;
    }
    const now = this.clock.at(t);
    let at = now.beat;
    if (quantize === "beat") {
      const since = now.beat - Math.floor(now.beat);
      at = since <= LATE ? now.beat : Math.floor(now.beat) + 1;
    } else if (quantize === "bar") {
      const barStart = now.beat - now.beatInBar;
      at = now.beatInBar <= LATE ? now.beat : barStart + 4;
    }
    this.pending = {
      page,
      slot,
      clip,
      at,
      fade: fade ?? clip.fade,
      adoptPalette,
      transition,
    };
    return this.#fire(t);
  }

  #fire(t) {
    const p = this.pending;
    if (!p) return [];
    const now = this.clock.at(t);
    if (now.beat + 1e-9 < p.at) return [];
    this.pending = null;
    this.#advancePalette(t);
    if (p.adoptPalette || this.palette === null)
      this.#setPalette(
        p.clip.palette === "custom" ? p.clip.snapshot.palette : p.clip.palette,
        t,
      );
    const clip = structuredClone(p.clip);
    clip.snapshot = this.#snapshot(clip.snapshot);
    this.live = {
      page: p.page,
      slot: p.slot,
      clip,
      base: p.clip.snapshot.params,
    };
    this.drift = null;
    this.safeShowing = false;
    // Energy is show state (D54): a trigger keeps the fader and autopilot's
    // build/breakdown/drop moves; only a fresh show starts from a clip's value.
    // Leaving the safe look resumes the energy from before it.
    if (this.resumeEnergy !== null) {
      this.energy = this.resumeEnergy;
      this.resumeEnergy = null;
    }
    this.autopilot.played(p.clip.id);
    return [
      {
        type: "load",
        snapshot: this.live.clip.snapshot,
        fadeSeconds: (p.fade * 60) / now.bpm,
        transition: p.transition,
        energy: this.energy,
        // Authored at the clip's stored energy: the family's energy curves
        // move parameters from there to the show energy.
        baseEnergy: p.clip.energy,
        page: p.page,
        slot: p.slot,
        clipId: p.clip.id,
      },
    ];
  }

  #manual(t) {
    this.autopilot.manual(this.clock.at(t).bar);
    this.drift = null;
  }

  // Params are resolved after loads: a rejected family can leave the previous
  // engine slot on screen without a live Show clip to update.
  currentSnapshot() {
    return (
      this.live?.clip.snapshot ?? (this.safeShowing ? this.safeFrame : null)
    );
  }

  safe(t, energy = this.energy) {
    this.pending = null;
    this.live = this.drift = null;
    this.safeShowing = true;
    this.#advancePalette(t);
    if (!this.paletteColors) this.#setPalette(this.safeSnapshot.palette, t);
    this.safeFrame.palette = this.paletteColors;
    return { type: "safe", snapshot: this.safeFrame, energy };
  }

  // First picture on a stage with nothing on screen (not a performer
  // action): a random autopilot clip in Random mode, else the page's first
  // clip. A fresh show starts at that clip's stored energy; a restored show
  // keeps its recovered energy (fresh: false).
  begin(t, { fresh = true } = {}) {
    const pool = this.#pool();
    const allowed = pool.filter((p) => p.clip.autopilot);
    const from = allowed.length ? allowed : pool;
    if (!from.length) return [this.safe(t, 0.15)];
    const pick = this.autopilot.randomMode
      ? from[Math.floor(this.autopilot.random() * from.length)]
      : from[0];
    if (fresh) this.energy = pick.clip.energy;
    return this.#schedule(
      t,
      this.page,
      pick.slot,
      "now",
      0,
      pick.clip,
      fresh,
      "crossfade",
    );
  }

  // Random mode: glide the live clip's continuous parameters (never its type
  // or stepped fields) to a random target near its authored values. The
  // set's clip stays untouched; the glide works on a private copy.
  #startDrift(t, bars, bpm) {
    const scene = this.live && this.scenes.get(this.live.clip.snapshot.scene);
    if (!scene) return;
    const params = this.live.clip.snapshot.params;
    const keys = [],
      from = [],
      to = [];
    for (const field of scene.schema) {
      if (field.key === scene.type?.key || field.step >= 1) continue;
      if (!(field.max > field.min)) continue;
      const span = (field.max - field.min) * DRIFT_SPAN;
      const target =
        this.live.base[field.key] + (this.autopilot.random() * 2 - 1) * span;
      keys.push(field.key);
      from.push(params[field.key]);
      to.push(Math.max(field.min, Math.min(field.max, target)));
    }
    if (keys.length)
      this.drift = { keys, from, to, t0: t, seconds: (bars * 4 * 60) / bpm };
  }

  // A family whose shaders failed is never scheduled again. If it is on
  // screen, cut to a playable clip on this page, else the safe look, else
  // any playable clip; with nothing playable left, black out.
  disable(id, t, onScreen = false) {
    if (this.live?.clip.snapshot.scene === id) this.live = this.drift = null;
    if (this.safeShowing && this.safeSnapshot.scene === id)
      this.safeShowing = false;
    if (this.disabled.has(id)) return [];
    this.disabled.add(id);
    if (this.pending?.clip.snapshot.scene === id) this.pending = null;
    if (!onScreen) return [];
    const pick = (page) => {
      const pool = this.#pool(page);
      return pool.find(({ clip }) => clip.autopilot) ?? pool[0];
    };
    const here = pick(this.page);
    if (here)
      return this.#schedule(
        t,
        this.page,
        here.slot,
        "now",
        0,
        here.clip,
        false,
        "crossfade",
      );
    if (!this.disabled.has(this.safeSnapshot.scene)) return [this.safe(t)];
    for (let page = 0; page < this.set.pages.length; page++) {
      const any = pick(page);
      if (any)
        return this.#schedule(
          t,
          page,
          any.slot,
          "now",
          0,
          any.clip,
          false,
          "crossfade",
        );
    }
    this.blackout = true;
    return [{ type: "blackout", on: true }];
  }

  command(action, t) {
    switch (action.type) {
      case "slot": {
        const clip = this.set.pages[this.page].slots[action.index];
        if (!clip || action.index >= SLOTS) return [];
        this.#manual(t);
        return this.#schedule(t, this.page, action.index, clip.quantize);
      }
      case "audition":
        // Play an unsaved clip (page/slot -1). Showing the first clip when
        // the control window opens is not a performer takeover (D53).
        if (!action.clip?.snapshot) return [];
        if (action.manual !== false) this.#manual(t);
        return this.#schedule(t, -1, -1, "now", action.clip.fade, action.clip);
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
        // The panic look is calm; the next clip resumes the show's energy.
        this.resumeEnergy ??= this.energy;
        this.energy = 0.15;
        this.speed = 1;
        Object.assign(this.shared, { hue: 0, zoom: 1, mirror: 1 });
        return [
          this.safe(t),
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
        this.resumeEnergy = null; // the performer sets the level from here
        this.energy = clamp01(
          action.value ??
            this.energy + ENERGY_STEP * Math.sign(action.direction),
        );
        return [{ type: "energy", value: this.energy, seconds: 0.25 }];
      case "palette":
        this.#manual(t);
        this.#setPalette(action.value, t);
        if (this.live) this.live.clip.snapshot.palette = this.paletteColors;
        if (this.safeShowing) this.safeFrame.palette = this.paletteColors;
        return this.currentSnapshot() ? [PARAMS] : [];
      case "speed":
        this.#manual(t);
        this.speed = this.speed === action.value ? 1 : action.value;
        return [{ type: "speed", value: this.speed }];
      case "autopilot":
        this.autopilot.enabled = action.on ?? !this.autopilot.enabled;
        this.set.autopilot.enabled = this.autopilot.enabled;
        if (this.autopilot.enabled) this.autopilot.manualUntil = -Infinity;
        return [];
      case "random":
        this.autopilot.randomMode = action.on ?? !this.autopilot.randomMode;
        this.set.autopilot.random = this.autopilot.randomMode;
        if (!this.autopilot.randomMode) this.drift = null;
        return [];
      case "freeze":
        this.freeze = action.on ?? !this.freeze;
        return [{ type: "freeze", on: this.freeze }];
      case "flash":
        this.flash = !!action.on;
        return [{ type: "flash", on: this.flash }];
      case "param": {
        // Live tweak of the playing clip from a stage fader. It changes the
        // performance, not the saved clip.
        if (!this.live) return [];
        this.#manual(t);
        this.live = {
          ...this.live,
          clip: {
            ...this.live.clip,
            snapshot: {
              ...this.live.clip.snapshot,
              params: {
                ...this.live.clip.snapshot.params,
                [action.key]: action.value,
              },
            },
          },
        };
        return [PARAMS];
      }
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
    let paramsChanged = this.#advancePalette(t);
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
        palette: this.palette,
        mood: this.set.pages[this.page].mood,
      });
      for (const a of auto) {
        if (a.type === "trigger")
          actions.push(
            ...this.#schedule(
              t,
              this.page,
              a.slot,
              a.quantize,
              a.fade,
              undefined,
              false,
              a.transition,
            ),
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
        } else if (a.type === "palette") this.#setPalette(a.id, t, a.beats);
        else if (a.type === "drift") this.#startDrift(t, a.bars, now.bpm);
      }
    }
    if (this.drift && this.live) {
      const d = this.drift;
      const x = Math.min(1, Math.max(0, (t - d.t0) / d.seconds));
      const k = x * x * (3 - 2 * x);
      const params = this.live.clip.snapshot.params;
      for (let i = 0; i < d.keys.length; i++)
        params[d.keys[i]] = d.from[i] + (d.to[i] - d.from[i]) * k;
      if (x >= 1) this.drift = null;
      paramsChanged = true;
    }
    if (paramsChanged && this.currentSnapshot()) actions.push(PARAMS);
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
      palette:
        typeof this.palette === "string"
          ? this.palette
          : this.palette && { ...this.palette },
      speed: this.speed,
      shared: { ...this.shared },
      blackout: this.blackout,
      freeze: this.freeze,
      flash: this.flash,
      autopilot: {
        enabled: this.autopilot.enabled,
        random: this.autopilot.randomMode,
        active: this.autopilot.active(clock.bar),
        handBackIn: Math.max(0, this.autopilot.manualUntil - clock.bar),
        nextChangeIn:
          this.autopilot.nextChange === null
            ? null
            : this.autopilot.nextChange - clock.bar,
      },
      disabled: [...this.disabled],
      clock,
    };
  }

  // Runtime state for crash recovery (decision D9), separate from the set.
  snapshot(t) {
    const clock = this.clock.at(t);
    const paletteColors = this.#colorsAt(t);
    return {
      page: this.page,
      live: this.live && { page: this.live.page, slot: this.live.slot },
      safeShowing: this.safeShowing,
      energy: this.energy,
      palette: structuredClone(this.palette),
      paletteColors: paletteColors && { ...paletteColors },
      paletteGlide: this.paletteGlide && {
        to: { ...this.paletteGlide.to },
        seconds: Math.max(
          0,
          this.paletteGlide.seconds - (t - this.paletteGlide.t0),
        ),
      },
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
    this.palette = structuredClone(saved.palette ?? null);
    this.paletteColors = saved.paletteColors
      ? { ...saved.paletteColors }
      : null;
    if (this.paletteColors) this.#rememberColors();
    this.paletteGlide =
      saved.paletteGlide?.seconds > 0 && this.paletteColors
        ? this.#glideTo(saved.paletteGlide.to, t, saved.paletteGlide.seconds)
        : null;
    this.live = this.drift = null;
    this.safeShowing = false;
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
      if (this.palette === null)
        this.#setPalette(
          clip.palette === "custom" ? clip.snapshot.palette : clip.palette,
          t,
        );
      const liveClip = structuredClone(clip);
      liveClip.snapshot = this.#snapshot(liveClip.snapshot);
      this.live = {
        page: saved.live.page,
        slot: saved.live.slot,
        clip: liveClip,
        base: clip.snapshot.params,
      };
      actions.unshift({
        type: "load",
        snapshot: this.live.clip.snapshot,
        fadeSeconds: 0,
        transition: "crossfade",
        energy: this.energy,
        baseEnergy: clip.energy,
        page: saved.live.page,
        slot: saved.live.slot,
        clipId: clip.id,
      });
    } else if (saved.safeShowing) actions.unshift(this.safe(t));
    return actions;
  }
}
