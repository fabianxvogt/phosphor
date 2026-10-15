# Ink Bloom / Tintenblüte

Family **112**, scene `ink`, world **`ink-bloom`**. All world/look/preset ids, eight preset names/seeds, schema keys, states and rhythm descriptors remain stable. Tests select the world by id, never registry position.

## Mathematics and continuous development

Kelvin's thin-core ring speed is `U = Gamma/(4 pi R) [ln(8 R/a) - 1/4]`, with `Gamma = .75`, `R = .82`, `a = .12`. `kelvinVelocity()` supplies the integrated transport-clock rate. Independent tests cover the constant, sign, dimensional scaling, core dependence and invalid inputs.

The regular axisymmetric streamfunction is `psi(r,y) = Gamma/(2 pi) r² exp(-[(r-R)²+y²]/b²)`, `b = .32`. It supplies `v_r = -psi_y/r`, `v_y = psi_r/r - U`. Finite differences verify these derivatives, Cartesian divergence and finite axis limit. The shader uses the rotational component for bounded backward-characteristic deformation. This is **authored analytic flow, not a Navier–Stokes solver**.

Wound pigment sheets surround a toroidal core whose axis leans toward the camera, exposing the hole. Its wake is above/behind the ring, flaring outward and curling back into terminal eddies. Sheet width tapers from .04 to .008 world units. Three persistent carriers retain seed-derived identities. Development 0→1 grows two oblique side carriers at different depths; 1→2 entrains them into a thresholded, domain-warped 3D billow field. Reversal preserves every phase and identity.

## Native focus, smooth interiors

1. **Ring:** bounded sector-local tracing, at most 26 steps. Small corrugation is frozen at the ray sector; this is an approximation, not an exact global SDF. Drop retains its native poloidal/toroidal lamellae. Their interior-line weight fades continuously with `1-gGrow`, reaching zero at Plumes; broad absorptive folds and the traced silhouette remain.
2. **Wake:** two native material sections intersect the carrier's vertical plane. Counter-rolling coordinate warps curl thin sheets upward/outward. Analytic noise/phase gradients transform through `dFdx(q)`/`dFdy(q)` for pixel-footprint filtering. Derivatives occur before support rejection. These are authored sections, not simulated 3D filaments.
3. **Nebula:** the first actual 3D billow sign crossing is bracketed during volume integration. Seven bisections and an interpolated root resolve its skin. Pixel-scaled silhouette coverage preserves native edges. Smooth low-frequency extinction shades the interior without periodic isolines. Bright gaps reveal the backlight/rays. An ellipsoidal sixth-order falloff prevents flat atlas-wall caps in portrait.

Only distant material uses coarse quadrature: 16 full-resolution front-to-back samples over a finite conservative interval. The scene does not render a reduced-resolution colour image.

### Interior-fringe bugfix

The former cloud skin evaluated `n = noise(hitP*22 + phase); phi = noise(hitP*7 + .6*n)*97 + 4*n`, then a narrow `abs(sin(phi))` mask. This explicitly drew noise-level contours across dense bodies. Its local `fwidth(phi)` widening was not an integral over the nonlinear warped footprint; even resolved fringes looked engraved. The high-frequency `n` also warped the broad extinction folds.

Remove both cloud-interior terms, retaining `(.5 + .5*noise(hitP*3))^4` for smooth folds. Constant optical depth **.6076** retains the removed lines' approximate DC absorption: `.25 + 4 * 2*asin(.14)/pi`. The native crossings, silhouette coverage, physical field, atlas, ring tracing and independent wake hairlines are unchanged. Plumes' regular ring-interior lines fade with growth; Drop keeps them fully.

A same-frame RGBA16F→RGBA32F ablation leaves the visible fringes intact: dense-interior Laplacian RMS **6.0220→6.0225** at 960×540. Removing cloud isolines gives **3.0718**, before also removing the fine fold warp. Precision was not the cause; the half-float cache is retained. No engine change.

## Light, camera and physical-data cache

A palette-primary/white diffused backlight and secondary side lamp illuminate the tank. Spectral Beer extinction keeps diluted layers coloured and dense overlaps dark. Displaced density supplies approximate light-side occlusion, not multiple scattering. The illumination moment is normalized by physical density, not focus attenuation. Broad irregular fans diverge from an off-axis light; no screen-X stripes. Accent is confined to the existing pigment-wave gesture. The bright tank is an explicit art direction exception to the generic dark-background rule.

The continuous camera orbits/cranes with parallax. Kick changes focal length by at most 2%; portrait reduces focal length rather than cropping Drop. HDR backlight feeds bloom.

A guttered **80×96×40** lattice packs eight by five Z slices into **656×490 RGBA16F**, about **2.45 MiB**. Channels: R density, G displaced light-side density, B density-weighted illumination, A signed billow field. Two bilinear slice fetches plus Z interpolation reconstruct physical data, not colour. Duplicate gutters prevent slice bleeding. Missing float targets retain the slower analytic fallback. Approximate cache/fallback images are not pixel-identical. Optional half-float/linear engine support is inherited unchanged; no shared-file edit in this round.

