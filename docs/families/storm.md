# Thunderhead / Gewitterzelle

World `thunderhead`, renderer `storm`, family **107**. One night storm seen from a high overlook: **Haze / Dunst → Towers / Türme → Supercell / Superzelle**. Eight looks; the three world presets share seed **10701** and identical non-development parameters. No engine changes, simulation, assets or reduced-resolution colour pass.

## Signature: connected stepped leaders

`storm-model.mjs` is the CPU reference for `scene-storm-data.mjs`. A uint avalanche hash supplies exact 24-bit random samples keyed only by `(seed, network, sample)`. Two persistent leader trees each have eighteen trunk segments and three possible four-segment branches: **60 maximum edges**. Every branch attaches to an existing trunk endpoint (steps 4, 8 and 12); every following branch edge begins at its predecessor's endpoint. Dormant branches never leave disconnected illuminated pieces.

The field-biased trunk advances by `1/18` in longitudinal material coordinate per step. Lateral coordinates have bounded seed-derived jitter, with the root's jitter subtracted so the root is exactly zero. Differences of independent uniform samples give lateral step variance `0.16² / 6`; z jitter is bounded at 0.12. Branches have random left/right handedness, a forward bias and additional bounded step jitter. Each branch exists with probability **0.78**, giving 4.68 expected branches and 54.72 expected active edges across the two trees. This is an authored stepped-leader model, not a dielectric-breakdown/electrostatic solver.

Development deforms the *same* material vertices. During Towers their long axis runs between charged cells; during Supercell it turns down toward the basin. Trunk endpoints terminate at y=0 exactly in the top state. The second root is higher and its ground target wider, avoiding mirror-image bolts. Seed, graph ancestry, activation and step indices never depend on development, energy or clocks. Reversal retraces the geometry without rebuilding anything.

An optional **64×35 RGBA32F** geometry-data pass stores projected/world endpoints and four exact 16-bit candidate masks per screen tile. Bounds include the full seven-width AA/glow support, including portrait framing; below 240 px short side the shader retains every candidate. The fallback computes the identical graph directly. The cache contains no colour image and refreshes on each actual visual draw.

## Clouds and light

Five smoothly joined analytic ellipsoid fields carry the cloud bank, unequal growing towers, anvil and lowering wall cloud. The near-surface quadratic field is `(1−dot(q,q)) min(rx,ry)/2`; smooth maximum blends fields and their normals. The same centres grow continuously rather than dissolving between pictures. Two analytic cubic-noise octaves perturb density and normals. A rotating material chart and depth-dependent twist, plus twofold helical density strata, give the final mesocyclone its rotation and layered underside.

A conservative slab clips a **14-sample maximum** front-to-back march. Positive analytic density becomes `alpha = 1−exp(−rho ds 1.65)`; transmittance multiplies after every sample, with an early stop below 0.012. Cloud transforms/inverse radii and the uniform rotation are hoisted outside the march. No shadow march, nested volumetric loop, temporal dither, texture simulation or resolution cap is used.

A soft palette key, noise-perturbed carrier normals and grazing rim reveal the cloud between discharges. Beer compositing supplies view occlusion; interior attenuation darkens cavities. Lightning roots are *inside the volume*: exponentially localized illumination is integrated at the cloud samples. Bolts have HDR cores and soft, pixel-scaled sheaths. Their cloud-to-cloud phase is deliberately more buried; the ground phase emerges below the wall cloud. Small strike footprints light the basin, not the whole screen. The engine's shared flash limiter remains authoritative and untouched.

A shaded palette-tinted moon, a far analytic cloud shelf, layered dark ridges and finite rain curtains establish depth and scale. Rain is a bounded filament/optical-depth approximation, not individual simulated drops. Colour comes only from primary, secondary, accent and black/white mixes. Accent is confined to a small ionisation corona.

## Looks

| EN | DE | Development / composition |
| --- | --- | --- |
| Haze | Dunst | 0 · distant low bank, moon, occasional buried heat lightning |
| Towers | Türme | 1 · unequal rising cells, internal illumination and branching horizontal discharges |
| Supercell | Superzelle | 2 · broad anvil, rotating strata, lowering wall cloud, rain shafts and ground leaders |
| Heat Lantern | Wetterlaterne | 0.25 · low cloud bank, high overlook, slow thin weather |
| Anvil Choir | Ambosschor | 1.2 · tall dense cells, low overlook, more branch detail |
| Silent Shelf | Stille Wolkenbank | 0.8 · squat dense shelf, restrained rain and camera |
| Ground Current | Erdstrom | 2 · lower overlook, strong branching, clearer strike footprints |
| Midnight Rotation | Mitternachtsrotation | 1.8 · high drifting overlook, dense rain and developed rotation |

## Energy, rhythm, camera and time

