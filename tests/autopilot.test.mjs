import test from "node:test";
import assert from "node:assert/strict";
import { Autopilot, RANDOM_BARS } from "../autopilot.mjs";
import { PALETTES, paletteById } from "../palettes.mjs";

const clip = (id, energy, autopilot = true) => ({
  id,
  energy,
  fade: 4,
  autopilot,
});
const pool = [0.2, 0.3, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9].map((e, i) => ({
  order: i,
  clip: clip(`c${i}`, e),
}));
// A trigger carries its clip; its position in a pool by clip id.
const at = (trigger, from = pool) =>
  from.findIndex((p) => p.clip.id === trigger.clip.id);

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
      if (a.type === "trigger") current = pool[at(a)];
      if (a.type === "energy") energy = a.value;
    }
  }
  return log;
}

test("in-order mode changes clip every N bars on the bar line", () => {
  for (const everyBars of [8, 12, 16, 32, 64]) {
    const pilot = new Autopilot({ everyBars, random: false });
    const log = play(pilot, 130).filter((a) => a.type === "trigger");
    assert.deepEqual(
      log.map((a) => a.bar),
      Array.from(
        { length: Math.ceil(130 / everyBars) },
        (_, i) => i * everyBars,
      ),
    );
    assert.ok(log.every((a) => a.quantize === "bar"));
    assert.equal(pilot.duration, everyBars);
  }
});

test("random mode plays each clip a uniformly random 8, 12 or 16 bars (D66)", () => {
  const pilot = new Autopilot({ everyBars: 64, seed: 11 });
  const log = play(pilot, 4000).filter((a) => a.type === "trigger");
  const gaps = log.slice(1).map((a, i) => a.bar - log[i].bar);
  const counts = { 8: 0, 12: 0, 16: 0 };
  for (const gap of gaps) counts[gap]++;
  assert.equal(counts[8] + counts[12] + counts[16], gaps.length, String(gaps));
  for (const bars of [8, 12, 16])
    assert.ok(
      Math.abs(counts[bars] / gaps.length - 1 / 3) < 0.06,
      JSON.stringify(counts),
    );
  assert.ok(RANDOM_BARS.includes(pilot.duration));
  assert.equal(pilot.nextChange - log.at(-1).bar, pilot.duration);
});

test("random picks follow pool weights; weight 0 never plays", () => {
  const weighted = pool.map((p, i) => ({
    ...p,
    weight: i === 0 ? 10 : i === 1 ? 0 : 1,
  }));
  // Fresh pilots (no history): the first pick follows the weights alone.
  const counts = new Array(8).fill(0);
  for (let seed = 1; seed <= 4000; seed++)
    counts[
      at(
        new Autopilot({ seed }).next({ bar: 0, pool: weighted, current: null }),
      )
    ]++;
  assert.equal(counts[1], 0, "rated 0: never");
  assert.ok(
    Math.abs(counts[0] / 4000 - 10 / 16) < 0.03,
    JSON.stringify(counts),
  );
  for (let slot = 2; slot < 8; slot++)
    assert.ok(
      Math.abs(counts[slot] / 4000 - 1 / 16) < 0.02,
      JSON.stringify(counts),
    );
  // Over a long run, history still spreads the changes, and 0 never plays.
  const pilot = new Autopilot({ everyBars: 16, seed: 2 });
  let current = null;
  for (let bar = 0; bar < 16 * 500; bar++)
    for (const a of pilot.update({ bar, pool: weighted, current, energy: 0.5 }))
      if (a.type === "trigger") {
        assert.notEqual(at(a), 1);
        current = weighted[at(a)];
      }
});

test("avoids the last 24 looks in a large pool", () => {
  const looks = Array.from({ length: 60 }, (_, i) => ({
    order: i,
    clip: { ...clip(`look-${i}`, 0.5), transition: "auto" },
  }));
  const pilot = new Autopilot({ seed: 4 });
  let current = null;
  const ids = [];
  for (let bar = 0; bar < 16 * 300; bar++)
    for (const a of pilot.update({ bar, pool: looks, current, energy: 0.5 }))
      if (a.type === "trigger") {
        assert.ok(a.clip, "triggers carry their clip");
        ids.push(a.clip.id);
        current = looks.find((l) => l.clip.id === a.clip.id);
      }
  assert.ok(ids.length > 200);
  for (let i = 0; i < ids.length; i++)
    for (let j = Math.max(0, i - 24); j < i; j++)
      assert.notEqual(ids[i], ids[j], `change ${i}`);
});

