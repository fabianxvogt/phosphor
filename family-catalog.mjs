// Catalog identity is separate from renderer identity: saved scene/look ids
// remain stable when related renderers are presented as one family.
export const VISUAL_STYLES = [
  ["geometric", "Geometric"],
  ["organic", "Organic"],
  ["spatial", "Spatial"],
  ["particles", "Particles"],
  ["waves", "Waves"],
  ["fractal", "Fractals"],
];

// Names describe what the implementation draws. Seed density, brightness,
// speed and other continuous controls do not create additional variants.
export const FAMILY_CATALOG = {
  physarum: {
    algorithm: "Agent chemotaxis with a diffusing trail field",
    description:
      "Agents sense, follow and deposit trails, reorganising a living transport network around free space, food nodes or rings.",
    styles: ["organic", "particles"],
    variants: ["Free Foraging", "Food Nodes", "Food Ring", "Moving Food Nodes"],
  },
  caustics: {
    algorithm: "Geometric refraction through a moving heightfield",
    description:
      "Light rays refract through waves and convex lenses. Their concentration forms moving folds, ribbons and focal pearls on a receiving plane.",
    styles: ["waves", "geometric"],
    variants: ["Point Waves", "Crossing Wave Banks", "Lens Sheet"],
  },
  colonization: {
    algorithm: "Space colonization by nearest-branch attraction",
    description:
      "Branch tips grow towards nearby attraction points and remove those they reach, forming canopies, root fans and spatial coral arbors.",
    styles: ["organic", "spatial"],
    variants: ["Canopy", "Root Fan", "Coral Arbor"],
  },
  acid: {
    familyId: "reaction-diffusion",
    family: "Reaction–Diffusion",
    algorithm: "Gray–Scott reaction–diffusion",
    description:
      "Two diffusing chemicals grow spots, veins and membranes. Acid Mycelium shows their fronts in a flat field with sustained local sources.",
    styles: ["organic"],
    variant: "Acid Mycelium",
  },
  evolution: {
    familyId: "reaction-diffusion",
    family: "Reaction–Diffusion",
    algorithm: "Gray–Scott reaction–diffusion",
    description:
      "The same reaction–diffusion principle becomes budding islands and petal relief. Planting density changes the look, while Garden Relief is its rendering variant.",
    styles: ["organic"],
    variant: "Garden Relief",
  },
  magnetic: {
    algorithm: "Dye advection in vector fields",
    description:
      "Two dye layers follow toroidal, vortex and flowing silk fields, leaving luminous threads as they move.",
    styles: ["organic", "waves"],
    variants: ["Torus", "Vortices", "Silk"],
  },
  cathedral: {
    algorithm: "Recursive distance-field architecture",
    description:
      "Raymarched arches, vaults and rose windows repeat into luminous architectural spaces.",
    styles: ["spatial", "geometric", "fractal"],
    variants: ["Nave", "Reliquary", "Rose Window", "Gallery"],
  },
  aquarium: {
    algorithm: "Lenia-inspired continuous cellular automaton",
    description:
      "A ring-shaped neighbourhood steers a continuous density field. Nutrients and transport sustain soft membranes in three habitats.",
    styles: ["organic"],
    variants: ["Lagoon", "Tide", "Gyre"],
  },
  tapestry: {
    algorithm: "Elementary cellular automata",
    description:
      "A Wolfram rule writes each row from the row before it. Cascade, mirror, rails and tunnel views reveal the resulting space–time pattern.",
    styles: ["geometric"],
    variants: ["Cascade", "Mirror", "Rails", "Tunnel"],
  },
  feedback: {
    algorithm: "Iterated image feedback",
    description:
      "Each frame transforms and reinjects the previous image. Repeated rings, portals and woven seeds create visible recursive history.",
    styles: ["geometric", "fractal"],
    variants: ["Halo", "Portal", "Weave", "Procession"],
  },
  interference: {
    algorithm: "Wave superposition and moiré",
    description:
      "Overlapping wave fields create fringes, beats and moiré bands in six distinct compositions.",
    styles: ["waves", "geometric"],
    variants: ["Floor", "Vault", "Screens", "Orbit", "Petals", "Horizons"],
  },
  melt: {
    algorithm: "Parametric knots and surfaces",
    description:
      "Trefoil and figure-eight knots, a Möbius strip and a woven orbit expose their continuous surfaces as they turn.",
    styles: ["spatial", "geometric"],
    variants: ["Trefoil", "Figure Eight", "Möbius Strip", "Woven Orbit"],
  },
  phase: {
    algorithm: "Nearest-neighbour Kuramoto oscillators",
    description:
      "Coupled phases form coherent domains and travelling waves. Gather, launch and return are evolving scores of the same oscillator lattice.",
    styles: ["organic", "waves"],
    variants: ["Manual", "Gather", "Launch", "Return"],
  },
  pulse: {
    algorithm: "Layered rhythmic geometry",
    description:
      "Bars, nested tunnels, horizon grids and shards form sharply readable rhythmic compositions.",
    styles: ["geometric"],
    variants: ["Bars", "Tunnel", "Grid", "Shards"],
  },
  beams: {
    algorithm: "Procedural light beams in haze",
    description:
      "Light banks trace fans, pillars, crossfire and starbursts through a hazy field.",
    styles: ["spatial", "geometric"],
    variants: ["Fan", "Pillars", "Crossfire", "Starburst"],
  },
  julia: {
    algorithm: "Escape-time Julia maps",
    description:
      "Iterated complex maps reveal boundaries between escaping and bounded points as their parameters move.",
    styles: ["fractal"],
    variants: ["Quadratic", "Cubic", "Burning", "Mirror"],
  },
  flight: {
    algorithm: "Raymarched Menger sponge",
    description:
      "A camera travels through the self-similar corridors and voids of a Menger sponge.",
    styles: ["spatial", "fractal", "geometric"],
    variants: ["Corridor", "Spiral", "Shaft", "Narrows"],
  },
  fourspace: {
    algorithm: "4D polytope rotation and projection",
    description:
      "Edges and vertices of four-dimensional polytopes turn through 4D planes and project into the image.",
    styles: ["spatial", "geometric"],
    variants: ["Tesseract", "16-cell", "24-cell", "Duoprism"],
  },
  hyperbolic: {
    algorithm: "Hyperbolic tilings in the Poincaré disk",
    description:
      "Regular polygon tilings shrink toward the disk boundary, revealing infinite hyperbolic structure in a finite frame.",
    styles: ["geometric", "fractal"],
    variants: [
      "Heptagons {7,3}",
      "Pentagons {5,4}",
      "Squares {4,5}",
      "Triangles {3,8}",
    ],
  },
  swarm: {
    algorithm: "Particle advection in prescribed fields",
    description:
      "Particles follow curl flow, a de Jong map, differential rotation or radial bursts. Curl flow resembles a flock but has no neighbour-based Boids rules.",
    styles: ["particles", "organic"],
    variants: [
      "Curl Flow",
      "de Jong Field",
      "Differential Galaxy",
      "Radial Bursts",
    ],
  },
  life: {
    algorithm: "Life-like and multi-state cellular automata",
    description:
      "Discrete neighbourhood rules generate gliders, replicators, firing waves and cyclic spirals. Each named rule changes how cells update.",
    styles: ["organic", "geometric"],
    variants: [
      "Conway B3/S23",
      "HighLife B36/S23",
      "Day & Night",
      "Brian’s Brain",
      "Cyclic",
      "Bosco",
    ],
  },
  attractor: {
    algorithm: "Differential-equation and map attractors",
    description:
      "Trajectories trace Lorenz, Rössler, Aizawa, Thomas, Halvorsen and Clifford systems, exposing their characteristic lobes and folds.",
    styles: ["particles", "spatial"],
    variants: [
      "Lorenz",
      "Rössler",
      "Aizawa",
      "Thomas",
      "Halvorsen",
      "Clifford",
    ],
    variantStyles: { 5: ["particles", "fractal"] },
  },
  mandelbrot: {
    algorithm: "Escape-time fractal sets",
    description:
      "Progressive zooms reveal escaping and bounded orbits in Mandelbrot, Burning Ship, Tricorn, Multibrot and Celtic maps.",
    styles: ["fractal"],
    variants: ["Mandelbrot", "Burning Ship", "Tricorn", "Multibrot", "Celtic"],
  },
  sandpile: {
    algorithm: "Abelian sandpile toppling",
    description:
      "Cells with too many grains distribute them to neighbours. Cascading topples create avalanche fronts and coloured residual patterns.",
    styles: ["organic", "geometric", "fractal"],
    variants: ["Centre Pile", "Critical Rain", "Wandering Sources", "Identity"],
  },
  newton: {
    algorithm: "Polynomial root-finding basins",
    description:
      "Pixels are coloured by the root reached through Newton or Halley iteration. Relaxation and Nova perturbations reshape their basin boundaries.",
    styles: ["fractal"],
    variants: ["z³ − 1", "Wandering Roots", "Halley", "Nova", "Roots of Unity"],
  },
  flame: {
    algorithm: "Chaos-game iterated function systems",
    description:
      "Repeated affine and nonlinear transforms accumulate luminous sample density. Fern and dragon variants use their own characteristic IFS maps.",
    styles: ["fractal", "particles", "organic"],
    variants: [
      "Swirl",
      "Sinusoidal",
      "Spherical",
      "Julia",
      "Barnsley Fern",
      "Heighway Dragon",
    ],
  },
  quasicrystal: {
    algorithm: "de Bruijn multigrid tilings",
    description:
      "Intersecting grid families construct rhombi with non-repeating order. Penrose, Ammann–Beenker, sevenfold and twelvefold tilings have distinct symmetries.",
    styles: ["geometric"],
    variants: ["Penrose", "Ammann–Beenker", "Sevenfold", "Twelvefold"],
  },
  voronoi: {
    algorithm: "Nearest-site partitions and Lloyd relaxation",
    description:
      "Each point belongs to a nearby site. Centroid relaxation, changing distance metrics, weighted power cells and the Delaunay dual expose different structures.",
    styles: ["geometric", "organic"],
    variants: [
      "Lloyd Relaxation",
      "Metric Morph",
      "Power Diagram",
      "Delaunay Dual",
    ],
  },
  ripple: {
    algorithm: "Discrete wave equation",
    description:
      "Waves propagate through a simulated tank, interfere behind slits, refract through lenses and combine from phased emitters.",
    styles: ["waves"],
    variants: ["Slits & Gratings", "Raindrops", "Lens", "Phased Array"],
  },
  turmite: {
    algorithm: "Generalised Langton ants",
    description:
      "An ant reads a cell state, turns left or right and writes the next state. Turn sequences create highways, symmetric growth and dense trails.",
    styles: ["geometric", "organic"],
    variants: [
      "RL",
      "LLRR",
      "LRRRRRLLR",
      "RRLLLRLLLRRR",
      "RLR",
      "LLRRRLRLRLLR",
    ],
  },
  kleinian: {
    algorithm: "Möbius maps and circle inversions",
    description:
      "Repeated inversions and Möbius maps build nested circle gaskets, Schottky pearls, spiral tunnels and closed Steiner chains.",
    styles: ["fractal", "geometric"],
    variants: ["Apollonian", "Schottky", "Loxodromic Tunnel", "Steiner Porism"],
  },
  harmonograph: {
    algorithm: "Coupled oscillator curves",
    description:
      "Oscillator frequency ratios draw Lissajous figures, damped pendulum paths, spirographs and projected three-dimensional knots.",
    styles: ["geometric"],
    variants: [
      "Lissajous",
      "Damped Harmonograph",
      "Spirograph",
      "Lissajous Knot",
    ],
    variantStyles: { 3: ["geometric", "spatial"] },
  },
  wallpaper: {
    algorithm: "Symmetry-averaged periodic wave functions",
    description:
      "Periodic complex waves are averaged over rotations, mirrors and glides to preserve one of the seventeen plane symmetry groups.",
    styles: ["geometric", "waves"],
    variants: [
      "p1",
      "p2",
      "pm",
      "pg",
      "cm",
      "pmm",
      "pmg",
      "pgg",
      "cmm",
      "p4",
      "p4m",
      "p4g",
      "p3",
      "p3m1",
      "p31m",
      "p6",
      "p6m",
    ],
  },
  truchet: {
    algorithm: "Oriented tile networks",
    description:
      "Locally oriented arc, diagonal and hexagonal tiles join into long connected paths, with a log-polar view turning the network into a tunnel.",
    styles: ["geometric"],
    variants: ["Smith Arcs", "10 PRINT", "Hexagons", "Log-polar Tunnel"],
  },
  hilbert: {
    algorithm: "Recursive space-filling curves",
    description:
      "Hilbert, Moore and Peano curves visit every cell at each refinement level. Continuous refinement exposes the relationship between parent and child paths.",
    styles: ["geometric", "fractal"],
    variants: ["Hilbert", "Moore", "Peano", "Hilbert Locality"],
  },
  phyllotaxis: {
    algorithm: "Golden-angle point placement",
    description:
      "Vogel spirals and Fibonacci sphere placement distribute points through a golden-angle sequence. Angle sweeps expose spirals and rational spokes.",
    styles: ["organic", "geometric", "particles"],
    variants: ["Sunflower", "Angle Sweep", "Fibonacci Sphere", "Growth"],
    variantStyles: { 2: ["organic", "geometric", "particles", "spatial"] },
  },
  hopf: {
    algorithm: "Stereographic Hopf fibres",
    description:
      "Circles over points on a sphere project from four dimensions into linked rings. Latitude sets, loxodromes and scattered base points select the fibres.",
    styles: ["spatial", "geometric"],
    variants: [
      "Latitude Torus",
      "Nested Tori",
      "Loxodrome Fibres",
      "Scattered Rings",
    ],
  },
  chladni: {
    algorithm: "Resonant modes with nodal sand settling",
    description:
      "Grains migrate toward quiet nodal lines of square, circular Bessel or hexagonal wave fields. Changing the mode lets the sand visibly resettle.",
    styles: ["particles", "waves", "geometric"],
    variants: [
      "Square Plate",
      "Mode Morph",
      "Circular Drumhead",
      "Faraday Hexagons",
    ],
  },
  domain: {
    algorithm: "Complex-function domain colouring",
    description:
      "Phase becomes colour and modulus becomes light. Rational, zeta, Möbius and iterated polynomial functions reveal zeros, poles and conformal grids.",
    styles: ["geometric", "waves"],
    variants: ["Rational", "Riemann Zeta", "Möbius Net", "Iterated z² + c"],
  },
};

