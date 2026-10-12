import { tr } from "./i18n/index.mjs";
// Curated performances above the look catalog. Definitions travel with a set;
// runtime selection/transport belongs to Show, never to the catalog UI.
export const WORLD_DURATIONS = [4, 8]; // bars, always measured on the show clock
const AUTHORED = [
  {
    id: "mycelium",
    name: "Living Mycelium",
    description:
      "Quiet filaments become tidal membranes and luminous networks.",
    states: [
      {
        name: "Understory",
        look: "acid:Signal Understory",
        params: { feed: 0.029, kill: 0.057, diffusion: 0.9, speed: 0.5 },
      },
      {
        name: "Tide",
        look: "acid:Tidal Membrane",
        params: { feed: 0.029, kill: 0.057, diffusion: 0.9, speed: 0.7 },
      },
      {
        name: "City",
        look: "acid:Mycelial City",
        params: { feed: 0.029, kill: 0.057, diffusion: 0.9, speed: 1 },
      },
    ],
  },
  {
    id: "garden",
    name: "Afterglow Garden",
    description:
      "An inherited network opens into relief, petals and glowing crowns.",
    states: [
      {
        name: "Roots",
        look: "evolution:Quiet Herbarium",
        params: { feed: 0.029, prune: 0.057, spread: 0.5 },
      },
      {
        name: "Petals",
        look: "evolution:Pearl Nursery",
        params: { feed: 0.029, prune: 0.057, spread: 0.5 },
      },
      {
        name: "Bloom",
        look: "evolution:Coral Orchard",
        params: { feed: 0.029, prune: 0.057, spread: 0.5 },
      },
    ],
  },
];
export function defaultWorlds(lookIds) {
  const known = new Set(lookIds);
  return structuredClone(
    AUTHORED.filter((w) => w.states.every((s) => known.has(s.look))),
  );
}
export function validateWorlds(value, lookIds, scenes = [], catalog = []) {
  const known = new Set(lookIds);
  if (value === undefined) return defaultWorlds(known);
  if (!Array.isArray(value) || value.length > 32)
    throw new Error(tr("At most 32 worlds"));
  const ids = new Set();
  const text = (x, max) => typeof x === "string" && x.trim() && x.length <= max;
  return value.map((w) => {
    // Upgrade only the exact untouched pre-release library. Custom/imported
    // worlds keep their definitions, and unrelated set edits are preserved.
    const authored = AUTHORED.find(
      (a) =>
        a.id === w?.id && a.name === w.name && a.description === w.description,
    );
    if (
      authored &&
      Array.isArray(w.states) &&
      w.states?.length === authored.states.length &&
      w.states.every(
        (state, i) =>
          state?.name === authored.states[i].name &&
          state.look === authored.states[i].look &&
          state.params === undefined,
      )
    )
      w = structuredClone(authored);
    if (
      !w ||
      !text(w.id, 64) ||
      !/^[a-z0-9-]+$/.test(w.id) ||
      ids.has(w.id) ||
      !text(w.name, 80) ||
      !text(w.description, 240) ||
      !Array.isArray(w.states) ||
      w.states.length < 2 ||
      w.states.length > 16
    )
      throw new Error(tr("Invalid world definition"));
    ids.add(w.id);
    const looks = new Set();
    const states = w.states.map((s) => {
      if (!s || !text(s.name, 80) || !known.has(s.look) || looks.has(s.look))
        throw new Error(
          tr("World developments must name distinct catalog looks"),
        );
      looks.add(s.look);
      const params = {};
      const scene = scenes.find(
        (scene) =>
          scene.id ===
          (catalog.find((look) => look.id === s.look)?.snapshot.scene ??
            s.look.split(":")[0]),
      );
      if (s.params !== undefined) {
        if (
          !s.params ||
          typeof s.params !== "object" ||
          Array.isArray(s.params)
        )
          throw new Error(tr("Invalid world development parameters"));
        for (const [key, value] of Object.entries(s.params)) {
          const field = scene?.schema.find((field) => field.key === key);
          if (
            !field ||
            !Number.isFinite(value) ||
            value < field.min ||
            value > field.max ||
            (field.step === 1 && !Number.isInteger(value))
          )
            throw new Error(
              tr("World development parameter outside family bounds"),
            );
          params[key] = value;
        }
      }
      return {
        name: s.name,
        look: s.look,
        ...(Object.keys(params).length ? { params } : {}),
      };
    });
    return { id: w.id, name: w.name, description: w.description, states };
  });
}
export function canCarryTraces(from, to) {
  const codec = from?.simulation?.continuity;
  return (
    codec === "gray-scott-uv16-v1" &&
    codec === to?.simulation?.continuity &&
    !from.simulation.cpu &&
    !to.simulation.cpu
  );
}

// Deleting an own look also removes its developments. Worlds with fewer than
// two developments cease to be playable definitions; the UI explains this.
export function withoutWorldLook(worlds, id) {
  return (worlds ?? [])
    .map((w) => ({ ...w, states: w.states.filter((s) => s.look !== id) }))
    .filter((w) => w.states.length >= 2);
}

// Translate only untouched authored copy. Portable/user-edited names remain data.
export function worldPresentation(world, language) {
  const authored = AUTHORED.find(
    (a) => a.id === world.id && a.name === world.name,
  );
  if (!authored) return world;
  return {
    ...world,
    name: tr(world.name, {}, language),
    description:
      world.description === authored.description
        ? tr(world.description, {}, language)
        : world.description,
    states: world.states.map((state) => ({
      ...state,
      name: authored.states.some(
        (s) => s.look === state.look && s.name === state.name,
      )
        ? tr(state.name, {}, language)
        : state.name,
    })),
  };
}
