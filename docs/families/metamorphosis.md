# Living Forms

**INCREMENTAL / EMPIRICAL**, 2026-10-12. A playable connected surface deformation, adapted from the owner-approved transformation study. It is geometric choreography, not a biological growth model.

## Recognisable transformation

A seed creates eight centres, a connected branching tree and radial surface sectors. Development 0 shows thin filaments; at 1 adjacent sectors fill into membranes; at 2 those same sectors open and curl into petals. Intermediate positions are playable in either direction. Positions, connections and mesh allocation remain fixed throughout a development; only uniforms and vertex positions change. A new seed creates another arrangement.

Unfolding Garden uses three seed-112 states. Its Development slider takes over immediately; a state button schedules a smoothstep deformation on the shared beat clock over 4, 8 or 16 bars. Speed affects sway, not musical duration. Pause holds geometry, time and transition phase; paused edits redraw without advancing motion. Handoff preserves development and the original easing phase, while the new renderer creates its own equivalent mesh.

## Controls and rhythm

Living sway, Motion speed and Surface light are the live faders. Energy shapes sway/light within their declared ranges. Shared palette and global rhythm/postprocessing apply normally. Family tracks illuminate branch ancestry, membrane edges and centres; these are visual accents, not topology changes.

The six catalog looks cover the three forms and three seeded arrangements. Continuous-world detection requires the same family, seed and all non-development parameters across states. Incompatible/custom worlds retain ordinary transitions.

## Implementation and limits

`metamorphosis-geometry.mjs` builds deterministic interleaved triangle vertices. `scene-metamorphosis.mjs` owns vertex deformation, surface normals/shading, background, presets and rhythm. The engine's optional geometry pass uses a depth attachment and one VAO/VBO per slot; changing development does not allocate textures or rebuild the mesh. Normal slot disposal owns all resources.

The finite mesh has fixed spatial resolution; this does not guarantee collision-free surfaces, botanical correctness or physically based lighting. Shared palette recolouring of catalog images is approximate, as elsewhere. Native external-display 4K cadence and full-night endurance have not been measured for this new family; it remains a draft family.

Verification: `tests/world-development.test.mjs` covers timing, pause/freeze, reversible seek, migration and handoff trajectory. `tests/browser/world-development.html` exercises the real GPU, persistent mesh identity, visible state changes, exact paused pixels, asynchronous flash-limited edits, portrait resize and bounded resources. [Evidence](../EVIDENCE.md#continuous-world-development-2026-10-12).
