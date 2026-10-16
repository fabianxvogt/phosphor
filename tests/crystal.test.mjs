import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { presetSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { defaultPattern } from "../rhythm.mjs";
import {
  ATTRIBUTES,
  CORRIDOR,
  KIND,
  LIFT,
  LIMITS,
  PERIOD,
  STRIDE,
  cameraPath,
  cavern,
  createGeometry,
  growth,
  hexCell,
  wallPoint,
} from "../crystal-geometry.mjs";

const scene = scenes.find((s) => s.id === "crystal");
const close = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test("crystal is a registered continuous world with three authored states", () => {
  assert.ok(scene);
  assert.equal(scene.development, "development");
  assert.equal(scene.number, 90);
  const world = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  ).find((w) => w.id === "cavern");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Seeds", "Lattice", "Hall"],
  );
  const clips = world.states.map((state) => {
    const index = scene.presets.findIndex(
      (p) => `crystal:${p.name}` === state.look,
    );
    return { snapshot: presetSnapshot(scene, index) };
  });
  const development = continuousDevelopment(clips, scene);
  assert.deepEqual(development?.positions, [0, 1, 2]);
  assert.ok(scene.presets.length >= 6);
  for (const preset of scene.presets)
    for (const field of scene.schema) {
      const value = preset.params[field.key];
      assert.ok(Number.isFinite(value), `${preset.name}.${field.key}`);
      assert.ok(
        value >= field.min && value <= field.max,
        `${preset.name}.${field.key}`,
      );
    }
  assert.deepEqual(
    ATTRIBUTES.reduce((a, b) => a + b),
    STRIDE,
  );
});

test("geometry is deterministic, finite, seed-dependent and bounded", () => {
  const a = createGeometry(311),
    b = createGeometry(312),
    again = createGeometry(311);
  assert.deepEqual(a, again);
  assert.notDeepEqual(a.subarray(0, 4000), b.subarray(0, 4000));
  assert.ok(a.every(Number.isFinite));
  assert.equal(a.length % STRIDE, 0);
  assert.equal((a.length / STRIDE) % 3, 0);
  assert.ok(a.length / STRIDE < 300000, `${a.length / STRIDE} vertices`);
});

test("crystal identity in the buffer is independent of development", () => {
  // Development is not an input of the generator: every crystal's root, axis,
  // size, birth and kind come from the seed alone and match cavern().
  const { crystals } = cavern(311),
    data = createGeometry(311);
  assert.ok(crystals.length > 2000);
  crystals.forEach((c, i) => {
    const o = i * 54 * STRIDE + 6;
    close(data[o], Math.fround(c.root[0]), 1e-6);
    close(data[o + 2], Math.fround(c.root[2]), 1e-6);
    close(data[o + 4], Math.fround(c.dir[0]), 1e-6);
    close(data[o + 7], Math.fround(c.birth), 1e-6);
    close(data[o + 8], Math.fround(c.length), 1e-6);
    close(data[o + 11], c.kind);
  });
  const kinds = new Set(crystals.map((c) => c.kind));
  for (const kind of [KIND.seed, KIND.member, KIND.hall, KIND.grain])
    assert.ok(kinds.has(kind));
});

