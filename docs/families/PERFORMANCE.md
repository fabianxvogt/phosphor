# Family performance measurements — 12 October 2026

**INCREMENTAL / EMPIRICAL.** Second performance pass, compared with `154c7f9`. All 39 renderers and 178 declared variants were measured at high energy (0.95), full native resolution, including the post-processing chain. The stable shared runtime is `8558cd0`; tests ran from an ignored snapshot with the performance changes applied, isolated from concurrent UI/localization work.

Hardware: ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version); Chrome 155.0.8059.39. Each row uses the median of 20 synchronously completed frames after warm-up. The table reports the slowest declared variant per family. Timings include a one-pixel GPU completion read; asynchronous flash approval is disabled. These are local throughput measurements, not display cadence or venue acceptance. Unchanged families can vary with GPU/system load.

Melt now rejects conservative bounds around groups of eight segments before fetching/shading their geometry; all 80 segments per strand, depth order and antialiasing remain. Peano uses constant integer divisors instead of dynamically indexed ternary digit arrays. A Quasicrystal boundary miss exposed by stricter pixel checks now falls back to the original search, with derivatives evaluated outside divergent branches. Resolution, simulation sizes, ray steps and visual detail are unchanged.

At 4K, variants above 16.67 ms: **49 → 36**; above 33.34 ms: **13 → 10**. At 1080p, **178/178** variant medians are below 16.67 ms.

| Family | Before, 4K ms | After, 4K ms | After, 1080p ms |
| --- | ---: | ---: | ---: |
| Acid Mycelium | 9.1 | 5.8 | 3.0 |
| Magnetic Choir | 9.5 | 5.4 | 2.3 |
| Cathedrals of Error | 61.9 | 52.5 | 14.5 |
| Alien Aquarium | 6.5 | 8.2 | 2.1 |
| Causal Tapestry | 9.1 | 5.8 | 2.2 |
| Feedback Chapel | 5.5 | 8.6 | 2.2 |
| Interference Rituals | 13.3 | 12.1 | 3.2 |
| Topological Melt | 72.9 | 9.3 | 2.4 |
| Phase Transition Theatre | 11.5 | 8.3 | 2.4 |
| Evolution Garden | 7.1 | 8.6 | 2.4 |
| Pulse Geometry | 5.7 | 7.4 | 2.0 |
| Fractal Flight | 42.6 | 39.9 | 10.7 |
| Light Beams | 13.1 | 12.5 | 4.3 |
| Julia Observatory | 14.7 | 15.8 | 4.4 |
| Fourth Dimension | 51.8 | 53.9 | 12.9 |
| Hyperbolic Loom | 5.4 | 5.9 | 1.9 |
| Particle Swarm | 10.1 | 9.2 | 6.1 |
| Game of Life | 12.4 | 14.5 | 3.8 |
| Strange Attractors | 6.3 | 8.8 | 2.5 |
| Mandelbrot Dive | 47.0 | 51.7 | 12.9 |
| Abelian Sandpile | 6.3 | 8.7 | 3.2 |
| Newton Basins | 17.5 | 16.6 | 5.4 |
| Fractal Flames | 5.9 | 7.8 | 2.5 |
| Aperiodic Tilings | 32.8 | 41.8 | 11.8 |
| Voronoi Cells | 33.2 | 30.5 | 11.3 |
| Ripple Tank | 7.0 | 5.8 | 2.6 |
| Langton's Ant | 10.8 | 10.8 | 5.9 |
| Indra's Pearls | 5.6 | 5.5 | 2.0 |
| Harmonograph | 8.4 | 6.3 | 2.5 |
| Wallpaper Groups | 38.7 | 28.1 | 6.7 |
| Truchet Tiles | 10.1 | 11.7 | 3.4 |
| Space-filling Curves | 47.8 | 33.2 | 9.1 |
| Phyllotaxis | 5.9 | 5.5 | 2.5 |
| Hopf Fibration | 5.5 | 5.7 | 2.3 |
| Chladni Figures | 7.5 | 9.9 | 3.2 |
| Domain Colouring | 10.8 | 10.7 | 3.0 |
| Physarum Networks | 5.9 | 5.8 | 2.2 |
| Geometric Caustics | 5.6 | 6.9 | 2.4 |
| Space Colonization | 5.6 | 7.3 | 2.8 |

A second 40-frame targeted run confirmed the gains (4K medians):

| Variant | Before ms | After ms |
| --- | ---: | ---: |
| Trefoil tube | 22.0 | 6.6 |
| Figure-eight tube | 22.9 | 7.1 |
| Möbius ribbon | 28.9 | 7.1 |
| Woven ribbons | 55.0 | 7.8 |
| Peano curve | 44.9 | 16.8 |

The Quasicrystal correctness fallback has a cost: the heptagonal variant measured 32.8 → 41.8 ms in the full sweep. It repairs near-boundary differences from the first pass while retaining a substantial gain over the original pre-optimization renderer. Cathedral and additional Hilbert-unrolling experiments did not demonstrate a benefit and were discarded. Remaining 4K bottlenecks include dense Fourspace, Cathedral, Mandelbrot, heptagonal tilings and Flight. The next optimization must retain their geometry/iteration budgets and pass the same visual checks.

Quality checks:

- round2-final-pixels: 45 frames at 640×360; maximum channel difference 0/255; 0 frames beyond the strict two-step tolerance.
- round2-final-quasi: 72 frames at 640×360; maximum channel difference 1/255; 0 frames beyond the strict two-step tolerance.
- round2-pixels-melt-late: 18 frames at 640×360; maximum channel difference 0/255; 0 frames beyond the strict two-step tolerance.
- round2-pixels-1080: 2 frames at 1920×1080; maximum channel difference 0/255; 0 frames beyond the strict two-step tolerance.
- Exhaustive GPU/CPU curve comparison: 110,113 cells across 18 kind/order combinations, checked independently in both mapping directions; exact agreement. Melt bound tests cover 384 camera/thickness/phase combinations and interpolated segment locations.
- 505 unit/browser-harness tests passed, 11 skipped. Type checking, format check, build, distribution checks and the native browser family lab passed. Independent review found no actionable findings.

Reproduce from the repository root:

```sh
node scripts/profile-families.mjs --reference 154c7f9 --types --frames 20 --width 3840 --height 2160 --out artifacts/performance/before
node scripts/profile-families.mjs --types --frames 20 --width 3840 --height 2160 --out artifacts/performance/after
node scripts/compare-family-pixels.mjs --reference 154c7f9 --families melt,hilbert
node scripts/compare-family-pixels.mjs --reference 2b6398e --families quasicrystal --times 0.5,123.4,3599.5
node scripts/check-curve-maps.mjs
```

Run GPU probes sequentially. Raw reports, captures and logs are retained locally in `artifacts/performance/round2-*`; generated artifacts are not published. Visual checks are sampled evidence, not a proof over every input or driver. Full-resolution external-display cadence, crossfades and long venue soaks remain separate rig checks.
