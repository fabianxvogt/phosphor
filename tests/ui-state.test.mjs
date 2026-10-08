import test from "node:test";
import assert from "node:assert/strict";
import {
  manualOverrideUI,
  selectedDevice,
  numberValue,
  pruneLocks,
  breedSiblings,
  updateWaiting,
  OutputWindow,
  OutputConnection,
} from "../ui-state.mjs";
import { Transport } from "../transport.mjs";
import { createLineage } from "../evolution.mjs";
import scenes from "../scenes.mjs";
import { initialSession } from "../session.mjs";
test("F5 repeated slider/CC updates do not reconstruct the cue list", () => {
  const transport = new Transport();
  let renders = 0;
  for (let i = 0; i < 60; i++) manualOverrideUI(transport, () => renders++);
  assert.equal(renders, 0);
  transport.score(initialSession(scenes).cues);
  manualOverrideUI(transport, () => renders++);
  assert.equal(renders, 1);
});
test("F9 device refresh preserves the chosen live input when still available", () => {
  assert.equal(
    selectedDevice("line-in", [{ id: "line-in" }, { id: "mic" }]),
    "line-in",
  );
  assert.equal(selectedDevice("removed", [{ id: "mic" }]), "");
});
test("F10 repeated clean output uses focus without navigating, including control reload", () => {
  let calls = 0,
    focused = 0,
    navigated = 0;
  const window = {
    closed: false,
    location: {
      href: "http://localhost/output.html",
      replace: () => navigated++,
    },
    focus: () => focused++,
  };
  const manager = new OutputWindow((url) => {
    calls++;
    assert.equal(url, "");
    return window;
  });
  assert.equal(manager.show(), window);
  manager.show();
  assert.equal(calls, 1);
  assert.equal(focused, 2);
  assert.equal(navigated, 0);
  const reload = new OutputWindow(() => window);
  reload.show();
  assert.equal(navigated, 0);
});
test("F11 output reconnects after opener reload or ended capture track", async () => {
  const video = { play: async () => {} };
  const connection = new OutputConnection(video, () => {});
  let stopped = 0;
  const track = { readyState: "live", stop: () => stopped++ };
  const first = { getTracks: () => [track] };
  const second = { getTracks: () => [{ readyState: "live", stop() {} }] };
  const api = { outputStream: () => first };
  await connection.refresh(api);
  await connection.refresh(api);
  assert.equal(stopped, 0);
  await connection.refresh({ outputStream: () => second });
  assert.equal(video.srcObject, second);
  assert.equal(stopped, 1);
  let replacements = 0;
  const ended = { getTracks: () => [{ readyState: "ended", stop() {} }] };
  const endedApi = {
    outputStream: () => {
      replacements++;
      return ended;
    },
  };
  await connection.refresh(endedApi);
  await connection.refresh(endedApi);
  assert.equal(replacements, 2);
});
test("F14 breeding prunes scene-incompatible locks and keeps the audible parent selected", () => {
  const locks = new Set(["feed", "yaw"]);
  pruneLocks(locks, scenes[0]);
  assert.deepEqual([...locks], ["feed"]);
  const root = createLineage(scenes[0], scenes[0].presets[0]);
  const next = breedSiblings(root, scenes[0], [4, 5, 6], {
    strength: 0.2,
    locked: [...locks],
  });
  assert.equal(next.nodes.length, 4);
  assert.equal(next.selectedId, root.selectedId);
  for (const child of next.nodes.slice(1)) {
    assert.equal(child.parentId, root.selectedId);
    assert.equal(child.params.feed, root.nodes[0].params.feed);
  }
});
test("F15 cleared numeric fields are invalid, not zero; explicit zero stays valid", () => {
  assert.equal(Number.isNaN(numberValue("")), true);
  assert.equal(Number.isNaN(numberValue("  ")), true);
  assert.equal(numberValue("0"), 0);
});
test("F16 update notice requires an existing controller and detects an already-waiting update", () => {
  assert.equal(updateWaiting({ waiting: {} }, null), false);
  assert.equal(updateWaiting({ waiting: {} }, {}), true);
  assert.equal(updateWaiting({ waiting: null }, {}), false);
});
test("F11 reconnect failures explicitly expose status even on a fullscreen output", async () => {
  const states = [];
  const connection = new OutputConnection(
    { play: async () => {} },
    (text, connected) => states.push({ text, connected }),
  );
  await connection.refresh(null);
  assert.equal(states.at(-1).connected, false);
  await connection.refresh({
    outputStream: () => {
      throw new Error("capture ended");
    },
  });
  assert.equal(states.at(-1).connected, false);
  assert.ok(states.at(-1).text.includes("capture ended"));
  await connection.refresh({ outputStream: () => ({ getTracks: () => [] }) });
  assert.equal(states.at(-1).connected, true);
});
