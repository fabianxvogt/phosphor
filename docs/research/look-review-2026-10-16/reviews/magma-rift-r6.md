# magma-rift — r6 review

Reviewer: anthropic/claude-opus-5-5 (independent; implementer report/plan not read). Evidence: `/Users/fabian/Development/phosphor/.claude/worktrees/magma-rift-r3/artifacts/look-review/magma-rift-r6/` (sheet, held-v2 rhythm strip at development 2 / energy 0.85 / beat 8 start, grids.md, plus `magma-rift.png` for cross-checking). Calibration: baseline row in SCORES.md (6.5/2/3.5 → 5.0) and the r5 review (7.0/8.5/8.0 → 7.5).

| World | id | L | G | E | Overall | Pass | Δ vs baseline | Signature effect (name: visible? fits?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Magma Rift | magma-rift | 7.0 | 8.5 | 8.0 | 7.5 | No | +2.5 Overall (L +0.5, G +6.5, E +4.5); no change vs r5 | **rift-pressure:** visible, yes. Once per bar a hot patch enters the foreground channel bottom-left (rhythm 5, 13, 21), moves toward the vent (6, 14), sets off a basal spray (7, 15, 23) and launches a yellow-green packet high on the fountain (8, 16, 24). Frames 9–12 and 17–20 are quieter recovery. It fits the world: a pressure front followed by an eruption. The packet reads as a glitter firework cloud rather than molten clots. |

0.6·7.0 + 0.15·8.5 + 0.25·8.0 = 7.48, which rounds to 7.5. It fails on both Overall and L.

## Must fix for ≥ 8

1. **Framing in the top state is still a flat backdrop (sheet 9–12, every rhythm frame).** The r5 request for escarpments became horizontal mauve bands with thin dark outlines. They read as paper stage flats, and they also show failure pattern 2, uniform outline strokes. The whole upper half is a lit mauve wash, so there is no dark ground. The fountain is a thin vertical stripe in dead centre. The small black rectangular posts on the horizon (sheet 10–12, right of the fountain) look man-made. **Instead:** use one or two massive, shaded cliff or cone walls with lit faces and dark undersides. Light them only near the vent, push the far ridges to near-black with atmosphere, move the vent off centre (about the ⅓ line) against the cliff, and remove the posts.
2. **The development arc breaks between sheet 8 and 9.** States 0–1 are a dim, low-contrast carpet. Sheet 7 is almost empty even though energy is rising, which is failure pattern 5 (energy does nothing visible). Then sheet 9 jumps to a different camera, horizon, lit sky and fountain. This reads as two pictures stacked (failure pattern 6), not one rift growing into an eruption. **Instead:** make the same rift branch from sheets 1–8 visibly lead into the vent. Crane the camera up continuously over development, show a growing glow and steam on the horizon from state 1, and make energy widen and brighten the channel network in sheets 5–8 instead of dimming it.
3. **The fountain is not yet a molten mass (sheet 9–12, rhythm 1–24).** It is still a narrow luminous pink and yellow ribbon inside a magenta smoke column. It has no thickness, no darker cooling skin, and no falling clots or ballistic arcs. The arcs in the baseline sheet 9–12 were better here. **Instead:** a wider, tapered column with a hot core and darker crusted outer layer. Add heavy clots that rise, arc over and fall back onto the pool, with cooling trails. Shape the plume so it is lit from below by the vent and dark above.
4. **The early channel material still looks like plastic, and the hot pool looks like a sticker (sheet 1–6).** The channel walls are shiny blue-violet with smooth pink blobs, close to the "melted plastic" the r5 review flagged. The yellow pool in sheet 5–6 is a flat, uniformly bright smudge with a hard rim. **Instead:** a crusted channel with a narrow hot ribbon and dark floating skin plates, and broken, tilted slab edges with contact shadows. The hot pool should shade from hot centre to cooling rim and carry a crust film.
5. **Hue range and accent (all stills).** The image is still magenta plus yellow-green accent only. The packet and the sheet 10 spark burst use a sickly lime that reads as glitter. **Instead:** a blackbody ramp within the palette, from dark crimson-magenta skin through hot pink to a yellow-white core in under 5 % of pixels. Keep yellow for the vent core and packet clots, and give the packet spheres or clots with trails rather than a fine sparkle cloud.

## Keep

- The rift-pressure causal chain: the channel patch travels inward, then the basal spray fires, then the elevated packet launches, followed by a real quiet interval. It is one readable event per bar in the aligned v2 strip.
- The sustained yellow-white fountain core and the dark, rough faceted crust of sheets 1–8. The baseline's flat Voronoi neon honeycomb is gone and must not return.
- Smoke depth behind the fountain and persistent channel identity across the low states.
- The grids: 2.5, 7.8 and 14.7 hits per bar, with syncopated seam pulses, a 4-bar ejecta fill, and the 1.5-bar accented lava-surge loop (a polyrhythm). The three presets clearly feel different.

Caveat: half-beat stills cannot show motion smoothness or whether the sheet 8→9 change is a continuous crane or a lurch. Limiter compliance is not judged here.
