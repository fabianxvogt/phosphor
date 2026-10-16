# Moon Tide r3 — continuation plan

Author: openai-codex/gpt-6.1-sol. Resumed 2026-10-16; branch `r3/moon-tide`, ports 48440–48449.

## Preserved evidence and diagnosis

Inspected dirty diff, commits 84a6ea6/0167cbd, round-2 plan and `main...polish2/moon-tide` diff before editing. Preserved earlier scene, translations, tests and verifier in checkpoint 367bc09, then merged current main. The earlier r3 plan was missing. Existing films: `artifacts/look-review/moon-tide-r3-before`, `r3-round2`, `r3-round3`, `r3-wip2`. These already represent three film iterations, not a restart.

Main independent baseline: L4.5/G2/E2, overall3.5. Tiny moon, empty low sea, uniform green outlines, disappearing moon, no legible beats. Current WIP self-assessment L7: materially improved silver sky/sea and purple streaming funnel, but still below an honest 8. Weaknesses:

1. Calm's foreground is sparse; many sparkles still read as dust rather than contiguous reflected water.
2. Swell has long thin lit crests with intermittent broad whitewater, not convincing churning breakers.
3. Peak arms are more varied but remain graphically regular; local dark occluders cross the eye.
4. Signature roller is visible, but its ring can read as another uniform glowing contour.
5. Rhythm density is only about 4/5 hits per bar. Existing slot 3 must not be discarded.

## Phone moment and execution

A bioluminescent swell rolls toward the lens every second bar, then the same moving light curls into the whirlpool and ignites its throat. Retain exact dispersive spectrum, seeded identities, state/look names/seeds/schema/rhythm ids, camera spring and analytic fallback. No HISTORY change needed.

Priority is M4 breadth: retain slot-3 `moon-roller`, latch its amplitude from `u_rhythmHit.w`, recover progress from `u_rhythm.w`, seed lateral peel from `u_rhythmCount.w`. Shorten/fill only local crest accents; leave roller, outgoing tide and structural crane slow. Aim ≥2 restrained, ≥6 driving, ≥8 accented hits/bar with density regression tests. Remove flash-disabling code from the new verifier; shared production limiter stays untouched.

Then run family/global/flash tests, full npm test/typecheck/i18n/format, native 1080p/4K and main-paired profiles. Capture canonical final film/grids before any further look changes. Supplement with energy ladder, three palettes, portrait, reverse film and late/fallback checks. Read final sheets; only make bounded visual corrections justified by them. Record all failures and actual timings rather than estimating a pass.

## Cost/safety risks

WIP adds roller normal/light math, multiple crest noise fields and a two-texel simulation. Earlier contended 4K was 16/16.2/22ms, old paired Calm +30%; budget risk is real. Gate noise locally; no colour cache, resolution cap, limiter bypass or engine edits. Native rigs share GPU, so report absolute and paired data. Keep light local with ramped events and no full-screen white. No catalog rebake.

## r4

Independent r3 review: L6/G8.5/E7, Overall6.5. Clean worktree preserved and main fast-forwarded before edits. Priority responses:

1. **Water, not flower:** suppress continuous fivefold neon cores and glossy black blades; retain the recessed 42 m bowl and dark troughs. Break the arm foam into advected irregular rafts, use broad shaded face light and scattered spray, and reduce regular spiral relief. Phone moment: a ragged luminous breaker falls into a moonlit ocean sinkhole, not a glowing blossom.
2. **Composed breakdown:** enhance slope-selective broad silver swell faces and near/far separation, not uniform exposure; retain textured moon and statistical reflection. Keep a dark foreground trough as silhouette.
3. **Physical Moon roller:** bend the open-water front with persistent wave identities; break its tip into foam knots, narrow its face/wake so one front is distinct, suppress unrelated crest glow behind it. Preserve latched progress and six-beat event travel into the eye.
4. **Namesake at peak:** lower/widen the default crane and bound its pitch to retain a sky strip; carry the moon azimuth with the coastal orbit so its reflected road continues to lead toward the funnel. Preserve continuous spring and special high-eye composition.
5. **Distant mesh:** attenuate short-mode shading by distance/footprint and soften distant specular contrast while keeping nearer directional detail. No colour cache/resolution reduction.

Keep all four rhythm IDs, all three named presets and 2.5/7/9.25 hits/bar; the existing three-bar accented phrase already satisfies polyrhythm/variation. Keep world identity, seed/schema/state/look names (no HISTORY migration), exact deep-water dispersion and analytic fallback. Three new change/capture/read/critique rounds are mandatory; follow with native safety/energy/palette/aspect/late/reversal checks, full tests and 1080p/4K plus paired profiling. Cost risk: the old 4K peak is already over budget; remove redundant arm work while adding material texture and report actual limits.

