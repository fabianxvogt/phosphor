import test from "node:test";
import assert from "node:assert/strict";
import scene from "../scene-orrery.mjs";
import scenes from "../scenes.mjs";
import { FAMILY_CATALOG } from "../family-catalog.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { shaderVariant } from "../scene-time.mjs";
import { defaultPattern } from "../rhythm.mjs";
import { PALETTES } from "../palettes.mjs";
import {
  MODULE,
  GEAR_BEVEL,
  PRESSURE,
  TAU,
  ATTRIBUTES,
  STRIDE,
  ORBITS,
  pitchRadius,
  involute,
  involuteAngle,
  toothProfile,
  bevelProfile,
  makeTrain,
  meshResidual,
  gearPose,
  orbitPosition,
  planetPosition,
  armillaryPosition,
  brassColor,
  sunPosition,
  sunIrradiance,
  sphereVisibility,
  developmentPose,
  trainPose,
  camera,
  createGeometry,
} from "../orrery-model.mjs";
const close = (a, b, eps = 1e-10) =>
  assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const distance = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]));

test("orrery is the appended continuous world: three same-seed states and eight valid looks", () => {
  assert.equal(
    scenes.find((s) => s.id === "orrery"),
    scene,
  );
  assert.equal(scene.number, 109);
  assert.equal(scene.development, "development");
  assert.equal(scene.presets.length, 8);
  assert.ok(FAMILY_CATALOG.orrery.styles.includes("spatial"));
  const worlds = defaultWorlds(
    scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
  );
  const world = worlds.find((w) => w.id === "brass-orrery");
  assert.ok(world);
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Gears", "Orrery", "Clockwork"],
  );
  const clips = scene.presets
    .slice(0, 3)
    .map((p, i) => ({ snapshot: presetSnapshot(scene, i) }));
  assert.deepEqual(continuousDevelopment(clips, scene).positions, [0, 1, 2]);
  assert.equal(new Set(clips.map((c) => c.snapshot.seed)).size, 1);
  for (let i = 0; i < scene.presets.length; i++) {
    const p = scene.presets[i];
    assert.doesNotThrow(() =>
      validateSnapshot(presetSnapshot(scene, i), scenes),
    );
    for (const def of scene.schema) {
      const v = p.params[def.key];
      assert.ok(
        Number.isFinite(v) && v >= def.min && v <= def.max,
        `${p.name}.${def.key}`,
      );
    }
  }
});

test("signature: involute unwinds exactly a tangent of length rb*t from the base circle", () => {
  for (const rb of [0.2, 0.5, 1.3])
    for (let t = 0.001; t <= 1.5; t += 0.019) {
      const p = involute(t, rb),
        base = [rb * Math.cos(t), rb * Math.sin(t)];
      close(distance(p, base), rb * t);
      close((p[0] - base[0]) * Math.cos(t) + (p[1] - base[1]) * Math.sin(t), 0);
      close(Math.hypot(...p), rb * Math.sqrt(1 + t * t));
      close(involuteAngle(Math.hypot(...p), rb), t - Math.atan(t));
      const dt = 1e-6,
        q = involute(t + dt, rb);
      // Tangent of the involute points along the base-circle radius.
      close(
        ((q[0] - p[0]) * Math.sin(t) - (q[1] - p[1]) * Math.cos(t)) / dt,
        0,
        2e-6,
      );
    }
});

test("integer teeth, common module, 20-degree pressure angle and correct pitch thickness", () => {
  close(PRESSURE, Math.PI / 9);
  for (const n of [24, 40, 56]) {
    assert.ok(Number.isInteger(n));
    const r = pitchRadius(n),
      rb = r * Math.cos(PRESSURE);
    close((r * 2) / n, MODULE);
    const half =
      Math.PI / (2 * n) + Math.tan(PRESSURE) - PRESSURE - involuteAngle(r, rb);
    close(2 * half * r, (Math.PI * MODULE) / 2);
    const p = toothProfile(n, 3);
    assert.equal(p.length, n * (rb > r - 1.25 * MODULE ? 11 : 9));
    for (const v of p) {
      const rad = Math.hypot(...v);
      assert.ok(rad >= r - 1.25 * MODULE - 1e-12 && rad <= r + MODULE + 1e-12);
      assert.ok(v.every(Number.isFinite));
    }
    // Rotational tooth identity: every tooth is exactly the preceding one
    // rotated by 2π/N, including both sampled involute flanks and the root.
    const k = p.length / n,
      c = Math.cos(TAU / n),
      s = Math.sin(TAU / n);
    for (let j = 0; j < p.length - k; j++) {
      close(p[j + k][0], p[j][0] * c - p[j][1] * s);
      close(p[j + k][1], p[j][0] * s + p[j][1] * c);
    }
  }
});

