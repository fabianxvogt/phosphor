# Phosphor catalog: families, variants, looks

Status 2026-10-14: **45 renderers, 44 catalog families, 373 authored looks**, including five continuous world families added in Worlds wave 1. The unified catalog includes every authored look and the owner's own looks. No scene, preset, favourite, rating or own-look id is removed by the naming cleanup.

- A **family** has a coherent visual and algorithmic principle. Related renderers can share a catalog identity.
- A **variant** changes a rule, map, topology, lattice, symmetry, projection or meaningful rendering structure.
- A **look** gives a variant authored parameters, palette and seed. Density, brightness and speed alone do not create a new variant.

The stable renderer registry is [scenes.mjs](../scenes.mjs). Public family identities, short algorithm explanations, explicit variant names and visual filters live in [family-catalog.mjs](../family-catalog.mjs); [catalog.mjs](../catalog.mjs) joins them to snapshots. Future scenes may declare a catalog descriptor; generic schema labels remain a fallback. Authoring guidance is in [families/AUTHORING.md](families/AUTHORING.md).

## Finding and playing looks

Every card shows its **family · variant** below the look name. **Rate & edit** reveals a short explanation of what its algorithm does alongside ratings and editing. Search includes look, family, legacy source-family name, variant, algorithm and visual style; it ignores case and accents.

The family filter combines with one visual-style filter: **Geometric, Organic, Spatial, Particles, Waves, Fractals**. Styles can overlap. Where appearance changes by variant, the tags follow the variant: a Fibonacci sphere and a Lissajous knot are spatial; the flat sunflower and Lissajous figure are not.

Ratings remain 0–10 in half steps; **0** means never play, and unrated looks count as 5 for weighted autopilot selection. Favourites stay first. Equal ratings retain the editorial order in [catalog-curated.mjs](../catalog-curated.mjs). Own looks keep their palette, transition and optional saved family-rhythm override when turned into a playable catalog clip. The first 32 visible looks remain keyboard playable.

## Consistency decisions

**Reaction–Diffusion** groups legacy acid and evolution without changing renderer or look ids. Both use Gray–Scott chemistry. **Acid Mycelium** is the planar-front variant; **Garden Relief** renders budding islands and petal relief. Evolution's planting density remains a look parameter, rather than producing labels such as “Planting density 9”. Runtime family rhythm remains keyed by its renderer so existing patterns and variant-specific effect availability remain intact.

**Penrose** is a named variant of **Aperiodic Tilings**. **Wallpaper Groups** use the actual names p1 through p6m, rather than “Group 16”. Cathedral architecture uses Nave, Reliquary, Rose Window and Gallery. **Causal Tapestry** exposes its Wolfram rule as well as its view, and cyclic Life looks expose their actual cyclic rule flavour.

**Particle Swarm** is described as particles advected through prescribed fields. Curl Flow has no neighbour-based Boids rules; its murmuration-like appearance is not a claim of a Boids simulation. The de Jong field remains a distinct swarm variant, while the Strange Attractors family presents traced map/ODE attractors.

## Registered catalog families

The renderer ids below remain the keys used in saved snapshots. Counts describe authored looks, not owner-created looks or independent algorithms.

