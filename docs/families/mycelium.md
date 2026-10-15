# Living Mycelium

**EXPLORATORY / EMPIRICAL**, 2026-10-14 (wave 1, lane L5). The `mycelium` renderer (number 99) is the continuous world behind **Living Mycelium**. It replaces the earlier world built from three acid looks with curated chemistry. It is an artistic Gray–Scott model, not biology.

## Algorithm and signature detail

Acid's Gray–Scott step (`grayScottSimulation()` in [scene-acid.mjs](../../scene-acid.mjs)) runs unchanged on a 320×192 periodic RGBA8 field with 16-bit U/V (8 steps per 60 Hz tick, same stability bounds and codec `gray-scott-uv16-v1`, so traces carry from acid and evolution). The visual pass treats the activator V as a terrain: a perspective camera raymarches the heightfield (12 bilinear steps plus 5 bisections), lights it with a key, a cool fill, a fresnel rim and four-sample self-shadowing, and fades distance into the palette's dark. The labyrinth, its spots and its fronts stay the hero; everything else only lights them.

## Development (one key, no reset)

`development` 0 → 2 is the world's type key. Every value in between is a composed frame; nothing resets the simulation, seed, time or camera phase.

| State          | Rendering                                                                 | Chemistry F / k / Du |
| -------------- | ------------------------------------------------------------------------- | -------------------- |
| 0 Understory   | Near-vertical forest-floor view, low relief, luminous colony-edge threads | 0.027 / 0.058 / 0.80 |
| 1 Tide         | Tilted view, soft wet membranes with specular sheen and rims              | 0.037 / 0.061 / 1.00 |
| 2 City         | Oblique flight, terraced plateaus, one sparse row of lit windows per wall | 0.029 / 0.057 / 0.90 |

Chemistry follows development with smoothstep interpolation, so the pattern itself slowly drifts: broken threads and spores, long lamellae, a closed network. A CPU mirror measured that larger excursions are unsafe: an instant jump from F 0.040/k 0.0605 (or the 0.042/0.059 pore regime) to Understory extinguished the whole field, and even the authored source colonies could not revive it. The authored band survives every instant jump (lowest coverage ≈ 6.6 % after Tide → Understory, regrown to > 50 % within 8 s). **Spore rain** adds a second guarantee: every two seconds three seeded discs land, but only where a 12-texel ring is dark, so a living network is untouched and an extinct region regrows.

## Looks

Hyphal Understory, Tidal Lamellae and Lantern City are the world states (seed 211, composition 5, identical other parameters). Spore Floor, Night Membrane, Tide Turning, Street Plan and Bloom Quarter vary seed, inoculum composition, relief, altitude and an in-between development. Composition only shapes the first ~20 s; afterwards the looks differ by state, camera and relief.

## Energy, camera, rhythm

Energy raises growth speed, injection, structure contrast and audio influence (structure and motion, not brightness); windows grow denser with `u_level`. The camera orbits once per 12 minutes with a ±18° sway over 96 s and drifts the focus across the periodic field (exact wrap); the kick widens the lens by at most 1.5 %. Gestures: reaction-front light on the threads (4 beats), a chemical concentration band (8 beats), and a bounded local feed injection (16 beats, simulation).

## Cost and limits

Native M3 Pro probe (`profile-families.mjs --types`, shared GPU with other lanes, indicative): whole frame p50 5.1–5.6 ms at 1920×1080 (acid 2.4–2.7 ms), 13.5–14.4 ms at 3840×2160 (acid 7.2–9.1 ms). The brush and feed land in simulation space, not under the pointer, because the view is a moving perspective. Far field is fogged to hide minification aliasing; windows are hashed per block and shown only within reach. Colour is the palette's.

## Wave 2 polish (2026-10-14)

- **Colour range:** bodies are two-tone. Tops take palette 0.22–0.8 and flanks lean to secondary; a slow regional field across the terrain shifts the mix, and threads follow the same regional palette. Under the default palette the terrain now reads lime and blue rather than olive only. Ember (copper/bronze) and Glacier (steel/ice) films are in `artifacts/films/mycelium-ember.mp4` and `mycelium-glacier.mp4`. `world-film.mjs` gained `--palette <library id>`.
- **Darker City at low energy:** in City the key light rakes at low energy (elevation 0.16) and climbs to 0.62 at full energy. Long shadows leave Lantern City at mean luminance 0.013 at energy 0.1 (previously about 0.04), with 0.027 at 0.5 and 0.043 at 0.9. This is a lighting-structure change, but it does raise brightness with energy in City; other states keep a fixed key.

## Wave 5 rework (2026-10-15)

Saved-world IDs, state/preset names, seeds, schema, chemistry and simulation are unchanged; `worlds.mjs` does not need migration. The periodic field is now presented as a finite elliptical colony rather than an edge-to-edge wallpaper. The colony's smooth envelope shares the continuous camera focus, so the chemical field still drifts and develops without a reset. City rises to 0.155 world units (formerly 0.050), with a shallow central crown, softened terraces, three contact-shadow taps, wet specular edges and rarer HDR lantern windows. Understory now has lit tissue behind its filaments; Tide/City carry antialiased contour-following gills. All ground colour is palette-derived.

Improvement rounds: (1) isolate the colony and triple the top-state relief; (2) repair the raised crown's normals/shadows, add stronger rim/specular light, refine silhouette tracing; (3) expose tissue/gills, reduce accent coverage and skip all empty-colony texture work; (4) use 8/12/22 coarse samples by development, with six bisections, rather than paying the top-state tracing cost throughout. Conservative slab/ellipse rejection never removes a potential hit. Derivatives remain outside the marching branch.

Native shared-M3-Pro measurements are noisy: original 1080p p50 **3.3/3.4/3.2 ms**, final **2.8/3.0/3.1 ms** (Understory/Tide/City). Original 4K **7.8/9.2/8.6 ms**. To separate GPU contention from shader cost, the same-engine alternating-order probe repeats three adjacent baseline/final pairs (40 measured frames each): 1080p **3.0/3.0/3.1 → 2.8/2.8/2.9 ms**; 4K **10.1/9.7/9.5 → 9.2/8.6/8.4 ms**, all states faster. Raw original and repeated results are kept, not discarded. Evidence lives in the `rework-organic/output/mycelium/` fleet directory (baseline/final films, energy ladder, palette/portrait films, raw profiles). Remaining limitation: the finite 320×192 chemical field still bounds silhouette detail; it is not a fully volumetric fungus simulation.

## Verification

`tests/mycelium.test.mjs`: acid shader hashes unchanged, continuous-world detection, chemistry within acid's clamps, HISTORY upgrade of the acid-based definition, and a CPU mirror proving every ordered instant jump between states keeps a living field and an empty field regrows. Pixel comparison of all six acid looks against 32ea153 (`compare-family-pixels.mjs --families acid --times 0.5,4`, three energies): 36 comparisons, max difference 0. Ladder, world film and a Night Membrane look film were reviewed on the native GPU.
