# Thunderhead / Gewitterzelle

World `thunderhead`, scene `storm`, family **107**. **Haze / Dunst → Towers / Türme → Supercell / Superzelle**. All eight look names, seeds, schema keys and preset parameters remain unchanged. The three world states share seed **10701** and identical non-development parameters.

## Composition and development

A horizon-wide weather bank rises into a group of cumulonimbus towers, then spreads into an anvil and a lowering, rotating wall cloud. Five smoothly joined ellipsoid fields plus six persistent seeded crown lobes carry the development. Three noise octaves sculpt the billows; the base has less erosion than the crown. The same material chart twists into helical strata beneath the supercell. Centres and lobe identities never reseed on development changes or reversals.

The camera is now low (roughly 1.6 world units), with a closed lateral/dolly/crane path in front of the volume. It approaches the supercell rather than viewing a small cloud from a high overlook. Towers occupy about 60–70% of landscape frame height; the anvil spans the frame width. Portrait retains the large subject rather than shrinking it to keep the entire horizontal storm inside the screen. The horizon stays stable. A shaded moon, two far weather shelves, ridges, tiny town lights, rain curtains and local wet-ground strike/reflection footprints anchor scale.

## Signature mathematics: four connected stepped-leader trees

`storm-model.mjs` independently mirrors the GLSL in `scene-storm-data.mjs`. A uint avalanche hash gives deterministic 24-bit random samples keyed by `(seed, network, sample)`. Four trees each have eighteen trunk edges and three possible four-edge branches: **120 maximum segments**. Every branch attaches at a trunk endpoint (steps 4, 8, 12), and each subsequent edge starts at the preceding endpoint. Activation probability is **0.78**, with unbiased branch handedness.

The trunk advances by `1/18` in material longitudinal coordinate per step. Lateral increments are differences of uniform samples, with variance `0.16²/6`; z increments are bounded by 0.12. The root jitter is subtracted so each root is exactly `(0,0,0)`. This is a bounded statistical leader model, not an electrostatic-breakdown solver.

The original two trees turn from cloud-to-cloud discharge into ground strikes as development reaches 2; trunk endpoints terminate at y=0 exactly. Two additional trees remain **cloud-base crawlers**, spanning more than twelve world units horizontally, including in Supercell. Their identity and connected ancestry remain independent of development, energy and clocks. Stronger cores (5.5 before event/branch weights) exceed 1.0 on the float path, feeding bloom without flashing the entire picture.

Projected/world endpoints and conservative 16-bit tile masks share the first 35 rows of the optional data atlas. Empty 16-edge groups are skipped before bit traversal; the shader does not scan all 120 edges at every empty sky pixel. Bounds include the full seven-width AA/glow support; below a 280-pixel short side the exact all-candidate path is used.

## Volume and light transport

`scene-storm-volume.mjs` defines a camera-independent **128×80×48 world-space optical lattice** across `[-24,24] × [0.4,16.8] × [0,13]`. Four scalar values per voxel are stored in a **1024×515 RGBA32F atlas**:

1. density;
2. moonlight transmission × local normal/key factor;
3. internal-light coefficient for the first charged region;
4. internal-light coefficient for the second region.

These are volume properties, **not a low-resolution colour image or a screen-space render**. No palette colours or camera projections enter the optical field. Each output pixel independently traces the world-space volume at full output resolution, with at most **28 samples**, Beer–Lambert opacity `alpha = 1−exp(−rho ds)`, front-to-back compositing and transmittance early-out below 0.012.

Moonlight optical depth uses bounded quadrature along the light direction. Internal lightning attenuation uses distance, inverse-square-like dilution and density along a midpoint light path, rather than an unshadowed Gaussian painted over the cloud. Internal coefficients also include local crawler illumination. Moonlit crowns are brighter; the bulk and softer underside remain dark. All colour is mixed from palette primary/secondary/accent and black/white. Accent is confined to a small expanding ionisation corona. Flash envelopes never bypass the shared limiter.

### Small optional engine extension

`precompute.filter: "linear"` now requests float32 texture filtering **only when `OES_texture_float_linear` exists**. The engine defines `PRECOMPUTED_LINEAR` for that visual shader. This lets storm interpolate two adjacent atlas slices with two hardware-filtered texture samples instead of eight manual fetches.

Defaults are unchanged: every existing precompute target remains nearest-filtered. `texelFetch` keeps topology/mask data exact even in a linearly filtered atlas. Without float32 linear support, storm manually interpolates the same eight lattice corners. Without float render targets it directly evaluates those same lattice nodes. The byte-picture fallback works, but cannot retain float HDR highlights and is not claimed to have the native path's performance or identical bloom.

`tests/browser/storm-precompute.test.mjs` covers hardware/manual interpolation, disabled-extension fallback, uncached byte rendering, paused refresh without advancing simulation, context restoration, texture accounting, and legacy Hilbert nearest-filter defaults. No other family opts in.

