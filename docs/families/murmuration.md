# Starling Flock · Dusk Murmuration / Abendschwarm

**INCREMENTAL / EMPIRICAL**, r4. Family **88**, `murmuration`,
**Loose → Surge → Formation**. Seven look names/seeds, schema, world and
state IDs remain unchanged. Authored choreography, not calibrated biology.

## Persistent birds, not a cloth surface

32,767 simulated birds retain eight symmetric topological neighbours on a
256×128 toroidal lattice. Each bird has twelve mesh vertices and four RGBA8
texels encoding 16-bit position, velocity, startle and bank. Alignment,
separation and rest-length springs are topological, not a spatial search.
Neighbour startles propagate one cell per tick with a one-second refractory
period. Development changes forces, never identity or simulation state.

- **Loose / Evening Roost:** weak tracking of a broad, folded figure-eight,
  loose cruising and coupling. Reset already belongs to this flock.
- **Surge / Surging Cloud:** stronger sheet tracking/alignment; deeper folds
  and a bowl-like cloud, locally scattered by the falcon.
- **Formation / Vortex Mill:** the same birds follow a breathing scroll,
  trefoil ribbon and two-strand twister, continuously blended by the
  inherited formation-cycle parameter.
- Extra looks: **Falcon Hour**, **Knotted Ribbon**, **Twister**, **High Cloud**.

The linear+cubic transverse distribution retains a graded dense core.
Seeded home jitter grows toward the edges; stragglers break up the fringe,
including the twister's open ends. CPU targets/reset match GPU formulas.
Projected cells from two actual neighbours estimate coverage: compressed
folds have larger, dark wings, open skirts remain translucent. Feather AA
in dense folds sees dark neighbouring birds rather than empty sky. Seeded
wing sizes, physical perspective and aerial haze distinguish near/far birds.
A procedural second flock adds **2,048** distant birds, no simulation cells.

## Dusk, framing and energy

Near-black secondary zenith and a narrow primary horizon glow replace the
broad olive sky. Two domain-warped cloud fields drift at distinct integer
clock harmonics: high wisps and lower broken banks with lit edges. Energy
widens the horizon band and breaks up clouds, never changes exposure.
Irregular wooded masses/gaps replace repeating crowns. Three seeded clumps
of tapered reeds vary presence, height, lean and thickness instead of a fence.
Lake reflection, reeds and the distant flock provide three scale layers.

The closer orbit has a bounded 34% peak dolly and slow off-centre aim drift.
Eye elevation remains independent of development; kick focal change ≤2%.
Portrait focal fit is identical in sky/birds (0.759× at 9:16). Physical
near-lens wings fade away rather than crossing the near plane abruptly.
Energy reveals 55–100% of persistent birds by size and changes speed,
folding and hunt strength. All changes preserve the original development arc.

Motion and formation-rate phases integrate independently as uint32 words.
All new cloud/framing cycles are integer harmonics, including at 12 hours.
Rate edits preserve phase. Existing angular camera/cloud data cache remains
512×129 RGBA32F (~1 MiB), with linear, explicit interpolation and analytic
fallbacks. It stores data, not a reduced-resolution colour image.

## Four rhythm tracks

1. **Sun glint** (`x`): count-selected wing patches catch low sunlight.
   Driving/accented now use three-beat loops against 4/4; accented glints
   are thinned from 6.5 to 4 hits/bar.
2. **Startle wave** (`y`): seeds a small lattice patch once; actual neighbours
   bank and propagate a turning-density wave.
3. **Falcon strike** (`z`): targets a real core-row bird in every state.
   A seeded radial spray opens a view-aligned void; a startled rim closes
   behind the hunter. Real simulation startles use the same struck bird.
4. **Wing front / Flügelfront** (`w`, slot 3): a curved silver band about
   11% of flock width sweeps in roughly one beat, visibly lifting/banking
   birds; a darker broad-wing trough follows. The clock bird's spare texel
   stores hit amplitudes to invert scheduler smoothstep decay into linear
   progress. Direction/tilt vary by count. Each consumed hit also launches
   one genuine neighbour wave. No global brightness/camera event.

Positions below are **one-based steps**, not beats:

| Preset        | Wing-front loop        | Steps                        | Duration   | All-track hits/bar |
| ------------- | ---------------------- | ---------------------------- | ---------- | -----------------: |
| Dusk wings    | 32 eighths / 4 bars    | 15, 32                       | 0.8 beats  |               3.25 |
| Turning flock | 32 eighths / 4 bars    | 5, 8, 11, 15, 21, 24, 28, 32 | 1.1 beats  |               7.25 |
| Falcon shadow | 32 sixteenths / 2 bars | 4, 9, 13, 23, 26, 30         | 0.65 beats |                9.0 |

Structural gestures retain recovery space; fronts finish before the next
fill. Palette-only local feather light; no full-screen white. The shared
flash limiter is unchanged and enabled in native safety verification.

## Cost / verification

M3 Pro / ANGLE Metal, synchronous throughput including post (not venue
cadence), 48 frames/state; fleet contention may inflate absolute results:

| State     | 1080p p50/p95 |   4K p50/p95 |
| --------- | ------------: | -----------: |
| Loose     |  2.6 / 2.8 ms | 7.5 / 8.3 ms |
| Surge     |  2.9 / 3.0 ms | 7.0 / 7.4 ms |
| Formation |  2.9 / 3.1 ms | 6.9 / 7.3 ms |

Both absolute budgets pass. The required standard interleaved pair reports
**+12.0 / +8.0 / +12.5%** vs main, failing its 5% regression gate. Its
reference routing does not substitute geometry, so main's shader interprets
the extra distant-flock IDs as falcons. Supplemental family `--pair` routes
scene, model **and geometry** together and keeps the limiter enabled:
**+37.5 / +31.2 / +23.5%**, with final p50 2.2/2.1/2.1 ms. That run is a
separate limiter-enabled diagnostic, not interchangeable with unthrottled
throughput. Do not claim a paired performance pass. Extra neighbour fetches,
cloud data work, stragglers and overdraw are the visual improvement's cost.

- Full suite: **1000 passed, 21 skipped, zero failed**; typecheck, production
  build, native DE/EN i18n and owned-file formatting pass.
- Family tests cover deterministic bounded fringe, mesh IDs, reversible
  forces, exact neighbour waves, target convergence, seams, long clocks,
  quantised-envelope inversion, three-beat loops and all four gesture slots.
- `scripts/verify-murmuration.mjs --rig --port <P>`: 33 limiter-enabled cases,
  three energies × three states × Ember/Glacier/Phosphor, five portrait looks,
  continuous reversal and uint phases at 12 h + 7 s. Zero GL errors or
  non-finite uploads; no empty frames. Native contact sheet read.
- Three resumed film rounds (plus preserved interrupted w1–w4) were read
  individually. Final film, still/rhythm sheets and grids:
  `artifacts/look-review/murmuration-r4/`.
- Profiles: `artifacts/murmuration-r4-profile-{1080,4k}/`; native health:
  `artifacts/murmuration-r4-verification/`; pairs:
  `artifacts/murmuration-r4-pair/`, `artifacts/murmuration-r4-pair-matched/`.

## Remaining limits

Self-assessment **L 7.5**, not independent acceptance. Material/depth and
wing-front have improved markedly over reviewed r3 (L 6); the target
choreography remains geometric, cloud banks illustrative, and close fly-bys
occasionally crop part of the mass. The falcon scatter is brief and clearer
in motion than a half-beat strip. No true transparency sorting or spatial
collision search; fine overlaps can shimmer. Paired cost regression remains.
