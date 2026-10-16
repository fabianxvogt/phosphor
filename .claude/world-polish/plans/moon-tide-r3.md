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

## r5

Reviewer r4: L7 / G8.5 / E7.5, Overall7.5. Read independent review and r4 canonical sheets first. Clean worktree at 15f7b43; merged current main without discarding WIP. Scope remains tide only.

1. **Breaking water, not patterned skin:** replace dense high-frequency pale dashes on peak shoulders with a low-frequency warped material-space raft field, dark wet channels and thin branching foam tendrils. Suppress periodic radial striping and narrow analytic fronts at peak. Grade detail by footprint; retain the concave shaded bowl.
2. **Surface-bound Moon roller:** remove the broad fuzzy emissive face/wake. Use the existing travelling band as an excitation window for actual crest compression, irregular foam and wave shoulders. Keep radius/scale and inward timing, but interrupt it with wet troughs and near-shoulder occlusion; fragment into throat foam, not another torus. Preserve slot/IDs/steps.
3. **Quiet oblique swell:** increase only the existing longest mode at Calm (below the existing Swell maximum), then light its narrow shoulder above a shadowed trough. Carry the same seeded mode into the breakers; no exposure lift or added overlay. Keep no intrinsic Calm breaking.

At least three new change/capture/read film rounds, individual peak/quiet frames, all-look energy ladder, three palettes, portrait, late time and reversal. Reuse family verifier with limiter approval intact. Tests cover altered amplitude/foam continuity and surface-gated roller. Measure native 1080p/4K and pair delta honestly; r4 already exceeded 4K budget. Final captures: artifacts/look-review/moon-tide-r5; grids remain 2.50/7.00/9.25 hits/bar. Preserve moon/clouds/reflection, broad waves, recessed eye and local violet events; no world definition migration needed. No limiter, engine or preview edits.

### r5 film rounds

- **Round 1** (`moon-tide-r5-round1`), sheets plus individual quiet/peak read: the repeated scratched dashes are gone, but the replacement is too soft and silky. Quiet shoulder is often at the horizon rather than foreground. Critically, the smooth ring in rhythm 1–3 is also the *outgoing slot-2 tide*, not just slot 3: apply surface gating to both. Add porous small-scale detail inside large foam rafts, reduce smooth arm-band light, and place the persistent longest mode's crest nearer the camera with a constant phase offset (no development-dependent phase).
- **Round 2** (`moon-tide-r5-round2`), sheets and large quiet/peak read: the separate neon torus is gone, but slot 3 has become too sparse; retain its full scale by catching more existing foam in a ragged, variable-width band. Quiet 2 has a real oblique foreground swell but too much soft silver wash. Narrow its shoulder, lower broad face scattering and shade the adjacent trough. Peak rafts are porous, yet compression-gating still repeats short-wave stripes: let spent foam persist across troughs instead of marking each crest.
- **Round 3** (`moon-tide-r5-round3`), sheets and individual frames read: quiet shoulder is now narrow and the trough dark, but bright event patches look too filled; peak has become a camouflage-like skin again, not a pass. Thin the branching field, reduce filled-raft coverage, remove the anisotropic small-grain scale that made scratches, and modulate roller radiance by resolved foam porosity rather than painting solid pink patches. A fourth film is warranted, not a cosmetic self-pass.
- **Round 4** (`moon-tide-r5-round4`), sheets/peak read: isotropic finer grain is less scratch-like, but filled material still coats too much of the bowl. **Round 5** (`-round5`) fades the older ageing-streak model out of the vortex; sheets/peak read confirm it was not the sole culprit. Keep the simpler split nevertheless: open sea and vortex need different foam distributions.
- **Round 6** (`-round6`), sheets/peak read: enlarged warped rafts still look like camouflage because fine porosity covers the whole wall. Reject that distribution. **Round 7** (`-round7`), sheets/peak read: restricting breaking mass to the raised shoulder and leaving only branching tributaries down the wall finally preserves wet shaded water with dark gaps. Event no longer forms a separate luminous torus. Its near patches remain stylized, and canonical early quiet frames are intentionally very dark.
- **Round 8** (`-round8`), sheets and peak read: increase only shoulder-raft/branch matter coverage (not broad glow) after it became too subdued in round 7. Preserve restrained dark water and surface-gated local events; do not restore the dramatic but incorrect ring. Final canonical capture repeats round 8 exactly. Read the final sheet/rhythm, energy ladder, reverse sheet, late/portrait and three approved palette stills.

### r5 delivery critique and verification

Self-assessed **L7.5 provisional**, not an independent ≥8 assertion. Material and attachment are better; close luminous patches can still look stylized and the heightfield cannot overturn. Keep all preset/seed/schema/world identities. Eight film iterations exceeded the three-round requirement. No shared engine/limiter/preview files edited.

Full npm suite: 1001 pass, 21 opt-in skip, 0 fail; tide/world-rhythm/pipeline-flash 63 pass. Typecheck/build, native DE/EN i18n and formatted touched JS pass. Native early/late/fallback, all-look energy ladder, portrait, twelve-hour/rate/wrap and reversal identity checks passed with zero GL/non-finite/GPU errors. Approved energy stills have zero white coverage. Final evidence under artifacts/look-review/moon-tide-r5, verification/tide-r5 and stills/r5-*.

Initial r5 native 1080p p50/p95: 4.0/4.7, 5.0/5.2, 5.7/6.7 ms; 4K 14.8/17.9, 16.3/19.9, 17.3/18.2. Pair versus main 99b039f: +8.1/+12.8/−5.6% at 1080p and +14.8/+15.0/−9.9% at 4K. 4K Swell/peak and pair Calm/Swell fail their budgets; report honestly, no contention excuse. Final same-source profiling after the bounded foam-coverage gain: 1080p p50/p95 3.4/4.3, 5.2/5.7, 5.6/6.6 ms; 4K 15.0/16.9, 16.7/18.6, 18.0/19.4. Main advanced externally to 9c1a967; final pair versus that revision: +13.2/0.0/−5.1% at 1080p, +19.0/+11.3/−8.6% at 4K. Same budget failures at 4K; pair Calm fails both sizes, Swell only 4K. Docs/report use this final run. Refreshed/re-read final canonical sheets, all-look ladder, approved palettes, reverse sheet and portrait/12h stills. Portrait at 12h can show a dark near-water occluder across the eye; retain as a documented weakness, not a clean art pass.
