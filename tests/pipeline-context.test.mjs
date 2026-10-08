import test from "node:test";
import assert from "node:assert/strict";
import { AsyncReadback } from "../compositor.mjs";

// The GL adapter controls driver status; the public readback result is tested.
function driver(status, lost) {
  return {
    WAIT_FAILED: 1, TIMEOUT_EXPIRED: 2,
    createBuffer: () => ({}), bindBuffer() {}, bufferData() {},
    bindFramebuffer() {}, readPixels() {}, fenceSync: () => ({}), flush() {},
    clientWaitSync: () => status, isContextLost: () => lost, deleteSync() {},
    getBufferSubData() { throw new Error("Lost/failed fences must never deliver pixels"); },
  };
}

for (const [name,status,lost] of [["failed driver fence",1,false],["lost context before fence poll",0,true]]) {
  test(`${name} reports no completed GPU result`, () => {
    const gl = driver(status,false);
    const readback = new AsyncReadback(gl,4);
    readback.begin({fbo:{},w:1,h:1});
    gl.isContextLost = () => lost;
    assert.equal(readback.poll(),null);
    assert.equal(readback.poll(),null);
  });
}
