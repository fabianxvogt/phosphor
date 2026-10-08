import test from "node:test";
import assert from "node:assert/strict";
import { deadline } from "../../scripts/browser-runtime.mjs";

test("host watchdog rejects an evaluation that never resolves", async () => {
  await assert.rejects(
    deadline(new Promise(() => {}), 10, "telemetry poll"),
    /telemetry poll watchdog expired/,
  );
});

test("host watchdog preserves successful values and original failures", async () => {
  assert.equal(await deadline(Promise.resolve(42), 1000, "poll"), 42);
  await assert.rejects(
    deadline(Promise.reject(new Error("CDP disconnected")), 1000, "poll"),
    /CDP disconnected/,
  );
});
