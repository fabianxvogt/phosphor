// Show key map (decisions D13, D14). Bound to physical key positions
// (KeyboardEvent.code), so QWERTZ and other layouts keep the grid shape;
// on-screen labels come from the active layout where the browser exposes it.

export const GRID_CODES = [
  [
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
  ],
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma"],
].flat();

const SLOT_BY_CODE = new Map(GRID_CODES.map((code, slot) => [code, slot]));

const TEXT_TYPES = new Set([
  "text",
  "search",
  "url",
  "tel",
  "email",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
]);

export function isTextEntry(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  if (target.closest?.("textarea,select,[contenteditable]")) return true;
  const input = target.closest?.("input");
  return !!input && TEXT_TYPES.has(input.type || "text");
}

// Returns an action object or null. Panic actions (blackout, safe look)
// work everywhere — sliders, buttons and text fields included — so focus can
// never block them (the slider-focus bug). Everything else is ignored while
// typing, on key repeat, and with Ctrl/Cmd/Alt so browser shortcuts stay.
export function actionFor(event) {
  const { code, shiftKey } = event;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.repeat && event.type !== "keyup") return null; // held keys must not toggle
  if (event.type === "keyup")
    return code === "KeyL" ? { type: "flash", on: false } : null;
  if (code === "Escape") return { type: shiftKey ? "safe" : "blackout" };
  if (isTextEntry(event.target)) return null;
  if (shiftKey && /^Digit[1-8]$/.test(code))
    return { type: "page", index: Number(code.slice(5)) - 1 };
  if (SLOT_BY_CODE.has(code) && !shiftKey)
    return { type: "slot", index: SLOT_BY_CODE.get(code) };
  switch (code) {
    case "Space":
      // Shift+Space: autopilot's next pick now (D66); Space alone taps.
      return { type: shiftKey ? "next" : "tap" };
    case "Enter":
    case "NumpadEnter":
      return { type: "downbeat" };
    case "ArrowLeft":
      return { type: "nudge", direction: -1 };
    case "ArrowRight":
      return { type: "nudge", direction: 1 };
    case "ArrowUp":
      return { type: "energy", direction: 1 };
    case "ArrowDown":
      return { type: "energy", direction: -1 };
    case "Digit9":
      return { type: "speed", value: 0.5 };
    case "Digit0":
      return { type: "speed", value: 2 };
    case "KeyP":
      return { type: "autopilot" };
    case "KeyO":
      return { type: "freeze" };
    case "KeyL":
      return { type: "flash", on: true };
    default:
      return null;
  }
}

const FALLBACK = Object.fromEntries(
  GRID_CODES.concat(["Digit9", "Digit0", "KeyP", "KeyO", "KeyL"]).map(
    (code) => [code, code === "Comma" ? "," : code.replace(/^(Digit|Key)/, "")],
  ),
);

// Labels for the on-screen grid. Chrome exposes the active layout through
// navigator.keyboard.getLayoutMap(); elsewhere US QWERTY labels are used.
export async function keyLabels(keyboard = globalThis.navigator?.keyboard) {
  const labels = { ...FALLBACK };
  try {
    const map = await keyboard?.getLayoutMap?.();
    if (map)
      for (const code of Object.keys(labels)) {
        const label = map.get(code);
        if (label) labels[code] = label.toUpperCase();
      }
  } catch {}
  return labels;
}
