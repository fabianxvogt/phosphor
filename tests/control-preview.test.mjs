import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { Show } from "../show.mjs";
import { initialShowSet } from "../show-set.mjs";
import { presetSnapshot } from "../session.mjs";
import { paletteById } from "../palettes.mjs";
import {
  ControlPreview,
  performanceState,
  restorePerformance,
  performanceBeat,
} from "../control-preview.mjs";
import { defaultPattern, samplePattern } from "../rhythm.mjs";

test("handoff retains an unsaved muted rhythm and its exact look identity", () => {
  const show = makeShow();
  const clip = structuredClone(
    [...show.catalogClips.values()].find(
      (clip) => clip.snapshot.scene === "quasicrystal",
    ),
  );
  clip.id = "draft-rhythm";
  const scene = scenes.find((s) => s.id === clip.snapshot.scene);
  clip.rhythm = defaultPattern(scene.rhythm);
  clip.rhythm.mode = "locked";
  clip.rhythm.tracks.forEach((track) => {
    track.muted = true;
  });
  show.command({ type: "audition", clip }, 0);
  const restored = makeShow();
  const actions = restorePerformance(restored, performanceState(show, 0.1), 10);
  assert.equal(actions.find((a) => a.type === "load").clipId, clip.id);
  assert.deepEqual(restored.rhythmFrame(10).overrides[clip.id], clip.rhythm);
  assert.equal(
    restored.set.looks.some((look) => look.id === clip.id),
    false,
  );
});

test("preview clock fills sparse stage packets without dropping sixteenths at 200 BPM", () => {
  const defs = [
    {
      id: "pulse",
      slot: 0,
      defaults: {
        division: 4,
        length: 4,
        steps: [1, 1, 1, 1],
        strength: 1,
        duration: 0.1,
        muted: false,
      },
    },
  ];
  const pattern = defaultPattern(defs);
  let received = 0,
    previous = 0,
    hits = 0;
  let message = { performance: { beat: 0, period: 0.3 } };
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    if (t - received >= 0.1) {
      received = t;
      message = { performance: { beat: t / 0.3, period: 0.3 } };
    }
    const beat = performanceBeat(message, received, t);
    assert.ok(beat > previous);
    if (samplePattern(pattern, defs, beat, previous).hits[0]) hits++;
    previous = beat;
  }
  assert.equal(hits, 13);
});

test("handoff keeps a saved own-look rhythm edit above the clip's stale copy", () => {
  const show = makeShow();
  const own = structuredClone(
    [...show.catalogClips.values()].find(
      (clip) => clip.snapshot.scene === "quasicrystal",
    ),
  );
  own.id = "own-handoff";
  own.rhythm = defaultPattern(
    scenes.find((s) => s.id === "quasicrystal").rhythm,
  );
  own.rhythm.mode = "locked";
  own.rhythm.tracks[0].strength = 0.1;
  const set = structuredClone(show.set);
  set.looks.push(own);
  show.updateSet(set, 0);
  show.command({ type: "look", id: own.id, immediate: true }, 0);
  show.tick(2);
  const edited = structuredClone(own.rhythm);
  edited.tracks[0].strength = 0.9;
  show.command(
    {
      type: "rhythm",
      scope: "look",
      look: own.id,
      pattern: edited,
      quantize: "now",
    },
    2.1,
  );
  const restored = makeShow();
  restored.updateSet(structuredClone(show.set), 10);
  restorePerformance(restored, performanceState(show, 2.1), 10);
  assert.equal(
    restored.rhythmFrame(10).overrides[own.id].tracks[0].strength,
    0.9,
  );
  assert.equal(restored.rhythmDrafts[own.id], undefined);
});

function makeShow() {
  const set = initialShowSet(scenes);
  set.clock.mode = "manual";
  set.autopilot.enabled = false;
  return new Show({
    set,
    scenes,
    safeSnapshot: presetSnapshot(
      scenes.find((scene) => scene.id === "interference"),
    ),
  });
}

test("transport pause holds picture, rhythm, and handoff phase until resumed", () => {
  const show = makeShow();
  show.begin(0);
  let frames = 0;
  const preview = Object.assign(Object.create(ControlPreview.prototype), {
    show,
    engine: {
      advance() {
        frames++;
      },
      setRhythmFrame() {},
    },
    apply() {},
  });
  preview.tick(1, 1 / 30);
  show.command({ type: "pause" }, 1.375);
  const look = show.live.clip.id;
  const clock = show.status(1.375).clock;
  preview.tick(100, 1 / 30);
  assert.equal(frames, 1);
  assert.equal(show.status(100).clock.beat, clock.beat);
  assert.equal(show.live.clip.id, look);
  const state = performanceState(show, 100);
  assert.equal(performanceBeat({ performance: state }, 100, 200), clock.beat);
  const stage = makeShow();
  restorePerformance(stage, state, 500);
  assert.equal(stage.status(700).paused, true);
  assert.equal(stage.status(700).clock.beat, clock.beat);
  stage.command({ type: "pause" }, 700);
  assert.equal(stage.status(700.125).clock.beat, clock.beat + 0.25);
  show.command({ type: "pause" }, 100);
  preview.tick(100.125, 1 / 30);
  assert.equal(frames, 2);
});

