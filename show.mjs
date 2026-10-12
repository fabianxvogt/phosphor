// Show controller: turns performer actions, the clock and autopilot into
// renderer actions. Pure (no DOM, no WebGL) so the output window can own it
// (decision D8) and tests can drive it with synthetic time.
import { ShowClock } from "./show-clock.mjs";
import { Autopilot } from "./autopilot.mjs";
import { KEYS } from "./show-set.mjs";
import { paletteById } from "./palettes.mjs";
import {
  GLOBAL_EFFECTS,
  effectDefinitions,
  defaultPattern,
  validatePattern,
  validateRhythm,
} from "./rhythm.mjs";
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
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rhythmKey = (target) =>
  target.scope === "global"
    ? "global"
    : `${target.scope}:${target.scope === "look" ? target.look : target.family}`;
const sameSteps = (a, b) =>
  a?.effect === b?.effect &&
  a?.division === b?.division &&
  a?.length === b?.length &&
  same(a?.steps, b?.steps);
const samePatternTiming = (a, b) =>
  a?.style === b?.style &&
  a?.tracks?.length === b?.tracks?.length &&
  a?.tracks?.every((track, i) => sameSteps(track, b.tracks[i]));
// Authored phrase lengths in bars: quiet development gets more space than
// a driving passage. Track loops themselves are never reset at a phrase.
const RHYTHM_PHRASES = [
  { bars: 8, style: "driving" },
  { bars: 16, style: "restrained" },
  { bars: 8, style: "driving" },
  { bars: 32, style: "accented" },
];
function rhythmPhrase(position) {
  const bar = Math.max(0, Math.floor(position / 4));
  const cycle = Math.floor(bar / 64);
  let within = bar % 64;
  for (let i = 0; i < RHYTHM_PHRASES.length; i++) {
    const phrase = RHYTHM_PHRASES[i];
    if (within < phrase.bars)
      return {
        index: cycle * RHYTHM_PHRASES.length + i,
        style: phrase.style,
        start: (bar - within) * 4,
      };
    within -= phrase.bars;
  }
}
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
    if (set.palette) this.#setPalette(set.palette, now, 0);
    this.resumeEnergy = null; // energy to resume after the safe look
    this.speed = 1;
    this.shared = { ...set.shared };
    this.blackout = false;
    this.freeze = false;
    this.pausedAt = null;
    this.flash = false;
    this.lastBar = null;
    this.disabled = new Set(); // families whose shaders failed
    this.rhythmDesired = validateRhythm(set.rhythm, scenes);
    this.set.rhythm = this.rhythmDesired;
    this.rhythmApplied = structuredClone(this.rhythmDesired);
    this.rhythmOverrides = this.#ownRhythms(set);
    this.rhythmAppliedOverrides = structuredClone(this.rhythmOverrides);
    this.rhythmPending = new Map();
    this.rhythmStyle = "driving";
    this.rhythmPhrase = null;
    this.rhythmDrafts = {}; // retained while an outgoing draft fades
    this.rhythmFrameOverrides = { ...this.rhythmAppliedOverrides };
    this.rhythmActivationBeats = { global: {}, families: {}, overrides: {} };
    this.rhythmFrameActivations = null;
    this.rhythmActivationOrigin = null;
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
  updateSet(set, t = this.rhythmTime ?? this.clock.last) {
    if (set.palette && !same(set.palette, this.palette)) {
      this.#setPalette(set.palette, t, 0);
      if (this.live) this.live.clip.snapshot.palette = this.paletteColors;
      if (this.safeShowing) this.safeFrame.palette = this.paletteColors;
      this.paletteDirty = true;
    }
    const looksChanged = set.looks !== this.set.looks;
    const desired = validateRhythm(set.rhythm, [...this.scenes.values()]);
    const overrides = this.#ownRhythms(set);
    if (!same(desired.global, this.rhythmDesired.global))
      this.#queueRhythm(
        { scope: "global", pattern: desired.global, quantize: "bar" },
        t,
      );
    for (const [family, pattern] of Object.entries(desired.families))
      if (!same(pattern, this.rhythmDesired.families[family]))
        this.#queueRhythm(
          { scope: "family", family, pattern, quantize: "bar" },
          t,
        );
    for (const look of set.looks ?? [])
      if (
        !same(overrides[look.id] ?? null, this.rhythmOverrides[look.id] ?? null)
      )
        this.#queueRhythm(
          {
            scope: "look",
            look: look.id,
            family: look.snapshot.scene,
            pattern: overrides[look.id] ?? null,
            quantize: "bar",
          },
          t,
        );
    const ownIds = new Set((set.looks ?? []).map((look) => look.id));
    for (const look of Object.keys(this.rhythmAppliedOverrides))
      if (!ownIds.has(look)) {
        delete this.rhythmAppliedOverrides[look];
        this.rhythmPending.delete(`look:${look}`);
      }
    this.rhythmDesired = desired;
    this.rhythmOverrides = overrides;
    set.rhythm = desired;
    this.#refreshRhythmOverrides();
    this.set = set;
    this.autopilot.everyBars = set.autopilot.everyBars;
    this.autopilot.handBackBars = set.autopilot.handBackBars;
    this.autopilot.randomMode = set.autopilot.random;
    if (looksChanged) this.#indexCatalog();
  }

  #ownRhythms(set) {
    const result = {};
    for (const look of set.looks ?? [])
      if (look.rhythm != null)
        result[look.id] = validatePattern(
          look.rhythm,
          effectDefinitions(this.scenes.get(look.snapshot.scene)),
        );
    return result;
  }

  #refreshRhythmOverrides() {
    this.rhythmFrameOverrides = {
      ...this.rhythmAppliedOverrides,
      ...this.rhythmDrafts,
    };
  }

  #markRhythmActivation(target, effect, at) {
    const scope =
      target.scope === "global"
        ? this.rhythmActivationBeats.global
        : target.scope === "family"
          ? (this.rhythmActivationBeats.families[target.family] ??= {})
          : (this.rhythmActivationBeats.overrides[target.look] ??= {});
    scope[effect] = at;
    this.rhythmFrameActivations = null;
  }

  #activatePattern(target, pattern, at) {
    const tracks =
      pattern?.tracks ??
      this.rhythmApplied.families[target.family]?.tracks ??
      [];
    for (const track of tracks)
      this.#markRhythmActivation(target, track.effect, at);
  }

  #activationFrame(clock) {
    if (
      !this.rhythmFrameActivations ||
      clock.origin !== this.rhythmActivationOrigin
    ) {
      const relative = (map) =>
        Object.fromEntries(
          Object.entries(map).map(([effect, at]) => [
            effect,
            at - clock.origin,
          ]),
        );
      const groups = (map) =>
        Object.fromEntries(
          Object.entries(map).map(([id, entries]) => [id, relative(entries)]),
        );
      this.rhythmFrameActivations = {
        global: relative(this.rhythmActivationBeats.global),
        families: groups(this.rhythmActivationBeats.families),
        overrides: groups(this.rhythmActivationBeats.overrides),
      };
      this.rhythmActivationOrigin = clock.origin;
    }
    return this.rhythmFrameActivations;
  }

  #appliedRhythm(target) {
    if (target.scope === "global") return this.rhythmApplied.global;
    if (target.scope === "family")
      return this.rhythmApplied.families[target.family];
    return (
      this.rhythmAppliedOverrides[target.look] ??
      this.rhythmApplied.families[target.family]
    );
  }

  #applyRhythm(target, pattern) {
    if (target.scope === "global")
      this.rhythmApplied = { ...this.rhythmApplied, global: pattern };
    else if (target.scope === "family")
      this.rhythmApplied = {
        ...this.rhythmApplied,
        families: { ...this.rhythmApplied.families, [target.family]: pattern },
      };
    else {
      if (pattern === null) delete this.rhythmAppliedOverrides[target.look];
      else this.rhythmAppliedOverrides[target.look] = pattern;
      this.#refreshRhythmOverrides();
    }
  }

  #nextRhythmPoint(clock, quantize, division = 1) {
    return quantize === "bar"
      ? clock.origin + (Math.floor(clock.position / 4 + 1e-8) + 1) * 4
      : clock.origin +
          (Math.floor(clock.position * division + 1e-8) + 1) / division;
  }

  #queueRhythm(target, t) {
    const key = rhythmKey(target);
    const previous = this.rhythmPending.get(key);
    const clock = this.clock.at(t);
    const pattern = target.pattern;
    let current = this.#appliedRhythm(target);
    if (!current) {
      this.#applyRhythm(target, pattern);
      this.#activatePattern(target, pattern, clock.beat);
      this.rhythmPending.delete(key);
      return;
    }
    if (pattern === null) {
      this.rhythmPending.set(key, {
        ...target,
        at: this.#nextRhythmPoint(clock, "bar"),
        trackAt: null,
      });
      return;
    }
    // Protecting the automatic phrase preserves the actual visible grid,
    // including its longer quiet loops, rather than reverting to the saved
    // driving template before the edited step reaches its grid point.
    if (current.mode === "auto" && current.style !== this.rhythmStyle) {
      const definitions =
        target.scope === "global"
          ? GLOBAL_EFFECTS
          : effectDefinitions(this.scenes.get(target.family));
      current = defaultPattern(definitions, this.rhythmStyle);
    }
    const desiredById = new Map(
      pattern.tracks.map((track) => [track.effect, track]),
    );
    // Strength, mute and envelope duration change without scheduling a new
    // trigger. Existing step placement stays in place until its grid point.
    const immediate = {
      ...current,
      mode: pattern.mode === "locked" ? "locked" : current.mode,
      tracks: current.tracks.map((track) => {
        const desired = desiredById.get(track.effect);
        return desired
          ? {
              ...track,
              strength: desired.strength,
              muted: desired.muted,
              duration: desired.duration,
            }
          : track;
      }),
    };
    this.#applyRhythm(target, immediate);
    if (same(immediate, pattern)) {
      this.rhythmPending.delete(key);
      return;
    }
    // Only equal-sized, equal-division step edits can be applied piecemeal.
    // A topology/style change is a complete pattern change on the next 1.
    const topology =
      immediate.mode !== pattern.mode ||
      immediate.style !== pattern.style ||
      immediate.tracks.length !== pattern.tracks.length ||
      immediate.tracks.some((track) => {
        const desired = desiredById.get(track.effect);
        return (
          !desired ||
          track.length !== desired.length ||
          track.division !== desired.division
        );
      });
    const quantize = topology
      ? "bar"
      : target.quantize === "now"
        ? (previous?.quantize ?? "bar")
        : target.quantize;
    let trackAt = null;
    let at;
    if (quantize === "step") {
      trackAt = pattern.tracks
        .filter(
          (track) =>
            !sameSteps(
              track,
              immediate.tracks.find((old) => old.effect === track.effect),
            ),
        )
        .map((track) => {
          const oldAt = previous?.trackAt?.find(
            (entry) => entry.effect === track.effect,
          );
          const oldTrack = previous?.pattern?.tracks.find(
            (entry) => entry.effect === track.effect,
          );
          return {
            effect: track.effect,
            at:
              oldAt && sameSteps(track, oldTrack)
                ? oldAt.at
                : this.#nextRhythmPoint(clock, "step", track.division),
          };
        });
      at = Math.min(...trackAt.map((entry) => entry.at));
    } else {
      at =
        previous?.quantize === "bar" &&
        samePatternTiming(previous.pattern, pattern)
          ? previous.at
          : this.#nextRhythmPoint(clock, "bar");
    }
    this.rhythmPending.set(key, { ...target, quantize, at, trackAt });
  }

  #rhythmCommand(action, t) {
    if (
      !["global", "family", "look"].includes(action.scope) ||
      !["now", "step", "bar"].includes(action.quantize ?? "bar")
    )
      return;
    let family = action.family ?? this.live?.clip.snapshot.scene;
    let look = null;
    if (action.scope === "look") {
      look = this.set.looks.find((entry) => entry.id === action.look);
      if (!look) return;
      family = look.snapshot.scene;
    }
    if (action.scope !== "global" && !this.scenes.has(family)) return;
    const definitions =
      action.scope === "global"
        ? GLOBAL_EFFECTS
        : effectDefinitions(this.scenes.get(family));
    const pattern =
      action.scope === "look" && action.pattern === null
        ? null
        : validatePattern(action.pattern, definitions);
    if (action.scope === "global")
      this.rhythmDesired = { ...this.rhythmDesired, global: pattern };
    else if (action.scope === "family")
      this.rhythmDesired = {
        ...this.rhythmDesired,
        families: { ...this.rhythmDesired.families, [family]: pattern },
      };
    else {
      if (pattern === null) delete this.rhythmOverrides[look.id];
      else this.rhythmOverrides[look.id] = pattern;
      // Replace the saved look so catalog invalidation notices the edit.
      this.set.looks = this.set.looks.map((entry) =>
        entry.id === look.id ? { ...entry, rhythm: pattern } : entry,
      );
      this.#indexCatalog();
    }
    this.set.rhythm = this.rhythmDesired;
    this.#queueRhythm(
      {
        scope: action.scope,
        family,
        look: look?.id,
        pattern,
        quantize: action.quantize ?? "bar",
      },
      t,
    );
  }

  #advanceRhythm(t) {
    this.rhythmTime = t;
    const clock = this.clock.at(t);
    for (const [key, pending] of this.rhythmPending) {
      if (clock.beat + 1e-8 < pending.at) continue;
      if (pending.trackAt) {
        const due = new Set(
          pending.trackAt
            .filter((entry) => clock.beat + 1e-8 >= entry.at)
            .map((entry) => entry.effect),
        );
        const current = this.#appliedRhythm(pending);
        const tracks = current.tracks.map((track) =>
          due.has(track.effect)
            ? pending.pattern.tracks.find(
                (entry) => entry.effect === track.effect,
              )
            : track,
        );
        this.#applyRhythm(pending, {
          ...current,
          style: pending.pattern.style,
          mode: pending.pattern.mode,
          tracks,
        });
        for (const entry of pending.trackAt)
          if (due.has(entry.effect))
            this.#markRhythmActivation(pending, entry.effect, entry.at);
        pending.trackAt = pending.trackAt.filter(
          (entry) => !due.has(entry.effect),
        );
        if (pending.trackAt.length) {
          pending.at = Math.min(...pending.trackAt.map((entry) => entry.at));
          continue;
        }
      } else {
        this.#applyRhythm(pending, pending.pattern);
        this.#activatePattern(pending, pending.pattern, pending.at);
      }
      this.rhythmPending.delete(key);
    }
    const phrase = rhythmPhrase(clock.position);
    if (this.rhythmPhrase === null) this.rhythmPhrase = phrase.index;
    if (phrase.index !== this.rhythmPhrase) {
      this.rhythmPhrase = phrase.index;
      if (
        this.autopilot.active(clock.bar) &&
        this.rhythmStyle !== phrase.style
      ) {
        this.rhythmStyle = phrase.style;
        const at = phrase.start + clock.origin;
        if (this.rhythmApplied.global.mode === "auto")
          this.#activatePattern(
            { scope: "global" },
            this.rhythmApplied.global,
            at,
          );
        for (const [family, pattern] of Object.entries(
          this.rhythmApplied.families,
        ))
          if (pattern.mode === "auto")
            this.#activatePattern({ scope: "family", family }, pattern, at);
        for (const [look, pattern] of Object.entries(
          this.rhythmAppliedOverrides,
        ))
          if (pattern.mode === "auto")
            this.#activatePattern({ scope: "look", look }, pattern, at);
        for (const [look, pattern] of Object.entries(this.rhythmDrafts))
          if (pattern.mode === "auto")
            this.#activatePattern({ scope: "look", look }, pattern, at);
      }
    }
    return clock;
  }

  // Renderer boundary. settings/overrides are the applied immutable pattern
  // references. activations carries per-effect music positions; pass the
  // selected scope map as samplePattern(..., { activation }) so a delayed
  // edit cannot inject an event from before its quantized application point.
  rhythmFrame(t) {
    const clock = this.#advanceRhythm(t);
    return {
      beat: clock.beat,
      origin: clock.origin,
      settings: this.rhythmApplied,
      overrides: this.rhythmFrameOverrides,
      activations: this.#activationFrame(clock),
      style: this.rhythmStyle,
      enabled: !this.safeShowing,
    };
  }

  // The editor updates a running draft's parameters without loading a new
  // renderer slot. Its rhythm follows that explicit preview, but never
  // becomes an own-look override until a saved rhythm command says so.
  refreshDraftRhythm(clip, t = this.rhythmTime ?? this.clock.last) {
    if (
      !clip?.snapshot ||
      clip.id !== this.live?.clip.id ||
      typeof clip.id !== "string" ||
      clip.id.length > 200 ||
      ["__proto__", "constructor", "prototype"].includes(clip.id)
    )
      return false;
    const scene = this.scenes.get(clip.snapshot.scene);
    if (!scene) return false;
    const pattern =
      clip.rhythm == null
        ? null
        : validatePattern(clip.rhythm, effectDefinitions(scene));
    const previous =
      this.rhythmDrafts[clip.id] ??
      this.rhythmAppliedOverrides[clip.id] ??
      this.rhythmApplied.families[scene.id];
    if (pattern === null) delete this.rhythmDrafts[clip.id];
    else this.rhythmDrafts[clip.id] = pattern;
    if (!samePatternTiming(previous, pattern))
      this.#activatePattern(
        { scope: "look", look: clip.id, family: scene.id },
        pattern,
        this.clock.at(t).beat,
      );
    const drafts = Object.keys(this.rhythmDrafts);
    for (const id of drafts.slice(0, Math.max(0, drafts.length - 16))) {
      delete this.rhythmDrafts[id];
      if (!this.set.looks.some((look) => look.id === id))
        delete this.rhythmActivationBeats.overrides[id];
    }
    this.#refreshRhythmOverrides();
    this.rhythmFrameActivations = null;
    return true;
  }

  #restoreRhythm(saved, t) {
    this.rhythmPending.clear();
    this.rhythmDrafts = {};
    if (!saved) {
      this.#refreshRhythmOverrides();
      return;
    }
    try {
      const scenes = [...this.scenes.values()];
      const previousDesired = validateRhythm(saved.desired, scenes);
      const applied = validateRhythm(saved.applied, scenes);
      const previousOverrides = {};
      const appliedOverrides = {};
      for (const look of this.set.looks) {
        const definitions = effectDefinitions(
          this.scenes.get(look.snapshot.scene),
        );
        if (saved.overrides?.[look.id] != null)
          previousOverrides[look.id] = validatePattern(
            saved.overrides[look.id],
            definitions,
          );
        if (saved.appliedOverrides?.[look.id] != null)
          appliedOverrides[look.id] = validatePattern(
            saved.appliedOverrides[look.id],
            definitions,
          );
      }
      this.rhythmApplied = applied;
      this.rhythmAppliedOverrides = appliedOverrides;
      this.rhythmActivationBeats = { global: {}, families: {}, overrides: {} };
      this.rhythmFrameActivations = null;
      const restoreActivations = (target, definitions, source) => {
        for (const definition of definitions) {
          const at = source?.[definition.id];
          if (Number.isFinite(at) && at >= 0 && at <= this.clock.beatAt(t))
            this.#markRhythmActivation(target, definition.id, at);
        }
      };
      restoreActivations(
        { scope: "global" },
        GLOBAL_EFFECTS,
        saved.activations?.global,
      );
      for (const [family, scene] of this.scenes)
        restoreActivations(
          { scope: "family", family },
          effectDefinitions(scene),
          saved.activations?.families?.[family],
        );
      for (const look of this.set.looks)
        restoreActivations(
          { scope: "look", look: look.id },
          effectDefinitions(this.scenes.get(look.snapshot.scene)),
          saved.activations?.overrides?.[look.id],
        );
      this.rhythmStyle = ["restrained", "driving", "accented"].includes(
        saved.style,
      )
        ? saved.style
        : "driving";
      this.rhythmPhrase =
        Number.isSafeInteger(saved.phrase) && saved.phrase >= 0
          ? saved.phrase
          : null;
      const savedDesiredFor = (target) =>
        target.scope === "global"
          ? previousDesired.global
          : target.scope === "family"
            ? previousDesired.families[target.family]
            : (previousOverrides[target.look] ?? null);
      const currentDesiredFor = (target) =>
        target.scope === "global"
          ? this.rhythmDesired.global
          : target.scope === "family"
            ? this.rhythmDesired.families[target.family]
            : (this.rhythmOverrides[target.look] ?? null);
      for (const raw of Array.isArray(saved.pending)
        ? saved.pending.slice(0, 256)
        : []) {
        if (
          !["global", "family", "look"].includes(raw?.scope) ||
          !["step", "bar"].includes(raw.quantize) ||
          !Number.isFinite(raw.at)
        )
          continue;
        const own =
          raw.scope === "look"
            ? this.set.looks.find((look) => look.id === raw.look)
            : null;
        const family = own?.snapshot.scene ?? raw.family;
        if (raw.scope !== "global" && !this.scenes.has(family)) continue;
        if (raw.scope === "look" && !own) continue;
        const target = { scope: raw.scope, family, look: own?.id };
        // A set saved after this runtime snapshot is authoritative. Never
        // restore an older desired pattern over a newer protected edit.
        if (!same(savedDesiredFor(target), currentDesiredFor(target))) continue;
        const definitions =
          raw.scope === "global"
            ? GLOBAL_EFFECTS
            : effectDefinitions(this.scenes.get(family));
        const pattern =
          raw.pattern === null && raw.scope === "look"
            ? null
            : validatePattern(raw.pattern, definitions);
        if (!same(pattern, currentDesiredFor(target))) continue;
        let trackAt = null;
        if (raw.quantize === "step" && Array.isArray(raw.trackAt) && pattern) {
          trackAt = raw.trackAt
            .filter(
              (entry) =>
                Number.isFinite(entry?.at) &&
                pattern.tracks.some((track) => track.effect === entry.effect),
            )
            .map((entry) => ({ effect: entry.effect, at: entry.at }));
          if (!trackAt.length) continue;
        }
        const key = rhythmKey(target);
        this.rhythmPending.set(key, {
          ...target,
          pattern,
          quantize: raw.quantize,
          at: trackAt ? Math.min(...trackAt.map((entry) => entry.at)) : raw.at,
          trackAt,
        });
      }
      const targets = [{ scope: "global", pattern: this.rhythmDesired.global }];
      for (const [family, pattern] of Object.entries(
        this.rhythmDesired.families,
      ))
        targets.push({ scope: "family", family, pattern });
      for (const look of this.set.looks)
        targets.push({
          scope: "look",
          family: look.snapshot.scene,
          look: look.id,
          pattern: this.rhythmOverrides[look.id] ?? null,
        });
      for (const target of targets)
        if (!same(savedDesiredFor(target), currentDesiredFor(target)))
          this.#queueRhythm({ ...target, quantize: "bar" }, t);
      this.#refreshRhythmOverrides();
    } catch {
      // Runtime is advisory recovery data. A malformed old snapshot does
      // not invalidate the independently validated, portable show set.
      this.rhythmApplied = structuredClone(this.rhythmDesired);
      this.rhythmAppliedOverrides = structuredClone(this.rhythmOverrides);
      this.rhythmPending.clear();
      this.rhythmStyle = "driving";
      this.rhythmPhrase = null;
      this.rhythmActivationBeats = { global: {}, families: {}, overrides: {} };
      this.rhythmFrameActivations = null;
      this.#refreshRhythmOverrides();
    }
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
    if (!this.paletteColors || beats <= 0) {
      if (this.paletteColors) Object.assign(this.paletteColors, colors);
      else this.paletteColors = { ...colors };
      this.paletteGlide = null;
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
    if (!this.set.palette && (p.adoptPalette || this.palette === null))
      this.#setPalette(
        p.clip.palette === "custom" ? p.clip.snapshot.palette : p.clip.palette,
        t,
      );
    const clip = structuredClone(p.clip);
    clip.snapshot = this.#snapshot(clip.snapshot);
    this.live = { clip, base: p.clip.snapshot.params };
    if (
      clip.rhythm != null &&
      !this.set.looks.some((look) => look.id === clip.id)
    ) {
      this.refreshDraftRhythm(clip, t);
    } else if (Object.hasOwn(this.rhythmDrafts, clip.id)) {
      delete this.rhythmDrafts[clip.id];
      this.#refreshRhythmOverrides();
    }
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
    if (action.type === "pause") {
      const paused = action.on ?? !this.clock.paused;
      if (paused === this.clock.paused) return [];
      if (paused) this.pausedAt = t;
      else {
        const elapsed = Math.max(0, t - this.pausedAt);
        if (this.drift) this.drift.t0 += elapsed;
        if (this.paletteGlide) this.paletteGlide.t0 += elapsed;
        this.pausedAt = null;
      }
      this.clock.setPaused(t, paused);
      return [{ type: "pause", on: paused }];
    }
    if (this.clock.paused) t = this.pausedAt;
    switch (action.type) {
      case "rhythm":
        this.#advanceRhythm(t);
        this.#rhythmCommand(action, t);
        return [];
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
        // Pending changes follow the corrected 1/subdivision, rather than
        // an old bar line hidden behind the performer's phase correction.
        for (const pending of this.rhythmPending.values()) {
          const clock = this.clock.at(t);
          if (pending.trackAt) {
            for (const entry of pending.trackAt) {
              const track = pending.pattern.tracks.find(
                (track) => track.effect === entry.effect,
              );
              entry.at = this.#nextRhythmPoint(clock, "step", track.division);
            }
            pending.at = Math.min(...pending.trackAt.map((entry) => entry.at));
          } else pending.at = this.#nextRhythmPoint(clock, "bar");
        }
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
        if (this.set.palette) this.set.palette = structuredClone(action.value);
        this.#setPalette(action.value, t, action.beats ?? PALETTE_BEATS);
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
    if (this.clock.paused) return [];
    if (tracker) this.clock.track(t, tracker);
    this.#advanceRhythm(t);
    let paramsChanged = this.#advancePalette(t) || this.paletteDirty;
    this.paletteDirty = false;
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
        } else if (a.type === "palette" && !this.set.palette)
          this.#setPalette(a.id, t, a.beats);
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
    const clock = this.#advanceRhythm(t);
    const scene = this.live && this.scenes.get(this.live.clip.snapshot.scene);
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
      paused: this.clock.paused,
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
      rhythm: {
        beat: clock.beat,
        origin: clock.origin,
        position: clock.position,
        style: this.rhythmStyle,
        enabled: !this.safeShowing,
        // Desired saved state is separate from applied playback and drafts.
        // The control may persist settings/overrides; drafts is ephemeral.
        settings: this.rhythmDesired,
        applied: this.rhythmApplied,
        overrides: this.rhythmOverrides,
        drafts: this.rhythmDrafts,
        activations: this.#activationFrame(clock),
        appliedOverrides: this.rhythmFrameOverrides,
        pending: [...this.rhythmPending.values()].map((pending) => ({
          scope: pending.scope,
          ...(pending.family ? { family: pending.family } : {}),
          ...(pending.look ? { look: pending.look } : {}),
          at: pending.at,
          beats: Math.max(0, pending.at - clock.beat),
          quantize: pending.quantize,
          ...(pending.trackAt
            ? { effects: pending.trackAt.map((entry) => entry.effect) }
            : {}),
        })),
        live: this.live
          ? {
              family: this.live.clip.snapshot.scene,
              look: this.live.clip.id,
              name: this.live.clip.name,
              variant: scene?.type
                ? this.live.clip.snapshot.params[scene.type.key]
                : null,
              own: this.set.looks.some((look) => look.id === this.live.clip.id),
            }
          : null,
      },
      clock,
    };
  }

  // Runtime state for crash recovery (decision D9), separate from the set.
  snapshot(t) {
    if (this.clock.paused) t = this.pausedAt;
    this.#advanceRhythm(t);
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
      clock: this.clock.snapshot(t),
      rhythm: {
        desired: structuredClone(this.rhythmDesired),
        applied: structuredClone(this.rhythmApplied),
        overrides: structuredClone(this.rhythmOverrides),
        appliedOverrides: structuredClone(this.rhythmAppliedOverrides),
        activations: structuredClone(this.rhythmActivationBeats),
        pending: structuredClone([...this.rhythmPending.values()]),
        style: this.rhythmStyle,
        phrase: this.rhythmPhrase,
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
    this.clock.restore(saved.clock, t);
    this.pausedAt = this.clock.paused ? t : null;
    if (this.set.palette) {
      // Set data wins over a stale runtime recovered after a reload.
      this.palette = null;
      this.#setPalette(this.set.palette, t, 0);
    }
    this.rhythmTime = t;
    this.#restoreRhythm(saved.rhythm, t);
    const actions = [
      { type: "shared", shared: { ...this.shared } },
      { type: "speed", value: this.speed },
      { type: "blackout", on: this.blackout },
      { type: "pause", on: this.clock.paused },
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
