# Living Mycelium

**EXPLORATORY / EMPIRICAL**, 2026-10-14 (wave 1, lane L5). The `mycelium` renderer (number 99) is the continuous world behind **Living Mycelium**. It replaces the earlier world built from three acid looks with curated chemistry. It is an artistic Gray–Scott model, not biology.

## Algorithm and signature detail

Acid's Gray–Scott step (`grayScottSimulation()` in [scene-acid.mjs](../../scene-acid.mjs)) runs unchanged on a 320×192 periodic RGBA8 field with 16-bit U/V (8 steps per 60 Hz tick, same stability bounds and codec `gray-scott-uv16-v1`, so traces carry from acid and evolution). The current visual pass samples activator V onto a fixed, perspective-distributed **384×224 triangle grid**, rather than marching each pixel. The original field continues to the fog horizon. A low camera travels inside the raised membranes; City opens a narrow, continuously carved sightline so the nearest walls cannot hide the entire city. Key/fill light, transmission, wet specular rims, contour-following gills and sparse HDR windows light the chemical structure. A depth-tested additive tail of 96 small billboard spores drifts above it. See [organic-landscape.mjs](../../organic-landscape.mjs), also used by Afterglow; there is no engine extension or reduced-resolution colour cache.

## Development (one key, no reset)

`development` 0 → 2 is the world's type key. Every value in between is a composed frame; nothing resets the simulation, seed, time or camera phase.

| State        | Rendering                                                              | Chemistry F / k / Du |
| ------------ | ---------------------------------------------------------------------- | -------------------- |
| 0 Understory | Low forest-floor flight; luminous threads continue to the horizon      | 0.027 / 0.058 / 0.80 |
| 1 Tide       | Taller wet membranes, specular sheen and transmitting rims             | 0.037 / 0.061 / 1.00 |
| 2 City       | Camera inside vast luminous walls; a winding avenue and sparse windows | 0.029 / 0.057 / 0.90 |

Chemistry follows development with smoothstep interpolation, so the pattern itself slowly drifts: broken threads and spores, long lamellae, a closed network. A CPU mirror measured that larger excursions are unsafe: an instant jump from F 0.040/k 0.0605 (or the 0.042/0.059 pore regime) to Understory extinguished the whole field, and even the authored source colonies could not revive it. The authored band survives every instant jump (lowest coverage ≈ 6.6 % after Tide → Understory, regrown to > 50 % within 8 s). **Spore rain** adds a second guarantee: every two seconds three seeded discs land, but only where a 12-texel ring is dark, so a living network is untouched and an extinct region regrows.

## Looks

Hyphal Understory, Tidal Lamellae and Lantern City are the world states (seed 211, composition 5, identical other parameters). Spore Floor, Night Membrane, Tide Turning, Street Plan and Bloom Quarter vary seed, inoculum composition, relief, altitude and an in-between development. Composition only shapes the first ~20 s; afterwards the looks differ by state, camera and relief.

## Energy, camera, rhythm

Energy raises growth speed, injection, structure contrast and audio influence (structure and motion, not brightness); windows grow denser with `u_level`. The camera follows a closed yaw arc over 240/96 seconds and drifts its focus across the periodic field (exact wrap); the kick widens the lens by at most 1.5 %. Gestures: reaction-front light on the threads (4 beats), a chemical concentration band (8 beats), and a bounded local feed injection (16 beats, simulation).

## Cost and limits

Current paired native M3 Pro probe (same browser/engine, alternating baseline `7a50d46` and final, median of three 40-frame runs): whole-frame p50 **3.3/3.3/4.0 → 3.0/2.9/2.9 ms at 1080p**, **9.3/10.1/11.9 → 6.5/6.8/8.0 ms at 4K** (Understory/Tide/City). Every state is faster. The stock profiler and every raw pair are retained in the fleet output; these are synchronous shared-GPU throughput measurements, not venue cadence. The brush and feed land in simulation space, not under the pointer, because the view is a moving perspective. Far field is fogged to hide minification aliasing; windows are hashed per block and shown only within reach. Colour is the palette's.

## Wave 2 polish (2026-10-14)

- **Colour range:** bodies are two-tone. Tops take palette 0.22–0.8 and flanks lean to secondary; a slow regional field across the terrain shifts the mix, and threads follow the same regional palette. Under the default palette the terrain now reads lime and blue rather than olive only. Ember (copper/bronze) and Glacier (steel/ice) films are in `artifacts/films/mycelium-ember.mp4` and `mycelium-glacier.mp4`. `world-film.mjs` gained `--palette <library id>`.
- **Darker City at low energy:** in City the key light rakes at low energy (elevation 0.16) and climbs to 0.62 at full energy. Long shadows leave Lantern City at mean luminance 0.013 at energy 0.1 (previously about 0.04), with 0.027 at 0.5 and 0.043 at 0.9. This is a lighting-structure change, but it does raise brightness with energy in City; other states keep a fixed key.

