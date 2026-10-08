import test from "node:test";
import assert from "node:assert/strict";
import * as ui from "../ui-state.mjs";
import { History } from "../persistence.mjs";
import { initialSession } from "../session.mjs";
import scenes from "../scenes.mjs";
import { Transport } from "../transport.mjs";

test("R3 background guards retain errors; only successful opted-in import/export clears", async () => {
  let error = "Saved set rejected";
  const effects = {
    clearError: () => {
      error = null;
    },
    onError: (failure) => {
      error = failure.message;
    },
  };
  for (const background of [
    "refreshDevices",
    "devicechange",
    "capture flush",
  ]) {
    assert.equal(await ui.runGuarded(() => background, effects), background);
    assert.equal(error, "Saved set rejected");
  }
  await ui.runGuarded(
    () => {
      throw new Error("Import rejected");
    },
    effects,
    true,
  );
  assert.equal(error, "Import rejected");
  await ui.runGuarded(() => "exported", effects, true);
  assert.equal(error, null);
});
test("R5 undo/redo preserves recording quality while restoring other edits", () => {
  const initial = initialSession(scenes);
  const history = new History();
  history.checkpoint(initial);
  const edited = structuredClone(initial);
  edited.options.quality = "low";
  edited.name = "Recording take";
  history.commit(edited);
  const undo = history.restore(edited);
  assert.equal(ui.restoredQuality(edited, undo, true), "low");
  assert.equal(ui.restoredQuality(edited, undo, false), "balanced");
  assert.equal(undo.name, initial.name);
  undo.options.quality = ui.restoredQuality(edited, undo, true);
  const redo = history.restore(undo, true);
  assert.equal(ui.restoredQuality(undo, redo, true), "low");
  assert.equal(redo.name, "Recording take");
  assert.equal(ui.restoredQuality(initial, edited, true), "balanced");
});
test("R9 plain MIDI clock ticks avoid UI work; transport commands and cue entries refresh", () => {
  const transport = new Transport();
  const cues = initialSession(scenes).cues;
  let updates = 0;
  const receive = (event, now) => {
    const index = transport.clock(event, now, cues);
    if (ui.clockNeedsUI(event, index)) updates++;
  };
  receive({ start: true }, 0);
  for (let tick = 1; tick <= 96; tick++)
    receive({ beat: tick / 24, tempo: 120 }, (tick * 1000) / 48);
  assert.equal(updates, 1);
  receive({ stop: true }, 2001);
  receive({ resume: true, beat: 4 }, 2002);
  assert.equal(updates, 3);
  assert.equal(ui.clockNeedsUI({ beat: 5 }, 0), true);
  assert.equal(ui.clockNeedsUI({ beat: 5 }, null), false);
  assert.equal(transport.playing, true);
});
