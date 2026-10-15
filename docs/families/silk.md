# Silk Storm / Seidensturm

**INCREMENTAL / EMPIRICAL**, revised 2026-10-15, next round. Family **111**, renderer `silk`, world **`silk-storm`**. Prescribed satin geometry, not a collision-resolving cloth simulation. No engine changes. All world/look/preset ids, names, seeds and parameter values remain unchanged.

## Persistent material and mathematics

Twenty-eight persistent material strips use **160 × 4** cells each, plus **112 additive dust quads**: **108,192 vertices**, six floats each, ~2.6 MB per seed (previously ~3.9 MB). The existing optional `geometry.additiveFrom` contract depth-tests the dust against the opaque cloth without writing dust depth. No new rendering path or texture is needed. Seed alone creates the mesh; development never changes attributes, buffers or material identities. Adjacent strip edges coincide exactly at Veil.

The Strouhal relation remains **f = St U/L**, St = 0.2, L = 12, U = 2–12. Default wind gives f = 0.125 Hz before energy modulation. An integrated 2π-periodic clock owns the travelling phase. The carrier integrates the unit tangent:

`C′(s) = (cos(a sin(ks − φ)), sin(a sin(ks − φ)))`.

The Bessel expansion through J4 retains measured tangent error below **0.062%** at a ≤ 1.08 (test limit 0.15%). This certificate belongs to `flutter()`, **not to the complete artistic surface**.

Veil uses the oblique chart `s = 0.8x + 0.6y + 7.32`, `w = −0.6x + 0.8y`, with x = 12(u − 1/2), y = 8.4(g − 1/2). The centred carrier now samples **2.6s**, divided by 2.6, with curved phase:

`φ = clock + 0.9 sin(0.45w + clock) + 0.25 sin(0.9w − clock)`.

Its amplitude remains `0.72 amplitude (0.85 + 0.15 cos(0.55w))`. World x/y scale is 1.35 (nominal **16.2 × 11.34** sheet); depth is amplified by 2.8, with a broad travelling billow `0.55 sin(0.52x − clock) cos(0.38y + clock)` and two small normal-direction fold harmonics. These are deliberately prescribed camera-facing billows, **not an inextensible deformation**. Relative to the enlarged planar chart, sampled complete-surface principal scales are **0.900–2.278**; tests bound 0.85–2.35 to catch collapsed or runaway charts. The previous 15% gathered-sheet strain certificate no longer applies.

Banners follows long spatial sinusoidal centre lines: stretched flutter in x, a 2.1-unit transverse curve, independent 1.8-unit depth curve, and ~9.5 units of seeded depth offsets. Each ribbon has its own 3D tangent/width frame, tilt, torsion, gentle width-proportional ruffle and width **0.24 + 1.3 rnd²**. This produces large width differences, curved crossings and foreground passes, not a rectangular bank. Ends fade over their last 7.5% of material length.

The established top-state carrier is retained:

- `r(s) = 0.45 + 0.235s`;
- `θ(s) = θ₀ + (0.72/0.235) ln(r/0.45)`;
- `y(s) = sqrt(1 − 0.235² − 0.72²)(s − L/2)`.

Thus `r′² + (rθ′)² + y′² = 1`. The cone grows from radius 0.45 to 3.27 over ~7.84 units of height, with persistent golden-angle ribbons, taper and four loose outer turns. Width/ruffle additions are artistic, not part of the unit-speed certificate.

## States, looks and camera

| Development | EN / DE | Composition |
| --- | --- | --- |
| 0 | Veil / Schleier | Enormous folded sheet fills the frame; most boundaries are offscreen, remaining edges dissolve into darkness. Sparse depth-tested dust catches the key. |
| 1 | Banners / Banner | Long, varied-width ribbons curve and cross through deep space, several passing close to the camera. |
| 2 | Tornado / Tornado | Retained conical vortex and immersive below-cone crane/rise through its hollow axis. |

Main states retain seed **1811** and identical non-development parameters. Extra looks remain **Raking Moon / Streifmond**, **Crosswind / Querwind**, **Woven Night / Gewebte Nacht**, **Spindle / Spindel**, **Satin Wake / Satinspur**. No world-definition or HISTORY edit is needed.

The camera now starts around z = **5.7**, easing back toward **8.9** for Banners, with a slow lateral drift. The existing top-state camera, target/up-vector interpolation and rise are unchanged. Portrait uses the same short-side projection. Kick focal punch stays below 1.8%. The morph remains continuous and reversible, with no seed/time reset, cut or image dissolve.

## Light, colour and atmosphere

Palette-secondary carries dark undersides; a primary-tinted, narrower anisotropic sheen defines front-facing folds. Strong float highlights feed bloom. Exactly two persistent ribbons receive accent dye/glints once the veil separates. This avoids the first trial's broad yellow-white highlights while adding variation beyond uniformly blue fabric.

