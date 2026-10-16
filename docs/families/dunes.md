# Dune Sea · Dünenmeer (#114)

One persistent night desert, `scene-dunes.mjs`, world **`dune-sea`**. Ripples / Sandrippeln → Dunes / Dünen → Storm / Sturm use seed **11401** and identical non-development parameters. All eight preset names, seeds, look IDs, schema keys and world definitions are unchanged. No engine or shared-registry changes. Round 3, authored by **openai-codex/gpt-6.1-sol**, adds the slot-3 **Crest veil / Kammschleier**, restores palette-separated material fields and strengthens local rhythm. State/look names, seeds and world definitions are unchanged.

## Signature and mathematics

The opening now follows a single winding brink from the near foreground towards the horizon. Its world-space centre is `c(z) = −2 + 4.8 sin(.065z) + 1.2 sin(.13z)`. For `d=x−c(z)`, the windward profile is `3.4 max(0,1−(d/9)²)²`; the lee is `max(0,3.4−tan(34°)d)`. Height and exact derivatives taper continuously with `1−smoothstep(0,1,development)`, merging into the persistent barchan field. Importantly, this ridge uses **world coordinates**, never the staggered dune chart; otherwise row boundaries create cliffs and normal moiré. The camera follows the brink before opening into the mature panorama.

For each seeded barchan, `v=x/11`, crest `c=−3+13v²`, crest height `H=h max(0,(1−v²)(1+.6v²))`, shoulder `L=14−8v²`, and downwind distance `d=z−c`. The shoulder is `H max(0,1−(d/L)²)²`; the lee is `max(0,H−repose·d)`. Narrowing shoulders produce separated downwind horns and an empty lee centre. Rotation/scale come from the fixed staggered 28×32 m material chart; crossed arms persist at seeded star-dune sites. Mature repose compensates for site scale and authored height to retain **34°**. Exact normals include shoulder variation, rotation, compact cell support and the leading-ridge maximum.

### Filtered sand, not striped dune faces

Micro-ripples are **filtered shading**, not displaced geometry: tiny grazing-angle displacement was the source of comb-like silhouettes. Their bent phase is

`p = 6(.55x+.84z) + 2.6 sin(.31x−.19z+1.4sin(.09z)) + 2.2 sin(.13x+.35z) + .8 sin(.8x+.57z) − phase`.

Amplitude varies spatially as `.028(.65+.35sin(.2x+.23z))`; the asymmetric second harmonic has weight `.22`. Analytic phase gradients are projected through `dFdx/dFdy` of the hit chart. Gaussian pixel integration attenuates the fundamental by `exp(−w²/2)` and the second harmonic by its **fourth power**. Derivatives are outside per-pixel branches. Ripples fade on steep facets and disappear at mature scale instead of laying regular lines across every dune face. Fine albedo noise is footprint filtered too.

Moonlit grain glints use seeded sub-cell positions, Gaussian pixel kernels and area compensation, with unresolved grains fading away. Resolved glints exceed 1.0 into bloom. Ballistic saltation remains `T=2v₀/g`, `x=UTa`, `y=v₀Ta(1−a)`, **g=9.81**, launch `.7…1.3 m/s`; persistent identities land once per cycle. Near samples reuse the local tangent plane. Two depth-correct strata over nearby brinks carry streaming veils. The fourth rhythm channel raises them by up to several metres, with event-count-selected folds and wind-drawn filaments; energy controls their height. This replaces the former three tiny plume samples rather than adding another pass. Seeded grain population also increases with energy; individual grain IDs never change.

## Storm, light and atmosphere

A continuous dark dust wall supports nested, asymmetric ellipsoidal rolls and smaller cauliflower turrets. **Exact quadratic ray intervals** define a sharp, pixel-antialiased upper silhouette. Physical-width shoulder blending is separate from pixel-width silhouette coverage. The base fades continuously into the rolls; exit intervals extend continuously rather than being replaced by each new sphere, avoiding hard circular or horizontal lighting seams.

