# Moon Tide · Mondflut

Family **103**, renderer `tide`, world `moon-tide`. **INCREMENTAL / EMPIRICAL**, round 3, 2026-10-16. Implementation/continuation: **openai-codex/gpt-6.1-sol**. Native captures are evidence, not venue qualification. The old wave-5/6 self-ratings are superseded: current honest **self-assessed L = 7**, not an independent pass.

A reflective night ocean: a silver moon road, peeling bioluminescent breakers, then the _same_ sea wound into a deep glowing maelstrom. This round resumes the useful scene work from `polish2/moon-tide` rather than blindly merging its branch. No engine, limiter, catalog-preview or world identity changes.

## Core mathematics and rendering

Six persistent seeded Gerstner modes: `ωᵢ = 0.35 nᵢ`, `n = [2,3,4,5,7,10]`, **`kᵢ = ωᵢ² / 9.81`**. Longer waves travel faster. Amplitudes `[0.8,0.4,0.24,0.16,0.085,0.035]` develop continuously from ×0.48 to ×2.35; the height fader multiplies them. At full schema extent, `Σ Q k A = 0.5530875468 < 1`, so the horizontal map does not fold. Two Newton iterations invert the material map. The dominant swell travels obliquely toward the coastal camera.

The breaking signal is `z = Σ cᵢ exp(iφᵢ)` over wind-sea modes 1–4, weighted by steepness. Its magnitude gives the wave-group envelope and its argument gives the crest age. Closed-form accumulated foam decay is

```
F(age) = (exp(-age/κ) - exp(-2π/κ)) / (1 - exp(-2π/κ))
```

with a continuous gate where the phase becomes undefined. Calm remains free of intrinsic breaking foam; the rhythm roller can still pass through it. A fixed seeded shoal steepens the near Swell. This round lowers the Swell threshold locally and suppresses unresolved distant whitecaps.

The vortex samples the same waves through the radius-preserving bijection `R(φ(r))x`, with `φ = -3.5 smoothstep(1,1.6,development) exp(-r²/900)`. Gradients use the exact Jacobian pullback. The 42 m depression, raised shoulder and five meandering spiral ridges deepen during development 1.2–2.0. No stacked-state dissolve.

The optional **1024×513 RGBA32F data table** retains two banks: height/gradient/compression and analytic signal/material coordinates. It is not a colour cache. Polar core and boundary blend into the exact path; no-float hosts retain analytic fallback. The safeguarded Illinois solve follows `u_raySteps`: 15/10/7 iterations at 96/64/40. Full picture resolution is retained.

## Round-3 light and material

- Larger shaded moon (0.068 rad), three-scale aureole, readable silver-lined clouds and horizon wash.
- Cox–Munk-style anisotropic facet statistics replace smooth reflection lobes and widely scattered dust. Resolved deterministic facets become their mean as they shrink below a pixel. Energy/wind changes road width and facet population; hashes are material-fixed, never per-frame grain.
- Swell lips peel laterally in a seeded 55 m cycle. The fract seam is masked at both ends. A thin hot edge, broken whitewater mass, translucent face light and local droplets replace a single smooth tube.
- Saturated secondary/accent glow sits beneath primary lips; white stays at small tips. Palette colours only.
- Spiral bands vary in width/intensity and stream inward using two-phase periodic flow mapping. Final cost pass uses one advected noise octave plus phase-locked fine streaks, not three noise octaves.
- A water-occluded analytic Gaussian column and throat scattering make the eye a light source. It is not a simulated volume or physical refraction.

## States and looks

State seed **10301** and identical non-development parameters are unchanged; names, seeds, schema keys, preset IDs and existing rhythm IDs are preserved. No `HISTORY` migration is needed.

| Look                                | Development | Character                                                |
| ----------------------------------- | ----------: | -------------------------------------------------------- |
| Calm / Stille                       |           0 | Low swells, silver road, cloud-lined moon, rare plankton |
| Swell / Dünung                      |           1 | Oblique peeling breakers over the shoal                  |
| Maelstrom / Mahlstrom               |           2 | Wound crests streaming toward a lit throat               |
| Silver Passage / Silberpassage      |         0.2 | Low moon, near-water view, rough glitter road            |
| Living Breakers / Lebendige Brecher |           1 | Highest waves, low eye, strong local biolight            |
| Spiral Cathedral / Spiralkathedrale |           2 | Overhead spiral mandala                                  |
| Far Lantern / Ferne Laterne         |        0.65 | Higher moon/view, smaller swell                          |
| Undertow / Sog                      |         1.7 | Low view across the developing throat                    |

## Camera and endless energy grammar

A **two-texel RGBA8 simulation** stores camera development/velocity in texel 0 and the last roller amplitude in texel 1. Only the crane follows the critically damped development spring (`ω=1.4`, speed ≤0.3 development units/s). Geometry, bowl and twist retain raw development. Reset snaps the viewpoint to a newly loaded look. CPU clearance tests cover lagging camera development against raw development independently. A fast reversal does not reset seed or clock identity.

Energy affects road width, capillary detail, breaking threshold, persistence, spray population and flow/motion speed—not development or a whole-frame exposure multiplier. Kick FOV is bounded to 2.2%. Three integrated clocks preserve wave, camera and flow phase. Clock consumers use integer harmonics; two-phase flow noise is invisible at its wraps. Early, late and analytic-fallback variants compile; time checks at 3600/4096/43200 s and parameter-rate changes pass.

