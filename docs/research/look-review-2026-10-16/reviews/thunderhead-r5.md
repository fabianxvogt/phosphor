# thunderhead — r5 review

Reviewer: anthropic/claude-opus-5-5 (independent session; I did not read the implementer's report, plan or self-score). Evidence: `/Users/fabian/Development/phosphor/.claude/worktrees/thunderhead-r3/artifacts/look-review/thunderhead-r5/`, using `thunderhead-sheet.png`, `thunderhead-rhythm.png` (capture v2: held development 2, energy 0.85, 126 BPM, starting at beat 8, per `thunderhead-evidence.json`), `grids.md` and `thunderhead.png` (enlarged stills, used to check ambiguous frames). I could not locate the r4 PNGs, so I calibrated against the r4 review text and SCORES.md.

| World | id | L | G | E | Overall | Pass | Δ vs r4 | Signature effect (name: visible? fits?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Thunderhead | thunderhead | 7.0 | 8.5 | 8.0 | 7.5 | No | ±0 (7.5 → 7.5; L 7.0 → 7.0) | **bolt-from-the-blue:** visible, and now reliably tied to the rhythm. In rhythm frames 4, 8, 12, 16, 20 and 24 (the off-beat "and" of beats 2 and 4, as authored in the driving grid), a large pink strike hits the lake. The strikes alternate between the left and right flanks, and each one leaves a reflection in the water. It fits the storm. The "leaves the top, crosses clear air" reading is still only partial: frames 12 and 20 leave from the cloud's mid-left flank, and only frames 8, 16 and 24 come close to a top origin. |

Grid: unchanged from r4 at 2.6 / 6.5 / 8.0 hits per bar. That meets the density floor (driving ≥ 6, accented ≥ 8). The three presets are still distinct: sparse long loops, a syncopated off-beat bolt, and a dense 16th-note "Forked sky". Unrounded overall: 7.475. Stills cannot show motion smoothness or live flash-limiter compliance, so I have not judged either.

r4 must-fix check:
- **(1) Atmospheric rather than sculpted: not fixed.** The right-hand blue rim still glows as a continuous outline in all 24 rhythm frames. The flat ochre/brown underside shelf is still there (rhythm, all frames; sheet 9–11). There is no rain or haze dissolving the base into the lake.
- **(2) Quiet composition: not fixed.** Sheet 1–3 is essentially the r4 frame: the same loaf, the moon column, and a black lower half. It now also has green specks along the horizon.
- **(3) Signature light: partly fixed.** The pink strikes (sheet 9 and 12; rhythm 8, 16, 24) are finer and taper better. Sheet 7 still floods a whole lobe in pink-white paint. The white bolts are thick, soft tubes (sheet 10–11; rhythm 11, 19).
- **(4) Horizontal smears: mostly fixed.** The sky now has faint diagonal rays instead of parallel bars.

Net: the causal rhythm is better, but there is no material or framing gain. That is why L stays at 7.0.

## Must fix for ≥ 8

1. **Fill the peak frame.** This affects every rhythm frame and sheet 9–12. At the held development, the cloud is a mid-sized mass in the upper centre. The left ~20 % of the frame is empty, and the lower ~40 % is black: the moon and its reflection are gone, so the lake only exists when a bolt reflects in it. Spread the anvil across ≥ 75 % of the width, off-centre. Keep the lake readable between strikes using its own ambient sky sheen and perspective-scaled ripples. Add rain curtains that actually reach the water, so the lower half has structure in the dark frames (rhythm 2, 3, 6, 22).
2. **Replace the sculpted cloud material.** This affects all rhythm frames and sheet 9–11.
   - Break the continuous bright-blue rim on the right lobes into a few selectively lit wisps, and keep the far lobes dim.
   - Replace the flat brown underside shelf with ragged scud and falling precip shafts that fade into the horizon.
   - The cloud should read as vapour lit from inside, not as cotton lobes with a neon edge.
3. **Rebuild the quiet state.** Sheet 1–3 is unchanged since r4: the same low loaf with black below it.
   - Add a height hierarchy: one taller cell and an opening where the moon sits.
   - Add faint distant rain veils on the horizon and a full ripple field, not just the moon column.
   - Remove the green/teal specks along the horizon line (sheet 1–6). They read as noise.
4. **Fix the lightning material.**
   - The white strikes in sheet 10–11 and rhythm 11/19 are wide, blurred white tubes. Give them a thin hot core with a narrow halo and branches that taper to hairlines.
   - In sheet 7, a whole cloud lobe is washed in flat pink. Light the interior locally, at the bolt's entry point, with falloff through the vapour.
5. **Make the signature's origin unmistakable and remove stray fragments.** Rhythm 5, 7, 8 and 24 show short disconnected strokes floating in the sky above the cloud top. They read as scratches. Either make them the visible leader that leaves the anvil top, arcs out into clear air and connects to the descending bolt, or remove them. At least every second strike should visibly start at the top.
6. **Restore the darkness between strikes.** About 18 of 24 rhythm frames contain some lightning, so the off-beat signature is losing contrast against near-constant discharge. At 0.85, keep the secondary discharges (buried-discharge, branch-corona) smaller and dimmer, so frames 2, 6, 10, 14, 18 and 22 fall back to a near-dark storm.

## Keep

- The bolt-from-the-blue timing: on the off-beat every two beats, alternating left and right flanks, with a matching lake reflection. This is the clearest thing an audience can lock onto, so do not lose it.
- The pink accent strikes on a navy ground: no full-screen white, and the frame stays dark between events.
- The development arc from a broad bank (sheet 1–3) through towers (7) to an anvil (9–12), keeping one cloud identity.
- The moonlit lake with halo and broken reflection in the quiet stills, and the strike reflections at the peak.
- The softer, diagonal sky structure that replaced r4's parallel horizontal smears.
- The three distinct grids at 2.6 / 6.5 / 8.0 hits per bar.
