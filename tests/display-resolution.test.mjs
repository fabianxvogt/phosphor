import test from "node:test";
import assert from "node:assert/strict";
import {
  nativeResolution,
  nativeDisplayResolution,
} from "../display-resolution.mjs";

test("native output preserves 4K and Retina detail without a pixel budget", () => {
  assert.deepEqual(nativeResolution(3840, 2160), [3840, 2160]);
  assert.deepEqual(nativeResolution(1512, 982, 2), [3024, 1964]);
});
test("graphics limits cap dimensions proportionally", () => {
  assert.deepEqual(
    nativeResolution(7680, 4320, 2, { width: 8192, height: 8192 }),
    [8192, 4608],
  );
  assert.deepEqual(nativeResolution(0, 0), [1, 1]);
});

test("display metadata ignores page zoom, and fallback never shrinks a 1x screen", () => {
  assert.deepEqual(
    nativeDisplayResolution({ width: 3440, height: 1440 }, 0.67),
    [3440, 1440],
  );
  assert.deepEqual(
    nativeDisplayResolution(
      { width: 1512, height: 982, devicePixelRatio: 2 },
      1.34,
    ),
    [3024, 1964],
  );
});
