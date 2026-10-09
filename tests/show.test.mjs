import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { initialShowSet, validateShowSet } from "../show-set.mjs";
import { Show } from "../show.mjs";
import { paletteById } from "../palettes.mjs";
import { catalogLooks, sortCatalog } from "../catalog.mjs";

const safeSnapshot = presetSnapshot(
  scenes.find((s) => s.id === "interference"),
);
const authored = catalogLooks(scenes);
function makeShow(mutate, family = scenes) {
  const set = initialShowSet(family);
  set.clock.mode = "manual";
  set.clock.manualBpm = 120; // 0.5 s per beat, 2 s per bar
  mutate?.(set);
  return new Show({
    set: validateShowSet(set, family),
    safeSnapshot,
    scenes: family,
    now: 0,
  });
}
// An own look (D68) copied from the look on grid key `key`, put on that key.
function own(set, key, { palette = null, transition = "auto", from } = {}) {
  const base = authored.find((look) => look.id === (from ?? set.keys[key]));
  const look = {
    id: `own-k${key}`,
    name: `${base.name} (own)`,
    base: base.id,
    snapshot: structuredClone(base.snapshot),
    palette,
    transition,
  };
  set.looks.push(look);
  set.keys[key] = look.id;
  return look;
}
const loads = (actions) => actions.filter((a) => a.type === "load");

test("a grid key fires its look on the next beat with the look's fade (D68)", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  const id = show.set.keys[3];
  assert.deepEqual(loads(show.command({ type: "slot", index: 3 }, 0.3)), []);
  assert.deepEqual(loads(show.tick(0.45)), []);
  const fired = loads(show.tick(0.5));
  assert.equal(fired.length, 1);
  assert.equal(fired[0].clipId, id);
  assert.equal(fired[0].fadeSeconds, 2); // 4 beats at 120 BPM
  assert.equal(show.status(0.5).live.look, id);
});

test("catalog Play fires a look at once with its own palette", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  const look = authored.find((l) => l.sceneId === "julia");
  const [fired] = loads(show.command({ type: "look", id: look.id }, 0.3));
  assert.equal(fired.clipId, look.id);
  assert.equal(fired.snapshot.scene, "julia");
  assert.deepEqual(show.command({ type: "look", id: "julia:nope" }, 0.4), []);
});

test("a press just after the beat fires immediately", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  assert.equal(loads(show.command({ type: "slot", index: 0 }, 1.02)).length, 1);
});

test("manual auto resolves to eased crossfade; own looks' smooth transitions reach load actions", () => {
  for (const transition of ["auto", "crossfade", "dissolve", "melt"]) {
    const show = makeShow((set) => {
      set.autopilot.enabled = false;
      own(set, 1, { transition });
    });
    show.command({ type: "slot", index: 1 }, 0.3);
    const [action] = loads(show.tick(0.5));
    assert.equal(
      action.transition,
      transition === "auto" ? "crossfade" : transition,
    );
    assert.equal(action.fadeSeconds, 2);
  }
});

test("manual cuts wait for the downbeat and ignore fade", () => {
  for (const play of [
    { type: "slot", index: 1 },
    { type: "look", id: "own-k1" },
  ]) {
    const show = makeShow((set) => {
      set.autopilot.enabled = false;
      own(set, 1, { transition: "cut" });
    });
    assert.deepEqual(loads(show.command(play, 0.3)), []);
    assert.deepEqual(loads(show.tick(0.5)), [], "a beat is not a downbeat");
    assert.deepEqual(loads(show.tick(1.99)), []);
    const [action] = loads(show.tick(2));
    assert.equal(action.transition, "cut");
    assert.equal(action.fadeSeconds, 0);
  }
});

test("autopilot's resolved smooth transition survives scheduling a look authored as cut", () => {
  const show = makeShow((set) => {
    set.autopilot.everyBars = 16;
    set.autopilot.random = false;
    set.autopilot.favoritesOnly = true;
    for (const key of [0, 1, 2]) {
      own(set, key, { transition: "cut" });
      set.favorites.push(`own-k${key}`);
    }
  });
  show.begin(0);
  show.tick(0);
  const [action] = loads(show.tick(32));
  assert.equal(action.transition, "crossfade");
  assert.equal(action.fadeSeconds, 6); // three bars at 120 BPM (D66)
});

test("a trigger keeps the show energy instead of the look's authored value (D54)", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  show.command({ type: "energy", value: 0.9 }, 0);
  const [fired] = loads(show.command({ type: "slot", index: 1 }, 1.02));
  assert.equal(fired.energy, 0.9);
  // Parameters are authored at mid energy; the curves start there.
  assert.equal(fired.baseEnergy, 0.5);
  assert.equal(show.status(1.02).energy, 0.9);
});