## Four authored rhythm tracks

Existing slots remain **Crest packet** (0), **Spiral ridge** (1), **Incoming tide** (2). The first accents true group-velocity crest packets; the second drives arm surges and local plankton; the third sends an outgoing ring across the sea/shoulder. Local accents are stronger and can play quickly; the crane and long roller remain slow.

**Slot 3: Moon roller / Mondwoge.** A long band of biolight rolls from the horizon toward the viewer. As the sea winds up, it becomes a five-fold-warped ring pulled down into the eye, followed by a ramped local throat flare. A small asymmetric Gaussian normal bump supplies the lit face; it is shading-only and never alters intersections or camera clearance.

The simulation latches `u_rhythmHit.w`; the shader inverts the smoothstep envelope `u_rhythm.w / amplitude` to recover event progress. `u_rhythmCount.w` seeds lateral peel variation. The six/seven-beat event finishes before the next hit, rather than teleporting back to the horizon.

| Preset                          | Total hits/bar | Roller steps (1-based)           | Timing                                                                 |
| ------------------------------- | -------------: | -------------------------------- | ---------------------------------------------------------------------- |
| Slack water / Stilles Wasser    |           2.50 | 1, 41 of 64 eighth steps         | 8 bars; 7-beat rollers                                                 |
| Rolling swell / Rollende Dünung |           7.00 | 1, 18 of 32 eighth steps         | 4 bars; 6-beat rollers, every second bar with a half-beat displacement |
| Spring tide / Springflut        |           9.25 | 1, 16, 33, 47 of 64 eighth steps | 8 bars; 6-beat rollers, anticipations and fills                        |

Crest accents use eighth syncopations in driving and sixteenth figures over three bars in accented. Regression tests enforce density ≥2/6/8 across all four tracks and keep rollers spaced. Both languages include the new gesture name/description beside the existing tide keys. The shared flash limiter is unchanged. The new verifier waits for normal asynchronous approval instead of disabling it.

## Verification and evidence

All evidence below is relative to `.claude/worktrees/moon-tide-r3/`:

- Final reviewer film, twelve-frame sheet, twenty-four-frame rhythm strip and authored grids: **`artifacts/look-review/moon-tide-r3/`**. Read after the final shader cost pass.
- Preserved film iterations: `moon-tide-r3-before`, `r3-round2`, `r3-round3`, `r3-wip2` under `artifacts/look-review/`. The missing earlier r3 plan was reconstructed in `.claude/world-polish/plans/moon-tide-r3.md` after inspecting commits and dirty work.
- All eight looks × energy 0.1/0.5/0.9: `artifacts/contact/tide-r3/`, captured/read as `artifacts/verification/tide-r3/energy-ladder.png`.
- Native early/late/fallback, reverse seed/slot identity, 1080p/4K, portrait and time-wrap report: `artifacts/verification/tide-r3/verification.json`. Zero GL errors, non-finite uploads or GPU errors; no empty low-energy state.
- Limiter-approved palette stills: `artifacts/stills/r3-{ember,glacier,ultraviolet}/`; portrait `r3-portrait/`; late `r3-late/`; energy `r3-energy-approved/`. Reports include lit/white coverage and rhythm values. Initial `r3-energy/` is superseded because its first image was captured before asynchronous approval settled.
- Reversal film: `artifacts/films/r3-reverse/tide-maelstrom.mp4` and strip. Read the strip.
- `npm test`: **973 pass, 21 opt-in skips, 0 fail** (994 total). Includes family continuity/clearance/preset/slot-3/density, world-rhythm and pipeline-flash tests. Typecheck passes. Build passes. Native i18n passes DE/EN. Prettier checks pass on scene, family tests and verifier; the repository does not include translation dictionaries in its formatting target (whole-file checks flag inherited long dictionary lines, which are not reformatted).

## Measured cost and remaining limits

M3 Pro / ANGLE Metal, synchronous whole-frame throughput including post, 36 samples/state, shared fleet GPU. Absolute measurements are load-sensitive; do not infer venue cadence.

| State     | 1080p p50/p95 ms | 4K p50/p95 ms   | Paired Δ p50 vs main, 1080p / 4K |
| --------- | ---------------- | --------------- | -------------------------------- |
| Calm      | 4.2 / 6.9        | 12.5 / 12.9     | +5.4% / +34.1%                   |
| Swell     | 4.8 / 9.9        | 13.8 / 15.0     | +8.6% / +18.5%                   |
| Maelstrom | 6.2 / 7.0        | **18.8 / 19.2** | +21.4% / +27.4%                  |

Profiles: `artifacts/performance/r3-final-{1080,4k}/profile.json`; ABBA comparisons (64 samples/candidate): `artifacts/rework-pair/r3-final-{1080,4k}/profile.json`, main reference `6c9792f`. All health counters zero. The first peak measured 19.9 ms; removing redundant arm noise and hyperbolic roller math reduced it, but **4K peak still fails the 16 ms target**. Pair scripts also exit 1 at their stricter +5% regression gate. This is reported, not waved away as contention.

Remaining visual limits: Calm still has a sparse foreground; the periodic funnel can read as neon satin rather than churning water; distant bright bands can show small raster dashes; a near ridge can silhouette the eye; the moon leaves frame as the peak orbit progresses (the horizon remains). Portrait crops the outer arms. The sea is an analytic six-mode heightfield, not FFT/Navier–Stokes water; it cannot overturn into a barrel. Independent review is still required before claiming L≥8.
