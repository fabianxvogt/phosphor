# Silk Storm / Seidensturm

**INCREMENTAL / EMPIRICAL — r4, 2026-10-17.** Family **111**, renderer `silk`, world **`silk-storm`**. Implementer: **openai-codex/gpt-6.1-sol**. Prescribed satin charts, not collision-resolving cloth. No engine, limiter, catalog-preview or saved-world definition changes.

## Geometry and material

The same 28 persistent material lanes now form **seven broad cloth lengths**, four lanes per panel. Each lane has **160 × 12 cells**; 112 depth-tested additive dust quads follow the cloth. Total **323,232 vertices**, six floats each, **7.76 MB per seed**. Adjacent lanes share panel randomness, position and derivatives. The buffer is seed-only and never changes during development, energy or rhythm.

The Strouhal carrier remains **f = St U/L**, St=.2, L=12. Its integrated tangent uses the Bessel expansion through J4. The carrier's unit-speed certificate does **not** apply to the complete amplified cloth. All clocks are integrated and 2π-periodic; there is no raw shader `u_time` arithmetic.

- **Veil:** the original oblique 16.2 × 11.34 chart, travelling satin folds and broad billow remain. Separation begins after development .35, once the camera has pulled away, keeping the opening hold continuous instead of drawing hairline black cuts across it.
- **Banners:** seven layered diagonal sweeps replace 28 randomly oriented slats. Rounded transverse bellies, curling hems and smaller cross-width folds supply real double curvature. Actual crossings still use the depth buffer; internal lane seams are not free edges.
- **Tornado:** the lengths nest edge-to-edge into a continuous twisted satin canopy. The shared periodic chart removes the intersecting, pointed turbine shoulders. Seven principal pleats carry nonuniform phase warps and finer folds. The conical carrier radius `.45 + .235s` returns inward above u=.48, ending at 8% of its unconstricted radius. Progressively smaller folds continue into the centre rather than surrounding a dead black opening. This final artistic chart is not the unit-speed helix tested separately.

The original directional satin gradients, anisotropic sheen, filtered weave, two-sample fold-ray occlusion and palette-derived blue/violet body remain. Banners receive a selective secondary return lobe, not a global exposure lift. Grazing contacts fade softly so nearly tangent analytic highlights do not draw a bright one-pixel wire. Free edges use resolution-scaled coverage; final joined seams receive neither coverage darkening nor permanent hem outlines. Accent dye is reserved mainly for scheduled events.

## States, looks, camera and energy

| Development | EN / DE           | Composition                                                    |
| ----------- | ----------------- | -------------------------------------------------------------- |
| 0           | Veil / Schleier   | Immersive close-up folds, with distant boundaries dissolved.   |
| 1           | Banners / Banner  | Seven broad receding satin sweeps, separated in depth.         |
| 2           | Tornado / Tornado | Continuous pleated vortex returning into a small folded crown. |

All state names, seed **1811**, identical non-development state parameters, schema keys and eight preset definitions remain unchanged: Veil, Banners, Tornado, Raking Moon, Crosswind, Woven Night, Spindle and Satin Wake. The authored world definition is unchanged; no HISTORY migration or catalog wording change is needed.

The camera retains the r3 approach and final eye at y=−3.1, now aiming slightly off-axis. There is no final development-driven rise. Sampled clearance exceeds .22 units, allowing for .12 maximum signature displacement and the .1 near plane. This is a sampled guard, not collision detection. Energy changes wind ×.7–1.3 and fold amplitude ×.75–1.2; peak amplitude and ribbon width affect the canopy's pleat depth. Kick focal punch stays at 1.8%.

## Four rhythm gestures

All ids and authored placements remain unchanged; all four gestures use the shared scheduler.

| Slot | Gesture                                               | Effect                                                                                                     |
| ---- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 0    | Flutter packet                                        | Softer coloured sheen travels along existing folds.                                                        |
| 1    | Selvedge cohort                                       | One slowly selected panel catches local hem/pleat light.                                                   |
| 2    | Vortex sweep                                          | Secondary raking-light front climbs the material.                                                          |
| 3    | **Whip-crack ripple / Peitschenwelle** (`whip-crack`) | A localized raised transverse crease advances along one cloth length, followed by a narrow saturated wake. |