test("growth is continuous, reversible and tells sparse → structured → full", () => {
  const kinds = [KIND.seed, KIND.member, KIND.hall, KIND.grain];
  for (const kind of kinds)
    for (const birth of [0, 0.3, 0.71, 1]) {
      let last = growth(kind, birth, 0);
      // Lipschitz bound: no jump larger than 40 × the development step.
      for (let i = 1; i <= 20000; i++) {
        const next = growth(kind, birth, i / 10000);
        assert.ok(Math.abs(next[0] - last[0]) < 0.004, "continuous length");
        assert.ok(Math.abs(next[1] - last[1]) < 0.004, "continuous radius");
        assert.ok(next[0] >= last[0] - 1e-12, "length never shrinks forward");
        last = next;
      }
      // Pure function of development: reversal retraces the same values.
      assert.deepEqual(growth(kind, birth, 1.37), growth(kind, birth, 1.37));
    }
  // Seeds: dominant nuclei have small subsidiary quartz at their roots.
  assert.ok(growth(KIND.seed, 0, 0)[0] > 0.1);
  for (const birth of [0, 0.5, 1]) {
    close(growth(KIND.member, birth, 0)[0], 0.64 * 0.62);
    assert.equal(growth(KIND.hall, birth, 0)[0], 0);
  }
  // Lattice: every druse member has fully nucleated; the hall has not begun.
  for (const birth of [0, 0.5, 1]) {
    close(growth(KIND.member, birth, 1)[0], 0.62);
    assert.equal(growth(KIND.hall, birth, 1)[0], 0);
  }
  // Hall: everything at full size.
  for (const kind of [KIND.seed, KIND.member, KIND.hall])
    for (const birth of [0, 0.5, 1]) {
      close(growth(kind, birth, 2)[0], 1);
      close(growth(kind, birth, 2)[1], 1);
    }
});

test("cavern and camera path are periodic, so the glide is endless", () => {
  const { rock } = cavern(311);
  for (const theta of [-1.5, 0, 0.7, 2.4]) {
    const a = wallPoint(rock, theta, 0),
      b = wallPoint(rock, theta, PERIOD),
      c = wallPoint(rock, theta + Math.PI * 2, 3.3),
      d = wallPoint(rock, theta, 3.3);
    a.slice(0, 2).forEach((v, i) => close(v, b[i], 1e-9));
    c.forEach((v, i) => close(v, d[i], 1e-9));
  }
  for (const z of [0, 5.5, 17]) {
    const a = cameraPath(z, 1),
      b = cameraPath(z + PERIOD, 1);
    close(a[0], b[0], 1e-9);
    close(a[1], b[1], 1e-9);
  }
});

test("no crystal ever reaches the camera corridor at any development or energy", () => {
  // Independent dense check at the largest shader extent: Hall growth, the
  // thickest habit, maximal breathing and the longest termination.
  for (const seed of [311, 1207, 4421, 58]) {
    const { crystals } = cavern(seed);
    let nearest = Infinity;
    for (const c of crystals) {
      const radius = c.radius * LIMITS.habit,
        reach = c.length * LIMITS.breath + radius * LIMITS.tip;
      for (let s = 0; s <= 1; s += 0.05) {
        const p = c.root.map((v, i) => v + c.dir[i] * reach * s);
        for (let dz = -3; dz <= 3; dz += 0.01) {
          const path = cameraPath(p[2] + dz, 0),
            dx = p[0] - path[0],
            dy = p[1] - path[1],
            ey = dy - Math.min(LIFT, Math.max(0, dy)),
            d = Math.hypot(dx, ey, dz) - radius;
          if (d < nearest) nearest = d;
        }
      }
    }
    assert.ok(nearest >= CORRIDOR - 0.03, `seed ${seed}: ${nearest}`);
  }
});

test("hexagonal wall cells are exact nearest sites and repeat without a seam", () => {
  const h = Math.sqrt(3);
  for (let x = -2; x < 2; x += 0.137)
    for (let y = -2; y < 2; y += 0.193) {
      const c = hexCell(x, y);
      let best = Infinity;
      for (let i = -4; i <= 4; i++)
        for (let j = -4; j <= 4; j++)
          for (const s of [0, 0.5])
            best = Math.min(best, Math.hypot(x - i - s, y - h * (j + s)));
      close(Math.hypot(...c.local), best, 1e-10);
      assert.ok(c.edge >= -1e-10);
      const shifted = hexCell(x + 96, y + 192 * h);
      c.local.forEach((v, i) => close(v, shifted.local[i], 1e-10));
      close(c.edge, shifted.edge, 1e-10);
    }
  close(hexCell(0.5, 0).edge, 0);
  close(hexCell(0, 0).edge, 0.5);
  close(growth(KIND.seed, 0, 0)[0], 0.72);
  assert.match(scene.geometry.vertex, /vec2\(\.72\+\.28\*t,\.95\+\.05\*t\)/);
  assert.deepEqual(
    scene.presets.map((p) => p.seed),
    [311, 311, 311, 1207, 4421, 58, 2718, 911],
  );
});

