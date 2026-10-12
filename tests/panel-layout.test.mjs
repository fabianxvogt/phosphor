import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultPanelLayout,
  validatePanelLayout,
  resizeDesktop,
  resizePortrait,
  portraitLimits,
  panelGeometry,
  readPanelLayout,
  savePanelLayout,
  PANEL_LAYOUT_KEY,
} from "../panel-layout.mjs";

test("each layout keeps independent preferences and storage failures are harmless", () => {
  const state = defaultPanelLayout();
  resizeDesktop(state, "split", 50);
  resizeDesktop(state, "lower", 750);
  state.portrait.weights[4] = 3;
  const values = new Map(),
    storage = {
      getItem: (key) => values.get(key),
      setItem: (key, value) => values.set(key, value),
    };
  assert.equal(savePanelLayout(storage, state), true);
  assert.deepEqual(readPanelLayout(storage), state);
  assert.equal(values.size, 1);
  assert.ok(values.has(PANEL_LAYOUT_KEY));
  assert.deepEqual(readPanelLayout(undefined), defaultPanelLayout());
  assert.equal(savePanelLayout(undefined, state), false);
  storage.setItem(PANEL_LAYOUT_KEY, "{broken");
  assert.deepEqual(readPanelLayout(storage), defaultPanelLayout());
});

test("invalid persisted coordinates cannot invert or collapse frame segments", () => {
  const state = validatePanelLayout({
    version: 1,
    desktop: { split: Infinity, seams: [999999, -10, -40] },
    portrait: { weights: [null, NaN, "3", -100, 99999] },
  });
  assert.equal(state.desktop.split, 66);
  assert.deepEqual(state.desktop.seams, [440, 420, 750]);
  assert.deepEqual(state.portrait.weights, [1, 1, 1, 0.01, 100]);
  assert.deepEqual(validatePanelLayout({ version: 900 }), defaultPanelLayout());
});

test("Rhythm can occupy over sixty percent without changing the left column", () => {
  const state = defaultPanelLayout();
  resizeDesktop(state, "left", 1400);
  resizeDesktop(state, "lower", 750);
  assert.deepEqual(state.desktop.seams, [440, 1400, 750]);
  const { panels } = panelGeometry(1585, 992, state);
  const usable = panels[4].top + panels[4].height - panels[2].top;
  assert.ok(panels[4].height / usable > 0.6);
  resizeDesktop(state, "upper", 1200);
  assert.deepEqual(state.desktop.seams, [1200, 1400, 1510]);
});

test("portrait dividers share the viewport and let Rhythm take space from earlier panels", () => {
  const state = defaultPanelLayout(),
    before = panelGeometry(390, 844, state);
  const current = before.gaps.slice(0, 4).reduce((a, b) => a + b, 0);
  resizePortrait(state, before, 3, current - 140);
  const after = panelGeometry(390, 844, state);
  assert.equal(after.height, 844);
  assert.ok(
    Math.abs(after.panels[4].height - before.panels[4].height - 140) < 1e-8,
  );
  assert.ok(after.panels[3].height < before.panels[3].height);
  assert.ok(after.panels[2].height < before.panels[2].height);
  assert.equal(after.headerHeight, before.headerHeight);
  assert.deepEqual(after.footer, before.footer);
  assert.deepEqual(state.desktop, defaultPanelLayout().desktop);
  assert.deepEqual(validatePanelLayout(state), state);
  for (let seam = 0; seam < 4; seam++) {
    for (const direction of [0, 1]) {
      const g = panelGeometry(390, 844, state);
      resizePortrait(state, g, seam, portraitLimits(g, seam)[direction]);
      const resized = panelGeometry(390, 844, state);
      assert.equal(resized.height, 844);
      assert.ok(resized.gaps.every((gap) => gap >= resized.minGap - 1e-8));
      const sum = resized.gaps.slice(0, seam + 1).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - portraitLimits(g, seam)[direction]) < 1e-8);
    }
  }
});

test("every extreme layout has ordered patches, bounded openings, and rigid junctions", () => {
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [1099, 850],
    [1100, 650],
    [1366, 768],
    [1280, 1440],
    [1920, 1080],
    [2560, 1080],
  ]) {
    for (const split of [30, 66, 78])
      for (const left of [420, 875, 1510])
        for (const upper of [440, 1200])
          for (const lower of [750, 1510]) {
            const state = defaultPanelLayout();
            resizeDesktop(state, "split", split);
            resizeDesktop(state, "left", left);
            resizeDesktop(state, "upper", upper);
            resizeDesktop(state, "lower", lower);
            state.portrait.weights = [0.15, 8, 1, 0.15, 8];
            const g = panelGeometry(width, height, state);
            assert.equal(g.height, height);
            for (const map of g.maps) {
              for (const axis of ["sx", "sy", "dx", "dy"])
                for (let i = 1; i < map[axis].length; i++)
                  assert.ok(map[axis][i] > map[axis][i - 1], axis);
              // Fixed bands include the whole rounding; these must never stretch with a divider.
              for (
                let i = g.mode === "portrait" ? 2 : 0;
                i < map.sy.length - 2;
                i += 2
              )
                assert.ok(
                  Math.abs(
                    (map.dy[i + 1] - map.dy[i]) / (map.sy[i + 1] - map.sy[i]) -
                      g.ys,
                  ) < 1e-8,
                );
            }
            for (const p of g.panels) {
              assert.ok(p.width > 100 && p.height > 45);
              assert.ok(
                p.left >= 0 &&
                  p.top >= 0 &&
                  p.left + p.width <= width &&
                  p.top + p.height <= g.height,
              );
            }
          }
  }
});
