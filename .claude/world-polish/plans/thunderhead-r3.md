# Thunderhead (storm, #107) — round-3 plan

Lane: lane-thunderhead · worktree `.claude/worktrees/thunderhead-r3` · branch `r3/thunderhead` · ports 48400–48409.
Evidence (worktree-relative): main baseline `artifacts/look-review/thunderhead-r3-before/`, round-2 WIP filmed on this branch `artifacts/look-review/thunderhead-r2wip/` (+ stills `st/t*.png`).

## Decision: start from the round-2 WIP

`polish2/thunderhead` (81c2ff9) was never merged. Filmed with the round-3 capture it is clearly better than main (sky, moon, lake, graphic bolts with mirrored reflections, warm base, coloured flashes), tests pass (25/25). Adopted wholesale as commit 1 on `r3/thunderhead` (storm sources, model, tests, catalog description + DE/EN). Its uncommitted storm.md text (in the r2 worktree, read-only) is folded into the round-3 doc. Cost: pair probe vs main +24 % (Supercell) … +56 % (Towers) at 1080p, i.e. ≈ 19–20 ms Supercell 4K if main's 15.8 ms holds — must be paid back.

## Honest score now

Main: **5.5** (grey cloud on black, baseline sheet). Round-2 WIP: **≈ 6.5** (my harsh read). Things a demanding club audience would find weak in the WIP:

1. **Lake artefacts.** The storm reflection carries a diagonal hatch (static IGN dither on the one-sample reflection) and the moon glitter is a stack of blocky, stair-stepped bars (anisotropic value-noise normals). It reads as a rendering bug at the bottom of every frame (`st/t2.png`, `st/t12.png`).
2. **The plain is a black strip with green dashes** between ridge and lake: no depth, no scale; town lights read as stray pixels, not towns.
3. **Polka-dot towers.** In Towers a flashed tower shows round dark "craters" (lobe carve crevice term `0.22+lobe` on a regular cellular field) — material reads as foam/sponge (`st/t12.png`).
4. **Pink everything.** Flash light is `mix(white,accent,0.65)` so every discharge turns the whole storm accent pink; the accent is no longer rare and there is nothing left to escalate to.
5. **Supercell composition.** Storm ≈ 60 % width, floating with an empty dark upper-left; moon hidden behind the anvil; quiet bars are uniform navy.
6. **Crawlers barely read** (rhythm y): thin occluded lines under the anvil.

The "film it on a phone" moment: a huge forked bolt tearing out of the anvil into the lake in front of the storm, cloud flaring accent from inside, the bolt doubled in the black water.

## Changes (priority order)

1. **Lake:** drop the dither (sample at a fixed chord fraction; smoother `exp` absorption); ripple normals from smooth analytic swell + one isotropic noise octave with resolution-aware fade; moon glitter as a soft vertical column (anisotropic Gaussian in reflected-angle space) broken by sparkle, not blocky bars.
2. **Plain/shore:** mist band over the far plain (palette secondary, lit by aureole), warm town glow pools bigger and softer, lamps as clusters; ridge with a lighter top edge (moon rim). No more black strip.
3. **Tower material:** weaker, smoother crevice term (no dark rings), lobe field domain-warped; flash light keeps form via the lattice irradiance gradient.
4. **Colour grammar:** ordinary flashes `mix(white-blue, accent, ~0.3)`; full accent reserved for the signature strike. Quiet bars: brighter moonlit anvil top/silver lining, warm base.
5. **Composition:** Supercell slightly closer/wider (fill 70–80 %), moon kept beside the anvil edge.
6. **Crawlers:** brighter, wider glow under the anvil, less occlusion (they sit just under the anvil base).

## Signature rhythm effect (slot 3, `familyEffect`)

**"Bolt from the blue" / "Blitz aus heiterem Himmel"** — on the accent hits, a giant positive strike leaves the anvil (towers/bank in lower states), runs out through clear air and lands in the lake in front of the storm: thick white core with a full accent halo, every branch on, attachment flash and splash of light on the water, the bolt mirrored in the lake, the storm interior flaring accent from that side. Implementation: drives the existing ground-strike event slot 1 (autonomous storm life) while its envelope is active (`u_rhythm.w`, `u_rhythmHit.w`, `u_rhythmCount.w`), with its own site (always clear air, near the camera) and drawing gain, so no extra channel storage or tile masks are needed. Styles: restrained (bar 4 accent of a 4-bar phrase + one anticipation), driving (beat 4 "and" every 2 bars + a fill), accented (syncopated pairs on accents). ≥ 2 hits per preset.

Existing gestures: raise authored strengths and shader gain so each reads at energy 0.85 (buried discharge lights a whole cell clearly; crawler visible as spider under the anvil; stepped return as now). Presets from main's "World rhythm presets" commit once it lands (merge main first).

## Cost risks

