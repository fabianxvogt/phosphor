import { tr } from "./i18n/index.mjs";
// Curated performances above the look catalog. Definitions travel with a set;
// runtime selection/transport belongs to Show, never to the catalog UI.
export const WORLD_DURATIONS = [4, 8, 16]; // bars, always measured on the show clock
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
  {
    id: "unfolding",
    name: "Unfolding Garden",
    description:
      "The same branching form fills with membranes and opens into blossoms. Play every stage in between.",
    states: [
      { name: "Filaments", look: "metamorphosis:First Filaments" },
      { name: "Membrane", look: "metamorphosis:Pearl Membranes" },
      { name: "Blossom", look: "metamorphosis:Open Blossom" },
    ],
  },
  {
    id: "hopf-bloom",
    name: "Hopf Bloom",
    description:
      "One torus of linked circles blooms into nested tori and the whole Hopf bundle. Every pair of fibres stays linked.",
    states: [
      { name: "Torus", look: "fibration:Linked Torus" },
      { name: "Nest", look: "fibration:Nested Shells" },
      { name: "Bundle", look: "fibration:Full Bundle" },
    ],
  },
  {
    id: "cavern",
    name: "Crystal Cavern",
    description:
      "Glowing seeds sprout faceted prisms, grow into lattice druses and line a luminous hall the camera glides through.",
    states: [
      { name: "Seeds", look: "crystal:Dormant Seeds" },
      { name: "Lattice", look: "crystal:Quartz Lattice" },
      { name: "Hall", look: "crystal:Geode Hall" },
    ],
  },
];
// Earlier shipped definitions of authored worlds. A saved world identical to
// one of them (or to its current definition) is untouched authored data and
// follows the current definition. When an authored world changes, append its
// previous definition here so existing sets upgrade instead of diverging.
const HISTORY = AUTHORED.slice(0, 2).map((w) => ({
  ...w,
  states: w.states.map(({ params, ...state }) => state),
}));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const untouched = (w) =>
  [...AUTHORED, ...HISTORY].some((a) => a.id === w?.id && same(a, w));
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
  // An untouched library saved before newer authored worlds existed is the
  // authored prefix in order; it gains the worlds added since. Custom, empty
  // or reordered libraries remain exact portable data.
  if (
    value.length &&
    value.length < AUTHORED.length &&
    value.every((w, i) => w?.id === AUTHORED[i].id && untouched(w))
  )
    value = [
      ...value,
      ...structuredClone(
        AUTHORED.slice(value.length).filter((w) =>
          w.states.every((s) => known.has(s.look)),
        ),
      ),
    ];
  value = value.map((w) =>
    untouched(w) ? structuredClone(AUTHORED.find((a) => a.id === w.id)) : w,
  );
  const ids = new Set();
  const text = (x, max) => typeof x === "string" && x.trim() && x.length <= max;
  return value.map((w) => {
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

// A continuous world must share its generator, seed and every non-development
// parameter. Incompatible/custom states keep the ordinary world transition.
export function continuousDevelopment(clips, scene) {
  const key = scene?.development;
  const field = scene?.schema.find((f) => f.key === key);
  const first = clips[0]?.snapshot;
  if (
    !key ||
    !field ||
    !first ||
    !clips.every(
      (c) =>
        c?.snapshot?.scene === scene.id &&
        c.snapshot.seed === first.seed &&
        scene.schema.every(
          (f) =>
            f.key === key || c.snapshot.params[f.key] === first.params[f.key],
        ),
    )
  )
    return null;
  return {
    key,
    min: field.min,
    max: field.max,
    positions: clips.map((c) => c.snapshot.params[key]),
  };
}
