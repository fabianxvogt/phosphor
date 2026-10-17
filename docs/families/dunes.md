# Dune Sea · Dünenmeer (#114)

`scene-dunes.mjs`, world **dune-sea**. One persistent night desert develops through **Ripples → Dunes → Storm** (seed 11401). All eight preset names, seeds, schema keys, state/look IDs and rhythm IDs remain unchanged. R4 by **openai-codex/gpt-6.1-sol** responds to the independent r3 review (L6 / G8.5 / E6.5), replacing the floating cloud skin and surface-painted signature rather than adding glow.

## Terrain and sand

A continuous foreground brink follows `c(z)=−2+4.8sin(.065z)+1.2sin(.13z)`. Its windward profile is `3.4 max(0,1−((x−c)/9)²)²`, with a 34° lee. R4 retains 65% of this leading ridge at maturity rather than removing it, keeping connected foreground sand throughout the arc. An analytic polynomial smooth maximum of width .8 joins it to the seeded dune field; gradients use the same blend. This removes interpenetrating knife seams. The height bound includes the smooth maximum's maximum .2 overshoot.

Seeded barchans use `v=x/11`, crest `−3+13v²`, cap `h max(0,(1−v²)(1+.6v²))`, and a 34° slip face. Persistent crossed arms form star dunes. Fixed staggered 28×32 m sites supply rotation, scale and identity. The compact-support shoulder now tapers over 9 m instead of 2.5 m, avoiding extremely steep artificial tile-edge folds. Analytic derivatives include chart rotation, compact support and ridge joining. No development-driven reseeding occurs.

Wind ripples remain shading, not geometric silhouette combs. The opening retains its bent asymmetric chart and Gaussian pixel integration; the second harmonic receives the fundamental filter's fourth power. Mature slopes use a cheaper bent ripple chart rather than losing all ripples. Footprint-filtered granule normals/albedo, reduced mineral hotspots, restrained crest scattering and softer lee fill replace the glossy smooth faces. The low moon, stable horizon, blue terrain and dark environment remain. The mature camera rises only to approximately 9–11 m rather than 14–17 m, retaining foreground scale.

Saltation retains ballistic flight `T=2v₀/g`, `x=UTa`, `y=v₀Ta(1−a)`, with **g=9.81** and seeded launch identities. Energy changes grain population, integrated wind speed and lifted-sheet height, not master brightness.

## Ground-connected storm and stones

The r3 exact ellipsoid skin and black opaque base are removed. Six bounded Beer–Lambert samples integrate a continuous heterogeneous dust bank. Its windward nose curls back with height, two transported noise scales vary density and the ragged upper extent, and an exponential low dust layer reaches the ground ahead of the body. Opaque terrain and stone depth terminate integration. Far scenery is extinguished into dust instead of remaining visible under a floating sausage. This economical bank is not a fluid simulation; its wisps remain visibly approximate.

Five obelisks have independent orientations, staggered depth and heights. Their bases extend 2 m beneath the local heightfield. Contact-darkened sand, buried-base shading, side-plane fill, eroded stone variation and atmospheric recession attach them to the landscape. Individually attenuated, interrupted incisions replace uniformly bright rune stencils. The central stone is 27 m at full development. All colours derive from palette uniforms and black/white mixes.

## Signature rhythm: Crest veil / Kammschleier

Slot 3 is now an actual thin curved sheet of airborne grains, **not a tint on terrain hits**. Fifteen exact vertices form sixteen ray-intersected triangles above a selected segment of the persistent brink. The sheet has at least .75 m of crest-to-air clearance, curls above the crest, spreads downwind, and fades along its tail and ends. Closest-hit selection prevents doubled opacity at diagonals. Terrain and obelisks occlude it. Grain detail is footprint attenuated; wisps use smooth density rather than hard camouflage holes.

The scheduler's `.w` envelope controls opacity/lift, `.w` hit supplies a bounded attack, and `.w` count selects the crest segment. Muting the track suppresses the sheet. Three integrated 2π clocks own wind, camera and dust; both data and picture passes use the late clock variant. No limiter changes or full-screen white.

