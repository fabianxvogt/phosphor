// @ts-check
import {
  structureSignature,
  structureDistance,
} from "../tests/browser/metrics.mjs";

/** Normalize display-referred Rec.709 grayscale before any spatial or temporal
 * measurement. Exposure/contrast/tint that makes Y' = aY + b (a > 0) cancels
 * while both frames remain above the perceptible contrast floor.
 * Do not linearize here: gamma decoding would make a display brightness change
 * non-affine and falsely count it as structure. Clipping or spatially different
 * colour changes can still alter structure; the metric cannot undo lost detail.
 * @param {ArrayLike<number>} rgba @param {number} width @param {number} height
 */
function normalize(rgba, width, height) {
  if (rgba.length !== width * height * 4)
    throw new Error("RGBA dimensions do not match");
  const luminance = new Float64Array(width * height);
  let mean = 0;
  for (let i = 0; i < luminance.length; i++) {
    luminance[i] =
      0.2126 * rgba[i * 4] +
      0.7152 * rgba[i * 4 + 1] +
      0.0722 * rgba[i * 4 + 2];
    mean += luminance[i] / luminance.length;
  }
  let variance = 0;
  for (const y of luminance) variance += (y - mean) ** 2 / luminance.length;
  const deviation = Math.sqrt(variance);
  const gray = new Float64Array(rgba.length);
  for (let i = 0; i < luminance.length; i++) {
    // Three standard deviations fill the normalized range. Below two 8-bit
    // code values of deviation, flatten the frame so dark quantization noise
    // cannot be amplified into dense edges or fast motion.
    const y =
      deviation >= 2
        ? Math.max(
            0,
            Math.min(1, 0.5 + (luminance[i] - mean) / (6 * deviation)),
          )
        : 0.5;
    luminance[i] = y;
    gray[i * 4] = gray[i * 4 + 1] = gray[i * 4 + 2] = 255 * y;
    gray[i * 4 + 3] = 255;
  }
  return { luminance, signature: structureSignature(gray, width, height) };
}

/** D60 energyDelta for equal-length sequences sampled at identical times:
 * N(Y) = clamp(1/2 + (Y - mean(Y))/(6 std(Y)), 0, 1) if std(Y) >= 2/255
 * in normalized display units; otherwise the near-flat frame maps to 1/2.
 * S = structureDistance(mean(signature(N(low))), mean(signature(N(high)))).
 * Signatures include multiscale edges, composition, histogram and symmetry.
 * M(e) = mean over adjacent frames and pixels of |N(e,t+1) - N(e,t)|.
 * motionDelta = |M(high) - M(low)|; score = hypot(S, motionDelta).
 * Averaging signatures across the window avoids mistaking a single animation
 * phase for a density/detail change. Absolute, not relative, motion difference
 * avoids a tiny numerical change from a static baseline dominating the gate.
 * Neither component certifies artistic quality, flash safety or GPU timing.
 * @param {ArrayLike<number>[]} low @param {ArrayLike<number>[]} high
 * @param {number} width @param {number} height
 */
export function energyDelta(low, high, width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    low.length < 2 ||
    low.length !== high.length
  )
    throw new Error(
      "Energy metric needs matching sequences of at least two frames",
    );
  const summarize = (/** @type {ArrayLike<number>[]} */ frames) => {
    const first = normalize(frames[0], width, height);
    const signature = first.signature;
    for (const values of Object.values(signature))
      for (let i = 0; i < values.length; i++) values[i] /= frames.length;
    let previous = first.luminance;
    let motion = 0;
    for (let t = 1; t < frames.length; t++) {
      const current = normalize(frames[t], width, height);
      for (let i = 0; i < previous.length; i++)
        motion +=
          Math.abs(current.luminance[i] - previous[i]) /
          (previous.length * (frames.length - 1));
      for (const key of /** @type {(keyof typeof signature)[]} */ (
        Object.keys(signature)
      ))
        for (let i = 0; i < signature[key].length; i++)
          signature[key][i] += current.signature[key][i] / frames.length;
      previous = current.luminance;
    }
    return { signature, motion };
  };
  const a = summarize(low);
  const b = summarize(high);
  const structuralDelta = structureDistance(a.signature, b.signature);
  const motionDelta = Math.abs(b.motion - a.motion);
  return {
    structuralDelta,
    motionDelta,
    score: Math.hypot(structuralDelta, motionDelta),
    lowMotion: a.motion,
    highMotion: b.motion,
  };
}
