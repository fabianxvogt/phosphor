# Ink Bloom / Tintenblüte

Family **112**, scene `ink`, world **`ink-bloom`**. World id, eight preset names/seeds, look ids, schema keys, three states and rhythm descriptors are unchanged. Tests locate the world **by id**, never registry position.

## Signature mathematics and continuous development

Kelvin's thin-core ring speed is

`U = Gamma / (4 pi R) [ln(8 R / a) - 1/4]`.

`Gamma = 0.75`, `R = 0.82`, `a = 0.12`. `kelvinVelocity()` supplies the integrated transport-clock rate. Independent tests check its constant, sign, dimensional scaling, core dependence and invalid inputs.

The regular axisymmetric streamfunction

`psi(r,y) = Gamma/(2 pi) r² exp(-[(r-R)²+y²]/b²)`, `b = 0.32`,

supplies `v_r = -psi_y/r`, `v_y = psi_r/r - U`. CPU finite differences verify the derivatives, Cartesian divergence and finite axis limit. The shader uses the rotational component for bounded backward-characteristic deformation. This is an **authored analytic flow, not a Navier–Stokes solver**.

The ring consists of wound pigment sheets around a toroidal core. Its axis leans toward the camera, exposing the hole. The wake is **above/behind** the ring and flares outward before curling back into terminal eddies. The old hanging skirt is gone. Sheet width tapers from 0.04 to 0.008 world units.

Three persistent carriers retain seed-derived identities. Development 0→1 grows the two oblique side carriers at different depths; 1→2 entrains the carriers into a thresholded, domain-warped 3D billow field. Carrier density is reduced, not left as three blurred tyres behind the clouds. Every phase is retained during reversal.

## Native focus, not a blur blanket

There are three complementary material scales:

1. **Focused ring:** bounded, sector-local torus tracing, at most 26 distance steps. Small corrugation is frozen at the ray's sector to avoid repeated trigonometry. This is an approximation to a wrinkled torus, not an exact global SDF. Native lamellae combine poloidal/toroidal phase and high-frequency material noise. Optical folds are absorptive, not metallic highlights.
2. **Focused wake:** material sections intersected in the carrier's vertical plane. Two counter-rolling coordinate warps curl thin sheets upward/outward. Their analytic noise/phase gradients transform through `dFdx(q)`/`dFdy(q)` for pixel-footprint filtering. Derivatives occur **before** conservative support rejection; expensive fine noise only runs inside the sheet support. These are authored sections, not a full 3D filament simulation.
3. **Nebula:** the first sign crossing of the actual **3D** billow field is bracketed during volume integration. Seven bounded bisections plus a final interpolated root resolve its skin. A midpoint-only prototype quantized high-frequency coordinates and was rejected after native still review. Deferred skin shading evaluates derivatives in a uniform branch, and unresolved phase converges to average line coverage. Bright gaps reveal the backlight and irregular diverging rays; cloud interiors remain dark and occluded. An ellipsoidal sixth-order falloff makes the field negative before the atlas walls, preventing flat caps in portrait. Earlier planar cloud-section prototypes were discarded.

Only distant material uses coarse quadrature: **16 native-resolution front-to-back samples** over a conservative finite tank interval. No reduced-resolution colour rendering is used. The near skin, optical extinction, light, camera and post remain at full display resolution.

## Colour, light and camera

- Smooth luminous diffusion lamp, derived from primary and white; a soft **secondary-coloured side lamp** gives palette-dependent separation. The bright tank deliberately follows the owner's explicit direction rather than the generic mostly-black-background rule.
- Spectral Beer extinction: diluted layers retain palette colour, overlapping dense layers approach black. Local displaced density supplies approximate light-side occlusion; this is not multiple scattering.
- Correctly normalized illumination moment: focus attenuation does **not** divide the moment and artificially brighten the haze.
- Broad irregular light fans diverge from an off-axis source and are extinguished by pigment. No periodic screen-X stripes. Accent stays confined to the existing pigment-wave gesture.
- Continuous slow orbit/crane and perspective parallax. Kick changes focal length by at most 2%. Portrait reduces focal length rather than cropping the first ring. Backlight supplies HDR radiance above 1.0.

## Physical-data cache

A guttered **80×96×40** lattice packs eight by five Z slices into **656×490 RGBA16F**, about **2.45 MiB** (previous final: 128×144×64 / 1040×1168, 9.3 MiB). Channels store:

- R: material density;
- G: displaced light-side density;
- B: density-weighted illumination;
- A: signed 3D billow field.

Two bilinear slice fetches and Z interpolation reconstruct continuous physical data, not rendered colour. Gutter nodes prevent slice bleeding. The cache may be smaller because native surfaces/sections now resolve the focus detail independently.

The optional `precompute.format: "rgba16f"` / `filter: "linear"` engine support is **inherited unchanged from the preceding commit**. No engine or shared-file edit in this round. Missing float render targets retain the analytic fallback, which is slower and not the budgeted M3 Pro path. Cache/fallback images are approximate, not pixel-identical.

