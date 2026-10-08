import test from "node:test";
import assert from "node:assert/strict";
import { Governor } from "../governor.mjs";
test("engine F1 phase accumulator presents 60 fps on 60/75/90/120/144 Hz without idle downgrades", () => {
  for (const hz of [60, 75, 90, 120, 144]) {
    const governor = new Governor();
    let frames = 0;
    const intervals = [];
    for (let tick = 0; tick <= hz * 10; tick++) {
      const interval = governor.frame((tick * 1000) / hz, "balanced");
      if (tick > hz && interval > 0) {
        frames++;
        intervals.push(interval);
      }
    }
    assert.ok(Math.abs(frames - 540) <= 2, `${hz} Hz: ${frames} frames`);
    intervals.sort((a, b) => a - b);
    const p95 = intervals[Math.floor(intervals.length * 0.95)];
    for (let window = 0; window < 6; window++)
      assert.equal(governor.assess(p95, "balanced"), null, `${hz} Hz idle`);
    assert.ok(Math.abs(1000 / governor.refreshMs - hz) < 1);
  }
});
