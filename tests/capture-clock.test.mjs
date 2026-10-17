import test from "node:test";
import assert from "node:assert/strict";
import { rhythmFramePicks } from "../scripts/capture-clock.mjs";

test("rhythm captures select the first frame on/after each aligned half beat", () => {
  for (const bpm of [100, 120, 126, 150])
    for (const fps of [24, 30, 60]) {
      const picks = rhythmFramePicks({ bpm, fps });
      assert.equal(picks.length, 24);
      assert.equal(new Set(picks).size, 24);
      for (const [i, n] of picks.entries()) {
        const target = 8 + i / 2;
        const beat = ((n + 1) * bpm) / (60 * fps);
        const before = (n * bpm) / (60 * fps);
        assert.ok(beat + 1e-8 >= target, `${bpm}/${fps}/${i} includes event`);
        assert.ok(before < target + 1e-8, `${bpm}/${fps}/${i} first frame`);
        assert.ok(n >= 0 && n < 12 * fps);
      }
    }
});

test("an undersized or invalid capture cannot silently omit rhythm frames", () => {
  for (const options of [
    { seconds: 1 },
    { fps: 1 },
    { bpm: NaN },
    { count: 0 },
    { startBeat: -1 },
  ])
    assert.throws(() => rhythmFramePicks(options));
});
