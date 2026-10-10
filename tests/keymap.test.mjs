import test from "node:test";
import assert from "node:assert/strict";
import { actionFor, GRID_CODES, keyLabels } from "../keymap.mjs";

const input = (type) => ({
  closest: (selector) =>
    selector === "input"
      ? { type }
      : selector.includes("textarea")
        ? null
        : null,
});
const key = (code, extra = {}) => ({ type: "keydown", code, ...extra });

test("32 grid keys map to slots by physical position", () => {
  assert.equal(GRID_CODES.length, 32);
  assert.deepEqual(actionFor(key("Digit1")), { type: "slot", index: 0 });
  assert.deepEqual(actionFor(key("KeyI")), { type: "slot", index: 15 });
  // Physical KeyZ is labelled Y on QWERTZ: still the first slot of row 4.
  assert.deepEqual(actionFor(key("KeyZ")), { type: "slot", index: 24 });
  assert.deepEqual(actionFor(key("Comma")), { type: "slot", index: 31 });
});

test("shift + 1–8 does nothing: there are no pages (D68)", () => {
  assert.equal(actionFor(key("Digit3", { shiftKey: true })), null);
});

test("Escape and Shift+Escape never change playback, including focused inputs", () => {
  for (const target of [input("range"), input("text"), input("number")]) {
    assert.equal(actionFor(key("Escape", { target })), null);
    assert.equal(actionFor(key("Escape", { target, shiftKey: true })), null);
  }
});

test("typing in a text field does not trigger clips", () => {
  assert.equal(actionFor(key("KeyQ", { target: input("text") })), null);
  assert.deepEqual(actionFor(key("KeyQ", { target: input("range") })), {
    type: "slot",
    index: 8,
  });
});

test("Shift+Space plays autopilot's next pick; Space alone stays tap (D66)", () => {
  assert.deepEqual(actionFor(key("Space", { shiftKey: true })), {
    type: "next",
  });
  assert.deepEqual(actionFor(key("Space")), { type: "tap" });
  assert.equal(actionFor(key("Space", { shiftKey: true, repeat: true })), null);
  assert.equal(
    actionFor(key("Space", { shiftKey: true, target: input("search") })),
    null,
    "typing a space in the catalog search stays text",
  );
});

test("tempo, energy, speed and toggles", () => {
  assert.deepEqual(actionFor(key("Space")), { type: "tap" });
  assert.deepEqual(actionFor(key("Enter")), { type: "downbeat" });
  assert.deepEqual(actionFor(key("ArrowLeft")), {
    type: "nudge",
    direction: -1,
  });
  assert.deepEqual(actionFor(key("ArrowUp")), { type: "energy", direction: 1 });
  assert.deepEqual(actionFor(key("Digit9")), { type: "speed", value: 0.5 });
  assert.deepEqual(actionFor(key("Digit0")), { type: "speed", value: 2 });
  assert.deepEqual(actionFor(key("KeyP")), { type: "autopilot" });
  assert.deepEqual(actionFor(key("KeyO")), { type: "freeze" });
});

test("flash is held: down on keydown, off on keyup", () => {
  assert.deepEqual(actionFor(key("KeyL")), { type: "flash", on: true });
  assert.deepEqual(actionFor({ type: "keyup", code: "KeyL" }), {
    type: "flash",
    on: false,
  });
  assert.equal(actionFor({ type: "keyup", code: "KeyQ" }), null);
  // Releasing Esc must not toggle blackout back off.
  assert.equal(actionFor({ type: "keyup", code: "Escape" }), null);
});

test("repeats and browser shortcuts are ignored", () => {
  assert.equal(actionFor(key("KeyQ", { repeat: true })), null);
  assert.equal(actionFor(key("Escape", { repeat: true })), null);
  assert.equal(actionFor(key("KeyW", { metaKey: true })), null);
  assert.equal(actionFor(key("Escape", { ctrlKey: true })), null);
});

test("labels follow the active layout when available", async () => {
  const qwertz = new Map([
    ["KeyZ", "y"],
    ["KeyY", "z"],
  ]);
  const labels = await keyLabels({ getLayoutMap: async () => qwertz });
  assert.equal(labels.KeyZ, "Y");
  assert.equal(labels.KeyY, "Z");
  assert.equal(labels.Digit1, "1");
  assert.equal((await keyLabels(undefined)).KeyZ, "Z");
});
