import test from "node:test";
import assert from "node:assert/strict";
import truchet, { smith } from "../scene-truchet.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";

// A random coin field.
const coin = (x, y) =>
  ((Math.imul((x * 73856093) ^ (y * 19349663), 2654435761) >>> 0) % 7) % 2 ===
  1;
const at = (x, y) => {
  const cx = Math.floor(x),
    cy = Math.floor(y);
  return smith([x - cx, y - cy], [cx, cy], coin(cx, cy));
};

test("the two-colouring is consistent across every tile edge", () => {
  for (let cx = -6; cx < 6; cx++)
    for (let cy = -6; cy < 6; cy++)
      for (const s of [0.15, 0.3, 0.7, 0.85]) {
        // Across the right edge and the top edge, away from the midpoint.
        assert.equal(
          at(cx + 1 - 1e-7, cy + s).region,
          at(cx + 1 + 1e-7, cy + s).region,
          `${cx},${cy} right`,
        );
        assert.equal(
          at(cx + s, cy + 1 - 1e-7).region,
          at(cx + s, cy + 1 + 1e-7).region,
          `${cx},${cy} top`,
        );
      }
});

test("every curve is oriented: the flow leaves one tile where it enters the next", () => {
  for (let cx = -6; cx < 6; cx++)
    for (let cy = -6; cy < 6; cy++) {
      for (const [a, b] of [
        [
          [cx + 1 - 1e-7, cy + 0.5],
          [cx + 1 + 1e-7, cy + 0.5],
        ],
        [
          [cx + 0.5, cy + 1 - 1e-7],
          [cx + 0.5, cy + 1 + 1e-7],
        ],
      ]) {
        const p = at(...a).phi,
          q = at(...b).phi;
        // One side ends its arc (1) where the other starts (0).
        assert.ok(
          Math.abs(p - q) > 0.999 && Math.abs(p - q) < 1.001,
          `${cx},${cy}: ${p} ${q}`,
        );
      }
    }
});

test("arcs pass through every edge midpoint (no path ever ends)", () => {
  for (const b of [false, true])
    for (const m of [
      [0.5, 0],
      [1, 0.5],
      [0.5, 1],
      [0, 0.5],
    ])
      assert.ok(smith(m, [0, 0], b).d < 1e-12);
});

test("every look validates and all four tilings are covered", () => {
  for (const value of truchet.type.values)
    assert.ok(
      truchet.presets.some((p) => p.params.variant === value),
      value,
    );
  for (let i = 0; i < truchet.presets.length; i++) {
    const snapshot = presetSnapshot(truchet, i);
    assert.deepEqual(
      validateSnapshot(JSON.parse(JSON.stringify(snapshot)), [truchet]),
      snapshot,
    );
  }
});
