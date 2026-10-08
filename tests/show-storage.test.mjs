import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialSession } from "../session.mjs";
import { initialShowSet } from "../show-set.mjs";
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

test("a saved v4 set reloads unchanged", () => {
  const storage = memory();
  const set = initialShowSet(scenes);
  set.name = "Friday";
  saveSet(storage, set);
  assert.equal(loadSet(storage, scenes).set.name, "Friday");
});

test("an existing v2 autosave migrates on first load", () => {
  const storage = memory();
  storage.setItem("phosphor-set-v2", JSON.stringify(initialSession(scenes)));
  const { set, report } = loadSet(storage, scenes);
  assert.equal(set.format, "phosphor-set-v4");
  assert.ok(report[0].includes("Migrated"));
});

test("an existing v3 autosave migrates losslessly under the new key and keeps its source", () => {
  const storage = memory();
  const v3 = initialShowSet(scenes);
  v3.format = "phosphor-set-v3";
  v3.version = 3;
  for (const page of v3.pages) {
    delete page.mood;
    for (const clip of page.slots) if (clip) delete clip.palette;
  }
  v3.pages[0].slots[0].snapshot.palette.primary = "#123456";
  const original = JSON.stringify(v3);
  storage.setItem("phosphor-set-v3", original);
  const { set, report } = loadSet(storage, scenes);
  assert.equal(set.format, "phosphor-set-v4");
  assert.ok(report[0].includes("Migrated"));
  assert.equal(set.pages[0].slots[0].palette, "custom");
  assert.deepEqual(
    set.pages.map((page) =>
      page.slots.filter(Boolean).map((clip) => {
        const { palette, ...old } = clip;
        return old;
      }),
    ),
    v3.pages.map((page) => page.slots.filter(Boolean)),
  );
  assert.deepEqual(JSON.parse(storage.getItem(SET_KEY)), set);
  assert.equal(storage.getItem("phosphor-set-v3"), original);
  assert.deepEqual(loadSet(storage, scenes).set, set);
});

test("a corrupt v4 save falls back to a new set, says so and keeps the original", () => {
  const storage = memory();
  storage.setItem(SET_KEY, "{oops");
  const { set, report } = loadSet(storage, scenes);
  assert.equal(set.format, "phosphor-set-v4");
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
  saveRuntime(storage, { page: 2 }, 1000);
  assert.deepEqual(loadRuntime(storage, 1000 + 3600e3), { page: 2 });
  assert.equal(loadRuntime(storage, 1000 + 13 * 3600e3), null);
});
