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
      if (a.type === "trigger") {
        current = pool[a.slot];
        energy = current.clip.energy;
      }
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

test("drop cuts to a higher-energy clip; breakdown lowers energy and halves speed", () => {
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
  const trigger = drop.find((a) => a.type === "trigger");
  assert.ok(trigger && trigger.fade === 1);
  assert.ok(pool[trigger.slot].clip.energy >= 0.5);
});

test("never touches master, blackout, flash or page", () => {
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
    assert.ok(["trigger", "energy", "speed", "mirror"].includes(type), type);
});
