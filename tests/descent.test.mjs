import test from "node:test";
import assert from "node:assert/strict";
import descent from "../scene-descent.mjs";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { catalogLooks } from "../catalog.mjs";
import { defaultPattern, samplePattern, validatePattern } from "../rhythm.mjs";
import { rhythmResponse } from "../engine-rhythm.mjs";

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// CPU mirror of the shader's per-frame hall sizes and camera path. The source
// checks below fail if the shader drifts away from these expressions.
function frame(dev, open) {
  const cave = smooth(0, 1, dev),
    city = smooth(1, 2, dev),
    variation = smooth(0.35, 1.25, dev),
    b = open / 3,
    rise = Math.exp(2.8 * city);
  const xs = [mix(b, 2.6, cave) * rise, mix(b, 2.0, cave) - 0.1 * city];
  const zs = [
    mix(b, 2.1, cave) - 0.6 * city,
    mix(b, 2.6, cave) * Math.exp(3.2 * city),
  ];
  const ys = [mix(b, 0.9, cave), mix(b, 0.9, cave)];
  // The narrowest per-block variant is contained in every block's free space.
  const narrow = {
    xs: [mix(xs[0], Math.min(xs[0], 2.7), city), xs[1]],
    zs: [
      zs[0] * mix(1, 0.55, variation),
      mix(zs[1], Math.min(zs[1], 1.6), city),
    ],
    ys: ys.map((v) => v * mix(1, 0.6, variation)),
  };
  const coreY = Math.min(xs[0], 1.6) - b,
    coreZ = xs[1] - b;
  return {
    b,
    xs,
    narrow,
    deck: 0.4 * city,
    ay: 0.15 * b + 0.5 * coreY,
    az: 0.15 * b + 0.55 * coreZ,
  };
}
function narrowHall(f, p) {
  const q = p.map((v) => v - Math.floor(v / 6 + 0.5) * 6).map(Math.abs);
  const { xs, zs, ys } = f.narrow;
  const hall = Math.min(
    Math.max(q[1] - xs[0], q[2] - xs[1]),
    Math.max(q[0] - zs[0], q[1] - zs[1]),
    Math.max(q[0] - ys[0], q[2] - ys[1]),
  );
  // City decks (assumed present in every block for the bound).
  const m = ((p[1] % 18) + 18) % 18;
  return Math.max(hall, f.deck - Math.abs(m - 9));
}

test("descent shader keeps the mirrored hall and camera expressions", () => {
  for (const line of [
    "float rise = exp(2.8 * gCity);",
    "gXs = vec2(mix(b, 2.6, gCave) * rise, mix(b, 2.0, gCave) - 0.1 * gCity);",
    "gZs = vec2(mix(b, 2.1, gCave) - 0.6 * gCity, mix(b, 2.6, gCave) * exp(3.2 * gCity));",
    "gYs = vec2(mix(b, 0.9, gCave), mix(b, 0.9, gCave));",
    "gVar = smoothstep(0.35, 1.25, dev);",
    "xs.y *= 1.0 + gVar * 0.3 * r.x;",
    "zs.x *= mix(1.0, mix(0.55, 1.3, r.y), gVar);",
    "ys *= mix(1.0, mix(0.6, 1.4, r.z), gVar);",
    "xs.x = mix(xs.x, min(xs.x, 2.7), step(r.w, 0.16) * gCity);",
    "zs.y = mix(zs.y, min(zs.y, 1.6 + 2.2 * r.x), step(0.72, r.w) * gCity);",
    "zs.x = mix(zs.x, 3.4, avenue);",
    "deck = 0.4 * gCity * step(fract(r.x * 7.0 + r.w * 3.0), 0.55);",
    "narrow = max(narrow, 0.4 * gCity - abs(mod(p.y, 18.0) - 9.0));",
    "float coreY = min(gXs.x, 1.6) - b, coreZ = gXs.y - b;",
    "float ay = 0.15 * b + 0.5 * coreY, az = 0.15 * b + 0.55 * coreZ;",
    "vec3 ro = vec3(s, ay * sin(2.0 * w + 1.3), az * sin(w));",
  ])
    assert.ok(descent.fragment.includes(line), line);
});

