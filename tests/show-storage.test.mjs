import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialSession } from "../session.mjs";
import { initialShowSet, clipFrom } from "../show-set.mjs";
import { catalogLooks } from "../catalog.mjs";
import {
  loadSet,
  saveSet,
  saveRuntime,
  loadRuntime,
  SET_KEY,
  UNREADABLE_KEY,
} from "../show-storage.mjs";

const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
};

test("a saved v5 set reloads unchanged", () => {
  const storage = memory();
  const set = initialShowSet(scenes);
  set.name = "Friday";
  set.favorites = ["julia:Cubic Lace"];
  saveSet(storage, set);
  const { set: loaded, report } = loadSet(storage, scenes);
  assert.deepEqual(loaded, set);
  assert.deepEqual(report, []);
});

test("a v4 autosave migrates once to v5; the v4 entry stays as a backup (D68)", () => {
  const storage = memory();
  const looks = catalogLooks(scenes);
  const clip = (look, id) =>
    clipFrom(look.snapshot, { id, name: look.name, palette: "ember" });
  const edited = clip(looks[1], "edited");
  edited.snapshot.seed += 7;
  const v4 = {
    format: "phosphor-set-v4",
    version: 4,
    name: "Old",
    pages: Array.from({ length: 8 }, (_, p) => ({
      name: p === 7 ? "Lab" : `Page ${p + 1}`,
      mood: null,
      slots: Array.from({ length: 32 }, (_, s) =>
        p === 0 && s === 0
          ? clip(looks[0], "a")
          : p === 7 && s === 0
            ? edited
            : null,
      ),
    })),
    shared: { master: 0.9, hue: 0, zoom: 1, mirror: 1 },
    autopilot: { enabled: true, random: true, everyBars: 16, handBackBars: 32 },
    clock: { mode: "auto", manualBpm: 120, latencyMs: 0 },
    options: {
      pixelBudget: 2.1,
      bloom: 0.15,
      echo: 0,
      chroma: 0,
      grain: 0.12,
      vignette: 0.15,
      autoRecovery: true,
      reducedMotion: false,
    },
    midi: [],
    lineages: [],
  };
  const original = JSON.stringify(v4);
  storage.setItem("phosphor-set-v4", original);
  const first = loadSet(storage, scenes);
  assert.equal(first.set.format, "phosphor-set-v5");
  assert.ok(first.report[0].includes("Migrated the saved v4 set"));
  assert.equal(first.set.looks.length, 1);
  assert.equal(first.set.looks[0].id, "own-edited");
  assert.equal(first.set.options.pixelBudget, 8.3);
  assert.deepEqual(JSON.parse(storage.getItem(SET_KEY)), first.set);
  assert.equal(storage.getItem("phosphor-set-v4"), original);
  const second = loadSet(storage, scenes);
  assert.deepEqual(second.report, [], "stored at once, reported once");
  assert.deepEqual(second.set, first.set);
});

test("an existing v2 autosave migrates on first load", () => {
  const storage = memory();
  storage.setItem("phosphor-set-v2", JSON.stringify(initialSession(scenes)));
  const { set, report } = loadSet(storage, scenes);
  assert.equal(set.format, "phosphor-set-v5");
  assert.ok(report[0].includes("Migrated the saved v2 set"));
});

test("a corrupt v5 save falls back to a new set, says so and keeps the original", () => {
  const storage = memory();
  storage.setItem(SET_KEY, "{oops");
  const { set, report } = loadSet(storage, scenes);
  assert.equal(set.format, "phosphor-set-v5");
  assert.ok(report[0].includes("unreadable"));
  assert.equal(storage.getItem(UNREADABLE_KEY), "{oops");
  storage.setItem(SET_KEY, "{later");
  loadSet(storage, scenes);
  assert.equal(storage.getItem(UNREADABLE_KEY), "{oops"); // the first is kept
});

test("a corrupt old v3 save retains the first unreadable backup", () => {
  const storage = memory();
  storage.setItem("phosphor-set-v3", "{old");
  const { report } = loadSet(storage, scenes);
  assert.ok(report[0].includes("unreadable"));
  assert.equal(storage.getItem("phosphor-set-v3-unreadable"), "{old");
  storage.setItem("phosphor-set-v3", "{later");
  const second = loadSet(storage, scenes);
  assert.ok(second.report[0].includes('"phosphor-set-v3"'));
  assert.ok(
    !second.report[0].includes('"phosphor-set-v3-unreadable"'),
    "an older backup is not claimed to hold the current payload",
  );
  assert.equal(storage.getItem("phosphor-set-v3"), "{later");
  assert.equal(storage.getItem("phosphor-set-v3-unreadable"), "{old");
});

test("runtime state expires after twelve hours", () => {
  const storage = memory();
  saveRuntime(storage, { energy: 0.2 }, 1000);
  assert.deepEqual(loadRuntime(storage, 1000 + 3600e3), { energy: 0.2 });
  assert.equal(loadRuntime(storage, 1000 + 13 * 3600e3), null);
});
