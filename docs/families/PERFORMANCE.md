# Family performance measurements — 12 October 2026

**INCREMENTAL / EMPIRICAL.** Fourth performance pass, compared with scene shaders at `074d8b4`. All **39 renderers / 178 declared variants** were measured again at 4K and 1080p. Both versions use the same fixed runtime at `675d977` plus the scoped changes. The [third-pass report](https://github.com/fabianxvogt/phosphor/blob/074d8b4/docs/families/PERFORMANCE.md) preserves the earlier measurements.

Hardware: ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version), Chrome 155.0.8059.39. Each full-sweep variant uses the median of 20 synchronously completed frames after warm-up, energy 0.95 and full physical output resolution. Simulation and post-processing are included. A one-pixel read forces GPU completion; asynchronous flash approval is disabled. These are local throughput measurements, **not display cadence or venue acceptance**. GPU/system load varies; the alternating comparisons below better separate the retained changes from sequential load drift.

## Retained changes

- **Cathedral:** calculate the crystal rotation, branch centers, radii and branch rotations once per visual draw in a 9×1 RGBA32F data texture. It decodes the original packed simulation state and uses the original formulas. Ray steps, normals, ambient occlusion and geometry are unchanged. The measurable gain is concentrated in the crystal look.
- **Flight:** stop the recursive cross search when its current minimum is already at or below the lower bound of every remaining level. The first material winner is retained on ties. No ray budget or fractal detail is reduced.
- **Fourspace:** cache projected vertices, edge endpoints, palette colors and depths in a 96×3 RGBA32F data texture. A compact ordered loop replaces the large unrolled edge shader. All 32/24/96/72 edges, infinite halos and vertex glints retain their original distance and composition arithmetic.
- The data textures refresh during paused edits, follow slot disposal/context recovery and retain the original no-float-target shader fallback. Every output pixel is shaded at native resolution. Simulation sizes, presets and visual controls are unchanged.

## Alternating 4K confirmation

One browser/engine alternates baseline and optimized draw order with identical simulation state, uniforms and input picture history within each pair. Forty samples per version measure **draw plus post-processing**, including the data pass but **excluding simulation advancement**. These absolute values are not comparable to completed-frame values in the next section.

| Representative look | Before, draw + post ms | After, draw + post ms | Less time |
| --- | ---: | ---: | ---: |
| Prismatic Nave | 35.5 | 35.3 | 1% |
| Opal Reliquary | 52.7 | 49.6 | 6% |
| Midnight Rose | 25.5 | 24.4 | 4% |
| Enamel Glide | 47.2 | 46.2 | 2% |
| Long Corridor | 30.6 | 27.5 | 10% |
| Corkscrew | 46.3 | 40.2 | 13% |
| Mine Shaft | 28.6 | 26.0 | 9% |
| Narrows | 26.8 | 25.9 | 3% |
| Turning Tesseract | 23.5 | 16.2 | 31% |
| Sixteen Cell | 26.7 | 13.0 | 51% |
| Twenty-four Cell | 53.9 | 31.6 | 41% |
| Duoprism Torus | 50.8 | 25.3 | 50% |

Dense Fourspace improved by **41–50%**, Flight by **3–13%** across its paths, and Cathedral's crystal look by **6%**. Small differences in unchanged Cathedral paths are measurement noise, not evidence of broader Cathedral acceleration. An earlier alternating run also measured the crystal look at 76.0 → 68.6 ms and the two dense Fourspace shapes at 65.5 → 37.1 and 65.9 → 31.7 ms under heavier load.

The unchanged tilings serve as a control in the same final probe:

| Unchanged look | Before, draw + post ms | After, draw + post ms |
| --- | ---: | ---: |
| Penrose Rhombs | 21.1 | 21.1 |
| Ammann–Beenker | 13.1 | 13.6 |
| Heptagonal Lace | 50.9 | 50.6 |
| Dodecagonal Star | 34.3 | 33.7 |

## All families

The table reports each family's slowest declared variant. At 4K, variants above 16.67 ms were **29 → 27**, and above 33.34 ms **6 → 5**. All **178/178** optimized 1080p medians were below 16.67 ms. These count changes include system-load variation in unchanged families and must not all be attributed to the edits.

