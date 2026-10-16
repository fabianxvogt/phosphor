# Family rhythm implementation

Implemented 2026-10-11: the 36 existing scene modules own 101 explicitly named rhythm gestures. `family-rhythm.mjs` constructs bounded authored defaults; the selection, geometry and simulation logic remains in each family's shader. These mappings preserve the existing family IDs, preset IDs, algorithms and parameter schemas.

Every track is driven by the shared music position. Continuous movement still uses scene time and movement speed. Intrinsic fixed beat cycles switch to the appropriate scheduled event count while rhythm is enabled. Legacy shader behaviour is retained for hosts without the rhythm contract; muted/disabled managed tracks stay silent; engine integration supplies authored patterns for standalone previews.

The three new families add nine gestures: Physarum carrier cohorts/trail ridges/foraging sources; Caustics incident bundles/light steering/surface impulses; Colonization ancestry pulses/active tips/new growth regions. Total: **110 family gestures and four global tracks**.

## Channel meanings

`x`, `y`, `z` below correspond to descriptor slots 0, 1, 2. `u_rhythm` supplies envelope/strength, `u_rhythmCount` chooses the substructure or structural generation, and `u_rhythmHit` is a newly crossed event, consumed once per simulation write sequence. Scene metadata declares the names, descriptions, compatible variants, and conservative default loop/duration/strength.

| Family | x: frequent local accent | y: independent second gesture | z: spaced structural gesture |
| --- | --- | --- | --- |
| Acid Mycelium | Chemical reaction front | Concentration band | Local chemical feed |
| Magnetic Choir | Advected dye packet | Dye population | Paired vortex impulse |
| Cathedrals of Error | Architectural bay / reliquary facet | Transmitting glass sector | — |
| Alien Aquarium | Organism membrane | Inner concentration layer | Local nutrient feed |
| Causal Tapestry | Actual write head | Recorded generation cohort | Rule-aware seed event |
| Feedback Chapel | Pigmented recursive ring | Current seed-geometry cohort | Local seed stamp |
| Interference Rituals | Interference-amplitude fringe | Wave surface | Source-phase excursion |
| Topological Melt | Knot/surface parameter segment | Grazing-normal rim | — |
| Phase Transition Theatre | Coherent angular phase cohort | Incoherent region boundary | Local phase impulse |
| Evolution Garden | Growing reaction rim | Oriented crown petals | Local morphogen feed |
| Pulse Geometry | Radial geometric layer | Angular spoke cohort | Authored configuration |
| Light Beams | Beam bank | Actual fan opening | — |
| Julia Observatory | Smooth escape contour | Interior orbit trap | Authored parameter excursion |
| Fractal Flight | Folded fractal orbit trap | Bounded camera-path impulse | — |
| Fourth Dimension | True polytope vertex cohort | x–w rotation-plane impulse | — |
| Hyperbolic Loom | Reflection-depth cohort | Constant hyperbolic-radius ring | — |
| Particle Swarm | Existing particle cohort | Actual radial population | Bounded cohort burst |
| Game of Life | Young live cells | Cell-age cohort | Compatible rule object |
| Strange Attractors | Neighbouring tracer cluster | Integration along the flow | Relaunch neighbouring tracers |
| Mandelbrot Dive | Smooth escape-iteration band | Resolved distance-estimator rim | Bounded route-depth excursion |
| Abelian Sandpile | Measured toppling front | Stable grain-height class | Bounded heap |
| Newton Basins | Root basin / Nova angular sector | Convergence-iteration contour | Bounded polynomial-root orbit |
| Fractal Flames | Transform-history colour coordinate | Attractor branch cohort | Additional valid IFS iterations |
| Aperiodic Tilings | de Bruijn ribbon | Rhombus angle class | Valid multigrid phason excursion |
| Voronoi Cells | Nearest-site cell cohort | Site jolt | Regional scatter and Lloyd healing |
| Ripple Tank | Simulated wave crest | Phased-array steering | Local point drop |
| Langton's Ant | Ant head and heading | Actual rule-step acceleration | Explicit same-rule field renewal |
| Indra's Pearls | Inversion word depth | Circle/annulus/pearl-size cohort | Schottky generator-circle excursion |
| Harmonograph | Curve-parameter pen comet | Harmonic curve lobe | Damped-pendulum phase combination |
| Wallpaper Groups | Phase/symmetry orbit | Logarithmic modulus band | Group-preserving coefficients |
| Truchet Tiles | Edge-matched curve light | Complementary tile class | Compatible tile rerouting |
| Space-filling Curves | Exact curve-index comet | Contiguous locality block | Parent-to-child refinement |
| Phyllotaxis | Fibonacci parastichy | Radial seed cohort | Fibonacci arm modulus |
| Hopf Fibration | Complete linked-fibre cohort | Base-sphere latitude cohort | — |
| Chladni Figures | Actual zero-amplitude nodes | Grain vibration | Resonant mode |
| Domain Colouring | Actual zero/pole | Logarithmic modulus contour | Rational exchange / iterated depth |

