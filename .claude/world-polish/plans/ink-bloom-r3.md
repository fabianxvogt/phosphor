# Ink Bloom round 3

## Diagnosis / decision

Reused existing `r3/ink-bloom` worktree (at main 55cb7cc) with unfinished local scene/test/verify changes. Read the complete `main...polish2/ink-bloom` shader diff and round-2 plan. Keep its characteristic-map idea, not its exact crossing renderer: quantized folds and its expensive atlas were not acceptable. Main baseline sheet/rhythm read; SCORES.md is absent. Baseline self-assessment L=6: carved clay donuts and lampshade; rhythm barely registers. Resumed-work capture `artifacts/look-review/ink-bloom-r3-before` is also about 6: translucent but balloon-like, sliced daughters and a straight infinite axial wake.

## Audience weaknesses

1. Thick, smooth blue sheets read as rubber, not pigment suspended in water.
2. Axial Stokes separatrix creates an artificial bright tube to the frame edge.
3. Daughters have thin aliasing and fragmented edge detail, not coherent rolled plumes.
4. Material lacks the fine/broad density hierarchy of dye; colour regions are uniform.
5. Energy changes need to be visible in coverage and filament density; portraits need deliberate framing.
6. Three legacy rhythm tracks barely register, and no fill moment exists.

## Phone moment / concrete work

A close, backlit vortex canopy tears into translucent striated sheets, then a musical fill injects a saturated, scalloped pigment bloom through one side of the SAME curled rim. Dark absorbing knots, fine stretched filaments, soft far haze and parallax must read together. No opaque isosurface, normal rim or full-screen flash.

Three film rounds: (1) finite ragged wake, anisotropic coverage and folds, density contrast; (2) composition/material refinement from sheets, lower aliasing and portrait check; (3) strengthened rhythmic roll/reach/wave plus slot-3 Ink burst, final critique. Preserve ids, state names, seeds, schema and legacy rhythm ids. Append old world definition to HISTORY if story description changes.

Before rhythm merge main for authored presets (parallel worker); preserve three world-specific names. Add slot-3 `ink-burst` using envelope, hit and event count, with restrained/driving/accented loops and >=2 fill hits each. Events reshape a local rim sector, not global brightness.

## Cost / acceptance

Reuse smooth rgba16f displacement atlas (48x64x48), capped RK2 and 96-step visual loop honoring u_raySteps. Risk: aliasing thin sheets with long steps; use spatial filtering, no temporal grain. Risk: fill distortion must not move whole camera or reset material identity. Measure 1080p/4K and ABBA delta against main; budget <=8/16ms p50 (shared-GPU caveat). Run all required CPU, i18n, typecheck, formatting, health/palette/energy/reversal/late checks. Report weak look honestly; independent >=8 is not self-certifiable.
