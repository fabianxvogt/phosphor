const textTypes = new Set([
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

export function shortcutFor(event) {
  const target = event.target;
  const input = target?.closest?.("input");
  const editing =
    target?.isContentEditable ||
    target?.closest?.("textarea,select,[contenteditable]") ||
    (input && textTypes.has(input.type || "text"));
  if (editing || event.helpOpen) return null;
  const key = event.key.toLowerCase();
  if (event.repeat) return null;
  if (event.ctrlKey || event.metaKey)
    return key === "z" ? (event.shiftKey ? "redo" : "undo") : null;
  if (event.altKey) return null;
  if (key === "b") return "blackout";
  if (key === "escape") return "safe";
  if (key === "p") return "pause";
  if (key === "r") return "reset";
  if (
    input &&
    ["range", "checkbox", "radio", "color"].includes(input.type) &&
    (event.code === "Space" || key.startsWith("arrow"))
  )
    return null;
  if (event.code === "Space" && !target?.closest?.("button")) return "gesture";
  if (key === "enter" && !target?.closest?.("button")) return "go";
  if (event.shiftKey && key === "arrowright") return "scene-next";
  if (event.shiftKey && key === "arrowleft") return "scene-previous";
  return null;
}
