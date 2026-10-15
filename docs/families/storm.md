# Thunderhead / Gewitterzelle

World `thunderhead`, scene `storm`, family **107**. **Haze / Dunst → Towers / Türme → Supercell / Superzelle**. World ID, all eight look names/IDs, seeds, schema keys, preset values and rhythm IDs/defaults are unchanged. World states share seed **10701** and identical non-development parameters. Tests find the world by ID, never registry position.

## Composition

Haze is a distant, wide front of separate cells, not a uniformly lit horizontal band. The camera starts farther away; different crowns, sparse settlement clusters, layered dark hills and buried heat-lightning pools give scale. Towers approaches six principal cauliflower crowns and three smaller turrets. Five smoothly joined ellipsoidal carriers and nine seeded lobes develop continuously; the three small turrets become scud beneath Supercell.

Supercell brings the camera close below the rotating base. The wall-cloud carrier rotates as geometry, not only as a noise texture. Depth-dependent material twist and helical shelves animate the surrounding sky. A flattened floor, central lowering and small scud lobes replace the rounded cotton-ball bottom. The camera's upward pitch leaves the strike footprints visible on the landscape. The optical atlas extends to z=-3 so the front of the lowering is not cut off at z=0.

Most of the cloud is near-black. A shadowed silver key is restricted to upward-facing surfaces; a small front fill retains dim shape. The palette primary is reserved mainly for sparse town lights and minor ground colour. Bolts and their internal light use a near-white mixture of palette secondary; accent remains a small ionisation event. No global exposure follows energy.

## Lightning mathematics

`storm-model.mjs` independently mirrors `scene-storm-data.mjs`. A uint avalanche hash supplies deterministic 24-bit random samples keyed by `(seed, network, sample)`. Four connected trees each contain eighteen trunk edges and three possible four-edge branches: **120 maximum graph edges**. Activation probability is **0.78**; handedness is unbiased. Each branch attaches at trunk steps 4, 8 or 12. Graph identity and connectivity never depend on development or clocks.

Trunk longitudinal steps are `1/18`; lateral increments have variance `0.16²/6` and z increments are bounded by 0.12. Roots are exactly `(0,0,0)`. Two trees slope through Towers and terminate exactly on the ground at development 2. Two stay horizontal cloud-base crawlers. Increased lateral branch jitter, tapered branch cores and two bounded projected micro-kinks per graph edge add a finer broken-channel read without changing endpoint connectivity.

Hot cores use **12.0** before event/branch weights, plus a four-width soft halo. Native float-framebuffer measurements reach **18.47–18.52**, confirming actual HDR input to bloom, not just a shader literal. The event envelope combines a narrow `wave^40` discharge with a bounded positive flicker floor, scheduled buried discharges and return strokes. It persists for multiple frames and decays; independent crawler selection avoids continuously exposing both long channels. This is a bounded statistical leader/display model, not an electric-field solver.

Topology and conservative 16-bit tile masks occupy the first 35 atlas rows. Mask padding includes nine halo widths plus micro-kink displacement. Cheap box and squared-distance rejects run before detailed channel evaluation. Empty 16-edge groups are skipped; below a 280-pixel short side the exact all-candidate path is used.

## Volume and light

The camera-independent **128×80×48** lattice covers `[-24,24] × [0.4,16.8] × [-3,13]`, packed in the existing **1024×515 RGBA32F atlas**. Its channels contain density, moonlight transport and two internal scattering coefficients — never a colour image. Every output pixel integrates the 3D data at full output resolution with **24 fixed Beer–Lambert samples**, front-to-back compositing and transmittance early-out below 0.012.

Moonlight uses local extinction plus one forward optical-depth quadrature sample, a normal/key lobe and a top-surface gate. Internal light is a local, monotone distance/extinction field around charged channel regions, with weaker secondary crawler sources. Its effective porous scattering deliberately avoids the previous excessive attenuation that concealed buried discharges. It is not a full multiple-scattering solution. Large soft light pools show through the surrounding volume while neighbouring cloud bodies stay dark. The same discharges light rain, wet ground and a rippled reflection path.

Carrier ray bounds avoid marching large empty sky regions. The native verification scans all positive atlas nodes **including their trilinear support**, across eight looks, six intermediate developments, height extremes and two weather times: **56 fields, zero support outside the bounds**. This gate caught and fixed two intermediate-Supercell bounds errors before delivery.

The previous commit's optional `precompute.filter: "linear"` engine contract is unchanged. `OES_texture_float_linear` enables two filtered slice reads; otherwise eight exact lattice-node fetches implement trilinear interpolation. Without float targets, the same nodes are evaluated directly. Topology always uses `texelFetch`. No new engine extension was added this round. The byte fallback renders safely but cannot preserve HDR or native-path performance.

## Energy, rhythm and endlessness

Energy changes storm/camera rate, branch detail and rain detail, not exposure. Rain has irregular advected filaments rather than uniform sine stripes. Existing gestures remain:

- **Buried discharge**, four beats: local alternating internal illumination.
- **Branch corona**, eight beats: local ionisation glow and selected crawler accent.
- **Stepped return**, sixteen beats: bright return window along connected leader ranks.

