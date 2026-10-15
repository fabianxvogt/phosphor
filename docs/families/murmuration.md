# Starling Flock · Dusk Murmuration / Abendschwarm

**INCREMENTAL / EMPIRICAL**, 2026-10-15. Family **88**, scene/world id
`murmuration`, states **Loose → Surge → Formation**. Authored flock dynamics,
not a calibrated biological simulation. All seven preset names, seeds, schema
keys, look ids and the world definition remain unchanged.

## Signature and mathematics

32,767 persistent birds; four RGBA8 texels per bird contain 16-bit position,
velocity, startle timer and bank angle. The clock bird reserves two uint32
phases. One advances motion; the second integrates the formation-cycle fader
independently. Fractional cycle rates no longer multiply an already wrapped
240-second phase. Rate edits change velocity, not phase.

Every bird retains eight symmetric neighbors on the 256×128 toroidal lattice.
Alignment, rest-length springs and separation act on these neighbors, not a
spatial collision search. A resting bird fires when a neighbor fired on the
previous tick, then remains refractory for one second. Startle waves cross
one lattice cell per tick. Falcon strikes and 8/16-beat gestures seed them.

Development blends **forces**, never positions, identities or simulation state:

- **Loose:** weak attraction to a folded sheet, with cruise and neighbor
  forces providing free flight. The initial frame already belongs to the
  flock rather than starting as a uniformly scattered dust sphere.
- **Surge:** springs follow a circulating, folded Lagrangian sheet. For
  longitude `t=2π(u+swirl)`, its center is approximately
  `(4.6 cos(t), 1.25 sin(2t+flow)+0.4 fold sin(3t-flow), 1.6 sin(t))`.
  Cross-sheet displacement is proportional to `(2v−1)^3`: half the birds
  occupy one eighth of the half-width, giving a dense core and sparse skirts.
  The falcon locally scatters the sheet; alignment closes the opening again.
- **Formation:** the original vortex slot now describes a rolling, folded
  **scroll**, not a uniformly filled torus. A travelling longitude modulation
  `0.55 sin(t−roll)+0.19 sin(3t+roll)` moves strong density gradients along it.
  Other slots retain a trefoil ribbon and a two-strand vertical twister.
  Closed ribbon twist uses an integer harmonic, avoiding its former half-rate
  wrap discontinuity. Top-state target springs are stronger to follow these
  faster folds (CPU mean slot error still <0.5).

`murmuration-model.mjs` mirrors the GPU step. The actual eight-neighbor
startle propagation, bounded velocities, population and twelve-vertex bird
mesh are retained. No extra particles or simulation passes.

## Light, landscape and motion

A broad palette dusk gradient lights the sky **behind** near-black bird
silhouettes. Three noise scales modulate layered cloud banks, with restrained
lit edges and a bright horizon afterglow. No fixed RGB sunset colors. The
only accent belongs to the falcon; startles bank and compress silhouettes
instead of turning the flock into bright dots.

A wooded shoreline, darker foreground reeds/cattails, lake sky reflection
and subdued ripples give geographic scale. These are analytic angular/plane
silhouettes, not a new terrain mesh or a volumetric cloud renderer. The
shoreline/reed edges are output-resolution filtered. The sky is deliberately
brighter than the generic dark-zenith style so backlit birds remain legible.

The low orbit and bounded 18% dolly remain. Target and camera move continuously
with the flock; kick lens movement stays <=2%. Energy reveals 55–100% of the
same seeded birds by continuous size, changes speed, fold and falcon strength,
not light intensity. State reversal preserves simulation and phases.

Small birds retain image-plane LOD aligned to projected flight, with bank
compression visible even there. Minimum projected span is about 3 px at 1080p;
body/wing thickness floor is now about 1.5 px, capped at 2.5×. Barycentric
outer-edge AA blends into the sky; background sky is evaluated at each bird
center, not repeatedly for every feather fragment. Residual overlap shimmer
and deliberate distant-bird thickening remain.

## Reusable data and engine extension

Optional **512×129 RGBA32F data**, about 1 MiB, refreshed every picture draw:

