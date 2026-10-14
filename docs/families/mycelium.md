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

Native M3 Pro probe (`profile-families.mjs --types`, shared GPU with other lanes, indicative): whole frame p50 5.1–5.6 ms at 1920×1080 (acid 2.4–2.7 ms), 13.5–14.4 ms at 3840×2160 (acid 7.2–9.1 ms). The brush and feed land in simulation space, not under the pointer, because the view is a moving perspective. Far field is fogged to hide minification aliasing; windows are hashed per block and shown only within reach. Colour is the palette's: with the default palette the bodies read olive-lime with pink windows.

## Verification

`tests/mycelium.test.mjs`: acid shader hashes unchanged, continuous-world detection, chemistry within acid's clamps, HISTORY upgrade of the acid-based definition, and a CPU mirror proving every ordered instant jump between states keeps a living field and an empty field regrows. Pixel comparison of all six acid looks against 32ea153 (`compare-family-pixels.mjs --families acid --times 0.5,4`, three energies): 36 comparisons, max difference 0. Ladder, world film and a Night Membrane look film were reviewed on the native GPU.
