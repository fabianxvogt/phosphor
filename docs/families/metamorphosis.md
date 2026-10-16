# Living Forms — Unfolding Garden

**INCREMENTAL / EMPIRICAL**, r4 (2026-10-16). Parametric surface choreography, not a biological growth model. Independent r3 review: L6.5/G8.5/E7, overall 7. The r4 self-assessment is L7.5/G8.5/E8, rounded overall 8; this is **not independent acceptance**.

## Algorithm, identity and states

`metamorphosis-geometry.mjs` generates fourteen seeded centres, radial surface sectors, textured seed heads and independent curved, tapered stalks. The same fixed mesh develops continuously; changing development never rebuilds it. Hero centre 1 stays large and legible. Near-side forms overlap it, while rear forms receive stronger distance attenuation. Deterministic node-local tilt, elevation and 5–9-petal whorls replace repeated front-facing clones; the hero retains eight petals.

- **Filaments (0):** upright, inward-curled leaf ribbons with overlapping seed membranes, shaded undersides and narrow roots. They are no longer flat pinwheels.
- **Membrane (1):** the same adjacent sector edges meet exactly into an uneven, cupped canopy. Angular scalloping and folds preserve exact seams, including during gestures.
- **Blossom (2):** sectors separate into irregularly extended, cupped petals around the same textured centre.

All preset names/seeds, schema keys, world/state/look IDs and gesture IDs remain unchanged. Seed 112: **First Filaments**, **Pearl Membranes**, **Open Blossom**. Additional looks: **Wandering Threads** (847), **Silver Canopy** (847), **Evening Blossom** (2451). No world-definition migration is required.

## Review fixes and material

The r3 independent review prioritized diagram connectors, repeated facing, manufactured parallel ribs, low-state rotor icons and an indistinct signature progression. Three r4 change/film/read rounds address them:

1. Remove all inter-flower graph links. Each stalk starts beneath its own flower and terminates at its persistent centre, with an independent curved taper and shaded cross-section. No triangular ancestry paths.
2. Tilt whorls in actual 3D, vary their petal counts and move/enlarge three near-side plants. Their detailed material is subordinate to the hero; distant forms retain cheaper, darker shading.
3. Replace parallel cosine ribs with a wavering midrib, diagonal branching side veins and static fine tissue texture. Deeper contact folds, softer back-transmission and reduced specular/rim emission replace uniformly outlined lime fans.
4. Broaden and curl seed ribbons upward/inward, retaining the dark sparse mood and the blade → membrane → crown identity.
5. Narrow the coloured sap front, delay petal opening until the front passes and lengthen the driving gesture so multiple half-beat samples resolve root → tip travel and recovery.

All colour remains palette-derived. Persistent small magenta centres, navy ground, fine tissue detail and the larger hero from r3 are retained. No extra pass, ray marching, frame-random grain or simulation.

## Energy and camera

Energy changes ribbon bend, sway and vein detail, not material gain. Development controls form independently. Manual faders remain Living sway, Surface light and Motion speed. Integrated clock 0 (period 50π) drives sway/vein motion with existing first-hour and late paths intact.

The closed perspective camera arc is development-independent. Lens 3.35 landscape / 2.30 portrait-square and a slightly raised aim retain margins during maximum opening/sway. Kick lens punch stays 1.5%. Depth comes from perspective/parallax, oblique faces, near overlaps, contact shading and distance haze.

## Rhythm

| Slot | Gesture                       | Visible action                                                                                                                                 |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Ancestry glow                 | A local sap band travels through stalks and radial tissue; reduced broad lime emission.                                                        |
| 1    | Membrane edge                 | Soft surface-margin light and bounded tip flex, not a uniform outline.                                                                         |
| 2    | Golden centres                | Textured seed heads swell by at most 25% and emit local accent light.                                                                          |
| 3    | **Petal flush / Blütenwelle** | A narrow rose-coloured front travels centre → tip through a count-selected whorl; tissue extends/uncurls only behind the front, then recovers. |

