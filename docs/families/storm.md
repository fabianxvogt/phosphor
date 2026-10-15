# Thunderhead / Gewitterzelle

World `thunderhead`, scene `storm`, family **107**. **Haze / Dunst → Towers / Türme → Supercell / Superzelle**. World ID, eight look names/IDs, seeds, schema keys, preset values and rhythm IDs/defaults remain unchanged. The three states share seed **10701** and identical non-development parameters. Tests find the world by ID, never registry position.

## Composition and this revision

Haze retains the long distant bank, with independently flashing charged cells, a third offset heat-lightning source, sparse palette-primary settlement lights and layered terrain. Towers now has narrower carriers and smaller crown lobes, leaving deeper gaps between turrets. Five smoothly joined ellipsoidal carriers and nine seeded lobes develop continuously; three small turrets become scud below Supercell.

Supercell's closed camera path now pulls back to z≈−12 rather than flying underneath at z≈−4. This is a deliberate composition choice: retain the whole rotating storm, its silver crowns, dark gaps and ground strikes, rather than replacing the climax with a cropped, featureless underside. The top state remains much wider than Towers. The wall carrier rotates geometrically; the weather chart twists with height. A flat base, central lowering and small scud remain.

Dark cloud bodies carry shadowed silver tops. Primary is mainly sparse settlements and ground colour. Internal discharges and bolt halos mix a small amount of palette accent into near-white secondary; accent is not a persistent full-frame wash. Energy never controls exposure.

## Cloud mathematics and full-resolution detail

The density combines an ellipsoidal carrier field with three spatial octaves: coarse value noise, rounded cellular billows and fine value noise. The cellular field evaluates **27 neighbouring cells**. Exact uint avalanche hashing supplies three 10-bit feature coordinates per cell, avoiding floating-point hash instability. A polynomial smooth minimum of squared distances (width 0.12) joins lobes; a finite core radius regularises the analytic gradient. This avoids both the rejected eight-corner lattice and hard Voronoi-gradient facets.

The camera-independent **128×80×48** optical lattice covers `[-24,24] × [0.4,16.8] × [-3,13]`, packed into the existing **1024×515 RGBA32F atlas**. Its channels now hold density, moonlight transport and the x/y components of the cloud normal. The visible front hemisphere reconstructs negative z. These are optical/material coefficients, not a reduced-resolution colour image.

Every output pixel integrates the 3D optical field with **16 fixed Beer–Lambert samples**. Moonlight and buried-channel emission use the same transmittance weights. An early-out below **0.0005** limits the omitted emissive tail; the previous 0.012 cutoff produced rare, visible cache/direct differences after brighter internal emission was added.

Continuous optical position/normal moments attach material detail to the visible volume. There is no binary first-density surface and no screen-derivative normal. A rejected binary-boundary trial caused thin foreground wisps to jump between layers; its replacement also restores close agreement between native and manually filtered cached rendering.

A second **28³ periodic 3D lobe field**, with its analytic gradient, occupies formerly unused atlas columns **124–963**, rows **3–32**. Each 28² slice has a one-node wrap gutter. It reuses the same texture allocation and is independent of camera/palette. Two filtered slice reads supply rounded micro-billows; one finer analytic noise octave adds small erosion. Both detail amplitudes fade smoothly with `pixel × opticalDistance × frequency`, preventing unresolved fine texture at a distance. Moon shading blends integrated transport with the detailed material normal.

Carrier ray bounds conservatively include interpolated optical support. Native verification scans all positive nodes plus their trilinear footprint across eight looks, intermediate developments, height extremes and two weather phases: **56 fields, zero overflow**. This revision expands intermediate x bounds and uses the full z=13 upper bound; the scan caught both required changes.

## Lightning and internal illumination

`storm-model.mjs` independently mirrors the seeded leader graph in `scene-storm-data.mjs`. Four connected trees each contain eighteen trunk edges and up to three four-edge branches: **120 maximum edges**. Branch activation probability is 0.78, handedness is unbiased, and roots/attachments never depend on development or time. Two trees turn from intra-cloud leaders into exact ground strikes; two remain horizontal crawlers.

The display retains bounded flickering/restriking envelopes and stepped returns. Cores are **12.0** before event weights, with a four-width **1.6** inner glow and seven-width **0.35** accent-tinted halo. Branch width and both halos taper toward branch tips. Nine-width support plus bounded micro-kinks remains inside conservative tile masks. Native float framebuffer peaks are **20.06–20.41**, confirming real HDR bloom input.

Buried lighting now follows a finite portion of each actual channel rather than a single dim point. For point p and closest channel point c, the effective multiple-scattering field is

`G(p) = 1 / (1 + 0.1 |p − c|²)²`.

It peaks on the channel, decays monotonically and remains local. Both channel fields are integrated **inside the cloud raymarch**, not painted onto the completed image. A separate phase-offset source flashes within a distant Haze cell. Discharges also illuminate rain, wet ground and the rippled strike reflection. This is a bounded porous-scattering approximation, not a full physical multiple-scattering solver. All flash output remains behind the engine's shared limiter.

## Precompute compatibility — no engine edit

The scene explicitly declares **`precompute.nearestFallback: true`** alongside `filter: "linear"`. This is required by the integration engine's new handling of float32 linear data.

- With `OES_texture_float_linear`: two filtered slices for each 3D field.
- Without float-linear support: exact node fetches plus manual trilinear interpolation for both fields; topology always uses `texelFetch`.
- Without float targets: evaluate the same lattice nodes procedurally. Byte targets cannot preserve HDR or native-path speed.

