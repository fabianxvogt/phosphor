import test from "node:test";
import assert from "node:assert/strict";
import { installProbes, attachFallback } from "./client.mjs";

test("fallback counts non-finite uploads and restores native uploads when counters exist", () => {
  const previousWindow = globalThis.window;
  const previousRAF = globalThis.requestAnimationFrame;
  class GL {
    uniform1f(location, value) {
      return value;
    }
    uniform1fv(location, values) {
      return values;
    }
  }
  const original = GL.prototype.uniform1f;
  try {
    globalThis.window = { WebGL2RenderingContext: GL };
    globalThis.requestAnimationFrame = () => 1;
    installProbes();
    const gl = new GL();
    assert.equal(gl.uniform1f(null, 42), 42);
    gl.uniform1f(null, NaN);
    gl.uniform1fv(null, new Float32Array([0, Infinity]));
    assert.equal(window.__harness.nonFiniteUploads, 2);
    window.__phosphor = {
      engine: { counters: { nonFinite: 0 } },
      telemetry: () => ({}),
    };
    assert.equal(attachFallback(), "contract-5");
    assert.equal(GL.prototype.uniform1f, original);
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRAF;
  }
});
