// @ts-check

/** @param {number[]} values @param {number} fraction */
export function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
}

/** Art-bible proxies, not aesthetic approval or a flash-safety certification.
 * Luminance is linear-light Rec.709, saturation is HSV, edge threshold is .08.
 * Mid-grey means HSV saturation < .15 and linear luminance in [.05, .6].
 * @param {ArrayLike<number>} rgba @param {number} width @param {number} height
 */
export function imageMetrics(rgba, width, height) {
  if (rgba.length !== width * height * 4 || width < 1 || height < 1)
    throw new Error("RGBA dimensions do not match");
  const linear = (/** @type {number} */ value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = new Float64Array(width * height);
  let sum = 0,
    saturation = 0,
    grey = 0,
    edges = 0,
    comparisons = 0;
  for (let i = 0; i < luminance.length; i++) {
    const r = rgba[i * 4] / 255,
      g = rgba[i * 4 + 1] / 255,
      b = rgba[i * 4 + 2] / 255;
    const high = Math.max(r, g, b),
      low = Math.min(r, g, b),
      s = high ? (high - low) / high : 0;
    const y = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    luminance[i] = y;
    sum += y;
    saturation += s;
    if (s < 0.15 && y >= 0.05 && y <= 0.6) grey++;
    if (i % width) {
      comparisons++;
      if (Math.abs(y - luminance[i - 1]) > 0.08) edges++;
    }
    if (i >= width) {
      comparisons++;
      if (Math.abs(y - luminance[i - width]) > 0.08) edges++;
    }
  }
  return {
    blackFloorP2Luminance: percentile(Array.from(luminance), 0.02),
    meanLuminance: sum / luminance.length,
    meanSaturation: saturation / luminance.length,
    edgeDensity: comparisons ? edges / comparisons : 0,
    lowSaturationMidGreyPercent: (100 * grey) / luminance.length,
  };
}

/** @param {number[]} heaps */
export function heapEvidence(heaps) {
  if (heaps.length < 3) return null;
  const growthMB = (heaps[heaps.length - 1] - heaps[0]) / 1e6;
  const third = Math.max(1, Math.floor(heaps.length / 3));
  const mean = (/** @type {number[]} */ xs) =>
    xs.reduce((a, b) => a + b, 0) / xs.length;
  const thirds = [
    mean(heaps.slice(0, third)),
    mean(heaps.slice(third, 2 * third)),
    mean(heaps.slice(2 * third)),
  ];
  // Any strictly rising three-window mean is reported, not excused by a margin.
  const upwardTrend = thirds[0] < thirds[1] && thirds[1] < thirds[2];
  return { growthMB, upwardTrend, windowMeansBytes: thirds };
}