The three preserved presets are **Leeward hush**, **Saltation trails**, and **Haboob drums**, with **2.5 / 7.5 / 12.3 hits per bar**. Slot 0 supplies grain runs, slot 1 slipface packets, slot 2 a rare localized gust inside the dust bank. Existing five-beat accented grain figures and off-beats remain. Crest-veil steps (one-based): restrained 14/31 over four bars; driving 1/8/17/27 over two bars; accented 1/7/15/24/33/40/49/59 over four bars.

## Looks and continuity

| Look                               | Development | Character                                            |
| ---------------------------------- | ----------: | ---------------------------------------------------- |
| Ripples / Sandrippeln              |           0 | Winding foreground brink and filtered fine sand      |
| Dunes / Dünen                      |           1 | Persistent ridge joins the crescent field            |
| Storm / Sturm                      |           2 | Dust recession, buried stones and lifted grain sheet |
| Silver Silt / Silbersand           |         .15 | Quiet wind and stronger ripple relief                |
| Crescent Caravan / Sichelkarawane  |           1 | Taller dunes and reverse drift                       |
| Star Sands / Sternensand           |        1.15 | Higher moon and crossed arms                         |
| Buried Temple / Versunkener Tempel |        1.85 | Low relief and viewpoint                             |
| Night Front / Nachtfront           |           2 | Dense dust and stronger wind                         |

Reversal uses the same chart and clocks. Portrait retains the central stone and foreground ridge; the off-axis moon can leave narrow framing. Metadata definitions are unchanged, so no HISTORY migration is required.

## Cost and verification (r4)

Full-resolution analytic rendering: 28 capped terrain advances, four local refinements, eight guaranteed-ground bracket refinements, five shadow samples, two quiet saltation strata, six dust samples and sixteen signature triangles behind a conservative spatial bound. The **128×137 RGBA32F** data pass stores exact noise corners, dune transforms and fifteen current airborne vertices. It is not a colour image or a sampled terrain cache. All data have analytic fallbacks; the former cloud-record row is repurposed for sheet vertices.

Native ANGLE Metal / Apple M3 Pro throughput, 24 samples/state, including post but excluding asynchronous approval:

| State   | 1080p p50 / p95 ms | 4K p50 / p95 ms | ABBA main-relative p50 delta |
| ------- | -----------------: | --------------: | ---------------------------: |
| Ripples |          4.5 / 4.6 |     20.3 / 21.4 |                       +25.7% |
| Dunes   |          4.8 / 5.3 |     20.9 / 21.2 |                       +38.7% |
| Storm   |          7.6 / 7.9 |     26.5 / 26.9 |                       +66.7% |

**1080p meets 8 ms; 4K misses 16 ms. The relative regression gate is also missed.** Concurrent GPU load affects absolutes, but does not excuse the pair regression. The replacement volume and retained ridge cost more than the former skin. Two `--reference main` delivery attempts timed out after concurrent main advanced; the completed delivery pair pins the merged main revision **6a65394**, whose `scene-dunes.mjs` is identical to current main. Raw evidence: `artifacts/verification/r4-{perf1080-delivery,perf4k-delivery,pair-pinned}`.

`tests/dunes.test.mjs` covers repose, ballistic physics, analytic normals, smooth joins, bounds, reversible identity, cached layout/fallback, detached-sheet clearance, density/depth constraints, all presets, clocks and four-track grid density. Full suite: 1031 passed, 22 skipped, zero failures; typecheck and DE/EN pass. Native limiter-enabled verification covers 81 three-palette energy/reversal frames, 54 portrait frames at 43,200 s, and six analytic-fallback frames: zero GL/GPU/non-finite errors and no empty frames. Final run logs and screenshots are under `artifacts/verification/dune-sea-r4*-delivery`.

Five intermediate capture directories plus delivery iterations were read as sheets and large stills. Final independent-review evidence: **`artifacts/look-review/dune-sea-r4/`** (film, twelve-state sheet, rhythm sheet, large event/peak stills, grids). These deterministic films are not photosafety certification. The shared limiter remains untouched.

**Self-assessment: L≈7.5, not independently accepted at 8.** The replacement fixes the worst cotton-wall failure and makes the signature genuinely airborne. Remaining risks: the bank can read as soft flowing fog, small crescent horns remain sculptural, and the lifted sheet can still resemble translucent cloth in a still. Performance at 4K is an explicit unresolved miss.
