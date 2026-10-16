import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { defaultWorlds } from "../worlds.mjs";
import { defaultPattern } from "../rhythm.mjs";
import { steps } from "../family-rhythm.mjs";

// Owner direction 2026-10-16: every world's rhythm grid is full and varied.
// A world family authors three named presets (restrained, driving and
// accented phrase styles) that place hits differently, never only on 1.
const STYLES = ["restrained", "driving", "accented"];
const byId = new Map(scenes.map((scene) => [scene.id, scene]));
const lookIds = scenes.flatMap((scene) =>
  (scene.presets ?? []).map((preset) => `${scene.id}:${preset.name}`),
);
const worldFamilies = [
  ...new Set(
    defaultWorlds(lookIds).map((world) => world.states[0].look.split(":")[0]),
  ),
].map((id) => byId.get(id));
// Families still waiting for authored presets. Shrinks to empty.
const authored = worldFamilies.filter((scene) => scene.rhythmStyles);

const hitsOf = (track) =>
  track.steps.flatMap((value, i) => (value > 0 ? [i] : []));
// Sixteenth-note position of each hit within the bar.
const barPositions = (track) =>
  hitsOf(track).map((i) => ((i * 4) / track.division) % 16);

test("step notation", () => {
  assert.deepEqual(steps("X.x-|59"), [1, 0, 0.6, 0, 0.5, 0.9]);
  assert.throws(() => steps("X?"));
});

test("every world family is listed", () => {
  assert.equal(worldFamilies.length, 27);
});

for (const scene of authored)
  test(`${scene.id}: three full, distinct, named rhythm presets`, () => {
    for (const style of STYLES)
      assert.ok(scene.rhythmStyles[style], `${scene.id} names ${style}`);
    assert.ok(scene.rhythm.length >= 3, `${scene.id} has ≥ 3 gestures`);
    const patterns = STYLES.map((style) => defaultPattern(scene.rhythm, style));
    const signatures = patterns.map((pattern) =>
      JSON.stringify(pattern.tracks.map((t) => [t.division, t.steps])),
    );
    assert.equal(new Set(signatures).size, 3, `${scene.id} presets differ`);
    for (const [index, pattern] of patterns.entries()) {
      const label = `${scene.id}/${STYLES[index]}`;
      for (const track of pattern.tracks) {
        const hits = hitsOf(track);
        assert.ok(hits.length > 0, `${label}/${track.effect} plays`);
        assert.ok(
          !(hits.length === 1 && hits[0] === 0 && track.length <= 4),
          `${label}/${track.effect} is more than a hit on 1`,
        );
      }
      const busy = pattern.tracks.filter((t) => hitsOf(t).length >= 2);
      assert.ok(busy.length >= 2, `${label}: ≥ 2 tracks with several hits`);
      const positions = new Set(pattern.tracks.flatMap(barPositions));
      assert.ok(positions.size >= 4, `${label}: ≥ 4 bar positions`);
      assert.ok(
        [...positions].some((p) => p % 4 !== 0),
        `${label}: at least one hit off the beat`,
      );
    }
  });

test("world presets are each world's own", () => {
  const seen = new Map();
  for (const scene of authored)
    for (const style of STYLES) {
      const key = JSON.stringify(
        defaultPattern(scene.rhythm, style).tracks.map((t) => t.steps),
      );
      assert.ok(!seen.has(key), `${scene.id}/${style} copies ${seen.get(key)}`);
      seen.set(key, `${scene.id}/${style}`);
    }
});
