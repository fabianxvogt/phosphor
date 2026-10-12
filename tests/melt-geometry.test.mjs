import test from "node:test";
import assert from "node:assert/strict";
import {
  MELT_POINTS,
  MELT_ROWS,
  MELT_BLOCK,
  updateMeltGeometry,
} from "../melt-geometry.mjs";

test("Melt block bounds contain every ribbon and tube segment across camera/phase extremes", () => {
  const data = new Float32Array(MELT_POINTS * MELT_ROWS * 4);
  const stride = MELT_POINTS * 4;
  for (const family of [0, 1, 2, 3])
    for (const thickness of [0.018, 0.14])
      for (const yaw of [-180, -65, 22, 180])
        for (const pitch of [-70, 24, 70])
          for (const phase of [0, 0.18, 0.5, 0.86]) {
            updateMeltGeometry(
              [family, thickness, 24, phase, yaw, pitch, 0, 0],
              0,
              data,
            );
            for (let strand = 0; strand < (family === 3 ? 2 : 1); strand++)
              for (let first = 0; first < 80; first += MELT_BLOCK) {
                const at = 6 * stride + (strand * 81 + first) * 4;
                const [minX, minY, maxX, maxY] = data.subarray(at, at + 4);
                assert.ok([minX, minY, maxX, maxY].every(Number.isFinite));
                for (let i = first; i < first + MELT_BLOCK; i++)
                  for (const h of [0, 0.125, 0.5, 0.875, 1])
                    for (let side = 0; side < (family < 2 ? 1 : 2); side++) {
                      const a = (strand * 81 + i) * 4;
                      const row = family < 2 ? 1 : 4 + side;
                      const x =
                        data[row * stride + a] * (1 - h) +
                        data[row * stride + a + 4] * h;
                      const y =
                        data[row * stride + a + 1] * (1 - h) +
                        data[row * stride + a + 5] * h;
                      const z = data[a + 2] * (1 - h) + data[a + 6] * h;
                      const radius =
                        family < 2 ? (thickness * 1.78) / (4.1 - z) : 0;
                      assert.ok(x - radius >= minX && x + radius <= maxX);
                      assert.ok(y - radius >= minY && y + radius <= maxY);
                    }
              }
          }
});
