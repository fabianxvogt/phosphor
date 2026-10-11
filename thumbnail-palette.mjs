// Render a low-resolution colour basis once, then recolour it on the compositor.
// This is a catalogue approximation; the live renderer always uses the real palette.
export const THUMBNAIL_PALETTE = Object.freeze({
  primary: "#ff0000",
  secondary: "#00ff00",
  accent: "#0000ff",
});
export const thumbnailKey = (snapshot) =>
  JSON.stringify([
    snapshot.scene,
    snapshot.preset,
    snapshot.seed,
    snapshot.params,
  ]);
export function paletteMatrix(colors) {
  const rgb = ["primary", "secondary", "accent"].map((key) =>
    colors[key]
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16) / 255),
  );
  return [0, 1, 2]
    .flatMap((channel) => [...rgb.map((color) => color[channel]), 0, 0])
    .concat([0, 0, 0, 1, 0])
    .join(" ");
}
