import test from "node:test";
import assert from "node:assert/strict";
import { createCapture } from "../ui-capture.mjs";
import { initialSession } from "../session.mjs";
import scenes from "../scenes.mjs";

test("R10 frame export leaves saved, stale-window and error readouts intact", async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const dir = {
    getFileHandle: async () => ({
      createWritable: async () => ({
        write: async () => {},
        close: async () => {},
      }),
    }),
  };
  globalThis.window = {
    showDirectoryPicker: async () => ({ getDirectoryHandle: async () => dir }),
  };
  globalThis.document = {
    createElement: () => ({
      toBlob: (callback) => callback(new Blob(["PNG"])),
    }),
  };
  try {
    for (const readout of [
      "Saved locally · 12:00",
      "Another window saved · autosave paused",
      "Not saved · export your set",
    ]) {
      const elements = {
        saveReadout: { textContent: readout },
        cancelExportButton: { hidden: true },
        exportProgress: { textContent: "", hidden: true },
      };
      let disposed = false,
        flushed = false;
      const capture = createCapture({
        $: (id) => elements[id],
        getSession: () => initialSession(scenes),
        toast: () => {},
        flush: () => {
          flushed = true;
          return false;
        },
        createRenderer: () => ({
          slots: [{ warmTicks: 0 }],
          resize() {},
          load() {},
          advance() {},
          dispose() {
            disposed = true;
          },
        }),
      });
      await capture.renderFrames();
      assert.equal(elements.saveReadout.textContent, readout);
      assert.equal(elements.exportProgress.hidden, true);
      assert.equal(elements.exportProgress.textContent, "");
      assert.equal(disposed, true);
      assert.equal(flushed, true);
      assert.equal(capture.exporting, false);
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
