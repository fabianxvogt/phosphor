# murmuration — r3 review

Reviewer: claude-opus-5-5 (anthropic). Evidence: `/Users/fabian/Development/phosphor/.claude/worktrees/murmuration-r3/artifacts/look-review/murmuration-r3/` (murmuration-sheet.png, murmuration-rhythm.png, grids.md; murmuration.png checked as a cross-reference). I did not read the implementer's self-assessment.

Calibration note: no baseline table existed yet (SCORES.md is missing and both `review-base/output` and `review-baseline/output` were empty), so I scored the baseline myself from `artifacts/look-review/baseline/murmuration-*.png` and the baseline grids on the same rubric: **L 5.5 / G 2 / E 3 → Overall 4.5**. The flock was a thin dark loop on a banded sky, every preset hit only step 1, and no rhythm response was visible.

| World | id | L | G | E | Overall | Pass | Δ vs baseline | Signature effect (name: visible? fits?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dusk Murmuration | murmuration | 6.0 | 7.5 | 6.0 | 6.0 | no | +1.5 (L +0.5, G +5.5, E +3) | **wing-front**: partly visible. It shows as a thin vertical bright seam across the flock (rhythm 10, 23), not as a wave that peels through the flock and displaces it. The idea fits the world; the execution reads like a scan line or render artefact. The strongest beat response is actually sun-glint (slot 0): bright wing patches in rhythm 2, 7, 8, 11, 19, 24. |

Score arithmetic: 0.6·6 + 0.15·7.5 + 0.25·6 = 6.2, which rounds to 6.0.

## Must fix for ≥ 8

1. **The flock reads as stippled cloth, not birds** (failure pattern 8).
   - Where: sheet stills 2–7 and 12, rhythm 4–9. The flock is an evenly dotted surface with hard cut edges, like a crumpled dotted sheet. Still 12 has a hard vertical cut edge, and rhythm 4–6 has a dark vertical seam.
   - What it should look like: density falls off softly toward the edges, with a ragged fringe of straggler birds. Where the sheet folds over itself it goes near-black, and thin sections go translucent. Near birds are larger and darker than far birds, so the flock reads as thousands of birds in depth.

2. **The sky is flat, olive and too bright** (failure patterns 3 and 5).
   - Where: stills 1–7. About 60 % of the frame is a smeary mustard-olive gradient. The layered cloud banks from the baseline are gone, so there is no atmospheric depth.
   - What it should look like: the zenith (top third) is near-black, and a saturated glow is confined to a horizon band in the lower 25 %. Two or three cloud layers drift at different speeds for parallax. Energy should change the structure of the sky (cloud break-up, the glow band widening), not just how bright the whole frame is.

3. **Scale and framing: a mid-size object in the centre** (failure pattern 1).
   - Where: stills 1–8. The flock fills only about 25–40 % of the frame width, sits dead centre, and there is nothing else in the sky.
   - What it should look like: at the top states (9–11) the flock sweeps across 60–80 % of the short side and drifts off-centre over a phrase, and at the peak part of it passes close to the camera. Add a small distant second flock or straggler stream as a scale cue.

4. **Make the signature wing-front a real wave.**
   - Where: rhythm 10 and 23. The wing-front is a 1–2 px vertical line.
   - What it should look like: a curved silver band, roughly 10–15 % of the flock wide, sweeps across the flock in about one beat. The birds it passes bank, so the sheet visibly dents and ripples and the silhouette changes shape, and then a dark neighbour wave follows it.
   - Falcon-strike also needs a visible effect: no rhythm frame shows a hole or a scatter. A punched-out void with birds spraying outward should be readable at a glance on the accent.

5. **The ground is artificial** (failure pattern 9).
   - Where: stills 7–12 and all rhythm frames. The foreground is a picket of evenly thin vertical spikes, like a comb or fence, and the treeline is one repeating scalloped bump.
   - What it should look like: irregular reed or grass silhouettes of varied height, lean and thickness, plus a treeline with irregular masses and gaps. Alternatively drop the spikes and let the flock and sky carry the frame.

## Keep

- **The volumetric flock.** It is now a real 3D folding volume with interior density shading. The development from a figure-eight (still 1) through a bowl (stills 4–6) to large twisting folded sheets (stills 9–11) is one identity transforming, and energy visibly changes its structure.
- **The darker, radially vignetted sky at the top states** (stills 9–12). Push this further down into the lower states.
- **Sun-glint wing patches on the beat** (rhythm 2, 7, 8, 19, 24). They are world-specific, read without strobing and use the accent sparingly.
- **The rhythm grids.** All three presets are syncopated and differ in placement, not only in strength (restrained 3.3, driving 7.3, accented 11.5 hits per bar). The rare 4-bar falcon-strike suits the theme.
  - What is missing for G 8+: a polyrhythmic loop length, for example a 3-beat glint against 4.
  - Watch accented: sun-glint fires almost every eighth note, so the accent stops being rare.
