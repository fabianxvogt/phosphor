import test from "node:test";
import assert from "node:assert/strict";
import {
  cycleStep,
  stepLabel,
  resizeTrack,
  editPatternTrack,
  rhythmTarget,
  RhythmPanel,
} from "../control-rhythm.mjs";

function playheadFixture() {
  const classList = () => {
    const names = new Set();
    return {
      contains: (n) => names.has(n),
      add: (n) => names.add(n),
      remove: (n) => names.delete(n),
      toggle: (n, on) => (on ? names.add(n) : names.delete(n)),
    };
  };
  const rows = [4, 3, 32].map((length) => ({
    track: {
      length,
      division: 1,
      steps: Array.from({ length }, (_, i) => (i === 0 ? 1 : 0)),
    },
    root: { classList: classList() },
    definition: { label: `${length}-beat loop` },
    miniCells: Array.from({ length: 16 }, () => ({ classList: classList() })),
    buttons: [],
    active: -1,
  }));
  const group = {
    scope: "family",
    bar: 0,
    follow: true,
    barCount: 8,
    rows: new Map(rows.map((r, i) => [i, r])),
    barLabel: {},
    previous: {},
    next: {},
    live: {},
  };
  const panel = {
    compact: true,
    preview: false,
    clock: { enabled: true },
    groups: new Map([["family", group]]),
  };
  return {
    rows,
    group,
    paint: (position) =>
      RhythmPanel.prototype.paintPlayheads.call(panel, position),
  };
}

test("live bars align playheads while retaining three-, four- and 32-beat loops", () => {
  const { rows, group, paint } = playheadFixture();
  paint(5.5);
  assert.deepEqual(
    rows.map((row) => row.miniActive),
    [6, 6, 6],
  );
  assert.equal(group.bar, 1);
  assert.deepEqual(
    rows.map((row) => row.miniPhase),
    [4, 4, 4],
  );
  assert.equal(rows[1].miniCells[8].classList.contains("on"), true); // beat 6 in a three-beat loop
  assert.equal(
    rows[2].miniCells.some((cell) => cell.classList.contains("on")),
    false,
  );
  paint(32.25);
  assert.deepEqual(
    rows.map((row) => row.miniActive),
    [1, 1, 1],
  );
  assert.equal(group.barLabel.textContent, "Bar 1 / 8");
  assert.equal(rows[2].miniCells[0].classList.contains("on"), true);
  assert.deepEqual(
    rows.map((row) => row.track.length),
    [4, 3, 32],
  );
});

test("bar display wraps indefinitely without resetting polymetric tracks", () => {
  const { rows, group, paint } = playheadFixture();
  for (const bar of [0, 7, 8, 151, 10000]) {
    paint(bar * 4 + 0.5);
    assert.equal(group.barLabel.textContent, `Bar ${(bar % 8) + 1} / 8`);
    assert.equal(group.previous.disabled, bar % 8 === 0);
    assert.equal(group.next.disabled, bar % 8 === 7);
    assert.equal(
      rows[1].miniCells[0].classList.contains("on"),
      (bar * 4) % 3 === 0,
    );
    assert.deepEqual(
      rows.map((row) => row.miniActive),
      [2, 2, 2],
    );
  }
});

test("editing a fixed bar hides unrelated live playheads and Live resumes following", () => {
  const { rows, group, paint } = playheadFixture();
  group.follow = false;
  group.bar = 2;
  paint(5.5);
  assert.deepEqual(
    rows.map((row) => row.miniActive),
    [-1, -1, -1],
  );
  assert.deepEqual(
    rows.map((row) => row.miniPhase),
    [8, 8, 8],
  );
  paint(9.5);
  assert.deepEqual(
    rows.map((row) => row.miniActive),
    [6, 6, 6],
  );
  group.follow = true;
  paint(13.5);
  assert.equal(group.bar, 3);
  assert.deepEqual(
    rows.map((row) => row.miniActive),
    [6, 6, 6],
  );
});

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
