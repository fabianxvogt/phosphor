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

test("baked catalogue previews match every curated look; new families may await integration", async () => {
  const { PREVIEWS } = await import("../catalog-previews.mjs");
  const { default: scenes } = await import("../scenes.mjs");
  const { catalogLooks } = await import("../catalog.mjs");
  const { thumbnailKey } = await import("../thumbnail-palette.mjs");
  const { CURATED } = await import("../catalog-curated.mjs");
  const looks = catalogLooks(scenes);
  // Family lanes must not rewrite shared bakes or editorial data. Keep the
  // complete shipped artifact gate, but exercise unbaked additions through
  // the existing runtime fallback until the integration bake.
  assert.deepEqual(Object.keys(PREVIEWS).sort(), [...CURATED].sort());
  for (const id of Object.keys(PREVIEWS)) {
    const look = looks.find((look) => look.id === id);
    assert.ok(look, `no stale baked look: ${id}`);
    const preview = PREVIEWS[look.id];
    assert.equal(preview.key, thumbnailKey(look.snapshot), look.id);
    assert.match(preview.url, /^data:image\/webp;base64,/, look.id);
  }
  for (const scene of scenes) {
    const count = scene.presets.filter(
      (p) => PREVIEWS[`${scene.id}:${p.name}`],
    ).length;
    assert.ok(
      count === scene.presets.length ||
        (count === 0 && scene.number >= 101 && scene.development),
      `${scene.id}: shipped families stay complete; only new continuous worlds await integration`,
    );
  }
});
