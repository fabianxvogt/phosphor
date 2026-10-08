import test from "node:test";
import assert from "node:assert/strict";
import { reduceSeed } from "../scene-contract.mjs";

test("float seeds preserve authored seeds and reduce full-range seeds exactly", () => {
  assert.equal(reduceSeed(5606), 5606);
  assert.equal(reduceSeed(2147483647), 8191);
  assert.equal(reduceSeed(8192), 0);
  assert.notEqual(reduceSeed(100000001), reduceSeed(100000002));
});
