# Family performance measurements — 12 October 2026

**INCREMENTAL / EMPIRICAL.** Third performance pass, compared with `65b5a67`. All **39 renderers / 178 declared variants** were measured again at 4K, followed by a complete 1080p sweep. The final shared runtime includes the localization work at `e918a18`; baseline and optimized runs use that same engine and harness. Earlier isolated experiments used `65b5a67` and are recorded separately.

Hardware: ANGLE Metal on Apple M3 Pro, Chrome 155.0.8059.39. Each variant uses the median of 20 synchronously completed frames after warm-up, at energy 0.95 and full physical output resolution. Post-processing is included. A one-pixel read forces GPU completion; asynchronous flash approval is disabled. These are local throughput measurements, **not display cadence or venue acceptance**. GPU/system load varies, including for unchanged families.

## Changes

- **Mandelbrot:** decode the existing reference-orbit bytes once per frame into a tiny RGBA32F texture. Every pixel reads the same float32 values with one fetch instead of two fetches and byte decoding per iteration. All five sets retain their reference orbits, iteration budgets, derivatives, supersampling and history.
- **Space-filling Curves:** cache exact integer forward/inverse maps for the active and parent orders. The picture shader retains the original gliding coordinates, segment order and distance arithmetic. Cached floating coordinates changed near-tie winners in an experiment and were rejected.
- **Voronoi:** calculate the power-diagram site radii once per frame. The Lloyd simulation, site count, score metric, weight rings and borders remain intact.
- The optional GPU data pass refreshes on every visual draw, including paused edits, and follows slot cleanup/context recovery. GPUs without float render targets retain the original shaders. The picture still shades every output pixel; these data grids are not reduced-resolution pictures.

Fourspace projection/unrolling/bounds/vertex-stage experiments were slower or inconclusive. Cathedral and Flight ray-arithmetic experiments did not retain a measurable gain in the repeat run. Those renderers are unchanged by this pass.

## All families

The table reports the slowest declared variant within each family.

At 4K, variants above 16.67 ms: **73 → 53**; above 33.34 ms: **33 → 13**. At 1080p, **176/178** variant medians are below 16.67 ms. Count changes include load variation in unchanged families and must not all be attributed to these edits.

| Family | Before, 4K ms | After, 4K ms | After, 1080p ms |
| --- | ---: | ---: | ---: |
| Acid Mycelium | 11.5 | 13.0 | 3.5 |
| Magnetic Choir | 10.6 | 11.5 | 3.1 |
| Cathedrals of Error | 79.3 | 88.0 | 17.7 |
| Alien Aquarium | 9.7 | 12.5 | 3.5 |
| Causal Tapestry | 11.6 | 13.8 | 2.9 |
| Feedback Chapel | 10.1 | 12.1 | 3.0 |
| Interference Rituals | 16.2 | 18.4 | 3.8 |
| Topological Melt | 12.5 | 15.6 | 3.4 |
| Phase Transition Theatre | 11.9 | 13.5 | 3.7 |
| Evolution Garden | 11.4 | 14.6 | 3.0 |
| Pulse Geometry | 10.1 | 11.9 | 2.9 |
| Fractal Flight | 55.2 | 72.8 | 13.0 |
| Light Beams | 21.5 | 18.5 | 6.0 |
| Julia Observatory | 23.6 | 18.6 | 5.7 |
| Fourth Dimension | 66.3 | 62.9 | 15.7 |
| Hyperbolic Loom | 9.4 | 10.2 | 2.9 |
| Particle Swarm | 17.3 | 13.8 | 8.8 |
| Game of Life | 20.3 | 18.9 | 5.3 |
| Strange Attractors | 12.3 | 7.8 | 4.0 |
| Mandelbrot Dive | 81.4 | 37.0 | 13.0 |
| Abelian Sandpile | 14.9 | 7.9 | 4.4 |
| Newton Basins | 31.3 | 20.0 | 5.9 |
| Fractal Flames | 12.7 | 7.8 | 3.2 |
| Aperiodic Tilings | 77.3 | 48.1 | 17.7 |
| Voronoi Cells | 56.6 | 42.1 | 13.7 |
| Ripple Tank | 13.0 | 9.2 | 3.3 |
| Langton's Ant | 20.9 | 14.3 | 7.8 |
| Indra's Pearls | 11.4 | 7.6 | 2.6 |
| Harmonograph | 12.6 | 9.3 | 4.3 |
| Wallpaper Groups | 45.6 | 32.7 | 9.0 |
| Truchet Tiles | 20.1 | 13.4 | 4.2 |
| Space-filling Curves | 58.3 | 17.5 | 5.0 |
| Phyllotaxis | 12.0 | 8.5 | 3.5 |
| Hopf Fibration | 11.8 | 8.4 | 3.4 |
| Chladni Figures | 17.1 | 11.3 | 4.3 |
| Domain Colouring | 21.7 | 14.4 | 4.1 |
| Physarum Networks | 12.8 | 8.1 | 3.3 |
| Geometric Caustics | 13.8 | 8.0 | 3.3 |
| Space Colonization | 12.6 | 8.0 | 3.3 |