Biggest risk is 4K. Plan: profile cost centres (march, lake reflection sample, bolt loop, rain) with pair probes; candidates: cap interior steps by `u_raySteps` more tightly at high resolution, reflection sample only when lake pixel, skip sky stars/cirrus under opaque cloud. The signature effect adds no new loops (reuses slot 1). Engine render-scale for 4K would be the real fix (engine change → report to L0, not done here).

## r4

Independent r3 review: L 6.5 / G 7.5 / E 8, Overall 7. Clean worktree preserved; merged main (fast-forward). Priority responses before implementation:

1. Replace tyre grooves with angularly broken, low-frequency turbulent lobes; restore erosion to the mesocyclone and give its thermal bubbles volume. Reduce anvil vertical texture anisotropy and soften/shear its edge instead of outlining a saucer.
2. Widen overlapping towers and make the existing common shelf a continuous irregular bank, joining the left puff and central cells without filling all shadow cavities.
3. Shorten discharge irradiance falloff and confine signature accent tint to a neighbourhood of its channel. Distant lobes keep moonlit blue even during a signature event; preserve white-hot branching bolt cores and lake endpoints.
4. Widen peak camera FOV slightly with unchanged continuous path, leaving air beyond the anvil tip and space for the lake.

Keep moon halo, sky/cirrus, low horizon, rippled water, dark pauses, four distinct discharge gestures and persistent Haze → Towers → Supercell silhouette. Raise accented grid to ≥8 hits/bar; give buried flashes a six-beat polyrhythmic loop, keeping structural strikes sparse. Film three actual change/capture/read/critique rounds. Family-specific `scene-storm-data.mjs` and `scene-storm-volume.mjs` are the existing shader helpers of this scene; edits remain confined to this family (no shared renderer change). CPU carrier reference follows geometry changes. Risk: richer overlap increases march occupancy; do not add optical taps or loops.

### Film rounds

- **A** (`thunderhead-r4-a`, both sheets read): tower gaps and pink blanket fixed; tip has air. Still sculpted, with two broad coherent grooves and saucer rim. Rejected as below 8. Remove periodic radius entirely, randomize thermal heights/radii, reintroduce turbulent erosion and break anvil thickness with noise.
- **B** (`thunderhead-r4-b`, both sheets read): connected bank and localized light hold up, but updraft is still too smooth and anvil lip too continuous. Increase true 3D radial turbulence (not extra surface engraving), erode/fray the thin ice edge. Rhythm gate caps slots 0–2 at two hits/bar, so meet density with six-beat buried figures plus two signature strikes/bar rather than breaking the shared test.

- **C** (`thunderhead-r4-c`, both sheets read): new grid gives clearly repeated strike/decay pairs; blue shadows survive pink strikes. Material still too smooth at the centre, so enlarge surface billow scale and use its actual gradient to shade cavities.
- **D** (`thunderhead-r4-d`, both sheets plus full-size peak read): surface shading alone is almost invisible in the review sheet. Increase _volumetric_ billow erosion 2.5 → 4.0; keep the shape and scalar skip conservative (2.8 margin).
- **E** (`thunderhead-r4-e`, both sheets read): torn wisps, broken anvil rim and overlapping turbulent volumes now replace smooth bands. No isolated tower slots; accent remains on the struck side. Peak has visible sky beyond the tip. Some smooth dark central mass remains, but further high-frequency carving risks foam/noise. Native bounds scan caught low-height Haze erosion outside the old clip box; raise conservative headroom 2.8 → 4.5 before final recapture. Identity/state definitions and presets remain unchanged. Additional native checks found square/portrait cover-cropping: aspect-aware FOV now fits the whole cloud. A second bounds failure revealed that the common bank's scaled ellipse was not a world-distance field; normalize by its gradient, widen conservative horizontal margins and account for its derivative in the skip bound. The verifier now reduces every voxel to exact occupied-node extrema in-browser before independent CPU bounds comparison, avoiding enormous JSON transfers without dropping node/non-finite checks.

## Outcome (round 3, commit 8fec8b9 on r3/thunderhead)

Done: colour grammar (cold flashes, accent reserved for the signature), analytic lake swell + undithered soft reflection + glint after the reflected storm, plain mist, lamps fade into town glow, softer crevices, supercell closer and panned (centred, ≈ 70 % width), crawler gain 1.3, slot-3 signature "Bolt from the blue" (drives discharge slot 1, `stSig` in state texel 133/1), storm-box headroom fix (verify-storm bounds). Slot 1 relabelled "Anvil crawler" (id kept).
Not done: cost payback (pair vs main still +33…62 %, ≈ 3 ms is the voxel pass inherited from round 2; probes of bubble cull / fewer detailed light taps showed no measurable gain under 5-lane GPU contention); quiet-bar silver-lining boost; plain still thin. Self-assessment ≈ 7.

## r5

Independent r4 review: L 7.0 / G 8.5 / E 8.0, Overall 7.5 (fail). Plus a **performance blocker**: serialized native 1080p Supercell sync p50 9.5 ms at 63806f5 (> 8). Worktree recreated from `r3/thunderhead` (clean, already in main), `git merge main` fast-forwarded to d24d3a2 (capture v2). Rhythm presets, slot ids/labels, state names/presets/seeds and the world entry are unchanged (no HISTORY entry needed).

