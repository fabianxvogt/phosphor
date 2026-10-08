import test from "node:test";
import assert from "node:assert/strict";
import { EnergyEvents } from "../energy-events.mjs";

test("breakdown after two quiet bars, build on rising highs, drop when the kick returns", () => {
  const events = new EnergyEvents();
  const seen = [];
  let beat = 0;
  const step = (tracker, high) => {
    const e = events.update(beat++, tracker, high);
    if (e) seen.push([beat - 1, e]);
  };
  for (let i = 0; i < 16; i++) step({ locked: true, coasting: false }, 0.3);
  for (let i = 0; i < 16; i++) step({ locked: true, coasting: true }, 0.2);
  for (let i = 0; i < 8; i++)
    step({ locked: true, coasting: true }, 0.2 + i * 0.05);
  step({ locked: true, coasting: false }, 0.6);
  assert.deepEqual(
    seen.map(([, e]) => e),
    ["breakdown", "build", "drop"],
  );
  assert.equal(seen[0][0], 23);
});

test("an unlocked tracker never reports a breakdown", () => {
  const events = new EnergyEvents();
  for (let beat = 0; beat < 64; beat++)
    assert.equal(events.update(beat, { locked: false }, 0.1), null);
});

test("each beat is counted once", () => {
  const events = new EnergyEvents();
  for (let i = 0; i < 100; i++)
    events.update(3, { locked: true, coasting: true }, 0.1);
  assert.equal(events.quietBeats, 1);
});