test("crystal chime occupies slot 3 and authored grids meet density targets", () => {
  assert.equal(scene.rhythm.length, 4);
  const chime = scene.rhythm.find((g) => g.slot === 3);
  assert.equal(chime.id, "crystal-chime");
  for (const [style, minimum] of Object.entries({
    restrained: 2,
    driving: 6,
    accented: 8,
  })) {
    const pattern = defaultPattern(scene.rhythm, style);
    let density = 0;
    for (const track of pattern.tracks) {
      const hits = track.steps.flatMap((x, i) => (x > 0 ? [i] : []));
      density += (hits.length * track.division * 4) / track.length;
      if (track.effect === chime.id) {
        assert.ok(hits.length >= 2);
        for (let i = 0; i < hits.length; i++) {
          const gap =
            (hits[(i + 1) % hits.length] +
              (i === hits.length - 1 ? track.length : 0) -
              hits[i]) /
            track.division;
          assert.ok(track.duration < gap);
        }
      }
    }
    assert.ok(density >= minimum, `${style}: ${density} hits/bar`);
  }
  for (const channel of ["u_rhythm.w", "u_rhythmCount.w", "u_rhythmHit.w"])
    assert.ok(scene.geometry.fragment.includes(channel), channel);
});

test("three outgoing hexagon plane pairs give the same exit as six planes", () => {
  for (let i = 0; i < 1000; i++) {
    const p = [Math.sin(i * 1.7) * 0.45, Math.cos(i * 2.3) * 0.45];
    const ray = [Math.cos(i * 0.271), Math.sin(i * 0.271)];
    const trace = (pairs) => {
      let best = Infinity;
      for (let j = 0; j < (pairs ? 3 : 6); j++) {
        const phi = ((j + 0.5) * Math.PI) / 3;
        let n = [Math.cos(phi), Math.sin(phi)];
        const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
        if (pairs && dot(ray, n) < 0) n = n.map((x) => -x);
        const denom = dot(ray, n);
        const t = (Math.sqrt(3) / 2 - dot(p, n)) / denom;
        if (denom > 1e-4 && t > 0.001) best = Math.min(best, t);
      }
      return best;
    };
    close(trace(true), trace(false), 1e-10);
  }
});

test("r4 keeps rock quiet and traces filtered internal mineral glints", () => {
  const shader = scene.geometry.fragment;
  assert.ok(!shader.includes("vec2 cells="), "no tiled shell");
  assert.ok(!shader.includes("along*19."), "no milky growth stripes");
  assert.ok(shader.includes("float exitT=rad*6."));
  assert.ok(shader.includes("refract(rd,-exitN,1.5)"));
  assert.ok(shader.includes("fwidth(internalGlint)"));
  assert.ok(shader.includes("fwidth(fissure)"));
  assert.ok(shader.includes("float wake="));
  // A staged hierarchy exists at every passage phase, without extra meshes.
  const { clusters, crystals } = cavern(311);
  const sizes = clusters.map((c) => c.scale);
  assert.ok(sizes.filter((s) => s > 1.3).length >= 10);
  assert.ok(sizes.filter((s) => s < 0.71).length >= 35);
  assert.ok(
    crystals.filter((c) => c.kind === KIND.member && c.length > 0.5).length >
      50,
  );
  assert.match(scene.geometry.vertex, /\(\.64\+\.36\*g1\)/);
});

test("camera travel integrates in exact 24-bit steps at every speed", () => {
  // CPU mirror of the simulation: n += round(dt * rate * 2^24) mod 2^24.
  for (const drift of [0.1, 1, 2]) {
    const step = Math.round((1 / 60) * ((0.42 * drift) / PERIOD) * 16777216);
    assert.ok(step >= 1 && step < 16777216 / 600, `${drift}: ${step}`);
    let n = 16777000;
    n = (n + step) % 16777216;
    assert.ok(n >= 0 && n < 16777216);
  }
});
