# Silk Storm / Seidensturm

**INCREMENTAL / EMPIRICAL**, 2026-10-15. Family **111**, renderer `silk`, world `silk-storm`. A continuous, prescribed cloth world; not a collision-resolving finite-element cloth simulation. No renderer or engine changes.

## Signature mathematics

Twenty-eight persistent material strips share one **160 × 6** tessellation each. At development 0 their boundaries coincide exactly, making one **12 × 8.4** silk sheet. Seed-only attributes are `(u, v, ribbon id, three random identity values)`; development never rebuilds the mesh. The full mesh contains 161,280 vertices, six floats per vertex (~3.9 MB).

The flutter frequency is the flag Strouhal relation **f = St U/L**, with **St = 0.2**, L = 12 and wind U = 2–12. The default U = 7.5 gives f = 0.125 Hz before energy modulation. A material wave has 1.5 wavelengths over the sheet's length. An integrated engine clock owns `2π f`; changing wind changes speed, never the existing phase.

Instead of adding a sine displacement to an unstretched x coordinate, integrate the unit tangent

`C'(s) = (cos(a sin(ks − φ)), sin(a sin(ks − φ)))`.

The Bessel expansion through J4 gives closed-form x/z positions without a per-vertex integration loop. At the largest allowed tangent amplitude a = 0.72 the CPU derivative certificate bounds the truncation strain below **0.02%**. Two small normal-direction travelling harmonics produce silk micro-folds. CPU tests measure the complete rendered Veil metric, including shear: singular values of the material Jacobian stay within **3.4% of one** (longitudinal <3.1%, transverse <1.2%). This is a bounded near-inextensible surface, not just a test of the abstract sine frequency.

The core vortex carrier is a unit-speed conical helix:

- `r(s) = 0.45 + 0.235 s`
- `θ(s) = θ₀ + (0.72/0.235) ln(r/0.45)`
- `y(s) = sqrt(1 − 0.235² − 0.72²) (s − L/2)`.

Thus `r'² + (r θ')² + y'² = 1`. The tower grows from radius 0.45 to 3.27 over ~7.84 units of height. Each ribbon keeps its golden-angle phase. Width tapers towards the base; travelling torsion and small transverse ruffles make the same ribbon catch light differently along its length. Four persistent ribbons unfurl into longer outer turns as spatial foreground cues.

**Model boundary:** development deliberately changes the prescribed rest composition: joining/separating strips, banner spacing, width taper and the four long outer turns are artistic morphs, not material-conservation assertions. The 3.4% strain certificate applies to the joined fluttering Veil; the unit-speed certificate applies to the core helix carrier. There is no global collision, bending-energy or inextensibility solve for every morph midpoint. CPU reference and shader formulas live together in `silk-model.mjs`.

## States and looks

All three states have seed **1811** and identical non-development parameters. Development is continuous and reversible.

| Development | EN / DE | Composition |
| --- | --- | --- |
| 0 | Veil / Schleier | One large sheet in the dark, with travelling folds and a slowly moving raking key. |
| 1 | Banners / Banner | Twenty-eight broad silk banners open into independently tilted, interwoven wind paths. |
| 2 | Tornado / Tornado | The banners wind into a tall cone; the camera cranes beneath it and rises into its hollow axis. |

Five additional looks (eight total):

- **Raking Moon / Streifmond:** slow early separation, deeper flutter, restrained camera.
- **Crosswind / Querwind:** widely spaced, broad banners with stronger wind and folds.
- **Woven Night / Gewebte Nacht:** dense held banner-to-spiral composition, development 1.28.
- **Spindle / Spindel:** narrow ribbons and a slower, tighter interior vortex.
- **Satin Wake / Satinspur:** restrained flutter across a widely opening veil.

## Light, camera and energy

Two-sided silk combines palette-dyed diffuse light, longitudinal anisotropic sheen, broad specular highlights, backlit transmission, grazing rim light and a moving raking-light pool. Highlights can exceed 1.0 on the float target. Fold-valley and inner-vortex soft darkening approximate self-shadowing; depth testing supplies actual inter-ribbon occlusion. These are analytic lighting proxies, not a shadow map or sorted refractive transparency. Fine weave is derivative-filtered; soft material-edge shading and dense tessellation avoid heavy outlines. All colour is palette primary/secondary, rare accent hems, and white/black mixes. Background haze, a soft shaft and a dark floor pool establish space without competing with the cloth.

