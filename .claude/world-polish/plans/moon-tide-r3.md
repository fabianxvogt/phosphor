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

## Completion / critique

M4 complete: slot 3 retained; presets now 2.50/7.00/9.25 hits/bar, density and spacing regression tested. Main merged at bb355d0 after preserving all dirty work. Final reviewer captures at `artifacts/look-review/moon-tide-r3/`, including grids. Read the final sheets plus the all-look energy ladder, Ember/Glacier/Ultraviolet, portrait and reversal evidence. The roller is plainly visible as an incoming light band / contracting ring; secondary rhythms remain more subtle in the contact strip.

Final bounded cost pass: replace hyperbolic bump math with an asymmetric Gaussian and remove two extra advected arm noise octaves. No intersection change. Initial 4K peak 19.9ms becomes 18.8ms p50, still fails the 16ms budget; final ABBA peak +27.4% vs main. Do not claim contention excuses the regression. 1080p passes at 4.2/4.8/6.2ms p50.

Verification: npm test 973 pass /21 skip/0 fail, typecheck/build, native DE/EN i18n, formatted source/test/verifier; native fallback/late/time-wrap/portrait/reversal checks pass with zero GL/non-finite errors. New verifier now waits for asynchronous flash approval; initial unapproved energy stills are explicitly superseded.

Final self-assessment remains L7. Calm foreground is sparse, arms still look stylized/regular, and the moon is not retained through the whole peak orbit. These and 4K peak cost are remaining weaknesses for the independent reviewer—not a claimed ≥8 delivery.
