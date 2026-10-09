// Writes catalog-curated.mjs, the editorial look order (D69).
//   node scripts/curate.mjs
// Each family has a strength F (signature algorithm, club impact, how
// trippy) and its looks in best-first order. A look scores F − 1.5 × its
// rank inside the family; the catalog lists looks by score. Add new looks
// here (the catalog test fails until every authored look is listed).
import { readFileSync, writeFileSync } from "node:fs";
import scenes from "../scenes.mjs";

const families = {
  mandelbrot: [
    10,
    [
      "Seahorse Valley",
      "Spiral Tunnel",
      "Minibrot Halo",
      "Burning Armada",
      "Elephant March",
      "Filament Lace",
      "Celtic Braid",
      "Ship Rigging",
      "Cubic Bloom",
      "Tricorn Nursery",
    ],
  ],
  flight: [
    9.8,
    [
      "Long Corridor",
      "Neon Spiral",
      "Corkscrew",
      "Mine Shaft",
      "Narrows",
      "Ember Drift",
    ],
  ],
  cathedral: [
    9.6,
    [
      "Prismatic Nave",
      "Midnight Rose",
      "Ember Vault",
      "Opal Reliquary",
      "Brass Procession",
      "Enamel Glide",
      "Enamel Still",
    ],
  ],
  life: [
    9.5,
    [
      "Gosper Barrage",
      "Cyclic Spirals",
      "Brian's Brain Storm",
      "Replicator Field",
      "Glider Rain",
      "Gun & Eater",
      "Methuselah Bloom",
      "Day & Night Lava",
      "313 Vortex",
      "Bosco Bugs",
      "Primordial Soup",
      "Wide Spirals",
      "Brain Sparks",
    ],
  ],
  flame: [
    9.4,
    [
      "Swirl Flame",
      "Julia Mandala",
      "Kaleido Flame",
      "Heighway Dragon",
      "Barnsley Fern",
      "Spherical Bloom",
      "Dragon Rose",
      "Sinusoid Weave",
      "Julia Flame",
      "Fern Snowflake",
    ],
  ],
  attractor: [
    9.3,
    [
      "Butterfly",
      "Aizawa Bloom",
      "Halvorsen Propeller",
      "Thomas Weave",
      "Clifford Dust",
      "Rössler Ribbon",
      "Inside the Lobe",
      "Comet Rain",
    ],
  ],
  tapestry: [
    9.2,
    [
      "30 · Wild silk",
      "110 · Persistent knots",
      "90 · Nested linen",
      "30 · Centre column",
      "150 · Interference lace",
      "45 · Chaos fan",
      "41 · Glider loom",
      "184 · Traffic ribbon",
      "126 · Burning fringe",
      "54 · Twin brocade",
      "73 · Walled gardens",
      "102 · Pascal slope",
      "18 · Kink rails",
      "22 · Sparse ceremony",
    ],
  ],
  hyperbolic: [
    9.0,
    [
      "Heptagon Weave",
      "Triangle Storm",
      "Square Abyss",
      "Endless Floor",
      "Pentagon Lattice",
      "Quiet Disk",
    ],
  ],
  quasicrystal: [
    8.9,
    [
      "Penrose Rhombs",
      "Phason Storm",
      "Ammann–Beenker",
      "Penrose Ribbons",
      "Dodecagonal Star",
      "Heptagonal Lace",
      "Octagonal Glass",
      "Close Rhombs",
    ],
  ],
  fourspace: [
    8.8,
    [
      "Turning Tesseract",
      "Twenty-four Cell",
      "Duoprism Torus",
      "Hypercube Close-up",
      "Sixteen Cell",
      "Spinning Lattice",
    ],
  ],
  kleinian: [
    8.7,
    [
      "Apollonian Flow",
      "Indra's Pearls",
      "Steiner Porism",
      "Kissing Necklace",
      "Loxodromic Dive",
      "Integer Gasket",
      "Nine-ring Chain",
      "Cantor Dust",
      "Gasket Lens",
      "Steiner Triplets",
      "Hyperbolic Dive",
    ],
  ],
  harmonograph: [
    8.4,
    [
      "Lissajous Knot",
      "Precessing 5:8",
      "Pendulum Drawing",
      "Spirograph Rose",
      "Knot 5:8:13",
      "Scope 3:2",
      "Harmonograph 3:4",
      "Seven Petals",
      "Octave Ribbon",
      "Slow Spiral",
    ],
  ],
  wallpaper: [
    8.3,
    [
      "p6m Snowflake",
      "p4g Pinwheels",
      "p3 Triskelion",
      "pgg Weave",
      "p6 Spirals",
      "p31m Lace",
      "p4m Tiles",
      "p3m1 Kaleidoscope",
      "cmm Diamonds",
      "p4 Turnstiles",
      "pmg Ribbons",
      "cm Feathers",
      "pg Footprints",
      "p2 Pinwheel Field",
      "pmm Panels",
      "pm Mirrors",
      "p1 Drift",
    ],
  ],
  truchet: [
    8.1,
    [
      "Truchet Tunnel",
      "Smith Rivers",
      "Pulse Field",
      "Spiral Weave",
      "Hex Rivers",
      "Fat Loops",
      "10 PRINT",
      "Flip Storm",
      "Hex Lace",
      "Diagonal Maze",
    ],
  ],
  hilbert: [
    8.0,
    [
      "Hilbert Refinement",
      "Locality Flow",
      "Moore Chase",
      "Peano Weave",
      "Hilbert Strip",
      "Locality Blocks",
      "Moore Loop",
      "Deep Hilbert",
      "Peano Steps",
    ],
  ],
  phyllotaxis: [
    8.2,
    [
      "Fibonacci Arms",
      "Growing Head",
      "Golden Sweep",
      "Fibonacci Sphere",
      "Sunflower",
      "Seed Fountain",
      "Spokes and Spirals",
      "Golden Globe",
      "Dense Head",
    ],
  ],
  hopf: [
    8.4,
    [
      "Clifford Torus",
      "Linked Rings",
      "Through Infinity",
      "Nested Tori",
      "Loxodrome Fibres",
      "Ring Storm",
      "Thin Torus",
      "Fibre Bloom",
    ],
  ],
  chladni: [
    8.5,
    [
      "Bessel Rings",
      "Chladni Plate",
      "Drumhead",
      "Faraday Hexagons",
      "Fine Sand",
      "Mode Morph",
      "Fast Modes",
      "Honeycomb Sand",
    ],
  ],
  newton: [
    8.7,
    [
      "Wada Beads",
      "Nova Tendrils",
      "Halley's Flowers",
      "Wandering Five",
      "Relaxed Spirals",
      "Three Roots",
      "Nova",
      "Unity Star",
      "Under-relaxed Lace",
    ],
  ],
  ripple: [
    8.6,
    [
      "Double Slit",
      "Phased Array",
      "Grating Lobes",
      "Glass Lens",
      "Kick Rain",
      "Grating",
      "Monsoon",
      "Single Slit",
      "Dense Lens",
      "Sonar Rain",
    ],
  ],
  turmite: [
    8.5,
    [
      "Langton's Highway",
      "Highway Crash",
      "Symmetric Bloom",
      "Ant Colony",
      "Triangle Builder",
      "Square Filler",
      "Swarm of Twelve",
      "Convoluted Highway",
      "Chaotic Growth",
      "Twin Blooms",
    ],
  ],
  julia: [
    8.5,
    [
      "Seahorse Valley",
      "Dust Filaments",
      "Burning Coast",
      "Cubic Lace",
      "Mirror Bloom",
      "Storm Lens",
    ],
  ],
  sandpile: [
    8.4,
    [
      "Mandala Bloom",
      "Identity",
      "Critical Rain",
      "Four Crowns",
      "Avalanche Field",
      "Kick Sand",
      "Hexagram Drift",
      "Twin Fountains",
      "Identity Shapes",
      "Grain by Grain",
    ],
  ],
  voronoi: [
    8.3,
    [
      "Honeycomb Relax",
      "Metric Morph",
      "Power Bubbles",
      "Delaunay Net",
      "Lloyd Storm",
      "Concave Stars",
      "Taxicab Diamonds",
      "Chebyshev Blocks",
      "Laguerre Froth",
      "Gabriel Lace",
      "Big Cells",
    ],
  ],
  beams: [
    8.2,
    [
      "Laser Fan",
      "Crossfire",
      "Starburst",
      "Strobe Fan",
      "Cathedral Haze",
      "Slow Searchlights",
    ],
  ],
  swarm: [
    8.0,
    [
      "Spiral Galaxy",
      "Murmuration",
      "Attractor Storm",
      "Kick Bloom",
      "Strange Silk",
      "Dust Drift",
    ],
  ],
  feedback: [
    8.0,
    [
      "Prism Descent",
      "Evolving Tunnel",
      "Molten Reliquary",
      "Votive Loom",
      "Quiet Apse",
      "Clean Recovery",
    ],
  ],
  pulse: [
    7.9,
    [
      "Ring Dive",
      "Square Tunnel",
      "Shard Crown",
      "Scanner Bars",
      "Horizon Grid",
      "Slow Gate",
    ],
  ],
  interference: [
    7.8,
    [
      "Moire Veil",
      "Orbit Loom",
      "Petal Resonance",
      "Golden Lattice",
      "Twin Tides",
      "Crossed Loom",
      "Bent Horizons",
      "Ripple Resonance",
      "Tempo Veil",
    ],
  ],
  acid: [
    7.7,
    [
      "Mycelial City",
      "Vein Cathedral",
      "Tidal Membrane",
      "Lime Bloom",
      "Night Orchard",
      "Signal Understory",
    ],
  ],
  aquarium: [
    7.5,
    [
      "Moon Jellies · Gyre",
      "Spore Carnival · Gyre",
      "Ribbon Grazers · Tide",
      "Lantern Shoal · Tide",
      "Glass Twins · Lagoon",
      "Solitary Pearl · Lagoon",
    ],
  ],
  melt: [
    7.4,
    [
      "Porcelain Trefoil",
      "Pearlescent Möbius",
      "Velvet Woven Orbit",
      "Brushed Figure Eight",
      "Foil Ribbon Eclipse",
      "Enamel Still Study",
    ],
  ],
  magnetic: [
    7.2,
    [
      "Storm Loom",
      "Twin Choir",
      "Liquid Silk",
      "Split Counterpoint",
      "Breathing Halo",
      "Quiet Torus",
    ],
  ],
  phase: [
    7.0,
    [
      "Launch · crossing chorus",
      "Launch · long wave",
      "Gather · domain mosaic",
      "Return · after the storm",
      "Return · amber islands",
      "Gather · quiet porcelain",
    ],
  ],
  evolution: [
    6.5,
    [
      "Coral Orchard",
      "Festival of Buds",
      "Fern Manuscript",
      "Pearl Nursery",
      "Moonroot",
      "Quiet Herbarium",
    ],
  ],
};
const ids = new Set(
  scenes.flatMap((s) => s.presets.map((p) => `${s.id}:${p.name}`)),
);
const entries = [];
for (const [id, [F, names]] of Object.entries(families))
  names.forEach((name, rank) =>
    entries.push({ id: `${id}:${name}`, score: F - 1.5 * rank, F }),
  );
for (const e of entries)
  if (!ids.has(e.id)) throw new Error(`unknown look ${e.id}`);
for (const id of ids)
  if (!entries.some((e) => e.id === id))
    throw new Error(`${id} has no place in the order`);
entries.sort((a, b) => b.score - a.score || b.F - a.F);

const file = new URL("../catalog-curated.mjs", import.meta.url);
const src = readFileSync(file, "utf8");
const head = src.slice(0, src.indexOf("export const CURATED = ["));
writeFileSync(
  file,
  `${head}export const CURATED = [\n${entries.map((e) => `  ${JSON.stringify(e.id)},`).join("\n")}\n];\n`,
);
console.log(`${entries.length} looks ordered`);
