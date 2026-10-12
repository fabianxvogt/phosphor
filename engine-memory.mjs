import { canCarryTraces } from "./worlds.mjs";

// Copy actual U/V concentrations, not the outgoing picture. Packed 16-bit
// channels must never be linearly interpolated. Nearest sampling maps the
// normalized field between the authored grids (320×192 and 384×384).
export function carryTraces(gl, source, target) {
  if (
    !source ||
    source.frozen ||
    source.reset ||
    source.warmTicks > 0 ||
    !canCarryTraces(source.scene, target.scene)
  )
    return false;
  const from = source.sim[source.si];
  try {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, from.fbo);
    for (const to of target.sim) {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, to.fbo);
      gl.blitFramebuffer(
        0,
        0,
        from.w,
        from.h,
        0,
        0,
        to.w,
        to.h,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST,
      );
    }
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  target.reset = false;
  target.time = source.time;
  target.tick = source.tick;
  target.carriedFrom = source.lookId;
  return true;
}