export function familyMetadata(scene) {
  const metadata = FAMILY_CATALOG[scene.id] ?? scene.catalog ?? {};
  return {
    familyId: metadata.familyId ?? scene.id,
    family: metadata.family ?? scene.name,
    sourceFamily: scene.name,
    algorithm: metadata.algorithm ?? scene.algorithm ?? "Generative visual",
    description:
      metadata.description ??
      scene.description?.split(/(?<=[.!?])\s/)[0] ??
      "A generative visual with its own authored looks.",
    styles: [...(metadata.styles ?? [])],
  };
}

// null asks the caller to use its schema-based fallback for future families.
export function catalogVariant(scene, params) {
  const metadata = FAMILY_CATALOG[scene.id] ?? scene.catalog;
  if (!metadata) return null;
  if (metadata.variant) return metadata.variant;
  const value = Math.round(params[scene.type?.key]);
  const name = metadata.variants?.[value];
  if (!name) return null;
  if (scene.id === "tapestry")
    return `Rule ${Math.round(params.rule)} · ${name}`;
  if (scene.id === "life" && value === 4)
    return `Cyclic · ${["313", "R1/T2/C5", "Griffeath CCA", "R3/T5/C8"][Math.round(params.comp)] ?? "spirals"}`;
  return name;
}

