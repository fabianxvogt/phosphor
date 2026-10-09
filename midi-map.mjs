// MIDI learn routing for v3 shows (D5): CCs drive shared and family faders;
// notes and CC edges trigger actions. Pure, so it is tested without devices.
const CONTINUOUS = {
  master: (v) => ({ type: "shared", master: v }),
  energy: (v) => ({ type: "energy", value: v }),
  hue: (v) => ({ type: "shared", hue: v - 0.5 }),
  zoom: (v) => ({ type: "shared", zoom: 0.5 + 1.5 * v }),
  mirror: (v) => ({ type: "shared", mirror: 1 + Math.round(v * 11) }),
};
const TRIGGERS = {
  blackout: () => ({ type: "blackout" }),
  safe: () => ({ type: "safe" }),
  tap: () => ({ type: "tap" }),
  downbeat: () => ({ type: "downbeat" }),
  autopilot: () => ({ type: "autopilot" }),
  next: () => ({ type: "next" }),
  freeze: () => ({ type: "freeze" }),
};

// familyParam(i, v) → { key, value } for the playing family's i-th stage
// control, or null. Returns { maps?, actions } — maps when a control was learnt.
export function routeMidi(
  message,
  maps,
  edges,
  learn,
  familyParam = () => null,
) {
  const key = `${message.type}:${message.channel}:${message.number}`;
  const wasOn = edges.get(key) ?? false;
  const on = message.value > 0.5;
  edges.set(key, on);
  if (learn) {
    const rest = maps.filter(
      (m) =>
        !(
          m.type === message.type &&
          m.channel === message.channel &&
          m.number === message.number
        ),
    );
    if (rest.length >= 64)
      return { actions: [], error: "MIDI mapping limit reached" };
    return {
      maps: [
        ...rest,
        {
          type: message.type,
          channel: message.channel,
          number: message.number,
          target: learn,
        },
      ],
      actions: [],
    };
  }
  const actions = [];
  const rising = on && !wasOn;
  for (const map of maps) {
    if (
      map.type !== message.type ||
      map.channel !== message.channel ||
      map.number !== message.number
    )
      continue;
    const t = map.target;
    if (CONTINUOUS[t]) actions.push(CONTINUOUS[t](message.value));
    else if (t.startsWith("family.")) {
      const param = familyParam(Number(t.slice(7)), message.value);
      if (param) actions.push({ type: "param", ...param });
    } else if (t === "flash") actions.push({ type: "flash", on });
    else if (rising && TRIGGERS[t]) actions.push(TRIGGERS[t]());
    else if (rising && t.startsWith("slot."))
      actions.push({ type: "slot", index: Number(t.slice(5)) });
  }
  return { actions };
}
