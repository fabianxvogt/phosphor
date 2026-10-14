// UI preferences are independent of the exported set and of the Stage.
export const PANEL_LAYOUT_KEY = "phosphor-panel-layout-v1";
export const PANEL_NAMES = [
  "preview",
  "catalog",
  "look",
  "performance",
  "rhythm",
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
// Null right-column seams share that column in proportion to each panel's
// content, so Look, Performance and Rhythm stretch by the same factor.
// AUTO_SEAMS only stands in when such a seam is edited without geometry.
const AUTO_SEAMS = [755, 1300];
export function defaultPanelLayout() {
  return {
    version: 2,
    desktop: { split: 66, seams: [null, 875, null] },
    portrait: { weights: [1, 1, 1, 1, 1] },
  };
}
export function validatePanelLayout(value) {
  const result = defaultPanelLayout();
  if (value?.version !== 1 && value?.version !== 2) return result;
  result.desktop.split = clamp(finite(value.desktop?.split, 66), 30, 78);
  const seams = value.desktop?.seams;
  if (Array.isArray(seams) && seams.length === 3) {
    result.desktop.seams[1] = clamp(finite(seams[1], 875), 420, 1510);
    // Version 1 right seams were sized for the old, oversized minimums.
    if (
      value.version === 2 &&
      Number.isFinite(seams[0]) &&
      Number.isFinite(seams[2])
    ) {
      const lower = clamp(seams[2], 750, 1510);
      result.desktop.seams[0] = clamp(seams[0], 440, lower - 310);
      result.desktop.seams[2] = lower;
    }
  }
  const weights = value.portrait?.weights;
  if (Array.isArray(weights) && weights.length === 5)
    result.portrait.weights = weights.map((v) =>
      clamp(finite(v, 1), 0.01, 100),
    );
  return result;
}
export function readPanelLayout(storage) {
  try {
    return validatePanelLayout(JSON.parse(storage.getItem(PANEL_LAYOUT_KEY)));
  } catch {
    return defaultPanelLayout();
  }
}
export function savePanelLayout(storage, layout) {
  try {
    storage.setItem(
      PANEL_LAYOUT_KEY,
      JSON.stringify(validatePanelLayout(layout)),
    );
    return true;
  } catch {
    return false;
  }
}
export function desktopLimits(key) {
  return {
    split: [30, 78],
    left: [420, 1510],
    upper: [440, 1200],
    lower: [750, 1510],
  }[key];
}
export function resizeDesktop(layout, key, value, geometry) {
  if (!desktopLimits(key) || !Number.isFinite(value)) return;
  const v = clamp(value, ...(geometry?.limits[key] ?? desktopLimits(key)));
  if (key === "split") layout.desktop.split = v;
  else {
    const seams = layout.desktop.seams;
    if (key !== "left") {
      seams[0] = geometry?.seams[0] ?? seams[0] ?? AUTO_SEAMS[0];
      seams[2] = geometry?.seams[2] ?? seams[2] ?? AUTO_SEAMS[1];
    }
    seams[{ upper: 0, left: 1, lower: 2 }[key]] = v;
    // Once the adjacent panel reaches its minimum, move the next divider too.
    const gap = geometry?.desktopGap ?? 310;
    if (key === "upper") seams[2] = Math.max(seams[2], v + gap);
    if (key === "lower") seams[0] = Math.min(seams[0], v - gap);
  }
}
export function mapCoordinate(value, source, target) {
  for (let i = 0; i < source.length - 1; i++)
    if (value <= source[i + 1])
      return (
        target[i] +
        ((value - source[i]) / (source[i + 1] - source[i])) *
          (target[i + 1] - target[i])
      );
  return target.at(-1);
}
export function portraitLimits(geometry, seam) {
  return [
    geometry.minGaps.slice(0, seam + 1).reduce((sum, gap) => sum + gap, 0),
    geometry.gaps.reduce((sum, gap) => sum + gap, 0) -
      geometry.minGaps.slice(seam + 1).reduce((sum, gap) => sum + gap, 0),
  ];
}
export function resizePortrait(layout, geometry, seam, value) {
  if (
    !Number.isInteger(seam) ||
    seam < 0 ||
    seam > 3 ||
    !Number.isFinite(value)
  )
    return;
  const gaps = [...geometry.gaps];
  const current = gaps.slice(0, seam + 1).reduce((sum, gap) => sum + gap, 0);
  const delta = clamp(value, ...portraitLimits(geometry, seam)) - current;
  // Move the neighboring divider too once a panel reaches its minimum.
  // Keep each donor's readable minimum while sharing the available space.
  let remaining = Math.abs(delta);
  const donors =
    delta > 0
      ? Array.from({ length: 4 - seam }, (_, i) => seam + 1 + i)
      : Array.from({ length: seam + 1 }, (_, i) => seam - i);
  for (const i of donors) {
    const take = Math.min(
      remaining,
      Math.max(0, gaps[i] - geometry.minGaps[i]),
    );
    gaps[i] -= take;
    remaining -= take;
  }
  gaps[delta > 0 ? seam : seam + 1] += Math.abs(delta) - remaining;
  layout.portrait.weights = gaps.map((gap, i) => gap / geometry.bases[i]);
}
const desktopRects = [
  [36.864, 111.592, 1976.832, 748.436],
  [36.864, 883.116, 1976.832, 929.292],
  [2055.168, 111.592, 983.04, 642.616],
  [2055.168, 771.524, 983.04, 517.556],
  [2055.168, 1310.244, 983.04, 502.164],
];
const portraitRects = [
  [30.72, 116.736, 962.56, 540.672],
  [30.72, 675.84, 962.56, 685.056],
  [30.72, 1382.4, 962.56, 574.464],
  [30.72, 1975.296, 962.56, 396.288],
  [30.72, 2390.016, 962.56, 546.816],
];
function mappedRect(rect, xMap, yMap) {
  const [x, y, width, height] = rect,
    left = xMap(x),
    top = yMap(y);
  return {
    left,
    top,
    width: xMap(x + width) - left,
    height: yMap(y + height) - top,
  };
}
// Mirrors --ui-scale in control-chassis.css: desktop panel contents zoom with it.
export function uiScale(width, viewportHeight) {
  return clamp(
    Math.min(width / 1585, Math.max(850, viewportHeight) / 992),
    0.78,
    1.6,
  );
}
// Comfortable working space, including headings, faders and the setup strip,
// measured from the uncompacted contents at --ui-scale 1. Narrow controls wrap
// onto extra rows; the catalog itself remains scrollable.
function panelMinimums(widths, scale = 1) {
  return [
    240,
    widths[1] < 500 ? 460 : 360,
    // Below ~580px the faders stack their labels (a 500px content box).
    (widths[2] < 380 ? 420 : widths[2] < 580 ? 370 : 305) * scale,
    (widths[3] < 580 ? 330 : 275) * scale,
    275 * scale,
  ];
}
// The window fits the comfortable contents; dividers may still squeeze a
// right-hand panel to 70%, which then scrolls, so space can always move.
const squeezed = (comfort) =>
  comfort.map((min, i) => (i < 2 ? min : min * 0.7));
function fittingHeight(viewport, fits) {
  if (fits(viewport)) return viewport;
  let low = viewport,
    high = Math.max(1024, viewport * 2);
  while (!fits(high)) high *= 2;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) high = mid;
    else low = mid;
  }
  return Math.ceil(high);
}
const desktopFooter = (height) => clamp(height * 0.055, 44, 56);
function desktopBounds(height, minimums) {
  const ys = (height - desktopFooter(height)) / 1818;
  // The fixed corner bands leave these offsets around the authored openings.
  const gap = Math.max(310, minimums[3] / ys + 27.444);
  const upperMin = Math.max(440, minimums[2] / ys + 112.384);
  const lowerMax = Math.min(1510, 1802.164 - minimums[4] / ys);
  return {
    gap,
    limits: {
      split: desktopLimits("split"),
      left: [
        Math.max(420, minimums[0] / ys + 126.564),
        Math.min(1510, 1804.292 - minimums[1] / ys),
      ],
      upper: [upperMin, Math.min(1200, lowerMax - gap)],
      lower: [Math.max(750, upperMin + gap), lowerMax],
    },
  };
}
// One-column art keeps one modest scale in both directions. Only the straight
// stretches vary: the side bars between panels, the middle of every
// horizontal bar, and the flat top of the header plate.
const portraitScale = (width) => Math.min(width / 1024, 0.55);
const portraitSx = [0, 180, 690, 1024];
function portraitBands(height, ys, minimums) {
  const headerHeight = clamp(116.736 * ys, 72, 96),
    footerHeight = Math.max(48, 132 * ys),
    firstBand = headerHeight + 83.264 * ys,
    available = height - firstBand - 1140 * ys - footerHeight;
  const rigid = [
    200.672 * ys,
    230.056 * ys,
    234.464 * ys,
    231.288 * ys,
    246.816 * ys,
  ];
  const minGaps = minimums.map((min, i) => Math.max(24, min - rigid[i]));
  return { ys, headerHeight, footerHeight, firstBand, available, minGaps };
}
export function panelGeometry(
  width,
  viewportHeight,
  state,
  mode = width >= 1100 ? "desktop" : "portrait",
) {
  if (mode === "desktop") {
    const c = (width * state.desktop.split) / 100;
    // Corners, outer bars and junctions keep the vertical scale, so the frame
    // never distorts; only the straight column stretches absorb the width.
    // The 1.5 cap keeps every stretch open at the split extremes.
    const fixedScale = (h) =>
      Math.min((h - desktopFooter(h)) / 1818, (1.5 * width) / 3072);
    const sx = [0, 135, 1770, 2030, 2265, 2940, 3072];
    const xMapFor = (xs) => (v) =>
      mapCoordinate(v, sx, [
        0,
        135 * xs,
        c - 260 * xs,
        c,
        c + 235 * xs,
        width - 132 * xs,
        width,
      ]);
    const viewportMap = xMapFor(fixedScale(viewportHeight));
    const comfort = panelMinimums(
        desktopRects.map(([x, , w]) => viewportMap(x + w) - viewportMap(x)),
        uiScale(width, viewportHeight),
      ),
      minimums = squeezed(comfort);
    const height = fittingHeight(viewportHeight, (h) =>
      Object.values(desktopBounds(h, comfort).limits).every(
        ([min, max]) => min <= max,
      ),
    );
    const footerHeight = desktopFooter(height),
      ys = (height - footerHeight) / 1818,
      xs = fixedScale(height),
      xMap = xMapFor(xs);
    const { limits, gap } = desktopBounds(height, minimums);
    let [upperSeam, , lowerSeam] = state.desktop.seams;
    if (upperSeam == null || lowerSeam == null) {
      // Content openings: Look (upper - 112.384), Performance
      // (lower - upper - 27.444) and Rhythm (1802.164 - lower), in frame units.
      const share = (1662.336 * ys) / (comfort[2] + comfort[3] + comfort[4]);
      upperSeam = 112.384 + (comfort[2] * share) / ys;
      lowerSeam = 1802.164 - (comfort[4] * share) / ys;
    }
    const lower = clamp(lowerSeam, ...limits.lower),
      upper = clamp(
        upperSeam,
        limits.upper[0],
        Math.min(limits.upper[1], lower - gap),
      ),
      left = clamp(state.desktop.seams[1], ...limits.left);
    const ySources = [
      [0, 260, 730, 1020, 1680, 1818, 1924],
      [0, 260, 620, 920, 1180, 1450, 1680, 1818, 1924],
    ];
    const yTargets = [
      [0, 260, left - 145, left + 145, 1680, 1818],
      [0, 260, upper - 135, upper + 165, lower - 120, lower + 150, 1680, 1818],
    ].map((row) => [...row.map((v) => v * ys), height]);
    const panels = desktopRects.map((rect, i) =>
      mappedRect(rect, xMap, (v) =>
        mapCoordinate(v, ySources[i < 2 ? 0 : 1], yTargets[i < 2 ? 0 : 1]),
      ),
    );
    const leftCenter = panels[0].left + panels[0].width / 2,
      rightCenter = panels[2].left + panels[2].width / 2;
    return {
      mode,
      width,
      height,
      xs,
      ys,
      minimums,
      comfort,
      limits,
      seams: [upper, left, lower],
      desktopGap: gap,
      headerHeight: 111.592 * ys,
      center: c,
      panels,
      maps: [
        {
          sx: [0, 135, 1770, 2030, 2042],
          dx: [0, 135 * xs, c - 260 * xs, c, c + 12 * xs],
          sy: ySources[0],
          dy: yTargets[0],
        },
        {
          sx: [2018, 2030, 2265, 2940, 3072],
          dx: [c - 12 * xs, c, c + 235 * xs, width - 132 * xs, width],
          sy: ySources[1],
          dy: yTargets[1],
        },
      ],
      handles: {
        split: [c, height * 0.52],
        left: [leftCenter, left * ys],
        // The authored Look/Performance rail is below its resize anchor.
        upper: [
          rightCenter,
          (panels[2].top + panels[2].height + panels[3].top) / 2,
        ],
        lower: [rightCenter, lower * ys],
      },
      footer: [
        {
          left: panels[0].left,
          top: height - footerHeight,
          width: panels[0].width,
          height: footerHeight,
        },
        {
          left: panels[2].left,
          top: height - footerHeight,
          width: panels[2].width,
          height: footerHeight,
        },
      ],
    };
  }
  const scale = portraitScale(width),
    xMap = (v) =>
      mapCoordinate(v, portraitSx, [
        0,
        180 * scale,
        width - 334 * scale,
        width,
      ]);
  // Insets grow with the frame corners (control-layout.css, 34px + 60px).
  const inset = Math.max(0, 94 * scale - 34);
  const comfort = panelMinimums(
      portraitRects.map(([x, , w]) => xMap(x + w) - xMap(x)),
    ).map((min, i) => (i ? min + inset : min)),
    minimums = squeezed(comfort);
  const height = fittingHeight(viewportHeight, (h) => {
    const { available, minGaps } = portraitBands(h, scale, comfort);
    return available >= minGaps.reduce((sum, gap) => sum + gap, 0);
  });
  const { ys, headerHeight, footerHeight, available, minGaps } = portraitBands(
    height,
    scale,
    minimums,
  );
  const comfortGaps = portraitBands(height, scale, comfort).minGaps;
  // Keep complete rounded corners and side junctions; only straight stretches vary.
  const sy = [
    0, 60, 200, 540, 790, 1245, 1500, 1840, 2090, 2255, 2510, 2810, 2940, 3072,
  ];
  // Every panel starts at its comfortable height; extra room keeps the
  // original shares, with Look, Performance and Rhythm split by content.
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const extra = Math.max(0, available - sum(comfortGaps)),
    right = sum(comfort.slice(2));
  const bases = [
    340,
    455,
    ...comfort.slice(2).map((min) => (805 * min) / right),
  ].map((share, i) => comfortGaps[i] + (extra * share) / 1600);
  const weighted = bases.map((n, i) => n * state.portrait.weights[i]);
  const gaps = Array(5).fill(0);
  let remaining = available,
    free = [0, 1, 2, 3, 4];
  while (free.length) {
    const total = free.reduce((sum, i) => sum + weighted[i], 0);
    const small = free.filter(
      (i) => (remaining * weighted[i]) / total < minGaps[i],
    );
    if (!small.length) {
      for (const i of free) gaps[i] = (remaining * weighted[i]) / total;
      break;
    }
    for (const i of small) {
      gaps[i] = minGaps[i];
      remaining -= minGaps[i];
    }
    free = free.filter((i) => !small.includes(i));
  }
  const dy = [0];
  for (let i = 0; i < sy.length - 1; i++) {
    const length =
      i === 0
        ? headerHeight - 56.736 * ys
        : i === 12
          ? footerHeight
          : i % 2 === 0
            ? gaps[(i - 2) / 2]
            : (sy[i + 1] - sy[i]) * ys;
    dy.push(dy.at(-1) + length);
  }
  dy[dy.length - 1] = height;
  const yMap = (v) => mapCoordinate(v, sy, dy);
  return {
    mode,
    width,
    height,
    headerHeight,
    ys,
    gaps,
    bases,
    minGaps,
    minimums,
    comfort,
    maps: [
      {
        sx: portraitSx,
        dx: portraitSx.map((v) => xMap(v)),
        sy,
        dy,
      },
    ],
    panels: portraitRects.map((rect) => mappedRect(rect, xMap, yMap)),
    handles: Object.fromEntries(
      [665, 1372, 1966, 2381].map((y, i) => [String(i), [width / 2, yMap(y)]]),
    ),
    footer: [
      null,
      {
        left: width * 0.08,
        top: height - footerHeight,
        width: width * 0.84,
        height: footerHeight,
      },
    ],
  };
}
