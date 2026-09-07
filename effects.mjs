export const effectDefaults = { symmetry: 0, echo: 0, chroma: 0, glow: 0 };
export function validateEffects(value) {
  if (value === undefined) return { ...effectDefaults };
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !(key in effectDefaults))) throw new Error('Effect stack is malformed');
  const result = {};
  for (const key of Object.keys(effectDefaults)) {
    const v = value[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) throw new Error(`Effect ${key} is outside 0–1`);
    result[key] = v;
  }
  return result;
}
export function createEffectStack(makeCanvas) {
  const raw = makeCanvas(), temp = makeCanvas(), echo = makeCanvas();
  let valid = false, echoValid = false;
  function copy(from, to) { const c = to.getContext('2d'); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'copy'; c.drawImage(from, 0, 0); c.restore(); }
  function reset(width, height) { for (const canvas of [raw, temp, echo]) { canvas.width = width; canvas.height = height; } valid = false; echoValid = false; }
  function restore(ctx) { if (valid) copy(raw, ctx.canvas); }
  function apply(ctx, settings, advance = false, fresh = true) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    if (settings.echo <= .01) echoValid = false;
    if (!Object.values(settings).some(value => value > .01)) { if (valid && !fresh) copy(raw, ctx.canvas); valid = false; echoValid = false; return; }
    if (raw.width !== w || raw.height !== h) reset(w, h);
    if (fresh || !valid) { copy(ctx.canvas, raw); valid = true; } else copy(raw, ctx.canvas);
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (settings.symmetry > .01) {
      copy(ctx.canvas, temp);
      const count = 4 + 2 * Math.round(settings.symmetry * 6), angle = Math.PI * 2 / count, radius = Math.hypot(w, h);
      ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < count; i++) {
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(i * angle); if (i % 2) ctx.scale(1, -1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, -angle / 2 - .003, angle / 2 + .003); ctx.closePath(); ctx.clip();
        ctx.drawImage(temp, -w / 2, -h / 2); ctx.restore();
      }
    }
    if (settings.echo > .01 && echoValid) {
      ctx.save(); ctx.globalAlpha = settings.echo * .88; ctx.translate(w / 2, h / 2); ctx.rotate(.008 * settings.echo); ctx.scale(1.006, 1.006); ctx.drawImage(echo, -w / 2, -h / 2); ctx.restore();
    }
    if (advance && settings.echo > .01) { copy(ctx.canvas, echo); echoValid = true; }
    if (settings.chroma > .01) {
      copy(ctx.canvas, temp); const shift = settings.chroma * w * .025;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = settings.chroma * .4;
      ctx.filter = 'sepia(1) saturate(5) hue-rotate(290deg)'; ctx.drawImage(temp, shift, 0);
      ctx.filter = 'sepia(1) saturate(5) hue-rotate(130deg)'; ctx.drawImage(temp, -shift, 0); ctx.restore();
    }
    if (settings.glow > .01) {
      copy(ctx.canvas, temp); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = settings.glow * .7; ctx.filter = `blur(${2 + settings.glow * w * .012}px)`; ctx.drawImage(temp, 0, 0); ctx.restore();
    }
    ctx.restore();
  }
  return { reset, restore, apply };
}
