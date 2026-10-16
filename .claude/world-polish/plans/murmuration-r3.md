# Murmuration round 3

Baseline self-assessment: L 5.5, G 7, E 3. The previous documentation's 8.5 is not supported by the new film. Read STYLE, CONTRACT, AUTHORING, RHYTHM, rubric, HANDOFF, family/model/tests, world definition and both baseline sheets. No earlier murmuration plan exists. Independent review not yet present at diagnosis; check again before handoff.

## Weaknesses / decisions

1. Flock is a thin, grainy dark noodle (stills 1–7), not a huge living mass.
2. Graphic diagonal cloud bands overwhelm the actual birds; desaturated white mixing muddies the palette.
3. Late formations fall through the horizon (9–11); development-driven eye elevation moves the landscape unnecessarily.
4. Mechanical loop contours dominate; need broad feathered skirts and uneven compressions.
5. Sun-glint track has no shader use at all; existing startles barely change the distant silhouettes. Falcon is effectively invisible.

Phone moment: an enormous dark folded flock, backlit by saturated dusk, catches a travelling silver/palette wing-front that peels through its folds on a fill, then closes into shadow again.

## Work

Keep IDs, schema, all seven look names/seeds and states unchanged. Reframe the flock and keep the horizon stable; broaden cloud and scroll cross-sections with persistent IDs, keep CPU/GPU model agreement. Simplify cloud contrast and increase palette separation, vary treeline silhouettes. Three filmed rounds minimum, critique each. Then merge main's World rhythm presets and implement slot 3 `wing-front`: count-selected wave along flock longitude with bank/wing-area and narrow local rim response; hit seeds the real neighbour lattice too. Strengthen actual sun glint, startle bank and falcon response, respecting bounded velocities/camera and local light only. Fill fast local tracks to driving >=6 and accented >=8 hits/bar; keep structural startles rare. Add EN/DE keys beside existing rhythm descriptions.

## Film rounds and decisions

1. Round 1: much clearer, saturated sky and stronger framing; horizon no longer bisects the peak. Flock still too fine and uniformly outlined.
2. Round 2: larger wing area and a linear+cubic cross-section give a dark, substantial cloud; profile remains recognisable but rectangular ends need variation. The old cubic-only density assertion is intentionally changed to 0.2375 (half-lattice transverse sampling).
3. Round 3: failed visually: negative-base `pow(cos(...), 2.)` / `pow(sin(...), 2.)` is undefined in GLSL and collapsed birds into a block. Replace with explicit multiplication, add regression. This is not accepted evidence.
4. Round 4: corrected breathing width, and rhythm added after merging main (already current with b3fec04). Wing-front visible but too violet/dim against the sky; replace its local palette light with a restrained white/primary feather reflection. No change to whole-frame light or limiter.

Independent review output remains absent at the requested glob when checked during implementation; baseline sheets and HANDOFF's 5/10 judgement were used. `profile-families.mjs` accepts `--families`, not the brief's singular `--family`; use the actual supported option. i18n requires a local build and calls its native GPU flag `--native-gpu`, not `--rig`.

5. Final review: lengthen driving wing-front to 1.1 beats and space its fills so each sweep finishes. It now reads across several half-beat strip frames. Portrait reversal exposed a peripheral crop in the initial formation; add a bounded portrait-only focal fit identically to birds and sky (landscape unchanged). Re-run full native verification, costs and final captures. Replace inherited negative-base squared `pow` in reed shapes with multiplication too.

## Cost / verification

No new passes or birds, no engine changes or limiter edits. Extra per-vertex trigonometry and broader overdraw are cost risks; simplify sky to offset. Check energies .1/.5/.9, warm/cold/third palettes, portrait, reversal and late simulation; native 1080p/4K profiles and paired main delta; complete required test/typecheck/i18n/format suite. Final reviewer captures and grid dump; document honest remaining limitations, not an invented pass.

## Final verification

Full suite 956 pass / 21 skipped / 0 fail; typecheck, build, native DE/EN i18n and family/script/docs/plan formatting pass. 33 native cases cover all requested energies, three palettes, portrait presets, reversal and 12 h + 7 s clock phases with limiter enabled; zero GL errors or non-finite uploads, no empty frames. Absolute 1080p worst p50/p95 2.8/2.9 ms, 4K 6.2/7.4 ms. Paired 1080p replay deltas −3.7/−7.4/+6.9%; Formation exceeds the script's 5% regression gate (exit nonzero); a heavily contended run was worse and is retained too. 4K replay −6.7/+1.8/−3.0%, passes. Do not claim a clean paired performance pass; integration needs a quiet rerun. Self-assessed look 7.5, not independent acceptance. Final film and rhythm strip reviewed; broader cloud and local moving feather front are now readable, but the knot/landscape remain visibly authored.

## r4

Independent r3 review: L 6 / G 7.5 / E 6 → 6.0, fail. Agree with every item; self-assessed 7.5 was ~1.5 too high. Response, in the review's priority order (Keep list: volumetric folding flock and its figure-eight → bowl → folded-sheet arc, darker vignetted top states, sun-glint wing patches, syncopated distinct presets and the rare 4-bar falcon):