The kick focal punch remains **2%**. Weather and camera use two integrated clocks with period 2π. All temporal multipliers are integer harmonics. Spatial twist, geometry rotation and development reversal never multiply the wrapped clock by a fractional development. The low lateral/dolly/crane path is closed, never cuts and stays outside the optical volume. All visual flash output remains behind the shared limiter.

## Looks (unchanged)

| EN | DE | Development / composition |
| --- | --- | --- |
| Haze | Dunst | 0 · distant cells, dark terrain, heat lightning |
| Towers | Türme | 1 · rising crowns and branching intra-cloud channels |
| Supercell | Superzelle | 2 · close rotating base, lowering, ground strikes |
| Heat Lantern | Wetterlaterne | 0.25 · lower, thinner front and slow motion |
| Anvil Choir | Ambosschor | 1.2 · tall dense crown, low camera, more branching |
| Silent Shelf | Stille Wolkenbank | 0.8 · squat dense shelf, restrained rain |
| Ground Current | Erdstrom | 2 · low viewpoint, clearer ground footprints |
| Midnight Rotation | Mitternachtsrotation | 1.8 · developed rotation, rain and camera drift |

## Native cost

Apple M3 Pro / Chrome / ANGLE Metal, `PHOSPHOR_HEADLESS_RIG=1`, port 48502. Standard `profile-families.mjs --types --families storm --frames 60`, plus 3840×2160. Baseline is the previous final commit **6f00e49**, routed through `--reference`. The following quiet paired qualification preceded the final uniform-only amendment that also couples corona-only crawlers to internal light. Synchronous whole-frame throughput includes post, excludes asynchronous flash approval.

| State | 1080p baseline → final p50 | Final p95 | 4K baseline → final p50 | Final p95 |
| --- | --- | --- | --- | --- |
| Haze | 3.7 → **2.9 ms** | 3.3 ms | 11.2 → **9.7 ms** | 10.4 ms |
| Towers | 4.1 → **3.7 ms** | 4.0 ms | 12.6 → **12.8 ms** | 13.3 ms |
| Supercell | 4.0 → **3.6 ms** | 3.9 ms | 11.7 → **11.2 ms** | 11.7 ms |

Largest quiet paired increase: **1.6%**; that qualification satisfied **≤8 / ≤16 ms**. The separate all-eight-look qualification peaked at **3.9 ms / 14.5 ms p50**. Final-source loaded rechecks measured **3.6 / 5.4 / 5.4 ms** at 1080p versus the immediately preceding old-source **4.5 / 5.9 / 5.8 ms**. A loaded final 4K run measured **12.7 / 17.2 / 15.7 ms**; the old-source 4K recheck measured **18.3 / 20.0 / 18.5 ms**. Another contended final run reached 18.2 ms at 4K. Relative cost remains below the previous commit, but **the absolute 16 ms limit was not maintained in every loaded-machine probe**. All reports are retained. Quiet qualification is not a worst-case or venue-cadence guarantee; this limitation remains explicit.

## Verification and visual review

- **23 CPU/time tests pass**: independent integer hash oracle; 6,000-seed branch statistics; graph connectivity; 401-point identity/reversal sweeps; exact ground endpoints; persistent crawlers; atlas bijection/interpolation; Beer attenuation; conservative halo bounds; multi-frame flicker/decay, periodicity and HDR core configuration; stable metadata/world lookup by ID.
- **60 native late frames**, five developments, low/high energy, Glacier/Ember/Phosphor, 3600/43200 s: zero GL/non-finite errors, minimum lit fraction above 12/255 **6.33%**.
- **600 GPU/CPU graph edges** agree within **9.53×10⁻⁷** world units. Five cached/direct float comparisons differ by at most **one byte level**, mean ≤0.0052 levels/channel. Native/manual filtered interpolation also differs by at most one level.
- Native texture fallback, paused refresh, context restoration and accounting pass. Time-wrap/rate-step checks report zero seams/errors. Typecheck, build and native DE/EN i18n pass.
- Root suite: **757 tests, 745 pass, nine opt-in skips, three expected integration-owned preview/curation failures**. No catalog or curation files/tests were edited.
- Baseline and **Abyssal Bloom** reference films were reviewed. More than three improvement rounds were filmed; intermediate strips remain. A cellular-detail experiment was rejected for its visible lattice and cost. Adaptive stepping was rejected after full-size stills exposed flow-like contours. Final uses fixed steps, bounded carrier rays and exact candidate rejects. Portrait, 4K, extra Glacier look, Ember reversal and the eight-look energy ladder were checked.

**Honest rating: 7.5/10, not 9.** Dark/silver clouds, localized flashes, thick HDR channels and the close storm base address the review directly. It still does not match the reference's finish: crown microstructure remains soft, overhead clouds can look smeared, the repeated four tree shapes are recognisable, and Haze/terrain are restrained. Crisp photographic cauliflower detail is not claimed. Evidence is in this worker's `output/round3/` directory.
