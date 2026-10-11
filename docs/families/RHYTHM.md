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