The default first track accents each beat. Most secondary accents have a three-beat loop, intentionally walking across 4/4. Structural events typically have 8–32-beat loops; ant renewal waits 64 beats and Chladni modes 32 beats. Authored styles are derived in `rhythm.mjs`; manually locked patterns retain their placement.

## World rhythm presets (2026-10-16)

All 27 world families name three phrase styles in `rhythmStyles` and author independent `styles.restrained`, `styles.driving` and `styles.accented` loops on each of their three existing gestures using `familyEffect` compact step notation. The driving loop is the default; the Rhythm menu exposes the world-specific names, autopilot rotates styles by phrase, and manually locked patterns retain their placement. Loops vary placement, division, length, strength and duration, with envelopes ending before the next hit and structural, motion, simulation and count-selected cohort gestures limited to two hits per bar across the full repeating cycle.

Compatibility: explicit base `steps` retain the historical descriptor `defaults` (4/8/16 steps and original bounds), which existing family tests and legacy consumers inspect; `defaultPattern` and the live scheduler select the authored driving style instead. The world gate checks the actual scheduled loops, their default selection, distinct placement, spacing and full-family coverage.

| World (family) | Restrained | Driving | Accented | Feel |
| --- | --- | --- | --- | --- |
| Mycelium (`mycelium`) | Dormant threads | Root signals | Spore chorus | Thread syncopations over unhurried concentration changes and phrase-end feeds. |
| Garden (`afterglow`) | Sleeping petals | Nectar paths | Midnight flowering | Staggered petal light, three-bar cohort turns and rare chemical seeds. |
| Unfolding (`metamorphosis`) | Folded seed | Opening whorl | Golden emergence | Six-beat ancestry figures open around soft membrane breaths. |
| Hopf Bloom (`fibration`) | Quiet fibres | Linked circles | Meridian braid | Six-beat fibre cycles and five-beat shell addresses interlace slowly. |
| Cavern (`crystal`) | Hidden facets | Quartz steps | Prismatic chime | Five-beat facet chimes climb into short beacon fills. |
| Nebula (`nebula`) | Distant embers | Spiral beacon | Pulsar crown | Six-beat arm pulses orbit independent core flares and shock rings. |
| Descent (`descent`) | Empty avenues | Window procession | Recursive rush | Measured window addresses, late camera impulses and bright seam runs. |
| Murmuration (`murmuration`) | Dusk wings | Turning flock | Falcon shadow | Wing glints flutter quickly; startles and falcon strikes leave recovery space. |
| Origami (`fold`) | Paper hush | Crease dance | Thousand cranes | Clipped edge figures fold around slow hinges and end-of-phrase flares. |
| Attractor Ribbons (`ribbons`) | Loose strands | Braided current | Attractor weave | Twelve-beat cohort braids cross five-beat light runs and head sparks. |
| Horizon (`horizon`) | Silent orbit | Photon waltz | Relativistic bloom | A six-beat orbit rubs against photon syncopations and spaced jet knots. |
| Deep Sea (`abyss`) | Abyssal hush | Lantern drift | Reef awakening | Slow bell contractions, separated plankton launches and reef answers. |
| Liquid Chrome (`ferro`) | Still mercury | Magnetic breath | Chrome resonance | Low magnetic swells and long satellite excursions, never a jittering sculpture. |
| Moon Tide (`tide`) | Slack water | Rolling swell | Spring tide | Long surges crest off the beat; tide rings arrive late in the phrase. |
| Laser Grid (`laser`) | Dark aperture | Beam relay | Vault chase | Measured beam selection above straight sixteenth grid-rib chases. |
| Magma Rift (`magma`) | Cooling seams | Lava channels | Cinder fountain | Hot seam syncopations, six-beat lava runs and explosive final-bar volleys. |
| Kinetic Rain (`kinetic`) | Suspended drops | Pendulum rain | Lattice cascade | Spaced ring launches meet diagonal sweeps and clipped lattice fills. |
| Aurora Veil (`aurora`) | Polar silence | Curtain signals | Magnetic midnight | Long upward excitations under drifting, three-bar ray addresses. |
| Brass Orrery (`orrery`) | Sleeping gears | Brass escapement | Cathedral clock | Tight sixteenth escapement ticks and sparse shaft glints. |
| Thunderhead (`storm`) | Distant rumble | Charged silence | Forked sky | Sudden syncopated doubles emerge from charged gaps, with rare return strokes. |
| Prism Engine (`prism`) | Sleeping spectrum | Refracted paths | Caustic choir | Slow prism addresses and steering frame six-beat spectral sweeps. |
| Impossible Stairs (`escher`) | Empty landings | Lantern steps | Endless ascent | Twelve-beat tread processions cross gravity lights and lantern flourishes. |
| Silk Storm (`silk`) | Still selvedge | Satin current | Vortex brocade | Five-beat sheen figures pass slow hem cohorts and broad spiral fronts. |
| Ink Bloom (`ink`) | Suspended pigment | Vortex bloom | Widnall flourish | Rolls and finger reaches stay calm; pigment bursts gather into phrase-end fills. |
| Soap Cathedral (`soap`) | Thin silence | Opal breathing | Iridescent bells | Five-beat thickness bells, soft border breaths and occasional opal windows. |
| Dune Sea (`dunes`) | Leeward hush | Saltation trails | Haboob drums | Five-beat grain trails and slipface answers over a rare dust-wall gust. |
| Data Monolith (`voxel`) | Idle registers | Address march | Midnight overflow | Deliberate address changes, quick scan syncopations and late row glitches. |

