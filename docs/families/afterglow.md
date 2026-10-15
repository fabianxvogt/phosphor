# Afterglow Garden

**EXPLORATORY / EMPIRICAL**, 2026-10-14 (wave 2, lane L5). The `afterglow` renderer (number 100) is the continuous world behind **Afterglow Garden**. It replaces the earlier world built from three evolution looks with curated chemistry. It is an artistic Gray–Scott model, not botany.

## Algorithm and signature detail

Evolution's morphogen step (`morphogenSimulation()` in [scene-evolution.mjs](../../scene-evolution.mjs)) runs unchanged on a 384² periodic RGBA8 field with 16-bit U/V (two steps per tick, codec `gray-scott-uv16-v1`, so traces carry from evolution, acid and mycelium). Planting density seeds the buds. The visual pass raymarches V as a heightfield (16 bilinear steps plus 5 bisections) under a perspective camera, with a key light, three-sample self-shadowing, fresnel rims, distance fog into an afterglow sky and a reflection of the crowns in the wet ground. The reaction's crests stay the hero: veins in Roots and neon crests in Bloom are the activator ridge itself.

## Development (one key, no reset)

| State     | Camera                                                                    | Light                                                                     | Chemistry F / k / Dv |
| --------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------- |
| 0 Roots   | Low tracking flight, horizon in frame, afterglow sky band                 | Dark tissue, a glowing vein along every crest with a soft halo            | 0.032 / 0.0585 / 0.50 |
| 1 Petals  | Three-quarter view                                                        | Translucent margins, iridescent fresnel rims, petal relief from the gradient | 0.034 / 0.0612 / 0.47 |
| 2 Bloom   | Overhead crane with a wider yaw sweep                                     | Neon crests with beaded petal cores above 1.0 (feeding bloom), mirrored in the ground | 0.037 / 0.0605 / 0.46 |

Mycelium looks down at a city. Afterglow starts at the horizon and rises, and it draws light *on* the reaction ridge rather than lighting bodies from outside. Tissue takes its colour from secondary and accent, and primary is kept for the light, so the two worlds read differently under the same palette.

Chemistry follows development with smoothstep interpolation. A CPU mirror measured the band. The original world's chemistry (0.029/0.057 ↔ 0.03/0.062 ↔ 0.042/0.061) collapsed to below 1% coverage for seconds after an instant jump. An earlier Bloom at 0.039/0.0605 also collapsed to 0% on a 96² torus when jumping back to Roots. The authored band keeps more than 30% coverage after every ordered instant jump on two grid sizes. **Spore rain** (three seeded buds every two seconds, only where a 12-texel ring is dark) regrows an empty garden, because evolution has no sources.

## Looks, energy, rhythm

- **World states:** Glowing Roots, Opening Petals and Crowns at Dusk (seed 5607, planting 6, identical other parameters).
- **Other looks:** Root Horizon, Petal Field, Halfway to Bloom, Lantern Orchard and Low Bloom vary seed, planting, relief, altitude, sway and an in-between development.
- **Energy:** scales growth speed, petal relief and sway (structure and motion).
- **Rhythm:** a vein pulse (4 beats), a petal cohort (8 beats) and a local morphogen feed (16 beats, simulation).

## Cost and limits

Native M3 Pro probe on a GPU shared with other lanes (indicative only): whole-frame p50 6.4–6.7 ms at 1080p in the quietest run, 22–74 ms at 4K under contention. A later contended run showed 16–19 ms at 1080p, while acid moved from 2.4 to 3.7–17 ms. A quiet-machine measurement is still owed.

The horizon state shows the periodic field repeating toward the far distance; fog hides most of it. Glowing Roots measures mean luminance 0.08 at energy 0.1 because of the sky band, which is borderline for the dark-ground rule. The brush and feed land in simulation space.

## Wave 5 rework (2026-10-15)

IDs, all eight presets/seeds, schema and the chemistry/simulation are unchanged. No `worlds.mjs` migration is needed. Roots keeps its horizon flight, but its sky is much darker and entirely palette-derived. The top state now gathers the inherited chemical field onto **one six-lobed calyx** with raised petal tips and a central emissive well, rather than ending as an edge-to-edge noisy carpet. The support contracts geometrically with development (not an opacity dissolve). The polynomial `2[x(x²−3y²)]²−1 = cos(6θ)` supplies the petal silhouette without per-sample atan/cos; the morphogen crests still supply the luminous veins. A short-side camera fit also preserves the complete hero in portrait.

Rounds: (1) add the raised calyx and isolate Bloom; (2) replace an unsatisfactory late dissolve with a continuously contracting support, restore wet reflections and reserve accent for the well; (3) soften chemical micro-relief to keep broad petals distinct from Mycelium's walls, add palette tissue gradients and reduce white/accent coverage; (4) remove redundant tracing and unobservable reflection work to recover the baseline cost. Twenty → ten march intervals with development/seven bisections, two self-shadow taps, and three mirror taps only when Bloom contributes. A fifth round replaced four-fetch manual bilinear decoding with hardware linear filtering: byte decoding is linear, while an explicit nearest `texelFetch` stencil preserves the simulation exactly. GPU readback against `deaaae1` compared all 589,824 state bytes at all three states and both resolutions: **zero differences**. No engine changes. This is full-resolution rendering, not a reduced-resolution colour cache.

Original native p50: 1080p **2.2/2.1/2.1 ms**, 4K **6.8/7.2/6.7 ms**. Under the shared fleet GPU, alternating-order same-engine baseline/final pairs (median of 3×40 frames) measured 1080p **2.8/2.6/2.6 → 2.6/2.4/2.0 ms**, 4K **8.6/12.6/8.4 → 7.9/11.3/6.7 ms**. Every state is faster. The Petals 4K run shows external contention clearly (individual baseline/final pairs 8.5→7.9, 12.6→11.7, 12.9→11.3); all pairs improve. All raw measurements, baseline/final films and palette/portrait/ladder evidence are in the fleet `rework-organic/output/afterglow/` directory. Remaining limit: near-horizon roots still resolve a periodic 384² field, not individual volumetric plants; wet reflections are three-tap approximations.

## Verification

`tests/afterglow.test.mjs` checks:
- evolution's shader hashes are unchanged and `morphogenSimulation()` reproduces them;
- traces carry to and from the field;
- continuous-world detection and preset bounds;
- the HISTORY upgrade of both earlier definitions, while an edited copy is kept;
- the CPU mirror's stability on two grid sizes.

`tests/worlds.test.mjs` keeps its transition tests on a custom copy of the earlier three-look garden. The energy ladder, the world film and an Ember-palette film were reviewed on the native GPU.
