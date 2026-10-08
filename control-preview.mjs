// The control preview runs the same show controller as the stage, using the
// existing editor renderer. A stage takes over performance, not set editing.
import { Show } from "./show.mjs";
import { presetSnapshot } from "./session.mjs";
import { ShowClock } from "./show-clock.mjs";

export function performanceState(show, t) {
  return {
    runtime: show.snapshot(t),
    beat: show.clock.at(t).beat,
    period: show.clock.period,
    autopilot: {
      randomMode: show.autopilot.randomMode,
      manualUntil: show.autopilot.manualUntil,
      nextChange: show.autopilot.nextChange,
      nextDrift: show.autopilot.nextDrift,
    },
    disabled: [...show.disabled],
    clip: show.live ? structuredClone(show.live.clip) : null,
    freeze: show.freeze,
    flash: show.flash,
  };
}

export function restorePerformance(show, state, t) {
  show.clock = new ShowClock({
    bpm: state.runtime.clock.bpm,
    mode: state.runtime.clock.mode,
    latencyMs: state.runtime.clock.latencyMs,
    now: t,
  });
  show.clock.anchorBeat = state.beat;
  show.clock.period = state.period;
  show.pending = null;
  show.drift = null;
  show.disabled = new Set(state.disabled);
  Object.assign(show.autopilot, state.autopilot);
  const actions = show.restore(state.runtime, t);
  show.lastBar = show.clock.at(t).bar;
  // Include unsaved auditions and live parameter tweaks, not just the saved
  // slot. Transferring ownership must not silently replace the current look.
  if (state.clip) {
    show.live = {
      page: state.runtime.live?.page ?? -1,
      slot: state.runtime.live?.slot ?? -1,
      clip: state.clip,
      base: state.clip.snapshot.params,
      own: true,
    };
    const load = actions.find((a) => a.type === "load");
    if (load) load.snapshot = state.clip.snapshot;
    else
      actions.unshift({
        type: "load",
        snapshot: state.clip.snapshot,
        fadeSeconds: 0,
        energy: state.runtime.energy,
      });
  } else {
    show.live = null;
    actions.unshift({
      type: "safe",
      snapshot: show.safeSnapshot,
      energy: state.runtime.energy,
    });
  }
  actions.push(
    ...show.command({ type: "freeze", on: !!state.freeze }, t),
    ...show.command({ type: "flash", on: !!state.flash }, t),
  );
  return actions;
}

export class ControlPreview {
  constructor(engine, set, scenes, t) {
    this.engine = engine;
    this.show = new Show({
      set,
      scenes,
      now: t,
      safeSnapshot: presetSnapshot(scenes.find((s) => s.id === "interference")),
    });
    this.updateSet(set);
    this.apply([{ type: "shared", shared: this.show.shared }]);
  }
  updateSet(set) {
    this.show.set = set;
    this.show.autopilot.everyBars = set.autopilot.everyBars;
    this.show.autopilot.handBackBars = set.autopilot.handBackBars;
    this.show.autopilot.randomMode = set.autopilot.random;
    Object.assign(this.engine.options, {
      bloom: set.options.bloom,
      echo: set.options.echo,
      chroma: set.options.chroma,
      reducedMotion: set.options.reducedMotion,
      flashLimit: true,
    });
  }
  select(page, slot, clip, t) {
    // Editing a selected clip is immediate; performer slot triggers still
    // honor that clip's quantization and fade through Show.command.
    if (this.show.disabled.has(clip.snapshot.scene)) return;
    const copy = structuredClone(clip);
    this.show.page = page;
    this.apply(
      this.show.command({ type: "audition", clip: { ...copy, fade: 0 } }, t),
    );
    this.show.live.page = page;
    this.show.live.slot = slot;
  }
  edit(page, slot, clip, t) {
    if (
      !this.show.live ||
      this.show.live.clip.id !== clip.id ||
      this.engine.slots.at(-1)?.scene.id !== clip.snapshot.scene
    ) {
      this.select(page, slot, clip, t);
      return;
    }
    const copy = structuredClone(clip);
    this.show.live = {
      ...this.show.live,
      clip: copy,
      base: copy.snapshot.params,
      own: true,
    };
    this.show.drift = null;
    this.engine.setSnapshot(clip.snapshot);
  }
  command(action, t) {
    this.apply(this.show.command(action, t));
  }
  tick(t, dt) {
    this.apply(this.show.tick(t));
    this.engine.beat = this.show.clock.at(t).beat;
    this.engine.advance(dt, this.show.freeze);
  }
  status(t) {
    return this.show.status(t);
  }
  state(t) {
    return performanceState(this.show, t);
  }
  restore(state, t) {
    this.apply(restorePerformance(this.show, state, t));
  }
  apply(actions) {
    for (const action of actions) {
      switch (action.type) {
        case "load":
        case "safe":
          this.engine.setLevel(action.energy, action.fadeSeconds ?? 0);
          this.engine.load(action.snapshot, action.fadeSeconds ?? 0.4, {
            energy: action.energy,
            flashExempt: action.type === "safe",
          });
          break;
        case "energy":
          this.engine.setLevel(action.value, action.seconds);
          break;
        case "speed":
          this.engine.speed = action.value;
          break;
        case "shared":
          this.engine.options.brightness = action.shared.master;
          this.engine.options.kaleido = action.shared.mirror;
          this.engine.view.hue = action.shared.hue;
          this.engine.view.zoom = action.shared.zoom;
          break;
        case "blackout":
          this.engine.blackoutTarget = action.on ? 1 : 0;
          break;
        case "flash":
          this.engine.flashHeld = action.on;
          break;
        case "params":
          this.engine.setSnapshot(action.snapshot);
          break;
        // Freeze is owned by Show and applied in tick, including safe reset.
      }
    }
  }
}