## Stable looks, energy and endlessness

| EN                 | DE                  | Composition                                   |
| ------------------ | ------------------- | --------------------------------------------- |
| Drop               | Tropfen             | Open rolled torus and curling wake            |
| Plumes             | Fahnen              | Three oblique, depth-separated carriers       |
| Nebula             | Nebel               | Dark 3D billows, smooth interiors, crisp gaps |
| Quiet Infusion     | Stille Infusion     | Closer, slower, diluted                       |
| Twin Currents      | Zwillingsströmungen | Wide, strongly curled carriers                |
| Silken Tributaries | Seidene Nebenarme   | Longer, lighter branches                      |
| Velvet Chamber     | Samtkammer          | Compact dense billows                         |
| Marbled Lantern    | Marmorierte Laterne | Wider spread and moving camera                |

State presets retain seed **11201** and identical non-development parameters. Energy changes transport ×.65→1.3, orbit ×.8→1.25 and wake reach, not master brightness. Bounded 4/8/16-beat gestures: ≤8% ring curl, ≤12% finger reach, compact cubic pigment-wave accent; no full-screen flash.

Transport and orbit use integrated 2π engine clocks. Integer material harmonics reduce before adding spatial coordinates. Development never resets time/seed. The finite analytic field cannot saturate or die: recurring flow, not an indefinitely filling tank.

## Bugfix films and native stills

Evidence root:

`/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/ink-bloom/output/`

- Baseline: `bugfix-baseline-film/ink-bloom.mp4`, `.png`, exactly `dd4e066`.
- Revision 1: remove cloud isolines/fine fold warp; film reviewed, then identify remaining Plumes engraving. Superseded movie removed; strip retained in `bugfix-round1-film/ink-bloom.png`.
- Revision 2: fade ring-interior engraving with growth, preserving Drop/wakes; `bugfix-final-film/ink-bloom.mp4`, `.png`.
- Extra final films: `bugfix-final-film/ink-silken-tributaries-glacier.mp4` and `ink-velvet-chamber-ember.mp4`, with strips.
- `bugfix-baseline-stills/` and `bugfix-final-stills/`: Plumes, Nebula, Silken Tributaries (Glacier), Velvet Chamber (Ember), each at **960×540, 1920×1080, 3840×2160**, native PNGs.
- `bugfix-diagnostic/`: original / float32 / no-isoline ablations.
- `bugfix-comparison.png`: before/after film strips. `bugfix-crops-2160p.png`: 1:1 crops from 4K images.

## Performance and verification

Native headless Chrome, ANGLE Metal / Apple M3 Pro, port **48507**, `PHOSPHOR_HEADLESS_RIG=1`. Alternating **A B B A**, three rounds, **72 samples/version/look/resolution**, against exactly `dd4e066`; synchronous whole-frame throughput including post:

| State / look       | 1080p baseline → final | 4K baseline → final |
| ------------------ | ---------------------- | ------------------- |
| Drop               | 3.2 → 3.0 ms           | 9.8 → 9.7 ms        |
| Plumes             | 4.3 → 4.3 ms           | 13.6 → 13.6 ms      |
| Nebula             | 4.5 → 4.4 ms           | 14.6 → 13.9 ms      |
| Silken Tributaries | 4.7 → 4.6 ms           | 15.0 → 14.3 ms      |
| Velvet Chamber     | 4.5 → 4.4 ms           | 14.3 → 13.6 ms      |

All within +5%. Required standard 36-sample final profiler: **2.9 / 4.8 / 4.8 ms** at 1080p; **10.3 / 14.8 / 14.3 ms** at 4K. Shared-machine contention is material: use paired data for regressions, not prior sessions' absolute costs. Raw samples: `bugfix-paired-profile.json`; standard profiles: `bugfix-{baseline,final}-{1080p,4k}/profile.json`. These are not venue cadence certification.

CPU tests retain Kelvin/flow, continuity, atlas, crossings, clocks, rhythm and world-by-id checks. New tests cover the DC extinction replacement, spatial derivative bound and growth fade. `PHOSPHOR_INK_GPU=1 node --test tests/browser/ink-sampling.test.mjs` runs a restored-engraving negative control: high-frequency interior energy decreases, Drop remains unchanged, and every tested physical-field cache hashes identically. Native cache/fallback/restoration and time-wrap checks remain separate; see the output report for exact results.

## Assessment

**7.5/10, not 9.** Fine black interior contours are removed rather than blurred. Smooth pigment, native silhouettes and independent wake hairlines remain. Far material is deliberately soft; some grazing cloud boundaries are coarse/angular; wake sections are authored approximations. This bugfix is not a photorealism redesign. No actual 12-hour soak or venue qualification is claimed.
