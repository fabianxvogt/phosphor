# Afterglow Garden

**Exploratory / empirical.** World `garden`, family `afterglow`, number 100.
Round 3 replaces the rubber terrain/calyx renderer with a living meadow at dusk.
It is an artistic Gray–Scott model, not simulated botany. World/state IDs, all
8 look names/seeds/parameter values, schema keys and the first three rhythm IDs
are preserved. The previous authored world definition is appended to `HISTORY`.

## Algorithm and signature detail

The unchanged shared `morphogenSimulation()` step runs on a 384² periodic field,
with two steps per tick, explicit nearest simulation stencils and linearly
filtered 16-bit U/V for display. Codec `gray-scott-uv16-v1` still carries traces
from Evolution, Acid and Mycelium. Development steers the measured chemistry:

| State  | F    | k     | Dv  | Form                                              |
| ------ | ---- | ----- | --- | ------------------------------------------------- |
| Roots  | .032 | .0585 | .50 | Low seed lanterns, soil under-glow, dusk horizon  |
| Petals | .034 | .0612 | .47 | Curved stems rise into closed lantern buds        |
| Bloom  | .036 | .0625 | .47 | Six individual curled petals open over the meadow |

A 64×192 RGBA32F data pass finds strict local V maxima within radius 5 texels,
with quadratic subtexel refinement, prominence and a Hessian division axis.
The same pass caches per-spot character, avoiding repeated vertex noise. Each
maximum owns a flower; moderate Hessian anisotropy pinches its head and core.
A CPU test observes spot division after an externally cleared patch; this is
not an autonomous wilt event. Sparse spore rain repairs empty regions. Nutrient
hits seed one bounded packet in view, once per simulation impulse, including
low-strength restrained hits. No field reset is tied to development.

The full-resolution picture draws palette-only dusk sky, static stars, quiet
clouds, wet black soil, concentration-derived root tissue and light pools.
Instanced geometry supplies curved tapered stems, individually shaped petals,
small cores, distant cards, halos and pollen. Near heads retract continuously
inside a camera-clearance disk; conservative frustum rejection includes pollen.
Without float-data support, concentration-driven lanterns remain visible using
an explicit byte decoder; the chemistry and ground remain intact.

## Looks, development and energy

Glowing Roots / Opening Petals / Crowns at Dusk use seed 5607 and identical
non-development parameters. Root Horizon, Petal Field, Halfway to Bloom,
Lantern Orchard and Low Bloom retain their original identities. Planting
controls initial populations; petals controls flower size; relief controls stem
height; altitude and sway remain camera/wind controls.

Development grows the same plants and opens their petals, rather than stacking
two pictures. Reversal retains slot, simulation textures and geometry identity.
Energy changes opening, growth rate, wind amplitude and pollen populations, not
master brightness. The camera glides periodically through the field, with slow
yaw, a 9° development pitch range, short-side aspect fitting and 1.2% kick lens
punch. Wind/pollen use fixed-rate cycles; spatial sap phases use integer torus
frequencies. A late 43,200-second frame is explicitly checked. Camera clearance
prevents the enormous foreground petals seen in an intermediate portrait pass.

## Rhythm

Three world-specific presets from **World rhythm presets** are retained:
**Sleeping petals**, **Nectar paths**, **Midnight flowering**.

- **Vein pulse**, slot 0: stronger local root/sap front and flower afterglow.
- **Petal-cohort light**, slot 1: a selected spatial population visibly unfurls.
- **Local morphogen feed**, slot 2: a single-use, amplitude-weighted nutrient
  packet ahead of the camera; a selected population also catches feed light.
- **Pollen rising**, slot 3: a local patch ahead of the eye opens and releases
  four curved, beaded pollen trails per flower. Envelope controls lift, hit
  adds the launch impulse, count varies placement. Palette accent is confined
  to these tiny trails and dividing cores. No full-screen white event.

Zero-based signature steps: restrained **0, 24** at division 2, duration 3 beats;
driving **14, 28** at division 2, duration 2.75; accented **12, 30, 44, 60** at
division 4, duration 2.5. All settle before the next event. The shared flash
limiter is untouched; the family-owned GPU verifier leaves it enabled.

## Verification and cost

Native M3 Pro, shared fleet GPU, 40 samples per type; synchronous whole-frame
throughput including post, **not venue cadence**. Roots / Petals / Bloom:

| Resolution | p50 ms             | p95 ms             |
| ---------- | ------------------ | ------------------ |
| 1920×1080  | 7.4 / 6.4 / 4.8    | 15.0 / 15.1 / 11.9 |
| 3840×2160  | 12.6 / 14.6 / 11.3 | 18.3 / 19.6 / 21.2 |

All p50 values meet 8/16 ms budgets. ABBA pairs against main `26e5f47` reduce
contention bias: 1080p **2.4→3.3, 2.4→3.9, 2.5→4.2 ms**; 4K **6.2→8.0,
6.1→9.4, 6.7→11.8 ms**. This conceptual geometry replacement is slower than
the old terrain: **+38–68% / +29–76%**; the pair tool's +5% gate therefore
returns nonzero. Do not describe that gate as passing.

`tests/afterglow.test.mjs` covers unchanged Evolution hashes, field continuity,
preset bounds, saved-world upgrades, camera bounds, finite persistent geometry,
maxima ownership, chemistry survival/regrowth, and slot-3 preset validation.
Full tests, typecheck, DE/EN i18n and family-owned formatting checks pass.
`scripts/verify-afterglow.mjs --rig --port 48480` produces 24 all-look energy
stills (0.1/.5/.9), portrait, reversal and late-time frames; all have populated
pixels and zero GL/non-finite errors. It also compiles the no-float-cache path.

Final evidence: `artifacts/look-review/garden-r3/` (film, sheet, rhythm, grids),
`garden-r3-ember/`, `garden-r3-glacier/`, `garden-r3-reversal/` and
`artifacts/garden-r3-verify/`. At least three visual film rounds were read.

## Remaining weaknesses

Self-assessment, not independent acceptance: **look 7/10**. The meadow is a
substantial improvement over the rubber cup, but Roots still reads more as a
sparse lamp field than a root network; some open heads have a papery/faceted
silhouette, and distant cards repeat. The pollen is readable but not yet an
unforgettable phone moment. Maxima births/deaths and periodic-image handovers
can still expose small plant changes; CPU uniqueness is not a proof of perfect
temporal continuity. Warm palettes retain a little pale light at the cores.
An independent ≥8 review is still needed, not claimed here.
