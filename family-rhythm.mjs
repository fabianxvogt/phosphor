// Authored defaults for independently scheduled, family-local gestures.
// Shader meanings live in each family; this helper only constructs metadata.

// Compact step notation for authored loops. One character per step:
// "." or "-" off, "x" 0.6, "X" 1, digits "1"–"9" 0.1–0.9. Spaces and "|"
// (bar or beat separators) are ignored: "X...|..x.|X.x.|...x".
export function steps(text) {
  const values = [];
  for (const char of String(text)) {
    if (char === " " || char === "|") continue;
    if (char === "." || char === "-") values.push(0);
    else if (char === "x") values.push(0.6);
    else if (char === "X") values.push(1);
    else if (char >= "1" && char <= "9") values.push(Number(char) / 10);
    else throw new Error(`Unknown rhythm step "${char}"`);
  }
  return values;
}

// An authored loop: { steps: "X..x" | number[], division?, strength?,
// duration? }. Missing timing fields fall back to the gesture's defaults.
function loop(spec, base) {
  const values = Array.isArray(spec.steps)
    ? [...spec.steps]
    : steps(spec.steps);
  const result = {
    division: spec.division ?? base.division,
    length: values.length,
    steps: values,
    strength: spec.strength ?? base.strength,
    duration: spec.duration ?? base.duration,
    muted: false,
  };
  if (!values.some((value) => value > 0))
    throw new Error("An authored rhythm loop needs at least one step");
  return result;
}

// Options: period (legacy single hit every N beats), strength, duration,
// kind, variants; or an authored `steps` loop (with optional `division`).
// `styles` gives each phrase style (restrained, driving, accented) its own
// authored loop, so a family's three rhythm presets differ in placement,
// not only in strength. Styles without an entry derive from the default.
export function familyEffect(id, slot, label, description, options = {}) {
  const {
    period = 1,
    strength = 0.65,
    duration = 0.5,
    kind = "accent",
    variants,
    division = 1,
    styles,
  } = options;
  const length = period === 1 ? 4 : period;
  const base = { division, strength, duration };
  const defaults =
    options.steps !== undefined
      ? loop({ steps: options.steps }, base)
      : styles?.driving
        ? loop(styles.driving, base)
        : {
            division: 1,
            length,
            steps: Array.from({ length }, (_, i) =>
              period === 1 || i === 0 ? 1 : 0,
            ),
            strength,
            duration,
            muted: false,
          };
  return {
    id,
    slot,
    label,
    description,
    kind,
    ...(variants ? { variants } : {}),
    defaults,
    ...(styles
      ? {
          styles: Object.fromEntries(
            Object.entries(styles).map(([style, spec]) => [
              style,
              loop(spec, base),
            ]),
          ),
        }
      : {}),
  };
}
