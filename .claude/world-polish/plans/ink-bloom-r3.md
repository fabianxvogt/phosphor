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

## Execution / critique

- Main's authored presets were merged in `ad214c5` before slot-3 work. Kept all three names and first-three-track placements; raised shader roll/reach/wave amplitudes.
- Film rounds `look1`–`look4`, then `round1`–`round3` evolved the transported dye and local bursts. Read the baseline and resumed sheets: the clay rings were removed, but smooth blue sheets and the straight axial wake remained too balloon-like. Shortened/diluted the wake, added torn coverage, saturation and rare local accent pigment, enlarged the peak and reduced development-driven camera travel.
- Profiling rejected the original native material-map sampling: 1080p p50 6.3/15.2/24.0 ms and 4K 30.0/54.9/83.6 ms. Replaced per-ray-step flow/material evaluation with **physical scalar fields**, not cached colour: scattering concentration, absorbing core, accent concentration and padded distance. The native-resolution pass still computes palette mixing, extinction, lighting and filtered fine fibres. No engine changes.
- Three further change/capture/read rounds (`density1`, `density2`, `density3`) checked this tradeoff. Round 1 lost fine structure; round 2 restored native fibres but made stripes too strong; round 3 increased physical atlas to 96×128×96, filtered the fibres along the ray, and reduced RK2 to two steps. Final engine-budget-derived march is 48→44 steps (96 budget), scaling down with the governor. Peak 4K now 11.2 ms p50; Plumes remains +21% against main in ABBA.
- Slot 3 `ink-burst` uses envelope, hit and count. Zero-based hit steps: restrained 14/31 (division 2), driving 13/15/28/30/31 (division 2), accented 26/30/58/60/62/63 (division 4). One facing rim sector sheds a scalloped packet; no global bright event.
- Preserved state/look names, seeds, schema and legacy gesture ids. Updated the story description and appended the previous definition to `HISTORY`.
- Final self-assessment **L=7/10**, not a claimed independent pass. Better depth, density range and fill accents, but some veils still resemble fabric, the wake remains axial, portrait is weaker, and the physical field softens the smallest folds. Independent >=8 is still unproven; do not inflate this assessment.
