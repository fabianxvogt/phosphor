import { defaultPattern, effectDefinitions, samplePattern } from "./rhythm.mjs";

const defaults = new WeakMap();
export function authoredRhythm(definitions) {
  if (!defaults.has(definitions))
    defaults.set(definitions, defaultPattern(definitions));
  return defaults.get(definitions);
}

export function rhythmResponse(level) {
  const t = Math.max(0, Math.min(1, Number.isFinite(level) ? level : 0.5));
  return 0.12 + 0.88 * t * t * (3 - 2 * t);
}

// Each fading slot retains its own sampler and pending simulation impulses.
// Display frames can outnumber simulation ticks, particularly at half speed.
export function sampleSceneRhythm(slot, frame, beat, level, calm = false) {
  const definitions = effectDefinitions(slot.scene);
  if (!definitions.length) return null;
  const position = (frame?.beat ?? beat ?? 0) - (frame?.origin ?? 0);
  const override = frame?.overrides?.[slot.lookId];
  const pattern =
    override ??
    frame?.settings?.families?.[slot.scene.id] ??
    authoredRhythm(definitions);
  const activation = override
    ? {}
    : { ...frame?.activations?.families?.[slot.scene.id] };
  for (const [id, boundary] of Object.entries(
    frame?.activations?.overrides?.[slot.lookId] ?? {},
  ))
    activation[id] = Math.max(activation[id] ?? -Infinity, boundary);
  const variant = slot.snapshot?.params?.[slot.scene.type?.key];
  const result = samplePattern(
    pattern,
    definitions,
    position,
    slot.rhythmPosition,
    {
      style: frame?.style,
      variant,
      activation,
    },
  );
  const old = slot.rhythm;
  const inactive = calm || frame?.enabled === false || slot.frozen;
  const gain = inactive ? 0 : rhythmResponse(level);
  slot.rhythmPending ??= new Float32Array(4);
  slot.rhythmGesture ??= new Float32Array([0.5, 0.5, 0]);
  for (const definition of definitions) {
    const i = definition.slot;
    const track = pattern.tracks.find((item) => item.effect === definition.id);
    const unavailable =
      definition.variants && !definition.variants.includes(variant);
    const silent =
      inactive || unavailable || track?.muted || track?.strength === 0;
    // Structural selectors change only on an actual event after joining the
    // transport. Muting/re-enabling or editing a loop cannot move geometry.
    if (old && (silent || result.hits[i] <= 0))
      result.counts[i] = old.counts[i];
    result.values[i] *= gain;
    result.hits[i] *= gain;
    if (silent) slot.rhythmPending[i] = 0;
    else
      slot.rhythmPending[i] = Math.max(slot.rhythmPending[i], result.hits[i]);
  }
  if (inactive || slot.rhythmPending[2] <= 0) slot.rhythmGesture[2] = 0;
  else if (result.hits[2] > 0 && slot.scene.beat?.inject > 0) {
    const event = result.counts[2];
    const a = Math.sin(event * 12.9898) * 43758.5453;
    const b = Math.sin(event * 78.233) * 12543.123;
    slot.rhythmGesture[0] = 0.2 + 0.6 * (a - Math.floor(a));
    slot.rhythmGesture[1] = 0.2 + 0.6 * (b - Math.floor(b));
    slot.rhythmGesture[2] = Math.min(
      1,
      result.hits[2] * slot.scene.beat.inject,
    );
  }
  slot.rhythmPosition = position;
  slot.rhythm = result;
  return result;
}

export function consumeRhythmImpulse(slot) {
  slot.rhythmPending?.fill(0);
  if (slot.rhythmGesture) slot.rhythmGesture[2] = 0;
}
