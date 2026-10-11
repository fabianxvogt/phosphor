# Physarum and geometric caustic studies

Implemented 2026-10-11 as `study: true` candidates. These modules are ready for shader and moving-output evaluation, not a claim of final visual acceptance or native-output performance. Both have eight authored looks and three independently schedulable family gestures. Ordinary simulation continues when every rhythm track is muted.

## Physarum Networks

[`scene-physarum.mjs`](../../scene-physarum.mjs) stores 16,384 continuous agents on a periodic square domain. Each agent samples a separate trail field forward, left and right, turns according to the three-sensor decision, moves, and deposits trail. A 256 × 256 field is mixed with its 3 × 3 mean and retained with a bounded damping factor. Position uses twelve bits per axis; heading uses eight bits. Agents read the previous field, then the engine diffuses the field and deposits the newly moved agents.

This is explicitly **continuous Jones-inspired chemotaxis**, not a reproduction of every rule in Jones's model. In particular, exclusive lattice occupancy and movement blocking are omitted. Sparse agent reseeding, moving food sources and rhythmic attractants are artistic additions for unattended renewal. The defining mechanism remains agent–trail feedback. It does not establish biological accuracy or globally optimal transport. [Jones, author manuscript](https://arxiv.org/pdf/1503.06579).

| Variant | Authored looks | Visible distinction |
| --- | --- | --- |
| Free foraging | Foraging Veins, Honeycomb Transport, Braided Couriers | Sensor range, turn angle, travel and trail lifetime select different emergent network regimes without an imposed food layout. |
| Food nodes | Six Food Stations, Fine Nutrient Roads | Six slowly orbiting attractant regions bias actual transport paths. |
| Food ring | Annular Foragers | A continuous annular attractant biases agents toward a ring habitat. |
| Moving nodes | Migrating Stations, Living Circuit | Food nodes also change radial position; the network repeatedly reroutes. |

| Rhythm slot | Gesture | Mechanism |
| --- | --- | --- |
| x | Carrier-cohort light | Marks one of twelve cohorts of existing agents; it follows their true current positions. No extra trail is deposited by this accent. |
| y | Trail-ridge light | Brightens measured gradients of the actual trail field. |
| z | Foraging source | Adds a temporary, bounded local trail attractant during its envelope. The source position advances by its scheduled event count. |

The picture exposes trail concentration and measured gradients, with faint carrier points. Its field is independent of the display palette. `scene.field` requires two RGBA8 targets, a fullscreen diffusion/decay pass and a point deposit pass. Deposits are additive red-channel concentration; the field uses linear sampling with explicit periodic wrapping. The default food-free variants still renew through sparse reseeding and the agents' ongoing feedback.

Limits to inspect in motion: field saturation, byte quantisation, over-dense transport, persistent collapse into a uniform field, network recovery after an attractant, and whether all authored regimes remain recognisable at calm/mid/high energy. No exclusive-occupancy behaviour should be described in the catalog.

## Geometric Caustics

[`scene-caustics.mjs`](../../scene-caustics.mjs) evolves a 256 × 256 periodic scalar heightfield with a damped four-neighbour finite-difference wave equation. The squared Courant number is 0.20, below the two-dimensional stencil's 0.5 stability bound. Current and previous height use sixteen bits each. Bounded persistent point or line sources maintain moving waves; the lens variant adds a smooth, slowly moving convex height surface.

One ray per surface sample uses a measured central-difference normal, GLSL `refract` with the air-to-medium index ratio, and a geometric intersection with a flat receiver below the surface. Equal incident-flux rays are accumulated with finite Gaussian point footprints. Brightness therefore follows actual concentration of refracted rays, rather than shading a wave-amplitude texture. Wallace's first-party WebGL Water renderer provides the browser precedent for heightfield refraction and caustic projection; this study uses ray splats, **not its triangle pre/post-area ratio method**. [Demo](https://madebyevan.com/webgl-water/), [renderer source](https://github.com/evanw/webgl-water/blob/master/renderer.js).

| Variant | Authored looks | Visible distinction |
| --- | --- | --- |
| Point waves | Pool of Light, Fine Water Folds, Slow Cusp Garden | Three moving forcing points create overlapping travelling wavefronts; wavelength, curvature and receiver depth change the resulting caustic map. |
| Crossing banks | Crossing Wave Banks, Liquid Lattice, Long Glass Ribbons | Two coherent line-source banks produce crossing wavefronts with different focal scales. |
| Lens sheet | Breathing Lens Sheet, Prismatic Focal Pearls | A true convex lens height surface creates compact foci, with weak simulated waves perturbing their motion. |

| Rhythm slot | Gesture | Mechanism |
| --- | --- | --- |
| x | Ray-bundle light | Marks one incident strip. The same rays carry the accent through their true refracted receiver positions. |
| y | Incident-light steering | Boundedly changes the incident direction before refraction; the caustic map moves in response. |
| z | Surface impulse | Adds one local displacement packet on a newly crossed event. Current and next height receive the same displacement, and the packet then propagates under the wave equation. |

This is a single-interface geometric study. It omits occlusion, reflected light, secondary transmission, wavelength-dependent dispersion and volumetric effects. Palette colour is artistic incident-ray colour, not physically computed dispersion. Finite samples and Gaussian footprints regularise singular foci; they approximate irradiance and can alias or lose fine folds at unsuitable output scales. The simulated height is safety-clamped within its packed range. Lens tiles are an artistic periodic height surface rather than a complete manufactured optical model.

Limits to inspect in motion: source forcing versus damping, clipped-height behaviour, visible sampling grids, abrupt bright peaks, ray loss outside the receiver view, legibility under global rhythm effects, and native-output point cost during a two-family fade.

## Evidence and remaining evaluation

`node --test tests/physarum.test.mjs tests/caustics.test.mjs`: **11 passed**. Tests cover deterministic chemotaxis, packed precision, periodic movement and diffusion mass; normal/oblique Snell refraction, geometric focusing, total internal reflection rejection, finite dissipating waves over 1,200 steps; eight valid presets per study and rhythm metadata validation. These are numerical and structural checks, not visual quality or frame-time measurements.

Before catalog inclusion, compile all study programs including the Physarum field/deposit passes, examine moving views and both rhythm scales, verify muted tracks, compare grayscale identity with Aquarium/Ripple, and measure native output with an active crossfade. Keep the studies marked as candidates until this evidence is collected.
