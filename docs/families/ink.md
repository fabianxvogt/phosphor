# Ink Bloom / Tintenblüte

Family **112**, renderer `ink`, world `ink-bloom`. One feeding drop rolls into a descending ring, branches into colliding plumes and opens into a backlit, marbled pigment cloud. The eight looks are one analytic material volume, not three image crossfades. No engine changes.

## Signature mathematics

The thin-core Kelvin self-induced speed is

`U = Gamma / (4 pi R) [ln(8 R / a) - 1/4]`.

The authored reference uses `Gamma = 0.75`, `R = 0.82`, `a = 0.12` in consistent scene units. `kelvinVelocity()` supplies the **actual transport-clock rate**; flow scales that integrated rate. Its CPU tests check the constant, circulation reversal, dimensional scaling, core dependence and invalid thin-ring inputs.

A regular toroidal streamfunction supplies the analytic circulation field:

`psi(r,y) = Gamma/(2 pi) r^2 exp(-[(r-R)^2+y^2]/b^2)`, with `b = 0.32`.

`v_r = -(1/r) dpsi/dy`, `v_y = (1/r) dpsi/dr - U`.

`inkVelocity()` exports this field. Independent finite-difference derivatives of psi and Cartesian divergence checks verify it, including a finite axis limit. The shader uses its rotational part as a **bounded backward-characteristic deformation**; a closed vertical carrier excursion supplies the recurring descent. This is deterministic analytic transport, not a Navier–Stokes or full Biot–Savart solver. Kelvin's thin core and the wider, regularized material-circulation core deliberately have different roles.

The primary carrier has wound toroidal material coordinates. Corrugated annular skirts split into daughter strands and Rayleigh–Taylor-like fingers. Two persistent oblique carriers grow geometrically into the same field during development 0→1; 1→2 swells their cores and a scalloped skirt into one dense cloud. Smooth distance unions and Fourier material layers make every intermediate development reversible. The fingers are an authored instability analogue, not a numerical RT simulation.

## Rendering and depth

- A perspective macro camera follows a slow closed tank orbit with lateral parallax and a small crane. No cuts, roll or seed-dependent camera reset.
- The finite tank uses an analytic ray/box interval. A **56-step** full-resolution front-to-back Beer integral resolves translucent ink sheets. Soft extinction at the volume boundary prevents wide extra looks from being cut sharply.
- A nearby directional density sample supplies local optical occlusion and a backlit fold gradient. Dark pigment uses the palette secondary; thin lit folds use the primary. Accent is restricted to the travelling rhythm band. Fold radiance can exceed 1.0 before integration and feeds the float bloom path.
- Light shafts lie behind the ink and are attenuated by its accumulated transmittance. The dark field, layered self-occlusion, varied curl scales and near/far overlap supply depth.
- Portrait reduces focal length by 18%, preserving the complete hero rather than cover-cropping it. The kick's focal emphasis stays at **2%**.

### Physical-density lattice

The existing optional precompute path stores **80×96×64 physical density nodes**, packed into a **640×768 RGBA32F** atlas (~7.5 MiB). Each texel contains four XY-corner densities at one Z plane. Two exact fetches reconstruct a trilinear sample. This is an approximate reconstruction of an analytic density field, **not a reduced-resolution colour image**: rays, lighting, absorption, palette application and post remain at native output resolution. It refreshes on every visual draw, including paused changes. Unsupported float targets retain the direct analytic field.

The CPU reference checks bijective addresses, bounded interpolation and sampled density reconstruction error. Native cache/direct comparisons at 320×180, development 0/0.7/1.4/2 and 19/3600/43200 seconds had **0.27–0.61 mean 8-bit level difference**, with isolated maxima **46–66** on thin moving filaments. The approximation is explicitly not pixel-identical. Interpolation avoids stochastic noise and the coarse ray-step contours of the first versions.

## States and looks

The three states share seed **11201** and identical non-development parameters. Geometry, carrier identity, clocks and material phase never reset on development changes.

| EN                 | DE                  | Composition                                                               |
| ------------------ | ------------------- | ------------------------------------------------------------------------- |
| Drop               | Tropfen             | One feeding drop, a rolled cap and a fine branching skirt                 |
| Plumes             | Fahnen              | Three oblique vortex carriers meet, overlap and curl                      |
| Nebula             | Nebel               | Thick, marbled cloud with long trailing fingers and occluded light shafts |
| Quiet Infusion     | Stille Infusion     | Closer, slower and more translucent first ring                            |
| Twin Currents      | Zwillingsströmungen | Widely spaced, strongly curled colliding carriers                         |
| Silken Tributaries | Seidene Nebenarme   | Long branches and thin translucent pigment                                |
| Velvet Chamber     | Samtkammer          | Compact, deep pigment cloud with tighter curls                            |
| Marbled Lantern    | Marmorierte Laterne | Broad cloud, finer fingers and a more mobile view                         |

