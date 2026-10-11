# Family rhythm audit and interview checkpoint

Date: 2026-10-11. Product direction agreed through interview Q1–Q22. Algorithm/effect proposals remain **EXPLORATORY**; this document records the plan and source audit, not completed implementation or visual acceptance.

The inventory below comes from source inspection. **EMPIRICAL** means code was inspected; **SPECULATIVE** means an artistic proposal. No new motion comparison, performance measurement, or owner art approval was conducted. Existing screenshots were inspected only for control layout; the owner subsequently requested that the current UI style remain unchanged.

## Confirmed owner direction

- Produce a convincing musical show without continuous manual intervention; patterns add control.
- Improve existing families before expanding the catalog.
- Preserve each family's recognisable algorithmic identity under effects.
- Keep the current UI style. Earlier warm/retro wording is withdrawn as a new design instruction.
- Desired concept: family-specific rhythm tracks above global rhythm tracks; independently scheduled gestures, including ordinary beats and larger accents.
- Q5: Rhythm follows the music clock independently of visual movement speed.
- Q6: Each effect track may have its own loop length, continuing across bar boundaries; initial song meter remains 4/4, with eighth/sixteenth subdivisions available.
- Q7: Both display accents and clearly named simulation interventions are available. Defaults favour frequent small accents and less frequent structural interventions.
- Q8: Automatic selection may use authored patterns; manually edited patterns stay protected until explicitly released back to automatic control.
- Q9: Clean up family/variant definitions and overlaps around coherent visual and algorithmic principles, preserving existing looks and favourites.
- Q10: The rhythm grid targets the playing visual by default; editing another draft's rhythm requires an explicit preview context.
- Q11: Store one family pattern per family within a set and global patterns at set level. Own looks may explicitly save a family-pattern override; otherwise looks share the family's pattern.
- Q12: Look/family changes preserve musical pattern position. Incoming families join the current transport position rather than restarting their loops.
- Q13: Initially offer on/off steps, per-effect strength and meaningful duration controls, and optional stronger individual steps. Defer probabilities and random repetitions.
- Q14: Energy scales effect intensity without changing manually authored event placement or adding events.
- Q15: Availability may depend on the variant. Incompatible configured tracks remain visible and inactive, preserving their settings rather than remapping or discarding them.
- Q16: Retain the unified catalog; make family/variant identity explicit, add a few visual filters and short algorithm explanations without introducing a new page hierarchy.
- Q17: Establish the visual quality standard with Penrose, Newton, Sandpile, Chladni, Hopf and Cathedral, then review all other families. Use moving before/after comparisons across low/mid/high energy for composition, contrast, motion, identity and rhythm readability.
- Q18: Family reactions lead; global brightness pulse, zoom punch, echo impulse and colour accent support them, with restrained authored defaults.
- Q19: Individual step edits take effect at the next applicable grid point. Whole-pattern or loop-length changes wait for the next downbeat and show their pending state. Strength and mute respond immediately; editing itself emits no extra off-grid trigger.
- Q20: Both families retain their own rhythms during crossfades; their responses fade with their images. Global effects apply once to the combined output. The grid targets the incoming family from transition start.
- Q21: Automatic selection may change unprotected authored patterns at musical phrase boundaries, for example after 8, 16 or 32 bars, using restrained, driving and accented variants. Protected user patterns remain unchanged.
- Q22: After improving the existing catalog, compare moving studies of Physarum transport networks, geometric caustics and Space Colonization, then develop the strongest into complete families.

## Consolidated product plan

### Musical behaviour

Every effect is an independently schedulable track on the common music clock. The song starts with a 4/4 model; track loops may cross bar boundaries and use eighth/sixteenth subdivisions. Movement speed does not change musical event timing. An ordinary beat, downbeat or longer phrase is a place in the pattern, not a different hard-wired effect category.

For example, a one-beat ribbon track, a three-beat tile-class track and an eight-beat global echo track keep cycling together. The three-beat track does not reset every four beats. A family change joins the current musical position. Current hard-coded family cycles must be reconciled with the scheduler rather than left as unexplained parallel triggers.

Distinguish presentation accents from changes to the underlying simulation. Both are available where meaningful, and their names explain the action. Larger interventions need authored spacing that preserves readable development. Energy adjusts intensity; protected manual patterns retain their event positions.

