// The approved study's independent column maps, using the unchanged local art.
// No animation loop: redraw only when the layout or display scale changes.
export function createChassisRenderer(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const layers = [
    document.createElement("canvas"),
    document.createElement("canvas"),
  ];
  function size(target, width, height) {
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
  }
  function grid(ctx, image, map, dpr) {
    const { sx, sy } = map,
      dx = map.dx.map((v) => Math.round(v * dpr) / dpr),
      dy = map.dy.map((v) => Math.round(v * dpr) / dpr);
    for (let x = 0; x < sx.length - 1; x++)
      for (let y = 0; y < sy.length - 1; y++)
        ctx.drawImage(
          image,
          sx[x],
          sy[y],
          sx[x + 1] - sx[x],
          sy[y + 1] - sy[y],
          dx[x],
          dy[y],
          dx[x + 1] - dx[x],
          dy[y + 1] - dy[y],
        );
  }
  return (image, geometry, scale = devicePixelRatio || 1) => {
    const { width, height } = geometry;
    const dpr = Math.min(2, scale, Math.sqrt(8_000_000 / (width * height)));
    const bw = Math.round(width * dpr),
      bh = Math.round(height * dpr);
    size(canvas, bw, bh);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    if (geometry.mode === "portrait") {
      grid(context, image, geometry.maps[0], dpr);
      return;
    }
    const { center, xs } = geometry,
      feather = 12 * xs;
    layers.forEach((layer, i) => {
      size(layer, bw, bh);
      const ctx = layer.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, width, height);
      grid(ctx, image, geometry.maps[i], dpr);
      const mask = ctx.createLinearGradient(
        center - feather,
        0,
        center + feather,
        0,
      );
      mask.addColorStop(0, `rgba(0,0,0,${i === 0 ? 1 : 0})`);
      mask.addColorStop(1, `rgba(0,0,0,${i === 0 ? 0 : 1})`);
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, width, height);
    });
    // Complementary weights add to one; source-over would darken the join.
    context.drawImage(layers[0], 0, 0, width, height);
    context.globalCompositeOperation = "lighter";
    context.drawImage(layers[1], 0, 0, width, height);
    context.globalCompositeOperation = "source-over";
  };
}
