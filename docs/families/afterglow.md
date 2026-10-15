# Afterglow Garden

**EXPLORATORY / EMPIRICAL**, 2026-10-14 (wave 2, lane L5). The `afterglow` renderer (number 100) is the continuous world behind **Afterglow Garden**. It replaces the earlier world built from three evolution looks with curated chemistry. It is an artistic Gray–Scott model, not botany.

## Algorithm and signature detail

Evolution's morphogen step (`morphogenSimulation()` in [scene-evolution.mjs](../../scene-evolution.mjs)) runs unchanged on a 384² periodic RGBA8 field with 16-bit U/V (two steps per tick, codec `gray-scott-uv16-v1`, so traces carry from evolution, acid and mycelium). Planting density seeds the buds. The current visual pass samples V onto the fixed perspective-distributed mesh in [organic-landscape.mjs](../../organic-landscape.mjs): 256×160 field cells, a persistent 256×48 radial calyx carrier, plus 96 depth-tested glowing spores. It adds a tall six-lobed calyx to the continuing field instead of multiplying the whole field by the calyx support. Roots/Petals stay full-frame landscapes; Bloom rises from them without losing the horizon. Filtered normals, key/fill lighting, wet specular sheen, HDR contour light and distance fog supply depth. Chemical micro-relief is reduced inside the calyx so its broad petal silhouette remains legible. This is full-resolution mesh shading, not a cached colour image or engine extension.

## Development (one key, no reset)

| State    | Camera                                                                 | Light                                                                          | Chemistry F / k / Dv  |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------- |
| 0 Roots  | Low tracking flight, horizon in frame, afterglow sky band              | Dark tissue, a glowing vein along every crest with a soft halo                 | 0.032 / 0.0585 / 0.50 |
| 1 Petals | Three-quarter view                                                     | Translucent margins, iridescent fresnel rims, petal relief from the gradient   | 0.034 / 0.0612 / 0.47 |
| 2 Bloom  | Close crane above a towering calyx with the field continuing behind it | Thin HDR calyx lip, chemical veins, transmitting tissue and a rare accent well | 0.037 / 0.0605 / 0.46 |

Mycelium travels inside a city. Afterglow starts at the horizon and rises, and it draws light _on_ the reaction ridge rather than lighting bodies from outside. Tissue takes its colour from secondary and accent, and primary is kept for the light, so the two worlds read differently under the same palette.

Chemistry follows development with smoothstep interpolation. A CPU mirror measured the band. The original world's chemistry (0.029/0.057 ↔ 0.03/0.062 ↔ 0.042/0.061) collapsed to below 1% coverage for seconds after an instant jump. An earlier Bloom at 0.039/0.0605 also collapsed to 0% on a 96² torus when jumping back to Roots. The authored band keeps more than 30% coverage after every ordered instant jump on two grid sizes. **Spore rain** (three seeded buds every two seconds, only where a 12-texel ring is dark) regrows an empty garden, because evolution has no sources.

## Looks, energy, rhythm

- **World states:** Glowing Roots, Opening Petals and Crowns at Dusk (seed 5607, planting 6, identical other parameters).
- **Other looks:** Root Horizon, Petal Field, Halfway to Bloom, Lantern Orchard and Low Bloom vary seed, planting, relief, altitude, sway and an in-between development.
- **Energy:** scales growth speed, petal relief and sway (structure and motion).
- **Rhythm:** a vein pulse (4 beats), a petal cohort (8 beats) and a local morphogen feed (16 beats, simulation).

## Cost and limits

Current paired native M3 Pro probe (same browser/engine, alternating baseline `7a50d46` and final, median of three 40-frame runs): **3.4/3.4/3.0 → 2.9/2.9/2.9 ms at 1080p**, **9.9/10.3/9.1 → 6.7/7.1/7.3 ms at 4K** (Roots/Petals/Bloom). No state exceeds the previous cost +5%; all 4K states are substantially faster. These shared-GPU synchronous measurements include post but are not venue cadence.

The horizon state shows the periodic field repeating toward the far distance; fog hides most of it. Glowing Roots measures mean luminance 0.08 at energy 0.1 because of the sky band, which is borderline for the dark-ground rule. The brush and feed land in simulation space.

## Wave 5 first pass (2026-10-15, historical; superseded below)

IDs, all eight presets/seeds, schema and the chemistry/simulation are unchanged. No `worlds.mjs` migration is needed. Roots keeps its horizon flight, but its sky is much darker and entirely palette-derived. The top state now gathers the inherited chemical field onto **one six-lobed calyx** with raised petal tips and a central emissive well, rather than ending as an edge-to-edge noisy carpet. The support contracts geometrically with development (not an opacity dissolve). The polynomial `2[x(x²−3y²)]²−1 = cos(6θ)` supplies the petal silhouette without per-sample atan/cos; the morphogen crests still supply the luminous veins. A short-side camera fit also preserves the complete hero in portrait.

