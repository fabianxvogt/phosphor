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
} from "../show-storage.mjs";

const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
};

test("a saved v3 set reloads unchanged", () => {
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
  assert.equal(set.format, "phosphor-set-v3");
  assert.ok(report[0].includes("Migrated"));
});

test("a corrupt v3 save falls back to a new set and says so", () => {
  const storage = memory();
  storage.setItem(SET_KEY, "{oops");
  const { set, report } = loadSet(storage, scenes);
  assert.equal(set.format, "phosphor-set-v3");
  assert.ok(report[0].includes("unreadable"));
});

test("runtime state expires after twelve hours", () => {
  const storage = memory();
  saveRuntime(storage, { page: 2 }, 1000);
  assert.deepEqual(loadRuntime(storage, 1000 + 3600e3), { page: 2 });
  assert.equal(loadRuntime(storage, 1000 + 13 * 3600e3), null);
});
