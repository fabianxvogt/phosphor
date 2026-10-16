# Ink Bloom / Tintenblüte

Family **112**, scene `ink`, world **`ink-bloom`**. World, look and preset ids, the eight preset names and seeds, the schema keys, states and rhythm ids are all unchanged. Tests select the world by id. Polish round 2026-10-16 (branch `polish/ink-bloom`), replacing the wave-5 bright-tank renderer.

## Story and states

A drop's vortex ring falls through a dark tank. Its rim develops a Widnall bending wave; the lobes neck and pinch off into daughter rings, and the necks dissolve as they pinch, so no string remains. At the peak, the cascade **blooms**: the daughters rise to the rim, travel outward and roll over, the primary's wake rounds into a mushroom cap, and each daughter sheds a small cap of its own. The primary ring and its cap remain the dominant form; daughters stay smaller.

| State  | DE      | Development | Composition                                                              |
| ------ | ------- | ----------- | ------------------------------------------------------------------------ |
| Drop   | Tropfen | 0           | One wound ring with crisp, carved ink edges and its short scalloped wake |
| Plumes | Fahnen  | 1           | Lobed rim, 5–7 free daughter rings below it (no threads)                 |
| Nebula | Nebel   | 2           | Mushroom cap over the primary; a crown of outward-rolling daughter rings |

The morph uses real geometry, not crossfades:

- **0→1:** the Widnall wave grows (`gLobeAmp`). Daughters are born _at_ the lobe peaks (`inkCascade(0).daughterCentre == peak`), descend and tilt outward. The neck pinches from the core thickness and dissolves (`1 − smoothstep(0.45, 0.9, gPinch)`). At 0.5 the lobes are half-pinched teardrops.
- **1→2:** the daughters rise (+0.25 and less fall), move outward (+0.95) and roll over (tilt +1.1 rad); the ring widens ×1.35. The wake bell blends into a rounded cap, a nested second bell appears from 0.45, and daughters grow caps and their own Widnall lobes (m = 3 or 4).
- **Reversal** re-absorbs daughters into the rim along the same path. Lobe count `n = 5 + (seed+2) % 3` and lobe azimuths come from the seed, never from development (tested).

## Mathematics

- **Kelvin ring speed:** `U = Γ/(4πR)[ln(8R/a) − 1/4]` drives the integrated transport clock: roll, wake rise and erosion drift. The axisymmetric streamfunction reference `inkVelocity()` and its derivative and divergence tests are retained.
- **Kaden roll-up:** the sheets around each core follow `Φ = c·(ρ/a)^(−3/2) − θ + roll = 2πk`, i.e. `ρ/a = (c/θ)^(2/3)`, so turns tighten toward the mixed core. Energy winds more turns (`c = 4 + 5·energy`). Sheets narrower than their filtered width integrate to their mean.
- **Widnall bending wave:** rim radius and height are `R(1 + 0.55·A·cos nφ)` and `−R·A·cos nφ`; lobe peaks move outward and down. The daughters' lobes use Chebyshev polynomials of `x/r`.
- **Exact silk:** wherever consecutive samples change side of a bell, the step adds the sheet's optical depth `ρ·w·√π/|cos|` (CPU-verified against quadrature). Silk stays crisp at any step length and brightens edge-on.

## Rendering

- **Body lattice (precompute, rgba16f, linear):** 96×128×96 nodes packed 16×6 into 1568×780 with one-node gutters, about 9.8 MB. Channels: R body density (computed only near ink), G optical depth toward the key, B conservative distance to any ink, A distance to silk alone.
- **Crisp ink, not cotton:** per sample, `inkCarve()` erodes the cached field near its surface with 1–2 ridged octaves (footprint-faded, only where `0 < raw < 1.1`). A steep density → opacity curve around `INK_ISO = 0.2` gives sharp edges. Where a step enters the ink, three bisections locate the edge (no slice artefacts). A forward-difference normal there drives a thin backlit rim, toward the key and the silhouette, in the second hue.
- **Second hue:** a third dye, `mix(secondary, primary, 0.85)`, colours silk, thin body edges and rims; cores keep the deep secondary. Every palette reads in two colours (lime/blue, cream/red, ice/blue).
- **March:** skips by the cached distance minus a trilinear margin (`0.6 · cell diagonal`). Body steps are 2.3 cells, sparse ink 3.5 cells, longer as ink hides. Silk is evaluated analytically only where the A channel says it is near.
- **Ray-step budget:** the step cap follows `u_raySteps` (96 → 64 → 40) and steps lengthen by 96/budget. With crisp edges the picture shifts more: at 40 steps, up to about 10 mean levels on Nebula.
- **Fallback:** without float targets, `inkCell()` runs per sample (same function, slower; within 2.3 mean levels of the cache).
- **Removed this round:** the drop's straight twin tail, the pinched-neck threads, the suspended motes and the per-step grain octave.

## Camera, motion, energy, rhythm

