// Framing test pattern for the venue line check (D7, D10): screen edges,
// centre, aspect ratio, resolution and a black-level ramp.
export function drawPattern(canvas, engine) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  const g = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  g.fillStyle = "#000";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#fff";
  g.lineWidth = Math.max(2, Math.round(h / 270));
  g.strokeRect(
    g.lineWidth / 2,
    g.lineWidth / 2,
    w - g.lineWidth,
    h - g.lineWidth,
  );
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(w, h);
  g.moveTo(w, 0);
  g.lineTo(0, h);
  g.moveTo(w / 2, 0);
  g.lineTo(w / 2, h);
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
  const r = Math.min(w, h) * 0.4;
  g.beginPath();
  g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  g.stroke();
  // Black-level ramp: 0–10 % steps, then 0–100 %.
  const steps = 11,
    sw = w / steps,
    sh = h * 0.08;
  for (let i = 0; i < steps; i++) {
    const v = Math.round((i / (steps - 1)) * 0.1 * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(i * sw, h * 0.7, sw, sh);
    const u = Math.round((i / (steps - 1)) * 255);
    g.fillStyle = `rgb(${u},${u},${u})`;
    g.fillRect(i * sw, h * 0.7 + sh, sw, sh);
  }
  const ratio = w / h;
  g.fillStyle = "#fff";
  g.font = `${Math.round(h / 24)}px system-ui, sans-serif`;
  g.textAlign = "center";
  g.fillText(
    `${w}×${h} · ${ratio.toFixed(3)}:1 · render ${engine.width}×${engine.height}`,
    w / 2,
    h * 0.3,
  );
}
