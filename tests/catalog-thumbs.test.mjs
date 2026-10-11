import test from "node:test";
import assert from "node:assert/strict";
import { Thumbnails } from "../catalog-thumbs.mjs";

function harness(t) {
  const idle = [],
    encoders = [],
    loaded = [],
    ready = [];
  for (const key of ["document", "requestIdleCallback"]) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
  globalThis.requestIdleCallback = (callback) => idle.push(callback);
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ drawImage() {} }),
      toBlob: (callback) => encoders.push(callback),
    }),
  };
  const engine = {
    options: {},
    slots: [{ warmTicks: 0 }],
    resize() {},
    setLevel() {},
    updatePerformance() {},
    advance() {},
    present() {},
    load(snapshot) {
      loaded.push(snapshot);
    },
    ready() {
      return Promise.resolve(true);
    },
  };
  const thumbnails = new Thumbnails({
    createEngine: () => engine,
    onReady: (id) => ready.push(id),
  });
  const drain = async () => {
    for (let i = 0; i < 200; i++) {
      await Promise.resolve();
      const callback = idle.shift();
      if (!callback) return;
      callback({ timeRemaining: () => 10 });
    }
    assert.fail("thumbnail work did not settle");
  };
  t.after(() => {
    for (const id of thumbnails.cache.keys()) thumbnails.invalidate(id);
  });
  return { thumbnails, engine, encoders, loaded, ready, drain };
}

test("invalidated asynchronous encodes cannot restore stale own-look thumbnails", async (t) => {
  const h = harness(t);
  h.thumbnails.want("own:1", { scene: "test", seed: 1 });
  await h.drain();
  h.thumbnails.want("own:1", { scene: "test", seed: 1 });
  await h.drain();
  assert.equal(h.encoders.length, 1, "encoding requests are deduplicated");
  h.thumbnails.invalidate("own:1");
  h.thumbnails.want("own:1", { scene: "test", seed: 2 });
  await h.drain();
  h.encoders[0](new Blob(["old"]));
  assert.equal(h.thumbnails.get("own:1"), null);
  assert.deepEqual(h.ready, []);
  h.encoders[1](new Blob(["new"]));
  assert.ok(h.thumbnails.get("own:1").url);
  assert.deepEqual(
    h.loaded.map((s) => s.seed),
    [1, 2],
  );
  assert.deepEqual(h.ready, ["own:1"]);
});

test("invalidating a compiling variation cancels it without disturbing its replacement", async (t) => {
  const h = harness(t);
  let complete;
  h.engine.ready = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  h.thumbnails.want("variation:1", { scene: "test", seed: 1 });
  await h.drain();
  h.thumbnails.invalidate("variation:1");
  h.engine.ready = () => Promise.resolve(true);
  h.thumbnails.want("variation:1", { scene: "test", seed: 2 });
  complete(true);
  await h.drain();
  assert.equal(h.encoders.length, 1);
  h.encoders[0](new Blob(["new"]));
  assert.deepEqual(h.ready, ["variation:1"]);
  assert.equal(h.thumbnails.requests.size, 0);
});

test("a forgotten queued card can be requested again", async (t) => {
  const h = harness(t);
  h.thumbnails.want("look", { scene: "test", seed: 1 });
  h.thumbnails.forget("look");
  h.thumbnails.want("look", { scene: "test", seed: 2 });
  await h.drain();
  assert.deepEqual(
    h.loaded.map((s) => s.seed),
    [2],
  );
});

test("cancelling compilation keeps already queued catalog work running", async (t) => {
  const h = harness(t);
  let complete;
  h.engine.ready = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  h.thumbnails.want("variation", { scene: "test", seed: 1 });
  h.thumbnails.want("catalog", { scene: "test", seed: 2 });
  await h.drain();
  h.thumbnails.invalidate("variation");
  h.engine.ready = () => Promise.resolve(true);
  complete(true);
  await h.drain();
  assert.deepEqual(
    h.loaded.map((snapshot) => snapshot.seed),
    [1, 2],
  );
  assert.equal(h.encoders.length, 1);
  h.encoders[0](new Blob(["catalog"]));
  assert.deepEqual(h.ready, ["catalog"]);
});