### Controls and ownership

Keep the current visual UI style and unified catalog. The grid has the playing family's tracks above stable global tracks, with a clear playing-look label. Draft rhythm editing uses an explicit preview context. Incompatible variant tracks remain visible and inactive with their stored configuration.

Start with on/off steps, per-effect strength, meaningful duration controls and optional stronger steps. Mark queued pattern/length changes until the next downbeat; individual step edits apply at the next relevant grid point. Strength/mute are immediate. Probability and random-repeat features are deferred.

Persist family patterns within each set, global patterns once per set, and optional explicit overrides in own looks. Save/load/export/import must preserve these choices and existing looks/favourites. Manually edited patterns remain protected until the user releases them. Automatic pattern selection operates on authored unprotected patterns at phrase boundaries.

During a crossfade each family keeps its own timed reactions and fades with its picture; global gestures apply once after the mix. The grid follows the incoming family from the transition's start.

### Delivery order and evidence

| Stage | Work | Evidence needed before advancing |
| --- | --- | --- |
| 1. Shared rhythm foundation | One transport definition for beat/downbeat, independent track lengths and subdivisions; effect scheduling; reconciliation of existing family cycles; persistence and transitions. | Timing checks for three-beat loops against 4/4, speed independence, downbeat correction, queued edits, family changes, fades, pattern protection and saved-set round trips. Existing tracking limitations are not solved merely by adding a sequencer. |
| 2. Six representative families and grid | Penrose, Newton, Sandpile, Chladni, Hopf, Cathedral; family accents plus structural gestures where meaningful; four supporting global gesture types; working defaults and the agreed grid behaviour. | Moving before/after comparisons at low/mid/high energy; a clearly readable common beat plus independently scheduled accents; full-resolution timing including a two-family fade. |
| 3. Whole-catalog quality and consistency | Review all remaining families for composition, contrast, motion, algorithm identity and musical response. Clean up family/variant names and overlaps; improve metadata/filtering and author default patterns. | Family-by-family moving comparisons, preserved looks/favourites, and a documented reason for each structural variant. Mathematical correctness alone does not establish visual quality. |
| 4. Distinct new picture studies | Physarum, geometric caustics, Space Colonization. | One recognisable moving composition, a short gesture, a larger accent, unattended renewal, differentiation from the nearest existing family and measured native-output cost. Choose complete-family additions from the evidence. |

The first six span selective tiling highlights, root-basin structure, stateful avalanches, slow resonant settling, linked fibres and spatial architecture. They establish a reusable quality standard; the remaining families are part of the agreed review, not silently dropped from scope.

### What is established and what remains to be measured

