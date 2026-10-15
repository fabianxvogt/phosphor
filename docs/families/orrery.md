# Brass Orrery / Messing-Orrery

**INCREMENTAL / EMPIRICAL**, round-two revision, 2026-10-15. Family **109**, renderer `orrery`, world `brass-orrery`. Gears / Zahnräder → Orrery → Clockwork / Uhrwerk. No engine changes. All look IDs, names, seeds, schema keys and world metadata remain unchanged.

## Signature mathematics

Real extruded **involute profiles**, with common module `m = 0.05`, pressure angle `α = 20°` and integer tooth counts 56/24/40:

- Pitch radius `r = mN/2`, base radius `rb = r cos α`.
- Involute `I(t) = rb(cos t + t sin t, sin t − t cos t)`.
- Flank half-angle `π/(2N) + tan α − α − inv(R)`, where `inv(R) = sqrt((R/rb)² − 1) − atan(sqrt((R/rb)² − 1))`.
- Addendum `r + m`, dedendum `r − 1.25m`; start the flank at `max(rb, dedendum)`.

Each train is a nine-gear tree: one 56-tooth driver, four 24-tooth intermediates, four 40-tooth followers. Pitch-centre distance is `rp + rc`; signed angular ratio is `ωc = −ωp Np/Nc`, so `ωp rp + ωc rc = 0`. Tooth-to-gap phase is solved on each contact line. There are **25 seed-persistent trains, 225 gears and 200 meshes**. Entire trains transform rigidly and scale uniformly through development; no kick perturbs a meshing shaft.

Five planetary shafts have exact ratios **1:2:3:4:6**, radii `1.3 + 0.49i` and independently inclined planes. A shared drive period **30π** completes integer turns for every gear and planet. This is an authored astronomical clock, not a Solar System ephemeris or contact-dynamics solver.

`orrery-model.mjs` contains CPU references for profiles, bevels, train/camera placement, world-space planetary centres, light falloff and sphere eclipses. The final bevel uses one **shared mitered offset vertex** at each outline corner, width 0.008, capped at twice that width. The former 0.028–0.038 segment-local bevel exceeded half a narrow tooth tip and produced folded, spiky faces; the new regression checks every nonadjacent inset edge for crossing.

## Continuous composition

All three states retain seed **10901** and identical non-development parameters. Development 0–2 is reversible geometry and a continuous camera path, never a state dissolve or rebuild.

| State | Composition |
| --- | --- |
| Gears / Zahnräder | The camera is inside layered trains: a close oblique main mechanism, large cropped peripheral teeth in front, and smaller trains behind. Geometry is 0.52 units thick, with raised bearing lips, real spoke apertures, machined faces and closed inner/rear faces on the near hero. |
| Orrery | The camera withdraws to reveal a roughly 60–75%-short-side centrepiece: three crossed, substantial armillary meridians, five polished spheres on rigid arms, faint luminous orbit rings and a glowing sun. |
| Clockwork / Uhrwerk | The camera advances into inward-facing gear walls and a gear-covered roof. Eight receding bays have double vault ribs, wall carriers, diagonal trusses, ceiling coffers and long shafts. Hanging chains flank a monumental swinging pendulum; the same orrery remains down the nave. |

Two near peripheral trains slide back as the armillary develops, then the enclosing banks unfold and grow. Trains are already visible in state 0 rather than materializing only at the climax. The camera is roll-free and closed, with a safe central flight corridor; near and far machinery have strong parallax. Kick focal punch remains bounded at **1.8%**. Short-side projection works in portrait; foreground gear cropping is intentional, not a cropped central orrery.

## Metal, sun and atmosphere

Palette secondary/primary mixtures define the alloy; directional environment cards, narrow specular strips and dark empty reflection directions define its polish. Symbiosis and Copper produce warm brass/bronze; default Phosphor and Glacier intentionally remain cool metal. There are no fixed metal RGB values. Filtered machining normals, recessed bearing-seat darkening, raised lips and depth-tested overlap replace uniformly lit cut-out faces.

The sun is both emissive geometry and a **local point light**: irradiance `5 / (0.7 + distance²)`, normal incidence, specular response and five bounded analytic soft planet eclipses. The eclipse centres follow the actual growing, inclined planet geometry. The core exceeds 1.0 on the float path. Orbit arcs are faint secondary emission; accent remains reserved for bounded tooth gestures. Shadows are planet-to-metal analytic occlusion, not a full inter-gear shadow map.

Exponential palette fog separates receding banks. Closed-form raking shafts, dark tiled flooring and a dim depth-tested reflection of only the hero ground the cathedral. The environment reflection is analytic, not a reflection of every neighboring gear.

