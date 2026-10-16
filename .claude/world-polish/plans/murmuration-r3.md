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
