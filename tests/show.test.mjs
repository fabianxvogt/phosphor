import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { Show } from "../show.mjs";

const safeSnapshot = presetSnapshot(
  scenes.find((s) => s.id === "interference"),
);
function makeShow(mutate) {
  const set = initialShowSet(scenes);
  set.clock.mode = "manual";
  set.clock.manualBpm = 120; // 0.5 s per beat, 2 s per bar
  mutate?.(set);
  return new Show({ set: validateShowSet(set, scenes), safeSnapshot, now: 0 });
}
const loads = (actions) => actions.filter((a) => a.type === "load");

test("a beat-quantized slot fires on the next beat with its fade in seconds", () => {
  const show = makeShow((set) => {
    set.autopilot.enabled = false;
    set.pages[0].slots[3].fade = 2;
  });
  assert.deepEqual(loads(show.command({ type: "slot", index: 3 }, 0.3)), []);
  assert.deepEqual(loads(show.tick(0.45)), []);
  const fired = loads(show.tick(0.5));
  assert.equal(fired.length, 1);
  assert.equal(fired[0].slot, 3);
  assert.equal(fired[0].fadeSeconds, 1); // 2 beats at 120 BPM
  assert.equal(show.status(0.5).live.slot, 3);
});

test("a press just after the beat fires immediately", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  assert.equal(loads(show.command({ type: "slot", index: 0 }, 1.02)).length, 1);
});

test("bar quantize waits for the bar line; the latest press wins", () => {
  const show = makeShow((set) => {
    set.autopilot.enabled = false;
    set.pages[0].slots[1].quantize = "bar";
    set.pages[0].slots[2].quantize = "bar";
  });
  show.command({ type: "slot", index: 1 }, 0.6);
  show.command({ type: "slot", index: 2 }, 0.9);
  assert.deepEqual(loads(show.tick(1.9)), []);
  const fired = loads(show.tick(2.0));
  assert.equal(fired[0].slot, 2);
});

test("empty slots do nothing", () => {
  const show = makeShow((set) => {
    set.autopilot.enabled = false;
    set.pages[0].slots[31] = null;
  });
  assert.deepEqual(show.command({ type: "slot", index: 31 }, 0), []);
});

test("autopilot plays the current page and pauses after manual input", () => {
  const show = makeShow((set) => (set.autopilot.everyBars = 16));
  const fired = [];
  for (let t = 0; t < 200; t += 0.01) {
    if (Math.abs(t - 40) < 0.005) show.command({ type: "slot", index: 5 }, t);
    for (const a of loads(show.tick(t))) fired.push({ t, slot: a.slot });
  }
  // Bar = 2 s. Changes at bars 0 and 16 (t = 0, 32), manual at t = 40
  // (bar 20) holds until bar 52 (t = 104), then every 16 bars.
  const auto = fired.filter((f) => f.slot !== 5 || Math.abs(f.t - 40.5) > 0.1);
  assert.ok(
    auto.every((f) => f.t < 40 || f.t >= 104 - 0.01),
    JSON.stringify(auto),
  );
  assert.ok(auto.some((f) => Math.abs(f.t - 104) < 0.05));
});

test("energy keys step by 0.1, speed keys toggle, blackout toggles", () => {
  const show = makeShow();
  show.energy = 0.5;
  show.command({ type: "energy", direction: 1 }, 0);
  assert.ok(Math.abs(show.energy - 0.6) < 1e-9);
  assert.equal(show.command({ type: "speed", value: 0.5 }, 0)[0].value, 0.5);
  assert.equal(show.command({ type: "speed", value: 0.5 }, 0)[0].value, 1);
  assert.equal(show.command({ type: "speed", value: 2 }, 0)[0].value, 2);
  assert.equal(show.command({ type: "blackout" }, 0)[0].on, true);
  assert.equal(show.command({ type: "blackout" }, 0)[0].on, false);
});

test("safe look clears blackout, freeze and flash and resets shared controls", () => {
  const show = makeShow();
  show.command({ type: "blackout" }, 0);
  show.command({ type: "freeze" }, 0);
  show.command({ type: "shared", mirror: 6, hue: 0.3 }, 0);
  const actions = show.command({ type: "safe" }, 1);
  assert.equal(actions[0].type, "safe");
  assert.deepEqual(actions[0].snapshot, safeSnapshot);
  const s = show.status(1);
  assert.equal(s.blackout, false);
  assert.equal(s.freeze, false);
  assert.equal(s.shared.mirror, 1);
  assert.equal(s.shared.hue, 0);
});

