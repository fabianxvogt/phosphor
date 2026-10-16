# liquid-chrome — r3 review

Reviewer: claude-opus-5-5 (anthropic/claude-opus-5-5), independent; implementer self-assessment not read. Evidence: `/Users/fabian/Development/phosphor/.claude/worktrees/liquid-chrome-r3/artifacts/look-review/liquid-chrome-r3/` (liquid-chrome-sheet.png, liquid-chrome-rhythm.png, grids.md, liquid-chrome.png). Baseline used for comparison: `artifacts/look-review/baseline/liquid-chrome-*.png`, SCORES.md row (L 3.5 / G 2 / E 1.5 / Overall 3.0).

| World | id | L | G | E | Overall | Pass | Δ vs baseline | Signature effect (name: visible? fits?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Liquid Chrome | liquid-chrome | 6.0 | 7.5 | 6.0 | 6.0 | no | +3.0 (L +2.5, G +5.5, E +4.5) | **magnetic-strike**: partly visible. On the beat frames (rhythm 1, 3, 9, 11, plus the syncopated hits in bar 2) a lime ring glows on the floor and the crown grows a few percent. You have to compare frames to see it. The ring stays at one radius, is mostly hidden behind the sphere and its reflection, and the "alternating poles" are not visible. The idea fits the world well, but it does not yet read as a magnetic strike. |

Overall = 0.6·6.0 + 0.15·7.5 + 0.25·6.0 = 6.23 → 6.0.

This is a big improvement over the baseline. The surface is now actually lit, the pool shows concentric ripples, and there is a mirror-floor reflection. It still has two failure patterns visible in every still: a small centred object on black (#1) and a material that reads as the wrong thing at the peak (#8, a sea urchin or spiked mace rather than ferrofluid).

## Must fix for ≥ 8

1. **Framing and empty black (all 12 stills, all rhythm frames).**
   - Problem: the dish (stills 1–5) and the sphere (stills 9–12) sit dead centre. They take up about 30 % of the frame width and about 55 % of the short side. Everything else is flat black with no environment.
   - Fix: dolly in until the body fills 70–85 % of the short side. Drift the framing off-centre over 8/16-bar phrases. Add depth: out-of-focus foreground chrome droplets with parallax, plus a faint studio or horizon gradient in palette dark tones behind the subject.
2. **The chrome has nothing to reflect (stills 1–8), and the accent turns into slime (stills 6–8).**
   - Problem: reflections are one grey smear plus large flat lime patches. In 6–7 the lime covers well over 10 % of lit pixels and reads as green paint or slime on black plastic.
   - Fix: give the surface a structured environment to mirror (softbox strips and a horizon line in primary/secondary colours), so every spike carries a sharp highlight streak and a dark core. Limit lime to thin rim and specular edges and to strike events.
3. **The peak reads as a sea urchin, not ferrofluid (stills 9–12, the whole rhythm strip).**
   - Problem: about 40 large, separate cones sit on a ball that floats above the floor, with the pool reduced to a dark disc.
   - Fix: make the top state a dense hexagonal lattice of many smaller, sharp spikes. They should rise from one continuous liquid body that stays joined to the mirror pool (a crown standing in its puddle). Spike count and height should visibly scale with energy, comparing the 0.1 and 0.9 stills.
4. **Make the signature strike unmistakable (rhythm frames 1–24).**
   - Problem: today it is a thin lime ring at a fixed radius plus a few percent of growth.
   - Fix: on each strike, the spikes should shoot up 20–40 % and collapse with a liquid overshoot. A pressure ring should travel outward across a pool the camera can actually see at the top state, so the pool must stay in frame. Accent hits should show the pole flip as a lean of the spike field to one side and then the other. Keep kick zoom ≤ 2–3 % and stay behind the flash limiter.
5. **Stray artefacts (stills 2–3 and 5).**
   - Problem: a wiggly magenta vertical stroke ending in a spiral (stills 2–3) and a pink glyph-like scribble at the right rim (still 5) read as a stray neon wire or text. The hard white outline around the pool rim in stills 1–4 looks like clip-art.
   - Fix: remove the pink strokes, or turn them into soft, deliberate field-line shimmer. Soften the rim edge into a fresnel highlight.
6. **Grid polish (low priority).**
   - Problem: restrained has only 2.5 hits per bar, and the driving magnetic-strike is almost straight eighths.
   - Fix: give restrained an off-beat ripple, and give driving one more syncopated push so it does not feel like a metronome.

## Keep

- The development arc keeps one identity throughout: rippled mercury dish → spikes erupting from the disc (stills 6–8) → full crown (9–12). It flows rather than stacking two pictures.
- The mirror-floor reflection of the spikes under the body (stills 8–12) and the concentric ripple rings on the pool (stills 1, 5).
- The orbiting chrome satellite droplets (droplet-orbit), which are small scale cues.
- Strikes land on the authored grid, including the syncopation in bar 2, with no strobing and no full-screen flash.
- The accented "Chrome resonance" grid: 10 hits per bar, a syncopated strike pattern, and a 3-bar spike-swell against a 4-bar droplet-orbit (polyrhythm). The three presets differ in where the hits fall, not only in strength.
- Dark ground and a restrained palette. Do not fix the emptiness by brightening everything.
