# Kinetic Rain

**INCREMENTAL / EMPIRICAL**, 2026-10-15. Family **102**, renderer `kinetic`, world `kinetic-rain` (**Kinetic Rain / Kinetischer Regen**). A choreographed kinetic light installation, not a cable or rigid-body simulation.

## Algorithm and signature

One seeded **96×96 lattice (9,216 spheres)** persists through every development value. Ceiling coordinates are `(i − 47.5, j − 47.5) × 0.25`, at height 2.8 with a faint travelling ripple. Waves adds four smoothly cycled heightfields: crossing plane waves, concentric waves, a three-arm spiral, and standing interference. The same index population gathers centre-first into one parametric surface.

At Sculpture, the flattened index is bijectively reparameterised onto a **192×48** grid. This gives the Möbius band's long direction enough samples without stacking 96 excessively dense rows across its narrow width. Indices never change between forms. A smooth partition of unity with 55% holds morphs their positions among:

- Sphere: `(r sin φ cos θ, r cos φ, r sin φ sin θ)`, r = 1.8.
- Torus: `((R+r cos ψ) cos θ, r sin ψ, (R+r cos ψ) sin θ)`, R = 1.5, r = 0.66.
- Möbius band: `((R+w cos(θ/2)) cos θ, w sin(θ/2), (R+w cos(θ/2)) sin θ)`, R = 1.6, half-width 0.62; the half twist is actual geometry.
- Travelling saddle: `y = 0.1 r² cos(2θ) + 0.07 r sin(2.6r − 2W)`, disc radius 2.22.

A 0.68-radian tilt, slow vertical-axis turn and small travelling breathing wave expose the morph. The centre is 1.95 above the mirror floor. Sphere radii track the geometric mean of local parameter spacing, clamped to 0.014–0.055, keeping individual pearls visible while reading as one surface. [kinetic-model.mjs](../../kinetic-model.mjs) mirrors the shader's exact position law, normals, radius, ring, camera and haze mathematics on the CPU. Development is a pure input: reversal retraces the same geometry.

## States

All three world states share seed 1216 and identical non-development parameters.

| Development | EN / DE | Composition |
| --- | --- | --- |
| 0 | Ceiling / Decke | Low orbit beneath the seemingly endless level light ceiling; travelling sheen, dark tiled mirror, lit haze beneath the installation. |
| 1 | Waves / Wellen | Crossing, radial, spiral and standing heightfield choreographies; bright kick fronts traverse the same grid. |
| 2 | Sculpture / Skulptur | Thousands of pearls form one hero surface, continuously cycling sphere → torus → Möbius → saddle, reflected below. |

The gather uses a smooth radial delay, not a dissolve. In-between values retain the ceiling's outer wings while its centre becomes the sculpture.

## Looks (EN / DE)

- Still Ceiling / Stille Decke — state 0.
- Wave Choreography / Wellenchoreografie — state 1.
- Floating Sculpture / Schwebende Skulptur — state 2.
- Slow Tide / Langsame Gezeiten — broad, slow waves, development 0.7.
- Rain Curtain / Regenvorhang — held gathering transition, development 1.65.
- Dense Swell / Dichte Dünung — quicker waves, finer ripple detail and smaller globes.
- Möbius Drift / Möbiusdrift — starts on the half-twisted band, slow morph/orbit.
- Night Mirror / Nachtspiegel — quiet early ceiling ripple, slow orbit, restrained glow.

Existing look ids/names and translations are unchanged in round 2.

## Light, camera and depth

Each globe is a depth-writing ray/sphere impostor with analytic coverage in output-pixel units. Its emission combines coherent surface-normal shading (key, specular glints, fresnel rim and central occlusion proxy) with local globe shading. Palette secondary/primary carry the body; white-mixed hot highlights feed the float/bloom path. Accent is reserved for ring crests and occasional index-lattice gestures. Threads are resolution-scaled, additive, and heavily dimmed at Sculpture so they no longer obscure its silhouette.

The camera orbits continuously, without roll. It moves from radius 6 ±0.4, eye height 0.75 ±0.1, to radius **4.8 ±0.15**, eye height **1.2 ±0.1**. Focal length moves smoothly from 1.4 to 1.62. The top form normally spans roughly **60–80% of the short side**; tests conservatively allow 57–85% across independent form/camera turns, including the saddle's narrowest angle. The camera aims below the sculpture's centre to leave room for its mirror image. Portrait uses the same short-side projection. Kick focal punch is strictly **2%**.

