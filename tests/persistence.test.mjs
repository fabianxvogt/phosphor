import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialSession } from "../session.mjs";
import { History, Persistence, SET_KEY } from "../persistence.mjs";
import { Transport } from "../transport.mjs";
const store = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
};
test("F4 undo skips empty edits and preserves runtime state during a cue rename", () => {
  const session = initialSession(scenes),
    history = new History(),
    t = new Transport();
  t.score(session.cues);
  history.checkpoint(session); // Focus without an edit.
  history.checkpoint(session);
  const name = session.cues[0].name;
  session.cues[0].name = "New name";
  history.commit(session); // End the edit before an unrelated live change.
  session.options.brightness = 0.5;
  const restored = history.restore(session);
  assert.equal(restored.cues[0].name, name);
  assert.equal(restored.options.brightness, 0.5);
  assert.equal(t.playing, true);
  assert.equal(t.currentCue, 0);
  assert.equal(history.restore(restored), null);
  assert.equal(history.restore(restored, true).cues[0].name, "New name");
});
test("F6 save validates before writing; invalid edits cannot poison the last good set", () => {
  const storage = store(),
    persistence = new Persistence(storage, scenes);
  const session = initialSession(scenes);
  persistence.save(session);
  const good = storage.getItem(SET_KEY);
  session.active.params.feed = NaN;
  assert.throws(() => persistence.save(session));
  assert.equal(storage.getItem(SET_KEY), good);
});
test("F8 clean pagehide cannot overwrite another tab; stale storage blocks autosave", () => {
  const storage = store(),
    persistence = new Persistence(storage, scenes);
  const session = initialSession(scenes);
  storage.setItem(SET_KEY, "other-tab");
  persistence.flush(session);
  assert.equal(storage.getItem(SET_KEY), "other-tab");
  persistence.dirty = true;
  persistence.externalChange({ key: SET_KEY, newValue: "newer" });
  assert.equal(persistence.blocked, true);
  persistence.flush(session);
  assert.equal(storage.getItem(SET_KEY), "other-tab");
});
