import test from "node:test";
import assert from "node:assert/strict";
import soap, {
  filmReflectance,
  filmThickness,
  filmPalettePosition,
  PLATEAU_SITES,
  PLATEAU_BORDER_ANGLE,
  soapLayout,
} from "../scene-soap.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { continuousDevelopment, defaultWorlds } from "../worlds.mjs";
import { presetSnapshot } from "../session.mjs";
import { advanceClocks } from "../scene-time.mjs";
import { defaultPattern } from "../rhythm.mjs";

const add = (a, b) => a.map((x, i) => x + b[i]);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const mul = (a, s) => a.map((x) => x * s);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const length = (a) => Math.hypot(...a);
const unit = (a) => mul(a, 1 / length(a));
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const near = (a, b, e = 1e-11) =>
  assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const rotate = (p, a, i, j) => {
  const q = p.slice(),
    c = Math.cos(a),
    s = Math.sin(a);
  q[i] = c * p[i] + s * p[j];
  q[j] = -s * p[i] + c * p[j];
  return q;
};

// Double-precision construction from the exported seven-bay layout.
// Potential identities persist even where a single-film bay has zero-radius
// secondary sites; affine peak piers are tested in their own local metric.
function cells(
  dev,
  seed = 11301,
  flow = 0.7,
  camera = 0.3,
  level = 0.5,
  chamber = 1,
) {
  const root = soapLayout(dev, seed, level, chamber, flow);
  const seedAngle = (seed % 997) * 0.006302,
    angle = 0.16 * Math.sin(camera) + seedAngle;
  return root.flatMap(({ c, size, form, stretch }, g) =>
    PLATEAU_SITES.map((site, j) => {
      let off = mul(sub(site, mul(PLATEAU_SITES[0], 1 - form)), size * form);
      off = rotate(off, g * 0.73, 0, 1);
      off = rotate(off, g * 1.13, 1, 2);
      off = rotate(off, angle, 0, 2);
      return {
        id: `${g}:${j}`,
        c: add(
          c,
          off.map((v, i) => v * stretch[i]),
        ),
        stretch,
        r: size * (j === 0 ? 1 : form),
      };
    }),
  );
}

// Power-bisector plane: dot(p, normal)=offset, shared by both cells.
function plane(a, b) {
  const d = sub(b.c, a.c),
    l = length(d);
  return {
    n: mul(d, 1 / l),
    h: (dot(b.c, b.c) - dot(a.c, a.c) + a.r * a.r - b.r * b.r) / (2 * l),
  };
}

test("Airy film has the phase-reversed destructive and constructive fringe orders", () => {
  const n = 1.333;
  for (const wavelength of [380, 460, 550, 650, 780])
    for (const mu of [1, 0.8, 0.4, 0.08]) {
      const ct = Math.sqrt(1 - (1 - mu * mu) / (n * n));
      const rs = ((mu - n * ct) / (mu + n * ct)) ** 2,
        rp = ((n * mu - ct) / (n * mu + ct)) ** 2;
      const peak = 0.5 * ((4 * rs) / (1 + rs) ** 2 + (4 * rp) / (1 + rp) ** 2);
      for (let order = 0; order < 8; order++) {
        const destructive = (order * wavelength) / (2 * n * ct);
        const constructive = ((2 * order + 1) * wavelength) / (4 * n * ct);
        near(filmReflectance(destructive, mu, wavelength), 0);
        near(filmReflectance(constructive, mu, wavelength), peak);
        // Check actual local extrema, not just phase formula equality.
        assert.ok(
          filmReflectance(constructive, mu, wavelength) >
            filmReflectance(constructive + 10, mu, wavelength),
        );
        assert.ok(
          filmReflectance(constructive, mu, wavelength) >
            filmReflectance(constructive - 10, mu, wavelength),
        );
      }
    }
  near(filmReflectance(0, 1, 550), 0);
});

