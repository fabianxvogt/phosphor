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
  aurora: {
    algorithm: "Folded rayed sheets along parallel magnetic field lines",
    description: "Folded curtains of field-aligned light travel over a frozen lake, then gather into an overhead magnetic corona. The same rays throughout.",
    styles: ["spatial", "waves"],
    variants: ["Glow", "Curtains", "Corona"],
  },
  orrery: {
    algorithm: "Beveled involute gears with exact integer-tooth meshing and orbital ratios",
    description: "Involute gears open into an exact-ratio planetary machine and a vast clockwork cathedral.",
    styles: ["spatial", "geometric"],
    variants: ["Gears", "Orrery", "Clockwork"],
  },
  storm: {
    algorithm: "Seeded stepped-leader trees inside bounded analytic cloud volumes",
    description: "A distant bank of heat lightning rises into towering cumulonimbus and a rotating supercell. Seeded branching leaders illuminate the clouds from within.",
    styles: ["spatial", "organic"],
    variants: ["Haze", "Towers", "Supercell"],
  },
  prism: {
    algorithm: "Snell refraction through triangular glass with Cauchy dispersion",
    description: "A turning glass prism disperses a white beam, grows an optical array and opens into a cathedral of glass and spectral caustics.",
    styles: ["spatial", "geometric"],
    variants: ["Shard", "Array", "Kaleidoscope"],
  },
  escher: {
    algorithm: "Projective Penrose stair covering space and exact log-polar Droste recursion",
    description: "A white plaster staircase climbs into its own beginning, opens to three gravities and spirals into an endless recursive atrium.",
    styles: ["spatial", "geometric", "fractal"],
    variants: ["Stair", "Relativity", "Infinity"],
  },
  silk: {
    algorithm: "Strouhal travelling-wave cloth and unit-speed conical ribbon helices",
    description: "One billowing silk veil separates into wind-tossed banners and winds into a towering ribbon vortex. The same fabric throughout.",
    styles: ["spatial", "waves", "organic"],
    variants: ["Veil", "Banners", "Tornado"],
  },
  ink: {
    algorithm: "Kelvin vortex rings and analytic marbled pigment transport",
    description: "A falling drop rolls into a descending vortex ring, branches into colliding plumes and fills a backlit tank with marbled ink clouds.",
    styles: ["organic", "spatial"],
    variants: ["Drop", "Plumes", "Nebula"],
  },
  ferro: {
    algorithm: "Raymarched ferrofluid with a Rosensweig hexagonal spike lattice",
    description: "A black mirror pool grows a hexagonal crown of ferrofluid spikes, then lifts into a floating chrome sculpture with orbiting droplets. Palette light strips reflect in the dark metal.",
    styles: ["spatial", "organic"],
    variants: ["Pool", "Crown", "Sculpture"],
  },
  tide: {
    algorithm: "Deep-water Gerstner waves and a continuous spiral heightfield",
    description:
      "A moonlit dispersive ocean gathers living crests and opens into a vast glowing maelstrom.",
    styles: ["spatial", "waves"],
    variants: ["Calm", "Swell", "Maelstrom"],
  },
  laser: {
    algorithm: "Hinged vector planes and closed-form Gaussian beam scattering",
    description: "A vector plane raises wireframe towers, then folds into a vaulted laser cathedral. Crisp material grid lines and sweeping laser fans inhabit analytically integrated scattering haze.",
    styles: ["geometric", "spatial"],
    variants: ["Horizon", "Towers", "Tunnel"],
  },
  fold: {
    algorithm: "Rigid folding of polyhedral nets along hinge chains",
    description:
      "A creased sheet of Platonic nets folds along exact hinge chains into closed solids, which rise, tumble and burst into a vortex of streaking shards.",
    styles: ["geometric", "spatial"],
    variants: ["Sheet", "Fold", "Shards"],
  },
  ribbons: {
    algorithm:
      "Fixed-step RK4 trajectories in three flows, drawn as lit ribbons",
    description:
      "Hundreds of trajectories integrated at once in the Lorenz, Aizawa and Thomas flows. Development carries the same ribbons from wings through a vortex into a labyrinth.",
    styles: ["spatial", "particles"],
    variants: ["Wings", "Vortex", "Labyrinth"],
  },
  fibration: {
    algorithm: "Stereographic Hopf fibres as lit tube meshes",
    description:
      "Exact great circles of the 3-sphere, projected to linked round circles in space: one torus of Villarceau circles blooms into nested tori and the full bundle.",
    styles: ["geometric", "spatial"],
    variants: ["Torus", "Nest", "Bundle"],
  },
  crystal: {
    algorithm: "Lattice-aligned growth of faceted hexagonal prisms",
    description:
      "Seeded crystals sprout faceted prisms, grow into lattice-aligned druses and line a luminous cavern hall the camera glides through.",
    styles: ["geometric", "spatial"],
    variants: ["Seeds", "Lattice", "Hall"],
  },
  abyss: {
    algorithm:
      "Pulsing parametric medusae, sea-pen light waves and disturbance-lit plankton",
    description:
      "Deep water lit only by living light: lone medusae and blinking plankton become pulsing jellyfish blooms and a glowing reef the camera glides over.",
    styles: ["organic", "spatial", "particles"],
    variants: ["Sparks", "Swarms", "Reef"],
  },
  kinetic: {
    algorithm:
      "Kinetic sphere lattice: travelling-wave heightfields and morphing parametric surfaces on one index grid",
    description:
      "A club kinetic installation: thousands of glowing spheres on threads ripple under a motor ceiling, run interfering wave choreographies and gather into one floating surface that morphs between sphere, torus, Möbius band and saddle.",
    styles: ["geometric", "spatial"],
    variants: ["Ceiling", "Waves", "Sculpture"],
  },
  descent: {
    algorithm: "Raymarched multi-scale sponge with a morphing coarse carving",
    description:
      "One continuous flight: a Menger sponge corridor widens into a pillared cavern lit through ceiling shafts, then opens into an endless city of recursive towers.",
    styles: ["spatial", "fractal", "geometric"],
    variants: ["Corridor", "Cavern", "City"],
  },
  horizon: {
    algorithm: "Schwarzschild null geodesics (Binet equation, Encke RK4) with a thin Doppler-beamed disk",
    description:
      "A black hole traced ray by ray: the sky lenses around the shadow, a tidally stretched star feeds a spiral that heats into a blazing disk whose far side arches over and under the photon ring, with relativistic jets at the peak.",
    styles: ["spatial"],
    variants: ["Star", "Infall", "Horizon"],
  },
  metamorphosis: {
    algorithm: "Continuous deformation of a connected parametric mesh",
    description:
      "One geometric organism becomes filaments, membranes and blossoms without replacing its centres or branches.",
    styles: ["organic", "spatial"],
    variants: ["Filaments", "Membrane", "Blossom"],
  },
  murmuration: {
    algorithm:
      "Topological-neighbour flocking with a Lagrangian fold field, an excitable startle lattice and formation springs",
    description:
      "Birds that always follow the same few neighbours wander loose, surge into a folding cloud that startle waves cross when a falcon strikes, and fly vortex, ribbon and twister formations.",
    styles: ["particles", "spatial", "organic"],
    variants: ["Loose", "Surge", "Formation"],
  },
  nebula: {
    algorithm:
      "Zel'dovich web, density-wave orbits and Sedov–Taylor shells on one star population",
    description:
      "The same stars condense from a cosmic-web cloud into a spiral galaxy whose arms are crowded orbits, then collapse and ignite into a filamentary supernova shell.",
    styles: ["particles", "spatial"],
    variants: ["Dust", "Spiral", "Nova"],
  },
  afterglow: {
    algorithm: "Gray–Scott morphogens as a night garden",
    description:
      "One morphogen field grows glowing roots, translucent petals and emissive crowns while the camera rises from a low flight to an overhead view.",
    styles: ["organic", "spatial"],
    variants: ["Roots", "Petals", "Bloom"],
  },
  mycelium: {
    algorithm: "Gray–Scott reaction–diffusion as a lit terrain",
    description:
      "One reaction–diffusion field becomes understory threads, tidal membranes and a luminous city while its chemistry keeps running.",
    styles: ["organic", "spatial"],
    variants: ["Understory", "Tide", "City"],
  },
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
      "Modulus becomes terrain height and phase becomes coloured contour lines. Rational, zeta, Möbius and iterated polynomial functions sink their zeros as pits and raise their poles as luminous spires.",
    styles: ["geometric", "waves"],
    variants: ["Rational", "Riemann Zeta", "Möbius Net", "Iterated z² + c"],
  },
  magma: {
    algorithm:
      "Raymarched Voronoi basalt crust with exact seams, flow-layer lava and ballistic ejecta",
    description:
      "A volcanic field whose basalt plates breathe heat through their seams, split into lava rivers with drifting crust and embers, and open into a lava lake whose fountain throws glowing ejecta under an ash plume.",
    styles: ["spatial", "organic"],
    variants: ["Crust", "Rivers", "Eruption"],
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
