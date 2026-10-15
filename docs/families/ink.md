# Ink Bloom / Tintenblüte

Family **112**, scene `ink`, world `ink-bloom`. The existing eight preset names, seeds, parameter keys, state looks and world definition are unchanged. This revision replaces the solid cap/heart-shaped volume with wound pigment sheets against a bright, localized tank backlight.

**Engine addition:** optional half-float / linear-filtered physical-data caches, documented below. Existing caches retain their exact nearest-filtered RGBA32F path.

## Signature mathematics

The thin-core Kelvin self-induced speed is

`U = Gamma / (4 pi R) [ln(8 R / a) - 1/4]`.

`Gamma = 0.75`, `R = 0.82`, `a = 0.12`. `kelvinVelocity()` supplies the actual integrated transport-clock rate. CPU tests check its constant, sign, dimensional scaling, core dependence and invalid inputs.

A regular axisymmetric streamfunction supplies the analytic circulation:

`psi(r,y) = Gamma/(2 pi) r² exp(-[(r-R)²+y²]/b²)`, `b = 0.32`.

`v_r = -(1/r) dpsi/dy`, `v_y = (1/r) dpsi/dr - U`.

`inkVelocity()` is independently checked by finite-difference derivatives of psi and Cartesian divergence, including the finite axis limit. The shader uses the rotational component as a bounded backward-characteristic deformation. This is an authored analytic flow, **not a Navier–Stokes solver**.

The material cross-section is now a spiral: its phase combines toroidal angle, distance from the vortex core and two smooth Fourier scales. Thin sheets surround a dense core; the water between turns remains transparent. There is no filled hemisphere or dome. Corrugated trailing sheets split into daughters, with uneven lengths and curling tips. These are Rayleigh–Taylor-like fingers, not a numerical instability simulation.

Three persistent carriers retain their identities. Development 0→1 grows the two side carriers from zero scale, at different depths and oblique angles. Development 1→2 expands the existing carriers and moves a threshold through a domain-warped pigment field: cloud contours grow through the tank rather than crossfading finished pictures. Reversal retains material phase, seed, camera and carrier identity.

## Composition and optics

- The camera is closer and lower than before. The first ring spans approximately half the short screen side, with a long feeding wisp and unequal trailing filaments. Plumes separates three rings in depth; Nebula extends marbling through the frame.
- Slow closed orbit, perspective parallax, small crane and a maximum 2% kick emphasis. Portrait reduces focal length rather than cover-cropping the first ring.
- A localized, palette-derived diffusion lamp replaces the nearly black backdrop. The outer water remains dark. This deliberately prioritizes the requested **bright backlit tank** over the previous mostly-black composition.
- Full-resolution 40-step front-to-back quadrature over a conservative finite tank interval. Spectral Beer extinction produces dark pigment cores and coloured transmission. Single scattering is approximate.
- A displaced analytic density sample is cached alongside density. Its continuous interpolated difference supplies rim light and local optical occlusion, without differentiating a piecewise-trilinear grid. The earlier derivative-based lighting produced artificial ribbing and was removed.
- Broad, irregular, diverging light fans come from one off-axis lamp. There is no periodic screen-X stripe pattern. Shafts are behind, and attenuated by, the ink.
- All colour derives from primary, secondary, accent and white/black. Accent is confined to the narrow pigment-wave gesture. The backlight, rather than the pigment, supplies most HDR radiance.

## Physical-data atlas and optional engine support

The atlas contains **128×144×64** world-space material nodes, packed as eight by eight Z slices. Each slice has a duplicated one-node gutter. Dimensions: **1040×1168**, **RGBA16F**, approximately **9.3 MiB**. Channels store density, displaced light-side density and an illumination moment, not a rendered colour image.

Two bilinear slice fetches plus a Z interpolation reconstruct the physical fields. Lighting, absorption, ray integration and post-processing remain at native display resolution. The lattice extent changes smoothly with development, conserving resolution around the small first ring. The analytic material itself does not change identity with that extent.

`precompute.format: "rgba16f"` opts into half-float storage; `precompute.filter: "linear"` opts into filtering. WebGL2 supports linear half-float filtering without a separate extension. Existing unspecified formats remain RGBA32F / nearest. Linear RGBA32F requires `OES_texture_float_linear`; without it, or without renderable float targets, the analytic fallback is compiled. No other family opts into the new options.

The CPU atlas test checks node-address bijection, gutter isolation, half precision and reconstruction error. Native cache/fallback comparisons at four development/time combinations differ by **0.28–1.27 mean 8-bit levels**, with isolated maxima **21–45** on filaments. This is an approximation, not pixel identity. The direct analytic fallback is slower and is not the budgeted M3 Pro path.

## Stable states and looks

The three state presets retain seed **11201** and identical non-development parameters.

| EN | DE | Composition |
| --- | --- | --- |
| Drop | Tropfen | Dark rolled ring, transparent sheets and uneven trailing wisps |
| Plumes | Fahnen | Three oblique, depth-separated carriers and branching fingers |
| Nebula | Nebel | Frame-filling marbled pigment and occluded broad light fans |
| Quiet Infusion | Stille Infusion | Closer, slower and more translucent |
| Twin Currents | Zwillingsströmungen | Wider, more strongly curled carriers |
| Silken Tributaries | Seidene Nebenarme | Longer branches and thin pigment |
| Velvet Chamber | Samtkammer | Compact, dense marbling |
| Marbled Lantern | Marmorierte Laterne | Wider spread and a more mobile camera |

