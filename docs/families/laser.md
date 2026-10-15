# Laser Grid / Lasergitter

Family **105**, renderer `laser`, world `laser-grid`. A hinged vector landscape develops into a dense skyline and a vaulted club laser show. Full-resolution analytic rendering; no volume march, simulation, engine extension or reduced-resolution colour pass.

## Signature mathematics

Five planar strips share one material grid: an 18-unit floor, two 11-unit wings, and two `9 / cos(0.42)`-unit outer wings. Development 1→2 rotates the wings by `smoothstep(1,2,d) π/2`, and the outer wings by `smoothstep(1,2,d) (π−0.42)`. The roof closes at x=0. Analytic ray/plane intersections retain material coordinates through the hinges. Footprint-filtered grid lines, four-cell ribs and hinge rails give the architecture its crisp vector identity.

**32 persistent towers** share `(side, bay, seed-derived height/footprint)` throughout development. Heights grow with `smoothstep(0,1,d)`, then retract to 16% while following the wing basis. Varied footprints, occupied window-row lines, uprights and antenna tips make a skyline rather than twelve identical boxes. Analytic box intersections provide opaque view occlusion. Lasers leave hot Gaussian impact dots on the nearest visible surface; their endpoints also stop at the developing floor/walls/roof.

### Closed-form beam integral

A finite beam has axis n, length L, transverse Gaussian radius w and longitudinal Gaussian radius `ell = 0.38 L`:

`rho(p) = exp(−|p_perp|²/(2w²) − z²/(2ell²))`, clipped to axial distance `[0,L]`.

For view ray `p(t)=p0+t r`, with p0 relative to the beam midpoint:

- `c=r·n`, `z=p0·n`, `q=p0−zn`, `v=r−cn`
- `A=(v·v/w²+c²/ell²)/2`, `B=q·v/w²+zc/ell²`
- `tc=−B/(2A)`
- `C=|q+v tc|²/(2w²)+(z+c tc)²/(2ell²)`

End planes, the camera near plane and nearest opaque surface give `[lo,hi]`. Beer extinction sigma is **inside** the integral:

`I = exp(−C−sigma tc+sigma²/(4A)) sqrt(pi)/(2 sqrt(A)) [erf(sqrt(A)(hi−shift))−erf(sqrt(A)(lo−shift))]`

where `shift=tc−sigma/(2A)`. The axial envelope keeps A positive for parallel rays. The core retains Abramowitz–Stegun 7.1.26 (erf absolute error <1.5e−7); the soft sheath uses 7.1.25 (<4.7e−4), removing two exponentials. Both use the same closed-form integral. Six-sigma rejection discards at most `limit exp(−18)` before attenuation. A bounded Henyey–Greenstein phase function (`g=0.3`) weights the sheath. Core emission exceeds 1.0 on the float picture path and feeds bloom.

There are at most **21 beams**: one horizon scanner, twelve façade/crossfire rays, and eight convergent cone spokes. The scanning liquid-sky plane is a finite analytic ray/plane crossing, softly filled and rippled. The finite cone has quadratic intersections, Beer-integrated interior fill and Gaussian scan bands. Two circular scan fronts make its mouth legible at projector scale. Those thin bands are centre-plane approximations, not a second volume march.

## Exact geometry cache and bounds

`scene-laser-data.mjs` supplies the same geometry to the picture and optional **32×41 RGBA32F** per-frame data pass (~20.5 KiB). It stores tower bounds/transforms, beam endpoints, camera-relative Gaussian coordinates, and a 32×32 screen-tile candidate mask. This is geometry data, never a cached low-resolution picture. It refreshes on every visual draw, including paused edits. Without float data targets the shader evaluates the same functions directly.

Tower bounds are perspective extrema of all eight rotated box vertices, including the antenna tip. Beam bounds enclose the complete six-sigma capsule. For camera-space endpoint depths za, zb, radius R=2.4 and maximum projected endpoint norm S, a conservative screen radius is

`r(u) = R (1+S) [(1−u)/za+u/zb] / (1−R/min(za,zb))`.