### r4 film rounds and delivery critique

- **Round 1** (`moon-tide-r4-round1`): read both sheets. Moon/horizon improved, and stripes became less straight, but peak 11 still looked like a flower. Crest gating alone was not enough; the geometric long-wave relief and fivefold roller needed changing.
- **Round 2** (`moon-tide-r4-round2`): read both sheets. Reduced twist (−1.8), spiral relief (0.3 m), peak wave relief (×0.55) and emissive cores remove much of the rosette. New whitewater was too blotchy/camouflage-like; some moon clipping and bare light ribbons remained.
- **Round 3** (`moon-tide-r4-round3`): read both sheets. Smaller, softer material-space foam and unequal two/threefold roller meander produce a rough wet shoulder instead of five luminous petals. Calm foreground remained too dark, moon was too near the border, and the roller face was still too smooth.
- **Final bounded corrections** (recaptured/read in `moon-tide-r4`): widen peak focal factor to 1.25; break roller face/wake light with local foam; raise coastal view and add height/slope/back-face silver scattering, leaving dark troughs. Reuse water noise instead of the old two-noise arm field. Read final sheet/rhythm, all-look ladder, reverse strip, three palettes and portrait/12h stills. The moon stays complete in canonical peak; the once-straight front is broken and drains toward the eye. A shading bump remains a shading bump, not an overturning simulated wave.

Final wrap audit caught an intermediate-development hazard in `orbit * crane`: a fractional multiplier is not periodic at the orbit clock wrap. Moon azimuth now derives from the actual periodic camera direction instead. Added fractional-development CPU seam coverage, reran the full suite/native wrap checks, recaptured and read final sheets again.

Final self-assessed **L7.5 (provisional)**, not an independent pass. Calm is still intentionally understated; close lit streaks can look projected and portrait crops the outer shoulder. The special high-eye look remains overhead. Existing three-bar accented phrase and 2.50/7.00/9.25 hits/bar are preserved, not churned for appearances.

Final verification: **992 pass /21 opt-in skip/0 fail**, typecheck/build, native DE/EN i18n, Prettier and diff whitespace pass. Native early/late/fallback, reversal identity, all energy/look, portrait, time-wrap and rate-change checks pass with zero GL/non-finite/GPU errors. Limiter-approved final energy stills are in `artifacts/stills/r4-final-energy` (white fraction 0 in all nine samples). Initial i18n attempt timed out on software rendering; native reruns pass. Profile option is `--families tide` (the brief's singular `--family` is unsupported).

Final native 1080p p50/p95: Calm 4.1/5.9, Swell 5.0/7.5, Maelstrom 5.7/7.6 ms. 4K: 15.6/18.0, 16.8/18.7, 18.0/19.5 ms. ABBA versus main `7c6257b`, 1080p /4K p50 deltas: Calm +16.2%/+12.3%, Swell +10.0%/+6.1%, peak −5.3%/−11.3%. **4K Swell/peak still exceed budget; paired Calm/Swell still fail the +5% gate.** All health counters zero. Evidence under `artifacts/performance/tide-r4-final-*` and `artifacts/rework-pair/tide-r4-final-*`. No limiter, shared engine, catalog previews or other worlds edited.

## r3 completion / critique

M4 complete: slot 3 retained; presets now 2.50/7.00/9.25 hits/bar, density and spacing regression tested. Main merged at bb355d0 after preserving all dirty work. Final reviewer captures at `artifacts/look-review/moon-tide-r3/`, including grids. Read the final sheets plus the all-look energy ladder, Ember/Glacier/Ultraviolet, portrait and reversal evidence. The roller is plainly visible as an incoming light band / contracting ring; secondary rhythms remain more subtle in the contact strip.

Final bounded cost pass: replace hyperbolic bump math with an asymmetric Gaussian and remove two extra advected arm noise octaves. No intersection change. Initial 4K peak 19.9ms becomes 18.8ms p50, still fails the 16ms budget; final ABBA peak +27.4% vs main. Do not claim contention excuses the regression. 1080p passes at 4.2/4.8/6.2ms p50.

Verification: npm test 973 pass /21 skip/0 fail, typecheck/build, native DE/EN i18n, formatted source/test/verifier; native fallback/late/time-wrap/portrait/reversal checks pass with zero GL/non-finite errors. New verifier now waits for asynchronous flash approval; initial unapproved energy stills are explicitly superseded.

Final self-assessment remains L7. Calm foreground is sparse, arms still look stylized/regular, and the moon is not retained through the whole peak orbit. These and 4K peak cost are remaining weaknesses for the independent reviewer—not a claimed ≥8 delivery.
