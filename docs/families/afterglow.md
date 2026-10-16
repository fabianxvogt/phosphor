# Afterglow Garden

**Exploratory / empirical.** World `garden`, family `afterglow`, number 100.
An artistic Gray–Scott meadow, not simulated botany. Round 6 addresses the
independent r5 review (L7/G8.5/E7.5): foreground composition, rounded petal
material, centre-origin pollen without a targeting ring, and visible local
flower gestures. World/state IDs, eight look names/seeds/parameters, schema
and every authored rhythm step remain unchanged.

## Algorithm and continuous identity

The shared `morphogenSimulation()` runs a 384² periodic U/V field, two steps per
tick. Simulation stencils explicitly fetch nearest texels; display samples
linearly filtered 16-bit values. Codec `gray-scott-uv16-v1` carries traces from
Evolution, Acid and Mycelium. Sparse spore rain repairs empty regions; nutrient
hits seed a bounded in-view packet once, including restrained hits.

| State  | F    | k     | Dv  | Form                                               |
| ------ | ---- | ----- | --- | -------------------------------------------------- |
| Roots  | .032 | .0585 | .50 | Rounded sleeping buds among backlit grass and moss |
| Petals | .034 | .0612 | .47 | Taller lantern cups, uneven clustered heights      |
| Bloom  | .036 | .0625 | .47 | Overlapping lobes and sparse larger hero crowns    |

A 64×192 RGBA32F data pass finds strict local V maxima within five texels,
refines positions quadratically and measures prominence/Hessian anisotropy.
Each maximum owns a flower; moderate anisotropy pinches its head/core during
spot division. A third row caches continuous per-spot character. Development
never rebuilds geometry or resets chemistry; reversal preserves identity.
Without float targets, concentration-driven lanterns use the explicit byte
decoder instead. The real fallback is compiled by the family verifier.

The full-resolution background supplies palette-only dusk, quiet clouds,
parallax ridge, stars and matte moss/root tissue. Two tapered curved grass
blades per finder cell keep breakdowns populated independently of maxima.
Opaque flowers/grass occlude the irregular pollen spill on the soil.

## Material, framing and energy

The default palette retains deep-blue petals, lime throats and local pink
releases. Six curved elliptical laminae replace polar blade sectors. Twelve
cosine-spaced longitudinal intervals resolve rounded ends; four cross intervals
supply rolled edges and a central fold. Endpoint normals use interior samples
to avoid degenerate tip derivatives. Dark attachments, directional shading,
branch veins and blue edge transmission retain saturated shadow tissue. Smaller
textured cores avoid the old hanging-disc appearance; pink event petals keep
the same fold/directional shading rather than becoming flat accent fills.

Shallower camera pitch (.08→.20 radians) and continuously shorter near stems
put substantial crowns into the lower frame. Near-field petal scale increases
smoothly, including sleeping buds; seeded cluster scale and chemical ownership
remain intact. Top/side clearance protects defining crowns while shaded lower
lobes may overlap the lower frame. The conservative frustum bound includes the
larger crowns and pollen. Ground black level is not globally raised.

Energy changes opening, growth, wind and ambient mote population, not master
brightness. Glowing Roots / Opening Petals / Crowns at Dusk retain seed 5607
and identical non-development parameters. Root Horizon, Petal Field, Halfway
to Bloom, Lantern Orchard and Low Bloom retain their authored identities.

The camera translates one field period every 96 seconds with periodic weave,
yaw and a small 64-second crane. Eye height remains .12–.26 world units; kick
lens punch remains 1.2%. Near plants retract continuously before entering the
eye. Portrait, reversal and 43,200-second frames are checked.

## Rhythm

Presets: **Sleeping petals**, **Nectar paths**, **Midnight flowering**.
Densities remain **2.8 / 6.5 / 10.3 hits/bar**, with original syncopation and
2/3/4-bar polyrhythms. No transport, envelope or shared scheduler changes.