test("the safe look is calm, and the next clip resumes the show energy", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  show.command({ type: "energy", value: 0.8 }, 0);
  const [safe] = show.command({ type: "safe" }, 0.1);
  assert.equal(safe.energy, 0.15);
  show.command({ type: "safe" }, 0.2); // a second panic keeps the old level
  const [fired] = loads(show.command({ type: "slot", index: 2 }, 1.02));
  assert.equal(fired.energy, 0.8);
});

test("keys wait for the beat; the latest press wins", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  show.command({ type: "slot", index: 1 }, 0.6);
  show.command({ type: "slot", index: 2 }, 0.9);
  assert.deepEqual(loads(show.tick(0.95)), []);
  const fired = loads(show.tick(1.0));
  assert.equal(fired[0].clipId, show.set.keys[2]);
});

test("empty or unknown keys do nothing", () => {
  const show = makeShow((set) => {
    set.autopilot.enabled = false;
    set.keys[31] = null;
    set.keys[30] = "acid:Not a look";
  });
  assert.deepEqual(show.command({ type: "slot", index: 31 }, 0), []);
  assert.deepEqual(show.command({ type: "slot", index: 30 }, 0), []);
  assert.deepEqual(show.command({ type: "slot", index: 32 }, 0), []);
});

test("autopilot plays the catalog and pauses after manual input", () => {
  const show = makeShow((set) => (set.autopilot.everyBars = 16));
  const fired = [];
  for (let t = 0; t < 200; t += 0.01) {
    if (Math.abs(t - 40) < 0.005) show.command({ type: "slot", index: 5 }, t);
    for (const a of loads(show.tick(t))) fired.push({ t, id: a.clipId });
  }
  // Bar = 2 s. Random changes every 8–16 bars, manual at t = 40 (bar 20)
  // holds until bar 52 (t = 104).
  const key = show.set.keys[5];
  const auto = fired.filter((f) => f.id !== key || Math.abs(f.t - 40.5) > 0.1);
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
  assert.equal(actions[0].clipId, show.set.keys[4]);
  assert.equal(actions[0].fadeSeconds, 0);
  const s = again.status(0);
  assert.equal(s.energy, 0.8);
  assert.equal(s.shared.zoom, 1.5);
  assert.ok(Math.abs(s.clock.bpm - 132) < 0.01);
});

test("stage faders tweak the live clip without changing the catalog", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  show.command({ type: "slot", index: 0 }, 0);
  const key = Object.keys(show.live.clip.snapshot.params)[0];
  const stored = show.catalogClips.get(show.set.keys[0]).snapshot.params;
  const before = stored[key];
  const [action] = show.command(
    { type: "param", key, value: before + 0.01 },
    0.1,
  );
  assert.equal(action.type, "params");
  assert.equal(show.currentSnapshot().params[key], before + 0.01);
  assert.equal(stored[key], before);
});

test("audition plays an unsaved clip immediately", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  const clip = {
    ...structuredClone(show.catalogClips.get(show.set.keys[2])),
    id: "draft",
    name: "draft",
  };
  const [load] = show.command({ type: "audition", clip }, 0.3);
  assert.equal(load.type, "load");
  assert.equal(load.clipId, "draft");
  assert.equal(show.status(0.3).live.look, "draft");
});

// The first key holds an Acid look in the catalog's default order.
const acidFirst = (set) => assert.match(set.keys[0], /^acid:/);

test("autopilot and keys never schedule a family whose shaders failed", () => {
  const show = makeShow((set) => {
    set.autopilot.everyBars = 16;
    acidFirst(set);
  });
  show.disable("acid", 0);
  assert.deepEqual(show.command({ type: "slot", index: 0 }, 0.6), []); // acid
  const fired = [];
  for (let t = 0; t < 400; t += 0.05) fired.push(...loads(show.tick(t)));
  assert.ok(fired.length > 5);
  assert.ok(fired.every((a) => a.snapshot.scene !== "acid"));
  assert.deepEqual(show.status(400).disabled, ["acid"]);
});

test("a failed family on screen cuts at once to a playable look", () => {
  const show = makeShow((set) => {
    set.autopilot.enabled = false;
    acidFirst(set);
  });
  show.command({ type: "slot", index: 0 }, 0.5); // acid, fires on the beat
  assert.match(show.status(0.5).live.look, /^acid:/);
  const cut = loads(show.disable("acid", 0.7, true));
  assert.equal(cut.length, 1);
  assert.equal(cut[0].fadeSeconds, 0);
  assert.notEqual(cut[0].snapshot.scene, "acid");
  assert.equal(show.status(0.7).live.look, cut[0].clipId);
});