test("the camera stays inside free space for every development, opening and block", () => {
  let worst = Infinity;
  for (let dev = 0; dev <= 2.0001; dev += 0.01)
    for (const open of [0.75, 1, 1.2]) {
      const f = frame(dev, open);
      for (let s = 0; s < 6; s += 0.01) {
        const w = (s * 2 * Math.PI) / 6;
        // The flight impulse changes forward rate, not free-core clearance.
        const ro = [s, f.ay * Math.sin(2 * w + 1.3), f.az * Math.sin(w)];
        const free = -narrowHall(f, ro);
        worst = Math.min(worst, free);
      }
    }
  // At least 0.2 units of clearance in the narrowest block variant.
  assert.ok(worst > 0.2, `camera clearance ${worst}`);
});

test("banking and the kick stay within the style limits", () => {
  assert.match(descent.fragment, /float roll = bankAmount \* 0\.16 \*/);
  const bank = descent.schema.find((f) => f.key === "bank");
  assert.equal(bank.max, 1);
  assert.match(descent.fragment, /1\.0 \+ kick \* 0\.025/);
  const [a, b] = descent.energy.speed.mul;
  assert.ok(b / a <= 2.05, "energy raises speed at most about 2x");
});

// Emulate the one-texel integrator with its 16-bit storage. Absolute travel
// (phase + wrap counter) must advance smoothly, so block variation keyed by
// floor(x / 6) + counter never jumps when the phase wraps.
test("travel phase and wrap counter integrate without jumps", () => {
  const pack = (v) =>
    Math.floor(Math.min(1, Math.max(0, v)) * 65535 + 0.5) / 65535;
  let state = [pack((9301 * 0.0173) % 1), 0];
  let previous = null,
    wraps = 0;
  for (let tick = 0; tick < 60 * 600; tick++) {
    const dev = (tick / 6000) % 2;
    const impulse = 0.5 + 0.5 * Math.sin(tick / 30);
    const surge = 1 + 0.6 * impulse;
    const x = state[0] + ((1 / 60) * 0.8 * 0.85 * (1 + 0.55 * dev) * surge) / 6;
    const w = Math.floor(x);
    const counter = Math.floor(state[1] * 65535 + 0.5);
    state = [pack(x - w), pack(((counter + w) % 65535) / 65535)];
    wraps += w;
    const absolute = state[0] * 6 + Math.round(state[1] * 65535) * 6;
    if (previous !== null) {
      const step = absolute - previous;
      assert.ok(step > 0 && step < 0.05, `tick ${tick}: step ${step}`);
    }
    previous = absolute;
  }
  assert.ok(wraps > 100);
  assert.match(
    descent.simulation.fragment,
    /state = vec2\(x - wraps, mod\(counter \+ wraps, 65535\.0\) \/ 65535\.0\);/,
  );
});

test("descent declares a continuous three-state world and strong extra looks", () => {
  assert.equal(descent.development, "development");
  assert.deepEqual(descent.type, { key: "development", values: [0, 1, 2] });
  assert.ok(descent.number >= 93 && descent.number <= 95);
  assert.ok(descent.presets.length >= 8);
  for (const preset of descent.presets)
    for (const field of descent.schema) {
      const v = preset.params[field.key];
      assert.ok(
        Number.isFinite(v) && v >= field.min && v <= field.max,
        `${preset.name}.${field.key}`,
      );
    }
  const ids = catalogLooks(scenes).map((l) => l.id);
  const world = defaultWorlds(ids).find((w) => w.id === "descent");
  assert.ok(world, "authored world is playable");
  const clips = world.states.map((s) => {
    const index = descent.presets.findIndex(
      (p) => `descent:${p.name}` === s.look,
    );
    return { snapshot: presetSnapshot(descent, index) };
  });
  assert.deepEqual(continuousDevelopment(clips, descent)?.positions, [0, 1, 2]);
  assert.equal(
    new Set(descent.presets.map((p) => p.seed)).size,
    descent.presets.length - 2,
  );
});

