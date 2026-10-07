import test from "node:test";
import assert from "node:assert/strict";
import acid from "../scene-acid.mjs";
import magnetic from "../scene-magnetic.mjs";
import cathedral from "../scene-cathedral.mjs";
import aquarium from "../scene-aquarium.mjs";
import tapestry, { stepTapestry, seedTapestry } from "../scene-tapestry.mjs";
import feedback from "../scene-feedback.mjs";
import interference from "../scene-interference.mjs";
import melt from "../scene-melt.mjs";
import phase from "../scene-phase.mjs";
import evolution from "../scene-evolution.mjs";
import {
  initialSession,
  validateSession,
  validateSnapshot,
  presetSnapshot,
  interpolateSnapshot,
  migrateLegacy,
  readSetFile,
} from "../session.mjs";
import {
  mutatePreset,
  createLineage,
  breedLineage,
  selectNode,
  undoGeneration,
} from "../evolution.mjs";
import { MidiInput } from "../audio.mjs";
const scenes = [
  acid,
  magnetic,
  cathedral,
  aquarium,
  tapestry,
  feedback,
  interference,
  melt,
  phase,
  evolution,
];

test("authored looks can all be captured, exported and reopened without losing parameters", () => {
  for (const scene of scenes)
    for (let i = 0; i < scene.presets.length; i++) {
      const snapshot = presetSnapshot(scene, i);
      assert.deepEqual(
        validateSnapshot(JSON.parse(JSON.stringify(snapshot)), scenes),
        snapshot,
        `${scene.id}/${i}`,
      );
      const session = initialSession(scenes);
      session.active = snapshot;
      session.cues[0].snapshot = snapshot;
      assert.deepEqual(
        validateSession(JSON.parse(JSON.stringify(session)), scenes),
        session,
      );
    }
});
test("portable sets reject invalid values before applying any state", () => {
  const cases = [
    (s) => (s.active.params.feed = NaN),
    (s) => (s.active.params.feed = "0.03"),
    (s) => (s.active.seed = 0.5),
    (s) => (s.cues[0].bars = 0),
    (s) => (s.cues[0].bars = 1.5),
    (s) => (s.cues[0].snapshot.scene = "unknown"),
    (s) => (s.cues[1].id = s.cues[0].id),
    (s) => (s.options.brightness = 2),
    (s) => (s.active.palette.primary = "javascript:alert(1)"),
    (s) => (s.mappings[0].target = "missing"),
  ];
  for (const mutate of cases) {
    const s = initialSession(scenes);
    mutate(s);
    assert.throws(() => validateSession(s, scenes));
  }
});
test("full-capacity portable files reopen every cue and keyframe beyond the old small-file limit", async () => {
  const session = initialSession(scenes);
  session.cues = Array.from({ length: 256 }, (_, i) => ({
    id: `capacity-${i}`,
    name: `Capacity cue ${i}`,
    snapshot: structuredClone(session.active),
    bars: 64,
    transition: 4,
    energy: 0.5,
    keyframes: Array.from({ length: 32 }, (_, j) => {
      const snapshot = structuredClone(session.active);
      snapshot.seed = i * 32 + j;
      snapshot.params.speed = 0.5 + j / 200;
      snapshot.preset = `Capacity look ${i}-${j}`;
      return { beat: j * 8, snapshot };
    }),
  }));
  const expected = validateSession(session, scenes);
  const file = new File([JSON.stringify(expected, null, 2)], "capacity.json", {
    type: "application/json",
  });
  assert.deepEqual(await readSetFile(file, scenes), expected);
});
test("keyframes preserve boundaries and interpolate a complete look without mutating parents", () => {
  const a = presetSnapshot(acid),
    b = presetSnapshot(acid, 1),
    copy = structuredClone(a);
  b.palette.primary = "#ffffff";
  a.palette.primary = "#000000";
  copy.palette.primary = "#000000";
  assert.deepEqual(interpolateSnapshot(a, b, 0).params, a.params);
  assert.deepEqual(interpolateSnapshot(a, b, 1).params, b.params);
  assert.equal(interpolateSnapshot(a, b, 0.5).palette.primary, "#808080");
  assert.equal(
    interpolateSnapshot(a, b, 0.5).params.feed,
    (a.params.feed + b.params.feed) / 2,
  );
  assert.deepEqual(a, copy);
  const s = initialSession(scenes);
  s.cues[0].keyframes = [{ beat: s.cues[0].bars * 4 + 1, snapshot: a }];
  assert.throws(() => validateSession(s, scenes));
  s.cues[0].keyframes = [{ beat: 1, snapshot: presetSnapshot(feedback) }];
  assert.throws(() => validateSession(s, scenes));
});
test("elementary automaton obeys exact known rules and periodic boundaries", () => {
  assert.deepEqual(
    [...stepTapestry(Uint8Array.from([0, 0, 0, 1, 0, 0, 0]), 90)],
    [0, 0, 1, 0, 1, 0, 0],
  );
  assert.deepEqual(
    [...stepTapestry(Uint8Array.from([1, 0, 0, 0, 0]), 90)],
    [0, 1, 0, 0, 1],
  );
  assert.deepEqual(
    [...stepTapestry(Uint8Array.from([1, 0, 1, 1]), 0)],
    [0, 0, 0, 0],
  );
  assert.deepEqual(
    [...stepTapestry(Uint8Array.from([1, 0, 1, 1]), 255)],
    [1, 1, 1, 1],
  );
  assert.deepEqual(
    [...seedTapestry(512, 97, 0, 0.01)].flatMap((value, index) =>
      value ? [index] : [],
    ),
    [208],
  );
});
test("bounded mutations preserve locks exactly, stay deterministic and respect maximum distance", () => {
  for (const scene of scenes) {
    const parent = scene.presets[0];
    const locked = [scene.schema[0].key];
    for (const seed of [0, 7, 2147483647]) {
      const options = { seed, strength: 0.2, locked };
      const child = mutatePreset(scene, parent, options);
      assert.deepEqual(child, mutatePreset(scene, parent, options));
      assert.equal(child.params[locked[0]], parent.params[locked[0]]);
      for (const field of scene.schema) {
        const value = child.params[field.key];
        assert.ok(value >= field.min && value <= field.max);
        assert.ok(
          Math.abs(value - parent.params[field.key]) <=
            (field.max - field.min) * 0.2 + 1e-9,
        );
      }
    }
  }
});
test("sibling selection and undo retain ancestry through session export/import", () => {
  const root = createLineage(acid, acid.presets[0]);
  const a = breedLineage(root, acid, { seed: 8, strength: 0.2 });
  const b = breedLineage(selectNode(a, root.selectedId), acid, {
    seed: 9,
    strength: 0.2,
  });
  assert.equal(b.nodes[1].parentId, b.nodes[2].parentId);
  assert.equal(undoGeneration(b).selectedId, root.selectedId);
  assert.deepEqual(root, createLineage(acid, acid.presets[0]));
  const s = initialSession(scenes);
  s.lineages = [b];
  assert.deepEqual(
    validateSession(JSON.parse(JSON.stringify(s)), scenes).lineages,
    [b],
  );
  const corrupt = structuredClone(s);
  corrupt.lineages[0].nodes[0].parentId = corrupt.lineages[0].nodes[2].id;
  assert.throws(() => validateSession(corrupt, scenes), /Cyclic/);
  assert.throws(() => breedLineage(b, feedback, { seed: 10, strength: 0.1 }));
});
test("accepted files export and reopen without retaining oversized unsupported lineage payloads", async () => {
  const session = initialSession(scenes);
  const root = createLineage(acid, acid.presets[0]);
  session.lineages = [
    { ...structuredClone(root), unsupportedPayload: new Array(4_000_000).fill(0) },
  ];
  session.lineages[0].nodes[0].unsupportedNodePayload = {
    privateNote: "not part of the portable schema",
  };
  const imported = await readSetFile(
    new File([JSON.stringify(session)], "extended.json"),
    scenes,
  );
  const exported = new File(
    [JSON.stringify(imported, null, 2)],
    "exported.json",
  );
  const reopened = await readSetFile(exported, scenes);
  assert.deepEqual(reopened.lineages, [root]);
});
test("automatically seeded discoveries remain portable through successive generations", () => {
  let lineage = createLineage(acid, acid.presets[0]);
  const s = initialSession(scenes);
  for (let generation = 0; generation < 8; generation++) {
    lineage = breedLineage(lineage, acid);
    s.lineages = [lineage];
    assert.deepEqual(
      validateSession(JSON.parse(JSON.stringify(s)), scenes).lineages,
      [lineage],
    );
  }
});
test("full lineage never evicts discoveries or silently exceeds its cap", () => {
  let lineage = createLineage(acid, acid.presets[0]);
  for (let i = 1; i < 128; i++)
    lineage = breedLineage(lineage, acid, { seed: i, strength: 0.1 });
  const before = structuredClone(lineage);
  assert.throws(
    () => breedLineage(lineage, acid, { seed: 129, strength: 0.1 }),
    /128/,
  );
  assert.deepEqual(lineage, before);
});