| Family                   | Renderer ids    | Algorithm                                    | Structural variants / views                                                                   | Looks |
| ------------------------ | --------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- | ----- |
| Reaction–Diffusion       | acid, evolution | Gray–Scott reaction–diffusion                | Acid Mycelium / Garden Relief                                                                 | 12    |
| Magnetic Choir           | magnetic        | Dye advection in vector fields               | Torus / Vortices / Silk                                                                       | 6     |
| Cathedrals of Error      | cathedral       | Recursive distance-field architecture        | Nave / Reliquary / Rose Window / Gallery                                                      | 7     |
| Alien Aquarium           | aquarium        | Lenia-inspired continuous cellular automaton | Lagoon / Tide / Gyre                                                                          | 6     |
| Causal Tapestry          | tapestry        | Elementary cellular automata                 | Cascade / Mirror / Rails / Tunnel                                                             | 14    |
| Feedback Chapel          | feedback        | Iterated image feedback                      | Halo / Portal / Weave / Procession                                                            | 6     |
| Interference Rituals     | interference    | Wave superposition and moiré                 | Floor / Vault / Screens / Orbit / Petals / Horizons                                           | 9     |
| Topological Melt         | melt            | Parametric knots and surfaces                | Trefoil / Figure Eight / Möbius Strip / Woven Orbit                                           | 6     |
| Phase Transition Theatre | phase           | Nearest-neighbour Kuramoto oscillators       | Manual / Gather / Launch / Return                                                             | 6     |
| Pulse Geometry           | pulse           | Layered rhythmic geometry                    | Bars / Tunnel / Grid / Shards                                                                 | 6     |
| Fractal Flight           | flight          | Raymarched Menger sponge                     | Corridor / Spiral / Shaft / Narrows                                                           | 6     |
| Light Beams              | beams           | Procedural light beams in haze               | Fan / Pillars / Crossfire / Starburst                                                         | 6     |
| Julia Observatory        | julia           | Escape-time Julia maps                       | Quadratic / Cubic / Burning / Mirror                                                          | 6     |
| Fourth Dimension         | fourspace       | 4D polytope rotation and projection          | Tesseract / 16-cell / 24-cell / Duoprism                                                      | 6     |
| Hyperbolic Loom          | hyperbolic      | Hyperbolic tilings in the Poincaré disk      | Heptagons {7,3} / Pentagons {5,4} / Squares {4,5} / Triangles {3,8}                           | 6     |
| Particle Swarm           | swarm           | Particle advection in prescribed fields      | Curl Flow / de Jong Field / Differential Galaxy / Radial Bursts                               | 6     |
| Game of Life             | life            | Life-like and multi-state cellular automata  | Conway B3/S23 / HighLife B36/S23 / Day & Night / Brian’s Brain / Cyclic / Bosco               | 13    |
| Strange Attractors       | attractor       | Differential-equation and map attractors     | Lorenz / Rössler / Aizawa / Thomas / Halvorsen / Clifford                                     | 8     |
| Mandelbrot Dive          | mandelbrot      | Escape-time fractal sets                     | Mandelbrot / Burning Ship / Tricorn / Multibrot / Celtic                                      | 10    |
| Abelian Sandpile         | sandpile        | Abelian sandpile toppling                    | Centre Pile / Critical Rain / Wandering Sources / Identity                                    | 10    |
| Newton Basins            | newton          | Polynomial root-finding basins               | z³ − 1 / Wandering Roots / Halley / Nova / Roots of Unity                                     | 9     |
| Fractal Flames           | flame           | Chaos-game iterated function systems         | Swirl / Sinusoidal / Spherical / Julia / Barnsley Fern / Heighway Dragon                      | 10    |
| Aperiodic Tilings        | quasicrystal    | de Bruijn multigrid tilings                  | Penrose / Ammann–Beenker / Sevenfold / Twelvefold                                             | 8     |
| Voronoi Cells            | voronoi         | Nearest-site partitions and Lloyd relaxation | Lloyd Relaxation / Metric Morph / Power Diagram / Delaunay Dual                               | 11    |
| Ripple Tank              | ripple          | Discrete wave equation                       | Slits & Gratings / Raindrops / Lens / Phased Array                                            | 10    |
| Langton's Ant            | turmite         | Generalised Langton ants                     | RL / LLRR / LRRRRRLLR / RRLLLRLLLRRR / RLR / LLRRRLRLRLLR                                     | 10    |
| Indra's Pearls           | kleinian        | Möbius maps and circle inversions            | Apollonian / Schottky / Loxodromic Tunnel / Steiner Porism                                    | 11    |
| Harmonograph             | harmonograph    | Coupled oscillator curves                    | Lissajous / Damped Harmonograph / Spirograph / Lissajous Knot                                 | 10    |
| Wallpaper Groups         | wallpaper       | Symmetry-averaged periodic wave functions    | p1 / p2 / pm / pg / cm / pmm / pmg / pgg / cmm / p4 / p4m / p4g / p3 / p3m1 / p31m / p6 / p6m | 17    |
| Truchet Tiles            | truchet         | Oriented tile networks                       | Smith Arcs / 10 PRINT / Hexagons / Log-polar Tunnel                                           | 10    |
| Space-filling Curves     | hilbert         | Recursive space-filling curves               | Hilbert / Moore / Peano / Hilbert Locality                                                    | 9     |
| Phyllotaxis              | phyllotaxis     | Golden-angle point placement                 | Sunflower / Angle Sweep / Fibonacci Sphere / Growth                                           | 9     |
| Hopf Fibration           | hopf            | Stereographic Hopf fibres                    | Latitude Torus / Nested Tori / Loxodrome Fibres / Scattered Rings                             | 8     |
| Chladni Figures          | chladni         | Resonant modes with nodal sand settling      | Square Plate / Mode Morph / Circular Drumhead / Faraday Hexagons                              | 8     |
| Domain Colouring         | domain          | Complex-function domain colouring            | Rational / Riemann Zeta / Möbius Net / Iterated z² + c                                        | 9     |

