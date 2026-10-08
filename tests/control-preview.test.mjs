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
} from "../control-preview.mjs";

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
  const clip = structuredClone(show.set.pages[0].slots[1]);
  clip.palette = "custom";
  clip.snapshot.palette = {
    primary: "#ffeedd",
    secondary: "#102030",
    accent: "#ee7733",
  };
  show.command({ type: "audition", clip }, 0);
  const restored = makeShow();
  const actions = restorePerformance(restored, performanceState(show, 0), 10);
  assert.equal(restored.live.slot, -1);
  assert.deepEqual(restored.status(10).palette, clip.snapshot.palette);
  assert.deepEqual(
    actions.find((action) => action.type === "load").snapshot.palette,
    clip.snapshot.palette,
  );
});

test("a rejected load never applies foreign params to the previous picture", () => {
  const show = makeShow();
  const failedSlot = show.set.pages[0].slots.findIndex(
    (clip) =>
      clip && clip.snapshot.scene !== show.set.pages[0].slots[0].snapshot.scene,
  );
  const failed = show.set.pages[0].slots[failedSlot];
  failed.quantize = "beat";
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