test("paused palette and drift glides resume with their remaining duration", () => {
  const show = makeShow();
  show.begin(0);
  show.command({ type: "palette", value: "ember", beats: 4 }, 1);
  const initial = show.paletteGlide?.t0;
  show.command({ type: "pause" }, 1.5);
  const snapshot = show.snapshot(1.5);
  assert.deepEqual(show.snapshot(50).paletteColors, snapshot.paletteColors);
  assert.deepEqual(show.snapshot(50).paletteGlide, snapshot.paletteGlide);
  show.command({ type: "pause" }, 51.5);
  assert.equal(show.paletteGlide.t0, initial + 50);
});

test("local preview receives every energy-post ceiling on set edits", () => {
  const show = makeShow();
  const engine = { options: {} };
  const preview = Object.assign(Object.create(ControlPreview.prototype), {
    show,
    engine,
  });
  const set = initialShowSet(scenes);
  Object.assign(set.options, {
    bloom: 0.71,
    echo: 0.42,
    chroma: 0.23,
    grain: 0.14,
    vignette: 0.05,
  });
  preview.updateSet(set);
  for (const key of ["bloom", "echo", "chroma", "grain", "vignette"])
    assert.equal(engine.options[key], set.options[key]);
  Object.assign(set.options, { grain: 0, vignette: 0 });
  preview.updateSet(set);
  assert.equal(engine.options.grain, 0);
  assert.equal(engine.options.vignette, 0);
  assert.equal(engine.options.flashLimit, true);
});

test("local preview passes resolved clip transitions to the engine", () => {
  const show = makeShow();
  const calls = [];
  const engine = {
    setLevel() {},
    load(snapshot, seconds, options) {
      calls.push({ snapshot, seconds, options });
    },
  };
  const preview = Object.assign(Object.create(ControlPreview.prototype), {
    show,
    engine,
  });
  for (const transition of ["crossfade", "cut", "dissolve", "melt"]) {
    const action = {
      type: "load",
      snapshot: show.safeSnapshot,
      fadeSeconds: 2,
      energy: 0.7,
      transition,
    };
    preview.apply([action]);
    assert.equal(calls.at(-1).options.transition, transition);
    assert.equal(calls.at(-1).seconds, 2);
  }
});

test("control↔stage handoff preserves palette colours and finishes an in-flight glide", () => {
  const control = makeShow();
  control.command({ type: "slot", index: 0 }, 0);
  control.command({ type: "palette", value: "glacier" }, 1);
  control.tick(2);
  const current = { ...control.live.clip.snapshot.palette };
  const state = performanceState(control, 2);
  const before = structuredClone(state);
  const stage = makeShow();
  const actions = restorePerformance(stage, state, 10);
  assert.equal(stage.status(10).palette, "glacier");
  assert.deepEqual(
    actions.find((action) => action.type === "load").snapshot.palette,
    current,
  );
  assert.equal(stage.autopilot.nextPalette, control.autopilot.nextPalette);
  assert.deepEqual(
    stage.autopilot.paletteHistory,
    control.autopilot.paletteHistory,
  );
  stage.tick(11);
  assert.deepEqual(
    stage.live.clip.snapshot.palette,
    paletteById("glacier").colors,
  );
  assert.deepEqual(
    state,
    before,
    "ownership transfer does not mutate its input",
  );
  const returned = makeShow();
  restorePerformance(returned, performanceState(stage, 11), 20);
  assert.equal(returned.status(20).palette, "glacier");
  assert.deepEqual(
    returned.live.clip.snapshot.palette,
    paletteById("glacier").colors,
  );
});

test("handoff preserves an unsaved audition's custom show palette", () => {
  const show = makeShow();
  const clip = structuredClone(show.catalogClips.get(show.set.keys[1]));
  clip.id = "draft";
  clip.palette = "custom";
  clip.snapshot.palette = {
    primary: "#ffeedd",
    secondary: "#102030",
    accent: "#ee7733",
  };
  show.command({ type: "audition", clip }, 0);
  const restored = makeShow();
  const actions = restorePerformance(restored, performanceState(show, 0), 10);
  assert.equal(restored.live.clip.id, "draft");
  assert.deepEqual(restored.status(10).palette, clip.snapshot.palette);
  assert.deepEqual(
    actions.find((action) => action.type === "load").snapshot.palette,
    clip.snapshot.palette,
  );
});