## Energy, rhythm and endlessness

Energy changes storm/camera rate, branch detail and rain detail, not exposure. The existing three gesture IDs/defaults remain:

- **Buried discharge**, 4 beats: alternating bounded internal discharge, also driven by kick.
- **Branch corona**, 8 beats: expanding local ionisation halo and cloud-base crawler accent.
- **Stepped return**, 16 beats: bright return-stroke window traversing connected leader ranks.

Kick focal punch remains **2%**. Two integrated engine clocks drive weather and camera, each with period 2π. Temporal harmonics are integers. Development changes spatial twist, never the temporal multiplier; fractional states remain periodic. All motion and geometry reverse without state resets. The camera stays outside the volume.

## Looks (unchanged)

| EN | DE | Development / composition |
| --- | --- | --- |
| Haze | Dunst | 0 · horizon-wide bank, distant shelves and heat lightning |
| Towers | Türme | 1 · growing crown lobes and long branching discharges |
| Supercell | Superzelle | 2 · close wall cloud/anvil, rain, ground strikes and crawlers |
| Heat Lantern | Wetterlaterne | 0.25 · low, thinner bank and slow motion |
| Anvil Choir | Ambosschor | 1.2 · tall dense crown, low camera, stronger branching |
| Silent Shelf | Stille Wolkenbank | 0.8 · squat dense shelf and restrained rain |
| Ground Current | Erdstrom | 2 · low viewpoint, clearer strike/reflection footprints |
| Midnight Rotation | Mitternachtsrotation | 1.8 · developed rotation, more rain and camera drift |

## Native performance

Apple M3 Pro / Chrome / ANGLE Metal, `PHOSPHOR_HEADLESS_RIG=1`, port 48502. Synchronous whole-frame throughput including post, excluding asynchronous flash approval. Thirty samples per standard state at energy 0.95. Baseline is commit `c67f71a`, measured again before this rework.

| State | 1080p baseline → final p50 | Final p95 | 4K baseline → final p50 | Final p95 |
| --- | --- | --- | --- | --- |
| Haze | 2.8 → **3.6 ms** | 4.1 ms | 9.6 → **10.7 ms** | 10.9 ms |
| Towers | 4.4 → **3.7 ms** | 3.9 ms | 12.9 → **12.0 ms** | 12.2 ms |
| Supercell | 4.4 → **3.6 ms** | 3.7 ms | 16.7 → **11.2 ms** | 11.4 ms |

All standard states meet **≤8 / ≤16 ms p50**. Haze pays for the much wider cloud and optical field, while the more expensive upper states are faster. All eight looks at 4K peak at **12.3 ms p50** (Anvil Choir). These shared-machine timings are not worst-case or dual-world venue-cadence guarantees. Rejected sharper variants reached 19–28 ms at 4K and were not shipped.

## Verification and honest visual review

- **22 CPU/time tests pass**: independent BigInt uint hash oracle, 6,000-seed branch/step statistics across four networks, graph connectivity, 401-point identity/reversal sweeps, exact ground termination, persistent horizontal crawlers, atlas address bijection, affine-exact trilinear interpolation, Beer attenuation, conservative AA bounds, stable presets/world lookup **by ID**, gesture slots and long-show clock continuity.
- **60 native late frames**: five developments × low/high energy × Glacier/Ember/Phosphor × 3600/43200 s. Minimum lit fraction above 12/255: **14.99%**. Zero GL/non-finite errors. Portrait states and a 4K still reviewed.
- **600 GPU/CPU segments** agree within **1.01×10⁻⁶ world units**. Five cached/direct float-path comparisons have maximum **2 byte levels**, mean ≤0.0084 levels/channel; no differences over two levels. Hardware/manual cache interpolation differs by at most one byte in the separate extension test.
- Native time-wrap/rate-step check, typecheck, build and German/English i18n checks pass. Root suite: **756 tests, 744 passed, nine opt-in skips, three expected integration-owned preview/curation failures**. No preview or curation sources/tests changed.
- Baseline and Liquid Chrome reference were filmed side by side. More than four subsequent 30-second improvement films were inspected: scale/camera; optical transport; crawlers/ground; bounded culling; crown lobes; performance rejection; finish/portrait. A discontinuous sharp-skin experiment was removed after the 4K still exposed contour patches. Final uses continuous lattice transport, not that experiment.
- Final films/strips, baseline, reference, round strips, ladder, profiles and native JSON are copied to the worker's `output/round2/` directory. Superseded full movies were removed.

**Revised honest rating: 7.5/10, not 9.** Scale, lightning and light transport are materially better than the independently rated 5/10 baseline, but this still does not match Liquid Chrome's material/readability finish. Crown microstructure remains soft at 4K; the anvil can look fibrous, the persistent bolt shapes are recognisable across repeated events, rain has regular filaments, and terrain/town lights are subtle. There is no claim of photoreal clouds or multiple scattering.
