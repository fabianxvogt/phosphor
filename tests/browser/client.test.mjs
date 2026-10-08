import test from "node:test";
import assert from "node:assert/strict";
import { installProbes } from "./client.mjs";

test("probes count non-finite uniform uploads without changing results", () => {
  const previousWindow = globalThis.window;
  class GL {
    uniform1f(location, value) {
      return value;
    }
    uniform1fv(location, values) {
      return values;
    }
  }
  try {
    globalThis.window = { WebGL2RenderingContext: GL };
    installProbes();
    const gl = new GL();
    assert.equal(gl.uniform1f(null, 42), 42);
    gl.uniform1f(null, NaN);
    gl.uniform1fv(null, new Float32Array([0, Infinity]));
    assert.equal(window.__harness.nonFiniteUploads, 2);
  } finally {
    globalThis.window = previousWindow;
  }
});