test("Next plays the pick on the next beat with the regular fade and re-arms the duration", () => {
  const pilot = new Autopilot({ seed: 6 });
  play(pilot, 3); // first trigger at bar 0
  pilot.enabled = false; // works with autopilot off, without enabling it
  const before = pilot.manualUntil;
  const next = pilot.next({ bar: 5, pool, current: pool[0] });
  assert.equal(next.type, "trigger");
  assert.equal(next.quantize, "beat");
  assert.equal(next.fade, 12);
  assert.notEqual(at(next), 0);
  assert.ok(["crossfade", "dissolve", "melt"].includes(next.transition));
  assert.ok(RANDOM_BARS.includes(pilot.duration));
  assert.equal(pilot.nextChange, 5 + pilot.duration);
  assert.equal(pilot.nextDrift, 8, "drift waits for the three-bar fade");
  assert.equal(pilot.manualUntil, before, "not a performer takeover");
  assert.equal(pilot.enabled, false);
  assert.equal(pilot.history.at(-1), next.clip.id);
  const ordered = new Autopilot({ random: false, everyBars: 32 });
  const step = ordered.next({ bar: 2, pool, current: pool[3] });
  assert.equal(at(step), 4);
  assert.equal(step.transition, "crossfade");
  assert.equal(ordered.nextChange, 34);
  assert.equal(
    new Autopilot().next({ bar: 0, pool: [pool[0]], current: pool[0] }),
    null,
  );
});

test("a small pool avoids recent looks while keeping more than half to choose from", () => {
  const log = play(new Autopilot({ everyBars: 16, seed: 3 }), 16 * 60).filter(
    (a) => a.type === "trigger",
  );
  for (let i = 0; i < log.length; i++)
    for (let j = Math.max(0, i - 3); j < i; j++)
      assert.notEqual(at(log[i]), at(log[j]), `bar ${log[i].bar}`);
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
        assert.ok(at(a, limited) < 3);
        current = limited[at(a, limited)];
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
        current = pool[at(a)];
      }
  }
  assert.ok(
    triggers.every((bar) => bar < 10 || bar >= 42),
    triggers.join(),
  );
  assert.ok(triggers.includes(42));
});

test("drop melts fast to another look; breakdown lowers energy and halves speed", () => {
  const log = play(new Autopilot({ everyBars: 64, random: false }), 40, {
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

test("never touches master, mirror, blackout or flash", () => {
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

test("random mode: regular changes are random, fade over three bars and drift between changes", () => {
  const log = play(new Autopilot({ everyBars: 16, seed: 5 }), 16 * 40);
  const triggers = log.filter((a) => a.type === "trigger");
  assert.ok(triggers.every((a) => a.fade >= 12));
  const steps = triggers.slice(1).map((a, i) => at(a) - at(triggers[i]));
  assert.ok(
    steps.some((s) => s !== 1 && s !== -7),
    "not just catalog order",
  );
  assert.ok(new Set(triggers.map((a) => at(a))).size === pool.length);
  // Drift starts once the 3-bar fade is over, then every 8 bars until the
  // next change.
  const drifts = log.filter((a) => a.type === "drift").map((a) => a.bar);
  assert.equal(drifts[0], 3);
  for (const bar of drifts) {
    const last = triggers.filter((a) => a.bar <= bar).at(-1);
    assert.ok((bar - last.bar - 3) % 8 === 0, `drift at ${bar}`);
  }
});

test("in-order mode walks the catalog in order and never drifts", () => {
  const log = play(new Autopilot({ everyBars: 16, random: false }), 16 * 12);
  assert.deepEqual(
    log.filter((a) => a.type === "trigger").map((a) => at(a)),
    [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3],
  );
  assert.ok(!log.some((a) => a.type === "drift"));
});

test("random changes mix crossfade 60 %, dissolve 20 % and melt 20 %; in order they crossfade (D66)", () => {
  const counts = { crossfade: 0, dissolve: 0, melt: 0 };
  const random = play(new Autopilot({ seed: 8 }), 6000).filter(
    (a) => a.type === "trigger",
  );
  for (const a of random) counts[a.transition]++;
  const n = random.length;
  assert.ok(n > 400);
  assert.ok(
    Math.abs(counts.crossfade / n - 0.6) < 0.07,
    JSON.stringify(counts),
  );
  assert.ok(Math.abs(counts.dissolve / n - 0.2) < 0.06, JSON.stringify(counts));
  assert.ok(Math.abs(counts.melt / n - 0.2) < 0.06, JSON.stringify(counts));
  const ordered = play(new Autopilot({ random: false }), 400).filter(
    (a) => a.type === "trigger",
  );
  assert.ok(
    ordered.every((a) => a.transition === "crossfade" && a.fade === 12),
  );
});

test("auto uses smooth breakdown choices and one-bar melt on drops (D58)", () => {
  const log = play(
    new Autopilot({ everyBars: 16, seed: 5, random: false }),
    100,
    {
      events: { 4: "breakdown", 90: "drop" },
    },
  ).filter((action) => action.type === "trigger");
  assert.equal(log[0].transition, "crossfade");
  const breakdowns = log.filter((action) => action.bar > 4 && action.bar < 90);
  assert.deepEqual(
    new Set(breakdowns.map((action) => action.transition)),
    new Set(["melt", "dissolve"]),
  );
  assert.ok(breakdowns.every((action) => action.fade >= 12));
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
          current = choices[at(action, choices)];
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