test("with nothing autopilot may play the safe look takes over, then any look, then blackout", () => {
  const three = ["acid", "interference", "cathedral"].map((id) =>
    scenes.find((s) => s.id === id),
  );
  const show = makeShow((set) => {
    set.autopilot.enabled = false;
    // Rated 0: never chosen by autopilot, still playable by hand.
    for (const look of catalogLooks(three)) set.ratings[look.id] = 0;
    acidFirst(set);
  }, three);
  show.command({ type: "slot", index: 0 }, 0.5);
  const safe = show.disable("acid", 1, true);
  assert.deepEqual(
    safe.map((a) => a.type),
    ["safe"],
  );
  assert.equal(safe[0].snapshot.scene, "interference");
  assert.equal(show.currentSnapshot().scene, "interference");
  const other = loads(show.disable("interference", 2, true));
  assert.equal(other[0].snapshot.scene, "cathedral");
  assert.equal(show.currentSnapshot().scene, "cathedral");
  assert.deepEqual(show.disable("cathedral", 3, true), [
    { type: "blackout", on: true },
  ]);
  assert.equal(show.blackout, true);
  assert.equal(show.currentSnapshot(), null);
});

test("random mode glides the live clip's continuous parameters near its authored values", () => {
  const show = makeShow((set) => (set.autopilot.everyBars = 64));
  const snapshots = [];
  // Random clips play at least 8 bars (16 s here); drift starts once the
  // three-bar fade is over (6 s): one clip, one glide.
  for (let t = 0; t <= 15.9; t += 1 / 60)
    if (show.tick(t).some((action) => action.type === "params"))
      snapshots.push(structuredClone(show.currentSnapshot()));
  const live = show.status(15.9).live;
  const clip = show.catalogClips.get(live.look);
  const scene = scenes.find((s) => s.id === clip.snapshot.scene);
  const glide = snapshots.filter((snapshot) => snapshot.scene === scene.id);
  assert.ok(glide.length > 500, "params move every frame while drifting");
  const drifting = scene.schema.filter(
    (f) => f.key !== scene.type?.key && !(f.step >= 1) && f.max > f.min,
  );
  assert.ok(drifting.length);
  const params = show.live.clip.snapshot.params;
  let moved = false;
  for (const f of scene.schema) {
    const base = clip.snapshot.params[f.key];
    if (!drifting.includes(f)) assert.equal(params[f.key], base, f.key);
    else {
      moved ||= params[f.key] !== base;
      assert.ok(
        Math.abs(params[f.key] - base) <= 0.12 * (f.max - f.min) + 1e-9,
      );
      assert.ok(params[f.key] >= f.min && params[f.key] <= f.max);
    }
  }
  assert.ok(moved, "at least one parameter drifted");
  assert.notEqual(show.live.clip, clip, "the set's clip is never modified");
});

test("a drift glide never jumps, and a stage fader stops it", () => {
  const show = makeShow((set) => (set.autopilot.everyBars = 64));
  let previous = null,
    jump = 0;
  for (let t = 0; t <= 40; t += 1 / 60)
    for (const a of show.tick(t))
      if (a.type === "params") {
        const snapshot = show.currentSnapshot();
        const p = snapshot.params;
        if (previous && previous.scene === snapshot.scene)
          for (const k of Object.keys(p))
            jump = Math.max(jump, Math.abs(p[k] - previous.params[k]));
        previous = { scene: snapshot.scene, params: { ...p } };
      }
  const scene = scenes.find((s) => s.id === previous.scene);
  const widest = Math.max(...scene.schema.map((f) => f.max - f.min));
  assert.ok(jump < widest * 0.01, `largest per-frame step ${jump}`);
  assert.ok(show.drift);
  show.command({ type: "param", key: scene.schema[0].key, value: 0 }, 40);
  assert.equal(show.drift, null);
  assert.ok(!show.tick(40.02).some((a) => a.type === "params"));
});

test("random off: autopilot walks the catalog in order and parameters stay put", () => {
  const show = makeShow((set) => {
    set.autopilot.everyBars = 16;
    set.autopilot.random = false;
  });
  const ids = [];
  for (let t = 0; t <= 140; t += 1 / 30)
    for (const a of show.tick(t)) {
      if (a.type === "params")
        assert.deepEqual(
          show.currentSnapshot().params,
          show.catalogClips.get(show.live.clip.id).snapshot.params,
        );
      if (a.type === "load") ids.push(a.clipId);
    }
  assert.deepEqual(
    ids,
    sortCatalog(authored, {})
      .slice(0, 5)
      .map((look) => look.id),
  );
  show.command({ type: "random" }, 140);
  assert.equal(show.status(140).autopilot.random, true);
  assert.equal(show.set.autopilot.random, true);
});