test("a rejected load never applies foreign params to the previous picture", () => {
  const show = makeShow();
  const clipAt = (key) => show.catalogClips.get(show.set.keys[key]);
  const failedSlot = show.set.keys.findIndex(
    (id, key) => id && clipAt(key).snapshot.scene !== clipAt(0).snapshot.scene,
  );
  const failed = clipAt(failedSlot);
  const appliedParams = [];
  let picture = null;
  const engine = {
    setLevel() {},
    load(snapshot) {
      if (snapshot.scene === failed.snapshot.scene) {
        // Matches stage.isolate when the failed incoming family never reached a slot.
        show.disable(snapshot.scene, 0.5, false);
        return false;
      }
      picture = structuredClone(snapshot);
      return true;
    },
    setSnapshot(snapshot) {
      appliedParams.push(snapshot.scene);
      picture = structuredClone(snapshot);
    },
  };
  const apply = (actions) =>
    ControlPreview.prototype.apply.call({ show, engine }, actions);
  apply(show.command({ type: "slot", index: 0 }, 0));
  apply(show.command({ type: "palette", value: "glacier" }, 0.1));
  show.command({ type: "slot", index: failedSlot }, 0.3);
  const before = structuredClone(picture);
  appliedParams.length = 0;
  const batch = show.tick(0.5);
  assert.deepEqual(
    batch.map((action) => action.type),
    ["load", "params"],
  );
  apply(batch);
  assert.equal(show.live, null);
  assert.equal(show.currentSnapshot(), null);
  assert.deepEqual(
    appliedParams,
    [],
    "params re-read the show after the rejected load",
  );
  for (let t = 0.6; t < 3; t += 0.1) apply(show.tick(t));
  assert.deepEqual(appliedParams, []);
  assert.deepEqual(
    picture,
    before,
    "the previous renderer picture remains intact",
  );
});

test("handoff keeps a catalog look live with autopilot's history and random duration (D65, D66, D68)", () => {
  const control = makeShow();
  control.autopilot.enabled = true;
  control.begin(0);
  control.tick(0);
  control.command({ type: "next" }, 0.3);
  control.tick(0.5);
  const live = control.live.clip.id;
  const state = performanceState(control, 1);
  const stage = makeShow();
  const actions = restorePerformance(
    stage,
    JSON.parse(JSON.stringify(state)),
    10,
  );
  assert.equal(stage.live.clip.id, live);
  assert.equal(
    actions.find((a) => a.type === "load").snapshot.scene,
    live.split(":")[0],
  );
  assert.deepEqual(stage.autopilot.history, control.autopilot.history);
  assert.equal(stage.autopilot.duration, control.autopilot.duration);
  assert.equal(stage.status(10).live.look, live);
});

test("safe-look handoff carries its palette without inventing a live clip", () => {
  const control = makeShow();
  control.command({ type: "safe" }, 0);
  control.command({ type: "palette", value: "ember" }, 1);
  control.tick(2);
  const colours = { ...control.currentSnapshot().palette };
  const stage = makeShow();
  const actions = restorePerformance(stage, performanceState(control, 2), 10);
  assert.equal(actions.filter((action) => action.type === "safe").length, 1);
  assert.equal(stage.live, null);
  assert.equal(stage.currentSnapshot().scene, "interference");
  assert.deepEqual(stage.currentSnapshot().palette, colours);
  stage.tick(11);
  assert.deepEqual(
    stage.currentSnapshot().palette,
    paletteById("ember").colors,
  );
});

test("blackout and unblack present immediately during transport pause", () => {
  const show = makeShow();
  show.command({ type: "pause", on: true }, 1.375);
  const frames = [];
  const engine = {
    blackout: 0,
    present() {
      frames.push(this.blackout);
    },
  };
  const preview = Object.assign(Object.create(ControlPreview.prototype), {
    show,
    engine,
  });
  preview.command({ type: "blackout", on: true }, 10);
  assert.deepEqual(frames, [1]);
  assert.equal(
    preview.tick(20, 1),
    true,
    "new frame copied to local preview once",
  );
  assert.equal(preview.tick(21, 1), false);
  preview.command({ type: "blackout", on: false }, 22);
  assert.deepEqual(frames, [1, 0]);
  assert.equal(show.clock.beatAt(22), 2.75);
});
