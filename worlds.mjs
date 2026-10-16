import { tr } from "./i18n/index.mjs";
// Curated performances above the look catalog. Definitions travel with a set;
// runtime selection/transport belongs to Show, never to the catalog UI.
export const WORLD_DURATIONS = [4, 8, 16]; // bars, always measured on the show clock
// A fresh control window opens on this world and tours the library from it.
export const FEATURED_WORLD = "liquid-chrome";
// Living Mycelium until 2026-10-14: three acid looks with curated chemistry.
// Since then it is one continuous world (scene-mycelium.mjs).
const MYCELIUM_ACID = {
  id: "mycelium",
  name: "Living Mycelium",
  description: "Quiet filaments become tidal membranes and luminous networks.",
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
};
// Afterglow Garden until 2026-10-14: three evolution looks with curated
// chemistry. Since then it is one continuous world (scene-afterglow.mjs).
const GARDEN_EVOLUTION = {
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
};
const AUTHORED = [
  {
    id: "mycelium",
    name: "Living Mycelium",
    description:
      "Branching hyphae carry nutrient signals through a living forest floor, then fruit into a luminous mushroom city. Play every stage in between.",
    states: [
      { name: "Understory", look: "mycelium:Hyphal Understory" },
      { name: "Tide", look: "mycelium:Tidal Lamellae" },
      { name: "City", look: "mycelium:Lantern City" },
    ],
  },
  {
    id: "garden",
    name: "Afterglow Garden",
    description:
      "A living morphogen meadow grows from glowing roots through lantern buds into open flowers at dusk.",
    states: [
      { name: "Roots", look: "afterglow:Glowing Roots" },
      { name: "Petals", look: "afterglow:Opening Petals" },
      { name: "Bloom", look: "afterglow:Crowns at Dusk" },
    ],
  },
  {
    id: "unfolding",
    name: "Unfolding Garden",
    description:
      "Curled seed membranes release into layered cups and luminous blossoms in a receding garden. Play every stage in between.",
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
  {
    id: "nebula",
    name: "Spiral Nebula",
    description:
      "Drifting dust condenses into a turning spiral galaxy that collapses and ignites into a supernova shell. The same stars throughout.",
    states: [
      { name: "Dust", look: "nebula:Drifting Dust" },
      { name: "Spiral", look: "nebula:Grand Spiral" },
      { name: "Nova", look: "nebula:Supernova Shell" },
    ],
  },
  {
    id: "descent",
    name: "Endless Descent",
    description:
      "Fly through a sponge corridor as it widens into a sunlit cavern and opens into an endless fractal city.",
    states: [
      { name: "Corridor", look: "descent:Sponge Corridor" },
      { name: "Cavern", look: "descent:Pillared Cavern" },
      { name: "City", look: "descent:Endless City" },
    ],
  },
  {
    id: "murmuration",
    name: "Dusk Murmuration",
    description:
      "Loose starlings gather into a surging, folding cloud that ripples when a falcon strikes, then fly a vortex the camera dives into. The same birds throughout.",
    states: [
      { name: "Loose", look: "murmuration:Evening Roost" },
      { name: "Surge", look: "murmuration:Surging Cloud" },
      { name: "Formation", look: "murmuration:Vortex Mill" },
    ],
  },
  {
    id: "origami",
    name: "Origami Storm",
    description:
      "A creased sheet folds into floating solids, which burst into a storm of streaking shards around a core of light.",
    states: [
      { name: "Sheet", look: "fold:Creased Sheet" },
      { name: "Fold", look: "fold:Rising Solids" },
      { name: "Shards", look: "fold:Shard Storm" },
    ],
  },
  {
    id: "attractor-ribbons",
    name: "Attractor Ribbons",
    description:
      "Hundreds of light ribbons trace the butterfly's wings, swirl into a vortex and lose themselves in a labyrinth the camera flies through.",
    states: [
      { name: "Wings", look: "ribbons:Butterfly Wings" },
      { name: "Vortex", look: "ribbons:Aizawa Vortex" },
      { name: "Labyrinth", look: "ribbons:Thomas Labyrinth" },
    ],
  },
  {
    id: "horizon",
    name: "Event Horizon",
    description:
      "A tidally torn star spirals into a black hole until a blazing disk arches over its shadow and jets fire from the poles.",
    states: [
      { name: "Star", look: "horizon:Tidal Star" },
      { name: "Infall", look: "horizon:Infall Spiral" },
      { name: "Horizon", look: "horizon:Blazing Horizon" },
    ],
  },
  {
    id: "deep-sea",
    name: "Abyssal Bloom",
    description:
      "Blinking sparks in the dark gather into pulsing jellyfish blooms and open onto a glowing reef under shafts of light. The same animals throughout.",
    states: [
      { name: "Sparks", look: "abyss:First Sparks" },
      { name: "Swarms", look: "abyss:Medusa Bloom" },
      { name: "Reef", look: "abyss:Lantern Reef" },
    ],
  },
  {
    id: "liquid-chrome",
    name: "Liquid Chrome",
    description:
      "A black mirror pool grows a magnetic crown of sharp hexagonal spikes, then rises into a floating liquid-metal sculpture with orbiting chrome droplets.",
    states: [
      { name: "Pool", look: "ferro:Pool" },
      { name: "Crown", look: "ferro:Crown" },
      { name: "Sculpture", look: "ferro:Sculpture" },
    ],
  },
  {
    id: "moon-tide",
    name: "Moon Tide",
    description:
      "A sparkling moon path, swells that break into glowing foam, then the same sea wound into a vast spiral that pours into a glowing eye. The same ocean throughout.",
    states: [
      { name: "Calm", look: "tide:Calm" },
      { name: "Swell", look: "tide:Swell" },
      { name: "Maelstrom", look: "tide:Maelstrom" },
    ],
  },
  {
    id: "laser-grid",
    name: "Laser Grid",
    description:
      "A wireframe horizon raises vector towers and folds into a vaulted tunnel of converging lasers. The same grid throughout.",
    states: [
      { name: "Horizon", look: "laser:Horizon" },
      { name: "Towers", look: "laser:Towers" },
      { name: "Tunnel", look: "laser:Tunnel" },
    ],
  },
  {
    id: "magma-rift",
    name: "Magma Rift",
    description:
      "Cooling basalt plates breathe through glowing cracks, split into rivers of lava and open into an erupting lake that throws glowing ejecta under an ash plume. The same plates throughout.",
    states: [
      { name: "Crust", look: "magma:Breathing Crust" },
      { name: "Rivers", look: "magma:Seam Rivers" },
      { name: "Eruption", look: "magma:Lava Fountain" },
    ],
  },
  {
    id: "kinetic-rain",
    name: "Kinetic Rain",
    description:
      "Thousands of glowing spheres on threads hang level under the ceiling, break into interfering wave choreographies and gather into one floating surface that morphs from sphere to torus, Möbius band and saddle. The same spheres throughout.",
    states: [
      { name: "Ceiling", look: "kinetic:Still Ceiling" },
      { name: "Waves", look: "kinetic:Wave Choreography" },
      { name: "Sculpture", look: "kinetic:Floating Sculpture" },
    ],
  },
  {
    id: "aurora-veil",
    name: "Aurora Veil",
    description:
      "Folded curtains of field-aligned light travel over a frozen lake, then gather into an overhead magnetic corona. The same rays throughout.",
    states: [
      { name: "Glow", look: "aurora:Glow" },
      { name: "Curtains", look: "aurora:Curtains" },
      { name: "Corona", look: "aurora:Corona" },
    ],
  },
  {
    id: "brass-orrery",
    name: "Brass Orrery",
    description: "Involute gears open into an exact-ratio planetary machine and a vast clockwork cathedral.",
    states: [
      { name: "Gears", look: "orrery:Gears" },
      { name: "Orrery", look: "orrery:Orrery" },
      { name: "Clockwork", look: "orrery:Clockwork" },
    ],
  },
  {
    id: "thunderhead",
    name: "Thunderhead",
    description:
      "Heat lightning inside a distant cloud bank grows into branching cloud-to-cloud leaders and a rotating supercell with ground strikes and rain curtains. The same storm throughout.",
    states: [
      { name: "Haze", look: "storm:Haze" },
      { name: "Towers", look: "storm:Towers" },
      { name: "Supercell", look: "storm:Supercell" },
    ],
  },
  {
    id: "prism-engine",
    name: "Prism Engine",
    description: "One glass prism splits a white beam into spectral light, multiplies into an optical array and builds a luminous glass cathedral. The same prisms throughout.",
    states: [
      { name: "Shard", look: "prism:Shard" },
      { name: "Array", look: "prism:Array" },
      { name: "Kaleidoscope", look: "prism:Kaleidoscope" },
    ],
  },
  {
    id: "impossible-stairs",
    name: "Impossible Stairs",
    description: "A white plaster staircase climbs into its own beginning, opens to three gravities and spirals into an endless recursive atrium.",
    states: [
      { name: "Stair", look: "escher:Stair" },
      { name: "Relativity", look: "escher:Relativity" },
      { name: "Infinity", look: "escher:Infinity" },
    ],
  },
  {
    id: "silk-storm",
    name: "Silk Storm",
    description: "One billowing silk veil separates into wind-tossed banners and winds into a towering ribbon vortex. The same fabric throughout.",
    states: [
      { name: "Veil", look: "silk:Veil" },
      { name: "Banners", look: "silk:Banners" },
      { name: "Tornado", look: "silk:Tornado" },
    ],
  },
  {
    id: "ink-bloom",
    name: "Ink Bloom",
    description:
      "A falling dye ring folds into hanging plumes and an outward crown, with translucent pigment bursts on musical fills.",
    states: [
      { name: "Drop", look: "ink:Drop" },
      { name: "Plumes", look: "ink:Plumes" },
      { name: "Nebula", look: "ink:Nebula" },
    ],
  },
  {
    id: "soap-cathedral",
    name: "Soap Cathedral",
    description: "One iridescent bubble gathers draining films and Plateau junctions, then grows into a vaulted cathedral of luminous foam.",
    states: [
      { name: "Bubble", look: "soap:Bubble" },
      { name: "Cluster", look: "soap:Cluster" },
      { name: "Foam", look: "soap:Foam" },
    ],
  },
  {
    id: "dune-sea",
    name: "Dune Sea",
    description: "A low moon grazes wind ripples, a sea of crescent dunes and a towering dust front that reveals dark monoliths. The same desert throughout.",
    states: [
      { name: "Ripples", look: "dunes:Ripples" },
      { name: "Dunes", look: "dunes:Dunes" },
      { name: "Storm", look: "dunes:Storm" },
    ],
  },
  {
    id: "data-monolith",
    name: "Data Monolith",
    description: "Falling digital matter assembles into a scanned monolith and unfolds into a deterministic cellular architecture. Every voxel keeps its address.",
    states: [
      { name: "Rain", look: "voxel:Rain" },
      { name: "Assembly", look: "voxel:Assembly" },
      { name: "Unfold", look: "voxel:Unfold" },
    ],
  },
];
// Earlier shipped definitions of authored worlds. A saved world identical to
// one of them (or to its current definition) is untouched authored data and
// follows the current definition. When an authored world changes, append its
// previous definition here so existing sets upgrade instead of diverging.
const withoutParams = (w) => ({
  ...w,
  states: w.states.map(({ params: _params, ...state }) => state),
});
// Ink Bloom before the 2026-10-16 dark-tank rework (same ids and looks).
const INK_BLOOM_BACKLIT = {
  id: "ink-bloom",
  name: "Ink Bloom",
  description:
    "A falling drop rolls into a descending vortex ring, branches into colliding plumes and fills a backlit tank with marbled ink clouds.",
  states: [
    { name: "Drop", look: "ink:Drop" },
    { name: "Plumes", look: "ink:Plumes" },
    { name: "Nebula", look: "ink:Nebula" },
  ],
};
// Ink Bloom before the round-3 translucent-dye material and fill accents.
const INK_BLOOM_CARVED = {
  id: "ink-bloom",
  name: "Ink Bloom",
  description:
    "A falling drop rolls into a vortex ring whose Widnall lobes pinch off into a crown of daughter rings, each shedding silk bells in a dark tank.",
  states: [
    { name: "Drop", look: "ink:Drop" },
    { name: "Plumes", look: "ink:Plumes" },
    { name: "Nebula", look: "ink:Nebula" },
  ],
};
const HISTORY = [
  MYCELIUM_ACID,
  withoutParams(MYCELIUM_ACID),
  GARDEN_EVOLUTION,
  withoutParams(GARDEN_EVOLUTION),
  INK_BLOOM_BACKLIT,
  INK_BLOOM_CARVED,
  // Living Mycelium before the seeded-network renderer (round 3).
  {
    id: "mycelium",
    name: "Living Mycelium",
    description:
      "One living field grows from understory threads into tidal membranes and a luminous city. Play every stage in between.",
    states: [
      { name: "Understory", look: "mycelium:Hyphal Understory" },
      { name: "Tide", look: "mycelium:Tidal Lamellae" },
      { name: "City", look: "mycelium:Lantern City" },
    ],
  },
  // Garden before the round-3 terrain-to-meadow rework; keep saved sets upgrading.
  {
    id: "garden",
    name: "Afterglow Garden",
    description:
      "A low flight over glowing roots rises above petals into crowns of light. Play every stage in between.",
    states: [
      { name: "Roots", look: "afterglow:Glowing Roots" },
      { name: "Petals", look: "afterglow:Opening Petals" },
      { name: "Bloom", look: "afterglow:Crowns at Dusk" },
    ],
  },
  // Unfolding Garden before the rolled-membrane development (r5).
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
];
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