Two bounded Beer–Lambert samples integrate behind this exact front, clipped by terrain and five analytic opaque ray-box monoliths. Curled multiscale density, perturbed normals, penetration falloff and height-dependent light make the top moonlit and the base nearly black. A broad, warped, noise-modulated internal scattering field spreads palette light through folds: **no sun/disc primitive and no saturated yellow spot**. This is an economical analytic volume, not a fluid simulation.

Monoliths retain the central **32 m** scale cue and stone-face variation. R3 removes the uniformly glowing outline, leaving restrained moonlit bevels and eroded, individually seeded incisions instead of repeating diamond stickers. The strongest inscription light uses primary; sand fields and dust primarily use secondary; the lifted veils carry rare accent. The camera's development-driven storm pitch is reduced by 25%, retaining more foreground without a cut. The gibbous textured moon, star field, mottled Milky Way and restrained terrain fill remain. Colour derives only from the palette and white/black mixes. Dense horizon haze fully extinguishes distant material from 100–170 m; near-tangent downward rays finish against the true ground-plane bracket instead of exposing holes or fake vertical facets.

## Looks and arc

| Look                               | Development | Composition                                                           |
| ---------------------------------- | ----------: | --------------------------------------------------------------------- |
| Ripples / Sandrippeln              |           0 | Winding foreground brink, filtered ripples, streaming sand and glints |
| Dunes / Dünen                      |           1 | Crane over sharp crescent dunes, empty lee centres and brink veils    |
| Storm / Sturm                      |           2 | Towering dark-based billowing wall behind glowing, rim-lit stones     |
| Silver Silt / Silbersand           |         .15 | Quiet wind and stronger organic ripple relief                         |
| Crescent Caravan / Sichelkarawane  |           1 | Elevated tall crescents and reverse drift                             |
| Star Sands / Sternensand           |        1.15 | Higher moon, crossed arms and stronger wind                           |
| Buried Temple / Versunkener Tempel |        1.85 | Low relief and viewpoint beneath the stones                           |
| Night Front / Nachtfront           |           2 | Dense dust and faster wind                                            |

Continuous development changes actual field/camera/front geometry; reversal uses the same sites and clocks. Portrait preserves the main crest and central stone; the off-axis moon can leave narrow framing.

## Energy, rhythm and long shows (r3)

Three named presets remain **Leeward hush / Leestille**, **Saltation trails / Sprungspuren**, and **Haboob drums / Haboobtrommeln**. All four tracks author independent restrained/driving/accented loops. Average density is **2.5 / 7.5 / 12.3 hits per bar**.

- Slot 0 **Crest saltation**: much stronger count-selected runs along the persistent crests; five-beat accented grain figures cross bar boundaries.
- Slot 1 **Slipface stream**: independent localized packets and brink light, not whole-frame gain.
- Slot 2 **Haboob roll**: sparse phrase gusts select a single illuminated fold inside the dust wall, also lifting ballistic grains.
- Slot 3 **Crest veil / Kammschleier**: the accent gust peels curled, filamented sand above the existing crests. `u_rhythm.w` controls lift/opacity, `.w` hit contributes a bounded attack, and `.w` event count chooses fold orientation. Restrained: eighth-note steps 14/31 over four bars; driving: sixteenth steps 1/8/17/27 over two bars; accented: steps 1/7/15/24/33/40/49/59 over four bars (one-based). Envelopes settle between hits. There is no development-triggered flash.

R3 uses pigmented secondary sand planes, primary mineral highlights and rare accent gusts instead of complementary-colour/white mixtures that desaturated the desert. Dust uses anisotropic transported detail, softer normal perturbation and lower crown opacity; the opaque base, depth-clipped Beer–Lambert integration and exact silhouette remain. It is still an analytic wall, not a fluid simulation.

Energy changes integrated wind speed, airborne grain population, veil height and streamer activity, not master brightness. A bounded kick FOV nudge stays below 2%. Three integrated 2π clocks own wind/grain/ripple phase, camera drift and dust folding. All uses are periodic sin/cos, integer harmonics or landings. No raw hourly wrap, palette sawtooth, exhausted simulation or development-dependent identity reset.

