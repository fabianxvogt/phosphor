# Afterglow Garden

**Exploratory / empirical.** World `garden`, family `afterglow`, number 100.
An artistic Gray–Scott meadow, not simulated botany. Round 5 addresses the
independent r4 review (L7.5/G7.5/E7): substantial airborne pollen, causal sap
travel/cohort flex, and peak crown framing/material. Sleeping foreground,
local pink opening/ring, quiet dusk and clean ground gaps are retained. IDs,
three states, eight look names/seeds/parameters, schema and all rhythm patterns
remain unchanged.

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
Round 5 lowers supporting-flower emission and far-card rims, narrows the warm
range, and restores cool shadow tissue around sparse heroes. Crown radius
retracts continuously within the available frustum margin: defining crowns do
not meet the left/top border as hard cuts. This is a continuous geometric
framing guard, not a visibility toggle or new camera path.

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

- **Vein pulse**, slot 0: count selects a narrow chemical-tone population.
  One Gaussian packet travels up each selected stem, through its midrib and
  into a short margin segment, leaving dark tissue behind. Only the moving
  packet widens to a screen-scaled luminous core; permanent stems stay thin.
  No simultaneous whole-petal contour multiplier remains. The strong driving
  events traverse stem→petal; softer hits catch shorter distal segments.
- **Petal-cohort light**, slot 1: a separately count-selected population bows
  its stems, tilts and opens its heads, then recovers. A short envelope attack
  avoids a sudden full bow. Adjacent flowers retain only the quiet base wind.
- **Local morphogen feed**, slot 2: one amplitude-weighted chemical seed packet;
  a count-selected population also catches a small feed highlight.
- **Pollen rising**, slot 3: count moves a narrow patch ahead of the camera.
  That cluster grows/open-flushes pink, an expanding pink/gold ground ring
  marks its origin. Fewer selected emitters release three substantial soft
  mote heads, each with a three-segment bent tapered tail. Analytic curve
  tangents keep the tails smooth rather than crossed hatchwork. Mote heads
  have approximately 2–4-pixel luminous cores at 960×540 plus soft falloff;
  envelope controls lift/fade. Twelve existing quads are reused (90 total
  additive vertices including halo/fireflies), with no new pass or triggers.
  The emitting patch projects below one-third of the landscape review width;
  the deliberately expanding ground ring is wider. Ambient fireflies are sparse.

Zero-based pollen steps: restrained **0,24**, division 2, duration 3 beats;
driving **14,28**, division 2, duration 2.75; accented **12,30,44,60**, division 4,
duration 2.5. All envelopes settle before the next event. No full-screen white;
shared `flash-limiter.mjs` is untouched and enabled in the visual verifier.

## Verification and cost (r5)

M3 Pro native synchronous whole-frame throughput including post, 40 samples per
type, not venue display cadence. Roots / Petals / Bloom:

| Resolution | p50 ms             | p95 ms             |
| ---------- | ------------------ | ------------------ |
| 1920×1080  | 4.0 / 5.0 / 4.5    | 5.3 / 7.4 / 6.4    |
| 3840×2160  | 10.1 / 10.4 / 10.3 | 12.3 / 13.7 / 12.5 |

All absolute p50 budgets pass. Interleaved ABBA against main `77bca87` gives
1080p deltas **+2.6% / −5.0% / −2.4%** and 4K **0% / +5.9% / +1.0%**.
The pair tool's +5% regression gate narrowly fails for 4K Petals; no claim of
passing that gate. Shared-fleet contention affects these synchronous probes;
they are not venue cadence. The same detailed template and additive vertex
count remain; only packet-local stem width and fragment/curve work increased.
No additional particle pass or reduced-resolution image exists.

`npm test`: 987 pass, 21 opt-in skips, zero failures. Typecheck, build, native
DE/EN i18n and family-owned Prettier checks pass. The first i18n run omitted
`--native-gpu` (its supported GPU flag) and timed out on software rendering;
the native rerun passed. Family tests retain chemistry survival/division,
continuity, maxima ownership, preset validation and original Evolution hashes;
new checks cover bounded causal sap progression, trail/head topology, flex and
crown framing. World-rhythm/flash tests pass; `flash-limiter.mjs` is untouched.

`PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-afterglow.mjs --rig --port 48481
--out artifacts/garden-r5-verify`: all eight looks at .1/.5/.9 energy, portrait,
reversal and 12-hour time (27 populated captures), zero GL/GPU/non-finite errors,
persistent identity and real no-float fallback compilation. Limiter-enabled
supplementary sheets freeze chemistry/camera and isolate each original driving
track through the production scheduler: `garden-vein-pulse.png`,
`garden-petal-cohort.png`, `garden-pollen-rising.png`. Six ages read left→right,
top→bottom: 0/.12/.28/.46/.68/1 of the original event duration. They make the
fast sap front distinguishable from ordinary wind and parallax.

Four change/capture/read/critique rounds are recorded in
`.claude/world-polish/plans/garden-r3.md`. Final review evidence:
`artifacts/look-review/garden-r5/` (film, sheet, rhythm, grids and isolated
sequences), with `garden-r5-ember/`, `garden-r5-glacier/` and
`artifacts/garden-r5-verify/`.

## Still weak

Self-assessed look **8**, not independent acceptance. Distant billboard flowers
still repeat, and closed heads retain a slightly papery silhouette. The fast
sap front is undersampled by the standard half-beat strip; the isolated
sequence shows its causal path. Warm palettes have paler throats, and chemical
maximum births/deaths can still expose small handovers. The sleeping foreground
remains intentionally dim. Independent re-scoring is required before claiming
the owner's ≥8 bar.
