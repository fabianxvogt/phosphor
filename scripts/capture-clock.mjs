// world-film advances one frame before saving image n: beat(n)=(n+1)*bpm/(60*fps).
// Pick the first saved frame on/after each target, never the frame before a hit.
export function rhythmFramePicks({
  fps = 30,
  bpm = 126,
  startBeat = 8,
  count = 24,
  seconds = 12,
} = {}) {
  if (
    ![fps, bpm, seconds].every((n) => Number.isFinite(n) && n > 0) ||
    !Number.isFinite(startBeat) ||
    startBeat < 0 ||
    !Number.isInteger(count) ||
    count < 1
  )
    throw new Error("Invalid rhythm capture clock");
  const picks = Array.from({ length: count }, (_, i) =>
    Math.max(0, Math.ceil(((startBeat + i / 2) * fps * 60) / bpm - 1e-8) - 1),
  );
  if (
    picks.at(-1) >= Math.round(seconds * fps) ||
    new Set(picks).size !== count
  )
    throw new Error("Rhythm frames do not fit the capture");
  return picks;
}