test("constant-scale field preserves the full candidate order and suffix bound", () => {
  const cross = (p, w) => {
    const [x, y, z] = p.map(Math.abs);
    return Math.min(Math.max(x, y), Math.max(y, z), Math.max(z, x)) - w;
  };
  const map = (p, dev, open, levels, stop) => {
    const f = frame(dev, open),
      w = open / 3,
      w0 = w * mix(1, 0.6, smooth(1, 2, dev));
    let holes = narrowHall(f, p),
      trap = -1;
    for (let i = 0; i < 5 && i < levels; i++) {
      const sc = 3 ** i;
      const q = p.map((v) => ((((v * sc + 1) % 2) + 2) % 2) - 1);
      const c = cross(q, (i === 0 ? w0 : w) * Math.min(1, levels - i)) / sc;
      if (c < holes) {
        holes = c;
        trap = i;
      }
      if (stop && holes <= -w / (sc * 3)) break;
    }
    return [-holes, trap];
  };
  let rng = 9301;
  const rand = () =>
    (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  for (let i = 0; i < 30000; i++) {
    const p = [rand() * 24 - 12, rand() * 40 - 20, rand() * 24 - 12];
    const dev = rand() * 2,
      open = 0.75 + rand() * 0.45,
      levels = 2 + rand() * 3;
    assert.deepEqual(
      map(p, dev, open, levels, true),
      map(p, dev, open, levels, false),
    );
  }
  for (const sc of [1, 3, 9, 27, 81])
    assert.ok(descent.fragment.includes(`p * ${sc}. + 1.0`));
  assert.match(descent.fragment, /d \* 0\.97/);
  assert.match(descent.fragment, /gAoH = .*vec3\(0\.025, 0\.1, 0\.4\)/);
  assert.match(descent.fragment, /2\.0 \* u_resolution\.y \/ shortSide/);
});

test("descent retains legacy gestures and adds authored slot-3 ignition", () => {
  assert.deepEqual(
    descent.rhythm.slice(0, 3).map((r) => [r.slot, r.defaults.length]),
    [
      [0, 4],
      [1, 8],
      [2, 16],
    ],
  );
  const signature = descent.rhythm.find((r) => r.slot === 3);
  assert.equal(signature.id, "ignition-wave");
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const pattern = defaultPattern(descent.rhythm, style);
    validatePattern(pattern, descent.rhythm);
    const density = pattern.tracks.reduce(
      (sum, t) =>
        sum + (t.steps.filter((s) => s > 0).length * 4 * t.division) / t.length,
      0,
    );
    assert.ok(density >= minimum, `${style}: ${density} >= ${minimum}`);
    const loop = signature.styles[style];
    assert.ok(loop.steps.filter((s) => s > 0).length >= 2);
    assert.equal(loop.strength, 1);
    assert.ok(loop.steps.every((s) => s === 0 || s === 1));
    for (let beat = 0; beat < 64; beat += 0.125) {
      const sample = samplePattern(pattern, descent.rhythm, beat, beat - 0.125);
      for (const values of [sample.values, sample.hits, sample.counts])
        assert.ok(values.every(Number.isFinite));
    }
  }
  assert.match(descent.fragment, /u_rhythm\.w/);
  assert.match(descent.fragment, /mod\(u_rhythmCount\.w, 2\.0\)/);
  assert.match(
    descent.simulation.fragment,
    /1\.0 \+ 0\.6 \* clamp\(u_rhythm\.y/,
  );
  assert.doesNotMatch(descent.fragment, /state\.x \* 6\.0 \+ u_rhythm\.y/);
});

test("ignition front is finite, bounded and smoothly monotone at every energy", () => {
  for (const level of [0, 0.1, 0.5, 0.85, 0.9, 1]) {
    let previous = -1;
    for (let i = 0; i <= 100; i++) {
      const progress = i / 100;
      const decay = 1 - progress;
      const envelope = decay * decay * (3 - 2 * decay) * rhythmResponse(level);
      const value = Math.min(1, Math.max(0, envelope / rhythmResponse(level)));
      const front = 1 - value;
      assert.ok(Number.isFinite(front) && front >= 0 && front <= 1);
      assert.ok(front >= previous - 1e-12);
      assert.ok(Math.abs(front - smooth(0, 1, progress)) < 1e-8);
      previous = front;
    }
  }
});
