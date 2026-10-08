import test from "node:test";
import assert from "node:assert/strict";
import { Telemetry } from "../telemetry.mjs";
import { route } from "../midi-routing.mjs";
import { Governor } from "../governor.mjs";
test("contract 5 telemetry drains samples, retains counters and measures cue preparation/blackout", () => {
  const telemetry = new Telemetry();
  const engine = {
    slots: [{ warmTicks: 3 }],
    blackout: 0,
    transition: { elapsed: 0 },
    counters: { gpuErrors: 2, nonFinite: 3, flashLimited: 4 },
    stats: () => ({ slots: 1, textures: 5 }),
  };
  telemetry.cueRequested(100);
  telemetry.blackoutRequested();
  telemetry.presented(110, 16, engine);
  engine.slots[0].warmTicks = 0;
  engine.transition.elapsed = 0.01;
  engine.blackout = 1;
  telemetry.presented(120, 17, engine);
  const session = { options: { quality: "balanced" } };
  const transport = { playing: true, currentCue: 2 };
  const first = telemetry.drain(
    120,
    session,
    transport,
    new Governor(),
    engine,
    123,
  );
  assert.deepEqual(first.frameIntervalsMs, [16, 17]);
  assert.deepEqual(first.cuePrepMs, [20]);
  assert.deepEqual(first.blackoutLatencyFrames, [2]);
  assert.equal(first.gpuErrors, 2);
  assert.equal(first.heapBytes, 123);
  const second = telemetry.drain(
    121,
    session,
    transport,
    new Governor(),
    engine,
  );
  assert.deepEqual(second.frameIntervalsMs, []);
  assert.deepEqual(second.cuePrepMs, []);
  assert.equal(second.flashLimited, 4);
  assert.equal(second.v, 1);
  delete engine.counters;
  assert.equal(
    telemetry.drain(122, session, transport, new Governor(), engine).gpuErrors,
    null,
  );
});
test("pure MIDI routing preserves learn input/maps/edges and makes CC triggers edge-sensitive", () => {
  const message = { type: "cc", channel: 0, number: 1, value: 1 };
  const maps = [{ type: "cc", channel: 0, number: 1, target: "go" }];
  const edges = new Map();
  assert.equal(route(message, maps, edges, null).at(-1).type, "go");
  assert.equal(edges.size, 0);
  edges.set("cc:0:1", true);
  assert.equal(route(message, maps, edges, null).length, 1);
  const learned = route(message, maps, edges, "blackout").at(-1);
  assert.equal(learned.type, "learn");
  assert.equal(learned.maps[0].target, "blackout");
  assert.equal(maps[0].target, "go");
});
test("engine F1 governor uses display budget and hysteresis for downgrade/upgrade", () => {
  const governor = new Governor();
  governor.setCeiling("high");
  governor.refreshMs = 1000 / 30;
  assert.equal(governor.assess(34, "high"), null);
  assert.equal(governor.assess(34, "high"), null);
  assert.equal(governor.assess(70, "high"), null);
  assert.equal(governor.assess(70, "high"), "balanced");
  assert.equal(governor.downgrades, 1);
  for (let i = 0; i < 7; i++)
    assert.equal(governor.assess(33.4, "balanced"), null);
  assert.equal(governor.assess(33.4, "balanced"), "high");
});
