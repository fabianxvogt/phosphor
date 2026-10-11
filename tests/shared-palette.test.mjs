import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { Show } from "../show.mjs";
import { presetSnapshot } from "../session.mjs";
import { paletteById } from "../palettes.mjs";
import { hexToHsv, hsvToHex } from "../color-picker.mjs";
import { rhythmPreviewSteps } from "../control-rhythm.mjs";

const colors = { primary: "#8844cc", secondary: "#ffeebb", accent: "#113322" };
const make = () => {
  const set = initialShowSet(scenes);
  set.palette = "symbiosis";
  return new Show({
    set,
    scenes,
    safeSnapshot: presetSnapshot(scenes.find((s) => s.id === "interference")),
    now: 0,
  });
};
test("shared palette survives manual changes, autopilot and runtime handoff", () => {
  const show = make();
  for (let i = 0; i < 8; i++) {
    const actions = show.command({ type: "look", id: show.set.keys[i] }, i);
    assert.deepEqual(
      actions.find((a) => a.type === "load").snapshot.palette,
      paletteById("symbiosis").colors,
    );
  }
  show.command({ type: "palette", value: colors, beats: 0 }, 9);
  assert.deepEqual(show.currentSnapshot().palette, colors);
  show.command({ type: "autopilot", on: true }, 10);
  for (let t = 10; t < 1000; t += 2) show.tick(t);
  assert.deepEqual(show.currentSnapshot().palette, colors);
  const recovered = make();
  recovered.updateSet(validateShowSet(show.set, scenes), 1001);
  recovered.restore(show.snapshot(1000), 1001);
  assert.deepEqual(recovered.currentSnapshot().palette, colors);
});
test("set palette changes repaint the live look without loading another scene", () => {
  const show = make();
  show.command({ type: "look", id: show.set.keys[0] }, 0);
  show.set.palette = colors; // control and runtime can share the same set object
  show.updateSet(show.set, 1);
  const actions = show.tick(1);
  assert.ok(actions.some((a) => a.type === "params"));
  assert.ok(!actions.some((a) => a.type === "load"));
  assert.deepEqual(show.currentSnapshot().palette, colors);
});
test("shared palette round-trips and rejects malformed colour data", () => {
  const set = initialShowSet(scenes);
  set.palette = colors;
  assert.deepEqual(
    validateShowSet(JSON.parse(JSON.stringify(set)), scenes).palette,
    colors,
  );
  for (const bad of [
    "unknown",
    { ...colors, accent: "red" },
    { ...colors, primary: "#123" },
  ]) {
    assert.throws(
      () => validateShowSet({ ...set, palette: bad }, scenes),
      /Show palette/,
    );
  }
  delete set.palette;
  assert.equal(validateShowSet(set, scenes).palette, null);
});
test("HSV picker spans hue, saturation and brightness with exact hex round-trips", () => {
  for (const hex of [
    "#000000",
    "#ffffff",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#bfe7d8",
    "#d5ab6e",
    "#abcdef",
  ])
    assert.equal(hsvToHex(hexToHsv(hex)), hex);
  assert.equal(hsvToHex({ h: 360, s: 1, v: 1 }), "#ff0000");
  assert.equal(hsvToHex({ h: 180, s: 0, v: 1 }), "#ffffff");
  assert.equal(hsvToHex({ h: 180, s: 1, v: 0 }), "#000000");
});
test("compact rhythm shows actual triggers and wraps independent three-beat loops", () => {
  const track = { division: 1, length: 3, steps: [1, 0, 0.55] };
  assert.deepEqual(
    rhythmPreviewSteps(track, 0),
    [1, 0, 0, 0, 0, 0, 0, 0, 0.55, 0, 0, 0, 1, 0, 0, 0],
  );
  assert.deepEqual(
    rhythmPreviewSteps(track, 4),
    [0, 0, 0, 0, 0.55, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  );
});
