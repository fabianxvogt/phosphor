import test from "node:test";
import assert from "node:assert/strict";
import descent from "../scene-descent.mjs";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { catalogLooks } from "../catalog.mjs";

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
        // The flight impulse may add up to 0.15 units of travel; x is free.
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
    const x = state[0] + ((1 / 60) * 0.8 * 0.85 * (1 + 0.55 * dev)) / 6;
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

test("descent rhythm gestures use periods 4, 8 and 16", () => {
  assert.deepEqual(
    descent.rhythm.map((r) => [r.slot, r.defaults.length]),
    [
      [0, 4],
      [1, 8],
      [2, 16],
    ],
  );
});
