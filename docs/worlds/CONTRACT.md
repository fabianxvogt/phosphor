# World contract

Owner direction 2026-10-14: grow Worlds from 3 to **10 excellent continuous worlds** with a stronger 3D direction. A world is one living form that develops through authored states, not a playlist of looks. Read [AUTHORING.md](../families/AUTHORING.md) first; this page adds only what a world needs. The look of every world follows [STYLE.md](STYLE.md).

## Shape

A world is one family (`scene-<id>.mjs`) that declares `development: "<key>"`, plus one entry in `AUTHORED` in [worlds.mjs](../../worlds.mjs). [scene-metamorphosis.mjs](../../scene-metamorphosis.mjs) (Unfolding Garden) is the reference.

- **Development key:** one schema field, `min: 0`, `max: N` (N = states − 1, normally 2 or 3), `step: 0.01`. Every value in between is a valid, composed frame, not a crossfade: the form itself morphs. Use it as the `type` key too (`type: { key, values: [0, 1, …, N] }`).
- **States:** at least 3 presets with the **same seed and identical non-development parameters**, development at the integers. `continuousDevelopment()` only recognizes a continuous world when this holds.
- **Extra looks:** at least 3 more catalog looks (other seeds, densities, camera or composition), so the family has 6 or more looks. Each look must be strong on its own in Looks autopilot.
- **Continuity:** changing development never resets time, simulation state, particles, camera phase or seed-derived identity (centres, branches, bodies). The engine rebuilds `geometry` only on a seed change. Reversal must look as good as the forward direction.
- **Any rate:** the show drives development continuously: manual drags, 4/8/16-bar cues, and an upcoming **Auto** mode where builds push forward, drops reach the top state and breakdowns pull back. Expect sweeps from 1 bar to 64 bars and reversals mid-way.
- **Energy is orthogonal:** energy changes motion, density and detail from 0.1 to 0.9; development changes form. Every development value works at every energy.

## Rendering paths

The engine already offers three paths; prefer them over engine changes.

| Path                              | Declare                                                                      | Good for                                                              |
| --------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Fragment (analytic or raymarched) | `fragment`                                                                   | SDF worlds, volumetrics, projected mathematics                        |
| Mesh                              | `geometry: { create(seed), attributes, vertex, fragment }` with depth buffer | Instanced or parametric surfaces, ribbons, shards, crystals           |
| Particles                         | `simulation` + `particles: { vertex }`                                       | Point clouds, swarms, nebulae (256² proven; larger needs measurement) |

The mesh `vertex` stage receives `u_params`, `u_time`, `u_resolution`, `u_rhythm` and the palette uniforms; build the camera matrix in the shader from parameters and time. **Engine extensions** (for example a combined mesh + particles path, more points or a camera uniform) are allowed only when a world truly needs them. Keep them small, optional (declared by the scene), backwards compatible and covered by a test. Report them prominently; L0 integrates engine changes first.

## Registration

1. `scene-<id>.mjs` with a unique `number` from your lane's range (see your brief).
2. Import and register it in [scenes.mjs](../../scenes.mjs); add [family-catalog.mjs](../../family-catalog.mjs) metadata (algorithm, description, styles including `"spatial"` for 3D, variant names = state names).
3. Append the world to `AUTHORED` in [worlds.mjs](../../worlds.mjs). Never reorder existing entries. If you change an existing authored world, append its previous definition to `HISTORY` so saved sets upgrade.
4. German and English strings for every new user-visible name in [i18n/de.mjs](../../i18n/de.mjs) and [i18n/en.mjs](../../i18n/en.mjs); `npm run test:i18n` must pass.
5. Catalog previews: `node scripts/build-catalog-previews.mjs` (check its options), and curated order in `scripts/curate.mjs` / `catalog-curated.mjs` if the family should rank.
6. Rhythm: three `familyEffect` gestures tied to the signature detail (see [RHYTHM.md](../families/RHYTHM.md)).
7. `docs/families/<id>.md` (algorithm, signature detail, states, looks, energy grammar, camera, cost, endlessness, verification) and one row in [docs/CATALOG.md](../CATALOG.md).

Edits to shared files are additive. Do **not** edit `ROADMAP.md`, `README.md`, `docs/EVIDENCE.md`, `docs/DECISIONS.md`, `show.mjs` or the control UI; L0 writes those at integration.

## Verification before handing over

- `npm test`, `npm run typecheck`, `npm run test:i18n`; `tests/<id>.test.mjs` with CPU references for any exact mathematics, continuity checks (identity attributes independent of development) and preset validation.
- Energy ladder: `node scripts/contact.mjs --dist . --sheet ladder --family <id> --rig --port <yours>`.
- Review film for every world: `node scripts/world-film.mjs --world <id> --rig --port <yours>` (30 s: hold, sweep with rising energy, settle). Also film one extra look with `--look "<id>:<Preset>"`. Look at the stills yourself and iterate before handing over.
- Performance: `node scripts/profile-families.mjs --types --family <id>` (check options) at 1920×1080 and `--width 3840 --height 2160`. Budget: ≤ 8 ms per family at 2.1 MP on the M3 Pro; report 4K honestly.
- Zero GL errors, no non-finite values, no black or mostly empty frames at energy 0.1, nothing stalls after long runs (check a late `u_time`).
