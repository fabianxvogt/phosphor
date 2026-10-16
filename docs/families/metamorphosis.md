# Living Forms — Unfolding Garden

**INCREMENTAL / EMPIRICAL**, r5 (2026-10-17). Fixed parametric membrane choreography, not biological simulation. Independent r4 review: L7/G8.5/E8, overall 7.5. r5 **self-assessment**: L7.5/G8.5/E8, rounded overall 8; independent acceptance remains unverified.

## Development and identity

`metamorphosis-geometry.mjs` generates fourteen seeded centres, individually rooted curved stalks, seed heads and separate radial membrane strips. The static mesh has **88,320 vertices**, one geometry draw plus background. Development never rebuilds geometry, changes the seed, resets time or moves the camera.

- **Filaments (0):** substantial rolled membranes stand around the persistent seed centre. Their tips turn inward; gaps expose shaded undersides.
- **Membrane (1):** those same strips extend into separate cupped membranes. The cup remains deep instead of closing into a continuous radial saucer.
- **Blossom (2):** the membranes broaden and release into an irregularly extended crown, retaining veins and a small accent seed head.

The former exact adjoining-sector seam requirement is deliberately retired: separated membranes are the visual identity, not an intermediate disc. Tip reach increases monotonically across development; reverse sweeps are the same memoryless deformation.

All six look names/seeds, state names/IDs, schema keys and rhythm IDs remain intact: **First Filaments**, **Pearl Membranes**, **Open Blossom** (112), **Wandering Threads**, **Silver Canopy** (847), **Evening Blossom** (2451). The previous authored world definition is appended to `worlds.mjs` HISTORY because the description/state appearance changed.

## Material, space and energy

Saturated secondary-colour interiors transition into primary-colour tips. Palette-derived pigments replace broad olive/white wax; directional back-transmission, wavering midribs, branching side veins and fine static fibres suggest thin tissue. Dark roots and overlap folds remain. Specular is reduced; bright grazing light is selected by fold orientation rather than outlining every petal. Rose is restricted to seed heads and travelling sap.

The same fourteen plants now form overlapping rear clusters with distance haze, a middle layer and one nearer three-membrane curled framing form. Distant surfaces omit fine veins and lose contrast; this is analytic atmosphere, **not depth-of-field blur**. Individual rooted stalks, varied tilt and petal count remain. Screen-margin attenuation avoids hard bright border cuts.

Energy changes lateral membrane bend, sway and vein frequency, never material gain. Living sway, Surface light and Motion speed remain the live faders. Integrated clock 0 (period 50π) and its late variant preserve speed continuity. Camera remains the closed, development-independent arc; landscape lens 3.35, portrait/square 2.30, kick punch 1.5%. CPU bounds retain 60–80% peak landscape hero occupancy.

## Rhythm

| Slot | Gesture                       | Action                                                                                                                 |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 0    | Ancestry glow                 | A local sap illumination travels through stalks and tissue.                                                            |
| 1    | Membrane edge                 | Soft margin light and bounded tip flex.                                                                                |
| 2    | Golden centres                | Small seed heads expand and illuminate locally.                                                                        |
| 3    | **Petal flush / Blütenwelle** | A vein-led coloured front travels centre → tip, uncurling a count-selected whorl behind it, with a decaying vein wake. |

The signature's position is `1.12 - 1.25 * envelope - veinDelay`; continuous angle harmonics and transverse vein offsets stagger individual membranes. Both deformation and colour use that delay. The front is strongest along an irregular midrib, not an annular stripe. Release extends at most 0.22 node radii and lowers tips by at most 0.34; it smoothly recovers as the envelope ends. Count selects the responding whorl; hit adds only a small seed-head accent. No event is development-triggered.

| Preset           | Family hits/bar | Signature steps (zero-based native grid)     |
| ---------------- | --------------- | -------------------------------------------- |
| Folded seed      | 3.0             | 12, 30 / 32, division 2; 1.4 beats           |
| Opening whorl    | 6.5             | 4, 13 / 16, division 2; 1.5 beats            |
| Golden emergence | 11.2            | 0, 6, 12, 20, 26 / 32, division 4; 0.7 beats |

All placements, syncopation, the accented three-beat ancestry loop and bilingual gesture copy are preserved. Final rhythm 1→2, 8→9 and 17→18 show localized root/vein-to-tip responses and changed curl. The shared limiter is untouched; no full-screen white.

## Film rounds

1. Retire the disc and cluster satellites; the first capture is too dark, seed strips too narrow, far clusters become black silhouettes.
2. Broaden seed membranes and restore saturated lighting. The arc reads, but smooth green faces still suggest wax.
3. Add fine fibres, thinner pleats and secondary-lit interiors. Large still reveals grey mixing between complementary palette colours.
4. Nonlinear pigment shaping retains saturated blue interiors/green tips (red interiors in Ember); retain restrained highlights. Final refinement increases the local vein front slightly and gives far haze directional shading.

Read each round's sheet/rhythm plus large hero/membrane stills; also read final default, Ember/Glacier sheets, all 54 matrix cells, portrait reversal and 12-hour square/portrait captures.

## Native cost

ANGLE Metal / Apple M3 Pro; 64 measured frames/state, synchronous whole-frame throughput including post, **not display cadence**:

| State     | 1080p p50/p95 | 4K p50/p95   |
| --------- | ------------- | ------------ |
| Filaments | 2.1 / 3.7 ms  | 5.1 / 8.9 ms |
| Membrane  | 2.2 / 5.1 ms  | 6.1 / 9.2 ms |
| Blossom   | 2.1 / 4.4 ms  | 6.0 / 9.7 ms |

Absolute p50 budgets pass. Required ABBA pair against main: 1080p **0 / +5.6 / 0%**; 4K **+2.2 / 0 / +8.7%**. Both narrowly fail the +5% relative gate; all raw samples retained. Fleet contention affects tails. The stock pair routes historical scene modules but not `metamorphosis-geometry.mjs`, so both candidates use current geometry: this comparison isolates shaders, not the old complete layout.

## Verification and paths

- Full suite: **1001 pass, 21 opt-in skipped, 0 fail**. Eight family tests cover fixed identity/presets, smooth reversal, separated membranes, monotonic release/cup depth, rooted stalks, all four gestures/styles/densities, directional release/recovery and maximum-gesture landscape/portrait bounds through 43,200 s. Flash-pipeline tests pass in the full suite.
- Typecheck, build, native DE/EN i18n and owned formatted-source checks pass. Shared catalogs retain pre-existing formatting outside the owned entries.
- Native matrix: six looks × three energies × own/Ember/Glacier, square/portrait unchanged-mesh reversal and late variants at 12 h; zero GL/GPU/non-finite/browser errors. Additional **180 limiter-enabled RAF frames** pass. Deterministic films disable asynchronous flash approval and do not establish venue photosensitivity compliance.
- Final reviewer evidence: `artifacts/look-review/unfolding-r5/` (film, sheet, rhythm, grids, large hero).
- Iterations/palettes/reversal: `artifacts/look-review/unfolding-r5-{round1,round2,round3,round4,ember,glacier,portrait-reverse}/`.
- Tests, matrix, profiles, pairs: `artifacts/verification/unfolding-r5/`.

Remaining limitations: approximate transmission/contact shading rather than physical scattering/self-shadowing; far forms can read as simplified silhouettes; portrait has generous vertical negative space. Full-night venue cadence remains unmeasured. No engine, limiter, other-family or preview-generation changes.