Energy changes motion ×0.75→1.35, camera rate ×0.8→1.3, branch-detail population and rain-filament detail, **not exposure**. The three scheduled gestures act on the signature:

- **Buried discharge / Verborgene Entladung**, 4 beats: alternates the charged root receiving a bounded local kick/gesture discharge.
- **Branch corona / Verzweigungskorona**, 8 beats: a small ionisation glow expands around the first persistent root.
- **Stepped return / Gestufter Rückstrom**, 16 beats: a narrow return-stroke highlight walks the existing trunk/branch ranks; its buried precursor is visible in Haze.

The kick also supplies a bounded local root glow and **2%** focal punch. There is no full-screen white or independent flash approval.

A closed lateral/dolly/crane path stays in front of the cloud volume. The stable-horizon camera never cuts or enters geometry. Short-side framing widens in portrait so the anvil remains inside the image. Two engine clocks integrate storm and camera motion; both have period 2π. All temporal harmonics are integers. In particular, development affects the chart's spatial twist, **never its time multiplier**, so fractional states do not jump when the phase wraps. The authored and late branches use matching phases; rate changes cannot move the phase by elapsed-time × rate delta.

## Measured cost

Headless native Chrome / ANGLE Metal, Apple M3 Pro. Thirty measured frames per standard state at energy 0.95, synchronous whole-frame throughput including post. Commands use `PHOSPHOR_HEADLESS_RIG=1`, assigned port 48502, and `scripts/profile-families.mjs --types --families storm --frames 30` (plus `--width 3840 --height 2160`).

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Haze | 2.9 / 3.2 ms | 8.7 / 9.0 ms |
| Towers | 3.9 / 4.1 ms | 12.3 / 12.5 ms |
| Supercell | 4.3 / 4.9 ms | 13.9 / 14.1 ms |

All three standard states meet the 8 / 16 ms median budgets. A separate twelve-frame **all-eight-look 4K** profile peaks at **13.5 ms p50 / 13.7 ms p95**. Rejected earlier shaders reached 21.6 ms at 4K; hoisted transforms, O(1) leader coordinates and the final fourteen-sample cap replace those versions. Shared-machine/thermal contention can change these numbers; this is not a dual-world display-cadence qualification or a hard worst-frame guarantee.

## Verification and visual review

- `node --test tests/storm.test.mjs tests/time.test.mjs`: **19 passed**. Independent BigInt uint oracle; 6,000-seed branching/handedness/step-variance statistics; active-graph connectivity; 401-point identity/reversal checks; exact ground termination; conservative AA cache bounds; finite Beer compositing; world/preset/rhythm validation; fractional-state phase periodicity and late-rate continuity.
- `scripts/verify-storm.mjs --port 48502`: **60 native late-time frames** across five developments, energies 0.1/0.9, Glacier/Ember/Phosphor, 3600/43200 s. Minimum lit fraction above 12/255 is 6.18%; zero GL/non-finite errors. Portrait states and a 4K still were opened and reviewed.
- The same script compares **300 GPU segment endpoints/weights** with the CPU model: maximum coordinate error **6.04×10⁻⁷** world units. Five native cached/uncached differentials: three pixel-identical; the others differ in one channel by one 8-bit level.
- Native `check-time-wrap --rig --families storm`: no seams/errors at 3600, 4096 or 43200 s; energy/fader rate-step gates pass.
- Typecheck, build and native German/English `test:i18n` pass. Final root suite: **753 tests, 741 passed, nine opt-in skips, three expected catalog preview/editorial-curation failures**. Preview baking and curation are intentionally left to integration; no catalog tests or generated catalogs were changed.
- First working film plus at least three improvement films were opened: (1) enlarged the tiny dark storm and lit billows, (2) joined the anvil/wall cloud and established moon/terrain/rain, (3) refined rotating strata and asymmetrical leaders while reducing march cost. Finish passes corrected portrait crop, phase periodicity and transform-hoisting cost. Superseded film rounds were removed; baseline and final remain.
- Final evidence: `artifacts/films/storm-final/thunderhead.{mp4,png}`, Glacier `storm-anvil-choir-glacier.{mp4,png}`, Ember reverse film under `reverse/`, all-look energy ladder, full-size stills and `verification/gpu-checks.json`. State/all-look profiles: `artifacts/performance/storm-final-*`. Worker delivery also contains copies under `output/evidence/`.

**Final authored visual rating: 9/10.** This is deliberately a stylized stage storm, not photoreal meteorology. Remaining weaknesses: rain can read as long filaments; the brightest root glows temporarily soften fine cloud texture; the distant first state is intentionally restrained; the environment lighting is an analytic approximation, not multiple scattering or full cloud self-shadowing. The branch graph is a bounded statistical model, not a physical charge-field solution.
