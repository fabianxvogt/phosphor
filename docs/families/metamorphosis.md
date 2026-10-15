# Living Forms

**INCREMENTAL / EMPIRICAL**, 2026-10-12. A playable connected surface deformation, adapted from the owner-approved transformation study. It is geometric choreography, not a biological growth model.

## Recognisable transformation

A seed creates eight foreground centres plus six distant blossoms, a connected branching tree and radial surface sectors. Development 0 shows thin filaments; at 1 adjacent sectors fill into membranes; at 2 those same sectors open and curl into petals. Intermediate positions are playable in either direction. Positions, connections and mesh allocation remain fixed throughout a development; only uniforms and vertex positions change. A new seed creates another arrangement.

Unfolding Garden uses three seed-112 states. Its Development slider takes over immediately; a state button schedules a smoothstep deformation on the shared beat clock over 4, 8 or 16 bars. Speed affects sway, not musical duration. Pause holds geometry, time and transition phase; paused edits redraw without advancing motion. Handoff preserves development and the original easing phase, while the new renderer creates its own equivalent mesh.

## Controls and rhythm

Living sway, Motion speed and Surface light are the live faders. Energy shapes sway within its declared range; Surface light remains a user-controlled material gain, not an energy-brightness mapping. Shared palette and global rhythm/postprocessing apply normally. Family tracks illuminate branch ancestry, membrane edges and centres; these are visual accents, not topology changes.

The six catalog looks cover the three forms and three seeded arrangements. Continuous-world detection requires the same family, seed and all non-development parameters across states. Incompatible/custom worlds retain ordinary transitions.

## Implementation and limits

`metamorphosis-geometry.mjs` builds deterministic interleaved triangle vertices. `scene-metamorphosis.mjs` owns vertex deformation, surface normals/shading, background, presets and rhythm. The engine's optional geometry pass uses a depth attachment and one VAO/VBO per slot; changing development does not allocate textures or rebuild the mesh. Normal slot disposal owns all resources.

The finite mesh has fixed spatial resolution; this does not guarantee collision-free surfaces, botanical correctness or physically based lighting. Shared palette recolouring of catalog images is approximate, as elsewhere. Native external-display 4K cadence and full-night endurance have not been measured for this new family; it remains a draft family.

## Wave 5 first pass (2026-10-15, historical)

All world/state/look IDs, six preset names/seeds and schema keys are preserved. `worlds.mjs` is untouched. The same eight seeded centres now have a clear hierarchy: one large blossom plus seven smaller scale cues. Their connected ancestry and attributes remain fixed through every development/reversal. Broad curled petals rise over the connecting stems instead of intersecting them. Filaments have rounded cross-sections; membrane sectors meet exactly; the final blossom is over 30% larger in 3D extent than its membrane.

Three improvement rounds: (1) replace the orthographic diagram with perspective/parallax, a dominant hero and much higher petal tips; (2) add contact darkening, palette-only two-sided tissue, backlight, wet specular glints, distance atmosphere, filtered vein detail and rare HDR centres; (3) broaden the calyx, round the filaments, illuminate the persistent centres, add a dark receiver plane, and give the entire camera a closed ±20° arc. A fourth framing check reduced the lens to 2.75 so the seed-2451 hero also fits portrait at maximum sway/kick. Camera motion is fixed-rate and continuous; rate-dependent sway/veins still use the existing 50π clock. The edge gesture also gives tips a bounded 0.025-radius lift. No engine changes.

Static tessellation falls from **281,472 to 143,232 vertices**, paying for perspective and materials without reducing output resolution. Original native p50 1080p **1.8/1.9/1.7 ms**, 4K **4.3/4.3/4.2 ms**. Same-engine alternating-order reference/final probe: 1080p **1.7/1.6/1.7 → 1.6/1.6/1.6 ms**, 4K **3.6/4.0/3.8 → 3.6/3.8/3.8 ms**. Final stock probe after the portrait-safe lens: 1080p **1.5/1.6/1.8**, 4K **4.0/4.3/3.9 ms**. GPU sharing explains absolute run-to-run drift; paired comparisons are all equal or faster. Baseline/final films, strips, Ember look, Glacier portrait and all-look energy ladder are in the fleet `rework-organic/output/metamorphosis/` directory.

`tests/metamorphosis.test.mjs` adds the CPU signature deformation and perspective reference: exact adjacent-sector membrane seams, continuous/reversible geometry with no hysteresis, finite deterministic bounded mesh, saved identity/preset validation, top-state size, and uncropped hero across all authored seeds, both aspects, maximum gestures and late times. Limits: no inter-petal ray-traced shadows, and no physically exact translucency; the branch tree remains visibly geometric.

## Next-round depth rework (2026-10-15)

Four filmed passes retain the approved foreground form and every world/state/look/preset ID, name, seed and schema key. `worlds.mjs` and the engine are untouched.

1. Add six persistent distant blossoms, fog the background forms more strongly, and increase the landscape lens from 2.75 to 3.10. Weakness: the farthest flowers were too high/cropped, and the background still read black.
2. Bring the background blossoms closer/lower, add stronger soft light shafts, and retain the original 2.75 lens in portrait so the seed-2451 hero stays uncropped.
3. Add a second low-contrast mist layer, a broad palette light pool, and stronger backlit petal transmission. The default landscape hero measures **60–80% of the short side vertically**, covered by the CPU projection tests.
4. Verify reversal, frozen mesh identity, three palettes, portrait and late-time GPU seams; compare the final film with Abyssal Bloom rather than awarding an automatic 9.

The final periphery uses 16×6 sectors while the hero keeps 28×12; secondary centre/stem tessellation is also reduced. This pays for the extra scale cues: **143,232 → 93,504 vertices**, no extra passes or engine changes. Secondary blossoms use a cheaper low-frequency material; the hero retains its key/rim/specular shading and longitudinal ribs. Removing redundant fine cross-hatching and replacing trigonometric fog noise with analytic fog layers/Gaussian shafts recovered the performance margin. The final landscape lens is 3.03 (portrait stays 2.75), preserving the tested 60–80% hero height. Sway and veins still use the existing 50π clock. Background mist/shaft phases have fixed low rates.

Same-browser alternating baseline `7a50d46`/final throughput (median of 3×80 frames, native shared M3 Pro): 1080p **2.0/2.0/1.9 → 1.9/1.9/1.8 ms**; 4K **4.9/5.0/5.1 → 4.9/5.1/5.0 ms**. Largest increase is **2.0%**, within +5%. Raw stock and paired profiles are retained, not selectively discarded. This is synchronous throughput, not venue cadence.

The background is deliberately subdued, not a second competing hero. Remaining limits: no inter-petal ray-traced shadows and no physical participating-medium integration; shafts/fog are analytic layers. Honest rating against the filmed Abyssal Bloom reference: **8.5/10**, not 9. Evidence root: `/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/rework-organic/output/`, especially baseline/final `unfolding.mp4`/`.png`, `stills/`, `ladder/`, and the portrait Ember Evening Blossom film.

Verification: `tests/world-development.test.mjs` covers timing, pause/freeze, reversible seek, migration and handoff trajectory. `tests/browser/world-development.html` exercises the real GPU, persistent mesh identity, visible state changes, exact paused pixels, asynchronous flash-limited edits, portrait resize and bounded resources. [Evidence](../EVIDENCE.md#continuous-world-development-2026-10-12).
