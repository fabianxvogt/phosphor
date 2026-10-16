# garden — r3 review

Reviewer: claude-opus-5-5 (anthropic), independent. I did not read the implementer's report or self-score. Evidence: `/Users/fabian/Development/phosphor/.claude/worktrees/garden-r3/artifacts/look-review/garden-r3/` (`garden-sheet.png` stills 1–12, `garden-rhythm.png` frames 1–24, `grids.md`, plus `garden.png` for a closer look). Baseline for calibration: `artifacts/look-review/baseline/garden-*.png` and review-base `baseline-scores.md` (garden L 5 / G 2 / E 2 / Overall 4.0).

| World | id | L | G | E | Overall | Pass | Δ vs baseline | Signature effect (name: visible? fits?) |
|---|---|---|---|---|---|---|---|---|
| Afterglow Garden | garden | 6.5 | 7.5 | 6 | 6.5 | no | +2.5 (L +1.5, G +5.5, E +4) | **pollen-rising**: visible at a glance (still 7 and 10; rhythm 1–5 and 15–18), but only half fits. The trails are straight 1‑px pink/white hairlines spread across the whole sky, so they read as rain or film scratches, not curved pollen. The "patch of flowers unfurls" part of the gesture never shows. |

Scoring: 0.6·6.5 + 0.15·7.5 + 0.25·6 = 6.53, which rounds to 6.5. This fails on both counts: L is below 7.5 and Overall is below 8.

What changed: the torus/vase concept is gone. The world is now a twilight meadow of translucent blue flowers with lime-glowing throats under a blue sky with a lime horizon band.
- It has real depth now: perspective, fog toward the horizon, scale cues.
- The development arc is buds → tulip cups → open flowers (stills 5 → 7 → 9).
- Energy changes density and openness, not just brightness.

The peak (stills 9–10) is pretty, but it is a generic "glowing flower field" screensaver with several visible weaknesses. That puts L at 6.5, not 7+.

## Must fix for ≥ 8

1. **Make pollen-rising a real event (E, highest priority).**
   - Now: in still 7 and 10 and rhythm frames 1–5 and 15–18, the trails are thin, straight, vertical hairlines scattered across the full sky width. They read as rain or static.
   - Instead: localise it to one patch (≤ ⅓ of the frame width, moving between hits). That flower cluster should visibly flare open, with petals bursting lime→pink and a ground-light ring spreading out.
   - It then releases thick (2–4 px at 960), soft, bloomed motes in accent pink/gold. They drift up on curving paths with a lifetime fade and hang in the afterglow for about a beat.
2. **Fill and structure the low-energy ground (L).**
   - Now: in stills 1–6 the bottom 55–60 % is near-black, smeared grey ground with blurry concentric ellipses that read as puddles or oil. The flowers are dots on the horizon.
   - Instead: put closed, faintly glowing buds in the mid- and foreground. Add dark grass or moss blades lit from behind, and a few firefly motes. The breakdown should read as a sleeping meadow, not an empty floor.
3. **Put the signature back at the top of the luminance hierarchy, and vary the framing (L).**
   - Now: in stills 1–6 the brightest thing on screen is the lime horizon band, and the flat sky gradient takes up 35–40 % of the frame. The horizon sits at the same height in all 12 stills.
   - Instead: narrow and dim the band. Give the sky depth with layered cloud and hill or tree silhouettes that parallax.
   - Add a phrase-scale crane: low among the stems at the peak, a higher overview in the breakdown.
4. **Give the secondary gestures a readable shape (E).**
   - Now: beat frames 7–12 and 19–24 are almost identical. vein-pulse and petal-cohort only show up as a whole-frame lime haze (frame 15).
   - Instead: vein-pulse should be light running visibly along the petal margins and stems of one cohort, ideally as a wave travelling across the field on the beat. petal-cohort should be an actual flex or open–close of a selected group.
5. **Add hierarchy to the peak field (L).**
   - Now: stills 9–12 are a uniform carpet of the same flat five-petal cards. The near-camera flower at left (stills 8–10, rhythm 13–17) blows out into a milky lime-white smear.
   - Instead: add a few large hero blooms with visible veins, translucency and a fresnel rim. Vary flower heights and species, and cluster them. Clamp near-camera glow so it stays saturated.
6. **Remove the dark wedge streaks (L).**
   - Now: in rhythm frames 7–24, dark triangular wedges converge toward the horizon and read as artefacts.
   - Instead: turn them into proper flower shadows or soft light shafts from the horizon glow, or remove them.

## Keep

- The meadow concept with horizon, fog and scale falloff. This is the depth the baseline lacked; do not go back to centred objects.
- The palette hierarchy: blue petals, lime-glowing throats, and rare pink cores as the accent (stills 9–12).
- The development arc with one identity throughout: the same field goes sparse buds → tulip cups → open blossoms (stills 5, 7, 9), with energy driving density and openness.
- Smooth camera: no lurch is visible across the sheet. (Stills can't show motion quality fully.)
- The grids:
  - They are world-specific and syncopated, with off-beat vein-pulse and an `xxx` fill at the end of the accented pattern.
  - The loop lengths are polyrhythmic (2 / 3 / 4 bars in "Midnight flowering").
  - The three presets have clearly different placement ("Sleeping petals" / "Nectar paths" / "Midnight flowering").
  - Pollen fires sparingly (about once per bar or less), so it can become the moment people wait for without strobing.
