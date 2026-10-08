import test from "node:test";
import assert from "node:assert/strict";
import { shortcutFor } from "../keyboard.mjs";
const target = (type, tagName = "INPUT") => ({
  type,
  tagName,
  closest: (selector) =>
    selector.includes(tagName.toLowerCase()) ? { type, tagName } : null,
});
test("F3 panic keys work on sliders, checkboxes and colours; ranges keep native arrows/Space", () => {
  for (const type of ["range", "checkbox", "color"]) {
    assert.equal(shortcutFor({ key: "b", target: target(type) }), "blackout");
    assert.equal(shortcutFor({ key: "Escape", target: target(type) }), "safe");
    assert.equal(shortcutFor({ key: "p", target: target(type) }), "pause");
  }
  assert.equal(
    shortcutFor({ key: " ", code: "Space", target: target("range") }),
    null,
  );
  assert.equal(
    shortcutFor({ key: "ArrowRight", shiftKey: true, target: target("range") }),
    null,
  );
  assert.equal(shortcutFor({ key: "p", target: target("text") }), null);
  assert.equal(shortcutFor({ key: "b", target: target("text") }), "blackout");
  assert.equal(shortcutFor({ key: "Escape", helpOpen: true }), "safe");
});