## Changed variants

These are the same 20-frame full-sweep medians, with the representative authored look used for each declared variant.

| Family / look | Before, 4K ms | After, 4K ms | Change |
| --- | ---: | ---: | ---: |
| Mandelbrot Dive / Seahorse Valley | 71.8 | 31.6 | -56% |
| Mandelbrot Dive / Burning Armada | 77.7 | 37.0 | -52% |
| Mandelbrot Dive / Tricorn Nursery | 81.4 | 36.4 | -55% |
| Mandelbrot Dive / Cubic Bloom | 53.3 | 26.0 | -51% |
| Mandelbrot Dive / Celtic Braid | 54.6 | 26.5 | -51% |
| Space-filling Curves / Hilbert Refinement | 50.2 | 14.1 | -72% |
| Space-filling Curves / Moore Loop | 58.3 | 16.6 | -72% |
| Space-filling Curves / Peano Weave | 38.6 | 17.5 | -55% |
| Space-filling Curves / Locality Blocks | 52.8 | 14.1 | -73% |
| Voronoi Cells / Honeycomb Relax | 37.9 | 24.6 | -35% |
| Voronoi Cells / Metric Morph | 37.8 | 23.9 | -37% |
| Voronoi Cells / Power Bubbles | 43.0 | 20.5 | -52% |
| Voronoi Cells / Delaunay Net | 56.6 | 42.1 | -26% |

The full table above includes the final Voronoi adjustment that leaves non-power site reads unchanged. The improvements shown for those unchanged variants illustrate why the full-sweep percentages are not reliable estimates of optimization gains.

## Targeted confirmation

A separate 40-frame completed-frame repeat, running each family's baseline and optimized version consecutively, measured:

| Family / look | Before, 4K ms | After, 4K ms |
| --- | ---: | ---: |
| Space-filling Curves / Hilbert Refinement | 28.6 | 12.8 |
| Space-filling Curves / Moore Loop | 35.5 | 14.4 |
| Space-filling Curves / Peano Weave | 23.1 | 13.3 |
| Space-filling Curves / Locality Blocks | 30.1 | 11.6 |
| Mandelbrot Dive / Seahorse Valley | 56.2 | 36.2 |
| Mandelbrot Dive / Burning Armada | 74.8 | 37.6 |
| Mandelbrot Dive / Tricorn Nursery | 56.7 | 39.6 |
| Mandelbrot Dive / Cubic Bloom | 35.5 | 27.7 |
| Mandelbrot Dive / Celtic Braid | 34.7 | 27.5 |
| Voronoi Cells / Honeycomb Relax | 26.4 | 30.9 |
| Voronoi Cells / Metric Morph | 25.5 | 32.1 |
| Voronoi Cells / Power Bubbles | 29.4 | 28.3 |
| Voronoi Cells / Delaunay Net | 38.4 | 50.4 |

Curves and Mandelbrot improved again. Voronoi's unchanged variants slowed by 17–31%, while the optimized power variant improved by only 4% in this sequential run. An earlier isolated repeat found Mandelbrot improvements of 20–31% across all five variants. Initial apparent Cathedral/Flight ray-loop gains disappeared on repetition and were discarded.

