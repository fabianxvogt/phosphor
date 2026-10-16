# Afterglow Garden

**Exploratory / empirical.** World `garden`, family `afterglow`, number 100.
An artistic Gray–Scott meadow, not simulated botany. Round 4 addresses the
independent r3 review (L6.5/G7.5/E6): sleeping foreground, local pollen events,
material hierarchy and readable secondary gestures. IDs, three states, eight
look names/seeds/parameters, schema and all rhythm patterns remain unchanged.

## Algorithm and continuous identity

The shared `morphogenSimulation()` runs a 384² periodic U/V field, two steps per
tick. Simulation stencils explicitly fetch nearest texels; display samples
linearly filtered 16-bit values. Codec `gray-scott-uv16-v1` carries traces from
Evolution, Acid and Mycelium. Sparse spore rain repairs empty regions, while
nutrient hits seed a bounded in-view packet once, including restrained hits.

| State  | F    | k     | Dv  | Form                                               |
| ------ | ---- | ----- | --- | -------------------------------------------------- |
| Roots  | .032 | .0585 | .50 | Pointed sleeping buds among backlit grass and moss |
| Petals | .034 | .0612 | .47 | Taller lantern cups, uneven clustered heights      |
| Bloom  | .036 | .0625 | .47 | Separate curled petals, sparse larger hero blooms  |

A 64×192 RGBA32F data pass finds strict local V maxima within five texels,
refines positions quadratically and measures prominence/Hessian anisotropy.
Each maximum owns a flower; moderate anisotropy pinches its head/core during
spot division. A third row caches continuous per-spot character. Development
never rebuilds geometry or resets chemistry; reversal preserves identity.
Without float targets, concentration-driven lanterns use the explicit byte
decoder instead. The real fallback is compiled by the family verifier.

Full-resolution background: palette-only dusk, layered quiet clouds, parallax
ridge, stars and matte moss/root tissue. Wet specular pools were removed:
their projected bands read as oily ellipses and dark wedges. Opaque geometry
adds two tapered, curved grass blades per finder cell, independently of whether
that cell currently owns a chemical maximum. This keeps breakdowns populated.

## Material, framing and energy

Blue petals, lime throats and rare pink dividing cores/events remain the own
palette hierarchy. Pointed closed buds open continuously into separate petals;
petal aspect/curl, clustered hero scale and stem height vary continuously with
the chemical spot position. Directional shading, midribs, branching veins,
translucent margins and fresnel rims give the heroes surface structure. Reduced
broad emission and a saturated highlight shoulder prevent milky near blooms.

Energy changes openness, chemical growth, wind and mote population, not master
brightness. Glowing Roots / Opening Petals / Crowns at Dusk retain seed 5607
and identical non-development parameters. Root Horizon, Petal Field, Halfway
to Bloom, Lantern Orchard and Low Bloom retain their authored identities.

The endless camera translates one field period every 96 seconds, weaves and
yaws on exact periodic paths, and cranes within .12–.26 world units plus a
small 64-second phrase breath. Pitch varies .12–.28 radians, without cuts or
shake; kick lens punch is 1.2%. Clearance retracts near plants continuously.
Portrait and a 43,200-second frame are explicitly checked. All colour derives
from the selected palette; default, Ember and Glacier films were read.

## Rhythm

The reviewed world-specific presets and their original syncopation/2–3–4-bar
polyrhythms are preserved: **Sleeping petals**, **Nectar paths**, **Midnight
flowering**. Family densities: **2.8 / 6.5 / 10.3 hits per bar**.

- **Vein pulse**, slot 0: a bounded depth front lights stems and actual petal
  margins/midribs, independently of broad bloom emission.
- **Petal-cohort light**, slot 1: a count-selected population physically flexes
  and opens its petals, with understated local light.
- **Local morphogen feed**, slot 2: one amplitude-weighted chemical seed packet;
  a count-selected population also catches a small feed highlight.
- **Pollen rising**, slot 3: count moves a narrow patch ahead of the camera.
  That cluster grows/open-flushes pink, an expanding pink/gold ground ring
  marks its origin, and twelve soft motes per selected flower travel on curved
  spreading paths with envelope-driven lift/fade. Minimum screen-scaled radius
  gives approximately 4-pixel soft cores at 960×540, not one-pixel rain streaks.
  The emitting patch projects below one-third of the landscape review width;
  the deliberately expanding ground ring is wider. Ambient fireflies are sparse.

Zero-based pollen steps: restrained **0,24**, division 2, duration 3 beats;
driving **14,28**, division 2, duration 2.75; accented **12,30,44,60**, division 4,
duration 2.5. All envelopes settle before the next event. No full-screen white;
shared `flash-limiter.mjs` is untouched and enabled in the visual verifier.

## Verification and cost (r4)

M3 Pro native synchronous whole-frame throughput including post, 40 samples per
type, not venue display cadence. Roots / Petals / Bloom:

| Resolution | p50 ms            | p95 ms             |
| ---------- | ----------------- | ------------------ |
| 1920×1080  | 3.9 / 4.5 / 4.3   | 4.3 / 4.8 / 5.0    |
| 3840×2160  | 8.0 / 10.3 / 10.8 | 13.0 / 11.7 / 14.0 |

All absolute p50 budgets pass. Interleaved ABBA against main `010103b` gives
1080p deltas **−4.6% / +7.9% / −10.2%** and 4K **+21.1% / +8.2% / −4.0%**.
The pair tool's +5% regression gate therefore fails for Roots/Petals; report
that honestly. The first pair's Roots samples were fleet-contention inflated
(13.0→12.4 ms); the separate absolute probe above is substantially quieter.
Grass adds 36 opaque vertices per cell; twelve motes reuse the old pollen tail's
72 vertices, so no additional particle pass or reduced-resolution image exists.

`npm test`: 967 pass, 21 opt-in skips, zero failures. Typecheck, build, native
DE/EN i18n and family-owned Prettier checks pass. Family tests cover chemistry
survival/division, continuity, maxima ownership, preset validation, original
Evolution shader hashes, bounded camera, opaque grass/mote template, local
patch projection and required rhythm density. Focused world-rhythm/flash tests
pass. `scripts/verify-afterglow.mjs --rig --port 48480` captures all eight looks
at .1/.5/.9 energy, portrait, reversal and 12-hour time: 27 populated captures,
zero GL/GPU/non-finite errors, persistent identity and fallback compilation.

Four change/capture/read/critique rounds are recorded in
`.claude/world-polish/plans/garden-r3.md`. Final review evidence:
`artifacts/look-review/garden-r4/` (film, sheet, rhythm, grids), with
`garden-r4-ember/`, `garden-r4-glacier/` and `artifacts/garden-r4-verify/`.

## Still weak

Self-assessed look **7.5**, not independent acceptance. The sleeping foreground
remains intentionally dim; distant billboard flowers repeat, and some closed
heads retain a slightly papery silhouette. Warm palettes have paler throats.
Chemical maximum births/deaths can still expose small plant handovers.
Independent re-scoring is required before claiming the owner's ≥8 bar.