test("crash snapshot restores clip, energy, shared controls and clock", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  show.command({ type: "slot", index: 4 }, 0);
  show.command({ type: "energy", value: 0.8 }, 0);
  show.command({ type: "shared", zoom: 1.5 }, 0);
  for (let i = 0; i < 4; i++) show.command({ type: "tap" }, 1 + i * (60 / 132));
  const saved = JSON.parse(JSON.stringify(show.snapshot(5)));
  const again = makeShow((set) => (set.autopilot.enabled = false));
  const actions = again.restore(saved, 0);
  assert.equal(actions[0].type, "load");
  assert.equal(actions[0].slot, 4);
  assert.equal(actions[0].fadeSeconds, 0);
  const s = again.status(0);
  assert.equal(s.energy, 0.8);
  assert.equal(s.shared.zoom, 1.5);
  assert.ok(Math.abs(s.clock.bpm - 132) < 0.01);
});

test("stage faders tweak the live clip without changing the saved set", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  show.command({ type: "slot", index: 0 }, 0);
  const key = Object.keys(show.live.clip.snapshot.params)[0];
  const before = show.set.pages[0].slots[0].snapshot.params[key];
  const [action] = show.command(
    { type: "param", key, value: before + 0.01 },
    0.1,
  );
  assert.equal(action.type, "params");
  assert.equal(action.snapshot.params[key], before + 0.01);
  assert.equal(show.set.pages[0].slots[0].snapshot.params[key], before);
});

test("audition plays an unsaved clip immediately", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  const clip = structuredClone(show.set.pages[0].slots[2]);
  clip.name = "draft";
  const [load] = show.command({ type: "audition", clip }, 0.3);
  assert.equal(load.type, "load");
  assert.equal(load.slot, -1);
  assert.equal(show.status(0.3).live.slot, -1);
});

test("autopilot and keys never schedule a family whose shaders failed", () => {
  const show = makeShow((set) => (set.autopilot.everyBars = 16));
  show.disable("acid", 0);
  assert.deepEqual(show.command({ type: "slot", index: 0 }, 0.6), []); // acid
  const fired = [];
  for (let t = 0; t < 400; t += 0.05) fired.push(...loads(show.tick(t)));
  assert.ok(fired.length > 5);
  assert.ok(fired.every((a) => a.snapshot.scene !== "acid"));
  assert.deepEqual(show.status(400).disabled, ["acid"]);
});

test("a failed family on screen cuts at once to a playable clip on the page", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  show.command({ type: "slot", index: 0 }, 0.5); // acid, fires on the beat
  assert.equal(show.status(0.5).live.slot, 0);
  const cut = loads(show.disable("acid", 0.7, true));
  assert.equal(cut.length, 1);
  assert.equal(cut[0].fadeSeconds, 0);
  assert.notEqual(cut[0].snapshot.scene, "acid");
  assert.equal(show.status(0.7).live.slot, cut[0].slot);
});

test("with the page unplayable the safe look takes over, then any page, then blackout", () => {
  const show = makeShow((set) => {
    set.autopilot.enabled = false;
    const cathedral = set.pages[0].slots[6];
    for (const page of set.pages)
      page.slots = page.slots.map((c) =>
        c?.snapshot.scene === "acid" ? c : null,
      );
    for (const page of set.pages.slice(1)) page.slots.fill(null);
    set.pages[1].slots[4] = cathedral;
  });
  show.command({ type: "slot", index: 0 }, 0.5);
  const safe = show.disable("acid", 1, true);
  assert.deepEqual(
    safe.map((a) => a.type),
    ["safe"],
  );
  assert.equal(safe[0].snapshot.scene, "interference");
  const other = loads(show.disable("interference", 2, true));
  assert.equal(other[0].snapshot.scene, "cathedral");
  assert.equal(show.status(2).live.page, 1);
  assert.deepEqual(show.disable("cathedral", 3, true), [
    { type: "blackout", on: true },
  ]);
  assert.equal(show.blackout, true);
});
