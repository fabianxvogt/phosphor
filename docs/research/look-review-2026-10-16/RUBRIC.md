# Look review rubric (2026-10-16)

Owner goal 2026-10-16: every world is genuinely impressive (**≥ 8/10 from an independent reviewer**), its rhythm grid is fuller and more varied, and its rhythm effects are stronger and tied to the world's own character. This rubric is the fixed yardstick for the baseline and every re-score in [SCORES.md](SCORES.md). The reviewer is never the agent that changed the world.

## Evidence the reviewer judges

Per world, from `node scripts/look-review-capture.mjs --out artifacts/look-review/<round>` (real GPU, 960×540, 126 BPM beat clock, authored driving rhythm, the look's own palette):

- `<world>-sheet.png`: 12 stills across a 30 s film: first state held at low energy, sweep through every state while energy rises to 0.9, settle at mid energy.
- `<world>-rhythm.png`: 24 frames at half-beat spacing (three bars) near the top state at energy ≈ 0.85, read left to right, top to bottom. Beats fall on every second frame; bar 1 starts at frame 1.
- `<world>.mp4`: the film itself (optional; extract stills with ffmpeg if a sheet is ambiguous).
- `node scripts/rhythm-grid-dump.mjs --worlds <world>`: the authored rhythm presets as sixteenth-note grids (restrained / driving / accented phrase styles) with the gesture descriptions.

Stills do not show motion quality; judge motion only where frames show it (lurches, stalls, popping) and say so when a call is uncertain. The existing offline `world-film.mjs` harness disables asynchronous flash approval for deterministic captures: these sheets judge the renderer, **not live photosensitivity compliance**. Limiter-enabled native verification, flash-limiter tests and real-stage timing remain separate acceptance evidence; never weaken the live limiter to match a film.

Completed clean/merged worktrees may be removed after preserving evidence. Their reviewed final round directories and numeric verification reports are archived under `artifacts/preserved-worktrees/<world>-r3/artifacts/`; `artifacts/preserved-worktrees/manifest.json` maps original paths and commit hashes. This is a location change, not a new capture or re-score.

## Sub-scores (0–10, half points allowed)

### L — Look quality (weight 0.6)

Composition and fill, depth (perspective, atmosphere, light, occlusion, scale cues), material that reads as what it claims to be, palette use (dark ground, saturated mid-tones, rare accent), legible signature detail, development arc (sparse → structured → full form, one identity transforming), energy visibly changing structure. Check the ten recurring failure patterns: small centred object on black; uniform glowing outlines; desaturated/beige emission; events locked to a development value; energy does nothing; morph = two pictures stacked; camera lurch; material reads as the wrong thing; artificial connectors; temporal grain.

| Score | Anchor |
| --- | --- |
| 3–4 | Reads as a placeholder or tech demo; flat, empty or muddy. |
| 5 | Competent shader demo; nothing anyone would film. |
| 6 | Pleasant, coherent, but generic or with two or more failure patterns. |
| 7 | Good world with one clear weakness a VJ audience would notice. |
| 8 | Impressive: at the peak, people in a club would film it on their phones. No failure pattern visible; every state is a strong composition. |
| 9 | Best in the library: a signature moment nobody has seen in a club. |
| 10 | Unforgettable; nothing to improve. |

### G — Rhythm grid fullness and variation (weight 0.15)

From the grid dump. Does each preset fill more than beat 1? Do tracks use off-beats, syncopation, fills every N bars, polyrhythmic lengths (for example 3 against 4)? Are the three presets clearly different in placement (not only in strength)? Do the presets fit this world (a tide surges in long swells, a clockwork ticks) rather than repeating a shared template?

| Score | Anchor |
| --- | --- |
| 2 | Only the first step of each loop; presets differ only in strength. |
| 5 | Some tracks fill several beats; presets barely differ. |
| 8 | Every preset full and musical: off-beats or syncopation, a fill or polyrhythm, three presets with clearly different feel, world-specific. |
| 10 | Grids a VJ would choose to keep; each preset plays like a distinct groove. |

### E — Rhythm effect strength and fit (weight 0.25)

From the rhythm strip and film. Are rhythm events visible on the beat at energy ≈ 0.85 without strobing? Is there at least one **signature effect** drawn from the world's own theme (for example a wave rolling through Moon Tide every second bar, lightning on the accent in Thunderhead, ink bursts on fills in Ink Bloom) that an audience can lock onto? Effects must stay within the flash limiter and style rules (no full-screen white, kick punch ≤ 2–3 %).

| Score | Anchor |
| --- | --- |
| 2 | No visible response to the rhythm. |
| 5 | Visible on close inspection; generic brightness pulsing. |
| 8 | Clearly visible, world-specific signature effect plus secondary gestures; reads at a glance and fits the world. |
| 10 | The rhythm makes the world feel alive; the signature effect is the moment people wait for. |

## Overall

`Overall = 0.6·L + 0.15·G + 0.25·E`, rounded to the nearest half point. A world **passes** at Overall ≥ 8 **and** L ≥ 7.5 (a full grid cannot carry a weak look).

## Reporting

One row per world in [SCORES.md](SCORES.md): L, G, E, Overall, the two or three most important weaknesses (concrete and visual: what, where, in which still), and the signature rhythm effect once it exists. Name the round, the commit the captures came from and the reviewer (agent/model). Be demanding: earlier rounds found self-ratings 1–1.5 points too high.
