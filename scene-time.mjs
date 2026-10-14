// Long-show time for scene shaders (see docs/families/TIME.md).
//
// u_time is accumulated scene time, uploaded as float32. Authored expressions
// keep their exact first-hour arithmetic; after HOUR seconds a scene may
// switch to forms that stay seamless and precise for 12 hours or more:
// - hourWrap(x, P): x itself during the first hour, afterwards x mod P. Every
//   use of x must be P-periodic (fract, sin/cos, integer cell shifts).
// - hourClock(product, i): the authored `time · rate` product during the
//   first hour, afterwards the engine's integrated clock i (∫ rate dt in
//   double precision, continuous at the switch; see Engine.sceneClocks).
//   A scene declares `clocks: [{ rate(params, level), offset?, period? }, …]`
//   (at most CLOCK_COUNT); the first-hour expression is time · rate + offset.
//   With a period the uploaded clock is reduced modulo that period in double
//   precision, so every use must be period-periodic.
export const HOUR = 3600;
export const CLOCK_COUNT = 4;

export const hourWrapGlsl = `
float hourWrap(float x, float period) { return u_time < ${HOUR}.0 ? x : mod(x, period); }
`;

export const hourClockGlsl = `
uniform float u_clock[${CLOCK_COUNT}];
float hourClock(float product, int i) { return u_time < ${HOUR}.0 ? product : u_clock[i]; }
`;

// Integrated clocks (double precision). Before HOUR, and whenever scene time
// jumps (a load, a seek, a test setting slot.time), a clock re-anchors to the
// authored product time · rate, so it continues the first-hour expression.
export function advanceClocks(state, clocks, time, params, level) {
  const values = (state.values ??= new Float64Array(CLOCK_COUNT));
  const dt = time - state.time;
  const anchor = !(time >= HOUR) || !(dt >= 0 && dt <= 1);
  for (let i = 0; i < Math.min(CLOCK_COUNT, clocks.length); i++) {
    const { rate, offset = 0, period } = clocks[i];
    const r = Number(rate(params, level));
    const v = Number.isFinite(r) ? r : 0;
    let value = anchor ? time * v + offset : values[i] + v * dt;
    if (period > 0) value -= period * Math.floor(value / period);
    values[i] = Number.isFinite(value) ? value : 0;
  }
  state.time = time;
  return values;
}
