# Ink Bloom / Tintenblüte

Family **112**, scene `ink`, world **`ink-bloom`**. World, look and preset ids, the eight preset names and seeds, the schema keys, states and rhythm ids are all unchanged. Tests select the world by id. Polish round 2026-10-16 (branch `polish/ink-bloom`), replacing the wave-5 bright-tank renderer.

## Story and states

A drop's vortex ring falls through a dark tank. Its rim develops a Widnall bending wave. The lobes neck and pinch off into a crown of daughter rings. At the peak, every ring sheds its own silk bell, so the cascade repeats one level down. The primary ring and its bell remain the dominant form throughout; daughters are smaller and lower.

| State  | DE      | Development | Composition                                                           |
| ------ | ------- | ----------- | --------------------------------------------------------------------- |
| Drop   | Tropfen | 0           | One wound ring, its scalloped wake bell, the drop's twisted tail      |
| Plumes | Fahnen  | 1           | Lobed rim, 5–7 daughter rings hanging on pinched threads              |
| Nebula | Nebel   | 2           | Two nested flared bells; each daughter carries its own bell and lobes |

The morph uses real geometry, not crossfades:

- **0→1:** the Widnall wave grows (`gLobeAmp`). Daughters are born _at_ the lobe peaks, starting as a small thick bulge inside the rim (`inkCascade(0).daughterCentre == peak`). They descend and tilt outward. The neck pinches from the parent's core thickness to a thread (`gPinch`). At 0.5 the lobes are half-pinched teardrops.
- **1→2:** bells flare and fold. A second nested bell appears from 0.45; the daughters grow their own bells, and their own Widnall lobes (m = 3 or 4) appear as texture.
- **Reversal** re-absorbs daughters into the rim along the same path. Lobe count `n = 5 + (seed+2) % 3` and lobe azimuths come from the seed and never from development (tested).

## Mathematics

- **Kelvin ring speed:** `U = Γ/(4πR)[ln(8R/a) − 1/4]` drives the integrated transport clock: roll, wake rise and motes. The axisymmetric streamfunction reference `inkVelocity()` and its derivative and divergence tests are retained.
- **Kaden roll-up:** the sheets around each core follow `Φ = c·(ρ/a)^(−3/2) − θ + roll = 2πk`, i.e. `ρ/a = (c/θ)^(2/3)`, so turns tighten toward the mixed core. Energy winds more turns (`c = 4 + 5·energy`). Sheets narrower than their filtered width integrate to their mean, so no contour pattern can form.
- **Widnall bending wave:** rim radius and height are `R(1 + 0.55·A·cos nφ)` and `−R·A·cos nφ`. Lobe peaks move outward and down. The daughters' lobes use Chebyshev polynomials of `x/r`, so no `atan` is needed.
- **Exact thin-structure integrals:**
  - _Threads and necks:_ when a march step contains the ray's closest approach to one, the step adds the full line integral `ρ·r·√π·exp(−d²/r²)/sin θ`.
  - _Silk bells:_ wherever consecutive samples change side of a bell, the step adds the sheet's optical depth `ρ·w·√π/|cos|`.
  - Both are CPU-verified against numerical quadrature. They stay crisp at any step length: they never dash, stripe or depend on the slice.

## Rendering

- **Body lattice (precompute, rgba16f, linear):** 96×128×96 nodes packed 16×6 into 1568×780 with one-node gutters, about 9.8 MB. Channels:
  - R: the cascade's eroded body density, computed only near ink.
  - G: optical depth toward the key light.
  - B: conservative distance to any ink.
  - A: distance to silk alone.
- **March:** skips by the cached distance minus a trilinear margin (`0.6 · cell diagonal`). Body steps are about 2.3 cells, sparse ink about 3.5 cells, and both lengthen as ink hides. One native-resolution noise octave adds grain. A contrast curve gives the bodies firmer edges. Silk, threads and necks are evaluated analytically only where the A channel says silk is near.
- **Ray-step budget:** the march reads `u_raySteps`. The step cap follows the governor's budget (96 → 64 → 40) and steps lengthen by 96/budget, so a slow machine loses steps, not the look (GPU test: 40 steps changes the image by under 6 levels on average).
- **Fallback:** without float targets, the analytic `inkCell()` runs per sample (identical function, just slower).

### Light and colour (dark tank)

**Reversal of the wave-5 exception:** the cream backlit tank was removed. It drowned every palette (mean saturation 0.22, palettes indistinguishable) and broke STYLE's dark ground. The tank is now near black, with a faint palette halo off the upper-left corner.

- **Key light:** off-axis, behind the ink (Henyey–Greenstein g = 0.5). At the peak it swings to a raking three-quarter light. A weak fill follows the key's half depth.
- **Dye:** the palette's deep colour (secondary, toward primary for daughters), squared and renormalised. Spectral key depth and a local "inner path" term keep thick cores deep and saturated, while thin sheets stay light and translucent.
- **Accent:** only in the pigment wave.

## Camera, motion, energy, rhythm