Inverse depth is affine along the projected segment, so this radius tapers. A quadratic minimum tests the union of those discs; the tile test additionally includes its half-diagonal and AA margin. Candidate order is unchanged. Core bounds tighten by its physical radius. Below 180 px short-side output the shader conservatively retains all beam candidates, since the AA core can become wider than the physical sheath. Wire AA uses an analytic world footprint; façade calculations run only on actual box hits. Tiny impact-dot and scan-band tails are rejected before exponentials.

## States and looks

The first three presets share seed **10501** and every non-development parameter. No IDs or names changed in round 2.

| EN | DE | Development / composition |
| --- | --- | --- |
| Horizon | Horizont | 0: sparse vector plane, scanning laser, faint horizon haze and sheet |
| Towers | Türme | 1: 32 varied towers, lit rows, antenna tips and bright façade strikes |
| Tunnel | Tunnel | 2: the same sheet closes into a vault; crossfire, liquid sky and a convergent light tunnel |
| Low Voltage | Niederspannung | 0.3: low viewpoint, coarse grid, slow broad haze |
| Vector District | Vektorviertel | 1: tall skyline, high viewpoint, fine façades |
| Folded Chapel | Gefaltete Kapelle | 1.65: held-open wings and low viewpoint |
| Light Organ | Lichtorgel | 2: fine vault, narrow aperture, higher eye |
| Afterimage Arcade | Nachbildarkade | 2: coarse vault, shallow relief, wider aperture and drifting view |

## Energy, rhythm and camera

Energy changes sweep/glide rates (×0.75→1.35), interleaved beam population and half-cell grid detail, not picture gain. Four persistent cone spokes acquire four softly enveloped neighbours on the kick: multiplication is bounded by the 21-beam cap, with a nonzero pedestal instead of binary strobing. Low-energy Tunnel retains upper and lower banks. Horizon remains sparse at every energy.

The three unchanged family gestures are **Beam address / Strahladresse** (4 beats, one beam receives accent), **Aperture breath / Atmende Öffnung** (8 beats, ≤12% opening), and **Vault rib / Gewölberippe** (16 beats, a narrow travelling material rib). Accent is otherwise absent from the static field. The kick changes focal length by at most **2%**.

The camera follows a slow closed lateral/dolly/crane path: x±1.1, z=−9±1.8, eye±0.25. No roll or cuts. Every tower remains ahead of the entire camera path, even at maximum footprint/height. Short-side ray footprints compose natively in landscape and portrait.

## Endlessness and continuity

Two engine clocks integrate sweep and camera rates with period 2π. The authored branches retain the corresponding rate products. Every trigonometric use is an integer harmonic; phases reduce before spatial/seed sums. Development never enters the clocks, tower identity or camera phase. Reversal unfolds the same material sheet and lowers the same towers.

## Cost and verification

Apple M3 Pro / Chrome ANGLE Metal; synchronous whole-frame throughput including post, twelve measured frames per state. All films remain 960×540, and every rig process is headless.

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Horizon | 2.2 / 2.5 ms | 5.4 / 5.7 ms |
| Towers | 2.5 / 2.7 ms | 8.8 / 9.1 ms |
| Tunnel | 3.0 / 3.2 ms | 11.3 / 11.7 ms |

A separate 4K run across all eight looks peaked at **12.1 ms p50 / 12.7 ms p95**. The previous state measurements were 13.2 / 26.7 / 25.1 ms medians, with 30.5 ms p95 in Towers. An additional 84-case probe covers seven development positions, six times through 43,200 s and both resolutions at energy 0.95. Worst medians: **4.9 ms at 1080p, 14.3 ms at 4K**. Shared-machine wall-time tails reached **8.1 / 22.2 ms** respectively; this is not a hard per-frame ≤16 ms or dual-world venue-cadence guarantee.

