// Authored defaults for independently scheduled, family-local gestures.
// Shader meanings live in each family; this helper only constructs metadata.
export function familyEffect(id, slot, label, description, options = {}) {
  const {
    period = 1,
    strength = 0.65,
    duration = 0.5,
    kind = "accent",
    variants,
  } = options;
  const length = period === 1 ? 4 : period;
  return {
    id,
    slot,
    label,
    description,
    kind,
    ...(variants ? { variants } : {}),
    defaults: {
      division: 1,
      length,
      steps: Array.from({ length }, (_, i) =>
        period === 1 || i === 0 ? 1 : 0,
      ),
      strength,
      duration,
      muted: false,
    },
  };
}
