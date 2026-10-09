// Show controller: turns performer actions, the clock and autopilot into
// renderer actions. Pure (no DOM, no WebGL) so the output window can own it
// (decision D8) and tests can drive it with synthetic time.
import { ShowClock } from "./show-clock.mjs";
import { Autopilot } from "./autopilot.mjs";
import { KEYS } from "./show-set.mjs";
import { paletteById } from "./palettes.mjs";
import {
  catalogLooks,
  catalogClip,
  sortCatalog,
  ratingOf,
  ratingWeight,
  weightedChoice,
  autopilotMay,
} from "./catalog.mjs";

const LATE = 0.1; // a press this soon after a beat or bar line fires on it
const ENERGY_STEP = 0.1;
const DRIFT_SPAN = 0.12; // drift targets stay within ±12 % of each range
const PALETTE_BEATS = 4;
const PALETTE_KEYS = ["primary", "secondary", "accent"];
const PARAMS = Object.freeze({ type: "params" });
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const weightedPick = (pool, random) =>
  weightedChoice(pool, (p) => p.weight ?? 1, random);

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
    this.live = null; // { clip, base } — clip.id is the look id; base: authored params
    this.drift = null; // { keys, from, to, t0, seconds } while params glide
    this.scenes = new Map(scenes.map((s) => [s.id, s]));
    this.pending = null; // { clip, at, fade, adoptPalette, transition }
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
    // The look catalog (D65, D68) is the whole library: the grid keys and
    // autopilot both play its looks; a clip's id is its look id.
    this.#indexCatalog();
  }

  #indexCatalog() {
    this.catalog = catalogLooks([...this.scenes.values()], this.set.looks);
    this.catalogClips = new Map(
      this.catalog.map((look) => [look.id, catalogClip(look)]),
    );
  }

  // An edited set from the control (stage `set` message, local preview).
  updateSet(set) {
    const looksChanged = set.looks !== this.set.looks;
    this.set = set;
    this.autopilot.everyBars = set.autopilot.everyBars;
    this.autopilot.handBackBars = set.autopilot.handBackBars;
    this.autopilot.randomMode = set.autopilot.random;
    if (looksChanged) this.#indexCatalog();
  }

  // The clip for a look id, or null (unknown look or failed family).
  clipFor(id) {
    const clip = this.catalogClips.get(id);
    return clip && !this.disabled.has(clip.snapshot.scene) ? clip : null;
  }

  // Every look autopilot may play (D66, D68): never at 0 stars, only
  // favourites or only looks rated at least `minRating` when the set says
  // so; best first (the in-order walk), weighted by rating in random mode.
  #pool() {
    const { ratings, favorites: list, autopilot } = this.set;
    const favorites = new Set(list);
    const rules = {
      ratings,
      favorites,
      favoritesOnly: autopilot.favoritesOnly,
      minRating: autopilot.minRating,
    };
    const pool = [];
    for (const look of sortCatalog(this.catalog, ratings, favorites)) {
      if (this.disabled.has(look.sceneId) || !autopilotMay(look, rules))
        continue;
      pool.push({
        order: pool.length,
        clip: this.catalogClips.get(look.id),
        weight: ratingWeight(ratingOf(ratings, look.id)),
      });
    }
    // Favourites only, but none playable: fall back to the whole catalog
    // rather than standing still.
    if (!pool.length && (rules.favoritesOnly || rules.minRating > 0))
      for (const look of this.catalog)
        if (
          !this.disabled.has(look.sceneId) &&
          autopilotMay(look, { ratings, favorites })
        )
          pool.push({
            order: pool.length,
            clip: this.catalogClips.get(look.id),
            weight: ratingWeight(ratingOf(ratings, look.id)),
          });
    return pool;
  }

  // An autopilot trigger: always a catalog look, keeping the show palette.
  #autoTrigger(t, a) {
    return this.#schedule(t, a.clip, {
      quantize: a.quantize,
      fade: a.fade,
      adoptPalette: false,
      transition: a.transition,
    });
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
    clip,
    {
      quantize = clip?.quantize ?? "beat",
      fade = clip?.fade,
      adoptPalette = true,
      transition = clip?.transition === "auto"
        ? "crossfade"
        : (clip?.transition ?? "crossfade"),
    } = {},
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
    this.live = { clip, base: p.clip.snapshot.params };
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
  // action): a rating-weighted look autopilot may play in Random mode, else
  // the best one. A fresh show starts at that clip's stored energy; a
  // restored show keeps its recovered energy (fresh: false).
  begin(t, { fresh = true } = {}) {
    const from = this.#pool();
    if (!from.length) return [this.safe(t, 0.15)];
    const pick = this.autopilot.randomMode
      ? (weightedPick(from, this.autopilot.random) ?? from[0])
      : from[0];
    if (fresh) this.energy = pick.clip.energy;
    return this.#schedule(t, pick.clip, {
      quantize: "now",
      fade: 0,
      adoptPalette: fresh,
      transition: "crossfade",
    });
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
  // screen, cut to a look autopilot may play, else the safe look, else any
  // playable look; with nothing playable left, black out.
  disable(id, t, onScreen = false) {
    if (this.live?.clip.snapshot.scene === id) this.live = this.drift = null;
    if (this.safeShowing && this.safeSnapshot.scene === id)
      this.safeShowing = false;
    if (this.disabled.has(id)) return [];
    this.disabled.add(id);
    if (this.pending?.clip.snapshot.scene === id) this.pending = null;
    if (!onScreen) return [];
    const now = (clip) =>
      this.#schedule(t, clip, {
        quantize: "now",
        fade: 0,
        adoptPalette: false,
        transition: "crossfade",
      });
    const pick = weightedPick(this.#pool(), this.autopilot.random);
    if (pick) return now(pick.clip);
    if (!this.disabled.has(this.safeSnapshot.scene)) return [this.safe(t)];
    const any = this.catalog.find((look) => !this.disabled.has(look.sceneId));
    if (any) return now(this.catalogClips.get(any.id));
    this.blackout = true;
    return [{ type: "blackout", on: true }];
  }

  command(action, t) {
    switch (action.type) {
      case "slot": {
        // A grid key plays the look the control put on it (D68), on the
        // next beat with the look's fade.
        if (!(action.index >= 0 && action.index < KEYS)) return [];
        const clip = this.clipFor(this.set.keys[action.index]);
        if (!clip) return [];
        this.#manual(t);
        return this.#schedule(t, clip);
      }
      case "look": {
        // Play from the catalog (D68): the look's own palette, at once.
        const clip = this.clipFor(action.id);
        if (!clip) return [];
        if (action.manual !== false) this.#manual(t);
        return this.#schedule(t, clip, { quantize: "now" });
      }
      case "audition":
        // Play an unsaved clip (the editor's draft). Showing the first clip
        // when the control window opens is not a performer takeover (D53).
        if (!action.clip?.snapshot) return [];
        if (action.manual !== false) this.#manual(t);
        return this.#schedule(t, action.clip, {
          quantize: "now",
          fade: action.clip.fade,
        });
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
      case "next": {
        // Next (D66): autopilot's next pick now, on the next beat with the
        // regular fade. Not a takeover; works with autopilot off too.
        const pick = this.autopilot.next({
          bar: this.clock.at(t).bar,
          pool: this.#pool(),
          current: this.live,
        });
        return pick ? this.#autoTrigger(t, pick) : [];
      }
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
        current: this.live,
        energy: this.energy,
        event,
        palette: this.palette,
        mood: this.set.mood,
      });
      for (const a of auto) {
        if (a.type === "trigger") actions.push(...this.#autoTrigger(t, a));
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
      // A clip's id is its look id ("<scene>:<preset>" or "own-…"); an
      // unsaved editor draft has its own id and no catalog entry.
      live: this.live && {
        look: this.live.clip.id,
        name: this.live.clip.name,
        scene: this.live.clip.snapshot.scene,
      },
      pending: this.pending && {
        look: this.pending.clip.id,
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
        duration: this.autopilot.duration,
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
      live: this.live && { clipId: this.live.clip.id },
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
    // A catalog look comes back by its id (D65, D68); an unsaved draft
    // cannot.
    const clip = saved.live && this.clipFor(saved.live.clipId);
    if (clip) {
      if (this.palette === null)
        this.#setPalette(
          clip.palette === "custom" ? clip.snapshot.palette : clip.palette,
          t,
        );
      const liveClip = structuredClone(clip);
      liveClip.snapshot = this.#snapshot(liveClip.snapshot);
      this.live = { clip: liveClip, base: clip.snapshot.params };
      actions.unshift({
        type: "load",
        snapshot: this.live.clip.snapshot,
        fadeSeconds: 0,
        transition: "crossfade",
        energy: this.energy,
        baseEnergy: clip.energy,
        clipId: clip.id,
      });
    } else if (saved.safeShowing) actions.unshift(this.safe(t));
    return actions;
  }
}