Two bounded neighbouring material samples per vertex provide **gentle local fold-ray shadowing**; depth testing handles actual ribbon occlusion. This is not full inter-ribbon cast-shadow transport. Fine weave and free-edge coverage are derivative-filtered; Veil's outer 12% fades toward fog rather than revealing a lit rectangular silhouette. The floor has a soft palette-coloured light pool and low-frequency travelling reflection proxy, with a faint light-beam haze. The motes are deliberately sparse and faint; floor/fog are most visible in portrait and between ribbons, not through the opaque sheet.

Energy changes wind speed (×0.7–1.3) and fold amplitude (×0.75–1.2), not global brightness. Existing 4/8/16-beat gestures remain Flutter packet, Selvedge cohort and Vortex sweep. Four 2π-periodic clocks own all motion; no shader uses `u_time`.

## Cost and verification

To offset greater frame coverage, inactive geometry charts are omitted with uniform branches, transverse mesh cells drop from 6 to 4, fold-ray samples drop from 6 to 2, and view vectors are interpolated instead of rebuilding the camera per fragment.

Native headless Chrome / ANGLE Metal / Apple M3 Pro, energy .95, including post. **Paired same-session old `f7d171e` → final p50 ms**, 60 samples per version/state/resolution, alternated in ten batches. Both `scene-silk.mjs` **and** `silk-model.mjs` are routed to the old revision for the baseline (the generic profiler's reference option does not route this helper).

| State | 1080p before → after | Change | 4K before → after | Change |
| --- | --- | --- | --- | --- |
| Veil | 2.5 → **2.2** | −12.0% | 5.7 → **5.5** | −3.5% |
| Banners | 2.3 → **2.0** | −13.0% | 4.9 → **4.9** | 0% |
| Tornado | 2.4 → **2.1** | −12.5% | 5.1 → **5.0** | −2.0% |

Every paired state stays within baseline +5%, and final costs stay below **8 ms / 16 ms**. Standard `profile-families.mjs --types --families silk` final independent probes were 2.6 / 2.2 / 2.1 ms at 1080p and 5.7 / 5.5 / 5.5 ms at 4K. Absolute timings varied with concurrent fleet work; the previous report's archived 2.3 / 2.0 / 2.0 and 5.2 / 4.3 / 4.8 ms are not silently treated as same-condition samples. This is synchronous throughput, not venue cadence qualification.

- `node --test tests/silk.test.mjs tests/time.test.mjs`: **18/18 pass**. Includes world lookup by id, exact carrier/helix mathematics, explicit artistic Jacobian bounds, joined seams, deterministic dust tail, real sheet depth/extent, curved banner centre lines, width ratios, reversal/periodicity and camera clearance.
- Opt-in native `tests/browser/silk.test.mjs`: **pass**. Low-energy frames across six developments and 3600/43200 s; Veil lit coverage 52–61%, border coverage 51–54%. Paused .65 → 1.92 → .65 is pixel-identical and keeps the same mesh. Zero GL/non-finite errors.
- Native time seam/rate audit: **0 families with seams or errors**.
- Typecheck, build and DE/EN native i18n smoke: **pass**.
- Full CPU suite: **740 pass, 9 skip, 3 expected catalog preview/editorial failures**. Integration owns preview baking and curation; those files are untouched.

## Film review and limits

Baseline and **four 30-second improvement rounds** were filmed and their strips/full stills opened: 1) enormous sheet, curved/deep ribbons and dust; 2) narrower sheen, more folds and restrained palette mixing; 3) curved gathering, improved torsion and shader-cost reductions; 4) gentler width-scaled ruffles and full derivative edge fade. Default, Ember, Glacier, Silver Crosswind, portrait and all eight energy ladders were reviewed; native 1080p/4K stills and 1:1 crops retained. The completed ladder is from round 3, before the small ruffle/edge-coverage polish; final palette/portrait films and GPU tests cover that polish. Two generic-ladder repeat attempts and a no-RAF sampler attempt timed out during late shared-machine verification; no successful final-ladder repeat is claimed. Superseded main films were removed, retaining baseline/final and round strips.

Evidence root: fleet worker `silk-storm/output/next/`; final film/strip `final/silk-storm.{mp4,png}`, baseline `baseline/silk-storm.{mp4,png}`, independent **Abyssal Bloom** comparison `reference/deep-sea.{mp4,png}`. Absolute paths and final hash are in `output/report.md`.

**Honest rating: 8/10 overall** (Veil ~7.5, Banners ~8, Tornado ~8). Not 9/10 against the reference. The flag/strip-bank composition is substantially improved, but the material remains prescribed satin with regular large ridges; intersections have depth occlusion but no collision/cast-shadow solve. A few close Crosswind ribbons become broad glossy panels; Raking Moon still exposes a partially separated band pattern. Atmosphere is restrained, and the floor is a reflection proxy, not a physical mirror. No claim of physical cloth or reference-level finish is made.