To reduce sequential load drift, a final probe alternated baseline/optimized draw order in one browser and engine, using identical simulation state, uniforms and input picture history within each pair. Forty samples per version at 4K measured **draw plus post-processing only**, including the new data pass but excluding simulation advancement. These absolute times are not comparable to the completed-frame sweeps above.

| Representative look | Before, draw + post ms | After, draw + post ms | Less time |
| --- | ---: | ---: | ---: |
| Moore Loop | 47.8 | 18.7 | 61% |
| Tricorn Nursery | 68.2 | 50.7 | 26% |
| Power Bubbles | 40.2 | 26.7 | 34% |

All three retained a gain with alternating order. This remains a short local experiment under variable GPU load, not a guarantee for every look, zoom or show condition. Its source and raw samples are retained locally as `artifacts/performance/round3-paired.mjs` and `round3-paired.json`.

## Quality and lifecycle checks

- **329 strict before/after image comparisons passed**, maximum channel difference 1/255. This includes 270 frames across all 30 changed looks, three energies and three show times (0.5, 123.4 and 43,200 seconds); 54 additional parent/child refinement comparisons; two Mandelbrot captures after 1,800 advancing frames; and one full 3840×2160 capture for each changed family. Hilbert and Mandelbrot were pixel-identical in all their comparisons. Representative final captures were visually inspected.
- The new native GPU test checked **62,770 cached curve cells** against independent CPU maps (both directions and parent orders), **2,560 orbit components** against the original byte decoding, paused refresh without a simulation tick, missing-float-extension fallback, context restoration and exact texture accounting/disposal.
- The existing exhaustive GPU integer-map probe passed **110,113 cells / 18 kind-order combinations**.
- All **328 authored looks** rendered; every family passed energy extremes, 32:9/square/portrait output and fade cleanup; all 24 simulation preparation/held-transition contracts passed. No GPU or non-finite errors occurred in the complete timing sweeps.
- **510 unit/browser-harness tests passed, 12 optional tests skipped**; the new native GPU test passed separately. Typecheck, formatting, build and distribution checks passed (100 reachable assets). Independent code review found no actionable issues.

These are sampled visual comparisons and exact finite-domain data checks, not a proof over every input or driver. Full-resolution external-display cadence, crossfades under timing load and long venue soaks remain separate rig checks. Dense Fourspace, Cathedral, Flight, Mandelbrot and heptagonal tilings still need attention at 4K; no geometry, ray-step, iteration, simulation-size or output-resolution cuts were used to meet a timing target.

## Reproduce

```sh
node scripts/profile-families.mjs --reference 65b5a67 --types --frames 20 --width 3840 --height 2160 --out artifacts/performance/before
node scripts/profile-families.mjs --types --frames 20 --width 3840 --height 2160 --out artifacts/performance/after
node scripts/profile-families.mjs --types --frames 20 --width 1920 --height 1080 --out artifacts/performance/after-1080
node scripts/profile-families.mjs --reference 65b5a67 --families hilbert --types --frames 40 --width 3840 --height 2160 --out artifacts/performance/confirm-before
node scripts/profile-families.mjs --families hilbert --types --frames 40 --width 3840 --height 2160 --out artifacts/performance/confirm-after
node scripts/compare-family-pixels.mjs --reference 65b5a67 --families hilbert,mandelbrot,voronoi --times 0.5,123.4,43200
node scripts/compare-family-pixels.mjs --reference 65b5a67 --families hilbert --refinement-count 5 --refinement 0.5
node scripts/compare-family-pixels.mjs --reference 65b5a67 --families mandelbrot --look 5 --levels 0.95 --frames 1800
PHOSPHOR_PRECOMPUTE_GPU=1 node --test tests/browser/precompute.test.mjs
node scripts/check-curve-maps.mjs
node scripts/test-browser.mjs --native-gpu --only lab
```

Run GPU probes sequentially. The profile command exits nonzero for variants beyond its frame budget as well as for rendering errors; inspect `profile.json` to distinguish them. Raw reports, captures and logs are retained locally under `artifacts/performance/round3-*`; they are not published. Earlier experiments are under `round3-workspace/artifacts/performance/`. The [second-pass report](https://github.com/fabianxvogt/phosphor/blob/65b5a67/docs/families/PERFORMANCE.md) records the prior Melt, Peano and Quasicrystal work.
