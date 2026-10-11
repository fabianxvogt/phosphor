import test from "node:test";
import assert from "node:assert/strict";
import {
  cycleStep,
  stepLabel,
  resizeTrack,
  editPatternTrack,
  rhythmTarget,
} from "../control-rhythm.mjs";

test("rhythm grid labels communicate bars, beats and subdivisions", () => {
  assert.equal(stepLabel(0, 1), "1.1");
  assert.equal(stepLabel(4, 1), "2.1");
  assert.equal(stepLabel(1, 2), "1.1&");
  assert.deepEqual(
    [0, 1, 2, 3].map((step) => stepLabel(step, 4)),
    ["1.1", "1.1e", "1.1&", "1.1a"],
  );
  assert.equal(stepLabel(255, 4), "16.4a");
});

test("steps cycle through ordinary and stronger accents without losing off", () => {
  assert.deepEqual(
    [0, 0.55, 1].map((value) => cycleStep(value)),
    [0.55, 1, 0],
  );
  assert.equal(cycleStep(0.22), 1);
  assert.equal(cycleStep(0, true), 1);
  assert.equal(cycleStep(1, true), 0.55);
});

test("grid resolution preserves beat placements in a three-beat loop", () => {
  const original = {
    effect: "ribbon",
    division: 1,
    length: 3,
    steps: [1, 0, 0.55],
    strength: 0.5,
    duration: 0.5,
    muted: false,
  };
  const sixteenth = resizeTrack(original, 12, 4);
  assert.equal(sixteenth.length / sixteenth.division, 3);
  assert.deepEqual(sixteenth.steps, [1, 0, 0, 0, 0, 0, 0, 0, 0.55, 0, 0, 0]);
  assert.deepEqual(resizeTrack(sixteenth, 3, 1), original);
  assert.deepEqual(original.steps, [1, 0, 0.55]);
});

test("loop extension keeps placements and limits respect resolution", () => {
  const track = { division: 2, length: 3, steps: [0.55, 1, 0] };
  assert.deepEqual(resizeTrack(track, 5).steps, [0.55, 1, 0, 0, 0]);
  assert.equal(resizeTrack(track, 200).length, 128);
  assert.equal(resizeTrack(track, -4).length, 1);
});

test("editing one rhythm effect protects the pattern and leaves other tracks intact", () => {
  const pattern = {
    mode: "auto",
    style: "driving",
    tracks: [
      { effect: "ribbon", steps: [1] },
      { effect: "tile", steps: [0] },
    ],
  };
  const result = editPatternTrack(pattern, "tile", (track) => ({
    ...track,
    steps: [0.55],
  }));
  assert.equal(result.mode, "locked");
  assert.deepEqual(result.tracks[0], pattern.tracks[0]);
  assert.notEqual(result.tracks[0], pattern.tracks[0]);
  assert.deepEqual(result.tracks[1].steps, [0.55]);
  assert.deepEqual(pattern.tracks[1].steps, [0]);
});

test("rhythm target follows the incoming playing visual and uses draft only explicitly", () => {
  const scenes = [
    { id: "tiles", type: { key: "tiling" } },
    { id: "newton", type: { key: "polynomial" } },
  ];
  const draft = {
    id: "own-draft",
    name: "Draft",
    own: true,
    snapshot: { scene: "tiles", params: { tiling: 1 } },
  };
  const status = {
    rhythm: {
      live: { family: "newton", look: "newton:0", name: "Playing", variant: 3 },
    },
  };
  assert.equal(rhythmTarget(status, scenes, draft).scene.id, "newton");
  assert.equal(rhythmTarget(status, scenes, draft).variant, 3);
  assert.equal(rhythmTarget(status, scenes, draft, true).scene.id, "tiles");
  assert.equal(rhythmTarget(status, scenes, draft, true).variant, 1);
  assert.equal(rhythmTarget(null, scenes, draft), null);
});
