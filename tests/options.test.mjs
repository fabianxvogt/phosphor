import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { initialSession, validateSession } from "../session.mjs";
test("contract 3 old v2 sets receive optional effect defaults and reject invalid new values", () => {
  const session = initialSession(scenes);
  assert.equal(session.options.flashLimit, true);
  assert.equal(session.options.echo, 0);
  assert.equal(session.options.chroma, 0);
  for (const key of ["flashLimit", "echo", "chroma"])
    delete session.options[key];
  assert.deepEqual(
    validateSession(session, scenes).options,
    initialSession(scenes).options,
  );
  for (const [key, value] of [
    ["flashLimit", 1],
    ["echo", 2],
    ["chroma", -0.1],
  ]) {
    const bad = structuredClone(session);
    bad.options[key] = value;
    assert.throws(() => validateSession(bad, scenes));
  }
});