Rounds: (1) add the raised calyx and isolate Bloom; (2) replace an unsatisfactory late dissolve with a continuously contracting support, restore wet reflections and reserve accent for the well; (3) soften chemical micro-relief to keep broad petals distinct from Mycelium's walls, add palette tissue gradients and reduce white/accent coverage; (4) remove redundant tracing and unobservable reflection work to recover the baseline cost. Twenty → ten march intervals with development/seven bisections, two self-shadow taps, and three mirror taps only when Bloom contributes. A fifth round replaced four-fetch manual bilinear decoding with hardware linear filtering: byte decoding is linear, while an explicit nearest `texelFetch` stencil preserves the simulation exactly. GPU readback against `deaaae1` compared all 589,824 state bytes at all three states and both resolutions: **zero differences**. Reflection ripples use garden-relative coordinates so the 260-second periodic camera-focus wrap also remains seamless. No engine changes. This is full-resolution rendering, not a reduced-resolution colour cache.

Original native p50: 1080p **2.2/2.1/2.1 ms**, 4K **6.8/7.2/6.7 ms**. Under the shared fleet GPU, alternating-order same-engine baseline/final pairs (median of 3×40 frames) measured 1080p **2.8/2.6/2.6 → 2.6/2.4/2.0 ms**, 4K **8.6/12.6/8.4 → 7.9/11.3/6.7 ms**. Every state is faster. The Petals 4K run shows external contention clearly (individual baseline/final pairs 8.5→7.9, 12.6→11.7, 12.9→11.3); all pairs improve. All raw measurements, baseline/final films and palette/portrait/ladder evidence are in the fleet `rework-organic/output/afterglow/` directory. Remaining limit: near-horizon roots still resolve a periodic 384² field, not individual volumetric plants; wet reflections are three-tap approximations.

## Next-round landscape rework (2026-10-15)

L0's full-frame Petals → small island regression is fixed. World/state/look IDs, all eight preset names/seeds/parameters, schema and simulation shader remain exact; no `worlds.mjs` migration is needed.

Four filmed passes: (1) keep the entire field and add the calyx, but the camera was too close and the lip cropped; (2) crane back/above the calyx while retaining the horizon, improving scale but exposing excessive chemical micro-relief; (3) suppress that relief only inside the cup, lower the surrounding Bloom field, and replace the broad glowing band with a thin antialiased lip at the actual calyx crest; (4) restore glow/petal/sway fader responses and finish palette, portrait, reversal and performance checks. The central well is a rare accent, not an overall pink wash.

A further 4K close-up exposed a serrated lip on the projected ground carrier. A material-aligned 256×48 radial mesh now places the crest on actual mesh rings; it persists at **every** development, including Roots, so there is no carrier swap when Bloom begins. The distant ground carrier is 256×160; total **320,064 vertices including spores**, lower than the earlier projected carrier. Covered ground fragments are rejected only after all derivatives are defined. Resolution-normalized concentration derivatives replace four extra fragment texture taps. The rejected high-cost/intermediate profiles and pre-ring close-up are retained.

The six-fold radius uses `2[x(x²−3y²)]²−1 = cos(6θ)`. Height is **field + calyx**, never field × contracting support. A conservative camera clearance bound is tested across development, altitude and relief, including low-altitude/high-relief intermediate states. Seed/mesh/simulation identity persists on reversal. Fixed-rate sway changes amplitude, never a time multiplier. Every background and surface colour is palette-derived.

Limitations: the finite morphogen field and mesh still bound near-contour smoothness; the result is an authored glowing calyx rather than physically simulated plant tissue. The former three-tap crown reflection is replaced by wet specular ground, not an exact reflected scene. Honest rating against the filmed Abyssal Bloom reference: **8/10**, not 9.

Evidence root: `/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/rework-organic/output/`; baseline/final `garden.mp4` and `garden.png`, retained iteration strips, `paired-profile.json`, `stills/`, all-look `ladder/`, and extra Glacier Lantern Orchard film.

## Verification

`tests/afterglow.test.mjs` checks:

- evolution's shader hashes are unchanged and `morphogenSimulation()` reproduces them;
- traces carry to and from the field;
- continuous-world detection and preset bounds;
- the HISTORY upgrade of both earlier definitions, while an edited copy is kept;
- the CPU mirror's stability on two grid sizes.

`tests/worlds.test.mjs` keeps its transition tests on a custom copy of the earlier three-look garden. The energy ladder, the world film and an Ember-palette film were reviewed on the native GPU.
