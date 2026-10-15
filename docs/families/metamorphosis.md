# Living Forms

**INCREMENTAL / EMPIRICAL**, 2026-10-12. A playable connected surface deformation, adapted from the owner-approved transformation study. It is geometric choreography, not a biological growth model.

## Recognisable transformation

A seed creates eight centres, a connected branching tree and radial surface sectors. Development 0 shows thin filaments; at 1 adjacent sectors fill into membranes; at 2 those same sectors open and curl into petals. Intermediate positions are playable in either direction. Positions, connections and mesh allocation remain fixed throughout a development; only uniforms and vertex positions change. A new seed creates another arrangement.

Unfolding Garden uses three seed-112 states. Its Development slider takes over immediately; a state button schedules a smoothstep deformation on the shared beat clock over 4, 8 or 16 bars. Speed affects sway, not musical duration. Pause holds geometry, time and transition phase; paused edits redraw without advancing motion. Handoff preserves development and the original easing phase, while the new renderer creates its own equivalent mesh.

## Controls and rhythm

Living sway, Motion speed and Surface light are the live faders. Energy shapes sway within its declared range; Surface light remains a user-controlled material gain, not an energy-brightness mapping. Shared palette and global rhythm/postprocessing apply normally. Family tracks illuminate branch ancestry, membrane edges and centres; these are visual accents, not topology changes.

The six catalog looks cover the three forms and three seeded arrangements. Continuous-world detection requires the same family, seed and all non-development parameters across states. Incompatible/custom worlds retain ordinary transitions.

## Implementation and limits

`metamorphosis-geometry.mjs` builds deterministic interleaved triangle vertices. `scene-metamorphosis.mjs` owns vertex deformation, surface normals/shading, background, presets and rhythm. The engine's optional geometry pass uses a depth attachment and one VAO/VBO per slot; changing development does not allocate textures or rebuild the mesh. Normal slot disposal owns all resources.

The finite mesh has fixed spatial resolution; this does not guarantee collision-free surfaces, botanical correctness or physically based lighting. Shared palette recolouring of catalog images is approximate, as elsewhere. Native external-display 4K cadence and full-night endurance have not been measured for this new family; it remains a draft family.

## Wave 5 rework (2026-10-15)

All world/state/look IDs, six preset names/seeds and schema keys are preserved. `worlds.mjs` is untouched. The same eight seeded centres now have a clear hierarchy: one large blossom plus seven smaller scale cues. Their connected ancestry and attributes remain fixed through every development/reversal. Broad curled petals rise over the connecting stems instead of intersecting them. Filaments have rounded cross-sections; membrane sectors meet exactly; the final blossom is over 30% larger in 3D extent than its membrane.

Three improvement rounds: (1) replace the orthographic diagram with perspective/parallax, a dominant hero and much higher petal tips; (2) add contact darkening, palette-only two-sided tissue, backlight, wet specular glints, distance atmosphere, filtered vein detail and rare HDR centres; (3) broaden the calyx, round the filaments, illuminate the persistent centres, add a dark receiver plane, and give the entire camera a closed ±20° arc. A fourth framing check reduced the lens to 2.75 so the seed-2451 hero also fits portrait at maximum sway/kick. Camera motion is fixed-rate and continuous; rate-dependent sway/veins still use the existing 50π clock. The edge gesture also gives tips a bounded 0.025-radius lift. No engine changes.

Static tessellation falls from **281,472 to 143,232 vertices**, paying for perspective and materials without reducing output resolution. Original native p50 1080p **1.8/1.9/1.7 ms**, 4K **4.3/4.3/4.2 ms**. Same-engine alternating-order reference/final probe: 1080p **1.7/1.6/1.7 → 1.6/1.6/1.6 ms**, 4K **3.6/4.0/3.8 → 3.6/3.8/3.8 ms**. Final stock probe after the portrait-safe lens: 1080p **1.5/1.6/1.8**, 4K **4.0/4.3/3.9 ms**. GPU sharing explains absolute run-to-run drift; paired comparisons are all equal or faster. Baseline/final films, strips, Ember look, Glacier portrait and all-look energy ladder are in the fleet `rework-organic/output/metamorphosis/` directory.

`tests/metamorphosis.test.mjs` adds the CPU signature deformation and perspective reference: exact adjacent-sector membrane seams, continuous/reversible geometry with no hysteresis, finite deterministic bounded mesh, saved identity/preset validation, top-state size, and uncropped hero across all authored seeds, both aspects, maximum gestures and late times. Limits: no inter-petal ray-traced shadows, and no physically exact translucency; the branch tree remains visibly geometric.

Verification: `tests/world-development.test.mjs` covers timing, pause/freeze, reversible seek, migration and handoff trajectory. `tests/browser/world-development.html` exercises the real GPU, persistent mesh identity, visible state changes, exact paused pixels, asynchronous flash-limited edits, portrait resize and bounded resources. [Evidence](../EVIDENCE.md#continuous-world-development-2026-10-12).