test("a fresh stage begins on a random look; autopilot then waits its random duration", () => {
  for (const seed of [1, 2]) {
    const show = makeShow();
    show.autopilot.random = (() => {
      let x = seed * 0.37;
      return () => (x = (x * 9301 + 0.4927) % 1);
    })();
    const first = loads(show.begin(0));
    assert.equal(first.length, 1);
    assert.equal(first[0].fadeSeconds, 0);
    assert.equal(show.status(0).live.look, first[0].clipId);
    assert.deepEqual(loads(show.tick(0)), []);
    const { duration, nextChangeIn } = show.status(0).autopilot;
    assert.ok([8, 12, 16].includes(duration));
    assert.equal(nextChangeIn, duration);
    const later = [];
    for (let t = 0; t < 40; t += 1 / 30)
      for (const load of loads(show.tick(t))) later.push({ t, load });
    // The first change comes after the first look's random duration.
    assert.ok(later.length >= 1);
    assert.ok(Math.abs(later[0].t - duration * 2) < 0.05, `${later[0].t}`);
    assert.equal(later[0].load.fadeSeconds, 6); // three bars at 120 BPM
  }
});

test("manual triggers adopt the look palette with a glide; autopilot keeps the show palette", () => {
  const show = makeShow((set) => {
    set.autopilot.random = false;
    set.autopilot.everyBars = 16;
    set.autopilot.favoritesOnly = true;
    own(set, 0, { palette: "ember" });
    own(set, 1, { palette: "glacier" });
    own(set, 2, { palette: "toxic" });
    set.favorites.push("own-k0", "own-k1");
  });
  show.begin(0);
  show.tick(0);
  assert.equal(show.status(0).palette, "ember");
  const auto = loads(show.tick(32))[0];
  assert.equal(auto.clipId, "own-k1");
  assert.deepEqual(auto.snapshot.palette, paletteById("ember").colors);
  assert.equal(show.status(32).palette, "ember");
  const manual = loads(show.command({ type: "slot", index: 2 }, 34))[0];
  assert.equal(show.status(34).palette, "toxic");
  assert.deepEqual(
    manual.snapshot.palette,
    paletteById("ember").colors,
    "the new colour starts at the current colour, not a cut",
  );
  const middle = show.tick(35).find((action) => action.type === "params");
  assert.ok(middle);
  assert.notDeepEqual(
    show.currentSnapshot().palette,
    paletteById("ember").colors,
  );
  assert.notDeepEqual(
    show.currentSnapshot().palette,
    paletteById("toxic").colors,
  );
  show.tick(36);
  assert.deepEqual(
    show.live.clip.snapshot.palette,
    paletteById("toxic").colors,
  );
  assert.deepEqual(
    show.catalogClips.get("own-k0").snapshot.palette,
    paletteById("ember").colors,
  );
});

test("palette changes interpolate each frame and a manual palette change wins over a drop", () => {
  const show = makeShow((set) => {
    set.autopilot.random = false;
    set.autopilot.favoritesOnly = true;
    own(set, 0, { palette: "ember" });
    set.favorites.push("own-k0");
  });
  show.begin(0);
  const original = { ...show.live.clip.snapshot.palette };
  show.tick(2, { event: "drop" });
  const dropPalette = show.status(2).palette;
  assert.notEqual(dropPalette, "ember");
  assert.deepEqual(show.live.clip.snapshot.palette, original);
  let previous = original;
  let changedFrames = 0;
  for (let t = 2 + 1 / 60; t < 3; t += 1 / 60) {
    const action = show.tick(t).find((a) => a.type === "params");
    if (!action) continue; // Frames that quantise to the same colour need no upload.
    const colors = { ...show.currentSnapshot().palette };
    for (const key of Object.keys(colors)) {
      const channels = (hex) =>
        hex
          .slice(1)
          .match(/../g)
          .map((c) => parseInt(c, 16));
      const a = channels(previous[key]),
        b = channels(colors[key]);
      assert.ok(
        b.every((channel, i) => Math.abs(channel - a[i]) <= 4),
        "no per-frame colour jump",
      );
    }
    if (JSON.stringify(colors) !== JSON.stringify(previous)) changedFrames++;
    previous = colors;
  }
  assert.ok(changedFrames > 30);
  show.command({ type: "palette", value: "silver" }, 3);
  assert.equal(show.status(3).palette, "silver");
  show.tick(3.1, { event: "drop" });
  assert.equal(show.status(3.1).palette, "silver");
  show.tick(5);
  assert.deepEqual(
    show.live.clip.snapshot.palette,
    paletteById("silver").colors,
  );
});