The signature reads `.w` of envelope, hit and count. Event count selects one panel out of seven. A Gaussian material-u front and smooth squared-sine width mask drive both **actual radial displacement (≤ .12 units)** and local accent light. Normals and fold shadows sample the displaced chart. The wake trails by .045 material-u. At fixed time, isolated envelope samples .9 → .55 → .2 show the fold advancing from foreground to crown and relaxing. Muted envelopes/hits produce no displacement. Veil uses a continuous global-coordinate mask to preserve joined seams.

Broad secondary packets were reduced, rather than competing with the signature as cyan-white whole-strip washes. No full-screen event, extra render pass, simulation reset or buffer rebuild is added. The shared flash limiter is untouched.

| Preset                               | Family hits/bar | Signature steps (1-based)                                                      |
| ------------------------------------ | --------------- | ------------------------------------------------------------------------------ |
| **Still selvedge / Stille Webkante** | **3.0**         | 1,5,11,17,23,29; 32 eighth-note steps; strength .65, duration 1.4 beats.       |
| **Satin current / Satinströmung**    | **8.0**         | 1,3,5,9,11,15; 16 eighth-note steps; strength .9, duration .8 beats.           |
| **Vortex brocade / Wirbelbrokat**    | **12.1**        | 1,4,9,11,19,21,25,30; 32 sixteenth-note steps; strength 1, duration .45 beats. |

Five-beat flutter figures, unequal loop lengths, off-beats and delayed structural fronts are retained. Full grids: `artifacts/look-review/silk-storm-r4/grids.md`.

## Verification and cost

Final native ANGLE Metal / Apple M3 Pro results are recorded under `artifacts/verification/silk-r4*`. Throughput includes post-processing, excludes asynchronous flash approval, and is not venue cadence. Concurrent fleet load affects measurements.

| State   | 1080p p50 / p95 ms | 4K p50 / p95 ms | Pair p50 Δ 1080p / 4K |
| ------- | ------------------ | --------------- | --------------------- |
| Veil    | 2.5 / 3.0          | 7.7 / 9.8       | +26.1% / +15.5%       |
| Banners | 2.8 / 3.0          | 7.1 / 10.4      | +27.3% / +14.8%       |
| Tornado | 2.6 / 3.0          | 7.8 / 9.9       | +28.0% / +18.5%       |

Absolute p50 budgets (8ms / 16ms) pass for every state. The denser mesh costs more: both ABBA pair runners **fail their strict +5% regression guard**. This is not described as a passing relative-cost gate. The pair's final 4K values were 6.7/9.0, 6.2/9.6 and 6.4/9.7ms p50/p95. Final-source samples and reference revision are retained in the profile JSON.

- `npm test`: **1018 pass / 22 skip / zero fail**; typecheck passes.
- Family tests cover exact carrier mathematics, deterministic mesh, reversible periodic development, preset validity, four rhythm slots/density/finite envelopes, camera margin, internal position/tangent seam continuity, the periodic canopy closing seam and a non-inverting shrinking crown.
- `scripts/verify-silk.mjs --rig --port 48740`: 126 palette/energy/development/time samples; own/Ember/Glacier, .1/.5/.9 energy, late time 43,200, paused reversal and unchanged mesh. All eight looks are captured at .1/.9 in square/portrait. Isolated signature images and a 150-frame **limiter-enabled** real-time smoke are retained. This bounded smoke is not photosensitivity or venue qualification.
- Build, native DE/EN i18n smoke, Prettier and final GPU profiles are recorded in the r4 logs/report.

## Film rounds and limits

Opened sheets and individual large stills for four structural rounds, then a denser-mesh detail pass and a rejected fifth chart experiment. Round 1's seven broad strips still looked like an iris; round 2's independent billows retained pointed intersections; round 3 nested the peak lengths into a continuous canopy; round 4 broke rotational regularity, preserved the early veil and strengthened secondary satin folds. Final contact feathering and denser width tessellation reduce grazing-edge aliasing. The signature's squared-sine mask uses explicit multiplication, avoiding undefined GLSL pow on negative out-of-domain hem samples used for finite-difference normals. Reparameterizing the Veil was rejected after filming because it degraded the close-up satin gradients; delaying separation until the camera clears the foreground preserved them instead. Final own/Ember/Glacier sheets and rhythm strips are in **`artifacts/look-review/silk-storm-r4/`**.

The material is still an artistic satin approximation, and intermediate morphs are not a cloth collision solve. A very fast development sweep can still move the camera visibly. Exact signature travel is clearer in isolated samples/motion than in half-beat strips; no independent ≥8 acceptance is claimed here. Plan and per-round critique: `.claude/world-polish/plans/silk-storm-r3.md`.
