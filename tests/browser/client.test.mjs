import test from "node:test";
import assert from "node:assert/strict";
import { installProbes, attachFallback, readTelemetry } from "./client.mjs";

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

test("fallback drains samples and never loses GPU errors read before native polling", () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  try {
    globalThis.window = {};
    globalThis.document = {
      getElementById: () => ({ textContent: "Pause score" }),
      querySelector: () => null,
    };
    installProbes();
    window.__harness.frameIntervalsMs.push(10, 20);
    window.__harness.cuePrepMs.push(25);
    const errors = [1280, 0];
    window.__phosphor = {
      getSession: () => ({ options: { quality: "balanced" } }),
      engine: {
        counters: { gpuErrors: 3, nonFinite: 0 },
        gl: { getError: () => errors.shift() },
        stats: () => ({ slots: 1, textures: 5 }),
      },
    };
    const first = readTelemetry();
    assert.equal(first.gpuErrors, 4);
    assert.deepEqual(first.frameIntervalsMs, [10, 20]);
    assert.deepEqual(first.cuePrepMs, [25]);
    const second = readTelemetry();
    assert.equal(second.gpuErrors, 4);
    assert.deepEqual(second.frameIntervalsMs, []);
    assert.deepEqual(second.cuePrepMs, []);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});
