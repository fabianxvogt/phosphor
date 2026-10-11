// Native physical pixels, bounded only by the graphics device's dimensions.
export function nativeResolution(width, height, dpr = 1, limits = {}) {
  const w = Math.max(1, width * dpr);
  const h = Math.max(1, height * dpr);
  const scale = Math.min(
    1,
    (limits.width ?? Infinity) / w,
    (limits.height ?? Infinity) / h,
  );
  return [
    Math.max(1, Math.round(w * scale)),
    Math.max(1, Math.round(h * scale)),
  ];
}
export function resolutionLimits(gl) {
  const max = Math.min(
    gl.getParameter(gl.MAX_TEXTURE_SIZE),
    gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
  );
  const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  return {
    width: Math.min(max, viewport[0]),
    height: Math.min(max, viewport[1]),
  };
}

// ScreenDetailed exposes physical scale independently of page zoom. Ordinary
// Screen does not, so a zoomed-out 1× screen must at least retain its full size.
export function nativeDisplayResolution(screen, pageDpr, limits) {
  return nativeResolution(
    screen.width,
    screen.height,
    screen.devicePixelRatio ?? Math.max(1, pageDpr || 1),
    limits,
  );
}