The camera starts around z = 13 with a slow lateral drift. During the upper transition it cranes to y = −5.7 **beneath the completed cone**, then rises to y = −3.1 inside its hollow centre. Geometry completes its cone by development 1.72, before the camera rises through the throat. A smoothly changing up-vector avoids the vertical-look singularity. The peak intentionally surrounds the camera and extends beyond the image: this is an interior view of the hero, not a cropped exterior miniature. Exterior structure remains visible on approach. Projection uses the short side, including portrait; kick focal punch is bounded to 1.8%.

Energy changes wind speed (×0.7–1.3) and fold amplitude (×0.75–1.2), not master brightness. Three bounded `familyEffect` gestures trace the signature:

1. **Flutter packet**, 4 beats: a sheen packet travels along existing material folds.
2. **Selvedge cohort**, 8 beats: one persistent cohort's hems catch rare accent light.
3. **Vortex sweep**, 16 beats: a broad raking-light front climbs the cloth into the spiral.

## Endlessness and verification

Four bounded, 2π-periodic clocks own flutter, vortex turn, camera drift and raking light. No shader uses `u_time`; no populations are reseeded or replaced by development. Every harmonic completes an integer number of cycles in its clock period.

- `node --test tests/silk.test.mjs tests/time.test.mjs`: **16/16 pass**. Includes measured zero-crossing frequency, tangent and full Veil strain, unit-speed helix, seed-only identity, exact joined seams, continuity/reversal, periodicity, finite presets and camera clearance/nonsingular frames.
- Native GPU low-energy samples at development 0/.5/1/1.3/1.7/2, times 3600 and 43200: zero GL errors and non-finite uploads; no empty frames. Paused .65 → 1.92 → .65 is **pixel-identical** and retains the same mesh buffer.
- `scripts/check-time-wrap.mjs --rig --port 48506 --families silk`: zero seams/errors through 3600, 4096 and 43200, including energy/rate nudges.
- `npm run typecheck`, build, dictionary CPU tests and DE/EN native browser i18n smoke pass.
- Full repository test results are recorded in the fleet report; only the three expected unbaked-preview/editorial-catalog failures remain. Preview/curation files are intentionally untouched for integration.

Native headless Chrome / ANGLE Metal / Apple M3 Pro, energy 0.95, 12 synchronous samples including the post chain:

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Veil | 1.8 / 2.0 ms | 4.2 / 5.0 ms |
| Banners | 3.1 / 8.5 ms | 4.0 / 4.2 ms |
| Tornado | 2.8 / 4.5 ms | 4.5 / 4.8 ms |

An earlier quieter pass measured 1.6–1.7 ms p50 at 1080p and 4.0–4.2 ms at 4K; the final shared-machine 1080p pass includes a contention spike (Banners p95 8.5 ms). These are shared-machine throughput samples, not projector/display-cadence qualification. Every state is comfortably below the 8/16 ms budgets.

## Review evidence and limits

After the first working film, five-plus improvement passes addressed scale, rigid banner orientation, cylindrical vortex shape, torsion/folds, the immersive camera climax, micro-ruffles and camera-frame/strain safety. Superseded rounds were deleted; baseline and final remain.

- World film/strip: `artifacts/silk/final/silk-storm.{mp4,png}`.
- Ember and Glacier world films/strips: same directory, `silk-storm-{ember,glacier}`.
- Extra look: `artifacts/silk/final/silk-spindle-silver.{mp4,png}`.
- Portrait: `artifacts/silk/portrait/silk-storm-glacier.{mp4,png}`.
- All eight looks at energy .1/.5/.9: `artifacts/silk/ladder/index.html`.
- GPU and timing records: `artifacts/silk/gpu-verification.json`, `profile-1080/profile.json`, `profile-4k/profile.json`, `time-audit/`.

The cloth remains stylised satin. Banners can intersect during prescribed interweaving; self-shadow and transmission are bounded analytic approximations. Edge coverage is not multisample or order-independent transparency. The peak is deliberately an enveloping interior, with foreground ribbons crossing the image border. No claim is made of multi-hour external-display cadence or physical cloth collisions.
