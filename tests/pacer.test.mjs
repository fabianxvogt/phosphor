import test from "node:test";
import assert from "node:assert/strict";
import { Pacer } from "../pacer.mjs";

function run(hz, seconds, jitter = 0.4, seed = 1) {
  const pacer = new Pacer();
  const intervals = [];
  let t = 0;
  for (let i = 0; i < hz * seconds; i++) {
    seed = (seed * 16807) % 2147483647;
    t += 1000 / hz + (seed / 2147483647 - 0.5) * 2 * jitter;
    const interval = pacer.frame(t);
    if (interval) intervals.push(interval);
  }
  return intervals.slice(2);
}

for (const hz of [60, 120, 144, 90]) {
  test(`${hz} Hz display renders steadily near 60 fps`, () => {
    const intervals = run(hz, 20);
    const fps =
      (1000 * intervals.length) / intervals.reduce((a, b) => a + b, 0);
    assert.ok(fps > 55 && fps < 75, `fps ${fps.toFixed(1)}`);
    const sorted = [...intervals].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    // The old gate turned one late 120 Hz callback into a 25 ms frame and
    // tripped the downgrade (p95 > 24 ms). Paced frames stay well under.
    assert.ok(p95 < 24, `p95 ${p95.toFixed(1)} ms`);
  });
}

test("a long stall does not cause a burst of catch-up frames", () => {
  const pacer = new Pacer();
  let t = 0;
  for (let i = 0; i < 10; i++) pacer.frame((t += 16.7));
  pacer.frame((t += 500));
  let rendered = 0;
  for (let i = 0; i < 4; i++) if (pacer.frame((t += 8.3))) rendered++;
  assert.ok(rendered <= 2);
});
