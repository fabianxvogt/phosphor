import test from "node:test";
import assert from "node:assert/strict";
import kleinian, {
  apollonianStrip,
  cayleyInverse,
  schottkyA,
  steinerRho,
  cdiv,
  cmul,
} from "../scene-kleinian.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

// Circle through three points: [cx, cy, r].
function circle([ax, ay], [bx, by], [cx, cy]) {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const ux =
    ((ax * ax + ay * ay) * (by - cy) +
      (bx * bx + by * by) * (cy - ay) +
      (cx * cx + cy * cy) * (ay - by)) /
    d;
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) +
      (bx * bx + by * by) * (ax - cx) +
      (cx * cx + cy * cy) * (bx - ax)) /
    d;
  return [ux, uy, Math.hypot(ax - ux, ay - uy)];
}
// The disc image of the strip circle centred (k, ½) with radius ½.
const stripCircle = (k) =>
  circle(
    cayleyInverse([k, 0]),
    cayleyInverse([k, 1]),
    cayleyInverse([k + 0.5, 0.5]),
  );

test("the Cayley image of the strip packing is the integer gasket (−1, 2, 2, 3)", () => {
  const k0 = 1 / stripCircle(0)[2],
    k1 = 1 / stripCircle(1)[2];
  assert.ok(Math.abs(k0 - 2) < 1e-9 && Math.abs(k1 - 3) < 1e-9, `${k0} ${k1}`);
  // Descartes: (Σk)² = 2Σk² for outer −1, the top line's circle 2, k0, k1.
  const ks = [-1, 2, k0, k1];
  const sum = ks.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum * sum - 2 * ks.reduce((a, b) => a + b * b, 0)) < 1e-9);
  // Every circle of the chain has an integer curvature.
  for (let k = -3; k <= 4; k++) {
    const curvature = 1 / stripCircle(k)[2];
    assert.ok(
      Math.abs(curvature - Math.round(curvature)) < 1e-6,
      `${k}: ${curvature}`,
    );
  }
});

test("the strip walk: circles stop at once, gaps go deeper, the walk is translation-invariant", () => {
  assert.deepEqual(apollonianStrip([0.1, 0.5]), { depth: 0, circle: "strip" });
  assert.deepEqual(apollonianStrip([3, 2]), { depth: 0, circle: "top" });
  const gap = apollonianStrip([0.5, 0.05]);
  assert.ok(gap.depth >= 1 && gap.circle === "strip");
  for (const [x, y] of [
    [0.37, 0.11],
    [0.52, 0.03],
    [0.9, 0.2],
  ])
    assert.deepEqual(apollonianStrip([x, y]), apollonianStrip([x + 5, y]));
});

test("Schottky generator a maps its circle pair onto each other, outside to inside", () => {
  const c = 1,
    r = 0.6;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    const onLeft = [-c + r * Math.cos(a), r * Math.sin(a)];
    const image = schottkyA(onLeft, c, r);
    assert.ok(Math.abs(Math.hypot(image[0] - c, image[1]) - r) < 1e-9);
  }
  const outside = schottkyA([0.2, 0.3], c, r);
  assert.ok(Math.hypot(outside[0] - c, outside[1]) < r);
});

test("Steiner chain: neighbours touch, and stay tangent after the Möbius shift (porism)", () => {
  for (const n of [3, 6, 9]) {
    const rho = steinerRho(n),
      R = (1 + rho) / 2,
      s = (1 - rho) / 2;
    assert.ok(Math.abs(2 * R * Math.sin(Math.PI / n) - 2 * s) < 1e-12);
    // Push the chain through z → (z − a)/(1 − āz) at several turns.
    const a = [0.3, 0];
    const mob = (z) =>
      cdiv([z[0] - a[0], z[1] - a[1]], [1 - cmul(a, z)[0], -cmul(a, z)[1]]);
    for (const turn of [0, 0.37, 1.1]) {
      const img = Array.from({ length: n }, (_, k) => {
        const th = turn + (2 * Math.PI * k) / n;
        const pt = (phi) =>
          mob([
            R * Math.cos(th) + s * Math.cos(phi),
            R * Math.sin(th) + s * Math.sin(phi),
          ]);
        return circle(pt(0), pt(2), pt(4));
      });
      for (let k = 0; k < n; k++) {
        const [x1, y1, r1] = img[k],
          [x2, y2, r2] = img[(k + 1) % n];
        assert.ok(
          Math.abs(Math.hypot(x1 - x2, y1 - y2) - (r1 + r2)) < 1e-9,
          `n=${n} k=${k}`,
        );
      }
    }
  }
});

test("every look validates and all four groups are covered", () => {
  assert.ok(kleinian.presets.length >= 8);
  for (const value of kleinian.type.values)
    assert.ok(
      kleinian.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < kleinian.presets.length; i++) {
    const snapshot = presetSnapshot(kleinian, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [kleinian]),
      snapshot,
    );
  }
});