test("reflectance is bounded, even in angle, and approaches a bright grazing film", () => {
  for (let d = 0; d <= 1800; d += 17)
    for (const mu of [0, 0.001, 0.02, 0.1, 0.5, 1]) {
      const r = filmReflectance(d, mu, 550);
      assert.ok(Number.isFinite(r) && r >= 0 && r <= 1 + 1e-12);
      near(r, filmReflectance(d, -mu, 550));
    }
  assert.ok(filmReflectance(640, 0.001, 550) > 0.99);
  assert.ok(filmReflectance(640, 0.001, 550) > filmReflectance(640, 1, 550));
  assert.match(
    soap.fragment,
    /vec3 phase=4\.0\*PI\*n\*thickness\*ct\/vec3\(460\.0,550\.0,650\.0\)/,
  );
  assert.match(soap.fragment, /vec3 cp=cos\(phase\),s=1\.0-cp/);
  assert.match(soap.fragment, /vec3 iridescence=palette\(/);
});

test("draining films have a black cap, thick lower reservoir and a smooth periodic vortex", () => {
  let upper = 0,
    lower = 0;
  for (let i = 0; i < 64; i++) {
    const flow = (i * 2 * Math.PI) / 64;
    const options = { flow, drain: flow, drainage: 0.65 };
    upper += filmThickness([0, 1, 0], options);
    lower += filmThickness([0, -1, 0], options);
    assert.ok(filmThickness([0, 1, 0], options) < 25);
    for (const q of [
      [0.17, -0.12, 0.4],
      [0.7, 0.1, -0.3],
      [-0.4, -0.5, 0.2],
    ]) {
      const d = filmThickness(q, options);
      assert.ok(d >= 6 && d < 1800);
      near(
        d,
        filmThickness(q, {
          ...options,
          flow: flow + 2 * Math.PI,
          drain: flow + 2 * Math.PI,
        }),
        1e-9,
      );
      const adjacent = filmThickness(add(q, [1e-7, 0, 0]), options);
      assert.ok(Math.abs(adjacent - d) < 0.01, "no vortex/chart seam");
      const pulse = filmThickness(q, { ...options, rhythm: 1 });
      assert.ok(pulse >= d && pulse <= d * 1.16 + 1e-10);
    }
  }
  assert.ok(
    lower / upper > 60,
    "gravity drains the upper cap, not the lower reservoir",
  );
  assert.match(soap.fragment, /float height=q\.y\+\.28\*curl/);
  assert.match(
    soap.fragment,
    /sin\(12\.0\*height\+flowPhase\)/,
    "positive phase carries fringes downwards",
  );
  assert.match(soap.fragment, /\(\.015\+\.985\*blackCap\)/);
});

test("optical thickness traverses the full palette without a sawtooth wrap", () => {
  const bins = [0, 0, 0];
  for (let d = 6; d <= 1500; d++) {
    const t = filmPalettePosition(d, 0.8);
    assert.ok(t >= 0.02 && t <= 0.98 + 1e-12);
    bins[t < 0.3 ? 0 : t < 0.8 ? 1 : 2]++;
    assert.ok(Math.abs(t - filmPalettePosition(d + 0.001, 0.8)) < 0.001);
  }
  assert.ok(
    bins.every((n) => n > 150),
    `all palette regions must be present: ${bins}`,
  );
  assert.match(
    soap.fragment,
    /palette\(\.02\+\.79\*fringe\+\.17\*pow\(fringe,12\.0\)\)/,
  );
  assert.match(soap.fragment, /soapDefocus\(float t\)/);
  assert.match(soap.fragment, /filmCentre=centre;filmScale=max\(size,\.001\)/);
});

test("every tetrahedral triple carries three equal-tension films at 120 degrees", () => {
  for (let a = 0; a < 4; a++)
    for (let b = a + 1; b < 4; b++)
      near(length(sub(PLATEAU_SITES[a], PLATEAU_SITES[b])), 1);
  for (let excluded = 0; excluded < 4; excluded++) {
    const p = PLATEAU_SITES.filter((_, i) => i !== excluded);
    const normals = p.map((s, i) => unit(sub(p[(i + 1) % 3], s)));
    for (let i = 0; i < 3; i++)
      near(dot(normals[i], normals[(i + 1) % 3]), -0.5);
    near(length(normals.reduce(add, [0, 0, 0])), 0);
  }
  // At the outer wet seam, two spherical caps and the flat shared film
  // have three outward tangents that sum to zero (not just a drawn Y).
  const tangents = [
    [-Math.sqrt(3) / 2, 0.5],
    [Math.sqrt(3) / 2, 0.5],
    [0, -1],
  ];
  near(length(tangents.reduce(add, [0, 0])), 0);
  for (let i = 0; i < 3; i++)
    near(dot(tangents[i], tangents[(i + 1) % 3]), -0.5);
});

test("all four Plateau borders meet at the tetrahedral 109.471 degree angle", () => {
  const borders = [];
  for (let excluded = 0; excluded < 4; excluded++) {
    const p = PLATEAU_SITES.filter((_, i) => i !== excluded);
    let border = unit(cross(sub(p[1], p[0]), sub(p[2], p[0])));
    const outward = mul(PLATEAU_SITES[excluded], -1);
    if (dot(border, outward) < 0) border = mul(border, -1);
    borders.push(border);
  }
  for (let a = 0; a < 4; a++)
    for (let b = a + 1; b < 4; b++) {
      near(dot(borders[a], borders[b]), -1 / 3);
      near(Math.acos(dot(borders[a], borders[b])), PLATEAU_BORDER_ANGLE);
    }
  near((PLATEAU_BORDER_ANGLE * 180) / Math.PI, 109.47122063449069);
});

test("shared power planes are symmetric, and clipped tetra faces share one junction", () => {
  const c = cells(1).slice(0, 4);
  const junction = mul(c.map((x) => x.c).reduce(add, [0, 0, 0]), 0.25);
  for (let j = 0; j < 4; j++)
    for (let k = j + 1; k < 4; k++) {
      const a = plane(c[j], c[k]),
        b = plane(c[k], c[j]);
      near(dot(a.n, junction), a.h);
      near(dot(a.n, b.n), -1);
      near(a.h, -b.h);
      // Equal powers on both sides of the shared film.
      const p = add(junction, mul(unit(cross(a.n, [0.1, 0.7, 0.9])), 0.15));
      near(
        dot(sub(p, c[j].c), sub(p, c[j].c)) - c[j].r ** 2,
        dot(sub(p, c[k].c), sub(p, c[k].c)) - c[k].r ** 2,
      );
    }
  assert.match(
    soap.fragment,
    /if\(k<=j\|\|soapR\[k\]<\.001\|\|soapR\[j\]<\.001\)continue/,
  );
  assert.ok(soap.fragment.includes("clip=min(clip,(pl-dot(p,dm))/planeNorm);"));
  assert.match(soap.fragment, /float planeNorm=max\(size\*cellForm,\.0001\)/);
  assert.match(soap.fragment, /if\(clip < -aa\)continue/);
  for (const dev of [0.1, 0.5, 1, 1.5, 2]) {
    const c = cells(dev).slice(0, 4),
      len = (1 + 0.35 * smooth(1, 2, dev)) * smooth(0, 1, dev);
    for (let j = 0; j < 4; j++)
      for (let k = j + 1; k < 4; k++)
        near(
          length(sub(c[k].c, c[j].c).map((v, i) => v / c[j].stretch[i])),
          len,
        );
  }
});

test("identity survives every development value, energy, reversal and stationary phase", () => {
  const expected = cells(0).map((x) => x.id),
    forward = [];
  for (let i = 0; i <= 400; i++) {
    const current = cells(i / 200);
    assert.deepEqual(
      current.map((x) => x.id),
      expected,
    );
    for (const c of current)
      assert.ok([...c.c, c.r].every(Number.isFinite) && c.r >= 0);
    if (i)
      for (let j = 0; j < current.length; j++) {
        assert.ok(length(sub(current[j].c, forward[i - 1][j].c)) < 0.13);
        assert.ok(Math.abs(current[j].r - forward[i - 1][j].r) < 0.03);
      }
    forward.push(current);
  }
  for (let i = 400; i >= 0; i--) assert.deepEqual(cells(i / 200), forward[i]);
  for (const dev of [0, 1, 2])
    for (const level of [0.1, 0.9])
      assert.deepEqual(
        cells(dev, 11301, 0.7, 0.3, level).map((x) => x.id),
        expected,
      );
  for (const dev of [0, 1, 2]) {
    const a = cells(Math.max(0, dev - 1e-6)),
      b = cells(Math.min(2, dev + 1e-6));
    for (let i = 0; i < a.length; i++)
      assert.ok(length(sub(a[i].c, b[i].c)) < 1e-9);
  }
  assert.equal(soap.geometry, undefined, "no seed/development rebuild path");
  assert.equal(soap.simulation, undefined, "analytic deterministic films");
  assert.match(soap.fragment, /c=mix\(centre,c\*u_params\[6\],cathedral\)/);
});

test("the camera remains outside every film over its full closed orbit", () => {
  for (const preset of soap.presets)
    for (const level of [0.1, 0.9])
      for (let k = 0; k <= 20; k++)
        for (let step = 0; step < 32; step++) {
          const phase = (2 * Math.PI * step) / 32,
            dev = k / 10;
          const f = smooth(0, 1, dev),
            cathedral = smooth(1, 2, dev),
            h = (preset.params.elevation - 0.5) * 1.2;
          const az = (0.13 + 0.035 * cathedral) * Math.sin(phase);
          const ro = [
            Math.sin(az) * (5.4 + 1.15 * f),
            h + 0.18 * Math.sin(2 * phase) + 0.16 * cathedral * Math.sin(phase),
            5.4 + 1.15 * f,
          ];
          for (const c of cells(
            dev,
            preset.seed,
            phase,
            phase,
            level,
            preset.params.chamber,
          ))
            assert.ok(
              length(sub(ro, c.c).map((v, i) => v / c.stretch[i])) > c.r + 0.1,
              `${preset.name} camera inside ${c.id}`,
            );
        }
  assert.match(soap.fragment, /1\.0\+\.018\*u_kick/);
  assert.match(soap.fragment, /float footprint=max\(tc\*pixel\/1\.85,\.0001\)/);
  assert.match(soap.fragment, /float thickness=max\(6\.0,/);
  const diameter = (2 * (1.85 + 0.19)) / Math.sqrt(5.4 ** 2 - 1);
  assert.ok(
    diameter >= 0.75 && diameter <= 0.8,
    "Bubble fills 75–80% of the short side",
  );
  assert.ok(soap.fragment.includes("fw*(1.85+.19*(1.0-cathedral))"));
});

test("nave has unequal receding bays and affine rays retain world distances and normals", () => {
  const bays = soapLayout(2);
  assert.equal(bays.length, 7);
  assert.ok(bays[0].c[0] < -2.9 && bays[1].c[0] === 3);
  assert.ok(bays[2].stretch[0] > 1.7 && bays[2].c[1] > 3.5);
  assert.ok(bays[6].c[2] < -8 && bays[6].size < bays[1].size);
  for (let dev = 0; dev <= 2; dev += 0.05)
    for (const { stretch } of soapLayout(dev)) {
      const ray = unit([0.3, -0.4, -1]);
      const local = ray.map((v, i) => v / stretch[i]);
      const rayScale = length(local);
      const hit = unit(local).map((v, i) => v * 7 * stretch[i]);
      near(length(hit), 7 / rayScale);
      const n = unit([0.2, 0.7, 0.3]);
      const tangent = cross(n, [1, 0, 0]);
      const worldNormal = n.map((v, i) => v / stretch[i]);
      near(
        dot(
          worldNormal,
          tangent.map((v, i) => v * stretch[i]),
        ),
        0,
      );
    }
  assert.match(soap.fragment, /n=normalize\(n\/groupStretch\)/);
  assert.match(soap.fragment, /distance\/=groupRayScale/);
  assert.ok(soap.fragment.includes("if(cellForm==0.0)"));
  assert.ok(
    soapLayout(2)
      .slice(1, 6)
      .every((bay) => bay.form === 0),
  );
  assert.equal(soapLayout(2)[6].form, 1);
  // Narrow travelling ridge, displaced interference and a trailing wake:
  // these must not regress to a broad accent-colour patch.
  assert.ok(soap.fragment.includes("front/.055"));
  assert.ok(soap.fragment.includes("(front+.16)/.18"));
  assert.ok(soap.fragment.includes("thickness*=1.0+.65*shimmer+.10*wake"));
  for (const envelope of [0.95, 0.6, 0.25, 0.05]) {
    const radius = 0.1 + 2.8 * (1 - Math.sqrt(envelope));
    const before = 0.1 + 2.8 * (1 - Math.sqrt(Math.min(1, envelope + 0.01)));
    assert.ok(radius > before && radius < 3);
  }
});

test("all four signature gestures are bounded and time stays continuous for 12 hours", () => {
  assert.deepEqual(
    soap.rhythm.map((r) => r.defaults.length),
    [4, 8, 16, 8],
  );
  assert.equal(soap.rhythm[3].slot, 3);
  assert.equal(soap.rhythm[3].id, "film-shimmer");
  for (const uniform of ["u_rhythm.w", "u_rhythmHit.w", "u_rhythmCount.w"])
    assert.ok(soap.fragment.includes(uniform));
  for (const [style, minimum] of [
    ["restrained", 2],
    ["driving", 6],
    ["accented", 8],
  ]) {
    const tracks = defaultPattern(soap.rhythm, style).tracks;
    const density = tracks.reduce(
      (n, t) =>
        n + (t.steps.filter((v) => v > 0).length * 4 * t.division) / t.length,
      0,
    );
    assert.ok(density >= minimum, `${style}: ${density} hits/bar`);
    for (const track of tracks) {
      const hits = track.steps.flatMap((value, i) => (value > 0 ? [i] : []));
      for (let i = 0; i < hits.length; i++) {
        const next =
          hits[(i + 1) % hits.length] +
          (i === hits.length - 1 ? track.length : 0);
        assert.ok(
          track.duration < (next - hits[i]) / track.division,
          `${style}/${track.effect} settles`,
        );
      }
    }
    assert.ok(
      soap.rhythm[3].styles[style].steps.filter((v) => v > 0).length >= 2,
    );
  }
  for (const channel of ["x", "y", "z", "w"])
    assert.ok(soap.fragment.includes(`u_rhythm.${channel}`));
  const p = soap.schema.map((f) => f.default);
  for (const at of [3600, 43200]) {
    const state = {};
    advanceClocks(state, soap.clocks, at - 1 / 60, p, 0.1);
    const before = advanceClocks(state, soap.clocks, at, p, 0.1).slice();
    const after = advanceClocks(
      state,
      soap.clocks,
      at + 1 / 60,
      p.map((x, i) => (i === 2 || i === 3 ? x * 1.7 : x)),
      0.9,
    );
    for (let i = 0; i < 3; i++)
      assert.ok((after[i] - before[i] + 2 * Math.PI) % (2 * Math.PI) < 0.01);
  }
  assert.ok(soap.clocks.every((c) => c.period === 2 * Math.PI));
});

test("all eight presets validate; the authored world is found by id and has continuous state identity", () => {
  assert.equal(soap.number, 113);
  assert.equal(soap.development, "development");
  assert.equal(soap.presets.length, 8);
  assert.deepEqual(soap.type.values, [0, 1, 2]);
  assert.deepEqual(
    soap.presets.map((p) => p.name),
    [
      "Bubble",
      "Cluster",
      "Foam",
      "Pearl Vessel",
      "Tidal Glass",
      "Quiet Junction",
      "Opal Nave",
      "Black Pearl",
    ],
  );
  for (const preset of soap.presets)
    for (const f of soap.schema)
      assert.ok(
        Number.isFinite(preset.params[f.key]) &&
          preset.params[f.key] >= f.min &&
          preset.params[f.key] <= f.max,
        `${preset.name}.${f.key}`,
      );
  const states = soap.presets.slice(0, 3);
  assert.equal(new Set(states.map((p) => p.seed)).size, 1);
  const identity = ({ params: { development, ...rest } }) => rest;
  assert.deepEqual(states.map(identity), [
    identity(states[0]),
    identity(states[0]),
    identity(states[0]),
  ]);
  const worlds = defaultWorlds(catalogLooks(scenes).map((l) => l.id));
  const world = worlds.find((w) => w.id === "soap-cathedral");
  assert.equal(world.id, "soap-cathedral");
  assert.deepEqual(
    world.states.map((s) => s.name),
    ["Bubble", "Cluster", "Foam"],
  );
  assert.deepEqual(
    continuousDevelopment(
      states.map((_, i) => ({ snapshot: presetSnapshot(soap, i) })),
      soap,
    )?.positions,
    [0, 1, 2],
  );
});