`tests/laser.test.mjs` independently integrates the original 3D beam density with 24,000-step Simpson quadrature: narrow/broad beams, parallel/antiparallel rays, extinction, endpoint occlusion and rejection tails. It also checks both erf errors, prepared-coordinate equivalence, conservative tapered perspective bounds, exact float mask storage, hinge joins/isometry/roof closure, 32-tower identity and reversibility, surface-end clipping, cone Beer fill against numerical integration, camera safety, preset/world continuity, gesture bounds and late clocks.

Native GPU differential check: 24 cases spanning intermediate development, 19/3600/43,200 s and tiny thumbnails. Both an **unbounded beam path** and **uncached geometry fallback** differ by at most one 8-bit level; all three thumbnail cases are pixel-identical. Zero GL errors/non-finite uploads in the differential, state profiles and extended timing matrix. CPU suites/typecheck pass; native German/English UI i18n test passes.

Evidence under `artifacts/films/laser-r2-*`: v1/v2/v3 and final world films/contact strips, Ember extra look, Glacier reverse look, all-look energy ladder, three-palette stills and portrait/late-time captures. Performance JSON lives under `artifacts/performance/laser-r2-*`.

## Wave 5 rework · 15 October 2026

Three filmed rounds, with all saved IDs/names/seeds/schema/preset values and world definition unchanged:

1. Weakest: the skyline read as transparent wire boxes. Added a bounded palette-only directional face wash and height gradient, strengthened corners, lowered repetitive window rows. No new geometry or loops.
2. Weakest: the light was mostly thin lines and Horizon was spare. Rebalanced core/sheath (0.58/0.27), raised the existing finite scanning sheet and cone fill. These use the same exact integrals and candidate bounds, not wider unbounded beams.
3. Weakest: uniform grid density competed with the hero. Dimmed minor grid, strengthened four-cell ribs/hinges, increased distance extinction and the existing cone mouth fronts. The tunnel now reads as a hierarchy of light and structural ribs.

Headless Chrome / ANGLE Metal / M3 Pro, synchronous throughput including post:

| State | 1080p baseline → final p50 (30 samples) | 4K paired baseline → final p50 (60 samples) |
| --- | --- | --- |
| Horizon | 2.5 → 2.5 ms | 7.8 → 8.1 ms |
| Towers | 3.4 → 3.3 ms | 11.6 → 12.0 ms |
| Tunnel | 4.6 → 3.8 ms | 14.0 → 14.4 ms |

Every paired median is within +5%. Original 30-sample 4K baseline was 8.4/11.7/14.8 ms; first final was 7.6/11.8/15.6 ms (Tunnel +5.4%, hence the longer paired check against `deaaae1`, not silently discarded). Paired final p95 9.4/12.9/15.5 ms. Shared GPU wall-time variation is not a venue cadence guarantee.

Evidence root: `/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/rework-wave4/output/laser/`. Baseline `baseline/laser-grid.{mp4,png}`, final `final/laser-grid.{mp4,png}`. Also Ember Folded Chapel, Glacier reverse world, all-look ladder, full-size Tunnel still, three-palette low-energy states, portrait states and 4K still. `scripts/verify-wave4-reworks.mjs --families laser` passes 60 low/high-energy, intermediate-development and 12-hour native cases, zero GL/non-finite errors. Added CPU/source regression for bounded face lighting and the vector hierarchy; existing independent integral and geometry tests remain authoritative. Superseded films removed. Honest rating: **9/10** for its deliberately vector-graphic idiom; not photoreal architecture.

No engine or existing shared registration files changed. The new optional verification script also supports the other wave-4 reworks.

## Limits

- Deliberately graphic vector architecture, not photoreal buildings. Horizon retains a large dark sky for breakdowns.
- Homogeneous/analytic haze and stylised scan bands, not turbulent smoke or multiple scattering.
- View occlusion and folded-sheet endpoint clipping are analytic; full light-path shadowing through every tower is not simulated.
- The standard states and all extended medians meet the timing targets; shared-GPU wall-time tails do not establish a strict worst-frame bound.
- Catalog preview/curation generation remains L0's responsibility. No engine, control UI, ordering or catalog-test changes in round 2.
