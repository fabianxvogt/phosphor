import test from "node:test";
import assert from "node:assert/strict";
import { Telemetry } from "../telemetry.mjs";

const engine = () => ({
  slots: [{ warmTicks: 3 }],
  blackout: 0,
  transition: { elapsed: 0 },
  counters: { gpuErrors: 2, nonFinite: 3, flashLimited: 4 },
  stats: () => ({ slots: 1, textures: 21, liveTextures: 21 }),
});

test("drains samples and measures clip preparation and blackout latency", () => {
  const telemetry = new Telemetry();
  const e = engine();
  telemetry.clipRequested(100);
  telemetry.blackoutRequested();
  telemetry.presented(110, 16, e);
  e.slots[0].warmTicks = 0;
  e.transition.elapsed = 0.01;
  e.blackout = 1;
  telemetry.presented(120, 17, e);
  const first = telemetry.drain(120, { budget: 2.1 }, e, 123);
  assert.deepEqual(first.frameIntervalsMs, [16, 17]);
  assert.deepEqual(first.clipPrepMs, [20]);
  assert.deepEqual(first.blackoutLatencyFrames, [2]);
  assert.equal(first.budget, 2.1);
  assert.equal(first.liveTextures, 21);
  const second = telemetry.drain(121, {}, e);
  assert.deepEqual(second.frameIntervalsMs, []);
});

test("rehearsal log writes one row per minute with percentiles", () => {
  const telemetry = new Telemetry();
  const e = engine();
  e.slots[0].warmTicks = 0;
  let rows = [];
  for (let ms = 0; ms <= 125000; ms += 16.7) {
    telemetry.presented(ms, ms % 1000 < 17 ? 40 : 16.7, e);
    const row = telemetry.summarize(ms, { scene: "acid" }, e, 50e6);
    if (row) rows.push(row);
  }
  assert.equal(rows.length, 2);
  assert.equal(rows[0].scene, "acid");
  assert.ok(Math.abs(rows[0].p50 - 16.7) < 0.01);
  assert.equal(rows[0].max, 40);
  assert.equal(rows[0].heapMB, 50);
  assert.equal(telemetry.log.length, 2);
});