| Physarum Networks | physarum | Agent chemotaxis with a diffusing trail field | Free Foraging / Food Nodes / Food Ring / Moving Food Nodes | 8 |
| Geometric Caustics | caustics | Snell refraction through a moving heightfield | Point Waves / Crossing Wave Banks / Lens Sheet | 8 |
| Space Colonization | colonization | Nearest-branch attraction and reached-point removal | Canopy / Root Fan / Coral Arbor | 8 |
| [Living Forms](families/metamorphosis.md) | metamorphosis | Connected parametric surface deformation | Filaments / Membrane / Blossom | 6 |
| [Linked Fibres](families/fibration.md) (world Hopf Bloom) | fibration | Stereographic Hopf fibres as lit tube meshes | Torus / Nest / Bundle | 8 |
| [Crystal Habit](families/crystal.md) | crystal | Lattice-aligned growth of faceted hexagonal prisms | Seeds / Lattice / Hall | 8 |
| [Polyhedral Folding](families/fold.md) | fold | Rigid folding of polyhedral nets along hinge chains | Sheet / Fold / Shards | 8 |
| [Density Waves](families/nebula.md) | nebula | Zel'dovich web, density-wave orbits and Sedov–Taylor shells on one star population | Dust / Spiral / Nova | 7 |
| [Starling Flock](families/murmuration.md) | murmuration | Topological-neighbour flock with a fold field, startle waves and formations | Loose / Surge / Formation | 7 |
| [Fractal Descent](families/descent.md) | descent | Raymarched multi-scale sponge with a morphing coarse carving | Corridor / Cavern / City | 8 |
| [Living Mycelium](families/mycelium.md) | mycelium | Gray–Scott reaction–diffusion as a lit terrain | Understory / Tide / City | 8 |

Tapestry's views combine with its Wolfram rule; Life's Cyclic variant additionally distinguishes 313, R1/T2/C5, Griffeath CCA and R3/T5/C8. Phase's Gather, Launch and Return are scores on one Kuramoto lattice. Fractal Flight paths are camera views through one Menger geometry. These names are explanatory presentation choices, not claims that each view adds a new algorithm.

## Preserved historical looks

The 2026-10-09 catalog replaced the former Lab/page slots with access to every look. The lost Interference compositions **Orbit Loom**, **Petal Resonance** and **Bent Horizons**, and Cathedral's **Enamel Still**, remain alongside their newer looks. The current cleanup preserves their exact look ids, snapshots, ratings and favourites.

## Evidence

Classification: **INCREMENTAL**. Identity, filters, fallback handling and unchanged saved ids are checked in [catalog tests](../tests/catalog.test.mjs) and [family metadata tests](../tests/family-catalog.test.mjs); set/show catalog tests cover ratings, favourites, custom looks and reopening. A native Chrome browser smoke checked the family/style combination, empty-result reset, variant-aware spatial tags, legacy-family search, algorithm explanations and filtered keyboard order; the resulting control screenshot is in the ignored artifacts/catalog-consistency directory. This metadata cleanup does not establish a new visual family-gate pass or a venue-rig performance result. The agreed visual/rhythm work and outstanding motion evidence are recorded in the [family audit](research/family-rhythm-audit-2026-10-11.md).

The three additions retain explicit model limits: Physarum omits exclusive occupancy; caustics uses one refracting interface and a flat receiver; Space Colonization renews finite bounded regions. Their implementation and moving evidence are in [Physarum/Caustics](families/studies-physarum-caustics.md), [Colonization](families/colonization.md) and the [evidence log](EVIDENCE.md#visual-rhythms-and-catalog-expansion-2026-10-11).