| Family | Before, 4K ms | After, 4K ms | After, 1080p ms |
| --- | ---: | ---: | ---: |
| Acid Mycelium | 6.0 | 5.6 | 2.1 |
| Magnetic Choir | 5.9 | 5.5 | 1.8 |
| Cathedrals of Error | 51.3 | 48.9 | 11.2 |
| Alien Aquarium | 5.5 | 5.3 | 1.8 |
| Causal Tapestry | 6.0 | 6.5 | 2.0 |
| Feedback Chapel | 5.5 | 6.5 | 1.9 |
| Interference Rituals | 16.5 | 10.3 | 2.4 |
| Topological Melt | 6.7 | 7.3 | 2.1 |
| Phase Transition Theatre | 9.0 | 7.1 | 2.0 |
| Evolution Garden | 7.4 | 6.8 | 2.0 |
| Pulse Geometry | 5.2 | 5.5 | 1.6 |
| Fractal Flight | 42.0 | 38.4 | 8.0 |
| Light Beams | 12.6 | 14.3 | 3.0 |
| Julia Observatory | 13.3 | 14.0 | 3.3 |
| Fourth Dimension | 45.3 | 25.0 | 6.1 |
| Hyperbolic Loom | 4.7 | 4.7 | 1.7 |
| Particle Swarm | 9.0 | 9.8 | 5.7 |
| Game of Life | 11.9 | 12.1 | 3.2 |
| Strange Attractors | 7.6 | 6.1 | 2.2 |
| Mandelbrot Dive | 30.2 | 31.7 | 7.7 |
| Abelian Sandpile | 5.9 | 5.8 | 2.5 |
| Newton Basins | 15.8 | 15.4 | 4.1 |
| Fractal Flames | 5.7 | 5.9 | 2.0 |
| Aperiodic Tilings | 45.2 | 40.4 | 9.9 |
| Voronoi Cells | 28.5 | 29.3 | 7.8 |
| Ripple Tank | 6.1 | 5.9 | 1.9 |
| Langton's Ant | 11.5 | 8.9 | 8.4 |
| Indra's Pearls | 4.9 | 4.8 | 2.4 |
| Harmonograph | 5.2 | 5.2 | 2.8 |
| Wallpaper Groups | 23.3 | 22.7 | 9.2 |
| Truchet Tiles | 9.2 | 9.0 | 4.9 |
| Space-filling Curves | 10.9 | 11.5 | 5.6 |
| Phyllotaxis | 5.1 | 5.6 | 3.0 |
| Hopf Fibration | 5.2 | 5.4 | 2.8 |
| Chladni Figures | 6.9 | 6.9 | 3.6 |
| Domain Colouring | 9.7 | 10.7 | 4.0 |
| Physarum Networks | 5.5 | 5.8 | 2.9 |
| Geometric Caustics | 5.6 | 5.7 | 2.6 |
| Space Colonization | 5.3 | 6.0 | 2.7 |

These are the changed families' representative looks from that same whole-frame sweep:

| Look | Before, 4K ms | After, 4K ms |
| --- | ---: | ---: |
| Prismatic Nave | 32.9 | 33.6 |
| Opal Reliquary | 51.3 | 48.9 |
| Midnight Rose | 23.1 | 22.9 |
| Enamel Glide | 44.0 | 39.7 |
| Long Corridor | 25.0 | 24.6 |
| Corkscrew | 42.0 | 38.4 |
| Mine Shaft | 22.2 | 24.9 |
| Narrows | 24.4 | 22.1 |
| Turning Tesseract | 18.7 | 12.9 |
| Sixteen Cell | 19.6 | 9.6 |
| Twenty-four Cell | 43.9 | 25.0 |
| Duoprism Torus | 45.3 | 21.7 |

## Quality and lifecycle checks

- **199 strict before/after image comparisons passed**: 181 captures of the changed renderers and 18 controls for the preserved tilings. Maximum channel difference was **2/255**, reached only by the 4K Opal Reliquary capture; every other comparison was at most 1/255. The two-step per-channel gate was not relaxed. The Cathedral 4K mean absolute channel difference was 0.000052/255.
- Coverage includes all 19 changed authored looks at three energies; Fourspace at 0.5, 123.4 and 3599.75 seconds; Cathedral/Flight after 1, 120 and 600 advancing frames; Fourspace rhythm impulses; extreme tiling scale/phason/drift/seed on 32:9; and six full 3840×2160 comparisons. Representative final before/after images were visually inspected.
- The native Flight probe continued the complete search after the proposed early stop at **25,165,824 sample points / 384 cases**. Neither the minimum nor the first material winner changed, including fractional recursion levels, all four paths, three openings and four depth slices.
- The native data-cache test covered all five cached families, exact agreement for **62,770 curve-map cells** and **2,560 orbit components**, paused refresh, missing-float-extension fallback, context restoration and texture accounting/disposal.
- All **328 authored looks** rendered. Every family passed energy extremes, 32:9/square/portrait output and fade cleanup; all **24 simulation preparation/held-transition contracts** passed. All three complete timing sweeps and the alternating probe reported no GPU, non-finite or page errors.
- **530 tests passed, 12 optional tests skipped**; the native cache test ran separately. Typecheck, formatting, build and distribution verification passed. Independent final code review found no actionable issues.

