import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../engine.mjs";
import scenes from "../scenes.mjs";

for (const [width, height] of [
  [1920, 1080],
  [3840, 2160],
  [5120, 2880],
]) {
  test(`every family shades at full ${width}×${height} output resolution`, () => {
    for (const scene of scenes) {
      const [w, h] = Engine.prototype.visualSize.call({ width, height }, scene);
      assert.ok(w >= width && h >= height, `${scene.id}: ${w}×${h}`);
      if (!scene.aspect) assert.deepEqual([w, h], [width, height]);
    }
  });
}
test("GPU texture limits preserve aspect instead of allocating unsupported targets", () => {
  const engine = {
    width: 10000,
    height: 5000,
    gl: { MAX_TEXTURE_SIZE: 1, getParameter: () => 8192 },
  };
  assert.deepEqual(Engine.prototype.visualSize.call(engine, {}), [8192, 4096]);
  const [w, h] = Engine.prototype.visualSize.call(engine, { aspect: 1 });
  assert.deepEqual([w, h], [8192, 8192]);
});