export function catalogStyles(scene, params) {
  const metadata = FAMILY_CATALOG[scene.id] ?? scene.catalog;
  const value = Math.round(params[scene.type?.key]);
  return [...(metadata?.variantStyles?.[value] ?? metadata?.styles ?? [])];
}

// Group only presentation metadata. Renderer, preset, rating and favourite
// ids are never rewritten; callers can still filter by a legacy scene id.
export function catalogFamilies(looks, sourceFamilies = []) {
  const grouped = new Map();
  for (const source of sourceFamilies) {
    const metadata =
      looks.find((look) => look.sceneId === source.id) ??
      familyMetadata(source);
    if (!grouped.has(metadata.familyId))
      grouped.set(metadata.familyId, {
        id: metadata.familyId,
        name: metadata.family,
        sceneIds: [],
        count: 0,
      });
    grouped.get(metadata.familyId).sceneIds.push(source.id);
  }
  for (const look of looks) {
    const id = look.familyId ?? look.sceneId;
    if (!grouped.has(id))
      grouped.set(id, { id, name: look.family, sceneIds: [], count: 0 });
    const family = grouped.get(id);
    if (!family.sceneIds.includes(look.sceneId))
      family.sceneIds.push(look.sceneId);
    family.count++;
  }
  return [...grouped.values()];
}

export function matchesCatalogIdentity(look, { family = "", style = "" } = {}) {
  return (
    (!family ||
      family === (look.familyId ?? look.sceneId) ||
      family === look.sceneId) &&
    (!style || look.styles?.includes(style))
  );
}
