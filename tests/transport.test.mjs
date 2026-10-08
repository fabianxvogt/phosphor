import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialSession, interpolateSnapshot } from "../session.mjs";
import { Transport, keyframePlayer } from "../transport.mjs";
test("F2 negative/nonfinite keyframe interpolation cannot create NaN snapshots", () => {
  const a = initialSession(scenes).active;
  const b = structuredClone(a);
  b.params.feed = 0.04;
  for (const t of [-Infinity, -0.002, NaN]) {
    const result = interpolateSnapshot(a, b, t);
    assert.deepEqual(result.params, a.params);
    assert.deepEqual(result.palette, a.palette);
  }
  assert.deepEqual(interpolateSnapshot(a, b, 2).params, b.params);
});
test("F2 pause/resume reanchors MIDI acquired while paused and holds keyframe position", () => {
  const session = initialSession(scenes),
    t = new Transport();
  const snapshot = structuredClone(session.active);
  snapshot.params.feed = 0.04;
  session.cues[0].keyframes = [{ beat: 4, snapshot }];
  t.score(session.cues);
  t.tick(1, 1000, session.cues, 60, false, false, 0);
  const held = t.snapshot().params.feed;
  t.pause(1000);
  t.clock({ tempo: 120, beat: 0.1 }, 2000, session.cues);
  t.clock({ resume: true, beat: 0 }, 2500, session.cues);
  t.pause(4000);
  t.tick(0, 4000, session.cues, 60, true, false, 0);
  assert.equal(t.beat, 1);
  assert.equal(t.snapshot().params.feed, held);
  t.tick(0.5, 4500, session.cues, 60, true, false, 0);
  assert.ok(t.snapshot().params.feed > held);
});
test("contract 7 keyframes reuse params/palette objects and colour strings without cloning in sample", () => {
  const cue = initialSession(scenes).cues[0];
  cue.snapshot.palette.primary = "#000000";
  const next = structuredClone(cue.snapshot);
  next.palette.primary = "#ffffff";
  next.params.feed = 0.04;
  cue.keyframes = [{ beat: 4, snapshot: next }];
  const player = keyframePlayer(cue),
    result = player.sample(0);
  const params = result.params,
    palette = result.palette;
  const clone = globalThis.structuredClone;
  try {
    globalThis.structuredClone = () => {
      throw new Error("per-frame clone");
    };
    assert.equal(player.sample(-0.002), result);
    assert.equal(player.sample(2).palette.primary, "#808080");
    assert.equal(player.sample(3).params, params);
    assert.equal(player.sample(3).palette, palette);
    assert.equal(player.sample(4).palette.primary, "#ffffff");
  } finally {
    globalThis.structuredClone = clone;
  }
});
test("transport catches up across complete score loops and keeps quantized GO pending", () => {
  const cues = initialSession(scenes).cues.slice(0, 2);
  cues.forEach((cue) => (cue.bars = 1));
  const t = new Transport();
  t.score(cues);
  assert.equal(t.tick(21, 21000, cues, 60, false, false, 0), 1);
  assert.equal(t.cueStart, 20);
  assert.equal(t.cueEnd, 24);
  assert.equal(t.queue(cues, 0, true), null);
  assert.equal(t.pendingCue.beat, 24);
  assert.equal(t.tick(3, 24000, cues, 60, false, false, 0), 0);
  t.score(cues);
  const remaining = t.remainingBeats;
  t.tick(10, 34000, cues, 60, false, false, 0);
  t.score(cues);
  assert.equal(t.cueEnd - t.beat, remaining);
});
test("cached keyframe colours preserve round-to-nearest at descending half-channel boundaries", () => {
  const cue = initialSession(scenes).cues[0];
  cue.snapshot.palette.primary = "#ffffff";
  const snapshot = structuredClone(cue.snapshot);
  snapshot.palette.primary = "#000000";
  cue.keyframes = [{ beat: 4, snapshot }];
  assert.equal(keyframePlayer(cue).sample(2).palette.primary, "#808080");
});
