# ink-bloom — r3 review

Reviewer: claude-opus-5-5 (anthropic/claude-opus-5-5), independent. Evidence: `/Users/fabian/Development/phosphor/.claude/worktrees/ink-bloom-r3/artifacts/look-review/ink-bloom-r3/` (ink-bloom-sheet.png, ink-bloom-rhythm.png, grids.md, ink-bloom.png). Baseline: `artifacts/look-review/baseline/ink-bloom-{sheet,rhythm}.png` and `grids.md`.

Calibration note: SCORES.md has no baseline table yet and the review-base output folder is empty. I scored the baseline myself from the same evidence and rubric: **L 5 / G 2 / E 3 → Overall 4.0**. Reasons: plasticine toy rings, crops at the bottom edge in stills 9–12, grid fires only on step 1, and there is no visible rhythm response.

| World | id | L | G | E | Overall | Pass | Δ vs baseline | Signature effect (name: visible? fits?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ink Bloom | ink-bloom | 5.5 | 7 | 6 | 6.0 | no | +2.0 (L +0.5, G +5, E +3) | **ink-burst**: visible, yes. It shows as a large magenta patch on strip frames 15–20 (bar 2 fill, steps 6/8) and 1–4, and on sheet stills 4, 7 and 10. Fit is only partial: it looks like a pink tint repainting a third of the body, not a pigment packet ejected from a rim that unrolls into filaments. |

Overall = 0.6·5.5 + 0.15·7 + 0.25·6 = 5.85 → 6.0.

The concept moved from glossy rings to a translucent volumetric dye cloud, which fixes the plasticine reading. The new look adds its own failure patterns:
- It is a defocused, smeared lump.
- The whole frame has striation banding that looks like corduroy.
- The accent is overused.
- The vortex-ring identity is gone.
- It is a single centred object on black with no space around it.

Nobody would film it.

## Must fix for ≥ 8

1. **Focus and texture (highest priority).** Every still looks out of focus. On sheet stills 6, 8, 10 and 11, and strip frames 7–14, the surface has regular parallel stripes, like ray-march slice banding or moiré. Real ink in water has sharp curling filament edges (≥ 1.5 px at 1080p), soft falloff only inside the density, and fine tendrils at the rims. Remove the banding entirely (static jitter, more steps or analytic density near edges), and keep blur only as depth-of-field on far parts.
2. **Make ink-burst a packet, not a tint.** On strip frames 15–18 and sheet stills 4 and 7, roughly 25–35 % of the lit body turns flat pink. It should be one small, dense accent puff with a dark core. It should leave a single curled rim sector, travel 10–15 % of the short side over 1–2 beats, then unroll into 3–5 thin filaments and fade. Accent should cover ≤ 10 % of lit pixels, and the scalloped rim should be readable at a glance.
3. **Development arc and identity.** Stills 1–3 show the same bulbous lump that looks like a bell pepper. Stills 9–12 break into disconnected smeared chunks instead of reaching a full form. Rebuild the sparse → structured → full story around one persistent body: a falling droplet/plume, then a vortex ring with daughter rings (bring back the r1 cascade topology), then a full billow with Widnall fingers. Energy should change finger count and turbulence; still 1 against still 8 should differ in structure, not only in smear.
4. **Space and framing.** The world is a single centred object on pure black, with no atmosphere, backlight or parallax. Stills 6, 8, 9 and 11 are cropped hard at the bottom frame edge. Add these:
   - a dim backlit water volume with a palette-dark gradient
   - depth fog
   - drifting fine pigment motes or out-of-focus foreground strands for parallax

   Frame the bloom at 70–85 % of the short side and drift it off-centre over phrases, never touching the border.
5. **Secondary gestures are invisible.** On strip frames 5–12 (bar 1 second half to bar 2 first half) the body barely changes between beats, although ring-roll and finger-reach fire there. ring-roll needs a visible bright rim-highlight sweep along the curled sheet. finger-reach needs a readable lobe extension of about 5 % that relaxes over 1–2 beats.
6. **Palette.** Lime and blue are smeared together at about 50/50 into muddy mid-tones (stills 5, 9, 12). Use a dark ink core, the saturated primary in dense regions, and the secondary only on thin backlit edges.

## Keep

- The translucent volumetric dye material: it no longer reads as plasticine or toy rings. Do not go back to opaque glossy shells.
- The rhythm grids. All three presets are different grooves, and accented uses sixteenth syncopation with fills at the ends of bars 2 and 4. All four tracks are world-specific (ring-roll, finger-reach, pigment-wave, ink-burst). Restrained stays sparse, as it should. Possible upgrade: add a 3-against-4 track.
- Fill-locked timing: the bursts land exactly on the authored fills (frames 14/16), which gives the audience a moment to lock onto.
- Safety: the ground stays dark, there is no full-screen white, and nothing strobes across the 24 rhythm frames.
