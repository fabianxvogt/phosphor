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
const authored = worldFamilies;
// Count-selected cohorts and physical/simulation gestures need room to settle.
// Local lighting sweeps may be faster; future slot-3 signatures are lane-owned.
const spacedSlots = {
  mycelium: [1, 2],
  afterglow: [1, 2],
  metamorphosis: [1],
  fibration: [0, 1, 2],
  descent: [0, 1],
  murmuration: [1, 2],
  fold: [1],
  ribbons: [0],
  abyss: [0, 1],
  ferro: [0, 1, 2],
  laser: [0, 1],
  kinetic: [0],
  aurora: [0, 1, 2],
  orrery: [1],
  storm: [0, 1, 2],
  prism: [0, 1],
  escher: [0],
  silk: [1],
  ink: [0, 1],
  voxel: [0, 2],
};
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

const hitsOf = (track) =>
  track.steps.flatMap((value, i) => (value > 0 ? [i] : []));
// Sixteenth-note position of each hit within the bar.
const barPositions = (track) =>
  hitsOf(track).map((i) => ((i * 4) / track.division) % 16);

test("step notation", () => {
  assert.deepEqual(steps("X.x-|59"), [1, 0, 0.6, 0, 0.5, 0.9]);
  assert.throws(() => steps("X?"));
});

test("every world family is listed and declares three named rhythm styles", () => {
  assert.equal(worldFamilies.length, 27);
  for (const scene of worldFamilies) {
    assert.ok(scene.rhythmStyles, `${scene.id} declares rhythmStyles`);
    assert.equal(new Set(Object.values(scene.rhythmStyles)).size, 3);
    for (const style of STYLES)
      assert.match(
        scene.rhythmStyles[style],
        /^\S+(?: \S+){1,2}$/,
        `${scene.id}/${style}`,
      );
  }
});

for (const scene of authored)
  test(`${scene.id}: three full, distinct, named rhythm presets`, () => {
    for (const style of STYLES)
      assert.ok(scene.rhythmStyles[style], `${scene.id} names ${style}`);
    assert.equal(scene.rhythm.length, 4, `${scene.id} has four gestures`);
    assert.ok(
      scene.rhythm.some((effect) => effect.slot === 3),
      `${scene.id} has a signature gesture`,
    );
    const patterns = STYLES.map((style) => defaultPattern(scene.rhythm, style));
    assert.deepEqual(
      defaultPattern(scene.rhythm),
      patterns[1],
      `${scene.id} defaults to driving`,
    );
    const signatures = patterns.map((pattern) =>
      JSON.stringify(
        pattern.tracks.map((t) => [t.division, t.steps.map((v) => v > 0)]),
      ),
    );
    assert.equal(new Set(signatures).size, 3, `${scene.id} presets differ`);
    for (const [index, pattern] of patterns.entries()) {
      const label = `${scene.id}/${STYLES[index]}`;
      const hitsPerBar = pattern.tracks.reduce(
        (sum, track) =>
          sum + (hitsOf(track).length * track.division * 4) / track.length,
        0,
      );
      assert.ok(
        hitsPerBar + 1e-8 >= [2, 6, 8][index],
        `${label}: ${hitsPerBar} hits/bar`,
      );
      for (const track of pattern.tracks) {
        const hits = hitsOf(track);
        assert.ok(hits.length > 0, `${label}/${track.effect} plays`);
        const effect = scene.rhythm.find(
          (effect) => effect.id === track.effect,
        );
        if (effect.slot < 3) {
          assert.ok(
            effect.styles?.[STYLES[index]],
            `${label}/${effect.id} is authored`,
          );
          assert.deepEqual(
            track,
            { ...effect.styles[STYLES[index]], effect: effect.id },
            `${label} uses its authored loop, not legacy defaults`,
          );
          const gaps = hits.map(
            (hit, i) =>
              (hits[(i + 1) % hits.length] +
                (i === hits.length - 1 ? track.length : 0) -
                hit) /
              track.division,
          );
          assert.ok(
            track.duration < Math.min(...gaps),
            `${label}/${effect.id} settles before the next hit`,
          );
        }
        if (spacedSlots[scene.id]?.includes(effect.slot)) {
          const bar = 4 * track.division;
          const cycle = (track.length * bar) / gcd(track.length, bar);
          for (let start = 0; start < cycle; start += bar) {
            let count = 0;
            for (let step = start; step < start + bar; step++)
              if (track.steps[step % track.length] > 0) count++;
            assert.ok(count <= 2, `${label}/${effect.id}: ≤ 2 hits per bar`);
          }
        }
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
