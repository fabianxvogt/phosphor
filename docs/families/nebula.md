# Density Waves · Spiral Nebula / Spiralnebel

Family **87**, renderer/world ID **`nebula`**. Continuous **Dust → Spiral → Nova**. Persistent seed-derived particles provide resolved stars, ejecta and depth; analytic radiance supplies unresolved gas at full output resolution. This is astronomical choreography, not hydrodynamics or an N-body solver.

## Mathematics and persistent identity

`nebula-model.mjs` is the CPU reference.

- **Dust:** Zel'dovich displacement `x = q + D S(q)`, `S = −∇Φ`, using eight seeded plane-wave potentials. Tracer caustics follow `1 / |det(I + D ∂S/∂q)|`. Three domain-warped scalar-noise octaves describe diffuse gas; the finest disk-specific octave is skipped in pure Dust.
- **Spiral:** stars stream along ellipses whose orientation winds with radius. Crowding of neighbouring orbits creates two trailing arms. Pattern and orbital speeds differ. The radiance follows the seeded winding, with broad gas arms and feathering. **Soft, broken dust absorption follows their concave/inner side**, rather than outlining the outside. Optical depth varies in width, position and density and no longer drives a continuous black stroke.
- **Star formation:** sparse accent-coloured Gaussian **HII clumps with halos**, plus a separate population of white/primary young clusters, follow the arms. Width includes the pixel footprint; tails fade at cell boundaries. A compact bright bulge and broader light envelope feed bloom.
- **Nova:** the core collapses and ignites, then the same tracers enter a shell. Tangential Zel'dovich gathering and radial fingers create ejecta structure. Sedov–Taylor fronts `F = 2.35 c^(2/5)` expand through it; subdued pulsar jets retain their identity. The unresolved gas now has **spherical support**, not sinusoidal angular lobes. Turbulence controls emitting thickness and filament brightness; a brighter limb surrounds illuminated interior gas, with resolved ejecta at different depths. A second surface projection breaks up fine tangent contours.

The cloud samples the closest point to the ray in metric `diag(1, 1/h, 1)`, where `h = mix(.65, .035, smoothstep(0,1,development))`: actual continuous flattening, not a picture dissolve. The shell radius is `R = 1.45 × mix(.25,1,smoothstep(1,2,development))`. Its envelope fades with a cubic smoothstep from `.94 R` to `1.16 R`; value and first derivative vanish at the outer bound. The sphere used for surface sampling is `1.17 R`, beyond that bound, avoiding a hard silhouette singularity. A noise-varied Gaussian limb peaks near `.87 R`.

The **512×256 = 131,072** state texels are unchanged: texel zero is a 32-bit clock; others retain extra azimuth ψ as a signed fixed-point turn. `dψ/dt = p(1−n)(Ω(a)−Ωcloud) − (1−p)kψ`. Nova freezes that record; dispersal relaxes it home. Integer cycle counts per 1,440 seconds make the uint wrap exact. No raw `u_time` product.

A fixed **eighth** of non-sky tracers now draws/integrates, replacing the previous quarter to pay for the larger image. Dormant identities retain their state. All original sky stars remain at radii 7–16, with graded sizes and brightness. No particle-budget increase. The 12,288 legacy absorber identities remain dormant.

## Extinction, light, camera and rhythm

Each particle uses finite emitter-to-eye extinction through a normalized `sech²` dust slab. Its exact tanh antiderivative has a finite parallel-ray limit; foreground stars exclude dust behind them. No screen-space absorber overlay. Particle lanes are also softer and weaker, avoiding a second sharp contour over the gas.

All colour derives from the palette, black or white. Secondary carries gas, white/primary hot stars and bulge, accent sparse HII/ejecta. Emission can exceed 1.0 into bloom. Energy changes tracer density, turbulence and integrated movement; it does not brighten the whole sky.

The **288-second** perspective orbit remains continuous. Default distances are now **3.95 → 2.9 → 3.7**, with a smaller height swing and slightly steeper disk view. Short-side framing works in portrait. Native 4K stills give approximately **75% / 75% / 81% frame-height bright-body extent** (faint outskirts excluded), compared with 62% / 57% / 81% before this round. The default Nova already filled the frame; its geometry/light needed correction more than further enlargement. Kick focal movement stays at 2%. `CAMERA` and `cameraFraming()` keep CPU framing tests aligned with GLSL.

The same three gestures remain: **Arm light** (4 beats), **Core flare** (8), **Shock ripple** (16). Faders and audio mappings are unchanged.