The owner has accepted the product choices in Q1–Q22. Source inspection established the inventory and existing rhythm mechanisms. Candidate algorithms have primary-source research. The interview itself changed no runtime code. The subsequently authorized implementation is now complete: all original families have named gestures, the independent family/global sequencer is connected to control/stage playback, and three distinct algorithm families add 24 looks. The [evidence log](../EVIDENCE.md#visual-rhythms-and-catalog-expansion-2026-10-11) records moving review, targeted refinements, native short-run timings and regression checks. Full-night/external-display qualification and owner aesthetic acceptance remain separate gates.

## Inventory and naming findings

**EMPIRICAL:** 36 registered families, 304 authored looks ([registry](../../scenes.mjs), [catalog](../../catalog.mjs)). Penrose is a variant within Aperiodic Tilings, not a separately registered family.

The documented family/variant/look vocabulary is not consistently represented. Acid and Evolution both use Gray–Scott; Swarm contains multiple movement models; Evolution's variant control describes planting density. Some catalog labels fall back to numbered implementation names, such as `Group 16` or `Architecture 0`. Fifteen families have fewer than the authoring guide's eight-look minimum; that is a documentation discrepancy, not evidence that additional looks would improve them. Only six families have documented family-gate passes. Sources: [authoring guide](../families/AUTHORING.md), [catalog definitions](../../catalog.mjs), [catalog overview](../CATALOG.md), [family status](../../ROADMAP.md).

## All-family gesture candidates

Current behaviour is **EMPIRICAL**. Both proposal columns are **SPECULATIVE**. “Accent” describes scale, not a mandatory downbeat or fixed frequency: the pattern would decide when it occurs. Some gestures apply only to particular variants.

| Family / source | Current local rhythm behaviour | Short gesture candidate | Larger accent candidate |
| --- | --- | --- | --- |
| [Acid Mycelium](../../scene-acid.mjs) | Shared injection feeds local chemistry | Highlight reaction fronts | Bounded local feed pulse |
| [Magnetic Choir](../../scene-magnetic.mjs) | Slow beat-related velocity modulation | Highlight an advected dye packet | Paired vortex impulse |
| [Cathedrals of Error](../../scene-cathedral.mjs) | Camera kick | Light successive architectural bays | Rose-window sector or recursion-level accent |
| [Alien Aquarium](../../scene-aquarium.mjs) | Shared injection acts as feeding | Highlight existing membranes | Bounded nutrient ring |
| [Causal Tapestry](../../scene-tapestry.mjs) | Phrase events and stronger write head | Write-head accent | Seed change with visible causal propagation |
| [Feedback Chapel](../../scene-feedback.mjs) | Ink/rim injection into history | Highlight a recursion ring | Family-specific seed stamp |
| [Interference Rituals](../../scene-interference.mjs) | Continuous clock-driven morph | Select a fringe band | Source-phase intervention causing fringe migration |
| [Topological Melt](../../scene-melt.mjs) | Shared punch/pulse | Light travelling along the surface or knot | Bounded twist gesture within the variant's geometry |
| [Phase Transition Theatre](../../scene-phase.mjs) | Local phase/frequency injection, audio onset | Highlight coherent regions | Local phase impulse with visible propagation |
| [Evolution Garden](../../scene-evolution.mjs) | Local morphogen injection | Highlight reaction-front cohorts | Local feed pulse; assess overlap with Acid |
| [Pulse Geometry](../../scene-pulse.mjs) | Beat-switched configurations at high energy | Select one geometric layer | Authored configuration switch |
| [Light Beams](../../scene-beams.mjs) | Beat-indexed beam chase | Bank chase | Fan opening/closing impulse |
| [Julia Observatory](../../scene-julia.mjs) | Shared punch/pulse | Escape-iteration contour chase | Bounded authored parameter excursion |
| [Fractal Flight](../../scene-flight.mjs) | Camera dolly/kick | Highlight a recursion level | Small flight impulse preserving readable navigation |
| [Fourth Dimension](../../scene-fourspace.mjs) | Vertex glints | Vertex/edge orbit chase | Impulse in a selected 4D rotation plane |
| [Hyperbolic Loom](../../scene-hyperbolic.mjs) | Edge brightness response | Select tiles by depth | Geodesic ring wave |
| [Particle Swarm](../../scene-swarm.mjs) | Radial burst and point-size response | Cohort/trail chase | Bounded cohort burst; distinguish from true flocking |
| [Game of Life](../../scene-life.mjs) | Shared injection spawns rule-specific objects | Highlight births or cell ages | Explicitly marked glider/replicator spawn |
| [Strange Attractors](../../scene-attractor.mjs) | Surge along the existing flow | Trajectory-cohort or lobe highlight | Launch neighbouring tracers and allow divergence |
| [Mandelbrot Dive](../../scene-mandelbrot.mjs) | Camera kick | Escape-iteration band chase | Authored route/depth accent |
| [Abelian Sandpile](../../scene-sandpile.mjs) | Beat heap injection, except Identity | Highlight actual toppling front | Bounded larger heap or source relocation |
| [Newton Basins](../../scene-newton.mjs) | Shared punch/pulse | Select one root basin or iteration band | Bounded root-orbit change |
| [Fractal Flames](../../scene-flame.mjs) | Shared punch/pulse | Highlight samples associated with an IFS transform | Authored population/flow burst without losing the attractor |
| [Aperiodic Tilings](../../scene-quasicrystal.mjs) | Beat selects ribbon direction and travelling light | Expose ribbon chase; add tile-class selection | Highlight a valid offset-induced rearrangement |
| [Voronoi Cells](../../scene-voronoi.mjs) | Per-beat site jolt/heat, regional burst every 16 beats | Separate site jolt from cell highlight | Schedule regional scatter/heal or relaxation |
| [Ripple Tank](../../scene-ripple.mjs) | Wave injection, source amplitude and steering | Independent point drop or wavefront highlight | Emitter phase/steering change |
| [Langton's Ant](../../scene-turmite.mjs) | Step acceleration and long-cycle renewal | Head/trail accent | Rule-preserving step burst or explicit renewal |
| [Indra's Pearls](../../scene-kleinian.mjs) | Schottky-circle geometry pulse in relevant variant | Select generator group or recursion depth | Variant-compatible Möbius/geometry gesture |
| [Harmonograph](../../scene-harmonograph.mjs) | Beat comet, pendulum push every 16 beats | Pen/comet accent | Schedule a pendulum push in compatible variants |
| [Wallpaper Groups](../../scene-wallpaper.mjs) | Modulus rings and slower coefficient generations | Highlight a symmetry orbit | Schedule coefficient reroll preserving the group |
| [Truchet Tiles](../../scene-truchet.mjs) | Beat tile flips; path light currently time-based | Inject light into connected paths | Reroute a bounded tile patch |
| [Space-filling Curves](../../scene-hilbert.mjs) | Refinement/coarsening every 4–32 beats | Comet following curve index | Schedule continuous parent-to-child refinement |
| [Phyllotaxis](../../scene-phyllotaxis.mjs) | Beat ring, Fibonacci arm selection every 8 beats | Chase one Fibonacci arm cohort | Schedule arm-class change |
| [Hopf Fibration](../../scene-hopf.mjs) | Latitude breathing | Select linked fibres | Latitude-group sweep preserving linking |
| [Chladni Figures](../../scene-chladni.mjs) | Mode changes after 8–64 beats | Bounded vibration impulse | Mode change followed by enough settling time |
| [Domain Colouring](../../scene-domain.mjs) | Zero/pole swaps or depth changes every 8 beats | Zero/pole or modulus-band accent | Schedule a conformal parameter/depth change |

**Inference:** the useful Penrose principle is selective emphasis of a meaningful substructure. A resting background makes a moving ribbon legible. Applying equivalent selection to roots, fibres, branches, trajectories, wavefronts and recursion levels can produce family identity without making the entire frame pulse at once.

Simulation intervention and display emphasis must be distinguished. Adding grains, spawning cells or changing a resonant mode alters the subsequent development; highlighting an existing avalanche or contour does not. Repeated interventions can overwhelm the unforced algorithm.

## Shared timing findings

- [ShowClock](../../show-clock.mjs) has beats, phase, bars and beat-in-bar in fixed 4/4, plus manual downbeat marking. Automatic tracking has unresolved real-mix limitations; line input starts tap-first ([evidence](../EVIDENCE.md)).
- [Renderer uniforms](../../engine.mjs) carry beat/kick but not the clock's downbeat offset. Existing modulus-based family cycles therefore do not necessarily follow a corrected musical “1”.
- Shared kicks currently multiply beat by movement speed; family beat uniforms do not. Pattern semantics must resolve this inconsistency.
- Several family cycles are hard-coded. A sequencer must take ownership of these existing triggers, or explicitly explain their relationship to editable tracks.
- [Set/own-look storage](../../show-set.mjs) has no rhythm-pattern model. [Crash restore](../../show.mjs) preserves tempo and downbeat offset but not a continuously advancing beat position.
- The look editor can target a different family from the playing output. The grid's target must be explicit.

## Interview outcome

All recommendations in Q1–Q22 were accepted, except that Q4 was replaced by the explicit instruction to retain the current UI style. The design frontier is closed for this planning session. The consolidated plan above is the readback of those decisions; individual effect candidates below it remain artistic hypotheses to evaluate during implementation. No application code or deployment was changed in this session.

## Evidence needed for visual decisions

Use moving comparisons, not thumbnails alone: the same family/look/palette/energy with a gesture disabled and enabled, ordinary beats plus accents, over enough bars for its mechanism to emerge. Compare calm, medium and high energy, family recognisability, rhythmic readability and native-output timing including transitions. No result of such a comparison is claimed in this audit.

New-algorithm primary sources and their limits are in [visual-families-2026-10-11.md](visual-families-2026-10-11.md).
