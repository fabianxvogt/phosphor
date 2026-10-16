# Moon Tide · Mondflut

Family **103**, renderer `tide`, world `moon-tide`. **INCREMENTAL / EMPIRICAL**, r5, 2026-10-16/17. Implementation: **openai-codex/gpt-6.1-sol**. Independent r4 review: L7/G8.5/E7.5, Overall7.5; this delivery is not an independent pass or venue qualification.

A moonlit ocean develops from an oblique silver swell through peeling bioluminescent breakers into a recessed maelstrom. Preserve the textured moon, cloud-framed horizon, reflection road, broad shaded waves, dark troughs and localized violet events throughout the default peak orbit.

## Mathematics and continuity

Six persistent seeded Gerstner modes: `ω = 0.35 n`, `n = [2,3,4,5,7,10]`, **`k = ω²/9.81`**, amplitudes `[0.8,0.4,0.24,0.16,0.085,0.035]`. At Calm, the longest mode now uses ×1.35, the other modes ×0.48. All grow continuously to ×2.35 at Swell; peak attenuates this to ×0.55. The longest mode has a constant −2 rad framing offset, identical at every development value. The no-fold bound remains **Σ QkA ≤ 0.5530875468**, attained at Swell. Two Newton iterations invert the material map.

Wind-sea modes 1–4 produce a complex crest signal weighted by steepness. Magnitude gates breaking; argument gives crest age. Foam persistence remains `(exp(-age/κ)-exp(-2π/κ))/(1-exp(-2π/κ))`, continuously gated where phase is undefined. The Calm wind sea is unchanged and cannot intrinsically break. A persistent shoal steepens Swell; periodic lateral peeling, face scatter and droplets develop from those same waves.

The vortex twists the existing material by `R(φ(r))x`, `φ = -1.8 smoothstep(1,1.6,development) exp(-r²/900)`. It preserves radius and uses the exact Jacobian pullback. The 42 m depression, raised shoulder and 0.3 m spiral relief deepen continuously. There is no crossfade to another surface.

The optional **1024×513 RGBA32F table** stores height, gradient, compression, crest signal and material coordinates, never colour. Core/boundary blend to the exact fallback. The safeguarded Illinois heightfield solve follows `u_raySteps`, 15/10/7 iterations at 96/64/40. Output shading remains full resolution.

## R5 material and composition

1. **Peak foam:** remove periodic radial micro-stripes and fade the open-sea ageing-streak model out of the vortex. Large warped material-space foam rafts live on the raised shoulder; thin branching tributaries drain down the wall. Fine intensity variation, wet gaps and footprint integration replace repeated pale dashes. Restrict breaking mass to the shoulder rather than coating the entire funnel with a patterned skin. Retain shaded volume beneath it.
2. **Surface-bound events:** both the outgoing slot-2 tide and the incoming slot-3 roller excite compression-selected crests and irregular wet foam. Slot 3 has variable width, material-shaped edge, porous emission and a fragmented foam wake instead of a broad fuzzy purple ribbon. Near shoulders naturally occlude inner surface regions. The large radial travel and local throat arrival remain unchanged.
3. **Quiet swell:** a larger existing longest mode carries a narrow silver shoulder; reduce broad height/back-face scattering and darken its trough. This is actual persistent wave geometry and slope-selective light, not lifted overall exposure. The same identity grows into Swell.

Cox–Munk-style anisotropic glitter, material-fixed facets, maria, aureole and cloud edges remain. Distant short-mode shading blends toward the long swell; unresolved detail softens. Palette colours remain exclusively palette-derived, with white confined to moon/foam tips. No limiter or engine edits.

## States and looks

All names, seeds, schema keys, world definition and rhythm IDs are preserved; no HISTORY migration.

| Look                                | Development | Character                                          |
| ----------------------------------- | ----------: | -------------------------------------------------- |
| Calm / Stille                       |           0 | Oblique moonlit shoulder, dark trough, silver road |
| Swell / Dünung                      |           1 | Peeling breakers over the shoal                    |
| Maelstrom / Mahlstrom               |           2 | Shaded funnel, shoulder foam and draining tendrils |
| Silver Passage / Silberpassage      |         0.2 | Low moon, near-water view, glitter road            |
| Living Breakers / Lebendige Brecher |           1 | Highest waves and strong local biolight            |
| Spiral Cathedral / Spiralkathedrale |           2 | Deliberate overhead composition                    |
| Far Lantern / Ferne Laterne         |        0.65 | Higher view/moon and smaller swell                 |
| Undertow / Sog                      |         1.7 | Low view across the developing throat              |