## Energy, rhythm and endlessness

Energy changes transport speed ×0.65→1.3, orbit speed ×0.8→1.25 and finger reach. It does not multiply image brightness.

- **Ring roll / Ringrollung**, 4 beats: ≤8% extra curl on existing material.
- **Finger reach / Fingerausgriff**, 8 beats: ≤12% extra reach on the same fingers.
- **Pigment wave / Pigmentwelle**, 16 beats: a narrow compact cubic accent band crosses the existing volume. Polynomial support avoids a per-sample exponential; no full-screen flash.

Kelvin transport and camera orbit use two integrated engine clocks with 2π periods. All material uses are integer harmonics, reduced before adding spatial coordinates. No development change resets time or seed. The finite analytic field cannot saturate or die. This is a recurring authored flow, not an indefinitely filling simulated tank.

## Nine filmed revision rounds

The committed baseline was independently rated about 5/10; the earlier self-rating of 9/10 was too generous.

1. Remove the solid dome; author spiral sheets, spectral extinction and a bright diffusion lamp. Initial cloud cost fails budget.
2. Increase the density grid and tighten bounds; remove redundant per-pixel light lookup. More legible, but ribbed lighting remains.
3. Curl finger tips, separate spectral absorption and make cloud contours grow spatially. Dark cores improve; atlas-gradient artifacts persist.
4. Remove discontinuous density-grid normals. Smooth silhouettes return, but material becomes too soft.
5. Separate all three carrier centres; prototype a finer linear float atlas and illumination moment. RGBA32F bandwidth is too expensive.
6. Opt into half-float data and guttered interpolation. Performance recovers; refine cloud billows.
7. Cache the analytic light-side density before interpolation. Fine folds return, but the first rim-light strength is too white.
8. Reduce rim light and deepen pigment extinction. Review Phosphor, Glacier and reverse Ember films.
9. Replace the gesture exponential with compact cubic support; settle at 40 quadrature samples after all-look profiling exposes the wide Marbled Lantern as the costly case. Re-film all final films.

Superseded films are deleted. The baseline, final films and independently filmed Liquid Chrome comparison remain in the lane output directory:

`/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/ink-bloom/output/`

- `next-baseline/ink-bloom.mp4`, `.png`
- `reference/liquid-chrome.mp4`, `.png`
- `next-final/ink-bloom.mp4`, `.png`
- `next-final/ink-bloom-glacier.mp4`, `.png`
- `next-final/ink-marbled-lantern-ember.mp4`, `.png` (reverse)
- `next-ladder/strip.png`: all eight looks at 0.1 / 0.5 / 0.9 energy
- `next-native/`: three palettes × three states, portrait at 12 h, 4K still, late seams and analytic-cache comparison

## Native cost and verification

Headless Chrome, ANGLE Metal / Apple M3 Pro, port 48507. 24 synchronous whole-frame samples per state, including post, excluding asynchronous flash approval. Medians meet 8 ms / 16 ms limits.

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Drop | 3.0 / 3.5 ms | 8.8 / 9.1 ms |
| Plumes | 4.5 / 5.0 ms | 12.6 / 13.1 ms |
| Nebula | 5.5 / 5.9 ms | 13.7 / 14.3 ms |

The separate all-eight-look 4K run peaks at **14.0 ms p50 / 14.6 ms p95**. A same-harness remeasure of `8c56473` gave baseline p50 values of 3.9 / 4.0 / 4.7 ms at 1080p and 11.1 / 11.0 / 12.7 ms at 4K. Drop is cheaper; Plumes and Nebula cost more than that baseline, but all remain below the explicit 8/16 ms new-world limits. These are shared-machine throughput measurements, not venue cadence guarantees.

- `tests/ink.test.mjs`: Kelvin mathematics, independently differentiated incompressible flow, actual wound-sheet material continuity/reversal/periodicity, half-float lattice reconstruction, persistent identity, preset validation, rhythm, clocks and world lookup **by id**.
- `tests/time.test.mjs`: passes.
- `PHOSPHOR_INK_GPU=1 node --test tests/browser/ink-precompute.test.mjs`: passes. Covers half/linear allocation, absent float-linear extension, missing float targets, RGBA32F-linear fallback, unchanged nearest RGBA32F caches, paused refresh, context restoration and texture cleanup.
- Native palette / late-time probes: zero GL errors and non-finite uploads; 15 seam probes at 3600 / 4096 / 43200 seconds pass.
- Typecheck, build and native DE/EN UI i18n: pass.
- Full root CPU suite: 736 pass, 9 skipped, only the three expected catalogue preview/curation failures. Preview assets and editorial ordering are intentionally untouched.

## Honest rating and remaining limits

**7/10**, not 9. The bright tank, dark cores, scale progression and missing stripes are substantial improvements over the old small blue-grey blob. The reference photography informed sheet overlap, transmission and rolling edges. However, Liquid Chrome still has markedly crisper local detail and more convincing material depth. This ink remains soft at 4K, its toroidal carriers are too regular, the climax retains recognizable ring shapes, and fine physical turbulence is under-resolved by the density lattice. Local shadowing is approximate; no actual 12-hour runtime soak is claimed. A future revision should improve those weaknesses rather than restore a generous self-rating.
