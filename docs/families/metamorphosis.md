# Living Forms — Unfolding Garden

**INCREMENTAL / EMPIRICAL**, updated 2026-10-16 (r3). Connected parametric surface choreography, not a biological growth model. The earlier self-rating of 8.5 did not survive independent baseline review (L4/G2/E2, overall 3); it is not an acceptance claim for this revision.

## Algorithm and identity

`metamorphosis-geometry.mjs` creates fourteen seeded centres, their curved branching ancestry, radial surface sectors and seed-head meshes. Eight foreground centres and six distant forms retain identity across development, reversal and energy. The hero is centre 1. Mesh allocation depends only on seed; changing development never rebuilds it.

Each sector continuously deforms through three states:

- **Filaments** (0): curved, rounded leaf-like ribbons with a visible pinwheel silhouette. Broader than the former needle spokes, but deliberately sparse.
- **Membrane** (1): adjacent sector edges meet exactly into a ribbed, shallow cupped surface. The slot-3 pressure wave also preserves these seams.
- **Blossom** (2): the same sectors separate into asymmetrically curled petals around a textured centre.

All preset names, seeds, schema keys, world/state IDs and rhythm IDs are unchanged. The three seed-112 state looks are **First Filaments**, **Pearl Membranes**, **Open Blossom**. Additional arrangements are **Wandering Threads** (847), **Silver Canopy** (847) and **Evening Blossom** (2451). Thus `worlds.mjs`, its migration HISTORY and the existing CATALOG algorithm description need no changes.

## r3 visual work

Five filmed iterations followed the before capture. Stronger palette-coloured diffuse/back transmission replaces the dim white-mixed material. Longitudinal ribs, blue/secondary contact folds, restrained specular reflection and rare accent-coloured sap fronts articulate the surface rather than outline it. Textured seed heads replace smooth beads. Petal roots narrow to reduce intersections; the two nearest rear flowers move away from the hero's petal volume.

Peripheral blossoms are larger, provide scale and fill the landscape; distance haze, a soft receiver/mist field and an edge fade keep them subordinate. Stems are tapered curved paths, though their shared root still reads geometrically in some views. The camera is a closed, fixed-rate arc with perspective/parallax; its lower elevation makes the crown more dimensional. It never depends on development. The lens is aspect-aware (3.54 landscape, 2.30 square/portrait) to retain margins during maximum local opening, sway and kick. Kick lens change remains 1.5%.

## Energy and motion grammar

Living sway, Surface light and Motion speed remain the three live faders. Energy changes the ribbon bend, sway and vein frequency; it does not multiply material brightness. Surface light remains a manual gain. Development controls form independently of energy. Existing integrated speed clock 0 (period 50π) continues to drive sway and vein motion, with the first-hour/late shader paths intact. No frame-random grain, simulation resets, new passes or engine changes.

## Rhythm

Four independent authored tracks:

| Slot | Gesture                       | Visible action                                                                                                                      |
| ---- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Ancestry glow                 | Local sap band travels outward along branches and radial tissue.                                                                    |
| 1    | Membrane edge                 | Surface margins brighten and curled tips flex upward, bounded to 0.10 node radii.                                                   |
| 2    | Golden centres                | Local seed heads swell by at most 25% and emit accent light.                                                                        |
| 3    | **Petal flush / Blütenwelle** | A count-selected angular whorl flushes from its centre to its tips; membranes bulge and curled petals extend/release, then recover. |

The signature consumes `u_rhythm.w`, `u_rhythmCount.w` and a small seed-head response to `u_rhythmHit.w`. The moving band is local, not a whole-frame tint. Release extends a tip at most 0.15 radii and lowers it at most 0.22 radii. It works at held development and is not a development-threshold event. Both languages have label/description keys.

| Preset           | Family hits/bar | Signature placement (zero-based, native step grid)            |
| ---------------- | --------------- | ------------------------------------------------------------- |
| Folded seed      | 3.0             | Steps 12 and 30 of 32 at division 2; soft 1.4-beat release.   |
| Opening whorl    | 6.5             | Steps 4 and 13 of 16 at division 2; 0.9-beat release.         |
| Golden emergence | 11.2            | Steps 0, 6, 12, 20, 26 of 32 at division 4; 0.7-beat release. |

Existing six-beat ancestry figures interlock with the whorl accents. All tracks settle before the next hit. The shared flash limiter is untouched; no full-screen white events.

## Cost and verification

Static mesh remains **93,504 vertices**; fixed tessellation, one geometry draw plus the existing background. Native ANGLE Metal/M3 Pro synchronous throughput, 64 measured frames/type (not display cadence):

| Development | 1080p p50 / p95 | 4K p50 / p95 |
| ----------- | --------------- | ------------ |
| Filaments   | 1.8 / 2.1 ms    | 4.9 / 5.4 ms |
| Membrane    | 2.0 / 2.3 ms    | 4.8 / 5.2 ms |
| Blossom     | 2.7 / 3.2 ms    | 4.9 / 5.4 ms |

The required shared ABBA pair against main yielded p50 deltas **+30%, +5.3%, 0%** at 1080p and **0%, +2.2%, −8.8%** at 4K. The 1080p pair exits nonzero on its +5% gate despite absolute cost staying far below budget. Shared GPU contention produces large tails; no failed samples were discarded. The stock pair routes scene source, not `metamorphosis-geometry.mjs`, so both candidates use the new centre layout: these are shader comparisons, not a complete historical-layout comparison. CLI correction: the profiler supports `--families`, not the brief's `--family`.

Verification: `npm test` 970 pass / 21 opt-in skipped / 0 fail; typecheck; built DE/EN native-GPU i18n test; Prettier on owned code/docs. Family tests cover seeded identity/preset validation, reversible continuity, exact membrane seams including maximum flush, all four gesture slots/styles, density and spacing, structural energy, top-state size and maximum-gesture portrait/landscape bounds through 43,200 seconds. `verify-metamorphosis.mjs` checks all six looks × three energies × own/Ember/Glacier palettes, square/portrait reversals with unchanged mesh/time, and late geometry compilation: 56 cases, zero GL errors/non-finite values.

Final evidence in the worktree:

- `artifacts/look-review/unfolding-r3/`: default film, 12-frame sheet, 24-frame rhythm sheet, `grids.md`.
- `artifacts/look-review/unfolding-r3-{ember,glacier}/`: alternate palette films/sheets.
- `artifacts/look-review/unfolding-r3-portrait-reverse/`: Evening Blossom reversal.
- `artifacts/verification/unfolding-r3/`: matrix/late images, health JSON, test/build logs and raw profiles.

## Remaining limitations

No inter-petal ray-traced shadows or physical scattering. Early states still resemble pinwheels; secondary crowns repeat the hero's vocabulary; stems can read as a diagram and portrait retains empty vertical margins. Ember is more metallic/beige than botanical. The revision is a substantial improvement, **not a claim of independent ≥8 acceptance**. Native full-night endurance and venue display cadence remain unmeasured.
