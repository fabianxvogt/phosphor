import test from "node:test";
import assert from "node:assert/strict";
import ripple, {
  GRID,
  COURANT2,
  SOURCE_X,
  WALL_X,
  SPONGE,
  slitCentres,
  slitHalfWidth,
  lensContains,
  emitters,
} from "../scene-ripple.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

const [GW, GH] = GRID;

// CPU mirror of the simulation shader (variant 0, no beat, mid energy).
function tank({
  lambda = 16,
  count = 2,
  gap = 40,
  damping = 0.1,
  steps = 1400,
  avgFrom = 800,
  amp = 0.55,
  slits = true,
}) {
  let u = new Float64Array(GW * GH),
    up = new Float64Array(GW * GH),
    un = new Float64Array(GW * GH);
  const I = new Float64Array(GW * GH);
  const wall = new Uint8Array(GW * GH);
  const cs = slitCentres(count, gap),
    w = slitHalfWidth(lambda, count);
  if (slits)
    for (let y = 0; y < GH; y++)
      for (let x = WALL_X; x < WALL_X + 2; x++)
        if (!cs.some((c) => Math.abs(y + 0.5 - c) < w)) wall[y * GW + x] = 1;
  const freq = 0.5 / lambda,
    omega = 2 * Math.PI * freq;
  const at = (x, y) =>
    u[Math.min(GH - 1, Math.max(0, y)) * GW + Math.min(GW - 1, Math.max(0, x))];
  let phase = 0,
    n = 0,
    maxAbs = 0;
  for (let s = 0; s < steps; s++) {
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (wall[i]) {
          un[i] = 0;
          continue;
        }
        const lap =
          at(x + 1, y) + at(x - 1, y) + at(x, y + 1) + at(x, y - 1) - 4 * u[i];
        const edge = Math.min(x, GW - 1 - x, y, GH - 1 - y);
        const g = damping * 0.004 + 0.2 * Math.max(0, 1 - edge / SPONGE) ** 2;
        let v = (2 - g) * u[i] - (1 - g) * up[i] + COURANT2 * lap;
        if (x === SOURCE_X)
          v += amp * omega * 1.0 * Math.sin(2 * Math.PI * phase);
        un[i] = v;
      }
    [up, u, un] = [u, un, up];
    phase = (phase + freq) % 1;
    for (let i = 0; i < u.length; i++)
      maxAbs = Math.max(maxAbs, Math.abs(u[i]));
    if (s >= avgFrom) {
      for (let i = 0; i < I.length; i++) I[i] += u[i] * u[i];
      n++;
    }
  }
  for (let i = 0; i < I.length; i++) I[i] /= n;
  return { I, maxAbs };
}

test("double slit: fringes where the path difference is a whole or half wavelength", () => {
  const lambda = 16,
    d = 40;
  const { I, maxAbs } = tank({ lambda, gap: d });
  assert.ok(maxAbs < 4, `the 16-bit range (±4) holds: ${maxAbs}`);
  const x = WALL_X + 2 + 150;
  const [s1, s2] = slitCentres(2, d);
  const at = (y) => I[Math.round(y) * GW + x];
  // Exact near-field positions: |r1 − r2| = λ/2 (dark) and λ (bright).
  const pathDiff = (y) => Math.hypot(150, y - s1) - Math.hypot(150, y - s2);
  const find = (target) => {
    let best = GH / 2;
    for (let y = GH / 2; y < GH - 20; y += 0.25)
      if (
        Math.abs(Math.abs(pathDiff(y)) - target) <
        Math.abs(Math.abs(pathDiff(best)) - target)
      )
        best = y;
    return best;
  };
  const centre = at(GH / 2),
    dark = at(find(lambda / 2)),
    bright = at(find(lambda));
  assert.ok(centre > 4 * dark, `centre ${centre} vs dark ${dark}`);
  assert.ok(bright > 3 * dark, `first order ${bright} vs dark ${dark}`);
});

test("the soft line source makes a plane wave of about the requested amplitude", () => {
  const { I } = tank({ lambda: 16, slits: false, steps: 900, avgFrom: 500 });
  // ⟨u²⟩ = A²/2 for a travelling sine of amplitude A.
  let sum = 0;
  for (let x = 60; x <= 200; x += 10)
    sum += Math.sqrt(2 * I[Math.floor(GH / 2) * GW + x]);
  const amplitude = sum / 15;
  assert.ok(Math.abs(amplitude - 0.55) < 0.12, `${amplitude}`);
});

test("geometry helpers: slits, lens, phased array delays", () => {
  assert.deepEqual(slitCentres(2, 40), [GH / 2 - 20, GH / 2 + 20]);
  assert.ok(slitHalfWidth(20, 1) > 20, "a single slit is wider than λ");
  assert.ok(lensContains([0.42 * GW, GH / 2]));
  assert.ok(!lensContains([0.2 * GW, GH / 2]));
  const e = emitters(4, 6, 14, Math.PI / 6);
  assert.equal(e.length, 12);
  // Successive delays equal 2π·d·sin θ / λ.
  assert.ok(
    Math.abs(e[1].phase - e[0].phase - (2 * Math.PI * 6 * 0.5) / 14) < 1e-12,
  );
});

test("every look validates and all four tanks are covered", () => {
  assert.ok(ripple.presets.length >= 8);
  for (const value of ripple.type.values)
    assert.ok(
      ripple.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < ripple.presets.length; i++) {
    const snapshot = presetSnapshot(ripple, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [ripple]),
      snapshot,
    );
  }
});