1. **Stippled cloth → birds.** Per-bird straggler fringe: lattice edge rows (|2v−1| → 1, plus the twister's open ends) get progressively larger home jitter and a seeded 6–35% stray fraction flying 0.5–1.7 units outside the sheet, so density falls off into a ragged fringe instead of a cut edge. Thicker transverse sheet so folds are volumes, not lines. Per-bird screen density from two real lattice neighbours (projected cell area vs. bird area): dense/edge-on folds go fully black and slightly enlarged, thin sections are lighter and smaller (translucent). Stronger aerial perspective: far birds haze toward the sky, near birds stay black and larger.
2. **Sky.** Rebuild `muSky`: near-black secondary zenith, saturated primary glow confined to a low horizon band (lower ~25% of frame), hue moves toward secondary as it darkens (no dark-lime olive). Two cloud layers in the angular data (high wisps, low banks with lit silver linings), drifting at different integer clock rates by azimuth rotation (endless, seam-free). Energy (`u_level`) widens the glow band and breaks the low banks up; exposure stays.
3. **Scale/framing.** Closer camera in every state (loose ≈ 8.5, formation ≈ 6.6 units), deeper bounded dive at the peak (to 0.62× distance) so part of the flock passes close; off-centre aim drifting sideways over ~24 s (integer harmonic). New distant second flock (3 072 procedural LOD birds, extra geometry vertices, no simulation) low over the horizon behind/beside the main flock as a scale cue.
4. **Wing-front as a wave.** Store each slot's hit amplitude in the clock bird's spare texel so the shader can invert the smoothstep envelope into a linear 0→1 sweep phase. The front is a curved band (~12% of flock width) sweeping across the flock in camera space over the gesture duration (≈1 beat): silver feather light, strong bank, a visible dent (derivative-of-Gaussian lift along camera-up), followed by a dark broad-wing trailing wave. Falcon strike: a void punched along the view line through a count-selected real bird; birds inside are pushed out radially and sprayed (seeded extra spread), giving a hole with a dense rim on the accent; the falcon itself crosses the hole; the sim fires startles around the same bird in every state.
5. **Ground.** Treeline from circle-periodic noise (irregular masses, gaps, fine crowns, no repeat). Reeds: three clumped layers with seeded presence, height, lean, taper and occasional seed heads instead of the even picket.
6. **Grid.** Sun glint becomes a 3-beat loop in driving and accented (3 against 4); accented glint thinned from 6.5 to 4 hits/bar so it stops firing every eighth. Targets kept: driving ≥ 6, accented ≥ 8.

Risks: extra per-vertex fetches (neighbour density, strike bird) and far flock vertices; check 1080p/4K and pair delta. Darker sky reduces bird/sky contrast at the top; birds keep the lower glow behind them via framing.

### Resumed r4 film rounds

Preserved interrupted changes in scene/model/geometry/tests and this addendum; merged current main before continuing. Existing w1–w4 captures are retained, not overwritten. The actual distant flock has 2,048 birds; actual bounded dive is 0.66× distance. No look names, seeds, schema or world definitions need changing. New rounds below will be captured and read individually. Prioritise bird material and graded fringe, night-sky hierarchy, then broad curved wing-front with a visible silhouette dent; retain the stronger scale and irregular ground already implemented.

1. `murmuration-r4-round1`: narrowed the glow, strengthened clouds, widened the crest to ~11% of the flock and added reset jitter. Read both sheets: the wave is now a real silver feather patch with a curl, but the upper sky swallows birds. Reject that exposure balance.
2. `murmuration-r4-round2`: restored cool secondary separation without broad primary olive; stronger seeded home jitter, per-bird wing sizes. Read both sheets: individual close wings and ragged edges read, lower banks and distant flock give depth. Core is still too perforated; silver wave is broad and visible in rhythm 2/8/11/15/19/24.
3. `murmuration-r4-round3`: larger wings in compressed cells; feather AA sees dark neighbours rather than empty sky, making folded cores near-black without filling the thin skirts. CPU reset now matches the jittered GPU reset. Read both sheets: fuller core and distinct near birds, retained figure-eight → bowl → curling formation. Remaining limitation: deliberately geometric target choreography, occasional close fly-by crop, and illustrative cloud banks. Falcon scatter is brief and more legible in motion than the sampled strip. Final capture must be regenerated after verification.

### r4 verification / final critique

Final default, Ember and Glacier films captured and both default sheets plus palette sheets read. Keep list preserved: same folding volume/development arc and seven looks; near-black top, local sun glints, named syncopated styles and sparse falcon. Grids: 3.25 / 7.25 / 9 hits/bar, with driving/accented glint loops exactly three beats. Self-assessment L 7.5, G 8.5, E 8.5 → rounded Overall 8; this is not independent acceptance. The formations still reveal authored targets, near fly-bys crop, clouds remain illustrative, and falcon scatter is fleeting.

Full suite 1000 pass / 21 skipped, typecheck, build and native DE/EN i18n pass. 33 limiter-enabled native health/aspect/energy/palette/late/reversal cases pass, zero GL errors/non-finite uploads; contact sheet read. Prettier and diff whitespace pass. Absolute worst 1080p p50/p95 2.9/3.1 ms, 4K 7.5/8.3 ms, both budgets pass. Standard main pair +12/+8/+12.5%, fails 5% gate. Its module routing mixes main's shader with r4's new geometry IDs, drawing extra falcons in reference; a supplemental family --pair routes matching scene/model/geometry and keeps limiter enabled, +37.5/+31.2/+23.5% (2.2/2.1/2.1 ms final). Neither is a paired pass, nor venue cadence qualification. Report both rather than hiding the cost. No shared harness, engine, limiter or preview changes.
