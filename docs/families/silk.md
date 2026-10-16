# Silk Storm / Seidensturm

**INCREMENTAL / EMPIRICAL — round 3, 2026-10-16.** Family **111**, renderer `silk`, world **`silk-storm`**. Implementer: **openai-codex/gpt-6.1-sol**. Prescribed satin surfaces, not collision-resolving cloth. No engine, limiter, catalog-preview or world-definition changes.

## Algorithm and persistent identity

Twenty-eight strips have 160 × 4 cells each, followed by 112 additive, depth-tested dust quads: **108,192 vertices**, six floats each, about **2.6 MB per seed**. Only the seed creates geometry; development, energy and rhythm never replace its buffer or identities. Adjacent material coordinates join exactly at Veil.

The Strouhal carrier retains **f = St U/L**, St=.2 and L=12. The integrated tangent is `C′(s)=(cos(a sin(ks−φ)), sin(a sin(ks−φ)))`, evaluated with a Bessel series through J4. The carrier's unit-speed certificate does **not** apply to the artistically amplified complete cloth. Tests bound its sampled Jacobian instead.

The oblique Veil chart spans 16.2 × 11.34 world units, with amplified travelling folds and a broad billow. Banners use independent seeded 3D centre lines, torsion, width variation and depth offsets. Tornado uses conical helices with `r=.45+.235s`, `θ=θ₀+(.72/.235)ln(r/.45)` and `y=sqrt(1−.235²−.72²)(s−6)`. Its carrier is unit-speed; loose outer turns, width and ruffles are artistic additions. All four clocks are integrated and 2π-periodic; no shader reads raw `u_time`.

## States, looks, camera and energy

| Development | EN / DE           | Composition                                                                            |
| ----------- | ----------------- | -------------------------------------------------------------------------------------- |
| 0           | Veil / Schleier   | Large satin folds occupy the frame; distant sheet boundaries dissolve.                 |
| 1           | Banners / Banner  | The same cloth separates into seeded, crossing, varied-width ribbons.                  |
| 2           | Tornado / Tornado | The same lengths wind into an immersive hollow funnel with overlapping lit undersides. |

Main states retain seed **1811** and identical non-development parameters. All eight looks and their parameters/seeds are unchanged: Veil, Banners, Tornado, Raking Moon, Crosswind, Woven Night, Spindle and Satin Wake. Catalog/world wording is unchanged, so no HISTORY or catalog-row migration is required.

The camera retains the slow lateral drift and continuous approach to the vortex, but **removes the final 2.6-unit development-driven rise**. Its final eye stays at y=−3.1: the peak no longer expands suddenly through the last part of the morph. The path is not a temporal spring; fast changes through the whole approach can still move visibly. Sampled camera clearance exceeds .2 units, allowing for the new .1-unit maximum crease displacement and the .1 near plane. Short-side projection works in landscape, square and portrait. Kick focal punch remains bounded at 1.8%.

Energy changes wind speed ×.7–1.3 and fold amplitude ×.75–1.2, not overall brightness. The geometry remains continuous/reversible at every energy.

## Round-3 material and light

Retained anisotropic sheen, filtered weave, derivative-scaled free edges, local two-sample fold-ray occlusion and actual depth occlusion. The inward faces now receive a soft secondary-coloured return lobe; a separate primary grazing lobe provides colour separation without mixing the whole cloth toward grey. The inner shadow floor is less severe. Dust persists faintly at the peak and a low-intensity axial scattered-light background replaces pure black at the far opening. These remain proxies, not volumetric transport or a physical reflection solve.

Permanent accent dye is reduced, reserving stronger accent colour for scheduled events. Close broad folds can still read as metallic film, and individual edge/separation artefacts remain visible in some views. The funnel is stronger than the baseline, but this is **not a claimed independent ≥8 look pass**.

## Four rhythm gestures

All events use the shared music scheduler, not development thresholds or scene-time tricks. Existing ids remain unchanged.

| Slot | Gesture                                               | Visible effect                                                                               |
| ---- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 0    | Flutter packet                                        | Stronger primary sheen packet travelling along existing folds.                               |
| 1    | Selvedge cohort                                       | Soft, wider accent illumination on one slowly addressed hem cohort.                          |
| 2    | Vortex sweep                                          | Broader coloured light front climbing the same lengths.                                      |
| 3    | **Whip-crack ripple / Peitschenwelle** (`whip-crack`) | An actual raised crease races along selected silk, with a matching narrow accent-light wake. |

