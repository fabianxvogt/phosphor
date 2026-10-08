export function route(message, maps, edges, learn) {
  const key = `${message.type}:${message.channel}:${message.number}`;
  const active = message.value > 0.5;
  const trigger =
    message.type === "note" ? message.value > 0 : active && !edges.get(key);
  const actions = [{ type: "edge", key, active }];
  if (learn && message.value > 0) {
    const next = maps.filter(
      (map) =>
        map.type !== message.type ||
        map.channel !== message.channel ||
        map.number !== message.number,
    );
    if (next.length >= 64)
      actions.push({
        type: "error",
        message:
          "MIDI mapping limit reached. Forget a control before learning another.",
      });
    else
      actions.push({
        type: "learn",
        maps: [
          ...next,
          {
            type: message.type,
            channel: message.channel,
            number: message.number,
            target: learn,
          },
        ],
      });
    return actions;
  }
  for (const map of maps) {
    if (
      map.type !== message.type ||
      map.channel !== message.channel ||
      map.number !== message.number
    )
      continue;
    if (["go", "blackout"].includes(map.target)) {
      if (trigger) actions.push({ type: map.target });
    } else if (message.type !== "note" || message.value > 0)
      actions.push({ type: "value", target: map.target, value: message.value });
  }
  return actions;
}
