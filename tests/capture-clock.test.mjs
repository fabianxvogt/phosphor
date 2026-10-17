import test from "node:test";
import assert from "node:assert/strict";
import { rhythmFramePicks } from "../scripts/capture-clock.mjs";
import { spawnSync } from "node:child_process";

test("rhythm captures select the first frame on/after each aligned half beat", () => {
  for (const bpm of [100, 120, 126, 150])
    for (const fps of [20, 30, 60]) {
      const picks = rhythmFramePicks({ bpm, fps });
      assert.equal(picks.length, 24);
      assert.equal(new Set(picks).size, 24);
      // Independently reproduce the actual whole-tick renderer loop.
      const beats = [];
      let position = 0;
      for (let n = 0; n <= picks.at(-1); n++) {
        const before = position;
        for (let tick = 0; tick < Math.round(60 / fps); tick++)
          position += bpm / 60 / 60;
        beats.push({ before, beat: position });
      }
      for (const [i, n] of picks.entries()) {
        const target = 8 + i / 2;
        const { beat, before } = beats[n];
        assert.ok(beat + 1e-8 >= target, `${bpm}/${fps}/${i} includes event`);
        assert.ok(before < target + 1e-8, `${bpm}/${fps}/${i} first frame`);
        assert.ok(n >= 0 && n < 12 * fps);
      }
    }
});

test("world-film rejects clocks it cannot render faithfully before launching a browser", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/world-film.mjs", "--world", "unfolding", "--fps", "24"],
    {
      cwd: new URL("../", import.meta.url),
      encoding: "utf8",
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /FPS must divide the 60 Hz simulation clock exactly/,
  );
});

test("an undersized or invalid capture cannot silently omit rhythm frames", () => {
  for (const options of [
    { seconds: 1 },
    { fps: 1 },
    { fps: 24 },
    { bpm: NaN },
    { count: 0 },
    { startBeat: -1 },
  ])
    assert.throws(() => rhythmFramePicks(options));
});