test("crash restore preserves a custom show palette and continues an interrupted glide", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  show.command({ type: "slot", index: 0 }, 0);
  const custom = {
    primary: "#ffffff",
    secondary: "#112233",
    accent: "#ff4400",
  };
  show.command({ type: "palette", value: custom }, 1);
  show.tick(2);
  const current = { ...show.live.clip.snapshot.palette };
  const saved = JSON.parse(JSON.stringify(show.snapshot(2)));
  const restored = makeShow((set) => (set.autopilot.enabled = false));
  const [load] = restored.restore(saved, 10);
  assert.deepEqual(restored.status(10).palette, custom);
  assert.deepEqual(load.snapshot.palette, current);
  restored.tick(10.5);
  assert.notDeepEqual(restored.live.clip.snapshot.palette, current);
  restored.tick(11);
  assert.deepEqual(restored.live.clip.snapshot.palette, custom);
});

test("mixer-strip changes leave clip, drift and palette autopilot running", () => {
  const show = makeShow((set) => (set.autopilot.everyBars = 16));
  show.begin(0);
  show.tick(0);
  const drift = show.drift;
  const nextPalette = show.autopilot.nextPalette;
  for (let t = 0.1; t < 4; t += 0.1)
    show.command(
      { type: "shared", master: 0.4, hue: 0.2, zoom: 1.2, mirror: 3 },
      t,
    );
  assert.equal(show.autopilot.active(2), true);
  assert.equal(show.drift, drift, "mixer trims do not cancel parameter drift");
  assert.equal(show.autopilot.nextPalette, nextPalette);
  assert.equal(
    loads(show.tick(32)).length,
    1,
    "the next clip still fires on schedule",
  );
  assert.deepEqual(show.shared, {
    master: 0.4,
    hue: 0.2,
    zoom: 1.2,
    mirror: 3,
  });
});

test("palette frames emit only changed 8-bit colours using the same live buffer", () => {
  const from = { primary: "#101010", secondary: "#101010", accent: "#101010" };
  const to = { primary: "#111111", secondary: "#111111", accent: "#111111" };
  const show = makeShow((set) => {
    set.autopilot.enabled = false;
    own(set, 0, { palette: "custom" }).snapshot.palette = from;
  });
  show.command({ type: "slot", index: 0 }, 0);
  const buffer = show.currentSnapshot().palette;
  show.command({ type: "palette", value: to }, 1);
  assert.ok(!show.tick(1.00001).some((action) => action.type === "params"));
  assert.ok(!show.tick(1.25).some((action) => action.type === "params"));
  assert.ok(show.tick(2).some((action) => action.type === "params"));
  assert.equal(show.currentSnapshot().palette, buffer);
  assert.deepEqual(buffer, to);
  assert.ok(!show.tick(2.1).some((action) => action.type === "params"));
  assert.ok(!show.tick(3).some((action) => action.type === "params"));
  assert.equal(show.paletteGlide, null);
});

test("palette params require an actual clip or explicitly loaded safe look", () => {
  const show = makeShow((set) => (set.autopilot.enabled = false));
  assert.deepEqual(show.command({ type: "palette", value: "ember" }, 0), []);
  assert.equal(show.currentSnapshot(), null);
  show.command({ type: "safe" }, 0.1);
  show.command({ type: "palette", value: "glacier" }, 0.2);
  assert.ok(show.tick(1).some((action) => action.type === "params"));
  assert.equal(show.currentSnapshot().scene, safeSnapshot.scene);
  const restored = makeShow((set) => (set.autopilot.enabled = false));
  restored.restore(show.snapshot(1), 10);
  assert.equal(restored.currentSnapshot().scene, safeSnapshot.scene);
  show.disable(safeSnapshot.scene, 1, false);
  assert.equal(show.currentSnapshot(), null);
  assert.ok(!show.tick(1.1).some((action) => action.type === "params"));
  const empty = makeShow((set) => {
    set.autopilot.enabled = false;
    for (const look of authored) set.ratings[look.id] = 0;
  });
  assert.equal(empty.begin(0)[0].type, "safe");
  assert.equal(empty.currentSnapshot().scene, safeSnapshot.scene);
});