## Variant and state handling

- Newton root excursions exclude Nova, whose parameter plane has a different interpretation.
- Sandpile heap injection excludes the Identity construction. Identity's exact sixes/subtraction procedure remains intact.
- Ripple emitter steering is available only for the phased array.
- Schottky-circle excursion is available only for the paired Schottky construction.
- Pendulum pushes are available only for the damped Harmonograph, alongside the shared pen/lobe accents.
- Domain structural changes apply to rational zero/pole exchange and iterated polynomials; Zeta and the Möbius net retain the shared display accents.
- Causal Tapestry latches a newly crossed seed hit in metadata texel `(6,0)` until the next genuine generation and clears it exactly once. A count change alone never seeds the simulation.
- Sandpile, Voronoi, Ripple, ant renewal, attractor relaunch and flame iteration bursts consume hits rather than repeatedly injecting for the lifetime of an envelope. Vortex/vibration/flow motion intentionally integrates a bounded envelope over time.
- Base transport, reaction, cellular evolution, relaxation, growth, trace renewal and continuous camera motion continue while gesture tracks are muted. Display highlights never change a simulation's rules.

## Evidence

`tests/family-rhythm.test.mjs` checks all family descriptors, conservative defaults, muted output and variant-incompatible output. Its optional Chrome shader check compiles every scene's picture, simulation and particle body with the shared rhythm uniforms. Run it with `node tests/family-rhythm.test.mjs --port 48127`.

The existing family CPU/source suite passed 159 tests with four opt-in browser cases skipped. The all-family Chrome/SwiftShader shader compilation probe passed. Compilation and algorithm tests establish executable, bounded mappings; they do not claim native GPU performance or final aesthetic acceptance. Moving comparisons at low/middle/high energy, fades and measured native output remain part of the integrated release review.

## Renderer extensions

Both GLSL headers expose `u_field` on texture unit 3. Physarum's `scene.field` owns two RGBA8 trail textures: moved agents sample the old trail, the field pass diffuses/decays it, then additive agent deposits enter the next field before swapping. These textures belong to the slot and are released with it.

A bounded CPU simulation may supply `scene.simulation.cpu.create({seed,params})` and `step(state,{dt,params,level,rhythm,reset})`. Returning a byte buffer uploads the RGBA8 state; null keeps it unchanged. GPU simulation compilation is excluded for this path. Parameters reflect energy and audio; discrete `rhythm.hits` are consumed once. `simulation.warmTicks` overrides the default 120 hidden preparation ticks; Colonization uses zero because it already creates a short initial graph.

Native browser regression `PHOSPHOR_RHYTHM_GPU=1 node --test tests/browser/rhythm-engine.test.mjs` checks single-use Feedback/Life events, field/CPU texture lifetimes and own-look identity after graphics-context recovery. `scripts/rhythm-audit.mjs` produces deterministic moving energy contact sheets; `scripts/rhythm-native-smoke.mjs` measures short full-HD native RAF runs and crossfades. These are bounded checks, not a venue qualification.