The signature reads `u_rhythm.w`, `u_rhythmHit.w` and `u_rhythmCount.w` in both mesh stages. A Gaussian front travels in material u as its envelope falls; count chooses one ribbon in seven. Veil uses a smooth global material-coordinate cohort instead so joined strips stay joined. Displacement is bounded to **.1 world units**, tapered across separated ribbon widths; normals are derived from the displaced chart. It introduces no buffer rebuild, feedback, extra pass or unbounded loop. Light and physical ridge share the same mask. English and German labels/descriptions are additive dictionary keys.

| Preset                               | Family hits/bar | Signature steps, 1-based                                                                           |
| ------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------- |
| **Still selvedge / Stille Webkante** | **3.0**         | 1,5,11,17,23,29 of a 32-step eighth-note loop (four bars), strength .65 / duration 1.4 beats.      |
| **Satin current / Satinströmung**    | **8.0**         | 1,3,5,9,11,15 of a 16-step eighth-note loop (two bars), strength .9 / duration .8 beats.           |
| **Vortex brocade / Wirbelbrokat**    | **12.1**        | 1,4,9,11,19,21,25,30 of a 32-step sixteenth-note loop (two bars), strength 1 / duration .45 beats. |

Five-beat flutter figures, independent hem addresses and spaced structural fronts remain distinct; density is not supplied by accelerating structural gestures. `grids.md` records the complete grids. No full-screen white event is added. The shared flash limiter is untouched; deterministic offline film/probe helpers are not a photosensitivity certification.

## Cost and verification

ANGLE Metal / Apple M3 Pro, synchronous native throughput including post, 36 samples/state. Concurrent fleet load affects absolute timing. The profiler accepts **`--families silk`**, not the brief's singular `--family` spelling.

| State   | 1080p p50 / p95 ms | 4K p50 / p95 ms |
| ------- | ------------------ | --------------- |
| Veil    | 2.3 / 2.5          | 6.2 / 6.9       |
| Banners | 2.2 / 2.4          | 5.4 / 6.0       |
| Tornado | 2.2 / 2.4          | 5.9 / 6.3       |

All absolute p50 values satisfy 8ms/16ms budgets. Interleaved reference-main ABBA measurements (64 samples/candidate) are retained under `artifacts/verification/pair-{1080,4k}`:

| State   | 1080p p50 delta | 4K p50 delta |
| ------- | --------------- | ------------ |
| Veil    | +4.8%           | +1.6%        |
| Banners | 0.0%            | +5.9%        |
| Tornado | −4.2%           | +4.8%        |

The 4K pair's more contended Veil result was baseline 12.5/21.6 → final **12.7/15.2 ms p50/p95**. The pair runner's strict +5% guard **fails** for Banners (5.1→5.4ms), although the absolute owner budgets pass; this is not silently called a passing relative-cost gate. Crease evaluation repeats with existing normal/occlusion samples; the added cost is real.

- `npm test`: **986 pass, 21 skip, zero fail** (1007 total).
- Typecheck, build and native DE/EN i18n controls smoke: **pass**.
- Family/world-rhythm/pipeline-flash targeted suite: **48 pass**; family test covers four slots, .w usage, density, finite envelopes, original exact mathematics, deterministic geometry, reversal, periodicity and conservative camera/crease clearance.
- `scripts/verify-silk.mjs --rig --port 48740`: 126 native palette/energy/development/time samples, all eight looks at .1/.9 in square/portrait, paused reversal and identical mesh, isolated signature phases, and a 150-frame **limiter-enabled** real-time smoke. Evidence: `artifacts/verification/silk-r3/verification.json`. Zero GL errors or non-finite uploads; low-energy sampled frames exceed 8% lit coverage. This bounded smoke is not venue qualification.
- Prettier checks on changed formatted JS/test/probe files and `git diff --check`: pass. Existing additive dictionary formatting is retained.

## Film evidence and remaining limits

Baseline plus three improvement rounds were captured and opened. Round 1 revealed desaturated return light; round 2 retained dye but framed the funnel too distantly; round 3 restored immersive framing. Clearance testing rejected two intermediate camera endpoints; the final endpoint and conservative ripple bound pass. Final signature selection/light were narrowed after isolated phase inspection.

Final reviewer evidence: `artifacts/look-review/silk-storm-r3/silk-storm-{sheet,rhythm}.png`, film and `grids.md`; Ember/Glacier sheets are alongside. Portrait: `artifacts/look-review/silk-storm-r3-portrait/silk-storm.png`. Plan: `.claude/world-polish/plans/silk-storm-r3.md`.

**Self-assessment, not independent score: L≈7.0.** Stronger peak composition and clear local rhythmic changes, but satin can read as glossy film, broad close panels are too regular, some ribbon intersections/edges remain hard, and the central opening is still a dark destination. The material and signature's precise travel deserve moving review rather than another inflated self-rating.
