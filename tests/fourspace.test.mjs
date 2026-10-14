import test from "node:test";
import assert from "node:assert/strict";
import { FOURSPACE_EDGES, fourspaceVertices } from "../scene-fourspace.mjs";
const FOURSPACE_VERTICES = [0, 1, 2, 3].map(fourspaceVertices);

for (const [shape, edges] of FOURSPACE_EDGES.entries()) {
  test(`fourspace ${shape} keeps every edge in the original pair order`, () => {
    const vertices = FOURSPACE_VERTICES[shape];
    const expected = [];
    for (let i = 0; i < vertices.length; i++)
      for (let j = i + 1; j < vertices.length; j++) {
        const squared = vertices[i].reduce(
          (sum, v, k) => sum + (v - vertices[j][k]) ** 2,
          0,
        );
        if (
          Math.abs(Math.sqrt(squared) - [2, 1.98, 1.4143, 1.2][shape]) <= 0.05
        )
          expected.push([i, j]);
      }
    assert.deepEqual(edges, expected);
    assert.equal(edges.length, [32, 24, 96, 72][shape]);
    const degree = vertices.map(
      (_, i) => edges.filter((pair) => pair.includes(i)).length,
    );
    assert.ok(degree.every((n) => n === [4, 6, 8, 4][shape]));
  });
}

test("fourspace rotations are integrated, so energy changes speed but never jumps the shape", async () => {
  const { default: scene } = await import("../scene-fourspace.mjs");
  assert.deepEqual(scene.simulation.size, [2, 1]);
  assert.match(scene.simulation.fragment, /u_dt \* rate/);
  assert.doesNotMatch(scene.fragment + scene.precompute.fragment, /t \* (spin|tumble)/);
  // Every rotation multiplier × 100 is an integer: wrapping 200π is seamless.
  for (const m of [0.5, 0.31, 0.23, 0.4, 0.27])
    assert.ok(Math.abs(m * 100 - Math.round(m * 100)) < 1e-9);
});