The floor draws a second depth-tested mirrored sphere population: its shading is Fresnel-weighted and slightly softened with height. Large dark tiles and reflected haze supply scale, not a competing floor pattern. Haze is an analytic piecewise-exponential layer integral beneath the ceiling, transitioning to the closed-form inverse-quadratic glow integral around the sculpture. Broad smooth shaft modulation enriches the ceiling atmosphere without a raymarch or noise cells. Perspective/parallax, distance fog, coherent key/rim light, occlusion and the mirror all carry depth.

## Energy and rhythm

Energy changes wave speed (×0.6–1.5), ripple/breathing detail (+0.5), choreography pace (×0.8–1.3), and orbit speed (×0.75–1.5), not a brightness multiplier. Quiet states stay readable at energy 0.1. Three family gestures:

1. **Kick rings**, 4 beats: a bounded Gaussian/cosine wave packet runs from the axis to radius 13 as the kick envelope decays. Normalising by authored strength and energy gain prevents a launch jump. Motor displacement stays small; the emissive crest uses the normalised envelope, so the travelling ring remains visible at low energy without a camera flash.
2. **Index sweep**, 8 beats: a luminous band runs diagonally through persistent sphere indices.
3. **Lattice lines**, 16 beats: every eighth index row/column catches accent light.

## Endlessness and safety

Four integrated engine clocks own wave phase (2π), four-form choreography (4), sculpture turn / half-rate wave-direction drift (4π), and camera orbit (2π). Every use is periodic in its declared period; parameter/energy changes alter speed without phase jumps. Raw time only drives bounded decorative twinkles, without an hourly modulo. Nothing accumulates, dies out or saturates.

CPU tests bound motor velocity to 3 world units/s, check camera clearance at every development, verify lattice identity and development Lipschitz continuity, and independently project all four peak forms across camera/form orientations. Authored peak spheres stay above the floor in these checks. This is not a cable solver: threads can cross while the installation gathers, and arbitrarily fast development automation is not a physical motor simulation.

## Cost and verification

165,888 vertices (sphere, mirror, thread: six vertices each per sphere), six floats per vertex, about **4 MB** per seed. No engine changes or reduced-resolution colour pass.

Native headless Chrome 155 / ANGLE Metal / Apple M3 Pro, 12 synchronous samples per state including post-processing, energy 0.95:

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Ceiling | 2.2 / 2.4 ms | 4.3 / 4.5 ms |
| Waves | 2.1 / 2.4 ms | 4.6 / 4.9 ms |
| Sculpture | 2.7 / 2.9 ms | 8.5 / 9.1 ms |

Earlier shared-machine runs were 2.5–3.1 ms at 1080p and 4.9–8.7 ms at 4K. All eight look-start 4K probes were ≤8.7 ms p95. These are throughput measurements, not external-display cadence or a complete morph-cycle worst-case guarantee.

- `node --test tests/kinetic.test.mjs tests/time.test.mjs`: **23/23 pass**. Covers registration, presets, exact implicit forms, reindexing coverage, travelling-wave identities, ring bounds/launch continuity/low-energy visibility, geometry determinism, clock periods, velocity, camera clearance, peak framing/floor clearance, haze integral versus quadrature.
- GPU: all states at energy 0.1 and times 3600/43200 render with zero GL errors/non-finite uploads. Ceiling mean ~17/255, peaks 150–202. Paused development 0.7 → 1.85 → 0.7 is pixel-identical. Native seam/rate-step audit passes.
- `npm run typecheck`: passes. `node --test tests/*.test.mjs`: 666 pass, 9 skip; only three expected preview/curation catalog tests fail (L0 owns baking/curation). `npm test`: the same three failures, 672 pass, 15 skip.
- Additional `test:i18n` browser smoke fails twice at the unrelated invalid-import toast assertion (`scripts/test-i18n.mjs:141`); no control/UI/i18n changes were made. Dictionary CPU tests pass in the full suite.
- Reviewed default, Ember, Glacier and Silver films, full energy ladder, portrait and late-time stills. Final world film/strip: `artifacts/films/kinetic-final/kinetic-rain.{mp4,png}`. Full sculpture cycle: `artifacts/films/kinetic-morph-cycle/kinetic-floating-sculpture-silver.{mp4,png}`. Extra band look: `artifacts/films/kinetic-extra/kinetic-m-bius-drift-glacier.{mp4,png}`. Ladder: `artifacts/contact/kinetic-ladder/index.html`.

## Limits

The floor mirror is a sharp mirrored population with soft sphere coverage, not physically integrated glossy reflection. Surface occlusion is a proxy, not inter-sphere ray tracing. A few morph midpoints remain narrower than the held forms; pearl rows remain visible rather than becoming a seamless solid shell. Haze is deliberately subtle against the dark room. External-projector contrast and multi-hour Stage cadence remain unmeasured.
