# Moon Tide · Mondflut

Family **103**, renderer `tide`, world `moon-tide`. **INCREMENTAL / EMPIRICAL**, r4, 2026-10-16/17. Implementation: **openai-codex/gpt-6.1-sol**. Native evidence is not venue qualification or an independent aesthetic pass.

A reflective nocturnal ocean develops from dim silver swells through peeling bioluminescent breakers into a recessed, foaming maelstrom. R4 responds to the independent r3 review (L6/G8.5/E7, Overall6.5): water material rather than a luminous flower, composed breakdown, an irregular travelling roller, a retained moon and softer distant sea.

## Mathematics and identity

Six persistent seeded Gerstner modes: `ω = 0.35 n`, `n = [2,3,4,5,7,10]`, **`k = ω²/9.81`**, amplitudes `[0.8,0.4,0.24,0.16,0.085,0.035]`. Development raises the spectrum from ×0.48 to ×2.35 through Swell; the height fader multiplies it. R4 attenuates long-wave relief smoothly to ×0.55 of Swell in the full vortex, preventing large polished petal silhouettes. Maximum `Σ Q k A = 0.5530875468 < 1` remains at Swell; the horizontal map does not fold. Two Newton iterations invert the material map.

Wind-sea modes 1–4 produce an analytic complex crest signal weighted by steepness. Magnitude gates breaking; argument gives crest age. Foam persists as

```
F(age) = (exp(-age/κ) - exp(-2π/κ)) / (1 - exp(-2π/κ))
```

with a continuous gate where phase is undefined. Calm has no intrinsic breakers; authored rhythm can still roll through it. A seeded shoal steepens near Swell. Peeling fronts use a masked periodic 55 m lateral cycle, broken whitewater, face light and droplets.

The vortex samples the same waves through the radius-preserving bijection `R(φ(r))x`, now `φ = -1.8 smoothstep(1,1.6,development) exp(-r²/900)`. Gradients use its exact Jacobian pullback. The 42 m depression and raised shoulder deepen during development 1.2–2.0. Spiral relief is reduced from 0.8 to 0.3 m; no new form is dissolved over the ocean.

The optional **1024×513 RGBA32F data table** holds height/gradient/compression and crest-signal/material-coordinate banks, never colour. The core and boundary blend into the exact fallback. A safeguarded Illinois heightfield solve follows `u_raySteps`: 15/10/7 iterations at 96/64/40. Full output resolution is retained.

## R4 material and composition

- Preserve the shaded 0.068 rad moon, maria, aureole, cloud edges and Cox–Munk-style anisotropic reflection road. Resolved material-fixed facets blend into their statistical mean when subpixel.
- Calm has slope-selective silver face/back-face scattering and broad height-selective crest light. Dark troughs and the near silhouette remain; this is not a frame-wide exposure lift. The coastal viewpoint is raised 1.3 m to reveal more intermediate water.
- Replace continuous fivefold emissive rims with broken, graded whitewater rafts, rough wet normals and local spray. Reuse the periodic water texture for the residual arm streaks, removing the old extra two-noise arm flow field.
- Retain dark troughs, the recessed eye and localized purple events. Reduce white-hot arm cores and throat backlighting that made smooth black blades look like petals.
- Blend distant shading toward the longest swell and fade capillary detail by footprint. Crossing short modes remain in the actual sea geometry but no longer dominate distant highlights as a regular mesh.
- Lower the default peak crane and widen its focal factor from 1.5 to 1.25. The default peak retains a sky band, complete moon and reflected road. The moon's azimuth is compositionally carried by the orbit (not a physically fixed astronomical direction). Special high-eye Spiral Cathedral remains deliberately overhead.

All state names, look names, seeds, non-development preset values, schema and rhythm IDs remain unchanged; no world-definition/HISTORY migration is needed.

| Look                                | Development | Character                                             |
| ----------------------------------- | ----------: | ----------------------------------------------------- |
| Calm / Stille                       |           0 | Dim graded swell faces, textured moon and silver road |
| Swell / Dünung                      |           1 | Oblique peeling breakers over the shoal               |
| Maelstrom / Mahlstrom               |           2 | Rough whitewater shoulder draining into a lit throat  |
| Silver Passage / Silberpassage      |         0.2 | Low moon, near-water view, rough glitter road         |
| Living Breakers / Lebendige Brecher |           1 | Highest waves, low eye, strong local biolight         |
| Spiral Cathedral / Spiralkathedrale |           2 | Overhead spiral                                       |
| Far Lantern / Ferne Laterne         |        0.65 | Higher moon/view, smaller swell                       |
| Undertow / Sog                      |         1.7 | Low view across the developing throat                 |

## Camera, energy and endlessness

A two-texel RGBA8 simulation stores spring-smoothed camera development/velocity and the latched roller amplitude. Only the crane follows the critically damped spring (`ω=1.4`, speed ≤0.3 development units/s); geometry retains raw development. Clearance tests vary raw and camera development independently. Reversal preserves seed, slot and clocks. A regression projects the full moon disc inside the default peak FOV throughout an entire orbit, including maximum kick.