test("legacy scores migrate labels, rules, palettes and durations without mutating backups", () => {
  const old = {
    format: "phosphor-set-v1",
    version: 1,
    activeScene: 1,
    presetIndex: [0, 2, 0],
    params: {
      acid: {
        growth: 0.62,
        injection: 0.34,
        diffusion: 0.82,
        contrast: 1.2,
        drift: 0.25,
      },
      tapestry: { rule: 90, scroll: 0.42, weave: 0.55, reversal: 0, phrase: 8 },
      feedback: {
        decay: 0.91,
        transform: 0.012,
        symmetry: 4,
        injection: 0.55,
        tunnel: 0.58,
      },
    },
    palette: { primary: "#d5ff5f", secondary: "#5364ff", accent: "#ff5bc8" },
    tempo: 92,
    cues: [{ label: "Original score", scene: 1, preset: 2, duration: 12 }],
    options: { reducedMotion: false, brightness: 0.92, quality: "720" },
  };
  const original = structuredClone(old),
    next = migrateLegacy(old, scenes);
  assert.equal(next.active.params.rule, 30);
  assert.equal(next.cues[0].bars, 12);
  assert.equal(next.cues[0].name, "Original score");
  assert.deepEqual(next.active.palette, old.palette);
  assert.equal(next.options.quality, "low");
  assert.deepEqual(old, original);
  old.params.acid.growth = Infinity;
  assert.throws(() => migrateLegacy(old, scenes));
});

test("MIDI parser preserves clock phase across Continue and restarts on Start", () => {
  const events = [],
    controls = [];
  const input = new MidiInput(
    (message) => controls.push(message),
    (clock) => events.push(clock),
    () => {},
  );
  input.message({ data: [250], timeStamp: 0 });
  for (let i = 1; i <= 24; i++)
    input.message({ data: [248], timeStamp: i * 20.833333 });
  const clock = events.at(-1);
  assert.ok(Math.abs(clock.tempo - 120) < 0.001);
  assert.equal(clock.beat, 1);
  input.message({ data: [252], timeStamp: 510 });
  assert.deepEqual(events.at(-1), { stop: true });
  input.message({ data: [251], timeStamp: 520 });
  assert.deepEqual(events.at(-1), { resume: true, beat: 1 });
  input.message({ data: [178, 19, 127], timeStamp: 530 });
  assert.deepEqual(controls.at(-1), {
    type: "cc",
    channel: 2,
    number: 19,
    value: 1,
  });
  input.message({ data: [250], timeStamp: 540 });
  assert.deepEqual(events.at(-1), { start: true, beat: 0 });
});