These are sampled visual comparisons and finite-domain GPU checks, not a proof across every input or driver. Cathedral, Flight and the slow tilings still exceed the 60 Hz throughput budget at 4K. External-display cadence, crossfade timing and full-night operation remain separate rig checks.

## Rejected experiments and remaining tiling work

The spatial Quasicrystal cache initially saved 28–32% draw/post time, but did **not** clear the final image gate. Review found that phason flips could produce rounded, overlapping rhombi away from edges; a containment check alone could choose a different first hit. A grid-clearance guard fixed that reproduction, but a later Phason Storm frame at 3599.75 seconds still differed by 75/255 at four post-processed pixels. Filling the cache entirely with rejected candidates preserved that failure, implicating compilation changes in the original fallback near a tile boundary. Larger edge margins, separated helpers and an experimental separate resolve pass did not establish equivalence. All tiling/engine prototype changes were discarded. The shipped tiling shader is byte-for-byte unchanged from the baseline.

A Wallpaper coefficient cache improved timing but failed strict images (up to 65/255), so it was also discarded. Cathedral/Flight specialization, Cathedral box bounds and an unrolled Fourspace cache were rejected for image differences or inconsistent/slower timings. None of these experiments contributes to the shipped gain claims.

Next: retain the slow tilings' exact candidate order and fallback arithmetic in any replacement, and test both phason degeneracies and late wrapped-time boundary cases before judging timing. Continue profiling Cathedral's other geometries and Flight's corkscrew without cutting ray budgets.

## Reproduce

```sh
node scripts/profile-families.mjs --reference 074d8b4 --types --frames 20 --width 3840 --height 2160 --out artifacts/performance/before-4k
node scripts/profile-families.mjs --types --frames 20 --width 3840 --height 2160 --out artifacts/performance/after-4k
node scripts/profile-families.mjs --types --frames 20 --out artifacts/performance/after-1080
node scripts/compare-family-pixels.mjs --reference 074d8b4 --families cathedral,flight --frames 600
node scripts/compare-family-pixels.mjs --reference 074d8b4 --families fourspace --frames 4 --times 0.5,123.4,3599.75
node scripts/check-flight-bounds.mjs
PHOSPHOR_PRECOMPUTE_GPU=1 node --test tests/browser/precompute.test.mjs
node scripts/test-browser.mjs --native-gpu --only lab
```

Tiling precision regression inputs for future attempts:

```sh
node scripts/compare-family-pixels.mjs --reference 074d8b4 --families quasicrystal --look 1 --times 3599.75 --frames 4 --levels 0.5
node scripts/compare-family-pixels.mjs --reference 074d8b4 --families quasicrystal --look 6 --params '{"scale":10,"phason":1,"drift":0,"spin":0}' --seed 997 --refinement 0 --times 23.47965,23.479658,23.47967,23.47968,23.47969
```

Run GPU checks sequentially. Full sweeps return a nonzero exit when a timing budget is exceeded as well as for rendering errors; inspect `profile.json` to distinguish them. Raw reports, captures, prototypes and the paired probe remain local under `artifacts/performance/round4-*`. The final snapshot's source hashes are in `round4-snapshot.json`; the repeatable orchestration is `round4-final-run.py` and the alternating probe is `round4-paired.mjs`. Bulk generated artifacts are not committed.

## Cathedral exact-bounds pass — 14 October 2026

**INCREMENTAL / EMPIRICAL.** Scene-only change to `scene-cathedral.mjs`, compared with `c8d7295`. Loop caps, ray budgets, geometry, shading and the 9×1 data texture are unchanged; Cathedral remains a gated family.

- **Reliquary branches** read their cached centre/radius/rotation with `texelFetch` inside the generation loop instead of copying them into dynamically indexed local arrays.
- **Reliquary bound:** the relic and every branch lie within radius 3.05 of the relic centre (|branch centre| ≤ 2.30, branch radius ≤ .75; an octahedron lies inside its sphere), so their distance is at least (|c| − 3.05)/√3. With a .15 margin, when this exceeds the ground (and the 32:9 chamber) the field returns the ground/chamber result in the original order.
- **Nave bound:** ribs (|z| ≤ .13, y ≥ .12), pillars (|z| ≤ .15, y ≤ .12, ||x| − 2.34| ≤ .12) and tracery (y ≥ .28, |z| within .035 of [.16, .325] bays) are box/intersection-bounded; with a .03 margin, when all exceed the enclosure the enclosure is returned.
- **Folded-gallery bound:** every box of a row lies within |z| ≤ .22 of its row plane (rows rotate only in xy). When both rows (with .03 margin) are farther than the shell and floor, the shell/floor result is returned.