## Cost and measured budgets

Full-resolution rendering. **36** capped terrain steps, four local refinements, an eight-refinement tangent fallback and **five** long-range shadow samples. A separate **exact height-only profile** avoids transporting normals through every march/shadow call. Leading-ridge dominance skips tiled dunes only above their proven maximum. Dark-side shadow and fully extinguished distance skips, nearby-brink plume support, local saltation planes and negligible transmittance avoid unused work.

The optional **128×137 RGBA32F data pass** caches integer noise corners, fixed seeded dune transforms and one row of exact current storm-roll centres/radii. It never caches a colour image or sampled terrain. All data have analytic fallbacks. The data-pass layout and mathematical profile are unchanged in r3. Rising shadow rays now stop above the same proven height bound. Veil samples are support-bounded, with extra fold work skipped while the signature envelope is silent.

R3 native performance uses ANGLE Metal / Apple M3 Pro, `profile-families.mjs --types --families dunes`, energy .95, including post (24 samples/state), plus 64-frame interleaved ABBA reference-main pairs:

| State   | 1080p p50 / p95 ms | 4K p50 / p95 ms | Pair 1080p / 4K p50 delta |
| ------- | -----------------: | --------------: | ------------------------: |
| Ripples |          3.9 / 4.3 |     15.0 / 17.0 |             −6.7% / +5.8% |
| Dunes   |          3.6 / 3.8 |     14.1 / 15.2 |            −2.9% / −10.6% |
| Storm   |          4.4 / 4.5 |     16.8 / 18.0 |              0.0% / +3.8% |

**1080p passes; Storm misses the strict 16 ms 4K target.** The 1080p pair passes the +5% regression gate; the optional 4K pair fails it for Ripples by 0.8 percentage points. All probes have zero GL/GPU/non-finite errors. Raw JSON/logs are under `artifacts/verification/{perf1080-delivery,perf4k-delivery,pair-delivery,pair4k-delivery}`. Concurrent lanes inflate timings, and earlier probes are retained (baseline p95 up to 36.1 ms). These synchronous measurements are not venue-cadence certification.

## Verification and visual assessment

`tests/dunes.test.mjs` covers 34° repose, separated horns, **10,000** exact height-only/full-profile comparisons, **5,000** analytic normal comparisons including the leading ridge, world-chart row continuity, reversible identity, ripple bounds and periodicity, Gaussian Fourier response and harmonic filtering, ballistic acceleration/apex/landing, **2,000** noise-gradient and **2,000** ellipsoid-interval checks, continuous volume joins, Beer–Lambert invariance, bounds, data packing, all eight presets and stable world lookup **by ID**, never registry position. `tests/time.test.mjs` covers clocks.

R3 adds explicit four-track/density tests, energy-driven grain-population checks and rising shadow-bound checks. `scripts/verify-dunes.mjs` captures native, **limiter-enabled** frames at energy .1/.5/.9 across Phosphor, Ember and Glacier, with forward/reverse development and portrait at 43,200 s. It rejects GL/GPU/non-finite errors or lit fractions below 3%. Baseline plus three change/capture/read rounds are retained under `artifacts/look-review/dune-sea-r3-{before,round1,round2,round3}`; final reviewer evidence is `artifacts/look-review/dune-sea-r3/` (film, sheets and grids). The shared limiter remains untouched; deterministic review films are not photosafety certification.

**Self-assessment: L approximately 7, not independently accepted at 8.** Colour hierarchy and local rhythm are improved, but the storm is still recognizably analytic, the dune field has regular spacing, the stones remain rectilinear and the veil can read as a coloured crest patch in small stills rather than free airborne sand. The moon leaves portrait framing. These are genuine remaining weaknesses, not a passing-score claim. See the worker report for final test/performance results and commit. Catalog baking/curation remains integration work.
