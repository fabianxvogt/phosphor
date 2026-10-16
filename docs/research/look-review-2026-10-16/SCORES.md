# Look review scores (2026-10-16/17)

Rubric: [RUBRIC.md](RUBRIC.md) — Overall = 0.6·L + 0.15·G + 0.25·E (rounded to 0.5); a world **passes** at Overall ≥ 8 and L ≥ 7.5. Every score comes from an independent reviewer agent that did not change the world; implementer self-assessments are not recorded here. Captures: `node scripts/look-review-capture.mjs` (real GPU, 960×540, 126 BPM, authored driving rhythm). Classification: **EMPIRICAL / REPORTED** (one reviewer's judgement of stills, not audience measurement).

## Current state

One row per world; updated after every independent re-score. "Signature effect" is the world's slot-3 rhythm gesture (M4).

| World | id | Baseline | Latest | Round | L | G | E | Pass | Signature effect (slot 3) | Merged |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Living Mycelium | mycelium | 4.0 | 7.0 | [r4 (sol)](reviews/mycelium-r4.md) | 7.0 | 8.5 | 7.0 | no | Signal relay (localized; travel not yet legible) | e5c17b0 |
| Afterglow Garden | garden | 4.0 | 7.5 | [r5 (sol)](reviews/garden-r5.md) | 7.0 | 8.5 | 7.5 | no | pollen-rising: clearly visible pink unfurling flowers and rising trails (rhythm 1–5, 15–19); bo… | e7fce99 |
| Unfolding Garden | unfolding | 3.0 | 7.0 | [r3 (sol)](reviews/unfolding-r3.md) | 6.5 | 8.5 | 7.0 | no | **petal-flush:** visible pink/peach petal patches and changing curl (rhythm 8, 17, 24); botanic… | add6a57 |
| Hopf Bloom | hopf-bloom | 5.0 | 7.0 | [r3 (sol)](reviews/hopf-bloom-r3.md) | 6.5 | 8.5 | 7.0 | no | **fibre-current:** localized pink fibre cohorts clearly visible (rhythm 1, 5, 7, 15, 21); fits … | e5c17b0 |
| Crystal Cavern | cavern | 4.0 | 6.5 | [r3 (sol)](reviews/cavern-r3.md) | 6.0 | 8.5 | 6.5 | no | crystal-chime: localized pink cohorts clearly visible (rhythm 1, 6, 17–18, 21); circular travel… | e5c17b0 |
| Spiral Nebula | nebula | 4.0 | 6.5 | [r3 (sol)](reviews/nebula-r3.md) | 6.0 | 8.5 | 7.0 | no | **starfront:** pink sectors clearly visible (rhythm 1, 3, 10, 13, 18, 20); fits stellar ejecta.… | e5c17b0 |
| Endless Descent | descent | 3.0 | 7.0 | [r3 (sol)](reviews/descent-r3.md) | 6.5 | 8.5 | 7.0 | no | ignition-wave: localized floor bands visibly flare (rhythm 1–3, 13, 24); sequential floor-by-fl… | e5c17b0 |
| Dusk Murmuration | murmuration | 3.5 | 6.0 | [r3 (opus)](reviews/murmuration-r3.md) | 6.0 | 7.5 | 6.0 | no | **wing-front**: partly visible. It shows as a thin vertical bright seam across the flock (rhyth… | e5c17b0 |
| Origami Storm | origami | 4.0 | 6.5 | [r3 (sol)](reviews/origami-r3.md) | 6.0 | 8.5 | 6.5 | no | **crease-snap:** localized pink sectors visible (rhythm 16, 21); an actual hinge snap is not di… | e5c17b0 |
| Attractor Ribbons | attractor-ribbons | 3.0 | 6.0 | [r3 (sol)](reviews/attractor-ribbons-r3.md) | 5.0 | 8.5 | 6.5 | no | ribbon-relay: localized pink highlights visible; tail-to-head travel/wake not established by th… | e5c17b0 |
| Event Horizon | horizon | 4.0 | 7.0 | [r3 (sol)](reviews/horizon-r3.md) | 6.5 | 8.5 | 7.0 | no | photon-relay: localized pink rim flare clearly visible, changing sectors in rhythm 1–3, 6–8, 19… | e5c17b0 |
| Abyssal Bloom | deep-sea | 4.5 | 7.0 | [r3 (sol)](reviews/deep-sea-r3.md) | 6.5 | 8.5 | 7.0 | no | **living-relay:** localized pink reef/bell illumination is visible; alternating cross-organism … | e5c17b0 |
| Liquid Chrome | liquid-chrome | 3.0 | 6.0 | [r3 (opus)](reviews/liquid-chrome-r3.md) | 6.0 | 7.5 | 6.0 | no | **magnetic-strike**: partly visible. On the beat frames (rhythm 1, 3, 9, 11, plus the syncopate… | e5c17b0 |
| Moon Tide | moon-tide | 3.5 | 6.5 | [r3 (sol)](reviews/moon-tide-r3.md) | 6.0 | 8.5 | 7.0 | no | moon-roller: purple shoulder bands visibly change (rhythm 1–3, 19–24); inward travel cannot be … | e5c17b0 |
| Laser Grid | laser-grid | 4.0 | 6.5 | [r3 (sol)](reviews/laser-grid-r3.md) | 6.0 | 8.5 | 7.0 | no | tunnel-chase: hot pink individual shots clearly visible; sequential eight-laser chase unresolve… | e5c17b0 |
| Magma Rift | magma-rift | 5.0 | 7.0 | [r3 (sol)](reviews/magma-rift-r3.md) | 6.5 | 8.5 | 7.5 | no | **rift-pressure:** hot yellow ejecta packet visibly changes height (rhythm 7–9, 21–24); strongl… | e5c17b0 |
| Kinetic Rain | kinetic-rain | 3.5 | 6.5 | [r3 (sol)](reviews/kinetic-rain-r3.md) | 5.5 | 8.5 | 7.0 | no | drop-cascade: pink lamp cohorts and mirrored accents clearly visible (rhythm 8, 12, 20, 24); do… | e5c17b0 |
| Aurora Veil | aurora-veil | 4.0 | 7.0 | [r3 (sol)](reviews/aurora-veil-r3.md) | 6.5 | 8.5 | 7.0 | no | **curtain-surge:** localized pink/peach excitation and reflected colour are visible (rhythm 3, … | e5c17b0 |
| Brass Orrery | brass-orrery | 3.5 | 6.5 | [r3 (sol)](reviews/brass-orrery-r3.md) | 6.0 | 8.5 | 6.5 | no | escapement-strike: partly visible—localized pink/peach gear illumination, especially rhythm 19–… | e5c17b0 |
| Thunderhead | thunderhead | 4.5 | 7.0 | [r3 (sol)](reviews/thunderhead-r3.md) | 6.5 | 7.5 | 8.0 | no | bolt-from-the-blue: clearly visible, especially rhythm 9–10 and 17–18; fits strongly. Large pin… | e5c17b0 |
| Prism Engine | prism-engine | 4.5 | 6.5 | [r3 (sol)](reviews/prism-engine-r3.md) | 6.0 | 8.5 | 6.5 | no | spectral-relay: partly visible—pink prism edges, core flares and floor accents (rhythm 3, 8, 12… | e5c17b0 |
| Impossible Stairs | impossible-stairs | 4.0 | 7.0 | [r3 (sol)](reviews/impossible-stairs-r3.md) | 6.5 | 8.5 | 7.0 | no | **lantern-ascent:** localized tread illumination clearly visible, especially rhythm 2–3, 6, 17–… | e5c17b0 |
| Silk Storm | silk-storm | 4.5 | 7.0 | [r3 (sol)](reviews/silk-storm-r3.md) | 6.5 | 8.5 | 7.0 | no | **whip-crack:** partially visible—pink ribbon patches and changing creases, notably rhythm 7–8 … | e5c17b0 |
| Ink Bloom | ink-bloom | 3.5 | 6.0 | [r3 (opus)](reviews/ink-bloom-r3.md) | 5.5 | 7.0 | 6.0 | no | **ink-burst**: visible, yes. It shows as a large magenta patch on strip frames 15–20 (bar 2 fil… | e5c17b0 |
| Soap Cathedral | soap-cathedral | 4.5 | 6.5 | [r3 (sol)](reviews/soap-cathedral-r3.md) | 6.0 | 8.5 | 6.5 | no | **film-shimmer:** localized pink film patches clearly visible (rhythm 1, 5, 9, 17, 20); fits so… | e5c17b0 |
| Dune Sea | dune-sea | 4.0 | 6.5 | [r3 (sol)](reviews/dune-sea-r3.md) | 6.0 | 8.5 | 6.5 | no | **crest-veil:** localized pink crest patches visibly change, especially rhythm 3, 11–12, 17, 19… | e5c17b0 |
| Data Monolith | data-monolith | 4.0 | 7.0 | [r3 (sol)](reviews/data-monolith-r3.md) | 6.5 | 8.5 | 7.0 | no | **memory-rewrite:** localized pink memory-port cohorts clearly visible (rhythm 2–4, 13, 17); fi… | e5c17b0 |

## Baseline (commit 55cb7cc)

Reviewer: claude-opus-5-5 (anthropic), independent; evidence: `/Users/fabian/Development/phosphor/artifacts/look-review/baseline/` (`<id>-sheet.png` stills 1–12, `<id>-rhythm.png` frames 1–24, `grids.md`). Rubric: `docs/research/look-review-2026-10-16/RUBRIC.md` — Overall = 0.6L + 0.15G + 0.25E, rounded to 0.5; Pass = Overall ≥ 8 AND L ≥ 7.5.

| World | id | L | G | E | Overall | Pass | Main weaknesses (2–3, concrete and visual, citing still numbers) | Rhythm effect today (what is visible, if anything) |
|---|---|---|---|---|---|---|---|---|
| mycelium | mycelium | 5 | 2 | 2.5 | 4.0 | no | Grey-green plasticine terrain with no bioluminescent emission (1–6); later pale canyon walls flatten the frame into beige/grey mass (9–12); no hero network or accent, so it reads like clay rather than glowing mycelium. | Near-static; only faint whole-frame brightness wobble across frames, no discrete beat event. |
| garden | afterglow | 5 | 2 | 2 | 4.0 | no | Torus "flowers" with uniform neon outlines (failure pattern), clip-art feel (5–12); an odd vase sits on a brain-coral carpet with no depth falloff (9–12); early stills sparse and flat (1–4). | Barely anything: slight glow breathing, no per-beat bloom or cohort pulse. |
| unfolding | metamorphosis | 4 | 2 | 2 | 3.0 | no | Small centred flower on black, ≈20–30% of frame (1–8); dark, desaturated petals with weak emission; state sweep changes scale but never fills or structures the frame (9–12). | Barely visible: minor petal sway, nothing on beats. |
| hopf-bloom | fibration | 6 | 2 | 4 | 5.0 | no | Centred tube bundle with plastic, CG-default shading (5–12); object stays mid-frame with empty black margins; colour palette narrow, no foreground/background depth layers. | Best of the set: a lilac fibre cohort brightens on bar-start frames (1, 9, 17); beats in between barely differ. |
| cavern | crystal | 5 | 2 | 2 | 4.0 | no | Stills 1–4 dark and nearly empty; 9–12 overcrowded with crystals that read as plastic pencils/lightsabers with uniform glow; dotted procedural wall texture looks like a cheap tile. | Glints exist but are tiny and irregular; no visible beat accent at frame scale. |
| nebula | nebula | 5 | 2 | 2.5 | 4.0 | no | Green filament connectors look like lines on a diagram (1–5); later stills show a centred galaxy plus blurry blobs with no depth (9–12); monotone green-heavy palette. | Subtle core brightening (≈ frame 3), otherwise nothing distinguishable per beat. |
| descent | descent | 4 | 2 | 1.5 | 3.0 | no | Murky, low-contrast frames throughout (1–12) violate dark-ground/high-contrast rule; windows are muddy smears; no readable focal subject or accent colour. | Almost none; frames are near-identical apart from camera travel. |
| murmuration | murmuration | 4.5 | 2 | 2 | 3.5 | no | Flat painted sky gradient and clip-art bushes (1–12) — flat-clip-art failure; flock is a thin dark scribble lacking volume; only the falcon gives a focal point (later stills). | Flock shape drifts continuously; no beat-locked turn, burst or flash visible. |
| origami | fold | 5 | 2 | 2 | 4.0 | no | Flat grey stars and small white polyhedra on black (1–5); builds into a centred shard tornado (9–12) that is desaturated grey/white; paper never reads as folded material. | Mild glow variation only; shard motion is continuous, no beat snaps or folds. |
| attractor-ribbons | ribbons | 3.5 | 2 | 2 | 3.0 | no | Textbook failure: small centred Lorenz butterfly ≈30% of frame on black (1–12); thin uniform ribbons with no thickness/lighting; no environment or depth cues. | Ribbon tracing continues smoothly; no visible beat response. |
| horizon | horizon | 5 | 2 | 3 | 4.0 | no | Stills 1–4: one hotspot comet plus thin rings on black; accretion disk (6–12) is flat monotone lime, modestly sized and centred; no lensing/photon-ring drama at frame scale. | Jet knot and photon-ring brighten on some beats, but subtle and small on screen. |
| deep-sea | abyss | 6.5 | 2 | 2 | 4.5 | no | Stills 1–6 near-empty black with one small jelly; foreground jellies cropped awkwardly at frame edge (8–10); seabed flora are flat clip-art fans/sprigs (9–12). | None visible: jellies drift and camera pans; no beat pulse in bells, plankton or god-rays (frames 1–24). |
| liquid-chrome | ferro | 3.5 | 2 | 1.5 | 3.0 | no | Mostly black frame with a small centred spiky ball (1–12) reading as sea urchin/black plastic, not liquid chrome; reflections are sparse lime specks; thin floor ring barely visible. | Spikes jitter continuously; rhythm frames 1–24 nearly identical, slight darkening only. |
| moon-tide | tide | 4.5 | 2 | 2 | 3.5 | no | Stills 1–4 near-black empty sea with a tiny moon; later a glowing green spiral maelstrom (8–12) with uniform outline glow; the moon (key subject) disappears in later stills. | Spiral arms rotate smoothly; small warm core glint varies, not beat-locked (frames 1–24). |
| laser-grid | laser | 4.5 | 2 | 3.5 | 4.0 | no | Static wireframe outlines with no volumetric beams or haze (1–12); no dimensionality or floor reflection; mid club generic look without hero element. | Beam arrangement and fan timing change on some beats — readable but thin lines, low impact. |
| magma-rift | magma | 6.5 | 2 | 3.5 | 5.0 | no | Pink/magenta lava is the only hue — no hot white-yellow core gradient (5–12); cracked plate floor is flat Voronoi graphic; fountain centred, mountains a flat silhouette. | Ejecta arcs and spark density vary (rhythm 1–24) and yellow embers pop, but timing looks continuous rather than on-beat. |
| kinetic-rain | kinetic | 5 | 2 | 1.5 | 3.5 | no | Sculpture is mid-transition in most stills, never settling into a clean form (6–12); morphs into a ring at high energy; flat materials, empty surround. | Continuous morph hides beats; no discrete accent in frames 1–24. |
| aurora-veil | aurora | 5.5 | 2 | 2 | 4.0 | no | Stills 1–7 decent curtains but monochrome lime; 8–12 camera tilts up into a flat radial lime fan, losing horizon, ground and depth; water reflection near-black and unused. | Curtain fold shifts continuously (frames 1–24); no brightness kick or ray burst on beats. |
| brass-orrery | orrery | 4 | 2 | 2.5 | 3.5 | no | Brass renders olive-green monochrome (1–12); stills 6–8 small centred orrery on black; 9–12 cluttered greenish fog with chains and gears, muddy contrast. | Pink tint flashes on a few frames — colour-only, irregular; mechanism itself does not tick to the beat. |
| thunderhead | storm | 5 | 2 | 4 | 4.5 | no | Stills 1–5 a flat cloud loaf with a flat white disc moon; cloud cells look like cotton cut-outs (6–7); 70%+ of frame empty black ground. | Lightning flashes on rhythm frames 3, 11, 15, 19 — strong when present but not consistently on beat; only still 11 shows a bolt. |
| prism-engine | prism | 6 | 2 | 2 | 4.5 | no | Stills 1–5 one small centred prism on black (Pink Floyd cliché); 9–12 grey outline cathedral clutter with uniform edge glow; spectrum colour weak, mostly grey-white. | Central star sparkle twinkles; frames 13–24 nearly identical, no beam fire or spectrum flash per beat. |
| impossible-stairs | escher | 5.5 | 2 | 1.5 | 4.0 | no | Desaturated grey/olive flat shading, no dark ground or emission (1–7); pink walker accents tiny; spiral (9–12) graphically interesting but reads as greyscale CAD render. | Slow rotation only; frames 1–24 virtually identical. |
| silk-storm | silk | 6 | 2 | 3 | 4.5 | no | Dark navy satin strong in close-ups (3–5) but later stills muddy and underexposed (9–12); single blue hue, accent pink rarely seen; centre hole is empty black. | Pink ribbon flashes on frames 9–10, 16–17, 23–24 — visible but irregular colour pops, not beat-locked. |
| ink-bloom | ink | 4.5 | 2 | 1.5 | 3.5 | no | Rubbery blue/lime doughnuts, not ink in water (1–12); stills 1–5 dark lump centred on black; 9–12 lumpy toroids in a row with no depth or flow. | Static; frames 1–24 show only slow drift of the rings. |
| soap-cathedral | soap | 6 | 2 | 2 | 4.5 | no | Stills 1–5 single centred bubble on black with blurry green bokeh blobs; 9–12 foam fills frame but white Plateau edges glow uniformly; no cathedral light shafts or environment. | Small horizontal light streak and slight wobble; no beat pop, shimmer or bubble burst. |
| dune-sea | dunes | 5.5 | 2 | 1.5 | 4.0 | no | Moonlit dunes solid (1–5) but grey-blue monochrome with no emission; haboob (8–12) is a grey cotton wall with yellow noise; obelisks with diamond dots look clip-art. | None: frames 1–24 identical except camera drift. |
| data-monolith | voxel | 5 | 2 | 2.5 | 4.0 | no | Uniform glowing cube outlines everywhere (failure pattern), no solid faces (1–12); small monolith in still 7; dark blue-grey palette with no accent hierarchy. | Blue scan bars on frame 3 and orange window glints on frame 11 — isolated, not on every beat. |

## Ranking (weakest first)

1. liquid-chrome (3.0)
2. attractor-ribbons (3.0)
3. descent (3.0)
4. unfolding (3.0)
5. brass-orrery (3.5)
6. ink-bloom (3.5)
7. murmuration (3.5)
8. moon-tide (3.5)
9. kinetic-rain (3.5)
10. garden (4.0)
11. cavern (4.0)
12. origami (4.0)
13. laser-grid (4.0)
14. mycelium (4.0)
15. nebula (4.0)
16. data-monolith (4.0)
17. impossible-stairs (4.0)
18. dune-sea (4.0)
19. horizon (4.0)
20. aurora-veil (4.0)
21. thunderhead (4.5)
22. prism-engine (4.5)
23. soap-cathedral (4.5)
24. silk-storm (4.5)
25. deep-sea (4.5)
26. hopf-bloom (5.0)
27. magma-rift (5.0)

(Ties broken by unrounded score.) **0 / 27 pass.** No world reaches L 7.5; the best L is 6.5 (deep-sea, magma-rift).

## Cross-cutting observations

1. **The rhythm grid is the same in every world (G = 2 everywhere).** `grids.md` shows one template: slot 0 fires on every beat, slot 1 every 2 beats, slot 2 every 4 beats. Presets only change strength or halve density, and the global tracks (brightness ghosts, zoom, echo, colour) are shared. No world has its own syncopation, fills or phrase-level accents.
2. **Rhythm effects are mostly invisible at frame scale.** In 20 of 27 rhythm sheets, the 24 frames can't be told apart beyond continuous motion. Where something does show, it's colour-only or brightness-only (brass-orrery pink tint, silk-storm pink ribbons, data-monolith scan bars) or it's irregular (thunderhead lightning). Continuous morphing (kinetic-rain, aurora-veil, ink-bloom) hides beats completely.
3. **Low energy is often a small centred object on black.** Stills 1–5 are frequently ≤30% coverage: attractor-ribbons, unfolding, liquid-chrome, prism-engine, soap-cathedral, deep-sea, horizon and brass-orrery 6–8. The sparse → structured → full arc starts too sparse and too centred.
4. **Materials read as plastic, outline or clip-art rather than the claimed substance.** Examples:
   - Uniform glowing outlines: garden, data-monolith, laser-grid, soap edges, prism-engine.
   - Plastic or rubber: cavern crystals, hopf-bloom tubes, ink-bloom, liquid-chrome.
   - Flat clip-art: murmuration bushes, deep-sea flora, dune-sea obelisks.
5. **Monotone or desaturated palettes with no accent hierarchy.** Examples:
   - Lime/green: horizon, moon-tide, aurora-veil, nebula, brass-orrery (olive).
   - Grey: impossible-stairs, dune-sea, origami, descent.
   - Single-hue: magma-rift (magenta), silk-storm (navy).

   Few worlds have a hot core plus a ≤10% accent as STYLE.md asks.
6. **Late states lose the key subject or the depth.** The moon-tide moon disappears. Aurora-veil tilts into a flat radial fan with no horizon (8–12). Thunderhead and dune-sea leave large empty ground. The full-energy states rarely add ≥3 depth cues.

