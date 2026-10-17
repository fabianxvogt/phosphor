# hopf-bloom — r5 review

Reviewer: anthropic/claude-opus-5-5 (independent; I did not read the implementer's report or plan). Evidence: `/Users/fabian/Development/phosphor/.claude/worktrees/hopf-bloom-r3/artifacts/look-review/hopf-bloom-r5/`, consisting of the sheet, the held-v2 rhythm strip (held development 2, energy 0.85, beats 8–19.5 per `hopf-bloom-evidence.json`) and `grids.md`. I also used `peak-large.png`, `torus-large.png` and `hopf-bloom.png` from the same directory to check the material. Calibration: the baseline row in SCORES.md (L 6 / G 2 / E 4 / 5.0) and the r3 (7.0) and r4 (6.5) reviews. The rubric is unchanged.

| World | id | L | G | E | Overall | Pass | Δ vs baseline | Signature effect (name: visible? fits?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hopf Bloom | hopf-bloom | 6.5 | 8.5 | 7.5 | 7.0 | No | +2.0 (5.0 → 7.0); +0.5 vs rejected r4, level with r3 | **fibre-current:** yes, it is visible. A pink comet with a tapered wake runs along the front hero loop at a glance (rhythm 4–6, 9–10, 14–16, 20–21). It suits linked fibres. However, the dense accented hits restart the packet almost every half-beat, so the strip shows a stream of short pulses that jump between spots on the loop (10 → 11 → 12, 20 → 21 → 22). It never shows one head making a readable lap. |

Overall = 0.6·6.5 + 0.15·8.5 + 0.25·7.5 = 7.05, which rounds to **7.0**. It fails on both thresholds: Overall is below 8 and L is below 7.5.

## Must fix for ≥ 8

1. **Frame the peak so it fills the space instead of sitting as a centred object on black (failure pattern 1, still the biggest problem).**
   - **Where:** sheet stills 9–12 and all 24 rhythm frames.
   - **Problem:** the bloom fills only about 55–60 % of the short side and about 40 % of the width, with wide empty black bands left and right. The peak (stills 11–12) is no bigger than state 2 (stills 6–7). This was r4's must-fix 2, and it was not addressed.
   - **Instead:** hold an oblique camera at the peak with the hero loops in the near field, reaching 75–85 % of the short side and running off-centre toward one corner. The receding shells should sit small and dim behind them, so the top state is clearly larger and more spatial than the middle one.
2. **Turn the neon-tube outlines into luminous material (failure patterns 2, 8 and 9).**
   - **Where:** `torus-large.png`, sheet 1–4 and the front loops in rhythm frames.
   - **Problem:** the thick fibres now have a glossy centre stripe, but every tube carries a hard dark outline halo. They read as neon sign tubing or a vector drawing with strokes, not light inside a fibre.
   - **Instead:** remove the dark contour halos and use soft emissive falloff into the air, a hotter core only where current flows, and a gradient that dims with depth along each tube. Where front tubes cross rear fibres, darken the rear fibres locally (occlusion) instead of drawing an outline.
3. **Turn the hairline nest into depth, not scratches.**
   - **Where:** the centre of `peak-large.png`, sheet 6–12 and the middle of every rhythm frame.
   - **Problem:** dozens of same-width 1–2 px blue and yellow hairlines form a busy, scratchy tangle. The yellow core reads as noise rather than an inner torus.
   - **Instead:** thin and dim the rear shells with distance (atmospheric falloff), keep two or three mid-weight middle shells, and make the yellow inner torus a soft glowing body with a few readable circles. Line count can drop; what matters is legibility.
4. **Make fibre-current one readable lap per gesture, with heavier secondary hits.**
   - **Where:** rhythm frames 9–12 and 20–22.
   - **Problem:** the packet jumps between unrelated spots from frame to frame because each accented hit spawns a new comet.
   - **Instead:** keep a single head that advances monotonically around the hero loop over about one beat. Fold rapid hits into brightening that same head, or launch the next comet on a second hero loop. The bar-start shell lift (frames 1 and 17) currently reads as a whole-bundle violet exposure bump. Make it a localised torus-shell edge glow so it stays subordinate.
5. **Make energy visibly change structure in the early states.**
   - **Where:** sheet stills 1–4 (held at low energy) are nearly identical, and 5 → 8 mostly adds hairlines and pink.
   - **Instead:** as energy rises, open the braid, change the spacing between nested shells and increase the number of hero loops, so the 0.1 and 0.9 compositions differ in silhouette, not only in line count and accent colour.

## Keep

- The linked-circle (Villarceau) identity and the continuous development from sparse to dense. The low-energy torus, the mid-state shell and the peak braid read as one object transforming, with no stacked-picture dissolve.
- The new hierarchy: two or three thick hero loops in front of thinner rear fibres. This is the r4 must-fix 3 direction and it works. Do not flatten it back to equal weights.
- The pink head with its tapered wake on the hero loop (`peak-large.png`). It is the first version where current reads as travelling light; refine the timing but keep this look.
- The palette: near-black ground, saturated blue-violet, lime rear fibres and rare pink accent. No full-screen white, and accents stay local.
- The grid (unchanged, 8.5): three distinct presets (Quiet fibres, Linked circles, Meridian braid) with syncopation, unequal loop lengths and 3.3 / 6.8 / 11.9 family hits per bar. Driving is ≥ 6 and accented is ≥ 8 hits per bar.
- Motion smoothness and live compliance with the flash limiter cannot be judged from these stills.