### Performance (structural, measured before any look change)

Interleaved pair probes (stubbed passes, `git stash create` A/B refs) split Supercell ≈ 2.5 ms fixed/post, ≈ 2.8 ms lattice pass, ≈ 3.3 ms visual pass. A step-count heat map showed sky rays beside the storm walking 30–44 empty steps through the conservative shell. Changes:

1. **Lattice 128×80×64 → 128×64×48** (−40 % nodes; atlas 1024×675 → 1024×419). y stays finer than x, z (depth) is least visible. −1.0…−1.1 ms.
2. **Per-part cull**: nodes > 1.2 outside every tower/bank/anvil box store the box distance and skip events, bubbles and transport (CPU-mirrored `partsDistance`, test proves no potentially cloudy point is culled). Thermal bubbles are set up only for near nodes (not for every cache texel). Lean events (no frame vectors) for nodes; dark slots skip their site.
3. **Relaxed empty-space stepping** (3× the strict skip, larger floor) with a three-step entry bisection; skip margin follows the local erosion amplitude instead of the global 2.8.
No limiter, governor, render-scale or budget change. 4K remains a miss and is labelled so.

### Must-fix answers

1. **Atmospheric, not sculpted.** MATERIAL: moonlight optical depth gains a drifting *fragment shadow* field constant along the moon ray (upstream torn cloud shading the storm), so only some rims/crowns catch silver light; powder floor 0.45 → 0.22 so the thinnest periphery no longer glows as an outline; aerial perspective sinks far lobes into night air; town light on the base 0.12 → 0.075 (no ochre shelf). FRAMING: a low outflow-mist band on the far shore dissolves base, rain feet and plain into the horizon, mirrored in the lake; rain curtains get ragged virga tops instead of a flat lid. CAUSAL: every return stroke (broad term) lights that mist from inside on its step.
2. **Quiet composition.** MATERIAL: lake chop doubled at low energy and ripples reflect the far mist band → perspective-scaled lines of light across the formerly black lower half. FRAMING: Haze height hierarchy — one dominant tower, a deep opening under the moon (stHT 0,3,1.6,3.4,0.4 → 0.8,4.6,1.8,−0.8,0.6); camera target slightly higher (horizon lower, deeper sky); distant rain veils now hang under the quiet bank too (rain × mix(0.55,1,rise)). CAUSAL: buried discharges on the six-beat figure light single cells while the dark opening stays dark.
3. **Signature light/silhouette.** MATERIAL: finer white-hot core with accent fringe (halo gain 1+1.5k → 1+0.6k, pink glow 0.6 → 0.3), trunks taper 1.15 → 0.7 toward the tip and branches 0.62 → 0.25; interior accent radius ×3 tighter and only while the channel carries light. FRAMING: the bolt leaves the anvil's outer top further out and runs a hooked arc — sideways through clear air first, then plunging — with shortened side branches. CAUSAL: on each slot-3 step the leader hooks out, the return stroke flares the cloud only around its root, then its attachment point flares the shore mist and streaks the water.
4. **Backdrop smears.** MATERIAL: the single anisotropic (0.55×1.7) cirrus deck becomes two domain-warped, nearly isotropic decks at 24 and 46 units with opposite drift (parallax), fading out by 0.08–0.42 elevation and with distance; flash lighting of cirrus halved, so flashes no longer light parallel bars.

### Film rounds

- **r5-1** (perf package only): identical look, no artefacts.
- **r5-2**: lake-landing + hooked signature with full branches → branches sprawled across the whole sky, landing too close to camera; splash ring read as a pink dot. Rejected: back to shore landing, branches ×0.55, hook mix 0.65, ring removed.
- **r5-3**: finer pink bolts, local interior accent; Haze too murky (shadow field too strong) → 3.2 → 2.4, phase g back to 0.68.
- **r5-4**: coarser lattice invisible at sheet and full-frame scale; rain columns showed flat lit lids under the base → ragged virga.
- **r5-5**: anvil right edge still a blue outline in the held strip → diagnostic stills (moon term off) prove it is the silver lining → powder floor and denser fragment shadows.
- **r5 final** (`thunderhead-r5`): anvil rim thinner and broken; signature finer; Haze still the weakest state (dark bank, ripples now carry the lower half).

### Outcome (commit 5c537a1 on r3/thunderhead)

Same-session native profile main → r5 at 1080p: 7.3/8.5/9.3 → 5.6/6.7/7.4 ms (standalone 4.9/5.7/6.5); pair vs main −16/−20/−18 % (4K −7/−14/−13 %). 4K Towers/Supercell 17.8/19.0 ms still miss. verify-storm, npm test, typecheck, flash, native i18n pass. Self-assessment ≈ 7.5 (not ≥ 8): Haze remains a dark loaf above a quiet lake; mist band subtle at sheet scale; hook of the signature arc only moderately readable.
