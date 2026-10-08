import test from "node:test";
import assert from "node:assert/strict";
import { Autopilot } from "../autopilot.mjs";

const clip = (id, energy, autopilot = true) => ({
  id,
  energy,
  fade: 4,
  autopilot,
});
const pool = [0.2, 0.3, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9].map((e, i) => ({
  slot: i,
  clip: clip(`c${i}`, e),
}));

function play(pilot, bars, { events = {}, startEnergy = 0.5 } = {}) {
  let current = null,
    energy = startEnergy;
  const log = [];
  for (let bar = 0; bar < bars; bar++) {
    const actions = pilot.update({
      bar,
      pool,
      current,
      energy,
      event: events[bar] ?? null,
    });
    for (const a of actions) {
      log.push({ bar, ...a });
      // Energy is show state (D54): a trigger does not reset it.
      if (a.type === "trigger") current = pool[a.slot];
      if (a.type === "energy") energy = a.value;
    }
  }
  return log;
}

test("changes clip every N bars on the bar line", () => {
  const log = play(new Autopilot({ everyBars: 32 }), 130).filter(
    (a) => a.type === "trigger",
  );
  assert.deepEqual(
    log.map((a) => a.bar),
    [0, 32, 64, 96, 128],
  );
  assert.ok(log.every((a) => a.quantize === "bar"));
});

test("never repeats any of the last six clips", () => {
  const log = play(new Autopilot({ everyBars: 16, seed: 3 }), 16 * 60).filter(
    (a) => a.type === "trigger",
  );
  for (let i = 0; i < log.length; i++)
    for (let j = Math.max(0, i - 6); j < i; j++)
      assert.notEqual(log[i].slot, log[j].slot, `bar ${log[i].bar}`);
});

test("only plays clips allowed for autopilot", () => {
  const pilot = new Autopilot({ everyBars: 16 });
  const limited = pool.map((p, i) => ({
    ...p,
    clip: { ...p.clip, autopilot: i < 3 },
  }));
  let current = null;
  for (let bar = 0; bar < 400; bar++)
    for (const a of pilot.update({ bar, pool: limited, current, energy: 0.5 }))
      if (a.type === "trigger") {
        assert.ok(a.slot < 3);
        current = limited[a.slot];
      }
});

test("manual input takes over and control returns after the hand-back", () => {
  const pilot = new Autopilot({ everyBars: 16, handBackBars: 32 });
  let triggers = [];
  let current = pool[0];
  for (let bar = 0; bar < 120; bar++) {
    if (bar === 10) pilot.manual(bar);
    for (const a of pilot.update({ bar, pool, current, energy: 0.5 }))
      if (a.type === "trigger") {
        triggers.push(bar);
        current = pool[a.slot];
      }
  }
  assert.ok(
    triggers.every((bar) => bar < 10 || bar >= 42),
    triggers.join(),
  );
  assert.ok(triggers.includes(42));
});

test("drop crossfades fast to a higher-energy clip; breakdown lowers energy and halves speed", () => {
  const log = play(new Autopilot({ everyBars: 64 }), 40, {
    events: { 4: "breakdown", 20: "drop" },
  });
  const at = (bar) => log.filter((a) => a.bar === bar);
  assert.ok(at(4).some((a) => a.type === "speed" && a.value === 0.5));
  assert.ok(at(4).some((a) => a.type === "energy" && a.value < 0.5));
  assert.ok(
    at(12).some((a) => a.type === "trigger"),
    "calmer clip after 8 bars",
  );
  const drop = at(20);
  assert.ok(drop.some((a) => a.type === "speed" && a.value === 1));
  // Breakdown took 0.5 → 0.2; the drop lifts 0.3 above where the chain began.
  const lift = drop.find((a) => a.type === "energy");
  assert.ok(lift && Math.abs(lift.value - 0.8) < 1e-9);
  const trigger = drop.find((a) => a.type === "trigger");
  assert.ok(trigger && trigger.fade === 4); // smooth, never a hard cut
  assert.ok(pool[trigger.slot].clip.energy >= 0.5);
});

test("breakdown/build/drop chains settle back instead of ratcheting energy up (D54)", () => {
  const events = {};
  for (let cycle = 0; cycle < 8; cycle++) {
    events[cycle * 64 + 10] = "breakdown";
    events[cycle * 64 + 18] = "build";
    events[cycle * 64 + 26] = "drop";
  }
  const log = play(new Autopilot({ everyBars: 32 }), 8 * 64, { events });
  const levels = log.filter((a) => a.type === "energy").map((a) => a.value);
  assert.ok(Math.max(...levels) <= 0.8 + 1e-9, String(levels));
  // Before every breakdown (after the first) energy has settled back to 0.5.
  for (let cycle = 1; cycle < 8; cycle++) {
    const before = log
      .filter((a) => a.type === "energy" && a.bar < cycle * 64 + 10)
      .at(-1);
    assert.ok(Math.abs(before.value - 0.5) < 1e-9, JSON.stringify(before));
  }
});

test("never touches master, mirror, blackout, flash or page", () => {
  const log = play(new Autopilot({ everyBars: 16, seed: 9 }), 2000, {
    events: Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [
        i * 20 + 5,
        ["build", "drop", "breakdown"][i % 3],
      ]),
    ),
  });
  const types = new Set(log.map((a) => a.type));
  for (const type of types)
    assert.ok(["trigger", "energy", "speed", "drift"].includes(type), type);
});

test("random mode: regular changes are random, crossfade at least two bars and drift between changes", () => {
  const log = play(new Autopilot({ everyBars: 16, seed: 5 }), 16 * 40);
  const triggers = log.filter((a) => a.type === "trigger");
  assert.ok(triggers.every((a) => a.fade >= 8));
  const steps = triggers.slice(1).map((a, i) => a.slot - triggers[i].slot);
  assert.ok(
    steps.some((s) => s !== 1 && s !== -7),
    "not just page order",
  );
  assert.ok(new Set(triggers.map((a) => a.slot)).size === pool.length);
  // Drift starts once the 2-bar fade is over, then every 8 bars.
  const drifts = log.filter((a) => a.type === "drift").map((a) => a.bar);
  assert.deepEqual(drifts.slice(0, 3), [2, 10, 18]);
});

test("in-order mode walks the page in slot order and never drifts", () => {
  const log = play(new Autopilot({ everyBars: 16, random: false }), 16 * 12);
  assert.deepEqual(
    log.filter((a) => a.type === "trigger").map((a) => a.slot),
    [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3],
  );
  assert.ok(!log.some((a) => a.type === "drift"));
});

test("no drift while a performer has taken over", () => {
  const pilot = new Autopilot({ everyBars: 64, handBackBars: 32 });
  const current = pool[2];
  const drifts = [];
  for (let bar = 0; bar < 80; bar++) {
    if (bar === 20) pilot.manual(bar);
    for (const a of pilot.update({ bar, pool, current, energy: 0.5 }))
      if (a.type === "drift") drifts.push(bar);
  }
  assert.ok(drifts.length > 2);
  assert.ok(
    drifts.every((bar) => bar < 20 || bar >= 52),
    drifts.join(),
  );
});
