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
  // Version 1 right seams fitted the old minimums; they return to the content split.
  assert.deepEqual(state.desktop.seams, [null, 420, null]);
  assert.deepEqual(state.portrait.weights, [1, 1, 1, 0.01, 100]);
  assert.deepEqual(
    validatePanelLayout({
      version: 2,
      desktop: { split: 50, seams: [999999, -10, -40] },
    }).desktop.seams,
    [440, 420, 750],
  );
  assert.deepEqual(
    validatePanelLayout({ version: 2, desktop: { seams: [800, 875, NaN] } })
      .desktop.seams,
    [null, 875, null],
  );
  assert.deepEqual(validatePanelLayout({ version: 900 }), defaultPanelLayout());
});

test("Rhythm can occupy over sixty percent without changing the left column", () => {
  const state = defaultPanelLayout();
  resizeDesktop(state, "left", 1400);
  resizeDesktop(state, "lower", 750);
  assert.deepEqual(state.desktop.seams, [440, 1400, 750]);
  const { panels } = panelGeometry(1585, 3000, state);
  const usable = panels[4].top + panels[4].height - panels[2].top;
  assert.ok(panels[4].height / usable > 0.6);
  resizeDesktop(state, "upper", 1200);
  assert.deepEqual(state.desktop.seams, [1200, 1400, 1510]);
});