- row 0: exact camera basis, eye, lens and sun direction;
- other rows: cloud density, silver-edge weight and two geographic ridge
  heights. A periodic diamond chart avoids per-pixel angular trigonometry.

There is **no cached color image**. Palette, scattering, terrain edges,
reflection and bird silhouettes shade at full output resolution. Cloud
fields interpolate a finite data grid (an approximation, not bit identity).

Small backward-compatible `engine.mjs` addition: optional data caches are
available to geometry shaders too (`PRECOMPUTED`). A scene may request
`precompute.filter: "linear"`; only devices exposing
`OES_texture_float_linear` receive `PRECOMPUTED_LINEAR` and linear filtering.
Without that extension, the shader uses explicit four-fetch interpolation;
without float targets, it uses analytic cloud/camera fallback. Other scenes
keep their existing nearest-data path. Native regression covers all three
modes, texture accounting and context recovery.

## Filmed rounds and performance

Wave-5 follow-up after `d634a4e`:

1. Replace luminous haze with dark silhouettes and a glowing sky; replace
   volumetric cloud targets with a concentrated folded sheet. Weakness:
   sky bands too graphic; final formation still a torus.
2. Soften cloud thresholds, replace torus with scroll, add lake/reeds/trees.
   Weakness: terrain repetition and water stripes, weak distant turning.
3. Add fine cloud structure, irregular treeline, restrained reflection,
   distant banking and travelling density compression.
4. Final cost polish: reusable density/camera data, shared mesh access,
   hardware-linear/manual/analytic fallbacks, thinner distant templates and
   remove the unrelated loose group-orbit field. Final film reviewed again.

Native Apple M3 Pro, headless ANGLE Metal, whole-frame p50 including post.
Four alternating previous-final/current blocks, median of block p50s:

| State | 1080p previous → current | 4K previous → current |
| --- | ---: | ---: |
| Loose | 2.40 → 2.50 ms | 4.80 → 4.95 ms |
| Surge | 2.30 → 2.35 ms | 5.10 → 5.15 ms |
| Formation | 2.45 → 2.40 ms | 5.40 → 5.50 ms |

Worst increase **4.17%**. Separate baseline 1080p 2.4/2.3/2.5 ms and
4K 5.1/5.0/5.2; final 1080p 2.4/2.6/2.4 and quiet 4K replay
5.5/5.5/5.5. One heavily contended final 4K run reached 16.8/12.8/5.9;
that raw run is retained, not presented as an intrinsic improvement.
These throughput probes are not venue cadence qualification.

Evidence root: fleet worker `rework-sea-sky/output/next/`.
`baseline/murmuration/murmuration.{mp4,png}` →
`final/murmuration/murmuration.{mp4,png}`; native full-resolution and
960×540 native-pixel crops in `{baseline,final}/stills/`; paired cost in
`final/paired/comparison.json`. Final includes all-look ladder, Glacier
Knotted Ribbon film and Ember portrait. Liquid Chrome and Event Horizon
reference films were reviewed alongside it. Honest rating **8.5/10**, not 9:
this reads as a murmuration now, but top-state loops can still look authored,
the landscape is illustrative, and peripheral birds may crop in portrait.

## Verification

- `tests/murmuration.test.mjs`: stable presets/world lookup by id, fixed
  symmetric neighbors, bounded reversible development, exact startle travel,
  finite cloud spread, slot convergence, cubic density concentration, closed
  scroll/knot seams, LOD/energy reveal, diamond chart inversion and 12-hour
  fractional-rate phase integration.
- `tests/browser/precompute.test.mjs`: native linear-data mode, simulated
  missing float-linear extension, missing float targets, mesh sampler usage,
  cache accounting, refresh and context recovery.
- Native time-wrap/rate-step probes pass at 3600, 4096 and 43200 seconds.
  Zero GL errors/non-finite uploads in the reviewed evidence.

## Remaining limits

No non-neighbor collision search; silhouettes may overlap. Edge AA blends
against sky, not the bird behind. Clouds and landscape are analytic layers,
not full volumetrics. The cloud-density grid and background-at-bird-center
approximate very fine differences. In a long set the formation remains an
authored scroll/knot/twister cycle, not unconstrained emergent fluid motion.