## Wave 5 first pass (2026-10-15, historical; superseded below)

Saved-world IDs, state/preset names, seeds, schema, chemistry and simulation are unchanged; `worlds.mjs` does not need migration. The periodic field is now presented as a finite elliptical colony rather than an edge-to-edge wallpaper. The colony's smooth envelope shares the continuous camera focus, so the chemical field still drifts and develops without a reset. City rises to 0.155 world units (formerly 0.050), with a shallow central crown, softened terraces, three contact-shadow taps, wet specular edges and rarer HDR lantern windows. Understory now has lit tissue behind its filaments; Tide/City carry antialiased contour-following gills. All ground colour is palette-derived.

Improvement rounds: (1) isolate the colony and triple the top-state relief; (2) repair the raised crown's normals/shadows, add stronger rim/specular light, refine silhouette tracing; (3) expose tissue/gills, reduce accent coverage and skip all empty-colony texture work; (4) use development-dependent tracing rather than paying the top-state cost throughout; (5) use hardware bilinear byte decoding plus an explicit nearest simulation stencil, allowing **10/16/40** coarse samples and **eight bisections** for substantially cleaner silhouettes at lower cost. GPU readback of all **245,760 simulation bytes** at every state and both resolutions against `deaaae1`: **zero differences**. Palette regions are colony-relative and lantern hashes use periodic UVs, so the camera's 560/1330-second torus wraps cannot jump their lighting. Conservative slab/ellipse rejection never removes a potential hit. Derivatives remain outside the marching branch.

Native shared-M3-Pro measurements are noisy: original 1080p p50 **3.3/3.4/3.2 ms**, initial rework **2.8/3.0/3.1 ms** (Understory/Tide/City). Original 4K **7.8/9.2/8.6 ms**. To separate GPU contention from shader cost, the same-engine alternating-order probe repeats three adjacent baseline/final pairs (40 measured frames each): 1080p **2.9/2.7/2.8 → 2.4/2.4/2.6 ms**; 4K **9.7/10.5/9.9 → 8.5/9.0/9.7 ms**, all states faster. One isolated 1080p Understory final sample was externally contended (11.1 ms); the two adjacent repeats were 2.3/2.4 ms. The median-of-three result is reported without deleting the outlier. Raw original and repeated results are kept, not discarded. Evidence lives in the `rework-organic/output/mycelium/` fleet directory (baseline/final films, energy ladder, palette/portrait films, raw profiles). Remaining limitation: the finite 320×192 chemical field still bounds silhouette detail; it is not a fully volumetric fungus simulation.

## Next-round landscape rework (2026-10-15)

L0 correctly rejected the finite colony as a petri dish in black. Four filmed passes now replace that presentation without changing world/look/preset IDs, seeds, schema, the exact simulation shader, grid or step count:

1. Replace the finite disc with an unlimited periodic field, a low camera, depth fog and drifting depth-tested spores. Weakness: nearest walls completely blocked City.
2. Carve a smooth local avenue, raise the City eye, concentrate tessellation into the visible frustum and make HDR windows smaller. Weakness: foreground contours were visibly coarse.
3. Increase the carrier to 384×224 cells, soften terraces, add transmitting primary light and stronger contour rims. The terrain still surrounds the camera rather than fitting inside an island.
4. Restore all legacy parameter responses, remove the unused marching shader, and verify three palettes, portrait, reversal and long-show seams. No engine or registry changes.

Fixed topology has **516,096 terrain vertices + 576 spore vertices**. The mesh is allocated only on seed changes; development only changes uniforms. Camera-relative clearance and fog are continuous, and all field/lighting coordinates remain equivalent at the torus wrap. Fine chemical detail is still sampled per fragment. Normals use filtered chemical gradients; this is an authored membrane landscape, not individual biological mushrooms or a volumetric growth model. Some near silhouettes remain visibly limited by the finite 320×192 chemical field and carrier tessellation. Honest rating against the filmed Abyssal Bloom reference: **7.5/10**, not 9.

Evidence root: `/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/rework-organic/output/`; baseline/final `mycelium.mp4` and `mycelium.png`, retained round contact strips, `paired-profile.json`, `stills/`, all-look `ladder/`, and extra Ember Night Membrane film.

## Verification

`tests/mycelium.test.mjs`: acid shader hashes unchanged, continuous-world detection, chemistry within acid's clamps, HISTORY upgrade of the acid-based definition, and a CPU mirror proving every ordered instant jump between states keeps a living field and an empty field regrows. Pixel comparison of all six acid looks against 32ea153 (`compare-family-pixels.mjs --families acid --times 0.5,4`, three energies): 36 comparisons, max difference 0. Ladder, world film and a Night Membrane look film were reviewed on the native GPU.