Energy changes wind/road width, capillary detail, breaking threshold, foam persistence, spray and speed, never development or whole-frame exposure. Kick FOV stays bounded to 2.2%. Three periodic integrated clocks preserve wave, orbit and current phases through late time and rate changes. Noise is material-fixed/periodically advected, not per-frame grain.

## Rhythm

Preserved slots: **Crest packet** (0), **Spiral ridge** (1), **Incoming tide** (2), **Moon roller / Mondwoge** (3). Slots 0/1 select local crest/arm light; slot 2 rolls outward across the shoulder.

**Moon roller:** a long irregular front of scattered biolight arrives from the sea, bends around the shoulder and contracts toward the eye, finishing with a ramped local throat flare. R4 bends open-water fronts with persistent wave phases and replaces the old fivefold ring scallop with unequal two/threefold meanders. Narrower face/wake illumination, broken crest knots and quieter intervening water make one front more distinct.

The simulation latches `u_rhythmHit.w`; the picture inverts the smoothstep envelope `u_rhythm.w / amplitude` to recover progress. `u_rhythmCount.w` seeds lateral peel variation. The 0.5 m asymmetric normal bump is **shading-only**, not an overturning geometric breaker; it never enters the intersection or rises into the camera. No limiter changes.

| Preset                          | Hits/bar | Roller steps (1-based eighth steps)  |
| ------------------------------- | -------: | ------------------------------------ |
| Slack water / Stilles Wasser    |     2.50 | 1, 41 of 64; seven-beat events       |
| Rolling swell / Rollende Dünung |     7.00 | 1, 18 of 32; six-beat events         |
| Spring tide / Springflut        |     9.25 | 1, 16, 33, 47 of 64; six-beat events |

Eighth syncopations, the three-bar accented local track and longer structural phrases are unchanged. Tests enforce density ≥2/6/8 and event completion before retriggering. Existing DE/EN gesture descriptions remain accurate.

## Verification and evidence

Paths are relative to `.claude/worktrees/moon-tide-r3/`.

- Final canonical film, 12-frame sheet, 24-frame rhythm strip and grids: **`artifacts/look-review/moon-tide-r4/`**. Three dedicated change/capture/read rounds: `moon-tide-r4-round1`, `-round2`, `-round3`; further bounded corrections were recaptured into the final directory. Critiques are recorded in the plan.
- All eight looks × energy 0.1/0.5/0.9: `artifacts/contact/tide-r4/`; readable sheet `artifacts/verification/tide-r4/energy-ladder.png`.
- Native early/late/fallback compilation, 1080p/4K, portrait, twelve-hour/rate/wrap and reversal identity checks: `artifacts/verification/tide-r4/verification.json`. Zero GL errors, non-finite uploads or GPU errors; no empty low-energy states.
- Limiter-approved energy/palette/portrait/late stills: `artifacts/stills/r4-*`. Ember, Glacier and Ultraviolet were read. Final energy approval evidence: `r4-final-energy`. Maximum white coverage remains local (no full-screen white).
- Reverse film: `artifacts/films/tide-r4-reverse/tide-maelstrom.mp4` and contact strip, read after capture.
- Full test suite: **992 pass, 21 opt-in skips, 0 fail**; typecheck/build pass. Native i18n passes DE/EN. Family tests cover revised CPU geometry, clearance, continuity, projected moon framing, slot 3 and preset density. Pipeline-flash/world-rhythm tests pass. Prettier checks scene, family tests and verifier.

## Performance and remaining limits

Native M3 Pro / ANGLE Metal, synchronous throughput including post (36 samples/state), shared fleet GPU. Absolute timings are not live stage cadence. Final paired ABBA tests use 64 samples/candidate against main `7c6257b`.

| State     | 1080p p50/p95 ms | 4K p50/p95 ms | Paired p50 Δ 1080p / 4K |
| --------- | ---------------- | ------------- | ----------------------- |
| Calm      | 4.1 / 5.9        | 15.6 / 18.0   | +16.2% / +12.3%         |
| Swell     | 5.0 / 7.5        | 16.8 / 18.7   | +10.0% / +6.1%          |
| Maelstrom | 5.7 / 7.6        | 18.0 / 19.5   | −5.3% / −11.3%          |

Evidence: `artifacts/performance/tide-r4-final-{1080,4k}/profile.json` and `artifacts/rework-pair/tide-r4-final-{1080,4k}/profile.json`. All health counters zero. **4K Swell/peak exceed 16 ms**, and the pair script's +5% gate fails for Calm/Swell. Peak is faster than r3/main, but this is not an overall performance pass.

Self-assessed look: **L7.5, provisional**, not an independent ≥8 verdict. Calm is still restrained, some lit foam can read as projected streaks close to the lens, and the heightfield cannot overturn into real spray/barrels. Portrait crops the outer shoulder; the special overhead look intentionally omits the sky. Independent review determines whether the final canonical evidence clears the owner's bar.