Each early return happens before the skipped geometry and keeps the original strict-`<` tie order, so the first winner and its material are retained. `scripts/check-cathedral-bounds.mjs` records each proposed return and continues the complete evaluation in the same native-GPU function: **125,829,120 points / 1,920 cases** (nave, reliquary, folds; generations 1/1.5/3/4, bay scale .65/1/1.6, energy 0/1, 16:9 and 32:9, three reliquary turns, eight xz/xy slices), **63,132,256 early returns, zero distance or material differences**. Loosening a bound makes the probe fail.

Paired 4K/1080p throughput (`scripts/alternate-family-timing.mjs`: reference and working-tree pages alternate 4-frame bursts in one browser; whole frames including simulation and post; median of 80/96 frames per side). The GPU was shared with other lanes, so these are **INDICATIVE**; earlier runs under heavier load showed the same direction (reliquary −30 to −48%, folds −15 to −20%, nave −3 to −16%, rose ±5%).

| Geometry | 4K before p50 ms | 4K after p50 ms | Change | 1080p before | 1080p after | Change |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 Nave | 37.4 | 33.0 | −12% | 8.4 | 7.8 | −7% |
| 1 Reliquary | 55.2 | 29.8 | −46% | 17.6 | 9.6 | −45% |
| 2 Rose | 24.9 | 25.6 | +3% (noise) | 5.0 | 5.1 | +2% (noise) |
| 3 Folds | 41.0 | 35.8 | −13% | 8.4 | 7.2 | −14% |

Strict image gate (max channel difference ≤ 2/255 against `c8d7295`, all seven authored looks, energies 0.1/0.5/0.95 unless noted): 640×360 at 30 frames; 600 frames at 0.5, 1234.5 and 3599.75 s; 1 frame; 32:9 at 120 frames; fractional geometry 0.5/1.5/2.5; recursion 4 and 1.5; and **28 full 3840×2160 comparisons** (120 frames, energies 0.5/0.95, 0.5 and 1234.5 s). All **189 comparisons of the shipped shader** had **max 1/255** (4K mean ≤ 0.00005/255). One loaded 600-frame sweep of an intermediate version reported two whole-frame differences (≈ 80% of pixels changed, i.e. different camera state, not a local geometry change); both cases passed when rerun alone and the full sweep passed when repeated.

Rejected: a telescoped single-exponential in-scattering with multiplied shaft power passed the image gate but was not measurably faster (paired run −1 to +4%) and was removed. Manually unrolling the reliquary branches gave −30% there but slowed the other geometries by 5–14%. Non-unrolled `sceneSDF` family loops were 12–21% slower. Any change to the folded-gallery row loop body — a skip inside the loop, a never-taken `continue`, a helper function or a manual unroll — changed compiled arithmetic and failed the gate by up to 138/255 at isolated lattice-boundary pixels, even when the skip could not trigger; caching the row rotations in the data texture was bit-identical but not faster. Bounds therefore return before the unchanged original code instead of guarding parts of it. A second nave early return before the tracery loop gained only ≈3% and was not kept.

Remaining hotspots: the primary march itself (most nave/folds steps are near geometry where no bound applies), the nave arch's two square roots per step, the reliquary's grazing silhouette rays, and normals/AO (seven extra field evaluations per hit). The nave and folds glass patterns (Voronoi cells, lattice seams, dominant-axis projection on 45° shells) amplify last-bit arithmetic changes, so future work there needs early returns ahead of untouched code, not rewrites.

```sh
PHOSPHOR_HEADLESS_RIG=1 node scripts/check-cathedral-bounds.mjs --port 48354
PHOSPHOR_HEADLESS_RIG=1 node scripts/alternate-family-timing.mjs --reference c8d7295 --bursts 20 --port 48355
PHOSPHOR_HEADLESS_RIG=1 node scripts/alternate-family-timing.mjs --reference c8d7295 --width 1920 --height 1080 --bursts 24 --port 48355
PHOSPHOR_HEADLESS_RIG=1 node scripts/compare-family-pixels.mjs --reference c8d7295 --families cathedral --frames 600 --times 0.5,1234.5,3599.75 --port 48352
PHOSPHOR_HEADLESS_RIG=1 node scripts/compare-family-pixels.mjs --reference c8d7295 --families cathedral --width 3840 --height 2160 --frames 120 --levels 0.5,0.95 --times 0.5,1234.5 --port 48352
PHOSPHOR_HEADLESS_RIG=1 node scripts/compare-family-pixels.mjs --reference c8d7295 --families cathedral --width 1280 --height 360 --frames 120 --port 48352
PHOSPHOR_HEADLESS_RIG=1 node scripts/compare-family-pixels.mjs --reference c8d7295 --families cathedral --params '{"geometry":1.5}' --levels 0.5 --port 48352
```
