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

/** Structure signature for the distinctness check (D31). Colour-blind by
 * design: computed from luminance only. Components: an 8-bin luminance
 * histogram, edge density at three scales, mirror symmetry (left/right,
 * top/bottom), radial energy profile (4 rings) and a 16×9 thumbnail.
 * @param {ArrayLike<number>} rgba @param {number} width @param {number} height
 */
export function structureSignature(rgba, width, height) {
  const lum = new Float64Array(width * height);
  for (let i = 0; i < lum.length; i++)
    lum[i] =
      (0.2126 * rgba[i * 4] +
        0.7152 * rgba[i * 4 + 1] +
        0.0722 * rgba[i * 4 + 2]) /
      255;
  const at = (/** @type {number} */ x, /** @type {number} */ y) =>
    lum[Math.min(height - 1, y) * width + Math.min(width - 1, x)];
  const histogram = new Array(8).fill(0);
  for (const v of lum)
    histogram[Math.min(7, Math.floor(v * 8))] += 1 / lum.length;
  const edges = [1, 4, 16].map((step) => {
    let count = 0,
      total = 0;
    for (let y = 0; y + step < height; y += step)
      for (let x = 0; x + step < width; x += step) {
        total++;
        if (
          Math.abs(at(x + step, y) - at(x, y)) +
            Math.abs(at(x, y + step) - at(x, y)) >
          0.12
        )
          count++;
      }
    return total ? count / total : 0;
  });
  let lr = 0,
    tb = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      lr += Math.abs(at(x, y) - at(width - 1 - x, y));
      tb += Math.abs(at(x, y) - at(x, height - 1 - y));
    }
  const symmetry = [1 - lr / lum.length, 1 - tb / lum.length];
  const rings = new Array(4).fill(0),
    ringCount = new Array(4).fill(0);
  const cx = width / 2,
    cy = height / 2,
    rMax = Math.hypot(cx, cy);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const ring = Math.min(
        3,
        Math.floor((Math.hypot(x - cx, y - cy) / rMax) * 4),
      );
      rings[ring] += lum[y * width + x];
      ringCount[ring]++;
    }
  const radial = rings.map((v, i) => v / Math.max(1, ringCount[i]));
  const thumb = [];
  for (let ty = 0; ty < 9; ty++)
    for (let tx = 0; tx < 16; tx++) {
      let sum = 0,
        n = 0;
      for (
        let y = Math.floor((ty * height) / 9);
        y < Math.floor(((ty + 1) * height) / 9);
        y++
      )
        for (
          let x = Math.floor((tx * width) / 16);
          x < Math.floor(((tx + 1) * width) / 16);
          x++
        ) {
          sum += lum[y * width + x];
          n++;
        }
      thumb.push(n ? sum / n : 0);
    }
  return { histogram, edges, symmetry, radial, thumb };
}

/** Distance between two signatures, roughly 0 (same structure) to 1+.
 * Weighted so composition (thumbnail) and texture (edges) dominate.
 * @param {ReturnType<typeof structureSignature>} a
 * @param {ReturnType<typeof structureSignature>} b */
export function structureDistance(a, b) {
  const d = (/** @type {number[]} */ x, /** @type {number[]} */ y) =>
    Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0) / x.length);
  return (
    0.35 * d(a.thumb, b.thumb) * 3 +
    0.25 * d(a.edges, b.edges) * 4 +
    0.15 * d(a.histogram, b.histogram) * 4 +
    0.15 * d(a.radial, b.radial) * 3 +
    0.1 * d(a.symmetry, b.symmetry) * 3
  );
}