## Stable states and looks

| EN                 | DE                  | Composition                                                |
| ------------------ | ------------------- | ---------------------------------------------------------- |
| Drop               | Tropfen             | Open rolled torus; upward/outward curling wake             |
| Plumes             | Fahnen              | Three depth-separated oblique carriers                     |
| Nebula             | Nebel               | Dark 3D billows, native marbled skin, bright gaps and rays |
| Quiet Infusion     | Stille Infusion     | Closer, slower, diluted                                    |
| Twin Currents      | Zwillingsströmungen | Wider, more strongly curled carriers                       |
| Silken Tributaries | Seidene Nebenarme   | Longer, lighter branches                                   |
| Velvet Chamber     | Samtkammer          | Compact dense billows                                      |
| Marbled Lantern    | Marmorierte Laterne | Wider spread and more mobile camera                        |

State presets retain seed **11201** and identical non-development parameters.

## Energy, rhythm and endlessness

Energy changes transport speed ×0.65→1.3, orbit speed ×0.8→1.25 and wake reach, not master brightness. Existing 4/8/16-beat gestures remain bounded: ≤8% ring curl, ≤12% finger reach, and a compact cubic accent band through existing pigment. No full-screen flash.

Kelvin transport and camera orbit use integrated engine clocks with 2π periods. Material phases use integer harmonics and reduce before adding spatial coordinates. Development never resets phase, seed or carrier identity. The finite analytic field cannot saturate or die. It depicts recurring flow, not an indefinitely filling tank.

## Filmed iteration and evidence

Twelve filmed revisions in this final round: orientation/upward wake → filtered fine sections → native ring skin → less regular billows → torn lamellae → replace planar clouds with actual 3D crossings → absorptive cloud skin → normalize haze illumination → deferred antialiasing/cheaper tracing → analytically filtered support-culling → interpolated cloud roots and phase prefiltering → rounded tank-boundary falloff after portrait review. Two additional native-only probes informed these revisions. Superseded movies are removed; a compact iteration montage remains.

Evidence directory:

`/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/ink-bloom/output/`

- Before: `next-final/ink-bloom.mp4`, `.png` (the supplied `f63f1ff` final).
- After: `final-film/ink-bloom.mp4`, `.png`; Glacier and reverse Ember extra-look films alongside.
- `reference/liquid-chrome.mp4`, `.png`: independent reference film retained from the prior round.
- `final-comparison-strip.png`: before / after / reference.
- `final-ladder/strip.png`: eight looks at energy 0.1 / 0.5 / 0.9.
- `final-native/`: three palettes × three states; 1080p/4K states; portrait at 12 h; seams and cache/fallback comparisons.

## Performance and verification

Native headless Chrome, ANGLE Metal / Apple M3 Pro, assigned port **48507**, `PHOSPHOR_HEADLESS_RIG=1`. Standard 36-sample type profiles include post:

| State  | 1080p p50 | 4K p50  |
| ------ | --------- | ------- |
| Drop   | 2.8 ms    | 7.6 ms  |
| Plumes | 3.5 ms    | 10.1 ms |
| Nebula | 3.5 ms    | 10.8 ms |

All authored states meet 8/16 ms p50. Shared-machine contention is material: additional alternating **A B B A** profiling compares the supplied `f63f1ff` with this shader under the same conditions, 72 samples/version/state/resolution. Final p50 is **18–33% cheaper at 1080p and 17–25% cheaper at 4K**, within the +5% constraint. The all-eight-look 4K probe also passes: maximum **11.3 ms p50 / 14.8 ms p95**. Raw samples, standard profiles and extra-look probes are retained in output; these are throughput measurements, not venue cadence certification.

Verification:

- CPU tests: Kelvin speed, independently differentiated incompressible flow, actual material continuity/reversal/periodicity, signed 3D crossings and interpolated roots, analytic noise gradients, atlas/gutter reconstruction, presets, clocks, rhythm and world lookup by id.
- Native cache regression: formats/filtering, absent extensions, fallback, paused refresh, restoration, cleanup and unchanged exact-cache defaults.
- Native palette / 1080p / 4K / portrait / late probes: no GL errors or non-finite uploads. Dedicated time-wrap/rate-step audit uses the late variant and passes.
- Typecheck, targeted tests, build and native DE/EN i18n pass. Full root CPU suite has only the three expected protected catalogue preview/curation failures.

## Honest assessment

**7.5/10, not 9.** Focus detail and the open torus are markedly clearer than the previous soft jellyfish. Billows now have real 3D silhouettes, dark interiors and bright gaps. However, lamellae remain too regular/engraved in close stills, the wake is partly authored sections, and the far field is deliberately soft. Native images are more detailed, not photoreal macro ink. Liquid Chrome remains a stronger material reference. No actual 12-hour runtime soak or venue qualification is claimed.