## Energy and rhythm

Energy changes flow speed (×0.65→1.3), camera speed (×0.8→1.25) and branching reach/detail. It does not multiply image brightness, and development remains independent of energy.

- **Ring roll / Ringrollung**, 4 beats: ≤8% tighter existing curl.
- **Finger reach / Fingerausgriff**, 8 beats: ≤12% extra reach on the same fingers.
- **Pigment wave / Pigmentwelle**, 16 beats: a narrow accent-lit band travels down existing pigment; no full-screen flash.

## Endlessness

Two engine clocks integrate Kelvin-scaled transport and tank orbit. All uses are integer harmonics of their 2π periods, reduced **before** adding spatial coordinates. A CPU periodicity test caught and removed a non-integral inner noise harmonic during authoring. No parameter or energy change multiplies accumulated time in the late variant. The authored constant-rate branch matches the clocks; rate changes alter speed, not phase.

The finite analytic field cannot saturate or die. A feeding drop and a closed transport excursion sustain the subject indefinitely. This is a periodic authored flow, not an indefinitely growing tank of simulated fluid.

## Visual iteration and verification

Seven improvement rounds followed the first working film: (1) replace straight stem/doughnut with cap and branching skirt; (2) density lattice and smoother native integration; (3) optical occlusion and separated pigment/backlight; (4) asymmetric carrier hierarchy and continuous sampling; (5) remove overly smooth/plastic shading and retain dark pigment; (6) richer material marbling, daughter fingers, periodic noise repair and soft tank bounds; (7) portrait fit after the 12-hour portrait probe exposed a clipped right curl. Superseded films were removed; baseline and final evidence remain.

Final reviewed evidence is in the lane output directory:

`/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/ink-bloom/output/`

- `baseline/ink-bloom.mp4`, `.png`
- `final/ink-bloom.mp4`, `.png`; Glacier world film; Ember reverse **Marbled Lantern** film
- `final/drop-still.png`, `final/nebula-still.png`
- `ladder/strip.png`: all eight looks at energy 0.1/0.5/0.9
- `native/`: three library palettes × three states, portrait states at 12 h, native cache/fallback and seam measurements

### Native GPU cost

Chrome / ANGLE Metal / Apple M3 Pro, 12 synchronous whole-frame samples per state, including post. Headless rig, assigned port 48507.

| State  | 1080p p50 / p95 | 4K p50 / p95   |
| ------ | --------------- | -------------- |
| Drop   | 3.4 / 5.6 ms    | 11.9 / 12.5 ms |
| Plumes | 3.8 / 5.3 ms    | 11.8 / 13.0 ms |
| Nebula | 3.9 / 5.6 ms    | 13.1 / 14.4 ms |

All state medians meet the new-world 8/16 ms limits. The final 4K all-eight-look run peaked at 13.9 ms p50 / 15.3 ms p95. Native float-picture readbacks reached 1.24 (Phosphor), 1.42 (Glacier) and 1.38 (Ember), confirming actual HDR fold light rather than only shader constants above one. Shared-machine wall time is not a worst-frame or dual-world venue-cadence guarantee. The direct analytic fallback is slower; the measured path uses the existing float-data cache.

`tests/ink.test.mjs` covers Kelvin mathematics, independently differentiated incompressible flow, actual material-field continuity/reversal/periodicity, density reconstruction, identity, all presets, appended-world continuity, rhythm and late clocks. `tests/time.test.mjs`, typecheck and native DE/EN UI i18n pass. The complete CPU suite has only the three expected preview/curation failures for the eight new looks; preview generation and editorial order remain the integrator's responsibility.

## Limits and rating

**9/10** for the intended restrained macro ink world: the sparse ring stays legible, the colliding plumes retain identity and the top state becomes a large, richly layered cloud without introducing unrelated geometry. The strongest palette reads are Glacier and Ember. Phosphor is more deliberately two-tone. Remaining limits: approximate single-neighbour optical shading, bounded characteristic rather than a fluid solver, repeated carrier excursion, softened sub-grid filaments, and a less explosive climax than the mechanical/laser worlds. No claim of measured 12-hour runtime soak is made; continuity is covered by clocks, CPU periodicity and native late-time probes.