- **Camera:** a full orbit about the descent axis on the second integrated clock (`orbit · 0.09` rad/s). Elevation swings from above (into the ring) to slightly below (up into the crown). Distance and centre follow the cascade's extent and the finger parameter, never rhythm. Kick changes the focal length by at most 2%. Portrait is composed.
- **Descent:** the camera rides with the ring. Wake texture, roll and two shells of suspended motes move with the transport clock; motes rise exactly 28 lattice cells per turn, so the clock wraps seamlessly.
- **Energy** (0.1 → 0.9) changes structure, not brightness:
  - Kaden turns rise from 4.5 to 8.5.
  - Silk pleats go from 7 broad to 15 fine (integer harmonics blended).
  - Body grain amplitude and lobe and finger reach increase.
  - Transport speeds up ×0.65 → 1.3 and orbit ×0.8 → 1.25.
  - More motes appear.
  - Energy 0.1 is a slow, sparse version of the same composition.
- **Gestures:**
  - `ring-roll` (4 beats): the cores' wound sheets roll a step and the key brightens by at most 15%.
  - `finger-reach` (8 beats): lobes and daughters reach at most 12% further.
  - `pigment-wave` (16 beats): a compact accent band travels down the cascade generation by generation.

## Looks

| EN                 | DE                  | Seed (lobes) | Composition                                      |
| ------------------ | ------------------- | ------------ | ------------------------------------------------ |
| Drop               | Tropfen             | 11201 (6)    | State 0                                          |
| Plumes             | Fahnen              | 11201 (6)    | State 1                                          |
| Nebula             | Nebel               | 11201 (6)    | State 2                                          |
| Quiet Infusion     | Stille Infusion     | 11202 (7)    | Close, slow, ring just starting to lobe          |
| Twin Currents      | Zwillingsströmungen | 11203 (5)    | Wide spread daughters, strong curl, faster orbit |
| Silken Tributaries | Seidene Nebenarme   | 11204 (6)    | Long threads, light dilute bodies                |
| Velvet Chamber     | Samtkammer          | 11205 (7)    | Dense full cascade                               |
| Marbled Lantern    | Marmorierte Laterne | 11206 (5)    | Late bloom, wide spread, moving camera           |

The `curl` fader now scales erosion and grain (turbulent ragged edges). `spread` sets how far daughters travel; `fingers` sets lobe and finger reach.

## Cost (native Chrome, ANGLE Metal, M3 Pro, `PHOSPHOR_HEADLESS_RIG=1`)

The standard `profile-families --types` probe ran on a quiet machine. The paired probe is `profile-rework-pair --reference main` (ABBA, level 0.95).

| State  | 1080p p50 | 4K p50  | Paired vs main, 1080p | Paired vs main, 4K     |
| ------ | --------- | ------- | --------------------- | ---------------------- |
| Drop   | 3.4 ms    | 11.0 ms | 2.5 → 3.5 ms (1.40×)  | 8.2 → 12.1 ms (1.48×)  |
| Plumes | 3.4 ms    | 11.6 ms | 3.7 → 3.6 ms (0.97×)  | 12.4 → 11.5 ms (0.93×) |
| Nebula | 4.1 ms    | 13.6 ms | 3.8 → 4.5 ms (1.18×)  | 13.6 → 13.5 ms (0.99×) |

These are within the hard budget (≤ 8 ms at 1080p, ≤ 16 ms at 4K). The shared GPU was often heavily contended during this round; single unpaired runs varied ±30%.

A crisper, fully per-sample analytic version cost 8–14× baseline and was rejected. This is the honest trade-off: bodies come from a lattice and are softer than the analytic silk, threads and necks.

## Verification

- `node --test tests/ink.test.mjs`:
  - Kelvin speed and streamfunction.
  - The Kaden spiral law and gradient.
  - Seeded Widnall identity, independent of development.
  - Cascade continuity and reversal, with the shader schedule mirrored.
  - Exact sheet and line integrals against quadrature.
  - Lattice gutter bijection and shader layout.
  - Integer clock coefficients and clock wraps.
  - Presets, world, gestures and step budget.
- `PHOSPHOR_INK_GPU=1 node --test tests/browser/ink-sampling.test.mjs`: lattice gutters are exact and ray budgets 64/40 stay within 6 mean levels on all states.
- `PHOSPHOR_INK_GPU=1 node --test tests/browser/ink-precompute.test.mjs`: format, filtering, fallback and restoration. Fallback images are within 1 mean level of the half cache.
- `scripts/check-time-wrap.mjs --families ink`: no seams at 3600 s, 4096 s or 43200 s.
- `scripts/verify-ink.mjs`: native stills, development × energy × palette × time grids, with GL, non-finite and emptiness checks. Portrait and 12-hour stills are clean.
- Films are in the worktree under `artifacts/films/`:
  - `ink-bloom.mp4` (world).
  - `ink-{drop,plumes,nebula}.mp4` (held states).
  - `reversal/ink-nebula.mp4` (2 → 0).
  - `portrait/ink-bloom.mp4`.
  - Palettes `ink-bloom-{ember,glacier,acid-yellow}.mp4`.
  - `baseline/` (wave-5 version).
  - `compare/before-after.png`.

## Assessment

About **6.5/10**. The cascade story (ring → Widnall lobes → pinched daughters → self-similar silk chandelier) is clear and continuous, palettes finally read, and the silk and threads are crisp. Weak points:

- Bodies are still soft ("cotton" more than inked).
- The frame is mostly a single hue per palette.
- The top state is more a fuller chandelier than an explosive peak.
- The motes add little.