- **Camera:** a full orbit about the descent axis on the second integrated clock (`orbit · 0.09` rad/s). Elevation swings from above to slightly below. Distance and centre follow the cascade's extent and the finger parameter, never rhythm. At the peak the camera pulls back so the bloom spans about 75–85% of the width. Kick changes focal length by at most 2%. In portrait the bloom is width-limited and small.
- **Descent:** the camera rides with the ring; erosion, wake streaks and roll drift with the transport clock (all integer clock coefficients).
- **Energy** (0.1 → 0.9) changes structure, not brightness: Kaden turns 4.5 → 8.5, silk pleats 7 → 15 (blended integer harmonics), carving depth ×0.84 → 1.16, lobe and finger reach, transport ×0.65 → 1.3 and orbit ×0.8 → 1.25.
- **Gestures:** `ring-roll` (4 beats) rolls the wound sheets and brightens rims ≤ 30%; `finger-reach` (8 beats) extends lobes and daughters ≤ 12%; `pigment-wave` (16 beats) sends a compact accent band down the cascade.

## Looks

| EN                 | DE                  | Seed (lobes) | Composition                                      |
| ------------------ | ------------------- | ------------ | ------------------------------------------------ |
| Drop               | Tropfen             | 11201 (6)    | State 0                                          |
| Plumes             | Fahnen              | 11201 (6)    | State 1                                          |
| Nebula             | Nebel               | 11201 (6)    | State 2                                          |
| Quiet Infusion     | Stille Infusion     | 11202 (7)    | Close, slow, ring just starting to lobe          |
| Twin Currents      | Zwillingsströmungen | 11203 (5)    | Wide spread daughters, strong curl, faster orbit |
| Silken Tributaries | Seidene Nebenarme   | 11204 (6)    | Far-reaching daughters, light dilute bodies      |
| Velvet Chamber     | Samtkammer          | 11205 (7)    | Dense full cascade                               |
| Marbled Lantern    | Marmorierte Laterne | 11206 (5)    | Late bloom, wide spread, moving camera           |

The `curl` fader now scales erosion and grain (turbulent ragged edges). `spread` sets how far daughters travel; `fingers` sets lobe and finger reach.

## Cost (native Chrome, ANGLE Metal, M3 Pro, `PHOSPHOR_HEADLESS_RIG=1`)

Standard `profile-families --types` probe; paired `profile-rework-pair --reference main` (ABBA, level 0.95). Round 2 (crisp carving, bloom):

| State  | 1080p p50 | 4K p50 (p95)   | Paired vs main, 1080p | Paired vs main, 4K     |
| ------ | --------- | -------------- | --------------------- | ---------------------- |
| Drop   | 3.3 ms    | 10.6 (11.8) ms | 3.0 → 4.5 ms (1.50×)  | 8.2 → 11.7 ms (1.43×)  |
| Plumes | 3.0 ms    | 12.3 (12.7) ms | 4.9 → 4.1 ms (0.84×)  | 11.1 → 9.7 ms (0.87×)  |
| Nebula | 3.8 ms    | 15.0 (16.8) ms | 4.4 → 5.2 ms (1.18×)  | 11.5 → 12.7 ms (1.10×) |

These are within the hard budget (≤ 8 ms at 1080p, ≤ 16 ms p50 at 4K), but Nebula at 4K is tight (p95 above 16 ms in one run). The shared GPU was often contended; unpaired runs varied ±30%.

## Verification

- `node --test tests/ink.test.mjs`: Kelvin speed and streamfunction; Kaden law and gradient; seeded Widnall identity independent of development; cascade continuity, reversal, dissolving necks and the outward bloom, mirrored in the shader; exact sheet integral against quadrature (threads asserted absent); lattice gutters and layout; integer clock coefficients and wraps; presets, world, gestures, step budget.
- `PHOSPHOR_INK_GPU=1 node --test tests/browser/ink-sampling.test.mjs`: exact gutters; ray budgets 64/40 within 12 mean levels (measured 1.9–9.9).
- `PHOSPHOR_INK_GPU=1 node --test tests/browser/ink-precompute.test.mjs`: formats, filtering, fallback (≤ 2.3 levels), restoration.
- `scripts/check-time-wrap.mjs --families ink`: no seams at 3600 s, 4096 s or 43200 s.
- Films (worktree `artifacts/films/`): round 2 in `round2/` (world, held states, `reversal/`, `portrait/`, palettes); round 1 (d75cbb5) in the top level; wave 5 in `baseline/`. Comparisons: `compare/before-after.png` (wave 5 vs d75cbb5) and `compare2/before-after.png` (d75cbb5 vs round 2).

## Assessment

About **7/10**. No strings or cones remain, edges are crisp with lit rims and a second hue, and the top state blooms outward instead of hanging. Weak points:

- The carved bodies can read as glossy plasticine rather than wet ink, especially the daughter rings.
- The peak is a wide, low crown and is small in portrait.
- Nebula is close to the 4K budget.
- The descent cue is weaker since the motes were removed.