- **Vein pulse**, slot 0: an independent count-moving near patch receives one
  bounded stem→midrib→branch/margin packet. Stem width no longer inflates and
  stem emission is quieter; the visible emphasis is the branching petal veins,
  not lime electric needles. There is no full-field brightness multiplier.
- **Petal-cohort light**, slot 1: a separately count-moving near patch opens,
  bows and relaxes with a bounded .8 flex and local blue transmission. Narrow
  chemical-tone selection was removed from both display gestures because it
  could miss every foreground hero. Chemical identity itself is unchanged.
- **Local morphogen feed**, slot 2: one amplitude-weighted seed packet, plus
  the retained small count-selected feed highlight.
- **Pollen rising**, slot 3: count moves a narrow patch ahead of the camera.
  Selected crowns unfurl pink and release three tapered eight-segment curves
  with soft airborne heads. Each curve starts at that flower's actual core,
  drifts laterally and fades upward; the envelope controls lift and recovery.
  The clean expanding ellipse is removed. Only grain/chemistry-modulated spill
  remains beneath emitting flowers, occluded by opaque geometry. Additive tail:
  180 vertices (previously 90), no new pass or trigger.

Zero-based pollen steps: restrained **0,24**, division 2, duration 3 beats;
driving **14,28**, division 2, duration 2.75; accented **12,30,44,60**, division 4,
duration 2.5. Events settle before the next hit. No full-screen white;
`flash-limiter.mjs` is unchanged and enabled in the family verifier.

## Verification and cost (r6)

M3 Pro native synchronous whole-frame throughput including post, 40 samples per
type; these are not venue display cadence. Roots / Petals / Bloom:

| Resolution | p50 ms             | p95 ms             |
| ---------- | ------------------ | ------------------ |
| 1920×1080  | 5.6 / 6.5 / 6.5    | 8.9 / 9.9 / 9.8    |
| 3840×2160  | 12.7 / 13.0 / 13.0 | 14.5 / 17.7 / 14.4 |

Absolute p50 budgets pass. Interleaved ABBA against main `7c6257b` gives
1080p **+50.0% / +60.5% / +56.4%** and 4K **+41.0% / +42.9% / +41.3%**.
The +5% relative gate **fails**: denser curved near petals and longer trails
have a real cost, not merely contention. Full-resolution output is retained.

`npm test`: **1001 pass, 21 opt-in skips, zero failures**. Typecheck, build,
native DE/EN i18n and touched-file Prettier pass. Family tests cover chemistry
survival/division, identity, all presets, slot 3, density, rooted trail topology,
elliptical tip sampling, stable normals, framing and bounded causal packets.
World-rhythm and flash tests pass. No shared engine or limiter edits.

`PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-afterglow.mjs --rig --port 48481
--out artifacts/garden-r6-verify` checks all eight looks at .1/.5/.9 energy,
portrait, reversal and 12-hour time: 27 populated frames, zero GL/GPU/non-finite
errors, persistent identity and real no-float fallback compilation. Isolated
limiter-enabled driving sequences show vein travel, cohort opening/relaxation
and pollen release with frozen camera/chemistry. Six ages read left→right,
top→bottom: 0/.12/.28/.46/.68/1 of the original event duration.

Five intermediate film rounds plus final refinement/recapture are recorded in
`.claude/world-polish/plans/garden-r3.md`. Final evidence:
`artifacts/look-review/garden-r6/` (film, sheets, grids, detail and isolated
sequences). Ember/Glacier films are in `garden-r6-ember/` and
`garden-r6-glacier/`; all three palettes and individual peak stills were read.

## Still weak

Self-assessed look **7.5–8**, not independent acceptance. Strongly tilted/dividing
petals can still look leaf-like, far cards repeat, and the finest pollen trails
are subtle at thumbnail scale. Near layering and visible local secondary
responses are stronger, but the denser mesh costs 41–61% against main. The
independent reviewer decides whether this reaches the owner's bar.
