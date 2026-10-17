# Serialized native timing — 2026-10-17

**INCREMENTAL / EMPIRICAL.** Renderer source commit `63806f598f3639452f4f6879244135eebb23eb7d` (start/end identical). Phosphor's other GPU lanes were stopped. Shared laptop: Apple M3 Pro, installed Chrome through ANGLE Metal, wrapper-owned headless native-GPU contexts; not an external-display or venue/endurance certification. Requested render dimensions were checked against actual buffers. The live flash limiter was unchanged and active for Stage timing.

## Results

- **1080p Stage: 27/27 families pass**, all 81 declared development states: p99 ≤34 ms, zero GL/non-finite counters, zero step reductions/downgrades and no page errors. Energy 0.95; 30 seconds per state, roughly 1800 recorded frame intervals per state.
- **1080p synchronous frame-cost: 25/27** within the ≤8 ms p50 world budget. Misses: **Magma Rivers 8.1 ms**, **Thunderhead Supercell 9.5 ms**. M4 is therefore **not fully accepted**, despite complete signature coverage and the clean Stage p99 gate.
- **4K Stage: 6/12 measured families pass** (wave-5 ten plus Magma and Moon Tide). Misses: Storm, Escher, Ink, Dunes, Magma and Tide. All actual buffers were 3840×2160; no render-scale reduction was introduced. Record these as failures, not as venue-qualified worlds.
- Synchronous probes: 30 completed frames per declared state after warm-up, including simulation/post, one-pixel readback forcing GPU completion; asynchronous flash approval disabled in this **cost probe only**. All 81 states at both sizes had zero GL/non-finite/page errors. Cost and presentation cadence are different measurements.

## Worst declared state per family (milliseconds)

| World (family) | 1080p Stage p99 ≤34 | 1080p sync p50 ≤8 | 4K Stage p99 ≤34 | 4K sync p50 ≤16 |
| --- | ---: | ---: | ---: | ---: |
| Living Mycelium (`mycelium`) | 16.8 | 5.3 | — | 13.6 |
| Afterglow Garden (`afterglow`) | 16.8 | 5.8 | — | 11.9 |
| Unfolding Garden (`metamorphosis`) | 16.8 | 2.4 | — | 4.5 |
| Hopf Bloom (`fibration`) | 16.8 | 2.3 | — | 5.2 |
| Crystal Cavern (`crystal`) | 16.8 | 2.2 | — | 5.7 |
| Spiral Nebula (`nebula`) | 16.8 | 6.9 | — | 14.6 |
| Endless Descent (`descent`) | 33.3 | 5.4 | — | 19.8 **miss** |
| Dusk Murmuration (`murmuration`) | 16.8 | 2.8 | — | 6.3 |
| Origami Storm (`fold`) | 16.8 | 1.6 | — | 4.1 |
| Attractor Ribbons (`ribbons`) | 16.8 | 2.2 | — | 5.3 |
| Event Horizon (`horizon`) | 16.8 | 3.7 | — | 12.1 |
| Abyssal Bloom (`abyss`) | 16.8 | 3.1 | — | 7.3 |
| Liquid Chrome (`ferro`) | 16.8 | 4.4 | — | 14.8 |
| Moon Tide (`tide`) | 16.8 | 4.4 | 50.0 **miss** | 16.3 **miss** |
| Laser Grid (`laser`) | 16.8 | 3.7 | — | 12.7 |
| Magma Rift (`magma`) | 16.8 | 8.1 **miss** | 116.7 **miss** | 29.9 **miss** |
| Kinetic Rain (`kinetic`) | 16.8 | 1.9 | — | 4.7 |
| Aurora Veil (`aurora`) | 16.8 | 4.1 | 16.8 | 13.8 |
| Brass Orrery (`orrery`) | 16.8 | 4.2 | 16.8 | 8.5 |
| Thunderhead (`storm`) | 16.8 | 9.5 **miss** | 83.4 **miss** | 24.0 **miss** |
| Prism Engine (`prism`) | 16.8 | 3.0 | 33.3 | 9.6 |
| Impossible Stairs (`escher`) | 16.8 | 4.6 | 50.0 **miss** | 16.7 **miss** |
| Silk Storm (`silk`) | 16.8 | 2.6 | 33.3 | 6.4 |
| Ink Bloom (`ink`) | 16.8 | 7.2 | 100.1 **miss** | 26.2 **miss** |
| Soap Cathedral (`soap`) | 16.8 | 3.6 | 33.3 | 13.6 |
| Dune Sea (`dunes`) | 33.3 | 6.3 | 83.4 **miss** | 26.0 **miss** |
| Data Monolith (`voxel`) | 16.8 | 2.0 | 16.8 | 5.4 |

The 4K Stage column covers only the requested wave-5 group plus Magma/Tide; all 27 received synchronous 4K cost probes. A dash means unmeasured Stage cadence, not a pass. This is sampled local evidence, not a guarantee across drivers, seeds, crossfades, palettes or long shows. New renderer changes require targeted remeasurement.

## Reproduce and raw evidence

```
PHOSPHOR_HEADLESS_RIG=1 npm run timing -- --rig --dist . --family <id> --seconds 30 --width 1920 --height 1080 --port 48197 --out artifacts/timing/night-1080
PHOSPHOR_HEADLESS_RIG=1 npm run timing -- --rig --dist . --family <id> --seconds 30 --width 3840 --height 2160 --port 48197 --out artifacts/timing/night-4k
PHOSPHOR_HEADLESS_RIG=1 node scripts/profile-families.mjs --types --families <comma-separated-ids> --frames 30 --budget 8 --port 48198 --out artifacts/performance/night-1080
PHOSPHOR_HEADLESS_RIG=1 node scripts/profile-families.mjs --types --families <comma-separated-ids> --frames 30 --budget 16 --width 3840 --height 2160 --port 48198 --out artifacts/performance/night-4k
```

Raw reports remain local under those directories; `artifacts/timing/night-measure.log` records the serial run. `family-timing.mjs` prints NOT PASSED without a nonzero exit: the JSON `passed` field, dimensions and counters—not exit status alone—were used above. The synchronous probes correctly returned exit 1 for budget misses. No limiter, governor or budget threshold was weakened.