test("portrait dividers share available space without shrinking panels below their minimum", () => {
  const state = defaultPanelLayout(),
    before = panelGeometry(390, 3200, state);
  const current = before.gaps.slice(0, 4).reduce((a, b) => a + b, 0);
  // Performance gives everything down to its minimum, then Look gives 40px.
  const delta = before.gaps[3] - before.minGaps[3] + 40;
  resizePortrait(state, before, 3, current - delta);
  const after = panelGeometry(390, 3200, state);
  assert.equal(after.height, 3200);
  assert.ok(
    Math.abs(after.panels[4].height - before.panels[4].height - delta) < 1e-8,
  );
  assert.ok(after.panels[3].height < before.panels[3].height);
  assert.ok(after.panels[2].height < before.panels[2].height);
  assert.equal(after.headerHeight, before.headerHeight);
  assert.deepEqual(after.footer, before.footer);
  assert.deepEqual(state.desktop, defaultPanelLayout().desktop);
  assert.deepEqual(validatePanelLayout(state), state);
  for (let seam = 0; seam < 4; seam++) {
    for (const direction of [0, 1]) {
      const g = panelGeometry(390, 3200, state);
      resizePortrait(state, g, seam, portraitLimits(g, seam)[direction]);
      const resized = panelGeometry(390, 3200, state);
      assert.equal(resized.height, 3200);
      assert.ok(
        resized.gaps.every((gap, i) => gap >= resized.minGaps[i] - 1e-8),
      );
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
            assert.ok(g.height >= height);
            for (const map of g.maps) {
              for (const axis of ["sx", "sy", "dx", "dy"])
                for (let i = 1; i < map[axis].length; i++)
                  assert.ok(map[axis][i] > map[axis][i - 1], axis);
              // Fixed bands include the whole rounding; these must never stretch with a divider.
              for (
                let i = g.mode === "portrait" ? 1 : 0;
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
            for (const [i, p] of g.panels.entries()) {
              assert.ok(p.width > 100 && p.height > 45);
              assert.ok(
                p.height >= g.minimums[i] - 1e-7,
                `${width}x${height}, ${g.mode}, panel ${i}: ${p.height} < ${g.minimums[i]}, seams ${g.seams}`,
              );
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

test("short screens scroll at readable panel heights; tall screens fill the viewport", () => {
  for (const width of [320, 390, 950, 1440, 1920]) {
    const state = defaultPanelLayout();
    const short = panelGeometry(width, 500, state);
    assert.ok(short.height > 500);
    for (const [i, panel] of short.panels.entries())
      assert.ok(panel.height >= short.minimums[i] - 1e-7);
    const tall = panelGeometry(width, 4000, state);
    assert.equal(tall.height, 4000);
    assert.ok(tall.panels.at(-1).top + tall.panels.at(-1).height > 3800);
    assert.deepEqual(
      state,
      defaultPanelLayout(),
      "viewport adaptation does not overwrite saved preferences",
    );
  }
});

test("resizing one desktop column preserves the other column's saved preferences", () => {
  const state = defaultPanelLayout();
  state.desktop.seams = [440, 875, 750];
  let geometry = panelGeometry(1440, 768, state);
  resizeDesktop(state, "left", geometry.seams[1] + 10, geometry);
  assert.deepEqual(state.desktop.seams, [440, 885, 750]);
  const tall = panelGeometry(1440, 4000, state);
  assert.equal(tall.seams[0], 440);
  assert.equal(tall.seams[2], 750);
  geometry = panelGeometry(1440, 768, state);
  resizeDesktop(state, "upper", geometry.limits.upper[1], geometry);
  assert.equal(state.desktop.seams[1], 885);
  assert.ok(
    panelGeometry(1440, 768, state).panels.every(
      (panel, i) => panel.height >= geometry.minimums[i] - 1e-7,
    ),
  );
});

test("right-column dividers always have room and the default split stretches evenly", () => {
  for (const [width, height] of [
    [1100, 650],
    [1250, 900],
    [1366, 768],
    [1440, 790],
    [1920, 1080],
    [2560, 1440],
  ]) {
    const g = panelGeometry(width, height, defaultPanelLayout());
    for (const key of ["upper", "lower"]) {
      const [min, max] = g.limits[key];
      assert.ok(
        (max - min) * g.ys > 80,
        `${width}x${height} ${key}: ${(max - min) * g.ys}px`,
      );
    }
    // Look, Performance and Rhythm share the column by content, not by fixed seams.
    const stretch = [2, 3, 4].map((i) => g.panels[i].height / g.minimums[i]);
    assert.ok(
      Math.max(...stretch) - Math.min(...stretch) < 1e-6,
      `${width}x${height}: ${stretch}`,
    );
  }
});

test("dragging a right divider grows one panel and is undone by the auto split", () => {
  const state = defaultPanelLayout(),
    before = panelGeometry(1250, 900, state);
  resizeDesktop(state, "lower", before.seams[2] - 150, before);
  const after = panelGeometry(1250, 900, state);
  assert.equal(after.height, before.height);
  assert.ok(after.panels[4].height > before.panels[4].height + 50);
  assert.ok(
    after.panels.every((panel, i) => panel.height >= after.minimums[i] - 1e-7),
  );
  state.desktop.seams[0] = state.desktop.seams[2] = null;
  assert.deepEqual(panelGeometry(1250, 900, state).seams, before.seams);
});

test("the frame keeps one scale for corners and bars in both directions", () => {
  for (const [width, height] of [
    [1250, 900],
    [1440, 790],
    [1920, 1080],
    [2560, 1080],
    [3440, 1440],
    [390, 844],
    [938, 1300],
  ]) {
    const g = panelGeometry(width, height, defaultPanelLayout());
    if (g.mode === "portrait") {
      const [{ sx, dx }] = g.maps;
      // Both side bands keep the frame scale; only the bar middles stretch.
      for (const i of [0, sx.length - 2])
        assert.ok(
          Math.abs((dx[i + 1] - dx[i]) / (sx[i + 1] - sx[i]) - g.ys) < 1e-9,
        );
      // Wide one-column windows keep a modest frame instead of zooming it.
      assert.ok(g.ys <= 0.55 + 1e-9);
      continue;
    }
    assert.ok(Math.abs(g.xs - g.ys) < 1e-9, `${width}x${height}`);
    // Outer bars and the column junction are fixed bands at that scale.
    for (const { sx, dx } of g.maps)
      for (let i = 0; i < sx.length - 1; i++)
        if ([135, 260, 12, 235, 132].includes(Math.round(sx[i + 1] - sx[i])))
          assert.ok(
            Math.abs((dx[i + 1] - dx[i]) / (sx[i + 1] - sx[i]) - g.xs) < 1e-9,
          );
  }
});
