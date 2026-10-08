import test from "node:test";
import assert from "node:assert/strict";
import { Autopilot } from "../autopilot.mjs";
import { PALETTES, paletteById } from "../palettes.mjs";

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

test("drop melts fast to a higher-energy clip; breakdown lowers energy and halves speed", () => {
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
  assert.equal(trigger.transition, "melt");
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
    assert.ok(
      ["trigger", "energy", "speed", "drift", "palette"].includes(type),
      type,
    );
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

test("auto uses crossfade normally, both smooth breakdown choices, and one-bar melt on drops (D58)", () => {
  const log = play(new Autopilot({ everyBars: 16, seed: 5 }), 100, {
    events: { 4: "breakdown", 90: "drop" },
  }).filter((action) => action.type === "trigger");
  assert.equal(log[0].transition, "crossfade");
  const breakdowns = log.filter((action) => action.bar > 4 && action.bar < 90);
  assert.deepEqual(
    new Set(breakdowns.map((action) => action.transition)),
    new Set(["melt", "dissolve"]),
  );
  assert.ok(breakdowns.every((action) => action.fade >= 8));
  const drop = new Autopilot({ seed: 5 })
    .update({ bar: 90, pool, current: pool[0], energy: 0.5, event: "drop" })
    .find((action) => action.type === "trigger");
  assert.equal(drop.transition, "melt");
  assert.equal(drop.fade, 4);
});

test("autopilot honours smooth clip choices but never cuts, including breakdowns and drops (D50)", () => {
  for (const transition of ["crossfade", "dissolve", "melt", "cut"]) {
    const choices = pool.map((entry) => ({
      ...entry,
      clip: { ...entry.clip, transition, fade: 0 },
    }));
    const pilot = new Autopilot({ everyBars: 16, seed: 9 });
    let current = null;
    const triggers = [];
    for (let bar = 0; bar < 100; bar++) {
      const event = bar === 4 ? "breakdown" : bar === 70 ? "drop" : null;
      for (const action of pilot.update({
        bar,
        pool: choices,
        current,
        energy: 0.5,
        event,
      }))
        if (action.type === "trigger") {
          triggers.push(action);
          current = choices[action.slot];
        }
    }
    assert.ok(triggers.length > 3);
    assert.ok(
      triggers.every(
        (action) =>
          action.transition ===
            (transition === "cut" ? "crossfade" : transition) &&
          action.fade >= 4,
      ),
    );
  }
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

function paletteSteps(
  pilot,
  { bars = 2000, mood = null, events = {}, manualAt = null } = {},
) {
  let palette = "phosphor";
  const steps = [];
  for (let bar = 0; bar <= bars; bar++) {
    if (bar === manualAt) pilot.manual(bar);
    for (const action of pilot.update({
      bar,
      pool,
      current: pool[0],
      energy: 0.5,
      palette,
      mood,
      event: events[bar] ?? null,
    })) {
      if (action.type !== "palette") continue;
      steps.push({ bar, from: palette, ...action });
      palette = action.id;
    }
  }
  return steps;
}

test("both autopilot modes step palettes every 64–128 bars using the seeded RNG", () => {
  for (const random of [true, false]) {
    const options = { random, seed: 23 };
    const steps = paletteSteps(new Autopilot(options));
    assert.ok(steps.length >= 15);
    let previous = 0;
    for (const step of steps) {
      assert.ok(
        step.bar - previous >= 64 && step.bar - previous <= 128,
        `${random}: ${step.bar - previous} bars`,
      );
      assert.notEqual(step.id, step.from);
      assert.ok(step.beats > 0, "every palette step glides");
      previous = step.bar;
    }
    for (let i = 0; i < steps.length; i++)
      for (let j = Math.max(0, i - 3); j < i; j++)
        assert.notEqual(steps[i].id, steps[j].id);
    assert.deepEqual(paletteSteps(new Autopilot(options)), steps);
    assert.notDeepEqual(
      paletteSteps(new Autopilot({ ...options, seed: 24 })),
      steps,
    );
  }
});

test("palette steps stay in the page mood pool, including small monochrome pools", () => {
  for (const mood of ["warm", "cold", "acid", "mono", "deep", "peak"]) {
    const steps = paletteSteps(new Autopilot({ seed: 5 }), { mood });
    assert.ok(steps.length > 10);
    assert.ok(steps.every((step) => paletteById(step.id).moods.includes(mood)));
    for (let i = 0; i < steps.length; i++)
      for (let j = Math.max(0, i - 3); j < i; j++)
        assert.notEqual(steps[i].id, steps[j].id, mood);
  }
});

test("a drop chooses a contrasting palette in both modes, without waiting for its cadence", () => {
  for (const random of [true, false]) {
    const pilot = new Autopilot({ random, seed: 7 });
    const source = paletteById("ember");
    const actions = pilot.update({
      bar: 4,
      pool,
      current: pool[2],
      energy: 0.5,
      palette: source.id,
      event: "drop",
    });
    const step = actions.find((action) => action.type === "palette");
    assert.ok(step && step.beats > 0);
    const next = paletteById(step.id);
    assert.notEqual(next.id, source.id);
    // Ember's three hues all lie between 11° and 42°. A different main mood
    // or a blue/violet/green stop is independently visible contrast.
    const farHue = Object.values(next.colors).some((hex) => {
      const [r, g, b] = hex
        .slice(1)
        .match(/../g)
        .map((channel) => parseInt(channel, 16));
      return b > r || (g > r && g > b);
    });
    assert.ok(next.moods[0] !== source.moods[0] || farHue, next.id);
  }
  assert.ok(PALETTES.every((palette) => palette.colors.primary !== "#000000"));
});

test("manual input pauses palette steps and drops until the hand-back", () => {
  const steps = paletteSteps(new Autopilot({ seed: 4, handBackBars: 32 }), {
    bars: 250,
    manualAt: 60,
    events: { 61: "drop", 80: "drop", 92: "drop" },
  });
  assert.ok(steps.every((step) => step.bar < 60 || step.bar >= 92));
  assert.ok(steps.some((step) => step.bar === 92));
});
