# mycelium — r3 review

Reviewer: claude-opus-5-5 (anthropic/claude-opus-5-5), independent; I did not read the implementer's report or self-score. Evidence: `/Users/fabian/Development/phosphor/.claude/worktrees/mycelium-r3/artifacts/look-review/mycelium-r3/` (mycelium-sheet.png, mycelium-rhythm.png, grids.md, plus mycelium.png as a cross-check).

Calibration note: there was no baseline table yet (SCORES.md is missing and both review-base/review-baseline output dirs are empty). So I scored the baseline myself from `artifacts/look-review/baseline/mycelium-*.png` and its grids: **L 4.5 / G 2.5 / E 2.5 → Overall 3.5**. That baseline was olive plasticine terrain that did not read as mycelium, every track had only its first step, and the rhythm response was barely visible.

| World | id | L | G | E | Overall | Pass | Δ vs baseline | Signature effect (name: visible? fits?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Living Mycelium | mycelium | 6.0 | 7.5 | 5.5 | 6.0 | No | +2.5 (L +1.5, G +5, E +3) | **signal-relay**: only partly visible. A pink wash spreads over the floor network in rhythm frames 5–6 and 19–24, but I see no travelling head and no visible gill ignition on the caps. The idea fits the world well, but at a glance it reads as a colour tint, not a nutrient pulse racing to a mushroom. |

Why L is 6: the world now reads as the right subject, hyphae turning into a fruiting forest, which is a real step up. But several failure patterns remain, in order of severity:
- Small, sparse object on black.
- Uniform hairlines.
- Straight neon bars.
- Plastic caps.
- Camera inside geometry.

No state is a phone-filming composition.

## Must fix for ≥ 8

1. **Fill the forest states (stills 9–12, all 24 rhythm frames).**
   - Problem: the upper 50–60 % of each frame is an empty dark void. The network shrinks to a thin dim strip along the bottom, and still 12 is basically one blue cap on black (pattern 1).
   - Fix: lower or tilt the camera so the glowing network covers about half the frame as a lit floor that recedes into fog. Build dense clusters: many small caps plus a few large ones, overlapping at different depths, with glowing threads climbing the stems, so 70–85 % of the frame carries structure.
2. **Give the hyphae body and growth (stills 1–7).**
   - Problem: every thread is the same 1-px scratch on near-black, and these stills are about 25 % lit (pattern 2). Energy barely changes them: still 6 is only slightly denser than still 1 (pattern 5).
   - Fix: thick rhizomorph cords with soft subsurface halos, fine fuzzy hyphae fanning out at growing tips, and bright dense knots where cords merge. At energy 0.9 the network should visibly branch into a mat, not just add more lines.
3. **Remove the straight bright horizontal bars.** These are the yellow-green and pink streaks lying flat on the ground in still 8 (centre), stills 10–12 and the middle band of every rhythm frame. They read as neon tubes or laser lines, not biology (pattern 9). Make them curved, branching cords that follow the network, or delete them.
4. **Make signal-relay a readable event.**
   - What it should look like: a bright accent head with a fading trail runs from a colony knot along a visible thick cord and up a stem. On arrival the gills under that cap light up from the stem outward and decay over about 2 beats.
   - Currently: the cords only take on a uniform pink tint (frames 5–6), and frame 19 shows a generic whole-frame yellow ambient lift.
   - Secondary hits (reaction-front on the tips) should stay smaller than the signature.
5. **Cap material and the camera clip.**
   - Problem: the caps read as smooth plastic umbrellas or lampshades with regular radial stripes (stills 9–12, pattern 8).
   - Fix: irregular, slightly translucent caps with darker tops, gills glowing from underneath, and moist stems.
   - Separate bug: the blown-out, smeared green-white blob at bottom-right of still 9 and rhythm frames 1–8 is the camera grazing a stem or cap. Keep the camera path clear of geometry.
6. **The arc from still 8 to still 9 is a cut, not a growth.**
   - Problem: the camera drops from an aerial view to ground level and the network disappears, so it reads as two pictures (patterns 6/7).
   - Fix: keep the network as the hero into the forest state. Caps should sprout from the brightest network nodes seen in still 8, with a continuous crane down over a phrase.

## Keep

- The new subject itself: a luminous hyphal network replacing the plasticine terrain. It reads as mycelium at last.
- The development story: sparse threads, then a dense network plain (still 7), then fruiting bodies emerging (still 8), then a mushroom forest.
- Dark ground and the palette roles: yellow-green threads, violet and yellow-green caps, a rare pink accent. Saturated, no beige.
- Fog depth and scale cues in the forest: near and far caps fading into haze (stills 9–11).
- The grids:
  - Each of the three presets has its own placement: dormant 4-bar sparse, syncopated driving, sixteenth-heavy "Spore chorus".
  - They use off-beats, feed fills at the end of the phrase, and 4-bar signal-relay phrases.
  - To reach G ≥ 8, add one polyrhythmic loop length (e.g. a 3-beat or 6-step feed or spore loop against 4).
