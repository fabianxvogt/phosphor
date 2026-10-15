import test from "node:test";
import assert from "node:assert/strict";
import { CatalogPanel } from "../control-catalog.mjs";

test("changing catalogue colours retains every thumbnail and queues no simulation", () => {
  let invalidated = 0,
    queued = 0,
    removed = 0;
  const panel = {
    palette: { primary: "#ffffff", secondary: "#ffffff", accent: "#ffffff" },
    cards: new Map([
      [
        "look",
        {
          snapshot: { palette: {} },
          visible: true,
          thumb: {
            querySelector: () => ({ remove: () => removed++ }),
            style: {},
          },
        },
      ],
    ]),
    thumbnails: { invalidate: () => invalidated++, want: () => queued++ },
    paletteMatrix: { setAttribute() {} },
  };
  const colors = {
    primary: "#ff8800",
    secondary: "#88ccff",
    accent: "#223344",
  };
  CatalogPanel.prototype.setPalette.call(panel, colors);
  assert.equal(
    invalidated,
    0,
    "a colour edit must not invalidate the simulated image",
  );
  assert.equal(queued, 0, "a colour edit must not enqueue a simulation");
  assert.equal(removed, 0, "existing thumbnail stays visible");
  assert.deepEqual(panel.cards.get("look").snapshot.palette, colors);
});

test("basis palette is an identity transform and black stays black", async () => {
  const { paletteMatrix, THUMBNAIL_PALETTE } =
    await import("../thumbnail-palette.mjs");
  assert.equal(
    paletteMatrix(THUMBNAIL_PALETTE),
    "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0",
  );
});

test("every released look has a matching baked preview; wave-4 bakes wait for integration", async () => {
  const { PREVIEWS } = await import("../catalog-previews.mjs");
  const { default: scenes } = await import("../scenes.mjs");
  const { catalogLooks } = await import("../catalog.mjs");
  const { thumbnailKey } = await import("../thumbnail-palette.mjs");
  const looks = catalogLooks(scenes);
  // Wave-4 lane brief forbids editing generated previews: L0 bakes all five
  // families together. Only the assigned 101–105 range may be pending.
  const baked = looks.filter((look) => Object.hasOwn(PREVIEWS, look.id));
  const pending = looks.filter((look) => !Object.hasOwn(PREVIEWS, look.id));
  assert.equal(Object.keys(PREVIEWS).length, baked.length, "no orphan previews");
  for (const look of pending)
    assert.ok(look.number >= 101 && look.number <= 105, `unbaked released look: ${look.id}`);
  for (const look of baked) {
    const preview = PREVIEWS[look.id];
    assert.ok(preview, look.id);
    assert.equal(preview.key, thumbnailKey(look.snapshot), look.id);
    assert.match(preview.url, /^data:image\/webp;base64,/, look.id);
  }
});