Native cached linear/manual images differ by at most **one byte level**, mean **0.01012** levels/channel. The independently compiled procedural fallback has sparse contour differences: max **8**, mean **0.01332**, fraction above two levels **0.00618%**. Its explicit gate is max 10, mean <0.02, outlier fraction <0.01%; the cached filtering gate remains max 2 / mean <0.02 / no >2-level outliers. The procedural tolerance was changed for this revision; bit identity is not claimed.

## Energy, rhythm and endlessness

Energy changes cloud/camera rate, branch and rain detail, not exposure. Existing four/eight/sixteen-beat gestures remain **Buried discharge**, **Branch corona**, **Stepped return**, with unchanged IDs/defaults. The focal kick punch stays at 2%.

Weather and camera use two integrated clocks with period 2π; every temporal multiplier is an integer harmonic. Spatial cellular/detail periods do not introduce a time wrap. Geometry rotation, phase-offset heat flashes and reversals remain continuous at intermediate developments and late rate changes. Native long-show seam/rate checks report zero errors.

## Looks (unchanged)

| EN                | DE                   | Development / composition                            |
| ----------------- | -------------------- | ---------------------------------------------------- |
| Haze              | Dunst                | 0 · distant cells, heat lightning, settlement lights |
| Towers            | Türme                | 1 · separated rising crowns and buried channels      |
| Supercell         | Superzelle           | 2 · rotating full storm, lowering, ground strikes    |
| Heat Lantern      | Wetterlaterne        | 0.25 · lower thin front, slow motion                 |
| Anvil Choir       | Ambosschor           | 1.2 · tall dense crown, low camera                   |
| Silent Shelf      | Stille Wolkenbank    | 0.8 · squat dense shelf, restrained rain             |
| Ground Current    | Erdstrom             | 2 · low viewpoint, clearer ground footprints         |
| Midnight Rotation | Mitternachtsrotation | 1.8 · rain, rotation, camera drift                   |

## Native cost

Apple M3 Pro / Chrome / ANGLE Metal; headless rig, port 48502. Sequential `profile-families.mjs --types --families storm --frames 90`, then 3840×2160. Reference source: previous final **e6325b40084f65416b9d771cdc61529c46ffb41c**; same harness/engine. Synchronous whole-frame throughput includes post, not asynchronous flash approval.

| State     | 1080p previous → final p50 | Final p95 | 4K previous → final p50 | Final p95 |
| --------- | -------------------------- | --------- | ----------------------- | --------- |
| Haze      | 3.1 → **2.9 ms**           | 4.2       | 9.7 → **8.0 ms**        | 8.5       |
| Towers    | 3.8 → **3.2 ms**           | 4.6       | 12.9 → **10.1 ms**      | 10.6      |
| Supercell | 3.5 → **3.4 ms**           | 4.8       | 11.5 → **10.1 ms**      | 10.5      |

Every state improves relative to the previous final and satisfies the +5% restriction. A separate all-eight-look probe peaks at **3.6 ms / 13.0 ms p50**, below 8/16 ms. Initial baseline was 3.3/4.3/3.8 ms and 10.1/13.7/11.8 ms.

Changing fleet contention is significant: a contended baseline recheck reached 9.0 ms at 1080p; a later sequential all-look candidate probe reached **25.7 ms at 4K**, failing the absolute limit. That loaded failure is retained, not presented as qualification. To avoid comparing opposite sides of a load spike, an additional probe alternates twelve-frame previous/candidate batches in the same native browser, eight batches / 96 measured frames per source, for every look at both resolutions. **All sixteen pairs stay within +5%**: the largest increase is Haze 1080p **4.6 → 4.7 ms (+2.2%)**; every 4K look is faster, with candidate p50 **8.2–10.6 ms**. The script, raw samples and standard reports are retained under `output/final-round/`. These are throughput qualifications, not a loaded-machine worst-case or dual-world venue cadence guarantee.

## Verification and honest review

- **28 CPU/time tests pass**: independent hash oracle and leader statistics/connectivity/reversal; exact uint cell features and spatial periods; analytic billow gradients versus central differences; padded detail addresses; monotone footprint filtering and channel scattering; Beer compositing; stable presets/world lookup.
- **60 native late frames** at low/high energy, five developments, Glacier/Ember/Phosphor, 3600/43200 s: zero GL/non-finite errors; minimum fraction above 12/255 is **12.02%**.
- **600 GPU/CPU edges**, maximum error <9.53×10⁻⁷ world units; five cached/procedural image probes with the explicit budgets above.
- **21,952 microstructure nodes**, zero non-finite values, exactly matching wrap gutters; **56 conservative bounds scans**, zero overflow.
- Native linear/manual fallback, absent float targets, paused refresh, context restoration and texture accounting pass. Typecheck, build and native DE/EN i18n pass. Root suite: **762 tests; 750 pass, nine opt-in skips, three expected catalog preview/curation failures**.
- Baseline plus **twelve filmed experiments and a final film** were reviewed. Rejected: screen-derivative normals, eight-corner cellular noise, overly hard surface lighting, binary boundary selection. Final/reference films, portrait/4K stills, a Glacier extra look, Ember reversal and eight-look energy ladder are in the worker's `output/final-round/`.

**Rating: 7.5/10, not 9.** The silver billows, darker turret gaps, full-storm framing and visibly glowing cloud interiors improve the filmed baseline. Liquid Chrome's newly filmed reference still has substantially cleaner material finish. Close storm detail remains stylized and sometimes rocky/flow-like rather than photographic cauliflower; the lightning trees repeat and the ground is restrained. This revision does not claim that every close-up now meets the reference standard.
