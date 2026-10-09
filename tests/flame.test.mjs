import test from "node:test";
import assert from "node:assert/strict";
import flame, {
  BOXES,
  SPECIES,
  encode,
  decode,
  step,
  transform,
  count,
} from "../scene-flame.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

function lcg(seed) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

test("12/12/8-bit packing round-trips within one quantum", () => {
  for (const box of BOXES)
    for (const [x, y, c] of [
      [box[0], box[1], 0],
      [box[2], box[3], 1],
      [(box[0] + box[2]) / 2, box[1] * 0.3 + box[3] * 0.7, 0.42],
    ]) {
      const [dx, dy, dc] = decode(encode(x, y, c, box), box);
      assert.ok(Math.abs(dx - x) <= (box[2] - box[0]) / 4095 + 1e-9);
      assert.ok(Math.abs(dy - y) <= (box[3] - box[1]) / 4095 + 1e-9);
      assert.ok(Math.abs(dc - c) <= 1 / 255 + 1e-9);
    }
});

test("the fern and the dragon are the textbook maps", () => {
  const fern = [0, 1, 2, 3].map((k) => transform(4, k, 0));
  assert.deepEqual(fern[1][0], [0.85, 0.04, -0.04, 0.85, 0, 1.6]);
  assert.deepEqual(
    fern.map((t) => t[1]),
    [0.01, 0.85, 0.07, 0.07],
  );
  const [d0] = transform(5, 0, 0);
  assert.ok(Math.abs(d0[0] - 0.5) < 1e-12 && Math.abs(d0[2] - 0.5) < 1e-12);
});

test("every species stays inside its box (with rare escapes) across the morph loop and symmetry", () => {
  for (let s = 0; s < SPECIES; s++)
    for (const symmetry of [1, 4, 6])
      for (const m of [0, 1.3, 2.9, 4.4, 6]) {
        const random = lcg(s * 100 + symmetry * 10 + Math.round(m * 7));
        let p = [0.1, 0.1, 0.5];
        let out = 0;
        const box = BOXES[s];
        for (let i = 0; i < 4000; i++) {
          p = step(s, m, p, random, symmetry);
          if (
            !Number.isFinite(p[0]) ||
            p[0] < box[0] ||
            p[0] > box[2] ||
            p[1] < box[1] ||
            p[1] > box[3]
          ) {
            out++;
            p = [0.1, 0.1, 0.5];
          }
        }
        // Spherical variations throw rare points far out (they respawn on
        // the attractor); linear chaos games never leave their box.
        const allowed = s === 0 || s === 2 ? 0.08 : 0.002;
        assert.ok(
          out / 4000 <= allowed,
          `species ${s} sym ${symmetry} m ${m}: ${out} escapes`,
        );
      }
});

test("the fern grows to its known height and the generic maps are contractive", () => {
  const random = lcg(5);
  let p = [0, 0, 0],
    top = 0;
  for (let i = 0; i < 20000; i++) {
    p = step(4, 0, p, random);
    top = Math.max(top, p[1]);
  }
  assert.ok(top > 9.5 && top < 10.1, `fern top ${top}`);
  for (let s = 0; s < 4; s++)
    for (let k = 0; k < count(s); k++)
      for (const m of [0, 1, 2, 3, 4, 5, 6]) {
        const [[a, b, c, d]] = transform(s, k, m);
        // Largest singular value < 1.
        const t = a * a + b * b + c * c + d * d,
          det = a * d - b * c;
        const sMax = Math.sqrt(
          (t + Math.sqrt(Math.max(0, t * t - 4 * det * det))) / 2,
        );
        assert.ok(sMax < 1, `species ${s} map ${k} m ${m}: ${sMax}`);
      }
});

test("every look validates and all six species are covered", () => {
  assert.ok(flame.presets.length >= 8);
  for (const value of flame.type.values)
    assert.ok(
      flame.presets.some((p) => p.params.species === value),
      value,
    );
  for (let i = 0; i < flame.presets.length; i++) {
    const snapshot = presetSnapshot(flame, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [flame]),
      snapshot,
    );
  }
});