A two-texel RGBA8 simulation stores spring-smoothed camera development/velocity and latched roller amplitude. Only the crane follows the critically damped spring (`ω=1.4`, speed ≤0.3 development units/s); geometry uses raw development. Camera clearance is tested independently of crane lag. Default peak FOV retains the entire moon throughout an orbit; the overhead look intentionally omits the sky. Kick FOV ≤2.2%.

Energy changes wind, reflection width, capillary detail, breaking, foam persistence, spray and speed, never development. Three periodic integrated clocks preserve wave, orbit and current phases at twelve hours and across rate changes. All foam advection closes at the flow wrap; no temporal grain or fractional clock turn.

## Rhythm

Preserved slots: **Crest packet** (0), **Spiral ridge** (1), **Incoming tide** (2), **Moon roller / Mondwoge** (3).

**Moon roller:** an incoming swell catches discontinuous wet crests across the sea, contracts across the shoulder and fragments into draining foam near the eye, finishing with a ramped local throat flare. The shader latches `u_rhythmHit.w`, recovers progress from `u_rhythm.w / amplitude`, and seeds peel variation with `u_rhythmCount.w`. The 0.5 m asymmetric normal bump is shading-only: it does not enter the intersection or camera clearance. Both event light fields stay on visible surface hits, never a separate ring mesh or screen overlay.

| Preset                          | Hits/bar | Roller steps (1-based eighth steps)  |
| ------------------------------- | -------: | ------------------------------------ |
| Slack water / Stilles Wasser    |     2.50 | 1, 41 of 64; seven-beat events       |
| Rolling swell / Rollende Dünung |     7.00 | 1, 18 of 32; six-beat events         |
| Spring tide / Springflut        |     9.25 | 1, 16, 33, 47 of 64; six-beat events |

Off-beats, long structural phrases and three-bar accented local phrasing remain. Tests enforce density ≥2/6/8, slot 3, completion before retriggering, identity, clearance, foam continuity, framing and periodicity. DE/EN descriptions remain applicable.

## Verification and evidence

Relative to `.claude/worktrees/moon-tide-r3/`:

- Canonical reviewer film, sheet, rhythm strip and grid dump: **`artifacts/look-review/moon-tide-r5/`**. Eight change/capture/read rounds in `moon-tide-r5-round1` through `-round8`; rejected material directions and critiques recorded in the plan. Individual quiet/peak frames were inspected, not only thumbnails.
- All eight looks × energies 0.1/0.5/0.9: `artifacts/contact/tide-r5/` and `artifacts/verification/tide-r5/energy-ladder.png`.
- Native early/late/fallback shader, 1080p/4K, portrait, twelve-hour, rate/wrap and reversal identity checks: `artifacts/verification/tide-r5/verification.json`. Zero GL/non-finite/GPU errors; low states non-empty.
- Limiter-approved energy, Ember/Glacier/Ultraviolet and portrait/late samples: `artifacts/stills/r5-*`; maximum white coverage 0 in approved energy samples. Reverse film and read sheet: `artifacts/films/tide-r5-reverse/`, `artifacts/verification/tide-r5/reverse-sheet.png`.
- Full suite **1001 pass /21 opt-in skips/0 fail**; typecheck/build, native DE/EN i18n, Prettier pass. Targeted tide/world-rhythm/pipeline-flash: **63 pass**.

## Performance and limits

Native M3 Pro / ANGLE Metal synchronous throughput including post, 36 samples/state, shared fleet GPU. Paired ABBA uses 64 samples/candidate against main `9c1a967`. This is not Stage cadence.

| State     | 1080p p50/p95 ms | 4K p50/p95 ms | Paired p50 Δ 1080p /4K |
| --------- | ---------------- | ------------- | ---------------------- |
| Calm      | 3.4 /4.3         | 15.0 /16.9    | +13.2% /+19.0%         |
| Swell     | 5.2 /5.7         | 16.7 /18.6    | 0.0% /+11.3%           |
| Maelstrom | 5.6 /6.6         | 18.0 /19.4    | −5.1% /−8.6%           |

Evidence: `artifacts/performance/tide-r5-{1080,4k}/profile.json`, `artifacts/rework-pair/tide-r5-{1080,4k}/profile.json`. All health counters zero. **4K Swell/peak exceed the 16 ms budget; paired Calm fails at both sizes and Swell at 4K fails the +5% gate.** Peak is faster, but this is not an overall performance pass.

Self-assessed look **L7.5, provisional**. The quiet shoulder is deliberately restrained; some near event patches still look stylized, the heightfield cannot overturn into real barrels, portrait/late can show a dark near-water occluder across the eye, and the overhead extra look remains small. The torus and scratched-skin failure patterns are substantially reduced, not grounds to assert an independent ≥8 result.
