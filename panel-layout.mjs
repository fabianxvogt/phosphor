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
export function defaultPanelLayout() {
  return {
    version: 1,
    desktop: { split: 66, seams: [755, 875, 1300] },
    portrait: { weights: [1, 1, 1, 1, 1] },
  };
}
export function validatePanelLayout(value) {
  const result = defaultPanelLayout();
  if (value?.version !== 1) return result;
  result.desktop.split = clamp(finite(value.desktop?.split, 66), 30, 78);
  const seams = value.desktop?.seams;
  if (Array.isArray(seams) && seams.length === 3) {
    const lower = clamp(finite(seams[2], 1300), 750, 1510);
    result.desktop.seams = [
      clamp(finite(seams[0], 755), 440, lower - 310),
      clamp(finite(seams[1], 875), 420, 1510),
      lower,
    ];
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
    if (geometry && key !== "left") {
      layout.desktop.seams[0] = geometry.seams[0];
      layout.desktop.seams[2] = geometry.seams[2];
    }
    const seams = layout.desktop.seams;
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
// Readable working space, including headings, faders and the setup strip.
// Narrow controls wrap onto extra rows; the catalog itself remains scrollable.
function panelMinimums(widths) {
  return [
    240,
    widths[1] < 500 ? 460 : 360,
    widths[2] < 400 ? 640 : widths[2] < 500 ? 560 : 460,
    widths[3] < 500 ? 320 : 240,
    widths[4] < 500 ? 400 : 300,
  ];
}
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
function portraitBands(height, minimums) {
  const ys = height / 3072,
    headerHeight = 72,
    footerHeight = 48,
    firstBand = (200 * headerHeight) / 116.736,
    available = height - firstBand - 1140 * ys - footerHeight;
  const rigid = [
    firstBand - headerHeight + 117.408 * ys,
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
    const xs = width / 3072,
      c = (width * state.desktop.split) / 100;
    const sx = [0, 135, 1770, 2030, 2265, 2940, 3072];
    const dx = [
      0,
      135 * xs,
      c - 260 * xs,
      c,
      c + 235 * xs,
      width - 132 * xs,
      width,
    ];
    const xMap = (v) => mapCoordinate(v, sx, dx);
    const minimums = panelMinimums(
      desktopRects.map(([x, , w]) => xMap(x + w) - xMap(x)),
    );
    const height = fittingHeight(viewportHeight, (h) =>
      Object.values(desktopBounds(h, minimums).limits).every(
        ([min, max]) => min <= max,
      ),
    );
    const footerHeight = desktopFooter(height),
      ys = (height - footerHeight) / 1818;
    const { limits, gap } = desktopBounds(height, minimums);
    const lower = clamp(state.desktop.seams[2], ...limits.lower),
      upper = clamp(
        state.desktop.seams[0],
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
        upper: [rightCenter, upper * ys],
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
  const minimums = panelMinimums(
    portraitRects.map(([, , w]) => (w * width) / 1024),
  );
  const height = fittingHeight(viewportHeight, (h) => {
    const { available, minGaps } = portraitBands(h, minimums);
    return available >= minGaps.reduce((sum, gap) => sum + gap, 0);
  });
  const { ys, headerHeight, footerHeight, firstBand, available, minGaps } =
    portraitBands(height, minimums);
  // Keep complete rounded corners and side junctions; only straight stretches vary.
  const sy = [
    0, 200, 540, 790, 1245, 1500, 1840, 2090, 2255, 2510, 2810, 2940, 3072,
  ];
  const bases = [340, 455, 340, 165, 300].map((n) => (n * available) / 1600);
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
        ? firstBand
        : i === 11
          ? footerHeight
          : i % 2 === 1
            ? gaps[(i - 1) / 2]
            : (sy[i + 1] - sy[i]) * ys;
    dy.push(dy.at(-1) + length);
  }
  dy[dy.length - 1] = height;
  const yMap = (v) => mapCoordinate(v, sy, dy),
    xMap = (v) => (v * width) / 1024;
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
    maps: [{ sx: [0, 1024], dx: [0, width], sy, dy }],
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