Signature front position is `1.12 - 1.25 * u_rhythm.w`. The descending envelope moves it outward. Deformation is gated by position behind that front and smoothly closes as the envelope ends. Maximum local extension 0.22 node radii, lowering 0.34; cohort weighting keeps the entire flower from releasing identically. Exact membrane seams are preserved. `u_rhythmCount.w` selects a whorl, `u_rhythmHit.w` adds only a small local seed-head accent. No development-threshold events, full-screen white or limiter edits.

| Preset           | Hits/bar across four tracks | Signature steps (zero-based, native grid)                |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| Folded seed      | 3.0                         | 12, 30 of 32 at division 2; duration 1.4 beats           |
| Opening whorl    | 6.5                         | 4, 13 of 16 at division 2; duration 1.5 beats            |
| Golden emergence | 11.2                        | 0, 6, 12, 20, 26 of 32 at division 4; duration 0.7 beats |

Existing three-beat accented ancestry loop, syncopation, fills and bilingual gesture descriptions remain intact. Every track finishes before its next hit. Default rhythm stills 1→2, 8→9, 17→18 show root-band → coloured tips and recovery.

## Cost

**89,472 fixed vertices** (r3: 93,504), one geometry draw plus background. Native ANGLE Metal/M3 Pro, 64 measured frames/type; synchronous throughput including post, **not venue display cadence**:

| State     | 1080p p50/p95 | 4K p50/p95  |
| --------- | ------------- | ----------- |
| Filaments | 1.8/2.2 ms    | 5.7/10.1 ms |
| Membrane  | 2.3/3.3 ms    | 4.9/9.7 ms  |
| Blossom   | 2.1/2.6 ms    | 4.9/10.2 ms |

Absolute budgets pass. Required interleaved ABBA pair against main `1f2e252`: 1080p p50 delta **0/0/+5.6%** (narrowly fails the +5% relative gate); 4K **+2.2/+4.4/0%** (passes). No samples discarded. The stock pair routes scene modules but not `metamorphosis-geometry.mjs`: both candidates use current geometry, so it compares shaders, not the complete old layout. Shared GPU contention affects tails. Raw data is retained.

## Verification and evidence

- `npm test -- --test-concurrency=2`: **992 pass, 21 opt-in skipped, 0 fail**. Seven family tests cover identity/presets, reversible continuity, exact seams, four gestures/styles, density/spacing, rooted stalk attributes, differing orientations/counts, seed curl, directional release/recovery and maximum-gesture landscape/portrait bounds at four envelope values through 43,200 s.
- Typecheck, build, DE/EN native i18n and owned-file Prettier checks pass; shared flash-pipeline tests pass within the full suite.
- `verify-metamorphosis.mjs`: six looks × three energies × own/Ember/Glacier = 54 images, plus square/portrait reversal with unchanged mesh/time and late variant at 12 h; **zero GL/GPU/non-finite/browser errors**. Additional 180 RAF frames with the unmodified live limiter enabled pass the smoke. Deterministic films/matrix disable asynchronous approval, so they do not establish live photosensitivity compliance.
- Read all three default film-round sheets/rhythm strips, the 54-cell matrix, late square/portrait stills, full Ember/Glacier sheets/rhythm strips and portrait Evening Blossom reversal strip.

Worktree evidence:

- `artifacts/look-review/unfolding-r4/`: final 30 s film, 12-still sheet, 24-frame rhythm sheet, `grids.md`.
- `artifacts/look-review/unfolding-r4-{round1,round2,ember,glacier,portrait-reverse}/`: iteration/palette/reversal evidence.
- `artifacts/verification/unfolding-r4/`: full tests/type/build/i18n logs, matrix/health/limiter smoke, native profiles and pair data.

## Remaining limitations

Approximate transmission rather than physical scattering; no inter-petal shadow tracing. Ember remains bronze/beige and portrait has generous vertical negative space. The membrane is still an authored radial canopy, not irregular biological growth. Full-night live cadence and venue qualification remain unmeasured. No changes to engine, limiter, other families or preview generation.