## Eight stable looks

Gears, Orrery, Clockwork; Watchmaker / Uhrmacher; Copernican Night / Kopernikanische Nacht; Silver Escapement / Silberhemmung; Sidereal Vault / Sterngewölbe; Midnight Calibre / Mitternachtskaliber. Preset definitions and seeds are unchanged from the first committed version.

## Energy, rhythm and endlessness

Energy changes integrated drive/camera rates, not global brightness. Drive and camera clocks wrap at 30π and 2π respectively. New phase expressions are exact multiples of those periods, including the pendulum's 12× drive. No simulation can stall, saturate or die.

Three existing `familyEffect` tracks remain:

1. **Escapement tick**, 4 beats: bounded anchor/giant-pendulum rock plus local tooth-rim light. Only `kind == 3` rocks; static ribs and meridians do not.
2. **Ratio cohort**, 8 beats: a persistent shaft cohort catches a local glint.
3. **Clockwork wave**, 16 beats: a bounded radial tooth-light wave.

## Measured cost

Final mesh: **1,966,938 vertices / 655,646 triangles / 133,751,784 uploaded bytes**. Seed-only construction uses one bounded **128 MiB** typed allocation; the final vertex range fits it. No new engine resources or passes.

Native headless Chrome / ANGLE Metal / Apple M3 Pro, energy 0.95, post included. Baseline: prior commit `7726206`, 12 samples; final: 24 samples. The round-two assignment retains the new-world **8 ms / 16 ms p50** limits, met in every state.

| State | 1080p baseline → final p50 | Final p95 | 4K baseline → final p50 | Final p95 |
| --- | --- | --- | --- | --- |
| Gears | 3.1 → 4.1 ms | 5.0 ms | 5.6 → 6.7 ms | 7.0 ms |
| Orrery | 3.2 → 3.4 ms | 3.6 ms | 5.4 → 7.1 ms | 7.7 ms |
| Clockwork | 3.5 → 4.4 ms | 4.8 ms | 7.9 → 9.1 ms | 9.9 ms |

Shared-machine timings fluctuate. One 1080p run measured **7.9 / 8.4 / 10.5 ms**, exceeding budget; the immediately following 4K run was only 6.7 / 7.1 / 9.1 ms, and a repeat 1080p run gave the table above. That anomalous run is retained as `round2-perf1080-contention/profile.json`, not discarded. An earlier final run measured 4.4 / 4.2 / 4.6 ms at 1080p. The table reports the last complete resolution runs, not the fastest samples. Budget compliance is established by those runs, not guaranteed during concurrent fleet GPU load. These are synchronous throughput measurements, not venue cadence qualification.

## Verification and visual review

- Focused CPU/time suite: **19 pass, 1 opt-in skip**; with native GPU enabled: **20/20 pass**.
- Added regression coverage for noncrossing shared bevels, exact inclined planet centres, softened inverse-square falloff and front/behind/partial eclipses. Existing tests cover every gear mesh over development/drive, ratios, identity, reversal, camera continuity and preset validation.
- Native GPU matrix: 3 states × 3 palettes × landscape/portrait/4K at energy 0.1 and time 43,200. No GL errors, non-finite uploads or black frames. Paused 0.73 → 1.97 → 0.73 remains pixel-identical with the same mesh object.
- Native wrap/rate audit: no seams at 3600, 4096 or 43,200 seconds, nor phase-jump growth under two-hour rate changes.
- Typecheck, build and native DE/EN i18n workflows pass.
- Full suite: **741 pass, 10 skip, 3 expected catalog-preview/curation failures**. Protected preview/editorial files are unchanged.
- Filmed Liquid Chrome beside the prior version, then **five filmed improvement rounds**: close metal/layering; crossed armillary planes and foreground trains; enclosing cathedral/forward flight; atmosphere, bearing contact and stilt removal; final shared-bevel repair. Reviewed full-size stills, three final palette films, the Glacier extra-look film, portrait/4K images and all eight energy ladders.

The first version's 9/10 self-rating was not justified. Against the Liquid Chrome reference, the new result is an honest **8/10**: vastly stronger space, framing and metal, but less cinematic/refined than the reference. Remaining weaknesses are dense high-frequency distant teeth, schematic straight arms, analytic rather than scene-derived reflections/occlusion, and a substantial vertex buffer. No claim of 9/10 acceptance or venue qualification.

Evidence is under `artifacts/orrery/round2-*` (ignored symlink to this lane's absolute output evidence directory). The fleet report records the final commit, exact paths and per-round comparisons. Superseded intermediate videos are deleted; their contact strips remain, alongside baseline, reference and final films.