All world/look IDs, names, schema keys, seeds and preset parameters are stable. World states share seed **3141**: **Drifting Dust**, **Grand Spiral**, **Supernova Shell**. Extra looks remain **Cosmic Web**, **Edge-on Lanes**, **Open Whirlpool**, **Remnant Bloom**. `worlds.mjs` is untouched; no HISTORY migration is necessary. Tests locate the world by ID, not registry position.

## Local data cache and performance

No engine change. Existing optional `precompute` supplies a **128×129 RGBA32F scalar-data table** (~258 KiB): periodic lattice corners, camera basis and seeded uniform phases. Gas, lanes, knots and filaments still shade at full output resolution. This is not a reduced-resolution colour cache. A direct-evaluation fallback remains.

Baseline for this final round: **`ce47579b3c8c9eb4ce9bf77ec1ca2aa2b89de8a8`**. Native headless Chrome 155 / ANGLE Metal / Apple M3 Pro; synchronous whole frame including post, excluding asynchronous flash approval, not display cadence.

The stock `profile-families.mjs --types --families nebula` reference/current recheck used 96 samples/state:

| State | 1080p baseline → final p50 | 4K baseline → final p50 | Final p95 1080p / 4K |
| --- | --- | --- | --- |
| Dust | 2.1 → **1.9 ms** | 6.4 → **6.2 ms** | 2.9 / 7.1 ms |
| Spiral | 2.0 → **1.9 ms** | 5.7 → **5.5 ms** | 2.8 / 6.1 ms |
| Nova | 2.0 → **1.9 ms** | 5.4 → **5.1 ms** | 2.8 / 5.8 ms |

All six comparisons pass baseline +5%. An independent AB/BA alternation in one browser (96 samples/side/state) also passes: 1080p **2.6/2.1/2.2 → 2.7/2.1/2.1**, 4K **6.4/5.8/5.4 → 6.3/5.7/5.4**. Earlier stock runs were load-sensitive (final 4K 7.4/6.3/5.8 versus initial baseline 6.5/6.0/5.4); those reports are retained, not hidden. The closer composition was only accepted after the controlled recheck and alternating comparison. All health/error counters are zero.

## Final-round visual iteration and evidence

Evidence root: fleet `rework-space/output/` (absolute root in the worker report).

1. **Round 1:** closer tilted camera; soften and move lanes inward; replace angular shell deformation with spherical support, soft outward fade and brighter limb. Weakness: star-forming knots too tiny; larger image raised cost.
2. **Round 2:** larger saturated HII clumps, independent young clusters, fuller bulge; reduce the fixed tracer cohort and skip Dust's unnecessary fourth octave. Controlled baseline/current timings pass. Weakness: Nova interior too empty and outer contours stretched.
3. **Round 3 / final:** balance Dust/Nova framing; stronger interior gas, second fine surface projection and brighter resolved ejecta. Repeat profiles, films and full-resolution checks.

Baseline/final films and strips: `nebula-last-baseline/nebula.{mp4,png}` and `nebula-last-final/nebula.{mp4,png}`. Combined: `nebula-last-before-after.png`. Round 1/2 strips and logs remain; superseded films were deleted to save disk. Extra films cover Ember, reverse Glacier portrait and held Edge-on Lanes. `nebula-last-ladder.png` covers all seven looks at three energies. Native 4K stills, pixel-native detail crops, scale measurements, stock/alternating raw profiles, fallback comparisons and time checks are retained.

## Verification and honest limits

- `tests/nebula.test.mjs` / `tests/time.test.mjs`: **24/24 pass**. Retains gradient, ellipse/crowding, identity, development reversal, fixed-point phase, Sedov–Taylor, jets and finite dust-column tests. Adds spherical-support/soft-envelope and closer-camera safety/continuity tests.
- Full `tests/*.test.mjs`: **740 pass, 9 opt-in skips, 0 failures**. Typecheck, build and native German/English i18n smoke pass. No catalog exceptions needed; previews/curation were not touched.
- Native health: **36 frames**, including low/high energy, integer/half development, three palettes, portrait and 4K; zero GL/non-finite/errors.
- Cached/direct comparison across five developments: maximum **1/255**, mean below **0.000016/255**, zero GL errors.
- Native GPU time/rate audit: **zero seams/errors** at 3,600, 4,096 and 43,200 seconds.

**Honest rating: 8/10**, calibrated against the retained Liquid Chrome and Event Horizon reference films, not the previous optimistic self-rating. The stroke and polygon defects are removed, the main disk is larger and star formation reads clearly. Nova still reads as a procedural emitting shell rather than deeply integrated turbulent volume; the two-arm structure and HII placement remain stylized. Edge-on Lanes is intentionally thin. External-display cadence and multi-hour endurance are not claimed.
