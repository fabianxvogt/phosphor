# Starling Flock · Dusk Murmuration / Abendschwarm

**INCREMENTAL / EMPIRICAL**, round 3, 2026-10-16. Family **88**,
`murmuration`, **Loose → Surge → Formation**. All seven look names, seeds,
schema keys and world/state IDs are unchanged. Authored flock dynamics,
not a calibrated biological model.

## One persistent flock

32,767 birds, twelve mesh vertices each, four RGBA8 texels per bird for
16-bit position, velocity, startle timer and bank. Each bird keeps eight
symmetric neighbours on a 256×128 toroidal lattice. Alignment, separation
and rest-length springs are topological, not a spatial collision search.
A newly firing neighbour propagates startle one lattice cell per tick;
a one-second refractory timer prevents continuous retriggering.

Two uint32 phases integrate motion and formation-cycle rate independently.
Every time mode has an integer harmonic; fractional cycle edits alter rate,
not phase. Development changes **forces**, never bird positions or IDs.

- **Loose / Evening Roost:** weak tracking of a broad, folded sheet with
  cruising and loose neighbour coupling. The reset already belongs to the
  flock; it does not begin as an unrelated dust sphere.
- **Surge / Surging Cloud:** stronger sheet tracking and alignment. The
  falcon locally scatters the sheet; neighbour alignment closes it again.
- **Formation / Vortex Mill:** stronger springs guide the same birds into a
  breathing scroll, then trefoil ribbon and two-strand twister. The inherited
  formation-cycle fader continuously blends these targets.

Cross-sheet sampling is now `0.7s³ + 0.3s`, rather than cubic-only: half the
transverse lattice occupies 23.75% of the half-width, preserving a dense core
without leaving a thin noodle outline. Width breathes along the sheet.
The loose/surge sheet follows the slow view-relative yaw, like the formation,
so its broad side does not disappear through foreshortening. CPU reference
`murmuration-model.mjs` matches the changed targets.

Other looks retain their original parameters: **Falcon Hour** (strong hunt),
**Knotted Ribbon** (higher ribbon view), **Twister** (vertical funnel),
**High Cloud** (high, slower view).

## Light, framing and energy

Near-black, oriented, flapping bird silhouettes against palette-only dusk.
The sky's former high-contrast sine bands are now quieter multiscale cloud
fields; saturated primary/secondary mixing replaces the former white-heavy
sky. The lake, distant wooded silhouettes and foreground reeds give scale.
Treeline width/crown variation breaks the previous regular scallops.
These remain analytic landscape layers, not volumetric terrain.

The low orbit and bounded 18% dolly remain. Eye elevation no longer follows
formation/dive; late forms stay above the shoreline instead of sinking into
it. Kick lens change remains at most 2%. Tall output gets a bounded focal
fit (0.759× at 9:16), applied identically to sky and birds; landscape is
unchanged. This was added after the portrait reversal revealed edge crops.
Output-resolution AA and image-plane bird LOD are retained. Birds have a slightly larger physical span and a 4 px
minimum span at 1080p; outer-edge coverage is darker. Distant wings keep the
banking-area change, rather than remaining constant dots.

Energy reveals 55–100% of the same seeded population continuously by size,
changes speed, fold and hunt strength, not exposure. Reversal preserves
simulation state and both clocks. The backlit sky intentionally occupies
more luminous area than an emissive-on-black world; there is no white flash.

## Four rhythm tracks

1. **Sun glint** (`x`): previously declared but not used by the shader; now
   lights a count-selected longitudinal feather cohort, not the whole flock.
2. **Startle wave** (`y`): seeds a guaranteed small lattice patch, rather than
   an often-empty world-space point. Real neighbouring birds bank, narrow
   their projected wings and catch a stronger turning rim.
3. **Falcon strike** (`z`): retains the local scatter/startle. The hunter now
   remains visible outside Surge, with a local accent feather response.
4. **Wing front / Flügelfront** (`w`, slot 3): a narrow primary/silver feather
   front travels along persistent flock longitude as the envelope falls.
   It banks the same wings and launches one real neighbour wave from each
   consumed `u_rhythmHit.w`; `u_rhythmCount.w` selects its origin. No camera or
   full-frame brightness modulation. Shared flash limiter is unchanged.

Three presets retain their names. Positions below are **one-based loop
steps**, not beat numbers:

| Preset        | Wing-front loop        | Hits                         | Duration   | All-track hits/bar |
| ------------- | ---------------------- | ---------------------------- | ---------- | -----------------: |
| Dusk wings    | 32 eighths / 4 bars    | 23, 32                       | 0.8 beats  |               3.25 |
| Turning flock | 32 eighths / 4 bars    | 5, 8, 11, 15, 21, 24, 28, 32 | 1.1 beats  |               7.25 |
| Falcon shadow | 32 sixteenths / 2 bars | 4, 9, 13, 23, 26, 30         | 0.65 beats |               11.5 |

Fast wing glints fill the grid while structural startles and falcon events
keep recovery space. The driving front was lengthened after film review:
short flashes looked like isolated glints rather than a travelling turn.

## Cost and reusable data

No extra birds, geometry, simulation steps or passes. Existing optional
512×129 RGBA32F data (~1 MiB) holds camera basis and angular cloud/ridge
**data**, never a cached colour image. Hardware float-linear, explicit
four-fetch interpolation and analytic fallbacks remain intact. No engine
changes in round 3.

Apple M3 Pro / ANGLE Metal, synchronous whole-frame throughput including
post, not venue cadence; other fleet lanes shared the GPU:

| State     | 1080p p50 / p95 | 4K p50 / p95 | 1080p paired p50 delta vs main |
| --------- | --------------: | -----------: | -----------------------------: |
| Loose     |    2.5 / 2.6 ms | 6.2 / 7.4 ms |                          −3.7% |
| Surge     |    2.7 / 2.8 ms | 6.0 / 6.3 ms |                          −7.4% |
| Formation |    2.8 / 2.9 ms | 6.2 / 6.9 ms |                          +6.9% |

Interleaved ABBA pair: 64 frames/candidate/state. Both absolute p50 budgets
pass. **1080p paired regression gate does not pass**: Formation is +6.9%
on replay (3.1 vs 2.9 ms); the script exits nonzero above +5%. Its first,
more heavily contended run was +13.8% / −18.2% / +10.1%, with Formation at
7.6 vs 6.9 ms. Retain both, rather than selecting a favourable run. Earlier
pre-portrait runs were neutral/faster, so a quiet integration rerun is needed.
The 4K replay passes, with deltas −6.7% / +1.8% / −3.0%.

Profiles: `artifacts/murmuration-r3-profile-{1080,4k}/`;
first pair `artifacts/murmuration-r3-pair/contended-profile.json`;
replays `artifacts/murmuration-r3-pair-replay/` and
`artifacts/murmuration-r3-pair-4k-replay/`. These are throughput probes,
not venue cadence qualification or evidence of an intrinsic optimisation.

## Verification and evidence

- `npm test`: 956 passed, 21 opt-in skipped, zero failures (977 total).
- Family + world-rhythm + pipeline-flash: 50/50 passed. Checks include
  fixed neighbours, bounded reversible development, exact wave travel,
  finite target spread, slot convergence, periodic seams, LOD/energy reveal,
  diamond-chart inversion, 12-hour phase integration, four slots, preset
  grid density and a regression against negative-base GLSL `pow`.
- Typecheck, production build and native DE/EN i18n checks pass.
- `scripts/verify-murmuration.mjs --rig --port <P>`: 33 native captures,
  energies 0.1/0.5/0.9 × three states × Ember/Glacier/Phosphor, five portrait
  looks, continuous reversal and actual uint phases at 12 h + 7 s.
  Limiter stays enabled; zero GL errors/non-finite uploads, no empty frames.
  Evidence: `artifacts/murmuration-r3-verification/verification.json`.
- Four filmed iteration rounds. Round 3 exposed undefined negative-base
  `pow` in a width modulation; fixed by multiplication and filmed again.
  It is not accepted evidence.
- Final reviewer film/sheet/rhythm/grid:
  `artifacts/look-review/murmuration-r3/`. Extra palette films and portrait
  reversal: `artifacts/look-review/murmuration-r3-extra/`.

## Remaining limits

Self-assessed look **7.5/10**, not an independent pass. The broader living
mass, stable shoreline and visible local wing-front improve the baseline,
but the top-state knot remains authored; silhouettes can resemble a folded
fabric at distance. The landscape is illustrative, distant birds remain
coverage-thickened, and overlap can shimmer. No non-neighbour collision
search or true depth compositing of AA edges. The falcon is still small;
its scattered local response is easier to see than the hunter itself.
