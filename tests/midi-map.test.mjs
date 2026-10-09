import test from "node:test";
import assert from "node:assert/strict";
import { routeMidi } from "../midi-map.mjs";
import { MIDI_TARGETS } from "../show-set.mjs";

const cc = (number, value) => ({ type: "cc", channel: 0, number, value });

test("learning replaces any earlier mapping of the same control", () => {
  const edges = new Map();
  let maps = [{ type: "cc", channel: 0, number: 7, target: "hue" }];
  ({ maps } = routeMidi(cc(7, 0.3), maps, edges, "master"));
  assert.deepEqual(maps, [
    { type: "cc", channel: 0, number: 7, target: "master" },
  ]);
});

test("continuous targets follow the value", () => {
  const maps = ["master", "energy", "zoom"].map((target, i) => ({
    type: "cc",
    channel: 0,
    number: i,
    target,
  }));
  const edges = new Map();
  assert.deepEqual(routeMidi(cc(0, 0.25), maps, edges).actions, [
    { type: "shared", master: 0.25 },
  ]);
  assert.deepEqual(routeMidi(cc(1, 1), maps, edges).actions, [
    { type: "energy", value: 1 },
  ]);
  assert.deepEqual(routeMidi(cc(2, 0), maps, edges).actions, [
    { type: "shared", zoom: 0.5 },
  ]);
});

test("triggers fire once per press, not on every CC message", () => {
  const maps = [{ type: "cc", channel: 0, number: 20, target: "blackout" }];
  const edges = new Map();
  const fired = [0.2, 0.7, 0.9, 1, 0.3, 0.8].map(
    (v) => routeMidi(cc(20, v), maps, edges).actions.length,
  );
  assert.deepEqual(fired, [0, 1, 0, 0, 0, 1]);
});

test("a learnt Next control plays autopilot's next pick once per press (D66)", () => {
  const maps = [{ type: "note", channel: 0, number: 40, target: "next" }];
  const edges = new Map();
  const note = (value) => ({ type: "note", channel: 0, number: 40, value });
  assert.deepEqual(routeMidi(note(1), maps, edges).actions, [{ type: "next" }]);
  assert.deepEqual(routeMidi(note(1), maps, edges).actions, []);
  assert.deepEqual(routeMidi(note(0), maps, edges).actions, []);
  assert.deepEqual(routeMidi(note(0.9), maps, edges).actions, [
    { type: "next" },
  ]);
});

test("slots, family faders and momentary flash", () => {
  const maps = [
    { type: "note", channel: 0, number: 36, target: "slot.9" },
    { type: "cc", channel: 0, number: 5, target: "family.1" },
    { type: "cc", channel: 0, number: 6, target: "flash" },
  ];
  const edges = new Map();
  assert.deepEqual(
    routeMidi({ type: "note", channel: 0, number: 36, value: 0.8 }, maps, edges)
      .actions,
    [{ type: "slot", index: 9 }],
  );
  const family = (i, v) => (i === 1 ? { key: "glow", value: v } : null);
  assert.deepEqual(routeMidi(cc(5, 0.4), maps, edges, null, family).actions, [
    { type: "param", key: "glow", value: 0.4 },
  ]);
  assert.deepEqual(routeMidi(cc(6, 1), maps, edges).actions, [
    { type: "flash", on: true },
  ]);
  assert.deepEqual(routeMidi(cc(6, 0), maps, edges).actions, [
    { type: "flash", on: false },
  ]);
});

test("every v3 MIDI target routes to something", () => {
  for (const target of MIDI_TARGETS) {
    const maps = [{ type: "cc", channel: 0, number: 1, target }];
    const { actions } = routeMidi(cc(1, 1), maps, new Map(), null, () => ({
      key: "k",
      value: 1,
    }));
    assert.ok(actions.length, target);
  }
});