test("shared tooth bevels never fold, tear or cross at involute tips", () => {
  const cross = (a, b, p) =>
    (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  for (const n of [24, 40, 56])
    for (const detail of [1, 3]) {
      const p = toothProfile(n, detail),
        f = bevelProfile(p, GEAR_BEVEL);
      assert.equal(f.length, p.length);
      for (let i = 0; i < f.length; i++) {
        assert.ok(f[i].every(Number.isFinite));
        assert.ok(distance(f[i], p[i]) <= 0.0160001);
        assert.ok(distance(f[i], f[(i + 1) % f.length]) > 0.0001);
        for (let j = i + 2; j < f.length; j++) {
          if (i === 0 && j === f.length - 1) continue;
          const a = f[i],
            b = f[(i + 1) % f.length],
            c = f[j],
            d = f[(j + 1) % f.length];
          assert.ok(
            !(
              cross(a, b, c) * cross(a, b, d) < -1e-18 &&
              cross(c, d, a) * cross(c, d, b) < -1e-18
            ),
            `crossed bevel: N=${n}, detail=${detail}`,
          );
        }
      }
    }
});

test("point sun: exact tilted planet centres, inverse-square falloff and finite soft eclipses", () => {
  for (const dev of [0, 0.2, 0.7, 1, 1.5, 2]) {
    const sun = sunPosition(dev);
    for (let i = 0; i < 5; i++)
      for (const phase of [0, 0.7, 17, 43200 * 0.065]) {
        const p = planetPosition(i, phase, dev);
        const t = Math.max(0, Math.min(1, (dev - 0.06) / 0.79));
        const growth = t * t * (3 - 2 * t);
        close(distance(p, sun), Math.hypot(1.3 + i * 0.49, 0.14) * growth);
        close(
          p[0],
          (1.3 + i * 0.49) * Math.cos(phase * ORBITS[i] + i * 1.73) * growth,
        );
        close(
          distance(planetPosition(i, phase + 30 * Math.PI, dev), p),
          0,
          1e-10,
        );
        assert.ok(p.every(Number.isFinite));
      }
  }
  const p = [0, 0, 0],
    light = [0, 0, 10];
  close(sphereVisibility(p, light, [0, 0, 5], 1), 0);
  close(sphereVisibility(p, light, [3, 0, 5], 1), 1);
  close(sphereVisibility(p, light, [0, 0, -1], 1), 1);
  close(sphereVisibility(p, light, [0, 0, 11], 1), 1);
  assert.ok(
    sphereVisibility(p, light, [1, 0, 5], 1) > 0 &&
      sphereVisibility(p, light, [1, 0, 5], 1) < 1,
  );
  for (const r of [0, 0.2, 1, 10, 100]) {
    assert.ok(Number.isFinite(sunIrradiance(r)));
    assert.ok(sunIrradiance(r + 0.01) < sunIrradiance(r));
  }
  close(sunIrradiance(200) / sunIrradiance(100), 0.25, 0.00002);
  assert.match(scene.geometry.fragment, /visibility\*10\.\/\(\.7\+sd\*sd\)/);
  assert.match(scene.geometry.fragment, /planetPosition\(i\)-v_p/);
});

test("the palette's warm anchor owns the alloy, not a hard-coded brass RGB", () => {
  const rgb = (hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  for (const palette of PALETTES) {
    const p = rgb(palette.colors.primary),
      s = rgb(palette.colors.secondary);
    const alloy = brassColor(p, s);
    for (let i = 0; i < 3; i++)
      assert.ok(
        alloy[i] >= Math.min(p[i], s[i]) && alloy[i] <= Math.max(p[i], s[i]),
      );
    if (palette.id === "phosphor")
      assert.ok(
        distance(alloy, p) < distance(alloy, s) * 0.1,
        "yellow, not the blue secondary",
      );
    if (palette.id === "symbiosis")
      assert.ok(
        distance(alloy, s) < distance(alloy, p) * 0.1,
        "ochre, not the mint primary",
      );
  }
  assert.match(scene.geometry.fragment, /ss\(-\.06,\.06,p-s\)\*\.84\+\.08/);
});

test("Orrery sun stays centred and the crossed armillary fills the short side for the entire camera loop", () => {
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const norm = (a) => a.map((v) => v / Math.hypot(...a));
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  for (let phase = 0; phase < TAU; phase += 0.1) {
    const c = camera(1, phase),
      F = norm(sub(c.target, c.eye));
    const R = norm(cross(F, [0, 1, 0])),
      U = cross(R, F);
    const sun = sub(sunPosition(1), c.eye);
    close(dot(sun, R), 0);
    close(dot(sun, U), 0);
    const xs = [],
      ys = [];
    for (let i = 0; i < 3; i++)
      for (let theta = 0; theta < TAU; theta += 0.02) {
        const p = armillaryPosition(i, theta),
          q = sub(p, c.eye),
          z = dot(q, F);
        assert.ok(z > 2, "no near-plane crossing");
        xs.push((dot(q, R) * 1.42 * 1.09) / z);
        ys.push((dot(q, U) * 1.42 * 1.09) / z);
        close(distance(armillaryPosition(i, theta + TAU), p), 0);
      }
    const height = (Math.max(...ys) - Math.min(...ys)) / 2;
    const width = (Math.max(...xs) - Math.min(...xs)) / 2;
    assert.ok(height >= 0.6 && height <= 0.8, `height ${height}`);
    assert.ok(width >= 0.8 && width <= 0.9, `width ${width}`);
    // The same short-side projection is used in landscape and portrait;
    // even the bounded 1.8% kick cannot crop a meridian at either aspect.
    assert.ok(
      Math.max(...xs.map(Math.abs), ...ys.map(Math.abs)) * 1.018 < 0.95,
    );
  }
});

test("EVERY mesh in all 25 trains: exact pitch distance, no slip and tooth-to-gap phase", () => {
  let meshes = 0;
  for (const seed of [10901, 1776, 2401]) {
    const train = makeTrain(seed);
    assert.equal(train.length, 9);
    for (const group of [0, ...Array.from({ length: 24 }, (_, i) => i + 2)])
      for (const dev of [0, 0.37, 0.99, 1, 1.37, 1.8, 2])
        for (const g of train.slice(1)) {
          const p = train[g.parent],
            a = trainPose(p, group, dev),
            b = trainPose(g, group, dev);
          close(distance(a.center, b.center), a.radius + b.radius, 1e-11);
          for (const drive of [0.1, 1, 17, 43200 * 0.065]) {
            close(meshResidual(p, g, drive), 0, 1e-10);
            close(a.ratio * a.radius + b.ratio * b.radius, 0);
            const alpha = Math.atan2(g.y - p.y, g.x - p.x);
            const thetaA = gearPose(p, drive).angle,
              thetaB = gearPose(g, drive).angle;
            close(
              Math.cos(
                p.teeth * (alpha - thetaA) +
                  g.teeth * (alpha + Math.PI - thetaB),
              ),
              -1,
            );
          }
          meshes++;
        }
  }
  assert.equal(meshes, 3 * 25 * 7 * 8);
});

test("planets orbit on exact integer ratios and return on the common drive period", () => {
  assert.deepEqual(ORBITS, [1, 2, 3, 4, 6]);
  const period = scene.clocks[0].period;
  for (let i = 0; i < 5; i++)
    for (const phase of [0.1, 0.7, 9.2]) {
      const p = orbitPosition(i, phase),
        q = orbitPosition(i, phase + period);
      close(distance(p, q), 0);
      close(Math.hypot(p[0], p[1]), 1.3 + i * 0.49);
      const dt = 1e-5,
        b = orbitPosition(i, phase + dt);
      const angular =
        (p[0] * (b[1] - p[1]) - p[1] * (b[0] - p[0])) /
        (dt * (p[0] ** 2 + p[1] ** 2));
      close(angular, ORBITS[i], 1e-7);
    }
  for (const g of makeTrain()) {
    const a = gearPose(g, 0.7).angle,
      b = gearPose(g, 0.7 + period).angle;
    close(Math.sin(a), Math.sin(b));
    close(Math.cos(a), Math.cos(b));
  }
});

test("development is reversible continuous geometry, never a reseed or reset", () => {
  assert.deepEqual(developmentPose(0), { opening: 0, cathedral: 0 });
  assert.deepEqual(developmentPose(1), { opening: 1, cathedral: 0 });
  assert.deepEqual(developmentPose(2), { opening: 1, cathedral: 1 });
  const train = makeTrain(10901);
  for (const group of [0, 2, 3, 4, 25])
    for (const g of train) {
      let previous = trainPose(g, group, 0);
      for (let dev = 0.002; dev <= 2; dev += 0.002) {
        const p = trainPose(g, group, dev);
        assert.ok(distance(p.center, previous.center) < 0.12);
        assert.ok(Math.abs(p.radius - previous.radius) < 0.01);
        previous = p;
      }
      const before = trainPose(g, group, 0.735);
      trainPose(g, group, 1.98);
      assert.deepEqual(trainPose(g, group, 0.735), before);
    }
  for (let a = 0; a < TAU; a += 0.21) {
    let prev = camera(0, a);
    for (let dev = 0.002; dev <= 2; dev += 0.002) {
      const c = camera(dev, a);
      // max smoothstep derivative 1.5 × |(1.2,1.9,9.5)| × Δdev
      assert.ok(distance(c.eye, prev.eye) < 0.03);
      prev = c;
      assert.ok(
        c.eye[2] >= -0.301 && distance(c.eye, sunPosition(dev)) > 3,
        "flight stays in the clear nave, away from the sun and its shaft",
      );
    }
    close(distance(camera(2, a).eye, camera(2, a + TAU).eye), 0);
  }
});

test("geometry identity is seed-only, finite, deterministic and includes 225 actual toothed gears", () => {
  assert.equal(createGeometry.length, 1);
  assert.equal(
    ATTRIBUTES.reduce((a, b) => a + b, 0),
    STRIDE,
  );
  const fingerprint = (data) => {
    let sum = 0;
    for (let i = 0; i < data.length; i += 997) sum += data[i] * (1 + (i % 7));
    return sum;
  };
  let a = createGeometry(10901);
  assert.equal(a.length % STRIDE, 0);
  assert.ok(
    a.length / STRIDE < 1890000,
    "smaller than the prior 1,966,938-vertex buffer",
  );
  const objects = new Map();
  for (let i = 0; i < a.length; i += STRIDE) {
    for (let j = 0; j < STRIDE; j++) assert.ok(Number.isFinite(a[i + j]));
    if (a[i + 9] !== 0 && a[i + 11] === 0 && a[i + 12] >= 0 && a[i + 12] < 26)
      objects.set(a[i + 15], [a[i + 9], a[i + 10], a[i + 12]]);
  }
  assert.equal(objects.size, 225);
  const outer = new Set();
  let hoopVertices = 0,
    frontTriangles = 0;
  for (let i = 0; i < a.length; i += STRIDE * 3) {
    // First cathedral driver: its reduced annulus fan must preserve every
    // exact involute/bevel point and never fold a triangle through the bore.
    if (
      a[i + 9] === 1 &&
      a[i + 11] === 0 &&
      a[i + 12] === 2 &&
      Math.abs(a[i + 2] - 0.26) < 1e-6 &&
      a[i + 5] === 1
    ) {
      const p = [0, 1, 2].map((j) => [
        a[i + j * STRIDE],
        a[i + j * STRIDE + 1],
      ]);
      assert.ok(
        (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) -
          (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]) >
          -1e-8,
      );
      for (const v of p)
        if (Math.hypot(...v) > 1.3)
          outer.add(v.map((x) => x.toFixed(5)).join(","));
      frontTriangles++;
    }
    if (
      a[i + 9] === 0 &&
      a[i + 11] === 0 &&
      a[i + 12] === 2 &&
      a[i + 14] === 4.5 &&
      Math.hypot(a[i], a[i + 1]) > 4
    ) {
      // Rounded bearing hoop, not an extruded rectangle: its varying unit
      // normals follow a six-sided circular cross-section with smooth light.
      close(Math.hypot(a[i + 3], a[i + 4], a[i + 5]), 1, 1e-6);
      hoopVertices += 3;
    }
  }
  for (const p of bevelProfile(toothProfile(56, 1), GEAR_BEVEL))
    assert.ok(
      outer.has(p.map((x) => x.toFixed(5)).join(",")),
      "outer involute preserved",
    );
  assert.equal(frontTriangles, toothProfile(56, 1).length + 56 + 12);
  assert.equal(hoopVertices, 96 * 6 * 6);
  const hash = fingerprint(a);
  a = null;
  const again = createGeometry(10901);
  close(fingerprint(again), hash);
  const other = createGeometry(10902);
  assert.notEqual(fingerprint(other), hash);
});

test(
  "GPU: palettes, portrait, 4K, twelve-hour states and paused identity reversal",
  { skip: process.env.PHOSPHOR_ORRERY_GPU !== "1" },
  async () => {
    const { serve, launch, openLab } =
      await import("../scripts/browser-runtime.mjs");
    const { renderLook } = await import("./browser/client.mjs");
    const { PALETTES } = await import("../palettes.mjs");
    const { mkdir, writeFile } = await import("node:fs/promises");
    const out = new URL("../artifacts/orrery/round3-gpu/", import.meta.url);
    await mkdir(out, { recursive: true });
    const flag = process.argv.indexOf("--port");
    const port = flag < 0 ? 48783 : Number(process.argv[flag + 1]);
    const server = await serve(".", port),
      runtime = await launch({ rig: true, headless: true });
    const rows = [];
    try {
      const lab = await openLab(runtime.browser, server.url);
      for (const palette of ["symbiosis", "glacier", "silver"])
        for (const [width, height] of [
          [640, 360],
          [360, 640],
          [3840, 2160],
        ])
          for (const index of [0, 1, 2])
            for (const level of [0.1, 0.5, 0.9]) {
              const snapshot = presetSnapshot(scene, index);
              snapshot.palette = PALETTES.find((p) => p.id === palette).colors;
              await lab.page.evaluate(renderLook, {
                sceneId: "orrery",
                index,
                snapshot,
                width,
                height,
                frames: 2,
                level,
                capture: false,
                pollHealth: false,
              });
              const row = await lab.page.evaluate(
                ({ index, palette, width, height, level }) => {
                  const { engine } = window.__phosphorLab,
                    s = engine.slots.at(-1);
                  s.time = 43200;
                  engine.drawSlot(s, 0);
                  engine.present();
                  const canvas = document.createElement("canvas");
                  canvas.width = 64;
                  canvas.height = 36;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(engine.canvas, 0, 0, 64, 36);
                  const pixels = ctx.getImageData(0, 0, 64, 36).data;
                  let sum = 0,
                    peak = 0;
                  for (let j = 0; j < pixels.length; j += 4) {
                    sum += pixels[j] + pixels[j + 1] + pixels[j + 2];
                    peak = Math.max(
                      peak,
                      pixels[j],
                      pixels[j + 1],
                      pixels[j + 2],
                    );
                  }
                  const screenshot =
                    (width === 360 && palette === "symbiosis" && index === 1) ||
                    (width === 3840 && palette === "silver" && index === 2);
                  let png = null;
                  if (screenshot) {
                    const c = document.createElement("canvas");
                    c.width = width;
                    c.height = height;
                    c.getContext("2d").drawImage(engine.canvas, 0, 0);
                    png = c.toDataURL("image/png").split(",")[1];
                  }
                  return {
                    index,
                    palette,
                    width,
                    height,
                    level,
                    time: s.time,
                    mean: sum / (64 * 36 * 3),
                    peak,
                    glError: engine.gl.getError(),
                    nonFinite: engine.counters.nonFinite,
                    late:
                      engine.programsFor(s) ===
                      engine.programs.get("orrery").late,
                    png,
                  };
                },
                { index, palette, width, height, level },
              );
              assert.equal(row.glError, 0);
              assert.equal(row.nonFinite, 0);
              assert.ok(row.peak > 40);
              assert.ok(row.mean > 1);
              assert.equal(row.late, true);
              if (row.png)
                await writeFile(
                  new URL(`${palette}-${width}-${index}-${level}.png`, out),
                  Buffer.from(row.png, "base64"),
                );
              delete row.png;
              rows.push(row);
            }
      // Isolate slot 3 with fixed geometry/time and all other envelopes zero.
      // Leave the shared limiter intact; this measures a local mechanism event.
      await lab.page.evaluate(renderLook, {
        sceneId: "orrery",
        index: 2,
        width: 640,
        height: 360,
        frames: 2,
        level: 0.85,
        capture: false,
        pollHealth: false,
      });
      const signature = await lab.page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        const slot = engine.slots.at(-1);
        slot.time = 22;
        const frame = (value, count) => {
          slot.rhythm.values.fill(0);
          slot.rhythm.hits.fill(0);
          slot.rhythm.counts.fill(0);
          slot.rhythm.values[3] = value;
          slot.rhythm.counts[3] = count;
          engine.drawSlot(slot, 0);
          engine.present();
          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(engine.canvas, 0, 0, 160, 90);
          return ctx.getImageData(0, 0, 160, 90).data;
        };
        const delta = (a, b) => {
          let changed = 0;
          for (let i = 0; i < a.length; i += 4)
            if (
              Math.max(...[0, 1, 2].map((c) => Math.abs(a[i + c] - b[i + c]))) >
              3
            )
              changed++;
          return changed / (a.length / 4);
        };
        const muted = frame(0, 0),
          mutedCount = frame(0, 7);
        const early = frame(0.8, 1),
          travelling = frame(0.45, 1);
        return {
          muteDelta: delta(muted, mutedCount),
          eventDelta: delta(muted, early),
          travelDelta: delta(early, travelling),
          glError: engine.gl.getError(),
        };
      });
      assert.equal(signature.muteDelta, 0);
      assert.ok(signature.eventDelta > 0.005, JSON.stringify(signature));
      assert.ok(signature.travelDelta > 0.005, JSON.stringify(signature));
      assert.equal(signature.glError, 0);
      const reversal = await lab.page.evaluate(() => {
        const { engine } = window.__phosphorLab,
          s = engine.slots.at(-1),
          mesh = s.mesh;
        engine.resize(480, 270);
        const capture = (dev) => {
          const snap = structuredClone(engine.active);
          snap.params.development = dev;
          engine.setSnapshot(snap);
          engine.drawSlot(s, 0);
          engine.present();
          const c = document.createElement("canvas");
          c.width = 480;
          c.height = 270;
          c.getContext("2d").drawImage(engine.canvas, 0, 0);
          return c.toDataURL("image/png");
        };
        const before = capture(0.73);
        capture(1.97);
        const after = capture(0.73);
        return {
          equal: before === after,
          sameMesh: s.mesh === mesh,
          glError: engine.gl.getError(),
        };
      });
      assert.equal(reversal.equal, true);
      assert.equal(reversal.sameMesh, true);
      assert.equal(reversal.glError, 0);
      assert.deepEqual(lab.errors, []);
      await writeFile(
        new URL("health.json", out),
        JSON.stringify({ rows, signature, reversal }, null, 2),
      );
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);

test("rhythm acts locally on the signature; parameter-dependent phases use integrated clocks", () => {
  assert.deepEqual(
    scene.rhythm.map((r) => r.defaults.length),
    [4, 8, 16, 16],
  );
  assert.equal(scene.rhythm.length, 4);
  const signature = scene.rhythm.find((r) => r.slot === 3);
  assert.equal(signature.id, "escapement-strike");
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    assert.ok(signature.styles[style]);
    const pattern = defaultPattern(scene.rhythm, style);
    const hitsPerBar = pattern.tracks.reduce(
      (sum, t) =>
        sum + (t.steps.filter((v) => v > 0).length * t.division * 4) / t.length,
      0,
    );
    assert.ok(hitsPerBar >= minimum, `${style}: ${hitsPerBar} hits/bar`);
    assert.ok(signature.styles[style].steps.filter((v) => v > 0).length >= 2);
  }
  assert.match(scene.geometry.vertex, /u_rhythmHit.w/);
  assert.match(scene.geometry.vertex, /u_rhythmCount.w/);
  assert.match(scene.geometry.fragment, /clamp\(u_rhythm.w/);
  assert.match(scene.geometry.fragment, /v_p-origin/);
  const shader = scene.geometry.vertex;
  assert.match(shader, /a_motion.x\*drive\(\)\+a_motion.y/);
  assert.match(shader, /kind>2.5&&kind<3.5/);
  assert.match(shader, /\.10\*clamp\(u_kick\+u_rhythm.x/);
  assert.match(shader, /group==51\.\?\.25/);
  assert.match(scene.geometry.fragment, /tooth\*clamp\(u_rhythm.x/);
  assert.match(scene.geometry.fragment, /v_tag.z\*clamp\(u_rhythm.y/);
  assert.match(scene.geometry.fragment, /u_rhythm.z/);
  for (const source of [scene.fragment, shader, scene.geometry.fragment]) {
    assert.doesNotMatch(source, /mod\(\s*u_time/);
    assert.doesNotMatch(shaderVariant(source, false), /u_clock/);
    assert.match(shaderVariant(source, true), /u_clock\[0\]/);
  }
});
